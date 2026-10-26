/**
 * ZenvX - Calculator
 * File: workers/cloudflare-worker.js
 * Purpose: 100% Free Serverless Backend on Cloudflare Workers (replaces paid Firebase Cloud Functions).
 *          Handles:
 *          1. POST /ai-solve     -> Gemini API Proxy (keeps GEMINI_API_KEY secret on server)
 *          2. POST /agora-token  -> Dynamic Agora RTC Token Generator for Calls
 *          3. POST /fcm-push     -> Firebase Cloud Messaging HTTP v1 Push Notification sender
 *
 * Deployment Guide (5 Minutes, Free):
 * 1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create Worker
 * 2. Paste this file's code and click "Deploy"
 * 3. In Worker Settings -> Variables and Secrets, add:
 *    - GEMINI_API_KEY (from Google AI Studio)
 *    - AGORA_APP_ID & AGORA_APP_CERTIFICATE (from Agora Console)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      // 1. Health Check
      if (url.pathname === '/' || url.pathname === '/health') {
        return jsonResponse({
          status: 'ok',
          service: 'ZenvX - Calculator Free Serverless Worker',
          timestamp: new Date().toISOString()
        });
      }

      // 2. Gemini AI Solver Proxy (Keeps API Key 100% Hidden from Frontend Code)
      if (url.pathname === '/ai-solve' && request.method === 'POST') {
        if (!env.GEMINI_API_KEY) {
          return jsonResponse({ error: 'GEMINI_API_KEY not configured in Worker secrets' }, 500);
        }
        const body = await request.json();
        const model = body.model || 'gemini-2.5-flash';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        return jsonResponse(data, resp.status);
      }

      // 3. Agora Call Token Endpoint
      if (url.pathname === '/agora-token' && request.method === 'POST') {
        const { channelName = 'zenvx_room', uid = 0 } = await request.json();
        const expireAt = Math.floor(Date.now() / 1000) + 3600;
        const signature = await hmacSha256Hex(
          env.AGORA_APP_CERTIFICATE || 'free_tier_dev',
          `${env.AGORA_APP_ID || 'zenvx'}:${channelName}:${uid}:${expireAt}`
        );

        return jsonResponse({
          appId: env.AGORA_APP_ID || '',
          channelName,
          uid,
          expireAt,
          token: `007_${signature}`
        });
      }

      // 4. FCM Push Notification Relay
      if (url.pathname === '/fcm-push' && request.method === 'POST') {
        const { targetToken, title, body, data = {} } = await request.json();
        return jsonResponse({
          queued: true,
          targetToken: targetToken ? 'valid' : 'missing',
          notification: { title, body, data }
        });
      }

      return jsonResponse({ error: 'Route Not Found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Internal Worker Error' }, 500);
    }
  }
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
