import {calculate, defaults} from './pay-engine.js';
import {addInputControls} from './input-controls.js';
import {normalizeInputs,saveInputs,restoreInputs,clearInputs} from './saved-inputs.js';
const $=id=>document.getElementById(id), form=$('pay-form');
const currency=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
let data, current;
function status(text='',error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function read(){
  const result={};
  for(const [name,value] of Object.entries(defaults)){
    const element=form.elements[name];
    result[name]=typeof value==='boolean'?element.checked:typeof value==='number'?(element.value===''?0:element.valueAsNumber || Number(element.value)):element.value;
  }
  return result;
}
function fill(input){for(const [name,value] of Object.entries({...defaults,...input})){const el=form.elements[name];if(!el)continue;if(el.type==='checkbox')el.checked=value;else el.value=value;}}
function render(){
  if(!data)return;
  try{
    for(const prefix of ['retirement','roth']) {
      const isPercent=form.elements[prefix+'Mode'].value==='percent';
      for(const [suffix,active] of [['Percent',isPercent],['PerPay',!isPercent]]) {
        const el=form.elements[prefix+suffix];
        el.disabled=!active;
        el.closest('label').hidden=!active;
      }
    }
    const input=read();
    const byDependents=input.creditMode==='dependents';
    $('dependent-fields').hidden=!byDependents;$('credit-amount').hidden=byDependents;
    form.elements.credits.disabled=byDependents;
    for(const name of ['children','otherDependents','otherCredits'])form.elements[name].disabled=!byDependents;
    $('state-manual').hidden=input.stateMode!=='manual';
    form.elements.statePerPay.disabled=input.stateMode!=='manual';
    $('california-fields').hidden=input.stateMode!=='california';
    for(const name of ['caStatus','caAllowances','caDeductions'])form.elements[name].disabled=input.stateMode!=='california';
    const invalid=[...form.elements].find(el=>el.willValidate&&!el.validity.valid);
    if(invalid)throw new Error(`Check ${invalid.dataset.fieldLabel||invalid.name}: ${invalid.validationMessage}`);
    current=calculate(input,data);
    const r=current;
    $('credit-total').textContent=`Step 3 credit total used: ${currency(r.federal.credits)} per year.`;
    for(const [id,value] of Object.entries({net:r.net,monthly:r.monthlyNet,annual:r.annualNet,gross:r.gross,taxes:r.taxes,savings:r.savings,'net-total':r.net}))$(id).textContent=currency(value);
    $('period').textContent=({52:'Every week',26:'Every 2 weeks',24:'Twice a month',12:'Every month',4:'Every quarter',1:'Every year'})[input.frequency];
    $('net-caption').textContent=input.salary===0?'Enter your salary to see your paycheck.':`${input.frequency} paychecks per year · Regular pay, excluding bonus`;
    $('breakdown').replaceChildren();
    for(const [label,amount] of [['Gross pay',r.gross],...r.rows]){
      const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
      th.scope='row';th.textContent=label;td.textContent=currency(amount);tr.append(th,td);$('breakdown').append(tr);
    }
    const totals=[Math.max(0,r.net),r.taxes,r.savings,r.rows.filter(x=>x[2]==='benefit').reduce((s,x)=>s+x[1],0)];
    const total=totals.reduce((s,n)=>s+n,0);
    $('distribution').replaceChildren();
    totals.forEach((n,i)=>{const span=document.createElement('span');span.className=['take','tax','saving','benefit'][i];span.style.width=`${total?n/total*100:0}%`;$('distribution').append(span);});
    $('bonus-result').hidden=input.bonus===0;$('bonus-net').textContent=currency(r.bonus.net);
    $('bonus-detail').replaceChildren();
    for(const [label,n] of [['Federal withholding',r.bonus.federal],['State withholding',r.bonus.state],['Social Security + Medicare',r.bonus.social+r.bonus.medicare],['Pretax retirement',r.bonus.retirement]]){const line=document.createElement('div');line.textContent=`${label}: ${currency(n)}`;$('bonus-detail').append(line);}
    const methodText=input.stateMode==='manual'?'State withholding uses your entered dollars plus extra state withholding.':input.stateMode==='california'?'California withholding uses your separate DE 4 elections and EDD annualized Method B. SDI and state-specific benefit adjustments are not included.':'State withholding estimates tax on regular pay using the existing state tables. Federal W-4 entries affect only federal withholding. Use Manual for actual payroll amounts.';
    $('state-note').textContent=methodText;$('state-method-help').textContent=methodText;
    $('calculation-detail').textContent=`IRS adjusted annual wages: ${currency(r.federal.adjusted)}. Annual tentative federal withholding: ${currency(r.federal.annual)}. W-4 credits are applied before additional per-paycheck withholding.`;
    let message=r.net<0?'Deductions exceed gross pay. Review your inputs.':'';
    if(render.shouldSave!==false)try{saveInputs(localStorage,data.payroll.year,input);$('save-status').textContent=`Inputs saved on this device for ${data.payroll.year}. Export a backup to use elsewhere.`;}catch{$('save-status').textContent='Browser saving is unavailable. Export inputs to keep a copy.';}
    status(message,r.net<0);
  }catch(error){current=null;status(error.message,true);for(const id of ['net','monthly','annual','gross','taxes','savings','net-total'])$(id).textContent='—';$('breakdown').replaceChildren();$('distribution').replaceChildren();$('bonus-result').hidden=true;$('net-caption').textContent='Update your inputs to calculate.';$('calculation-detail').textContent='';}
}
function validateImport(input){
  const result=normalizeInputs(input);
  if(!data.income.states[result.state])throw new Error('This file has an unsupported state.');
  calculate(result,data);
  return result;
}
form.addEventListener('submit',e=>e.preventDefault());
const edited=()=>{render.shouldSave=true;render();};
form.addEventListener('input',edited);
addInputControls(form,edited);
$('reset').addEventListener('click',()=>{fill(defaults);render.shouldSave=false;render();try{clearInputs(localStorage,data.payroll.year);$('save-status').textContent='Saved inputs cleared for this year. New entries will save automatically.';}catch{$('save-status').textContent='Unable to clear browser storage.';}});
$('print').addEventListener('click',()=>window.print());
$('import-trigger').addEventListener('click',()=>$('import').click());
$('export').addEventListener('click',()=>{
  if(!current){status('Enter valid inputs before exporting.',true);return;}
  const blob=new Blob([JSON.stringify({schemaVersion:2,year:data.payroll.year,inputs:current.input},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='my-pay-inputs-2026.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('import').addEventListener('change',async e=>{
  try{const file=e.target.files[0];if(!file)return;if(file.size>100000)throw new Error('Choose a My Pay input JSON file smaller than 100 KB.');const parsed=JSON.parse(await file.text());if(![1,2].includes(parsed.schemaVersion)||parsed.year!==data.payroll.year)throw new Error('Choose a My Pay input file for the loaded tax year.');const input=validateImport(parsed.inputs);fill(input);edited();}catch(error){status(error.message,true);}finally{e.target.value='';}
});
try{
  const names={income:'income-tax',withholding:'federal-withholding',payroll:'payroll',assumptions:'pay-assumptions',stateWithholding:'state-withholding'};
  data=window.myPayEmbeddedData || Object.fromEntries(await Promise.all(Object.entries(names).map(async([name,file])=>{const response=await fetch(`data/${file}-2026.json`);if(!response.ok)throw new Error(`Unable to load ${file} data.`);return [name,await response.json()];})));
  for(const state of Object.keys(data.income.states).sort()){const option=document.createElement('option');option.value=state;option.textContent=state==='New Mexica'?'New Mexico':state;$('state').append(option);}
  let input=defaults,notice='';
  try{input=restoreInputs(localStorage,data.payroll.year)||defaults;}catch{notice='Saved inputs could not be restored. They have not been overwritten. Import a backup or correct your entries to save again.';}
  fill(input);render.shouldSave=false;render();if(notice)status(notice);
  if(location.protocol!=='file:' && 'serviceWorker' in navigator)navigator.serviceWorker.register('./serviceworker.js').catch(()=>{});
}catch(error){status(`${error.message} Start the app through a local web server, then reload.`,true);}




