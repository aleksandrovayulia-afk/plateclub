// Режим готовки: один шаг на экране, таймеры в фоне, озвучка, экран не гаснет
import { BY_ID, rtext, toFahrenheit } from '../engine.js';
import { ING } from '../data/ingredients.js';
import { fmtQty } from '../qty.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import * as timers from '../timers.js';
import { esc, icons, openSheet } from '../ui.js';

let cur = null; // { id, i, done }
let wake = null;
const VOICE = { ru: 'ru-RU', en: 'en-US', es: 'es-ES' };

const timerKey = () => `${cur.id}:${cur.i}`;

export function start(id) {
  if (!cur || cur.id !== id) cur = { id, i: 0, done: false };
  acquireWake();
}

export function stop() {
  releaseWake();
  stopSpeech();
}

async function acquireWake() {
  try {
    if (store.get().wake && 'wakeLock' in navigator && !wake) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch { /* не поддерживается */ }
}
function releaseWake() { try { wake && wake.release(); } catch { /* */ } wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cur) acquireWake(); });

function stopSpeech() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* */ } }
function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    stopSpeech();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE[currentLang()];
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* */ }
}

const stepText = (r, s) => {
  const raw = rtext(r).steps[cur.i].text;
  return s.units === 'imperial' && currentLang() === 'en' ? toFahrenheit(raw) : raw;
};

export function paint() {
  if (!cur) return;
  const big = document.querySelector('[data-timer-big]');
  const tm = timers.find(timerKey());
  if (big && tm) {
    big.textContent = timers.fmt(tm.left);
    big.classList.toggle('done', tm.done);
    const btn = document.querySelector('[data-act="timer-toggle"]');
    if (btn) btn.textContent = timerLabel(tm);
  }
  const others = document.querySelector('[data-others]');
  if (others) others.innerHTML = otherTimers();
}

const timerLabel = (tm) => (tm.done ? t('cook.timer.done') : tm.running ? t('cook.timer.pause') : tm.left < tm.total ? t('cook.timer.resume') : t('cook.timer.start'));

function otherTimers() {
  return timers.list()
    .filter((x) => x.key && x.key.startsWith(`${cur.id}:`) && x.key !== timerKey() && (x.running || x.done))
    .map((x) => `<button class="pill-timer${x.done ? ' done' : ''}" data-act="goto-step" data-i="${x.key.split(':')[1]}">${icons.timer}${t('cook.step', { n: Number(x.key.split(':')[1]) + 1 })} · ${x.done ? t('cook.timer.ready') : timers.fmt(x.left)}</button>`)
    .join('');
}

export function render(s, id) {
  const r = BY_ID[id];
  if (!r) return `<p>${t('recipe.notfound')}</p>`;
  if (!cur || cur.id !== id) start(id);
  const tx = rtext(r);
  const total = tx.steps.length;

  if (cur.done) {
    return `<div class="cook finish">
      <div class="finish-e">${r.e}</div>
      <h1>${t('cook.done.title')}</h1>
      <p class="sub">${t('cook.done.text', { title: esc(tx.t) })}</p>
      <div class="rate big" role="radiogroup" aria-label="${t('recipe.rate')}">${[1, 2, 3, 4, 5].map((v) => `<button class="star${v <= (s.ratings[id] || 0) ? ' on' : ''}" data-act="rate" data-id="${id}" data-v="${v}" role="radio" aria-label="${v}">${icons.star}</button>`).join('')}</div>
      <a class="btn primary big" href="#/r/${id}">${t('cook.done.back')}</a>
      <a class="btn ghost" href="#/fridge">${t('cook.done.more')}</a>
    </div>`;
  }

  const step = tx.steps[cur.i];
  const tm = step.min ? timers.find(timerKey()) || { total: step.min * 60, left: step.min * 60, running: false, done: false } : null;
  const last = cur.i === total - 1;
  if (s.voice) setTimeout(() => speak(stepText(r, s)), 150);

  return `<div class="cook" data-swipe>
    <div class="cook-bar">
      <button class="icon-btn" data-act="cook-exit" aria-label="${t('cook.exit')}">${icons.close}</button>
      <div class="cook-prog" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${cur.i + 1}"><i style="width:${((cur.i + 1) / total) * 100}%"></i></div>
      <button class="icon-btn${s.voice ? ' on' : ''}" data-act="cook-voice" aria-pressed="${s.voice}" aria-label="${t('cook.voice')}">${icons.volume}</button>
      <button class="icon-btn" data-act="cook-ings" aria-label="${t('recipe.ings')}">${icons.cart}</button>
    </div>
    <p class="cook-count">${t('cook.stepOf', { n: cur.i + 1, total })} · ${esc(tx.t)}</p>
    <div class="cook-step"><p>${esc(stepText(r, s))}</p></div>
    ${tm ? `<div class="timer">
      <div class="timer-big${tm.done ? ' done' : ''}" data-timer-big>${timers.fmt(tm.left)}</div>
      <button class="btn" data-act="timer-toggle">${timerLabel(tm)}</button>
      ${tm.left < tm.total || tm.done ? `<button class="link" data-act="timer-reset">${t('cook.timer.reset')}</button>` : ''}
    </div>` : ''}
    <div class="others" data-others>${otherTimers()}</div>
    <div class="cook-nav">
      <button class="btn" data-act="cook-prev" ${cur.i === 0 ? 'disabled' : ''}>${t('common.back')}</button>
      <button class="btn primary" data-act="cook-next">${last ? t('cook.finish') : t('cook.next')}</button>
    </div>
  </div>`;
}

