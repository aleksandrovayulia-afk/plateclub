
/* ---------- roulette: a readable Standoff-style strip that slows down and stops on the server's plate ---------- */
// decorative strip cards follow the same pattern rules as the server, so a "rare" card looks rare
const VPATS = { common: ['random'], fine: ['seq', 'pair'], rare: ['mirror', 'round'], elite: ['triple', 'zero', 'letters'], grail: ['full', 'zerofull'] };
function vDigits(k, n) {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); const d = ri(1, 9); let e; do e = ri(0, 9); while (e === d);
  if (k === 'triple' || k === 'full') return String(d).repeat(n);
  if (k === 'zero' || k === 'zerofull') return '0'.repeat(n - 1) + d;
  if (k === 'mirror') return n === 3 ? `${d}${e}${d}` : `${d}${e}${e}${d}`;
  if (k === 'round') return d + '0'.repeat(n - 1);
  if (k === 'seq') { const s = ri(1, 10 - n); return Array.from({ length: n }, (_, i) => s + i).join(''); }
  if (k === 'pair') return n === 3 ? `${d}${d}${e}` : `${d}${d}${e}${e}`;
  let x; do x = String(ri(1, n === 3 ? 999 : 9999)).padStart(n, '0'); while (/^(\d)\1+$/.test(x)); return x;
}
function visualPlate(c) {
  const x = Math.random() * c.odds.reduce((a, b) => a + b, 0); let acc = 0, i = 0; for (; i < c.odds.length; i++) { acc += c.odds[i]; if (x < acc) break; }
  const tier = CFG.tiers[Math.min(i, 4)].id; const by = c.pool.BY.length && (!c.pool.RU.length || Math.random() < 0.5);
  const pick = s => s[Math.floor(Math.random() * s.length)];
  const pat = (c.focus && c.focus[tier]) || pick(VPATS[tier]); const same = ['letters', 'full', 'zerofull'].includes(pat);
  const L2 = by ? CFG.byLetters : CFG.letters, n = by ? 2 : 3; const l0 = pick(L2);
  const letters = same ? l0.repeat(n) : Array.from({ length: n }, () => pick(L2)).join('');
  return { country: by ? 'BY' : 'RU', letters, digits: vDigits(pat === 'letters' ? 'random' : pat, by ? 4 : 3), region: pick(by ? c.pool.BY : c.pool.RU), tier, pattern: pat };
}
const cardHtml = (p, win) => `<div class="card t-${p.tier}"${win ? ' id="win"' : ''} aria-hidden="true">${Plate(p)}${Rarity(p.tier)}</div>`;
function bezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx, cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => { let t = x; for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; } return sy(Math.min(1, Math.max(0, t))); };
}
// gentle start, long smooth deceleration — about 10 cards per second at the top speed
const EASE = bezier(0.3, 0.55, 0.12, 1);
let rollState = null;
function rollAbort() { if (rollState) { cancelAnimationFrame(rollState.raf); rollState = null; } }
function roll(root, c, plate) {
  return new Promise(res => {
    const spin = root.querySelector('.spin'), box = spin.querySelector('.spin-in'), track = spin.querySelector('.track'); const N = 48, WIN = 40;
    spin.classList.remove('done'); spin.style.removeProperty('--tc');
    track.style.transform = 'translate3d(0,0,0)';
    track.innerHTML = Array.from({ length: N }, (_, i) => cardHtml(i === WIN ? plate : visualPlate(c), i === WIN)).join('');
    const W = track.children[0].getBoundingClientRect().width + 10, center = box.clientWidth / 2;
    const target = WIN * W + (W - 10) / 2 - center + (Math.random() - 0.5) * (W - 36) * 0.8;
    const over = Math.min(14, W * 0.08);
    const D = reduced() ? 0 : 7600, SETTLE = 520; const t0 = performance.now();
    let lastIdx = -1, lastX = 0, skipFrom = null;
    const setX = x => { track.style.transform = `translate3d(${-x}px,0,0)`; };
    const done = () => { if (!rollState) return; rollState = null; setX(target); res(); };
    const frame = now => {
      if (!rollState) return; let x;
      if (skipFrom) { const k = Math.min(1, (now - skipFrom.t) / 300); x = skipFrom.x + (target - skipFrom.x) * (1 - Math.pow(1 - k, 3)); if (k >= 1) return done(); }
      else { const el = now - t0; if (el < D) x = (target + over) * EASE(el / D); else if (el < D + SETTLE) { const k = (el - D) / SETTLE; x = target + over * Math.pow(1 - k, 3); } else return done(); }
      setX(x);
      const v = Math.abs(x - lastX);
      const idx = Math.floor((x + center) / W); if (idx !== lastIdx) { if (lastIdx >= 0) sfx('tick', Math.min(1, v / 30)); lastIdx = idx; }
      lastX = x; rollState.raf = requestAnimationFrame(frame);
    };
    rollState = { raf: 0, skip: () => { if (!skipFrom) skipFrom = { t: performance.now(), x: lastX }; } };
    if (!D) { setX(target); rollState = null; return setTimeout(res, 30); }
    rollState.raf = requestAnimationFrame(frame);
  });
}
const PARTS = { common: 0, fine: 14, rare: 28, elite: 44, grail: 70 };
function celebrate(root, p) {
  const spin = root.querySelector('.spin'); const col = getComputedStyle(document.documentElement).getPropertyValue('--c-' + p.tier).trim();
  spin.style.setProperty('--tc', col); spin.classList.add('done'); root.querySelector('#win')?.classList.add('win'); sfx(p.tier);
  if (reduced()) return;
  const n = PARTS[p.tier]; const box = spin.querySelector('.spin-in');
  for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = 'particle'; const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 260; s.style.setProperty('--dx', Math.cos(a) * r + 'px'); s.style.setProperty('--dy', Math.sin(a) * r * 0.6 + 'px'); s.style.setProperty('--rot', Math.random() * 720 + 'deg'); s.style.background = i % 3 ? col : '#fff'; box.appendChild(s); setTimeout(() => s.remove(), 1300); }
}

