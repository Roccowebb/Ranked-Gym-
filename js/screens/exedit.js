// Edit an exercise: name, type, ranked, rest time, benchmarks.
import { S, save, exById, toDisp, fromDisp, num, unit, rankedLifts } from '../state.js';
import { esc, icon, fmtDuration, toast } from '../ui.js';
import { TIERS } from '../engine.js';
import { DEFAULT_BENCHMARKS } from '../defaults.js';
import { back, render as rerender } from '../app.js';

export const full = true;
const cur = () => exById(decodeURIComponent(location.hash.split('/')[2] || ''));

export function render([id]) {
  const ex = exById(id);
  const head = `<div class="head"><button class="icon-btn plain" data-act="back" data-fallback="settings" aria-label="Back">${icon('back')}</button><h1 class="sm">Edit exercise</h1></div>`;
  if (!ex) return head + '<div class="card">Exercise not found.</div>';
  const bw = ex.type === 'bodyweight';
  const bm = ex.benchmarks || [];
  const rows = TIERS.slice(1).map((t, i) => {
    const b = bm[i] || {};
    return `<tr><td>${t}</td>
      ${bw ? `<td><input class="input" type="text" inputmode="numeric" value="${b.reps > 0 ? b.reps : ''}" placeholder="-" data-change="bench" data-i="${i}" data-f="reps" aria-label="${t} reps"></td>` : ''}
      <td><input class="input" type="text" inputmode="decimal" value="${b.kg > 0 ? num(toDisp(b.kg)) : ''}" placeholder="-" data-change="bench" data-i="${i}" data-f="kg" aria-label="${t} ${bw ? 'added weight' : 'weight'}"></td></tr>`;
  }).join('');
  const hasDefault = !!DEFAULT_BENCHMARKS[ex.id];

  return `${head}
    <label class="field"><span>Name</span><input class="input" value="${esc(ex.name)}" data-change="name" maxlength="50"></label>
    <div class="field"><span>Type</span>
      <div class="seg"><button class="${!bw ? 'on' : ''}" data-act="type" data-v="weighted">Weighted</button><button class="${bw ? 'on' : ''}" data-act="type" data-v="bodyweight">Bodyweight + added</button></div>
    </div>
    <section class="card flush">
      <label class="row" style="border:0"><div class="grow"><div class="title">Ranked lift</div><div class="sub">Has its own rank and rank tests</div></div>
        <span class="switch"><input type="checkbox" ${ex.ranked ? 'checked' : ''} data-change="ranked"><i></i></span></label>
      <div class="row"><div class="grow"><div class="title">Rest timer</div></div>
        <div class="stepper"><button class="icon-btn" data-act="rest" data-d="-15" aria-label="Shorter rest">${icon('minus')}</button><span class="val">${fmtDuration(ex.rest || 90)}</span><button class="icon-btn" data-act="rest" data-d="15" aria-label="Longer rest">${icon('plus')}</button></div></div>
    </section>

    <div class="section-title">Rank test benchmarks</div>
    <section class="card">
      <p class="muted small" style="margin:0 0 8px">${bw
        ? `Reps: bodyweight reps in one set. Added: added-weight estimated 1RM in ${unit()}. Either one passes. Leave blank to skip.`
        : `Estimated 1RM in ${unit()} from a set of 1 to 5 reps.`} Starting points only; set them to suit you.</p>
      <table class="t"><thead><tr><th>Promote to</th>${bw ? '<th>Reps</th>' : ''}<th>${bw ? 'Added' : 'e1RM'} (${unit()})</th></tr></thead><tbody>${rows}</tbody></table>
      ${hasDefault ? '<button class="btn sm ghost" style="margin-top:8px" data-act="restore">Restore default benchmarks</button>' : ''}
    </section>
    <button class="btn danger block" style="margin-top:24px" data-act="delete">Delete exercise</button>
  `;
}

async function persist() { await save('exercises'); rerender(); }

export const actions = {
  name: async el => {
    const v = el.value.trim();
    if (!v) { toast('A name is needed.'); rerender(); return; }
    cur().name = v; await save('exercises');
  },
  type: async el => { cur().type = el.dataset.v; await persist(); },
  ranked: async el => {
    const ex = cur();
    ex.ranked = el.checked;
    if (ex.ranked) ex.rankOrder = Math.max(-1, ...rankedLifts().filter(e => e !== ex).map(e => e.rankOrder ?? 0)) + 1;
    if (!ex.benchmarks) ex.benchmarks = [{}, {}, {}, {}, {}];
    await persist();
  },
  rest: async el => { const ex = cur(); ex.rest = Math.max(15, Math.min(600, (ex.rest || 90) + Number(el.dataset.d))); await persist(); },
  bench: async el => {
    const ex = cur();
    if (!ex.benchmarks) ex.benchmarks = [{}, {}, {}, {}, {}];
    const i = Number(el.dataset.i);
    const b = ex.benchmarks[i] = { kg: null, reps: null, ...(ex.benchmarks[i] || {}) };
    const raw = el.value.trim().replace(',', '.');
    const v = raw === '' ? null : parseFloat(raw);
    if (v != null && (isNaN(v) || v < 0)) { toast('Enter a number or leave it blank.'); rerender(); return; }
    if (el.dataset.f === 'kg') b.kg = v == null ? null : fromDisp(v);
    else b.reps = v == null ? null : Math.round(v);
    await persist();
  },
  restore: async () => {
    const ex = cur();
    if (!confirm('Restore the default benchmarks for this exercise?')) return;
    ex.benchmarks = structuredClone(DEFAULT_BENCHMARKS[ex.id]);
    await persist();
    toast('Defaults restored.');
  },
  delete: async () => {
    const ex = cur();
    const used = S.workouts.some(w => w.exercises.some(e => e.exerciseId === ex.id));
    if (!confirm(used ? 'Delete this exercise? It has logged sets, so it will be hidden rather than erased, and your history stays intact.' : 'Delete this exercise?')) return;
    if (used) { ex.archived = true; ex.ranked = false; }
    else S.exercises = S.exercises.filter(e => e !== ex);
    for (const t of S.templates) t.exercises = t.exercises.filter(e => e.exerciseId !== ex.id);
    await save('exercises', 'templates');
    back('settings');
  },
};

export const tab = 'settings';
