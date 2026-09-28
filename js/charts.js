// Small hand-drawn SVG charts: a single-series line chart and a calendar heatmap.
// Both have a tap or drag readout so values can be checked on a phone.
import { esc } from './ui.js';
import { addDays, dayKey, weekKey, parseYmd } from './engine.js';

let seq = 0;

// Round axis ticks to 1, 2, 2.5 or 5 times a power of ten.
function niceTicks(lo, hi, count = 4) {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(st => st >= raw) || raw;
  const start = Math.floor(lo / step) * step;
  const ticks = [];
  for (let v = start; v <= hi + step * 0.5; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

// points: [{ t: ms, y: number, label?: string }]
export function lineChart(points, { height = 180, yFormat = v => String(v), empty = 'No data yet.', steps = false, best = false, bestLabel = 'PB' } = {}) {
  if (!points.length) return `<div class="chart-empty">${esc(empty)}</div>`;
  const id = 'ch' + ++seq;
  const W = 340, H = height, L = 40, R = 12, T = 12, B = 24;
  const ts = points.map(p => p.t), ys = points.map(p => p.y);
  let t0 = Math.min(...ts), t1 = Math.max(...ts);
  if (t1 === t0) { t0 -= 86400000 * 3; t1 += 86400000 * 3; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.12 || Math.max(1, Math.abs(y1) * 0.05);
  const ticks = niceTicks(y0 - pad, y1 + pad);
  y0 = ticks[0]; y1 = ticks[ticks.length - 1];
  const x = t => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);

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
  const x0 = x(points[0].t).toFixed(1), yB = (H - B).toFixed(1);
  const area = points.length > 1 ? `<path d="${d}V${yB}H${x0}Z" fill="url(#${id}-fill)" class="area"/>` : '';
  let bestMark = '';
  if (best && points.length > 1) {
    const top = points.reduce((a, p) => (p.y >= a.y ? p : a));
    const bx = x(top.t), by = y(top.y);
    const anchor = bx > W - 60 ? 'end' : bx < L + 30 ? 'start' : 'middle';
    bestMark = `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="6" class="best-ring"/>
      <text x="${bx.toFixed(1)}" y="${(by - 11).toFixed(1)}" text-anchor="${anchor}" class="best-label">${esc(bestLabel)}</text>`;
  }
  const dots = points.length <= 12 ? points.map(p => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3" class="dot"/>`).join('') : '';
  const data = esc(JSON.stringify(points.map(p => [x(p.t), y(p.y), p.label || `${fmtT(p.t)}: ${yFormat(p.y)}`])));

  return `<figure class="chart" id="${id}" data-points="${data}">
    <div class="chart-readout" aria-live="polite">${esc(last.label || `${fmtT(last.t)}: ${yFormat(last.y)}`)}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart">
      <defs><linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      ${grid}${xl}${area}
      <path d="${d}" class="line"/>${dots}${bestMark}
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
      const r = e.target.closest('[data-label]');
      if (!r) return;
      fig.querySelectorAll('rect.sel').forEach(x => x.classList.remove('sel'));
      r.classList.add('sel');
      out.textContent = r.dataset.label;
    });
  });
}

// Sessions per week against the weekly target. weeks: [{ key, count, target }]
export function weekBars(weeks) {
  if (!weeks.length) return '<div class="chart-empty">No weeks yet.</div>';
  const W = 340, H = 150, L = 24, R = 4, T = 10, B = 22;
  const max = Math.max(3, ...weeks.map(w => Math.max(w.count, w.target)));
  const bw = (W - L - R) / weeks.length;
  const y = v => T + (1 - v / max) * (H - T - B);
  let bars = '', grid = '';
  for (let v = 0; v <= max; v += max > 6 ? 2 : 1) {
    grid += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="grid"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="axis">${v}</text>`;
  }
  weeks.forEach((w, i) => {
    const x0 = L + i * bw + 2, width = Math.max(4, bw - 4);
    const hit = w.count >= w.target;
    const label = `Week of ${parseYmd(w.key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${w.count} of ${w.target}${hit ? ', target hit' : i === weeks.length - 1 ? ', this week so far' : ''}`;
    const h = Math.max(0, y(0) - y(w.count));
    if (w.count > 0) bars += `<path d="M${x0} ${y(0)}V${(y(0) - h + Math.min(4, h)).toFixed(1)}q0 -4 4 -4h${(width - 8).toFixed(1)}q4 0 4 4V${y(0)}Z" class="${hit ? 'wb-hit' : 'wb'}"/>`;
    bars += `<line x1="${x0}" x2="${(x0 + width).toFixed(1)}" y1="${y(w.target).toFixed(1)}" y2="${y(w.target).toFixed(1)}" class="wb-target"/>`;
    bars += `<rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" data-label="${esc(label)}"/>`;
    if (i === 0 || i === weeks.length - 1) bars += `<text x="${i === 0 ? x0 : (x0 + width).toFixed(1)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : 'end'}" class="axis">${parseYmd(w.key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>`;
  });
  return `<figure class="heatmap wbars">
    <div class="chart-readout" aria-live="polite">Tap a week to see its sessions.</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sessions per week against target">${grid}${bars}</svg>
    <div class="hm-legend"><i class="lg-hit"></i><span>Target hit</span><i class="lg-miss"></i><span>Below target</span><i class="lg-target"></i><span>Target</span></div>
  </figure>`;
}
