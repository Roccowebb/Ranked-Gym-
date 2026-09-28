// Settings.
import { S, save, rankedLifts, visibleExercises, toDisp, fromDisp, num, unit, uid, setWeeklyTarget, resetAll } from '../state.js';
import { esc, icon, fmtDate, toast } from '../ui.js';
import { go, render as rerender, applyTheme } from '../app.js';
import { doExport, pickImport } from '../backup.js';
import { pickExercise } from './workout.js';

export function render() {
  const st = S.settings;
  const ranked = rankedLifts();
  const others = visibleExercises().filter(e => !e.ranked).sort((a, b) => a.name.localeCompare(b.name));
  const plate = st.units === 'lb' ? st.plateLb : st.plateKg;

  return `<div class="head"><h1>Settings</h1></div>

  <div class="section-title">You</div>
  <section class="card">
    <label class="field" style="margin-top:0"><span>Bodyweight (${unit()})</span>
      <input class="input" type="text" inputmode="decimal" value="${num(toDisp(st.bodyweight))}" data-change="bw"></label>
    <div class="field"><span>Units</span>
      <div class="seg"><button class="${st.units === 'kg' ? 'on' : ''}" data-act="units" data-v="kg">kg</button><button class="${st.units === 'lb' ? 'on' : ''}" data-act="units" data-v="lb">lb</button></div></div>
    <label class="field"><span>Weight step for + and - buttons (${unit()})</span>
      <input class="input" type="text" inputmode="decimal" value="${num(plate, 2)}" data-change="plate"></label>
    <div class="row" style="padding:12px 0 0;border:0"><div class="grow"><div class="title">Weekly session target</div><div class="sub">Rest days never break your streak</div></div>
      <div class="stepper"><button class="icon-btn" data-act="target" data-d="-1" aria-label="Fewer sessions">${icon('minus')}</button><span class="val">${st.weeklyTarget}</span><button class="icon-btn" data-act="target" data-d="1" aria-label="More sessions">${icon('plus')}</button></div></div>
  </section>

  <div class="section-title">Ranked lifts</div>
  <section class="card flush">
    ${ranked.map((e, i) => `<div class="row">
      <button class="grow" style="border:0;background:none;text-align:left;padding:0;min-height:44px" data-act="edit" data-id="${esc(e.id)}">
        <div class="title">${esc(e.name)}</div><div class="sub">${e.type === 'bodyweight' ? 'Bodyweight + added' : 'Weighted'} · edit name and benchmarks</div></button>
      <button class="icon-btn plain" data-act="rank-move" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${icon('up')}</button>
      <button class="icon-btn plain" data-act="rank-move" data-i="${i}" data-d="1" ${i === ranked.length - 1 ? 'disabled' : ''} aria-label="Move down">${icon('down')}</button>
    </div>`).join('') || '<div class="empty">No ranked lifts.</div>'}
    <div class="row"><button class="btn sm ghost" data-act="add-ranked">${icon('plus')} Add ranked lift</button></div>
  </section>

  <div class="section-title">Benchmarks</div>
  <section class="card">
    <div class="row" style="padding:0;border:0"><div class="grow"><div class="title">Benchmark scale</div><div class="sub">Makes every weight benchmark easier or harder</div></div>
      <div class="stepper"><button class="icon-btn" data-act="scale" data-d="-5" aria-label="Easier">${icon('minus')}</button><span class="val">${Math.round((st.benchmarkScale || 1) * 100)}%</span><button class="icon-btn" data-act="scale" data-d="5" aria-label="Harder">${icon('plus')}</button></div></div>
    <div class="row" style="padding:12px 0 0;border:0"><div class="grow"><div class="title">Inactive after</div><div class="sub">Days without training a ranked lift</div></div>
      <div class="stepper"><button class="icon-btn" data-act="inactive" data-d="-1" aria-label="Fewer days">${icon('minus')}</button><span class="val">${st.inactiveDays}</span><button class="icon-btn" data-act="inactive" data-d="1" aria-label="More days">${icon('plus')}</button></div></div>
    <p class="muted small" style="margin:12px 0 0">Default benchmarks are starting points, not official standards. Edit each lift's benchmarks from the list above.</p>
  </section>

  <div class="section-title">Other exercises</div>
  <section class="card flush">
    ${others.map(e => `<button class="row" data-act="edit" data-id="${esc(e.id)}"><div class="grow"><div class="title">${esc(e.name)}</div>${e.type === 'bodyweight' ? '<div class="sub">Bodyweight + added</div>' : ''}</div>${icon('chev')}</button>`).join('')}
    <div class="row"><button class="btn sm ghost" data-act="add-ex">${icon('plus')} Add exercise</button></div>
  </section>

  <div class="section-title">Appearance</div>
  <section class="card">
    <div class="seg">${[['dark', 'Dark'], ['light', 'Light'], ['system', 'Match phone']].map(([k, l]) => `<button class="${st.theme === k ? 'on' : ''}" data-act="theme" data-v="${k}">${l}</button>`).join('')}</div>
  </section>

  <div class="section-title">Backup</div>
  <section class="card">
    <p style="margin:0">${st.lastBackupAt ? `Last backup: ${fmtDate(st.lastBackupAt, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No backup taken yet.'}</p>
    <p class="muted small" style="margin:6px 0 0">Your data lives only on this phone. Export a backup to Files or iCloud Drive regularly, and to move to a new phone.</p>
    <div class="btn-row"><button class="btn primary" data-act="export">Export backup</button><button class="btn" data-act="import">Import backup</button></div>
  </section>

  <div class="section-title">Other</div>
  <section class="card">
    <button class="btn block" data-act="setup">Run setup and placement again</button>
    <button class="btn danger block" style="margin-top:10px" data-act="reset">Delete all data</button>
  </section>

  <p class="muted small" style="margin:20px 4px">Ranked Gym v1. Works offline; nothing leaves your phone. The benchmarks are not official standards, and this app does not give medical, nutrition or training advice. Rest when you need to, and stop if something hurts.</p>`;
}

export const actions = {
  bw: async el => {
    const v = parseFloat(el.value.replace(',', '.'));
    if (isNaN(v) || v < 20 || v > 400) { toast('Enter a bodyweight.'); rerender(); return; }
    S.settings.bodyweight = fromDisp(v);
    await save('settings');
    toast('Bodyweight saved.');
  },
  units: async el => { S.settings.units = el.dataset.v; await save('settings'); rerender(); },
  plate: async el => {
    const v = parseFloat(el.value.replace(',', '.'));
    if (isNaN(v) || v <= 0 || v > 50) { toast('Enter a step size.'); rerender(); return; }
    if (S.settings.units === 'lb') S.settings.plateLb = v; else S.settings.plateKg = v;
    await save('settings');
  },
  target: async el => {
    const n = Math.max(1, Math.min(7, S.settings.weeklyTarget + Number(el.dataset.d)));
    if (n === S.settings.weeklyTarget) return;
    await setWeeklyTarget(n);
    rerender();
  },
  scale: async el => {
    const v = Math.round((S.settings.benchmarkScale || 1) * 100) + Number(el.dataset.d);
    S.settings.benchmarkScale = Math.max(50, Math.min(150, v)) / 100;
    await save('settings'); rerender();
  },
  inactive: async el => {
    S.settings.inactiveDays = Math.max(7, Math.min(90, S.settings.inactiveDays + Number(el.dataset.d)));
    await save('settings'); rerender();
  },
  edit: el => go('exedit/' + encodeURIComponent(el.dataset.id)),
  'rank-move': async el => {
    const list = rankedLifts();
    const i = Number(el.dataset.i), j = i + Number(el.dataset.d);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((e, k) => { e.rankOrder = k; });
    await save('exercises'); rerender();
  },
  'add-ranked': () => pickExercise(async id => {
    const ex = S.exercises.find(e => e.id === id);
    if (!ex) return;
    ex.ranked = true;
    ex.rankOrder = rankedLifts().length;
    if (!ex.benchmarks) ex.benchmarks = [{}, {}, {}, {}, {}];
    await save('exercises');
    go('exedit/' + encodeURIComponent(id));
  }),
  'add-ex': async () => {
    const name = prompt('Exercise name');
    if (!name || !name.trim()) return;
    const ex = { id: uid('ex'), name: name.trim(), type: 'weighted', ranked: false, rest: 90, archived: false, benchmarks: null };
    S.exercises.push(ex);
    await save('exercises');
    go('exedit/' + encodeURIComponent(ex.id));
  },
  theme: async el => { S.settings.theme = el.dataset.v; await save('settings'); applyTheme(); rerender(); },
  export: async () => { await doExport(); rerender(); },
  import: () => pickImport(() => { applyTheme(); go('home', { replace: true }); }),
  setup: () => go('onboarding'),
  reset: async () => {
    if (!confirm('Delete all workouts, ranks, templates and settings from this phone? Export a backup first if you might want them back.')) return;
    if (!confirm('This cannot be undone. Delete everything?')) return;
    await resetAll();
    applyTheme();
    toast('All data deleted.');
    go('onboarding', { replace: true });
  },
};

export const tab = 'settings';
