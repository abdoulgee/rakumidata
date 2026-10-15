// Local preview that mimics Vercel: static files + /api functions + /go rewrite.
// Usage: npm run dev  →  http://localhost:3000   (stats kept in memory)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  let url = new URL(req.url, `http://${req.headers.host}`);
  const go = url.pathname.match(/^\/go\/([a-z]+)$/);
  if (go) {
    url.searchParams.set('n', go[1]);
    url = new URL(`/api/go?${url.searchParams}`, url);
    req.url = url.pathname + url.search;
  }
  try {
    if (url.pathname.startsWith('/api/')) {
      const file = path.join(root, url.pathname + '.js');
      if (!file.startsWith(path.join(root, 'api')) || url.pathname.includes('/_')) throw Object.assign(new Error(), { code: 'ENOENT' });
      const mod = await import(pathToFileURL(file).href);
      return await mod.default(req, res);
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(root, p);
    if (!file.startsWith(root) || /\/(scripts|api)\//.test(file)) throw Object.assign(new Error(), { code: 'ENOENT' });
    let stat = await fs.stat(file).catch(() => null);
    if (stat?.isDirectory()) file = path.join(file, 'index.html');
    else if (!stat) file += '.html';
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    if (e.code !== 'ENOENT') console.error(e);
    if (!res.headersSent) { res.writeHead(e.code === 'ENOENT' ? 404 : 500); }
    res.end(e.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
}).listen(PORT, () => console.log(`Rakumi Data → http://localhost:${PORT}  (admin: /admin)`));
