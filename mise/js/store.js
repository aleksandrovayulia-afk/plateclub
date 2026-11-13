// Хранилище состояния: всё остаётся на устройстве (localStorage).
import { PANTRY_DEFAULT } from './data/ingredients.js';
import { PRESETS } from './data/equipment.js';
import { detectLang } from './i18n.js';

const KEY = 'mise:v2';
export const SCHEMA = 3;
const OLD_KEY = 'mise:v1';

export const DIET_KEYS = ['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'eggFree', 'nutFree'];

const DEFAULTS = () => ({
  schema: SCHEMA,
  lang: null,
  units: 'metric',
  theme: 'auto',
  textSize: 'm',
  voice: false,
  haptics: true,
  music: false,
  coach: {},
  musicVol: 0.5,
  musicStyle: 'jazz',
  musicCook: false,
  wake: true,
  onboarded: false,
  have: [],
  items: {}, // подробности о продуктах из «have»: { id: { qty, unit, exp, added } }
  custom: [], // свои продукты: { id, name, e, group, qty, unit, exp }
  chats: [], // история разговоров: { id, title, ts, msgs }
  chatId: null,
  timersState: [], // таймеры, сохранённые между запусками
  stopwatch: { running: false, base: 0, start: 0, laps: [] },
  cookProgress: {}, // { recipeId: { i, done, used, servings, ts } }
  music2: { coll: 'relaxed', track: 0, favs: [], repeat: 'off', muted: false, shuffle: false },
  onlineSearch: true,
  searchEndpoint: '',
  alarm: 'bell',
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

/** Переводит данные старых версий в текущую схему. Оригинал всегда сохраняется в резервной копии. */
export function migrate(raw, base = DEFAULTS()) {
  const out = { ...base, ...raw, diet: { ...base.diet, ...(raw.diet || {}) } };
  if ((raw.schema || 2) < 3) {
    out.items = { ...(raw.items || {}) };
    for (const id of out.have || []) if (!out.items[id]) out.items[id] = { added: Date.now() };
    if (!out.chats?.length && raw.chat?.length) out.chats = [{ id: 'c1', title: '', ts: Date.now(), msgs: raw.chat }];
    if (out.chats.length && !out.chatId) out.chatId = out.chats[out.chats.length - 1].id;
    if (raw.musicStyle && !raw.music2) out.music2 = { ...base.music2, coll: { jazz: 'jazz', bossa: 'italian', chill: 'relaxed' }[raw.musicStyle] || 'relaxed' };
    out.schema = SCHEMA;
  }
  return out;
}

function load() {
  const base = DEFAULTS();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) {
      if ((raw.schema || 2) < SCHEMA) {
        try { localStorage.setItem(`${KEY}:backup-v${raw.schema || 2}`, JSON.stringify(raw)); } catch { /* места нет: идём дальше, исходные данные остаются */ }
      }
      return migrate(raw, base);
    }
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
  state = migrate(raw);
  save();
  subs.forEach((fn) => fn(state));
}
