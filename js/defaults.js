// Default data shipped with the app. Benchmarks are starting points, not
// official standards; all of them are editable in Settings.

import { LIBRARY } from './library.js';

export const DEFAULT_BENCHMARKS = Object.fromEntries(LIBRARY.map(e => [e.id, e.benchmarks]));

export function libraryExercise(l) {
  return {
    id: l.id, name: l.name, type: l.type, equip: l.equip, muscles: [...l.muscles],
    ranked: l.rankedDefault >= 0, ...(l.rankedDefault >= 0 ? { rankOrder: l.rankedDefault } : {}),
    rest: l.rest, archived: false, benchmarks: structuredClone(l.benchmarks),
  };
}

export function defaultExercises() {
  return LIBRARY.map(libraryExercise);
}

const t = (id, name, items) => ({ id, name, exercises: items.map(([exerciseId, sets]) => ({ exerciseId, sets })) });

export function defaultTemplates() {
  return [
    t('tpl-push', 'Push', [['bench', 3], ['ohp', 3], ['inclinedb', 3], ['lateral', 3], ['pushdown', 3]]),
    t('tpl-pull', 'Pull', [['deadlift', 3], ['pullup', 3], ['row', 3], ['facepull', 3], ['curl', 3]]),
    t('tpl-legs', 'Legs', [['squat', 3], ['rdl', 3], ['legpress', 3], ['calf', 3]]),
    t('tpl-upper', 'Upper', [['bench', 3], ['row', 3], ['ohp', 3], ['pullup', 3]]),
    t('tpl-lower', 'Lower', [['squat', 3], ['deadlift', 2], ['lunge', 3], ['calf', 3]]),
  ];
}

export function defaultSettings() {
  return {
    bodyweight: 70,
    units: 'kg',
    plateKg: 2.5,
    plateLb: 5,
    weeklyTarget: 3,
    targetHistory: [],
    theme: 'dark',
    benchmarkScale: 1,
    inactiveDays: 21,
    lastBackupAt: null,
    backupSnoozeUntil: null,
    onboarded: false,
    haptics: true,
    dataVersion: 2,
    createdAt: new Date().toISOString(),
  };
}
