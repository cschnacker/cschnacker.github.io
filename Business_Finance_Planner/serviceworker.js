// Cache only this application's shell; never clear another PWA's caches.
const CACHE='business-finance-planner-shell-v12';
const FILES=['./','index.html','styles.css','app.bundle.js','manifest.json','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('business-finance-planner-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||!FILES.some(file=>new URL(file,self.registration.scope).href===url.href))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,clone)));}
    return response;
  }).catch(()=>caches.open(CACHE).then(cache=>cache.match(event.request))));
});
