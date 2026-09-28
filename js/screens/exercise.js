// Exercise detail: rank (for ranked lifts), e1RM chart, PB table, rank history.
import { derived, exById, w as fmtW, num, toDisp, unit } from '../state.js';
import { esc, icon, badge, bar, tierColor, xpText, fmtDate } from '../ui.js';
import { rankName } from '../engine.js';
import { e1rmChart } from './progress.js';
import { benchText, bestText } from './tests.js';
import { benchFor, TIERS, exerciseStrength } from '../engine.js';
import { MUSCLE_BY_KEY } from '../library.js';
import { S } from '../state.js';

export const full = true;

export function render([id]) {
  const ex = exById(id);
  const head = `<div class="head"><button class="icon-btn plain" data-act="back" data-fallback="home" aria-label="Back">${icon('back')}</button>
    <h1 class="sm" style="flex:1">${esc(ex ? ex.name : 'Exercise')}</h1>
    ${ex ? `<button class="btn sm ghost" data-act="go" data-to="exedit/${esc(encodeURIComponent(id))}">Edit</button>` : ''}</div>`;
  if (!ex) return head + '<div class="card">Exercise not found.</div>';
  const d = derived();
  const l = d.liftById[id];
  const pb = d.pbs[id];
  const bw = ex.type === 'bodyweight';

  let rank = '';
  if (l) {
    const frac = l.tier === 5 && l.div === 2 ? 1 : l.xp / l.perDiv;
    const next = l.tier < 5 ? benchFor(ex, l.tier + 1) : null;
    rank = `<section class="card overall">
      ${badge(l.tier, l.div, { size: 80, inactive: l.inactive })}
      <div style="flex:1;min-width:0">
        <div class="label">${l.inactive ? 'Inactive' : 'Rank'}</div>
        <div class="rank" style="font-size:28px">${rankName(l.tier, l.div)}</div>
        ${bar(frac, tierColor(l.tier, l.inactive))}
        <div class="sub">${xpText(l)}${l.bank > 0 ? ` · ${Math.floor(l.bank)} XP banked` : ''}</div>
        ${l.inactive ? `<div class="sub">Last trained ${l.daysSince} days ago. Log it again to clear this.</div>` : ''}
      </div>
    </section>
    ${l.tier < 5 ? `<section class="card"><h2>${TIERS[l.tier + 1]} test</h2>
      <div class="kv"><span>Benchmark</span><span>${benchText(ex, next)}</span></div>
      <div class="kv"><span>Best so far</span><span style="text-align:right">${bestText(ex, pb)}</span></div>
      ${l.testProgress != null ? `<div style="margin-top:8px">${bar(l.testProgress, tierColor(l.tier + 1))}</div><div class="muted small" style="margin-top:6px">${Math.floor(l.testProgress * 100)}% of the benchmark</div>` : ''}
    </section>` : ''}`;
  } else if (!ex.ranked) {
    const st = exerciseStrength(ex, pb, S.settings.benchmarkScale || 1);
    const next = st && st.tier < 5 ? benchFor(ex, st.tier + 1) : null;
    rank = st ? `<section class="card overall">
      ${badge(st.tier, st.div, { size: 64 })}
      <div style="flex:1;min-width:0">
        <div class="label">Strength rank</div>
        <div class="rank" style="font-size:26px">${rankName(st.tier, st.div)}</div>
        ${next ? `${bar(st.next || 0, tierColor(st.tier + 1))}<div class="sub">${Math.floor((st.next || 0) * 100)}% of ${TIERS[st.tier + 1]}: ${benchText(ex, next)}</div>` : '<div class="sub">Top tier</div>'}
      </div></section>` : '';
    rank += '<p class="muted small" style="margin:8px 4px 0">Accessory: earns XP for your ranked lifts and sets the rank of the muscles it trains. It has no XP bar or rank test of its own.</p>';
  }
  if (ex.muscles && ex.muscles.length) {
    rank += `<p class="small" style="margin:8px 4px 0"><span class="muted">Muscles:</span> ${ex.muscles.map((k, i) => esc((MUSCLE_BY_KEY[k]?.name || k) + (i === 0 ? ' (main)' : ''))).join(', ')}</p>`;
  }

  let pbTable = '<p class="muted" style="margin:0">No sets logged yet.</p>';
  if (pb && pb.sessions) {
    const reps = Array.from({ length: 10 }, (_, i) => i + 1).filter(r => pb.repMax[r]);
    pbTable = `
      <div class="kv"><span>${bw ? 'Added-weight est. 1RM' : 'Estimated 1RM'}</span><span class="num" style="font-weight:700">${pb.e1rm > 0 ? (bw ? '+' : '') + fmtW(pb.e1rm) : '-'}</span></div>
      <div class="kv"><span>Best set volume</span><span class="num">${pb.volumeSet ? `${num(toDisp(pb.bestVolume), 0)} ${unit()} (${bw ? 'BW+' : ''}${fmtW(pb.volumeSet.weight)} x ${pb.volumeSet.reps})` : '-'}</span></div>
      ${bw ? `<div class="kv"><span>Most reps in a set</span><span class="num">${pb.maxReps || '-'}</span></div>` : ''}
      ${reps.length ? `<table class="t" style="margin-top:8px"><thead><tr><th>Reps</th><th class="r">Heaviest${bw ? ' added' : ''}</th><th class="r">Date</th></tr></thead><tbody>
        ${reps.map(r => `<tr><td>${r}</td><td class="r">${bw ? '+' : ''}${fmtW(pb.repMax[r].weight)}</td><td class="r muted">${fmtDate(pb.repMax[r].date)}</td></tr>`).join('')}
      </tbody></table>` : ''}`;
  }

  const events = d.events.filter(e => e.liftId === id).slice().reverse().slice(0, 20);
  const history = events.length ? `<div class="section-title">Rank history</div><section class="card flush">${events.map(e => `<div class="row">${badge(e.tier, e.div, { size: 28 })}<div class="grow">${e.type === 'promotion' ? 'Promoted to' : e.type === 'placement' ? 'Placed in' : 'Reached'} ${rankName(e.tier, e.div)}</div><div class="muted small">${fmtDate(e.date)}</div></div>`).join('')}</section>` : '';

  return `${head}${rank}
    <section class="card"><h2>${bw ? 'Added-weight e' : 'E'}stimated 1RM (${unit()})</h2>${e1rmChart(id)}</section>
    <section class="card"><h2>Personal bests</h2>${pbTable}</section>
    ${history}`;
}
