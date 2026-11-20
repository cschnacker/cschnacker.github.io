import { changeSpec, valueFor } from './model.mjs';
import { bracketTax, releaseFor, scheduleFor } from './tax-data.mjs';

const compound = (value, rate, years) => value * (1 + rate / 100) ** years;
const dollars = value => Math.max(0, value);
const startsAt = (value, age, start, growth, offset) => age >= start ? compound(value, growth, offset) : 0;

function taxableBenefits(benefits, otherIncome, rules, household) {
  const status = household.status === 'Separate' && household.separateLivedApart ? 'Single' : household.status;
  const [low, high] = rules.socialSecurityThresholds[status];
  const provisional = otherIncome + benefits / 2;
  const half = Math.min(benefits * 0.5, dollars(Math.min(high, provisional) - low) * 0.5);
  return Math.min(benefits * 0.85, half + dollars(provisional - high) * 0.85);
}

function gainsTax(gains, ordinary, limits, scale) {
  const [zero, middle] = limits.map(limit => limit * scale);
  const belowZero = Math.min(gains, dollars(zero - ordinary));
  const inMiddle = Math.min(gains - belowZero, dollars(middle - Math.max(ordinary, zero)));
  return inMiddle * 0.15 + (gains - belowZero - inMiddle) * 0.20;
}

function investmentIncome(holdings, age, startingAge) {
  const total = { balance: 0, Ordinary: 0, Qualified: 0, 'Tax-free': 0 };
  for (const holding of holdings) {
    const start = Math.max(holding.startAge, startingAge);
    if (age < start || age >= holding.endAge) continue;
    const value = compound(holding.units * holding.price, holding.growth, age - start);
    total.balance += value;
    total[holding.tax] += value * holding.yield / 100;
  }
  return total;
}

