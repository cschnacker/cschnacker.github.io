import test from 'node:test';
import assert from 'node:assert/strict';
import {calculationInputs} from '../app/ui/conditional-inputs.js';
import {retirementVisibility,retirementMethod,retirementGroups} from '../app/ui/retirement-inputs.js';
test('retirement methods exclude other methods for each plan and job without erasing saved inputs',()=>{
 for(const c of 'CDEF')for(const group of retirementGroups){
  const [pct,pay,annual]=group.rows;
  const inputs={[c+pct]:5,[c+pay]:500,[c+annual]:6000};
  for(const [method,row,value] of [['Percent',pct,5],['Dollars per paycheck',pay,500],['Annual dollars',annual,6000]]){
   inputs[c+group.key]=method;
   const effective=calculationInputs(inputs);
   for(const r of group.rows){assert.equal(effective[c+r],r===row?value:0);assert.equal(retirementVisibility(inputs)[c+r],r===row);}
  }
  assert.equal(inputs[c+pct],5);assert.equal(inputs[c+pay],500);assert.equal(inputs[c+annual],6000);
 }
});
test('older scenarios infer one method, preferring percent when methods conflict',()=>{
 const group=retirementGroups[0];
 assert.equal(retirementMethod({C44:500},'C',group),'Dollars per paycheck');
 assert.equal(retirementMethod({C45:6000},'C',group),'Annual dollars');
 assert.equal(retirementMethod({C43:5,C44:500},'C',group),'Percent');
});
