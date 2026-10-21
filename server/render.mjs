// PLATE CLUB on any Node host (Render, Railway, a VPS): one process serves the site and the API.
//   Build command:  npm install
//   Start command:  node server/render.mjs
//   Environment:    DATABASE_URL (Neon/Postgres), PLATE_SEAL_SECRET (64 hex), ADMIN_SETUP_CODE, SITE_URL (https://your-site),
//                   optional ADMIN_INITIAL_GRANT (default 50000000), PORT (the host sets it)
// Database tables are created/updated automatically at start.
import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync, brotliCompressSync, constants as Z } from 'node:zlib';
import pg from 'pg';
import { createApp } from './app.mjs';

const env = process.env;
if (!env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1); }
const SITE = (env.SITE_URL || env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
const ssl = /sslmode=disable|localhost|127\.0\.0\.1/.test(env.DATABASE_URL) ? false : { rejectUnauthorized: false };
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl, max: Number(env.PG_POOL || 8), idleTimeoutMillis: 30000, keepAlive: true });
pool.on('error', e => console.error('pg pool', e.message));

// ---- migrations: every .sql file once, in order ----
async function migrate() {
  const dir = new URL('../netlify/database/migrations/', import.meta.url);
  const c = await pool.connect();
  try {
    await c.query('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, at TIMESTAMPTZ DEFAULT now())');
    const done = new Set((await c.query('SELECT name FROM _migrations')).rows.map(r => r.name));
    for (const f of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await c.query('BEGIN');
      try { await c.query(await readFile(new URL(f, dir), 'utf8')); await c.query('INSERT INTO _migrations(name) VALUES($1)', [f]); await c.query('COMMIT'); console.log('migration applied', f); }
      catch (e) { await c.query('ROLLBACK'); throw new Error(`migration ${f}: ${e.message}`); }
    }
  } finally { c.release(); }
}

// ---- security headers, the same as on Netlify/Firebase (CSP is read from netlify.toml so there is one source) ----
const toml = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8').catch(() => '');
const CSP = (toml.match(/Content-Security-Policy\s*=\s*"([^"]+)"/) || [])[1] || "default-src 'self'";
const BASE_HEADERS = {
  'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=31536000; includeSubDomains', 'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.webm': 'video/webm', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const root = new URL('../public/', import.meta.url).pathname;

// static files are read once and kept compressed in memory (the site is small)
const cache = new Map();
async function file(p) {
  if (cache.has(p)) return cache.get(p);
  const body = await readFile(join(root, p)); const type = TYPES[extname(p)] || 'application/octet-stream';
  const text = /text|javascript|json|svg|manifest/.test(type);
  const f = { body, type, br: text ? brotliCompressSync(body, { params: { [Z.BROTLI_PARAM_QUALITY]: 9 } }) : null, gz: text ? gzipSync(body, { level: 9 }) : null };
  cache.set(p, f); return f;
}
const cacheControl = p => (/^\/(img|brand|media)\//.test(p) ? 'public, max-age=86400' : p === '/sw.js' || /\.(html|js|css)$/.test(p) ? 'no-cache' : 'public, max-age=3600');

// the address that really connected: the host's proxy appends it to X-Forwarded-For, so the last entry is the trustworthy one
const clientIp = req => { const x = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean); return x.length ? x[x.length - 1] : req.socket.remoteAddress || 'unknown'; };

const app = createApp({ pool, env: { ...env, URL: SITE || undefined, ALLOWED_HOSTS: env.ALLOWED_HOSTS || (SITE ? new URL(SITE).host : undefined), ADMIN_INITIAL_GRANT: env.ADMIN_INITIAL_GRANT || '50000000' } });

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
    if (req.url.startsWith('/api/')) {
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 400000) { res.writeHead(413); return res.end(); } chunks.push(c); }
      const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : String(v));
      const base = SITE || `https://${req.headers.host}`;
      const r = await app(new Request(base + req.url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), { ip: clientIp(req) });
      const h = { ...BASE_HEADERS, 'cache-control': 'no-store' }; r.headers.forEach((v, k) => { h[k] = v; });
      res.writeHead(r.status, h); return res.end(Buffer.from(await r.arrayBuffer()));
    }
    let p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/\\/g, '/');
    if (p === '/' || p.startsWith('/i/') || !extname(p)) p = '/index.html';
    if (p.includes('..')) { res.writeHead(400); return res.end(); }
    const f = await file(p);
    const ae = String(req.headers['accept-encoding'] || '');
    const enc = f.br && /\bbr\b/.test(ae) ? 'br' : f.gz && /gzip/.test(ae) ? 'gzip' : null;
    const h = { ...BASE_HEADERS, 'content-type': f.type, 'cache-control': cacheControl(p), vary: 'Accept-Encoding' };
    if (p === '/index.html') h['content-security-policy'] = CSP;
    if (enc) h['content-encoding'] = enc;
    res.writeHead(200, h); res.end(req.method === 'HEAD' ? undefined : enc === 'br' ? f.br : enc === 'gzip' ? f.gz : f.body);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'EISDIR') { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
    console.error(e); if (!res.headersSent) res.writeHead(500); res.end();
  }
});

await migrate();
server.keepAliveTimeout = 65000;
server.listen(Number(env.PORT || 10000), () => console.log('Plate Club is up on port', env.PORT || 10000));
