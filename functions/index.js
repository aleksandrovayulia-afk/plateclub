// PLATE CLUB API on Firebase: the same server as on Netlify, wrapped in one HTTPS Cloud Function.
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import pg from 'pg';

const DATABASE_URL = defineSecret('DATABASE_URL');
const PLATE_SEAL_SECRET = defineSecret('PLATE_SEAL_SECRET');
const ADMIN_SETUP_CODE = defineSecret('ADMIN_SETUP_CODE');

let handle;
async function getHandle() {
  if (handle) return handle;
  process.env.SESSION_COOKIE = '__session'; // Firebase Hosting only forwards this cookie
  const { createApp } = await import('./server/app.mjs');
  const pool = new pg.Pool({ connectionString: DATABASE_URL.value(), ssl: { rejectUnauthorized: false }, max: 5 });
  handle = createApp({ pool, env: { ...process.env, PLATE_SEAL_SECRET: PLATE_SEAL_SECRET.value(), ADMIN_SETUP_CODE: ADMIN_SETUP_CODE.value() } });
  return handle;
}

export const api = onRequest({ region: 'europe-west1', secrets: [DATABASE_URL, PLATE_SEAL_SECRET, ADMIN_SETUP_CODE], memory: '512MiB', timeoutSeconds: 60, maxInstances: 5, concurrency: 40 }, async (req, res) => {
  const h = await getHandle();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : String(v));
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req.rawBody;
  const out = await h(new Request(`https://${host}${req.originalUrl}`, { method: req.method, headers, body }), { ip: req.ip });
  res.status(out.status);
  out.headers.forEach((v, k) => res.setHeader(k, v));
  res.send(Buffer.from(await out.arrayBuffer()));
});
