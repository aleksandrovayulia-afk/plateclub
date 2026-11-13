// Содержимое холодильника: количество, единицы, срок годности и свои продукты.
// В store лежат: have (id продуктов, по ним идёт подбор рецептов), items (подробности), custom (свои продукты).
import { ING } from './data/ingredients.js';
import { extractIngredients } from './engine.js';
import * as store from './store.js';

export const UNITS = ['pc', 'g', 'kg', 'ml', 'l', 'pack'];
const UNIT_RE = [
  ['kg', /^(кг|килограмм\w*|kg)$/i], ['g', /^(г|гр|грамм\w*|g|gr|gramos?)$/i], ['ml', /^(мл|миллилитр\w*|ml)$/i], ['l', /^(л|литр\w*|l|litros?)$/i],
  ['pc', /^(шт|штук\w*|pcs?|pieces?|uds?|unidad\w*|x)$/i], ['pack', /^(уп|упак\w*|пачк\w*|банк\w*|пакет\w*|pack|can|cans|paquetes?|botes?|latas?)$/i],
];
const unitOf = (w) => UNIT_RE.find(([, re]) => re.test(w))?.[0] || null;
const DAY = 86400000;

/** «3 яйца», «молоко 1 л», «500 г муки» → { qty, unit, name } */
export function parseChunk(raw) {
  let text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  let qty = null; let unit = null;
  let m = text.match(/^(\d+(?:[.,]\d+)?)\s*([^\d\s]+)?\s+(.+)$/);
  if (m) {
    const u = m[2] ? unitOf(m[2]) : null;
    if (u) { qty = parseFloat(m[1].replace(',', '.')); unit = u; text = m[3]; }
    else { qty = parseFloat(m[1].replace(',', '.')); unit = 'pc'; text = `${m[2] ? `${m[2]} ` : ''}${m[3]}`.trim(); }
  } else {
    m = text.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*([^\d\s]+)?$/);
    if (m) { const u = m[3] ? unitOf(m[3]) : null; qty = parseFloat(m[2].replace(',', '.')); unit = u || 'pc'; text = m[1]; }
  }
  return { qty, unit, name: text };
}

/** Разбор вставленного списка: продукты из словаря и всё остальное (свои продукты) */
export function parseBulk(text) {
  const known = []; const unknown = [];
  for (const part of text.split(/[,;\n]+/)) {
    const c = parseChunk(part);
    if (!c || !c.name) continue;
    const { ids, matched, total } = extractIngredients(c.name);
    if (ids.length && matched >= total) for (const id of ids) known.push({ id, qty: ids.length === 1 ? c.qty : null, unit: ids.length === 1 ? c.unit : null });
    else unknown.push({ name: c.name, qty: c.qty, unit: c.unit });
  }
  return { known, unknown };
}

export function addKnown(list) {
  const s = store.get();
  const have = [...s.have]; const items = { ...s.items };
  for (const { id, qty, unit } of list) {
    if (!have.includes(id)) have.push(id);
    items[id] = { ...(items[id] || { added: Date.now() }), ...(qty != null ? { qty, unit } : {}) };
  }
  store.set({ have, items });
  return have.length;
}

const slug = (n) => n.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 30);
export function addCustom({ name, qty = null, unit = null, e = '🛒', cat = 'ready' }) {
  const s = store.get();
  const id = `c_${slug(name)}`;
  if (s.custom.some((x) => x.id === id)) return id;
  store.set({ custom: [...s.custom, { id, name: name.trim(), e, cat, qty, unit, exp: null, added: Date.now() }] });
  return id;
}

export function setItem(id, patch) {
  const s = store.get();
  if (id.startsWith('c_')) { store.set({ custom: s.custom.map((x) => (x.id === id ? { ...x, ...patch } : x)) }); return; }
  store.set({ items: { ...s.items, [id]: { ...(s.items[id] || { added: Date.now() }), ...patch } } });
}

export function removeItem(id) {
  const s = store.get();
  if (id.startsWith('c_')) { store.set({ custom: s.custom.filter((x) => x.id !== id) }); return; }
  const items = { ...s.items }; delete items[id];
  store.set({ have: s.have.filter((x) => x !== id), items });
}

export const detailOf = (s, id) => (id.startsWith('c_') ? s.custom.find((x) => x.id === id) : s.items[id]) || {};

/** Дней до конца срока: отрицательное — просрочено, null — срок не указан */
export function daysLeft(exp, now = Date.now()) {
  if (!exp) return null;
  const end = new Date(`${exp}T23:59:59`).getTime();
  return Math.floor((end - now) / DAY);
}

/** Продукты, срок которых заканчивается через N дней и раньше (включая просроченные), по возрастанию срока */
export function expiring(s, days = 3, now = Date.now()) {
  const all = [...s.have.map((id) => ({ id, exp: s.items[id]?.exp })), ...s.custom.map((x) => ({ id: x.id, exp: x.exp }))];
  return all.map((x) => ({ ...x, left: daysLeft(x.exp, now) })).filter((x) => x.left !== null && x.left <= days).sort((a, b) => a.left - b.left);
}

export const nameOf = (s, id, lang) => (id.startsWith('c_') ? s.custom.find((x) => x.id === id)?.name || id : ING[id].n[lang]);
export const emojiOf = (s, id) => (id.startsWith('c_') ? s.custom.find((x) => x.id === id)?.e || '🛒' : ING[id].e);
