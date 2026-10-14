
// Fixed-income contracts adapted from Investment Finance Planner.
// Copyright (c) 2026 SchnackerSoftwareSolutions, LLC. All rights reserved.
export function newBond(year){return {id:crypto.randomUUID(),name:'',type:'Bond',owner:'Primary',accountId:'',existing:true,principal:0,rate:0,purchaseYear:year,maturityYear:year+5,sellYear:null,federalPercent:100,statePercent:100};}
export function newAnnuity(year){return {id:crypto.randomUUID(),name:'',owner:'Primary',accountId:'',existing:true,fundingYear:year,upfrontPremium:0,annualPremium:0,fundingRate:4,monthlyIncome:0,incomeGrowth:0,incomeStartYear:year,incomeEndYear:year+25,calculationMode:'quoted',premiumStyle:'upfront',federalPercent:100,statePercent:100};}
export function informational(plan,x){return !!x.accountId&&plan.accounts.find(a=>a.id===x.accountId)?.mode==='balance';}
export function initialBondValue(plan,accountId){return (plan.bonds||[]).filter(b=>b.existing&&b.maturityYear>=plan.settings.startYear&&(b.sellYear==null||b.sellYear>=plan.settings.startYear)&&!informational(plan,b)&&(accountId===undefined||b.accountId===accountId)).reduce((sum,b)=>sum+b.principal,0);}
export function validateFixed(plan){
 const ids=new Set([...plan.accounts,...plan.holdings].map(x=>x.id));
 const num=(v,k,min=0,max=1e12)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+k+'.');};
 const year=(v,k)=>{num(v,k,1900,2300);if(!Number.isInteger(v))throw Error(k+' must be a whole year.');};
 for(const key of ['bonds','annuities']){
  if(plan[key]!==undefined&&(!Array.isArray(plan[key])||plan[key].length>10000))throw Error('Invalid '+key+'.');
  for(const x of plan[key]||[]){
   if(typeof x.id!=='string'||!x.id||ids.has(x.id))throw Error('Duplicate or invalid fixed-income ID.');ids.add(x.id);
   if(typeof x.name!=='string'||!x.name.trim()||x.name.length>160)throw Error('Investment name is required.');
   if(!['Primary','Spouse','Both'].includes(x.owner)||typeof x.existing!=='boolean'||typeof x.accountId!=='string')throw Error('Invalid investment ownership.');
   if(x.accountId&&!plan.accounts.some(a=>a.id===x.accountId))throw Error('Fixed-income investment references a missing account.');
   for(const k of ['federalPercent','statePercent'])num(x[k],k,0,100);
   if(key==='bonds'){
    if(!['Bond','Treasury','CD','Municipal bond'].includes(x.type))throw Error('Invalid fixed-income type.');
    num(x.principal,'principal');num(x.rate,'interest rate',0,100);year(x.purchaseYear,'Purchase year');year(x.maturityYear,'Maturity year');
    if(x.maturityYear<x.purchaseYear)throw Error('Maturity cannot precede purchase.');
    if(x.sellYear!==null){year(x.sellYear,'Sale year');if(x.sellYear<x.purchaseYear||x.sellYear>x.maturityYear)throw Error('Sale must fall between purchase and maturity.');}
    if(x.existing&&x.purchaseYear>plan.settings.startYear)throw Error('An owned bond must be purchased by the plan start year.');
    if(!x.existing&&x.purchaseYear<plan.settings.startYear)throw Error('Past bond purchases must be marked already owned.');
   }else{
    for(const k of ['upfrontPremium','annualPremium','monthlyIncome'])num(x[k],k);
    num(x.fundingRate,'funding rate',0,100);num(x.incomeGrowth,'annuity income growth',-100,100);
    for(const k of ['fundingYear','incomeStartYear','incomeEndYear'])year(x[k],k);
    if(x.incomeEndYear<x.incomeStartYear||x.fundingYear>x.incomeStartYear)throw Error('Check annuity funding and income years.');
    if(!x.existing&&x.fundingYear<plan.settings.startYear)throw Error('Past funding must be marked already funded.');
    if(!x.existing&&!(x.upfrontPremium>0||x.annualPremium>0))throw Error('Enter a premium or mark the annuity already funded.');
    if(!x.existing&&x.fundingYear===x.incomeStartYear&&x.upfrontPremium===0)throw Error('Immediate income needs an upfront premium.');
    const computed=calculateAnnuity(x);for(const k of ['upfrontPremium','annualPremium','monthlyIncome'])if(Math.abs(computed[k]-x[k])>Math.max(.000001,Math.abs(x[k])*1e-10))throw Error('Annuity estimate does not match its inputs.');
   }
  }
 }
}
export function createFixedIncome(plan){
 const bonds=(plan.bonds||[]).map(b=>({...b,active:b.existing&&b.maturityYear>=plan.settings.startYear&&(b.sellYear==null||b.sellYear>=plan.settings.startYear),ended:false}));
 const annuities=(plan.annuities||[]).map(a=>({...a,active:a.existing,failed:false}));
 const included=x=>!informational(plan,x);
 const balance=id=>bonds.filter(b=>b.active&&included(b)&&(id===undefined||b.accountId===id)).reduce((s,b)=>s+b.principal,0);
 const futureCashCommitments=year=>{
 const bondPurchases=bonds.filter(b=>!b.accountId&&!b.existing&&!b.ended&&b.purchaseYear>year).reduce((v,b)=>v+b.principal,0);
 const annuityPremiums=annuities.filter(a=>!a.accountId&&!a.existing&&!a.failed).reduce((v,a)=>v+(a.fundingYear>year?a.upfrontPremium:0)+Math.max(0,a.incomeStartYear-Math.max(year+1,a.fundingYear))*a.annualPremium,0);
 return {bondPurchases,annuityPremiums,total:bondPurchases+annuityPremiums};
 };
 return {balance,futureCashCommitments,year(year,cash,accounts,warnings){
  const out={cash,cashBondPurchases:0,cashAnnuityPremiums:0,unfundedBondPurchases:0,unfundedAnnuityPremiums:0,bondPurchases:0,bondInterest:0,bondRedemptions:0,annuityPremiums:0,annuityIncome:0,householdIncome:0,householdBondInterest:0,householdAnnuityIncome:0,retainedIncome:0,federalIncome:0,stateIncome:0,taxExemptInterest:0,eitcInvestmentIncome:0,fundingGains:0};
  function account(x){return x.accountId?accounts.find(a=>a.id===x.accountId):null;}
  function spend(x,amount){const a=account(x),available=a?a.balance:out.cash;if(available+1e-8<amount)return false;if(a){if(a.type==='Taxable'){const basis=a.balance?Math.min(a.basis,a.balance)*amount/a.balance:0;a.basis-=basis;out.fundingGains+=amount-basis;}a.balance-=amount;}else out.cash-=amount;return true;}
  function receive(x,amount,principal=false){const a=account(x);if(a){a.balance+=amount;if(a.type==='Taxable')a.basis+=amount;if(!principal)out.retainedIncome+=amount;}else if(principal)out.cash+=amount;else out.householdIncome+=amount;
   if(!principal&&(!a||a.type==='Taxable')){out.federalIncome+=amount*x.federalPercent/100;out.stateIncome+=amount*x.statePercent/100;if(x.type){out.taxExemptInterest+=amount*(1-x.federalPercent/100);out.eitcInvestmentIncome+=amount;}}
  }
  for(const b of bonds){if(!included(b)||b.existing||b.purchaseYear!==year)continue;if(!spend(b,b.principal)){out.unfundedBondPurchases+=b.principal;warnings.add(year+': '+b.name+' purchase skipped: insufficient starting cash in its funding source.');b.ended=true;continue;}b.active=true;out.bondPurchases+=b.principal;if(!b.accountId)out.cashBondPurchases+=b.principal;}
  for(const a of annuities){if(!included(a)||a.existing||a.failed)continue;const premium=(year===a.fundingYear?a.upfrontPremium:0)+(year>=a.fundingYear&&year<a.incomeStartYear?a.annualPremium:0);if(!premium)continue;if(!spend(a,premium)){out.unfundedAnnuityPremiums+=premium;warnings.add(year+': '+a.name+' premium could not be funded; future contract income is excluded.');a.failed=true;a.active=false;continue;}out.annuityPremiums+=premium;if(!a.accountId)out.cashAnnuityPremiums+=premium;a.active=true;}
  for(const b of bonds){if(!included(b)||!b.active||b.ended)continue;const interest=b.principal*b.rate/100;out.bondInterest+=interest;if(!account(b))out.householdBondInterest+=interest;receive(b,interest);if(year>=Math.min(b.maturityYear,b.sellYear??b.maturityYear)){out.bondRedemptions+=b.principal;receive(b,b.principal,true);b.active=false;b.ended=true;}}
  for(const a of annuities){if(!included(a)||!a.active||a.failed||year<a.incomeStartYear||year>a.incomeEndYear)continue;const income=a.monthlyIncome*12*(1+a.incomeGrowth/100)**(year-a.incomeStartYear);out.annuityIncome+=income;if(!account(a))out.householdAnnuityIncome+=income;receive(a,income);}
  return out;
 }};
}

