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
  [/боул|bowl|\bbol\b|протеинов|protein plate|plato proteico/i, 'bowl'], [/ролл\b|wrap\b/i, 'tacos'], [/запеканк|\bbake\b|gratinad/i, 'veg'], [/слойк|puff pastry|hojaldre/i, 'pie'], [/крамбл|crumble/i, 'pie'],
  [/шашлыч|skewer|brocheta/i, 'meat'], [/патти|patties|tortitas de (carne|pollo|pavo)|котлет/i, 'meat'], [/начинк|stuffed|con relleno/i, 'veg'], [/противн|sheet-pan|bandeja de/i, 'veg'], [/лимонад|lemonade|limonada/i, 'shake'], [/каша из|porridge|gachas/i, 'porridge'], [/оладь|fritter|buñuelo/i, 'pancakes'], [/десерт в стакане|dessert cups|vasitos/i, 'sweet'],
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
// сколько фото лежит для вида блюда: key.jpg, key-2.jpg, key-3.jpg
const VARIANTS = {"bowl": 3, "bread": 3, "burger": 3, "cake": 3, "chicken": 3, "coffee": 3, "cookies": 3, "curry": 3, "dumplings": 2, "eggs": 3, "fish": 3, "icecream": 2, "meat": 3, "muffin": 3, "pancakes": 3, "pasta": 3, "pie": 3, "pizza": 3, "porridge": 3, "potato": 3, "rice": 2, "salad": 3, "sandwich": 3, "shake": 3, "soup": 2, "sweet": 3, "veg": 3};
export const photoUrl = (key, v = 1) => {
  const name = v > 1 ? `${key}-${v}` : key;
  return (typeof window !== 'undefined' && window.__PHOTOS && window.__PHOTOS[name]) || `img/food/${name}.jpg`;
};
const hashOf = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
/** Адрес фото для рецепта: вид блюда + вариант, выбранный по рецепту, чтобы соседние карточки не повторялись */
export const photoSrc = (r, title = '') => { const key = photoKey(r, title); return photoUrl(key, 1 + (hashOf(r.id) % (VARIANTS[key] || 1))); };
// небольшой сдвиг кадра, чтобы одинаковые фото на соседних карточках выглядели по-разному
export const photoPos = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return `${30 + (Math.abs(h) % 41)}% ${30 + (Math.abs(h >> 7) % 41)}%`; };

// Фото для подборок и категорий на главной
export const COLLECTION_PHOTO = { quick15: 'eggs', quick30: 'sandwich', nooven: 'icecream', noequip: 'salad', breakfast: 'porridge', soups: 'soup', salads: 'salad', party: 'cake', vegetarian: 'veg', vegan: 'bowl', sport: 'chicken', nobake: 'sweet', pasta: 'pasta', bakery: 'bread', glutenfree: 'rice', drinks: 'shake' };
export const CATEGORY_PHOTO = { cakes: 'cake', sweet: 'pancakes', savory: 'meat', shakes: 'shake', sport: 'bowl', other: 'bread' };
export const photoTag = (key, id = key) => `<img class="ph" src="${photoUrl(key, 1 + (hashOf(id) % (VARIANTS[key] || 1)))}" style="object-position:${photoPos(id)}" alt="" loading="lazy" decoding="async" draggable="false">`;
