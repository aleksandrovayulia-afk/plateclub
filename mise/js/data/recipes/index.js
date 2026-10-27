import { LEGACY } from './legacy.js';
import { expand } from './generate.js';
import FAMILIES from './families/index.js';

export const RAW_RECIPES = [...LEGACY, ...FAMILIES.flatMap(expand)];

export const CATEGORIES = [
  { id: 'cakes', e: '🎂', tint: '#f4b6c2', n: { ru: 'Торты', en: 'Cakes', es: 'Tartas' } },
  { id: 'sweet', e: '🥞', tint: '#f7c99b', n: { ru: 'Сладкое', en: 'Sweet', es: 'Dulces' } },
  { id: 'savory', e: '🍲', tint: '#b9d49a', n: { ru: 'Солёное', en: 'Savory', es: 'Salado' } },
  { id: 'shakes', e: '🥤', tint: '#9fc8ec', n: { ru: 'Напитки', en: 'Drinks', es: 'Bebidas' } },
  { id: 'sport', e: '💪', tint: '#a5dcc7', n: { ru: 'Спорт', en: 'Fitness', es: 'Fitness' } },
  { id: 'other', e: '🍞', tint: '#cdbfe8', n: { ru: 'Остальное', en: 'Basics', es: 'Básicos' } },
];

export const CUISINES = {
  ru: { ru: 'Русская', en: 'Russian', es: 'Rusa' },
  it: { ru: 'Итальянская', en: 'Italian', es: 'Italiana' },
  fr: { ru: 'Французская', en: 'French', es: 'Francesa' },
  us: { ru: 'Американская', en: 'American', es: 'Estadounidense' },
  gr: { ru: 'Греческая', en: 'Greek', es: 'Griega' },
  ge: { ru: 'Грузинская', en: 'Georgian', es: 'Georgiana' },
  uz: { ru: 'Узбекская', en: 'Uzbek', es: 'Uzbeka' },
  me: { ru: 'Ближневосточная', en: 'Middle Eastern', es: 'De Oriente Medio' },
  as: { ru: 'Азиатская', en: 'Asian', es: 'Asiática' },
  in: { ru: 'Индийская', en: 'Indian', es: 'India' },
  mx: { ru: 'Мексиканская', en: 'Mexican', es: 'Mexicana' },
  es: { ru: 'Испанская', en: 'Spanish', es: 'Española' },
  jp: { ru: 'Японская', en: 'Japanese', es: 'Japonesa' },
  de: { ru: 'Немецкая', en: 'German', es: 'Alemana' },
  tr: { ru: 'Турецкая', en: 'Turkish', es: 'Turca' },
  ma: { ru: 'Марокканская', en: 'Moroccan', es: 'Marroquí' },
  th: { ru: 'Тайская', en: 'Thai', es: 'Tailandesa' },
  cn: { ru: 'Китайская', en: 'Chinese', es: 'China' },
  kr: { ru: 'Корейская', en: 'Korean', es: 'Coreana' },
  int: { ru: 'Интернациональная', en: 'International', es: 'Internacional' },
};
