// Active workout: log sets, rest timer, finish with RPE.
import { S, save, exById, visibleExercises, uid, toDisp, fromDisp, plateStep, unit, num, currentBodyweight } from '../state.js';
import { esc, icon, fmtDuration, openSheet, closeSheet, toast } from '../ui.js';
import { go, render as rerender } from '../app.js';
import { haptic } from '../haptics.js';
import { MUSCLE_BY_KEY, GROUPS, EQUIP_NAMES } from '../library.js';

let pickGroup = 'All';

let justDone = null; // { ei, si } of the set just ticked, for the pop animation

export const full = true;
export const keepOnResume = true;

// ---- Starting a workout ----

function lastSets(exerciseId) {
  const ws = S.workouts.filter(w => !w.placement).sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const w of ws) {
    const e = w.exercises.find(x => x.exerciseId === exerciseId);
    if (e && e.sets.length) return e.sets.map(s => ({ weight: s.weight, reps: s.reps, warmup: !!s.warmup, done: false }));
  }
  return null;
}

function newExercise(exerciseId, count = 3) {
  const sets = lastSets(exerciseId) || Array.from({ length: count }, () => ({ weight: 0, reps: 5, warmup: false, done: false }));
  return { key: uid('e'), exerciseId, sets };
}

export async function startWorkout({ templateId, repeat } = {}) {
  let exercises = [];
  if (templateId) {
    const t = S.templates.find(x => x.id === templateId);
    if (t) exercises = t.exercises.filter(e => exById(e.exerciseId)).map(e => newExercise(e.exerciseId, e.sets || 3));
  } else if (repeat) {
    const last = S.workouts.filter(w => !w.placement).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (last) exercises = last.exercises.filter(e => exById(e.exerciseId)).map(e => ({
      key: uid('e'), exerciseId: e.exerciseId, sets: e.sets.map(s => ({ weight: s.weight, reps: s.reps, warmup: !!s.warmup, done: false })),
    }));
  }
  S.active = { id: uid('w'), startedAt: new Date().toISOString(), templateId: templateId || null, exercises, sel: null, rest: null };
  selectNext();
  await save('active');
}

// ---- Selection helpers ----

function selectNext(fromEi = 0, fromSi = -1) {
  const a = S.active;
  for (let ei = fromEi; ei < a.exercises.length; ei++) {
    const sets = a.exercises[ei].sets;
    for (let si = ei === fromEi ? fromSi + 1 : 0; si < sets.length; si++) {
      if (!sets[si].done) { a.sel = { ei, si }; return true; }
    }
  }
  for (let ei = 0; ei < a.exercises.length; ei++) {
    const si = a.exercises[ei].sets.findIndex(s => !s.done);
    if (si >= 0) { a.sel = { ei, si }; return true; }
  }
  return false;
}

// Copy a logged set's values into later sets of the same exercise that were never filled in.
function carryForward(e, si) {
  const src = e.sets[si];
  if (src.warmup) return;
  for (let i = si + 1; i < e.sets.length; i++) {
    const t = e.sets[i];
    if (!t.done && !t.warmup && !(t.weight > 0)) { t.weight = src.weight; t.reps = src.reps; }
  }
}

function selSet() {
  const a = S.active;
  if (!a || !a.sel) return null;
  const e = a.exercises[a.sel.ei];
  const s = e && e.sets[a.sel.si];
  return s ? { e, s, ex: exById(e.exerciseId) } : null;
}

function fmtSet(ex, s) {
  const r = `<small>x</small> ${s.reps || 0}`;
  if (ex && ex.type === 'bodyweight') {
    return s.weight > 0 ? `BW+${num(toDisp(s.weight))} ${r}` : `BW ${r}`;
  }
  return `${num(toDisp(s.weight))}<small>${unit()}</small> ${r}`;
}

// ---- Render ----

