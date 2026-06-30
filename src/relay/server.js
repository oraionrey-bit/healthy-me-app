#!/usr/bin/env node
/**
 * Oraion Chat Tunnel — Local Relay Server
 * Receives messages/photos from Tina's Healthy Me PWA via Cloudflare Tunnel,
 * stores in Supabase, and notifies Oraion via Telegram.
 *
 * Listens on localhost:7700 (NOT publicly accessible — Cloudflare Tunnel only)
 */

const http = require('http');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const Busboy = require('busboy');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const {
  buildTelegramNotificationPayload,
  configuredTelegramTarget,
  resolveMessageUserId,
  shouldNotifyOraion,
} = require('./routing');
const { loadRelayConfig, chooseAiProvider } = require('./config');
const { ERROR_STATUS } = require('./status');

// ── Config ──────────────────────────────────────────────────────────────────

const CONFIG = loadRelayConfig();
const PORT = CONFIG.port;
const CHAT_TOKEN = CONFIG.chatToken;
const SUPABASE_URL = CONFIG.supabaseUrl;
const TELEGRAM_BOT_TOKEN = CONFIG.telegramBotToken;
const CLAWROUTER_API_KEY = CONFIG.clawRouterApiKey;
const GEMINI_API_KEY = CONFIG.geminiApiKey;
const OPENROUTER_API_KEY = CONFIG.openRouterApiKey;
const OPENROUTER_MODEL = CONFIG.openRouterModel;
const TINA_USER_ID = 'e454325f-b8e6-4251-9a49-9d706eef99c3';

// ── AI Analysis System Prompts ──────────────────────────────────────────────

const ANALYSIS_PROMPTS = {
  skin_analysis: 'You are a skincare expert. Analyze the products/skin shown in the photos. Consider the user\'s context: Korean skin (Fitzpatrick III-IV), PCOS, history of sensitivity to niacinamide and snail mucin. Give specific, actionable advice. Keep response concise.',
  supplement_check: 'You are a nutrition expert specializing in PCOS. Analyze the supplement shown. Check for interactions, quality, and relevance to PCOS management. Keep response concise.',
  lab_analysis: 'You are a medical analyst. Analyze the lab results shown. Flag any values outside normal range, especially relevant to PCOS (testosterone, SHBG, HbA1c, insulin). Keep response concise.',
  menu_analysis: 'You are a nutrition expert for PCOS. Analyze this restaurant menu and suggest the best options for someone targeting 1400-1600 cal/day, 80-100g protein, protein-first eating. Keep response concise.',
  fridge_analysis: 'You are a nutrition expert for PCOS. Look at what\'s in the fridge/pantry and suggest meal ideas targeting high protein, moderate calories. Keep response concise.',
  food_analysis: 'You are a nutrition expert for PCOS. Analyze the food shown in the photo. Estimate calories, protein, and macros. Suggest improvements for someone targeting 1400-1600 cal/day, 80-100g protein. Keep response concise.',
  nutrition_label: 'You are a nutrition label reader. Extract the following from the nutrition label photo and return ONLY valid JSON (no markdown, no explanation):\n{"name": "product name", "brand": "brand name", "serving_size": "e.g. 1 cup (55g)", "serving_unit": "e.g. cup, bar, oz", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0}\nUse integers for numbers. If a field is not visible, use null. Read the label carefully.',
  skincare_product: 'You are a skincare product analyst. Analyze this skincare product photo. Extract:\n- Product name\n- Brand\n- Key active ingredients (list the main ones)\n- Product type (cleanser, toner, serum, moisturizer, sunscreen, treatment, lip, oil, other)\n- Flag any of these known triggers if found in ingredients: niacinamide, snail mucin/snail secretion filtrate, vitamin E/tocopherol (when main ingredient), isostearic acid\n\nReturn ONLY valid JSON (no markdown, no explanation):\n{"name": "...", "brand": "...", "ingredients": ["..."], "product_type": "...", "triggers_found": ["..."], "notes": "brief ingredient analysis"}',
  supplement_product: 'You are a supplement label analyst specializing in PCOS. Analyze this supplement product photo. Extract:\n- Product name\n- Brand\n- Dosage per serving (e.g. "2000 IU", "500mg")\n- Key ingredients with amounts\n- Form (capsule, tablet, gummy, powder, liquid)\n- Any PCOS-relevant notes (e.g. contains inositol, vitamin D, etc.)\n\nReturn ONLY valid JSON (no markdown, no explanation):\n{"name": "...", "brand": "...", "dosage": "...", "ingredients": [{"name": "...", "amount": "..."}], "form": "...", "pcos_notes": "brief relevance to PCOS"}',
};

