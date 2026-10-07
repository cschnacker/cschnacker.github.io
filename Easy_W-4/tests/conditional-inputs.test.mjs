import test from 'node:test';
import assert from 'node:assert/strict';
import {expenseVisibility,calculationInputs} from '../app/ui/conditional-inputs.js';

test('irrelevant costs are hidden and excluded without erasing exact saved amounts',()=>{
 const inputs={C6:0,C7:0,C8:0,C9:12000,C34:3456.78,otherCare:'No'};
 assert.deepEqual(expenseVisibility(inputs),{C29:false,C30:false,C31:false,C32:false,C9:false,C34:false});
 const effective=calculationInputs(inputs);
 assert.equal(effective.C9,0);assert.equal(effective.C34,0);
 assert.equal(inputs.C9,12000);assert.equal(inputs.C34,3456.78);
 assert.equal(calculationInputs({...inputs,C8:1}).C9,12000);
 assert.equal(calculationInputs({...inputs,C6:1}).C34,3456.78);
});
test('college and care fields respond independently, including qualifying adult care',()=>{
 assert.deepEqual(expenseVisibility({C8:1}),{C29:false,C30:false,C31:false,C32:false,C9:true,C34:false});
 assert.deepEqual(expenseVisibility({C6:1}),{C29:false,C30:false,C31:false,C32:false,C9:false,C34:true});
 assert.deepEqual(expenseVisibility({C7:1}),{C29:false,C30:false,C31:false,C32:false,C9:false,C34:true});
 assert.deepEqual(expenseVisibility({otherCare:'Yes'}),{C29:false,C30:false,C31:false,C32:false,C9:false,C34:true});
});

test('itemized costs are excluded when off and exact amounts restored when on',()=>{
 const inputs={C28:'No',C29:1234.56,C30:2345.67,C31:3456.78,C32:4567.89};
 for(const cell of ['C29','C30','C31','C32']){
  assert.equal(expenseVisibility(inputs)[cell],false);
  assert.equal(calculationInputs(inputs)[cell],0);
  assert.equal(expenseVisibility({...inputs,C28:'Yes'})[cell],true);
  assert.equal(calculationInputs({...inputs,C28:'Yes'})[cell],inputs[cell]);
 }
});
