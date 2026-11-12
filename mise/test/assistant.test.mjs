import { setLang } from '../js/i18n.js';
import { answer } from '../js/assistant-core.js';
import { BY_ID } from '../js/engine.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const base = { have: [], pantry: ['salt', 'oil', 'water', 'sugar'], owned: ['stove', 'pan', 'pot', 'oven', 'blender', 'mixer', 'whisk', 'grater', 'bakeform', 'sieve'], diet: {}, cooked: {}, liked: {}, last: '' };
const recipes = (parts) => parts.filter((p) => p.type === 'recipes').flatMap((p) => p.items.map((i) => BY_ID[i.id]));
const action = (parts, kind) => parts.find((p) => p.type === 'action' && p.kind === kind);

for (const [lang, c] of Object.entries({
  ru: { fridge: 'яйца молоко мука', timer: 'поставь таймер на 15 минут', hour: 'таймер на 1 час', shop: 'добавь молоко и яйца в список покупок', plan: 'составь меню на неделю', cuisine: 'итальянская паста', cu: 'it', quick: 'быстрый ужин без духовки', more: 'ещё', ref: 'ужин из курицы', refine: 'быстрее' },
  en: { fridge: 'eggs milk flour', timer: 'set a timer for 15 minutes', hour: 'timer for 1 hour', shop: 'add milk and eggs to my shopping list', plan: 'plan my week', cuisine: 'italian pasta', cu: 'it', quick: 'a quick dinner without oven', more: 'more', ref: 'dinner with chicken', refine: 'faster' },
  es: { fridge: 'huevos leche harina', timer: 'temporizador de 15 minutos', hour: 'temporizador de 1 hora', shop: 'añade leche y huevos a la lista de la compra', plan: 'planifica la semana', cuisine: 'pasta italiana', cu: 'it', quick: 'una cena rápida sin horno', more: 'más', ref: 'cena con pollo', refine: 'más rápido' },
})) {
  setLang(lang);
  const f = answer(c.fridge, { ...base, last: '' }, 1);
  ok(recipes(f).length >= 2, `${lang}: холодильник → рецепты`);
  ok(action(answer(c.timer, base, 1), 'timer')?.min === 15, `${lang}: таймер 15`);
  ok(action(answer(c.hour, base, 1), 'timer')?.min === 60, `${lang}: таймер час`);
  const sh = action(answer(c.shop, base, 1), 'shop');
  ok(sh && sh.ids.includes('milk') && sh.ids.includes('egg'), `${lang}: список покупок ${JSON.stringify(sh)}`);
  ok(!!action(answer(c.plan, base, 1), 'plan'), `${lang}: план недели`);
  const cu = recipes(answer(c.cuisine, base, 1));
  ok(cu.length >= 2 && cu.every((r) => r.cu === c.cu), `${lang}: кухня ${cu.map((r) => r.cu)}`);
  const q = recipes(answer(c.quick, base, 1));
  ok(q.length >= 2 && q.every((r) => !r.eq.includes('oven')), `${lang}: без духовки`);
  const first = answer(c.ref, base, 1);
  const r1 = recipes(first);
  ok(r1.length >= 2, `${lang}: ужин с курицей`);
  const ref = answer(c.refine, { ...base, last: first.query }, 1);
  ok(ref.query.includes(c.ref) && recipes(ref).every((r) => r.min <= 20), `${lang}: уточнение «${c.refine}» → ${ref.query} / ${recipes(ref).map((r) => r.min)}`);
  const m1 = recipes(answer(c.ref, base, 1, 0)).map((r) => r.id);
  const m2 = recipes(answer(c.more, { ...base, last: c.ref, page: 0 }, 1)).map((r) => r.id);
  ok(m2.length && !m2.some((id) => m1.includes(id)), `${lang}: «ещё» даёт новые рецепты`);
}
const textOf = (parts) => parts.filter((p) => p.type === 'text').map((p) => p.text).join(' ');
for (const [lang, c] of Object.entries({
  ru: { thanks: 'спасибо', fact: 'расскажи интересный факт', term: 'что такое аль денте', conv: 'сколько граммов в стакане муки', conv2: '2 ст. л. сахара в граммах', recipe: 'добавь ингредиенты для тирамису в список покупок', who: 'кто ты' },
  en: { thanks: 'thank you', fact: 'tell me a fun fact', term: 'what does blanching mean', conv: 'how many grams in a cup of flour', conv2: '2 tbsp of sugar in grams', recipe: 'add the ingredients for tiramisu to my shopping list', who: 'who are you' },
  es: { thanks: 'gracias', fact: 'cuéntame un dato curioso', term: 'qué es escaldar', conv: 'cuántos gramos hay en una taza de harina', conv2: '2 cucharadas de azúcar en gramos', recipe: 'añade los ingredientes de tiramisú a la lista de la compra', who: 'quién eres' },
})) {
  setLang(lang);
  ok(textOf(answer(c.thanks, base, 1)).length > 5, `${lang}: спасибо`);
  ok(textOf(answer(c.fact, base, 3)).length > 20, `${lang}: факт`);
  ok(textOf(answer(c.who, base, 1)).includes('Limmy') || textOf(answer(c.who, base, 1)).includes('Лимми'), `${lang}: кто ты`);
  ok(/\*\*/.test(textOf(answer(c.term, base, 1))), `${lang}: термин → ${textOf(answer(c.term, base, 1)).slice(0, 60)}`);
  ok(/12[05]/.test(textOf(answer(c.conv, base, 1))), `${lang}: меры → ${textOf(answer(c.conv, base, 1))}`);
  ok(/(2[05]|3[05])/.test(textOf(answer(c.conv2, base, 1))), `${lang}: меры 2 ложки → ${textOf(answer(c.conv2, base, 1))}`);
  const act = action(answer(c.recipe, base, 1), 'shop-recipe');
  ok(act && BY_ID[act.id].text.ru.t.toLowerCase().includes('тирамису'), `${lang}: ингредиенты рецепта → ${JSON.stringify(act)}`);
}
console.log(fails ? `${fails} проблем` : 'помощник: все проверки пройдены');
process.exit(fails ? 1 : 0);
