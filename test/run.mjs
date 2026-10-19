// End-to-end API tests against a real local Postgres (PG_HOST/PG_PORT). Run: node test/run.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { createPool } from './pgmini.mjs';
import { createApp } from '../server/app.mjs';
import * as GAME from '../server/game.mjs';

const H = { host: process.env.PG_HOST || '127.0.0.1', port: Number(process.env.PG_PORT || 5433), user: 'postgres' };
const admin = createPool({ ...H, database: 'postgres' });
await admin.query('DROP DATABASE IF EXISTS plateclub_test WITH (FORCE)');
await admin.query('CREATE DATABASE plateclub_test');
const pool = createPool({ ...H, database: 'plateclub_test' });
const migDir = new URL('../netlify/database/migrations/', import.meta.url);
for (const f of readdirSync(migDir).sort()) await pool.query(readFileSync(new URL(f, migDir), 'utf8'));
// the older sections below were written for a 50 PLT welcome grant; the site default is now 100 (checked in section 1)
await pool.query(`INSERT INTO settings(key,value) VALUES('game','{"signupBonus":50}')`);

const mails = [];
const fakeFetch = async (url, opts) => {
  if (url.includes('resend')) { mails.push(JSON.parse(opts.body)); return new Response('{}', { status: 200 }); }
  if (url.includes('stripe')) return new Response(JSON.stringify({ id: 'cs_test_' + Math.random().toString(36).slice(2), url: 'https://checkout.stripe.test/x' }), { status: 200 });
  throw new Error('unexpected fetch ' + url);
};
const env = { RANK_CACHE_MS: '0', PLATE_SEAL_SECRET: 'x'.repeat(48), URL: 'https://plateclub.test', RESEND_API_KEY: 're_test', MAIL_FROM: 'Plate Club <hi@plateclub.test>', STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_test', ADMIN_SETUP_CODE: 'admin-code-for-tests-123', ADMIN_INITIAL_GRANT: '10000000', MARKET_BOT: 'off' };
const app = createApp({ pool, env, fetchImpl: fakeFetch });
const appNoMail = createApp({ pool, env: { PLATE_SEAL_SECRET: env.PLATE_SEAL_SECRET } });

let pass = 0, fail = 0;
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
function client(a = app) {
  let cookie = '';
  return {
    get cookie() { return cookie; }, set cookie(v) { cookie = v; },
    async call(method, path, body, headers = {}) {
      const r = await a(new Request('https://plateclub.test' + path, { method, headers: { 'content-type': 'application/json', cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }), { ip: '10.0.0.' + Math.floor(Math.random() * 200) });
      const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
      return { status: r.status, data: await r.json() };
    },
  };
}
const q1 = async (sql, p) => (await pool.query(sql, p)).rows;
async function topUp(c, pkg = 'plt3000') {
  const r = await c.call('POST', '/api/payments/checkout', { packageId: pkg, currency: 'EUR' });
  const [p] = await q1('SELECT provider_ref, amount_minor FROM payments WHERE id=$1', [r.data.paymentId]);
  const ev = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: p.provider_ref, payment_status: 'paid', amount_total: Number(p.amount_minor), currency: 'eur', metadata: { payment_id: r.data.paymentId } } } });
  const t = Math.floor(Date.now() / 1000); const sig = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${t}.${ev}`).digest('hex');
  const w = await app(new Request('https://plateclub.test/api/payments/webhook/stripe', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${sig}` }, body: ev }));
  return { checkout: r, webhook: w.status, paymentId: r.data.paymentId, ev, sig, t };
}

console.log('\n1. Config');
const cfg = (await client().call('GET', '/api/config')).data;
ok(cfg.cases.length === 49 && cfg.cases.some(c => c.until), '48 cases + the seasonal one'); ok(cfg.cases.every(c => c.rank && c.ru && c.color2) && cfg.achievements.every(a => a.reward >= 10 && a.reward <= 250) && Math.max(...cfg.achievements.map(a => a.reward)) === 250 && new Set(cfg.cases.map(c => c.color)).size === 49, 'every case has its own colour and a rarity');
{ const el = cfg.cases.filter(c => c.cat === 'elite'), rest = cfg.cases.filter(c => c.cat !== 'elite'); const maxRest = Math.max(...rest.map(c => c.price)); ok(el.length === 4 && el.every(c => c.odds[0] + c.odds[1] + c.odds[2] === 0) && el.filter(c => c.price >= 2 * maxRest).length >= 3, 'elite cases: only Elite/Grail, 2–3× the price of the rest', el.map(c => c.price)); } ok(cfg.payments.packages.length === 7 && cfg.payments.packages[0].plt === 100 && cfg.payments.packages.at(-1).plt === 20000, 'top-ups from 100 to 20 000 PLT');
ok(cfg.cases[0].name === 'Starter' && cfg.cases[0].price === 100 && cfg.cases.every(c => c.price >= 100), 'STARTER costs 100 PLT');
ok(cfg.cases.slice(1).every(c => c.price > 100), 'every other case costs more than STARTER', cfg.cases.map(c => c.price));
ok(cfg.cases.every(c => Math.abs(c.odds.reduce((a, b) => a + b, 0) - 100) < 1e-9), 'odds of every case add up to 100%');
ok(cfg.signupBonus === 50, 'welcome grant follows the admin setting');
{ const { SETTINGS_DEFAULT: SD } = await import('../server/game.mjs'); ok(SD.signupBonus === 100, 'by default every new player starts with 100 PLT'); }

console.log('\n2. Registration');
const A = client();
let r = await A.call('POST', '/api/auth/register', { email: 'bad', nickname: 'a', password: '1', terms: false });
ok(r.status === 400 && r.data.fields.email && r.data.fields.nickname && r.data.fields.password && r.data.fields.terms, 'invalid fields are reported one by one');
r = await A.call('POST', '/api/auth/register', { email: 'Anna@Example.com', nickname: 'Anna_77', password: 'correct horse', terms: true });
ok(r.status === 201 && r.data.bonus === 50, 'register returns 201 with 50 PLT', r);
ok(A.cookie.startsWith('pc_session='), 'session cookie set');
ok(mails.length === 1 && mails[0].to[0] === 'Anna@Example.com' && /\?verify=/.test(mails[0].text), 'confirmation email sent');
let me = (await A.call('GET', '/api/me')).data.user;
ok(me && me.balance === 50 && me.nickname === 'Anna_77' && me.verified === false, 'balance 50, email not yet confirmed', me);
const [pw] = await q1(`SELECT pass_hash FROM users WHERE nick_norm='anna_77'`);
ok(pw.pass_hash.startsWith('scrypt$') && !pw.pass_hash.includes('correct horse'), 'password stored as scrypt hash');
r = await client().call('POST', '/api/auth/register', { email: 'other@example.com', nickname: 'anna_77', password: 'whatever12', terms: true });
ok(r.status === 409 && /ник занят/i.test(r.data.error), 'taken nickname (any case) gives a clear error', r.data);
r = await client().call('POST', '/api/auth/register', { email: 'anna@example.COM', nickname: 'Anna2', password: 'whatever12', terms: true });
ok(r.status === 409 && /email уже есть/i.test(r.data.error), 'same email cannot register twice', r.data);
r = await client().call('GET', '/api/nickname?n=ANNA_77');
ok(r.data.available === false, 'nickname check endpoint sees taken name');
const vtok = mails[0].text.match(/verify=([\w-]+)/)[1];
r = await A.call('POST', '/api/auth/verify', { token: vtok });
ok(r.status === 200 && (await A.call('GET', '/api/me')).data.user.verified === true, 'email confirmed via link');
r = await A.call('POST', '/api/auth/verify', { token: vtok });
ok(r.status === 400, 'confirmation link works only once');

console.log('\n3. Session & one-time grant');
const A2 = client(); A2.cookie = A.cookie;
ok((await A2.call('GET', '/api/me')).data.user.nickname === 'Anna_77', 'session survives a page reload (cookie only)');
await A.call('POST', '/api/auth/logout', {});
ok((await A.call('GET', '/api/me')).data.user === null, 'logged out');
r = await A.call('POST', '/api/auth/login', { email: 'anna@example.com', password: 'wrong pass' });
ok(r.status === 401, 'wrong password refused');
r = await A.call('POST', '/api/auth/login', { email: 'ANNA@example.com', password: 'correct horse' });
ok(r.status === 200, 'login works (email case-insensitive)');
const D = client(); await D.call('POST', '/api/auth/login', { email: 'anna@example.com', password: 'correct horse' });
me = (await D.call('GET', '/api/me')).data.user;
ok(me.balance === 50, 'second device: still 50 PLT, no extra grant', me.balance);
const [bon] = await q1(`SELECT count(*) c FROM ledger l JOIN users u ON u.id=l.user_id WHERE u.nick_norm='anna_77' AND kind='signup_bonus'`);
ok(bon.c === '1', 'exactly one welcome grant in ledger');
let dup; try { await pool.query(`INSERT INTO ledger(id,user_id,kind,amount,balance_after,label) SELECT 'TX-DUP',id,'signup_bonus',50,100,'x' FROM users WHERE nick_norm='anna_77'`); } catch (e) { dup = e.code; }
ok(dup === '23505', 'database itself rejects a second welcome grant');

console.log('\n4. Starter needs more than the welcome grant');
r = await A.call('POST', '/api/cases/01/open', {});
ok(r.status === 402 && (await A.call('GET', '/api/me')).data.user.balance === 50, '50 PLT cannot open the 100 PLT STARTER; balance untouched');

console.log('\n5. Top-up (Stripe webhook simulated, signed)');
const tu = await topUp(A);
ok(tu.checkout.status === 200 && tu.checkout.data.url, 'checkout session created');
ok(tu.webhook === 200 && (await A.call('GET', '/api/me')).data.user.balance === 3050, 'webhook credits 3000 PLT once confirmed');
const replay = await app(new Request('https://plateclub.test/api/payments/webhook/stripe', { method: 'POST', headers: { 'stripe-signature': `t=${tu.t},v1=${tu.sig}` }, body: tu.ev }));
ok(replay.status === 200 && (await A.call('GET', '/api/me')).data.user.balance === 3050, 'replayed webhook does not credit twice');
const forged = await app(new Request('https://plateclub.test/api/payments/webhook/stripe', { method: 'POST', headers: { 'stripe-signature': `t=${tu.t},v1=${'0'.repeat(64)}` }, body: tu.ev }));
ok(forged.status === 400, 'webhook with a forged signature is rejected');
const w = (await A.call('GET', '/api/wallet')).data;
ok(w.payments[0].status === 'PAID' && w.ledger[0].kind === 'topup', 'payment status PAID and ledger entry shown');
ok((await client(appNoMail).call('GET', '/api/config')).data.payments.methods.length === 0, 'without provider keys no payment method is offered');

