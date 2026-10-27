import { buzz } from './haptics.js';
// Общие таймеры кухни: работают в фоне, на любом экране. Используются режимом готовки и разделом «Инструменты».
let seq = 0;
const timers = new Map();
const subs = new Set();
let tick = null;
let audio = null;

const emit = () => subs.forEach((f) => f(list()));
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const list = () => [...timers.values()];
export const running = () => list().filter((t) => t.running);

export function unlockAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.resume) audio.resume();
  } catch { /* */ }
}

export function beep() {
  try {
    unlockAudio();
    const t0 = audio.currentTime;
    [0, 0.28, 0.56].forEach((d) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22);
      o.connect(g).connect(audio.destination);
      o.start(t0 + d);
      o.stop(t0 + d + 0.25);
    });
  } catch { /* */ }
  try { buzz('alarm'); } catch { /* */ }
}

let onDone = () => {};
export const setOnDone = (fn) => { onDone = fn; };

function loop() {
  const now = Date.now();
  let changed = false;
  for (const t of timers.values()) {
    if (!t.running) continue;
    const left = Math.max(0, Math.ceil((t.end - now) / 1000));
    if (left !== t.left) { t.left = left; changed = true; }
    if (left === 0) { t.running = false; t.done = true; beep(); onDone(t); changed = true; }
  }
  if (changed) emit();
  if (!running().length && tick) { clearInterval(tick); tick = null; }
}

const ensureLoop = () => { if (!tick) tick = setInterval(loop, 250); };

/** Запускает таймер. key — чтобы не создавать дубли (например, «рецепт:шаг») */
export function start(label, seconds, key = null) {
  unlockAudio();
  let t = key && list().find((x) => x.key === key);
  if (!t) {
    t = { id: ++seq, key, label, total: seconds, left: seconds, running: false, done: false, end: 0 };
    timers.set(t.id, t);
  }
  if (t.done) { t.left = t.total; t.done = false; }
  t.end = Date.now() + t.left * 1000;
  t.running = true;
  ensureLoop();
  emit();
  return t;
}
export const find = (key) => list().find((t) => t.key === key);
export function pause(id) {
  const t = timers.get(id);
  if (!t) return;
  t.left = Math.max(0, Math.ceil((t.end - Date.now()) / 1000));
  t.running = false;
  emit();
}
export function resume(id) {
  const t = timers.get(id);
  if (!t || t.done) return;
  unlockAudio();
  t.end = Date.now() + t.left * 1000;
  t.running = true;
  ensureLoop();
  emit();
}
export function reset(id) {
  const t = timers.get(id);
  if (!t) return;
  t.left = t.total; t.running = false; t.done = false;
  emit();
}
export function remove(id) { timers.delete(id); emit(); }
export function clearDone() { for (const t of list()) if (t.done) timers.delete(t.id); emit(); }
export const fmt = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};
