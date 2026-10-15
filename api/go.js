import crypto from 'node:crypto';
import { pipeline } from './_lib/store.js';
import { NETWORKS, DEFAULT_CONFIG, query, lagosDay, isBot, device, visitorMeta, cleanSource, cleanId } from './_lib/http.js';

// /go/mtn → records the click, then redirects to the current offer link.
// Links may contain {clickid} and {source}; they are filled in here so the
// CPA network can report conversions back per click.
export default async function handler(req, res) {
  const q = query(req);
  const net = NETWORKS.includes(q.n) ? q.n : null;
  if (!net) return redirect(res, '/#networks');

  const meta = visitorMeta(req);
  const bot = isBot(meta.ua);
  const vid = cleanId(q.v) || cleanId(meta.ip) || 'anon';
  const source = cleanSource(q.s);
  const clickId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const day = lagosDay();

  const cmds = [['GET', 'config']];
  if (!bot) {
    cmds.push(
      ['INCR', 'tot:c'],
      ['HINCRBY', `d:${day}`, 'c', 1],
      ['HINCRBY', `d:${day}`, net, 1],
      ['HINCRBY', 'net', net, 1],
      ['HINCRBY', 'srcc', source, 1],
      ['PFADD', 'cu:all', vid],
      ['LPUSH', 'ev', JSON.stringify({
        t: 'c', n: net, ts: Date.now(), s: source, d: device(meta.ua),
        c: meta.country, ci: meta.city, id: clickId,
      })],
      ['LTRIM', 'ev', 0, 499],
    );
  }

  let link = '';
  try {
    const [raw] = await pipeline(cmds);
    const cfg = raw ? JSON.parse(raw) : DEFAULT_CONFIG;
    link = (cfg.links || {})[net] || '';
  } catch (e) {
    console.error('go failed', e);
  }

  if (!/^https?:\/\//i.test(link)) return redirect(res, `/?soon=${net}#networks`);
  link = link
    .replaceAll('{clickid}', clickId)
    .replaceAll('{source}', encodeURIComponent(source));
  redirect(res, link);
}

function redirect(res, to) {
  res.statusCode = 302;
  res.setHeader('Location', to);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.end();
}