export function render() {
  const a = S.active;
  if (!a) {
    return `<div class="head"><button class="icon-btn plain" data-act="go" data-to="train" aria-label="Back">${icon('back')}</button><h1 class="sm">Workout</h1></div>
      <section class="card"><p>No workout in progress.</p><button class="btn primary block" data-act="go" data-to="train">Go to Train</button></section>`;
  }
  const elapsed = fmtDuration((Date.now() - new Date(a.startedAt)) / 1000);
  const cards = a.exercises.map((e, ei) => {
    const ex = exById(e.exerciseId);
    const name = ex ? ex.name : 'Unknown exercise';
    let n = 0;
    const rows = e.sets.map((s, si) => {
      const label = s.warmup ? 'W' : String(++n);
      const sel = a.sel && a.sel.ei === ei && a.sel.si === si;
      const just = justDone && justDone.ei === ei && justDone.si === si;
      const cls = [s.done ? 'done' : 'todo', s.warmup ? 'warm' : '', sel ? 'sel' : '', just ? 'just' : ''].join(' ');
      return `<div class="set-row ${cls}">
        <button class="set-tag ${s.warmup ? 'w' : ''}" data-act="toggle-warm" data-ei="${ei}" data-si="${si}" aria-label="${s.warmup ? 'Warm-up set, tap to make a working set' : 'Working set, tap to mark as warm-up'}">${label}</button>
        <button class="set-main" data-act="select" data-ei="${ei}" data-si="${si}">
          <span class="big">${fmtSet(ex, s)}</span>
          ${s.warmup ? '<span class="hint">Warm-up, no XP</span>' : ''}
        </button>
        <button class="set-check" data-act="toggle-done" data-ei="${ei}" data-si="${si}" aria-label="${s.done ? 'Set logged, tap to undo' : 'Log set'}">${icon('check')}</button>
      </div>`;
    }).join('');
    return `<section class="ex-card">
      <div class="ex-top">
        <div class="ex-name">${esc(name)}${ex && ex.ranked ? ' <span class="pill accent">Ranked</span>' : ''}</div>
        <button class="icon-btn plain" data-act="ex-menu" data-ei="${ei}" aria-label="Exercise options">${icon('more')}</button>
      </div>
      ${rows}
      <div class="ex-actions">
        <button class="btn sm" data-act="add-set" data-ei="${ei}">${icon('plus')} Add set</button>
        <button class="btn sm" data-act="remove-set" data-ei="${ei}" ${e.sets.length ? '' : 'disabled'}>${icon('minus')} Remove set</button>
      </div>
    </section>`;
  }).join('');

  return `
    <div class="wo-head"><div class="head">
      <button class="icon-btn plain" data-act="leave" aria-label="Back to app">${icon('back')}</button>
      <div class="wo-time" data-elapsed>${elapsed}</div>
      <button class="btn sm primary" data-act="finish">Finish</button>
    </div></div>
    ${cards || '<section class="card"><p class="muted" style="margin:0">Add your first exercise to start logging.</p></section>'}
    <button class="btn block lg" style="margin-top:12px" data-act="add-ex">${icon('plus')} Add exercise</button>
    <button class="btn danger block" style="margin-top:24px" data-act="discard">Discard workout</button>
    ${editor()}
  `;
}

function restBar() {
  const r = S.active.rest;
  if (!r) return '';
  const left = Math.ceil((r.endsAt - Date.now()) / 1000);
  const done = left <= 0;
  return `<div class="rest ${done ? 'done' : ''}" id="rest">
    <div class="rest-time"><span id="rest-left">${done ? 'Rest over' : fmtDuration(left)}</span><small>rest</small></div>
    <button class="btn sm" data-act="rest-adj" data-d="-15">-15s</button>
    <button class="btn sm" data-act="rest-adj" data-d="15">+15s</button>
    <button class="btn sm" data-act="rest-skip">${done ? 'Close' : 'Skip'}</button>
  </div>`;
}

