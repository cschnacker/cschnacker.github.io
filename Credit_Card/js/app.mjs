import {payoffPanel,payoffQuote,showQuote} from './payoff.mjs';
import {endMonth,inclusiveMonths} from './dates.mjs';
import {balanceChart,enableChartValues} from './chart.mjs';
import {newCard,newPlan,validate} from './model.mjs';
import {project} from './calculations.mjs';
import * as database from './database.mjs';
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let plan,config,result,queue=Promise.resolve(),enabled=false;
function confirmAction(message){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    const text=document.createElement('p');text.textContent=message;
    const buttons=document.createElement('div');buttons.className='actions';
    const cancel=document.createElement('button');cancel.textContent='Cancel';
    const accept=document.createElement('button');accept.textContent='Continue';accept.className='primary';
    buttons.append(cancel,accept);dialog.append(text,buttons);document.body.append(dialog);
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(false);};dialog.showModal();cancel.focus();
  });
}
const labels={balance:'Starting balance ($)',apr:'APR (%)',charges:'New charges / month ($)',extra:'Extra payment / month ($)',minimum:'Minimum payment ($)',minimumPercent:'Minimum of balance (%)',chargeGrowth:'Charges increase / year (%)',extraGrowth:'Extra payment increase / year (%)'};
function error(e){$('#error').textContent=e.message||e;$('#error').hidden=false;}
function cleanError(){$('#error').hidden=true;}
function status(s){$('#save-status').textContent=s;}
function enqueue(action){queue=queue.catch(()=>{}).then(action);return queue;}
function persist(){
  if(!enabled)return;
  let snapshot;try{snapshot=validate(plan);}catch(e){status('Check your inputs');error(e);return;}
  status('Saving…');
  enqueue(()=>database.save(snapshot)).then(()=>status('✓ Saved on this browser')).catch(e=>{status('Not saved — export a backup');error(e);});
}
function field(k,value,change=false){
  if(change&&k==='month')return `<label>Change month &amp; year<input data-field="month" type="month" min="${plan.settings.start}" max="${endMonth(plan.settings.start,600)}" value="${Number.isInteger(value)?endMonth(plan.settings.start,value):''}" required></label>`;
  return `<label>${escape(change?({month:'Planning month',balance:'Replace balance ($)',apr:'Replace APR (%)',charges:'Replace monthly charges ($)',extra:'Replace extra payment ($)',oneCharge:'One-time charge ($)',onePayment:'One-time payment ($)'}[k]):labels[k])}<input data-field="${k}" type="number" min="${k==='month'?1:0}" max="${k==='month'?600:['apr','minimumPercent','chargeGrowth','extraGrowth'].includes(k)?100:1000000000}" step="${k==='month'?1:k==='balance'?100:['charges','extra'].includes(k)?10:'any'}" value="${value===undefined?'':value}" ${!change||k==='month'?'required':''} placeholder="${change?'Unchanged':''}"></label>`;}
