import {accountPosition} from './account-valuation.js';
import {createFixedIncome} from './fixed-income.js';
// Pure annual planning model. No storage, network requests, or interface code.
export function sharesFromValue(value,price){if(!Number.isFinite(value)||value<0||!Number.isFinite(price)||price<=0)throw Error('Enter an investment value and a share price greater than zero.');return value/price;}
export const startingHoldingValue=h=>h.valuationMode==='dollars'?h.balance:h.shares*h.price;
export function valuationHoldings(plan){const accounts=plan.accounts||[],included=h=>!h.accountId||accounts.find(a=>a.id===h.accountId)?.valuationMode!=='manual';return [...plan.holdings.filter(included).map(h=>h.valuationMode==='dollars'?{...h,shares:1,price:h.balance}:h),...accounts.filter(a=>['manual','mixed'].includes(a.valuationMode)).map(a=>({...accountPosition(plan,a),retirementEligible:a.valuationMode==='mixed'||!(plan.otherInvestments||[]).some(h=>h.accountId===a.id)})),...(plan.otherInvestments||[]).filter(included).map(h=>({...h,symbol:'',type:'Other',taxType:'Taxable',shares:1,price:h.value,basis:0,yield:h.incomeRate,reinvest:h.reinvest,contributionMode:h.contribution?'fixed':'none',primaryPct:0,spousePct:0,retirementEligible:false,account:accounts.find(a=>a.id===h.accountId)?.name||h.kind}))];}
export function project(plan,annual,includeTrades=true){
 const s=plan.settings, assets=valuationHoldings(plan).map(h=>({...h,value:h.shares*h.price,cost:h.basis}));
 let cash=s.cash,deflator=1,primary=s.primarySalary,spouse=s.spouseSalary;
 const rows=[],warnings=[],tradeResults=[],fixedIncome=createFixedIncome(plan);
 for(let i=0;i<s.years;i++){
  const year=s.startYear+i, assumptions=annual.years.find(x=>x.year===year)||annual.defaults;
  const opening=cash+assets.reduce((a,h)=>a+h.value,0)+fixedIncome.balance();let external=s.cashContribution,fees=0,income=0,growth=0,realized=0,salaryContributions=0;
  cash+=s.cashContribution;
  const purchases=fixedIncome.begin(year,cash,warnings);cash=purchases.cash;
  if(includeTrades)for(const t of plan.trades.filter(t=>t.year===year)){
   const h=assets.find(h=>h.id===t.holdingId);let error='';
   if(!h){const account=(plan.accounts||[]).find(a=>a.id===t.holdingId);if(account?.valuationMode==='holdings'){warnings.push(`${year}: ${account.name} — account balance is calculated from individual holdings. Trade a linked stock/fund, or switch the account to a manual total to trade the account balance.`);tradeResults.push({...t,status:'Trade individual holdings'});}else{const holding=plan.holdings.find(x=>x.id===t.holdingId),parent=(plan.accounts||[]).find(a=>a.id===holding?.accountId);warnings.push(`${year}: ${holding?.symbol||holding?.name||'Investment'} — individual trade excluded from manual-total account ${parent?.name||''}. Select the account itself to trade its total balance.`);tradeResults.push({...t,status:'Manual account total used'});}continue;}
   if(t.side==='buy'&&cash+1e-8<t.amount+t.fee)error='Insufficient cash';
   if(t.side==='sell'&&h.value+1e-8<t.amount)error='Sale exceeds holding value';
   if(error){warnings.push(`${year}: ${h.symbol||h.name} — ${error}. Trade skipped.`);tradeResults.push({...t,status:error});continue;}
   if(t.side==='buy'){cash-=t.amount+t.fee;h.value+=t.amount;h.cost+=t.amount+t.fee;}
   else{const basisSold=h.value? h.cost*t.amount/h.value:0;h.value=Math.max(0,h.value-t.amount);h.cost=Math.max(0,h.cost-basisSold);cash+=t.amount-t.fee;realized+=t.amount-t.fee-basisSold;}
   fees+=t.fee;tradeResults.push({...t,status:'Applied'});
  }
  const detail=[];
  for(const h of assets){
   const o=plan.overrides.find(o=>o.holdingId===h.id&&o.year===year)||{};
   const rate=o.growth??h.growth,dy=o.yield??h.yield;
   const start=h.value,dividend=start*dy/100,gain=start*rate/100;
   h.value+=gain;growth+=gain;income+=dividend;
   if(h.reinvest){h.value+=dividend;h.cost+=dividend;}else cash+=dividend;
   // Missing mode preserves older version-1 plans that could combine both sources.
   const mode=h.contributionMode??'both';
   const salary=['salary','both'].includes(mode)?(h.owner==='Spouse'||(s.primarySalaryEndYear!=null&&year>s.primarySalaryEndYear)?0:primary*h.primaryPct/100)+(h.owner==='Primary'||(s.spouseSalaryEndYear!=null&&year>s.spouseSalaryEndYear)?0:spouse*h.spousePct/100):0;
   salaryContributions+=salary;
   const fixed=['fixed','both'].includes(mode)?(o.contribution??h.contribution*Math.pow(1+h.contributionGrowth/100,i)):0;
   const requested=fixed+salary+(o.oneTime??0);
   const contribution=Math.max(-h.value,requested);
   if(requested<contribution)warnings.push(`${year}: ${h.symbol||h.name} — withdrawal limited to available value.`);
   if(contribution<0){const basisRemoved=h.value?h.cost*(-contribution)/h.value:0;h.cost=Math.max(0,h.cost-basisRemoved);}else h.cost+=contribution;
   h.value+=contribution;external+=contribution;
   detail.push({id:h.id,value:h.value,basis:h.cost,dividend,growth:gain,contribution,salaryContribution:salary});
  }
  const flows=fixedIncome.end(year,cash);cash=flows.cash;income+=flows.bondInterest+flows.annuityIncome;
  // Retirement spending leaves the plan at year end, cash first, then proportional assets.
  let retirementWithdrawal=0,retirementRequested=0,retirementCash=0,retirementSales=0;
  if(plan.modules?.retirement!==false&&s.retirement?.enabled&&year>=s.retirement.startYear){
   retirementRequested=s.retirement.mode==='dollars'?s.retirement.amount*Math.pow(1+(s.retirement.amountGrowth??0)/100,year-s.retirement.startYear):Math.max(0,opening)*s.retirement.rate/100;
   const saleable=assets.filter(h=>h.retirementEligible!==false),invested=saleable.reduce((sum,h)=>sum+h.value,0);
   retirementWithdrawal=Math.min(retirementRequested,Math.max(0,cash+invested));
   const fromCash=Math.min(Math.max(0,cash),retirementWithdrawal);cash-=fromCash;
   const fromAssets=retirementWithdrawal-fromCash;retirementCash=fromCash;
   const custom=s.retirement.allocationMode==='custom';
   for(const h of saleable){
    const weight=custom?(s.retirement.allocations||[]).find(a=>a.id===h.id)?.percent/100||0:invested>0?h.value/invested:0;
    const amount=Math.min(h.value,fromAssets*weight);
    if(amount>0){const fraction=amount/h.value;h.value-=amount;h.cost*=1-fraction;const d=detail.find(d=>d.id===h.id);d.value=h.value;d.basis=h.cost;d.retirementWithdrawal=amount;retirementSales+=amount;}
   }
   retirementWithdrawal=retirementCash+retirementSales;
   external-=retirementWithdrawal;
   if(retirementWithdrawal+1e-8<retirementRequested)warnings.push(`${year}: Retirement withdrawal limited to available value in the selected funding sources.`);
  }
  if(cash<0)warnings.push(`${year}: Cash is negative; reduce withdrawals or add funding.`);
  deflator*=1+assumptions.inflation/100;
  const total=cash+assets.reduce((a,h)=>a+h.value,0)+fixedIncome.balance();
  if(!Number.isFinite(total)||Math.abs(total)>1e100)throw Error('Projection is too large. Reduce rates or projection length.');
  rows.push({year,opening,cash,total,real:total/deflator,external,growth,income,fees,realized,salaryContributions,retirementWithdrawal,retirementRequested,retirementCash,retirementSales,retirementShortfall:Math.max(0,retirementRequested-retirementWithdrawal),bondBalance:fixedIncome.balance(),bondPurchases:purchases.bondPurchases,annuityPremiums:purchases.annuityPremiums,...flows,cash,detail});
  primary*=1+assumptions.salaryGrowth/100;spouse*=1+assumptions.salaryGrowth/100;
 }
 if(includeTrades)for(const t of plan.trades)if(t.year<s.startYear||t.year>=s.startYear+s.years){warnings.push(`${t.year}: Trade outside projection period.`);tradeResults.push({...t,status:'Outside plan'});}
 return {rows,warnings,tradeResults};
}
