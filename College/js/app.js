import { annualDefaults } from '../data/annual-defaults.js';
import { freshPlan, householdFields, recordFields, incomeAdjustmentFields, investmentAdjustmentFields, readField, validatePlan } from './plan-schema.js?v=15';
import { loadPlan, savePlan, clearPlan, readBackup } from './plan-store.js?v=15';
import { renderDashboard } from './dashboard.js?v=15';

const byId = id => document.getElementById(id);
const year = new Date().getFullYear();
const views = Array.from(document.querySelectorAll('.view'));
const links = Array.from(document.querySelectorAll('nav a'));
const lists = {
  students: ['student-records', 'Child', 'No children added.'],
  holdings: ['holdings', 'Investment', 'No additional investments.'],
  adjustments: ['adjustment-records', 'Yearly adjustment', 'No yearly changes added.'],
};
let plan = freshPlan(year);
let revision = null;
let pending = Promise.resolve();
let edits = 0;
let activeView;
let databaseReady = false;
let nextFieldId = 0;
let mainInvestment;

function status(message, error = false) {
  byId('status').textContent = message;
  byId('status').classList.toggle('error', error);
}

function backupStatus(message, error = false) {
  const notice = byId('backup-status');
  notice.textContent = message;
  notice.hidden = false;
  notice.classList.toggle('error', error);
}

function hasInputs() {
  const { startYear, includeSpouse, ...fields } = plan.household;
  return startYear !== year || includeSpouse || Object.values(fields).some(value => value != null) ||
    Object.keys(lists).some(key => plan[key].length);
}

function examplePlan() {
  const example = annualDefaults.example;
  const sample = freshPlan(year);
  const { openingBalance, extra, growth, salaryGrowth, primarySalary, primaryRate } = example;
  Object.assign(sample.household, { salaryGrowth, primarySalary, fundFromSalary: true });
  sample.holdings.push({
    id: 'example-investment', name: 'Example college fund', type: '529 plan',
    balance: openingBalance, extra, growth, primaryRate, extraGrowth: 0,
  });
  sample.students.push({
    id: 'example-student', name: 'Example student', start: year + example.yearsUntilCollege,
    duration: example.duration, cost: example.cost, base: annualDefaults.edition, inflation: example.inflation,
  });
  return sample;
}

function showProjection() {
  if (activeView !== 'home') return;
  const preview = !hasInputs();
  renderDashboard(preview ? examplePlan() : plan, preview);
}

function queueSave() {
  const snapshot = structuredClone(plan);
  const edit = ++edits;
  if (!databaseReady) return;
  status('Saving…');
  pending = pending.then(async () => {
    try {
      revision = await savePlan(snapshot, revision);
      if (edit === edits) status('Saved on this device');
    } catch (error) {
      if (edit === edits) status(error.message, true);
    }
  });
}

function route(focusHeading = false) {
  const target = window.location.hash.slice(1);
  if (target === 'main') {
    byId('main').focus();
    if (activeView) return;
  }
  const planSection = target === 'investments' || target === 'students';
  activeView = planSection ? 'household' : views.some(view => view.id === target) ? target : 'home';
  views.forEach(view => { view.hidden = view.id !== activeView; });
  if (activeView === 'adjustments') renderList('adjustments');
  byId('location').textContent = byId(activeView).querySelector('h1').textContent;
  links.forEach(link => {
    if (link.hash === '#' + activeView) {
      link.setAttribute('aria-current', 'page');
      byId('location').textContent = link.textContent;
    } else {
      link.removeAttribute('aria-current');
    }
  });
  showProjection();
  if (planSection) {
    const heading = byId(target).querySelector('h2');
    heading.focus({ preventScroll: true });
    byId(target).scrollIntoView();
  } else if (focusHeading) {
    const heading = byId(activeView).querySelector('h1');
    heading.tabIndex = -1;
    heading.focus();
    window.scrollTo(0, 0);
  }
}

