import * as store from './store.js';
import { PRESETS } from './data/equipment.js';
import { RECIPES, warmIndex } from './engine.js';
import { LANGS, t, setLang, currentLang } from './i18n.js';
import * as timers from './timers.js';
import * as music from './music.js';
import * as musicui from './musicui.js';
import { mascot, face, tap } from './mascot.js';
import { buzz } from './haptics.js';
import { $, icons, closeSheet, openSheet, toast, esc } from './ui.js';
import * as home from './views/home.js';
import * as fridge from './views/fridge.js';
import * as recipes from './views/recipes.js';
import * as recipe from './views/recipe.js';
import * as cook from './views/cook.js';
import * as assistant from './views/assistant.js';
import * as more from './views/more.js';
import * as plan from './views/plan.js';
import * as shop from './views/shop.js';
import * as tools from './views/tools.js';
import * as kitchen from './views/kitchen.js';
import * as settings from './views/settings.js';
import * as saved from './views/saved.js';

const VIEWS = { home, fridge, recipes, recipe, cook, assistant, more, plan, shop, tools, kitchen, settings, saved };
const HANDLERS = [musicui, home, fridge, recipes, recipe, cook, assistant, plan, shop, tools, kitchen, settings, saved];
const MORE_ROUTES = new Set(['more', 'plan', 'shop', 'tools', 'kitchen', 'settings', 'saved']);

const view = $('#view');
const tabbar = $('#tabbar');
const timerbar = $('#timerbar');
let current = { name: '', id: null };
let lastTab = 'home';
const scrolls = {};
let navCount = 0;
let enterT;

/* ───────── Маршруты ───────── */
function parse() {
  const [seg = '', id = ''] = location.hash.replace(/^#\/?/, '').split('/');
  if (seg === 'r') return { name: 'recipe', id, tab: lastTab };
  if (seg === 'cook') return { name: 'cook', id, tab: lastTab };
  if (VIEWS[seg] && seg !== 'recipe' && seg !== 'cook' && seg !== 'home') return { name: seg, tab: MORE_ROUTES.has(seg) ? 'more' : seg };
  return { name: 'home', tab: 'home' };
}

const TABS = () => [
  ['home', '#/', icons.home, t('nav.home')],
  ['recipes', '#/recipes', icons.book, t('nav.recipes')],
  ['fridge', '#/fridge', icons.fridge, t('nav.fridge')],
  ['assistant', '#/assistant', face('idle', 28, 'mc-tab'), t('nav.assistant')],
  ['more', '#/more', icons.menu, t('nav.more')],
];

function paintTabs(active, hidden) {
  tabbar.hidden = hidden;
  document.body.classList.toggle('no-tabs', hidden);
  tabbar.innerHTML = TABS().map(([id, href, icon, label]) => `<a href="${href}" class="tab${id === active ? ' on' : ''}${id === 'fridge' ? ' center' : ''}" ${id === active ? 'aria-current="page"' : ''}><span class="tab-i">${icon}</span><span class="tab-l">${label}</span></a>`).join('');
}

function paintTimerBar() {
  const live = timers.list().filter((x) => x.running || x.done);
  const hide = !live.length || current.name === 'cook' || current.name === 'tools';
  timerbar.hidden = hide;
  document.body.classList.toggle('has-timers', !hide);
  if (hide) return;
  timerbar.innerHTML = live.slice(0, 3).map((x) => `<a href="#/tools" class="tb${x.done ? ' done' : ''}">${icons.timer}<span>${x.done ? t('cook.timer.ready') : timers.fmt(x.left)}</span><i>${esc(x.label)}</i></a>`).join('');
}

function applyPrefs(s) {
  const root = document.documentElement;
  if (s.theme === 'auto') { if (root.dataset.miseTheme) { delete root.dataset.theme; delete root.dataset.miseTheme; } } else { root.dataset.theme = s.theme; root.dataset.miseTheme = '1'; }
  root.dataset.size = s.textSize;
  root.lang = currentLang();
}

const TITLES = { home: '', fridge: 'nav.fridge', recipes: 'nav.recipes', assistant: 'nav.assistant', more: 'nav.more', plan: 'nav.plan', shop: 'nav.shop', tools: 'nav.tools', kitchen: 'kitchen.title', settings: 'settings.title', saved: 'nav.saved' };

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
  applyPrefs(s);
  view.innerHTML = coachHtml(r.name) + VIEWS[r.name].render(s, r.id);
  view.dataset.route = r.name;
  const mod = VIEWS[r.name];
  if (mod.bind) mod.bind(view);
  current = r;
  paintTabs(r.tab, r.name === 'cook');
  paintTimerBar();
  musicui.paintMini();
  document.title = TITLES[r.name] ? `Mise — ${t(TITLES[r.name])}` : 'Mise';

  if (routeChanged) {
    view.classList.remove('enter');
    void view.offsetWidth;
    view.classList.add('enter');
    clearTimeout(enterT); enterT = setTimeout(() => view.classList.remove('enter'), 800);
    window.scrollTo(0, ['home', 'recipes', 'fridge'].includes(r.name) ? scrolls[key] || 0 : 0);
    if (r.name === 'assistant') window.scrollTo(0, document.documentElement.scrollHeight);
  } else window.scrollTo(0, keepY);
  if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
}

