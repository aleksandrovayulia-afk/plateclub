// Экран рецепта
import { ING, SUBS } from '../data/ingredients.js';
import { EQUIP } from '../data/equipment.js';
import { BY_ID, RECIPES, analyze, scaleQty, missingGear, gearName } from '../engine.js';
import * as store from '../store.js';
import { esc, md, icons, timeLabel, LEVELS, cuisine, toast, recipeRow } from '../ui.js';

const servings = {}; // id → число порций, пока открыт рецепт

export function render(s, id) {
  const r = BY_ID[id];
  if (!r) return `<header class="top"><h1>Рецепт не найден</h1></header><a class="btn" href="#/recipes">К рецептам</a>`;
  const n = servings[id] || r.srv;
  const k = n / r.srv;
  const ctx = { have: new Set(s.have), pantry: new Set(s.pantry), owned: new Set(s.owned) };
  const a = analyze(r, ctx);
  const gear = missingGear(r, ctx.owned);
  const fav = s.favs.includes(id);
  const useFridge = s.have.length > 0;
  const missIds = new Set(a.missing.map((x) => x.id));

  const ings = r.ing.map((x) => {
    const i = ING[x.id];
    const miss = missIds.has(x.id);
    const state = !useFridge ? '' : miss ? ' miss' : ' have';
    return `<li class="ing${state}${x.opt ? ' opt' : ''}">
      <span class="ing-n">${i.e} ${esc(i.n)}${x.opt ? ' <em>по желанию</em>' : ''}</span>
      <span class="ing-q">${esc(scaleQty(x.qty, k))}</span>
    </li>`;
  }).join('');

  const subs = a.missing.filter((x) => SUBS[x.id]).slice(0, 3);
  const subsHtml = useFridge && subs.length
    ? `<div class="note"><strong>Нет под рукой?</strong>${subs.map((x) => `<p><b>${esc(ING[x.id].n)}.</b> ${esc(SUBS[x.id])}</p>`).join('')}</div>` : '';

  const eqHtml = r.eq.length
    ? `<div class="eqs">${r.eq.map((e) => {
        const group = Array.isArray(e) ? e : [e];
        const ok = group.some((x) => ctx.owned.has(x));
        return `<span class="eq ${ok ? 'ok' : 'no'}">${ok ? icons.check : icons.close}${group.map((x) => EQUIP[x].n).join(' / ')}</span>`;
      }).join('')}</div>`
    : '<p class="muted">Специальная техника не нужна — только нож, доска и миска.</p>';

  const steps = r.steps.map((st, i) => `<li><span class="step-n">${i + 1}</span><div class="step-t">${esc(st.text)}${st.min ? `<span class="step-timer">${icons.timer}${timeLabel(st.min)}</span>` : ''}</div></li>`).join('');
  const tips = r.tips.length ? `<div class="note tips"><strong>Советы</strong>${r.tips.map((t) => `<p>${md(t)}</p>`).join('')}</div>` : '';

  const similar = RECIPES.filter((x) => x.id !== id && x.c === r.c && !missingGear(x, ctx.owned).length)
    .map((x) => [x, x.ing.filter((y) => r.ing.some((z) => z.id === y.id)).length])
    .sort((p, q) => q[1] - p[1]).slice(0, 3).map((p) => p[0]);

  const cartCount = useFridge ? a.missing.filter((x) => !ctx.pantry.has(x.id)).length : r.ing.filter((x) => !x.opt && !ctx.pantry.has(x.id)).length;

  return `<div class="detail">
    <div class="bar">
      <button class="icon-btn" data-act="back" aria-label="Назад">${icons.back}</button>
      <button class="icon-btn${fav ? ' on' : ''}" data-act="fav" data-id="${id}" aria-pressed="${fav}" aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}">${icons.heart}</button>
    </div>
    <section class="d-hero" style="--t:${tintOf(r)}">
      <span class="d-e" aria-hidden="true">${r.e}</span>
    </section>
    <h1 class="d-title">${esc(r.t)}</h1>
    <p class="d-desc">${esc(r.d)}</p>
    <div class="facts">
      <span><b>${timeLabel(r.min)}</b>время</span>
      <span><b>${LEVELS[r.lv]}</b>сложность</span>
      <span><b>${cuisine(r.cu) || '—'}</b>кухня</span>
    </div>
    <div class="tags">${r.diet.vegan ? '<span class="tag">Веган</span>' : r.diet.vegetarian ? '<span class="tag">Вегетарианское</span>' : ''}${r.diet.glutenFree ? '<span class="tag">Без глютена</span>' : ''}${r.tags.includes('sport') ? '<span class="tag">Спорт</span>' : ''}</div>

    <h2 class="sec">Что понадобится</h2>
    ${eqHtml}
    ${gear.length ? `<div class="note warn">Для этого рецепта нужно: ${gear.map(gearName).join(', ')}. <a href="#/kitchen">Моя техника</a></div>` : ''}

    <div class="ing-head">
      <h2 class="sec">Ингредиенты</h2>
      <div class="stepper" role="group" aria-label="Порции">
        <button data-act="srv" data-d="-1" aria-label="Меньше порций">−</button>
        <span><b>${n}</b> ${n === 1 ? 'порция' : n < 5 ? 'порции' : 'порций'}</span>
        <button data-act="srv" data-d="1" aria-label="Больше порций">+</button>
      </div>
    </div>
    ${useFridge ? `<p class="muted small">Отмечено по вашему холодильнику: ${a.missing.length ? `не хватает ${a.missing.length}` : 'всё есть'}.</p>` : ''}
    <ul class="ings">${ings}</ul>
    ${subsHtml}
    ${cartCount ? `<button class="btn ghost full" data-act="to-cart" data-id="${id}">${icons.cart} ${useFridge ? `Докупить недостающее (${cartCount})` : 'Добавить в список покупок'}</button>` : ''}

    <h2 class="sec">Приготовление</h2>
    <ol class="steps">${steps}</ol>
    ${tips}
    ${s.cooked[id] ? '<p class="muted small center">Вы уже готовили это блюдо. Отличный выбор!</p>' : ''}

    ${similar.length ? `<h2 class="sec">Похожие рецепты</h2><div class="list">${similar.map((x) => recipeRow(x)).join('')}</div>` : ''}
    <div class="cta-space"></div>
  </div>
  <div class="cta"><button class="btn primary big" data-act="cook" data-id="${id}">Начать готовить</button></div>`;
}

