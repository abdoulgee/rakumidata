import { pipeline } from '../_lib/store.js';
import { send, readJson, visitorMeta } from '../_lib/http.js';
import { checkCredentials, sessionCookie, clearCookie, isAdmin } from '../_lib/auth.js';

// GET → am I logged in?  POST → log in.  DELETE → log out.
export default async function handler(req, res) {
  if (req.method === 'GET') return send(res, 200, { ok: isAdmin(req) }, { 'Cache-Control': 'no-store' });
  if (req.method === 'DELETE') return send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(req) });
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  // At most 10 attempts per IP per 15 minutes.
  const key = `rl:${visitorMeta(req).ip || 'x'}`;
  let attempts = 0;
  try {
    [attempts] = await pipeline([['INCR', key], ['EXPIRE', key, 900]]);
  } catch {}
  if (attempts > 10) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });

  const { user, pass } = await readJson(req);
  if (!checkCredentials(user || '', pass || '')) {
    return send(res, 401, { error: 'Wrong username or password.' });
  }
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req) });
}
