import {validatePlan} from './model.mjs';
export function project(plan){
  validatePlan(plan);
  let inflation=plan.inflation;
  const wages=plan.incomes.map(i=>i.monthly),retirement=plan.incomes.map(i=>i.retirementMonthly),costs=plan.expenses.map(e=>e.monthly);
  const result=[];
  for(let t=0;t<plan.years;t++){
    const year=plan.startYear+t,changes=plan.changes.filter(c=>c.year===year);
    const rateChange=changes.find(c=>c.target==='inflation');if(rateChange)inflation=rateChange.value;
    const incomes=plan.incomes.map((i,k)=>{
      if(t){wages[k]*=1+i.growth/100;if(i.retirementYear!==null&&year>i.retirementYear)retirement[k]*=1+i.retirementGrowth/100;}
      else if(i.retirementYear!==null&&year>i.retirementYear)retirement[k]*=(1+i.retirementGrowth/100)**(year-i.retirementYear);
      for(const c of changes.filter(c=>c.target===i.id)){if(c.field==='monthly')wages[k]=c.value;else retirement[k]=c.value;}
      return k===1&&!plan.includeSpouse?0:i.retirementYear!==null&&year>=i.retirementYear?retirement[k]:wages[k];
    });
    const expenses=plan.expenses.map((e,k)=>{
      if(t&&year>e.startYear&&e.kind==='inflation')costs[k]*=1+(e.rate??inflation)/100;
      const change=changes.find(c=>c.target===e.id);if(change)costs[k]=change.value;
      return year<e.startYear||(e.endYear!==null&&year>e.endYear)?0:costs[k];
    });
    const income=incomes.reduce((a,b)=>a+b,0),expense=expenses.reduce((a,b)=>a+b,0);
    const row={year,primaryAge:plan.primaryAge===null?null:plan.primaryAge+t,spouseAge:plan.spouseAge===null?null:plan.spouseAge+t,income,expense,balance:income-expense,incomes,expenses};
    if(![income,expense,row.balance].every(Number.isFinite))throw Error('Projection exceeds the supported number range.');result.push(row);
  }
  return result;
}
