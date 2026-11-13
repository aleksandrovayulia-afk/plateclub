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
const GEN_MAIN = { chicken: 'chicken', turkey: 'chicken', beef: 'meat', pork: 'roastpork', lamb: 'kebab', mince: 'meatballs', meat: 'meat', sausage: 'meat', bacon: 'eggs', salmon: 'fish', fish: 'fish', cod: 'fish', tuna: 'fish', trout: 'fish', shrimp: 'shrimp', egg: 'eggs', potato: 'potato', mushroom: 'veg', rice: 'rice', pasta: 'pasta', noodles: 'ramen', apple: 'fruit', banana: 'fruit', strawberry: 'fruit', mango: 'fruit' };
const GEN_TECH = { soup: 'soup', salad: 'salad', smoothie: 'shake', omelet: 'eggs', stew: 'stew', pan: 'veg', bake: 'veg' };
export function photoKey(r, title = '') {
  if (r.gen) { const [, tech, main] = r.id.split('~'); return tech === 'soup' || tech === 'salad' || tech === 'smoothie' || tech === 'omelet' ? GEN_TECH[tech] : GEN_MAIN[main] || GEN_TECH[tech]; }
  const t = `${title} ${r.id}`;
  for (const [re, k] of WORDS) if (re.test(t)) return k;
  return BY_EMOJI[r.e] || BY_CAT[r.c] || 'bowl';
}
// сколько фото лежит для вида блюда: key.jpg, key-2.jpg, key-3.jpg
const VARIANTS = {"sandwich": 9, "mushroomsoup": 4, "pasta": 14, "icecream": 5, "frenchtoast": 3, "milkshake": 3, "lasagna": 6, "kebab": 9, "quesadilla": 3, "icedtea": 1, "granolabar": 3, "fish": 17, "muffin": 4, "hummus": 4, "friedrice": 10, "roastpork": 4, "meatballs": 8, "porridge": 7, "sushi": 4, "smoothiebowl": 2, "carrotcake": 5, "risotto": 4, "sundae": 3, "shrimp": 15, "cheesecake": 7, "shakshuka": 3, "chicken": 17, "stew": 17, "bruschetta": 1, "grilledveg": 3, "cake": 17, "brownie": 4, "rice": 2, "toast": 3, "burger": 7, "shake": 5, "cookies": 13, "pizza": 6, "lemonade": 3, "salad": 11, "donut": 7, "syrniki": 1, "pie": 17, "tiramisu": 3, "curry": 17, "borscht": 5, "falafel": 5, "greek": 3, "ramen": 15, "bowl": 3, "potato": 17, "coffee": 3, "stirnoodles": 3, "veg": 17, "caesar": 3, "pancakes": 12, "eggs": 11, "soup": 16, "meat": 17, "waffles": 5, "parfait": 3, "chococake": 8, "bakedfish": 2, "choco": 1, "applepie": 9, "pannacotta": 17, "bread": 17, "pumpkinsoup": 5, "dumplings": 11, "croissant": 3, "fruit": 11, "sweet": 17, "burrito": 7, "tacos": 7};
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
