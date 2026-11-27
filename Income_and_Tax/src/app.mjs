import { readLegacy } from './legacy.mjs';
import { project } from './calculations.mjs';
import { changeLabels, changeSpec, emptyPlan, normalize, schemas, statuses, valueFor } from './model.mjs';
import { openPlanStore, readBackup, serialize } from './storage.mjs';
import { loadReleases, releaseFor } from './tax-data.mjs';

const byId = id => document.getElementById(id);
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const money = value => value === null ? '—' : currency.format(value);
const rate = value => value === null ? '—' : percent.format(value);
const projectionYears = byId('inspect-year');
const dialog = byId('confirm');
const collectionNames = { holdings: 'Holding', changes: 'Change', dependents: 'Dependent' };
const collectionDescriptions = {
  holdings: 'Add a stock, fund, bond, or cash holding to include its distributions.',
  changes: 'Add a change to model a future move, raise, or filing change.',
  dependents: 'Add dependents to track ages and college years.'
};

let plan;
let releases;
let defaultYear;
let store;
let stateOptions;
let selectedYear;
let rows = [];
let queuedSave = Promise.resolve();
let writesPending = 0;
let failedSave = false;
let dialogTask;
let channel;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function choose(options, current) {
  const element = node('select');
  for (const [value, label] of Object.entries(options)) {
    element.add(new Option(label, value));
  }
  if (current && !Object.hasOwn(options, current)) {
    element.add(new Option(current + ' (unavailable)', current));
  }
  element.value = current;
  return element;
}

const amountSteps = {
  wages: 1000, spouseWages: 1000, other: 500,
  pension: 1000, spousePension: 1000, social: 1000, spouseSocial: 1000
};

function field(module, fields, key, label, settings = {}) {
  const { index, wide, spouse, spec = schemas[module][key], options, step = amountSteps[key] } = settings;
  const current = fields[key];
  const container = node('label', undefined, 'field');
  if (wide) container.classList.add('wide');
  if (spouse) container.dataset.spouse = '';
  let input;
  if (options || Array.isArray(spec) && typeof spec[0] === 'string') {
    const choices = options ?? Object.fromEntries(spec.map(value => [value, value]));
    input = choose(choices, current || Object.keys(choices)[0]);
  } else {
    input = node('input');
    if (typeof spec === 'boolean') {
      input.type = 'checkbox';
      input.checked = current;
      container.classList.add('check');
    } else if (Array.isArray(spec)) {
      input.type = 'number';
      input.min = spec[1];
      input.max = spec[2];
      input.step = step ?? 'any';
      input.value = current === 0 && spec[0] === 0 ? '' : current;
      input.placeholder = '0';
    } else {
      input.type = 'text';
      input.value = current;
      input.maxLength = 120;
    }
  }
  input.dataset.module = module;
  input.dataset.key = key;
  if (index !== undefined) input.dataset.index = index;
  if (typeof spec === 'boolean') container.append(input, node('span', label));
  else container.append(node('span', label), input);
  return container;
}

function fieldsFor(module, data, list, options = {}) {
  const group = node('div', undefined, 'form-grid');
  for (const [key, label, settings] of list) group.append(field(module, data, key, label, { ...options, ...settings }));
  return group;
}

function fieldset(module, title, fields, spouse = false) {
  const section = node('fieldset');
  if (spouse) section.dataset.spouse = '';
  section.append(node('legend', title), fieldsFor(module, plan[module], fields));
  return section;
}

