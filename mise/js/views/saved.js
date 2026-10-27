// Сохранённое: избранное, недавно смотрели, приготовлено (с оценками)
import { BY_ID } from '../engine.js';
import { t } from '../i18n.js';
import * as store from '../store.js';
import { icons, recipeRow } from '../ui.js';

let tab = 'favs';

export function render(s) {
  const lists = {
    favs: s.favs.map((id) => BY_ID[id]).filter(Boolean),
    viewed: s.viewed.map((id) => BY_ID[id]).filter(Boolean),
    cooked: Object.entries(s.cooked).sort((a, b) => b[1] - a[1]).map(([id]) => BY_ID[id]).filter(Boolean),
  };
  const list = lists[tab];
  const stars = (id) => (s.ratings[id] ? `<span class="stars">${'★'.repeat(s.ratings[id])}</span>` : '');
  return `<header class="top"><button class="back-link" data-act="back">${icons.back}${t('more.title')}</button><h1>${t('nav.saved')}</h1></header>
    <div class="seg" role="tablist">${['favs', 'viewed', 'cooked'].map((x) => `<button role="tab" aria-selected="${tab === x}" class="${tab === x ? 'on' : ''}" data-act="saved-tab" data-tab="${x}">${t(`saved.${x}`)} <small>${lists[x].length}</small></button>`).join('')}</div>
    ${list.length ? `<div class="list">${list.map((r) => recipeRow(r, { note: stars(r.id) })).join('')}</div>` : `<div class="empty small"><div class="empty-e">${tab === 'favs' ? '♥' : tab === 'viewed' ? '👀' : '🍽️'}</div><h2>${t(`saved.${tab}.empty`)}</h2><p>${t(`saved.${tab}.text`)}</p><a class="btn" href="#/recipes">${t('rec.title')}</a></div>`}
    ${tab === 'viewed' && list.length ? `<button class="link" data-act="viewed-clear">${t('saved.clear')}</button>` : ''}`;
}

export function onClick(act, el) {
  if (act === 'saved-tab') { tab = el.dataset.tab; store.set({}); return true; }
  if (act === 'viewed-clear') { store.set({ viewed: [] }); return true; }
  return false;
}
