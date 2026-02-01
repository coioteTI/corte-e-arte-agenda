// Service Worker v14 - Fixed branch display + toast position + hidden close button
const CACHE_NAME = 'corte-arte-v14';
const VERSION = 'v14';

// Only cache essential static assets
const STATIC_ASSETS = [
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install - skip waiting immediately to activate new version
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${VERSION}...`);
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(new Request(url, { cache: 'reload' }))
              .catch(err => console.log('[SW] Cache failed:', url))
          )
        );
      })
  );
});

// Activate - delete ALL old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${VERSION} - Clearing all old caches...`);
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      // Notify all clients to reload for the new version
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: VERSION });
        });
      });
      console.log(`[SW] ${VERSION} activated and controlling pages`);
    })
  );
});

// Fetch - Network first, NO caching for HTML/JS/CSS to always get fresh content
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;
  
  // Skip API requests
  if (request.url.includes('supabase.co') || 
      request.url.includes('/api/') ||
      request.url.includes('/auth/')) {
    return;
  }

  const url = new URL(request.url);
  
  // For HTML, JS, CSS - ALWAYS fetch from network, never cache
  if (request.mode === 'navigate' || 
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.tsx') ||
      url.pathname.endsWith('.ts')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For static assets (images, icons) - network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        
        // Only cache same-origin static assets
        if (url.origin === location.origin) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => caches.match(request).then(r => r || new Response('Offline', { status: 503 })))
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: '🔔 Corte & Arte',
    body: 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    url: '/dashboard/agenda',
    tag: 'default'
  };

  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: [200, 100, 200],
      tag: notificationData.tag,
      renotify: true,
      requireInteraction: true,
      data: { url: notificationData.url },
      actions: [
        { action: 'view', title: 'Ver agendamento' },
        { action: 'close', title: 'Fechar' }
      ]
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  const targetUrl = event.notification.data?.url || '/dashboard/agenda';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data.type === 'SET_BADGE_COUNT') {
    const count = event.data.count || 0;
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CHECK_UPDATE') {
    event.source.postMessage({ type: 'SW_VERSION', version: VERSION });
  }
});
