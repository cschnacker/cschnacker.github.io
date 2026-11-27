import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { project } from '../src/calculations.mjs';
import { convertLegacy } from '../src/legacy.mjs';
import { emptyPlan, normalize } from '../src/model.mjs';
import { readBackup, serialize } from '../src/storage.mjs';
import { bracketTax, validateRelease } from '../src/tax-data.mjs';

const read = async name => JSON.parse(await readFile(new URL('../data/' + name, import.meta.url)));
const manifest = await read('releases.json');
const releases = await Promise.all(manifest.years.map(async year =>
  validateRelease(await read('tax-' + year + '.json'), await read('planner-' + year + '.json'))));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.001, actual + ' vs. ' + expected);

test('2026 brackets, standard deduction, state taxes and payroll reconcile', () => {
  const plan = emptyPlan(2026);
  Object.assign(plan.household, { state: 'Colorado', years: 1 });
  plan.income.wages = 100000;
  const [row] = project(plan, releases);
  close(row.federal, 13170);
  close(row.state, 3691.6);
  close(row.socialTax, 6200);
  close(row.medicare, 1450);
  close(row.net, 75488.4);
  assert.equal(row.sourceYear, 2026);
});

test('payroll wage base is per earner and Additional Medicare uses joint threshold', () => {
  const plan = emptyPlan(2026);
  Object.assign(plan.household, { state: 'Texas', status: 'Joint', stateStatus: 'Joint', spouse: true });
  Object.assign(plan.income, { wages: 200000, spouseWages: 100000 });
  const [row] = project(plan, releases);
  close(row.socialTax, (184500 + 100000) * 0.062);
  close(row.medicare, 300000 * 0.0145 + 50000 * 0.009);
  assert.equal(row.state, 0);
});

test('future changes persist and investment distributions stop at the end age', () => {
  const plan = emptyPlan(2026);
  Object.assign(plan.household, { age: 64, state: 'Texas', years: 4 });
  Object.assign(plan.income, { wages: 30000, retireAge: 66 });
  plan.holdings.push(normalize('holdings', { name: 'Fund', units: 100, price: 10, growth: 10, yield: 5,
    tax: 'Qualified', startAge: 64, endAge: 66 }));
  plan.changes.push(normalize('changes', { year: 2027, field: 'wages', value: '40000' }));
  plan.changes.push(normalize('changes', { year: 2027, field: 'other', value: '1200' }));
  const rows = project(plan, releases);
  assert.deepEqual(rows.map(row => row.wages), [30000, 40000, 0, 0]);
  assert.deepEqual(rows.map(row => row.other), [0, 1200, 0, 0]);
  close(rows[0].distribution, 50);
  close(rows[1].distribution, 55);
  assert.equal(rows[2].distribution, 0);
});

test('backup round-trip and explicit error for income beyond a finite tax schedule', () => {
  const plan = emptyPlan(2026);
  plan.holdings.push(normalize('holdings', { name: 'Savings', tax: 'Tax-free' }));
  assert.deepEqual(readBackup(serialize(plan), 2026), plan);
  assert.throws(() => readBackup('{"version":0}', 2026), /version 1/);
  assert.equal(bracketTax(101, [{ upper: 100, rate: 10 }]), null);
  assert.equal(bracketTax(100, [{ upper: 100, rate: 10 }]), 10);
});

test('investment contributions use household wages or a fixed amount without changing taxes', () => {
  const oldPlan = emptyPlan(2026);
  Object.assign(oldPlan.household, { age: 66, spouseAge: 64, spouse: true, state: 'Texas', years: 3 });
  Object.assign(oldPlan.income, { wages: 80000, spouseWages: 50000, spouseGrowth: 10 });
  Object.assign(oldPlan.retirement, { taxable: 12000, nontaxable: 3000 });
  for (const key of ['contributionMode', 'contributionAmount', 'contributionPercent']) delete oldPlan.retirement[key];
  const plan = readBackup(serialize(oldPlan), 2026);
  const baseline = project(plan, releases);
  assert.deepEqual(baseline.map(row => row.contribution), [0, 0, 0]);
  assert.deepEqual(baseline.map(row => row.taxableInvestment), [0, 0, 0]);
  assert.deepEqual(baseline.map(row => row.nontaxableInvestment), [0, 0, 0]);
  assert.deepEqual(baseline.map(row => row.shortfall), [0, 15000, 15000]);
  plan.retirement.investmentOpening = 100000;
  plan.retirement.nontaxableInvestmentOpening = 10000;
  const funded = project(plan, releases);
  plan.retirement.contributionPercent = 10;
  const percentage = project(plan, releases);
  percentage.forEach((row, i) => {
    close(row.contribution, [13000, 5500, 6050][i]);
    close(row.tax, funded[i].tax);
    close(row.remainingCash, funded[i].net - row.contribution);
  });
  plan.retirement.contributionMode = 'Fixed amount';
  plan.retirement.contributionAmount = 4000;
  assert.deepEqual(project(plan, releases).map(row => row.contribution), [4000, 4000, 4000]);
});

