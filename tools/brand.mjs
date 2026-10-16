// Generates the PLATE CLUB brand kit as SVG (and PNG via sharp when available).
// Wordmark: custom monoline geometric letters drawn on a 50-unit cap grid, stroke 10, square ends.
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = new URL('../public/brand/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const INK = '#101010', PAPER = '#F1EEE6', BLUE = '#78AEEA';
const S = 10, W = 34, GAP = 7, SPACE = 18;
// centreline letters inside x∈[0,W], y∈[5,45]; a/b are inner stroke centres
const a = 5, b = W - 5, m = W / 2;
const L = {
  P: `M${a} 50V5H${b - 8}Q${b} 5 ${b} 13V19Q${b} 27 ${b - 8} 27H${a}`,
  L: `M${a} 0V45H${W}`,
  A: `M${a} 50V13Q${a} 5 ${a + 8} 5H${b - 8}Q${b} 5 ${b} 13V50M${a} 28H${b}`,
  T: `M0 5H${W}M${m} 5V50`,
  E: `M${W} 5H${a}V45H${W}M${a} 25H${b - 2}`,
  C: `M${W} 5H${a + 8}Q${a} 5 ${a} 13V37Q${a} 45 ${a + 8} 45H${W}`,
  U: `M${a} 0V37Q${a} 45 ${a + 8} 45H${b - 8}Q${b} 45 ${b} 37V0`,
  B: `M${a} 25H${b - 8}Q${b} 25 ${b} 33V37Q${b} 45 ${b - 8} 45H${a}V5H${b - 9}Q${b - 1} 5 ${b - 1} 13V17Q${b - 1} 25 ${b - 9} 25H${a}`,
};
function word(text, x0 = 0) {
  let x = x0, d = '';
  for (const ch of text) {
    if (ch === ' ') { x += SPACE; continue; }
    d += L[ch].replace(/([MLHVQ])([^MLHVQ]*)/g, (_, c, args) => {
      const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (c === 'H') return 'H' + (n[0] + x);
      if (c === 'V') return 'V' + n[0];
      const out = n.map((v, i) => (i % 2 === 0 ? v + x : v));
      return c + out.join(' ');
    });
    x += W + GAP;
  }
  return { d, width: x - GAP - x0 };
}
// Geometric four-point star, slightly concave: the club's mark.
const star = (cx, cy, r, k = 0.2) => { const i = r * k; return `M${cx} ${cy - r}L${cx + i} ${cy - i}L${cx + r} ${cy}L${cx + i} ${cy + i}L${cx} ${cy + r}L${cx - i} ${cy + i}L${cx - r} ${cy}L${cx - i} ${cy - i}Z`; };

const wm = word('PLATE CLUB', 0);
const MARK = 50, MG = 18;
function logo(fg, bg, file) {
  const w = MARK + MG + wm.width; const pad = bg ? 24 : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w + pad * 2} ${50 + pad * 2}" width="${(w + pad * 2) * 2}" height="${(50 + pad * 2) * 2}" role="img" aria-label="Plate Club">
${bg ? `<rect x="${-pad}" y="${-pad}" width="${w + pad * 2}" height="${50 + pad * 2}" fill="${bg}"/>` : ''}<path d="${star(25, 25, 25)}" fill="${fg}"/>
<path d="${word('PLATE CLUB', MARK + MG).d}" fill="none" stroke="${fg}" stroke-width="${S}" stroke-linejoin="miter" stroke-linecap="butt"/>
</svg>`;
  writeFileSync(new URL(file, OUT), svg); return svg;
}
const markOnly = (fg, bg, size, file, inner = 0.62, radius = 0) => {
  const r = size * inner / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Plate Club">
<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/><path d="${star(size / 2, size / 2, r)}" fill="${fg}"/></svg>`;
  writeFileSync(new URL(file, OUT), svg); return svg;
};
logo(INK, null, 'logo-ink.svg');
logo(PAPER, null, 'logo-paper.svg');
logo(INK, PAPER, 'logo-on-paper.svg');
logo(PAPER, INK, 'logo-on-ink.svg');
writeFileSync(new URL('mark.svg', OUT), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="100" height="100" role="img" aria-label="Plate Club"><path d="${star(25, 25, 25)}" fill="${INK}"/></svg>`);
const fav = markOnly(PAPER, INK, 64, 'favicon.svg', 0.66, 12);
const app = markOnly(PAPER, INK, 512, 'app-icon.svg', 0.56, 112);
const avatar = markOnly(INK, PAPER, 512, 'avatar.svg', 0.5, 0);
// Splash / social card: plate outline + mark + wordmark on ink.
const SW = 1200, SH = 630, sx = (SW - (MARK + MG + wm.width) * 1.6) / 2;
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}">
<rect width="${SW}" height="${SH}" fill="${INK}"/>
<rect x="120" y="150" width="960" height="330" rx="34" fill="none" stroke="${PAPER}" stroke-opacity=".22" stroke-width="3"/>
<line x1="830" y1="150" x2="830" y2="480" stroke="${PAPER}" stroke-opacity=".22" stroke-width="3"/>
<line x1="0" y1="315" x2="${SW}" y2="315" stroke="${BLUE}" stroke-opacity=".55" stroke-width="1"/>
<g transform="translate(${sx} 275) scale(1.6)"><path d="${star(25, 25, 25)}" fill="${PAPER}"/><path d="${word('PLATE CLUB', MARK + MG).d}" fill="none" stroke="${PAPER}" stroke-width="${S}"/></g>
<g fill="${PAPER}" fill-opacity=".55" font-family="IBM Plex Mono, Menlo, monospace" font-size="18" letter-spacing="3"><text x="120" y="110">PC · SERIES 0001</text><text x="1080" y="540" text-anchor="end">RUSSIAN PLATE COLLECTION</text></g>
</svg>`;
writeFileSync(new URL('splash.svg', OUT), splash);
writeFileSync(new URL('../favicon.svg', OUT), fav);

// PNG renditions
try {
  const sharp = (await import('/opt/npm-tools/node_modules/sharp/dist/index.cjs')).default;
  const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toFile(new URL(file, OUT).pathname);
  await png(fav, 32, 'favicon-32.png');
  await png(app, 180, 'apple-touch-icon.png');
  await png(app, 512, 'app-icon-512.png');
  await png(avatar, 512, 'avatar-512.png');
  await sharp(Buffer.from(splash)).png().toFile(new URL('og-image.png', OUT).pathname);
  await sharp(Buffer.from(logo(INK, PAPER, 'logo-on-paper.svg')), { density: 200 }).png().toFile(new URL('logo-on-paper.png', OUT).pathname);
  await sharp(Buffer.from(logo(PAPER, INK, 'logo-on-ink.svg')), { density: 200 }).png().toFile(new URL('logo-on-ink.png', OUT).pathname);
  console.log('PNG ok');
} catch (e) { console.log('PNG skipped:', e.message); }
console.log('wordmark width', wm.width);