console.log('\n6. Case opening');
const ids = new Set(); let lastBal = 3050;
for (let i = 0; i < 8; i++) {
  r = await A.call('POST', '/api/cases/01/open', {});
  if (r.status !== 200) { ok(false, 'open #' + i, r); break; }
  ids.add(r.data.plate.id);
  ok(/^PC-[0-9A-F]{4}-[0-9A-F]{4}$/.test(r.data.plate.id) && r.data.balance === lastBal - 100, `open #${i + 1}: ${r.data.plate.id} ${r.data.plate.letters[0]}${r.data.plate.digits}${r.data.plate.letters.slice(1)} ${r.data.plate.region} (${r.data.plate.tier})`);
  lastBal = r.data.balance;
}
ok(ids.size === 8, 'all 8 plate IDs are unique');
const key = 'open-test-key-123';
const o1 = await A.call('POST', '/api/cases/01/open', {}, { 'idempotency-key': key });
const o2 = await A.call('POST', '/api/cases/01/open', {}, { 'idempotency-key': key });
ok(o1.data.plate.id === o2.data.plate.id && (await A.call('GET', '/api/me')).data.user.balance === lastBal - 100, 'retried request with same key charges once and returns same plate');
lastBal -= 100;
const par = await Promise.all([1, 2, 3].map(() => A.call('POST', '/api/cases/02/open', {})));
const paid = par.reduce((a, x) => a + (x.data.price || 0), 0);
ok(par.every(x => x.status === 200) && paid > 0 && (await A.call('GET', '/api/me')).data.user.balance === lastBal - paid, '3 parallel opens charge exactly 3 × price (' + paid + ')');
const [{ c: combos }] = await q1('SELECT count(DISTINCT combo) c FROM plates'); const [{ c: plates }] = await q1('SELECT count(*) c FROM plates');
ok(combos === plates, 'every combination exists once in the world');

console.log('\n7. Verification');
const myPlates = (await A.call('GET', '/api/collection')).data.plates;
const pid = myPlates[0].id;
r = await client().call('GET', '/api/verify/' + pid);
ok(r.data.verified === true && r.data.checks.every(c => c.ok), 'fresh plate VERIFIED (public, no login)', r.data);
r = await client().call('GET', '/api/verify/PC-0000-0000');
ok(r.data.verified === false && /Номера с таким ID/.test(r.data.reason), 'unknown ID → NOT VERIFIED');
r = await client().call('GET', '/api/verify/hello');
ok(r.data.verified === false, 'malformed ID → NOT VERIFIED');
await pool.query(`UPDATE plates SET tier='grail', value=6000 WHERE id=$1`, [myPlates[1].id]);
r = await client().call('GET', '/api/verify/' + myPlates[1].id);
ok(r.data.verified === false && r.data.checks.some(c => !c.ok), 'tampered rarity → NOT VERIFIED', r.data.checks);
const [B0] = await q1(`SELECT id FROM users LIMIT 1`);
await pool.query(`UPDATE plates SET owner_id=NULL WHERE id=$1`, [myPlates[2].id]);
r = await client().call('GET', '/api/verify/' + myPlates[2].id);
ok(r.data.verified === false, 'owner changed outside history → NOT VERIFIED');
await pool.query(`UPDATE plates SET owner_id=$1 WHERE id=$2`, [B0.id, myPlates[2].id]);
r = await client(appNoMail).call('GET', '/api/plates/' + pid);
ok(r.status === 200 && r.data.history[0].kind === 'MINTED' && r.data.plate.owner === 'Anna_77', 'plate page shows owner nickname and history');

console.log('\n8. Market');
const B = client(); await B.call('POST', '/api/auth/register', { email: 'boris@example.com', nickname: 'Boris', password: 'password123', terms: true }); await topUp(B, 'plt1200');
const C = client(); await C.call('POST', '/api/auth/register', { email: 'cleo@example.com', nickname: 'Cleo', password: 'password123', terms: true }); await topUp(C, 'plt1200');
r = await client().call('GET', '/api/market');
ok(r.data.listings.length === 0, 'market starts empty — no invented listings');
r = await B.call('POST', '/api/market/listings', { plateId: pid, price: 500 });
ok(r.status === 404, 'cannot list a plate you do not own');
r = await A.call('POST', '/api/market/listings', { plateId: pid, price: 500 });
const lid = r.data.listing.id; ok(r.status === 200 && r.data.listing.status === 'ACTIVE', 'owner lists plate: ACTIVE ' + lid);
r = await A.call('POST', '/api/market/listings', { plateId: pid, price: 400 });
ok(r.status === 409, 'cannot list the same plate twice');
r = await A.call('POST', '/api/plates/' + pid + '/bank', {});
ok(r.status === 409, 'listed plate cannot be sold to bank');
r = await A.call('PATCH', '/api/market/listings/' + lid, { price: 600 });
ok(r.status === 200, 'seller edits price to 600');
r = await B.call('POST', `/api/market/listings/${lid}/buy`, { expectedPrice: 500 });
ok(r.status === 409 && /изменил цену/.test(r.data.error), 'buyer with stale price is asked to confirm again');
r = await client().call('GET', '/api/market?q=' + encodeURIComponent(myPlates[0].digits));
ok(r.data.listings.some(l => l.id === lid) && !JSON.stringify(r.data).includes('@'), 'search finds listing; no emails exposed');
const balA = (await A.call('GET', '/api/me')).data.user.balance;
const race = await Promise.all([B.call('POST', `/api/market/listings/${lid}/buy`, { expectedPrice: 600 }), C.call('POST', `/api/market/listings/${lid}/buy`, { expectedPrice: 600 })]);
const wins = race.filter(x => x.status === 200); const losses = race.filter(x => x.status === 409);
ok(wins.length === 1 && losses.length === 1, 'two buyers at once: exactly one wins, the other gets “already sold”', race.map(x => [x.status, x.data.error]));
const winner = race[0].status === 200 ? B : C, loser = winner === B ? C : B;
ok((await winner.call('GET', '/api/me')).data.user.balance === 1250 - 600, 'winner charged 600 once');
ok((await loser.call('GET', '/api/me')).data.user.balance === 1250, 'loser not charged');
ok((await A.call('GET', '/api/me')).data.user.balance === balA + 570, 'seller receives 600 − 5% fee = 570');
r = await client().call('GET', '/api/plates/' + pid);
ok(r.data.plate.owner === (winner === B ? 'Boris' : 'Cleo') && r.data.plate.status === 'OWNED' && r.data.history.at(-1).kind === 'TRANSFERRED', 'ownership transferred with history');
ok((await client().call('GET', '/api/verify/' + pid)).data.verified === true, 'sold plate still VERIFIED for the new owner');
const [ls] = await q1('SELECT status FROM listings WHERE id=$1', [lid]); ok(ls.status === 'SOLD', 'listing status SOLD');
r = await client().call('GET', '/api/market/sales'); ok(r.data.sales.length === 1 && r.data.sales[0].price === 600, 'confirmed sale appears in sales feed');
r = await winner.call('POST', `/api/market/listings/${lid}/buy`, {}); ok(r.status === 409, 'sold listing cannot be bought again');
r = await A.call('GET', '/api/market/mine'); ok(r.data.trades[0].status === 'SOLD' && r.data.trades[0].role === 'seller', 'seller trade history');
const p2 = myPlates[3].id; r = await A.call('POST', '/api/market/listings', { plateId: p2, price: 99999 }); const lid2 = r.data.listing.id;
r = await loser.call('POST', `/api/market/listings/${lid2}/buy`, {}); ok(r.status === 402, 'buyer without enough PLT is refused');
ok((await client().call('GET', '/api/market')).data.listings.find(l => l.id === lid2), 'failed purchase leaves listing ACTIVE');
r = await A.call('DELETE', '/api/market/listings/' + lid2); ok(r.status === 200, 'seller cancels listing');
const [ls2] = await q1('SELECT status FROM listings WHERE id=$1', [lid2]); ok(ls2.status === 'CANCELLED', 'listing status CANCELLED');

console.log('\n9. Bank, profiles, rankings');
const before = (await A.call('GET', '/api/me')).data.user.balance; const val = myPlates[3].value;
r = await A.call('POST', '/api/plates/' + p2 + '/bank', {}); ok(r.status === 200 && r.data.balance === before + Math.round(val * 0.6), 'bank buys at 60%');
r = await A.call('POST', '/api/plates/' + p2 + '/bank', {}); ok(r.status === 404, 'cannot sell the same plate twice');
r = await client().call('GET', '/api/users/anna_77'); ok(r.status === 200 && !JSON.stringify(r.data).includes('@'), 'public profile shows nickname only, no email');
r = await client().call('GET', '/api/rankings'); ok(r.data.rankings.length >= 2, 'rankings from real collections');

console.log('\n10. Recovery');
r = await client(appNoMail).call('POST', '/api/auth/forgot', { email: 'anna@example.com' }); ok(r.status === 503, 'without email delivery the site says so instead of faking it');
mails.length = 0; r = await client().call('POST', '/api/auth/forgot', { email: 'anna@example.com' });
ok(r.status === 200 && mails.length === 1, 'reset email sent');
r = await client().call('POST', '/api/auth/forgot', { email: 'nobody@example.com' }); ok(r.status === 200 && mails.length === 1, 'unknown email gets the same answer (no account probing)');
const rt = mails[0].text.match(/reset=([\w-]+)/)[1];
const E = client(); r = await E.call('POST', '/api/auth/reset', { token: rt, password: 'brand new pass' }); ok(r.status === 200, 'password reset with link');
ok((await A2.call('GET', '/api/me')).data.user === null, 'old sessions are signed out after reset');
r = await client().call('POST', '/api/auth/login', { email: 'anna@example.com', password: 'brand new pass' }); ok(r.status === 200, 'login with new password');
r = await client().call('POST', '/api/auth/reset', { token: rt, password: 'again again' }); ok(r.status === 400, 'reset link works only once');

console.log('\n11. Request safety');
r = await app(new Request('https://plateclub.test/api/auth/logout', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })); ok(r.status === 415, 'non-JSON POST refused (CSRF guard)');
r = await client().call('POST', '/api/cases/01/open', {}); ok(r.status === 401, 'opening requires sign-in');


