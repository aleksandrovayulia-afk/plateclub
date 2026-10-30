// Мозг приложения: поиск продуктов и рецептов, подбор по холодильнику, фильтры.
// Чистые функции без DOM — их можно запускать и в браузере, и в Node (см. test/).
import { ING, ALT } from './data/ingredients.js';
import { EQUIP } from './data/equipment.js';
import { RAW_RECIPES } from './data/recipes/index.js';
import { currentLang } from './i18n.js';

/* ───────── Текст: нормализация и «основы» слов (русский, английский, испанский) ───────── */

const ENDINGS = ['ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ать', 'ять', 'ой', 'ей', 'ий', 'ый', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ов', 'ев', 'ом', 'ем', 'ах', 'ях', 'ам', 'ям', 'ую', 'юю', 'ых', 'их', 'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь', 'й'];

export function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFD')
    .replace(/([a-z])[̀-ͯ]+/g, '$1') // á→a, ñ→n, ü→u (кириллическую «й» не трогаем)
    .normalize('NFC')
    .replace(/огурец/g, 'огурц')
    .replace(/перец/g, 'перц')
    .replace(/кабачок/g, 'кабачк')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();
}

export function stem(w) {
  if (w.length <= 3) return w;
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= 3) return w.slice(0, -e.length);
  return w;
}

const isCyr = (w) => /[а-я]/.test(w);

/** Формы латинского слова: само слово и возможные единственные числа (eggs→egg, tomatoes→tomato, berries→berry) */
function latForms(w) {
  const f = new Set([w]);
  if (w.length > 3 && w.endsWith('ies')) f.add(`${w.slice(0, -3)}y`);
  if (w.length > 3 && w.endsWith('es')) f.add(w.slice(0, -2));
  if (w.length > 2 && w.endsWith('s')) f.add(w.slice(0, -1));
  return f;
}

/** Ключ слова для сопоставления: кириллица — основа, латиница — набор форм */
const tokMemo = new Map();
const tok = (w) => {
  let t = tokMemo.get(w);
  if (!t) { t = isCyr(w) ? { c: true, k: stem(w) } : { c: false, k: latForms(w) }; tokMemo.set(w, t); }
  return t;
};
const tokEq = (a, b) => {
  if (a.c !== b.c) return false;
  if (a.c) return a.k === b.k;
  for (const x of a.k) if (b.k.has(x)) return true;
  return false;
};
export const tokens = (text) => norm(text).split(' ').filter(Boolean).map(tok);

/* ───────── Индекс продуктов: фраза → id ───────── */

const PATTERNS = [];
for (const ing of Object.values(ING)) {
  for (const lang of ['ru', 'en', 'es']) {
    for (const word of ing.w[lang]) PATTERNS.push({ id: ing.id, t: tokens(word), len: norm(word).length });
  }
  for (const lang of ['ru', 'en', 'es']) PATTERNS.push({ id: ing.id, t: tokens(ing.n[lang]), len: norm(ing.n[lang]).length });
}
PATTERNS.sort((a, b) => b.t.length - a.t.length || b.len - a.len);

/** Находит продукты в свободном тексте на любом из трёх языков. */
export function extractIngredients(text) {
  const toks = tokens(text);
  const used = new Array(toks.length).fill(false);
  const ids = [];
  for (let i = 0; i < toks.length; i++) {
    if (used[i]) continue;
    for (const p of PATTERNS) {
      const n = p.t.length;
      if (!n || i + n > toks.length) continue;
      let ok = true;
      for (let j = 0; j < n; j++) if (used[i + j] || !tokEq(toks[i + j], p.t[j])) { ok = false; break; }
      if (ok) {
        for (let j = 0; j < n; j++) used[i + j] = true;
        if (!ids.includes(p.id)) ids.push(p.id);
        break;
      }
    }
  }
  return { ids, matched: used.filter(Boolean).length, total: toks.length };
}

