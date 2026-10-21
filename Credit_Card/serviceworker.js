const CACHE='sss-credit-card-v18';
const FILES=['./','index.html','styles.css','js/app.mjs','js/chart.mjs','js/payoff.mjs','js/dates.mjs','js/model.mjs','js/database.mjs','js/calculations.mjs','data/annual.json','manifest.json','icon.svg','icon192x192.png','icon512x512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sss-credit-card-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request)));});
















