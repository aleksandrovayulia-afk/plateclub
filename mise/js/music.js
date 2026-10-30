// Фоновая кухонная музыка, которая генерируется прямо на устройстве: ни файлов, ни лицензий.
// Три стиля: лоу-фай джаз, босса-нова и неспешный эмбиент. Аккорды электропианино, бас, щётки/шейкер и редкая мелодия.
let ctx = null; let master = null; let bus = null; let timer = null; let on = false; let step = 0; let nextAt = 0;
let vol = 0.5; let style = 'jazz'; let sleepAt = 0; let sleepTimer = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const STYLES = ['jazz', 'bossa', 'chill'];

const STYLE_DEFS = {
  jazz: {
    bpm: 76,
    prog: [
      { root: 48, chord: [55, 59, 62, 64] }, { root: 45, chord: [55, 60, 64, 67] }, { root: 50, chord: [53, 57, 60, 64] }, { root: 43, chord: [53, 59, 62, 64] },
      { root: 41, chord: [55, 60, 64, 69] }, { root: 40, chord: [55, 59, 62, 67] }, { root: 50, chord: [53, 57, 60, 64] }, { root: 43, chord: [53, 59, 62, 64] },
    ],
    penta: [72, 74, 76, 79, 81, 84],
    bar(i, t0, B) {
      const { root, chord } = this.prog[i % this.prog.length];
      const swing = B * 0.12;
      chord.forEach((m, k) => { note(hz(m), t0 + k * 0.018, B * 3.4, { gain: 0.05, type: 'triangle', detune: k * 3 }); note(hz(m + 12), t0 + k * 0.018, B * 2, { gain: 0.012 }); });
      note(hz(root), t0, B * 1.6, { gain: 0.16, attack: 0.03 });
      note(hz(root + (i % 2 ? 7 : 12)), t0 + B * 2 + swing, B * 1.2, { gain: 0.1, attack: 0.03 });
      for (let b = 0; b < 4; b++) { tick(t0 + b * B, b % 2 === 1 ? 0.035 : 0.018); tick(t0 + b * B + B * 0.5 + swing, 0.016); }
      melody(t0, B, this.penta, swing);
    },
  },
  bossa: {
    bpm: 98,
    prog: [
      { root: 45, chord: [57, 60, 64, 67] }, { root: 50, chord: [57, 62, 65, 69] }, { root: 43, chord: [55, 59, 62, 65] }, { root: 48, chord: [55, 60, 64, 67] },
      { root: 41, chord: [57, 60, 64, 69] }, { root: 46, chord: [58, 62, 65, 69] }, { root: 43, chord: [55, 59, 62, 65] }, { root: 48, chord: [55, 60, 64, 67] },
    ],
    penta: [69, 72, 74, 76, 79, 81],
    bar(i, t0, B) {
      const { root, chord } = this.prog[i % this.prog.length];
      const E = B / 2; // восьмая
      // ритм босса-новы: удары гитары по восьмым 0, 3, 6, 8+... (в такте из 8 восьмых)
      [0, 3, 6, 8, 11, 14].forEach((e) => chord.forEach((m, k) => note(hz(m), t0 + e * E + k * 0.012, E * 1.6, { gain: 0.032, type: 'triangle', attack: 0.004 })));
      note(hz(root), t0, B * 1.4, { gain: 0.15, attack: 0.02 });
      note(hz(root + 7), t0 + B * 1.5, B * 1.2, { gain: 0.11, attack: 0.02 });
      note(hz(root), t0 + B * 2, B * 1.4, { gain: 0.14, attack: 0.02 });
      note(hz(root + 7), t0 + B * 3.5, B * 0.9, { gain: 0.1, attack: 0.02 });
      for (let e = 0; e < 8; e++) tick(t0 + e * E, e % 2 ? 0.014 : 0.024);
      melody(t0, B, this.penta, 0);
    },
  },
  chill: {
    bpm: 52,
    prog: [
      { root: 36, chord: [48, 55, 59, 64] }, { root: 33, chord: [45, 55, 60, 64] }, { root: 41, chord: [48, 53, 57, 64] }, { root: 43, chord: [50, 55, 59, 62] },
    ],
    penta: [72, 76, 79, 83, 84, 88],
    bar(i, t0, B) {
      const { root, chord } = this.prog[i % this.prog.length];
      chord.forEach((m, k) => { note(hz(m), t0 + k * 0.05, B * 4.2, { gain: 0.04, type: 'sine', attack: 1.4, detune: k * 4 }); note(hz(m + 12), t0 + k * 0.05, B * 3, { gain: 0.012, attack: 1.8 }); });
      note(hz(root), t0, B * 4, { gain: 0.14, attack: 0.8 });
      melody(t0, B, this.penta, 0, 0.5);
    },
  },
};

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  bus = ctx.createBiquadFilter();
  bus.type = 'lowpass'; bus.frequency.value = 2400; bus.Q.value = 0.4;
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.4;
  const fb = ctx.createGain(); fb.gain.value = 0.28; const wet = ctx.createGain(); wet.gain.value = 0.22;
  bus.connect(master); bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  master.connect(ctx.destination);
  master.gain.value = vol * 1.8;
}

function note(freq, t, dur, { type = 'sine', gain = 0.1, attack = 0.015, detune = 0 } = {}) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(attack, dur * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function tick(t, level) {
  if (!noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 0.05);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
  const g = ctx.createGain(); g.gain.value = level;
  s.connect(hp); hp.connect(g); g.connect(bus); s.start(t);
}

function melody(t0, B, scale, swing, chance = 0.8) {
  if (Math.random() > chance) return;
  let beat = Math.random() < 0.5 ? 1 : 0.5;
  for (let n = 0; n < 2 + Math.floor(Math.random() * 3); n++) {
    note(hz(pick(scale)), t0 + beat * B + swing * (n % 2), B * 1.3, { gain: 0.045, type: 'triangle', attack: 0.02 });
    beat += pick([0.5, 1, 1.5]);
    if (beat > 3.6) break;
  }
}

function pump() {
  const def = STYLE_DEFS[style];
  const B = 60 / def.bpm;
  while (nextAt < ctx.currentTime + 1.5) { def.bar(step++, nextAt, B); nextAt += B * 4; }
}

export const isOn = () => on;
export const getStyle = () => style;
export const getVolume = () => vol;
export const sleepLeft = () => (sleepAt ? Math.max(0, Math.round((sleepAt - Date.now()) / 60000)) : 0);

export function setVolume(v) { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = vol * 1.8; emit(); }
export function setStyle(s) {
  if (!STYLE_DEFS[s] || s === style) return;
  style = s;
  if (on) { step = 0; nextAt = ctx.currentTime + 0.2; }
  emit();
}
export function start() {
  try {
    init();
    if (ctx.resume) ctx.resume();
    if (on) return;
    on = true; step = 0; nextAt = ctx.currentTime + 0.1;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(vol * 1.8, ctx.currentTime + 2);
    pump(); timer = setInterval(pump, 400);
  } catch { on = false; }
  emit();
}
export function stop() {
  if (!on) return;
  on = false; clearInterval(timer); setSleep(0);
  try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8); } catch { /* */ }
  emit();
}
export const toggle = () => { on ? stop() : start(); return on; };

/** Таймер сна: музыка сама затихнет через N минут (0 — выключить таймер) */
export function setSleep(min) {
  clearTimeout(sleepTimer);
  sleepAt = min ? Date.now() + min * 60000 : 0;
  if (min) sleepTimer = setTimeout(() => { sleepAt = 0; stop(); }, min * 60000);
  emit();
}
