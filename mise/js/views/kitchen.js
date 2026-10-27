// «Кухня»: моя техника, запасы, питание, избранное и список покупок
import { EQUIP, PRESETS, BASIC_NOTE } from '../data/equipment.js';
import { ING, PANTRY_OPTIONS } from '../data/ingredients.js';
import { RECIPES, BY_ID } from '../engine.js';
import * as store from '../store.js';
import { esc, recipeRow, toast, openSheet, closeSheet, icons } from '../ui.js';

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; store.set({}); });

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export function render(s) {
  const preset = Object.entries(PRESETS).find(([, p]) => sameSet(p.eq, s.owned))?.[0];
  const favs = s.favs.map((id) => BY_ID[id]).filter(Boolean);
  const cookedN = Object.keys(s.cooked).length;
  const open = s.shop.filter((x) => !x.done).length;
  return `<header class="top"><h1>Кухня</h1><p class="sub">Чем вы готовите. Рецепты подстроятся.</p></header>

    <h2 class="sec">Моя техника</h2>
    <div class="seg" role="radiogroup" aria-label="Набор техники">${Object.entries(PRESETS).map(([id, p]) => `<button role="radio" aria-checked="${preset === id}" class="${preset === id ? 'on' : ''}" data-act="preset" data-p="${id}">${p.n}</button>`).join('')}</div>
    <div class="chips">${Object.entries(EQUIP).map(([id, e]) => `<button class="chip${s.owned.includes(id) ? ' on' : ''}" data-act="toggle-eq" data-id="${id}" aria-pressed="${s.owned.includes(id)}"><span class="chip-e">${e.e}</span>${e.n}</button>`).join('')}</div>
    <p class="muted small">${BASIC_NOTE}</p>

    <h2 class="sec">Всегда есть дома</h2>
    <div class="chips">${PANTRY_OPTIONS.map((id) => `<button class="chip${s.pantry.includes(id) ? ' on' : ''}" data-act="toggle-pantry" data-id="${id}" aria-pressed="${s.pantry.includes(id)}"><span class="chip-e">${ING[id].e}</span>${esc(ING[id].n)}</button>`).join('')}</div>
    <p class="muted small">Эти продукты не нужно отмечать в холодильнике.</p>

    <h2 class="sec">Питание</h2>
    <label class="switch"><input type="checkbox" data-act="diet" data-k="vegetarian" ${s.diet.vegetarian ? 'checked' : ''}><span class="knob"></span><span>Вегетарианское</span></label>
    <label class="switch"><input type="checkbox" data-act="diet" data-k="vegan" ${s.diet.vegan ? 'checked' : ''}><span class="knob"></span><span>Веганское</span></label>
    <label class="switch"><input type="checkbox" data-act="diet" data-k="glutenFree" ${s.diet.glutenFree ? 'checked' : ''}><span class="knob"></span><span>Без глютена</span></label>

    <h2 class="sec">Список покупок ${open ? `<span class="count">${open}</span>` : ''}</h2>
    ${s.shop.length ? `<ul class="shop">${s.shop.map((x, i) => `<li class="${x.done ? 'done' : ''}"><button class="check" data-act="shop-toggle" data-i="${i}" aria-pressed="${x.done}" aria-label="${esc(x.t)}">${x.done ? icons.check : ''}</button><span>${esc(x.t)}${x.from ? `<em>${esc(x.from)}</em>` : ''}</span></li>`).join('')}</ul>
       <button class="link" data-act="shop-clear">Очистить список</button>` : '<p class="muted">Пока пусто. На странице рецепта можно добавить недостающее.</p>'}

    <h2 class="sec">Избранное ${favs.length ? `<span class="count">${favs.length}</span>` : ''}</h2>
    ${favs.length ? `<div class="list">${favs.map((r) => recipeRow(r)).join('')}</div>` : '<p class="muted">Нажмите ♥ на странице рецепта, чтобы сохранить его здесь.</p>'}

    <h2 class="sec">О приложении</h2>
    <div class="about">
      <p><b>Mise</b> — ${RECIPES.length} рецептов, подбор по холодильнику и помощник, который работает без интернета и ничего не отправляет на сервер.</p>
      <p class="muted small">Приготовлено блюд: ${cookedN}. Данные хранятся только на этом устройстве.</p>
      ${deferredInstall ? '<button class="btn" data-act="install">Установить на экран</button>' : ''}
      <button class="link danger" data-act="reset">Сбросить все данные</button>
    </div>`;
}

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'preset': store.set({ owned: PRESETS[el.dataset.p].eq }); return true;
    case 'toggle-eq': store.set({ owned: store.toggleIn(s.owned, el.dataset.id) }); return true;
    case 'toggle-pantry': store.set({ pantry: store.toggleIn(s.pantry, el.dataset.id) }); return true;
    case 'shop-toggle': store.set({ shop: s.shop.map((x, i) => (i === Number(el.dataset.i) ? { ...x, done: !x.done } : x)) }); return true;
    case 'shop-clear': store.set({ shop: [] }); return true;
    case 'install':
      if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; store.set({}); }
      return true;
    case 'reset':
      openSheet(`<h2>Сбросить данные?</h2><p class="muted">Будут удалены избранное, список покупок, история чата и настройки техники.</p>
        <div class="row"><button class="btn" data-act="close-sheet">Отмена</button><button class="btn danger" data-act="reset-yes">Сбросить</button></div>`);
      return true;
    case 'reset-yes': closeSheet(); store.reset(); toast('Данные сброшены'); return true;
    default: return false;
  }
}

export function onChange(act, el) {
  if (act === 'diet') { const s = store.get(); store.set({ diet: { ...s.diet, [el.dataset.k]: el.checked } }); return true; }
  return false;
}
