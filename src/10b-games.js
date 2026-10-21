
/* ================= games: hub, case battle, collections, swaps, auction of the day ================= */
const GA = {};
const RU_PLURAL = (n, f) => pl(n, f, [f[0], f[2]]);
const miniPlateTxt = p => (p.country === 'BY' ? `${p.digits} ${p.letters}-${p.region}` : `${p.letters[0]}${p.digits}${p.letters.slice(1)} ${p.region}`);
const timerHtml = (id, ends) => `<div class="timer" id="${id}" data-t="${ends}" role="timer"><span>00</span><i>:</i><span>00</span><i>:</i><span>00</span></div>`;

/* ---------- hub ---------- */
VIEWS.games = async () => {
  const [b, a, s, sw] = await Promise.all([GET('/api/battles').catch(() => ({ open: [], done: [] })), GET('/api/auction').catch(() => ({ auction: null })), GET('/api/sets').catch(() => ({ sets: [] })), ME ? GET('/api/swaps').catch(() => null) : null]);
  const au = a.auction; const done = s.sets.filter(x => x.claimed).length;
  const pend = sw ? sw.incoming.filter(x => x.status === 'PENDING').length : 0;
  const card = (href, img, eyebrow, title, text, extra, cls = '') => `<a class="gcard rv ${cls}" href="${href}" style="--gimg:url(${IMG('head-' + img + '.jpg')})"><div class="gcard-bg"></div><div class="gcard-in"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="gtext">${text}</p>${extra || ''}</div><span class="gcard-go" aria-hidden="true">→</span></a>`;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игры', 'Games')}</p><h1 class="h1" style="margin-top:12px">${L('Во что сыграем?', 'What shall we play?')}</h1><p class="lede" style="margin-top:10px">${L('Баттлы, апгрейд, аукцион и коллекции — всё вокруг номеров.', 'Battles, upgrade, auction and collections — all about plates.')}</p></div></section>
    <div class="ggrid">
      ${card('#/battles', 5, L('Кейс-баттл', 'Case battle') + (b.open.length ? ` · <span class="live"></span>${b.open.length} ${L('ждут', 'open')}` : ''), L('Кто выбьет дороже?', 'Who pulls the priciest?'), L('2–4 игрока открывают одинаковые кейсы одновременно. Победитель забирает все номера.', '2–4 players open the same cases at once. The winner takes every plate.'), `<div class="gstat"><b>${b.open.length}</b><span>${L('открытых баттлов', 'open battles')}</span></div>`, 'big')}
      ${card('#/auction', 3, L('Аукцион дня', 'Auction of the day'), au ? esc(miniPlateTxt(au.plate)) : L('Номер дня', 'Plate of the day'), au ? L(`${tierName(au.plate.tier)} · оценка ${fmt(au.plate.value)} PLT. Ставка в последние 5 минут продлевает торги.`, `${tierName(au.plate.tier)} · value ${fmt(au.plate.value)} PLT. A bid in the last 5 minutes extends it.`) : L('Каждый день — один редкий номер.', 'One rare plate every day.'), au ? `<div class="gstat"><b>${fmt(au.topBid || au.start)}</b><span>${au.topBid ? L('текущая ставка', 'current bid') : L('стартовая цена', 'starting price')}</span></div>` : '')}
      ${card('#/sets', 1, L('Коллекции', 'Collections'), L(`${CFG.sets.length} сетов`, `${CFG.sets.length} sets`), L('Соберите регионы, узоры и редкие серии — получите PLT и значок в профиль.', 'Collect regions, patterns and rare series to earn PLT and a profile badge.'), `<div class="gstat"><b>${done}/${CFG.sets.length}</b><span>${L('собрано', 'completed')}</span></div>`)}
      ${card('#/upgrade', 6, L('Апгрейд', 'Upgrade'), L('Рискни ради редкости', 'Risk it for rarity'), L('Поставьте номер и попробуйте превратить его в редкий.', 'Stake a plate and try to turn it into a rarer one.'), '')}
      ${card('#/bonus', 1, L('Каждый день', 'Every day'), L('Колесо удачи', 'Wheel of fortune'), L('Один бесплатный спин в день: PLT или номер.', 'One free spin a day: PLT or a plate.'), '')}
    </div><div style="height:80px"></div></div>`;
};

/* ---------- case battle: lobby ---------- */
const BF = { caseId: 'B1', seats: 2, rounds: 1 };
const Seats = (b) => `<div class="bseats">${Array.from({ length: b.seats }, (_, i) => { const p = b.players.find(x => x.seat === i); return p ? `<span class="bava${p.bot ? ' bot' : ''}" title="${esc(p.nickname)}">${esc((p.nickname || '?').replace('Бот ', '')[0].toUpperCase())}</span>` : `<span class="bava free" title="${L('Свободно', 'Free')}">+</span>`; }).join('<i class="bvs">vs</i>')}</div>`;
const BattleRow = (b) => {
  const c = caseById(b.caseId); if (!c) return '';
  const mine = ME && b.players.some(p => p.userId === ME.id);
  const action = b.status === 'OPEN' ? (mine ? `<a class="btn btn-sm btn-ghost" href="#/battle/${b.id}">${L('Открыть', 'Open')}</a>` : `<button class="btn btn-sm btn-chrome" data-act="bjoin" data-id="${b.id}" data-cost="${b.price * b.rounds}">${L('Войти', 'Join')} · ${fmt(b.price * b.rounds)}</button>`) : `<a class="btn btn-sm btn-ghost" href="#/battle/${b.id}">${L('Смотреть', 'Watch')}</a>`;
  const win = b.status === 'DONE' ? b.players.find(p => p.seat === b.winnerSeat) : null;
  return `<div class="brow rv t-${c.rank}" style="--c:${c.color};--c2:${c.color2}"><a class="brow-case" href="#/battle/${b.id}"><span class="bglyph">${glyph(c)}</span><span><b>${esc(caseName(c))}</b><span class="small">${b.rounds} × ${fmt(b.price)} PLT · ${b.seats} ${L('игрока', 'players')}</span></span></a>
    ${Seats(b)}<div class="brow-pot"><span class="small">${win ? L('Победил', 'Winner') : L('Банк', 'Pot')}</span><b>${win ? esc(win.nickname) : fmt(b.price * b.rounds * b.seats)}</b>${win ? `<span class="small">${fmt(b.totalValue)} PLT</span>` : ''}</div>${action}</div>`;
};
VIEWS.battles = async () => {
  const d = await GET('/api/battles');
  const c = CFG.battleCases.find(x => x.id === BF.caseId) || CFG.battleCases[0]; BF.caseId = c.id;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игры', 'Games')} · <span class="live"></span>${d.open.length} ${L('открыто', 'open')}</p><h1 class="h1" style="margin-top:12px">${L('Кейс-баттл', 'Case battle')}</h1><p class="lede" style="margin-top:10px">${L('Все открывают один и тот же кейс одновременно. У кого сумма выпавших номеров больше — забирает все номера себе.', 'Everyone opens the same case at once. The highest total takes every plate.')}</p></div></section>
    <div class="bsteps rv"><div><b>1</b><span>${L('Выберите кейс, игроков и раунды', 'Pick a case, players and rounds')}</span></div><div><b>2</b><span>${L('Дождитесь соперников или позовите ботов', 'Wait for rivals or call bots')}</span></div><div><b>3</b><span>${L('Победитель забирает все номера', 'The winner takes every plate')}</span></div></div>
    <section class="bcreate panel" id="bcreate">
      <div class="bc-cases"><h2 class="h3" style="margin-bottom:14px">${L('Кейс для баттла', 'Battle case')}</h2>
        <div class="bc4" role="radiogroup" aria-label="${L('Кейс', 'Case')}">${CFG.battleCases.map((x, i) => `<button class="bc4-case t-${x.rank}${x.id === BF.caseId ? ' on' : ''}" role="radio" aria-checked="${x.id === BF.caseId}" data-act="bfcase" data-id="${x.id}" style="--c:${x.color};--c2:${x.color2}"><span class="bc4-bg"></span><span class="bc4-n">0${i + 1}</span><span class="bglyph lg">${glyph(x)}</span><b>${esc(caseName(x))}</b><span class="small">${esc(caseNote(x))}</span><span class="bc4-p mono">${fmt(x.price)} PLT</span></button>`).join('')}</div></div>
      <div class="bc-side"><div class="bc-sel" style="--c:${c.color};--c2:${c.color2}"><span class="bglyph lg">${glyph(c)}</span><div><p class="eyebrow">${rankName(c.rank)}</p><b>${esc(caseName(c))}</b><span class="small">${fmt(c.price)} PLT ${L('за раунд', 'per round')}</span></div><button class="btn-info-s" data-act="odds" data-case="${c.id}" aria-label="${L('Шансы', 'Odds')}">i</button></div>
        <div class="fld"><span class="lbl">${L('Игроков', 'Players')}</span><div class="seg wide" role="group">${CFG.battle.seats.map(n => `<button data-act="bfset" data-k="seats" data-v="${n}" aria-pressed="${BF.seats === n}">${n === 2 ? '1 vs 1' : n === 3 ? '1 vs 1 vs 1' : '1 × 4'}</button>`).join('')}</div></div>
        <div class="fld"><span class="lbl">${L('Раундов', 'Rounds')}</span><div class="seg wide" role="group">${[1, 2, 3, 4, 5].map(n => `<button data-act="bfset" data-k="rounds" data-v="${n}" aria-pressed="${BF.rounds === n}">${n}</button>`).join('')}</div></div>
        <dl class="kv"><dt>${L('Ваш вход', 'Your entry')}</dt><dd>${fmt(c.price * BF.rounds)} PLT</dd><dt>${L('Банк баттла', 'Battle pot')}</dt><dd>${fmt(c.price * BF.rounds * BF.seats)} PLT</dd><dt>${L('Номеров на кону', 'Plates at stake')}</dt><dd>${BF.rounds * BF.seats}</dd></dl>
        ${ME ? `<button class="btn btn-chrome btn-lg" data-act="bcreate" ${ME.balance < c.price * BF.rounds ? 'disabled' : ''}>${L('Создать баттл', 'Create battle')}</button>${ME.balance < c.price * BF.rounds ? `<span class="small">${L('Не хватает PLT.', 'Not enough PLT.')} <a class="btn-text" href="#/wallet">${L('Пополнить', 'Top up')}</a></span>` : ''}` : `<a class="btn btn-chrome btn-lg" href="#/login?next=%23%2Fbattles">${L('Войти, чтобы играть', 'Sign in to play')}</a>`}</div>
    </section>
    <section class="sec">${SH(L('Ждут соперников', 'Waiting for rivals'), L('Нажмите «Войти», чтобы занять свободное место. Баттл стартует, когда места закончатся.', 'Press Join to take a free seat. The battle starts when all seats are taken.'))}
      ${d.open.length ? `<div class="blist">${d.open.map(BattleRow).join('')}</div>` : Empty(L('Пока никого', 'Nobody yet'), L('Создайте первый баттл — соперники или боты подтянутся.', 'Create the first battle — rivals or bots will join.'))}</section>
    ${d.done.length ? `<section class="sec" style="padding-bottom:80px">${SH(L('Последние битвы', 'Recent battles'))}<div class="blist">${d.done.map(BattleRow).join('')}</div></section>` : '<div style="height:80px"></div>'}</div>`;
};

