// Progress: PBs, charts, rank history, bodyweight, calendar.
import { S, save, derived, exById, w as fmtW, num, toDisp, fromDisp, unit } from '../state.js';
import { esc, icon, fmtDate, badge, toast } from '../ui.js';
import { lineChart, heatmap, weekBars } from '../charts.js';
import { rankName, scoreToRank, TIERS, DIVS, dayKey, weekKey, addDays, isSession, targetForWeek } from '../engine.js';
import { render as rerender } from '../app.js';

const SECTIONS = [['pbs', 'PBs'], ['charts', 'Charts'], ['ranks', 'Ranks'], ['bw', 'Bodyweight'], ['cal', 'Calendar']];
const pref = (k, def) => { try { return localStorage.getItem('rg-' + k) || def; } catch { return def; } };
const setPref = (k, v) => { try { localStorage.setItem('rg-' + k, v); } catch {} };

let section = pref('progress', 'pbs');
let chartEx = pref('chart-ex', 'squat');
let range = pref('chart-range', 'all');

export function render([sec]) {
  if (sec && SECTIONS.some(s => s[0] === sec)) section = sec;
  const body = { pbs, charts, ranks, bw, cal }[section]();
  return `<div class="head"><h1>Progress</h1></div>
    <div class="seg" role="tablist">${SECTIONS.map(([k, l]) => `<button role="tab" class="${section === k ? 'on' : ''}" data-act="sec" data-k="${k}" aria-selected="${section === k}">${l}</button>`).join('')}</div>
    ${body}`;
}

function exWithPbs() {
  const d = derived();
  return S.exercises.filter(e => d.pbs[e.id] && d.pbs[e.id].sessions > 0)
    .sort((a, b) => (b.ranked - a.ranked) || a.name.localeCompare(b.name));
}

function pbs() {
  const d = derived();
  const list = exWithPbs();
  if (!list.length) return '<section class="card"><p class="muted" style="margin:0">Personal bests appear here after your first workout.</p></section>';
  return `<section class="card flush" style="margin-top:12px">${list.map(e => {
    const pb = d.pbs[e.id];
    const bw = e.type === 'bodyweight';
    const main = pb.e1rm > 0 ? `${bw ? '+' : ''}${fmtW(pb.e1rm)}` : (bw && pb.maxReps ? `${pb.maxReps} reps` : '');
    return `<a class="row" href="#/exercise/${encodeURIComponent(e.id)}" data-act="go" data-to="exercise/${esc(encodeURIComponent(e.id))}">
      <div class="grow"><div class="title">${esc(e.name)}</div><div class="sub">${bw ? 'Added-weight est. 1RM' : 'Estimated 1RM'}${pb.e1rmSet ? ` · ${fmtDate(pb.e1rmSet.date)}` : ''}</div></div>
      <div class="end num" style="font-weight:700">${main}</div>${icon('chev')}
    </a>`;
  }).join('')}</section>`;
}

export function e1rmChart(exId, rng = 'all') {
  const d = derived();
  const pb = d.pbs[exId];
  const ex = exById(exId);
  let pts = pb ? pb.history.map(h => ({ t: new Date(h.date).getTime(), y: toDisp(h.e1rm) })) : [];
  const cutoff = { '3m': 91, '1y': 365 }[rng];
  if (cutoff) pts = pts.filter(p => p.t >= Date.now() - cutoff * 86400000);
  const bw = ex && ex.type === 'bodyweight';
  return lineChart(pts, { yFormat: v => `${bw && v > 0 ? '+' : ''}${num(v, 0)}`, empty: 'No sets in this range yet.', best: true });
}

