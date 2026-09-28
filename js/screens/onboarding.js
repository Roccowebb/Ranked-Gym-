// First-run setup: bodyweight, weekly target, optional placement.
import { S, save, derived, rankedLifts, fromDisp, num, uid, setWeeklyTarget } from '../state.js';
import { esc, badge, toast } from '../ui.js';
import { rankName } from '../engine.js';
import { go, render as rerender, applyTheme } from '../app.js';

export const full = true;
export const keepOnResume = true;

let ob = null;
const fresh = () => ({ step: 0, bw: S.settings.bodyweight, units: S.settings.units, target: S.settings.weeklyTarget, place: {} });

function steps(n) { return `<div class="steps">${[0, 1, 2].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`; }

export function render() {
  if (!ob) ob = fresh();
  const u = ob.units;
  const disp = kg => (u === 'lb' ? kg * 2.2046226218 : kg);
  if (ob.step === 0) {
    return `<div class="ob"><div class="ob-body">
      ${steps(0)}
      <h1>Welcome to Ranked Gym</h1>
      <p class="lead">Train consistently, get stronger, and rank up each lift from Bronze to Champion. Three quick questions, all optional.</p>
      <div class="field"><span>Units</span><div class="seg"><button class="${u === 'kg' ? 'on' : ''}" data-act="units" data-v="kg">kg</button><button class="${u === 'lb' ? 'on' : ''}" data-act="units" data-v="lb">lb</button></div></div>
      <label class="field"><span>Your bodyweight (${u})</span>
        <div class="big-input"><input class="input" id="ob-bw" type="text" inputmode="decimal" value="${num(disp(ob.bw))}"></div></label>
      <p class="muted small">Used to work out XP fairly and for pull-up loads. Rank tests use fixed weights.</p>
    </div>
    <button class="btn primary block lg" data-act="next">Next</button>
    <button class="btn ghost block" style="margin-top:8px" data-act="skip">Skip setup</button></div>`;
  }
  if (ob.step === 1) {
    return `<div class="ob"><div class="ob-body">
      ${steps(1)}
      <h1>How many sessions a week?</h1>
      <p class="lead">Hitting this target each week builds your streak and XP multiplier. Rest days never break it, and extra sessions earn no extra streak bonus.</p>
      <div class="card" style="display:flex;align-items:center;justify-content:center;gap:24px">
        <button class="icon-btn" style="width:56px;height:56px;font-size:28px" data-act="t" data-d="-1" aria-label="Fewer">-</button>
        <div style="font-size:64px;font-weight:800;min-width:60px;text-align:center" class="num">${ob.target}</div>
        <button class="icon-btn" style="width:56px;height:56px;font-size:28px" data-act="t" data-d="1" aria-label="More">+</button>
      </div>
      <p class="muted small" style="text-align:center">sessions per week. You can change this any time.</p>
    </div>
    <button class="btn primary block lg" data-act="next">Next</button>
    <button class="btn ghost block" style="margin-top:8px" data-act="prev">Back</button></div>`;
  }
  if (ob.step === 2) {
    const rows = rankedLifts().map(e => {
      const p = ob.place[e.id] || {};
      const bw = e.type === 'bodyweight';
      return `<div class="place-row">
        <div><div style="font-weight:600">${esc(e.name)}</div><div class="muted small">${bw ? `Added ${u} x reps` : `${u} x reps`}</div></div>
        <input class="input" type="text" inputmode="decimal" placeholder="${bw ? '0' : u}" value="${p.w ?? ''}" data-input="pw" data-id="${esc(e.id)}" aria-label="${esc(e.name)} weight">
        <span class="x">x</span>
        <input class="input" type="text" inputmode="numeric" placeholder="reps" value="${p.r ?? ''}" data-input="pr" data-id="${esc(e.id)}" aria-label="${esc(e.name)} reps">
      </div>`;
    }).join('');
    return `<div class="ob"><div class="ob-body">
      ${steps(2)}
      <h1>Placement</h1>
      <p class="lead">Enter a recent best set for any lift, like placement matches in a ranked game. Leave blank to start at Bronze III. For pull-ups, enter 0 added weight and your best reps.</p>
      <section class="card" style="padding-top:4px;padding-bottom:4px">${rows}</section>
      <p class="muted small">Sets of 1 to 5 reps place you most accurately. These count as your starting personal bests and earn no XP.</p>
    </div>
    <button class="btn primary block lg" data-act="finish">See my ranks</button>
    <button class="btn ghost block" style="margin-top:8px" data-act="prev">Back</button></div>`;
  }
  const d = derived();
  const o = d.overall;
  return `<div class="ob"><div class="ob-body">
    <h1 style="text-align:center;margin-top:12px">Your starting ranks</h1>
    <div class="card overall" style="justify-content:center">${badge(o.tier, o.div, { size: 88 })}
      <div><div class="label">Overall</div><div class="rank">${rankName(o.tier, o.div)}</div></div></div>
    <div class="place-grid">${d.lifts.map(l => `<div class="card">${badge(l.tier, l.div, { size: 56 })}<div style="font-weight:600">${esc(l.name)}</div><div class="muted small">${rankName(l.tier, l.div)}</div></div>`).join('')}</div>
    <p class="muted small" style="margin-top:16px">Train to earn XP and move through divisions. Pass a rank test to move up a tier.</p>
  </div>
  <button class="btn primary block lg" data-act="done">Go to Home</button></div>`;
}

