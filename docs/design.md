# Ranked Gym: design proposal (Stage 1)

This document proposes the XP formula, the default rank test benchmarks and a rough layout of each screen. Nothing here is built yet apart from a static mock of the Home screen (`mock/home.html`). Every number below is a starting point, and all of them will be editable in Settings unless stated otherwise.

Items marked **Decision needed** are places where your brief could be read more than one way. I have picked a default for each; say if you want it changed.

---

## 1. Core definitions

| Term | Meaning |
| --- | --- |
| Working set | Any logged set not marked as a warm-up. Only working sets earn XP or count for PBs and rank tests. |
| Load | Weight on the bar. For pull-ups (and any lift marked "bodyweight"), load = current bodyweight + added weight. |
| Relative volume (RV) | `reps x load / bodyweight`, summed over working sets. Dividing by bodyweight means a lighter lifter is not at an XP disadvantage. |
| e1RM | Estimated one-rep max, Epley: `weight x (1 + reps / 30)`. A single (1 rep) counts as its own weight. |
| Week | Monday to Sunday, in the phone's local time. |

All weights are stored in kg internally and converted for display when lb is selected, so switching units never changes your data.

---

## 2. XP formula

XP is earned once per completed session (when you press Finish and enter RPE).

### 2.1 Session XP

```
base        = 50                                   (for completing a session)
volumeXP    = 40 x sqrt(RV_session)                 (square root: more volume helps, with diminishing returns)
effort      = 1 + 0.05 x (min(RPE, 8) - 5)          (RPE 1 = 0.80, RPE 5 = 1.00, RPE 8, 9 or 10 = 1.15)
streakMult  = 1 + 0.05 x min(streakWeeks, 10)       (1.00 up to 1.50)

sessionXP   = (base + volumeXP) x effort x streakMult
totalXP     = sessionXP + pbBonus
```

Why these shapes:

* **Square root on volume.** Doubling your volume raises XP by about 41%, not 100%. This rewards doing the work without making a two-hour grind the best way to level up.
* **Effort stops rising at RPE 8.** RPE 9 and 10 earn the same as RPE 8, so there is no reward for grinding to failure. Low-effort sessions still earn most of the XP, so an easy day is never wasted.
* **Warm-up sets earn nothing** and are not counted in RV.

### 2.2 Personal best bonus

| PB type | Bonus |
| --- | --- |
| New e1RM on a ranked lift | +100 |
| New e1RM on an accessory | +40 |
| New heaviest weight for a rep count (1 to 10) | +25 each |
| New best set volume (weight x reps in one set) | +25 |

Capped at **+200 per session** so a first session on a new exercise (where every set is technically a PB) cannot flood XP. The first ever session on an exercise records PBs but earns no PB bonus. The PB bonus is not multiplied by effort or streak.

### 2.3 Weekly streak

* You set a weekly target (for example 3 sessions).
* A week is **hit** when you complete at least your target number of sessions in it.
* `streakWeeks` = the number of consecutive hit weeks, ending with last week. The current week never breaks the streak while it is in progress, whatever day it is.
* The streak only resets when a whole week ends below target.
* Rest days never count against you. Training 3 times in a week with a target of 3 is a perfect week, however the days fall.
* If you hit your target in the current week, that week already counts, so the multiplier for later sessions that week includes it.

**Training beyond the target** earns no extra streak bonus in two ways:

1. Extra sessions do not add extra streak weeks; one week is one week.
2. Sessions beyond your target in a week earn XP with `streakMult = 1.00`. They still earn base, volume, effort and PB XP.

> **Decision needed:** point 2 is my reading of "earns no extra streak bonus". The alternative is that extra sessions keep the multiplier and only point 1 applies. I prefer point 2 because it quietly supports rest, but it is your call.

**Changing the target** applies from the current week onwards. Past weeks keep the target that was set at the time.

### 2.4 How session XP is shared between lifts

Each ranked lift has its own XP bar, so session XP is split:

1. Each exercise's share = its RV / total session RV.
2. A ranked lift receives its own share.
3. The accessory share is split equally between the ranked lifts trained in that session. If no ranked lift was trained, it is split equally between all ranked lifts.
4. A PB bonus goes entirely to the lift the PB was set on (accessory PB bonuses are split as in step 3).

This way accessories always count, but the XP ends up on the ranked lifts.

### 2.5 Worked example

Bodyweight 80 kg, target 3 sessions a week, streak of 3 weeks, second session of the week.

