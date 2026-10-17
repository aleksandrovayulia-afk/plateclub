
/* ---------- market ---------- */
const M = { q: '', tiers: [], group: '', min: '', max: '', sort: 'deal', who: '' };
VIEWS.market = async () => {
  const [st, sales, dl, on] = await Promise.all([GET('/api/market/stats').catch(() => null), GET('/api/market/sales').catch(() => ({ sales: [] })), GET('/api/dealer').catch(() => null), GET('/api/online').catch(() => ({ count: 0 }))]);
  const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button data-act="mseg" data-k="${k}" data-v="${v}" aria-pressed="${M[k] === v}">${t}</button>`).join('')}</div>`;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow"><span class="live"></span>${L('Рынок онлайн', 'Live market')}${on.count ? ` · ${on.count} ${pl(on.count, ['игрок', 'игрока', 'игроков'], ['player', 'players'])} ${L('в сети', 'online')}` : ''} · ${L('комиссия продавца', 'seller fee')} ${CFG.fee * 100}%</p><h1 class="h1" style="margin-top:12px">${L('Рынок', 'Market')}</h1><p class="lede" style="margin-top:10px">${L('Покупайте ниже оценки — продавайте дороже. Зелёная метка — лот дешевле оценки.', 'Buy below value, sell higher. A green tag means the lot is below its value.')}</p></div>
    <div class="row">${ME ? `<button class="btn btn-chrome" data-act="listdlg">${L('Выставить номер', 'List a plate')}</button><a class="btn btn-ghost" href="#/trades">${L('Мои сделки', 'My trades')}</a>` : `<a class="btn btn-chrome" href="#/login?next=%23%2Fmarket">${L('Войти, чтобы торговать', 'Sign in to trade')}</a>`}</div></section>
  ${st ? `<div class="mk-stats"><div class="stat rv"><span>${L('В продаже', 'Listed')}</span><b>${fmt(st.active)}</b></div><div class="stat rv"><span>${L('Ниже оценки', 'Below value')}</span><b class="up">${fmt(st.deals)}</b></div><div class="stat rv"><span>${L('Сделок за сутки', 'Trades, 24h')}</span><b>${fmt(st.sales)}</b></div><div class="stat rv"><span>${L('Оборот за сутки', 'Volume, 24h')}</span><b>${fmt(st.volume)}</b></div></div>` : ''}
  ${dl ? dealerPanel(dl) : ''}
  <section class="tools" aria-label="${L('Поиск и фильтры', 'Search and filters')}">
    <div class="tools-row"><label class="search">${IC.search}<span class="sr-only">${L('Поиск номера', 'Search plates')}</span><input id="mq" type="search" placeholder="А777АА, 777, 7777 AB…" value="${esc(M.q)}" autocomplete="off"></label>
      ${seg('sort', [['deal', L('Выгодные', 'Best deals')], ['new', L('Новые', 'New')], ['pa', L('Дешевле', 'Cheapest')], ['pd', L('Дороже', 'Priciest')], ['rar', L('Редкие', 'Rarest')]])}</div>
    <div class="tools-row">${seg('who', [['', L('Все продавцы', 'All sellers')], ['players', L('Игроки', 'Players')], ['market', L('Рынок', 'Market')]])}${seg('group', [['', L('Все', 'All')], ['ru', L('Россия', 'Russia')], ['by', L('Беларусь', 'Belarus')]])}
      ${CFG.tiers.map(t => `<button class="chip t-${t.id}" data-act="mtier" data-t="${t.id}" aria-pressed="${M.tiers.includes(t.id)}"><i></i>${tierName(t.id)}</button>`).join('')}
      <div class="range"><label class="sr-only" for="mmin">${L('Цена от', 'Min price')}</label><input class="field mono" id="mmin" type="number" inputmode="numeric" min="0" placeholder="${L('от', 'min')}" value="${esc(M.min)}"><label class="sr-only" for="mmax">${L('Цена до', 'Max price')}</label><input class="field mono" id="mmax" type="number" inputmode="numeric" min="0" placeholder="${L('до', 'max')}" value="${esc(M.max)}"></div>
      <button class="btn-text" data-act="mreset">${L('Сбросить', 'Reset')}</button></div>
  </section><div id="mres">${skel()}</div>
  ${sales.sales.length ? `<section class="sec" style="padding-bottom:80px">${SH(L('Последние сделки', 'Latest trades'))}<div class="drops">${sales.sales.map(s => `<a class="drop t-${s.plate.tier}" href="#/plate/${s.plate.id}">${Plate(s.plate, { iri: false })}<span class="price">${fmt(s.price)}<small>PLT</small></span><small>${esc(s.seller)} → ${esc(s.buyer)} · ${rel(s.at)}</small></a>`).join('')}</div></section>` : '<div style="height:80px"></div>'}</div>`;
};
function dealerPanel(d) {
  const left = Math.max(0, d.perDay - d.used);
  return `<section class="dealer rv" aria-label="${L('Скупщик', 'Dealer')}"><div class="dealer-h"><div><p class="eyebrow">${L('Скупщик · спрос дня', 'Dealer · today’s demand')}</p><h2 class="h3" style="margin-top:6px">${L(`Платит ${Math.round(d.rate * 100)}% оценки`, `Pays ${Math.round(d.rate * 100)}% of value`)}</h2>
    <p class="small" style="margin:6px 0 0">${L(`Обычные и хорошие номера. До ${d.perDay} в день, осталось ${left}. Новый спрос через`, `Common and fine plates. Up to ${d.perDay} a day, ${left} left. New demand in`)} <span class="mono" id="dealerCd" data-t="${d.ends}">--:--:--</span></p></div>
    ${ME ? `<button class="btn btn-chrome" data-act="dealer" ${d.plates.length && left ? '' : 'disabled'}>${d.plates.length ? L(`Продать скупщику · ${d.plates.length}`, `Sell to the dealer · ${d.plates.length}`) : L('Подходящих номеров нет', 'No matching plates')}</button>` : `<a class="btn btn-ghost" href="#/login?next=%23%2Fmarket">${L('Войти', 'Sign in')}</a>`}</div>
    <div class="dealer-d">${d.demands.map(x => `<span class="dem">${esc(L(x.ru, x.en))}</span>`).join('')}</div></section>`;
}
let mkSeq = 0;
let MK_SHOW = 24, mkSig = '';
// a new search starts from the first page again
const mkReset = () => { MK_SHOW = 24; mkSig = ''; };
async function loadMarket(silent = false) {
  const box = $('#mres'); if (!box) return; const seq = ++mkSeq;
  const p = new URLSearchParams({ sort: M.sort }); if (M.q) p.set('q', M.q); if (M.tiers.length) p.set('tiers', M.tiers.join(',')); if (M.group) p.set('group', M.group); if (M.min !== '') p.set('min', M.min); if (M.max !== '') p.set('max', M.max); if (M.who) p.set('who', M.who);
  let d; try { d = await GET('/api/market?' + p); } catch (e) { if (!silent) box.innerHTML = Empty(L('Не удалось загрузить рынок', 'Could not load the market'), esc(e.message)); return; }
  if (seq !== mkSeq || !$('#mres')) return;
  // the silent refresh rewrites the grid only when something really changed — rebuilding 120 cards
  // every 12 s used to eat memory on phones and the tab would reload
  const sig = d.listings.map(l => l.id + ':' + l.price).join(',');
  if (silent && sig === mkSig) return;
  mkSig = sig;
  const filtered = M.q || M.tiers.length || M.group || M.who || M.min !== '' || M.max !== '';
  box.innerHTML = `<div class="meta"><span>${d.listings.length} ${pl(d.listings.length, ['объявление', 'объявления', 'объявлений'], ['listing', 'listings'])}</span><span>${L('Поиск понимает русские и латинские буквы', 'Search understands Cyrillic and Latin letters')}</span></div>
  ${d.listings.length ? `<div class="pgrid">${d.listings.slice(0, MK_SHOW).map(l => PlateCard(l.plate, { listing: l, flag: l.mine ? L('Ваше', 'Yours') : '', actions: l.mine ? `<span class="row"><button class="btn btn-sm btn-ghost" data-act="editlisting" data-id="${l.id}" data-price="${l.price}">${L('Цена', 'Price')}</button><button class="btn btn-sm btn-ghost" data-act="cancel" data-id="${l.id}">${L('Снять', 'Cancel')}</button></span>` : `<button class="btn btn-sm btn-chrome" data-act="detail" data-id="${l.plate.id}">${L('Купить', 'Buy')}</button>` })).join('')}</div>${d.listings.length > MK_SHOW ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn-ghost" data-act="mkmore">${L('Показать ещё', 'Show more')} (${d.listings.length - MK_SHOW})</button></div>` : ''}`
    : filtered ? Empty(L('Ничего не нашлось', 'Nothing found'), L('Уберите часть фильтров или сократите запрос.', 'Remove some filters or shorten the query.'), `<button class="btn btn-ghost" data-act="mreset">${L('Сбросить фильтры', 'Reset filters')}</button>`)
      : Empty(L('Станьте первым продавцом', 'Be the first seller'), L('На рынке пока нет номеров.', 'There are no plates on the market yet.'), ME ? `<button class="btn btn-chrome" data-act="listdlg">${L('Выставить номер', 'List a plate')}</button>` : `<a class="btn btn-chrome" href="#/register">${L('Создать аккаунт', 'Create an account')}</a>`, { letters: 'ААА', digits: '001', region: '77' })}`;
  if (!silent) fx(box);
}
VIEWS.trades = async () => {
  const d = await GET('/api/market/mine');
  const ST = { ACTIVE: L('Активно', 'Active'), SOLD: L('Продано', 'Sold'), CANCELLED: L('Снято', 'Cancelled'), RESERVED: L('Резерв', 'Reserved') };
  return `<div class="wrap"><a class="back" href="#/market">← ${L('Рынок', 'Market')}</a><section class="page-head"><div><h1 class="h1">${L('Мои сделки', 'My trades')}</h1></div></section>
  <div class="panel" style="margin-bottom:80px">${d.trades.length ? d.trades.map(t => `<div class="tx"><span class="lbl"><a href="#/plate/${t.plate.id}">${esc(plateStr(t.plate))}</a> · ${t.role === 'seller' ? (t.buyer ? L('вы продали ', 'you sold to ') + esc(t.buyer) : L('ваше объявление', 'your listing')) : L('вы купили у ', 'you bought from ') + esc(t.seller)} <span class="tag s-${t.status}">${ST[t.status]}</span></span><span class="when">${date(t.at)} · ${t.id}</span><span class="amt">${fmt(t.price)}</span></div>`).join('') : `<p class="small" style="margin:0">${L('Сделок пока нет.', 'No trades yet.')}</p>`}</div></div>`;
};
VIEWS.trades.auth = true;

