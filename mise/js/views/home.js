// Главная: приветствие, рецепт дня, подборки, быстрые действия
import { RECIPES, BY_ID, COLLECTIONS, collectionCount, recipeOfTheDay, missingGear, passesDiet, rtext } from '../engine.js';
import { CATEGORIES } from '../data/recipes/index.js';
import { t, currentLang, LANGS } from '../i18n.js';
import * as store from '../store.js';
import { esc, icons, tile, timeLabel, levelLabel, recipeCard } from '../ui.js';
import * as recipes from './recipes.js';

const counts = {};
const cnt = (id) => (counts[id] ??= collectionCount(id));

const greeting = () => {
  const h = new Date().getHours();
  return t(h < 5 ? 'home.night' : h < 12 ? 'home.morning' : h < 18 ? 'home.afternoon' : 'home.evening');
};

const today = () => new Date().toISOString().slice(0, 10);

export function render(s) {
  const lang = currentLang();
  const date = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const rotd = recipeOfTheDay(new Date(), s.diet, new Set(s.owned));
  const tx = rtext(rotd);
  const viewed = s.viewed.map((id) => BY_ID[id]).filter(Boolean).slice(0, 8);
  const plan = s.plan[today()] || {};
  const planned = ['breakfast', 'lunch', 'dinner'].map((slot) => (plan[slot] && BY_ID[plan[slot]] ? [slot, BY_ID[plan[slot]]] : null)).filter(Boolean);
  const open = s.shop.filter((x) => !x.done).length;
  const fridgeSub = s.have.length ? t('home.fridge.have', { n: s.have.length }) : t('home.fridge.empty');

  return `<header class="home-head">
      <div><p class="eyebrow">${esc(date)}</p><h1>${greeting()}</h1></div>
      <button class="pill-btn" data-act="lang-sheet" aria-label="${t('settings.language')}">${icons.globe}<span>${LANGS.find((l) => l.id === lang).short}</span></button>
    </header>
    <a class="searchbar" href="#/recipes" data-act="focus-search">${icons.search}<span>${t('home.search', { n: RECIPES.length })}</span></a>

    <a class="fridge-hero" href="#/fridge">
      <span class="fh-e" aria-hidden="true">🧺</span>
      <span class="fh-body"><b>${t('home.fridge.title')}</b><span>${fridgeSub}</span></span>
      <span class="fh-go">${icons.chev}</span>
    </a>

    <div class="shortcuts">
      <button data-act="surprise-recipe">${icons.shuffle}<span>${t('home.surprise')}</span></button>
      <a href="#/plan">${icons.calendar}<span>${t('nav.plan')}</span></a>
      <a href="#/shop">${icons.cart}${open ? `<i class="dot">${open}</i>` : ''}<span>${t('nav.shop')}</span></a>
      <a href="#/tools">${icons.timer}<span>${t('nav.tools')}</span></a>
    </div>

    <h2 class="sec">${t('home.rotd')}</h2>
    <a class="rotd" href="#/r/${rotd.id}" style="--t:${CATEGORIES.find((c) => c.id === rotd.c).tint}">
      <span class="rotd-e" aria-hidden="true">${rotd.e}</span>
      <span class="rotd-body">
        <span class="rotd-t">${esc(tx.t)}</span>
        <span class="rotd-d">${esc(tx.d)}</span>
        <span class="rotd-m">${timeLabel(rotd.min)} · ${levelLabel(rotd.lv)}</span>
      </span>
    </a>

    ${planned.length ? `<h2 class="sec">${t('home.today')} <a class="more-link" href="#/plan">${t('common.all')}</a></h2>
      <div class="list">${planned.map(([slot, r]) => `<a class="rrow" href="#/r/${r.id}">${tile(r)}<span class="rrow-body"><span class="rrow-m">${t(`slot.${slot}`)}</span><span class="rrow-t">${esc(rtext(r).t)}</span></span><span class="chev">${icons.chev}</span></a>`).join('')}</div>` : ''}

    ${viewed.length ? `<h2 class="sec">${t('home.recent')}</h2>
      <div class="hscroll cards">${viewed.map((r) => `<div class="hc">${recipeCard(r, { fav: s.favs.includes(r.id) })}</div>`).join('')}</div>` : ''}

    <h2 class="sec">${t('home.collections')}</h2>
    <div class="bento">${COLLECTIONS.map((c) => `<button class="bento-i" data-act="open-collection" data-id="${c.id}"><span class="bi-e">${c.e}</span><span class="bi-t">${t(`col.${c.id}`)}</span><span class="bi-n">${cnt(c.id)}</span></button>`).join('')}</div>

    <h2 class="sec">${t('home.categories')}</h2>
    <div class="cat-row">${CATEGORIES.map((c) => `<button class="cat-i" style="--t:${c.tint}" data-act="open-cat" data-id="${c.id}"><span>${c.e}</span><b>${esc(c.n[lang])}</b></button>`).join('')}</div>`;
}

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'open-collection': recipes.setCollection(el.dataset.id); location.hash = '#/recipes'; return true;
    case 'open-cat': recipes.setCategory(el.dataset.id); location.hash = '#/recipes'; return true;
    case 'focus-search': recipes.wantFocus(); return false;
    case 'surprise-recipe': {
      const owned = new Set(s.owned);
      const pool = RECIPES.filter((r) => r.c !== 'other' && passesDiet(r, s.diet) && !missingGear(r, owned).length && !s.cooked[r.id]);
      const list = pool.length ? pool : RECIPES;
      location.hash = `#/r/${list[Math.floor(Math.random() * list.length)].id}`;
      return true;
    }
    default: return false;
  }
}