export function project(plan, releases) {
  const h = { ...plan.household };
  const income = { ...plan.income };
  const r = plan.retirement;
  const rows = [];
  const changes = new Map();
  for (const change of plan.changes) {
    const spec = changeSpec(change.field);
    if (spec === undefined || change.value === '') continue;
    if (!changes.has(change.year)) changes.set(change.year, []);
    changes.get(change.year).push([change.field, valueFor(change.field, spec, change.value)]);
  }
  for (let offset = 0; offset < h.years; offset += 1) {
    const year = h.year + offset;
    const age = h.age + offset;
    const spouseAge = h.spouseAge + offset;
    for (const [key, value] of changes.get(year) ?? []) {
      const target = Object.hasOwn(income, key) ? income : h;
      target[key] = value;
    }
    const { tables, rules } = releaseFor(releases, year);
    const ageOfData = Math.max(0, year - rules.year);
    const scale = compound(1, h.index, ageOfData);
    const wageBase = compound(rules.payroll.wageBase, h.wageIndex, ageOfData);
    const wages = age < income.retireAge ? income.wages : 0;
    const spouseWages = h.spouse && spouseAge < income.spouseRetireAge ? income.spouseWages : 0;
    const earned = wages + spouseWages;
    const social = startsAt(r.social, age, r.socialAge, r.socialGrowth, offset) +
      (h.spouse ? startsAt(r.spouseSocial, spouseAge, r.spouseSocialAge, r.spouseSocialGrowth, offset) : 0);
    const pension = startsAt(r.pension, age, r.pensionAge, r.pensionGrowth, offset) +
      (h.spouse ? startsAt(r.spousePension, spouseAge, r.spousePensionAge, r.spousePensionGrowth, offset) : 0);
    const taxableWithdrawal = startsAt(r.taxable, age, r.taxableAge, r.taxableGrowth, offset);
    const taxFree = startsAt(r.nontaxable, age, r.nontaxableAge, r.nontaxableGrowth, offset);
    const investments = investmentIncome(plan.holdings, age, h.age);
    const pretax = Math.min(earned, income.pretax + income.health);
    const ordinary = earned + income.other + pension + taxableWithdrawal + investments.Ordinary - pretax;
    const taxableSocial = taxableBenefits(social, ordinary + investments.Qualified, rules, h);
    const adjusted = ordinary + investments.Qualified + taxableSocial;
    const fedDeduction = rules.standardDeduction[h.status] * scale;
    const fedTaxable = dollars(adjusted - fedDeduction);
    const gains = Math.min(fedTaxable, investments.Qualified);
    const ordinaryTaxable = fedTaxable - gains;
    const gross = earned + income.other + pension + taxableWithdrawal + taxFree + social +
      investments.Ordinary + investments.Qualified + investments['Tax-free'];

    const children = plan.dependents.filter(person => year >= person.birth && year - person.birth < 17).length;
    const students = plan.dependents.filter(person =>
      year >= person.birth && person.college > 0 && year >= person.college && year < person.college + 4).length;
    const otherDependents = plan.dependents.filter(person =>
      year - person.birth >= 17 && (year - person.birth < 19 ||
        (year - person.birth < 24 && person.college > 0 && year >= person.college && year < person.college + 4))).length;
    const c = rules.childCredit;
    const dependentCredit = dollars(children * c.amount + otherDependents * c.otherDependent -
      Math.ceil(dollars(adjusted - c.threshold[h.status]) / c.phaseoutStep) * c.phaseoutReduction);
    let federal = dollars(bracketTax(ordinaryTaxable, scheduleFor(tables.federal, h.status), scale) +
      gainsTax(gains, ordinaryTaxable, rules.capitalGains[h.status], scale) - income.credits - dependentCredit);
    let state = 0;
    let stateDeduction = 0;
    let stateTaxable = 0;
    let socialTax = (Math.min(wages, wageBase) + Math.min(spouseWages, wageBase)) * rules.payroll.socialSecurity / 100;
    let medicare = earned * rules.payroll.medicare / 100 +
      dollars(earned - rules.payroll.threshold[h.status]) * rules.payroll.additionalMedicare / 100;
    let warning = '';
    const jurisdiction = Object.hasOwn(tables.states, h.state) ? tables.states[h.state] : null;
    if (jurisdiction) {
      const filing = jurisdiction.filingMap[h.stateStatus];
      const allowance = rules.stateAllowances[h.state][filing];
      const exemptions = (filing === 'Joint' ? allowance.exemption / 2 : allowance.exemption) *
        (h.extraExemptions + children + otherDependents);
      stateDeduction = (allowance.deduction + allowance.exemption + exemptions) * scale;
      stateTaxable = dollars(ordinary + investments.Qualified - stateDeduction);
      state = bracketTax(stateTaxable, scheduleFor(jurisdiction, h.stateStatus), scale);
      if (state === null) warning = h.state + ' taxable income exceeds the shared schedule.';
      else state = dollars(state - allowance.credit - income.stateCredits);
    } else if (h.state === 'Other') {
      federal = dollars((gross - pretax) * h.federalRate / 100 - income.credits);
      state = dollars((gross - pretax) * h.stateRate / 100 - income.stateCredits);
      socialTax = 0;
      medicare = 0;
    } else {
      state = gross ? null : 0;
      if (gross) warning = 'Choose a state to complete the tax and net income estimates.';
    }
    const tax = state === null ? null : federal + state + socialTax + medicare;
    rows.push({ year, age, spouseAge: h.spouse ? spouseAge : null, sourceYear: rules.year, stateName: h.state,
      stateStatus: h.stateStatus, status: h.status, gross, adjusted, federal, state, socialTax, medicare, tax,
      net: tax === null ? null : gross - pretax - tax, fedDeduction, fedTaxable, stateDeduction, stateTaxable,
      fedRate: gross ? federal / gross : 0, stateRate: state === null ? null : gross ? state / gross : 0,
      balance: investments.balance, distribution: investments.Ordinary + investments.Qualified + investments['Tax-free'],
      wages, spouseWages, other: income.other, pension, social, taxableSocial, taxableWithdrawal, taxFree,
      dependentCredit, children, students, pretax, warning });
    for (const [amount, growth] of [['wages','wageGrowth'], ['spouseWages','spouseGrowth'], ['other','otherGrowth'],
      ['pretax','pretaxGrowth'], ['health','healthGrowth'], ['credits','creditGrowth'], ['stateCredits','stateCreditGrowth']]) {
      income[amount] = compound(income[amount], income[growth], 1);
    }
  }
  return rows;
}
