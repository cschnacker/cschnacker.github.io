// California EDD Method B, using the permitted annual-payroll/proration method.
export function stateWithholding(data,{state,status='Single',wages=0,periods=26,allowances=0,deductions=0,extra=0,manual=0,mode='Calculate',exempt='No'}){
 if(exempt==='Yes')return 0;
 if(mode==='Manual')return Math.max(0,manual)+extra;
 if(state!=='California')throw new Error('Enter state withholding per paycheck for this state.');
 const policy=data.stateWithholding?.California;
 if(!policy||policy.year!==data.year)throw new Error('California withholding data is missing or belongs to another year.');
 if(!Number.isInteger(allowances)||allowances<0||!Number.isInteger(deductions)||deductions<0)throw new Error('State allowances must be nonnegative whole numbers.');
 const large=status==='HOH'||(status==='Joint'&&allowances>=2);
 if(wages<=(large?policy.lowIncomeMarried:policy.lowIncomeSingle))return extra;
 const taxable=Math.max(0,wages-deductions*policy.deductionPerAllowance-(large?policy.standardMarried:policy.standardSingle));
 const table=policy[status];if(!table)throw new Error('Choose a state filing status.');
 let index=0;while(index+1<table.bounds.length&&taxable>table.bounds[index+1])index++;
 const annual=table.base[index]+(taxable-table.bounds[index])*table.rates[index]-allowances*policy.creditPerAllowance;
 return Math.round((Math.max(0,annual)/periods+extra)*100)/100;
}
