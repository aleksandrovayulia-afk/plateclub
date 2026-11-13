// Моти: мягкий кухонный помощник. Мягкие формы, глаза с бликами, ничего «мультяшного».
// Движение считает небольшая пружинная физика (инерция, сжатие и растяжение, дыхание, моргание, взгляд),
// поэтому он живой, но почти всё время просто спокойно стоит. Состояния описаны в STATES ниже.
//
// Использование: вставьте mascot('idle', 96) в разметку; контроллер подключится сам.
// setMood(root, 'think') меняет состояние, flash(root, 'success', 2000) возвращает к спокойному.

export const MOODS = ['idle', 'greet', 'curious', 'think', 'search', 'analyze', 'result', 'assist', 'watch', 'success', 'error', 'react'];
// Старые названия состояний, чтобы не ломать вызовы из других экранов
const ALIAS = { talk: 'assist', happy: 'success', sad: 'error', wave: 'greet', teach: 'curious', show: 'result', cook: 'assist', walk: 'idle' };
const norm = (s) => ALIAS[s] || (MOODS.includes(s) ? s : 'idle');

let uid = 0;
const SVG = (state, w, h, vb, cls, id, lite) => `<svg class="moti ${lite ? 'moti-lite' : ''} ${cls}" data-s="${state}" ${lite ? '' : 'data-moti="1"'} style="width:${w}px;height:${h}px" viewBox="${vb}" role="img" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="mg${id}" cx="38%" cy="28%" r="82%"><stop offset="0" stop-color="#fffaf4"/><stop offset=".55" stop-color="#ffeedd"/><stop offset="1" stop-color="#f4c9a6"/></radialGradient>
    <radialGradient id="mc${id}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#ffeedd"/><stop offset="1" stop-color="#f1bf9a"/></radialGradient>
  </defs>
  <g class="m-root">
    <ellipse class="m-shadow" cx="60" cy="107" rx="30" ry="3.6"/>
    <g class="m-body">
      <g class="m-foot-l"><ellipse cx="46" cy="102" rx="10" ry="5.2" fill="url(#mc${id})"/></g><g class="m-foot-r"><ellipse cx="74" cy="102" rx="10" ry="5.2" fill="url(#mc${id})"/></g>
      <g class="m-arm-l"><rect x="7" y="67" width="19" height="10" rx="5" fill="url(#mc${id})"/></g>
      <g class="m-arm-r"><rect x="94" y="67" width="19" height="10" rx="5" fill="url(#mc${id})"/><g class="m-lens"><circle cx="108" cy="52" r="9" fill="#fff" fill-opacity=".35" stroke="#3a2a22" stroke-width="3"/><path d="M101.500 59.500 L96 66" stroke="#3a2a22" stroke-width="3.500" stroke-linecap="round"/></g></g>
      <g class="m-sprout"><path d="M60 27 C60 21 62 17 66 14" fill="none" stroke="#5aa860" stroke-width="2.600" stroke-linecap="round"/><path d="M66 14 C72 9 81 11 83 15 C78 20 70 19 66 14Z" fill="#7bc47a"/></g>
      <path class="m-bodyshape" d="M22 80 C22 46 38 24 60 24 C82 24 98 46 98 80 C98 96 82 105 60 105 C38 105 22 96 22 80Z" fill="url(#mg${id})"/>
      <ellipse class="m-shine" cx="44" cy="42" rx="9" ry="4.600" fill="#fff" opacity=".65" transform="rotate(-28 44 42)"/>
      <g class="m-hat"><path d="M38 30 H82 V37 H38Z" fill="#fff"/><path d="M36 30 C28 30 28 16 38 15 C40 8 52 7 56 11 C60 5 72 6 74 12 C84 11 90 24 82 30Z" fill="#fff"/><path d="M38 37 H82" stroke="#e7d9cc" stroke-width="1.500"/></g>
      <g class="m-face">
        <g class="m-cheeks"><ellipse cx="35" cy="76" rx="6.500" ry="4.200" fill="#ff8f7e"/><ellipse cx="85" cy="76" rx="6.500" ry="4.200" fill="#ff8f7e"/></g>
        <g class="m-brows"><path class="m-brow-l" d="M38 54 Q46 50 54 54" fill="none" stroke="#3a2a22" stroke-width="2.600" stroke-linecap="round"/><path class="m-brow-r" d="M66 54 Q74 50 82 54" fill="none" stroke="#3a2a22" stroke-width="2.600" stroke-linecap="round"/></g>
        <g class="m-eye m-eye-l" transform="translate(46 66)"><g class="m-eye-open"><ellipse cx="0" cy="0" rx="5.800" ry="7.800" fill="#3a2a22"/><circle class="m-glint" cx="2" cy="-3" r="2.200" fill="#fff"/><circle class="m-glint2" cx="-1.800" cy="2.800" r="1" fill="#fff" opacity=".8"/></g><path class="m-eye-happy" d="M-6 3 Q0 -6 6 3" fill="none" stroke="#3a2a22" stroke-width="3" stroke-linecap="round"/></g>
        <g class="m-eye m-eye-r" transform="translate(74 66)"><g class="m-eye-open"><ellipse cx="0" cy="0" rx="5.800" ry="7.800" fill="#3a2a22"/><circle class="m-glint" cx="2" cy="-3" r="2.200" fill="#fff"/><circle class="m-glint2" cx="-1.800" cy="2.800" r="1" fill="#fff" opacity=".8"/></g><path class="m-eye-happy" d="M-6 3 Q0 -6 6 3" fill="none" stroke="#3a2a22" stroke-width="3" stroke-linecap="round"/></g>
        <path class="m-mouth" d="M52.500 83 Q60 89 67.500 83 Q60 92 52.500 83Z" fill="#3a2a22"/>
      </g>
      <g class="m-drop"><path d="M92 40 C88 46 88 50 92 50 C96 50 96 46 92 40Z" fill="#7cc4f0"/></g>
      <g class="m-spark"><path d="M20 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffd13d"/><path d="M100 24 l1.500 4 4 1.500 -4 1.500 -1.500 4 -1.500 -4 -4 -1.500 4 -1.500z" fill="#ffd13d"/><path d="M92 8 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1z" fill="#ff9a62"/></g>
    </g>
  </g>
</svg>`;

