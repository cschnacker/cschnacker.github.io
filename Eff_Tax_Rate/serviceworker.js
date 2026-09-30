'use strict';
const prefix = 'custom-effective-tax-' + self.registration.scope;
const cacheName = prefix + '-v5';
const files = ['./','index.html','manifest.json','assets/css/model.css','assets/css/custom.css','assets/css/advertising.css','assets/js/ads-config.js','assets/js/advertising.js','assets/js/calculator-engine.js','assets/js/calculator.js','tax550x550.png','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const asset = files.some(file => new URL(file,self.registration.scope).pathname === url.pathname);
  if(!asset) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    const cached = await cache.match(event.request, {ignoreSearch:true});
    return cached || fetch(event.request);
  }));
});



