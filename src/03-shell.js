
/* ---------- routing & chrome ---------- */
const NAVS = () => [['', L('Главная', 'Home'), 'home'], ['cases', L('Кейсы', 'Cases'), 'cases'], ['games', L('Игры', 'Games'), 'games'], ['market', L('Рынок', 'Market'), 'market'], ['top', L('Топ', 'Top'), 'trophy'], ['bonus', L('Бонусы', 'Bonuses'), 'gift']];
const BNAV = () => [['', L('Главная', 'Home'), 'home'], ['cases', L('Кейсы', 'Cases'), 'cases'], ['games', L('Игры', 'Games'), 'games'], ['market', L('Рынок', 'Market'), 'market'], ['collection', L('Номера', 'Plates'), 'coll']];
const SECTION_OF = { battles: 'games', battle: 'games', sets: 'games', swap: 'games', auction: 'games', upgrade: 'games', support: 'support', case: 'cases', transactions: 'wallet', achievements: 'bonus', rankings: 'top', plate: 'collection', verify: 'collection', u: 'top', trades: 'market' };
let lastBal = null;
function parseRoute() { const h = location.hash.replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const seg = path.split('/').filter(Boolean).map(decodeURIComponent); return { name: seg[0] || '', arg: seg[1], query: new URLSearchParams(qs || '') }; }
const go = h => { if (location.hash === h) render(); else location.hash = h; };
function chrome() {
  if (!CFG) return;
  const r = parseRoute(); const cur = SECTION_OF[r.name] ?? r.name;
  $('#topnav').innerHTML = NAVS().map(([id, t, ic]) => `<a href="#/${id}"${cur === id ? ' aria-current="page"' : ''}>${IC[ic]}${t}${id === 'games' && ME && ME.swaps ? '<i class="dot" style="position:absolute;top:4px;right:6px;width:7px;height:7px;border-radius:50%;background:#ff4d6d"></i>' : ''}${id === 'bonus' && PERKS && hasBonus() ? '<i class="dot" style="position:absolute;top:4px;right:6px;width:7px;height:7px;border-radius:50%;background:#ff4d6d"></i>' : ''}</a>`).join('');
  $('#topnav').setAttribute('aria-label', L('Главное меню', 'Main menu'));
  $('#botnav').innerHTML = BNAV().map(([id, t, ic]) => `<a href="#/${id}"${cur === id ? ' aria-current="page"' : ''}>${IC[ic]}<span>${t}</span></a>`).join('');
  const lang = `<div class="lang hide-s" role="group" aria-label="Language"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div>`;
  $('#hdrR').innerHTML = ME
    ? `${lang}${ME.role === 'admin' ? `<a class="pill admin hide-s" href="#/admin">${IC.crown.replace('<svg', '<svg width="16" height="16"')}${L('Админ', 'Admin')}${ME.inbox ? `<i class="cnt">${ME.inbox}</i>` : ''}</a><a class="icon-btn adm-m" href="#/admin" aria-label="${L('Панель админа', 'Admin panel')}">${IC.crown}${ME.inbox ? '<i class="dot"></i>' : ''}</a>` : ''}<a class="icon-btn hide-s" href="#/support" aria-label="${L('Поддержка', 'Support')}" title="${L('Поддержка', 'Support')}">${IC.chat}${ME.unread ? '<i class="dot"></i>' : ''}</a>${ME.level ? `<a class="lvl" href="#/bonus" title="${L('Уровень', 'Level')} ${ME.level.level}" aria-label="${L('Уровень', 'Level')} ${ME.level.level}">${LvlRing(ME.level)}</a>` : ''}<a class="icon-btn hide-s" href="#/bonus" aria-label="${L('Бонусы', 'Bonuses')}">${IC.gift}${PERKS && hasBonus() ? '<i class="dot"></i>' : ''}</a><a class="bal" id="balPill" href="#/wallet" aria-label="${L('Баланс', 'Balance')} ${fmt(ME.balance)} PLT"><span>${fmt(ME.balance)}</span><small>PLT</small><span class="plus" aria-hidden="true">+</span></a><button class="burger" data-act="drawer" aria-label="${L('Меню', 'Menu')}">${IC.menu}</button>`
    : `${lang}<a class="pill hide-s" href="#/login">${L('Войти', 'Sign in')}</a><a class="btn btn-chrome btn-sm" href="#/register">${L('Регистрация', 'Sign up')}</a><button class="burger" data-act="drawer" aria-label="${L('Меню', 'Menu')}">${IC.menu}</button>`;
  $('#foot').innerHTML = `<div class="wrap"><img src="${BRAND('logo-chrome-360.png')}" alt="Plate Club"><span>${L('Игровые предметы. Это не настоящие регистрационные номера.', 'Game items. These are not real registration plates.')}</span><span><a href="#/terms">${L('Правила', 'Terms')}</a> · <a href="#/privacy">${L('Конфиденциальность', 'Privacy')}</a> · <a href="#/help">${L('Помощь', 'Help')}</a> · <a href="#/support">${L('Написать нам', 'Contact us')}</a>${CFG && CFG.telegram ? ` · <a href="${esc(CFG.telegram.url)}" target="_blank" rel="noopener">Telegram</a>` : ''}</span></div>`;
  if (ME) { if (lastBal != null && ME.balance !== lastBal && !reduced()) { const d = ME.balance - lastBal, pill = $('#balPill'); if (pill) { rollNum(pill.querySelector('span'), lastBal, ME.balance); const f = document.createElement('span'); f.className = 'bal-fly ' + (d > 0 ? 'plus' : 'minus'); f.textContent = (d > 0 ? '+' : '−') + fmt(Math.abs(d)); pill.appendChild(f); pill.classList.add('bump'); setTimeout(() => f.remove(), 1500); } } lastBal = ME.balance; } else lastBal = null;
}
function rollNum(el, from, to) { if (!el) return; const t0 = performance.now(), D = 700; const st = now => { const k = Math.min(1, (now - t0) / D); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); }
const hasBonus = () => PERKS && (!PERKS.daily.claimed || PERKS.achievements.some(a => a.done && !a.claimed) || (PERKS.level && PERKS.level.unclaimed > 0));
let renderSeq = 0, marketTimer = null;
async function render(scroll = true) {
  const seq = ++renderSeq; const r = parseRoute(); const v = $('#view');
  clearInterval(marketTimer); clearInterval(btPoll); btSkip = true; rollAbort(); closeStage(true); chrome();
  const view = VIEWS[r.name] || VIEWS[''];
  if (view.auth && !ME) { v.innerHTML = await VIEWS.login({ next: location.hash, query: new URLSearchParams() }); after('login'); return; }
  v.innerHTML = skel();
  let html;
  try { html = await view(r); } catch (e) { html = `<div class="wrap" style="padding-block:60px">${Empty(e.status === 404 ? L('Не найдено', 'Not found') : L('Не удалось загрузить страницу', 'Could not load the page'), esc(e.message), `<a class="btn btn-ghost" href="#/">${L('На главную', 'Home')}</a>`)}</div>`; }
  if (seq !== renderSeq) return;
  v.innerHTML = (CFG && CFG.announcement && r.name !== 'admin' ? `<div class="wrap"><div class="announce">${IC.chat}<span>${esc(CFG.announcement)}</span></div></div>` : '') + html;
  const HEADS = { games: 5, battles: 5, battle: 5, sets: 1, swap: 2, auction: 3, support: 4, cases: 1, market: 2, trades: 2, collection: 2, top: 3, rankings: 3, profile: 3, u: 3, bonus: 4, achievements: 4, upgrade: 5, wallet: 6, transactions: 6, admin: 6 };
  v.style.setProperty('--head', `url(${IMG('head-' + (HEADS[r.name] || 1) + '.jpg')})`);
  if (scroll) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); window.scrollTo(0, 0); }
  after(r.name, r);
}
window.addEventListener('hashchange', () => { closeDrawer(); if (dlg.open) dlg.close(); render(true); });
const VIEWS = {};

