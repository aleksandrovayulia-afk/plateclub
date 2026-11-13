// Конструктор блюд: любые продукты + способ приготовления = готовый рецепт на трёх языках.
// Рецепт собирается на лету по адресу «gen~способ~продукт~продукт», поэтому ограничения по числу сочетаний нет.
// Тексты составлены из безопасных шагов без выдуманных температур и времени сверх обычных для способа.
import { ING } from './ingredients.js';
import { detectMin } from './recipes/generate.js';

export const TECHS = ['pan', 'bake', 'stew', 'soup', 'salad', 'omelet', 'smoothie'];
export const TECH_EMOJI = { pan: '🍳', bake: '🔥', stew: '🍲', soup: '🥣', salad: '🥗', omelet: '🍳', smoothie: '🥤' };
const LIQ = new Set(['milk', 'plantmilk', 'coconutmilk', 'kefir', 'cream', 'juice', 'broth', 'water', 'sparkling', 'yogurt']);
const SAUCE = new Set(['oil', 'oliveoil', 'soy', 'vinegar', 'mayo', 'ketchup', 'mustard', 'honey', 'tahini', 'balsamic', 'tomatopaste', 'peanutbutter', 'maplesyrup', 'sesameoil']);
const SEASON = new Set(['salt', 'pepper', 'paprika', 'cinnamon', 'cumin', 'turmeric', 'curry', 'oregano', 'thyme', 'rosemary', 'bayleaf', 'nutmeg', 'cardamom', 'ginger', 'herbs', 'cloves', 'garlicpowder', 'chilipowder', 'saffron', 'sumac', 'vanilla']);
const HERB = new Set(['greens', 'parsley', 'dill', 'cilantro', 'basil', 'mint']);
const LANGS = ['ru', 'en', 'es'];

const form = (id, l, f) => { const o = ING[id].form[l]; return o[f] || o.d || o.n; };
const join = (ids, l, f) => {
  const w = ids.map((i) => form(i, l, f));
  if (w.length <= 1) return w[0] || '';
  const and = { ru: ' и ', en: ' and ', es: ' y ' }[l];
  return `${w.slice(0, -1).join(', ')}${and}${w[w.length - 1]}`;
};
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const qty = (id, role) => {
  if (id === 'egg') return role === 0 ? '3 pc' : '2 pc';
  if (SEASON.has(id)) return '~taste';
  if (HERB.has(id)) return '~handful';
  if (SAUCE.has(id)) return '1 tbsp';
  if (LIQ.has(id)) return role === 0 ? '300 ml' : '150 ml';
  return role === 0 ? '300 g' : role === 1 ? '200 g' : '100 g';
};

