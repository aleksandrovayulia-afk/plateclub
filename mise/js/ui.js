// Общие помощники интерфейса: разметка, иконки, тосты, нижний лист
import { CATEGORIES, CUISINES } from './data/recipes/index.js';
import { rtext } from './engine.js';
import { t, currentLang } from './i18n.js';
import { photoSrc, photoPos } from './data/photos.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const catOf = (r) => CATEGORIES.find((c) => c.id === r.c);
export const catName = (id) => CATEGORIES.find((c) => c.id === id).n[currentLang()];
export const cuisine = (id) => CUISINES[id]?.[currentLang()] || '';
export const levelLabel = (lv) => t(`level.${lv}`);

export function timeLabel(min) {
  if (min < 60) return t('common.min', { n: min });
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? t('common.hourmin', { h, m }) : t('common.hour', { h });
}

export const photo = (r) => `<img class="ph" src="${photoSrc(r, r.text.ru.t + ' ' + r.text.en.t)}" style="object-position:${photoPos(r.id)}" alt="" loading="lazy" decoding="async" draggable="false">`;
export const tile = (r, cls = '') => `<span class="tile ${cls}" style="--t:${catOf(r).tint}" aria-hidden="true">${photo(r)}</span>`;

export function recipeRow(r, { note = '', locked = null, fav = false, best = false, sub = null } = {}) {
  const tx = rtext(r);
  return `<a class="rrow${locked ? ' locked' : ''}${best ? ' best' : ''}" href="#/r/${r.id}">
    ${tile(r)}
    <span class="rrow-body">
      <span class="rrow-t">${esc(tx.t)}${fav ? ' <span class="heart" aria-label="♥">♥</span>' : ''}</span>
      <span class="rrow-m">${sub ?? `${timeLabel(r.min)} · ${levelLabel(r.lv)}`}</span>
      ${note ? `<span class="rrow-n">${note}</span>` : ''}
      ${locked ? `<span class="rrow-n lock">${esc(locked)}</span>` : ''}
    </span>
    <span class="chev" aria-hidden="true">${icons.chev}</span>
  </a>`;
}

