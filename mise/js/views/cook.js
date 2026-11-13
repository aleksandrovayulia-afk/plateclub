// Режим приготовления: один шаг на экране, название действия, ингредиенты шага, таймер одним касанием,
// совет Моти, вопрос Моти с учётом шага, порции с пересчётом, озвучка и голосовой ввод. Прогресс сохраняется.
import { BY_ID, rtext, toFahrenheit, extractIngredients } from '../engine.js';
import { ING } from '../data/ingredients.js';
import { SUBS } from '../data/subs.js';
import { tipFor } from '../data/tips.js';
import { fmtQty } from '../qty.js';
import { t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import * as timers from '../timers.js';
import * as music from '../music.js';
import * as musicui from '../musicui.js';
import { buzz } from '../haptics.js';
import { esc, md, icons, openSheet, closeSheet, toast, timeLabel } from '../ui.js';
import { mascot, face, setMood, talk } from '../mascot.js';
import { contextAnswer } from '../assistant-ctx.js';

let cur = null; // { id, i, used[], skipped[], servings, shown[], tipOpen{}, done }
let wake = null;
const VOICE = { ru: 'ru-RU', en: 'en-US', es: 'es-ES' };
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const timerKey = (i = cur.i) => `${cur.id}:${i}`;

/* ───────── прогресс ───────── */

function persist() {
  if (!cur) return;
  const { id, ...rest } = cur;
  const all = { ...store.get().cookProgress };
  if (cur.done) delete all[id]; else all[id] = { ...rest, ts: Date.now() };
  store.set({ cookProgress: all }, { silent: true });
}

/** Сохранённый прогресс рецепта (не старше суток) */
export function progressOf(id) {
  const p = store.get().cookProgress?.[id];
  return p && Date.now() - p.ts < 86400000 ? p : null;
}
export function lastProgress() {
  const all = Object.entries(store.get().cookProgress || {}).filter(([, p]) => Date.now() - p.ts < 86400000).sort((a, b) => b[1].ts - a[1].ts);
  return all[0] ? { id: all[0][0], ...all[0][1] } : null;
}

export function start(id, { fresh = false } = {}) {
  if (cur && cur.id === id && !fresh) { acquireWake(); return; }
  const saved = fresh ? null : progressOf(id);
  const r = BY_ID[id];
  cur = saved ? { id, ...saved, done: false } : { id, i: 0, used: [], skipped: [], servings: r.srv, shown: [], tipOpen: {}, done: false };
  persist();
  acquireWake();
}
export const restart = (id) => { cur = null; start(id, { fresh: true }); };

export function stop() { releaseWake(); stopSpeech(); }

async function acquireWake() {
  try {
    if (store.get().wake && 'wakeLock' in navigator && !wake) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch { /* не поддерживается */ }
}
function releaseWake() { try { wake && wake.release(); } catch { /* */ } wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cur) acquireWake(); });

/* ───────── озвучка и голос ───────── */

function stopSpeech() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* */ } music.duck(false); talk(document, false); }
function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE[currentLang()]; u.rate = 0.95;
    u.onstart = () => { music.duck(true); talk(document, true); };
    u.onend = () => { music.duck(false); talk(document, false); };
    u.onerror = u.onend;
    window.speechSynthesis.speak(u);
  } catch { /* */ }
}

/* ───────── данные шага ───────── */

const lang = () => currentLang();
const stepsOf = (r) => rtext(r).steps;
const factor = (r) => (cur.servings || r.srv) / r.srv;

/** Короткое название действия: первая часть первого предложения */
function shortTitle(text) {
  const first = text.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, '');
  const part = first.split(/,\s|;\s|:\s| — /)[0];
  const cut = part.length > 64 ? `${part.slice(0, 61).replace(/\s\S*$/, '')}…` : part;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

const stepText = (r, s) => {
  const raw = stepsOf(r)[cur.i].text;
  return s.units === 'imperial' && lang() === 'en' ? toFahrenheit(raw) : raw;
};

function stepIngredients(r) {
  const ruText = rtext(r, 'ru').steps[cur.i].text;
  const ids = new Set([...extractIngredients(stepsOf(r)[cur.i].text).ids, ...extractIngredients(ruText).ids]);
  return r.ing.filter((x) => ids.has(x.id));
}

/* ───────── разметка ───────── */

