const CACHE='sss-budget-shell-v10';
const ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./src/app.mjs','./src/model.mjs','./src/calculations.mjs','./src/storage.mjs','./data/annual-defaults.json','./icons/icon-32.png','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-192.png','./icons/maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('sss-budget-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    try{return await fetch(event.request);}catch{
      const cache=await caches.open(CACHE);
      const saved=await cache.match(event.request);
      if(saved)return saved;
      if(event.request.mode==='navigate')return await cache.match('./index.html');
      return Response.error();
    }
  })());
});
