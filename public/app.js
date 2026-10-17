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
  [/^Вступление в Telegram-чат игроков$/, () => 'Joined the players’ Telegram chat'], [/^Коллекция «(.+)»$/, m => `Collection “${m[1]}”`], [/^Выигрыш в баттле (\S+)$/, m => `Battle win ${m[1]}`],
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
const MEDAL_DEF = () => ({
  top3: ['m3', '3', 'TOP', L('Топ-3 рейтинга', 'Top-3 of the ranking')], top10: ['m10', '10', 'TOP', L('Топ-10 рейтинга', 'Top-10 of the ranking')],
  trader: ['mtr', '⇄', L('МАСТЕР РЫНКА', 'MARKET MASTER'), L('Мастер рынка: 50+ сделок на рынке', 'Market master: 50+ market deals')],
  spender: ['msp', '◆', L('ХАЙРОЛЛЕР', 'HIGH ROLLER'), L('Потратил больше 100 000 PLT', 'Spent over 100,000 PLT')],
  earner: ['mer', '₽', L('МАГНАТ', 'TYCOON'), L('Заработал на продажах больше 50 000 PLT', 'Earned over 50,000 PLT from sales')],
  lv50: ['ml50', '50', L('ЗВЕЗДА', 'STAR'), L('Достиг 50 уровня', 'Reached level 50')],
  lv100: ['ml100', '100', L('ЛЕГЕНДА', 'LEGEND'), L('Достиг 100 уровня', 'Reached level 100')],
});
const MEDAL_ORDER = ['lv100', 'top3', 'lv50', 'top10', 'earner', 'trader', 'spender'];
const MEDAL = m => { const d = MEDAL_DEF()[m]; return d ? `<span class="medal-b ${d[0]}" title="${d[3]}"><i>${d[1]}</i>${d[2]}</span>` : ''; };
const Medals = ms => (ms && ms.length ? `<span class="medals">${[...ms].sort((a, b) => MEDAL_ORDER.indexOf(a) - MEDAL_ORDER.indexOf(b)).map(MEDAL).join('')}</span>` : '');
const LV_TITLE = t => ({ rookie: L('Новичок', 'Rookie'), collector: L('Коллекционер', 'Collector'), expert: L('Знаток', 'Expert'), star: L('Звезда', 'Star'), tycoon: L('Магнат', 'Tycoon'), legend: L('Легенда', 'Legend') })[t] || '';
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


/* ---------- components ---------- */
function Plate(p, o = {}) {
  const iri = o.iri ?? (p.tier === 'elite' || p.tier === 'grail');
  const badge = o.holo ? VB() : '';
  const al = esc(L('Номер ', 'Plate ') + plateStr(p));
  if (p.country === 'BY') return `<span class="plate by${iri ? ' iri' : ''}" role="img" aria-label="${al}"><span class="by-flag" aria-hidden="true"><i></i><b>BY</b></span><span class="pl-main" aria-hidden="true"><span class="pl-d">${p.digits}</span><span class="pl-l">${p.letters}</span><span class="pl-dash">-</span><span class="pl-d">${p.region}</span></span>${badge}</span>`;
  return `<span class="plate${iri ? ' iri' : ''}" role="img" aria-label="${al}"><span class="pl-main" aria-hidden="true"><span class="pl-l">${p.letters[0]}</span><span class="pl-d">${p.digits}</span><span class="pl-l">${p.letters.slice(1)}</span></span><span class="pl-reg" aria-hidden="true"><span class="pl-rn${p.region.length > 2 ? ' r3' : ''}">${p.region}</span><span class="pl-rus">RUS<span class="flag"></span></span></span>${badge}</span>`;
}
const Rarity = t => `<span class="rl t-${t}"><i></i>${tierName(t)}</span>`;
const Price = n => `<span class="price">${fmt(n)}<small>PLT</small></span>`;
const Perks = p => perkOf(p).map(t => `<span class="perk">${esc(t)}</span>`).join('');
const Copy = p => (p.copy ? `<span class="cp${p.copy === 2 ? ' last' : ''}" title="${L(`Экземпляр ${p.copy} из 2`, `Copy ${p.copy} of 2`)}">${p.copy}/2</span>` : '');
const SH = (title, sub = '', link = '') => `<div class="sh"><div><h2 class="h2">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${link}</div>`;
const Empty = (title, text, action = '', plate = null) => `<div class="empty">${plate ? Plate(plate, { iri: false }) : ''}<h3 class="h3">${title}</h3><p style="margin:0;max-width:46ch">${text}</p>${action}</div>`;
const OddsBar = odds => `<div class="oddsbar" aria-hidden="true">${odds.map((o, i) => (o > 0 ? `<span class="t-${CFG.tiers[i].id}" style="flex:${Math.max(o, 1.5)}"></span>` : '')).join('')}</div>`;
// each case gets its own emblem: region code, BY band, pattern sample, diamond or crown
const EMB_PAT = { seq: '123', pair: '113', mirror: '121', round: '500', triple: '777', letters: 'AAA', zero: '007', full: '777', zerofull: '001' };
const GEM = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" opacity=".9"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12" stroke="rgba(0,0,0,.35)" stroke-width="1" fill="none"/></svg>';
const CROWN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 4 4.5-7 4.5 7L21 8l-2 11H5z"/></svg>';
function emblem(c) {
  const f = c.focus && Object.values(c.focus)[0];
  if (c.cat === 'legend' || c.cat === 'top') return `<span class="cg-emb icon">${c.cat === 'legend' ? CROWN : GEM}</span>`;
  if (c.cat === 'premium') return `<span class="cg-emb icon">${GEM}</span>`;
  if (c.cat === 'pattern' && f) return `<span class="cg-emb txt">${EMB_PAT[f] || '★'}</span>`;
  if (c.cat === 'belarus') return `<span class="cg-emb by"><i></i>${c.pool.BY.length === 1 ? c.pool.BY[0] : 'BY'}</span>`;
  if (c.cat === 'region') return `<span class="cg-emb txt">${esc(c.cover.region)}</span>`;
  return `<span class="cg-star">${IC.star}</span>`;
}
const glyph = (c, cls = '') => `<div class="cg ${cls}" style="--c:${c.color};--c2:${c.color2}"><span class="cg-glow"></span><span class="cg-handle"></span><span class="cg-lid"></span><div class="cg-body"><span class="cg-latch l"></span><span class="cg-latch r"></span><span class="cg-rib l"></span><span class="cg-rib r"></span>${emblem(c)}</div><span class="cg-shadow"></span></div>`;
const nameCls = n => { const w = Math.max(...n.split(' ').map(x => x.length)); return w > 11 ? ' xlong' : w > 8 ? ' long' : ''; };
function CaseCard(c) {
  const d = dealOf(c);
  return `<div class="ccw rv"><a class="cc r-${c.rank} t-${c.rank}" href="#/case/${c.id}" data-fx="case" style="--c:${c.color};--c2:${c.color2}" aria-label="${esc(L('Кейс ', 'Case ') + caseName(c))}, ${rankName(c.rank)}, ${fmt(priceOf(c))} PLT">
    <div class="cc-bg"></div>
    <div class="cc-top"><span class="cc-rank">${rankName(c.rank)}</span><span class="cc-no">№${c.id}</span></div>
    ${d ? `<span class="cc-deal">−${d.pct}%</span>` : ''}
    <div class="cc-art">${glyph(c)}</div>
    <div><div class="cc-name${nameCls(caseName(c))}">${esc(caseName(c))}</div><p class="cc-sub">${esc(caseNote(c).split('. ')[0].replace(/\.$/, ''))}</p></div>
    <span class="cc-open"><span>${L('Открыть', 'Open')}</span><b>${d ? `<span class="was">${fmt(d.was)}</span>` : ''}${fmt(priceOf(c))}<small>PLT</small></b></span></a>
    <button class="cc-info" data-act="odds" data-case="${c.id}" aria-label="${L('Шансы выпадения', 'Drop odds')}" title="${L('Шансы выпадения', 'Drop odds')}">i</button></div>`;
}
// odds are shown on demand: the (i) button on a case opens this
function oddsDialog(c) {
  const p = priceOf(c);
  openDialog(`<div class="dlg" style="--cardbg:var(--bg2)"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">${L('Шансы выпадения', 'Drop odds')}</p><h2 class="h3" id="dlgTitle" style="margin-top:6px">${esc(caseName(c))}</h2></div><button class="btn btn-sm btn-ghost" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div>
    <div class="odds-d">${CFG.tiers.map((t, i) => `<div class="odds-row t-${t.id}" style="${c.odds[i] ? '' : 'opacity:.35'}">${Rarity(t.id)}<div class="bar"><span style="width:${Math.max(c.odds[i] ? 2 : 0, Math.min(100, c.odds[i] * (100 / Math.max(...c.odds))))}%"></span></div><span class="pct">${c.odds[i]}%</span><span class="val">${c.odds[i] ? '≈ ' + fmt(t.base * c.mult) + ' PLT' : '—'}</span></div>${c.focus && c.focus[t.id] && c.odds[i] ? `<p class="small" style="margin:-6px 0 0 132px">${L('всегда', 'always')} «${patName(c.focus[t.id])}»</p>` : ''}`).join('')}</div>
    <dl class="kv"><dt>${L('Цена кейса', 'Case price')}</dt><dd>${fmt(p)} PLT</dd><dt>${L('Средняя оценка содержимого', 'Average content value')}</dt><dd>≈ ${fmt(c.ev)} PLT</dd><dt>${L('Средний выкуп банком', 'Average bank buy-back')}</dt><dd>≈ ${fmt(c.ev * CFG.bankRate)} PLT</dd><dt>${L('Редкий и выше', 'Rare or better')}</dt><dd>${rarePlus(c)}%</dd></dl>
    <p class="small" style="margin:0">${L('Оценка — внутриигровая цена номера. Сервер выбирает результат до прокрутки. Каждая комбинация выпускается максимум дважды.', 'Value is the in-game price of a plate. The server picks the result before the spin. Each combination is minted at most twice.')}</p></div>`);
}
function PlateCard(p, o = {}) {
  const l = o.listing;
  return `<article class="pc t-${p.tier} rv">${o.flag ? `<span class="tag flag-tl ${o.flagCls || ''}">${o.flag}</span>` : ''}
    <a class="pc-plate" href="#/plate/${p.id}" aria-label="${esc(L('Номер ', 'Plate ') + plateStr(p))}">${Plate(p, { holo: true })}</a>
    <div class="pc-r">${Rarity(p.tier)}<a class="pid iri-t" href="#/plate/${p.id}">${p.id}</a></div>
    <div class="pc-tags">${Perks(p)}${Copy(p)}</div>
    <div class="pc-sub">${esc(regionLabel(p))}${l && l.seller ? `<br>${L('Продавец', 'Seller')}: ${l.bot ? `<span class="mk-bot">Plate Club Market</span>` : `<a href="#/u/${esc(l.seller)}">${esc(l.seller)}</a>`}` : ''}</div>
    ${l ? DealLine(l.price, p.value) : o.pl && p.paid != null ? PLLine(p.paid, p.value) : ''}
    <div class="pc-foot">${l ? Price(l.price) : `<span class="small">${L('Оценка', 'Value')} ${fmt(p.value)} PLT</span>`}${o.actions || ''}</div></article>`;
}
function DealLine(price, value) {
  const d = vsValue(price, value);
  return `<div class="deal-l ${d < 0 ? 'good' : d > 15 ? 'high' : ''}"><span>${L('Оценка', 'Value')} ${fmt(value)}</span><b>${d < 0 ? '−' + Math.abs(d) + '%' : d === 0 ? L('по оценке', 'at value') : '+' + d + '%'}</b></div>`;
}
function PLLine(paid, value) {
  const d = value - paid, pct = vsValue(value, paid);
  return `<div class="deal-l ${d > 0 ? 'good' : d < 0 ? 'bad' : ''}"><span>${L('Куплен за', 'Paid')} ${fmt(paid)}</span><b>${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d))} · ${pct > 0 ? '+' : ''}${pct}%</b></div>`;
}
function TierBars(counts) {
  const max = Math.max(1, ...Object.values(counts));
  return `<div class="tiers">${[...CFG.tiers].reverse().map(t => { const n = counts[t.id] || 0; return `<div class="trow t-${t.id}">${Rarity(t.id)}<div class="track2"><span style="width:${n / max * 100}%"></span></div><span class="mono" style="text-align:right">${n}</span></div>`; }).join('')}</div>`;
}
const TxRow = t => `<div class="tx rv"><span class="lbl">${esc(srv(t.label))}</span><span class="when">${date(t.at)} · ${t.id}</span><span class="amt${t.amount > 0 ? ' plus' : ''}">${t.amount > 0 ? '+' : '−'}${fmt(Math.abs(t.amount))}</span></div>`;
const LLoad = (w = 220) => `<span class="lload" role="img" aria-label="${L('Загрузка', 'Loading')}" style="--lw:${w}px"><span class="ll-glow"></span><span class="ll-rings"><i></i><i></i><i></i></span><img class="ll-ghost" src="${BRAND('logo-chrome-900.png')}" alt=""><span class="ll-fill"></span><span class="ll-shine"></span><span class="ll-drops"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></span><div class="lload-bar" aria-hidden="true"><i></i></div>`;
const skel = () => `<div class="wrap page-load" role="status" aria-label="${L('Загрузка', 'Loading')}"><div>${LLoad(200)}</div></div>`;
// personal avatar: first letter of the real name (without demo_) on a chrome gradient tinted by the nickname
const avaHue = n => { let h = 0; for (const ch of String(n || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 360; };
const Ava = n => { const nm = String(n || '?').replace(/^demo_/i, ''); const h = avaHue(n); return `<span class="ava" aria-hidden="true" style="background:linear-gradient(160deg,#fff 0%,hsl(${h} 90% 82%) 30%,hsl(${h} 75% 52%) 62%,hsl(${h} 85% 80%) 100%);color:hsl(${h} 80% 14%)">${esc(nm[0].toUpperCase())}</span>`; };
function LvlRing(lv, size = 42) {
  const r = (size - 6) / 2, C = 2 * Math.PI * r, k = lv.next > lv.cur ? (lv.xp - lv.cur) / (lv.next - lv.cur) : 1;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle class="bgc" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="fgc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - k)}"/></svg><b>${lv.level}</b>`;
}

function toast(msg, bad = false) { const el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = msg; $('#toasts').append(el); setTimeout(() => el.remove(), bad ? 5600 : 3400); }
function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.classList.add('is-loading'); if (label) btn.textContent = label; } else { btn.disabled = false; btn.classList.remove('is-loading'); if (btn.dataset.l) btn.innerHTML = btn.dataset.l; } }
const dlg = $('#dlg');
function openDialog(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); const f = dlg.querySelector('[autofocus]') || dlg.querySelector('button,input'); f && f.focus(); }
function confirmDialog({ title, lede = '', rows = [], ok = L('Подтвердить', 'Confirm'), danger = false }) {
  return new Promise(res => {
    openDialog(`<form method="dialog" class="dlg"><h2 class="h3" id="dlgTitle">${title}</h2>${lede ? `<p class="small" style="margin:0">${lede}</p>` : ''}
      ${rows.length ? `<dl class="kv">${rows.map(([k, v, c]) => `<dt${c ? ' class="tot"' : ''}>${k}</dt><dd${c ? ' class="tot"' : ''}>${v}</dd>`).join('')}</dl>` : ''}
      <div class="dlg-acts"><button class="btn btn-ghost" value="cancel">${L('Отмена', 'Cancel')}</button><button class="btn${danger ? ' btn-danger' : ' btn-chrome'}" value="ok" autofocus>${ok}</button></div></form>`);
    dlg.addEventListener('close', () => res(dlg.returnValue === 'ok'), { once: true });
  });
}
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
function coins(from, n = 14) {
  if (reduced() || !from) return; const r = from.getBoundingClientRect(); const to = ($('#balPill') || from).getBoundingClientRect();
  for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'coin-burst'; c.style.left = r.left + r.width / 2 + 'px'; c.style.top = r.top + r.height / 2 + 'px'; c.style.setProperty('--dx', (to.left + to.width / 2 - r.left - r.width / 2 + (Math.random() - 0.5) * 40) + 'px'); c.style.setProperty('--dy', (to.top - r.top + (Math.random() - 0.5) * 30) + 'px'); c.style.animationDelay = i * 35 + 'ms'; document.body.appendChild(c); setTimeout(() => c.remove(), 1400); }
}
function confetti(host, col, n = 40) {
  if (reduced()) return; const box = host.getBoundingClientRect();
  for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = 'particle'; s.style.position = 'fixed'; s.style.left = box.left + box.width / 2 + 'px'; s.style.top = box.top + box.height / 2 + 'px'; const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 260; s.style.setProperty('--dx', Math.cos(a) * r + 'px'); s.style.setProperty('--dy', Math.sin(a) * r * 0.7 + 'px'); s.style.setProperty('--rot', Math.random() * 720 + 'deg'); s.style.background = i % 3 ? col : '#fff'; s.style.zIndex = 500; document.body.appendChild(s); setTimeout(() => s.remove(), 1300); }
}


/* ---------- routing & chrome ---------- */
const NAVS = () => [['', L('Главная', 'Home'), 'home'], ['cases', L('Кейсы', 'Cases'), 'cases'], ['games', L('Игры', 'Games'), 'games'], ['market', L('Рынок', 'Market'), 'market'], ['top', L('Топ', 'Top'), 'trophy'], ['bonus', L('Бонусы', 'Bonuses'), 'gift']];
const BNAV = () => [['', L('Главная', 'Home'), 'home'], ['cases', L('Кейсы', 'Cases'), 'cases'], ['games', L('Игры', 'Games'), 'games'], ['market', L('Рынок', 'Market'), 'market'], ['collection', L('Номера', 'Plates'), 'coll']];
const SECTION_OF = { battles: 'games', battle: 'games', sets: 'games', swap: 'games', auction: 'games', upgrade: 'games', support: 'support', case: 'cases', transactions: 'wallet', achievements: 'bonus', rankings: 'top', plate: 'collection', verify: 'collection', u: 'top', trades: 'market' };
let lastBal = null;
function parseRoute() { const h = location.hash.replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const seg = path.split('/').filter(Boolean).map(decodeURIComponent); return { name: seg[0] || '', arg: seg[1], query: new URLSearchParams(qs || '') }; }
const go = h => { if (location.hash === h) render(); else location.hash = h; };
function chrome() {
  if (!CFG) return;
  const r = parseRoute(); const cur = SECTION_OF[r.name] ?? r.name;
  $('#topnav').innerHTML = NAVS().map(([id, t, ic]) => `<a href="#/${id}"${cur === id ? ' aria-current="page"' : ''}>${IC[ic]}${t}${id === 'games' && ME && ME.swaps ? '<i class="dot" style="position:absolute;top:4px;right:6px;width:7px;height:7px;border-radius:50%;background:#ff4d6d"></i>' : ''}${id === 'bonus' && PERKS && hasBonus() ? '<i class="dot" style="position:absolute;top:4px;right:6px;width:7px;height:7px;border-radius:50%;background:#ff4d6d"></i>' : ''}</a>`).join('');
  $('#topnav').setAttribute('aria-label', L('Главное меню', 'Main menu'));
  $('#botnav').innerHTML = BNAV().map(([id, t, ic]) => `<a href="#/${id}"${cur === id ? ' aria-current="page"' : ''}>${IC[ic]}<span>${t}</span></a>`).join('');
  const lang = `<div class="lang hide-s" role="group" aria-label="Language"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div>`;
  $('#hdrR').innerHTML = ME
    ? `${lang}${ME.role === 'admin' ? `<a class="pill admin hide-s" href="#/admin">${IC.crown.replace('<svg', '<svg width="16" height="16"')}${L('Админ', 'Admin')}${ME.inbox ? `<i class="cnt">${ME.inbox}</i>` : ''}</a><a class="icon-btn adm-m" href="#/admin" aria-label="${L('Панель админа', 'Admin panel')}">${IC.crown}${ME.inbox ? '<i class="dot"></i>' : ''}</a>` : ''}<a class="icon-btn hide-s" href="#/support" aria-label="${L('Поддержка', 'Support')}" title="${L('Поддержка', 'Support')}">${IC.chat}${ME.unread ? '<i class="dot"></i>' : ''}</a>${ME.level ? `<a class="lvl" href="#/bonus" title="${L('Уровень', 'Level')} ${ME.level.level}" aria-label="${L('Уровень', 'Level')} ${ME.level.level}">${LvlRing(ME.level)}</a>` : ''}<a class="icon-btn hide-s" href="#/bonus" aria-label="${L('Бонусы', 'Bonuses')}">${IC.gift}${PERKS && hasBonus() ? '<i class="dot"></i>' : ''}</a><a class="bal" id="balPill" href="#/wallet" aria-label="${L('Баланс', 'Balance')} ${fmt(ME.balance)} PLT"><span>${fmt(ME.balance)}</span><small>PLT</small><span class="plus" aria-hidden="true">+</span></a><button class="burger" data-act="drawer" aria-label="${L('Меню', 'Menu')}">${IC.menu}</button>`
    : `${lang}<a class="pill hide-s" href="#/login">${L('Войти', 'Sign in')}</a><a class="btn btn-chrome btn-sm" href="#/register">${L('Регистрация', 'Sign up')}</a><button class="burger" data-act="drawer" aria-label="${L('Меню', 'Menu')}">${IC.menu}</button>`;
  $('#foot').innerHTML = `<div class="wrap"><img src="${BRAND('logo-chrome-360.png')}" alt="Plate Club"><span>${L('Игровые предметы. Это не настоящие регистрационные номера.', 'Game items. These are not real registration plates.')}</span><span><a href="#/terms">${L('Правила', 'Terms')}</a> · <a href="#/privacy">${L('Конфиденциальность', 'Privacy')}</a> · <a href="#/help">${L('Помощь', 'Help')}</a> · <a href="#/support">${L('Написать нам', 'Contact us')}</a>${CFG && CFG.telegram ? ` · <a href="${esc(CFG.telegram.url)}" target="_blank" rel="noopener">Telegram</a>` : ''}</span></div>`;
  if (ME) { if (lastBal != null && ME.balance !== lastBal && !reduced()) { const d = ME.balance - lastBal, pill = $('#balPill'); if (pill) { rollNum(pill.querySelector('span'), lastBal, ME.balance); const f = document.createElement('span'); f.className = 'bal-fly ' + (d > 0 ? 'plus' : 'minus'); f.textContent = (d > 0 ? '+' : '−') + fmt(Math.abs(d)); pill.appendChild(f); pill.classList.add('bump'); setTimeout(() => f.remove(), 1500); } } lastBal = ME.balance; } else lastBal = null;
}
function rollNum(el, from, to) { if (!el) return; const t0 = performance.now(), D = 700; const st = now => { const k = Math.min(1, (now - t0) / D); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); }
const hasBonus = () => PERKS && (!PERKS.daily.claimed || PERKS.achievements.some(a => a.done && !a.claimed) || (PERKS.level && PERKS.level.unclaimed > 0));
let renderSeq = 0, marketTimer = null;
async function render(scroll = true) {
  const seq = ++renderSeq; const r = parseRoute(); const v = $('#view');
  clearInterval(marketTimer); clearInterval(btPoll); btSkip = true; rollAbort(); closeStage(true); chrome();
  const view = VIEWS[r.name] || VIEWS[''];
  if (view.auth && !ME) { v.innerHTML = await VIEWS.login({ next: location.hash, query: new URLSearchParams() }); after('login'); return; }
  v.innerHTML = skel();
  let html;
  try { html = await view(r); } catch (e) { html = `<div class="wrap" style="padding-block:60px">${Empty(e.status === 404 ? L('Не найдено', 'Not found') : L('Не удалось загрузить страницу', 'Could not load the page'), esc(e.message), `<a class="btn btn-ghost" href="#/">${L('На главную', 'Home')}</a>`)}</div>`; }
  if (seq !== renderSeq) return;
  v.innerHTML = (CFG && CFG.announcement && r.name !== 'admin' ? `<div class="wrap"><div class="announce">${IC.chat}<span>${esc(CFG.announcement)}</span></div></div>` : '') + html;
  const HEADS = { games: 5, battles: 5, battle: 5, sets: 1, swap: 2, auction: 3, support: 4, cases: 1, market: 2, trades: 2, collection: 2, top: 3, rankings: 3, profile: 3, u: 3, bonus: 4, achievements: 4, upgrade: 5, wallet: 6, transactions: 6, admin: 6 };
  v.style.setProperty('--head', `url(${IMG('head-' + (HEADS[r.name] || 1) + '.jpg')})`);
  if (scroll) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); window.scrollTo(0, 0); }
  after(r.name, r);
}
window.addEventListener('hashchange', () => { closeDrawer(); if (dlg.open) dlg.close(); render(true); });
const VIEWS = {};

/* ---------- living layer ---------- */
let revealIO = null;
function fx(root = document) {
  if (reduced()) return;
  document.documentElement.classList.add('rv-on');
  if (!revealIO && 'IntersectionObserver' in window) revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); countUp(e.target); revealIO.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  const groups = new Map();
  root.querySelectorAll('.rv:not(.in)').forEach(el => { const k = el.parentElement; const i = groups.get(k) || 0; groups.set(k, i + 1); if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(i, 8)); if (revealIO) revealIO.observe(el); else el.classList.add('in'); });
  setTimeout(() => root.querySelectorAll('.rv:not(.in)').forEach(el => { el.classList.add('in'); countUp(el); }), 2600);
  if (finePointer()) {
    root.querySelectorAll('.cc').forEach(t => { t.addEventListener('pointermove', e => { const r = t.getBoundingClientRect(); t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 12 + 'deg'); t.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 9 + 'deg'); }); t.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); }); });
    const hb = root.querySelector('#heroBg'); const hero = hb && hb.parentElement;
    if (hb) hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; hb.style.translate = `${(-x * 26).toFixed(1)}px ${(-y * 18).toFixed(1)}px`; });
  }
}
function countUp(el) {
  const b = el.matches && el.matches('.stat') ? el.querySelector('b') : null; if (!b || b._cnt) return; b._cnt = 1;
  const txt = b.textContent; if (!/^[\d \s]+$/.test(txt.trim())) return; const target = Number(txt.replace(/\D/g, '')); if (!target) return;
  const t0 = performance.now(), D = 900; const step = now => { const k = Math.min(1, (now - t0) / D); b.textContent = fmt(target * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}
function countdown(el, ends, onEnd) {
  const set = () => { if (!document.body.contains(el)) return clearInterval(t); const ms = Math.max(0, ends - Date.now()); const p = [Math.floor(ms / 3600e3), Math.floor(ms % 3600e3 / 60e3), Math.floor(ms % 60e3 / 1e3)].map(n => String(n).padStart(2, '0'));
    if (el.classList.contains('timer')) { const spans = el.querySelectorAll('span'); p.forEach((v, i) => { if (spans[i].textContent !== v) { spans[i].textContent = v; spans[i].classList.remove('tick'); void spans[i].offsetWidth; spans[i].classList.add('tick'); } }); } else el.textContent = p.join(':');
    if (!ms) { clearInterval(t); onEnd && onEnd(); } };
  const t = setInterval(set, 1000); set();
}
function after(name) {
  if (name === 'market') { loadMarket(); marketTimer = setInterval(() => { if (document.visibilityState === 'visible' && !dlg.open && parseRoute().name === 'market') loadMarket(true); }, 12000); }
  if (name === 'wallet' || name === 'transactions') walletHooks();
  if (name === 'register') regHooks();
  if (name === 'bonus') { loadRef(); loadQuests(); }
  if (name === 'admin') adminHooks();
  if (name === 'support') supportHooks();
  if (name === 'battle') { btSkip = false; battleHooks(); }
  if (name === 'swap') swapHooks();
  if (name === 'auction') auctionHooks();
  if (name === 'upgrade') upgradeHooks();
  const dt = $('#dealTimer'); if (dt) countdown(dt, CFG.deals[0].ends, () => location.reload());
  const dcd = $('#dealerCd'); if (dcd) countdown(dcd, Number(dcd.dataset.t), () => render(false));
  const dc = $('#dailyCd'); if (dc) countdown(dc, Number(dc.dataset.t), () => render(false));
  fx($('#view'));
}


/* ---------- home ---------- */
const MiniWheel = (pct = 0.32) => { const r = 80, C = 2 * Math.PI * r; return `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="${r}" fill="none" stroke="#2a1820" stroke-width="18"/><circle cx="100" cy="100" r="${r}" fill="none" stroke="url(#mwg)" stroke-width="18" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 100 100)" stroke-linecap="round"/><defs><linearGradient id="mwg" x1="0" x2="1"><stop offset="0" stop-color="#7affc4"/><stop offset="1" stop-color="#3ddc97"/></linearGradient></defs><line x1="100" y1="100" x2="100" y2="30" stroke="#fff" stroke-width="4" stroke-linecap="round" transform="rotate(70 100 100)"/><circle cx="100" cy="100" r="10" fill="#fff"/></svg>`; };
VIEWS[''] = async () => {
  const [mk, drops, rk, on] = await Promise.all([GET('/api/market?sort=val').catch(() => ({ listings: [] })), GET('/api/drops').catch(() => ({ drops: [] })), GET('/api/rankings').catch(() => ({ rankings: [] })), GET('/api/online').catch(() => ({ count: 0, players: [] }))]);
  const deals = CFG.deals.map(d => caseById(d.id));
  const popular = ['01', '05', '06', '12', '21', '30', '36', '40', '43', '44'].map(caseById);
  const floor = mk.listings.length ? Math.min(...mk.listings.map(l => l.price)) : 0;
  const top3 = rk.rankings.slice(0, 3);
  return `<section class="hero" style="--hero-img:url(${IMG('hero-chrome.jpg')});--hero-img-m:url(${IMG('hero-chrome-m.jpg')})"><div class="hero-bg" id="heroBg"></div>
    <div class="wrap hero-in"><h1 class="sr-only">Plate Club</h1>
      <img class="hero-logo" src="${BRAND('logo-chrome.png')}" alt="Plate Club" width="1417" height="542">
      <p class="hero-sub">${L('Коллекционные номера России и Беларуси. Открывай кейсы, улучшай номера и торгуй с другими игроками.', 'Collectible plates from Russia and Belarus. Open cases, upgrade plates and trade with other players.')}</p>
      <div class="row"><a class="btn btn-chrome btn-xl" href="#/cases">${L('Открыть кейс', 'Open a case')} <i>→</i></a><a class="btn btn-glass btn-xl" href="#/upgrade">${L('Апгрейд', 'Upgrade')}</a></div>
      <div class="hero-chips">${on.count ? `<a class="hchip glass online-chip" href="#/top" title="${esc(on.players.join(', '))}"><i class="live"></i><b>${on.count}</b>${L('онлайн', 'online')}</a>` : ''}<span class="hchip glass"><b>${CFG.cases.length}</b>${L('кейса', 'cases')}</span><span class="hchip glass"><b>2</b>${L('страны', 'countries')}</span><span class="hchip glass"><b>+${CFG.daily.base}</b>${L('PLT каждый день', 'PLT every day')}</span><span class="hchip glass"><b>2</b>${L('копии номера — максимум', 'copies per plate, max')}</span></div>
    </div><span class="scroll-cue" aria-hidden="true"></span></section>
  <div class="wrap">
    <section class="sec"><div class="deals-head"><div><p class="eyebrow">${L('Только сегодня', 'Today only')}</p><h2 class="h2" style="margin-top:8px">${L('Скидки дня', 'Daily deals')}</h2></div>
        <div><div class="timer" id="dealTimer" role="timer" aria-label="${L('До конца скидок', 'Deals end in')}"><span>00</span><i>:</i><span>00</span><i>:</i><span>00</span></div><div class="timer-lbl" aria-hidden="true"><span>${L('часы', 'hours')}</span><i></i><span>${L('мин', 'min')}</span><i></i><span>${L('сек', 'sec')}</span></div></div></div>
      <div class="deals">${deals.map(CaseCard).join('')}</div></section>
    <section class="sec">${SH(L('Игры', 'Games'), L('Баттлы, аукцион, коллекции и обмен.', 'Battles, auction, collections and swaps.'), `<a class="sh-link" href="#/games">${L('Все игры', 'All games')} →</a>`)}<div class="gmini">${[['battles', 'swords', L('Кейс-баттл', 'Case battle'), L('Кто выбьет дороже — забирает всё', 'Highest pull takes it all')], ['auction', 'hammer', L('Аукцион дня', 'Auction of the day'), L('Один редкий номер в день', 'One rare plate a day')], ['sets', 'layers', L('Коллекции', 'Collections'), L(`${CFG.sets.length} сетов с наградами`, `${CFG.sets.length} sets with rewards`)], ['swap', 'swap', L('Обмен', 'Swaps'), L('Номера на номера напрямую', 'Plates for plates, directly')]].map(([h, ic, t, x]) => `<a class="gm rv" href="#/${h}"><span class="gm-ic">${IC[ic]}</span><b>${t}</b><span class="small">${x}</span></a>`).join('')}</div></section>
    <section class="sec">${SH(L('Хиты', 'Hits'), '', `<a class="sh-link" href="#/cases">${L('Все кейсы', 'All cases')} →</a>`)}<div class="cgrid">${popular.map(CaseCard).join('')}</div></section>
    <section class="sec"><div class="bento">
      <a class="bcard b-up rv" href="#/upgrade" style="--bc:rgba(61,220,151,.25)"><div><p class="eyebrow">${L('Новое', 'New')}</p><h3 style="margin-top:8px">${L('Апгрейд номера', 'Plate upgrade')}</h3><p>${L('Поставь номер и выбери цель. Чем дороже цель — тем меньше шанс. Колесо решает.', 'Put in a plate and pick a target. The pricier the target, the lower the chance. The wheel decides.')}</p></div><div class="mini-wheel">${MiniWheel()}</div><span class="go">${L('Попробовать', 'Try it')} →</span></a>
      <a class="bcard b-top rv" href="#/top" style="--bc:rgba(255,210,94,.22)"><div><p class="eyebrow">${L('Рейтинг', 'Ranking')}</p><h3 style="margin-top:8px">${L('Самые дорогие аккаунты', 'Most valuable accounts')}</h3></div>
        <div class="podium-mini">${top3.length ? top3.map((r, i) => `<div class="pm"><b>${i + 1}</b><span>${esc(r.nickname)} <span class="lvl-tag">LV ${r.level}</span></span><span class="v">${fmt(r.total)}</span></div>`).join('') : `<p class="small">${L('Рейтинг появится с первыми игроками.', 'The ranking appears with the first players.')}</p>`}</div><span class="go">${L('Весь топ', 'Full ranking')} →</span></a>
      <a class="bcard b-mk rv" href="#/market"><div><p class="eyebrow">${L('Рынок', 'Market')} · <span class="live"></span>live</p><h3 style="margin-top:8px">${mk.listings.length} ${pl(mk.listings.length, ['номер', 'номера', 'номеров'], ['plate', 'plates'])} ${L('в продаже', 'for sale')}</h3><p>${floor ? L(`От ${fmt(floor)} PLT. Комиссия продавца ${CFG.fee * 100}%.`, `From ${fmt(floor)} PLT. Seller fee ${CFG.fee * 100}%.`) : L('Выставь первый номер.', 'List the first plate.')}</p></div><span class="go">${L('Открыть рынок', 'Open market')} →</span></a>
      <a class="bcard b-bonus rv" href="#/bonus" style="--bc:rgba(198,255,61,.18)"><div><p class="eyebrow">${L('Бонусы', 'Bonuses')}</p><h3 style="margin-top:8px">${L(`${CFG.daily.base} PLT каждый день`, `${CFG.daily.base} PLT every day`)}</h3><p>${L('Плюс награды за уровни, достижения и промокоды.', 'Plus rewards for levels, achievements and promo codes.')}</p></div><span class="go">${L('Забрать', 'Claim')} →</span></a>
    </div></section>
    ${drops.drops.length ? `<section class="sec" style="padding-bottom:80px">${SH(L('Редкие выигрыши', 'Rare drops'), L('Номера редкие и выше, выпавшие из кейсов.', 'Rare-or-better plates pulled from cases.'))}<div class="dgrid">${drops.drops.slice(0, 8).map((d, i) => `<a class="drop rv t-${d.plate.tier}" href="#/plate/${d.plate.id}">${Plate(d.plate)}${Rarity(d.plate.tier)}<small>${esc(d.nickname)} · ${rel(d.at)}</small></a>`).join('')}</div></section>` : '<div style="height:60px"></div>'}
  </div>`;
};


/* ---------- cases ---------- */
const CF = { cat: 'all', sort: 'id' };
VIEWS.cases = async () => `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Каталог', 'Catalogue')} · ${CFG.cases.length}</p><h1 class="h1" style="margin-top:12px">${L('Кейсы', 'Cases')}</h1><p class="lede" style="margin-top:12px">${L('У каждого кейса свой цвет и своя редкость. Шансы видны до открытия. Белорусские номера дешевле.', 'Every case has its own colour and rarity. Odds are shown before you open. Belarusian plates are cheaper.')}</p></div>
    <label class="sr-only" for="csort2">${L('Сортировка', 'Sort')}</label><select class="inline" id="csort2">${[['id', L('По порядку', 'Default')], ['pa', L('Сначала дешёвые', 'Cheapest first')], ['pd', L('Сначала дорогие', 'Priciest first')], ['rare', L('Больше редких', 'Most rares')]].map(([v, t]) => `<option value="${v}"${CF.sort === v ? ' selected' : ''}>${t}</option>`).join('')}</select></section>
  ${featured()}
  <div class="cats" role="toolbar" aria-label="${L('Категории', 'Categories')}">${[['all', L('Все', 'All')], ...Object.keys(CFG.cats).map(k => [k, catName(k)])].map(([k, t]) => `<button class="chip" data-act="ccat" data-k="${k}" aria-pressed="${CF.cat === k}">${t} <b>${k === 'all' ? CFG.cases.length : CFG.cases.filter(c => c.cat === k).length}</b></button>`).join('')}</div>
  <div id="cgridBox" style="padding-block:18px 80px">${casesGrid()}</div></div>`;
function featured() {
  const c = caseById('44'); if (!c) return '';
  return `<a class="case-hero feat t-${c.rank}" href="#/case/${c.id}" style="--c:${c.color};--c2:${c.color2};margin:0 0 18px;text-decoration:none;color:#fff"><div class="cc-bg"></div>
    <div class="case-art" style="min-height:220px">${glyph(c)}</div>
    <div class="case-info"><p class="eyebrow" style="color:var(--tc)">${L('Легенда · самые щедрые шансы', 'Legend · the most generous odds')}</p><h2 class="case-name" style="font-size:clamp(40px,6vw,80px)">${esc(caseName(c))}</h2><p class="lede" style="color:rgba(255,255,255,.75)">${esc(caseNote(c))}</p>
      <div class="row"><span class="cc-price" style="font-size:18px;padding:10px 18px">${fmt(priceOf(c))}<small>PLT</small></span><span class="btn btn-glass btn-info" data-act="odds" data-case="${c.id}" role="button" tabindex="0"><i>i</i>${L('Шансы', 'Odds')}</span></div></div></a>`;
}
function casesGrid() {
  let list = CFG.cases.filter(c => CF.cat === 'all' || c.cat === CF.cat);
  if (CF.sort === 'pa') list = [...list].sort((a, b) => priceOf(a) - priceOf(b)); else if (CF.sort === 'pd') list = [...list].sort((a, b) => priceOf(b) - priceOf(a)); else if (CF.sort === 'rare') list = [...list].sort((a, b) => rarePlus(b) - rarePlus(a));
  return `<div class="cgrid">${list.map(CaseCard).join('')}</div>`;
}

VIEWS.case = async ({ arg }) => {
  const c = caseById(arg); if (!c) throw Object.assign(new Error(L('Такого кейса нет.', 'No such case.')), { status: 404 });
  const ru = c.pool.RU.length, by = c.pool.BY.length; const d = dealOf(c);
  const regs = by && !ru ? `${L('Беларусь', 'Belarus')}: ${c.pool.BY.map(r => (LANG === 'en' ? BY_EN[r] : CFG.byRegions[r])).join(', ')}` : ru && !by ? (ru === Object.keys(CFG.regions).length ? L('Вся Россия', 'All of Russia') : L('Регионы ', 'Regions ') + c.pool.RU.join(', ')) : L('Россия и Беларусь', 'Russia and Belarus');
  const strip = Array.from({ length: 16 }, () => cardHtml(visualPlate(c))).join('');
  const similar = CFG.cases.filter(x => x.cat === c.cat && x.id !== c.id).slice(0, 4);
  return `<div class="wrap"><a class="back" href="#/cases">← ${L('Все кейсы', 'All cases')}</a>
    <section class="case-hero t-${c.rank}" style="--c:${c.color};--c2:${c.color2}"><div class="cc-bg"></div>
      <div class="turntable" aria-hidden="true"><div class="box3">${['bk', 'lf', 'rt', 'bt', 'fr', 'tp'].map(f => `<div class="f ${f}">${f === 'fr' || f === 'bk' ? `<span class="seam"></span><span class="lt l"></span><span class="lt r"></span><span class="emb">${IC.star}</span>` : ''}</div>`).join('')}<span class="hd"></span></div></div>
      <div class="case-info"><p class="eyebrow" style="color:rgba(255,255,255,.6)">№${c.id} · ${catName(c.cat)} · <span style="color:var(--tc)">${rankName(c.rank)}</span></p><h1 class="case-name">${esc(caseName(c))}</h1><p class="lede" style="color:rgba(255,255,255,.75)">${esc(caseNote(c))} ${esc(regs)}.</p>
        <div class="bigprice">${d ? `<span class="was" style="font-size:.45em">${fmt(d.was)}</span>` : ''}${fmt(priceOf(c))}<small>PLT</small>${d ? `<span class="tag deal">−${d.pct}% ${L('сегодня', 'today')}</span>` : ''}</div>
        <div id="openAct" class="row">${openAction(c)}</div>
        <div class="row"><button class="btn btn-glass btn-info" data-act="odds" data-case="${c.id}"><i>i</i>${L('Шансы выпадения', 'Drop odds')}</button></div>
      </div></section>
    <section class="sec">${SH(L('Что внутри', 'What’s inside'), L('Так выглядит лента при открытии. Результат выбирает сервер до прокрутки.', 'This is the strip you’ll see. The server picks the result before it spins.'))}<div class="inside" aria-hidden="true"><div class="inside-track">${strip}${strip}</div></div></section>
    <section class="split" style="padding-bottom:20px"><div>${similar.length ? `${SH(L('Похожие кейсы', 'Similar cases'))}<div class="cgrid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${similar.map(CaseCard).join('')}</div>` : ''}</div>
      <aside class="panel" id="buybox" style="align-self:start">${buyBox(c)}</aside></section><div style="height:60px"></div></div>`;
};
function openAction(c) {
  if (!ME) return `<a class="btn btn-chrome btn-lg" href="#/login?next=${encodeURIComponent('#/case/' + c.id)}">${L('Войти, чтобы открыть', 'Sign in to open')}</a>`;
  const short = priceOf(c) - ME.balance;
  return `<button class="btn btn-chrome btn-xl" id="openBtn" data-act="open" data-case="${c.id}" ${short > 0 ? 'disabled' : ''}>${L('Открыть за', 'Open for')} ${fmt(priceOf(c))} PLT</button>${short > 0 ? `<span class="small">${L(`Не хватает ${fmt(short)} PLT.`, `${fmt(short)} PLT short.`)} <a class="btn-text" href="#/wallet">${L('Пополнить', 'Top up')}</a> · <a class="btn-text" href="#/bonus">${L('Бонусы', 'Bonuses')}</a></span>` : ''}`;
}
function buyBox(c) {
  const p = priceOf(c);
  return `<h2 class="h3" style="margin-bottom:14px">${L('Итог', 'Summary')}</h2><dl class="kv"><dt>${L('Цена', 'Price')}</dt><dd>${fmt(p)} PLT</dd><dt>${L('Средняя оценка содержимого', 'Average content value')}</dt><dd>≈ ${fmt(c.ev)} PLT</dd><dt>${L('Средний выкуп банком', 'Average bank buy-back')}</dt><dd>≈ ${fmt(c.ev * CFG.bankRate)} PLT</dd><dt>${L('Редкий и выше', 'Rare or better')}</dt><dd>${rarePlus(c)}%</dd><dt>XP</dt><dd>+${fmt(p)}</dd>
    ${ME ? `<dt class="tot">${L('Баланс после открытия', 'Balance after opening')}</dt><dd class="tot">${ME.balance >= p ? fmt(ME.balance - p) + ' PLT' : '—'}</dd>` : ''}</dl>
    <p class="small" style="margin:16px 0 0">${L('Открытие кейса не гарантирует прибыль: в среднем выкуп банком ниже цены кейса.', 'Opening a case does not guarantee profit: on average the bank buy-back is below the case price.')}</p>`;
}


/* ---------- market ---------- */
const M = { q: '', tiers: [], group: '', min: '', max: '', sort: 'deal', who: '' };
VIEWS.market = async () => {
  const [st, sales, dl, on] = await Promise.all([GET('/api/market/stats').catch(() => null), GET('/api/market/sales').catch(() => ({ sales: [] })), GET('/api/dealer').catch(() => null), GET('/api/online').catch(() => ({ count: 0 }))]);
  const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button data-act="mseg" data-k="${k}" data-v="${v}" aria-pressed="${M[k] === v}">${t}</button>`).join('')}</div>`;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow"><span class="live"></span>${L('Рынок онлайн', 'Live market')}${on.count ? ` · ${on.count} ${pl(on.count, ['игрок', 'игрока', 'игроков'], ['player', 'players'])} ${L('в сети', 'online')}` : ''} · ${L('комиссия продавца', 'seller fee')} ${CFG.fee * 100}%</p><h1 class="h1" style="margin-top:12px">${L('Рынок', 'Market')}</h1><p class="lede" style="margin-top:10px">${L('Покупайте ниже оценки — продавайте дороже. Зелёная метка — лот дешевле оценки.', 'Buy below value, sell higher. A green tag means the lot is below its value.')}</p></div>
    <div class="row">${ME ? `<button class="btn btn-chrome" data-act="listdlg">${L('Выставить номер', 'List a plate')}</button><a class="btn btn-ghost" href="#/trades">${L('Мои сделки', 'My trades')}</a>` : `<a class="btn btn-chrome" href="#/login?next=%23%2Fmarket">${L('Войти, чтобы торговать', 'Sign in to trade')}</a>`}</div></section>
  ${st ? `<div class="mk-stats"><div class="stat rv"><span>${L('В продаже', 'Listed')}</span><b>${fmt(st.active)}</b></div><div class="stat rv"><span>${L('Ниже оценки', 'Below value')}</span><b class="up">${fmt(st.deals)}</b></div><div class="stat rv"><span>${L('Сделок за сутки', 'Trades, 24h')}</span><b>${fmt(st.sales)}</b></div><div class="stat rv"><span>${L('Оборот за сутки', 'Volume, 24h')}</span><b>${fmt(st.volume)}</b></div></div>` : ''}
  ${dl ? dealerPanel(dl) : ''}
  <section class="tools" aria-label="${L('Поиск и фильтры', 'Search and filters')}">
    <div class="tools-row"><label class="search">${IC.search}<span class="sr-only">${L('Поиск номера', 'Search plates')}</span><input id="mq" type="search" placeholder="А777АА, 777, 7777 AB…" value="${esc(M.q)}" autocomplete="off"></label>
      ${seg('sort', [['deal', L('Выгодные', 'Best deals')], ['new', L('Новые', 'New')], ['pa', L('Дешевле', 'Cheapest')], ['pd', L('Дороже', 'Priciest')], ['rar', L('Редкие', 'Rarest')]])}</div>
    <div class="tools-row">${seg('who', [['', L('Все продавцы', 'All sellers')], ['players', L('Игроки', 'Players')], ['market', L('Рынок', 'Market')]])}${seg('group', [['', L('Все', 'All')], ['ru', L('Россия', 'Russia')], ['by', L('Беларусь', 'Belarus')]])}
      ${CFG.tiers.map(t => `<button class="chip t-${t.id}" data-act="mtier" data-t="${t.id}" aria-pressed="${M.tiers.includes(t.id)}"><i></i>${tierName(t.id)}</button>`).join('')}
      <div class="range"><label class="sr-only" for="mmin">${L('Цена от', 'Min price')}</label><input class="field mono" id="mmin" type="number" inputmode="numeric" min="0" placeholder="${L('от', 'min')}" value="${esc(M.min)}"><label class="sr-only" for="mmax">${L('Цена до', 'Max price')}</label><input class="field mono" id="mmax" type="number" inputmode="numeric" min="0" placeholder="${L('до', 'max')}" value="${esc(M.max)}"></div>
      <button class="btn-text" data-act="mreset">${L('Сбросить', 'Reset')}</button></div>
  </section><div id="mres">${skel()}</div>
  ${sales.sales.length ? `<section class="sec" style="padding-bottom:80px">${SH(L('Последние сделки', 'Latest trades'))}<div class="drops">${sales.sales.map(s => `<a class="drop t-${s.plate.tier}" href="#/plate/${s.plate.id}">${Plate(s.plate, { iri: false })}<span class="price">${fmt(s.price)}<small>PLT</small></span><small>${esc(s.seller)} → ${esc(s.buyer)} · ${rel(s.at)}</small></a>`).join('')}</div></section>` : '<div style="height:80px"></div>'}</div>`;
};
function dealerPanel(d) {
  const left = Math.max(0, d.perDay - d.used);
  return `<section class="dealer rv" aria-label="${L('Скупщик', 'Dealer')}"><div class="dealer-h"><div><p class="eyebrow">${L('Скупщик · спрос дня', 'Dealer · today’s demand')}</p><h2 class="h3" style="margin-top:6px">${L(`Платит ${Math.round(d.rate * 100)}% оценки`, `Pays ${Math.round(d.rate * 100)}% of value`)}</h2>
    <p class="small" style="margin:6px 0 0">${L(`Обычные и хорошие номера. До ${d.perDay} в день, осталось ${left}. Новый спрос через`, `Common and fine plates. Up to ${d.perDay} a day, ${left} left. New demand in`)} <span class="mono" id="dealerCd" data-t="${d.ends}">--:--:--</span></p></div>
    ${ME ? `<button class="btn btn-chrome" data-act="dealer" ${d.plates.length && left ? '' : 'disabled'}>${d.plates.length ? L(`Продать скупщику · ${d.plates.length}`, `Sell to the dealer · ${d.plates.length}`) : L('Подходящих номеров нет', 'No matching plates')}</button>` : `<a class="btn btn-ghost" href="#/login?next=%23%2Fmarket">${L('Войти', 'Sign in')}</a>`}</div>
    <div class="dealer-d">${d.demands.map(x => `<span class="dem">${esc(L(x.ru, x.en))}</span>`).join('')}</div></section>`;
}
let mkSeq = 0;
async function loadMarket(silent = false) {
  const box = $('#mres'); if (!box) return; const seq = ++mkSeq;
  const p = new URLSearchParams({ sort: M.sort }); if (M.q) p.set('q', M.q); if (M.tiers.length) p.set('tiers', M.tiers.join(',')); if (M.group) p.set('group', M.group); if (M.min !== '') p.set('min', M.min); if (M.max !== '') p.set('max', M.max); if (M.who) p.set('who', M.who);
  let d; try { d = await GET('/api/market?' + p); } catch (e) { if (!silent) box.innerHTML = Empty(L('Не удалось загрузить рынок', 'Could not load the market'), esc(e.message)); return; }
  if (seq !== mkSeq || !$('#mres')) return;
  const filtered = M.q || M.tiers.length || M.group || M.who || M.min !== '' || M.max !== '';
  box.innerHTML = `<div class="meta"><span>${d.listings.length} ${pl(d.listings.length, ['объявление', 'объявления', 'объявлений'], ['listing', 'listings'])}</span><span>${L('Поиск понимает русские и латинские буквы', 'Search understands Cyrillic and Latin letters')}</span></div>
  ${d.listings.length ? `<div class="pgrid">${d.listings.map(l => PlateCard(l.plate, { listing: l, flag: l.mine ? L('Ваше', 'Yours') : '', actions: l.mine ? `<span class="row"><button class="btn btn-sm btn-ghost" data-act="editlisting" data-id="${l.id}" data-price="${l.price}">${L('Цена', 'Price')}</button><button class="btn btn-sm btn-ghost" data-act="cancel" data-id="${l.id}">${L('Снять', 'Cancel')}</button></span>` : `<button class="btn btn-sm btn-chrome" data-act="detail" data-id="${l.plate.id}">${L('Купить', 'Buy')}</button>` })).join('')}</div>`
    : filtered ? Empty(L('Ничего не нашлось', 'Nothing found'), L('Уберите часть фильтров или сократите запрос.', 'Remove some filters or shorten the query.'), `<button class="btn btn-ghost" data-act="mreset">${L('Сбросить фильтры', 'Reset filters')}</button>`)
      : Empty(L('Станьте первым продавцом', 'Be the first seller'), L('На рынке пока нет номеров.', 'There are no plates on the market yet.'), ME ? `<button class="btn btn-chrome" data-act="listdlg">${L('Выставить номер', 'List a plate')}</button>` : `<a class="btn btn-chrome" href="#/register">${L('Создать аккаунт', 'Create an account')}</a>`, { letters: 'ААА', digits: '001', region: '77' })}`;
  if (!silent) fx(box);
}
VIEWS.trades = async () => {
  const d = await GET('/api/market/mine');
  const ST = { ACTIVE: L('Активно', 'Active'), SOLD: L('Продано', 'Sold'), CANCELLED: L('Снято', 'Cancelled'), RESERVED: L('Резерв', 'Reserved') };
  return `<div class="wrap"><a class="back" href="#/market">← ${L('Рынок', 'Market')}</a><section class="page-head"><div><h1 class="h1">${L('Мои сделки', 'My trades')}</h1></div></section>
  <div class="panel" style="margin-bottom:80px">${d.trades.length ? d.trades.map(t => `<div class="tx"><span class="lbl"><a href="#/plate/${t.plate.id}">${esc(plateStr(t.plate))}</a> · ${t.role === 'seller' ? (t.buyer ? L('вы продали ', 'you sold to ') + esc(t.buyer) : L('ваше объявление', 'your listing')) : L('вы купили у ', 'you bought from ') + esc(t.seller)} <span class="tag s-${t.status}">${ST[t.status]}</span></span><span class="when">${date(t.at)} · ${t.id}</span><span class="amt">${fmt(t.price)}</span></div>`).join('') : `<p class="small" style="margin:0">${L('Сделок пока нет.', 'No trades yet.')}</p>`}</div></div>`;
};
VIEWS.trades.auth = true;

