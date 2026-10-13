export function salaryBudgets({year,index,settings:s,primarySalary,spouseSalary}){
 const part=(who,salary)=>{if(s[who+'SalaryEndYear']!=null&&year>s[who+'SalaryEndYear'])return 0;const mode=s[who+'InvestmentMode'];if(mode===undefined)return salary;if(mode==='none')return 0;if(mode==='dollars')return (s[who+'InvestmentAmount']||0)*Math.pow(1+(s[who+'InvestmentGrowth']||0)/100,index);return salary*(s[who+'InvestmentPercent']||0)/100;};
 return {primary:part('primary',primarySalary),spouse:part('spouse',spouseSalary)};
}
export function salaryFunding(holding,context){
 const {year,index,settings}=context,b=salaryBudgets(context),mode=holding.contributionMode??'both';let primary=0,spouse=0;
 if(['salary','both'].includes(mode)){primary=b.primary*(holding.primaryPct||0)/100;spouse=b.spouse*(holding.spousePct||0)/100;}
 if(mode==='salary-dollars'){const growth=Math.pow(1+(holding.contributionGrowth||0)/100,index);primary=(holding.primaryDollars||0)*growth;spouse=(holding.spouseDollars||0)*growth;}
 if(holding.owner==='Spouse'||(settings.primarySalaryEndYear!=null&&year>settings.primarySalaryEndYear))primary=0;
 if(holding.owner==='Primary'||(settings.spouseSalaryEndYear!=null&&year>settings.spouseSalaryEndYear))spouse=0;
 return primary+spouse;
}
export function budgetFields(s,field,select){return `<h2>1. Set your salary investment budget</h2><p class="muted">Choose how much of each salary to invest, then allocate that budget below. For example: invest 20% of salary, then allocate 50%, 25% and 25% to three investments. Existing plans initially use 100% of salary to preserve their saved contribution calculations; review the budget before changing it.</p>`+['primary','spouse'].map(w=>{const label=w==='primary'?'Primary':'Spouse';return `<fieldset><legend>${label} investment budget</legend><div class="grid-form">${select(w+'InvestmentMode',label+' budget type',[['none','No salary investment'],['percent','Percent of salary'],['dollars','Annual dollar amount']],s[w+'InvestmentMode']??'percent')}${field(w+'InvestmentPercent',label+' salary to invest (%)',s[w+'InvestmentPercent']??100,'number','required min="0" max="100"')}${field(w+'InvestmentAmount',label+' annual investment budget ($)',s[w+'InvestmentAmount']??0,'number','required min="0"')}${field(w+'InvestmentGrowth',label+' dollar budget growth (%)',s[w+'InvestmentGrowth']??0,'number','required min="-100" max="100"')}</div></fieldset>`;}).join('')+`<p class="muted">Percent budgets follow salary growth. Dollar budgets follow their own growth rate. Both stop after the contributor’s last working year. Unallocated budget is not added to the projection.</p>`;}
export function validateBudgetAllocations(p){
 const accounts=p.accounts||[],eligible=h=>!h.accountId||accounts.find(a=>a.id===h.accountId)?.valuationMode!=='manual',items=[...p.holdings.filter(eligible),...accounts.filter(a=>a.valuationMode!=='holdings'),...(p.bonds||[]).filter(eligible).map(b=>({...b,contributionMode:'salary'}))];
 for(const w of ['primary','spouse']){if(p.settings[w+'InvestmentMode']===undefined)continue;const total=items.filter(h=>h.owner!==(w==='primary'?'Spouse':'Primary')&&['salary','both'].includes(h.contributionMode??'both')).reduce((sum,h)=>sum+(h[w+'Pct']||0),0);if(total>100+1e-8)throw Error(`${w==='primary'?'Primary':'Spouse'} investment budget allocations total ${total}%. Reduce them to 100% or less.`);}
}
