// Лимми: блочный человечек-лимон в очках, с руками и ногами. Плоская графика без обводок, всё из прямоугольников.
// Состояния (data-s): idle, talk, think, happy, sad, wave (приветствует), teach (учит с указкой),
// show (показывает блюдо), cook (в поварском колпаке жарит), walk (идёт). Нажатие на него запускает следующее действие.
export const MOODS = ['idle', 'talk', 'think', 'happy', 'sad', 'wave', 'teach', 'show', 'cook', 'walk'];
export const TAP_MOVES = ['wave', 'teach', 'show', 'cook', 'happy', 'think'];

const PARTS = `
  <g class="mc-all">
    <ellipse class="mc-shadow" cx="60" cy="99" rx="30" ry="3.2"/>
    <g class="mc-leg mc-leg-l"><rect class="mc-limb" x="40" y="72" width="11" height="18" rx="3"/><rect class="mc-shoe" x="35" y="87" width="20" height="9" rx="3.5"/></g>
    <g class="mc-leg mc-leg-r"><rect class="mc-limb" x="69" y="72" width="11" height="18" rx="3"/><rect class="mc-shoe" x="65" y="87" width="20" height="9" rx="3.5"/></g>
    <g class="mc-arm mc-arm-l"><rect class="mc-limb" x="8" y="44" width="22" height="9" rx="4.5"/><rect class="mc-hand" x="4" y="42.5" width="10" height="12" rx="4"/></g>
    <g class="mc-top">
      <path class="mc-stem" d="M60 20 V10"/><path class="mc-leaf" d="M61 14 L66 6 L81 6 L81 12 L73 18 L61 18Z"/>
      <g class="mc-hat"><rect x="36" y="9" width="48" height="12" rx="2.5"/><rect x="31" y="-4" width="58" height="17" rx="8"/></g>
      <rect class="mc-body" x="24" y="19" width="72" height="56" rx="10"/>
      <path class="mc-shade" d="M24 63 H96 V65 a10 10 0 0 1 -10 10 H34 a10 10 0 0 1 -10 -10Z"/>
      <rect class="mc-shine" x="30" y="25" width="16" height="4" rx="2"/>
      <rect class="mc-cheek" x="29" y="58" width="9" height="5" rx="2.5"/><rect class="mc-cheek" x="82" y="58" width="9" height="5" rx="2.5"/>
      <g class="mc-eyes"><g class="mc-eyes-in">
        <rect class="mc-eye" x="40" y="39" width="8" height="12" rx="3"/><rect class="mc-glint" x="44" y="40" width="3" height="3" rx="1"/>
        <rect class="mc-eye" x="72" y="39" width="8" height="12" rx="3"/><rect class="mc-glint" x="76" y="40" width="3" height="3" rx="1"/>
      </g></g>
      <g class="mc-glasses"><rect x="33" y="32" width="22" height="25" rx="6"/><rect x="65" y="32" width="22" height="25" rx="6"/><path d="M55 43 H65 M33 40 L27 38 M87 40 L93 38"/></g>
      <path class="mc-m mc-m-idle" d="M52 62 Q60 68 68 62"/><ellipse class="mc-m mc-m-talk" cx="60" cy="64" rx="5.5" ry="4"/>
      <path class="mc-m mc-m-happy" d="M50 60 Q60 75 70 60Z"/><circle class="mc-m mc-m-think" cx="65" cy="64" r="2.6"/><path class="mc-m mc-m-sad" d="M52 67 Q60 60 68 67"/>
    </g>
    <g class="mc-arm mc-arm-r"><rect class="mc-limb" x="90" y="44" width="22" height="9" rx="4.5"/><rect class="mc-hand" x="106" y="42.5" width="10" height="12" rx="4"/>
      <g class="mc-prop mc-p-point"><path d="M114 48 H146"/><circle cx="147" cy="48" r="3"/></g>
      <g class="mc-prop mc-p-plate"><ellipse cx="124" cy="43" rx="14" ry="3.5"/><rect class="mc-dish" x="116" y="34" width="16" height="9" rx="4"/></g>
      <g class="mc-prop mc-p-pan"><path d="M112 48 H122"/><ellipse cx="136" cy="48" rx="15" ry="4"/><rect class="mc-food" x="130" y="40" width="9" height="6" rx="2.5"/></g>
    </g>
    <g class="mc-prop mc-p-idea"><path d="M100 8 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3z"/></g>
    <g class="mc-prop mc-p-dots"><circle cx="98" cy="14" r="2.4"/><circle cx="106" cy="10" r="2.4"/><circle cx="114" cy="6" r="2.4"/></g>
  </g>`;

const SVG = (state, w, h, vb, cls) => `<svg class="mc ${cls}" data-s="${state}" style="width:${w}px;height:${h}px" viewBox="${vb}" role="img" aria-hidden="true" focusable="false">${PARTS}</svg>`;

/** Весь человечек; size — высота в пикселях */
export const mascot = (state = 'idle', size = 64, cls = '') => SVG(state, Math.round(size * 1.3), size, '-6 -6 158 108', cls);
/** Только голова в очках: для иконок и маленьких аватаров */
export const face = (state = 'idle', size = 32, cls = '') => SVG(state, size, size, '18 0 84 80', `mc-face ${cls}`);

export function setMood(root, state) {
  for (const el of (root || document).querySelectorAll('.mc:not(.mc-fixed)')) el.dataset.s = state;
}

/** Показать настроение на время, потом вернуться к спокойному */
export function flash(root, state, ms = 1800) {
  setMood(root, state);
  clearTimeout(flash.t);
  flash.t = setTimeout(() => setMood(root, 'idle'), ms);
}

let tapN = 0;
/** Нажатие на персонажа: по очереди показывает приветствие, урок, блюдо, готовку и т. д. */
export function tap(el) {
  const move = TAP_MOVES[tapN++ % TAP_MOVES.length];
  el.dataset.s = move;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.dataset.s = 'idle'; }, 2600);
  return move;
}
