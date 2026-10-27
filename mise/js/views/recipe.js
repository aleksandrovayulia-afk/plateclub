// Экран рецепта: ингредиенты по холодильнику, порции, единицы, шаги с таймерами, оценка и заметки
import { ING } from '../data/ingredients.js';
import { SUBS } from '../data/subs.js';
import { EQUIP } from '../data/equipment.js';
import { BY_ID, RECIPES, analyze, missingGear, rtext, toFahrenheit, gearName } from '../engine.js';
import { CATEGORIES } from '../data/recipes/index.js';
import { fmtQty } from '../qty.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import * as timers from '../timers.js';
import { esc, md, icons, timeLabel, levelLabel, cuisine, toast, recipeRow, openSheet, photo } from '../ui.js';

const servings = {};
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLOT_E = { breakfast: '🌅', lunch: '🍽️', dinner: '🌙', snack: '🍪' };
const iname = (id) => ING[id].n[currentLang()];
const scaleOf = (r) => (servings[r.id] || r.srv) / r.srv;

export function render(s, id) {
  const r = BY_ID[id];
  if (!r) return `<header class="top"><h1>${t('recipe.notfound')}</h1></header><a class="btn" href="#/recipes">${t('rec.title')}</a>`;
  if (s.viewed[0] !== id) store.set({ viewed: [id, ...s.viewed.filter((x) => x !== id)].slice(0, 20) }, { silent: true });
  const tx = rtext(r);
  const n = servings[id] || r.srv;
  const k = n / r.srv;
  const imp = s.units === 'imperial';
  const ctx = { have: new Set(s.have), pantry: new Set(s.pantry), owned: new Set(s.owned) };
  const a = analyze(r, ctx);
  const gear = missingGear(r, ctx.owned);
  const fav = s.favs.includes(id);
  const useFridge = s.have.length > 0;
  const missIds = new Set(a.missing.map((x) => x.id));
  const tint = CATEGORIES.find((c) => c.id === r.c).tint;
  const lang = currentLang();
  const rating = s.ratings[id] || 0;
  const temp = (text) => (imp && lang === 'en' ? toFahrenheit(text) : text);

  const ings = r.ing.map((x) => {
    const miss = missIds.has(x.id);
    const cls = !useFridge ? '' : miss ? ' miss' : ' have';
    return `<li class="ing${cls}${x.opt ? ' opt' : ''}"><span class="ing-n">${ING[x.id].e} ${esc(iname(x.id))}${x.opt ? ` <em>${t('recipe.optional')}</em>` : ''}</span><span class="ing-q">${esc(fmtQty(x.q, { scale: k, imp }))}</span></li>`;
  }).join('');

  const subs = a.missing.filter((x) => SUBS[x.id]).slice(0, 3);
  const subsHtml = useFridge && subs.length ? `<div class="note"><strong>${t('recipe.subs')}</strong>${subs.map((x) => `<p><b>${esc(iname(x.id))}.</b> ${esc(SUBS[x.id][lang])}</p>`).join('')}</div>` : '';

  const eqHtml = r.eq.length
    ? `<div class="eqs">${r.eq.map((e) => {
      const group = Array.isArray(e) ? e : [e];
      const ok = group.some((x) => ctx.owned.has(x));
      return `<span class="eq ${ok ? 'ok' : 'no'}">${ok ? icons.check : icons.close}${group.map((x) => EQUIP[x].n[lang]).join(' / ')}</span>`;
    }).join('')}</div>`
    : `<p class="muted">${t('recipe.equip.none')}</p>`;

  const steps = tx.steps.map((st, i) => {
    const key = `${id}:${i}`;
    const running = timers.find(key);
    return `<li><span class="step-n">${i + 1}</span><div class="step-t">${esc(temp(st.text))}${st.min ? `<button class="step-timer${running ? ' on' : ''}" data-act="step-timer" data-i="${i}">${icons.timer}${running && !running.done ? timers.fmt(running.left) : timeLabel(st.min)}</button>` : ''}</div></li>`;
  }).join('');
  const tips = tx.k.length ? `<div class="note tips"><strong>${t('recipe.tips')}</strong>${tx.k.map((x) => `<p>${md(x)}</p>`).join('')}</div>` : '';

  const similar = RECIPES.filter((x) => x.id !== id && x.c === r.c && x.fam !== r.fam && !missingGear(x, ctx.owned).length)
    .map((x) => [x, x.ing.filter((y) => r.ing.some((z) => z.id === y.id)).length + (x.cu === r.cu ? 1 : 0)])
    .sort((p, q) => q[1] - p[1]).slice(0, 3).map((p) => p[0]);

  const cartCount = useFridge ? a.missing.filter((x) => !ctx.pantry.has(x.id)).length : r.ing.filter((x) => !x.opt && !ctx.pantry.has(x.id)).length;
  const planned = Object.entries(s.plan).filter(([, d]) => Object.values(d).includes(id)).length;
  const cooked = s.cooked[id];

  return `<div class="detail">
    <div class="bar">
      <button class="icon-btn" data-act="back" aria-label="${t('common.back')}">${icons.back}</button>
      <span class="bar-r">
        <button class="icon-btn" data-act="share" data-id="${id}" aria-label="${t('recipe.share')}">${icons.share}</button>
        <button class="icon-btn${fav ? ' on' : ''}" data-act="fav" data-id="${id}" aria-pressed="${fav}" aria-label="${t('recipe.fav')}">${icons.heart}</button>
      </span>
    </div>
    <section class="d-hero" style="--t:${tint}">${photo(r)}</section>
    <h1 class="d-title">${esc(tx.t)}</h1>
    <p class="d-desc">${esc(tx.d)}</p>
    <div class="facts">
      <span><b>${timeLabel(r.min)}</b>${t('recipe.time')}</span>
      <span><b>${levelLabel(r.lv)}</b>${t('recipe.level')}</span>
      <span><b>${esc(cuisine(r.cu))}</b>${t('recipe.cuisine')}</span>
    </div>
    <div class="tags">${r.diet.vegan ? `<span class="tag">${t('diet.vegan')}</span>` : r.diet.vegetarian ? `<span class="tag">${t('diet.vegetarian')}</span>` : ''}${r.diet.glutenFree ? `<span class="tag">${t('diet.glutenFree')}</span>` : ''}${r.diet.dairyFree ? `<span class="tag">${t('diet.dairyFree')}</span>` : ''}${r.tags.includes('sport') ? `<span class="tag">${t('tag.sport')}</span>` : ''}${r.tags.includes('quick') ? `<span class="tag">${t('tag.quick')}</span>` : ''}</div>

    <div class="d-actions">
      <button class="btn small${planned ? ' on' : ''}" data-act="plan-sheet" data-id="${id}">${icons.calendar} ${t('recipe.plan')}</button>
    </div>

    <h2 class="sec">${t('recipe.equip.title')}</h2>
    ${eqHtml}
    ${gear.length ? `<div class="note warn">${t('recipe.equip.need', { gear: gear.map((g) => gearName(g)).join(', ') })} <a href="#/kitchen">${t('kitchen.title')}</a></div>` : ''}

    <div class="ing-head">
      <h2 class="sec">${t('recipe.ings')}</h2>
      <div class="stepper" role="group" aria-label="${t('recipe.servingsLabel')}">
        <button data-act="srv" data-id="${id}" data-d="-1" aria-label="−">${icons.minus}</button>
        <span><b>${n}</b> ${t('common.servingsWord', { n })}</span>
        <button data-act="srv" data-id="${id}" data-d="1" aria-label="+">${icons.plus}</button>
      </div>
    </div>
    <div class="ing-tools">
      ${useFridge ? `<span class="muted small">${a.missing.length ? t('recipe.fridgeNote.miss', { n: a.missing.length }) : t('recipe.fridgeNote.ok')}</span>` : '<span></span>'}
      <button class="link" data-act="toggle-units">${imp ? t('units.toMetric') : t('units.toImperial')}</button>
    </div>
    <ul class="ings">${ings}</ul>
    ${subsHtml}
    ${cartCount ? `<button class="btn ghost full" data-act="to-cart" data-id="${id}">${icons.cart} ${useFridge ? t('recipe.cart.missing', { n: cartCount }) : t('recipe.cart.all')}</button>` : ''}

    <h2 class="sec">${t('recipe.steps')}</h2>
    <ol class="steps">${steps}</ol>
    ${tips}

    <h2 class="sec">${t('recipe.mynotes')}</h2>
    <div class="rate" role="radiogroup" aria-label="${t('recipe.rate')}">${[1, 2, 3, 4, 5].map((v) => `<button class="star${v <= rating ? ' on' : ''}" data-act="rate" data-id="${id}" data-v="${v}" role="radio" aria-checked="${v === rating}" aria-label="${v}">${icons.star}</button>`).join('')}</div>
    <textarea id="note" class="note-input" rows="3" placeholder="${t('recipe.note.ph')}" aria-label="${t('recipe.note.ph')}" data-id="${id}">${esc(s.notes[id] || '')}</textarea>
    ${cooked ? `<p class="muted small">${t('recipe.cooked', { date: new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(new Date(cooked)) })}</p>` : ''}

    ${similar.length ? `<h2 class="sec">${t('recipe.similar')}</h2><div class="list">${similar.map((x) => recipeRow(x)).join('')}</div>` : ''}
    <div class="cta-space"></div>
  </div>
  <div class="cta"><button class="btn primary big" data-act="cook" data-id="${id}">${icons.play} ${t('recipe.start')}</button></div>`;
}