| Exercise | Working sets | RV |
| --- | --- | --- |
| Squat (ranked) | 3 x 5 at 100 kg | 15 x 100 / 80 = 18.75 |
| Bench press (ranked) | 3 x 5 at 70 kg | 15 x 70 / 80 = 13.13 |
| Barbell row (accessory) | 3 x 8 at 60 kg | 24 x 60 / 80 = 18.00 |
| **Total** | | **49.88** |

```
volumeXP   = 40 x sqrt(49.88)        = 282.5
base + vol = 50 + 282.5              = 332.5
effort     (RPE 8)                   = 1.15   -> 382.4
streakMult (3 weeks)                 = 1.15   -> 439.7
pbBonus    (squat e1RM PB)           = +100
totalXP                              = 540 (rounded)
```

Split: squat 37.6% + half of the row's 36.1% = 55.6%, bench 26.3% + 18.0% = 44.4%.
Squat gets 0.556 x 440 + 100 = **345 XP**, bench gets 0.444 x 440 = **195 XP**.

---

## 3. Tiers, divisions and promotion

### 3.1 Structure

Six tiers, each with three divisions, lowest first: **III, II, I** (the order used by most ranked games).

Bronze III, Bronze II, Bronze I, Silver III ... Champion I. That is 18 steps per lift.

### 3.2 XP per division

| Tier | XP per division | XP for the whole tier |
| --- | --- | --- |
| Bronze | 400 | 1,200 |
| Silver | 600 | 1,800 |
| Gold | 800 | 2,400 |
| Platinum | 1,000 | 3,000 |
| Diamond | 1,250 | 3,750 |
| Champion | 1,500 | 4,500 |

At the example rate (a lift trained twice a week, roughly 200 to 350 XP a session), Bronze takes about 2 to 3 weeks and a Champion division about 3 to 4 weeks. In practice the rank tests, not XP, will be what holds you back at the higher tiers, which is the intent: consistency moves you through divisions, strength moves you through tiers.

### 3.3 Moving between divisions and tiers

* Filling a division's XP bar moves you to the next division in the same tier, automatically.
* Filling **Division I** does not move you up a tier. The lift shows **Promotion test ready**.
* If you already have a qualifying set for the next tier (see section 4), promotion happens straight away at the end of that session. Otherwise it happens the moment you log one.
* While waiting for the test, XP keeps banking, up to one full division of the next tier. When you are promoted, the banked XP carries into the new tier's Division III. Anything beyond that is recorded in your history but not added to the bar.
* At **Champion I** the bar keeps filling for display ("Champion points"), with no further rank.
* A promotion shows the promotion screen: the old badge, an animation to the new badge, and the benchmark you beat. (The animation itself is Stage 3 polish; v1 has a simple version.)

> **Decision needed:** how old can a qualifying set be? My default is **the last 90 days**, so a lift you could do a year ago does not promote you today. The alternative is "any time".

### 3.4 Inactive lifts (decay)

* If a ranked lift has no working set logged for **21 days**, it shows as **Inactive** with a muted badge and a note such as "Inactive: last trained 23 days ago".
* Rank and XP are never removed. Logging the lift again clears the Inactive label straight away.
* Inactive lifts still count towards the overall rank at their full rank.

### 3.5 Overall rank

Each lift's position is turned into a score from 0 to 18:

```
liftScore = tierIndex x 3 + divisionIndex + xpFraction
            tierIndex:     Bronze 0, Silver 1, Gold 2, Platinum 3, Diamond 4, Champion 5
            divisionIndex: III 0, II 1, I 2
            xpFraction:    0.0 to 1.0 through the current division
```

Then:

```
overallScore = 0.6 x (lowest liftScore) + 0.4 x (average of the other liftScores)
```

The overall badge is the tier and division that `overallScore` falls in. With 60% of the weight on your weakest lift, raising that lift moves the overall rank much more than pushing your strongest lift further. The Home screen names your weakest lift under the overall badge so the nudge is visible.

Example: squat Gold I (8.6), bench Silver I (6.0), deadlift Platinum III (9.3), overhead press Silver II (4.4), pull-up Gold III (6.1).
`0.6 x 4.4 + 0.4 x 7.5 = 5.64`, which is **Silver I**, 64% of the way to Gold III.

The overall rank has no test of its own; it follows the lifts.

---

## 4. Rank tests (default benchmarks)

