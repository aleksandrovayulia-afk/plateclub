// Категории холодильника: 24 понятные группы вместо технических групп словаря.
import { ING } from './ingredients.js';

export const FRIDGE_CATS = ['veg', 'fruit', 'berry', 'meat', 'poultry', 'fish', 'seafood', 'dairy', 'cheese', 'eggs', 'grain', 'pasta', 'legume', 'nuts', 'spice', 'oil', 'sauce', 'canned', 'bread', 'bakery', 'frozen', 'drinks', 'sweets', 'ready'];
export const CAT_EMOJI = { veg: '🥕', fruit: '🍎', berry: '🍓', meat: '🥩', poultry: '🍗', fish: '🐟', seafood: '🦐', dairy: '🥛', cheese: '🧀', eggs: '🥚', grain: '🌾', pasta: '🍝', legume: '🫘', nuts: '🥜', spice: '🧂', oil: '🫒', sauce: '🫙', canned: '🥫', bread: '🍞', bakery: '🥐', frozen: '🧊', drinks: '🥤', sweets: '🍫', ready: '🍱' };

// Явные категории для продуктов основного словаря; всё, что здесь не указано, берётся по группе
const BY_ID = {
  chicken: 'poultry', turkey: 'poultry', shrimp: 'seafood', squid: 'seafood', crabsticks: 'seafood', egg: 'eggs',
  cheese: 'cheese', parmesan: 'cheese', mozzarella: 'cheese', feta: 'cheese', creamcheese: 'cheese', icecream: 'frozen', tofu: 'dairy',
  pickle: 'canned', sauerkraut: 'canned', olives: 'canned', cantomato: 'canned',
  strawberry: 'berry', blueberry: 'berry', raspberry: 'berry', cranberry: 'berry', berry: 'berry', coconut: 'nuts', raisin: 'nuts', dates: 'nuts', driedfruit: 'nuts',
  pasta: 'pasta', noodles: 'pasta', lentil: 'legume', chickpea: 'legume', beans: 'legume', bread: 'bread', lavash: 'bread', puff: 'frozen',
  oil: 'oil', oliveoil: 'oil', nuts: 'nuts', almond: 'nuts', walnut: 'nuts', peanut: 'nuts', seeds: 'nuts', sesame: 'nuts', chia: 'nuts',
  cocoa: 'sweets', chocolate: 'sweets', cookies: 'sweets', honey: 'sweets', jam: 'sweets', peanutbutter: 'sweets', condensed: 'sweets', maplesyrup: 'sweets', protein: 'sweets',
  ice: 'frozen', flour: 'grain', wholeflour: 'grain', sugar: 'grain', powder: 'grain', bakingpowder: 'grain', soda: 'grain', yeast: 'grain', starch: 'grain', gelatin: 'grain', vanilla: 'spice',
  chili: 'veg', broth: 'sauce',
};
const BY_GROUP = { meat: 'meat', fish: 'fish', dairy: 'dairy', veg: 'veg', fruit: 'fruit', grain: 'grain', bake: 'sweets', sauce: 'sauce', spice: 'spice', drink: 'drinks' };

export const catOf = (id) => ING[id]?.cat || BY_ID[id] || BY_GROUP[ING[id]?.g] || 'ready';

/** Продукты категории: сначала самые частые из списка COMMON, затем по алфавиту выбранного языка */
export function idsOfCat(cat, lang, common = []) {
  const ids = Object.keys(ING).filter((id) => catOf(id) === cat);
  return ids.sort((a, b) => (common.includes(b) - common.includes(a)) || ING[a].n[lang].localeCompare(ING[b].n[lang], lang));
}
