// Офлайн-кэш: приложение работает без сети после первого открытия.
const CACHE = 'mise-v1';
const ASSETS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/engine.js', 'js/store.js', 'js/ui.js',
  'js/data/ingredients.js', 'js/data/equipment.js',
  'js/data/recipes/index.js', 'js/data/recipes/cakes.js', 'js/data/recipes/sweet.js', 'js/data/recipes/savory.js',
  'js/data/recipes/sport.js', 'js/data/recipes/shakes.js', 'js/data/recipes/other.js',
  'js/views/fridge.js', 'js/views/recipes.js', 'js/views/recipe.js', 'js/views/cook.js', 'js/views/assistant.js', 'js/views/kitchen.js',
];

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
