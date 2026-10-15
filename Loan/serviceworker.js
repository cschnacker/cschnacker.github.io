// Update VERSION when deploying changed app files. Storage is separate from this cache.
const VERSION = '15';
const PREFIX = `loan-planner:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const FILES = ['./','./index.html','./styles.css','./js/app.js','./js/steppers.js','./js/plan-files.js','./js/calculations.js','./js/storage.js','./data/defaults.js','./manifest.json','./loan550x550.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('message',event=>{if(event.data==='activate-update')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
// A complete app version stays together. The next version activates after old tabs close.
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(!url.href.startsWith(self.registration.scope))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return cache.match('./index.html');throw error;}
  }));
});
