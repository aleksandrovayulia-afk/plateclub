// Каталог: поиск, категории, подборки, фильтры и сортировка
import { CATEGORIES, CUISINES } from '../data/recipes/index.js';
import { EQUIP } from '../data/equipment.js';
import { RECIPES, COLLECTION_BY_ID, searchRecipes, missingGear, passesDiet, analyze, jitter } from '../engine.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import { esc, $, recipeCard, openSheet, closeSheet, icons } from '../ui.js';

const fresh = () => ({ q: '', cat: 'all', col: null, sort: 'rec', cuisine: null, maxMin: 0, level: 0, mine: false, fav: false, limit: 36 });
let st = fresh();
let focusNext = false;

export function setCollection(id) { st = { ...fresh(), col: id }; }
export function setCategory(id) { st = { ...fresh(), cat: id }; }
export const wantFocus = () => { focusNext = true; };

const dayKey = () => Math.floor(Date.now() / 86400000);

function filtered(s) {
  const owned = new Set(s.owned);
  let list = RECIPES;
  if (st.col) list = list.filter(COLLECTION_BY_ID[st.col].f);
  if (st.cat !== 'all') list = list.filter((r) => r.c === st.cat);
  list = list.filter((r) => passesDiet(r, s.diet));
  if (st.maxMin) list = list.filter((r) => r.min <= st.maxMin);
  if (st.level) list = list.filter((r) => r.lv === st.level);
  if (st.cuisine) list = list.filter((r) => r.cu === st.cuisine);
  if (st.mine) list = list.filter((r) => !missingGear(r, owned).length);
  if (st.fav) list = list.filter((r) => s.favs.includes(r.id));
  if (st.q.trim()) return searchRecipes(st.q, list);
  const lang = currentLang();
  const by = {
    rec: (a, b) => jitter(a.id, dayKey()) - jitter(b.id, dayKey()),
    time: (a, b) => a.min - b.min,
    level: (a, b) => a.lv - b.lv || a.min - b.min,
    az: (a, b) => a.text[lang].t.localeCompare(b.text[lang].t, lang),
    rate: (a, b) => (s.ratings[b.id] || 0) - (s.ratings[a.id] || 0) || jitter(a.id, 3) - jitter(b.id, 3),
  }[st.sort];
  return [...list].sort(by);
}

const activeFilters = () => [st.maxMin, st.level, st.cuisine, st.mine, st.fav, st.sort !== 'rec'].filter(Boolean).length;

function grid(s) {
  const list = filtered(s);
  if (!list.length) return `<div class="empty small"><div class="empty-e">🔍</div><h2>${t('rec.nothing')}</h2><p>${t('rec.nothing.text')}</p><button class="btn" data-act="rec-reset">${t('rec.reset')}</button></div>`;
  const owned = new Set(s.owned);
  const ctx = s.have.length ? { have: new Set(s.have), pantry: new Set(s.pantry), owned } : null;
  const shown = list.slice(0, st.limit);
  const cards = shown.map((r) => {
    const gear = missingGear(r, owned);
    const badge = ctx && !gear.length && analyze(r, ctx).missing.length === 0 && analyze(r, ctx).used > 0 ? `✓ ${t('rec.ready')}` : '';
    return recipeCard(r, { locked: gear.length ? t('common.needGear', { gear: gear.map(gearLabel).join(', ') }) : null, fav: s.favs.includes(r.id), badge });
  }).join('');
  return `<p class="muted small count-line">${t('rec.count', { n: list.length })}</p><div class="grid">${cards}</div>${list.length > st.limit ? `<button class="btn ghost full" data-act="rec-more">${t('rec.more', { n: Math.min(36, list.length - st.limit) })}</button>` : ''}`;
}

const gearLabel = (g) => g.map((x) => EQUIP[x].n[currentLang()].toLowerCase()).join(` ${t('common.or')} `);

export function render(s) {
  const lang = currentLang();
  const cats = [{ id: 'all', n: { [lang]: t('rec.all') }, e: '' }, ...CATEGORIES];
  const af = activeFilters();
  const recents = !st.q && s.recentSearches.length ? `<div class="hscroll tight recents">${s.recentSearches.map((q) => `<button class="chip small" data-act="recent" data-q="${esc(q)}">${icons.clock}${esc(q)}</button>`).join('')}</div>` : '';
  return `<header class="top"><h1>${t('rec.title')}</h1><p class="sub">${t('rec.sub', { n: RECIPES.length })}</p></header>
    <div class="search-row"><div class="search">${icons.search}<input id="recipe-search" type="search" placeholder="${t('rec.placeholder')}" value="${esc(st.q)}" aria-label="${t('rec.placeholder')}" enterkeyhint="search" autocomplete="off"></div>
      <button class="icon-btn filter-btn${af ? ' on' : ''}" data-act="rec-filters" aria-label="${t('rec.filters')}">${icons.filter}${af ? `<i class="dot">${af}</i>` : ''}</button></div>
    ${recents}
    ${st.col ? `<div class="active-col"><span>${COLLECTION_BY_ID[st.col].e} ${t(`col.${st.col}`)}</span><button data-act="col-clear" aria-label="${t('common.close')}">${icons.close}</button></div>` : ''}
    <div class="hscroll" role="tablist">${cats.map((c) => `<button role="tab" class="gtab${c.id === st.cat ? ' on' : ''}" data-act="cat" data-c="${c.id}" aria-selected="${c.id === st.cat}">${c.e ? `${c.e} ` : ''}${esc(c.n[lang])}</button>`).join('')}</div>
    <section id="grid">${grid(s)}</section>`;
}

