import {stateWithholding} from './state-withholding.js';
// Pure calculation functions. Tax tables and assumptions are supplied by the caller.
export const defaults = Object.freeze({salary:0, frequency:26, filing:'Single', federalFiling:'household', state:'California', retirementMode:'percent', retirementPercent:0, retirementPerPay:0, medical:0, hsa:0, rothMode:'percent', rothPercent:0, rothPerPay:0, afterTax:0, multipleJobs:false, creditMode:'amount', children:0, otherDependents:0, otherCredits:0, credits:0, otherIncome:0, deductions:0, extraWithholding:0, stateMode:'estimate', statePerPay:0, stateExtra:0, caStatus:'Single', caAllowances:0, caDeductions:0, bonus:0, bonusStatePercent:0});
// Preserve regular-pay totals from saved inputs created before contribution modes.
export function migrateContributions(values) {
  const input={...values};
  for(const prefix of ['retirement','roth']) {
    if(input[prefix+'Mode'] !== undefined) continue;
    const percent=input[prefix+'Percent'], perPay=input[prefix+'PerPay'], annual=input[prefix+'Annual'] ?? 0;
    if(![percent,perPay,annual,input.salary,input.frequency].every(n=>typeof n==='number' && Number.isFinite(n) && n>=0) || input.frequency===0) throw new Error('Invalid saved contribution inputs.');
    if(perPay || annual) {
      input[prefix+'Mode']='dollars';
      input[prefix+'PerPay']=Math.round((perPay+(annual+input.salary*percent/100)/input.frequency)*100)/100;
      input[prefix+'Percent']=0;
    } else input[prefix+'Mode']='percent';
    delete input[prefix+'Annual'];
  }
  return input;
}
const money = n => Math.round((n + Number.EPSILON)*100)/100;
export function federalWithholding(taxableWages, input, table) {
  const status=input.federalFiling && input.federalFiling!=='household' ? input.federalFiling : input.filing;
  const filing = table.filingMap[status];
  if (!filing) throw new Error('Choose a supported filing status.');
  const adjusted = Math.max(0, taxableWages + input.otherIncome - input.deductions - (input.multipleJobs ? 0 : table.annualAdjustment[status]));
  const schedule = table[input.multipleJobs ? 'multipleJobs' : 'standard'][filing];
  const bracket = schedule.findLast(b => adjusted >= b[0]);
  const annual = bracket[1] + (adjusted-bracket[0])*bracket[2]/100;
  const credits=input.creditMode==='dependents' ? input.children*table.step3.childCredit+input.otherDependents*table.step3.otherDependentCredit+input.otherCredits : input.credits;
  return {perPay:money(Math.max(0,(annual-credits)/input.frequency)+input.extraWithholding),adjusted,annual,bracket,credits};
}
export function bracketTax(income, schedule) {
  if (!schedule?.length) throw new Error('The selected state has no tax schedule.');
  if (schedule.at(-1).upper !== null && income > schedule.at(-1).upper) throw new Error('The state table does not cover this income. Enter state withholding per paycheck.');
  let total = 0, lower = 0;
  for (const b of schedule) {
    total += Math.max(0,Math.min(income,b.upper ?? income)-lower)*b.rate/100;
    lower = b.upper ?? income;
  }
  return total;
}
export function calculate(values, data) {
  const input = {...defaults,...values};
  for (const [key,value] of Object.entries(defaults)) {
    if (typeof value === 'number' && (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0)) throw new Error('Enter valid amounts of zero or more.');
  }
  if (![1,4,12,24,26,52].includes(input.frequency)) throw new Error('Choose a pay frequency.');
  if (![input.retirementPercent,input.rothPercent,input.bonusStatePercent].every(n=>n<=100)) throw new Error('Percentages must be between 0 and 100.');
  if (!['amount','dependents'].includes(input.creditMode)) throw new Error('Choose a Step 3 entry method.');
  if (![input.children,input.otherDependents].every(Number.isInteger)) throw new Error('Enter whole numbers of dependents.');
  if (typeof input.multipleJobs !== 'boolean') throw new Error('Invalid multiple-jobs setting.');
  if (!['Single','Joint','Separate','HoH'].includes(input.filing)) throw new Error('Choose a filing status.');
  if (!['household','Single','Joint','Separate','HoH'].includes(input.federalFiling)) throw new Error('Choose a federal W-4 filing status.');
  if (!data.income.states[input.state]) throw new Error('Choose a supported state.');
  if (!['estimate','manual','california'].includes(input.stateMode)) throw new Error('Choose a state withholding method.');
  if (![input.retirementMode,input.rothMode].every(mode=>['percent','dollars'].includes(mode))) throw new Error('Choose dollars or percent for each retirement contribution.');
  if (![data.withholding.year,data.income.year,data.assumptions.year].every(y=>y===data.payroll.year)) throw new Error('Tax data years do not match.');
  const p = input.frequency, gross = input.salary/p;
  const retirement = input.retirementMode==='percent' ? input.salary*input.retirementPercent/100 : input.retirementPerPay*p;
  const benefits = input.medical+input.hsa;
  if (retirement+benefits>input.salary) throw new Error('Pretax deductions exceed annual salary.');
  const wages = input.salary-retirement-benefits;
  const federal = federalWithholding(wages,input,data.withholding);
  const bonusRetirement = input.retirementMode==='percent' ? input.bonus*input.retirementPercent/100 : 0;
  const bonusTaxable = input.bonus-bonusRetirement;
  function estimateState(income) {
    const jurisdiction = data.income.states[input.state];
    const assumptionKey = input.state === 'New Mexica' ? 'New Mexico' : input.state;
    const a = data.assumptions.states[assumptionKey]?.[input.filing==='Joint'?'Joint':'Single'];
    if (!a || !jurisdiction || ![a.standardDeduction,a.personalExemption,a.personalCredit].every(Number.isFinite)) throw new Error('State assumptions are unavailable. Enter state withholding per paycheck.');
    const taxable = Math.max(0,income-a.standardDeduction-a.personalExemption);
    return {taxable,total:Math.max(0,bracketTax(taxable,jurisdiction.schedules[jurisdiction.filingMap[input.filing]])-a.personalCredit)};
  }
  let statePerPay, stateTaxable=null;
  if (input.stateMode==='manual') statePerPay=money(input.statePerPay+input.stateExtra);
  else if(input.stateMode==='california') {
    if(input.state!=='California') throw new Error('California DE 4 applies only to California. Choose Estimated or Manual for this state.');
    statePerPay=stateWithholding({year:data.payroll.year,stateWithholding:data.stateWithholding},{state:input.state,status:input.caStatus,wages,periods:p,allowances:input.caAllowances,deductions:input.caDeductions,extra:input.stateExtra});
  } else {
    const estimate=estimateState(wages);stateTaxable=estimate.taxable;
    statePerPay=money(estimate.total/p+input.stateExtra);
  }
  const rules=data.payroll;
  const ficaWages=input.salary-benefits;
  const social = Math.min(ficaWages,rules.socialSecurityWageBase)*rules.socialSecurityRate;
  const medicare = ficaWages*rules.medicareRate+Math.max(0,ficaWages-rules.additionalMedicareThreshold)*rules.additionalMedicareRate;
  const roth=input.rothMode==='percent' ? input.salary*input.rothPercent/100 : input.rothPerPay*p;
  const rows = [
    ['Federal withholding',federal.perPay,'tax'],
    [input.stateMode==='estimate'?'Estimated state withholding':'State withholding',statePerPay,'tax'],
    ['Social Security',money(social/p),'tax'],['Medicare',money(medicare/p),'tax'],
    ['Pretax retirement',money(retirement/p),'saving'],['Medical insurance',money(input.medical/p),'benefit'],
    ['HSA / FSA payroll deduction',money(input.hsa/p),'benefit'],['Roth contribution',money(roth/p),'saving'],
    ['Other after-tax deductions',money(input.afterTax/p),'benefit']
  ];
  const deductions=money(rows.reduce((s,r)=>s+r[1],0)), net=money(gross)-deductions;
  const bonusFederal=money(Math.min(bonusTaxable,rules.supplementalThreshold)*rules.supplementalRate+Math.max(0,bonusTaxable-rules.supplementalThreshold)*rules.supplementalHighRate);
  const bonusSocial=money(Math.min(input.bonus,Math.max(0,rules.socialSecurityWageBase-ficaWages))*rules.socialSecurityRate);
  const bonusMedicare=money(input.bonus*rules.medicareRate+(Math.max(0,ficaWages+input.bonus-rules.additionalMedicareThreshold)-Math.max(0,ficaWages-rules.additionalMedicareThreshold))*rules.additionalMedicareRate);
  const bonusState=money(input.bonus*input.bonusStatePercent/100);
  const bonusNet=money(input.bonus-bonusRetirement-bonusFederal-bonusSocial-bonusMedicare-bonusState);
  return {input,gross:money(gross),net:money(net),deductions,rows,federal,stateTaxable,bonus:{net:bonusNet,federal:bonusFederal,state:bonusState,social:bonusSocial,medicare:bonusMedicare,retirement:money(bonusRetirement)},annualNet:money(net*p),monthlyNet:money(net*p/12),taxes:money(rows.filter(r=>r[2]==='tax').reduce((s,r)=>s+r[1],0)),savings:money((retirement+roth)/p)};
}
