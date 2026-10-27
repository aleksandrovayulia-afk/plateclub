// Список покупок: группировка по отделам магазина, суммирование количеств, копирование и отправка
import { ING, GROUP_ORDER } from '../data/ingredients.js';
import { extractIngredients, BY_ID, rtext } from '../engine.js';
import { fmtQty, parseQty } from '../qty.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import { esc, $, icons, toast } from '../ui.js';

/** Складывает количества с одинаковыми единицами: «200 g + 300 g» → «500 g» */
export function sumQty(qs, imp) {
  const byUnit = new Map();
  const notes = new Set();
  for (const e of qs) {
    for (const q of [].concat(e.q)) {
      const p = parseQty(q);
      if (!p.u) { if (p.note) notes.add(p.note); continue; }
      const k = p.u;
      const v = (p.n2 ? (p.n + p.n2) / 2 : p.n) * (e.scale || 1);
      byUnit.set(k, (byUnit.get(k) || 0) + v);
    }
  }
  const parts = [...byUnit].map(([u, n]) => fmtQty({ n, u }, { imp }));
  return parts.join(' + ');
}

const text = (it, imp) => (it.id ? ING[it.id].n[currentLang()] : it.text);
const qty = (it, imp) => (it.qs && it.qs.length ? sumQty(it.qs, imp) : '');
const groupOf = (it) => (it.id ? ING[it.id].g : 'other');
const ORDER = [...GROUP_ORDER.filter((g) => g !== 'common'), 'other'];

export function render(s) {
  const imp = s.units === 'imperial';
  const open = s.shop.filter((x) => !x.done).length;
  const groups = ORDER.map((g) => [g, s.shop.map((it, i) => ({ it, i })).filter(({ it }) => groupOf(it) === g)]).filter(([, l]) => l.length);
  const body = groups.map(([g, list]) => `<h3 class="sec">${t(`group.${g}`)}</h3><ul class="shop">${list.map(({ it, i }) => {
    const q = qty(it, imp);
    const from = it.qs && it.qs.length ? [...new Set(it.qs.map((x) => x.from).filter(Boolean))].map((id) => BY_ID[id] && rtext(BY_ID[id]).t).filter(Boolean).slice(0, 2).join(', ') : '';
    return `<li class="${it.done ? 'done' : ''}"><button class="check" data-act="shop-toggle" data-i="${i}" aria-pressed="${it.done}" aria-label="${esc(text(it))}">${it.done ? icons.check : ''}</button><span class="shop-t"><span>${it.id ? ING[it.id].e : '🛒'} ${esc(text(it))}${q ? ` <b class="shop-q">${esc(q)}</b>` : ''}</span>${from ? `<em>${esc(from)}</em>` : ''}</span><button class="shop-x" data-act="shop-remove" data-i="${i}" aria-label="${t('common.remove')}">${icons.close}</button></li>`;
  }).join('')}</ul>`).join('');
  return `<header class="top"><button class="back-link" data-act="back">${icons.back}${t('more.title')}</button><h1>${t('nav.shop')}</h1><p class="sub">${s.shop.length ? t('shop.left', { n: open }) : t('shop.sub')}</p></header>
    <form class="composer" id="shop-form" autocomplete="off"><input id="shop-input" type="text" enterkeyhint="done" placeholder="${t('shop.placeholder')}" aria-label="${t('shop.placeholder')}"><button class="btn primary" type="submit">${t('fridge.add')}</button></form>
    ${s.shop.length ? body : `<div class="empty small"><div class="empty-e">🛒</div><h2>${t('shop.empty')}</h2><p>${t('shop.empty.text')}</p></div>`}
    ${s.shop.length ? `<div class="plan-actions"><button class="btn" data-act="shop-copy">${icons.copy} ${t('shop.copy')}</button><button class="btn" data-act="shop-to-fridge">${icons.fridge} ${t('shop.bought')}</button></div>
    <div class="row-links"><button class="link" data-act="shop-clear-done">${t('shop.clearDone')}</button><button class="link danger" data-act="shop-clear">${t('shop.clear')}</button></div>` : ''}`;
}

export function bind(root) {
  const form = $('#shop-form', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#shop-input');
    const v = input.value.trim();
    if (!v) return;
    const s = store.get();
    const { ids, matched, total } = extractIngredients(v);
    let next = [...s.shop];
    if (ids.length && matched >= total) for (const id of ids) { if (!next.some((x) => x.id === id && !x.done)) next.push({ id, qs: [], done: false }); }
    else next = [...next, { text: v, done: false }];
    store.set({ shop: next });
    const n = $('#shop-input');
    if (n) n.focus({ preventScroll: true });
  });
}

function asText(s) {
  const imp = s.units === 'imperial';
  return ORDER.map((g) => {
    const list = s.shop.filter((it) => groupOf(it) === g && !it.done);
    return list.length ? `${t(`group.${g}`)}\n${list.map((it) => `• ${text(it)}${qty(it, imp) ? ` — ${qty(it, imp)}` : ''}`).join('\n')}` : '';
  }).filter(Boolean).join('\n\n');
}

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'shop-toggle': store.set({ shop: s.shop.map((x, i) => (i === Number(el.dataset.i) ? { ...x, done: !x.done } : x)) }); return true;
    case 'shop-remove': store.set({ shop: s.shop.filter((_, i) => i !== Number(el.dataset.i)) }); return true;
    case 'shop-clear-done': store.set({ shop: s.shop.filter((x) => !x.done) }); return true;
    case 'shop-clear': store.set({ shop: [] }); return true;
    case 'shop-copy': {
      const txt = asText(s);
      (async () => {
        try {
          if (navigator.share) await navigator.share({ title: t('nav.shop'), text: txt });
          else { await navigator.clipboard.writeText(txt); toast(t('shop.copied')); }
        } catch (e) { if (e && e.name !== 'AbortError') toast(t('recipe.copied.fail')); }
      })();
      return true;
    }
    case 'shop-to-fridge': {
      const ids = s.shop.filter((x) => x.done && x.id).map((x) => x.id);
      store.set({ have: [...new Set([...s.have, ...ids])], shop: s.shop.filter((x) => !x.done) });
      toast(t('shop.moved', { n: ids.length }));
      return true;
    }
    default: return false;
  }
}
