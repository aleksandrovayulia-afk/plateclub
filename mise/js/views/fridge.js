// «Что в холодильнике?»: продукты с количеством и сроком годности → подбор рецептов под технику, питание и срок.
import { ING, COMMON } from '../data/ingredients.js';
import { FRIDGE_CATS, CAT_EMOJI, catOf, idsOfCat } from '../data/fridge-cats.js';
import { SUBS } from '../data/subs.js';
import { suggestIngredients, fridgeSearch, rtext, gearName } from '../engine.js';
import { CATEGORIES } from '../data/recipes/index.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import * as pantry from '../pantry.js';
import { mascot, setMood } from '../mascot.js';
import { esc, $, recipeRow, timeLabel, levelLabel, toast, icons, photo } from '../ui.js';

const MOODS = ['any', 'salty', 'sweet', 'sport', 'new'];
const TABS = ['common', ...FRIDGE_CATS];
let cat = 'common';
let filterText = '';
let heroIdx = 0;
let more = false;
let allRows = false;

const lang = () => currentLang();
const iname = (id) => ING[id].n[lang()];
const tint = (r) => CATEGORIES.find((c) => c.id === r.c).tint;
/** Поиск по продуктам сразу на трёх языках: «cherry» найдёт «помидоры черри» */
const findIds = (text, n) => [...new Set(['ru', 'en', 'es'].flatMap((l) => suggestIngredients(text, l, n)))].slice(0, n);
const STEP = { g: 50, ml: 50, kg: 0.5, l: 0.5, pc: 1, pack: 1 };

/* ───────── срок годности ───────── */

function expLabel(left) {
  if (left === null) return t('fridge.exp.none');
  if (left < 0) return t('fridge.exp.expired');
  if (left === 0) return t('fridge.exp.today');
  if (left === 1) return t('fridge.exp.tomorrow');
  return t('fridge.exp.days', { n: left });
}
const expClass = (left) => (left === null ? '' : left < 0 ? ' bad' : left <= 3 ? ' warn' : ' ok');

/* ───────── список «В холодильнике» ───────── */

function itemRow(s, id) {
  const d = pantry.detailOf(s, id);
  const left = pantry.daysLeft(d.exp);
  const name = pantry.nameOf(s, id, lang());
  const unit = d.unit || 'pc';
  return `<li class="fi" data-id="${id}">
    <span class="fi-e" aria-hidden="true">${pantry.emojiOf(s, id)}</span>
    <span class="fi-n"><b>${esc(name)}</b><small>${esc(t(`fridge.cat.${id.startsWith('c_') ? d.cat || 'ready' : catOf(id)}`))}</small></span>
    <button class="fi-x" data-act="remove-ing" data-id="${id}" aria-label="${esc(t('fridge.remove', { name }))}">${icons.close}</button>
    <span class="fi-q" role="group" aria-label="${t('fridge.qty.plus')}">
      <button data-act="qty-step" data-id="${id}" data-d="-1" aria-label="${t('fridge.qty.minus')}">−</button>
      <input class="fi-qin" type="number" inputmode="decimal" min="0" step="any" value="${d.qty ?? ''}" placeholder="—" data-act="qty-in" data-id="${id}" aria-label="${t('fridge.qty.plus')}">
      <select data-act="unit-set" data-id="${id}" aria-label="${t('fridge.qty.plus')}">${pantry.UNITS.map((u) => `<option value="${u}"${u === unit ? ' selected' : ''}>${t(`unit.${u}`)}</option>`).join('')}</select>
      <button data-act="qty-step" data-id="${id}" data-d="1" aria-label="${t('fridge.qty.plus')}">+</button>
    </span>
    <label class="fi-d${expClass(left)}">${icons.calendar}<span>${esc(expLabel(left))}</span><input type="date" value="${d.exp || ''}" data-act="exp-set" data-id="${id}" aria-label="${t('fridge.exp')}"></label>
  </li>`;
}

