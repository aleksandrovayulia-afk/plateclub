// Язык интерфейса и рецептов. Словари — в js/i18n/*.js
import ru from './i18n/ru.js';
import en from './i18n/en.js';
import es from './i18n/es.js';

export const LANGS = [
  { id: 'ru', name: 'Русский', short: 'RU' },
  { id: 'en', name: 'English', short: 'EN' },
  { id: 'es', name: 'Español', short: 'ES' },
];
const DICT = { ru, en, es };
let lang = 'ru';

export const currentLang = () => lang;

export function detectLang() {
  const list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
  for (const l of list) {
    const code = String(l || '').slice(0, 2).toLowerCase();
    if (DICT[code]) return code;
  }
  return 'en';
}

export function setLang(l) {
  if (!DICT[l]) return;
  lang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

/** Выбор формы множественного числа. forms: ru [1, 2-4, 5+], en/es [1, прочее] */
export function pluralForm(n, forms, l = lang) {
  n = Math.abs(n);
  if (l === 'ru') {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1] ?? forms[0];
    return forms[2] ?? forms[1] ?? forms[0];
  }
  return n === 1 ? forms[0] : forms[1] ?? forms[0];
}

/** t('ключ', {n: 3, name: 'x'}). Значение-массив — формы числа по vars.n */
export function t(key, vars = {}) {
  let v = DICT[lang][key];
  if (v === undefined) v = DICT.ru[key];
  if (v === undefined) return key;
  if (Array.isArray(v)) v = pluralForm(vars.n ?? 0, v);
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

export const hasKey = (l, key) => DICT[l][key] !== undefined;
export const dictKeys = (l) => Object.keys(DICT[l]);
