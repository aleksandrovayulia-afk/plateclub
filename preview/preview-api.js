// PREVIEW ONLY. Answers /api/* inside the browser so the new site can be tried without the server.
// Same endpoints and rules as server/app.mjs; data lives in this browser. The real site uses Postgres.
(function () {
  const KEY = 'plateclub.preview.v14';
  const enc = new TextEncoder();
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const newId = p => `${p}-${hex(2)}-${hex(2)}`;
  const SECRET = 'preview-seal';
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { S = null; }
  if (!S) S = { adminLog: [], users: [], session: null, plates: {}, events: [], listings: [], ledger: [], payments: [], combos: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const G = window.__GAME;
  const ST = () => G.cleanSettings(S.settings || {});
  class E extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
  const me = () => S.users.find(u => u.id === S.session && !u.blocked) || null;
  const nick = id => (S.users.find(u => u.id === id) || {}).nickname || null;
  function ledger(uid, kind, amount, label, ref) {
    const u = S.users.find(x => x.id === uid); u.balance += amount;
    const t = { id: newId('TX'), user: uid, kind, amount, balance: u.balance, label, ref, at: Date.now() }; S.ledger.unshift(t); return t;
  }
  const chainOf = (prev, e) => sha([prev || 'genesis', e.plate, e.kind, e.from ?? '', e.to ?? '', e.price ?? '', e.tx ?? '', SECRET].join('|'));
  async function event(e) { const last = S.events.filter(x => x.plate === e.plate).at(-1); e.chain = await chainOf(last && last.chain, e); e.at = Date.now(); S.events.push(e); }
  const sealOf = p => sha(['seal', p.id, p.combo, p.tier, p.pattern, p.value, p.mintTx, SECRET].join('|'));
  const pub = p => ({ country: p.country || 'RU', copy: p.copy || 1, id: p.id, letters: p.letters, digits: p.digits, region: p.region, tier: p.tier, pattern: p.pattern, value: p.value, status: p.status, origin: p.origin, created: p.created, lastTx: p.lastTx , traits: G.plateTraits(p), paid: p.paid == null ? null : p.paid });
  const LAT = { A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х' };
  const translit = q => String(q || '').toUpperCase().replace(/[A-Z]/g, c => LAT[c] || c).replace(/[^0-9АВЕКМНОРСТУХ]/g, '');
  const xpOf = u => -S.ledger.filter(t => t.user === u.id && t.kind === 'case_open').reduce((a, t) => a + t.amount, 0);
  const stats = u => {
    const own = Object.values(S.plates).filter(p => p.owner === u.id && p.status !== 'BANKED');
    const TI = Object.fromEntries(G.TIERS.map((t, i) => [t.id, i]));
    return { opened: S.ledger.filter(t => t.user === u.id && t.kind === 'case_open').length, bought: S.ledger.filter(t => t.user === u.id && t.kind === 'market_buy').length, sold: S.ledger.filter(t => t.user === u.id && t.kind === 'market_sale').length, listed: S.listings.filter(l => l.seller === u.id).length, plates: own.length, regions: new Set(own.map(p => (p.country || 'RU') + p.region)).size, countries: new Set(own.map(p => p.country || 'RU')).size, twins: own.filter(p => p.copy === 2).length, value: own.reduce((a, p) => a + p.value, 0), maxtier: Object.values(S.plates).filter(p => p.owner === u.id || p.minter === u.id).reduce((m, p) => Math.max(m, TI[p.tier]), -1) };
  };
  const listingPub = l => ({ id: l.id, price: l.price, created: l.created, seller: nick(l.seller), bot: (S.users.find(x => x.id === l.seller) || {}).role === 'bot', mine: !!me() && me().id === l.seller, plate: pub(S.plates[l.plate]) });
  const R = [];
  const r = (m, path, fn, auth) => R.push({ m, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn, auth });

  r('GET', '/api/config', () => { const c = G.publicConfig({}, Date.now(), ST()); c.payments.methods = []; return c; });
  r('GET', '/api/me', () => { const u = me(); return { user: u ? { id: u.id, email: u.email, nickname: u.nickname, role: u.role || 'user', balance: u.balance, verified: u.verified, created: u.created, stats: stats(u), level: G.levelOf(xpOf(u)), unread: (S.tickets || []).filter(t => t.user === u.id && t.userUnread).length, inbox: u.role === 'admin' ? (S.tickets || []).filter(t => t.adminUnread && t.status !== 'CLOSED').length : 0, swaps: (S.swaps || []).filter(x => x.to === u.id && x.status === 'PENDING').length, medals: medalsOf()[u.id] || [] } : null }; });
  r('GET', '/api/nickname', ({ url }) => { const n = url.searchParams.get('n') || ''; if (!/^[A-Za-z0-9_]{3,20}$/.test(n)) return { available: false, reason: '3–20 латинских букв, цифр или «_».' }; return S.users.some(u => u.nickname.toLowerCase() === n.toLowerCase()) ? { available: false, reason: 'Этот ник занят.' } : { available: true }; });
  r('POST', '/api/auth/register', async ({ b }) => {
    const email = String(b.email || '').trim(), nickname = String(b.nickname || '').trim(), pw = String(b.password || ''); const f = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) f.email = 'Введите корректный email, например name@example.com.';
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nickname)) f.nickname = '3–20 латинских букв, цифр или «_».';
    if (pw.length < 8) f.password = 'Минимум 8 символов.';
    if (b.terms !== true) f.terms = 'Примите правила и политику конфиденциальности.';
    if (Object.keys(f).length) throw new E(400, 'Исправьте отмеченные поля.', { fields: f });
    if (S.users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new E(409, 'Аккаунт с этим email уже есть. Войдите или восстановите пароль.', { fields: { email: 'Этот email уже зарегистрирован.' } });
    if (S.users.some(u => u.nickname.toLowerCase() === nickname.toLowerCase())) throw new E(409, 'Этот ник занят.', { fields: { nickname: 'Ник занят, попробуйте другой.' } });
    const u = { id: S.users.length + 1, email, nickname, pass: await sha(email.toLowerCase() + '|' + pw), verified: false, balance: 0, created: Date.now(), bonus: false };
    S.users.push(u); if (!u.bonus) { if (ST().signupBonus > 0) ledger(u.id, 'signup_bonus', ST().signupBonus, 'Бонус за регистрацию'); u.bonus = true; }
    S.session = u.id; return { ok: true, bonus: ST().signupBonus, verificationSent: false };
  });
  r('POST', '/api/auth/login', async ({ b }) => { const u = S.users.find(x => x.email.toLowerCase() === String(b.email || '').trim().toLowerCase()); if (!u || u.pass !== await sha(u.email.toLowerCase() + '|' + String(b.password || ''))) throw new E(401, 'Неверный email или пароль.'); if (u.blocked) throw new E(403, 'Аккаунт заблокирован администратором' + (u.blockedReason ? ': ' + u.blockedReason : '.')); S.session = u.id; return { ok: true }; });
  r('POST', '/api/auth/logout', () => { S.session = null; return { ok: true }; });
  r('POST', '/api/auth/resend-verify', () => { throw new E(503, 'В превью письма не отправляются.'); });
  r('POST', '/api/auth/forgot', () => { throw new E(503, 'В превью письма не отправляются. На сайте ссылка придёт на почту.'); });
  r('POST', '/api/auth/verify', () => { throw new E(400, 'В превью ссылки из писем не используются.'); });
  r('POST', '/api/auth/reset', () => { throw new E(400, 'В превью ссылки из писем не используются.'); });

  r('POST', '/api/cases/:id/open', async ({ p, u }) => {
    const c = G.caseById(p.id); if (!c) throw new E(404, 'Такого кейса нет.'); if (ST().cases[c.id] && ST().cases[c.id].hidden) throw new E(409, 'Этот кейс временно недоступен.'); const price = G.casePrice(c, ST());
    if (u.balance < price) throw new E(402, `Не хватает PLT: кейс стоит ${price} PLT, на балансе ${u.balance} PLT.`);
    const tier = G.drawTier(c.odds); let g, k = 0;
    const copies = key => S.combos.filter(x => x === key).length;
    do { g = G.genPlate(tier, G.poolRegions(c), c.focus); k++; } while (copies(G.comboKey(g)) >= 2 && k < 50);
    const t = ledger(u.id, "case_open", -price, `Открыт кейс ${c.id} ${c.ru}`);
    const pl = { ...g, id: newId('PC'), combo: G.comboKey(g), copy: copies(G.comboKey(g)) + 1, minter: u.id, value: G.plateValue(g), owner: u.id, status: 'OWNED', origin: `Кейс ${c.id} · ${c.ru}`, created: Date.now(), lastTx: t.id, mintTx: t.id, paid: price };
    pl.seal = await sealOf(pl); S.plates[pl.id] = pl; S.combos.push(pl.combo); t.ref = pl.id;
    await event({ plate: pl.id, kind: 'MINTED', to: u.id, tx: t.id });
    return { plate: pub(pl), balance: u.balance, txId: t.id, price };
  }, true);
  r('GET', '/api/collection', ({ u }) => ({ plates: Object.values(S.plates).filter(p => p.owner === u.id && p.status !== 'BANKED').sort((a, b) => b.created - a.created).map(p => { const l = S.listings.find(x => x.plate === p.id && x.status === 'ACTIVE'); return { ...pub(p), listing: l ? { id: l.id, price: l.price } : null }; }) }), true);
  r('POST', '/api/plates/:id/bank', async ({ p, u }) => {
    const pl = S.plates[p.id]; if (!pl || pl.owner !== u.id || pl.status === 'BANKED') throw new E(404, 'Этого номера нет в вашей коллекции.');
    if (pl.status === 'LISTED') throw new E(409, 'Сначала снимите номер с рынка.');
    const amt = Math.round(pl.value * ST().bankRate); const t = ledger(u.id, 'bank_sell', amt, `Продан банку ${G.plateStr(pl)}`, pl.id);
    pl.status = 'BANKED'; pl.owner = null; pl.lastTx = t.id; await event({ plate: pl.id, kind: 'BANKED', from: u.id, price: amt, tx: t.id });
    return { ok: true, amount: amt, balance: u.balance };
  }, true);
  const detail = id => { const pl = S.plates[id]; if (!pl) throw new E(404, 'Номера с таким ID в Plate Club нет.'); const l = S.listings.find(x => x.plate === id && x.status === 'ACTIVE'); return { plate: { ...pub(pl), owner: nick(pl.owner) }, history: S.events.filter(e => e.plate === id).map(e => ({ kind: e.kind, price: e.price, tx: e.tx, at: e.at, from: nick(e.from), to: nick(e.to) })), listing: l ? { id: l.id, price: l.price, status: l.status, seller: nick(l.seller) } : null }; };
  r('GET', '/api/plates/:id', ({ p }) => detail(p.id));
  r('GET', '/api/verify/:id', async ({ p }) => {
    const id = String(p.id).toUpperCase(); const at = Date.now(); const fail = (reason, checks = []) => ({ verified: false, id, reason, checks, checkedAt: at });
    if (!/^PC-[0-9A-F]{4}-[0-9A-F]{4}$/.test(id)) return fail('Это не ID Plate Club. ID выглядит так: PC-7F3A-91C2.');
    const pl = S.plates[id]; if (!pl) return fail('Номера с таким ID в Plate Club нет.');
    const evs = S.events.filter(e => e.plate === id); const checks = [];
    checks.push({ name: 'Печать выпуска совпадает с данными', ok: pl.seal === await sealOf(pl) });
    checks.push({ name: 'Комбинация, регион и оценка корректны', ok: pl.combo === G.comboKey(pl) && G.plateValue(pl) === pl.value });
    checks.push({ name: 'Экземпляров комбинации не больше двух', ok: S.combos.filter(x => x === pl.combo).length <= 2 });
    let prev = null, ok = evs.length > 0, owner = null;
    for (const e of evs) { if (await chainOf(prev, e) !== e.chain) { ok = false; break; } prev = e.chain; if (e.kind === 'MINTED' || e.kind === 'TRANSFERRED') owner = e.to; if (e.kind === 'BANKED' || e.kind === 'UPGRADED') owner = null; }
    checks.push({ name: 'История владельцев не нарушена', ok });
    checks.push({ name: 'Текущий владелец совпадает с историей', ok: ok && owner === pl.owner });
    return checks.every(c => c.ok) ? { verified: true, id, checks, checkedAt: at, plate: pub(pl), events: evs.length } : fail('Запись не совпадает с подписанной историей.', checks);
  });
  r('GET', '/api/market', async ({ url }) => {
    await stock();
    const sp = url.searchParams; const raw = String(sp.get('q') || '').toUpperCase().replace(/[^0-9A-ZА-Я]/g, ''); const q = translit(raw); const tiers = (sp.get('tiers') || '').split(',').filter(Boolean); const g = sp.get('group'); const min = parseInt(sp.get('min')), max = parseInt(sp.get('max')); const seller = (sp.get('seller') || '').toLowerCase();
    const TI = Object.fromEntries(G.TIERS.map((t, i) => [t.id, i]));
    let ls = S.listings.filter(l => l.status === 'ACTIVE').filter(l => { const pl = S.plates[l.plate]; return (!raw || [q, raw].some(x => x && pl.combo.replace(/\||BY:|-/g, '').includes(x))) && (!tiers.length || tiers.includes(pl.tier)) && (!g || (g === 'by' ? pl.country === 'BY' : g === 'ru' ? pl.country !== 'BY' : pl.country !== 'BY' && G.REGIONS[pl.region][1] === g)) && (!(min >= 0) || l.price >= min) && (!(max >= 0) || l.price <= max) && (!seller || (nick(l.seller) || '').toLowerCase() === seller) && (sp.get('deals') !== '1' || l.price < pl.value) && (!sp.get('who') || (sp.get('who') === 'market') === isBot(l.seller)); });
    const sorts = { new: (a, b) => b.created - a.created, pa: (a, b) => a.price - b.price, pd: (a, b) => b.price - a.price, rar: (a, b) => TI[S.plates[b.plate].tier] - TI[S.plates[a.plate].tier] || b.price - a.price, val: (a, b) => S.plates[b.plate].value - S.plates[a.plate].value, deal: (a, b) => a.price / S.plates[a.plate].value - b.price / S.plates[b.plate].value };
    ls.sort(sorts[sp.get('sort')] || sorts.new);
    return { listings: ls.map(listingPub), fetchedAt: Date.now() };
  });
  // ---- market maker + dealer (same rules as server/app.mjs) ----
  const isBot = id => (S.users.find(x => x.id === id) || {}).role === 'bot';
  const botUser = () => { let b = S.users.find(x => x.role === 'bot'); if (!b) { b = { id: S.users.length + 1, email: 'market@plateclub.invalid', nickname: G.MARKET_BOT.nick, pass: 'locked', verified: true, balance: 0, created: Date.now() - 6 * 86400e3, role: 'bot' }; S.users.push(b); } return b; };
  async function botList(bot, pl, price) { const l = { id: newId('L'), plate: pl.id, seller: bot.id, price, status: 'ACTIVE', created: Date.now(), updated: Date.now() }; S.listings.unshift(l); pl.status = 'LISTED'; await event({ plate: pl.id, kind: 'LISTED', from: bot.id, price }); }
  let lastStock = 0;
  async function stock(force) {
    if (!force && Date.now() - lastStock < 20000) return; lastStock = Date.now();
    const bot = botUser();
    for (const l of S.listings.filter(x => x.seller === bot.id && x.status === 'ACTIVE' && Date.now() - x.updated > G.BOT_DECAY.minutes * 60e3)) {
      const v = S.plates[l.plate].value, floor = Math.ceil(v * G.BOT_DECAY.floor); if (l.price <= floor) continue;
      l.price = Math.max(floor, Math.round(l.price * G.BOT_DECAY.step)); l.updated = Date.now(); await event({ plate: l.plate, kind: 'PRICE_CHANGED', from: bot.id, price: l.price });
    }
    for (const pl of Object.values(S.plates).filter(x => x.owner === bot.id && x.status === 'OWNED')) await botList(bot, pl, Math.round(pl.value * (1 + Math.random() * 0.25)));
    const have = S.listings.filter(x => x.seller === bot.id && x.status === 'ACTIVE').length;
    const groups = [...new Set(Object.values(G.REGIONS).map(r => r[1]))];
    for (let i = 0; i < Math.min(ST().botSize - have, 60); i++) {
      const tier = G.drawTier(G.MARKET_BOT.tierOdds); const by = Math.random() < 0.3; const grp = groups[Math.floor(Math.random() * groups.length)];
      const pool = by ? { RU: [], BY: Object.keys(G.BY_REGIONS) } : { RU: Object.keys(G.REGIONS).filter(r => G.REGIONS[r][1] === grp), BY: [] };
      let g, k = 0; do { g = G.genPlate(tier, pool); k++; } while (S.combos.filter(x => x === G.comboKey(g)).length >= 2 && k < 20);
      const pl = { ...g, id: newId('PC'), combo: G.comboKey(g), copy: S.combos.filter(x => x === G.comboKey(g)).length + 1, value: G.plateValue(g), owner: bot.id, status: 'OWNED', origin: 'Рынок Plate Club', created: Date.now() - Math.random() * 6 * 3600e3, lastTx: null, mintTx: newId('MK') };
      pl.seal = await sealOf(pl); S.plates[pl.id] = pl; S.combos.push(pl.combo);
      await event({ plate: pl.id, kind: 'MINTED', to: bot.id, tx: pl.mintTx });
      await botList(bot, pl, G.botListPrice(pl.value, Math.random(), Math.random()));
      const l = S.listings[0]; l.created = l.updated = Date.now() - Math.random() * 25 * 60e3;
    }
  }
  r('GET', '/api/market/stats', () => {
    const day = Date.now() - 86400e3; const sold = S.listings.filter(l => l.status === 'SOLD'); const act = S.listings.filter(l => l.status === 'ACTIVE');
    const wk = sold.filter(l => l.soldAt > Date.now() - 7 * 86400e3);
    return { sales: sold.filter(l => l.soldAt > day).length, volume: sold.filter(l => l.soldAt > day).reduce((a, l) => a + l.price, 0), active: act.length, deals: act.filter(l => l.price < S.plates[l.plate].value).length, ratio: wk.length ? Math.round(wk.reduce((a, l) => a + l.price / S.plates[l.plate].value, 0) / wk.length * 1000) / 1000 : 1 };
  });
  const dealerUsed = (u, day) => S.ledger.filter(t => t.user === u.id && t.kind === 'dealer_sell' && t.at >= day * 86400000).length;
  r('GET', '/api/dealer', () => {
    const d = G.dealerDemand(); const u = me(); let plates = [];
    if (u) plates = Object.values(S.plates).filter(p => p.owner === u.id && p.status === 'OWNED' && G.DEALER.tiers.includes(p.tier)).sort((a, b) => b.value - a.value).map(p => ({ ...pub(p), demand: (d.demands.find(x => G.matchesDemand(p, x)) || {}).id || null, offer: Math.round(p.value * ST().dealerRate) })).filter(p => p.demand);
    return { demands: d.demands, ends: d.ends, rate: ST().dealerRate, perDay: ST().dealerPerDay, used: u ? dealerUsed(u, d.day) : 0, plates };
  });
  r('POST', '/api/dealer/sell', async ({ b, u }) => {
    const d = G.dealerDemand();
    if (dealerUsed(u, d.day) >= ST().dealerPerDay) throw new E(409, `Скупщик сегодня уже купил у вас ${ST().dealerPerDay} номера. Приходите завтра.`);
    const pl = S.plates[b.plateId]; if (!pl || pl.owner !== u.id || pl.status === 'BANKED' || pl.status === 'BURNED') throw new E(404, 'Этого номера нет в вашей коллекции.');
    if (pl.status === 'LISTED') throw new E(409, 'Сначала снимите номер с продажи на рынке.');
    if (!d.demands.some(x => G.matchesDemand(pl, x))) throw new E(409, 'Скупщику сегодня такие номера не нужны.');
    const amt = Math.round(pl.value * ST().dealerRate); const bot = botUser();
    const t = ledger(u.id, 'dealer_sell', amt, `Продан скупщику: ${G.plateStr(pl)}`, pl.id);
    pl.owner = bot.id; pl.status = 'OWNED'; pl.lastTx = t.id; pl.paid = null;
    await event({ plate: pl.id, kind: 'TRANSFERRED', from: u.id, to: bot.id, price: amt, tx: t.id });
    return { ok: true, amount: amt, balance: u.balance };
  }, true);
  // ---- support + extended control panel (same rules as server/app.mjs) ----
  const TK = () => (S.tickets = S.tickets || []);
  const tPub = t => ({ id: t.id, subject: t.subject, status: t.status, userUnread: !!t.userUnread, adminUnread: !!t.adminUnread, created: t.created, updated: t.updated, nickname: nick(t.user), userId: t.user, last: (t.msgs.at(-1) || {}).body || '' });
  const thread = t => ({ ticket: tPub(t), messages: t.msgs.map((m, i) => ({ id: i + 1, body: m.body, fromAdmin: m.fromAdmin, at: m.at, author: nick(m.author) })) });
  const txt = (v, n) => String(v || '').replace(/\r/g, '').trim().slice(0, n);
  r('GET', '/api/support', ({ u }) => ({ tickets: TK().filter(t => t.user === u.id).sort((a, b) => b.updated - a.updated).map(tPub) }), true);
  r('POST', '/api/support', ({ u, b }) => { const subject = txt(b.subject, 120), body = txt(b.body, 4000); if (subject.length < 3) throw new E(400, 'Тема: от 3 символов.', { fields: { subject: 'От 3 символов.' } }); if (body.length < 5) throw new E(400, 'Опишите вопрос подробнее (от 5 символов).', { fields: { body: 'От 5 символов.' } }); const t = { id: newId('T'), user: u.id, subject, status: 'OPEN', userUnread: false, adminUnread: true, created: Date.now(), updated: Date.now(), msgs: [{ author: u.id, fromAdmin: false, body, at: Date.now() }] }; TK().push(t); return { ok: true, id: t.id }; }, true);
  r('GET', '/api/support/:id', ({ u, p }) => { const t = TK().find(x => x.id === p.id); if (!t || t.user !== u.id) throw new E(404, 'Обращение не найдено.'); const d = thread(t); t.userUnread = false; return d; }, true);
  r('POST', '/api/support/:id/reply', ({ u, p, b }) => { const t = TK().find(x => x.id === p.id); if (!t || t.user !== u.id) throw new E(404, 'Обращение не найдено.'); const body = txt(b.body, 4000); if (!body) throw new E(400, 'Напишите сообщение.'); t.msgs.push({ author: u.id, fromAdmin: false, body, at: Date.now() }); Object.assign(t, { status: 'OPEN', adminUnread: true, updated: Date.now() }); return { ok: true }; }, true);
  r('GET', '/api/admin/support', ({ u, url }) => { admin(u); const st = url.searchParams.get('status'); return { tickets: TK().filter(t => !['OPEN', 'ANSWERED', 'CLOSED'].includes(st) || t.status === st).sort((a, b) => (b.adminUnread - a.adminUnread) || b.updated - a.updated).map(tPub) }; }, true);
  r('GET', '/api/admin/support/:id', ({ u, p }) => { admin(u); const t = TK().find(x => x.id === p.id); if (!t) throw new E(404, 'Обращение не найдено.'); const d = thread(t); t.adminUnread = false; return d; }, true);
  r('POST', '/api/admin/support/:id/reply', ({ u, p, b }) => { admin(u); const t = TK().find(x => x.id === p.id); if (!t) throw new E(404, 'Обращение не найдено.'); const body = txt(b.body, 4000); if (!body) throw new E(400, 'Напишите ответ.'); t.msgs.push({ author: u.id, fromAdmin: true, body, at: Date.now() }); Object.assign(t, { status: b.close ? 'CLOSED' : 'ANSWERED', userUnread: true, adminUnread: false, updated: Date.now() }); return { ok: true }; }, true);
  r('POST', '/api/admin/support/:id/status', ({ u, p, b }) => { admin(u); const t = TK().find(x => x.id === p.id); if (!t) throw new E(404, 'Обращение не найдено.'); if (!['OPEN', 'ANSWERED', 'CLOSED'].includes(b.status)) throw new E(400, 'Неизвестный статус.'); Object.assign(t, { status: b.status, adminUnread: false, updated: Date.now() }); return { ok: true }; }, true);
  r('POST', '/api/admin/message', ({ u, b }) => { admin(u); const subject = txt(b.subject, 120) || 'Сообщение от Plate Club', body = txt(b.body, 4000); if (!body) throw new E(400, 'Напишите сообщение.'); const to = b.all ? S.users.filter(x => (x.role || 'user') === 'user' && !x.blocked) : S.users.filter(x => x.id === Number(b.userId)); if (!to.length) throw new E(404, 'Игрок не найден.'); for (const x of to) TK().push({ id: newId('T'), user: x.id, subject, status: 'ANSWERED', userUnread: true, adminUnread: false, created: Date.now(), updated: Date.now(), msgs: [{ author: u.id, fromAdmin: true, body, at: Date.now() }] }); alog(u, 'message', b.all ? 'все игроки' : to[0].nickname, to.length, subject); return { ok: true, sent: to.length }; }, true);
  const ownPlates = id => Object.values(S.plates).filter(p => p.owner === id && (p.status === 'OWNED' || p.status === 'LISTED'));
  r('GET', '/api/admin/users/:id', ({ u, p }) => { admin(u); const x = S.users.find(y => y.id === Number(p.id)); if (!x) throw new E(404, 'Игрок не найден.'); const L = S.ledger.filter(t => t.user === x.id);
    return { user: { id: x.id, email: x.email, nickname: x.nickname, balance: x.balance, role: x.role || 'user', verified: !!x.verified, joined: x.created, blocked: x.blocked || null, blockedReason: x.blockedReason || null, opens: L.filter(t => t.kind === 'case_open').length, spent: -L.filter(t => t.kind === 'case_open').reduce((a, t) => a + t.amount, 0), topups: L.filter(t => t.kind === 'topup').reduce((a, t) => a + t.amount, 0), sold: S.listings.filter(l => l.seller === x.id && l.status === 'SOLD').length, bought: S.listings.filter(l => l.buyer === x.id).length, lastActive: L[0] ? L[0].at : null },
      plates: ownPlates(x.id).sort((a, b) => b.value - a.value).map(pub), ledger: L.slice(0, 60).map(t => ({ id: t.id, kind: t.kind, amount: t.amount, balance: t.balance, label: t.label, at: t.at })), tickets: TK().filter(t => t.user === x.id).map(tPub) }; }, true);
  r('POST', '/api/admin/users/:id/block', ({ u, p, b }) => { admin(u); const x = S.users.find(y => y.id === Number(p.id)); if (!x) throw new E(404, 'Игрок не найден.'); if (x.id === u.id) throw new E(409, 'Нельзя заблокировать самого себя.'); if ((x.role || 'user') !== 'user') throw new E(409, 'Заблокировать можно только игрока.'); const reason = txt(b.reason, 200); if (b.block && !reason) throw new E(400, 'Укажите причину блокировки.');
    x.blocked = b.block ? Date.now() : null; x.blockedReason = b.block ? reason : null; if (b.block) S.listings.filter(l => l.seller === x.id && l.status === 'ACTIVE').forEach(l => { l.status = 'CANCELLED'; S.plates[l.plate].status = 'OWNED'; }); alog(u, b.block ? 'block_user' : 'unblock_user', x.nickname, null, reason || null); return { ok: true, blocked: !!b.block }; }, true);
  r('POST', '/api/admin/users/:id/plate', async ({ u, p, b }) => { admin(u); const x = S.users.find(y => y.id === Number(p.id)); if (!x) throw new E(404, 'Игрок не найден.'); if (!G.TIERS.some(t => t.id === b.tier)) throw new E(400, 'Выберите редкость.');
    const pool = b.country === 'BY' ? { RU: [], BY: Object.keys(G.BY_REGIONS) } : { RU: Object.keys(G.REGIONS), BY: [] }; let g, k = 0; do { g = G.genPlate(b.tier, pool); k++; } while (S.combos.filter(c => c === G.comboKey(g)).length >= 2 && k < 20);
    const pl = { ...g, id: newId('PC'), combo: G.comboKey(g), copy: S.combos.filter(c => c === G.comboKey(g)).length + 1, value: G.plateValue(g), owner: x.id, status: 'OWNED', origin: 'Подарок Plate Club', created: Date.now(), lastTx: null, mintTx: newId('GF') };
    pl.seal = await sealOf(pl); S.plates[pl.id] = pl; S.combos.push(pl.combo); await event({ plate: pl.id, kind: 'MINTED', to: x.id, tx: pl.mintTx }); alog(u, 'gift_plate', x.nickname, pl.value, `${G.plateStr(pl)} · ${txt(b.reason, 200) || 'Подарок'}`); return { ok: true, plate: pub(pl) }; }, true);
  r('POST', '/api/admin/grant-all', ({ u, b }) => { admin(u); const amt = Number(b.amount), reason = txt(b.reason, 200); if (!Number.isInteger(amt) || amt < 1 || amt > 1e6) throw new E(400, 'Сумма: от 1 до 1 000 000 PLT каждому.'); if (!reason) throw new E(400, 'Укажите причину — игроки увидят её в истории.'); const us = S.users.filter(x => (x.role || 'user') === 'user' && !x.blocked); us.forEach(x => ledger(x.id, 'admin_grant', amt, `Начисление Plate Club: ${reason}`, 'admin:' + u.nickname)); alog(u, 'grant_all', 'все игроки', amt * us.length, reason); return { ok: true, players: us.length, total: amt * us.length }; }, true);
  r('POST', '/api/admin/demo-players', ({ u }) => { admin(u); alog(u, 'demo_players', 'demo_*', 0, null); return { ok: true, made: 0 }; }, true);
  r('GET', '/api/admin/settings', ({ u }) => { admin(u); return { settings: ST(), defaults: G.SETTINGS_DEFAULT, cases: G.CASES.map(({ id, ru, en, name, cat, color, price, ev }) => ({ id, ru, en, name, cat, color, price, ev })) }; }, true);
  r('POST', '/api/admin/settings', ({ u, b }) => { admin(u); const cur = ST(); const next = G.cleanSettings({ ...cur, ...b, cases: b.cases ? b.cases : cur.cases }); const changed = Object.keys(next).filter(k => JSON.stringify(next[k]) !== JSON.stringify(cur[k])); S.settings = next; alog(u, 'settings', changed.join(', ') || '—', null, null); lastStock = 0; return { ok: true, settings: next }; }, true);
  r('POST', '/api/admin/market/restock', async ({ u }) => { admin(u); await stock(true); return { ok: true }; }, true);
  r('GET', '/api/admin/economy', ({ u }) => { admin(u); const sum = k => S.ledger.filter(t => (Array.isArray(k) ? k.includes(t.kind) : t.kind === k)).reduce((a, t) => a + t.amount, 0); const day = Date.now() - 86400e3; const cs = {};
    S.ledger.filter(t => t.kind === 'case_open').forEach(t => { const m = /Открыт кейс (\d+)/.exec(t.label); if (m) { cs[m[1]] = cs[m[1]] || { id: m[1], opens: 0, spent: 0 }; cs[m[1]].opens++; cs[m[1]].spent -= t.amount; } });
    return { economy: { case_spent: -sum('case_open'), bank_paid: sum('bank_sell'), dealer_paid: sum('dealer_sell'), bonuses: sum(['daily_bonus', 'reward', 'promo', 'signup_bonus']), topups: sum('topup'), grants: S.ledger.filter(t => t.kind === 'admin_grant' && t.ref !== 'admin-initial').reduce((a, t) => a + t.amount, 0), new24: S.users.filter(x => (x.role || 'user') === 'user' && x.created > day).length, active24: new Set(S.ledger.filter(t => t.at > day).map(t => t.user)).size, blocked: S.users.filter(x => x.blocked).length, open_tickets: TK().filter(t => t.status !== 'CLOSED').length }, cases: Object.values(cs).sort((a, b) => b.opens - a.opens) }; }, true);
  // ===================== games (same rules as server/app.mjs) =====================
  async function mintP({ tier, pool, focus, owner, origin, tx, status = 'OWNED', paid = null }) {
    let g, k = 0; do { g = G.genPlate(tier, pool, focus); k++; } while (S.combos.filter(c => c === G.comboKey(g)).length >= 2 && k < 40);
    const pl = { ...g, id: newId('PC'), combo: G.comboKey(g), copy: S.combos.filter(c => c === G.comboKey(g)).length + 1, value: G.plateValue(g), owner, status, origin, created: Date.now(), lastTx: tx, mintTx: tx, paid };
    pl.seal = await sealOf(pl); S.plates[pl.id] = pl; S.combos.push(pl.combo); return pl;
  }
  const RPOOL = () => (Math.random() < 0.3 ? { RU: [], BY: Object.keys(G.BY_REGIONS) } : { RU: Object.keys(G.REGIONS), BY: [] });
  const owned = id => Object.values(S.plates).filter(p => p.owner === id && (p.status === 'OWNED' || p.status === 'LISTED')).map(pub);
  // sets
  r('GET', '/api/sets', () => { const u = me(); const plates = u ? owned(u.id) : []; const got = new Set(u ? S.ledger.filter(t => t.user === u.id && t.kind === 'reward' && String(t.ref).startsWith('set:')).map(t => t.ref.slice(4)) : []); const by = Object.fromEntries(plates.map(p => [p.id, p]));
    return { sets: G.SETS.map(st => { const pr = G.setProgress(st, plates); return { id: st.id, have: pr.have, need: pr.need, done: pr.done, claimed: got.has(st.id), filled: pr.filled.map(id => (id ? { id, letters: by[id].letters, digits: by[id].digits, region: by[id].region, country: by[id].country, tier: by[id].tier } : null)) }; }) }; });
  r('POST', '/api/sets/:id/claim', ({ u, p }) => { const st = G.SETS.find(x => x.id === p.id); if (!st) throw new E(404, 'Такой коллекции нет.'); if (S.ledger.some(t => t.user === u.id && t.kind === 'reward' && t.ref === 'set:' + st.id)) throw new E(409, 'Награда за эту коллекцию уже получена.'); const pr = G.setProgress(st, owned(u.id)); if (!pr.done) throw new E(409, `Коллекция ещё не собрана: ${pr.have} из ${pr.need}.`); ledger(u.id, 'reward', st.reward, `Коллекция «${st.ru}»`, 'set:' + st.id); return { ok: true, amount: st.reward, balance: u.balance }; }, true);
  // battles
  const BT = () => (S.battles = S.battles || []);
  const bPub = b => ({ id: b.id, caseId: b.caseId, seats: b.seats, rounds: b.rounds, price: b.price, status: b.status, winnerSeat: b.winnerSeat ?? null, totalValue: b.totalValue || 0, created: b.created, finished: b.finished || null, creator: nick(b.creator), players: b.players.map(x => ({ seat: x.seat, nickname: x.bot || nick(x.user), bot: !!x.bot, userId: x.bot ? null : x.user, paid: x.paid, total: x.total || 0 })) });
  async function resolveB(b) {
    const c = G.anyCaseById(b.caseId); const pool = G.poolRegions(c); const totals = Array(b.seats).fill(0); b.drops = [];
    for (let r = 1; r <= b.rounds; r++) for (const pl of b.players) { const p = await mintP({ tier: G.drawTier(c.odds), pool, focus: c.focus, owner: null, origin: `Баттл ${b.id} · ${c.ru}`, tx: b.id }); b.drops.push({ round: r, seat: pl.seat, plate: p.id, value: p.value }); totals[pl.seat] += p.value; }
    const best = Math.max(...totals); const cands = totals.map((t, i) => (t === best ? i : -1)).filter(i => i >= 0); const win = cands[Math.floor(Math.random() * cands.length)];
    const ws = b.players.find(x => x.seat === win); const owner = ws.bot ? botUser().id : ws.user; const sum = totals.reduce((a, t) => a + t, 0); const paid = b.players.reduce((a, x) => a + x.paid, 0);
    for (const d of b.drops) { const p = S.plates[d.plate]; p.owner = owner; p.paid = ws.bot ? null : Math.round(paid * p.value / Math.max(1, sum)); await event({ plate: p.id, kind: 'MINTED', to: owner, tx: b.id }); }
    b.players.forEach(x => { x.total = totals[x.seat]; }); Object.assign(b, { status: 'DONE', winnerSeat: win, totalValue: sum, finished: Date.now() });
  }
  r('GET', '/api/battles', () => ({ open: BT().filter(b => b.status === 'OPEN').sort((a, b) => b.created - a.created).map(bPub), done: BT().filter(b => b.status === 'DONE').sort((a, b) => b.finished - a.finished).slice(0, 12).map(bPub) }));
  r('GET', '/api/battles/:id', ({ p }) => { const b = BT().find(x => x.id === p.id); if (!b) throw new E(404, 'Баттл не найден.'); return { battle: bPub(b), drops: (b.drops || []).map(d => ({ round: d.round, seat: d.seat, value: d.value, plate: pub(S.plates[d.plate]) })) }; });
  r('POST', '/api/battles', ({ u, b }) => { const c = G.battleCaseById(String(b.caseId || '')); if (!c) throw new E(404, 'Для баттлов есть четыре своих кейса: Дуэль, Арена, Колизей и Олимп.'); const seats = Number(b.seats), rounds = Number(b.rounds);
    if (!G.BATTLE.seats.includes(seats)) throw new E(400, 'Игроков: 2, 3 или 4.'); if (!(Number.isInteger(rounds) && rounds >= 1 && rounds <= G.BATTLE.maxRounds)) throw new E(400, 'Раундов: от 1 до 5.');
    if (BT().filter(x => x.creator === u.id && x.status === 'OPEN').length >= G.BATTLE.maxOpen) throw new E(409, `У вас уже ${G.BATTLE.maxOpen} открытых баттла. Дождитесь соперников или отмените один.`);
    const price = G.casePrice(c, ST()); const cost = price * rounds; if (u.balance < cost) throw new E(402, `Не хватает PLT: участие стоит ${cost} PLT, на балансе ${u.balance} PLT.`);
    const bt = { id: newId('B'), caseId: c.id, seats, rounds, price, status: 'OPEN', creator: u.id, created: Date.now(), players: [{ seat: 0, user: u.id, paid: cost }] }; BT().push(bt); ledger(u.id, 'battle_entry', -cost, `Баттл ${bt.id} · ${rounds} × ${c.ru}`, bt.id); return { ok: true, id: bt.id, balance: u.balance }; }, true);
  r('POST', '/api/battles/:id/join', async ({ u, p }) => { const b = BT().find(x => x.id === p.id); if (!b) throw new E(404, 'Баттл не найден.'); if (b.status !== 'OPEN') throw new E(409, 'Баттл уже начался или отменён.'); if (b.players.some(x => x.user === u.id)) throw new E(409, 'Вы уже в этом баттле.');
    const free = [...Array(b.seats).keys()].find(i => !b.players.some(x => x.seat === i)); const cost = b.price * b.rounds; if (u.balance < cost) throw new E(402, `Не хватает PLT: участие стоит ${cost} PLT, на балансе ${u.balance} PLT.`);
    ledger(u.id, 'battle_entry', -cost, `Баттл ${b.id} · ${b.rounds} × ${G.anyCaseById(b.caseId).ru}`, b.id); b.players.push({ seat: free, user: u.id, paid: cost }); b.players.sort((a, c) => a.seat - c.seat); if (b.players.length === b.seats) await resolveB(b); return { ok: true, seat: free, balance: u.balance }; }, true);
  r('POST', '/api/battles/:id/bots', async ({ u, p }) => { const b = BT().find(x => x.id === p.id); if (!b) throw new E(404, 'Баттл не найден.'); if (b.creator !== u.id) throw new E(403, 'Позвать ботов может только создатель баттла.'); if (b.status !== 'OPEN') throw new E(409, 'Баттл уже начался или отменён.');
    const names = [...G.BATTLE.botNames].sort(() => Math.random() - 0.5); let k = 0; for (let i = 0; i < b.seats; i++) if (!b.players.some(x => x.seat === i)) b.players.push({ seat: i, bot: names[k++], paid: 0 }); b.players.sort((a, c) => a.seat - c.seat); await resolveB(b); return { ok: true }; }, true);
  r('POST', '/api/battles/:id/cancel', ({ u, p }) => { const b = BT().find(x => x.id === p.id); if (!b) throw new E(404, 'Баттл не найден.'); if (b.creator !== u.id && u.role !== 'admin') throw new E(403, 'Отменить может только создатель баттла.'); if (b.status !== 'OPEN') throw new E(409, 'Баттл уже начался или отменён.'); b.players.filter(x => x.user && x.paid).forEach(x => ledger(x.user, 'battle_refund', x.paid, `Возврат за баттл ${b.id}`, b.id)); b.status = 'CANCELLED'; return { ok: true }; }, true);
  // swaps
  const SWS = () => (S.swaps = S.swaps || []);
  const plShort = id => { const p = S.plates[id]; return p ? { ...pub(p), owner: p.owner } : null; };
  const swPub = x => ({ id: x.id, from: nick(x.from), to: nick(x.to), give: x.give.map(plShort).filter(Boolean), want: x.want.map(plShort).filter(Boolean), givePlt: x.givePlt, wantPlt: x.wantPlt, message: x.message || null, status: x.status, note: x.note || null, created: x.created, updated: x.updated });
  r('GET', '/api/swaps', ({ u }) => { const l = SWS().slice().sort((a, b) => (b.status === 'PENDING') - (a.status === 'PENDING') || b.updated - a.updated); return { incoming: l.filter(x => x.to === u.id).map(swPub), outgoing: l.filter(x => x.from === u.id).map(swPub) }; }, true);
  r('GET', '/api/users/:nick/plates', ({ p }) => { const t = S.users.find(x => x.nickname.toLowerCase() === p.nick.toLowerCase() && !x.blocked); if (!t || t.role === 'bot') throw new E(404, 'Коллекционер с таким ником не найден.'); return { nickname: t.nickname, plates: Object.values(S.plates).filter(x => x.owner === t.id && x.status === 'OWNED').sort((a, b) => b.value - a.value).map(pub) }; });
  r('POST', '/api/swaps', ({ u, b }) => { const uniq = v => (Array.isArray(v) ? [...new Set(v.map(String))] : []); const give = uniq(b.give), want = uniq(b.want), givePlt = Number(b.givePlt || 0), wantPlt = Number(b.wantPlt || 0); const okP = v => Number.isInteger(v) && v >= 0 && v <= 1e7;
    if (give.length > 6 || want.length > 6) throw new E(400, 'Не больше 6 номеров с каждой стороны.'); if (!okP(givePlt) || !okP(wantPlt)) throw new E(400, 'Доплата: целое число от 0 до 10 000 000 PLT.'); if (!give.length && !want.length) throw new E(400, 'Добавьте хотя бы один номер в обмен.'); if ((!give.length && !givePlt) || (!want.length && !wantPlt)) throw new E(400, 'С каждой стороны должен быть номер или доплата.');
    const t = S.users.find(x => x.nickname.toLowerCase() === String(b.to || '').toLowerCase() && !x.blocked); if (!t || t.role === 'bot') throw new E(404, 'Коллекционер с таким ником не найден.'); if (t.id === u.id) throw new E(409, 'Нельзя предложить обмен самому себе.');
    if (!give.every(i => S.plates[i] && S.plates[i].owner === u.id && S.plates[i].status === 'OWNED')) throw new E(409, 'Отдавать можно только свои номера, которые не выставлены на рынок.'); if (!want.every(i => S.plates[i] && S.plates[i].owner === t.id && S.plates[i].status === 'OWNED')) throw new E(409, `Некоторых номеров уже нет у ${t.nickname} или они выставлены на рынок.`);
    if (givePlt > u.balance) throw new E(402, `Не хватает PLT для доплаты: на балансе ${u.balance} PLT.`);
    const x = { id: newId('SW'), from: u.id, to: t.id, give, want, givePlt, wantPlt, message: String(b.message || '').trim().slice(0, 200), status: 'PENDING', created: Date.now(), updated: Date.now() }; SWS().push(x); return { ok: true, id: x.id }; }, true);
  r('POST', '/api/swaps/:id/:action', async ({ u, p }) => { const x = SWS().find(y => y.id === p.id); const act = p.action; if (!x || (act === 'cancel' ? x.from !== u.id : x.to !== u.id)) throw new E(404, 'Предложение не найдено.'); if (x.status !== 'PENDING') throw new E(409, 'Это предложение уже закрыто.');
    if (act !== 'accept') { x.status = act === 'cancel' ? 'CANCELLED' : 'DECLINED'; x.updated = Date.now(); return { ok: true, status: x.status }; }
    const fromU = S.users.find(y => y.id === x.from), toU = u; const fail = note => { Object.assign(x, { status: 'FAILED', note, updated: Date.now() }); save(); throw new E(409, note); };
    if (!x.give.every(i => S.plates[i] && S.plates[i].owner === x.from && S.plates[i].status === 'OWNED')) fail('Предложенных номеров уже нет у отправителя или они на рынке.');
    if (!x.want.every(i => S.plates[i] && S.plates[i].owner === x.to && S.plates[i].status === 'OWNED')) fail('Ваших номеров из обмена уже нет у вас или они выставлены на рынок.');
    if (fromU.balance < x.givePlt) fail('У отправителя не хватает PLT на доплату.'); if (toU.balance < x.wantPlt) throw new E(402, `Не хватает PLT для доплаты: нужно ${x.wantPlt} PLT, на балансе ${toU.balance} PLT.`);
    const tx = newId('SW'); for (const i of x.give) { S.plates[i].owner = x.to; S.plates[i].paid = null; await event({ plate: i, kind: 'TRANSFERRED', from: x.from, to: x.to, tx }); } for (const i of x.want) { S.plates[i].owner = x.from; S.plates[i].paid = null; await event({ plate: i, kind: 'TRANSFERRED', from: x.to, to: x.from, tx }); }
    if (x.givePlt) { ledger(x.from, 'trade', -x.givePlt, `Доплата за обмен ${x.id}`, x.id); ledger(x.to, 'trade', x.givePlt, `Доплата за обмен ${x.id}`, x.id); } if (x.wantPlt) { ledger(x.to, 'trade', -x.wantPlt, `Доплата за обмен ${x.id}`, x.id); ledger(x.from, 'trade', x.wantPlt, `Доплата за обмен ${x.id}`, x.id); }
    Object.assign(x, { status: 'ACCEPTED', updated: Date.now() }); return { ok: true, status: 'ACCEPTED' }; }, true);
  // auction of the day
  const AUC = () => (S.auctions = S.auctions || []);
  async function auctionTick() {
    const bot = botUser();
    for (const a of AUC().filter(x => x.status === 'LIVE' && x.ends <= Date.now())) { const pl = S.plates[a.plate]; if (a.topUser) { pl.owner = a.topUser; pl.status = 'OWNED'; pl.paid = a.topBid; await event({ plate: pl.id, kind: 'TRANSFERRED', from: bot.id, to: a.topUser, price: a.topBid, tx: newId('AU') }); } else pl.status = 'OWNED'; a.status = 'DONE'; }
    const day = G.auctionDay(); if (!AUC().some(x => x.day === day)) { const tx = newId('AU'); const pl = await mintP({ tier: G.drawTier(G.AUCTION.tierOdds), pool: RPOOL(), owner: bot.id, origin: 'Аукцион дня', tx, status: 'AUCTION' }); await event({ plate: pl.id, kind: 'MINTED', to: bot.id, tx }); AUC().push({ day, plate: pl.id, start: Math.max(10, Math.round(pl.value * G.AUCTION.startK)), step: Math.max(G.AUCTION.minStep, Math.round(pl.value * G.AUCTION.stepK)), ends: (day + 1) * 86400000, status: 'LIVE', topBid: null, topUser: null, bids: 0, history: [] }); }
  }
  const aPub = a => ({ day: a.day, start: a.start, step: a.step, ends: a.ends, status: a.status, topBid: a.topBid, topUser: a.topUser ? nick(a.topUser) : null, bids: a.bids });
  r('GET', '/api/auction', async () => { await auctionTick(); const a = AUC().filter(x => x.status === 'LIVE').sort((x, y) => y.day - x.day)[0]; const u = me();
    return { auction: a ? { ...aPub(a), min: G.auctionMin(a), plate: pub(S.plates[a.plate]), history: a.history.slice().reverse().slice(0, 20).map(h => ({ amount: h.amount, at: h.at, nickname: nick(h.user) })), mine: !!u && a.topUser === u.id } : null, past: AUC().filter(x => x.status === 'DONE').sort((x, y) => y.day - x.day).slice(0, 6).map(x => ({ ...aPub(x), plate: pub(S.plates[x.plate]) })), now: Date.now() }; });
  r('POST', '/api/auction/bid', async ({ u, b }) => { await auctionTick(); const amount = Number(b.amount); if (!Number.isInteger(amount) || amount < 1) throw new E(400, 'Ставка: целое число PLT.');
    const a = AUC().filter(x => x.status === 'LIVE').sort((x, y) => y.day - x.day)[0]; if (!a) throw new E(409, 'Аукциона сейчас нет. Новый начнётся в 03:00 по Москве.'); const min = G.auctionMin(a); if (amount < min) throw new E(409, `Минимальная ставка сейчас ${min} PLT.`, { min });
    const avail = u.balance + (a.topUser === u.id ? a.topBid : 0); if (avail < amount) throw new E(402, `Не хватает PLT: ставка ${amount} PLT, доступно ${avail} PLT.`);
    if (a.topUser) ledger(a.topUser, 'auction_refund', a.topBid, a.topUser === u.id ? 'Аукцион дня: ставка повышена' : 'Аукцион дня: ставку перебили, PLT возвращены', 'auction:' + a.day);
    ledger(u.id, 'auction_bid', -amount, 'Ставка на аукционе дня', 'auction:' + a.day); if (a.ends - Date.now() < G.AUCTION.snipeMs) a.ends = Date.now() + G.AUCTION.snipeMs;
    Object.assign(a, { topBid: amount, topUser: u.id, bids: a.bids + 1 }); a.history.push({ user: u.id, amount, at: Date.now() }); return { ok: true, amount, ends: a.ends, balance: u.balance }; }, true);
  r('GET', '/api/market/sales', () => ({ sales: S.listings.filter(l => l.status === 'SOLD').sort((a, b) => b.soldAt - a.soldAt).slice(0, 12).map(l => { const pl = S.plates[l.plate]; return { listing: l.id, price: l.price, at: l.soldAt, seller: nick(l.seller), buyer: nick(l.buyer), plate: { country: pl.country || 'RU', id: pl.id, letters: pl.letters, digits: pl.digits, region: pl.region, tier: pl.tier } }; }) }));
  r('GET', '/api/market/mine', ({ u }) => ({ trades: S.listings.filter(l => l.seller === u.id || l.buyer === u.id).sort((a, b) => b.updated - a.updated).map(l => { const pl = S.plates[l.plate]; return { id: l.id, price: l.price, status: l.status, at: l.updated, role: l.seller === u.id ? 'seller' : 'buyer', seller: nick(l.seller), buyer: nick(l.buyer), plate: { country: pl.country || 'RU', id: pl.id, letters: pl.letters, digits: pl.digits, region: pl.region, tier: pl.tier } }; }) }), true);
  const priceOk = v => Number.isInteger(v) && v >= 1 && v <= 1e7;
  r('POST', '/api/market/listings', async ({ b, u }) => {
    const price = Number(b.price); if (!priceOk(price)) throw new E(400, 'Введите целую цену от 1 до 10 000 000 PLT.');
    const pl = S.plates[b.plateId]; if (!pl || pl.owner !== u.id || pl.status === 'BANKED') throw new E(404, 'Этого номера нет в вашей коллекции.');
    if (pl.status === 'LISTED') throw new E(409, 'Номер уже на рынке.');
    const l = { id: newId('L'), plate: pl.id, seller: u.id, price, status: 'ACTIVE', created: Date.now(), updated: Date.now() }; S.listings.unshift(l); pl.status = 'LISTED';
    await event({ plate: pl.id, kind: 'LISTED', from: u.id, price }); return { listing: { id: l.id, price, status: 'ACTIVE' } };
  }, true);
  r('PATCH', '/api/market/listings/:id', async ({ b, u, p }) => { const price = Number(b.price); if (!priceOk(price)) throw new E(400, 'Введите целую цену от 1 до 10 000 000 PLT.'); const l = S.listings.find(x => x.id === p.id); if (!l || l.seller !== u.id) throw new E(404, 'Объявление не найдено.'); if (l.status !== 'ACTIVE') throw new E(409, 'Это объявление уже нельзя изменить.'); l.price = price; l.updated = Date.now(); await event({ plate: l.plate, kind: 'PRICE_CHANGED', from: u.id, price }); return { listing: { id: l.id, price, status: 'ACTIVE' } }; }, true);
  r('DELETE', '/api/market/listings/:id', async ({ u, p }) => { const l = S.listings.find(x => x.id === p.id); if (!l || l.seller !== u.id) throw new E(404, 'Объявление не найдено.'); if (l.status !== 'ACTIVE') throw new E(409, 'Это объявление нельзя снять.'); l.status = 'CANCELLED'; l.updated = Date.now(); S.plates[l.plate].status = 'OWNED'; await event({ plate: l.plate, kind: 'DELISTED', from: u.id }); return { ok: true }; }, true);
  r('POST', '/api/market/listings/:id/buy', async ({ b, u, p }) => {
    const l = S.listings.find(x => x.id === p.id); if (!l) throw new E(404, 'Объявление не найдено.');
    if (l.status !== 'ACTIVE') throw new E(409, l.status === 'SOLD' ? 'Номер уже продан.' : 'Объявление больше не активно.');
    if (l.seller === u.id) throw new E(409, 'Нельзя купить своё объявление.');
    if (b.expectedPrice != null && Number(b.expectedPrice) !== l.price) throw new E(409, `Продавец изменил цену на ${l.price} PLT. Проверьте и подтвердите снова.`);
    if (u.balance < l.price) throw new E(402, `Не хватает PLT: цена ${l.price} PLT, на балансе ${u.balance} PLT.`);
    l.status = 'RESERVED'; const pl = S.plates[l.plate]; const fee = Math.round(l.price * ST().marketFee);
    const t = ledger(u.id, 'market_buy', -l.price, `Куплен ${G.plateStr(pl)} · ${l.id}`, l.id); ledger(l.seller, 'market_sale', l.price - fee, `Продан ${G.plateStr(pl)} · ${l.id} (комиссия ${fee} PLT)`, l.id);
    const tre = S.users.find(x => x.role === 'admin'); if (tre && fee > 0) ledger(tre.id, 'market_fee', fee, `Комиссия рынка 5% · ${G.plateStr(pl)} · ${l.id}`, l.id);
    pl.owner = u.id; pl.status = 'OWNED'; pl.lastTx = t.id; pl.paid = l.price; Object.assign(l, { status: 'SOLD', buyer: u.id, fee, soldAt: Date.now(), updated: Date.now() });
    await event({ plate: pl.id, kind: 'TRANSFERRED', from: l.seller, to: u.id, price: l.price, tx: t.id });
    return { ok: true, plateId: pl.id, price: l.price, balance: u.balance, txId: t.id };
  }, true);
  r('GET', '/api/users/:nick', ({ p }) => { const u = S.users.find(x => x.nickname.toLowerCase() === p.nick.toLowerCase()); if (!u) throw new E(404, 'Коллекционера с таким ником нет.'); const own = Object.values(S.plates).filter(x => x.owner === u.id && x.status !== 'BANKED'); return { profile: { medals: medalsOf()[u.id] || [], sets: S.ledger.filter(t => t.user === u.id && t.kind === 'reward' && String(t.ref).startsWith('set:')).map(t => t.ref.slice(4)), nickname: u.nickname, joined: u.created, plates: own.length, value: own.reduce((a, x) => a + x.value, 0), regions: new Set(own.map(x => x.region)).size, sold: S.listings.filter(l => l.seller === u.id && l.status === 'SOLD').length, top: own.sort((a, b) => b.value - a.value).slice(0, 8).map(pub) } }; });
  const rankRows = () => S.users.filter(u => (u.role || 'user') === 'user' && !u.blocked).map(u => { const own = Object.values(S.plates).filter(x => x.owner === u.id && (x.status === 'OWNED' || x.status === 'LISTED')); const value = own.reduce((a, x) => a + x.value, 0); const best = own.slice().sort((a, b) => b.value - a.value)[0];
    const wins = (S.battles || []).filter(bt => bt.status === 'DONE' && (bt.players.find(x => x.seat === bt.winnerSeat) || {}).user === u.id).length + (u.demoWins || 0);
    return { id: u.id, nickname: u.nickname, plates: own.length, value, balance: u.balance, total: u.balance + value, xp: xpOf(u), level: G.levelOf(xpOf(u)).level, wins, sets: S.ledger.filter(t => t.user === u.id && t.kind === 'reward' && String(t.ref).startsWith('set:')).length, bestValue: best ? best.value : 0, best: best ? pub(best) : null }; });
  const medalsOf = () => { const m = {}; rankRows().sort((a, b) => b.total - a.total).slice(0, 10).forEach((r, i) => { if (r.total > 0) m[r.id] = i < 3 ? ['top10', 'top3'] : ['top10']; }); return m; };
  r('GET', '/api/rankings', ({ url }) => { const by = ['total', 'collection', 'level', 'battles', 'sets', 'best'].includes(url.searchParams.get('by')) ? url.searchParams.get('by') : 'total'; const key = { total: 'total', collection: 'value', level: 'xp', battles: 'wins', sets: 'sets', best: 'bestValue' }[by]; const md = medalsOf(); const rows = rankRows();
    return { by, players: rows.length, rankings: rows.filter(r => r[key] > 0 || by === 'total').sort((a, b) => b[key] - a[key] || b.total - a.total).slice(0, 50).map(({ id, ...r }) => ({ ...r, medals: md[id] || [] })) }; });
  r('GET', '/api/wallet', ({ u, url }) => ({ balance: u.balance, ledger: S.ledger.filter(t => t.user === u.id).slice(0, url.searchParams.get('all') ? 500 : 20), payments: S.payments.filter(x => x.user === u.id).slice(0, 20) }), true);
  r('POST', '/api/payments/checkout', () => { throw new E(503, 'Пополнение скоро появится. Пока PLT можно получить бонусами, промокодами и продажей номеров.'); }, true);


  // ---- admin (preview) ----
  const ADMIN_CODE = 'PLATECLUB-PREVIEW-ADMIN';
  const admin = u => { if (u.role !== 'admin') throw new E(403, 'Только для администраторов.'); };
  const alog = (u, action, target, amount, reason) => { S.adminLog = S.adminLog || []; S.adminLog.unshift({ action, target, amount, reason, at: Date.now(), admin: u.nickname }); };
  r('POST', '/api/admin/claim', ({ b, u }) => {
    if (String(b.code || '').trim() !== ADMIN_CODE) throw new E(403, 'Неверный код.');
    u.role = 'admin'; let granted = 0;
    if (!S.ledger.some(t => t.user === u.id && t.kind === 'admin_grant' && t.ref === 'admin-initial')) { ledger(u.id, 'admin_grant', 10000000, 'Стартовый баланс администратора', 'admin-initial'); granted = 10000000; }
    alog(u, 'claim_admin', u.nickname, granted || null); return { ok: true, role: 'admin', granted };
  }, true);
  r('GET', '/api/admin/overview', ({ u }) => { admin(u); const sold = S.listings.filter(l => l.status === 'SOLD');
    return { overview: { users: S.users.length, plates: Object.values(S.plates).filter(p => p.status !== 'BANKED').length, active: S.listings.filter(l => l.status === 'ACTIVE').length, sold: sold.length, volume: sold.reduce((a, l) => a + l.price, 0), fees: S.ledger.filter(t => t.kind === 'market_fee').reduce((a, t) => a + t.amount, 0), user_plt: S.users.filter(x => x.role !== 'admin').reduce((a, x) => a + x.balance, 0), admin_plt: S.users.filter(x => x.role === 'admin').reduce((a, x) => a + x.balance, 0), opens: S.ledger.filter(t => t.kind === 'case_open').length, upgrades: (S.upgrades || []).length }, log: (S.adminLog || []).slice(0, 30) }; }, true);
  r('GET', '/api/admin/users', ({ u, url }) => { admin(u); const q = (url.searchParams.get('q') || '').toLowerCase(); return { users: S.users.filter(x => x.role !== 'bot').filter(x => !q || x.nickname.toLowerCase().includes(q) || x.email.toLowerCase().includes(q)).map(x => ({ id: x.id, email: x.email, nickname: x.nickname, balance: x.balance, role: x.role || 'user', blocked: !!x.blocked, plates: Object.values(S.plates).filter(p => p.owner === x.id && (p.status === 'OWNED' || p.status === 'LISTED')).length, value: Object.values(S.plates).filter(p => p.owner === x.id && (p.status === 'OWNED' || p.status === 'LISTED')).reduce((a, p) => a + p.value, 0), joined: x.created })) }; }, true);
  r('POST', '/api/admin/grant', ({ u, b }) => { admin(u); const amt = Number(b.amount), reason = String(b.reason || '').trim();
    if (!Number.isInteger(amt) || !amt || Math.abs(amt) > 1e8) throw new E(400, 'Введите целую сумму от −100 000 000 до 100 000 000 PLT, не ноль.');
    if (!reason) throw new E(400, 'Напишите причину — игрок увидит её в истории.');
    const t = b.userId ? S.users.find(x => x.id === Number(b.userId)) : S.users.find(x => x.nickname.toLowerCase() === String(b.nickname || '').toLowerCase()); if (!t) throw new E(404, 'Коллекционера с таким ником нет.');
    if (t.balance + amt < 0) throw new E(409, `У ${t.nickname} только ${t.balance} PLT, баланс не может стать отрицательным.`);
    const tx = ledger(t.id, 'admin_grant', amt, `Корректировка Plate Club: ${reason}`, 'admin:' + u.nickname); alog(u, amt > 0 ? 'grant_plt' : 'deduct_plt', t.nickname, amt, reason);
    return { ok: true, nickname: t.nickname, balance: t.balance, txId: tx.id }; }, true);
  r('GET', '/api/admin/listings', ({ u, url }) => { admin(u); const st = url.searchParams.get('status');
    return { listings: S.listings.filter(l => !['ACTIVE', 'RESERVED', 'SOLD', 'CANCELLED'].includes(st) || l.status === st).map(l => { const pl = S.plates[l.plate]; return { id: l.id, price: l.price, status: l.status, fee: l.fee, at: l.updated, seller: nick(l.seller), buyer: nick(l.buyer), plate: { country: pl.country || 'RU', id: pl.id, letters: pl.letters, digits: pl.digits, region: pl.region, tier: pl.tier, value: pl.value } }; }) }; }, true);
  r('POST', '/api/admin/listings/:id/remove', async ({ u, p, b }) => { admin(u); const reason = String(b.reason || '').trim(); if (!reason) throw new E(400, 'Напишите причину снятия.');
    const l = S.listings.find(x => x.id === p.id); if (!l) throw new E(404, 'Объявление не найдено.'); if (l.status !== 'ACTIVE') throw new E(409, 'Снять можно только активное объявление.');
    l.status = 'CANCELLED'; l.updated = Date.now(); S.plates[l.plate].status = 'OWNED'; await event({ plate: l.plate, kind: 'DELISTED', from: l.seller }); alog(u, 'remove_listing', l.id, null, reason); return { ok: true }; }, true);

  // ---- promo codes & perks (preview) ----
  S.promos = S.promos || [{ code: 'PLATECLUB', amount: 10, maxUses: null, uses: 0, active: true, note: 'Стартовый промокод', expires: null }, { code: 'LUCKY7', amount: 7, maxUses: 1000, uses: 0, active: true, note: 'Счастливые семёрки', expires: null }, { code: 'MINSK', amount: 10, maxUses: 1000, uses: 0, active: true, note: 'Для белорусских кейсов', expires: null }];
  S.redeemed = S.redeemed || [];
  r('POST', '/api/promo/redeem', ({ b, u }) => {
    const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length < 3) throw new E(400, 'Введите промокод.');
    const pc = S.promos.find(x => x.code === code); if (!pc || !pc.active) throw new E(404, 'Такого промокода нет или он выключен.');
    if (pc.expires && pc.expires < Date.now()) throw new E(410, 'Срок действия промокода закончился.');
    if (pc.maxUses != null && pc.uses >= pc.maxUses) throw new E(410, 'Промокод уже использовали максимальное число раз.');
    if (S.redeemed.some(x => x.code === code && x.user === u.id)) throw new E(409, 'Вы уже активировали этот промокод.');
    ledger(u.id, 'promo', pc.amount, `Промокод ${code}`, 'promo:' + code); pc.uses++; S.redeemed.push({ code, user: u.id });
    return { ok: true, code, amount: pc.amount, balance: u.balance };
  }, true);
  const today = () => Math.floor(Date.now() / 86400000);
  const dailyState = u => { const days = S.ledger.filter(t => t.user === u.id && t.kind === 'daily_bonus').map(t => +String(t.ref).slice(1)); const td = today(); const claimed = days[0] === td; let streak = 0, d = claimed ? td : td - 1; for (const x of days) { if (x === d) { streak++; d--; } else if (x < d) break; } return { claimed, streak, amount: ST().dailyBonus, nextAt: (td + 1) * 86400000 }; };
  r('GET', '/api/perks', ({ u }) => { const st = stats(u); const got = new Set(S.ledger.filter(t => t.user === u.id && t.kind === 'reward').map(t => t.ref)); const lv = G.levelOf(xpOf(u)); lv.unclaimed = Math.max(0, lv.level - 1 - S.ledger.filter(t => t.user === u.id && t.kind === 'reward' && String(t.ref).startsWith('lvl:')).length); lv.reward = G.LEVEL_REWARD; return { daily: dailyState(u), level: lv, stats: st, achievements: G.ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, text: a.text, reward: a.reward, done: a.ok(st), claimed: got.has('ach:' + a.id) })) }; }, true);
  r('POST', '/api/perks/daily', ({ u }) => { const d = dailyState(u); if (d.claimed) throw new E(409, 'Бонус за сегодня уже получен.'); const streak = d.streak + 1, amount = ST().dailyBonus; ledger(u.id, 'daily_bonus', amount, `Ежедневный бонус · день ${streak}`, 'D' + today()); return { ok: true, amount, streak, balance: u.balance }; }, true);
  r('POST', '/api/perks/achievements/:id/claim', ({ u, p }) => { const a = G.ACHIEVEMENTS.find(x => x.id === p.id); if (!a) throw new E(404, 'Такого достижения нет.'); if (!a.ok(stats(u))) throw new E(409, 'Условие достижения ещё не выполнено.'); if (S.ledger.some(t => t.user === u.id && t.kind === 'reward' && t.ref === 'ach:' + a.id)) throw new E(409, 'Награда уже получена.'); ledger(u.id, 'reward', a.reward, `Достижение «${a.name}»`, 'ach:' + a.id); return { ok: true, amount: a.reward, balance: u.balance }; }, true);
  r('POST', '/api/perks/level/claim', ({ u }) => { const lv = G.levelOf(xpOf(u)); let paid = 0; for (let l = 2; l <= lv.level; l++) if (!S.ledger.some(t => t.user === u.id && t.kind === 'reward' && t.ref === 'lvl:' + l)) { ledger(u.id, 'reward', G.LEVEL_REWARD, `Уровень ${l}`, 'lvl:' + l); paid += G.LEVEL_REWARD; } if (!paid) throw new E(409, 'Новых наград за уровень нет.'); return { ok: true, amount: paid, level: lv.level, balance: u.balance }; }, true);
  r('POST', '/api/upgrade', async ({ u, b }) => {
    const TI = Object.fromEntries(G.TIERS.map((t, i) => [t.id, i])); if (TI[b.target] == null) throw new E(400, 'Выберите редкость, до которой улучшить.');
    const pl = S.plates[b.plateId]; if (!pl || pl.owner !== u.id || pl.status === 'BANKED' || pl.status === 'BURNED') throw new E(404, 'Этого номера нет в вашей коллекции.');
    if (pl.status === 'LISTED') throw new E(409, 'Сначала снимите номер с рынка.');
    if (TI[b.target] <= TI[pl.tier]) throw new E(400, 'Цель должна быть редче текущего номера.');
    const chance = G.upgradeChance(pl.value, G.targetValue(pl, b.target)); const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; const success = roll < chance;
    pl.status = 'BURNED'; pl.owner = null; await event({ plate: pl.id, kind: 'UPGRADED', from: u.id });
    let np = null; const upId = newId('UP');
    if (success) {
      const pool = pl.country === 'BY' ? { RU: [], BY: [pl.region] } : { RU: [pl.region], BY: [] }; let g, k = 0; const copies = key => S.combos.filter(x => x === key).length;
      do { g = G.genPlate(b.target, pool); k++; } while (copies(G.comboKey(g)) >= 2 && k < 50);
      np = { ...g, id: newId('PC'), combo: G.comboKey(g), copy: copies(G.comboKey(g)) + 1, minter: u.id, value: G.plateValue(g), owner: u.id, status: 'OWNED', origin: `Апгрейд из ${pl.id}`, created: Date.now(), lastTx: upId, mintTx: upId };
      np.seal = await sealOf(np); S.plates[np.id] = np; S.combos.push(np.combo); await event({ plate: np.id, kind: 'MINTED', to: u.id, tx: upId });
    }
    S.upgrades = S.upgrades || []; S.upgrades.push({ id: upId, user: u.id, from: pl.id, to: np && np.id, success, chance, roll, target: b.target, at: Date.now() });
    return { id: upId, success, chance, roll, target: b.target, plate: np ? pub(np) : null, burned: pl.id };
  }, true);

  r('GET', '/api/drops', () => ({ drops: Object.values(S.plates).filter(p => ['rare', 'elite', 'grail'].includes(p.tier) && p.minter).sort((a, b) => b.created - a.created).slice(0, 12).map(p => ({ plate: pub(p), nickname: nick(p.minter), at: p.created })) }));
  r('GET', '/api/upgrade/recent', () => ({ upgrades: (S.upgrades || []).slice().reverse().slice(0, 12).map(g => { const f = S.plates[g.from]; return { id: g.id, nickname: nick(g.user), target: g.target, chance: g.chance, success: g.success, at: g.at || Date.now(), from: { tier: f.tier, letters: f.letters, digits: f.digits, region: f.region, country: f.country || 'RU' } }; }) }));

  r('GET', '/api/admin/promos', ({ u }) => { admin(u); return { promos: S.promos.slice().reverse() }; }, true);
  r('POST', '/api/admin/promos', ({ u, b }) => { admin(u); const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); const amount = Number(b.amount);
    if (!/^[A-Z0-9]{3,24}$/.test(code)) throw new E(400, 'Код: 3–24 латинских буквы или цифры.'); if (!Number.isInteger(amount) || amount < 1 || amount > 1e6) throw new E(400, 'Сумма: целое число от 1 до 1 000 000 PLT.');
    if (S.promos.some(x => x.code === code)) throw new E(409, 'Такой промокод уже есть.');
    S.promos.push({ code, amount, maxUses: b.maxUses || null, uses: 0, active: true, note: b.note || null, expires: b.days ? Date.now() + b.days * 86400000 : null }); alog(u, 'create_promo', code, amount, b.note || null); return { ok: true, code }; }, true);
  r('POST', '/api/admin/promos/:code/toggle', ({ u, p }) => { admin(u); const pc = S.promos.find(x => x.code === String(p.code).toUpperCase()); if (!pc) throw new E(404, 'Промокод не найден.'); pc.active = !pc.active; alog(u, pc.active ? 'enable_promo' : 'disable_promo', pc.code, null, null); return { ok: true, active: pc.active }; }, true);


  // Preview seed: the owner's admin account (signed in) and a few clearly marked demo collectors with listings.
  async function seed() {
    if (S.seeded) return; S.seeded = true;
    const mk = async (email, nickname, pw, role) => { const u = { id: S.users.length + 1, email, nickname, pass: await sha(email.toLowerCase() + '|' + pw), verified: true, balance: 0, created: Date.now() - 86400e3 * (5 - S.users.length), bonus: true, role }; S.users.push(u); ledger(u.id, 'signup_bonus', G.SIGNUP_BONUS, 'Бонус за регистрацию'); return u; };
    const admin = await mk('admin@plateclub.demo', 'Yulia', 'plateclub', 'admin');
    ledger(admin.id, 'admin_grant', 10000000, 'Стартовый баланс администратора', 'admin-initial');
    S.adminLog = [{ action: 'claim_admin', target: 'Yulia', amount: 10000000, reason: null, at: Date.now(), admin: 'Yulia' }];
    const demo = [['demo_anton', ['grail', 'elite', 'rare', 'fine']], ['demo_marina', ['elite', 'rare', 'rare', 'common']], ['demo_oleg', ['rare', 'fine', 'fine', 'common', 'common']]];
    for (const [n, tiers] of demo) {
      const u = await mk(n + '@demo.local', n, 'demo-' + n, 'user');
      for (const tier of tiers) {
        let g; do g = G.genPlate(tier, Math.random() < 0.35 ? { RU: [], BY: Object.keys(G.BY_REGIONS) } : { RU: Object.keys(G.REGIONS), BY: [] }); while (S.combos.includes(G.comboKey(g)));
        const pl = { ...g, id: newId('PC'), combo: G.comboKey(g), copy: 1, value: G.plateValue(g), owner: u.id, status: 'OWNED', origin: 'Демо-коллекционер', created: Date.now() - Math.random() * 3 * 86400e3, lastTx: null, mintTx: 'demo' };
        pl.seal = await sealOf(pl); S.plates[pl.id] = pl; S.combos.push(pl.combo);
        await event({ plate: pl.id, kind: 'MINTED', to: u.id, tx: 'demo' });
        if (Math.random() < 0.85) { const price = Math.max(10, Math.round(pl.value * (0.9 + Math.random() * 0.5) / 5) * 5); const l = { id: newId('L'), plate: pl.id, seller: u.id, price, status: 'ACTIVE', created: Date.now() - Math.random() * 86400e3, updated: Date.now() }; S.listings.unshift(l); pl.status = 'LISTED'; await event({ plate: pl.id, kind: 'LISTED', from: u.id, price }); }
      }
    }
    // 15 more demo collectors with different styles, so every ranking board has life in it
    const DEMO15 = [['demo_Dima77', 9000, 14, ['grail', 'grail', 'grail', 'elite', 'rare'], 12, 'grails'], ['demo_Lena_spb', 7000, 11, ['grail', 'elite', 'elite', 'rare'], 7], ['demo_Sanya', 2500, 9, ['elite', 'elite', 'rare', 'rare', 'fine'], 21], ['demo_Kostya', 4200, 8, ['grail', 'rare', 'fine'], 3], ['demo_Alina', 1200, 13, ['elite', 'rare', 'rare', 'rare', 'fine', 'fine'], 9],
      ['demo_Max_by', 3100, 6, ['elite', 'rare', 'fine', 'fine'], 15], ['demo_Gosha', 800, 10, ['rare', 'rare', 'fine', 'common'], 4], ['demo_Vika', 5600, 5, ['elite', 'rare'], 1], ['demo_Artem', 300, 7, ['rare', 'fine', 'fine', 'common', 'common'], 6], ['demo_Nastya', 1900, 4, ['elite', 'fine', 'common'], 2],
      ['demo_Ruslan', 650, 6, ['rare', 'fine', 'common'], 11], ['demo_Olya', 2200, 3, ['rare', 'rare'], 0], ['demo_Timur', 150, 5, ['fine', 'fine', 'common', 'common'], 5], ['demo_Ksenia', 980, 2, ['rare', 'common'], 1], ['demo_Bogdan', 420, 1, ['fine', 'common'], 0]];
    for (const [nick, bal, lvl, tiers, wins, set] of DEMO15) {
      const u = await mk(nick.toLowerCase() + '@demo.local', nick, 'demo-' + nick, 'user'); u.demoWins = wins; ledger(u.id, 'admin_grant', bal, 'Демо-баланс');
      const xp = 50 * (lvl - 1) * lvl + 20; ledger(u.id, 'admin_grant', xp, 'Демо'); ledger(u.id, 'case_open', -xp, 'Открыт кейс 01 Старт');
      for (const t of tiers) { const pl = await mintP({ tier: t, pool: RPOOL(), owner: u.id, origin: 'Демо-коллекционер', tx: 'demo' }); pl.created = Date.now() - Math.random() * 5 * 86400e3; await event({ plate: pl.id, kind: 'MINTED', to: u.id, tx: 'demo' }); }
      if (set) ledger(u.id, 'reward', G.SETS.find(x => x.id === set).reward, 'Коллекция', 'set:' + set);
    }
    botUser(); await stock(true); lastStock = 0;
    // demo games: open battles, an offer for the owner, the auction with a demo bid
    const anton = S.users.find(x => x.nickname === 'demo_anton'), marina = S.users.find(x => x.nickname === 'demo_marina');
    for (const [who, cid, seats, rounds] of [[anton, 'B1', 2, 2], [marina, 'B2', 3, 1], [anton, 'B3', 2, 1]]) { const c = G.battleCaseById(cid); ledger(who.id, 'admin_grant', c.price * rounds, 'Демо-пополнение'); S.battles = S.battles || []; const bt = { id: newId('B'), caseId: cid, seats, rounds, price: c.price, status: 'OPEN', creator: who.id, created: Date.now() - Math.random() * 30 * 60e3, players: [{ seat: 0, user: who.id, paid: c.price * rounds }] }; S.battles.push(bt); ledger(who.id, 'battle_entry', -c.price * rounds, `Баттл ${bt.id}`, bt.id); }
    const mp0 = await mintP({ tier: 'rare', pool: RPOOL(), owner: marina.id, origin: 'Демо-коллекционер', tx: 'demo' }); await event({ plate: mp0.id, kind: 'MINTED', to: marina.id, tx: 'demo' });
    const mp = [mp0];
    if (mp.length) S.swaps = [{ id: newId('SW'), from: marina.id, to: admin.id, give: [mp[0].id], want: [], givePlt: 0, wantPlt: Math.max(20, Math.round(mp[0].value * 0.9)), message: 'Продам вам свой номер напрямую, без рынка (демо)', status: 'PENDING', created: Date.now() - 15 * 60e3, updated: Date.now() - 15 * 60e3 }];
    await auctionTick(); { const a = S.auctions[0]; ledger(anton.id, 'admin_grant', a.start, 'Демо-пополнение'); ledger(anton.id, 'auction_bid', -a.start, 'Ставка на аукционе дня'); Object.assign(a, { topBid: a.start, topUser: anton.id, bids: 1 }); a.history.push({ user: anton.id, amount: a.start, at: Date.now() - 20 * 60e3 }); }
    const oleg = S.users.find(x => x.nickname === 'demo_oleg');
    if (oleg) S.tickets = [{ id: newId('T'), user: oleg.id, subject: 'Не пришёл номер из кейса', status: 'OPEN', userUnread: false, adminUnread: true, created: Date.now() - 40 * 60e3, updated: Date.now() - 40 * 60e3, msgs: [{ author: oleg.id, fromAdmin: false, body: 'Открыл «Попутчик», деньги списались, а номер появился только после обновления страницы. Так и должно быть? (демо-обращение)', at: Date.now() - 40 * 60e3 }] }];
    // visitors of the shared preview start as a guest player with demo PLT; the owner signs in as admin@plateclub.demo
    const guest = await mk('guest@plateclub.demo', 'Guest', 'guest-' + Math.random(), 'user'); ledger(guest.id, 'signup_bonus', 100, 'Приветственный бонус');
    S.session = guest.id; save();
  }
  const ready = seed();

  const real = window.fetch.bind(window);
  window.fetch = async (input, opts = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (!url.pathname.startsWith('/api/')) return real(input, opts);
    const method = (opts.method || 'GET').toUpperCase(); const route = R.find(x => x.m === method && x.re.test(url.pathname));
    await ready; await new Promise(res => setTimeout(res, 140 + Math.random() * 160));
    let status = 200, body;
    try {
      if (!route) throw new E(404, 'Не найдено.');
      const u = me(); if (route.auth && !u) throw new E(401, 'Войдите, чтобы продолжить.');
      const b = opts.body ? JSON.parse(opts.body) : {};
      body = await route.fn({ url, p: route.re.exec(url.pathname).groups || {}, b, u });
      save();
    } catch (e) { status = e.status || 500; body = { error: e.message, ...(e.extra || {}) }; }
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  // checkout in preview stays on the page
  window.__PREVIEW = true;
})();
