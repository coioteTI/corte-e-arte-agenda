const CACHE_NAME = 'corte-arte-v8';

// Only cache essential assets that we know exist
const STATIC_ASSETS = [
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache essential resources and immediately activate
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v8 - Emergency cache clear...');
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        // Cache static assets individually to avoid failures
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(new Request(url, { cache: 'reload' }))
              .catch(err => console.log('[SW] Failed to cache:', url, err))
          )
        );
      })
      .catch((error) => {
        console.log('[SW] Cache open failed:', error);
      })
  );
});

// Activate event - AGGRESSIVELY clean up ALL old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v8 - Clearing ALL old caches...');
  event.waitUntil(
    Promise.all([
      // Take control of all pages immediately
      self.clients.claim(),
      // Delete ALL old caches aggressively
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete any cache that isn't the current version
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      console.log('[SW] v8 activated and controlling pages');
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Skip API requests (supabase, etc.)
  if (request.url.includes('supabase.co') || 
      request.url.includes('/api/') ||
      request.url.includes('/auth/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response;
        }
        
        // Don't cache opaque responses
        if (response.type === 'opaque') {
          return response;
        }

        // Clone the response before caching
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            // Only cache same-origin requests
            if (new URL(request.url).origin === location.origin) {
              cache.put(request, responseToCache);
            }
          })
          .catch((err) => console.log('Cache put error:', err));

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
            
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});

// Push notifications handler - enhanced for mobile
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: '🔔 Corte & Arte',
    body: 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    url: '/dashboard/agenda',
    tag: 'default',
    data: {}
  };

  // Parse the push data
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (e) {
      // If JSON parsing fails, use text
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200, 100, 200],
    tag: notificationData.tag,
    renotify: true,
    requireInteraction: true, // Keep notification visible until user interacts
    data: {
      url: notificationData.url,
      ...notificationData.data,
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'Ver agendamento',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('Notification shown successfully');
        // Update badge count if supported
        if ('setAppBadge' in navigator) {
          // Get current unread count and update badge
          return updateBadgeCount();
        }
      })
      .catch(err => console.error('Error showing notification:', err))
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/dashboard/agenda';
  
  // Handle different actions
  if (event.action === 'close') {
    return; // Just close, don't open anything
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window/tab open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Update badge count function
async function updateBadgeCount() {
  try {
    // Request badge count from main thread
    const allClients = await clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({ type: 'GET_BADGE_COUNT' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  console.log('SW received message:', event.data);
  
  if (event.data.type === 'SET_BADGE_COUNT') {
    const count = event.data.count || 0;
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(err => console.log('Badge error:', err));
      } else {
        navigator.clearAppBadge().catch(err => console.log('Clear badge error:', err));
      }
    }
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
