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
const path = require('path');
const {
  buildTelegramNotificationPayload,
  shouldNotifyOraion,
} = require('./routing');
const { loadRelayConfig, chooseAiProvider } = require('./config');

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

const AI_TIMEOUT_MS = 30000;

const MAX_TEXT_LENGTH = 5000;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const VALID_MESSAGE_TYPES = ['chat', 'food_analysis', 'skin_analysis', 'supplement_check', 'lab_analysis', 'menu_analysis', 'fridge_analysis', 'nutrition_label', 'skincare_product', 'supplement_product'];

// Rate limiting
const rateLimits = new Map(); // key -> { count, resetTime }
const RATE_LIMIT_PER_USER = 30;
const RATE_LIMIT_GLOBAL = 100;
const RATE_WINDOW_MS = 60 * 1000;
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
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
    const payload = JSON.stringify(buildTelegramNotificationPayload({
      messageId,
      messageType,
      description,
    }));
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

async function callAiProvider(systemPrompt, photos, userText) {
  const provider = chooseAiProvider(CONFIG);
  if (provider === 'clawrouter') return callClawRouter(systemPrompt, photos, userText);
  if (provider === 'gemini') return callGemini(systemPrompt, photos, userText);
  if (provider === 'openrouter') return callOpenRouter(systemPrompt, photos, userText);
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
            user_id: TINA_USER_ID,
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

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: TINA_USER_ID,
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
  console.log(`[relay] AI provider: ${CLAWROUTER_API_KEY ? 'clawrouter' : GEMINI_API_KEY ? 'gemini' : 'WARNING: none'}`);
});