/** Весь Моти; size — высота в пикселях */
export const mascot = (state = 'idle', size = 64, cls = '') => SVG(norm(state), size, size, '0 0 120 116', cls, ++uid, false);
/** Только лицо: для маленьких иконок. Без физики, моргает средствами CSS */
export const face = (state = 'idle', size = 32, cls = '') => SVG(norm(state), size, size, '18 14 84 78', `moti-face ${cls}`, ++uid, true);

/* ───────── физика ───────── */

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr, not) => { let v; do v = arr[Math.floor(Math.random() * arr.length)]; while (arr.length > 1 && v === not); return v; };

class Spring {
  constructor(v = 0, k = 90, d = 12) { this.v = v; this.target = v; this.vel = 0; this.k = k; this.d = d; }
  step(dt) { const a = this.k * (this.target - this.v) - this.d * this.vel; this.vel += a * dt; this.v += this.vel * dt; }
  snap(v) { this.v = this.target = v; this.vel = 0; }
}

/** Позы: целевые значения пружин. Всё остальное (дыхание, моргание, взгляд) добавляет контроллер */
const POSE = {
  idle: {},
  greet: { armR: -105, lean: 2, mouth: 'smile', blush: 0.5 },
  curious: { lean: 6, gy: -0.2, brow: 0.7, mouth: 'smile-s', eyeScale: 1.08 },
  think: { lean: -4, armR: -125, gx: -0.7, gy: -0.8, mouth: 'o', brow: 0.4 },
  search: { lean: 3, lens: 1, mouth: 'flat', armR: -35 },
  analyze: { lean: 5, mouth: 'flat', brow: 0.3, eyeScale: 1.05 },
  result: { armL: 40, armR: -40, mouth: 'open', blush: 0.7, happy: 0.35 },
  assist: { hat: 1, lean: 2, mouth: 'smile', blush: 0.4 },
  watch: { lean: 3, gx: 0.6, gy: 0.55, mouth: 'flat-s', eyeScale: 1.06 },
  success: { armL: 105, armR: -105, mouth: 'open', happy: 1, blush: 0.85, spark: 1 },
  error: { lean: -3, sq: 0.07, gy: 0.7, mouth: 'frown', brow: -1, drop: 1, armL: -48, armR: 48 },
  react: {},
};
const MOUTH = {
  smile: { w: 7.5, c: 6, t: 1.8 }, 'smile-s': { w: 5.5, c: 4, t: 1.6 }, flat: { w: 5, c: 0.6, t: 1.8 }, 'flat-s': { w: 4.5, c: 0.4, t: 1.6 },
  o: { w: 3, c: 1, t: 6 }, open: { w: 8, c: 2, t: 8 }, frown: { w: 6, c: -3.5, t: 1.8 }, talk: { w: 6, c: 1, t: 7 },
};

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const all = new Set();
let raf = 0; let last = 0; let pointer = null;

