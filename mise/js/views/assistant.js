// Мини-ИИ помощник: чат, который понимает продукты, настроение, время и технику на трёх языках
import { BY_ID, rtext } from '../engine.js';
import { answer, suggestions, isMoreText } from '../assistant-core.js';
import { t } from '../i18n.js';
import * as store from '../store.js';
import { esc, md, $, recipeRow, icons, openSheet, closeSheet, toast } from '../ui.js';
import { mascot, face, setMood, flash } from '../mascot.js';
import { ING } from '../data/ingredients.js';
import * as timers from '../timers.js';
import { fillWeek } from './plan.js';
import { contextAnswer } from '../assistant-ctx.js';
import { searchOnline, online } from '../websearch.js';
import { context as cookContext } from './cook.js';
import { currentLang } from '../i18n.js';

let busy = false;
let ctl = null; // AbortController текущего ответа
let lastUser = '';
let lastQuery = '';
let page = 0;

function partHtml(p) {
  if (p.type === 'text') return `<div class="bubble a">${md(p.text)}</div>`;
  if (p.type === 'recipes') {
    const favs = store.get().favs;
    return `<div class="bubble-list">${p.items.map((it) => {
      const r = BY_ID[it.id];
      return r ? `${recipeRow(r, { note: it.note ? esc(it.note) : '', best: it.best })}<div class="rq"><button class="chip small${favs.includes(r.id) ? ' on' : ''}" data-act="chat-fav" data-id="${r.id}" aria-pressed="${favs.includes(r.id)}">${icons.heart} ${t(favs.includes(r.id) ? 'ai.fav.on' : 'ai.fav.add')}</button><button class="chip small" data-act="chat-shop" data-id="${r.id}">${icons.cart || ''} ${t('ai.shop.q')}</button></div>` : '';
    }).join('')}</div>`;
  }
  if (p.type === 'web') {
    return `<div class="web"><div class="web-h"><span class="srcbadge online">${t('src.online')}</span> <small>${esc(p.q)}</small></div>${p.items.map((x) => `<a class="web-i" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" width="56" height="56">` : ''}<span><b>${esc(x.title)}</b><small>${esc(x.source)}</small>${x.snippet ? `<em>${esc(x.snippet)}</em>` : ''}</span></a>`).join('')}</div>`;
  }
  if (p.type === 'notice') return `<div class="bubble a notice ${p.tone || ''}">${esc(p.text)}${p.retry ? ` <button class="link" data-act="retry">${t('ai.retry')}</button>` : ''}</div>`;
  if (p.type === 'websearch') return `<button class="chip small web-btn" data-act="web-search" data-q="${esc(p.q)}">${icons.search || ''} ${t('ai.web.search')}</button>`;
  if (p.type === 'link') return `<a class="btn small ai-link" href="${esc(p.href)}">${esc(p.label)} ${icons.chev}</a>`;
  if (p.type === 'chips') return `<div class="qchips">${p.items.map((x) => `<button class="chip small" data-act="ask" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
  return '';
}
const srcLabel = (m) => (m.src ? `<small class="src ${m.src}">${t(`src.${m.src}`)}</small>` : '');
const msgHtml = (m) => (m.r === 'u' ? `<div class="msg u"><div class="bubble u">${esc(m.text)}</div></div>` : `<div class="msg a"><span class="av">${face('idle', 34)}</span><div class="msg-c">${m.parts.map(partHtml).join('')}${srcLabel(m)}</div></div>`);
const typing = (online_ = false) => `<div class="msg a typing"><span class="av">${face(online_ ? 'search' : 'think', 34)}</span><div class="msg-c"><div class="bubble a"><i></i><i></i><i></i></div><div class="typing-r"><small>${online_ ? t('ai.searching') : t('bot.thinking')}</small><button class="link" data-act="stop">${t('ai.stop')}</button></div></div></div>`;

// Сохраняем разговор без языка: рецепты и подсказки перерисовываются на текущем языке
const greeting = () => ({ r: 'a', parts: answer('hello', { have: [], pantry: [], owned: [], diet: {}, cooked: {} }, 1).filter((p) => p.type !== 'chips') });

