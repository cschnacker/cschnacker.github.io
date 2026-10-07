import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEngine} from '../app/calculations/engine.js';
import {correctedModel} from '../app/calculations/corrections.js';
import {getW4Availability} from '../app/calculations/w4-availability.js';
const model=correctedModel(JSON.parse(fs.readFileSync('app/calculations/workbook-model.json')));
const data=JSON.parse(fs.readFileSync('app/data/2026.json'));
test('W-4 reference balances are shared across all four jobs',()=>{
 const inputs={C6:3,C7:2,C16:2000,C17:500,C18:-100,C28:'Yes',C31:30000,C60:1,D60:1,C63:1,C66:1000.25,D66:200,C68:5000,D68:1000};
 const engine=createEngine(model,data,inputs);
 for(let job=0;job<4;job++){
  const rows=getW4Availability(engine,inputs,job);
  for(const row of rows)assert.equal(row.remaining,row.total-[...'CDEF'].reduce((sum,c)=>sum+Number(inputs[c+row.row]||0),0));
 }
 const second=getW4Availability(engine,inputs,1);
 assert.equal(second[0].available,2);
 assert.equal(second[2].available,1399.75);
});
test('chosen dependent entries can exceed household facts and change withholding independently',()=>{
 const inputs={C6:1,C7:0,C38:100000,C60:3,C63:2};
 const engine=createEngine(model,data,inputs);
 const rows=getW4Availability(engine,inputs,0);
 assert.equal(rows[0].remaining,-2);
 assert.equal(rows[1].remaining,-2);
 assert.equal(engine.get('C6'),1);
 assert.equal(engine.get('C7'),0);
 assert.ok(engine.get('C71')<createEngine(model,data,{...inputs,C60:1,C63:0}).get('C71'));
});

test('12000 actual income less 7000 elected leaves 5000, then tracks later jobs',()=>{
 const inputs={C3106:12000,C66:7000,C6:3,C60:1};
 const get=(i,job=0)=>getW4Availability(createEngine(model,data,i),i,job);
 assert.equal(get(inputs)[2].remaining,5000);
 assert.equal(get(inputs)[0].remaining,2);
 assert.equal(get({...inputs,D66:5000},1)[2].remaining,0);
 assert.equal(get({...inputs,C66:13000})[2].remaining,-1000);
});

test('editing any job changes the common balance on every W-4 for all categories',()=>{
 const inputs={C3106:12000,C66:7000,D66:2000,C6:4,C60:1,F60:2,C7:3,D63:1,E63:1,C28:'Yes',C31:50000,C68:1000,F68:2000};
 const engine=createEngine(model,data,inputs);
 for(let job=0;job<4;job++){
  const rows=getW4Availability(engine,inputs,job);
  assert.equal(rows[2].remaining,3000);
  assert.equal(rows[0].remaining,1);
  assert.equal(rows[1].remaining,1);
  assert.equal(rows[3].remaining,rows[3].total-3000);
 }
});
