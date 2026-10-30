// node mise/test/data.test.mjs — целостность данных: рецепты, переводы, продукты, количества
import assert from 'node:assert/strict';
import { ING } from '../js/data/ingredients.js';
import { EQUIP } from '../js/data/equipment.js';
import { SUBS } from '../js/data/subs.js';
import { CATEGORIES, CUISINES } from '../js/data/recipes/index.js';
import { RECIPES, extractIngredients } from '../js/engine.js';
import { validQty, fmtQty } from '../js/qty.js';
import { setLang } from '../js/i18n.js';

let n = 0;
let problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };
const t = (name, fn) => {
  problems = [];
  fn();
  if (problems.length) {
    console.log(`FAIL ${name}: ${problems.length} проблем`);
    for (const p of problems.slice(0, 40)) console.log('   -', p);
    process.exitCode = 1;
    return;
  }
  n++;
  console.log('ok  ' + name);
};
const LANGS = ['ru', 'en', 'es'];
const CYR = /[А-Яа-яЁё]/;

t('рецептов больше 10 000', () => {
  console.log('    всего рецептов:', RECIPES.length);
  check(RECIPES.length > 10000, `нужно больше 1000, а их ${RECIPES.length}`);
});

t('id уникальны, категории и кухни существуют', () => {
  const ids = new Set();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id), 'дубль id ' + r.id); ids.add(r.id);
    check(CATEGORIES.some((c) => c.id === r.c), `${r.id}: категория ${r.c}`);
    check(CUISINES[r.cu], `${r.id}: кухня ${r.cu}`);
    check(['sweet', 'salty'].includes(r.f), `${r.id}: вкус`);
    check(r.min > 0 && r.srv > 0 && [1, 2, 3].includes(r.lv), `${r.id}: числа`);
  }
});

t('продукты и техника в рецептах существуют, количества корректны', () => {
  for (const r of RECIPES) {
    check(r.ing.length >= 2, `${r.id}: мало ингредиентов`);
    const seen = new Set();
    for (const x of r.ing) {
      check(ING[x.id], `${r.id}: продукт ${x.id}`);
      check(validQty(x.q), `${r.id}: количество «${x.q}» у ${x.id}`);
      check(!seen.has(x.id), `${r.id}: продукт ${x.id} повторяется`);
      seen.add(x.id);
    }
    for (const e of r.eq.flat()) check(EQUIP[e], `${r.id}: техника ${e}`);
  }
});

t('все три языка заполнены, число шагов совпадает', () => {
  for (const r of RECIPES) {
    const base = r.text.ru.s.length;
    check(base >= 2, `${r.id}: шагов мало`);
    for (const l of LANGS) {
      const x = r.text[l];
      check(x && x.t && x.d, `${r.id}/${l}: нет названия или описания`);
      check(x.s.length === base, `${r.id}/${l}: число шагов ${x.s.length} ≠ ${base}`);
      check(x.k.length >= 1, `${r.id}/${l}: нет советов`);
      for (const s of x.s) check(s.length > 8, `${r.id}/${l}: пустой шаг`);
    }
    check((r.stepMin || r.text.ru.sm).length <= base, `${r.id}: таймеров больше шагов`);
  }
});

t('нет остатков шаблонов и чужих алфавитов', () => {
  for (const r of RECIPES) {
    for (const l of LANGS) {
      const x = r.text[l];
      const all = [x.t, x.d, ...x.s, ...x.k];
      for (const s of all) {
        check(!/[{}]/.test(s), `${r.id}/${l}: остался шаблон «${s}»`);
        check(!/undefined|NaN/.test(s), `${r.id}/${l}: undefined в «${s}»`);
        if (l !== 'ru') check(!CYR.test(s), `${r.id}/${l}: кириллица в «${s}»`);
        if (l === 'es') check(!/\b(de|a) el\b/i.test(s), `${r.id}/es: нужна слитная форма в «${s}»`);
        check(!/ {2,}/.test(s), `${r.id}/${l}: двойной пробел в «${s}»`);
      }
    }
  }
});

