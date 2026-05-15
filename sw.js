const CACHE_NAME = 'lomi-v1';
const ASSETS = [
  '/',
  '/index.html',
];

// Install — cache the game
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache when offline
self.addEventListener('fetch', e => {
  // Only cache GET requests for the game itself
  if (e.request.method !== 'GET') return;

  // API and socket requests — always go to network
  const url = new URL(e.request.url);
  if (url.hostname.includes('railway') ||
      url.hostname.includes('socket.io') ||
      url.hostname.includes('yandex') ||
      url.hostname.includes('googleapis') ||
      url.pathname.includes('/auth/') ||
      url.pathname.includes('/profile') ||
      url.pathname.includes('/leaderboard') ||
      url.pathname.includes('/progress')) {
    return; // let network handle it
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful responses for game files
        if (response.ok && (
          e.request.url.includes('index.html') ||
          e.request.url === location.origin + '/'
        )) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index
        return caches.match('/index.html');
      });
    })
  );
});
