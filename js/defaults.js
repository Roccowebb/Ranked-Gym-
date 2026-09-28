// Default data shipped with the app. Benchmarks are starting points, not
// official standards; all of them are editable in Settings.

const kg = (...vals) => vals.map(v => ({ kg: v, reps: null }));

export const DEFAULT_BENCHMARKS = {
  squat: kg(70, 100, 125, 150, 180),
  bench: kg(60, 80, 100, 120, 140),
  deadlift: kg(100, 130, 155, 180, 210),
  ohp: kg(40, 50, 60, 75, 90),
  dbbench: kg(20, 26, 32, 40, 50),
  pullup: [
    { kg: null, reps: 5 },
    { kg: 15, reps: 10 },
    { kg: 25, reps: null },
    { kg: 35, reps: null },
    { kg: 50, reps: null },
  ],
};

const ex = (id, name, extra = {}) => ({
  id, name, type: 'weighted', ranked: false, rest: 90, archived: false,
  benchmarks: DEFAULT_BENCHMARKS[id] ? structuredClone(DEFAULT_BENCHMARKS[id]) : null,
  ...extra,
});

export function defaultExercises() {
  return [
    ex('squat', 'Squat', { ranked: true, rankOrder: 0, rest: 180 }),
    ex('bench', 'Bench press', { ranked: true, rankOrder: 1, rest: 150 }),
    ex('deadlift', 'Deadlift', { ranked: true, rankOrder: 2, rest: 180 }),
    ex('ohp', 'Overhead press', { ranked: true, rankOrder: 3, rest: 150 }),
    ex('pullup', 'Pull-up', { type: 'bodyweight', ranked: true, rankOrder: 4, rest: 120 }),
    ex('dbbench', 'Dumbbell bench press (per dumbbell)', { rest: 120 }),
    ex('row', 'Barbell row', { rest: 120 }),
    ex('rdl', 'Romanian deadlift', { rest: 120 }),
    ex('legpress', 'Leg press'),
    ex('lunge', 'Walking lunge'),
    ex('hipthrust', 'Hip thrust'),
    ex('calf', 'Calf raise', { rest: 60 }),
    ex('inclinedb', 'Incline dumbbell press'),
    ex('dip', 'Dip', { type: 'bodyweight' }),
    ex('chinup', 'Chin-up', { type: 'bodyweight' }),
    ex('pulldown', 'Lat pulldown'),
    ex('cablerow', 'Seated cable row'),
    ex('facepull', 'Face pull', { rest: 60 }),
    ex('lateral', 'Lateral raise', { rest: 60 }),
    ex('curl', 'Bicep curl', { rest: 60 }),
    ex('pushdown', 'Triceps pushdown', { rest: 60 }),
  ];
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
    createdAt: new Date().toISOString(),
  };
}