const ingLine = (x, s, r, withCheck = false) => {
  const used = cur.used.includes(x.id);
  const qty = fmtQty(x.q, { scale: factor(r), imp: s.units === 'imperial' });
  const body = `<span class="ci-n">${ING[x.id].e} ${esc(ING[x.id].n[lang()])}${x.opt ? ` <em>${t('recipe.optional')}</em>` : ''}</span><span class="ci-q">${esc(qty)}</span>`;
  return withCheck
    ? `<li class="ci${used ? ' used' : ''}"><button data-act="cook-use" data-id="${x.id}" aria-pressed="${used}"><span class="ci-box">${used ? icons.check : ''}</span>${body}</button></li>`
    : `<li class="ci mini${used ? ' used' : ''}"><button data-act="cook-use" data-id="${x.id}" aria-pressed="${used}">${body}</button></li>`;
};

function timerBlock(r, step) {
  const items = [];
  const mine = step.min ? timers.find(timerKey()) : null;
  if (step.min) {
    if (!mine) items.push(`<button class="btn tbtn" data-act="cook-timer">${icons.timer} ${t('cook.timer.for', { time: timeLabel(step.min) })}</button>`);
    else items.push(`<div class="ctimer${mine.done ? ' done' : ''}${mine.running ? ' run' : ''}"><b class="ctimer-t" data-timer-big>${mine.done ? t('timers.done') : timers.fmt(mine.left)}</b>
      <span class="ctimer-a">${mine.done ? `<button class="btn small primary" data-act="timer-ack">${t('timers.stop')}</button>` : `<button class="icon-btn" data-act="timer-toggle" aria-label="${mine.running ? t('cook.timer.pause') : t('cook.timer.resume')}">${mine.running ? icons.pause : icons.play}</button>`}
      <button class="icon-btn" data-act="timer-reset" aria-label="${t('cook.timer.reset')}">${icons.reset}</button></span></div>`);
  }
  const others = timers.list().filter((x) => (x.running || x.done) && x.key !== timerKey());
  if (others.length) items.push(`<div class="cothers" data-others>${others.slice(0, 4).map((x) => `<a class="pill-timer${x.done ? ' done' : ''}" href="#/timers">${icons.timer}${esc(x.label.length > 26 ? `${x.label.slice(0, 24)}…` : x.label)} · ${x.done ? t('cook.timer.ready') : timers.fmt(x.left)}</a>`).join('')}</div>`);
  return items.length ? `<div class="cook-timers">${items.join('')}</div>` : '';
}

function tipBlock(r, s) {
  const ruText = rtext(r, 'ru').steps[cur.i].text;
  const tip = tipFor(ruText, cur.shown.filter((x) => x.i !== cur.i).map((x) => x.id));
  const miss = s.have.length ? stepIngredients(r).filter((x) => !x.opt && !s.have.includes(x.id) && !s.pantry.includes(x.id) && SUBS[x.id]) : [];
  if (!tip && !miss.length) return '';
  if (tip && !cur.shown.some((x) => x.i === cur.i)) cur.shown.push({ i: cur.i, id: tip.id });
  const open = !!cur.tipOpen[cur.i];
  const body = [tip ? `<p>${esc(tip[lang()])}</p>` : '', ...miss.slice(0, 2).map((x) => `<p class="tip-sub"><b>${esc(ING[x.id].n[lang()])}.</b> ${esc(SUBS[x.id][lang()])}</p>`)].join('');
  return `<div class="tipbox${open ? ' open' : ''}"><button class="tip-h" data-act="tip-toggle" aria-expanded="${open}">${face('assist', 30)}<b>${t('cook.tip')}</b><span class="tip-chev">${icons.chev}</span></button><div class="tip-b"${open ? '' : ' hidden'}>${body}</div></div>`;
}

