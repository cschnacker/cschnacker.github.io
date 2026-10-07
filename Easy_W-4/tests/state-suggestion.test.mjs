import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEngine} from '../app/calculations/engine.js';
import {correctedModel} from '../app/calculations/corrections.js';
const model=correctedModel(JSON.parse(fs.readFileSync('app/calculations/workbook-model.json')));
const data=JSON.parse(fs.readFileSync('app/data/2026.json'));
const base={C10:'Joint',C11:'California',C38:75000,D38:25000,C36:'Bi-Weekly',D36:'Monthly',C50:'California',D50:'California',E50:'California',F50:'California',C3006:'Suggested',D3006:'Suggested',E3006:'Suggested',F3006:'Suggested'};
const calc=(extra={})=>createEngine(model,data,{...base,...extra});
test('household state liability is allocated once across jobs with differing pay frequencies',()=>{
 const e=calc();const tax=e.get('F222');assert.ok(tax>0);
 assert.ok(Math.abs(e.get('C72')*26-tax*.75)<1e-7);
 assert.ok(Math.abs(e.get('D72')*12-tax*.25)<1e-7);
 assert.ok(Math.abs(e.get('C74'))<1e-7);
 assert.equal(e.get('E72'),0);
});
test('other income leaves a balance due while bonus withholding is counted once',()=>{
 const e=calc({C16:10000,C39:5000});assert.ok(e.get('F222')>calc().get('F222'));
 assert.equal(e.get('C106'),0);assert.ok(e.get('C74')>0);
 assert.equal(e.get('C72'),calc({C39:5000}).get('C72'));
 assert.ok(Math.abs(calc({C39:5000}).get('C74'))<1e-7);
});
test('manual and extra state withholding show surplus or shortfall instead of changing household tax',()=>{
 const e=calc({C3004:50});assert.equal(e.get('F222'),calc().get('F222'));assert.ok(Math.abs(e.get('C74')+1300)<1e-7);
 const manual=calc({D3006:'Manual',D3005:0});assert.ok(Math.abs(manual.get('C74')-manual.get('F222')*.25)<1e-7);
});
test('multistate suggestions are unavailable; no-wage households retain unallocated liability',()=>{
 assert.match(calc({D50:'New York'}).read('C72').error,/multistate/);
 const e=calc({C38:0,D38:0,C16:100000});assert.equal(e.get('C72'),0);assert.ok(e.get('F222')>0);assert.equal(e.get('C74'),e.get('F222'));
});

test('Kentucky household and work state produce a finite suggestion; mismatches remain explicit',()=>{
 const e=calc({C11:'Kentucky',C50:'Kentucky',D50:'Kentucky'});
 assert.equal(e.read('C72').error,null);assert.ok(e.get('C72')>0);
 assert.ok(Math.abs(e.get('C74'))<1e-7);
 assert.match(calc({C50:'Kentucky'}).read('C72').error,/multistate/);
});

test('actual other income raises state tax and manual year-end balance independently of W-4',()=>{
 const fixed={C3006:'Manual',D3006:'Manual',C3005:100,D3005:50};
 const before=calc(fixed),after=calc({...fixed,C3106:12000,C66:7000});
 assert.ok(after.get('F222')>before.get('F222'));
 assert.ok(Math.abs((after.get('C74')-before.get('C74'))-(after.get('F222')-before.get('F222')))<1e-7);
 assert.equal(after.get('F222'),calc({...fixed,C3106:12000,C66:0}).get('F222'));
 for(const field of ['C16','C17'])assert.ok(calc({...fixed,[field]:12000}).get('C74')>before.get('C74'));
});

test('Georgia other income increases annual tax and balance due without raising wage withholding',()=>{
 const georgia={C11:'Georgia',C50:'Georgia',D50:'Georgia'};
 const before=calc(georgia);
 for(const field of ['C16','C17','C3106']){
  const after=calc({...georgia,[field]:12000,C66:7000});
  assert.equal(after.get('C72'),before.get('C72'));
  assert.equal(after.get('D72'),before.get('D72'));
  assert.ok(after.get('F222')>before.get('F222'));
  assert.ok(after.get('C74')>0);
  assert.ok(Math.abs(after.get('C74')-(after.get('F222')-before.get('F222')))<1e-7);
  const extra=calc({...georgia,[field]:12000,C3004:10});
  assert.ok(Math.abs(extra.get('C74')-(after.get('C74')-260))<1e-7);
 }
});