console.log('\n12. Admin');
const ADM = client(); await ADM.call('POST', '/api/auth/register', { email: 'owner@example.com', nickname: 'Owner', password: 'owner-pass-1', terms: true });
r = await ADM.call('GET', '/api/admin/overview'); ok(r.status === 403, 'regular account cannot open admin');
r = await ADM.call('POST', '/api/admin/claim', { code: 'wrong-code-wrong-code' }); ok(r.status === 403, 'wrong setup code refused');
r = await ADM.call('POST', '/api/admin/claim', { code: 'admin-code-for-tests-123' }); ok(r.status === 200 && r.data.granted === 10000000, 'correct code: admin + 10 000 000 PLT');
me = (await ADM.call('GET', '/api/me')).data.user; ok(me.role === 'admin' && me.balance === 10000050, 'admin role and balance 10 000 050', me.balance);
r = await ADM.call('POST', '/api/admin/claim', { code: 'admin-code-for-tests-123' }); ok(r.data.granted === 0 && (await ADM.call('GET', '/api/me')).data.user.balance === 10000050, 'claiming again gives no second grant');
{ const X = client(); await X.call('POST', '/api/auth/register', { email: 'intruder@example.com', nickname: 'Intruder', password: 'intruder-pass', terms: true });
  r = await X.call('POST', '/api/admin/claim', { code: 'admin-code-for-tests-123' }); ok(r.status === 403 && (await X.call('GET', '/api/me')).data.user.role !== 'admin', 'setup code is dead once the site has an admin (leaked code is useless)');
  r = await X.call('POST', '/api/auth/logout', {}, { origin: 'https://evil.example' }); ok(r.status === 403, 'cross-site write (foreign Origin) refused');
  r = await X.call('POST', '/api/auth/logout', {}, { origin: 'https://plateclub.test' }); ok(r.status === 200, 'same-site write accepted'); }
{ const Y = client(); await Y.call('POST', '/api/auth/register', { email: 'pw@example.com', nickname: 'PwUser', password: 'first-pass-1', terms: true });
  const Y2 = client(); await Y2.call('POST', '/api/auth/login', { email: 'pw@example.com', password: 'first-pass-1' });
  r = await Y.call('GET', '/api/auth/sessions'); ok(r.data.active === 2, 'two active sessions', r.data);
  r = await Y.call('POST', '/api/auth/password', { current: 'wrong', password: 'second-pass-2' }); ok(r.status === 403, 'password change needs the current password');
  r = await Y.call('POST', '/api/auth/password', { current: 'first-pass-1', password: 'second-pass-2' }); ok(r.status === 200, 'password changed');
  ok((await Y.call('GET', '/api/me')).data.user && !(await Y2.call('GET', '/api/me')).data.user, 'this device stays signed in, other device signed out');
  r = await Y.call('POST', '/api/auth/login', { email: 'pw@example.com', password: 'second-pass-2' }); ok(r.status === 200, 'new password works');
  r = await Y.call('POST', '/api/auth/logout-others', {}); ok(r.data.closed >= 1 && (await Y.call('GET', '/api/me')).data.user, 'sign out other devices'); }
{ const Z = client(); await Z.call('POST', '/api/auth/register', { email: 'helper@example.com', nickname: 'Helper', password: 'helper-pass-1', terms: true });
  const zid = (await Z.call('GET', '/api/me')).data.user.id;
  r = await Z.call('POST', `/api/admin/users/${zid}/role`, { admin: true, password: 'helper-pass-1' }); ok(r.status === 403, 'a player cannot make themselves admin');
  r = await ADM.call('POST', `/api/admin/users/${zid}/role`, { admin: true, password: 'wrong' }); ok(r.status === 403, 'appointing an admin needs the admin password');
  r = await ADM.call('POST', `/api/admin/users/${zid}/role`, { admin: true, password: 'owner-pass-1' }); ok(r.status === 200 && (await Z.call('GET', '/api/me')).data.user.role === 'admin', 'admin appoints a helper admin');
  r = await ADM.call('POST', `/api/admin/users/${zid}/role`, { admin: false, password: 'owner-pass-1' }); ok(r.status === 200 && !(await Z.call('GET', '/api/me')).data.user, 'removed admin is signed out everywhere'); }