/** Шаблоны: M — основной продукт, S — остальные, A — все вместе; форма после двоеточия */
const T = {
  pan: {
    min: 25, eq: ['pan'], c: 'savory', tg: ['dinner', 'quick'],
    t: { ru: '{M:n} на сковороде{S: с :i}', en: 'Pan-fried {M}{S: with :n}', es: '{M:n} a la sartén{S: con :n}' },
    d: { ru: 'Быстрое блюдо на сковороде из {A:g}.', en: 'A quick pan dish of {A}.', es: 'Un plato rápido a la sartén con {A}.' },
    s: {
      ru: ['Вымойте и подготовьте продукты: {A:a}. Нарежьте их ровными небольшими кусочками, чтобы они приготовились одновременно.', 'Разогрейте на сковороде немного масла на среднем огне.', 'Сначала обжарьте {M:a} 6–8 минут, помешивая, до золотистой корочки.', '{S|Добавьте {S:a} и готовьте ещё 6–8 минут, до мягкости.|Продолжайте готовить ещё 5 минут, до мягкости.}', 'Посолите и поперчите по вкусу. Снимите с огня и дайте постоять 2 минуты.'],
      en: ['Wash and prepare the ingredients: {A}. Cut them into even small pieces so they cook at the same pace.', 'Heat a little oil in a pan over medium heat.', 'Fry the {M} first for 6 to 8 minutes, stirring, until golden brown.', '{S|Add the {S} and cook for another 6 to 8 minutes until tender.|Keep cooking for another 5 minutes until tender.}', 'Season with salt and pepper to taste. Take off the heat and rest for 2 minutes.'],
      es: ['Lava y prepara los ingredientes: {A:d}. Córtalos en trozos pequeños y parejos para que se hagan a la vez.', 'Calienta un poco de aceite en una sartén a fuego medio.', 'Sofríe primero {M:d} de 6 a 8 minutos, removiendo, hasta que se dore.', '{S|Añade {S:d} y cocina otros 6 a 8 minutos hasta que esté tierno.|Sigue cocinando 5 minutos más hasta que esté tierno.}', 'Sala y pimienta al gusto. Retira del fuego y deja reposar 2 minutos.'],
    },
  },
  bake: {
    min: 45, eq: ['oven'], c: 'savory', tg: ['dinner'],
    t: { ru: '{M:n} в духовке{S: с :i}', en: 'Oven-baked {M}{S: with :n}', es: '{M:n} al horno{S: con :n}' },
    d: { ru: 'Простое блюдо из духовки: {A:n}.', en: 'A simple oven dish of {A}.', es: 'Un plato sencillo al horno con {A}.' },
    s: {
      ru: ['Разогрейте духовку до 200 °C. Подготовьте {A:a} и нарежьте крупными ровными кусками.', 'Выложите всё на противень в один слой, полейте маслом, посолите и перемешайте.', 'Запекайте 30–35 минут, один раз перемешав, пока края не подрумянятся.', 'Проверьте готовность: продукты должны быть мягкими внутри, а мясо или рыба не должны быть сырыми в середине.', 'Дайте постоять 5 минут и подавайте горячим.'],
      en: ['Heat the oven to 200 °C. Prepare the {A} and cut into large, even pieces.', 'Spread everything on a baking tray in one layer, drizzle with oil, add salt and toss.', 'Bake for 30 to 35 minutes, stirring once, until the edges brown.', 'Check that everything is tender inside and that any meat or fish is not raw in the middle.', 'Rest for 5 minutes and serve hot.'],
      es: ['Calienta el horno a 200 °C. Prepara {A:d} y córtalos en trozos grandes y parejos.', 'Extiende todo en una bandeja en una sola capa, rocía con aceite, sala y mezcla.', 'Hornea de 30 a 35 minutos, removiendo una vez, hasta que los bordes se doren.', 'Comprueba que todo esté tierno por dentro y que la carne o el pescado no estén crudos en el centro.', 'Deja reposar 5 minutos y sirve caliente.'],
    },
  },
  stew: {
    min: 50, eq: ['pot'], c: 'savory', tg: ['dinner'],
    t: { ru: 'Рагу: {M:n}{S: с :i}', en: 'Stewed {M}{S: with :n}', es: 'Estofado de {M:n}{S: con :n}' },
    d: { ru: 'Сытное тушёное блюдо из {A:g}.', en: 'A hearty stew of {A}.', es: 'Un estofado contundente de {A}.' },
    s: {
      ru: ['Нарежьте {A:a} кусками среднего размера.', 'Разогрейте в кастрюле с толстым дном немного масла и обжарьте {M:a} 5 минут.', '{S|Добавьте {S:a}, перемешайте и готовьте ещё 5 минут.|Посолите и перемешайте.}', 'Влейте воды или бульона, чтобы покрыть продукты наполовину, посолите, накройте крышкой и тушите на слабом огне 30–40 минут.', 'Проверьте готовность: всё должно быть мягким. Если жидкости много, снимите крышку и уварите 5 минут.'],
      en: ['Cut the {A} into medium pieces.', 'Heat a little oil in a heavy pot and fry the {M} for 5 minutes.', '{S|Add the {S}, stir and cook for another 5 minutes.|Add salt and stir.}', 'Pour in water or stock to come halfway up the ingredients, add salt, cover and simmer on low heat for 30 to 40 minutes.', 'Check that everything is tender. If there is too much liquid, remove the lid and reduce for 5 minutes.'],
      es: ['Corta {A:d} en trozos medianos.', 'Calienta un poco de aceite en una olla de fondo grueso y sofríe {M:d} 5 minutos.', '{S|Añade {S:d}, remueve y cocina otros 5 minutos.|Sala y remueve.}', 'Vierte agua o caldo hasta cubrir los ingredientes a la mitad, sala, tapa y cuece a fuego lento de 30 a 40 minutos.', 'Comprueba que todo esté tierno. Si hay demasiado líquido, quita la tapa y reduce 5 minutos.'],
    },
  },
  soup: {
    min: 40, eq: ['pot'], c: 'savory', tg: ['soup', 'dinner'],
    t: { ru: 'Суп из {A:g}', en: '{A:s} soup', es: 'Sopa de {A:n}' },
    d: { ru: 'Домашний суп из {A:g}.', en: 'A homemade soup of {A}.', es: 'Una sopa casera de {A}.' },
    s: {
      ru: ['Нарежьте {A:a} небольшими кусочками.', 'В кастрюле вскипятите 1,5 литра воды и посолите.', 'Сначала положите {M:a} и варите 10 минут.', '{S|Добавьте {S:a} и варите ещё 15–20 минут, до мягкости.|Варите ещё 15 минут, до мягкости.}', 'Попробуйте, добавьте соль и перец. Дайте настояться 5 минут и подавайте с зеленью или хлебом.'],
      en: ['Cut the {A} into small pieces.', 'Bring 1.5 litres of water to a boil in a pot and add salt.', 'Add the {M} first and cook for 10 minutes.', '{S|Add the {S} and cook for another 15 to 20 minutes until tender.|Cook for another 15 minutes until tender.}', 'Taste and add salt and pepper. Let it stand for 5 minutes and serve with herbs or bread.'],
      es: ['Corta {A:d} en trozos pequeños.', 'Hierve 1,5 litros de agua en una olla y sala.', 'Echa primero {M:d} y cuece 10 minutos.', '{S|Añade {S:d} y cuece otros 15 a 20 minutos hasta que esté tierno.|Cuece 15 minutos más hasta que esté tierno.}', 'Prueba y rectifica de sal y pimienta. Deja reposar 5 minutos y sirve con hierbas o pan.'],
    },
  },
  salad: {
    min: 15, eq: [], c: 'savory', tg: ['salad', 'quick', 'noequip'],
    t: { ru: 'Салат из {A:g}', en: '{A:s} salad', es: 'Ensalada de {A:n}' },
    d: { ru: 'Свежий салат из {A:g}.', en: 'A fresh salad of {A}.', es: 'Una ensalada fresca de {A}.' },
    s: {
      ru: ['Вымойте и обсушите {A:a}. Мясо, рыбу и яйца используйте только предварительно приготовленными.', 'Нарежьте всё ровными небольшими кусочками.', 'Сложите в большую миску.', 'Заправьте маслом и соком лимона или уксусом, посолите и аккуратно перемешайте.', 'Дайте постоять 5 минут и подавайте сразу.'],
      en: ['Wash and dry the {A}. Use meat, fish and eggs only if they are already cooked.', 'Cut everything into even, small pieces.', 'Put in a large bowl.', 'Dress with oil and lemon juice or vinegar, add salt and toss gently.', 'Let it stand for 5 minutes and serve right away.'],
      es: ['Lava y seca {A:d}. Usa carne, pescado y huevos solo si ya están cocinados.', 'Corta todo en trozos pequeños y parejos.', 'Ponlo en un bol grande.', 'Aliña con aceite y zumo de limón o vinagre, sala y mezcla con cuidado.', 'Déjalo reposar 5 minutos y sirve enseguida.'],
    },
  },
  omelet: {
    min: 12, eq: ['pan'], c: 'savory', tg: ['breakfast', 'quick'],
    t: { ru: 'Омлет{S: с :i}', en: 'Omelette{S: with :n}', es: 'Tortilla de huevo{S: con :n}' },
    d: { ru: 'Пышный омлет{S: с :i}.', en: 'A fluffy omelette{S: with :n}.', es: 'Una tortilla de huevo esponjosa{S: con :n}.' },
    s: {
      ru: ['{S|Мелко нарежьте {S:a}.|Приготовьте сковороду с антипригарным покрытием.}', 'Взбейте яйца с щепоткой соли до однородности.', 'Разогрейте на сковороде немного масла на среднем огне. {S|Обжарьте {S:a} 3–5 минут.|}', 'Влейте яйца, накройте крышкой и готовьте 4–5 минут на слабом огне, пока омлет не схватится.', 'Сложите пополам и подавайте сразу.'],
      en: ['{S|Finely chop the {S}.|Get a non-stick pan ready.}', 'Whisk the eggs with a pinch of salt until smooth.', 'Heat a little oil in a pan over medium heat. {S|Fry the {S} for 3 to 5 minutes.|}', 'Pour in the eggs, cover and cook for 4 to 5 minutes over low heat until the omelette sets.', 'Fold in half and serve at once.'],
      es: ['{S|Pica fino {S:d}.|Prepara una sartén antiadherente.}', 'Bate los huevos con una pizca de sal hasta que queden uniformes.', 'Calienta un poco de aceite en una sartén a fuego medio. {S|Sofríe {S:d} de 3 a 5 minutos.|}', 'Vierte los huevos, tapa y cocina de 4 a 5 minutos a fuego lento hasta que cuaje.', 'Dobla por la mitad y sirve enseguida.'],
    },
  },
  smoothie: {
    min: 5, eq: ['blender'], c: 'shakes', tg: ['drink', 'quick'],
    t: { ru: 'Смузи из {A:g}', en: '{A:s} smoothie', es: 'Batido de {A:n}' },
    d: { ru: 'Густой смузи из {A:g}.', en: 'A thick smoothie of {A}.', es: 'Un batido espeso de {A}.' },
    s: {
      ru: ['Очистите и нарежьте {A:a} небольшими кусочками.', 'Сложите всё в блендер и добавьте 200 мл молока, кефира или воды.', 'Взбивайте 1 минуту до однородной консистенции.', 'Попробуйте и при желании добавьте мёд.', 'Разлейте по стаканам и подавайте сразу.'],
      en: ['Peel and cut the {A} into small pieces.', 'Put everything in a blender and add 200 ml of milk, kefir or water.', 'Blend for 1 minute until smooth.', 'Taste and add honey if you like.', 'Pour into glasses and serve at once.'],
      es: ['Pela y corta {A:d} en trozos pequeños.', 'Pon todo en la batidora y añade 200 ml de leche, kéfir o agua.', 'Bate 1 minuto hasta que quede cremoso.', 'Prueba y añade miel si quieres.', 'Reparte en vasos y sirve enseguida.'],
    },
  },
};