/* ---------- case battle: arena ---------- */
let BT_PLAY = null, btPoll = null, btSkip = false;
VIEWS.battle = async ({ arg }) => {
  const d = await GET('/api/battles/' + encodeURIComponent(arg)); const b = d.battle; const c = caseById(b.caseId) || { id: b.caseId, ru: b.caseId, name: b.caseId, color: '#8fd3ff', color2: '#1b3a8a', rank: 'common' };
  const me = ME && b.players.find(p => p.userId === ME.id); const creator = ME && b.creator === ME.nickname;
  const animate = b.status === 'DONE' && BT_PLAY === b.id; if (animate) BT_PLAY = null;
  const cols = Array.from({ length: b.seats }, (_, i) => {
    const p = b.players.find(x => x.seat === i); const won = b.status === 'DONE' && b.winnerSeat === i;
    const drops = d.drops.filter(x => x.seat === i);
    return `<div class="bcol${won && !animate ? ' win' : ''}${p ? '' : ' wait'}" data-seat="${i}">
      <div class="bcol-h">${p ? `<span class="bava lg${p.bot ? ' bot' : ''}">${esc((p.nickname || '?').replace('Бот ', '')[0].toUpperCase())}</span><div class="bname"><b>${p.bot ? esc(p.nickname.replace(/^Бот /, '')) : `<a href="#/u/${encodeURIComponent(p.nickname)}" style="color:inherit">${esc(p.nickname)}</a>`}</b><span class="small">${p.bot ? L('бот', 'bot') : me && me.seat === i ? L('это вы', 'you') : L('игрок', 'player')}</span></div>` : `<span class="bava lg free">?</span><div class="bname"><b>${L('Свободно', 'Free seat')}</b><span class="small">${L('ждём игрока…', 'waiting…')}</span></div>`}<span class="crown" aria-hidden="true">${IC.crown}</span></div>
      <div class="btotal"><span class="mono" data-total="${p ? p.total : 0}">${animate ? '0' : fmt(p ? p.total : 0)}</span><small>PLT</small></div>
      <div class="breel" aria-hidden="true"><div class="breel-in">${b.status === 'DONE' && !animate && drops.length ? cardHtml(drops[drops.length - 1].plate) : `<div class="breel-idle">${p ? (b.status === 'OPEN' ? L('готов', 'ready') : '') : '…'}</div>`}</div><span class="breel-mark l"></span><span class="breel-mark r"></span></div>
      <div class="bdrops">${animate ? '' : drops.map(x => `<a class="bdrop t-${x.plate.tier}" href="#/plate/${x.plate.id}">${Plate(x.plate, { iri: false })}<span class="mono">${fmt(x.value)}</span></a>`).join('')}</div></div>`;
  }).join('');
  const winner = b.status === 'DONE' ? b.players.find(p => p.seat === b.winnerSeat) : null;
  const res = winner ? `<div class="bresult${animate ? ' hide' : ''}" id="bres"><p class="eyebrow">${L('Итог', 'Result')}</p><h2 class="h2">${ME && winner.userId === ME.id ? L('Вы победили!', 'You won!') : esc(winner.nickname) + ' ' + L('побеждает', 'wins')}</h2><p class="lede">${L(`Забирает ${d.drops.length} номеров на ${fmt(b.totalValue)} PLT`, `Takes ${d.drops.length} plates worth ${fmt(b.totalValue)} PLT`)}</p><div class="row" style="justify-content:center">${ME ? `<button class="btn btn-chrome" data-act="bagain" data-case="${b.caseId}" data-seats="${b.seats}" data-rounds="${b.rounds}">${L('Ещё раз так же', 'Same again')}</button>` : ''}<a class="btn btn-ghost" href="#/battles">${L('Все баттлы', 'All battles')}</a>${!animate ? `<button class="btn btn-ghost" data-act="breplay" data-id="${b.id}">${L('Повтор', 'Replay')}</button>` : ''}</div></div>` : '';
  const ctrl = b.status === 'OPEN' ? `<div class="bctrl">${!me && ME ? `<button class="btn btn-chrome btn-lg" data-act="bjoin" data-id="${b.id}" data-cost="${b.price * b.rounds}">${L('Войти в баттл', 'Join battle')} · ${fmt(b.price * b.rounds)} PLT</button>` : ''}${!ME ? `<a class="btn btn-chrome btn-lg" href="#/login?next=${encodeURIComponent('#/battle/' + b.id)}">${L('Войти, чтобы играть', 'Sign in to play')}</a>` : ''}${creator ? `<button class="btn btn-chrome btn-lg" data-act="bbots" data-id="${b.id}">${L('Позвать ботов и начать', 'Call bots and start')}</button><button class="btn btn-ghost" data-act="bcancel" data-id="${b.id}">${L('Отменить и вернуть PLT', 'Cancel and refund')}</button>` : ''}<span class="small">${L('Отправьте ссылку на эту страницу другу — он сможет занять место.', 'Send this page’s link to a friend — they can take a seat.')}</span></div>` : '';
  return `<div class="wrap"><a class="back" href="#/battles">← ${L('Все баттлы', 'All battles')}</a>
    <section class="arena" id="arena" data-id="${b.id}" data-status="${b.status}" data-anim="${animate ? 1 : 0}" style="--c:${c.color};--c2:${c.color2};--n:${b.seats}">
      <div class="arena-top"><div class="row" style="gap:14px"><span class="bglyph lg">${glyph(c)}</span><div><p class="eyebrow">${L('Кейс-баттл', 'Case battle')} · ${b.id}</p><h1 class="h2" style="margin-top:4px">${esc(caseName(c))}</h1><p class="small" style="margin:2px 0 0">${b.rounds} ${L('раунд(а)', 'round(s)')} · ${L('вход', 'entry')} ${fmt(b.price * b.rounds)} PLT · ${L('банк', 'pot')} ${fmt(b.price * b.rounds * b.seats)} PLT</p></div></div>
        <div class="rounds" id="brounds">${Array.from({ length: b.rounds }, (_, i) => `<i class="${b.status === 'DONE' && !animate ? 'on' : ''}">${i + 1}</i>`).join('')}</div></div>
      <div class="bcols">${cols}</div>
      ${animate ? `<div class="row" style="justify-content:center;margin-top:18px"><button class="btn btn-sm btn-ghost" data-act="bskip">${L('Пропустить анимацию', 'Skip animation')}</button></div>` : ''}
      ${res}${ctrl}</section>
    <div style="height:70px"></div></div>`;
};
async function battleHooks() {
  clearInterval(btPoll); const ar = $('#arena'); if (!ar) return;
  if (ar.dataset.status === 'OPEN') { btPoll = setInterval(async () => { if (!document.body.contains(ar)) return clearInterval(btPoll); try { const d = await GET('/api/battles/' + ar.dataset.id); if (d.battle.status !== 'OPEN' || d.battle.players.length !== ar.querySelectorAll('.bcol:not(.wait)').length) { clearInterval(btPoll); if (d.battle.status === 'DONE') BT_PLAY = d.battle.id; render(false); } } catch {} }, 2500); return; }
  if (ar.dataset.anim === '1') playBattle(ar);
}
async function playBattle(ar) {
  const id = ar.dataset.id; let d; try { d = await GET('/api/battles/' + id); } catch { return; }
  const b = d.battle; const c = caseById(b.caseId); btSkip = reduced();
  const totals = Array(b.seats).fill(0); const dots = $$('#brounds i');
  const wait = ms => new Promise(r => setTimeout(r, btSkip ? 0 : ms));
  for (let r = 1; r <= b.rounds; r++) {
    if (!document.body.contains(ar)) return;
    dots.forEach((x, i) => x.classList.toggle('cur', i === r - 1));
    const round = d.drops.filter(x => x.round === r);
    const D = btSkip ? 0 : 3200;
    await Promise.all(round.map((x, k) => spinReel(ar.querySelector(`.bcol[data-seat="${x.seat}"] .breel-in`), c, x.plate, D, k * 140)));
    const best = Math.max(...round.map(x => x.value));
    for (const x of round) {
      const col = ar.querySelector(`.bcol[data-seat="${x.seat}"]`); if (!col) return;
      const t = col.querySelector('[data-total]'); rollNum(t, totals[x.seat], totals[x.seat] + x.value); totals[x.seat] += x.value;
      col.querySelector('.bdrops').insertAdjacentHTML('beforeend', `<a class="bdrop t-${x.plate.tier} pop" href="#/plate/${x.plate.id}">${Plate(x.plate, { iri: false })}<span class="mono">${fmt(x.value)}</span></a>`);
      if (x.value === best && !btSkip) { col.classList.add('flash'); setTimeout(() => col.classList.remove('flash'), 900); }
      if (['elite', 'grail', 'mythic'].includes(x.plate.tier) && !btSkip) sfx('grail'); else if (x.plate.tier === 'rare' && !btSkip) sfx('confirm');
    }
    dots[r - 1] && dots[r - 1].classList.add('on');
    await wait(r < b.rounds ? 1100 : 500);
  }
  dots.forEach(x => x.classList.remove('cur'));
  const wcol = ar.querySelector(`.bcol[data-seat="${b.winnerSeat}"]`); if (wcol) { wcol.classList.add('win'); confetti(wcol, b.players.find(p => p.seat === b.winnerSeat).userId === (ME && ME.id) ? 70 : 30); }
  ar.querySelectorAll('[data-total]').forEach(el => { el.textContent = fmt(Number(el.dataset.total)); });
  const res = $('#bres'); if (res) res.classList.remove('hide');
  const skipBtn = ar.querySelector('[data-act="bskip"]'); if (skipBtn) skipBtn.parentElement.remove();
  if (ME && b.players.some(p => p.userId === ME.id)) { sfx(b.players.find(p => p.seat === b.winnerSeat).userId === ME.id ? 'grail' : 'click'); await refreshMe(); chrome(); }
}
function spinReel(box, c, plate, D, delay) {
  return new Promise(res => {
    if (!box) return res();
    const N = 26, WIN = 22; box.style.transition = 'none'; box.style.transform = 'translate3d(0,0,0)';
    box.innerHTML = Array.from({ length: N }, (_, i) => cardHtml(i === WIN ? plate : visualPlate(c), false)).join('');
    const H = box.children[0].getBoundingClientRect().height + 8; const view = box.parentElement.clientHeight;
    const target = WIN * H - (view - (H - 8)) / 2 + (Math.random() - 0.5) * (H * 0.35);
    if (!D) { box.style.transform = `translate3d(0,${-(WIN * H - (view - (H - 8)) / 2)}px,0)`; return res(); }
    setTimeout(() => {
      void box.offsetHeight; box.style.transition = `transform ${D}ms cubic-bezier(.15,.65,.12,1)`; box.style.transform = `translate3d(0,${-target}px,0)`;
      let last = -1; const t0 = performance.now();
      const tick = () => { const el = performance.now() - t0; if (el > D || btSkip) return; const m = new DOMMatrixReadOnly(getComputedStyle(box).transform); const idx = Math.floor(-m.m42 / H); if (idx !== last) { if (last >= 0 && delay === 0) sfx('tick', 0.6); last = idx; } requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      const fin = () => { box.style.transition = `transform 380ms cubic-bezier(.3,.7,.2,1)`; box.style.transform = `translate3d(0,${-(WIN * H - (view - (H - 8)) / 2)}px,0)`; box.children[WIN] && box.children[WIN].classList.add('hit'); setTimeout(res, 380); };
      const check = setInterval(() => { if (btSkip) { clearInterval(check); box.style.transition = 'none'; fin(); } }, 60);
      setTimeout(() => { clearInterval(check); if (!btSkip) fin(); }, D + 20);
    }, delay);
  });
}
GA.bfcase = btn => { BF.caseId = btn.dataset.id; const y = window.scrollY; render(false).then(() => window.scrollTo(0, y)); };
GA.bfset = btn => { BF[btn.dataset.k] = Number(btn.dataset.v); const y = window.scrollY; render(false).then(() => window.scrollTo(0, y)); };
GA.bcreate = async btn => {
  const c = caseById(BF.caseId); busy(btn, true, '…');
  try { const r = await POST('/api/battles', { caseId: BF.caseId, seats: BF.seats, rounds: BF.rounds }, { key: 'bt-' + Date.now() }); sfx('confirm'); await refreshMe(); toast(L(`Баттл создан · −${fmt(c.price * BF.rounds)} PLT`, `Battle created · −${fmt(c.price * BF.rounds)} PLT`)); go('#/battle/' + r.id); }
  catch (e) { toast(e.message, true); busy(btn, false); }
};
GA.bagain = btn => { Object.assign(BF, { caseId: btn.dataset.case, seats: Number(btn.dataset.seats), rounds: Number(btn.dataset.rounds) }); go('#/battles'); setTimeout(() => { const b = $('#bcreate'); b && b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 400); };
GA.bjoin = async btn => {
  if (!ME) return go('#/login?next=' + encodeURIComponent(location.hash));
  const ok = await confirmDialog({ title: L('Войти в баттл', 'Join the battle'), rows: [[L('Вход', 'Entry'), fmt(Number(btn.dataset.cost)) + ' PLT', 1]], ok: L('Играть', 'Play') }); if (!ok) return;
  busy(btn, true, '…');
  try { await POST(`/api/battles/${btn.dataset.id}/join`, {}, { key: 'bj-' + btn.dataset.id + '-' + Date.now() }); await refreshMe(); chrome(); const d = await GET('/api/battles/' + btn.dataset.id); if (d.battle.status === 'DONE') BT_PLAY = d.battle.id; go('#/battle/' + btn.dataset.id); }
  catch (e) { toast(e.message, true); busy(btn, false); }
};
GA.bbots = async btn => { busy(btn, true, '…'); try { await POST(`/api/battles/${btn.dataset.id}/bots`, {}); BT_PLAY = btn.dataset.id; sfx('confirm'); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
GA.bcancel = async btn => { const ok = await confirmDialog({ title: L('Отменить баттл?', 'Cancel the battle?'), lede: L('Все участники получат PLT обратно.', 'Everyone gets their PLT back.'), ok: L('Отменить', 'Cancel'), danger: true }); if (!ok) return; try { await POST(`/api/battles/${btn.dataset.id}/cancel`, {}); await refreshMe(); toast(L('Баттл отменён, PLT возвращены', 'Battle cancelled, PLT refunded')); go('#/battles'); } catch (e) { toast(e.message, true); } };
GA.bskip = () => { btSkip = true; };
GA.breplay = btn => { BT_PLAY = btn.dataset.id; render(false); };

/* ---------- collections ---------- */
const SF = { f: 'all' };
VIEWS.sets = async () => {
  const d = await GET('/api/sets'); const S = Object.fromEntries(d.sets.map(s => [s.id, s]));
  let list = CFG.sets.map(s => ({ ...s, ...S[s.id] }));
  if (SF.f === 'near') list = list.filter(s => !s.claimed && s.have > 0); else if (SF.f === 'done') list = list.filter(s => s.claimed);
  list.sort((a, b) => (b.done && !b.claimed) - (a.done && !a.claimed) || a.claimed - b.claimed || b.have / b.need - a.have / a.need);
  const claimed = d.sets.filter(s => s.claimed).length; const earned = CFG.sets.filter(s => S[s.id] && S[s.id].claimed).reduce((a, s) => a + s.reward, 0); const ready = d.sets.filter(s => s.done && !s.claimed).length;
  const F = [['all', L('Все', 'All')], ['near', L('В процессе', 'In progress')], ['done', L('Собранные', 'Completed')]];
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игры', 'Games')}</p><h1 class="h1" style="margin-top:12px">${L('Коллекции', 'Collections')}</h1><p class="lede" style="margin-top:10px">${L('Всего восемь коллекций — и каждую соберут единицы. Закройте все ячейки сета, заберите большую награду и именной значок. Номера остаются у вас.', 'Only eight collections — and only a few will ever complete one. Fill every slot to take a big reward and a badge. You keep the plates.')}</p></div></section>
    <div class="stats s4"><div class="stat rv"><span>${L('Собрано', 'Completed')}</span><b>${claimed} / ${CFG.sets.length}</b></div><div class="stat rv"><span>${L('Можно забрать', 'Ready to claim')}</span><b class="${ready ? 'up' : ''}">${ready}</b></div><div class="stat rv"><span>${L('Получено наград', 'Rewards earned')}</span><b>${fmt(earned)}</b></div><div class="stat rv"><span>${L('Собрали все 8', 'Completed all 8')}</span><b>${L('пока никто', 'nobody yet')}</b></div></div>
    <div class="row" style="margin:22px 0 16px">${F.map(([k, t]) => `<button class="chip" data-act="sff" data-k="${k}" aria-pressed="${SF.f === k}">${t}</button>`).join('')}</div>
    <div class="sgrid">${list.map(SetCard).join('') || `<p class="small">${L('Здесь пока пусто.', 'Nothing here yet.')}</p>`}</div><div style="height:80px"></div></div>`;
};
function SetCard(s) {
  const pct = Math.round(s.have / s.need * 100); const many = s.need > 12;
  const slots = many ? '' : `<div class="sslots">${s.slots.map((sl, i) => { const f = s.filled && s.filled[i]; return f ? `<a class="sslot on t-${f.tier}" href="#/plate/${f.id}" title="${esc(L(sl.ru, sl.en))}"><span class="mono">${esc(miniPlateTxt(f))}</span></a>` : `<span class="sslot">${esc(L(sl.ru, sl.en))}</span>`; }).join('')}</div>`;
  return `<article class="scard rv${s.claimed ? ' claimed' : s.done ? ' ready' : ''}" style="--sc:${s.color}"><div class="scard-h"><span class="sbadge">${esc(s.badge)}</span><div><span class="sdiff" title="${L('Сложность', 'Difficulty')}">${'◆'.repeat(s.reward >= 25000 ? 5 : s.reward >= 15000 ? 4 : s.reward >= 10000 ? 3 : 2)}<i>${'◆'.repeat(5 - (s.reward >= 25000 ? 5 : s.reward >= 15000 ? 4 : s.reward >= 10000 ? 3 : 2))}</i></span><h3>${esc(L(s.ru, s.en))}</h3><span class="small">${s.need} ${pl(s.need, ['номер', 'номера', 'номеров'], ['plate', 'plates'])} · +${fmt(s.reward)} PLT</span></div></div>
    <div class="sprog"><span style="width:${pct}%"></span></div><div class="row" style="justify-content:space-between"><span class="mono small">${s.have} / ${s.need}</span>${s.claimed ? `<span class="tag s-SOLD">${L('Собрано', 'Completed')} ✓</span>` : s.done ? (ME ? `<button class="btn btn-sm btn-chrome" data-act="sclaim" data-id="${s.id}">${L('Забрать', 'Claim')} +${fmt(s.reward)}</button>` : '') : `<span class="small">${pct}%</span>`}</div>${slots}</article>`;
}
GA.sff = btn => { SF.f = btn.dataset.k; render(false); };
GA.sclaim = async btn => { busy(btn, true, '…'); try { const r = await POST(`/api/sets/${btn.dataset.id}/claim`, {}); sfx('coin'); confetti(btn, 40); toast(L(`Коллекция собрана · +${fmt(r.amount)} PLT`, `Collection complete · +${fmt(r.amount)} PLT`)); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };

/* ---------- swaps ---------- */
const SWT = { tab: 'in' };
VIEWS.swap = async ({ arg, query }) => {
  if (query && ME && String(query.get('to') || '').toLowerCase() === ME.nickname.toLowerCase()) { query.delete('to'); toast(L('Нельзя меняться с самим собой', 'You can’t swap with yourself'), true); }
  if (arg === 'new') return swapBuilder(query);
  const d = await GET('/api/swaps'); const list = SWT.tab === 'in' ? d.incoming : d.outgoing;
  const pin = d.incoming.filter(x => x.status === 'PENDING').length, pout = d.outgoing.filter(x => x.status === 'PENDING').length;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игры', 'Games')}</p><h1 class="h1" style="margin-top:12px">${L('Обмен номерами', 'Plate swaps')}</h1><p class="lede" style="margin-top:10px">${L('Предложите игроку свои номера и доплату в обмен на его номера. Без комиссии, всё сразу при согласии.', 'Offer your plates and PLT for another player’s plates. No fee, everything moves at once on accept.')}</p></div>
    <div class="row"><a class="btn btn-chrome" href="#/swap/new">${IC.swap}${L('Новый обмен', 'New swap')}</a></div></section>
    <div class="seg wide" role="tablist" style="max-width:420px;margin-bottom:18px"><button data-act="swtab" data-t="in" aria-pressed="${SWT.tab === 'in'}">${L('Входящие', 'Incoming')}${pin ? ` <i class="cnt">${pin}</i>` : ''}</button><button data-act="swtab" data-t="out" aria-pressed="${SWT.tab === 'out'}">${L('Исходящие', 'Outgoing')}${pout ? ` <i class="cnt" style="background:#4aa8ff">${pout}</i>` : ''}</button></div>
    ${list.length ? `<div class="swlist">${list.map(x => SwapCard(x, SWT.tab === 'in')).join('')}</div>` : Empty(SWT.tab === 'in' ? L('Предложений нет', 'No offers') : L('Вы ещё ничего не предлагали', 'You have not offered anything'), L('Найдите игрока в рейтинге или на рынке и предложите обмен.', 'Find a player in the ranking or on the market and offer a swap.'), `<a class="btn btn-chrome" href="#/swap/new">${L('Новый обмен', 'New swap')}</a>`)}
    <div style="height:80px"></div></div>`;
};
const ST_SW = () => ({ PENDING: L('Ожидает', 'Pending'), ACCEPTED: L('Принят', 'Accepted'), DECLINED: L('Отклонён', 'Declined'), CANCELLED: L('Отменён', 'Cancelled'), FAILED: L('Не состоялся', 'Failed') });
function SwapCard(x, incoming) {
  // always shown from the viewer's side: what you give / what you get
  const youGive = incoming ? { plates: x.want, plt: x.wantPlt } : { plates: x.give, plt: x.givePlt };
  const youGet = incoming ? { plates: x.give, plt: x.givePlt } : { plates: x.want, plt: x.wantPlt };
  const v = s => s.plates.reduce((a, p) => a + p.value, 0) + s.plt; const diff = v(youGet) - v(youGive);
  const side = (title, s) => `<div class="swside"><p class="eyebrow">${title}</p><div class="swplates">${s.plates.map(p => `<a href="#/plate/${p.id}" class="swp t-${p.tier}">${Plate(p, { iri: false })}<span class="small">${fmt(p.value)}</span></a>`).join('')}${s.plt ? `<span class="swplt">+${fmt(s.plt)} <small>PLT</small></span>` : ''}${!s.plates.length && !s.plt ? '<span class="small">—</span>' : ''}</div><span class="small">${L('Оценка', 'Value')}: ${fmt(v(s))} PLT</span></div>`;
  const st = ST_SW()[x.status];
  return `<article class="swcard rv${x.status === 'PENDING' ? ' pending' : ''}"><div class="swhead"><div class="row" style="gap:10px">${Ava(incoming ? x.from : x.to)}<div><b>${incoming ? L('От ', 'From ') : L('Для ', 'To ')}<a href="#/u/${esc(incoming ? x.from : x.to)}">${esc(incoming ? x.from : x.to)}</a></b><span class="small" style="display:block">${rel(x.created)} · ${x.id}</span></div></div><span class="tag s-${x.status === 'PENDING' ? 'ACTIVE' : x.status === 'ACCEPTED' ? 'SOLD' : 'CANCELLED'}">${st}</span></div>
    ${x.message ? `<p class="swmsg">“${esc(x.message)}”</p>` : ''}
    <div class="swbody">${side(L('Вы отдаёте', 'You give'), youGive)}<span class="swarrow" aria-hidden="true">${IC.swap}</span>${side(L('Вы получаете', 'You get'), youGet)}</div>
    <div class="swfoot"><span class="${diff >= 0 ? 'up' : 'down'} mono">${L('По оценке', 'By value')}: ${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))} PLT</span>${x.note ? `<span class="small">${esc(srv(x.note))}</span>` : ''}
      ${x.status === 'PENDING' ? (incoming ? `<span class="row"><button class="btn btn-sm btn-ghost" data-act="swdo" data-a="decline" data-id="${x.id}">${L('Отклонить', 'Decline')}</button><button class="btn btn-sm btn-chrome" data-act="swdo" data-a="accept" data-id="${x.id}">${L('Принять обмен', 'Accept swap')}</button></span>` : `<button class="btn btn-sm btn-ghost" data-act="swdo" data-a="cancel" data-id="${x.id}">${L('Отозвать', 'Withdraw')}</button>`) : ''}</div></article>`;
}
const SWB = { to: '', give: new Set(), want: new Set(), givePlt: 0, wantPlt: 0 };
async function swapBuilder(query) {
  if (!ME) return VIEWS.login({ next: location.hash, query: new URLSearchParams() });
  const to = (query && query.get('to')) || SWB.to; if (to !== SWB.to) { SWB.to = to; SWB.give = new Set(); SWB.want = new Set(); SWB.givePlt = 0; SWB.wantPlt = 0; }
  const wantId = query && query.get('want'); if (wantId) SWB.want.add(wantId);
  const w = query && query.get('want'); if (w) SWB.want.add(w);
  const mine = (await GET('/api/collection')).plates.filter(p => p.status === 'OWNED');
  let theirs = null, err = '';
  if (SWB.to) { try { theirs = await GET('/api/users/' + encodeURIComponent(SWB.to) + '/plates'); } catch (e) { err = e.message; } }
  const rk = theirs ? null : await GET('/api/rankings').catch(() => ({ rankings: [] }));
  const pick = (p, set, side) => `<button class="swpick t-${p.tier}${set.has(p.id) ? ' on' : ''}" data-act="swpick" data-side="${side}" data-id="${p.id}" aria-pressed="${set.has(p.id)}">${Plate(p, { iri: false })}<span class="small">${tierName(p.tier)} · ${fmt(p.value)}</span><i class="chk" aria-hidden="true">✓</i></button>`;
  const vGive = mine.filter(p => SWB.give.has(p.id)).reduce((a, p) => a + p.value, 0) + SWB.givePlt;
  const vGet = theirs ? theirs.plates.filter(p => SWB.want.has(p.id)).reduce((a, p) => a + p.value, 0) + SWB.wantPlt : 0;
  return `<div class="wrap"><a class="back" href="#/swap">← ${L('Мои обмены', 'My swaps')}</a><section class="page-head" style="min-height:0"><div><p class="eyebrow">${L('Обмен', 'Swap')}</p><h1 class="h2" style="margin-top:8px">${L('Новое предложение', 'New offer')}</h1></div></section>
    <form class="panel swto" id="swTo"><label for="swnick">${L('С кем меняемся?', 'Who are you trading with?')}</label><div class="row" style="flex-wrap:nowrap;gap:10px"><input class="field" id="swnick" list="swnicks" value="${esc(SWB.to)}" placeholder="${L('Ник игрока', 'Player nickname')}" autocomplete="off" style="text-transform:none"><datalist id="swnicks">${rk ? rk.rankings.filter(r => r.nickname !== ME.nickname).map(r => `<option value="${esc(r.nickname)}">`).join('') : ''}</datalist><button class="btn btn-chrome" type="submit">${L('Выбрать', 'Select')}</button></div>${err ? `<p class="err">${esc(err)}</p>` : ''}</form>
    ${theirs ? `<div class="swbuild">
      <section class="panel"><div class="row" style="justify-content:space-between"><h2 class="h3">${L('Вы отдаёте', 'You give')}</h2><span class="small">${SWB.give.size}/6</span></div>
        <div class="swpicks">${mine.length ? mine.map(p => pick(p, SWB.give, 'give')).join('') : `<p class="small">${L('У вас нет свободных номеров.', 'You have no free plates.')}</p>`}</div>
        <div class="fld"><label for="swgp">${L('Доплата от вас, PLT', 'Your PLT on top')}</label><input class="field mono" id="swgp" type="number" min="0" value="${SWB.givePlt || ''}" placeholder="0" data-k="givePlt"></div></section>
      <section class="panel"><div class="row" style="justify-content:space-between"><h2 class="h3">${L('Вы получаете от', 'You get from')} ${esc(theirs.nickname)}</h2><span class="small">${SWB.want.size}/6</span></div>
        <div class="swpicks">${theirs.plates.length ? theirs.plates.map(p => pick(p, SWB.want, 'want')).join('') : `<p class="small">${L('У игрока нет свободных номеров — можно предложить купить за PLT позже.', 'This player has no free plates.')}</p>`}</div>
        <div class="fld"><label for="swwp">${L('Доплата от игрока, PLT', 'Their PLT on top')}</label><input class="field mono" id="swwp" type="number" min="0" value="${SWB.wantPlt || ''}" placeholder="0" data-k="wantPlt"></div></section></div>
      <div class="swsum panel"><div class="swsum-v"><span>${L('Отдаёте', 'Give')} <b class="mono">${fmt(vGive)}</b></span><span>${L('Получаете', 'Get')} <b class="mono">${fmt(vGet)}</b></span><span class="${vGet - vGive >= 0 ? 'up' : 'down'}">${L('Разница', 'Difference')} <b class="mono">${vGet - vGive >= 0 ? '+' : '−'}${fmt(Math.abs(vGet - vGive))}</b></span></div>
        <input class="field" id="swmsg" maxlength="200" placeholder="${L('Сообщение (необязательно)', 'Message (optional)')}"><button class="btn btn-chrome btn-lg" data-act="swsend">${L('Отправить предложение', 'Send offer')}</button></div>` : ''}
    <div style="height:80px"></div></div>`;
}
function swapHooks() {
  const f = $('#swTo'); f && f.addEventListener('submit', e => { e.preventDefault(); SWB.to = $('#swnick').value.trim(); go('#/swap/new?to=' + encodeURIComponent(SWB.to)); });
  $$('#swgp,#swwp').forEach(i => i.addEventListener('change', () => { SWB[i.dataset.k] = Math.max(0, Math.round(+i.value || 0)); render(false); }));
}
GA.swtab = btn => { SWT.tab = btn.dataset.t; render(false); };
GA.swpick = btn => { const set = btn.dataset.side === 'give' ? SWB.give : SWB.want; if (set.has(btn.dataset.id)) set.delete(btn.dataset.id); else { if (set.size >= 6) return toast(L('Не больше 6 номеров с каждой стороны.', 'Up to 6 plates per side.'), true); set.add(btn.dataset.id); } const y = window.scrollY; render(false).then(() => window.scrollTo(0, y)); };
GA.swsend = async btn => { busy(btn, true, '…'); try { await POST('/api/swaps', { to: SWB.to, give: [...SWB.give], want: [...SWB.want], givePlt: SWB.givePlt, wantPlt: SWB.wantPlt, message: $('#swmsg').value }); toast(L('Предложение отправлено', 'Offer sent')); SWB.give = new Set(); SWB.want = new Set(); SWB.givePlt = SWB.wantPlt = 0; SWT.tab = 'out'; go('#/swap'); } catch (e) { toast(e.message, true); busy(btn, false); } };
GA.swdo = async btn => {
  const a = btn.dataset.a;
  if (a === 'accept') { const ok = await confirmDialog({ title: L('Принять обмен?', 'Accept the swap?'), lede: L('Номера и PLT переместятся сразу.', 'Plates and PLT move immediately.'), ok: L('Принять', 'Accept') }); if (!ok) return; }
  busy(btn, true, '…');
  try { await POST(`/api/swaps/${btn.dataset.id}/${a}`, {}); if (a === 'accept') { sfx('coin'); toast(L('Обмен состоялся', 'Swap done')); } else toast('OK'); await refreshMe(); chrome(); render(false); }
  catch (e) { toast(e.message, true); render(false); }
};

/* ---------- auction of the day ---------- */
VIEWS.auction = async () => {
  const d = await GET('/api/auction'); const a = d.auction;
  if (!a) return `<div class="wrap" style="padding-block:60px">${Empty(L('Аукцион скоро начнётся', 'The auction starts soon'), L('Новый номер выставляется каждый день в 03:00 по Москве.', 'A new plate is listed every day at 03:00 Moscow time.'))}</div>`;
  const p = a.plate; const quick = [...new Set([a.min, a.min + a.step * 2, Math.max(a.min + a.step * 3, Math.round(a.min * 1.25 / 10) * 10)])].sort((x, y) => x - y);
  return `<div class="wrap"><section class="auc t-${p.tier}">
      <div class="auc-show"><p class="eyebrow">${L('Аукцион дня', 'Auction of the day')} · ${Rarity(p.tier)}</p><div class="auc-plate" id="aucPlate">${Plate(p, { holo: true })}</div>
        <div class="pc-tags" style="justify-content:center">${Perks(p)}${Copy(p)}</div><p class="small" style="text-align:center;margin:0">${esc(regionLabel(p))} · ${L('оценка', 'value')} ${fmt(p.value)} PLT · <a href="#/plate/${p.id}">${p.id}</a></p></div>
      <div class="auc-bid panel"><div class="row" style="justify-content:space-between"><span class="eyebrow">${a.topBid ? L('Текущая ставка', 'Current bid') : L('Стартовая цена', 'Starting price')}</span><span class="small">${a.bids} ${pl(a.bids, ['ставка', 'ставки', 'ставок'], ['bid', 'bids'])}</span></div>
        <p class="auc-price chrome-t">${fmt(a.topBid || a.start)}<small>PLT</small></p>
        <p class="small" style="margin:0">${a.topUser ? (a.mine ? `<b class="up">${L('Вы лидируете', 'You are leading')}</b>` : L('Лидер', 'Leader') + `: <a href="#/u/${esc(a.topUser)}">${esc(a.topUser)}</a>`) : L('Ставок ещё нет — будьте первым.', 'No bids yet — be the first.')}</p>
        <div class="auc-timer"><span class="small">${L('До конца', 'Ends in')}</span>${timerHtml('aucTimer', a.ends)}</div>
        ${ME ? `<form id="bidForm" class="auc-form"><div class="row" style="gap:6px">${quick.map(v => `<button type="button" class="chip" data-act="aquick" data-v="${v}">${fmt(v)}</button>`).join('')}</div><div class="row" style="flex-wrap:nowrap;gap:10px"><input class="field mono" id="bidAmt" type="number" min="${a.min}" step="1" value="${a.min}" aria-label="${L('Ставка', 'Bid')}"><button class="btn btn-chrome btn-lg" type="submit">${L('Сделать ставку', 'Place bid')}</button></div><p class="err" id="biderr" hidden></p></form>` : `<a class="btn btn-chrome btn-lg" href="#/login?next=%23%2Fauction">${L('Войти, чтобы участвовать', 'Sign in to bid')}</a>`}
        <ul class="auc-rules small"><li>${L(`Минимальная ставка — ${fmt(a.min)} PLT, шаг ${fmt(a.step)} PLT.`, `Minimum bid ${fmt(a.min)} PLT, step ${fmt(a.step)} PLT.`)}</li><li>${L('PLT замораживаются при ставке и сразу возвращаются, если вас перебили.', 'PLT are held when you bid and returned at once if you are outbid.')}</li><li>${L('Ставка в последние 5 минут продлевает аукцион на 5 минут.', 'A bid in the last 5 minutes adds 5 minutes.')}</li></ul></div></section>
    <div class="split" style="padding-block:30px 80px"><div class="panel">${SH(L('История ставок', 'Bid history'))}${a.history.length ? a.history.map((h, i) => `<div class="tx"><span class="lbl">${i === 0 ? '👑 ' : ''}${esc(h.nickname)}</span><span class="when">${rel(h.at)}</span><span class="amt">${fmt(h.amount)}</span></div>`).join('') : `<p class="small">${L('Пока пусто.', 'Empty for now.')}</p>`}</div>
      <div class="panel">${SH(L('Прошлые аукционы', 'Past auctions'))}${d.past.length ? d.past.map(x => `<div class="tx"><span class="lbl"><a href="#/plate/${x.plate.id}">${esc(miniPlateTxt(x.plate))}</a> · ${tierName(x.plate.tier)}</span><span class="when">${x.topUser ? esc(x.topUser) : L('без ставок', 'no bids')}</span><span class="amt">${x.topBid ? fmt(x.topBid) : '—'}</span></div>`).join('') : `<p class="small">${L('Это первый аукцион.', 'This is the first auction.')}</p>`}</div></div></div>`;
};
function auctionHooks() {
  const t = $('#aucTimer'); if (t) countdown(t, Number(t.dataset.t), () => setTimeout(() => render(false), 1500));
  const f = $('#bidForm'); f && f.addEventListener('submit', async e => {
    e.preventDefault(); const b = f.querySelector('[type=submit]'); const amt = Math.round(+$('#bidAmt').value);
    const ok = await confirmDialog({ title: L('Сделать ставку', 'Place a bid'), rows: [[L('Ставка', 'Bid'), fmt(amt) + ' PLT', 1]], lede: L('PLT спишутся сейчас и вернутся, если вашу ставку перебьют.', 'PLT are taken now and returned if you are outbid.'), ok: L('Поставить', 'Bid') }); if (!ok) return;
    busy(b, true, '…');
    try { await POST('/api/auction/bid', { amount: amt }, { key: 'au-' + Date.now() }); sfx('coin'); toast(L('Ставка принята — вы лидируете', 'Bid placed — you are leading')); await refreshMe(); chrome(); render(false); }
    catch (x) { $('#biderr').hidden = false; $('#biderr').textContent = x.message; busy(b, false); }
  });
  if ($('.auc')) { clearInterval(btPoll); const day = $('#aucTimer') && $('#aucTimer').dataset.t; btPoll = setInterval(async () => { if (!$('.auc')) return clearInterval(btPoll); if (document.visibilityState !== 'visible' || dlg.open || (document.activeElement && document.activeElement.id === 'bidAmt')) return; try { const d = await GET('/api/auction'); if (d.auction && (String(d.auction.ends) !== day || d.auction.bids !== Number(($('.auc-bid .small') || {}).textContent?.match(/\d+/)?.[0]))) render(false); } catch {} }, 8000); }
}
GA.aquick = btn => { const i = $('#bidAmt'); i.value = btn.dataset.v; i.focus(); };

/* ---------- game: higher or lower ---------- */
let HL = null;
const HLStep = (steps, step) => `<div class="hl-steps">${steps.map((v, i) => `<span class="${i < step ? 'ok' : i === step ? 'now' : ''}">${fmt(steps.slice(0, i + 1).reduce((a, b) => a + b, 0))}</span>`).join('')}</div>`;
function hlCard(p, hidden) {
  if (hidden) return `<div class="hl-card hidden"><div class="hl-q">?</div><span class="small">${L('Следующий номер', 'Next plate')}</span></div>`;
  return `<div class="hl-card t-${p.tier}">${Plate(p, { holo: true })}${Rarity(p.tier)}<div class="pc-tags" style="justify-content:center">${Perks(p)}</div><div class="hl-v"><b>${fmt(p.value)}</b> PLT</div><span class="small">${esc(regionLabel(p))}</span></div>`;
}
function hlBody() {
  const d = HL; const r = d.run;
  if (!r) return `<div class="hl-start panel"><p class="lede" style="margin:0">${L('Показываем номер и его оценку. Угадай, будет ли следующий номер <b>дороже</b> или <b>дешевле</b>. Каждый верный ответ добавляет PLT в банк. Ошибся — банк сгорает. Можно забрать банк в любой момент.', 'We show a plate and its value. Guess if the next one is <b>higher</b> or <b>lower</b>. Each correct guess adds PLT to the bank. Miss — the bank is lost. You can cash out any time.')}</p>
    ${HLStep(d.steps, 0)}<div class="row" style="justify-content:center"><button class="btn btn-chrome btn-xl" data-act="hlstart" ${d.left ? '' : 'disabled'}>${d.left ? L('Играть', 'Play') : L('Игры на сегодня закончились', 'No games left today')}</button></div>
    <p class="small" style="text-align:center;margin:0">${L(`Осталось игр сегодня: ${d.left} из ${d.perDay}. Бесплатно.`, `Games left today: ${d.left} of ${d.perDay}. Free.`)}</p></div>`;
  return `<div class="hl-board">${HLStep(d.steps, r.step)}
    <div class="hl-arena">${hlCard(r.cur)}<div class="hl-vs">VS</div>${hlCard(null, true)}</div>
    <div class="hl-acts"><button class="btn btn-xl hl-up" data-act="hlguess" data-dir="up">▲ ${L('Дороже', 'Higher')}</button><button class="btn btn-xl hl-down" data-act="hlguess" data-dir="down">▼ ${L('Дешевле', 'Lower')}</button></div>
    <div class="hl-bank"><span>${L('Банк', 'Bank')}: <b class="up">${fmt(r.bank)} PLT</b> · ${L('следующий верный ответ', 'next correct guess')} +${fmt(r.next)}</span>${r.bank ? `<button class="btn btn-chrome" data-act="hlcash">${L('Забрать', 'Cash out')} ${fmt(r.bank)} PLT</button>` : ''}</div></div>`;
}
VIEWS.hilo = async () => {
  HL = await GET('/api/hilo');
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игра', 'Game')} · ${L('бесплатно', 'free')}</p><h1 class="h1" style="margin-top:12px">${L('Дороже или дешевле?', 'Higher or lower?')}</h1><p class="lede" style="margin-top:10px">${L('Красивые номера стоят дороже: блатные буквы, семёрки, низкие номера. Чем лучше знаешь цены — тем больше выиграешь.', 'Beautiful plates cost more: VIP letters, sevens, low numbers. The better you know prices, the more you win.')}</p></div></section>
    <div id="hlBox">${hlBody()}</div>
    ${HL.best.length ? `<section class="sec" style="padding-bottom:80px">${SH(L('Лучшие за неделю', 'Best this week'))}<div class="panel" style="padding:8px">${HL.best.map((b, i) => `<a class="rk" href="#/u/${encodeURIComponent(b.nickname)}" style="text-decoration:none"><span class="n">${i + 1}</span><span class="who"><b>${esc(b.nickname)}</b></span><span class="mono">${b.step}/10 · ${fmt(b.bank)} PLT</span></a>`).join('')}</div></section>` : '<div style="height:80px"></div>'}</div>`;
};
VIEWS.hilo.auth = true;
const hlPaint = () => { const b = $('#hlBox'); if (b) b.innerHTML = hlBody(); };
GA.hlstart = async btn => { busy(btn, true, '…'); try { HL.run = await POST('/api/hilo/start', {}); HL.left = Math.max(0, HL.left - 1); sfx('open'); hlPaint(); } catch (e) { toast(e.message, true); busy(btn, false); } };
GA.hlguess = async btn => {
  if (HL.busy) return; HL.busy = true; $$('[data-act="hlguess"]').forEach(b => b.disabled = true); sfx('click');
  let r; try { r = await POST(`/api/hilo/${HL.run.id}/guess`, { dir: btn.dataset.dir }); } catch (e) { toast(e.message, true); HL.busy = false; hlPaint(); return; }
  // reveal the next plate in the right slot first
  const slot = $$('.hl-arena .hl-card')[1]; if (slot) { slot.outerHTML = hlCard(r.cur).replace('class="hl-card', `class="hl-card reveal ${r.win ? 'win' : 'lose'}`); }
  sfx(r.win ? 'coin' : 'fail'); await wait(reduced() ? 300 : 1300);
  HL.busy = false;
  if (!r.win) { toast(L(`Мимо! ${r.lost ? `Банк ${fmt(r.lost)} PLT сгорел.` : ''}`, `Missed! ${r.lost ? `The ${fmt(r.lost)} PLT bank is gone.` : ''}`), true); HL.run = null; hlPaint(); return; }
  if (r.status === 'DONE') { confetti($('#hlBox'), '#FFD25E', 80); toast(L(`10 из 10! +${fmt(r.bank)} PLT`, `10 of 10! +${fmt(r.bank)} PLT`)); HL.run = null; await refreshMe(); hlPaint(); return; }
  HL.run = r; hlPaint();
};
GA.hlcash = async btn => { busy(btn, true, '…'); try { const r = await POST(`/api/hilo/${HL.run.id}/cash`, {}); coins(btn, 18); sfx('coin'); toast(`+${fmt(r.amount)} PLT`); HL.run = null; await refreshMe(); hlPaint(); } catch (e) { toast(e.message, true); busy(btn, false); } };

VIEWS.swap.auth = true;

// «Дороже или дешевле» is retired: old links lead to the games hub
VIEWS.hilo = async () => { setTimeout(() => { if (parseRoute().name === 'hilo') location.replace('#/games'); }, 0); return ''; };
