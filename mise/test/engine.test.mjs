// node mise/test/engine.test.mjs
import assert from 'node:assert/strict';
import { ING, ALT } from '../js/data/ingredients.js';
import { EQUIP, PRESETS } from '../js/data/equipment.js';
import { CATEGORIES } from '../js/data/recipes/index.js';
import { RECIPES, extractIngredients, parseQuery, fridgeSearch, answer, scaleQty, missingGear, searchRecipes } from '../js/engine.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

t('данные: все продукты и техника в рецептах существуют', () => {
  const ids = new Set();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id), 'дубль id ' + r.id); ids.add(r.id);
    assert.ok(CATEGORIES.some((c) => c.id === r.c), `${r.id}: категория ${r.c}`);
    assert.ok(['sweet', 'salty'].includes(r.f), `${r.id}: вкус`);
    assert.ok(r.steps.length >= 3, `${r.id}: мало шагов`);
    assert.ok(r.tips.length >= 1, `${r.id}: нет советов`);
    assert.ok(r.ing.length >= 2, `${r.id}: мало ингредиентов`);
    for (const x of r.ing) assert.ok(ING[x.id], `${r.id}: неизвестный продукт ${x.id}`);
    for (const e of r.eq.flat()) assert.ok(EQUIP[e], `${r.id}: неизвестная техника ${e}`);
  }
  console.log('    рецептов:', RECIPES.length);
});

t('поиск продуктов в тексте, падежи и фразы', () => {
  const g = (s) => extractIngredients(s).ids.sort();
  assert.deepEqual(g('у меня есть яйца, молоко и мука'), ['egg', 'flour', 'milk']);
  assert.deepEqual(g('картошка, лука немного, куриная грудка'), ['chicken', 'onion', 'potato']);
  assert.deepEqual(g('сливочное масло и растительное масло'), ['butter', 'oil']);
  assert.deepEqual(g('болгарский перец и чёрный перец'), ['bellpepper', 'pepper']);
  assert.deepEqual(g('помидоры, огурцы, соленые огурцы'), ['cucumber', 'pickle', 'tomato']);
  assert.deepEqual(g('сгущённое молоко'), ['condensed']);
  assert.deepEqual(g('томатная паста и паста'), ['pasta', 'tomatopaste']);
  assert.deepEqual(g('кабачок и кабачки'), ['zucchini']);
});

t('все слова словаря распознаются как свой продукт', () => {
  for (const ing of Object.values(ING)) {
    for (const w of ing.w) {
      const ids = extractIngredients(w).ids;
      assert.ok(ids.includes(ing.id), `«${w}» → ${ids} (ожидали ${ing.id})`);
    }
  }
});

t('техника: плита подразумевается, «любое из»', () => {
  const r = RECIPES.find((x) => x.id === 'protein-shake');
  assert.equal(missingGear(r, []).length, 1);
  assert.equal(missingGear(r, ['shaker']).length, 0);
  const o = RECIPES.find((x) => x.id === 'omelet');
  assert.equal(missingGear(o, ['pan']).length, 1);
  assert.equal(missingGear(o, ['pan', 'stove']).length, 0);
});

t('без техники доступны только рецепты без техники', () => {
  const res = fridgeSearch({ have: [], pantry: ['salt', 'water'], owned: [], mood: 'any' });
  const doable = [...res.ready, ...res.almost, ...res.other];
  assert.ok(doable.length >= 10, 'должно быть хотя бы 10 рецептов без техники, а их ' + doable.length);
  for (const a of doable) assert.deepEqual(a.recipe.eq, []);
});

t('холодильник: яйца+молоко+мука → блины/оладьи в готовых или почти', () => {
  const owned = Object.keys(EQUIP);
  const res = fridgeSearch({ have: ['egg', 'milk', 'flour'], pantry: ['salt', 'pepper', 'water', 'oil', 'sugar'], owned, mood: 'sweet' });
  const ids = [...res.ready, ...res.almost].map((a) => a.recipe.id);
  assert.ok(ids.includes('blini'), 'блины: ' + ids.join(','));
  for (const a of res.ready) assert.equal(a.missing.length, 0);
});

