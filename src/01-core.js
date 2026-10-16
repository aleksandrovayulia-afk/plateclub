// PLATE CLUB v6 client — liquid chrome, RU/EN. The server is the source of truth for everything.
// Built from src/*.js by tools/build-app.mjs — edit the sources, not public/app.js.
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const rid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/[^A-Za-z0-9-]/g, '');
const store = { get(k, d) { try { const v = localStorage.getItem('pc.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('pc.' + k, JSON.stringify(v)); } catch {} } };
const BRAND = n => (window.__BRAND && window.__BRAND[n]) || `/brand/${n}`;
const IMG = n => (window.__BRAND && window.__BRAND['img/' + n]) || `/img/${n}`;
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- language ---------- */
let LANG = store.get('lang', null) || 'ru';
if (!['ru', 'en'].includes(LANG)) LANG = 'ru';
const L = (ru, en) => (LANG === 'en' ? en : ru);
const LOC = () => (LANG === 'en' ? 'en-GB' : 'ru-RU');
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
const pl = (n, ru3, en2) => (LANG === 'en' ? (n === 1 ? en2[0] : en2[1]) : plural(n, ...ru3));
const rel = ts => { const s = (Date.now() - ts) / 1000; if (s < 60) return L('только что', 'just now'); if (s < 3600) { const m = Math.floor(s / 60); return L(`${m} мин назад`, `${m} min ago`); } if (s < 86400) { const h = Math.floor(s / 3600); return L(`${h} ч назад`, `${h} h ago`); } const d = Math.floor(s / 86400); return L(`${d} ${plural(d, 'день', 'дня', 'дней')} назад`, `${d} ${d === 1 ? 'day' : 'days'} ago`); };
const date = ts => new Date(ts).toLocaleString(LOC(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const day = ts => new Date(ts).toLocaleDateString(LOC(), { day: 'numeric', month: 'long', year: 'numeric' });
const TIER_N = { common: ['Обычный', 'Common'], fine: ['Хороший', 'Fine'], rare: ['Редкий', 'Rare'], elite: ['Элитный', 'Elite'], grail: ['Грааль', 'Grail'] };
const RANK_N = { common: ['Обычный', 'Common'], fine: ['Хороший', 'Fine'], rare: ['Редкий', 'Rare'], elite: ['Элитный', 'Elite'], grail: ['Легендарный', 'Legendary'] };
const PAT_EN = { random: 'Random', seq: 'Sequence', pair: 'Pair', mirror: 'Mirror', round: 'Round', triple: 'Same digits', zero: 'Zero series', letters: 'Same letters', full: 'Full match', zerofull: 'Zero + letters' };
const CAT_EN = { start: 'Starter', region: 'Russian regions', belarus: 'Belarus', pattern: 'Patterns', premium: 'Premium', top: 'Top', legend: 'Legends' };
const BY_EN = { 1: 'Brest region', 2: 'Vitebsk region', 3: 'Gomel region', 4: 'Grodno region', 5: 'Minsk region', 6: 'Mogilev region', 7: 'Minsk' };
const ACH_EN = { first: ['First plate', 'Open your first case.'], ten: ['Ten', 'Collect 10 plates.'], opener: ['Thrill', 'Open 25 cases.'], rare: ['Rare find', 'Get a rare plate or better.'], elite: ['Elite', 'Get an elite plate.'], grail: ['Grail', 'Get a Grail plate.'], regions: ['Traveller', 'Plates from 5 regions.'], belarus: ['Two countries', 'Collect plates from Russia and Belarus.'], buyer: ['First purchase', 'Buy a plate on the market.'], lister: ['Seller', 'List a plate on the market.'], seller: ['First sale', 'Sell a plate to another player.'], twin: ['Twins', 'Get a “2 of 2” plate — the last copy of a combination.'] };
const TR = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' };
const translit = s => String(s).replace(/[А-яЁё]/g, ch => { const lo = ch.toLowerCase(); const t = TR[lo] ?? ch; return ch === lo ? t : t.charAt(0).toUpperCase() + t.slice(1); });
const REG_EN = { 'Москва': 'Moscow', 'Санкт-Петербург': 'Saint Petersburg', 'Московская обл.': 'Moscow region', 'Ленинградская обл.': 'Leningrad region' };

// Server messages are Russian; English UI translates the common ones.
const MSG_EN = {
  'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.': 'No connection to the server. Check your internet and try again.',
  'Неверный email или пароль.': 'Email or password is incorrect.', 'Войдите, чтобы продолжить.': 'Sign in to continue.',
  'Исправьте отмеченные поля.': 'Please fix the highlighted fields.', 'Этот ник занят.': 'This nickname is taken.',
  'Этого номера нет в вашей коллекции.': 'This plate is not in your collection.', 'Сначала снимите номер с рынка.': 'Cancel the market listing first.',
  'Номер уже продан.': 'This plate has already been sold.', 'Объявление больше не активно.': 'This listing is no longer available.',
  'Нельзя купить своё объявление.': 'You cannot buy your own listing.', 'Объявление не найдено.': 'Listing not found.',
  'Такого промокода нет или он выключен.': 'This promo code does not exist or is disabled.', 'Вы уже активировали этот промокод.': 'You have already used this promo code.',
  'Срок действия промокода закончился.': 'This promo code has expired.', 'Промокод уже использовали максимальное число раз.': 'This promo code has reached its limit.',
  'Введите промокод.': 'Enter a promo code.', 'Награда уже получена.': 'Reward already claimed.', 'Условие достижения ещё не выполнено.': 'The achievement is not complete yet.',
  'Новых наград за уровень нет.': 'No new level rewards.', 'Цель должна быть редче текущего номера.': 'The target must be rarer than the plate.',
  'Выберите редкость, до которой улучшить.': 'Choose the rarity to upgrade to.', 'Такого кейса нет.': 'No such case.',
  'Номера с таким ID в Plate Club нет.': 'No plate with this ID exists in Plate Club.', 'Только для администраторов.': 'Admins only.',
  'Пополнение пока не включено: на сайте не подключён ни один способ оплаты.': 'Top-ups are not enabled yet: no payment method is connected.',
  'Печать выпуска совпадает с данными номера': 'Mint seal matches the plate data', 'Печать выпуска совпадает с данными': 'Mint seal matches the plate data',
  'Комбинация, регион и стоимость корректны': 'Combination, region and value are valid', 'Комбинация, регион и оценка корректны': 'Combination, region and value are valid',
  'Экземпляров комбинации не больше двух': 'No more than two copies of the combination', 'История владельцев не нарушена': 'Ownership history is unbroken',
  'Текущий владелец совпадает с историей': 'Current owner matches the history', 'Запись не совпадает с подписанной историей.': 'The record does not match its signed history.',
};
const MSG_RX = [
  [/^Не хватает PLT: кейс (\S+) стоит (\d+) PLT, на балансе (\d+) PLT\.$/, m => `Not enough PLT: case ${m[1]} costs ${m[2]} PLT, your balance is ${m[3]} PLT.`],
  [/^Не хватает PLT: кейс стоит (\d+) PLT, на балансе (\d+) PLT\.$/, m => `Not enough PLT: the case costs ${m[1]} PLT, your balance is ${m[2]} PLT.`],
  [/^Не хватает PLT: цена (\d+) PLT, на балансе (\d+) PLT\.$/, m => `Not enough PLT: price ${m[1]} PLT, your balance is ${m[2]} PLT.`],
  [/^Продавец изменил цену на (\d+) PLT/, m => `The seller changed the price to ${m[1]} PLT. Review it and confirm again.`],
  [/^Открыт кейс (\d+) (.+?)( \(скидка\))?$/, m => `Opened case ${m[1]} ${enCase(m[1], m[2])}${m[3] ? ' (deal)' : ''}`],
  [/^Продан банку (.+)$/, m => `Sold ${m[1]} to the bank`], [/^Куплен (.+)$/, m => `Bought ${m[1]}`],
  [/^Продан (.+) \(комиссия (\d+) PLT\)$/, m => `Sold ${m[1]} (fee ${m[2]} PLT)`], [/^Комиссия рынка 5% · (.+)$/, m => `Market fee 5% · ${m[1]}`],
  [/^Промокод (.+)$/, m => `Promo code ${m[1]}`], [/^Ежедневный бонус · день (\d+)$/, m => `Daily bonus · day ${m[1]}`],
  [/^Достижение «(.+)»$/, m => `Achievement “${m[1]}”`], [/^Уровень (\d+)$/, m => `Level ${m[1]}`],
  [/^(Бонус за регистрацию|Приветственный бонус)$/, () => 'Welcome grant'], [/^Стартовый баланс администратора$/, () => 'Admin starting balance'],
  [/^(?:Начисление|Корректировка) Plate Club: (.+)$/, m => `Adjustment by Plate Club: ${m[1]}`], [/^Тестовое пополнение (.+)$/, m => `Test top-up ${m[1]}`],
  [/^Продан скупщику: (.+)$/, m => `Sold to the dealer: ${m[1]}`], [/^Рынок Plate Club$/, () => 'Plate Club Market'],
  [/^Скупщик сегодня уже купил у вас (\d+) номера\. Приходите завтра\.$/, m => `The dealer already bought ${m[1]} plates from you today. Come back tomorrow.`],
  [/^Скупщику сегодня такие номера не нужны\.$/, () => 'The dealer does not need plates like this today.'],
  [/^Аккаунт заблокирован администратором(.*)$/, m => `The account is blocked by the admin${m[1].replace(/^: /, ': ')}`], [/^Подарок Plate Club$/, () => 'Gift from Plate Club'],
  [/^Этот кейс временно недоступен\.$/, () => 'This case is temporarily unavailable.'],
  [/^Покупка (.+) · (\S+)$/, m => `Bought ${m[1]} · ${m[2]}`], [/^Продажа (.+) · (\S+) \(комиссия (\d+) PLT\)$/, m => `Sold ${m[1]} · ${m[2]} (fee ${m[3]} PLT)`],
  [/^Комиссия рынка ([\d.]+)% · (.+)$/, m => `Market fee ${m[1]}% · ${m[2]}`], [/^Пополнение (\d+) PLT · (.+)$/, m => `Top-up ${m[1]} PLT · ${m[2]}`], [/^Продан банку: (.+)$/, m => `Sold to the bank: ${m[1]}`],
  [/^Ставка на аукционе дня$/, () => 'Bid in the auction of the day'], [/^Аукцион дня: ставка повышена$/, () => 'Auction of the day: bid raised'], [/^Аукцион дня: ставку перебили, PLT возвращены$/, () => 'Auction of the day: outbid, PLT returned'],
  [/^Баттл (\S+) · (\d+) × (.+)$/, m => `Battle ${m[1]} · ${m[2]} × ${enCase('', m[3])}`], [/^Возврат за баттл (\S+)$/, m => `Battle refund ${m[1]}`], [/^Доплата за обмен (\S+)$/, m => `Swap top-up ${m[1]}`],
  [/^Коллекция «(.+)»$/, m => `Collection “${m[1]}”`], [/^Выигрыш в баттле (\S+)$/, m => `Battle win ${m[1]}`],
  [/^Кейс (\d+) · (.+)$/, m => `Case ${m[1]} · ${enCase(m[1], m[2])}`], [/^Апгрейд из (.+)$/, m => `Upgrade from ${m[1]}`],
];
const enCase = (id, n) => { const all = CFG ? [...CFG.cases, ...(CFG.battleCases || [])] : []; const c = all.find(x => x.id === id || x.ru === n); return c ? c.name : n; };
const srv = m => { if (LANG !== 'en' || !m) return m; if (MSG_EN[m]) return MSG_EN[m]; for (const [rx, f] of MSG_RX) { const x = String(m).match(rx); if (x) return f(x); } return m; };

/* ---------- icons ---------- */
const sv = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  games: sv('<rect x="3" y="7" width="18" height="11" rx="5"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="17.5" cy="13.5" r=".9"/>'),
  swords: sv('<path d="M14 4h6v6L9 21l-3-3z"/><path d="M4 14l6 6M3 21l3-3"/>'),
  hammer: sv('<path d="M14 4l6 6-3 3-6-6z"/><path d="M12.5 8.5L4 17l3 3 8.5-8.5"/>'),
  layers: sv('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  chat: sv('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
  users: sv('<circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5M17 14a5 5 0 0 1 4 5"/>'),
  sliders: sv('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  list: sv('<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
  chart: sv('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  home: sv('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  cases: sv('<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M3 12h18"/>'),
  market: sv('<path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z"/><path d="M9 7a3 3 0 0 1 6 0"/>'),
  coll: sv('<rect x="3" y="5" width="18" height="6" rx="1.5"/><rect x="3" y="13" width="18" height="6" rx="1.5"/>'),
  wallet: sv('<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M16 13h2"/><path d="M3 10h18"/>'),
  user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  menu: sv('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  up: sv('<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/><path d="M5 21h14"/>'),
  star: '<svg viewBox="0 0 50 50" fill="currentColor" aria-hidden="true"><path d="M25 0L30 20L50 25L30 30L25 50L20 30L0 25L20 20Z"/></svg>',
  shield: sv('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  swap: sv('<path d="M7 7h12l-3-3"/><path d="M17 17H5l3 3"/>'),
  gift: sv('<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18"/><path d="M12 9c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/>'),
  trophy: sv('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3"/><path d="M12 13v4M8 21h8"/>'),
  list: sv('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  help: sv('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>'),
  doc: sv('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  crown: sv('<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>'),
  out: sv('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  login: sv('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>'),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  bolt: sv('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  fire: sv('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>'),
};
const VB_PATH = (() => { let d = ''; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; const x = (12 + 9.6 * Math.cos(a)).toFixed(2), y = (12 + 9.6 * Math.sin(a)).toFixed(2); d += i ? ` A2.75 2.75 0 0 1 ${x} ${y}` : `M${x} ${y}`; } return d + 'Z'; })();
const VB = () => { const t = L('Подлинность подтверждена', 'Verified authentic'); return `<svg class="vb" viewBox="0 0 24 24" role="img" aria-label="${t}"><title>${t}</title><path class="vb-s" d="${VB_PATH}"/><path class="vb-c" d="M8.1 12.3l2.6 2.6 5.3-5.6"/></svg>`; };

/* ---------- API ---------- */
async function api(method, path, body, { key } = {}) {
  let r;
  try { r = await fetch(path, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-lang': LANG, ...(key ? { 'idempotency-key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { const e = new Error(srv('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.')); e.status = 0; throw e; }
  let data = {}; try { data = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(srv(data.error) || L(`Ошибка запроса (${r.status}).`, `Request failed (${r.status}).`)); e.status = r.status; e.data = data; throw e; }
  return data;
}
const GET = p => api('GET', p), POST = (p, b = {}, o) => api('POST', p, b, o), PATCH = (p, b) => api('PATCH', p, b), DEL = p => api('DELETE', p);

let CFG = null, ME = null, PERKS = null;
const TI = () => Object.fromEntries(CFG.tiers.map((t, i) => [t.id, i]));
const tierName = t => L(...(TIER_N[t] || [t, t]));
const rankName = t => L(...(RANK_N[t] || [t, t]));
const patName = k => (LANG === 'en' ? PAT_EN[k] : CFG.patNames[k]) || k;
const catName = k => (LANG === 'en' ? CAT_EN[k] : CFG.cats[k]) || k;
const caseById = id => CFG.cases.find(c => c.id === id) || (CFG.battleCases || []).find(c => c.id === id);
const caseName = c => (LANG === 'en' ? c.name : c.ru);
const caseNote = c => (LANG === 'en' ? c.en : c.note);
const dealOf = c => CFG.deals.find(d => d.id === c.id && d.ends > Date.now());
const priceOf = c => { const d = dealOf(c); return d ? d.price : c.price; };
const plateStr = p => (p.country === 'BY' ? `${p.digits} ${p.letters}-${p.region}` : `${p.letters[0]}${p.digits}${p.letters.slice(1)} ${p.region}`);
const regName = r => { const n = (CFG.regions[r] || [''])[0]; return LANG === 'en' ? (REG_EN[n] || translit(n).replace(/ obl\.$/, ' region').replace(/ kray$/i, ' krai')) : n; };
const regionLabel = p => (p.country === 'BY' ? `${L('Беларусь', 'Belarus')} · ${LANG === 'en' ? BY_EN[p.region] : CFG.byRegions[p.region] || ''}` : `${p.region} · ${regName(p.region)}`);
const traitName = t => { const x = CFG && CFG.traits && CFG.traits[t]; return x ? L(x.name, x.en) : t; };
const MEDAL = m => (m === 'top3' ? `<span class="medal-b m3" title="${L('Топ-3 рейтинга', 'Top-3 of the ranking')}"><i>3</i>TOP</span>` : `<span class="medal-b m10" title="${L('Топ-10 рейтинга', 'Top-10 of the ranking')}"><i>10</i>TOP</span>`);
const Medals = ms => (ms && ms.length ? `<span class="medals">${[...ms].sort((a, b) => (a === 'top3' ? -1 : 1)).map(MEDAL).join('')}</span>` : '');
const perkOf = p => { const out = []; if (p.pattern && p.pattern !== 'random') out.push(patName(p.pattern)); if (Array.isArray(p.traits)) p.traits.forEach(t => out.push(traitName(t))); else { if (/^7+$/.test(p.digits)) out.push(L('Счастливые семёрки', 'Lucky sevens')); if (/^0+1$/.test(p.digits)) out.push(L('Номер один', 'Number one')); } return out; };
const vsValue = (price, value) => Math.round((price / Math.max(1, value) - 1) * 100);
const rarePlus = c => Math.round((c.odds[2] + c.odds[3] + c.odds[4]) * 100) / 100;
const achName = a => (LANG === 'en' && ACH_EN[a.id] ? ACH_EN[a.id][0] : a.name);
const achText = a => (LANG === 'en' && ACH_EN[a.id] ? ACH_EN[a.id][1] : a.text);
// mirrors server/game.mjs: chance = 90% × value ratio, clamped
const regMult = p => (p.country === 'BY' ? CFG.byMult : (CFG.groupMult[(CFG.regions[p.region] || [])[1]] || 1));
const targetValue = (p, tier) => Math.round(CFG.tiers[TI()[tier]].base * regMult(p));
const upChance = (p, tier) => { const u = CFG.upgrade; return Math.max(u.min, Math.min(u.max, Math.floor(u.edge * p.value / targetValue(p, tier) * 10000) / 10000)); };
async function refreshMe() { try { ME = (await GET('/api/me')).user; } catch { ME = null; } chrome(); return ME; }
async function refreshPerks() { if (!ME) { PERKS = null; return null; } try { PERKS = await GET('/api/perks'); } catch {} chrome(); return PERKS; }

/* ---------- preferences (this device) ---------- */
const PREF = { vol: store.get('vol', 0.6), motion: store.get('motion', 'system') };
const savePref = () => { store.set('vol', PREF.vol); store.set('motion', PREF.motion); applyPrefs(); };
const reduced = () => PREF.motion === 'reduced' || (PREF.motion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const finePointer = () => matchMedia('(hover:hover) and (pointer:fine)').matches;
function applyPrefs() { const h = document.documentElement; h.classList.toggle('rm', PREF.motion === 'reduced'); h.classList.toggle('fm', PREF.motion === 'full'); h.lang = LANG; const sk = document.querySelector('.skip'); if (sk) sk.textContent = L('К содержимому', 'Skip to content'); const lg = document.querySelector('.hdr .logo'); if (lg) lg.setAttribute('aria-label', L('Plate Club — главная', 'Plate Club — home')); const tn = document.getElementById('topnav'); if (tn) tn.setAttribute('aria-label', L('Главное меню', 'Main menu')); const bn = document.getElementById('botnav'); if (bn) bn.setAttribute('aria-label', L('Меню', 'Menu')); }

/* ---------- sound (always on; volume in settings) ---------- */
let AC = null, lastTick = 0;
function sfx(kind, x = 1) {
  if (!PREF.vol) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime, v = Math.max(0.0002, PREF.vol * 0.16);
    const tone = (f, st, d, type = 'sine', vol = v) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t + st); g.gain.setValueAtTime(0.0001, t + st); g.gain.exponentialRampToValueAtTime(vol, t + st + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + st + d); o.connect(g); g.connect(AC.destination); o.start(t + st); o.stop(t + st + d + 0.03); };
    const noise = (len, fq, vol, type = 'lowpass') => { const buf = AC.createBuffer(1, Math.floor(AC.sampleRate * len), AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = type; f.frequency.value = fq; g.gain.value = v * vol * 3; src.buffer = buf; src.connect(f); f.connect(g); g.connect(AC.destination); src.start(); };
    const tick = () => { const now = performance.now(); if (now - lastTick < 28) return; lastTick = now;
      const len = 0.022, buf = AC.createBuffer(1, Math.floor(AC.sampleRate * len), AC.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'bandpass'; f.frequency.value = 1700 + 1200 * x; f.Q.value = 4; g.gain.value = v * 2.6; src.buffer = buf; src.connect(f); f.connect(g); g.connect(AC.destination); src.start();
      tone(2400 + 600 * x, 0, 0.018, 'square', v * 0.12); };
    ({ tick, click: () => tone(1700, 0, 0.035, 'triangle'), confirm: () => { tone(660, 0, 0.08); tone(990, 0.07, 0.12); },
      open: () => { tone(160, 0, 0.35, 'triangle'); tone(240, 0.05, 0.35); },
      common: () => tone(520, 0, 0.2), fine: () => { tone(587, 0, 0.12); tone(784, 0.08, 0.22); },
      rare: () => { tone(784, 0, 0.16); tone(1046, 0.11, 0.2); tone(1318, 0.22, 0.4); },
      elite: () => { tone(392, 0, 0.5, 'triangle'); tone(784, 0.12, 0.3); tone(1175, 0.26, 0.5); tone(1568, 0.4, 0.6); },
      grail: () => { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, i * 0.09, 0.7)); tone(130, 0, 1.4, 'triangle', v * 0.8); },
      fail: () => { tone(330, 0, 0.25, 'sawtooth', v * 0.5); tone(220, 0.18, 0.45, 'sawtooth', v * 0.5); noise(0.4, 900, 0.4); },
      buy: () => { tone(523, 0, 0.09); tone(784, 0.08, 0.16); },
      coin: () => { tone(1318, 0, 0.08, 'triangle'); tone(1760, 0.06, 0.14, 'triangle'); },
      boom: () => { tone(70, 0, 0.7, 'sine', v * 2); tone(140, 0, 0.35, 'triangle', v); noise(0.5, 400, 0.6); },
      whoosh: () => { const len = 1.6, buf = AC.createBuffer(1, Math.floor(AC.sampleRate * len), AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / d.length * 3) * 0.5;
        const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'bandpass'; f.Q.value = 2.5; f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(2600, t + len); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 1.6, t + len * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + len); src.buffer = buf; src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t); } }[kind] || (() => {}))();
  } catch {}
}