/* ───────── Язык ───────── */
function changeLang(l) {
  setLang(l);
  store.set({ lang: l });
}

function langSheet() {
  openSheet(`<h2>${t('settings.language')}</h2><div class="lang-list">${LANGS.map((l) => `<button class="lang-i${currentLang() === l.id ? ' on' : ''}" data-act="set-lang" data-v="${l.id}"><b>${l.name}</b><span>${t(`settings.lang.${l.id}`)}</span>${currentLang() === l.id ? icons.check : ''}</button>`).join('')}</div>`);
}

let obStep = 0;
function onboarding(step = obStep) {
  const st = store.get();
  if (st.onboarded) return;
  obStep = step;
  const dots = `<div class="ob-steps" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
  const hero = `<div class="ob-hero">${mascot(['wave', 'teach', 'show'][step], 118)}</div>`;
  const body = [
    `<h2 class="ob-t">${t('onb.hi')}</h2><p class="muted ob-p">${t('onb.hi.text')}</p>
     <div class="lang-row">${LANGS.map((l) => `<button class="lang-pill${currentLang() === l.id ? ' on' : ''}" data-act="set-lang" data-v="${l.id}" data-onb="1">${l.name}</button>`).join('')}</div>
     <button class="btn primary full" data-act="onb-go" data-s="1">${t('onb.next')}</button>`,
    `<h2 class="ob-t">${t('onb.kitchen.h')}</h2><p class="muted ob-p">${t('onb.kitchen.text')}</p>
     <div class="presets">${Object.keys(PRESETS).map((id) => `<button class="preset" data-act="onb-preset" data-p="${id}"><b>${t(`preset.${id}`)}</b><span>${t(`preset.${id}.d`)}</span></button>`).join('')}</div>`,
    `<h2 class="ob-t">${t('onb.diet')}</h2><p class="muted ob-p">${t('onb.diet.text')}</p>
     <div class="chips" style="justify-content:center">${['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'eggFree', 'nutFree'].map((k) => `<button class="chip small${st.diet[k] ? ' on' : ''}" data-act="onb-diet" data-k="${k}" aria-pressed="${!!st.diet[k]}">${t(`diet.${k}`)}</button>`).join('')}</div>
     <button class="btn primary full" style="margin-top:18px" data-act="onb-done">${t('onb.start')}</button>`,
  ][step];
  openSheet(`${hero}${dots}${body}`, { onClose: () => store.set({ onboarded: true }, { silent: true }) });
}

const COACH_ROUTES = new Set(['fridge', 'recipes', 'plan', 'shop', 'tools', 'kitchen', 'saved', 'recipe']);
/** Короткая подсказка от Лимми над экраном; после закрытия больше не показывается */
function coachHtml(name) {
  const st = store.get();
  if (!COACH_ROUTES.has(name) || !st.onboarded || (st.coach || {})[name]) return '';
  return `<aside class="coach" role="note">${mascot('teach', 56)}<p>${t(`coach.${name}`)}</p><button class="coach-x" data-act="coach-x" data-r="${name}" aria-label="${t('common.close')}">${icons.close}</button></aside>`;
}

/** Реплика над персонажем, на которого нажали */
function quip(el, move) {
  let q = document.getElementById('bot-quip');
  if (!q) { q = document.createElement('div'); q.id = 'bot-quip'; q.setAttribute('role', 'status'); document.body.append(q); }
  q.textContent = t(`bot.tap.${move}`);
  const r = el.getBoundingClientRect();
  q.style.left = '0px'; q.style.top = '0px';
  const w = q.offsetWidth; const h = q.offsetHeight;
  q.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
  q.style.top = `${r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8}px`;
  q.classList.add('show');
  clearTimeout(quip.t);
  quip.t = setTimeout(() => q.classList.remove('show'), 2600);
}

/* ───────── События ───────── */
const BACK_FALLBACK = { recipe: '#/recipes', plan: '#/more', shop: '#/more', tools: '#/more', kitchen: '#/more', settings: '#/more', saved: '#/more' };

document.addEventListener('click', (e) => {
  const mc = e.target.closest('.mc');
  if (mc && !mc.classList.contains('mc-face') && !mc.closest('button, a, .av')) { quip(mc, tap(mc)); return; }
  if (store.get().music && !music.isOn()) musicui.setOn(true);
  if (e.target.closest('button, a, .chip, .tab')) buzz('tap');
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
  const act = el.dataset.act;
  switch (act) {
    case 'back': if (navCount > 0) history.back(); else location.hash = BACK_FALLBACK[current.name] || '#/'; return;
    case 'close-sheet': closeSheet(); return;
    case 'cook': timers.unlockAudio(); if (store.get().musicCook && !music.isOn()) musicui.setOn(true); location.hash = `#/cook/${el.dataset.id}`; return;
    case 'lang-sheet': langSheet(); return;
    case 'set-lang': {
      changeLang(el.dataset.v);
      if (el.dataset.onb) onboarding(0); else closeSheet();
      return;
    }
    case 'onb-diet': {
      const k = el.dataset.k; const d = { ...store.get().diet, [k]: !store.get().diet[k] };
      if (k === 'vegan' && d.vegan) d.vegetarian = true;
      store.set({ diet: d }, { silent: true }); onboarding(2); return;
    }
    case 'onb-go': onboarding(Number(el.dataset.s)); return;
    case 'onb-preset': store.set({ owned: PRESETS[el.dataset.p].eq }, { silent: true }); onboarding(2); return;
    case 'onb-done': store.set({ onboarded: true }); closeSheet(); return;
    case 'coach-x': store.set({ coach: { ...(store.get().coach || {}), [el.dataset.r]: 1 } }); return;
    default:
  }
  for (const h of HANDLERS) if (h.onClick && h.onClick(act, el)) return;
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  for (const h of HANDLERS) if (h.onChange && h.onChange(el.dataset.act, el)) return;
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-act]');
  if (el) musicui.onInput(el.dataset.act, el);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
  cook.onKey(e);
});

window.addEventListener('hashchange', () => { navCount++; draw(true); });

/* ───────── Старт ───────── */
store.init();
setLang(store.get().lang);
musicui.init();
store.subscribe(() => draw(false));
timers.subscribe(() => {
  paintTimerBar();
  if (current.name === 'tools') tools.paint();
  if (current.name === 'cook') cook.paint();
});
timers.setOnDone((tm) => {
  toast(t('timers.done', { label: tm.label }), 5000);
  if (current.name === 'recipe') store.set({});
  try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('Mise', { body: t('timers.done', { label: tm.label }) }); } catch { /* */ }
});

draw(true);
onboarding();
warmIndex();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.__mise = { store, RECIPES, VIEWS };
