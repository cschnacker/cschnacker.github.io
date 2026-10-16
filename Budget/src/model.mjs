export const FORMAT = 'SchnackerSoftwareSolutions.Budget';
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function createPlan(defaults, currentYear = new Date().getFullYear()) {
  return {schemaVersion:1,expenseCatalogVersion:1,id:uid(),name:'My household plan',defaultsRevision:defaults.revision,currency:defaults.currency,startYear:defaults.year,years:30,primaryAge:null,spouseAge:null,includeSpouse:false,inflation:defaults.defaultInflation,
    incomes:['Primary','Spouse'].map((name,i)=>({id:`income-${i}`,name,monthly:0,growth:defaults.defaultIncomeGrowth,retirementYear:currentYear,retirementMonthly:0,retirementGrowth:defaults.defaultIncomeGrowth})),
    expenses:[...defaults.fixedCategories.map(name=>({name,kind:'fixed'})),...defaults.inflationCategories.map(name=>({name,kind:'inflation'}))].map(e=>({...e,id:uid(),monthly:0,rate:null,startYear:currentYear,endYear:null})),changes:[]};
}
function number(v,min,max,label,nullable=false){if(nullable&&v===null)return;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`Invalid ${label}.`);}
function str(v,label){if(typeof v!=='string'||!v.trim()||v.length>160)throw Error(`Invalid ${label}.`);}
export function validatePlan(p){
  if(!p||p.schemaVersion!==1)throw Error('Unsupported plan version.');
  str(p.id,'plan ID');str(p.name,'plan name');str(p.defaultsRevision,'defaults revision');
  if(p.currency!=='USD')throw Error('This version supports USD plans.');
  number(p.startYear,1900,2200,'start year');number(p.years,1,100,'projection length');
  if(!Number.isInteger(p.startYear)||!Number.isInteger(p.years))throw Error('Years must be whole numbers.');
  number(p.primaryAge,0,120,'primary age',true);number(p.spouseAge,0,120,'spouse age',true);
  if(typeof p.includeSpouse!=='boolean')throw Error('Invalid spouse setting.');number(p.inflation,-99,100,'inflation');
  if(!Array.isArray(p.incomes)||p.incomes.length!==2||!Array.isArray(p.expenses)||p.expenses.length>200||!Array.isArray(p.changes)||p.changes.length>1000)throw Error('Invalid plan records.');
  if(p.expenseCatalogVersion===undefined){
    if(!p.expenses.some(e=>e.name==='Investment/Savings')){
      if(p.expenses.length>=200)throw Error('Remove an expense before adding the new Investment/Savings category.');
      p.expenses.push({id:uid(),name:'Investment/Savings',kind:'inflation',monthly:0,rate:null,startYear:new Date().getFullYear(),endYear:null});
    }
    p.expenseCatalogVersion=1;
  }
  const ids=new Set();
  for(const e of [...p.incomes,...p.expenses]){str(e.id,'record ID');if(ids.has(e.id))throw Error('Duplicate record ID.');ids.add(e.id);str(e.name,'record name');number(e.monthly,0,1e9,'monthly amount');}
  for(const e of p.incomes){number(e.growth,-99,100,'income growth');number(e.retirementGrowth,-99,100,'retirement growth');number(e.retirementMonthly,0,1e9,'retirement income');number(e.retirementYear,1900,2300,'retirement year',true);if(e.retirementYear!==null&&!Number.isInteger(e.retirementYear))throw Error('Retirement year must be whole.');}
  for(const e of p.expenses){if(e.name==='News')e.name='Newspaper';if(e.name==='Internet')e.name='Internet/Cable';if(e.startYear===undefined)e.startYear=p.startYear;number(e.startYear,1900,2300,'expense start year');if(!Number.isInteger(e.startYear))throw Error('Expense start year must be whole.');if(e.endYear!==null&&e.endYear<e.startYear)throw Error('Expense end year must be on or after its start year.');if(!['fixed','inflation'].includes(e.kind))throw Error('Invalid expense type.');number(e.rate,-99,100,'expense inflation',true);number(e.endYear,1900,2300,'end year',true);if(e.endYear!==null&&!Number.isInteger(e.endYear))throw Error('End year must be whole.');}
  const keys=new Set();
  for(const c of p.changes){str(c.id,'change ID');number(c.year,p.startYear,p.startYear+p.years-1,'change year');if(!Number.isInteger(c.year))throw Error('Change year must be whole.');if(!ids.has(c.target)&&c.target!=='inflation')throw Error('Unknown change target.');if(!['monthly','retirementMonthly','inflation'].includes(c.field)||(c.target==='inflation')!==(c.field==='inflation')||(c.field==='retirementMonthly'&&!p.incomes.some(i=>i.id===c.target)))throw Error('Invalid change field.');number(c.value,c.field==='inflation'?-99:0,c.field==='inflation'?100:1e9,'change value');const key=`${c.target}/${c.field}/${c.year}`;if(keys.has(key))throw Error('Duplicate change for the same field and year.');keys.add(key);}
  p.expenses=[...p.expenses.filter(e=>e.name!=='Miscellaneous'),...p.expenses.filter(e=>e.name==='Miscellaneous')];
  return p;
}
export function exportPlan(p){validatePlan(p);return JSON.stringify({format:FORMAT,version:1,exportedAt:new Date().toISOString(),plan:p},null,2);}
export function importPlan(text){if(text.length>2e6)throw Error('Backup exceeds 2 MB.');let v;try{v=JSON.parse(text);}catch{throw Error('This file is not valid JSON.');}if(v.format!==FORMAT||v.version!==1)throw Error('Choose a Budget Planner version 1 backup.');return validatePlan(v.plan);}
