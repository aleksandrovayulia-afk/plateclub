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
  [/cx-shakshuka|шакшук|shakshuka/i, 'shakshuka'], [/cx-noodlewok/i, 'stirnoodles'], [/cx-bakedfish/i, 'bakedfish'], [/cx-stuffedpotato/i, 'potato'], [/cx-bruschetta|брускетт|bruschetta/i, 'bruschetta'], [/cx-spread/i, 'hummus'], [/cx-syrniki|сырник/i, 'syrniki'], [/cx-oatcookie/i, 'cookies'], [/cx-icedtea/i, 'icedtea'], [/cx-bar-/i, 'granolabar'],
  [/сэндвич|бутерброд|sandwich|bocadillo/i, 'sandwich'], [/гратен|gratin|gratén/i, 'potato'], [/маффин|muffin|magdalena/i, 'muffin'], [/\bтарт\b|\btart\b|tarta de (fresa|manzana|pera)/i, 'pie'],
  [/ризотто|risotto/i, 'risotto'], [/лазань|lasagn/i, 'lasagna'], [/фрикадельк|тефтел|meatball|albóndiga|albondiga/i, 'meatballs'], [/жарен\S* рис|fried rice|arroz frito/i, 'friedrice'],
  [/борщ|borsch/i, 'borscht'], [/тыкв\S* суп|суп\S* из тыкв|крем-суп из тыкв|pumpkin soup|crema de calabaza/i, 'pumpkinsoup'], [/грибн\S* суп|суп\S* из шампиньон|mushroom soup|crema de champi/i, 'mushroomsoup'],
  [/рагу|\bstew\b|guiso|тушен/i, 'stew'], [/цезарь|caesar|césar/i, 'caesar'], [/греческ\S* салат|greek salad|ensalada griega/i, 'greek'], [/круассан|croissant/i, 'croissant'], [/вафл|waffle|gofre/i, 'waffles'],
  [/французск\S* тост|french toast|torrija/i, 'frenchtoast'], [/тост\b|тосты|toast\b|tostada/i, 'toast'], [/чизкейк|cheesecake|tarta de queso/i, 'cheesecake'], [/брауни|brownie/i, 'brownie'], [/пончик|donut|doughnut|rosquilla/i, 'donut'],
  [/тирамису|tiramis/i, 'tiramisu'], [/панна кот|panna cotta/i, 'pannacotta'], [/яблочн\S* пирог|шарлотк|apple pie|charlotte|tarta de manzana/i, 'applepie'], [/морковн\S* торт|carrot cake|tarta de zanahoria/i, 'carrotcake'],
  [/шоколадн\S* торт|chocolate cake|tarta de chocolate/i, 'chococake'], [/милкшейк|milkshake|batido de leche/i, 'milkshake'], [/лимонад|lemonade|limonada/i, 'lemonade'], [/хумус|hummus/i, 'hummus'], [/фалафел|falafel/i, 'falafel'],
  [/кесадиль|quesadilla/i, 'quesadilla'], [/буррито|burrito|\bролл\b|\bwrap\b/i, 'burrito'], [/шашлы|kebab|skewer|brocheta/i, 'kebab'], [/суши|роллы|sushi/i, 'sushi'], [/креветк|shrimp|prawn|gambas/i, 'shrimp'],
  [/^\s*(свинин|pork|cerdo)/i, 'roastpork'], [/на одном противне|sheet-pan|bandeja de|овощи на гриле|grilled veg/i, 'grilledveg'], [/десерт в стакане|dessert cups|vasitos|парфе|parfait/i, 'parfait'], [/смузи-боул|smoothie bowl/i, 'smoothiebowl'],
  [/боул|bowl|\bbol\b|протеинов|protein plate|plato proteico/i, 'bowl'], [/ролл\b|wrap\b/i, 'tacos'], [/запеканк|\bbake\b|gratinad/i, 'veg'], [/слойк|puff pastry|hojaldre/i, 'pie'], [/крамбл|crumble/i, 'pie'],
  [/патти|patties|tortitas de (carne|pollo|pavo)|котлет/i, 'meat'], [/начинк|stuffed|con relleno/i, 'veg'], [/каша из|porridge|gachas/i, 'porridge'], [/оладь|fritter|buñuelo/i, 'pancakes'], 
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
const VARIANTS = {"applepie": 3, "borscht": 3, "bowl": 3, "bread": 3, "brownie": 3, "burger": 3, "burrito": 3, "caesar": 3, "cake": 3, "carrotcake": 3, "cheesecake": 3, "chicken": 3, "chococake": 3, "coffee": 3, "cookies": 3, "croissant": 3, "curry": 3, "donut": 3, "dumplings": 2, "eggs": 3, "falafel": 3, "fish": 3, "frenchtoast": 3, "friedrice": 3, "greek": 3, "grilledveg": 3, "hummus": 2, "icecream": 2, "kebab": 3, "lasagna": 3, "lemonade": 3, "meat": 3, "meatballs": 2, "milkshake": 3, "muffin": 3, "mushroomsoup": 3, "pancakes": 3, "pannacotta": 3, "parfait": 3, "pasta": 3, "pie": 3, "pizza": 3, "porridge": 3, "potato": 3, "pumpkinsoup": 3, "quesadilla": 3, "rice": 2, "risotto": 3, "roastpork": 3, "salad": 3, "sandwich": 3, "shake": 3, "shrimp": 3, "smoothiebowl": 2, "soup": 2, "stew": 3, "sundae": 3, "sushi": 3, "sweet": 3, "tiramisu": 3, "toast": 3, "veg": 3, "waffles": 3, "shakshuka": 3, "bruschetta": 1, "bakedfish": 2, "stirnoodles": 3, "syrniki": 1, "icedtea": 1, "granolabar": 3};
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