function charts() {
  const list = exWithPbs();
  if (!list.length) return '<section class="card"><p class="muted" style="margin:0">Charts appear here after your first workout.</p></section>';
  if (!list.some(e => e.id === chartEx)) chartEx = list[0].id;
  const ex = exById(chartEx);
  return `<section class="card">
    <select class="input" data-change="chart-ex" aria-label="Exercise">${list.map(e => `<option value="${esc(e.id)}" ${e.id === chartEx ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>
    <div class="seg" style="margin-top:10px">${[['3m', '3M'], ['1y', '1Y'], ['all', 'All']].map(([k, l]) => `<button class="${range === k ? 'on' : ''}" data-act="range" data-k="${k}">${l}</button>`).join('')}</div>
    <p class="muted small" style="margin:12px 0 0">Best ${ex.type === 'bodyweight' ? 'added-weight ' : ''}estimated 1RM per session (${unit()})</p>
    ${e1rmChart(chartEx, range)}
  </section>`;
}

const shortRank = s => { const r = scoreToRank(s); return `${TIERS[r.tier].slice(0, 2)} ${DIVS[r.div]}`; };

function ranks() {
  const d = derived();
  const pts = d.overallHistory.map(h => ({ t: new Date(h.date).getTime(), y: h.score, label: `${fmtDate(h.date)}: ${(() => { const r = scoreToRank(h.score); return rankName(r.tier, r.div); })()}` }));
  const events = d.events.slice().reverse().slice(0, 60);
  const rows = events.map(e => {
    const ex = exById(e.liftId);
    const what = e.type === 'promotion' ? 'Promoted to' : e.type === 'placement' ? 'Placed in' : 'Reached';
    return `<div class="row">${badge(e.tier, e.div, { size: 32 })}<div class="grow"><div class="title">${esc(ex ? ex.name : '')}</div><div class="sub">${what} ${rankName(e.tier, e.div)}</div></div><div class="end muted small">${fmtDate(e.date)}</div></div>`;
  }).join('');
  return `<section class="card"><h2>Overall rank over time</h2>${lineChart(pts, { yFormat: shortRank, empty: 'Your overall rank history starts with your first workout.', steps: true })}</section>
    <div class="section-title">Rank history</div>
    <section class="card flush">${rows || '<div class="empty">Division changes and promotions will be listed here.</div>'}</section>`;
}

function bw() {
  const list = [...S.bodyweight].sort((a, b) => (a.date < b.date ? 1 : -1));
  const pts = [...list].reverse().map(b => ({ t: new Date(b.date + 'T12:00').getTime(), y: toDisp(b.kg) }));
  return `<section class="card">
    <h2>Log bodyweight</h2>
    <div style="display:flex;gap:10px">
      <input class="input" id="bw-in" type="text" inputmode="decimal" placeholder="${num(toDisp(S.settings.bodyweight))}" aria-label="Bodyweight in ${unit()}">
      <button class="btn primary" data-act="bw-add">Save</button>
    </div>
    <p class="muted small" style="margin:8px 0 0">Used for XP and pull-up loads. The latest entry updates your bodyweight in Settings.</p>
  </section>
  <section class="card"><h2>Bodyweight (${unit()})</h2>${lineChart(pts, { yFormat: v => num(v, 1), empty: 'No entries yet.' })}</section>
  ${list.length ? `<section class="card flush">${list.slice(0, 30).map(b => `<div class="row"><div class="grow">${fmtDate(b.date + 'T12:00', { day: 'numeric', month: 'short', year: 'numeric' })}</div><div class="num">${fmtW(b.kg)}</div><button class="icon-btn plain" data-act="bw-del" data-date="${b.date}" aria-label="Delete entry">${icon('trash')}</button></div>`).join('')}</section>` : ''}`;
}

function cal() {
  const d = derived();
  const sessions = S.workouts.filter(w => !w.placement);
  const counts = new Map();
  for (const w of sessions) if (isSession(w)) { const k = weekKey(w.date); counts.set(k, (counts.get(k) || 0) + 1); }
  const thisWeek = weekKey(new Date());
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const key = addDays(thisWeek, -7 * (11 - i));
    return { key, count: counts.get(key) || 0, target: targetForWeek(S.settings, key) };
  });
  return `<section class="card"><h2>Sessions per week</h2>${weekBars(weeks)}</section>
    <section class="card"><h2>Last 26 weeks</h2>${heatmap(d.dayCounts)}</section>
    <div class="stats">
      <section class="stat"><div class="label">Sessions logged</div><div class="value">${d.sessionCount}</div></section>
      <section class="stat"><div class="label">Total XP</div><div class="value">${Math.round(d.totalXP).toLocaleString('en-GB')}</div></section>
    </div>
    ${sessions.length ? '' : '<p class="muted small">Each square is a day. Darker squares mean more working sets.</p>'}`;
}

export const actions = {
  sec: el => { section = el.dataset.k; setPref('progress', section); rerender(); },
  range: el => { range = el.dataset.k; setPref('chart-range', range); rerender(); },
  'chart-ex': el => { chartEx = el.value; setPref('chart-ex', chartEx); rerender(); },
  'bw-add': async () => {
    const v = parseFloat(document.getElementById('bw-in').value.replace(',', '.'));
    if (isNaN(v) || v < 20 || v > 400) { toast('Enter a bodyweight.'); return; }
    const kg = fromDisp(v);
    const today = dayKey(new Date());
    S.bodyweight = S.bodyweight.filter(b => b.date !== today);
    S.bodyweight.push({ date: today, kg });
    S.settings.bodyweight = kg;
    await save('bodyweight', 'settings');
    toast('Bodyweight saved.');
    rerender();
  },
  'bw-del': async el => {
    S.bodyweight = S.bodyweight.filter(b => b.date !== el.dataset.date);
    await save('bodyweight');
    rerender();
  },
};

export const tab = 'progress';
