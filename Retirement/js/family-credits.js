
export function familyCredits(s,rules,{year,earned,agi,investmentIncome,tax,payroll,primaryAge,spouseAge}){
 const out={childTaxCredit:0,additionalChildTaxCredit:0,earnedIncomeCredit:0,refundableCredits:0,qualifyingCtcChildren:0,qualifyingEitcChildren:0,creditNotes:[]};
 if(!s.includeChildCredit&&!s.includeEarnedCredit)return out;
 const f=rules.familyCredits;
 if(!f){out.creditNotes.push('Annual rules do not contain family credits. Update the retirement tax file; no family credits were applied.');return out;}
 const scale=f.inflate?(1+s.inflation/100)**Math.max(0,year-rules.year):1;
 const children=(s.creditChildren||[]).filter(c=>year<=c.lastYear).map(c=>({...c,age:c.age+year-s.startYear}));
 const ctc=children.filter(c=>c.ctcEligible&&c.age>=0&&c.age<=f.child.maximumAge).length;
 const olderAdult=Math.max(primaryAge,s.filing==='Joint'&&s.married?spouseAge:primaryAge);
 const eic=children.filter(c=>c.eitcEligible&&c.age>=0&&(c.disabled||(c.age<olderAdult&&(c.age<=f.earned.maximumChildAge||c.age<=f.earned.maximumStudentAge&&c.age<=c.studentThroughAge)))).length;
 out.qualifyingCtcChildren=ctc;out.qualifyingEitcChildren=eic;
 const earnedIncome=Math.max(0,earned),magi=Math.max(0,agi+(s.familyCreditMagiAdjustment||0)),invest=Math.max(0,investmentIncome+(s.eitcOtherInvestmentIncome||0));
 let eicAmount=0;
 const ageEligible=eic>0||(primaryAge>=f.earned.minimumAdultAge&&primaryAge<=f.earned.maximumAdultAge)||(s.filing==='Joint'&&s.married&&spouseAge>=f.earned.minimumAdultAge&&spouseAge<=f.earned.maximumAdultAge);
 const filingEligible=s.filing!=='Separate'||s.eitcSeparatedEligible&&eic>0;
 if(s.eitcEligible&&ageEligible&&filingEligible&&invest<=f.earned.investmentIncomeLimit*scale&&earnedIncome>0){
  const tier=f.earned.tiers[Math.min(3,eic)],joint=s.filing==='Joint',start=(joint?tier.jointStart:tier.start)*scale,end=(joint?tier.jointEnd:tier.end)*scale;
  const phaseIncome=Math.max(earnedIncome,magi);
  eicAmount=phaseIncome>=end?0:Math.max(0,Math.min(earnedIncome*tier.phaseInRate,tier.maximum*scale-Math.max(0,phaseIncome-start)*tier.phaseOutRate));
 }
 if(s.includeEarnedCredit){
  out.earnedIncomeCredit=eicAmount;
  if(!s.eitcEligible)out.creditNotes.push('EITC eligibility is not confirmed.');
  else if(!filingEligible)out.creditNotes.push('Separate filing requires the separated-spouse exception and a qualifying child for EITC.');
  else if(!ageEligible)out.creditNotes.push('Without a qualifying child, neither filer meets the EITC age range.');
  else if(invest>f.earned.investmentIncomeLimit*scale)out.creditNotes.push('Investment income exceeds the EITC limit.');
  else if(earnedIncome<=0)out.creditNotes.push('No eligible wages for EITC.');
  else if(!eicAmount)out.creditNotes.push('Income is above the EITC phaseout range.');
 }
 if(s.includeChildCredit&&s.ctcEligible){
  const c=f.child,total=Math.max(0,ctc*c.amount*scale-Math.ceil(Math.max(0,magi-c.thresholds[s.filing])/c.phaseoutStep)*c.phaseoutReduction);
  out.childTaxCredit=Math.min(Math.max(0,tax),total);
  const regular=c.refundRate*Math.max(0,earnedIncome-c.earnedIncomeFloor);
  const alternate=ctc>=c.alternateRefundMinimumChildren?Math.max(0,payroll-eicAmount):0;
  out.additionalChildTaxCredit=Math.min(total-out.childTaxCredit,ctc*c.refundableAmount*scale,Math.max(regular,alternate));
  if(!ctc)out.creditNotes.push('No eligible children within the child tax credit age range.');
 }else if(s.includeChildCredit)out.creditNotes.push('Child tax credit taxpayer eligibility is not confirmed.');
 out.refundableCredits=out.additionalChildTaxCredit+out.earnedIncomeCredit;
 return out;
}