function buildForms() {
  const h = plan.household;
  const advanced = node('details');
  advanced.append(node('summary', 'Tax forecast assumptions'), fieldsFor('household', h, [
    ['index', 'Bracket growth (%/yr)'], ['wageIndex', 'SS wage cap growth (%/yr)'],
    ['extraExemptions', 'Additional state exemptions', { wide: true }],
    ['separateLivedApart', 'Lived apart all year (separate filing)', { wide: true }]
  ]));
  byId('household-fields').replaceChildren(fieldsFor('household', h, [
    ['year', 'Start year'], ['years', 'Projection years'], ['age', 'Primary age'],
    ['spouseAge', 'Spouse age', { spouse: true }], ['spouse', 'Include spouse', { wide: true }],
    ['status', 'Federal filing status', { options: statuses, wide: true }],
    ['state', 'State or jurisdiction', { options: stateOptions, wide: true }],
    ['stateStatus', 'State filing status', { options: statuses, wide: true }],
    ['federalRate', 'Custom federal rate (%)'], ['stateRate', 'Custom state rate (%)']
  ]), advanced);
  byId('income-fields').replaceChildren(
    fieldset('income', 'Primary employment', [['wages', 'Annual wages ($)'], ['wageGrowth', 'Wage growth (%/yr)'], ['retireAge', 'Age wages stop']]),
    fieldset('income', 'Spouse employment', [['spouseWages', 'Annual wages ($)'], ['spouseGrowth', 'Wage growth (%/yr)'], ['spouseRetireAge', 'Age wages stop']], true),
    fieldset('income', 'Other income', [['other', 'Other taxable income ($)'], ['otherGrowth', 'Other income growth (%/yr)']]),
    fieldset('income', 'Pre-tax costs', [['pretax', 'Other pre-tax deductions ($)'], ['pretaxGrowth', 'Deduction growth (%/yr)'],
      ['health', 'Pre-tax health premiums ($)'], ['healthGrowth', 'Premium growth (%/yr)']]),
    fieldset('income', 'Other credits', [['credits', 'Federal credits ($)'], ['creditGrowth', 'Federal credit growth (%/yr)'],
      ['stateCredits', 'State credits ($)'], ['stateCreditGrowth', 'State credit growth (%/yr)']])
  );
  byId('retirement-fields').replaceChildren(
    fieldset('retirement', 'Primary benefits', [['social', 'Annual Social Security ($)'], ['socialAge', 'Social Security start age'], ['socialGrowth', 'Social Security COLA (%)'],
      ['pension', 'Annual taxable pension ($)'], ['pensionAge', 'Pension start age'], ['pensionGrowth', 'Pension growth (%/yr)']]),
    fieldset('retirement', 'Spouse benefits', [['spouseSocial', 'Annual Social Security ($)'], ['spouseSocialAge', 'Social Security start age'], ['spouseSocialGrowth', 'Social Security COLA (%)'],
      ['spousePension', 'Annual taxable pension ($)'], ['spousePensionAge', 'Pension start age'], ['spousePensionGrowth', 'Pension growth (%/yr)']], true),
    fieldset('retirement', 'Withdrawals and other investment income', [['taxable', 'Annual taxable amount ($)'], ['taxableAge', 'Taxable start age'], ['taxableGrowth', 'Taxable growth (%/yr)'],
      ['nontaxable', 'Annual tax-free amount ($)'], ['nontaxableAge', 'Tax-free start age'], ['nontaxableGrowth', 'Tax-free growth (%/yr)']])
  );
  for (const name of Object.keys(collectionNames)) buildRecords(name);
  updateConditionalFields();
}

function buildRecords(module) {
  const list = byId(module + '-records');
  const records = plan[module].map((record, index) => {
    const card = node('article', undefined, 'record');
    const header = node('div', undefined, 'record-head');
    const remove = node('button', 'Remove', 'danger');
    remove.type = 'button';
    remove.dataset.remove = module;
    remove.dataset.index = index;
    remove.setAttribute('aria-label', 'Remove ' + collectionNames[module].toLowerCase() + ' ' + (index + 1));
    header.append(node('h3', collectionNames[module] + ' ' + (index + 1)), remove);
    const inputs = {
      holdings: [
        ['name', 'Name or ticker'], ['type', 'Asset type'], ['units', 'Shares or units'], ['price', 'Price per unit ($)'],
        ['growth', 'Price growth (%/yr)'], ['yield', 'Annual yield (%)'], ['tax', 'Distribution tax treatment'],
        ['startAge', 'Primary start age'], ['endAge', 'Primary end age']
      ],
      dependents: [['name', 'Name (optional)'], ['birth', 'Birth year'], ['college', 'College start year']],
      changes: [['year', 'Effective year'], ['field', 'Field to change', { options: changeLabels }]]
    }[module];
    const group = fieldsFor(module, record, inputs, { index });
    if (module === 'changes') {
      const options = record.field === 'state' ? stateOptions :
        ['status', 'stateStatus'].includes(record.field) ? { '': 'Choose status', ...statuses } : undefined;
      const spec = changeSpec(record.field);
      const value = record.value === '' ? '' : valueFor(record.field, spec, record.value);
      const control = field(module, { value }, 'value', changeLabels[record.field] + ' value', {
        index, spec, options, step: amountSteps[record.field]
      });
      if (value === '' && !options) control.querySelector('input').placeholder = 'Enter new value';
      group.append(control);
    }
    card.append(header, group);
    return card;
  });
  list.replaceChildren(...(records.length ? records : [node('p', collectionDescriptions[module], 'chart-note')]));
}

