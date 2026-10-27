// Хранилище состояния: всё остаётся на устройстве (localStorage).
import { PANTRY_DEFAULT } from './data/ingredients.js';
import { PRESETS } from './data/equipment.js';

const KEY = 'mise:v1';

const DEFAULTS = {
  onboarded: false,
  have: [],
  owned: PRESETS.basic.eq,
  pantry: PANTRY_DEFAULT,
  diet: { vegetarian: false, vegan: false, glutenFree: false },
  mood: 'any',
  quick: false,
  favs: [],
  cooked: {},
  shop: [],
  chat: [],
  seed: 1,
};

let state;
const subs = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { ...DEFAULTS, ...(raw || {}), diet: { ...DEFAULTS.diet, ...((raw && raw.diet) || {}) } };
  } catch {
    return { ...DEFAULTS };
  }
}

let timer;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* приватный режим — не критично */ }
  }, 120);
}

export const get = () => state;
export function init() { state = load(); return state; }
export function set(patch, { silent = false } = {}) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  save();
  if (!silent) subs.forEach((fn) => fn(state));
}
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

export const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
  state = { ...DEFAULTS };
  subs.forEach((fn) => fn(state));
}
