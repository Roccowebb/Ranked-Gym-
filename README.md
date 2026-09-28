# Ranked Gym

A lifting tracker that works like a ranked game. Each ranked lift climbs from Bronze to Champion: training consistently earns XP to move through divisions, and passing a strength test moves you up a tier. It is a web app that installs to your iPhone home screen and works fully offline. There are no accounts and no servers, and your data stays on your phone.

App address: **https://roccowebb.github.io/Ranked-Gym-/**

## Install on your iPhone

1. Open the address above in **Safari** (it must be Safari for this step).
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open Ranked Gym from the new icon. It opens full screen, like a normal app.

After the first open it works without signal. When a new version is available, a bar at the top says "Update available"; tap **Reload** when you are not mid-workout.

## Back up your data

Your data lives only on your phone, inside the app. iPhone keeps home screen app data separate from Safari, and can clear it if the app is not used for a long time, so take regular backups.

1. Go to **Settings → Backup → Export backup**.
2. The share sheet opens. Choose **Save to Files** and pick iCloud Drive (or AirDrop it, or email it to yourself).

The file is called something like `ranked-gym-backup-2026-09-28.json`. The Home screen shows a gentle reminder if you have not backed up for 14 days.

## Move to a new phone

1. On the old phone: **Settings → Export backup**, and save the file to iCloud Drive (or AirDrop it to the new phone).
2. On the new phone: install the app as above. You can skip the setup screens.
3. Go to **Settings → Import backup** and choose the file. This replaces everything on the new phone with the backup.

## How ranking works (short version)

* **XP** comes from each finished session: a base amount, plus volume (sets x reps x weight, relative to your bodyweight), scaled by how hard it felt (RPE), your weekly streak, and bonuses for personal bests.
* **Weekly streak**: hit your weekly session target to build it. Rest days never break it, and sessions beyond your target earn no streak bonus.
* **Tiers**: Bronze, Silver, Gold, Platinum, Diamond, Champion, each with divisions III, II, I. XP moves you through divisions; to move up a tier you need a qualifying set (estimated 1RM from 1 to 5 reps) that meets the benchmark.
* **Overall rank** leans towards your weakest ranked lift.
* A ranked lift you have not trained for 21 days shows as **Inactive**. You never lose rank.
* **Muscle ranks**: about 150 exercises are tagged with the muscles they work. Each muscle takes the rank of its strongest exercise, shown on a front and back body map (Home, or Progress → Muscle ranks).

The default benchmarks are for a 70 kg lifter and are starting points, not official standards. Change them in **Settings → Ranked lifts** (per lift) or with the benchmark scale. Full details are in [`docs/design.md`](docs/design.md).

## For developers

Plain HTML, CSS and JavaScript modules; there is no build step. To run locally, serve the folder with any static server (for example `python3 -m http.server`) and open it in a browser. Engine tests: `npm test` (Node 20 or later).

Deployment: every push to `main` runs the tests and deploys to GitHub Pages via `.github/workflows/pages.yml`. One-off setup: in the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. When you change any app file, bump `VERSION` in `sw.js` so installed copies pick up the update.
