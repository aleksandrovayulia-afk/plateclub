// Инструменты: таймеры, переводчик мер, словарь продуктов (ru · en · es), замены
import { ING } from '../data/ingredients.js';
import { SUBS } from '../data/subs.js';
import { norm } from '../engine.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import * as timers from '../timers.js';
import { esc, $, icons } from '../ui.js';

let tab = 'timers';
let glossLimit = 40;
let glossQ = '';
let subsQ = '';

const TABS = ['timers', 'convert', 'words', 'subs'];
const PRESETS = [1, 3, 5, 10, 15, 20, 30, 45, 60];

/* Меры: в миллилитрах и граммах */
const VOL = { ml: 1, l: 1000, cup: 240, tbsp: 15, tsp: 5, floz: 29.57 };
const MASS = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
// Плотность, г/мл — для перевода стаканов и ложек в граммы
const DENS = { water: 1, milk: 1.03, flour: 0.53, sugar: 0.84, powder: 0.5, butter: 0.95, honey: 1.42, rice: 0.77, oats: 0.38, cocoa: 0.35, oil: 0.92, salt: 1.2, yogurt: 1.03, sourcream: 1.03, breadcrumbs: 0.45, semolina: 0.7, starch: 0.6 };
const UNIT_NAMES = { ml: 'ml', l: 'l', cup: 'cup', tbsp: 'tbsp', tsp: 'tsp', floz: 'fl oz', g: 'g', kg: 'kg', oz: 'oz', lb: 'lb' };

let conv = { v: 1, from: 'cup', to: 'g', ing: 'flour' };

function convert() {
  const { v, from, to, ing } = conv;
  const d = DENS[ing] || 1;
  const toMl = (x, u) => (VOL[u] ? x * VOL[u] : (x * MASS[u]) / d);
  const ml = toMl(Number(v) || 0, from);
  return VOL[to] ? ml / VOL[to] : (ml * d) / MASS[to];
}
const fmtNum = (x) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100);

const OVEN = [[120, 250, '½', 'tools.oven.v1'], [140, 275, '1', 'tools.oven.v2'], [160, 325, '3', 'tools.oven.v3'], [180, 350, '4', 'tools.oven.v4'], [200, 400, '6', 'tools.oven.v5'], [220, 425, '7', 'tools.oven.v6'], [240, 475, '9', 'tools.oven.v7']];

function timersHtml() {
  const list = timers.list();
  return list.length
    ? list.map((x) => `<div class="tm${x.done ? ' done' : ''}${x.running ? ' run' : ''}"><div class="tm-b"><b>${esc(x.label)}</b><span class="tm-t" data-tm="${x.id}">${timers.fmt(x.left)}</span><i class="tm-bar"><s style="width:${((x.total - x.left) / x.total) * 100}%"></s></i></div>
      <div class="tm-a"><button class="icon-btn" data-act="tm-toggle" data-id="${x.id}" aria-label="${x.running ? t('cook.timer.pause') : t('cook.timer.start')}">${x.running ? icons.pause : icons.play}</button><button class="icon-btn" data-act="tm-reset" data-id="${x.id}" aria-label="${t('cook.timer.reset')}">${icons.clock}</button><button class="icon-btn" data-act="tm-remove" data-id="${x.id}" aria-label="${t('common.remove')}">${icons.trash}</button></div></div>`).join('')
    : `<p class="muted center">${t('tools.timers.empty')}</p>`;
}