const AI_TIMEOUT_MS = 90000;

const MAX_TEXT_LENGTH = 5000;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const VALID_MESSAGE_TYPES = ['chat', 'food_analysis', 'skin_analysis', 'supplement_check', 'lab_analysis', 'menu_analysis', 'fridge_analysis', 'nutrition_label', 'skincare_product', 'supplement_product'];

// Rate limiting
const rateLimits = new Map(); // key -> { count, resetTime }
const RATE_LIMIT_PER_USER = 30;
const RATE_LIMIT_GLOBAL = 100;
const RATE_WINDOW_MS = 60 * 1000;
const FOODIE_RATE_LIMIT_PER_CLIENT = 8;
const FOODIE_JOB_DIR = process.env.FOODIE_JOB_DIR || path.join(os.homedir(), '.hermes', 'foodie-me');
const FOODIE_JOB_STORE = process.env.FOODIE_JOB_STORE || path.join(FOODIE_JOB_DIR, 'quest-jobs.json');
const DEFAULT_FOODIE_HERMES_BIN = path.join(os.homedir(), '.hermes', 'hermes-agent', 'venv', 'bin', 'hermes');
const FOODIE_HERMES_BIN = process.env.FOODIE_HERMES_BIN || DEFAULT_FOODIE_HERMES_BIN;
const FOODIE_HERMES_ARGS = (process.env.FOODIE_HERMES_ARGS || 'chat -q {prompt} -t web').split(' ');
const FOODIE_MAX_ACTIVE_JOBS = Math.max(1, Number.parseInt(process.env.FOODIE_MAX_ACTIVE_JOBS || '3', 10) || 3);
const FOODIE_WORKER_TIMEOUT_MS = Math.max(1000, Number.parseInt(process.env.FOODIE_WORKER_TIMEOUT_MS || String(10 * 60 * 1000), 10) || (10 * 60 * 1000));
const FOODIE_WORKER_STDOUT_MAX_BYTES = Math.max(1024, Number.parseInt(process.env.FOODIE_WORKER_STDOUT_MAX_BYTES || String(512 * 1024), 10) || (512 * 1024));
const FOODIE_WORKER_STDERR_MAX_BYTES = Math.max(1024, Number.parseInt(process.env.FOODIE_WORKER_STDERR_MAX_BYTES || String(64 * 1024), 10) || (64 * 1024));
let globalRequests = { count: 0, resetTime: Date.now() + RATE_WINDOW_MS };

// Supabase client — service role key bypasses RLS (server-side only, never exposed to client)
const supabaseKey = CONFIG.supabaseKey;
const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  // Strip control characters except newline and tab
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, MAX_TEXT_LENGTH);
}

function checkRateLimit(userId) {
  const now = Date.now();

  // Global rate limit
  if (now > globalRequests.resetTime) {
    globalRequests = { count: 0, resetTime: now + RATE_WINDOW_MS };
  }
  globalRequests.count++;
  if (globalRequests.count > RATE_LIMIT_GLOBAL) {
    return { limited: true, retryAfter: Math.ceil((globalRequests.resetTime - now) / 1000) };
  }

  // Per-user rate limit
  const key = userId || 'anonymous';
  let entry = rateLimits.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_WINDOW_MS };
    rateLimits.set(key, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_PER_USER) {
    return { limited: true, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  return { limited: false };
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}

function isPlainRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJsonBody(req, maxBytes = 32 * 1024) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) {
      const err = new Error('Request body too large');
      err.statusCode = 413;
      throw err;
    }
  }

  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const err = new Error('Invalid JSON');
    err.statusCode = 400;
    throw err;
  }
}

function safeClientIp(req) {
  return String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'anonymous');
}

function checkFoodieRateLimit(req) {
  const now = Date.now();
  const key = `foodie:${safeClientIp(req)}`;
  let entry = rateLimits.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_WINDOW_MS };
    rateLimits.set(key, entry);
  }
  entry.count++;
  if (entry.count > FOODIE_RATE_LIMIT_PER_CLIENT) {
    return { limited: true, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }
  return { limited: false };
}

function sanitizeFoodieText(value, maxLength) {
  return sanitizeText(value || '').slice(0, maxLength);
}

function escapeTelegramHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeIsoNow() {
  return new Date().toISOString();
}

