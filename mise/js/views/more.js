// Меню «Ещё»: понятный список разделов с пояснениями
import { t } from '../i18n.js';
import * as store from '../store.js';
import { icons } from '../ui.js';

export function render(s) {
  const open = s.shop.filter((x) => !x.done).length;
  const planned = Object.values(s.plan).reduce((n, d) => n + Object.keys(d).length, 0);
  const items = [
    ['plan', icons.calendar, t('nav.plan'), t('more.plan'), planned ? String(planned) : ''],
    ['shop', icons.cart, t('nav.shop'), t('more.shop'), open ? String(open) : ''],
    ['saved', icons.heart, t('nav.saved'), t('more.saved'), s.favs.length ? String(s.favs.length) : ''],
    ['music', icons.music, t('music.title'), t('more.music'), ''],
    ['kitchen', icons.fridge, t('kitchen.title'), t('more.kitchen'), ''],
    ['tools', icons.timer, t('nav.tools'), t('more.tools'), ''],
    ['settings', icons.gear, t('settings.title'), t('more.settings'), ''],
  ];
  return `<header class="top"><h1>${t('more.title')}</h1><p class="sub">${t('more.sub')}</p></header>
    <nav class="menu-list" aria-label="${t('more.title')}">${items.map(([id, icon, title, sub, badge]) => `${id === 'music' ? `<button class="menu-i" data-act="music-sheet">` : `<a class="menu-i" href="#/${id}">`}<span class="mi-ic">${icon}</span><span class="mi-b"><b>${title}</b><span>${sub}</span></span>${badge ? `<i class="dot">${badge}</i>` : ''}<span class="chev">${icons.chev}</span>${id === 'music' ? '</button>' : '</a>'}`).join('')}</nav>
    <p class="muted small center about-line">${t('more.about', { n: store.get().viewed.length })}</p>`;
}
