// PLATE CLUB API. Runs inside one Netlify Function (see netlify/functions/api.mjs).
// All balances, ownership and listings live in Postgres; the browser is never the source of truth.
import { randomBytes, randomInt, scrypt as _scrypt, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  CASES, caseById, poolOf, poolRegions, priceNow, BY_REGIONS, BY_LETTERS, genPlate, plateValue, drawTier, comboKey, plateStr, TIERS, TI, REGIONS, LETTERS,
  SIGNUP_BONUS, dailyLadder, MEDAL_RULES, TELEGRAM, REFERRAL, refMilestone, refNext, QUESTS, MARKET_FEE, BANK_RATE, PACKAGES, CURRENCIES, publicConfig, PAT_NAME, ACHIEVEMENTS, dailyAmount, levelOf, LEVEL_REWARD, targetValue, upgradeChance, UPGRADE_MAX_PLATES,
  plateTraits, SETS, setProgress, BATTLE, battleCaseById, anyCaseById, AUCTION, auctionDay, auctionMin, SWAP, SETTINGS_DEFAULT, cleanSettings, casePrice, MARKET_BOT, BOT_DECAY, botListPrice, DEALER, dealerDemand, matchesDemand, dealerPrice,
} from './game.mjs';
import { tr, trExtra } from './i18n.mjs';

const scrypt = promisify(_scrypt);
const TERMS_VERSION = '2026-10-15';
const SESSION_DAYS = 30;
const RESERVED_NICKS = new Set(['admin', 'administrator', 'plateclub', 'plate_club', 'support', 'system', 'bank', 'moderator', 'root', 'staff', 'plateclubmarket', 'market', 'dealer']);

class HttpError extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; } }
const bad = (m, e) => new HttpError(400, m, e);

