import { SETTINGS, emptyPlan, emptyModification } from '../data/defaults.js';
import { loadPlan, savePlan, clearPlan } from './storage.js';
import { calculate } from './calculations.js';
import { addAmountStepper } from './steppers.js';
import { exportPlan, importPlan } from './plan-files.js';

const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(value);
const preciseMoney = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(value);
const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const duration = count => {
  const years = Math.floor(count/12), months = count%12;
  return [years ? `${years} ${years===1?'year':'years'}` : '', months ? `${months} ${months===1?'month':'months'}` : ''].filter(Boolean).join(', ');
};
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const loaded = loadPlan(storage);
let plan = loaded.plan, result;
let pendingImport = null;
const inputKeys = Object.keys(emptyPlan()).filter(key => typeof emptyPlan()[key] === 'string' && key !== 'view');
function status(message) { $('save-status').textContent = message; }
function persist() { status(savePlan(storage,plan) ? 'Saved on this device' : 'Not saved — browser storage unavailable'); }
function fillForm() {
  inputKeys.forEach(key => { $(key).value = plan[key]; });
  $('modificationsEnabled').checked = plan.modificationsEnabled;
  renderModifications();
}
const modFields = [['year','Change year'],['years','Remaining term (years)'],['balance','Principal balance ($)'],['rate','Interest rate (%)'],['taxes','Annual taxes ($)'],['insurance','Annual insurance ($)'],['extra','Extra principal / year ($)'],['lumpSum','One-time payment ($)']];
function renderModifications() {
  $('modification-content').hidden = !plan.modificationsEnabled;
  $('modifications').replaceChildren();
  plan.modifications.forEach((change,index) => {
    const section = document.createElement('section'); section.className = 'modification';
    const title = document.createElement('div'); title.className = 'mod-title';
    const heading = document.createElement('h3'); heading.textContent = `Change ${index+1}`;
    const remove = document.createElement('button'); remove.type='button'; remove.className='text-button'; remove.textContent='Remove'; remove.setAttribute('aria-label',`Remove change ${index+1}`);
    remove.addEventListener('click',()=>{plan.modifications.splice(index,1);renderModifications();persist();renderResults();$('add-change').focus();});
    title.append(heading,remove);section.append(title);
    const fields = document.createElement('div');fields.className='fields';
    for (const [key,label] of modFields) {
      const wrap = document.createElement('div'), lab = document.createElement('label'), input = document.createElement('input');
      input.id=`change-${index}-${key}`;input.type='number';input.value=change[key];input.step=['year','years'].includes(key)?'1':'any';input.min=key==='year'?Number(plan.startYear)+1:key==='years'?1:0;input.placeholder=key==='year'?'Required':'Keep existing';
      if(key==='lumpSum')input.placeholder='0';
      input.setAttribute('aria-label',`Change ${index+1}: ${label}`);
      lab.htmlFor=input.id;lab.textContent=label;wrap.append(lab,input);fields.append(wrap);
      if (['balance','taxes','insurance','extra','lumpSum'].includes(key)) addAmountStepper(input,key==='balance'?1000:100,`Change ${index+1}: ${label}`);
      input.addEventListener('input',()=>{change[key]=input.value;persist();renderResults();});
    }
    section.append(fields);
    const toggle=document.createElement('label'), checkbox=document.createElement('input');toggle.className='toggle';checkbox.type='checkbox';checkbox.checked=change.refinance;checkbox.setAttribute('aria-label',`Refinance change ${index+1}`);
    checkbox.addEventListener('change',()=>{change.refinance=checkbox.checked;persist();renderResults();});
    toggle.append(checkbox,document.createTextNode('Refinance: recalculate payment'));section.append(toggle);$('modifications').append(section);
  });
  $('add-change').disabled=plan.modifications.length>=SETTINGS.maxChanges;
}
function drawChart(rows) {
  const width=760,height=230,left=66,right=15,top=12,bottom=29;
  const max=Math.max(...rows.map(row=>row.opening)), span=width-left-right, yspan=height-top-bottom;
  const points=[...rows.map(row=>row.opening),rows.at(-1).closing].map((v,i)=>[left+i/rows.length*span,top+(1-v/max)*yspan]);
  const line=points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const base=height-bottom;
  const ticks=Array.from({length:5},(_,i)=>{const y=top+i*yspan/4;const value=max*(1-i/4);return `<line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}" stroke="#e7ede5" stroke-dasharray="3 4"/><text x="${left-12}" y="${y+4}" text-anchor="end" fill="#7a877a" font-size="10">${money(value)}</text>`;}).join('');
  const years=[0,Math.floor(rows.length/2),rows.length].filter((v,i,a)=>a.indexOf(v)===i).map(i=>`<text x="${left+i/rows.length*span}" y="${height-5}" text-anchor="${i===0?'start':i===rows.length?'end':'middle'}" fill="#7a877a" font-size="10">${rows[Math.min(i,rows.length-1)].year}</text>`).join('');
  $('balance-chart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly remaining balance, from ${money(rows[0].opening)} to ${money(rows.at(-1).closing)}"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b8d79a" stop-opacity=".48"/><stop offset="100%" stop-color="#b8d79a" stop-opacity=".05"/></linearGradient></defs>${ticks}<path d="${line} L${width-right},${base} L${left},${base} Z" fill="url(#area)"/><path d="${line}" fill="none" stroke="#527d61" stroke-width="2.5"/>${years}</svg>`;
}
function tableData() {
  const monthly=plan.view==='monthly', source=monthly?result.months:result.rows;
  return {headers:[monthly?'Month':'Year','Total payment','Principal & interest','Principal','Interest','Taxes','Insurance','Extra principal','One-time','Opening balance','Ending balance'],source,rows:source.map(r=>[monthly?r.period:r.year,r.total,r.payment,r.principal,r.interest,r.taxes,r.insurance,r.extra,r.lumpSum,r.opening,r.closing])};
}
const paymentComponents=[['principal','Principal','#527d61'],['interest','Interest','#c78d4b'],['taxes','Taxes','#668cab'],['insurance','Insurance','#9679aa'],['extra','Extra principal','#88a83e'],['lumpSum','One-time payment','#bc6463']];
function drawPaymentChart() {
  // An older cached page can briefly load while the new app version installs.
  if (!$('payment-chart')) return;
  const monthly=plan.view==='monthly',rows=monthly?result.months:result.rows;
  if($('payment-chart-caption')) $('payment-chart-caption').textContent=monthly?'Each bar shows one monthly payment, with all six components stacked to its total. Annual extra principal and one-time payments apply in December.':'Each bar shows one year of monthly payments, with all six components stacked to the yearly total.';
  for(const view of ['annual','monthly']) $(`chart-${view}-view`)?.setAttribute('aria-pressed',String(plan.view===view));
  if(!rows.length){$('payment-chart').innerHTML='<p class="empty-chart">Enter your loan details to see the payment breakdown.</p>';return;}
  const width=Math.max(320,$('payment-chart').clientWidth,rows.length*(monthly?32:28)+86),height=260,left=70,right=16,top=20,bottom=34;
  const plotWidth=width-left-right,plotHeight=height-top-bottom,base=height-bottom;
  const max=Math.max(1,...rows.map(row=>row.total))*1.1;
  const slot=plotWidth/rows.length,barWidth=Math.min(58,slot*.7);
  const ticks=Array.from({length:5},(_,i)=>{
    const y=top+i*plotHeight/4;
    return `<line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}" stroke="#e7ede5" stroke-dasharray="3 4"/><text x="${left-10}" y="${y+4}" text-anchor="end" fill="#7a877a" font-size="10">${money(max*(1-i/4))}</text>`;
  }).join('');
  const labelEvery=Math.max(1,Math.ceil((monthly?80:55)/slot));
  const bars=rows.map((row,i)=>{
    const period=monthly?`${monthNames[row.month-1]} ${row.year}`:row.year;
    const x=left+slot*(i+.5)-barWidth/2;
    let stacked=0;
    const segments=paymentComponents.map(([key,label,color])=>{const value=row[key],segmentHeight=value/max*plotHeight;stacked+=segmentHeight;return `<rect data-component="${key}" data-value="${value}" x="${x}" y="${base-stacked}" width="${barWidth}" height="${segmentHeight}" fill="${color}"/>`;}).join('');
    return `<g data-period="${monthly?row.period:row.year}" data-total="${row.total}"><title>${period}: ${paymentComponents.map(([key,label])=>`${label} ${preciseMoney(row[key])}`).join('; ')}; Total ${preciseMoney(row.total)}</title>${segments}${i%labelEvery===0||i===rows.length-1?`<text x="${x+barWidth/2}" y="${height-10}" text-anchor="middle" fill="#7a877a" font-size="10">${period}</text>`:''}</g>`;
  }).join('');
  $('payment-chart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" style="width:${width}px" role="img" aria-label="${monthly?'Monthly':'Yearly'} total payments stacked by principal, interest, taxes, insurance, extra principal, and one-time payments.">${ticks}${bars}</svg>`;
}
function renderSchedule() {
  const monthly=plan.view==='monthly';
  $('annual-view').setAttribute('aria-pressed',String(!monthly));$('monthly-view').setAttribute('aria-pressed',String(monthly));
  $('schedule-caption').textContent=monthly?'One row per monthly payment. Total payment includes principal, interest, taxes, insurance, and extra payments. Annual extra principal and one-time payments apply in December.':'Yearly totals of the monthly payments. Total payment includes principal, interest, taxes, insurance, and extra payments.';
  const {headers,rows,source}=tableData();
  $('schedule-head').innerHTML=`<tr>${headers.map((h,i)=>`<th scope="col"${i===1?' class="total-payment"':''}>${h}</th>`).join('')}</tr>`;
  $('schedule-body').innerHTML=rows.length?rows.map((r,i)=>`<tr>${r.map((v,j)=>j===0?`<td class="${source[i].modified?'modified-year':''}">${v}${source[i].modified?' *':''}</td>`:`<td${j===1?' class="total-payment"':''}>${preciseMoney(v)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" style="text-align:center;padding:35px">Complete your loan details to build a schedule.</td></tr>`;
  $('schedule-total').textContent=rows.length?`Total of all payments: ${preciseMoney(result.totalPaid)} · ${result.paymentCount} monthly payments${source.some(r=>r.modified)?' · * Modified terms':''}`:'Your schedule will appear here.';
  $('export').disabled=!rows.length;
  drawPaymentChart();
}
function renderResults() {
  result=calculate(plan);
  const pristine=['startYear','years','principal','rate'].every(key=>plan[key]==='');
  $('validation').replaceChildren();
  const messages = result.errors.length ? (pristine?[]:result.errors) : result.warnings;
  if(messages.length){const list=document.createElement('ul');messages.forEach(message=>{const item=document.createElement('li');item.textContent=message;list.append(item);});$('validation').append(list);}
  for(const key of inputKeys) $(key).setAttribute('aria-invalid',String(!pristine && !$(key).validity.valid));
  if(result.rows.length){
    $('monthly-payment').textContent=preciseMoney(result.initialMonthlyPayment);
    $('payoff').textContent=result.paidOff?`${monthNames[result.payoffMonth-1]} ${result.payoffYear}`:'Not paid off';
    $('duration').textContent=result.paidOff?`${result.paymentCount} monthly payments (${duration(result.paymentCount)})`:'Review your payment amounts';
    $('total-interest').textContent=money(result.totalInterest);
    $('annual-payment').textContent=preciseMoney(result.initialMonthlyPayment*12);
    $('first-escrow').textContent=money(result.rows[0].taxes+result.rows[0].insurance);
    const baseline=calculate({...plan,extra:'0',lumpSum:'0',modificationsEnabled:false});
    const saved=baseline.totalInterest-result.totalInterest;
    $('savings').textContent=plan.modificationsEnabled&&plan.modifications.length?'See modified schedule':`${saved<-.005?'−':''}${money(Math.abs(saved))}`;
    drawChart(result.months);
  }else{
    for(const id of ['monthly-payment','payoff','total-interest','annual-payment','first-escrow','savings'])$(id).textContent='—';
    $('duration').textContent='Using monthly payments';
    $('balance-chart').innerHTML='<p class="empty-chart">Enter your loan details to see your path to payoff.</p>';
    if($('payment-chart')) $('payment-chart').innerHTML='<p class="empty-chart">Enter your loan details to see principal and interest payments.</p>';
  }
  renderSchedule();
}
$('loan-form').addEventListener('submit',event=>event.preventDefault());
for (const [key,increment,label] of [['principal',1000,'Loan amount'],['taxes',100,'Property taxes'],['insurance',100,'Insurance'],['extra',100,'Extra principal each year'],['lumpSum',100,'One-time payment in start year']]) addAmountStepper($(key),increment,label);
for(const key of inputKeys) $(key).addEventListener('input',()=>{plan[key]=$(key).value;persist();renderResults();});
$('modificationsEnabled').addEventListener('change',()=>{plan.modificationsEnabled=$('modificationsEnabled').checked;renderModifications();persist();renderResults();});
$('add-change').addEventListener('click',()=>{if(plan.modifications.length>=SETTINGS.maxChanges)return;plan.modifications.push(emptyModification());renderModifications();persist();renderResults();$(`change-${plan.modifications.length-1}-year`).focus();});
for(const view of ['annual','monthly']) for(const prefix of ['','chart-']) $(`${prefix}${view}-view`)?.addEventListener('click',()=>{plan.view=view;persist();renderSchedule();});
$('clear').addEventListener('click',()=>{$('clear-dialog').returnValue='';$('clear-dialog').showModal();});
$('clear-dialog').addEventListener('close',()=>{
  if($('clear-dialog').returnValue!=='clear')return;
  const cleared=clearPlan(storage);plan=emptyPlan();fillForm();renderResults();
  status(cleared?'Saved data cleared':'Could not clear browser storage');$('principal').focus();
});
$('download-plan')?.addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([exportPlan(plan)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`loan-plan-${/^\d{4}$/.test(plan.startYear)?plan.startYear:'saved'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('plan-file-status').textContent='Plan downloaded. On the other machine, open Loan Planner and choose Upload plan.';
});
$('upload-plan')?.addEventListener('click',()=>{$('plan-upload').value='';$('plan-upload').click();});
$('plan-upload')?.addEventListener('change',async()=>{
  const file=$('plan-upload').files[0];if(!file)return;
  pendingImport=null;
  try {
    if(file.size>100000)throw new Error('This file is too large to be a Loan Planner plan.');
    pendingImport=importPlan(await file.text());
    $('import-summary').textContent=`${file.name}: ${pendingImport.principal?preciseMoney(Number(pendingImport.principal))+' loan':'Incomplete loan plan'}, ${pendingImport.modifications.length} loan change${pendingImport.modifications.length===1?'':'s'}. Loading this replaces your current saved plan in this browser.`;
    $('import-dialog').returnValue='';$('import-dialog').showModal();
  }catch(error){$('plan-file-status').textContent=error.message;}
});
$('import-dialog')?.addEventListener('close',()=>{
  if($('import-dialog').returnValue==='load'&&pendingImport){
    plan=pendingImport;fillForm();renderResults();
    const saved=savePlan(storage,plan);status(saved?'Uploaded plan saved on this device':'Plan loaded — browser storage unavailable');
    $('plan-file-status').textContent=saved?'Plan uploaded and saved. Your payments have been recalculated.':'Plan loaded for this session, but this browser could not save it. Keep your downloaded plan file.';
  }
  pendingImport=null;$('upload-plan').focus();
});
$('export').addEventListener('click',()=>{
  const {headers,rows}=tableData();
  const csv=[headers,...rows.map(row=>row.map((v,i)=>i?Number(v).toFixed(2):v))].map(row=>row.join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`loan-${plan.view}-${plan.startYear}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener('storage',event=>{
  if(event.key!==SETTINGS.storageKey&&event.key!==null)return;
  const latest=loadPlan(storage);plan=latest.plan;fillForm();renderResults();
  status(latest.status==='unavailable'?'Unable to read saved data':latest.status==='empty'?'Saved data cleared in another tab':'Updated from another tab');
});
window.addEventListener('resize',()=>{if(result)drawPaymentChart();});
fillForm();renderResults();
status(loaded.status==='loaded'?'Restored your saved plan':loaded.status==='unavailable'?'Saved data unavailable — re-enter your plan':'Entries save automatically');
if('serviceWorker' in navigator) navigator.serviceWorker.register('./serviceworker.js').catch(()=>{});
