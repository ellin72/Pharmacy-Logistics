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
        // Filter out invalid URLs and add them one by one to handle errors gracefully
        const validUrls = urlsToCache.filter(url => {
          return url && 
                 (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) &&
                 !url.startsWith('chrome-extension://') &&
                 !url.startsWith('moz-extension://');
        });
        
        return Promise.allSettled(
          validUrls.map(url => {
            try {
              return cache.add(new Request(url, { cache: 'reload' }))
                .catch((error) => {
                  console.warn('Service Worker: Failed to cache', url, error);
                  return null; // Continue with other files
                });
            } catch (error) {
              console.warn('Service Worker: Invalid URL', url, error);
              return Promise.resolve(null);
            }
          })
        );
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
  // Get request URL
  const requestUrl = event.request.url || '';
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip unsupported schemes (chrome-extension, moz-extension, etc.)
  if (requestUrl.startsWith('chrome-extension://') ||
      requestUrl.startsWith('moz-extension://') ||
      requestUrl.startsWith('safari-extension://') ||
      requestUrl.startsWith('ms-browser-extension://') ||
      requestUrl.startsWith('edge-extension://')) {
    return; // Don't process extension URLs at all
  }

  // Skip non-HTTP/HTTPS requests
  if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://') && !requestUrl.startsWith('/')) {
    return;
  }

  // Skip Firebase and external API requests
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('cdn.jsdelivr.net') ||
      event.request.url.includes('unpkg.com')) {
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

            // Skip caching for unsupported schemes
            if (response.url.startsWith('chrome-extension://') ||
                response.url.startsWith('moz-extension://') ||
                response.url.startsWith('safari-extension://') ||
                response.url.startsWith('ms-browser-extension://')) {
              return response;
            }

            // Double-check the request URL before caching
            const requestUrl = event.request.url || response.url || '';
            
            // Skip caching if it's an extension URL or invalid scheme
            if (requestUrl.startsWith('chrome-extension://') ||
                requestUrl.startsWith('moz-extension://') ||
                requestUrl.startsWith('safari-extension://') ||
                requestUrl.startsWith('ms-browser-extension://') ||
                (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://'))) {
              return response;
            }

            // Final validation before attempting to cache
            const finalRequestUrl = event.request.url || response.url || '';
            const finalResponseUrl = response.url || '';
            
            // Check both request and response URLs
            const isExtensionUrl = 
              finalRequestUrl.startsWith('chrome-extension://') ||
              finalRequestUrl.startsWith('moz-extension://') ||
              finalRequestUrl.startsWith('safari-extension://') ||
              finalRequestUrl.startsWith('ms-browser-extension://') ||
              finalRequestUrl.startsWith('edge-extension://') ||
              finalResponseUrl.startsWith('chrome-extension://') ||
              finalResponseUrl.startsWith('moz-extension://') ||
              finalResponseUrl.startsWith('safari-extension://') ||
              finalResponseUrl.startsWith('ms-browser-extension://') ||
              finalResponseUrl.startsWith('edge-extension://');
            
            // If it's an extension URL, don't cache at all
            if (isExtensionUrl) {
              return response;
            }

            // Only cache if URL is valid HTTP/HTTPS
            if (!finalRequestUrl.startsWith('http://') && 
                !finalRequestUrl.startsWith('https://') && 
                !finalRequestUrl.startsWith('/')) {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache with comprehensive error handling
            caches.open(CACHE_NAME)
              .then((cache) => {
                // One more check just before caching
                const cacheUrl = event.request.url || '';
                if (cacheUrl.includes('chrome-extension://') ||
                    cacheUrl.includes('moz-extension://') ||
                    cacheUrl.includes('safari-extension://') ||
                    cacheUrl.includes('ms-browser-extension://') ||
                    cacheUrl.includes('edge-extension://')) {
                  return Promise.resolve(); // Don't cache, but don't throw
                }
                
                // Use catch to handle any errors silently
                return cache.put(event.request, responseToCache).catch((error) => {
                  // Completely ignore errors for unsupported schemes
                  // Don't log or throw - just silently fail
                  return Promise.resolve();
                });
              })
              .catch((error) => {
                // Completely ignore all cache errors
                // Extensions can cause cache errors, we don't want to break the app
                return Promise.resolve();
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

