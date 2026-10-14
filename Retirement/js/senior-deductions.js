// Amounts, ages, income phaseout and sunset are maintained in annual rules.
export function seniorDeductions(s,rules,year,primaryAge,spouseAge,magi){
 const factor=(1+s.inflation/100)**Math.max(0,year-rules.year),a=rules.ageAdditionalDeduction,e=rules.enhancedSeniorDeduction;
 const count=min=>Number(primaryAge>=min)+Number(s.filing==='Joint'&&s.married&&spouseAge>=min);
 const ageAdditionalDeduction=a?count(a.minimumAge)*a.amounts[s.filing]*(a.inflate?factor:1):0;
 let seniorDeduction=0;
 if(e&&year>=e.startYear&&year<=e.endYear&&Object.hasOwn(e.thresholds,s.filing)){
  const eligible=Number(primaryAge>=e.minimumAge&&s.primarySeniorEligible!==false)+Number(s.filing==='Joint'&&s.married&&spouseAge>=e.minimumAge&&s.spouseSeniorEligible!==false);
  const scale=e.inflate?factor:1;
  seniorDeduction=eligible*Math.max(0,e.amountPerPerson*scale-e.phaseoutRate*Math.max(0,magi-e.thresholds[s.filing]*scale));
 }
 return {ageAdditionalDeduction,seniorDeduction};
}
