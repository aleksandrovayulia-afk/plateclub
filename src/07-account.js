
/* ---------- collection ---------- */
const C = { tier: '', sort: 'value' };
VIEWS.collection = async () => {
  const d = await GET('/api/collection'); const own = d.plates;
  const counts = {}; own.forEach(p => { counts[p.tier] = (counts[p.tier] || 0) + 1; });
  let list = own.filter(p => !C.tier || p.tier === C.tier);
  list.sort(C.sort === 'value' ? (a, b) => b.value - a.value : C.sort === 'new' ? (a, b) => b.created - a.created : (a, b) => a.region.localeCompare(b.region, undefined, { numeric: true }));
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Коллекция', 'Collection')} · ${esc(ME.nickname)}</p><h1 class="h1" style="margin-top:12px">${L('Мои номера', 'My plates')}</h1></div><div class="row"><a class="btn btn-ghost" href="#/upgrade">${L('Апгрейд', 'Upgrade')}</a><a class="btn btn-chrome" href="#/cases">${L('Открыть кейс', 'Open a case')}</a></div></section>
    <div class="split"><div class="stats"><div class="stat rv"><span>${L('Номеров', 'Plates')}</span><b>${own.length}</b></div><div class="stat rv"><span>${L('Оценка коллекции', 'Collection value')}</span><b>${fmt(own.reduce((a, p) => a + p.value, 0))}</b></div><div class="stat rv"><span>${L('Регионов', 'Regions')}</span><b>${new Set(own.map(p => p.country + p.region)).size}</b></div>${(() => { const k = own.filter(p => p.paid != null); const d = k.reduce((a, p) => a + p.value - p.paid, 0); return `<div class="stat rv"><span>${L('Прибыль по оценке', 'Profit at value')}</span><b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}</b></div>`; })()}</div>
      <div class="panel">${TierBars(counts)}</div></div>
    <section style="padding-block:24px 80px">
      <div class="row" style="justify-content:space-between;margin-bottom:16px"><div class="row"><button class="chip" data-act="ctier" data-t="" aria-pressed="${!C.tier}">${L('Все', 'All')}</button>${CFG.tiers.map(t => `<button class="chip t-${t.id}" data-act="ctier" data-t="${t.id}" aria-pressed="${C.tier === t.id}"><i></i>${tierName(t.id)}</button>`).join('')}</div>
        <label class="sr-only" for="csort">${L('Сортировка', 'Sort')}</label><select class="inline" id="csort">${[['value', L('Дороже', 'Most valuable')], ['new', L('Новые', 'Newest')], ['region', L('По региону', 'By region')]].map(([v, t]) => `<option value="${v}"${C.sort === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      ${list.length ? `<div class="pgrid">${list.map(p => PlateCard(p, { pl: true, flag: p.listing ? L('На рынке · ', 'Listed · ') + fmt(p.listing.price) : '', flagCls: 's-ACTIVE', actions: p.listing ? `<button class="btn btn-sm btn-ghost" data-act="cancel" data-id="${p.listing.id}">${L('Снять с рынка', 'Delist')}</button>` : `<span class="row"><a class="btn btn-sm btn-ghost" href="#/upgrade?p=${p.id}" title="${L('Апгрейд', 'Upgrade')}">${IC.up.replace('<svg', '<svg width="16" height="16"')}</a><button class="btn btn-sm btn-ghost" data-act="bank" data-id="${p.id}" data-v="${p.value}" data-s="${esc(plateStr(p))}">${L('Банку', 'Bank')} ${fmt(p.value * CFG.bankRate)}</button><button class="btn btn-sm btn-chrome" data-act="listdlg" data-id="${p.id}">${L('Продать', 'Sell')}</button></span>` })).join('')}</div>`
        : Empty(own.length ? L('В этой редкости пусто', 'Nothing in this rarity') : L('Коллекция пуста', 'Your collection is empty'), own.length ? L('Выберите другую редкость.', 'Pick another rarity.') : L('Откройте кейс или купите номер на рынке.', 'Open a case or buy a plate on the market.'), `<a class="btn btn-chrome" href="#/cases">${L('К кейсам', 'To cases')}</a>`, { letters: 'ААА', digits: '000', region: '00' })}
    </section></div>`;
};
VIEWS.collection.auth = true;

/* ---------- wallet ---------- */
const money = (m, c) => new Intl.NumberFormat(LOC(), { style: 'currency', currency: c }).format(m / 100);
VIEWS.wallet = async ({ query }) => {
  const all = query && query.get('all'); const w = await GET('/api/wallet' + (all ? '?all=1' : ''));
  const methods = CFG.payments.methods; const cur = store.get('cur', CFG.payments.currencies[0]);
  const payId = query && query.get('payment'); const pay = payId && w.payments.find(p => p.id === payId); if (pay) await refreshMe();
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Кошелёк · игровые токены PLT', 'Wallet · PLT game tokens')}</p><p class="bigbal chrome-t">${fmt(w.balance)}<small>PLT</small></p><p class="small" style="margin-top:10px">${L('PLT работают только внутри Plate Club: их нельзя вывести или обменять на деньги.', 'PLT only work inside Plate Club: they cannot be withdrawn or exchanged for money.')}</p></div></section>
    ${pay ? `<div class="notice" style="margin-bottom:22px"><b>${L('Платёж', 'Payment')} ${pay.id}: ${pay.status}</b>${pay.status === 'PAID' ? L(`${fmt(pay.plt)} PLT зачислены.`, `${fmt(pay.plt)} PLT credited.`) : L('Баланс изменится после подтверждения платёжного сервиса.', 'Your balance changes once the payment provider confirms.')}</div>` : ''}
    <section class="split" style="padding-bottom:80px">
      <form class="panel" id="topupForm" style="display:grid;gap:16px;align-content:start"><div class="row" style="justify-content:space-between"><h2 class="h3">${L('Пополнить', 'Top up')}</h2><label class="sr-only" for="tcur">${L('Валюта', 'Currency')}</label><select class="inline" id="tcur" name="cur">${CFG.payments.currencies.map(c => `<option${c === cur ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
        <fieldset style="border:0;padding:0;margin:0"><legend class="sr-only">${L('Пакет', 'Package')}</legend><div class="pkgs">${CFG.payments.packages.map((p, i) => `<label class="pkg"><input type="radio" name="pkg" value="${p.id}" ${i === 2 ? 'checked' : ''}>${p.tag ? `<span class="tag deal">${p.tag}</span>` : ''}<b>${fmt(p.plt)}</b><span class="small">PLT</span><span class="mono small" data-price="${esc(JSON.stringify(p.price))}">${money(p.price[cur], cur)}</span></label>`).join('')}</div></fieldset>
        <div class="fld"><span class="small" style="font-weight:700">${L('Способ оплаты', 'Payment method')}</span>${methods.length ? methods.map((m, i) => `<label class="opt"><input type="radio" name="method" value="${m.id}" ${i === 0 ? 'checked' : ''}><b style="font-size:14px">${esc(m.name)}</b><span class="small">${esc(m.provider)}</span></label>`).join('') : `<div class="notice"><b>${L('Оплата пока не подключена', 'Payments are not connected yet')}</b>${L('Карты появятся здесь, когда владелец сайта подключит платёжный сервис.', 'Cards appear here once the site owner connects a payment provider.')}</div>`}</div>
        <dl class="kv" id="tsum"></dl>
        <button class="btn btn-chrome btn-lg" type="submit" ${methods.length ? '' : 'disabled'}>${L('Перейти к оплате', 'Continue to payment')}</button></form>
      <div style="display:grid;gap:20px;align-content:start">
        <div class="panel" style="display:grid;gap:12px"><h2 class="h3">${L('Промокод', 'Promo code')}</h2>${promoForm()}<a class="btn-text" href="#/bonus">${L('Все бонусы', 'All bonuses')} →</a></div>
        <div class="panel">${SH(all ? L('Все операции', 'All transactions') : L('Последние операции', 'Recent transactions'), '', all ? '' : `<a class="sh-link" href="#/wallet?all=1">${L('Показать все', 'Show all')}</a>`)}${w.ledger.map(TxRow).join('') || `<p class="small">${L('Операций пока нет.', 'No transactions yet.')}</p>`}</div>
      </div>
    </section></div>`;
};
VIEWS.wallet.auth = true;
VIEWS.transactions = async () => VIEWS.wallet({ query: new URLSearchParams('all=1') }); VIEWS.transactions.auth = true;
function walletHooks() {
  const f = $('#topupForm'); if (!f) return;
  const upd = () => { const cur = f.cur.value; store.set('cur', cur); f.querySelectorAll('[data-price]').forEach(el => { el.textContent = money(JSON.parse(el.dataset.price)[cur], cur); }); const pk = CFG.payments.packages.find(p => p.id === f.pkg.value); $('#tsum').innerHTML = `<dt>${L('Вы получите', 'You get')}</dt><dd>${fmt(pk.plt)} PLT</dd><dt class="tot">${L('К оплате', 'To pay')}</dt><dd class="tot">${money(pk.price[cur], cur)}</dd>`; };
  f.addEventListener('change', upd); upd();
  f.addEventListener('submit', async e => { e.preventDefault(); const b = f.querySelector('[type=submit]'); busy(b, true, L('Открываем оплату…', 'Opening checkout…')); try { const r = await POST('/api/payments/checkout', { packageId: f.pkg.value, currency: f.cur.value }); location.href = r.url; } catch (x) { toast(x.message, true); busy(b, false); } });
}
const promoForm = () => `<form class="promo-row" id="promoForm"><label class="sr-only" for="promo">${L('Промокод', 'Promo code')}</label><input class="field" id="promo" name="promo" placeholder="PLATECLUB" autocomplete="off" maxlength="24" required><button class="btn btn-chrome" type="submit">${L('Активировать', 'Redeem')}</button></form><p class="err" id="promoErr" hidden></p>`;

/* ---------- bonuses ---------- */
function AchGrid(list, limit) {
  const Ls = limit ? [...list].sort((a, b) => (b.done && !b.claimed) - (a.done && !a.claimed) || b.done - a.done).slice(0, limit) : list;
  return `<div class="ach">${Ls.map(a => `<div class="ach-i ${a.done ? 'on' : 'off'}${a.claimed ? ' claimed' : ''} rv"><span class="b">${a.claimed ? '✓' : String(list.indexOf(a) + 1).padStart(2, '0')}</span><div><h3>${esc(achName(a))}</h3><p>${esc(achText(a))}</p></div><div class="rw">+${fmt(a.reward)} PLT${a.done && !a.claimed ? `<button class="btn btn-sm btn-chrome" data-act="achclaim" data-id="${a.id}">${L('Забрать', 'Claim')}</button>` : a.claimed ? `<span class="small">${L('получено', 'claimed')}</span>` : ''}</div></div>`).join('')}</div>`;
}
VIEWS.bonus = async () => {
  const pk = await refreshPerks(); const d = pk.daily, lv = pk.level, ach = pk.achievements;
  const k = lv.next > lv.cur ? (lv.xp - lv.cur) / (lv.next - lv.cur) : 1;
  return `<div class="wrap page-in"><section class="page-head"><div><p class="eyebrow">${L('Бонусы', 'Bonuses')}</p><h1 class="h1" style="margin-top:12px">${L('Плюшки', 'Perks')}</h1><p class="lede" style="margin-top:12px">${L('Каждая награда — 10 PLT. Всё начисляет сервер, видно в истории кошелька.', 'Every reward is 10 PLT. The server credits everything, you’ll see it in your wallet history.')}</p></div></section>
  <div class="bonus-grid">
    <section class="panel bonus-card" style="--bc:rgba(198,255,61,.22)"><p class="eyebrow">${L('Бонус дня', 'Daily bonus')}</p><div class="bonus-big">+${fmt(d.amount)} <span class="small">PLT</span></div>
      <p class="small" style="margin:0">${IC.fire.replace('<svg', '<svg width="14" height="14" style="vertical-align:-2px;color:#ff9f43"')} ${L('Серия', 'Streak')}: ${d.streak} ${pl(d.streak, ['день', 'дня', 'дней'], ['day', 'days'])}</p>
      ${d.claimed ? `<p class="small" style="margin:0">${L('Следующий через', 'Next in')} <span class="mono" id="dailyCd" data-t="${d.nextAt}"></span></p>` : `<button class="btn btn-chrome btn-lg" data-act="daily">${L('Забрать 10 PLT', 'Claim 10 PLT')}</button>`}</section>
    <section class="panel bonus-card"><p class="eyebrow">${L('Уровень', 'Level')}</p><div class="row" style="gap:14px"><span class="lvl" style="width:64px;height:64px">${LvlRing(lv, 64)}</span><div><div class="bonus-big" style="font-size:30px">LV ${lv.level}</div><p class="small" style="margin:2px 0 0">${fmt(lv.xp)} / ${fmt(lv.next)} XP</p></div></div>
      <div class="lvl-bar"><span style="width:${Math.round(k * 100)}%"></span></div><p class="small" style="margin:0">${L('XP = PLT, потраченные на кейсы. За каждый новый уровень — 10 PLT.', 'XP = PLT spent on cases. Each new level pays 10 PLT.')}</p>
      ${lv.unclaimed ? `<button class="btn btn-chrome" data-act="lvlclaim">${L(`Забрать ${lv.unclaimed * lv.reward} PLT за уровни`, `Claim ${lv.unclaimed * lv.reward} PLT for levels`)}</button>` : ''}</section>
    <section class="panel bonus-card" style="--bc:rgba(168,124,255,.22)"><p class="eyebrow">${L('Промокод', 'Promo code')}</p><h2 class="h3">${L('Есть промокод?', 'Got a code?')}</h2><p class="small" style="margin:0">${L('Каждый код — один раз на аккаунт.', 'Each code works once per account.')}</p>${promoForm()}</section>
  </div>
  <section class="sec" style="padding-bottom:80px">${SH(L('Достижения', 'Achievements'), `${ach.filter(a => a.done).length} / ${ach.length}`)}${AchGrid(ach)}</section></div>`;
};
VIEWS.bonus.auth = true;
VIEWS.achievements = VIEWS.bonus;

/* ---------- top ---------- */
const RK = { by: 'total' };
const RK_TABS = () => [['total', L('Богатство', 'Wealth'), L('баланс + номера', 'balance + plates')], ['collection', L('Коллекция', 'Collection'), L('оценка номеров', 'plates value')], ['level', L('Уровень', 'Level'), L('опыт за кейсы', 'case XP')], ['battles', L('Баттлы', 'Battles'), L('побед в кейс-баттлах', 'case-battle wins')], ['sets', L('Коллекции', 'Sets'), L('собранных сетов', 'sets completed')], ['best', L('Лучший номер', 'Best plate'), L('самый дорогой номер', 'priciest plate')]];
const rkVal = (x, by) => ({ total: [fmt(x.total), 'PLT'], collection: [fmt(x.value), 'PLT'], level: ['LV ' + x.level, fmt(x.xp) + ' XP'], battles: [fmt(x.wins), pl(x.wins, ['победа', 'победы', 'побед'], ['win', 'wins'])], sets: [x.sets + ' / ' + CFG.sets.length, L('сетов', 'sets')], best: [fmt(x.bestValue), 'PLT'] }[by]);
VIEWS.top = async () => {
  const d = await GET('/api/rankings?by=' + RK.by); const r = d.rankings; const by = d.by;
  const pod = (x, i) => { if (!x) return '<div></div>'; const [v, u] = rkVal(x, by); return `<a class="pod p${i + 1} rv" href="#/u/${esc(x.nickname)}"><span class="pod-rank">${i + 1}</span>${Ava(x.nickname).replace('class="ava"', 'class="ava pod-ava"')}<span class="nick">${esc(x.nickname)}</span>${Medals(x.medals)}<span class="val chrome-t">${v}</span><span class="small">${u}</span>${by === 'best' || by === 'total' ? (x.best ? Plate(x.best, { iri: false }) : '') : `<span class="small">LV ${x.level} · ${x.plates} ${pl(x.plates, ['номер', 'номера', 'номеров'], ['plate', 'plates'])}</span>`}</a>`; };
  const me = ME ? r.findIndex(x => x.nickname === ME.nickname) : -1;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Рейтинг', 'Ranking')} · ${d.players} ${pl(d.players, ['игрок', 'игрока', 'игроков'], ['player', 'players'])}</p><h1 class="h1" style="margin-top:12px">${L('Топ игроков', 'Top players')}</h1><p class="lede" style="margin-top:12px">${L('Шесть рейтингов. Десятка самых богатых получает медаль TOP 10, тройка лидеров — ещё и TOP 3.', 'Six boards. The ten richest get a TOP 10 medal, the top three also get TOP 3.')}</p><div class="row" style="margin-top:14px;gap:8px">${MEDAL('top10')}${MEDAL('top3')}</div></div></section>
    <div class="rk-tabs" role="tablist">${RK_TABS().map(([k, t, sub]) => `<button role="tab" aria-selected="${by === k}" data-act="rkby" data-k="${k}"><b>${t}</b><span>${sub}</span></button>`).join('')}</div>
    ${me >= 0 && me !== undefined ? `<div class="rk-me rv"><span>${L('Вы на', 'You are')} <b>${me + 1}</b> ${L('месте', 'place')}</span>${Medals(r[me].medals)}<span class="mono">${rkVal(r[me], by).join(' ')}</span></div>` : ''}
    ${r.length ? `<div class="podium">${pod(r[1], 1)}${pod(r[0], 0)}${pod(r[2], 2)}</div>
    <div class="panel rk-list" style="padding:8px;margin-bottom:80px">${r.slice(3).map((x, i) => { const [v, u] = rkVal(x, by); return `<a class="rk${ME && x.nickname === ME.nickname ? ' me' : ''}${i < 7 ? ' t10' : ''}" href="#/u/${esc(x.nickname)}" style="text-decoration:none"><span class="n">${i + 4}</span><span class="who">${Ava(x.nickname)}<span><b>${esc(x.nickname)}</b> ${Medals(x.medals)}<br><span class="small">LV ${x.level} · ${x.plates} ${pl(x.plates, ['номер', 'номера', 'номеров'], ['plate', 'plates'])}</span></span></span><span class="tot">${v} <small>${u}</small></span></a>`; }).join('') || `<p class="small" style="padding:12px">${L('Пока только тройка лидеров.', 'Only the top three so far.')}</p>`}</div>`
    : Empty(L('Пока пусто', 'Empty for now'), L('В этом рейтинге ещё никого нет.', 'Nobody in this board yet.'), `<a class="btn btn-chrome" href="#/games">${L('К играм', 'To games')}</a>`)}</div>`;
};
VIEWS.rankings = VIEWS.top;

/* ---------- profile & co ---------- */
VIEWS.profile = async () => {
  const s = ME.stats; const pk = await refreshPerks(); const ACH = pk ? pk.achievements : [];
  return `<div class="wrap"><section class="page-head"><div class="row" style="gap:18px">${Ava(ME.nickname).replace('class="ava"', 'class="ava" style="width:72px;height:72px;font-size:32px;border-radius:22px"')}<div><p class="eyebrow">${L('Профиль · с ', 'Profile · since ')}${day(ME.created)}</p><h1 class="h1" style="margin-top:8px">${esc(ME.nickname)}</h1><p class="small" style="margin-top:6px">${Medals(ME.medals)} <span class="lvl-tag">LV ${ME.level.level}</span> ${ME.role === 'admin' ? `<span class="tag admin">${L('Админ', 'Admin')}</span>` : ''} <a class="btn-text" href="#/u/${esc(ME.nickname)}">${L('Публичный профиль', 'Public profile')} →</a></p></div></div>${ME.role === 'admin' ? `<a class="btn btn-chrome" href="#/admin">${L('Панель управления', 'Admin panel')}</a>` : `<a class="btn btn-ghost" href="#/admin">👑 ${L('Войти как админ', 'Sign in as admin')}</a>`}</section>
    <div class="stats s4"><div class="stat rv"><span>${L('Открыто кейсов', 'Cases opened')}</span><b>${s.opened}</b></div><div class="stat rv"><span>${L('Покупок', 'Purchases')}</span><b>${s.bought}</b></div><div class="stat rv"><span>${L('Оценка коллекции', 'Collection value')}</span><b>${fmt(s.value)}</b></div><div class="stat rv"><span>${L('Достижения', 'Achievements')}</span><b>${ACH.filter(a => a.done).length}/${ACH.length}</b></div></div>
    <section class="sec split"><div class="panel">${SH(L('Аккаунт', 'Account'), L('Email виден только вам.', 'Only you can see your email.'))}
        <div class="set-row"><div><b>Email</b><p>${esc(ME.email)}</p></div>${ME.verified ? `<span class="tag s-PAID">${L('Подтверждён', 'Verified')}</span>` : `<button class="btn btn-sm btn-ghost" data-act="resend">${L('Подтвердить', 'Verify')}</button>`}</div>
        <div class="set-row"><div><b>${L('Пароль', 'Password')}</b><p>${L('Нужен текущий пароль. Другие устройства выйдут из аккаунта.', 'Needs your current password. Other devices get signed out.')}</p></div><button class="btn btn-sm btn-ghost" data-act="pwdlg">${L('Сменить', 'Change')}</button></div>
        <div class="set-row"><div><b>${L('Другие устройства', 'Other devices')}</b><p>${L('Если вы входили с чужого телефона или компьютера — завершите там сессию.', 'Signed in on someone else’s phone or computer? End those sessions.')}</p></div><button class="btn btn-sm btn-ghost" data-act="logoutothers">${L('Выйти везде', 'Sign out everywhere')}</button></div>
        <div class="set-row"><div><b>${L('Язык', 'Language')}</b><p>Русский / English</p></div><div class="lang"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div></div>
        <div class="set-row" style="border:0"><div><b>${L('Выйти', 'Sign out')}</b><p>${L('Завершить сессию на этом устройстве.', 'End the session on this device.')}</p></div><button class="btn btn-sm btn-ghost" data-act="logout">${L('Выйти', 'Sign out')}</button></div></div>
      <div class="panel">${SH(L('Достижения', 'Achievements'), '', `<a class="sh-link" href="#/bonus">${L('Все', 'All')} →</a>`)}${AchGrid(ACH, 4)}</div></section></div>`;
};
VIEWS.profile.auth = true;
VIEWS.notifications = async () => {
  const w = await GET('/api/wallet');
  return `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Активность', 'Activity')}</h1></div></section><div class="panel" style="margin-bottom:80px">${w.ledger.map(TxRow).join('') || `<p class="small" style="margin:0">${L('Пока пусто.', 'Nothing yet.')}</p>`}</div></div>`;
};
VIEWS.notifications.auth = true;
VIEWS.settings = async () => `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Настройки', 'Settings')}</h1><p class="lede" style="margin-top:10px">${L('Сохраняются на этом устройстве.', 'Saved on this device.')}</p></div></section>
  <div class="panel" style="max-width:760px;margin-bottom:80px">
   <div class="set-row"><div><b>${L('Язык', 'Language')}</b><p>Русский / English</p></div><div class="lang"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div></div>
   <div class="set-row"><div><b>${L('Громкость', 'Volume')}</b><p id="volTxt">${Math.round(PREF.vol * 100)}%</p></div><input type="range" id="svol" min="0" max="1" step="0.05" value="${PREF.vol}" aria-label="${L('Громкость', 'Volume')}"></div>
   <div class="set-row" style="border:0"><div><b>${L('Анимации', 'Animations')}</b><p>${L('«Как в системе» следует настройке устройства.', '“System” follows your device setting.')}</p></div><select class="inline" id="smotion">${[['system', L('Как в системе', 'System')], ['reduced', L('Минимум', 'Reduced')], ['full', L('Все', 'All')]].map(([v, t]) => `<option value="${v}"${PREF.motion === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div></div></div>`;
VIEWS.help = async () => `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Помощь', 'Help')}</h1></div></section><div class="prose">${(LANG === 'en' ? [
  ['How is the result decided?', 'The server picks the rarity using the published odds and mints the plate before the strip starts. The animation only shows the result.'],
  ['What does the blue check mean?', 'The plate exists in the Plate Club registry and its seal and owner history match. It is not a check of a real registration plate.'],
  ['How does the upgrade work?', 'You put in one plate and choose a rarer target. Chance = 90% × (your plate value / target value), from 1% to 75%. On a win you get a new plate of the target rarity in the same region; on a loss the plate burns.'],
  ['What are levels?', 'XP equals PLT spent on cases. Level n needs 50·(n−1)·n XP. Every new level gives 10 PLT.'],
  ['Why are Belarusian plates cheaper?', 'Their value is 60% of a Russian plate of the same rarity, but nice combinations come up more often.'],
  ['How many copies can a plate have?', 'Each combination exists at most twice: 1/2 and 2/2.'],
  ['Who pays the market fee?', `The seller: ${CFG.fee * 100}% of the price.`],
] : [
  ['Как определяется выигрыш?', 'Сервер выбирает редкость по опубликованным шансам и создаёт номер до запуска ленты. Анимация только показывает результат.'],
  ['Что значит синяя галочка?', 'Номер есть в реестре Plate Club, его печать и история владельцев сходятся. Это не проверка настоящего госномера.'],
  ['Как работает апгрейд?', 'Ставите один номер и выбираете более редкую цель. Шанс = 90% × (оценка вашего номера / оценка цели), от 1% до 75%. При победе — новый номер выбранной редкости в том же регионе, при проигрыше номер сгорает.'],
  ['Что такое уровни?', 'XP — это PLT, потраченные на кейсы. Для уровня n нужно 50·(n−1)·n XP. За каждый новый уровень — 10 PLT.'],
  ['Почему белорусские номера дешевле?', 'Их оценка — 60% от российского номера той же редкости, зато красивые комбинации выпадают чаще.'],
  ['Сколько копий бывает у номера?', 'Каждая комбинация существует максимум в двух экземплярах: 1/2 и 2/2.'],
  ['Кто платит комиссию рынка?', `Продавец: ${CFG.fee * 100}% от цены.`],
]).map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div>`;
VIEWS.terms = async () => `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Правила', 'Terms')}</h1></div></section><div class="prose">${LANG === 'en'
  ? `<h3>1. Tokens</h3><p>PLT are game tokens for use inside Plate Club only. They cannot be withdrawn or exchanged for money.</p><h3>2. Plates</h3><p>Plates are digital game items, not real registration plates.</p><h3>3. Cases, odds and upgrades</h3><p>Odds are shown before opening. The server decides results before animations. On average the bank buy-back is below the case price; Plate Club does not promise profit.</p><h3>4. Market</h3><p>The seller pays a ${CFG.fee * 100}% fee. A plate can only be in one active listing.</p><h3>5. Verification</h3><p>The blue check only refers to the game record inside Plate Club.</p>`
  : `<h3>1. Токены</h3><p>PLT — игровые токены только для Plate Club. Их нельзя вывести или обменять на деньги.</p><h3>2. Номера</h3><p>Номера — цифровые игровые предметы, а не настоящие регистрационные знаки.</p><h3>3. Кейсы, шансы и апгрейд</h3><p>Шансы показаны до открытия. Сервер выбирает результат до анимации. В среднем выкуп банком ниже цены кейса; Plate Club не обещает прибыли.</p><h3>4. Рынок</h3><p>Продавец платит комиссию ${CFG.fee * 100}%. Номер может быть только в одном активном объявлении.</p><h3>5. Проверка</h3><p>Синяя галочка относится только к игровой записи внутри Plate Club.</p>`}</div></div>`;
VIEWS.privacy = async () => `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Конфиденциальность', 'Privacy')}</h1></div></section><div class="prose">${LANG === 'en'
  ? '<h3>What we store</h3><p>Email, nickname, a password hash, your plates, listings, transactions and payment records from the provider (no card numbers).</p><h3>What others see</h3><p>Your nickname, plates and listings. Never your email.</p><h3>Cookies</h3><p>One session cookie. Language and volume stay in your browser.</p>'
  : '<h3>Что мы храним</h3><p>Email, ник, хеш пароля, ваши номера, объявления, операции и записи о платежах от платёжного сервиса (без номеров карт).</p><h3>Что видно другим</h3><p>Ник, номера и объявления. Email — никогда.</p><h3>Cookies</h3><p>Одна служебная cookie для входа. Язык и громкость хранятся в браузере.</p>'}</div></div>`;

/* ---------- auth ---------- */
function authCard(title, sub, form) { return `<div class="wrap auth"><form class="auth-card" id="authForm" novalidate><img class="lg" src="${BRAND('logo-chrome-360.png')}" alt="Plate Club"><div style="text-align:center"><h1 class="h2">${title}</h1><p class="small" style="margin:8px 0 0">${sub}</p></div>${form}</form></div>`; }
const fld = (id, label, type, extra = '', hint = '') => `<div class="fld"><label for="${id}">${label}</label>${type === 'password' ? `<div class="pw-wrap"><input class="field" id="${id}" name="${id}" type="password" ${extra}><button type="button" data-act="pwshow">${L('Показать', 'Show')}</button></div>` : `<input class="field" id="${id}" name="${id}" type="${type}" ${extra}>`}${hint ? `<p class="hint">${hint}</p>` : ''}<p class="ferr" id="${id}-e" hidden></p></div>`;
VIEWS.login = async ({ query, next } = {}) => authCard(/^#\/admin/.test(location.hash) ? L('Вход для админа', 'Admin sign in') : L('С возвращением', 'Welcome back'), /^#\/admin/.test(location.hash) ? L('Шаг 1: войдите в свой аккаунт (или зарегистрируйтесь). Шаг 2: откроется окно для кода админа.', 'Step 1: sign in (or sign up). Step 2: enter the admin code.') : L('Войдите, чтобы открывать кейсы и торговать.', 'Sign in to open cases and trade.'), `${fld('email', 'Email', 'email', 'autocomplete="email" required')}${fld('password', L('Пароль', 'Password'), 'password', 'autocomplete="current-password" required')}
  <p class="err" id="formErr" hidden></p><input type="hidden" name="next" value="${esc(next || (query && query.get('next')) || '#/')}"><button class="btn btn-chrome btn-lg" type="submit" data-form="login">${L('Войти', 'Sign in')}</button>
  <div class="row" style="justify-content:space-between"><a class="btn-text" href="#/forgot">${L('Забыли пароль?', 'Forgot password?')}</a><a class="btn-text" href="#/register${/^#\/admin/.test(location.hash) ? '?next=admin' : ''}">${L('Регистрация', 'Sign up')}</a></div>${/^#\/admin/.test(location.hash) ? '' : `<a class="btn btn-ghost" style="text-align:center" href="#/admin">👑 ${L('Войти как админ', 'Sign in as admin')}</a>`}`);
VIEWS.register = async () => authCard(L('Вступить в клуб', 'Join the club'), L(`Новым аккаунтам — ${CFG.signupBonus} PLT. Плюс 10 PLT каждый день.`, `New accounts get ${CFG.signupBonus} PLT. Plus 10 PLT every day.`), `${fld('email', 'Email', 'email', 'autocomplete="email" required', L('Для входа и восстановления пароля. Другим не виден.', 'For sign-in and password recovery. Never shown to others.'))}
  ${fld('nickname', L('Ник', 'Nickname'), 'text', 'autocomplete="username" required minlength="3" maxlength="20" spellcheck="false"', L('3–20 латинских букв, цифр или «_».', '3–20 Latin letters, digits or “_”.'))}
  ${fld('password', L('Пароль', 'Password'), 'password', 'autocomplete="new-password" required minlength="8"', L('Минимум 8 символов.', 'At least 8 characters.'))}
  <div class="fld"><label class="check"><input type="checkbox" id="terms" name="terms"><span>${L('Принимаю <a href="#/terms" target="_blank">правила</a> и <a href="#/privacy" target="_blank">политику конфиденциальности</a>.', 'I accept the <a href="#/terms" target="_blank">terms</a> and the <a href="#/privacy" target="_blank">privacy policy</a>.')}</span></label><p class="ferr" id="terms-e" hidden></p></div>
  <p class="err" id="formErr" hidden></p><button class="btn btn-chrome btn-lg" type="submit" data-form="register">${L('Создать аккаунт', 'Create account')}</button><a class="btn-text" style="text-align:center" href="#/login">${L('Уже есть аккаунт', 'I already have an account')}</a>`);
VIEWS.forgot = async () => authCard(L('Восстановление', 'Password reset'), L('Пришлём ссылку для сброса пароля.', 'We’ll email you a reset link.'), `${fld('email', 'Email', 'email', 'autocomplete="email" required')}<p class="err" id="formErr" hidden></p><div id="formOk"></div><button class="btn btn-chrome btn-lg" type="submit" data-form="forgot">${L('Отправить ссылку', 'Send link')}</button><a class="btn-text" style="text-align:center" href="#/login">${L('Назад ко входу', 'Back to sign in')}</a>`);
VIEWS.reset = async ({ query }) => authCard(L('Новый пароль', 'New password'), L('Придумайте новый пароль.', 'Choose a new password.'), `${fld('password', L('Новый пароль', 'New password'), 'password', 'autocomplete="new-password" required minlength="8"')}<input type="hidden" name="token" value="${esc(query.get('token') || '')}"><p class="err" id="formErr" hidden></p><button class="btn btn-chrome btn-lg" type="submit" data-form="reset">${L('Сохранить', 'Save')}</button>`);
function regHooks() {
  const n = $('#nickname'); let t;
  n && n.addEventListener('input', () => { clearTimeout(t); const v = n.value.trim(); const e = $('#nickname-e'); if (!v) { e.hidden = true; return; } t = setTimeout(async () => { try { const r = await GET('/api/nickname?n=' + encodeURIComponent(v)); e.hidden = false; e.className = r.available ? 'fok' : 'ferr'; e.textContent = r.available ? L('Ник свободен.', 'Nickname is free.') : srv(r.reason); n.setAttribute('aria-invalid', String(!r.available)); } catch {} }, 350); });
}