/** Подсказки при наборе: продукты, названия которых начинаются с введённого. */
export function suggestIngredients(q, lang = currentLang(), limit = 8) {
  const n = norm(q);
  if (n.length < 2) return [];
  const out = [];
  for (const ing of Object.values(ING)) {
    const names = [ing.n[lang], ...ing.w[lang]].map(norm);
    const rank = names.some((x) => x === n) ? 0 : names.some((x) => x.startsWith(n)) ? 1 : names.some((x) => x.split(' ').some((w) => w.startsWith(n))) ? 2 : 9;
    if (rank < 9) out.push([rank, ing.id]);
  }
  return out.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);
}

/* ───────── Рецепты: нормализация ───────── */

function prepare(r) {
  const known = r.ing.map((x) => ING[x.id]);
  const any = (k) => known.some((x) => x[k]);
  const tags = new Set(r.tg || []);
  const diet = {
    vegetarian: !any('m') && !any('f'),
    vegan: !any('m') && !any('f') && !any('d') && !any('eg') && !any('h'),
    glutenFree: !any('gl'),
    dairyFree: !any('d'),
    eggFree: !any('eg'),
    nutFree: !any('nut'),
  };
  if (r.min <= 20) tags.add('quick');
  if (!r.eq.length) tags.add('noequip');
  if (r.c === 'sport') tags.add('sport');
  return { ...r, tags: [...tags], diet, idx: null };
}

export const RECIPES = RAW_RECIPES.map(prepare);
export const BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/** Тексты рецепта на нужном языке: {t, d, s:[{text,min}], k:[]} */
export function rtext(r, lang = currentLang()) {
  const tx = r.text[lang] || r.text.ru;
  return { t: tx.t, d: tx.d, k: tx.k, steps: tx.s.map((text, i) => ({ text, min: (r.stepMin ? r.stepMin[i] : tx.sm?.[i]) || 0 })) };
}

/* ───────── Техника ───────── */

const needsStove = (r) => r.eq.some((e) => e === 'pan' || e === 'pot');

/** Список «чего не хватает» по технике. Пусто = можно готовить. Элемент = группа «любое из». */
export function missingGear(r, owned) {
  const have = owned instanceof Set ? owned : new Set(owned);
  const miss = [];
  for (const e of r.eq) {
    if (Array.isArray(e)) { if (!e.some((x) => have.has(x))) miss.push(e); }
    else if (!have.has(e)) miss.push([e]);
  }
  if (needsStove(r) && !have.has('stove')) miss.push(['stove']);
  return miss;
}
export const gearName = (group, lang = currentLang()) => group.map((g) => EQUIP[g].n[lang].toLowerCase()).join(lang === 'ru' ? ' или ' : lang === 'es' ? ' o ' : ' or ');

/* ───────── Сопоставление рецепта с холодильником ───────── */

export function analyze(r, ctx) {
  const has = (id) => {
    if (ctx.have.has(id) || ctx.pantry.has(id)) return true;
    return (ALT[id] || []).some((a) => ctx.have.has(a) || ctx.pantry.has(a));
  };
  const core = r.ing.filter((x) => !x.opt && !ctx.pantry.has(x.id));
  const required = r.ing.filter((x) => !x.opt);
  const miss = required.filter((x) => !has(x.id));
  const got = core.filter((x) => has(x.id));
  const used = r.ing.filter((x) => (ctx.have.has(x.id) || (ALT[x.id] || []).some((a) => ctx.have.has(a))) && !ctx.pantry.has(x.id)).length;
  return {
    recipe: r,
    missing: miss,
    have: got,
    total: core.length,
    coverage: core.length ? got.length / core.length : 1,
    used,
    gear: missingGear(r, ctx.owned),
  };
}

