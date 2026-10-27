// Количества: «200 g», «2 tbsp», «1/2 tsp», «3-4 icecube», «~taste». Единицы переводятся и склоняются.
import { currentLang, pluralForm } from './i18n.js';

// ru: [1, 2–4, 5+], en: [1, много], es: [1, много]; пустая строка — число без единицы
const UNITS = {
  g: { ru: ['г'], en: ['g'], es: ['g'] },
  kg: { ru: ['кг'], en: ['kg'], es: ['kg'] },
  ml: { ru: ['мл'], en: ['ml'], es: ['ml'] },
  l: { ru: ['л'], en: ['l'], es: ['l'] },
  tbsp: { ru: ['ст. л.'], en: ['tbsp'], es: ['cucharada', 'cucharadas'] },
  tsp: { ru: ['ч. л.'], en: ['tsp'], es: ['cucharadita', 'cucharaditas'] },
  pc: { ru: ['шт'], en: [''], es: [''] },
  clove: { ru: ['зубчик', 'зубчика', 'зубчиков'], en: ['clove', 'cloves'], es: ['diente', 'dientes'] },
  slice: { ru: ['ломтик', 'ломтика', 'ломтиков'], en: ['slice', 'slices'], es: ['rebanada', 'rebanadas'] },
  can: { ru: ['банка', 'банки', 'банок'], en: ['can', 'cans'], es: ['lata', 'latas'] },
  head: { ru: ['головка', 'головки', 'головок'], en: ['head', 'heads'], es: ['cabeza', 'cabezas'] },
  steak: { ru: ['стейк', 'стейка', 'стейков'], en: ['steak', 'steaks'], es: ['filete', 'filetes'] },
  scoop: { ru: ['мерная ложка', 'мерные ложки', 'мерных ложек'], en: ['scoop', 'scoops'], es: ['cacito', 'cacitos'] },
  cm: { ru: ['см'], en: ['cm'], es: ['cm'] },
  square: { ru: ['кубик', 'кубика', 'кубиков'], en: ['square', 'squares'], es: ['onza', 'onzas'] },
  icecube: { ru: ['кубик', 'кубика', 'кубиков'], en: ['ice cube', 'ice cubes'], es: ['cubito', 'cubitos'] },
  sprig: { ru: ['веточка', 'веточки', 'веточек'], en: ['sprig', 'sprigs'], es: ['ramita', 'ramitas'] },
  stalk: { ru: ['стебель', 'стебля', 'стеблей'], en: ['stalk', 'stalks'], es: ['rama', 'ramas'] },
  sheet: { ru: ['лист', 'листа', 'листов'], en: ['sheet', 'sheets'], es: ['lámina', 'láminas'] },
  cup: { ru: ['стакан', 'стакана', 'стаканов'], en: ['cup', 'cups'], es: ['taza', 'tazas'] },
  oz: { ru: ['унц.'], en: ['oz'], es: ['oz'] },
  floz: { ru: ['жидк. унц.'], en: ['fl oz'], es: ['fl oz'] },
  lb: { ru: ['фунт'], en: ['lb'], es: ['lb'] },
};

const NOTES = {
  taste: { ru: 'по вкусу', en: 'to taste', es: 'al gusto' },
  serve: { ru: 'для подачи', en: 'for serving', es: 'para servir' },
  garnish: { ru: 'для украшения', en: 'for garnish', es: 'para decorar' },
  dust: { ru: 'для посыпки', en: 'for dusting', es: 'para espolvorear' },
  grease: { ru: 'для смазывания', en: 'for greasing', es: 'para engrasar' },
  pinch: { ru: 'щепотка', en: 'a pinch', es: 'una pizca' },
  bunch: { ru: 'пучок', en: 'a bunch', es: 'un manojo' },
  handful: { ru: 'горсть', en: 'a handful', es: 'un puñado' },
  drops: { ru: 'несколько капель', en: 'a few drops', es: 'unas gotas' },
  plenty: { ru: 'много', en: 'plenty', es: 'abundante' },
  bit: { ru: 'кусочек', en: 'a small piece', es: 'un trozo pequeño' },
  fewsprigs: { ru: 'несколько веточек', en: 'a few sprigs', es: 'unas ramitas' },
  fewcubes: { ru: 'несколько кубиков', en: 'a few cubes', es: 'unos cubitos' },
  fewleaves: { ru: 'несколько листьев', en: 'a few leaves', es: 'unas hojas' },
};

