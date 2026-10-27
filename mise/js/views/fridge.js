// Главный экран: «Что в холодильнике?»
import { ING, GROUPS, COMMON } from '../data/ingredients.js';
import { extractIngredients, fridgeSearch, plural } from '../engine.js';
import * as store from '../store.js';
import { esc, $, recipeRow, timeLabel, LEVELS, lockLabel, toast, icons } from '../ui.js';

const MOODS = [['any', 'Любое'], ['salty', 'Солёное'], ['sweet', 'Сладкое'], ['sport', 'Спорт'], ['new', 'Новое']];
const GROUP_ORDER = ['common', 'meat', 'fish', 'dairy', 'veg', 'fruit', 'grain', 'bake', 'sauce', 'spice', 'drink'];

let group = 'common';
let heroIdx = 0;
let more = false;

const chip = (id, on) => {
  const i = ING[id];
  return `<button type="button" class="chip${on ? ' on' : ''}" data-act="toggle-ing" data-id="${id}" aria-pressed="${on}"><span class="chip-e">${i.e}</span>${esc(i.n)}</button>`;
};

function results(s) {
  const have = s.have;
  const quick = s.quick ? 30 : 0;
  const res = fridgeSearch({ have, pantry: s.pantry, owned: s.owned, mood: s.mood, diet: s.diet, maxMin: quick, cooked: s.cooked, seed: s.seed });

  if (!have.length && s.mood === 'any') {
    return `<div class="empty">
      <div class="empty-e">🧺</div>
      <h2>Начните с продуктов</h2>
      <p>Выберите то, что есть дома, или просто напишите выше. Или доверьтесь случаю.</p>
      <button class="btn primary" data-act="surprise">Удиви меня</button>
    </div>`;
  }

  let pool = have.length ? [...res.ready, ...res.almost] : [...res.other, ...res.ready, ...res.almost];
  if (have.length && pool.length < 3) pool = [...pool, ...res.other.slice(0, 3 - pool.length)];

  if (!pool.length) {
    const lockedN = res.locked.length;
    return `<div class="empty">
      <div class="empty-e">🫙</div>
      <h2>Ничего не нашлось</h2>
      <p>${lockedN ? `Есть ${lockedN} ${plural(lockedN, 'рецепт', 'рецепта', 'рецептов')}, но нужна другая техника.` : 'Попробуйте убрать часть условий или добавить продукты.'}</p>
      ${lockedN ? '<a class="btn" href="#/kitchen">Моя техника</a>' : ''}
    </div>${lockedBlock(res.locked)}`;
  }

  const idx = heroIdx % pool.length;
  const top = pool[idx];
  const r = top.recipe;
  const status = !top.total ? `${timeLabel(r.min)}` : top.missing.length ? `Не хватает: ${top.missing.map((x) => esc(ING[x.id].n.toLowerCase())).join(', ')}` : 'Есть всё нужное';
  const hero = `<article class="hero" style="--t:${catTint(r)}">
    <div class="hero-top"><span class="eyebrow">${s.mood === 'new' ? 'Попробуйте новое' : 'Лучший выбор'}</span>${pool.length > 1 ? `<button class="link" data-act="next-hero">Другой вариант</button>` : ''}</div>
    <a class="hero-main" href="#/r/${r.id}">
      <span class="hero-e" aria-hidden="true">${r.e}</span>
      <span class="hero-t">${esc(r.t)}</span>
      <span class="hero-d">${esc(r.d)}</span>
    </a>
    <div class="hero-meta"><span>${timeLabel(r.min)}</span><span>${LEVELS[r.lv]}</span><span>${r.srv} порц.</span></div>
    <div class="hero-status ${top.missing.length ? 'warn' : 'ok'}">${top.missing.length ? '' : icons.check}${status}</div>
    <a class="btn primary full" href="#/r/${r.id}">Открыть рецепт</a>
  </article>`;

  const rest = pool.filter((_, i) => i !== idx);
  const ready = rest.filter((a) => !a.missing.length);
  const almost = rest.filter((a) => a.missing.length);
  const cap = (arr) => (more ? arr : arr.slice(0, 6));
  const rows = (arr, kind) => cap(arr).map((a) => recipeRow(a.recipe, { note: note(a, kind), fav: s.favs.includes(a.recipe.id) })).join('');
  const hasMore = ready.length > 6 || almost.length > 6;

  let html = hero;
  if (!have.length) {
    html += `<h3 class="sec">Ещё идеи</h3><div class="list">${rows(rest, 'blind')}</div>`;
  } else {
    if (ready.length) html += `<h3 class="sec">Можно готовить сейчас <span class="count">${ready.length}</span></h3><div class="list">${rows(ready, 'ready')}</div>`;
    if (almost.length) html += `<h3 class="sec">Почти хватает <span class="count">${almost.length}</span></h3><div class="list">${rows(almost, 'almost')}</div>`;
  }
  if (hasMore || (!have.length && rest.length > 6)) html += `<button class="btn ghost full" data-act="toggle-more">${more ? 'Свернуть' : 'Показать все'}</button>`;
  return html + lockedBlock(res.locked);
}