export function onClick(act, el) {
  if (!cur) return false;
  const s = store.get();
  const r = BY_ID[cur.id];
  const n = rtext(r).steps.length;
  switch (act) {
    case 'cook-next':
      if (cur.i >= n - 1) {
        cur.done = true;
        store.set({ cooked: { ...s.cooked, [cur.id]: Date.now() } });
        stopSpeech();
      } else { cur.i++; store.set({}); }
      return true;
    case 'cook-prev': if (cur.i > 0) { cur.i--; store.set({}); } return true;
    case 'goto-step': cur.i = Number(el.dataset.i); store.set({}); return true;
    case 'cook-exit': { const id = cur.id; cur = null; stop(); location.hash = `#/r/${id}`; return true; }
    case 'cook-voice': store.set({ voice: !s.voice }); if (s.voice) stopSpeech(); return true;
    case 'cook-ings': {
      const k = 1;
      const rows = r.ing.map((x) => `<li class="ing${x.opt ? ' opt' : ''}"><span class="ing-n">${ING[x.id].e} ${esc(ING[x.id].n[currentLang()])}${x.opt ? ` <em>${t('recipe.optional')}</em>` : ''}</span><span class="ing-q">${esc(fmtQty(x.q, { scale: k, imp: s.units === 'imperial' }))}</span></li>`).join('');
      openSheet(`<h2>${t('recipe.ings')}</h2><ul class="ings">${rows}</ul><button class="btn full" data-act="close-sheet">${t('common.close')}</button>`);
      return true;
    }
    case 'timer-toggle': {
      const step = rtext(r).steps[cur.i];
      const tm = timers.find(timerKey());
      if (!tm) timers.start(`${rtext(r).t} · ${t('cook.step', { n: cur.i + 1 })}`, step.min * 60, timerKey());
      else if (tm.done) timers.reset(tm.id);
      else if (tm.running) timers.pause(tm.id);
      else timers.resume(tm.id);
      paint();
      return true;
    }
    case 'timer-reset': { const tm = timers.find(timerKey()); if (tm) timers.reset(tm.id); store.set({}); return true; }
    default: return false;
  }
}

export function bind(root) {
  const el = root.querySelector('[data-swipe]');
  if (!el) return;
  let x0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 70) return;
    onClick(dx < 0 ? 'cook-next' : 'cook-prev', el);
  }, { passive: true });
}

export function onKey(e) {
  if (!cur || cur.done) return;
  if (e.key === 'ArrowRight') onClick('cook-next', document.body);
  else if (e.key === 'ArrowLeft') onClick('cook-prev', document.body);
}

export const active = () => !!cur;
