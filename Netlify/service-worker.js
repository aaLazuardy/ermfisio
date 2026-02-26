const CACHE_NAME = 'fisiota-cache-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './data.js',
    './config.js',
    './assets.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Caching Clockwork Assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing Old Cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch Event (Cache First Strategy for static assets)
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests for now if they are not in our list
    if (!event.request.url.startsWith(self.location.origin) &&
        !event.request.url.includes('tailwindcss') &&
        !event.request.url.includes('lucide')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchResponse) => {
                // Cache new static assets dynamically if needed or just return
                return fetchResponse;
            });
        }).catch(() => {
            // Offline fallback can be handled here
        })
    );
});
