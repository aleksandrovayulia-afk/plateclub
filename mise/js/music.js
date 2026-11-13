// Плеер кухонной музыки. Музыка создаётся прямо на устройстве (WebAudio): записей и лицензий нет, интернет не нужен.
// Подборки и треки описаны в data/music-data.js; здесь стили игры, очередь, переходы между треками и управление громкостью.
//
// Один трек = «голос»: свой фильтр и громкость. При смене трека новый голос плавно нарастает, старый затихает (кроссфейд).
import { TRACKS, TRACK_BY_ID, tracksOf, COLLECTIONS } from './data/music-data.js';
import * as store from './store.js';

export { COLLECTIONS, TRACKS, TRACK_BY_ID, tracksOf };

let ctx = null; let master = null; let fx = null; let pumpT = null;
let voice = null; let playing = false; let paused = false;
let vol = 0.5; let muted = false; let ducked = false;
let sleepAt = 0; let sleepTimer = null;
let queue = []; let qIndex = 0;
const subs = new Set();
let lastEmit = 0;
const emit = () => subs.forEach((f) => f());
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const GAIN = 1.8;
const outLevel = () => (muted ? 0 : vol * GAIN * (ducked ? 0.2 : 1));
function rngOf(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ───────── звуковая цепочка ───────── */

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = outLevel();
  fx = ctx.createGain();
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.4;
  const fb = ctx.createGain(); fb.gain.value = 0.28; const wet = ctx.createGain(); wet.gain.value = 0.2;
  fx.connect(master); fx.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  master.connect(ctx.destination);
}

function note(v, freq, t, dur, { type = 'sine', gain = 0.1, attack = 0.015, detune = 0 } = {}) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(attack, dur * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(v.filter); o.start(t); o.stop(t + dur + 0.05);
}
let noiseBuf = null;
function noise(v, t, level, { hp = 6000, dur = 0.05 } = {}) {
  if (!noiseBuf) { const len = Math.floor(ctx.sampleRate * 0.25); noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1); }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ctx.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(v.filter); s.start(t); s.stop(t + dur + 0.02);
}
function thump(v, t, level = 0.22) { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.14); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(v.filter); o.start(t); o.stop(t + 0.25); }

const PENTA = (key) => [0, 2, 4, 7, 9, 12, 14].map((x) => key + 24 + x);
function melody(v, t0, B, { chance = 0.8, gain = 0.045, swing = 0 } = {}) {
  if (v.rng() > chance) return;
  const sc = PENTA(v.track.key); let beat = v.rng() < 0.5 ? 1 : 0.5;
  const n = 2 + Math.floor(v.rng() * 3);
  for (let k = 0; k < n; k++) {
    note(v, hz(sc[Math.floor(v.rng() * sc.length)]), t0 + beat * B + swing * (k % 2), B * 1.3, { type: 'triangle', gain, attack: 0.02 });
    beat += [0.5, 1, 1.5][Math.floor(v.rng() * 3)];
    if (beat > 3.6) break;
  }
}
const lowOct = (m) => m - 12;

/* ───────── стили (один такт = 4 доли) ───────── */

