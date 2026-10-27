import * as store from './store.js';
import { PRESETS } from './data/equipment.js';
import { RECIPES } from './engine.js';
import { $, $$, icons, closeSheet, openSheet } from './ui.js';
import * as fridge from './views/fridge.js';
import * as recipes from './views/recipes.js';
import * as recipe from './views/recipe.js';
import * as cook from './views/cook.js';
import * as assistant from './views/assistant.js';
import * as kitchen from './views/kitchen.js';

const TABS = [
  ['', 'Холодильник', icons.fridge],
  ['recipes', 'Рецепты', icons.book],
  ['assistant', 'Помощник', icons.spark],
  ['kitchen', 'Кухня', icons.pan],
];

const VIEWS = { fridge, recipes, recipe, cook, assistant, kitchen };

const view = $('#view');
const tabbar = $('#tabbar');
let current = { name: '', id: null };
let lastTab = '';
const scrolls = {};

function parse() {
  const [seg = '', id = ''] = location.hash.replace(/^#\/?/, '').split('/');
  if (seg === 'r') return { name: 'recipe', id, tab: lastTab };
  if (seg === 'cook') return { name: 'cook', id, tab: lastTab };
  if (seg === 'recipes') return { name: 'recipes', tab: 'recipes' };
  if (seg === 'assistant') return { name: 'assistant', tab: 'assistant' };
  if (seg === 'kitchen') return { name: 'kitchen', tab: 'kitchen' };
  return { name: 'fridge', tab: '' };
}

function paintTabs(active, hidden) {
  tabbar.hidden = hidden;
  document.body.classList.toggle('no-tabs', hidden);
  tabbar.innerHTML = TABS.map(([h, label, icon]) => `<a href="#/${h}" class="tab${h === active ? ' on' : ''}" ${h === active ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`).join('');
}

function draw(routeChanged) {
  const r = parse();
  const key = `${r.name}/${r.id || ''}`;
  if (routeChanged) {
    scrolls[`${current.name}/${current.id || ''}`] = window.scrollY;
    if (current.name === 'cook' && r.name !== 'cook') cook.stop();
    closeSheet();
  }
  if (r.name !== 'recipe' && r.name !== 'cook') lastTab = r.tab;
  const keepY = routeChanged ? 0 : window.scrollY;
  const ae = document.activeElement;
  const focusId = ae && view.contains(ae) ? ae.id : null;

  const s = store.get();
  const mod = VIEWS[r.name];
  view.innerHTML = mod.render(s, r.id);
  view.dataset.route = r.name;
  if (mod.bind) mod.bind(view);
  paintTabs(r.tab, r.name === 'cook');
  document.title = r.name === 'recipe' || r.name === 'cook' ? 'Mise' : `Mise — ${TABS.find((t) => t[0] === r.tab)?.[1] || ''}`;

  if (routeChanged) {
    view.classList.remove('enter');
    void view.offsetWidth;
    view.classList.add('enter');
    const back = scrolls[key];
    window.scrollTo(0, r.name === 'recipes' || r.name === 'fridge' ? back || 0 : 0);
    if (r.name === 'assistant') window.scrollTo(0, document.documentElement.scrollHeight);
  } else {
    window.scrollTo(0, keepY);
  }
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) el.focus({ preventScroll: true });
  }
  current = r;
}

store.init();
store.subscribe(() => draw(false));
window.addEventListener('hashchange', () => draw(true));

/* ───────── События ───────── */

let navCount = 0;
window.addEventListener('hashchange', () => { navCount++; });

const HANDLERS = [fridge, recipes, recipe, cook, assistant, kitchen];

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (el.tagName === 'INPUT') return;
  switch (act) {
    case 'back':
      if (navCount > 0) history.back(); else location.hash = '#/recipes';
      return;
    case 'close-sheet': closeSheet(); return;
    case 'cook': location.hash = `#/cook/${el.dataset.id}`; return;
    case 'onb-preset':
      store.set({ owned: PRESETS[el.dataset.p].eq, onboarded: true });
      closeSheet();
      return;
    default:
  }
  for (const h of HANDLERS) if (h.onClick && h.onClick(act, el)) return;
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  for (const h of HANDLERS) if (h.onChange && h.onChange(el.dataset.act, el)) return;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
  cook.onKey(e);
});

/* ───────── Старт ───────── */

draw(true);

function onboarding() {
  if (store.get().onboarded) return;
  openSheet(`<h2>Что у вас на кухне?</h2>
    <p class="muted">Покажу только те рецепты, которые вы сможете приготовить. Изменить можно в разделе «Кухня».</p>
    <div class="presets">
      ${Object.entries(PRESETS).map(([id, p]) => `<button class="preset" data-act="onb-preset" data-p="${id}"><b>${p.n}</b><span>${id === 'none' ? 'Рецепты без техники: салаты, бутерброды, десерты в холодильнике' : id === 'basic' ? 'Плита, сковорода, кастрюля, венчик, тёрка, сито' : 'Духовка, блендер, миксер, микроволновка и всё остальное'}</span></button>`).join('')}
    </div>`, { onClose: () => store.set({ onboarded: true }, { silent: true }) });
}
onboarding();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Для отладки и тестов
window.__mise = { store, RECIPES, $$ };