r = await ADM.call('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'whatever-1' }, { 'x-lang': 'en' }); ok(r.data.error === 'Wrong email or password.', 'errors come in English for x-lang: en', r.data);
r = await client().call('GET', '/api/online'); ok(r.status === 200 && r.data.count >= 1 && r.data.players.includes('Owner'), 'online list shows recently active players', r.data);
{ const before = (await ADM.call('GET', '/api/me')).data.user.balance; const ADM2 = createApp({ pool, env: { ...env, ADMIN_INITIAL_GRANT: '50000000' } });
  const c2 = client(ADM2); c2.cookie = ADM.cookie; const m1 = (await c2.call('GET', '/api/me')).data.user.balance; const m2 = (await c2.call('GET', '/api/me')).data.user.balance;
  ok(m1 === before && m2 === before, 'owner grant is not paid twice (already paid at claim)', [before, m1, m2]); }
{ const T = client(); await T.call('POST', '/api/auth/register', { email: 'tg@example.com', nickname: 'TgUser', password: 'tg-pass-123', terms: true });
  const b0 = (await T.call('GET', '/api/me')).data.user.balance;
  r = await T.call('POST', '/api/perks/telegram', {}); ok(r.status === 200 && r.data.amount === 500 && r.data.balance === b0 + 500, 'Telegram chat reward +500 PLT', r.data);
  r = await T.call('POST', '/api/perks/telegram', {}); ok(r.status === 409, 'Telegram reward only once');
  ok((await T.call('GET', '/api/perks')).data.telegram === true, 'perks remember the Telegram reward'); }
console.log('\n12b. Referrals and quests');
{ const INV = client(); await INV.call('POST', '/api/auth/register', { email: 'inviter@example.com', nickname: 'Inviter', password: 'invite-pass-1', terms: true });
  const ref = (await INV.call('GET', '/api/referral')).data;
  ok(/^[A-Z0-9]{6}$/.test(ref.code) && ref.link.endsWith('/i/Inviter'), 'every player has their own invite link', ref.link);
  ok((await INV.call('GET', '/api/referral')).data.code === ref.code, 'the invite code never changes');
  const invSu = (await INV.call('GET', '/api/me')).data.user.balance;
  const FR = client(); await FR.call('POST', '/api/auth/register', { email: 'friend@example.com', nickname: 'Friend', password: 'friend-pass-1', terms: true, ref: ref.code });
  ok((await INV.call('GET', '/api/me')).data.user.balance === invSu, 'a bare registration pays the inviter nothing', (await INV.call('GET', '/api/me')).data.user.balance - invSu);
  ok((await FR.call('GET', '/api/me')).data.user.balance >= 500, 'invited friend gets an extra welcome bonus', (await FR.call('GET', '/api/me')).data.user.balance);
  await q1(`UPDATE users SET balance=100000 WHERE nick_norm IN ('friend','inviter')`);
  const invBefore = (await INV.call('GET', '/api/me')).data.user.balance;
  for (let i = 0; i < 2; i++) await FR.call('POST', '/api/cases/01/open', {});
  ok((await INV.call('GET', '/api/me')).data.user.balance === invBefore + 1000, 'inviter gets +1000 PLT when the friend opens the first case', (await INV.call('GET', '/api/me')).data.user.balance - invBefore);
  const frBefore = (await FR.call('GET', '/api/me')).data.user.balance;
  r = await FR.call('POST', '/api/cases/01/open', {});
  ok((await INV.call('GET', '/api/me')).data.user.balance === invBefore + 3000, 'inviter gets 2000 PLT more on the 3rd case', (await INV.call('GET', '/api/me')).data.user.balance - invBefore);
  ok((await FR.call('GET', '/api/me')).data.user.balance === frBefore - r.data.price + 500, 'friend gets 500 PLT too');
  for (let i = 0; i < 2; i++) await FR.call('POST', '/api/cases/01/open', {});
  ok((await INV.call('GET', '/api/me')).data.user.balance === invBefore + 3000, 'referral is paid only once per friend');
  const st = (await INV.call('GET', '/api/referral')).data;
  ok(st.joined === 1 && st.active === 1 && st.earned === 3000, 'invite page shows friends and earnings', st);
  ok(st.link.endsWith('/i/Inviter') && st.codeLink.includes('?ref=' + st.code), 'pretty invite link uses the nickname', st.link);
  ok(st.milestones.length === 5 && st.next[0] === 3, 'milestones are shown with the next target', st.next);
  { const F2 = client(); await F2.call('POST', '/api/auth/register', { email: 'byname@example.com', nickname: 'ByName', password: 'byname-pass-1', terms: true, ref: 'inviter' });
    await q1(`UPDATE users SET balance=100000 WHERE nick_norm='byname'`);
    const before = (await INV.call('GET', '/api/me')).data.user.balance;
    for (let i = 0; i < 3; i++) await F2.call('POST', '/api/cases/01/open', {});
    ok((await INV.call('GET', '/api/me')).data.user.balance === before + 3000, 'a nickname works as an invite code too'); }

  r = await FR.call('POST', '/api/quests', { kind: 'story', url: 'not a link', handle: '@friend' }); ok(r.status === 400, 'quest needs a real link');
  r = await FR.call('POST', '/api/quests', { kind: 'story', url: 'https://instagram.com/stories/friend/1', handle: '' }); ok(r.status === 400, 'quest needs the player account');
  r = await FR.call('POST', '/api/quests', { kind: 'story', url: 'https://instagram.com/stories/friend/1', handle: '@friend' }); const qid = r.data.id;
  ok(r.status === 200 && qid, 'story quest submitted');
  r = await FR.call('POST', '/api/quests', { kind: 'story', url: 'https://instagram.com/stories/friend/1', handle: '@friend' }); ok(r.status === 409, 'the same link cannot be sent twice');
  ok((await FR.call('GET', '/api/quests')).data.quests[0].status === 'PENDING', 'player sees the request as pending');
  r = await FR.call('GET', '/api/admin/quests'); ok(r.status === 403, 'players cannot see the review queue');
  r = await ADM.call('GET', '/api/admin/quests'); ok(r.data.pending >= 1 && r.data.quests.some(x => x.id === qid), 'admin sees the queue', r.data.pending);
  const fb = (await FR.call('GET', '/api/me')).data.user.balance;
  r = await ADM.call('POST', '/api/admin/quests/' + qid, { approve: true }); ok(r.status === 200 && r.data.amount === 5000, 'approved story pays 5000 PLT', r.data);
  ok((await FR.call('GET', '/api/me')).data.user.balance === fb + 5000, 'the 5000 PLT really arrived');
  r = await ADM.call('POST', '/api/admin/quests/' + qid, { approve: true }); ok(r.status === 409, 'a request is reviewed once');
  r = await FR.call('POST', '/api/quests', { kind: 'tiktok', url: 'https://tiktok.com/@friend/video/1', handle: '@friend' }); const tid = r.data.id;
  const fb2 = (await FR.call('GET', '/api/me')).data.user.balance;
  r = await ADM.call('POST', '/api/admin/quests/' + tid, { approve: true, views: 12345 });
  ok(r.data.amount === 12345 && (await FR.call('GET', '/api/me')).data.user.balance === fb2 + 12345, 'TikTok pays 1 PLT per view', r.data);
  r = await FR.call('POST', '/api/quests', { kind: 'tiktok', url: 'https://tiktok.com/@friend/video/2', handle: '@friend' }); const tid2 = r.data.id;
  r = await ADM.call('POST', '/api/admin/quests/' + tid2, { approve: true, views: 9_000_000 }); ok(r.data.amount === 50000, 'TikTok pay-out is capped per video', r.data);
  r = await FR.call('POST', '/api/quests', { kind: 'tiktok', url: 'https://tiktok.com/@friend/video/3', handle: '@friend' }); const tid3 = r.data.id;
  r = await ADM.call('POST', '/api/admin/quests/' + tid3, { approve: false, reason: 'нет отметки сайта' });
  ok(r.data.status === 'REJECTED' && (await FR.call('GET', '/api/quests')).data.quests[0].reason === 'нет отметки сайта', 'rejection reason reaches the player'); }
r = await ADM.call('GET', '/api/admin/overview'); ok(r.status === 200 && r.data.overview.users >= 4 && r.data.log.length >= 1, 'overview and audit log');
r = await ADM.call('GET', '/api/admin/users?q=bor'); ok(r.data.users.length === 1 && r.data.users[0].nickname === 'Boris', 'user search');
const bBefore = (await B.call('GET', '/api/me')).data.user.balance;
r = await ADM.call('POST', '/api/admin/grant', { nickname: 'boris', amount: 777, reason: 'Contest prize' }); ok(r.status === 200 && (await B.call('GET', '/api/me')).data.user.balance === bBefore + 777, 'admin grants 777 PLT to Boris');
ok((await B.call('GET', '/api/wallet')).data.ledger[0].label.includes('Contest prize'), 'player sees the grant and its reason');
r = await ADM.call('POST', '/api/admin/grant', { nickname: 'boris', amount: -99999999, reason: 'x' }); ok(r.status === 409, 'cannot push a balance below zero');
r = await ADM.call('POST', '/api/admin/grant', { nickname: 'boris', amount: 5, reason: '' }); ok(r.status === 400, 'reason is required');
r = await B.call('POST', '/api/admin/grant', { nickname: 'boris', amount: 5, reason: 'self' }); ok(r.status === 403, 'non-admin cannot grant');
await A.call('POST', '/api/auth/login', { email: 'anna@example.com', password: 'brand new pass' });
let pl3; for (const p of (await A.call('GET', '/api/collection')).data.plates.filter(p => !p.listing)) { if ((await client().call('GET', '/api/verify/' + p.id)).data.verified) { pl3 = p; break; } }
const L3 = (await A.call('POST', '/api/market/listings', { plateId: pl3.id, price: 1234 })).data.listing.id;
r = await ADM.call('POST', `/api/admin/listings/${L3}/remove`, { reason: 'Price spam' }); ok(r.status === 200, 'admin removes a listing');
ok((await client().call('GET', '/api/market')).data.listings.every(l => l.id !== L3), 'removed listing is gone from the market');
ok((await client().call('GET', '/api/verify/' + pl3.id)).data.verified === true, 'plate stays VERIFIED after admin removal');

// fee goes to the admin treasury
const pl4 = (await A.call('GET', '/api/collection')).data.plates.find(p => !p.listing);
const L4 = (await A.call('POST', '/api/market/listings', { plateId: pl4.id, price: 1000 })).data.listing.id;
const admBefore = (await ADM.call('GET', '/api/me')).data.user.balance, aBefore = (await A.call('GET', '/api/me')).data.user.balance;
r = await B.call('POST', `/api/market/listings/${L4}/buy`, { expectedPrice: 1000 });
ok(r.status === 200, 'sale after admin exists', r);
ok((await ADM.call('GET', '/api/me')).data.user.balance === admBefore + 50, '5% fee (50 PLT) credited to the admin account');
ok((await A.call('GET', '/api/me')).data.user.balance === aBefore + 950, 'seller receives 950');
ok((await ADM.call('GET', '/api/wallet')).data.ledger[0].kind === 'market_fee', 'fee shows in the admin ledger');
ok((await ADM.call('GET', '/api/admin/overview')).data.overview.fees === 50, 'overview counts fees received');

console.log('\n13. Belarus plates, deals, odds');
const deals = cfg.deals; ok(deals.length === 3 && deals.map(d => d.pct).join() === '5,7,10' && deals.every(d => d.price < d.was), 'three daily deals at 5/7/10% off', deals);
const dc = deals[0]; const before13 = (await A.call('GET', '/api/me')).data.user.balance;
r = await A.call('POST', `/api/cases/${dc.id}/open`, {});
ok(r.status === 200 && r.data.price === dc.price && (await A.call('GET', '/api/me')).data.user.balance === before13 - dc.price, `deal case ${dc.id} charged ${dc.price} instead of ${dc.was}`);
const byc = cfg.cases.find(c => c.id === '12');
let byPlates = [];
for (let i = 0; i < 4; i++) { const x = await A.call('POST', '/api/cases/12/open', {}); if (x.status === 200) byPlates.push(x.data.plate); }
ok(byPlates.length === 4 && byPlates.every(p => p.country === 'BY' && /^\d{4}$/.test(p.digits) && /^[ABEIKMHOPCTX]{2}$/.test(p.letters) && p.region === '7'), 'Minsk case gives Belarusian plates 1234 AB-7', byPlates.map(p => `${p.digits} ${p.letters}-${p.region}`));
r = await client().call('GET', '/api/verify/' + byPlates[0].id); ok(r.data.verified === true, 'Belarusian plate VERIFIED');
r = await client().call('GET', '/api/market?group=by'); ok(r.status === 200, 'market filter by Belarus works');
const { genPlate, drawTier, CASES: CS, plateValue: pv } = await import('../server/game.mjs');
const st = CS.find(c => c.id === '01'); const cnt = { common: 0, fine: 0, rare: 0, elite: 0, grail: 0 }; for (let i = 0; i < 20000; i++) cnt[drawTier(st.odds)]++;
ok(cnt.rare / 20000 < 0.05 && (cnt.elite + cnt.grail) / 20000 < 0.008, 'STARTER: rare+ is uncommon (' + JSON.stringify(cnt) + ')');
ok(pv({ tier: 'rare', region: '7', country: 'BY', digits: '1221' }) < pv({ tier: 'rare', region: '66', country: 'RU', digits: '121' }), 'Belarusian plates are cheaper than Russian of the same tier');

console.log('\n14. Two copies, promo codes, perks');
const mine14 = (await A.call('GET', '/api/collection')).data.plates;
ok(mine14.every(p => p.copy === 1 || p.copy === 2), 'every plate carries its copy number');
const sample = mine14[0]; const [srow] = await q1('SELECT combo FROM plates WHERE id=$1', [sample.id]);
await q1(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,seal,country,copy) SELECT 'PC-AAAA-0002',letters,digits,region,combo,tier,pattern,value,owner_id,'OWNED','test','x',country,2 FROM plates WHERE id=$1`, [sample.id]).catch(e => console.log('INS', e.message));
let third = 'inserted'; try { await q1(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,seal,country,copy) SELECT 'PC-AAAA-0003',letters,digits,region,combo,tier,pattern,value,owner_id,'OWNED','test','x',country,3 FROM plates WHERE id=$1`, [sample.id]); } catch { third = 'rejected'; }
ok(third === 'rejected', 'a third copy of a combination is rejected by the database');
const [c2] = await q1('SELECT count(*)::int AS c FROM plates WHERE combo=$1', [srow.combo]); ok(Number(c2.c) === 2, 'exactly two copies exist', c2);
await q1(`DELETE FROM plates WHERE id='PC-AAAA-0002'`);
const P14 = client(); await P14.call('POST', '/api/auth/register', { email: 'promo@example.com', nickname: 'promo_user', password: 'promo pass 1', terms: true });
const b14 = (await P14.call('GET', '/api/me')).data.user.balance;
r = await P14.call('POST', '/api/promo/redeem', { code: 'plateclub' }); ok(r.status === 200 && r.data.amount === 10 && r.data.balance === b14 + 10, 'promo PLATECLUB gives 10 PLT', r.data);
r = await P14.call('POST', '/api/promo/redeem', { code: 'PLATECLUB' }); ok(r.status === 409, 'same promo cannot be used twice');
r = await P14.call('POST', '/api/promo/redeem', { code: 'NOPE123' }); ok(r.status === 404, 'unknown promo is rejected');
r = await ADM.call('POST', '/api/admin/promos', { code: 'vip500', amount: 500, maxUses: 1, days: 7, note: 'VIP' }); ok(r.status === 200 && r.data.code === 'VIP500', 'admin creates a promo code', r.data);
r = await P14.call('POST', '/api/promo/redeem', { code: 'VIP500' }); ok(r.status === 200 && r.data.amount === 500, 'new promo works');
r = await B.call('POST', '/api/promo/redeem', { code: 'VIP500' }); ok(r.status === 410, 'promo with max 1 use is exhausted');
r = await ADM.call('POST', '/api/admin/promos/LUCKY7/toggle', {}); ok(r.status === 200 && r.data.active === false, 'admin disables a promo', r);
r = await P14.call('POST', '/api/promo/redeem', { code: 'LUCKY7' }); ok(r.status === 404, 'disabled promo is rejected');
ok((await ADM.call('GET', '/api/admin/promos')).data.promos.length >= 4, 'admin lists promos');
r = await B.call('POST', '/api/admin/promos', { code: 'HACK', amount: 9 }); ok(r.status === 403, 'non-admin cannot create promos');
r = await P14.call('GET', '/api/perks'); ok(r.status === 200 && r.data.daily.claimed === false && r.data.daily.amount === 10 && r.data.daily.ladder.join() === '10,20,50,75,100', 'daily bonus ladder 10→20→50→75→100, today 10', r.data.daily);
const db1 = await Promise.all([P14.call('POST', '/api/perks/daily', {}), P14.call('POST', '/api/perks/daily', {})]);
ok(db1.filter(x => x.status === 200).length === 1, 'daily bonus is paid once even with parallel clicks', db1.map(x => x.status));
const [u14] = await q1(`SELECT id FROM users WHERE nick_norm='promo_user'`);
await q1(`UPDATE ledger SET ref='D' || (floor(extract(epoch from now())/86400)::int - 1) WHERE user_id=$1 AND kind='daily_bonus'`, [u14.id]);
r = await P14.call('POST', '/api/perks/daily', {}); ok(r.status === 200 && r.data.streak === 2 && r.data.amount === 20, 'day 2 of the streak gives 20 PLT', r.data);
r = await P14.call('POST', '/api/perks/achievements/first/claim', {}); ok(r.status === 409, 'cannot claim an unfinished achievement');
await P14.call('POST', '/api/cases/01/open', {});
r = await P14.call('POST', '/api/perks/achievements/first/claim', {}); ok(r.status === 200 && r.data.amount === 10, 'first achievement reward (10 PLT) paid after the condition is met');
r = await P14.call('POST', '/api/perks/achievements/first/claim', {}); ok(r.status === 409, 'achievement reward only once');
const pk = (await P14.call('GET', '/api/perks')).data; ok(pk.achievements.find(a => a.id === 'first').claimed === true, 'perks show the claimed reward');