/* ---------- plate page ---------- */
VIEWS.plate = async ({ arg }) => {
  const d = await GET('/api/plates/' + encodeURIComponent(arg)); const p = d.plate; const l = d.listing;
  const mine = ME && p.owner === ME.nickname;
  const KIND = { MINTED: L('Выпущен', 'Minted'), LISTED: L('Выставлен на рынок', 'Listed'), PRICE_CHANGED: L('Цена изменена', 'Price changed'), DELISTED: L('Снят с рынка', 'Delisted'), TRANSFERRED: L('Продан', 'Sold'), BANKED: L('Продан банку', 'Sold to the bank'), UPGRADED: L('Сожжён в апгрейде', 'Burned in an upgrade') };
  const gone = p.status === 'BURNED' || p.status === 'BANKED';
  return `<div class="wrap"><a class="back" href="javascript:history.back()">← ${L('Назад', 'Back')}</a>
    <section class="vf"><p class="eyebrow">${L('Запись номера', 'Plate record')} · ${Rarity(p.tier)}</p>
      <div class="vf-frame t-${p.tier}" id="vfFrame"><div class="vf-scan"></div>${Plate(p, { holo: !gone })}</div>
      <div class="vf-id iri-t" id="vfId">${p.id}</div>
      <div class="pc-tags" style="justify-content:center">${Perks(p)}${Copy(p)}${gone ? `<span class="tag">${p.status === 'BURNED' ? L('Сожжён', 'Burned') : L('У банка', 'With the bank')}</span>` : ''}</div>
      <button class="btn btn-chrome btn-lg" data-act="verify" data-id="${p.id}">${IC.shield.replace('<svg', '<svg width="20" height="20"')}${L('Проверить подлинность', 'Verify authenticity')}</button>
      <div class="vf-res" id="vfRes" aria-live="polite"></div></section>
    <section class="split" style="padding-bottom:80px">
      <div class="panel"><h1 class="h2">${esc(plateStr(p))}</h1>
        <dl class="kv" style="margin-top:18px"><dt>ID</dt><dd>${p.id}</dd><dt>${L('Редкость', 'Rarity')}</dt><dd>${tierName(p.tier)}</dd>${perkOf(p).length ? `<dt>${L('Чем хорош', 'Why it’s special')}</dt><dd>${perkOf(p).map(esc).join(', ')}</dd>` : ''}<dt>${L('Экземпляр', 'Copy')}</dt><dd>${p.copy || 1} ${L('из', 'of')} 2</dd><dt>${L('Регион', 'Region')}</dt><dd>${esc(regionLabel(p))}</dd><dt>${L('Оценка', 'Value')}</dt><dd>${fmt(p.value)} PLT</dd>
          <dt>${L('Создан', 'Created')}</dt><dd>${date(p.created)}</dd><dt>${L('Происхождение', 'Origin')}</dt><dd>${esc(srv(p.origin))}</dd><dt>${L('Владелец', 'Owner')}</dt><dd>${p.owner ? `<a href="#/u/${esc(p.owner)}">${esc(p.owner)}</a>` : '—'}</dd></dl>
        ${l ? `<div class="row" style="margin-top:22px;justify-content:space-between"><div><p class="eyebrow">${L('В продаже', 'For sale')} · ${l.id}</p>${Price(l.price)}<p class="small" style="margin:4px 0 0">${L('Продавец', 'Seller')}: <a href="#/u/${esc(l.seller)}">${esc(l.seller)}</a></p></div>${mine ? `<span class="small">${L('Это ваше объявление', 'This is your listing')}</span>` : `<button class="btn btn-chrome btn-lg" data-act="detail" data-id="${p.id}">${L('Купить за', 'Buy for')} ${fmt(l.price)} PLT</button>`}</div>` : ''}
        ${ME && !mine && !l && p.owner && p.status === 'OWNED' ? `<div class="row" style="margin-top:22px"><a class="btn btn-ghost" href="#/swap/new?to=${encodeURIComponent(p.owner)}&want=${p.id}">${IC.swap}${L('Предложить обмен владельцу', 'Offer the owner a swap')}</a></div>` : ''}
        ${mine && !l ? `<div class="row" style="margin-top:22px"><button class="btn btn-chrome" data-act="listdlg" data-id="${p.id}">${L('Выставить на рынок', 'List on the market')}</button><a class="btn btn-ghost" href="#/upgrade?p=${p.id}">${L('Апгрейд', 'Upgrade')}</a></div>` : ''}</div>
      <div class="panel"><h2 class="h3" style="margin-bottom:18px">${L('История', 'History')}</h2><ol class="timeline">${d.history.slice().reverse().map(e => `<li class="rv"><b>${KIND[e.kind] || e.kind}${e.price ? ' · ' + fmt(e.price) + ' PLT' : ''}</b><span>${date(e.at)}${e.from ? ' · ' + L('от ', 'from ') + esc(e.from) : ''}${e.to ? ' · ' + L('к ', 'to ') + esc(e.to) : ''}</span></li>`).join('')}</ol></div>
    </section></div>`;
};
VIEWS.verify = VIEWS.plate;

VIEWS.u = async ({ arg }) => {
  const [{ profile: u }, mk] = await Promise.all([GET('/api/users/' + encodeURIComponent(arg)), GET('/api/market?seller=' + encodeURIComponent(arg))]);
  return `<div class="wrap"><section class="page-head"><div class="row" style="gap:16px">${Ava(u.nickname).replace('class="ava"', 'class="ava" style="width:64px;height:64px;font-size:28px;border-radius:20px"')}<div><p class="eyebrow">${L('Коллекционер · с ', 'Collector · since ')}${day(u.joined)}</p><h1 class="h1" style="margin-top:8px">${esc(u.nickname)}</h1>${Medals(u.medals)}${u.sets && u.sets.length ? `<div class="pbadges">${u.sets.map(id => { const st = CFG.sets.find(x => x.id === id); return st ? `<span class="pbadge" style="--sc:${st.color}" title="${esc(L(st.ru, st.en))}">${esc(st.badge)}</span>` : ''; }).join('')}</div>` : ''}</div></div>${ME && ME.nickname !== u.nickname ? `<a class="btn btn-chrome" href="#/swap/new?to=${encodeURIComponent(u.nickname)}">${IC.swap}${L('Предложить обмен', 'Offer a swap')}</a>` : ''}</section>
    <div class="stats s4"><div class="stat"><span>${L('Номеров', 'Plates')}</span><b>${u.plates}</b></div><div class="stat"><span>${L('Оценка', 'Value')}</span><b>${fmt(u.value)}</b></div><div class="stat"><span>${L('Регионов', 'Regions')}</span><b>${u.regions}</b></div><div class="stat"><span>${L('Продано', 'Sold')}</span><b>${u.sold}</b></div></div>
    <section class="sec">${SH(L('В продаже', 'For sale'))}${mk.listings.length ? `<div class="pgrid">${mk.listings.map(l => PlateCard(l.plate, { listing: l, actions: l.mine ? `<span class="small">${L('Ваше', 'Yours')}</span>` : `<button class="btn btn-sm btn-chrome" data-act="detail" data-id="${l.plate.id}">${L('Купить', 'Buy')}</button>` })).join('')}</div>` : Empty(L('Ничего не выставлено', 'Nothing listed'), L(`У ${esc(u.nickname)} сейчас нет номеров на рынке.`, `${esc(u.nickname)} has no plates on the market right now.`))}</section>
    <section class="sec" style="padding-bottom:80px">${SH(L('Лучшее в коллекции', 'Collection highlights'))}${u.top.length ? `<div class="pgrid">${u.top.map(p => PlateCard(p)).join('')}</div>` : Empty(L('Пока пусто', 'Empty for now'), L('В этой коллекции нет номеров.', 'This collection has no plates.'))}</section></div>`;
};


