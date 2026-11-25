export const yearRange = [1900, 2300];
const money = [0, 1e10, 0.01];
const signed = [-1e10, 1e10, 0.01];
const rate = [-100, 100, 0.01];
const share = [0, 100, 0.01];
const percent = (label, range = rate) => [label, range, { increment: 1 }];
const salary = label => [label, money, { increment: 1000 }];
const stopYear = (label, showStartingYear = true) => [label, yearRange, {
  increment: 1, startAtCurrentYear: true, showStartingYear,
}];
const contribution = label => [label, signed, { increment: 100 }];
const oneTimeTransaction = label => [label, signed, { increment: 500 }];

export const householdFields = {
  startYear: ['First projection year', yearRange],
  endYear: ['Last projection year (optional)', yearRange],
  salaryGrowth: percent('Primary annual salary increase (%)'),
  primarySalary: salary('Primary annual salary ($)'),
  primaryStopWork: stopYear('Primary stop-work year (optional)', false),
  primaryStop: stopYear('Primary contribution stop year'),
  spouseSalary: salary('Spouse annual salary ($)'),
  spouseSalaryGrowth: percent('Spouse annual salary increase (%)'),
  spouseStopWork: stopYear('Spouse stop-work year (optional)', false),
  spouseStop: stopYear('Spouse contribution stop year'),
};

const investmentFields = {
  name: ['Investment name', 'text'],
  type: ['Investment type', ['529 plan', 'Stocks', 'Funds', 'Savings', 'Other']],
  balance: ['Starting balance ($)', money, { increment: 500 }],
  growth: percent('Annual investment return (%)'),
  extra: contribution('Annual contribution or withdrawal ($)'),
  extraGrowth: percent('Annual change in contribution (%)'),
  oneTime: oneTimeTransaction('One-time deposit or withdrawal in first year ($)'),
  primaryRate: percent('Primary salary contributed (%)', share),
  spouseRate: percent('Spouse salary contributed (%)', share),
};

export const incomeAdjustmentFields = {
  primarySalary: householdFields.primarySalary,
  spouseSalary: householdFields.spouseSalary,
  salaryGrowth: householdFields.salaryGrowth,
  spouseSalaryGrowth: householdFields.spouseSalaryGrowth,
};

export const investmentAdjustmentFields = {
  primaryRate: investmentFields.primaryRate,
  spouseRate: investmentFields.spouseRate,
  extra: contribution('New annual contribution or withdrawal ($)'),
  oneTime: oneTimeTransaction('One-time deposit or withdrawal ($)'),
  openingBalance: ['Override opening balance ($)', signed, { increment: 500 }],
  growth: investmentFields.growth,
};

export const recordFields = {
  students: {
    name: ['Student name', 'text'],
    start: ['First college year', yearRange],
    duration: ['Years in college', [1, 15]],
    cost: ['Annual cost in base year ($)', money],
    base: ['Cost base year', yearRange],
    inflation: percent('Annual cost increase (%)'),
  },
  holdings: investmentFields,
  adjustments: {
    year: ['Effective year', yearRange],
    investmentId: ['Investment', 'text'],
    ...incomeAdjustmentFields,
    ...investmentAdjustmentFields,
  },
};

export const planFormat = 'schnacker-college-plan';
export const planVersion = 2;

export function freshPlan(year = new Date().getFullYear()) {
  return {
    format: planFormat,
    version: planVersion,
    household: { startYear: year, includeSpouse: false, fundFromSalary: null },
    students: [],
    holdings: [],
    adjustments: [],
  };
}

export function readField(value, [name, rules]) {
  if (value === null || value === undefined || value === '') return null;
  if (rules === 'text' && typeof value === 'string' && value.length <= 120) return value;
  if (typeof rules[0] === 'string' && rules.includes(value)) return value;
  if (typeof rules[0] === 'number' && typeof value === 'number' && Number.isFinite(value)) {
    const [min, max, step = 1] = rules;
    if (value >= min && value <= max && Math.abs(value / step - Math.round(value / step)) < 0.001) return value;
  }
  throw new Error(`Check the value for “${name}”.`);
}

function readFields(input, fields) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('The backup contains an invalid record.');
  return Object.fromEntries(Object.entries(fields).map(([key, definition]) => [key, readField(input[key], definition)]));
}

