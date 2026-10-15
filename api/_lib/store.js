// Storage: Upstash Redis over REST (Vercel Marketplace → "Upstash for Redis").
// Falls back to an in-memory store when no credentials are set (local dev).

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storageMode = URL_ && TOKEN ? 'redis' : 'memory';

// Run several commands in one round trip. Returns an array of results.
export async function pipeline(cmds) {
  if (storageMode === 'memory') return cmds.map(runMemory);
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

export async function cmd(...args) {
  const [r] = await pipeline([args]);
  return r;
}

// ---- in-memory fallback (only the commands this app uses) ----
const mem = globalThis.__rkMem || (globalThis.__rkMem = new Map());
const hll = (k) => {
  if (!mem.has(k)) mem.set(k, new Set());
  return mem.get(k);
};
const hash = (k) => {
  if (!mem.has(k)) mem.set(k, new Map());
  return mem.get(k);
};
const list = (k) => {
  if (!mem.has(k)) mem.set(k, []);
  return mem.get(k);
};

function runMemory([op, k, ...a]) {
  switch (op.toUpperCase()) {
    case 'GET': return mem.has(k) ? String(mem.get(k)) : null;
    case 'SET': mem.set(k, a[0]); return 'OK';
    case 'DEL': return mem.delete(k) ? 1 : 0;
    case 'INCR': { const v = Number(mem.get(k) || 0) + 1; mem.set(k, v); return v; }
    case 'EXPIRE': return 1;
    case 'HINCRBY': { const h = hash(k); const v = Number(h.get(a[0]) || 0) + Number(a[1]); h.set(a[0], v); return v; }
    case 'HGETALL': { const h = mem.get(k); return h ? [...h].flatMap(([f, v]) => [f, String(v)]) : []; }
    case 'PFADD': { const s = hll(k); const n = s.size; a.forEach((x) => s.add(x)); return s.size > n ? 1 : 0; }
    case 'PFCOUNT': return mem.has(k) ? mem.get(k).size : 0;
    case 'LPUSH': { const l = list(k); l.unshift(...a.reverse()); return l.length; }
    case 'LTRIM': { const l = list(k); mem.set(k, l.slice(Number(a[0]), Number(a[1]) + 1)); return 'OK'; }
    case 'LRANGE': return list(k).slice(Number(a[0]), Number(a[1]) + 1);
    default: throw new Error(`memory store: ${op} not supported`);
  }
}

// HGETALL returns a flat [field, value, ...] array; turn it into an object of numbers.
export function hashToNumbers(flat) {
  const o = {};
  for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]) || 0;
  return o;
}