function publicFoodieJob(job) {
  return {
    id: job.id,
    status: job.status,
    status_message: job.status_message,
    updated_at: job.updated_at,
    result: job.status === 'ready' ? job.result || null : null,
    error: job.status === 'error' ? job.error || job.status_message : undefined,
  };
}

function ensureFoodieStoreDir() {
  fs.mkdirSync(FOODIE_JOB_DIR, { recursive: true, mode: 0o700 });
}

function readFoodieJobs() {
  ensureFoodieStoreDir();
  try {
    const raw = fs.readFileSync(FOODIE_JOB_STORE, 'utf8');
    const parsed = JSON.parse(raw);
    return isPlainRecord(parsed) ? parsed : {};
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    console.error('[relay] Failed to read Foodie job store:', err.message);
    return {};
  }
}

function writeFoodieJobs(jobs) {
  ensureFoodieStoreDir();
  const tmpPath = `${FOODIE_JOB_STORE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(jobs, null, 2), { mode: 0o600 });
  fs.renameSync(tmpPath, FOODIE_JOB_STORE);
}

function countActiveFoodieJobs(jobs = readFoodieJobs()) {
  return Object.values(jobs).filter((job) => job && ['queued', 'researching'].includes(job.status)).length;
}

function updateFoodieJob(jobId, updater) {
  const jobs = readFoodieJobs();
  const existing = jobs[jobId];
  if (!existing) return null;
  const updated = updater(existing);
  jobs[jobId] = updated;
  writeFoodieJobs(jobs);
  return updated;
}

function validateFoodieSources(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((source) => typeof source === 'string')
    .map((source) => sanitizeFoodieText(source, 120))
    .filter(Boolean)
    .slice(0, 12);
}

function validateFoodieQuestInput(parsed) {
  const topic = sanitizeFoodieText(parsed.topic, 140);
  const city = sanitizeFoodieText(parsed.city, 100);
  const notes = sanitizeFoodieText(parsed.notes, 1000);
  const sources = validateFoodieSources(parsed.sources);
  const clientRequestId = sanitizeFoodieText(parsed.client_request_id, 120);

  if (!topic || !city) {
    return { error: 'topic and city are required' };
  }

  return { topic, city, notes, sources, clientRequestId };
}

function validateFoodieResult(value) {
  if (!isPlainRecord(value)) throw new Error('Worker output must be a JSON object');
  const suggestions = Array.isArray(value.suggestions) ? value.suggestions : [];
  return {
    summary: sanitizeFoodieText(value.summary, 2000),
    suggestions: suggestions
      .filter(isPlainRecord)
      .map((suggestion) => ({
        name: sanitizeFoodieText(suggestion.name, 180),
        neighborhood: sanitizeFoodieText(suggestion.neighborhood, 160),
        why: sanitizeFoodieText(suggestion.why, 1000),
        what_to_order: sanitizeFoodieText(suggestion.what_to_order, 800),
        confidence: ['high', 'medium', 'low'].includes(suggestion.confidence) ? suggestion.confidence : 'medium',
        sources: (Array.isArray(suggestion.sources) ? suggestion.sources : [])
          .filter(isPlainRecord)
          .map((source) => ({
            label: sanitizeFoodieText(source.label, 120),
            url: sanitizeFoodieText(source.url, 500),
          }))
          .filter((source) => source.label && /^https?:\/\//i.test(source.url))
          .slice(0, 8),
      }))
      .filter((suggestion) => suggestion.name && suggestion.why)
      .slice(0, 10),
  };
}

function extractJsonFromWorkerStdout(stdout) {
  const trimmed = String(stdout || '').trim();
  if (!trimmed) throw new Error('Worker produced no stdout JSON');
  try {
    return JSON.parse(trimmed);
  } catch (directErr) {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw directErr;
  }
}

function buildFoodieHermesPrompt(job) {
  return `You are Oraion's Foodie Me restaurant research worker. Research this restaurant quest using web sources only.\n\nQuest ID: ${job.id}\nTopic: ${job.topic}\nCity: ${job.city}\nNotes: ${job.notes || '(none)'}\nPreferred source checklist: ${(job.sources || []).join(', ') || 'Reddit, Eater/Infatuation, Google/Maps reviews, Yelp, local food sources'}\n\nResearch 5-10 places for the topic/city using source-backed web research. Do not fabricate sources. Only include URLs you actually found.\n\nReturn ONLY valid JSON, with no markdown or commentary, in this exact shape:\n{"summary":"brief overall summary","suggestions":[{"name":"restaurant name","neighborhood":"area or neighborhood","why":"source-backed reason this fits","what_to_order":"specific dishes/items if known","confidence":"high|medium|low","sources":[{"label":"source label","url":"https://example.com"}]}]}`;
}

