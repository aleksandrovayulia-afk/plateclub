// Первые 95 рецептов, написанных вручную. Русский текст — в cakes.js… , переводы — в ../tr/*.js
import cakes from './cakes.js';
import sweet from './sweet.js';
import savory from './savory.js';
import sport from './sport.js';
import shakes from './shakes.js';
import other from './other.js';
import trCakes from '../tr/cakes.js';
import trSweet from '../tr/sweet.js';
import trSavory from '../tr/savory.js';
import trSport from '../tr/sport.js';
import trShakes from '../tr/shakes.js';
import trOther from '../tr/other.js';

const TR = { ...trCakes, ...trSweet, ...trSavory, ...trSport, ...trShakes, ...trOther };

function splitStep(line) {
  const k = line.lastIndexOf('|');
  if (k > 0 && /^\d+$/.test(line.slice(k + 1))) return { text: line.slice(0, k), min: +line.slice(k + 1) };
  return { text: line, min: 0 };
}

export const LEGACY = [...cakes, ...sweet, ...savory, ...sport, ...shakes, ...other].map((r) => {
  const steps = r.s.map(splitStep);
  const tr = TR[r.id];
  if (!tr) throw new Error(`Нет перевода для ${r.id}`);
  return {
    id: r.id, c: r.c, f: r.f, cu: r.cu, min: r.min, srv: r.srv, lv: r.lv, eq: r.eq, e: r.e, tg: r.tg || [],
    ing: r.i.map((line) => {
      const [rawId, q] = line.split('|');
      const opt = rawId.endsWith('?');
      return { id: opt ? rawId.slice(0, -1) : rawId, q, opt };
    }),
    stepMin: steps.map((x) => x.min),
    text: {
      ru: { t: r.t, d: r.d, s: steps.map((x) => x.text), k: r.k || [] },
      en: tr.en,
      es: tr.es,
    },
    fam: null,
  };
});
