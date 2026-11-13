// Таймеры и секундомер: отдельный экран для кухни. Любое число таймеров, круговой индикатор, круги секундомера.
import * as timers from '../timers.js';
import { t } from '../i18n.js';
import * as store from '../store.js';
import { esc, $, icons, openSheet, closeSheet, toast } from '../ui.js';
import { mascot, setMood } from '../mascot.js';

let tab = 'timer';
let swTimer = null;
const R = 88; const C = 2 * Math.PI * R;

const dialOf = (list) => list.find((x) => x.running) || list.find((x) => !x.done && x.left < x.total) || list.find((x) => !x.done) || list[0] || null;
const mm = (sec) => Math.floor(sec / 60);

function ring(x, size = 240) {
  const prog = x ? timers.progress(x) : 0;
  const cls = x?.done ? ' done' : x?.running ? ' run' : '';
  return `<div class="dial${cls}" style="--sz:${size}px" ${x ? `data-dial="${x.id}"` : ''}>
    <svg viewBox="0 0 200 200" aria-hidden="true"><circle class="dial-bg" cx="100" cy="100" r="${R}"/><circle class="dial-fg" cx="100" cy="100" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * prog).toFixed(1)}"/></svg>
    <div class="dial-c"><b class="dial-t" data-tm-big>${timers.fmt(x ? x.left : 0)}</b><span class="dial-l">${x ? esc(x.label) : t('timers.none')}</span></div>
  </div>`;
}

function card(x) {
  return `<li class="tcard${x.done ? ' done' : ''}${x.running ? ' run' : ''}" data-tc="${x.id}">
    <button class="tc-main" data-act="tm-edit" data-id="${x.id}" aria-label="${t('timers.edit')}"><b>${esc(x.label)}</b><span class="tc-t" data-tm="${x.id}">${x.done ? t('timers.done') : timers.fmt(x.left)}</span><i class="tm-bar"><s style="width:${(timers.progress(x) * 100).toFixed(1)}%"></s></i></button>
    <div class="tc-a">
      ${x.done ? `<button class="btn small primary" data-act="tm-ack" data-id="${x.id}">${timers.ringing().includes(x) ? t('timers.stop') : t('cook.timer.reset')}</button>`
        : `<button class="icon-btn" data-act="tm-toggle" data-id="${x.id}" aria-label="${x.running ? t('cook.timer.pause') : t('timers.start')}">${x.running ? icons.pause : icons.play}</button>`}
      <button class="icon-btn" data-act="tm-bump" data-id="${x.id}" aria-label="+1 ${t('timers.min')}">+1</button>
      <button class="icon-btn" data-act="tm-reset" data-id="${x.id}" aria-label="${t('cook.timer.reset')}">${icons.reset}</button>
      <button class="icon-btn" data-act="tm-del" data-id="${x.id}" aria-label="${t('common.remove')}">${icons.close}</button>
    </div>
  </li>`;
}

function timerTab() {
  const list = timers.list();
  const d = dialOf(list);
  const x = d;
  const missed = list.some((y) => y.missed && y.done);
  const snd = timers.sound();
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  return `<div class="dial-wrap">${ring(x)}
      ${x ? `<div class="dial-ctl"><button class="icon-btn big" data-act="tm-reset" data-id="${x.id}" aria-label="${t('cook.timer.reset')}">${icons.reset}</button>
        ${x.done ? `<button class="btn primary round-lg" data-act="tm-ack" data-id="${x.id}" aria-label="${t('timers.stop')}">${icons.check}</button>` : `<button class="btn primary round-lg" data-act="tm-toggle" data-id="${x.id}" aria-label="${x.running ? t('cook.timer.pause') : t('timers.start')}">${x.running ? icons.pause : icons.play}</button>`}
        <button class="icon-btn big" data-act="tm-bump" data-id="${x.id}" aria-label="+1 ${t('timers.min')}">+1</button></div>` : ''}
    </div>
    ${missed ? `<p class="note warn small">${t('timers.missed')}</p>` : ''}
    <h3 class="sub-h">${t('timers.quick')}</h3>
    <div class="tm-presets">${timers.PRESETS.map((m) => `<button class="chip" data-act="tm-quick" data-m="${m}">${m === 60 ? t('common.hour', { h: 1 }) : t('common.min', { n: m })}</button>`).join('')}</div>
    <h3 class="sub-h">${t('timers.new')}</h3>
    <form class="tnew" id="tm-form" autocomplete="off">
      <input id="tm-name" type="text" placeholder="${t('timers.name.ph')}" aria-label="${t('timers.name')}" maxlength="40">
      <label class="tnum"><input id="tm-m" type="number" inputmode="numeric" min="0" max="599" placeholder="0" aria-label="${t('timers.min')}"><span>${t('timers.min')}</span></label>
      <label class="tnum"><input id="tm-s" type="number" inputmode="numeric" min="0" max="59" placeholder="0" aria-label="${t('timers.sec')}"><span>${t('timers.sec')}</span></label>
      <button class="btn primary" type="submit">${t('timers.start')}</button>
    </form>
    ${list.length ? `<h3 class="sub-h">${t('timers.all')} <span class="count">${list.length}</span></h3><ul class="tlist" id="timer-list">${list.map(card).join('')}</ul>` : ''}
    <h3 class="sub-h">${t('timers.sound')}</h3>
    <div class="snd-row"><select id="tm-snd" data-act="tm-snd" aria-label="${t('timers.sound')}">${timers.SOUNDS.map((k) => `<option value="${k}"${k === snd ? ' selected' : ''}>${t(`timers.sound.${k}`)}</option>`).join('')}</select>
      <button class="btn small" data-act="tm-test">${icons.volume} ${t('timers.test')}</button>
      ${perm === 'granted' ? `<span class="muted small">${t('timers.notify.on')}</span>` : perm === 'denied' ? `<span class="muted small">${t('timers.notify.denied')}</span>` : `<button class="btn small" data-act="tm-notify">${t('timers.notify')}</button>`}</div>
    <p class="muted small">${t('timers.hint')}</p>`;
}

