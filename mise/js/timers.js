// Общие таймеры кухни: любое количество одновременно, с названиями, на любом экране.
// Считают по времени окончания, а не по тикам, поэтому после сворачивания и перезапуска показывают верный остаток.
// Состояние сохраняется в store (timersState) и восстанавливается при запуске.
import { buzz } from './haptics.js';
import * as store from './store.js';
import * as music from './music.js';

let seq = 0;
const timers = new Map();
const subs = new Set();
let tick = null;
let audio = null;
let ringTimer = null;
let saveT = null;

export const SOUNDS = ['bell', 'chime', 'digital', 'soft'];
export const PRESETS = [1, 3, 5, 10, 15, 20, 30, 60];

const emit = () => { subs.forEach((f) => f(list())); save(); };
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const list = () => [...timers.values()];
export const running = () => list().filter((t) => t.running);
export const ringing = () => list().filter((t) => t.done && !t.ack);
export const sound = () => store.get().alarm || 'bell';

function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { store.set({ timersState: list().map(({ id, key, label, total, left, running: r, end, done, ack, sound: sd, recipe }) => ({ id, key, label, total, left, running: r, end, done, ack, sound: sd, recipe })) }, { silent: true }); } catch { /* */ } }, 120);
}

/** Восстановление после перезапуска: идущие таймеры досчитываются по времени окончания */
export function restore() {
  for (const x of store.get().timersState || []) {
    const t = { ...x };
    seq = Math.max(seq, t.id || 0);
    if (t.running) {
      const left = Math.max(0, Math.ceil((t.end - Date.now()) / 1000));
      t.left = left;
      if (!left) { t.running = false; t.done = true; t.ack = false; t.missed = true; }
    }
    timers.set(t.id, t);
  }
  if (running().length) ensureLoop();
  subs.forEach((f) => f(list()));
}

/* ───────── звук ───────── */

export function unlockAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.resume) audio.resume();
  } catch { /* */ }
}

function tone(freq, t0, dur, { type = 'sine', gain = 0.3 } = {}) {
  const o = audio.createOscillator(); const g = audio.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}

/** Один сигнал выбранного звука. Громче музыки: музыка на это время приглушается */
export function playSound(kind = sound()) {
  try {
    unlockAudio();
    const t0 = audio.currentTime;
    if (kind === 'bell') [0, 0.28, 0.56].forEach((d) => tone(880, t0 + d, 0.24));
    else if (kind === 'chime') [[659, 0], [880, 0.2], [1175, 0.4]].forEach(([f, d]) => tone(f, t0 + d, 0.5, { type: 'triangle', gain: 0.28 }));
    else if (kind === 'digital') [0, 0.14, 0.28, 0.42].forEach((d) => tone(1000, t0 + d, 0.09, { type: 'square', gain: 0.12 }));
    else [[523, 0], [659, 0.35]].forEach(([f, d]) => tone(f, t0 + d, 0.7, { gain: 0.3 }));
  } catch { /* */ }
}

export function beep() { playSound(); try { buzz('alarm'); } catch { /* */ } }

/** Сигнал повторяется каждые ~3 секунды до подтверждения (или 45 секунд) */
function startRinging() {
  if (ringTimer) return;
  let n = 0;
  music.duck(true);
  const once = () => {
    if (!ringing().length || n++ > 15) { stopRinging(); return; }
    beep();
  };
  once();
  ringTimer = setInterval(once, 3000);
}
function stopRinging() { clearInterval(ringTimer); ringTimer = null; music.duck(false); }

let onDone = () => {};
export const setOnDone = (fn) => { onDone = fn; };

function notify(t) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    const body = t.label;
    if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then((r) => r.showNotification('Mise', { body, tag: `timer-${t.id}`, requireInteraction: true })).catch(() => new Notification('Mise', { body }));
    else new Notification('Mise', { body });
  } catch { /* */ }
}

