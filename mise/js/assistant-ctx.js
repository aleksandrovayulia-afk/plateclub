// Ответы помощника с учётом контекста: рецепт, текущий шаг, порции, содержимое холодильника.
// Работают на устройстве и без интернета. Если ответа нет, возвращают null, и вызывающий код пробует другой путь.
import { ING } from './data/ingredients.js';
import { SUBS } from './data/subs.js';
import { findKb, isDoneness, doneHint } from './data/kb.js';
import { norm, extractIngredients, rtext } from './engine.js';
import { fmtQty } from './qty.js';
import { t } from './i18n.js';

const L = (obj, lang) => obj[lang] || obj.en;
const has = (n, re) => re.test(n);

const PAIR = {
  'cream>milk': { ru: '**Сливки вместо молока.** Можно: блюдо станет жирнее и насыщеннее. Если нужна консистенция молока, разбавьте сливки водой примерно пополам и не доводите до кипения.', en: '**Cream instead of milk.** You can: the dish gets richer. For the thickness of milk, thin the cream with about the same amount of water, and don’t let it boil.', es: '**Nata en vez de leche.** Se puede: el plato queda más untuoso. Para la textura de la leche, diluye la nata con más o menos la misma cantidad de agua y no la dejes hervir.' },
  'milk>cream': { ru: '**Молоко вместо сливок.** Можно, но блюдо выйдет менее жирным и более жидким. Добавьте немного сливочного масла или загустите соус крахмалом.', en: '**Milk instead of cream.** You can, but the dish is lighter and thinner. Add a little butter or thicken the sauce with starch.', es: '**Leche en vez de nata.** Se puede, pero el plato queda más ligero y líquido. Añade un poco de mantequilla o espesa la salsa con almidón.' },
  'yogurt>sourcream': { ru: '**Йогурт вместо сметаны.** Подойдёт густой натуральный йогурт. Нагревайте осторожно, не доводя до кипения, чтобы он не свернулся.', en: '**Yogurt instead of sour cream.** Thick plain yogurt works. Heat gently without boiling so it doesn’t curdle.', es: '**Yogur en vez de crema agria.** Sirve el yogur natural espeso. Caliéntalo con cuidado sin que hierva para que no se corte.' },
  'sourcream>yogurt': { ru: '**Сметана вместо йогурта.** Подойдёт: вкус будет мягче и жирнее. При необходимости разбавьте каплей молока.', en: '**Sour cream instead of yogurt.** Works: milder and richer. Thin with a splash of milk if needed.', es: '**Crema agria en vez de yogur.** Sirve: más suave y untuosa. Si hace falta, aclárala con un chorrito de leche.' },
};

/** Какие продукты упомянуты в вопросе, в порядке упоминания */
function mentioned(text) {
  const tokens = norm(text).split(' ');
  const out = [];
  for (let n = Math.min(3, tokens.length); n >= 1; n--) for (let i = 0; i + n <= tokens.length; i++) {
    const { ids, matched, total } = extractIngredients(tokens.slice(i, i + n).join(' '));
    if (ids.length === 1 && matched >= total) { if (!out.some((x) => x.id === ids[0])) out.push({ id: ids[0], at: i }); }
  }
  return out.sort((a, b) => a.at - b.at).map((x) => x.id);
}

function stepIds(r, stepText) {
  const ids = new Set(extractIngredients(stepText).ids);
  return r.ing.filter((x) => ids.has(x.id));
}

/**
 * ctx: { recipe, stepIndex, servings, units }. Возвращает { text, kind } или null.
 * Вопрос «можно ли пропустить этот ингредиент» относится к ингредиентам текущего шага.
 */
export function contextAnswer(text, ctx, lang) {
  const n = norm(text);
  const r = ctx?.recipe;
  const steps = r ? rtext(r, lang).steps : [];
  const ruSteps = r ? rtext(r, 'ru').steps : [];
  const i = ctx?.stepIndex ?? 0;
  const stepText = steps[i]?.text || '';
  const k = r ? (ctx.servings || r.srv) / r.srv : 1;

  // 1. «как понять, что готово»
  if (isDoneness(n)) {
    const hint = doneHint(`${ruSteps[i]?.text || ''} ${r ? rtext(r, 'ru').t : ''}`);
    const base = hint ? L(hint, lang) : t('ctx.done.generic');
    const mins = steps[i]?.min ? ` ${t('ctx.done.time', { n: steps[i].min })}` : '';
    return { kind: 'done', text: `**${t('ctx.done.title')}** ${base}${mins}` };
  }

  // 2. «можно ли пропустить этот ингредиент»
  if (r && has(n, /(пропустить|убрать|не добавлять|можно ли не|без этого|skip|omit|leave out|leave it out|do without|saltar|omitir|prescindir|sin este|sin ese)/)) {
    let target = mentioned(text).filter((id) => r.ing.some((x) => x.id === id));
    if (!target.length) target = stepIds(r, ruSteps[i]?.text || stepText).map((x) => x.id);
    if (!target.length) return { kind: 'skip', text: t('ctx.skip.which') };
    const id = target[0]; const row = r.ing.find((x) => x.id === id); const name = ING[id].n[lang];
    if (row.opt) return { kind: 'skip', text: t('ctx.skip.optional', { name }) };
    const sub = SUBS[id] ? ` ${L(SUBS[id], lang)}` : '';
    return { kind: 'skip', text: `${t('ctx.skip.core', { name })}${sub}` };
  }

  // 3. «можно ли заменить X на Y», «чем заменить X»
  if (has(n, /вместо|заменить|замена|instead of|replace|swap|substitut|en vez de|en lugar de|sustitu|reemplaz|cambiar/)) {
    const ids = mentioned(text);
    if (ids.length >= 2) {
      const sep = n.search(/ вместо | instead of | en vez de | en lugar de /);
      // «X вместо Y»: X — то, что есть, Y — то, что в рецепте. Для «заменить Y на X» порядок обратный
      const first = ids[0]; const second = ids[1];
      const byReplace = has(n, /заменить|заменитьна|replace|sustituir|cambiar/) && sep < 0;
      const [have, need] = sep >= 0 || !byReplace ? [first, second] : [second, first];
      const hit = PAIR[`${have}>${need}`];
      if (hit) return { kind: 'sub', text: L(hit, lang) };
      const tip = SUBS[need] ? L(SUBS[need], lang) : '';
      return { kind: 'sub', text: `${t('ctx.sub.maybe', { have: ING[have].n[lang], need: ING[need].n[lang] })}${tip ? ` ${tip}` : ''}` };
    }
    if (ids.length === 1 && SUBS[ids[0]]) {
      const row = r?.ing.find((x) => x.id === ids[0]);
      const qty = row ? ` ${t('ctx.sub.amount', { q: fmtQty(row.q, { scale: k, imp: ctx.units === 'imperial' }), name: ING[ids[0]].n[lang] })}` : '';
      return { kind: 'sub', text: `**${ING[ids[0]].n[lang]}.** ${L(SUBS[ids[0]], lang)}${qty}` };
    }
    if (!ids.length && r) {
      const cand = stepIds(r, ruSteps[i]?.text || stepText).filter((x) => SUBS[x.id]);
      if (cand.length) return { kind: 'sub', text: cand.slice(0, 3).map((x) => `**${ING[x.id].n[lang]}.** ${L(SUBS[x.id], lang)}`).join('\n') };
    }
  }

  // 4. типичные проблемы
  const kb = findKb(n);
  if (kb) return { kind: 'kb', text: L(kb, lang) };
  return null;
}
