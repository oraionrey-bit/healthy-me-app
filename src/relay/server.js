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

// ── Config ──────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '7700', 10);
const CHAT_TOKEN = process.env.CHAT_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TINA_CHAT_ID = '5052308275';
const TINA_USER_ID = 'e454325f-b8e6-4251-9a49-9d706eef99c3';

const MAX_TEXT_LENGTH = 5000;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const VALID_MESSAGE_TYPES = ['chat', 'food_analysis', 'skin_analysis', 'supplement_check', 'lab_analysis', 'menu_analysis', 'fridge_analysis'];

// Rate limiting
const rateLimits = new Map(); // key -> { count, resetTime }
const RATE_LIMIT_PER_USER = 30;
const RATE_LIMIT_GLOBAL = 100;
const RATE_WINDOW_MS = 60 * 1000;
let globalRequests = { count: 0, resetTime: Date.now() + RATE_WINDOW_MS };

// Supabase client — service role key bypasses RLS (server-side only, never exposed to client)
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
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
  const text = [
    '📸 [Photo Analysis Request]',
    `Type: ${messageType}`,
    `Description: "${description || '(no description)'}"`,
    `Chat Message ID: ${messageId}`,
    '',
    'Oraion: analyze this and respond in-app.',
  ].join('\n');

  try {
    const payload = JSON.stringify({ chat_id: TINA_CHAT_ID, text, parse_mode: 'HTML' });
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

        // Notify Oraion
        notifyOraion(data.id, messageType, description).catch(() => {});

        sendJson(res, 200, { id: data.id, status: 'pending', photo_urls: photoUrls });
        console.log(`[relay] Analyze request saved: ${data.id} (${messageType}, ${photos.length} photos)`);
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
});
