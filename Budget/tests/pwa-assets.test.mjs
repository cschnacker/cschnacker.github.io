import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.webmanifest',root),'utf8'));
function checkPng(asset){
  const url=new URL(asset.src,root);
  assert.ok(url.href.startsWith(root.href),'Asset must stay inside Budget');
  const bytes=fs.readFileSync(url);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',asset.src);
  assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,asset.sizes,asset.src);
  assert.equal(asset.type,'image/png');
}
test('manifest PNG icons and screenshots exist with their advertised dimensions',()=>{
  manifest.icons.forEach(checkPng);
  manifest.screenshots.forEach(checkPng);
  for(const size of ['192x192','512x512'])assert.ok(manifest.icons.some(i=>i.sizes===size&&i.purpose==='any'));
  assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable'));
  checkPng({src:'icons/icon-180.png',sizes:'180x180',type:'image/png'});
});
test('PWA launch and identity stay within the Budget deployment scope',()=>{
  const url=new URL('https://example.test/Budget/manifest.webmanifest');
  const scope=new URL(manifest.scope,url);
  assert.equal(scope.pathname,'/Budget/');
  assert.equal(new URL(manifest.start_url,url).pathname,'/Budget/index.html');
  assert.equal(new URL(manifest.id,url).pathname,'/Budget/index.html');
  assert.equal(manifest.display,'standalone');
  assert.ok(fs.readFileSync(new URL('index.html',root),'utf8').includes('href="manifest.webmanifest"'));
});

test('manifest retains the existing Microsoft Store display name',()=>{assert.equal(manifest.name,'Yearly Budget Planner');});