> **These are starting points, not official standards.** They are round numbers chosen to spread the tiers out sensibly for an adult who trains regularly. They are not age, sex or weight-class adjusted. Change any of them in Settings, or use the single **benchmark scale** setting (default 100%) to make every benchmark easier or harder at once.

### 4.1 How a test is passed

* A working set of **1 to 5 reps** whose e1RM (Epley) is at least `benchmark x current bodyweight`. A true single counts at its actual weight.
* Sets of 6 or more reps are ignored for tests, because e1RM gets less reliable as reps go up.
* The benchmark in kg uses your **current** bodyweight from Settings (or the latest bodyweight log entry).
* Bronze is the starting tier and has no test.

### 4.2 Barbell lifts: e1RM as a multiple of bodyweight

To be promoted **into** the tier named at the top of the column:

| Lift | Silver | Gold | Platinum | Diamond | Champion |
| --- | --- | --- | --- | --- | --- |
| Squat | 1.00x | 1.50x | 1.75x | 2.00x | 2.50x |
| Bench press | 0.75x | 1.00x | 1.25x | 1.50x | 1.75x |
| Deadlift | 1.25x | 1.75x | 2.00x | 2.50x | 3.00x |
| Overhead press | 0.50x | 0.65x | 0.80x | 1.00x | 1.20x |

For an 80 kg lifter, Gold on squat is an e1RM of 120 kg, for example 110 kg x 3 (110 x 1.1 = 121).

### 4.3 Pull-up: reps, then added weight

| Tier | Benchmark |
| --- | --- |
| Silver | 5 strict bodyweight reps in one set |
| Gold | 10 strict bodyweight reps in one set, **or** added-weight e1RM of 0.20x bodyweight |
| Platinum | Added-weight e1RM of 0.35x bodyweight |
| Diamond | Added-weight e1RM of 0.50x bodyweight |
| Champion | Added-weight e1RM of 0.75x bodyweight |

Added-weight e1RM = `e1RM(bodyweight + added) - bodyweight`, from a set of 1 to 5 reps. Rep-based tests (Silver, Gold) accept a bodyweight set of any rep count, since the reps are the test.

### 4.4 Custom ranked lifts

A new ranked lift you add is either **weighted** (benchmarks as bodyweight multiples, like squat) or **bodyweight** (reps, then added weight, like pull-up). It starts with empty benchmarks that you fill in; until you do, it ranks through divisions but cannot be promoted beyond Bronze, and the Rank tests screen says so.

---

## 5. Placement (first open)

Onboarding has three short steps, each skippable:

1. **Bodyweight** (and kg or lb).
2. **Weekly session target** (1 to 7, default 3).
3. **Placement (optional).** For each ranked lift, enter a recent best as weight x reps (or reps for pull-ups). Leave any blank.

Placement per lift:

* **Tier**: the highest tier whose benchmark your e1RM meets (Bronze if none, or if blank).
* **Division**: based on how far you are between that tier's benchmark and the next. Under a third of the way: III. A third to two thirds: II. Over two thirds: I.
* XP starts at 0 in that division.
* The placement sets are stored as your starting PBs, dated the day of onboarding and marked as "placement", so they show in history but do not earn XP.

A placement result screen then shows each lift's badge and the overall rank, like the end of placement matches in a ranked game.

---

## 6. Personal bests tracked

Per exercise (ranked and accessory):

* Best e1RM (from any working set of 1 to 10 reps).
* Heaviest weight for each rep count from 1 to 10.
* Best set volume (weight x reps in one set).
* History: one data point per session (best e1RM that day), shown as a line chart.

---

## 7. Screens

Navigation is a bottom tab bar (in thumb reach), 5 tabs: **Home, Train, Progress, Tests, Settings**. Templates live inside Train. The active workout opens as a full-screen view over the tabs, so it stays one tap away if you switch to check something mid-session.

Every tap target is at least 44 x 44 pt. Layout respects the notch and home indicator (safe-area insets). Primary actions sit in the bottom third of the screen.

### 7.1 Home

```
+--------------------------------------+
|  [ overall badge ]   Silver I        |
|                      64% to Gold III |
|  Weakest: Overhead press             |
+--------------------------------------+
|  This week  ● ● ○   2 of 3           |
|  Streak     3 weeks   x1.15 XP       |
+--------------------------------------+
|  (backup reminder, only if due)      |
+--------------------------------------+
|  [b] Squat          Gold I           |
|      ██████████░░░░  496 / 800 XP    |
|  [b] Bench press    Silver I         |
|      ██████████████  Test ready      |
|  [b] Deadlift ...                    |
|  [b] Overhead press ...              |
|  [b] Pull-up        Gold III         |
|      Inactive: 23 days               |
+--------------------------------------+
|        [   Start workout   ]         |
+--------------------------------------+
|  Home Train Progress Tests Settings |
+--------------------------------------+
```

