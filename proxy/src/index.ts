/**
 * Equinox API proxy (Cloudflare Worker).
 *
 * Holds the Gemini, Finnhub and Alpha Vantage keys as Worker secrets so they
 * are never shipped inside the app. Every request must carry a Firebase ID
 * token (`Authorization: Bearer <token>`) for project FIREBASE_PROJECT_ID, and
 * is rate limited per Firebase uid.
 *
 * Routes (only what the app uses):
 *   POST /gemini/generateContent   body: { model, contents, config }
 *   GET  /finnhub/<path>?<query>   path from FINNHUB_PATHS; token added here
 *   GET  /alphavantage?<query>     function=TIME_SERIES_DAILY only
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface Env {
  GEMINI_API_KEY: string;
  FINNHUB_API_KEY: string;
  ALPHA_VANTAGE_API_KEY?: string;
  FIREBASE_PROJECT_ID: string;
  AI_LIMITER: RateLimit;
  DATA_LIMITER: RateLimit;
}

// Google's public keys for Firebase ID tokens. jose caches them per isolate
// and refetches when it sees an unknown key id.
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-exp',
]);
// Fields of the SDK's `config` that belong in the REST `generationConfig`.
const GENERATION_CONFIG_FIELDS = [
  'temperature',
  'topP',
  'topK',
  'maxOutputTokens',
  'candidateCount',
  'stopSequences',
  'responseMimeType',
  'responseModalities',
  'thinkingConfig',
];
const MAX_OUTPUT_TOKENS = 4096;
const MAX_GEMINI_BODY_BYTES = 256 * 1024;

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_PATHS = new Set([
  'search',
  'quote',
  'stock/profile2',
  'stock/candle',
  'stock/symbol',
  'news',
  'company-news',
]);

const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_FUNCTIONS = new Set(['TIME_SERIES_DAILY']);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const route = matchRoute(request.method, url.pathname);
      if (!route) return json({ error: 'Not found' }, 404);

      const uid = await verifyFirebaseToken(request, env);
      if (!uid) return json({ error: 'Unauthorized' }, 401);

      const limiter = route.kind === 'gemini' ? env.AI_LIMITER : env.DATA_LIMITER;
      const { success } = await limiter.limit({ key: uid });
      if (!success) return json({ error: 'Too many requests, slow down' }, 429);

      switch (route.kind) {
        case 'gemini':
          return await handleGemini(request, env);
        case 'finnhub':
          return await handleFinnhub(route.path, url, env);
        case 'alphavantage':
          return await handleAlphaVantage(url, env);
      }
    } catch (err) {
      console.error('Proxy error:', err);
      return json({ error: 'Proxy error' }, 502);
    }
  },
} satisfies ExportedHandler<Env>;

type Route =
  | { kind: 'gemini' }
  | { kind: 'finnhub'; path: string }
  | { kind: 'alphavantage' };

function matchRoute(method: string, pathname: string): Route | null {
  if (method === 'POST' && pathname === '/gemini/generateContent') {
    return { kind: 'gemini' };
  }
  if (method === 'GET' && pathname.startsWith('/finnhub/')) {
    const path = pathname.slice('/finnhub/'.length);
    return FINNHUB_PATHS.has(path) ? { kind: 'finnhub', path } : null;
  }
  if (method === 'GET' && pathname === '/alphavantage') {
    return { kind: 'alphavantage' };
  }
  return null;
}

/** Returns the Firebase uid for a valid ID token, or null. */
async function verifyFirebaseToken(request: Request, env: Env): Promise<string | null> {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    });
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Accepts the same `{ model, contents, config }` shape as the @google/genai
 * SDK's `models.generateContent`, maps it to the REST request, and returns the
 * raw REST response (candidates, usageMetadata, ...).
 */
async function handleGemini(request: Request, env: Env): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_GEMINI_BODY_BYTES) return json({ error: 'Request too large' }, 413);

  let params: any;
  try {
    params = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const model = params?.model;
  if (typeof model !== 'string' || !GEMINI_MODELS.has(model)) {
    return json({ error: 'Model not allowed' }, 400);
  }

  const contents = typeof params.contents === 'string'
    ? [{ role: 'user', parts: [{ text: params.contents }] }]
    : params.contents;
  if (!Array.isArray(contents) || contents.length === 0) {
    return json({ error: 'contents is required' }, 400);
  }

  const config = params.config ?? {};
  const generationConfig: Record<string, unknown> = {};
  for (const field of GENERATION_CONFIG_FIELDS) {
    if (config[field] !== undefined) generationConfig[field] = config[field];
  }
  generationConfig.maxOutputTokens = Math.min(
    Number(generationConfig.maxOutputTokens) || MAX_OUTPUT_TOKENS,
    MAX_OUTPUT_TOKENS
  );

  const body: Record<string, unknown> = { contents, generationConfig };
  if (config.systemInstruction) {
    body.systemInstruction = typeof config.systemInstruction === 'string'
      ? { parts: [{ text: config.systemInstruction }] }
      : config.systemInstruction;
  }
  if (config.safetySettings) body.safetySettings = config.safetySettings;

  const upstream = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  return passThrough(upstream);
}

async function handleFinnhub(path: string, url: URL, env: Env): Promise<Response> {
  const query = new URLSearchParams(url.search);
  query.delete('token');
  const upstream = await fetch(`${FINNHUB_BASE_URL}/${path}?${query}`, {
    headers: { 'X-Finnhub-Token': env.FINNHUB_API_KEY },
  });
  return passThrough(upstream);
}

async function handleAlphaVantage(url: URL, env: Env): Promise<Response> {
  if (!env.ALPHA_VANTAGE_API_KEY) return json({ error: 'Alpha Vantage not configured' }, 503);

  const fn = url.searchParams.get('function') || '';
  if (!ALPHA_VANTAGE_FUNCTIONS.has(fn)) return json({ error: 'Function not allowed' }, 400);

  const query = new URLSearchParams({ function: fn });
  for (const name of ['symbol', 'outputsize']) {
    const value = url.searchParams.get(name);
    if (value) query.set(name, value);
  }
  query.set('apikey', env.ALPHA_VANTAGE_API_KEY);
  return passThrough(await fetch(`${ALPHA_VANTAGE_URL}?${query}`));
}

/** Forwards the upstream status and body; never forwards upstream headers. */
async function passThrough(upstream: Response): Promise<Response> {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
    },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