function stopwatchTab() {
  const s = timers.sw.state();
  const e = timers.sw.elapsed();
  const laps = s.laps;
  const parts = laps.map((v, i) => v - (laps[i - 1] || 0));
  const best = parts.length > 1 ? Math.min(...parts) : null; const worst = parts.length > 1 ? Math.max(...parts) : null;
  return `<div class="sw"><b class="sw-t" id="sw-t">${timers.fmtMs(e)}</b>
    <div class="dial-ctl"><button class="btn round-lg ghost" data-act="sw-lap" ${s.running ? '' : 'disabled'} aria-label="${t('sw.lap')}">${t('sw.lap')}</button>
      <button class="btn primary round-lg" data-act="sw-toggle" aria-label="${s.running ? t('sw.pause') : e ? t('sw.resume') : t('sw.start')}">${s.running ? icons.pause : icons.play}</button>
      <button class="btn round-lg ghost" data-act="sw-reset" ${e ? '' : 'disabled'} aria-label="${t('sw.reset')}">${t('sw.reset')}</button></div></div>
    ${laps.length ? `<h3 class="sub-h">${t('sw.laps')}</h3><ol class="laps">${[...parts.keys()].reverse().map((i) => `<li class="${parts[i] === best ? 'best' : parts[i] === worst ? 'worst' : ''}"><span>${t('sw.lap.n', { n: i + 1 })}</span><b>${timers.fmtMs(parts[i])}</b><small>${timers.fmtMs(laps[i])}</small></li>`).join('')}</ol>` : ''}`;
}

export function render() {
  const d = dialOf(timers.list());
  return `<header class="top"><button class="back-link" data-act="back">${icons.back}${t('more.title')}</button>
    <div class="top-row"><div><h1>${t('timers.title')}</h1></div><span class="top-moti">${mascot(d?.done ? 'success' : d?.running ? 'watch' : 'idle', 64)}</span></div></header>
    <div class="seg" role="tablist"><button role="tab" aria-selected="${tab === 'timer'}" class="${tab === 'timer' ? 'on' : ''}" data-act="tm-tab" data-tab="timer">${t('timers.tab.timer')}</button><button role="tab" aria-selected="${tab === 'sw'}" class="${tab === 'sw' ? 'on' : ''}" data-act="tm-tab" data-tab="sw">${t('timers.tab.stopwatch')}</button></div>
    <div class="tbody">${tab === 'timer' ? timerTab() : stopwatchTab()}</div>`;
}

/** Обновляет только цифры и кольца, чтобы не мигали кнопки; структура меняется через полную перерисовку */
export function paint() {
  const root = document.getElementById('view');
  if (!root || root.dataset.route !== 'timers' || tab !== 'timer') return;
  const list = timers.list();
  const sig = list.map((x) => `${x.id}${x.running ? 'r' : ''}${x.done ? 'd' : ''}${x.ack ? 'a' : ''}`).join(',');
  if (root.dataset.sig !== sig) { root.dataset.sig = sig; store.set({}); return; }
  for (const x of list) {
    const el = root.querySelector(`[data-tm="${x.id}"]`);
    if (el && !x.done) el.textContent = timers.fmt(x.left);
    const bar = root.querySelector(`[data-tc="${x.id}"] .tm-bar s`); if (bar) bar.style.width = `${(timers.progress(x) * 100).toFixed(1)}%`;
  }
  const d = dialOf(list); const dial = root.querySelector('.dial');
  if (d && dial) { dial.querySelector('[data-tm-big]').textContent = timers.fmt(d.left); dial.querySelector('.dial-fg').setAttribute('stroke-dashoffset', (C * timers.progress(d)).toFixed(1)); }
}