export function bind(root) {
  const input = $('#recipe-search', root);
  let tmr;
  input.addEventListener('input', () => { st.q = input.value; st.limit = 36; clearTimeout(tmr); tmr = setTimeout(() => { $('#grid').innerHTML = grid(store.get()); }, 140); });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const q = input.value.trim();
    if (q.length > 1) store.set({ recentSearches: [q, ...store.get().recentSearches.filter((x) => x !== q)].slice(0, 6) }, { silent: true });
    input.blur();
  });
  if (focusNext) { focusNext = false; setTimeout(() => input.focus(), 60); }
}

const seg = (name, value, items) => `<div class="seg wrap" role="radiogroup">${items.map(([v, label]) => `<button role="radio" aria-checked="${value === v}" class="${value === v ? 'on' : ''}" data-act="f-${name}" data-v="${v}">${label}</button>`).join('')}</div>`;

function filtersSheet(s) {
  const lang = currentLang();
  const cuisines = [...new Set(RECIPES.map((r) => r.cu))];
  openSheet(`<h2>${t('rec.filters')}</h2>
    <h3 class="sub-h">${t('rec.sort')}</h3>${seg('sort', st.sort, [['rec', t('rec.sort.rec')], ['time', t('rec.sort.time')], ['level', t('rec.sort.level')], ['az', t('rec.sort.az')], ['rate', t('rec.sort.rate')]])}
    <h3 class="sub-h">${t('rec.time')}</h3>${seg('time', st.maxMin, [[0, t('rec.any')], [15, '≤ 15'], [30, '≤ 30'], [60, '≤ 60']])}
    <h3 class="sub-h">${t('rec.level')}</h3>${seg('level', st.level, [[0, t('rec.any')], [1, t('level.1')], [2, t('level.2')], [3, t('level.3')]])}
    <h3 class="sub-h">${t('rec.cuisine')}</h3><div class="chips"><button class="chip small${!st.cuisine ? ' on' : ''}" data-act="f-cuisine" data-v="">${t('rec.any')}</button>${cuisines.map((c) => `<button class="chip small${st.cuisine === c ? ' on' : ''}" data-act="f-cuisine" data-v="${c}">${esc(CUISINES[c][lang])}</button>`).join('')}</div>
    <label class="switch"><input type="checkbox" data-act="f-mine" ${st.mine ? 'checked' : ''}><span class="knob"></span><span>${t('rec.mine')}</span></label>
    <label class="switch"><input type="checkbox" data-act="f-fav" ${st.fav ? 'checked' : ''}><span class="knob"></span><span>${t('rec.fav')}</span></label>
    <div class="row"><button class="btn" data-act="rec-reset">${t('rec.reset')}</button><button class="btn primary" data-act="close-sheet">${t('rec.show', { n: filtered(s).length })}</button></div>`, { tall: true });
}

const refresh = () => { store.set({}); };

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'cat': st.cat = el.dataset.c; st.col = null; st.limit = 36; refresh(); return true;
    case 'col-clear': st.col = null; refresh(); return true;
    case 'rec-more': st.limit += 36; $('#grid').innerHTML = grid(s); return true;
    case 'rec-reset': st = { ...fresh() }; closeSheet(); refresh(); return true;
    case 'rec-filters': filtersSheet(s); return true;
    case 'recent': st.q = el.dataset.q; refresh(); return true;
    case 'f-sort': st.sort = el.dataset.v; filtersSheet(s); refresh(); return true;
    case 'f-time': st.maxMin = Number(el.dataset.v); filtersSheet(s); refresh(); return true;
    case 'f-level': st.level = Number(el.dataset.v); filtersSheet(s); refresh(); return true;
    case 'f-cuisine': st.cuisine = el.dataset.v || null; filtersSheet(s); refresh(); return true;
    default: return false;
  }
}

export function onChange(act, el) {
  if (act === 'f-mine') { st.mine = el.checked; refresh(); return true; }
  if (act === 'f-fav') { st.fav = el.checked; refresh(); return true; }
  return false;
}