function buildFoodieWorkerEnv() {
  const env = {};
  for (const key of ['HOME', 'PATH', 'LANG', 'LC_ALL', 'HERMES_HOME']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function spawnFoodieHermesWorker(job) {
  const prompt = buildFoodieHermesPrompt(job);
  const args = FOODIE_HERMES_ARGS.flatMap((arg) => (arg === '{prompt}' ? [prompt] : [arg]));
  const env = buildFoodieWorkerEnv();
  let stdout = '';
  let stderr = '';
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let finished = false;
  let killedForTimeout = false;

  updateFoodieJob(job.id, (current) => ({
    ...current,
    status: 'researching',
    status_message: 'Oraion research worker started.',
    updated_at: safeIsoNow(),
  }));

  const child = spawn(FOODIE_HERMES_BIN, args, {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  const failJob = (message, errorDetail) => {
    updateFoodieJob(job.id, (current) => ({
      ...current,
      status: 'error',
      status_message: sanitizeFoodieText(message, 500),
      error: sanitizeFoodieText(errorDetail || message, 2000),
      updated_at: safeIsoNow(),
    }));
  };

  const timer = setTimeout(() => {
    killedForTimeout = true;
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!finished) child.kill('SIGKILL');
    }, 5000).unref();
  }, FOODIE_WORKER_TIMEOUT_MS);

  child.stdout.on('data', (chunk) => {
    stdoutBytes += chunk.length;
    if (stdoutBytes <= FOODIE_WORKER_STDOUT_MAX_BYTES) stdout += chunk.toString('utf8');
    if (stdoutBytes > FOODIE_WORKER_STDOUT_MAX_BYTES && !child.killed) child.kill('SIGTERM');
  });

  child.stderr.on('data', (chunk) => {
    stderrBytes += chunk.length;
    if (stderrBytes <= FOODIE_WORKER_STDERR_MAX_BYTES) stderr += chunk.toString('utf8');
  });

  child.on('error', (err) => {
    clearTimeout(timer);
    finished = true;
    console.error(`[relay] Failed to spawn Foodie Hermes worker for ${job.id}:`, err.message);
    failJob('Could not start Oraion research worker.', err.message);
  });

  updateFoodieJob(job.id, (current) => ({
    ...current,
    worker_pid: child.pid,
    updated_at: safeIsoNow(),
  }));

  child.on('close', (code, signal) => {
    clearTimeout(timer);
    finished = true;
    if (killedForTimeout) {
      return failJob('Oraion research worker timed out.', `timeout after ${FOODIE_WORKER_TIMEOUT_MS}ms; stderr=${stderr.slice(0, 1000)}`);
    }
    if (stdoutBytes > FOODIE_WORKER_STDOUT_MAX_BYTES) {
      return failJob('Oraion research worker output was too large.', `stdout exceeded ${FOODIE_WORKER_STDOUT_MAX_BYTES} bytes`);
    }
    if (code !== 0) {
      return failJob('Oraion research worker failed.', `exit=${code} signal=${signal || ''}; stderr=${stderr.slice(0, 1000)}`);
    }
    try {
      const result = validateFoodieResult(extractJsonFromWorkerStdout(stdout));
      updateFoodieJob(job.id, (current) => ({
        ...current,
        status: 'ready',
        status_message: 'Ready',
        result,
        worker_stderr: stderr ? stderr.slice(0, 2000) : undefined,
        updated_at: safeIsoNow(),
      }));
    } catch (err) {
      failJob('Oraion research worker returned invalid JSON.', `${err.message}; stderr=${stderr.slice(0, 1000)}; stdout=${stdout.slice(0, 1000)}`);
    }
  });
}

async function handleFoodieCreateQuest(req, res) {
  const rateCheck = checkFoodieRateLimit(req);
  if (rateCheck.limited) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Retry-After': String(rateCheck.retryAfter),
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({ error: 'Rate limited', retry_after: rateCheck.retryAfter }));
  }

  const jobs = readFoodieJobs();
  const activeJobs = countActiveFoodieJobs(jobs);
  if (activeJobs >= FOODIE_MAX_ACTIVE_JOBS) {
    return sendJson(res, 429, {
      error: 'Too many active Foodie research jobs. Please wait for an existing quest to finish and try again.',
      active_jobs: activeJobs,
      max_active_jobs: FOODIE_MAX_ACTIVE_JOBS,
    });
  }

  let parsed;
  try {
    parsed = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: err.message });
  }

  const input = validateFoodieQuestInput(parsed);
  if (input.error) return sendJson(res, 400, { error: input.error });

  const now = safeIsoNow();
  const job = {
    id: `foodie_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
    status_token: crypto.randomBytes(24).toString('base64url'),
    status: 'queued',
    status_message: 'Queued for Oraion research.',
    topic: input.topic,
    city: input.city,
    notes: input.notes,
    sources: input.sources,
    client_request_id: input.clientRequestId,
    created_at: now,
    updated_at: now,
  };

  jobs[job.id] = job;
  writeFoodieJobs(jobs);

  setImmediate(() => spawnFoodieHermesWorker(job));
  notifyOraion(job.id, 'foodie_quest', `${job.topic} in ${job.city}${job.notes ? ` — ${job.notes}` : ''}`).catch(() => {});

  return sendJson(res, 202, {
    id: job.id,
    status_token: job.status_token,
    status: job.status,
    status_message: job.status_message,
    updated_at: job.updated_at,
  });
}

async function handleFoodieQuestStatus(req, res, jobId, url) {
  const token = url.searchParams.get('token') || '';
  const job = readFoodieJobs()[jobId];
  if (!job || token !== job.status_token) return sendJson(res, 404, { error: 'Quest not found' });
  return sendJson(res, 200, publicFoodieJob(job));
}

async function handleFoodieQuestResult(req, res, jobId) {
  let parsed;
  try {
    parsed = await readJsonBody(req, 256 * 1024);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: err.message });
  }

  const status = typeof parsed.status === 'string' ? parsed.status : '';
  if (!['researching', 'ready', 'error'].includes(status)) {
    return sendJson(res, 400, { error: 'status must be researching, ready, or error' });
  }

  let callbackResult;
  if (status === 'ready') {
    try {
      callbackResult = validateFoodieResult(parsed.result);
    } catch (err) {
      return sendJson(res, 400, { error: `invalid result: ${err.message}` });
    }
  }

  const updated = updateFoodieJob(jobId, (job) => {
    if (parsed.token !== job.status_token) return job;
    const statusMessage = sanitizeFoodieText(parsed.status_message, 500) || (status === 'ready' ? 'Ready' : status);
    return {
      ...job,
      status,
      status_message: statusMessage,
      result: status === 'ready' ? callbackResult : job.result,
      error: status === 'error' ? statusMessage : undefined,
      updated_at: safeIsoNow(),
    };
  });

  if (!updated || parsed.token !== updated.status_token) return sendJson(res, 404, { error: 'Quest not found' });
  return sendJson(res, 200, publicFoodieJob(updated));
}

function validateAuth(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === CHAT_TOKEN;
}

async function notifyOraion(messageId, messageType, description) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[relay] No Telegram bot token — skipping notification');
    return;
  }

  try {
    const notificationPayload = messageType === 'foodie_quest'
      ? {
          chat_id: configuredTelegramTarget().chatId,
          text: [
            '🍽️ [Foodie Me Quest]',
            escapeTelegramHtml(description || '(no description)'),
            `Quest ID: ${escapeTelegramHtml(messageId)}`,
            '',
            'Status: queued → researching. Watch Foodie Me for updates.',
          ].join('\n'),
          parse_mode: 'HTML',
        }
      : buildTelegramNotificationPayload({
          messageId,
          messageType,
          description,
        });
    const threadId = messageType === 'foodie_quest' ? configuredTelegramTarget().threadId : '';
    if (threadId && messageType === 'foodie_quest') notificationPayload.message_thread_id = threadId;
    const payload = JSON.stringify(notificationPayload);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    };
    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    console.log(`[relay] Notified Oraion via Telegram for message ${messageId}`);
  } catch (err) {
    console.error('[relay] Telegram notification failed:', err.message);
  }
}

async function uploadPhotoToSupabase(buffer, filename, mimeType) {
  const ext = path.extname(filename) || '.jpg';
  const storagePath = `chat/${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  const { data, error } = await supabase.storage
    .from('food-photos')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('food-photos')
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

// ── AI Auto-Processing ──────────────────────────────────────────────────────

async function callClawRouter(systemPrompt, photos, userText) {
  if (!CLAWROUTER_API_KEY) {
    throw new Error('CLAWROUTER_API_KEY not configured');
  }

  // Build user content: images as base64 + text
  const userContent = [];
  for (const photo of photos) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${photo.mimeType};base64,${photo.buffer.toString('base64')}` },
    });
  }
  if (userText) {
    userContent.push({ type: 'text', text: userText });
  } else {
    userContent.push({ type: 'text', text: 'Please analyze this image.' });
  }

  const payload = JSON.stringify({
    model: 'standard',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 1500,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clawrouter.app',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLAWROUTER_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    let timer;
    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (c) => (data += c));
      apiRes.on('end', () => {
        clearTimeout(timer);
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error(`Unexpected API response: ${data.slice(0, 200)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${e.message}`));
        }
      });
    });

    apiReq.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    timer = setTimeout(() => {
      apiReq.destroy();
      reject(new Error('AI request timed out'));
    }, AI_TIMEOUT_MS);

    apiReq.write(payload);
    apiReq.end();
  });
}

async function callGemini(systemPrompt, photos, userText) {
  if (!GEMINI_API_KEY) {
    throw new Error('No AI provider configured');
  }

  const parts = [];
  for (const photo of photos) {
    parts.push({
      inline_data: {
        mime_type: photo.mimeType,
        data: photo.buffer.toString('base64'),
      },
    });
  }
  parts.push({ text: userText || 'Please analyze this image.' });

  const payload = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: 1500 },
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    let timer;
    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (c) => (data += c));
      apiRes.on('end', () => {
        clearTimeout(timer);
        try {
          const parsed = JSON.parse(data);
          const parts = parsed.candidates?.[0]?.content?.parts || [];
          const text = parts.map((part) => part.text || '').join('').trim();
          if (text) {
            resolve(text);
          } else {
            reject(new Error(`Unexpected Gemini response: ${data.slice(0, 200)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });

    apiReq.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    timer = setTimeout(() => {
      apiReq.destroy();
      reject(new Error('Gemini request timed out'));
    }, AI_TIMEOUT_MS);

    apiReq.write(payload);
    apiReq.end();
  });
}

