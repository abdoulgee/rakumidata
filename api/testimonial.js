import { pipeline } from './_lib/store.js';
import { NETWORKS, DEFAULT_CONFIG, send } from './_lib/http.js';

// Handle public testimony submission
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'POST only' });
  }

  // Parse JSON body
  let body;
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    body = raw ? JSON.parse(raw) : {};
  } catch (e) {
    return send(res, 400, { error: 'Invalid JSON' });
  }

  const { name, city, network, text } = body;
  if (!name || !city || !network || !text) {
    return send(res, 400, { error: 'Missing required fields' });
  }
  if (!NETWORKS.includes(network)) {
    return send(res, 400, { error: 'Invalid network' });
  }

  // Optional: trim and limit lengths
  const cleanName = String(name).trim().slice(0, 40);
  const cleanCity = String(city).trim().slice(0, 40);
  const cleanText = String(text).trim().slice(0, 280);

  try {
    const [rawConfig] = await pipeline([['GET', 'config']]);
    let cfg = {};
    try { cfg = rawConfig ? JSON.parse(rawConfig) : {}; } catch {}
    const testimonials = Array.isArray(cfg.testimonials) ? cfg.testimonials : [];
    const newTestimony = { name: cleanName, city: cleanCity, network, text: cleanText };
    const updated = [ ...testimonials, newTestimony ];
    await pipeline([['SET', 'config', JSON.stringify({ ...DEFAULT_CONFIG, ...cfg, testimonials: updated })]]);
    send(res, 200, { ok: true });
  } catch (e) {
    console.error('testimonial failed', e);
    send(res, 500, { error: 'Failed to save testimony' });
  }
}