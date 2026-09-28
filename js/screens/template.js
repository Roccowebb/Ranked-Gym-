// Template editor.
import { S, save, exById } from '../state.js';
import { esc, icon, toast } from '../ui.js';
import { go, back, render as rerender } from '../app.js';
import { pickExercise, startWorkout } from './workout.js';

export const full = true;

const tpl = id => S.templates.find(t => t.id === id);

export function render([id]) {
  const t = tpl(id);
  if (!t) return `<div class="head"><button class="icon-btn plain" data-act="back" data-fallback="train">${icon('back')}</button><h1 class="sm">Template</h1></div><div class="card">Template not found.</div>`;
  const rows = t.exercises.map((e, i) => {
    const ex = exById(e.exerciseId);
    return `<div class="row" style="flex-wrap:wrap;row-gap:4px">
      <div class="title" style="flex-basis:100%">${esc(ex ? ex.name : 'Unknown exercise')}</div>
      <div class="stepper">
        <button class="icon-btn" data-act="sets" data-i="${i}" data-d="-1" aria-label="Fewer sets">${icon('minus')}</button>
        <span class="num" style="min-width:56px;text-align:center">${e.sets} ${e.sets === 1 ? 'set' : 'sets'}</span>
        <button class="icon-btn" data-act="sets" data-i="${i}" data-d="1" aria-label="More sets">${icon('plus')}</button>
      </div>
      <span class="grow"></span>
      <button class="icon-btn plain" data-act="move" data-i="${i}" data-d="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
      <button class="icon-btn plain" data-act="del" data-i="${i}" aria-label="Remove">${icon('trash')}</button>
    </div>`;
  }).join('');
  return `
    <div class="head"><button class="icon-btn plain" data-act="back" data-fallback="train" aria-label="Back">${icon('back')}</button><h1 class="sm">Edit template</h1></div>
    <label class="field"><span>Name</span><input class="input" value="${esc(t.name)}" data-change="name" maxlength="40"></label>
    <div class="section-title">Exercises</div>
    <section class="card flush">${rows || '<div class="empty">No exercises yet.</div>'}</section>
    <button class="btn block" style="margin-top:12px" data-act="add">${icon('plus')} Add exercise</button>
    <p class="muted small">Weights and reps are filled in from your last session with each exercise.</p>
    <button class="btn primary block lg" style="margin-top:12px" data-act="start" ${t.exercises.length ? '' : 'disabled'}>Start this workout</button>
    <button class="btn danger block" style="margin-top:24px" data-act="delete-tpl">Delete template</button>
  `;
}

const cur = () => tpl(location.hash.split('/')[2]);
async function persist() { await save('templates'); rerender(); }

export const actions = {
  name: async el => { const t = cur(); t.name = el.value.trim() || 'Untitled'; await save('templates'); },
  sets: async el => { const e = cur().exercises[Number(el.dataset.i)]; e.sets = Math.max(1, Math.min(10, e.sets + Number(el.dataset.d))); await persist(); },
  move: async el => {
    const arr = cur().exercises, i = Number(el.dataset.i), j = i + Number(el.dataset.d);
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    await persist();
  },
  del: async el => { cur().exercises.splice(Number(el.dataset.i), 1); await persist(); },
  add: () => pickExercise(async id => { cur().exercises.push({ exerciseId: id, sets: 3 }); await persist(); }),
  start: async () => {
    if (S.active) { toast('Finish or discard the current workout first.'); return; }
    await startWorkout({ templateId: cur().id });
    go('workout', { replace: true });
  },
  'delete-tpl': async () => {
    if (!confirm('Delete this template?')) return;
    S.templates = S.templates.filter(t => t !== cur());
    await save('templates');
    back('train');
  },
};

export const tab = 'train';
