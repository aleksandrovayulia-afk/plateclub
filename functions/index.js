// PLATE CLUB API on Firebase: the same server as on Netlify, wrapped in one HTTPS Cloud Function.
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import pg from 'pg';

const DATABASE_URL = defineSecret('DATABASE_URL');
const PLATE_SEAL_SECRET = defineSecret('PLATE_SEAL_SECRET');
const ADMIN_SETUP_CODE = defineSecret('ADMIN_SETUP_CODE');

// links in e-mails (password reset, verification, invites) always point here — never to a host taken from request headers
const SITE = (process.env.SITE_URL || 'https://plate-club7.web.app').replace(/\/$/, '');
let handle;
async function getHandle() {
  if (handle) return handle;
  process.env.SESSION_COOKIE = '__session'; // Firebase Hosting only forwards this cookie
  const { createApp } = await import('./server/app.mjs');
  const pool = new pg.Pool({ connectionString: DATABASE_URL.value(), ssl: { rejectUnauthorized: false }, max: 5 });
  handle = createApp({ pool, env: { ...process.env, URL: SITE, ALLOWED_HOSTS: process.env.ALLOWED_HOSTS || [new URL(SITE).host, new URL(SITE).host.replace('.web.app', '.firebaseapp.com')].join(','), PLATE_SEAL_SECRET: PLATE_SEAL_SECRET.value(), ADMIN_SETUP_CODE: ADMIN_SETUP_CODE.value(), ADMIN_INITIAL_GRANT: process.env.ADMIN_INITIAL_GRANT || '50000000' } });
  return handle;
}

// The client can put anything into X-Forwarded-For; Google's front end appends the address that really connected.
// Through Firebase Hosting that address is the CDN (Fastly), and the real client is the entry just before it.
// Anything else (a direct call to the function URL) uses the connecting address, so a forged header changes nothing.
const FASTLY = ['23.235.32.0/20', '43.249.72.0/22', '103.244.50.0/24', '103.245.222.0/23', '103.245.224.0/24', '104.156.80.0/20', '140.248.64.0/18', '140.248.128.0/17', '146.75.0.0/17', '151.101.0.0/16', '157.52.64.0/18', '167.82.0.0/17', '167.82.128.0/20', '167.82.160.0/20', '167.82.224.0/20', '172.111.64.0/18', '185.31.16.0/22', '199.27.72.0/21', '199.232.0.0/16'];
const v4 = ip => { const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(ip); return m ? ((+m[1] << 24) >>> 0) + (+m[2] << 16) + (+m[3] << 8) + +m[4] : null; };
const inFastly = ip => { const x = v4(ip); if (x == null) return /^2a04:4e4[0-7]:/i.test(ip); return FASTLY.some(c => { const [base, bits] = c.split('/'); const mask = bits === '0' ? 0 : (~0 << (32 - bits)) >>> 0; return ((x & mask) >>> 0) === ((v4(base) & mask) >>> 0); }); };
function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!xff.length) return (req.socket && req.socket.remoteAddress) || 'unknown';
  const last = xff[xff.length - 1];
  return xff.length >= 2 && inFastly(last) ? xff[xff.length - 2] : last;
}

export const api = onRequest({ region: 'europe-west1', secrets: [DATABASE_URL, PLATE_SEAL_SECRET, ADMIN_SETUP_CODE], memory: '512MiB', timeoutSeconds: 60, maxInstances: 5, concurrency: 40 }, async (req, res) => {
  const h = await getHandle();
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v != null && k !== 'x-forwarded-host' && k !== 'x-nf-client-connection-ip') headers.set(k, Array.isArray(v) ? v.join(', ') : String(v));
  headers.set('host', new URL(SITE).host);
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req.rawBody;
  const out = await h(new Request(SITE + req.originalUrl, { method: req.method, headers, body }), { ip: clientIp(req) });
  res.status(out.status);
  out.headers.forEach((v, k) => res.setHeader(k, v));
  res.send(Buffer.from(await out.arrayBuffer()));
});
