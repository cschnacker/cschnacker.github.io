/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
import {calculateAnnuity} from './fixed-income.js';
export function validateModules(p){
 const num=(v,label,min=0,max=1e12)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`Invalid ${label}.`);};
 const year=(v,label)=>{num(v,label,1900,2300);if(!Number.isInteger(v))throw Error(`Invalid ${label}.`);};
 const ids=new Set([...(p.holdings||[]),...(p.accounts||[])].map(x=>x.id));
 if(p.modules!==undefined){if(!p.modules||typeof p.modules!=='object'||Array.isArray(p.modules))throw Error('Invalid module selection.');for(const k of ['stocks','bonds','annuities','retirement'])if(typeof p.modules[k]!=='boolean')throw Error('Invalid module selection.');}
 if(p.modules?.other!==undefined&&typeof p.modules.other!=='boolean')throw Error('Invalid other-investment module selection.');
 for(const key of ['bonds','annuities','otherInvestments']){if(p[key]!==undefined&&(!Array.isArray(p[key])||p[key].length>10000))throw Error(`Invalid ${key}.`);for(const x of p[key]||[]){
  if(typeof x.id!=='string'||!x.id||ids.has(x.id))throw Error('Duplicate or invalid investment ID.');ids.add(x.id);
  if(typeof x.name!=='string'||!x.name.trim()||x.name.length>160)throw Error('Investment name is required.');
  if(!['Primary','Spouse','Both'].includes(x.owner)||(key!=='otherInvestments'&&typeof x.existing!=='boolean'))throw Error('Invalid investment owner or purchase status.');
  if(x.accountId&&!(p.accounts||[]).some(a=>a.id===x.accountId))throw Error('Investment references a missing account.');
  if(key==='bonds'){if(!['Bond','Treasury','CD','Municipal bond'].includes(x.type))throw Error('Invalid fixed-income type.');if(x.existing&&x.purchaseYear>p.settings.startYear)throw Error('An already-owned position must be purchased by the plan starting year.');num(x.principal,'principal',0);for(const k of ['primaryPct','spousePct'])if(x[k]!==undefined)num(x[k],k,0,100);num(x.rate,'interest rate',0,100);year(x.purchaseYear,'purchase year');year(x.maturityYear,'maturity year');if(x.maturityYear<x.purchaseYear)throw Error('Maturity cannot precede purchase.');if(x.sellYear!==null){year(x.sellYear,'sale year');if(x.sellYear<x.purchaseYear||x.sellYear>x.maturityYear)throw Error('Sale year must be between purchase and maturity.');}if(!x.existing&&x.purchaseYear<p.settings.startYear)throw Error('Past purchases must be marked already owned.');}
  else if(key==='otherInvestments'){if(!['Business','Home / property','Other'].includes(x.kind))throw Error('Invalid investment kind.');num(x.value,'net equity value');num(x.growth,'investment growth',-100,100);num(x.incomeRate,'cash income rate',0,100);num(x.contribution,'investment contribution',-1e12);num(x.contributionGrowth,'contribution growth',-100,100);if(typeof x.reinvest!=='boolean')throw Error('Invalid reinvestment setting.');}
  else{if(x.calculationMode!==undefined){const computed=calculateAnnuity(x);for(const k of ['upfrontPremium','annualPremium','monthlyIncome'])if(Math.abs(computed[k]-x[k])>Math.max(.000001,Math.abs(x[k])*1e-10))throw Error('Annuity calculated amounts do not match its inputs.');}for(const k of ['upfrontPremium','annualPremium','monthlyIncome'])num(x[k],k);num(x.incomeGrowth,'annuity income growth',-100,100);num(x.fundingRate,'annuity funding estimate rate',0,100);for(const k of ['fundingYear','incomeStartYear','incomeEndYear'])year(x[k],k);if(x.incomeEndYear<x.incomeStartYear||x.fundingYear>x.incomeStartYear)throw Error('Annuity funding must start no later than income; income end must follow start.');if(!x.existing&&x.fundingYear<p.settings.startYear)throw Error('Past annuity funding must be marked already owned.');if(!x.existing&&x.upfrontPremium===0&&x.annualPremium===0)throw Error('Enter annuity funding or mark the contract already owned.');if(!x.existing&&x.fundingYear===x.incomeStartYear&&x.upfrontPremium===0)throw Error('An immediate annuity needs an upfront premium.');}
 }}
}
