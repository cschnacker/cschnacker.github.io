import test from 'node:test';
import assert from 'node:assert/strict';
import { payment,calculate } from '../js/calculations.js';
import { emptyPlan,emptyModification,SETTINGS } from '../data/defaults.js';
import { loadPlan,savePlan,clearPlan } from '../js/storage.js';
const plan = extra => ({...emptyPlan(),startYear:'2023',years:'30',principal:'300000',rate:'6',...extra});
const close=(a,b)=>assert.ok(Math.abs(a-b)<0.005,`${a} != ${b}`);
test('monthly quote matches independently known mortgage payment',()=>close(payment(300000,.06/12,360),1798.651575458));
test('monthly amortization and yearly totals reconcile independently',()=>{
  const r=calculate(plan());assert.equal(r.months.length,360);assert.equal(r.paymentCount,360);assert.equal(r.rows.length,30);assert.equal(r.payoffYear,2052);assert.equal(r.payoffMonth,12);
  const monthly=1798.651575458;
  const firstYearBalance=300000*Math.pow(1.005,12)-monthly*(Math.pow(1.005,12)-1)/.005;
  close(r.initialMonthlyPayment,monthly);close(r.months[0].interest,1500);
  close(r.months[0].closing,301500-monthly);close(r.rows[0].closing,firstYearBalance);close(r.rows.at(-1).closing,0);
  close(r.rows[0].payment,monthly*12);close(r.totalInterest,monthly*360-300000);
  close(r.rows.reduce((s,row)=>s+row.principal+row.extra+row.lumpSum,0),300000);
  close(r.totalPaid-r.totalInterest,300000);
  for(const annual of r.rows) {
    const months=r.months.filter(m=>m.year===annual.year);
    for(const key of ['principal','interest','payment','taxes','insurance','extra','lumpSum','total'])close(annual[key],months.reduce((s,m)=>s+m[key],0));
  }
});
test('zero interest, early payoff, overpayment cap',()=>{
  const r=calculate(plan({principal:'12000',years:'10',rate:'0',extra:'1800'}));
  assert.equal(r.months.length,48);assert.equal(r.rows.length,4);close(r.totalInterest,0);close(r.totalPaid,12000);
  const one=calculate(plan({lumpSum:'9999999',extra:'9999999'}));
  assert.equal(one.months.length,12);assert.equal(one.rows.length,1);close(one.rows[0].closing,0);close(one.rows[0].principal+one.rows[0].extra+one.rows[0].lumpSum,300000);
});
test('growth starts in second year and explicit zero override works',()=>{
  const r=calculate(plan({taxes:'1000',insurance:'500',modificationsEnabled:true,modifications:[{...emptyModification(),year:'2025',taxes:'0',insurance:'0'}]}));
  close(r.rows[0].taxes,1000);close(r.rows[1].taxes,1030);close(r.rows[1].insurance,515);close(r.rows[2].taxes,0);close(r.rows[3].taxes,0);
});
test('refinance uses opening balance and new term; no refinance preserves payment',()=>{
  const change={...emptyModification(),year:'2028',years:'15',rate:'4',refinance:true};
  const r=calculate(plan({modificationsEnabled:true,modifications:[change]}));
  close(r.months[60].payment,payment(r.months[59].closing,.04/12,180));assert.equal(r.months.length,240);assert.equal(r.rows.length,20);
  const n=calculate(plan({modificationsEnabled:true,modifications:[{...change,refinance:false}]}));
  close(n.months[60].payment,n.months[0].payment);
});
test('five-year monthly loan is 60 payments, refinance to another five years is 72',()=>{
  const initial=plan({startYear:'2026',years:'5',principal:'1000',rate:'5.5'});
  const original=calculate(initial);assert.equal(original.paymentCount,60);assert.equal(original.payoffYear,2030);assert.equal(original.payoffMonth,12);
  const r=calculate({...initial,modificationsEnabled:true,modifications:[{...emptyModification(),year:'2027',years:'5',rate:'3',refinance:true}]});
  assert.equal(r.paymentCount,72);assert.equal(r.payoffYear,2031);assert.equal(r.payoffMonth,12);
  close(r.months[12].payment,payment(r.months[11].closing,.03/12,60));
});
test('first payment month, partial years and final payment are correct',()=>{
  const r=calculate(plan({startYear:'2026',startMonth:'10',years:'1',rate:'0',principal:'1200',taxes:'120',insurance:'60'}));
  assert.equal(r.months[0].period,'2026-10');assert.equal(r.months.at(-1).period,'2027-09');assert.equal(r.paymentCount,12);assert.equal(r.payoffMonth,9);
  close(r.rows[0].taxes,30);close(r.rows[0].insurance,15);close(r.rows[1].taxes,92.7);
  const early=calculate(plan({principal:'2500',years:'2',rate:'0',extra:'1200'}));
  assert.equal(early.paymentCount,13);close(early.months.at(-1).payment,50);close(early.months.at(-1).closing,0);
  close(early.totalPaid,2500);
});
test('every total payment is principal and interest plus escrow and extras',()=>{
  const r=calculate(plan({years:'2',taxes:'300',insurance:'100',extra:'1000',lumpSum:'500'}));
  for(const row of [...r.months,...r.rows])close(row.total,row.payment+row.taxes+row.insurance+row.extra+row.lumpSum);
  assert.equal(r.months[0].extra,0);assert.equal(r.months[0].lumpSum,0);
  close(r.months[11].extra,1000);close(r.months[11].lumpSum,500);
  close(r.totalPaid,r.months.reduce((s,row)=>s+row.total,0));
});
test('disabled modifications are retained but not applied',()=>{
  const r=calculate(plan({modifications:[{...emptyModification(),year:'invalid'}]}));assert.equal(r.errors.length,0);assert.equal(r.rows.length,30);
});
test('missing, invalid, and duplicate inputs are exposed',()=>{
  assert.equal(calculate(emptyPlan()).errors.length,4);
  for(const patch of [{rate:'-1'},{years:'0'},{years:'1.5'},{startMonth:'13'},{principal:'NaN'},{extra:'-2'},{taxGrowth:'101'}])assert.ok(calculate(plan(patch)).errors.length);
  assert.ok(calculate(plan({modificationsEnabled:true,modifications:[{...emptyModification(),year:'2024'},{...emptyModification(),year:'2024'}]})).errors.some(e=>e.includes('one modification')));
});
test('payoff horizon, negative amortization, unused changes',()=>{
  const r=calculate(plan({modificationsEnabled:true,modifications:[{...emptyModification(),year:'2024',rate:'100'}]}));
  assert.equal(r.paidOff,false);assert.equal(r.rows.length,100);assert.equal(r.warnings.length,2);
  assert.equal(r.months.length,1200);
  const early=calculate(plan({extra:'9999999',modificationsEnabled:true,modifications:[{...emptyModification(),year:'2024'}]}));assert.ok(early.warnings.some(w=>w.includes('after payoff')));
});
test('existing saved inputs gain January without losing any entries',()=>{
  const old=plan({startYear:'2026',years:'5',principal:'1000',rate:'5.5',modificationsEnabled:true,modifications:[{...emptyModification(),year:'2027',years:'5',rate:'3',refinance:true}]});
  delete old.startMonth;
  const storage={getItem:()=>JSON.stringify({version:1,inputs:old})};
  const loaded=loadPlan(storage);assert.equal(loaded.status,'loaded');assert.equal(loaded.plan.startMonth,'1');
  for(const [key,value] of Object.entries(old))assert.deepEqual(loaded.plan[key],value);
  assert.equal(calculate(loaded.plan).paymentCount,72);
});
test('saved inputs survive reload; clear removes only this app key',()=>{
  const values=new Map([['another-app','keep']]);const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const input=plan({modificationsEnabled:true,view:'monthly',modifications:[{...emptyModification(),year:'2027',taxes:'0',refinance:true}]});
  assert.equal(savePlan(storage,input),true);assert.deepEqual(loadPlan(storage).plan,input);
  assert.equal(clearPlan(storage),true);assert.deepEqual(loadPlan(storage).plan,emptyPlan());assert.equal(values.get('another-app'),'keep');
  values.set(SETTINGS.storageKey,'invalid json');assert.equal(loadPlan(storage).status,'unavailable');
});
test('storage failures and unknown saved schema do not crash',()=>{
  const blocked={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};
  assert.equal(loadPlan(blocked).status,'unavailable');assert.equal(savePlan(blocked,plan()),false);assert.equal(clearPlan(blocked),false);
  assert.equal(loadPlan({getItem:()=>'{"version":2,"inputs":{}}'}).status,'unavailable');
});