const KEEP = (id) => ING[id] && !SEASON.has(id);

/** ids вида 'gen~pan~chicken~carrot' → сырое описание рецепта или null */
export function buildGen(id) {
  const [, tech, ...raw] = id.split('~');
  const tpl = T[tech];
  if (!tpl || !raw.length || raw.length > 4) return null;
  let ids = [...new Set(raw)].filter((x) => ING[x]);
  if (!ids.length) return null;
  if (tech === 'omelet') ids = ['egg', ...ids.filter((x) => x !== 'egg')];
  const core = ids.filter(KEEP);
  const main = core[0] || ids[0];
  const side = ids.filter((x) => x !== main && !SEASON.has(x));
  const all = [main, ...side];
  const ing = ids.map((x, i) => ({ id: x, q: qty(x, x === main ? 0 : Math.min(i, 2)), opt: false }));
  for (const base of tech === 'smoothie' || tech === 'salad' ? [] : ['salt']) if (!ing.some((x) => x.id === base)) ing.push({ id: base, q: '~taste', opt: false });
  if (tech !== 'salad' && tech !== 'smoothie' && tech !== 'soup' && !ing.some((x) => x.id === 'oil')) ing.push({ id: 'oil', q: '2 tbsp', opt: false });
  const fill = (s, l) => {
    let out = s.replace(/\{S\|([^|]*)\|([^}]*)\}/g, (_, a, b) => (side.length ? a : b));
    out = out.replace(/\{S:( [^:}]*):(\w)\}/g, (_, pre, f) => (side.length ? `${pre}${join(side, l, f)}` : ''));
    out = out.replace(/\{([MSA]):?(\w)?\}/g, (_, k, f) => join(k === 'M' ? [main] : k === 'S' ? side : all, l, f || 'n'));
    return out.replace(/\s+/g, ' ').replace(/ ([.,])/g, '$1').trim();
  };
  const text = {};
  for (const l of LANGS) {
    let o;
    Object.defineProperty(text, l, {
      enumerable: true,
      get() {
        if (o) return o;
        const steps = tpl.s[l].map((x) => fill(x, l)).filter(Boolean);
        o = { t: cap(fill(tpl.t[l], l)), d: cap(fill(tpl.d[l], l)), s: steps, k: [{ ru: 'Это рецепт-основа, собранный из ваших продуктов. Пробуйте и подстраивайте соль и специи по вкусу.', en: 'This is a base recipe built from your ingredients. Taste and adjust the salt and spices as you go.', es: 'Es una receta base creada con tus ingredientes. Prueba y ajusta la sal y las especias.' }[l]], sm: steps.map(detectMin) };
        return o;
      },
    });
  }
  return { id, c: tpl.c, f: tech === 'smoothie' ? 'sweet' : 'salty', cu: 'int', min: tpl.min, srv: tech === 'smoothie' ? 2 : 3, lv: 1, eq: tpl.eq, e: TECH_EMOJI[tech], tg: tpl.tg, ing, text, fam: `gen-${tech}`, gen: true };
}

export const genId = (tech, ids) => ['gen', tech, ...ids].join('~');