function editor() {
  const cur = selSet();
  const inner = cur ? (() => {
    const { e, s, ex } = cur;
    const setNo = e.sets.slice(0, S.active.sel.si + 1).filter(x => !x.warmup).length;
    const bw = ex && ex.type === 'bodyweight';
    return `<div class="ed-label">${esc(ex ? ex.name : '')} · ${s.warmup ? 'Warm-up' : `Set ${setNo}`}${s.done ? ' · logged' : ''}</div>
      <div class="ed-grid">
        <div class="ed-col">
          <div class="ed-name">${bw ? 'Added' : 'Weight'} (${unit()})</div>
          <div class="ed-ctl">
            <button data-act="adj-w" data-d="-1" aria-label="Less weight">${icon('minus')}</button>
            <input type="text" inputmode="decimal" value="${num(toDisp(s.weight))}" data-change="set-w" aria-label="Weight">
            <button data-act="adj-w" data-d="1" aria-label="More weight">${icon('plus')}</button>
          </div>
        </div>
        <div class="ed-col">
          <div class="ed-name">Reps</div>
          <div class="ed-ctl">
            <button data-act="adj-r" data-d="-1" aria-label="Fewer reps">${icon('minus')}</button>
            <input type="text" inputmode="numeric" value="${s.reps || 0}" data-change="set-r" aria-label="Reps">
            <button data-act="adj-r" data-d="1" aria-label="More reps">${icon('plus')}</button>
          </div>
        </div>
      </div>
      <div class="ed-actions">
        ${s.done ? '<button class="btn" data-act="next-set">Next set</button>' : ''}
        <button class="btn primary lg" data-act="log-set">${s.done ? 'Update set' : `${icon('check')} Log set`}</button>
      </div>`;
  })() : (S.active.exercises.length ? `<div class="ed-label">All sets logged.</div>
      <div class="ed-actions"><button class="btn lg" data-act="add-ex">Add exercise</button><button class="btn primary lg" data-act="finish">Finish</button></div>` : '');
  if (!inner && !S.active.rest) return '';
  return `<div class="editor"><div class="editor-inner">${restBar()}${inner}</div></div>`;
}

// ---- Rest timer ----

let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
}
function beep() {
  if (!audioCtx) return;
  try {
    const t = audioCtx.currentTime;
    [0, 0.25].forEach(off => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.25, t + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + off);
      o.stop(t + off + 0.2);
    });
  } catch {}
}

function restAlert() {
  haptic('success');
  beep();
  const f = document.createElement('div');
  f.className = 'flash';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1300);
}

function startRest(ex) {
  const secs = (ex && ex.rest) || 90;
  S.active.rest = { endsAt: Date.now() + secs * 1000, alerted: false };
}

export function after() { justDone = null; }

export function tick() {
  const a = S.active;
  if (!a || !a.rest) return;
  const el = document.getElementById('rest-left');
  const left = Math.ceil((a.rest.endsAt - Date.now()) / 1000);
  if (left <= 0 && !a.rest.alerted) {
    a.rest.alerted = true;
    save('active');
    restAlert();
    rerender();
    return;
  }
  if (el && left > 0) el.textContent = fmtDuration(left);
}

// ---- Exercise picker (shared with the template editor) ----