export function bind(root) {
  root.dataset.sig = timers.list().map((x) => `${x.id}${x.running ? 'r' : ''}${x.done ? 'd' : ''}${x.ack ? 'a' : ''}`).join(',');
  clearInterval(swTimer); swTimer = null;
  if (tab === 'sw' && timers.sw.state().running) swTimer = setInterval(() => { const el = document.getElementById('sw-t'); if (!el) { clearInterval(swTimer); return; } el.textContent = timers.fmtMs(timers.sw.elapsed()); }, 50);
  const form = $('#tm-form', root);
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const sec = (Number($('#tm-m').value) || 0) * 60 + (Number($('#tm-s').value) || 0);
    if (sec < 1) { $('#tm-m').focus(); return; }
    const name = $('#tm-name').value.trim() || t('tools.timers.label', { n: Math.max(1, Math.round(sec / 60)) });
    timers.start(name, sec);
    toast(t('timers.started'));
  });
  setMood(root, timers.ringing().length ? 'success' : timers.running().length ? 'watch' : 'idle');
}

function editSheet(id) {
  const x = timers.get(id); if (!x) return;
  openSheet(`<h2>${t('timers.edit')}</h2>
    <label class="field"><span>${t('timers.name')}</span><input id="te-name" type="text" value="${esc(x.label)}" maxlength="40"></label>
    <div class="field-row"><label class="field"><span>${t('timers.min')}</span><input id="te-m" type="number" inputmode="numeric" min="0" max="599" value="${mm(x.total)}"></label>
      <label class="field"><span>${t('timers.sec')}</span><input id="te-s" type="number" inputmode="numeric" min="0" max="59" value="${x.total % 60}"></label></div>
    <label class="field"><span>${t('timers.sound')}</span><select id="te-snd"><option value="">${t('timers.sound.default')}</option>${timers.SOUNDS.map((k) => `<option value="${k}"${x.sound === k ? ' selected' : ''}>${t(`timers.sound.${k}`)}</option>`).join('')}</select></label>
    <div class="row"><button class="btn" data-act="close-sheet">${t('common.cancel')}</button><button class="btn primary" data-act="tm-save" data-id="${id}">${t('timers.save')}</button></div>`);
}

export function onClick(act, el) {
  const id = Number(el.dataset.id);
  switch (act) {
    case 'tm-tab': tab = el.dataset.tab; store.set({}); return true;
    case 'tm-quick': timers.start(t('tools.timers.label', { n: Number(el.dataset.m) }), Number(el.dataset.m) * 60); toast(t('timers.started')); return true;
    case 'tm-toggle': { const x = timers.get(id); if (!x) return true; if (x.running) timers.pause(id); else if (x.done) timers.start(x.label, x.total, x.key); else timers.start(x.label, x.left, x.key); store.set({}); return true; }
    case 'tm-bump': timers.bump(id, 60); return true;
    case 'tm-reset': timers.reset(id); store.set({}); return true;
    case 'tm-del': timers.remove(id); store.set({}); return true;
    case 'tm-ack': { const x = timers.get(id); if (x?.done && timers.ringing().includes(x)) timers.ack(id); else timers.reset(id); store.set({}); return true; }
    case 'tm-edit': editSheet(id); return true;
    case 'tm-save': {
      const sec = (Number($('#te-m').value) || 0) * 60 + (Number($('#te-s').value) || 0);
      timers.edit(id, { seconds: sec > 0 ? sec : null, label: $('#te-name').value.trim() || undefined, snd: $('#te-snd').value || null });
      closeSheet(); store.set({}); return true;
    }
    case 'tm-test': timers.unlockAudio(); timers.playSound(); return true;
    case 'tm-notify': Notification.requestPermission().then(() => store.set({})); return true;
    case 'sw-toggle': { const s = timers.sw.state(); if (s.running) timers.sw.pause(); else timers.sw.start(); store.set({}); return true; }
    case 'sw-lap': timers.sw.lap(); store.set({}); return true;
    case 'sw-reset': timers.sw.reset(); store.set({}); return true;
    default: return false;
  }
}

export function onChange(act, el) {
  if (act === 'tm-snd') { store.set({ alarm: el.value }, { silent: true }); timers.unlockAudio(); timers.playSound(el.value); return true; }
  return false;
}
