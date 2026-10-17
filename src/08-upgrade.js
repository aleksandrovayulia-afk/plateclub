
/* ---------- upgrade: one plate → a chance at a rarer one; the wheel shows the server's roll ---------- */
const UP = { sel: null, sels: [], target: null, tier: '', plates: [], busy: false, angle: 0 };
const UPMAX = () => (CFG.upgrade.maxPlates || 1);
// the chosen plates: the most valuable one decides the region and the minimum target
function upPick() {
  UP.sels = UP.sels.filter(id => UP.plates.find(p => p.id === id));
  const ps = UP.sels.map(id => UP.plates.find(p => p.id === id)).sort((a, b) => b.value - a.value);
  UP.sel = ps[0] ? ps[0].id : null;
  return { main: ps[0] || null, extra: ps.slice(1).reduce((a, p) => a + p.value, 0), all: ps, top: ps.reduce((m, p) => Math.max(m, TI()[p.tier]), -1) };
}
const WR = 100, WC = 2 * Math.PI * WR;
// roulette wheel: the whole wheel spins under a fixed chrome pointer; green sector = your chance
function wheelSvg(chance) {
  const pockets = Array.from({ length: 36 }, (_, i) => { const a0 = (i * 10 - 90) * Math.PI / 180, a1 = ((i + 1) * 10 - 90) * Math.PI / 180, r0 = 112, r1 = 119; const P = (r, a) => `${(120 + r * Math.cos(a)).toFixed(2)} ${(120 + r * Math.sin(a)).toFixed(2)}`; return `<path d="M${P(r0, a0)} L${P(r1, a0)} A${r1} ${r1} 0 0 1 ${P(r1, a1)} L${P(r0, a1)} A${r0} ${r0} 0 0 0 ${P(r0, a0)}Z" fill="${i % 2 ? '#1b2131' : '#2a3246'}"/>`; }).join('');
  const ticks = Array.from({ length: 36 }, (_, i) => { const a = i * 10 * Math.PI / 180; return `<line x1="${120 + 89 * Math.sin(a)}" y1="${120 - 89 * Math.cos(a)}" x2="${120 + 111 * Math.sin(a)}" y2="${120 - 111 * Math.cos(a)}" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>`; }).join('');
  return `<svg viewBox="0 0 240 240" aria-hidden="true"><defs><linearGradient id="wg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#b8ffd9"/><stop offset="1" stop-color="#16b875"/></linearGradient><linearGradient id="wrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#9fd4ff"/><stop offset=".55" stop-color="#1f4f8f"/><stop offset=".8" stop-color="#8cc8ff"/><stop offset="1" stop-color="#eef8ff"/></linearGradient></defs>
    <circle cx="120" cy="120" r="119.5" fill="none" stroke="url(#wrim)" stroke-width="2"/>
    <g id="wRot" class="rot" style="transform:rotate(${UP.angle}deg)">${pockets}
      <circle cx="120" cy="120" r="${WR}" fill="none" stroke="#4a1626" stroke-width="22"/>
      <circle id="wArc" cx="120" cy="120" r="${WR}" fill="none" stroke="url(#wg)" stroke-width="22" stroke-dasharray="${WC * chance} ${WC}" transform="rotate(-90 120 120)" style="transition:stroke-dasharray 600ms var(--ease);filter:drop-shadow(0 0 8px rgba(61,220,151,.6))"/>
      ${ticks}</g>
    <circle cx="120" cy="120" r="64" fill="#0b0e15" stroke="url(#wrim)" stroke-width="1.5"/></svg>
    <svg class="wheel-ptr" id="wPtr" viewBox="0 0 30 38"><defs><linearGradient id="wpg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#8fd3ff"/><stop offset="1" stop-color="#2a6cc4"/></linearGradient></defs><path d="M2 2h26L15 36z" fill="url(#wpg)" stroke="#06142e" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
VIEWS.upgrade = async ({ query }) => {
  const [d, rec] = await Promise.all([GET('/api/collection'), GET('/api/upgrade/recent').catch(() => ({ upgrades: [] }))]); UP.plates = d.plates.filter(p => !p.listing).sort((a, b) => b.value - a.value);
  const want = query && query.get('p'); if (want && UP.plates.find(p => p.id === want)) UP.sels = [want];
  upPick(); if (!UP.sels.length && UP.plates.length) { const f = UP.plates.find(p => p.tier !== 'grail'); UP.sels = f ? [f.id] : []; }
  UP.angle = 0;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Апгрейд', 'Upgrade')}</p><h1 class="h1" style="margin-top:12px">${L('Рискни номером', 'Risk a plate')}</h1><p class="lede" style="margin-top:12px">${L('Выбери номер и цель. Зелёный сектор — твой шанс. Колесо остановится там, где решил сервер: попал в зелёное — получаешь номер выше, нет — номер сгорает.', 'Pick a plate and a target. The green sector is your chance. The wheel stops where the server decided: land in green and you get a rarer plate, otherwise the plate burns.')}</p></div></section>
  ${UP.plates.length ? `<div class="up-grid">
    <section class="up-col"><div class="row" style="justify-content:space-between"><h2 class="h3">${L('Твои номера', 'Your plates')} <span class="small" style="font-weight:600;opacity:.75">${L('выбери 1–2 — вместе шанс выше', 'pick 1–2 — together the chance is higher')}</span></h2><span class="small">${UP.plates.length}</span></div>
      <div class="row">${['', ...CFG.tiers.slice(0, 4).map(t => t.id)].map(t => `<button class="chip${t ? ' t-' + t : ''}" data-act="uptier" data-t="${t}" aria-pressed="${UP.tier === t}">${t ? `<i></i>${tierName(t)}` : L('Все', 'All')}</button>`).join('')}</div>
      <div class="up-list" id="upList"></div></section>
    <section class="up-col" style="justify-items:center;gap:18px">
      <div class="wheel" id="wheel">${wheelSvg(0)}<div class="wheel-c"><div><b id="wPct">—</b><span>${L('шанс', 'chance')}</span></div></div></div>
      <div class="up-slots" style="width:100%"><div class="up-slot" id="slotFrom"></div><span class="up-arrow">→</span><div class="up-slot" id="slotTo"></div></div>
      <button class="btn btn-chrome btn-xl" id="upBtn" data-act="upgo" disabled>${L('Улучшить', 'Upgrade')}</button><p class="small" style="margin:-8px 0 0;color:var(--err)">${L('При проигрыше выбранные номера сгорают', 'If you lose, the plate burns')}</p>
      <p class="small" style="text-align:center;margin:0">${L(`Шанс = ${CFG.upgrade.edge * 100}% × (оценка номеров / оценка цели), от ${CFG.upgrade.min * 100}% до ${CFG.upgrade.max * 100}%.`, `Chance = ${CFG.upgrade.edge * 100}% × (plate value / target value), from ${CFG.upgrade.min * 100}% to ${CFG.upgrade.max * 100}%.`)}</p></section>
    <section class="up-col"><h2 class="h3">${L('Цель', 'Target')}</h2><div class="up-col" id="upTargets"></div></section>
  </div>` : Empty(L('Нечего улучшать', 'Nothing to upgrade'), L('Откройте кейс, чтобы получить первый номер.', 'Open a case to get your first plate.'), `<a class="btn btn-chrome" href="#/cases">${L('К кейсам', 'To cases')}</a>`, { letters: 'ААА', digits: '000', region: '00' })}
  ${rec.upgrades.length ? `<section class="sec" style="padding-top:0">${SH(L('Последние апгрейды', 'Recent upgrades'))}<div class="panel" style="padding:8px">${rec.upgrades.map(g => `<div class="rk" style="grid-template-columns:auto 1fr auto"><span class="who">${Ava(g.nickname)}<span><b>${esc(g.nickname)}</b><br><span class="small">${tierName(g.from.tier)} → ${tierName(g.target)} · ${(g.chance * 100).toFixed(g.chance < 0.1 ? 1 : 0)}% · ${rel(g.at)}</span></span></span><span></span><span class="tag ${g.success ? 's-PAID' : 's-FAILED'}">${g.success ? L('успех', 'win') : L('сгорел', 'burned')}</span></div>`).join('')}</div></section>` : ''}<div style="height:60px"></div></div>`;
};
VIEWS.upgrade.auth = true;
function upPaint() {
  const list = $('#upList'); if (!list) return;
  const pk = upPick(); const sel = pk.main;
  list.innerHTML = UP.plates.filter(p => !UP.tier || p.tier === UP.tier).map(p => `<button class="up-item t-${p.tier}" data-act="upsel" data-id="${p.id}" aria-pressed="${UP.sels.includes(p.id)}">${Plate(p, { iri: false })}<span>${Rarity(p.tier)}<br><span class="small">${esc(regionLabel(p))}</span></span><span class="v">${fmt(p.value)}<br>PLT</span></button>`).join('') || `<p class="small">${L('Нет номеров этой редкости.', 'No plates of this rarity.')}</p>`;
  const ti = TI(); const cur = sel ? pk.top : 5;
  if (sel && (!UP.target || ti[UP.target] <= cur)) UP.target = CFG.tiers[Math.min(4, cur + 1)].id;
  if (sel && cur >= 4) UP.target = null;
  $('#upTargets').innerHTML = CFG.tiers.map(t => { const dis = !sel || ti[t.id] <= cur; const ch = sel && !dis ? upChance(sel, t.id, pk.extra) : 0; return `<button class="tgt t-${t.id}" data-act="uptgt" data-t="${t.id}" aria-pressed="${UP.target === t.id}" ${dis ? 'disabled' : ''}>${Rarity(t.id)}<span class="small">≈ ${sel && !dis ? fmt(targetValue(sel, t.id)) + ' PLT · ×' + (targetValue(sel, t.id) / sel.value).toFixed(1) : '—'}</span><span class="pct">${dis ? '—' : (ch * 100).toFixed(ch < 0.1 ? 1 : 0) + '%'}</span></button>`; }).join('');
  const ch = sel && UP.target ? upChance(sel, UP.target, pk.extra) : 0;
  $('#wArc').setAttribute('stroke-dasharray', `${WC * ch} ${WC}`);
  $('#wPct').textContent = sel && UP.target ? (ch * 100).toFixed(ch < 0.1 ? 1 : 0) + '%' : '—';
  $('#slotFrom').innerHTML = sel ? `${pk.all.map(p => Plate(p, { holo: true })).join('')}${pk.all.length > 1 ? `<span class="small">${L('2 номера вместе', '2 plates together')} · ${fmt(sel.value + pk.extra)} PLT</span>` : Rarity(sel.tier)}` : `<span class="small">${L('Выберите номер', 'Pick a plate')}</span>`;
  $('#slotTo').innerHTML = sel && UP.target ? `<span class="rl t-${UP.target}" style="font-size:15px"><i></i>${tierName(UP.target)}</span><span class="small">≈ ${fmt(targetValue(sel, UP.target))} PLT · ${esc(regionLabel(sel))}</span>` : `<span class="small">${sel && ti[sel.tier] >= 4 ? L('Грааль — уже максимум', 'Grail is already the top') : L('Выберите цель', 'Pick a target')}</span>`;
  $('#upBtn').disabled = !(sel && UP.target) || UP.busy;
  $('#wheel').classList.remove('win', 'lose');
}
function upgradeHooks() { upPaint(); }
function spinWheel(toDeg, D) {
  return new Promise(res => {
    const w = $('#wRot'), ptr = $('#wPtr'); const from = UP.angle; const t0 = performance.now(); let lastStep = Math.floor(from / 10);
    if (reduced() || !w) { UP.angle = toDeg; if (w) w.style.transform = `rotate(${toDeg}deg)`; return res(); }
    const over = 6; // overshoot a little and settle back, like a real wheel
    const ease = k => (k < 0.92 ? 1 - Math.pow(1 - k / 0.92, 4) : 1);
    const fr = now => {
      const el = now - t0, k = Math.min(1, el / D);
      let a; if (k < 0.92) a = from + (toDeg + over - from) * ease(k); else { const kk = (k - 0.92) / 0.08; a = toDeg + over * (1 - (1 - Math.pow(1 - kk, 3))); }
      w.style.transform = `rotate(${a}deg)`;
      const st = Math.floor(a / 10); if (st !== lastStep) { lastStep = st; sfx('tick', Math.max(0, 1 - k)); if (ptr) { ptr.style.transform = 'rotate(-14deg)'; setTimeout(() => { ptr.style.transform = ''; }, 60); } }
      if (k < 1) requestAnimationFrame(fr); else { UP.angle = toDeg; res(); }
    };
    requestAnimationFrame(fr);
  });
}
const UA = {};
UA.upsel = btn => {
  if (UP.busy) return; const id = btn.dataset.id;
  if (UP.sels.includes(id)) { if (UP.sels.length > 1) UP.sels = UP.sels.filter(x => x !== id); }
  else if (UP.sels.length < UPMAX()) UP.sels.push(id);
  else UP.sels = [UP.sels[0], id];
  sfx('click'); upPaint();
};
UA.uptgt = btn => { if (UP.busy) return; UP.target = btn.dataset.t; sfx('click'); upPaint(); };
UA.uptier = btn => { UP.tier = btn.dataset.t; $$('[data-act="uptier"]').forEach(b => b.setAttribute('aria-pressed', b === btn)); upPaint(); };
UA.upgo = async btn => {
  const pk = upPick(); const sel = pk.main; if (!sel || !UP.target || UP.busy) return;
  UP.busy = true; busy(btn, true, L('Крутим…', 'Spinning…')); $('#wheel').classList.remove('win', 'lose'); sfx('open');
  let r; try { r = await POST('/api/upgrade', { plateIds: pk.all.map(p => p.id), target: UP.target }, { key: rid() }); } catch (e) { toast(e.message, true); UP.busy = false; busy(btn, false); upPaint(); return; }
  // the pointer is at the top; the wheel stops so that the server's roll sits under it
  const base = UP.angle; const want = ((-r.roll * 360) % 360 + 360) % 360;
  let toDeg = Math.ceil((base + 360 * 6) / 360) * 360 + want; if (toDeg - base < 360 * 6) toDeg += 360;
  sfx('whoosh'); await spinWheel(toDeg, reduced() ? 0 : 6200);
  const wheel = $('#wheel'); if (!wheel) return;
  if (r.success) {
    wheel.classList.add('win'); sfx(r.plate.tier); confetti(wheel, getComputedStyle(document.documentElement).getPropertyValue('--c-' + r.plate.tier).trim(), 60);
    $('#slotTo').innerHTML = `${Plate(r.plate, { holo: true })}${Rarity(r.plate.tier)}`; $('#slotTo .plate').style.animation = 'pop 700ms var(--ease)';
    toast(L(`Успех! ${plateStr(r.plate)} в коллекции.`, `Success! ${plateStr(r.plate)} is in your collection.`));
  } else {
    wheel.classList.add('lose'); sfx('fail'); $$('#slotFrom .plate').forEach(x => x.classList.add('shatter'));
    toast(L('Не повезло — номер сгорел.', 'No luck — the plate burned.'), true);
  }
  await wait(reduced() ? 0 : 1600); if (!$('#wheel')) { UP.busy = false; refreshMe(); return; }
  try { const d = await GET('/api/collection'); UP.plates = d.plates.filter(p => !p.listing).sort((a, b) => b.value - a.value); } catch {}
  const firstUp = (UP.plates.find(p => p.tier !== 'grail') || {}).id || null;
  UP.sels = [r.success && r.plate.tier !== 'grail' ? r.plate.id : firstUp].filter(Boolean);
  UP.busy = false; refreshMe(); if (!$('#wheel')) return; busy(btn, false); upPaint();
  $('#wheel').classList.add(r.success ? 'win' : 'lose');
};
