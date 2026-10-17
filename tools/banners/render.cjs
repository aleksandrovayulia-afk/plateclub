// Renders the animated banner overlays as transparent WebM + a PNG still.
// Usage: node tools/banners/render.cjs [outDir]  (needs a local server on :8788 serving public/)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || '/home/claude/banners';
const BASE = process.env.BASE || 'http://localhost:8788';
const VARIANTS = ['pill', 'plate', 'cta', 'badge', 'lower'];
const FPS = 30, SECONDS = 3;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--force-color-profile=srgb'] });
  for (const v of VARIANTS) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/banner.html?v=${v}&h=${encodeURIComponent(process.env.HANDLE || 'plate-club.netlify.app')}`);
    await p.waitForTimeout(1200);
    const dir = path.join(OUT, '_frames_' + v);
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
    fs.copyFileSync(path.join(dir, 'f036.png'), path.join(OUT, `banner-${v}.png`));
    execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${dir}/f%03d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -an ${OUT}/banner-${v}.webm`);
    execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${dir}/f%03d.png -vf "fps=20,scale=540:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=1[pal];[s1][pal]paletteuse=alpha_threshold=128" -loop 0 ${OUT}/banner-${v}.gif`);
    execSync(`magick ${OUT}/banner-${v}.png -trim +repage ${OUT}/banner-${v}.png 2>/dev/null || true`, { shell: '/bin/bash' });
    fs.rmSync(dir, { recursive: true, force: true });
    await ctx.close();
    console.log('done', v);
  }
  await b.close();
})();
