// Front and back body figures. Each muscle is its own shape, filled with the
// colour of its rank. Shapes are drawn for the figure's right side (viewer's
// left) and mirrored.
import { TIER_KEYS } from './engine.js';
import { MUSCLE_BY_KEY } from './library.js';
import { esc } from './ui.js';

const FRONT = {
  traps: 'M92 55 C88 60 82 64 76 67 L90 68 C92 64 93 60 92 55 Z',
  sdelt: 'M66 68 C57 71 52 80 52 92 C52 97 53 101 55 104 L62 100 C61 89 63 78 69 70 Z',
  fdelt: 'M69 70 C63 78 61 89 62 100 L70 96 C75 88 79 78 83 69 C78 67 73 67 69 70 Z',
  chest: 'M84 69 C91 67 97 68 99 70 L99 104 C91 109 79 108 72 100 C72 89 76 78 84 69 Z',
  biceps: 'M55 107 C51 117 51 131 53 143 L63 144 C66 133 67 118 64 103 Z',
  forearms: 'M53 148 C48 161 47 178 48 196 L56 197 C60 182 63 164 63 148 Z',
  abs: 'M89 110 L99 110 L99 174 L91 172 C89 152 88 130 89 110 Z',
  obliques: 'M72 104 C78 109 84 111 87 111 C86 133 87 153 89 173 L80 178 C76 162 72 138 72 104 Z',
  quads: 'M75 190 C70 214 70 242 75 266 L89 270 C95 250 97 218 96 194 C89 192 81 190 75 190 Z',
  adductors: 'M97 194 L99 194 L99 240 C96 234 94 222 94 210 C95 204 96 198 97 194 Z',
  calves: 'M76 285 C71 304 72 330 78 352 L87 352 C91 332 92 304 89 285 Z',
};

const BACK = {
  traps: 'M99 54 L99 118 C94 104 90 90 86 78 L70 70 C80 66 90 62 99 54 Z',
  rdelt: 'M66 69 C57 72 52 81 52 93 C52 98 53 101 55 104 L64 98 C64 88 66 78 70 71 Z',
  upback: 'M70 72 L85 78 C89 90 92 100 94 108 L76 110 C73 98 71 86 70 72 Z',
  lats: 'M74 112 L95 110 C97 124 98 138 99 150 C92 158 85 164 80 170 C76 152 73 132 74 112 Z',
  lowback: 'M88 152 L99 152 L99 180 L84 180 C86 170 87 161 88 152 Z',
  triceps: 'M55 107 C51 118 51 132 53 145 L63 145 C66 133 67 118 64 102 Z',
  forearms: 'M53 149 C48 162 47 178 48 196 L56 197 C60 182 63 165 63 149 Z',
  glutes: 'M76 182 L99 182 L99 220 C90 224 80 220 74 212 C71 202 72 191 76 182 Z',
  hams: 'M75 220 C81 225 92 226 98 222 C98 242 96 258 92 272 L80 272 C76 254 73 236 75 220 Z',
  adductors: 'M98 224 L99 224 L99 250 C98 244 97 234 98 224 Z',
  calves: 'M77 286 C70 300 70 322 77 340 L89 340 C94 322 94 300 90 286 Z',
};

const BASE_FRONT = `
  <ellipse cx="100" cy="30" rx="16" ry="20"/>
  <path d="M92 48 L108 48 L109 60 L91 60 Z"/>
  <ellipse cx="52" cy="206" rx="6" ry="9"/><ellipse cx="148" cy="206" rx="6" ry="9"/>
  <path d="M74 176 L126 176 L128 192 L100 200 L72 192 Z"/>
  <ellipse cx="83" cy="277" rx="8" ry="7"/><ellipse cx="117" cy="277" rx="8" ry="7"/>
  <path d="M76 354 L90 354 L92 368 L72 368 Z"/><path d="M110 354 L124 354 L128 368 L108 368 Z"/>`;
const BASE_BACK = `
  <ellipse cx="100" cy="30" rx="16" ry="20"/>
  <path d="M92 48 L108 48 L109 58 L91 58 Z"/>
  <ellipse cx="52" cy="206" rx="6" ry="9"/><ellipse cx="148" cy="206" rx="6" ry="9"/>
  <ellipse cx="84" cy="279" rx="8" ry="6"/><ellipse cx="116" cy="279" rx="8" ry="6"/>
  <path d="M77 342 L89 342 L90 366 L74 366 Z"/><path d="M111 342 L123 342 L126 366 L110 366 Z"/>`;

function fillFor(m) {
  if (!m || !m.trained) return 'var(--body-empty)';
  return `var(--${TIER_KEYS[m.tier]})`;
}

function label(key, m) {
  const name = MUSCLE_BY_KEY[key].name;
  if (!m || !m.trained) return `${name}: not ranked yet`;
  return `${name}: ${['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion'][m.tier]} ${['III', 'II', 'I'][m.div]}${m.inactive ? ', inactive' : ''}`;
}

export function bodyFigure(view, muscles, { width = 150, interactive = true } = {}) {
  const shapes = view === 'front' ? FRONT : BACK;
  const parts = Object.entries(shapes).map(([key, d]) => {
    const m = muscles[key];
    const cls = ['mus', m && m.trained && m.tier === 5 && !m.inactive ? 'champ' : '', m && m.trained && m.inactive ? 'inactive' : ''].join(' ');
    const attrs = `fill="${fillFor(m)}" data-muscle="${key}" class="${cls}"`;
    const title = `<title>${esc(label(key, m))}</title>`;
    return `<path d="${d}" ${attrs}>${title}</path><path d="${d}" ${attrs} transform="translate(200 0) scale(-1 1)">${title}</path>`;
  }).join('');
  return `<svg class="body-fig ${interactive ? 'tappable' : ''}" viewBox="40 0 120 372" width="${width}" role="img" aria-label="${view === 'front' ? 'Front' : 'Back'} of body, muscles coloured by rank">
    <g class="body-base">${view === 'front' ? BASE_FRONT : BASE_BACK}</g>
    <g class="body-muscles">${parts}</g>
  </svg>`;
}

export function bodyLegend() {
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion'];
  return `<div class="body-legend">${tiers.map((t, i) => `<span><i style="background:var(--${TIER_KEYS[i]})"></i>${t}</span>`).join('')}
    <span><i style="background:var(--body-empty)"></i>Not ranked</span><span><i style="background:var(--gold);opacity:.35;outline:1px dashed var(--muted);outline-offset:-1px"></i>Inactive (faded)</span></div>`;
}
