// Мозг приложения. Чистые функции без DOM: их можно запускать и в браузере, и в Node (см. test/).
import { ING, ALT, SUBS } from './data/ingredients.js';
import { EQUIP } from './data/equipment.js';

const timeLabel = (m) => (m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч${m % 60 ? ` ${m % 60} мин` : ''}`);
import { RAW_RECIPES } from './data/recipes/index.js';

/* ───────── Текст: нормализация и «основы» слов ───────── */

const ENDINGS = ['ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ать', 'ять', 'ой', 'ей', 'ий', 'ый', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ов', 'ев', 'ом', 'ем', 'ах', 'ях', 'ам', 'ям', 'ую', 'юю', 'ых', 'их', 'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь', 'й'];

export function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
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

export const stems = (text) => norm(text).split(' ').filter(Boolean).map(stem);

/* ───────── Индекс продуктов: фраза → id ───────── */

const PATTERNS = [];
for (const ing of Object.values(ING)) {
  for (const word of ing.w) PATTERNS.push({ id: ing.id, st: stems(word) });
}
PATTERNS.sort((a, b) => b.st.length - a.st.length || b.st.join('').length - a.st.join('').length);

/** Находит продукты в свободном тексте. Возвращает { ids, rest } — rest: слова, которые не распознаны. */
export function extractIngredients(text) {
  const toks = stems(text);
  const used = new Array(toks.length).fill(false);
  const ids = [];
  for (let i = 0; i < toks.length; i++) {
    if (used[i]) continue;
    for (const p of PATTERNS) {
      const n = p.st.length;
      if (i + n > toks.length) continue;
      let ok = true;
      for (let j = 0; j < n; j++) if (used[i + j] || toks[i + j] !== p.st[j]) { ok = false; break; }
      if (ok) {
        for (let j = 0; j < n; j++) used[i + j] = true;
        if (!ids.includes(p.id)) ids.push(p.id);
        break;
      }
    }
  }
  return { ids, rest: toks.filter((_, i) => !used[i]) };
}

/* ───────── Рецепты: нормализация ───────── */

const parseIng = (line) => {
  const [rawId, qty = ''] = line.split('|');
  const opt = rawId.endsWith('?');
  const id = opt ? rawId.slice(0, -1) : rawId;
  return { id, qty: qty.trim(), opt };
};
const parseStep = (line) => {
  const k = line.lastIndexOf('|');
  if (k > 0 && /^\d+$/.test(line.slice(k + 1))) return { text: line.slice(0, k), min: +line.slice(k + 1) };
  return { text: line, min: 0 };
};

function prepare(r) {
  const ing = r.i.map(parseIng);
  const known = ing.map((x) => ING[x.id]);
  const noMeat = !known.some((x) => x && x.m);
  const noFish = !known.some((x) => x && x.f);
  const tags = new Set(r.tg || []);
  const diet = {
    vegetarian: noMeat && noFish,
    vegan: noMeat && noFish && !known.some((x) => x && x.a),
    glutenFree: !known.some((x) => x && x.gl),
  };
  if (r.min <= 20) tags.add('quick');
  if (!r.eq.length) tags.add('noequip');
  return { ...r, ing, steps: r.s.map(parseStep), tips: r.k || [], tags: [...tags], diet, search: stems(`${r.t} ${r.d}`) };
}

export const RECIPES = RAW_RECIPES.map(prepare);
export const BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/* ───────── Техника ───────── */

const needsStove = (r) => r.eq.some((e) => e === 'pan' || e === 'pot');

/** Список «чего не хватает» по технике. Пусто = можно готовить. Элемент массива = любой из. */
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
export const gearName = (group) => group.map((g) => EQUIP[g].n.toLowerCase()).join(' или ');

/* ───────── Сопоставление рецепта с холодильником ───────── */

/**
 * ctx: { have:Set, pantry:Set, owned:Set }
 * core — обязательные продукты кроме базовых запасов, из них have / missing.
 */
export function analyze(r, ctx) {
  const has = (id) => {
    if (ctx.have.has(id) || ctx.pantry.has(id)) return true;
    return (ALT[id] || []).some((a) => ctx.have.has(a) || ctx.pantry.has(a));
  };
  const core = r.ing.filter((x) => !x.opt && !ctx.pantry.has(x.id));
  const required = r.ing.filter((x) => !x.opt);
  const miss = required.filter((x) => !has(x.id));
  const got = core.filter((x) => has(x.id));
  const usedFromFridge = r.ing.filter((x) => ctx.have.has(x.id) && !ctx.pantry.has(x.id)).length;
  const coverage = core.length ? got.length / core.length : 1;
  return {
    recipe: r,
    missing: miss,
    have: got,
    total: core.length,
    coverage,
    used: usedFromFridge,
    gear: missingGear(r, ctx.owned),
  };
}

export function passesDiet(r, diet = {}) {
  if (diet.vegan && !r.diet.vegan) return false;
  if (diet.vegetarian && !r.diet.vegetarian) return false;
  if (diet.glutenFree && !r.diet.glutenFree) return false;
  return true;
}

export const isSweet = (r) => r.f === 'sweet';
export const isSalty = (r) => r.f === 'salty';

/** Фильтр по настроению */
export function moodFilter(mood) {
  switch (mood) {
    case 'sweet': return isSweet;
    case 'salty': return isSalty;
    case 'sport': return (r) => r.tags.includes('sport') || r.c === 'sport';
    default: return () => true;
  }
}

/** Оценка для режима «что в холодильнике». Выше — лучше. */
export function fridgeScore(a, { mood, cooked = {}, seed = 0, blind = false } = {}) {
  if (blind) return jitter(a.recipe.id, seed) * 100 - (cooked[a.recipe.id] ? 40 : 0) + (a.recipe.min <= 30 ? 5 : 0);
  let s = a.coverage * 100 + Math.min(a.used, 5) * 6 - a.missing.length * 7;
  if (a.recipe.min <= 30) s += 3;
  if (mood === 'new') {
    if (cooked[a.recipe.id]) s -= 40;
    if (a.recipe.cu !== 'ru') s += 6;
    s += jitter(a.recipe.id, seed) * 14;
  } else if (seed) s += jitter(a.recipe.id, seed) * 4;
  return s;
}

function jitter(id, seed) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Подбор по холодильнику.
 * Возвращает { ready, almost, other, locked } — списки анализов, отсортированные по убыванию оценки.
 * ready — хватает всего; almost — не хватает 1–2; locked — не хватает техники.
 */
export function fridgeSearch({ have, pantry, owned, mood = 'any', diet = {}, maxMin = 0, cooked = {}, seed = 0 }) {
  const ctx = { have: new Set(have), pantry: new Set(pantry), owned: new Set(owned) };
  const mf = moodFilter(mood);
  const out = { ready: [], almost: [], other: [], locked: [] };
  for (const r of RECIPES) {
    if (!mf(r) || !passesDiet(r, diet) || (maxMin && r.min > maxMin)) continue;
    const a = analyze(r, ctx);
    if (ctx.have.size && a.used === 0) continue;
    if (a.gear.length) { out.locked.push(a); continue; }
    if (a.missing.length === 0) out.ready.push(a);
    else if (a.missing.length <= 2 && a.coverage >= 0.5) out.almost.push(a);
    else out.other.push(a);
  }
  const blind = !ctx.have.size;
  const sorter = (x, y) => fridgeScore(y, { mood, cooked, seed, blind }) - fridgeScore(x, { mood, cooked, seed, blind });
  for (const k of Object.keys(out)) out[k].sort(sorter);
  return out;
}

/* ───────── Поиск по названию ───────── */

export function searchRecipes(q, list = RECIPES) {
  const qs = stems(q).filter((s) => s.length >= 2);
  if (!qs.length) return list;
  const scored = [];
  for (const r of list) {
    const title = stems(r.t);
    let sc = 0;
    for (const s of qs) {
      if (title.some((t) => t === s)) sc += 10;
      else if (title.some((t) => t.startsWith(s) || (s.length >= 4 && s.startsWith(t) && t.length >= 4))) sc += 6;
      else if (r.search.includes(s)) sc += 2;
      else if (r.ing.some((x) => ING[x.id] && stems(ING[x.id].n).includes(s))) sc += 3;
    }
    if (sc) scored.push([sc, r]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}

/* ───────── Порции: масштабирование количеств ───────── */

const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75 };

export function scaleQty(qty, k) {
  if (k === 1 || !qty) return qty;
  const m = qty.match(/^(\d+\s+)?(\d+\/\d+|\d+[.,]?\d*|[½¼¾])(.*)$/);
  if (!m) return qty;
  let v;
  const num = m[2];
  if (FRAC[num]) v = FRAC[num];
  else if (num.includes('/')) { const [a, b] = num.split('/').map(Number); v = a / b; }
  else v = parseFloat(num.replace(',', '.'));
  if (m[1]) v += parseFloat(m[1]);
  const rest = m[3];
  // «2–3 шт» и подобное не масштабируем
  if (/^[–-]\d/.test(rest)) return qty;
  v *= k;
  return `${fmt(v)}${rest}`;
}

function fmt(v) {
  if (v >= 20) return String(Math.round(v / 5) * 5);
  if (v >= 5) return String(Math.round(v * 2) / 2).replace('.', ',');
  const halves = Math.round(v * 4) / 4;
  const whole = Math.floor(halves);
  const frac = halves - whole;
  const f = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  if (!whole) return f || '0';
  return f ? `${whole}${f}` : String(whole);
}

/* ───────── Мини-ИИ: понимание запроса и ответ ───────── */

const has = (s, ...res) => res.some((re) => re.test(s));

export function parseQuery(text) {
  const n = norm(text);
  const toks = n.split(' ');
  // исключения: «без молока», «без духовки»
  const without = [];
  const noGear = new Set();
  const GEAR_WORDS = {
    oven: ['духовк', 'духов'], microwave: ['микроволновк', 'свч'], blender: ['блендер'], mixer: ['миксер'],
    stove: ['плит'], pan: ['сковород'], pot: ['кастрюл'], airfryer: ['аэрогрил'],
  };
  let cleaned = n;
  for (let i = 0; i < toks.length - 1; i++) {
    if (toks[i] !== 'без' && toks[i] !== 'кроме') continue;
    const nextRaw = toks[i + 1];
    const g = Object.entries(GEAR_WORDS).find(([, ws]) => ws.some((w) => nextRaw.startsWith(w)));
    if (g) { noGear.add(g[0]); cleaned = cleaned.replace(`${toks[i]} ${nextRaw}`, ' '); continue; }
    const ex = extractIngredients(nextRaw);
    if (ex.ids.length) { without.push(...ex.ids); cleaned = cleaned.replace(`${toks[i]} ${nextRaw}`, ' '); }
  }
  const ing = extractIngredients(cleaned).ids.filter((id) => !without.includes(id));

  let mood = 'any';
  if (has(n, /сладк|десерт|слад|торт|конфет|выпечк|пирог|печень|сахар/)) mood = 'sweet';
  if (has(n, /солен|солён|ужин|обед|основн|мясн|суп|горяч|закуск/)) mood = 'salty';
  if (has(n, /спорт|трениров|протеин|белк|пп |фитнес|качал|похуд|сушк|диет/)) mood = 'sport';
  if (has(n, /нов[оеы]|необычн|удиви|экзотик|что нибудь|сюрприз|разнообраз/)) mood = mood === 'any' ? 'new' : mood;

  const cat = has(n, /торт/) ? 'cakes' : has(n, /коктейл|милкшейк|шейк|смузи|напит|лимонад|морс|чай /) ? 'shakes' : null;
  const tags = [];
  if (has(n, /завтрак/)) tags.push('breakfast');
  if (has(n, /(^| )суп|борщ/)) tags.push('soup');
  if (has(n, /салат/)) tags.push('salad');
  if (has(n, /перекус|закуск/)) tags.push('snack');
  if (has(n, /после трениров/)) tags.push('postworkout');
  if (has(n, /праздник|гост|день рождения|на стол/)) tags.push('party');
  if (has(n, /без выпечк|без готовки/)) tags.push('nobake');
  if (has(n, /ничего нет|без инвентар|без техник|без посуд|без всего/)) tags.push('noequip');

  let maxMin = 0;
  const m = n.match(/(?:за|до|быстрее)\s*(\d{1,3})\s*мин/);
  if (m) maxMin = +m[1];
  else if (has(n, /быстр|скорее|срочн|на скорую|минут/)) maxMin = 20;

  const diet = {
    vegan: has(n, /веган|постн/),
    vegetarian: has(n, /вегетариан/),
    glutenFree: has(n, /без глютен|безглютен/),
  };
  if (without.includes('egg')) diet.noEgg = true;

  const useFridge = has(n, /из того что есть|мо[йе][мг]? холодильник|в холодильнике|что у меня|из моих|мои продукты|из имеющ/);
  const wantsAny = has(n, /любой|что угодно|на твой вкус|посоветуй|порекомендуй|что приготовить|что пригот|придумай/);

  const sub = has(n, /чем заменить|замена|заменить|вместо|аналог/);
  const greet = has(n, /^(привет|здравствуй|добр|хай|hello|hi)/);
  const help = has(n, /что ты умеешь|помоги|помощь|как пользоват|что можешь/);
  return { raw: text, n, ing, without, noGear, mood, cat, tags, maxMin, diet, useFridge, wantsAny, sub, greet, help };
}

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

/** Склонение: n рецепт(ов) */
export const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

const names = (ids) => ids.map((id) => ING[id]?.n.toLowerCase()).filter(Boolean);
const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} и ${arr[arr.length - 1]}`);

