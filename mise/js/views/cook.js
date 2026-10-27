// Режим готовки: один шаг на экране, таймеры, экран не гаснет
import { BY_ID } from '../engine.js';
import { ING } from '../data/ingredients.js';
import * as store from '../store.js';
import { esc, icons, toast, openSheet } from '../ui.js';

let cur = null; // { id, i, timers: {i: {left, end, running, total}}, done }
let tick = null;
let wake = null;
let audio = null;

const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export function start(id) {
  if (!cur || cur.id !== id) cur = { id, i: 0, timers: {}, done: false };
  acquireWake();
  clearInterval(tick);
  tick = setInterval(update, 250);
}

export function stop() {
  clearInterval(tick);
  tick = null;
  releaseWake();
}

async function acquireWake() {
  try {
    if ('wakeLock' in navigator && !wake) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch { /* не поддерживается — не критично */ }
}
function releaseWake() { try { wake && wake.release(); } catch { /* */ } wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && tick) acquireWake(); });

function beep() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audio.currentTime;
    [0, 0.25, 0.5].forEach((d) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.2);
      o.connect(g).connect(audio.destination);
      o.start(t0 + d);
      o.stop(t0 + d + 0.22);
    });
  } catch { /* */ }
  try { navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 300]); } catch { /* */ }
}

function update() {
  if (!cur) return;
  const now = Date.now();
  for (const [k, t] of Object.entries(cur.timers)) {
    if (!t.running) continue;
    const left = Math.max(0, Math.ceil((t.end - now) / 1000));
    t.left = left;
    if (left === 0) {
      t.running = false;
      t.finished = true;
      beep();
      toast(`Таймер на шаге ${Number(k) + 1} закончился`, 5000);
    }
  }
  paintTimers();
}

function paintTimers() {
  const r = BY_ID[cur.id];
  const t = cur.timers[cur.i];
  const big = document.querySelector('[data-timer-big]');
  if (big && t) {
    big.textContent = fmt(t.left);
    big.classList.toggle('done', !!t.finished);
    const btn = document.querySelector('[data-act="timer-toggle"]');
    if (btn) btn.textContent = t.finished ? 'Таймер закончился' : t.running ? 'Пауза' : t.left < t.total ? 'Продолжить' : 'Запустить таймер';
  }
  const others = document.querySelector('[data-others]');
  if (others) others.innerHTML = otherTimers(r);
}

function otherTimers(r) {
  return Object.entries(cur.timers)
    .filter(([k, t]) => Number(k) !== cur.i && (t.running || t.finished))
    .map(([k, t]) => `<button class="pill-timer${t.finished ? ' done' : ''}" data-act="goto-step" data-i="${k}">${icons.timer}Шаг ${Number(k) + 1} · ${t.finished ? 'готово' : fmt(t.left)}</button>`)
    .join('');
}

export function render(s, id) {
  const r = BY_ID[id];
  if (!r) return '<p>Рецепт не найден</p>';
  if (!cur || cur.id !== id) start(id);
  const total = r.steps.length;

  if (cur.done) {
    return `<div class="cook finish">
      <div class="finish-e">${r.e}</div>
      <h1>Готово!</h1>
      <p class="sub">«${esc(r.t)}» приготовлено. Приятного аппетита!</p>
      <a class="btn primary big" href="#/r/${id}">К рецепту</a>
      <a class="btn ghost" href="#/">Новый рецепт</a>
    </div>`;
  }

  const step = r.steps[cur.i];
  let t = cur.timers[cur.i];
  if (step.min && !t) t = cur.timers[cur.i] = { total: step.min * 60, left: step.min * 60, running: false, finished: false };
  const last = cur.i === total - 1;

  return `<div class="cook" data-swipe>
    <div class="cook-bar">
      <button class="icon-btn" data-act="cook-exit" aria-label="Выйти из режима готовки">${icons.close}</button>
      <div class="cook-prog" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${cur.i + 1}"><i style="width:${((cur.i + 1) / total) * 100}%"></i></div>
      <button class="icon-btn" data-act="cook-ings" aria-label="Ингредиенты">${icons.cart}</button>
    </div>
    <p class="cook-count">Шаг ${cur.i + 1} из ${total} · ${esc(r.t)}</p>
    <div class="cook-step"><p>${esc(step.text)}</p></div>
    ${t ? `<div class="timer">
      <div class="timer-big${t.finished ? ' done' : ''}" data-timer-big>${fmt(t.left)}</div>
      <button class="btn" data-act="timer-toggle">${t.finished ? 'Таймер закончился' : t.running ? 'Пауза' : t.left < t.total ? 'Продолжить' : 'Запустить таймер'}</button>
      ${t.left < t.total || t.finished ? '<button class="link" data-act="timer-reset">Сбросить</button>' : ''}
    </div>` : ''}
    <div class="others" data-others>${otherTimers(r)}</div>
    <div class="cook-nav">
      <button class="btn" data-act="cook-prev" ${cur.i === 0 ? 'disabled' : ''}>Назад</button>
      <button class="btn primary" data-act="cook-next">${last ? 'Готово' : 'Дальше'}</button>
    </div>
  </div>`;
}

export function onClick(act, el) {
  if (!cur) return false;
  const r = BY_ID[cur.id];
  switch (act) {
    case 'cook-next':
      if (cur.i >= r.steps.length - 1) {
        cur.done = true;
        const s = store.get();
        store.set({ cooked: { ...s.cooked, [cur.id]: Date.now() } });
        stop();
      } else cur.i++;
      store.set({}, { silent: false });
      return true;
    case 'cook-prev': if (cur.i > 0) cur.i--; store.set({}); return true;
    case 'goto-step': cur.i = Number(el.dataset.i); store.set({}); return true;
    case 'cook-exit': {
      const id = cur.id;
      cur = null;
      stop();
      location.hash = `#/r/${id}`;
      return true;
    }
    case 'cook-ings': {
      const rows = r.ing.map((x) => `<li class="ing${x.opt ? ' opt' : ''}"><span class="ing-n">${ING[x.id].e} ${esc(ING[x.id].n)}${x.opt ? ' <em>по желанию</em>' : ''}</span><span class="ing-q">${esc(x.qty)}</span></li>`).join('');
      openSheet(`<h2>Ингредиенты</h2><ul class="ings">${rows}</ul><button class="btn full" data-act="close-sheet">Закрыть</button>`);
      return true;
    }
    case 'timer-toggle': {
      const t = cur.timers[cur.i];
      if (!t || t.finished) return true;
      if (t.running) { t.running = false; t.left = Math.max(0, Math.ceil((t.end - Date.now()) / 1000)); }
      else {
        t.end = Date.now() + t.left * 1000;
        t.running = true;
        try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume && audio.resume(); } catch { /* */ }
      }
      paintTimers();
      return true;
    }
    case 'timer-reset': {
      const t = cur.timers[cur.i];
      if (t) { t.left = t.total; t.running = false; t.finished = false; }
      store.set({});
      return true;
    }
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
