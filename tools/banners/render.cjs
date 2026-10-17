// Renders the animated banner overlays as transparent WebM + a PNG still.
// Usage: node tools/banners/render.cjs [outDir]  (needs a local server on :8788 serving public/)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || '/home/claude/banners';
const BASE = process.env.BASE || 'http://localhost:8788';
const VARIANTS = (process.env.VARIANTS || 'pill,plate,cta,badge,lower,start,ticker').split(',');
const LANGS = (process.env.LANGS || 'ru,en').split(',');
const FPS = 30, SECONDS = 3;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--force-color-profile=srgb'] });
  for (const vl of VARIANTS.flatMap(v => LANGS.map(l => [v, l]))) {
    const [v, lang] = vl; const name = `${v}-${lang}`;
    const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/banner.html?v=${v}&lang=${lang}&h=${encodeURIComponent(process.env.HANDLE || 'plate-club.netlify.app')}`);
    await p.waitForTimeout(1200);
    const dir = path.join(OUT, '_frames_' + name);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    // freeze the clock and step it, so every frame is deterministic
    await p.evaluate(() => { document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }); });
    const total = FPS * SECONDS;
    for (let i = 0; i < total; i++) {
      const t = (i / FPS) * 1000;
      await p.evaluate(ms => document.getAnimations().forEach(a => { a.currentTime = ms; }), t);
      await p.screenshot({ path: path.join(dir, `f${String(i).padStart(3, '0')}.png`), omitBackground: true });
    }
    // still frame at 1.2 s, trimmed to the content
    // still frame, cropped to the visible content so the preview isn't a mostly-empty 1080×1920
    const still = path.join(OUT, `banner-${name}.png`);
    fs.copyFileSync(path.join(dir, 'f036.png'), still);
    execSync(`convert ${still} -trim +repage ${still}`);
    execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${dir}/f%03d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -an ${OUT}/banner-${name}.webm`);
    execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${dir}/f%03d.png -vf "fps=20,scale=540:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=1[pal];[s1][pal]paletteuse=alpha_threshold=128" -loop 0 ${OUT}/banner-${name}.gif`);

    fs.rmSync(dir, { recursive: true, force: true });
    await ctx.close();
    console.log('done', name);
  }
  await b.close();
})();