/* ---------- collection ---------- */
const C = { tier: '', sort: 'value' };
VIEWS.collection = async () => {
  const d = await GET('/api/collection'); const own = d.plates;
  const counts = {}; own.forEach(p => { counts[p.tier] = (counts[p.tier] || 0) + 1; });
  let list = own.filter(p => !C.tier || p.tier === C.tier);
  list.sort(C.sort === 'value' ? (a, b) => b.value - a.value : C.sort === 'new' ? (a, b) => b.created - a.created : (a, b) => a.region.localeCompare(b.region, undefined, { numeric: true }));
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Коллекция', 'Collection')} · ${esc(ME.nickname)}</p><h1 class="h1" style="margin-top:12px">${L('Мои номера', 'My plates')}</h1></div><div class="row"><a class="btn btn-ghost" href="#/upgrade">${L('Апгрейд', 'Upgrade')}</a><a class="btn btn-chrome" href="#/cases">${L('Открыть кейс', 'Open a case')}</a></div></section>
    <div class="split"><div class="stats"><div class="stat rv"><span>${L('Номеров', 'Plates')}</span><b>${own.length}</b></div><div class="stat rv"><span>${L('Оценка коллекции', 'Collection value')}</span><b>${fmt(own.reduce((a, p) => a + p.value, 0))}</b></div><div class="stat rv"><span>${L('Регионов', 'Regions')}</span><b>${new Set(own.map(p => p.country + p.region)).size}</b></div>${(() => { const k = own.filter(p => p.paid != null); const d = k.reduce((a, p) => a + p.value - p.paid, 0); return `<div class="stat rv"><span>${L('Прибыль по оценке', 'Profit at value')}</span><b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}</b></div>`; })()}</div>
      <div class="panel">${TierBars(counts)}</div></div>
    <section style="padding-block:24px 80px">
      <div class="row" style="justify-content:space-between;margin-bottom:16px"><div class="row"><button class="chip" data-act="ctier" data-t="" aria-pressed="${!C.tier}">${L('Все', 'All')}</button>${CFG.tiers.map(t => `<button class="chip t-${t.id}" data-act="ctier" data-t="${t.id}" aria-pressed="${C.tier === t.id}"><i></i>${tierName(t.id)}</button>`).join('')}</div>
        <label class="sr-only" for="csort">${L('Сортировка', 'Sort')}</label><select class="inline" id="csort">${[['value', L('Дороже', 'Most valuable')], ['new', L('Новые', 'Newest')], ['region', L('По региону', 'By region')]].map(([v, t]) => `<option value="${v}"${C.sort === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      ${list.length ? `<div class="pgrid">${list.map(p => PlateCard(p, { pl: true, flag: p.listing ? L('На рынке · ', 'Listed · ') + fmt(p.listing.price) : '', flagCls: 's-ACTIVE', actions: p.listing ? `<button class="btn btn-sm btn-ghost" data-act="cancel" data-id="${p.listing.id}">${L('Снять с рынка', 'Delist')}</button>` : `<span class="row"><a class="btn btn-sm btn-ghost" href="#/upgrade?p=${p.id}" title="${L('Апгрейд', 'Upgrade')}">${IC.up.replace('<svg', '<svg width="16" height="16"')}</a><button class="btn btn-sm btn-ghost" data-act="bank" data-id="${p.id}" data-v="${p.value}" data-s="${esc(plateStr(p))}">${L('Банку', 'Bank')} ${fmt(p.value * CFG.bankRate)}</button><button class="btn btn-sm btn-chrome" data-act="listdlg" data-id="${p.id}">${L('Продать', 'Sell')}</button></span>` })).join('')}</div>`
        : Empty(own.length ? L('В этой редкости пусто', 'Nothing in this rarity') : L('Коллекция пуста', 'Your collection is empty'), own.length ? L('Выберите другую редкость.', 'Pick another rarity.') : L('Откройте кейс или купите номер на рынке.', 'Open a case or buy a plate on the market.'), `<a class="btn btn-chrome" href="#/cases">${L('К кейсам', 'To cases')}</a>`, { letters: 'ААА', digits: '000', region: '00' })}
    </section></div>`;
};
VIEWS.collection.auth = true;

/* ---------- wallet ---------- */
const money = (m, c) => new Intl.NumberFormat(LOC(), { style: 'currency', currency: c }).format(m / 100);
VIEWS.wallet = async ({ query }) => {
  const all = query && query.get('all'); const w = await GET('/api/wallet' + (all ? '?all=1' : ''));
  const methods = CFG.payments.methods; const cur = store.get('cur', CFG.payments.currencies[0]);
  const payId = query && query.get('payment'); const pay = payId && w.payments.find(p => p.id === payId); if (pay) await refreshMe();
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Кошелёк · игровые токены PLT', 'Wallet · PLT game tokens')}</p><p class="bigbal chrome-t">${fmt(w.balance)}<small>PLT</small></p><p class="small" style="margin-top:10px">${L('PLT работают только внутри Plate Club: их нельзя вывести или обменять на деньги.', 'PLT only work inside Plate Club: they cannot be withdrawn or exchanged for money.')}</p></div></section>
    ${pay ? `<div class="notice" style="margin-bottom:22px"><b>${L('Платёж', 'Payment')} ${pay.id}: ${pay.status}</b>${pay.status === 'PAID' ? L(`${fmt(pay.plt)} PLT зачислены.`, `${fmt(pay.plt)} PLT credited.`) : L('Баланс изменится после подтверждения платёжного сервиса.', 'Your balance changes once the payment provider confirms.')}</div>` : ''}
    <section class="split" style="padding-bottom:80px">
      <form class="panel" id="topupForm" style="display:grid;gap:16px;align-content:start"><div class="row" style="justify-content:space-between"><h2 class="h3">${L('Пополнить', 'Top up')}</h2><label class="sr-only" for="tcur">${L('Валюта', 'Currency')}</label><select class="inline" id="tcur" name="cur">${CFG.payments.currencies.map(c => `<option${c === cur ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
        <fieldset style="border:0;padding:0;margin:0"><legend class="sr-only">${L('Пакет', 'Package')}</legend><div class="pkgs">${CFG.payments.packages.map((p, i) => `<label class="pkg"><input type="radio" name="pkg" value="${p.id}" ${i === 2 ? 'checked' : ''}>${p.tag ? `<span class="tag deal">${p.tag}</span>` : ''}<b>${fmt(p.plt)}</b><span class="small">PLT</span><span class="mono small" data-price="${esc(JSON.stringify(p.price))}">${money(p.price[cur], cur)}</span></label>`).join('')}</div></fieldset>
        <div class="fld"><span class="small" style="font-weight:700">${L('Способ оплаты', 'Payment method')}</span>${methods.length ? methods.map((m, i) => `<label class="opt"><input type="radio" name="method" value="${m.id}" ${i === 0 ? 'checked' : ''}><b style="font-size:14px">${esc(m.name)}</b><span class="small">${esc(m.provider)}</span></label>`).join('') : `<div class="notice"><b>${L('Оплата пока не подключена', 'Payments are not connected yet')}</b>${L('Карты появятся здесь, когда владелец сайта подключит платёжный сервис.', 'Cards appear here once the site owner connects a payment provider.')}</div>`}</div>
        <dl class="kv" id="tsum"></dl>
        <button class="btn btn-chrome btn-lg" type="submit" ${methods.length ? '' : 'disabled'}>${L('Перейти к оплате', 'Continue to payment')}</button></form>
      <div style="display:grid;gap:20px;align-content:start">
        <div class="panel" style="display:grid;gap:12px"><h2 class="h3">${L('Промокод', 'Promo code')}</h2>${promoForm()}<a class="btn-text" href="#/bonus">${L('Все бонусы', 'All bonuses')} →</a></div>
        <div class="panel">${SH(all ? L('Все операции', 'All transactions') : L('Последние операции', 'Recent transactions'), '', all ? '' : `<a class="sh-link" href="#/wallet?all=1">${L('Показать все', 'Show all')}</a>`)}${w.ledger.map(TxRow).join('') || `<p class="small">${L('Операций пока нет.', 'No transactions yet.')}</p>`}</div>
      </div>
    </section></div>`;
};
VIEWS.wallet.auth = true;
VIEWS.transactions = async () => VIEWS.wallet({ query: new URLSearchParams('all=1') }); VIEWS.transactions.auth = true;
function walletHooks() {
  const f = $('#topupForm'); if (!f) return;
  const upd = () => { const cur = f.cur.value; store.set('cur', cur); f.querySelectorAll('[data-price]').forEach(el => { el.textContent = money(JSON.parse(el.dataset.price)[cur], cur); }); const pk = CFG.payments.packages.find(p => p.id === f.pkg.value); $('#tsum').innerHTML = `<dt>${L('Вы получите', 'You get')}</dt><dd>${fmt(pk.plt)} PLT</dd><dt class="tot">${L('К оплате', 'To pay')}</dt><dd class="tot">${money(pk.price[cur], cur)}</dd>`; };
  f.addEventListener('change', upd); upd();
  f.addEventListener('submit', async e => { e.preventDefault(); const b = f.querySelector('[type=submit]'); busy(b, true, L('Открываем оплату…', 'Opening checkout…')); try { const r = await POST('/api/payments/checkout', { packageId: f.pkg.value, currency: f.cur.value }); location.href = r.url; } catch (x) { toast(x.message, true); busy(b, false); } });
}
const promoForm = () => `<form class="promo-row" id="promoForm"><label class="sr-only" for="promo">${L('Промокод', 'Promo code')}</label><input class="field" id="promo" name="promo" placeholder="PLATECLUB" autocomplete="off" maxlength="24" required><button class="btn btn-chrome" type="submit">${L('Активировать', 'Redeem')}</button></form><p class="err" id="promoErr" hidden></p>`;

/* ---------- bonuses ---------- */
function AchGrid(list, limit) {
  const Ls = limit ? [...list].sort((a, b) => (b.done && !b.claimed) - (a.done && !a.claimed) || b.done - a.done).slice(0, limit) : list;
  return `<div class="ach">${Ls.map(a => `<div class="ach-i ${a.done ? 'on' : 'off'}${a.claimed ? ' claimed' : ''} rv"><span class="b">${a.claimed ? '✓' : String(list.indexOf(a) + 1).padStart(2, '0')}</span><div><h3>${esc(achName(a))}</h3><p>${esc(achText(a))}</p></div><div class="rw">+${fmt(a.reward)} PLT${a.done && !a.claimed ? `<button class="btn btn-sm btn-chrome" data-act="achclaim" data-id="${a.id}">${L('Забрать', 'Claim')}</button>` : a.claimed ? `<span class="small">${L('получено', 'claimed')}</span>` : ''}</div></div>`).join('')}</div>`;
}
VIEWS.bonus = async () => {
  const pk = await refreshPerks(); const d = pk.daily, lv = pk.level, ach = pk.achievements;
  const k = lv.next > lv.cur ? (lv.xp - lv.cur) / (lv.next - lv.cur) : 1;
  return `<div class="wrap page-in"><section class="page-head"><div><p class="eyebrow">${L('Бонусы', 'Bonuses')}</p><h1 class="h1" style="margin-top:12px">${L('Плюшки', 'Perks')}</h1><p class="lede" style="margin-top:12px">${L('Заходите каждый день — бонус растёт до 100 PLT. Сложные достижения дают до 250 PLT.', 'Come back every day — the bonus grows to 100 PLT. Hard achievements pay up to 250 PLT.')}</p></div></section>
  <div class="bonus-grid">
    ${CFG.telegram ? `<section class="panel bonus-card tg-card" style="--bc:rgba(42,171,238,.25)"><p class="eyebrow">Telegram</p><div class="bonus-big">+${fmt(CFG.telegram.reward)} <span class="small">PLT</span></div><p class="small" style="margin:0">${L('Вступите в чат игроков: обмены, идеи, новости и розыгрыши.', 'Join the players’ chat: swaps, ideas, news and giveaways.')}</p>${pk.telegram ? `<a class="btn btn-ghost btn-lg" href="${esc(CFG.telegram.url)}" target="_blank" rel="noopener">${L('Открыть чат', 'Open the chat')}</a>` : `<button class="btn btn-chrome btn-lg" data-act="tgjoin">✈️ ${L('Вступить и забрать', 'Join and claim')} ${fmt(CFG.telegram.reward)} PLT</button>`}</section>` : ''}
    <section class="panel bonus-card" style="--bc:rgba(198,255,61,.22)"><p class="eyebrow">${L('Бонус дня', 'Daily bonus')}</p><div class="bonus-big">+${fmt(d.amount)} <span class="small">PLT</span></div>
      <p class="small" style="margin:0">${IC.fire.replace('<svg', '<svg width="14" height="14" style="vertical-align:-2px;color:#ff9f43"')} ${L('Серия', 'Streak')}: ${d.streak} ${pl(d.streak, ['день', 'дня', 'дней'], ['day', 'days'])}</p>
      <div class="ladder">${(d.ladder || []).map((v, i) => { const day = i + 1, cur = Math.min(d.streak + (d.claimed ? 0 : 1), d.ladder.length), done = day < cur || (d.claimed && day === cur); return `<div class="lstep${done ? ' done' : ''}${!d.claimed && day === cur ? ' now' : ''}"><span>${L('День', 'Day')} ${day}${day === d.ladder.length ? '+' : ''}</span><b>+${fmt(v)}</b></div>`; }).join('')}</div>
      ${d.claimed ? `<p class="small" style="margin:0">${L('Завтра', 'Tomorrow')} +${fmt(d.amount)} PLT · ${L('через', 'in')} <span class="mono" id="dailyCd" data-t="${d.nextAt}"></span></p>` : `<button class="btn btn-chrome btn-lg" data-act="daily">${L('Забрать', 'Claim')} ${fmt(d.amount)} PLT</button>`}<p class="small" style="margin:0;opacity:.7">${L('Пропустили день — серия начнётся заново.', 'Miss a day and the streak starts over.')}</p></section>
    <section class="panel bonus-card"><p class="eyebrow">${L('Уровень', 'Level')}</p><div class="row" style="gap:14px"><span class="lvl" style="width:64px;height:64px">${LvlRing(lv, 64)}</span><div><div class="bonus-big" style="font-size:30px">LV ${lv.level}</div><p class="small" style="margin:2px 0 0">${fmt(lv.xp)} / ${fmt(lv.next)} XP</p></div></div>
      <div class="lvl-bar"><span style="width:${Math.round(k * 100)}%"></span></div><p class="small" style="margin:0">${L('XP = PLT, потраченные на кейсы. За каждый новый уровень — 10 PLT.', 'XP = PLT spent on cases. Each new level pays 10 PLT.')}</p>
      ${lv.unclaimed ? `<button class="btn btn-chrome" data-act="lvlclaim">${L(`Забрать ${lv.unclaimed * lv.reward} PLT за уровни`, `Claim ${lv.unclaimed * lv.reward} PLT for levels`)}</button>` : ''}</section>
    <section class="panel bonus-card" style="--bc:rgba(168,124,255,.22)"><p class="eyebrow">${L('Промокод', 'Promo code')}</p><h2 class="h3">${L('Есть промокод?', 'Got a code?')}</h2><p class="small" style="margin:0">${L('Каждый код — один раз на аккаунт.', 'Each code works once per account.')}</p>${promoForm()}</section>
  </div>
  <section class="sec">${SH(L('Пригласи друга', 'Invite a friend'), L('Своя ссылка у каждого', 'Everyone has their own link'))}<div id="refBox" class="panel">${Spin()}</div></section>
  <section class="sec">${SH(L('Задания за PLT', 'Quests for PLT'), L('Проверяет админ', 'Reviewed by an admin'))}<div id="questBox">${Spin()}</div></section>
  <section class="sec" style="padding-bottom:80px">${SH(L('Достижения', 'Achievements'), `${ach.filter(a => a.done).length} / ${ach.length}`)}${AchGrid(ach)}</section></div>`;
};

const Spin = () => `<p class="small" style="padding:10px">${L('Загрузка…', 'Loading…')}</p>`;
const QSTAT = () => ({ PENDING: L('На проверке', 'In review'), PAID: L('Начислено', 'Paid'), REJECTED: L('Отклонено', 'Rejected') });
async function loadRef() {
  const box = $('#refBox'); if (!box) return;
  try {
    const d = await GET('/api/referral'); REF = d;
    box.innerHTML = `<p class="small" style="margin:0 0 10px">${L(`Друг получает ${fmt(d.reward.friend)} PLT, вы — ${fmt(d.reward.inviter)} PLT, как только он откроет ${d.reward.needOpens} кейса. Друзей можно звать сколько угодно.`, `Your friend gets ${fmt(d.reward.friend)} PLT and you get ${fmt(d.reward.inviter)} PLT once they open ${d.reward.needOpens} cases. Invite as many as you like.`)}</p>
      <div class="ref-row"><input class="field mono" id="refLink" readonly value="${esc(d.link)}"><button class="btn btn-chrome" data-act="refcopy">${L('Копировать', 'Copy')}</button>${navigator.share ? `<button class="btn btn-ghost" data-act="refshare">${L('Поделиться', 'Share')}</button>` : ''}</div>
      <div class="stats s4" style="margin-top:12px"><div class="stat"><span>${L('Перешли', 'Joined')}</span><b>${fmt(d.joined)}</b></div><div class="stat"><span>${L('Играют', 'Playing')}</span><b>${fmt(d.active)}</b></div><div class="stat"><span>${L('Заработано', 'Earned')}</span><b class="up">${fmt(d.earned)}</b></div><div class="stat"><span>${L('Ваш код', 'Your code')}</span><b class="mono">${esc(d.code)}</b></div></div>
      ${d.friends.length ? `<div class="panel" style="margin-top:12px;padding:8px">${d.friends.slice(0, 10).map(f => `<div class="tx"><span class="lbl">${esc(f.nickname)}</span><span class="when">${day(f.at)} · ${L('кейсов', 'cases')}: ${f.opens}</span><span class="amt${f.paid ? ' plus' : ''}">${f.paid ? '+' + fmt(d.reward.inviter) : L('ждём', 'waiting')}</span></div>`).join('')}</div>` : ''}`;
  } catch (e) { box.innerHTML = `<p class="small">${esc(e.message)}</p>`; }
}
async function loadQuests() {
  const box = $('#questBox'); if (!box) return;
  try {
    const d = await GET('/api/quests');
    const card = (kind, title, reward, text) => `<section class="panel bonus-card" style="--bc:${kind === 'story' ? 'rgba(255,122,217,.22)' : 'rgba(0,242,234,.22)'}"><p class="eyebrow">${kind === 'story' ? 'Instagram / Stories' : 'TikTok'}</p><div class="bonus-big">${reward}</div><h3 class="h3" style="margin:0">${title}</h3><p class="small" style="margin:0">${text}</p><button class="btn btn-chrome btn-lg" data-act="qsend" data-k="${kind}">${L('Отправить на проверку', 'Send for review')}</button></section>`;
    box.innerHTML = `<div class="bonus-grid">
      ${card('story', L('Сторис с отметкой сайта', 'A story tagging the site'), `+${fmt(d.rules.story)} <span class="small">PLT</span>`, L('Выложите сторис со ссылкой на Plate Club. Аккаунт должен быть открытым, чтобы мы увидели публикацию.', 'Post a story linking to Plate Club. Your account must be public so we can see it.'))}
      ${card('tiktok', L('TikTok с упоминанием', 'A TikTok mentioning us'), `1 ${L('просмотр', 'view')} = ${fmt(d.rules.perView)} <span class="small">PLT</span>`, L(`Снимите ролик с нашим упоминанием. Максимум ${fmt(d.rules.maxPerVideo)} PLT за ролик. Готовые баннеры — в разделе «Материалы».`, `Make a video mentioning us. Up to ${fmt(d.rules.maxPerVideo)} PLT per video. Ready-made banners are in “Media kit”.`))}
    </div>
    ${d.quests.length ? `<div class="panel" style="margin-top:12px;padding:8px">${d.quests.map(x => `<div class="tx"><span class="lbl">${x.kind === 'story' ? 'Stories' : 'TikTok'} · <a href="${esc(x.url)}" target="_blank" rel="noopener">${L('ссылка', 'link')}</a>${x.reason ? ` — ${esc(x.reason)}` : ''}</span><span class="when">${day(x.at)} · ${QSTAT()[x.status]}${x.views ? ' · ' + fmt(x.views) + ' ' + L('просм.', 'views') : ''}</span><span class="amt${x.status === 'PAID' ? ' plus' : ''}">${x.amount ? '+' + fmt(x.amount) : '—'}</span></div>`).join('')}</div>` : ''}
    <p class="small" style="margin-top:10px;opacity:.75">${L('Проверка обычно занимает до суток. PLT приходят после подтверждения админом.', 'Review usually takes up to a day. PLT arrive after an admin confirms it.')}</p>`;
  } catch (e) { box.innerHTML = `<p class="small">${esc(e.message)}</p>`; }
}
let REF = null;
VIEWS.bonus.auth = true;
VIEWS.achievements = VIEWS.bonus;

/* ---------- top ---------- */
const RK = { by: 'total' };
const RK_TABS = () => [['total', L('Богатство', 'Wealth'), L('баланс + номера', 'balance + plates')], ['collection', L('Коллекция', 'Collection'), L('оценка номеров', 'plates value')], ['level', L('Уровень', 'Level'), L('опыт за кейсы', 'case XP')], ['battles', L('Баттлы', 'Battles'), L('побед в кейс-баттлах', 'case-battle wins')], ['sets', L('Коллекции', 'Sets'), L('собранных сетов', 'sets completed')], ['best', L('Лучший номер', 'Best plate'), L('самый дорогой номер', 'priciest plate')]];
const rkVal = (x, by) => ({ total: [fmt(x.total), 'PLT'], collection: [fmt(x.value), 'PLT'], level: ['LV ' + x.level, fmt(x.xp) + ' XP'], battles: [fmt(x.wins), pl(x.wins, ['победа', 'победы', 'побед'], ['win', 'wins'])], sets: [x.sets + ' / ' + CFG.sets.length, L('сетов', 'sets')], best: [fmt(x.bestValue), 'PLT'] }[by]);
VIEWS.top = async () => {
  const d = await GET('/api/rankings?by=' + RK.by); const r = d.rankings; const by = d.by;
  const pod = (x, i) => { if (!x) return '<div></div>'; const [v, u] = rkVal(x, by); return `<a class="pod p${i + 1} rv" href="#/u/${esc(x.nickname)}"><span class="pod-rank">${i + 1}</span>${Ava(x.nickname).replace('class="ava"', 'class="ava pod-ava"')}<span class="nick">${esc(x.nickname)}</span>${Medals(x.medals)}<span class="val chrome-t">${v}</span><span class="small">${u}</span>${by === 'best' || by === 'total' ? (x.best ? Plate(x.best, { iri: false }) : '') : `<span class="small">LV ${x.level} · ${x.plates} ${pl(x.plates, ['номер', 'номера', 'номеров'], ['plate', 'plates'])}</span>`}</a>`; };
  const me = ME ? r.findIndex(x => x.nickname === ME.nickname) : -1;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Рейтинг', 'Ranking')} · ${d.players} ${pl(d.players, ['игрок', 'игрока', 'игроков'], ['player', 'players'])}</p><h1 class="h1" style="margin-top:12px">${L('Топ игроков', 'Top players')}</h1><p class="lede" style="margin-top:12px">${L('Шесть рейтингов. Десятка самых богатых получает медаль TOP 10, тройка лидеров — ещё и TOP 3.', 'Six boards. The ten richest get a TOP 10 medal, the top three also get TOP 3.')}</p><div class="row" style="margin-top:14px;gap:8px">${MEDAL('top10')}${MEDAL('top3')}</div></div></section>
    <div class="rk-tabs" role="tablist">${RK_TABS().map(([k, t, sub]) => `<button role="tab" aria-selected="${by === k}" data-act="rkby" data-k="${k}"><b>${t}</b><span>${sub}</span></button>`).join('')}</div>
    ${me >= 0 && me !== undefined ? `<div class="rk-me rv"><span>${L('Вы на', 'You are')} <b>${me + 1}</b> ${L('месте', 'place')}</span>${Medals(r[me].medals)}<span class="mono">${rkVal(r[me], by).join(' ')}</span></div>` : ''}
    ${r.length ? `<div class="podium">${pod(r[1], 1)}${pod(r[0], 0)}${pod(r[2], 2)}</div>
    <div class="panel rk-list" style="padding:8px;margin-bottom:80px">${r.slice(3).map((x, i) => { const [v, u] = rkVal(x, by); return `<a class="rk${ME && x.nickname === ME.nickname ? ' me' : ''}${i < 7 ? ' t10' : ''}" href="#/u/${esc(x.nickname)}" style="text-decoration:none"><span class="n">${i + 4}</span><span class="who">${Ava(x.nickname)}<span><b>${esc(x.nickname)}</b> ${Medals(x.medals)}<br><span class="small">LV ${x.level} · ${x.plates} ${pl(x.plates, ['номер', 'номера', 'номеров'], ['plate', 'plates'])}</span></span></span><span class="tot">${v} <small>${u}</small></span></a>`; }).join('') || `<p class="small" style="padding:12px">${L('Пока только тройка лидеров.', 'Only the top three so far.')}</p>`}</div>`
    : Empty(L('Пока пусто', 'Empty for now'), L('В этом рейтинге ещё никого нет.', 'Nobody in this board yet.'), `<a class="btn btn-chrome" href="#/games">${L('К играм', 'To games')}</a>`)}</div>`;
};
VIEWS.rankings = VIEWS.top;

/* ---------- profile & co ---------- */
VIEWS.profile = async () => {
  const s = ME.stats; const pk = await refreshPerks(); const ACH = pk ? pk.achievements : [];
  return `<div class="wrap"><section class="page-head"><div class="row" style="gap:18px">${Ava(ME.nickname).replace('class="ava"', 'class="ava" style="width:72px;height:72px;font-size:32px;border-radius:22px"')}<div><p class="eyebrow">${L('Профиль · с ', 'Profile · since ')}${day(ME.created)}</p><h1 class="h1" style="margin-top:8px">${esc(ME.nickname)}</h1><p class="small" style="margin-top:6px">${Medals(ME.medals)} <span class="lvl-tag lt-${ME.level.title || 'rookie'}">LV ${ME.level.level} · ${LV_TITLE(ME.level.title)}</span> ${ME.role === 'admin' ? `<span class="tag admin">${L('Админ', 'Admin')}</span>` : ''} <a class="btn-text" href="#/u/${esc(ME.nickname)}">${L('Публичный профиль', 'Public profile')} →</a></p></div></div>${ME.role === 'admin' ? `<a class="btn btn-chrome" href="#/admin">${L('Панель управления', 'Admin panel')}</a>` : `<a class="btn btn-ghost" href="#/admin">👑 ${L('Войти как админ', 'Sign in as admin')}</a>`}</section>
    <div class="stats s4"><div class="stat rv"><span>${L('Открыто кейсов', 'Cases opened')}</span><b>${s.opened}</b></div><div class="stat rv"><span>${L('Покупок', 'Purchases')}</span><b>${s.bought}</b></div><div class="stat rv"><span>${L('Оценка коллекции', 'Collection value')}</span><b>${fmt(s.value)}</b></div><div class="stat rv"><span>${L('Достижения', 'Achievements')}</span><b>${ACH.filter(a => a.done).length}/${ACH.length}</b></div></div>
    <section class="sec split"><div class="panel">${SH(L('Аккаунт', 'Account'), L('Email виден только вам.', 'Only you can see your email.'))}
        <div class="set-row"><div><b>Email</b><p>${esc(ME.email)}</p></div>${ME.verified ? `<span class="tag s-PAID">${L('Подтверждён', 'Verified')}</span>` : `<button class="btn btn-sm btn-ghost" data-act="resend">${L('Подтвердить', 'Verify')}</button>`}</div>
        <div class="set-row"><div><b>${L('Пароль', 'Password')}</b><p>${L('Нужен текущий пароль. Другие устройства выйдут из аккаунта.', 'Needs your current password. Other devices get signed out.')}</p></div><button class="btn btn-sm btn-ghost" data-act="pwdlg">${L('Сменить', 'Change')}</button></div>
        <div class="set-row"><div><b>${L('Другие устройства', 'Other devices')}</b><p>${L('Если вы входили с чужого телефона или компьютера — завершите там сессию.', 'Signed in on someone else’s phone or computer? End those sessions.')}</p></div><button class="btn btn-sm btn-ghost" data-act="logoutothers">${L('Выйти везде', 'Sign out everywhere')}</button></div>
        <div class="set-row"><div><b>${L('Язык', 'Language')}</b><p>Русский / English</p></div><div class="lang"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div></div>
        <div class="set-row" style="border:0"><div><b>${L('Выйти', 'Sign out')}</b><p>${L('Завершить сессию на этом устройстве.', 'End the session on this device.')}</p></div><button class="btn btn-sm btn-ghost" data-act="logout">${L('Выйти', 'Sign out')}</button></div></div>
      <div class="panel">${SH(L('Достижения', 'Achievements'), '', `<a class="sh-link" href="#/bonus">${L('Все', 'All')} →</a>`)}${AchGrid(ACH, 4)}</div></section></div>`;
};
VIEWS.profile.auth = true;
VIEWS.notifications = async () => {
  const w = await GET('/api/wallet');
  return `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Активность', 'Activity')}</h1></div></section><div class="panel" style="margin-bottom:80px">${w.ledger.map(TxRow).join('') || `<p class="small" style="margin:0">${L('Пока пусто.', 'Nothing yet.')}</p>`}</div></div>`;
};
VIEWS.notifications.auth = true;
VIEWS.settings = async () => `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Настройки', 'Settings')}</h1><p class="lede" style="margin-top:10px">${L('Сохраняются на этом устройстве.', 'Saved on this device.')}</p></div></section>
  <div class="panel" style="max-width:760px;margin-bottom:80px">
   <div class="set-row"><div><b>${L('Язык', 'Language')}</b><p>Русский / English</p></div><div class="lang"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div></div>
   <div class="set-row"><div><b>${L('Громкость', 'Volume')}</b><p id="volTxt">${Math.round(PREF.vol * 100)}%</p></div><input type="range" id="svol" min="0" max="1" step="0.05" value="${PREF.vol}" aria-label="${L('Громкость', 'Volume')}"></div>
   <div class="set-row" style="border:0"><div><b>${L('Анимации', 'Animations')}</b><p>${L('«Как в системе» следует настройке устройства.', '“System” follows your device setting.')}</p></div><select class="inline" id="smotion">${[['system', L('Как в системе', 'System')], ['reduced', L('Минимум', 'Reduced')], ['full', L('Все', 'All')]].map(([v, t]) => `<option value="${v}"${PREF.motion === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div></div></div>`;
VIEWS.help = async () => `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Помощь', 'Help')}</h1></div></section><div class="prose">${(LANG === 'en' ? [
  ['How is the result decided?', 'The server picks the rarity using the published odds and mints the plate before the strip starts. The animation only shows the result.'],
  ['What does the blue check mean?', 'The plate exists in the Plate Club registry and its seal and owner history match. It is not a check of a real registration plate.'],
  ['How does the upgrade work?', 'You put in one plate and choose a rarer target. Chance = 90% × (your plate value / target value), from 1% to 75%. On a win you get a new plate of the target rarity in the same region; on a loss the plate burns.'],
  ['What are levels?', 'XP equals PLT spent on cases. Level n needs 50·(n−1)·n XP. Every new level gives 10 PLT.'],
  ['Why are Belarusian plates cheaper?', 'Their value is 60% of a Russian plate of the same rarity, but nice combinations come up more often.'],
  ['How many copies can a plate have?', 'Each combination exists at most twice: 1/2 and 2/2.'],
  ['Who pays the market fee?', `The seller: ${CFG.fee * 100}% of the price.`],
] : [
  ['Как определяется выигрыш?', 'Сервер выбирает редкость по опубликованным шансам и создаёт номер до запуска ленты. Анимация только показывает результат.'],
  ['Что значит синяя галочка?', 'Номер есть в реестре Plate Club, его печать и история владельцев сходятся. Это не проверка настоящего госномера.'],
  ['Как работает апгрейд?', 'Ставите один номер и выбираете более редкую цель. Шанс = 90% × (оценка вашего номера / оценка цели), от 1% до 75%. При победе — новый номер выбранной редкости в том же регионе, при проигрыше номер сгорает.'],
  ['Что такое уровни?', 'XP — это PLT, потраченные на кейсы. Для уровня n нужно 50·(n−1)·n XP. За каждый новый уровень — 10 PLT.'],
  ['Почему белорусские номера дешевле?', 'Их оценка — 60% от российского номера той же редкости, зато красивые комбинации выпадают чаще.'],
  ['Сколько копий бывает у номера?', 'Каждая комбинация существует максимум в двух экземплярах: 1/2 и 2/2.'],
  ['Кто платит комиссию рынка?', `Продавец: ${CFG.fee * 100}% от цены.`],
]).map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div>`;
VIEWS.terms = async () => `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Правила', 'Terms')}</h1></div></section><div class="prose">${LANG === 'en'
  ? `<h3>1. Tokens</h3><p>PLT are game tokens for use inside Plate Club only. They cannot be withdrawn or exchanged for money.</p><h3>2. Plates</h3><p>Plates are digital game items, not real registration plates.</p><h3>3. Cases, odds and upgrades</h3><p>Odds are shown before opening. The server decides results before animations. On average the bank buy-back is below the case price; Plate Club does not promise profit.</p><h3>4. Market</h3><p>The seller pays a ${CFG.fee * 100}% fee. A plate can only be in one active listing.</p><h3>5. Verification</h3><p>The blue check only refers to the game record inside Plate Club.</p>`
  : `<h3>1. Токены</h3><p>PLT — игровые токены только для Plate Club. Их нельзя вывести или обменять на деньги.</p><h3>2. Номера</h3><p>Номера — цифровые игровые предметы, а не настоящие регистрационные знаки.</p><h3>3. Кейсы, шансы и апгрейд</h3><p>Шансы показаны до открытия. Сервер выбирает результат до анимации. В среднем выкуп банком ниже цены кейса; Plate Club не обещает прибыли.</p><h3>4. Рынок</h3><p>Продавец платит комиссию ${CFG.fee * 100}%. Номер может быть только в одном активном объявлении.</p><h3>5. Проверка</h3><p>Синяя галочка относится только к игровой записи внутри Plate Club.</p>`}</div></div>`;
VIEWS.privacy = async () => `<div class="wrap"><section class="page-head"><div><h1 class="h1">${L('Конфиденциальность', 'Privacy')}</h1></div></section><div class="prose">${LANG === 'en'
  ? '<h3>What we store</h3><p>Email, nickname, a password hash, your plates, listings, transactions and payment records from the provider (no card numbers).</p><h3>What others see</h3><p>Your nickname, plates and listings. Never your email.</p><h3>Cookies</h3><p>One session cookie. Language and volume stay in your browser.</p>'
  : '<h3>Что мы храним</h3><p>Email, ник, хеш пароля, ваши номера, объявления, операции и записи о платежах от платёжного сервиса (без номеров карт).</p><h3>Что видно другим</h3><p>Ник, номера и объявления. Email — никогда.</p><h3>Cookies</h3><p>Одна служебная cookie для входа. Язык и громкость хранятся в браузере.</p>'}</div></div>`;

/* ---------- auth ---------- */
function authCard(title, sub, form) { return `<div class="wrap auth"><form class="auth-card" id="authForm" novalidate><img class="lg" src="${BRAND('logo-chrome-360.png')}" alt="Plate Club"><div style="text-align:center"><h1 class="h2">${title}</h1><p class="small" style="margin:8px 0 0">${sub}</p></div>${form}</form></div>`; }
const fld = (id, label, type, extra = '', hint = '') => `<div class="fld"><label for="${id}">${label}</label>${type === 'password' ? `<div class="pw-wrap"><input class="field" id="${id}" name="${id}" type="password" ${extra}><button type="button" data-act="pwshow">${L('Показать', 'Show')}</button></div>` : `<input class="field" id="${id}" name="${id}" type="${type}" ${extra}>`}${hint ? `<p class="hint">${hint}</p>` : ''}<p class="ferr" id="${id}-e" hidden></p></div>`;
VIEWS.login = async ({ query, next } = {}) => authCard(/^#\/admin/.test(location.hash) ? L('Вход для админа', 'Admin sign in') : L('С возвращением', 'Welcome back'), /^#\/admin/.test(location.hash) ? L('Шаг 1: войдите в свой аккаунт (или зарегистрируйтесь). Шаг 2: откроется окно для кода админа.', 'Step 1: sign in (or sign up). Step 2: enter the admin code.') : L('Войдите, чтобы открывать кейсы и торговать.', 'Sign in to open cases and trade.'), `${fld('email', 'Email', 'email', 'autocomplete="email" required')}${fld('password', L('Пароль', 'Password'), 'password', 'autocomplete="current-password" required')}
  <p class="err" id="formErr" hidden></p><input type="hidden" name="next" value="${esc(next || (query && query.get('next')) || '#/')}"><button class="btn btn-chrome btn-lg" type="submit" data-form="login">${L('Войти', 'Sign in')}</button>
  <div class="row" style="justify-content:space-between"><a class="btn-text" href="#/forgot">${L('Забыли пароль?', 'Forgot password?')}</a><a class="btn-text" href="#/register${/^#\/admin/.test(location.hash) ? '?next=admin' : ''}">${L('Регистрация', 'Sign up')}</a></div>${/^#\/admin/.test(location.hash) ? '' : `<a class="btn btn-ghost" style="text-align:center" href="#/admin">👑 ${L('Войти как админ', 'Sign in as admin')}</a>`}`);
VIEWS.register = async () => authCard(L('Вступить в клуб', 'Join the club'), L(`Новым аккаунтам — ${CFG.signupBonus} PLT. Плюс 10 PLT каждый день.`, `New accounts get ${CFG.signupBonus} PLT. Plus 10 PLT every day.`), `${fld('email', 'Email', 'email', 'autocomplete="email" required', L('Для входа и восстановления пароля. Другим не виден.', 'For sign-in and password recovery. Never shown to others.'))}
  ${fld('nickname', L('Ник', 'Nickname'), 'text', 'autocomplete="username" required minlength="3" maxlength="20" spellcheck="false"', L('3–20 латинских букв, цифр или «_».', '3–20 Latin letters, digits or “_”.'))}
  ${fld('password', L('Пароль', 'Password'), 'password', 'autocomplete="new-password" required minlength="8"', L('Минимум 8 символов.', 'At least 8 characters.'))}
  <div class="fld"><label class="check"><input type="checkbox" id="terms" name="terms"><span>${L('Принимаю <a href="#/terms" target="_blank">правила</a> и <a href="#/privacy" target="_blank">политику конфиденциальности</a>.', 'I accept the <a href="#/terms" target="_blank">terms</a> and the <a href="#/privacy" target="_blank">privacy policy</a>.')}</span></label><p class="ferr" id="terms-e" hidden></p></div>
  <p class="err" id="formErr" hidden></p><button class="btn btn-chrome btn-lg" type="submit" data-form="register">${L('Создать аккаунт', 'Create account')}</button><a class="btn-text" style="text-align:center" href="#/login">${L('Уже есть аккаунт', 'I already have an account')}</a>`);
VIEWS.forgot = async () => authCard(L('Восстановление', 'Password reset'), L('Пришлём ссылку для сброса пароля.', 'We’ll email you a reset link.'), `${fld('email', 'Email', 'email', 'autocomplete="email" required')}<p class="err" id="formErr" hidden></p><div id="formOk"></div><button class="btn btn-chrome btn-lg" type="submit" data-form="forgot">${L('Отправить ссылку', 'Send link')}</button><a class="btn-text" style="text-align:center" href="#/login">${L('Назад ко входу', 'Back to sign in')}</a>`);
VIEWS.reset = async ({ query }) => authCard(L('Новый пароль', 'New password'), L('Придумайте новый пароль.', 'Choose a new password.'), `${fld('password', L('Новый пароль', 'New password'), 'password', 'autocomplete="new-password" required minlength="8"')}<input type="hidden" name="token" value="${esc(query.get('token') || '')}"><p class="err" id="formErr" hidden></p><button class="btn btn-chrome btn-lg" type="submit" data-form="reset">${L('Сохранить', 'Save')}</button>`);
function regHooks() {
  const n = $('#nickname'); let t;
  n && n.addEventListener('input', () => { clearTimeout(t); const v = n.value.trim(); const e = $('#nickname-e'); if (!v) { e.hidden = true; return; } t = setTimeout(async () => { try { const r = await GET('/api/nickname?n=' + encodeURIComponent(v)); e.hidden = false; e.className = r.available ? 'fok' : 'ferr'; e.textContent = r.available ? L('Ник свободен.', 'Nickname is free.') : srv(r.reason); n.setAttribute('aria-invalid', String(!r.available)); } catch {} }, 350); });
}


/* ---------- upgrade: one plate → a chance at a rarer one; the wheel shows the server's roll ---------- */
const UP = { sel: null, target: null, tier: '', plates: [], busy: false, angle: 0 };
const WR = 100, WC = 2 * Math.PI * WR;
// roulette wheel: the whole wheel spins under a fixed chrome pointer; green sector = your chance
function wheelSvg(chance) {
  const pockets = Array.from({ length: 36 }, (_, i) => { const a0 = (i * 10 - 90) * Math.PI / 180, a1 = ((i + 1) * 10 - 90) * Math.PI / 180, r0 = 112, r1 = 119; const P = (r, a) => `${(120 + r * Math.cos(a)).toFixed(2)} ${(120 + r * Math.sin(a)).toFixed(2)}`; return `<path d="M${P(r0, a0)} L${P(r1, a0)} A${r1} ${r1} 0 0 1 ${P(r1, a1)} L${P(r0, a1)} A${r0} ${r0} 0 0 0 ${P(r0, a0)}Z" fill="${i % 2 ? '#1b2131' : '#2a3246'}"/>`; }).join('');
  const ticks = Array.from({ length: 36 }, (_, i) => { const a = i * 10 * Math.PI / 180; return `<line x1="${120 + 89 * Math.sin(a)}" y1="${120 - 89 * Math.cos(a)}" x2="${120 + 111 * Math.sin(a)}" y2="${120 - 111 * Math.cos(a)}" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>`; }).join('');
  return `<svg viewBox="0 0 240 240" aria-hidden="true"><defs><linearGradient id="wg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#b8ffd9"/><stop offset="1" stop-color="#16b875"/></linearGradient><linearGradient id="wrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#9fd4ff"/><stop offset=".55" stop-color="#1f4f8f"/><stop offset=".8" stop-color="#8cc8ff"/><stop offset="1" stop-color="#eef8ff"/></linearGradient></defs>
    <circle cx="120" cy="120" r="119.5" fill="none" stroke="url(#wrim)" stroke-width="2"/>
    <g id="wRot" class="rot" style="transform:rotate(${UP.angle}deg)">${pockets}
      <circle cx="120" cy="120" r="${WR}" fill="none" stroke="#4a1626" stroke-width="22"/>
      <circle id="wArc" cx="120" cy="120" r="${WR}" fill="none" stroke="url(#wg)" stroke-width="22" stroke-dasharray="${WC * chance} ${WC}" transform="rotate(-90 120 120)" style="transition:stroke-dasharray 600ms var(--ease);filter:drop-shadow(0 0 8px rgba(61,220,151,.6))"/>
      ${ticks}</g>
    <circle cx="120" cy="120" r="64" fill="#0b0e15" stroke="url(#wrim)" stroke-width="1.5"/></svg>
    <svg class="wheel-ptr" id="wPtr" viewBox="0 0 30 38"><defs><linearGradient id="wpg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#8fd3ff"/><stop offset="1" stop-color="#2a6cc4"/></linearGradient></defs><path d="M2 2h26L15 36z" fill="url(#wpg)" stroke="#06142e" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
VIEWS.upgrade = async ({ query }) => {
  const [d, rec] = await Promise.all([GET('/api/collection'), GET('/api/upgrade/recent').catch(() => ({ upgrades: [] }))]); UP.plates = d.plates.filter(p => !p.listing).sort((a, b) => b.value - a.value);
  const want = query && query.get('p'); if (want && UP.plates.find(p => p.id === want)) UP.sel = want;
  if (UP.sel && !UP.plates.find(p => p.id === UP.sel)) UP.sel = null;
  if ((!UP.sel || UP.plates.find(p => p.id === UP.sel)?.tier === 'grail') && UP.plates.length) UP.sel = UP.plates.find(p => p.tier !== 'grail')?.id || UP.sel;
  UP.angle = 0;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Апгрейд', 'Upgrade')}</p><h1 class="h1" style="margin-top:12px">${L('Рискни номером', 'Risk a plate')}</h1><p class="lede" style="margin-top:12px">${L('Выбери номер и цель. Зелёный сектор — твой шанс. Колесо остановится там, где решил сервер: попал в зелёное — получаешь номер выше, нет — номер сгорает.', 'Pick a plate and a target. The green sector is your chance. The wheel stops where the server decided: land in green and you get a rarer plate, otherwise the plate burns.')}</p></div></section>
  ${UP.plates.length ? `<div class="up-grid">
    <section class="up-col"><div class="row" style="justify-content:space-between"><h2 class="h3">${L('Твой номер', 'Your plate')}</h2><span class="small">${UP.plates.length}</span></div>
      <div class="row">${['', ...CFG.tiers.slice(0, 4).map(t => t.id)].map(t => `<button class="chip${t ? ' t-' + t : ''}" data-act="uptier" data-t="${t}" aria-pressed="${UP.tier === t}">${t ? `<i></i>${tierName(t)}` : L('Все', 'All')}</button>`).join('')}</div>
      <div class="up-list" id="upList"></div></section>
    <section class="up-col" style="justify-items:center;gap:18px">
      <div class="wheel" id="wheel">${wheelSvg(0)}<div class="wheel-c"><div><b id="wPct">—</b><span>${L('шанс', 'chance')}</span></div></div></div>
      <div class="up-slots" style="width:100%"><div class="up-slot" id="slotFrom"></div><span class="up-arrow">→</span><div class="up-slot" id="slotTo"></div></div>
      <button class="btn btn-chrome btn-xl" id="upBtn" data-act="upgo" disabled>${L('Улучшить', 'Upgrade')}</button><p class="small" style="margin:-8px 0 0;color:var(--err)">${L('При проигрыше номер сгорает', 'If you lose, the plate burns')}</p>
      <p class="small" style="text-align:center;margin:0">${L(`Шанс = ${CFG.upgrade.edge * 100}% × (оценка номера / оценка цели), от ${CFG.upgrade.min * 100}% до ${CFG.upgrade.max * 100}%.`, `Chance = ${CFG.upgrade.edge * 100}% × (plate value / target value), from ${CFG.upgrade.min * 100}% to ${CFG.upgrade.max * 100}%.`)}</p></section>
    <section class="up-col"><h2 class="h3">${L('Цель', 'Target')}</h2><div class="up-col" id="upTargets"></div></section>
  </div>` : Empty(L('Нечего улучшать', 'Nothing to upgrade'), L('Откройте кейс, чтобы получить первый номер.', 'Open a case to get your first plate.'), `<a class="btn btn-chrome" href="#/cases">${L('К кейсам', 'To cases')}</a>`, { letters: 'ААА', digits: '000', region: '00' })}
  ${rec.upgrades.length ? `<section class="sec" style="padding-top:0">${SH(L('Последние апгрейды', 'Recent upgrades'))}<div class="panel" style="padding:8px">${rec.upgrades.map(g => `<div class="rk" style="grid-template-columns:auto 1fr auto"><span class="who">${Ava(g.nickname)}<span><b>${esc(g.nickname)}</b><br><span class="small">${tierName(g.from.tier)} → ${tierName(g.target)} · ${(g.chance * 100).toFixed(g.chance < 0.1 ? 1 : 0)}% · ${rel(g.at)}</span></span></span><span></span><span class="tag ${g.success ? 's-PAID' : 's-FAILED'}">${g.success ? L('успех', 'win') : L('сгорел', 'burned')}</span></div>`).join('')}</div></section>` : ''}<div style="height:60px"></div></div>`;
};
VIEWS.upgrade.auth = true;
function upPaint() {
  const list = $('#upList'); if (!list) return;
  const sel = UP.plates.find(p => p.id === UP.sel);
  list.innerHTML = UP.plates.filter(p => !UP.tier || p.tier === UP.tier).map(p => `<button class="up-item t-${p.tier}" data-act="upsel" data-id="${p.id}" aria-pressed="${p.id === UP.sel}">${Plate(p, { iri: false })}<span>${Rarity(p.tier)}<br><span class="small">${esc(regionLabel(p))}</span></span><span class="v">${fmt(p.value)}<br>PLT</span></button>`).join('') || `<p class="small">${L('Нет номеров этой редкости.', 'No plates of this rarity.')}</p>`;
  const ti = TI(); const cur = sel ? ti[sel.tier] : 5;
  if (sel && (!UP.target || ti[UP.target] <= cur)) UP.target = CFG.tiers[Math.min(4, cur + 1)].id;
  if (sel && cur >= 4) UP.target = null;
  $('#upTargets').innerHTML = CFG.tiers.map(t => { const dis = !sel || ti[t.id] <= cur; const ch = sel && !dis ? upChance(sel, t.id) : 0; return `<button class="tgt t-${t.id}" data-act="uptgt" data-t="${t.id}" aria-pressed="${UP.target === t.id}" ${dis ? 'disabled' : ''}>${Rarity(t.id)}<span class="small">≈ ${sel && !dis ? fmt(targetValue(sel, t.id)) + ' PLT · ×' + (targetValue(sel, t.id) / sel.value).toFixed(1) : '—'}</span><span class="pct">${dis ? '—' : (ch * 100).toFixed(ch < 0.1 ? 1 : 0) + '%'}</span></button>`; }).join('');
  const ch = sel && UP.target ? upChance(sel, UP.target) : 0;
  $('#wArc').setAttribute('stroke-dasharray', `${WC * ch} ${WC}`);
  $('#wPct').textContent = sel && UP.target ? (ch * 100).toFixed(ch < 0.1 ? 1 : 0) + '%' : '—';
  $('#slotFrom').innerHTML = sel ? `${Plate(sel, { holo: true })}${Rarity(sel.tier)}` : `<span class="small">${L('Выберите номер', 'Pick a plate')}</span>`;
  $('#slotTo').innerHTML = sel && UP.target ? `<span class="rl t-${UP.target}" style="font-size:15px"><i></i>${tierName(UP.target)}</span><span class="small">≈ ${fmt(targetValue(sel, UP.target))} PLT · ${esc(regionLabel(sel))}</span>` : `<span class="small">${sel && ti[sel.tier] >= 4 ? L('Грааль — уже максимум', 'Grail is already the top') : L('Выберите цель', 'Pick a target')}</span>`;
  $('#upBtn').disabled = !(sel && UP.target) || UP.busy;
  $('#wheel').classList.remove('win', 'lose');
}
function upgradeHooks() { upPaint(); }
function spinWheel(toDeg, D) {
  return new Promise(res => {
    const w = $('#wRot'), ptr = $('#wPtr'); const from = UP.angle; const t0 = performance.now(); let lastStep = Math.floor(from / 10);
    if (reduced() || !w) { UP.angle = toDeg; if (w) w.style.transform = `rotate(${toDeg}deg)`; return res(); }
    const over = 6; // overshoot a little and settle back, like a real wheel
    const ease = k => (k < 0.92 ? 1 - Math.pow(1 - k / 0.92, 4) : 1);
    const fr = now => {
      const el = now - t0, k = Math.min(1, el / D);
      let a; if (k < 0.92) a = from + (toDeg + over - from) * ease(k); else { const kk = (k - 0.92) / 0.08; a = toDeg + over * (1 - (1 - Math.pow(1 - kk, 3))); }
      w.style.transform = `rotate(${a}deg)`;
      const st = Math.floor(a / 10); if (st !== lastStep) { lastStep = st; sfx('tick', Math.max(0, 1 - k)); if (ptr) { ptr.style.transform = 'rotate(-14deg)'; setTimeout(() => { ptr.style.transform = ''; }, 60); } }
      if (k < 1) requestAnimationFrame(fr); else { UP.angle = toDeg; res(); }
    };
    requestAnimationFrame(fr);
  });
}
const UA = {};
UA.upsel = btn => { if (UP.busy) return; UP.sel = btn.dataset.id; sfx('click'); upPaint(); };
UA.uptgt = btn => { if (UP.busy) return; UP.target = btn.dataset.t; sfx('click'); upPaint(); };
UA.uptier = btn => { UP.tier = btn.dataset.t; $$('[data-act="uptier"]').forEach(b => b.setAttribute('aria-pressed', b === btn)); upPaint(); };
UA.upgo = async btn => {
  const sel = UP.plates.find(p => p.id === UP.sel); if (!sel || !UP.target || UP.busy) return;
  UP.busy = true; busy(btn, true, L('Крутим…', 'Spinning…')); $('#wheel').classList.remove('win', 'lose'); sfx('open');
  let r; try { r = await POST('/api/upgrade', { plateId: sel.id, target: UP.target }, { key: rid() }); } catch (e) { toast(e.message, true); UP.busy = false; busy(btn, false); upPaint(); return; }
  // the pointer is at the top; the wheel stops so that the server's roll sits under it
  const base = UP.angle; const want = ((-r.roll * 360) % 360 + 360) % 360;
  let toDeg = Math.ceil((base + 360 * 6) / 360) * 360 + want; if (toDeg - base < 360 * 6) toDeg += 360;
  sfx('whoosh'); await spinWheel(toDeg, reduced() ? 0 : 6200);
  const wheel = $('#wheel'); if (!wheel) return;
  if (r.success) {
    wheel.classList.add('win'); sfx(r.plate.tier); confetti(wheel, getComputedStyle(document.documentElement).getPropertyValue('--c-' + r.plate.tier).trim(), 60);
    $('#slotTo').innerHTML = `${Plate(r.plate, { holo: true })}${Rarity(r.plate.tier)}`; $('#slotTo .plate').style.animation = 'pop 700ms var(--ease)';
    toast(L(`Успех! ${plateStr(r.plate)} в коллекции.`, `Success! ${plateStr(r.plate)} is in your collection.`));
  } else {
    wheel.classList.add('lose'); sfx('fail'); $('#slotFrom .plate')?.classList.add('shatter');
    toast(L('Не повезло — номер сгорел.', 'No luck — the plate burned.'), true);
  }
  await wait(reduced() ? 0 : 1600); if (!$('#wheel')) { UP.busy = false; refreshMe(); return; }
  try { const d = await GET('/api/collection'); UP.plates = d.plates.filter(p => !p.listing).sort((a, b) => b.value - a.value); } catch {}
  const firstUp = (UP.plates.find(p => p.tier !== 'grail') || {}).id || null;
  UP.sel = r.success && r.plate.tier !== 'grail' ? r.plate.id : firstUp;
  UP.busy = false; refreshMe(); if (!$('#wheel')) return; busy(btn, false); upPaint();
  $('#wheel').classList.add(r.success ? 'win' : 'lose');
};


/* ---------- support (players) ---------- */
const TST = () => ({ OPEN: L('Ждёт ответа', 'Waiting'), ANSWERED: L('Есть ответ', 'Answered'), CLOSED: L('Закрыто', 'Closed') });
VIEWS.support = async ({ arg }) => {
  if (arg) {
    const d = await GET('/api/support/' + encodeURIComponent(arg)); await refreshMe(); chrome();
    return `<div class="wrap narrow"><a class="back" href="#/support">← ${L('Все обращения', 'All requests')}</a>
      <section class="sec" style="padding-top:18px"><p class="eyebrow">${d.ticket.id} · ${TST()[d.ticket.status]}</p><h1 class="h2" style="margin-top:8px">${esc(d.ticket.subject)}</h1>
      ${Thread(d.messages, false)}
      <form class="reply" id="replyForm" data-id="${d.ticket.id}"><label class="sr-only" for="rbody">${L('Сообщение', 'Message')}</label><textarea class="field" id="rbody" rows="3" maxlength="4000" placeholder="${L('Ваше сообщение…', 'Your message…')}" required></textarea><p class="err" id="rerr" hidden></p><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></form></section></div>`;
  }
  const d = await GET('/api/support');
  return `<div class="wrap narrow"><section class="page-head"><div><p class="eyebrow">${L('Поддержка', 'Support')}</p><h1 class="h1" style="margin-top:12px">${L('Написать нам', 'Contact us')}</h1><p class="lede" style="margin-top:10px">${L('Проблема с кейсом, платежом или номером — опишите, и администратор ответит здесь же.', 'A problem with a case, a payment or a plate — describe it and the admin will answer right here.')}</p></div></section>
    <form class="panel" id="ticketForm" style="display:grid;gap:14px;margin-bottom:24px"><div class="fld"><label for="tsubj">${L('Тема', 'Subject')}</label><input class="field" id="tsubj" maxlength="120" required placeholder="${L('Например: не пришли PLT', 'E.g. PLT did not arrive')}"></div>
      <div class="fld"><label for="tbody">${L('Сообщение', 'Message')}</label><textarea class="field" id="tbody" rows="4" maxlength="4000" required></textarea></div><p class="err" id="terr" hidden></p><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></form>
    <section style="padding-bottom:80px">${SH(L('Мои обращения', 'My requests'))}${d.tickets.length ? `<div class="tlist">${d.tickets.map(t => TicketRow(t, '#/support/' + t.id, t.userUnread)).join('')}</div>` : `<p class="small">${L('Обращений пока нет.', 'No requests yet.')}</p>`}</section></div>`;
};
VIEWS.support.auth = true;
const TicketRow = (t, href, unread, who = '') => `<a class="trow2${unread ? ' unread' : ''}" href="${href}"><span class="tdot"></span><div><b>${esc(t.subject)}</b><span class="small">${who ? esc(who) + ' · ' : ''}${esc((t.last || '').slice(0, 90))}</span></div><span class="tag s-${t.status === 'CLOSED' ? 'CANCELLED' : t.status === 'OPEN' ? 'ACTIVE' : 'SOLD'}">${TST()[t.status]}</span><span class="when">${rel(t.updated)}</span></a>`;
const Thread = (ms, adminView) => `<div class="thread">${ms.map(m => `<div class="msg ${m.fromAdmin ? 'adm' : 'usr'}${(adminView ? !m.fromAdmin : m.fromAdmin) ? ' other' : ''}"><div class="mhead"><b>${m.fromAdmin ? 'Plate Club' : esc(m.author)}</b><span>${date(m.at)}</span></div><p>${esc(m.body).replace(/\n/g, '<br>')}</p></div>`).join('')}</div>`;
function supportHooks() {
  const tf = $('#ticketForm'); tf && tf.addEventListener('submit', async e => { e.preventDefault(); const b = tf.querySelector('[type=submit]'); busy(b, true, '…'); try { const r = await POST('/api/support', { subject: $('#tsubj').value, body: $('#tbody').value }); toast(L('Отправлено. Ответ придёт сюда.', 'Sent. The answer will appear here.')); go('#/support/' + r.id); } catch (x) { $('#terr').hidden = false; $('#terr').textContent = x.message; busy(b, false); } });
  const rf = $('#replyForm'); rf && rf.addEventListener('submit', async e => { e.preventDefault(); const b = rf.querySelector('[type=submit]'); busy(b, true, '…'); try { await POST('/api/support/' + rf.dataset.id + '/reply', { body: $('#rbody').value }); render(false); } catch (x) { $('#rerr').hidden = false; $('#rerr').textContent = x.message; busy(b, false); } });
}

/* ---------- admin control panel ---------- */
const AD = { q: '', status: 'ACTIVE', tk: 'OPEN', qs: 'PENDING' }; const ADMIN_ACTS = {};
const ADMIN_TABS = () => [['overview', L('Обзор', 'Overview'), 'chart'], ['users', L('Участники', 'Players'), 'users'], ['support', L('Сообщения', 'Messages'), 'chat'], ['quests', L('Задания', 'Quests'), 'gift'], ['market', L('Рынок', 'Market'), 'market'], ['cases', L('Кейсы', 'Cases'), 'cases'], ['promos', L('Промокоды', 'Promo codes'), 'gift'], ['settings', L('Настройки', 'Settings'), 'sliders'], ['log', L('Журнал', 'Log'), 'list']];
const ACT_NAMES = () => ({ claim_admin: L('Админ активирован', 'Admin claimed'), quest_pay: L('Задание оплачено', 'Quest paid'), quest_reject: L('Задание отклонено', 'Quest rejected'), make_admin: L('Назначен админ', 'Admin appointed'), remove_admin: L('Снят админ', 'Admin removed'), grant_plt: L('Начислено', 'Granted'), deduct_plt: L('Списано', 'Deducted'), remove_listing: L('Снято объявление', 'Listing removed'), create_promo: L('Создан промокод', 'Promo created'), enable_promo: L('Промокод включён', 'Promo enabled'), disable_promo: L('Промокод выключен', 'Promo disabled'), message: L('Сообщение', 'Message'), block_user: L('Блокировка', 'Blocked'), unblock_user: L('Разблокировка', 'Unblocked'), gift_plate: L('Подарен номер', 'Plate gifted'), grant_all: L('Бонус всем', 'Bonus to all'), settings: L('Настройки', 'Settings') });
const LogRow = e => `<div class="tx"><span class="lbl">${ACT_NAMES()[e.action] || e.action} · ${esc(e.target || '')}${e.reason ? ' — ' + esc(e.reason) : ''}</span><span class="when">${date(e.at)} · ${esc(e.admin)}</span><span class="amt">${e.amount ? (e.amount > 0 ? '+' : '−') + fmt(Math.abs(e.amount)) : ''}</span></div>`;
const KV = (rows) => `<dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

VIEWS.admin = async (r) => {
  if (ME.role !== 'admin') return `<div class="wrap auth"><form class="auth-card" id="claimForm"><div style="text-align:center"><h1 class="h2">${L('Доступ администратора', 'Admin access')}</h1><p class="small" style="margin:8px 0 0">${L('Введите одноразовый код.', 'Enter the one-time code.')}</p></div><div class="fld"><label for="acode">${L('Код', 'Code')}</label><input class="field mono" id="acode" autocomplete="off" required></div><p class="err" id="aerr" hidden></p><button class="btn btn-chrome btn-lg" type="submit">${L('Войти как админ', 'Enter as admin')}</button></form></div>`;
  const tab = ADMIN_TABS().some(t => t[0] === r.arg) ? r.arg : 'overview'; const id = r.query && r.query.get('id');
  const body = await ADMIN_VIEWS[tab](id);
  return `<div class="wrap adm"><div class="adm-top"><div><p class="eyebrow">${L('Панель управления', 'Control panel')} · ${esc(ME.nickname)}</p><h1 class="h2" style="margin-top:6px">${ADMIN_TABS().find(t => t[0] === tab)[1]}</h1></div></div>
    <div class="adm-grid"><nav class="adm-nav" aria-label="${L('Разделы', 'Sections')}">${ADMIN_TABS().map(([k, t, ic]) => `<a href="#/admin/${k}"${k === tab ? ' aria-current="page"' : ''}>${IC[ic] || ''}<span>${t}</span>${k === 'support' && ME.inbox ? `<i class="cnt">${ME.inbox}</i>` : ''}</a>`).join('')}</nav>
    <div class="adm-main">${body}</div></div></div>`;
};
VIEWS.admin.auth = true;
const ADMIN_VIEWS = {};

ADMIN_VIEWS.overview = async () => {
  const [o, e] = await Promise.all([GET('/api/admin/overview'), GET('/api/admin/economy')]); const O = o.overview, E = e.economy;
  const st = (k, v, cls = '') => `<div class="stat"><span>${k}</span><b class="${cls}">${v}</b></div>`;
  const qa = (h, ic, t, sub, hot) => `<a class="qa${hot ? ' hot' : ''}" href="#/admin/${h}">${IC[ic] || ''}<b>${t}</b><span>${sub}</span></a>`;
  return `<div class="qa-row">${qa('users', 'users', L('Игроки', 'Players'), L('найти, начислить, заблокировать', 'find, grant, block'))}${qa('support', 'chat', L('Сообщения', 'Messages'), E.open_tickets ? L(`ждут ответа: ${E.open_tickets}`, `waiting: ${E.open_tickets}`) : L('новых нет', 'nothing new'), E.open_tickets)}${qa('quests', 'gift', L('Задания', 'Quests'), E.open_quests ? L(`на проверке: ${E.open_quests}`, `in review: ${E.open_quests}`) : L('новых нет', 'nothing new'), E.open_quests)}${qa('settings', 'sliders', L('Настройки', 'Settings'), L('бонусы, цены, объявление', 'bonuses, prices, banner'))}</div>
    <div class="stats s4">${st(L('Игроков', 'Players'), fmt(O.users))}${st(L('Новых за сутки', 'New, 24h'), fmt(E.new24))}${st(L('Активных за сутки', 'Active, 24h'), fmt(E.active24))}${st(L('Открытых обращений', 'Open requests'), `<a href="#/admin/support">${fmt(E.open_tickets)}</a>`, E.open_tickets ? 'up' : '')}
      ${st(L('Открыто кейсов', 'Cases opened'), fmt(O.opens))}${st(L('Потрачено на кейсы', 'Spent on cases'), fmt(E.case_spent))}${st(L('Продаж · оборот', 'Sales · volume'), fmt(O.sold) + ' · ' + fmt(O.volume))}${st(L('Ваша комиссия', 'Your fees'), fmt(O.fees), 'up')}
      ${st(L('PLT у игроков', 'PLT with players'), fmt(O.user_plt))}${st(L('Выплачено банком', 'Paid by the bank'), fmt(E.bank_paid))}${st(L('Выплачено скупщиком', 'Paid by the dealer'), fmt(E.dealer_paid))}${st(L('Бонусы и награды', 'Bonuses & rewards'), fmt(E.bonuses))}</div>
    <div class="split" style="margin-top:20px">
      <form class="panel" id="allGrant" style="display:grid;gap:12px;align-content:start"><h2 class="h3">${L('Бонус всем игрокам', 'Bonus to every player')}</h2><div class="row" style="gap:10px;flex-wrap:nowrap"><div class="fld" style="flex:1"><label for="agamt">${L('PLT каждому', 'PLT each')}</label><input class="field mono" id="agamt" type="number" min="1" max="1000000" required></div><div class="fld" style="flex:2"><label for="agr">${L('Причина', 'Reason')}</label><input class="field" id="agr" maxlength="200" required placeholder="${L('Праздник, турнир…', 'Holiday, tournament…')}"></div></div><p class="err" id="agerr" hidden></p><button class="btn btn-chrome" type="submit">${L('Начислить всем', 'Grant to all')}</button></form>
      <form class="panel" id="allMsg" style="display:grid;gap:12px;align-content:start"><h2 class="h3">${L('Сообщение всем игрокам', 'Message every player')}</h2><div class="fld"><label for="amsubj">${L('Тема', 'Subject')}</label><input class="field" id="amsubj" maxlength="120" required></div><div class="fld"><label for="ambody">${L('Текст', 'Text')}</label><textarea class="field" id="ambody" rows="3" maxlength="4000" required></textarea></div><p class="err" id="amerr" hidden></p><button class="btn btn-chrome" type="submit">${L('Отправить всем', 'Send to all')}</button></form></div>
    <div class="panel row" style="margin-top:20px;justify-content:space-between"><div><h2 class="h3">${L('Демо-игроки', 'Demo players')}</h2><p class="small" style="margin:4px 0 0">${L('Добавит 15 игроков с ником demo_… и номерами, чтобы сайт не выглядел пустым. Повторно не создаются.', 'Adds 15 players named demo_… with plates so the site does not look empty. Created once.')}</p></div><button class="btn btn-ghost" data-act="ademo">${L('Добавить 15 демо-игроков', 'Add 15 demo players')}</button></div>
    <section class="sec">${SH(L('Последние действия', 'Recent actions'), '', `<a class="sh-link" href="#/admin/log">${L('Весь журнал', 'Full log')}</a>`)}<div class="panel">${o.log.slice(0, 8).map(LogRow).join('') || `<p class="small">${L('Пусто.', 'Empty.')}</p>`}</div></section>`;
};

ADMIN_VIEWS.users = async (id) => {
  if (id) return adminUser(id);
  const us = await GET('/api/admin/users?q=' + encodeURIComponent(AD.q));
  return `<label class="search" style="margin-bottom:14px">${IC.search}<span class="sr-only">${L('Поиск игрока', 'Find player')}</span><input id="aq" type="search" placeholder="${L('Ник или email', 'Nickname or email')}" value="${esc(AD.q)}" style="text-transform:none;font-family:var(--f-body)"></label>
    <p class="small" style="margin:0 0 10px">${us.users.length} ${pl(us.users.length, ['участник', 'участника', 'участников'], ['player', 'players'])}. ${L('Нажмите на игрока, чтобы открыть карточку: начислить PLT, подарить номер, написать, заблокировать.', 'Click a player to open their card: send PLT, gift a plate, message, block.')}</p>
    <div class="panel tbl-wrap" style="padding:8px"><table class="tbl click"><thead><tr><th>${L('Игрок', 'Player')}</th><th>Email</th><th class="n">PLT</th><th class="n">${L('Номеров', 'Plates')}</th><th class="n">${L('Оценка', 'Value')}</th><th>${L('С нами с', 'Joined')}</th></tr></thead><tbody>${us.users.map(u => `<tr data-act="auser" data-id="${u.id}"><td><b>${esc(u.nickname)}</b>${u.role === 'admin' ? ' <span class="tag admin">admin</span>' : ''}${u.blocked ? ` <span class="tag s-CANCELLED">${L('блок', 'blocked')}</span>` : ''}</td><td class="small">${esc(u.email)}</td><td class="n mono">${fmt(u.balance)}</td><td class="n mono">${u.plates}</td><td class="n mono">${fmt(u.value || 0)}</td><td class="small">${day(u.joined)}</td></tr>`).join('')}</tbody></table></div>`;
};
async function adminUser(id) {
  const d = await GET('/api/admin/users/' + encodeURIComponent(id)); const u = d.user;
  const quick = [100, 500, 1000, 5000, 10000, 100000];
  return `<a class="back" href="#/admin/users">← ${L('Все участники', 'All players')}</a>
    <div class="ucard panel"><div class="row" style="gap:16px">${Ava(u.nickname).replace('class="ava"', 'class="ava" style="width:58px;height:58px;font-size:26px;border-radius:18px"')}<div><h2 class="h2">${esc(u.nickname)} ${u.role === 'admin' ? '<span class="tag admin">admin</span>' : ''}${u.blocked ? ` <span class="tag s-CANCELLED">${L('заблокирован', 'blocked')}</span>` : ''}</h2><p class="small" style="margin:4px 0 0">${esc(u.email)} · ID ${u.id} · ${L('с', 'since')} ${day(u.joined)}${u.lastActive ? ' · ' + L('активность', 'active') + ' ' + rel(u.lastActive) : ''}</p>${u.blocked ? `<p class="small" style="margin:4px 0 0;color:#f87171">${L('Причина', 'Reason')}: ${esc(u.blockedReason || '')}</p>` : ''}</div></div>
      <div class="stats s4" style="margin-top:18px"><div class="stat"><span>PLT</span><b>${fmt(u.balance)}</b></div><div class="stat"><span>${L('Номеров', 'Plates')}</span><b>${d.plates.length}</b></div><div class="stat"><span>${L('Кейсов открыто', 'Cases opened')}</span><b>${fmt(u.opens)}</b></div><div class="stat"><span>${L('Пополнения', 'Top-ups')}</span><b>${fmt(u.topups)}</b></div></div></div>
    <div class="split" style="margin-top:18px">
      <form class="panel" id="uGrant" data-id="${u.id}" style="display:grid;gap:12px;align-content:start"><h3 class="h3">${L('Отправить PLT', 'Send PLT')}</h3>
        <div class="row" style="gap:6px">${quick.map(v => `<button type="button" class="chip" data-act="qamt" data-v="${v}">+${fmt(v)}</button>`).join('')}</div>
        <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="fld" style="flex:1"><label for="ugamt">${L('Сумма (минус — списать)', 'Amount (negative deducts)')}</label><input class="field mono" id="ugamt" type="number" step="1" required></div><div class="fld" style="flex:2"><label for="ugr">${L('Причина (игрок увидит)', 'Reason (player sees it)')}</label><input class="field" id="ugr" maxlength="200" required value="${L('Подарок от Plate Club', 'Gift from Plate Club')}"></div></div>
        <p class="err" id="ugerr" hidden></p><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></form>
      <div style="display:grid;gap:18px;align-content:start">
        <form class="panel" id="uGift" data-id="${u.id}" style="display:grid;gap:12px"><h3 class="h3">${L('Подарить номер', 'Gift a plate')}</h3><div class="row" style="gap:10px;flex-wrap:nowrap"><select class="field" id="gtier">${CFG.tiers.map(t => `<option value="${t.id}">${tierName(t.id)}</option>`).join('')}</select><select class="field" id="gcountry"><option value="RU">${L('Россия', 'Russia')}</option><option value="BY">${L('Беларусь', 'Belarus')}</option></select></div><button class="btn btn-ghost" type="submit">${L('Выпустить и подарить', 'Mint and gift')}</button></form>
        <div class="panel row" style="gap:10px"><button class="btn btn-ghost" data-act="umsg" data-id="${u.id}" data-n="${esc(u.nickname)}">${IC.chat}${L('Написать', 'Message')}</button>${u.role === 'user' ? (u.blocked ? `<button class="btn btn-ghost" data-act="ublock" data-id="${u.id}" data-b="0">${L('Разблокировать', 'Unblock')}</button>` : `<button class="btn btn-ghost danger" data-act="ublock" data-id="${u.id}" data-b="1">${L('Заблокировать', 'Block')}</button>`) : ''}<a class="btn btn-ghost" href="#/u/${esc(u.nickname)}">${L('Профиль', 'Profile')}</a>${u.id !== ME.id ? `<button class="btn btn-ghost" data-act="urole" data-id="${u.id}" data-n="${esc(u.nickname)}" data-a="${u.role === 'admin' ? 0 : 1}">${IC.crown}${u.role === 'admin' ? L('Снять админа', 'Remove admin') : L('Сделать админом', 'Make admin')}</button>` : ''}</div></div></div>
    <section class="sec">${SH(L('Номера', 'Plates'))}${d.plates.length ? `<div class="pgrid">${d.plates.slice(0, 24).map(p => PlateCard(p, { pl: true })).join('')}</div>` : `<p class="small">${L('Номеров нет.', 'No plates.')}</p>`}</section>
    <div class="split" style="padding-bottom:60px"><div class="panel">${SH(L('Операции', 'Transactions'))}${d.ledger.map(TxRow).join('') || `<p class="small">${L('Пусто.', 'Empty.')}</p>`}</div>
      <div class="panel" style="align-self:start">${SH(L('Обращения', 'Requests'))}${d.tickets.length ? `<div class="tlist">${d.tickets.map(t => TicketRow(t, '#/admin/support?id=' + t.id, t.adminUnread)).join('')}</div>` : `<p class="small">${L('Обращений нет.', 'No requests.')}</p>`}</div></div>`;
}

ADMIN_VIEWS.support = async (id) => {
  if (id) {
    const d = await GET('/api/admin/support/' + encodeURIComponent(id)); await refreshMe(); chrome(); const t = d.ticket;
    return `<a class="back" href="#/admin/support">← ${L('Все сообщения', 'All messages')}</a>
      <div class="panel"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">${t.id} · ${TST()[t.status]}</p><h2 class="h3" style="margin-top:6px">${esc(t.subject)}</h2><p class="small" style="margin:4px 0 0">${L('От', 'From')} <a href="#/admin/users?id=${t.userId}">${esc(t.nickname)}</a> · ${date(t.created)}</p></div>
        <div class="row">${t.status !== 'CLOSED' ? `<button class="btn btn-sm btn-ghost" data-act="tstatus" data-id="${t.id}" data-s="CLOSED">${L('Закрыть', 'Close')}</button>` : `<button class="btn btn-sm btn-ghost" data-act="tstatus" data-id="${t.id}" data-s="OPEN">${L('Открыть снова', 'Reopen')}</button>`}</div></div>
      ${Thread(d.messages, true)}
      <form class="reply" id="aReply" data-id="${t.id}"><label class="sr-only" for="arbody">${L('Ответ', 'Answer')}</label><textarea class="field" id="arbody" rows="3" maxlength="4000" placeholder="${L('Ваш ответ…', 'Your answer…')}" required></textarea><p class="err" id="arerr" hidden></p><div class="row"><button class="btn btn-chrome" type="submit">${L('Ответить', 'Reply')}</button><button class="btn btn-ghost" type="submit" data-close="1">${L('Ответить и закрыть', 'Reply and close')}</button></div></form></div>`;
  }
  const d = await GET('/api/admin/support?status=' + AD.tk);
  const F = [['OPEN', L('Ждут ответа', 'Waiting')], ['ANSWERED', L('Отвечено', 'Answered')], ['CLOSED', L('Закрыто', 'Closed')], ['ALL', L('Все', 'All')]];
  return `<div class="row" style="margin-bottom:14px">${F.map(([k, t]) => `<button class="chip" data-act="atk" data-s="${k}" aria-pressed="${AD.tk === k}">${t}</button>`).join('')}</div>
    ${d.tickets.length ? `<div class="tlist">${d.tickets.map(t => TicketRow(t, '#/admin/support?id=' + t.id, t.adminUnread, t.nickname)).join('')}</div>` : Empty(L('Сообщений нет', 'No messages'), L('Когда игрок напишет, обращение появится здесь.', 'When a player writes, the request appears here.'))}`;
};

ADMIN_VIEWS.market = async () => {
  const [ls, st, s] = await Promise.all([GET('/api/admin/listings?status=' + AD.status), GET('/api/market/stats'), GET('/api/admin/settings')]);
  const ST = { ACTIVE: L('Активные', 'Active'), SOLD: L('Проданные', 'Sold'), CANCELLED: L('Снятые', 'Cancelled'), ALL: L('Все', 'All') };
  return `<div class="stats s4"><div class="stat"><span>${L('В продаже', 'Listed')}</span><b>${fmt(st.active)}</b></div><div class="stat"><span>${L('Ниже оценки', 'Below value')}</span><b class="up">${fmt(st.deals)}</b></div><div class="stat"><span>${L('Сделок за сутки', 'Trades, 24h')}</span><b>${fmt(st.sales)}</b></div><div class="stat"><span>${L('Оборот за сутки', 'Volume, 24h')}</span><b>${fmt(st.volume)}</b></div></div>
    <form class="panel" id="botForm" style="display:grid;gap:12px;margin-top:18px"><h2 class="h3">Plate Club Market</h2><p class="small" style="margin:0">${L('Сколько номеров маркетмейкер держит на рынке. Новые лоты появляются при следующем открытии рынка.', 'How many plates the market maker keeps listed. New lots appear the next time the market loads.')}</p>
      <div class="row" style="gap:10px"><div class="fld" style="width:160px"><label for="bsize">${L('Лотов', 'Lots')}</label><input class="field mono" id="bsize" type="number" min="0" max="200" value="${s.settings.botSize}"></div><button class="btn btn-chrome" type="submit" style="align-self:end">${L('Сохранить', 'Save')}</button><button class="btn btn-ghost" type="button" data-act="restock" style="align-self:end">${L('Пополнить сейчас', 'Restock now')}</button></div></form>
    <section class="sec">${SH(L('Объявления', 'Listings'), L('Снятый номер вернётся владельцу.', 'A removed plate returns to its owner.'))}
      <div class="row" style="margin-bottom:14px">${Object.entries(ST).map(([k, t]) => `<button class="chip" data-act="astatus" data-s="${k}" aria-pressed="${AD.status === k}">${t}</button>`).join('')}</div>
      <div class="panel tbl-wrap" style="padding:8px">${ls.listings.length ? `<table class="tbl"><thead><tr><th>${L('Номер', 'Plate')}</th><th>${L('Продавец', 'Seller')}</th><th>${L('Покупатель', 'Buyer')}</th><th class="n">${L('Цена', 'Price')}</th><th class="n">${L('Оценка', 'Value')}</th><th>${L('Статус', 'Status')}</th><th></th></tr></thead><tbody>${ls.listings.map(l => `<tr><td><a href="#/plate/${l.plate.id}">${esc(plateStr(l.plate))}</a></td><td>${esc(l.seller)}</td><td>${l.buyer ? esc(l.buyer) : '—'}</td><td class="n mono">${fmt(l.price)}</td><td class="n mono">${fmt(l.plate.value)}</td><td><span class="tag s-${l.status}">${l.status}</span></td><td>${l.status === 'ACTIVE' ? `<button class="btn btn-sm btn-ghost" data-act="aremove" data-id="${l.id}">${L('Снять', 'Remove')}</button>` : ''}</td></tr>`).join('')}</tbody></table>` : `<p class="small" style="margin:12px">${L('Пусто.', 'Empty.')}</p>`}</div></section>`;
};

ADMIN_VIEWS.cases = async () => {
  const [s, e] = await Promise.all([GET('/api/admin/settings'), GET('/api/admin/economy')]); const ov = s.settings.cases || {};
  const all = s.cases; const stat = Object.fromEntries(e.cases.map(c => [c.id, c]));
  return `<p class="small" style="margin:0 0 12px">${L('Меняйте цену кейса или скрывайте его с сайта. Пустая цена — расчётная. Шансы выпадения задаются в коде игры.', 'Change a case price or hide it from the site. Empty price means the calculated one. Drop odds live in the game code.')}</p>
    <form id="casesForm"><div class="panel tbl-wrap" style="padding:8px"><table class="tbl"><thead><tr><th>№</th><th>${L('Кейс', 'Case')}</th><th class="n">${L('Расчётная', 'Calculated')}</th><th>${L('Своя цена', 'Custom price')}</th><th>${L('Показывать', 'Visible')}</th><th class="n">${L('Открыто', 'Opened')}</th><th class="n">${L('Выручка', 'Revenue')}</th></tr></thead>
    <tbody>${all.map(c => `<tr><td class="mono">${c.id}</td><td><span class="cdot" style="background:${c.color}"></span>${esc(caseName(c))}<br><span class="small">${catName(c.cat)}</span></td><td class="n mono">${fmt(c.price)}</td><td><input class="field mono cprice" data-id="${c.id}" type="number" min="1" max="10000000" placeholder="${c.price}" value="${ov[c.id] && ov[c.id].price ? ov[c.id].price : ''}" style="width:120px;min-height:38px"></td><td><label class="switch"><input type="checkbox" class="cvis" data-id="${c.id}" ${ov[c.id] && ov[c.id].hidden ? '' : 'checked'}><span></span></label></td><td class="n mono">${stat[c.id] ? fmt(stat[c.id].opens) : 0}</td><td class="n mono">${stat[c.id] ? fmt(stat[c.id].spent) : 0}</td></tr>`).join('')}</tbody></table></div>
    <div class="row" style="margin:16px 0 60px"><button class="btn btn-chrome btn-lg" type="submit">${L('Сохранить кейсы', 'Save cases')}</button><p class="err" id="cerr" hidden></p></div></form>`;
};

ADMIN_VIEWS.promos = async () => {
  const pr = await GET('/api/admin/promos');
  return `<div class="split"><form id="promoAdm" class="panel" style="display:grid;gap:14px;align-content:start"><h2 class="h3">${L('Новый промокод', 'New promo code')}</h2>
      <div class="fld"><label for="pcode">${L('Код', 'Code')}</label><input class="field mono" id="pcode" maxlength="24" placeholder="SUMMER500" required style="text-transform:uppercase"></div>
      <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="fld" style="flex:1"><label for="pamt">PLT</label><input class="field mono" id="pamt" type="number" min="1" max="1000000" required></div><div class="fld" style="flex:1"><label for="puses">${L('Лимит', 'Limit')}</label><input class="field mono" id="puses" type="number" min="1" placeholder="∞"></div><div class="fld" style="flex:1"><label for="pdays">${L('Дней', 'Days')}</label><input class="field mono" id="pdays" type="number" min="1" max="3650" placeholder="∞"></div></div>
      <div class="fld"><label for="pnote">${L('Заметка', 'Note')}</label><input class="field" id="pnote" maxlength="120"></div>
      <p class="err" id="perr" hidden></p><button class="btn btn-chrome" type="submit">${L('Создать', 'Create')}</button></form>
    <div class="panel tbl-wrap">${SH(L('Промокоды', 'Promo codes'))}<table class="tbl"><thead><tr><th>${L('Код', 'Code')}</th><th class="n">PLT</th><th class="n">${L('Активаций', 'Uses')}</th><th>${L('Срок', 'Expires')}</th><th></th></tr></thead><tbody>${pr.promos.map(x => `<tr><td class="mono">${esc(x.code)}${x.note ? `<br><span class="small">${esc(x.note)}</span>` : ''}</td><td class="n mono">${fmt(x.amount)}</td><td class="n mono">${x.uses}${x.maxUses ? ' / ' + x.maxUses : ''}</td><td class="small">${x.expires ? day(x.expires) : '∞'}</td><td><button class="btn btn-sm btn-ghost" data-act="ptoggle" data-c="${esc(x.code)}">${x.active ? L('Выключить', 'Disable') : L('Включить', 'Enable')}</button></td></tr>`).join('')}</tbody></table></div></div>`;
};

ADMIN_VIEWS.settings = async () => {
  const s = (await GET('/api/admin/settings')).settings;
  const f = (id, label, val, hint, attrs) => `<div class="fld"><label for="${id}">${label}</label><input class="field mono" id="${id}" type="number" value="${val}" ${attrs}><span class="small">${hint}</span></div>`;
  return `<form class="panel" id="setForm" style="display:grid;gap:18px;max-width:760px;margin-bottom:60px">
    <div class="fld"><label for="sann">${L('Объявление на сайте', 'Site announcement')}</label><input class="field" id="sann" maxlength="280" value="${esc(s.announcement)}" placeholder="${L('Например: турнир в субботу! Пусто — скрыть.', 'E.g. tournament on Saturday! Empty hides it.')}"><span class="small">${L('Показывается вверху каждой страницы.', 'Shown at the top of every page.')}</span></div>
    <div class="set-grid">
      ${f('ssign', L('Бонус за регистрацию, PLT', 'Sign-up bonus, PLT'), s.signupBonus, L('Новый игрок получает при регистрации.', 'A new player gets it on sign-up.'), 'min="0" max="100000"')}
      ${f('sdaily', L('Ежедневный бонус, PLT', 'Daily bonus, PLT'), s.dailyBonus, L('Раз в сутки в «Бонусах».', 'Once a day in Bonuses.'), 'min="0" max="100000"')}
      ${f('sbank', L('Банк выкупает, %', 'Bank buys at, %'), Math.round(s.bankRate * 100), L('Процент от оценки номера.', 'Percent of the plate value.'), 'min="0" max="95"')}
      ${f('sfee', L('Комиссия рынка, %', 'Market fee, %'), Math.round(s.marketFee * 1000) / 10, L('Удерживается с продавца, приходит вам.', 'Taken from the seller, paid to you.'), 'min="0" max="30" step="0.5"')}
      ${f('sdeal', L('Скупщик платит, %', 'Dealer pays, %'), Math.round(s.dealerRate * 100), L('Процент от оценки за номера из спроса дня.', 'Percent of value for plates in today’s demand.'), 'min="50" max="200"')}
      ${f('sdper', L('Скупщик: номеров в день', 'Dealer: plates a day'), s.dealerPerDay, L('Лимит на одного игрока.', 'Limit per player.'), 'min="0" max="50"')}
      ${f('sbot', L('Лотов маркетмейкера', 'Market-maker lots'), s.botSize, L('Сколько номеров держит Plate Club Market.', 'How many plates Plate Club Market keeps listed.'), 'min="0" max="200"')}
    </div><p class="err" id="serr" hidden></p><div class="row"><button class="btn btn-chrome btn-lg" type="submit">${L('Сохранить', 'Save')}</button><button class="btn btn-ghost" type="button" data-act="sreset">${L('Вернуть по умолчанию', 'Reset to defaults')}</button></div></form>`;
};

ADMIN_VIEWS.log = async () => {
  const o = await GET('/api/admin/overview');
  return `<div class="panel" style="margin-bottom:60px">${o.log.map(LogRow).join('') || `<p class="small">${L('Пусто.', 'Empty.')}</p>`}</div>`;
};

function adminHooks() {
  const cf = $('#claimForm'); cf && cf.addEventListener('submit', async e => { e.preventDefault(); const b = cf.querySelector('[type=submit]'); busy(b, true, '…'); try { const r = await POST('/api/admin/claim', { code: $('#acode').value.trim() }); await refreshMe(); sfx('grail'); toast(r.granted ? `+${fmt(r.granted)} PLT` : 'OK'); render(false); } catch (x) { $('#aerr').hidden = false; $('#aerr').textContent = x.message; busy(b, false); } });
  const form = (id, fn) => { const f = $(id); f && f.addEventListener('submit', async e => { e.preventDefault(); const b = e.submitter || f.querySelector('[type=submit]'); const err = f.querySelector('.err'); if (err) err.hidden = true; busy(b, true, '…'); try { await fn(f, e); } catch (x) { if (err) { err.hidden = false; err.textContent = x.message; } else toast(x.message, true); busy(b, false); } }); };
  form('#uGrant', async f => {
    const amt = Math.round(+$('#ugamt').value), reason = $('#ugr').value.trim();
    const ok = await confirmDialog({ title: amt > 0 ? L('Отправить PLT', 'Send PLT') : L('Списать PLT', 'Deduct PLT'), rows: [[L('Сумма', 'Amount'), (amt > 0 ? '+' : '−') + fmt(Math.abs(amt)) + ' PLT', 1], [L('Причина', 'Reason'), esc(reason)]], ok: L('Подтвердить', 'Confirm'), danger: amt < 0 });
    if (!ok) return busy(f.querySelector('[type=submit]'), false);
    const r = await POST('/api/admin/grant', { userId: Number(f.dataset.id), amount: amt, reason }); toast(`${r.nickname}: ${fmt(r.balance)} PLT`); sfx('coin'); await refreshMe(); render(false);
  });
  form('#uGift', async f => { const r = await POST(`/api/admin/users/${f.dataset.id}/plate`, { tier: $('#gtier').value, country: $('#gcountry').value }); toast(L('Подарен номер ', 'Gifted ') + plateStr(r.plate)); render(false); });
  form('#allGrant', async () => { const amt = Math.round(+$('#agamt').value); const ok = await confirmDialog({ title: L('Бонус всем игрокам', 'Bonus to every player'), rows: [[L('Каждому', 'Each'), '+' + fmt(amt) + ' PLT', 1]], ok: L('Начислить', 'Grant') }); if (!ok) return busy($('#allGrant [type=submit]'), false); const r = await POST('/api/admin/grant-all', { amount: amt, reason: $('#agr').value }); toast(L(`Начислено ${r.players} игрокам`, `Granted to ${r.players} players`)); render(false); });
  form('#allMsg', async () => { const r = await POST('/api/admin/message', { all: true, subject: $('#amsubj').value, body: $('#ambody').value }); toast(L(`Отправлено: ${r.sent}`, `Sent: ${r.sent}`)); render(false); });
  form('#aReply', async (f, e) => { await POST(`/api/admin/support/${f.dataset.id}/reply`, { body: $('#arbody').value, close: !!(e.submitter && e.submitter.dataset.close) }); toast(L('Ответ отправлен', 'Answer sent')); render(false); });
  form('#botForm', async () => { await POST('/api/admin/settings', { botSize: Math.round(+$('#bsize').value) }); toast(L('Сохранено', 'Saved')); await POST('/api/admin/market/restock'); render(false); });
  form('#setForm', async () => { await POST('/api/admin/settings', { announcement: $('#sann').value, signupBonus: +$('#ssign').value, dailyBonus: +$('#sdaily').value, bankRate: +$('#sbank').value / 100, marketFee: +$('#sfee').value / 100, dealerRate: +$('#sdeal').value / 100, dealerPerDay: +$('#sdper').value, botSize: +$('#sbot').value }); CFG = await GET('/api/config'); toast(L('Настройки сохранены', 'Settings saved')); render(false); });
  form('#casesForm', async () => { const cases = {}; $$('#casesForm .cprice').forEach(i => { if (i.value) (cases[i.dataset.id] = cases[i.dataset.id] || {}).price = Math.round(+i.value); }); $$('#casesForm .cvis').forEach(i => { if (!i.checked) (cases[i.dataset.id] = cases[i.dataset.id] || {}).hidden = true; }); await POST('/api/admin/settings', { cases }); CFG = await GET('/api/config'); toast(L('Кейсы сохранены', 'Cases saved')); render(false); });
  form('#promoAdm', async () => { await POST('/api/admin/promos', { code: $('#pcode').value, amount: Math.round(+$('#pamt').value), maxUses: $('#puses').value ? Math.round(+$('#puses').value) : null, days: $('#pdays').value ? Math.round(+$('#pdays').value) : null, note: $('#pnote').value }); toast(L('Промокод создан', 'Promo code created')); render(false); });
  let t; const aq = $('#aq'); aq && aq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { AD.q = aq.value; render(false).then(() => { const n = $('#aq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 350); });
}
ADMIN_ACTS.ademo = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/admin/demo-players', {}); toast(L(`Добавлено: ${r.made}`, `Added: ${r.made}`)); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
ADMIN_ACTS.auser = el => go('#/admin/users?id=' + el.dataset.id);
ADMIN_ACTS.qamt = btn => { const i = $('#ugamt'); i.value = btn.dataset.v; i.focus(); };
ADMIN_ACTS.atk = btn => { AD.tk = btn.dataset.s; render(false); };
ADMIN_ACTS.tstatus = async btn => { try { await POST(`/api/admin/support/${btn.dataset.id}/status`, { status: btn.dataset.s }); render(false); } catch (e) { toast(e.message, true); } };
ADMIN_ACTS.restock = async btn => { busy(btn, true, '…'); try { await POST('/api/admin/market/restock'); toast(L('Рынок пополнен', 'Market restocked')); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
ADMIN_ACTS.sreset = async () => { const ok = await confirmDialog({ title: L('Вернуть настройки по умолчанию?', 'Reset settings to defaults?'), ok: L('Вернуть', 'Reset') }); if (!ok) return; const d = (await GET('/api/admin/settings')).defaults; await POST('/api/admin/settings', { ...d, cases: (await GET('/api/admin/settings')).settings.cases }); CFG = await GET('/api/config'); toast('OK'); render(false); };
ADMIN_ACTS.umsg = btn => {
  openDialog(`<form class="dlg" id="umForm" novalidate><h2 class="h3" id="dlgTitle">${L('Сообщение для', 'Message to')} ${esc(btn.dataset.n)}</h2><div class="fld"><label for="umsubj">${L('Тема', 'Subject')}</label><input class="field" id="umsubj" maxlength="120" value="${L('Сообщение от Plate Club', 'Message from Plate Club')}"></div><div class="fld"><label for="umbody">${L('Текст', 'Text')}</label><textarea class="field" id="umbody" rows="4" maxlength="4000" required autofocus></textarea></div><p class="err" id="umerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></div></form>`);
  $('#umForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await POST('/api/admin/message', { userId: Number(btn.dataset.id), subject: $('#umsubj').value, body: $('#umbody').value }); dlg.close(); toast(L('Отправлено', 'Sent')); render(false); } catch (x) { $('#umerr').hidden = false; $('#umerr').textContent = x.message; busy(sb, false); } });
};
ADMIN_VIEWS.quests = async () => {
  const d = await GET('/api/admin/quests?status=' + AD.qs);
  const seg = `<div class="seg" role="group">${[['PENDING', L('На проверке', 'In review')], ['PAID', L('Начислено', 'Paid')], ['REJECTED', L('Отклонено', 'Rejected')]].map(([v, t]) => `<button data-act="aqs" data-s="${v}" aria-pressed="${AD.qs === v}">${t}${v === 'PENDING' && d.pending ? ` (${d.pending})` : ''}</button>`).join('')}</div>`;
  const row = x => `<div class="panel qrow"><div><p class="eyebrow">${x.kind === 'story' ? 'Instagram / Stories' : 'TikTok'} · ${date(x.at)}</p>
      <h3 class="h3" style="margin:6px 0"><a href="#/u/${esc(x.nickname)}">${esc(x.nickname)}</a> · <span class="mono small">${esc(x.handle)}</span></h3>
      <p class="small" style="margin:0"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.slice(0, 70))}</a></p>
      ${x.note ? `<p class="small" style="margin:6px 0 0;opacity:.8">${esc(x.note)}</p>` : ''}
      ${x.status !== 'PENDING' ? `<p class="small" style="margin:6px 0 0">${QSTAT()[x.status]}${x.amount ? ' · +' + fmt(x.amount) + ' PLT' : ''}${x.views ? ' · ' + fmt(x.views) + ' ' + L('просмотров', 'views') : ''}${x.reason ? ' · ' + esc(x.reason) : ''}</p>` : ''}</div>
    ${x.status === 'PENDING' ? `<div class="qacts">${x.kind === 'tiktok' ? `<input class="field mono" id="qv-${x.id}" type="number" min="0" max="100000000" placeholder="${L('просмотров', 'views')}" style="max-width:130px">` : ''}
      <button class="btn btn-sm btn-chrome" data-act="aqok" data-id="${x.id}" data-k="${x.kind}">${L('Начислить', 'Pay')}</button>
      <button class="btn btn-sm btn-ghost danger" data-act="aqno" data-id="${x.id}">${L('Отклонить', 'Reject')}</button></div>` : ''}</div>`;
  return `<p class="small" style="margin:0 0 10px">${L('Проверьте публикацию по ссылке: аккаунт открыт, есть отметка Plate Club. Для TikTok впишите просмотры — начислится 1 PLT за просмотр.', 'Open the link and check: public account, Plate Club mentioned. For TikTok type the view count — 1 PLT per view.')}</p>
    <div class="tools-row" style="margin-bottom:12px">${seg}</div>
    <div class="qlist">${d.quests.length ? d.quests.map(row).join('') : `<p class="small">${L('Пусто.', 'Empty.')}</p>`}</div>`;
};
ADMIN_ACTS.aqs = btn => { AD.qs = btn.dataset.s; render(false); };
ADMIN_ACTS.aqok = async btn => {
  const id = btn.dataset.id, views = btn.dataset.k === 'tiktok' ? Number(($('#qv-' + id) || {}).value || 0) : 0;
  if (btn.dataset.k === 'tiktok' && !(views > 0)) return toast(L('Впишите количество просмотров.', 'Enter the view count.'), true);
  busy(btn, true, '…');
  try { const r = await POST(`/api/admin/quests/${id}`, { approve: true, views }); toast(`+${fmt(r.amount)} PLT`); render(false); } catch (e) { toast(e.message, true); busy(btn, false); }
};
ADMIN_ACTS.aqno = btn => {
  openDialog(`<form class="dlg" id="qnForm"><h2 class="h3" id="dlgTitle">${L('Отклонить заявку', 'Reject the request')}</h2><div class="fld"><label for="qnr">${L('Причина — игрок её увидит', 'Reason — the player sees it')}</label><input class="field" id="qnr" maxlength="200" required autofocus></div><p class="err" id="qnerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Отклонить', 'Reject')}</button></div></form>`);
  $('#qnForm').addEventListener('submit', async e => { e.preventDefault(); const b = e.target.querySelector('[type=submit]'); busy(b, true, '…');
    try { await POST(`/api/admin/quests/${btn.dataset.id}`, { approve: false, reason: $('#qnr').value }); dlg.close(); toast(L('Отклонено', 'Rejected')); render(false); } catch (x) { $('#qnerr').hidden = false; $('#qnerr').textContent = x.message; busy(b, false); } });
};
ADMIN_ACTS.urole = btn => {
  const mk = btn.dataset.a === '1';
  openDialog(`<form class="dlg" id="roForm" novalidate><h2 class="h3" id="dlgTitle">${mk ? L('Сделать админом', 'Make admin') : L('Снять админа', 'Remove admin')}: ${esc(btn.dataset.n)}</h2><p class="small" style="margin:0">${mk ? L('Админ видит всех игроков, начисляет PLT и меняет настройки. Назначайте только тех, кому доверяете.', 'Admins see all players, grant PLT and change settings. Only appoint people you trust.') : L('Игрок потеряет доступ к панели и выйдет со всех устройств.', 'The player loses panel access and is signed out everywhere.')}</p><div class="fld"><label for="ropw">${L('Ваш пароль для подтверждения', 'Your password to confirm')}</label><input class="field" id="ropw" type="password" autocomplete="current-password" required autofocus></div><p class="err" id="roerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Подтвердить', 'Confirm')}</button></div></form>`);
  $('#roForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await POST(`/api/admin/users/${btn.dataset.id}/role`, { admin: mk, password: $('#ropw').value }); dlg.close(); toast(mk ? L('Назначен админом', 'Now an admin') : L('Админ снят', 'Admin removed')); render(false); } catch (x) { $('#roerr').hidden = false; $('#roerr').textContent = x.message; busy(sb, false); } });
};
ADMIN_ACTS.ublock = async btn => {
  const block = btn.dataset.b === '1';
  if (!block) { try { await POST(`/api/admin/users/${btn.dataset.id}/block`, { block: false }); toast(L('Разблокирован', 'Unblocked')); render(false); } catch (e) { toast(e.message, true); } return; }
  openDialog(`<form class="dlg" id="blForm" novalidate><h2 class="h3" id="dlgTitle">${L('Заблокировать игрока', 'Block player')}</h2><p class="small" style="margin:0">${L('Игрок выйдет из аккаунта, его объявления снимутся с рынка.', 'The player is signed out and their listings are removed.')}</p><div class="fld"><label for="blr">${L('Причина', 'Reason')}</label><input class="field" id="blr" maxlength="200" required autofocus></div><p class="err" id="blerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Заблокировать', 'Block')}</button></div></form>`);
  $('#blForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await POST(`/api/admin/users/${btn.dataset.id}/block`, { block: true, reason: $('#blr').value }); dlg.close(); toast(L('Заблокирован', 'Blocked')); render(false); } catch (x) { $('#blerr').hidden = false; $('#blerr').textContent = x.message; busy(sb, false); } });
};
ADMIN_ACTS.ptoggle = async btn => { try { const r = await POST(`/api/admin/promos/${encodeURIComponent(btn.dataset.c)}/toggle`); toast(r.active ? L('Промокод включён', 'Promo enabled') : L('Промокод выключен', 'Promo disabled')); render(false); } catch (e) { toast(e.message, true); } };
ADMIN_ACTS.astatus = btn => { AD.status = btn.dataset.s; render(false); };
ADMIN_ACTS.aremove = btn => {
  openDialog(`<form class="dlg" id="remForm" novalidate><h2 class="h3" id="dlgTitle">${L('Снять объявление', 'Remove listing')} ${btn.dataset.id}</h2><div class="fld"><label for="rreason">${L('Причина', 'Reason')}</label><input class="field" id="rreason" maxlength="200" required autofocus></div><p class="err" id="rerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Снять', 'Remove')}</button></div></form>`);
  $('#remForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await POST(`/api/admin/listings/${btn.dataset.id}/remove`, { reason: $('#rreason').value.trim() }); dlg.close(); toast('OK'); render(false); } catch (x) { $('#rerr').hidden = false; $('#rerr').textContent = x.message; busy(sb, false); } });
};


/* ---------- roulette: a readable Standoff-style strip that slows down and stops on the server's plate ---------- */
// decorative strip cards follow the same pattern rules as the server, so a "rare" card looks rare
const VPATS = { common: ['random'], fine: ['seq', 'pair'], rare: ['mirror', 'round'], elite: ['triple', 'zero', 'letters'], grail: ['full', 'zerofull'] };
function vDigits(k, n) {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); const d = ri(1, 9); let e; do e = ri(0, 9); while (e === d);
  if (k === 'triple' || k === 'full') return String(d).repeat(n);
  if (k === 'zero' || k === 'zerofull') return '0'.repeat(n - 1) + d;
  if (k === 'mirror') return n === 3 ? `${d}${e}${d}` : `${d}${e}${e}${d}`;
  if (k === 'round') return d + '0'.repeat(n - 1);
  if (k === 'seq') { const s = ri(1, 10 - n); return Array.from({ length: n }, (_, i) => s + i).join(''); }
  if (k === 'pair') return n === 3 ? `${d}${d}${e}` : `${d}${d}${e}${e}`;
  let x; do x = String(ri(1, n === 3 ? 999 : 9999)).padStart(n, '0'); while (/^(\d)\1+$/.test(x)); return x;
}
function visualPlate(c) {
  const x = Math.random() * c.odds.reduce((a, b) => a + b, 0); let acc = 0, i = 0; for (; i < c.odds.length; i++) { acc += c.odds[i]; if (x < acc) break; }
  const tier = CFG.tiers[Math.min(i, 4)].id; const by = c.pool.BY.length && (!c.pool.RU.length || Math.random() < 0.5);
  const pick = s => s[Math.floor(Math.random() * s.length)];
  const pat = (c.focus && c.focus[tier]) || pick(VPATS[tier]); const same = ['letters', 'full', 'zerofull'].includes(pat);
  const L2 = by ? CFG.byLetters : CFG.letters, n = by ? 2 : 3; const l0 = pick(L2);
  const letters = same ? l0.repeat(n) : Array.from({ length: n }, () => pick(L2)).join('');
  return { country: by ? 'BY' : 'RU', letters, digits: vDigits(pat === 'letters' ? 'random' : pat, by ? 4 : 3), region: pick(by ? c.pool.BY : c.pool.RU), tier, pattern: pat };
}
const cardHtml = (p, win) => `<div class="card t-${p.tier}"${win ? ' id="win"' : ''} aria-hidden="true">${Plate(p)}${Rarity(p.tier)}</div>`;
function bezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx, cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => { let t = x; for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; } return sy(Math.min(1, Math.max(0, t))); };
}
// gentle start, long smooth deceleration — about 10 cards per second at the top speed
const EASE = bezier(0.3, 0.55, 0.12, 1);
let rollState = null;
function rollAbort() { if (rollState) { cancelAnimationFrame(rollState.raf); rollState = null; } }
function roll(root, c, plate) {
  return new Promise(res => {
    const spin = root.querySelector('.spin'), box = spin.querySelector('.spin-in'), track = spin.querySelector('.track'); const N = 48, WIN = 40;
    spin.classList.remove('done'); spin.style.removeProperty('--tc');
    track.style.transform = 'translate3d(0,0,0)';
    track.innerHTML = Array.from({ length: N }, (_, i) => cardHtml(i === WIN ? plate : visualPlate(c), i === WIN)).join('');
    const W = track.children[0].getBoundingClientRect().width + 10, center = box.clientWidth / 2;
    const target = WIN * W + (W - 10) / 2 - center + (Math.random() - 0.5) * (W - 36) * 0.8;
    const over = Math.min(14, W * 0.08);
    const D = reduced() ? 0 : 7600, SETTLE = 520; const t0 = performance.now();
    let lastIdx = -1, lastX = 0, skipFrom = null;
    const setX = x => { track.style.transform = `translate3d(${-x}px,0,0)`; };
    const done = () => { if (!rollState) return; rollState = null; setX(target); res(); };
    const frame = now => {
      if (!rollState) return; let x;
      if (skipFrom) { const k = Math.min(1, (now - skipFrom.t) / 300); x = skipFrom.x + (target - skipFrom.x) * (1 - Math.pow(1 - k, 3)); if (k >= 1) return done(); }
      else { const el = now - t0; if (el < D) x = (target + over) * EASE(el / D); else if (el < D + SETTLE) { const k = (el - D) / SETTLE; x = target + over * Math.pow(1 - k, 3); } else return done(); }
      setX(x);
      const v = Math.abs(x - lastX);
      const idx = Math.floor((x + center) / W); if (idx !== lastIdx) { if (lastIdx >= 0) sfx('tick', Math.min(1, v / 30)); lastIdx = idx; }
      lastX = x; rollState.raf = requestAnimationFrame(frame);
    };
    rollState = { raf: 0, skip: () => { if (!skipFrom) skipFrom = { t: performance.now(), x: lastX }; } };
    if (!D) { setX(target); rollState = null; return setTimeout(res, 30); }
    rollState.raf = requestAnimationFrame(frame);
  });
}
const PARTS = { common: 0, fine: 14, rare: 28, elite: 44, grail: 70 };
function celebrate(root, p) {
  const spin = root.querySelector('.spin'); const col = getComputedStyle(document.documentElement).getPropertyValue('--c-' + p.tier).trim();
  spin.style.setProperty('--tc', col); spin.classList.add('done'); root.querySelector('#win')?.classList.add('win'); sfx(p.tier);
  if (reduced()) return;
  const n = PARTS[p.tier]; const box = spin.querySelector('.spin-in');
  for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = 'particle'; const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 260; s.style.setProperty('--dx', Math.cos(a) * r + 'px'); s.style.setProperty('--dy', Math.sin(a) * r * 0.6 + 'px'); s.style.setProperty('--rot', Math.random() * 720 + 'deg'); s.style.background = i % 3 ? col : '#fff'; box.appendChild(s); setTimeout(() => s.remove(), 1300); }
}

/* ---------- opening stage: the case spins in 3D, bursts open, then the strip rolls ---------- */
let STAGE = null;
function closeStage(instant) {
  if (!STAGE) return; const el = STAGE.el; STAGE.dead = true; cancelAnimationFrame(STAGE.raf); rollAbort(); STAGE = null;
  if (instant) el.remove(); else { el.classList.add('out'); setTimeout(() => el.remove(), 320); }
  document.body.style.overflow = '';
}
function openStage(c) {
  closeStage(true);
  const face = cls => `<div class="f ${cls}">${cls === 'fr' || cls === 'bk' ? `<span class="seam"></span><span class="lt l"></span><span class="lt r"></span><span class="emb">${IC.star}</span>` : ''}</div>`;
  const el = document.createElement('div'); el.id = 'stage'; el.style.setProperty('--c', c.color); el.style.setProperty('--c2', c.color2); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', L('Открытие кейса ', 'Opening case ') + caseName(c));
  el.innerHTML = `<div class="st-rays"></div><div class="st-top"><span class="cc-name" style="--c:${c.color}">${esc(caseName(c))}</span><span class="mono small">${fmt(priceOf(c))} PLT</span></div>
    <div class="st-shadow"></div><div class="st-box-wrap"><div class="box3">${['bk', 'lf', 'rt', 'bt', 'fr', 'tp'].map(face).join('')}<span class="hd"></span><span class="beam"></span></div></div>
    <div class="st-flash"></div>
    <div class="st-roll"><section class="spin"><div class="spin-in"><div class="track"></div><div class="marker"></div><div class="spin-flash"></div></div></section></div>
    <div class="st-res" aria-live="polite"></div><button class="st-skip" data-act="stskip">${L('Пропустить анимацию', 'Skip animation')}</button>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  STAGE = { el, c, raf: 0, dead: false, skipped: false };
  return STAGE;
}
function spinCase(st, ready, min = 1500) {
  return new Promise(res => {
    const box = st.el.querySelector('.box3'); let ang = 0, last = performance.now(), t0 = last, isReady = false, lastQ = 0;
    ready.then(() => { isReady = true; });
    if (reduced()) { ready.then(res); return; }
    sfx('whoosh'); st.el.classList.add('charge');
    const frame = now => {
      if (st.dead) return res();
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const el = now - t0;
      const k = Math.min(1, el / min); const vel = 60 + 1100 * k * k; ang += vel * dt;
      box.style.transform = `rotateX(${-16 + Math.sin(el / 45) * k * 4}deg) rotateY(${ang}deg) scale(${1 + k * 0.1})`;
      const q = Math.floor(ang / 90); if (q !== lastQ) { lastQ = q; sfx('tick', Math.min(1, vel / 1100)); }
      if ((el >= min && isReady) || st.skipped) {
        const end = Math.ceil(ang / 360) * 360; const from = ang, t1 = now;
        const settle = n2 => { if (st.dead) return res(); const kk = Math.min(1, (n2 - t1) / 360); const a = from + (end - from) * (1 - Math.pow(1 - kk, 3)); box.style.transform = `rotateX(-12deg) rotateY(${a}deg) scale(1.1)`; if (kk < 1) st.raf = requestAnimationFrame(settle); else res(); };
        st.raf = requestAnimationFrame(settle); return;
      }
      st.raf = requestAnimationFrame(frame);
    };
    st.raf = requestAnimationFrame(frame);
  });
}
async function burstCase(st) {
  const box = st.el.querySelector('.box3'); box.classList.add('shake'); await wait(reduced() ? 0 : 240); box.classList.remove('shake');
  box.classList.add('open'); sfx('boom'); st.el.querySelector('.st-flash').classList.add('go');
  await wait(reduced() ? 0 : 480); if (!st.dead) st.el.classList.add('rolling');
  await wait(reduced() ? 0 : 420);
}
function resultHtml(c, p) {
  const word = tierName(p.tier); const canMore = ME && ME.balance >= priceOf(c);
  return `<div class="result t-${p.tier}"><p class="eyebrow">${esc(caseName(c))} · <span class="iri-t">${p.id}</span></p>${Plate(p, { holo: true })}<p class="tier" aria-label="${esc(word)}">${[...word].map((ch, i) => `<span style="--i:${i}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</p>
    <div class="pc-tags" style="justify-content:center">${Perks(p)}${Copy(p)}</div>
    <dl class="kv"><dt>${L('Номер', 'Plate')}</dt><dd>${esc(plateStr(p))}</dd><dt>${L('Регион', 'Region')}</dt><dd>${esc(regionLabel(p))}</dd><dt>${L('Оценка', 'Value')}</dt><dd>${fmt(p.value)} PLT</dd></dl>
    <div class="row" style="justify-content:center"><button class="btn btn-chrome btn-lg" data-act="stclose" autofocus>${L('Забрать', 'Collect')}</button>${canMore ? `<button class="btn btn-glass btn-lg" data-act="open" data-case="${c.id}">${L('Ещё раз', 'Again')} · ${fmt(priceOf(c))}</button>` : ''}</div>
    <div class="row" style="justify-content:center"><a class="btn btn-sm btn-ghost" href="#/upgrade?p=${p.id}">${L('Апгрейд', 'Upgrade')}</a><button class="btn btn-sm btn-ghost" data-act="listdlg" data-id="${p.id}">${L('На рынок', 'Sell')}</button><button class="btn btn-sm btn-ghost" data-act="bank" data-id="${p.id}" data-v="${p.value}" data-s="${esc(plateStr(p))}" data-after="stage">${L('Банку за', 'Bank for')} ${fmt(p.value * CFG.bankRate)}</button></div></div>`;
}


/* ================= games: hub, case battle, collections, swaps, auction of the day ================= */
const GA = {};
const RU_PLURAL = (n, f) => pl(n, f, [f[0], f[2]]);
const miniPlateTxt = p => (p.country === 'BY' ? `${p.digits} ${p.letters}-${p.region}` : `${p.letters[0]}${p.digits}${p.letters.slice(1)} ${p.region}`);
const timerHtml = (id, ends) => `<div class="timer" id="${id}" data-t="${ends}" role="timer"><span>00</span><i>:</i><span>00</span><i>:</i><span>00</span></div>`;

/* ---------- hub ---------- */
VIEWS.games = async () => {
  const [b, a, s, sw] = await Promise.all([GET('/api/battles').catch(() => ({ open: [], done: [] })), GET('/api/auction').catch(() => ({ auction: null })), GET('/api/sets').catch(() => ({ sets: [] })), ME ? GET('/api/swaps').catch(() => null) : null]);
  const au = a.auction; const done = s.sets.filter(x => x.claimed).length;
  const pend = sw ? sw.incoming.filter(x => x.status === 'PENDING').length : 0;
  const card = (href, img, eyebrow, title, text, extra, cls = '') => `<a class="gcard rv ${cls}" href="${href}" style="--gimg:url(${IMG('head-' + img + '.jpg')})"><div class="gcard-bg"></div><div class="gcard-in"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="gtext">${text}</p>${extra || ''}</div><span class="gcard-go" aria-hidden="true">→</span></a>`;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игры', 'Games')}</p><h1 class="h1" style="margin-top:12px">${L('Во что сыграем?', 'What shall we play?')}</h1><p class="lede" style="margin-top:10px">${L('Баттлы, аукцион, коллекции и обмены — все игры на одной странице.', 'Battles, auction, collections and swaps — everything in one place.')}</p></div></section>
    <div class="ggrid">
      ${card('#/battles', 5, L('Кейс-баттл', 'Case battle') + (b.open.length ? ` · <span class="live"></span>${b.open.length} ${L('ждут', 'open')}` : ''), L('Кто выбьет дороже?', 'Who pulls the priciest?'), L('2–4 игрока открывают одинаковые кейсы одновременно. Победитель забирает все номера.', '2–4 players open the same cases at once. The winner takes every plate.'), `<div class="gstat"><b>${b.open.length}</b><span>${L('открытых баттлов', 'open battles')}</span></div>`, 'big')}
      ${card('#/auction', 3, L('Аукцион дня', 'Auction of the day'), au ? esc(miniPlateTxt(au.plate)) : L('Номер дня', 'Plate of the day'), au ? L(`${tierName(au.plate.tier)} · оценка ${fmt(au.plate.value)} PLT. Ставка в последние 5 минут продлевает торги.`, `${tierName(au.plate.tier)} · value ${fmt(au.plate.value)} PLT. A bid in the last 5 minutes extends it.`) : L('Каждый день — один редкий номер.', 'One rare plate every day.'), au ? `<div class="gstat"><b>${fmt(au.topBid || au.start)}</b><span>${au.topBid ? L('текущая ставка', 'current bid') : L('стартовая цена', 'starting price')}</span></div>` : '')}
      ${card('#/sets', 1, L('Коллекции', 'Collections'), L(`${CFG.sets.length} сетов`, `${CFG.sets.length} sets`), L('Соберите регионы, узоры и редкие серии — получите PLT и значок в профиль.', 'Collect regions, patterns and rare series to earn PLT and a profile badge.'), `<div class="gstat"><b>${done}/${CFG.sets.length}</b><span>${L('собрано', 'completed')}</span></div>`)}
      ${card('#/swap', 2, L('Обмен', 'Swaps'), L('Меняйтесь номерами', 'Trade plates'), L('Номера плюс доплата в PLT — напрямую с другим игроком, без комиссии.', 'Plates plus PLT, directly with another player, no fee.'), pend ? `<div class="gstat"><b>${pend}</b><span>${L('новых предложений', 'new offers')}</span></div>` : '')}
      ${card('#/upgrade', 6, L('Апгрейд', 'Upgrade'), L('Рискни ради редкости', 'Risk it for rarity'), L('Поставьте номер и попробуйте превратить его в редкий.', 'Stake a plate and try to turn it into a rarer one.'), '')}
      ${card('#/top', 4, L('Рейтинг', 'Ranking'), L('Топ коллекционеров', 'Top collectors'), L('Самые дорогие аккаунты Plate Club.', 'The most valuable Plate Club accounts.'), '')}
    </div><div style="height:80px"></div></div>`;
};

/* ---------- case battle: lobby ---------- */
const BF = { caseId: 'B1', seats: 2, rounds: 1 };
const Seats = (b) => `<div class="bseats">${Array.from({ length: b.seats }, (_, i) => { const p = b.players.find(x => x.seat === i); return p ? `<span class="bava${p.bot ? ' bot' : ''}" title="${esc(p.nickname)}">${esc((p.nickname || '?').replace('Бот ', '')[0].toUpperCase())}</span>` : `<span class="bava free" title="${L('Свободно', 'Free')}">+</span>`; }).join('<i class="bvs">vs</i>')}</div>`;
const BattleRow = (b) => {
  const c = caseById(b.caseId); if (!c) return '';
  const mine = ME && b.players.some(p => p.userId === ME.id);
  const action = b.status === 'OPEN' ? (mine ? `<a class="btn btn-sm btn-ghost" href="#/battle/${b.id}">${L('Открыть', 'Open')}</a>` : `<button class="btn btn-sm btn-chrome" data-act="bjoin" data-id="${b.id}" data-cost="${b.price * b.rounds}">${L('Войти', 'Join')} · ${fmt(b.price * b.rounds)}</button>`) : `<a class="btn btn-sm btn-ghost" href="#/battle/${b.id}">${L('Смотреть', 'Watch')}</a>`;
  const win = b.status === 'DONE' ? b.players.find(p => p.seat === b.winnerSeat) : null;
  return `<div class="brow rv t-${c.rank}" style="--c:${c.color};--c2:${c.color2}"><a class="brow-case" href="#/battle/${b.id}"><span class="bglyph">${glyph(c)}</span><span><b>${esc(caseName(c))}</b><span class="small">${b.rounds} × ${fmt(b.price)} PLT · ${b.seats} ${L('игрока', 'players')}</span></span></a>
    ${Seats(b)}<div class="brow-pot"><span class="small">${win ? L('Победил', 'Winner') : L('Банк', 'Pot')}</span><b>${win ? esc(win.nickname) : fmt(b.price * b.rounds * b.seats)}</b>${win ? `<span class="small">${fmt(b.totalValue)} PLT</span>` : ''}</div>${action}</div>`;
};
VIEWS.battles = async () => {
  const d = await GET('/api/battles');
  const c = CFG.battleCases.find(x => x.id === BF.caseId) || CFG.battleCases[0]; BF.caseId = c.id;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игры', 'Games')} · <span class="live"></span>${d.open.length} ${L('открыто', 'open')}</p><h1 class="h1" style="margin-top:12px">${L('Кейс-баттл', 'Case battle')}</h1><p class="lede" style="margin-top:10px">${L('Все открывают один и тот же кейс одновременно. У кого сумма выпавших номеров больше — забирает все номера себе.', 'Everyone opens the same case at once. The highest total takes every plate.')}</p></div></section>
    <div class="bsteps rv"><div><b>1</b><span>${L('Выберите кейс, игроков и раунды', 'Pick a case, players and rounds')}</span></div><div><b>2</b><span>${L('Дождитесь соперников или позовите ботов', 'Wait for rivals or call bots')}</span></div><div><b>3</b><span>${L('Победитель забирает все номера', 'The winner takes every plate')}</span></div></div>
    <section class="bcreate panel" id="bcreate">
      <div class="bc-cases"><h2 class="h3" style="margin-bottom:14px">${L('Кейс для баттла', 'Battle case')}</h2>
        <div class="bc4" role="radiogroup" aria-label="${L('Кейс', 'Case')}">${CFG.battleCases.map((x, i) => `<button class="bc4-case t-${x.rank}${x.id === BF.caseId ? ' on' : ''}" role="radio" aria-checked="${x.id === BF.caseId}" data-act="bfcase" data-id="${x.id}" style="--c:${x.color};--c2:${x.color2}"><span class="bc4-bg"></span><span class="bc4-n">0${i + 1}</span><span class="bglyph lg">${glyph(x)}</span><b>${esc(caseName(x))}</b><span class="small">${esc(caseNote(x))}</span><span class="bc4-p mono">${fmt(x.price)} PLT</span></button>`).join('')}</div></div>
      <div class="bc-side"><div class="bc-sel" style="--c:${c.color};--c2:${c.color2}"><span class="bglyph lg">${glyph(c)}</span><div><p class="eyebrow">${rankName(c.rank)}</p><b>${esc(caseName(c))}</b><span class="small">${fmt(c.price)} PLT ${L('за раунд', 'per round')}</span></div><button class="btn-info-s" data-act="odds" data-case="${c.id}" aria-label="${L('Шансы', 'Odds')}">i</button></div>
        <div class="fld"><span class="lbl">${L('Игроков', 'Players')}</span><div class="seg wide" role="group">${CFG.battle.seats.map(n => `<button data-act="bfset" data-k="seats" data-v="${n}" aria-pressed="${BF.seats === n}">${n === 2 ? '1 vs 1' : n === 3 ? '1 vs 1 vs 1' : '1 × 4'}</button>`).join('')}</div></div>
        <div class="fld"><span class="lbl">${L('Раундов', 'Rounds')}</span><div class="seg wide" role="group">${[1, 2, 3, 4, 5].map(n => `<button data-act="bfset" data-k="rounds" data-v="${n}" aria-pressed="${BF.rounds === n}">${n}</button>`).join('')}</div></div>
        <dl class="kv"><dt>${L('Ваш вход', 'Your entry')}</dt><dd>${fmt(c.price * BF.rounds)} PLT</dd><dt>${L('Банк баттла', 'Battle pot')}</dt><dd>${fmt(c.price * BF.rounds * BF.seats)} PLT</dd><dt>${L('Номеров на кону', 'Plates at stake')}</dt><dd>${BF.rounds * BF.seats}</dd></dl>
        ${ME ? `<button class="btn btn-chrome btn-lg" data-act="bcreate" ${ME.balance < c.price * BF.rounds ? 'disabled' : ''}>${L('Создать баттл', 'Create battle')}</button>${ME.balance < c.price * BF.rounds ? `<span class="small">${L('Не хватает PLT.', 'Not enough PLT.')} <a class="btn-text" href="#/wallet">${L('Пополнить', 'Top up')}</a></span>` : ''}` : `<a class="btn btn-chrome btn-lg" href="#/login?next=%23%2Fbattles">${L('Войти, чтобы играть', 'Sign in to play')}</a>`}</div>
    </section>
    <section class="sec">${SH(L('Ждут соперников', 'Waiting for rivals'), L('Нажмите «Войти», чтобы занять свободное место. Баттл стартует, когда места закончатся.', 'Press Join to take a free seat. The battle starts when all seats are taken.'))}
      ${d.open.length ? `<div class="blist">${d.open.map(BattleRow).join('')}</div>` : Empty(L('Пока никого', 'Nobody yet'), L('Создайте первый баттл — соперники или боты подтянутся.', 'Create the first battle — rivals or bots will join.'))}</section>
    ${d.done.length ? `<section class="sec" style="padding-bottom:80px">${SH(L('Последние битвы', 'Recent battles'))}<div class="blist">${d.done.map(BattleRow).join('')}</div></section>` : '<div style="height:80px"></div>'}</div>`;
};

/* ---------- case battle: arena ---------- */
let BT_PLAY = null, btPoll = null, btSkip = false;
VIEWS.battle = async ({ arg }) => {
  const d = await GET('/api/battles/' + encodeURIComponent(arg)); const b = d.battle; const c = caseById(b.caseId) || { id: b.caseId, ru: b.caseId, name: b.caseId, color: '#8fd3ff', color2: '#1b3a8a', rank: 'common' };
  const me = ME && b.players.find(p => p.userId === ME.id); const creator = ME && b.creator === ME.nickname;
  const animate = b.status === 'DONE' && BT_PLAY === b.id; if (animate) BT_PLAY = null;
  const cols = Array.from({ length: b.seats }, (_, i) => {
    const p = b.players.find(x => x.seat === i); const won = b.status === 'DONE' && b.winnerSeat === i;
    const drops = d.drops.filter(x => x.seat === i);
    return `<div class="bcol${won && !animate ? ' win' : ''}${p ? '' : ' wait'}" data-seat="${i}">
      <div class="bcol-h">${p ? `<span class="bava lg${p.bot ? ' bot' : ''}">${esc((p.nickname || '?').replace('Бот ', '')[0].toUpperCase())}</span><div class="bname"><b>${esc(p.bot ? p.nickname.replace(/^Бот /, '') : p.nickname)}</b><span class="small">${p.bot ? L('бот', 'bot') : me && me.seat === i ? L('это вы', 'you') : L('игрок', 'player')}</span></div>` : `<span class="bava lg free">?</span><div class="bname"><b>${L('Свободно', 'Free seat')}</b><span class="small">${L('ждём игрока…', 'waiting…')}</span></div>`}<span class="crown" aria-hidden="true">${IC.crown}</span></div>
      <div class="btotal"><span class="mono" data-total="${p ? p.total : 0}">${animate ? '0' : fmt(p ? p.total : 0)}</span><small>PLT</small></div>
      <div class="breel" aria-hidden="true"><div class="breel-in">${b.status === 'DONE' && !animate && drops.length ? cardHtml(drops[drops.length - 1].plate) : `<div class="breel-idle">${p ? (b.status === 'OPEN' ? L('готов', 'ready') : '') : '…'}</div>`}</div><span class="breel-mark l"></span><span class="breel-mark r"></span></div>
      <div class="bdrops">${animate ? '' : drops.map(x => `<a class="bdrop t-${x.plate.tier}" href="#/plate/${x.plate.id}">${Plate(x.plate, { iri: false })}<span class="mono">${fmt(x.value)}</span></a>`).join('')}</div></div>`;
  }).join('');
  const winner = b.status === 'DONE' ? b.players.find(p => p.seat === b.winnerSeat) : null;
  const res = winner ? `<div class="bresult${animate ? ' hide' : ''}" id="bres"><p class="eyebrow">${L('Итог', 'Result')}</p><h2 class="h2">${ME && winner.userId === ME.id ? L('Вы победили!', 'You won!') : esc(winner.nickname) + ' ' + L('побеждает', 'wins')}</h2><p class="lede">${L(`Забирает ${d.drops.length} номеров на ${fmt(b.totalValue)} PLT`, `Takes ${d.drops.length} plates worth ${fmt(b.totalValue)} PLT`)}</p><div class="row" style="justify-content:center">${ME ? `<button class="btn btn-chrome" data-act="bagain" data-case="${b.caseId}" data-seats="${b.seats}" data-rounds="${b.rounds}">${L('Ещё раз так же', 'Same again')}</button>` : ''}<a class="btn btn-ghost" href="#/battles">${L('Все баттлы', 'All battles')}</a>${!animate ? `<button class="btn btn-ghost" data-act="breplay" data-id="${b.id}">${L('Повтор', 'Replay')}</button>` : ''}</div></div>` : '';
  const ctrl = b.status === 'OPEN' ? `<div class="bctrl">${!me && ME ? `<button class="btn btn-chrome btn-lg" data-act="bjoin" data-id="${b.id}" data-cost="${b.price * b.rounds}">${L('Войти в баттл', 'Join battle')} · ${fmt(b.price * b.rounds)} PLT</button>` : ''}${!ME ? `<a class="btn btn-chrome btn-lg" href="#/login?next=${encodeURIComponent('#/battle/' + b.id)}">${L('Войти, чтобы играть', 'Sign in to play')}</a>` : ''}${creator ? `<button class="btn btn-chrome btn-lg" data-act="bbots" data-id="${b.id}">${L('Позвать ботов и начать', 'Call bots and start')}</button><button class="btn btn-ghost" data-act="bcancel" data-id="${b.id}">${L('Отменить и вернуть PLT', 'Cancel and refund')}</button>` : ''}<span class="small">${L('Отправьте ссылку на эту страницу другу — он сможет занять место.', 'Send this page’s link to a friend — they can take a seat.')}</span></div>` : '';
  return `<div class="wrap"><a class="back" href="#/battles">← ${L('Все баттлы', 'All battles')}</a>
    <section class="arena" id="arena" data-id="${b.id}" data-status="${b.status}" data-anim="${animate ? 1 : 0}" style="--c:${c.color};--c2:${c.color2};--n:${b.seats}">
      <div class="arena-top"><div class="row" style="gap:14px"><span class="bglyph lg">${glyph(c)}</span><div><p class="eyebrow">${L('Кейс-баттл', 'Case battle')} · ${b.id}</p><h1 class="h2" style="margin-top:4px">${esc(caseName(c))}</h1><p class="small" style="margin:2px 0 0">${b.rounds} ${L('раунд(а)', 'round(s)')} · ${L('вход', 'entry')} ${fmt(b.price * b.rounds)} PLT · ${L('банк', 'pot')} ${fmt(b.price * b.rounds * b.seats)} PLT</p></div></div>
        <div class="rounds" id="brounds">${Array.from({ length: b.rounds }, (_, i) => `<i class="${b.status === 'DONE' && !animate ? 'on' : ''}">${i + 1}</i>`).join('')}</div></div>
      <div class="bcols">${cols}</div>
      ${animate ? `<div class="row" style="justify-content:center;margin-top:18px"><button class="btn btn-sm btn-ghost" data-act="bskip">${L('Пропустить анимацию', 'Skip animation')}</button></div>` : ''}
      ${res}${ctrl}</section>
    <div style="height:70px"></div></div>`;
};
async function battleHooks() {
  clearInterval(btPoll); const ar = $('#arena'); if (!ar) return;
  if (ar.dataset.status === 'OPEN') { btPoll = setInterval(async () => { if (!document.body.contains(ar)) return clearInterval(btPoll); try { const d = await GET('/api/battles/' + ar.dataset.id); if (d.battle.status !== 'OPEN' || d.battle.players.length !== ar.querySelectorAll('.bcol:not(.wait)').length) { clearInterval(btPoll); if (d.battle.status === 'DONE') BT_PLAY = d.battle.id; render(false); } } catch {} }, 2500); return; }
  if (ar.dataset.anim === '1') playBattle(ar);
}
async function playBattle(ar) {
  const id = ar.dataset.id; let d; try { d = await GET('/api/battles/' + id); } catch { return; }
  const b = d.battle; const c = caseById(b.caseId); btSkip = reduced();
  const totals = Array(b.seats).fill(0); const dots = $$('#brounds i');
  const wait = ms => new Promise(r => setTimeout(r, btSkip ? 0 : ms));
  for (let r = 1; r <= b.rounds; r++) {
    if (!document.body.contains(ar)) return;
    dots.forEach((x, i) => x.classList.toggle('cur', i === r - 1));
    const round = d.drops.filter(x => x.round === r);
    const D = btSkip ? 0 : 3200;
    await Promise.all(round.map((x, k) => spinReel(ar.querySelector(`.bcol[data-seat="${x.seat}"] .breel-in`), c, x.plate, D, k * 140)));
    const best = Math.max(...round.map(x => x.value));
    for (const x of round) {
      const col = ar.querySelector(`.bcol[data-seat="${x.seat}"]`); if (!col) return;
      const t = col.querySelector('[data-total]'); rollNum(t, totals[x.seat], totals[x.seat] + x.value); totals[x.seat] += x.value;
      col.querySelector('.bdrops').insertAdjacentHTML('beforeend', `<a class="bdrop t-${x.plate.tier} pop" href="#/plate/${x.plate.id}">${Plate(x.plate, { iri: false })}<span class="mono">${fmt(x.value)}</span></a>`);
      if (x.value === best && !btSkip) { col.classList.add('flash'); setTimeout(() => col.classList.remove('flash'), 900); }
      if (['elite', 'grail'].includes(x.plate.tier) && !btSkip) sfx('grail'); else if (x.plate.tier === 'rare' && !btSkip) sfx('confirm');
    }
    dots[r - 1] && dots[r - 1].classList.add('on');
    await wait(r < b.rounds ? 1100 : 500);
  }
  dots.forEach(x => x.classList.remove('cur'));
  const wcol = ar.querySelector(`.bcol[data-seat="${b.winnerSeat}"]`); if (wcol) { wcol.classList.add('win'); confetti(wcol, b.players.find(p => p.seat === b.winnerSeat).userId === (ME && ME.id) ? 70 : 30); }
  ar.querySelectorAll('[data-total]').forEach(el => { el.textContent = fmt(Number(el.dataset.total)); });
  const res = $('#bres'); if (res) res.classList.remove('hide');
  const skipBtn = ar.querySelector('[data-act="bskip"]'); if (skipBtn) skipBtn.parentElement.remove();
  if (ME && b.players.some(p => p.userId === ME.id)) { sfx(b.players.find(p => p.seat === b.winnerSeat).userId === ME.id ? 'grail' : 'click'); await refreshMe(); chrome(); }
}
function spinReel(box, c, plate, D, delay) {
  return new Promise(res => {
    if (!box) return res();
    const N = 26, WIN = 22; box.style.transition = 'none'; box.style.transform = 'translate3d(0,0,0)';
    box.innerHTML = Array.from({ length: N }, (_, i) => cardHtml(i === WIN ? plate : visualPlate(c), false)).join('');
    const H = box.children[0].getBoundingClientRect().height + 8; const view = box.parentElement.clientHeight;
    const target = WIN * H - (view - (H - 8)) / 2 + (Math.random() - 0.5) * (H * 0.35);
    if (!D) { box.style.transform = `translate3d(0,${-(WIN * H - (view - (H - 8)) / 2)}px,0)`; return res(); }
    setTimeout(() => {
      void box.offsetHeight; box.style.transition = `transform ${D}ms cubic-bezier(.15,.65,.12,1)`; box.style.transform = `translate3d(0,${-target}px,0)`;
      let last = -1; const t0 = performance.now();
      const tick = () => { const el = performance.now() - t0; if (el > D || btSkip) return; const m = new DOMMatrixReadOnly(getComputedStyle(box).transform); const idx = Math.floor(-m.m42 / H); if (idx !== last) { if (last >= 0 && delay === 0) sfx('tick', 0.6); last = idx; } requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      const fin = () => { box.style.transition = `transform 380ms cubic-bezier(.3,.7,.2,1)`; box.style.transform = `translate3d(0,${-(WIN * H - (view - (H - 8)) / 2)}px,0)`; box.children[WIN] && box.children[WIN].classList.add('hit'); setTimeout(res, 380); };
      const check = setInterval(() => { if (btSkip) { clearInterval(check); box.style.transition = 'none'; fin(); } }, 60);
      setTimeout(() => { clearInterval(check); if (!btSkip) fin(); }, D + 20);
    }, delay);
  });
}
GA.bfcase = btn => { BF.caseId = btn.dataset.id; const y = window.scrollY; render(false).then(() => window.scrollTo(0, y)); };
GA.bfset = btn => { BF[btn.dataset.k] = Number(btn.dataset.v); const y = window.scrollY; render(false).then(() => window.scrollTo(0, y)); };
GA.bcreate = async btn => {
  const c = caseById(BF.caseId); busy(btn, true, '…');
  try { const r = await POST('/api/battles', { caseId: BF.caseId, seats: BF.seats, rounds: BF.rounds }, { key: 'bt-' + Date.now() }); sfx('confirm'); await refreshMe(); toast(L(`Баттл создан · −${fmt(c.price * BF.rounds)} PLT`, `Battle created · −${fmt(c.price * BF.rounds)} PLT`)); go('#/battle/' + r.id); }
  catch (e) { toast(e.message, true); busy(btn, false); }
};
GA.bagain = btn => { Object.assign(BF, { caseId: btn.dataset.case, seats: Number(btn.dataset.seats), rounds: Number(btn.dataset.rounds) }); go('#/battles'); setTimeout(() => { const b = $('#bcreate'); b && b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 400); };
GA.bjoin = async btn => {
  if (!ME) return go('#/login?next=' + encodeURIComponent(location.hash));
  const ok = await confirmDialog({ title: L('Войти в баттл', 'Join the battle'), rows: [[L('Вход', 'Entry'), fmt(Number(btn.dataset.cost)) + ' PLT', 1]], ok: L('Играть', 'Play') }); if (!ok) return;
  busy(btn, true, '…');
  try { await POST(`/api/battles/${btn.dataset.id}/join`, {}, { key: 'bj-' + btn.dataset.id + '-' + Date.now() }); await refreshMe(); chrome(); const d = await GET('/api/battles/' + btn.dataset.id); if (d.battle.status === 'DONE') BT_PLAY = d.battle.id; go('#/battle/' + btn.dataset.id); }
  catch (e) { toast(e.message, true); busy(btn, false); }
};
GA.bbots = async btn => { busy(btn, true, '…'); try { await POST(`/api/battles/${btn.dataset.id}/bots`, {}); BT_PLAY = btn.dataset.id; sfx('confirm'); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
GA.bcancel = async btn => { const ok = await confirmDialog({ title: L('Отменить баттл?', 'Cancel the battle?'), lede: L('Все участники получат PLT обратно.', 'Everyone gets their PLT back.'), ok: L('Отменить', 'Cancel'), danger: true }); if (!ok) return; try { await POST(`/api/battles/${btn.dataset.id}/cancel`, {}); await refreshMe(); toast(L('Баттл отменён, PLT возвращены', 'Battle cancelled, PLT refunded')); go('#/battles'); } catch (e) { toast(e.message, true); } };
GA.bskip = () => { btSkip = true; };
GA.breplay = btn => { BT_PLAY = btn.dataset.id; render(false); };

/* ---------- collections ---------- */
const SF = { f: 'all' };
VIEWS.sets = async () => {
  const d = await GET('/api/sets'); const S = Object.fromEntries(d.sets.map(s => [s.id, s]));
  let list = CFG.sets.map(s => ({ ...s, ...S[s.id] }));
  if (SF.f === 'near') list = list.filter(s => !s.claimed && s.have > 0); else if (SF.f === 'done') list = list.filter(s => s.claimed);
  list.sort((a, b) => (b.done && !b.claimed) - (a.done && !a.claimed) || a.claimed - b.claimed || b.have / b.need - a.have / a.need);
  const claimed = d.sets.filter(s => s.claimed).length; const earned = CFG.sets.filter(s => S[s.id] && S[s.id].claimed).reduce((a, s) => a + s.reward, 0); const ready = d.sets.filter(s => s.done && !s.claimed).length;
  const F = [['all', L('Все', 'All')], ['near', L('В процессе', 'In progress')], ['done', L('Собранные', 'Completed')]];
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игры', 'Games')}</p><h1 class="h1" style="margin-top:12px">${L('Коллекции', 'Collections')}</h1><p class="lede" style="margin-top:10px">${L('Всего восемь коллекций — и каждую соберут единицы. Закройте все ячейки сета, заберите большую награду и именной значок. Номера остаются у вас.', 'Only eight collections — and only a few will ever complete one. Fill every slot to take a big reward and a badge. You keep the plates.')}</p></div></section>
    <div class="stats s4"><div class="stat rv"><span>${L('Собрано', 'Completed')}</span><b>${claimed} / ${CFG.sets.length}</b></div><div class="stat rv"><span>${L('Можно забрать', 'Ready to claim')}</span><b class="${ready ? 'up' : ''}">${ready}</b></div><div class="stat rv"><span>${L('Получено наград', 'Rewards earned')}</span><b>${fmt(earned)}</b></div><div class="stat rv"><span>${L('Собрали все 8', 'Completed all 8')}</span><b>${L('пока никто', 'nobody yet')}</b></div></div>
    <div class="row" style="margin:22px 0 16px">${F.map(([k, t]) => `<button class="chip" data-act="sff" data-k="${k}" aria-pressed="${SF.f === k}">${t}</button>`).join('')}</div>
    <div class="sgrid">${list.map(SetCard).join('') || `<p class="small">${L('Здесь пока пусто.', 'Nothing here yet.')}</p>`}</div><div style="height:80px"></div></div>`;
};
function SetCard(s) {
  const pct = Math.round(s.have / s.need * 100); const many = s.need > 12;
  const slots = many ? '' : `<div class="sslots">${s.slots.map((sl, i) => { const f = s.filled && s.filled[i]; return f ? `<a class="sslot on t-${f.tier}" href="#/plate/${f.id}" title="${esc(L(sl.ru, sl.en))}"><span class="mono">${esc(miniPlateTxt(f))}</span></a>` : `<span class="sslot">${esc(L(sl.ru, sl.en))}</span>`; }).join('')}</div>`;
  return `<article class="scard rv${s.claimed ? ' claimed' : s.done ? ' ready' : ''}" style="--sc:${s.color}"><div class="scard-h"><span class="sbadge">${esc(s.badge)}</span><div><span class="sdiff" title="${L('Сложность', 'Difficulty')}">${'◆'.repeat(s.reward >= 25000 ? 5 : s.reward >= 15000 ? 4 : s.reward >= 10000 ? 3 : 2)}<i>${'◆'.repeat(5 - (s.reward >= 25000 ? 5 : s.reward >= 15000 ? 4 : s.reward >= 10000 ? 3 : 2))}</i></span><h3>${esc(L(s.ru, s.en))}</h3><span class="small">${s.need} ${pl(s.need, ['номер', 'номера', 'номеров'], ['plate', 'plates'])} · +${fmt(s.reward)} PLT</span></div></div>
    <div class="sprog"><span style="width:${pct}%"></span></div><div class="row" style="justify-content:space-between"><span class="mono small">${s.have} / ${s.need}</span>${s.claimed ? `<span class="tag s-SOLD">${L('Собрано', 'Completed')} ✓</span>` : s.done ? (ME ? `<button class="btn btn-sm btn-chrome" data-act="sclaim" data-id="${s.id}">${L('Забрать', 'Claim')} +${fmt(s.reward)}</button>` : '') : `<span class="small">${pct}%</span>`}</div>${slots}</article>`;
}
GA.sff = btn => { SF.f = btn.dataset.k; render(false); };
GA.sclaim = async btn => { busy(btn, true, '…'); try { const r = await POST(`/api/sets/${btn.dataset.id}/claim`, {}); sfx('coin'); confetti(btn, 40); toast(L(`Коллекция собрана · +${fmt(r.amount)} PLT`, `Collection complete · +${fmt(r.amount)} PLT`)); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };

/* ---------- swaps ---------- */
const SWT = { tab: 'in' };
VIEWS.swap = async ({ arg, query }) => {
  if (arg === 'new') return swapBuilder(query);
  const d = await GET('/api/swaps'); const list = SWT.tab === 'in' ? d.incoming : d.outgoing;
  const pin = d.incoming.filter(x => x.status === 'PENDING').length, pout = d.outgoing.filter(x => x.status === 'PENDING').length;
  return `<div class="wrap"><section class="page-head"><div><p class="eyebrow">${L('Игры', 'Games')}</p><h1 class="h1" style="margin-top:12px">${L('Обмен номерами', 'Plate swaps')}</h1><p class="lede" style="margin-top:10px">${L('Предложите игроку свои номера и доплату в обмен на его номера. Без комиссии, всё сразу при согласии.', 'Offer your plates and PLT for another player’s plates. No fee, everything moves at once on accept.')}</p></div>
    <div class="row"><a class="btn btn-chrome" href="#/swap/new">${IC.swap}${L('Новый обмен', 'New swap')}</a></div></section>
    <div class="seg wide" role="tablist" style="max-width:420px;margin-bottom:18px"><button data-act="swtab" data-t="in" aria-pressed="${SWT.tab === 'in'}">${L('Входящие', 'Incoming')}${pin ? ` <i class="cnt">${pin}</i>` : ''}</button><button data-act="swtab" data-t="out" aria-pressed="${SWT.tab === 'out'}">${L('Исходящие', 'Outgoing')}${pout ? ` <i class="cnt" style="background:#4aa8ff">${pout}</i>` : ''}</button></div>
    ${list.length ? `<div class="swlist">${list.map(x => SwapCard(x, SWT.tab === 'in')).join('')}</div>` : Empty(SWT.tab === 'in' ? L('Предложений нет', 'No offers') : L('Вы ещё ничего не предлагали', 'You have not offered anything'), L('Найдите игрока в рейтинге или на рынке и предложите обмен.', 'Find a player in the ranking or on the market and offer a swap.'), `<a class="btn btn-chrome" href="#/swap/new">${L('Новый обмен', 'New swap')}</a>`)}
    <div style="height:80px"></div></div>`;
};
const ST_SW = () => ({ PENDING: L('Ожидает', 'Pending'), ACCEPTED: L('Принят', 'Accepted'), DECLINED: L('Отклонён', 'Declined'), CANCELLED: L('Отменён', 'Cancelled'), FAILED: L('Не состоялся', 'Failed') });
function SwapCard(x, incoming) {
  // always shown from the viewer's side: what you give / what you get
  const youGive = incoming ? { plates: x.want, plt: x.wantPlt } : { plates: x.give, plt: x.givePlt };
  const youGet = incoming ? { plates: x.give, plt: x.givePlt } : { plates: x.want, plt: x.wantPlt };
  const v = s => s.plates.reduce((a, p) => a + p.value, 0) + s.plt; const diff = v(youGet) - v(youGive);
  const side = (title, s) => `<div class="swside"><p class="eyebrow">${title}</p><div class="swplates">${s.plates.map(p => `<a href="#/plate/${p.id}" class="swp t-${p.tier}">${Plate(p, { iri: false })}<span class="small">${fmt(p.value)}</span></a>`).join('')}${s.plt ? `<span class="swplt">+${fmt(s.plt)} <small>PLT</small></span>` : ''}${!s.plates.length && !s.plt ? '<span class="small">—</span>' : ''}</div><span class="small">${L('Оценка', 'Value')}: ${fmt(v(s))} PLT</span></div>`;
  const st = ST_SW()[x.status];
  return `<article class="swcard rv${x.status === 'PENDING' ? ' pending' : ''}"><div class="swhead"><div class="row" style="gap:10px">${Ava(incoming ? x.from : x.to)}<div><b>${incoming ? L('От ', 'From ') : L('Для ', 'To ')}<a href="#/u/${esc(incoming ? x.from : x.to)}">${esc(incoming ? x.from : x.to)}</a></b><span class="small" style="display:block">${rel(x.created)} · ${x.id}</span></div></div><span class="tag s-${x.status === 'PENDING' ? 'ACTIVE' : x.status === 'ACCEPTED' ? 'SOLD' : 'CANCELLED'}">${st}</span></div>
    ${x.message ? `<p class="swmsg">“${esc(x.message)}”</p>` : ''}
    <div class="swbody">${side(L('Вы отдаёте', 'You give'), youGive)}<span class="swarrow" aria-hidden="true">${IC.swap}</span>${side(L('Вы получаете', 'You get'), youGet)}</div>
    <div class="swfoot"><span class="${diff >= 0 ? 'up' : 'down'} mono">${L('По оценке', 'By value')}: ${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))} PLT</span>${x.note ? `<span class="small">${esc(srv(x.note))}</span>` : ''}
      ${x.status === 'PENDING' ? (incoming ? `<span class="row"><button class="btn btn-sm btn-ghost" data-act="swdo" data-a="decline" data-id="${x.id}">${L('Отклонить', 'Decline')}</button><button class="btn btn-sm btn-chrome" data-act="swdo" data-a="accept" data-id="${x.id}">${L('Принять обмен', 'Accept swap')}</button></span>` : `<button class="btn btn-sm btn-ghost" data-act="swdo" data-a="cancel" data-id="${x.id}">${L('Отозвать', 'Withdraw')}</button>`) : ''}</div></article>`;
}
const SWB = { to: '', give: new Set(), want: new Set(), givePlt: 0, wantPlt: 0 };
async function swapBuilder(query) {
  if (!ME) return VIEWS.login({ next: location.hash, query: new URLSearchParams() });
  const to = (query && query.get('to')) || SWB.to; if (to !== SWB.to) { SWB.to = to; SWB.give = new Set(); SWB.want = new Set(); SWB.givePlt = 0; SWB.wantPlt = 0; }
  const w = query && query.get('want'); if (w) SWB.want.add(w);
  const mine = (await GET('/api/collection')).plates.filter(p => p.status === 'OWNED');
  let theirs = null, err = '';
  if (SWB.to) { try { theirs = await GET('/api/users/' + encodeURIComponent(SWB.to) + '/plates'); } catch (e) { err = e.message; } }
  const rk = theirs ? null : await GET('/api/rankings').catch(() => ({ rankings: [] }));
  const pick = (p, set, side) => `<button class="swpick t-${p.tier}${set.has(p.id) ? ' on' : ''}" data-act="swpick" data-side="${side}" data-id="${p.id}" aria-pressed="${set.has(p.id)}">${Plate(p, { iri: false })}<span class="small">${tierName(p.tier)} · ${fmt(p.value)}</span><i class="chk" aria-hidden="true">✓</i></button>`;
  const vGive = mine.filter(p => SWB.give.has(p.id)).reduce((a, p) => a + p.value, 0) + SWB.givePlt;
  const vGet = theirs ? theirs.plates.filter(p => SWB.want.has(p.id)).reduce((a, p) => a + p.value, 0) + SWB.wantPlt : 0;
  return `<div class="wrap"><a class="back" href="#/swap">← ${L('Мои обмены', 'My swaps')}</a><section class="page-head" style="min-height:0"><div><p class="eyebrow">${L('Обмен', 'Swap')}</p><h1 class="h2" style="margin-top:8px">${L('Новое предложение', 'New offer')}</h1></div></section>
    <form class="panel swto" id="swTo"><label for="swnick">${L('С кем меняемся?', 'Who are you trading with?')}</label><div class="row" style="flex-wrap:nowrap;gap:10px"><input class="field" id="swnick" list="swnicks" value="${esc(SWB.to)}" placeholder="${L('Ник игрока', 'Player nickname')}" autocomplete="off" style="text-transform:none"><datalist id="swnicks">${rk ? rk.rankings.filter(r => r.nickname !== ME.nickname).map(r => `<option value="${esc(r.nickname)}">`).join('') : ''}</datalist><button class="btn btn-chrome" type="submit">${L('Выбрать', 'Select')}</button></div>${err ? `<p class="err">${esc(err)}</p>` : ''}</form>
    ${theirs ? `<div class="swbuild">
      <section class="panel"><div class="row" style="justify-content:space-between"><h2 class="h3">${L('Вы отдаёте', 'You give')}</h2><span class="small">${SWB.give.size}/6</span></div>
        <div class="swpicks">${mine.length ? mine.map(p => pick(p, SWB.give, 'give')).join('') : `<p class="small">${L('У вас нет свободных номеров.', 'You have no free plates.')}</p>`}</div>
        <div class="fld"><label for="swgp">${L('Доплата от вас, PLT', 'Your PLT on top')}</label><input class="field mono" id="swgp" type="number" min="0" value="${SWB.givePlt || ''}" placeholder="0" data-k="givePlt"></div></section>
      <section class="panel"><div class="row" style="justify-content:space-between"><h2 class="h3">${L('Вы получаете от', 'You get from')} ${esc(theirs.nickname)}</h2><span class="small">${SWB.want.size}/6</span></div>
        <div class="swpicks">${theirs.plates.length ? theirs.plates.map(p => pick(p, SWB.want, 'want')).join('') : `<p class="small">${L('У игрока нет свободных номеров — можно предложить купить за PLT позже.', 'This player has no free plates.')}</p>`}</div>
        <div class="fld"><label for="swwp">${L('Доплата от игрока, PLT', 'Their PLT on top')}</label><input class="field mono" id="swwp" type="number" min="0" value="${SWB.wantPlt || ''}" placeholder="0" data-k="wantPlt"></div></section></div>
      <div class="swsum panel"><div class="swsum-v"><span>${L('Отдаёте', 'Give')} <b class="mono">${fmt(vGive)}</b></span><span>${L('Получаете', 'Get')} <b class="mono">${fmt(vGet)}</b></span><span class="${vGet - vGive >= 0 ? 'up' : 'down'}">${L('Разница', 'Difference')} <b class="mono">${vGet - vGive >= 0 ? '+' : '−'}${fmt(Math.abs(vGet - vGive))}</b></span></div>
        <input class="field" id="swmsg" maxlength="200" placeholder="${L('Сообщение (необязательно)', 'Message (optional)')}"><button class="btn btn-chrome btn-lg" data-act="swsend">${L('Отправить предложение', 'Send offer')}</button></div>` : ''}
    <div style="height:80px"></div></div>`;
}
function swapHooks() {
  const f = $('#swTo'); f && f.addEventListener('submit', e => { e.preventDefault(); SWB.to = $('#swnick').value.trim(); go('#/swap/new?to=' + encodeURIComponent(SWB.to)); });
  $$('#swgp,#swwp').forEach(i => i.addEventListener('change', () => { SWB[i.dataset.k] = Math.max(0, Math.round(+i.value || 0)); render(false); }));
}
GA.swtab = btn => { SWT.tab = btn.dataset.t; render(false); };
GA.swpick = btn => { const set = btn.dataset.side === 'give' ? SWB.give : SWB.want; if (set.has(btn.dataset.id)) set.delete(btn.dataset.id); else { if (set.size >= 6) return toast(L('Не больше 6 номеров с каждой стороны.', 'Up to 6 plates per side.'), true); set.add(btn.dataset.id); } const y = window.scrollY; render(false).then(() => window.scrollTo(0, y)); };
GA.swsend = async btn => { busy(btn, true, '…'); try { await POST('/api/swaps', { to: SWB.to, give: [...SWB.give], want: [...SWB.want], givePlt: SWB.givePlt, wantPlt: SWB.wantPlt, message: $('#swmsg').value }); toast(L('Предложение отправлено', 'Offer sent')); SWB.give = new Set(); SWB.want = new Set(); SWB.givePlt = SWB.wantPlt = 0; SWT.tab = 'out'; go('#/swap'); } catch (e) { toast(e.message, true); busy(btn, false); } };
GA.swdo = async btn => {
  const a = btn.dataset.a;
  if (a === 'accept') { const ok = await confirmDialog({ title: L('Принять обмен?', 'Accept the swap?'), lede: L('Номера и PLT переместятся сразу.', 'Plates and PLT move immediately.'), ok: L('Принять', 'Accept') }); if (!ok) return; }
  busy(btn, true, '…');
  try { await POST(`/api/swaps/${btn.dataset.id}/${a}`, {}); if (a === 'accept') { sfx('coin'); toast(L('Обмен состоялся', 'Swap done')); } else toast('OK'); await refreshMe(); chrome(); render(false); }
  catch (e) { toast(e.message, true); render(false); }
};

/* ---------- auction of the day ---------- */
VIEWS.auction = async () => {
  const d = await GET('/api/auction'); const a = d.auction;
  if (!a) return `<div class="wrap" style="padding-block:60px">${Empty(L('Аукцион скоро начнётся', 'The auction starts soon'), L('Новый номер выставляется каждый день в 03:00 по Москве.', 'A new plate is listed every day at 03:00 Moscow time.'))}</div>`;
  const p = a.plate; const quick = [...new Set([a.min, a.min + a.step * 2, Math.max(a.min + a.step * 3, Math.round(a.min * 1.25 / 10) * 10)])].sort((x, y) => x - y);
  return `<div class="wrap"><section class="auc t-${p.tier}">
      <div class="auc-show"><p class="eyebrow">${L('Аукцион дня', 'Auction of the day')} · ${Rarity(p.tier)}</p><div class="auc-plate" id="aucPlate">${Plate(p, { holo: true })}</div>
        <div class="pc-tags" style="justify-content:center">${Perks(p)}${Copy(p)}</div><p class="small" style="text-align:center;margin:0">${esc(regionLabel(p))} · ${L('оценка', 'value')} ${fmt(p.value)} PLT · <a href="#/plate/${p.id}">${p.id}</a></p></div>
      <div class="auc-bid panel"><div class="row" style="justify-content:space-between"><span class="eyebrow">${a.topBid ? L('Текущая ставка', 'Current bid') : L('Стартовая цена', 'Starting price')}</span><span class="small">${a.bids} ${pl(a.bids, ['ставка', 'ставки', 'ставок'], ['bid', 'bids'])}</span></div>
        <p class="auc-price chrome-t">${fmt(a.topBid || a.start)}<small>PLT</small></p>
        <p class="small" style="margin:0">${a.topUser ? (a.mine ? `<b class="up">${L('Вы лидируете', 'You are leading')}</b>` : L('Лидер', 'Leader') + `: <a href="#/u/${esc(a.topUser)}">${esc(a.topUser)}</a>`) : L('Ставок ещё нет — будьте первым.', 'No bids yet — be the first.')}</p>
        <div class="auc-timer"><span class="small">${L('До конца', 'Ends in')}</span>${timerHtml('aucTimer', a.ends)}</div>
        ${ME ? `<form id="bidForm" class="auc-form"><div class="row" style="gap:6px">${quick.map(v => `<button type="button" class="chip" data-act="aquick" data-v="${v}">${fmt(v)}</button>`).join('')}</div><div class="row" style="flex-wrap:nowrap;gap:10px"><input class="field mono" id="bidAmt" type="number" min="${a.min}" step="1" value="${a.min}" aria-label="${L('Ставка', 'Bid')}"><button class="btn btn-chrome btn-lg" type="submit">${L('Сделать ставку', 'Place bid')}</button></div><p class="err" id="biderr" hidden></p></form>` : `<a class="btn btn-chrome btn-lg" href="#/login?next=%23%2Fauction">${L('Войти, чтобы участвовать', 'Sign in to bid')}</a>`}
        <ul class="auc-rules small"><li>${L(`Минимальная ставка — ${fmt(a.min)} PLT, шаг ${fmt(a.step)} PLT.`, `Minimum bid ${fmt(a.min)} PLT, step ${fmt(a.step)} PLT.`)}</li><li>${L('PLT замораживаются при ставке и сразу возвращаются, если вас перебили.', 'PLT are held when you bid and returned at once if you are outbid.')}</li><li>${L('Ставка в последние 5 минут продлевает аукцион на 5 минут.', 'A bid in the last 5 minutes adds 5 minutes.')}</li></ul></div></section>
    <div class="split" style="padding-block:30px 80px"><div class="panel">${SH(L('История ставок', 'Bid history'))}${a.history.length ? a.history.map((h, i) => `<div class="tx"><span class="lbl">${i === 0 ? '👑 ' : ''}${esc(h.nickname)}</span><span class="when">${rel(h.at)}</span><span class="amt">${fmt(h.amount)}</span></div>`).join('') : `<p class="small">${L('Пока пусто.', 'Empty for now.')}</p>`}</div>
      <div class="panel">${SH(L('Прошлые аукционы', 'Past auctions'))}${d.past.length ? d.past.map(x => `<div class="tx"><span class="lbl"><a href="#/plate/${x.plate.id}">${esc(miniPlateTxt(x.plate))}</a> · ${tierName(x.plate.tier)}</span><span class="when">${x.topUser ? esc(x.topUser) : L('без ставок', 'no bids')}</span><span class="amt">${x.topBid ? fmt(x.topBid) : '—'}</span></div>`).join('') : `<p class="small">${L('Это первый аукцион.', 'This is the first auction.')}</p>`}</div></div></div>`;
};
function auctionHooks() {
  const t = $('#aucTimer'); if (t) countdown(t, Number(t.dataset.t), () => setTimeout(() => render(false), 1500));
  const f = $('#bidForm'); f && f.addEventListener('submit', async e => {
    e.preventDefault(); const b = f.querySelector('[type=submit]'); const amt = Math.round(+$('#bidAmt').value);
    const ok = await confirmDialog({ title: L('Сделать ставку', 'Place a bid'), rows: [[L('Ставка', 'Bid'), fmt(amt) + ' PLT', 1]], lede: L('PLT спишутся сейчас и вернутся, если вашу ставку перебьют.', 'PLT are taken now and returned if you are outbid.'), ok: L('Поставить', 'Bid') }); if (!ok) return;
    busy(b, true, '…');
    try { await POST('/api/auction/bid', { amount: amt }, { key: 'au-' + Date.now() }); sfx('coin'); toast(L('Ставка принята — вы лидируете', 'Bid placed — you are leading')); await refreshMe(); chrome(); render(false); }
    catch (x) { $('#biderr').hidden = false; $('#biderr').textContent = x.message; busy(b, false); }
  });
  if ($('.auc')) { clearInterval(btPoll); const day = $('#aucTimer') && $('#aucTimer').dataset.t; btPoll = setInterval(async () => { if (!$('.auc')) return clearInterval(btPoll); if (document.visibilityState !== 'visible' || dlg.open || (document.activeElement && document.activeElement.id === 'bidAmt')) return; try { const d = await GET('/api/auction'); if (d.auction && (String(d.auction.ends) !== day || d.auction.bids !== Number(($('.auc-bid .small') || {}).textContent?.match(/\d+/)?.[0]))) render(false); } catch {} }, 8000); }
}
GA.aquick = btn => { const i = $('#bidAmt'); i.value = btn.dataset.v; i.focus(); };


/* ---------- actions ---------- */
const A = Object.assign({}, ADMIN_ACTS, UA, GA);
A.drawer = () => openDrawer(); A.drawerclose = () => closeDrawer(); A.drawerbg = (el, e) => { if (e.target === el) closeDrawer(); };
A.lang = btn => { const l = btn.dataset.l; if (l === LANG) return; LANG = l; store.set('lang', l); applyPrefs(); sfx('click'); render(false); };
A.ccat = btn => { CF.cat = btn.dataset.k; $$('.cats .chip').forEach(b => b.setAttribute('aria-pressed', b === btn)); $('#cgridBox').innerHTML = casesGrid(); fx($('#cgridBox')); };
let opening = false;
A.open = async btn => {
  if (opening) return; opening = true;
  const c = caseById(btn.dataset.case);
  const st = openStage(c); sfx('open');
  const req = POST(`/api/cases/${c.id}/open`, {}, { key: rid() }).then(r => ({ r }), e => ({ e }));
  try {
    await spinCase(st, req);
    const { r, e } = await req;
    if (e) { closeStage(); toast(e.message, true); return; }
    if (st.dead) return;
    ME.balance = r.balance; ME.stats.opened++; chrome();
    await burstCase(st); if (st.dead) return;
    await roll(st.el, c, r.plate); if (st.dead) return;
    celebrate(st.el, r.plate);
    await wait(reduced() ? 0 : ({ common: 800, fine: 1000, rare: 1300, elite: 1600, grail: 2100 })[r.plate.tier]); if (st.dead) return;
    st.el.querySelector('.st-res').innerHTML = resultHtml(c, r.plate); st.el.classList.add('st-done'); st.el.querySelector('.st-skip').hidden = true;
    st.el.querySelector('.st-res [autofocus]')?.focus();
    if ($('#openAct')) { $('#openAct').innerHTML = openAction(c); if ($('#buybox')) $('#buybox').innerHTML = buyBox(c); }
    refreshMe().then(refreshPerks);
  } finally { opening = false; }
};
A.stskip = () => { if (!STAGE) return; STAGE.skipped = true; rollState && rollState.skip(); };
A.stclose = () => closeStage();
A.dealer = async () => {
  let d; try { d = await GET('/api/dealer'); } catch (e) { return toast(e.message, true); }
  const left = Math.max(0, d.perDay - d.used);
  openDialog(`<div class="dlg"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">${L('Скупщик', 'Dealer')} · ${L('осталось сегодня', 'left today')} ${left}</p><h2 class="h3" id="dlgTitle" style="margin-top:6px">${L('Продать скупщику', 'Sell to the dealer')}</h2></div><button class="btn btn-sm btn-ghost" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div>
    <p class="small" style="margin:0">${L(`Скупщик платит ${Math.round(d.rate * 100)}% оценки — больше, чем банк (${Math.round(CFG.bankRate * 100)}%) и почти всегда больше рынка.`, `The dealer pays ${Math.round(d.rate * 100)}% of value — more than the bank (${Math.round(CFG.bankRate * 100)}%) and usually more than the market.`)}</p>
    <div class="dl-list">${d.plates.length ? d.plates.map(p => `<div class="dl-row">${Plate(p, { iri: false })}<div class="small">${esc(L((d.demands.find(x => x.id === p.demand) || {}).ru || '', (d.demands.find(x => x.id === p.demand) || {}).en || ''))}<br>${L('Оценка', 'Value')} ${fmt(p.value)}${p.paid != null ? ` · ${L('куплен за', 'paid')} ${fmt(p.paid)}` : ''}</div><button class="btn btn-sm btn-chrome" data-act="dsell" data-id="${p.id}" ${left ? '' : 'disabled'}>+${fmt(p.offer)} PLT</button></div>`).join('') : `<p class="small">${L('Подходящих номеров нет. Купите такие на рынке дешевле оценки — и продайте скупщику.', 'No matching plates. Buy some below value on the market and sell them to the dealer.')}</p>`}</div></div>`);
};
A.dsell = async btn => {
  busy(btn, true, '…');
  try { const r = await POST('/api/dealer/sell', { plateId: btn.dataset.id }, { key: 'dl-' + btn.dataset.id + '-' + Date.now() }); sfx('coin'); toast(L(`Продано скупщику · +${fmt(r.amount)} PLT`, `Sold to the dealer · +${fmt(r.amount)} PLT`)); await refreshMe(); chrome(); await A.dealer(); if (parseRoute().name === 'market') render(false); }
  catch (e) { busy(btn, false); toast(e.message, true); }
};
A.bank = async btn => {
  const v = Number(btn.dataset.v), amt = Math.round(v * CFG.bankRate);
  const ok = await confirmDialog({ title: L('Продать банку', 'Sell to the bank'), lede: L(`${esc(btn.dataset.s)} навсегда уйдёт из коллекции.`, `${esc(btn.dataset.s)} leaves your collection for good.`), rows: [[L('Оценка', 'Value'), fmt(v) + ' PLT'], [L('Курс банка', 'Bank rate'), CFG.bankRate * 100 + '%'], [L('Вы получите', 'You get'), '+' + fmt(amt) + ' PLT', 1]], ok: L('Продать за ', 'Sell for ') + fmt(amt), danger: true });
  if (!ok) return;
  try { const r = await POST('/api/plates/' + btn.dataset.id + '/bank'); sfx('coin'); toast(L(`Продано банку · +${fmt(r.amount)} PLT`, `Sold to the bank · +${fmt(r.amount)} PLT`)); await refreshMe(); if (btn.dataset.after === 'stage') { closeStage(); const c = caseById(parseRoute().arg); if (c && $('#openAct')) { $('#openAct').innerHTML = openAction(c); if ($('#buybox')) $('#buybox').innerHTML = buyBox(c); } } else render(false); }
  catch (e) { toast(e.message, true); }
};
A.detail = async btn => {
  if (!ME) return go('#/login?next=' + encodeURIComponent(location.hash));
  const [d] = await Promise.all([GET('/api/plates/' + btn.dataset.id).catch(e => { toast(e.message, true); return null; }), refreshMe()]); if (!d) return;
  const l = d.listing, p = d.plate; if (!l) return toast(L('Этот номер больше не продаётся.', 'This plate is no longer for sale.'), true);
  const can = ME.balance >= l.price;
  openDialog(`<div class="dlg"><div><p class="eyebrow">${L('Объявление', 'Listing')} ${l.id}</p><h2 class="h3" id="dlgTitle" style="margin-top:6px">${L('Покупка', 'Buy')} ${esc(plateStr(p))}</h2></div><div class="dlg-plate">${Plate(p, { holo: true })}</div>
    <dl class="kv"><dt>ID</dt><dd class="iri-t">${p.id}</dd><dt>${L('Редкость', 'Rarity')}</dt><dd>${tierName(p.tier)}</dd><dt>${L('Регион', 'Region')}</dt><dd>${esc(regionLabel(p))}</dd><dt>${L('Продавец', 'Seller')}</dt><dd>${esc(l.seller)}</dd><dt>${L('Оценка', 'Value')}</dt><dd>${fmt(p.value)} PLT</dd>
      <dt class="tot">${L('К оплате', 'To pay')}</dt><dd class="tot">${fmt(l.price)} PLT</dd><dt>${L('Баланс после', 'Balance after')}</dt><dd>${can ? fmt(ME.balance - l.price) + ' PLT' : '—'}</dd></dl>
    ${can ? '' : `<p class="err">${L(`Не хватает ${fmt(l.price - ME.balance)} PLT.`, `${fmt(l.price - ME.balance)} PLT short.`)}</p>`}
    <div class="dlg-acts"><a class="btn btn-ghost" href="#/plate/${p.id}">${L('Сначала проверить', 'Verify first')}</a><button class="btn btn-chrome" data-act="buy" data-id="${l.id}" data-price="${l.price}" ${can ? '' : 'disabled'} autofocus>${L('Купить за', 'Buy for')} ${fmt(l.price)} PLT</button></div></div>`);
};
A.buy = async btn => {
  busy(btn, true, '…');
  try { await POST(`/api/market/listings/${btn.dataset.id}/buy`, { expectedPrice: Number(btn.dataset.price) }, { key: rid() }); sfx('buy'); dlg.close(); toast(L('Покупка подтверждена. Номер в вашей коллекции.', 'Purchase confirmed. The plate is in your collection.')); await refreshMe(); render(false); }
  catch (e) { toast(e.message, true); busy(btn, false); if (e.status === 409) { dlg.close(); if (parseRoute().name === 'market') loadMarket(true); else render(false); } }
};
A.cancel = async btn => { busy(btn, true, '…'); try { await DEL('/api/market/listings/' + btn.dataset.id); toast(L('Объявление снято.', 'Listing cancelled.')); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
const feeRows = v => `<dt>${L('Комиссия', 'Fee')} ${CFG.fee * 100}%</dt><dd>−${fmt(Math.round(v * CFG.fee))} PLT</dd><dt class="tot">${L('Вы получите', 'You get')}</dt><dd class="tot">${fmt(v - Math.round(v * CFG.fee))} PLT</dd>`;
A.editlisting = btn => {
  openDialog(`<form class="dlg" id="editForm" novalidate><h2 class="h3" id="dlgTitle">${L('Новая цена', 'New price')} · ${btn.dataset.id}</h2><div class="fld"><label for="eprice">${L('Цена, PLT', 'Price, PLT')}</label><input class="field mono" id="eprice" type="number" inputmode="numeric" min="1" max="10000000" value="${btn.dataset.price}" required></div><dl class="kv" id="ecalc"></dl><p class="err" id="eerr" hidden></p>
    <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Сохранить', 'Save')}</button></div></form>`);
  const pr = $('#eprice'); const calc = () => { $('#ecalc').innerHTML = feeRows(+pr.value || 0); }; calc(); pr.addEventListener('input', calc);
  $('#editForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await PATCH('/api/market/listings/' + btn.dataset.id, { price: Math.round(+pr.value) }); dlg.close(); toast(L('Цена обновлена.', 'Price updated.')); loadMarket(true); } catch (x) { $('#eerr').hidden = false; $('#eerr').textContent = x.message; busy(sb, false); } });
};
A.dlgclose = () => dlg.close();
A.reload = () => location.reload();
A.refcopy = async btn => { const i = $('#refLink'); try { await navigator.clipboard.writeText(i.value); } catch { i.select(); document.execCommand('copy'); } toast(L('Ссылка скопирована', 'Link copied')); busy(btn, false); };
A.refshare = () => { const i = $('#refLink'); navigator.share({ title: 'PLATE CLUB', text: L('Собирай коллекционные автономера — лови стартовые PLT по моей ссылке.', 'Collect license plates — grab starting PLT with my link.'), url: i.value }).catch(() => {}); };
A.qsend = btn => {
  const kind = btn.dataset.k, story = kind === 'story';
  openDialog(`<form class="dlg" id="qsForm" novalidate><h2 class="h3" id="dlgTitle">${story ? L('Сторис с отметкой сайта', 'Story tagging the site') : L('TikTok с упоминанием', 'TikTok mentioning us')}</h2>
    <p class="small" style="margin:0">${story ? L('Выложите сторис со ссылкой на Plate Club, затем пришлите ссылку на неё или на профиль. Аккаунт должен быть открытым.', 'Post a story linking to Plate Club, then send the link to it or to your profile. Your account must be public.') : L('Пришлите ссылку на ролик. Начислим 1 PLT за просмотр после проверки.', 'Send the link to your video. We pay 1 PLT per view after review.')}</p>
    <div class="fld"><label for="qsHandle">${L('Ваш аккаунт (открытый)', 'Your account (public)')}</label><input class="field" id="qsHandle" maxlength="80" required autofocus placeholder="@nickname"></div>
    <div class="fld"><label for="qsUrl">${L('Ссылка на публикацию', 'Link to the post')}</label><input class="field" id="qsUrl" type="url" maxlength="400" required placeholder="https://…"></div>
    <div class="fld"><label for="qsNote">${L('Комментарий (не обязательно)', 'Comment (optional)')}</label><input class="field" id="qsNote" maxlength="500"></div>
    <p class="err" id="qsErr" hidden></p>
    <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></div></form>`);
  $('#qsForm').addEventListener('submit', async e => { e.preventDefault(); const b = e.target.querySelector('[type=submit]'); busy(b, true, '…');
    try { await POST('/api/quests', { kind, url: $('#qsUrl').value, handle: $('#qsHandle').value, note: $('#qsNote').value }); dlg.close(); toast(L('Отправлено на проверку. PLT придут после подтверждения.', 'Sent for review. PLT arrive once it is confirmed.')); loadQuests(); }
    catch (x) { $('#qsErr').hidden = false; $('#qsErr').textContent = x.message; busy(b, false); } });
};
A.tgjoin = async btn => { window.open(CFG.telegram.url, '_blank', 'noopener'); busy(btn, true, '…'); try { const r = await POST('/api/perks/telegram', {}); await refreshMe(); sfx('coin'); toast(L(`+${r.amount} PLT — спасибо, что с нами!`, `+${r.amount} PLT — thanks for joining!`)); render(false); } catch (x) { toast(x.message, true); busy(btn, false); } };
let installEvt = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
A.install = async () => {
  if (installEvt) { closeDrawer(); installEvt.prompt(); try { await installEvt.userChoice; } catch {} installEvt = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  closeDrawer();
  openDialog(`<div class="dlg"><h2 class="h3" id="dlgTitle">📲 ${L('Plate Club на телефоне', 'Plate Club on your phone')}</h2><p class="small" style="margin:0">${L('Сайт можно поставить на экран «Домой» — он откроется как приложение, на весь экран, без адресной строки.', 'Add the site to your home screen: it opens like an app, full screen, no address bar.')}</p>
    <ol class="steps-ol">${ios ? `<li>${L('Откройте сайт в Safari.', 'Open the site in Safari.')}</li><li>${L('Нажмите «Поделиться» (квадрат со стрелкой вверх).', 'Tap Share (square with an arrow).')}</li><li>${L('Выберите «На экран „Домой“» → «Добавить».', 'Choose “Add to Home Screen” → Add.')}</li>` : `<li>${L('Откройте сайт в Chrome.', 'Open the site in Chrome.')}</li><li>${L('Нажмите ⋮ в правом верхнем углу.', 'Tap ⋮ in the top-right corner.')}</li><li>${L('Выберите «Установить приложение» или «Добавить на гл. экран».', 'Choose “Install app” or “Add to Home screen”.')}</li>`}</ol>
    <div class="dlg-acts"><button class="btn btn-chrome" data-act="dlgclose">${L('Понятно', 'Got it')}</button></div></div>`);
};
A.pwdlg = () => { openDialog(`<form class="dlg" id="pwForm"><h2 class="h3" id="dlgTitle">${L('Смена пароля', 'Change password')}</h2>
  <div class="fld"><label for="pwCur">${L('Текущий пароль', 'Current password')}</label><input class="field" id="pwCur" type="password" autocomplete="current-password" required></div>
  <div class="fld"><label for="pwNew">${L('Новый пароль', 'New password')}</label><input class="field" id="pwNew" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><p class="hint">${L('Минимум 8 символов.', 'At least 8 characters.')}</p></div>
  <p class="err" id="pwErr" hidden></p>
  <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Сохранить', 'Save')}</button></div></form>`);
  const f = $('#pwForm'); f.addEventListener('submit', async e => { e.preventDefault(); const b = f.querySelector('[type=submit]'); busy(b, true, '…');
    try { await POST('/api/auth/password', { current: $('#pwCur').value, password: $('#pwNew').value }); dlg.close(); toast(L('Пароль изменён. Другие устройства вышли из аккаунта.', 'Password changed. Other devices were signed out.')); }
    catch (x) { $('#pwErr').hidden = false; $('#pwErr').textContent = x.message; busy(b, false); } });
};
A.logoutothers = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/auth/logout-others', {}); toast(r.closed ? L(`Завершено сессий: ${r.closed}.`, `Sessions ended: ${r.closed}.`) : L('Других активных сессий нет.', 'No other active sessions.')); } catch (x) { toast(x.message, 'err'); } busy(btn, false); };
A.rkby = btn => { RK.by = btn.dataset.k; render(false); };
A.odds = btn => { const c = caseById(btn.dataset.case); if (c) { sfx('click'); oddsDialog(c); } };
A.daily = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/perks/daily'); coins(btn); sfx('coin'); toast(`+${fmt(r.amount)} PLT`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.lvlclaim = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/perks/level/claim'); coins(btn, 18); sfx('coin'); toast(`+${fmt(r.amount)} PLT · LV ${r.level}`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.achclaim = async btn => { busy(btn, true, '…'); try { const r = await POST(`/api/perks/achievements/${btn.dataset.id}/claim`); coins(btn); sfx('coin'); toast(`+${fmt(r.amount)} PLT`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.listdlg = async btn => {
  if (!ME) return go('#/login');
  let col; try { col = (await GET('/api/collection')).plates; } catch (e) { return toast(e.message, true); }
  const av = col.filter(p => !p.listing).sort((a, b) => b.value - a.value);
  if (!av.length) { openDialog(`<div class="dlg"><h2 class="h3" id="dlgTitle">${L('Выставить номер', 'List a plate')}</h2>${Empty(L('Нечего выставить', 'Nothing to list'), L('Здесь появятся ваши номера, которые ещё не на рынке.', 'Your plates that are not on the market will appear here.'), `<a class="btn btn-chrome" href="#/cases">${L('К кейсам', 'To cases')}</a>`)}<div class="dlg-acts"><button class="btn btn-ghost" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div></div>`); return; }
  const sel = btn.dataset.id && av.find(p => p.id === btn.dataset.id) ? btn.dataset.id : av[0].id;
  openDialog(`<form class="dlg" id="listForm" novalidate><h2 class="h3" id="dlgTitle">${L('Выставить на рынок', 'List on the market')}</h2>
    <fieldset style="border:0;padding:0;margin:0"><legend class="small" style="margin-bottom:8px;font-weight:700">${L('Номер', 'Plate')}</legend><div class="pick">${av.map(p => `<label><input type="radio" name="pl" value="${p.id}" ${p.id === sel ? 'checked' : ''}>${Plate(p)}<span class="small">${tierName(p.tier)} · ${fmt(p.value)}</span></label>`).join('')}</div></fieldset>
    <div class="fld"><label for="lprice">${L('Цена, PLT', 'Price, PLT')}</label><input class="field mono" id="lprice" type="number" inputmode="numeric" min="1" max="10000000" required></div>
    <dl class="kv" id="lcalc"></dl><p class="err" id="lerr" hidden></p>
    <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Выставить', 'List')}</button></div></form>`);
  const f = $('#listForm'), pr = $('#lprice'); const cur = () => av.find(p => p.id === f.pl.value);
  const calc = () => { $('#lcalc').innerHTML = feeRows(+pr.value || 0); };
  const def = () => { pr.value = Math.round(cur().value * 1.1); calc(); }; def();
  f.addEventListener('change', e => { if (e.target.name === 'pl') def(); }); pr.addEventListener('input', calc);
  f.addEventListener('submit', async e => {
    e.preventDefault(); const v = Math.round(+pr.value), err = $('#lerr');
    if (!(v >= 1 && v <= 1e7)) { err.hidden = false; err.textContent = L('Введите целую цену от 1 до 10 000 000 PLT.', 'Enter a whole price from 1 to 10 000 000 PLT.'); pr.focus(); return; }
    const sb = f.querySelector('[type=submit]'); busy(sb, true, '…');
    try { const r = await POST('/api/market/listings', { plateId: cur().id, price: v }); sfx('confirm'); dlg.close(); closeStage(); toast(L(`Выставлено за ${fmt(v)} PLT`, `Listed for ${fmt(v)} PLT`) + ` · ${r.listing.id}`); if (parseRoute().name !== 'case') render(false); }
    catch (x) { err.hidden = false; err.textContent = x.message; busy(sb, false); }
  });
};
A.verify = async btn => {
  const frame = $('#vfFrame'), idEl = $('#vfId'), res = $('#vfRes'); const id = btn.dataset.id;
  busy(btn, true, L('Проверяем…', 'Checking…')); res.innerHTML = ''; frame.classList.remove('ok', 'edge', 'scanning'); void frame.offsetWidth;
  const q = GET('/api/verify/' + encodeURIComponent(id)).catch(e => ({ verified: false, reason: e.message, checks: [] }));
  const w = ms => wait(reduced() ? 0 : ms);
  frame.classList.add('scanning'); await w(700); frame.classList.add('edge'); await w(900);
  const d = await q; frame.classList.remove('scanning', 'edge'); if (d.verified) frame.classList.add('ok');
  const checks = (d.checks || []).map(c => `<li><span class="${c.ok ? 'y' : 'n'}">${c.ok ? '✓' : '✕'}</span>${esc(srv(c.name))}</li>`).join('');
  res.innerHTML = d.verified
    ? `<div class="vf-mark ok">${VB()}</div><p class="vf-status iri-t">${L('Подлинный номер', 'Authentic plate')}</p><p class="mono small" style="margin:0">${esc(d.id)} · ${date(d.checkedAt)}</p><ul class="checks">${checks}</ul><p class="small" style="max-width:52ch;margin:6px 0 0">${L('Подтверждает запись игрового предмета внутри Plate Club. Это не проверка госномера.', 'Confirms the game record inside Plate Club. This is not a check of a real registration plate.')}</p>`
    : `<div class="vf-mark no" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2.5"/></svg></div><p class="vf-status">${L('Не подтверждено', 'Not verified')}</p><p class="small" style="margin:0">${esc(srv(d.reason) || '')}</p>${checks ? `<ul class="checks">${checks}</ul>` : ''}`;
  sfx(d.verified ? 'rare' : 'fail'); busy(btn, false); btn.textContent = L('Проверить ещё раз', 'Check again');
};
A.mtier = btn => { const t = btn.dataset.t; M.tiers = M.tiers.includes(t) ? M.tiers.filter(x => x !== t) : [...M.tiers, t]; btn.setAttribute('aria-pressed', M.tiers.includes(t)); loadMarket(); };
A.mseg = btn => { M[btn.dataset.k] = btn.dataset.v; btn.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn)); loadMarket(); };
A.mreset = () => { Object.assign(M, { q: '', tiers: [], group: '', min: '', max: '', sort: 'deal', who: '' }); render(false); };
A.ctier = btn => { C.tier = btn.dataset.t; render(false); };
A.pwshow = btn => { const i = btn.previousElementSibling; const s = i.type === 'password'; i.type = s ? 'text' : 'password'; btn.textContent = s ? L('Скрыть', 'Hide') : L('Показать', 'Show'); };
A.logout = async () => { try { await POST('/api/auth/logout'); } catch {} ME = null; PERKS = null; toast(L('Вы вышли.', 'Signed out.')); go('#/'); };
A.resend = async btn => { busy(btn, true, '…'); try { await POST('/api/auth/resend-verify'); toast(L('Письмо отправлено.', 'Email sent.')); } catch (e) { toast(e.message, true); } busy(btn, false); };

document.addEventListener('click', e => {
  const inner = e.target.closest('[data-act]'); const card0 = e.target.closest('a[data-fx="case"]'); const a0 = e.target.closest('a');
  if (inner && a0 && a0 !== inner && a0.contains(inner)) { e.preventDefault(); const f = A[inner.dataset.act]; if (f) f(inner, e); return; }
  const card = card0;
  if (card && !e.metaKey && !e.ctrlKey && !e.button && !reduced()) {
    e.preventDefault(); const r = card.getBoundingClientRect(); const b = document.createElement('i'); b.className = 'burst'; b.style.setProperty('--c', getComputedStyle(card).getPropertyValue('--c')); b.style.left = r.left + r.width / 2 + 'px'; b.style.top = r.top + r.height * 0.4 + 'px'; document.body.appendChild(b); setTimeout(() => b.remove(), 700);
    sfx('open'); card.classList.add('go'); setTimeout(() => go(card.getAttribute('href')), 380); return;
  }
  const el = e.target.closest('[data-act]'); if (!el) return; const fn = A[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'BUTTON' && el.type !== 'submit') e.preventDefault(); if (el.disabled) return; fn(el, e);
});
document.addEventListener('pointerdown', e => { const b = e.target.closest('.btn'); if (!b || b.disabled || reduced()) return; const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height); const s = document.createElement('span'); s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`; b.appendChild(s); setTimeout(() => s.remove(), 650); });
let qT;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'mq') { M.q = t.value; clearTimeout(qT); qT = setTimeout(loadMarket, 220); }
  if (t.id === 'mmin' || t.id === 'mmax') { M[t.id === 'mmin' ? 'min' : 'max'] = t.value; clearTimeout(qT); qT = setTimeout(loadMarket, 300); }
  if (t.id === 'svol') { PREF.vol = +t.value; savePref(); $('#volTxt').textContent = Math.round(PREF.vol * 100) + '%'; }
  if (t.classList && t.classList.contains('field') && t.getAttribute('aria-invalid') === 'true' && t.id !== 'nickname') { t.removeAttribute('aria-invalid'); const er = $('#' + t.id + '-e'); if (er) er.hidden = true; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'csort') { C.sort = t.value; render(false); }
  if (t.id === 'csort2') { CF.sort = t.value; $('#cgridBox').innerHTML = casesGrid(); fx($('#cgridBox')); }
  if (t.id === 'smotion') { PREF.motion = t.value; savePref(); }
  if (t.id === 'svol') sfx('tick');
});
document.addEventListener('submit', async e => {
  if (e.target.id === 'promoForm') {
    e.preventDefault(); const f = e.target, b = f.querySelector('[type=submit]'), er = f.parentElement.querySelector('#promoErr'); er.hidden = true; busy(b, true, '…');
    try { const r = await POST('/api/promo/redeem', { code: f.promo.value.trim() }); coins(b, 18); sfx('coin'); toast(`${r.code}: +${fmt(r.amount)} PLT`); f.reset(); await refreshMe(); if (parseRoute().name === 'bonus') render(false); }
    catch (x) { er.hidden = false; er.textContent = x.message; }
    busy(b, false); return;
  }
  const f = e.target; if (f.id !== 'authForm') return; e.preventDefault();
  const kind = f.querySelector('[data-form]').dataset.form; const b = f.querySelector('[type=submit]');
  const showErr = (msg, fields = {}) => { const fe = $('#formErr'); fe.hidden = !msg; fe.textContent = msg || ''; Object.entries(fields).forEach(([k, v]) => { const el = $('#' + k + '-e'), inp = $('#' + k); if (el) { el.hidden = false; el.className = 'ferr'; el.textContent = srv(v); } if (inp) inp.setAttribute('aria-invalid', 'true'); }); const first = Object.keys(fields)[0]; if (first) $('#' + first)?.focus(); };
  f.querySelectorAll('.ferr').forEach(x => { if (x.id !== 'nickname-e') x.hidden = true; });
  const v = n => (f[n] ? f[n].value : ''); const local = {};
  if (['register', 'login', 'forgot'].includes(kind) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email').trim())) local.email = L('Введите корректный email, например name@example.com.', 'Enter a valid email, like name@example.com.');
  if (kind === 'register' && !/^[A-Za-z0-9_]{3,20}$/.test(v('nickname').trim())) local.nickname = L('3–20 латинских букв, цифр или «_».', '3–20 Latin letters, digits or “_”.');
  if ((kind === 'register' || kind === 'reset') && v('password').length < 8) local.password = L('Минимум 8 символов.', 'At least 8 characters.');
  if (kind === 'login' && !v('password')) local.password = L('Введите пароль.', 'Enter your password.');
  if (kind === 'register' && !f.terms.checked) local.terms = L('Примите правила и политику конфиденциальности.', 'Accept the terms and the privacy policy.');
  if (Object.keys(local).length) return showErr('', local);
  busy(b, true, '…');
  try {
    if (kind === 'register') { const r = await POST('/api/auth/register', { email: v('email').trim(), nickname: v('nickname').trim(), password: v('password'), terms: true, ref: store.get('ref', '') || undefined }); store.set('ref', ''); await refreshMe(); refreshPerks(); sfx('confirm'); toast(L(`Добро пожаловать, ${ME.nickname}! +${r.bonus} PLT`, `Welcome, ${ME.nickname}! +${r.bonus} PLT`)); go(/next=admin/.test(location.hash) ? '#/admin' : '#/cases'); }
    else if (kind === 'login') { await POST('/api/auth/login', { email: v('email').trim(), password: v('password') }); await refreshMe(); refreshPerks(); toast(L(`Вы вошли как ${ME.nickname}.`, `Signed in as ${ME.nickname}.`)); const nx = v('next'); go(nx && nx.startsWith('#/') && !nx.startsWith('#/login') ? nx : '#/'); }
    else if (kind === 'forgot') { await POST('/api/auth/forgot', { email: v('email').trim() }); busy(b, false); b.disabled = true; $('#formOk').innerHTML = `<div class="notice"><b>${L('Проверьте почту', 'Check your email')}</b>${L('Если аккаунт с этим email есть, ссылка уже в пути.', 'If an account with this email exists, the link is on its way.')}</div>`; return; }
    else if (kind === 'reset') { await POST('/api/auth/reset', { token: v('token'), password: v('password') }); await refreshMe(); toast(L('Пароль сохранён, вы вошли.', 'Password saved, you are signed in.')); history.replaceState(null, '', location.pathname); go('#/'); }
  } catch (x) { showErr(x.message, (x.data && x.data.fields) || {}); busy(b, false); }
});

/* drawer */
function openDrawer() {
  const g = (title, items) => `<div class="dgroup"><span class="eyebrow">${title}</span>${items.map(([h, t, ic]) => `<a href="#/${esc(h)}">${IC[ic]}${t}</a>`).join('')}</div>`;
  const game = g(L('Игра', 'Game'), [['cases', L('Кейсы', 'Cases'), 'cases'], ['battles', L('Кейс-баттл', 'Case battle'), 'swords'], ['auction', L('Аукцион дня', 'Auction of the day'), 'hammer'], ['sets', L('Коллекции', 'Collections'), 'layers'], ['swap', L('Обмен номерами', 'Plate swaps'), 'swap'], ['upgrade', L('Апгрейд', 'Upgrade'), 'up'], ['market', L('Рынок', 'Market'), 'market'], ['top', L('Топ аккаунтов', 'Top accounts'), 'trophy']]);
  const tg = CFG && CFG.telegram ? `<div class="dgroup"><a href="${esc(CFG.telegram.url)}" target="_blank" rel="noopener">✈️ ${L('Чат игроков в Telegram', 'Players’ chat on Telegram')}</a></div>` : '';
  const info = g(L('Инфо', 'Info'), [['settings', L('Настройки', 'Settings'), 'gear'], ['help', L('Помощь', 'Help'), 'help'], ['terms', L('Правила', 'Terms'), 'doc'], ['privacy', L('Конфиденциальность', 'Privacy'), 'doc']]);
  const lang = `<div class="dgroup"><span class="eyebrow">${L('Язык', 'Language')}</span><div class="lang" style="justify-self:start;margin-left:12px"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div></div>`;
  const body = ME
    ? g(L('Аккаунт', 'Account'), [['profile', L('Профиль', 'Profile'), 'user'], ['collection', L('Мои номера', 'My plates'), 'coll'], ['wallet', L('Кошелёк', 'Wallet'), 'wallet'], ['bonus', L('Бонусы и промокоды', 'Bonuses & promo codes'), 'gift'], ...(ME.role === 'admin' ? [['admin', L('Панель админа', 'Admin panel'), 'crown']] : []), ['trades', L('Мои сделки', 'My trades'), 'swap'], ['support', L('Поддержка', 'Support') + (ME.unread ? ' •' : ''), 'chat']]) + game + tg + lang + info + (matchMedia('(display-mode: standalone)').matches ? '' : `<div class="dgroup"><button data-act="install">📲 ${L('Установить на телефон', 'Install on your phone')}</button></div>`) + `<div class="dgroup"><button data-act="logout">${IC.out}${L('Выйти', 'Sign out')}</button></div>`
    : g(L('Аккаунт', 'Account'), [['login', L('Войти', 'Sign in'), 'login'], ['register', L('Регистрация', 'Sign up'), 'user']]) + game + lang + info;
  $('#drawerHost').innerHTML = `<div class="drawer" data-act="drawerbg"><div class="drawer-in" role="dialog" aria-modal="true" aria-label="${L('Меню', 'Menu')}"><div class="row" style="justify-content:space-between;margin-bottom:12px"><img src="${BRAND('logo-chrome-360.png')}" alt="Plate Club" style="height:34px;width:auto"><button class="btn btn-sm btn-ghost" data-act="drawerclose">${L('Закрыть', 'Close')}</button></div>${ME ? `<div class="panel" style="padding:16px;margin-bottom:12px;display:flex;gap:12px;align-items:center">${Ava(ME.nickname)}<div><b>${esc(ME.nickname)}</b> ${Medals(ME.medals)} <span class="lvl-tag">LV ${ME.level.level}</span><div class="mono" style="margin-top:4px">${fmt(ME.balance)} PLT</div></div></div>` : ''}${body}</div></div>`;
  $('#drawerHost .drawer-in button').focus();
}
function closeDrawer() { $('#drawerHost').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if ($('#drawerHost').innerHTML) closeDrawer(); else if (STAGE && !dlg.open) { if (STAGE.el.classList.contains('st-done')) closeStage(); else A.stskip(); } });

/* ---------- boot ---------- */
async function boot() {
  applyPrefs(); document.documentElement.style.setProperty('--logo', `url("${BRAND('logo-chrome-900.png')}")`); document.documentElement.style.setProperty('--bgimg', `url("${IMG('hero-chrome.jpg')}")`);document.documentElement.style.setProperty('--tex', `url("${IMG('tex-1.jpg')}")`);
  const bar = $('#spBar'), step = $('#spStep'); const set = (p, s) => { if (bar) bar.style.width = p + '%'; if (step) step.textContent = s; };
  set(15, L('Загружаем каталог', 'Loading catalogue')); const params = new URLSearchParams(location.search);
  try { const [cfg] = await Promise.all([GET('/api/config'), refreshMe().then(() => set(70, L('Проверяем вход', 'Checking session')))]); CFG = cfg; set(85, L('Шрифты', 'Fonts')); await Promise.race([document.fonts ? document.fonts.ready : null, new Promise(r => setTimeout(r, 1500))]); }
  catch (e) { set(100, L('Нет связи', 'Offline')); $('#view').innerHTML = `<div class="wrap" style="padding-block:60px">${Empty(L('Plate Club недоступен', 'Plate Club is unavailable'), esc(e.message), `<button class="btn btn-chrome" data-act="reload">${L('Обновить', 'Reload')}</button>`)}</div>`; $('#splash').classList.add('gone'); return; }
  set(100, L('Готово', 'Ready'));
  if (params.get('verify')) { try { await POST('/api/auth/verify', { token: params.get('verify') }); await refreshMe(); toast(L('Email подтверждён.', 'Email verified.')); } catch (e) { toast(e.message, true); } history.replaceState(null, '', location.pathname + (location.hash || '#/profile')); }
  if (params.get('reset')) history.replaceState(null, '', location.pathname + '#/reset?token=' + encodeURIComponent(params.get('reset')));
  // invite link: remember the code and send a new visitor straight to sign-up
  const refCode = (params.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (refCode) { store.set('ref', refCode); history.replaceState(null, '', location.pathname + (location.hash || '')); if (!ME && !location.hash) location.hash = '#/register'; }
  await refreshPerks();
  await render(false);
  const sp = $('#splash'); sp.classList.add('gone'); setTimeout(() => sp.remove(), 450);
}
boot();
