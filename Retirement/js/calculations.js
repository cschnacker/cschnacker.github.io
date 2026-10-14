import {familyCredits} from './family-credits.js';
import {payrollTaxes} from './payroll.js';
import {seniorDeductions} from './senior-deductions.js';
import {createFixedIncome} from './fixed-income.js';
import {validatePlan,accountValue,taxType,ownerConversion} from './model.js';
import {validateRetirement} from './annual.js';
export function taxableSS(benefits,otherIncome,filing,rules){const [lo,hi]=rules.ssThresholds[filing],p=otherIncome+benefits/2;return Math.max(0,Math.min(.85*benefits,p>hi?.85*(p-hi)+Math.min(.5*benefits,(hi-lo)/2):.5*Math.max(0,p-lo)));}
export function rmdAge(birthYear){return birthYear>=1960?75:birthYear>=1951?73:birthYear>=1949?72:70.5;}
export function project(plan,taxData,rules){
 validatePlan(plan);validateRetirement(rules);const engine=globalThis.TaxEngine.create(taxData),s=plan.settings;
 if(!engine.states.includes(s.state))throw Error('Choose a state supported by this tax release.');
 let accounts=plan.accounts.map(a=>{const hs=plan.holdings.filter(h=>h.accountId===a.id),balance=accountValue(a,hs);return {...a,balance,basis:a.mode==='holdings'?hs.reduce((v,h)=>v+h.basis,0):a.basis,growth:a.mode==='holdings'&&balance?hs.reduce((v,h)=>v+h.shares*h.price*(h.growth+h.yield),0)/balance:a.growth,dividendRate:a.mode==='holdings'&&balance?hs.reduce((v,h)=>v+h.shares*h.price*h.yield,0)/balance:0};});
 const rows=[],warnings=new Set(),fixed=createFixedIncome(plan);let cash=s.cash||0;
 warnings.add('Tax estimates use '+taxData.year+' brackets and '+rules.year+' retirement rules. The federal standard deduction grows from the retirement-rules year using plan inflation; federal and state bracket thresholds grow from the tax-data year using plan inflation. Rates stay fixed; indexing is a planning assumption, not a forecast of future law.');
 warnings.add('State tax uses the shared bracket tables with your state deduction inflated from the plan start year and your fixed adjustment. State retirement exclusions and credits are not calculated automatically.');
 warnings.add('Qualified Roth withdrawals are assumed. Early-withdrawal penalties, IRA eligibility phaseouts, NIIT, AMT, inherited accounts and special RMD tables are not modeled.');
 if((plan.bonds||[]).length||(plan.annuities||[]).length)warnings.add('Fixed-income purchases and premiums use starting cash or linked account liquid funds. Bonds redeem at par with a full year of interest. Annuity surrender value is excluded. Manual-total account links are informational to prevent double counting.');
 if(s.conversion||s.primaryConversion||s.spouseConversion||(s.oneOffConversions||[]).length)warnings.add('Conversions use the selected accounts, or account order when Automatic is selected. Source and destination must have the same owner. Conversion taxes are funded through the withdrawal plan.');
 if(!rules.ageAdditionalDeduction||!rules.enhancedSeniorDeduction)warnings.add('Loaded annual rules lack one or both senior deductions. Import current retirement rules or use shared data to enable them.');
 if(s.includeChildCredit||s.includeEarnedCredit)warnings.add('Family credits use your eligibility confirmations and child ages. Refundable credits are household cash in the modeled tax year, not taxable income; actual refunds usually arrive later. EITC is a formula estimate, not the IRS table. Only employee wages are supported; state credits, self-employment, foreign/combat income and other-dependent credits are not modeled. Add unmodeled investment income in Plan. Do not duplicate modeled credits in manual federal credits.');
 if(s.filing==='Separate')warnings.add('Separate filing assumes spouses lived together for Social Security taxation.');
 for(let n=0;n<s.years;n++){
  const year=s.startYear+n,primaryAge=s.primaryAge+n,spouseAge=s.spouseAge+n,start=accounts.reduce((v,a)=>v+a.balance,0)+cash+fixed.balance();
  const priorBalances=new Map(accounts.map(a=>[a.id,a.balance+fixed.balance(a.id)]));
  const flows=fixed.year(year,cash,accounts,warnings);cash=flows.cash;
  const salaryP=primaryAge<s.primaryRetire?s.primarySalary*(1+(s.primarySalaryGrowth??s.salaryGrowth)/100)**n:0,salaryS=s.married&&spouseAge<s.spouseRetire?s.spouseSalary*(1+(s.spouseSalaryGrowth??s.salaryGrowth)/100)**n:0,salary=salaryP+salaryS;
  const ssP=primaryAge>=s.primarySSAge?s.primarySS*(1+s.incomeGrowth/100)**Math.max(0,primaryAge-s.primarySSAge):0,ssS=s.married&&spouseAge>=s.spouseSSAge?s.spouseSS*(1+s.incomeGrowth/100)**Math.max(0,spouseAge-s.spouseSSAge):0,ss=ssP+ssS;
  const primaryPension=primaryAge>=s.pensionAge?s.pension*(1+s.incomeGrowth/100)**Math.max(0,primaryAge-s.pensionAge):0,spousePension=s.married&&spouseAge>=(s.spousePensionAge??65)?(s.spousePension||0)*(1+s.incomeGrowth/100)**Math.max(0,spouseAge-(s.spousePensionAge??65)):0,pension=primaryPension+spousePension,other=s.otherIncome*(1+s.incomeGrowth/100)**n,free=s.taxFreeIncome*(1+s.incomeGrowth/100)**n,expenses=s.expenses*(1+s.inflation/100)**n;
  const initialAccounts=structuredClone(accounts),initialCash=cash,weights=new Map(),baseFunding=new Map();
  const mode=s.investmentBudgetMode||'legacy';
  let legacyRequested=0;
  for(const a of accounts){
   const age=a.owner==='Spouse'?spouseAge:primaryAge,sal=a.owner==='Spouse'?salaryS:salaryP;
   const working=(a.owner!=='Spouse'||s.married)&&age<(a.owner==='Spouse'?s.spouseRetire:s.primaryRetire);
   const old=working?a.contribution*(1+a.contributionGrowth/100)**n+sal*a.salaryPercent/100:0;
   legacyRequested+=old;
   weights.set(a.id,old);
  }
  let totalWeight=[...weights.values()].reduce((a,b)=>a+b,0);
  function runYear(budget,trial=false){
   let accounts=structuredClone(initialAccounts),cash=initialCash;
   const warnings=new Set();
  let contributions=0,match=0,deduction=0,iraContributions=0,mandatory=0,conversion=0,dividends=0;
  const buckets={};
  accounts.forEach(a=>{const age=a.owner==='Spouse'?spouseAge:primaryAge,sal=a.owner==='Spouse'?salaryS:salaryP,active=a.owner!=='Spouse'||s.married;
   const prior=priorBalances.get(a.id);
   if(taxType(a)==='Traditional'&&age>=rmdAge(s.startYear-(a.owner==='Spouse'?s.spouseAge:s.primaryAge))){const amount=Math.min(a.balance,prior/rules.rmdFactors[Math.max(72,Math.min(120,age))]);a.balance-=amount;mandatory+=amount;if(amount+.01<prior/rules.rmdFactors[Math.max(72,Math.min(120,age))])warnings.add(year+': '+a.name+' lacks liquid funds to meet the modeled RMD. Schedule a bond sale or maturity.');}
   const working=active&&age<(a.owner==='Spouse'?s.spouseRetire:s.primaryRetire),c=working?(baseFunding.get(a.id)||0)+budget*(weights.get(a.id)||0)/(totalWeight||1):0,m=working?a.employerMatch:0;
   contributions+=c;match+=m;a.balance+=c+m;if(taxType(a)==='Taxable')a.basis+=c+m;
   if(taxType(a)==='Traditional'&&a.type!=='Traditional IRA')deduction+=c;
   if(a.type==='Traditional IRA')iraContributions+=c;
   const group=a.type.includes('IRA')?'ira':a.type==='457(b)'?'457':a.type==='Taxable'?'taxable':'workplace',key=a.owner+':'+group;buckets[key]=(buckets[key]||0)+c;
   if(group!=='taxable'){const limit=group==='ira'?rules.limits.ira+(age>=50?rules.limits.iraCatchUp:0):rules.limits.workplace+(age>=60&&age<=63?rules.limits.superCatchUp:age>=50?rules.limits.catchUp:0);if(buckets[key]>limit+.01)warnings.add(year+': '+a.owner+' '+group+' contributions exceed the '+rules.year+' reference limit. Contributions remain as entered.');}
   if(taxType(a)==='Taxable'){const d=Math.max(0,a.balance*a.dividendRate/100);dividends+=d;a.basis+=d;a.balance+=d;}
  });
  const conversionDetails=[],requests=[];
  if((s.conversionOwner??'Both')==='Both'&&year>=s.conversionStart&&year<=s.conversionEnd&&s.conversion>0)requests.push({name:'Annual conversion',owner:s.conversionOwner??'Both',amount:s.conversion,sourceAccountId:s.conversionSourceAccountId||'',targetAccountId:s.conversionTargetAccountId||''});
  for(const owner of ['Primary','Spouse']){const c=ownerConversion(s,owner);if(c.amount>0&&year>=c.start&&year<=c.end)requests.push(c);}
  requests.push(...(s.oneOffConversions||[]).filter(c=>c.year===year));
  for(const request of requests){
   let remaining=request.amount;const transfers=[];
   if(request.owner!=='Spouse'||s.married)for(const a of accounts.filter(a=>taxType(a)==='Traditional'&&(!request.sourceAccountId||a.id===request.sourceAccountId)&&(request.owner==='Both'||a.owner===request.owner)&&(a.owner!=='Spouse'||s.married))){
    const target=accounts.find(r=>taxType(r)==='Roth'&&r.owner===a.owner&&(!request.targetAccountId||r.id===request.targetAccountId));if(!target)continue;
    const amount=Math.min(a.balance,remaining);a.balance-=amount;target.balance+=amount;conversion+=amount;remaining-=amount;if(amount>0)transfers.push({sourceAccountId:a.id,targetAccountId:target.id,sourceName:a.name,targetName:target.name,amount});
   }
   conversionDetails.push({transfers,name:request.name,owner:request.owner,requested:request.amount,converted:request.amount-remaining,unfunded:remaining});
   if(remaining>.01)warnings.add(year+': '+request.name+' requested Roth conversion could not be fully funded; check selected accounts, available balances and matching owners. Missing or incompatible selected accounts are never replaced automatically.');
  }
  const income=salary+ss+pension+other+free+flows.householdIncome,base=salary+pension+other+flows.federalIncome-deduction-Math.min(s.iraDeduction,iraContributions);
  const bracketInflationFactor=(1+s.inflation/100)**Math.max(0,year-taxData.year),stateDeduction=s.stateDeduction*(1+s.inflation/100)**n;
  const standardDeduction=rules.standardDeduction[s.filing]*(1+s.inflation/100)**Math.max(0,year-rules.year);
  const {socialSecurityTax,medicareTax,additionalMedicareTax,payroll}=payrollTaxes(salaryP,salaryS,s.filing,year,s.inflation,rules);
  const baseAccounts=structuredClone(accounts),baseCash=cash;
  function simulate(extra){const work=structuredClone(baseAccounts);let need=extra,draw=0,traditional=mandatory,gains=flows.fundingGains,roth=0;const cashDraw=Math.min(baseCash,need);need-=cashDraw;
   function drawCategory(category,requested){
    let remaining=requested;
    for(const a of work.filter(a=>taxType(a)===category)){
     const amount=Math.min(a.balance,remaining);
     if(category==='Traditional')traditional+=amount;else if(category==='Roth')roth+=amount;else {const usedBasis=a.balance?Math.min(a.basis,a.balance)*amount/a.balance:0;gains+=Math.max(0,amount-usedBasis);a.basis=Math.max(0,a.basis-usedBasis);}
     a.balance-=amount;draw+=amount;remaining-=amount;need-=amount;
    }
   }
   if(s.withdrawalMethod==='proportional'){
    const shares=s.withdrawalShares||{Taxable:34,Traditional:33,Roth:33};
    for(let pass=0;pass<3&&need>.000001;pass++){
     const active=['Taxable','Traditional','Roth'].filter(k=>shares[k]>0&&work.some(a=>taxType(a)===k&&a.balance>.000001)),total=active.reduce((v,k)=>v+shares[k],0),roundNeed=need;
     if(!total)break;
     for(const category of active)drawCategory(category,roundNeed*shares[category]/total);
    }
   }else for(const category of s.withdrawalOrder.split(','))drawCategory(category,need);
   const ssTax=taxableSS(ss,base+traditional+conversion+dividends+gains+free+flows.taxExemptInterest,s.filing,rules),ordinary=base+traditional+conversion+dividends+ssTax;
   const seniorMagi=Math.max(0,ordinary+gains+(s.seniorMagiAdjustment||0));
   const {ageAdditionalDeduction,seniorDeduction}=seniorDeductions(s,rules,year,primaryAge,spouseAge,seniorMagi);
   const federalIncome=Math.max(0,ordinary-standardDeduction-ageAdditionalDeduction-seniorDeduction+s.federalAdjustment),stateIncome=Math.max(0,ordinary+gains+flows.stateIncome-flows.federalIncome-stateDeduction+s.stateAdjustment);
   const federalBeforeCredits=engine.calculate(federalIncome,s.filing,'Federal',undefined,bracketInflationFactor).total+gains*s.gainsRate/100,federalCreditsApplied=Math.min(federalBeforeCredits,s.credits);
   const credits=familyCredits(s,rules,{year,earned:salary-deduction,agi:ordinary+gains,investmentIncome:dividends+gains+(flows.eitcInvestmentIncome||0),tax:federalBeforeCredits-federalCreditsApplied,payroll,primaryAge,spouseAge});
   const federal=Math.max(0,federalBeforeCredits-federalCreditsApplied-credits.childTaxCredit),state=engine.calculate(stateIncome,s.filing,'State',s.state,bracketInflationFactor).total,taxes=federal+state+payroll;
   const available=income+credits.refundableCredits+mandatory+draw+cashDraw-contributions-taxes-expenses;
   return {...credits,federalCreditsApplied,work,available,draw:draw+mandatory,cashDraw,traditional,roth,seniorMagi,ageAdditionalDeduction,seniorDeduction,taxableDraw:draw-(traditional-mandatory)-roth,gains,federal,state,payroll,taxes,federalIncome,stateIncome,ssTax};
  }
  let result=simulate(0);if(!trial&&result.available<0){let lo=0,hi=baseAccounts.reduce((v,a)=>v+a.balance,0)+cash;result=simulate(hi);if(result.available>=0){for(let i=0;i<55;i++){const mid=(lo+hi)/2,r=simulate(mid);if(r.available<0)lo=mid;else hi=mid;}result=simulate(hi);}}
  for(const note of result.creditNotes)warnings.add(year+': '+note);
  accounts=result.work;cash=Math.max(0,cash-result.cashDraw+Math.max(0,result.available));let growth=dividends+flows.retainedIncome;
  accounts.forEach(a=>{const rate=a.growth-(taxType(a)==='Taxable'?a.dividendRate:0),change=a.balance*rate/100;a.balance=Math.max(0,a.balance+change);growth+=change;});
  const cashBeforeTransfers=cash,cashTransferDetails=[],futureCashCommitments=fixed.futureCashCommitments(year),cashReserveTarget=s.protectFuturePurchases===false?0:futureCashCommitments.total,cashReserved=Math.min(cash,cashReserveTarget),cashAvailableForTransfers=Math.max(0,cash-cashReserveTarget);let cashTransferred=0;
  for(const transfer of (s.cashTransfers||[]).filter(t=>t.year===year)){
   const target=accounts.find(a=>a.id===transfer.targetAccountId&&taxType(a)==='Taxable');
   const amount=target?Math.min(Math.max(0,cash-cashReserveTarget),transfer.amount):0;
   if(target){cash-=amount;target.balance+=amount;target.basis+=amount;cashTransferred+=amount;}
   cashTransferDetails.push({...transfer,targetName:target?.name||'Missing or non-taxable account',transferred:amount,unfunded:transfer.amount-amount});
   if(amount+.01<transfer.amount)warnings.add(year+': cash transfer partially funded or skipped; insufficient unreserved cash or invalid taxable destination.');
  }
  const traditional=accounts.filter(a=>taxType(a)==='Traditional').reduce((v,a)=>v+a.balance+fixed.balance(a.id),0),roth=accounts.filter(a=>taxType(a)==='Roth').reduce((v,a)=>v+a.balance+fixed.balance(a.id),0),taxable=accounts.filter(a=>taxType(a)==='Taxable').reduce((v,a)=>v+a.balance+fixed.balance(a.id),0)+fixed.balance(''),end=traditional+roth+taxable+cash;
  if(!Number.isFinite(end)||!Number.isFinite(result.taxes))throw Error('Projection exceeds numeric limits. Reduce growth assumptions or horizon.');
  const row={childTaxCredit:result.childTaxCredit,additionalChildTaxCredit:result.additionalChildTaxCredit,earnedIncomeCredit:result.earnedIncomeCredit,refundableCredits:result.refundableCredits,qualifyingCtcChildren:result.qualifyingCtcChildren,qualifyingEitcChildren:result.qualifyingEitcChildren,creditNotes:result.creditNotes,futureCashCommitments,cashReserveTarget,cashReserved,cashAvailableForTransfers,cashAvailableAfterTransfers:Math.max(0,cash-cashReserveTarget),cashBondPurchases:flows.cashBondPurchases,cashAnnuityPremiums:flows.cashAnnuityPremiums,unfundedBondPurchases:flows.unfundedBondPurchases,unfundedAnnuityPremiums:flows.unfundedAnnuityPremiums,bracketInflationFactor,stateDeduction,primarySalary:salaryP,spouseSalary:salaryS,pretaxWorkplaceContributions:deduction,eligibleIraDeduction:Math.min(s.iraDeduction,iraContributions),federalCreditsApplied:result.federalCreditsApplied,
investmentBalances:accounts.map(a=>({id:a.id,name:a.name,type:a.type,taxType:taxType(a),balance:a.balance})),
cashBeforeTransfers,cashTransferred,cashTransferDetails,householdBondInterest:flows.householdBondInterest,householdAnnuityIncome:flows.householdAnnuityIncome,cashSurplus:Math.max(0,result.available),bondPurchases:flows.bondPurchases,bondInterest:flows.bondInterest,bondRedemptions:flows.bondRedemptions,bondBalance:fixed.balance(),annuityPremiums:flows.annuityPremiums,annuityIncome:flows.annuityIncome,conversionDetails,year,primaryAge,spouseAge,start,salary,ss,primaryPension,spousePension,pension,other,free,income:income+result.refundableCredits,expenses,contributions,match,withdrawals:result.draw,traditionalDraw:result.traditional,rothDraw:result.roth,taxableDraw:result.taxableDraw,cashDraw:result.cashDraw,rmd:mandatory,conversion,federal:result.federal,state:result.state,socialSecurityTax,medicareTax,additionalMedicareTax,payroll,taxes:result.taxes,standardDeduction,ageAdditionalDeduction:result.ageAdditionalDeduction,seniorDeduction:result.seniorDeduction,seniorMagi:result.seniorMagi,taxableIncome:result.federalIncome,ssTax:result.ssTax,gains:result.gains,growth,shortfall:Math.max(0,-result.available),traditional,roth,taxable,cash,end,real:end/(1+s.inflation/100)**(n+1)};
  return {row,accounts,cash,warnings};
  }
  const baseline=runYear(0,true).row;
  function affordable(){
   const baseTotal=[...baseFunding.values()].reduce((a,b)=>a+b,0);
   const upper=Math.max(0,baseline.income-baseline.expenses-baseTotal);
   if(totalWeight<=0||upper<=0)return 0;
   let lo=0,hi=upper;
   for(let i=0;i<32;i++){const mid=(lo+hi)/2,r=runYear(mid,true).row;
    if(r.income-r.expenses-r.taxes-r.contributions>=0)lo=mid;else hi=mid;
   }
   return lo;
  }
  const baseCapacity=affordable(),baseAmount=Math.floor(Math.min(legacyRequested,baseCapacity)*100)/100;
  for(const a of accounts)baseFunding.set(a.id,baseAmount*(weights.get(a.id)||0)/(totalWeight||1));
  for(const a of accounts){
   const age=a.owner==='Spouse'?spouseAge:primaryAge;
   const working=(a.owner!=='Spouse'||s.married)&&age<(a.owner==='Spouse'?s.spouseRetire:s.primaryRetire);
   weights.set(a.id,working&&mode!=='legacy'?(s.investmentAllocations?s.investmentAllocations.find(x=>x.accountId===a.id)?.percent||0:(a.investmentShare??(taxType(a)==='Taxable'?1:0))):0);
  }
  totalWeight=[...weights.values()].reduce((a,b)=>a+b,0);
  const allocationTotal=s.investmentAllocations?.reduce((v,a)=>v+(a.accountId?a.percent:0),0);
  const overallocated=allocationTotal>100.000001;
  const allocationFraction=s.investmentAllocations?(overallocated?0:totalWeight/100):1;
  if(overallocated){for(const a of accounts)weights.set(a.id,0);totalWeight=0;warnings.add(year+': additional investment allocation exceeds 100%; additional investing is paused until corrected.');}
  const capacity=affordable();
  let requested=mode==='legacy'?0:mode==='dollars'?(s.investmentBudgetDollars||0)*allocationFraction:
   capacity*(s.investmentBudgetPercent||0)/100*allocationFraction;
  if(mode==='percent'&&capacity>0){
   let lo=0,hi=capacity;
   for(let i=0;i<32;i++){const mid=(lo+hi)/2,r=runYear(mid,true).row;
    const target=Math.max(0,r.income-r.expenses-r.taxes-baseAmount)*(s.investmentBudgetPercent||0)/100*allocationFraction;
    if(mid<=target)lo=mid;else hi=mid;
   }
   requested=lo;
  }
  const funded=Math.floor(Math.min(requested,capacity)*100)/100,final=runYear(funded);
  final.row.baseContributions=baseAmount;final.row.baseContributionRequest=legacyRequested;
  final.row.additionalInvestments=funded;final.row.investmentCapacity=capacity;final.row.investmentRequested=requested;
  final.row.investmentUnfunded=Math.max(0,requested-funded);
  final.row.investmentAllocation=accounts.map(a=>({id:a.id,name:a.name,taxType:taxType(a),amount:(baseFunding.get(a.id)||0)+funded*(weights.get(a.id)||0)/(totalWeight||1)}));
  if(legacyRequested>baseAmount+.01||requested>capacity+.01)warnings.add(year+': investment contribution reduced to income available after spending and projected taxes.');
  if(mode!=='legacy'&&!totalWeight)warnings.add(year+': no eligible additional-investment allocation. Set account shares and review retirement ages.');
  accounts=final.accounts;cash=final.cash;for(const warning of final.warnings)warnings.add(warning);
  rows.push(final.row);
 }
 return {rows,warnings:[...warnings]};
}

// Search only the primary retirement age; other assumptions and horizon stay fixed.
export function estimateRetirementAge(plan,taxData,rules){
 if(plan.settings.expenses<=0)return {age:null,reason:'Enter annual spending to estimate.'};
 const last=Math.min(120,plan.settings.primaryAge+plan.settings.years-1);
 for(let age=plan.settings.primaryAge;age<=last;age++){
  const trial=structuredClone(plan);trial.settings.primaryRetire=age;
  const result=project(trial,taxData,rules);
  const fundingFailure=result.warnings.some(w=>/purchase skipped|premium could not be funded|lacks liquid funds|could not be fully funded/.test(w));
  if(!fundingFailure&&result.rows.every(r=>r.shortfall<.01))return {age,year:plan.settings.startYear+age-plan.settings.primaryAge,reason:'No projected spending shortfall through '+(plan.settings.startYear+plan.settings.years-1)};
 }
 return {age:null,reason:'No funded retirement age within this horizon.'};
}