export const UNIT_KEYS = Object.keys(UNITS);
export const NOTE_KEYS = Object.keys(NOTES);

/** '200 g' → {n:200, u:'g'}; '2-3 pc' → {n:2, n2:3}; '~taste' → {note:'taste'} */
export function parseQty(s) {
  s = String(s).trim();
  if (s.startsWith('~')) return { note: s.slice(1) };
  const m = s.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(?:-(\d+(?:\.\d+)?|\d+\/\d+))?\s+([a-z]+)$/);
  if (!m) return { bad: s };
  return { n: num(m[1]), n2: m[2] ? num(m[2]) : null, u: m[3] };
}
const num = (x) => (x.includes('/') ? x.split('/').reduce((a, b) => a / b) : parseFloat(x));

const FR = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.33: '⅓', 0.67: '⅔' };
function fmt(v, lang) {
  if (v >= 100) return String(Math.round(v / 5) * 5);
  if (v >= 10) return String(Math.round(v));
  if (v >= 3) { const r = Math.round(v * 2) / 2; return decimal(r, lang); }
  const q = Math.round(v * 4) / 4;
  const whole = Math.floor(q);
  const frac = q - whole;
  const f = FR[frac] || '';
  if (!whole) return f || '¼';
  return f ? `${whole}${f}` : String(whole);
}
const decimal = (r, lang) => (Number.isInteger(r) ? String(r) : String(r).replace('.', lang === 'en' ? '.' : ','));

function imperial(n, u) {
  if (u === 'g') {
    const oz = n / 28.35;
    return oz >= 16 ? { n: oz / 16, u: 'lb' } : { n: oz, u: 'oz' };
  }
  if (u === 'kg') return { n: n * 2.2046, u: 'lb' };
  if (u === 'ml') return n >= 120 ? { n: n / 240, u: 'cup' } : { n: n / 29.57, u: 'floz' };
  if (u === 'l') return { n: n * 4.227, u: 'cup' };
  return { n, u };
}

function unitWord(u, n, lang) {
  const forms = UNITS[u][lang];
  return pluralForm(Math.ceil(n - 0.001), forms, lang);
}

/** Строка количества для показа. opts: {scale, imperial, lang} */
export function fmtQty(q, opts = {}) {
  if (Array.isArray(q)) return q.map((x) => fmtQty(x, opts)).join(' + ');
  const { scale = 1, imp = false, lang = currentLang() } = opts;
  const p = typeof q === 'string' ? parseQty(q) : q;
  if (p.bad) return p.bad;
  if (p.note) return NOTES[p.note]?.[lang] ?? p.note;
  let { n, n2, u } = p;
  n *= scale;
  if (n2) n2 *= scale;
  if (imp && !n2) ({ n, u } = imperial(n, u));
  // «один» без единицы красивее: «1/2 tsp», но «2 eggs» → «2»
  const a = fmt(n, lang) + (n2 ? `–${fmt(n2, lang)}` : '');
  const word = unitWord(u, n2 || n, lang);
  const small = u === 'pc' || u === 'tbsp' || u === 'tsp' || u === 'cm' ? ' ' : ' ';
  return word ? `${a}${small}${word}` : a;
}

/** Все количества в строке-рецепте читаются? (для тестов) */
export const validQty = (s) => {
  if (Array.isArray(s)) return s.length > 0 && s.every(validQty);
  const p = parseQty(s);
  if (p.bad) return false;
  if (p.note) return !!NOTES[p.note];
  return !!UNITS[p.u];
};