/**
 * Ответ помощника.
 * state: { have, pantry, owned, diet, cooked }
 * Возвращает массив частей: {type:'text', text} | {type:'recipes', items:[{id,note}]} | {type:'chips', items:[…]}
 */
export function answer(text, state, seed = Date.now() % 100000, offset = 0) {
  if (/^(ещ[её]|другое|другие|дальше|ещ[её] вариант)/.test(norm(text)) && state.last) return answer(state.last, state, seed, offset + 4);
  const q = parseQuery(text);
  const parts = [];

  if (q.sub && q.ing.length) {
    for (const id of q.ing.slice(0, 2)) {
      const tip = SUBS[id];
      parts.push({ type: 'text', text: tip ? `**${ING[id].n}.** ${tip}` : `Для продукта «${ING[id].n}» точной замены у меня нет. Скажите, для какого блюда, и я подскажу.` });
    }
    return parts;
  }
  if (q.sub) return [{ type: 'text', text: 'Назовите продукт, который нужно заменить, например: «чем заменить сметану» или «замена яйцам в выпечке».' }];

  if ((q.greet || q.help) && !q.ing.length && q.mood === 'any' && !q.cat) {
    return [
      { type: 'text', text: 'Привет! Я мини-помощник кухни. Я не просто ищу по словам, а понимаю, что у вас есть, что вы хотите и чем можете готовить.' },
      { type: 'text', text: 'Напишите, например: «яйца, молоко и мука — что-нибудь сладкое», «ужин за 20 минут без духовки» или «чем заменить сметану».' },
      { type: 'chips', items: SUGGESTIONS },
    ];
  }

  // Прямой запрос рецепта по названию: «как приготовить сырники»
  const asksRecipe = has(q.n, /рецепт|как приготовить|как сделать|как испечь|как сварить|как пожарить/);
  if (asksRecipe && !q.ing.length) {
    const stripped = q.n.replace(/рецепт|как приготовить|как сделать|как испечь|как сварить|как пожарить|подскажи|покажи|мне|пожалуйста|для/g, ' ');
    const found = searchRecipes(stripped);
    if (found.length && found.length < RECIPES.length) {
      return [
        { type: 'text', text: found.length === 1 ? 'Нашёл вот этот рецепт.' : 'Вот что подходит под ваш запрос:' },
        { type: 'recipes', items: found.slice(0, 3).map((r) => ({ id: r.id })) },
      ];
    }
  }

  const useFridge = q.useFridge || (!q.ing.length && state.have.length && q.wantsAny);
  const have = q.ing.length ? q.ing : useFridge ? state.have : [];
  const owned = new Set(state.owned);
  for (const g of q.noGear) owned.delete(g);

  const mood = q.mood;
  const diet = { ...state.diet, ...Object.fromEntries(Object.entries(q.diet).filter(([, v]) => v)) };
  const exclude = new Set(q.without);

  const matches = (r) => {
    if (q.cat && r.c !== q.cat) return false;
    if (q.tags.includes('breakfast') && !r.tags.includes('breakfast')) return false;
    if (q.tags.includes('soup') && !r.tags.includes('soup')) return false;
    if (q.tags.includes('salad') && !r.tags.includes('salad')) return false;
    if (q.tags.includes('snack') && !r.tags.includes('snack')) return false;
    if (q.tags.includes('postworkout') && !r.tags.includes('postworkout') && !r.tags.includes('sport')) return false;
    if (q.tags.includes('party') && !r.tags.includes('party')) return false;
    if (q.tags.includes('nobake') && (r.eq.includes('oven') || r.eq.includes('pan') || r.eq.includes('pot'))) return false;
    if (q.tags.includes('noequip') && r.eq.length) return false;
    if (diet.noEgg && r.ing.some((x) => x.id === 'egg' && !x.opt)) return false;
    if (r.ing.some((x) => exclude.has(x.id) && !x.opt)) return false;
    return true;
  };

  const res = fridgeSearch({ have, pantry: state.pantry, owned: [...owned], mood, diet, maxMin: q.maxMin, cooked: state.cooked, seed });
  const filterAll = (arr) => arr.filter((a) => matches(a.recipe));
  let ready = filterAll(res.ready), almost = filterAll(res.almost), other = filterAll(res.other);
  let locked = filterAll(res.locked);

  let pool = have.length ? [...ready, ...almost] : [...ready, ...almost, ...other];
  if (have.length && pool.length < 3) pool = [...pool, ...other.slice(0, 3 - pool.length)];
  const header = describe(q, have, mood);

  if (!pool.length) {
    if (locked.length) {
      const g = locked[0];
      parts.push({ type: 'text', text: `${header} С вашей техникой подходящего нет, но «${g.recipe.t}» получится, если добавить: ${list(g.gear.map(gearName))}.` });
      parts.push({ type: 'recipes', items: [{ id: g.recipe.id, note: `Не хватает: ${list(g.gear.map(gearName))}` }] });
      return parts;
    }
    parts.push({ type: 'text', text: `${header} Точных совпадений нет. Попробуйте убрать часть условий или добавьте больше продуктов.` });
    parts.push({ type: 'chips', items: SUGGESTIONS });
    return parts;
  }

  const top = pool[offset >= pool.length ? 0 : offset];
  parts.push({ type: 'text', text: `${header} ${verdict(top, q, seed, have.length > 0)}` });
  if (offset >= pool.length) offset = 0;
  const items = pool.slice(offset, offset + 4).map((a, i) => ({ id: a.recipe.id, note: have.length ? noteFor(a) : `${timeLabel(a.recipe.min)}`, best: i === 0 }));
  parts.push({ type: 'recipes', items });
  if (have.length && top.missing.length) {
    const tips = top.missing.map((x) => SUBS[x.id] && `**${ING[x.id].n}** — ${SUBS[x.id]}`).filter(Boolean).slice(0, 2);
    if (tips.length) parts.push({ type: 'text', text: `Если чего-то нет под рукой:\n${tips.join('\n')}` });
  }
  if (pool.length > offset + 4) parts.push({ type: 'text', text: `Ещё ${pool.length - offset - 4} ${plural(pool.length - offset - 4, 'вариант', 'варианта', 'вариантов')} — напишите «ещё» или уточните запрос.` });
  return parts;
}