async function callOpenRouter(systemPrompt, photos, userText) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('No AI provider configured');
  }

  const userContent = [];
  for (const photo of photos) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${photo.mimeType};base64,${photo.buffer.toString('base64')}` },
    });
  }
  userContent.push({ type: 'text', text: userText || 'Please analyze this image.' });

  const payload = JSON.stringify({
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 1500,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://app.withluna.dev',
        'X-Title': 'Healthy Me Oraion Relay',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    let timer;
    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (c) => (data += c));
      apiRes.on('end', () => {
        clearTimeout(timer);
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content;
          if (content) {
            resolve(content);
          } else {
            reject(new Error(`Unexpected OpenRouter response: ${data.slice(0, 200)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse OpenRouter response: ${e.message}`));
        }
      });
    });

    apiReq.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    timer = setTimeout(() => {
      apiReq.destroy();
      reject(new Error('OpenRouter request timed out'));
    }, AI_TIMEOUT_MS);

    apiReq.write(payload);
    apiReq.end();
  });
}

async function callSupabaseAnalyzer(systemPrompt, photos, userText) {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceRoleKey) {
    throw new Error('Supabase analyzer not configured');
  }

  const payload = JSON.stringify({
    systemPrompt,
    description: userText || 'Please analyze this image.',
    photos: photos.map((photo) => ({
      mimeType: photo.mimeType,
      base64: photo.buffer.toString('base64'),
    })),
  });

  const endpoint = new URL('/functions/v1/analyze-product', CONFIG.supabaseUrl);
  return new Promise((resolve, reject) => {
    const apiReq = https.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.supabaseServiceRoleKey}`,
        'apikey': CONFIG.supabaseServiceRoleKey,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (apiRes) => {
      let data = '';
      apiRes.on('data', (c) => (data += c));
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (apiRes.statusCode >= 200 && apiRes.statusCode < 300 && parsed.content) {
            resolve(parsed.content);
          } else {
            reject(new Error(`Supabase analyzer HTTP ${apiRes.statusCode}: ${data.slice(0, 200)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Supabase analyzer response: ${e.message}`));
        }
      });
    });

    apiReq.on('error', reject);
    apiReq.write(payload);
    apiReq.end();
  });
}