/** Фильтр по питанию. diet: {vegetarian, vegan, glutenFree, dairyFree, eggFree, nutFree} */
export function passesDiet(r, diet = {}) {
  for (const k of ['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'eggFree', 'nutFree']) if (diet[k] && !r.diet[k]) return false;
  return true;
}

export const isSweet = (r) => r.f === 'sweet';
export const isSalty = (r) => r.f === 'salty';

export function moodFilter(mood) {
  switch (mood) {
    case 'sweet': return isSweet;
    case 'salty': return isSalty;
    case 'sport': return (r) => r.tags.includes('sport');
    default: return () => true;
  }
}

function jitter(id, seed) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

export function fridgeScore(a, { mood, cooked = {}, seed = 0, blind = false, liked = {} } = {}) {
  const bonus = (liked[a.recipe.id] || 0) * 4;
  if (blind) return jitter(a.recipe.id, seed) * 100 - (cooked[a.recipe.id] ? 40 : 0) + (a.recipe.min <= 30 ? 5 : 0) + bonus;
  let s = a.coverage * 100 + Math.min(a.used, 5) * 6 - a.missing.length * 7 + bonus;
  if (a.recipe.min <= 30) s += 3;
  if (mood === 'new') {
    if (cooked[a.recipe.id]) s -= 40;
    if (a.recipe.cu !== 'ru') s += 6;
    s += jitter(a.recipe.id, seed) * 14;
  } else if (seed) s += jitter(a.recipe.id, seed) * 4;
  return s;
}

/**
 * Подбор по холодильнику.
 * Возвращает { ready, almost, other, locked } — списки анализов, отсортированные по оценке.
 */
export function fridgeSearch({ have, pantry, owned, mood = 'any', diet = {}, maxMin = 0, cooked = {}, liked = {}, seed = 0, filter = null }) {
  const ctx = { have: new Set(have), pantry: new Set(pantry), owned: new Set(owned) };
  const mf = moodFilter(mood);
  const out = { ready: [], almost: [], other: [], locked: [] };
  for (const r of RECIPES) {
    if (!mf(r) || !passesDiet(r, diet) || (maxMin && r.min > maxMin) || (filter && !filter(r))) continue;
    const a = analyze(r, ctx);
    if (ctx.have.size && a.used === 0) continue;
    if (a.gear.length) { out.locked.push(a); continue; }
    if (a.missing.length === 0) out.ready.push(a);
    else if (a.missing.length <= 2 && a.coverage >= 0.5) out.almost.push(a);
    else out.other.push(a);
  }
  const blind = !ctx.have.size;
  const sorter = (x, y) => fridgeScore(y, { mood, cooked, seed, blind, liked }) - fridgeScore(x, { mood, cooked, seed, blind, liked });
  for (const k of Object.keys(out)) out[k].sort(sorter);
  return out;
}

/* ───────── Поиск по названию ───────── */

const LANGS3 = ['ru', 'en', 'es'];
const ingTokMemo = {};
const ingTokens = (id, l) => {
  const k = `${id}:${l}`;
  return ingTokMemo[k] || (ingTokMemo[k] = tokens(ING[id].n[l]));
};

// Индекс собирается лениво и без описаний: так первый поиск по 15 000+ рецептам занимает доли секунды.
// Описания проверяются только если по названиям и продуктам ничего не нашлось.
function indexOf(r) {
  if (r.idx) return r.idx;
  const idx = {};
  for (const l of LANGS3) {
    const tx = r.text[l];
    idx[l] = {
      title: tokens(tx.t),
      ings: r.ing.flatMap((x) => ingTokens(x.id, l)),
      get body() { return this._b || (this._b = tokens(tx.d)); },
    };
  }
  r.idx = idx;
  return idx;
}

/** Прогрев индекса поиска в простое: порциями по 1500 рецептов, чтобы не блокировать интерфейс */
export function warmIndex() {
  const idle = (f, ms) => (typeof window !== 'undefined' && window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: ms + 2000 }) : setTimeout(f, ms));
  let i = 0;
  const next = () => {
    const end = Math.min(i + 1500, RECIPES.length);
    for (; i < end; i++) indexOf(RECIPES[i]);
    if (i < RECIPES.length) idle(next, 50);
  };
  idle(next, 800);
}

const prefixMatch = (a, b) => (a.c && b.c ? (a.k.length >= 4 && (b.k.startsWith(a.k) || (a.k.startsWith(b.k) && b.k.length >= 4))) : (!a.c && !b.c ? [...a.k].some((x) => x.length >= 4 && [...b.k].some((y) => y.startsWith(x) || x.startsWith(y))) : false));

