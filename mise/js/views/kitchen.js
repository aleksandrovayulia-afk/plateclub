// «Моя кухня»: техника, всегда имеющиеся продукты, питание и аллергии
import { EQUIP, PRESETS } from '../data/equipment.js';
import { ING, PANTRY_OPTIONS } from '../data/ingredients.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import { DIET_KEYS } from '../store.js';
import { esc, icons } from '../ui.js';

const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export function render(s) {
  const lang = currentLang();
  const preset = Object.entries(PRESETS).find(([, p]) => same(p.eq, s.owned))?.[0];
  return `<header class="top"><button class="back-link" data-act="back">${icons.back}${t('more.title')}</button><h1>${t('kitchen.title')}</h1><p class="sub">${t('kitchen.sub')}</p></header>

    <h2 class="sec">${t('kitchen.equip')}</h2>
    <div class="seg" role="radiogroup" aria-label="${t('kitchen.equip')}">${Object.keys(PRESETS).map((id) => `<button role="radio" aria-checked="${preset === id}" class="${preset === id ? 'on' : ''}" data-act="preset" data-p="${id}">${t(`preset.${id}`)}</button>`).join('')}</div>
    <div class="chips">${Object.entries(EQUIP).map(([id, e]) => `<button class="chip${s.owned.includes(id) ? ' on' : ''}" data-act="toggle-eq" data-id="${id}" aria-pressed="${s.owned.includes(id)}"><span class="chip-e">${e.e}</span>${esc(e.n[lang])}</button>`).join('')}</div>
    <p class="muted small">${t('kitchen.equip.note')}</p>

    <h2 class="sec">${t('kitchen.pantry')}</h2>
    <div class="chips">${PANTRY_OPTIONS.map((id) => `<button class="chip${s.pantry.includes(id) ? ' on' : ''}" data-act="toggle-pantry" data-id="${id}" aria-pressed="${s.pantry.includes(id)}"><span class="chip-e">${ING[id].e}</span>${esc(ING[id].n[lang])}</button>`).join('')}</div>
    <p class="muted small">${t('kitchen.pantry.note')}</p>

    <h2 class="sec">${t('kitchen.diet')}</h2>
    ${DIET_KEYS.map((k) => `<label class="switch"><input type="checkbox" data-act="diet" data-k="${k}" ${s.diet[k] ? 'checked' : ''}><span class="knob"></span><span>${t(`diet.${k}`)}</span></label>`).join('')}
    <p class="muted small">${t('kitchen.diet.note')}</p>`;
}

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'preset': store.set({ owned: PRESETS[el.dataset.p].eq }); return true;
    case 'toggle-eq': store.set({ owned: store.toggleIn(s.owned, el.dataset.id) }); return true;
    case 'toggle-pantry': store.set({ pantry: store.toggleIn(s.pantry, el.dataset.id) }); return true;
    default: return false;
  }
}

export function onChange(act, el) {
  if (act === 'diet') {
    const s = store.get();
    const k = el.dataset.k;
    const diet = { ...s.diet, [k]: el.checked };
    if (k === 'vegan' && el.checked) diet.vegetarian = true;
    store.set({ diet });
    return true;
  }
  return false;
}

