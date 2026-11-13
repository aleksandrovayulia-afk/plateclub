// Музыкальные подборки для кухни. Каждая подборка задаёт стиль, темп и набор гармонических последовательностей,
// из которых строятся треки. Музыка создаётся на устройстве (js/music.js): это не записи, и лицензий здесь нет.

const Q = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], sus: [0, 5, 7], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14] };
const P = {
  iiVI: [[2, 'm7'], [7, 'dom7'], [0, 'maj7'], [9, 'm7']],
  I_vi_IV_V: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']],
  I_V_vi_IV: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']],
  vi_IV_I_V: [[9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj']],
  maj7s: [[0, 'maj7'], [5, 'maj7'], [4, 'm7'], [9, 'm7']],
  minor: [[0, 'min'], [10, 'maj'], [8, 'maj'], [10, 'maj']],
  lazy: [[0, 'add9'], [9, 'm9'], [5, 'maj7'], [7, 'sus']],
  ballad: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, 'dom7']],
};

// id, стиль, темп, ключи (MIDI-ноты тоники, октава 3), прогрессии, тембр (частота фильтра), цвета обложки, названия треков по языкам
const DEFS = [
  { id: 'relaxed', style: 'pads', bpm: 56, keys: [48, 50, 53, 45], progs: ['lazy', 'maj7s', 'ballad', 'lazy'], cut: 2200, colors: ['#bfd8c4', '#f2ead9'],
    names: { ru: ['Тихий пар', 'Мягкий свет', 'Не спеша', 'Тёплая кухня'], en: ['Soft Steam', 'Gentle Light', 'Take Your Time', 'Warm Kitchen'], es: ['Vapor suave', 'Luz tenue', 'Sin prisa', 'Cocina cálida'] } },
  { id: 'morning', style: 'folk', bpm: 92, keys: [48, 53, 55, 50], progs: ['I_V_vi_IV', 'I_vi_IV_V', 'I_V_vi_IV', 'I_vi_IV_V'], cut: 3200, colors: ['#ffe29a', '#ffc3a0'],
    names: { ru: ['Первый кофе', 'Тосты и солнце', 'Утренняя роса', 'Свежие булочки'], en: ['First Coffee', 'Toast & Sunshine', 'Morning Dew', 'Fresh Rolls'], es: ['Primer café', 'Tostadas y sol', 'Rocío de la mañana', 'Bollos recién hechos'] } },
  { id: 'italian', style: 'strum', bpm: 104, keys: [50, 55, 48, 53], progs: ['I_vi_IV_V', 'vi_IV_I_V', 'I_V_vi_IV', 'I_vi_IV_V'], cut: 3600, colors: ['#e8795a', '#b9c98a'],
    names: { ru: ['Базилик и томаты', 'Сицилийский дворик', 'Воскресная паста', 'Оливковая роща'], en: ['Basil & Tomatoes', 'Sicilian Courtyard', 'Sunday Pasta', 'Olive Grove'], es: ['Albahaca y tomates', 'Patio siciliano', 'Pasta de domingo', 'Olivar'] } },
  { id: 'jazz', style: 'jazz', bpm: 76, keys: [48, 53, 50, 55], progs: ['iiVI', 'ballad', 'iiVI', 'maj7s'], cut: 2600, colors: ['#35416b', '#e0a458'],
    names: { ru: ['Сковорода в ритме', 'Синяя нота', 'Ночной бульон', 'Свинг на кухне'], en: ['Skillet Swing', 'Blue Note', 'Midnight Broth', 'Kitchen Swing'], es: ['Sartén al ritmo', 'Nota azul', 'Caldo de medianoche', 'Swing en la cocina'] } },
  { id: 'bossa', style: 'bossa', bpm: 98, keys: [45, 50, 48, 53], progs: ['iiVI', 'ballad', 'maj7s', 'iiVI'], cut: 2800, colors: ['#f2c14e', '#7fb7a4'],
    names: { ru: ['Тёплый бриз', 'Кофе на балконе', 'Лёгкий шаг', 'Закат у плиты'], en: ['Warm Breeze', 'Coffee on the Balcony', 'Easy Step', 'Sunset at the Stove'], es: ['Brisa cálida', 'Café en el balcón', 'Paso ligero', 'Atardecer junto a la cocina'] } },
  { id: 'lofi', style: 'lofi', bpm: 72, keys: [48, 45, 50, 53], progs: ['ballad', 'lazy', 'maj7s', 'ballad'], cut: 1500, colors: ['#8e7cc3', '#f4a6c0'],
    names: { ru: ['Дождь за окном', 'Пар над кастрюлей', 'Старая кассета', 'Поздний ужин'], en: ['Rain on the Window', 'Steam Over the Pot', 'Old Cassette', 'Late Supper'], es: ['Lluvia en la ventana', 'Vapor sobre la olla', 'Cinta antigua', 'Cena tardía'] } },
  { id: 'happy', style: 'bright', bpm: 112, keys: [48, 50, 53, 55], progs: ['I_V_vi_IV', 'I_vi_IV_V', 'I_V_vi_IV', 'vi_IV_I_V'], cut: 4200, colors: ['#ff8a65', '#ffd54f'],
    names: { ru: ['Танец ложек', 'Солнечный стол', 'Хрустящая корочка', 'Всё удалось'], en: ['Dance of the Spoons', 'Sunny Table', 'Golden Crust', 'Nailed It'], es: ['Baile de cucharas', 'Mesa soleada', 'Corteza dorada', 'Todo ha salido bien'] } },
  { id: 'dinner', style: 'ballad', bpm: 66, keys: [46, 48, 51, 45], progs: ['ballad', 'maj7s', 'ballad', 'iiVI'], cut: 2300, colors: ['#7a2e3b', '#e6b872'],
    names: { ru: ['Свечи и скатерть', 'Тёплый вечер', 'Бокал вина', 'Тихий ужин'], en: ['Candles & Linen', 'Warm Evening', 'A Glass of Wine', 'Quiet Dinner'], es: ['Velas y mantel', 'Tarde cálida', 'Una copa de vino', 'Cena tranquila'] } },
  { id: 'focus', style: 'pulse', bpm: 60, keys: [48, 50, 45, 53], progs: ['lazy', 'minor', 'lazy', 'maj7s'], cut: 2000, colors: ['#4a7c8c', '#a8d0e6'],
    names: { ru: ['Ровный огонь', 'Точный нож', 'Тихий метроном', 'Сосредоточенно'], en: ['Steady Flame', 'Precise Knife', 'Quiet Metronome', 'In the Zone'], es: ['Fuego constante', 'Cuchillo preciso', 'Metrónomo tranquilo', 'En la zona'] } },
  { id: 'weekend', style: 'folk', bpm: 80, keys: [45, 48, 50, 53], progs: ['I_vi_IV_V', 'lazy', 'I_V_vi_IV', 'maj7s'], cut: 2800, colors: ['#8fb996', '#e9d8a6'],
    names: { ru: ['Долгое томление', 'Субботний бульон', 'Не торопясь', 'Пирог в духовке'], en: ['Slow Simmer', 'Saturday Broth', 'No Rush', 'Pie in the Oven'], es: ['Cocción lenta', 'Caldo del sábado', 'Sin prisas', 'Tarta en el horno'] } },
];

const chordsOf = (key, name) => P[name].map(([off, q]) => ({ root: key + off - (off > 6 ? 12 : 0), notes: Q[q].map((x) => key + 12 + off + x - (off > 6 ? 12 : 0)), q }));

export const COLLECTIONS = DEFS.map((d) => ({ id: d.id, style: d.style, colors: d.colors }));
export const TRACKS = DEFS.flatMap((d) => d.keys.map((key, i) => ({
  id: `${d.id}-${i + 1}`, coll: d.id, n: i, style: d.style, bpm: d.bpm + (i % 2 ? 4 : 0) - (i === 3 ? 2 : 0), key, prog: chordsOf(key, d.progs[i]), cut: d.cut,
  bars: 48 + i * 8, seed: (d.id.charCodeAt(0) * 131 + i * 977) >>> 0,
  title: { ru: d.names.ru[i], en: d.names.en[i], es: d.names.es[i] },
})));
export const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]));
export const tracksOf = (coll) => TRACKS.filter((t) => t.coll === coll);