function scoreList(qs, list, useBody, lang) {
  const scored = [];
  for (const r of list) {
    const idx = indexOf(r);
    let sc = 0;
    let hits = 0;
    for (const t of qs) {
      let best = 0;
      for (const l of LANGS3) {
        const { title, ings } = idx[l];
        if (title.some((x) => tokEq(t, x))) best = Math.max(best, 10);
        else if (title.some((x) => prefixMatch(t, x))) best = Math.max(best, 6);
        else if (ings.some((x) => tokEq(t, x))) best = Math.max(best, 3);
      }
      if (!best && useBody && idx[lang].body.some((x) => tokEq(t, x))) best = 2;
      if (best) hits++;
      sc += best;
    }
    if (hits === qs.length && sc) scored.push([sc, r]);
  }
  return scored;
}

export function searchRecipes(q, list = RECIPES) {
  const qs = tokens(q).filter((x) => (x.c ? x.k.length : [...x.k][0].length) >= 2);
  if (!qs.length) return list;
  let scored = scoreList(qs, list, false, currentLang());
  if (!scored.length) scored = scoreList(qs, list, true, currentLang());
  return scored.sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}

/* ───────── Коллекции ───────── */

export const COLLECTIONS = [
  { id: 'quick15', e: '⚡', f: (r) => r.min <= 15 },
  { id: 'quick30', e: '⏱️', f: (r) => r.min <= 30 && r.c !== 'shakes' },
  { id: 'nooven', e: '🚫', f: (r) => !r.eq.includes('oven') && r.c !== 'shakes' },
  { id: 'noequip', e: '🥄', f: (r) => !r.eq.length },
  { id: 'breakfast', e: '🍳', f: (r) => r.tags.includes('breakfast') },
  { id: 'soups', e: '🍲', f: (r) => r.tags.includes('soup') },
  { id: 'salads', e: '🥗', f: (r) => r.tags.includes('salad') },
  { id: 'party', e: '🎉', f: (r) => r.tags.includes('party') || r.c === 'cakes' },
  { id: 'vegetarian', e: '🥕', f: (r) => r.diet.vegetarian && r.c !== 'shakes' },
  { id: 'vegan', e: '🌱', f: (r) => r.diet.vegan && r.c !== 'shakes' },
  { id: 'sport', e: '💪', f: (r) => r.tags.includes('sport') },
  { id: 'nobake', e: '🧊', f: (r) => r.tags.includes('nobake') },
  { id: 'pasta', e: '🍝', f: (r) => r.tags.includes('pasta') },
  { id: 'bakery', e: '🥖', f: (r) => r.tags.includes('bread') },
  { id: 'glutenfree', e: '🌾', f: (r) => r.diet.glutenFree && r.c !== 'shakes' },
  { id: 'drinks', e: '🥤', f: (r) => r.c === 'shakes' },
];
export const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c]));
export const collectionCount = (id) => RECIPES.filter(COLLECTION_BY_ID[id].f).length;

/** Рецепт дня: одинаковый для всех в течение суток */
export function recipeOfTheDay(date = new Date(), diet = {}, owned = null) {
  const key = Math.floor(date.getTime() / 86400000);
  let pool = RECIPES.filter((r) => r.c !== 'shakes' && r.c !== 'other' && passesDiet(r, diet));
  if (owned) pool = pool.filter((r) => !missingGear(r, owned).length);
  if (!pool.length) pool = RECIPES;
  return pool[Math.floor(jitter(String(key), 7) * pool.length) % pool.length];
}

/* ───────── Порции: масштабирование и прочее ───────── */

export { jitter };

/** Температуры в тексте: «180 °C» → «350 °F» */
export const toFahrenheit = (text) => text.replace(/(\d{2,3})\s?°C/g, (_, c) => `${Math.round(((+c * 9) / 5 + 32) / 5) * 5} °F`);

/** Слот плана питания → подходит ли рецепт */
export const SLOT_TAGS = {
  breakfast: (r) => r.tags.includes('breakfast') || (r.c === 'sweet' && r.min <= 30),
  lunch: (r) => r.tags.includes('soup') || r.tags.includes('salad') || r.tags.includes('lunch') || r.tags.includes('pasta'),
  dinner: (r) => r.tags.includes('dinner') || r.tags.includes('pasta') || (r.c === 'savory' && r.min >= 25),
  snack: (r) => r.tags.includes('snack') || r.c === 'shakes' || r.c === 'cakes' || (r.c === 'sweet' && r.min <= 40),
};
