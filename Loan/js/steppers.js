// Keep step="any" so exact typed amounts remain valid, including cents.
export function addAmountStepper(input, increment, label) {
  input.step = 'any';
  input.inputMode = 'decimal';
  let container = input.parentElement;
  if (!container.classList.contains('unit-input')) {
    container = document.createElement('div');
    container.className = 'unit-input';
    input.replaceWith(container);
    container.append(input);
  }
  container.classList.add('amount-stepper');
  input.dataset.increment = increment;
  const adjust = direction => {
    const current = input.value === '' ? 0 : Number(input.value);
    if (!Number.isFinite(current)) return;
    const minimum = input.min === '' ? -Infinity : Number(input.min);
    const maximum = input.max === '' ? Infinity : Number(input.max);
    // Remove binary floating-point noise without rounding exact entries to cents.
    input.value = String(Math.min(maximum, Math.max(minimum,
      Number((current + direction * increment).toPrecision(15)))));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  input.addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    adjust(event.key === 'ArrowUp' ? 1 : -1);
  });
  const controls = document.createElement('div');
  controls.className = 'amount-controls';
  for (const [direction, symbol, action] of [[1, '+', 'Increase'], [-1, '−', 'Decrease']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = symbol;
    button.setAttribute('aria-label', `${action} ${label} by $${increment.toLocaleString('en-US')}`);
    button.title = button.getAttribute('aria-label');
    button.addEventListener('click', () => adjust(direction));
    controls.append(button);
  }
  container.append(controls);
}
