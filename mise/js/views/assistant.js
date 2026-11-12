// Мини-ИИ помощник: чат, который понимает продукты, настроение, время и технику на трёх языках
import { BY_ID, rtext } from '../engine.js';
import { answer, suggestions, isMoreText } from '../assistant-core.js';
import { t } from '../i18n.js';
import * as store from '../store.js';
import { esc, md, $, recipeRow, icons } from '../ui.js';
import { mascot, setMood, flash } from '../mascot.js';
import { ING } from '../data/ingredients.js';
import * as timers from '../timers.js';
import { fillWeek } from './plan.js';

let busy = false;
let lastQuery = '';
let page = 0;

function partHtml(p) {
  if (p.type === 'text') return `<div class="bubble a">${md(p.text)}</div>`;
  if (p.type === 'recipes') {
    return `<div class="bubble-list">${p.items.map((it) => {
      const r = BY_ID[it.id];
      return r ? recipeRow(r, { note: it.note ? esc(it.note) : '', best: it.best }) : '';
    }).join('')}</div>`;
  }
  if (p.type === 'link') return `<a class="btn small ai-link" href="${esc(p.href)}">${esc(p.label)} ${icons.chev}</a>`;
  if (p.type === 'chips') return `<div class="qchips">${p.items.map((x) => `<button class="chip small" data-act="ask" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
  return '';
}
const msgHtml = (m) => (m.r === 'u' ? `<div class="msg u"><div class="bubble u">${esc(m.text)}</div></div>` : `<div class="msg a"><span class="av">${mascot('idle', 34)}</span><div class="msg-c">${m.parts.map(partHtml).join('')}</div></div>`);
const typing = () => `<div class="msg a typing"><span class="av">${mascot('think', 34)}</span><div class="msg-c"><div class="bubble a"><i></i><i></i><i></i></div></div></div>`;

// Сохраняем разговор без языка: рецепты и подсказки перерисовываются на текущем языке
const greeting = () => ({ r: 'a', parts: answer('hello', { have: [], pantry: [], owned: [], diet: {}, cooked: {} }, 1).filter((p) => p.type !== 'chips') });

export function render(s) {
  const chat = s.chat.length ? s.chat : [greeting()];
  return `<header class="bot-head">${mascot('idle', 76, 'mc-lg')}<div><h1>${t('bot.name')}</h1><p class="sub" id="bot-status"><i class="live"></i>${t('bot.status')}</p></div></header>
    <div class="chat" id="chat" aria-live="polite">${chat.map(msgHtml).join('')}</div>
    <div class="composer-fixed">
      <div class="hscroll tight" id="suggest">${suggestions().map((x) => `<button class="chip small" data-act="ask" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <form id="chat-form" class="composer" autocomplete="off">
        ${micOk() ? `<button type="button" class="icon-btn mic" data-act="mic" aria-label="${t('bot.mic')}">${icons.mic}</button>` : ''}
        <input id="chat-input" type="text" enterkeyhint="send" placeholder="${t('ai.placeholder')}" aria-label="${t('ai.placeholder')}">
        <button class="btn primary round" type="submit" aria-label="${t('ai.send')}">${icons.send}</button>
      </form>
      ${s.chat.length ? `<button class="link clear-chat" data-act="chat-clear">${t('ai.clear')}</button>` : ''}
    </div>`;
}

const statusText = (txt) => { const el = $('#bot-status'); if (el) el.innerHTML = `<i class="live"></i>${txt}`; };
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const micOk = () => !!SR;
const VOICE = { ru: 'ru-RU', en: 'en-US', es: 'es-ES' };
function listen() {
  if (!SR) return;
  const rec = new SR();
  rec.lang = VOICE[document.documentElement.lang] || 'en-US';
  rec.interimResults = false;
  const btn = $('.mic');
  setMood(document, 'think'); statusText(t('bot.mic.listening')); if (btn) btn.classList.add('on');
  rec.onresult = (e) => { const v = e.results[0][0].transcript; send(v); };
  rec.onerror = () => { flash(document, 'sad'); statusText(t('bot.mic.fail')); };
  rec.onend = () => { if (btn) btn.classList.remove('on'); };
  try { rec.start(); } catch { /* уже запущено */ }
}

const scrollDown = () => requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));


// действия помощника: таймер, список покупок, план недели
function runActions(parts) {
  for (const p of parts) {
    if (p.type !== 'action') continue;
    if (p.kind === 'timer') timers.start(t('tools.timers.label', { n: p.min }), p.min * 60);
    if (p.kind === 'shop') {
      const next = [...store.get().shop];
      for (const id of p.ids) if (!next.some((x) => x.id === id && !x.done)) next.push({ id, qs: [], done: false });
      store.set({ shop: next }, { silent: true });
    }
    if (p.kind === 'plan') fillWeek();
    if (p.kind === 'shop-recipe') {
      const r = BY_ID[p.id]; const st = store.get();
      const next = [...st.shop];
      for (const x of r.ing) if (!x.opt && !st.pantry.includes(x.id) && ING[x.id] && !next.some((y) => y.id === x.id && !y.done)) next.push({ id: x.id, qs: [x.q], done: false });
      store.set({ shop: next }, { silent: true });
    }
  }
}

export function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  const s = store.get();
  const chat = $('#chat');
  const user = { r: 'u', text };
  chat.insertAdjacentHTML('beforeend', msgHtml(user));
  chat.insertAdjacentHTML('beforeend', typing());
  setMood(document, 'think'); statusText(t('bot.thinking'));
  scrollDown();
  const isMore = isMoreText(text);
  page = isMore ? page + 1 : 0;
  const parts = answer(text, { have: s.have, pantry: s.pantry, owned: s.owned, diet: s.diet, cooked: s.cooked, liked: s.ratings, last: lastQuery, page: page - 1 }, Math.floor(Math.random() * 100000));
  if (!isMore && parts.query) lastQuery = parts.query;
  setTimeout(() => {
    const el = chat.querySelector('.typing');
    if (el) el.remove();
    const msg = { r: 'a', parts };
    chat.insertAdjacentHTML('beforeend', msgHtml(msg));
    store.set((st) => ({ chat: [...(st.chat.length ? st.chat : [greeting()]), user, msg].slice(-40) }), { silent: true });
    busy = false;
    const mood = parts.find((p) => p.mood)?.mood || 'happy';
    flash(document, mood, 2200); statusText(t('bot.status'));
    runActions(parts);
    scrollDown();
  }, 380 + Math.random() * 280);
}

export function bind(root) {
  const form = $('#chat-form', root);
  const input = $('#chat-input', root);
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
}

export function onClick(act, el) {
  if (act === 'mic') { listen(); return true; }
  if (act === 'ask') { send(el.dataset.q); return true; }
  if (act === 'chat-clear') { lastQuery = ''; store.set({ chat: [] }); return true; }
  return false;
}
