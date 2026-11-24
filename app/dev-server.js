// Servidor local mínimo para desarrollar: npm start
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
const ROOT = join(import.meta.dirname, 'www');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const port = process.env.PORT || 5173;
createServer(async (q, r) => {
  const p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  const f = normalize(join(ROOT, p === '/' ? 'index.html' : p));
  if (!f.startsWith(ROOT + sep)) return r.writeHead(403).end();
  try { const b = await readFile(f); r.writeHead(200, { 'Content-Type': T[extname(f)] ?? 'application/octet-stream' }).end(b); } catch { r.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}`));
