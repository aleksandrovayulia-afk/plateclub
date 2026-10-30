// Интерфейс музыки: мини-плеер над нижним меню, шторка со стилями, громкостью и таймером сна.
import * as music from './music.js';
import * as store from './store.js';
import { t } from './i18n.js';
import { icons, openSheet } from './ui.js';

let sleepChoice = 0;
const mini = () => document.getElementById('mini');
const styleName = (s) => t(`music.style.${s}`);

/** Включить/выключить и запомнить выбор (и при следующем запуске музыка включится после первого касания) */
export function setOn(on) {
  if (!on) sleepChoice = 0;
  on ? music.start() : music.stop();
  store.set({ music: music.isOn() }, { silent: true });
}

export function paintMini() {
  const el = mini();
  if (!el) return;
  const on = music.isOn();
  document.body.classList.toggle('has-mini', on && !document.body.classList.contains('no-tabs'));
  el.hidden = !on || document.body.classList.contains('no-tabs');
  if (el.hidden) { el.innerHTML = ''; return; }
  const left = music.sleepLeft();
  el.innerHTML = `<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>
    <button class="mini-t" data-act="music-sheet" aria-label="${t('music.title')}"><b>${styleName(music.getStyle())}</b><small>${left ? t('music.sleep.left', { n: left }) : t('music.title')}</small></button>
    <button class="icon-btn" data-act="music-next" aria-label="${t('music.next')}">${icons.skip}</button>
    <button class="icon-btn on" data-act="music-toggle" aria-label="${t('music.off')}">${icons.pause}</button>`;
}

function sheetHtml() {
  const s = store.get();
  const on = music.isOn();
  const left = music.sleepLeft();
  return `<h2>${t('music.title')}</h2><p class="muted">${t('music.sub')}</p>
    <div class="style-list" role="radiogroup" aria-label="${t('music.title')}">${music.STYLES.map((id) => `<button role="radio" aria-checked="${music.getStyle() === id}" class="style-i${music.getStyle() === id ? ' on' : ''}" data-act="music-style" data-v="${id}"><span class="style-b"><b>${styleName(id)}</b><span>${t(`music.style.${id}.d`)}</span></span>${music.getStyle() === id ? icons.check : ''}</button>`).join('')}</div>
    <label class="range"><span>${t('music.volume')}</span><input type="range" min="0" max="100" value="${Math.round(music.getVolume() * 100)}" data-act="music-vol" aria-label="${t('music.volume')}"></label>
    <h3 class="sub-h">${left ? t('music.sleep.left', { n: left }) : t('music.sleep')}</h3>
    <div class="seg" role="radiogroup">${[[0, t('music.sleep.off')], [15, '15'], [30, '30'], [60, '60']].map(([v, l]) => `<button role="radio" aria-checked="${sleepChoice === v}" class="${sleepChoice === v ? 'on' : ''}" data-act="music-sleep" data-v="${v}">${l}</button>`).join('')}</div>
    <label class="switch"><input type="checkbox" data-act="music-cook" ${s.musicCook ? 'checked' : ''}><span class="knob"></span><span>${t('music.cook')}</span></label>
    <button class="btn ${on ? 'ghost' : 'primary'} full" data-act="music-toggle" style="margin-top:16px">${on ? icons.pause : icons.play} ${on ? t('music.off') : t('music.on')}</button>`;
}

export function openMusicSheet() { openSheet(sheetHtml()); }
const refreshSheet = () => { const sh = document.querySelector('#sheet-root.open .sheet'); if (sh && sh.querySelector('.style-list')) openSheet(sheetHtml()); };

export function onClick(act, el) {
  switch (act) {
    case 'music-toggle': setOn(!music.isOn()); store.set({}); refreshSheet(); return true;
    case 'music-sheet': openMusicSheet(); return true;
    case 'music-style': music.setStyle(el.dataset.v); store.set({ musicStyle: el.dataset.v }, { silent: true }); if (!music.isOn()) setOn(true); refreshSheet(); return true;
    case 'music-next': { const i = music.STYLES.indexOf(music.getStyle()); const n = music.STYLES[(i + 1) % music.STYLES.length]; music.setStyle(n); store.set({ musicStyle: n }, { silent: true }); return true; }
    case 'music-sleep': sleepChoice = Number(el.dataset.v); music.setSleep(sleepChoice); refreshSheet(); return true;
    default: return false;
  }
}

export function setVolume(v) { music.setVolume(v); store.set({ musicVol: v }, { silent: true }); }

export function onInput(act, el) {
  if (act !== 'music-vol') return false;
  const v = Number(el.value) / 100;
  music.setVolume(v);
  store.set({ musicVol: v }, { silent: true });
  return true;
}

export function onChange(act, el) {
  if (act === 'music-cook') { store.set({ musicCook: el.checked }, { silent: true }); return true; }
  return false;
}

/** Применяет сохранённые настройки при запуске */
export function init() {
  const s = store.get();
  music.setVolume(s.musicVol ?? 0.5);
  music.setStyle(s.musicStyle || 'jazz');
  music.subscribe(paintMini);
}