function control(key, definition, record, onEdit) {
  const [title, rules, stepping] = definition;
  const field = document.createElement('div');
  field.className = 'field';
  const label = document.createElement('label');
  label.textContent = title;
  const isSelect = rules !== 'text' && typeof rules[0] === 'string';
  const input = document.createElement(isSelect ? 'select' : 'input');
  input.id = `field-${++nextFieldId}`;
  label.htmlFor = input.id;
  if (isSelect) {
    input.add(new Option('Select a type', ''));
    rules.forEach(type => input.add(new Option(type, type)));
  } else if (rules === 'text') {
    input.type = 'text';
    input.maxLength = 120;
  } else {
    input.type = 'number';
    const [min, max, step = 1] = rules;
    Object.assign(input, { min, max, step, inputMode: step < 1 ? 'decimal' : 'numeric' });
  }
  input.value = record[key] ?? '';
  input.addEventListener('input', () => {
    if (!input.validity.valid) {
      input.setAttribute('aria-invalid', 'true');
      input.reportValidity();
      return;
    }
    input.removeAttribute('aria-invalid');
    const value = input.type === 'number' && input.value !== '' ? input.valueAsNumber : input.value;
    record[key] = readField(value, definition);
    onEdit?.();
    queueSave();
  });
  input.addEventListener('blur', () => {
    if (!input.validity.valid) {
      input.value = record[key] ?? '';
      input.removeAttribute('aria-invalid');
    }
  });
  field.append(label, stepping ? withStepper(input, title, rules, stepping) : input);
  return field;
}

function withStepper(input, title, [min, max], { increment, startAtCurrentYear, showStartingYear }) {
  const stepper = document.createElement('div');
  stepper.className = 'stepper';
  if (showStartingYear) input.placeholder = String(year);

  function step(direction) {
    const current = input.valueAsNumber;
    const next = Number.isNaN(current) && startAtCurrentYear
      ? year
      : (Number.isNaN(current) ? 0 : current) + direction * increment;
    input.value = String(Math.min(max, Math.max(min, Number(next.toFixed(2)))));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function stepButton(text, action, direction) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', `${action} ${title}`);
    button.addEventListener('click', () => step(direction));
    return button;
  }

  input.addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    step(event.key === 'ArrowUp' ? 1 : -1);
  });
  stepper.append(input, stepButton('−', 'Decrease', -1), stepButton('+', 'Increase', 1));
  return stepper;
}

function investmentDefinition(key, definition) {
  if (!plan.household.fundFromSalary) return definition;
  const [label, ...rules] = definition;
  if (key === 'extra') return [label.replace(/annual/i, match => match === 'Annual' ? 'Additional annual' : 'additional annual'), ...rules];
  if (key === 'extraGrowth') return ['Annual change in additional contribution (%)', ...rules];
  return definition;
}

function fieldControls(fields, record, investment = false) {
  return Object.entries(fields)
    .filter(([key]) => plan.household.includeSpouse || !key.startsWith('spouse'))
    .filter(([key]) => !investment || plan.household.fundFromSalary || !['primaryRate', 'spouseRate'].includes(key))
    .map(([key, definition]) => control(key, investment ? investmentDefinition(key, definition) : definition, record));
}

function adjustmentControls(record) {
  const label = document.createElement('label');
  label.className = 'field';
  label.textContent = 'Apply to';
  const select = document.createElement('select');
  select.add(new Option('Household income', ''));
  plan.holdings.forEach((holding, index) => {
    select.add(new Option(holding.name?.trim() || `Investment ${index + 1}`, holding.id));
  });
  select.value = record.investmentId ?? '';
  label.append(select);
  const targetedFields = document.createElement('div');
  targetedFields.className = 'fields adjustment-fields';
  const renderTarget = () => targetedFields.replaceChildren(...fieldControls(
    record.investmentId ? investmentAdjustmentFields : incomeAdjustmentFields, record, Boolean(record.investmentId)
  ));
  select.addEventListener('change', () => {
    record.investmentId = select.value || null;
    renderTarget();
    queueSave();
  });
  renderTarget();
  return [control('year', recordFields.adjustments.year, record), label, targetedFields];
}