async function callAiProvider(systemPrompt, photos, userText) {
  const provider = chooseAiProvider(CONFIG);
  if (provider === 'clawrouter') return callClawRouter(systemPrompt, photos, userText);
  if (provider === 'gemini') return callGemini(systemPrompt, photos, userText);
  if (provider === 'openrouter') return callOpenRouter(systemPrompt, photos, userText);
  if (provider === 'supabase') return callSupabaseAnalyzer(systemPrompt, photos, userText);
  throw new Error('No AI provider configured');
}

async function autoProcessAnalysis(messageId, messageType, description, photos) {
  const systemPrompt = ANALYSIS_PROMPTS[messageType];
  if (!systemPrompt) {
    console.log(`[relay] No AI prompt for type "${messageType}" — skipping auto-process`);
    return false;
  }

  try {
    console.log(`[relay] Auto-processing ${messageType} for message ${messageId} (${photos.length} photos)...`);
    const aiResponse = await callAiProvider(systemPrompt, photos, description);

    // Insert AI response as Oraion's message
    const { data: responseMsg, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: TINA_USER_ID,
        direction: 'oraion',
        content: aiResponse,
        message_type: messageType,
        status: 'complete',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`[relay] Failed to insert AI response: ${insertError.message}`);
      return false;
    }

    // Update original message status to complete
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ status: 'complete' })
      .eq('id', messageId);

    if (updateError) {
      console.error(`[relay] Failed to update message status: ${updateError.message}`);
    }

    console.log(`[relay] AI response saved: ${responseMsg.id} for message ${messageId}`);
    return true;
  } catch (err) {
    console.error(`[relay] AI auto-process failed for ${messageId}: ${err.message}`);
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ status: ERROR_STATUS })
      .eq('id', messageId);
    if (updateError) {
      console.error(`[relay] Failed to mark message failed: ${updateError.message}`);
    }
    return false;
  }
}

