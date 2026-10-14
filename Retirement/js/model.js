import {validateFixed,initialBondValue} from './fixed-income.js';
export const VERSION=1;
export const uid=()=>crypto.randomUUID();
export const accountTypes=['401(k)','Traditional IRA','Roth 401(k)','Roth IRA','403(b)','457(b)','Taxable'];
export const taxType=a=>a.type.startsWith('Roth')?'Roth':a.type==='Taxable'?'Taxable':'Traditional';
export function emptyPlan(){return {schemaVersion:VERSION,application:'sss-retirement',settings:{name:'My retirement plan',cash:0,startYear:2026,years:35,primaryAge:55,spouseAge:53,married:false,primaryRetire:65,spouseRetire:65,primarySalary:0,spouseSalary:0,salaryGrowth:2,expenses:0,inflation:2.5,primarySS:0,spouseSS:0,primarySSAge:67,spouseSSAge:67,pension:0,pensionAge:65,spousePension:0,spousePensionAge:65,incomeGrowth:2,otherIncome:0,taxFreeIncome:0,filing:'Single',state:'Colorado',primarySeniorEligible:true,spouseSeniorEligible:true,seniorMagiAdjustment:0,federalAdjustment:0,stateDeduction:0,stateAdjustment:0,credits:0,gainsRate:15,iraDeduction:0,payrollRate:7.65,withdrawalMethod:'ordered',withdrawalShares:{Taxable:34,Traditional:33,Roth:33},withdrawalOrder:'Taxable,Traditional,Roth',oneOffConversions:[],conversionOwner:'Both',conversion:0,conversionStart:2026,conversionEnd:2030},accounts:[],holdings:[],bonds:[],annuities:[]};}
export function newAccount(){return {id:uid(),name:'',type:'401(k)',owner:'Primary',mode:'balance',balance:0,basis:0,growth:5,contribution:0,contributionGrowth:0,salaryPercent:0,employerMatch:0};}
export function newHolding(accountId){return {id:uid(),accountId,symbol:'',name:'',type:'Stock',shares:0,price:0,basis:0,growth:5,yield:0};}
export function num(v,label,min=0,max=1e12){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+label+'.');}
function str(v,label,max=160){if(typeof v!=='string'||v.length>max)throw Error('Invalid '+label+'.');}
export function validatePlan(p){
 if(!p||p.schemaVersion!==1||p.application!=='sss-retirement')throw Error('Choose a Retirement Planner database (version 1).');
 const s=p.settings;if(!s)throw Error('Missing settings.');str(s.name,'plan name');if(!s.name.trim())throw Error('Plan name is required.');
 for(const k of ['startYear','years','primaryAge','spouseAge','primaryRetire','spouseRetire','primarySSAge','spouseSSAge','pensionAge','conversionStart','conversionEnd']){num(s[k],k,0,2300);if(!Number.isInteger(s[k]))throw Error(k+' must be a whole number.');}
 num(s.startYear,'start year',2020,2200);num(s.years,'years',1,70);for(const k of ['primaryAge','spouseAge','primaryRetire','spouseRetire','primarySSAge','spouseSSAge','pensionAge'])num(s[k],k,18,120);
 for(const k of ['primarySalary','spouseSalary','expenses','primarySS','spouseSS','pension','otherIncome','taxFreeIncome','stateDeduction','credits','iraDeduction','conversion'])num(s[k],k);
 for(const k of ['primarySalaryGrowth','spouseSalaryGrowth'])if(s[k]!==undefined)num(s[k],k,-50,50);
 for(const k of ['salaryGrowth','inflation','incomeGrowth'])num(s[k],k,-50,50);
 for(const k of ['federalAdjustment','stateAdjustment'])num(s[k],k,-1e12);
 for(const k of ['gainsRate','payrollRate'])num(s[k],k,0,100);
 if(typeof s.married!=='boolean'||!['Single','Joint','Separate','HoH'].includes(s.filing))throw Error('Invalid household settings.');str(s.state,'state');
 if(!['ordered','proportional'].includes(s.withdrawalMethod??'ordered'))throw Error('Invalid withdrawal method.');
 if(s.withdrawalShares!==undefined){for(const k of ['Taxable','Traditional','Roth'])num(s.withdrawalShares[k],k+' withdrawal share',0,100);if(Object.values(s.withdrawalShares).reduce((a,b)=>a+b,0)<=0)throw Error('At least one withdrawal share must be positive.');}
 if(!['Taxable,Traditional,Roth','Taxable,Roth,Traditional','Traditional,Taxable,Roth','Traditional,Roth,Taxable','Roth,Taxable,Traditional','Roth,Traditional,Taxable'].includes(s.withdrawalOrder))throw Error('Invalid withdrawal order.');
 for(const k of ['conversionSourceAccountId','conversionTargetAccountId'])if(s[k]!==undefined)str(s[k],'conversion account ID');
 if(!['Both','Primary','Spouse'].includes(s.conversionOwner??'Both'))throw Error('Invalid annual conversion owner.');
 for(const owner of ['Primary','Spouse']){
 const c=ownerConversion(s,owner);num(c.amount,owner+' conversion');
 for(const year of [c.start,c.end]){num(year,owner+' conversion year',2020,2300);if(!Number.isInteger(year))throw Error('Conversion year must be whole.');}
 if(c.end<c.start)throw Error(owner+' conversion end must follow its start.');
 str(c.sourceAccountId,'conversion source');str(c.targetAccountId,'conversion destination');
 }
 if(s.oneOffConversions!==undefined&&!Array.isArray(s.oneOffConversions))throw Error('Invalid one-off conversions.');
 for(const k of ['includeChildCredit','includeEarnedCredit','ctcEligible','eitcEligible','eitcSeparatedEligible'])if(s[k]!==undefined&&typeof s[k]!=='boolean')throw Error('Invalid family credit option.');
 for(const k of ['familyCreditMagiAdjustment','eitcOtherInvestmentIncome'])if(s[k]!==undefined)num(s[k],k,k==='familyCreditMagiAdjustment'?-1e12:0);
 if(s.creditChildren!==undefined){
 if(!Array.isArray(s.creditChildren)||s.creditChildren.length>100)throw Error('Invalid child list.');
 const childIds=new Set();
 for(const c of s.creditChildren){str(c.id,'child ID');if(!c.id||childIds.has(c.id))throw Error('Duplicate child ID.');childIds.add(c.id);str(c.name,'child label');if(!c.name.trim())throw Error('Child label is required.');
 for(const [k,min,max] of [['age',0,120],['lastYear',2020,2300],['studentThroughAge',0,23]]){num(c[k],k,min,max);if(!Number.isInteger(c[k]))throw Error('Child ages and years must be whole numbers.');}
 for(const k of ['ctcEligible','eitcEligible','disabled'])if(typeof c[k]!=='boolean')throw Error('Confirm child eligibility.');
 }}
 const conversionIds=new Set();
 if((s.oneOffConversions||[]).length>1000)throw Error('Too many one-off conversions.');
 for(const c of s.oneOffConversions||[]){str(c.id,'conversion ID');if(!c.id||conversionIds.has(c.id))throw Error('Duplicate conversion ID.');conversionIds.add(c.id);for(const k of ['sourceAccountId','targetAccountId'])if(c[k]!==undefined)str(c[k],'conversion account ID');str(c.name,'conversion description');num(c.year,'conversion year',2020,2300);if(!Number.isInteger(c.year))throw Error('Conversion year must be whole.');num(c.amount,'conversion amount');if(!['Primary','Spouse'].includes(c.owner))throw Error('Invalid conversion owner.');}
 if(s.conversionEnd<s.conversionStart)throw Error('Conversion end must follow its start.');
 if(!Array.isArray(p.accounts)||!Array.isArray(p.holdings)||p.accounts.length>1000||p.holdings.length>10000)throw Error('Invalid account database.');
 if(s.investmentAllocations!==undefined){if(!Array.isArray(s.investmentAllocations)||s.investmentAllocations.length>1000)throw Error('Invalid allocation list.');const seen=new Set();for(const a of s.investmentAllocations){str(a.accountId,'allocation account');num(a.percent,'allocation percent',0,100);if(a.accountId&&seen.has(a.accountId))throw Error('Select each account only once.');if(a.accountId)seen.add(a.accountId);}}
 if(s.investmentBudgetMode!==undefined&&!['legacy','dollars','percent'].includes(s.investmentBudgetMode))throw Error('Invalid investment budget type.');
 if(s.investmentPercentBasis!==undefined&&!['net','gross'].includes(s.investmentPercentBasis))throw Error('Invalid investment percentage basis.');
 if(s.investmentBudgetDollars!==undefined)num(s.investmentBudgetDollars,'investment budget');
 if(s.investmentBudgetPercent!==undefined)num(s.investmentBudgetPercent,'investment percentage',0,100);
 const ids=new Set();for(const a of p.accounts){if(a.budgetEntryMode!==undefined&&!['dollars','percent'].includes(a.budgetEntryMode))throw Error('Invalid planned contribution type.');if(a.investmentShare!==undefined)num(a.investmentShare,'investment allocation share',0,100);str(a.id,'account id');if(!a.id||ids.has(a.id))throw Error('Duplicate account ID.');ids.add(a.id);str(a.name,'account name');if(!a.name.trim())throw Error('Account name is required.');if(!accountTypes.includes(a.type)||!['Primary','Spouse'].includes(a.owner)||!['balance','holdings'].includes(a.mode))throw Error('Invalid account category.');for(const k of ['balance','basis','contribution','employerMatch'])num(a[k],k);num(a.growth,'growth',-100,100);num(a.contributionGrowth,'contribution growth',-100,100);num(a.salaryPercent,'salary percentage',0,100);}
 for(const a of p.accounts){
 const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 if(a.balanceAsOf!==undefined&&!dateOK(a.balanceAsOf))throw Error('Invalid balance date.');
 if(a.balanceHistory!==undefined){if(!Array.isArray(a.balanceHistory)||a.balanceHistory.length>10000)throw Error('Invalid balance history.');
 const seen=new Set();for(const h of a.balanceHistory){str(h.id,'history ID');if(!h.id||seen.has(h.id))throw Error('Duplicate history ID.');seen.add(h.id);if(!dateOK(h.date))throw Error('Invalid history date.');num(h.amount,'historical balance');str(h.note,'history note',500);if(typeof h.applied!=='boolean')throw Error('Invalid history application flag.');}}
 }
 const holdingIds=new Set();for(const h of p.holdings){str(h.id,'holding ID');if(!h.id||holdingIds.has(h.id))throw Error('Duplicate holding ID.');holdingIds.add(h.id);if(!ids.has(h.accountId))throw Error('Holding references a missing account.');str(h.name,'holding name');str(h.symbol,'symbol',24);if(!h.name.trim())throw Error('Holding name is required.');if(!['Stock','ETF','Mutual fund','Other'].includes(h.type))throw Error('Invalid investment type.');for(const k of ['shares','price','basis'])num(h[k],k);num(h.growth,'growth',-100,100);num(h.yield,'yield',0,100);}
 if(s.spousePension!==undefined)num(s.spousePension,'spouse pension');
 if(s.spousePensionAge!==undefined){num(s.spousePensionAge,'spouse pension start age',18,120);if(!Number.isInteger(s.spousePensionAge))throw Error('Spouse pension start age must be whole.');}
 for(const k of ['primarySeniorEligible','spouseSeniorEligible'])if(s[k]!==undefined&&typeof s[k]!=='boolean')throw Error('Invalid senior eligibility.');
 if(s.seniorMagiAdjustment!==undefined)num(s.seniorMagiAdjustment,'senior MAGI adjustment',-1e12);
 if(s.protectFuturePurchases!==undefined&&typeof s.protectFuturePurchases!=='boolean')throw Error('Invalid scheduled purchase protection.');
 if(s.cashTransfers!==undefined&&!Array.isArray(s.cashTransfers))throw Error('Invalid cash transfer schedule.');
 if((s.cashTransfers||[]).length>1000)throw Error('Too many cash transfers.');
 const transferIds=new Set();
 for(const t of s.cashTransfers||[]){str(t.id,'transfer ID');if(!t.id||transferIds.has(t.id))throw Error('Duplicate transfer ID.');transferIds.add(t.id);str(t.targetAccountId,'transfer destination');num(t.year,'transfer year',2020,2300);if(!Number.isInteger(t.year))throw Error('Transfer year must be whole.');num(t.amount,'transfer amount');}
 validateFixed(p);if(p.settings.cash!==undefined)num(p.settings.cash,'starting cash');
 return structuredClone(p);
}
export function accountValue(a,holdings){return a.mode==='balance'?a.balance:holdings.filter(h=>h.accountId===a.id).reduce((v,h)=>v+h.shares*h.price,0);}
export function portfolio(plan){return plan.accounts.reduce((v,a)=>v+accountValue(a,plan.holdings),0)+initialBondValue(plan);}
export function accountTotal(plan,a){return accountValue(a,plan.holdings)+initialBondValue(plan,a.id);}

// Read old owner-specific schedules without rewriting saved plans.
export function ownerConversion(s,owner){
 const prefix=owner.toLowerCase()+'Conversion',legacy=s.conversionOwner===owner;
 return {owner,name:owner+' annual conversion',amount:s[prefix]??(legacy?s.conversion:0),start:s[prefix+'Start']??(legacy?s.conversionStart:s.startYear),end:s[prefix+'End']??(legacy?s.conversionEnd:s.startYear+4),sourceAccountId:s[prefix+'SourceAccountId']??(legacy?s.conversionSourceAccountId||'':''),targetAccountId:s[prefix+'TargetAccountId']??(legacy?s.conversionTargetAccountId||'':'')};
}
