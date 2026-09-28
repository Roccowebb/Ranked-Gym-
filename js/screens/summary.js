// XP summary after a workout (also used to view past workouts).
import { S, save, derived, exById, w as fmtW, num, toDisp, unit } from '../state.js';
import { esc, badge, bar, tierColor, icon, fmtDateLong, toast, xpText } from '../ui.js';
import { rankName, DIV_XP, TIERS, benchFor } from '../engine.js';
import { go, back } from '../app.js';

export const full = true;

const frac = l => (l.tier === 5 && l.div === 2 ? 1 : Math.min(1, l.xp / DIV_XP[l.tier]));

function pbText(p) {
  const ex = exById(p.exerciseId);
  const bw = ex && ex.type === 'bodyweight';
  const name = esc(ex ? ex.name : '');
  if (p.kind === 'e1rm') return `${name}: estimated 1RM ${bw ? '+' : ''}${fmtW(p.value)}`;
  if (p.kind === 'repMax') return `${name}: heaviest for ${p.reps} ${p.reps === 1 ? 'rep' : 'reps'}, ${bw ? '+' : ''}${fmtW(p.value)}`;
  return `${name}: best set volume, ${num(toDisp(p.value), 0)} ${unit()}`;
}

function setsText(e) {
  const ex = exById(e.exerciseId);
  return e.sets.map(s => {
    const wt = ex && ex.type === 'bodyweight' ? (s.weight > 0 ? `BW+${num(toDisp(s.weight))}` : 'BW') : num(toDisp(s.weight));
    return `${s.warmup ? '(W) ' : ''}${wt}x${s.reps}`;
  }).join(', ');
}

export function render([id, isNew]) {
  const w = S.workouts.find(x => x.id === id);
  if (!w) return `<div class="head"><button class="icon-btn plain" data-act="back" data-fallback="train">${icon('back')}</button><h1 class="sm">Workout</h1></div><div class="card">This workout no longer exists.</div>`;
  const d = derived();
  const s = d.sessions[id];
  const head = isNew
    ? '<div class="head"><h1 class="sm" style="text-align:center">Workout saved</h1></div>'
    : `<div class="head"><button class="icon-btn plain" data-act="back" data-fallback="train" aria-label="Back">${icon('back')}</button><h1 class="sm">${fmtDateLong(w.date)}</h1></div>`;

  if (!s) {
    return `${head}<section class="card"><p class="muted">No working sets were logged, so this session earned no XP.</p></section>${details(w)}${footer(w, isNew)}`;
  }

  const lifts = Object.keys(s.liftXP).map(lid => {
    const ex = exById(lid);
    const b = s.before[lid], a = s.after[lid];
    if (!ex || !b || !a) return '';
    const moved = b.tier !== a.tier || b.div !== a.div;
    const from = moved ? 0 : frac(b);
    return `<div class="lift-row" style="grid-template-columns:44px 1fr auto">
      ${badge(a.tier, a.div, { size: 44 })}
      <div style="min-width:0">
        <div class="name">${esc(ex.name)}</div>
        <div class="bar thin"><span data-to="${(frac(a) * 100).toFixed(1)}" style="width:${(from * 100).toFixed(1)}%;background:${tierColor(a.tier)}"></span></div>
        <div class="meta">${moved ? `${rankName(b.tier, b.div)} to ${rankName(a.tier, a.div)}` : rankName(a.tier, a.div)} · ${xpText(a)}</div>
      </div>
      <div class="tier num">+${Math.round(s.liftXP[lid])}</div>
    </div>`;
  }).join('');

  const pbs = s.pbs.length ? s.pbs.map(p => `<div class="kv"><span style="color:var(--text)">${pbText(p)}</span><span class="num muted">${p.bonus ? `+${p.bonus}` : ''}</span></div>`).join('') : '<p class="muted" style="margin:0">No new personal bests this time.</p>';

  const weekLine = s.weekCount >= s.target
    ? (s.weekCount === s.target ? `${s.weekCount} of ${s.target} this week. Target hit.` : `${s.weekCount} sessions this week, target ${s.target}.`)
    : `${s.weekCount} of ${s.target} this week.`;

  return `${head}
    <section class="card xp-hero">
      <div class="muted small">XP earned</div>
      <div class="xp">+${Math.round(s.total).toLocaleString('en-GB')} <small>XP</small></div>
      <div class="muted small">${weekLine}</div>
    </section>
    <section class="card">
      <h2>Breakdown</h2>
      <div class="kv"><span>Session completed</span><span>${s.base}</span></div>
      <div class="kv"><span>Volume</span><span>+${Math.round(s.volumeXP)}</span></div>
      <div class="kv"><span>Effort (RPE ${s.rpe})</span><span>x${s.effort.toFixed(2)}</span></div>
      <div class="kv"><span>${s.beyondTarget ? 'Streak (beyond weekly target)' : `Streak (${s.streakWeeks} ${s.streakWeeks === 1 ? 'week' : 'weeks'})`}</span><span>x${s.streakMult.toFixed(2)}</span></div>
      <div class="kv"><span>Personal best bonus</span><span>+${s.pbBonus}</span></div>
    </section>
    <section class="card"><h2>Personal bests</h2>${pbs}</section>
    ${lifts ? `<div class="section-title">Rank progress</div><section class="card flush">${lifts}</section>` : ''}
    ${details(w)}
    ${footer(w, isNew)}
    ${isNew && s.promotions.length ? promoOverlay(s.promotions) : ''}`;
}

