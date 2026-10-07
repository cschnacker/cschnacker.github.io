import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePage,UI_VERSION} from '../app/ui/page-contract.js';
const html=fs.readFileSync('app/index.html','utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const page={documentElement:{dataset:{uiVersion:html.match(/data-ui-version="([^"]+)"/)[1]}},getElementById:id=>ids.has(id)?{}:null};
test('shipped page has the version and containers required by the script',()=>{
 assert.equal(page.documentElement.dataset.uiVersion,UI_VERSION);
 assert.doesNotThrow(()=>validatePage(page));
});
test('stale or incomplete HTML is rejected before rendering input fields',()=>{
 assert.throws(()=>validatePage({...page,documentElement:{dataset:{}}}),/older or incomplete/);
 assert.throws(()=>validatePage({...page,getElementById:id=>id==='state-fields'?null:page.getElementById(id)}),/Load the latest calculator/);
});

test('store page contains no annual-data editor or controls',()=>{
 for(const id of ['data-tab','annual-data','annual-settings','import-data','export-data','table-editor'])assert.equal(ids.has(id),false);
 const code=fs.readFileSync('app/ui/app.js','utf8');
 assert.equal(code.includes('function annualSettings'),false);
 assert.ok(ids.has('save-scenario')&&ids.has('load-scenario'));
});
