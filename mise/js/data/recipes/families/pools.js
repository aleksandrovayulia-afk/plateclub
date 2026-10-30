// Наборы продуктов для перекрёстных семейств. Названия блюд собираются из сочетаний, поэтому наборы подобраны так,
// чтобы любое сочетание внутри семейства было съедобным и разумным; несочетаемое отсекается фильтрами.
export const MEAT = ['chicken', 'turkey', 'beef', 'pork', 'lamb', 'mince', 'sausage'];
export const FISH = ['salmon', 'fish', 'tuna', 'shrimp', 'squid'];
export const PROT = [...MEAT, ...FISH];
export const VEG = ['potato', 'carrot', 'tomato', 'bellpepper', 'cabbage', 'cauliflower', 'broccoli', 'zucchini', 'eggplant', 'mushroom', 'pumpkin', 'beet', 'corn', 'peas', 'greenbeans', 'asparagus', 'spinach', 'celery', 'leek', 'sweetpotato'];
export const VEG_SOUP = ['potato', 'carrot', 'tomato', 'bellpepper', 'cabbage', 'cauliflower', 'broccoli', 'zucchini', 'mushroom', 'pumpkin', 'beet', 'corn', 'peas', 'greenbeans', 'spinach', 'celery'];
export const VEG_ROAST = ['potato', 'carrot', 'bellpepper', 'zucchini', 'eggplant', 'cauliflower', 'broccoli', 'pumpkin'];
export const VEG_SALAD = ['cucumber', 'tomato', 'lettuce', 'spinach', 'radish', 'bellpepper', 'avocado', 'carrot', 'cabbage', 'corn', 'celery'];
export const SWEET_VEG = ['pumpkin', 'sweetpotato', 'beet', 'corn', 'peas'];
export const SPICE = ['paprika', 'cumin', 'curry', 'oregano', 'thyme', 'rosemary', 'turmeric', 'ginger'];
export const CHEESE = ['cheese', 'mozzarella', 'feta', 'parmesan', 'creamcheese', 'sourcream'];
export const GRAIN = ['rice', 'quinoa', 'bulgur', 'couscous', 'buckwheat', 'millet'];
export const FRUIT = ['banana', 'strawberry', 'blueberry', 'raspberry', 'mango', 'pineapple', 'kiwi', 'peach', 'apricot', 'apple', 'pear', 'orange', 'cherry', 'berry', 'plum', 'grape'];
export const FRUIT_BAKE = FRUIT.filter((x) => x !== 'kiwi');

export const pairs = (list) => list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b]));
export const has = (set, x) => set.includes(x);
export const isFish = (x) => FISH.includes(x);
