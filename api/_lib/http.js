import { cmd } from './store.js';

export const NETWORKS = ['mtn', 'airtel', 'glo'];

// Starting values until the admin saves settings. Paste your CPA links here
// or set them from /admin.
export const DEFAULT_CONFIG = {
  links: { mtn: '', airtel: '', glo: '' },
  subscribers: 0, // shown on the page only when > 0 (use your real number)
    priceNote: 'Text STOP to 20016 to stop',
  testimonials: [], // [{ name, city, network, text }]
};

export async function getConfig() {
  const raw = await cmd('GET', 'config');
  let saved = {};
  try { saved = raw ? JSON.parse(raw) : {}; } catch {}
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    links: { ...DEFAULT_CONFIG.links, ...(saved.links || {}) },
  };
}

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function query(req) {
  return Object.fromEntries(new URL(req.url, 'http://x').searchParams);
}

// Vercel pre-parses req.body; the local dev server leaves the stream unread.
export async function readJson(req) {
  let body = req.body;
  if (body === undefined) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    body = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    try { return body ? JSON.parse(body) : {}; } catch { return {}; }
  }
  return body || {};
}

// Calendar day in Lagos time (UTC+1, no DST).
export function lagosDay(offsetDays = 0) {
  return new Date(Date.now() + 3600e3 - offsetDays * 864e5).toISOString().slice(0, 10);
}

export function isBot(ua = '') {
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|vercel/i.test(ua);
}

export function device(ua = '') {
  if (/iphone|ipad|ipod/i.test(ua)) return 'iPhone';
  if (/android/i.test(ua)) return 'Android';
  if (/windows|macintosh|linux|cros/i.test(ua)) return 'Desktop';
  return 'Other';
}

export function visitorMeta(req) {
  const h = req.headers;
  return {
    ua: h['user-agent'] || '',
    ip: (h['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '',
    country: h['x-vercel-ip-country'] || '',
    city: decodeURIComponent(h['x-vercel-ip-city'] || ''),
  };
}

// Normalise a traffic source label: "facebook", "tiktok", "whatsapp"...
export function cleanSource(s) {
  return String(s || 'direct').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32) || 'direct';
}

export function cleanId(s) {
  return String(s || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
}
