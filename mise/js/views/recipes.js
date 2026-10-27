// Каталог рецептов
import { CATEGORIES } from '../data/recipes/index.js';
import { RECIPES, searchRecipes, missingGear, passesDiet, plural } from '../engine.js';
import * as store from '../store.js';
import { esc, $, recipeCard, lockLabel } from '../ui.js';

let query = '';
let cat = 'all';
const flags = new Set();

const FLAGS = [
  ['mine', 'С моей техникой'],
  ['quick', 'Быстро'],
  ['noequip', 'Без техники'],
  ['vegetarian', 'Вегетарианское'],
  ['fav', 'Избранное'],
];

function filtered(s) {
  let list = searchRecipes(query);
  if (cat === 'sport') list = list.filter((r) => r.c === 'sport' || r.tags.includes('sport'));
  else if (cat !== 'all') list = list.filter((r) => r.c === cat);
  if (flags.has('mine')) list = list.filter((r) => !missingGear(r, s.owned).length);
  if (flags.has('quick')) list = list.filter((r) => r.min <= 30);
  if (flags.has('noequip')) list = list.filter((r) => !r.eq.length);
  if (flags.has('vegetarian')) list = list.filter((r) => r.diet.vegetarian);
  if (flags.has('fav')) list = list.filter((r) => s.favs.includes(r.id));
  return list.filter((r) => passesDiet(r, s.diet));
}

function grid(s) {
  const list = filtered(s);
  if (!list.length) {
    return `<div class="empty small"><div class="empty-e">🔍</div><h2>Ничего не найдено</h2><p>Измените запрос или уберите фильтры.</p></div>`;
  }
  const cards = list.map((r) => {
    const gear = missingGear(r, s.owned);
    return recipeCard(r, { locked: gear.length ? lockLabel(gear) : null, fav: s.favs.includes(r.id) });
  }).join('');
  return `<p class="muted small count-line">${list.length} ${plural(list.length, 'рецепт', 'рецепта', 'рецептов')}</p><div class="grid">${cards}</div>`;
}

export function render(s) {
  const cats = [{ id: 'all', n: 'Все' }, ...CATEGORIES];
  return `<header class="top"><h1>Рецепты</h1><p class="sub">${RECIPES.length} рецептов с пошаговыми подсказками.</p></header>
    <div class="search"><input id="recipe-search" type="search" placeholder="Поиск: сырники, торт, курица…" value="${esc(query)}" aria-label="Поиск рецептов" enterkeyhint="search" autocomplete="off"></div>
    <div class="hscroll" role="tablist">${cats.map((c) => `<button role="tab" class="gtab${c.id === cat ? ' on' : ''}" data-act="cat" data-c="${c.id}" aria-selected="${c.id === cat}">${c.e ? `${c.e} ` : ''}${c.n}</button>`).join('')}</div>
    <div class="hscroll tight">${FLAGS.map(([id, l]) => `<button class="chip small${flags.has(id) ? ' on' : ''}" data-act="flag" data-f="${id}" aria-pressed="${flags.has(id)}">${l}</button>`).join('')}</div>
    <section id="grid">${grid(s)}</section>`;
}

export function bind(root) {
  const input = $('#recipe-search', root);
  input.addEventListener('input', () => {
    query = input.value;
    $('#grid').innerHTML = grid(store.get());
  });
}

export function onClick(act, el) {
  if (act === 'cat') { cat = el.dataset.c; store.set({}); return true; }
  if (act === 'flag') {
    const f = el.dataset.f;
    if (flags.has(f)) flags.delete(f); else flags.add(f);
    store.set({});
    return true;
  }
  return false;
}

export const setCat = (c) => { cat = c; };
