const CACHE_NAME = 'lomi-v4';
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

// Activate — clean ALL old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for HTML, cache-first for everything else
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // API and socket requests — always go to network, no cache
  if (url.hostname.includes('railway') ||
      url.hostname.includes('socket.io') ||
      url.hostname.includes('yandex') ||
      url.hostname.includes('googleapis') ||
      url.pathname.includes('/auth/') ||
      url.pathname.includes('/profile') ||
      url.pathname.includes('/leaderboard') ||
      url.pathname.includes('/progress')) {
    return;
  }

  // index.html и корень — NETWORK FIRST: всегда пробуем сервер,
  // кэш только если сеть недоступна (офлайн-режим)
  const isHTML = url.pathname === '/' ||
                 url.pathname === '/index.html' ||
                 url.pathname.endsWith('.html');

  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          // Обновляем кэш свежей версией
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Офлайн — отдаём из кэша
        return caches.match(e.request) || caches.match('/index.html');
      })
    );
    return;
  }

  // Все остальные ресурсы (шрифты, иконки) — cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
