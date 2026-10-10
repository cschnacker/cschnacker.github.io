import {prepareTables} from './data.js';
import {projectSsaEstimates} from './ssa-estimates.js';
import {auditCoveredEarnings} from './earnings-audit.js';
import {estimateWorkerBenefit,claimFactor,fullRetirementMonths} from './benefit-estimator.js?v=20261008-2';
import {projectSpousalSupplement} from './spousal-benefit.js?v=20261008-3';
const $=id=>document.getElementById(id);
const form=$('plan-form');
const PLAN_YEAR=new Date().getFullYear();
form.elements.startYear.value=String(PLAN_YEAR);
$('plan-year-display').textContent=String(PLAN_YEAR);
const money=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x);
const STORE='retirement-planner.inputs.v1';
let installed,data,engineReady=false,rows=[],lastPlan=null;
const definitions=[['Age','Age on December 31 this year',18,95,1,''],['End','Plan through age',18,110,1,90],['Claim','Start benefits at age',62,70,1,''],['Stop','Stop working at age',18,100,1,''],['Salary','One year of Social Security-taxed earnings ($)',0,10000000,1000,''],['SalaryAge','Age on December 31 of earnings year',18,100,1,''],['Growth','Estimated annual earnings growth (%)',0,20,.1,3],['Benefit','Annual benefit at full retirement ($)',0,1000000,1,'']];
for(const person of ['primary','spouse']){
  for(const [key,label,min,max,step,value] of definitions){
    if(person==='spouse'&&key==='End')continue;
    const wrapper=document.createElement('label');
    wrapper.textContent=label;
    if(['Salary','Benefit'].includes(key))wrapper.className='wide';
    if(['Stop','Salary','SalaryAge','Growth'].includes(key))wrapper.dataset.method='salary';
    if(key==='Benefit')wrapper.dataset.method='manual';
    if(key==='Claim')wrapper.dataset.method='legacy';
    const input=document.createElement('input');Object.assign(input,{type:'number',name:person+key,min,max,step,value,required:true});
    wrapper.append(input);$(person+'-fields').append(wrapper);
  }
}
function showError(message){$('error').hidden=!message;$('error').textContent=message||'';}
function toggleBlock(block,visible){block.hidden=!visible;for(const input of block.querySelectorAll('input,select,textarea'))input.disabled=!visible;}
function mode(){
  const method=form.elements.method.value;
  for(const block of document.querySelectorAll('#primary-fields [data-method],#ssa-fields[data-method]')){
    const applies=block.dataset.method===method||(block.dataset.method==='salary'&&method==='history')||(block.dataset.method==='legacy'&&method!=='ssa');
    toggleBlock(block,applies);
  }
  const legacy=method==='manual';
  const spouseMethod=legacy?'manual':form.elements.spouseMethod.value;
  form.elements.spouseMethod.closest('label').hidden=legacy;
  form.elements.spouseMethod.disabled=legacy;
  $('spouse-method-help').hidden=legacy;
  $('spouse-fields').hidden=spouseMethod==='none';
  for(const wrapper of $('spouse-fields').querySelectorAll('label')){
    const key=wrapper.dataset.method;
    const applies=spouseMethod!=='none'&&(!key||key===spouseMethod||(key==='legacy'&&spouseMethod!=='ssa'));
    toggleBlock(wrapper,applies);
    const input=wrapper.querySelector('input');
    input.required=applies&&(legacy||['spouseAge','spouseClaim','spouseStop'].includes(input.name)||spouseMethod==='salary'&&['spouseSalary','spouseSalaryAge','spouseGrowth'].includes(input.name));
  }
  toggleBlock($('spouse-ssa-fields'),spouseMethod==='ssa');
  for(const input of $('spouse-ssa-fields').querySelectorAll('input,select'))input.required=spouseMethod==='ssa'&&input.name!=='spouseSsaMonthly70';
  toggleBlock($('spouse-history-fields'),spouseMethod==='history');
  form.elements.spouseEarningsRecord.required=spouseMethod==='history';
  $('spouse-method-help').textContent=spouseMethod==='none'
    ?'No spouse benefit is included. Choose a method to add one.'
    :spouseMethod==='spousal'
      ?'Use this when the spouse has no own Social Security worker benefit. The possible spousal benefit begins only after the primary worker claims.'
    :spouseMethod==='salary'
      ?'Use one year of Social Security-taxed earnings in $1,000 steps. Earnings from a noncovered teaching job do not count here.'
      :spouseMethod==='history'
        ?'Use the spouse’s Social Security-taxed earnings record. Earnings from a noncovered teaching job do not count.'
        :'Enter the spouse’s own age-67 monthly SSA estimate in today’s dollars. Age 70 is calculated from claiming credits unless you enter a separate SSA amount.';
  $('history-fields').hidden=method!=='history'&&method!=='ssa';
  form.elements.earningsRecord.disabled=$('history-fields').hidden;
  form.elements.earningsRecord.required=method==='history';
  if(method==='history')$('record-details').open=true;
  for(const name of ['primarySalary','primarySalaryAge','primaryGrowth'])form.elements[name].required=method!=='history';
  form.elements.primarySalary.step=method==='salary'?'1000':'any';
  $('history-help').textContent=method==='history'
    ?'Paste as many past Social Security-taxed earnings years as you have, preferably your full record. Earlier years can replace recent years among the highest 35 indexed years. A one-year earnings amount is optional for projecting future work.'
    :'Optional: paste your annual earnings to check each year against its Social Security limit. The monthly amounts you enter above remain the benefit source.';
  $('method-help').textContent=method==='ssa'
    ?'Enter the amounts from SSA’s today’s-dollars view. They do not include future inflation; this planner shows a separate projection using your COLA assumption.'
    :method==='history'
      ?'A closer estimate uses each supplied year of Social Security-taxed earnings, indexes those amounts, and selects the highest 35 indexed years. It remains an estimate, not an SSA benefit quote.'
      :method==='salary'
        ?'Enter one year’s Social Security-taxed earnings in $1,000 steps and an estimated growth rate. For exact figures, use earnings history. If your last work year was partial, use a full work year as the reference and set your stop-working age separately. We estimate earlier covered earnings, apply each year’s Social Security limit and wage indexing, then select the highest 35 indexed years.'
        :'The original workbook estimates benefits from an annual amount. Review its limitations before relying on results.';
}
function view(id){for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==id;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===id);if(b.dataset.view===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
$('limitations-link').onclick=()=>view('about');
$('print').onclick=()=>window.print();
function values(){return Object.fromEntries([...form.elements].filter(e=>e.name).map(e=>[e.name,e.value]));}
function keepCoveredColumn(value){return value.split(/\r?\n/).map(line=>{const separator=line.includes('|')?'|':line.includes('\t')?'\t':null;if(!separator)return line;const columns=line.split(separator).map(x=>x.trim()).filter(Boolean);return columns.length>2?`${columns[0]} | ${columns[1]}`:line;}).join('\n');}
function normalizeEarningsInputs(){for(const name of ['earningsRecord','spouseEarningsRecord'])form.elements[name].value=keepCoveredColumn(form.elements[name].value);}
function save(){try{localStorage.setItem(STORE,JSON.stringify(values()));$('save-status').textContent='Your inputs are saved on this device until you clear them.';}catch{$('save-status').textContent='This browser blocked saving. Your inputs will last only for this session.';}}
function restore(){try{const saved=JSON.parse(localStorage.getItem(STORE)||'null');if(saved&&typeof saved==='object'){for(const [key,value]of Object.entries(saved))if(key!=='startYear'&&form.elements.namedItem(key)&&typeof value==='string')form.elements.namedItem(key).value=value;const previousYear=Number(saved.startYear);if(Number.isInteger(previousYear)&&previousYear!==PLAN_YEAR)for(const name of ['primaryAge','spouseAge'])if(saved[name]!==''&&Number.isFinite(Number(saved[name])))form.elements[name].value=String(Number(saved[name])+PLAN_YEAR-previousYear);form.elements.startYear.value=String(PLAN_YEAR);normalizeEarningsInputs();$('example-label').textContent='Your saved inputs have been restored for the current plan year.';return true;}}catch{$('save-status').textContent='Saved inputs could not be read. Enter a new plan.';}return false;}
const restored=restore();mode();
form.addEventListener('input',()=>{mode();save();if(lastPlan){$('result-content').classList.add('stale');$('example-label').textContent='Inputs changed. Update the projection to refresh results.';}});
form.addEventListener('change',()=>{normalizeEarningsInputs();mode();save();});
$('clear').onclick=()=>{try{localStorage.removeItem(STORE);}catch{showError('This browser blocked access to saved inputs. Clear site data in your browser settings.');return;}form.reset();form.elements.startYear.value=String(PLAN_YEAR);form.elements.cola.value=data?.assumptions.defaultColaPercent??2.07;mode();rows=[];lastPlan=null;$('result-content').hidden=true;$('empty').hidden=false;$('example-label').textContent='Saved values cleared. Enter a new plan or load an example.';$('save-status').textContent='New values will be saved when you enter them.';showError('');};
function example(){const sample={startYear:PLAN_YEAR,cola:data?.assumptions.defaultColaPercent??2.07,method:'salary',primaryAge:60,primaryEnd:90,primaryClaim:67,primaryStop:67,primarySalary:85000,primarySalaryAge:60,primaryGrowth:3,primaryBenefit:30000,spouseMethod:'salary',spouseAge:58,spouseClaim:67,spouseStop:67,spouseSalary:55000,spouseSalaryAge:58,spouseGrowth:3,spouseBenefit:24000};for(const [k,v]of Object.entries(sample))form.elements[k].value=v;mode();save();calculate();$('example-label').textContent='Illustrative example. Replace these values with your own.';}
$('example').onclick=example;$('empty-example').onclick=example;
function inputForEngine(p){
  const d={Table:false,prim_age:false,age_spouse:false,Prim_Inc:false,Spouse_Inc:false};
  const map={1:'startYear',2:'primaryAge',3:'primaryEnd',4:'spouseAge',5:'spouseEnd',11:'primaryBenefit',12:'spouseBenefit',14:'primaryStop',15:'primarySalary',16:'primarySalaryAge',17:'primaryGrowth',18:'spouseStop',19:'spouseSalary',20:'spouseSalaryAge',21:'spouseGrowth',27:'primaryClaim',28:'spouseClaim',30:'cola'};
  for(const[r,key]of Object.entries(map))d[`XLEW_2_${r}_3`]=p[key]===''?0:Number(p[key]);
  d.XLEW_2_5_3=Number(p.spouseAge)+Number(p.primaryEnd)-Number(p.primaryAge);
  d.XLEW_2_10_3=p.method==='salary'?'Let Tool Calc':'Enter Own Data';
  if(p.method==='manual'){for(const row of [15,17,19,21])d['XLEW_2_'+row+'_3']=0;d.XLEW_2_14_3=Number(p.primaryAge);d.XLEW_2_16_3=Number(p.primaryAge);d.XLEW_2_18_3=Number(p.spouseAge);d.XLEW_2_20_3=Number(p.spouseAge);}
  return d;
}
function tableHead(labels){$('projection-head').replaceChildren(...labels.map(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;return th;}));}
function finishResult(p){lastPlan=p;save();$('empty').hidden=true;$('result-content').hidden=false;$('result-content').classList.remove('stale');chart();}
function renderEarningsAudit(text,lastWorkYear,selectedYears=null){
  $('record-card').hidden=!text.trim();
  if(!text.trim())return;
  const audit=auditCoveredEarnings(text,window.SS_TABLES.caps);
  const recent=audit.recent;
  const years=recent.length?`${recent.at(-1).year}–${recent[0].year}`:'No recorded years';
  const pending=audit.records.filter(x=>x.covered===null).map(x=>x.year);
  const later=lastWorkYear?audit.records.filter(x=>x.covered!==null&&x.covered>0&&x.year>lastWorkYear).map(x=>x.year):[];
  const excluded=selectedYears?audit.records.filter(x=>x.covered!==null&&!selectedYears.has(x.year)).map(x=>x.year):[];
  $('record-summary').textContent=`${audit.records.length} years supplied. In the most recent ${recent.length} recorded years (${years}), ${audit.atMax} were at the annual limit and ${recent.length-audit.atMax} were below it. ${audit.aboveMax.length} amounts exceed a limit.${pending.length?' '+pending.join(', ')+' not yet recorded.':''}${selectedYears?' The benefit estimate selected the 35 highest indexed years, including modeled years where applicable.'+(excluded.length?' Supplied years not selected: '+excluded.join(', ')+'.':''):''}${later.length?' Taxed earnings appear after the last-worked year in '+later.join(', ')+'. Check whether these were payments for earlier work; they are not treated as future wages in this projection.':''}`;
  $('record-rows').replaceChildren(...audit.records.map(r=>{
    const tr=document.createElement('tr');
    for(const value of [r.year,r.covered===null?'Not recorded':money(r.covered),money(r.maximum),r.percent===null?'—':`${r.percent.toFixed(1)}%`,r.covered===null?'Missing':r.above?'Above limit — review':Math.abs(r.covered-r.maximum)<=0.01?'At limit':'Below limit']){
      const td=document.createElement('td');td.textContent=value;tr.append(td);
    }
    return tr;
  }));
}
function estimateSpouse(p){
  const method=p.spouseMethod||'none';
  if(method==='none')return null;
  if(!p.spouseAge)throw new Error('Enter the spouse’s age to include a spouse benefit.');
  const age=Number(p.spouseAge);
  const endAge=Math.min(110,age+Number(p.primaryEnd)-Number(p.primaryAge));
  if(method==='spousal'){
    const claimYear=Number(p.startYear)-age+Number(p.spouseClaim);
    return {method,claimYear,monthlyToday:0,earnings:[],fullMonthlyAt:()=>0,rows:Array.from({length:endAge-age+1},(_,i)=>({year:Number(p.startYear)+i,annualBenefits:0}))};
  }
  if(method==='ssa'){
    const birthYear=Number(p.startYear)-age-(Number(p.spouseBirthMonth)===1&&Number(p.spouseBirthDay)===1?1:0);
    const calculatedAt70=Number(p.spouseSsaMonthly67)*claimFactor(birthYear,70)/claimFactor(birthYear,67);
    const monthlyAt70=p.spouseSsaMonthly70===''?calculatedAt70:Number(p.spouseSsaMonthly70);
    const result=projectSsaEstimates({startYear:Number(p.startYear),currentAge:age,endAge,birthMonth:Number(p.spouseBirthMonth),birthDay:Number(p.spouseBirthDay),claimAge:Number(p.spouseSsaClaim),monthlyAt67:Number(p.spouseSsaMonthly67),monthlyAt70,dollarYear:Number(p.spouseSsaDollarYear),colaPercent:Number(p.cola)});
    return {...result,method,earnings:[],monthlyToday:result.basisMonthly*Math.pow(1+Number(p.cola)/100,Number(p.startYear)-Number(p.spouseSsaDollarYear))};
  }
  const history=method==='history';
  const result=estimateWorkerBenefit({startYear:Number(p.startYear),currentAge:age,endAge,claimAge:Number(p.spouseClaim),stopAge:history?18:Number(p.spouseStop),salary:history?0:Number(p.spouseSalary||0),salaryAge:history?age:Number(p.spouseSalaryAge||p.spouseAge),growthPercent:history?0:Number(p.spouseGrowth||0),colaPercent:Number(p.cola),useHistory:history,historyText:p.spouseEarningsRecord||'',data,tables:window.SS_TABLES});
  return {...result,method};
}
function ssaFullMonthlyAt(monthlyAt67,dollarYear,birthYear,colaPercent,year){
  return monthlyAt67/claimFactor(birthYear,67)*Math.pow(1+colaPercent/100,year-dollarYear);
}
function spousalProjection(p,primary,spouse){
  const startYear=Number(p.startYear),colaPercent=Number(p.cola);
  const primaryBornOnJanuaryFirst=p.method==='ssa'&&Number(p.birthMonth)===1&&Number(p.birthDay)===1;
  const spouseBornOnFirst=spouse.method==='ssa'&&Number(p.spouseBirthDay)===1;
  const primaryBirthYear=startYear-Number(p.primaryAge)-(primaryBornOnJanuaryFirst?1:0);
  const spouseBirthYear=startYear-Number(p.spouseAge)-(spouseBornOnFirst&&Number(p.spouseBirthMonth)===1?1:0);
  const spouseBirthMonth=spouse.method==='ssa'?Number(p.spouseBirthMonth)-(spouseBornOnFirst?1:0):1;
  const primaryFullAt=p.method==='ssa'
    ?year=>ssaFullMonthlyAt(Number(p.ssaMonthly67),Number(p.ssaDollarYear),primaryBirthYear,colaPercent,year)
    :primary.fullMonthlyAt;
  const spouseFullAt=spouse.method==='ssa'
    ?year=>ssaFullMonthlyAt(Number(p.spouseSsaMonthly67),Number(p.spouseSsaDollarYear),spouseBirthYear,colaPercent,year)
    :spouse.fullMonthlyAt;
  return projectSpousalSupplement({
    startYear,colaPercent,primaryFullAt,spouseFullAt,
    primaryClaim:{year:primary.claimYear,month:primary.claimStartMonth||1},
    spouseClaim:{year:spouse.claimYear,month:spouse.claimStartMonth||1},
    spouseBirthYear,spouseBirthMonth:spouseBirthMonth||12,
    spouseFullRetirementMonths:fullRetirementMonths(spouseBirthYear)
  });
}
function spouseBenefitNote(spousal){
  const early=spousal.factor<.9999?` · early spousal reduction ${Math.round((1-spousal.factor)*100)}%`:'';
  return `At full retirement, compare her own benefit with 50% of the primary full-retirement benefit (about ${money(spousal.halfPrimaryToday)}). Available after the primary claims in ${spousal.firstYear}${early}`;
}
function calculateFromSsa(p){
  if(Boolean(p.lastWorkMonth)!==Boolean(p.lastWorkYear))throw new Error('Enter both the last-worked month and year, or leave both blank.');
  if(p.lastWorkYear&&(+p.lastWorkYear>+p.startYear||+p.lastWorkYear<1937))throw new Error('Review the last-worked year.');
  const result=projectSsaEstimates({
    startYear:Number(p.startYear),currentAge:Number(p.primaryAge),endAge:Number(p.primaryEnd),
    birthMonth:Number(p.birthMonth),birthDay:Number(p.birthDay),claimAge:Number(p.ssaClaim),
    monthlyAt67:Number(p.ssaMonthly67),monthlyAt70:Number(p.ssaMonthly70),
    dollarYear:Number(p.ssaDollarYear),colaPercent:Number(p.cola)
  });
  const spouse=estimateSpouse(p);
  if(spouse){
    const spousal=spousalProjection(p,result,spouse);
    const spouseRows=new Map(spouse.rows.map(r=>[r.year,r]));
    const spouseEarnings=new Map(spouse.earnings.map(r=>[r.year,r.covered]));
    rows=result.rows.map(r=>{
      const secondary=spouseRows.get(r.year);
      const spousalBenefits=spousal.monthlyAt(r.year)*spousal.monthsInYear(r.year);
      const row={year:r.year,primaryAge:r.age,spouseAge:Number(p.spouseAge)+r.year-Number(p.startYear),primaryEarnings:0,spouseEarnings:spouseEarnings.get(r.year)||0,primaryBenefits:r.annualBenefits,spouseOwnBenefits:secondary?.annualBenefits||0,spousalBenefits,spouseBenefits:(secondary?.annualBenefits||0)+spousalBenefits};
      row.total=row.primaryEarnings+row.spouseEarnings+row.primaryBenefits+row.spouseBenefits;
      return row;
    });
    $('spouse-benefit-note').hidden=!rows.some(r=>r.spousalBenefits>0);
    const primaryStartDollars=result.basisMonthly*Math.pow(1+Number(p.cola)/100,Number(p.startYear)-Number(p.ssaDollarYear));
    $('featured-label').textContent=`Household benefits · ${p.startYear} dollars`;
    $('household').textContent=money(primaryStartDollars+spouse.monthlyToday+spousal.monthlyToday);
    $('household-detail').textContent=`Monthly equivalent once both have claimed; future dollars use ${p.cola}% assumed COLA`;
    $('primary-card-label').textContent='Primary SSA estimate';
    $('primary-fra').textContent=money(primaryStartDollars);
    $('primary-claim').textContent=`At age ${p.ssaClaim}, restated in ${p.startYear} dollars`;
    $('spouse-card-label').textContent='Spouse benefit estimate';
    $('spouse-fra').textContent=money(spouse.monthlyToday+spousal.monthlyToday)+(spousal.monthlyToday>0?'*':'');
    $('spouse-claim').textContent=spouseBenefitNote(spousal);
    $('chart-legend').hidden=false;
    $('chart-note').textContent='Future-dollar income by year. SSA-entered amounts use the selected birthday month; wage-based estimates show full-year equivalents in the first claiming year.';
    $('model-label').textContent='Separate benefit sources for each person';
    $('model-message').textContent=`The primary amount uses the SSA estimate you entered. ${spouse.method==='spousal'?'The spouse is assumed to have no own worker benefit.':`The spouse estimate uses ${spouse.method==='ssa'?'her separately entered own-worker SSA amount':spouse.method==='history'?'her Social Security-taxed earnings record':'one year of her Social Security-taxed earnings'}.`} At full retirement age, her benefit is compared with 50% of the primary worker's unreduced benefit. Any benefit on the primary worker's record starts only after the primary claims and is reduced if she becomes eligible before full retirement age. Work-credit eligibility, child-in-care exceptions, family maximums, and survivor benefits are not calculated.`;
    $('table-title').textContent='Combined annual income projection';
    tableHead(['Year','Ages on Dec 31: primary / spouse','Primary SS earnings','Spouse SS earnings','Primary benefits','Spouse benefits','Household total']);
    $('projection').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');const cells=[r.year,`${r.primaryAge} / ${r.spouseAge}`,...['primaryEarnings','spouseEarnings','primaryBenefits','spouseBenefits','total'].map(k=>money(r[k]))];for(const [i,value]of cells.entries()){const td=document.createElement('td');td.textContent=value+(i===5&&r.spousalBenefits>0?'*':'');tr.append(td);}return tr;}));
    renderEarningsAudit(p.earningsRecord||'',Number(p.lastWorkYear));
    finishResult(p);
    $('example-label').textContent=`Projection updated through ${rows.at(-1).year}. Each person uses their selected estimate method.`;
    return;
  }
  rows=result.rows.map(r=>({...r,primaryBenefits:r.annualBenefits,spouseBenefits:0}));
  $('spouse-benefit-note').hidden=true;
  const claimMonthlyFuture=result.basisMonthly*Math.pow(1+Number(p.cola)/100,result.claimYear-Number(p.ssaDollarYear));
  const claimMonth=new Intl.DateTimeFormat('en-US',{month:'long'}).format(new Date(2000,result.claimStartMonth-1,1));
  $('featured-label').textContent=`SSA estimate at ${p.ssaClaim} · ${p.ssaDollarYear} dollars`;
  $('household').textContent=money(result.basisMonthly);
  $('household-detail').textContent=`Projected for ${claimMonth} ${result.claimYear}: ${money(claimMonthlyFuture)}/month with ${p.cola}% assumed COLA`;
  $('primary-card-label').textContent='If benefits start at 67';
  $('primary-fra').textContent=money(Number(p.ssaMonthly67));
  $('primary-claim').textContent=`Monthly, in ${p.ssaDollarYear} dollars`;
  $('spouse-card-label').textContent='If benefits start at 70';
  $('spouse-fra').textContent=money(Number(p.ssaMonthly70));
  $('spouse-claim').textContent=`Monthly, in ${p.ssaDollarYear} dollars`;
  $('chart-legend').hidden=true;
  $('chart-note').textContent=`The monthly SSA amounts above are in ${p.ssaDollarYear} dollars. The chart and table show future dollars using ${p.cola}% assumed annual COLA; actual adjustments may differ.`;
  $('model-label').textContent='Based on the SSA estimates you entered';
  const enteredIncrease=(Number(p.ssaMonthly70)/Number(p.ssaMonthly67)-1)*100;
  $('model-message').textContent=`The SSA amount is kept in today's dollars; the higher future-dollar amount is an estimate, not a benefit quote. For people born in 1960 or later, full retirement age is 67 and delaying to 70 adds 24% in claiming credits before other changes. Your two entered SSA figures differ by ${enteredIncrease.toFixed(1)}%; check that both use the same earnings and dollar assumptions.${p.lastWorkYear?' Last worked '+new Intl.DateTimeFormat('en-US',{month:'long'}).format(new Date(2000,Number(p.lastWorkMonth)-1,1))+' '+p.lastWorkYear+'; this projection adds no future wages.':''}`;
  $('table-title').textContent='Benefit projection';
  tableHead(['Year','Age on Dec 31','Benefit months due','Monthly benefit (future $)','Annual benefits due (future $)']);
  $('projection').replaceChildren(...result.rows.map(r=>{const tr=document.createElement('tr');for(const value of[r.year,r.age,r.months,r.months?money(r.monthlyFuture):'—',money(r.annualBenefits)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}));
  renderEarningsAudit(p.earningsRecord||'',Number(p.lastWorkYear));
  finishResult(p);
  const monthName=new Intl.DateTimeFormat('en-US',{month:'long'}).format(new Date(2000,result.claimStartMonth-1,1));
  $('example-label').textContent=`Benefits start in ${monthName} ${result.claimYear} at age ${p.ssaClaim}. ${result.rows.length} calendar years shown.`;
}
function calculateFromEarnings(p){
  const detailed=p.method==='history';
  const common={startYear:Number(p.startYear),colaPercent:Number(p.cola),data,tables:window.SS_TABLES};
  const primary=estimateWorkerBenefit({...common,currentAge:Number(p.primaryAge),endAge:Number(p.primaryEnd),claimAge:Number(p.primaryClaim),stopAge:Number(p.primaryStop),salary:Number(p.primarySalary||0),salaryAge:Number(p.primarySalaryAge||p.primaryAge),growthPercent:Number(p.primaryGrowth||0),useHistory:detailed,historyText:p.earningsRecord||''});
  const spouse=estimateSpouse(p);
  const spousal=spouse?spousalProjection(p,primary,spouse):null;
  const spouseRows=new Map(spouse?.rows.map(r=>[r.year,r])||[]);
  const primaryEarnings=new Map(primary.earnings.map(r=>[r.year,r.covered]));
  const spouseEarnings=new Map(spouse?.earnings?.map(r=>[r.year,r.covered])||[]);
  rows=primary.rows.map(r=>{
    const secondary=spouseRows.get(r.year);
    const spousalBenefits=spousal?spousal.monthlyAt(r.year)*spousal.monthsInYear(r.year):0;
    const row={year:r.year,primaryAge:r.age,spouseAge:spouse?Number(p.spouseAge)+r.year-Number(p.startYear):null,primaryEarnings:primaryEarnings.get(r.year)||0,spouseEarnings:spouseEarnings.get(r.year)||0,primaryBenefits:r.annualBenefits,spouseOwnBenefits:secondary?.annualBenefits||0,spousalBenefits,spouseBenefits:(secondary?.annualBenefits||0)+spousalBenefits};
    row.total=row.primaryEarnings+row.spouseEarnings+row.primaryBenefits+row.spouseBenefits;
    return row;
  });
  $('spouse-benefit-note').hidden=!rows.some(r=>r.spousalBenefits>0);
  $('featured-label').textContent=`Estimated household benefits · ${p.startYear} dollars`;
  $('household').textContent=money(primary.monthlyToday+(spouse?.monthlyToday||0)+(spousal?.monthlyToday||0));
  $('household-detail').textContent=`Monthly equivalent once both have claimed; future dollars use ${p.cola}% assumed COLA`;
  $('primary-card-label').textContent='Primary worker estimate';
  $('primary-fra').textContent=money(primary.monthlyToday);
  const primaryAdjustment=(primary.claimFactor-1)*100;
  $('primary-claim').textContent=`At age ${p.primaryClaim}, in ${p.startYear} dollars · ${primaryAdjustment>=0?'+':''}${primaryAdjustment.toFixed(0)}% claiming adjustment`;
  $('spouse-card-label').textContent='Spouse benefit estimate';
  $('spouse-fra').textContent=spouse?money(spouse.monthlyToday+spousal.monthlyToday)+(spousal.monthlyToday>0?'*':''):'—';
  $('spouse-claim').textContent=spouse?spouseBenefitNote(spousal):'Choose a spouse method to include a benefit';
  $('chart-legend').hidden=!spouse;
  $('chart-note').textContent='Projected future dollars. Wage-based first claiming years are full-year equivalents; SSA-entered amounts use the selected birthday month. Future COLAs are assumptions.';
  $('model-label').textContent=detailed?'Estimated from annual covered earnings':'Quick earnings-based estimate';
  $('model-message').textContent=detailed
    ?`${primary.recordedCount} primary covered-earnings years and ${primary.modeledCount} later work years were used. Earlier years not supplied count as zero. The 35 highest indexed years determine the earnings average. ${spouse?spouse.method==='spousal'?'The spouse is assumed to have no own worker benefit. ':`The spouse uses ${spouse.method==='ssa'?'a separately entered own-worker SSA amount':spouse.method==='history'?`${spouse.recordedCount} years of her own covered-earnings history`:'a separate covered-earnings trend'}. `:''}Noncovered job earnings are excluded. ${spouse?'The spouse column shows one combined benefit. At full retirement age, a smaller own benefit is compared with 50% of the primary worker’s unreduced benefit; the latter is available only after the primary claims. Early claiming can reduce it. ':''}Work-credit eligibility, child-in-care exceptions, family maximums, and survivor benefits are not calculated.`
    :`A ${p.primaryGrowth}% primary covered-earnings trend estimates earlier earnings; each year is limited to its Social Security wage cap before indexing. The 35 highest indexed years are used. ${spouse?spouse.method==='spousal'?'The spouse is assumed to have no own worker benefit. ':`The spouse uses ${spouse.method==='ssa'?'a separately entered own-worker SSA amount':spouse.method==='history'?`${spouse.recordedCount} years of her own covered-earnings history`:'a separate covered-earnings trend'}. `:''}Noncovered job earnings are excluded. ${spouse?'The spouse column shows one combined benefit. At full retirement age, a smaller own benefit is compared with 50% of the primary worker’s unreduced benefit; the latter is available only after the primary claims. Early claiming can reduce it. ':''}Work-credit eligibility, child-in-care exceptions, family maximums, and survivor benefits are not calculated.`;
  $('table-title').textContent='Annualized income projection';
  tableHead(['Year','Ages on Dec 31: primary / spouse','Primary SS earnings','Spouse SS earnings','Primary benefits','Spouse benefits','Household total']);
  $('projection').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');const cells=[r.year,spouse?`${r.primaryAge} / ${r.spouseAge}`:String(r.primaryAge),...['primaryEarnings','spouseEarnings','primaryBenefits','spouseBenefits','total'].map(k=>money(r[k]))];for(const [i,value]of cells.entries()){const td=document.createElement('td');td.textContent=value+(i===5&&r.spousalBenefits>0?'*':'');tr.append(td);}return tr;}));
  renderEarningsAudit(detailed?p.earningsRecord||'':'',Number(p.lastWorkYear),detailed?primary.selectedYears:null);
  finishResult(p);
  $('example-label').textContent=`Projection updated through ${rows.at(-1).year}. Primary earnings average: ${money(primary.aime)} per month after indexing.`;
}
function calculate(){
  normalizeEarningsInputs();mode();if(!form.reportValidity())return;
  const p=values();
  if(+p.primaryEnd<+p.primaryAge){showError('Plan-through age must be at least the primary person’s current age.');return;}
  if(p.method!=='ssa'&&+p.startYear+(+p.primaryEnd-+p.primaryAge)>2110){showError('The original model supports years through 2110. Shorten the planning horizon.');return;}
  showError('');
  if(p.method==='ssa'){
    try{calculateFromSsa(p);}catch(e){showError(e.message);}
    return;
  }
  if(p.method==='salary'||p.method==='history'){
    try{calculateFromEarnings(p);}catch(e){rows=[];lastPlan=null;$('result-content').hidden=true;$('empty').hidden=false;showError(e.message);}
    return;
  }
  if(!engineReady){showError('The calculation engine is still loading. Please try again in a moment.');return;}
  try{
    const d=inputForEngine(p);$('engine').contentWindow.calc(d);
    const next=[];
    for(let r=62;r<=101;r++){
      const cell=c=>d[`XLEW_2_${r}_${c}`];
      if(cell(4)===''||!Number.isFinite(Number(cell(4)))||Number(cell(4))<+p.startYear)continue;
      const row={year:Number(cell(4)),primaryAge:Number(cell(2)),spouseAge:Number(cell(3)),primaryEarnings:Number(cell(5)),spouseEarnings:Number(cell(6)),primaryBenefits:Number(cell(7)),spouseBenefits:Number(cell(8))};
      if(Object.values(row).some(v=>!Number.isFinite(v)))throw new Error('The original model could not calculate these inputs. Review the ages and earnings.');
      if(row.primaryAge>+p.primaryEnd)continue;
      row.total=row.primaryEarnings+row.spouseEarnings+row.primaryBenefits+row.spouseBenefits;next.push(row);
    }
    if(!next.length)throw new Error('No projection rows were produced. Check the planning ages.');
    rows=next;
    $('spouse-benefit-note').hidden=true;
    const bothYear=Math.max(+p.startYear+ +p.primaryClaim- +p.primaryAge,+p.startYear+ +p.spouseClaim- +p.spouseAge,+p.startYear);
    const both=rows.find(r=>r.year>=bothYear);
    $('household').textContent=both?money((both.primaryBenefits+both.spouseBenefits)/12):'Outside plan';
    $('household-detail').textContent=both?`Per month in ${both.year}, when both have started`:'Both claiming dates are beyond the shown years';
    const fra=x=>{const months=Math.round(Number(x)*12);return `${Math.floor(months/12)}y${months%12?' '+months%12+'m':''}`;};
    $('primary-fra').textContent=fra(d.XLEW_2_24_3);$('spouse-fra').textContent=fra(d.XLEW_2_25_3);
    $('primary-claim').textContent=`Benefits start at ${p.primaryClaim}`;$('spouse-claim').textContent=`Benefits start at ${p.spouseClaim}`;
    $('featured-label').textContent='Household benefits';$('primary-card-label').textContent='Primary full retirement age';$('spouse-card-label').textContent='Spouse full retirement age';
    $('chart-legend').hidden=false;$('chart-note').textContent='Future dollars, including your assumed COLA. The table below provides the same values.';
    $('model-label').textContent='A planning estimate';$('model-message').textContent='Uses your original workbook’s calculation rules, including its benefit adjustments. Actual benefits may differ.';
    $('record-card').hidden=true;
    $('table-title').textContent='Income projection';
    tableHead(['Year','Ages on Dec 31: primary / spouse','Primary earnings','Spouse earnings','Primary benefits','Spouse benefits','Total income']);
    $('projection').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');for(const val of[r.year,`${r.primaryAge} / ${r.spouseAge}`,...['primaryEarnings','spouseEarnings','primaryBenefits','spouseBenefits','total'].map(k=>money(r[k]))]){const td=document.createElement('td');td.textContent=val;tr.append(td);}return tr;}));
    finishResult(p);$('example-label').textContent=`Projection updated. Showing ${rows.length} years through ${rows.at(-1).year}.`;
  }catch(e){rows=[];lastPlan=null;$('result-content').hidden=true;$('empty').hidden=false;showError(e.message);}
}
form.onsubmit=e=>{e.preventDefault();calculate();};
function chart(){
  const width=760,height=280,left=58,right=18,top=24,bottom=42;
  const max=Math.max(1,...rows.map(r=>r.primaryBenefits+r.spouseBenefits));
  const ceiling=Math.ceil(max/10000)*10000;
  const x=i=>left+i/Math.max(1,rows.length-1)*(width-left-right),y=n=>height-bottom-n/ceiling*(height-top-bottom);
  const point=(i,n)=>`${x(i).toFixed(1)},${y(n).toFixed(1)}`;
  const line=value=>rows.map((r,i)=>`${i?'L':'M'}${point(i,value(r))}`).join(' ');
  const primary=r=>r.primaryBenefits;
  const total=r=>r.primaryBenefits+r.spouseBenefits;
  const primaryArea=`${line(primary)} L${point(rows.length-1,0)} L${point(0,0)} Z`;
  const spouseArea=`${line(total)} ${rows.slice().reverse().map((r,i)=>`L${point(rows.length-1-i,primary(r))}`).join(' ')} Z`;
  const hasSpouse=rows.some(r=>r.spouseBenefits>0);
  $('chart-note').textContent=`${hasSpouse?'The gold spouse area is stacked above the green primary area; the top edge is their total.':'The green area shows the primary benefit.'} ${$('chart-note').textContent}`;
  let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-description"><title id="chart-title">Stacked annual Social Security benefits</title><desc id="chart-description">The green area shows primary benefits. The gold area shows spouse benefits stacked above them. The top edge shows the household benefit total. Annual amounts are listed in the table below.</desc>`;
  for(let i=0;i<=4;i++){const n=ceiling*i/4;svg+=`<line x1="${left}" y1="${y(n)}" x2="${width-right}" y2="${y(n)}" stroke="#e9ede6"/><text x="${left-12}" y="${y(n)+4}" text-anchor="end" fill="#69766f" font-size="11">$${Math.round(n/1000)}k</text>`;}
  for(const i of [...new Set([0,Math.floor((rows.length-1)/3),Math.floor(2*(rows.length-1)/3),rows.length-1])])svg+=`<text x="${x(i)}" y="${height-13}" text-anchor="middle" fill="#69766f" font-size="11">${rows[i].year}</text>`;
  svg+=`<path data-series="primary" d="${primaryArea}" fill="#2d5747" fill-opacity=".87"/>`;
  if(hasSpouse)svg+=`<path data-series="spouse" d="${spouseArea}" fill="#bd9867" fill-opacity=".86"/>`;
  svg+=`<path d="${line(hasSpouse?total:primary)}" fill="none" stroke="${hasSpouse?'#987446':'#204335'}" stroke-width="2" stroke-linejoin="round"/>`;
  for(let i=0;i<rows.length;i++){
    const r=rows[i],halfStep=(width-left-right)/Math.max(1,rows.length-1)/2;
    const start=Math.max(left,x(i)-halfStep),end=Math.min(width-right,x(i)+halfStep);
    svg+=`<rect x="${start.toFixed(1)}" y="${top}" width="${(end-start).toFixed(1)}" height="${height-top-bottom}" fill="transparent"><title>${r.year}: Primary ${money(r.primaryBenefits)}${hasSpouse?`, spouse ${money(r.spouseBenefits)}`:''}, total ${money(total(r))}</title></rect>`;
  }
  $('chart').innerHTML=svg+'</svg>';
}
function download(text,name,type){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>{
  if(!rows.length)return;
  const keys=lastPlan?.method==='ssa'&&(!lastPlan.spouseMethod||lastPlan.spouseMethod==='none')
    ?['year','age','months','monthlyToday','monthlyFuture','annualBenefits']
    :lastPlan?.method==='manual'
      ?['year','primaryAge','spouseAge','primaryEarnings','spouseEarnings','primaryBenefits','spouseBenefits','total']
      :['year','primaryAge','spouseAge','primaryEarnings','spouseEarnings','primaryBenefits','spouseBenefits','total'];
  download(keys.join(',')+'\r\n'+rows.map(r=>keys.map(k=>Number.isInteger(r[k])?r[k]:r[k].toFixed(2)).join(',')).join('\r\n'),'retirement-projection.csv','text/csv');
};
function displayData(){
  const maxCap=Math.max(...Object.keys(data.taxableMaximum).map(Number)),maxAwi=Math.max(...Object.keys(data.averageWageIndex).map(Number));
  $('data-stamp').textContent=`Reference data ${data.release}`;
  $('data-summary').replaceChildren(...[[`Taxable maximum · ${maxCap}`,money(data.taxableMaximum[maxCap]),'Latest historical observation'],[`Wage index · ${maxAwi}`,money(data.averageWageIndex[maxAwi]),'Latest historical observation'],['Retained model basis',String(data.model.benefitBaseYear),`Bend points ${data.model.bendPoints.map(money).join(' / ')}. Index base ${data.model.wageIndexBaseYear}.`]].map(([label,value,note])=>{const div=document.createElement('div');for(const[tag,text]of[['span',label],['strong',value],['small',note]]){const el=document.createElement(tag);el.textContent=text;div.append(el);}return div;}));
  $('data-rows').replaceChildren(...Array.from({length:Math.max(maxCap,maxAwi)+11-1951},(_,i)=>1951+i).map(year=>{const tr=document.createElement('tr');for(const val of[year,money(window.SS_TABLES.caps[year]),Object.hasOwn(data.taxableMaximum,year)?'Historical':'Projected',money(window.SS_TABLES.awi[year]),Object.hasOwn(data.averageWageIndex,year)?'Historical':'Projected']){const td=document.createElement('td');td.textContent=val;tr.append(td);}return tr;}));
}
$('download-data').onclick=()=>download(JSON.stringify(data,null,2)+'\n','social-security.json','application/json');
$('import-data').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>500000)throw new Error('Data file is too large.');const next=JSON.parse(await file.text());const tables=prepareTables(next);data=next;window.SS_TABLES=tables;$('engine').contentWindow.SS_TABLES=tables;displayData();$('restore-data').hidden=false;$('import-status').textContent=`Previewing ${data.release}. This is temporary; the installed file has not changed.`;showError('');if(lastPlan)calculate();}catch(err){showError(`Data preview rejected: ${err.message}`);}finally{e.target.value='';}};
$('restore-data').onclick=()=>{data=structuredClone(installed);window.SS_TABLES=prepareTables(data);$('engine').contentWindow.SS_TABLES=window.SS_TABLES;displayData();$('restore-data').hidden=true;$('import-status').textContent='Installed data restored. Preview changes were discarded.';showError('');if(lastPlan)calculate();};
async function init(){try{const response=await fetch('data/social-security.json',{cache:'no-store'});if(!response.ok)throw new Error(`Data request failed (${response.status}).`);data=await response.json();window.SS_TABLES=prepareTables(data);installed=structuredClone(data);if(!restored){form.elements.cola.value=data.assumptions.defaultColaPercent;form.elements.ssaDollarYear.value=PLAN_YEAR;form.elements.spouseSsaDollarYear.value=PLAN_YEAR;}displayData();$('engine').onload=()=>{if(typeof $('engine').contentWindow.calc!=='function'){showError('The calculation engine failed to load. Reload the page.');return;}engineReady=true;if(restored&&form.checkValidity())calculate();};$('engine').src='engine/index.html';}catch(e){$('data-stamp').textContent='Reference data unavailable';showError('The calculator could not start: '+e.message+' Serve this folder over HTTP or HTTPS.');}}
init();
window.__plannerLoaded=true;
if('serviceWorker'in navigator)navigator.serviceWorker.register('serviceworker.js?v=20261008-8').catch(()=>{});

