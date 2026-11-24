// Sube VERSION en cada publicación para que los móviles descarguen la nueva.
const VERSION = 'rutinagym-1.0.1';
const FILES = ['./', 'app.css', 'manifest.webmanifest', 'js/app.js', 'js/logic.js', 'js/store.js', 'js/ui.js', 'js/timer.js', 'js/data.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => e.waitUntil(
  caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('rutinagym-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const key = e.request.mode === 'navigate' ? './' : e.request;
  e.respondWith(caches.open(VERSION).then(c => c.match(key, { ignoreVary: true })).then(r => r || fetch(e.request)));
});
