// Мини-ИИ помощник: понимает запросы на русском, английском и испанском и отвечает на языке интерфейса.
// Работает на устройстве, без сервера: разбор слов и фраз + оценка рецептов (см. engine.js).
import { ING } from './data/ingredients.js';
import { SUBS } from './data/subs.js';
import { EQUIP } from './data/equipment.js';
import { norm, extractIngredients, fridgeSearch, searchRecipes, rtext, RECIPES } from './engine.js';
import { t, currentLang } from './i18n.js';

const has = (s, re) => re.test(s);

const GEAR_WORDS = {
  oven: /^(духов|oven|horno)/, microwave: /^(микровол|свч|microwav|microond)/, blender: /^(блендер|blender|batidora|licuadora)/, mixer: /^(миксер|mixer)/,
  stove: /^(плит|stove|hob|cooktop|fogon|placa|vitroceram)/, pan: /^(сковород|pan|skillet|sarten)/, pot: /^(кастрюл|pot|saucepan|olla|cazuela)/, airfryer: /^(аэрогрил|airfryer|freidora)/,
};
const SKIP = new Set(['a', 'an', 'the', 'any', 'el', 'la', 'un', 'una', 'mi', 'my', 'нет']);

const GEAR_WITHOUT = {
  ru: { oven: 'духовки', microwave: 'микроволновки', blender: 'блендера', mixer: 'миксера', stove: 'плиты', pan: 'сковороды', pot: 'кастрюли', airfryer: 'аэрогриля' },
  en: { oven: 'an oven', microwave: 'a microwave', blender: 'a blender', mixer: 'a mixer', stove: 'a stove', pan: 'a pan', pot: 'a pot', airfryer: 'an air fryer' },
  es: { oven: 'horno', microwave: 'microondas', blender: 'batidora', mixer: 'batidora de varillas', stove: 'fuego', pan: 'sartén', pot: 'olla', airfryer: 'freidora de aire' },
};