console.log('\n15. Levels, upgrade, rankings');
const U = client(); await U.call('POST', '/api/auth/register', { email: 'up@example.com', nickname: 'upgrader', password: 'upgrade pass', terms: true });
const [uu] = await q1(`SELECT id FROM users WHERE nick_norm='upgrader'`); await q1('UPDATE users SET balance=50000 WHERE id=$1', [uu.id]);
for (let i = 0; i < 12; i++) await U.call('POST', '/api/cases/01/open', {});
let me15 = (await U.call('GET', '/api/me')).data.user; ok(me15.level.level === 3 && me15.level.xp === 1200, 'XP = PLT spent on cases, 1200 XP → level 3 (slow curve)', me15.level);
r = await U.call('GET', '/api/perks'); ok(r.data.level.unclaimed === 2, '2 level rewards waiting', r.data.level);
r = await U.call('POST', '/api/perks/level/claim', {}); ok(r.status === 200 && r.data.amount === 20, 'level rewards: 10 PLT per level', r.data);
r = await U.call('POST', '/api/perks/level/claim', {}); ok(r.status === 409, 'level rewards are paid once');
const upgradeChanceOf = (v, ps) => { const g = GAME; const top = ps.reduce((a, b) => (a.value >= b.value ? a : b)); return g.upgradeChance(v, g.targetValue(top, 'rare')); };
let up = (await U.call('GET', '/api/collection')).data.plates.filter(p => p.tier === 'common' || p.tier === 'fine');
r = await U.call('POST', '/api/upgrade', { plateId: up[0].id, target: up[0].tier }); ok(r.status === 400, 'target must be rarer than the plate');
r = await B.call('POST', '/api/upgrade', { plateId: up[0].id, target: 'grail' }); ok(r.status === 404, 'cannot upgrade someone else’s plate');
let uwins = 0, ulosses = 0, chanceOk = true;
for (const p of up.slice(0, 8)) {
  const x = await U.call('POST', '/api/upgrade', { plateId: p.id, target: 'rare' });
  if (x.status !== 200) { chanceOk = false; continue; }
  if (x.data.success !== (x.data.roll < x.data.chance)) chanceOk = false;
  if (x.data.success) { uwins++; if (!(x.data.plate && x.data.plate.tier === 'rare' && x.data.plate.region === p.region)) chanceOk = false; } else ulosses++;
  const v = (await client().call('GET', '/api/verify/' + p.id)).data; if (!(v.verified === true)) chanceOk = false;
}
ok(chanceOk && uwins + ulosses === Math.min(8, up.length), `upgrades follow the server roll, keep region, burned plate stays verifiable (${uwins} won / ${ulosses} lost)`);
{ const two = (await U.call('GET', '/api/collection')).data.plates.filter(p => p.tier === 'common' && !p.listing).slice(0, 2);
  if (two.length === 2) {
    const x = await U.call('POST', '/api/upgrade', { plateIds: two.map(p => p.id), target: 'rare' });
    const single = upgradeChanceOf(Math.max(two[0].value, two[1].value), two);
    ok(x.status === 200 && x.data.burnedAll.length === 2 && x.data.chance >= single, 'two plates together give a bigger chance', [x.data.chance, single]);
    const c = (await U.call('GET', '/api/collection')).data.plates; ok(!c.some(p => two.some(t => t.id === p.id)), 'both plates are burned');
  }
  const three = (await U.call('GET', '/api/collection')).data.plates.filter(p => p.tier === 'common').slice(0, 3);
  if (three.length === 3) { const x = await U.call('POST', '/api/upgrade', { plateIds: three.map(p => p.id), target: 'rare' }); ok(x.status === 400, 'no more than 2 plates per upgrade'); } }
const again = await U.call('POST', '/api/upgrade', { plateId: up[0].id, target: 'rare' }); ok(again.status === 404, 'a burned plate cannot be upgraded again');
ok(!(await U.call('GET', '/api/collection')).data.plates.some(p => p.id === up[0].id), 'burned plate leaves the collection');
const { upgradeChance, targetValue: tv } = await import('../server/game.mjs');
ok(upgradeChance(60, 220) > 0.2 && upgradeChance(60, 220) < 0.3 && upgradeChance(20, 6000) < 0.01 && upgradeChance(900, 220) === 0.75, 'chance = 90% × value ratio, between 1% and 75%');
r = await client().call('GET', '/api/market?group=ru'); ok(r.status === 200 && r.data.listings.every(l => l.plate.country === 'RU'), 'market filter: Russia only');
r = await client().call('GET', '/api/drops'); ok(r.status === 200 && r.data.drops.every(d => ['rare', 'elite', 'grail'].includes(d.plate.tier) && d.nickname), 'live drops: only rare+ plates with their owner', r.data.drops.length);
r = await client().call('GET', '/api/upgrade/recent'); ok(r.status === 200 && r.data.upgrades.length >= 1 && r.data.upgrades.every(g => typeof g.success === 'boolean' && g.nickname === 'upgrader'), 'recent upgrades feed', r.data.upgrades[0]);
const rk = (await client().call('GET', '/api/rankings')).data.rankings;
ok(rk.length > 0 && rk.every((x, i) => i === 0 || rk[i - 1].total >= x.total), 'rankings: by account value', rk.slice(0, 3));
{ const all = (await client().call('GET', '/api/rankings?by=total')).data; const own = all.rankings.find(x => x.nickname === 'Owner');
  const adm = (await ADM.call('GET', '/api/me')).data.user;
  ok(!own || (own.balance < adm.balance && !('role' in own)), 'admin appears like a normal player: no role shown, admin grants not counted', own); }
ok(rk.every(x => x.total === x.balance + x.value && x.level >= 1), 'account value = balance + plates');

console.log('\n16. Values v2 keep old plates valid');
{ const [pl] = await q1(`SELECT p.id,p.combo,p.tier,p.pattern,p.region,p.country,p.digits,(SELECT tx_id FROM plate_events e WHERE e.plate_id=p.id AND e.kind='MINTED' ORDER BY id LIMIT 1) AS mtx FROM plates p WHERE p.status='OWNED' AND p.tier='rare' LIMIT 1`);
  if (pl) { const { plateValue: pv1 } = await import('../server/game.mjs'); const v1 = pv1({ ...pl, vv: 1 }); const sealV1 = createHmac('sha256', env.PLATE_SEAL_SECRET).update(['seal', pl.id, pl.combo, pl.tier, pl.pattern, v1, pl.mtx].join('|')).digest('hex');
    await q1('UPDATE plates SET vv=1, value=$1, seal=$2 WHERE id=$3', [v1, sealV1, pl.id]);
    const v = (await client().call('GET', '/api/verify/' + pl.id)).data; ok(v.verified === true && v1 < pv1(pl), 'a plate minted with v1 values still verifies; new rare plates are worth more', { v1, v2: pv1(pl) }); }
  else ok(true, 'no rare plate to check'); }

