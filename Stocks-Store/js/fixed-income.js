// Annual cash-flow schedules. Bond principal stays in wealth until redemption.
// Annuities are income contracts: surrender value is deliberately not estimated.
export function initialBondValue(plan){return (plan.bonds||[]).filter(b=>b.existing&&b.maturityYear>=plan.settings.startYear&&(b.sellYear==null||b.sellYear>=plan.settings.startYear)&&!informational(plan,b)).reduce((sum,b)=>sum+b.principal,0);}
export function informational(plan,item){return !!item.accountId&&(plan.accounts||[]).find(a=>a.id===item.accountId)?.valuationMode==='manual';}
export function createFixedIncome(plan){
 const bonds=(plan.bonds||[]).map(b=>({...b,active:b.existing&&b.maturityYear>=plan.settings.startYear&&(b.sellYear==null||b.sellYear>=plan.settings.startYear),ended:false}));
 const annuities=(plan.annuities||[]).map(a=>({...a,active:a.existing,failed:false}));
 return {
  balance:()=>bonds.filter(b=>b.active&&!informational(plan,b)).reduce((s,b)=>s+b.principal,0),
  begin(year,cash,warnings){let bondPurchases=0,annuityPremiums=0;
   for(const b of bonds){if(informational(plan,b)||b.existing||b.purchaseYear!==year)continue;if(cash+1e-8<b.principal){warnings.push(`${year}: ${b.name} — insufficient cash for bond purchase; purchase skipped.`);b.ended=true;continue;}cash-=b.principal;bondPurchases+=b.principal;b.active=true;}
   for(const a of annuities){if(informational(plan,a)||a.existing||a.failed)continue;const premium=(year===a.fundingYear?a.upfrontPremium:0)+(year>=a.fundingYear&&year<a.incomeStartYear?a.annualPremium:0);if(!premium)continue;if(cash+1e-8<premium){warnings.push(`${year}: ${a.name} — insufficient cash for annuity premium; contract income excluded until funding is corrected.`);a.failed=true;a.active=false;continue;}cash-=premium;annuityPremiums+=premium;a.active=true;}
   return {cash,bondPurchases,annuityPremiums};
  },
  end(year,cash){let bondInterest=0,bondRedemptions=0,annuityIncome=0;const bondDetails=[],annuityDetails=[];
   for(const b of bonds){if(!b.active||b.ended||informational(plan,b))continue;const interest=b.principal*b.rate/100;bondInterest+=interest;cash+=interest;const redeem=year>=Math.min(b.maturityYear,b.sellYear??b.maturityYear)?b.principal:0;if(redeem){cash+=redeem;bondRedemptions+=redeem;b.active=false;b.ended=true;}bondDetails.push({id:b.id,interest,redemption:redeem,balance:b.active?b.principal:0});}
   for(const a of annuities){if(!a.active||a.failed||informational(plan,a))continue;const income=year>=a.incomeStartYear&&year<=a.incomeEndYear?a.monthlyIncome*12*Math.pow(1+a.incomeGrowth/100,year-a.incomeStartYear):0;cash+=income;annuityIncome+=income;annuityDetails.push({id:a.id,income});}
   return {cash,bondInterest,bondRedemptions,annuityIncome,bondDetails,annuityDetails};
  }
 };
}
// Premiums occur at the beginning of each funding year; income at year end.
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
