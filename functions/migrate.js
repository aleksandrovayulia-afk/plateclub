// Creates/updates the database tables. Run once before the first deploy and after each update:
//   DATABASE_URL="postgres://..." node functions/migrate.js
import pg from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../netlify/database/migrations/', import.meta.url);
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, at TIMESTAMPTZ DEFAULT now())');
const done = new Set((await c.query('SELECT name FROM _migrations')).rows.map(r => r.name));
for (const f of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
  if (done.has(f)) continue;
  await c.query('BEGIN'); try { await c.query(readFileSync(new URL(f, dir), 'utf8')); await c.query('INSERT INTO _migrations(name) VALUES($1)', [f]); await c.query('COMMIT'); console.log('applied', f); }
  catch (e) { await c.query('ROLLBACK'); console.error('FAILED', f, e.message); process.exit(1); }
}
console.log('database is up to date'); await c.end();
