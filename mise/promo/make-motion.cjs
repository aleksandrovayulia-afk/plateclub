const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8137/promo/motion.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 15000 }); await p.waitForTimeout(800);
  fs.rmSync('promo/.frames', { recursive: true, force: true }); fs.mkdirSync('promo/.frames', { recursive: true });
  const cdp = await ctx.newCDPSession(p); const frames = []; let n = 0; const saves = [];
  cdp.on('Page.screencastFrame', (e) => { const f = `promo/.frames/${String(n++).padStart(5, '0')}.jpg`; saves.push(fs.promises.writeFile(f, Buffer.from(e.data, 'base64'))); frames.push([f, e.metadata.timestamp]); cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  await p.evaluate(() => window.runMotion()); await p.waitForFunction(() => window.__done, null, { timeout: 90000 }); await p.waitForTimeout(600);
  await cdp.send('Page.stopScreencast'); await Promise.all(saves); fs.writeFileSync('promo/.frames.json', JSON.stringify(frames)); console.log('frames', frames.length, 'errs', errs); await b.close();
})();
