/* Deterministic promo films. window.__seek(t) draws the frame at time t (seconds).
   ?film=promo|teaser|drop|invite  &lang=ru|en   — one page renders the whole series. */
const ST = document.getElementById('st');
const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'en' ? 'en' : 'ru';
const FILM = Q.get('film') || 'promo';
const SITE = Q.get('site') || 'plate-club.netlify.app';

const TXT = {
  tagline: ['Коллекционные автономера<br>России и Беларуси', 'Collectible license plates<br>of Russia and Belarus'],
  unique: ['каждый номер уникален', 'every plate is unique'],
  twoCopies: ['Две копии <span class="cg">на весь мир</span>', 'Two copies <span class="cg">in the whole world</span>'],
  liveMarket: ['живой рынок', 'live market'],
  trade: ['Торгуй <span class="cg">с игроками</span>', 'Trade <span class="cg">with players</span>'],
  sells: ['продаёт', 'seller'],
  start: ['100 PLT <span class="cg">на старт</span>', '100 PLT <span class="cg">to start</span>'],
  openFirst: ['Открыть первый кейс', 'Open your first case'],
  grailTag: ['Грааль · 21 000 PLT', 'Grail · 21,000 PLT'],
  grailNote: ['выпадает раз на тысячу', 'one in a thousand'],
  inviteKicker: ['приведи друга', 'bring a friend'],
  inviteH: ['Друг зарегался —<br>тебе <span class="cg">+1000 PLT</span>', 'Friend signs up —<br>you get <span class="cg">+1000 PLT</span>'],
  inviteSub: ['Своя ссылка у каждого игрока', 'Every player has their own link'],
  caseKicker: ['кейс-рулетка', 'case roulette'],
  grail: ['Грааль', 'Grail'],
};
const t_ = k => TXT[k][LANG === 'en' ? 1 : 0];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => 1 - Math.pow(1 - clamp(k), 3);
const back = k => { const c = 1.7; const x = clamp(k); return 1 + 2.4 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const loc = (t, a, b) => clamp((t - a) / (b - a));
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const reseed = v => { seed = v; };

const LOGO = 'brand/logo-chrome-900.png';
const RU = (l, d, r) => `<span class="plate"><span class="n">${l[0]}<em>${d}</em>${l.slice(1)}</span><span class="r"><b>${r}</b><i>RUS</i></span></span>`;
const BY = (d, r) => `<span class="plate by"><span class="n">${d}<em>&nbsp;-&nbsp;${r}</em></span><span class="r"><b>BY</b><i>&nbsp;</i></span></span>`;

/* ---------- scenes ---------- */
function sLogo(a, len) {
  const k = loc(a, 0.1, 1.1), out = loc(a, len - 0.4, len);
  const o = ease(loc(a, 0, 0.5)) * (1 - out), sub = ease(loc(a, 0.8, 1.5)) * (1 - out);
  return `<div class="layer" style="opacity:${o}"><div style="display:grid;gap:40px;justify-items:center;transform:scale(${lerp(0.72, 1, back(k))})">
      <img class="logo" src="${LOGO}" alt="">
      <div class="sub" style="opacity:${sub};transform:translateY(${lerp(26, 0, ease(loc(a, 0.8, 1.5)))}px)">${t_('tagline')}</div>
    </div></div><div class="flash" style="opacity:${Math.max(0, 0.9 - a * 3)}"></div>`;
}
function sPlates(a, len) {
  const out = loc(a, len - 0.4, len);
  const items = [
    { h: RU('А7АА', '777', '777'), d: 0.0, tag: `<span class="tag t-grail">${t_('grail')}</span>` },
    { h: RU('ХМ', '001', '77'), d: 0.18, tag: '' },
    { h: BY('6543', '7'), d: 0.36, tag: '' },
  ];
  const rows = items.map((it, i) => {
    const k = ease(loc(a, it.d, it.d + 0.75));
    return `<div style="display:flex;align-items:center;gap:26px;opacity:${k};transform:translateX(${lerp(i % 2 ? 420 : -420, 0, k)}px) rotate(${lerp(i % 2 ? 9 : -9, 0, k)}deg)">${it.h}${it.tag}</div>`;
  }).join('');
  const cap = ease(loc(a, 1.0, 1.6));
  return `<div class="layer" style="opacity:${1 - out}"><div style="display:grid;gap:46px;justify-items:center">
      <div class="kicker" style="opacity:${cap}">${t_('unique')}</div>${rows}
      <div class="h1" style="opacity:${cap};font-size:68px">${t_('twoCopies')}</div></div></div>`;
}
function sCase(a, len, opts = {}) {
  const out = loc(a, len - 0.3, len);
  const burst = opts.burst === undefined ? 1.15 : opts.burst;
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
    if (opts.kicker) html += `<div class="layer" style="align-items:start;padding-top:430px;opacity:${ease(loc(a, 0.2, 0.8)) * (1 - loc(a, burst - 0.2, burst))}"><div class="kicker">${t_('caseKicker')}</div></div>`;
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
    const k = loc(a, burst, burst + 0.3);
    const roll = clamp((a - burst - 0.1) / 1.9);
    const CARD = 300, GAP = 16, PITCH = CARD + GAP, N = 22, WINI = 16;
    const x = -(WINI * PITCH - 540 + CARD / 2) * ease(roll);
    reseed(5);
    const TIERS = LANG === 'en' ? ['Common', 'Fine', 'Rare'] : ['Обычный', 'Хороший', 'Редкий'];
    let cards = '';
    for (let i = 0; i < N; i++) {
      const win = i === WINI;
      const l = 'АВЕКМНОРСТУХ', pick = s => s[Math.floor(rnd() * s.length)];
      const plate = win ? RU('Е7КХ', '777', '77') : RU(pick(l) + pick(l) + pick(l), String(Math.floor(rnd() * 900) + 100), String(Math.floor(rnd() * 90) + 10));
      cards += `<div class="card${win && roll > 0.97 ? ' win' : ''}"><div class="mini">${plate}</div><span class="cap">${win ? t_('grail') : TIERS[Math.floor(rnd() * 3)]}</span></div>`;
    }
    html += `<div class="layer" style="opacity:${1 - out}"><div style="position:relative;width:1080px;height:340px;overflow:hidden;transform:scaleX(${lerp(0.1, 1, ease(k))}) scaleY(${lerp(0.05, 1, ease(k))});filter:brightness(${lerp(2.4, 1, ease(k))})">
      <div class="strip" style="transform:translateX(${x}px)">${cards}</div></div>
      <div class="marker" style="opacity:${ease(k)}"></div></div>`;
    if (roll > 0.97) {
      const g = loc(a, burst + 2.0, burst + 2.3);
      html += `<div class="layer" style="align-items:end;padding-bottom:520px;opacity:${g * (1 - out)}"><div style="display:grid;gap:18px;justify-items:center;transform:scale(${lerp(0.85, 1, ease(g))})">
        <span class="tag t-grail" style="font-size:40px;padding:16px 38px">${t_('grailTag')}</span><span class="sub" style="font-size:34px">${t_('grailNote')}</span></div></div>`;
    }
  }
  return html;
}
function sMarket(a, len) {
  const out = loc(a, len - 0.3, len);
  const rows = [
    { p: RU('ВА', '567', '42'), who: 'Nikita', price: '1 240 PLT', d: 0.1 },
    { p: RU('СН', '955', '96'), who: 'Alina', price: '880 PLT', d: 0.26 },
    { p: BY('6543', '6'), who: 'Max', price: '640 PLT', d: 0.42 },
  ].map(r => {
    const k = ease(loc(a, r.d, r.d + 0.6));
    return `<div class="mkrow" style="opacity:${k};transform:translateY(${lerp(40, 0, k)}px)">
      <span class="mini">${r.p}</span><span class="who">${t_('sells')} ${r.who}</span><span class="price">${r.price}</span></div>`;
  }).join('');
  const cap = ease(loc(a, 0.9, 1.5));
  return `<div class="layer" style="opacity:${1 - out}"><div style="display:grid;gap:46px;justify-items:center">
    <div class="kicker" style="opacity:${cap}">${t_('liveMarket')}</div>
    <div class="h1" style="opacity:${cap}">${t_('trade')}</div>
    <div class="mk">${rows}</div></div></div>`;
}
function sInvite(a, len) {
  const out = loc(a, len - 0.3, len);
  const k = ease(loc(a, 0.1, 0.8));
  return `<div class="layer" style="opacity:${1 - out}"><div style="display:grid;gap:40px;justify-items:center">
    <div class="kicker" style="opacity:${k}">${t_('inviteKicker')}</div>
    <div class="h1" style="opacity:${k};transform:translateY(${lerp(30, 0, k)}px)">${t_('inviteH')}</div>
    <div class="sub" style="opacity:${ease(loc(a, 0.6, 1.2))}">${t_('inviteSub')}</div>
    <div class="pillbar" style="opacity:${ease(loc(a, 0.9, 1.5))};transform:scale(${lerp(0.9, 1, ease(loc(a, 0.9, 1.5)))})"><img src="${LOGO}" alt=""><span class="u">${SITE}/i/you</span></div>
  </div></div>`;
}
function sCta(a, len, opts = {}) {
  const k = ease(loc(a, 0.05, 0.7));
  reseed(99);
  let c = '';
  if (opts.conf !== false) for (let i = 0; i < 40; i++) {
    const x = rnd() * 1080, y = -100 + rnd() * 300 + (a * 420 + rnd() * 300) % 2200;
    const col = ['#8FD3FF', '#C6FF3D', '#FFD25E', '#ffffff'][Math.floor(rnd() * 4)];
    c += `<i class="conf" style="left:${x}px;top:${y}px;width:${8 + rnd() * 16}px;height:${14 + rnd() * 22}px;background:${col};opacity:.5;transform:rotate(${(a * 300 + i * 37) % 360}deg)"></i>`;
  }
  const pulse = 1 + Math.sin(a * 5) * 0.025;
  return `<div class="layer">${c}</div><div class="layer" style="opacity:${k}"><div class="cta" style="transform:scale(${lerp(0.9, 1, k) * pulse})">
    <img class="logo" style="width:620px" src="${LOGO}" alt="">
    <div class="h1" style="font-size:76px">${t_('start')}</div>
    <div class="btn">${t_('openFirst')}</div>
    <div class="url">${SITE}</div></div></div>`;
}