// ── Route Handlers ──────────────────────────────────────────────────────────

async function handleAnalyze(req, res) {
  return new Promise((resolve) => {
    const photos = [];
    const fields = {};
    let totalPhotoSize = 0;

    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_PHOTO_SIZE, files: 5 },
    });

    busboy.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info;
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        file.resume(); // drain
        return;
      }

      const chunks = [];
      let size = 0;
      file.on('data', (chunk) => {
        size += chunk.length;
        if (size <= MAX_PHOTO_SIZE) chunks.push(chunk);
      });
      file.on('end', () => {
        if (size <= MAX_PHOTO_SIZE) {
          totalPhotoSize += size;
          photos.push({ buffer: Buffer.concat(chunks), filename: filename || 'photo.jpg', mimeType });
        }
      });
    });

    busboy.on('field', (name, val) => {
      fields[name] = sanitizeText(val);
    });

    busboy.on('finish', async () => {
      try {
        const messageType = VALID_MESSAGE_TYPES.includes(fields.message_type)
          ? fields.message_type
          : 'food_analysis';
        const description = fields.description || '';
        const messageUserId = resolveMessageUserId(fields, TINA_USER_ID);

        if (photos.length === 0) {
          sendJson(res, 400, { error: 'No valid photos provided' });
          resolve();
          return;
        }

        // Keep photo buffers for AI processing before uploading
        const photoBuffers = photos.map((p) => ({ buffer: p.buffer, mimeType: p.mimeType }));

        // Upload photos to Supabase Storage
        const photoUrls = [];
        for (const photo of photos) {
          const url = await uploadPhotoToSupabase(photo.buffer, photo.filename, photo.mimeType);
          photoUrls.push(url);
        }

        // Insert chat_messages row
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            user_id: messageUserId,
            direction: 'user',
            content: description,
            photo_urls: photoUrls,
            message_type: messageType,
            status: 'pending',
          })
          .select('id')
          .single();

        if (error) {
          console.error('[relay] DB insert error:', error.message);
          sendJson(res, 500, { error: 'Failed to save message' });
          resolve();
          return;
        }

        // Auto-process with AI (don't block response to client)
        const messageId = data.id;
        const aiProcessing = autoProcessAnalysis(messageId, messageType, description, photoBuffers);

        // Respond to client immediately with pending status
        sendJson(res, 200, { id: messageId, status: 'pending', photo_urls: photoUrls });
        console.log(`[relay] Analyze request saved: ${messageId} (${messageType}, ${photos.length} photos)`);

        // Wait for AI processing. Successful auto-processing writes directly
        // back into the app; only send Telegram if manual follow-up is needed.
        aiProcessing.then((success) => {
          if (shouldNotifyOraion({ aiProcessed: success })) {
            // AI failed — notify for manual processing
            notifyOraion(messageId, messageType, description + ' [⚠️ AI failed — needs manual response]').catch(() => {});
          }
        }).catch(() => {
          notifyOraion(messageId, messageType, description + ' [⚠️ AI failed — needs manual response]').catch(() => {});
        });

        resolve();
      } catch (err) {
        console.error('[relay] Analyze error:', err.message);
        sendJson(res, 500, { error: 'Internal server error' });
        resolve();
      }
    });

    busboy.on('error', (err) => {
      console.error('[relay] Busboy error:', err.message);
      sendJson(res, 400, { error: 'Invalid multipart data' });
      resolve();
    });

    req.pipe(busboy);
  });
}