export function bind(root) {
  const note = root.querySelector('#note');
  if (note) note.addEventListener('input', () => {
    const s = store.get();
    store.set({ notes: { ...s.notes, [note.dataset.id]: note.value } }, { silent: true });
  });
}

const dayLabel = (d) => new Intl.DateTimeFormat(currentLang(), { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function planSheet(id) {
  const s = store.get();
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
  openSheet(`<h2>${t('recipe.plan.title')}</h2><p class="muted small">${t('recipe.plan.hint')}</p>
    <div class="plan-grid"><span></span>${SLOTS.map((sl) => `<b title="${t(`slot.${sl}`)}">${SLOT_E[sl]}</b>`).join('')}
    ${days.map((d, i) => `<span class="pg-day">${i === 0 ? t('common.today') : i === 1 ? t('common.tomorrow') : esc(dayLabel(d))}</span>${SLOTS.map((sl) => {
      const on = s.plan[key(d)]?.[sl] === id;
      return `<button class="pg-cell${on ? ' on' : ''}" data-act="plan-set" data-id="${id}" data-day="${key(d)}" data-slot="${sl}" aria-pressed="${on}" aria-label="${t(`slot.${sl}`)} ${esc(dayLabel(d))}">${on ? icons.check : icons.plus}</button>`;
    }).join('')}`).join('')}</div>
    <button class="btn full" data-act="close-sheet">${t('common.done')}</button>`);
}

function recipeText(r, s) {
  const tx = rtext(r);
  const imp = s.units === 'imperial';
  const k = scaleOf(r);
  return `${tx.t}\n\n${r.ing.map((x) => `• ${iname(x.id)} — ${fmtQty(x.q, { scale: k, imp })}`).join('\n')}\n\n${tx.steps.map((st, i) => `${i + 1}. ${st.text}`).join('\n')}\n\n— Mise`;
}

async function share(r, s) {
  const text = recipeText(r, s);
  try {
    if (navigator.share) { await navigator.share({ title: rtext(r).t, text }); return; }
    await navigator.clipboard.writeText(text);
    toast(t('recipe.copied'));
  } catch (e) { if (e && e.name !== 'AbortError') toast(t('recipe.copied.fail')); }
}

export function onClick(act, el) {
  const s = store.get();
  const id = el.dataset.id || location.hash.split('/')[2];
  const r = BY_ID[id];
  switch (act) {
    case 'fav': {
      const on = !s.favs.includes(id);
      store.set({ favs: on ? [...s.favs, id] : s.favs.filter((x) => x !== id) });
      toast(on ? t('recipe.fav.on') : t('recipe.fav.off'));
      return true;
    }
    case 'srv': servings[id] = Math.min(24, Math.max(1, (servings[id] || r.srv) + Number(el.dataset.d))); store.set({}); return true;
    case 'toggle-units': store.set({ units: s.units === 'imperial' ? 'metric' : 'imperial' }); return true;
    case 'rate': {
      const v = Number(el.dataset.v);
      store.set({ ratings: { ...s.ratings, [id]: s.ratings[id] === v ? 0 : v } });
      return true;
    }
    case 'share': share(r, s); return true;
    case 'step-timer': {
      const i = Number(el.dataset.i);
      const st = rtext(r).steps[i];
      const tm = timers.start(`${rtext(r).t} · ${t('cook.step', { n: i + 1 })}`, st.min * 60, `${id}:${i}`);
      if (tm.running) toast(t('timers.started'));
      store.set({});
      return true;
    }
    case 'plan-sheet': planSheet(id); return true;
    case 'plan-set': {
      const day = el.dataset.day; const slot = el.dataset.slot;
      const cur = s.plan[day]?.[slot] === id;
      const next = { ...(s.plan[day] || {}) };
      if (cur) delete next[slot]; else next[slot] = id;
      store.set({ plan: { ...s.plan, [day]: next } }, { silent: true });
      planSheet(id);
      return true;
    }
    case 'to-cart': {
      const ctx = { have: new Set(s.have), pantry: new Set(s.pantry), owned: new Set(s.owned) };
      const a = analyze(r, ctx);
      const useFridge = s.have.length > 0;
      const items = (useFridge ? a.missing : r.ing.filter((x) => !x.opt)).filter((x) => !s.pantry.includes(x.id));
      const next = [...s.shop];
      let added = 0;
      for (const x of items) {
        const hit = next.find((y) => y.id === x.id && !y.done);
        const entry = { q: x.q, scale: scaleOf(r), from: id };
        if (hit) { if (!hit.qs.some((z) => z.from === id)) { hit.qs = [...hit.qs, entry]; added++; } }
        else { next.push({ id: x.id, qs: [entry], done: false }); added++; }
      }
      store.set({ shop: next });
      toast(added ? t('recipe.cart.added', { n: added }) : t('recipe.cart.already'));
      return true;
    }
    default: return false;
  }
}