export function render(s, id) {
  const r = BY_ID[id];
  if (!r) return `<p>${t('recipe.notfound')}</p>`;
  if (!cur || cur.id !== id) start(id);
  const tx = rtext(r);
  const total = tx.steps.length;

  if (cur.done) {
    return `<div class="cook finish">
      ${mascot('success', 130)}
      <h1>${t('cook.done.title')}</h1>
      <p class="sub">${t('cook.done.text', { title: esc(tx.t) })}</p>
      <div class="rate big" role="radiogroup" aria-label="${t('recipe.rate')}">${[1, 2, 3, 4, 5].map((v) => `<button class="star${v <= (s.ratings[id] || 0) ? ' on' : ''}" data-act="rate" data-id="${id}" data-v="${v}" role="radio" aria-label="${v}">${icons.star}</button>`).join('')}</div>
      <a class="btn primary big" href="#/r/${id}">${t('cook.done.back')}</a>
      <a class="btn ghost" href="#/fridge">${t('cook.done.more')}</a>
    </div>`;
  }

  const step = tx.steps[cur.i];
  const last = cur.i === total - 1;
  const ings = stepIngredients(r);
  const skipped = cur.skipped.includes(cur.i);
  if (s.voice) setTimeout(() => speak(stepText(r, s)), 150);

  const segs = total <= 16
    ? `<div class="cook-segs" role="group" aria-label="${t('cook.stepOf', { n: cur.i + 1, total })}">${tx.steps.map((_, k) => `<button class="seg-i${k < cur.i ? ' past' : ''}${k === cur.i ? ' cur' : ''}${cur.skipped.includes(k) ? ' skip' : ''}" data-act="goto-step" data-i="${k}" aria-label="${t('cook.step', { n: k + 1 })}"></button>`).join('')}</div>`
    : `<div class="cook-prog" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${cur.i + 1}"><i style="width:${((cur.i + 1) / total) * 100}%"></i></div>`;

  return `<div class="cook" data-swipe>
    <div class="cook-bar">
      <button class="icon-btn" data-act="cook-exit" aria-label="${t('cook.exit')}">${icons.close}</button>
      ${segs}
      <button class="icon-btn${music.isOn() ? ' on' : ''}" data-act="cook-music" aria-pressed="${music.isOn()}" aria-label="${t('cook.music')}">${icons.music}</button>
      <button class="icon-btn${s.voice ? ' on' : ''}" data-act="cook-voice" aria-pressed="${s.voice}" aria-label="${t('cook.voice')}">${icons.volume}</button>
    </div>
    <p class="cook-count"><span>${t('cook.stepOf', { n: cur.i + 1, total })} · ${esc(tx.t)}</span>${skipped ? `<em class="skipped">${t('cook.skipped')}</em>` : ''}</p>
    <h1 class="cook-h">${esc(shortTitle(step.text))}</h1>
    ${stepText(r, s).replace(/[.!?]$/, '') === shortTitle(step.text) || stepText(r, s).replace(/[.!?]$/, '').toLowerCase() === shortTitle(step.text).toLowerCase() ? '' : `<div class="cook-step"><p>${esc(stepText(r, s))}</p></div>`}
    ${timerBlock(r, step)}
    <section class="cook-ings" aria-label="${t('cook.ings.step')}">
      <div class="ci-head"><b>${ings.length ? t('cook.ings.step') : t('recipe.ings')}</b><button class="link" data-act="cook-ings">${t('cook.ings.all')} · ${t('common.servings', { n: cur.servings })}</button></div>
      ${ings.length ? `<ul class="ci-list">${ings.map((x) => ingLine(x, s, r)).join('')}</ul>` : ''}
    </section>
    ${tipBlock(r, s)}
    <div class="cook-sec">
      <button class="link" data-act="cook-repeat">${icons.reset} ${t('cook.repeat')}</button>
      <button class="link" data-act="cook-ask">${face('idle', 22)} ${t('cook.ask')}</button>
      ${last ? '' : `<button class="link" data-act="cook-skip">${t('cook.skip')}</button>`}
    </div>
    <div class="cook-nav">
      <button class="btn" data-act="cook-prev" ${cur.i === 0 ? 'disabled' : ''} aria-label="${t('cook.prev.full')}">${icons.back}<span>${t('common.back')}</span></button>
      <button class="btn primary" data-act="cook-next" aria-label="${last ? t('cook.finish.full') : t('cook.next.full')}">${last ? t('cook.finish') : t('cook.next')}</button>
    </div>
  </div>`;
}

