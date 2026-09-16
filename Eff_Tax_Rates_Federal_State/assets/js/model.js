(() => {
  const byId = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
  const boundary = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  let kind = 'Federal';
  if (!window.TaxModel) {
    byId('error').hidden = false;
    byId('error').textContent = 'The calculator could not load. Please reload the page.';
    return;
  }
  byId('tax-year').textContent = TaxModel.year;
  TaxModel.states.forEach(state => byId('state').add(new Option(state, state)));
  byId('state').value = 'Colorado';
  function render() {
    byId('state-field').hidden = kind !== 'State';
    byId('state-note').hidden = kind !== 'State';
    document.querySelectorAll('[data-kind]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.kind === kind)));
    try {
      const input = byId('income');
      if (input.validity.badInput || input.validity.rangeUnderflow || input.value.trim() === '') throw new Error('Enter a valid taxable income of zero or more.');
      const income = Number(input.value);
      const result = TaxModel.calculate(income, byId('filing').value, kind, byId('state').value);
      const context = (kind === 'Federal' ? kind : byId('state').value) + ' · ' + byId('filing').selectedOptions[0].text;
      byId('effective').textContent = (result.effective * 100).toFixed(2) + '%';
      byId('context').textContent = context;
      byId('total').textContent = byId('breakdown-total').textContent = money(result.total);
      byId('income-summary').textContent = money(income);
      byId('bracket-caption').textContent = TaxModel.year + ' ' + context;
      byId('brackets').replaceChildren();
      const taxableBrackets = result.brackets.filter(bracket => Math.round(bracket.tax * 100) > 0);
      taxableBrackets.forEach(bracket => {
        const tr = document.createElement('tr');
        if (bracket.portion > 0) tr.className = 'used';
        const range = bracket.upper === null ? 'Over ' + boundary(bracket.lower) : bracket.lower === 0 ? '$0 to ' + boundary(bracket.upper) : 'Over ' + boundary(bracket.lower) + ' to ' + boundary(bracket.upper);
        [range, new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(bracket.rate) + '%',money(bracket.portion),money(bracket.tax)].forEach(value => {
          const td = document.createElement('td'); td.textContent = value; tr.append(td);
        });
        byId('brackets').append(tr);
      });
      if (taxableBrackets.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.textContent = 'No tax due for this income.';
        tr.append(td);
        byId('brackets').append(tr);
      }
      byId('error').hidden = true;
      input.removeAttribute('aria-invalid');
    } catch(error) {
      byId('error').textContent = error.message;
      byId('error').hidden = false;
      byId('income').setAttribute('aria-invalid','true');
      ['effective','total','income-summary','breakdown-total'].forEach(id => byId(id).textContent = '—');
      byId('brackets').replaceChildren();
    }
  }
  document.querySelectorAll('[data-kind]').forEach(button => button.addEventListener('click',() => {kind = button.dataset.kind; render();}));
  byId('calculator').addEventListener('input',render);
  byId('calculator').addEventListener('change',render);
  byId('calculator').addEventListener('submit',event => {event.preventDefault();render();});
  render();
})();