function renderCards(){
  const openCalculators=new Set([...document.querySelectorAll('.payoff-calculator[open]')].map(el=>el.closest('.card').dataset.id));
  const expanded=new Set([...document.querySelectorAll('details.card[open]')].map(el=>el.dataset.id));
  $('#cards').innerHTML=plan.cards.length?plan.cards.map(c=>`<details class="card" data-id="${escape(c.id)}" ${expanded.has(c.id)?'open':''}><summary class="card-summary"><span class="card-summary-name">${escape(c.name||'Unnamed card')}</span><span class="card-summary-balance">${money(c.balance)}</span></summary><div class="card-heading"><input aria-label="Card name" data-field="name" maxlength="100" value="${escape(c.name)}"><button data-action="remove" class="danger" aria-label="Remove ${escape(c.name)}">Remove</button></div><div class="fields">${Object.keys(labels).map(k=>field(k,c[k])).join('')}</div><details><summary>Scheduled changes (${c.changes.length})</summary><p class="note">Choose the month and year for this change. Blank amounts stay unchanged. Changes beyond Plan through are retained but not projected.</p>${c.changes.map((e,i)=>`<div class="change" data-change="${i}"><div class="fields">${['month','balance','apr','charges','extra','oneCharge','onePayment'].map(k=>field(k,e[k],true)).join('')}</div><button data-action="remove-change" class="danger">Remove change</button></div>`).join('')}<button data-action="add-change">+ Schedule a change</button></details>${payoffPanel(c,plan,money,escape)}</details>`).join(''):'<div class="empty"><h3>Start with your first card</h3><p>Add a balance and payment details<br>to see your plan take shape.</p></div>';
  document.querySelectorAll('.payoff-calculator').forEach(el=>{el.open=openCalculators.has(el.closest('.card').dataset.id);});
}
function monthLabel(n){const [y,m]=plan.settings.start.split('-').map(Number);const d=new Date(2000,0,1);d.setFullYear(y,m-1+n-1,1);return d.toLocaleDateString('en-US',{month:'short',year:'numeric'});}
function calculate(){
  try{validate(plan);result=project(plan);cleanError();}catch(e){error(e);return false;}
  const balance=plan.cards.reduce((s,c)=>s+c.balance,0);
  const payoff=!plan.cards.length?'—':result.payoff===null?'Beyond plan':result.payoff===0?'No balance':monthLabel(result.payoff);
  $('#metrics').innerHTML=[['Starting balance',money(balance),`${plan.cards.length} cards in your plan`],['First monthly payment',money(result.rows[0].payment),'Planned card payments'],['Projected interest',money(result.interest),`Across ${plan.settings.months} months`],['Projected payoff',payoff,result.payoff===null?'Balance remains at end of plan':'Based on entered assumptions']].map(([a,b,c])=>`<div class="metric"><small>${a}</small><strong>${b}</strong><span>${c}</span></div>`).join('');
  const chartMonths=result.payoff===null?plan.settings.months:Math.max(1,result.payoff);
  result.displayRows=result.rows.slice(0,chartMonths);
  $('#chart').innerHTML=balanceChart(plan,result,chartMonths,money,monthLabel,escape);
  $('#payment-chart').innerHTML=balanceChart(plan,result,chartMonths,money,monthLabel,escape,'payment');
  enableChartValues($('#chart'),plan,result,chartMonths,money,monthLabel,escape);
  enableChartValues($('#payment-chart'),plan,result,chartMonths,money,monthLabel,escape,'payment');
  $('#payment-caption').textContent=`Total monthly payments · ${monthLabel(1)} to ${monthLabel(chartMonths)} · Thick line: combined total. Separate lines: individual cards.`;
  $('#chart-caption').textContent=`Monthly calculated balances · ${monthLabel(1)} to ${monthLabel(chartMonths)} · Thick line: combined total. Separate lines: individual cards.`;
  $('#outcomes').innerHTML=result.cards.map(c=>`<div class="outcome"><span>${escape(c.name||'Unnamed card')}</span><strong>${c.payoff===null?'Balance remains':c.payoff===0?'No balance':monthLabel(c.payoff)}</strong></div>`).join('');
  $('#schedule').innerHTML=result.displayRows.map(r=>`<tr><td>${monthLabel(r.month)}</td>${['opening','charges','interest','payment','balance'].map(k=>`<td>${money(r[k])}</td>`).join('')}</tr>`).join('');
  return true;
}
function render(){$('#start').value=plan.settings.start;$('#end').value=endMonth(plan.settings.start,plan.settings.months);$('#end').min=plan.settings.start;$('#end').max=endMonth(plan.settings.start,600);renderCards();calculate();}
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function changed(){document.querySelectorAll('.payoff-result').forEach(el=>el.replaceChildren());if(calculate())persist();else status('Check your inputs — not saved');}
$('#cards').addEventListener('input',e=>{
  const input=e.target,k=input.dataset.field;
  if(input.hasAttribute('data-payoff-target')&&enabled){
    const c=plan.cards.find(c=>c.id===input.closest('.card').dataset.id);
    if(input.value)c.payoffTarget=input.value;else delete c.payoffTarget;
    input.closest('.card').querySelector('.payoff-result').replaceChildren();persist();return;
  }
  if(!k||!enabled)return;
  const c=plan.cards.find(c=>c.id===input.closest('.card').dataset.id),row=input.closest('.change');
  const object=row?c.changes[Number(row.dataset.change)]:c;
  if(row&&input.value===''&&k!=='month')delete object[k];else object[k]=k==='name'?input.value:input.value===''?NaN:(row&&k==='month'?inclusiveMonths(plan.settings.start,input.value):Number(input.value));
  input.closest('.card').querySelector('.card-summary-name').textContent=c.name||'Unnamed card';
  input.closest('.card').querySelector('.card-summary-balance').textContent=Number.isFinite(c.balance)?money(c.balance):'Check balance';
  changed();
});
$('#cards').addEventListener('click',async e=>{
  const action=e.target.dataset.action;if(!action||!enabled)return;
  const c=plan.cards.find(c=>c.id===e.target.closest('.card').dataset.id);
  if(['calculate-payoff','apply-payoff','unlock-payment'].includes(action)){
    const cardElement=e.target.closest('.card'),output=cardElement.querySelector('.payoff-result');
    try{
      if(action==='unlock-payment'){delete c.fixedPayment;renderCards();changed();return;}
      validate(plan);
      const target=cardElement.querySelector('[data-payoff-target]').value;
      if(!target)throw Error('Choose a payoff month and year.');
      c.payoffTarget=target;
      const quote=payoffQuote(c,plan);
      if(action==='calculate-payoff'){showQuote(output,quote,money);persist();return;}
      c.fixedPayment=quote.payment;renderCards();changed();
    }catch(err){output.textContent=err.message;}
    return;
  }
  if(action==='remove'){if(!await confirmAction(`Remove ${c.name||'this card'} from your saved plan?`))return;plan.cards=plan.cards.filter(x=>x!==c);}
  if(action==='add-change'){const month=Array.from({length:600},(_,i)=>i+1).find(m=>!c.changes.some(e=>e.month===m));if(!month)return; c.changes.push({month});}
  if(action==='remove-change')c.changes.splice(Number(e.target.closest('.change').dataset.change),1);
  renderCards();if(action==='add-change'){const card=[...document.querySelectorAll('.card')].find(el=>el.dataset.id===c.id);card.querySelector('details').open=true;}
  changed();
});
$('#add').onclick=()=>{if(!enabled)return;if(plan.cards.length>=100){error('Maximum 100 cards.');return;}plan.cards.push(newCard(config,crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`));renderCards();document.querySelector('#cards > .card:last-child').open=true;changed();};
for(const k of ['start','end'])$('#'+k).addEventListener('input',()=>{
  if(!enabled)return;
  const start=$('#start').value,end=$('#end').value,months=inclusiveMonths(start,end);
  plan.settings.start=start;plan.settings.months=months;
  $('#end').min=start;$('#end').max=start?endMonth(start,600):'';
  if(!Number.isInteger(months)||months<1||months>600){error('Choose a plan-through month on or after the start month, within 50 years.');status('Check dates — not saved');return;}
  renderCards();
  changed();
});
$('#export').onclick=()=>{try{download(database.serialize(plan),'credit-card-database.json','application/json');}catch(e){error(e);}};
$('#import').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>5000000)throw Error('Database file exceeds 5 MB.');const imported=database.deserialize(await file.text());if(!await confirmAction('Replace the current plan with this database? Export first if you need a backup.'))return;enabled=false;await enqueue(()=>database.save(imported));plan=imported;enabled=true;render();status('✓ Imported and saved');}catch(e){enabled=true;error(e);}finally{$('#file').value='';}
};
$('#clear').onclick=async()=>{if(!await confirmAction('Clear all cards and settings saved by this app in this browser? Exported backups will remain.'))return;enabled=false;try{await enqueue(()=>database.clear());plan=newPlan(config);render();status('Cleared — ready for a new plan');}catch(e){error(e);}finally{enabled=true;}};
$('#csv').onclick=()=>{if(!calculate())return;download('Month,Opening balance,Charges,Interest,Payment,Ending balance\r\n'+result.displayRows.map(r=>[monthLabel(r.month),r.opening,r.charges,r.interest,r.payment,r.balance].join(',')).join('\r\n'),'credit-card-schedule.csv','text/csv');};
async function init(){
  try{const response=await fetch('data/annual.json',{cache:'no-cache'});if(!response.ok)throw Error('Unable to load annual settings.');config=await response.json();if(!Number.isInteger(config.year)||!Number.isInteger(config.defaultMonths)||config.defaultMonths<1||config.defaultMonths>600||![config.defaultMinimum,config.defaultMinimumPercent].every(n=>Number.isFinite(n)&&n>=0)||config.defaultMinimumPercent>100)throw Error('Invalid annual settings.');
    plan=await database.load()||newPlan(config);enabled=true;render();status('✓ Ready · autosave enabled');$('#annual-note').textContent=`Defaults edition: ${config.year}. This plan was created with ${plan.settings.defaultsYear} defaults. ${config.note}`;
  }catch(e){error(e);status('Database unavailable — see error');for(const b of document.querySelectorAll('button,input'))b.disabled=true;return;}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('serviceworker.js').catch(()=>{});
}
init();
















