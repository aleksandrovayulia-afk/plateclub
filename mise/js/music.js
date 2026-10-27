// Фоновая «кухонная» музыка: мягкий лоу-фай джаз, который генерируется прямо на устройстве.
// Без файлов и лицензий: аккорды электропианино, бас, щётки и редкая мелодия из пентатоники.
let ctx = null; let master = null; let timer = null; let on = false; let step = 0; let nextAt = 0; let vol = 0.5;

const BPM = 76; const BEAT = 60 / BPM;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
// Cmaj9 – Am9 – Dm9 – G13, затем Fmaj9 – Em7 – Dm9 – G13 (MIDI-ноты)
const PROG = [
  { root: 48, chord: [55, 59, 62, 64] }, { root: 45, chord: [55, 60, 64, 67] }, { root: 50, chord: [53, 57, 60, 64] }, { root: 43, chord: [53, 59, 62, 64] },
  { root: 41, chord: [55, 60, 64, 69] }, { root: 40, chord: [55, 59, 62, 67] }, { root: 50, chord: [53, 57, 60, 64] }, { root: 43, chord: [53, 59, 62, 64] },
];
const PENTA = [72, 74, 76, 79, 81, 84];

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4;
  const delay = ctx.createDelay(1); delay.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.28; const wet = ctx.createGain(); wet.gain.value = 0.22;
  lp.connect(master); lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  master.connect(ctx.destination);
  ctx.bus = lp;
  setVolume(vol);
}

function note(freq, t, dur, { type = 'sine', gain = 0.1, attack = 0.015, detune = 0 } = {}) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(ctx.bus); o.start(t); o.stop(t + dur + 0.05);
}

function tick(t, loud) {
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
  const g = ctx.createGain(); g.gain.value = loud ? 0.035 : 0.018;
  s.connect(hp); hp.connect(g); g.connect(ctx.bus); s.start(t);
}

function bar(i, t0) {
  const { root, chord } = PROG[i % PROG.length];
  const swing = BEAT * 0.12;
  // аккорд: чуть «разъехавшиеся» ноты, как у электропианино
  chord.forEach((m, k) => {
    note(hz(m), t0 + k * 0.018, BEAT * 3.4, { gain: 0.05, type: 'triangle', detune: k * 3 });
    note(hz(m + 12), t0 + k * 0.018, BEAT * 2, { gain: 0.012, type: 'sine' });
  });
  note(hz(root), t0, BEAT * 1.6, { gain: 0.16, type: 'sine', attack: 0.03 });
  note(hz(root + (i % 2 ? 7 : 12)), t0 + BEAT * 2 + swing, BEAT * 1.2, { gain: 0.1, type: 'sine', attack: 0.03 });
  for (let b = 0; b < 4; b++) { tick(t0 + b * BEAT, b % 2 === 1); tick(t0 + b * BEAT + BEAT * 0.5 + swing, false); }
  // редкая мелодия
  if (Math.random() < 0.8) {
    let beat = Math.random() < 0.5 ? 1 : 0.5;
    for (let n = 0; n < 2 + Math.floor(Math.random() * 3); n++) {
      const m = PENTA[Math.floor(Math.random() * PENTA.length)];
      note(hz(m), t0 + beat * BEAT + swing * (n % 2), BEAT * 1.3, { gain: 0.045, type: 'triangle', attack: 0.02 });
      beat += [0.5, 1, 1.5][Math.floor(Math.random() * 3)];
      if (beat > 3.6) break;
    }
  }
}

function pump() {
  while (nextAt < ctx.currentTime + 1.5) { bar(step++, nextAt); nextAt += BEAT * 4; }
}

export const isOn = () => on;
export function setVolume(v) { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = vol * 1.8; }
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
}
export function stop() {
  if (!on) return;
  on = false; clearInterval(timer);
  try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8); } catch { /* */ }
  // уже запланированные ноты затухнут сами
}
export const toggle = () => { on ? stop() : start(); return on; };