t('настроение «солёное» и «сладкое» не смешиваются', () => {
  const owned = Object.keys(EQUIP);
  const base = { have: ['egg', 'milk', 'flour', 'potato', 'onion'], pantry: ['salt', 'oil', 'sugar', 'water'], owned };
  for (const a of Object.values(fridgeSearch({ ...base, mood: 'salty' })).flat()) assert.equal(a.recipe.f, 'salty');
  for (const a of Object.values(fridgeSearch({ ...base, mood: 'sweet' })).flat()) assert.equal(a.recipe.f, 'sweet');
});

t('вегетарианские и веганские фильтры', () => {
  const owned = Object.keys(EQUIP);
  const res = fridgeSearch({ have: ['potato', 'onion', 'egg', 'chicken'], pantry: ['salt', 'oil'], owned, diet: { vegan: true } });
  for (const a of Object.values(res).flat()) assert.ok(a.recipe.diet.vegan, a.recipe.id);
});

t('разбор запроса', () => {
  let q = parseQuery('Хочу что-нибудь сладкое за 15 минут без духовки');
  assert.equal(q.mood, 'sweet'); assert.equal(q.maxMin, 15); assert.ok(q.noGear.has('oven'));
  q = parseQuery('ужин из курицы и риса без молока');
  assert.deepEqual(q.ing.sort(), ['chicken', 'rice']); assert.deepEqual(q.without, ['milk']); assert.equal(q.mood, 'salty');
  q = parseQuery('торт без выпечки');
  assert.equal(q.cat, 'cakes');
});

const state = { have: [], pantry: ['salt', 'pepper', 'water', 'oil', 'sugar'], owned: Object.keys(EQUIP), diet: {}, cooked: {} };
const rec = (parts) => parts.filter((p) => p.type === 'recipes').flatMap((p) => p.items.map((i) => i.id));

t('помощник: замена продукта', () => {
  const parts = answer('Чем заменить сметану?', state, 1);
  assert.match(parts[0].text, /йогурт/i);
});
t('помощник: торт без духовки не содержит духовки', () => {
  const ids = rec(answer('торт без духовки', state, 7));
  assert.ok(ids.length);
  for (const id of ids) assert.ok(!RECIPES.find((r) => r.id === id).eq.includes('oven'), id);
});
t('помощник: быстро и сладко укладывается во время', () => {
  const ids = rec(answer('сладкое за 15 минут', state, 3));
  assert.ok(ids.length);
  for (const id of ids) assert.ok(RECIPES.find((r) => r.id === id).min <= 15, id);
});
t('помощник: продукты из текста определяют рецепты', () => {
  const ids = rec(answer('что приготовить из курицы и риса', state, 5));
  assert.ok(ids.length);
  const r = RECIPES.find((x) => x.id === ids[0]);
  assert.ok(r.ing.some((x) => x.id === 'chicken' || x.id === 'rice'));
});
t('помощник: рецепт по названию', () => {
  assert.equal(rec(answer('как приготовить сырники', state, 2))[0], 'syrniki');
  assert.equal(rec(answer('рецепт борща', state, 2))[0], 'borscht');
});
t('помощник: без техники — только рецепты без техники', () => {
  const ids = rec(answer('что-нибудь поесть', { ...state, owned: [] }, 9));
  for (const id of ids) assert.deepEqual(RECIPES.find((r) => r.id === id).eq, [], id);
});
t('помощник: приветствие', () => {
  assert.ok(answer('привет', state, 1).some((p) => p.type === 'chips'));
});

t('масштабирование порций', () => {
  assert.equal(scaleQty('200 г', 2), '400 г');
  assert.equal(scaleQty('1/2 ч. л.', 2), '1 ч. л.');
  assert.equal(scaleQty('3 шт', 1.5), '4½ шт');
  assert.equal(scaleQty('по вкусу', 3), 'по вкусу');
  assert.equal(scaleQty('2–3 шт', 2), '2–3 шт');
  assert.equal(scaleQty('1,5 л', 2), '3 л');
});

t('поиск по названию', () => {
  assert.equal(searchRecipes('сырники')[0].id, 'syrniki');
  assert.equal(searchRecipes('шоколад')[0].c !== undefined, true);
  assert.equal(searchRecipes('карбонара')[0].id, 'carbonara');
});

console.log(`\n${n} проверок пройдено`);
