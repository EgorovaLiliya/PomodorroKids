// Офлайн-режим: приложение работает без интернета после первого открытия.
// После изменений в файлах поднимите VERSION — установленное приложение обновится.
const VERSION = 'v1';
const CACHE = `pomodorrokids-${VERSION}`;

const VARIETIES = ['cherry', 'plum', 'yellow', 'oxheart'];
const POSES = ['wave', 'think', 'write', 'read', 'dance', 'relax', 'jump'];

const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/audio.js',
  'js/i18n.js',
  'js/icons.js',
  'js/store.js',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/fonts/GoodVibesPro.ttf',
  'assets/fonts/nunito-cyrillic-800-normal.woff2',
  'assets/fonts/nunito-latin-800-normal.woff2',
  'assets/fonts/onest-cyrillic-400-normal.woff2',
  'assets/fonts/onest-latin-400-normal.woff2',
  'assets/fonts/onest-cyrillic-500-normal.woff2',
  'assets/fonts/onest-latin-500-normal.woff2',
  'assets/fonts/onest-cyrillic-600-normal.woff2',
  'assets/fonts/onest-latin-600-normal.woff2',
  'assets/fonts/unbounded-cyrillic-700-normal.woff2',
  'assets/fonts/unbounded-latin-700-normal.woff2',
  ...VARIETIES.flatMap((v) => POSES.map((p) => `assets/characters/${v}/${p}.webp`)),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (new URL(req.url).origin !== location.origin) return;

  // Проверка наличия звуковых файлов (HEAD): сеть, иначе — есть ли файл в кэше
  if (req.method === 'HEAD') {
    e.respondWith(
      fetch(req).catch(() => caches.match(req.url).then((r) => r
        ? new Response(null, { status: 200 })
        : new Response(null, { status: 404 }))),
    );
    return;
  }
  if (req.method !== 'GET') return;

  // Страница: сначала сеть (чтобы получать обновления), без сети — кэш
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('index.html')));
    return;
  }

  // Остальное: кэш, а если нет — сеть с сохранением (так кэшируются и mp3)
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
