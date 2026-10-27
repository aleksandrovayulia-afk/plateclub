import cakes from './cakes.js';
import sweet from './sweet.js';
import savory from './savory.js';
import sport from './sport.js';
import shakes from './shakes.js';
import other from './other.js';

export const RAW_RECIPES = [...cakes, ...sweet, ...savory, ...sport, ...shakes, ...other];

export const CATEGORIES = [
  { id: 'cakes', n: 'Торты', e: '🎂', tint: '#f4b6c2' },
  { id: 'sweet', n: 'Сладкое', e: '🥞', tint: '#f7c99b' },
  { id: 'savory', n: 'Солёное', e: '🍲', tint: '#b9d49a' },
  { id: 'shakes', n: 'Коктейли', e: '🥤', tint: '#9fc8ec' },
  { id: 'sport', n: 'Спорт', e: '💪', tint: '#a5dcc7' },
  { id: 'other', n: 'Остальное', e: '🍞', tint: '#cdbfe8' },
];

export const CUISINES = {
  ru: 'Русская', it: 'Итальянская', fr: 'Французская', us: 'Американская', gr: 'Греческая', ge: 'Грузинская',
  uz: 'Узбекская', me: 'Ближневосточная', as: 'Азиатская', in: 'Индийская', int: 'Интернациональная',
};