const STYLE = {
  jazz(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length]; const sw = B * 0.12;
    c.notes.forEach((m, k) => { note(v, hz(m), t0 + k * 0.018, B * 3.4, { gain: 0.05, type: 'triangle', detune: k * 3 }); note(v, hz(m + 12), t0 + k * 0.018, B * 2, { gain: 0.012 }); });
    note(v, hz(lowOct(c.root)), t0, B * 1.6, { gain: 0.16, attack: 0.03 }); note(v, hz(lowOct(c.root) + (i % 2 ? 7 : 12)), t0 + B * 2 + sw, B * 1.2, { gain: 0.1, attack: 0.03 });
    for (let b = 0; b < 4; b++) { noise(v, t0 + b * B, b % 2 ? 0.035 : 0.018); noise(v, t0 + b * B + B * 0.5 + sw, 0.016); }
    melody(v, t0, B, { swing: sw });
  },
  bossa(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length]; const E = B / 2;
    [0, 3, 6, 8, 11, 14].forEach((e) => c.notes.forEach((m, k) => note(v, hz(m), t0 + e * E + k * 0.012, E * 1.6, { gain: 0.032, type: 'triangle', attack: 0.004 })));
    const r = lowOct(c.root);
    note(v, hz(r), t0, B * 1.4, { gain: 0.15, attack: 0.02 }); note(v, hz(r + 7), t0 + B * 1.5, B * 1.2, { gain: 0.11, attack: 0.02 }); note(v, hz(r), t0 + B * 2, B * 1.4, { gain: 0.14, attack: 0.02 }); note(v, hz(r + 7), t0 + B * 3.5, B * 0.9, { gain: 0.1, attack: 0.02 });
    for (let e = 0; e < 8; e++) noise(v, t0 + e * E, e % 2 ? 0.014 : 0.024);
    melody(v, t0, B, { swing: 0 });
  },
  pads(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length];
    c.notes.forEach((m, k) => { note(v, hz(m), t0 + k * 0.05, B * 4.2, { gain: 0.04, attack: 1.4, detune: k * 4 }); note(v, hz(m + 12), t0 + k * 0.05, B * 3, { gain: 0.012, attack: 1.8 }); });
    note(v, hz(lowOct(c.root)), t0, B * 4, { gain: 0.14, attack: 0.8 });
    melody(v, t0, B, { chance: 0.5 });
  },
  lofi(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length]; const sw = B * 0.18;
    [0, 1.5, 2.5].forEach((b, k) => c.notes.forEach((m, j) => note(v, hz(m), t0 + b * B + (k ? sw : 0) + j * 0.015, B * (k === 0 ? 1.4 : 0.9), { gain: 0.04, type: 'triangle', detune: j * 5, attack: 0.01 })));
    note(v, hz(lowOct(c.root)), t0, B * 1.8, { gain: 0.15 }); note(v, hz(lowOct(c.root) + 7), t0 + B * 2.5, B * 1.2, { gain: 0.1 });
    thump(v, t0); thump(v, t0 + B * 2, 0.16); noise(v, t0 + B, 0.05, { hp: 1800, dur: 0.09 }); noise(v, t0 + B * 3, 0.05, { hp: 1800, dur: 0.09 });
    for (let e = 0; e < 8; e++) noise(v, t0 + e * B / 2, 0.012);
    for (let k = 0; k < 6; k++) if (v.rng() < 0.5) noise(v, t0 + v.rng() * B * 4, 0.02, { hp: 3000, dur: 0.012 }); // треск винила
    melody(v, t0, B, { chance: 0.6, gain: 0.035, swing: sw });
  },
  bright(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length]; const E = B / 2;
    for (let e = 0; e < 8; e++) note(v, hz(c.notes[e % c.notes.length] + 12), t0 + e * E, E * 1.3, { type: 'triangle', gain: 0.05, attack: 0.005 });
    note(v, hz(lowOct(c.root)), t0, B * 1.2, { gain: 0.15 }); note(v, hz(lowOct(c.root)), t0 + B * 2, B * 1.2, { gain: 0.13 });
    noise(v, t0 + B, 0.04, { hp: 2500, dur: 0.06 }); noise(v, t0 + B * 3, 0.04, { hp: 2500, dur: 0.06 });
    for (let e = 0; e < 8; e++) noise(v, t0 + e * E, 0.014);
    melody(v, t0, B, { chance: 0.9, gain: 0.05 });
  },
  strum(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length]; const E = B / 2;
    // «мандолина»: быстрые повторы ноты и мягкий аккордеонный фон
    c.notes.forEach((m, k) => note(v, hz(m), t0 + k * 0.02, B * 4, { gain: 0.018, type: 'sawtooth', attack: 0.3 }));
    [0, 1.5, 3].forEach((b, k) => c.notes.forEach((m, j) => note(v, hz(m + 12), t0 + b * B + j * 0.025, E, { gain: 0.045, type: 'triangle', attack: 0.004 })));
    for (let r = 0; r < 6; r++) note(v, hz(c.notes[(i + r) % c.notes.length] + 24), t0 + B * 2 + r * E / 3, E / 3, { gain: 0.03, type: 'triangle', attack: 0.003 });
    note(v, hz(lowOct(c.root)), t0, B * 1.2, { gain: 0.14 }); note(v, hz(lowOct(c.root) + 7), t0 + B * 2, B * 1.2, { gain: 0.11 });
    melody(v, t0, B, { chance: 0.7 });
  },
  ballad(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length];
    c.notes.forEach((m, k) => { note(v, hz(m), t0 + k * 0.03, B * 3.8, { gain: 0.05, type: 'triangle', attack: 0.02, detune: k * 2 }); });
    const r = lowOct(c.root);
    [0, 1, 2, 3].forEach((b) => note(v, hz(r + [0, 4, 7, 5][b]), t0 + b * B, B * 0.9, { gain: 0.12, attack: 0.02 }));
    noise(v, t0 + B, 0.02); noise(v, t0 + B * 3, 0.02);
    melody(v, t0, B, { chance: 0.65, gain: 0.04 });
  },
  pulse(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length]; const S = B / 2;
    c.notes.forEach((m, k) => note(v, hz(m), t0 + k * 0.04, B * 4.2, { gain: 0.03, attack: 1.2 }));
    for (let s = 0; s < 8; s++) note(v, hz(c.notes[s % c.notes.length] + 12), t0 + s * S, S * 0.9, { gain: 0.028, attack: 0.01 });
    note(v, hz(lowOct(c.root)), t0, B * 4, { gain: 0.12, attack: 0.6 });
  },
  folk(v, i, t0, B) {
    const c = v.track.prog[i % v.track.prog.length]; const E = B / 2;
    const pick = [0, 2, 1, 2, 3 % c.notes.length, 2, 1, 2];
    for (let e = 0; e < 8; e++) note(v, hz(c.notes[pick[e] % c.notes.length] + (e % 4 === 0 ? 0 : 12)), t0 + e * E, B * 1.1, { gain: 0.05, type: 'triangle', attack: 0.004 });
    note(v, hz(lowOct(c.root)), t0, B * 1.8, { gain: 0.14 }); note(v, hz(lowOct(c.root) + 7), t0 + B * 2, B * 1.8, { gain: 0.1 });
    melody(v, t0, B, { chance: 0.55, gain: 0.04 });
  },
};

