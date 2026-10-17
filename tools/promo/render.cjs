// Renders the whole promo series: every film × every language, each with its own soundtrack.
// Usage: node tools/promo/render.cjs [outDir]   (BASE must serve promo.html and brand/)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');

const OUT = process.argv[2] || '/home/claude/promo';
const BASE = process.env.BASE || 'http://localhost:8790';
const FPS = Number(process.env.FPS || 30);
const FILMS = (process.env.FILMS || 'promo,teaser,drop,invite').split(',');
const LANGS = (process.env.LANGS || 'ru,en').split(',');
const SITE = process.env.SITE || 'plate-club.netlify.app';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  for (const film of FILMS) {
    for (const lang of LANGS) {
      const name = `plate-club-${film}-${lang}`;
      const dir = path.join(OUT, '_f');
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      await p.goto(`${BASE}/promo.html?film=${film}&lang=${lang}&site=${encodeURIComponent(SITE)}`);
      await p.waitForTimeout(600);
      const dur = await p.evaluate(() => window.__dur);
      const total = Math.round(dur * FPS);
      for (let i = 0; i < total; i++) {
        await p.evaluate(t => window.__seek(t), i / FPS);
        await p.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
      }
      execSync(`python3 ${path.join(__dirname, 'audio.py')} ${OUT}/_a.wav ${film} ${dur}`, { stdio: 'pipe' });
      execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${dir}/f%04d.png -i ${OUT}/_a.wav -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart ${OUT}/${name}.mp4`);
      execSync(`ffmpeg -v error -y -i ${dir}/f${String(Math.round(total * 0.86)).padStart(4, '0')}.png -q:v 3 ${OUT}/${name}-cover.jpg`);
      fs.rmSync(dir, { recursive: true, force: true });
      console.log('done', name, dur + 's');
    }
  }
  fs.rmSync(path.join(OUT, '_a.wav'), { force: true });
  await b.close();
  if (errs.length) console.log('page errors:', errs.slice(0, 3));
})();
