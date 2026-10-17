
/* ---------- cases ---------- */
const CF = { cat: 'all', sort: 'id' };
VIEWS.cases = async () => `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Каталог', 'Catalogue')} · ${CFG.cases.length}</p><h1 class="h1" style="margin-top:12px">${L('Кейсы', 'Cases')}</h1><p class="lede" style="margin-top:12px">${L('У каждого кейса свой цвет и своя редкость. Шансы видны до открытия. Белорусские номера дешевле.', 'Every case has its own colour and rarity. Odds are shown before you open. Belarusian plates are cheaper.')}</p></div>
    <label class="sr-only" for="csort2">${L('Сортировка', 'Sort')}</label><select class="inline" id="csort2">${[['id', L('По порядку', 'Default')], ['pa', L('Сначала дешёвые', 'Cheapest first')], ['pd', L('Сначала дорогие', 'Priciest first')], ['rare', L('Больше редких', 'Most rares')]].map(([v, t]) => `<option value="${v}"${CF.sort === v ? ' selected' : ''}>${t}</option>`).join('')}</select></section>
  ${featured()}
  <div class="cats" role="toolbar" aria-label="${L('Категории', 'Categories')}">${[['all', L('Все', 'All')], ...Object.keys(CFG.cats).map(k => [k, catName(k)])].map(([k, t]) => `<button class="chip" data-act="ccat" data-k="${k}" aria-pressed="${CF.cat === k}">${t} <b>${k === 'all' ? CFG.cases.length : CFG.cases.filter(c => c.cat === k).length}</b></button>`).join('')}</div>
  <div id="cgridBox" style="padding-block:18px 80px">${casesGrid()}</div></div>`;
function featured() {
  const c = caseById('44'); if (!c) return '';
  return `<a class="case-hero feat t-${c.rank}" href="#/case/${c.id}" style="--c:${c.color};--c2:${c.color2};margin:0 0 18px;text-decoration:none;color:#fff"><div class="cc-bg"></div>
    <div class="case-art" style="min-height:220px">${glyph(c)}</div>
    <div class="case-info"><p class="eyebrow" style="color:var(--tc)">${L('Легенда · самые щедрые шансы', 'Legend · the most generous odds')}</p><h2 class="case-name" style="font-size:clamp(40px,6vw,80px)">${esc(caseName(c))}</h2><p class="lede" style="color:rgba(255,255,255,.75)">${esc(caseNote(c))}</p>
      <div class="row"><span class="cc-price" style="font-size:18px;padding:10px 18px">${fmt(priceOf(c))}<small>PLT</small></span><span class="btn btn-glass btn-info" data-act="odds" data-case="${c.id}" role="button" tabindex="0"><i>i</i>${L('Шансы', 'Odds')}</span></div></div></a>`;
}
function casesGrid() {
  let list = CFG.cases.filter(c => CF.cat === 'all' || c.cat === CF.cat);
  if (CF.sort === 'pa') list = [...list].sort((a, b) => priceOf(a) - priceOf(b)); else if (CF.sort === 'pd') list = [...list].sort((a, b) => priceOf(b) - priceOf(a)); else if (CF.sort === 'rare') list = [...list].sort((a, b) => rarePlus(b) - rarePlus(a));
  return `<div class="cgrid">${list.map(CaseCard).join('')}</div>`;
}