/* ───────── воспроизведение треков ───────── */

function makeVoice(track, startBar = 0) {
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = track.cut; filter.Q.value = 0.4;
  const gain = ctx.createGain(); gain.gain.value = 0.0001;
  filter.connect(gain); gain.connect(fx);
  const B = 60 / track.bpm;
  return { track, filter, gain, B, step: startBar, rng: rngOf(track.seed + startBar * 7919), nextAt: ctx.currentTime + 0.1, tStart: ctx.currentTime + 0.1 - startBar * B * 4, startBar, dead: false };
}
function fadeIn(v, sec = 2.5) { v.gain.gain.cancelScheduledValues(ctx.currentTime); v.gain.gain.setValueAtTime(0.0001, ctx.currentTime); v.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + sec); }
function retire(v, sec = 2.5) {
  if (!v) return;
  v.dead = true;
  v.gain.gain.cancelScheduledValues(ctx.currentTime); v.gain.gain.setValueAtTime(v.gain.gain.value, ctx.currentTime); v.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + sec);
  setTimeout(() => { try { v.filter.disconnect(); v.gain.disconnect(); } catch { /* */ } }, sec * 1000 + 3500);
}

function pump() {
  if (!voice || voice.dead || paused) return;
  const v = voice; const total = v.track.bars;
  while (v.nextAt < ctx.currentTime + 1.5 && v.step < total + 1) {
    if (v.step < total) STYLE[v.track.style](v, v.step, v.nextAt, v.B);
    v.step++; v.nextAt += v.B * 4;
  }
  // конец трека: следующий включаем с перекрытием, пока этот ещё звучит
  const left = v.tStart + total * v.B * 4 - ctx.currentTime;
  if (left < 3 && !v.ending) { v.ending = true; advance(true); }
}

function startTrack(track, { startBar = 0, fade = true } = {}) {
  init();
  const old = voice;
  voice = makeVoice(track, startBar);
  if (fade) fadeIn(voice); else { voice.gain.gain.value = 1; }
  retire(old, fade ? 2.5 : 0.3);
  clearInterval(pumpT); pumpT = setInterval(pump, 350);
  playing = true; paused = false;
  store.set({ music2: { ...store.get().music2, coll: track.coll, track: track.n } }, { silent: true });
  pump(); emit();
}

/* ───────── очередь ───────── */

const m2 = () => store.get().music2;
function buildQueue(coll, fromTrack) {
  const list = tracksOf(coll).map((t) => t.id);
  if (m2().shuffle) {
    const first = list[fromTrack];
    const rest = list.filter((x) => x !== first).sort(() => Math.random() - 0.5);
    queue = [first, ...rest];
  } else queue = [...list.slice(fromTrack), ...list.slice(0, fromTrack)];
  qIndex = 0;
}
const currentId = () => queue[qIndex];

function advance(auto) {
  const rep = m2().repeat;
  if (auto && rep === 'one') { startTrack(voice.track, { fade: true }); return; }
  if (qIndex + 1 >= queue.length) {
    if (rep === 'off' && auto) { playing = false; stop(); return; }
    buildQueue(voice.track.coll, 0); startTrack(TRACK_BY_ID[currentId()]); return;
  }
  qIndex++; startTrack(TRACK_BY_ID[currentId()]);
}

