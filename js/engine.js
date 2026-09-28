// Ranking engine: pure functions, no DOM. Ranks, XP and PBs are derived by
// replaying the workout log in date order (see docs/design.md).

export const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion'];
export const TIER_KEYS = TIERS.map(t => t.toLowerCase());
export const DIVS = ['III', 'II', 'I'];
export const DIV_XP = [400, 600, 800, 1000, 1250, 1500];

export const BASE_XP = 50;
export const VOLUME_FACTOR = 40;
export const PB_CAP = 200;
export const PB_BONUS = { e1rmRanked: 100, e1rmAccessory: 40, repMax: 25, volume: 25 };

export function e1rm(weight, reps) {
  if (!(reps > 0)) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function effortMult(rpe) {
  const r = Math.max(1, Math.min(10, Number(rpe) || 5));
  return 1 + 0.05 * (Math.min(r, 8) - 5);
}

export function streakMultFor(weeks) {
  return 1 + 0.05 * Math.min(weeks, 10);
}

// ---- Dates (local time, weeks start on Monday) ----

export function ymd(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function dayKey(date) { return ymd(new Date(date)); }
export function weekKey(date) {
  const d = new Date(date);
  const back = (d.getDay() + 6) % 7;
  return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back));
}
export function addDays(key, n) {
  const d = parseYmd(key);
  return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}
export function daysBetween(a, b) {
  const da = parseYmd(dayKey(a)), db = parseYmd(dayKey(b));
  return Math.round((db - da) / 86400000);
}

// ---- Rank helpers ----

export function rankName(tier, div) { return `${TIERS[tier]} ${DIVS[div]}`; }

export function liftScore(l) {
  const per = DIV_XP[l.tier];
  const frac = l.tier === 5 && l.div === 2 ? 1 : Math.min(1, l.xp / per);
  return l.tier * 3 + l.div + frac;
}

export function scoreToRank(s) {
  if (s >= 18) return { tier: 5, div: 2, frac: 1 };
  const f = Math.floor(s);
  return { tier: Math.floor(f / 3), div: f % 3, frac: s - f };
}

export function overallScore(scores) {
  if (!scores.length) return 0;
  if (scores.length === 1) return scores[0];
  const sorted = [...scores].sort((a, b) => a - b);
  const rest = sorted.slice(1);
  return 0.6 * sorted[0] + 0.4 * (rest.reduce((a, b) => a + b, 0) / rest.length);
}

export function isFull(l) {
  return l.tier < 5 && l.div === 2 && l.xp >= DIV_XP[l.tier] - 1e-9;
}

function snap(l) { return { tier: l.tier, div: l.div, xp: l.xp, bank: l.bank }; }

function addXP(l, amount, ctx) {
  l.xp += amount;
  if (l.tier === 5 && l.div === 2) return;
  while (l.div < 2 && l.xp >= DIV_XP[l.tier]) {
    l.xp -= DIV_XP[l.tier];
    l.div++;
    ctx.events.push({ date: ctx.date, liftId: ctx.liftId, type: 'division', tier: l.tier, div: l.div });
  }
  if (l.tier < 5 && l.div === 2 && l.xp > DIV_XP[l.tier]) {
    const over = l.xp - DIV_XP[l.tier];
    l.xp = DIV_XP[l.tier];
    l.bank = Math.min(l.bank + over, DIV_XP[l.tier + 1]);
  }
}

// ---- Benchmarks ----

// A benchmark entry is { kg, reps }: kg is an e1RM (weighted lifts) or an
// added-weight e1RM (bodyweight lifts); reps is a bodyweight rep target.
export function benchFor(ex, tier) {
  const b = ex.benchmarks && ex.benchmarks[tier - 1];
  if (!b || (!(b.kg > 0) && !(b.reps > 0))) return null;
  return b;
}

export function qualMetric(ex, pb) {
  if (!pb) return { kg: 0, reps: 0 };
  return { kg: ex.type === 'bodyweight' ? pb.qualAdded : pb.qualE1rm, reps: pb.maxReps || 0 };
}

export function passes(ex, tier, pb, scale = 1) {
  const b = benchFor(ex, tier);
  if (!b) return false;
  const m = qualMetric(ex, pb);
  if (b.reps > 0 && m.reps >= b.reps) return true;
  if (b.kg > 0 && m.kg >= b.kg * scale - 1e-9) return true;
  return false;
}

// Progress towards a tier's benchmark, 0 to 1.
export function benchProgress(ex, tier, pb, scale = 1) {
  const b = benchFor(ex, tier);
  if (!b) return null;
  const m = qualMetric(ex, pb);
  let p = 0;
  if (b.reps > 0) p = Math.max(p, m.reps / b.reps);
  if (b.kg > 0) p = Math.max(p, m.kg / (b.kg * scale));
  return Math.max(0, Math.min(1, p));
}

