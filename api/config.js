import { pipeline } from './_lib/store.js';
import { NETWORKS, DEFAULT_CONFIG, send } from './_lib/http.js';

// Public, cacheable data for the landing page. Offer links are NOT exposed here;
// buttons go through /go/<network> so every click is counted.
export default async function handler(req, res) {
  let cfg = DEFAULT_CONFIG;
  let claims = 0;
  let recent = [];
  try {
    const [raw, tot, ev] = await pipeline([
      ['GET', 'config'],
      ['GET', 'tot:c'],
      ['LRANGE', 'ev', 0, 60],
    ]);
    if (raw) cfg = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    claims = Number(tot) || 0;
    recent = (ev || [])
      .map((e) => { try { return JSON.parse(e); } catch { return null; } })
      .filter((e) => e && e.t === 'c')
      .slice(0, 6)
      .map((e) => ({ n: e.n, ts: e.ts, ci: e.ci || '' }));
  } catch (e) {
    console.error('config failed', e);
  }

  send(res, 200, {
    live: Object.fromEntries(NETWORKS.map((n) => [n, Boolean((cfg.links || {})[n])])),
    subscribers: Number(cfg.subscribers) || 0,
    claims,
    priceNote: cfg.priceNote || DEFAULT_CONFIG.priceNote,
    testimonials: Array.isArray(cfg.testimonials) ? cfg.testimonials : [],
    recent,
  }, { 'Cache-Control': 'public, max-age=0, s-maxage=20, stale-while-revalidate=120' });
}