function renderList(key, focusId) {
  const [listId, singular, empty] = lists[key];
  const container = byId(listId);
  container.replaceChildren();
  const first = key === 'holdings' ? 1 : 0;
  const records = plan[key].slice(first);
  if (!records.length) {
    const message = document.createElement('p');
    message.className = 'muted';
    message.textContent = empty;
    container.append(message);
  }
  records.forEach((record, index) => {
    const item = document.createElement('fieldset');
    item.className = 'record';
    const heading = document.createElement('legend');
    const label = `${singular} ${index + first + 1}`;
    heading.textContent = label;
    const fields = document.createElement('div');
    fields.className = 'fields';
    fields.append(...(key === 'adjustments' ? adjustmentControls(record) : fieldControls(recordFields[key], record, key === 'holdings')));
    const remove = removeButton(key, record, label.toLowerCase(), 'Remove');
    item.append(heading, fields, remove);
    container.append(item);
    if (focusId === record.id) fields.querySelector('input, select')?.focus();
  });
}

function removeButton(key, record, label, buttonText) {
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = buttonText;
  remove.className = 'quiet';
  remove.setAttribute('aria-label', `Remove ${label}`);
  remove.addEventListener('click', async () => {
    const linked = key === 'holdings' && plan.adjustments.some(change => change.investmentId === record.id);
    const message = linked ? 'This investment and its yearly adjustments will be removed from the saved plan.'
      : 'This entry will be removed from the saved plan.';
    if (!(await confirmAction('Remove this entry?', message, 'Remove', true))) return;
    plan[key] = plan[key].filter(entry => entry.id !== record.id);
    if (key === 'holdings') {
      plan.adjustments = plan.adjustments.filter(change => change.investmentId !== record.id);
      renderMainInvestment();
    }
    queueSave();
    renderList(key);
    document.querySelector(`[data-add="${key}"]`).focus();
  });
  return remove;
}

function updateInvestmentNote() {
  const note = byId('main-fund-note');
  const name = mainInvestment.name?.trim();
  note.textContent = name ? `Main investment · ${name}` : 'Main investment';
  note.hidden = !name && plan.holdings.length < 2;
}

function attachMainInvestment() {
  if (!plan.holdings.length) {
    mainInvestment.id = crypto.randomUUID();
    plan.holdings.push(mainInvestment);
    byId('main-fund-remove').append(removeButton('holdings', mainInvestment, 'main investment', 'Remove main investment'));
  }
  updateInvestmentNote();
}

function renderMainInvestment() {
  mainInvestment = plan.holdings[0] ?? {};
  const groups = {
    'main-rates': plan.household.includeSpouse ? ['primaryRate', 'spouseRate'] : ['primaryRate'],
    'main-savings': ['extra', 'oneTime', 'balance', 'growth'],
    'main-fund-details': ['name', 'type', 'extraGrowth'],
  };
  for (const [id, keys] of Object.entries(groups)) {
    byId(id).replaceChildren(...keys.map(key => control(key, investmentDefinition(key, recordFields.holdings[key]), mainInvestment, attachMainInvestment)));
  }
  const remove = byId('main-fund-remove');
  remove.replaceChildren();
  if (plan.holdings.length) remove.append(removeButton('holdings', mainInvestment, 'main investment', 'Remove main investment'));
  updateInvestmentNote();
}

function renderInputs() {
  const groups = {
    'projection-fields': ['startYear', 'endYear'],
    'income-fields': ['primarySalary', 'salaryGrowth'],
    'spouse-fields': ['spouseSalary', 'spouseSalaryGrowth'],
    'stop-fields': ['primaryStop', 'spouseStop'],
    'work-fields': ['primaryStopWork', 'spouseStopWork'],
  };
  for (const [id, keys] of Object.entries(groups)) {
    const fields = Object.fromEntries(keys.map(key => [key, householdFields[key]]));
    byId(id).replaceChildren(...fieldControls(fields, plan.household));
  }
  byId('spouse').checked = plan.household.includeSpouse;
  byId('spouse-fields').hidden = !plan.household.includeSpouse;
  byId('spouse-growth-note').hidden = !plan.household.includeSpouse;
  byId('salary-yes').checked = plan.household.fundFromSalary === true;
  byId('salary-no').checked = plan.household.fundFromSalary === false;
  for (const id of ['salary-fields', 'work-settings']) {
    byId(id).hidden = !plan.household.fundFromSalary;
  }
  renderMainInvestment();
  Object.keys(lists).forEach(key => renderList(key));
}

