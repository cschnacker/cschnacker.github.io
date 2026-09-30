(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'custom-effective-tax-inputs-v1';
  const money = n => n.toLocaleString('en-US', {style:'currency',currency:'USD'});
  let rows = [{upper:'', rate:''}];
  let touched = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved.income === 'string' && Array.isArray(saved.rows) && saved.rows.length >= 1 && saved.rows.length <= 14 && saved.rows.every(r => r && typeof r.upper === 'string' && typeof r.rate === 'string')) {
      rows = saved.rows; $('income').value = saved.income; $('remember').checked = true; touched = true;
    }
  } catch (_) { $('storage-status').textContent = 'Saved entries are unavailable. You can still use the calculator.'; }
  function save() {
    try {
      if ($('remember').checked) localStorage.setItem(key, JSON.stringify({income:$('income').value, rows:rows}));
      else localStorage.removeItem(key);
      $('storage-status').textContent = $('remember').checked ? 'Entries saved in this browser.' : '';
    } catch (_) { $('storage-status').textContent = 'This browser could not save or clear stored entries. Use browser settings to clear any previously saved entries.'; }
  }
  function draw() {
    $('bracket-inputs').replaceChildren();
    rows.forEach((row, i) => {
      const field = document.createElement('fieldset'); field.className = 'bracket-row';
      const legend = document.createElement('legend'); legend.textContent = 'Bracket ' + (i+1); field.append(legend);
      const range = document.createElement('p'); range.className = 'range'; range.id = 'range-' + i; field.append(range);
      if (i < rows.length - 1) addInput('Upper limit ($)', 'upper', row.upper, 1e12);
      else { const note = document.createElement('p'); note.className = 'muted'; note.textContent = 'No upper limit'; field.append(note); }
      addInput('Tax rate (%)', 'rate', row.rate, 100);
      if (rows.length > 1) {
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove bracket'; remove.setAttribute('aria-label','Remove bracket ' + (i+1));
        remove.addEventListener('click', () => { rows.splice(i,1); draw(); touched=true; update(); save(); $('add-bracket').focus(); }); field.append(remove);
      }
      $('bracket-inputs').append(field);
      function addInput(title, prop, value, max) {
        const label = document.createElement('label'); label.textContent = title;
        const input = document.createElement('input'); Object.assign(input,{type:'number', min:'0', max:String(max), step:'any', required:true, value:value, inputMode:'decimal', id:prop+'-'+i});
        input.setAttribute('aria-label','Bracket '+(i+1)+' '+title); input.setAttribute('aria-describedby','error');
        input.addEventListener('input', () => { row[prop]=input.value; touched=true; update(); save(); }); label.append(input); field.append(label);
      }
    });
    $('add-bracket').disabled = rows.length >= 14;
  }
  function number(value) { return value.trim() === '' ? NaN : Number(value); }
  function update() {
    rows.forEach((row,i) => { const previous = i === 0 ? 0 : number(rows[i-1].upper); $('range-'+i).textContent = i === 0 ? 'Starts at $0' : Number.isFinite(previous) ? 'Income above '+money(previous) : 'Enter the previous bracket’s upper limit'; });
    document.querySelectorAll('#calculator input[type=number]').forEach(input => input.removeAttribute('aria-invalid'));
    $('brackets').replaceChildren();
    try {
      const result = CustomTax.calculate(number($('income').value), rows.map((r,i) => ({upper:i === rows.length-1 ? null : number(r.upper),rate:number(r.rate)})));
      $('effective').textContent = result.effective.toFixed(2)+'%'; $('total').textContent = money(result.total); $('income-summary').textContent = money(number($('income').value)); $('breakdown-total').textContent = money(result.total);
      $('context').textContent = 'Your custom '+rows.length+'-bracket schedule'; $('error').hidden = true;
      result.brackets.forEach(b => {
        const tr = document.createElement('tr'); if(b.portion>0) tr.className='used';
        const range = b.upper === null ? 'Above '+money(b.lower) : (b.lower === 0 ? '$0' : 'Above '+money(b.lower))+' to '+money(b.upper);
        [range,b.rate+'%',money(b.portion),money(b.tax)].forEach(value => {const td=document.createElement('td'); td.textContent=value; tr.append(td);}); $('brackets').append(tr);
      });
    } catch (error) {
      ['effective','total','income-summary','breakdown-total'].forEach(id => $(id).textContent='—');
      $('context').textContent='Complete your income and bracket rates'; $('error').textContent=error.message; $('error').hidden=!touched;
      if(touched) document.querySelectorAll('#calculator input[type=number]').forEach(input => {if(!input.validity.valid) input.setAttribute('aria-invalid','true');});
    }
  }
  $('calculator').addEventListener('submit', event => event.preventDefault());
  $('income').addEventListener('input', () => {touched=true; update(); save();});
  $('remember').addEventListener('change', save);
  $('add-bracket').addEventListener('click', () => { if(rows.length>=14)return; rows[rows.length-1].upper=''; rows.push({upper:'',rate:''}); draw(); touched=true; update(); save(); $('upper-'+(rows.length-2)).focus(); });
  $('reset').addEventListener('click', () => { rows=[{upper:'',rate:''}]; $('income').value=''; $('remember').checked=false; touched=false; draw(); update(); save(); $('income').focus(); });
  let installPrompt;
  window.addEventListener('beforeinstallprompt', event => {event.preventDefault(); installPrompt=event; $('install').hidden=false;});
  $('install').addEventListener('click', async () => {if(installPrompt){await installPrompt.prompt(); installPrompt=null; $('install').hidden=true;}});
  window.addEventListener('appinstalled', () => {$('install').hidden=true; installPrompt=null;});
  if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('serviceworker.js').then(() => navigator.serviceWorker.ready).then(() => {$('offline-status').textContent='Ready for offline use.';}).catch(() => {$('offline-status').textContent='Offline setup is unavailable. You can still calculate while this page is open.';});
  }
  draw(); update();
})();