export function render(s) {
  const chat = s.chat.length ? s.chat : [greeting()];
  const cx = ctxInfo();
  return `<header class="bot-head">${mascot('greet', 92)}<div class="bot-title"><h1>${t('bot.name')}</h1><p class="sub" id="bot-status"><i class="live"></i>${t('bot.status')}</p></div><div class="bot-tools"><button class="icon-btn" data-act="chat-history" aria-label="${t('ai.history')}">${icons.history || icons.reset}</button><button class="icon-btn" data-act="chat-new" aria-label="${t('ai.new')}">${icons.plus}</button></div></header>
    ${cx ? `<p class="ctx-chip">${icons.pin || ''}${esc(cx)}</p>` : ''}
    <div class="chat" id="chat" aria-live="polite">${chat.map(msgHtml).join('')}</div>
    <div class="composer-fixed">
      <div class="hscroll tight" id="suggest">${suggestions().map((x) => `<button class="chip small" data-act="ask" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <form id="chat-form" class="composer" autocomplete="off">
        ${micOk() ? `<button type="button" class="icon-btn mic" data-act="mic" aria-label="${t('bot.mic')}">${icons.mic}</button>` : ''}
        <input id="chat-input" type="text" enterkeyhint="send" placeholder="${t('ai.placeholder')}" aria-label="${t('ai.placeholder')}">
        <button class="btn primary round" type="submit" aria-label="${t('ai.send')}">${icons.send}</button>
      </form>
      <p class="muted small web-note">${s.onlineSearch ? (online() ? t('ai.web.on') : t('ai.web.offline')) : t('ai.web.off')}</p>
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

/** Контекст для ответов: текущий шаг готовки или последний начатый рецепт */
function ctxNow() {
  const c = cookContext();
  if (!c) return null;
  return { recipe: BY_ID[c.id], stepIndex: c.i, servings: c.servings, units: store.get().units };
}
function ctxInfo() {
  const c = ctxNow();
  return c ? `${rtext(c.recipe).t} · ${t('cook.stepOf', { n: c.stepIndex + 1, total: rtext(c.recipe).steps.length })}` : '';
}

const WEB_WORDS = /(в интернет[а-яё]*|в сети|онлайн|погугли|загугли|поищи в|найди в сети|search (the )?(web|online|internet)|look (it )?up|google|on the web|online|busca(r)? en (internet|la web|línea)|en línea|en internet)/i;
const FILLER = /(^|\s)(найди|поищи|покажи|подскажи|пожалуйста|как приготовить|как сделать|как испечь|рецепт[а-яё]*|find|show me|please|how to (make|cook|bake)|recipe (for|of)|busca|encuentra|muéstrame|cómo (hacer|preparar)|receta (de|del))(?=\s|$)/gi;
const stripWeb = (q) => q.replace(WEB_WORDS, ' ').replace(FILLER, ' ').replace(/\s+/g, ' ').trim() || q;

const save = (user, msg) => store.set((st) => ({ chat: [...(st.chat.length ? st.chat : [greeting()]), user, msg].slice(-60) }), { silent: true });
const pushMsg = (chat, msg) => { chat.insertAdjacentHTML('beforeend', msgHtml(msg)); scrollDown(); };
const finish = (mood = 'happy') => { busy = false; ctl = null; flash(document, mood, 2200); statusText(t('bot.status')); };

async function runOnline(q, chat, user, base = null) {
  const lang = currentLang();
  ctl = new AbortController();
  const typingEl = chat.querySelector('.typing'); if (typingEl) typingEl.remove();
  chat.insertAdjacentHTML('beforeend', typing(true)); scrollDown();
  setMood(document, 'search'); statusText(t('ai.searching'));
  const res = await searchOnline(q, lang, { signal: ctl.signal });
  chat.querySelector('.typing')?.remove();
  if (res.aborted) { pushMsg(chat, { r: 'a', parts: [{ type: 'notice', text: t('ai.stopped') }] }); finish('idle'); return; }
  const parts = [...(base?.parts || [])];
  let src = base ? 'mixed' : 'online';
  if (res.offline) { parts.push({ type: 'notice', text: t('ai.web.offline.msg'), tone: 'warn' }); src = base ? 'local' : null; }
  else if (!res.ok) { parts.push({ type: 'notice', text: t('ai.web.fail'), tone: 'warn', retry: true }); src = base ? 'local' : null; }
  else if (!res.items.length) { parts.push({ type: 'notice', text: t('ai.web.none') }); src = base ? 'local' : null; }
  else { parts.push({ type: 'text', text: t('ai.web.found', { n: res.items.length }) }, { type: 'web', q, items: res.items.slice(0, 6) }); }
  const msg = { r: 'a', parts, src };
  pushMsg(chat, msg); save(user, msg);
  runActions(parts);
  finish(res.ok && res.items.length ? 'result' : 'error');
}

export function send(text, { forceWeb = false } = {}) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; lastUser = text;
  const s = store.get();
  const chat = $('#chat');
  const user = { r: 'u', text };
  chat.insertAdjacentHTML('beforeend', msgHtml(user));
  chat.insertAdjacentHTML('beforeend', typing(false));
  setMood(document, 'think'); statusText(t('bot.thinking'));
  scrollDown();
  ctl = new AbortController();
  const my = ctl;
  const wantsWeb = forceWeb || WEB_WORDS.test(text);
  const isMore = isMoreText(text);
  const delay = 320 + Math.random() * 260;
  const timer = setTimeout(() => {
    if (my.signal.aborted) return;
    chat.querySelector('.typing')?.remove();
    // 1. вопрос про текущий шаг или общий кулинарный вопрос
    const cx = ctxNow();
    const lang = currentLang();
    const ctxA = !wantsWeb ? contextAnswer(text, cx || { recipe: null, stepIndex: 0, servings: 0, units: s.units }, lang) : null;
    let parts;
    if (ctxA) parts = Object.assign([{ type: 'text', text: ctxA.text, mood: 'happy' }], { query: lastQuery });
    else {
      page = isMore ? page + 1 : 0;
      parts = answer(wantsWeb ? stripWeb(text) : text, { have: s.have, pantry: s.pantry, owned: s.owned, diet: s.diet, cooked: s.cooked, liked: s.ratings, last: lastQuery, page: page - 1 }, Math.floor(Math.random() * 100000));
      if (!isMore && parts.query) lastQuery = parts.query;
    }
    const hasAnswer = parts.some((p) => p.type === 'recipes' || p.type === 'action') || !!ctxA || parts.some((p) => p.type === 'text' && p.mood !== 'sad');
    const miss = !hasAnswer;
    if (wantsWeb || (miss && s.onlineSearch)) {
      const base = wantsWeb || miss ? null : { parts };
      runOnline(stripWeb(text), chat, user, base && base.parts.length ? { parts: base.parts } : null);
      return;
    }
    const q = text;
    if (hasAnswer && s.onlineSearch && !parts.some((p) => p.type === 'action')) parts.push({ type: 'websearch', q });
    const msg = { r: 'a', parts, src: 'local' };
    pushMsg(chat, msg); save(user, msg);
    runActions(parts);
    finish(parts.find((p) => p.mood)?.mood || 'happy');
  }, delay);
  my.signal.addEventListener('abort', () => clearTimeout(timer));
}