function readStep0() {
  const el = document.getElementById('ob-bw');
  if (!el) return true;
  const v = parseFloat(el.value.replace(',', '.'));
  if (isNaN(v) || v < 20 || v > 400) { toast('Enter a bodyweight, or skip setup.'); return false; }
  ob.bw = ob.units === 'lb' ? v / 2.2046226218 : v;
  return true;
}

async function commit(withPlacement) {
  S.settings.units = ob.units;
  S.settings.bodyweight = ob.bw;
  if (ob.target !== S.settings.weeklyTarget) {
    if (S.workouts.some(w => !w.placement)) await setWeeklyTarget(ob.target);
    else { S.settings.weeklyTarget = ob.target; S.settings.targetHistory = []; }
  }
  if (withPlacement) {
    const exercises = [];
    for (const e of rankedLifts()) {
      const p = ob.place[e.id];
      if (!p) continue;
      const w = parseFloat(String(p.w ?? '').replace(',', '.'));
      const r = parseInt(p.r, 10);
      const weight = isNaN(w) ? 0 : fromDisp(w);
      if (!(r > 0) || (e.type !== 'bodyweight' && !(weight > 0))) continue;
      exercises.push({ exerciseId: e.id, sets: [{ weight, reps: r, warmup: false, done: true }] });
    }
    if (exercises.length) {
      S.workouts = S.workouts.filter(w => !w.placement);
      S.workouts.push({ id: uid('place'), placement: true, date: new Date(Date.now() - 1000).toISOString(), bodyweight: ob.bw, rpe: null, exercises });
    }
  }
  S.settings.onboarded = true;
  await save('settings', 'workouts');
}

export const actions = {
  units: el => {
    readStep0();
    ob.units = el.dataset.v;
    rerender();
  },
  next: () => { if (ob.step === 0 && !readStep0()) return; ob.step++; rerender(); },
  prev: () => { ob.step = Math.max(0, ob.step - 1); rerender(); },
  t: el => { ob.target = Math.max(1, Math.min(7, ob.target + Number(el.dataset.d))); rerender(); },
  pw: el => { (ob.place[el.dataset.id] ||= {}).w = el.value; },
  pr: el => { (ob.place[el.dataset.id] ||= {}).r = el.value; },
  skip: async () => {
    readStep0();
    await commit(false);
    ob = null;
    applyTheme();
    go('home', { replace: true });
  },
  finish: async () => { await commit(true); ob.step = 3; rerender(); },
  done: () => { ob = null; go('home', { replace: true }); },
};

