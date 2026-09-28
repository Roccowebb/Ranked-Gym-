// App entry: loads data, routes between screens, handles the dock and updates.
import { S, load, invalidate, save } from './state.js';
import { icon, esc, fmtDuration, closeSheet } from './ui.js';
import { bindCharts } from './charts.js';
import * as home from './screens/home.js';
import * as train from './screens/train.js';
import * as workout from './screens/workout.js';
import * as summary from './screens/summary.js';
import * as template from './screens/template.js';
import * as progress from './screens/progress.js';
import * as tests from './screens/tests.js';
import * as settings from './screens/settings.js';
import * as exercise from './screens/exercise.js';
import * as exedit from './screens/exedit.js';
import * as onboarding from './screens/onboarding.js';

const routes = { home, train, workout, summary, template, progress, tests, settings, exercise, exedit, onboarding };
const TABS = [['home', 'Home'], ['train', 'Train'], ['progress', 'Progress'], ['tests', 'Tests'], ['settings', 'Settings']];

let current = null;

function parse() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, ...rest] = h.split('/');
  return { name: routes[name] ? name : 'home', params: rest.map(decodeURIComponent) };
}

export function go(path, { replace = false } = {}) {
  const url = '#/' + path;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  render({ scrollTop: true });
}

export function back(fallback = 'home') {
  if (history.length > 1 && history.state !== 'root') history.back();
  else go(fallback, { replace: true });
}

export function applyTheme() {
  const t = S.settings.theme || 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('rg-theme', t); } catch {}
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]').setAttribute('content', bg || '#0e1116');
}

export function render({ scrollTop = false } = {}) {
  const { name, params } = parse();
  if (!S.settings.onboarded && name !== 'onboarding' && name !== 'settings') {
    history.replaceState(null, '', '#/onboarding');
    return render({ scrollTop: true });
  }
  const screen = routes[name];
  const changed = !current || current.name !== name || current.params.join('/') !== params.join('/');
  const y = window.scrollY;
  if (changed) closeSheet();
  current = { name, params, screen };
  const view = document.getElementById('view');
  view.innerHTML = screen.render(params);
  document.body.classList.toggle('full', !!screen.full);
  document.body.classList.toggle('workout', name === 'workout');
  renderDock(name, screen);
  bindCharts(view);
  if (screen.after) screen.after(view, params);
  if (scrollTop || changed) window.scrollTo(0, 0);
  else window.scrollTo(0, y);
}

function renderDock(name, screen) {
  const dock = document.getElementById('dock');
  if (screen.full) { dock.innerHTML = ''; return; }
  const tab = screen.tab || name;
  let action = '';
  if (S.active) {
    const mins = fmtDuration((Date.now() - new Date(S.active.startedAt)) / 1000);
    action = `<div class="dock-action"><button class="resume" data-act="resume">${icon('timer')}<span class="grow">Workout in progress</span><span class="num" data-elapsed>${mins}</span>${icon('chev')}</button></div>`;
  } else if (name === 'home') {
    action = `<div class="dock-action"><button class="btn primary lg block" data-act="start-workout">Start workout</button></div>`;
  }
  dock.innerHTML = `<div class="dock-inner">${action}<nav class="tabs" aria-label="Main">${TABS.map(([k, label]) =>
    `<a class="tab ${tab === k ? 'on' : ''}" href="#/${k}" data-tab="${k}" ${tab === k ? 'aria-current="page"' : ''}>${icon(k)}${esc(label)}</a>`).join('')}</nav></div>`;
}

const globalActions = {
  'resume': () => go('workout'),
  'start-workout': () => go('train'),
  'back': el => back(el.dataset.fallback || 'home'),
  'go': el => go(el.dataset.to),
};

function dispatch(type, e) {
  const attr = type === 'click' ? 'act' : type;
  const el = e.target.closest(`[data-${attr}]`);
  if (!el) return;
  const name = el.dataset[attr];
  const fn = (current && current.screen.actions && current.screen.actions[name]) || globalActions[name];
  if (fn) {
    if (type === 'click') e.preventDefault();
    fn(el, e);
  }
}

function tick() {
  document.querySelectorAll('[data-elapsed]').forEach(el => {
    if (S.active) el.textContent = fmtDuration((Date.now() - new Date(S.active.startedAt)) / 1000);
  });
  if (current && current.screen.tick) current.screen.tick();
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offer = w => {
      if (document.querySelector('.update-bar')) return;
      const bar = document.createElement('div');
      bar.className = 'update-bar';
      bar.innerHTML = '<span>Update available.</span><button class="btn sm">Reload</button>';
      bar.querySelector('button').onclick = () => w.postMessage('skipWaiting');
      document.body.appendChild(bar);
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
      });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  // Only reload when an update replaces a running version, not on first install.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    location.reload();
  });
}

async function main() {
  await load();
  applyTheme();
  window.addEventListener('popstate', () => render());
  document.addEventListener('click', e => dispatch('click', e));
  document.addEventListener('change', e => dispatch('change', e));
  document.addEventListener('input', e => dispatch('input', e));
  document.addEventListener('click', e => {
    const a = e.target.closest('a.tab');
    if (a) { e.preventDefault(); go(a.dataset.tab); }
  });
  if (!location.hash) history.replaceState('root', '', '#/home');
  else history.replaceState('root', '', location.hash);
  render({ scrollTop: true });
  setInterval(tick, 500);
  registerSW();
  // Recompute "inactive" and weekly status when the app returns to the front.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && current && !current.screen.keepOnResume) { invalidate(); render(); }
  });
  window.__rg = { S, render, save, invalidate };
}

main().catch(err => {
  document.getElementById('view').innerHTML = `<div class="card"><h2>Something went wrong loading the app</h2><p class="muted small">${esc(err && err.message)}</p></div>`;
  console.error(err);
});
