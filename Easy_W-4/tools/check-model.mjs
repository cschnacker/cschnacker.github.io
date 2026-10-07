import fs from 'node:fs';
import {createEngine,parseFormula} from '../app/calculations/engine.js';
const model=JSON.parse(fs.readFileSync('app/calculations/workbook-model.json'));
const data=JSON.parse(fs.readFileSync('app/data/2026.json'));
const e=createEngine(model,data);
const mismatch=[],errors=[];let matches=0;
for(const [a,f] of Object.entries(model.formulas)){
 try{parseFormula(f);}catch(err){errors.push([a,err.message]);continue;}
 const actual=e.read(a),expected=model.cached[a];
 if(actual.error===expected || actual.value===expected || typeof actual.value==='number'&&typeof expected==='number'&&Math.abs(actual.value-expected)<1e-7)matches++;
 else mismatch.push([a,expected,actual]);
}
console.log(JSON.stringify({matches,parseErrors:errors,mismatches:mismatch.slice(0,25),mismatchCount:mismatch.length},null,2));
for(const inputs of [{C38:75000},{C38:75000,D38:50000}]){
 const engine=createEngine(model,data,inputs);console.log(inputs,Object.fromEntries(['C71','D71','C72','C73','C74','C98','C129','C222','O254'].map(a=>[a,engine.read(a)])));
}
