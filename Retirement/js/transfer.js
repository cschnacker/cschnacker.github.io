import {newBond,newAnnuity,calculateAnnuity} from './fixed-income.js';
import {validatePlan,newAccount,newHolding,uid} from './model.js';
export function exportModule(plan,kind){validatePlan(plan);const payload=kind==='household'?{settings:plan.settings}:{accounts:plan.accounts,holdings:plan.holdings,bonds:plan.bonds||[],annuities:plan.annuities||[]};return JSON.stringify({format:'sss-retirement-module',schemaVersion:1,kind,payload},null,2);}
export function importModule(plan,text){if(text.length>10000000)throw Error('File exceeds 10 MB.');const m=JSON.parse(text);if(m.format!=='sss-retirement-module'||m.schemaVersion!==1||!['household','investments'].includes(m.kind))throw Error('Unsupported module file.');const next=structuredClone(plan);if(m.kind==='household')next.settings=m.payload.settings;else {next.accounts=m.payload.accounts;next.holdings=m.payload.holdings;next.bonds=m.payload.bonds||[];next.annuities=m.payload.annuities||[];}return validatePlan(next);}
export function importStocks(plan,text){if(text.length>10000000)throw Error('File exceeds 10 MB.');const p=JSON.parse(text);if(p.schemaVersion!==1||!p.settings||!Array.isArray(p.holdings)||!Array.isArray(p.accounts))throw Error('Choose a Investment Finance Planner backup.');const next=structuredClone(plan),map=new Map();
 const convertType=x=>x.taxType==='Roth'?'Roth IRA':x.taxType==='Traditional retirement'?'Traditional IRA':'Taxable';
 for(const a of p.accounts){if(!['manual','holdings','mixed'].includes(a.valuationMode))throw Error('Unsupported stock account valuation.');const account={...newAccount(),id:uid(),name:a.name,type:convertType(a),owner:a.owner==='Spouse'?'Spouse':'Primary',mode:a.valuationMode==='holdings'?'holdings':'balance',balance:a.price,basis:a.basis||0,growth:a.growth||0};map.set(a.id,account.id);next.accounts.push(account);}
 for(const h of p.holdings){let accountId=map.get(h.accountId);if(h.accountId&&!accountId)throw Error('Stock holding references a missing account.');if(!accountId){const a={...newAccount(),name:h.account||h.name,type:convertType(h),owner:h.owner==='Spouse'?'Spouse':'Primary',mode:'holdings'};accountId=a.id;next.accounts.push(a);}const dollar=h.valuationMode==='dollars'||h.valuationMode==='balance';next.holdings.push({...newHolding(accountId),symbol:h.symbol||'',name:h.name,type:h.type,shares:dollar?1:h.shares,price:dollar?h.balance:h.price,basis:h.basis||0,growth:h.growth||0,yield:h.yield||0});}

 for(const [key,make] of [['bonds',newBond],['annuities',newAnnuity]]){
  if(p[key]!==undefined&&!Array.isArray(p[key]))throw Error('Invalid Investment Finance Planner '+key+'.');
  next[key]??=[];
  for(const source of p[key]||[]){
   if(source.accountId&&!map.has(source.accountId))throw Error('Fixed-income investment references a missing stock account.');
   const value={...make(next.settings.startYear),...source,id:uid(),accountId:map.get(source.accountId)||'',federalPercent:source.federalPercent??(source.type==='Municipal bond'?0:100),statePercent:source.statePercent??(source.type==='Treasury'?0:100)};
   next[key].push(key==='annuities'?calculateAnnuity(value):value);
  }
 }
 return validatePlan(next);
}
