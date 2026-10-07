import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stateWithholding} from '../app/calculations/state-withholding.js';
import {createEngine} from '../app/calculations/engine.js';
import {correctedModel} from '../app/calculations/corrections.js';
const data=JSON.parse(fs.readFileSync('app/data/2026.json'));
const model=correctedModel(JSON.parse(fs.readFileSync('app/calculations/workbook-model.json')));
test('California annualized Method B matches EDD examples E and F',()=>{
 assert.equal(stateWithholding(data,{state:'California',status:'Joint',wages:57600,periods:24,allowances:4}),4.13);
 assert.equal(stateWithholding(data,{state:'California',status:'Joint',wages:57000,periods:12,allowances:4}),7.17);
});
test('state regular and deduction allowances have different effects; exemption and manual modes work',()=>{
 const base={state:'California',status:'Single',wages:75000,periods:26};
 assert.ok(stateWithholding(data,{...base,allowances:1})<stateWithholding(data,base));
 assert.ok(stateWithholding(data,{...base,deductions:1})<stateWithholding(data,base));
 assert.equal(stateWithholding(data,{...base,exempt:'Yes',extra:20}),0);
 assert.equal(stateWithholding(data,{...base,mode:'Manual',manual:100,extra:20}),120);
 assert.equal(stateWithholding(data,{...base,wages:18896}),0);
 assert.throws(()=>stateWithholding({...data,stateWithholding:null},base));
});
test('federal and state withholding choices are independent for every job',()=>{
 for(const c of 'CDEF'){
  const inputs={C10:'Joint',[c+'38']:75000,[c+'50']:'California',[c+'3001']:'Single',[c+'3006']:'Calculate'};
  const read=(extra,cell)=>createEngine(model,data,{...inputs,...extra}).get(c+cell);
  const state=read({},'72'),federal=read({},'71');
  assert.equal(read({[c+'60']:3,[c+'63']:2,[c+'66']:20000,[c+'68']:5000,[c+'69']:100,[c+'58']:'Yes',[c+'3000']:'Single'},'72'),state);
  assert.equal(read({[c+'3001']:'Joint',[c+'3002']:4,[c+'3003']:3,[c+'3004']:50},'71'),federal);
  assert.equal(read({[c+'3004']:50},'72'),state+50);
  assert.equal(read({[c+'50']:'Texas',[c+'3005']:25,[c+'3004']:10},'72'),35);
 }
});
