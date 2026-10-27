// Раскрывает «семейства» рецептов в отдельные рецепты на трёх языках.
// Семейство — это техника приготовления (крем-суп, паста с соусом, маффины…). Варианты подставляют продукты
// в слоты {0}, {1}…, а формы слов (падежи, артикли) берутся из словаря продуктов, поэтому тексты грамматически верны.
import { ING } from '../ingredients.js';

const LANGS = ['ru', 'en', 'es'];
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function fill(str, slots, lang, where, cook) {
  str = str.replace(/\{t\}/g, String(cook));
  return str.replace(/\{(\d)(?::(\w))?\}/g, (_, i, f) => {
    const id = slots[Number(i)];
    if (!id || !ING[id]) throw new Error(`${where}: слот ${i} не задан или неизвестен (${id})`);
    const form = ING[id].form[lang];
    const key = f || 'n';
    if (!(key in form)) throw new Error(`${where}: нет формы ${key} у ${id}/${lang}`);
    return form[key];
  });
}

// Испанские слитные формы: «de el» → «del», «a el» → «al»
const post = (s, lang) => (lang === 'es' ? s.replace(/\bde el\b/g, 'del').replace(/\ba el\b/g, 'al') : s);

// Согласование по роду и числу в испанском: «córtalo» → «córtalas», «esté tierno» → «estén tiernas».
// Работает только если в предложении ровно один слот, иначе неясно, к чему относится слово.
const ES_LO = 'córtalo|pícalo|aplástalo|tritúralo|mézclalo|ásalo|cuécelo|déjalo|pásalo|repártelo|machácalo|escúrrelo|lávalo|trocéalo|rállalo|sálalo|ponlo|cúbrelo|colócalo|incorpóralo|extiéndelo|saltéalo|resérvalo|sírvelo|tápalo|apártalo|exprímelo|desmenúzalo|cuélalo|mézclalo|exprímelo|rebózalo|fríelo|caliéntalo|hiérvelo|dóralo|ablándalo|limpíalo|pélalo|trabájalo';
const ES_ADJ = 'tierno|blando|hecho|cocido|frío|dorado|listo|escurrido|congelado|maduro|entero|picado|molido';
const RE_LO = new RegExp(`(?<![\\wáéíóúñ])(${ES_LO})(?![\\wáéíóúñ])`, 'gi');
const RE_ADJ = new RegExp(`(?<![\\wáéíóúñ])(${ES_ADJ})(?![\\wáéíóúñ])`, 'gi');
const SUFFIX = { el: ['o', 'lo'], la: ['a', 'la'], los: ['os', 'los'], las: ['as', 'las'] };
function agreeEs(tpl, slots) {
  const refs = [...new Set([...tpl.matchAll(/\{(\d)(?::\w)?\}/g)].map((m) => m[1]))];
  if (refs.length !== 1) return tpl;
  const art = ING[slots[Number(refs[0])]].form.es.d.split(' ')[0];
  const [o, lo] = SUFFIX[art];
  if (art === 'el') return tpl;
  const plural = art === 'los' || art === 'las';
  return tpl
    .replace(RE_LO, (w) => w.slice(0, -2) + lo)
    .replace(new RegExp(`(?<![\\wáéíóúñ])(esté|quede) (${ES_ADJ})(?![\\wáéíóúñ])`, 'gi'), (_, v, a) => `${plural ? `${v}n` : v} ${a.slice(0, -1)}${o}`)
    .replace(RE_ADJ, (w) => w.slice(0, -1) + o);
}

const slotId = (s, slots) => s.replace(/\{(\d)\}/g, (_, i) => slots[Number(i)]);

const RANK = { base: 0, add: 1, slot: 2 };
/** Один продукт — одна строка: слот важнее добавки, добавка важнее основы, две строки основы складываются */
function dedupe(list) {
  const out = [];
  for (const x of list) {
    const i = out.findIndex((y) => y.id === x.id);
    if (i < 0) { out.push({ ...x }); continue; }
    const y = out[i];
    if (RANK[x.src] > RANK[y.src] || (x.src === 'add' && y.src === 'add')) out[i] = { ...x };
    else if (RANK[x.src] === RANK[y.src]) out[i] = { ...y, q: [].concat(y.q, x.q), opt: y.opt && x.opt };
  }
  return out;
}

/** Таймер для шага: наибольшее время в тексте (нижняя граница диапазона) */
export function detectMin(ru) {
  let best = 0;
  for (const m of ru.matchAll(/(\d+(?:[.,]\d+)?)(?:\s?[–-]\s?\d+(?:[.,]\d+)?)?\s*(минут|час|секунд)/gi)) {
    let v = parseFloat(m[1].replace(',', '.'));
    if (m[2].startsWith('час')) v *= 60;
    else if (m[2].startsWith('секунд')) v /= 60;
    v = Math.round(v);
    if (v >= 1 && v <= 600 && v > best) best = v;
  }
  return best;
}

export function expand(fam) {
  const out = [];
  for (const raw of fam.v) {
    const v = typeof raw === 'string' ? { s: [raw] } : Array.isArray(raw) ? { s: raw } : raw;
    const slots = v.s;
    const id = v.id || `${fam.id}-${slots.join('-')}`;
    const where = id;
    const cook = v.cook ?? fam.cook ?? 0;

    let ing = fam.i.map((line) => {
      const [rawId, qty] = line.split('|');
      const opt = rawId.endsWith('?');
      const bare = opt ? rawId.slice(0, -1) : rawId;
      return { id: slotId(bare, slots), q: qty, opt, src: bare.includes('{') ? 'slot' : 'base' };
    });
    if (v.drop) ing = ing.filter((x) => !v.drop.includes(x.id));
    for (const line of v.add || []) {
      const [rawId, qty] = line.split('|');
      const opt = rawId.endsWith('?');
      ing.push({ id: slotId(opt ? rawId.slice(0, -1) : rawId, slots), q: qty, opt, src: 'add' });
    }
    ing = dedupe(ing).map(({ id: i, q, opt }) => ({ id: i, q, opt }));
    for (const x of ing) if (!ING[x.id]) throw new Error(`${where}: неизвестный продукт ${x.id}`);
    if (v.q) {
      for (const [k, q] of Object.entries(v.q)) {
        const target = /^\d$/.test(k) ? slots[Number(k)] : k;
        const hit = ing.find((x) => x.id === target);
        if (!hit) throw new Error(`${where}: q для ${k} — нет такого ингредиента`);
        hit.q = q;
      }
    }

    const text = {};
    for (const l of LANGS) {
      const tpl = v.t?.[l] ?? fam.t[l];
      const F = (x) => post(cap(fill(l === 'es' ? agreeEs(x, slots) : x, slots, l, where, cook)), l);
      text[l] = {
        t: F(tpl),
        d: F(v.d?.[l] ?? fam.d[l]),
        s: (v.s2?.[l] ?? fam.s[l]).map(F),
        k: [...(fam.k[l] || []).map(F), ...(v.x?.[l] ? [F(v.x[l])] : [])],
      };
    }
    out.push({
      id,
      c: fam.c,
      f: v.f || fam.f,
      cu: v.cu || fam.cu,
      min: v.m ?? fam.min,
      srv: v.srv ?? fam.srv,
      lv: v.lv ?? fam.lv,
      eq: v.eq ?? fam.eq,
      e: v.e || (fam.e === 'auto' ? ING[slots[0]].e : fam.e),
      tg: [...new Set([...(fam.tg || []), ...(v.tg || [])])],
      ing,
      stepMin: text.ru.s.map(detectMin),
      text,
      fam: fam.id,
    });
  }
  return out;
}
