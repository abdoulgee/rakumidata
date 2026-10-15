import crypto from 'node:crypto';

// Admin login. These defaults live on the server only (never sent to the
// browser). Override them in Vercel → Settings → Environment Variables.
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Rakumi@2026';
const SECRET = process.env.ADMIN_SECRET || crypto.createHash('sha256').update(`rk:${ADMIN_USER}:${ADMIN_PASS}`).digest('hex');

const COOKIE = 'rk_admin';
const MAX_AGE = 7 * 24 * 3600;

const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function checkCredentials(user, pass) {
  // Evaluate both so timing doesn't reveal which one was wrong.
  const u = safeEqual(user, ADMIN_USER);
  const p = safeEqual(pass, ADMIN_PASS);
  return u && p;
}

export function sessionCookie(req) {
  const payload = Buffer.from(JSON.stringify({ u: ADMIN_USER, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure(req)}`;
}

export function clearCookie(req) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure(req)}`;
}

function secure(req) {
  const host = req.headers.host || '';
  return /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? '' : '; Secure';
}

export function isAdmin(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}
