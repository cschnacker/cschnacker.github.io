import {parseCoveredEarnings} from '../user-data/earnings.mjs';
// Pure calculations: no DOM, storage, fetch, or embedded annually changing values.
// Ages are ages on December 31. SSA entries use birthdays; wage paths use full-year equivalents.
export const floorDime=v=>Math.floor((v+1e-8)*10)/10;
export function fullRetirementAge(birthYear){if(birthYear<=1937)return 65;if(birthYear<=1942)return 65+(birthYear-1937)*2/12;if(birthYear<=1954)return 66;if(birthYear<=1959)return 66+(birthYear-1954)*2/12;return 67;}
export function delayedCredit(birthYear){if(birthYear>=1943)return .08;if(birthYear>=1941)return .075;if(birthYear>=1939)return .07;if(birthYear>=1937)return .065;if(birthYear>=1935)return .06;if(birthYear>=1933)return .055;if(birthYear>=1931)return .05;if(birthYear>=1929)return .045;if(birthYear>=1927)return .04;if(birthYear>=1925)return .035;return .03;}
export function retirementFactor(claimAge,birthYear){const fra=fullRetirementAge(birthYear),months=Math.round((Math.min(70,claimAge)-fra)*12);return months<0?1-Math.min(-months,36)*5/900-Math.max(0,-months-36)*5/1200:1+months*delayedCredit(birthYear)/12;}
export function spousalFactor(age,birthYear){const months=Math.max(0,Math.round((fullRetirementAge(birthYear)-age)*12));return 1-Math.min(months,36)*25/3600-Math.max(0,months-36)*5/1200;}
export function projectedValue(table,year,growth){if(table[year]!==undefined)return table[year];const last=Math.max(...Object.keys(table).map(Number));if(year<Math.min(...Object.keys(table).map(Number)))throw Error(`Historical data unavailable for ${year}.`);return table[last]*(1+growth)**(year-last);}
export function bendPoints(year,data,growth){if(data.bendPoints[year])return data.bendPoints[year];const last=Math.max(...Object.keys(data.bendPoints).map(Number));if(year<1979)throw Error('Salary estimates require an eligibility year of 1979 or later.');const ratio=projectedValue(data.averageWageIndex,year-2,growth)/data.averageWageIndex[last-2];return data.bendPoints[last].map(n=>Math.round(n*ratio));}
export function piaFromAime(aime,bends){return floorDime(.9*Math.min(aime,bends[0])+.32*Math.max(0,Math.min(aime,bends[1])-bends[0])+.15*Math.max(0,aime-bends[1]));}
export function annualCola(pia,fromYear,toYear,data,futureCola){for(let y=fromYear;y<toYear;y++)pia=floorDime(pia*(1+(data.colaByEffectiveYear[y]??futureCola)));return pia;}
export function birthYear(person,plan){return plan.startYear-person.age-(person.method==='ssa'&&person.birthMonth===1&&person.birthDay===1?1:0);}
export function claimSerial(person,claim,plan){const birth=plan.startYear-person.age;return person.method==='ssa'?(birth+claim)*12+person.birthMonth-1-(person.birthDay===1?1:0):(birth+claim)*12;}
function fractionFrom(serial,year){return Math.max(0,Math.min(12,(year+1)*12-serial))/12;}
export function estimatePia(person,plan,data,throughYear=Infinity){
 if(person.method==='annual')return {pia:person.annualBenefit/12,baseYear:plan.startYear,aime:null,projected:false};
 if(person.method==='ssa')return {pia:person.monthly67/retirementFactor(67,birthYear(person,plan)),baseYear:person.dollarYear,aime:null,projected:false};
 if(person.method==='spousal')return {pia:0,baseYear:plan.startYear,aime:null,projected:false};
 const birth=plan.startYear-person.age,eligible=birth+62,indexYear=birth+60,growth=plan.wageGrowth/100;
 const useHistory=person.method==='history';const records=useHistory?parseCoveredEarnings(person.history,data.taxableMaximums):[];
 const actual=new Map(records.filter(r=>r.covered!==null).map(r=>[r.year,r.covered]));const lastRecorded=actual.size?Math.max(...actual.keys()):Infinity;
 const careerEnd=birth+person.stopAge,endYear=Math.min(Math.max(careerEnd,...actual.keys()),throughYear),reference=birth+(person.salaryAge===''?person.age:person.salaryAge),earnings=[];
 for(let y=Math.max(1951,birth+18);y<=endYear;y++){
  const canModel=y<=careerEnd&&(!useHistory||person.working&&person.salary!==''&&y>lastRecorded);
  const wage=actual.has(y)?actual.get(y):canModel?person.salary*(1+person.salaryGrowth/100)**(y-reference):0;
  const capped=Math.min(wage,projectedValue(data.taxableMaximums,y,growth));
  const indexed=y<indexYear?capped*projectedValue(data.averageWageIndex,indexYear,growth)/projectedValue(data.averageWageIndex,y,growth):capped;earnings.push(indexed);
 }
 const aime=Math.floor(earnings.sort((a,b)=>b-a).slice(0,35).reduce((a,b)=>a+b,0)/420);
 return{pia:piaFromAime(aime,bendPoints(eligible,data,growth)),baseYear:eligible,aime,projected:eligible>data.publishedYear||endYear>data.publishedYear};
}
function piaInYear(estimate,year,plan,data,person){if(person.method==='ssa')return estimate.pia*(1+plan.futureCola/100)**(year-estimate.baseYear);return year<estimate.baseYear?estimate.pia:annualCola(estimate.pia,estimate.baseYear,year,data,plan.futureCola/100);}
function ownIncome(s,age){return (s.method==='salary'||s.method==='history'&&s.working&&s.salary!=='')&&age<=s.stopAge?s.salary*(1+s.salaryGrowth/100)**(age-(s.salaryAge===''?s.age:s.salaryAge)):0;}
function pension(s,age){return s.pension&&age>=s.pensionAge?s.pensionAnnual*(1+s.pensionGrowth/100)**(age-s.pensionAge):0;}
export function scenario(plan,data,claims,estimates,cache){
 const people=plan.hasSpouse?[plan.primary,plan.spouse]:[plan.primary];const bases=estimates||people.map(p=>estimatePia(p,plan,data));
 const births=people.map(s=>birthYear(s,plan)),fras=births.map(fullRetirementAge),factors=people.map((s,i)=>retirementFactor(claims[i],births[i]));
 const years=Math.floor(Math.max(...people.map(s=>s.lifeAge-s.age)))+1;let total=0,totalIncome=0;const rows=[];
 for(let t=0;t<years;t++){
  const year=plan.startYear+t,ages=people.map(s=>s.age+t),alive=people.map((s,i)=>ages[i]<=s.lifeAge),pias=bases.map((b,i)=>piaInYear(cache?cache[i][year]:['salary','history'].includes(people[i].method)?estimatePia(people[i],plan,data,Math.min(year-1,births[i]+people[i].lifeAge)):b,year,plan,data,people[i]));
  const starts=people.map((s,i)=>claimSerial(s,claims[i],plan));
  let benefits=people.map((s,i)=>{const monthly=s.method==='ssa'?(claims[i]===70?(s.monthly70===''?s.monthly67*factors[i]/retirementFactor(67,births[i]):s.monthly70):s.monthly67)*(1+plan.futureCola/100)**(year-s.dollarYear):pias[i]*factors[i];return alive[i]?monthly*12*fractionFrom(starts[i],year):0;}),wages=people.map((s,i)=>alive[i]?ownIncome(s,ages[i]):0),pensions=people.map((s,i)=>alive[i]?pension(s,ages[i]):0);
  if(people.length===2)for(let i=0;i<2;i++){const j=1-i;
   if(alive[i]&&alive[j]){
    const start=Math.max(starts[i],starts[j]);const firstSpousalAge=Math.max(claims[i],people[i].age+(claims[j]-people[j].age));
    benefits[i]+=Math.max(0,pias[j]/2-pias[i])*spousalFactor(firstSpousalAge,births[i])*12*fractionFrom(start,year);
   }
   // Survivor simplification: at survivor FRA, larger of own benefit or deceased's amount.
   // Early survivor filing, switching and the widow(er) limit need an individual SSA review.
   if(alive[i]&&!alive[j]&&ages[i]>=fras[i])benefits[i]=Math.max(benefits[i],(people[j].method==='ssa'&&claims[j]===70&&people[j].monthly70!==''&&people[j].lifeAge>=claims[j]?Math.max(.825*pias[j],people[j].monthly70*(1+plan.futureCola/100)**(year-people[j].dollarYear)):pias[j]*(people[j].lifeAge<claims[j]?Math.max(1,retirementFactor(people[j].lifeAge,births[j])):Math.max(.825,factors[j])))*12);
  }
  let withheld=0;
  for(let i=0;i<people.length;i++)if(alive[i]&&ages[i]<fras[i]&&wages[i]>0){
   const threshold=data.earningsTest[year]||data.earningsTest[data.publishedYear];const growth=(1+plan.wageGrowth/100)**Math.max(0,year-data.publishedYear);
   const fraYear=ages[i]+1>fras[i];const fraction=fraYear?fras[i]-ages[i]:1;
   const limit=(fraYear?threshold.fraYear:threshold.underFra)*growth;
   const reduction=Math.min(benefits[i]*fraction,Math.max(0,wages[i]*fraction-limit)/(fraYear?3:2));benefits[i]-=reduction;withheld+=reduction;
  }
  const ss=benefits.reduce((a,b)=>a+b,0),income=ss+wages.reduce((a,b)=>a+b,0)+pensions.reduce((a,b)=>a+b,0);total+=ss;totalIncome+=income;
  rows.push({year,ages,primary:benefits[0],spouse:benefits[1]||0,ss,wages:wages.reduce((a,b)=>a+b,0),pensions:pensions.reduce((a,b)=>a+b,0),income,total,withheld});
 }
 return{claims,total,totalIncome,rows,bases};
}
export function calculate(plan,data){
 const people=plan.hasSpouse?[plan.primary,plan.spouse]:[plan.primary],estimates=people.map(p=>estimatePia(p,plan,data));
 const choices=people.map(p=>p.age>70||p.claimAge<p.age?[p.claimAge]:(p.method==='ssa'?[67,70]:Array.from({length:9},(_,i)=>62+i)).filter(age=>age>=p.age));
 const cache=people.map((p,i)=>Object.fromEntries(Array.from({length:Math.floor(Math.max(...people.map(s=>s.lifeAge-s.age)))+1},(_,t)=>{const year=plan.startYear+t;return [year,['salary','history'].includes(p.method)?estimatePia(p,plan,data,Math.min(year-1,plan.startYear-p.age+p.lifeAge)):estimates[i]];})));
 const scenarios=[];for(const a of choices[0])for(const b of (choices[1]||[null]))scenarios.push(scenario(plan,data,b===null?[a]:[a,b],estimates,cache));
 scenarios.sort((a,b)=>b.total-a.total);const selected=scenario(plan,data,people.map(p=>p.claimAge),estimates,cache);
 return{selected,best:scenarios[0],scenarios,estimates,fras:people.map(p=>fullRetirementAge(birthYear(p,plan)))};
}
