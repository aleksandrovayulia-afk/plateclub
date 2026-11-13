const { chromium } = require('playwright');
const URL = 'http://localhost:8137/';
const wait = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const c0 = await b.newContext({ viewport: { width: 405, height: 720 } }); const p0 = await c0.newPage();
  await p0.goto(URL + '#/'); await wait(p0, 1500);
  await p0.evaluate(() => { const s = JSON.parse(localStorage.getItem('mise:v2') || '{}'); s.onboarded = true; s.lang = 'ru'; s.coach = Object.fromEntries(['fridge','recipes','plan','shop','tools','kitchen','saved','recipe','home','assistant','cook'].map((k) => [k, true])); s.coachSeen = true; localStorage.setItem('mise:v2', JSON.stringify(s)); });
  await p0.reload(); await wait(p0, 1500); await p0.goto(URL + '#/fridge'); await wait(p0, 1500); await c0.storageState({ path: 'tiktok/state.json' }); await c0.close();
  const T0 = Date.now(); const marks = [];
  const ctx = await b.newContext({ storageState: 'tiktok/state.json', viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, locale: 'ru-RU' });
  const p = await ctx.newPage();
  const fs = require('fs'); fs.rmSync('tiktok/frames', { recursive: true, force: true }); fs.mkdirSync('tiktok/frames', { recursive: true });
  const cdp = await ctx.newCDPSession(p); const frames = []; let n = 0; const saves = [];
  cdp.on('Page.screencastFrame', (e) => { const f = `tiktok/frames/${String(n++).padStart(5, '0')}.jpg`; saves.push(fs.promises.writeFile(f, Buffer.from(e.data, 'base64'))); frames.push([f, e.metadata.timestamp]); cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  await p.addInitScript(() => {});
  const inject = () => p.evaluate(() => {
    if (document.getElementById('tt-cap')) return;
    const st = document.createElement('style'); st.textContent = `#tt-cap{position:fixed;left:14px;right:14px;top:64px;z-index:99999;padding:14px 16px;border-radius:20px;background:rgba(20,16,14,.88);color:#fff;font:800 32px/1.15 Inter,system-ui,sans-serif;text-align:center;letter-spacing:-.02em;transition:opacity .25s,transform .25s;pointer-events:none}#tt-cap.hide{opacity:0;transform:translateY(-8px)}#tt-end{position:fixed;inset:0;z-index:100000;background:linear-gradient(160deg,#e8553a,#c63e27);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:30px;font-family:Inter,system-ui,sans-serif;opacity:0;transition:opacity .5s;pointer-events:none}#tt-end.on{opacity:1}#tt-end h1{font-size:54px;margin:0;letter-spacing:-.03em}#tt-end p{font-size:22px;margin:0;opacity:.95;font-weight:600}#tt-end small{font-size:16px;opacity:.85}`;
    document.head.appendChild(st);
    const c = document.createElement('div'); c.id = 'tt-cap'; c.className = 'hide'; document.body.appendChild(c);
    const e = document.createElement('div'); e.id = 'tt-end'; e.innerHTML = '<div style="font-size:92px">👨‍🍳</div><h1>Mise</h1><p>20 000+ рецептов<br>560 фото · 3 языка</p><p>Скажи, что в холодильнике.<br>Моти подскажет, что готовить.</p><small>Скачай и готовь без лишних слов</small>'; document.body.appendChild(e);
  });
  const cap = async (t) => { await inject(); await p.evaluate((t) => { const c = document.getElementById('tt-cap'); c.classList.add('hide'); setTimeout(() => { c.textContent = t; c.classList.remove('hide'); }, 200); }, t); };
  const hideCap = () => p.evaluate(() => document.getElementById('tt-cap')?.classList.add('hide'));
  // 1. Hook
  console.log('scene 1', Date.now() - T0);
  await p.goto(URL + '#/'); await wait(p, 1200); marks.push(Date.now() - T0); await cap('Что приготовить, если в холодильнике пусто?'); await wait(p, 2600);
  // 2. Fridge
  console.log('scene 2', Date.now() - T0);
  await p.goto(URL + '#/fridge'); await wait(p, 700); await p.evaluate(() => window.scrollTo(0, 0)); await cap('Нажми на то, что у тебя есть'); await wait(p, 600);
  await p.evaluate(() => document.querySelector('#fridge-chips')?.scrollIntoView({ block: 'start' })); await wait(p, 500);
  for (const n of [0, 1, 3, 5]) { await p.locator('.pcard').nth(n).click(); await wait(p, 450); }
  await wait(p, 600); await cap('Моти найдёт блюда из твоих продуктов'); await p.evaluate(() => document.querySelector('#results')?.scrollIntoView({ block: 'start', behavior: 'smooth' })); await wait(p, 2600);
  // 3. Build own dish
  console.log('scene 3', Date.now() - T0);
  await p.evaluate(() => window.scrollTo({ top: 0 })); await wait(p, 500);
  await p.evaluate(() => document.querySelector('.build-cta')?.scrollIntoView({ block: 'center' })); await cap('Или собери своё блюдо из чего угодно'); await wait(p, 900);
  await p.click('[data-act=build-open]'); await wait(p, 1300); await p.click('[data-tech=pan]'); await wait(p, 2200);
  // 4. Recipe photo
  console.log('scene 4', Date.now() - T0);
  await cap('Фото, шаги и порции под тебя'); await p.evaluate(() => window.scrollTo({ top: 260, behavior: 'smooth' })); await wait(p, 2200);
  // 5. Cooking
  console.log('scene 5', Date.now() - T0);
  await p.evaluate(() => window.scrollTo({ top: 0 })); await p.click('[data-act=cook]'); await wait(p, 1200); await cap('Готовь шаг за шагом, таймер в один тап'); await wait(p, 1200);
  await p.click('[data-act=cook-next]'); await wait(p, 1200); await p.locator('[data-act=cook-timer]').click({ timeout: 1500 }).catch(() => {}); await wait(p, 1600);
  await p.click('[data-act=tip-toggle]', { timeout: 1500 }).catch(() => {}); await wait(p, 1500);
  // 6. End card
  console.log('scene 6', Date.now() - T0);
  await hideCap(); await p.evaluate(() => document.getElementById('tt-end').classList.add('on')); await wait(p, 3400);
  await cdp.send('Page.stopScreencast'); await Promise.all(saves); fs.writeFileSync('tiktok/frames.json', JSON.stringify(frames)); await ctx.close(); await b.close();
})();
