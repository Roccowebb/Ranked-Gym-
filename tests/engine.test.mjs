// Run with: node --test tests/engine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { compute, e1rm, effortMult, weekKey, placementRank, overallScore, scoreToRank, DIV_XP } from '../js/engine.js';
import { defaultExercises, defaultSettings } from '../js/defaults.js';

const set = (weight, reps, extra = {}) => ({ weight, reps, done: true, warmup: false, ...extra });
const wo = (id, date, rpe, exercises, extra = {}) => ({ id, date, rpe, bodyweight: 80, exercises, ...extra });
const base = () => ({ settings: { ...defaultSettings(), bodyweight: 80, weeklyTarget: 3 }, exercises: defaultExercises(), workouts: [] });
const approx = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test('Epley e1RM, a single is its own weight', () => {
  assert.equal(e1rm(100, 1), 100);
  approx(e1rm(100, 3), 110, 1e-9);
  approx(e1rm(92.5, 3), 101.75, 1e-9);
});

test('effort stops rising at RPE 8', () => {
  approx(effortMult(1), 0.8, 1e-9);
  approx(effortMult(5), 1.0, 1e-9);
  approx(effortMult(8), 1.15, 1e-9);
  approx(effortMult(10), 1.15, 1e-9);
});

test('weeks start on Monday', () => {
  assert.equal(weekKey(new Date(2026, 8, 28, 10)), '2026-09-28'); // Monday
  assert.equal(weekKey(new Date(2026, 9, 4, 23)), '2026-09-28'); // Sunday
});

test('worked example from docs/design.md section 2.5', () => {
  const d = base();
  // Three hit weeks (3 sessions each) before the week under test, first sessions on the lifts.
  let n = 0;
  for (const wk of ['2026-08-31', '2026-09-07', '2026-09-14']) {
    for (const day of [0, 2, 4]) {
      const date = new Date(2026, 7, 31 + (n >= 3 ? (n >= 6 ? 14 : 7) : 0) + day, 18).toISOString();
      d.workouts.push(wo('w' + n++, date, 6, [
        { exerciseId: 'squat', sets: [set(90, 5), set(90, 5), set(90, 5)] },
        { exerciseId: 'bench', sets: [set(70, 5), set(70, 5), set(70, 5)] },
        { exerciseId: 'row', sets: [set(60, 8), set(60, 8), set(60, 8)] },
      ]));
    }
  }
  // Week of 21 Sep: one earlier session, then the example (second session of the week).
  d.workouts.push(wo('first', new Date(2026, 8, 21, 18).toISOString(), 6, [{ exerciseId: 'curl', sets: [set(10, 10)] }]));
  d.workouts.push(wo('ex', new Date(2026, 8, 23, 18).toISOString(), 8, [
    { exerciseId: 'squat', sets: [set(20, 5, { warmup: true }), set(100, 5), set(100, 5), set(100, 5)] },
    { exerciseId: 'bench', sets: [set(70, 5), set(70, 5), set(70, 5)] },
    { exerciseId: 'row', sets: [set(60, 8), set(60, 8), set(60, 8)] },
  ]));
  const r = compute(d, new Date(2026, 8, 23, 20));
  const s = r.sessions.ex;
  approx(s.totalRV, 49.875, 0.01);
  approx(s.volumeXP, 282.5, 0.1);
  assert.equal(s.streakWeeks, 3);
  approx(s.streakMult, 1.15, 1e-9);
  approx(s.sessionXP, 439.7, 0.2);
  // squat e1RM PB (+100), squat 5-rep max PB (+25), squat best set volume PB (+25)
  assert.equal(s.pbBonus, 150);
  approx(s.liftXP.squat, 0.556 * 439.7 + 150, 1);
  approx(s.liftXP.bench, 0.444 * 439.7, 1);
});

test('sessions beyond the weekly target get no streak multiplier', () => {
  const d = base();
  d.settings.weeklyTarget = 1;
  d.workouts.push(wo('a', new Date(2026, 8, 14, 18).toISOString(), 5, [{ exerciseId: 'squat', sets: [set(60, 5)] }]));
  d.workouts.push(wo('b', new Date(2026, 8, 21, 18).toISOString(), 5, [{ exerciseId: 'squat', sets: [set(60, 5)] }]));
  d.workouts.push(wo('c', new Date(2026, 8, 22, 18).toISOString(), 5, [{ exerciseId: 'squat', sets: [set(60, 5)] }]));
  const r = compute(d, new Date(2026, 8, 23));
  approx(r.sessions.b.streakMult, 1.05, 1e-9);
  approx(r.sessions.c.streakMult, 1, 1e-9);
  assert.equal(r.sessions.c.beyondTarget, true);
  assert.equal(r.streak, 2);
});