function glossHtml() {
  const lang = currentLang();
  const q = norm(glossQ);
  let list = Object.values(ING);
  if (q) list = list.filter((i) => ['ru', 'en', 'es'].some((l) => [i.n[l], ...i.w[l]].some((w) => norm(w).split(' ').some((x) => x.startsWith(q)) || norm(w).startsWith(q))));
  const shown = list.slice(0, glossLimit);
  const other = (i, l) => {
    const alts = [...new Set(i.w[l].filter((w) => norm(w) !== norm(i.n[l])))].slice(0, 4);
    return alts.length ? `<small>${esc(alts.join(' · '))}</small>` : '';
  };
  return `${shown.map((i) => `<div class="gl"><span class="gl-e">${i.e}</span><div class="gl-b"><b>${esc(i.n[lang])}</b>
      <div class="gl-l ${lang === 'ru' ? 'cur' : ''}"><i>RU</i><span>${esc(i.n.ru)}</span>${lang === 'ru' ? other(i, 'ru') : ''}</div>
      <div class="gl-l ${lang === 'en' ? 'cur' : ''}"><i>EN</i><span>${esc(i.n.en.charAt(0).toUpperCase() + i.n.en.slice(1))}</span>${other(i, 'en')}</div>
      <div class="gl-l ${lang === 'es' ? 'cur' : ''}"><i>ES</i><span>${esc(i.n.es.charAt(0).toUpperCase() + i.n.es.slice(1))}</span>${other(i, 'es')}</div></div></div>`).join('')}
    ${list.length > glossLimit ? `<button class="btn ghost full" data-act="gloss-more">${t('rec.more', { n: Math.min(40, list.length - glossLimit) })}</button>` : ''}
    ${!list.length ? `<p class="muted center">${t('rec.nothing')}</p>` : ''}`;
}

function subsHtml() {
  const lang = currentLang();
  const q = norm(subsQ);
  const ids = Object.keys(SUBS).filter((id) => !q || ['ru', 'en', 'es'].some((l) => norm(ING[id].n[l]).includes(q) || ING[id].w[l].some((w) => norm(w).startsWith(q))));
  return ids.map((id) => `<div class="sb"><b>${ING[id].e} ${esc(ING[id].n[lang])}</b><p>${esc(SUBS[id][lang])}</p></div>`).join('') || `<p class="muted center">${t('rec.nothing')}</p>`;
}

export function render() {
  const lang = currentLang();
  let body = '';
  if (tab === 'timers') {
    body = `<div class="tm-presets">${PRESETS.map((m) => `<button class="chip" data-act="tm-add" data-m="${m}">${icons.timer}${t('common.min', { n: m })}</button>`).join('')}</div>
      <form class="composer" id="tm-form"><input id="tm-min" type="number" inputmode="numeric" min="1" max="600" placeholder="${t('tools.timers.custom')}" aria-label="${t('tools.timers.custom')}"><button class="btn primary" type="submit">${t('timers.start')}</button></form>
      <div id="timer-list" class="tm-list">${timersHtml()}</div>`;
  } else if (tab === 'convert') {
    const opts = (sel, units) => units.map((u) => `<option value="${u}"${u === sel ? ' selected' : ''}>${UNIT_NAMES[u]}</option>`).join('');
    const all = [...Object.keys(VOL), ...Object.keys(MASS)];
    body = `<div class="conv">
      <div class="conv-row"><input id="cv-v" type="number" inputmode="decimal" step="any" value="${conv.v}" aria-label="${t('tools.convert.value')}"><select id="cv-from" aria-label="${t('tools.convert.from')}">${opts(conv.from, all)}</select></div>
      <div class="conv-arrow">↓</div>
      <div class="conv-row"><output id="cv-out">${fmtNum(convert())}</output><select id="cv-to" aria-label="${t('tools.convert.to')}">${opts(conv.to, all)}</select></div>
      <label class="conv-ing">${t('tools.convert.ing')}<select id="cv-ing">${Object.keys(DENS).map((id) => `<option value="${id}"${id === conv.ing ? ' selected' : ''}>${esc(ING[id].n[lang])}</option>`).join('')}</select></label>
      <p class="muted small">${t('tools.convert.note')}</p>
      <h3 class="sub-h">${t('tools.temp')}</h3>
      <div class="conv-row"><input id="tp-c" type="number" inputmode="decimal" value="180" aria-label="°C"><span class="unit">°C</span><span class="eq-s">=</span><output id="tp-f">356</output><span class="unit">°F</span></div>
      <div class="oven">${OVEN.map(([c, f, g, k]) => `<div><b>${c} °C</b><span>${f} °F · ${t('tools.gas')} ${g}</span><em>${t(k)}</em></div>`).join('')}</div></div>`;
  } else if (tab === 'words') {
    body = `<p class="muted small">${t('tools.words.note')}</p><div class="search">${icons.search}<input id="gloss-q" type="search" value="${esc(glossQ)}" placeholder="${t('tools.words.placeholder')}" aria-label="${t('tools.words.placeholder')}" autocomplete="off"></div><div id="gloss-list" class="gl-list">${glossHtml()}</div>`;
  } else {
    body = `<div class="search">${icons.search}<input id="subs-q" type="search" value="${esc(subsQ)}" placeholder="${t('tools.subs.placeholder')}" aria-label="${t('tools.subs.placeholder')}" autocomplete="off"></div><div id="subs-list">${subsHtml()}</div>`;
  }
  return `<header class="top"><button class="back-link" data-act="back">${icons.back}${t('more.title')}</button><h1>${t('nav.tools')}</h1></header>
    <div class="seg wrap" role="tablist">${TABS.map((x) => `<button role="tab" aria-selected="${tab === x}" class="${tab === x ? 'on' : ''}" data-act="tools-tab" data-tab="${x}">${t(`tools.tab.${x}`)}</button>`).join('')}</div>
    <section>${body}</section>`;
}

