// Builds preview/plate-club-preview.html: the real front end + an in-browser stand-in for the API.
import { readFileSync, writeFileSync } from 'node:fs';
const R = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const dataSvg = p => 'data:image/svg+xml;base64,' + Buffer.from(R(p)).toString('base64');
let game = R('server/game.mjs')
  .replace(/^import .*node:crypto.*$/m, "const randomInt = (a, b) => a + Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * (b - a));")
  .replace(/^export /gm, '');
game = `(function(){${game}\nwindow.__GAME={LETTERS,GROUPS,REGIONS,TIERS,CASES,caseById,poolOf,genPlate,plateValue,drawTier,comboKey,plateStr,PACKAGES,CURRENCIES,SIGNUP_BONUS,MARKET_FEE,BANK_RATE,publicConfig,BY_REGIONS,poolRegions,priceNow,dealsFor,regionName,CATS,ACHIEVEMENTS,dailyAmount,caseRank,levelOf,LEVEL_REWARD,targetValue,upgradeChance,plateTraits,MARKET_BOT,BOT_DECAY,botListPrice,DEALER,dealerDemand,matchesDemand,dealerPrice,TRAITS,cleanSettings,casePrice,SETTINGS_DEFAULT,SETTINGS_LIMITS,SETS,setProgress,slotOk,BATTLE,AUCTION,auctionDay,auctionMin,SWAP,BATTLE_CASES,battleCaseById,anyCaseById};})();`;
const png = p => 'data:image/png;base64,' + readFileSync(new URL('../public/' + p, import.meta.url)).toString('base64');
const brand0 = { '/brand/logo-ink.svg': dataSvg('public/brand/logo-ink.svg'), '/brand/logo-paper.svg': dataSvg('public/brand/logo-paper.svg'), '/brand/mark.svg': dataSvg('public/brand/mark.svg'), '/favicon.svg': dataSvg('public/favicon.svg') };
const jpg = p => 'data:image/jpeg;base64,' + readFileSync(new URL('../public/' + p, import.meta.url)).toString('base64');
const brand = { ...brand0, '/img/hero-chrome.jpg': jpg('img/hero-chrome.jpg'), '/img/hero-chrome-m.jpg': jpg('img/hero-chrome-m.jpg'), '/brand/logo-chrome-360.png': png('brand/logo-chrome-360.png'), '/brand/logo-chrome-900.png': png('brand/logo-chrome-900.png'), '/brand/favicon-64.png': png('brand/favicon-64.png') };
const sub = s => Object.entries(brand).reduce((a, [k, v]) => a.split(k).join(v), s);
import { readdirSync } from 'node:fs';
const brandPng = { 'logo-chrome-360.png': png('brand/logo-chrome-360.png'), 'logo-chrome-900.png': png('brand/logo-chrome-900.png'), 'logo-chrome.png': png('brand/logo-chrome.png'), 'img/hero-chrome.jpg': jpg('img/hero-chrome.jpg'), 'img/hero-chrome-m.jpg': jpg('img/hero-chrome-m.jpg'), 'img/tex-1.jpg': jpg('img/tex-1.jpg'), ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => ['img/head-' + n + '.jpg', jpg('img/head-' + n + '.jpg')])) };
let html = R('public/index.html');
const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
let body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const keepHead = head.split('\n').filter(l => /<title>|og:|description|theme-color|fonts\.g|<script>try/.test(l) && !/rel="icon"|apple-touch/.test(l)).join('\n');
const banner = '' && `<div class="pv-bar"><b>ПРЕВЬЮ</b><span>Plate Club работает прямо в браузере. Вы вошли как админ Yulia (10 000 000 PLT). Пополнение тестовое, demo_ — демо-аккаунты. Данные хранятся только в этом браузере.</span></div>`;
body = body.replace('<script src="/app.js" type="module"></script>', () => `<script>window.__BRAND=${JSON.stringify(brandPng)};</script>\n<script>${game}</script>\n<script>${R('preview/preview-api.js')}</script>\n<script type="module">${sub(R('public/app.js'))}</script>`);
const css = R('public/app.css') + `\n.pv-bar{position:relative;z-index:60;background:#0d1016;color:#9fb3c8;border-bottom:1px solid rgba(143,211,255,.18);font-family:var(--f-mono);font-size:11px;letter-spacing:.04em;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-block:6px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}@media (max-width:720px){.pv-bar span{display:none}}.pv-bar b{background:#8FD3FF;color:#06070A;padding:1px 6px}`;
const out = `<meta name="claude:viewport-fit-sides" content="cover">\n${keepHead}\n<style>${css}</style>\n${sub(banner + body)}`;
writeFileSync(new URL('../preview/plate-club-preview.html', import.meta.url), out);
console.log('bytes', out.length);
