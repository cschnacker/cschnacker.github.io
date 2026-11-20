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
  assert.deepEqual(rows.map(row => row.other), [0, 1200, 1200, 1200]);
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
