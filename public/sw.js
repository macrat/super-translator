const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'SuperTranslator#'
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;


self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      '/offline.html',
      '/favicon.svg',
    ]);
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
  })());
});


self.addEventListener('fetch', (ev) => {
  if (ev.request.mode === 'navigate') {
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

      try {
        const preloaded = await ev.preloadResponse;
        if (preloaded) {
          return preloaded;
        }

        return fetch(ev.request);
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);

        if (pathname === '/') {
          return cache.match('/offline.html');
        } else {
          return cache.match(ev.request);
        }
      }
    })());
  }
});