function mineBlock(s) {
  const ids = [...s.have, ...s.custom.map((x) => x.id)];
  if (!ids.length) return `<p class="muted small fi-empty">${t('fridge.list.empty')}</p>`;
  const exp = pantry.expiring(s, 3);
  const order = [...ids].sort((a, b) => (pantry.daysLeft(pantry.detailOf(s, a).exp) ?? 999) - (pantry.daysLeft(pantry.detailOf(s, b).exp) ?? 999));
  const shown = allRows ? order : order.slice(0, 6);
  return `<section class="fi-wrap" aria-label="${t('fridge.mine')}">
    <div class="fi-head"><h2>${t('fridge.mine')} <span class="count">${ids.length}</span></h2><button class="link" data-act="clear-have">${t('fridge.clear')}</button></div>
    ${exp.length ? `<div class="use-first" role="note"><b>${t('fridge.first')}</b><span>${exp.map((x) => `${esc(pantry.nameOf(s, x.id, lang()))} (${esc(expLabel(x.left))})`).join(', ')}</span><small>${t('fridge.first.note')}</small></div>` : ''}
    <ul class="fi-list">${shown.map((id) => itemRow(s, id)).join('')}</ul>
    ${order.length > 6 ? `<button class="btn ghost full small" data-act="rows-all">${allRows ? t('common.less') : t('fridge.rows.all', { n: order.length })}</button>` : ''}
    ${s.custom.length ? `<p class="muted small">${t('fridge.custom.note')}</p>` : ''}
  </section>`;
}

/* ───────── каталог продуктов ───────── */

