// Exercise library, muscle groups and default benchmarks.
//
// Benchmarks are starting points for a 70 kg lifter, loosely modelled on
// commonly published strength standards for 70 kg men. They are not official
// standards; every one can be edited, and the benchmark scale in Settings
// adjusts them all at once.
//
// Each exercise gives one "Gold" value (roughly an intermediate lifter's
// estimated 1RM, in kg). The other tiers follow a fixed ladder from it.
// Dumbbell values are per dumbbell. Machine and cable numbers vary a lot
// between gyms, so treat those as rough.

export const MUSCLES = [
  { key: 'chest', name: 'Chest', group: 'Chest' },
  { key: 'fdelt', name: 'Front delts', group: 'Shoulders' },
  { key: 'sdelt', name: 'Side delts', group: 'Shoulders' },
  { key: 'rdelt', name: 'Rear delts', group: 'Shoulders' },
  { key: 'traps', name: 'Traps', group: 'Back' },
  { key: 'lats', name: 'Lats', group: 'Back' },
  { key: 'upback', name: 'Upper back', group: 'Back' },
  { key: 'lowback', name: 'Lower back', group: 'Back' },
  { key: 'biceps', name: 'Biceps', group: 'Arms' },
  { key: 'triceps', name: 'Triceps', group: 'Arms' },
  { key: 'forearms', name: 'Forearms', group: 'Arms' },
  { key: 'abs', name: 'Abs', group: 'Core' },
  { key: 'obliques', name: 'Obliques', group: 'Core' },
  { key: 'glutes', name: 'Glutes', group: 'Legs' },
  { key: 'quads', name: 'Quads', group: 'Legs' },
  { key: 'hams', name: 'Hamstrings', group: 'Legs' },
  { key: 'adductors', name: 'Adductors', group: 'Legs' },
  { key: 'calves', name: 'Calves', group: 'Legs' },
];
export const MUSCLE_BY_KEY = Object.fromEntries(MUSCLES.map(m => [m.key, m]));
export const GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];

// Tier ladders: Silver, Gold, Platinum, Diamond, Champion.
const KG_LADDER = [0.72, 1, 1.12, 1.3, 1.6];
const REP_LADDER = [0.45, 1, 1.4, 1.8, 2.4];
const ADDED_LADDER = [null, 1, 5 / 3, 7 / 3, 10 / 3];

function roundTo(v, equip) {
  const step = equip === 'd' || equip === 'k' ? 2 : v >= 100 ? 5 : 2.5;
  return Math.round(v / step) * step;
}

export function ladder(equip, gold, added) {
  if (equip === 'w') {
    return REP_LADDER.map((m, i) => ({
      reps: Math.max(1, Math.round(gold * m)),
      kg: added && ADDED_LADDER[i] ? roundTo(added * ADDED_LADDER[i], 'b') : null,
    }));
  }
  return KG_LADDER.map(m => ({ kg: roundTo(gold * m, equip), reps: null }));
}

