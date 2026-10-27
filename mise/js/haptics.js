// Вибрация: короткие отклики на действия. На iPhone браузер её не поддерживает, там просто тишина.
import * as store from './store.js';

const PATTERNS = { tap: 8, step: 16, back: 10, start: [14, 40, 14], done: [30, 60, 30, 60, 60], alarm: [220, 110, 220, 110, 320] };
export const supported = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function buzz(kind = 'tap', force = false) {
  try {
    if (!supported() || (!force && !store.get().haptics)) return;
    navigator.vibrate(PATTERNS[kind] || PATTERNS.tap);
  } catch { /* не поддерживается */ }
}
