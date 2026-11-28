export const statuses = { Single: 'Single', Joint: 'Married filing jointly', Separate: 'Married filing separately', HoH: 'Head of household' };

const amount = [0, 0, 1e9];
const age = [0, 0, 120];
const rate = [0, -100, 100];
const taxRate = [0, 0, 100];
const year = [2026, 1900, 2200];
const optionalYear = [0, 1900, 2200];

export const oneTimeLabels = {
  taxableOneTime: 'One-time taxable withdrawal',
  nontaxableOneTime: 'One-time non-taxable withdrawal',
  purchaseOneTime: 'One-time purchase or expense'
};

export const schemas = {
  household: {
    year, years: [30, 1, 85], age: [40, 0, 120], spouseAge: [40, 0, 120], spouse: false,
    status: Object.keys(statuses), stateStatus: Object.keys(statuses), state: '',
    index: [2, 0, 20], wageIndex: [3, 0, 20], federalRate: taxRate, stateRate: taxRate,
    extraExemptions: [0, 0, 25], separateLivedApart: false
  },
  income: {
    wages: amount, wageGrowth: rate, retireAge: [67, 0, 121],
    spouseWages: amount, spouseGrowth: rate, spouseRetireAge: [67, 0, 121],
    other: amount, otherGrowth: rate, pretax: amount, pretaxGrowth: rate,
    health: amount, healthGrowth: rate, credits: amount, earnedIncomeCredit: amount, collegeCredit: amount, creditGrowth: rate,
    stateCredits: amount, stateCreditGrowth: rate, spendingTarget: amount, spendingGrowth: rate
  },
  retirement: {
    social: amount, socialAge: [67, 0, 121], socialGrowth: [2.5, -100, 100],
    spouseSocial: amount, spouseSocialAge: [67, 0, 121], spouseSocialGrowth: [2.5, -100, 100],
    pension: amount, pensionAge: [67, 0, 121], pensionGrowth: rate,
    spousePension: amount, spousePensionAge: [67, 0, 121], spousePensionGrowth: rate,
    taxable: amount, taxableAge: [67, 0, 121], taxableGrowth: rate, taxableStartYear: optionalYear,
    nontaxable: amount, nontaxableAge: [67, 0, 121], nontaxableGrowth: rate, nontaxableStartYear: optionalYear,
    contributionMode: ['Salary percentage', 'Fixed amount'],
    contributionPercent: taxRate, contributionAmount: amount,
    investmentOpening: amount, nontaxableInvestmentOpening: amount, investmentGrowth: rate,
    nontaxableContributionShare: taxRate
  },
  holdings: {
    name: '', type: ['Stock', 'Fund', 'Bond', 'Cash', 'Other'],
    units: [0, 0, 1e9], price: amount, growth: rate, yield: taxRate,
    tax: ['Ordinary', 'Qualified', 'Tax-free'], startAge: age, endAge: [121, 0, 121]
  },
  changes: {
    year, field: ['wages', 'wageGrowth', 'spouseWages', 'spouseGrowth', 'other', 'otherGrowth',
      'pretax', 'health', 'state', 'status', 'stateStatus', 'extraExemptions', 'credits', 'stateCredits', ...Object.keys(oneTimeLabels)],
    value: ''
  },
  dependents: { name: '', birth: year, college: [0, 0, 2200] }
};

export const singleton = ['household', 'income', 'retirement'];
export const collections = ['holdings', 'changes', 'dependents'];
export const modules = [...singleton, ...collections];
export const changeLabels = {
  wages: 'Primary wages', wageGrowth: 'Primary wage growth', spouseWages: 'Spouse wages',
  spouseGrowth: 'Spouse wage growth', other: 'Other taxable income', otherGrowth: 'Other income growth',
  pretax: 'Other pre-tax deductions', health: 'Pre-tax health premiums', state: 'State',
  status: 'Federal filing status', stateStatus: 'State filing status', extraExemptions: 'Additional state exemptions',
  credits: 'Other federal credits', stateCredits: 'Other state credits', ...oneTimeLabels
};
export function changeSpec(field) {
  if (Object.hasOwn(oneTimeLabels, field)) return amount;
  return Object.hasOwn(changeLabels, field) ? schemas.income[field] ?? schemas.household[field] : undefined;
}
export function withdrawalStartYear(household, retirement, key) {
  return retirement[key + 'StartYear'] || Math.max(household.year, household.year + retirement[key + 'Age'] - household.age);
}
const integers = new Set(['year', 'years', 'age', 'spouseAge', 'retireAge', 'spouseRetireAge', 'socialAge',
  'spouseSocialAge', 'pensionAge', 'spousePensionAge', 'taxableAge', 'nontaxableAge',
  'taxableStartYear', 'nontaxableStartYear', 'startAge', 'endAge', 'birth', 'college', 'extraExemptions']);

export function valueFor(key, spec, value) {
  if (typeof spec === 'boolean') return typeof value === 'boolean' ? value : spec;
  if (typeof spec === 'string') return typeof value === 'string' ? value.slice(0, 120) : spec;
  if (typeof spec[0] === 'string') return spec.includes(value) ? value : spec[0];
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return spec[0];
  const number = Number(value);
  if (spec === optionalYear && number === 0) return 0;
  const clamped = Number.isFinite(number) ? Math.max(spec[1], Math.min(spec[2], number)) : spec[0];
  return integers.has(key) ? Math.trunc(clamped) : clamped;
}

export function normalize(module, record = {}, defaultYear = 2026) {
  const fields = Object.entries(schemas[module]).map(([key, spec]) => [
    key, valueFor(key, key === 'year' || key === 'birth' ? [defaultYear, ...spec.slice(1)] : spec, record?.[key])
  ]);
  return Object.fromEntries(fields);
}

export function emptyPlan(defaultYear) {
  return Object.fromEntries(modules.map(module => [module,
    singleton.includes(module) ? normalize(module, {}, defaultYear) : []]));
}