console.log('\n17. Market ecosystem: market maker, bargains, dealer, profit tracking');
{
  let T = 0; const appBot = createApp({ pool, env: { ...env, MARKET_BOT: 'on' }, fetchImpl: fakeFetch, now: () => Date.now() + T });
  const MB = client(appBot);
  await MB.call('POST', '/api/auth/register', { email: 'trader@plateclub.test', nickname: 'trader1', password: 'correct horse 1', terms: true });
  await topUp(MB, 'plt7500');
  let m = (await MB.call('GET', '/api/market?who=market')).data.listings;
  ok(m.length >= 10 && m.every(l => l.bot && l.seller === 'PlateClubMarket'), 'market maker stocks the market with its own lots', m.length);
  ok(m.every(l => l.price >= Math.floor(l.plate.value * 0.84) && l.price <= Math.ceil(l.plate.value * 1.45)), 'market-maker prices stay within 84–145% of the estimate');
  const vv = await Promise.all(m.slice(0, 3).map(l => client().call('GET', '/api/verify/' + l.plate.id))); ok(vv.every(x => x.data.verified === true), 'market-maker plates are VERIFIED');
  for (let i = 0; i < 4; i++) { T += 30000; await MB.call('GET', '/api/market'); }
  const [{ c: stocked }] = await q1(`SELECT count(*)::int AS c FROM listings l JOIN users u ON u.id=l.seller_id WHERE u.role='bot' AND l.status='ACTIVE'`);
  ok(Number(stocked) === 60, 'market maker keeps 60 lots on sale', stocked);
  const d = (await MB.call('GET', '/api/market?sort=deal')).data.listings; ok(d.every((l, i) => i === 0 || d[i - 1].price / d[i - 1].plate.value <= l.price / l.plate.value + 1e-9), 'sort=deal: best price-to-estimate first');
  const dl = (await MB.call('GET', '/api/market?deals=1')).data.listings; ok(dl.every(l => l.price < l.plate.value), 'deals filter: only lots below the estimate');
  const st = (await MB.call('GET', '/api/market/stats')).data; ok(st.active >= 60 && typeof st.ratio === 'number', 'market stats', st);
  const pick = d[0]; let x = await MB.call('POST', '/api/market/listings/' + pick.id + '/buy', { expectedPrice: pick.price }, { 'idempotency-key': 'mb-key-0001' });
  ok(x.status === 200, 'player buys a market-maker lot', x.data);
  let col = (await MB.call('GET', '/api/collection')).data.plates; const got = col.find(p => p.id === pick.plate.id);
  ok(got && got.paid === pick.price && Array.isArray(got.traits), 'collection remembers what was paid (for profit tracking)', got);
  await q1(`UPDATE listings SET updated_at = now() - interval '2 hours' WHERE seller_id=(SELECT id FROM users WHERE role='bot') AND status='ACTIVE'`);
  const before = Object.fromEntries((await q1(`SELECT l.id,l.price,p.value FROM listings l JOIN plates p ON p.id=l.plate_id JOIN users u ON u.id=l.seller_id WHERE u.role='bot' AND l.status='ACTIVE'`)).map(r => [r.id, r]));
  T += 30000; await MB.call('GET', '/api/market');
  const after = await q1(`SELECT l.id,l.price,p.value FROM listings l JOIN plates p ON p.id=l.plate_id WHERE l.id = ANY($1::text[])`, ['{' + Object.keys(before).join(',') + '}']);
  ok(after.some(r => Number(r.price) < Number(before[r.id].price)) && after.every(r => Number(r.price) >= Math.ceil(Number(r.value) * 0.82) || Number(r.price) === Number(before[r.id].price)), 'unsold lots get cheaper over time, never below 82% of the estimate');
  const dem = (await MB.call('GET', '/api/dealer')).data; ok(dem.demands.length === 3 && dem.perDay === 3 && dem.rate === 1.15, 'dealer publishes three demands a day');
  const { matchesDemand } = await import('../server/game.mjs');
  let match = null; for (let i = 0; i < 40 && !match; i++) { const o = await MB.call('POST', '/api/cases/01/open', {}); const p = o.data.plate; if (p && dem.demands.some(dd => matchesDemand(p, dd))) match = p; }
  if (match) {
    const bal0 = (await MB.call('GET', '/api/me')).data.user.balance;
    x = await MB.call('POST', '/api/dealer/sell', { plateId: match.id }, { 'idempotency-key': 'dl-key-0001' });
    ok(x.status === 200 && x.data.amount === Math.round(match.value * 1.15) && x.data.balance === bal0 + x.data.amount, 'dealer pays 115% of the estimate', x.data);
    const v = (await client().call('GET', '/api/verify/' + match.id)).data; ok(v.verified === true && v.plate.owner === 'PlateClubMarket', 'sold plate moves to the market maker and stays VERIFIED');
  } else ok(true, 'no matching plate in 40 openings (skipped)');
  const non = (await MB.call('GET', '/api/collection')).data.plates.find(p => !dem.demands.some(dd => matchesDemand(p, dd)) && p.status === 'OWNED');
  if (non) { x = await MB.call('POST', '/api/dealer/sell', { plateId: non.id }, { 'idempotency-key': 'dl-key-0002' }); ok(x.status === 409, 'dealer refuses plates that are not in demand'); }
  const [tu] = await q1(`SELECT id,balance FROM users WHERE nick_norm='trader1'`);
  for (let i = 0; i < 3; i++) await q1(`INSERT INTO ledger(id,user_id,kind,amount,balance_after,label) VALUES($1,$2,'dealer_sell',0,$3,'test')`, ['TX-T' + i, tu.id, tu.balance]);
  const any = (await MB.call('GET', '/api/collection')).data.plates.find(p => p.status === 'OWNED');
  x = await MB.call('POST', '/api/dealer/sell', { plateId: any.id }, { 'idempotency-key': 'dl-key-0003' }); ok(x.status === 409, 'dealer buys at most 3 plates a day per player');
  const rk2 = (await client().call('GET', '/api/rankings')).data.rankings; ok(!rk2.some(r => r.nickname === 'PlateClubMarket'), 'market maker is not ranked');
  x = await client().call('POST', '/api/auth/login', { email: 'market@plateclub.invalid', password: 'locked' }); ok(x.status === 401, 'nobody can sign in as the market maker');
  const { CASES: C3, plateValue: pv3, plateTraits } = await import('../server/game.mjs');
  ok(pv3({ tier: 'common', region: '66', country: 'RU', digits: '345', letters: 'АМР', vv: 3 }) === 2 * pv3({ tier: 'common', region: '66', country: 'RU', digits: '345', letters: 'АВЕ', vv: 3 }), 'v3: VIP series АМР doubles the value');
  ok(pv3({ tier: 'common', region: '66', country: 'RU', digits: '345', letters: 'АМР' }) >= 3.4 * pv3({ tier: 'common', region: '66', country: 'RU', digits: '345', letters: 'АВЕ' }), 'v4: beautiful plates are worth much more (VIP ×3.5)');
  ok(plateTraits({ tier: 'common', region: '66', country: 'RU', digits: '057', letters: 'ААВ' }).join() === 'low,pairL', 'traits: low number + paired letters');
  const el = C3.filter(c => c.cat === 'elite'); ok(el.every(c => c.odds[4] >= 41), 'elite cases: +3 p.p. of Grail');
}

console.log('\n18. Control panel: players, gifts, blocking, support, settings');
{
  const [ad] = await q1(`SELECT u.id,u.nickname FROM users u WHERE role='admin' LIMIT 1`);
  const ADM = client(); await q1(`UPDATE users SET pass_hash=(SELECT pass_hash FROM users WHERE nick_norm='trader1') WHERE id=$1`, [ad.id]);
  const [ae] = await q1('SELECT email FROM users WHERE id=$1', [ad.id]);
  let x = await ADM.call('POST', '/api/auth/login', { email: ae.email, password: 'correct horse 1' }); ok(x.status === 200, 'admin signs in');
  const P = client(); await P.call('POST', '/api/auth/register', { email: 'player18@plateclub.test', nickname: 'player18', password: 'correct horse 1', terms: true });
  const pid18 = (await P.call('GET', '/api/me')).data.user.id;
  x = await ADM.call('GET', '/api/admin/users'); ok(x.status === 200 && x.data.users.some(u => u.id === pid18) && !x.data.users.some(u => u.role === 'bot'), 'admin sees every player (market maker hidden)');
  x = await ADM.call('POST', '/api/admin/grant', { userId: pid18, amount: 12345, reason: 'тест' }); ok(x.status === 200 && x.data.balance === 50 + 12345, 'admin sends any amount to a player by id', x.data);
  x = await ADM.call('POST', '/api/admin/users/' + pid18 + '/plate', { tier: 'elite', reason: 'приз' }); ok(x.status === 200 && x.data.plate.tier === 'elite', 'admin gifts an elite plate');
  const gv = (await client().call('GET', '/api/verify/' + x.data.plate.id)).data; ok(gv.verified === true && gv.plate.owner === 'player18', 'gifted plate is VERIFIED and owned by the player');
  x = await ADM.call('GET', '/api/admin/users/' + pid18); ok(x.status === 200 && x.data.plates.length === 1 && x.data.ledger.length >= 2, 'player card: plates and history');
  x = await P.call('POST', '/api/support', { subject: 'Не открывается кейс', body: 'Нажимаю и ничего не происходит' }); const tid = x.data.id; ok(x.status === 200 && tid, 'player writes to support');
  x = await ADM.call('GET', '/api/me'); ok(x.data.user.inbox >= 1, 'admin sees unread support count');
  x = await ADM.call('GET', '/api/admin/support'); ok(x.data.tickets.some(t => t.id === tid && t.nickname === 'player18'), 'ticket in the admin inbox');
  x = await ADM.call('POST', '/api/admin/support/' + tid + '/reply', { body: 'Обновите страницу, пожалуйста' }); ok(x.status === 200, 'admin replies');
  x = await P.call('GET', '/api/me'); ok(x.data.user.unread === 1, 'player sees an unread answer');
  x = await P.call('GET', '/api/support/' + tid); ok(x.data.messages.length === 2 && x.data.messages[1].fromAdmin, 'thread shows the answer'); ok((await P.call('GET', '/api/me')).data.user.unread === 0, 'reading clears the badge');
  x = await client().call('GET', '/api/support/' + tid); ok(x.status === 401, 'support needs sign-in');
  x = await B.call('GET', '/api/support/' + tid); ok(x.status === 404, 'nobody else can read a ticket');
  x = await ADM.call('POST', '/api/admin/message', { userId: pid18, subject: 'Привет', body: 'Добро пожаловать!' }); ok(x.status === 200 && x.data.sent === 1 && (await P.call('GET', '/api/me')).data.user.unread === 1, 'admin writes to a player first');
  x = await ADM.call('POST', '/api/admin/settings', { bankRate: 0.7, dailyBonus: 25, signupBonus: 100, announcement: 'Турнир в субботу!', cases: { '02': { price: 99 }, '03': { hidden: true } } });
  ok(x.status === 200 && x.data.settings.bankRate === 0.7, 'admin changes settings');
  const cfg2 = (await client().call('GET', '/api/config')).data;
  ok(cfg2.bankRate === 0.7 && cfg2.daily.base === 25 && cfg2.signupBonus === 100 && cfg2.announcement === 'Турнир в субботу!' && !cfg2.cases.some(c => c.id === '03') && cfg2.cases.find(c => c.id === '02').price === 99, 'settings reach the site config');
  x = await P.call('POST', '/api/cases/03/open', {}); ok(x.status === 409, 'hidden case cannot be opened');
  const b0 = (await P.call('GET', '/api/me')).data.user.balance; x = await P.call('POST', '/api/cases/02/open', {}); const dd = cfg2.deals.find(d => d.id === '02');
  ok(x.status === 200 && x.data.price === (dd ? dd.price : 99) && (await P.call('GET', '/api/me')).data.user.balance === b0 - x.data.price, 'case price override is charged');
  x = await ADM.call('POST', '/api/admin/settings', { bankRate: 5 }); ok(x.data.settings.bankRate === 0.95, 'settings are clamped to safe limits');
  x = await ADM.call('POST', '/api/admin/grant-all', { amount: 7, reason: 'праздник' }); ok(x.status === 200 && x.data.players >= 2, 'bonus to every player', x.data);
  x = await ADM.call('POST', '/api/admin/users/' + pid18 + '/block', { block: true, reason: 'спам' }); ok(x.status === 200, 'admin blocks a player');
  ok((await P.call('GET', '/api/me')).data.user === null, 'blocked player is signed out');
  x = await client().call('POST', '/api/auth/login', { email: 'player18@plateclub.test', password: 'correct horse 1' }); ok(x.status === 403, 'blocked player cannot sign in');
  x = await ADM.call('POST', '/api/admin/users/' + pid18 + '/block', { block: false }); ok(x.status === 200, 'admin unblocks');
  x = await P.call('GET', '/api/admin/users'); ok(x.status === 401 || x.status === 403, 'players cannot open the control panel');
  x = await ADM.call('GET', '/api/admin/economy'); ok(x.status === 200 && typeof x.data.economy.case_spent === 'number', 'economy overview');
  await ADM.call('POST', '/api/admin/settings', { bankRate: 0.6, dailyBonus: 10, signupBonus: 50, announcement: '', cases: {} });
}