/* ---------- plate page ---------- */
VIEWS.plate = async ({ arg }) => {
  const d = await GET('/api/plates/' + encodeURIComponent(arg)); const p = d.plate; const l = d.listing;
  const mine = ME && p.owner === ME.nickname;
  const KIND = { MINTED: L('Выпущен', 'Minted'), LISTED: L('Выставлен на рынок', 'Listed'), PRICE_CHANGED: L('Цена изменена', 'Price changed'), DELISTED: L('Снят с рынка', 'Delisted'), TRANSFERRED: L('Продан', 'Sold'), BANKED: L('Продан банку', 'Sold to the bank'), UPGRADED: L('Сожжён в апгрейде', 'Burned in an upgrade') };
  const gone = p.status === 'BURNED' || p.status === 'BANKED';
  return `<div class="wrap"><a class="back" href="javascript:history.back()">← ${L('Назад', 'Back')}</a>
    <section class="vf"><p class="eyebrow">${L('Запись номера', 'Plate record')} · ${Rarity(p.tier)}</p>
      <div class="vf-frame t-${p.tier}" id="vfFrame"><div class="vf-scan"></div>${Plate(p, { holo: !gone })}</div>
      <div class="vf-id iri-t" id="vfId">${p.id}</div>
      <div class="pc-tags" style="justify-content:center">${Perks(p)}${Copy(p)}${gone ? `<span class="tag">${p.status === 'BURNED' ? L('Сожжён', 'Burned') : L('У банка', 'With the bank')}</span>` : ''}</div>
      <button class="btn btn-chrome btn-lg" data-act="verify" data-id="${p.id}">${IC.shield.replace('<svg', '<svg width="20" height="20"')}${L('Проверить подлинность', 'Verify authenticity')}</button>
      <div class="vf-res" id="vfRes" aria-live="polite"></div></section>
    <section class="split" style="padding-bottom:80px">
      <div class="panel"><h1 class="h2">${esc(plateStr(p))}</h1>
        <dl class="kv" style="margin-top:18px"><dt>ID</dt><dd>${p.id}</dd><dt>${L('Редкость', 'Rarity')}</dt><dd>${tierName(p.tier)}</dd>${perkOf(p).length ? `<dt>${L('Чем хорош', 'Why it’s special')}</dt><dd>${perkOf(p).map(esc).join(', ')}</dd>` : ''}<dt>${L('Экземпляр', 'Copy')}</dt><dd>${p.copy || 1} ${L('из', 'of')} 2</dd><dt>${L('Регион', 'Region')}</dt><dd>${esc(regionLabel(p))}</dd><dt>${L('Оценка', 'Value')}</dt><dd>${fmt(p.value)} PLT</dd>
          <dt>${L('Создан', 'Created')}</dt><dd>${date(p.created)}</dd><dt>${L('Происхождение', 'Origin')}</dt><dd>${esc(srv(p.origin))}</dd><dt>${L('Владелец', 'Owner')}</dt><dd>${p.owner ? `<a href="#/u/${esc(p.owner)}">${esc(p.owner)}</a>` : '—'}</dd></dl>
        ${l ? `<div class="row" style="margin-top:22px;justify-content:space-between"><div><p class="eyebrow">${L('В продаже', 'For sale')} · ${l.id}</p>${Price(l.price)}<p class="small" style="margin:4px 0 0">${L('Продавец', 'Seller')}: <a href="#/u/${esc(l.seller)}">${esc(l.seller)}</a></p></div>${mine ? `<span class="small">${L('Это ваше объявление', 'This is your listing')}</span>` : `<button class="btn btn-chrome btn-lg" data-act="detail" data-id="${p.id}">${L('Купить за', 'Buy for')} ${fmt(l.price)} PLT</button>`}</div>` : ''}
        ${ME && !mine && !l && p.owner && p.status === 'OWNED' ? `<div class="row" style="margin-top:22px"><a class="btn btn-ghost" href="#/swap/new?to=${encodeURIComponent(p.owner)}&want=${p.id}">${IC.swap}${L('Предложить обмен владельцу', 'Offer the owner a swap')}</a></div>` : ''}
        ${mine && !l ? `<div class="row" style="margin-top:22px"><button class="btn btn-chrome" data-act="listdlg" data-id="${p.id}">${L('Выставить на рынок', 'List on the market')}</button><a class="btn btn-ghost" href="#/upgrade?p=${p.id}">${L('Апгрейд', 'Upgrade')}</a></div>` : ''}</div>
      <div class="panel"><h2 class="h3" style="margin-bottom:18px">${L('История', 'History')}</h2><ol class="timeline">${d.history.slice().reverse().map(e => `<li class="rv"><b>${KIND[e.kind] || e.kind}${e.price ? ' · ' + fmt(e.price) + ' PLT' : ''}</b><span>${date(e.at)}${e.from ? ' · ' + L('от ', 'from ') + esc(e.from) : ''}${e.to ? ' · ' + L('к ', 'to ') + esc(e.to) : ''}</span></li>`).join('')}</ol></div>
    </section></div>`;
};
VIEWS.verify = VIEWS.plate;

