import { S, save, derived, usingFallback } from '../state.js';
import { badge, bar, esc, tierColor, xpText, icon } from '../ui.js';
import { rankName, TIERS, DIVS } from '../engine.js';
import { backupDue, doExport } from '../backup.js';
import { bodyFigure } from '../body.js';
import { MUSCLES } from '../library.js';
import { render as rerender } from '../app.js';

export function render() {
  const d = derived();
  const o = d.overall;
  const lifts = d.lifts;
  const due = backupDue();

  let overall;
  if (!lifts.length) {
    overall = `<section class="card"><p class="muted">No ranked lifts. Add one in Settings.</p></section>`;
  } else {
    const champ = o.tier === 5 && o.div === 2;
    const next = champ ? 'Top rank' : o.div < 2 ? `${Math.floor(o.frac * 100)}% to ${TIERS[o.tier]} ${DIVS[o.div + 1]}` : `${Math.floor(o.frac * 100)}% to ${TIERS[o.tier + 1]} III`;
    overall = `<section class="card overall" aria-label="Overall rank">
      ${badge(o.tier, o.div, { size: 96 })}
      <div style="flex:1;min-width:0">
        <div class="label">Overall rank</div>
        <div class="rank">${rankName(o.tier, o.div)}</div>
        ${bar(o.frac, tierColor(o.tier))}
        <div class="sub">${next}</div>
        ${o.weakest ? `<div class="sub">Weakest lift: <strong>${esc(o.weakest.name)}</strong></div>` : ''}
      </div>
    </section>`;
  }

  const wk = d.week;
  const dots = Array.from({ length: Math.max(wk.target, wk.count) }, (_, i) => `<i class="${i < wk.count ? 'on' : ''}"></i>`).join('');
  const streakNote = wk.hit ? 'Target hit this week' : `x${d.nextStreakMult.toFixed(2)} XP`;

  const notices = [];
  if (due) {
    notices.push(`<section class="card notice" aria-label="Backup reminder">
      <p><strong>${due.never ? 'You have not taken a backup yet.' : `Your last backup was ${due.days} days ago.`}</strong><br>Export a copy to keep your data safe.</p>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn sm" data-act="export">Export</button>
        <button class="btn sm ghost" data-act="snooze">Later</button>
      </div>
    </section>`);
  }
  if (usingFallback()) {
    notices.push(`<section class="card notice"><p><strong>Using basic storage.</strong><br>This browser blocked the main database, so data is kept in simpler storage. Export backups often.</p></section>`);
  }

  const rows = lifts.map(l => {
    const pills = [];
    if (l.full) pills.push(l.nextBench ? '<span class="pill ready">Test ready</span>' : '<span class="pill inactive">No benchmark set</span>');
    if (l.inactive) pills.push('<span class="pill inactive">Inactive</span>');
    let meta = xpText(l);
    if (l.full && l.testProgress != null) meta += ` · ${Math.floor(l.testProgress * 100)}% of ${TIERS[l.tier + 1]} test`;
    if (l.inactive) meta = `Last trained ${l.daysSince} days ago`;
    else if (!l.lastTrained) meta += ' · Not logged yet';
    const frac = l.tier === 5 && l.div === 2 ? 1 : l.xp / l.perDiv;
    return `<a class="lift-row ${l.inactive ? 'is-inactive' : ''}" href="#/exercise/${encodeURIComponent(l.id)}" data-act="go" data-to="exercise/${esc(encodeURIComponent(l.id))}">
      ${badge(l.tier, l.div, { size: 44, inactive: l.inactive })}
      <div style="min-width:0">
        <div class="name">${esc(l.name)} ${pills.join(' ')}</div>
        ${bar(frac, tierColor(l.tier, l.inactive), 'thin')}
        <div class="meta">${meta}</div>
      </div>
      <div class="tier">${rankName(l.tier, l.div)}${icon('chev')}</div>
    </a>`;
  }).join('');

  return `
    <div class="head"><h1>Ranked Gym</h1></div>
    ${overall}
    <div class="stats">
      <section class="stat" aria-label="Sessions this week">
        <div class="label">This week</div>
        <div class="value">${wk.count} <small>of ${wk.target}</small></div>
        <div class="dots">${dots}</div>
      </section>
      <section class="stat" aria-label="Weekly streak">
        <div class="label">Weekly streak</div>
        <div class="value">${d.streak} <small>${d.streak === 1 ? 'week' : 'weeks'}</small></div>
        <div class="note">${streakNote}</div>
      </section>
    </div>
    ${notices.join('')}
    ${bodyCard(d)}
    ${lifts.length ? `<div class="section-title">Ranked lifts</div><section class="card flush">${rows}</section>` : ''}
  `;
}

function bodyCard(d) {
  const ranked = MUSCLES.filter(m => d.muscles[m.key] && d.muscles[m.key].trained).length;
  return `<div class="section-title">Muscle ranks</div>
    <a class="card body-card home-body" href="#/body" data-act="go" data-to="body" aria-label="Open muscle ranks">
      <div class="body-pair">${bodyFigure('front', d.muscles, { width: 120, interactive: false })}${bodyFigure('back', d.muscles, { width: 120, interactive: false })}</div>
      <div class="body-foot"><span>${ranked} of ${MUSCLES.length} muscles ranked</span>${icon('chev')}</div>
    </a>`;
}

export const actions = {
  export: async () => { await doExport(); rerender(); },
  snooze: async () => {
    S.settings.backupSnoozeUntil = new Date(Date.now() + 3 * 86400000).toISOString();
    await save('settings');
    rerender();
  },
};

export const tab = 'home';
