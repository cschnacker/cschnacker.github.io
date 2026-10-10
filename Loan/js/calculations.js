import { SETTINGS } from '../data/defaults.js';

const present = value => value !== '' && value !== null && value !== undefined;
const num = value => present(value) ? Number(value) : 0;
export function payment(balance, rate, periods) {
  if (balance === 0) return 0;
  if (rate === 0) return balance / periods;
  return balance * rate / -Math.expm1(-periods * Math.log1p(rate));
}
export function validate(plan) {
  const errors = [];
  const check = (obj, key, label, min, max, required = false, integer = false) => {
    if (!present(obj[key])) { if (required) errors.push(`Enter ${label.toLowerCase()}.`); return; }
    const value = Number(obj[key]);
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) errors.push(`${label} must be ${integer ? 'a whole number ' : ''}between ${min.toLocaleString()} and ${max.toLocaleString()}.`);
  };
  check(plan, 'startYear', 'Start year', 1900, 9999, true, true);
  check(plan, 'startMonth', 'First payment month', 1, 12, false, true);
  check(plan, 'years', 'Loan term', 1, SETTINGS.maxYears, true, true);
  check(plan, 'principal', 'Loan amount', 0.01, 1e12, true);
  check(plan, 'rate', 'Interest rate', 0, 100, true);
  for (const [key,label] of [['taxes','Annual taxes'],['insurance','Annual insurance'],['extra','Extra principal'],['lumpSum','One-time payment']]) check(plan,key,label,0,1e12);
  for (const key of ['taxGrowth','insuranceGrowth','extraGrowth']) check(plan,key,'Annual increase',-100,100);
  if (plan.modificationsEnabled) {
    const seen = new Set();
    for (const [i,change] of plan.modifications.entries()) {
      const label = `Change ${i + 1}`;
      check(change,'year',`${label} year`,num(plan.startYear)+1,num(plan.startYear)+SETTINGS.maxYears-1,true,true);
      if (present(change.year) && seen.has(num(change.year))) errors.push('Use only one modification per year.');
      seen.add(num(change.year));
      check(change,'years',`${label} term`,1,SETTINGS.maxYears,false,true);
      for (const key of ['balance','taxes','insurance','extra','lumpSum']) check(change,key,`${label} ${key}`,0,1e12);
      check(change,'rate',`${label} rate`,0,100);
    }
  }
  return errors;
}

// Monthly payments drive amortization. Annual rows summarize those same months.
// Annual extra principal and one-time payments retain their year-end timing.
export function calculate(plan) {
  const errors = validate(plan);
  if (errors.length) return { errors, rows: [], months: [] };
  let balance = num(plan.principal), rate = num(plan.rate)/100, remaining = num(plan.years)*12;
  let monthlyPayment = payment(balance,rate/12,remaining);
  let taxes = num(plan.taxes), insurance = num(plan.insurance), extra = num(plan.extra);
  const changes = plan.modificationsEnabled ? plan.modifications : [];
  const applied = new Set(), rows = [], months = [], warnings = [];
  let totalInterest = 0, totalPaid = 0;
  const initialMonthlyPayment = monthlyPayment;
  const firstMonth = (num(plan.startMonth) || 1)-1;
  let annualLumpSum = num(plan.lumpSum);
  for (let index = 0; index < SETTINGS.maxYears*12 && balance > 0.000001; index++) {
    const year = num(plan.startYear)+Math.floor((firstMonth+index)/12);
    const month = (firstMonth+index)%12+1;
    if (index > 0 && month === 1) {
      taxes *= 1 + num(plan.taxGrowth)/100;
      insurance *= 1 + num(plan.insuranceGrowth)/100;
      extra *= 1 + num(plan.extraGrowth)/100;
      annualLumpSum = 0;
    }
    const change = month === 1 ? changes.find(item => num(item.year) === year) : undefined;
    if (change) {
      applied.add(year);
      if (present(change.balance)) balance = num(change.balance);
      if (present(change.rate)) rate = num(change.rate)/100;
      if (present(change.years)) remaining = num(change.years)*12;
      if (present(change.taxes)) taxes = num(change.taxes);
      if (present(change.insurance)) insurance = num(change.insurance);
      if (present(change.extra)) extra = num(change.extra);
      annualLumpSum = num(change.lumpSum);
      if (change.refinance) {
        if (remaining <= 0 && balance > 0) return { errors: [`Enter a new term for the refinance in ${year}.`], rows: [], months: [] };
        monthlyPayment = balance > 0 ? payment(balance,rate/12,remaining) : 0;
      }
    }
    const interest = balance * rate/12;
    let paid = Math.min(monthlyPayment,balance+interest);
    // Remove sub-cent floating point residue at the last scheduled payment.
    if (balance+interest-paid < 0.000001) paid = balance+interest;
    const principal = paid-interest;
    const extraPaid = month === 12 ? Math.min(extra,Math.max(0,balance-principal)) : 0;
    const lumpPaid = month === 12 ? Math.min(annualLumpSum,Math.max(0,balance-principal-extraPaid)) : 0;
    const closing = Math.max(0,balance-principal-extraPaid-lumpPaid);
    const total = paid + taxes/12 + insurance/12 + extraPaid + lumpPaid;
    const period = `${year}-${String(month).padStart(2,'0')}`;
    months.push({ year, month, period, opening:balance, rate, interest, principal, payment:paid, taxes:taxes/12, insurance:insurance/12, extra:extraPaid, lumpSum:lumpPaid, closing, total, modified:!!change });
    let annual = rows.at(-1);
    if (!annual || annual.year !== year) {
      annual = { year, opening:balance, rate, interest:0, principal:0, payment:0, taxes:0, insurance:0, extra:0, lumpSum:0, closing:0, total:0, modified:false, payments:0 };
      rows.push(annual);
    }
    for (const key of ['interest','principal','payment','taxes','insurance','extra','lumpSum','total']) annual[key] += months.at(-1)[key];
    annual.closing = closing; annual.modified ||= !!change; annual.payments++;
    totalInterest += interest; totalPaid += total;
    if (![closing,total,totalInterest,totalPaid].every(Number.isFinite)) return { errors:['These inputs exceed the calculation range. Reduce the amounts or growth rates.'], rows:[], months:[] };
    balance = closing; remaining--;
  }
  if (balance > 0.000001) warnings.push(`The loan is not paid off within ${SETTINGS.maxYears} years. Review payments and modifications.`);
  if (months.some(row => row.principal < 0)) warnings.push('In at least one month, the regular payment is less than interest charged.');
  if (changes.some(change => !applied.has(num(change.year)))) warnings.push('A modification falls after payoff and was not applied.');
  return { errors:[], warnings, rows, months, initialMonthlyPayment, totalInterest, totalPaid, paymentCount:months.length, paidOff:balance <= 0.000001, payoffYear:balance <= 0.000001 ? months.at(-1).year : null, payoffMonth:balance <= 0.000001 ? months.at(-1).month : null };
}
