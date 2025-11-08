const CACHE = 'uangsaku-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/transactions.html',
  '/budgets.html',
  '/goals.html',
  '/reports.html',
  '/settings.html',
  '/offline.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/ui.js',
  '/js/idb.js',
  '/js/store-transactions.js',
  '/js/store-budgets.js',
  '/js/store-goals.js',
  '/js/store-settings.js',
  '/js/data-sync.js',
  '/js/charts.js',
  '/js/a11y.js',
  '/js/constants.js',
  '/js/sanitize.js',
  '/assets/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cacheResponse => cacheResponse || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => cacheResponse))
  );
});
