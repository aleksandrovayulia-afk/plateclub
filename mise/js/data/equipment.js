// Кухонные предметы. Всегда предполагаются: нож, доска, миска, ложка, холодильник с морозилкой.
export const EQUIP = {
  stove: { e: '🔥', n: { ru: 'Плита', en: 'Stovetop', es: 'Placa o fogones' } },
  oven: { e: '♨️', n: { ru: 'Духовка', en: 'Oven', es: 'Horno' } },
  microwave: { e: '📟', n: { ru: 'Микроволновка', en: 'Microwave', es: 'Microondas' } },
  pan: { e: '🍳', n: { ru: 'Сковорода', en: 'Frying pan', es: 'Sartén' } },
  pot: { e: '🥘', n: { ru: 'Кастрюля', en: 'Pot', es: 'Cazuela u olla' } },
  bakeform: { e: '🥧', n: { ru: 'Форма или противень', en: 'Baking dish or tray', es: 'Molde o bandeja de horno' } },
  blender: { e: '🌀', n: { ru: 'Блендер', en: 'Blender', es: 'Batidora de vaso o licuadora' } },
  mixer: { e: '🪄', n: { ru: 'Миксер', en: 'Hand or stand mixer', es: 'Batidora de varillas' } },
  whisk: { e: '🥄', n: { ru: 'Венчик', en: 'Whisk', es: 'Varillas manuales' } },
  grater: { e: '🧀', n: { ru: 'Тёрка', en: 'Grater', es: 'Rallador' } },
  rolling: { e: '🪵', n: { ru: 'Скалка', en: 'Rolling pin', es: 'Rodillo' } },
  sieve: { e: '🥣', n: { ru: 'Сито или дуршлаг', en: 'Sieve or colander', es: 'Colador o tamiz' } },
  airfryer: { e: '💨', n: { ru: 'Аэрогриль', en: 'Air fryer', es: 'Freidora de aire' } },
  shaker: { e: '🍼', n: { ru: 'Шейкер или бутылка с крышкой', en: 'Shaker or bottle with a lid', es: 'Coctelera o botella con tapa' } },
};

export const PRESETS = {
  none: { eq: [] },
  basic: { eq: ['stove', 'pan', 'pot', 'whisk', 'grater', 'sieve', 'shaker'] },
  full: { eq: Object.keys(EQUIP) },
};
