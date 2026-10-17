/* Deterministic promo timeline: window.__seek(t) draws the frame at time t (seconds). */
const ST = document.getElementById('st');
const DUR = 15;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => 1 - Math.pow(1 - clamp(k), 3);          // out-cubic
const back = k => { const c = 1.7; const x = clamp(k); return 1 + 2.4 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const inWin = (t, a, b) => t >= a && t < b;
const loc = (t, a, b) => clamp((t - a) / (b - a));
// deterministic pseudo-random
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const reseed = v => { seed = v; };

const LOGO = 'brand/logo-chrome-900.png';
const RU = (l, d, r) => `<span class="plate"><span class="n">${l[0]}<em>${d}</em>${l.slice(1)}</span><span class="r"><b>${r}</b><i>RUS</i></span></span>`;
const BY = (d, r) => `<span class="plate by"><span class="n">${d}<em>&nbsp;-&nbsp;${r}</em></span><span class="r"><b>BY</b><i>&nbsp;</i></span></span>`;

const SCENES = [
  [0, 2.6], [2.6, 5.4], [5.4, 9.4], [9.4, 12.0], [12.0, 15],
];

function sceneLogo(t) {
  const k = loc(t, 0.1, 1.1), out = loc(t, 2.2, 2.6);
  const s = lerp(0.72, 1, back(k)), o = ease(loc(t, 0, 0.5)) * (1 - out);
  const sub = ease(loc(t, 0.8, 1.5)) * (1 - out);
  return `<div class="layer" style="opacity:${o}">
    <div style="display:grid;gap:40px;justify-items:center;transform:scale(${s})">
      <img class="logo" src="${LOGO}" alt="">
      <div class="sub" style="opacity:${sub};transform:translateY(${lerp(26, 0, ease(loc(t, 0.8, 1.5)))}px)">Коллекционные автономера<br>России и Беларуси</div>
    </div></div>
    <div class="flash" style="opacity:${Math.max(0, 0.9 - t * 3)}"></div>`;
}

function scenePlates(t) {
  const a = t - 2.6, out = loc(t, 5.0, 5.4);
  const items = [
    { h: RU('А7АА', '777', '777'), d: 0.0, tag: '<span class="tag t-grail">Грааль</span>' },
    { h: RU('ХМ', '001', '77'), d: 0.18, tag: '' },
    { h: BY('6543', '7'), d: 0.36, tag: '' },
  ];
  const rows = items.map((it, i) => {
    const k = ease(loc(a, it.d, it.d + 0.75));
    const x = lerp(i % 2 ? 420 : -420, 0, k), rot = lerp(i % 2 ? 9 : -9, 0, k);
    return `<div style="display:flex;align-items:center;gap:26px;opacity:${k};transform:translateX(${x}px) rotate(${rot}deg)">${it.h}${it.tag}</div>`;
  }).join('');
  const cap = ease(loc(a, 1.0, 1.6));
  return `<div class="layer" style="opacity:${1 - out}">
    <div style="display:grid;gap:46px;justify-items:center">
      <div class="kicker" style="opacity:${cap}">каждый номер уникален</div>
      ${rows}
      <div class="h1" style="opacity:${cap};font-size:68px">Две копии <span class="cg">на весь мир</span></div>
    </div></div>`;
}

function sceneCase(t) {
  const a = t - 5.4, out = loc(t, 9.1, 9.4);
  const burst = 1.15;                       // when the case shatters
  let html = '';
  if (a < burst + 0.1) {
    const sh = a > burst - 0.35 ? Math.sin(a * 90) * 10 * loc(a, burst - 0.35, burst) : 0;
    const k = ease(loc(a, 0, 0.5));
    const sc = lerp(0.6, 1, k) * (1 + 0.12 * loc(a, burst - 0.35, burst));
    const crack = loc(a, burst - 0.4, burst);
    html += `<div class="layer"><div style="position:relative;transform:translateX(${sh}px) scale(${sc});opacity:${k}">
      <div class="case"></div>
      <svg width="430" height="330" style="position:absolute;inset:0;opacity:${crack}" viewBox="0 0 430 330">
        <path d="M60 40 L170 150 L120 230 L230 300" stroke="#fff" stroke-width="5" fill="none" opacity=".95"/>
        <path d="M170 150 L300 90 L380 170" stroke="#fff" stroke-width="4" fill="none" opacity=".8"/>
        <path d="M170 150 L250 200 L420 250" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>
      </svg></div></div>`;
  }
  if (a >= burst - 0.02 && a < burst + 1.1) {
    reseed(31);
    const k = loc(a, burst, burst + 0.9);
    let sh = '';
    for (let i = 0; i < 34; i++) {
      const ang = (i / 34) * Math.PI * 2 + rnd() * 0.5, r = 220 + rnd() * 460;
      const w = 46 + rnd() * 96, h = 34 + rnd() * 76, rot = (rnd() - 0.5) * 900 * k;
      const x = Math.cos(ang) * r * ease(k), y = Math.sin(ang) * r * ease(k) + 300 * k * k;
      sh += `<i class="shard" style="left:${50 + (rnd() - 0.5) * 10}%;top:${46 + (rnd() - 0.5) * 10}%;width:${w}px;height:${h}px;transform:translate(${x}px,${y}px) rotate(${rot}deg);opacity:${1 - k * k}"></i>`;
    }
    html += `<div class="layer" style="position:absolute">${sh}</div>`;
    html += `<div class="flash" style="opacity:${Math.max(0, 0.95 - loc(a, burst, burst + 0.45) * 1.1)}"></div>`;
  }
  if (a >= burst) {
    // the roulette flies out of the wreck and decelerates onto the winning plate
    const k = loc(a, burst, burst + 0.3);
    const roll = clamp((a - burst - 0.1) / 1.9);
    const CARD = 300, GAP = 16, PITCH = CARD + GAP, N = 22, WINI = 16;
    const target = WINI * PITCH - 540 + CARD / 2;
    const x = -target * ease(roll);
    reseed(5);
    let cards = '';
    for (let i = 0; i < N; i++) {
      const win = i === WINI;
      const l = 'АВЕКМНОРСТУХ', pick = s => s[Math.floor(rnd() * s.length)];
      const plate = win ? RU('Е7КХ', '777', '77') : RU(pick(l) + pick(l) + pick(l), String(Math.floor(rnd() * 900) + 100), String(Math.floor(rnd() * 90) + 10));
      cards += `<div class="card${win && roll > 0.97 ? ' win' : ''}"><div class="mini">${plate}</div><span class="cap">${win ? 'Грааль' : ['Обычный', 'Хороший', 'Редкий'][Math.floor(rnd() * 3)]}</span></div>`;
    }
    const sx = lerp(0.1, 1, ease(k)), sy = lerp(0.05, 1, ease(k));
    html += `<div class="layer" style="opacity:${1 - out}"><div style="position:relative;width:1080px;height:340px;overflow:hidden;transform:scaleX(${sx}) scaleY(${sy});filter:brightness(${lerp(2.4, 1, ease(k))})">
      <div class="strip" style="transform:translateX(${x}px)">${cards}</div></div>
      <div class="marker" style="opacity:${ease(k)}"></div></div>`;
    if (roll > 0.97) {
      const g = loc(a, burst + 2.0, burst + 2.3);
      html += `<div class="layer" style="align-items:end;padding-bottom:520px;opacity:${g * (1 - out)}"><div style="display:grid;gap:18px;justify-items:center;transform:scale(${lerp(0.85, 1, ease(g))})"><span class="tag t-grail" style="font-size:40px;padding:16px 38px">Грааль · 21 000 PLT</span><span class="sub" style="font-size:34px">выпадает раз на тысячу</span></div></div>`;
    }
  }
  return html;
}

function sceneMarket(t) {
  const a = t - 9.4, out = loc(t, 11.7, 12.0);
  const rows = [
    { p: RU('ВА', '567', '42'), who: 'продаёт Nikita', price: '1 240 PLT', d: 0.1 },
    { p: RU('СН', '955', '96'), who: 'продаёт Alina', price: '880 PLT', d: 0.26 },
    { p: BY('6543', '6'), who: 'продаёт Max', price: '640 PLT', d: 0.42 },
  ].map(r => {
    const k = ease(loc(a, r.d, r.d + 0.6));
    return `<div class="mkrow" style="opacity:${k};transform:translateY(${lerp(40, 0, k)}px)">
      <span class="mini">${r.p}</span><span class="who">${r.who}</span><span class="price">${r.price}</span></div>`;
  }).join('');
  const cap = ease(loc(a, 0.9, 1.5));
  return `<div class="layer" style="opacity:${1 - out}"><div style="display:grid;gap:46px;justify-items:center">
    <div class="kicker" style="opacity:${cap}">живой рынок</div>
    <div class="h1" style="opacity:${cap}">Торгуй <span class="cg">с игроками</span></div>
    <div class="mk">${rows}</div></div></div>`;
}

function sceneCta(t) {
  const a = t - 12.0;
  const k = ease(loc(a, 0.05, 0.7));
  reseed(99);
  let conf = '';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 1080, y = -100 + rnd() * 300 + (a * 420 + rnd() * 300) % 2200;
    const w = 8 + rnd() * 16, h = 14 + rnd() * 22;
    const col = ['#8FD3FF', '#C6FF3D', '#FFD25E', '#ffffff'][Math.floor(rnd() * 4)];
    conf += `<i class="conf" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${col};opacity:.5;transform:rotate(${(a * 300 + i * 37) % 360}deg)"></i>`;
  }
  const pulse = 1 + Math.sin(a * 5) * 0.025;
  return `<div class="layer">${conf}</div>
  <div class="layer" style="opacity:${k}"><div class="cta" style="transform:scale(${lerp(0.9, 1, k) * pulse})">
    <img class="logo" style="width:620px" src="${LOGO}" alt="">
    <div class="h1" style="font-size:76px">100 PLT <span class="cg">на старт</span></div>
    <div class="btn">Открыть первый кейс</div>
    <div class="url">plate-club.netlify.app</div>
  </div></div>`;
}

function frame(t) {
  let inner = `<div class="bg"></div><div class="rays" style="transform:rotate(${t * 2.4}deg)"></div>`;
  if (inWin(t, 0, 2.6)) inner += sceneLogo(t);
  if (inWin(t, 2.6, 5.4)) inner += scenePlates(t);
  if (inWin(t, 5.4, 9.4)) inner += sceneCase(t);
  if (inWin(t, 9.4, 12.0)) inner += sceneMarket(t);
  if (t >= 12.0) inner += sceneCta(t);
  inner += '<div class="vig"></div>';
  // soft fade in / out of the whole film
  const fade = Math.min(ease(loc(t, 0, 0.35)), 1 - loc(t, DUR - 0.4, DUR));
  ST.style.opacity = fade;
  ST.innerHTML = inner;
}
window.__seek = frame;
window.__dur = DUR;
frame(0);
