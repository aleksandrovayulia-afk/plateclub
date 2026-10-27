// Мини-ИИ помощник: чат, который понимает продукты, настроение, время и технику на трёх языках
import { BY_ID, rtext } from '../engine.js';
import { answer, suggestions } from '../assistant-core.js';
import { t } from '../i18n.js';
import * as store from '../store.js';
import { esc, md, $, recipeRow, icons } from '../ui.js';

let busy = false;
let lastQuery = '';

function partHtml(p) {
  if (p.type === 'text') return `<div class="bubble a">${md(p.text)}</div>`;
  if (p.type === 'recipes') {
    return `<div class="bubble-list">${p.items.map((it) => {
      const r = BY_ID[it.id];
      return r ? recipeRow(r, { note: it.note ? esc(it.note) : '', best: it.best }) : '';
    }).join('')}</div>`;
  }
  if (p.type === 'chips') return `<div class="qchips">${p.items.map((x) => `<button class="chip small" data-act="ask" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
  return '';
}
const msgHtml = (m) => (m.r === 'u' ? `<div class="msg u"><div class="bubble u">${esc(m.text)}</div></div>` : `<div class="msg a">${m.parts.map(partHtml).join('')}</div>`);
const typing = '<div class="msg a typing"><div class="bubble a"><i></i><i></i><i></i></div></div>';

// Сохраняем разговор без языка: рецепты и подсказки перерисовываются на текущем языке
const greeting = () => ({ r: 'a', parts: answer('hello', { have: [], pantry: [], owned: [], diet: {}, cooked: {} }, 1) });

export function render(s) {
  const chat = s.chat.length ? s.chat : [greeting()];
  return `<header class="top compact"><h1>${t('ai.title')}</h1><p class="sub">${t('ai.sub')}</p></header>
    <div class="chat" id="chat" aria-live="polite">${chat.map(msgHtml).join('')}</div>
    <div class="composer-fixed">
      <div class="hscroll tight" id="suggest">${suggestions().map((x) => `<button class="chip small" data-act="ask" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <form id="chat-form" class="composer" autocomplete="off">
        <input id="chat-input" type="text" enterkeyhint="send" placeholder="${t('ai.placeholder')}" aria-label="${t('ai.placeholder')}">
        <button class="btn primary round" type="submit" aria-label="${t('ai.send')}">${icons.send}</button>
      </form>
      ${s.chat.length ? `<button class="link clear-chat" data-act="chat-clear">${t('ai.clear')}</button>` : ''}
    </div>`;
}

const scrollDown = () => requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));

export function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  const s = store.get();
  const chat = $('#chat');
  const user = { r: 'u', text };
  chat.insertAdjacentHTML('beforeend', msgHtml(user));
  chat.insertAdjacentHTML('beforeend', typing);
  scrollDown();
  const parts = answer(text, { have: s.have, pantry: s.pantry, owned: s.owned, diet: s.diet, cooked: s.cooked, liked: s.ratings, last: lastQuery }, Math.floor(Math.random() * 100000));
  if (!/^(ещ[её]|другое|другие|дальше|more|another|next|otra|otro|mas|siguiente)/i.test(text.trim())) lastQuery = text;
  setTimeout(() => {
    const el = chat.querySelector('.typing');
    if (el) el.remove();
    const msg = { r: 'a', parts };
    chat.insertAdjacentHTML('beforeend', msgHtml(msg));
    store.set((st) => ({ chat: [...(st.chat.length ? st.chat : [greeting()]), user, msg].slice(-40) }), { silent: true });
    busy = false;
    scrollDown();
  }, 380 + Math.random() * 280);
}

export function bind(root) {
  const form = $('#chat-form', root);
  const input = $('#chat-input', root);
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
}

export function onClick(act, el) {
  if (act === 'ask') { send(el.dataset.q); return true; }
  if (act === 'chat-clear') { lastQuery = ''; store.set({ chat: [] }); return true; }
  return false;
}
