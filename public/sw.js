/**
 * public/sw.js
 * ULTRA-ROBUST Service Worker v25.
 * Designed to survive first-load offline tests.
 */
const CACHE_NAME = 'school-admin-v30';

// ONLY cache local things we 100% control to avoid 404/CORS deaths in 'install'
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/index-DuRMqyjE.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching v25');
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never cache Supabase or localhost development
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // 2. Navigation: Network-First with Cache-Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // 3. Everything else: Cache-First then Network (and update cache)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => null);
    })
  );
});