export function pickExercise(onPick) {
  const recentIds = [];
  for (const w of [...S.workouts].sort((a, b) => (a.date < b.date ? 1 : -1))) {
    for (const e of w.exercises) if (!recentIds.includes(e.exerciseId)) recentIds.push(e.exerciseId);
    if (recentIds.length > 8) break;
  }
  const all = visibleExercises();
  const sheet = openSheet(`<div class="grab"></div>
    <div class="sheet-head"><h2>Add exercise</h2><button class="icon-btn plain" data-close aria-label="Close">${icon('close')}</button></div>
    <div class="search"><input class="input" type="search" placeholder="Search or create" autocomplete="off" id="ex-q">
      <div class="chips" id="ex-chips" style="margin-top:8px">${['All', ...GROUPS].map(g => `<button class="chip ${g === pickGroup ? 'on' : ''}" data-group="${g}">${g}</button>`).join('')}</div></div>
    <div id="ex-list"></div>`, { cls: 'tall' });
  const list = sheet.querySelector('#ex-list');
  const q = sheet.querySelector('#ex-q');
  const draw = () => {
    const term = q.value.trim().toLowerCase();
    const compact = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const words = term.split(/[^a-z0-9]+/).filter(Boolean);
    const matches = e => { const n = compact(e.name); return words.every(w => n.includes(w)); };
    const inGroup = e => pickGroup === 'All' || (e.muscles && e.muscles[0] && MUSCLE_BY_KEY[e.muscles[0]]?.group === pickGroup);
    const match = all.filter(e => (!term || matches(e)) && inGroup(e));
    const recent = term || pickGroup !== 'All' ? [] : recentIds.map(id => all.find(e => e.id === id)).filter(Boolean);
    const rest = match.filter(e => !recent.includes(e)).sort((a, b) => (b.ranked - a.ranked) || a.name.localeCompare(b.name));
    const row = e => `<button class="row" data-pick="${esc(e.id)}"><div class="grow"><div class="title">${esc(e.name)}</div>
      <div class="sub">${[e.ranked ? 'Ranked lift' : '', e.muscles && e.muscles[0] ? MUSCLE_BY_KEY[e.muscles[0]]?.name : '', e.equip ? EQUIP_NAMES[e.equip] : (e.type === 'bodyweight' ? 'Bodyweight' : '')].filter(Boolean).join(' · ')}</div></div>${icon('plus')}</button>`;
    const exact = all.some(e => e.name.toLowerCase() === term);
    list.innerHTML = (term && !exact ? `<div class="card" style="margin:8px 0">
        <div class="title" style="font-weight:600">Create "${esc(q.value.trim())}"</div>
        <label class="row" style="padding:8px 0;border:0;min-height:48px"><span class="grow">Bodyweight exercise (log added weight)</span><span class="switch"><input type="checkbox" id="new-bw"><i></i></span></label>
        <button class="btn primary block" data-create>Create and add</button></div>` : '') +
      (recent.length ? `<div class="section-title" style="margin-top:8px">Recent</div>${recent.map(row).join('')}` : '') +
      (rest.length ? `<div class="section-title" style="margin-top:12px">${term ? 'Matches' : pickGroup === 'All' ? 'All exercises' : pickGroup} (${rest.length})</div>${rest.map(row).join('')}` : (term ? '' : '<div class="empty">No exercises in this group.</div>'));
  };
  q.addEventListener('input', draw);
  sheet.querySelector('#ex-chips').addEventListener('click', ev => {
    const c = ev.target.closest('[data-group]');
    if (!c) return;
    pickGroup = c.dataset.group;
    sheet.querySelectorAll('#ex-chips .chip').forEach(x => x.classList.toggle('on', x === c));
    draw();
  });
  list.addEventListener('click', async ev => {
    const p = ev.target.closest('[data-pick]');
    if (p) { closeSheet(); onPick(p.dataset.pick); return; }
    if (ev.target.closest('[data-create]')) {
      const name = q.value.trim();
      const ex = { id: uid('ex'), name, type: sheet.querySelector('#new-bw').checked ? 'bodyweight' : 'weighted', ranked: false, rest: 90, archived: false, benchmarks: null,
        muscles: pickGroup !== 'All' ? [Object.values(MUSCLE_BY_KEY).find(m => m.group === pickGroup).key] : [] };
      S.exercises.push(ex);
      await save('exercises');
      closeSheet();
      onPick(ex.id);
    }
  });
  draw();
}

// ---- Actions ----

const RPE_TEXT = {
  1: 'Very easy. Could have done much more.', 2: 'Very easy. Could have done much more.',
  3: 'Easy. Plenty left in the tank.', 4: 'Easy. Plenty left in the tank.',
  5: 'Moderate.', 6: 'Somewhat hard. 4 or more reps left on most sets.',
  7: 'Hard. About 3 reps left on most sets.', 8: 'Very hard. About 2 reps left on most sets.',
  9: 'Close to your limit. About 1 rep left.', 10: 'Maximal. Nothing left.',
};

async function persist() { await save('active'); rerender(); }

function setAt(el) {
  const e = S.active.exercises[Number(el.dataset.ei)];
  return { e, s: e.sets[Number(el.dataset.si)], ei: Number(el.dataset.ei), si: Number(el.dataset.si) };
}