console.log('\n19. Games: case battles, collections, swaps, auction of the day');
{
  let T = 0; const appG = createApp({ pool, env: { ...env, MARKET_BOT: 'on' }, fetchImpl: fakeFetch, now: () => Date.now() + T });
  const mk = async (nick) => { const c = client(appG); await c.call('POST', '/api/auth/register', { email: nick + '@plateclub.test', nickname: nick, password: 'correct horse 1', terms: true }); await topUp(c, 'plt7500'); return c; };
  const G1 = await mk('gamer1'), G2 = await mk('gamer2');
  const bal = async c => (await c.call('GET', '/api/me')).data.user.balance;
  // battles
  const cfgG = (await G1.call('GET', '/api/config')).data; const st = cfgG.battleCases.find(c => c.id === 'B1');
  ok(cfgG.battleCases.length === 4 && !cfgG.cases.some(c => c.id.startsWith('B')), 'four dedicated battle cases, not in the catalogue');
  const g1b0 = await bal(G1);
  let x = await G1.call('POST', '/api/battles', { caseId: 'B1', seats: 2, rounds: 3 }, { 'idempotency-key': 'battle-key-0001' });
  const bid = x.data.id; ok(x.status === 200 && (await bal(G1)) === g1b0 - st.price * 3, 'battle created, entry charged (3 rounds × case price)', x.data);
  x = await G1.call('POST', '/api/battles', { caseId: 'B1', seats: 5, rounds: 3 }); ok(x.status === 400, 'battle needs 2–4 players');
  x = await G1.call('POST', '/api/battles', { caseId: '01', seats: 2, rounds: 1 }); ok(x.status === 404, 'regular cases are not used in battles');
  x = await G1.call('POST', '/api/cases/B1/open', {}); ok(x.status === 404, 'battle cases cannot be opened alone');
  x = await G1.call('POST', `/api/battles/${bid}/join`, {}); ok(x.status === 409, 'cannot join your own battle twice');
  x = await G1.call('GET', '/api/battles'); ok(x.data.open.some(b => b.id === bid && b.players.length === 1), 'open battle in the lobby');
  const g2b0 = await bal(G2);
  x = await G2.call('POST', `/api/battles/${bid}/join`, {}, { 'idempotency-key': 'battle-join-0001' }); ok(x.status === 200, 'second player joins → battle resolves');
  let d = (await G2.call('GET', '/api/battles/' + bid)).data;
  ok(d.battle.status === 'DONE' && d.drops.length === 6 && d.battle.players.length === 2, 'battle: 3 rounds × 2 seats = 6 plates', d.battle);
  const tot = [0, 1].map(sx => d.drops.filter(z => z.seat === sx).reduce((a, z) => a + z.value, 0));
  ok(tot[d.battle.winnerSeat] === Math.max(...tot) && d.battle.players.every(p => p.total === tot[p.seat]), 'winner has the biggest total', tot);
  const winnerC = d.battle.winnerSeat === 0 ? G1 : G2; const wc = (await winnerC.call('GET', '/api/collection')).data.plates;
  ok(d.drops.every(z => wc.some(p => p.id === z.plate.id)), 'winner takes every plate');
  const bv = (await client().call('GET', '/api/verify/' + d.drops[0].plate.id)).data; ok(bv.verified === true, 'battle plate VERIFIED');
  ok((await bal(G2)) === g2b0 - st.price * 3, 'joining player paid the same entry');
  x = await G1.call('POST', '/api/battles', { caseId: 'B2', seats: 4, rounds: 1 }); const bid2 = x.data.id;
  x = await G2.call('POST', `/api/battles/${bid2}/bots`, {}); ok(x.status === 403, 'only the creator can call bots');
  x = await G1.call('POST', `/api/battles/${bid2}/bots`, {}); d = (await G1.call('GET', '/api/battles/' + bid2)).data;
  ok(x.status === 200 && d.battle.status === 'DONE' && d.battle.players.filter(p => p.bot).length === 3, 'bots fill the empty seats', d.battle.players);
  x = await G1.call('POST', '/api/battles', { caseId: 'B1', seats: 3, rounds: 2 }); const bid3 = x.data.id; const b3 = await bal(G1);
  x = await G1.call('POST', `/api/battles/${bid3}/cancel`, {}); ok(x.status === 200 && (await bal(G1)) === b3 + st.price * 2, 'cancelled battle refunds the entry');
  // sets
  x = await G1.call('GET', '/api/sets'); ok(x.status === 200 && x.data.sets.length === 8 && x.data.sets.every(st2 => !st2.done), 'eight hard collections, none done by a new player', x.data.sets.length);
  const [ad19] = await q1(`SELECT id,email FROM users WHERE role='admin' LIMIT 1`); const ADG = client(appG); await ADG.call('POST', '/api/auth/login', { email: ad19.email, password: 'correct horse 1' });
  const g1id = (await G1.call('GET', '/api/me')).data.user.id;
  for (let i = 0; i < 3; i++) await ADG.call('POST', `/api/admin/users/${g1id}/plate`, { tier: 'grail' });
  x = await G1.call('GET', '/api/sets'); const gs = x.data.sets.find(st2 => st2.id === 'grails'); ok(gs.done && !gs.claimed, 'three Grails complete the set');
  const bs = await bal(G1); x = await G1.call('POST', '/api/sets/grails/claim', {}); ok(x.status === 200 && (await bal(G1)) === bs + 30000, 'set reward paid');
  x = await G1.call('POST', '/api/sets/grails/claim', {}); ok(x.status === 409, 'set reward only once');
  x = await G1.call('POST', '/api/sets/empire/claim', {}); ok(x.status === 409, 'cannot claim an unfinished set');
  ok((await client().call('GET', '/api/users/gamer1')).data.profile.sets.includes('grails'), 'completed set shows on the profile');
  // rankings boards and medals
  x = await ADG.call('POST', '/api/admin/demo-players', {}); ok(x.status === 200 && x.data.made === 15, 'admin adds 15 demo players', x.data);
  x = await ADG.call('POST', '/api/admin/demo-players', {}); ok(x.data.made === 0, 'demo players are added once');
  for (const by of ['total', 'coins', 'plates']) { const r = (await client().call('GET', '/api/rankings?by=' + by)).data; ok(r.by === by && r.rankings.length > 0, 'ranking board: ' + by); }
  ok((await client().call('GET', '/api/rankings?by=level')).data.by === 'total', 'old board names fall back to the overall top');
  const rt = (await client(appG).call('GET', '/api/rankings')).data.rankings;
  ok(rt.slice(0, 3).every(r => r.medals.includes('top3') && r.medals.includes('top10')) && rt.slice(3, 10).every(r => r.medals.join() === 'top10') && rt.slice(10).every(r => !r.medals.length), 'medals: top-3 get two, top-10 get one');
  const p0 = (await client(appG).call('GET', '/api/users/' + rt[0].nickname)).data.profile; ok(p0.medals.includes('top3'), 'medals on the profile');
  // swaps
  for (let i = 0; i < 2; i++) await G2.call('POST', '/api/cases/01/open', {});
  const p1 = (await G1.call('GET', '/api/collection')).data.plates.filter(p => p.status === 'OWNED'); const p2 = (await G2.call('GET', '/api/users/gamer2/plates')).data.plates;
  ok(p2.length >= 1, 'public list of tradable plates');
  x = await G1.call('POST', '/api/swaps', { to: 'gamer2', give: [p1[0].id, p1[1].id], want: [p2[0].id], givePlt: 25 }); const sw = x.data.id; ok(x.status === 200, 'swap offered: 2 plates + 25 PLT for 1 plate');
  x = await G1.call('POST', '/api/swaps', { to: 'gamer2', give: [p2[0].id], want: [] }); ok(x.status === 409 || x.status === 400, 'cannot offer plates you do not own');
  x = await G2.call('GET', '/api/me'); ok(x.data.user.swaps === 1, 'receiver sees a pending offer');
  x = await G2.call('GET', '/api/swaps'); ok(x.data.incoming[0].give.length === 2 && x.data.incoming[0].givePlt === 25, 'offer details');
  x = await G1.call('POST', `/api/swaps/${sw}/accept`, {}); ok(x.status === 404, 'only the receiver can accept');
  const a1 = await bal(G1), a2 = await bal(G2);
  x = await G2.call('POST', `/api/swaps/${sw}/accept`, {}); ok(x.status === 200, 'swap accepted');
  const c1 = (await G1.call('GET', '/api/collection')).data.plates.map(p => p.id), c2 = (await G2.call('GET', '/api/collection')).data.plates.map(p => p.id);
  ok(c1.includes(p2[0].id) && c2.includes(p1[0].id) && c2.includes(p1[1].id) && (await bal(G1)) === a1 - 25 && (await bal(G2)) === a2 + 25, 'plates and PLT moved both ways');
  ok((await client().call('GET', '/api/verify/' + p1[0].id)).data.verified === true, 'swapped plate stays VERIFIED');
  x = await G2.call('POST', `/api/swaps/${sw}/accept`, {}); ok(x.status === 409, 'a swap runs once');
  x = await G1.call('POST', '/api/swaps', { to: 'gamer2', give: [p2[0].id], want: [p1[0].id] }); const sw2 = x.data.id;
  await G1.call('POST', '/api/market/listings', { plateId: p2[0].id, price: 999 });
  x = await G2.call('POST', `/api/swaps/${sw2}/accept`, {}); ok(x.status === 409 && /рынк/.test(x.data.error), 'swap fails if a plate went to the market meanwhile', x.data);
  // auction
  x = await G1.call('GET', '/api/auction'); const au = x.data.auction;
  ok(au && ['rare', 'elite', 'grail'].includes(au.plate.tier) && au.min === au.start, 'auction of the day: a rare-or-better plate', au && au.plate.tier);
  x = await G1.call('POST', '/api/auction/bid', { amount: au.min - 1 }); ok(x.status === 409, 'bid below the minimum is refused');
  const u1 = await bal(G1); x = await G1.call('POST', '/api/auction/bid', { amount: au.min }, { 'idempotency-key': 'auction-key-0001' }); ok(x.status === 200 && (await bal(G1)) === u1 - au.min, 'bid holds the PLT');
  const u2 = await bal(G2); const nx = au.min + au.step;
  x = await G2.call('POST', '/api/auction/bid', { amount: nx }, { 'idempotency-key': 'auction-key-0002' }); ok(x.status === 200 && (await bal(G1)) === u1 && (await bal(G2)) === u2 - nx, 'outbid player gets the PLT back');
  x = await G1.call('GET', '/api/auction'); ok(x.data.auction.topUser === 'gamer2' && x.data.auction.history.length === 2 && x.data.auction.min === nx + au.step, 'auction state', x.data.auction);
  T = x.data.auction.ends - Date.now() - 60000; x = await G1.call('POST', '/api/auction/bid', { amount: nx + au.step }, { 'idempotency-key': 'auction-key-0003' });
  ok(x.status === 200 && x.data.ends >= Date.now() + T + 4.9 * 60000, 'a last-minute bid adds 5 minutes', x.data);
  T += 10 * 60000; await G2.call('GET', '/api/auction'); x = await client(appG).call('GET', '/api/auction');
  const pv2 = (await client().call('GET', '/api/verify/' + au.plate.id)).data;
  ok(pv2.verified === true && pv2.plate.owner === 'gamer1' && x.data.past.some(p => p.topUser === 'gamer1'), 'auction settles: plate goes to the top bidder', pv2.plate && pv2.plate.owner);
  ok(x.data.auction && x.data.auction.day > au.day, 'a new auction starts the next day');
}