test('a missed week resets the streak; the current week never breaks it', () => {
  const d = base();
  d.settings.weeklyTarget = 1;
  d.workouts.push(wo('a', new Date(2026, 8, 1, 18).toISOString(), 5, [{ exerciseId: 'squat', sets: [set(60, 5)] }]));
  d.workouts.push(wo('b', new Date(2026, 8, 15, 18).toISOString(), 5, [{ exerciseId: 'squat', sets: [set(60, 5)] }]));
  const r = compute(d, new Date(2026, 8, 23));
  assert.equal(r.sessions.b.streakWeeks, 0);
  assert.equal(r.streak, 1); // last week hit, this week still open
});

test('division I full waits for a test; a qualifying set promotes and banks XP', () => {
  const d = base();
  d.settings.weeklyTarget = 7;
  const bronzeTotal = DIV_XP[0] * 3;
  let i = 0;
  // Light squats until Bronze I is full (no qualifying set for Silver at 70 kg).
  let r;
  do {
    d.workouts.push(wo('l' + i, new Date(2026, 0, 1 + i, 18).toISOString(), 8, [{ exerciseId: 'squat', sets: Array(10).fill(set(50, 10)) }]));
    i++;
    r = compute(d, new Date(2026, 0, 1 + i));
  } while (!r.liftById.squat.full && i < 50);
  assert.ok(i < 50);
  assert.equal(r.liftById.squat.tier, 0);
  assert.equal(r.liftById.squat.div, 2);
  assert.ok(i * 50 > 0 && bronzeTotal > 0);
  // Log a qualifying single at 70 kg: promoted to Silver.
  d.workouts.push(wo('q', new Date(2026, 0, 1 + i, 18).toISOString(), 8, [{ exerciseId: 'squat', sets: [set(70, 1)] }]));
  r = compute(d, new Date(2026, 0, 2 + i));
  assert.equal(r.liftById.squat.tier, 1);
  assert.equal(r.sessions.q.promotions.length, 1);
  assert.ok(r.liftById.squat.xp > 0, 'banked XP carried over');
});

test('warm-up sets and sets of more than 5 reps do not qualify', () => {
  const d = base();
  d.workouts.push(wo('a', new Date(2026, 0, 1).toISOString(), 8, [{ exerciseId: 'bench', sets: [set(100, 1, { warmup: true }), set(60, 12)] }]));
  const r = compute(d, new Date(2026, 0, 2));
  assert.equal(r.pbs.bench.qualE1rm, 0);
});

test('placement puts lifts into tiers and divisions by kg benchmarks', () => {
  const exs = defaultExercises();
  const bench = exs.find(e => e.id === 'bench');
  const dead = exs.find(e => e.id === 'deadlift');
  assert.deepEqual(placementRank(bench, { qualE1rm: 100, maxReps: 0 }), { tier: 3, div: 0 });
  assert.deepEqual(placementRank(dead, { qualE1rm: 180, maxReps: 0 }), { tier: 4, div: 0 });
  assert.deepEqual(placementRank(dead, { qualE1rm: 175, maxReps: 0 }), { tier: 3, div: 2 });
  const pull = exs.find(e => e.id === 'pullup');
  assert.deepEqual(placementRank(pull, { qualAdded: 0, maxReps: 10 }), { tier: 2, div: 0 });
});

test('pull-up rep test and added-weight e1RM', () => {
  const d = base();
  d.settings.bodyweight = 70;
  d.workouts.push(wo('p', new Date(2026, 0, 1).toISOString(), 8, [{ exerciseId: 'pullup', sets: [set(0, 8), set(20, 3)] }], { bodyweight: 70 }));
  const r = compute(d, new Date(2026, 0, 2));
  assert.equal(r.pbs.pullup.maxReps, 8);
  approx(r.pbs.pullup.qualAdded, 90 * 1.1 - 70, 1e-9);
});

test('overall rank leans towards the weakest lift', () => {
  const s = overallScore([8.62, 6.0, 9.3, 4.4, 6.1]);
  approx(s, 5.64, 0.01);
  assert.deepEqual({ tier: scoreToRank(s).tier, div: scoreToRank(s).div }, { tier: 1, div: 2 });
});

test('a ranked lift not trained for 21 days is inactive but keeps its rank', () => {
  const d = base();
  d.workouts.push(wo('a', new Date(2026, 0, 1, 12).toISOString(), 8, [{ exerciseId: 'ohp', sets: [set(40, 5)] }]));
  const r1 = compute(d, new Date(2026, 0, 21, 12));
  const r2 = compute(d, new Date(2026, 0, 22, 12));
  assert.equal(r1.liftById.ohp.inactive, false);
  assert.equal(r2.liftById.ohp.inactive, true);
  assert.equal(r2.liftById.ohp.xp, r1.liftById.ohp.xp);
});