function openFinish() {
  let rpe = 7;
  const sheet = openSheet(`<div class="grab"></div>
    <div class="sheet-head"><h2>How hard was this session?</h2><button class="icon-btn plain" data-close aria-label="Close">${icon('close')}</button></div>
    <p class="muted small" style="margin:0">RPE, 1 (very easy) to 10 (maximal). XP for effort stops rising at 8, so there is no extra reward for going to your limit.</p>
    <div class="rpe-grid">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button data-rpe="${n}" class="${n === rpe ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div class="rpe-desc" id="rpe-desc">${RPE_TEXT[rpe]}</div>
    <label class="field"><span>Note (optional)</span><textarea class="input" id="wo-note" rows="2"></textarea></label>
    <button class="btn primary block lg" style="margin-top:16px" id="wo-save">Save workout</button>`);
  sheet.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-rpe]');
    if (b) {
      rpe = Number(b.dataset.rpe);
      haptic('light');
      sheet.querySelectorAll('[data-rpe]').forEach(x => x.classList.toggle('on', x === b));
      sheet.querySelector('#rpe-desc').textContent = RPE_TEXT[rpe];
    }
    if (ev.target.closest('#wo-save')) {
      const note = sheet.querySelector('#wo-note').value.trim();
      closeSheet();
      await finishWorkout(rpe, note);
    }
  });
}

async function finishWorkout(rpe, note) {
  const a = S.active;
  haptic('success');
  const w = {
    id: a.id, date: a.startedAt, endedAt: new Date().toISOString(), rpe, note, bodyweight: currentBodyweight(),
    exercises: a.exercises.map(e => ({ exerciseId: e.exerciseId, sets: e.sets.filter(s => s.done).map(s => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, warmup: !!s.warmup, done: true })) }))
      .filter(e => e.sets.length),
  };
  S.workouts.push(w);
  S.active = null;
  await save('workouts', 'active');
  go('summary/' + w.id + '/new', { replace: true });
}

