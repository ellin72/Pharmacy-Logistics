// Service Worker for Offline Support
const CACHE_NAME = 'pharmacy-logistics-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/add-medicine.html',
  '/adjust-stock.html',
  '/order-list.html',
  '/transactions.html',
  '/bulk-operations.html',
  '/notifications-settings.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/inventory.js',
  '/js/alerts.js',
  '/js/users.js',
  '/js/reports.js',
  '/js/transactions.js',
  '/js/notifications.js',
  '/favicon.svg'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Firebase and external API requests
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If offline and page request, return offline page
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle sync events for background sync (when connection is restored)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inventory') {
    event.waitUntil(syncInventory());
  }
});

// Sync inventory when back online
async function syncInventory() {
  // This would sync pending operations
  // Implementation depends on your offline queue system
  console.log('Service Worker: Syncing inventory');
}