function migrateLegacyPlan(input) {
  const { household, holdings: oldHoldings, adjustments } = input;
  if (!household || typeof household !== 'object' || Array.isArray(household) ||
      !Array.isArray(oldHoldings) || oldHoldings.length > 1000 ||
      !Array.isArray(adjustments) || adjustments.length > 1000) {
    throw new Error('The older backup is missing part of the plan.');
  }
  const fields = ['growth', 'extra', 'extraGrowth', 'oneTime', 'primaryRate', 'spouseRate'];
  const assumptions = Object.fromEntries(fields.map(field => [field, household[field]]));
  const hasAmount = value => value != null && value !== '';
  // Keep the old investment balances and apply the previous shared return to each.
  const holdings = oldHoldings.map(holding => ({ ...holding, growth: assumptions.growth }));
  const hasInvestmentChanges = adjustments.some(change =>
    Object.keys(investmentAdjustmentFields).some(key => hasAmount(change?.[key])));
  const hasStandaloneSavings = hasAmount(household.openingBalance) ||
    fields.some(key => key !== 'growth' && hasAmount(assumptions[key])) || hasInvestmentChanges;
  let target = holdings[0];
  if ((holdings.length !== 1 && hasStandaloneSavings) ||
      (holdings.length === 1 && hasAmount(household.openingBalance)) ||
      (!target && hasAmount(assumptions.growth))) {
    let id = 'migrated-college-savings';
    for (let suffix = 1; holdings.some(holding => holding.id === id); suffix++) {
      id = `migrated-college-savings-${suffix}`;
    }
    target = { id, name: 'College savings', type: 'Savings', balance: household.openingBalance };
    holdings.unshift(target);
  }
  if (target) Object.assign(target, assumptions);

  const migratedChanges = adjustments.flatMap((change, index) => {
    if (!change || typeof change !== 'object') throw new Error('The older backup contains an invalid adjustment.');
    const entries = [];
    const hasInvestment = Object.keys(investmentAdjustmentFields).some(key => hasAmount(change[key]));
    const hasIncome = Object.keys(incomeAdjustmentFields).some(key => hasAmount(change[key]));
    if (hasIncome || !hasInvestment) entries.push({ ...change, id: `migrated-income-${index}`, investmentId: null });
    if (hasInvestment) entries.push({ ...change, id: `migrated-investment-${index}`, investmentId: target.id });
    return entries;
  });
  return { ...input, version: planVersion, holdings, adjustments: migratedChanges };
}

export function validatePlan(input) {
  if (input?.format !== planFormat || (input.version !== 1 && input.version !== planVersion)) {
    throw new Error('Choose a College Investment Planner backup with format version 1 or 2.');
  }
  if (input.version === 1) input = migrateLegacyPlan(input);
  const plan = freshPlan();
  plan.household = readFields(input.household, householdFields);
  if (typeof input.household.includeSpouse !== 'boolean') throw new Error('The household information is invalid.');
  plan.household.includeSpouse = input.household.includeSpouse;
  for (const [collection, fields] of Object.entries(recordFields)) {
    const limit = collection === 'adjustments' ? 2000 : collection === 'holdings' ? 1001 : 1000;
    if (!Array.isArray(input[collection]) || input[collection].length > limit) {
      throw new Error(`The backup has an invalid ${collection} section.`);
    }
    const ids = new Set();
    plan[collection] = input[collection].map(record => {
      if (!/^[\w-]{1,80}$/.test(record?.id ?? '') || ids.has(record.id)) {
        throw new Error(`The backup has an invalid or repeated ID in ${collection}.`);
      }
      ids.add(record.id);
      return { id: record.id, ...readFields(record, fields) };
    });
  }
  const investmentIds = new Set(plan.holdings.map(holding => holding.id));
  if (plan.adjustments.some(change => change.investmentId && !investmentIds.has(change.investmentId))) {
    throw new Error('A yearly adjustment refers to an investment missing from the plan.');
  }
  const salaryFunding = input.household.fundFromSalary;
  if (salaryFunding !== undefined && salaryFunding !== null && typeof salaryFunding !== 'boolean') {
    throw new Error('The salary funding setting is invalid.');
  }
  const existingRate = [...plan.holdings, ...plan.adjustments].some(entry => entry.primaryRate > 0 || entry.spouseRate > 0);
  plan.household.fundFromSalary = salaryFunding === undefined && existingRate ? true : salaryFunding ?? null;
  return plan;
}