export function paint() {
  if (tab !== 'timers') return;
  const box = document.getElementById('timer-list');
  if (!box) return;
  // Обновляем только числа, чтобы не мигали кнопки
  const list = timers.list();
  const ids = [...box.querySelectorAll('[data-tm]')].map((x) => Number(x.dataset.tm));
  if (ids.length !== list.length || list.some((x, i) => x.id !== ids[i]) || list.some((x) => box.querySelector(`.tm .tm-t[data-tm="${x.id}"]`).closest('.tm').classList.contains('run') !== x.running || box.querySelector(`[data-tm="${x.id}"]`).closest('.tm').classList.contains('done') !== x.done)) {
    box.innerHTML = timersHtml();
    return;
  }
  for (const x of list) {
    const el = box.querySelector(`[data-tm="${x.id}"]`);
    el.textContent = timers.fmt(x.left);
    el.closest('.tm').querySelector('.tm-bar s').style.width = `${((x.total - x.left) / x.total) * 100}%`;
  }
}

export function bind(root) {
  const tmForm = $('#tm-form', root);
  if (tmForm) tmForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = Number($('#tm-min').value);
    if (m > 0) { timers.start(t('tools.timers.label', { n: m }), Math.round(m * 60)); $('#tm-min').value = ''; store.set({}); }
  });
  const upd = () => {
    conv = { v: $('#cv-v').value, from: $('#cv-from').value, to: $('#cv-to').value, ing: $('#cv-ing').value };
    $('#cv-out').textContent = fmtNum(convert());
  };
  for (const id of ['cv-v', 'cv-from', 'cv-to', 'cv-ing']) { const el = $(`#${id}`, root); if (el) el.addEventListener('input', upd); }
  const tp = $('#tp-c', root);
  if (tp) { const f = () => { $('#tp-f').textContent = Math.round((Number(tp.value) * 9) / 5 + 32); }; tp.addEventListener('input', f); f(); }
  const g = $('#gloss-q', root);
  if (g) g.addEventListener('input', () => { glossQ = g.value; glossLimit = 40; $('#gloss-list').innerHTML = glossHtml(); });
  const sq = $('#subs-q', root);
  if (sq) sq.addEventListener('input', () => { subsQ = sq.value; $('#subs-list').innerHTML = subsHtml(); });
}

export function onClick(act, el) {
  switch (act) {
    case 'tools-tab': tab = el.dataset.tab; store.set({}); return true;
    case 'tm-add': timers.start(t('tools.timers.label', { n: el.dataset.m }), Number(el.dataset.m) * 60); store.set({}); return true;
    case 'tm-toggle': { const x = timers.list().find((y) => y.id === Number(el.dataset.id)); if (x) { if (x.done) timers.reset(x.id); else if (x.running) timers.pause(x.id); else timers.resume(x.id); } store.set({}); return true; }
    case 'tm-reset': timers.reset(Number(el.dataset.id)); store.set({}); return true;
    case 'tm-remove': timers.remove(Number(el.dataset.id)); store.set({}); return true;
    case 'gloss-more': glossLimit += 40; $('#gloss-list').innerHTML = glossHtml(); return true;
    default: return false;
  }
}
