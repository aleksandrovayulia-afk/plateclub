// Renders the promo film: deterministic frames from promo.html + the synthesised soundtrack.
// Usage: node tools/promo/render.cjs [outDir]   (BASE must serve promo.html and brand/)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');

const OUT = process.argv[2] || '/home/claude/promo';
const BASE = process.env.BASE || 'http://localhost:8790';
const FPS = Number(process.env.FPS || 30);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const dir = path.join(OUT, '_frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${BASE}/promo.html`); await p.waitForTimeout(900);
  const dur = await p.evaluate(() => window.__dur);
  const total = Math.round(dur * FPS);
  for (let i = 0; i < total; i++) {
    await p.evaluate(t => window.__seek(t), i / FPS);
    await p.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
  }
  await b.close();
  if (errs.length) console.log('page errors:', errs.slice(0, 3));
  execSync(`python3 ${path.join(__dirname, 'audio.py')} ${OUT}/promo.wav`, { stdio: 'inherit' });
  // 1080x1920 H.264 + AAC — plays everywhere, fine for Reels/TikTok/Shorts
  execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${dir}/f%04d.png -i ${OUT}/promo.wav -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart ${OUT}/plate-club-promo.mp4`);
  // a square-ish cover for posts
  execSync(`ffmpeg -v error -y -i ${dir}/f0390.png -vf scale=1080:1920 ${OUT}/promo-cover.jpg`);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('done', `${OUT}/plate-club-promo.mp4`);
})();
