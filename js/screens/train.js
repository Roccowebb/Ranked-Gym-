// Train tab: start a workout, templates, recent workouts.
import { S, save, derived, exById } from '../state.js';
import { esc, fmtDateLong, icon, toast } from '../ui.js';
import { go } from '../app.js';
import { startWorkout } from './workout.js';

export function render() {
  const tpls = S.templates.map(t => {
    const names = t.exercises.map(e => exById(e.exerciseId)).filter(Boolean).map(e => e.name);
    return `<div class="row">
      <button class="grow" style="border:0;background:none;text-align:left;padding:0;min-height:44px" data-act="edit-tpl" data-id="${esc(t.id)}">
        <div class="title">${esc(t.name)}</div>
        <div class="sub">${esc(names.join(', ') || 'No exercises')}</div>
      </button>
      <button class="btn sm primary" data-act="start-tpl" data-id="${esc(t.id)}">Start</button>
    </div>`;
  }).join('');

  const d = derived();
  const recent = S.workouts.filter(w => !w.placement).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 15);
  const history = recent.map(w => {
    const s = d.sessions[w.id];
    const names = w.exercises.map(e => exById(e.exerciseId)).filter(Boolean).map(e => e.name);
    return `<div class="row">
      <button class="grow" style="border:0;background:none;text-align:left;padding:0;min-height:44px" data-act="go" data-to="summary/${esc(w.id)}">
        <div class="title">${fmtDateLong(w.date)}</div>
        <div class="sub">${esc(names.join(', '))}</div>
      </button>
      <div class="end num">${s ? `+${Math.round(s.total)} XP` : ''}</div>
    </div>`;
  }).join('');

  return `
    <div class="head"><h1>Train</h1></div>
    ${S.active ? `<section class="card"><p style="margin:0 0 12px">You have a workout in progress.</p><button class="btn primary block lg" data-act="resume">Resume workout</button></section>` : `
    <section class="card">
      <button class="btn primary block lg" data-act="start-empty">Start empty workout</button>
      ${recent.length ? `<button class="btn block" style="margin-top:10px" data-act="repeat">Repeat last workout</button>` : ''}
    </section>`}
    <div class="section-title" style="display:flex;align-items:center"><span style="flex:1">Templates</span><button class="btn sm ghost" data-act="new-tpl">${icon('plus')} New</button></div>
    <section class="card flush">${tpls || '<div class="empty">No templates yet.</div>'}</section>
    <div class="section-title">Recent workouts</div>
    <section class="card flush">${history || '<div class="empty">Your finished workouts will appear here.</div>'}</section>
  `;
}

async function begin(opts) {
  if (S.active) { toast('Finish or discard the current workout first.'); go('workout'); return; }
  await startWorkout(opts);
  go('workout');
}

export const actions = {
  'start-empty': () => begin({}),
  'start-tpl': el => begin({ templateId: el.dataset.id }),
  'repeat': () => begin({ repeat: true }),
  'edit-tpl': el => go('template/' + el.dataset.id),
  'new-tpl': async () => {
    const t = { id: 'tpl-' + Date.now().toString(36), name: 'New template', exercises: [] };
    S.templates.push(t);
    await save('templates');
    go('template/' + t.id);
  },
};

export const tab = 'train';
