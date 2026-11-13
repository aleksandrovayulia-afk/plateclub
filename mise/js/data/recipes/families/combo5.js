// Перекрёстные семейства, часть 5: яичные блюда на сковороде, лапша вок, рыба в духовке, начинённый картофель,
// брускетты, намазки, сырники, овсяное печенье, холодные чаи, батончики.
import { PROT, FRUIT, FISH, SWEET_VEG } from './pools.js';

const T = (ru, en, es) => ({ ru, en, es });
const noFishNoodle = (p) => p !== 'fish' && p !== 'tuna' && p !== 'squid' && p !== 'sausage';

export default [
  {
    id: 'cx-shakshuka', c: 'savory', f: 'salty', cu: 'int', lv: 1, srv: 2, min: 30, eq: ['pan'], tg: ['breakfast', 'dinner', 'quick'], e: '🍳',
    cross: { pools: [['bellpepper', 'zucchini', 'eggplant', 'spinach', 'mushroom', 'potato', 'carrot'], ['feta', 'cheese', 'mozzarella', 'parmesan', 'halloumi']] },
    t: T('Яйца в томатном соусе с {0:i}, сверху {1:n}', 'Eggs poached in tomato sauce with {0}, topped with {1}', 'Huevos en salsa de tomate con {0} y {1} por encima'),
    d: T('Яйца, запечённые в густом томатном соусе с {0:i}. Сверху {1:n}.', 'Eggs poached in a thick tomato sauce with {0}, finished with {1}.', 'Huevos cocidos en una salsa de tomate espesa con {0}, rematados con {1}.'),
    i: ['egg|4 pc', 'cantomato|400 g', '{0}|200 g', '{1}|60 g', 'onion|1 pc', 'garlic|2 clove', 'oil|2 tbsp', 'paprika?|~pinch', 'salt|~taste'],
    s: {
      ru: ['Мелко нарежьте лук и {0:a}. Разогрейте масло в глубокой сковороде.', 'Обжарьте лук 3 минуты, добавьте {0:a} и чеснок и готовьте ещё 6 минут.', 'Влейте томаты, посолите, добавьте паприку и тушите 8 минут, пока соус не загустеет.', 'Сделайте в соусе четыре углубления и вбейте в них яйца. Накройте крышкой и готовьте 5 минут на слабом огне.', 'Сверху натрите или раскрошите {1:a} и подавайте прямо в сковороде.'],
      en: ['Finely chop the onion and the {0}. Heat the oil in a deep pan.', 'Cook the onion for 3 minutes, add the {0} and garlic and cook for another 6 minutes.', 'Pour in the tomatoes, add salt and paprika and simmer for 8 minutes until the sauce thickens.', 'Make four wells in the sauce and crack an egg into each. Cover and cook for 5 minutes over low heat.', 'Grate or crumble the {1} over the top and serve straight from the pan.'],
      es: ['Pica fina la cebolla y {0:d}. Calienta el aceite en una sartén honda.', 'Rehoga la cebolla 3 minutos, añade {0:d} y el ajo y cocina 6 minutos más.', 'Vierte el tomate, sala, añade el pimentón y cuece 8 minutos hasta que la salsa espese.', 'Haz cuatro huecos en la salsa y casca un huevo en cada uno. Tapa y cocina 5 minutos a fuego lento.', 'Ralla o desmenuza {1:d} por encima y sirve directamente en la sartén.'],
    },
    k: { ru: ['Желток останется жидким, если не передерживать под крышкой.', 'К яйцам хорошо подать хлеб: им удобно собирать соус.'], en: ['The yolks stay runny if you do not leave them under the lid too long.', 'Serve with bread to mop up the sauce.'], es: ['La yema queda líquida si no dejas los huevos demasiado tiempo tapados.', 'Sírvelo con pan para mojar en la salsa.'] },
  },
  {
    id: 'cx-noodlewok', c: 'savory', f: 'salty', cu: 'cn', lv: 1, srv: 2, min: 25, eq: ['pan'], tg: ['dinner', 'quick'], e: '🍜',
    cross: { pools: [PROT.filter(noFishNoodle), ['carrot', 'bellpepper', 'cabbage', 'broccoli', 'zucchini', 'mushroom', 'greenbeans', 'celery']] },
    t: T('Лапша вок {0:w} и {1:i}', 'Wok noodles with {0} and {1}', 'Fideos al wok con {0} y {1}'),
    d: T('Жареная лапша {0:w} и {1:i} в соевом соусе.', 'Stir-fried noodles with {0} and {1} in soy sauce.', 'Fideos salteados con {0} y {1} en salsa de soja.'),
    i: ['noodles|200 g', '{0}|200 g', '{1}|200 g', 'soy|3 tbsp', 'garlic|2 clove', 'oil|2 tbsp', 'greenonion?|~handful', 'sesame?|~pinch'],
    s: {
      ru: ['Отварите лапшу по инструкции на упаковке, промойте холодной водой и оставьте в дуршлаге.', 'Нарежьте {0:a} тонкими полосками, а {1:a} соломкой.', 'Разогрейте масло в сковороде на сильном огне и обжарьте {0:a} 5 минут, постоянно помешивая.', 'Добавьте {1:a} и чеснок и жарьте 4 минуты, овощи должны остаться слегка хрустящими.', 'Добавьте лапшу и соевый соус, перемешайте и прогревайте 2 минуты. Посыпьте зелёным луком и кунжутом.'],
      en: ['Cook the noodles as the package says, rinse with cold water and leave to drain.', 'Cut the {0} into thin strips and the {1} into matchsticks.', 'Heat the oil in a pan over high heat and fry the {0} for 5 minutes, stirring constantly.', 'Add the {1} and garlic and fry for 4 minutes, the vegetables should stay slightly crisp.', 'Add the noodles and the soy sauce, toss and heat through for 2 minutes. Sprinkle with spring onion and sesame.'],
      es: ['Cuece los fideos según el envase, enjuágalos con agua fría y escúrrelos.', 'Corta {0:d} en tiras finas y {1:d} en juliana.', 'Calienta el aceite en una sartén a fuego fuerte y saltea {0:d} 5 minutos sin dejar de remover.', 'Añade {1:d} y el ajo y saltea 4 minutos; las verduras deben quedar algo crujientes.', 'Incorpora los fideos y la salsa de soja, mezcla y calienta 2 minutos. Espolvorea con cebolleta y sésamo.'],
    },
    k: { ru: ['Сковорода должна быть очень горячей, тогда овощи не пустят много сока.', 'Лапшу не переваривайте: она дойдёт на сковороде.'], en: ['The pan must be very hot so the vegetables do not release too much water.', 'Do not overcook the noodles, they finish in the pan.'], es: ['La sartén debe estar muy caliente para que las verduras no suelten mucha agua.', 'No cuezas demasiado los fideos: terminan en la sartén.'] },
  },
  {
    id: 'cx-bakedfish', c: 'savory', f: 'salty', cu: 'int', lv: 1, srv: 2, min: 35, eq: ['oven'], tg: ['dinner'], e: '🐟',
    cross: { pools: [['cod', 'trout', 'salmon', 'mackerel', 'fish'], ['lemon', 'tomato', 'zucchini', 'bellpepper', 'potato', 'onion'], ['dill', 'parsley', 'thyme', 'rosemary', 'basil']], ok: (f, v, h) => !(v === 'potato' && f === 'salmon' && h === 'basil') },
    t: T('Запечённая рыба: {0:n} с {1:i} и {2:i}', 'Baked fish: {0} with {1} and {2}', 'Pescado al horno: {0} con {1} y {2}'),
    d: T('Рыба из духовки: {0:n} запекается с {1:i} и {2:i}.', 'Oven-baked {0} with {1} and {2}.', '{0} al horno con {1} y {2}.'),
    i: ['{0}|400 g', '{1}|200 g', '{2}|~handful', 'oliveoil|2 tbsp', 'garlic|2 clove', 'salt|~taste', 'pepper|~pinch'],
    s: {
      ru: ['Разогрейте духовку до 200 °C. Нарежьте {1:a} тонкими ломтиками, а {2:a} мелко порубите.', 'Выложите {1:a} на противень, полейте половиной масла и посолите.', 'Рыбу посолите, поперчите, смажьте оставшимся маслом, положите на овощи и посыпьте чесноком и {2:i}.', 'Запекайте 20 минут, пока мякоть не станет белой и легко не разделится вилкой.', 'Дайте рыбе постоять 3 минуты и подавайте с соком, который остался на противне.'],
      en: ['Heat the oven to 200 °C. Slice the {1} thinly and finely chop the {2}.', 'Spread the {1} on a baking tray, drizzle with half the oil and salt lightly.', 'Season the fish with salt and pepper, rub with the remaining oil, set it on the vegetables and sprinkle with garlic and {2}.', 'Bake for 20 minutes until the flesh turns opaque and flakes easily with a fork.', 'Let it rest for 3 minutes and serve with the juices from the tray.'],
      es: ['Calienta el horno a 200 °C. Corta {1:d} en láminas finas y pica fino {2:d}.', 'Extiende {1:d} en una bandeja, rocía con la mitad del aceite y sala un poco.', 'Sazona el pescado con sal y pimienta, úntalo con el aceite restante, colócalo sobre las verduras y espolvorea con ajo y {2:d}.', 'Hornea 20 minutos, hasta que la carne esté opaca y se separe fácilmente con un tenedor.', 'Déjalo reposar 3 minutos y sirve con los jugos de la bandeja.'],
    },
    k: { ru: ['Рыба готова, когда мякоть перестаёт быть прозрачной. Не пересушивайте.', 'Если рыба замороженная, полностью разморозьте её в холодильнике.'], en: ['The fish is done when the flesh is no longer translucent. Do not overcook it.', 'If the fish is frozen, thaw it fully in the fridge first.'], es: ['El pescado está listo cuando la carne deja de ser translúcida. No lo cuezas de más.', 'Si el pescado es congelado, descongélalo del todo en la nevera.'] },
  },
  {
    id: 'cx-stuffedpotato', c: 'savory', f: 'salty', cu: 'us', lv: 1, srv: 2, min: 70, eq: ['oven'], tg: ['dinner'], e: '🥔',
    cross: { pools: [['cheese', 'mozzarella', 'parmesan', 'creamcheese', 'sourcream'], ['bacon', 'ham', 'mushroom', 'broccoli', 'chicken', 'tuna', 'greenbeans', 'corn']] },
    t: T('Печёный картофель с {0:i} и {1:i}', 'Baked potatoes with {0} and {1}', 'Patatas al horno rellenas de {0} y {1}'),
    d: T('Печёный картофель, начинённый {0:i} и {1:i}.', 'Baked potatoes filled with {0} and {1}.', 'Patatas al horno rellenas de {0} y {1}.'),
    i: ['potato|4 pc', '{0}|80 g', '{1}|150 g', 'butter|1 tbsp', 'greenonion?|~handful', 'salt|~taste', 'pepper|~pinch'],
    s: {
      ru: ['Разогрейте духовку до 200 °C. Вымойте картофель, наколите вилкой и запекайте 50 минут, пока он не станет мягким.', 'Пока картофель запекается, мелко нарежьте {1:a} и при необходимости обжарьте на сухой сковороде 5 минут.', 'Разрежьте картофель вдоль, слегка размните мякоть вилкой и добавьте масло, соль и перец.', 'Выложите {1:a} и {0:a}, верните в духовку на 10 минут.', 'Посыпьте зелёным луком и подавайте горячим.'],
      en: ['Heat the oven to 200 °C. Wash the potatoes, prick them with a fork and bake for 50 minutes until soft.', 'While they bake, finely chop the {1} and, if needed, fry it in a dry pan for 5 minutes.', 'Cut the potatoes lengthwise, lightly mash the flesh with a fork and add the butter, salt and pepper.', 'Top with the {1} and {0} and return to the oven for 10 minutes.', 'Sprinkle with spring onion and serve hot.'],
      es: ['Calienta el horno a 200 °C. Lava las patatas, pínchalas con un tenedor y hornéalas 50 minutos hasta que estén blandas.', 'Mientras se hornean, pica fino {1:d} y, si hace falta, sofríelo 5 minutos en una sartén seca.', 'Abre las patatas a lo largo, machaca un poco la pulpa con un tenedor y añade la mantequilla, la sal y la pimienta.', 'Rellénalas con {1:d} y {0:d} y devuélvelas al horno 10 minutos.', 'Espolvorea con cebolleta y sirve caliente.'],
    },
    k: { ru: ['Картофель готов, когда вилка входит без усилия.', 'Выбирайте картофель одного размера, чтобы он запёкся равномерно.'], en: ['The potatoes are done when a fork goes in with no resistance.', 'Pick potatoes of equal size so they bake evenly.'], es: ['Las patatas están listas cuando el tenedor entra sin esfuerzo.', 'Elige patatas del mismo tamaño para que se hagan por igual.'] },
  },
  {
    id: 'cx-bruschetta', c: 'other', f: 'salty', cu: 'it', lv: 1, srv: 3, min: 15, eq: [], tg: ['snack', 'party', 'quick'], e: '🥖',
    cross: { pools: [['tomato', 'mozzarella', 'ricotta', 'avocado', 'mushroom', 'feta'], ['basil', 'arugula', 'olives', 'parsley', 'cherrytomato', 'greens']], ok: (a, b) => a !== b },
    t: T('Брускетта с {0:i} и {1:i}', 'Bruschetta with {0} and {1}', 'Bruschetta de {0} y {1}'),
    d: T('Хрустящая брускетта с {0:i} и {1:i}, сверху немного оливкового масла.', 'Crunchy bruschetta with {0} and {1}, finished with a little olive oil.', 'Bruschetta crujiente de {0} y {1}, con un poco de aceite de oliva por encima.'),
    i: ['baguette|1 pc', '{0}|150 g', '{1}|~handful', 'oliveoil|1 tbsp', 'garlic|1 clove', 'salt|~pinch'],
    s: {
      ru: ['Нарежьте багет ломтиками толщиной около 1,5 см и подсушите на сухой сковороде или в духовке при 200 °C по 3 минуты с каждой стороны.', 'Потрите ещё горячие ломтики чесноком.', 'Нарежьте {0:a} небольшими кусочками, а {1:a} мелко порвите или нарежьте.', 'Выложите {0:a} на хлеб, сверху добавьте {1:a}, щепотку соли и оливковое масло.', 'Подавайте сразу, пока хлеб хрустит.'],
      en: ['Slice the baguette about 1.5 cm thick and dry it in a pan or in a 200 °C oven for 3 minutes on each side.', 'Rub the hot slices with garlic.', 'Cut the {0} into small pieces and tear or chop the {1}.', 'Put the {0} on the bread, add the {1}, a pinch of salt and the olive oil.', 'Serve straight away while the bread is crisp.'],
      es: ['Corta la baguette en rebanadas de unos 1,5 cm y tuéstala en una sartén o en el horno a 200 °C 3 minutos por cada lado.', 'Frota las rebanadas calientes con ajo.', 'Corta {0:d} en trozos pequeños y rompe o pica {1:d}.', 'Pon {0:d} sobre el pan, añade {1:d}, una pizca de sal y el aceite de oliva.', 'Sirve enseguida, mientras el pan está crujiente.'],
    },
    k: { ru: ['Собирайте брускетты перед подачей, иначе хлеб размокнет.', 'Подойдёт и вчерашний хлеб: так он лучше хрустит.'], en: ['Assemble just before serving or the bread will go soft.', 'Day-old bread works well and gets crunchier.'], es: ['Monta las bruschettas justo antes de servir o el pan se ablandará.', 'El pan del día anterior funciona bien y queda más crujiente.'] },
  },
  {
    id: 'cx-spread', c: 'other', f: 'salty', cu: 'me', lv: 1, srv: 4, min: 15, eq: ['blender'], tg: ['snack', 'party', 'vegan'], e: '🫘',
    cross: { pools: [['chickpea', 'beans', 'blackbeans', 'lentil', 'eggplant', 'avocado', 'beet', 'pumpkin'], ['tahini', 'peanutbutter', 'oliveoil'], ['lemon', 'cumin', 'paprika', 'garlic']] },
    t: T('Домашняя намазка из {0:g} с {1:i} и {2:i}', 'Homemade {0} spread with {1} and {2}', 'Crema casera de {0} con {1} y {2}'),
    d: T('Мягкая намазка из {0:g}, {1:g} и {2:g}. Подходит к хлебу, овощам и лавашу.', 'A smooth spread of {0}, {1} and {2}. Good with bread, vegetables and flatbread.', 'Una crema suave de {0}, {1} y {2}. Va bien con pan, verduras y pan plano.'),
    i: ['{0}|250 g', '{1}|2 tbsp', '{2}|1 pc', 'garlic|1 clove', 'oliveoil|2 tbsp', 'salt|~taste'],
    s: {
      ru: ['Подготовьте {0:a}: сварите или запеките до мягкости и остудите. Консервированные бобовые просто промойте.', 'Сложите {0:a}, {1:a}, {2:a}, чеснок и соль в блендер.', 'Измельчайте 1–2 минуты, подливая понемногу воды или масла, пока масса не станет гладкой.', 'Попробуйте и при необходимости добавьте соль или специи.', 'Переложите в миску, полейте маслом и подавайте с хлебом или овощными палочками.'],
      en: ['Prepare the {0}: cook or roast until soft and let it cool. Just rinse canned legumes.', 'Put the {0}, {1}, {2}, garlic and salt in a blender.', 'Blend for 1 to 2 minutes, adding a little water or oil until smooth.', 'Taste and adjust the salt or spices.', 'Transfer to a bowl, drizzle with oil and serve with bread or vegetable sticks.'],
      es: ['Prepara {0:d}: cuécelo o ásalo hasta que esté blando y deja que se enfríe. Si es de bote, solo enjuágalo.', 'Pon {0:d}, {1:d}, {2:d}, el ajo y la sal en la batidora.', 'Tritura 1 o 2 minutos, añadiendo un poco de agua o aceite hasta que quede lisa.', 'Prueba y rectifica de sal o especias.', 'Pásala a un bol, rocía con aceite y sirve con pan o palitos de verdura.'],
    },
    k: { ru: ['Хранится в холодильнике до 3 дней в закрытой посуде.', 'Для густоты добавляйте воду по ложке.'], en: ['Keeps in the fridge for up to 3 days in a covered container.', 'Add water a spoonful at a time to loosen it.'], es: ['Se conserva en la nevera hasta 3 días en un recipiente tapado.', 'Añade agua una cucharada cada vez para aflojarla.'] },
  },
  {
    id: 'cx-syrniki', c: 'sweet', f: 'sweet', cu: 'ru', lv: 1, srv: 3, min: 30, eq: ['pan'], tg: ['breakfast'], e: '🥞',
    cross: { pools: [FRUIT.filter((x) => x !== 'kiwi'), ['honey', 'maplesyrup', 'jam', 'sourcream', 'yogurt']] },
    t: T('Сырники с {0:i} и {1:i}', 'Cottage cheese pancakes with {0} and {1}', 'Tortitas de requesón con {0} y {1}'),
    d: T('Нежные сырники из творога, к ним {0:n} и {1:n}.', 'Tender cottage cheese pancakes served with {0} and {1}.', 'Tortitas tiernas de requesón servidas con {0} y {1}.'),
    i: ['tvorog|400 g', 'egg|1 pc', 'flour|4 tbsp', 'sugar|2 tbsp', 'vanilla?|~pinch', 'oil|2 tbsp', '{0}|150 g', '{1}|3 tbsp'],
    s: {
      ru: ['Разомните творог вилкой, добавьте яйцо, сахар, ванилин и муку и замесите мягкое, слегка липкое тесто.', 'Мокрыми руками слепите из теста небольшие лепёшки толщиной около 1,5 см и обваляйте в муке.', 'Разогрейте масло на сковороде на среднем огне и обжаривайте сырники по 3–4 минуты с каждой стороны до золотистой корочки.', 'Нарежьте {0:a} и подайте к сырникам.', 'Добавьте {1:a} и подавайте тёплыми.'],
      en: ['Mash the cottage cheese with a fork, add the egg, sugar, vanilla and flour and mix into a soft, slightly sticky dough.', 'With wet hands shape small patties about 1.5 cm thick and coat them in flour.', 'Heat the oil in a pan over medium heat and fry the patties for 3 to 4 minutes on each side until golden.', 'Cut the {0} and serve it with the pancakes.', 'Add the {1} and serve warm.'],
      es: ['Machaca el requesón con un tenedor, añade el huevo, el azúcar, la vainilla y la harina y mezcla hasta obtener una masa blanda y algo pegajosa.', 'Con las manos húmedas forma tortitas pequeñas de unos 1,5 cm de grosor y pásalas por harina.', 'Calienta el aceite en una sartén a fuego medio y fríe las tortitas 3 o 4 minutos por cada lado hasta que estén doradas.', 'Corta {0:d} y sírvelo con las tortitas.', 'Añade {1:d} y sirve templadas.'],
    },
    k: { ru: ['Если творог влажный, отожмите его через марлю, иначе сырники будут расплываться.', 'Не кладите много муки: сырники станут плотными.'], en: ['If the cottage cheese is wet, drain it through cheesecloth or the pancakes will spread.', 'Do not add too much flour or they turn dense.'], es: ['Si el requesón está húmedo, escúrrelo con una gasa o las tortitas se deshacen.', 'No pongas demasiada harina o quedarán densas.'] },
  },
  {
    id: 'cx-oatcookie', c: 'sweet', f: 'sweet', cu: 'us', lv: 1, srv: 8, min: 35, eq: ['oven'], tg: ['snack', 'tea'], e: '🍪',
    cross: { pools: [['raisin', 'cranberry', 'chocolate', 'dates', 'driedapricots', 'coconut'], ['walnut', 'almond', 'peanut', 'seeds', 'cashew', 'hazelnut'], ['cinnamon', 'vanilla', 'cocoa', 'ginger']], ok: (a, b, c) => !(a === 'chocolate' && c === 'cocoa') },
    t: T('Овсяное печенье с {0:i}, {1:i} и {2:i}', 'Oatmeal cookies with {0}, {1} and {2}', 'Galletas de avena con {0}, {1} y {2}'),
    d: T('Мягкое овсяное печенье с {0:i}, {1:i} и {2:i}.', 'Soft oatmeal cookies with {0}, {1} and {2}.', 'Galletas de avena blandas con {0}, {1} y {2}.'),
    i: ['oats|200 g', 'flour|100 g', 'butter|100 g', 'sugar|80 g', 'egg|1 pc', 'bakingpowder|1 tsp', '{0}|60 g', '{1}|50 g', '{2}|1 tsp'],
    s: {
      ru: ['Разогрейте духовку до 180 °C и застелите противень бумагой для выпечки. Размягчите масло при комнатной температуре.', 'Разотрите масло с сахаром, добавьте яйцо и перемешайте.', 'Добавьте овсяные хлопья, муку, разрыхлитель и {2:a}. Измельчите {1:a}, нарежьте {0:a} и добавьте в тесто.', 'Ложкой выкладывайте тесто на противень небольшими горками на расстоянии 3 см друг от друга.', 'Выпекайте 12–15 минут до золотистого цвета. Остудите на противне 5 минут, печенье дойдёт.'],
      en: ['Heat the oven to 180 °C and line a tray with baking paper. Let the butter soften at room temperature.', 'Cream the butter with the sugar, add the egg and mix.', 'Add the oats, flour, baking powder and {2}. Chop the {1}, cut the {0} and fold them in.', 'Spoon small mounds onto the tray about 3 cm apart.', 'Bake for 12 to 15 minutes until golden. Cool on the tray for 5 minutes, the cookies firm up as they cool.'],
      es: ['Calienta el horno a 180 °C y forra una bandeja con papel de horno. Deja que la mantequilla se ablande a temperatura ambiente.', 'Bate la mantequilla con el azúcar, añade el huevo y mezcla.', 'Añade la avena, la harina, la levadura y {2:d}. Pica {1:d}, corta {0:d} e incorpóralos.', 'Con una cuchara coloca montoncitos pequeños en la bandeja, separados unos 3 cm.', 'Hornea 12 o 15 minutos hasta que estén doradas. Déjalas enfriar en la bandeja 5 minutos, se endurecen al enfriar.'],
    },
    k: { ru: ['Печенье кажется мягким сразу после духовки, но застывает при остывании.', 'Хранить можно в закрытой банке до 5 дней.'], en: ['The cookies look soft straight from the oven but firm up as they cool.', 'Store in a closed jar for up to 5 days.'], es: ['Las galletas parecen blandas al salir del horno pero se endurecen al enfriar.', 'Se conservan en un bote cerrado hasta 5 días.'] },
  },
  {
    id: 'cx-icedtea', c: 'shakes', f: 'sweet', cu: 'int', lv: 1, srv: 4, min: 15, eq: [], tg: ['drink', 'quick', 'vegan'], e: '🍹',
    cross: { pools: [['lemon', 'orange', 'peach', 'berry', 'mango', 'strawberry', 'pineapple', 'apple'], ['mint', 'ginger', 'honey', 'basil']] },
    t: T('Холодный чай с {0:i} и {1:i}', 'Iced tea with {0} and {1}', 'Té helado con {0} y {1}'),
    d: T('Освежающий холодный чай с {0:i} и {1:i}.', 'Refreshing iced tea with {0} and {1}.', 'Un té helado refrescante con {0} y {1}.'),
    i: ['tea|2 tsp', 'water|1 l', '{0}|150 g', '{1}|~handful', 'ice|~handful', 'sugar?|2 tbsp'],
    s: {
      ru: ['Вскипятите воду и заварите чай на 5 минут, затем процедите и полностью остудите.', 'Нарежьте {0:a} небольшими кусочками и слегка разомните в кувшине.', 'Добавьте {1:a} и при желании сахар, влейте остывший чай и перемешайте.', 'Поставьте в холодильник на 30 минут, чтобы вкусы соединились.', 'Подавайте со льдом.'],
      en: ['Boil the water, steep the tea for 5 minutes, then strain and let it cool completely.', 'Cut the {0} into small pieces and lightly muddle in a jug.', 'Add the {1} and sugar if you like, pour in the cooled tea and stir.', 'Chill in the fridge for 30 minutes so the flavours blend.', 'Serve over ice.'],
      es: ['Hierve el agua, infusiona el té 5 minutos, cuela y deja que se enfríe del todo.', 'Corta {0:d} en trozos pequeños y machaca ligeramente en una jarra.', 'Añade {1:d} y azúcar si quieres, vierte el té frío y remueve.', 'Enfría en la nevera 30 minutos para que se mezclen los sabores.', 'Sirve con hielo.'],
    },
    k: { ru: ['Не добавляйте лёд сразу, иначе чай станет водянистым.', 'Сахар лучше растворять в тёплом чае.'], en: ['Add the ice only when serving or the tea turns watery.', 'Dissolve sugar while the tea is still warm.'], es: ['Añade el hielo solo al servir o el té queda aguado.', 'Disuelve el azúcar cuando el té aún está templado.'] },
  },
  {
    id: 'cx-bar', c: 'sport', f: 'sweet', cu: 'us', lv: 1, srv: 8, min: 25, eq: [], tg: ['snack', 'nobake', 'noequip'], e: '🍫',
    cross: { pools: [['dates', 'raisin', 'cranberry', 'driedapricots', 'prunes'], ['almond', 'walnut', 'peanut', 'cashew', 'hazelnut', 'seeds'], ['honey', 'maplesyrup', 'peanutbutter']], ok: (a, b, c) => !(b === 'peanut' && c === 'peanutbutter') },
    t: T('Батончики с {0:i}, {1:i} и {2:i}', 'No-bake bars with {0}, {1} and {2}', 'Barritas sin horno con {0}, {1} y {2}'),
    d: T('Домашние овсяные батончики без духовки: {0:n}, {1:n} и {2:n}.', 'Homemade no-bake oat bars with {0}, {1} and {2}.', 'Barritas caseras de avena sin horno con {0}, {1} y {2}.'),
    i: ['oats|150 g', '{0}|100 g', '{1}|80 g', '{2}|4 tbsp', 'salt|~pinch'],
    s: {
      ru: ['Измельчите {0:a} и {1:a} в блендере до небольших кусочков.', 'Переложите в миску, добавьте овсяные хлопья, щепотку соли и {2:a}.', 'Тщательно перемешайте руками, чтобы масса слипалась при сжатии.', 'Плотно утрамбуйте массу в форму, застеленную пергаментом, и уберите в холодильник на 1 час.', 'Нарежьте на 8 батончиков. Храните в холодильнике.'],
      en: ['Pulse the {0} and {1} in a blender into small pieces.', 'Tip into a bowl, add the oats, a pinch of salt and the {2}.', 'Mix well by hand until the mixture sticks together when pressed.', 'Press firmly into a tin lined with parchment and chill for 1 hour.', 'Cut into 8 bars. Keep in the fridge.'],
      es: ['Tritura {0:d} y {1:d} en la batidora hasta obtener trozos pequeños.', 'Pásalos a un bol, añade la avena, una pizca de sal y {2:d}.', 'Mezcla bien con las manos hasta que la masa se pegue al apretarla.', 'Presiona con firmeza en un molde forrado con papel de horno y enfría 1 hora.', 'Corta en 8 barritas. Guárdalas en la nevera.'],
    },
    k: { ru: ['Если масса крошится, добавьте ещё ложку мёда или сиропа.', 'Хранятся в холодильнике до недели.'], en: ['If the mixture crumbles, add another spoon of honey or syrup.', 'They keep in the fridge for up to a week.'], es: ['Si la masa se desmorona, añade otra cucharada de miel o sirope.', 'Se conservan en la nevera hasta una semana.'] },
  },
];
