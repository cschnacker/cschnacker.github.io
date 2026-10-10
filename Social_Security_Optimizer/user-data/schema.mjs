export function currentPlanYear(){return Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric'}).format(new Date()));}
export function defaults(year=2026) {
 const person=()=>({method:'salary',age:'',lifeAge:95,claimAge:67,annualBenefit:'',working:true,stopAge:67,salary:'',salaryAge:'',salaryGrowth:3,workStartAge:18,pension:false,pensionAge:65,pensionAnnual:0,pensionGrowth:0,monthly67:'',monthly70:'',dollarYear:year,birthMonth:'',birthDay:'',history:'',lastWorkMonth:'',lastWorkYear:''});
 return {schemaVersion:2,startYear:year,hasSpouse:false,benefitMode:'salary',futureCola:2.5,wageGrowth:3,primary:person(),spouse:{...person(),method:'spousal',working:false}};
}
export function cleanInputs(raw,year=2026){
 if(!raw||![1,2].includes(raw.schemaVersion))throw new Error('This plan file has an unsupported format.');
 const result=defaults(year);
 for(const key of ['startYear','hasSpouse','benefitMode','futureCola','wageGrowth'])if(Object.hasOwn(raw,key))result[key]=raw[key];
 for(const person of ['primary','spouse']) for(const key of Object.keys(result[person])) if(raw[person]&&Object.hasOwn(raw[person],key))result[person][key]=raw[person][key];
 if(raw.schemaVersion===1)for(const person of ['primary','spouse']){result[person].method=raw.benefitMode==='statement'?'annual':'salary';result[person].salaryAge=raw[person]?.working?raw[person]?.age:raw[person]?.stopAge;}
 if(typeof result.hasSpouse!=='boolean')throw new Error('Invalid plan settings.');
 for(const key of ['startYear','futureCola','wageGrowth'])if(!(result[key]===''||typeof result[key]==='number'&&Number.isFinite(result[key])))throw new Error('Invalid numeric setting.');
 for(const person of ['primary','spouse'])for(const [key,value]of Object.entries(result[person])){
  if(key==='method'){if(!['salary','history','ssa','annual','spousal'].includes(value)||(person==='primary'&&value==='spousal'))throw Error('Invalid benefit method.');}
  else if(key==='history'){if(typeof value!=='string'||value.length>50000)throw Error('Invalid earnings record.');}
  else if(['working','pension'].includes(key)){if(typeof value!=='boolean')throw new Error('Invalid option.');}
  else if(!(value===''||typeof value==='number'&&Number.isFinite(value)))throw new Error('Invalid numeric input.');
 }
 return result;
}
export function validate(p){
 const errors=[];const range=(v,min,max,label)=>{if(v===''||!Number.isFinite(v)||v<min||v>max)errors.push(`${label}: enter a number from ${min} to ${max}.`);};
 range(p.startYear,2026,2070,'Plan year');range(p.futureCola,0,15,'Future COLA');range(p.wageGrowth,0,10,'Projected wage-index growth');
 for(const key of p.hasSpouse?['primary','spouse']:['primary']){const s=p[key],name=key==='primary'?'You':'Spouse';
  range(s.age,18,95,`${name} / age on December 31`);range(s.lifeAge,Number(s.age),110,`${name} / planning through age`);range(s.claimAge,62,70,`${name} / claiming age`);
  for(const field of ['age','lifeAge','claimAge'])if(s[field]!==''&&!Number.isInteger(s[field]))errors.push(`${name} / ${field} must be a whole number.`);
  if(s.method==='annual')range(s.annualBenefit,0,1000000,`${name} / annual benefit at full retirement age`);
  if(s.method==='ssa'){
   range(s.monthly67,1,100000,`${name} / monthly SSA estimate at 67`);
   if(key==='primary'||s.monthly70!=='')range(s.monthly70,1,100000,`${name} / monthly SSA estimate at 70`);
   range(s.dollarYear,2020,2070,`${name} / estimate dollar year`);range(s.birthMonth,1,12,`${name} / birthday month`);range(s.birthDay,1,new Date(p.startYear-s.age,s.birthMonth,0).getDate(),`${name} / birthday day`);
   for(const field of ['dollarYear','birthMonth','birthDay'])if(s[field]!==''&&!Number.isInteger(s[field]))errors.push(`${name} / ${field} must be a whole number.`);
   if(![67,70].includes(s.claimAge))errors.push(`${name}: SSA-entry mode compares the entered age-67 and age-70 estimates.`);
   if(s.lastWorkMonth!=='')range(s.lastWorkMonth,1,12,`${name} / last worked month`);if(s.lastWorkYear!=='')range(s.lastWorkYear,1937,2070,`${name} / last worked year`);
  }
  if(s.method==='salary'||s.method==='history'&&s.working&&s.salary!==''){
   range(s.salary,0,10000000,`${name} / Social Security-taxed earnings`);range(s.salaryAge,18,100,`${name} / age in earnings year`);range(s.stopAge,18,100,`${name} / stop-work age`);range(s.salaryGrowth,0,20,`${name} / annual earnings growth`);
   if(s.method==='salary'&&Number.isFinite(s.salary)&&s.salary%1000!==0)errors.push(`${name}: quick earnings use $1,000 increments; use earnings history for exact amounts.`);
   for(const field of ['salaryAge','stopAge'])if(s[field]!==''&&!Number.isInteger(s[field]))errors.push(`${name} / ${field} must be a whole number.`);
  }
  if(s.method==='history'&&!s.history.trim())errors.push(`${name}: enter or paste your Social Security-taxed earnings history.`);
  if(s.pension){range(s.pensionAge,18,100,`${name} / pension start age`);range(s.pensionAnnual,0,10000000,`${name} / annual pension`);range(s.pensionGrowth,0,15,`${name} / pension increase`);}
 }
 return errors;
}