test('retirement withdrawals reduce investments and stop when the balance is depleted', () => {
  const plan = emptyPlan(2026);
  Object.assign(plan.household, { age: 66, state: 'Texas', years: 4 });
  Object.assign(plan.income, { wages: 80000, other: 5000 });
  Object.assign(plan.retirement, { taxable: 8000, nontaxable: 2000, investmentOpening: 5000,
    nontaxableInvestmentOpening: 5000, pension: 20000, social: 10000 });
  plan.holdings.push(normalize('holdings', { units: 100, price: 100, yield: 10, startAge: 66 }));
  plan.holdings.push(normalize('holdings', { units: 20, price: 100, startAge: 66, tax: 'Tax-free' }));
  const rows = project(plan, releases);
  assert.deepEqual(rows.map(row => row.wages), [80000, 0, 0, 0]);
  assert.deepEqual(rows.map(row => row.other), [5000, 0, 0, 0]);
  assert.deepEqual(rows.map(row => row.pension), [0, 20000, 20000, 20000]);
  assert.deepEqual(rows.map(row => row.taxableBalance), [15000, 7000, 0, 0]);
  assert.deepEqual(rows.map(row => row.nontaxableBalance), [7000, 5000, 3000, 1000]);
  assert.deepEqual(rows.map(row => row.taxableWithdrawal), [0, 8000, 7000, 0]);
  assert.deepEqual(rows.map(row => row.taxFree), [0, 2000, 2000, 2000]);
  assert.deepEqual(rows.map(row => row.distribution), [1000, 1000, 700, 0]);
  assert.deepEqual(rows.map(row => row.shortfall), [0, 0, 1000, 8000]);
  close(rows[3].gross, rows[3].social + rows[3].pension + 2000);
});

test('contributions add to the accounts in the selected proportions', () => {
  const plan = emptyPlan(2026);
  plan.household.years = 2;
  Object.assign(plan.retirement, { contributionMode: 'Fixed amount', contributionAmount: 10000,
    nontaxableContributionShare: 25, investmentGrowth: 10 });
  const rows = project(plan, releases);
  assert.deepEqual(rows.map(row => row.taxableBalance), [7500, 15750]);
  assert.deepEqual(rows.map(row => row.nontaxableBalance), [2500, 5250]);
});

test('entered federal credit categories are projected separately and reduce tax up to the tax owed', () => {
  const plan = emptyPlan(2026);
  Object.assign(plan.household, { state: 'Colorado', years: 2 });
  Object.assign(plan.income, { wages: 100000, credits: 250, earnedIncomeCredit: 500, collegeCredit: 1000, creditGrowth: 10 });
  const rows = project(plan, releases);
  close(rows[0].federal, 13170 - 1750);
  close(rows[1].earnedIncomeCredit, 550);
  close(rows[1].collegeCredit, 1100);
  close(rows[1].otherFederalCredits, 275);
  close(rows[0].stateDeduction, rows[0].stateStandardDeduction + rows[0].stateExemptions);
  plan.income.collegeCredit = 20000;
  assert.equal(project(plan, releases)[0].federal, 0);
});

test('spending surplus and shortfall use after-tax cash after contributions', () => {
  const plan = emptyPlan(2026);
  Object.assign(plan.household, { state: 'Texas', age: 66, years: 3 });
  Object.assign(plan.income, { wages: 80000, spendingTarget: 24000, spendingGrowth: 10 });
  Object.assign(plan.retirement, { pension: 30000, contributionMode: 'Fixed amount', contributionAmount: 1000 });
  const rows = project(plan, releases);
  for (const [index, target] of [24000, 26400, 29040].entries()) {
    close(rows[index].spendingTarget, target);
    close(rows[index].spendingGap, rows[index].net - 1000 - target);
  }
  assert.ok(rows[0].spendingGap > 0 && rows[2].spendingGap < 0);
  plan.household.state = '';
  assert.equal(project(plan, releases)[0].spendingGap, null);
  plan.income.spendingTarget = 0;
  assert.equal(project(plan, releases)[0].spendingTarget, null);
});

test('existing workbook-converter entries map to editable plan modules', () => {
  const fields = { XLEW_2_2_4: 'N', XLEW_2_3_4: '2025', XLEW_2_4_4: '45', XLEW_2_7_4: 'Y',
    XLEW_2_9_3: '2010', XLEW_2_9_4: '2028', XLEW_2_19_5: '100,000', XLEW_2_25_5: 'New Mexica',
    XLEW_2_27_5: 'HOH', XLEW_2_45_4: '2031', XLEW_2_54_4: 'Texas' };
  const plan = convertLegacy(fields, 2026);
  assert.equal(plan.household.state, 'New Mexico');
  assert.equal(plan.household.status, 'HoH');
  assert.equal(plan.household.year, 2025);
  assert.equal(plan.income.wages, 100000);
  assert.deepEqual(plan.dependents, [{ name: '', birth: 2010, college: 2028 }]);
  assert.deepEqual(plan.changes, [{ year: 2031, field: 'state', value: 'Texas' }]);
});