export function parseQuery(text) {
  const n = norm(text);
  const toks = n.split(' ');
  const without = [];
  const noGear = new Set();
  let cleaned = n;
  for (let i = 0; i < toks.length - 1; i++) {
    if (!['без', 'кроме', 'without', 'sin', 'except'].includes(toks[i])) continue;
    let j = i + 1;
    while (j < toks.length && SKIP.has(toks[j])) j++;
    const word = toks[j] || '';
    const g = Object.entries(GEAR_WORDS).find(([, re]) => re.test(word));
    if (g) { noGear.add(g[0]); cleaned = cleaned.replace(`${toks[i]} ${toks.slice(i + 1, j + 1).join(' ')}`, ' '); continue; }
    const two = extractIngredients(toks.slice(j, j + 2).join(' '));
    const one = extractIngredients(word);
    const ids = two.ids.length ? two.ids : one.ids;
    if (ids.length) { without.push(...ids); cleaned = cleaned.replace(`${toks[i]} ${toks.slice(i + 1, j + 1).join(' ')}`, ' '); }
  }
  const ing = extractIngredients(cleaned).ids.filter((id) => !without.includes(id));

  let mood = 'any';
  if (has(n, /сладк|десерт|слад|торт|конфет|выпечк|пирог|печень|sweet|dessert|cake|cookie|treat|dulce|postre|tarta|pastel|galleta|golosin/)) mood = 'sweet';
  if (has(n, /солен|ужин|обед|основн|мясн|суп|горяч|закуск|savou?ry|salty|dinner|lunch|main course|hearty|salado|cena|almuerzo|comida|plato principal/)) mood = 'salty';
  if (has(n, /спорт|трениров|протеин|белк|фитнес|качал|похуд|сушк|sport|workout|gym|protein|fitness|lean|entren|proteina|gimnasio|deporte/)) mood = 'sport';
  if (has(n, /нов[оеы]|необычн|удиви|экзотик|что нибудь|сюрприз|something new|surprise|different|unusual|novedad|sorprend|algo nuevo|diferente|distinto/) && mood === 'any') mood = 'new';

  const cat = has(n, /торт|cake|tarta|pastel/) ? 'cakes' : has(n, /коктейл|милкшейк|шейк|смузи|напит|лимонад|морс|shake|smoothie|drink|lemonade|beverage|batido|bebida|limonada|licuado/) ? 'shakes' : null;

  const tags = [];
  if (has(n, /завтрак|breakfast|desayuno/)) tags.push('breakfast');
  if (has(n, /(^| )суп|борщ|soup|sopa|crema de/)) tags.push('soup');
  if (has(n, /салат|salad|ensalada/)) tags.push('salad');
  if (has(n, /перекус|snack|tentempie|merienda|aperitivo/)) tags.push('snack');
  if (has(n, /после трениров|after (the )?workout|after training|despues de entren/)) tags.push('postworkout');
  if (has(n, /праздник|гост|party|guests|celebration|fiesta|invitados/)) tags.push('party');
  if (has(n, /без выпечк|без готовки|no bake|no-bake|without baking|sin horno|sin hornear|sin cocinar|no cooking/)) tags.push('nobake');
  if (has(n, /ничего нет|без инвентар|без техник|no equipment|no gear|no tools|sin utensilios|sin equipo|sin nada/)) tags.push('noequip');

  let maxMin = 0;
  const m = n.match(/(\d{1,3})\s*(?:мин|min)/);
  if (m) maxMin = +m[1];
  else if (has(n, /полчаса|half an hour|media hora/)) maxMin = 30;
  else if (has(n, /быстр|скорее|срочн|quick|fast|hurry|rapid|deprisa|express/)) maxMin = 20;

  const diet = {
    vegan: has(n, /веган|постн|vegan|vegano|vegana/),
    vegetarian: has(n, /вегетариан|vegetarian|vegetariano|vegetariana/),
    glutenFree: has(n, /без глютен|gluten free|sin gluten|sin tacc/),
    dairyFree: has(n, /без лактоз|dairy free|lactose free|sin lactosa|sin lacteos/),
  };
  if (without.includes('egg')) diet.eggFree = true;
  if (without.some((id) => ['nuts', 'almond', 'walnut', 'peanut'].includes(id))) diet.nutFree = true;

  const useFridge = has(n, /из того что есть|мо[йе][мг]? холодильник|в холодильнике|что у меня|из моих|my fridge|what i have|in my fridge|from my fridge|mi nevera|mi frigorifico|lo que tengo|con lo que tengo/);
  const wantsAny = has(n, /что приготовить|что пригот|придумай|посоветуй|порекомендуй|любой|what (can|should) i (cook|make)|what to cook|what to make|suggest|recommend|que cocino|que preparo|que puedo cocinar|que hago de comer|recomienda|sugiere|dame una idea/);
  const sub = has(n, /чем заменить|замена|заменить|вместо|аналог|substitut|replace|replacement|alternative|instead of|swap|sustitu|reemplaz|cambiar por|en vez de|en lugar de/);
  const greet = has(n, /^(привет|здравствуй|добр|хай|hello|hi |hi$|hey|good (morning|evening)|hola|buenas|buenos)/);
  const help = has(n, /что ты умеешь|помощь|помоги|what can you do|help|how do you work|que sabes hacer|ayuda|ayudame/);
  const asksRecipe = has(n, /рецепт|как приготовить|как сделать|как испечь|как сварить|how (do|to) (i )?(make|cook|bake)|recipe|receta|como hacer|como se hace|como preparar/);
  const more = has(n, /^(ещ[её]|другое|другие|дальше|more|another|next|otra|otro|mas|siguiente)/);
  return { raw: text, n, ing, without, noGear, mood, cat, tags, maxMin, diet, useFridge, wantsAny, sub, greet, help, asksRecipe, more };
}

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const and = () => ` ${t('common.and')} `;
const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')}${and()}${arr[arr.length - 1]}`);
const names = (ids) => ids.map((id) => ING[id].n[currentLang()].toLowerCase());
const time = (min) => t('common.min', { n: min });

export const suggestions = () => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => t(`ai.sg${i}`));

/**
 * Ответ помощника: массив частей {type:'text'|'recipes'|'chips'}.
 * state: { have, pantry, owned, diet, cooked, last }
 */
