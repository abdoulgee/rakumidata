import { pipeline } from './_lib/store.js';
import { send, readJson, lagosDay, isBot, device, visitorMeta, cleanSource, cleanId } from './_lib/http.js';

// Records a landing-page view. Sent with navigator.sendBeacon from index.html.
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const meta = visitorMeta(req);
  if (isBot(meta.ua)) return send(res, 204, {});

  const body = await readJson(req);
  const vid = cleanId(body.v) || cleanId(meta.ip) || 'anon';
  const source = cleanSource(body.s);
  const day = lagosDay();
  const event = JSON.stringify({
    t: 'v', ts: Date.now(), s: source, d: device(meta.ua),
    c: meta.country, ci: meta.city, r: String(body.r || '').slice(0, 80),
  });

  try {
    await pipeline([
      ['INCR', 'tot:v'],
      ['HINCRBY', `d:${day}`, 'v', 1],
      ['PFADD', 'u:all', vid],
      ['PFADD', `u:${day}`, vid],
      ['EXPIRE', `u:${day}`, 120 * 864e2],
      ['HINCRBY', 'srcv', source, 1],
      ['LPUSH', 'ev', event],
      ['LTRIM', 'ev', 0, 499],
    ]);
  } catch (e) {
    console.error('track failed', e);
  }
  send(res, 204, {});
}
