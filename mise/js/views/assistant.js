// Мини-ИИ помощник: чат, который понимает продукты, настроение, время и технику
import { BY_ID, answer, SUGGESTIONS } from '../engine.js';
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
  if (p.type === 'chips') return `<div class="qchips">${p.items.map((t) => `<button class="chip small" data-act="ask" data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
  return '';
}

function msgHtml(m) {
  if (m.r === 'u') return `<div class="msg u"><div class="bubble u">${esc(m.text)}</div></div>`;
  return `<div class="msg a">${m.parts.map(partHtml).join('')}</div>`;
}

const typing = '<div class="msg a typing"><div class="bubble a"><i></i><i></i><i></i></div></div>';

export function render(s) {
  const chat = s.chat.length ? s.chat : [{ r: 'a', parts: answer('привет', {}, 1) }];
  return `<header class="top compact"><h1>Помощник</h1><p class="sub">Спросите, что приготовить. Всё считается на вашем устройстве.</p></header>
    <div class="chat" id="chat" aria-live="polite">${chat.map(msgHtml).join('')}</div>
    <div class="composer-fixed">
      <div class="hscroll tight" id="suggest">${SUGGESTIONS.map((t) => `<button class="chip small" data-act="ask" data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <form id="chat-form" class="composer" autocomplete="off">
        <input id="chat-input" type="text" enterkeyhint="send" placeholder="Например: сладкое без духовки…" aria-label="Сообщение помощнику">
        <button class="btn primary round" type="submit" aria-label="Отправить">${icons.send}</button>
      </form>
    </div>`;
}

function scrollDown() {
  requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));
}

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
  const seed = Math.floor(Math.random() * 100000);
  const parts = answer(text, { have: s.have, pantry: s.pantry, owned: s.owned, diet: s.diet, cooked: s.cooked, last: lastQuery }, seed);
  if (!/^(ещ[её]|другое|другие|дальше)/i.test(text)) lastQuery = text;
  setTimeout(() => {
    const t = chat.querySelector('.typing');
    if (t) t.remove();
    const msg = { r: 'a', parts };
    chat.insertAdjacentHTML('beforeend', msgHtml(msg));
    store.set((st) => ({ chat: [...(st.chat.length ? st.chat : [{ r: 'a', parts: answer('привет', {}, 1) }]), user, msg].slice(-40) }), { silent: true });
    busy = false;
    scrollDown();
  }, 380 + Math.random() * 280);
}

export function bind(root) {
  const form = $('#chat-form', root);
  const input = $('#chat-input', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    send(v);
  });
}

export function onClick(act, el) {
  if (act === 'ask') { send(el.dataset.q); return true; }
  return false;
}