class Moti {
  constructor(el) {
    this.el = el; this.q = (s) => el.querySelector(s);
    this.node = {
      root: this.q('.m-root'), body: this.q('.m-body'), shadow: this.q('.m-shadow'), armL: this.q('.m-arm-l'), armR: this.q('.m-arm-r'), face: this.q('.m-face'),
      sprout: this.q('.m-sprout'), eyeL: this.q('.m-eye-l'), eyeR: this.q('.m-eye-r'), mouth: this.q('.m-mouth'), hat: this.q('.m-hat'), lens: this.q('.m-lens'),
      drop: this.q('.m-drop'), spark: this.q('.m-spark'), cheeks: this.q('.m-cheeks'), brows: this.q('.m-brows'), browL: this.q('.m-brow-l'), browR: this.q('.m-brow-r'),
      footL: this.q('.m-foot-l'), footR: this.q('.m-foot-r'),
    };
    const S = (v, k, d) => new Spring(v, k, d);
    this.s = {
      x: S(0, 70, 11), y: S(0, 120, 14), sq: S(0, 160, 10), lean: S(0, 55, 8), armL: S(-30, 80, 9), armR: S(30, 80, 9), gx: S(0, 150, 16), gy: S(0, 150, 16),
      lid: S(0, 600, 40), happy: S(0, 120, 14), blush: S(0.25, 60, 10), brow: S(0, 100, 13), hat: S(0, 80, 12), lens: S(0, 80, 12), drop: S(0, 80, 12), spark: S(0, 60, 9),
      mw: S(7.5, 140, 14), mc: S(6, 140, 14), mt: S(1.8, 140, 14), eyeScale: S(1, 120, 14), sway: S(0, 40, 4),
    };
    this.state = 'idle'; this.t = Math.random() * 10; this.vy = 0; this.air = false; this.timers = []; this.lastTap = ''; this.talking = false;
    this.next = { blink: this.t + rnd(1.5, 4), gaze: this.t + rnd(1.5, 3.5), shift: this.t + rnd(7, 14), rare: this.t + rnd(24, 45) };
    this.armBase = { l: -30, r: 30 };
    this.apply(norm(this.el.dataset.s), true);
    this.draw();
  }
  later(ms, fn) { const id = setTimeout(() => { this.timers = this.timers.filter((x) => x !== id); fn(); }, ms); this.timers.push(id); }
  clearScript() { this.timers.forEach(clearTimeout); this.timers = []; }

  /** Переход в состояние: выставляет целевые значения пружин и запускает короткие сценарии */
  apply(state, instant = false) {
    this.clearScript();
    this.state = state; this.el.dataset.s = state;
    const p = POSE[state] || {};
    const s = this.s;
    s.lean.target = p.lean || 0; s.sq.target = p.sq || 0;
    this.armBase = { l: p.armL ?? -30, r: p.armR ?? 30 };
    s.armL.target = this.armBase.l; s.armR.target = this.armBase.r;
    s.gx.target = p.gx || 0; s.gy.target = p.gy || 0; s.happy.target = p.happy || 0; s.blush.target = p.blush ?? 0.25;
    s.brow.target = p.brow || 0; s.hat.target = p.hat || 0; s.lens.target = p.lens || 0; s.drop.target = p.drop || 0; s.spark.target = p.spark || 0; s.eyeScale.target = p.eyeScale || 1;
    this.setMouth(p.mouth || 'smile-s');
    if (state === 'greet') { this.crouch(() => { this.hop(150); this.later(180, () => this.wave(2)); }); }
    if (state === 'result') { this.crouch(() => this.hop(110)); }
    if (state === 'success') { this.crouch(() => this.hop(190)); this.later(950, () => this.hop(120)); }
    if (state === 'error') { s.y.target = 3; }
    if (instant) for (const k in s) s[k].snap(s[k].target);
  }
  setMouth(name) { const m = MOUTH[name] || MOUTH['smile-s']; this.s.mw.target = m.w; this.s.mc.target = m.c; this.s.mt.target = m.t; }
  crouch(then) { this.s.sq.target = 0.2; this.later(150, () => { this.s.sq.target = POSE[this.state]?.sq || 0; then(); }); }
  hop(v) { this.vy = -v; this.air = true; }
  wave(n) { let i = 0; const go = () => { if (i >= n * 2) { this.s.armR.target = this.armBase.r; return; } this.s.armR.target = -105 + (i % 2 ? 22 : -8); i++; this.later(260, go); }; this.s.armR.target = -108; this.later(180, go); }

