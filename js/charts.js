// Small hand-drawn SVG charts: a single-series line chart and a calendar heatmap.
// Both have a tap or drag readout so values can be checked on a phone.
import { esc } from './ui.js';
import { addDays, dayKey, weekKey, parseYmd } from './engine.js';

let seq = 0;

// points: [{ t: ms, y: number, label?: string }]
export function lineChart(points, { height = 180, yFormat = v => String(v), empty = 'No data yet.', steps = false } = {}) {
  if (!points.length) return `<div class="chart-empty">${esc(empty)}</div>`;
  const id = 'ch' + ++seq;
  const W = 340, H = height, L = 40, R = 12, T = 12, B = 24;
  const ts = points.map(p => p.t), ys = points.map(p => p.y);
  let t0 = Math.min(...ts), t1 = Math.max(...ts);
  if (t1 === t0) { t0 -= 86400000 * 3; t1 += 86400000 * 3; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.12 || Math.max(1, Math.abs(y1) * 0.05);
  y0 -= pad; y1 += pad;
  const x = t => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);

  const ticks = [];
  for (let i = 0; i <= 3; i++) ticks.push(y0 + ((y1 - y0) * i) / 3);
  const grid = ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="grid"/>
    <text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="axis">${esc(yFormat(v))}</text>`).join('');
  const fmtT = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const xl = `<text x="${L}" y="${H - 6}" class="axis">${fmtT(t0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="axis">${fmtT(t1)}</text>`;

  let d = '';
  points.forEach((p, i) => {
    const px = x(p.t).toFixed(1), py = y(p.y).toFixed(1);
    if (i === 0) d += `M${px} ${py}`;
    else if (steps) d += `H${px}V${py}`;
    else d += `L${px} ${py}`;
  });
  const last = points[points.length - 1];
  const dots = points.length <= 40 ? points.map(p => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3" class="dot"/>`).join('') : '';
  const data = esc(JSON.stringify(points.map(p => [x(p.t), y(p.y), p.label || `${fmtT(p.t)}: ${yFormat(p.y)}`])));

  return `<figure class="chart" id="${id}" data-points="${data}">
    <div class="chart-readout" aria-live="polite">${esc(last.label || `${fmtT(last.t)}: ${yFormat(last.y)}`)}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart">
      ${grid}${xl}
      <path d="${d}" class="line"/>${dots}
      <line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>
      <circle class="focus" r="6" visibility="hidden"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" class="hit"/>
    </svg>
  </figure>`;
}

// counts: Map dayKey -> number of working sets
export function heatmap(counts, { weeks = 26, now = new Date() } = {}) {
  const id = 'hm' + ++seq;
  const cell = 11, gap = 2, top = 14, left = 0;
  const lastWeek = weekKey(now);
  const firstWeek = addDays(lastWeek, -7 * (weeks - 1));
  const todayKey = dayKey(now);
  const vals = [...counts.values()];
  const max = Math.max(4, ...vals);
  let cells = '', months = '', prevMonth = -1;
  for (let wi = 0; wi < weeks; wi++) {
    const wk = addDays(firstWeek, wi * 7);
    const m = Number(wk.slice(5, 7));
    if (m !== prevMonth) {
      prevMonth = m;
      if (wi < weeks - 2) months += `<text x="${left + wi * (cell + gap)}" y="10" class="axis">${parseYmd(wk).toLocaleDateString('en-GB', { month: 'short' })}</text>`;
    }
    for (let di = 0; di < 7; di++) {
      const k = addDays(wk, di);
      if (k > todayKey) continue;
      const c = counts.get(k) || 0;
      const lvl = c === 0 ? 0 : Math.min(4, 1 + Math.floor((c / max) * 3.999));
      const label = `${parseYmd(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}: ${c ? c + ' working sets' : 'rest day'}`;
      cells += `<rect x="${left + wi * (cell + gap)}" y="${top + di * (cell + gap)}" width="${cell}" height="${cell}" rx="2" class="hm hm${lvl}" data-label="${esc(label)}"/>`;
    }
  }
  const W = left + weeks * (cell + gap), H = top + 7 * (cell + gap);
  return `<figure class="heatmap" id="${id}">
    <div class="chart-readout" aria-live="polite">Tap a day to see its sets.</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Training calendar, last ${weeks} weeks">${months}${cells}</svg>
    <div class="hm-legend"><span>Rest</span>${[0, 1, 2, 3, 4].map(l => `<i class="hm${l}"></i>`).join('')}<span>More sets</span></div>
  </figure>`;
}

// Attach readout behaviour to any charts inside root.
export function bindCharts(root) {
  root.querySelectorAll('.chart').forEach(fig => {
    const pts = JSON.parse(fig.dataset.points);
    const svg = fig.querySelector('svg');
    const cross = svg.querySelector('.cross'), focus = svg.querySelector('.focus');
    const out = fig.querySelector('.chart-readout');
    const move = e => {
      const r = svg.getBoundingClientRect();
      const vx = ((e.clientX - r.left) / r.width) * svg.viewBox.baseVal.width;
      let best = pts[0];
      for (const p of pts) if (Math.abs(p[0] - vx) < Math.abs(best[0] - vx)) best = p;
      cross.setAttribute('x1', best[0]); cross.setAttribute('x2', best[0]);
      focus.setAttribute('cx', best[0]); focus.setAttribute('cy', best[1]);
      cross.setAttribute('visibility', 'visible'); focus.setAttribute('visibility', 'visible');
      out.textContent = best[2];
    };
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointermove', move);
  });
  root.querySelectorAll('.heatmap').forEach(fig => {
    const out = fig.querySelector('.chart-readout');
    fig.querySelector('svg').addEventListener('pointerdown', e => {
      const r = e.target.closest('rect');
      if (!r) return;
      fig.querySelectorAll('rect.sel').forEach(x => x.classList.remove('sel'));
      r.classList.add('sel');
      out.textContent = r.dataset.label;
    });
  });
}