VIEWS.u = async ({ arg }) => {
  const [{ profile: u }, mk] = await Promise.all([GET('/api/users/' + encodeURIComponent(arg)), GET('/api/market?seller=' + encodeURIComponent(arg))]);
  return `<div class="wrap"><section class="page-head"><div class="row" style="gap:16px">${Ava(u.nickname).replace('class="ava"', 'class="ava" style="width:64px;height:64px;font-size:28px;border-radius:20px"')}<div><p class="eyebrow">${L('Коллекционер · с ', 'Collector · since ')}${day(u.joined)}</p><h1 class="h1" style="margin-top:8px">${esc(u.nickname)}</h1>${Medals(u.medals)}${u.sets && u.sets.length ? `<div class="pbadges">${u.sets.map(id => { const st = CFG.sets.find(x => x.id === id); return st ? `<span class="pbadge" style="--sc:${st.color}" title="${esc(L(st.ru, st.en))}">${esc(st.badge)}</span>` : ''; }).join('')}</div>` : ''}</div></div>${ME && ME.nickname !== u.nickname ? `<a class="btn btn-chrome" href="#/swap/new?to=${encodeURIComponent(u.nickname)}">${IC.swap}${L('Предложить обмен', 'Offer a swap')}</a>` : ''}</section>
    <div class="stats s4"><div class="stat"><span>${L('Номеров', 'Plates')}</span><b>${u.plates}</b></div><div class="stat"><span>${L('Оценка', 'Value')}</span><b>${fmt(u.value)}</b></div><div class="stat"><span>${L('Регионов', 'Regions')}</span><b>${u.regions}</b></div><div class="stat"><span>${L('Продано', 'Sold')}</span><b>${u.sold}</b></div></div>
    <section class="sec">${SH(L('В продаже', 'For sale'))}${mk.listings.length ? `<div class="pgrid">${mk.listings.map(l => PlateCard(l.plate, { listing: l, actions: l.mine ? `<span class="small">${L('Ваше', 'Yours')}</span>` : `<button class="btn btn-sm btn-chrome" data-act="detail" data-id="${l.plate.id}">${L('Купить', 'Buy')}</button>` })).join('')}</div>` : Empty(L('Ничего не выставлено', 'Nothing listed'), L(`У ${esc(u.nickname)} сейчас нет номеров на рынке.`, `${esc(u.nickname)} has no plates on the market right now.`))}</section>
    <section class="sec" style="padding-bottom:80px">${SH(L('Лучшее в коллекции', 'Collection highlights'))}${u.top.length ? `<div class="pgrid">${u.top.map(p => PlateCard(p)).join('')}</div>` : Empty(L('Пока пусто', 'Empty for now'), L('В этой коллекции нет номеров.', 'This collection has no plates.'))}</section></div>`;
};