Tapping a lift opens its detail (chart, PBs, rank history). See the static mock in `mock/home.html`.

### 7.2 Train (start and log workout)

**Start:** "Empty workout" plus a list of your templates. "Repeat last workout" as a shortcut.

**Active workout:**

* Header: elapsed time, Finish button.
* Exercise cards. Each card lists sets as rows: `[W]  weight  x  reps  [✓]`.
  * Weight and reps are pre-filled from the same set in your last session with that exercise, shown in grey until confirmed. Tapping ✓ confirms the set in one tap.
  * Large steppers (weight by your plate increment, reps by 1) so you rarely need the keyboard.
  * `W` toggles warm-up. Warm-up rows are dimmed and labelled "No XP".
  * "Add set" copies the previous set.
* Rest timer: starts when you tick a set. A bar pinned above the tab area shows the countdown in large digits, with -15s / +15s and Skip. Vibrates at zero where the browser supports it (see note below). Default 2:00, editable per exercise.
* "Add exercise": search box with recent exercises at the top, then all exercises. Creating a new exercise inline asks only for the name and whether it is bodyweight.

**Finish:** RPE picker (1 to 10, large buttons, with a one-line description of each value), optional note, then **Save**.

**XP summary screen:**

* Total XP earned, broken down: base, volume, effort, streak, PB bonus.
* PBs set this session.
* Each trained lift's XP bar filling from its old to new position, including any division change.
* Promotion screen, if one happened.
* Week progress: "3 of 3 this week. Target hit."

> Note on vibration: iPhone Safari does not support the web vibration API, including in home screen apps. The rest timer will vibrate on browsers that support it and, on iPhone, fall back to a short sound (if not muted) and a full-screen flash. I will not claim haptics work where they do not.

### 7.3 Templates (inside Train)

* List of templates with their exercises and set counts.
* Create from scratch or "Save as template" from any finished workout.
* Edit: reorder exercises, set default set count and rest time per exercise.
* Defaults shipped: Push, Pull, Legs, Upper, Lower (editable or deletable).

### 7.4 Progress

Segmented control at the top: **PBs, Charts, Ranks, Bodyweight, Calendar**.

* **PBs:** each exercise with best e1RM, then an expandable table of heaviest weight for 1 to 10 reps and best set volume.
* **Charts:** pick an exercise; line chart of best e1RM per session, with 3M / 1Y / All ranges.
* **Ranks:** timeline of promotions and division changes per lift, and the overall rank over time.
* **Bodyweight:** quick entry field and a line chart. No targets, no goals, no commentary; it is only used for benchmarks and relative volume.
* **Calendar:** GitHub-style heatmap, one square per day for the last 26 weeks, shade by number of working sets.

Charts are hand-drawn SVG in v1, no chart library.

### 7.5 Rank tests

One card per ranked lift:

```
Squat                     Gold I -> Platinum
Benchmark    1.75x BW = 140 kg e1RM
Best so far  125 kg x 3 (e1RM 137.5 kg), 12 Sep
[██████████████████░░]  98%
Status       XP: test unlocks at Gold I full (496 / 800)
```

* Percentage = best qualifying e1RM in the window / benchmark in kg, capped at 100%.
* A small "what counts" note: 1 to 5 reps, working sets only, last 90 days.
* A reminder that the benchmarks are editable starting points.

### 7.6 Settings

* Bodyweight, units (kg or lb), plate increment (default 2.5 kg / 5 lb).
* Weekly session target.
* Exercises: add, rename, delete, mark as bodyweight, default rest time.
* Ranked lifts: add, remove, rename, reorder; choose weighted or bodyweight type.
* Benchmarks: editable table per lift, benchmark scale, "Restore defaults".
* Qualifying window (90 days) and inactive threshold (21 days).
* Theme: Dark (default), Light, or Match system.
* Backup: Export backup, Import backup, date of last backup.
* Reset: delete all data (two-step confirmation, suggests exporting first).
* About: version, and a line saying the benchmarks are not official standards and the app does not give medical or training advice.

