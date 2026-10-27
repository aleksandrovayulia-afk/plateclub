// Общие помощники интерфейса
import { CATEGORIES, CUISINES } from './data/recipes/index.js';
import { gearName } from './engine.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const LEVELS = ['', 'Легко', 'Средне', 'Сложно'];
export const cuisine = (id) => CUISINES[id] || '';
export const catOf = (r) => CATEGORIES.find((c) => c.id === r.c);

export function timeLabel(min) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export const tile = (r, cls = '') => `<span class="tile ${cls}" style="--t:${catOf(r).tint}" aria-hidden="true">${r.e}</span>`;

export function lockLabel(gear) {
  return `Нужно: ${gear.map(gearName).join(', ')}`;
}

export function recipeRow(r, { note = '', locked = null, fav = false, best = false } = {}) {
  return `<a class="rrow${locked ? ' locked' : ''}${best ? ' best' : ''}" href="#/r/${r.id}">
    ${tile(r)}
    <span class="rrow-body">
      <span class="rrow-t">${esc(r.t)}${fav ? ' <span class="heart" aria-label="В избранном">♥</span>' : ''}</span>
      <span class="rrow-m">${timeLabel(r.min)} · ${LEVELS[r.lv]}</span>
      ${note ? `<span class="rrow-n">${note}</span>` : ''}
      ${locked ? `<span class="rrow-n lock">${esc(locked)}</span>` : ''}
    </span>
    <span class="chev" aria-hidden="true">${icons.chev}</span>
  </a>`;
}

export function recipeCard(r, { locked = null, fav = false } = {}) {
  return `<a class="rc${locked ? ' locked' : ''}" href="#/r/${r.id}">
    ${tile(r, 'big')}
    ${fav ? '<span class="rc-fav" aria-label="В избранном">♥</span>' : ''}
    <span class="rc-t">${esc(r.t)}</span>
    <span class="rc-m">${timeLabel(r.min)} · ${LEVELS[r.lv]}</span>
    ${locked ? `<span class="rc-lock">${esc(locked)}</span>` : ''}
  </a>`;
}

export const icons = {
  fridge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M5 10h14M9 6v1.5M9 13v3"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/></svg>',
  pan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="14" r="6.5"/><path d="M15.5 14H22"/><path d="M6 14h6"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9-9.4C2 7.800 4.200 5 7.200 5c1.900 0 3.400 1 4.800 2.800C13.400 6 14.900 5 16.800 5 19.800 5 22 7.800 21 11.100c-1.500 4.800-9 9.400-9 9.400z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.500" r="7.500"/><path d="M12 9.500v4l2.500 1.500M9.500 2.500h5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.500" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.500l2 11h10l2-8H7"/><circle cx="9" cy="19.500" r="1.200"/><circle cx="17" cy="19.500" r="1.200"/></svg>',
};

/* ───────── Тосты ───────── */
let toastTimer;
export function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* ───────── Нижний лист ───────── */
let lastFocus = null;
export function openSheet(html, { onClose } = {}) {
  const root = $('#sheet-root');
  lastFocus = document.activeElement;
  root.innerHTML = `<div class="backdrop" data-act="close-sheet"></div><section class="sheet" role="dialog" aria-modal="true"><span class="grab" aria-hidden="true"></span>${html}</section>`;
  root.classList.add('open');
  document.body.classList.add('noscroll');
  root.onClose = onClose;
  const first = root.querySelector('[autofocus], button, input');
  if (first) first.focus({ preventScroll: true });
}
export function closeSheet() {
  const root = $('#sheet-root');
  if (!root.classList.contains('open')) return;
  root.classList.remove('open');
  document.body.classList.remove('noscroll');
  const cb = root.onClose;
  root.onClose = null;
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 260);
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  if (cb) cb();
}
