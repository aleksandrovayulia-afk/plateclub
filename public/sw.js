// Plate Club service worker: installable app + faster repeat visits on slow phones and networks.
// - pictures, logos, banners: served from the cache at once, refreshed in the background
// - the app itself (page, app.js, app.css): always asks the network first, falls back to the cache when offline or slow
// - the API is never cached
const V = 'pc-v2';
const SHELL = ['/', '/app.css', '/app.js', '/manifest.webmanifest', '/brand/logo-chrome-360.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));

const isAsset = p => /^\/(brand|img|media)\//.test(p) || p === '/favicon.svg';
const isShell = p => p === '/' || p === '/index.html' || p === '/app.js' || p === '/app.css' || p === '/manifest.webmanifest' || /^\/i\//.test(p);

async function fromNetwork(req, key) {
  const res = await fetch(req);
  if (res.ok && res.type === 'basic') { const c = await caches.open(V); c.put(key || req, res.clone()); }
  return res;
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (isAsset(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => { const net = fromNetwork(req).catch(() => hit); return hit || net; }));
    return;
  }
  if (isShell(url.pathname) || req.mode === 'navigate') {
    const key = req.mode === 'navigate' ? '/' : req;
    e.respondWith((async () => {
      const net = fromNetwork(req, key);
      // a slow network gets 4 s, then the saved copy is used (the fresh one is still stored for next time)
      const slow = new Promise(r => setTimeout(r, 4000)).then(() => caches.match(key));
      try { return (await Promise.race([net, slow])) || (await net); } catch { return (await caches.match(key)) || Response.error(); }
    })());
  }
});