const catTint = (r) => ({ cakes: '#f4b6c2', sweet: '#f7c99b', savory: '#b9d49a', shakes: '#9fc8ec', sport: '#a5dcc7', other: '#cdbfe8' }[r.c]);

function note(a, kind) {
  if (kind === 'ready') return a.total ? 'Есть всё нужное' : '';
  if (kind === 'blind') return '';
  return `<span class="miss">нет: ${a.missing.map((x) => esc(ING[x.id].n.toLowerCase())).join(', ')}</span>`;
}

function lockedBlock(locked) {
  if (!locked.length) return '';
  const rows = locked.slice(0, 6).map((a) => recipeRow(a.recipe, { locked: lockLabel(a.gear) })).join('');
  return `<details class="fold"><summary>Нужна другая техника <span class="count">${locked.length}</span></summary>
    <p class="muted small">Эти рецепты не подходят к вашей кухне. Если нужная вещь есть, отметьте её в разделе «Кухня».</p>
    <div class="list">${rows}</div></details>`;
}

export function render(s) {
  const have = s.have;
  const ids = group === 'common' ? COMMON : Object.values(ING).filter((i) => i.g === group).map((i) => i.id);
  const pantryNames = s.pantry.map((id) => ING[id].n.toLowerCase()).join(', ');
  return `<header class="top">
      <h1>Что в холодильнике?</h1>
      <p class="sub">Напишите, что есть, — подберу рецепт под вашу кухню.</p>
    </header>
    <form class="composer" id="fridge-form" autocomplete="off">
      <input id="fridge-input" type="text" inputmode="text" enterkeyhint="done" placeholder="яйца, молоко, мука…" aria-label="Продукты через запятую" autocapitalize="none">
      <button class="btn primary" type="submit">Добавить</button>
    </form>
    ${have.length ? `<div class="have" aria-label="Выбранные продукты">${have.map((id) => `<button class="chip on rm" data-act="remove-ing" data-id="${id}" aria-label="Убрать: ${esc(ING[id].n)}"><span class="chip-e">${ING[id].e}</span>${esc(ING[id].n)}<span class="x">${icons.close}</span></button>`).join('')}<button class="link" data-act="clear-have">Очистить</button></div>` : ''}
    <div class="groups" role="tablist">${GROUP_ORDER.map((g) => `<button role="tab" class="gtab${g === group ? ' on' : ''}" data-act="group" data-g="${g}" aria-selected="${g === group}">${GROUPS[g]}</button>`).join('')}</div>
    <div class="chips">${ids.map((id) => chip(id, have.includes(id))).join('')}</div>
    <p class="muted small pantry-note">Считаю, что дома всегда есть: ${esc(pantryNames) || 'ничего'}. <a href="#/kitchen">Изменить</a></p>
    <div class="seg" role="radiogroup" aria-label="Что хочется">${MOODS.map(([v, l]) => `<button role="radio" aria-checked="${s.mood === v}" class="${s.mood === v ? 'on' : ''}" data-act="mood" data-v="${v}">${l}</button>`).join('')}</div>
    <label class="switch"><input type="checkbox" data-act="quick" ${s.quick ? 'checked' : ''}><span class="knob"></span><span>Быстро — до 30 минут</span></label>
    <section id="results" class="results">${results(s)}</section>`;
}

export function bind(root) {
  const form = $('#fridge-form', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#fridge-input', root);
    const text = input.value.trim();
    if (!text) return;
    const { ids } = extractIngredients(text);
    if (!ids.length) { toast('Не узнаю такой продукт. Выберите из списка ниже.'); return; }
    const s = store.get();
    const add = ids.filter((id) => !s.have.includes(id));
    heroIdx = 0;
    store.set({ have: [...s.have, ...add] });
    toast(add.length ? `Добавлено: ${add.map((id) => ING[id].n.toLowerCase()).join(', ')}` : 'Это уже в списке');
    const next = $('#fridge-input');
    if (next) next.focus({ preventScroll: true });
  });
}

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'toggle-ing': heroIdx = 0; store.set({ have: store.toggleIn(s.have, el.dataset.id) }); return true;
    case 'remove-ing': heroIdx = 0; store.set({ have: s.have.filter((x) => x !== el.dataset.id) }); return true;
    case 'clear-have': heroIdx = 0; store.set({ have: [] }); return true;
    case 'group': group = el.dataset.g; store.set({}); return true;
    case 'mood': heroIdx = 0; store.set({ mood: el.dataset.v }); return true;
    case 'surprise': heroIdx = 0; store.set({ mood: 'new', seed: s.seed + 1 }); return true;
    case 'next-hero': heroIdx++; store.set({}); return true;
    case 'toggle-more': more = !more; store.set({}); return true;
    default: return false;
  }
}

export function onChange(act, el) {
  if (act === 'quick') { heroIdx = 0; store.set({ quick: el.checked }); return true; }
  return false;
}
