// Хранилище состояния: всё остаётся на устройстве (localStorage).
import { PANTRY_DEFAULT } from './data/ingredients.js';
import { PRESETS } from './data/equipment.js';
import { detectLang } from './i18n.js';

const KEY = 'mise:v2';
const OLD_KEY = 'mise:v1';

export const DIET_KEYS = ['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'eggFree', 'nutFree'];

const DEFAULTS = () => ({
  lang: null,
  units: 'metric',
  theme: 'auto',
  textSize: 'm',
  voice: false,
  wake: true,
  onboarded: false,
  have: [],
  owned: PRESETS.basic.eq,
  pantry: PANTRY_DEFAULT,
  diet: Object.fromEntries(DIET_KEYS.map((k) => [k, false])),
  mood: 'any',
  quick: false,
  seed: 1,
  favs: [],
  cooked: {},
  ratings: {},
  notes: {},
  viewed: [],
  shop: [],
  plan: {},
  chat: [],
  recentSearches: [],
});

let state;
const subs = new Set();

function load() {
  const base = DEFAULTS();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) return { ...base, ...raw, diet: { ...base.diet, ...(raw.diet || {}) } };
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); // перенос из первой версии
    if (old) {
      return {
        ...base,
        onboarded: !!old.onboarded,
        have: old.have || [],
        owned: old.owned || base.owned,
        pantry: old.pantry || base.pantry,
        favs: old.favs || [],
        cooked: old.cooked || {},
        diet: { ...base.diet, vegetarian: !!old.diet?.vegetarian, vegan: !!old.diet?.vegan, glutenFree: !!old.diet?.glutenFree },
      };
    }
  } catch { /* повреждённые данные — начинаем с нуля */ }
  return base;
}

let timer;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* приватный режим */ }
  }, 150);
}

export const get = () => state;
export function init() {
  state = load();
  if (!state.lang) state.lang = detectLang();
  return state;
}
export function set(patch, { silent = false } = {}) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  save();
  if (!silent) subs.forEach((fn) => fn(state));
}
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function reset() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch { /* */ }
  const lang = state.lang;
  state = { ...DEFAULTS(), lang };
  subs.forEach((fn) => fn(state));
}

export const exportData = () => JSON.stringify(state);
export function importData(text) {
  const raw = JSON.parse(text);
  if (typeof raw !== 'object' || !raw) throw new Error('bad');
  state = { ...DEFAULTS(), ...raw, diet: { ...DEFAULTS().diet, ...(raw.diet || {}) } };
  save();
  subs.forEach((fn) => fn(state));
}
