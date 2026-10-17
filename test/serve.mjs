// Local dev server: static files from public/ + the real API on a local Postgres.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createPool } from './pgmini.mjs';
import { createApp } from '../server/app.mjs';
const db = process.env.PG_DB || 'plateclub_dev';
const pool = createPool({ host: '127.0.0.1', port: 5433, user: 'postgres', database: db });
const app = createApp({ pool, env: { PLATE_SEAL_SECRET: 'dev-secret-'.padEnd(48, 'x') } });
const root = new URL('../public/', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const r = await app(new Request('http://localhost' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), { ip: '127.0.0.1' });
      const h = Object.fromEntries(r.headers); if (h['set-cookie']) h['set-cookie'] = h['set-cookie'].replace('; Secure', '');
      res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let p = normalize(decodeURIComponent(req.url.split('?')[0])); if (p === '/' || p.startsWith('/i/')) p = '/index.html';
    const f = await readFile(join(root, p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream', ...(process.env.CSP ? { 'content-security-policy': process.env.CSP.replace(' upgrade-insecure-requests', '') } : {}) }); res.end(f);
  } catch (e) { res.writeHead(404); res.end('not found'); }
}).listen(8788, () => console.log('http://localhost:8788'));