VIEWS.case = async ({ arg }) => {
  const c = caseById(arg); if (!c) throw Object.assign(new Error(L('Такого кейса нет.', 'No such case.')), { status: 404 });
  const ru = c.pool.RU.length, by = c.pool.BY.length; const d = dealOf(c);
  const regs = by && !ru ? `${L('Беларусь', 'Belarus')}: ${c.pool.BY.map(r => (LANG === 'en' ? BY_EN[r] : CFG.byRegions[r])).join(', ')}` : ru && !by ? (ru === Object.keys(CFG.regions).length ? L('Вся Россия', 'All of Russia') : L('Регионы ', 'Regions ') + c.pool.RU.join(', ')) : L('Россия и Беларусь', 'Russia and Belarus');
  const strip = Array.from({ length: 16 }, () => cardHtml(visualPlate(c))).join('');
  const similar = CFG.cases.filter(x => x.cat === c.cat && x.id !== c.id).slice(0, 4);
  return `<div class="wrap"><a class="back" href="#/cases">← ${L('Все кейсы', 'All cases')}</a>
    <section class="case-hero t-${c.rank}" style="--c:${c.color};--c2:${c.color2}"><div class="cc-bg"></div>
      <div class="turntable" aria-hidden="true"><div class="box3">${['bk', 'lf', 'rt', 'bt', 'fr', 'tp'].map(f => `<div class="f ${f}">${f === 'fr' || f === 'bk' ? `<span class="seam"></span><span class="lt l"></span><span class="lt r"></span><span class="emb">${IC.star}</span>` : ''}</div>`).join('')}<span class="hd"></span></div></div>
      <div class="case-info"><p class="eyebrow" style="color:rgba(255,255,255,.6)">№${c.id} · ${catName(c.cat)} · <span style="color:var(--tc)">${rankName(c.rank)}</span></p><h1 class="case-name">${esc(caseName(c))}</h1><p class="lede" style="color:rgba(255,255,255,.75)">${esc(caseNote(c))} ${esc(regs)}.</p>
        <div class="bigprice">${d ? `<span class="was" style="font-size:.45em">${fmt(d.was)}</span>` : ''}${fmt(priceOf(c))}<small>PLT</small>${d ? `<span class="tag deal">−${d.pct}% ${L('сегодня', 'today')}</span>` : ''}</div>
        <div id="openAct" class="row">${openAction(c)}</div>
        <div class="row"><button class="btn btn-glass btn-info" data-act="odds" data-case="${c.id}"><i>i</i>${L('Шансы выпадения', 'Drop odds')}</button></div>
      </div></section>
    <section class="sec">${SH(L('Что внутри', 'What’s inside'), L('Так выглядит лента при открытии. Результат выбирает сервер до прокрутки.', 'This is the strip you’ll see. The server picks the result before it spins.'))}<div class="inside" aria-hidden="true"><div class="inside-track">${strip}${strip}</div></div></section>
    <section class="split" style="padding-bottom:20px"><div>${similar.length ? `${SH(L('Похожие кейсы', 'Similar cases'))}<div class="cgrid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${similar.map(CaseCard).join('')}</div>` : ''}</div>
      <aside class="panel" id="buybox" style="align-self:start">${buyBox(c)}</aside></section><div style="height:60px"></div></div>`;
};
function openAction(c) {
  if (!ME) return `<a class="btn btn-chrome btn-lg" href="#/login?next=${encodeURIComponent('#/case/' + c.id)}">${L('Войти, чтобы открыть', 'Sign in to open')}</a>`;
  const short = priceOf(c) - ME.balance;
  const multi = [2, 3].map(k => `<button class="btn btn-glass btn-lg open-x" data-act="open" data-case="${c.id}" data-n="${k}" ${priceOf(c) * k > ME.balance ? 'disabled' : ''}><b>×${k}</b><span>${fmt(priceOf(c) * k)}</span></button>`).join('');
  return `<div class="open-row"><button class="btn btn-chrome btn-xl" id="openBtn" data-act="open" data-case="${c.id}" ${short > 0 ? 'disabled' : ''}>${L('Открыть за', 'Open for')} ${fmt(priceOf(c))} PLT</button>${multi}</div>${short > 0 ? `<span class="small">${L(`Не хватает ${fmt(short)} PLT.`, `${fmt(short)} PLT short.`)} <a class="btn-text" href="#/wallet">${L('Пополнить', 'Top up')}</a> · <a class="btn-text" href="#/bonus">${L('Бонусы', 'Bonuses')}</a></span>` : ''}`;
}
function buyBox(c) {
  const p = priceOf(c);
  return `<h2 class="h3" style="margin-bottom:14px">${L('Итог', 'Summary')}</h2><dl class="kv"><dt>${L('Цена', 'Price')}</dt><dd>${fmt(p)} PLT</dd><dt>${L('Средняя оценка содержимого', 'Average content value')}</dt><dd>≈ ${fmt(c.ev)} PLT</dd><dt>${L('Средний выкуп банком', 'Average bank buy-back')}</dt><dd>≈ ${fmt(c.ev * CFG.bankRate)} PLT</dd><dt>${L('Редкий и выше', 'Rare or better')}</dt><dd>${rarePlus(c)}%</dd><dt>XP</dt><dd>+${fmt(p)}</dd>
    ${ME ? `<dt class="tot">${L('Баланс после открытия', 'Balance after opening')}</dt><dd class="tot">${ME.balance >= p ? fmt(ME.balance - p) + ' PLT' : '—'}</dd>` : ''}</dl>
    <p class="small" style="margin:16px 0 0">${L('Открытие кейса не гарантирует прибыль: в среднем выкуп банком ниже цены кейса.', 'Opening a case does not guarantee profit: on average the bank buy-back is below the case price.')}</p>`;
}
