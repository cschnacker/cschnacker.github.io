// Step buttons are conveniences; they never restrict an exact typed amount.
export const increments={salary:1000,bonus:1000,medical:1000,hsa:1000,afterTax:1000,retirementPercent:1,rothPercent:1,bonusStatePercent:1,retirementPerPay:50,rothPerPay:50,credits:1000,children:1,otherDependents:1,otherCredits:1000,otherIncome:1000,deductions:1000,extraWithholding:50,statePerPay:50,stateExtra:50,caAllowances:1,caDeductions:1};
export function increment(value,amount,max=Infinity){return Number(Math.max(0,Math.min(max,(Number(value)||0)+amount)).toFixed(10));}
export function addInputControls(form,onChange){
  for(const [name,step] of Object.entries(increments)){
    const input=form.elements[name];if(!input)continue;
    const count=['caAllowances','caDeductions','children','otherDependents'].includes(name);
    input.step=count?'1':'any';input.removeAttribute('required');
    const label=input.closest('label')?.textContent.trim().replace(/\s+/g,' ')||'Annual base salary';
    const group=document.createElement('div');group.className='number-control';
    input.before(group);group.append(input);
    for(const [symbol,delta,description] of [['−',-step,'Decrease'],['+',step,'Increase']]){
      const button=document.createElement('button');button.type='button';button.textContent=symbol;
      button.setAttribute('aria-label',`${description} ${label} by ${step}`);
      button.addEventListener('click',()=>{input.value=increment(input.value,delta,input.max===''?Infinity:Number(input.max));onChange();});
      group.append(button);
    }
    input.dataset.fieldLabel=label;
    const hint=document.createElement('small');hint.className='input-hint';
    const unit=count?'':name.endsWith('Percent')?'%':'$';
    hint.textContent=count?'Whole numbers. Blank means zero.':`Type an exact ${unit==='%'?'percentage':'amount'} or adjust by ${unit==='$'?'$':''}${step.toLocaleString()}${unit==='%'?'%':''}.`;
    hint.id=`hint-${name}`;input.setAttribute('aria-describedby',hint.id);group.after(hint);
  }
}
