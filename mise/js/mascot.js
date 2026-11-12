// Лимми: добрый лимон-помощник. Плоский минималистичный SVG, настроение меняется атрибутом data-s:
// idle (улыбается и моргает), talk (говорит), think (думает), happy (радуется), sad (грустит).
export const MOODS = ['idle', 'talk', 'think', 'happy', 'sad'];

export function mascot(state = 'idle', size = 64, cls = '') {
  return `<svg class="mc ${cls}" data-s="${state}" style="width:${size}px;height:${size}px" viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false">
    <g class="mc-all">
      <ellipse class="mc-shadow" cx="50" cy="95" rx="24" ry="3.2"/>
      <g class="mc-body">
        <path class="mc-leaf" d="M52 20 C54 8 68 4 80 9 C76 20 63 25 52 20Z"/>
        <path class="mc-stem" d="M50 22 C50 17 51 14 53 11"/>
        <path class="mc-lemon" d="M50 18 C72 17 91 33 92 54 C93 75 74 91 50 91 C26 91 7 75 8 54 C9 33 28 19 50 18Z"/>
        <path class="mc-shine" d="M24 44 C26 34 34 28 42 26"/>
        <circle class="mc-cheek" cx="27" cy="62" r="5.5"/><circle class="mc-cheek" cx="73" cy="62" r="5.5"/>
        <g class="mc-eyes"><g class="mc-eyes-in">
          <ellipse class="mc-eye" cx="38" cy="50" rx="4.6" ry="5.6"/><circle class="mc-glint" cx="39.8" cy="48" r="1.5"/>
          <ellipse class="mc-eye" cx="62" cy="50" rx="4.6" ry="5.6"/><circle class="mc-glint" cx="63.8" cy="48" r="1.5"/>
        </g></g>
        <path class="mc-m mc-m-idle" d="M41 62 Q50 70 59 62"/>
        <ellipse class="mc-m mc-m-talk" cx="50" cy="65" rx="5.5" ry="4"/>
        <path class="mc-m mc-m-happy" d="M39 60 Q50 78 61 60 Z"/>
        <circle class="mc-m mc-m-think" cx="55" cy="65" r="2.6"/>
        <path class="mc-m mc-m-sad" d="M42 68 Q50 61 58 68"/>
      </g>
    </g>
  </svg>`;
}

/** Меняет настроение уже нарисованного персонажа */
export function setMood(root, state) {
  for (const el of (root || document).querySelectorAll('.mc')) el.dataset.s = state;
}

/** Настроение на время: дольше «радуется», потом возвращается к спокойному */
export function flash(root, state, ms = 1800) {
  setMood(root, state);
  clearTimeout(flash.t);
  flash.t = setTimeout(() => setMood(root, 'idle'), ms);
}