export function placementRank(ex, pb, scale = 1) {
  let tier = 0;
  for (let t = 1; t <= 5; t++) if (passes(ex, t, pb, scale)) tier = t; else break;
  if (tier === 5) return { tier: 5, div: 0 };
  const next = benchFor(ex, tier + 1);
  if (!next) return { tier, div: 0 };
  const m = qualMetric(ex, pb);
  const cur = tier > 0 ? benchFor(ex, tier) : null;
  let between;
  if (next.kg > 0 && m.kg > 0) {
    const lo = cur && cur.kg > 0 ? cur.kg * scale : 0;
    between = (m.kg - lo) / (next.kg * scale - lo);
  } else {
    between = benchProgress(ex, tier + 1, pb, scale) || 0;
  }
  const div = between < 1 / 3 ? 0 : between < 2 / 3 ? 1 : 2;
  return { tier, div };
}

// ---- Sets ----

export function workingSets(w) {
  const out = [];
  for (const e of w.exercises || []) {
    for (const s of e.sets || []) {
      if (s.done && !s.warmup && s.reps > 0) out.push({ exerciseId: e.exerciseId, weight: Number(s.weight) || 0, reps: Number(s.reps) });
    }
  }
  return out;
}

export function isSession(w) { return !w.placement && workingSets(w).length > 0; }

function newPb() {
  return { e1rm: 0, e1rmSet: null, repMax: {}, bestVolume: 0, volumeSet: null, history: [], qualE1rm: 0, qualAdded: 0, qualSet: null, maxReps: 0, sessions: 0 };
}

function setMetrics(ex, s, bw) {
  const bodyweight = ex.type === 'bodyweight';
  const load = bodyweight ? bw + s.weight : s.weight;
  const r = s.reps;
  let est = null;
  if (r <= 10 && load > 0) est = bodyweight ? e1rm(load, r) - bw : e1rm(load, r);
  return { load, est, repWeight: r <= 10 ? s.weight : null, volume: load * r };
}

export function targetForWeek(settings, wk) {
  const h = (settings.targetHistory || []).slice().sort((a, b) => (a.from < b.from ? -1 : 1));
  let t = h.length ? h[0].target : settings.weeklyTarget || 3;
  for (const e of h) if (e.from <= wk) t = e.target;
  return t;
}

// ---- Main replay ----

