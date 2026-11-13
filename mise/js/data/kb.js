// Решения типичных кухонных проблем: помощник отвечает на вопросы вроде «почему соус жидкий» без интернета.
// Это общие проверенные приёмы, а не точные режимы: температуры и время зависят от продукта и плиты.
// re проверяется по нормализованному тексту вопроса (нижний регистр, без акцентов, ё → е).

export const KB = [
  { id: 'thin', re: /(жидк|водянист|не (густ|загуст)|слишком жидк).*(соус|суп|крем|подлив)|(соус|суп|крем|подлив).*(жидк|водянист|не (густ|загуст))|runny|too thin|watery|thin (sauce|soup)|(salsa|sopa|crema).*(liquid|aguad|poco espes|clar)|(liquid|aguad).*(salsa|sopa|crema)/,
    ru: '**Слишком жидкий соус.** Уварите его без крышки на небольшом огне, пока не загустеет. Быстрее: разведите ложку крахмала в холодной воде, влейте тонкой струйкой и прогрейте, помешивая. Сухой крахмал в горячее не сыпьте: будут комки.',
    en: '**Sauce too thin.** Reduce it uncovered over low heat until it thickens. Faster: stir a spoonful of starch into cold water, pour it in a thin stream and heat while stirring. Never sprinkle dry starch into hot liquid: it clumps.',
    es: '**Salsa demasiado líquida.** Redúcela sin tapar a fuego suave hasta que espese. Más rápido: diluye una cucharada de almidón en agua fría, viértela en hilo y calienta sin dejar de remover. No eches almidón seco en caliente: hace grumos.' },
  { id: 'thick', re: /(густ|слишком густ|загустел|too thick|thick sauce|demasiado espes|muy espes)/,
    ru: '**Слишком густо.** Добавляйте горячую воду или бульон по ложке, помешивая, и пробуйте. Холодную жидкость лучше не лить: блюдо остынет и вкус разбавится.',
    en: '**Too thick.** Stir in hot water or stock a spoonful at a time and taste as you go. Avoid cold liquid: it cools the dish and dilutes the flavor.',
    es: '**Demasiado espeso.** Añade agua caliente o caldo cucharada a cucharada, removiendo y probando. Mejor no usar líquido frío: enfría el plato y diluye el sabor.' },
  { id: 'burn', re: /(подгор|пригор|горит|сгор|burn|burning|burnt|quema|quemando|quemar|pegando).*(мяс|кур|котлет|лук|чеснок|соус|рис|meat|chicken|onion|garlic|sauce|rice|carne|pollo|cebolla|ajo|salsa|arroz)|(мяс|кур|котлет|лук|чеснок|соус|рис|meat|chicken|onion|garlic|sauce|rice|carne|pollo|cebolla|ajo|salsa|arroz).*(подгор|пригор|горит|сгор|burn|burning|burnt|quema|quemando|quemar|pegando)/,
    ru: '**Начинает подгорать.** Сразу убавьте огонь и снимите сковороду на минуту. Добавьте ложку воды или бульона и соскребите прилипшее со дна. Если низ уже горький, не перемешивайте то, что пристало к дну, и переложите верх в чистую посуду.',
    en: '**It’s starting to burn.** Lower the heat right away and take the pan off for a minute. Add a spoonful of water or stock and scrape up what sticks. If the bottom is bitter, don’t stir in the scorched bits: move the top layer to a clean pan.',
    es: '**Se empieza a quemar.** Baja el fuego al instante y aparta la sartén un minuto. Añade una cucharada de agua o caldo y rasca lo que se pega. Si el fondo ya amarga, no mezcles lo quemado: pasa la parte de arriba a otra sartén limpia.' },
  { id: 'spicy', re: /поостр|острее|поярч|поперчистее|spicier|hotter|more spicy|make it spicy|más picante|mas picante|picante/,
    ru: '**Как сделать острее.** Добавляйте острое понемногу и пробуйте после каждой добавки: свежий или молотый перец чили, острый соус, хлопья чили. Острота нарастает со временем, поэтому подождите минуту. Для объёма вкуса работает ещё имбирь и чёрный перец.',
    en: '**Making it spicier.** Add heat gradually and taste after each addition: fresh or ground chili, hot sauce, chili flakes. The heat builds over time, so wait a minute. Ginger and black pepper add depth too.',
    es: '**Cómo hacerlo más picante.** Añade picante poco a poco y prueba tras cada adición: chile fresco o molido, salsa picante, copos de chile. El picor aumenta con el tiempo, así que espera un minuto. El jengibre y la pimienta negra también dan profundidad.' },
  { id: 'salty', re: /пересол|слишком солен|too salty|over ?salted|salado de mas|demasiado salad|salada de mas|muy salad/,
    ru: '**Пересолили.** Разбавьте несолёной основой: водой, бульоном без соли, сливками или йогуртом. Добавьте кислоту (немного лимонного сока) и немного сахара: это приглушит ощущение соли. В супе поможет картофель или рис, но они лишь разбавляют, а не «забирают» соль.',
    en: '**Too salty.** Dilute with something unsalted: water, unsalted stock, cream or yogurt. A little lemon juice and a pinch of sugar soften the salty taste. In soup, potato or rice helps, but they only dilute: they don’t "absorb" the salt.',
    es: '**Demasiada sal.** Dilúyelo con algo sin sal: agua, caldo sin sal, nata o yogur. Un poco de limón y una pizca de azúcar suavizan el sabor salado. En una sopa ayuda la patata o el arroz, aunque solo diluyen: no "absorben" la sal.' },
  { id: 'bland', re: /пресн|безвкус|не хватает вкуса|bland|tasteless|flat flavor|soso|sin sabor|insipid/,
    ru: '**Пресно.** Проверьте по порядку: соль (щепотка, затем проба), кислота (лимон, уксус), зелень, жареный лук или чеснок, специи. Чаще всего блюду не хватает именно соли и кислоты.',
    en: '**Bland.** Check in this order: salt (a pinch, then taste), acid (lemon, vinegar), fresh herbs, fried onion or garlic, spices. Most often a dish needs just salt and acid.',
    es: '**Soso.** Revisa por orden: sal (una pizca y prueba), acidez (limón, vinagre), hierbas frescas, cebolla o ajo sofritos, especias. Casi siempre solo faltan sal y acidez.' },
  { id: 'tough', re: /(жестк|сух|резин).*(мяс|кур|рыб|котлет)|(мяс|кур|рыб|котлет).*(жестк|сух|резин)|tough|dry (meat|chicken)|chewy|(carne|pollo).*(duro|seco)|(duro|seco).*(carne|pollo)/,
    ru: '**Жёсткое или сухое мясо.** Мясо, которое должно быть нежным, тушат долго на слабом огне под крышкой. Для быстро жарящихся кусков не передерживайте на огне и давайте отдохнуть после готовки. Режьте поперёк волокон.',
    en: '**Tough or dry meat.** Cuts meant to be tender need a long, gentle, covered braise. For quick-cooking cuts, don’t overcook and let them rest afterwards. Slice across the grain.',
    es: '**Carne dura o seca.** Los cortes que deben quedar tiernos necesitan cocción lenta, suave y tapada. En los cortes rápidos no te pases de cocción y deja reposar. Corta en contra de la fibra.' },
  { id: 'lumps', re: /комк|lumps|lumpy|grumos|grumoso/,
    ru: '**Комки в соусе или тесте.** Энергично взбейте венчиком или пробейте блендером. Если комки плотные, процедите через сито. В следующий раз добавляйте муку или крахмал постепенно, всё время помешивая.',
    en: '**Lumps in a sauce or batter.** Whisk hard or blend. If the lumps are firm, strain through a sieve. Next time add flour or starch gradually while stirring constantly.',
    es: '**Grumos en una salsa o masa.** Bate con energía o tritura. Si son firmes, cuela. La próxima vez añade la harina o el almidón poco a poco, sin dejar de remover.' },
  { id: 'sticky', re: /липн|липкое тесто|sticky dough|sticks to|se pega la masa|masa pegajosa/,
    ru: '**Липкое тесто.** Подсыпайте муку по ложке, а не сразу много, и дайте тесту отдохнуть: мука впитает влагу. Руки и поверхность слегка смажьте маслом.',
    en: '**Sticky dough.** Add flour a spoonful at a time, not all at once, and let the dough rest so the flour absorbs moisture. Lightly oil your hands and the surface.',
    es: '**Masa pegajosa.** Añade harina cucharada a cucharada, no de golpe, y deja reposar para que la harina absorba la humedad. Unta ligeramente de aceite las manos y la superficie.' },
  { id: 'soggy', re: /не хрустит|размокл|не получается корочк|soggy|not crispy|crispy|no queda crujiente|blando|reblandec/,
    ru: '**Нет хруста.** Хорошо обсушите продукт бумажным полотенцем, прогрейте сковороду или духовку до начала готовки и не перегружайте посуду. Влага и теснота мешают корочке.',
    en: '**Not crispy.** Pat the food dry with paper towel, heat the pan or oven fully before you start, and don’t overcrowd. Moisture and crowding stop a crust forming.',
    es: '**Sin crujiente.** Seca bien el alimento con papel de cocina, calienta la sartén o el horno del todo antes de empezar y no la sobrecargues. La humedad y el apelotonamiento impiden que se forme corteza.' },
  { id: 'curdled', re: /свернул|створож|curdl|split sauce|se corto|cortada la salsa|cortó/,
    ru: '**Свернулись сливки, молоко или соус.** Снимите с огня, влейте ложку холодной жидкости и энергично взбейте венчиком или блендером. В следующий раз не доводите молочное до кипения и добавляйте кислое (лимон, помидоры) в конце.',
    en: '**Cream, milk or sauce curdled.** Take it off the heat, add a spoonful of cold liquid and whisk hard or blend. Next time don’t let dairy boil, and add acidic ingredients (lemon, tomato) at the end.',
    es: '**Se cortó la nata, la leche o la salsa.** Retira del fuego, añade una cucharada de líquido frío y bate con energía o tritura. La próxima vez no dejes hervir los lácteos y añade lo ácido (limón, tomate) al final.' },
  { id: 'doneness', re: /как понять.*(готов|готово)|готов ли|how (do i|can i) (know|tell).*(done|ready|cooked)|is it (done|ready|cooked)|como (se|saber|se si).*(listo|hecho|cocido)|esta (listo|hecho)/,
    ru: '', en: '', es: '' },
];

