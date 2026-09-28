// Haptic feedback where the device supports it.
// Android and most other browsers: the Vibration API.
// iPhone (Safari 18 and later): Safari has no Vibration API, but toggling a
// native switch control gives a system haptic tick, so a hidden one is used.
import { S } from './state.js';

const PATTERNS = {
  light: 10,
  medium: 20,
  success: [15, 70, 25],
  promotion: [30, 60, 30, 60, 80],
};

let label = null;

function iosTick(times) {
  if (!label) {
    const id = 'rg-haptic';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.setAttribute('switch', '');
    label = document.createElement('label');
    label.htmlFor = id;
    label.setAttribute('aria-hidden', 'true');
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    box.append(input, label);
    document.body.appendChild(box);
  }
  for (let i = 0; i < times; i++) setTimeout(() => label.click(), i * 110);
}

export function haptic(kind = 'light') {
  if (S.settings && S.settings.haptics === false) return;
  const pattern = PATTERNS[kind] || PATTERNS.light;
  try {
    if (typeof navigator.vibrate === 'function') { navigator.vibrate(pattern); return; }
  } catch {}
  try { iosTick(Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1); } catch {}
}
