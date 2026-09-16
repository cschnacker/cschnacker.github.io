const cacheName = 'effective-tax-rates-v3';
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name === 'v2' ||
      (name.startsWith('effective-tax-rates-') && name !== cacheName))
      .map(name => caches.delete(name))
  )));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Third-party ad scripts and impressions must use the network.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(fetch(event.request).then(async response => {
    if (response.ok && response.type === 'basic') {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(event.request, response.clone());
      } catch (error) { /* Storage limits must not break network responses. */ }
    }
    return response;
  }).catch(async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(event.request) || Response.error();
  }));
});
