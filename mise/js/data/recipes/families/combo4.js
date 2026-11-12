// Перекрёстные семейства, часть 4: завтраки, закуски, ещё блюда и десерты.
import { PROT, VEG_SOUP, VEG_SALAD, FRUIT, FRUIT_BAKE, SWEET_VEG, isFish } from './pools.js';

const sweetFish = (p, v) => !(isFish(p) && SWEET_VEG.includes(v));
const FILL = ['potato', 'carrot', 'tomato', 'bellpepper', 'cabbage', 'cauliflower', 'broccoli', 'zucchini', 'eggplant', 'mushroom', 'pumpkin', 'spinach', 'greenbeans', 'asparagus', 'corn', 'peas'];
const FRUIT20 = [...FRUIT, 'lemon', 'coconut', 'dates', 'cranberry'];
const T = (ru, en, es) => ({ ru, en, es });

export default [
  {
    id: 'cx-toast', c: 'other', f: 'salty', cu: 'int', lv: 1, srv: 2, min: 10, eq: [], tg: ['breakfast', 'snack', 'quick', 'noequip'], e: '🍞',
    cross: { pools: [['avocado', 'tvorog', 'creamcheese', 'cheese', 'mozzarella', 'peanutbutter', 'egg', 'sourcream'], ['tomato', 'cucumber', 'radish', 'greens', 'olives', 'banana', 'strawberry', 'honey', 'jam', 'seeds']], ok: (a, b) => a !== b && !(['peanutbutter', 'sourcream', 'egg', 'cheese', 'mozzarella'].includes(a) && ['honey', 'jam', 'banana', 'strawberry'].includes(b) && a !== 'peanutbutter') },
    t: T('Тост на завтрак: {0:n} и {1:n}', 'Breakfast toast: {0} and {1}', 'Tostada de desayuno: {0} y {1}'),
    d: T('Быстрый тост на завтрак: на хлебе {0:n} и {1:n}.', 'A quick breakfast toast with {0} and {1} on bread.', 'Una tostada rápida para desayunar con {0} y {1} sobre pan.'),
    i: ['bread|4 slice', '{0}|100 g', '{1}|80 g', 'salt|~pinch'],
    s: {
      ru: ['Подсушите хлеб в тостере или на сухой сковороде по 2 минуты с каждой стороны.', 'Нарежьте или разомните {0:a} и намажьте на тост.', 'Сверху выложите {1:a}.', 'Добавьте щепотку соли и сразу подавайте.'],
      en: ['Toast the bread in a toaster or in a dry pan for 2 minutes on each side.', 'Slice or mash the {0} and spread it on the toast.', 'Top with the {1}.', 'Add a pinch of salt and serve right away.'],
      es: ['Tuesta el pan en la tostadora o en una sartén seca 2 minutos por cada lado.', 'Corta o machaca {0:d} y úntalo sobre la tostada.', 'Pon encima {1:d}.', 'Añade una pizca de sal y sirve enseguida.'],
    },
    k: { ru: ['Хлеб лучше брать вчерашний: он не размокает.', 'Добавьте зелень или специи по вкусу.'], en: ['Day-old bread works best because it doesn\'t go soggy.', 'Add herbs or spices to taste.'], es: ['El pan del día anterior va mejor porque no se ablanda.', 'Añade hierbas o especias al gusto.'] },
  },
  {
    id: 'cx-friedrice', c: 'savory', f: 'salty', cu: 'cn', lv: 1, srv: 3, min: 25, eq: ['pan'], tg: ['dinner', 'quick'], e: '🍚',
    cross: { pools: [PROT.filter((x) => x !== 'sausage'), FILL], ok: sweetFish },
    t: T('Жареный рис {0:w} и {1:i}', 'Fried rice with {0} and {1}', 'Arroz frito con {0} y {1}'),
    d: T('Рассыпчатый жареный рис {0:w} и {1:i}. Идеально, если остался вчерашний рис.', 'Fluffy fried rice with {0} and {1}. Perfect for leftover rice.', 'Arroz frito suelto con {0} y {1}. Ideal para aprovechar arroz del día anterior.'),
    i: ['rice|200 g', '{0}|200 g', '{1}|150 g', 'egg|2 pc', 'garlic|2 clove', 'soy|2 tbsp', 'oil|2 tbsp', 'greenonion?|~handful'],
    s: {
      ru: ['Отварите рис заранее и остудите. Нарежьте {0:a} и {1:a} мелкими кусочками.', 'Разогрейте масло в сковороде на сильном огне, обжарьте {0:a} 5 минут.', 'Добавьте {1:a} и чеснок и жарьте ещё 4 минуты.', 'Сдвиньте всё в сторону, вбейте яйца и перемешайте до готовности.', 'Всыпьте рис, влейте соевый соус и жарьте 3 минуты, всё время помешивая.'],
      en: ['Cook the rice ahead and let it cool. Cut the {0} and {1} into small pieces.', 'Heat the oil in a pan over high heat and fry the {0} for 5 minutes.', 'Add the {1} and garlic and fry for 4 more minutes.', 'Push everything aside, crack in the eggs and scramble until set.', 'Add the rice and soy sauce and stir-fry for 3 minutes.'],
      es: ['Cuece el arroz de antemano y deja que se enfríe. Corta {0:d} y {1:d} en trozos pequeños.', 'Calienta el aceite en una sartén a fuego fuerte y saltea {0:d} 5 minutos.', 'Añade {1:d} y el ajo y saltea 4 minutos más.', 'Aparta todo a un lado, casca los huevos y revuélvelos hasta que cuajen.', 'Añade el arroz y la salsa de soja y saltea 3 minutos.'],
    },
    k: { ru: ['Свежесваренный рис слипнется: дайте ему остыть.', 'Сковорода должна быть очень горячей.'], en: ['Freshly cooked rice clumps, so let it cool first.', 'The pan must be very hot.'], es: ['El arroz recién hecho se apelmaza: déjalo enfriar.', 'La sartén debe estar muy caliente.'] },
  },
  {
    id: 'cx-risotto', c: 'savory', f: 'salty', cu: 'it', lv: 2, srv: 3, min: 45, eq: ['pan'], tg: ['dinner'], e: '🍚',
    cross: { pools: [['chicken', 'turkey', 'shrimp', 'salmon', 'tuna', 'bacon', 'ham'], ['mushroom', 'pumpkin', 'asparagus', 'peas', 'zucchini', 'spinach', 'broccoli', 'tomato', 'bellpepper', 'greenbeans'], ['parmesan', 'cheese', 'creamcheese']], ok: sweetFish },
    t: T('Ризотто {0:w} и {1:i}, сверху {2:n}', 'Risotto with {0} and {1}, topped with {2}', 'Risotto con {0} y {1}, con {2} por encima'),
    d: T('Кремовый ризотто {0:w} и {1:i}. В конце — {2:n}.', 'A creamy risotto with {0} and {1}, finished with {2}.', 'Un risotto cremoso con {0} y {1}, rematado con {2}.'),
    i: ['rice|200 g', '{0}|200 g', '{1}|200 g', '{2}|50 g', 'onion|1 pc', 'broth|700 ml', 'butter|2 tbsp', 'salt|~taste'],
    s: {
      ru: ['Нагрейте бульон и держите его горячим на соседней конфорке. Мелко нарежьте лук, {0:a} и {1:a}.', 'Растопите половину масла и обжарьте лук 3 минуты, добавьте {0:a} и {1:a} и жарьте 5 минут.', 'Всыпьте рис и перемешивайте 2 минуты, пока зёрна не станут прозрачными по краям.', 'Добавляйте бульон по половнику, помешивая, пока он не впитается. Так готовьте 18 минут.', 'Снимите с огня, добавьте оставшееся масло и {2:a}, накройте на 2 минуты и подавайте.'],
      en: ['Heat the broth and keep it hot on a nearby burner. Finely chop the onion, {0} and {1}.', 'Melt half the butter and cook the onion for 3 minutes, add the {0} and {1} and cook for 5 minutes.', 'Add the rice and stir for 2 minutes until the grains turn translucent at the edges.', 'Add the broth a ladle at a time, stirring until absorbed. Cook this way for 18 minutes.', 'Take off the heat, stir in the remaining butter and the {2}, cover for 2 minutes and serve.'],
      es: ['Calienta el caldo y mantenlo caliente en un fuego cercano. Pica fino la cebolla, {0:d} y {1:d}.', 'Derrite la mitad de la mantequilla y rehoga la cebolla 3 minutos, añade {0:d} y {1:d} y cocina 5 minutos.', 'Echa el arroz y remueve 2 minutos hasta que los granos queden translúcidos por los bordes.', 'Añade el caldo un cucharón cada vez, removiendo hasta que se absorba. Cocina así 18 minutos.', 'Retira del fuego, añade la mantequilla restante y {2:d}, tapa 2 minutos y sirve.'],
    },
    k: { ru: ['Не промывайте рис: крахмал даёт кремовость.', 'Готовый ризотто должен слегка «плыть» по тарелке.'], en: ['Don\'t rinse the rice: the starch makes it creamy.', 'Good risotto should flow gently across the plate.'], es: ['No laves el arroz: el almidón lo hace cremoso.', 'Un buen risotto debe fluir suavemente por el plato.'] },
  },
  {
    id: 'cx-meatball', c: 'savory', f: 'salty', cu: 'it', lv: 2, srv: 4, min: 50, eq: ['pan'], tg: ['dinner'], e: '🧆',
    cross: { pools: [['mince', 'chicken', 'turkey', 'fish', 'salmon'], ['carrot', 'zucchini', 'mushroom', 'spinach', 'broccoli', 'cauliflower', 'bellpepper', 'onion', 'cabbage', 'pumpkin'], ['tomato', 'cream', 'sourcream', 'cheese', 'yogurt']], ok: (p, v) => sweetFish(p, v) },
    t: T('Фрикадельки из {0:g} {1:w} в соусе из {2:g}', '{0} meatballs with {1} in {2:s} sauce', 'Albóndigas de {0} con {1} en salsa de {2}'),
    d: T('Нежные фрикадельки из {0:g} {1:w} в домашнем соусе из {2:g}.', 'Tender {0} meatballs with {1} in a homemade {2:s} sauce.', 'Albóndigas tiernas de {0} con {1} en una salsa casera de {2}.'),
    i: ['{0}|500 g', '{1}|150 g', '{2}|150 g', 'egg|1 pc', 'breadcrumbs|3 tbsp', 'onion|1 pc', 'oil|2 tbsp', 'salt|~taste'],
    s: {
      ru: ['Измельчите {0:a} и {1:a}, смешайте с яйцом, сухарями, мелко нарезанным луком и солью.', 'Слепите небольшие шарики и обжарьте на масле по 2 минуты со всех сторон.', 'Влейте стакан воды и добавьте {2:a}, доведите до кипения.', 'Накройте крышкой и тушите 20 минут на слабом огне.', 'Подавайте с макаронами, рисом или картофельным пюре.'],
      en: ['Chop the {0} and {1} and mix with the egg, breadcrumbs, finely chopped onion and salt.', 'Shape into small balls and brown in oil for 2 minutes on all sides.', 'Pour in a cup of water, add the {2} and bring to a boil.', 'Cover and simmer for 20 minutes on low heat.', 'Serve with pasta, rice or mashed potatoes.'],
      es: ['Pica {0:d} y {1:d} y mezcla con el huevo, el pan rallado, la cebolla picada fina y la sal.', 'Forma bolitas pequeñas y dóralas en aceite 2 minutos por todos los lados.', 'Vierte un vaso de agua, añade {2:d} y lleva a ebullición.', 'Tapa y cuece 20 minutos a fuego suave.', 'Sirve con pasta, arroz o puré de patatas.'],
    },
    k: { ru: ['Мокрыми руками шарики лепятся легче.', 'Соус можно загустить ложкой муки.'], en: ['Wet hands make shaping easier.', 'Thicken the sauce with a spoon of flour if you like.'], es: ['Con las manos mojadas es más fácil formar las bolas.', 'Puedes espesar la salsa con una cucharada de harina.'] },
  },
  {
    id: 'cx-veggiesalad', c: 'savory', f: 'salty', cu: 'gr', lv: 1, srv: 2, min: 15, eq: [], tg: ['lunch', 'dinner', 'vegetarian', 'noequip', 'quick'], e: '🥗',
    cross: { pools: [VEG_SALAD, VEG_SALAD, ['feta', 'parmesan', 'mozzarella', 'cheese', 'nuts', 'seeds']], ok: (a, b) => a < b },
    t: T('Салат: {0:n} и {1:n} {2:w}', 'Fresh salad of {0} and {1} with {2}', 'Ensalada fresca de {0} y {1} con {2}'),
    d: T('Хрустящий салат из {0:g} и {1:g}. Сытности добавляет {2:n}.', 'A crunchy salad of {0} and {1}, made more filling by {2}.', 'Una ensalada crujiente de {0} y {1}, más saciante con {2}.'),
    i: ['{0}|200 g', '{1}|200 g', '{2}|50 g', 'oliveoil|2 tbsp', 'lemon|1/2 pc', 'salt|~taste'],
    s: {
      ru: ['Вымойте и обсушите {0:a} и {1:a}. Нарежьте кусочками примерно одного размера.', 'Выложите в миску и добавьте {2:a}.', 'Смешайте оливковое масло с лимонным соком и солью.', 'Полейте салат заправкой, аккуратно перемешайте и сразу подавайте.'],
      en: ['Wash and dry the {0} and {1}. Cut into pieces of similar size.', 'Put them in a bowl and add the {2}.', 'Whisk the olive oil with the lemon juice and salt.', 'Pour the dressing over, toss gently and serve at once.'],
      es: ['Lava y seca {0:d} y {1:d}. Córtalos en trozos de tamaño parecido.', 'Ponlos en un bol y añade {2:d}.', 'Bate el aceite de oliva con el zumo de limón y la sal.', 'Aliña, mezcla con cuidado y sirve enseguida.'],
    },
    k: { ru: ['Сухие овощи лучше впитывают заправку.', 'Свежая зелень делает вкус ярче.'], en: ['Dry vegetables take dressing better.', 'Fresh herbs make the flavor brighter.'], es: ['Las verduras secas absorben mejor el aliño.', 'Las hierbas frescas hacen el sabor más vivo.'] },
  },
  {
    id: 'cx-creamsoup', c: 'savory', f: 'salty', cu: 'fr', lv: 1, srv: 4, min: 35, eq: ['pot', 'blender'], tg: ['soup', 'dinner', 'vegetarian'], e: '🍲',
    cross: { pools: [VEG_SOUP, VEG_SOUP, ['cream', 'coconutmilk', 'sourcream', 'yogurt', 'creamcheese']], ok: (a, b) => a < b && !(a === 'beet' && b === 'cabbage') },
    t: T('Крем-суп: {0:n} и {1:n} {2:w}', 'Creamy {0} and {1} soup with {2}', 'Crema de {0} y {1} con {2}'),
    d: T('Бархатный суп-пюре из {0:g} и {1:g}, смягчённый ингредиентом «{2:n}».', 'A velvety purée of {0} and {1}, softened with {2}.', 'Una crema aterciopelada de {0} y {1}, suavizada con {2}.'),
    i: ['{0}|300 g', '{1}|300 g', '{2}|100 ml', 'onion|1 pc', 'oil|2 tbsp', 'water|700 ml', 'salt|~taste'],
    s: {
      ru: ['Нарежьте лук, {0:a} и {1:a} небольшими кусочками.', 'Обжарьте лук в масле 3 минуты, добавьте остальные овощи и готовьте 5 минут.', 'Залейте горячей водой, посолите и варите под крышкой 20 минут.', 'Пробейте блендером до гладкости и добавьте {2:a}.', 'Прогрейте 2 минуты, не доводя до кипения, и подавайте.'],
      en: ['Chop the onion, {0} and {1} into small pieces.', 'Cook the onion in oil for 3 minutes, add the other vegetables and cook for 5 more.', 'Pour in hot water, add salt and simmer covered for 20 minutes.', 'Blend until smooth and stir in the {2}.', 'Heat for 2 minutes without boiling and serve.'],
      es: ['Corta la cebolla, {0:d} y {1:d} en trozos pequeños.', 'Rehoga la cebolla en aceite 3 minutos, añade las demás verduras y cocina 5 minutos más.', 'Cubre con agua caliente, sala y cuece tapado 20 minutos.', 'Tritura hasta que quede fino y añade {2:d}.', 'Calienta 2 minutos sin que hierva y sirve.'],
    },
    k: { ru: ['Если суп густой, добавьте горячей воды.', 'Подавайте с гренками.'], en: ['If it\'s too thick, add hot water.', 'Serve with croutons.'], es: ['Si queda espesa, añade agua caliente.', 'Sírvela con picatostes.'] },
  },
  {
    id: 'cx-gratin', c: 'savory', f: 'salty', cu: 'fr', lv: 2, srv: 4, min: 60, eq: ['oven', 'bakeform'], tg: ['dinner', 'vegetarian'], e: '🥔',
    cross: { pools: [['potato', 'cauliflower', 'broccoli', 'zucchini', 'pumpkin', 'sweetpotato', 'leek', 'celery', 'mushroom', 'spinach'], ['potato', 'cauliflower', 'broccoli', 'zucchini', 'pumpkin', 'sweetpotato', 'leek', 'celery', 'mushroom', 'spinach'], ['cheese', 'parmesan', 'mozzarella', 'feta', 'creamcheese']], ok: (a, b) => a < b },
    t: T('Гратен из {0:g} и {1:g} {2:w}', 'Gratin of {0} and {1} with {2}', 'Gratén de {0} y {1} con {2}'),
    d: T('Запечённый гратен из {0:g} и {1:g} в сливках, а сверху румяная корочка {2:w}.', 'A baked gratin of {0} and {1} in cream, with a golden crust of {2}.', 'Un gratén al horno de {0} y {1} con nata y una costra dorada de {2}.'),
    i: ['{0}|400 g', '{1}|400 g', '{2}|100 g', 'cream|200 ml', 'garlic|2 clove', 'butter|1 tbsp', 'salt|~taste', 'nutmeg?|~pinch'],
    s: {
      ru: ['Разогрейте духовку до 180 °C. Нарежьте {0:a} и {1:a} тонкими ломтиками и смажьте форму маслом.', 'Выложите овощи слоями, посыпая солью и чесноком.', 'Залейте сливками и накройте фольгой.', 'Запекайте 35 минут, затем снимите фольгу, посыпьте {2:i} и запекайте ещё 15 минут.', 'Дайте гратену постоять 10 минут и подавайте.'],
      en: ['Heat the oven to 180 °C. Slice the {0} and {1} thinly and grease a baking dish.', 'Layer the vegetables, seasoning each layer with salt and garlic.', 'Pour in the cream and cover with foil.', 'Bake for 35 minutes, then remove the foil, sprinkle with {2} and bake for 15 more minutes.', 'Let the gratin rest for 10 minutes and serve.'],
      es: ['Calienta el horno a 180 °C. Corta {0:d} y {1:d} en láminas finas y unta una fuente con mantequilla.', 'Pon las verduras en capas, salpimentando cada una con sal y ajo.', 'Vierte la nata y cubre con papel de aluminio.', 'Hornea 35 minutos, quita el papel, espolvorea con {2:d} y hornea 15 minutos más.', 'Deja reposar el gratén 10 minutos y sirve.'],
    },
    k: { ru: ['Ломтики должны быть одной толщины, тогда всё приготовится равномерно.', 'Остатки хорошо разогреваются на следующий день.'], en: ['Even slices cook evenly.', 'Leftovers reheat well the next day.'], es: ['Las láminas de grosor parejo se hacen por igual.', 'Las sobras se recalientan bien al día siguiente.'] },
  },
  {
    id: 'cx-parfait', c: 'sweet', f: 'sweet', cu: 'int', lv: 1, srv: 2, min: 10, eq: [], tg: ['breakfast', 'dessert', 'quick', 'noequip', 'vegetarian'], e: '🍨',
    cross: { pools: [FRUIT, FRUIT, ['honey', 'nuts', 'chocolate', 'coconut', 'seeds', 'oats', 'jam', 'cookies']], ok: (a, b) => a < b },
    t: T('Парфе из йогурта {0:w}, {1:i} и {2:i}', 'Yogurt parfait with {0}, {1} and {2}', 'Parfait de yogur con {0}, {1} y {2}'),
    d: T('Слоёное парфе из йогурта: {0:n}, {1:n} и хрустящий слой: {2:n}.', 'A layered yogurt parfait of {0} and {1} with a crunchy layer of {2}.', 'Un parfait de yogur en capas con {0} y {1} y una capa crujiente de {2}.'),
    i: ['yogurt|300 g', '{0}|120 g', '{1}|120 g', '{2}|40 g'],
    s: {
      ru: ['Нарежьте {0:a} и {1:a} небольшими кусочками.', 'Измельчите {2:a}, если он крупный.', 'В стаканы выложите слоями йогурт, фрукты и {2:a}.', 'Повторите слои и подавайте сразу или охладите 15 минут.'],
      en: ['Cut the {0} and {1} into small pieces.', 'Roughly chop the {2} if it is large.', 'Layer yogurt, fruit and {2} in glasses.', 'Repeat the layers and serve right away or chill for 15 minutes.'],
      es: ['Corta {0:d} y {1:d} en trozos pequeños.', 'Pica {2:d} si es grande.', 'Monta en vasos capas de yogur, fruta y {2:d}.', 'Repite las capas y sirve al momento o enfría 15 minutos.'],
    },
    k: { ru: ['Густой греческий йогурт держит слои лучше.', 'Мёд можно добавить сверху по вкусу.'], en: ['Thick Greek yogurt holds the layers better.', 'Drizzle honey on top if you like.'], es: ['El yogur griego espeso mantiene mejor las capas.', 'Puedes añadir miel por encima.'] },
  },
  {
    id: 'cx-tart', c: 'sweet', f: 'sweet', cu: 'fr', lv: 2, srv: 8, min: 70, eq: ['oven', 'bakeform'], tg: ['dessert', 'party', 'vegetarian'], e: '🥧',
    cross: { pools: [FRUIT_BAKE, FRUIT_BAKE, ['creamcheese', 'tvorog', 'sourcream', 'cream']], ok: (a, b) => a < b },
    t: T('Тарт {0:w} и {1:i}, крем — {2:n}', 'Tart with {0} and {1}, {2:s} filling', 'Tarta de {0} y {1} con relleno de {2}'),
    d: T('Песочный тарт: хрустящая основа, нежный крем из {2:g} и фрукты ({0:n}, {1:n}).', 'A shortcrust tart: crisp base, soft {2} filling and fruit ({0}, {1}).', 'Una tarta de masa quebrada: base crujiente, crema suave de {2} y fruta ({0}, {1}).'),
    i: ['flour|200 g', 'butter|100 g', 'sugar|80 g', 'egg|1 pc', '{2}|200 g', '{0}|150 g', '{1}|150 g'],
    s: {
      ru: ['Разотрите холодное масло с мукой и сахаром в крошку, добавьте яйцо и замесите тесто. Уберите в холодильник на 30 минут.', 'Разогрейте духовку до 180 °C. Раскатайте тесто и выложите в форму, наколите вилкой.', 'Выпекайте основу 15 минут и остудите.', 'Взбейте {2:a} до гладкого крема и намажьте на основу.', 'Выложите сверху нарезанные {0:a} и {1:a} и охладите 30 минут.'],
      en: ['Rub the cold butter with the flour and sugar into crumbs, add the egg and knead into a dough. Chill for 30 minutes.', 'Heat the oven to 180 °C. Roll out the dough, press into a tin and prick with a fork.', 'Bake the base for 15 minutes and let it cool.', 'Beat the {2} until smooth and spread over the base.', 'Arrange the sliced {0} and {1} on top and chill for 30 minutes.'],
      es: ['Une la mantequilla fría con la harina y el azúcar hasta hacer migas, añade el huevo y amasa. Refrigera 30 minutos.', 'Calienta el horno a 180 °C. Extiende la masa, colócala en el molde y pínchala con un tenedor.', 'Hornea la base 15 minutos y deja enfriar.', 'Bate {2:d} hasta que quede suave y extiéndelo sobre la base.', 'Coloca encima {0:d} y {1:d} en láminas y refrigera 30 minutos.'],
    },
    k: { ru: ['Холодное тесто не усядет при выпечке.', 'Фрукты можно покрыть тонким слоем джема для блеска.'], en: ['Chilled dough won\'t shrink while baking.', 'Brush the fruit with a thin layer of jam for shine.'], es: ['La masa fría no se encoge al hornear.', 'Pinta la fruta con una capa fina de mermelada para darle brillo.'] },
  },
  {
    id: 'cx-muffin', c: 'sweet', f: 'sweet', cu: 'us', lv: 1, srv: 6, min: 40, eq: ['oven', 'whisk'], tg: ['dessert', 'breakfast', 'vegetarian'], e: '🧁',
    cross: { pools: [FRUIT20, ['chocolate', 'nuts', 'cinnamon', 'oats', 'coconut', 'raisin', 'cocoa', 'honey']], ok: (f, a) => !(f === 'coconut' && a === 'coconut') },
    t: T('Маффины {0:w} и {1:i}', 'Muffins with {0} and {1}', 'Magdalenas de {0} con {1}'),
    d: T('Пышные домашние маффины: внутри {0:n}, а ещё {1:n}.', 'Fluffy homemade muffins with {0} and {1}.', 'Magdalenas esponjosas caseras con {0} y {1}.'),
    i: ['flour|200 g', 'sugar|100 g', 'egg|2 pc', 'milk|150 ml', 'oil|80 ml', 'bakingpowder|2 tsp', '{0}|120 g', '{1}|40 g'],
    s: {
      ru: ['Разогрейте духовку до 190 °C. Смешайте муку, сахар и разрыхлитель.', 'Взбейте яйца с молоком и маслом и влейте в сухую смесь, перемешав до однородности.', 'Нарежьте {0:a}, добавьте вместе {1:w} в тесто и аккуратно перемешайте.', 'Разложите тесто по формочкам на две трети.', 'Выпекайте 22 минуты до золотистого цвета.'],
      en: ['Heat the oven to 190 °C. Mix the flour, sugar and baking powder.', 'Whisk the eggs with the milk and oil and pour into the dry mix, stirring until just combined.', 'Chop the {0}, fold it in with the {1} and mix gently.', 'Fill the muffin cases two thirds full.', 'Bake for 22 minutes until golden.'],
      es: ['Calienta el horno a 190 °C. Mezcla la harina, el azúcar y la levadura.', 'Bate los huevos con la leche y el aceite y vierte sobre la mezcla seca, removiendo lo justo.', 'Corta {0:d}, añádelo junto con {1:d} y mezcla con cuidado.', 'Llena las cápsulas hasta dos tercios.', 'Hornea 22 minutos hasta que se doren.'],
    },
    k: { ru: ['Не перемешивайте тесто долго, иначе маффины будут плотными.', 'Остывшие маффины хранятся 2 дня в контейнере.'], en: ['Don\'t overmix or the muffins turn dense.', 'Cooled muffins keep for 2 days in a container.'], es: ['No mezcles de más o quedarán densas.', 'Una vez frías, se conservan 2 días en un recipiente.'] },
  },
  {
    id: 'cx-sandwich', c: 'savory', f: 'salty', cu: 'us', lv: 1, srv: 2, min: 15, eq: [], tg: ['lunch', 'snack', 'quick', 'noequip'], e: '🥪',
    cross: { pools: [['ham', 'bacon', 'chicken', 'turkey', 'tuna', 'salmon', 'cheese'], VEG_SALAD, ['mayo', 'mustard', 'creamcheese', 'sourcream', 'yogurt']], ok: (p, v) => !(isFish(p) && v === 'cabbage') },
    t: T('Сэндвич {0:w} и {1:i}, соус — {2:n}', 'Sandwich with {0} and {1} and {2}', 'Bocadillo de {0} y {1} con {2}'),
    d: T('Сытный сэндвич: {0:n}, {1:n} и соус ({2:n}).', 'A hearty sandwich of {0} and {1} with {2}.', 'Un bocadillo contundente de {0} y {1} con {2}.'),
    i: ['bread|4 slice', '{0}|120 g', '{1}|100 g', '{2}|2 tbsp'],
    s: {
      ru: ['Слегка подсушите хлеб на сухой сковороде или в тостере.', 'Смажьте ломтики {2:i}.', 'Выложите {0:a} и нарезанные {1:a}.', 'Накройте вторым ломтиком, слегка прижмите и разрежьте пополам.'],
      en: ['Lightly toast the bread in a dry pan or toaster.', 'Spread the slices with {2}.', 'Layer the {0} and the sliced {1}.', 'Top with the second slice, press lightly and cut in half.'],
      es: ['Tuesta ligeramente el pan en una sartén seca o en la tostadora.', 'Unta las rebanadas con {2:d}.', 'Coloca {0:d} y {1:d} cortado.', 'Tapa con la otra rebanada, presiona ligeramente y corta por la mitad.'],
    },
    k: { ru: ['Листья кладите ближе к хлебу, чтобы он не размок.', 'Заверните в бумагу, и сэндвич удобно взять с собой.'], en: ['Put leaves next to the bread to keep it from getting soggy.', 'Wrap in paper and it travels well.'], es: ['Pon las hojas junto al pan para que no se ablande.', 'Envuélvelo en papel y se lleva muy bien.'] },
  },
  {
    id: 'cx-pizza', c: 'savory', f: 'salty', cu: 'it', lv: 1, srv: 2, min: 25, eq: ['oven'], tg: ['dinner', 'quick'], e: '🍕',
    cross: { pools: [['ham', 'sausage', 'chicken', 'tuna', 'shrimp', 'bacon'], ['mushroom', 'tomato', 'bellpepper', 'corn', 'olives', 'zucchini', 'spinach', 'greens'], ['mozzarella', 'cheese']], ok: (p, v) => !(p === 'shrimp' && v === 'corn') },
    t: T('Пицца на лаваше {0:w} и {1:i}, сыр — {2:n}', 'Flatbread pizza with {0} and {1} and {2}', 'Pizza sobre pan lavash con {0}, {1} y {2}'),
    d: T('Быстрая пицца на тонком лаваше: {0:n}, {1:n} и {2:n}.', 'A quick thin-crust pizza on flatbread with {0}, {1} and {2}.', 'Una pizza rápida sobre pan lavash fino con {0}, {1} y {2}.'),
    i: ['lavash|2 pc', '{0}|100 g', '{1}|100 g', '{2}|120 g', 'tomatopaste|3 tbsp', 'oregano?|1 tsp'],
    s: {
      ru: ['Разогрейте духовку до 220 °C. Нарежьте {0:a} и {1:a} тонкими ломтиками.', 'Смажьте лаваш томатной пастой и посыпьте орегано.', 'Выложите {0:a} и {1:a}, сверху распределите {2:a}.', 'Выпекайте 10 минут до румяного сыра и хрустящего края.', 'Нарежьте на части и подавайте горячей.'],
      en: ['Heat the oven to 220 °C. Slice the {0} and {1} thinly.', 'Spread the flatbread with tomato paste and sprinkle with oregano.', 'Arrange the {0} and {1} and scatter the {2} on top.', 'Bake for 10 minutes until the cheese is golden and the edge crisp.', 'Cut into pieces and serve hot.'],
      es: ['Calienta el horno a 220 °C. Corta {0:d} y {1:d} en láminas finas.', 'Unta el pan lavash con concentrado de tomate y espolvorea orégano.', 'Coloca {0:d} y {1:d} y reparte {2:d} por encima.', 'Hornea 10 minutos hasta que el queso se dore y el borde quede crujiente.', 'Corta en trozos y sirve caliente.'],
    },
    k: { ru: ['Не кладите слишком много начинки: лаваш размякнет.', 'Для хруста выпекайте на горячем противне.'], en: ['Don\'t overload it or the flatbread goes soft.', 'Bake on a hot tray for extra crunch.'], es: ['No pongas demasiado relleno o el pan se ablandará.', 'Hornea sobre una bandeja caliente para que quede crujiente.'] },
  },
];
