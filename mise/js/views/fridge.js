// «Что в холодильнике?»: продукты → подбор рецептов с учётом техники, аллергий и настроения
import { ING, COMMON, GROUP_ORDER } from '../data/ingredients.js';
import { extractIngredients, suggestIngredients, fridgeSearch, rtext, gearName } from '../engine.js';
import { CATEGORIES } from '../data/recipes/index.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import { esc, $, recipeRow, timeLabel, levelLabel, toast, icons } from '../ui.js';

const MOODS = ['any', 'salty', 'sweet', 'sport', 'new'];
let group = 'common';
let heroIdx = 0;
let more = false;

const iname = (id) => ING[id].n[currentLang()];
const chip = (id, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-act="toggle-ing" data-id="${id}" aria-pressed="${on}"><span class="chip-e">${ING[id].e}</span>${esc(iname(id))}</button>`;
const tint = (r) => CATEGORIES.find((c) => c.id === r.c).tint;

function results(s) {
  const have = s.have;
  const res = fridgeSearch({ have, pantry: s.pantry, owned: s.owned, mood: s.mood, diet: s.diet, maxMin: s.quick ? 30 : 0, cooked: s.cooked, liked: s.ratings, seed: s.seed });

  if (!have.length && s.mood === 'any') {
    return `<div class="empty"><div class="empty-e">🧺</div><h2>${t('fridge.empty.title')}</h2><p>${t('fridge.empty.text')}</p><button class="btn primary" data-act="surprise">${t('fridge.surprise')}</button></div>`;
  }
  let pool = have.length ? [...res.ready, ...res.almost] : [...res.other, ...res.ready, ...res.almost];
  if (have.length && pool.length < 3) pool = [...pool, ...res.other.slice(0, 3 - pool.length)];

  if (!pool.length) {
    const n = res.locked.length;
    return `<div class="empty"><div class="empty-e">🫙</div><h2>${t('fridge.none.title')}</h2><p>${n ? t('fridge.none.locked', { n }) : t('fridge.none.text')}</p>${n ? `<a class="btn" href="#/kitchen">${t('kitchen.title')}</a>` : ''}</div>${lockedBlock(res.locked)}`;
  }

  const idx = heroIdx % pool.length;
  const top = pool[idx];
  const r = top.recipe;
  const tx = rtext(r);
  const miss = top.missing.map((x) => esc(iname(x.id).toLowerCase())).join(', ');
  const status = !top.total ? timeLabel(r.min) : top.missing.length ? t('fridge.missing', { list: miss }) : t('fridge.allset');
  const hero = `<article class="hero" style="--t:${tint(r)}">
    <div class="hero-top"><span class="eyebrow">${s.mood === 'new' ? t('fridge.bestnew') : t('fridge.best')}</span>${pool.length > 1 ? `<button class="link" data-act="next-hero">${t('fridge.next')}</button>` : ''}</div>
    <a class="hero-main" href="#/r/${r.id}">
      <span class="hero-e" aria-hidden="true">${r.e}</span>
      <span class="hero-t">${esc(tx.t)}</span>
      <span class="hero-d">${esc(tx.d)}</span>
    </a>
    <div class="hero-meta"><span>${timeLabel(r.min)}</span><span>${levelLabel(r.lv)}</span><span>${t('common.servings', { n: r.srv })}</span></div>
    <div class="hero-status ${top.missing.length ? 'warn' : 'ok'}">${top.missing.length ? '' : icons.check}${status}</div>
    <a class="btn primary full" href="#/r/${r.id}">${t('fridge.open')}</a>
  </article>`;

  const rest = pool.filter((_, i) => i !== idx);
  const ready = rest.filter((a) => !a.missing.length);
  const almost = rest.filter((a) => a.missing.length);
  const cap = (arr) => (more ? arr : arr.slice(0, 6));
  const note = (a, kind) => (kind === 'ready' ? (a.total ? t('fridge.allset') : '') : kind === 'blind' ? '' : `<span class="miss">${t('fridge.no', { list: a.missing.map((x) => esc(iname(x.id).toLowerCase())).join(', ') })}</span>`);
  const rows = (arr, kind) => cap(arr).map((a) => recipeRow(a.recipe, { note: note(a, kind), fav: s.favs.includes(a.recipe.id) })).join('');

  let html = hero;
  if (!have.length) html += `<h3 class="sec">${t('fridge.ideas')}</h3><div class="list">${rows(rest, 'blind')}</div>`;
  else {
    if (ready.length) html += `<h3 class="sec">${t('fridge.ready')} <span class="count">${ready.length}</span></h3><div class="list">${rows(ready, 'ready')}</div>`;
    if (almost.length) html += `<h3 class="sec">${t('fridge.almost')} <span class="count">${almost.length}</span></h3><div class="list">${rows(almost, 'almost')}</div>`;
  }
  if (ready.length > 6 || almost.length > 6 || (!have.length && rest.length > 6)) html += `<button class="btn ghost full" data-act="toggle-more">${more ? t('common.less') : t('common.showAll')}</button>`;
  return html + lockedBlock(res.locked);
}

function lockedBlock(locked) {
  if (!locked.length) return '';
  const rows = locked.slice(0, 6).map((a) => recipeRow(a.recipe, { locked: t('common.needGear', { gear: a.gear.map((g) => gearName(g)).join(', ') }) })).join('');
  return `<details class="fold"><summary>${t('fridge.locked')} <span class="count">${locked.length}</span></summary><p class="muted small">${t('fridge.locked.note')}</p><div class="list">${rows}</div></details>`;
}

export function render(s) {
  const ids = group === 'common' ? COMMON : Object.values(ING).filter((i) => i.g === group).map((i) => i.id);
  const pantryNames = s.pantry.map((id) => iname(id).toLowerCase()).join(', ');
  return `<header class="top"><h1>${t('fridge.title')}</h1><p class="sub">${t('fridge.sub')}</p></header>
    <form class="composer" id="fridge-form" autocomplete="off">
      <input id="fridge-input" type="text" enterkeyhint="done" placeholder="${t('fridge.placeholder')}" aria-label="${t('fridge.placeholder')}" autocapitalize="none" autocomplete="off" spellcheck="false">
      <button class="btn primary" type="submit">${t('fridge.add')}</button>
    </form>
    <div id="suggest" class="suggest" hidden></div>
    ${s.have.length ? `<div class="have">${s.have.map((id) => `<button class="chip on rm" data-act="remove-ing" data-id="${id}" aria-label="${esc(iname(id))}"><span class="chip-e">${ING[id].e}</span>${esc(iname(id))}<span class="x">${icons.close}</span></button>`).join('')}<button class="link" data-act="clear-have">${t('fridge.clear')}</button></div>` : ''}
    <div class="groups" role="tablist">${GROUP_ORDER.map((g) => `<button role="tab" class="gtab${g === group ? ' on' : ''}" data-act="group" data-g="${g}" aria-selected="${g === group}">${t(`group.${g}`)}</button>`).join('')}</div>
    <div class="chips">${ids.map((id) => chip(id, s.have.includes(id))).join('')}</div>
    <p class="muted small pantry-note">${t('fridge.pantry', { list: esc(pantryNames) || '—' })} <a href="#/kitchen">${t('fridge.change')}</a></p>
    <div class="seg" role="radiogroup" aria-label="${t('fridge.mood')}">${MOODS.map((v) => `<button role="radio" aria-checked="${s.mood === v}" class="${s.mood === v ? 'on' : ''}" data-act="mood" data-v="${v}">${t(`mood.${v}`)}</button>`).join('')}</div>
    <label class="switch"><input type="checkbox" data-act="quick" ${s.quick ? 'checked' : ''}><span class="knob"></span><span>${t('fridge.quick')}</span></label>
    <section id="results" class="results">${results(s)}</section>`;
}

function addText(text) {
  const { ids } = extractIngredients(text);
  if (!ids.length) { toast(t('fridge.notfound')); return false; }
  const s = store.get();
  const add = ids.filter((id) => !s.have.includes(id));
  heroIdx = 0;
  store.set({ have: [...s.have, ...add] });
  toast(add.length ? t('fridge.added', { list: add.map((id) => iname(id).toLowerCase()).join(', ') }) : t('fridge.already'));
  return true;
}

export function bind(root) {
  const form = $('#fridge-form', root);
  const input = $('#fridge-input', root);
  const box = $('#suggest', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    if (addText(v)) { const n = $('#fridge-input'); if (n) n.focus({ preventScroll: true }); }
  });
  input.addEventListener('input', () => {
    const last = input.value.split(/[,;\n]/).pop().trim();
    const ids = suggestIngredients(last, currentLang(), 8).filter((id) => !store.get().have.includes(id));
    box.hidden = !ids.length;
    box.innerHTML = ids.map((id) => `<button type="button" class="chip small" data-act="suggest-pick" data-id="${id}"><span class="chip-e">${ING[id].e}</span>${esc(iname(id))}</button>`).join('');
  });
}

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'toggle-ing': heroIdx = 0; store.set({ have: store.toggleIn(s.have, el.dataset.id) }); return true;
    case 'suggest-pick': heroIdx = 0; store.set({ have: s.have.includes(el.dataset.id) ? s.have : [...s.have, el.dataset.id] }); return true;
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