/** Обновляет только таймеры, чтобы кнопки не мигали */
export function paint() {
  if (!cur || cur.done) return;
  const r = BY_ID[cur.id]; if (!r) return;
  const root = document.querySelector('.cook-timers');
  const step = stepsOf(r)[cur.i];
  const mine = step.min ? timers.find(timerKey()) : null;
  const sig = `${mine ? `${mine.running}${mine.done}` : 'x'}${timers.list().filter((x) => (x.running || x.done) && x.key !== timerKey()).map((x) => `${x.id}${x.done}`).join('')}`;
  const view = document.getElementById('view');
  if (view && view.dataset.csig !== sig) { view.dataset.csig = sig; store.set({}); return; }
  const big = document.querySelector('[data-timer-big]');
  if (big && mine && !mine.done) big.textContent = timers.fmt(mine.left);
  const others = document.querySelector('[data-others]');
  if (others) timers.list().filter((x) => (x.running || x.done) && x.key !== timerKey()).forEach((x, k) => { const a = others.children[k]; if (a && !x.done) a.lastChild.textContent = ` · ${timers.fmt(x.left)}`; });
  void root;
  setMood(document, timers.ringing().length ? 'success' : timers.running().length ? 'watch' : 'idle');
}

/* ───────── окна ───────── */

function ingredientsSheet(r, s) {
  openSheet(`<h2>${t('recipe.ings')}</h2>
    <div class="cs-serv"><span>${t('cook.servings')}</span><span class="stepper" role="group" aria-label="${t('cook.servings')}"><button data-act="cook-serv" data-d="-1" aria-label="−">${icons.minus}</button><span id="cs-n">${t('common.servings', { n: cur.servings })}</span><button data-act="cook-serv" data-d="1" aria-label="+">${icons.plus}</button></span></div>
    <p class="muted small">${t('cook.used.hint')}</p>
    <ul class="ci-list full" id="cs-list">${r.ing.map((x) => ingLine(x, s, r, true)).join('')}</ul>
    <button class="btn full" data-act="close-sheet">${t('common.done')}</button>`, { tall: true });
}