const chip = (id, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-act="toggle-ing" data-id="${id}" aria-pressed="${on}"><span class="chip-e">${ING[id].e}</span>${esc(iname(id))}</button>`;

function catalog(s) {
  const ids = filterText.trim() ? findIds(filterText.trim(), 80) : cat === 'common' ? COMMON : idsOfCat(cat, lang(), COMMON);
  const tabs = TABS.map((c) => `<button role="tab" class="gtab${c === cat && !filterText ? ' on' : ''}" data-act="cat" data-c="${c}" aria-selected="${c === cat}">${c === 'common' ? '' : `${CAT_EMOJI[c]} `}${esc(t(`fridge.cat.${c}`))}</button>`).join('');
  const bulk = filterText || cat === 'common'
    ? `<button class="link" data-act="add-popular">${t('fridge.popular')}</button>`
    : `<button class="link" data-act="sel-all">${t('fridge.sel.all')}</button><button class="link" data-act="sel-none">${t('fridge.sel.none')}</button>`;
  return `<section aria-label="${t('fridge.browse')}">
    <div class="search small"><span aria-hidden="true">${icons.search}</span><input id="fridge-filter" type="search" value="${esc(filterText)}" placeholder="${t('fridge.filter')}" aria-label="${t('fridge.filter')}" autocomplete="off"></div>
    <div class="fade-x"><div class="groups" role="tablist">${tabs}</div></div>
    <div class="bulk-row">${bulk}</div>
    <div class="chips" id="fridge-chips">${ids.length ? ids.map((id) => chip(id, s.have.includes(id))).join('') : `<p class="muted small">${t('fridge.found.none')}</p>`}</div>
  </section>`;
}

/* ───────── результаты ───────── */

const firstTip = (id) => (SUBS[id]?.[lang()] || '').split(/(?<=[.!?])\s/)[0];

function results(s) {
  const have = s.have;
  const prio = pantry.expiring(s, 3).map((x) => x.id).filter((id) => !id.startsWith('c_'));
  const res = fridgeSearch({ have, pantry: s.pantry, owned: s.owned, mood: s.mood, diet: s.diet, maxMin: s.quick ? 30 : 0, cooked: s.cooked, liked: s.ratings, seed: s.seed, prio });

  if (!have.length && s.mood === 'any') {
    return `<div class="empty">${mascot('curious', 96)}<h2>${t('fridge.empty.title')}</h2><p>${t('fridge.empty.text')}</p><button class="btn primary" data-act="surprise">${t('fridge.surprise')}</button></div>`;
  }
  let pool = have.length ? [...res.ready, ...res.almost] : [...res.other, ...res.ready, ...res.almost];
  if (have.length && pool.length < 3) pool = [...pool, ...res.other.slice(0, 3 - pool.length)];

  if (!pool.length) {
    const n = res.locked.length;
    return `<div class="empty">${mascot('error', 96)}<h2>${t('fridge.none.title')}</h2><p>${n ? t('fridge.none.locked', { n }) : t('fridge.none.text')}</p>${n ? `<a class="btn" href="#/kitchen">${t('kitchen.title')}</a>` : ''}</div>${lockedBlock(res.locked)}`;
  }

  const idx = heroIdx % pool.length;
  const top = pool[idx];
  const r = top.recipe;
  const tx = rtext(r);
  const pct = Math.round(top.coverage * 100);
  const miss = top.missing.map((x) => esc(iname(x.id).toLowerCase())).join(', ');
  const status = !top.total ? timeLabel(r.min) : top.missing.length ? t('fridge.missing', { list: miss }) : t('fridge.allset');
  const swaps = top.missing.slice(0, 2).map((x) => ({ id: x.id, tip: firstTip(x.id) })).filter((x) => x.tip);
  const prioUsed = r.ing.filter((x) => prio.includes(x.id)).map((x) => iname(x.id).toLowerCase());
  const hero = `<article class="hero" style="--t:${tint(r)}">
    <div class="hero-top"><span class="eyebrow">${s.mood === 'new' ? t('fridge.bestnew') : t('fridge.best')}</span>${pool.length > 1 ? `<button class="link" data-act="next-hero">${t('fridge.next')}</button>` : ''}</div>
    <a class="hero-main" href="#/r/${r.id}">
      <span class="hero-e" aria-hidden="true">${photo(r)}</span>
      <span class="hero-t">${esc(tx.t)}</span>
      <span class="hero-d">${esc(tx.d)}</span>
    </a>
    <div class="hero-meta"><span>${timeLabel(r.min)}</span><span>${levelLabel(r.lv)}</span><span>${t('common.servings', { n: r.srv })}</span>${top.total ? `<span class="pct">${t('fridge.match', { n: pct })}</span>` : ''}</div>
    <div class="hero-status ${top.missing.length ? 'warn' : 'ok'}">${top.missing.length ? '' : icons.check}${status}</div>
    ${swaps.length ? `<ul class="hero-swaps">${swaps.map((x) => `<li><b>${esc(iname(x.id))}.</b> ${t('fridge.swap')}: ${esc(x.tip)}</li>`).join('')}</ul>` : ''}
    ${prioUsed.length ? `<p class="hero-prio">${icons.clock} ${t('fridge.use.prio', { list: esc(prioUsed.join(', ')) })}</p>` : ''}
    <a class="btn primary full" href="#/r/${r.id}">${t('fridge.open')}</a>
  </article>`;

  const rest = pool.filter((_, i) => i !== idx);
  const ready = rest.filter((a) => !a.missing.length);
  const almost = rest.filter((a) => a.missing.length);
  const cap = (arr) => (more ? arr : arr.slice(0, 6));
  const note = (a, kind) => {
    if (kind === 'blind') return '';
    const pc = a.total ? `<span class="pct">${Math.round(a.coverage * 100)}%</span> ` : '';
    if (kind === 'ready') return a.total ? `${pc}${t('fridge.allset')}` : '';
    const sw = a.missing[0] && firstTip(a.missing[0].id) ? ` · ${t('fridge.swap')}: ${esc(firstTip(a.missing[0].id).slice(0, 60))}` : '';
    return `${pc}<span class="miss">${t('fridge.no', { list: a.missing.map((x) => esc(iname(x.id).toLowerCase())).join(', ') })}</span>${sw}`;
  };
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

/* ───────── экран ───────── */

export function render(s) {
  const pantryNames = s.pantry.map((id) => iname(id).toLowerCase()).join(', ');
  return `<header class="top"><h1>${t('fridge.title')}</h1><p class="sub">${t('fridge.sub')}</p></header>
    <form class="composer" id="fridge-form" autocomplete="off">
      <input id="fridge-input" type="text" enterkeyhint="done" placeholder="${t('fridge.placeholder')}" aria-label="${t('fridge.placeholder')}" autocapitalize="none" autocomplete="off" spellcheck="false">
      <button class="btn primary" type="submit">${t('fridge.add')}</button>
    </form>
    <p class="muted small fi-hint">${t('fridge.hint')}</p>
    <div id="suggest" class="suggest" hidden></div>
    ${mineBlock(s)}
    ${catalog(s)}
    <p class="muted small pantry-note">${t('fridge.pantry', { list: esc(pantryNames) || '—' })} <a href="#/kitchen">${t('fridge.change')}</a></p>
    <div class="seg" role="radiogroup" aria-label="${t('fridge.mood')}">${MOODS.map((v) => `<button role="radio" aria-checked="${s.mood === v}" class="${s.mood === v ? 'on' : ''}" data-act="mood" data-v="${v}">${t(`mood.${v}`)}</button>`).join('')}</div>
    <label class="switch"><input type="checkbox" data-act="quick" ${s.quick ? 'checked' : ''}><span class="knob"></span><span>${t('fridge.quick')}</span></label>
    <section id="results" class="results">${results(s)}</section>`;
}

/** Добавляет текст из строки ввода: известные продукты в холодильник, остальное как свои продукты */
function addText(text) {
  const { known, unknown } = pantry.parseBulk(text);
  if (!known.length && !unknown.length) return false;
  heroIdx = 0;
  if (known.length) pantry.addKnown(known);
  for (const u of unknown) pantry.addCustom({ name: u.name, qty: u.qty, unit: u.unit });
  const names = known.map((k) => iname(k.id).toLowerCase());
  toast(unknown.length && !known.length ? t('fridge.custom.added', { name: unknown.map((u) => u.name).join(', ') }) : t('fridge.added', { list: [...names, ...unknown.map((u) => u.name)].join(', ') }));
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
    if (addText(v)) { const n = $('#fridge-input'); if (n) { n.value = ''; n.focus({ preventScroll: true }); } }
  });
  input.addEventListener('input', () => {
    const last = input.value.split(/[,;\n]/).pop().trim().replace(/^\d+(?:[.,]\d+)?\s*\S{0,4}\s+/, '');
    const ids = last.length < 2 ? [] : suggestIngredients(last, currentLang(), 8).filter((id) => !store.get().have.includes(id));
    box.hidden = !ids.length;
    box.innerHTML = ids.map((id) => `<button type="button" class="chip small" data-act="suggest-pick" data-id="${id}"><span class="chip-e">${ING[id].e}</span>${esc(iname(id))}</button>`).join('');
  });
  const filt = $('#fridge-filter', root);
  let tm;
  filt.addEventListener('input', () => {
    filterText = filt.value;
    clearTimeout(tm);
    tm = setTimeout(() => { const s = store.get(); const c = $('#fridge-chips'); if (c) { const ids = filterText.trim() ? findIds(filterText.trim(), 80) : cat === 'common' ? COMMON : idsOfCat(cat, lang(), COMMON); c.innerHTML = ids.length ? ids.map((id) => chip(id, s.have.includes(id))).join('') : `<p class="muted small">${t('fridge.found.none')}</p>`; } }, 120);
  });
  setMood(root, store.get().have.length ? 'idle' : 'curious');
}

const catIds = () => (cat === 'common' ? COMMON : idsOfCat(cat, lang(), COMMON));

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'toggle-ing': {
      heroIdx = 0; const id = el.dataset.id;
      if (s.have.includes(id)) pantry.removeItem(id); else pantry.addKnown([{ id }]);
      return true;
    }
    case 'suggest-pick': heroIdx = 0; pantry.addKnown([{ id: el.dataset.id }]); return true;
    case 'remove-ing': heroIdx = 0; pantry.removeItem(el.dataset.id); return true;
    case 'clear-have': heroIdx = 0; store.set({ have: [], items: {}, custom: [] }); return true;
    case 'cat': cat = el.dataset.c; filterText = ''; store.set({}); return true;
    case 'sel-all': heroIdx = 0; pantry.addKnown(catIds().map((id) => ({ id }))); return true;
    case 'sel-none': { heroIdx = 0; const drop = new Set(catIds()); const items = { ...s.items }; for (const id of drop) delete items[id]; store.set({ have: s.have.filter((x) => !drop.has(x)), items }); return true; }
    case 'add-popular': heroIdx = 0; pantry.addKnown(COMMON.slice(0, 12).map((id) => ({ id }))); return true;
    case 'rows-all': allRows = !allRows; store.set({}); return true;
    case 'qty-step': {
      const id = el.dataset.id; const d = pantry.detailOf(s, id); const unit = d.unit || 'pc'; const step = STEP[unit] || 1;
      const next = Math.max(0, Math.round(((d.qty ?? 0) + Number(el.dataset.d) * step) * 100) / 100);
      pantry.setItem(id, { qty: next, unit });
      return true;
    }
    case 'mood': heroIdx = 0; store.set({ mood: el.dataset.v }); return true;
    case 'surprise': heroIdx = 0; store.set({ mood: 'new', seed: s.seed + 1 }); return true;
    case 'next-hero': heroIdx++; store.set({}); return true;
    case 'toggle-more': more = !more; store.set({}); return true;
    default: return false;
  }
}

export function onChange(act, el) {
  const id = el.dataset.id;
  switch (act) {
    case 'quick': heroIdx = 0; store.set({ quick: el.checked }); return true;
    case 'qty-in': { const v = el.value === '' ? null : Math.max(0, parseFloat(el.value.replace(',', '.'))); pantry.setItem(id, { qty: Number.isNaN(v) ? null : v, unit: pantry.detailOf(store.get(), id).unit || 'pc' }); return true; }
    case 'unit-set': pantry.setItem(id, { unit: el.value }); return true;
    case 'exp-set': heroIdx = 0; pantry.setItem(id, { exp: el.value || null }); return true;
    default: return false;
  }
}
