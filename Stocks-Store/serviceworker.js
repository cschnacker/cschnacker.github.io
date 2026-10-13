/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
const CACHE='stocks-funds-planner-all-v32';
const FILES=['./','./index.html','./styles.css','./js/app.js','./js/editor-save.js','./js/money-input.js','./js/help.js','./js/holding-tools.js','./js/history.js','./js/account-history.js','./js/cash-flow.js','./js/model.js','./js/account-valuation.js','./js/calculations.js','./js/funding.js','./js/funding-allocations.js','./js/investment-funding.js','./js/outside-funding.js','./js/storage.js','./js/config.js','./js/prices.js','./js/fixed-income.js','./js/module-validation.js','./js/module-ui.js','./data/annual.json','./data/symbols.json','./data/symbols-metadata.json','./js/symbol-search.js','./manifest.json','./icon.svg','./icon-192x192.png','./icon-512x512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('stocks-funds-planner-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request)));});