t('названия уникальны в каждом языке', () => {
  for (const l of LANGS) {
    const seen = new Map();
    for (const r of RECIPES) {
      const k = r.text[l].t.toLowerCase();
      check(!seen.has(k), `${l}: «${r.text[l].t}» у ${seen.get(k)} и ${r.id}`);
      seen.set(k, r.id);
    }
  }
});

t('названия не слишком длинные, описания не слишком короткие', () => {
  for (const r of RECIPES) for (const l of LANGS) {
    check(r.text[l].t.length <= 70, `${r.id}/${l}: длинное название «${r.text[l].t}»`);
    check(r.text[l].d.length >= 20, `${r.id}/${l}: короткое описание`);
  }
});

t('словарь продуктов: названия на трёх языках, формы, слова', () => {
  for (const ing of Object.values(ING)) {
    for (const l of LANGS) {
      check(ing.n[l], `${ing.id}: нет названия ${l}`);
      check(ing.w[l].length >= 1, `${ing.id}: нет слов ${l}`);
    }
    const f = ing.form;
    for (const k of ['n', 'g', 'a', 'i', 'w']) check(f.ru[k], `${ing.id}: ru.${k}`);
    check(f.en.n && f.en.s, `${ing.id}: en`);
    check(f.es.n && f.es.d, `${ing.id}: es`);
  }
});

t('все слова словаря находят свой продукт', () => {
  for (const ing of Object.values(ING)) {
    for (const l of LANGS) {
      for (const w of [...ing.w[l], ing.n[l]]) {
        const ids = extractIngredients(w).ids;
        check(ids.includes(ing.id), `«${w}» (${l}) → ${ids.join(',') || '—'}; ожидали ${ing.id}`);
      }
    }
  }
});

t('замены: тексты на трёх языках для существующих продуктов', () => {
  for (const [id, v] of Object.entries(SUBS)) {
    check(ING[id], `замена для неизвестного продукта ${id}`);
    for (const l of LANGS) check(v[l] && v[l].length > 10, `${id}/${l}`);
  }
});

t('форматирование количеств: склонение и единицы', () => {
  setLang('ru');
  assert.equal(fmtQty('2 clove'), '2 зубчика');
  assert.equal(fmtQty('5 clove'), '5 зубчиков');
  assert.equal(fmtQty('1 clove'), '1 зубчик');
  assert.equal(fmtQty('200 g'), '200 г');
  assert.equal(fmtQty('1/2 tsp'), '½ ч. л.');
  assert.equal(fmtQty('~taste'), 'по вкусу');
  setLang('en');
  assert.equal(fmtQty('2 clove'), '2 cloves');
  assert.equal(fmtQty('3 pc'), '3');
  assert.equal(fmtQty('3 tbsp'), '3 tbsp');
  assert.equal(fmtQty('200 g', { imp: true }), '7 oz');
  assert.equal(fmtQty('500 ml', { imp: true }), '2 cups');
  setLang('es');
  assert.equal(fmtQty('2 tbsp'), '2 cucharadas');
  assert.equal(fmtQty('1 tbsp'), '1 cucharada');
  assert.equal(fmtQty('~taste'), 'al gusto');
  assert.equal(fmtQty('2 clove', { scale: 2 }), '4 dientes');
  setLang('ru');
});

t('разнообразие: категории, кухни, время', () => {
  const byCat = {};
  for (const r of RECIPES) byCat[r.c] = (byCat[r.c] || 0) + 1;
  console.log('    по категориям:', JSON.stringify(byCat));
  for (const c of CATEGORIES) check(byCat[c.id] >= 40, `мало рецептов в «${c.id}»: ${byCat[c.id]}`);
  const used = new Set(RECIPES.map((r) => r.id.split('-')[0]));
  assert.ok(used.size > 50);
  const noEquip = RECIPES.filter((r) => !r.eq.length).length;
  check(noEquip >= 80, `рецептов без техники ${noEquip}`);
});

console.log(`\n${n} проверок данных пройдено`);
