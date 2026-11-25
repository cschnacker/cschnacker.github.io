import { project } from './projection.js?v=15';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', style: 'currency', currency: 'USD', maximumFractionDigits: 1 });
const byId = id => document.getElementById(id);
const canvas = document.createElement('canvas');
canvas.setAttribute('role', 'img');
byId('chart').append(canvas);
let result;

function drawChart() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!result?.rows.length || !width || !height) return;
  const { rows } = result;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);
  const left = 70, right = width - 16, top = 14, bottom = height - 32;
  const highest = Math.max(1, ...rows.map(row => Math.max(row.balance, row.cost)));
  const lowest = Math.min(0, ...rows.map(row => row.balance));
  const xStep = (right - left) / rows.length;
  const x = index => left + xStep * (index + 0.5);
  const y = value => bottom - (bottom - top) * (value - lowest) / (highest - lowest);
  ctx.font = '12px system-ui';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let tick = 0; tick <= 4; tick++) {
    const value = highest - (highest - lowest) * tick / 4;
    const line = y(value);
    ctx.strokeStyle = '#e4eced';
    ctx.beginPath();
    ctx.moveTo(left, line);
    ctx.lineTo(right, line);
    ctx.stroke();
    ctx.fillStyle = '#53686d';
    ctx.fillText(compact.format(value), left - 9, line, left - 12);
  }
  ctx.strokeStyle = '#9cb0b2';
  ctx.beginPath();
  ctx.moveTo(left, y(0));
  ctx.lineTo(right, y(0));
  ctx.stroke();
  ctx.fillStyle = '#e6a04b';
  const bar = Math.min(xStep * 0.6, 34);
  rows.forEach((row, index) => ctx.fillRect(x(index) - bar / 2, y(row.cost), bar, y(0) - y(row.cost)));
  ctx.strokeStyle = '#0c7568';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  rows.forEach((row, index) => index ? ctx.lineTo(x(index), y(row.balance)) : ctx.moveTo(x(index), y(row.balance)));
  ctx.stroke();
  ctx.textAlign = 'center';
  const labels = Math.min(rows.length, Math.max(2, Math.floor((right - left) / 60)));
  for (let j = 0; j < labels; j++) {
    const i = labels === 1 ? 0 : Math.round(j * (rows.length - 1) / (labels - 1));
    ctx.fillStyle = '#53686d';
    ctx.fillText(rows[i].year, Math.min(right - 13, Math.max(left + 13, x(i))), bottom + 16);
  }
  if (rows.length < 26) {
    ctx.fillStyle = '#0c7568';
    rows.forEach((row, index) => {
      ctx.beginPath();
      ctx.arc(x(index), y(row.balance), 3.3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
}

new ResizeObserver(drawChart).observe(byId('chart'));

const column = (name, key, format = value => dollars.format(value)) => [name, row => row[key] == null ? '—' : format(row[key])];
const columns = {
  summary: [column('Opening balance', 'beginning'), column('Investment gain', 'earnings'), column('Net contributions', 'contributions'), column('College costs', 'cost'), column('Ending balance', 'balance'), column('Effective return', 'rate', value => `${value.toFixed(2)}%`)],
  income: [column('Primary salary', 'primaryPay'), column('Spouse salary', 'spousePay')],
  contributions: [column('Primary', 'primary'), column('Spouse', 'spouse'), column('Annual', 'recurring'), column('One-time', 'oneTime'), column('Net contributions', 'contributions')],
};

function appendCell(row, tag, value, scope) {
  const cell = document.createElement(tag);
  if (scope) cell.scope = scope;
  cell.textContent = value;
  row.append(cell);
  return cell;
}

function drawSchedule() {
  const table = byId('schedule');
  table.replaceChildren();
  byId('schedule-empty').hidden = Boolean(result?.rows.length);
  if (!result?.rows.length) return;
  const selected = byId('table-view').value;
  const investmentColumns = [
    ...result.holdings.map((holding, index) => [
      holding.name?.trim() || `Investment ${index + 1}`,
      row => dollars.format(row.investmentBalances[index]),
    ]),
    column('Unfunded amount', 'unpaid'),
  ];
  const fields = selected === 'investments' ? investmentColumns : columns[selected] ?? [
    column('Total college costs', 'cost'),
    ...result.completeStudents.map((student, index) => [
      student.name?.trim() || `Student ${index + 1}`,
      row => dollars.format(row.studentCosts[index]),
    ]),
  ];
  const header = table.createTHead().insertRow();
  appendCell(header, 'th', 'Year', 'col');
  fields.forEach(([label]) => appendCell(header, 'th', label, 'col'));
  const body = table.createTBody();
  result.rows.forEach(entry => {
    const row = body.insertRow();
    appendCell(row, 'th', entry.year, 'row');
    fields.forEach(([, value]) => {
      const text = value(entry);
      appendCell(row, 'td', text).classList.toggle('negative', text.startsWith('-'));
    });
  });
}

byId('table-view').addEventListener('change', drawSchedule);

export function renderDashboard(plan, preview = false) {
  result = project(plan);
  const { rows, errors, pendingStudents, outsideYears, totalCosts, gap, gapYear, firstShortfall } = result;
  const pool = byId('metrics');
  const chart = byId('chart');
  const message = byId('projection-message');
  const last = rows.at(-1);
  const notices = [...errors];
  if (pendingStudents) notices.push(`${pendingStudents} incomplete student record${pendingStudents === 1 ? ' is' : 's are'} excluded. Add attendance years, annual cost, and a cost base year.`);
  if (outsideYears) notices.push('Some attendance years or adjustments fall outside the projection window.');
  message.textContent = notices.join(' ');
  message.hidden = !notices.length;
  const cards = [
    ['Starting investments', rows[0]?.beginning, last ? `Opening balance in ${rows[0].year}` : 'Enter an investment balance'],
    ['Total college costs', totalCosts, last ? 'Across the projection years' : 'Add student costs'],
    ['Largest funding gap', gap, gapYear ? `Largest in ${gapYear} · first gap in ${firstShortfall}` : last ? 'Based on year-end balances' : 'Enter plan details'],
    ['Ending balance', last?.balance, last ? `Projected at the end of ${last.year}` : 'Enter plan details'],
  ];
  pool.replaceChildren(...cards.map(([label, amount, detail], index) => {
    const article = document.createElement('article');
    article.className = 'metric';
    const title = document.createElement('h2');
    title.textContent = label;
    const value = document.createElement('strong');
    value.textContent = amount == null ? '—' : dollars.format(amount);
    if (amount < 0 || (index === 2 && amount > 0)) value.className = 'negative';
    const caption = document.createElement('p');
    caption.textContent = detail;
    article.append(title, value, caption);
    return article;
  }));
  byId('example-banner').hidden = !preview;
  byId('chart-period').textContent = last ? `${rows[0].year}–${last.year}` : '';
  byId('chart-empty').hidden = Boolean(last);
  chart.hidden = !last;
  canvas.setAttribute('aria-label', last ? `Ending savings and annual college costs for ${rows[0].year} through ${last.year}. See the table for exact amounts.` : 'No projection');
  drawChart();
  drawSchedule();
}