function askSheet(r) {
  const qs = [0, 1, 2, 3, 4, 5].map((i) => t(`cook.q${i}`));
  openSheet(`<div class="bot-sheet-h">${mascot('assist', 64)}<div><h2>${t('cook.ask.title')}</h2><p class="muted small">${t('cook.ask.sub', { n: cur.i + 1 })}</p></div></div>
    <div id="ask-log" class="ask-log" aria-live="polite"></div>
    <div class="qchips">${qs.map((q) => `<button class="chip small" data-act="cook-q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="composer" id="ask-form" autocomplete="off"><input id="ask-input" type="text" enterkeyhint="send" placeholder="${t('cook.ask.ph')}" aria-label="${t('cook.ask.ph')}">${SR ? `<button type="button" class="icon-btn mic" data-act="cook-mic" aria-label="${t('bot.mic')}">${icons.mic}</button>` : ''}<button class="btn primary round" type="submit" aria-label="${t('ai.send')}">${icons.send}</button></form>`, { tall: true });
  const form = document.getElementById('ask-form');
  form.addEventListener('submit', (e) => { e.preventDefault(); const i = document.getElementById('ask-input'); const v = i.value.trim(); i.value = ''; if (v) ask(v); });
}

function ask(text) {
  const r = BY_ID[cur.id]; const s = store.get();
  const log = document.getElementById('ask-log'); if (!log) return;
  log.insertAdjacentHTML('beforeend', `<div class="bubble u">${esc(text)}</div>`);
  const a = contextAnswer(text, { recipe: r, stepIndex: cur.i, servings: cur.servings, units: s.units }, lang());
  const reply = a ? md(a.text) : esc(t('cook.ask.none'));
  log.insertAdjacentHTML('beforeend', `<div class="bubble a">${reply}<small class="src">${t('src.local')}</small></div>`);
  log.scrollTop = log.scrollHeight;
  if (s.voice && a) speak(a.text.replace(/\*\*/g, ''));
}

function listen() {
  if (!SR) return;
  const rec = new SR(); rec.lang = VOICE[lang()]; rec.interimResults = false;
  const b = document.querySelector('.mic'); if (b) b.classList.add('on');
  rec.onresult = (e) => ask(e.results[0][0].transcript);
  rec.onerror = () => toast(t('bot.mic.fail'));
  rec.onend = () => { if (b) b.classList.remove('on'); };
  try { rec.start(); } catch { /* */ }
}

/* ───────── действия ───────── */

function go(i) { cur.i = i; persist(); stopSpeech(); store.set({}); }

export function onClick(act, el) {
  if (!cur) return false;
  const s = store.get(); const r = BY_ID[cur.id]; const steps = stepsOf(r); const n = steps.length;
  switch (act) {
    case 'cook-next':
      if (cur.i >= n - 1) { cur.done = true; persist(); store.set({ cooked: { ...s.cooked, [cur.id]: Date.now() } }); stopSpeech(); buzz('done'); }
      else { buzz('step'); go(cur.i + 1); }
      return true;
    case 'cook-prev': if (cur.i > 0) { buzz('back'); go(cur.i - 1); } return true;
    case 'cook-skip': if (!cur.skipped.includes(cur.i)) cur.skipped.push(cur.i); buzz('step'); go(Math.min(n - 1, cur.i + 1)); return true;
    case 'cook-repeat': { const m = timers.find(timerKey()); if (m) { timers.reset(m.id); } speak(stepText(r, s)); toast(t('cook.repeated')); store.set({}); return true; }
    case 'goto-step': go(Number(el.dataset.i)); return true;
    case 'cook-exit': { persist(); const id = cur.id; stop(); location.hash = `#/r/${id}`; return true; }
    case 'cook-voice': store.set({ voice: !s.voice }); if (s.voice) stopSpeech(); return true;
    case 'cook-music': musicui.setOn(!music.isOn()); store.set({}); buzz('tap'); return true;
    case 'tip-toggle': cur.tipOpen[cur.i] = !cur.tipOpen[cur.i]; persist(); store.set({}); return true;
    case 'cook-use': {
      const id = el.dataset.id; cur.used = cur.used.includes(id) ? cur.used.filter((x) => x !== id) : [...cur.used, id]; persist();
      if (document.querySelector('#sheet-root.open')) { const list = document.getElementById('cs-list'); if (list) list.innerHTML = r.ing.map((x) => ingLine(x, s, r, true)).join(''); }
      else store.set({});
      return true;
    }
    case 'cook-ings': ingredientsSheet(r, s); return true;
    case 'cook-serv': {
      cur.servings = Math.max(1, Math.min(24, (cur.servings || r.srv) + Number(el.dataset.d))); persist();
      const nEl = document.getElementById('cs-n'); if (nEl) nEl.textContent = t('common.servings', { n: cur.servings });
      const list = document.getElementById('cs-list'); if (list) list.innerHTML = r.ing.map((x) => ingLine(x, s, r, true)).join('');
      return true;
    }
    case 'cook-ask': askSheet(r); return true;
    case 'cook-q': ask(el.dataset.q); return true;
    case 'cook-mic': listen(); return true;
    case 'cook-timer': { const step = steps[cur.i]; buzz('start'); timers.start(`${rtext(r).t} · ${t('cook.step', { n: cur.i + 1 })}`, step.min * 60, timerKey(), { recipe: cur.id }); toast(t('timers.started')); store.set({}); return true; }
    case 'timer-toggle': { const m = timers.find(timerKey()); if (m) { if (m.running) timers.pause(m.id); else timers.resume(m.id); } store.set({}); return true; }
    case 'timer-reset': { const m = timers.find(timerKey()); if (m) timers.remove(m.id); store.set({}); return true; }
    case 'timer-ack': { const m = timers.find(timerKey()); if (m) { timers.ack(m.id); timers.remove(m.id); } store.set({}); return true; }
    default: return false;
  }
}

export function bind(root) {
  const el = root.querySelector('[data-swipe]');
  setMood(root, timers.running().length ? 'watch' : 'idle');
  if (!el) return;
  let x0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 80) return;
    onClick(dx < 0 ? 'cook-next' : 'cook-prev', el);
  }, { passive: true });
}

export function onKey(e) {
  if (!cur || cur.done || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight') onClick('cook-next', document.body);
  else if (e.key === 'ArrowLeft') onClick('cook-prev', document.body);
}

export const active = () => !!cur;
/** Для помощника: что сейчас готовится и на каком шаге */
export const context = () => (cur && !cur.done ? { id: cur.id, i: cur.i, servings: cur.servings } : (lastProgress() ? { id: lastProgress().id, i: lastProgress().i, servings: lastProgress().servings } : null));
export { closeSheet };
