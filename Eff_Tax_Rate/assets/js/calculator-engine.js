(function (root) {
  'use strict';
  function calculate(income, schedule) {
    if (!Number.isFinite(income) || income < 0 || income > 1e12) throw new Error('Enter taxable income between 0 and 1 trillion dollars.');
    if (!Array.isArray(schedule) || !schedule.length || schedule.length > 14) throw new Error('Enter between 1 and 14 brackets.');
    let lower = 0, total = 0;
    const brackets = schedule.map(function (b, i) {
      if (!Number.isFinite(b.rate) || b.rate < 0 || b.rate > 100) throw new Error('Bracket ' + (i + 1) + ': enter a rate between 0 and 100%.');
      if (i === schedule.length - 1) {
        if (b.upper !== null) throw new Error('The final bracket must have no upper limit.');
      } else if (!Number.isFinite(b.upper) || b.upper <= lower || b.upper > 1e12) {
        throw new Error('Bracket ' + (i + 1) + ': enter an upper limit greater than ' + lower.toLocaleString('en-US') + ' and no more than 1 trillion.');
      }
      const portion = Math.max(0, Math.min(income, b.upper === null ? Infinity : b.upper) - lower);
      const tax = portion * (b.rate / 100);
      const row = {lower: lower, upper: b.upper, rate: b.rate, portion: portion, tax: tax};
      total += tax;
      lower = b.upper;
      return row;
    });
    return {total: total, effective: income === 0 ? 0 : total / income * 100, brackets: brackets};
  }
  root.CustomTax = {calculate: calculate};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CustomTax;
})(typeof window === 'undefined' ? globalThis : window);