export function recipeCard(r, { locked = null, fav = false, badge = '' } = {}) {
  const tx = rtext(r);
  return `<a class="rc${locked ? ' locked' : ''}" href="#/r/${r.id}">
    ${tile(r, 'big')}
    ${fav ? '<span class="rc-fav" aria-hidden="true">♥</span>' : ''}
    ${badge ? `<span class="rc-badge">${esc(badge)}</span>` : ''}
    <span class="rc-t">${esc(tx.t)}</span>
    <span class="rc-m">${timeLabel(r.min)} · ${levelLabel(r.lv)}</span>
    ${locked ? `<span class="rc-lock">${esc(locked)}</span>` : ''}
  </a>`;
}

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const icons = {
  home: svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h3.5v-5h3V20H17a1 1 0 0 0 1-1v-9"/>'),
  book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7"/>'),
  fridge: svg('<rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M5 10h14M9 6v1.5M9 13v3"/>'),
  spark: svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>'),
  menu: svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>'),
  music: svg('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  globe: svg('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.500 3.500 8.500S14.500 18 12 20.500C9.500 18 8.500 15 8.500 12S9.500 6 12 3.500z"/>'),
  calendar: svg('<rect x="4" y="5.5" width="16" height="14.500" rx="3"/><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4"/>'),
  cart: svg('<path d="M3 4h2.500l2 11h10l2-8H7"/><circle cx="9" cy="19.500" r="1.200"/><circle cx="17" cy="19.500" r="1.200"/>'),
  heart: svg('<path d="M12 20.500s-7.500-4.600-9-9.400C2 7.800 4.200 5 7.200 5c1.900 0 3.400 1 4.800 2.800C13.400 6 14.900 5 16.800 5 19.800 5 22 7.800 21 11.100c-1.500 4.800-9 9.400-9 9.400z"/>'),
  tool: svg('<path d="M14.500 6.500a4 4 0 0 0-5 5L4 17l3 3 5.500-5.500a4 4 0 0 0 5-5l-2.500 2.500-2.500-.5-.5-2.500z"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>'),
  check: svg('<path d="M5 12.500l4.500 4.500L19 7.500"/>', 'stroke-width="2.4"'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 'stroke-width="2"'),
  chev: svg('<path d="M9 6l6 6-6 6"/>', 'stroke-width="2"'),
  back: svg('<path d="M15 6l-6 6 6 6"/>', 'stroke-width="2"'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2"'),
  minus: svg('<path d="M5 12h14"/>', 'stroke-width="2"'),
  share: svg('<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6.500A1.500 1.500 0 0 0 6.500 20h11a1.500 1.500 0 0 0 1.500-1.500V12"/>'),
  star: svg('<path d="M12 3.500l2.600 5.400 5.900.8-4.300 4.100 1 5.800L12 16.800 6.800 19.600l1-5.800-4.300-4.100 5.900-.8z"/>'),
  play: svg('<path d="M8 5.500v13l11-6.500z"/>'),
  skip: svg('<path d="M6 5.500l9 6.500-9 6.500z"/><path d="M18 5.500v13"/>'),
  pause: svg('<path d="M8 5.500v13M16 5.500v13"/>', 'stroke-width="2.6"'),
  volume: svg('<path d="M4 9.500v5h3.500l5 4v-13l-5 4z"/><path d="M16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11"/>'),
  timer: svg('<circle cx="12" cy="13.500" r="7.500"/><path d="M12 9.500v4l2.500 1.500M9.500 2.500h5"/>'),
  trash: svg('<path d="M4.500 7h15M9.500 7V4.500h5V7M6.500 7l.8 12.500h9.400L17.500 7"/>'),
  copy: svg('<rect x="8.500" y="8.500" width="11" height="11" rx="2.500"/><path d="M15.500 8.500v-2A2.500 2.500 0 0 0 13 4H6.500A2.500 2.500 0 0 0 4 6.500V13a2.500 2.500 0 0 0 2.500 2.500h2"/>'),
  filter: svg('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  shuffle: svg('<path d="M4 7h3.500c3 0 4 2 5 5s2 5 5 5H20M4 17h3.500c1.500 0 2.600-.7 3.400-2M13 8.500c.8-1 2-1.500 3.500-1.500H20M17.500 4.500L20 7l-2.500 2.500M17.500 14.500L20 17l-2.500 2.500"/>'),
  flame: svg('<path d="M12 21c-3.500 0-6-2.300-6-5.500 0-2.500 1.500-4 2.500-5.500 1-1.500 1-3 .5-5 3 1 5 3.500 5 6.500 1-.5 1.500-1.500 1.500-3 1.500 1.500 2.500 3.500 2.500 6 0 3.500-2.500 6.500-6 6.500z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600l1.400 1.400M17 17l1.400 1.400M5.600 18.400L7 17M17 7l1.400-1.400"/>'),
  moon: svg('<path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z"/>'),
  download: svg('<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/>'),
  upload: svg('<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 19h14"/>'),
  send: svg('<path d="M12 19V5M5 12l7-7 7 7"/>', 'stroke-width="2"'),
  info: svg('<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.1"/>', 'stroke-width="2"'),
  book2: svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>'),
  fire: svg('<path d="M12 3c1 4-3 5-3 9a4 4 0 0 0 8 0c0-2-1-3-1.500-4.500C14 9 13 8 12 3z"/>'),
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
export function openSheet(html, { onClose, tall = false } = {}) {
  const root = $('#sheet-root');
  lastFocus = document.activeElement;
  root.innerHTML = `<div class="backdrop" data-act="close-sheet"></div><section class="sheet${tall ? ' tall' : ''}" role="dialog" aria-modal="true"><span class="grab" aria-hidden="true"></span>${html}</section>`;
  root.classList.add('open');
  document.body.classList.add('noscroll');
  root.onClose = onClose;
  const first = root.querySelector('[autofocus]');
  if (first) first.focus({ preventScroll: true });
  dragToClose(root.querySelector('.sheet'));
}

/** Закрытие шторки свайпом вниз: тянуть можно за верх шторки, пока содержимое не прокручено */
function dragToClose(sheet) {
  let y0 = null; let dy = 0;
  sheet.addEventListener('touchstart', (e) => { if (sheet.scrollTop <= 0 && e.touches[0].clientY - sheet.getBoundingClientRect().top < 72) { y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; } }, { passive: true });
  sheet.addEventListener('touchmove', (e) => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
  const end = () => {
    if (y0 === null) return;
    y0 = null; sheet.style.transition = ''; sheet.style.transform = '';
    if (dy > 90) closeSheet();
  };
  sheet.addEventListener('touchend', end); sheet.addEventListener('touchcancel', end);
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

/* Плюрализация для текстов вида «5 рецептов» */
export const count = (key, n) => t(key, { n });