export const actions = {
  leave: () => go('home'),
  select: async el => { S.active.sel = { ei: Number(el.dataset.ei), si: Number(el.dataset.si) }; await persist(); },
  'toggle-warm': async el => { const { s } = setAt(el); s.warmup = !s.warmup; await persist(); },
  'toggle-done': async el => {
    unlockAudio();
    const { e, s, ei, si } = setAt(el);
    s.done = !s.done;
    justDone = s.done ? { ei, si } : null;
    haptic(s.done ? 'medium' : 'light');
    if (s.done) { carryForward(e, si); startRest(exById(e.exerciseId)); selectNext(ei, si); }
    else S.active.sel = { ei, si };
    await persist();
  },
  'log-set': async () => {
    unlockAudio();
    const cur = selSet();
    if (!cur) return;
    const wasDone = cur.s.done;
    cur.s.done = true;
    justDone = wasDone ? null : { ...S.active.sel };
    haptic(wasDone ? 'light' : 'medium');
    if (!wasDone) {
      carryForward(cur.e, S.active.sel.si);
      startRest(cur.ex);
      if (!selectNext(S.active.sel.ei, S.active.sel.si)) S.active.sel = null;
    }
    await persist();
  },
  'next-set': async () => { if (!selectNext(S.active.sel.ei, S.active.sel.si)) S.active.sel = null; await persist(); },
  'adj-w': async el => {
    const cur = selSet(); if (!cur) return;
    const step = plateStep() * Number(el.dataset.d);
    const v = Math.max(0, Math.round((toDisp(cur.s.weight) + step) * 100) / 100);
    cur.s.weight = fromDisp(v);
    await persist();
  },
  'adj-r': async el => {
    const cur = selSet(); if (!cur) return;
    cur.s.reps = Math.max(0, (Number(cur.s.reps) || 0) + Number(el.dataset.d));
    await persist();
  },
  'set-w': async el => {
    const cur = selSet(); if (!cur) return;
    const v = parseFloat(el.value.replace(',', '.'));
    if (!isNaN(v) && v >= 0) cur.s.weight = fromDisp(v);
    await persist();
  },
  'set-r': async el => {
    const cur = selSet(); if (!cur) return;
    const v = parseInt(el.value, 10);
    if (!isNaN(v) && v >= 0) cur.s.reps = v;
    await persist();
  },
  'add-set': async el => {
    const ei = Number(el.dataset.ei);
    const sets = S.active.exercises[ei].sets;
    const prev = sets[sets.length - 1];
    sets.push(prev ? { weight: prev.weight, reps: prev.reps, warmup: false, done: false } : { weight: 0, reps: 5, warmup: false, done: false });
    S.active.sel = { ei, si: sets.length - 1 };
    await persist();
  },
  'remove-set': async el => {
    const ei = Number(el.dataset.ei);
    const sets = S.active.exercises[ei].sets;
    sets.pop();
    if (S.active.sel && S.active.sel.ei === ei && S.active.sel.si >= sets.length) { if (!selectNext()) S.active.sel = null; }
    await persist();
  },
  'add-ex': () => pickExercise(async id => {
    S.active.exercises.push(newExercise(id));
    const ei = S.active.exercises.length - 1;
    const si = S.active.exercises[ei].sets.findIndex(s => !s.done);
    S.active.sel = si >= 0 ? { ei, si } : S.active.sel;
    await persist();
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
  }),
  'ex-menu': el => {
    const ei = Number(el.dataset.ei);
    const e = S.active.exercises[ei];
    const ex = exById(e.exerciseId);
    const sheet = openSheet(`<div class="grab"></div>
      <div class="sheet-head"><h2>${esc(ex ? ex.name : '')}</h2><button class="icon-btn plain" data-close aria-label="Close">${icon('close')}</button></div>
      <div class="row" style="border:0"><span class="grow">Rest time</span>
        <div class="stepper"><button class="icon-btn" data-rest="-15" aria-label="Shorter rest">${icon('minus')}</button><span class="val" id="rest-val">${fmtDuration(ex.rest || 90)}</span><button class="icon-btn" data-rest="15" aria-label="Longer rest">${icon('plus')}</button></div></div>
      <button class="row" data-move="-1" ${ei === 0 ? 'disabled' : ''}>${icon('up')}<span class="grow">Move up</span></button>
      <button class="row" data-move="1" ${ei === S.active.exercises.length - 1 ? 'disabled' : ''}>${icon('down')}<span class="grow">Move down</span></button>
      <button class="row" data-remove style="color:var(--danger)">${icon('trash')}<span class="grow">Remove exercise</span></button>`);
    sheet.addEventListener('click', async ev => {
      const r = ev.target.closest('[data-rest]');
      if (r && ex) {
        ex.rest = Math.max(15, Math.min(600, (ex.rest || 90) + Number(r.dataset.rest)));
        sheet.querySelector('#rest-val').textContent = fmtDuration(ex.rest);
        await save('exercises');
      }
      const m = ev.target.closest('[data-move]');
      if (m && !m.disabled) {
        const to = ei + Number(m.dataset.move);
        const arr = S.active.exercises;
        [arr[ei], arr[to]] = [arr[to], arr[ei]];
        S.active.sel = null; selectNext();
        closeSheet(); await persist();
      }
      if (ev.target.closest('[data-remove]')) {
        if (e.sets.some(s => s.done) && !confirm('Remove this exercise and its logged sets?')) return;
        S.active.exercises.splice(ei, 1);
        S.active.sel = null; selectNext();
        closeSheet(); await persist();
      }
    });
  },
  'rest-adj': async el => {
    const r = S.active.rest; if (!r) return;
    r.endsAt = Math.max(Date.now(), r.endsAt) + Number(el.dataset.d) * 1000;
    if (r.endsAt > Date.now()) r.alerted = false;
    await persist();
  },
  'rest-skip': async () => { S.active.rest = null; await persist(); },
  finish: () => {
    const any = S.active.exercises.some(e => e.sets.some(s => s.done && !s.warmup && s.reps > 0));
    if (!any) {
      if (confirm('No working sets are logged. Discard this workout?')) actions.discard(null, true);
      return;
    }
    openFinish();
  },
  discard: async (_el, skipConfirm) => {
    if (!skipConfirm && !confirm('Discard this workout? Logged sets will be lost.')) return;
    S.active = null;
    await save('active');
    toast('Workout discarded.');
    go('home', { replace: true });
  },
};