export const findKb = (n) => KB.find((x) => x.re.test(n) && x.id !== 'doneness');
export const isDoneness = (n) => KB.find((x) => x.id === 'doneness').re.test(n);

/** Признаки готовности по типу продукта; используется вместе с текстом шага */
export const DONE = [
  { re: /паст|спагетти|макарон|лапш/, ru: 'Попробуйте на вкус: паста должна быть мягкой снаружи и чуть упругой в центре.', en: 'Taste a piece: pasta should be tender outside and slightly firm in the centre.', es: 'Prueba un trozo: la pasta debe estar tierna por fuera y algo firme en el centro.' },
  { re: /курица|курин|индейк|фарш|котлет/, ru: 'Разрежьте самый толстый кусок: мясо внутри не розовое, сок прозрачный.', en: 'Cut into the thickest piece: no pink inside and the juices run clear.', es: 'Corta la pieza más gruesa: sin rosa por dentro y con el jugo claro.' },
  { re: /рыб|лосос|тунец|треск|форел/, ru: 'Мякоть стала непрозрачной и легко расслаивается вилкой.', en: 'The flesh is opaque and flakes easily with a fork.', es: 'La carne está opaca y se desmenuza fácilmente con un tenedor.' },
  { re: /картофел|морков|овощ|капуст|кабачк|тыкв/, ru: 'Проткните кусочек ножом или вилкой: готовый овощ насаживается легко и без сопротивления.', en: 'Pierce a piece with a knife or fork: cooked vegetables slide on without resistance.', es: 'Pincha un trozo con un cuchillo o tenedor: la verdura hecha se clava sin resistencia.' },
  { re: /рис|гречк|булгур|крупу|киноа|кускус/, ru: 'Зёрна мягкие, вода впиталась, на дне нет жидкости. Попробуйте несколько зёрен.', en: 'The grains are tender and the water is absorbed with nothing left at the bottom. Taste a few grains.', es: 'Los granos están tiernos y el agua absorbida, sin líquido en el fondo. Prueba unos granos.' },
  { re: /яйц|омлет/, ru: 'Белок плотный и непрозрачный, а желток доведён до нужной степени: в омлете середина должна схватиться.', en: 'The white is firm and opaque and the yolk is as you like it; in an omelette the centre should set.', es: 'La clara está firme y opaca y la yema a tu gusto; en una tortilla el centro debe cuajar.' },
  { re: /пирог|торт|кекс|маффин|бисквит|выпечк|запека/, ru: 'Проткните центр деревянной шпажкой: на ней не должно остаться сырого теста. Верх при лёгком нажатии пружинит.', en: 'Insert a wooden skewer in the centre: no raw batter should cling to it. The top springs back when lightly pressed.', es: 'Pincha el centro con un palillo de madera: no debe salir con masa cruda. La superficie recupera su forma al presionar suavemente.' },
];
export const doneHint = (ruText) => DONE.find((x) => x.re.test(ruText.toLowerCase().replace(/ё/g, 'е')));