function loop() {
  const now = Date.now();
  let changed = false;
  for (const t of timers.values()) {
    if (!t.running) continue;
    const left = Math.max(0, Math.ceil((t.end - now) / 1000));
    if (left !== t.left) { t.left = left; changed = true; }
    if (left === 0) { t.running = false; t.done = true; t.ack = false; changed = true; startRinging(); notify(t); onDone(t); }
  }
  if (changed) emit();
  if (!running().length && tick) { clearInterval(tick); tick = null; }
}
const ensureLoop = () => { if (!tick) tick = setInterval(loop, 250); };

/* ───────── управление ───────── */

/** Создаёт таймер (не запуская). Для запуска одной кнопкой используйте start() */
export function add(label, seconds, { key = null, recipe = null, snd = null } = {}) {
  const t = { id: ++seq, key, label, total: seconds, left: seconds, running: false, done: false, ack: true, end: 0, sound: snd, recipe };
  timers.set(t.id, t);
  emit();
  return t;
}

/** Запускает таймер. key нужен, чтобы не создавать дубли (например, «рецепт:шаг») */
export function start(label, seconds, key = null, opts = {}) {
  unlockAudio();
  let t = key && list().find((x) => x.key === key);
  if (!t) t = add(label, seconds, { key, ...opts });
  if (t.done) { t.left = t.total; t.done = false; }
  t.ack = true;
  t.end = Date.now() + t.left * 1000;
  t.running = true;
  ensureLoop();
  emit();
  return t;
}
export const find = (key) => list().find((t) => t.key === key);
export const get = (id) => timers.get(id);
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
  t.left = t.total; t.running = false; t.done = false; t.ack = true;
  emit();
}
/** Меняет время (в секундах) и название; если таймер идёт, остаток пересчитывается */
export function edit(id, { seconds, label, snd }) {
  const t = timers.get(id);
  if (!t) return;
  if (label != null) t.label = label;
  if (snd !== undefined) t.sound = snd;
  if (seconds != null && seconds > 0) {
    t.total = seconds; t.left = seconds; t.done = false; t.ack = true;
    if (t.running) t.end = Date.now() + seconds * 1000;
  }
  emit();
}
/** Добавляет или убирает время у таймера */
export function bump(id, seconds) {
  const t = timers.get(id);
  if (!t) return;
  if (t.done) { t.done = false; t.left = 0; }
  t.left = Math.max(1, t.left + seconds); t.total = Math.max(t.total, t.left);
  if (t.running) t.end = Date.now() + t.left * 1000;
  emit();
}
/** «Хватит звонить»: подтверждает сигнал, но оставляет таймер в списке */
export function ack(id) { const t = timers.get(id); if (t) { t.ack = true; if (!ringing().length) stopRinging(); emit(); } }
export function ackAll() { for (const t of list()) t.ack = true; stopRinging(); emit(); }
export function remove(id) { timers.delete(id); if (!ringing().length) stopRinging(); emit(); }
export function clearDone() { for (const t of list()) if (t.done) timers.delete(t.id); stopRinging(); emit(); }
export const fmt = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};
/** Доля пройденного, 0..1 */
export const progress = (t) => (t.total ? Math.min(1, Math.max(0, (t.total - t.left) / t.total)) : 0);

/* ───────── секундомер ───────── */

export const sw = {
  state: () => store.get().stopwatch,
  elapsed(now = Date.now()) { const s = store.get().stopwatch; return s.base + (s.running ? now - s.start : 0); },
  start() { const s = store.get().stopwatch; if (!s.running) store.set({ stopwatch: { ...s, running: true, start: Date.now() } }, { silent: true }); },
  pause() { const s = store.get().stopwatch; if (s.running) store.set({ stopwatch: { ...s, running: false, base: s.base + Date.now() - s.start } }, { silent: true }); },
  lap() { const s = store.get().stopwatch; const e = sw.elapsed(); store.set({ stopwatch: { ...s, laps: [...s.laps, e] } }, { silent: true }); },
  reset() { store.set({ stopwatch: { running: false, base: 0, start: 0, laps: [] } }, { silent: true }); },
};
/** 01:02.34 — минуты, секунды и сотые */
export const fmtMs = (ms) => {
  const c = Math.floor(ms / 10) % 100; const s = Math.floor(ms / 1000) % 60; const m = Math.floor(ms / 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(m)}:${p(s)}.${p(c)}`;
};
