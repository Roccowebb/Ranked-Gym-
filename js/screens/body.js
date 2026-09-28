// Body map: every muscle group coloured by its strength rank.
import { S, derived, exById, w as fmtW } from '../state.js';
import { esc, badge, icon, openSheet, bar, tierColor } from '../ui.js';
import { rankName, TIERS, exerciseStrength, benchFor } from '../engine.js';
import { MUSCLES, MUSCLE_BY_KEY, GROUPS } from '../library.js';
import { bodyFigure, bodyLegend } from '../body.js';
import { go } from '../app.js';
import { haptic } from '../haptics.js';

export const full = true;

function rankText(m) {
  if (!m || !m.trained) return 'Not ranked yet';
  return rankName(m.tier, m.div) + (m.inactive ? ' · inactive' : '');
}

export function render() {
  const d = derived();
  const mus = d.muscles;
  const groups = GROUPS.map(g => {
    const rows = MUSCLES.filter(m => m.group === g).map(m => {
      const r = mus[m.key];
      const ex = r && r.exerciseId ? exById(r.exerciseId) : null;
      return `<button class="row" data-act="muscle" data-k="${m.key}">
        ${r && r.trained ? badge(r.tier, r.div, { size: 30, inactive: r.inactive }) : '<span class="badge-empty"></span>'}
        <div class="grow"><div class="title">${esc(m.name)}</div><div class="sub">${ex ? `From ${esc(ex.name)}` : 'Log an exercise for this muscle to rank it'}</div></div>
        <div class="end small ${r && r.trained ? '' : 'muted'}">${rankText(r)}</div>
      </button>`;
    }).join('');
    return `<div class="section-title">${g}</div><section class="card flush">${rows}</section>`;
  }).join('');

  return `<div class="head"><button class="icon-btn plain" data-act="back" data-fallback="home" aria-label="Back">${icon('back')}</button><h1 class="sm">Muscle ranks</h1></div>
    <section class="card body-card">
      <div class="body-pair">
        <figure>${bodyFigure('front', mus, { width: 160 })}<figcaption>Front</figcaption></figure>
        <figure>${bodyFigure('back', mus, { width: 160 })}<figcaption>Back</figcaption></figure>
      </div>
      ${bodyLegend()}
      <p class="muted small" style="margin:10px 0 0">Tap a muscle. Each muscle takes the rank of its strongest exercise: your best set of up to 10 reps against that exercise's benchmark. Exercises where it is a secondary muscle count one tier lower.</p>
    </section>
    ${groups}`;
}

function openMuscle(key) {
  const d = derived();
  const m = d.muscles[key] || { exercises: [], trained: false };
  const info = MUSCLE_BY_KEY[key];
  const scale = S.settings.benchmarkScale || 1;
  const best = m.exerciseId ? exById(m.exerciseId) : null;
  const pb = best ? d.pbs[best.id] : null;
  let bestBlock = '<p class="muted" style="margin:8px 0 0">Not ranked yet. Log any exercise below to place this muscle.</p>';
  if (best && pb) {
    const st = exerciseStrength(best, pb, scale);
    const bw = best.type === 'bodyweight';
    const nb = st && st.tier < 5 ? benchFor(best, st.tier + 1) : null;
    const nbText = nb ? [nb.reps > 0 ? `${nb.reps} reps` : '', nb.kg > 0 ? `${bw ? '+' : ''}${fmtW(nb.kg * scale)} e1RM` : ''].filter(Boolean).join(' or ') : '';
    bestBlock = `<div class="kv"><span>Strongest exercise</span><span>${esc(best.name)}</span></div>
      <div class="kv"><span>Best</span><span>${pb.e1rm > 0 ? `${bw ? '+' : ''}${fmtW(pb.e1rm)} e1RM` : ''}${bw && pb.maxReps ? `${pb.e1rm > 0 ? ', ' : ''}${pb.maxReps} reps` : ''}</span></div>
      ${nb ? `<div class="kv"><span>Next: ${TIERS[st.tier + 1]}</span><span>${nbText}</span></div>
      <div style="margin-top:6px">${bar(st.next || 0, tierColor(st.tier + 1))}</div>` : ''}
      ${!m.primary ? '<p class="muted small" style="margin:8px 0 0">This comes from an exercise where it is a secondary muscle, so it counts one tier lower.</p>' : ''}`;
  }
  const list = m.exercises.map(id => exById(id)).filter(e => e && !e.archived).map(e => {
    const st = exerciseStrength(e, d.pbs[e.id], scale);
    return { e, st, main: e.muscles[0] === key };
  }).sort((a, b) => ((b.st?.score ?? -1) - (a.st?.score ?? -1)) || (b.main - a.main) || a.e.name.localeCompare(b.e.name));
  const rows = list.map(({ e, st, main }) => `<button class="row" data-go="exercise/${esc(encodeURIComponent(e.id))}">
      ${st ? badge(st.tier, st.div, { size: 26 }) : '<span class="badge-empty sm"></span>'}
      <div class="grow"><div class="title">${esc(e.name)}</div><div class="sub">${main ? 'Main muscle' : 'Secondary'}</div></div>
      <div class="end small ${st ? '' : 'muted'}">${st ? rankName(st.tier, st.div) : 'Not logged'}</div></button>`).join('');
  const sheet = openSheet(`<div class="grab"></div>
    <div class="sheet-head">${m.trained ? badge(m.tier, m.div, { size: 40, inactive: m.inactive }) : ''}<h2>${esc(info.name)}<div class="muted small" style="font-weight:500">${rankText(m)}</div></h2>
      <button class="icon-btn plain" data-close aria-label="Close">${icon('close')}</button></div>
    ${bestBlock}
    ${m.inactive ? `<p class="muted small">Not trained for ${m.daysSince} days. The rank stays; log it again to clear this.</p>` : ''}
    <div class="section-title" style="margin-top:16px">Exercises</div>
    <div>${rows}</div>`, { cls: 'tall' });
  sheet.addEventListener('click', e => {
    const r = e.target.closest('[data-go]');
    if (r) go(r.dataset.go);
  });
}

export function after(root) {
  root.querySelectorAll('.body-fig').forEach(svg => svg.addEventListener('click', e => {
    const p = e.target.closest('[data-muscle]');
    if (p) { haptic('light'); openMuscle(p.dataset.muscle); }
  }));
}

export const actions = {
  muscle: el => openMuscle(el.dataset.k),
};

export const tab = 'progress';