async function handleChat(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON' });
  }

  const content = sanitizeText(parsed.content || parsed.message || '');
  if (!content) {
    return sendJson(res, 400, { error: 'Message content is required' });
  }

  const messageType = VALID_MESSAGE_TYPES.includes(parsed.message_type)
    ? parsed.message_type
    : 'chat';
  const messageUserId = resolveMessageUserId(parsed, TINA_USER_ID);

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: messageUserId,
      direction: 'user',
      content,
      message_type: messageType,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[relay] DB insert error:', error.message);
    return sendJson(res, 500, { error: 'Failed to save message' });
  }

  notifyOraion(data.id, messageType, content).catch(() => {});

  sendJson(res, 200, { id: data.id, status: 'pending' });
  console.log(`[relay] Chat message saved: ${data.id}`);
}

async function handleRespond(req, res) {
  // Endpoint for Oraion to write responses back
  let body = '';
  for await (const chunk of req) body += chunk;

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON' });
  }

  const { chat_message_id, response_text, analysis_data } = parsed;
  if (!chat_message_id) {
    return sendJson(res, 400, { error: 'chat_message_id is required' });
  }

  // Insert Oraion's response as a new message
  const { data: responseMsg, error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      user_id: TINA_USER_ID,
      direction: 'oraion',
      content: response_text || '',
      analysis: analysis_data || null,
      message_type: 'chat',
      status: 'complete',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[relay] Response insert error:', insertError.message);
    return sendJson(res, 500, { error: 'Failed to save response' });
  }

  // Update original message status to complete
  const { error: updateError } = await supabase
    .from('chat_messages')
    .update({ status: 'complete' })
    .eq('id', chat_message_id);

  if (updateError) {
    console.error('[relay] Status update error:', updateError.message);
  }

  sendJson(res, 200, { id: responseMsg.id, status: 'complete' });
  console.log(`[relay] Oraion response saved for message ${chat_message_id}`);
}

// ── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  // Health check — no auth needed
  if (url.pathname === '/health' && method === 'GET') {
    return sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  // Public Foodie Me quest relay endpoints — no Healthy Me bearer token required.
  const foodieStatusMatch = url.pathname.match(/^\/foodie\/quests\/([^/]+)\/status$/);
  const foodieResultMatch = url.pathname.match(/^\/foodie\/quests\/([^/]+)\/result$/);
  if (url.pathname === '/foodie/quests' && method === 'POST') {
    return await handleFoodieCreateQuest(req, res);
  }
  if (foodieStatusMatch && method === 'GET') {
    return await handleFoodieQuestStatus(req, res, foodieStatusMatch[1], url);
  }
  if (foodieResultMatch && method === 'POST') {
    return await handleFoodieQuestResult(req, res, foodieResultMatch[1]);
  }

  // Auth check
  if (!validateAuth(req)) {
    console.log(`[relay] Auth failed from ${req.headers['cf-connecting-ip'] || req.socket.remoteAddress}`);
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  // Rate limit
  const rateCheck = checkRateLimit(TINA_USER_ID);
  if (rateCheck.limited) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Retry-After': String(rateCheck.retryAfter),
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({ error: 'Rate limited', retry_after: rateCheck.retryAfter }));
  }

  try {
    if (url.pathname === '/analyze' && method === 'POST') {
      return await handleAnalyze(req, res);
    }
    if (url.pathname === '/chat' && method === 'POST') {
      return await handleChat(req, res);
    }
    if (url.pathname === '/respond' && method === 'POST') {
      return await handleRespond(req, res);
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[relay] Unhandled error:', err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[relay] Oraion Chat Tunnel relay listening on 127.0.0.1:${PORT}`);
  console.log(`[relay] Auth: ${CHAT_TOKEN ? 'configured' : 'WARNING: no CHAT_TOKEN'}`);
  console.log(`[relay] Supabase: ${SUPABASE_URL ? 'configured' : 'WARNING: no SUPABASE_URL'}`);
  console.log(`[relay] Telegram: ${TELEGRAM_BOT_TOKEN ? 'configured' : 'WARNING: no bot token'}`);
  console.log(`[relay] AI provider: ${chooseAiProvider(CONFIG) === 'manual' ? 'WARNING: none' : chooseAiProvider(CONFIG)}`);
});
