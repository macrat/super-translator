const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'SuperTranslator#'
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;


self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      '/offline.html',
      '/img/favicon.svg',
    ]);
    await self.skipWaiting();
  })());
});


self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }

    const names = await caches.keys();
    const invalids = names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
    await Promise.all(invalids.map((name) => caches.delete(name)))

    await clients.claim();
  })());
});


self.addEventListener('fetch', (ev) => {
  ev.respondWith((async () => {
    const url = new URL(ev.request.url);
    const pathname = url.pathname;

    if (pathname === '/via-share') {
      const params = new URLSearchParams();
      params.append('text', new URLSearchParams(url.search).get('text'));
      params.append('sl', 'auto');
      params.append('tl', 'auto');
      return Response.redirect('/?' + params.toString(), 302);
    }

    const cache = await caches.open(CACHE_NAME);

    try {
      const preloaded = await ev.preloadResponse;
      if (preloaded) {
        if (pathname.startsWith('/assets/') && preloaded.ok) {
          cache.put(ev.request, preloaded.clone());
        }
        return preloaded;
      }

      if (pathname.startsWith('/assets/')) {
        const matched = await cache.match(ev.request);
        if (matched) {
          return matched;
        }
      }

      const resp = await fetch(ev.request);
      if (pathname.startsWith('/assets/') && resp.ok) {
        cache.put(ev.request, resp.clone());
      }
      return resp;
    } catch (err) {
      if (pathname === '/') {
        return cache.match('/offline.html');
      } else {
        return cache.match(ev.request);
      }
    }
  })());
});
