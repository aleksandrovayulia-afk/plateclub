// Настройки: язык, единицы, тема, размер текста, данные
import { LANGS, t, currentLang } from '../i18n.js';
import * as store from '../store.js';
import * as music from '../music.js';
import { buzz } from '../haptics.js';
import { icons, toast, openSheet, closeSheet } from '../ui.js';

export function render(s) {
  const lang = currentLang();
  const seg = (name, value, items) => `<div class="seg" role="radiogroup">${items.map(([v, l]) => `<button role="radio" aria-checked="${value === v}" class="${value === v ? 'on' : ''}" data-act="set-${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
  return `<header class="top"><button class="back-link" data-act="back">${icons.back}${t('more.title')}</button><h1>${t('settings.title')}</h1></header>

    <h2 class="sec">${t('settings.language')}</h2>
    <div class="lang-list" role="radiogroup">${LANGS.map((l) => `<button role="radio" aria-checked="${lang === l.id}" class="lang-i${lang === l.id ? ' on' : ''}" data-act="set-lang" data-v="${l.id}"><b>${l.name}</b><span>${t(`settings.lang.${l.id}`)}</span>${lang === l.id ? icons.check : ''}</button>`).join('')}</div>
    <p class="muted small">${t('settings.language.note')}</p>

    <h2 class="sec">${t('settings.units')}</h2>
    ${seg('units', s.units, [['metric', t('settings.units.metric')], ['imperial', t('settings.units.imperial')]])}

    <h2 class="sec">${t('settings.theme')}</h2>
    ${seg('theme', s.theme, [['auto', t('settings.theme.auto')], ['light', t('settings.theme.light')], ['dark', t('settings.theme.dark')]])}

    <h2 class="sec">${t('settings.size')}</h2>
    ${seg('size', s.textSize, [['s', 'A'], ['m', 'A+'], ['l', 'A++']])}

    <h2 class="sec">${t('settings.cooking')}</h2>
    <label class="switch"><input type="checkbox" data-act="opt-wake" ${s.wake ? 'checked' : ''}><span class="knob"></span><span>${t('settings.wake')}</span></label>
    <label class="switch"><input type="checkbox" data-act="opt-voice" ${s.voice ? 'checked' : ''}><span class="knob"></span><span>${t('settings.voice')}</span></label>
    <label class="switch"><input type="checkbox" data-act="opt-haptics" ${s.haptics ? 'checked' : ''}><span class="knob"></span><span>${t('settings.haptics')}</span></label>
    <p class="muted small">${t('settings.haptics.note')}</p>
    <h2 class="sec">${t('settings.music')}</h2>
    <label class="switch"><input type="checkbox" data-act="opt-music" ${s.music ? 'checked' : ''}><span class="knob"></span><span>${t('settings.music')}</span></label>
    ${seg('vol', String(s.musicVol), [['0.25', t('vol.low')], ['0.5', t('vol.mid')], ['0.8', t('vol.high')]])}
    <p class="muted small">${t('settings.music.note')}</p>

    <h2 class="sec">${t('settings.data')}</h2>
    <div class="plan-actions"><button class="btn" data-act="data-export">${icons.download} ${t('settings.export')}</button><label class="btn file">${icons.upload} ${t('settings.import')}<input type="file" accept="application/json,.json" id="import-file" hidden></label></div>
    <p class="muted small">${t('settings.data.note')}</p>
    <button class="link danger" data-act="reset">${t('settings.reset')}</button>
    <p class="muted small">${t('settings.credits')}</p>
    <p class="muted small center about-line">${t('settings.about')}</p>`;
}

export function bind(root) {
  const f = root.querySelector('#import-file');
  if (f) f.addEventListener('change', async () => {
    try { store.importData(await f.files[0].text()); toast(t('settings.imported')); } catch { toast(t('settings.import.fail')); }
  });
}

export function onClick(act, el) {
  const s = store.get();
  switch (act) {
    case 'set-units': store.set({ units: el.dataset.v }); return true;
    case 'set-theme': store.set({ theme: el.dataset.v }); return true;
    case 'set-vol': { const v = Number(el.dataset.v); music.setVolume(v); store.set({ musicVol: v }); return true; }
    case 'set-size': store.set({ textSize: el.dataset.v }); return true;
    case 'data-export': {
      const blob = new Blob([store.exportData()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mise-backup.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return true;
    }
    case 'reset':
      openSheet(`<h2>${t('settings.reset.title')}</h2><p class="muted">${t('settings.reset.text')}</p><div class="row"><button class="btn" data-act="close-sheet">${t('common.cancel')}</button><button class="btn danger" data-act="reset-yes">${t('settings.reset')}</button></div>`);
      return true;
    case 'reset-yes': closeSheet(); store.reset(); toast(t('settings.reset.done')); return true;
    default: return !!s && false;
  }
}

export function onChange(act, el) {
  if (act === 'opt-wake') { store.set({ wake: el.checked }); return true; }
  if (act === 'opt-haptics') { store.set({ haptics: el.checked }); if (el.checked) buzz('done'); return true; }
  if (act === 'opt-music') { store.set({ music: el.checked }); el.checked ? music.start() : music.stop(); return true; }
  if (act === 'opt-voice') { store.set({ voice: el.checked }); return true; }
  return false;
}