const hex = n => randomBytes(n).toString('hex').toUpperCase();
const fmtInt = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const newId = p => `${p}-${hex(2)}-${hex(2)}`;
const sha256 = s => createHash('sha256').update(s).digest('hex');
const n = v => (v === null || v === undefined ? v : Number(v));
const LATIN = { A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х' };
const translit = q => String(q || '').toUpperCase().replace(/[A-Z]/g, ch => LATIN[ch] || ch).replace(/[^0-9АВЕКМНОРСТУХ]/g, '');

async function hashPassword(pw) { const salt = randomBytes(16); const key = await scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }); return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`; }
async function checkPassword(pw, stored) {
  const [alg, s, k] = String(stored).split('$'); if (alg !== 'scrypt') return false;
  const key = await scrypt(pw, Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const ref = Buffer.from(k, 'base64'); return ref.length === key.length && timingSafeEqual(ref, key);
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
function parseCookies(h) { const o = {}; (h || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return o; }
const sessionCookie = (token, maxAge) => `pc_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export function createApp({ pool, env = process.env, fetchImpl = fetch, now = () => Date.now() }) {
  const SECRET = env.PLATE_SEAL_SECRET || '';
  const q = async (text, params = []) => (await pool.query(text, params)).rows;
  async function tx(fn) {
    const c = await pool.connect();
    try { await c.query('BEGIN'); const r = await fn((t, p = []) => c.query(t, p).then(x => x.rows)); await c.query('COMMIT'); return r; }
    catch (e) { try { await c.query('ROLLBACK'); } catch {} throw e; }
    finally { c.release(); }
  }
  // runtime settings (control panel). Cached for 10 s per function instance; an admin change resets the cache.
  let ST = SETTINGS_DEFAULT, stAt = 0;
  async function settings() {
    if (now() - stAt < 10000) return ST;
    try { const [r] = await q(`SELECT value FROM settings WHERE key='game'`); ST = cleanSettings(r ? (typeof r.value === 'string' ? JSON.parse(r.value) : r.value) : {}); stAt = now(); } catch { ST = SETTINGS_DEFAULT; }
    return ST;
  }
  const needSecret = () => { if (!SECRET || SECRET.length < 32) throw new HttpError(503, 'Реестр номеров ещё не настроен (нет PLATE_SEAL_SECRET).'); };
  const seal = p => createHmac('sha256', SECRET).update(['seal', p.id, p.combo, p.tier, p.pattern, p.value, p.mintTx].join('|')).digest('hex');
  const chainNext = (prev, e) => createHmac('sha256', SECRET).update([prev || 'genesis', e.plate_id, e.kind, e.from_user ?? '', e.to_user ?? '', e.price ?? '', e.tx_id ?? ''].join('|')).digest('hex');

  async function addEvent(Q, e) {
    const [last] = await Q('SELECT chain FROM plate_events WHERE plate_id=$1 ORDER BY id DESC LIMIT 1', [e.plate_id]);
    const chain = chainNext(last && last.chain, e);
    await Q('INSERT INTO plate_events(plate_id,kind,from_user,to_user,price,tx_id,chain) VALUES($1,$2,$3,$4,$5,$6,$7)', [e.plate_id, e.kind, e.from_user ?? null, e.to_user ?? null, e.price ?? null, e.tx_id ?? null, chain]);
  }
  async function ledger(Q, userId, kind, amount, label, ref) {
    const [u] = await Q('UPDATE users SET balance = balance + $1 WHERE id=$2 RETURNING balance', [amount, userId]);
    const id = newId('TX');
    await Q('INSERT INTO ledger(id,user_id,kind,amount,balance_after,ref,label) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, userId, kind, amount, u.balance, ref ?? null, label]);
    return { id, balance: n(u.balance) };
  }
  async function treasuryId(Q) {
    // Fee recipient: the account named in FEE_RECIPIENT, otherwise the first admin. No admin → no one receives the fee.
    const nick = String(env.FEE_RECIPIENT || '').toLowerCase();
    const [t] = nick ? await Q(`SELECT id FROM users WHERE nick_norm=$1 AND role='admin'`, [nick]) : await Q(`SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1`);
    return t ? n(t.id) : null;
  }
  async function throttle(key, limit, minutes) {
    const [r] = await q(`SELECT count(*)::int AS c FROM auth_attempts WHERE key=$1 AND created_at > now() - ($2 || ' minutes')::interval`, [key, String(minutes)]);
    if (n(r.c) >= limit) throw new HttpError(429, 'Слишком много попыток. Подождите несколько минут.');
  }
  const attempt = key => q('INSERT INTO auth_attempts(key) VALUES($1)', [key]);

  async function sessionUser(req) {
    const t = parseCookies(req.headers.get('cookie')).pc_session; if (!t) return null;
    const [u] = await q(`SELECT u.id,u.email,u.nickname,u.balance,u.role,u.email_verified_at IS NOT NULL AS verified,(extract(epoch from u.created_at)*1000)::bigint AS created_ms,(extract(epoch from u.seen_at)*1000)::bigint AS seen_ms
      FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.blocked_at IS NULL`, [sha256(t)]);
    if (u && !(u.seen_ms && now() - n(u.seen_ms) < 60000)) await q(`UPDATE users SET seen_at=now() WHERE id=$1`, [u.id]).catch(() => {});
    return u ? { id: n(u.id), email: u.email, nickname: u.nickname, role: u.role, balance: n(u.balance), verified: u.verified === true || u.verified === 't', created: n(u.created_ms) } : null;
  }
  async function newSession(userId) {
    const token = randomBytes(32).toString('base64url');
    await q(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now() + interval '${SESSION_DAYS} days')`, [sha256(token), userId]);
    return sessionCookie(token, SESSION_DAYS * 86400);
  }
  const mailOn = () => !!(env.RESEND_API_KEY && env.MAIL_FROM);
  async function sendMail(to, subject, text) {
    if (!mailOn()) return false;
    const r = await fetchImpl('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text }) });
    return r.ok;
  }
  async function issueToken(userId, kind, hours) {
    const token = randomBytes(32).toString('base64url');
    await q(`INSERT INTO auth_tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,$3,now() + ($4 || ' hours')::interval)`, [sha256(token), userId, kind, String(hours)]);
    return token;
  }
  const siteUrl = req => (env.URL || new URL(req.url).origin).replace(/\/$/, '');
  async function sendVerify(req, u) {
    if (!mailOn()) return false;
    const t = await issueToken(u.id, 'verify', 48);
    return sendMail(u.email, 'Подтвердите email в Plate Club', `Привет, ${u.nickname}!\n\nПодтвердите email для Plate Club:\n${siteUrl(req)}/?verify=${t}\n\nСсылка действует 48 часов. Если вы не регистрировались, просто проигнорируйте письмо.`);
  }

  const plateRow = r => ({ country: r.country || 'RU', copy: n(r.copy) || 1, id: r.id, letters: r.letters, digits: r.digits, region: r.region, tier: r.tier, pattern: r.pattern, value: n(r.value), status: r.status, origin: r.origin, created: n(r.created_ms), lastTx: r.last_tx_id, traits: plateTraits({ country: r.country || 'RU', letters: r.letters, digits: r.digits, vv: n(r.vv) || 1 }), paid: r.paid == null ? null : n(r.paid) });
  const PLATE_COLS = `p.vv,p.paid,p.country,p.copy,p.id,p.letters,p.digits,p.region,p.tier,p.pattern,p.value,p.status,p.origin,p.last_tx_id,(extract(epoch from p.created_at)*1000)::bigint AS created_ms`;

  async function withIdem(user, req, fn) {
    const key = req.headers.get('idempotency-key');
    if (!key) return fn();
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) throw bad('Неверный ключ запроса.');
    const [hit] = await q('SELECT response FROM idempotency WHERE user_id=$1 AND key=$2', [user.id, key]);
    if (hit) return typeof hit.response === 'string' ? JSON.parse(hit.response) : hit.response;
    const res = await fn();
    await q('INSERT INTO idempotency(user_id,key,response) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [user.id, key, JSON.stringify(res)]);
    return res;
  }

  // ---- referrals ----
  const REF_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679';
  const refCode = () => Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(0, REF_ALPHABET.length)]).join('');
  async function ensureRefCode(Q, userId) {
    const [u] = await Q('SELECT ref_code FROM users WHERE id=$1', [userId]);
    if (u && u.ref_code) return u.ref_code;
    for (let i = 0; i < 8; i++) {
      const code = refCode();
      try { await Q('UPDATE users SET ref_code=$1 WHERE id=$2', [code, userId]); return code; } catch (e) { if (e.code !== '23505') throw e; }
    }
    return null;
  }
  // same device = same signup IP hash; such an invite never pays
  async function refGuard(Q, inviterId, friendId) {
    const [inv] = await Q('SELECT nickname,signup_ip FROM users WHERE id=$1 AND blocked_at IS NULL', [inviterId]);
    if (!inv) return null;
    const [fr] = await Q('SELECT signup_ip FROM users WHERE id=$1', [friendId]);
    if (inv.signup_ip && fr && fr.signup_ip && inv.signup_ip === fr.signup_ip) return { inv, same: true };
    const [{ d }] = await Q(`SELECT count(*)::int AS d FROM ledger WHERE user_id=$1 AND kind='referral' AND created_at > now() - interval '24 hours'`, [inviterId]);
    return { inv, same: false, capped: n(d) >= REFERRAL.maxPerDay * 2 };
  }
  // Paid the moment a friend registers through the link: +1000 to the inviter, +500 extra to the friend.
  async function paySignupReferral(Q, friendId) {
    const [f] = await Q('SELECT id,nickname,referred_by FROM users WHERE id=$1 FOR UPDATE', [friendId]);
    if (!f || !f.referred_by) return;
    const inviterId = n(f.referred_by);
    const [done] = await Q(`SELECT 1 FROM ledger WHERE kind='referral' AND ref=$1`, ['refsu:' + friendId]);
    if (done) return;
    const g = await refGuard(Q, inviterId, friendId);
    if (!g || g.same || g.capped) return;
    await ledger(Q, inviterId, 'referral', REFERRAL.signupInviter, `Друг ${f.nickname} зарегистрировался`, 'refsu:' + friendId);
    await ledger(Q, friendId, 'referral', REFERRAL.signupFriend, `Бонус за приглашение от ${g.inv.nickname}`, 'refsu:' + friendId + ':f');
  }
  // Pays both sides once the invited friend has really started playing (opened a few cases).
  async function payReferral(Q, friendId) {
    const [f] = await Q('SELECT id,nickname,referred_by FROM users WHERE id=$1 FOR UPDATE', [friendId]);
    if (!f || !f.referred_by) return;
    const inviterId = n(f.referred_by);
    const [done] = await Q(`SELECT 1 FROM ledger WHERE kind='referral' AND ref=$1`, ['ref:' + friendId]);
    if (done) return;
    const [{ c }] = await Q(`SELECT count(*)::int AS c FROM ledger WHERE user_id=$1 AND kind='case_open'`, [friendId]);
    if (n(c) < REFERRAL.needOpens) return;
    const g = await refGuard(Q, inviterId, friendId);
    if (!g || g.capped) return;
    const inv = g.inv;
    // a second account from the same device does not pay the inviter
    if (g.same) { await Q(`INSERT INTO ledger(id,user_id,kind,amount,balance_after,ref,label) SELECT $1,$2,'referral',0,balance,$3,$4 FROM users WHERE id=$2`, [newId('TX'), friendId, 'ref:' + friendId, 'Приглашение не засчитано: то же устройство']); return; }
    await ledger(Q, inviterId, 'referral', REFERRAL.inviter, `Друг ${f.nickname} начал играть`, 'ref:' + friendId);
    await ledger(Q, friendId, 'referral', REFERRAL.friend, `Приглашение от ${inv.nickname}`, 'ref:' + friendId + ':f');
    // milestones: 3, 10, 25, 50, 100 active friends
    const [{ act }] = await Q(`SELECT count(*)::int AS act FROM ledger WHERE user_id=$1 AND kind='referral' AND ref ~ '^ref:[0-9]+$' AND amount > 0`, [inviterId]);
    for (const [need, bonus] of refMilestone(n(act))) {
      const ref = 'refms:' + need;
      const [had] = await Q(`SELECT 1 FROM ledger WHERE user_id=$1 AND ref=$2`, [inviterId, ref]);
      if (!had) await ledger(Q, inviterId, 'referral', bonus, `Награда за ${need} приглашённых друзей`, ref);
    }
  }

  // ---------------- routes ----------------
  const routes = [];
  const R = (method, path, handler, opts = {}) => routes.push({ method, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler, ...opts });

  R('GET', '/api/config', async () => publicConfig(env, now(), await settings()));
  R('GET', '/api/me', async ({ user }) => {
    if (!user) return { user: null };
    // the site owner (first admin) gets ADMIN_INITIAL_GRANT once — also when they became admin before the grant existed
    const initial = Math.max(0, Math.min(100_000_000, parseInt(env.ADMIN_INITIAL_GRANT || '0', 10) || 0));
    if (initial && user.role === 'admin') {
      const paid = await tx(async Q => {
        const [first] = await Q(`SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1`);
        if (!first || n(first.id) !== user.id) return 0;
        await Q('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
        const [done] = await Q(`SELECT 1 FROM ledger WHERE user_id=$1 AND ref='admin-initial'`, [user.id]); if (done) return 0;
        const led = await ledger(Q, user.id, 'admin_grant', initial, 'Стартовый баланс администратора', 'admin-initial');
        return led.balance;
      });
      if (paid) user.balance = paid;
    }
    const [s] = await q(`SELECT
      (SELECT count(*) FROM ledger WHERE user_id=$1 AND kind='case_open')::int AS opened,
      (SELECT count(*) FROM ledger WHERE user_id=$1 AND kind='market_buy')::int AS bought,
      (SELECT count(*) FROM ledger WHERE user_id=$1 AND kind='market_sale')::int AS sold,
      (SELECT count(*) FROM listings WHERE seller_id=$1)::int AS listed,
      (SELECT count(*) FROM plates WHERE owner_id=$1 AND status<>'BANKED')::int AS plates,
      (SELECT count(DISTINCT country || region) FROM plates WHERE owner_id=$1 AND status<>'BANKED')::int AS regions,
      (SELECT count(DISTINCT country) FROM plates WHERE owner_id=$1 AND status<>'BANKED')::int AS countries,
      (SELECT count(*) FROM plates WHERE owner_id=$1 AND status<>'BANKED' AND copy=2)::int AS twins,
      (SELECT coalesce(sum(value),0) FROM plates WHERE owner_id=$1 AND status<>'BANKED')::bigint AS value,
      (SELECT coalesce(max(CASE tier WHEN 'common' THEN 0 WHEN 'fine' THEN 1 WHEN 'rare' THEN 2 WHEN 'elite' THEN 3 ELSE 4 END),-1) FROM plates WHERE owner_id=$1 AND status<>'BANKED')::int AS maxtier,
      (SELECT coalesce(-sum(amount),0) FROM ledger WHERE user_id=$1 AND kind='case_open')::bigint AS xp`, [user.id]);
    const stats = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, n(v)]));
    const [t] = await q(`SELECT (SELECT count(*) FROM tickets WHERE user_id=$1 AND user_unread)::int AS unread, CASE WHEN $2 THEN (SELECT count(*) FROM tickets WHERE admin_unread AND status<>'CLOSED')::int + (SELECT count(*) FROM quests WHERE status='PENDING')::int ELSE 0 END AS inbox, (SELECT count(*) FROM swaps WHERE to_id=$1 AND status='PENDING')::int AS swaps`, [user.id, user.role === 'admin']);
    return { user: { ...user, stats, level: levelOf(stats.xp), unread: n(t.unread), inbox: n(t.inbox), swaps: n(t.swaps), medals: (await medalsMap())[user.id] || [] } };
  });

  // players online in the last 5 minutes (public: count + a few nicknames)
  let onlineCache = null, onlineAt = 0;
  R('GET', '/api/online', async () => {
    if (onlineCache && now() - onlineAt < 15000) return onlineCache;
    const rows = await q(`SELECT nickname FROM users WHERE seen_at > now() - interval '5 minutes' AND blocked_at IS NULL AND role <> 'bot' ORDER BY seen_at DESC LIMIT 200`);
    onlineCache = { count: rows.length, players: rows.slice(0, 12).map(r => r.nickname) }; onlineAt = now();
    return onlineCache;
  });
  R('GET', '/api/nickname', async ({ url }) => {
    const nick = String(url.searchParams.get('n') || '');
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nick)) return { available: false, reason: '3–20 латинских букв, цифр или подчёркиваний.' };
    if (RESERVED_NICKS.has(nick.toLowerCase())) return { available: false, reason: 'Этот ник зарезервирован.' };
    const [r] = await q('SELECT 1 FROM users WHERE nick_norm=$1', [nick.toLowerCase()]);
    return r ? { available: false, reason: 'Этот ник занят.' } : { available: true };
  });

  R('POST', '/api/auth/register', async ({ body, req, ip }) => {
    const email = String(body.email || '').trim(), nickname = String(body.nickname || '').trim(), password = String(body.password || '');
    const errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) errors.email = 'Введите корректный email, например name@example.com.';
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nickname)) errors.nickname = '3–20 латинских букв, цифр или подчёркиваний.';
    else if (RESERVED_NICKS.has(nickname.toLowerCase())) errors.nickname = 'Этот ник зарезервирован.';
    if (password.length < 8 || password.length > 128) errors.password = 'Минимум 8 символов.';
    if (body.terms !== true) errors.terms = 'Примите правила и политику конфиденциальности.';
    if (Object.keys(errors).length) throw bad('Исправьте отмеченные поля.', { fields: errors });
    await throttle('reg:' + ip, 10, 60); await attempt('reg:' + ip);
    const [taken] = await q('SELECT email_norm=$1 AS e, nick_norm=$2 AS nk FROM users WHERE email_norm=$1 OR nick_norm=$2', [email.toLowerCase(), nickname.toLowerCase()]);
    if (taken && (taken.e === true || taken.e === 't')) throw new HttpError(409, 'Аккаунт с этим email уже есть. Войдите или восстановите пароль.', { fields: { email: 'Этот email уже зарегистрирован.' } });
    if (taken) throw new HttpError(409, 'Этот ник занят.', { fields: { nickname: 'Этот ник занят. Попробуйте другой.' } });
    const pass = await hashPassword(password);
    let user;
    try {
      user = await tx(async Q => {
        const [u] = await Q(`INSERT INTO users(email,email_norm,nickname,nick_norm,pass_hash,terms_version,terms_accepted_at,signup_ip) VALUES($1,$2,$3,$4,$5,$6,now(),$7) RETURNING id`, [email, email.toLowerCase(), nickname, nickname.toLowerCase(), pass, TERMS_VERSION, sha256(String(ip || '')).slice(0, 32)]);
        if (ST.signupBonus > 0) await ledger(Q, u.id, 'signup_bonus', ST.signupBonus, 'Приветственный бонус');
        return { id: n(u.id), email, nickname };
      });
    } catch (e) {
      if (e.code === '23505') {
        if (String(e.constraint).includes('nick')) throw new HttpError(409, 'Этот ник занят.', { fields: { nickname: 'Этот ник занят. Попробуйте другой.' } });
        throw new HttpError(409, 'Аккаунт с этим email уже есть. Войдите или восстановите пароль.', { fields: { email: 'Этот email уже зарегистрирован.' } });
      }
      throw e;
    }
    // who invited them (the code comes from the invite link)
    const inviteCode = String(body.ref || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 24);
    if (inviteCode) {
      try {
        const [inv] = await q(`SELECT id FROM users WHERE (ref_code=$1 OR nick_norm=lower($1)) AND blocked_at IS NULL AND role <> 'bot'`, [inviteCode]);
        if (inv && n(inv.id) !== user.id) {
          await q('UPDATE users SET referred_by=$1 WHERE id=$2 AND referred_by IS NULL', [n(inv.id), user.id]);
          await tx(Q => paySignupReferral(Q, user.id));
        }
      } catch {}
    }
    const cookie = await newSession(user.id);
    const mailed = await sendVerify(req, user).catch(() => false);
    return { body: { ok: true, bonus: ST.signupBonus, verificationSent: mailed }, status: 201, headers: { 'set-cookie': cookie } };
  });

  R('POST', '/api/auth/login', async ({ body, ip }) => {
    const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
    if (!email || !password) throw bad('Введите email и пароль.');
    await throttle('login:' + email, 8, 15); await throttle('loginip:' + ip, 40, 15);
    const [u] = await q('SELECT id,pass_hash,blocked_at,blocked_reason FROM users WHERE email_norm=$1', [email]);
    const ok = u ? await checkPassword(password, u.pass_hash) : (await hashPassword(password), false);
    if (!ok) { await attempt('login:' + email); await attempt('loginip:' + ip); throw new HttpError(401, 'Неверный email или пароль.'); }
    if (u.blocked_at) throw new HttpError(403, 'Аккаунт заблокирован администратором' + (u.blocked_reason ? ': ' + u.blocked_reason : '.'));
    return { body: { ok: true }, headers: { 'set-cookie': await newSession(n(u.id)) } };
  });

  R('POST', '/api/auth/logout', async ({ req }) => {
    const t = parseCookies(req.headers.get('cookie')).pc_session;
    if (t) await q('DELETE FROM sessions WHERE token_hash=$1', [sha256(t)]);
    return { body: { ok: true }, headers: { 'set-cookie': sessionCookie('', 0) } };
  });

  R('POST', '/api/auth/verify', async ({ body }) => {
    const t = String(body.token || '');
    const r = await tx(async Q => {
      const [k] = await Q(`SELECT user_id FROM auth_tokens WHERE token_hash=$1 AND kind='verify' AND used_at IS NULL AND expires_at>now() FOR UPDATE`, [sha256(t)]);
      if (!k) return null;
      await Q('UPDATE auth_tokens SET used_at=now() WHERE token_hash=$1', [sha256(t)]);
      await Q('UPDATE users SET email_verified_at=coalesce(email_verified_at,now()) WHERE id=$1', [k.user_id]);
      return true;
    });
    if (!r) throw bad('Ссылка подтверждения недействительна или устарела. Запросите новую в профиле.');
    return { ok: true };
  });
  R('POST', '/api/auth/resend-verify', async ({ user, req }) => {
    if (user.verified) return { ok: true, already: true };
    if (!mailOn()) throw new HttpError(503, 'Отправка писем на сайте ещё не настроена, поэтому письмо подтверждения отправить нельзя.');
    await throttle('verify:' + user.id, 3, 60); await attempt('verify:' + user.id);
    return { ok: await sendVerify(req, user) };
  }, { auth: true });

  // change password with the current one (works without email) — signs out every other device
  R('POST', '/api/auth/password', async ({ user, body, req }) => {
    const cur = String(body.current || ''), pw = String(body.password || '');
    if (pw.length < 8 || pw.length > 128) throw bad('Минимум 8 символов.', { fields: { password: 'Минимум 8 символов.' } });
    await throttle('pw:' + user.id, 6, 15);
    const [u] = await q('SELECT pass_hash FROM users WHERE id=$1', [user.id]);
    if (!(await checkPassword(cur, u.pass_hash))) { await attempt('pw:' + user.id); throw new HttpError(403, 'Текущий пароль неверный.', { fields: { current: 'Неверный пароль.' } }); }
    await q('UPDATE users SET pass_hash=$1 WHERE id=$2', [await hashPassword(pw), user.id]);
    await q('DELETE FROM sessions WHERE user_id=$1', [user.id]);
    return { body: { ok: true }, headers: { 'set-cookie': await newSession(user.id) } };
  }, { auth: true });
  R('GET', '/api/auth/sessions', async ({ user }) => {
    const [r] = await q('SELECT count(*)::int AS c FROM sessions WHERE user_id=$1 AND expires_at>now()', [user.id]);
    return { active: n(r.c) };
  }, { auth: true });
  R('POST', '/api/auth/logout-others', async ({ user, req }) => {
    const t = parseCookies(req.headers.get('cookie')).pc_session || '';
    const r = await q('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2 RETURNING 1', [user.id, sha256(t)]);
    return { ok: true, closed: r.length };
  }, { auth: true });
  R('POST', '/api/auth/forgot', async ({ body, req, ip }) => {
    const email = String(body.email || '').trim().toLowerCase();
    if (!mailOn()) throw new HttpError(503, 'Отправка писем на сайте ещё не настроена, поэтому ссылку для сброса отправить нельзя. Напишите в поддержку.');
    await throttle('forgot:' + ip, 5, 60); await attempt('forgot:' + ip);
    const [u] = await q('SELECT id,nickname,email FROM users WHERE email_norm=$1', [email]);
    if (u) {
      const t = await issueToken(n(u.id), 'reset', 2);
      await sendMail(u.email, 'Сброс пароля Plate Club', `Привет, ${u.nickname}!\n\nСбросить пароль можно по ссылке:\n${siteUrl(req)}/?reset=${t}\n\nСсылка действует 2 часа. Если вы не запрашивали сброс, просто проигнорируйте письмо.`).catch(() => false);
    }
    return { ok: true }; // same answer whether or not the email exists
  });
  R('POST', '/api/auth/reset', async ({ body }) => {
    const t = String(body.token || ''), pw = String(body.password || '');
    if (pw.length < 8 || pw.length > 128) throw bad('Минимум 8 символов.', { fields: { password: 'Минимум 8 символов.' } });
    const pass = await hashPassword(pw);
    const uid = await tx(async Q => {
      const [k] = await Q(`SELECT user_id FROM auth_tokens WHERE token_hash=$1 AND kind='reset' AND used_at IS NULL AND expires_at>now() FOR UPDATE`, [sha256(t)]);
      if (!k) return null;
      await Q('UPDATE auth_tokens SET used_at=now() WHERE token_hash=$1', [sha256(t)]);
      await Q('UPDATE users SET pass_hash=$1, email_verified_at=coalesce(email_verified_at,now()) WHERE id=$2', [pass, k.user_id]);
      await Q('DELETE FROM sessions WHERE user_id=$1', [k.user_id]);
      return n(k.user_id);
    });
    if (!uid) throw bad('Ссылка для сброса недействительна или устарела. Запросите новую.');
    return { body: { ok: true }, headers: { 'set-cookie': await newSession(uid) } };
  });

  // ---- cases ----
  R('POST', '/api/cases/:id/open', async ({ user, params, req }) => {
    needSecret();
    const c = caseById(params.id); if (!c) throw new HttpError(404, 'Такого кейса нет.');
    if (ST.cases[c.id] && ST.cases[c.id].hidden) throw new HttpError(409, 'Этот кейс временно недоступен.');
    return withIdem(user, req, () => tx(async Q => {
      const [u] = await Q('SELECT balance FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      const price = casePrice(c, ST, now());
      if (n(u.balance) < price) throw new HttpError(402, `Не хватает PLT: кейс ${c.id} стоит ${price} PLT, на балансе ${n(u.balance)} PLT.`);
      const tier = drawTier(c.odds);
      const led = await ledger(Q, user.id, 'case_open', -price, `Открыт кейс ${c.id} ${c.ru}${price < c.price ? ' (скидка)' : ''}`, 'case:' + c.id);
      let plate;
      for (let i = 0; i < 40 && !plate; i++) {
        const g = genPlate(tier, poolRegions(c), c.focus);
        const p = { ...g, id: newId('PC'), combo: comboKey(g), value: plateValue(g), mintTx: led.id };
        p.seal = seal(p);
        // At most two copies of a combination: copy 1, then copy 2. The unique (combo, copy) index settles races.
        const rows = await Q(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,last_tx_id,seal,country,copy,paid)
          SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,'OWNED',$10,$11,$12,$13, c.n + 1, $14 FROM (SELECT count(*)::int AS n FROM plates WHERE combo=$5) c WHERE c.n < 2
          ON CONFLICT DO NOTHING RETURNING copy,(extract(epoch from created_at)*1000)::bigint AS created_ms`,
          [p.id, p.letters, p.digits, p.region, p.combo, p.tier, p.pattern, p.value, user.id, `Кейс ${c.id} · ${c.ru}`, led.id, p.seal, p.country, price]);
        if (rows.length) plate = { ...p, copy: n(rows[0].copy), created: n(rows[0].created_ms), paid: price, traits: plateTraits(p) };
      }
      if (!plate) throw new HttpError(503, 'Не удалось выпустить уникальный номер. Деньги не списаны, попробуйте ещё раз.');
      await Q('UPDATE ledger SET ref=$1 WHERE id=$2', [plate.id, led.id]);
      await addEvent(Q, { plate_id: plate.id, kind: 'MINTED', to_user: user.id, tx_id: led.id });
      await payReferral(Q, user.id);
      const { seal: _s, mintTx: _m, combo: _c, ...pub } = plate;
      return { plate: { ...pub, status: 'OWNED', origin: `Кейс ${c.id} · ${c.ru}`, lastTx: led.id }, balance: led.balance, txId: led.id, price };
    }));
  }, { auth: true });

  // ---- collection & plates ----
  R('GET', '/api/collection', async ({ user }) => {
    const rows = await q(`SELECT ${PLATE_COLS}, l.id AS listing_id, l.price AS listing_price FROM plates p
      LEFT JOIN listings l ON l.plate_id=p.id AND l.status IN ('ACTIVE','RESERVED') WHERE p.owner_id=$1 AND p.status<>'BANKED' ORDER BY p.created_at DESC`, [user.id]);
    return { plates: rows.map(r => ({ ...plateRow(r), listing: r.listing_id ? { id: r.listing_id, price: n(r.listing_price) } : null })) };
  }, { auth: true });

  R('POST', '/api/plates/:id/bank', async ({ user, params }) => {
    needSecret();
    return tx(async Q => {
      const [p] = await Q('SELECT id,country,letters,digits,region,value,status,owner_id FROM plates WHERE id=$1 FOR UPDATE', [params.id]);
      if (!p || n(p.owner_id) !== user.id || p.status === 'BANKED') throw new HttpError(404, 'Этого номера нет в вашей коллекции.');
      if (p.status === 'LISTED') throw new HttpError(409, 'Сначала снимите номер с продажи на рынке.');
      const amt = Math.round(n(p.value) * ST.bankRate);
      const led = await ledger(Q, user.id, 'bank_sell', amt, `Продан банку: ${plateStr(p)}`, p.id);
      await Q(`UPDATE plates SET status='BANKED', owner_id=NULL, last_tx_id=$1 WHERE id=$2`, [led.id, p.id]);
      await addEvent(Q, { plate_id: p.id, kind: 'BANKED', from_user: user.id, price: amt, tx_id: led.id });
      return { ok: true, amount: amt, balance: led.balance };
    });
  }, { auth: true });

  async function plateDetail(id) {
    const [r] = await q(`SELECT ${PLATE_COLS}, u.nickname AS owner FROM plates p LEFT JOIN users u ON u.id=p.owner_id WHERE p.id=$1`, [id]);
    if (!r) return null;
    const ev = await q(`SELECT e.kind,e.price,e.tx_id,(extract(epoch from e.created_at)*1000)::bigint AS ms, f.nickname AS from_nick, t.nickname AS to_nick
      FROM plate_events e LEFT JOIN users f ON f.id=e.from_user LEFT JOIN users t ON t.id=e.to_user WHERE e.plate_id=$1 ORDER BY e.id`, [id]);
    const [l] = await q(`SELECT l.id,l.price,l.status,u.nickname AS seller FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.plate_id=$1 AND l.status IN ('ACTIVE','RESERVED')`, [id]);
    return { plate: { ...plateRow(r), owner: r.owner || null }, history: ev.map(e => ({ kind: e.kind, price: n(e.price), tx: e.tx_id, at: n(e.ms), from: e.from_nick, to: e.to_nick })), listing: l ? { id: l.id, price: n(l.price), status: l.status, seller: l.seller } : null };
  }
  R('GET', '/api/plates/:id', async ({ params }) => {
    const d = await plateDetail(params.id); if (!d) throw new HttpError(404, 'Номера с таким ID в Plate Club нет.'); return d;
  });

  R('GET', '/api/verify/:id', async ({ params }) => {
    const id = String(params.id).toUpperCase();
    const checkedAt = now();
    const fail = (reason, checks = []) => ({ verified: false, id, reason, checks, checkedAt });
    if (!/^PC-[0-9A-F]{4}-[0-9A-F]{4}$/.test(id)) return fail('Это не ID Plate Club. ID выглядит так: PC-7F3A-91C2.');
    if (!SECRET) return fail('Реестр не настроен, проверка сейчас недоступна.');
    const [p] = await q('SELECT id,vv,copy,country,letters,digits,region,combo,tier,pattern,value,owner_id,status,seal,(extract(epoch from created_at)*1000)::bigint AS created_ms FROM plates WHERE id=$1', [id]);
    if (!p) return fail('Номера с таким ID в Plate Club нет.');
    const evs = await q('SELECT plate_id,kind,from_user,to_user,price,tx_id,chain FROM plate_events WHERE plate_id=$1 ORDER BY id', [id]);
    const checks = [];
    const minted = evs[0];
    const recSeal = seal({ id: p.id, combo: p.combo, tier: p.tier, pattern: p.pattern, value: n(p.value), mintTx: minted && minted.tx_id });
    const sealOk = !!minted && minted.kind === 'MINTED' && timingSafeEqual(Buffer.from(recSeal), Buffer.from(String(p.seal).padEnd(recSeal.length).slice(0, recSeal.length)));
    checks.push({ name: 'Печать выпуска совпадает с данными номера', ok: sealOk });
    const by = p.country === 'BY';
    const comboOk = p.combo === comboKey(p) && (by ? !!BY_REGIONS[p.region] : !!REGIONS[p.region]) && [...p.letters].every(ch => (by ? BY_LETTERS : LETTERS).includes(ch)) && (by ? /^\d{4}$/ : /^\d{3}$/).test(p.digits) && plateValue({ ...p, vv: n(p.vv) }) === n(p.value);
    checks.push({ name: 'Комбинация, регион и стоимость корректны', ok: comboOk });
    const [cc] = await q('SELECT count(*)::int AS c FROM plates WHERE combo=$1', [p.combo]);
    checks.push({ name: 'Экземпляров комбинации не больше двух', ok: n(cc.c) <= 2 });
    let prev = null, chainOk = evs.length > 0, owner = null;
    for (const e of evs) {
      const exp = chainNext(prev, { ...e, from_user: e.from_user == null ? null : n(e.from_user), to_user: e.to_user == null ? null : n(e.to_user), price: e.price == null ? null : n(e.price) });
      if (exp !== e.chain) { chainOk = false; break; }
      prev = e.chain;
      if (e.kind === 'MINTED' || e.kind === 'TRANSFERRED') owner = n(e.to_user);
      if (e.kind === 'BANKED' || e.kind === 'UPGRADED') owner = null;
    }
    checks.push({ name: 'История владельцев не нарушена', ok: chainOk });
    const ownerOk = chainOk && owner === (p.owner_id == null ? null : n(p.owner_id));
    checks.push({ name: 'Текущий владелец совпадает с историей', ok: ownerOk });
    const verified = checks.every(c => c.ok);
    const d = verified ? await plateDetail(id) : null;
    return verified ? { verified: true, id, checks, checkedAt, plate: d.plate, events: evs.length } : fail('Запись не совпадает с подписанной историей.', checks);
  });

  // ---- market ----
  R('GET', '/api/market', async ({ url, user }) => {
    await stockMarket();
    const sp = url.searchParams, where = [`l.status='ACTIVE'`], P = [];
    const add = (sql, v) => { P.push(v); where.push(sql.replace('?', '$' + P.length)); };
    const raw = String(sp.get('q') || '').toUpperCase().replace(/[^0-9A-ZА-Я]/g, ''); const s = translit(raw);
    if (raw) { P.push('%' + s + '%', '%' + raw + '%'); where.push(`(replace(replace(replace(p.combo,'|',''),'BY:',''),'-','') LIKE $${P.length - 1} OR replace(replace(replace(p.combo,'|',''),'BY:',''),'-','') LIKE $${P.length})`); }
    const tiers = (sp.get('tiers') || '').split(',').filter(t => t in TI); if (tiers.length) add('p.tier = ANY(?::text[])', '{' + tiers.join(',') + '}');
    const g = sp.get('group'); if (g === 'by') where.push(`p.country='BY'`); else if (g === 'ru') where.push(`p.country='RU'`); else if (g) { add('p.region = ANY(?::text[])', '{' + Object.keys(REGIONS).filter(r => REGIONS[r][1] === g).join(',') + '}'); where.push(`p.country='RU'`); }
    const min = parseInt(sp.get('min')); if (min >= 0) add('l.price >= ?', min);
    const max = parseInt(sp.get('max')); if (max >= 0) add('l.price <= ?', max);
    const seller = sp.get('seller'); if (seller) add('u.nick_norm = ?', seller.toLowerCase());
    const order = { new: 'l.created_at DESC', pa: 'l.price ASC', pd: 'l.price DESC', rar: `CASE p.tier WHEN 'grail' THEN 4 WHEN 'elite' THEN 3 WHEN 'rare' THEN 2 WHEN 'fine' THEN 1 ELSE 0 END DESC, l.price DESC`, val: 'p.value DESC', deal: 'l.price::float8 / greatest(p.value,1) ASC, l.created_at DESC' }[sp.get('sort')] || 'l.created_at DESC';
    if (sp.get('deals') === '1') where.push('l.price < p.value');
    if (sp.get('who') === 'players') where.push(`u.role<>'bot'`); else if (sp.get('who') === 'market') where.push(`u.role='bot'`);
    const rows = await q(`SELECT l.id AS lid,l.price,(extract(epoch from l.created_at)*1000)::bigint AS l_ms,u.nickname AS seller,u.id AS seller_id,u.role AS seller_role,${PLATE_COLS}
      FROM listings l JOIN plates p ON p.id=l.plate_id JOIN users u ON u.id=l.seller_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 120`, P);
    return { listings: rows.map(r => ({ id: r.lid, price: n(r.price), created: n(r.l_ms), seller: r.seller, bot: r.seller_role === 'bot', mine: !!user && n(r.seller_id) === user.id, plate: plateRow(r) })), fetchedAt: now() };
  });

  // live feed: the latest rare-or-better plates minted from cases, and the latest upgrade attempts (real data only)
  R('GET', '/api/drops', async () => {
    const rows = await q(`SELECT ${PLATE_COLS}, u.nickname, (extract(epoch from p.created_at)*1000)::bigint AS at_ms FROM plates p JOIN users u ON u.id = (SELECT e.to_user FROM plate_events e WHERE e.plate_id=p.id AND e.kind='MINTED' LIMIT 1)
      WHERE p.tier IN ('rare','elite','grail') ORDER BY p.created_at DESC LIMIT 12`);
    return { drops: rows.map(r => ({ plate: plateRow(r), nickname: r.nickname, at: n(r.at_ms) })) };
  });
  R('GET', '/api/upgrade/recent', async () => {
    const rows = await q(`SELECT g.id,g.target_tier,g.chance,g.success,(extract(epoch from g.created_at)*1000)::bigint AS ms,u.nickname,f.tier AS from_tier,f.letters,f.digits,f.region,f.country
      FROM upgrades g JOIN users u ON u.id=g.user_id JOIN plates f ON f.id=g.from_plate ORDER BY g.created_at DESC LIMIT 12`);
    return { upgrades: rows.map(r => ({ id: r.id, nickname: r.nickname, target: r.target_tier, chance: Number(r.chance), success: r.success === true || r.success === 't', at: n(r.ms), from: { tier: r.from_tier, letters: r.letters, digits: r.digits, region: r.region, country: r.country } })) };
  });
  // ---- market maker ----
  let lastStock = 0;
  async function botUser(Q) {
    const [b] = await Q(`SELECT id FROM users WHERE nick_norm=$1`, [MARKET_BOT.nick.toLowerCase()]);
    if (b) return n(b.id);
    const [c] = await Q(`INSERT INTO users(email,email_norm,nickname,nick_norm,pass_hash,balance,terms_version,terms_accepted_at,role)
      VALUES('market@plateclub.invalid','market@plateclub.invalid',$1,$2,'locked',0,$3,now(),'bot') ON CONFLICT DO NOTHING RETURNING id`, [MARKET_BOT.nick, MARKET_BOT.nick.toLowerCase(), TERMS_VERSION]);
    if (c) return n(c.id);
    const [d] = await Q(`SELECT id FROM users WHERE nick_norm=$1`, [MARKET_BOT.nick.toLowerCase()]); return n(d.id);
  }
  const rnd = () => randomInt(0, 1_000_000) / 1_000_000;
  async function stockMarket(force = false) {
    if (!SECRET || SECRET.length < 32 || env.MARKET_BOT === 'off') return;
    if (!force && now() - lastStock < 20000) return;
    lastStock = now();
    await tx(async Q => {
      await Q('SELECT pg_advisory_xact_lock(424242)');
      const bot = await botUser(Q);
      // 1. unsold lots get cheaper, down to a floor
      const stale = await Q(`SELECT l.id,l.price,l.plate_id,p.value FROM listings l JOIN plates p ON p.id=l.plate_id WHERE l.seller_id=$1 AND l.status='ACTIVE'
        AND l.updated_at < now() - ($2 || ' minutes')::interval AND l.price > ceil(p.value * $3) LIMIT 40`, [bot, String(BOT_DECAY.minutes), BOT_DECAY.floor]);
      for (const l of stale) {
        const price = Math.max(Math.ceil(n(l.value) * BOT_DECAY.floor), Math.round(n(l.price) * BOT_DECAY.step));
        await Q('UPDATE listings SET price=$1, updated_at=now() WHERE id=$2', [price, l.id]);
        await addEvent(Q, { plate_id: l.plate_id, kind: 'PRICE_CHANGED', from_user: bot, price });
      }
      // 2. relist plates the dealer bought, at a fair price (never a bargain, so buy-backs cannot loop)
      const owned = await Q(`SELECT id,value FROM plates WHERE owner_id=$1 AND status='OWNED' LIMIT 20`, [bot]);
      for (const p of owned) await botList(Q, bot, p.id, Math.round(n(p.value) * (1 + rnd() * 0.25)));
      // 3. top up to the target size with freshly minted everyday plates
      const [{ c }] = await Q(`SELECT count(*)::int AS c FROM listings WHERE seller_id=$1 AND status='ACTIVE'`, [bot]);
      const need = Math.min(20, ST.botSize - n(c));
      const groups = [...new Set(Object.values(REGIONS).map(r => r[1]))];
      for (let i = 0; i < need; i++) {
        const tier = drawTier(MARKET_BOT.tierOdds);
        const by = rnd() < 0.3;
        const pool = by ? { RU: [], BY: Object.keys(BY_REGIONS) } : { RU: (g => Object.keys(REGIONS).filter(r => REGIONS[r][1] === g))(groups[randomInt(0, groups.length)]), BY: [] };
        for (let k = 0; k < 10; k++) {
          const g = genPlate(tier, pool);
          const p = { ...g, id: newId('PC'), combo: comboKey(g), value: plateValue(g), mintTx: newId('MK') };
          p.seal = seal(p);
          const rows = await Q(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,last_tx_id,seal,country,copy)
            SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,'OWNED','Рынок Plate Club',$10,$11,$12, c.n + 1 FROM (SELECT count(*)::int AS n FROM plates WHERE combo=$5) c WHERE c.n < 2
            ON CONFLICT DO NOTHING RETURNING id`, [p.id, p.letters, p.digits, p.region, p.combo, p.tier, p.pattern, p.value, bot, p.mintTx, p.seal, p.country]);
          if (!rows.length) continue;
          await addEvent(Q, { plate_id: p.id, kind: 'MINTED', to_user: bot, tx_id: p.mintTx });
          await botList(Q, bot, p.id, botListPrice(p.value, rnd(), rnd()));
          break;
        }
      }
    });
  }
  async function botList(Q, bot, plateId, price) {
    await Q(`INSERT INTO listings(id,plate_id,seller_id,price,status) VALUES($1,$2,$3,$4,'ACTIVE')`, [newId('L'), plateId, bot, price]);
    await Q(`UPDATE plates SET status='LISTED' WHERE id=$1`, [plateId]);
    await addEvent(Q, { plate_id: plateId, kind: 'LISTED', from_user: bot, price });
  }
  R('POST', '/api/admin/market/restock', async () => { await stockMarket(true); return { ok: true }; }, { auth: true, admin: true });

  R('GET', '/api/market/stats', async () => {
    const [s] = await q(`SELECT
      (SELECT count(*) FROM listings WHERE status='SOLD' AND sold_at > now() - interval '24 hours')::int AS sales,
      (SELECT coalesce(sum(price),0) FROM listings WHERE status='SOLD' AND sold_at > now() - interval '24 hours')::bigint AS volume,
      (SELECT count(*) FROM listings WHERE status='ACTIVE')::int AS active,
      (SELECT count(*) FROM listings l JOIN plates p ON p.id=l.plate_id WHERE l.status='ACTIVE' AND l.price < p.value)::int AS deals,
      (SELECT coalesce(avg(l.price::float8 / greatest(p.value,1)),1) FROM listings l JOIN plates p ON p.id=l.plate_id WHERE l.status='SOLD' AND l.sold_at > now() - interval '7 days')::float8 AS ratio`);
    return { sales: n(s.sales), volume: n(s.volume), active: n(s.active), deals: n(s.deals), ratio: Math.round(Number(s.ratio) * 1000) / 1000 };
  });

  // ---- dealer: daily demand, pays 115% of the estimate for matching everyday plates ----
  async function dealerUsed(Q, uid, day) {
    const [r] = await Q(`SELECT count(*)::int AS c FROM ledger WHERE user_id=$1 AND kind='dealer_sell' AND created_at >= to_timestamp($2)`, [uid, day * 86400]);
    return n(r.c);
  }
  R('GET', '/api/dealer', async ({ user }) => {
    const d = dealerDemand(now());
    let used = 0, plates = [];
    if (user) {
      used = await dealerUsed(q, user.id, d.day);
      const rows = await q(`SELECT ${PLATE_COLS} FROM plates p WHERE p.owner_id=$1 AND p.status='OWNED' AND p.tier = ANY($2::text[]) ORDER BY p.value DESC`, [user.id, '{' + DEALER.tiers.join(',') + '}']);
      plates = rows.map(plateRow).map(p => ({ ...p, demand: (d.demands.find(x => matchesDemand(p, x)) || {}).id || null, offer: Math.round(p.value * ST.dealerRate) })).filter(p => p.demand);
    }
    return { demands: d.demands, ends: d.ends, rate: ST.dealerRate, perDay: ST.dealerPerDay, used, plates };
  });
  R('POST', '/api/dealer/sell', async ({ user, body, req }) => {
    needSecret();
    return withIdem(user, req, () => tx(async Q => {
      const d = dealerDemand(now());
      await Q('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      if (await dealerUsed(Q, user.id, d.day) >= ST.dealerPerDay) throw new HttpError(409, `Скупщик сегодня уже купил у вас ${ST.dealerPerDay} номера. Приходите завтра.`);
      const [p] = await Q('SELECT id,vv,country,letters,digits,region,tier,pattern,value,status,owner_id FROM plates WHERE id=$1 FOR UPDATE', [String(body.plateId || '')]);
      if (!p || n(p.owner_id) !== user.id || p.status === 'BANKED' || p.status === 'BURNED') throw new HttpError(404, 'Этого номера нет в вашей коллекции.');
      if (p.status === 'LISTED') throw new HttpError(409, 'Сначала снимите номер с продажи на рынке.');
      const pl = { ...p, vv: n(p.vv) || 1, value: n(p.value) };
      if (!d.demands.some(x => matchesDemand(pl, x))) throw new HttpError(409, 'Скупщику сегодня такие номера не нужны.');
      const amt = Math.round(pl.value * ST.dealerRate);
      const bot = await botUser(Q);
      const led = await ledger(Q, user.id, 'dealer_sell', amt, `Продан скупщику: ${plateStr(p)}`, p.id);
      await Q(`UPDATE plates SET owner_id=$1, status='OWNED', last_tx_id=$2, paid=NULL WHERE id=$3`, [bot, led.id, p.id]);
      await addEvent(Q, { plate_id: p.id, kind: 'TRANSFERRED', from_user: user.id, to_user: bot, price: amt, tx_id: led.id });
      return { ok: true, amount: amt, balance: led.balance };
    }));
  }, { auth: true });

  R('GET', '/api/market/sales', async () => {
    const rows = await q(`SELECT l.id,l.price,(extract(epoch from l.sold_at)*1000)::bigint AS ms,s.nickname AS seller,b.nickname AS buyer,p.id AS pid,p.country,p.letters,p.digits,p.region,p.tier
      FROM listings l JOIN plates p ON p.id=l.plate_id JOIN users s ON s.id=l.seller_id JOIN users b ON b.id=l.buyer_id WHERE l.status='SOLD' ORDER BY l.sold_at DESC LIMIT 12`);
    return { sales: rows.map(r => ({ listing: r.id, price: n(r.price), at: n(r.ms), seller: r.seller, buyer: r.buyer, plate: { id: r.pid, country: r.country || 'RU', letters: r.letters, digits: r.digits, region: r.region, tier: r.tier } })) };
  });

  R('GET', '/api/market/mine', async ({ user }) => {
    const rows = await q(`SELECT l.id,l.price,l.status,l.fee,l.tx_id,(extract(epoch from l.updated_at)*1000)::bigint AS ms,l.seller_id,l.buyer_id,s.nickname AS seller,b.nickname AS buyer,p.id AS pid,p.country,p.letters,p.digits,p.region,p.tier
      FROM listings l JOIN plates p ON p.id=l.plate_id JOIN users s ON s.id=l.seller_id LEFT JOIN users b ON b.id=l.buyer_id
      WHERE l.seller_id=$1 OR l.buyer_id=$1 ORDER BY l.updated_at DESC LIMIT 100`, [user.id]);
    return { trades: rows.map(r => ({ id: r.id, price: n(r.price), status: r.status, fee: n(r.fee), tx: r.tx_id, at: n(r.ms), role: n(r.seller_id) === user.id ? 'seller' : 'buyer', seller: r.seller, buyer: r.buyer, plate: { id: r.pid, country: r.country || 'RU', letters: r.letters, digits: r.digits, region: r.region, tier: r.tier } })) };
  }, { auth: true });

  const priceOk = v => Number.isInteger(v) && v >= 1 && v <= 10000000;
  R('POST', '/api/market/listings', async ({ user, body }) => {
    const price = Number(body.price); if (!priceOk(price)) throw bad('Введите целую цену от 1 до 10 000 000 PLT.');
    return tx(async Q => {
      const [p] = await Q('SELECT id,owner_id,status FROM plates WHERE id=$1 FOR UPDATE', [String(body.plateId || '')]);
      if (!p || n(p.owner_id) !== user.id || p.status === 'BANKED') throw new HttpError(404, 'Этого номера нет в вашей коллекции.');
      if (p.status === 'LISTED') throw new HttpError(409, 'Этот номер уже выставлен.');
      const id = newId('L');
      await Q(`INSERT INTO listings(id,plate_id,seller_id,price,status) VALUES($1,$2,$3,$4,'ACTIVE')`, [id, p.id, user.id, price]);
      await Q(`UPDATE plates SET status='LISTED' WHERE id=$1`, [p.id]);
      await addEvent(Q, { plate_id: p.id, kind: 'LISTED', from_user: user.id, price });
      return { listing: { id, price, status: 'ACTIVE' } };
    });
  }, { auth: true });

  R('PATCH', '/api/market/listings/:id', async ({ user, body, params }) => {
    const price = Number(body.price); if (!priceOk(price)) throw bad('Введите целую цену от 1 до 10 000 000 PLT.');
    return tx(async Q => {
      const [l] = await Q('SELECT id,plate_id,seller_id,status FROM listings WHERE id=$1 FOR UPDATE', [params.id]);
      if (!l || n(l.seller_id) !== user.id) throw new HttpError(404, 'Объявление не найдено.');
      if (l.status !== 'ACTIVE') throw new HttpError(409, `Объявление уже не активно (${l.status}) — изменить нельзя.`);
      await Q('UPDATE listings SET price=$1, updated_at=now() WHERE id=$2', [price, l.id]);
      await addEvent(Q, { plate_id: l.plate_id, kind: 'PRICE_CHANGED', from_user: user.id, price });
      return { listing: { id: l.id, price, status: 'ACTIVE' } };
    });
  }, { auth: true });

  R('DELETE', '/api/market/listings/:id', async ({ user, params }) => tx(async Q => {
    const [l] = await Q('SELECT id,plate_id,seller_id,status FROM listings WHERE id=$1 FOR UPDATE', [params.id]);
    if (!l || n(l.seller_id) !== user.id) throw new HttpError(404, 'Объявление не найдено.');
    if (l.status !== 'ACTIVE') throw new HttpError(409, `Объявление уже не активно (${l.status}) — снять нельзя.`);
    await Q(`UPDATE listings SET status='CANCELLED', updated_at=now() WHERE id=$1`, [l.id]);
    await Q(`UPDATE plates SET status='OWNED' WHERE id=$1`, [l.plate_id]);
    await addEvent(Q, { plate_id: l.plate_id, kind: 'DELISTED', from_user: user.id });
    return { ok: true };
  }), { auth: true });

  R('POST', '/api/market/listings/:id/buy', async ({ user, params, req, body }) => {
    needSecret();
    return withIdem(user, req, () => tx(async Q => {
      // 1. lock the listing; only one buyer can move it from ACTIVE to RESERVED
      const [l] = await Q('SELECT id,plate_id,seller_id,price,status FROM listings WHERE id=$1 FOR UPDATE', [params.id]);
      if (!l) throw new HttpError(404, 'Объявление не найдено.');
      if (l.status !== 'ACTIVE') throw new HttpError(409, l.status === 'SOLD' ? 'Этот номер уже продан.' : 'Объявление больше недоступно.');
      if (n(l.seller_id) === user.id) throw new HttpError(409, 'Нельзя купить своё объявление.');
      const price = n(l.price);
      if (body.expectedPrice != null && Number(body.expectedPrice) !== price) throw new HttpError(409, `Продавец изменил цену на ${price} PLT. Проверьте и подтвердите снова.`, { price });
      await Q(`UPDATE listings SET status='RESERVED', updated_at=now() WHERE id=$1`, [l.id]);
      // 2. find the treasury (fee recipient) and lock all accounts in id order to avoid deadlocks
      const tre = await treasuryId(Q);
      const ids = [...new Set([user.id, n(l.seller_id), tre].filter(Boolean))];
      const accts = await Q('SELECT id,balance FROM users WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE', ['{' + ids.join(',') + '}']);
      const buyer = accts.find(a => n(a.id) === user.id);
      if (n(buyer.balance) < price) throw new HttpError(402, `Не хватает PLT: цена ${price} PLT, на балансе ${n(buyer.balance)} PLT.`);
      const [p] = await Q('SELECT id,country,letters,digits,region,owner_id,status FROM plates WHERE id=$1 FOR UPDATE', [l.plate_id]);
      if (n(p.owner_id) !== n(l.seller_id) || p.status !== 'LISTED') throw new HttpError(409, 'Этот номер больше недоступен.');
      const fee = Math.round(price * ST.marketFee);
      const debit = await ledger(Q, user.id, 'market_buy', -price, `Покупка ${plateStr(p)} · ${l.id}`, l.id);
      const credit = await ledger(Q, n(l.seller_id), 'market_sale', price - fee, `Продажа ${plateStr(p)} · ${l.id} (комиссия ${fee} PLT)`, l.id);
      if (tre && fee > 0) await ledger(Q, tre, 'market_fee', fee, `Комиссия рынка ${Math.round(ST.marketFee * 1000) / 10}% · ${plateStr(p)} · ${l.id}`, l.id);
      await Q(`UPDATE plates SET owner_id=$1, status='OWNED', last_tx_id=$2, paid=$4 WHERE id=$3`, [user.id, debit.id, p.id, price]);
      await Q(`UPDATE listings SET status='SOLD', buyer_id=$1, fee=$2, tx_id=$3, sold_at=now(), updated_at=now() WHERE id=$4`, [user.id, fee, debit.id, l.id]);
      await addEvent(Q, { plate_id: p.id, kind: 'TRANSFERRED', from_user: n(l.seller_id), to_user: user.id, price, tx_id: debit.id });
      void credit;
      return { ok: true, plateId: p.id, price, balance: debit.balance, txId: debit.id };
    }));
  }, { auth: true });

  // ---- people ----
  R('GET', '/api/users/:nick', async ({ params }) => {
    const [u] = await q(`SELECT id,nickname,(extract(epoch from created_at)*1000)::bigint AS ms FROM users WHERE nick_norm=$1`, [String(params.nick).toLowerCase()]);
    if (!u) throw new HttpError(404, 'Коллекционер с таким ником не найден.');
    const [s] = await q(`SELECT count(*)::int AS plates, coalesce(sum(value),0)::bigint AS value, count(DISTINCT region)::int AS regions FROM plates WHERE owner_id=$1 AND status<>'BANKED'`, [u.id]);
    const [t] = await q(`SELECT count(*)::int AS sold FROM listings WHERE seller_id=$1 AND status='SOLD'`, [u.id]);
    const top = await q(`SELECT ${PLATE_COLS} FROM plates p WHERE owner_id=$1 AND status<>'BANKED' ORDER BY value DESC LIMIT 8`, [u.id]);
    const sets = (await q(`SELECT ref FROM ledger WHERE user_id=$1 AND kind='reward' AND ref LIKE 'set:%'`, [u.id])).map(r => r.ref.slice(4));
    const medals = (await medalsMap())[n(u.id)] || [];
    return { profile: { nickname: u.nickname, joined: n(u.ms), plates: n(s.plates), value: n(s.value), regions: n(s.regions), sold: n(t.sold), top: top.map(plateRow), sets, medals } };
  });
  // ---- rankings: several boards; medals (top-10, top-3) come from the main board (account value) ----
  async function rankStats() {
    return q(`SELECT u.id,u.nickname,
        CASE WHEN u.role='admin' THEN GREATEST(0, u.balance - coalesce((SELECT sum(amount) FROM ledger WHERE user_id=u.id AND kind='admin_grant'),0)) ELSE u.balance END::bigint AS balance,
        coalesce((SELECT sum(value) FROM plates WHERE owner_id=u.id AND status IN ('OWNED','LISTED')),0)::bigint AS pvalue,
        (SELECT count(*) FROM plates WHERE owner_id=u.id AND status IN ('OWNED','LISTED'))::int AS plates,
        (SELECT coalesce(-sum(amount),0) FROM ledger WHERE user_id=u.id AND kind='case_open')::bigint AS xp,
        (SELECT count(*) FROM battles b JOIN battle_seats s ON s.battle_id=b.id AND s.seat=b.winner_seat WHERE b.status='DONE' AND s.user_id=u.id)::int AS wins,
        (SELECT count(*) FROM ledger WHERE user_id=u.id AND kind='reward' AND ref LIKE 'set:%')::int AS sets,
        (SELECT p2.id FROM plates p2 WHERE p2.owner_id=u.id AND p2.status IN ('OWNED','LISTED') ORDER BY p2.value DESC LIMIT 1) AS best,
        coalesce((SELECT max(value) FROM plates WHERE owner_id=u.id AND status IN ('OWNED','LISTED')),0)::bigint AS bestv
      FROM users u WHERE u.role IN ('user','admin') AND u.blocked_at IS NULL`);
  }
  let medalCache = { at: 0, map: {} };
  async function medalsMap() {
    if (now() - medalCache.at < 30000) return medalCache.map;
    const rows = (await rankStats()).map(r => ({ id: n(r.id), total: n(r.balance) + n(r.pvalue) })).sort((a, b) => b.total - a.total);
    const map = {}; rows.slice(0, 10).forEach((r, i) => { if (r.total > 0) map[r.id] = i < 3 ? ['top10', 'top3'] : ['top10']; });
    const act = await q(`SELECT user_id,
        count(*) FILTER (WHERE kind IN ('market_buy','market_sale'))::int AS deals,
        coalesce(-sum(amount) FILTER (WHERE amount < 0 AND kind IN ('case_open','market_buy','battle_entry','auction_bid','trade')),0)::bigint AS spent,
        coalesce(sum(amount) FILTER (WHERE kind IN ('market_sale','bank_sell','dealer_sell')),0)::bigint AS earned,
        coalesce(-sum(amount) FILTER (WHERE kind='case_open'),0)::bigint AS xp
      FROM ledger GROUP BY user_id`);
    const R = MEDAL_RULES;
    for (const a of act) {
      const id = n(a.user_id), m = map[id] ? [...map[id]] : [], lv = levelOf(n(a.xp)).level;
      if (n(a.deals) >= R.trader) m.push('trader');
      if (n(a.spent) >= R.spender) m.push('spender');
      if (n(a.earned) >= R.earner) m.push('earner');
      if (lv >= R.lv100) m.push('lv100'); else if (lv >= R.lv50) m.push('lv50');
      if (m.length) map[id] = m;
    }
    medalCache = { at: now(), map }; return map;
  }
  R('GET', '/api/rankings', async ({ url }) => {
    const by = ['total', 'collection', 'level', 'battles', 'sets', 'best'].includes(url.searchParams.get('by')) ? url.searchParams.get('by') : 'total';
    const rows = (await rankStats()).map(r => ({ id: n(r.id), nickname: r.nickname, balance: n(r.balance), value: n(r.pvalue), plates: n(r.plates), total: n(r.balance) + n(r.pvalue), xp: n(r.xp), level: levelOf(n(r.xp)).level, wins: n(r.wins), sets: n(r.sets), bestValue: n(r.bestv), best: r.best }));
    const key = { total: 'total', collection: 'value', level: 'xp', battles: 'wins', sets: 'sets', best: 'bestValue' }[by];
    const medals = await medalsMap();
    const top = rows.filter(r => r[key] > 0 || by === 'total').sort((a, b) => b[key] - a[key] || b.total - a.total).slice(0, 50);
    const bestIds = top.map(r => r.best).filter(Boolean);
    const best = bestIds.length ? await q(`SELECT ${PLATE_COLS} FROM plates p WHERE p.id = ANY($1::text[])`, ['{' + bestIds.join(',') + '}']) : [];
    const B = Object.fromEntries(best.map(r => [r.id, plateRow(r)]));
    return { by, players: rows.length, rankings: top.map(({ id, best: bid, ...r }) => ({ ...r, best: B[bid] || null, medals: medals[id] || [] })) };
  });

  // ---- wallet & payments ----
  R('GET', '/api/wallet', async ({ user, url }) => {
    const lim = url.searchParams.get('all') ? 500 : 20;
    const tx_ = await q(`SELECT id,kind,amount,balance_after,label,ref,(extract(epoch from created_at)*1000)::bigint AS ms FROM ledger WHERE user_id=$1 ORDER BY created_at DESC, id DESC LIMIT ${lim}`, [user.id]);
    const pays = await q(`SELECT id,provider,package_id,currency,amount_minor,plt,status,(extract(epoch from created_at)*1000)::bigint AS ms FROM payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [user.id]);
    return { balance: user.balance, ledger: tx_.map(t => ({ id: t.id, kind: t.kind, amount: n(t.amount), balance: n(t.balance_after), label: t.label, ref: t.ref, at: n(t.ms) })), payments: pays.map(p => ({ id: p.id, provider: p.provider, package: p.package_id, currency: p.currency, amount: n(p.amount_minor), plt: n(p.plt), status: p.status, at: n(p.ms) })) };
  }, { auth: true });

  R('POST', '/api/payments/checkout', async ({ user, body, req }) => {
    if (!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)) throw new HttpError(503, 'Пополнение пока не включено: на сайте не подключён ни один способ оплаты.');
    const pkg = PACKAGES.find(p => p.id === body.packageId); const cur = String(body.currency || '');
    if (!pkg || !CURRENCIES.includes(cur)) throw bad('Выберите пакет и валюту.');
    const id = newId('PAY'); const amount = pkg.price[cur];
    await q(`INSERT INTO payments(id,user_id,provider,package_id,currency,amount_minor,plt,status) VALUES($1,$2,'stripe',$3,$4,$5,$6,'PENDING')`, [id, user.id, pkg.id, cur, amount, pkg.plt]);
    const site = siteUrl(req);
    const form = new URLSearchParams({ mode: 'payment', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': cur.toLowerCase(), 'line_items[0][price_data][unit_amount]': String(amount), 'line_items[0][price_data][product_data][name]': `${pkg.plt} PLT · Plate Club`, success_url: `${site}/#/wallet?payment=${id}`, cancel_url: `${site}/#/wallet?payment=${id}`, client_reference_id: id, 'metadata[payment_id]': id });
    const r = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded', 'idempotency-key': id }, body: form });
    const s = await r.json();
    if (!r.ok) { await q(`UPDATE payments SET status='FAILED', updated_at=now() WHERE id=$1`, [id]); throw new HttpError(502, 'Платёжный сервис не начал оплату. Деньги не списаны.'); }
    await q('UPDATE payments SET provider_ref=$1 WHERE id=$2', [s.id, id]);
    return { paymentId: id, url: s.url };
  }, { auth: true });

  R('POST', '/api/payments/webhook/stripe', async ({ raw, req }) => {
    const secret = env.STRIPE_WEBHOOK_SECRET; if (!secret) throw new HttpError(503, 'Not configured.');
    const sig = req.headers.get('stripe-signature') || ''; const parts = Object.fromEntries(sig.split(',').map(kv => kv.split('=')));
    const t = Number(parts.t); const v1 = sig.split(',').filter(x => x.startsWith('v1=')).map(x => x.slice(3));
    const exp = createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
    const ok = v1.some(s => s.length === exp.length && timingSafeEqual(Buffer.from(s), Buffer.from(exp)));
    if (!ok || Math.abs(now() / 1000 - t) > 300) throw new HttpError(400, 'Invalid signature.');
    const ev = JSON.parse(raw); const obj = ev.data && ev.data.object || {};
    const pid = obj.metadata && obj.metadata.payment_id; if (!pid) return { received: true };
    if (ev.type === 'checkout.session.completed' && obj.payment_status === 'paid') {
      await tx(async Q => {
        const [p] = await Q('SELECT id,user_id,plt,status,amount_minor,currency FROM payments WHERE id=$1 FOR UPDATE', [pid]);
        if (!p || p.status === 'PAID') return;
        if (n(obj.amount_total) !== n(p.amount_minor) || String(obj.currency).toUpperCase() !== p.currency) { await Q(`UPDATE payments SET status='FAILED', updated_at=now() WHERE id=$1`, [pid]); return; }
        const led = await ledger(Q, n(p.user_id), 'topup', n(p.plt), `Пополнение ${n(p.plt)} PLT · ${pid}`, pid);
        await Q(`UPDATE payments SET status='PAID', credited_tx_id=$1, updated_at=now() WHERE id=$2`, [led.id, pid]);
      });
    } else if (ev.type === 'checkout.session.expired') {
      await q(`UPDATE payments SET status='EXPIRED', updated_at=now() WHERE id=$1 AND status='PENDING'`, [pid]);
    }
    return { received: true };
  }, { raw: true });


  // ---- perks: promo codes, daily bonus, achievement rewards ----
  async function userStats(Q, uid) {
    const [s] = await Q(`SELECT
      (SELECT count(*) FROM ledger WHERE user_id=$1 AND kind='case_open')::int AS opened,
      (SELECT count(*) FROM ledger WHERE user_id=$1 AND kind='market_buy')::int AS bought,
      (SELECT count(*) FROM ledger WHERE user_id=$1 AND kind='market_sale')::int AS sold,
      (SELECT count(*) FROM listings WHERE seller_id=$1)::int AS listed,
      (SELECT count(*) FROM plates WHERE owner_id=$1 AND status<>'BANKED')::int AS plates,
      (SELECT count(DISTINCT country || region) FROM plates WHERE owner_id=$1 AND status<>'BANKED')::int AS regions,
      (SELECT count(DISTINCT country) FROM plates WHERE owner_id=$1 AND status<>'BANKED')::int AS countries,
      (SELECT count(*) FROM plates WHERE owner_id=$1 AND status<>'BANKED' AND copy=2)::int AS twins,
      (SELECT coalesce(max(CASE tier WHEN 'common' THEN 0 WHEN 'fine' THEN 1 WHEN 'rare' THEN 2 WHEN 'elite' THEN 3 ELSE 4 END),-1) FROM plates WHERE owner_id=$1)::int AS maxtier`, [uid]);
    return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, n(v)]));
  }
  R('POST', '/api/promo/redeem', async ({ user, body }) => {
    const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 3) throw bad('Введите промокод.');
    await throttle('promo:' + user.id, 12, 10); await attempt('promo:' + user.id);
    return tx(async Q => {
      const [pc] = await Q('SELECT code,amount,max_uses,uses,expires_at,active FROM promo_codes WHERE code=$1 FOR UPDATE', [code]);
      if (!pc || !bool(pc.active)) throw new HttpError(404, 'Такого промокода нет или он выключен.');
      if (pc.expires_at && new Date(pc.expires_at).getTime() < now()) throw new HttpError(410, 'Срок действия промокода закончился.');
      if (pc.max_uses != null && n(pc.uses) >= n(pc.max_uses)) throw new HttpError(410, 'Промокод уже использовали максимальное число раз.');
      const [used] = await Q('SELECT 1 FROM promo_redemptions WHERE code=$1 AND user_id=$2', [code, user.id]);
      if (used) throw new HttpError(409, 'Вы уже активировали этот промокод.');
      const led = await ledger(Q, user.id, 'promo', n(pc.amount), `Промокод ${code}`, 'promo:' + code);
      await Q('INSERT INTO promo_redemptions(code,user_id,tx_id) VALUES($1,$2,$3)', [code, user.id, led.id]);
      await Q('UPDATE promo_codes SET uses=uses+1 WHERE code=$1', [code]);
      return { ok: true, code, amount: n(pc.amount), balance: led.balance };
    });
  }, { auth: true });

  const bool = v => v === true || v === 't' || v === 'true';
  const dayKey = ts => 'D' + Math.floor(ts / 86400000);
  async function dailyState(Q, uid) {
    const rows = await Q(`SELECT ref FROM ledger WHERE user_id=$1 AND kind='daily_bonus' ORDER BY created_at DESC LIMIT 8`, [uid]);
    const days = rows.map(r => parseInt(String(r.ref).slice(1), 10));
    const today = Math.floor(now() / 86400000);
    const claimed = days[0] === today;
    let streak = 0; let d = claimed ? today : today - 1;
    for (const x of days) { if (x === d) { streak++; d--; } else if (x < d) break; }
    const next = claimed ? streak : streak + 1;
    return { claimed, streak, amount: dailyAmount(streak + 1, ST.dailyBonus), ladder: dailyLadder(ST.dailyBonus), nextAt: (today + 1) * 86400000 };
  }
  R('GET', '/api/perks', async ({ user }) => {
    const daily = await dailyState(q, user.id);
    const s = await userStats(q, user.id);
    const got = new Set((await q(`SELECT ref FROM ledger WHERE user_id=$1 AND kind='reward'`, [user.id])).map(r => r.ref));
    const [x] = await q(`SELECT coalesce(-sum(amount),0)::bigint AS xp FROM ledger WHERE user_id=$1 AND kind='case_open'`, [user.id]);
    const lv = levelOf(n(x.xp)); const paid = (await q(`SELECT count(*)::int AS c FROM ledger WHERE user_id=$1 AND kind='reward' AND ref LIKE 'lvl:%'`, [user.id]))[0];
    lv.unclaimed = Math.max(0, lv.level - 1 - n(paid.c)); lv.reward = LEVEL_REWARD;
    return { daily, level: lv, telegram: got.has('tg-join'), stats: s, achievements: ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, text: a.text, reward: a.reward, done: a.ok(s), claimed: got.has('ach:' + a.id) })) };
  }, { auth: true });
  R('POST', '/api/perks/daily', async ({ user }) => tx(async Q => {
    await Q('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
    const st = await dailyState(Q, user.id);
    if (st.claimed) throw new HttpError(409, 'Бонус за сегодня уже получен. Следующий — после 03:00 по Москве.');
    const streak = st.streak + 1; const amount = dailyAmount(streak, ST.dailyBonus);
    const led = await ledger(Q, user.id, 'daily_bonus', amount, `Ежедневный бонус · день ${streak}`, dayKey(now()));
    return { ok: true, amount, streak, balance: led.balance };
  }), { auth: true });
  // one-time reward for joining the players' Telegram chat (can't be verified — once per account)
  R('POST', '/api/perks/telegram', async ({ user }) => tx(async Q => {
    await Q('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
    const [done] = await Q(`SELECT 1 FROM ledger WHERE user_id=$1 AND ref='tg-join'`, [user.id]);
    if (done) throw new HttpError(409, 'Награда за Telegram уже получена.');
    const led = await ledger(Q, user.id, 'reward', TELEGRAM.reward, 'Вступление в Telegram-чат игроков', 'tg-join');
    return { ok: true, amount: TELEGRAM.reward, balance: led.balance };
  }), { auth: true });
  // ---- invite a friend ----
  R('GET', '/api/referral', async ({ user, req }) => {
    const code = await tx(Q => ensureRefCode(Q, user.id));
    const rows = await q(`SELECT u.nickname,(extract(epoch from u.created_at)*1000)::bigint AS at,
        (SELECT count(*) FROM ledger WHERE user_id=u.id AND kind='case_open')::int AS opens,
        EXISTS(SELECT 1 FROM ledger WHERE kind='referral' AND ref='ref:' || u.id AND amount > 0) AS paid,
        EXISTS(SELECT 1 FROM ledger WHERE kind='referral' AND ref='refsu:' || u.id) AS joinpaid
      FROM users u WHERE u.referred_by=$1 ORDER BY u.created_at DESC LIMIT 100`, [user.id]);
    const [e] = await q(`SELECT coalesce(sum(amount),0)::bigint AS s FROM ledger WHERE user_id=$1 AND kind='referral'`, [user.id]);
    const friends = rows.map(r => ({ nickname: r.nickname, at: n(r.at), opens: n(r.opens), paid: r.paid === true || r.paid === 't', joinPaid: r.joinpaid === true || r.joinpaid === 't' }));
    const active = friends.filter(f => f.paid).length;
    return {
      code, nick: user.nickname,
      link: `${siteUrl(req)}/i/${encodeURIComponent(user.nickname)}`,
      codeLink: `${siteUrl(req)}/?ref=${code}`,
      friends, earned: n(e.s), joined: friends.length, active,
      milestones: REFERRAL.milestones.map(([need, bonus]) => ({ need, bonus, done: active >= need })),
      next: refNext(active),
      reward: { friend: REFERRAL.friend, inviter: REFERRAL.inviter, signupInviter: REFERRAL.signupInviter, signupFriend: REFERRAL.signupFriend, needOpens: REFERRAL.needOpens },
    };
  }, { auth: true });

  // ---- social quests (story / TikTok), checked by an admin ----
  const cleanUrl = v => { const u = String(v || '').trim().slice(0, 400); return /^https:\/\/[^\s]+\.[^\s]{2,}/i.test(u) ? u : ''; };
  R('GET', '/api/quests', async ({ user }) => {
    const rows = await q(`SELECT id,kind,url,handle,status,views,amount,reason,(extract(epoch from created_at)*1000)::bigint AS at FROM quests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [user.id]);
    return { quests: rows.map(r => ({ id: r.id, kind: r.kind, url: r.url, handle: r.handle, status: r.status, views: r.views == null ? null : n(r.views), amount: r.amount == null ? null : n(r.amount), reason: r.reason, at: n(r.at) })), rules: { story: QUESTS.story.reward, perView: QUESTS.tiktok.perView, maxPerVideo: QUESTS.tiktok.maxPerVideo } };
  }, { auth: true });
  R('POST', '/api/quests', async ({ user, body }) => {
    const kind = body.kind === 'tiktok' ? 'tiktok' : body.kind === 'story' ? 'story' : null;
    if (!kind) throw bad('Выберите задание.');
    const url = cleanUrl(body.url); if (!url) throw bad('Пришлите ссылку целиком, она должна начинаться с https://', { fields: { url: 'Нужна ссылка вида https://…' } });
    const handle = cleanText(body.handle, 80);
    if (!handle) throw bad('Укажите свой аккаунт — он должен быть открытым, чтобы мы увидели публикацию.', { fields: { handle: 'Укажите ваш аккаунт.' } });
    await throttle('quest:' + user.id, 10, 1440); await attempt('quest:' + user.id);
    const [dup] = await q(`SELECT 1 FROM quests WHERE user_id=$1 AND url=$2 AND status<>'REJECTED'`, [user.id, url]);
    if (dup) throw new HttpError(409, 'Эта ссылка уже отправлена на проверку.');
    if (kind === 'story') {
      const [recent] = await q(`SELECT 1 FROM quests WHERE user_id=$1 AND kind='story' AND status='PAID' AND created_at > now() - ($2 || ' days')::interval`, [user.id, String(QUESTS.story.cooldownDays)]);
      if (recent) throw new HttpError(409, `Награду за сторис можно получать раз в ${QUESTS.story.cooldownDays} дней.`);
    }
    const id = newId('QS');
    await q('INSERT INTO quests(id,user_id,kind,url,handle,note) VALUES($1,$2,$3,$4,$5,$6)', [id, user.id, kind, url, handle, cleanText(body.note, 500)]);
    return { ok: true, id };
  }, { auth: true });

  R('GET', '/api/admin/quests', async ({ url }) => {
    const st = ['PENDING', 'PAID', 'REJECTED'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'PENDING';
    const rows = await q(`SELECT q.*, u.nickname,(extract(epoch from q.created_at)*1000)::bigint AS at FROM quests q JOIN users u ON u.id=q.user_id WHERE q.status=$1 ORDER BY q.created_at DESC LIMIT 100`, [st]);
    const [p] = await q(`SELECT count(*)::int AS c FROM quests WHERE status='PENDING'`);
    return { status: st, pending: n(p.c), quests: rows.map(r => ({ id: r.id, userId: n(r.user_id), nickname: r.nickname, kind: r.kind, url: r.url, handle: r.handle, note: r.note, status: r.status, views: r.views == null ? null : n(r.views), amount: r.amount == null ? null : n(r.amount), reason: r.reason, at: n(r.at) })) };
  }, { admin: true });
  R('POST', '/api/admin/quests/:id', async ({ user, params, body }) => {
    const approve = !!body.approve;
    const reason = cleanText(body.reason, 200);
    if (!approve && !reason) throw bad('Укажите причину — игрок её увидит.');
    const views = Math.max(0, Math.min(100_000_000, parseInt(body.views, 10) || 0));
    return tx(async Q => {
      const [qs] = await Q(`SELECT * FROM quests WHERE id=$1 FOR UPDATE`, [params.id]);
      if (!qs) throw new HttpError(404, 'Заявка не найдена.');
      if (qs.status !== 'PENDING') throw new HttpError(409, 'Эта заявка уже рассмотрена.');
      if (!approve) {
        await Q(`UPDATE quests SET status='REJECTED', reason=$1, reviewed_by=$2, updated_at=now() WHERE id=$3`, [reason, user.id, qs.id]);
        await adminLog(Q, user.id, 'quest_reject', String(qs.user_id), null, reason);
        return { ok: true, status: 'REJECTED' };
      }
      const amount = qs.kind === 'story' ? QUESTS.story.reward : Math.min(QUESTS.tiktok.maxPerVideo, views * QUESTS.tiktok.perView);
      if (amount < 1) throw bad('Укажите количество просмотров.');
      await ledger(Q, n(qs.user_id), 'quest', amount, qs.kind === 'story' ? 'Задание: сторис с отметкой Plate Club' : `Задание: TikTok · ${fmtInt(views)} просмотров`, 'quest:' + qs.id);
      await Q(`UPDATE quests SET status='PAID', views=$1, amount=$2, reason=$3, reviewed_by=$4, updated_at=now() WHERE id=$5`, [qs.kind === 'tiktok' ? views : null, amount, reason || null, user.id, qs.id]);
      await adminLog(Q, user.id, 'quest_pay', String(qs.user_id), amount, qs.kind);
      return { ok: true, status: 'PAID', amount };
    });
  }, { admin: true });

  R('POST', '/api/perks/level/claim', async ({ user }) => tx(async Q => {
    await Q('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
    const [x] = await Q(`SELECT coalesce(-sum(amount),0)::bigint AS xp FROM ledger WHERE user_id=$1 AND kind='case_open'`, [user.id]);
    const lv = levelOf(n(x.xp)); const done = new Set((await Q(`SELECT ref FROM ledger WHERE user_id=$1 AND kind='reward' AND ref LIKE 'lvl:%'`, [user.id])).map(r => r.ref));
    let paid = 0, bal = null;
    for (let l = 2; l <= lv.level; l++) if (!done.has('lvl:' + l)) { const led = await ledger(Q, user.id, 'reward', LEVEL_REWARD, `Уровень ${l}`, 'lvl:' + l); paid += LEVEL_REWARD; bal = led.balance; }
    if (!paid) throw new HttpError(409, 'Новых наград за уровень нет.');
    return { ok: true, amount: paid, level: lv.level, balance: bal };
  }), { auth: true });

  // ---- upgrade: burn one plate for a chance at a higher tier; the roll is decided here ----
  R('POST', '/api/upgrade', async ({ user, body, req }) => {
    needSecret();
    const tierIdx = TI[body.target]; if (tierIdx == null) throw bad('Выберите редкость, до которой улучшить.');
    return withIdem(user, req, () => tx(async Q => {
      // one or two plates; the chance grows with their combined value
      const wantIds = [...new Set((Array.isArray(body.plateIds) ? body.plateIds : [body.plateId]).map(x => String(x || '')).filter(Boolean))];
      if (!wantIds.length || wantIds.length > UPGRADE_MAX_PLATES) throw bad(`Выберите от 1 до ${UPGRADE_MAX_PLATES} номеров.`);
      const got = await Q('SELECT id,country,letters,digits,region,tier,value,status,owner_id FROM plates WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE', ['{' + wantIds.join(',') + '}']);
      for (const id of wantIds) {
        const x = got.find(r => r.id === id);
        if (!x || n(x.owner_id) !== user.id || x.status !== 'OWNED') throw new HttpError(x && x.status === 'LISTED' ? 409 : 404, x && x.status === 'LISTED' ? 'Сначала снимите номер с рынка.' : 'Этого номера нет в вашей коллекции.');
      }
      const burn = got.sort((a, b) => n(b.value) - n(a.value)); const p = burn[0];
      if (burn.some(x => tierIdx <= TI[x.tier])) throw bad('Цель должна быть редче каждого выбранного номера.');
      const tv = targetValue(p, body.target); const chance = upgradeChance(burn.reduce((a, x) => a + n(x.value), 0), tv);
      const roll = randomInt(0, 1_000_000) / 1_000_000; const success = roll < chance;
      for (const x of burn) {
        await Q(`UPDATE plates SET status='BURNED', owner_id=NULL WHERE id=$1`, [x.id]);
        await addEvent(Q, { plate_id: x.id, kind: 'UPGRADED', from_user: user.id });
      }
      let plate = null; const upId = newId('UP');
      if (success) {
        const pool = p.country === 'BY' ? { RU: [], BY: [p.region] } : { RU: [p.region], BY: [] };
        for (let i = 0; i < 40 && !plate; i++) {
          const g = genPlate(body.target, pool); const np = { ...g, id: newId('PC'), combo: comboKey(g), value: plateValue(g), mintTx: upId }; np.seal = seal(np);
          const rows = await Q(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,last_tx_id,seal,country,copy)
            SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,'OWNED',$10,$11,$12,$13, c.n + 1 FROM (SELECT count(*)::int AS n FROM plates WHERE combo=$5) c WHERE c.n < 2
            ON CONFLICT DO NOTHING RETURNING copy,(extract(epoch from created_at)*1000)::bigint AS created_ms`,
            [np.id, np.letters, np.digits, np.region, np.combo, np.tier, np.pattern, np.value, user.id, `Апгрейд из ${p.id}`, upId, np.seal, np.country]);
          if (rows.length) plate = { ...np, copy: n(rows[0].copy), created: n(rows[0].created_ms) };
        }
        if (!plate) throw new HttpError(503, 'Не удалось выпустить номер. Ничего не списано, попробуйте ещё раз.');
        await addEvent(Q, { plate_id: plate.id, kind: 'MINTED', to_user: user.id, tx_id: upId });
      }
      await Q('INSERT INTO upgrades(id,user_id,from_plate,to_plate,target_tier,chance,roll,success,extra_plate) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [upId, user.id, p.id, plate ? plate.id : null, body.target, chance, roll, success, burn[1] ? burn[1].id : null]);
      const out = plate ? (({ seal: _s, mintTx: _m, combo: _c, ...pub }) => ({ ...pub, status: 'OWNED', origin: `Апгрейд из ${p.id}`, lastTx: upId }))(plate) : null;
      return { id: upId, success, chance, roll, target: body.target, plate: out, burned: p.id, burnedAll: burn.map(x => x.id) };
    }));
  }, { auth: true });

  R('POST', '/api/perks/achievements/:id/claim', async ({ user, params }) => tx(async Q => {
    const a = ACHIEVEMENTS.find(x => x.id === params.id); if (!a) throw new HttpError(404, 'Такого достижения нет.');
    await Q('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
    if (!a.ok(await userStats(Q, user.id))) throw new HttpError(409, 'Условие достижения ещё не выполнено.');
    const [done] = await Q(`SELECT 1 FROM ledger WHERE user_id=$1 AND kind='reward' AND ref=$2`, [user.id, 'ach:' + a.id]);
    if (done) throw new HttpError(409, 'Награда уже получена.');
    const led = await ledger(Q, user.id, 'reward', a.reward, `Достижение «${a.name}»`, 'ach:' + a.id);
    return { ok: true, amount: a.reward, balance: led.balance };
  }), { auth: true });

  // ---- admin ----
  const ADMIN_GRANT_MAX = 100_000_000;
  const adminLog = (Q, adminId, action, target, amount, reason) => Q('INSERT INTO admin_log(admin_id,action,target,amount,reason) VALUES($1,$2,$3,$4,$5)', [adminId, action, target ?? null, amount ?? null, reason ?? null]);
  R('POST', '/api/admin/claim', async ({ user, body }) => {
    const code = String(env.ADMIN_SETUP_CODE || '');
    if (code.length < 16) throw new HttpError(503, 'Админ-доступ на этом сайте не включён.');
    if (user.role === 'admin') return { ok: true, role: 'admin', granted: 0 };
    // The setup code works only until the site has its first admin: after that it is dead, even if it leaks.
    // More admins are appointed by an existing admin from the panel (or set ADMIN_ALLOW_EXTRA=1).
    const [has] = await q(`SELECT 1 FROM users WHERE role='admin' LIMIT 1`);
    if (has && env.ADMIN_ALLOW_EXTRA !== '1') throw new HttpError(403, 'Администратор у сайта уже назначен. Код больше не действует.');
    await throttle('claim:' + user.id, 5, 60); await attempt('claim:' + user.id);
    const given = Buffer.from(String(body.code || '')), want = Buffer.from(code);
    if (given.length !== want.length || !timingSafeEqual(given, want)) throw new HttpError(403, 'Неверный код.');
    const initial = Math.max(0, Math.min(ADMIN_GRANT_MAX, parseInt(env.ADMIN_INITIAL_GRANT || '0', 10) || 0));
    return tx(async Q => {
      await Q(`UPDATE users SET role='admin' WHERE id=$1`, [user.id]);
      let granted = 0;
      const [done] = await Q(`SELECT 1 FROM ledger WHERE user_id=$1 AND kind='admin_grant' AND ref='admin-initial'`, [user.id]);
      if (initial && !done) { await ledger(Q, user.id, 'admin_grant', initial, 'Стартовый баланс администратора', 'admin-initial'); granted = initial; }
      await adminLog(Q, user.id, 'claim_admin', user.nickname, granted || null, null);
      return { ok: true, role: 'admin', granted };
    });
  }, { auth: true });

  R('GET', '/api/admin/overview', async () => {
    const [o] = await q(`SELECT (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM plates WHERE status<>'BANKED')::int AS plates,
      (SELECT count(*) FROM listings WHERE status='ACTIVE')::int AS active, (SELECT count(*) FROM listings WHERE status='SOLD')::int AS sold,
      (SELECT coalesce(sum(price),0) FROM listings WHERE status='SOLD')::bigint AS volume, (SELECT coalesce(sum(amount),0) FROM ledger WHERE kind='market_fee')::bigint AS fees,
      (SELECT coalesce(sum(balance),0) FROM users WHERE role='user')::bigint AS user_plt, (SELECT coalesce(sum(balance),0) FROM users WHERE role='admin')::bigint AS admin_plt,
      (SELECT count(*) FROM ledger WHERE kind='case_open')::int AS opens, (SELECT count(*) FROM upgrades)::int AS upgrades`);
    const log = await q(`SELECT l.action,l.target,l.amount,l.reason,(extract(epoch from l.created_at)*1000)::bigint AS ms,u.nickname FROM admin_log l JOIN users u ON u.id=l.admin_id ORDER BY l.id DESC LIMIT 30`);
    return { overview: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, n(v)])), log: log.map(r => ({ action: r.action, target: r.target, amount: n(r.amount), reason: r.reason, at: n(r.ms), admin: r.nickname })) };
  }, { admin: true });

  R('GET', '/api/admin/users', async ({ url }) => {
    const s = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const rows = await q(`SELECT u.id,u.email,u.nickname,u.balance,u.role,u.blocked_at IS NOT NULL AS blocked,(extract(epoch from u.created_at)*1000)::bigint AS ms,(SELECT count(*) FROM plates p WHERE p.owner_id=u.id AND p.status IN ('OWNED','LISTED'))::int AS plates,(SELECT coalesce(sum(value),0) FROM plates p WHERE p.owner_id=u.id AND p.status IN ('OWNED','LISTED'))::bigint AS pvalue
      FROM users u WHERE u.role<>'bot' AND ($1='' OR u.nick_norm LIKE $2 OR u.email_norm LIKE $2) ORDER BY u.created_at DESC LIMIT 500`, [s, '%' + s + '%']);
    return { users: rows.map(r => ({ id: n(r.id), email: r.email, nickname: r.nickname, balance: n(r.balance), role: r.role, blocked: bool(r.blocked), plates: n(r.plates), value: n(r.pvalue), joined: n(r.ms) })) };
  }, { admin: true });

  R('POST', '/api/admin/grant', async ({ user, body }) => {
    const amount = Number(body.amount); const reason = String(body.reason || '').trim().slice(0, 200);
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > ADMIN_GRANT_MAX) throw bad('Введите целое число от −100 000 000 до 100 000 000 PLT, не ноль.');
    if (!reason) throw bad('Укажите причину — игрок увидит её в истории операций.');
    return tx(async Q => {
      const [t] = body.userId ? await Q('SELECT id,nickname,balance FROM users WHERE id=$1 FOR UPDATE', [Number(body.userId)]) : await Q('SELECT id,nickname,balance FROM users WHERE nick_norm=$1 FOR UPDATE', [String(body.nickname || '').toLowerCase()]);
      if (!t) throw new HttpError(404, 'Коллекционер с таким ником не найден.');
      if (n(t.balance) + amount < 0) throw new HttpError(409, `У ${t.nickname} только ${n(t.balance)} PLT — баланс не может уйти в минус.`);
      const led = await ledger(Q, n(t.id), 'admin_grant', amount, `Начисление Plate Club: ${reason}`, 'admin:' + user.nickname);
      await adminLog(Q, user.id, amount > 0 ? 'grant_plt' : 'deduct_plt', t.nickname, amount, reason);
      return { ok: true, nickname: t.nickname, balance: led.balance, txId: led.id };
    });
  }, { admin: true });

  R('GET', '/api/admin/promos', async () => {
    const rows = await q(`SELECT code,amount,max_uses,uses,active,note,(extract(epoch from expires_at)*1000)::bigint AS exp FROM promo_codes ORDER BY created_at DESC`);
    return { promos: rows.map(r => ({ code: r.code, amount: n(r.amount), maxUses: r.max_uses == null ? null : n(r.max_uses), uses: n(r.uses), active: bool(r.active), note: r.note, expires: r.exp == null ? null : n(r.exp) })) };
  }, { admin: true });
  R('POST', '/api/admin/promos', async ({ user, body }) => {
    const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const amount = Number(body.amount); const maxUses = body.maxUses ? Number(body.maxUses) : null; const days = body.days ? Number(body.days) : null;
    if (!/^[A-Z0-9]{3,24}$/.test(code)) throw bad('Код: 3–24 латинских буквы или цифры.');
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) throw bad('Сумма: целое число от 1 до 1 000 000 PLT.');
    if (maxUses != null && !(Number.isInteger(maxUses) && maxUses > 0)) throw bad('Лимит активаций: целое положительное число или пусто.');
    if (days != null && !(Number.isInteger(days) && days > 0 && days <= 3650)) throw bad('Срок: от 1 до 3650 дней или пусто.');
    return tx(async Q => {
      const rows = await Q(`INSERT INTO promo_codes(code,amount,max_uses,expires_at,note) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING code`,
        [code, amount, maxUses, days ? new Date(now() + days * 86400000).toISOString() : null, String(body.note || '').slice(0, 120) || null]);
      if (!rows.length) throw new HttpError(409, 'Такой промокод уже есть.');
      await adminLog(Q, user.id, 'create_promo', code, amount, body.note || null);
      return { ok: true, code };
    });
  }, { admin: true });
  R('POST', '/api/admin/promos/:code/toggle', async ({ user, params }) => tx(async Q => {
    const [r] = await Q('UPDATE promo_codes SET active = NOT active WHERE code=$1 RETURNING active', [String(params.code).toUpperCase()]);
    if (!r) throw new HttpError(404, 'Промокод не найден.');
    await adminLog(Q, user.id, bool(r.active) ? 'enable_promo' : 'disable_promo', String(params.code).toUpperCase(), null, null);
    return { ok: true, active: bool(r.active) };
  }), { admin: true });

  R('GET', '/api/admin/listings', async ({ url }) => {
    const st = url.searchParams.get('status'); const ok = ['ACTIVE', 'RESERVED', 'SOLD', 'CANCELLED'].includes(st);
    const rows = await q(`SELECT l.id,l.price,l.status,l.fee,(extract(epoch from l.updated_at)*1000)::bigint AS ms,s.nickname AS seller,b.nickname AS buyer,p.id AS pid,p.country,p.letters,p.digits,p.region,p.tier,p.value
      FROM listings l JOIN plates p ON p.id=l.plate_id JOIN users s ON s.id=l.seller_id LEFT JOIN users b ON b.id=l.buyer_id ${ok ? 'WHERE l.status=$1' : ''} ORDER BY l.updated_at DESC LIMIT 200`, ok ? [st] : []);
    return { listings: rows.map(r => ({ id: r.id, price: n(r.price), status: r.status, fee: n(r.fee), at: n(r.ms), seller: r.seller, buyer: r.buyer, plate: { id: r.pid, country: r.country || 'RU', letters: r.letters, digits: r.digits, region: r.region, tier: r.tier, value: n(r.value) } })) };
  }, { admin: true });

  R('POST', '/api/admin/listings/:id/remove', async ({ user, params, body }) => {
    const reason = String(body.reason || '').trim().slice(0, 200); if (!reason) throw bad('Укажите причину снятия объявления.');
    return tx(async Q => {
      const [l] = await Q('SELECT id,plate_id,seller_id,status FROM listings WHERE id=$1 FOR UPDATE', [params.id]);
      if (!l) throw new HttpError(404, 'Объявление не найдено.');
      if (l.status !== 'ACTIVE') throw new HttpError(409, `Объявление уже не активно (${l.status}).`);
      await Q(`UPDATE listings SET status='CANCELLED', updated_at=now() WHERE id=$1`, [l.id]);
      await Q(`UPDATE plates SET status='OWNED' WHERE id=$1`, [l.plate_id]);
      await addEvent(Q, { plate_id: l.plate_id, kind: 'DELISTED', from_user: n(l.seller_id) });
      await adminLog(Q, user.id, 'remove_listing', l.id, null, reason);
      return { ok: true };
    });
  }, { admin: true });

  // ---- support: players write to the admin, the admin answers or writes first ----
  const tRow = r => ({ id: r.id, subject: r.subject, status: r.status, userUnread: bool(r.user_unread), adminUnread: bool(r.admin_unread), created: n(r.c_ms), updated: n(r.u_ms), nickname: r.nickname, userId: r.user_id == null ? undefined : n(r.user_id), last: r.last || '' });
  const T_COLS = `t.id,t.subject,t.status,t.user_unread,t.admin_unread,t.user_id,(extract(epoch from t.created_at)*1000)::bigint AS c_ms,(extract(epoch from t.updated_at)*1000)::bigint AS u_ms,u.nickname,(SELECT body FROM ticket_messages m WHERE m.ticket_id=t.id ORDER BY m.id DESC LIMIT 1) AS last`;
  const cleanText = (v, max) => String(v || '').replace(/\r/g, '').trim().slice(0, max);
  async function thread(id) {
    const [t] = await q(`SELECT ${T_COLS} FROM tickets t JOIN users u ON u.id=t.user_id WHERE t.id=$1`, [id]);
    if (!t) return null;
    const ms = await q(`SELECT m.id,m.body,m.from_admin,(extract(epoch from m.created_at)*1000)::bigint AS ms,u.nickname FROM ticket_messages m JOIN users u ON u.id=m.author_id WHERE m.ticket_id=$1 ORDER BY m.id`, [id]);
    return { ticket: tRow(t), messages: ms.map(m => ({ id: n(m.id), body: m.body, fromAdmin: bool(m.from_admin), at: n(m.ms), author: m.nickname })) };
  }
  R('GET', '/api/support', async ({ user }) => {
    const rows = await q(`SELECT ${T_COLS} FROM tickets t JOIN users u ON u.id=t.user_id WHERE t.user_id=$1 ORDER BY t.updated_at DESC LIMIT 50`, [user.id]);
    return { tickets: rows.map(tRow) };
  }, { auth: true });
  R('POST', '/api/support', async ({ user, body }) => {
    const subject = cleanText(body.subject, 120), text = cleanText(body.body, 4000);
    if (subject.length < 3) throw bad('Тема: от 3 символов.', { fields: { subject: 'От 3 символов.' } });
    if (text.length < 5) throw bad('Опишите вопрос подробнее (от 5 символов).', { fields: { body: 'От 5 символов.' } });
    await throttle('ticket:' + user.id, 5, 60); await attempt('ticket:' + user.id);
    const id = newId('T');
    await tx(async Q => {
      await Q(`INSERT INTO tickets(id,user_id,subject,status,user_unread,admin_unread) VALUES($1,$2,$3,'OPEN',false,true)`, [id, user.id, subject]);
      await Q(`INSERT INTO ticket_messages(ticket_id,author_id,from_admin,body) VALUES($1,$2,false,$3)`, [id, user.id, text]);
    });
    return { ok: true, id };
  }, { auth: true });
  R('GET', '/api/support/:id', async ({ user, params }) => {
    const d = await thread(params.id); if (!d || d.ticket.userId !== user.id) throw new HttpError(404, 'Обращение не найдено.');
    if (d.ticket.userUnread) await q('UPDATE tickets SET user_unread=false WHERE id=$1', [params.id]);
    return d;
  }, { auth: true });
  R('POST', '/api/support/:id/reply', async ({ user, params, body }) => {
    const text = cleanText(body.body, 4000); if (text.length < 1) throw bad('Напишите сообщение.');
    await throttle('treply:' + user.id, 30, 60); await attempt('treply:' + user.id);
    return tx(async Q => {
      const [t] = await Q('SELECT id,user_id FROM tickets WHERE id=$1 FOR UPDATE', [params.id]);
      if (!t || n(t.user_id) !== user.id) throw new HttpError(404, 'Обращение не найдено.');
      await Q(`INSERT INTO ticket_messages(ticket_id,author_id,from_admin,body) VALUES($1,$2,false,$3)`, [t.id, user.id, text]);
      await Q(`UPDATE tickets SET status='OPEN', admin_unread=true, updated_at=now() WHERE id=$1`, [t.id]);
      return { ok: true };
    });
  }, { auth: true });

  // ---- admin: inbox ----
  R('GET', '/api/admin/support', async ({ url }) => {
    const st = url.searchParams.get('status'); const ok = ['OPEN', 'ANSWERED', 'CLOSED'].includes(st);
    const rows = await q(`SELECT ${T_COLS} FROM tickets t JOIN users u ON u.id=t.user_id ${ok ? 'WHERE t.status=$1' : ''} ORDER BY t.admin_unread DESC, t.updated_at DESC LIMIT 200`, ok ? [st] : []);
    return { tickets: rows.map(tRow) };
  }, { admin: true });
  R('GET', '/api/admin/support/:id', async ({ params }) => {
    const d = await thread(params.id); if (!d) throw new HttpError(404, 'Обращение не найдено.');
    if (d.ticket.adminUnread) await q('UPDATE tickets SET admin_unread=false WHERE id=$1', [params.id]);
    return d;
  }, { admin: true });
  R('POST', '/api/admin/support/:id/reply', async ({ user, params, body }) => {
    const text = cleanText(body.body, 4000); if (!text) throw bad('Напишите ответ.');
    return tx(async Q => {
      const [t] = await Q('SELECT id FROM tickets WHERE id=$1 FOR UPDATE', [params.id]); if (!t) throw new HttpError(404, 'Обращение не найдено.');
      await Q(`INSERT INTO ticket_messages(ticket_id,author_id,from_admin,body) VALUES($1,$2,true,$3)`, [t.id, user.id, text]);
      await Q(`UPDATE tickets SET status=$2, user_unread=true, admin_unread=false, updated_at=now() WHERE id=$1`, [t.id, body.close ? 'CLOSED' : 'ANSWERED']);
      return { ok: true };
    });
  }, { admin: true });
  R('POST', '/api/admin/support/:id/status', async ({ params, body }) => {
    const st = ['OPEN', 'ANSWERED', 'CLOSED'].includes(body.status) ? body.status : null; if (!st) throw bad('Неизвестный статус.');
    const r = await q('UPDATE tickets SET status=$2, admin_unread=false, updated_at=now() WHERE id=$1 RETURNING id', [params.id, st]); if (!r.length) throw new HttpError(404, 'Обращение не найдено.');
    return { ok: true };
  }, { admin: true });
  // admin writes first: a message lands in the player's support inbox
  R('POST', '/api/admin/message', async ({ user, body }) => {
    const subject = cleanText(body.subject, 120) || 'Сообщение от Plate Club', text = cleanText(body.body, 4000); if (!text) throw bad('Напишите сообщение.');
    const ids = body.all ? (await q(`SELECT id FROM users WHERE role='user' AND blocked_at IS NULL`)).map(r => n(r.id)) : [Number(body.userId)];
    if (!ids.length || !ids.every(Number.isInteger)) throw bad('Выберите получателя.');
    let sent = 0;
    await tx(async Q => {
      for (const uid of ids) {
        const [u] = await Q('SELECT id FROM users WHERE id=$1', [uid]); if (!u) continue;
        const id = newId('T');
        await Q(`INSERT INTO tickets(id,user_id,subject,status,user_unread,admin_unread) VALUES($1,$2,$3,'ANSWERED',true,false)`, [id, uid, subject]);
        await Q(`INSERT INTO ticket_messages(ticket_id,author_id,from_admin,body) VALUES($1,$2,true,$3)`, [id, user.id, text]);
        sent++;
      }
      await adminLog(Q, user.id, 'message', body.all ? 'все игроки' : String(ids[0]), sent, subject);
    });
    if (!sent) throw new HttpError(404, 'Игрок не найден.');
    return { ok: true, sent };
  }, { admin: true });

  // ---- admin: players ----
  R('GET', '/api/admin/users/:id', async ({ params }) => {
    const id = Number(params.id); if (!Number.isInteger(id)) throw new HttpError(404, 'Игрок не найден.');
    const [u] = await q(`SELECT u.id,u.email,u.nickname,u.balance,u.role,u.blocked_reason,(extract(epoch from u.blocked_at)*1000)::bigint AS blocked_ms,(extract(epoch from u.created_at)*1000)::bigint AS ms,u.email_verified_at IS NOT NULL AS verified,
      (SELECT count(*) FROM ledger WHERE user_id=u.id AND kind='case_open')::int AS opens, (SELECT coalesce(-sum(amount),0) FROM ledger WHERE user_id=u.id AND kind='case_open')::bigint AS spent,
      (SELECT coalesce(sum(amount),0) FROM ledger WHERE user_id=u.id AND kind='topup')::bigint AS topups, (SELECT count(*) FROM listings WHERE seller_id=u.id AND status='SOLD')::int AS sold,
      (SELECT count(*) FROM listings WHERE buyer_id=u.id)::int AS bought, (SELECT max(created_at) FROM ledger WHERE user_id=u.id) AS last_tx
      FROM users u WHERE u.id=$1`, [id]);
    if (!u) throw new HttpError(404, 'Игрок не найден.');
    const plates = await q(`SELECT ${PLATE_COLS} FROM plates p WHERE p.owner_id=$1 AND p.status IN ('OWNED','LISTED') ORDER BY p.value DESC LIMIT 200`, [id]);
    const led = await q(`SELECT id,kind,amount,balance_after,label,(extract(epoch from created_at)*1000)::bigint AS ms FROM ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60`, [id]);
    const tk = await q(`SELECT ${T_COLS} FROM tickets t JOIN users u ON u.id=t.user_id WHERE t.user_id=$1 ORDER BY t.updated_at DESC LIMIT 20`, [id]);
    return { user: { id: n(u.id), email: u.email, nickname: u.nickname, balance: n(u.balance), role: u.role, verified: bool(u.verified), joined: n(u.ms), blocked: u.blocked_ms ? n(u.blocked_ms) : null, blockedReason: u.blocked_reason, opens: n(u.opens), spent: n(u.spent), topups: n(u.topups), sold: n(u.sold), bought: n(u.bought), lastActive: u.last_tx ? new Date(u.last_tx).getTime() : null },
      plates: plates.map(plateRow), ledger: led.map(t => ({ id: t.id, kind: t.kind, amount: n(t.amount), balance: n(t.balance_after), label: t.label, at: n(t.ms) })), tickets: tk.map(tRow) };
  }, { admin: true });
  // appoint / remove an admin. The acting admin must re-enter their password: a stolen session alone can't create admins.
  R('POST', '/api/admin/users/:id/role', async ({ user, params, body }) => {
    const id = Number(params.id); const makeAdmin = !!body.admin;
    if (!Number.isInteger(id) || id < 1) throw bad('Неверный игрок.');
    if (id === user.id) throw new HttpError(409, 'Нельзя менять свою роль.');
    await throttle('role:' + user.id, 6, 15);
    const [me] = await q('SELECT pass_hash FROM users WHERE id=$1', [user.id]);
    if (!(await checkPassword(String(body.password || ''), me.pass_hash))) { await attempt('role:' + user.id); throw new HttpError(403, 'Неверный пароль.'); }
    return tx(async Q => {
      const [u] = await Q('SELECT id,email,nickname,role,blocked_at FROM users WHERE id=$1 FOR UPDATE', [id]);
      if (!u) throw new HttpError(404, 'Игрок не найден.');
      if (u.blocked_at && makeAdmin) throw new HttpError(409, 'Сначала разблокируйте игрока.');
      if (['market@plateclub.invalid'].includes(u.email)) throw new HttpError(409, 'Это служебный аккаунт.');
      await Q('UPDATE users SET role=$1 WHERE id=$2', [makeAdmin ? 'admin' : 'user', id]);
      if (!makeAdmin) await Q('DELETE FROM sessions WHERE user_id=$1', [id]);
      await adminLog(Q, user.id, makeAdmin ? 'make_admin' : 'remove_admin', u.nickname, null, null);
      return { ok: true, role: makeAdmin ? 'admin' : 'user' };
    });
  }, { admin: true });
  R('POST', '/api/admin/users/:id/block', async ({ user, params, body }) => {
    const id = Number(params.id); const block = !!body.block; const reason = cleanText(body.reason, 200);
    if (id === user.id) throw new HttpError(409, 'Нельзя заблокировать самого себя.');
    if (block && !reason) throw bad('Укажите причину блокировки.');
    return tx(async Q => {
      const [t] = await Q('SELECT id,nickname,role FROM users WHERE id=$1 FOR UPDATE', [id]); if (!t) throw new HttpError(404, 'Игрок не найден.');
      if (t.role !== 'user') throw new HttpError(409, 'Заблокировать можно только игрока.');
      await Q(`UPDATE users SET blocked_at=${block ? 'now()' : 'NULL'}, blocked_reason=$2 WHERE id=$1`, [id, block ? reason : null]);
      if (block) { await Q('DELETE FROM sessions WHERE user_id=$1', [id]); await Q(`UPDATE plates SET status='OWNED' WHERE id IN (SELECT plate_id FROM listings WHERE seller_id=$1 AND status='ACTIVE')`, [id]); await Q(`UPDATE listings SET status='CANCELLED', updated_at=now() WHERE seller_id=$1 AND status='ACTIVE'`, [id]); }
      await adminLog(Q, user.id, block ? 'block_user' : 'unblock_user', t.nickname, null, reason || null);
      return { ok: true, blocked: block };
    });
  }, { admin: true });
  R('POST', '/api/admin/users/:id/plate', async ({ user, params, body }) => {
    needSecret();
    const id = Number(params.id); const tier = String(body.tier || ''); if (!(tier in TI)) throw bad('Выберите редкость.');
    const country = body.country === 'BY' ? 'BY' : 'RU'; const reason = cleanText(body.reason, 200) || 'Подарок';
    return tx(async Q => {
      const [t] = await Q('SELECT id,nickname FROM users WHERE id=$1', [id]); if (!t) throw new HttpError(404, 'Игрок не найден.');
      const pool = country === 'BY' ? { RU: [], BY: Object.keys(BY_REGIONS) } : { RU: Object.keys(REGIONS), BY: [] };
      for (let k = 0; k < 20; k++) {
        const g = genPlate(tier, pool); const p = { ...g, id: newId('PC'), combo: comboKey(g), value: plateValue(g), mintTx: newId('GF') }; p.seal = seal(p);
        const rows = await Q(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,last_tx_id,seal,country,copy)
          SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,'OWNED','Подарок Plate Club',$10,$11,$12, c.n + 1 FROM (SELECT count(*)::int AS n FROM plates WHERE combo=$5) c WHERE c.n < 2
          ON CONFLICT DO NOTHING RETURNING id`, [p.id, p.letters, p.digits, p.region, p.combo, p.tier, p.pattern, p.value, id, p.mintTx, p.seal, p.country]);
        if (!rows.length) continue;
        await addEvent(Q, { plate_id: p.id, kind: 'MINTED', to_user: id, tx_id: p.mintTx });
        await adminLog(Q, user.id, 'gift_plate', t.nickname, p.value, `${plateStr(p)} · ${reason}`);
        return { ok: true, plate: { id: p.id, letters: p.letters, digits: p.digits, region: p.region, country: p.country, tier, value: p.value } };
      }
      throw new HttpError(503, 'Не удалось выпустить номер, попробуйте ещё раз.');
    });
  }, { admin: true });
  R('POST', '/api/admin/grant-all', async ({ user, body }) => {
    const amount = Number(body.amount); const reason = cleanText(body.reason, 200);
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) throw bad('Сумма: от 1 до 1 000 000 PLT каждому.');
    if (!reason) throw bad('Укажите причину — игроки увидят её в истории.');
    return tx(async Q => {
      const us = await Q(`SELECT id FROM users WHERE role='user' AND blocked_at IS NULL ORDER BY id FOR UPDATE`);
      for (const u of us) await ledger(Q, n(u.id), 'admin_grant', amount, `Начисление Plate Club: ${reason}`, 'admin:' + user.nickname);
      await adminLog(Q, user.id, 'grant_all', 'все игроки', amount * us.length, reason);
      return { ok: true, players: us.length, total: amount * us.length };
    });
  }, { admin: true });

  // ---- admin: demo players (clearly marked demo_…) so a fresh site does not look empty ----
  const DEMO_NICKS = ['demo_Dima77', 'demo_Lena_spb', 'demo_Sanya', 'demo_Kostya', 'demo_Alina', 'demo_Max_by', 'demo_Gosha', 'demo_Vika', 'demo_Artem', 'demo_Nastya', 'demo_Ruslan', 'demo_Olya', 'demo_Timur', 'demo_Ksenia', 'demo_Bogdan'];
  R('POST', '/api/admin/demo-players', async ({ user }) => {
    needSecret();
    let made = 0;
    for (const [i, nick] of DEMO_NICKS.entries()) {
      const done = await tx(async Q => {
        const [ex] = await Q('SELECT id FROM users WHERE nick_norm=$1', [nick.toLowerCase()]); if (ex) return false;
        const [u] = await Q(`INSERT INTO users(email,email_norm,nickname,nick_norm,pass_hash,balance,terms_version,terms_accepted_at,role,email_verified_at,created_at)
          VALUES($1,$1,$2,$3,'locked',0,$4,now(),'user',now(),now() - ($5 || ' days')::interval) RETURNING id`, [nick.toLowerCase() + '@demo.plateclub.invalid', nick, nick.toLowerCase(), TERMS_VERSION, String(1 + i % 9)]);
        const uid = n(u.id); const k = DEMO_NICKS.length - i;
        await ledger(Q, uid, 'admin_grant', 200 + randomInt(0, 400) * k, 'Демо-игрок', 'demo');
        const tiers = ['common', 'fine', 'fine', ...(k > 4 ? ['rare'] : []), ...(k > 9 ? ['rare', 'elite'] : []), ...(k > 13 ? ['grail'] : [])];
        for (const t of tiers) { const txId = newId('DM'); const p = await mint(Q, { tier: t, pool: RANDOM_POOL(), owner: uid, origin: 'Демо-игрок', txId }); if (p) await addEvent(Q, { plate_id: p.id, kind: 'MINTED', to_user: uid, tx_id: txId }); }
        return true;
      });
      if (done) made++;
    }
    await tx(Q => adminLog(Q, user.id, 'demo_players', 'demo_*', made, null));
    medalCache.at = 0;
    return { ok: true, made };
  }, { admin: true });

  // ---- admin: settings & market ----
  R('GET', '/api/admin/settings', async () => { stAt = 0; return { settings: await settings(), defaults: SETTINGS_DEFAULT, cases: CASES.map(({ id, ru, en, name, cat, color, price, ev }) => ({ id, ru, en, name, cat, color, price, ev })) }; }, { admin: true });
  R('POST', '/api/admin/settings', async ({ user, body }) => {
    const cur = await settings(); const next = cleanSettings({ ...cur, ...body, cases: body.cases ? body.cases : cur.cases });
    await tx(async Q => {
      await Q(`INSERT INTO settings(key,value,updated_at) VALUES('game',$1,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [JSON.stringify(next)]);
      const changed = Object.keys(next).filter(k => JSON.stringify(next[k]) !== JSON.stringify(cur[k]));
      await adminLog(Q, user.id, 'settings', changed.join(', ') || '—', null, null);
    });
    ST = next; stAt = now();
    return { ok: true, settings: next };
  }, { admin: true });
  R('GET', '/api/admin/economy', async () => {
    const [e] = await q(`SELECT
      (SELECT coalesce(sum(-amount),0) FROM ledger WHERE kind='case_open')::bigint AS case_spent,
      (SELECT coalesce(sum(amount),0) FROM ledger WHERE kind='bank_sell')::bigint AS bank_paid,
      (SELECT coalesce(sum(amount),0) FROM ledger WHERE kind='dealer_sell')::bigint AS dealer_paid,
      (SELECT coalesce(sum(amount),0) FROM ledger WHERE kind IN ('daily_bonus','reward','promo','signup_bonus'))::bigint AS bonuses,
      (SELECT coalesce(sum(amount),0) FROM ledger WHERE kind='topup')::bigint AS topups,
      (SELECT coalesce(sum(amount),0) FROM ledger WHERE kind='admin_grant' AND ref<>'admin-initial')::bigint AS grants,
      (SELECT count(*) FROM users WHERE role='user' AND created_at > now() - interval '24 hours')::int AS new24,
      (SELECT count(DISTINCT user_id) FROM ledger WHERE created_at > now() - interval '24 hours')::int AS active24,
      (SELECT count(*) FROM users WHERE blocked_at IS NOT NULL)::int AS blocked,
      (SELECT count(*) FROM tickets WHERE status<>'CLOSED')::int AS open_tickets,
      (SELECT count(*) FROM quests WHERE status='PENDING')::int AS open_quests`);
    const cases = await q(`SELECT substring(label from 'Открыт кейс ([0-9]+)') AS id, count(*)::int AS n, coalesce(sum(-amount),0)::bigint AS spent FROM ledger WHERE kind='case_open' GROUP BY 1 ORDER BY 2 DESC`);
    return { economy: Object.fromEntries(Object.entries(e).map(([k, v]) => [k, n(v)])), cases: cases.filter(c => c.id).map(c => ({ id: c.id, opens: n(c.n), spent: n(c.spent) })) };
  }, { admin: true });

  // ===================== games =====================
  const tsOf = ms => new Date(ms).toISOString();
  // Mint a plate inside a transaction. owner may be null (assigned later). Returns the public plate or null if no free combination.
  async function mint(Q, { tier, pool, focus, owner, origin, txId, status = 'OWNED', paid = null }) {
    for (let k = 0; k < 40; k++) {
      const g = genPlate(tier, pool, focus); const p = { ...g, id: newId('PC'), combo: comboKey(g), value: plateValue(g), mintTx: txId };
      p.seal = seal(p);
      const rows = await Q(`INSERT INTO plates(id,letters,digits,region,combo,tier,pattern,value,owner_id,status,origin,last_tx_id,seal,country,copy,paid)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, c.n + 1, $15 FROM (SELECT count(*)::int AS n FROM plates WHERE combo=$5) c WHERE c.n < 2
        ON CONFLICT DO NOTHING RETURNING copy`, [p.id, p.letters, p.digits, p.region, p.combo, p.tier, p.pattern, p.value, owner, status, origin, txId, p.seal, p.country, paid]);
      if (rows.length) return { id: p.id, country: p.country, letters: p.letters, digits: p.digits, region: p.region, tier: p.tier, pattern: p.pattern, value: p.value, copy: n(rows[0].copy), traits: plateTraits(p) };
    }
    return null;
  }
  const RANDOM_POOL = () => (randomInt(0, 10) < 3 ? { RU: [], BY: Object.keys(BY_REGIONS) } : { RU: Object.keys(REGIONS), BY: [] });

  // ---------- collections (sets) ----------
  async function ownedPlates(Q, uid) { return (await Q(`SELECT ${PLATE_COLS} FROM plates p WHERE p.owner_id=$1 AND p.status IN ('OWNED','LISTED')`, [uid])).map(plateRow); }
  R('GET', '/api/sets', async ({ user }) => {
    const plates = user ? await ownedPlates(q, user.id) : [];
    const got = user ? new Set((await q(`SELECT ref FROM ledger WHERE user_id=$1 AND kind='reward' AND ref LIKE 'set:%'`, [user.id])).map(r => r.ref.slice(4))) : new Set();
    const byId = Object.fromEntries(plates.map(p => [p.id, p]));
    return { sets: SETS.map(s => { const pr = setProgress(s, plates); return { id: s.id, have: pr.have, need: pr.need, done: pr.done, claimed: got.has(s.id), filled: pr.filled.map(id => (id ? { id, letters: byId[id].letters, digits: byId[id].digits, region: byId[id].region, country: byId[id].country, tier: byId[id].tier } : null)) }; }) };
  });
  R('POST', '/api/sets/:id/claim', async ({ user, params }) => tx(async Q => {
    const s = SETS.find(x => x.id === params.id); if (!s) throw new HttpError(404, 'Такой коллекции нет.');
    await Q('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
    const [done] = await Q(`SELECT 1 FROM ledger WHERE user_id=$1 AND kind='reward' AND ref=$2`, [user.id, 'set:' + s.id]); if (done) throw new HttpError(409, 'Награда за эту коллекцию уже получена.');
    const pr = setProgress(s, await ownedPlates(Q, user.id)); if (!pr.done) throw new HttpError(409, `Коллекция ещё не собрана: ${pr.have} из ${pr.need}.`);
    const led = await ledger(Q, user.id, 'reward', s.reward, `Коллекция «${s.ru}»`, 'set:' + s.id);
    return { ok: true, amount: s.reward, balance: led.balance };
  }), { auth: true });

  // ---------- case battles ----------
  const bRow = r => ({ id: r.id, caseId: r.case_id, seats: n(r.seats), rounds: n(r.rounds), price: n(r.price), status: r.status, winnerSeat: r.winner_seat == null ? null : n(r.winner_seat), totalValue: n(r.total_value) || 0, created: n(r.c_ms), finished: r.f_ms == null ? null : n(r.f_ms), creator: r.creator });
  const B_COLS = `b.id,b.case_id,b.seats,b.rounds,b.price,b.status,b.winner_seat,b.total_value,(extract(epoch from b.created_at)*1000)::bigint AS c_ms,(extract(epoch from b.finished_at)*1000)::bigint AS f_ms,cu.nickname AS creator`;
  async function seatsOf(Q, ids) {
    if (!ids.length) return {};
    const rows = await Q(`SELECT s.battle_id,s.seat,s.paid,s.total,s.bot_name,u.nickname,u.id AS uid FROM battle_seats s LEFT JOIN users u ON u.id=s.user_id WHERE s.battle_id = ANY($1::text[]) ORDER BY s.seat`, ['{' + ids.join(',') + '}']);
    const out = {}; for (const r of rows) (out[r.battle_id] = out[r.battle_id] || []).push({ seat: n(r.seat), nickname: r.bot_name || r.nickname, bot: !!r.bot_name, userId: r.bot_name ? null : n(r.uid), paid: n(r.paid), total: n(r.total) });
    return out;
  }
  R('GET', '/api/battles', async () => {
    const open = await q(`SELECT ${B_COLS} FROM battles b JOIN users cu ON cu.id=b.creator_id WHERE b.status='OPEN' ORDER BY b.created_at DESC LIMIT 40`);
    const done = await q(`SELECT ${B_COLS} FROM battles b JOIN users cu ON cu.id=b.creator_id WHERE b.status='DONE' ORDER BY b.finished_at DESC LIMIT 12`);
    const S = await seatsOf(q, [...open, ...done].map(r => r.id));
    const pub = r => ({ ...bRow(r), players: S[r.id] || [] });
    return { open: open.map(pub), done: done.map(pub) };
  });
  async function battleDetail(id) {
    const [r] = await q(`SELECT ${B_COLS} FROM battles b JOIN users cu ON cu.id=b.creator_id WHERE b.id=$1`, [id]); if (!r) return null;
    const S = await seatsOf(q, [id]);
    const drops = await q(`SELECT d.round,d.seat,d.value,${PLATE_COLS} FROM battle_drops d JOIN plates p ON p.id=d.plate_id WHERE d.battle_id=$1 ORDER BY d.round,d.seat`, [id]);
    return { battle: { ...bRow(r), players: S[id] || [] }, drops: drops.map(d => ({ round: n(d.round), seat: n(d.seat), value: n(d.value), plate: plateRow(d) })) };
  }
  R('GET', '/api/battles/:id', async ({ params }) => { const d = await battleDetail(params.id); if (!d) throw new HttpError(404, 'Баттл не найден.'); return d; });
  async function resolveBattle(Q, b) {
    const c = anyCaseById(b.case_id); const pool = poolRegions(c);
    const seats = await Q('SELECT seat,user_id,bot_name,paid FROM battle_seats WHERE battle_id=$1 ORDER BY seat', [b.id]);
    const drops = []; const totals = Array(seats.length).fill(0);
    for (let r = 1; r <= n(b.rounds); r++) for (const s of seats) {
      const p = await mint(Q, { tier: drawTier(c.odds), pool, focus: c.focus, owner: null, origin: `Баттл ${b.id} · ${c.ru}`, txId: b.id });
      if (!p) throw new HttpError(503, 'Не удалось выпустить номера для баттла. Попробуйте ещё раз.');
      drops.push({ round: r, seat: n(s.seat), plate: p }); totals[n(s.seat)] += p.value;
    }
    const best = Math.max(...totals); const cands = totals.map((t, i) => (t === best ? i : -1)).filter(i => i >= 0);
    const win = cands[randomInt(0, cands.length)]; const ws = seats.find(s => n(s.seat) === win);
    const winner = ws.bot_name ? await botUser(Q) : n(ws.user_id); const sum = totals.reduce((a, t) => a + t, 0);
    const wPaid = n(seats.reduce((a, s) => a + n(s.paid), 0));
    for (const d of drops) {
      await Q('INSERT INTO battle_drops(battle_id,round,seat,plate_id,value) VALUES($1,$2,$3,$4,$5)', [b.id, d.round, d.seat, d.plate.id, d.plate.value]);
      await Q('UPDATE plates SET owner_id=$1, paid=$2 WHERE id=$3', [winner, ws.bot_name ? null : Math.round(wPaid * d.plate.value / Math.max(1, sum)), d.plate.id]);
      await addEvent(Q, { plate_id: d.plate.id, kind: 'MINTED', to_user: winner, tx_id: b.id });
    }
    for (const s of seats) await Q('UPDATE battle_seats SET total=$1 WHERE battle_id=$2 AND seat=$3', [totals[n(s.seat)], b.id, s.seat]);
    await Q(`UPDATE battles SET status='DONE', winner_seat=$1, total_value=$2, finished_at=now() WHERE id=$3`, [win, sum, b.id]);
  }
  R('POST', '/api/battles', async ({ user, body, req }) => {
    needSecret();
    const c = battleCaseById(String(body.caseId || '')); if (!c) throw new HttpError(404, 'Для баттлов есть четыре своих кейса: Дуэль, Арена, Колизей и Олимп.');
    const seats = Number(body.seats), rounds = Number(body.rounds);
    if (!BATTLE.seats.includes(seats)) throw bad('Игроков: 2, 3 или 4.');
    if (!(Number.isInteger(rounds) && rounds >= 1 && rounds <= BATTLE.maxRounds)) throw bad(`Раундов: от 1 до ${BATTLE.maxRounds}.`);
    return withIdem(user, req, () => tx(async Q => {
      const [u] = await Q('SELECT balance FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      const [{ c: open }] = await Q(`SELECT count(*)::int AS c FROM battles WHERE creator_id=$1 AND status='OPEN'`, [user.id]);
      if (n(open) >= BATTLE.maxOpen) throw new HttpError(409, `У вас уже ${BATTLE.maxOpen} открытых баттла. Дождитесь соперников или отмените один.`);
      const price = casePrice(c, ST, now()); const cost = price * rounds;
      if (n(u.balance) < cost) throw new HttpError(402, `Не хватает PLT: участие стоит ${cost} PLT, на балансе ${n(u.balance)} PLT.`);
      const id = newId('B');
      await Q('INSERT INTO battles(id,case_id,seats,rounds,price,creator_id) VALUES($1,$2,$3,$4,$5,$6)', [id, c.id, seats, rounds, price, user.id]);
      await Q('INSERT INTO battle_seats(battle_id,seat,user_id,paid) VALUES($1,0,$2,$3)', [id, user.id, cost]);
      const led = await ledger(Q, user.id, 'battle_entry', -cost, `Баттл ${id} · ${rounds} × ${c.ru}`, id);
      return { ok: true, id, balance: led.balance };
    }));
  }, { auth: true });
  R('POST', '/api/battles/:id/join', async ({ user, params, req }) => {
    needSecret();
    return withIdem(user, req, () => tx(async Q => {
      const [b] = await Q('SELECT * FROM battles WHERE id=$1 FOR UPDATE', [params.id]); if (!b) throw new HttpError(404, 'Баттл не найден.');
      if (b.status !== 'OPEN') throw new HttpError(409, 'Баттл уже начался или отменён.');
      const seats = await Q('SELECT seat,user_id FROM battle_seats WHERE battle_id=$1', [b.id]);
      if (seats.some(s => n(s.user_id) === user.id)) throw new HttpError(409, 'Вы уже в этом баттле.');
      const free = [...Array(n(b.seats)).keys()].find(i => !seats.some(s => n(s.seat) === i)); if (free === undefined) throw new HttpError(409, 'Свободных мест нет.');
      const cost = n(b.price) * n(b.rounds);
      const [u] = await Q('SELECT balance FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      if (n(u.balance) < cost) throw new HttpError(402, `Не хватает PLT: участие стоит ${cost} PLT, на балансе ${n(u.balance)} PLT.`);
      const led = await ledger(Q, user.id, 'battle_entry', -cost, `Баттл ${b.id} · ${b.rounds} × ${anyCaseById(b.case_id).ru}`, b.id);
      await Q('INSERT INTO battle_seats(battle_id,seat,user_id,paid) VALUES($1,$2,$3,$4)', [b.id, free, user.id, cost]);
      if (seats.length + 1 === n(b.seats)) await resolveBattle(Q, b);
      return { ok: true, seat: free, balance: led.balance };
    }));
  }, { auth: true });
  R('POST', '/api/battles/:id/bots', async ({ user, params }) => {
    needSecret();
    return tx(async Q => {
      const [b] = await Q('SELECT * FROM battles WHERE id=$1 FOR UPDATE', [params.id]); if (!b) throw new HttpError(404, 'Баттл не найден.');
      if (n(b.creator_id) !== user.id) throw new HttpError(403, 'Позвать ботов может только создатель баттла.');
      if (b.status !== 'OPEN') throw new HttpError(409, 'Баттл уже начался или отменён.');
      const seats = await Q('SELECT seat FROM battle_seats WHERE battle_id=$1', [b.id]);
      const names = [...BATTLE.botNames].sort(() => randomInt(0, 3) - 1);
      for (let i = 0, k = 0; i < n(b.seats); i++) if (!seats.some(s => n(s.seat) === i)) await Q('INSERT INTO battle_seats(battle_id,seat,bot_name) VALUES($1,$2,$3)', [b.id, i, names[k++ % names.length]]);
      await resolveBattle(Q, b);
      return { ok: true };
    });
  }, { auth: true });
  R('POST', '/api/battles/:id/cancel', async ({ user, params }) => tx(async Q => {
    const [b] = await Q('SELECT * FROM battles WHERE id=$1 FOR UPDATE', [params.id]); if (!b) throw new HttpError(404, 'Баттл не найден.');
    if (n(b.creator_id) !== user.id && user.role !== 'admin') throw new HttpError(403, 'Отменить может только создатель баттла.');
    if (b.status !== 'OPEN') throw new HttpError(409, 'Баттл уже начался или отменён.');
    for (const s of await Q('SELECT user_id,paid FROM battle_seats WHERE battle_id=$1 AND user_id IS NOT NULL', [b.id])) if (n(s.paid) > 0) await ledger(Q, n(s.user_id), 'battle_refund', n(s.paid), `Возврат за баттл ${b.id}`, b.id);
    await Q(`UPDATE battles SET status='CANCELLED', finished_at=now() WHERE id=$1`, [b.id]);
    return { ok: true };
  }), { auth: true });

  // ---------- swaps between players ----------
  const PL_SHORT = `p.id,p.country,p.letters,p.digits,p.region,p.tier,p.value,p.copy,p.pattern,p.vv,p.owner_id,p.status`;
  async function platesByIds(Q, ids) { if (!ids.length) return {}; const rows = await Q(`SELECT ${PL_SHORT} FROM plates p WHERE p.id = ANY($1::text[])`, ['{' + ids.join(',') + '}']); return Object.fromEntries(rows.map(r => [r.id, { id: r.id, country: r.country, letters: r.letters, digits: r.digits, region: r.region, tier: r.tier, value: n(r.value), copy: n(r.copy), pattern: r.pattern, owner: n(r.owner_id), status: r.status, traits: plateTraits({ ...r, vv: n(r.vv) || 1 }) }])); }
  const arr = v => (Array.isArray(v) ? v : String(v || '').replace(/^\{|\}$/g, '').split(',').filter(Boolean));
  async function swapList(Q, rows) {
    rows.forEach(r => { r.give_plates = arr(r.give_plates); r.want_plates = arr(r.want_plates); });
    const P = await platesByIds(Q, [...new Set(rows.flatMap(r => [...r.give_plates, ...r.want_plates]))]);
    return rows.map(r => ({ id: r.id, from: r.from_nick, to: r.to_nick, give: r.give_plates.map(i => P[i]).filter(Boolean), want: r.want_plates.map(i => P[i]).filter(Boolean), givePlt: n(r.give_plt), wantPlt: n(r.want_plt), message: r.message, status: r.status, note: r.note, created: n(r.c_ms), updated: n(r.u_ms) }));
  }
  const SW_COLS = `s.*,(extract(epoch from s.created_at)*1000)::bigint AS c_ms,(extract(epoch from s.updated_at)*1000)::bigint AS u_ms,f.nickname AS from_nick,t.nickname AS to_nick`;
  R('GET', '/api/swaps', async ({ user }) => {
    const rows = await q(`SELECT ${SW_COLS} FROM swaps s JOIN users f ON f.id=s.from_id JOIN users t ON t.id=s.to_id WHERE s.from_id=$1 OR s.to_id=$1 ORDER BY (s.status='PENDING') DESC, s.updated_at DESC LIMIT 60`, [user.id]);
    const list = await swapList(q, rows); return { incoming: list.filter((x, i) => n(rows[i].to_id) === user.id), outgoing: list.filter((x, i) => n(rows[i].from_id) === user.id) };
  }, { auth: true });
  R('GET', '/api/users/:nick/plates', async ({ params }) => {
    const [u] = await q(`SELECT id,nickname,role FROM users WHERE nick_norm=$1 AND blocked_at IS NULL`, [String(params.nick).toLowerCase()]);
    if (!u || u.role === 'bot') throw new HttpError(404, 'Коллекционер с таким ником не найден.');
    const rows = await q(`SELECT ${PLATE_COLS} FROM plates p WHERE p.owner_id=$1 AND p.status='OWNED' ORDER BY p.value DESC LIMIT 200`, [u.id]);
    return { nickname: u.nickname, plates: rows.map(plateRow) };
  });
  const ids = v => (Array.isArray(v) ? [...new Set(v.map(String))] : []);
  const pltOk = v => Number.isInteger(v) && v >= 0 && v <= 10000000;
  R('POST', '/api/swaps', async ({ user, body }) => {
    const give = ids(body.give), want = ids(body.want), givePlt = Number(body.givePlt || 0), wantPlt = Number(body.wantPlt || 0);
    if (give.length > SWAP.maxPlates || want.length > SWAP.maxPlates) throw bad(`Не больше ${SWAP.maxPlates} номеров с каждой стороны.`);
    if (!pltOk(givePlt) || !pltOk(wantPlt)) throw bad('Доплата: целое число от 0 до 10 000 000 PLT.');
    if (!give.length && !want.length) throw bad('Добавьте хотя бы один номер в обмен.');
    if ((!give.length && !givePlt) || (!want.length && !wantPlt)) throw bad('С каждой стороны должен быть номер или доплата.');
    return tx(async Q => {
      const [t] = await Q(`SELECT id,nickname,role FROM users WHERE nick_norm=$1 AND blocked_at IS NULL`, [String(body.to || '').toLowerCase()]);
      if (!t || t.role === 'bot') throw new HttpError(404, 'Коллекционер с таким ником не найден.');
      if (n(t.id) === user.id) throw new HttpError(409, 'Нельзя предложить обмен самому себе.');
      const [{ c }] = await Q(`SELECT count(*)::int AS c FROM swaps WHERE from_id=$1 AND status='PENDING'`, [user.id]); if (n(c) >= SWAP.maxPending) throw new HttpError(409, `У вас уже ${SWAP.maxPending} предложений в ожидании.`);
      const P = await platesByIds(Q, [...give, ...want]);
      if (!give.every(i => P[i] && P[i].owner === user.id && P[i].status === 'OWNED')) throw new HttpError(409, 'Отдавать можно только свои номера, которые не выставлены на рынок.');
      if (!want.every(i => P[i] && P[i].owner === n(t.id) && P[i].status === 'OWNED')) throw new HttpError(409, `Некоторых номеров уже нет у ${t.nickname} или они выставлены на рынок.`);
      if (givePlt) { const [u] = await Q('SELECT balance FROM users WHERE id=$1', [user.id]); if (n(u.balance) < givePlt) throw new HttpError(402, `Не хватает PLT для доплаты: на балансе ${n(u.balance)} PLT.`); }
      const id = newId('SW');
      await Q('INSERT INTO swaps(id,from_id,to_id,give_plates,want_plates,give_plt,want_plt,message) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, user.id, t.id, '{' + give.join(',') + '}', '{' + want.join(',') + '}', givePlt, wantPlt, String(body.message || '').trim().slice(0, 200) || null]);
      return { ok: true, id };
    });
  }, { auth: true });
  R('POST', '/api/swaps/:id/:action', async ({ user, params }) => {
    const act = params.action; if (!['accept', 'decline', 'cancel'].includes(act)) throw new HttpError(404, 'Не найдено.');
    needSecret();
    const res = await tx(async Q => {
      const [s] = await Q('SELECT * FROM swaps WHERE id=$1 FOR UPDATE', [params.id]); if (!s) throw new HttpError(404, 'Предложение не найдено.');
      s.give_plates = arr(s.give_plates); s.want_plates = arr(s.want_plates);
      if (act === 'cancel' ? n(s.from_id) !== user.id : n(s.to_id) !== user.id) throw new HttpError(404, 'Предложение не найдено.');
      if (s.status !== 'PENDING') throw new HttpError(409, 'Это предложение уже закрыто.');
      if (act !== 'accept') { await Q(`UPDATE swaps SET status=$2, updated_at=now() WHERE id=$1`, [s.id, act === 'cancel' ? 'CANCELLED' : 'DECLINED']); return { ok: true, status: act === 'cancel' ? 'CANCELLED' : 'DECLINED' }; }
      const from = n(s.from_id), to = n(s.to_id);
      const us = await Q('SELECT id,balance,blocked_at FROM users WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE', ['{' + [from, to].join(',') + '}']);
      const bal = Object.fromEntries(us.map(u => [n(u.id), n(u.balance)]));
      const all = [...s.give_plates, ...s.want_plates];
      const rows = all.length ? await Q(`SELECT id,owner_id,status,country,letters,digits,region FROM plates WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`, ['{' + all.join(',') + '}']) : [];
      const P = Object.fromEntries(rows.map(r => [r.id, r]));
      const fail = async note => { await Q(`UPDATE swaps SET status='FAILED', note=$2, updated_at=now() WHERE id=$1`, [s.id, note]); return { fail: note }; };
      if (us.some(u => u.blocked_at)) return fail('Один из игроков заблокирован.');
      if (!s.give_plates.every(i => P[i] && n(P[i].owner_id) === from && P[i].status === 'OWNED')) return fail('Предложенных номеров уже нет у отправителя или они на рынке.');
      if (!s.want_plates.every(i => P[i] && n(P[i].owner_id) === to && P[i].status === 'OWNED')) return fail('Ваших номеров из обмена уже нет у вас или они выставлены на рынок.');
      if (bal[from] < n(s.give_plt)) return fail('У отправителя не хватает PLT на доплату.');
      if (bal[to] < n(s.want_plt)) throw new HttpError(402, `Не хватает PLT для доплаты: нужно ${n(s.want_plt)} PLT, на балансе ${bal[to]} PLT.`);
      const txId = newId('SW');
      const move = async (pid, a, b2) => { await Q(`UPDATE plates SET owner_id=$1, paid=NULL, last_tx_id=$2 WHERE id=$3`, [b2, txId, pid]); await addEvent(Q, { plate_id: pid, kind: 'TRANSFERRED', from_user: a, to_user: b2, tx_id: txId }); };
      for (const pid of s.give_plates) await move(pid, from, to);
      for (const pid of s.want_plates) await move(pid, to, from);
      if (n(s.give_plt)) { await ledger(Q, from, 'trade', -n(s.give_plt), `Доплата за обмен ${s.id}`, s.id); await ledger(Q, to, 'trade', n(s.give_plt), `Доплата за обмен ${s.id}`, s.id); }
      if (n(s.want_plt)) { await ledger(Q, to, 'trade', -n(s.want_plt), `Доплата за обмен ${s.id}`, s.id); await ledger(Q, from, 'trade', n(s.want_plt), `Доплата за обмен ${s.id}`, s.id); }
      await Q(`UPDATE swaps SET status='ACCEPTED', updated_at=now() WHERE id=$1`, [s.id]);
      return { ok: true, status: 'ACCEPTED' };
    });
    if (res.fail) throw new HttpError(409, res.fail);
    return res;
  }, { auth: true });

  // ---------- auction of the day ----------
  let lastAuction = 0;
  async function auctionTick(force = false) {
    if (!SECRET || SECRET.length < 32 || (!force && now() - lastAuction < 15000)) return;
    lastAuction = now();
    await tx(async Q => {
      await Q('SELECT pg_advisory_xact_lock(424243)');
      const bot = await botUser(Q);
      for (const a of await Q(`SELECT * FROM auctions WHERE status='LIVE' AND ends_at <= $1 FOR UPDATE`, [tsOf(now())])) {
        if (a.top_user) {
          const txId = newId('AU');
          await Q(`UPDATE plates SET owner_id=$1, status='OWNED', paid=$2, last_tx_id=$3 WHERE id=$4`, [a.top_user, a.top_bid, txId, a.plate_id]);
          await addEvent(Q, { plate_id: a.plate_id, kind: 'TRANSFERRED', from_user: bot, to_user: n(a.top_user), price: n(a.top_bid), tx_id: txId });
        } else await Q(`UPDATE plates SET status='OWNED' WHERE id=$1`, [a.plate_id]);
        await Q(`UPDATE auctions SET status='DONE' WHERE day=$1`, [a.day]);
      }
      const day = auctionDay(now());
      const [cur] = await Q('SELECT day FROM auctions WHERE day=$1', [day]);
      if (!cur) {
        const txId = newId('AU');
        const p = await mint(Q, { tier: drawTier(AUCTION.tierOdds), pool: RANDOM_POOL(), owner: bot, origin: 'Аукцион дня', txId, status: 'AUCTION' });
        if (!p) return;
        await addEvent(Q, { plate_id: p.id, kind: 'MINTED', to_user: bot, tx_id: txId });
        await Q('INSERT INTO auctions(day,plate_id,start_price,step,ends_at) VALUES($1,$2,$3,$4,$5)', [day, p.id, Math.max(10, Math.round(p.value * AUCTION.startK)), Math.max(AUCTION.minStep, Math.round(p.value * AUCTION.stepK)), tsOf((day + 1) * 86400000)]);
      }
    });
  }
  const aRow = r => ({ day: n(r.day), start: n(r.start_price), step: n(r.step), ends: n(r.e_ms), status: r.status, topBid: r.top_bid == null ? null : n(r.top_bid), topUser: r.top_nick || null, bids: n(r.bids) });
  const A_COLS = `a.*,(extract(epoch from a.ends_at)*1000)::bigint AS e_ms,u.nickname AS top_nick`;
  R('GET', '/api/auction', async ({ user }) => {
    await auctionTick();
    const [a] = await q(`SELECT ${A_COLS} FROM auctions a LEFT JOIN users u ON u.id=a.top_user WHERE a.status='LIVE' ORDER BY a.day DESC LIMIT 1`);
    const past = await q(`SELECT ${A_COLS},p.country,p.letters,p.digits,p.region,p.tier,p.id AS pid,p.value FROM auctions a LEFT JOIN users u ON u.id=a.top_user JOIN plates p ON p.id=a.plate_id WHERE a.status='DONE' ORDER BY a.day DESC LIMIT 6`);
    let cur = null;
    if (a) {
      const [pl] = await q(`SELECT ${PLATE_COLS} FROM plates p WHERE p.id=$1`, [a.plate_id]);
      const bids = await q(`SELECT b.amount,(extract(epoch from b.created_at)*1000)::bigint AS ms,u.nickname FROM auction_bids b JOIN users u ON u.id=b.user_id WHERE b.day=$1 ORDER BY b.id DESC LIMIT 20`, [a.day]);
      cur = { ...aRow(a), min: auctionMin(aRow(a)), plate: plateRow(pl), history: bids.map(b => ({ amount: n(b.amount), at: n(b.ms), nickname: b.nickname })), mine: !!user && n(a.top_user) === user.id };
    }
    return { auction: cur, past: past.map(r => ({ ...aRow(r), plate: { id: r.pid, country: r.country, letters: r.letters, digits: r.digits, region: r.region, tier: r.tier, value: n(r.value) } })), now: now() };
  });
  R('POST', '/api/auction/bid', async ({ user, body, req }) => {
    needSecret(); await auctionTick();
    const amount = Number(body.amount); if (!Number.isInteger(amount) || amount < 1 || amount > 100000000) throw bad('Ставка: целое число PLT.');
    return withIdem(user, req, () => tx(async Q => {
      const [a] = await Q(`SELECT * FROM auctions WHERE status='LIVE' ORDER BY day DESC LIMIT 1 FOR UPDATE`); if (!a) throw new HttpError(409, 'Аукциона сейчас нет. Новый начнётся в 03:00 по Москве.');
      if (new Date(a.ends_at).getTime() <= now()) throw new HttpError(409, 'Аукцион уже завершён.');
      const min = auctionMin({ topBid: a.top_bid == null ? null : n(a.top_bid), step: n(a.step), start: n(a.start_price) });
      if (amount < min) throw new HttpError(409, `Минимальная ставка сейчас ${min} PLT.`, { min });
      const prev = a.top_user == null ? null : n(a.top_user);
      const lock = [...new Set([user.id, prev].filter(Boolean))];
      const us = await Q('SELECT id,balance FROM users WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE', ['{' + lock.join(',') + '}']);
      const myBal = n(us.find(u => n(u.id) === user.id).balance) + (prev === user.id ? n(a.top_bid) : 0);
      if (myBal < amount) throw new HttpError(402, `Не хватает PLT: ставка ${amount} PLT, доступно ${myBal} PLT.`);
      if (prev) await ledger(Q, prev, 'auction_refund', n(a.top_bid), prev === user.id ? 'Аукцион дня: ставка повышена' : 'Аукцион дня: ставку перебили, PLT возвращены', 'auction:' + a.day);
      const led = await ledger(Q, user.id, 'auction_bid', -amount, 'Ставка на аукционе дня', 'auction:' + a.day);
      const ends = new Date(a.ends_at).getTime(); const newEnds = ends - now() < AUCTION.snipeMs ? now() + AUCTION.snipeMs : ends;
      await Q(`UPDATE auctions SET top_bid=$1, top_user=$2, bids=bids+1, ends_at=$3 WHERE day=$4`, [amount, user.id, tsOf(newEnds), a.day]);
      await Q('INSERT INTO auction_bids(day,user_id,amount) VALUES($1,$2,$3)', [a.day, user.id, amount]);
      return { ok: true, amount, ends: newEnds, balance: led.balance };
    }));
  }, { auth: true });
  R('POST', '/api/admin/auction/tick', async () => { lastAuction = 0; await auctionTick(true); return { ok: true }; }, { admin: true });

  // ---------------- dispatcher ----------------
  return async function handle(req, ctx = {}) {
    const url = new URL(req.url);
    const route = routes.find(r => r.method === req.method && r.re.test(url.pathname));
    if (!route) return json({ error: 'Не найдено.' }, 404);
    try {
      const write = !['GET', 'HEAD'].includes(req.method);
      if (write && !route.raw) {
        const ct = req.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new HttpError(415, 'Send JSON.');
        // CSRF: a browser always sends Origin on cross-site writes; it must be this site.
        const origin = req.headers.get('origin');
        if (origin && origin !== 'null') { let oh = ''; try { oh = new URL(origin).host; } catch {} const hosts = [url.host, req.headers.get('host'), req.headers.get('x-forwarded-host')].filter(Boolean); if (!hosts.includes(oh) && !(env.URL && origin === env.URL.replace(/\/$/, ''))) throw new HttpError(403, 'Запрос с чужого сайта отклонён.'); }
        else if (origin === 'null') throw new HttpError(403, 'Запрос с чужого сайта отклонён.');
      }
      if (Number(req.headers.get('content-length') || 0) > 262144) throw new HttpError(413, 'Слишком большой запрос.');
      const raw = write ? await req.text() : '';
      if (raw.length > 262144) throw new HttpError(413, 'Слишком большой запрос.');
      let body = {};
      if (raw && !route.raw) { try { body = JSON.parse(raw); } catch { throw bad('Некорректный запрос.'); } }
      await settings();
      const user = await sessionUser(req);
      if ((route.auth || route.admin) && !user) throw new HttpError(401, 'Войдите, чтобы продолжить.');
      if (route.admin && user.role !== 'admin') throw new HttpError(403, 'Это может сделать только администратор Plate Club.');
      const ip = ctx.ip || req.headers.get('x-nf-client-connection-ip') || 'local';
      const out = await route.handler({ req, url, params: route.re.exec(url.pathname).groups || {}, body, raw, user, ip });
      if (out && out.body !== undefined && (out.headers || out.status)) return json(out.body, out.status || 200, out.headers || {});
      return json(out);
    } catch (e) {
      const lang = req.headers.get('x-lang') === 'en' ? 'en' : 'ru';
      if (e instanceof HttpError) return json({ error: tr(e.message, lang), ...(trExtra(e.extra, lang) || {}) }, e.status);
      console.error(e);
      return json({ error: tr('Что-то пошло не так на нашей стороне. Деньги не списаны, попробуйте ещё раз.', lang) }, 500);
    }
  };
}
