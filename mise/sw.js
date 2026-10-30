// Офлайн-кэш: приложение работает без сети после первого открытия.
const CACHE = 'mise-v3';
// Минимум для первого офлайн-старта; остальные файлы попадают в кэш при первом обращении (см. fetch ниже).
const ASSETS = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg', 'js/app.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Сначала сеть (чтобы обновления доходили), при сбое — кэш.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))),
  );
});