export function answer(text, state, seed = Date.now() % 100000, offset = 0) {
  const q = parseQuery(text);
  if (q.more && state.last) return answer(state.last, state, seed, offset + 4);
  const lang = currentLang();
  const parts = [];

  if (q.sub && q.ing.length) {
    for (const id of q.ing.slice(0, 2)) {
      const tip = SUBS[id]?.[lang];
      parts.push({ type: 'text', text: tip ? t('ai.sub.item', { name: ING[id].n[lang], tip }) : t('ai.sub.none', { name: ING[id].n[lang] }) });
    }
    return parts;
  }
  if (q.sub) return [{ type: 'text', text: t('ai.sub.ask') }];

  if ((q.greet || q.help) && !q.ing.length && q.mood === 'any' && !q.cat) {
    return [{ type: 'text', text: t('ai.greet1') }, { type: 'text', text: t('ai.greet2') }, { type: 'chips', items: suggestions() }];
  }

  if (q.asksRecipe && !q.ing.length) {
    const stripped = q.n.replace(/рецепт|как приготовить|как сделать|как испечь|как сварить|подскажи|покажи|мне|пожалуйста|для|how do i make|how to make|how to cook|how to bake|recipe for|recipe|receta de|receta|como hacer|como se hace|como preparar|por favor/g, ' ');
    const found = searchRecipes(stripped);
    if (found.length && found.length < RECIPES.length) {
      return [{ type: 'text', text: t(found.length === 1 ? 'ai.recipe.one' : 'ai.recipe.many') }, { type: 'recipes', items: found.slice(0, 3).map((r) => ({ id: r.id })) }];
    }
  }

  const useFridge = q.useFridge || (!q.ing.length && state.have.length && q.wantsAny);
  const have = q.ing.length ? q.ing : useFridge ? state.have : [];
  const owned = new Set(state.owned);
  for (const g of q.noGear) owned.delete(g);
  const diet = { ...state.diet, ...Object.fromEntries(Object.entries(q.diet).filter(([, v]) => v)) };
  const exclude = new Set(q.without);

  const filter = (r) => {
    if (q.cat && r.c !== q.cat) return false;
    for (const tg of ['breakfast', 'soup', 'salad', 'snack', 'party']) if (q.tags.includes(tg) && !r.tags.includes(tg)) return false;
    if (q.tags.includes('postworkout') && !r.tags.includes('postworkout') && !r.tags.includes('sport')) return false;
    if (q.tags.includes('nobake') && (r.eq.includes('oven') || r.eq.includes('pan') || r.eq.includes('pot'))) return false;
    if (q.tags.includes('noequip') && r.eq.length) return false;
    if (r.ing.some((x) => exclude.has(x.id) && !x.opt)) return false;
    return true;
  };

  const res = fridgeSearch({ have, pantry: state.pantry, owned: [...owned], mood: q.mood, diet, maxMin: q.maxMin, cooked: state.cooked, liked: state.liked || {}, seed, filter });
  const { ready, almost, other, locked } = res;
  let pool = have.length ? [...ready, ...almost] : [...ready, ...almost, ...other];
  if (have.length && pool.length < 3) pool = [...pool, ...other.slice(0, 3 - pool.length)];

  const bits = [];
  if (have.length) bits.push(t('ai.bit.have', { list: list(names(have)) }));
  if (q.cat === 'cakes') bits.push(t('ai.bit.cakes'));
  else if (q.cat === 'shakes') bits.push(t('ai.bit.drinks'));
  else if (q.mood !== 'any') bits.push(t(`ai.bit.${q.mood}`));
  if (q.maxMin) bits.push(t('ai.bit.max', { n: q.maxMin }));
  if (q.noGear.size) bits.push(t('ai.bit.without', { gear: list([...q.noGear].map((g) => GEAR_WITHOUT[lang][g])) }));
  const header = bits.length ? t('ai.intro', { bits: bits.join(', ') }) : t('ai.intro.default');

  if (!pool.length) {
    if (locked.length) {
      const g = locked[0];
      const gear = list(g.gear.map((grp) => grp.map((x) => EQUIP[x].n[lang].toLowerCase()).join(` ${t('common.or')} `)));
      const title = rtext(g.recipe).t;
      return [{ type: 'text', text: `${header} ${t('ai.locked', { title, gear })}` }, { type: 'recipes', items: [{ id: g.recipe.id, note: t('ai.gear.note', { gear }) }] }];
    }
    return [{ type: 'text', text: `${header} ${t('ai.none')}` }, { type: 'chips', items: suggestions() }];
  }

  if (offset >= pool.length) offset = 0;
  const top = pool[offset];
  const lead = pick([t('ai.lead.0'), t('ai.lead.1'), t('ai.lead.2'), t('ai.lead.3')], seed);
  const base = t('ai.verdict.base', { lead, title: rtext(top.recipe).t });
  let verdict;
  if (!have.length) verdict = t('ai.verdict.blind', { base, time: time(top.recipe.min) });
  else if (!top.total || !top.missing.length) verdict = t('ai.verdict.ready', { base, time: time(top.recipe.min) });
  else verdict = t('ai.verdict.need', { base, list: list(names(top.missing.map((x) => x.id))) });
  parts.push({ type: 'text', text: `${header} ${verdict}` });

  const items = pool.slice(offset, offset + 4).map((a, i) => ({
    id: a.recipe.id,
    best: i === 0,
    note: !have.length ? time(a.recipe.min)
      : !a.missing.length ? t('ai.note.ready', { time: time(a.recipe.min) })
        : t('ai.note.partial', { have: a.have.length, total: a.total, list: names(a.missing.map((x) => x.id)).join(', ') }),
  }));
  parts.push({ type: 'recipes', items });

  if (have.length && top.missing.length) {
    const tips = top.missing.map((x) => SUBS[x.id] && t('ai.sub.item', { name: ING[x.id].n[lang], tip: SUBS[x.id][lang] })).filter(Boolean).slice(0, 2);
    if (tips.length) parts.push({ type: 'text', text: `${t('ai.tips.head')}\n${tips.join('\n')}` });
  }
  const rest = pool.length - offset - 4;
  if (rest > 0) parts.push({ type: 'text', text: t('ai.more', { n: rest }) });
  return parts;
}