/* ---------- living layer ---------- */
let revealIO = null;
function fx(root = document) {
  if (reduced()) return;
  document.documentElement.classList.add('rv-on');
  if (!revealIO && 'IntersectionObserver' in window) revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); countUp(e.target); revealIO.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  const groups = new Map();
  root.querySelectorAll('.rv:not(.in)').forEach(el => { const k = el.parentElement; const i = groups.get(k) || 0; groups.set(k, i + 1); if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(i, 8)); if (revealIO) revealIO.observe(el); else el.classList.add('in'); });
  setTimeout(() => root.querySelectorAll('.rv:not(.in)').forEach(el => { el.classList.add('in'); countUp(el); }), 2600);
  if (finePointer()) {
    root.querySelectorAll('.cc').forEach(t => { t.addEventListener('pointermove', e => { const r = t.getBoundingClientRect(); t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 12 + 'deg'); t.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 9 + 'deg'); }); t.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); }); });
    const hb = root.querySelector('#heroBg'); const hero = hb && hb.parentElement;
    if (hb) hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; hb.style.translate = `${(-x * 26).toFixed(1)}px ${(-y * 18).toFixed(1)}px`; });
  }
}
function countUp(el) {
  const b = el.matches && el.matches('.stat') ? el.querySelector('b') : null; if (!b || b._cnt) return; b._cnt = 1;
  const txt = b.textContent; if (!/^[\d \s]+$/.test(txt.trim())) return; const target = Number(txt.replace(/\D/g, '')); if (!target) return;
  const t0 = performance.now(), D = 900; const step = now => { const k = Math.min(1, (now - t0) / D); b.textContent = fmt(target * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}
function countdown(el, ends, onEnd) {
  const set = () => { if (!document.body.contains(el)) return clearInterval(t); const ms = Math.max(0, ends - Date.now()); const p = [Math.floor(ms / 3600e3), Math.floor(ms % 3600e3 / 60e3), Math.floor(ms % 60e3 / 1e3)].map(n => String(n).padStart(2, '0'));
    if (el.classList.contains('timer')) { const spans = el.querySelectorAll('span'); p.forEach((v, i) => { if (spans[i].textContent !== v) { spans[i].textContent = v; spans[i].classList.remove('tick'); void spans[i].offsetWidth; spans[i].classList.add('tick'); } }); } else el.textContent = p.join(':');
    if (!ms) { clearInterval(t); onEnd && onEnd(); } };
  const t = setInterval(set, 1000); set();
}
function after(name) {
  if (name === 'market') { loadMarket(); marketTimer = setInterval(() => { if (document.visibilityState === 'visible' && !dlg.open && parseRoute().name === 'market') loadMarket(true); }, 12000); }
  if (name === 'wallet' || name === 'transactions') walletHooks();
  if (name === 'register') regHooks();
  if (name === 'admin') adminHooks();
  if (name === 'support') supportHooks();
  if (name === 'battle') { btSkip = false; battleHooks(); }
  if (name === 'swap') swapHooks();
  if (name === 'auction') auctionHooks();
  if (name === 'upgrade') upgradeHooks();
  const dt = $('#dealTimer'); if (dt) countdown(dt, CFG.deals[0].ends, () => location.reload());
  const dcd = $('#dealerCd'); if (dcd) countdown(dcd, Number(dcd.dataset.t), () => render(false));
  const dc = $('#dailyCd'); if (dc) countdown(dc, Number(dc.dataset.t), () => render(false));
  fx($('#view'));
}
