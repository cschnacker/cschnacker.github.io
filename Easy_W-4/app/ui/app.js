import {initializeAds} from './ads.js';
import {validatePage} from './page-contract.js';
import {saveInputs,restoreInputs,clearInputs} from './saved-inputs.js';
import {retirementGroups,retirementMethods,retirementMethod,retirementVisibility} from './retirement-inputs.js';
import {createEngine} from '../calculations/engine.js';
import {correctedModel} from '../calculations/corrections.js';
import {validateData} from '../data/validation.js';
import {expenseVisibility,calculationInputs} from './conditional-inputs.js';
import {w4Allocations,getW4Availability} from '../calculations/w4-availability.js';
const $=s=>document.querySelector(s),el=(tag,props={})=>Object.assign(document.createElement(tag),props);
let data,model,inputs={},job=0,engine;const fields=new Map();
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const statuses=['Single','Joint','Separate','HOH'];const frequencies=['Weekly','Bi-Weekly','Twice a Month','Monthly','Quarterly','Annually'];
const labelStatus={Joint:'Married filing jointly',Separate:'Married filing separately',HOH:'Head of household',Single:'Single'};
const common=[['C10','Filing status',statuses],['C11','Filing state','states']];
const dependents=[['C6','Qualifying children (workbook category)'],['C7','Other dependents'],['C8','Children in college'],['C9','Annual college costs'],['otherCare','Care for a qualifying spouse or adult dependent?',['No','Yes']],['C34','Child or dependent care expenses / year']];
const incomeAdjustments=[['C3106','Other taxable income / year'],['C16','Taxable interest / year'],['C17','Taxable dividends / year'],['C18','Capital gains or losses / year'],['C19','Taxable IRA distributions / year'],['C20','Taxable pension / year'],['C21','Social Security benefits / year'],['C22','Self-employment income / year'],['C23','Student loan interest / year'],['C24','Deductible IRA contributions / year'],['C26','Other state rate (%)']];
const extras=[...dependents,...incomeAdjustments];
const deductions=[['C28','Consider itemizing?',['No','Yes']],['C29','Property taxes / year'],['C30','Charitable donations / year'],['C31','Mortgage interest / year'],['C32','Medical expenses / year']];
const jobFields=[[38,'Salary / year'],[36,'Pay frequency',frequencies],[39,'Bonus / year'],[50,'Work state','states'],[54,'Custom state rate (%)']];
const benefitFields=[[40,'HSA / flexible spending / year'],[41,'Pretax health insurance / year'],[42,'Other tax credits / year'],['401kMethod','401(k) contribution method',retirementMethods],[43,'401(k) contribution (%)'],[44,'401(k) contribution / paycheck'],[45,'401(k) lump sum / year'],['rothMethod','Roth contribution method',retirementMethods],[46,'Roth contribution (%)'],[47,'Roth contribution / paycheck'],[48,'Roth lump sum / year'],[49,'Other after-tax deductions / year']];
const w4Fields=[[3000,'Federal filing status',['Household',...statuses]],[58,'Step 2(c): multiple jobs?',['No','Yes']],[60,'Step 3: children to claim on this W-4'],[63,'Step 3: other dependents to claim on this W-4'],[66,'Step 4(a): other income to enter / year'],[68,'Step 4(b): additional deductions to enter / year'],[69,'Step 4(c): extra tax / paycheck']];
const stateFields=[[3006,'State withholding method',['Suggested','Calculate','Manual']],[3001,'California DE 4 filing status',['Single','Joint','HOH']],[3002,'DE 4 regular allowances'],[3003,'DE 4 estimated deduction allowances'],[3005,'State withholding / paycheck'],[3008,'State withholding on annual bonus'],[3004,'Extra state withholding / paycheck'],[3007,'Claim exemption from state withholding?',['No','Yes']]];
const states=()=>[...new Set(data.tables.SEqn.map(r=>r.state))].concat('Other');
function toast(text){$('#message').textContent=text;$('#message').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#message').hidden=true,5500);}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=el('a',{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function rememberInputs(){try{saveInputs(window.localStorage,data.year,inputs,job);$('#save-status').textContent='Inputs saved automatically in this browser for '+data.year+'.';}catch{$('#save-status').textContent='Browser storage is unavailable. Export inputs to keep a copy.';}}
function inputField(container,address,label,options){
 const isSalary=/^[C-F]38$/.test(address),isBonus=/^[C-F]39$/.test(address),isOtherIncome=/^[C-F]66$/.test(address),isW4Deduction=/^[C-F]68$/.test(address),isExtraTax=/^[C-F](69|3004|3005|3008)$/.test(address);
 const isCareExpense=['C34','C9','C29','C30','C31','C32'].includes(address),isIncomeAdjustment=incomeAdjustments.some(([cell])=>cell===address)&&address!=='C26';
 const isBenefitAmount=/^[C-F](40|41|42|44|45|47|48|49)$/.test(address);
 const isOtherStateRate=address==='C26';
 const exactPay=isSalary||isBonus||isOtherIncome||isW4Deduction||isExtraTax||isCareExpense||isIncomeAdjustment||isBenefitAmount, payStep=/^[C-F](69|3004)$/.test(address)?50:isBonus||isExtraTax||isCareExpense||isBenefitAmount?500:1000;
 if(options==='states')options=states();const wrapper=el('label'),caption=el('span',{textContent:label});wrapper.append(caption);
 const node=el(options?'select':'input',{id:'input-'+address});if(options)for(const value of options)node.append(el('option',{value,textContent:address.endsWith('3001')?({Single:'Single or married (two or more incomes)',Joint:'Married (one income)',HOH:'Head of household'}[value]):value==='Suggested'?'Estimated — wages and bonuses':value==='Calculate'?'California payroll estimate (DE 4)':value==='Household'?'Use household filing status':labelStatus[value]||value}));else{node.type='number';node.step=isOtherStateRate?'1':exactPay?String(payStep):(/^[C-F](43|46|3002|3003)$/.test(address)||/dependents|children/i.test(label))?'1':'0.01';if(address!=='C18'&&!exactPay&&!isOtherStateRate)node.min='0';if(/\(%\)/.test(label))node.max='100';node.placeholder='0';}
 const retirementGroup=retirementGroups.find(group=>address===address[0]+group.key);
 node.value=retirementGroup?retirementMethod(inputs,address[0],retirementGroup):inputs[address]??(address.endsWith('50')?inputs.C11:model.values[address]??0);wrapper.append(node);container.append(wrapper);fields.set(address,{label,options});
 if(address==='C3106')wrapper.append(el('small',{textContent:'Actual household income not entered in another category. Included once in annual federal and state estimates; W-4 Step 4(a) controls withholding separately.'}));
 if(retirementGroup)wrapper.append(el('small',{textContent:'Only the selected method counts. Other entries are saved for switching back. Review the method after importing older inputs.'}));
 const allocation=/^[C-F](60|63|66|68)$/.test(address)?w4Allocations.find(item=>item.row===Number(address.slice(1))):null;
 if(allocation){
  const card=el('div',{className:'w4-claim'}),available=el('div',{id:'available-'+address,className:'w4-available'}),remaining=el('div',{id:'remaining-'+address,className:'w4-remaining'});
  remaining.setAttribute('aria-live','polite');wrapper.replaceWith(card);card.append(available,wrapper,remaining);node.setAttribute('aria-describedby',available.id+' '+remaining.id);
 }
 // With no min attribute, the value attribute is the native spinner's step base.
 // Rebase on the exact amount so typing cents stays valid and arrows add/subtract the configured pay step.
 function rebasePay(){if(exactPay||isOtherStateRate){node.defaultValue=node.value;node.setCustomValidity(address!=='C18'&&Number(node.value)<0?'Enter an amount of zero or more.':'');}}
 rebasePay();
 if(isOtherStateRate){const hint=el('small',{textContent:'Type an exact rate or use the arrows for 1 percentage point steps.',id:'hint-'+address});node.setAttribute('aria-describedby',hint.id);wrapper.append(hint);}
 if(exactPay){const hint=el('small',{textContent:'Type an exact amount or use the arrows for '+('$'+payStep.toLocaleString('en-US'))+' steps.',id:'hint-'+address});node.setAttribute('aria-describedby',[node.getAttribute('aria-describedby'),hint.id].filter(Boolean).join(' '));wrapper.append(hint);}
 node.addEventListener('input',()=>{rebasePay();if(!node.checkValidity()){showInvalid();return;}inputs[address]=options?node.value:Number(node.value);rememberInputs();if(address==='C11'&&!Object.hasOwn(inputs,'CDEF'[job]+'50'))$('#input-'+'CDEF'[job]+'50').value=node.value;calculate();});
}
function renderFields(){fields.clear();for(const [selector,list]of [['#household-fields',common],['#dependent-fields',dependents],['#income-adjustment-fields',incomeAdjustments],['#deduction-fields',deductions]]){const target=$(selector);target.replaceChildren();for(const spec of list)inputField(target,...spec);}renderJob();}
function renderJob(){for(const [selector,list]of [['#job-fields',jobFields],['#benefit-fields',benefitFields],['#w4-fields',w4Fields],['#state-fields',stateFields]]){const target=$(selector);target.replaceChildren();for(const [row,label,options]of list)inputField(target,'CDEF'[job]+row,label,options);}$('.job-tabs').replaceChildren();for(let i=0;i<4;i++){const b=el('button',{textContent:`Job ${i+1}`,className:i===job?'active':''});b.setAttribute('aria-pressed',String(i===job));b.onclick=()=>{job=i;renderJob();calculate();rememberInputs();};$('.job-tabs').append(b);}$('#w4-job-label').textContent=`Job ${job+1}: the remaining household amounts are shared across all four W-4s and decrease as you enter claims on any job. Choose your withholding entries independently; they may be higher or lower. Household details stay unchanged.`;}
function row(label,value,cls=''){const r=el('div',{className:'result-row '+cls});r.append(el('span',{textContent:label}),el('strong',{textContent:value}));return r;}
function showInvalid(){$('#itemizing-guidance').textContent='Enter valid amounts to compare deductions.';for(const node of document.querySelectorAll('.w4-available,.w4-remaining')){node.textContent='Available amount unavailable until inputs are valid.';} $('#paycheck-value').textContent='—';$('#paycheck-breakdown').replaceChildren();$('#annual-results').replaceChildren();$('#calculation-warning').textContent='Enter valid amounts in the highlighted fields to calculate.';}
function syncExpenseVisibility(){
 for(const [address,visible] of Object.entries({...expenseVisibility(inputs),...retirementVisibility(inputs)})){
  const node=$('#input-'+address);if(!node)continue;
  node.closest('label').hidden=!visible;node.disabled=!visible;
 }
}
function calculate(){
 syncExpenseVisibility();
 const state=inputs['CDEF'[job]+'50']??inputs.C11,sc='CDEF'[job],isCA=state==='California',suggested=inputs[sc+'3006']==='Suggested',manual=inputs[sc+'3006']==='Manual'||(!isCA&&!suggested),exempt=!suggested&&inputs[sc+'3007']==='Yes';
 $('#state-title').textContent=suggested?'Estimated state withholding':isCA?'California withholding — DE 4':`${state} withholding`;
 $('#state-job-label').textContent=`Job ${job+1}: state entries are independent of federal W-4 choices.`;
 $('#input-'+sc+'3006').querySelector('option[value=Calculate]').disabled=!isCA;
 $('#input-'+sc+'54').closest('label').hidden=true;$('#input-'+sc+'54').disabled=true;
 $('#state-summary').textContent=suggested?'':isCA&&!manual?'California Method B annualized estimate. Choose the DE 4 status and allowances for this job. Do not duplicate allowances across employers. Bonus withholding uses the separate bonus rate.':(isCA?'Manual state withholding selected. ':'Automatic withholding rules for this state are not yet verified. ')+'Enter the state income tax withheld per paycheck and on the annual bonus from payroll or an official state calculation. A blank entry counts as zero.';
 for(const [r,visible]of [[3006,true],[3007,!suggested],[3001,isCA&&!suggested&&!manual&&!exempt],[3002,isCA&&!suggested&&!manual&&!exempt],[3003,isCA&&!suggested&&!manual&&!exempt],[3005,manual&&!exempt],[3008,manual&&!exempt],[3004,!exempt]]){const node=$('#input-'+sc+r);node.closest('label').hidden=!visible;node.disabled=!visible;}

 if([...document.querySelectorAll('#calculator input')].some(n=>n.type==='number'&&!n.checkValidity())){showInvalid();return;}
 try{validateData(data);}catch(e){showInvalid();$('#calculation-warning').textContent=e.message;return;}
 const effective=calculationInputs(inputs);for(const c of 'CDEF')if(!Object.hasOwn(effective,c+'50'))effective[c+'50']=inputs.C11;
 engine=createEngine(model,data,effective);const o=job*31,c='CDEF'[job];const issues=[];
 if(suggested){
  const tax=engine.read('C3107'),base=engine.read(c+'3101'),weight=engine.read(c+'3100');
  const wages=engine.evaluate('SUM(C3100:F3100)');
  const stateConflicts=[...'CDEF'].flatMap((column,index)=>(Number(effective[column+'38']||0)+Number(effective[column+'39']||0)>0&&effective[column+'50']!==inputs.C11)?[`Job ${index+1}: ${effective[column+'50']}`]:[]);
  $('#state-summary').textContent=base.error||tax.error?(stateConflicts.length?`State selections differ: household filing state is ${inputs.C11}; ${stateConflicts.join('; ')}. If you live and work in one state, select that state under both Your household and each paying job. Otherwise use Manual state withholding for this first-pass calculator.`:'Suggestion unavailable: '+(base.error||tax.error)):`${inputs.C11} tax estimate on wages and bonuses: ${money.format(tax.value)} / year. This job receives ${wages>0?(weight.value/wages*100).toFixed(1):'0'}% based on taxable regular wages: ${money.format(base.value)} per paycheck before extra withholding. Bonus tax is spread across regular paychecks; no separate bonus withholding is added in this mode. `+(wages<=0?'No taxable regular wages are available to allocate this tax. ':'')+'Interest, dividends, and other non-payroll income are included in annual state tax but do not automatically increase this withholding estimate. Any uncovered tax appears in the state balance due. Extra state withholding reduces that balance. Use Manual for actual payroll amounts. This is an approximation of withholding. Uses the imported state tax rules; state data and advanced deductions/credits still need review.';
 }

 const comparisonInputs={...effective,C28:'Yes'};
 for(const address of ['C29','C30','C31','C32'])comparisonInputs[address]=inputs[address]||0;
 const comparison=createEngine(model,data,comparisonInputs),itemized=comparison.read('L270'),standard=comparison.read('M270');
 const guidance=$('#itemizing-guidance');
 if(itemized.error||standard.error)guidance.textContent='Deduction comparison unavailable for these inputs.';
 else{
  const difference=itemized.value-standard.value;
  guidance.textContent=`Estimated itemized deductions: ${money.format(itemized.value)}. Standard deduction: ${money.format(standard.value)}. `+(difference>0?`Consider itemizing: your estimated total is ${money.format(difference)} higher.`:difference===0?'The amounts are equal.':`The standard deduction is ${money.format(-difference)} higher based on the amounts entered.`)+(inputs.C28==='No'?' Choose Yes to enter or review expenses; previously entered amounts are included in this comparison.':'');
 }
 const allocations=getW4Availability(engine,effective,job);
 for(const allocation of allocations){
  const available=$('#available-'+c+allocation.row),remaining=$('#remaining-'+c+allocation.row);
  
  if(allocation.error){available.textContent='Available: unavailable';remaining.textContent='Unable to calculate the source amount.';issues.push(`${allocation.label}: ${allocation.error}`);continue;}
  const format=v=>allocation.unit==='money'?money.format(v):String(v);
  available.replaceChildren(el('span',{textContent:'Still available to enter'}),el('strong',{textContent:format(Math.max(0,allocation.remaining))}),el('small',{textContent:`Household reference: ${format(allocation.total)} · All W-4s combined: ${format(allocation.allocated)} · This W-4: ${format(allocation.entered)}`}));
  const exceeded=allocation.remaining < -0.000001;
  remaining.textContent=exceeded?`Combined W-4 entries are ${format(-allocation.remaining)} above the household reference.`:allocation.remaining>0?`${format(allocation.remaining)} more to enter to match the household reference. You may choose a different amount.`:'Household reference fully allocated.';

 }
 function value(a){const r=engine.read(a);if(r.error){issues.push(`${a}: ${r.error}`);return null;}return r.value;}
 const fmt=a=>{const v=value(a);return typeof v==='number'?money.format(v):'Unavailable';};
 $('#year-chip').textContent=`Tax year ${data.year}`;$('#paycheck-value').textContent=fmt('C'+(98+o));$('#paycheck-label').textContent=`Job ${job+1} · ${inputs[c+'36']||'Bi-Weekly'} · take-home pay`;
 const target=$('#paycheck-breakdown');target.replaceChildren();for(const [label,cell]of [['Gross pay',82],['Pretax retirement',83],['Health insurance',84],['HSA / flexible spending',85],['Federal withholding',91],[suggested?'Estimated state withholding':'State withholding',92],['Social Security',93],['Medicare',94],['Roth contribution',95],['Other deductions',97]])target.append(row(label,fmt('C'+(cell+o))));
 const annual=$('#annual-results');annual.replaceChildren();for(const [label,a]of [['Federal','C73'],['State','C74']]){const v=value(a);annual.append(row(label,typeof v==='number'?`${money.format(Math.abs(v))} ${v<0?'refund':'due'}`:'Unavailable',v<0?'refund':'bill'));}
 annual.append(row('Estimated annual state tax',fmt('F222')));
 const stateTax=value('F222'),stateBalance=value('C74');annual.append(row('Annual state withholding / target',stateTax!==null&&stateBalance!==null?money.format(stateTax-stateBalance):'Unavailable'));
 $('#w4-summary').textContent=`Step 3 credit: ${fmt(c+'61')} + ${fmt(c+'64')} per year. Step 4(c) adds ${money.format(inputs[c+'69']||0)} to each paycheck.`;
 const advanced=['C8','C9','C17','C18','C19','C20','C21','C22','C23','C24','C34'].some(a=>Number(effective[a])!==0);
 let warning=issues.length?'Some results are unavailable. '+[...new Set(issues)].join('; '):'';
 if(manual)warning+=' State withholding uses your manual entries; blank entries mean zero.';
 if(advanced)warning+=' Advanced income and credit estimates follow the source workbook and need tax-rule review.';

 $('#calculation-warning').textContent=warning;$('#data-status').textContent=`${data.year}: ${data.reviewStatus}`;
}
function defaults(){inputs={C10:'Single',C11:'California',C28:'No'};for(const [a,,options]of extras)inputs[a]=options?options[0]:0;for(const [a]of deductions)if(a!=='C28')inputs[a]=0;for(const c of 'CDEF'){for(const [r]of [...jobFields,...benefitFields,...w4Fields,...stateFields]){if(r===50)continue;inputs[c+r]=r===3000?'Household':r===3001?'Single':r===3006?'Suggested':r===3007?'No':String(r).endsWith('Method')?'Percent':r===36?'Bi-Weekly':r===58?'No':0;}}}
async function importJson(input,apply){try{const file=input.files[0];if(!file)return;if(file.size>2000000)throw new Error('File is too large.');const result=JSON.parse(await file.text());apply(result);toast('Imported successfully.');}catch(e){toast('Import failed: '+e.message);}finally{input.value='';}}
const allSpecs=()=>[...common,...extras,...deductions,...[...'CDEF'].flatMap(c=>[...jobFields,...benefitFields,...w4Fields,...stateFields].map(([r,l,o])=>[c+r,l,o]))];
function validateInputs(values){if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('Missing inputs.');const result={};for(const [a,v]of Object.entries(values)){const spec=allSpecs().find(s=>s[0]===a);if(!spec)throw new Error(`Unknown input ${a}.`);const options=spec[2]==='states'?states():spec[2];if(options?!options.includes(v):typeof v!=='number'||!Number.isFinite(v)||(/^[C-F](43|46)$/.test(a)&&(!Number.isInteger(v)||v>100))||(/^[C-F](3002|3003)$/.test(a)&&!Number.isInteger(v))||(a!=='C18'&&v<0))throw new Error(`Invalid value for ${spec[1]}.`);result[a]=v;}return result;}
async function start(){
 validatePage(document);
 $('#help-link').onclick=()=>{$('#calculator-tab').click();$('#help-guide').open=true;};
 const config=await fetch('data/config.json').then(r=>r.json());
 const [original,annual]=await Promise.all([fetch('calculations/workbook-model.json').then(r=>r.json()),fetch(`data/${config.activeYear}.json`).then(r=>r.json())]);data=validateData(annual);model=correctedModel(original);defaults();try{const saved=restoreInputs(window.localStorage,data.year,validateInputs);if(saved){Object.assign(inputs,saved.inputs);job=saved.job;$('#save-status').textContent='Restored your saved '+data.year+' inputs from this browser.';}}catch{$('#save-status').textContent='Saved inputs could not be restored. You can import an exported copy.';}renderFields();$('#loading').hidden=true;$('#calculator').hidden=false;calculate();
 $('#calculator-tab').onclick=()=>{$('#help-guide').open=false;window.scrollTo({top:0,behavior:'smooth'});};
 $('#reset').onclick=()=>{defaults();job=0;renderFields();calculate();try{clearInputs(window.localStorage,data.year);$('#save-status').textContent='Saved inputs cleared. New entries will save automatically.';}catch{$('#save-status').textContent='Inputs reset, but browser storage could not be cleared.';}toast('Inputs reset.');};$('#print').onclick=()=>window.print();
 $('#save-scenario').onclick=()=>download({schemaVersion:1,year:data.year,inputs},`easy-w4-inputs-${data.year}.json`);
 $('#load-scenario').onchange=e=>importJson(e.target,v=>{if(v.schemaVersion!==1||v.year!==data.year)throw new Error('The scenario must match the active tax year.');const next=validateInputs(v.inputs);defaults();Object.assign(inputs,next);for(const c of 'CDEF')for(const group of retirementGroups)if(!Object.hasOwn(next,c+group.key))inputs[c+group.key]=retirementMethod(next,c,group);renderFields();calculate();rememberInputs();});

}
start().then(()=>{initializeAds({document,window,fetchConfig:async()=>{const response=await fetch('data/ads.json');if(!response.ok)throw new Error('Ad configuration unavailable');return response.json();}}).catch(()=>{});}).catch(e=>{const loading=$('#loading');loading.hidden=false;loading.replaceChildren(el('p',{textContent:'Unable to load the calculator. '+e.message}));const retry=el('button',{className:'primary',textContent:'Load latest calculator'});retry.onclick=()=>{const url=new URL(location.href);url.searchParams.set('reload',String(Date.now()));location.replace(url.href);};loading.append(retry);});
