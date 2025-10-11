// Service Worker for IonXe Mobile PWA
const CACHE_NAME = 'ionxe-mobile-v1.0.0';
const STATIC_CACHE = 'ionxe-static-v1.0.0';
const DYNAMIC_CACHE = 'ionxe-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/styles/mobile.css',
  '/js/mobile-core.js',
  '/js/mobile-faders.js',
  '/js/mobile-scenes.js',
  '/js/mobile-ai.js',
  '/js/mobile-monitor.js',
  '/js/mobile-app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external API calls (let them fail gracefully)
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response for caching
            const responseToCache = response.clone();
            
            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('Network request failed:', error);
            
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // Return a custom offline response for API calls
            if (request.url.includes('/api/')) {
              return new Response(
                JSON.stringify({ 
                  error: 'Offline', 
                  message: 'No internet connection available' 
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'fader-sync') {
    event.waitUntil(syncFaderChanges());
  } else if (event.tag === 'scene-sync') {
    event.waitUntil(syncSceneChanges());
  }
});

// Push notifications for system alerts
self.addEventListener('push', event => {
  console.log('Push notification received');
  
  const options = {
    body: 'IonXe system notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Open IonXe',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.title = data.title || 'IonXe Alert';
  }
  
  event.waitUntil(
    self.registration.showNotification('IonXe Mobile', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for background sync
async function syncFaderChanges() {
  try {
    // Get pending fader changes from IndexedDB
    const pendingChanges = await getPendingFaderChanges();
    
    for (const change of pendingChanges) {
      try {
        await fetch('/api/faders/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        });
        
        // Remove from pending changes
        await removePendingFaderChange(change.id);
      } catch (error) {
        console.error('Failed to sync fader change:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncSceneChanges() {
  try {
    // Get pending scene changes from IndexedDB
    const pendingChanges = await getPendingSceneChanges();
    
    for (const change of pendingChanges) {
      try {
        await fetch('/api/scenes/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        });
        
        // Remove from pending changes
        await removePendingSceneChange(change.id);
      } catch (error) {
        console.error('Failed to sync scene change:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// IndexedDB helpers (simplified)
async function getPendingFaderChanges() {
  // Implementation would use IndexedDB
  return [];
}

async function removePendingFaderChange(id) {
  // Implementation would use IndexedDB
}

async function getPendingSceneChanges() {
  // Implementation would use IndexedDB
  return [];
}

async function removePendingSceneChange(id) {
  // Implementation would use IndexedDB
}
