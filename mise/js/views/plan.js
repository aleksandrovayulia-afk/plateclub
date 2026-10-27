// План питания на неделю: завтрак, обед, ужин, перекус. Один тап — и всё нужное попадает в список покупок.
import { RECIPES, BY_ID, SLOT_TAGS, passesDiet, missingGear, rtext, jitter } from '../engine.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import { esc, tile, recipeRow, icons, toast, openSheet, closeSheet, timeLabel } from '../ui.js';

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLOT_E = { breakfast: '🌅', lunch: '🍽️', dinner: '🌙', snack: '🍪' };
let dayIdx = 0;
let pickFor = null;

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const days = () => [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });

export function render(s) {
  const lang = currentLang();
  const ds = days();
  const day = ds[dayIdx];
  const plan = s.plan[key(day)] || {};
  const total = Object.values(s.plan).reduce((n, d) => n + Object.keys(d).length, 0);
  const fmt = new Intl.DateTimeFormat(lang, { weekday: 'short' });
  const full = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  return `<header class="top"><button class="back-link" data-act="back">${icons.back}${t('more.title')}</button><h1>${t('nav.plan')}</h1><p class="sub">${t('plan.sub')}</p></header>
    <div class="days" role="tablist">${ds.map((d, i) => {
      const n = Object.keys(s.plan[key(d)] || {}).length;
      return `<button role="tab" class="day${i === dayIdx ? ' on' : ''}" data-act="plan-day" data-i="${i}" aria-selected="${i === dayIdx}"><span>${esc(fmt.format(d))}</span><b>${d.getDate()}</b>${n ? `<i>${n}</i>` : ''}</button>`;
    }).join('')}</div>
    <h2 class="sec">${esc(full.format(day))}</h2>
    <div class="slots">${SLOTS.map((sl) => {
      const r = plan[sl] && BY_ID[plan[sl]];
      return r
        ? `<div class="slot filled"><span class="slot-l">${SLOT_E[sl]} ${t(`slot.${sl}`)}</span>${recipeRow(r)}<button class="slot-x" data-act="plan-remove" data-slot="${sl}" aria-label="${t('common.remove')}">${icons.close}</button></div>`
        : `<button class="slot empty" data-act="plan-pick" data-slot="${sl}"><span class="slot-l">${SLOT_E[sl]} ${t(`slot.${sl}`)}</span><span class="slot-add">${icons.plus} ${t('plan.add')}</span></button>`;
    }).join('')}</div>
    <div class="plan-actions">
      <button class="btn" data-act="plan-fill">${icons.shuffle} ${t('plan.fill')}</button>
      <button class="btn primary" data-act="plan-cart" ${total ? '' : 'disabled'}>${icons.cart} ${t('plan.cart')}</button>
    </div>
    ${total ? `<button class="link danger" data-act="plan-clear">${t('plan.clear')}</button>` : ''}`;
}

function pickSheet(slot) {
  pickFor = slot;
  const s = store.get();
  const owned = new Set(s.owned);
  const pool = RECIPES.filter((r) => SLOT_TAGS[slot](r) && passesDiet(r, s.diet) && !missingGear(r, owned).length)
    .sort((a, b) => jitter(a.id, Math.floor(Date.now() / 3600000)) - jitter(b.id, Math.floor(Date.now() / 3600000))).slice(0, 14);
  openSheet(`<h2>${SLOT_E[slot]} ${t(`slot.${slot}`)}</h2>
    <div class="list">${pool.map((r) => `<button class="rrow" data-act="plan-choose" data-id="${r.id}">${tile(r)}<span class="rrow-body"><span class="rrow-t">${esc(rtext(r).t)}</span><span class="rrow-m">${timeLabel(r.min)}</span></span><span class="chev">${icons.plus}</span></button>`).join('')}</div>
    <a class="btn full ghost" href="#/recipes" data-act="close-sheet">${t('plan.browse')}</a>`, { tall: true });
}

export function onClick(act, el) {
  const s = store.get();
  const ds = days();
  const k = key(ds[dayIdx]);
  switch (act) {
    case 'plan-day': dayIdx = Number(el.dataset.i); store.set({}); return true;
    case 'plan-pick': pickSheet(el.dataset.slot); return true;
    case 'plan-choose': store.set({ plan: { ...s.plan, [k]: { ...(s.plan[k] || {}), [pickFor]: el.dataset.id } } }); closeSheet(); return true;
    case 'plan-remove': { const d = { ...(s.plan[k] || {}) }; delete d[el.dataset.slot]; store.set({ plan: { ...s.plan, [k]: d } }); return true; }
    case 'plan-clear': store.set({ plan: {} }); return true;
    case 'plan-fill': {
      const owned = new Set(s.owned);
      const plan = { ...s.plan };
      const used = new Set();
      ds.forEach((d, di) => {
        const dk = key(d);
        const cur = { ...(plan[dk] || {}) };
        for (const sl of ['breakfast', 'lunch', 'dinner']) {
          if (cur[sl]) continue;
          const pool = RECIPES.filter((r) => SLOT_TAGS[sl](r) && passesDiet(r, s.diet) && !missingGear(r, owned).length && !used.has(r.id));
          if (!pool.length) continue;
          const r = pool[Math.floor(jitter(`${dk}${sl}`, s.seed + di) * pool.length)];
          cur[sl] = r.id; used.add(r.id);
        }
        plan[dk] = cur;
      });
      store.set({ plan, seed: s.seed + 1 });
      toast(t('plan.filled'));
      return true;
    }
    case 'plan-cart': {
      const next = [...s.shop];
      let added = 0;
      for (const [, slots] of Object.entries(s.plan)) {
        for (const id of Object.values(slots)) {
          const r = BY_ID[id];
          if (!r) continue;
          for (const x of r.ing) {
            if (x.opt || s.pantry.includes(x.id) || s.have.includes(x.id)) continue;
            const entry = { q: x.q, scale: 1, from: id };
            const hit = next.find((y) => y.id === x.id && !y.done);
            if (hit) { if (!hit.qs.some((z) => z.from === id)) { hit.qs = [...hit.qs, entry]; added++; } }
            else { next.push({ id: x.id, qs: [entry], done: false }); added++; }
          }
        }
      }
      store.set({ shop: next });
      toast(t('plan.cart.done', { n: added }));
      location.hash = '#/shop';
      return true;
    }
    default: return false;
  }
}