const tintOf = (r) => ({ cakes: '#f4b6c2', sweet: '#f7c99b', savory: '#b9d49a', shakes: '#9fc8ec', sport: '#a5dcc7', other: '#cdbfe8' }[r.c]);

export function onClick(act, el) {
  const s = store.get();
  const id = el.dataset.id || location.hash.split('/')[2];
  switch (act) {
    case 'fav': {
      const on = !s.favs.includes(id);
      store.set({ favs: on ? [...s.favs, id] : s.favs.filter((x) => x !== id) });
      toast(on ? 'Добавлено в избранное' : 'Убрано из избранного');
      return true;
    }
    case 'srv': {
      const r = BY_ID[id];
      const cur = servings[id] || r.srv;
      servings[id] = Math.min(24, Math.max(1, cur + Number(el.dataset.d)));
      store.set({});
      return true;
    }
    case 'to-cart': {
      const r = BY_ID[id];
      const useFridge = s.have.length > 0;
      const k = (servings[id] || r.srv) / r.srv;
      const a = analyze(r, { have: new Set(s.have), pantry: new Set(s.pantry), owned: new Set(s.owned) });
      const items = (useFridge ? a.missing : r.ing.filter((x) => !x.opt)).filter((x) => !s.pantry.includes(x.id));
      const have = new Set(s.shop.map((x) => x.id));
      const add = items.filter((x) => !have.has(x.id)).map((x) => ({ id: x.id, t: `${ING[x.id].n} — ${scaleQty(x.qty, k)}`, done: false, from: r.t }));
      store.set({ shop: [...s.shop, ...add] });
      toast(add.length ? `В списке покупок: +${add.length}` : 'Всё уже в списке покупок');
      return true;
    }
    default: return false;
  }
}