// [id, name, equipment, muscles (first is primary), gold, goldAdded for bodyweight, rest seconds]
// Equipment: b barbell, e EZ bar, d dumbbell, k kettlebell, m machine, c cable, s Smith machine, w bodyweight (gold = reps)
const ROWS = [
  // Chest
  ['bench', 'Bench press', 'b', 'chest,triceps,fdelt', 90, 0, 150],
  ['inclinebench', 'Incline bench press', 'b', 'chest,fdelt,triceps', 75],
  ['declinebench', 'Decline bench press', 'b', 'chest,triceps', 90],
  ['closegrip', 'Close-grip bench press', 'b', 'triceps,chest', 77.5],
  ['floorpress', 'Floor press', 'b', 'chest,triceps', 82.5],
  ['smithbench', 'Smith machine bench press', 's', 'chest,triceps', 85],
  ['smithincline', 'Smith machine incline press', 's', 'chest,fdelt', 70],
  ['dbbench', 'Dumbbell bench press (per dumbbell)', 'd', 'chest,triceps,fdelt', 28.5, 0, 120],
  ['inclinedb', 'Incline dumbbell press', 'd', 'chest,fdelt', 26],
  ['declinedb', 'Decline dumbbell press', 'd', 'chest,triceps', 28],
  ['dbfly', 'Dumbbell fly', 'd', 'chest', 16],
  ['inclinedbfly', 'Incline dumbbell fly', 'd', 'chest,fdelt', 14],
  ['cablefly', 'Cable fly', 'c', 'chest', 20],
  ['lowcablefly', 'Low-to-high cable fly', 'c', 'chest,fdelt', 15],
  ['highcablefly', 'High-to-low cable fly', 'c', 'chest', 20],
  ['pecdeck', 'Pec deck', 'm', 'chest', 70],
  ['chestpress', 'Machine chest press', 'm', 'chest,triceps', 90],
  ['inclinechestpress', 'Incline machine press', 'm', 'chest,fdelt', 70],
  ['pushup', 'Push-up', 'w', 'chest,triceps,fdelt', 35],
  ['declinepushup', 'Decline push-up', 'w', 'chest,fdelt', 25],
  ['diamondpushup', 'Diamond push-up', 'w', 'triceps,chest', 20],
  ['dip', 'Dip', 'w', 'chest,triceps', 15, 20],
  ['pullover', 'Dumbbell pullover', 'd', 'lats,chest', 30],
  ['landminepress', 'Landmine press', 'b', 'fdelt,chest', 45],

  // Shoulders
  ['ohp', 'Overhead press', 'b', 'fdelt,triceps,sdelt', 57, 0, 150],
  ['seatedohp', 'Seated barbell press', 'b', 'fdelt,triceps', 55],
  ['pushpress', 'Push press', 'b', 'fdelt,triceps,quads', 70],
  ['dbshoulder', 'Dumbbell shoulder press', 'd', 'fdelt,triceps,sdelt', 24],
  ['arnold', 'Arnold press', 'd', 'fdelt,sdelt', 20],
  ['machineshoulder', 'Machine shoulder press', 'm', 'fdelt,triceps', 65],
  ['smithohp', 'Smith machine shoulder press', 's', 'fdelt,triceps', 55],
  ['handstandpush', 'Handstand push-up', 'w', 'fdelt,triceps', 8],
  ['lateral', 'Lateral raise', 'd', 'sdelt', 12, 0, 60],
  ['cablelateral', 'Cable lateral raise', 'c', 'sdelt', 10, 0, 60],
  ['machinelateral', 'Machine lateral raise', 'm', 'sdelt', 40, 0, 60],
  ['uprightrow', 'Upright row', 'b', 'sdelt,traps', 45],
  ['frontraise', 'Front raise', 'd', 'fdelt', 14, 0, 60],
  ['reardelt', 'Rear delt fly', 'd', 'rdelt', 12, 0, 60],
  ['cablereardelt', 'Cable rear delt fly', 'c', 'rdelt', 10, 0, 60],
  ['reversepecdeck', 'Reverse pec deck', 'm', 'rdelt,upback', 55, 0, 60],
  ['facepull', 'Face pull', 'c', 'rdelt,upback', 35, 0, 60],
  ['shrug', 'Barbell shrug', 'b', 'traps', 140, 0, 90],
  ['dbshrug', 'Dumbbell shrug', 'd', 'traps', 40, 0, 90],

  // Back
  ['deadlift', 'Deadlift', 'b', 'lowback,glutes,hams,traps', 138, 0, 180],
  ['sumo', 'Sumo deadlift', 'b', 'glutes,hams,adductors,lowback', 140, 0, 180],
  ['trapbar', 'Trap bar deadlift', 'b', 'quads,glutes,hams', 150, 0, 180],
  ['rackpull', 'Rack pull', 'b', 'lowback,traps,glutes', 180, 0, 150],
  ['pullup', 'Pull-up', 'w', 'lats,biceps,upback', 10, 15, 120],
  ['chinup', 'Chin-up', 'w', 'lats,biceps', 11, 17],
  ['neutralpullup', 'Neutral-grip pull-up', 'w', 'lats,biceps', 11, 16],
  ['muscleup', 'Muscle-up', 'w', 'lats,triceps,chest', 4],
  ['pulldown', 'Lat pulldown', 'c', 'lats,biceps', 70],
  ['closepulldown', 'Close-grip lat pulldown', 'c', 'lats,biceps', 70],
  ['singlepulldown', 'Single-arm lat pulldown', 'c', 'lats', 35],
  ['straightarm', 'Straight-arm pulldown', 'c', 'lats', 35, 0, 60],
  ['row', 'Barbell row', 'b', 'upback,lats,rdelt', 85, 0, 120],
  ['pendlay', 'Pendlay row', 'b', 'upback,lats', 80],
  ['tbarrow', 'T-bar row', 'b', 'upback,lats', 80],
  ['sealrow', 'Seal row', 'b', 'upback,rdelt', 70],
  ['meadows', 'Meadows row', 'b', 'lats,upback', 50],
  ['dbrow', 'Dumbbell row', 'd', 'lats,upback', 40],
  ['chestsupported', 'Chest-supported dumbbell row', 'd', 'upback,rdelt', 28],
  ['cablerow', 'Seated cable row', 'c', 'upback,lats', 75],
  ['singlecablerow', 'Single-arm cable row', 'c', 'lats,upback', 37.5],
  ['machinerow', 'Machine row', 'm', 'upback,lats', 80],
  ['invertedrow', 'Inverted row', 'w', 'upback,biceps', 15],
  ['goodmorning', 'Good morning', 'b', 'hams,lowback', 70],
  ['backext', 'Back extension', 'w', 'lowback,glutes', 20, 25],

  // Arms
  ['curl', 'Barbell curl', 'b', 'biceps', 45, 0, 60],
  ['ezcurl', 'EZ-bar curl', 'e', 'biceps', 42.5, 0, 60],
  ['dbcurl', 'Dumbbell curl', 'd', 'biceps', 17, 0, 60],
  ['hammer', 'Hammer curl', 'd', 'biceps,forearms', 18, 0, 60],
  ['inclinecurl', 'Incline dumbbell curl', 'd', 'biceps', 13, 0, 60],
  ['preacher', 'Preacher curl', 'e', 'biceps', 37.5, 0, 60],
  ['machinepreacher', 'Machine preacher curl', 'm', 'biceps', 40, 0, 60],
  ['cablecurl', 'Cable curl', 'c', 'biceps', 40, 0, 60],
  ['bayesian', 'Bayesian cable curl', 'c', 'biceps', 17.5, 0, 60],
  ['concentration', 'Concentration curl', 'd', 'biceps', 14, 0, 60],
  ['spider', 'Spider curl', 'd', 'biceps', 12, 0, 60],
  ['reversecurl', 'Reverse curl', 'e', 'forearms,biceps', 32.5, 0, 60],
  ['wristcurl', 'Wrist curl', 'b', 'forearms', 45, 0, 60],
  ['reversewrist', 'Reverse wrist curl', 'd', 'forearms', 12, 0, 60],
  ['farmer', "Farmer's carry (per hand)", 'd', 'forearms,traps', 40, 0, 90],
  ['pushdown', 'Triceps pushdown', 'c', 'triceps', 45, 0, 60],
  ['ropepushdown', 'Rope pushdown', 'c', 'triceps', 37.5, 0, 60],
  ['singlepushdown', 'Single-arm pushdown', 'c', 'triceps', 20, 0, 60],
  ['overheadext', 'Overhead cable extension', 'c', 'triceps', 37.5, 0, 60],
  ['dboverheadext', 'Overhead dumbbell extension', 'd', 'triceps', 28, 0, 60],
  ['skullcrusher', 'Skull crusher', 'e', 'triceps', 42.5, 0, 60],
  ['jmpress', 'JM press', 'b', 'triceps,chest', 60],
  ['kickback', 'Triceps kickback', 'd', 'triceps', 11, 0, 60],
  ['machinedip', 'Machine dip', 'm', 'triceps,chest', 90],
  ['benchdip', 'Bench dip', 'w', 'triceps', 25],

  // Legs
  ['squat', 'Squat', 'b', 'quads,glutes,adductors', 115, 0, 180],
  ['frontsquat', 'Front squat', 'b', 'quads,glutes', 95, 0, 180],
  ['pausesquat', 'Pause squat', 'b', 'quads,glutes', 95, 0, 180],
  ['smithsquat', 'Smith machine squat', 's', 'quads,glutes', 110],
  ['hacksquat', 'Hack squat', 'm', 'quads,glutes', 140],
  ['beltsquat', 'Belt squat', 'm', 'quads,glutes', 120],
  ['gobletsquat', 'Goblet squat', 'd', 'quads,glutes', 36],
  ['legpress', 'Leg press', 'm', 'quads,glutes', 220],
  ['singlelegpress', 'Single-leg press', 'm', 'quads,glutes', 110],
  ['legext', 'Leg extension', 'm', 'quads', 75, 0, 60],
  ['sissy', 'Sissy squat', 'w', 'quads', 15],
  ['bulgarian', 'Bulgarian split squat', 'd', 'quads,glutes', 28],
  ['splitsquat', 'Split squat', 'd', 'quads,glutes', 30],
  ['lunge', 'Walking lunge', 'd', 'quads,glutes', 26],
  ['reverselunge', 'Reverse lunge', 'd', 'quads,glutes', 26],
  ['stepup', 'Step-up', 'd', 'quads,glutes', 24],
  ['pistol', 'Pistol squat', 'w', 'quads,glutes', 6],
  ['rdl', 'Romanian deadlift', 'b', 'hams,glutes,lowback', 120, 0, 120],
  ['dbrdl', 'Dumbbell Romanian deadlift', 'd', 'hams,glutes', 40],
  ['stiffleg', 'Stiff-leg deadlift', 'b', 'hams,lowback', 110],
  ['singlelegrdl', 'Single-leg Romanian deadlift', 'd', 'hams,glutes', 24],
  ['lyingcurl', 'Lying leg curl', 'm', 'hams', 55, 0, 60],
  ['seatedcurl', 'Seated leg curl', 'm', 'hams', 60, 0, 60],
  ['standingcurl', 'Standing leg curl', 'm', 'hams', 25, 0, 60],
  ['nordic', 'Nordic curl', 'w', 'hams', 6],
  ['ghr', 'Glute-ham raise', 'w', 'hams,glutes', 10],
  ['hipthrust', 'Hip thrust', 'b', 'glutes,hams', 150, 0, 120],
  ['smithhipthrust', 'Smith machine hip thrust', 's', 'glutes', 130],
  ['glutebridge', 'Glute bridge', 'b', 'glutes', 120],
  ['cablekickback', 'Cable glute kickback', 'c', 'glutes', 25, 0, 60],
  ['hipabduction', 'Hip abduction machine', 'm', 'glutes', 80, 0, 60],
  ['hipadduction', 'Hip adduction machine', 'm', 'adductors', 75, 0, 60],
  ['sumosquat', 'Dumbbell sumo squat', 'd', 'adductors,glutes,quads', 36],
  ['calf', 'Standing calf raise', 'm', 'calves', 110, 0, 60],
  ['seatedcalf', 'Seated calf raise', 'm', 'calves', 70, 0, 60],
  ['legpresscalf', 'Leg press calf raise', 'm', 'calves', 160, 0, 60],
  ['smithcalf', 'Smith machine calf raise', 's', 'calves', 110, 0, 60],
  ['singlecalf', 'Single-leg calf raise', 'w', 'calves', 20, 0, 60],

  // Core
  ['cablecrunch', 'Cable crunch', 'c', 'abs', 60, 0, 60],
  ['machinecrunch', 'Machine crunch', 'm', 'abs', 60, 0, 60],
  ['crunch', 'Crunch', 'w', 'abs', 40, 0, 60],
  ['declinesitup', 'Decline sit-up', 'w', 'abs', 25, 15, 60],
  ['hanglegraise', 'Hanging leg raise', 'w', 'abs,obliques', 15, 0, 60],
  ['hangkneeraise', 'Hanging knee raise', 'w', 'abs', 20, 0, 60],
  ['toestobar', 'Toes-to-bar', 'w', 'abs', 12, 0, 60],
  ['abwheel', 'Ab wheel rollout', 'w', 'abs', 12, 0, 60],
  ['dragonflag', 'Dragon flag', 'w', 'abs', 6, 0, 60],
  ['russiantwist', 'Russian twist', 'w', 'obliques,abs', 30, 0, 60],
  ['woodchop', 'Cable woodchop', 'c', 'obliques', 25, 0, 60],
  ['pallof', 'Pallof press', 'c', 'obliques,abs', 20, 0, 60],
  ['sidebend', 'Dumbbell side bend', 'd', 'obliques', 32, 0, 60],

  // Full body and Olympic
  ['powerclean', 'Power clean', 'b', 'traps,glutes,quads', 80, 0, 150],
  ['hangclean', 'Hang clean', 'b', 'traps,quads', 75, 0, 150],
  ['powersnatch', 'Power snatch', 'b', 'traps,fdelt,glutes', 60, 0, 150],
  ['thruster', 'Thruster', 'b', 'quads,fdelt', 60],
  ['kbswing', 'Kettlebell swing', 'k', 'glutes,hams', 32],
];

const DEFAULT_RANKED = ['squat', 'bench', 'deadlift', 'ohp', 'pullup'];

export const LIBRARY = ROWS.map(([id, name, equip, muscles, gold, added = 0, rest = 90]) => ({
  id, name, equip, muscles: muscles.split(','),
  type: equip === 'w' ? 'bodyweight' : 'weighted',
  rest,
  benchmarks: ladder(equip, gold, added),
  rankedDefault: DEFAULT_RANKED.indexOf(id),
}));

export const LIBRARY_BY_ID = Object.fromEntries(LIBRARY.map(e => [e.id, e]));

export const EQUIP_NAMES = { b: 'Barbell', e: 'EZ bar', d: 'Dumbbell', k: 'Kettlebell', m: 'Machine', c: 'Cable', s: 'Smith machine', w: 'Bodyweight' };