/* ---------- the series ---------- */
const FILMS = {
  promo: [[sLogo, 2.6], [sPlates, 2.8], [sCase, 4.0], [sMarket, 2.6], [sCta, 3.0]],
  teaser: [[(a, l) => sCase(a, l, { burst: 0.9, kicker: true }), 4.2], [(a, l) => sCta(a, l, { conf: false }), 2.8]],
  drop: [[sLogo, 2.2], [sPlates, 3.0], [sCta, 2.8]],
  invite: [[sInvite, 3.2], [sCta, 2.8]],
};
const PLAN = FILMS[FILM] || FILMS.promo;
const DUR = PLAN.reduce((s, x) => s + x[1], 0);

function frame(t) {
  let inner = `<div class="bg"></div><div class="rays" style="transform:rotate(${t * 2.4}deg)"></div>`;
  let acc = 0;
  for (const [fn, len] of PLAN) {
    if (t >= acc && (t < acc + len || acc + len >= DUR - 0.001)) inner += fn(t - acc, len);
    acc += len;
  }
  inner += '<div class="vig"></div>';
  ST.style.opacity = Math.min(ease(loc(t, 0, 0.35)), 1 - loc(t, DUR - 0.4, DUR));
  ST.innerHTML = inner;
}
window.__seek = frame;
window.__dur = DUR;
window.__film = FILM;
window.__lang = LANG;
frame(0);
