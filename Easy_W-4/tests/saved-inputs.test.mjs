import test from 'node:test';
import assert from 'node:assert/strict';
import {saveInputs,restoreInputs,clearInputs} from '../app/ui/saved-inputs.js';
const storage=()=>{const entries=new Map();return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};};
test('browser scenario survives reopening, retains hidden inputs, and stays separate by year',()=>{
 const browser=storage(),inputs={C38:72500.25,C28:'No',C31:9000,C66:7000,C3106:12000};
 saveInputs(browser,2026,inputs,2);
 assert.deepEqual(restoreInputs(browser,2026,v=>v),{inputs,job:2});
 assert.equal(restoreInputs(browser,2027,v=>v),null);
 saveInputs(browser,2027,{C38:80000},0);
 clearInputs(browser,2026);
 assert.equal(restoreInputs(browser,2026,v=>v),null);
 assert.equal(restoreInputs(browser,2027,v=>v).inputs.C38,80000);
});
test('unusable saved data and blocked storage propagate for a visible UI fallback',()=>{
 const browser=storage();saveInputs(browser,2026,{C38:-1},0);
 assert.throws(()=>restoreInputs(browser,2026,()=>{throw new Error('Invalid salary');}),/Invalid salary/);
 assert.throws(()=>saveInputs({setItem(){throw new Error('Blocked');}},2026,{},0),/Blocked/);
 browser.setItem('easy-w4:inputs:v1:2026','invalid json');
 assert.throws(()=>restoreInputs(browser,2026,v=>v));
});
