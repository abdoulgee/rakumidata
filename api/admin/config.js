import { cmd } from '../_lib/store.js';
import { NETWORKS, getConfig, send, readJson } from '../_lib/http.js';
import { isAdmin } from '../_lib/auth.js';

const clip = (s, n) => String(s ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (!isAdmin(req)) return send(res, 401, { error: 'Not logged in' });
  if (req.method === 'GET') return send(res, 200, await getConfig(), { 'Cache-Control': 'no-store' });
  if (req.method !== 'PUT') return send(res, 405, { error: 'Method not allowed' });

  const body = await readJson(req);
  const errors = {};
  const links = {};
  for (const n of NETWORKS) {
    const v = clip(body.links?.[n], 2000);
    if (v && !/^https?:\/\/[^\s]+$/i.test(v)) errors[n] = 'Must start with https:// and contain no spaces';
    links[n] = v;
  }
  const subscribers = Math.max(0, Math.floor(Number(body.subscribers) || 0));
  const testimonials = (Array.isArray(body.testimonials) ? body.testimonials : [])
    .map((t) => ({
      name: clip(t.name, 40),
      city: clip(t.city, 40),
      network: NETWORKS.includes(t.network) ? t.network : '',
      text: clip(t.text, 280),
    }))
    .filter((t) => t.name && t.text)
    .slice(0, 12);

  if (Object.keys(errors).length) return send(res, 400, { error: 'Fix the highlighted links', fields: errors });

  const cfg = { links, subscribers, priceNote: clip(body.priceNote, 240), testimonials };
  await cmd('SET', 'config', JSON.stringify(cfg));
  send(res, 200, cfg);
}