function updateConditionalFields() {
  for (const element of document.querySelectorAll('[data-spouse]')) element.hidden = !plan.household.spouse;
  for (const key of ['federalRate', 'stateRate', 'stateStatus', 'separateLivedApart']) {
    const label = document.querySelector('[data-key="' + key + '"][data-module="household"]').closest('label');
    label.hidden = key === 'separateLivedApart' ? plan.household.status !== 'Separate'
      : (plan.household.state === 'Other') === (key === 'stateStatus');
  }
}

const projectionSeries = [
  { key: 'net', label: 'Net income', color: '#087d73', amount: row => row.net },
  { key: 'federal', label: 'Federal income tax', color: '#965608', amount: row => row.federal },
  { key: 'state', label: 'State income tax', color: '#794491', amount: row => row.state },
  { key: 'payroll', label: 'Payroll tax', color: '#2c60a8', amount: row => row.socialTax + row.medicare }
];

function addProjectionHover(chartContainer, svg, guide, hitArea, x, plotWidth, viewWidth) {
  const tooltip = node('div', undefined, 'projection-tooltip');
  const title = node('strong');
  tooltip.append(title);
  const amounts = projectionSeries.map(series => {
    const entry = node('div', undefined, 'projection-tooltip-entry');
    entry.style.setProperty('--series-color', series.color);
    const amount = node('strong');
    entry.append(node('span', series.label), amount);
    tooltip.append(entry);
    return amount;
  });
  tooltip.hidden = true;
  chartContainer.append(tooltip);

  let hoveredIndex = -1;
  hitArea.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = svg.getBoundingClientRect();
    const cursor = (event.clientX - bounds.left) * viewWidth / bounds.width;
    const fraction = Math.max(0, Math.min(1, (cursor - x(0)) / plotWidth));
    const index = Math.round(fraction * (rows.length - 1));
    if (index === hoveredIndex) return;
    hoveredIndex = index;
    const hovered = rows[index];
    title.textContent = hovered.year;
    projectionSeries.forEach((series, band) => { amounts[band].textContent = money(series.amount(hovered)); });

    const position = x(index);
    guide.setAttribute('x1', position);
    guide.setAttribute('x2', position);
    guide.removeAttribute('visibility');
    tooltip.hidden = false;
    const anchor = position * bounds.width / viewWidth;
    const maximumLeft = chartContainer.clientWidth - tooltip.offsetWidth;
    const left = anchor + 12 <= maximumLeft ? anchor + 12 : anchor - tooltip.offsetWidth - 12;
    tooltip.style.left = Math.max(0, Math.min(maximumLeft, left)) + 'px';
  });
  hitArea.addEventListener('pointerleave', () => {
    hoveredIndex = -1;
    tooltip.hidden = true;
    guide.setAttribute('visibility', 'hidden');
  });
}

