// Minimal service worker: makes Plate Club installable as an app. Network first, nothing cached for the API.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