function details(w) {
  return `<div class="section-title">Sets</div><section class="card">
    ${w.exercises.map(e => `<div class="kv"><span style="color:var(--text);font-weight:600">${esc(exById(e.exerciseId)?.name || 'Unknown')}</span><span class="muted small" style="text-align:right">${setsText(e)}</span></div>`).join('')}
    ${w.note ? `<p class="muted small" style="margin:10px 0 0">Note: ${esc(w.note)}</p>` : ''}
  </section>`;
}

function footer(w, isNew) {
  return `<div class="btn-row" style="margin-top:20px"><button class="btn" data-act="save-tpl">Save as template</button></div>
    ${isNew ? '<button class="btn primary block lg" style="margin-top:12px" data-act="done">Done</button>' : `<button class="btn danger block" style="margin-top:24px" data-act="delete" data-id="${esc(w.id)}">Delete workout</button>`}`;
}

function promoOverlay(promos) {
  const p = promos[0];
  const ex = exById(p.liftId);
  const b = benchFor(ex, p.to.tier);
  const pb = derived().pbs[p.liftId];
  const qs = pb && pb.qualSet;
  const bench = b ? (b.kg > 0 ? `${ex.type === 'bodyweight' ? 'added-weight ' : ''}e1RM of ${fmtW(b.kg * (S.settings.benchmarkScale || 1))}` : `${b.reps} reps`) : '';
  const col = tierColor(p.to.tier);
  return `<div class="promo" id="promo" role="dialog" aria-label="Promotion">
    <div class="label">Promotion</div>
    <div class="badges">
      <div class="glow" style="background:radial-gradient(circle, ${col} 0%, transparent 65%)"></div>
      <div class="old">${badge(p.from.tier, p.from.div, { size: 180 })}</div>
      <div class="new">${badge(p.to.tier, p.to.div, { size: 180 })}</div>
    </div>
    <h2>${esc(ex.name)}: ${TIERS[p.to.tier]}</h2>
    <p>You passed the ${TIERS[p.to.tier]} test${bench ? ` (${bench})` : ''}${qs ? ` with ${fmtW(qs.weight)} x ${qs.reps}` : ''}.${promos.length > 1 ? ` ${promos.length - 1} more ${promos.length === 2 ? 'promotion' : 'promotions'} this session.` : ''}</p>
    <button class="btn primary lg" data-act="close-promo">Continue</button>
  </div>`;
}

export function after(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll('.bar span[data-to]').forEach(s => { s.style.width = s.dataset.to + '%'; });
  }));
  if (root.querySelector('#promo') && navigator.vibrate) navigator.vibrate([30, 60, 30, 60, 120]);
}

export const actions = {
  done: () => go('home', { replace: true }),
  'close-promo': () => document.getElementById('promo')?.remove(),
  'save-tpl': async () => {
    const id = location.hash.split('/')[2];
    const w = S.workouts.find(x => x.id === id);
    if (!w) return;
    const name = prompt('Template name', 'My workout');
    if (!name) return;
    S.templates.push({
      id: 'tpl-' + Date.now().toString(36), name: name.trim(),
      exercises: w.exercises.map(e => ({ exerciseId: e.exerciseId, sets: e.sets.filter(s => !s.warmup).length || e.sets.length })),
    });
    await save('templates');
    toast('Template saved.');
  },
  delete: async el => {
    if (!confirm('Delete this workout? XP, PBs and ranks will be recalculated without it.')) return;
    S.workouts = S.workouts.filter(x => x.id !== el.dataset.id);
    await save('workouts');
    toast('Workout deleted.');
    back('train');
  },
};

export const tab = 'train';