export function annuityFundingEstimate(a){const r=a.fundingRate/100,n=a.incomeEndYear-a.incomeStartYear+1,years=a.incomeStartYear-a.fundingYear,g=a.incomeGrowth/100;
 let capital=0;for(let i=0;i<n;i++)capital+=a.monthlyIncome*12*Math.pow(1+g,i)/Math.pow(1+r,i+1);
 const upfrontFuture=a.upfrontPremium*Math.pow(1+r,years),factor=r===0?years:((Math.pow(1+r,years)-1)/r)*(1+r);
 return {capital,annualPremium:factor>0?Math.max(0,(capital-upfrontFuture)/factor):0,upfrontNeeded:Math.max(0,capital/Math.pow(1+r,years)),immediate:years===0};
}
export function calculateAnnuity(a){
 const mode=a.calculationMode||'quoted',style=a.premiumStyle||'upfront',years=a.incomeStartYear-a.fundingYear;
 if(!['quoted','premium','income'].includes(mode)||!['upfront','annual'].includes(style))throw Error('Select an annuity calculation type.');
 if(!Number.isInteger(years)||years<0||a.incomeEndYear<a.incomeStartYear||a.incomeEndYear-a.incomeStartYear>400)throw Error('Check the annuity funding and income years.');
 if(mode==='quoted')return {...a};
 if(style==='annual'&&years===0)throw Error('Annual funding needs at least one year before income starts. Choose an upfront premium for an immediate annuity.');
 const v={...a};if(style==='upfront')v.annualPremium=0;
 if(mode==='premium'){const e=annuityFundingEstimate(v);if(style==='upfront')v.upfrontPremium=e.upfrontNeeded;else v.annualPremium=e.annualPremium;}
 else{const r=v.fundingRate/100,factor=r===0?years:((Math.pow(1+r,years)-1)/r)*(1+r),capital=v.upfrontPremium*Math.pow(1+r,years)+v.annualPremium*factor,unit=annuityFundingEstimate({...v,monthlyIncome:1}).capital;v.monthlyIncome=unit>0?capital/unit:0;}
 if([v.upfrontPremium,v.annualPremium,v.monthlyIncome].some(x=>!Number.isFinite(x)||x<0||x>1e12))throw Error('Estimate is too large. Check the amounts, years and rates.');
 return v;
}