export const SUGGESTIONS = [
  'Что приготовить из яиц и молока?',
  'Сладкое за 15 минут',
  'Торт без духовки',
  'Ужин из курицы и риса',
  'Что-нибудь новое',
  'Коктейль после тренировки',
  'Чем заменить сметану?',
  'Завтрак без плиты',
];

function describe(q, have, mood) {
  const bits = [];
  if (have.length) bits.push(`из набора: ${list(names(have))}`);
  if (q.cat === 'cakes') bits.push('торты');
  else if (q.cat === 'shakes') bits.push('напитки');
  else if (mood === 'sweet') bits.push('что-то сладкое');
  else if (mood === 'salty') bits.push('солёное');
  else if (mood === 'sport') bits.push('для тренировок');
  else if (mood === 'new') bits.push('что-то новое');
  if (q.maxMin) bits.push(`до ${q.maxMin} минут`);
  if (q.noGear.size) bits.push(`без ${list([...q.noGear].map((g) => EQUIP[g].n.toLowerCase().replace('духовка', 'духовки').replace('плита', 'плиты').replace('микроволновка', 'микроволновки').replace('блендер', 'блендера').replace('миксер', 'миксера').replace('сковорода', 'сковороды').replace('кастрюля', 'кастрюли').replace('аэрогриль', 'аэрогриля')))}`);
  return bits.length ? `Ищу ${bits.join(', ')}.` : 'Вот что могу предложить.';
}

function verdict(a, q, seed, hasHave) {
  const r = a.recipe;
  const intro = pick(['Лучший выбор —', 'Я бы выбрал', 'Хорошо подойдёт', 'Предлагаю'], seed);
  const base = `${intro} «${r.t}».`;
  if (!hasHave) return `${base} ${a.recipe.min} мин, ${a.recipe.lv === 1 ? 'проще некуда' : 'справитесь'}.`;
  if (!a.total) return `${base} ${r.min} мин, ничего докупать не нужно.`;
  if (!a.missing.length) return `${base} У вас есть всё нужное, ${r.min} мин.`;
  return `${base} Не хватает: ${list(a.missing.map((x) => ING[x.id]?.n.toLowerCase()))}.`;
}

function noteFor(a) {
  if (!a.total) return `${a.recipe.min} мин`;
  if (!a.missing.length) return `Есть всё · ${a.recipe.min} мин`;
  return `${a.have.length} из ${a.total} · нет: ${a.missing.map((x) => ING[x.id]?.n.toLowerCase()).join(', ')}`;
}