/* ---------- opening stage: the case spins in 3D, bursts open, then the strip rolls ---------- */
let STAGE = null;
function closeStage(instant) {
  if (!STAGE) return; const el = STAGE.el; STAGE.dead = true; cancelAnimationFrame(STAGE.raf); rollAbort(); STAGE = null;
  if (instant) el.remove(); else { el.classList.add('out'); setTimeout(() => el.remove(), 320); }
  document.body.style.overflow = '';
}
function openStage(c) {
  closeStage(true);
  const face = cls => `<div class="f ${cls}">${cls === 'fr' || cls === 'bk' ? `<span class="seam"></span><span class="lt l"></span><span class="lt r"></span><span class="emb">${IC.star}</span>` : ''}</div>`;
  const el = document.createElement('div'); el.id = 'stage'; el.style.setProperty('--c', c.color); el.style.setProperty('--c2', c.color2); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', L('Открытие кейса ', 'Opening case ') + caseName(c));
  el.innerHTML = `<div class="st-rays"></div><div class="st-top"><span class="cc-name" style="--c:${c.color}">${esc(caseName(c))}</span><span class="mono small">${fmt(priceOf(c))} PLT</span></div>
    <div class="st-shadow"></div><div class="st-box-wrap"><div class="box3">${['bk', 'lf', 'rt', 'bt', 'fr', 'tp'].map(face).join('')}<span class="hd"></span><span class="beam"></span></div></div>
    <div class="st-flash"></div>
    <div class="st-roll"><section class="spin"><div class="spin-in"><div class="track"></div><div class="marker"></div><div class="spin-flash"></div></div></section></div>
    <div class="st-res" aria-live="polite"></div><button class="st-skip" data-act="stskip">${L('Пропустить анимацию', 'Skip animation')}</button>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  STAGE = { el, c, raf: 0, dead: false, skipped: false };
  return STAGE;
}
function spinCase(st, ready, min = 1500) {
  return new Promise(res => {
    const box = st.el.querySelector('.box3'); let ang = 0, last = performance.now(), t0 = last, isReady = false, lastQ = 0;
    ready.then(() => { isReady = true; });
    if (reduced()) { ready.then(res); return; }
    sfx('whoosh'); st.el.classList.add('charge');
    const frame = now => {
      if (st.dead) return res();
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const el = now - t0;
      const k = Math.min(1, el / min); const vel = 60 + 1100 * k * k; ang += vel * dt;
      box.style.transform = `rotateX(${-16 + Math.sin(el / 45) * k * 4}deg) rotateY(${ang}deg) scale(${1 + k * 0.1})`;
      const q = Math.floor(ang / 90); if (q !== lastQ) { lastQ = q; sfx('tick', Math.min(1, vel / 1100)); }
      if ((el >= min && isReady) || st.skipped) {
        const end = Math.ceil(ang / 360) * 360; const from = ang, t1 = now;
        const settle = n2 => { if (st.dead) return res(); const kk = Math.min(1, (n2 - t1) / 360); const a = from + (end - from) * (1 - Math.pow(1 - kk, 3)); box.style.transform = `rotateX(-12deg) rotateY(${a}deg) scale(1.1)`; if (kk < 1) st.raf = requestAnimationFrame(settle); else res(); };
        st.raf = requestAnimationFrame(settle); return;
      }
      st.raf = requestAnimationFrame(frame);
    };
    st.raf = requestAnimationFrame(frame);
  });
}
// The case cracks, shatters into shards, and the roulette flies out of it already spinning.
function shatter(st) {
  const wrap = st.el; if (!wrap || reduced()) return;
  const host = document.createElement('div'); host.className = 'shards';
  const N = 30;
  const calcL = () => 38 + Math.random() * 24, calcT = () => 36 + Math.random() * 24;
  for (let i = 0; i < N; i++) {
    const sh = document.createElement('i');
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.5, r = 120 + Math.random() * 320;
    const w = 22 + Math.random() * 56, h = 16 + Math.random() * 48;
    sh.style.cssText = `--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - 40}px;--rz:${(Math.random() - 0.5) * 900}deg;--rx:${(Math.random() - 0.5) * 700}deg;--d:${Math.random() * 90}ms;width:${w}px;height:${h}px;left:${calcL()}%;top:${calcT()}%`;
    host.appendChild(sh);
  }
  wrap.appendChild(host);
  setTimeout(() => host.remove(), 1400);
}
async function burstCase(st) {
  const box = st.el.querySelector('.box3');
  // 1. the case strains and cracks
  box.classList.add('crack'); sfx('tick', 1); await wait(reduced() ? 0 : 150);
  box.classList.add('shake'); await wait(reduced() ? 0 : 260); box.classList.remove('shake');
  // 2. it bursts: lid off, shards fly, flash
  box.classList.add('open'); sfx('boom'); st.el.querySelector('.st-flash').classList.add('go'); shatter(st);
  await wait(reduced() ? 0 : 170);
  // 3. the roulette flies out of the wreck and is already spinning
  if (!st.dead) { st.el.classList.add('rolling', 'roll-in'); sfx('whoosh'); }
  await wait(reduced() ? 0 : 260);
  if (!st.dead) st.el.classList.remove('roll-in');
}
function resultHtml(c, p) {
  const word = tierName(p.tier); const canMore = ME && ME.balance >= priceOf(c);
  return `<div class="result t-${p.tier}"><p class="eyebrow">${esc(caseName(c))} · <span class="pidv"><span class="iri-t">${p.id}</span>${VB()}</span></p>${Plate(p, { holo: true })}<p class="tier" aria-label="${esc(word)}">${[...word].map((ch, i) => `<span style="--i:${i}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</p>
    <div class="pc-tags" style="justify-content:center">${Perks(p)}${Copy(p)}</div>
    <dl class="kv"><dt>${L('Номер', 'Plate')}</dt><dd>${esc(plateStr(p))}</dd><dt>${L('Регион', 'Region')}</dt><dd>${esc(regionLabel(p))}</dd><dt>${L('Оценка', 'Value')}</dt><dd>${fmt(p.value)} PLT</dd></dl>
    <div class="row" style="justify-content:center"><button class="btn btn-chrome btn-lg" data-act="stclose" autofocus>${L('Забрать', 'Collect')}</button>${canMore ? `<button class="btn btn-glass btn-lg" data-act="open" data-case="${c.id}">${L('Ещё раз', 'Again')} · ${fmt(priceOf(c))}</button>` : ''}</div>
    <div class="row" style="justify-content:center"><a class="btn btn-sm btn-ghost" href="#/upgrade?p=${p.id}">${L('Апгрейд', 'Upgrade')}</a><button class="btn btn-sm btn-ghost" data-act="shareplate" data-id="${p.id}">📤 ${L('Похвастаться', 'Share')}</button><button class="btn btn-sm btn-ghost" data-act="listdlg" data-id="${p.id}">${L('На рынок', 'Sell')}</button><button class="btn btn-sm btn-ghost" data-act="bank" data-id="${p.id}" data-v="${p.value}" data-s="${esc(plateStr(p))}" data-after="stage">${L('Банку за', 'Bank for')} ${fmt(p.value * CFG.bankRate)}</button></div></div>`;
}

// several cases at once: the strip lands on the best plate, then every plate is shown
function resultMulti(c, plates, n) {
  const best = plates.reduce((a, x) => (x.value > a.value ? x : a), plates[0]); const total = plates.reduce((a, x) => a + x.value, 0);
  const canMore = ME && ME.balance >= priceOf(c) * n;
  return `<div class="result multi t-${best.tier}"><p class="eyebrow">${esc(caseName(c))} · ×${n}</p>
    <div class="mres">${plates.map(p => `<div class="mres-i t-${p.tier}${p === best ? ' best' : ''}">${Plate(p, { holo: true })}${Rarity(p.tier)}<span class="small"><span class="pidv">${p.id}${VB()}</span> · ${fmt(p.value)} PLT</span>
      <div class="row" style="justify-content:center;gap:6px"><button class="btn btn-sm btn-ghost" data-act="shareplate" data-id="${p.id}">📤</button><button class="btn btn-sm btn-ghost" data-act="listdlg" data-id="${p.id}">${L('На рынок', 'Sell')}</button></div></div>`).join('')}</div>
    <p class="small" style="margin:0">${L('Всего на', 'Total value')} <b>${fmt(total)} PLT</b></p>
    <div class="row" style="justify-content:center"><button class="btn btn-chrome btn-lg" data-act="stclose" autofocus>${L('Забрать всё', 'Collect all')}</button>${canMore ? `<button class="btn btn-glass btn-lg" data-act="open" data-case="${c.id}" data-n="${n}">${L('Ещё', 'Again')} ×${n} · ${fmt(priceOf(c) * n)}</button>` : ''}</div></div>`;
}
