import { pipeline, storageMode, hashToNumbers } from '../_lib/store.js';
import { NETWORKS, send, lagosDay } from '../_lib/http.js';
import { isAdmin } from '../_lib/auth.js';

const DAYS = 14;

export default async function handler(req, res) {
  if (!isAdmin(req)) return send(res, 401, { error: 'Not logged in' });

  const days = Array.from({ length: DAYS }, (_, i) => lagosDay(DAYS - 1 - i));
  try {
    const r = await pipeline([
      ['GET', 'tot:v'],
      ['GET', 'tot:c'],
      ['PFCOUNT', 'u:all'],
      ['PFCOUNT', 'cu:all'],
      ['HGETALL', 'net'],
      ['HGETALL', 'srcv'],
      ['HGETALL', 'srcc'],
      ['LRANGE', 'ev', 0, 199],
      ...days.map((d) => ['HGETALL', `d:${d}`]),
      ...days.map((d) => ['PFCOUNT', `u:${d}`]),
    ]);
    const [views, clicks, uniques, clickers, net, srcv, srcc, ev] = r;
    const dayHashes = r.slice(8, 8 + DAYS).map(hashToNumbers);
    const dayUniques = r.slice(8 + DAYS);

    const sv = hashToNumbers(srcv);
    const sc = hashToNumbers(srcc);
    const sources = [...new Set([...Object.keys(sv), ...Object.keys(sc)])]
      .map((s) => ({ source: s, visits: sv[s] || 0, clicks: sc[s] || 0 }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    const n = hashToNumbers(net);
    send(res, 200, {
      storage: storageMode,
      totals: {
        views: Number(views) || 0,
        clicks: Number(clicks) || 0,
        uniques: Number(uniques) || 0,
        clickers: Number(clickers) || 0,
      },
      networks: Object.fromEntries(NETWORKS.map((k) => [k, n[k] || 0])),
      daily: days.map((d, i) => ({
        day: d,
        views: dayHashes[i].v || 0,
        uniques: Number(dayUniques[i]) || 0,
        clicks: dayHashes[i].c || 0,
        ...Object.fromEntries(NETWORKS.map((k) => [k, dayHashes[i][k] || 0])),
      })),
      sources,
      events: (ev || []).map((e) => { try { return JSON.parse(e); } catch { return null; } }).filter(Boolean),
    }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error('stats failed', e);
    send(res, 500, { error: 'Could not load stats: ' + e.message });
  }
}
