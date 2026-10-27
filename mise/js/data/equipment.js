// Кухонные предметы. Всегда предполагаются: нож, доска, миска, ложка, холодильник с морозилкой.
export const EQUIP = {
  stove: { n: 'Плита', e: '🔥' },
  oven: { n: 'Духовка', e: '♨️' },
  microwave: { n: 'Микроволновка', e: '📟' },
  pan: { n: 'Сковорода', e: '🍳' },
  pot: { n: 'Кастрюля', e: '🥘' },
  bakeform: { n: 'Форма или противень', e: '🥧' },
  blender: { n: 'Блендер', e: '🌀' },
  mixer: { n: 'Миксер', e: '🪄' },
  whisk: { n: 'Венчик', e: '🥄' },
  grater: { n: 'Тёрка', e: '🧀' },
  rolling: { n: 'Скалка', e: '🪵' },
  sieve: { n: 'Сито или дуршлаг', e: '🥣' },
  airfryer: { n: 'Аэрогриль', e: '💨' },
  shaker: { n: 'Шейкер или бутылка с крышкой', e: '🍼' },
};

export const PRESETS = {
  none: { n: 'Ничего нет', eq: [] },
  basic: { n: 'Базовая кухня', eq: ['stove', 'pan', 'pot', 'whisk', 'grater', 'sieve', 'shaker'] },
  full: { n: 'Всё есть', eq: Object.keys(EQUIP) },
};

export const BASIC_NOTE = 'Нож, доска, миска, ложка и холодильник считаются всегда.';