function confirmAction(title, message, action, destructive = false) {
  const dialog = byId('confirm');
  byId('confirm-title').textContent = title;
  byId('confirm-text').textContent = message;
  const button = byId('confirm-action');
  button.textContent = action;
  button.className = destructive ? 'danger' : 'primary';
  dialog.returnValue = 'cancel';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.showModal();
  });
}

document.querySelectorAll('[data-add]').forEach(button => {
  button.addEventListener('click', () => {
    const key = button.dataset.add;
    if (plan[key].length >= 1000) {
      status('This section holds up to 1,000 entries.', true);
      return;
    }
    const id = crypto.randomUUID();
    const record = key === 'students' ? { base: plan.household.startYear, duration: 4 } : {};
    if (key === 'holdings') attachMainInvestment();
    plan[key].push({ id, ...record });
    if (key === 'holdings') updateInvestmentNote();
    renderList(key, id);
    queueSave();
  });
});

byId('spouse').addEventListener('change', event => {
  plan.household.includeSpouse = event.target.checked;
  renderInputs();
  queueSave();
});

byId('salary-question').addEventListener('change', event => {
  plan.household.fundFromSalary = event.target.value === 'yes';
  renderInputs();
  queueSave();
});

byId('example').addEventListener('click', () => {
  if (hasInputs()) return;
  plan = examplePlan();
  queueSave();
  renderInputs();
  window.location.hash = 'household';
});

byId('export').addEventListener('click', () => {
  const backup = new Blob([JSON.stringify(validatePlan(plan), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(backup);
  const download = document.createElement('a');
  download.href = url;
  download.download = `college-plan-${new Date().toISOString().slice(0, 10)}.json`;
  download.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  backupStatus('Backup download started.');
});

byId('import').addEventListener('click', () => byId('backup-file').click());
byId('backup-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (!databaseReady) throw new Error('Local storage is unavailable in this browser.');
    if (file.size > 2_000_000) throw new Error('Choose a backup smaller than 2 MB.');
    const imported = readBackup(await file.text());
    if (!(await confirmAction('Import this plan?', 'This replaces the current plan in this browser. Export the current plan first if you need a copy.', 'Replace plan'))) return;
    await replacePlan(imported);
    backupStatus('Backup imported and saved on this device.');
  } catch (error) {
    backupStatus(error.message, true);
  }
});

byId('clear').addEventListener('click', async () => {
  if (!(await confirmAction('Clear the saved plan?', 'This removes all saved household, student, account, and yearly adjustment data from this browser.', 'Clear saved plan', true))) return;
  try {
    if (!databaseReady) throw new Error('Local storage is unavailable in this browser.');
    await replacePlan(null);
    backupStatus('Saved plan cleared.');
  } catch (error) {
    backupStatus(error.message, true);
  }
});

async function replacePlan(replacement) {
  const main = byId('main');
  main.inert = true;
  try {
    await pending;
    revision = replacement ? await savePlan(replacement, revision) : await clearPlan(revision);
    plan = replacement ?? freshPlan(year);
    byId('table-view').value = 'summary';
    renderInputs();
    showProjection();
    status(replacement ? 'Saved on this device' : 'No saved plan on this device');
  } finally {
    main.inert = false;
    byId(replacement ? 'import' : 'clear').focus();
  }
}

try {
  const saved = await loadPlan();
  plan = saved.plan ?? plan;
  revision = saved.revision;
  databaseReady = true;
  status(saved.plan ? 'Saved on this device' : 'Changes save on this device');
} catch {
  status('Local storage unavailable. Export a backup to keep your edits.', true);
}
renderInputs();
route();
window.addEventListener('hashchange', () => route(true));

if ('serviceWorker' in navigator) {
  const showOfflineStatus = () => {
    byId('offline-status').hidden = !navigator.serviceWorker.controller;
  };
  navigator.serviceWorker.addEventListener('controllerchange', showOfflineStatus);
  showOfflineStatus();
  navigator.serviceWorker.register('./serviceworker.js').catch(error => {
    console.warn('Offline setup failed.', error);
  });
}