function stop() {
  if (!busy || !ctl) return;
  const chat = $('#chat');
  ctl.abort();
  chat.querySelector('.typing')?.remove();
  if (!chat.querySelector('.notice.stopped')) { chat.insertAdjacentHTML('beforeend', msgHtml({ r: 'a', parts: [{ type: 'notice', text: t('ai.stopped'), tone: 'stopped' }] })); }
  finish('idle');
}

function historySheet() {
  const all = store.get().chats.filter((c) => c.msgs?.length);
  const body = all.length ? `<ul class="hist">${[...all].reverse().map((c) => `<li><button class="hist-i" data-act="chat-open" data-id="${c.id}"><b>${esc(c.title || '…')}</b><small>${new Intl.DateTimeFormat(currentLang(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(c.ts))}</small></button><button class="icon-btn" data-act="chat-del" data-id="${c.id}" aria-label="${t('common.delete')}">${icons.trash || icons.close}</button></li>`).join('')}</ul>` : `<p class="muted">${t('ai.history.empty')}</p>`;
  openSheet(`<h2>${t('ai.history')}</h2>${body}`, { tall: true });
}

function archiveCurrent() {
  const st = store.get();
  if (!st.chat.some((m) => m.r === 'u')) return;
  const first = st.chat.find((m) => m.r === 'u')?.text || '';
  const id = `c${Date.now()}`;
  store.set({ chats: [...st.chats.filter((c) => c.msgs?.length), { id, title: first.slice(0, 60), ts: Date.now(), msgs: st.chat }].slice(-20) }, { silent: true });
}

export function bind(root) {
  const form = $('#chat-form', root);
  const input = $('#chat-input', root);
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
}

export function onClick(act, el) {
  if (act === 'mic') { listen(); return true; }
  if (act === 'ask') { send(el.dataset.q); return true; }
  if (act === 'chat-clear' || act === 'chat-new') { stop(); archiveCurrent(); lastQuery = ''; store.set({ chat: [] }); return true; }
  if (act === 'stop') { stop(); return true; }
  if (act === 'retry') { if (lastUser) send(lastUser, { forceWeb: true }); return true; }
  if (act === 'web-search') { send(el.dataset.q, { forceWeb: true }); return true; }
  if (act === 'chat-history') { historySheet(); return true; }
  if (act === 'chat-open') { const c = store.get().chats.find((x) => x.id === el.dataset.id); if (c) { archiveCurrent(); store.set({ chat: c.msgs, chats: store.get().chats.filter((x) => x.id !== c.id) }); closeSheet(); } return true; }
  if (act === 'chat-del') { store.set({ chats: store.get().chats.filter((x) => x.id !== el.dataset.id) }, { silent: true }); historySheet(); return true; }
  if (act === 'chat-fav') { const id = el.dataset.id; const f = store.get().favs; store.set({ favs: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] }); return true; }
  if (act === 'chat-shop') { runActions([{ type: 'action', kind: 'shop-recipe', id: el.dataset.id }]); toast(t('ai.shop.done')); return true; }
  return false;
}