export function compute(data, now = new Date()) {
  const settings = data.settings || {};
  const exercises = data.exercises || [];
  const scale = settings.benchmarkScale || 1;
  const inactiveDays = settings.inactiveDays || 21;
  const exById = new Map(exercises.map(e => [e.id, e]));
  const ranked = exercises.filter(e => e.ranked && !e.archived)
    .sort((a, b) => (a.rankOrder ?? 0) - (b.rankOrder ?? 0));
  const rankedIds = new Set(ranked.map(e => e.id));
  const workouts = [...(data.workouts || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const weekCounts = new Map();
  const dayCounts = new Map();
  for (const w of workouts) {
    const ws = workingSets(w);
    if (w.placement || !ws.length) continue;
    const wk = weekKey(w.date);
    weekCounts.set(wk, (weekCounts.get(wk) || 0) + 1);
    const dk = dayKey(w.date);
    dayCounts.set(dk, (dayCounts.get(dk) || 0) + ws.length);
  }
  const firstWeek = [...weekCounts.keys()].sort()[0];
  const streakMemo = new Map();
  const streakBefore = wk => {
    if (streakMemo.has(wk)) return streakMemo.get(wk);
    let n = 0;
    let w = addDays(wk, -7);
    while (firstWeek && w >= firstWeek) {
      if ((weekCounts.get(w) || 0) >= targetForWeek(settings, w)) n++; else break;
      w = addDays(w, -7);
    }
    streakMemo.set(wk, n);
    return n;
  };

  const lifts = {};
  for (const e of ranked) lifts[e.id] = { tier: 0, div: 0, xp: 0, bank: 0, lastTrained: null, placed: false };
  const pbs = {};
  const sessions = {};
  const events = [];
  const overallHistory = [];
  const weekSeen = new Map();
  let totalXP = 0;

  const pushOverall = date => {
    if (!ranked.length) return;
    overallHistory.push({ date, score: overallScore(ranked.map(e => liftScore(lifts[e.id]))) });
  };

  // Record a set into the PB tables. Returns the PB kinds it beat.
  const recordSets = (w, bw, byEx, isPlacement) => {
    const found = [];
    for (const [exId, sets] of byEx) {
      const ex = exById.get(exId);
      const pb = pbs[exId] || (pbs[exId] = newPb());
      const had = pb.sessions > 0;
      const prev = { e1rm: pb.e1rm, repMax: { ...pb.repMax }, bestVolume: pb.bestVolume };
      let dayBest = null;
      for (const s of sets) {
        const m = setMetrics(ex, s, bw);
        const setInfo = { weight: s.weight, reps: s.reps, date: w.date, workoutId: w.id };
        if (m.est != null) {
          if (dayBest == null || m.est > dayBest) dayBest = m.est;
          if (m.est > pb.e1rm + 1e-9) { pb.e1rm = m.est; pb.e1rmSet = setInfo; }
        }
        if (m.repWeight != null && (pb.repMax[s.reps] == null || m.repWeight > pb.repMax[s.reps].weight + 1e-9)) {
          pb.repMax[s.reps] = { weight: m.repWeight, date: w.date };
        }
        if (m.volume > pb.bestVolume + 1e-9) { pb.bestVolume = m.volume; pb.volumeSet = setInfo; }
        if (s.reps <= 5 && m.load > 0) {
          if (ex.type === 'bodyweight') {
            const added = e1rm(m.load, s.reps) - bw;
            if (added > pb.qualAdded) { pb.qualAdded = added; pb.qualSet = setInfo; }
          } else {
            const est = e1rm(m.load, s.reps);
            if (est > pb.qualE1rm) { pb.qualE1rm = est; pb.qualSet = setInfo; }
          }
        }
        if (ex.type === 'bodyweight' && s.weight >= 0 && s.reps > pb.maxReps) pb.maxReps = s.reps;
      }
      if (dayBest != null) pb.history.push({ date: w.date, e1rm: dayBest });
      pb.sessions++;
      if (had && !isPlacement) {
        if (pb.e1rm > prev.e1rm + 1e-9) found.push({ exerciseId: exId, kind: 'e1rm', value: pb.e1rm });
        for (const [reps, v] of Object.entries(pb.repMax)) {
          const p = prev.repMax[reps];
          if (p && v.weight > p.weight + 1e-9) found.push({ exerciseId: exId, kind: 'repMax', reps: Number(reps), value: v.weight });
        }
        if (pb.bestVolume > prev.bestVolume + 1e-9) found.push({ exerciseId: exId, kind: 'volume', value: pb.bestVolume });
      }
      if (rankedIds.has(exId)) lifts[exId].lastTrained = w.date;
    }
    return found;
  };

  const groupSets = w => {
    const byEx = new Map();
    for (const s of workingSets(w)) {
      if (!exById.has(s.exerciseId)) continue;
      if (!byEx.has(s.exerciseId)) byEx.set(s.exerciseId, []);
      byEx.get(s.exerciseId).push(s);
    }
    return byEx;
  };

  for (const w of workouts) {
    const bw = Number(w.bodyweight) || Number(settings.bodyweight) || 70;
    const byEx = groupSets(w);
    if (!byEx.size) continue;

    if (w.placement) {
      recordSets(w, bw, byEx, true);
      for (const exId of byEx.keys()) {
        if (!rankedIds.has(exId)) continue;
        const l = lifts[exId];
        const p = placementRank(exById.get(exId), pbs[exId], scale);
        if (p.tier * 3 + p.div > l.tier * 3 + l.div) {
          l.tier = p.tier; l.div = p.div; l.xp = 0; l.bank = 0;
        }
        l.placed = true;
        events.push({ date: w.date, liftId: exId, type: 'placement', tier: l.tier, div: l.div });
      }
      pushOverall(w.date);
      continue;
    }

    const wk = weekKey(w.date);
    const before = weekSeen.get(wk) || 0;
    weekSeen.set(wk, before + 1);
    const target = targetForWeek(settings, wk);
    const streakWeeks = streakBefore(wk);
    const beyondTarget = before >= target;
    const streakMult = beyondTarget ? 1 : streakMultFor(streakWeeks);

    // Relative volume per exercise
    const rv = new Map();
    let totalRV = 0;
    for (const [exId, sets] of byEx) {
      const ex = exById.get(exId);
      let v = 0;
      for (const s of sets) v += s.reps * setMetrics(ex, s, bw).load / bw;
      rv.set(exId, v);
      totalRV += v;
    }
    const volumeXP = VOLUME_FACTOR * Math.sqrt(totalRV);
    const effort = effortMult(w.rpe);
    const sessionXP = (BASE_XP + volumeXP) * effort * streakMult;

    const liftSnapBefore = {};
    for (const e of ranked) liftSnapBefore[e.id] = snap(lifts[e.id]);

    const pbList = recordSets(w, bw, byEx, false);

    // PB bonus, capped per session
    let pbBonus = 0;
    const pbByEx = new Map();
    for (const p of pbList) {
      let amt = p.kind === 'e1rm' ? (rankedIds.has(p.exerciseId) ? PB_BONUS.e1rmRanked : PB_BONUS.e1rmAccessory)
        : p.kind === 'repMax' ? PB_BONUS.repMax : PB_BONUS.volume;
      amt = Math.min(amt, PB_CAP - pbBonus);
      if (amt <= 0) { p.bonus = 0; continue; }
      p.bonus = amt;
      pbBonus += amt;
      pbByEx.set(p.exerciseId, (pbByEx.get(p.exerciseId) || 0) + amt);
    }

    // Share session XP between ranked lifts
    const trainedRanked = [...byEx.keys()].filter(id => rankedIds.has(id));
    const recipients = trainedRanked.length ? trainedRanked : ranked.map(e => e.id);
    const liftXP = {};
    for (const id of recipients) liftXP[id] = 0;
    if (recipients.length) {
      for (const [exId, v] of rv) {
        const share = totalRV > 0 ? v / totalRV : 1 / byEx.size;
        if (rankedIds.has(exId)) liftXP[exId] += share * sessionXP;
        else for (const id of recipients) liftXP[id] += share * sessionXP / recipients.length;
      }
      for (const [exId, amt] of pbByEx) {
        if (rankedIds.has(exId)) liftXP[exId] = (liftXP[exId] || 0) + amt;
        else for (const id of recipients) liftXP[id] += amt / recipients.length;
      }
    }

    for (const [id, amt] of Object.entries(liftXP)) addXP(lifts[id], amt, { events, date: w.date, liftId: id });

    // Promotions
    const promotions = [];
    for (const e of ranked) {
      const l = lifts[e.id];
      if (isFull(l) && passes(e, l.tier + 1, pbs[e.id], scale)) {
        const from = snap(l);
        l.tier++; l.div = 0; l.xp = 0;
        const bank = l.bank; l.bank = 0;
        events.push({ date: w.date, liftId: e.id, type: 'promotion', tier: l.tier, div: 0 });
        addXP(l, bank, { events, date: w.date, liftId: e.id });
        promotions.push({ liftId: e.id, from, to: snap(l) });
      }
    }

    const total = sessionXP + pbBonus;
    totalXP += total;
    const liftSnapAfter = {};
    for (const e of ranked) liftSnapAfter[e.id] = snap(lifts[e.id]);
    sessions[w.id] = {
      id: w.id, date: w.date, base: BASE_XP, volumeXP, totalRV, effort, rpe: w.rpe, streakWeeks, streakMult, beyondTarget,
      sessionXP, pbBonus, total, pbs: pbList, liftXP, before: liftSnapBefore, after: liftSnapAfter, promotions,
      weekCount: before + 1, target,
    };
    pushOverall(w.date);
  }

  // Current status
  const nowWeek = weekKey(now);
  const weekCount = weekCounts.get(nowWeek) || 0;
  const target = targetForWeek(settings, nowWeek);
  const prevStreak = streakBefore(nowWeek);
  const streak = prevStreak + (weekCount >= target ? 1 : 0);

  const liftStatus = ranked.map(e => {
    const l = lifts[e.id];
    const daysSince = l.lastTrained ? daysBetween(l.lastTrained, now) : null;
    const next = l.tier < 5 ? benchFor(e, l.tier + 1) : null;
    return {
      id: e.id, name: e.name, ...l, score: liftScore(l),
      perDiv: DIV_XP[l.tier],
      full: isFull(l),
      inactive: daysSince != null && daysSince >= inactiveDays,
      daysSince,
      nextBench: next,
      testProgress: l.tier < 5 ? benchProgress(e, l.tier + 1, pbs[e.id], scale) : null,
    };
  });
  const scores = liftStatus.map(l => l.score);
  const oScore = overallScore(scores);
  const weakest = liftStatus.length ? liftStatus.reduce((a, b) => (b.score < a.score ? b : a)) : null;

  return {
    lifts: liftStatus,
    liftById: Object.fromEntries(liftStatus.map(l => [l.id, l])),
    overall: { score: oScore, ...scoreToRank(oScore), weakest: liftStatus.length > 1 ? weakest : null },
    overallHistory,
    sessions,
    events,
    pbs,
    week: { key: nowWeek, count: weekCount, target, hit: weekCount >= target },
    streak,
    nextStreakMult: weekCount >= target ? 1 : streakMultFor(prevStreak),
    prevStreak,
    dayCounts,
    totalXP,
    sessionCount: workouts.filter(isSession).length,
  };
}