  /** Реакция на нажатие: случайное действие, не повторяющее предыдущее */
  poke() {
    const move = pick(['boing', 'giggle', 'wave', 'spin', 'peek', 'around'], this.lastTap); this.lastTap = move;
    const s = this.s; const keep = this.state;
    this.clearScript();
    s.happy.target = 0.6; s.blush.target = 0.7;
    if (move === 'boing') { this.crouch(() => this.hop(170)); }
    if (move === 'giggle') { s.happy.target = 1; let i = 0; const g = () => { if (i++ > 7) { s.lean.target = POSE[keep].lean || 0; return; } s.lean.target = i % 2 ? 7 : -7; this.later(120, g); }; g(); }
    if (move === 'wave') { this.wave(2); }
    if (move === 'spin') { this.spin = 0; this.spinning = true; this.hop(100); }
    if (move === 'peek') { s.sq.target = 0.28; s.gx.target = 1; this.later(500, () => { s.sq.target = 0; this.hop(90); }); }
    if (move === 'around') { s.gx.target = -1; this.later(450, () => { s.gx.target = 1; }); this.later(900, () => { s.gx.target = 0; }); }
    this.later(1700, () => this.apply(keep));
    return move;
  }

  talk(on) { this.talking = on; if (!on) this.setMouth(POSE[this.state]?.mouth || 'smile-s'); }

  step(dt, now) {
    const s = this.s; this.t += dt;
    const idleLike = this.state === 'idle' || this.state === 'assist' || this.state === 'curious' || this.state === 'watch';
    // блики поведения: моргание, взгляд, смена опоры, редкие действия
    if (this.t > this.next.blink) { this.blink(); this.next.blink = this.t + rnd(2.2, 5.5); if (Math.random() < 0.18) this.later(210, () => this.blink()); }
    if (idleLike && this.t > this.next.gaze) {
      const p = POSE[this.state] || {};
      if (pointer && this.near(pointer) && Math.random() < 0.6) { const r = this.el.getBoundingClientRect(); s.gx.target = clamp((pointer.x - (r.left + r.width / 2)) / 160, -1, 1); s.gy.target = clamp((pointer.y - (r.top + r.height / 2)) / 160, -0.8, 0.8); }
      else { s.gx.target = (p.gx || 0) + rnd(-0.5, 0.5); s.gy.target = (p.gy || 0) + rnd(-0.3, 0.3); }
      this.next.gaze = this.t + rnd(1.8, 4.5);
    }
    if (idleLike && this.t > this.next.shift) { s.lean.target = (POSE[this.state]?.lean || 0) + rnd(-2.5, 2.5); s.x.target = rnd(-1.5, 1.5); this.next.shift = this.t + rnd(7, 14); }
    if (this.state === 'idle' && this.t > this.next.rare) { this.rare(); this.next.rare = this.t + rnd(28, 55); }
    if (this.state === 'search') { s.gx.target = Math.sin(this.t * 3.2) * 0.9; s.gy.target = -0.1; s.armR.target = -38 + Math.sin(this.t * 3.2) * 12; }
    if (this.state === 'analyze') { s.gx.target = Math.sin(this.t * 2.2) * 0.5; s.gy.target = Math.sin(this.t * 4.4) * 0.5; }
    if (this.state === 'think') { s.armR.target = -125 + Math.sin(this.t * 1.3) * 5; s.gx.target = -0.7 + Math.sin(this.t * 0.9) * 0.25; }
    if (this.talking) { s.mt.target = 3.5 + Math.abs(Math.sin(this.t * 9)) * 5; s.mw.target = 5 + Math.abs(Math.sin(this.t * 7)) * 2; }
    // физика прыжка и сжатия при посадке
    if (this.air) {
      this.vy += 520 * dt; s.y.v += this.vy * dt; s.y.target = 0;
      if (s.y.v >= 0) { s.y.v = 0; s.y.vel = 0; this.air = false; s.sq.vel += 2.4 + Math.min(1.5, this.vy / 150); this.vy = 0; if (this.spinning) { this.spinning = false; } }
    } else { s.y.step(dt); }
    if (this.spinning) this.spin += dt * 9;
    for (const k in s) if (k !== 'y') s[k].step(dt);
    s.sq.v = clamp(s.sq.v, -0.25, 0.4);
  }
  near(p) { const r = this.el.getBoundingClientRect(); return Math.hypot(p.x - (r.left + r.width / 2), p.y - (r.top + r.height / 2)) < 280; }
  blink() { const s = this.s; s.lid.target = 1; this.later(95, () => { s.lid.target = 0; }); }
  rare() {
    const s = this.s; const act = pick(['stretch', 'around', 'sway', 'sit']);
    if (act === 'stretch') { s.armL.target = 92; s.armR.target = -92; s.sq.target = -0.06; this.later(1100, () => { s.armL.target = -30; s.armR.target = 30; s.sq.target = 0; }); }
    if (act === 'around') { s.gx.target = -1; this.later(600, () => { s.gx.target = 1; }); this.later(1300, () => { s.gx.target = 0; }); }
    if (act === 'sway') { s.lean.target = 5; this.later(700, () => { s.lean.target = -5; }); this.later(1400, () => { s.lean.target = 0; }); }
    if (act === 'sit') { s.sq.target = 0.12; s.armL.target = -40; s.armR.target = 40; this.later(2200, () => { s.sq.target = 0; s.armL.target = -30; s.armR.target = 30; }); }
  }