console.log('\n20. Multi-open, daily tasks, wheel, higher-or-lower, profiles, photos');
{
  const P = client(); await P.call('POST', '/api/auth/register', { email: 'fun@example.com', nickname: 'FunGuy', password: 'fun-pass-123', terms: true });
  await q1(`UPDATE users SET balance=20000 WHERE nick_norm='funguy'`);
  const b0 = (await P.call('GET', '/api/me')).data.user.balance;
  let r = await P.call('POST', '/api/cases/01/open', { count: 3 }, { 'idempotency-key': 'multi-open-0001' });
  ok(r.status === 200 && r.data.plates.length === 3 && r.data.balance === b0 - 3 * r.data.price && r.data.plate.value === Math.max(...r.data.plates.map(p => p.value)), 'open ×3: three plates, triple price, best one returned', r.data.count);
  r = await P.call('POST', '/api/cases/01/open', { count: 9 }, { 'idempotency-key': 'multi-open-0002' }); ok(r.status === 200 && r.data.plates.length === 3, 'no more than 3 at once');
  await q1(`UPDATE users SET balance=50 WHERE nick_norm='funguy'`);
  r = await P.call('POST', '/api/cases/01/open', { count: 2 }, { 'idempotency-key': 'multi-open-0003' }); ok(r.status === 402, 'multi-open needs money for all cases');
  await q1(`UPDATE users SET balance=20000 WHERE nick_norm='funguy'`);
  // tasks
  let t = (await P.call('GET', '/api/tasks')).data; ok(t.tasks.length === 2 && t.tasks[0].id !== t.tasks[1].id, 'two daily tasks', t.tasks.map(x => x.id));
  const openTask = t.tasks.find(x => x.id.startsWith('open'));
  if (openTask) { ok(openTask.have === Math.min(openTask.need, 6), 'case opens count towards the task', openTask); }
  const undone = t.tasks.find(x => !x.done); if (undone) { r = await P.call('POST', `/api/tasks/${undone.id}/claim`, {}); ok(r.status === 409, 'unfinished task cannot be claimed'); }
  const doneT = t.tasks.find(x => x.done); if (doneT) { r = await P.call('POST', `/api/tasks/${doneT.id}/claim`, {}); ok(r.status === 200 && r.data.amount === doneT.reward, 'finished task pays'); r = await P.call('POST', `/api/tasks/${doneT.id}/claim`, {}); ok(r.status === 409, 'task pays once'); }
  // wheel
  r = await P.call('POST', '/api/wheel/spin', {}); ok(r.status === 200 && typeof r.data.index === 'number' && (r.data.prize.kind === 'plt' ? r.data.prize.amount > 0 : !!r.data.plate), 'wheel spin gives a prize', r.data.prize);
  r = await P.call('POST', '/api/wheel/spin', {}); ok(r.status === 409, 'wheel: one spin a day');
  ok((await P.call('GET', '/api/wheel')).data.spun === true, 'wheel remembers today');
  // higher or lower
  let h = (await P.call('POST', '/api/hilo/start', {})).data; ok(h.id && h.cur && h.cur.value > 0 && h.step === 0, 'hilo run starts with a plate', h);
  ok((await P.call('POST', '/api/hilo/start', {})).data.id === h.id, 'start resumes the open run');
  r = await P.call('POST', `/api/hilo/${h.id}/cash`, {}); ok(r.status === 409, 'nothing to cash before a correct guess');
  let guard = 0; let g;
  do { g = (await P.call('POST', `/api/hilo/${h.id}/guess`, { dir: Math.random() < 0.5 ? 'up' : 'down' })).data; guard++; } while (g.status === 'OPEN' && g.bank === 0 && guard < 30);
  ok(['OPEN', 'LOST', 'DONE'].includes(g.status) && (g.win ? g.bank > 0 : g.bank === 0), 'guess moves the run on or burns the bank', g.status);
  if (g.status === 'OPEN') { const bb = (await P.call('GET', '/api/me')).data.user.balance; r = await P.call('POST', `/api/hilo/${h.id}/cash`, {}); ok(r.status === 200 && r.data.balance === bb + g.bank, 'cash out pays the bank'); }
  await q1(`UPDATE hilo_runs SET status='CASHED' WHERE user_id=(SELECT id FROM users WHERE nick_norm='funguy')`);
  for (let i = 0; i < 6; i++) { const s2 = await P.call('POST', '/api/hilo/start', {}); if (s2.status !== 200) { ok(s2.status === 409 && i >= 3, 'hilo: 5 games a day', i); break; } await q1(`UPDATE hilo_runs SET status='CASHED' WHERE id=$1`, [s2.data.id]); }
  // public profile, photo, tips
  const prof = (await client().call('GET', '/api/users/FunGuy')).data.profile; ok(prof.top.length >= 6 && typeof prof.level === 'number' && prof.av === null, 'anyone can see a player’s plates and level', prof.top.length);
  const png = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4f60000000049454e44ae426082', 'hex').toString('base64');
  r = await P.call('POST', '/api/me/avatar', { image: 'data:image/png;base64,' + Buffer.from('<svg/>').toString('base64') }); ok(r.status === 400, 'fake image is rejected');
  r = await P.call('POST', '/api/me/avatar', { image: png }); ok(r.status === 200 && r.data.av, 'profile photo uploads');
  const img = await app(new Request('http://localhost/api/avatar/funguy')); ok(img.status === 200 && img.headers.get('content-type') === 'image/png', 'photo is served as an image');
  ok((await client().call('GET', '/api/users/FunGuy')).data.profile.av === r.data.av, 'profile shows the photo version');
  r = await P.call('POST', '/api/me/tips', { id: 'battles' }); await P.call('POST', '/api/me/tips', { id: 'battles' }); ok((await P.call('GET', '/api/me')).data.user.tips.join() === 'battles', 'tutorials are remembered once');
  // seasonal case is on sale and listed
  ok(cfg.cases.find(c => c.id === 'S1' && c.until > Date.now()), 'seasonal case is in the catalogue with an end date');
}

{ const D = client(); await D.call('POST', '/api/auth/register', { email: 'gone@example.com', nickname: 'GoneUser', password: 'gone-pass-123', terms: true });
  const [{ id }] = await q1(`SELECT id FROM users WHERE nick_norm='goneuser'`);
  let r = await ADM.call('POST', `/api/admin/users/${id}/delete`, { confirm: 'DELETE' }); ok(r.status === 200, 'admin deletes a player', r.data);
  ok(!(await D.call('GET', '/api/me')).data.user, 'deleted player is signed out');
  r = await client().call('POST', '/api/auth/register', { email: 'gone@example.com', nickname: 'GoneUser', password: 'gone-pass-123', terms: true }); ok(r.data.ok === true, 'nickname and email are free again', r.data);
  r = await client().call('POST', `/api/admin/users/${id}/delete`, { confirm: 'DELETE' }); ok(r.status === 401 || r.status === 403, 'only admins can delete'); }

// security: collections can't be farmed by passing the same plates between accounts; upgrade jumps under 1% are refused
{ const SA = client(), SB = client();
  await SA.call('POST', '/api/auth/register', { email: 'seta@example.com', nickname: 'SetFarmA', password: 'set-pass-123', terms: true });
  await SB.call('POST', '/api/auth/register', { email: 'setb@example.com', nickname: 'SetFarmB', password: 'set-pass-123', terms: true });
  const [{ id: ua }] = await q1(`SELECT id FROM users WHERE nick_norm='setfarma'`); const [{ id: ub }] = await q1(`SELECT id FROM users WHERE nick_norm='setfarmb'`);
  for (let i = 1; i <= 3; i++) await q1(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,seal,country,copy) VALUES($1,'ААА',$2,'77',$3,'grail','full',9000,$4,'OWNED','test','x','RU',1)`, ['PC-SETF-000' + i, String(i).repeat(3), 'ААА' + String(i).repeat(3) + '77', ua]);
  let r = await SA.call('POST', '/api/sets/grails/claim', {}); ok(r.status === 200 && r.data.amount === 30000, 'collection reward paid to the first owner', r.data);
  await q1(`UPDATE plates SET owner_id=$1 WHERE id LIKE 'PC-SETF-%'`, [ub]);
  r = await SB.call('GET', '/api/sets'); ok(r.data.sets.find(x => x.id === 'grails').have === 0, 'plates that already completed a collection do not count again');
  r = await SB.call('POST', '/api/sets/grails/claim', {}); ok(r.status === 409, 'the same plates cannot complete the collection on another account', r.data);
  const [{ id: cheap }] = await q1(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,seal,country,copy) VALUES('PC-SETF-0009','ВВВ','123','39','ВВВ12339','common','random',21,$1,'OWNED','test','x','RU',1) RETURNING id`, [ub]);
  r = await SB.call('POST', '/api/upgrade', { plateIds: [cheap], target: 'grail' }); ok(r.status === 400 && /1%/.test(r.data.error), 'upgrade with a chance under 1% is refused (no floor)', r.data);
  r = await SB.call('POST', '/api/upgrade', { plateIds: [cheap], target: 'constructor' }); ok(r.status === 400, 'prototype keys are not tiers', r.data); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
