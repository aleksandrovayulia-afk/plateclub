// Подбор фотографии к рецепту: по ключевым словам названия, затем по эмодзи и категории.
// Фото лежат в img/food/<ключ>.jpg (в облачной сборке подставляются через window.__PHOTOS).
const BY_EMOJI = {
  '🥗': 'salad', '🥬': 'salad', '🥒': 'salad', '🥣': 'porridge', '🌾': 'porridge', '🍰': 'cake', '🎂': 'cake', '🧁': 'muffin', '🥤': 'shake', '🍹': 'shake', '🥛': 'shake', '🧊': 'icecream', '🍨': 'icecream', '🍧': 'icecream',
  '🥞': 'pancakes', '🧀': 'pancakes', '🍞': 'bread', '🥐': 'bread', '🫓': 'bread', '🍝': 'pasta', '🍗': 'chicken', '🦃': 'chicken', '🥟': 'dumplings', '🍫': 'choco', '🟤': 'sweet', '🟣': 'sweet', '🍮': 'sweet', '🍬': 'sweet', '🍯': 'sweet',
  '🍳': 'eggs', '🥚': 'eggs', '🥧': 'pie', '🍚': 'rice', '🥪': 'sandwich', '🥩': 'meat', '🧆': 'meat', '🐑': 'meat', '🍢': 'meat', '🍪': 'cookies', '🥔': 'potato', '🍠': 'potato', '☕': 'coffee', '🫖': 'coffee',
  '🐟': 'fish', '🦐': 'fish', '🦑': 'fish', '🫑': 'veg', '🥦': 'veg', '🌿': 'veg', '🥕': 'veg', '🍄': 'veg', '🍅': 'veg', '🍆': 'veg', '🌽': 'veg', '🍜': 'ramen', '🍕': 'pizza', '💪': 'bowl', '🌱': 'bowl', '🥑': 'bowl',
  '🌯': 'tacos', '🌮': 'tacos', '🍛': 'curry', '🫘': 'curry', '🍲': 'curry', '🥘': 'curry', '🍔': 'burger', '🎃': 'soup', '🍓': 'fruit', '🍑': 'fruit', '🍎': 'fruit', '🍌': 'fruit', '🫐': 'fruit', '🍐': 'fruit', '🥭': 'fruit', '🍊': 'fruit', '🍒': 'fruit', '🍍': 'fruit', '🍇': 'fruit', '🍋': 'fruit',
};
const BY_CAT = { cakes: 'cake', sweet: 'sweet', savory: 'bowl', sport: 'bowl', shakes: 'shake', other: 'bowl' };
const WORDS = [
  [/суп|борщ|щи\b|солянк|уха\b|рассольник|бульон|soup|broth|chowder|gazpacho|sopa|caldo|crema de|puré de verduras/i, 'soup'],
  [/тирамису|tiramis|панна|panna|мусс|mousse|пудинг|pudding|flan|крем-брюле|brûlée|желе|jelly|halva|халв/i, 'sweet'],
  [/торт|cake|tarta|pastel/i, 'cake'], [/чизкейк|cheesecake|tarta de queso/i, 'cake'], [/мороженое|ice cream|helado|сорбет|sorbet/i, 'icecream'],
  [/пицц|pizza/i, 'pizza'], [/бургер|burger|hamburguesa/i, 'burger'], [/плов|ризотто|risotto|pilaf|paella|arroz|рис\b/i, 'rice'], [/пельмен|вареник|манты|dumpling|gyoza|empanad|ravioli/i, 'dumplings'],
  [/омлет|яичниц|омелет|omelet|omelette|scrambled|tortilla de patatas|huevos/i, 'eggs'], [/смузи|коктейль|милкшейк|smoothie|shake|batido/i, 'shake'], [/^\s*(кофе|латте|капучино|coffee|latte|cappuccino|café|чай|tea|té)/i, 'coffee'],
  [/блин|оладь|сырник|панкейк|pancake|crepe|crêpe|panqueque|crepe/i, 'pancakes'], [/печенье|cookie|galleta|brownie|брауни/i, 'cookies'], [/кекс|маффин|капкейк|muffin|cupcake|magdalena/i, 'muffin'],
  [/пирог|пирожки|тарт|pie\b|quiche|киш|empanada|tart\b/i, 'pie'], [/паста|спагетти|лапша|макарон|pasta|spaghetti|noodle|fideos|lasagn|лазань/i, 'pasta'], [/тако|буррито|taco|burrito|fajita|quesadilla|кесадилья/i, 'tacos'],
  [/карри|curry|чили|chili|гуляш|рагу|stew|estofado/i, 'curry'], [/стейк|котлет|отбивн|steak|cutlet|meatball|фрикадельк|albóndiga/i, 'meat'], [/лосос|рыба|рыбн|salmon|fish|pescado|тунец|tuna|креветк|shrimp|gambas/i, 'fish'],
];
export function photoKey(r, title = '') {
  const t = `${title} ${r.id}`;
  for (const [re, k] of WORDS) if (re.test(t)) return k;
  return BY_EMOJI[r.e] || BY_CAT[r.c] || 'bowl';
}
export const photoUrl = (key) => (typeof window !== 'undefined' && window.__PHOTOS && window.__PHOTOS[key]) || `img/food/${key}.jpg`;
// небольшой сдвиг кадра, чтобы одинаковые фото на соседних карточках выглядели по-разному
export const photoPos = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return `${30 + (Math.abs(h) % 41)}% ${30 + (Math.abs(h >> 7) % 41)}%`; };