  draw() {
    const s = this.s; const n = this.node; const t = this.t;
    const breath = Math.sin(t * 2 * Math.PI / 3.8);
    const stretch = this.air ? clamp(-this.vy * 0.0016, -0.1, 0.2) : 0;
    const sy = 1 + s.sq.v * -1 + stretch + breath * 0.011; const sx = 1 / Math.max(0.7, sy) * (this.spinning ? Math.cos(this.spin) : 1);
    const oy = s.y.v - breath * 0.4;
    n.root.setAttribute('transform', `translate(${s.x.v.toFixed(2)} ${oy.toFixed(2)})`);
    n.body.setAttribute('transform', `translate(60 105) rotate(${s.lean.v.toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-60 -105)`);
    const sh = clamp(1 + s.y.v / 90, 0.6, 1.1);
    n.shadow.setAttribute('transform', `translate(60 107) scale(${sh.toFixed(3)} 1) translate(-60 -107)`); n.shadow.style.opacity = 0.14 * sh;
    n.armL.setAttribute('transform', `rotate(${s.armL.v.toFixed(1)} 24 72)`); n.armR.setAttribute('transform', `rotate(${s.armR.v.toFixed(1)} 96 72)`);
    n.sprout.setAttribute('transform', `rotate(${(Math.sin(t * 1.4) * 3 + s.lean.v * -0.4 + s.sway.v).toFixed(2)} 60 27)`);
    n.face.setAttribute('transform', `translate(${(s.gx.v * 3.2).toFixed(2)} ${(s.gy.v * 2.2).toFixed(2)})`);
    const lid = clamp(1 - s.lid.v, 0.08, 1); const sc = s.eyeScale.v;
    for (const [g, cx] of [[n.eyeL, 46], [n.eyeR, 74]]) {
      const open = g.firstElementChild; const happy = g.lastElementChild;
      g.setAttribute('transform', `translate(${cx} 66)`);
      open.setAttribute('transform', `scale(${sc.toFixed(3)} ${(lid * sc).toFixed(3)}) translate(${(s.gx.v * 1.3).toFixed(2)} ${(s.gy.v * 1.2).toFixed(2)})`);
      const hp = s.happy.v > 0.5; open.style.opacity = hp ? 0 : 1; happy.style.opacity = hp ? 1 : 0;
    }
    const b = s.brow.v; const bo = clamp(Math.abs(b) * 1.3, 0, 1);
    n.brows.style.opacity = bo;
    n.browL.setAttribute('d', `M38 ${(55 - b * 2).toFixed(1)} Q46 ${(50 - b * 3).toFixed(1)} 54 ${(54 + b * 3).toFixed(1)}`); n.browR.setAttribute('d', `M66 ${(54 + b * 3).toFixed(1)} Q74 ${(50 - b * 3).toFixed(1)} 82 ${(55 - b * 2).toFixed(1)}`);
    n.cheeks.style.opacity = clamp(s.blush.v, 0, 1);
    const w = s.mw.v; const c = s.mc.v; const th = Math.max(1.4, s.mt.v);
    n.mouth.setAttribute('d', `M${(60 - w).toFixed(1)} 83 Q60 ${(83 + c).toFixed(1)} ${(60 + w).toFixed(1)} 83 Q60 ${(83 + c + th * 1.5).toFixed(1)} ${(60 - w).toFixed(1)} 83Z`);
    n.hat.style.opacity = clamp(s.hat.v, 0, 1); n.lens.style.opacity = clamp(s.lens.v, 0, 1); n.drop.style.opacity = clamp(s.drop.v, 0, 1);
    n.drop.setAttribute('transform', `translate(0 ${(s.drop.v * Math.sin(t * 2) * 1.5).toFixed(2)})`);
    n.spark.style.opacity = clamp(s.spark.v, 0, 1); n.spark.setAttribute('transform', `translate(0 ${(-Math.abs(Math.sin(t * 3)) * 2).toFixed(2)})`);
  }
}

