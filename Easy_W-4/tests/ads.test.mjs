import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canServeAds,initializeAds} from '../app/ui/ads.js';
const config={enabled:true,publisherId:'ca-pub-5436594780163482',slotId:'1234567890',approvedHostnames:['example.com'],consentManagementReady:true};
const environment={protocol:'https:',hostname:'example.com',unsupportedWebView:false,disabled:false};
test('ads are gated by complete deployment settings and supported environment',()=>{
 assert.equal(canServeAds(config,environment),true);
 for(const override of [{enabled:false},{slotId:''},{publisherId:'invalid'},{consentManagementReady:false},{approvedHostnames:[]}])assert.equal(canServeAds({...config,...override},environment),false);
 for(const override of [{protocol:'http:'},{hostname:'localhost'},{unsupportedWebView:true},{disabled:true}])assert.equal(canServeAds(config,{...environment,...override}),false);
 assert.equal(canServeAds(JSON.parse(fs.readFileSync('app/data/ads.json')),environment),false);
});
function fakePage(){
 const nodes=[],scripts=[];
 const container={dataset:{},hidden:true,append:node=>nodes.push(node)};
 return {container,nodes,scripts,document:{getElementById:()=>container,createElement:()=>({style:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;}}),head:{append:node=>scripts.push(node)}},window:{location:{protocol:'https:',hostname:'example.com',search:''},navigator:{userAgent:'Browser'}}};
}
test('one ad initializes once; script failure hides it without touching calculator storage',async()=>{
 const page=fakePage();const init=()=>initializeAds({...page,fetchConfig:async()=>config});
 await init();await init();
 assert.equal(page.nodes.length,1);assert.equal(page.scripts.length,1);
 assert.deepEqual(page.nodes[0].attributes,{'data-ad-client':config.publisherId,'data-ad-slot':config.slotId,'data-ad-format':'auto','data-full-width-responsive':'true'});
 page.scripts[0].onload();assert.deepEqual(page.window.adsbygoogle,[{}]);
 page.scripts[0].onerror();assert.equal(page.container.hidden,true);
});
test('config failures and detected Windows or Android WebViews make no ad requests',async()=>{
 const failed=fakePage();await initializeAds({...failed,fetchConfig:async()=>{throw new Error('Offline');}});
 assert.equal(failed.scripts.length,0);
 for(const type of ['windows','android']){
  const page=fakePage();if(type==='windows')page.window.chrome={webview:{}};else page.window.navigator.userAgent='Mozilla/5.0 (Linux; Android 14; Device Build/X; wv)';
  await initializeAds({...page,fetchConfig:async()=>config});assert.equal(page.scripts.length,0);
 }
});
