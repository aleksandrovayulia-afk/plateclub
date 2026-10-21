
/* ---------- components ---------- */
function Plate(p, o = {}) {
  // grail and mythic plates shimmer in their own colour; elite keeps the rainbow edge
  const sh = o.iri === false ? '' : p.tier === 'mythic' ? ' my' : p.tier === 'grail' ? ' gl' : '';
  const iri = !sh && (o.iri ?? p.tier === 'elite');
  const badge = '';
  const al = esc(L('Номер ', 'Plate ') + plateStr(p));
  if (p.country === 'BY') return `<span class="plate by${iri ? ' iri' : ''}${sh}" role="img" aria-label="${al}"><span class="by-flag" aria-hidden="true"><i></i><b>BY</b></span><span class="pl-main" aria-hidden="true"><span class="pl-d">${p.digits}</span><span class="pl-l">${p.letters}</span><span class="pl-dash">-</span><span class="pl-d">${p.region}</span></span>${badge}</span>`;
  return `<span class="plate${iri ? ' iri' : ''}${sh}" role="img" aria-label="${al}"><span class="pl-main" aria-hidden="true"><span class="pl-l">${p.letters[0]}</span><span class="pl-d">${p.digits}</span><span class="pl-l">${p.letters.slice(1)}</span></span><span class="pl-reg" aria-hidden="true"><span class="pl-rn${p.region.length > 2 ? ' r3' : ''}">${p.region}</span><span class="pl-rus">RUS<span class="flag"></span></span></span>${badge}</span>`;
}
const Rarity = t => `<span class="rl t-${t}"><i></i>${tierName(t)}</span>`;
const Price = n => `<span class="price">${fmt(n)}<small>PLT</small></span>`;
const Perks = p => perkOf(p).map(t => `<span class="perk">${esc(t)}</span>`).join('');
const Copy = p => (p.tier === 'mythic' ? `<span class="cp myth" title="${L('Единственный экземпляр', 'The only copy')}">1/1</span>` : p.copy ? `<span class="cp${p.copy === 2 ? ' last' : ''}" title="${L(`Экземпляр ${p.copy} из 2`, `Copy ${p.copy} of 2`)}">${p.copy}/2</span>` : '');
const SH = (title, sub = '', link = '') => `<div class="sh"><div><h2 class="h2">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${link}</div>`;
const Empty = (title, text, action = '', plate = null) => `<div class="empty">${plate ? Plate(plate, { iri: false }) : ''}<h3 class="h3">${title}</h3><p style="margin:0;max-width:46ch">${text}</p>${action}</div>`;
const OddsBar = odds => `<div class="oddsbar" aria-hidden="true">${odds.map((o, i) => (o > 0 ? `<span class="t-${CFG.tiers[i].id}" style="flex:${Math.max(o, 1.5)}"></span>` : '')).join('')}</div>`;
// each case gets its own emblem: region code, BY band, pattern sample, diamond or crown
const EMB_PAT = { seq: '123', pair: '113', mirror: '121', round: '500', triple: '777', letters: 'AAA', zero: '007', full: '777', zerofull: '001' };
const GEM = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" opacity=".9"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12" stroke="rgba(0,0,0,.35)" stroke-width="1" fill="none"/></svg>';
const CROWN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 4 4.5-7 4.5 7L21 8l-2 11H5z"/></svg>';
function emblem(c) {
  const f = c.focus && Object.values(c.focus)[0];
  if (c.cat === 'legend' || c.cat === 'top') return `<span class="cg-emb icon">${c.cat === 'legend' ? CROWN : GEM}</span>`;
  if (c.cat === 'premium') return `<span class="cg-emb icon">${GEM}</span>`;
  if (c.cat === 'pattern' && f) return `<span class="cg-emb txt">${EMB_PAT[f] || '★'}</span>`;
  if (c.cat === 'belarus') return `<span class="cg-emb by"><i></i>${c.pool.BY.length === 1 ? c.pool.BY[0] : 'BY'}</span>`;
  if (c.cat === 'region') return `<span class="cg-emb txt">${esc(c.cover.region)}</span>`;
  return `<span class="cg-star">${IC.star}</span>`;
}
const glyph = (c, cls = '') => `<div class="cg ${cls}" style="--c:${c.color};--c2:${c.color2}"><span class="cg-glow"></span><span class="cg-handle"></span><span class="cg-lid"></span><div class="cg-body"><span class="cg-latch l"></span><span class="cg-latch r"></span><span class="cg-rib l"></span><span class="cg-rib r"></span>${emblem(c)}</div><span class="cg-shadow"></span></div>`;
const nameCls = n => { const w = Math.max(...n.split(' ').map(x => x.length)); return w > 11 ? ' xlong' : w > 8 ? ' long' : ''; };
const daysLeft = t => { const ms = Math.max(0, t - Date.now()), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5); return d ? L(`${d} д ${h} ч`, `${d}d ${h}h`) : L(`${h} ч`, `${h}h`); };
function CaseCard(c) {
  const d = dealOf(c);
  return `<div class="ccw rv"><a class="cc r-${c.rank} t-${c.rank}" href="#/case/${c.id}" data-fx="case" style="--c:${c.color};--c2:${c.color2}" aria-label="${esc(L('Кейс ', 'Case ') + caseName(c))}, ${rankName(c.rank)}, ${fmt(priceOf(c))} PLT">
    <div class="cc-bg"></div>
    <div class="cc-top"><span class="cc-rank">${rankName(c.rank)}</span><span class="cc-no">№${c.id}</span></div>
    ${d ? `<span class="cc-deal">−${d.pct}%</span>` : ''}${c.until ? `<span class="cc-season">🍂 ${L('Сезон', 'Season')} · ${daysLeft(c.until)}</span>` : ''}
    <div class="cc-art">${glyph(c)}</div>
    <div><div class="cc-name${nameCls(caseName(c))}">${esc(caseName(c))}</div><p class="cc-sub">${esc(caseNote(c).split('. ')[0].replace(/\.$/, ''))}</p></div>
    <span class="cc-open"><span>${L('Открыть', 'Open')}</span><b>${d ? `<span class="was">${fmt(d.was)}</span>` : ''}${fmt(priceOf(c))}<small>PLT</small></b></span></a>
    <button class="cc-info" data-act="odds" data-case="${c.id}" aria-label="${L('Шансы выпадения', 'Drop odds')}" title="${L('Шансы выпадения', 'Drop odds')}">i</button></div>`;
}
// odds are shown on demand: the (i) button on a case opens this
function oddsDialog(c) {
  const p = priceOf(c);
  openDialog(`<div class="dlg" style="--cardbg:var(--bg2)"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">${L('Шансы выпадения', 'Drop odds')}</p><h2 class="h3" id="dlgTitle" style="margin-top:6px">${esc(caseName(c))}</h2></div><button class="btn btn-sm btn-ghost" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div>
    <div class="odds-d">${CFG.tiers.map((t, i) => `<div class="odds-row t-${t.id}" style="${c.odds[i] ? '' : 'opacity:.35'}">${Rarity(t.id)}<div class="bar"><span style="width:${Math.max(c.odds[i] ? 2 : 0, Math.min(100, c.odds[i] * (100 / Math.max(...c.odds))))}%"></span></div><span class="pct">${c.odds[i]}%</span><span class="val">${c.odds[i] ? '≈ ' + fmt(t.base * c.mult) + ' PLT' : '—'}</span></div>${c.focus && c.focus[t.id] && c.odds[i] ? `<p class="small" style="margin:-6px 0 0 132px">${L('всегда', 'always')} «${patName(c.focus[t.id])}»</p>` : ''}`).join('')}</div>
    <dl class="kv"><dt>${L('Цена кейса', 'Case price')}</dt><dd>${fmt(p)} PLT</dd><dt>${L('Средняя оценка содержимого', 'Average content value')}</dt><dd>≈ ${fmt(c.ev)} PLT</dd><dt>${L('Средний выкуп банком', 'Average bank buy-back')}</dt><dd>≈ ${fmt(c.ev * CFG.bankRate)} PLT</dd><dt>${L('Редкий и выше', 'Rare or better')}</dt><dd>${rarePlus(c)}%</dd></dl>
    <p class="small" style="margin:0">${L('Оценка — внутриигровая цена номера. Сервер выбирает результат до прокрутки. Каждая комбинация выпускается максимум дважды.', 'Value is the in-game price of a plate. The server picks the result before the spin. Each combination is minted at most twice.')}</p></div>`);
}
function PlateCard(p, o = {}) {
  const l = o.listing;
  return `<article class="pc t-${p.tier} rv">${o.flag ? `<span class="tag flag-tl ${o.flagCls || ''}">${o.flag}</span>` : ''}
    <a class="pc-plate" href="#/plate/${p.id}" aria-label="${esc(L('Номер ', 'Plate ') + plateStr(p))}">${Plate(p, { holo: true })}</a>
    <div class="pc-r">${Rarity(p.tier)}<a class="pid iri-t" href="#/plate/${p.id}">${p.id}${VB()}</a></div>
    <div class="pc-tags">${Perks(p)}${Copy(p)}</div>
    <div class="pc-sub">${esc(regionLabel(p))}${l && l.seller ? `<br>${L('Продавец', 'Seller')}: ${l.bot ? `<span class="mk-bot">Plate Club Market</span>` : `<a href="#/u/${esc(l.seller)}">${esc(l.seller)}</a>`}` : ''}</div>
    ${l ? DealLine(l.price, p.value) : o.pl && p.paid != null ? PLLine(p.paid, p.value) : ''}
    <div class="pc-foot">${l ? Price(l.price) : `<span class="small">${L('Оценка', 'Value')} ${fmt(p.value)} PLT</span>`}${o.actions || ''}</div></article>`;
}
function DealLine(price, value) {
  const d = vsValue(price, value);
  return `<div class="deal-l ${d < 0 ? 'good' : d > 15 ? 'high' : ''}"><span>${L('Оценка', 'Value')} ${fmt(value)}</span><b>${d < 0 ? '−' + Math.abs(d) + '%' : d === 0 ? L('по оценке', 'at value') : '+' + d + '%'}</b></div>`;
}
function PLLine(paid, value) {
  const d = value - paid, pct = vsValue(value, paid);
  return `<div class="deal-l ${d > 0 ? 'good' : d < 0 ? 'bad' : ''}"><span>${L('Куплен за', 'Paid')} ${fmt(paid)}</span><b>${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d))} · ${pct > 0 ? '+' : ''}${pct}%</b></div>`;
}
function TierBars(counts) {
  const max = Math.max(1, ...Object.values(counts));
  return `<div class="tiers">${[...CFG.tiers].reverse().map(t => { const n = counts[t.id] || 0; return `<div class="trow t-${t.id}">${Rarity(t.id)}<div class="track2"><span style="width:${n / max * 100}%"></span></div><span class="mono" style="text-align:right">${n}</span></div>`; }).join('')}</div>`;
}
const TxRow = t => `<div class="tx rv"><span class="lbl">${esc(srv(t.label))}</span><span class="when">${date(t.at)} · ${t.id}</span><span class="amt${t.amount > 0 ? ' plus' : ''}">${t.amount > 0 ? '+' : '−'}${fmt(Math.abs(t.amount))}</span></div>`;
const LLoad = (w = 220) => `<span class="lload" role="img" aria-label="${L('Загрузка', 'Loading')}" style="--lw:${w}px"><span class="ll-glow"></span><span class="ll-rings"><i></i><i></i><i></i></span><img class="ll-ghost" src="${BRAND('logo-chrome-900.png')}" alt=""><span class="ll-fill"></span><span class="ll-shine"></span><span class="ll-drops"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></span><div class="lload-bar" aria-hidden="true"><i></i></div>`;
const skel = () => `<div class="wrap page-load" role="status" aria-label="${L('Загрузка', 'Loading')}"><div>${LLoad(200)}</div></div>`;
// personal avatar: first letter of the real name (without demo_) on a chrome gradient tinted by the nickname
const avaHue = n => { let h = 0; for (const ch of String(n || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 360; };
// level frames and nickname colours: 10 bronze, 25 silver, 50 gold, 75 diamond, 100 legend
const FRAME = lv => (lv >= 100 ? 'f-legend' : lv >= 75 ? 'f-diamond' : lv >= 50 ? 'f-gold' : lv >= 25 ? 'f-silver' : lv >= 10 ? 'f-bronze' : '');
const Nick = (n, lv) => `<span class="nk ${FRAME(lv || 0)}">${esc(n)}</span>`;
const Ava = (n, o = {}) => { const fr = FRAME(o.lv || 0); if (o.av) return `<span class="ava has-img ${fr}" aria-hidden="true"><img src="/api/avatar/${encodeURIComponent(n)}?v=${encodeURIComponent(o.av)}" alt="" loading="lazy" decoding="async"></span>`;
  const nm = String(n || '?').replace(/^demo_/i, ''); const h = avaHue(n); return `<span class="ava ${fr}" aria-hidden="true" style="background:linear-gradient(160deg,#fff 0%,hsl(${h} 90% 82%) 30%,hsl(${h} 75% 52%) 62%,hsl(${h} 85% 80%) 100%);color:hsl(${h} 80% 14%)">${esc(nm[0].toUpperCase())}</span>`; };
function LvlRing(lv, size = 42) {
  const r = (size - 6) / 2, C = 2 * Math.PI * r, k = lv.next > lv.cur ? (lv.xp - lv.cur) / (lv.next - lv.cur) : 1;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle class="bgc" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="fgc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - k)}"/></svg><b>${lv.level}</b>`;
}

function toast(msg, bad = false) { const el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = msg; $('#toasts').append(el); setTimeout(() => el.remove(), bad ? 5600 : 3400); }
function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.classList.add('is-loading'); if (label) btn.textContent = label; } else { btn.disabled = false; btn.classList.remove('is-loading'); if (btn.dataset.l) btn.innerHTML = btn.dataset.l; } }
const dlg = $('#dlg');
function openDialog(html) { dlg.returnValue = ''; dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); const f = dlg.querySelector('[autofocus]') || dlg.querySelector('button,input'); f && f.focus(); }
function confirmDialog({ title, lede = '', rows = [], ok = L('Подтвердить', 'Confirm'), danger = false }) {
  return new Promise(res => {
    openDialog(`<form method="dialog" class="dlg"><h2 class="h3" id="dlgTitle">${title}</h2>${lede ? `<p class="small" style="margin:0">${lede}</p>` : ''}
      ${rows.length ? `<dl class="kv">${rows.map(([k, v, c]) => `<dt${c ? ' class="tot"' : ''}>${k}</dt><dd${c ? ' class="tot"' : ''}>${v}</dd>`).join('')}</dl>` : ''}
      <div class="dlg-acts"><button class="btn btn-ghost" value="cancel">${L('Отмена', 'Cancel')}</button><button class="btn${danger ? ' btn-danger' : ' btn-chrome'}" value="ok" autofocus>${ok}</button></div></form>`);
    dlg.addEventListener('close', () => res(dlg.returnValue === 'ok'), { once: true });
  });
}
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close('cancel'); });
dlg.addEventListener('cancel', () => { dlg.returnValue = 'cancel'; });
function coins(from, n = 14) {
  if (reduced() || !from) return; const r = from.getBoundingClientRect(); const to = ($('#balPill') || from).getBoundingClientRect();
  for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'coin-burst'; c.style.left = r.left + r.width / 2 + 'px'; c.style.top = r.top + r.height / 2 + 'px'; c.style.setProperty('--dx', (to.left + to.width / 2 - r.left - r.width / 2 + (Math.random() - 0.5) * 40) + 'px'); c.style.setProperty('--dy', (to.top - r.top + (Math.random() - 0.5) * 30) + 'px'); c.style.animationDelay = i * 35 + 'ms'; document.body.appendChild(c); setTimeout(() => c.remove(), 1400); }
}
function confetti(host, col, n = 40) {
  if (reduced()) return; if (isLite()) n = n >> 1; const box = host.getBoundingClientRect();
  for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = 'particle'; s.style.position = 'fixed'; s.style.left = box.left + box.width / 2 + 'px'; s.style.top = box.top + box.height / 2 + 'px'; const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 260; s.style.setProperty('--dx', Math.cos(a) * r + 'px'); s.style.setProperty('--dy', Math.sin(a) * r * 0.7 + 'px'); s.style.setProperty('--rot', Math.random() * 720 + 'deg'); s.style.background = i % 3 ? col : '#fff'; s.style.zIndex = 500; document.body.appendChild(s); setTimeout(() => s.remove(), 1300); }
}