const inst = new WeakMap();
function attach(el) {
  if (inst.has(el)) return;
  const m = new Moti(el); inst.set(el, m); all.add(m);
  if (reduced()) { m.draw(); return; }
  start();
}
function detach(el) { const m = inst.get(el); if (m) { m.clearScript(); all.delete(m); inst.delete(el); } }

function frame(now) {
  raf = 0;
  if (!all.size || document.hidden) { last = 0; return; }
  const dt = Math.min(1 / 24, last ? (now - last) / 1000 : 1 / 60); last = now;
  for (const m of [...all]) {
    if (!m.el.isConnected) { detach(m.el); continue; }
    const r = m.el.getBoundingClientRect();
    if (r.bottom < -40 || r.top > innerHeight + 40) continue; // за экраном не считаем
    m.step(dt, now); m.draw();
  }
  raf = requestAnimationFrame(frame);
}
function start() { if (!raf && !reduced()) { last = 0; raf = requestAnimationFrame(frame); } }

if (typeof document !== 'undefined') {
  const scan = (root) => root.querySelectorAll?.('svg.moti[data-moti]').forEach(attach);
  new MutationObserver((muts) => { for (const mu of muts) mu.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches?.('svg.moti[data-moti]')) attach(n); else scan(n); } }); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  addEventListener('pointermove', (e) => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  addEventListener('pointerdown', (e) => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  if (document.readyState !== 'loading') scan(document); else document.addEventListener('DOMContentLoaded', () => scan(document));
}

/* ───────── управление снаружи ───────── */

const each = (root, fn) => (root || document).querySelectorAll('svg.moti[data-moti]').forEach((el) => { const m = inst.get(el); if (m) fn(m, el); });

/** Меняет состояние всех Моти внутри root */
export function setMood(root, state) { const st = norm(state); each(root, (m) => { if (m.state !== st) m.apply(st); }); }
/** Показывает состояние на время и возвращает к спокойному */
export function flash(root, state, ms = 1800) {
  setMood(root, state);
  clearTimeout(flash.t);
  flash.t = setTimeout(() => setMood(root, 'idle'), ms);
}
/** Говорит: рот двигается, пока идёт озвучка или печатается ответ */
export function talk(root, on) { each(root, (m) => m.talk(on)); }
/** Нажатие на персонажа: возвращает название выбранной реакции */
export function tap(el) { const m = inst.get(el); return m ? m.poke() : 'boing'; }
/** Взгляд на заданную точку экрана (например, на таймер) */
export function lookAt(root, x, y) { each(root, (m) => { const r = m.el.getBoundingClientRect(); m.s.gx.target = clamp((x - (r.left + r.width / 2)) / 120, -1, 1); m.s.gy.target = clamp((y - (r.top + r.height / 2)) / 120, -1, 1); }); }
