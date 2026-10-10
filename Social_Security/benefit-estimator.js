import {auditCoveredEarnings} from './earnings-audit.js';

const roundDownTenth=value=>Math.floor(value*10+1e-8)/10;

export function fullRetirementMonths(birthYear){
  if(birthYear<=1937)return 65*12;
  if(birthYear<=1942)return 65*12+2*(birthYear-1937);
  if(birthYear<=1954)return 66*12;
  if(birthYear<=1959)return 66*12+2*(birthYear-1954);
  return 67*12;
}

export function claimFactor(birthYear,claimAge){
  const difference=claimAge*12-fullRetirementMonths(birthYear);
  if(difference<0){
    const early=-difference;
    return 1-Math.min(early,36)*5/900-Math.max(0,early-36)*5/1200;
  }
  // The standard 8% annual delayed-credit rate applies to births in 1943 or later.
  return 1+Math.min(difference,Math.max(0,70*12-fullRetirementMonths(birthYear)))*(birthYear>=1943?2/300:1/200);
}

function colaForYear(year,data,assumedColaPercent){
  const known=data.benefitCola?.[year];
  return Number.isFinite(known)?known:assumedColaPercent;
}

function piaForAime(aime,bendPoints){
  const [first,second]=bendPoints;
  return roundDownTenth(.9*Math.min(aime,first)+.32*Math.max(0,Math.min(aime,second)-first)+.15*Math.max(0,aime-second));
}

export function estimateWorkerBenefit({startYear,currentAge,endAge,claimAge,stopAge,salary,salaryAge,growthPercent,colaPercent,historyText='',useHistory=false,data,tables}){
  for(const [name,value] of Object.entries({startYear,currentAge,endAge,claimAge,stopAge,salaryAge}))if(!Number.isInteger(value))throw new Error(`${name} must be a whole number.`);
  if(startYear<2024||startYear>2070||currentAge<18||currentAge>95||endAge<currentAge||endAge>110)throw new Error('Review the plan year and ages.');
  if(claimAge<62||claimAge>70||stopAge<18||stopAge>100||salaryAge<18||salaryAge>100)throw new Error('Review the claiming, stop-work, and salary ages.');
  if(!Number.isFinite(salary)||salary<0||salary>10000000||!Number.isFinite(growthPercent)||growthPercent<0||growthPercent>20||!Number.isFinite(colaPercent)||colaPercent<0||colaPercent>15)throw new Error('Review salary, wage growth, and COLA.');
  if(useHistory&&!historyText.trim())throw new Error('Paste covered earnings before selecting the earnings-history option.');
  const birthYear=startYear-currentAge;
  const eligibilityYear=birthYear+62;
  const indexYear=birthYear+60;
  const claimYear=birthYear+claimAge;
  const stopYear=birthYear+stopAge;
  const salaryYear=birthYear+salaryAge;
  if(!Number.isFinite(tables.awi[indexYear])||!Number.isFinite(tables.awi[eligibilityYear-2]))throw new Error('Wage-index data is unavailable for these ages.');
  const audit=useHistory?auditCoveredEarnings(historyText,tables.caps):null;
  if(audit?.aboveMax.length)throw new Error(`Covered earnings exceed the annual Social Security limit in ${audit.aboveMax.map(x=>x.year).join(', ')}. Review the Social Security-taxed column.`);
  const actual=new Map(audit?.records.filter(x=>x.covered!==null).map(x=>[x.year,x.covered])||[]);
  const lastRecordedYear=actual.size?Math.max(...actual.keys()):null;
  const earnings=[];
  const lastYear=Math.min(claimYear-1,startYear+endAge-currentAge,2115);
  for(let year=Math.max(1951,birthYear+18);year<=lastYear;year++){
    const maximum=tables.caps[year];
    if(!Number.isFinite(maximum))throw new Error(`The annual Social Security limit is unavailable for ${year}.`);
    const isActual=actual.has(year);
    const canModel=year<=stopYear&&(!useHistory||year>lastRecordedYear);
    const raw=isActual?actual.get(year):canModel?salary*Math.pow(1+growthPercent/100,year-salaryYear):0;
    const covered=Math.min(maximum,Math.max(0,raw));
    const factor=year<indexYear?tables.awi[indexYear]/tables.awi[year]:1;
    earnings.push({year,covered,indexed:covered*factor,source:isActual?'recorded':canModel?'modeled':year>stopYear?'no work':'not supplied'});
  }
  const selected=[...earnings].sort((a,b)=>b.indexed-a.indexed).slice(0,35);
  const aime=Math.floor(selected.reduce((sum,row)=>sum+row.indexed,0)/420);
  const baseYear=data.model.benefitBaseYear;
  const baseIndex=tables.awi[baseYear-2];
  const bendPoints=data.model.bendPoints.map(x=>Math.round(x*tables.awi[eligibilityYear-2]/baseIndex));
  const pia=piaForAime(aime,bendPoints);
  const factor=claimFactor(birthYear,claimAge);
  function nominalBenefit(year,adjustment=factor){
    let amount=pia;
    for(let effectiveYear=eligibilityYear;effectiveYear<year;effectiveYear++)amount=roundDownTenth(amount*(1+colaForYear(effectiveYear,data,colaPercent)/100));
    return Math.floor(amount*adjustment);
  }
  const monthlyToday=eligibilityYear<=startYear
    ?nominalBenefit(startYear)
    :Math.floor(nominalBenefit(claimYear)/Math.pow(1+colaPercent/100,claimYear-startYear));
  const rows=[];
  for(let year=startYear;year<=startYear+endAge-currentAge;year++){
    const monthlyFuture=year>=claimYear?nominalBenefit(year):0;
    rows.push({year,age:currentAge+year-startYear,monthlyFuture,annualBenefits:monthlyFuture*12});
  }
  return {monthlyToday,monthlyAtClaim:nominalBenefit(claimYear),claimYear,claimFactor:factor,fullRetirementMonths:fullRetirementMonths(birthYear),fullMonthlyAt:year=>nominalBenefit(year,1),aime,bendPoints,pia,earnings,selectedYears:new Set(selected.map(x=>x.year)),recordedCount:earnings.filter(x=>x.source==='recorded').length,modeledCount:earnings.filter(x=>x.source==='modeled').length,rows};
}
