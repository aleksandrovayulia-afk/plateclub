// Интерфейс музыки: мини-плеер над нижним меню (на всех экранах) и полный плеер с подборками, очередью и избранным.
import * as music from './music.js';
import * as store from './store.js';
import { t, currentLang } from './i18n.js';
import { icons, openSheet } from './ui.js';

const mini = () => document.getElementById('mini');
let panel = 'queue';
let sheetTick = null;

const lang = () => currentLang();
const title = (tr) => music.trackTitle(tr, lang());
const collName = (id) => t(`music.c.${id}`);
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const cover = (id, cls = '') => { const c = music.COLLECTIONS.find((x) => x.id === id); return `style="background:linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})"${cls ? ` class="${cls}"` : ''}`; };

/** Совместимость со старыми вызовами: включить/поставить на паузу */
export function setOn(on) {
  if (on) music.start(); else music.pause();
  store.set({ music: music.isActive() }, { silent: true });
}

/* ───────── мини-плеер ───────── */

export function paintMini() {
  const el = mini();
  if (!el) return;
  const active = music.isActive() && !document.body.classList.contains('no-tabs');
  document.body.classList.toggle('has-mini', active);
  el.hidden = !active;
  if (!active) { el.innerHTML = ''; return; }
  const tr = music.current(); const on = music.isOn(); const left = music.sleepLeft();
  el.innerHTML = `<button class="mini-cover" ${cover(tr.coll)} data-act="music-sheet" aria-label="${t('music.title')}"><span class="bars${on ? '' : ' off'}" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <button class="mini-t" data-act="music-sheet" aria-label="${t('music.title')}"><b>${esc(title(tr))}</b><small>${esc(collName(tr.coll))}${left ? ` · ${t('music.sleep.left', { n: left })}` : ''}</small></button>
    <button class="icon-btn" data-act="music-toggle" aria-label="${on ? t('music.pause') : t('music.play')}">${on ? icons.pause : icons.play}</button>
    <button class="icon-btn" data-act="music-next" aria-label="${t('music.next')}">${icons.skip}</button>
    <button class="icon-btn" data-act="music-close" aria-label="${t('music.off')}">${icons.close}</button>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ───────── полный плеер ───────── */

function trackRow(tr, { sub = '', now = false, next = false } = {}) {
  return `<li class="mt${now ? ' now' : ''}"><button class="mt-main" data-act="music-track" data-id="${tr.id}"><span class="mt-cover" ${cover(tr.coll)}></span><span class="mt-b"><b>${esc(title(tr))}</b><small>${esc(sub || collName(tr.coll))}</small></span><span class="mt-d">${mmss(tr.bars * (60 / tr.bpm) * 4)}</span></button>${next ? `<button class="icon-btn" data-act="music-qnext" data-id="${tr.id}" aria-label="${t('music.queue.next')}">${icons.plus}</button>` : ''}</li>`;
}

function listHtml() {
  const cur = music.current();
  if (panel === 'favs') {
    const f = music.favs().map((id) => music.TRACK_BY_ID[id]).filter(Boolean);
    return f.length ? `<ul class="mtl">${f.map((tr) => trackRow(tr, { now: tr.id === cur.id, next: true })).join('')}</ul>` : `<p class="muted small">${t('music.favs.empty')}</p>`;
  }
  if (panel === 'all') return `<ul class="mtl">${music.tracksOf(cur.coll).map((tr) => trackRow(tr, { now: tr.id === cur.id, next: true })).join('')}</ul>`;
  const q = music.getQueue(); const qi = music.queueIndex();
  const rest = q.length ? q.slice(qi + 1) : music.tracksOf(cur.coll).filter((x) => x.id !== cur.id);
  return rest.length ? `<ul class="mtl">${rest.map((tr) => trackRow(tr)).join('')}</ul>` : `<p class="muted small">${t('music.queue.empty')}</p>`;
}

function sheetHtml() {
  const s = store.get(); const m = s.music2;
  const tr = music.current(); const on = music.isOn(); const left = music.sleepLeft();
  const dur = music.duration(); const pos = music.position();
  const rep = m.repeat;
  return `<div class="mp">
    <div class="mp-cover" ${cover(tr.coll)}><span class="bars big${on ? '' : ' off'}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><small>${esc(collName(tr.coll))}</small></div>
    <div class="mp-title"><div><h2>${esc(title(tr))}</h2><p class="muted">${esc(t(`music.c.${tr.coll}.d`))}</p></div>
      <button class="icon-btn${music.isFav() ? ' on' : ''}" data-act="music-fav" aria-pressed="${music.isFav()}" aria-label="${t('music.fav')}">${icons.heart}</button></div>
    <div class="mp-prog"><span id="mp-pos">${mmss(pos)}</span><input id="mp-seek" type="range" min="0" max="1000" value="${dur ? Math.round((pos / dur) * 1000) : 0}" data-act="music-seek" aria-label="${t('music.progress')}"><span id="mp-dur">${mmss(dur)}</span></div>
    <div class="mp-ctl">
      <button class="icon-btn${m.shuffle ? ' on' : ''}" data-act="music-shuffle" aria-pressed="${m.shuffle}" aria-label="${t('music.shuffle')}">${icons.shuffle}</button>
      <button class="icon-btn big" data-act="music-prev" aria-label="${t('music.prev')}">${icons.skip}</button>
      <button class="btn primary round-lg" data-act="music-toggle" aria-label="${on ? t('music.pause') : t('music.play')}">${on ? icons.pause : icons.play}</button>
      <button class="icon-btn big" data-act="music-next" aria-label="${t('music.next')}">${icons.skip}</button>
      <button class="icon-btn${rep !== 'off' ? ' on' : ''}" data-act="music-repeat" aria-label="${t('music.repeat')}: ${t(`music.repeat.${rep}`)}">${icons.reset}<i class="rep">${rep === 'one' ? '1' : ''}</i></button>
    </div>
    <div class="mp-vol"><button class="icon-btn${music.isMuted() ? ' on' : ''}" data-act="music-mute" aria-pressed="${music.isMuted()}" aria-label="${t('music.mute')}">${icons.volume}</button><input type="range" min="0" max="100" value="${Math.round(music.getVolume() * 100)}" data-act="music-vol" aria-label="${t('music.volume')}"></div>
    <h3 class="sub-h">${t('music.collections')}</h3>
    <div class="fade-x"><div class="mc-row">${music.COLLECTIONS.map((c) => `<button class="mc-card${c.id === tr.coll ? ' on' : ''}" ${cover(c.id)} data-act="music-coll" data-id="${c.id}" aria-pressed="${c.id === tr.coll}"><b>${esc(collName(c.id))}</b></button>`).join('')}</div></div>
    <div class="seg" role="tablist"><button role="tab" class="${panel === 'queue' ? 'on' : ''}" data-act="music-panel" data-p="queue" aria-selected="${panel === 'queue'}">${t('music.queue')}</button><button role="tab" class="${panel === 'all' ? 'on' : ''}" data-act="music-panel" data-p="all" aria-selected="${panel === 'all'}">${t('music.tracks')}</button><button role="tab" class="${panel === 'favs' ? 'on' : ''}" data-act="music-panel" data-p="favs" aria-selected="${panel === 'favs'}">${t('music.favorites')}</button></div>
    <div id="mp-list">${listHtml()}</div>
    <h3 class="sub-h">${left ? t('music.sleep.left', { n: left }) : t('music.sleep')}</h3>
    <div class="seg" role="radiogroup">${[[0, t('music.sleep.off')], [15, '15'], [30, '30'], [60, '60']].map(([v, l]) => `<button role="radio" aria-checked="${(left === 0 && v === 0)}" class="${left === 0 && v === 0 ? 'on' : ''}" data-act="music-sleep" data-v="${v}">${l}</button>`).join('')}</div>
    <label class="switch"><input type="checkbox" data-act="music-cook" ${s.musicCook ? 'checked' : ''}><span class="knob"></span><span>${t('music.cook')}</span></label>
    <p class="muted small">${t('music.sub')}</p>
  </div>`;
}

export function openMusicSheet() {
  openSheet(sheetHtml(), { tall: true, onClose: () => { clearInterval(sheetTick); sheetTick = null; } });
  clearInterval(sheetTick);
  sheetTick = setInterval(() => {
    const seek = document.getElementById('mp-seek');
    if (!seek) { clearInterval(sheetTick); sheetTick = null; return; }
    if (document.activeElement !== seek) { const d = music.duration(); seek.value = d ? Math.round((music.position() / d) * 1000) : 0; }
    const p = document.getElementById('mp-pos'); if (p) p.textContent = mmss(music.position());
    const du = document.getElementById('mp-dur'); if (du) du.textContent = mmss(music.duration());
  }, 500);
}
const refreshSheet = () => {
  const sh = document.querySelector('#sheet-root.open .sheet');
  if (!sh || !sh.querySelector('.mp')) return;
  const top = sh.scrollTop; const html = sheetHtml();
  sh.querySelector('.mp').outerHTML = html; sh.scrollTop = top;
};

export function onClick(act, el) {
  switch (act) {
    case 'music-toggle': music.toggle(); store.set({ music: music.isActive() }, { silent: true }); return after();
    case 'music-sheet': openMusicSheet(); return true;
    case 'music-next': music.next(); return after();
    case 'music-prev': music.prev(); return after();
    case 'music-close': music.stop(); store.set({ music: false }, { silent: true }); return after();
    case 'music-coll': music.playCollection(el.dataset.id, 0); store.set({ music: true }, { silent: true }); return after();
    case 'music-track': music.playTrack(el.dataset.id); return after();
    case 'music-qnext': music.enqueueNext(el.dataset.id); return after();
    case 'music-fav': music.toggleFav(); return after();
    case 'music-shuffle': music.setShuffle(!store.get().music2.shuffle); return after();
    case 'music-repeat': music.setRepeat({ off: 'all', all: 'one', one: 'off' }[store.get().music2.repeat]); return after();
    case 'music-mute': music.setMuted(!music.isMuted()); return after();
    case 'music-panel': panel = el.dataset.p; return after();
    case 'music-sleep': music.setSleep(Number(el.dataset.v)); return after();
    default: return false;
  }
}
function after() { refreshSheet(); paintMini(); store.set({}); return true; }

export function setVolume(v) { music.setVolume(v); store.set({ musicVol: v }, { silent: true }); }

export function onInput(act, el) {
  if (act === 'music-vol') { setVolume(Number(el.value) / 100); return true; }
  if (act === 'music-seek') { const p = document.getElementById('mp-pos'); if (p) p.textContent = mmss((Number(el.value) / 1000) * music.duration()); return true; }
  return false;
}

export function onChange(act, el) {
  if (act === 'music-cook') { store.set({ musicCook: el.checked }, { silent: true }); return true; }
  if (act === 'music-seek') { music.seek(Number(el.value) / 1000); refreshSheet(); return true; }
  return false;
}

/** Применяет сохранённые настройки при запуске. Музыку сам по себе никто не включает */
export function init() {
  music.init2();
  music.subscribe(() => { paintMini(); });
}