function chart(row) {
  const chartContainer = byId('chart');
  const width = Math.max(280, chartContainer.clientWidth || 720);
  const height = width < 500 ? 198 : 246;
  const left = 62, right = 12, top = 16, bottom = 33;
  const stacks = rows.map(item => {
    if (item.net === null) return null;
    let positiveTotal = 0;
    return projectionSeries.map(series => {
      const amount = series.amount(item);
      if (amount < 0) return { base: 0, edge: amount };
      const base = positiveTotal;
      positiveTotal += amount;
      return { base, edge: positiveTotal };
    });
  });
  const values = stacks.flatMap(stack => stack?.map(point => point.edge) ?? []);
  const max = values.some(Boolean) ? Math.max(0, ...values) : 100;
  const min = Math.min(0, ...values);
  const unit = 10 ** Math.floor(Math.log10((max - min) / 4));
  const tick = Math.ceil((max - min) / 4 / unit) * unit;
  const lower = Math.floor(min / tick) * tick;
  const upper = Math.ceil(max / tick) * tick;
  const plotWidth = width - left - right;
  const x = index => left + index / Math.max(1, rows.length - 1) * plotWidth;
  const y = value => top + (upper - value) / (upper - lower) * (height - top - bottom);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  function draw(tag, attributes, text) {
    const element = document.createElementNS(svg.namespaceURI, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    if (text !== undefined) element.textContent = text;
    svg.append(element);
    return element;
  }
  svg.setAttribute('viewBox', [0, 0, width, height].join(' '));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Stacked annual projection of net income, federal income tax, state income tax, and payroll tax. Exact amounts appear in the selected-year legend and projection table.');
  for (let index = 0; index <= Math.round((upper - lower) / tick); index += 1) {
    const value = lower + tick * index;
    draw('line', { x1: left, x2: width - right, y1: y(value), y2: y(value), stroke: value === 0 ? '#91a7b6' : '#dce5eb' });
    draw('text', { x: left - 10, y: y(value) + 4, 'text-anchor': 'end' }, (value < 0 ? '−$' : '$') + compact.format(Math.abs(value)));
  }
  const last = rows.length - 1;
  for (const index of new Set([0, Math.round(last / 3), Math.round(last * 2 / 3), last])) {
    if (last < 5 || index === 0 || index === last || index > last / 5) {
      draw('text', { x: x(index), y: height - 11, 'text-anchor': index === last && last ? 'end' : index === 0 ? 'start' : 'middle' }, rows[index].year);
    }
  }
  const runs = [];
  let run = [];
  for (const [index, stack] of stacks.entries()) {
    if (stack) {
      if (!run.length) runs.push(run);
      run.push({ x: x(index), stack });
    } else run = [];
  }
  const paths = projectionSeries.map((series, band) => ({
    ...series,
    segments: runs.map(points => {
      const edge = points.map(point => point.x + ' ' + y(point.stack[band].edge)).join(' L');
      const base = points.toReversed().map(point => point.x + ' ' + y(point.stack[band].base)).join(' L');
      return { line: 'M' + edge, fill: 'M' + edge + ' L' + base + ' Z' };
    })
  }));
  for (const series of paths) {
    draw('path', { d: series.segments.map(segment => segment.fill).join(' '), fill: series.color, 'fill-opacity': '.17' });
  }
  const selectedIndex = row.year - rows[0].year;
  const focus = x(selectedIndex);
  draw('line', { x1: focus, x2: focus, y1: top, y2: height - bottom, stroke: '#78909f', 'stroke-dasharray': '3 4' });
  paths.forEach(({ key, color, segments }, band) => {
    draw('path', { d: segments.map(segment => segment.line).join(' '), fill: 'none', stroke: color,
      'stroke-width': 2, 'stroke-linejoin': 'round', 'data-series': key });
    const point = stacks[selectedIndex]?.[band];
    if (point && (band === 0 || point.edge !== point.base)) {
      draw('circle', { cx: focus, cy: y(point.edge), r: 3.5, fill: color, stroke: 'white' });
    }
  });
  const guide = draw('line', { y1: top, y2: height - bottom, stroke: '#405e70', 'stroke-dasharray': '4 3', visibility: 'hidden' });
  const hitArea = draw('rect', { x: left, y: top, width: plotWidth, height: height - top - bottom, fill: 'transparent', class: 'projection-hit-area' });
  chartContainer.replaceChildren(svg);
  addProjectionHover(chartContainer, svg, guide, hitArea, x, plotWidth, width);
}

function details(row) {
  const figures = [
    ['Federal income tax', row.federal, rate(row.fedRate) + ' effective'],
    ['State income tax', row.state, row.stateName ? row.stateName + ' · ' + rate(row.stateRate) : 'Select a state'],
    ['Social Security tax', row.socialTax],
    ['Medicare tax', row.medicare]
  ];
  byId('tax-breakdown').replaceChildren(...figures.map(([label, value, note]) => {
    const cell = node('div');
    cell.append(node('span', label), node('strong', money(value)));
    if (note) cell.append(node('span', note));
    return cell;
  }));
  const detail = [
    ['Primary wages', money(row.wages)], ['Spouse wages', money(row.spouseWages)], ['Other taxable income', money(row.other)],
    ['Taxable pension', money(row.pension)], ['Social Security benefits', money(row.social)], ['Taxable Social Security', money(row.taxableSocial)],
    ['Taxable withdrawals', money(row.taxableWithdrawal)], ['Tax-free withdrawals', money(row.taxFree)],
    ['Investment distributions', money(row.distribution)], ['Investment value', money(row.balance)], ['Pre-tax costs', money(row.pretax)],
    ['Federal standard deduction', money(row.fedDeduction)], ['Federal taxable income', money(row.fedTaxable)],
    ['State deductions and exemptions', money(row.stateDeduction)], ['State taxable income', money(row.stateTaxable)],
    ['State effective tax rate', rate(row.stateRate)], ['Estimated dependent credit before tax limit', money(row.dependentCredit)],
    ['Children under 17', row.children], ['Dependents in college', row.students]
  ];
  if (row.stateName === 'Other') detail.splice(12, 4);
  byId('year-detail').replaceChildren(...detail.flatMap(([label, value]) => [node('dt', label), node('dd', value)]));
}

function inspect() {
  const row = rows.find(item => item.year === selectedYear) ?? rows[0];
  selectedYear = row.year;
  projectionYears.value = row.year;
  for (const key of ['gross', 'tax', 'net']) byId(key).textContent = money(row[key]);
  byId('breakdown-period').textContent = 'Selected year ' + row.year;
  const description = row.year === row.sourceYear ? 'Published base year' :
    row.year < row.sourceYear ? row.sourceYear + ' baseline used for this earlier year' :
      'Projected from ' + row.sourceYear + ' tax tables';
  byId('projection-note').textContent = [description, row.warning].filter(Boolean).join(' · ');
  const legend = byId('projection-legend');
  legend.setAttribute('aria-label', 'Projection amounts for ' + row.year);
  legend.replaceChildren(...projectionSeries.map(series => {
    const item = node('div', undefined, 'legend-item');
    item.style.setProperty('--series-color', series.color);
    item.append(node('span', series.label), node('strong', money(series.amount(row))));
    return item;
  }));
  chart(row);
  details(row);
  for (const tableRow of byId('schedule-body').rows) {
    tableRow.classList.toggle('selected', Number(tableRow.dataset.year) === row.year);
  }
}

function recalculate() {
  rows = project(plan, releases);
  const start = rows[0];
  const end = rows.at(-1);
  const release = releaseFor(releases, start.year);
  byId('release-label').textContent = release.rules.year + ' tax tables';
  byId('period').textContent = start.year === end.year ? String(start.year) : start.year + '–' + end.year;
  byId('start-balance').textContent = money(start.balance);
  byId('start-distribution').textContent = money(start.distribution);
  projectionYears.replaceChildren(...rows.map(row => new Option(row.year, row.year)));
  byId('schedule-body').replaceChildren(...rows.map(row => {
    const tr = node('tr');
    tr.dataset.year = row.year;
    const cell = node('td');
    const button = node('button', row.year);
    button.type = 'button';
    button.dataset.inspect = row.year;
    button.setAttribute('aria-label', 'Inspect ' + row.year);
    cell.append(button);
    tr.append(cell, ...[row.age, ...[row.gross, row.federal, row.state, row.socialTax + row.medicare, row.net].map(money)].map(v => node('td', v)));
    return tr;
  }));
  const sources = byId('source-list');
  sources.replaceChildren(...release.rules.sources.map(source => {
    const item = node('li', source.url ? undefined : source.name);
    if (source.url) {
      const link = node('a', source.name);
      link.href = source.url;
      item.append(link);
    }
    return item;
  }));
  inspect();
}

function save(module) {
  if (!store) return;
  const snapshot = structuredClone(plan[module]);
  writesPending += 1;
  byId('save-status').textContent = 'Saving…';
  queuedSave = queuedSave.then(async () => {
    try {
      await store.save(module, snapshot);
      channel?.postMessage('updated');
      if (failedSave) byId('save-status').textContent = 'Some edits may be unsaved';
    } catch {
      failedSave = true;
      byId('save-status').textContent = 'Save failed · export a backup';
    } finally {
      writesPending -= 1;
      if (!writesPending && !failedSave) byId('save-status').textContent = 'Saved on this device';
    }
  });
}

function setInput(event) {
  const control = event.target;
  const { module, key, index } = control.dataset;
  if (!module || control.validity?.badInput) return;
  if (event.type === 'input' && key === 'field') return;
  if (event.type === 'change' && key !== 'field' && control.type !== 'number') return;
  const record = index === undefined ? plan[module] : plan[module][Number(index)];
  if (!record) return;
  const value = control.type === 'checkbox' ? control.checked : control.value;
  if (module === 'changes' && key === 'value') record.value = value;
  else {
    const parsed = valueFor(key, schemas[module][key], value);
    if (event.type === 'change' && control.type === 'number') {
      if (parsed !== 0 || control.value !== '') control.value = parsed;
      return;
    }
    record[key] = parsed;
  }
  if (module === 'changes' && key === 'field') {
    record.value = '';
    buildRecords(module);
    document.querySelector('[data-module="changes"][data-key="field"][data-index="' + index + '"]')?.focus();
  }
  if (module === 'household') updateConditionalFields();
  recalculate();
  save(module);
}

const panels = ['overview', 'income', 'investments', 'changes', 'data', 'help'];
function route() {
  const hash = location.hash.slice(1);
  const active = panels.includes(hash) ? hash : 'overview';
  for (const panel of panels) byId('panel-' + panel).hidden = active !== panel;
  for (const link of document.querySelectorAll('.tabs a')) {
    if (link.hash === '#' + active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function download(text, type, name) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = node('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function confirmAction(title, description, button, action) {
  byId('confirm-title').textContent = title;
  byId('confirm-text').textContent = description;
  byId('confirm-yes').textContent = button;
  dialog.returnValue = '';
  dialogTask = action;
  dialog.showModal();
}

async function replacePlan(replacement) {
  await queuedSave;
  if (store) {
    if (replacement) await store.replace(replacement);
    else await store.clear();
    failedSave = false;
    byId('save-status').textContent = 'Saved on this device';
    channel?.postMessage('updated');
  }
  plan = replacement ?? emptyPlan(defaultYear);
  selectedYear = plan.household.year;
  buildForms();
  recalculate();
  byId('data-status').textContent = replacement ? 'Plan imported.' : 'Plan cleared.';
}

function attach() {
  window.addEventListener('hashchange', route);
  document.addEventListener('input', setInput);
  document.addEventListener('change', setInput);
  projectionYears.addEventListener('change', () => { selectedYear = Number(projectionYears.value); inspect(); });
  document.addEventListener('click', event => {
    const { add, remove, index, inspect: year } = event.target.closest('button')?.dataset ?? {};
    const module = add || remove;
    if (module) {
      if (add) {
        if (plan[module].length >= 500) return;
        const initial = module === 'holdings' ? { startAge: plan.household.age } : {};
        plan[module].push(normalize(module, initial, plan.household.year));
      } else plan[module].splice(Number(index), 1);
      buildRecords(module);
      if (add) byId(module + '-records').lastElementChild.querySelector('input,select')?.focus();
      else document.querySelector('[data-add="' + module + '"]')?.focus();
      recalculate();
      save(module);
    }
    if (year) {
      selectedYear = Number(year);
      inspect();
      byId('outlook-title').scrollIntoView({ block: 'center' });
      projectionYears.focus({ preventScroll: true });
    }
  });
  byId('csv').addEventListener('click', () => {
    const columns = Object.keys(rows[0]);
    const escape = value => typeof value === 'string' ? '"' + (/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"' : value ?? '';
    const csv = [columns.join(','), ...rows.map(row => columns.map(key => escape(row[key])).join(','))].join('\r\n');
    download(csv, 'text/csv;charset=utf-8', 'income-tax-projection.csv');
  });
  byId('export-plan').addEventListener('click', () => {
    download(serialize(plan), 'application/json', 'income-tax-plan-' + plan.household.year + '.json');
  });
  byId('pick-import').addEventListener('click', () => byId('import-file').click());
  byId('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error('Choose a backup smaller than 4 MB.');
      const replacement = readBackup(await file.text(), defaultYear);
      const counts = replacement.holdings.length + ' holdings, ' + replacement.changes.length + ' changes, and ' +
        replacement.dependents.length + ' dependents';
      confirmAction('Replace this plan?', 'The ' + replacement.household.year + ' backup contains ' + counts + '.',
        'Replace plan', () => replacePlan(replacement));
    } catch (error) {
      byId('data-status').textContent = 'Import failed. ' + error.message;
    }
  });
  byId('clear-plan').addEventListener('click', () => confirmAction('Clear all plan data?',
    'This removes the plan saved in this browser.', 'Clear plan', () => replacePlan(null)));
  dialog.addEventListener('close', async () => {
    const action = dialogTask;
    dialogTask = undefined;
    if (dialog.returnValue !== 'yes' || !action) return;
    try { await action(); }
    catch (error) { byId('data-status').textContent = 'Could not update the saved plan. ' + error.message; }
  });
  route();
  const observer = new ResizeObserver(() => {
    if (!byId('panel-overview').hidden && rows.length) {
      chart(rows.find(row => row.year === selectedYear) ?? rows[0]);
    }
  });
  observer.observe(byId('outlook-title').closest('.outlook-head'));
}

async function init() {
  releases = await loadReleases();
  defaultYear = releases.at(-1).rules.year;
  const states = [...new Set(releases.flatMap(release => Object.keys(release.tables.states)))].sort();
  stateOptions = { '': 'Choose a state', ...Object.fromEntries(states.map(state => [state, state])), Other: 'Other · custom rates' };
  try {
    store = await openPlanStore(defaultYear);
    if (!await store.hasPlan()) {
      let legacy;
      try { legacy = await readLegacy(defaultYear); } catch { /* The new database is still usable. */ }
      if (legacy) {
        await store.replace(legacy);
        byId('data-status').textContent = 'Previous planner entries restored. Review the imported values.';
      }
    }
    plan = await store.load();
    byId('save-status').textContent = 'Saved on this device';
  } catch {
    store = null;
    plan = emptyPlan(defaultYear);
    byId('save-status').textContent = 'Browser storage unavailable';
    byId('data-status').textContent = 'Export a backup before leaving this session.';
  }
  buildForms();
  attach();
  recalculate();
  if (store && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('schnacker-income-tax-plan');
    channel.onmessage = async () => {
      await queuedSave;
      try {
        const savedPlan = await store.load();
        if (writesPending || failedSave || JSON.stringify(savedPlan) === JSON.stringify(plan)) return;
        plan = savedPlan;
        buildForms();
        recalculate();
      } catch {
        byId('save-status').textContent = 'Could not refresh saved plan';
      }
    };
  }
}

init().catch(error => {
  byId('save-status').textContent = 'Planner unavailable';
  const message = byId('app-error');
  message.textContent = 'Could not open the planner. ' + error.message;
  message.hidden = false;
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./serviceworker.js').catch(() => {});
