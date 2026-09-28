// Small UI helpers shared by the screens.
import { TIER_KEYS, TIERS, DIVS, DIV_XP } from './engine.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let badgeSeq = 0;
const SHIELD = 'M50 4 L92 20 V58 C92 84 74 100 50 110 C26 100 8 84 8 58 V20 Z';
const INNER = 'M50 16 L81 28 V58 C81 78 68 91 50 99 C32 91 19 78 19 58 V28 Z';

export function badge(tier, div, { size = 44, inactive = false, cls = '' } = {}) {
  const id = 'bg' + ++badgeSeq;
  const col = inactive ? 'var(--inactive)' : `var(--${TIER_KEYS[tier]})`;
  const h = Math.round(size * 1.14);
  return `<svg class="badge ${cls}" width="${size}" height="${h}" viewBox="0 0 100 114" role="img" aria-label="${TIERS[tier]} ${DIVS[div]}${inactive ? ', inactive' : ''}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient></defs>
    <path d="${SHIELD}" fill="${col}"/><path d="${SHIELD}" fill="url(#${id})"/>
    <path d="${INNER}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>
    ${tier === 5 ? '<path d="M34 40 L42 50 L50 36 L58 50 L66 40 L63 58 H37 Z" fill="#fff" fill-opacity=".9"/>' : ''}
    <text x="50" y="${tier === 5 ? 86 : 72}" text-anchor="middle" font-size="${tier === 5 ? 26 : 34}" font-weight="800" fill="#fff"
      font-family="-apple-system, BlinkMacSystemFont, sans-serif" style="paint-order:stroke" stroke="rgba(0,0,0,.25)" stroke-width="2">${DIVS[div]}</text>
  </svg>`;
}

export function bar(frac, color, cls = '') {
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  return `<div class="bar ${cls}"><span style="width:${pct.toFixed(1)}%;background:${color}"></span></div>`;
}

export const tierColor = (tier, inactive) => (inactive ? 'var(--inactive)' : `var(--${TIER_KEYS[tier]})`);

export function xpText(l) {
  if (l.tier === 5 && l.div === 2) return `${Math.round(l.xp).toLocaleString('en-GB')} Champion points`;
  return `${Math.floor(l.xp).toLocaleString('en-GB')} / ${DIV_XP[l.tier].toLocaleString('en-GB')} XP`;
}

export function fmtDate(iso, opts = { day: 'numeric', month: 'short' }) {
  return new Date(iso).toLocaleDateString('en-GB', opts);
}
export function fmtDateLong(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---- Sheet (bottom modal) ----

export function openSheet(html, { onClose, cls = '' } = {}) {
  closeSheet();
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop" data-close></div><div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  wrap._onClose = onClose;
  wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  return wrap.querySelector('.sheet');
}

export function closeSheet() {
  const wrap = document.querySelector('.sheet-wrap');
  if (!wrap) return;
  wrap.remove();
  if (wrap._onClose) wrap._onClose();
}

// ---- Toast ----

export function toast(msg, ms = 2600) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

export function icon(name) {
  const p = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    train: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    progress: '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/>',
    tests: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
  }[name];
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
