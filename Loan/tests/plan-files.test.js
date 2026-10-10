import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyPlan, emptyModification } from '../data/defaults.js';
import { exportPlan, importPlan } from '../js/plan-files.js';
import { savePlan, loadPlan } from '../js/storage.js';
import { calculate } from '../js/calculations.js';

test('plan transfer preserves exact entries, disabled changes, and view on a new browser',()=>{
  const plan={...emptyPlan(),principal:'123456.78',rate:'5.125',years:'15',startYear:'2026',startMonth:'10',taxes:'1234.56',insurance:'789.12',extra:'250.50',lumpSum:'1500.25',view:'monthly',modifications:[{...emptyModification(),year:'2028',taxes:'0',rate:'3',refinance:true}]};
  const imported=importPlan(exportPlan(plan));assert.deepEqual(imported,plan);
  let value;const newBrowser={setItem:(key,text)=>{value=text;},getItem:()=>value};
  assert.equal(savePlan(newBrowser,imported),true);assert.deepEqual(loadPlan(newBrowser).plan,plan);assert.deepEqual(calculate(imported),calculate(plan));
  assert.deepEqual(importPlan(exportPlan(emptyPlan())),emptyPlan());
});
test('invalid plan files are rejected rather than silently clearing or truncating entries',()=>{
  const file=JSON.parse(exportPlan(emptyPlan()));
  for(const text of ['bad json','{}','Year,Payment\n2026,100',JSON.stringify({...file,version:999}),JSON.stringify({...file,inputs:{}}),JSON.stringify({...file,inputs:{...file.inputs,principal:'<script>'}}),JSON.stringify({...file,inputs:{...file.inputs,modifications:Array(5).fill(emptyModification())}}),JSON.stringify({...file,inputs:{...file.inputs,modifications:[{...emptyModification(),refinance:'true'}]}}),' '.repeat(100001)])assert.throws(()=>importPlan(text));
});