/* ───────── публичный интерфейс ───────── */

export const isOn = () => playing && !paused;
export const isActive = () => playing;
export const isPaused = () => paused;
export const current = () => voice?.track || TRACK_BY_ID[`${m2().coll}-${m2().track + 1}`] || TRACKS[0];
export const getVolume = () => vol;
export const isMuted = () => muted;
export const isDucked = () => ducked;
export const getQueue = () => queue.map((id) => TRACK_BY_ID[id]);
export const queueIndex = () => qIndex;
export const duration = () => (voice ? voice.track.bars * voice.B * 4 : current().bars * (60 / current().bpm) * 4);
export const position = () => (voice && ctx ? Math.max(0, Math.min(duration(), ctx.currentTime - voice.tStart)) : 0);
export const favs = () => m2().favs;
export const isFav = (id = current().id) => m2().favs.includes(id);
export const sleepLeft = () => (sleepAt ? Math.max(0, Math.round((sleepAt - Date.now()) / 60000)) : 0);

/** Включает подборку (с указанного трека) или продолжает текущую */
export function start(coll = m2().coll, trackN = m2().track) {
  try {
    init();
    if (ctx.resume) ctx.resume();
    if (paused && voice) { paused = false; ctx.resume(); emit(); return; }
    if (playing && voice && voice.track.coll === coll && voice.track.n === trackN) return;
    buildQueue(coll, trackN);
    startTrack(TRACK_BY_ID[currentId()]);
  } catch { playing = false; }
  emit();
}
export function pause() { if (!playing || paused || !ctx) return; paused = true; ctx.suspend(); emit(); }
export function stop() {
  if (!ctx) return;
  clearInterval(pumpT); if (ctx.state === 'suspended') ctx.resume();
  retire(voice, 0.6); voice = null; playing = false; paused = false; setSleep(0); emit();
}
export function toggle() { if (!playing) start(); else if (paused) start(); else pause(); return isOn(); }
export function next() { if (!playing) { start(); return; } if (paused) { paused = false; ctx.resume(); } advance(false); }
export function prev() {
  if (!playing) { start(); return; }
  if (paused) { paused = false; ctx.resume(); }
  if (position() > 5) { startTrack(voice.track, { fade: false }); return; }
  qIndex = (qIndex - 1 + queue.length) % queue.length; startTrack(TRACK_BY_ID[currentId()]);
}
export function playCollection(coll, n = 0) { start(coll, n); if (playing && voice && (voice.track.coll !== coll || voice.track.n !== n)) { buildQueue(coll, n); startTrack(TRACK_BY_ID[currentId()]); } }
export function playTrack(id) { const t = TRACK_BY_ID[id]; if (t) { buildQueue(t.coll, t.n); startTrack(t); } }
export function enqueueNext(id) { if (!queue.length) return; queue = queue.filter((x, i) => x !== id || i <= qIndex); queue.splice(qIndex + 1, 0, id); emit(); }
export function seek(frac) {
  if (!voice || !ctx) return;
  const bar = Math.max(0, Math.min(voice.track.bars - 2, Math.floor(frac * voice.track.bars)));
  startTrack(voice.track, { startBar: bar, fade: false });
}
export function setVolume(v) { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.setTargetAtTime(outLevel(), ctx.currentTime, 0.05); emit(); }
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(outLevel(), ctx.currentTime, 0.05); emit(); }
export function duck(on) { ducked = on; if (master) master.gain.setTargetAtTime(outLevel(), ctx.currentTime, 0.15); }
export function toggleFav(id = current().id) {
  const f = m2().favs; store.set({ music2: { ...m2(), favs: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] } }, { silent: true }); emit();
}
export function setRepeat(mode) { store.set({ music2: { ...m2(), repeat: mode } }, { silent: true }); emit(); }
export function setShuffle(on) {
  store.set({ music2: { ...m2(), shuffle: on } }, { silent: true });
  if (playing && voice) { const t = voice.track; buildQueue(t.coll, t.n); }
  emit();
}
export function setSleep(min) {
  clearTimeout(sleepTimer);
  sleepAt = min ? Date.now() + min * 60000 : 0;
  if (min) sleepTimer = setTimeout(() => { sleepAt = 0; stop(); }, min * 60000);
  emit();
}
/** Для тестов: текущая выходная громкость (с учётом приглушения и mute) */
export const _level = () => outLevel();
export function init2() { vol = store.get().musicVol ?? 0.5; muted = !!store.get().music2?.muted; }
export const trackTitle = (t, lang) => t.title[lang] || t.title.en;
