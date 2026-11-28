const prefix = 'schnacker-income-tax-';
const version = '2026-17';
const cacheName = prefix + version;
const assets = ['./index.html', './styles.css?v=' + version, './manifest.json', './Inc%26Tax.png',
  './src/app.mjs?v=' + version, './src/model.mjs?v=2026-17', './src/storage.mjs?v=2026-17', './src/legacy.mjs?v=2026-17',
  './src/tax-data.mjs', './src/calculations.mjs?v=' + version, './data/releases.json'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(assets.map(path => new Request(path, { cache: 'reload' })));
    const manifest = await (await cache.match('./data/releases.json')).json();
    await cache.addAll(manifest.years.flatMap(year => [
      './data/tax-' + year + '.json', './data/planner-' + year + '.json'
    ]));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(prefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) return response;
      const cache = await caches.open(cacheName);
      return await cache.match(event.request) ?? response;
    } catch {
      const cache = await caches.open(cacheName);
      const response = await cache.match(event.request) ??
        (event.request.mode === 'navigate' ? await cache.match('./index.html') : null);
      return response ?? Response.error();
    }
  })());
});
