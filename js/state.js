// App state: loaded from storage, saved per collection, derived data cached.
import * as db from './db.js';
import { compute, weekKey } from './engine.js';
import { defaultExercises, defaultSettings, defaultTemplates, libraryExercise } from './defaults.js';
import { LIBRARY } from './library.js';

// v1 shipped these defaults. Exercises still on them get the new ones.
const V1_BENCH = {
  squat: [70, 100, 125, 150, 180], bench: [60, 80, 100, 120, 140], deadlift: [100, 130, 155, 180, 210],
  ohp: [40, 50, 60, 75, 90], dbbench: [20, 26, 32, 40, 50],
};
const V1_NAMES = { curl: 'Bicep curl', calf: 'Calf raise' };

function isV1Bench(ex) {
  const b = ex.benchmarks;
  if (!b) return true;
  if (ex.id === 'pullup') return b[0]?.reps === 5 && b[1]?.kg === 15 && b[1]?.reps === 10 && b[2]?.kg === 25 && !b[2]?.reps && b[4]?.kg === 50;
  const v1 = V1_BENCH[ex.id];
  return !!v1 && b.length === 5 && b.every((x, i) => x && x.kg === v1[i] && !x.reps);
}

// Bring stored data up to the current data version. Never removes anything.
export function migrate() {
  const v = S.settings.dataVersion || 1;
  if (v >= 2) return false;
  const byId = new Map(S.exercises.map(e => [e.id, e]));
  for (const l of LIBRARY) {
    const ex = byId.get(l.id);
    if (!ex) {
      const fresh = libraryExercise(l);
      fresh.ranked = false;
      delete fresh.rankOrder;
      S.exercises.push(fresh);
      continue;
    }
    if (!ex.muscles) ex.muscles = [...l.muscles];
    if (!ex.equip) ex.equip = l.equip;
    if (isV1Bench(ex)) ex.benchmarks = structuredClone(l.benchmarks);
    if (V1_NAMES[ex.id] && ex.name === V1_NAMES[ex.id]) ex.name = l.name;
  }
  S.settings.dataVersion = 2;
  return true;
}

export const KEYS = ['settings', 'exercises', 'workouts', 'templates', 'bodyweight'];
export const SCHEMA_VERSION = 1;

export const S = {
  settings: null,
  exercises: [],
  workouts: [],
  templates: [],
  bodyweight: [],
  active: null,
};

let derivedCache = null;

export async function load() {
  await db.init();
  for (const k of KEYS) S[k] = await db.get(k);
  S.active = (await db.get('active')) || null;
  let fresh = false;
  if (!S.settings) { S.settings = defaultSettings(); fresh = true; }
  const storedVersion = fresh ? 2 : (S.settings.dataVersion || 1);
  S.settings = { ...defaultSettings(), ...S.settings, dataVersion: storedVersion };
  if (!Array.isArray(S.exercises) || !S.exercises.length) S.exercises = defaultExercises();
  if (!Array.isArray(S.templates)) S.templates = defaultTemplates();
  if (!Array.isArray(S.workouts)) S.workouts = [];
  if (!Array.isArray(S.bodyweight)) S.bodyweight = [];
  if (fresh) for (const k of KEYS) await db.set(k, S[k]);
  else if (migrate()) await save('settings', 'exercises');
  invalidate();
}

export function invalidate() { derivedCache = null; }

export function derived() {
  if (!derivedCache) derivedCache = compute(S, new Date());
  return derivedCache;
}

export async function save(...keys) {
  for (const k of keys) {
    if (k === 'active') await db.set('active', S.active || undefined);
    else await db.set(k, S[k]);
  }
  if (keys.some(k => k !== 'active')) invalidate();
}

export const usingFallback = () => db.usingFallback;

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function exById(id) { return S.exercises.find(e => e.id === id); }

export function rankedLifts() {
  return S.exercises.filter(e => e.ranked && !e.archived).sort((a, b) => (a.rankOrder ?? 0) - (b.rankOrder ?? 0));
}

export function visibleExercises() {
  return S.exercises.filter(e => !e.archived);
}

// ---- Units ----

const LB = 2.2046226218;
export const unit = () => S.settings.units;
export const toDisp = kg => (S.settings.units === 'lb' ? kg * LB : kg);
export const fromDisp = v => (S.settings.units === 'lb' ? v / LB : v);
export const plateStep = () => (S.settings.units === 'lb' ? S.settings.plateLb : S.settings.plateKg) || 2.5;

export function num(v, dp = 1) {
  const r = Math.round(v * 10 ** dp) / 10 ** dp;
  return r.toLocaleString('en-GB', { maximumFractionDigits: dp });
}
export const w = (kg, dp = 1) => `${num(toDisp(kg), dp)} ${unit()}`;
export const wNum = (kg, dp = 1) => num(toDisp(kg), dp);

// ---- Settings helpers ----

export function currentBodyweight() {
  return Number(S.settings.bodyweight) || 70;
}

export async function setWeeklyTarget(n) {
  const wk = weekKey(new Date());
  const h = (S.settings.targetHistory || []).filter(e => e.from !== wk);
  if (!h.length && S.workouts.length) {
    // Keep the old target for weeks before this one.
    h.push({ from: '0000-01-01', target: S.settings.weeklyTarget });
  }
  h.push({ from: wk, target: n });
  S.settings.targetHistory = h;
  S.settings.weeklyTarget = n;
  await save('settings');
}

// ---- Backup ----

export function exportData() {
  const data = {};
  for (const k of KEYS) data[k] = S[k];
  return { app: 'ranked-gym', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data };
}

export function validateBackup(obj) {
  if (!obj || obj.app !== 'ranked-gym' || typeof obj.data !== 'object') throw new Error('This file is not a Ranked Gym backup.');
  if ((obj.schemaVersion || 1) > SCHEMA_VERSION) throw new Error('This backup is from a newer version of the app. Update the app first.');
  const d = obj.data;
  if (!d.settings || !Array.isArray(d.exercises) || !Array.isArray(d.workouts)) throw new Error('The backup is missing data.');
  return {
    workouts: d.workouts.filter(w => !w.placement).length,
    last: d.workouts.map(w => w.date).sort().pop() || null,
    exercises: d.exercises.length,
    templates: (d.templates || []).length,
  };
}

export async function importData(obj) {
  validateBackup(obj);
  const d = obj.data;
  S.settings = { ...defaultSettings(), ...d.settings, lastBackupAt: obj.exportedAt || d.settings.lastBackupAt || null };
  S.exercises = d.exercises;
  S.workouts = d.workouts;
  S.templates = d.templates || [];
  S.bodyweight = d.bodyweight || [];
  S.active = null;
  if (!d.settings.dataVersion) S.settings.dataVersion = 1;
  migrate();
  await save(...KEYS, 'active');
}

export async function resetAll() {
  await db.clearAll();
  S.settings = defaultSettings();
  S.exercises = defaultExercises();
  S.templates = defaultTemplates();
  S.workouts = [];
  S.bodyweight = [];
  S.active = null;
  await save(...KEYS);
}
