// Service worker: precaches every app file so the app works offline.
// Bump VERSION whenever any file changes so phones pick up the update.
const VERSION = 'v1.1.0';
const CACHE = `ranked-gym-${VERSION}`;
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/backup.js',
  'js/charts.js',
  'js/confetti.js',
  'js/db.js',
  'js/defaults.js',
  'js/engine.js',
  'js/haptics.js',
  'js/state.js',
  'js/ui.js',
  'js/screens/exedit.js',
  'js/screens/exercise.js',
  'js/screens/home.js',
  'js/screens/onboarding.js',
  'js/screens/progress.js',
  'js/screens/settings.js',
  'js/screens/summary.js',
  'js/screens/template.js',
  'js/screens/tests.js',
  'js/screens/train.js',
  'js/screens/workout.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('ranked-gym-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html', { cacheName: CACHE }).then(r => r || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  })));
});
