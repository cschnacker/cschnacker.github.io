import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEngine,bracketTax,parseFormula} from '../app/calculations/engine.js';
import {correctedModel} from '../app/calculations/corrections.js';
import {validateData,setTaxYear} from '../app/data/validation.js';
const original=JSON.parse(fs.readFileSync('app/calculations/workbook-model.json'));
const data=JSON.parse(fs.readFileSync('app/data/2026.json'));
const model=correctedModel(original);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const engine=(inputs={},d=data)=>createEngine(model,d,inputs);
test('all source formulas parse and reproduce the 697 saved source results',()=>{
 const source=structuredClone(data);for(const name of ['FEqn','FEqnWH'])source.tables[name].find(r=>r.category==='Rate').values.socialSecurityWageBase=168600;
 const e=createEngine(original,source);let count=0;for(const [a,f]of Object.entries(original.formulas)){parseFormula(f);const actual=e.read(a),expected=original.cached[a];if(typeof actual.value==='number'&&typeof expected==='number')close(actual.value,expected);else assert.equal(actual.error||actual.value,expected,a);count++;}assert.equal(count,697);
});
test('corrected models parse, and empty inputs do not show hidden payroll errors',()=>{for(const f of Object.values(model.formulas))parseFormula(f);const e=engine();for(const a of ['C98','C129','C160','C191','C73','C74'])assert.equal(e.get(a),0,a);});
test('same salary and deductions produce same pay for each job',()=>{
 const inputs={};for(const c of 'CDEF')Object.assign(inputs,{[c+'38']:75000,[c+'40']:1000,[c+'41']:2400,[c+'43']:5,[c+'44']:50,[c+'47']:20,[c+'49']:1200,[c+'60']:1,[c+'63']:1});
 const e=engine(inputs);for(const a of ['C129','C160','C191'])close(e.get(a),e.get('C98'));
});
test('pay frequency is recalculated for all four jobs',()=>{const e=engine({E36:'Monthly',F36:'Weekly'});assert.equal(e.get('E37'),12);assert.equal(e.get('F37'),52);});
test('first federal bracket and every threshold apply marginal rates',()=>{
 const e=engine();close(e.evaluate('FEDTAX(10000,"Single")'),1000);close(e.evaluate('FEDTAX(12400,"Single")'),1240);close(e.evaluate('FEDTAX(12401,"Single")'),1240.12);
 close(e.evaluate('FEDTAX(58900,"Single")'),7670);close(bracketTax(100,[0,50],[.1,.2]),15);
 for(const status of ['Single','Joint','Separate','HOH']){const r=data.tables.FEqn.find(r=>r.category===status);for(let i=1;i<=6;i++){const b=r.values['bracketRateOrLimit'+i];assert.ok(e.evaluate(`FEDTAX(${b+1},"${status}")`)>=e.evaluate(`FEDTAX(${b},"${status}")`));}}
});
test('other dependents reduce withholding and extra withholding remains after credits',()=>{const base=engine({C38:75000}).get('C71');close(engine({C38:75000,C63:1}).get('C71'),base-500/26);close(engine({C38:10000,C60:5,C69:25}).get('C71'),25);});
test('state brackets use the matching rate for each interval',()=>{const e=engine();close(e.evaluate('STATETAX(4000,"Alabama","Single",1)'),500*.02+2500*.04+1000*.05);});
test('Social Security wage base is annual data and changing it changes payroll',()=>{const d=structuredClone(data);const normal=engine({C38:200000}).get('C93');close(normal,184500*.062/26);d.tables.FEqn.find(r=>r.category==='Rate').values.socialSecurityWageBase=190000;close(engine({C38:200000},d).get('C93'),190000*.062/26);});
test('annual rollover updates lookup keys without changing calculation code',()=>{const d=setTaxYear(structuredClone(data),2027);validateData(d);const e=engine({C38:75000},d);assert.equal(e.get('A3'),2027);close(e.get('C71'),engine({C38:75000}).get('C71'));});
test('missing tables, mixed years and invalid constants are rejected',()=>{for(const mutate of [d=>d.tables.FEqn.pop(),d=>d.tables.SEqn[0].values.year=2025,d=>d.constants.otherDependentCredit=-1]){const d=structuredClone(data);mutate(d);assert.throws(()=>validateData(d));}});
test('errors remain observable, IF is lazy, and text cannot execute code',()=>{const e=engine();assert.equal(e.evaluate('IF(TRUE,5,1/0)'),5);assert.throws(()=>e.evaluate('1/0'));assert.equal(e.evaluate('ISERROR(1/0)'),true);assert.throws(()=>e.evaluate('globalThis.alert(1)'));});
test('all 51 state/DC datasets yield finite basic and bonus estimates for both state filing categories',()=>{
 for(const state of new Set(data.tables.SEqn.map(r=>r.state)))for(const status of ['Single','Joint']){const e=engine({C38:75000,C39:5000,C11:state,C10:status});for(const a of ['C98','C73','C74'])assert.ok(Number.isFinite(e.get(a)),`${state} ${status} ${a}`);}
});
