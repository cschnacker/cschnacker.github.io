/* Network-first so a replaced annual JSON file is picked up on the next visit. */
const PREFIX='retirement-planner-';
const CACHE=PREFIX+'v9';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{const response=await fetch(event.request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;}
    catch{const cache=await caches.open(CACHE);const saved=await cache.match(event.request);return saved||new Response('Unavailable offline. Connect and reload.',{status:503});}
  })());
});
