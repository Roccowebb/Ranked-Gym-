// Rank tests: next benchmark per lift, how close, best qualifying set.
import { S, derived, rankedLifts, w as fmtW } from '../state.js';
import { esc, badge, bar, tierColor, fmtDate, icon } from '../ui.js';
import { TIERS, benchFor, rankName, DIV_XP } from '../engine.js';

export function benchText(ex, b) {
  if (!b) return 'Not set';
  const scale = S.settings.benchmarkScale || 1;
  const parts = [];
  if (b.reps > 0) parts.push(`${b.reps} bodyweight reps`);
  if (b.kg > 0) parts.push(ex.type === 'bodyweight' ? `+${fmtW(b.kg * scale)} added (e1RM)` : `${fmtW(b.kg * scale)} e1RM`);
  return parts.join(' or ');
}

export function bestText(ex, pb) {
  if (!pb) return 'Nothing logged yet';
  const out = [];
  if (pb.qualSet) {
    const s = pb.qualSet;
    const est = ex.type === 'bodyweight' ? pb.qualAdded : pb.qualE1rm;
    out.push(`${ex.type === 'bodyweight' ? `BW+${fmtW(s.weight)}` : fmtW(s.weight)} x ${s.reps} (${ex.type === 'bodyweight' ? '+' : ''}${fmtW(est)} e1RM), ${fmtDate(s.date)}`);
  }
  if (ex.type === 'bodyweight' && pb.maxReps) out.push(`${pb.maxReps} reps in a set`);
  return out.join('<br>') || 'No qualifying set yet (1 to 5 reps)';
}

export function render() {
  const d = derived();
  const cards = rankedLifts().map(ex => {
    const l = d.liftById[ex.id];
    const pb = d.pbs[ex.id];
    if (l.tier === 5) {
      return `<section class="card test-card"><div class="top">${badge(l.tier, l.div, { size: 44 })}<div class="grow"><h2 style="margin:0">${esc(ex.name)}</h2><div class="muted small">${rankName(l.tier, l.div)}</div></div></div>
        <p class="muted" style="margin:10px 0 0">Champion is the top tier. There are no more tests for this lift.</p></section>`;
    }
    const next = l.tier + 1;
    const b = benchFor(ex, next);
    const pct = l.testProgress;
    let status;
    if (!b) status = 'Add a benchmark in Settings to allow promotion.';
    else if (l.full) status = pct >= 1 ? 'Test passed. Promotion happens at the end of your next session.' : `XP full. Log a qualifying set to be promoted to ${TIERS[next]}.`;
    else status = `The test unlocks when ${TIERS[l.tier]} I is full (${l.div === 2 ? `${Math.floor(l.xp)} / ${DIV_XP[l.tier]} XP` : `now ${rankName(l.tier, l.div)}`}).${pct >= 1 ? ' You already have a qualifying set.' : ''}`;
    return `<section class="card test-card">
      <div class="top">
        ${badge(l.tier, l.div, { size: 44, inactive: l.inactive })}
        <div class="grow"><h2 style="margin:0">${esc(ex.name)}</h2><div class="muted small">${rankName(l.tier, l.div)} to ${TIERS[next]}</div></div>
        <div class="pct">${pct == null ? '' : Math.floor(pct * 100) + '%'}</div>
      </div>
      ${pct == null ? '' : `<div style="margin:12px 0 4px">${bar(pct, tierColor(next))}</div>`}
      <div class="kv"><span>Benchmark</span><span>${benchText(ex, b)}</span></div>
      <div class="kv"><span>Best so far</span><span>${bestText(ex, pb)}</span></div>
      <p class="small ${l.full && b ? '' : 'muted'}" style="margin:8px 0 0">${status}</p>
    </section>`;
  }).join('');

  return `<div class="head"><h1>Rank tests</h1></div>
    <p class="muted small" style="margin:0 4px">A test passes on the estimated 1RM (Epley) of a working set of 1 to 5 reps, or a true single, from any date. Bodyweight rep tests accept any rep count.</p>
    ${cards || '<section class="card"><p class="muted" style="margin:0">No ranked lifts. Add one in Settings.</p></section>'}
    <section class="card notice" style="margin-top:20px"><p>These benchmarks are starting points, not official standards. You can change them in Settings.</p>
      <button class="btn sm" data-act="go" data-to="settings" aria-label="Open Settings">${icon("settings")}</button></section>`;
}

export const tab = 'tests';