---

## 8. Data, backup and offline

### 8.1 Storage

* **IndexedDB** as the main store, with object stores for `settings`, `exercises`, `workouts`, `templates`, `bodyweight`, `rankEvents`.
* If IndexedDB is unavailable (for example some private browsing modes), fall back to `localStorage`, storing the same data as JSON. A small banner says data is in fallback storage.
* The app asks the browser for persistent storage (`navigator.storage.persist()`) where supported, to reduce the chance of the phone clearing it.
* Ranks, XP and PBs are **derived** by replaying the workout log in date order, rather than stored as their own source of truth. This keeps them consistent after an import, an edited workout or a changed benchmark. A cached result is kept for speed.

> Note: iPhone keeps home screen app data separate from Safari's, and can clear site data for web apps that are not opened for a long time. This is the main reason the backup reminder matters, and the README will say so plainly.

### 8.2 Backup format

A single JSON file, for example `ranked-gym-backup-2026-09-26.json`:

```json
{
  "app": "ranked-gym",
  "schemaVersion": 1,
  "exportedAt": "2026-09-26T18:30:00Z",
  "data": { "settings": {}, "exercises": [], "workouts": [], "templates": [], "bodyweight": [], "rankEvents": [] }
}
```

* **Export** uses the iPhone share sheet where available (save to Files, AirDrop, email to yourself), and a normal download otherwise.
* **Import** validates the file, shows a summary ("142 workouts, last on 24 Sep"), and replaces current data after a confirmation. Future schema versions will migrate older backups.
* **Reminder:** if the last export was more than 14 days ago (or never, once at least 3 workouts exist), a small dismissible card on Home says "Your last backup was 16 days ago." with an Export button. Dismissing it hides it for 3 days.

### 8.3 Offline and install

* Service worker precaches every app file on first load (cache-first for app files, versioned cache name, old caches removed on update).
* When a new version is deployed, the app shows "Update available. Reload" rather than changing under you mid-workout.
* `manifest.webmanifest` with `display: standalone`, dark theme colour, app icons (including `apple-touch-icon` at 180 x 180), and iOS splash colour via `theme_color` / `background_color` and `apple-mobile-web-app-status-bar-style`.
* No network requests at runtime. No fonts, scripts or images from other sites. System font stack (SF Pro on iPhone).

---

## 9. Technical plan for v1

* **Vanilla JavaScript** (ES modules), plain CSS with custom properties for theming, no framework and no build step. Files are served exactly as committed.
* Proposed layout:

```
index.html
manifest.webmanifest
sw.js
css/app.css
js/app.js           (router and screen switching)
js/db.js            (IndexedDB with localStorage fallback)
js/engine.js        (XP, PBs, ranks, streaks: pure functions)
js/screens/*.js     (one file per screen)
js/charts.js        (small SVG chart helpers)
icons/              (PNG icons, generated once and committed)
.github/workflows/pages.yml
tests/engine.test.html  (runs the XP and rank maths in the browser)
```

* `engine.js` is pure functions with no DOM access, so the formulas in this document can be tested directly.
* **Deployment:** a GitHub Actions workflow on push to `main` uploads the repository's static files to GitHub Pages.
  * One setting to switch on: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
  * Final URL: **https://roccowebb.github.io/Ranked-Gym-/**
* **Testing (Stage 2):** Playwright in a 390 x 844 viewport, both themes, offline after first load (network cut, reload, log a workout), and export then import giving identical data.

---

## 10. Wording and tone

* Plain British English ("personal best", "colour", "programme" only if needed). No em dashes.
* Messages state facts: "Promotion test ready", "3 of 3 this week", "Inactive: last trained 23 days ago".
* No hype ("Beast mode!"), no guilt ("You're falling behind"), no pushing through pain. Missing a week says "New week. Target: 3 sessions." and nothing more.
* No medical, nutrition, diet or weight-cut features or advice.

---

## 11. Summary of decisions for you

1. Sessions beyond the weekly target earn XP **without** the streak multiplier (section 2.3). Keep, or let them keep the multiplier?
2. Qualifying sets must be from the **last 90 days** (section 3.3). Keep, or allow any time?
3. The default benchmark numbers in section 4. Any you want changed before I build?
4. Bottom tabs: Home, Train, Progress, Tests, Settings, with Templates inside Train (section 7). OK?
5. iPhone does not support web vibration; the rest timer falls back to sound and a screen flash (section 7.2). OK?
