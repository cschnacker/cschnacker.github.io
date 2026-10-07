export function validateData(data){
 if(data?.schemaVersion!==1||!Number.isInteger(data.year)||data.year<2000||data.year>2200)throw new Error('Choose a valid Easy W-4 annual data file.');
 for(const [table,expected]of [['FEqn',5],['FEqnWH',5],['SEqn',153]]){
  const rows=data.tables?.[table],map=data.columnMaps?.[table];if(!Array.isArray(rows)||rows.length!==expected||!map)throw new Error(`${table}: expected ${expected} rows and a column map.`);
  const keys=new Set(),sourceRows=new Set();
  for(const row of rows){if(!row.values||row.values.year!==data.year)throw new Error(`${table}: all rows must use the selected tax year.`);if(!Number.isInteger(row.sourceRow)||sourceRows.has(row.sourceRow))throw new Error(`${table}: invalid or duplicate source row.`);sourceRows.add(row.sourceRow);
   const key=`${row.state||''}:${row.category}`;if(keys.has(key))throw new Error(`${table}: duplicate ${key}.`);keys.add(key);
   for(const v of Object.values(row.values))if(typeof v==='number'&&!Number.isFinite(v))throw new Error('Annual values must be finite numbers.');
  }
 }
 for(const key of ['otherDependentCredit','studentLoanIncomeLimit','studentLoanDeductionLimit','iraContributionLimit','saltLimit','bonusFederalRate','medicalExpenseFloor'])if(typeof data.constants?.[key]!=='number'||data.constants[key]<0)throw new Error(`Missing or invalid annual constant: ${key}.`);
 for(const name of ['FEqn','FEqnWH']){const rate=data.tables[name].find(r=>r.category==='Rate');if(!(rate?.values.socialSecurityWageBase>0)||!(rate.values.socialSecurityRate>=0&&rate.values.socialSecurityRate<=1)||!(rate.values.medicareRate>=0&&rate.values.medicareRate<=1))throw new Error(`${name}: check payroll limits and rates.`);}
 const ca=data.stateWithholding?.California;
 if(ca){
  if(ca.year!==data.year)throw new Error('California withholding must match the selected tax year.');
  for(const key of ['lowIncomeSingle','lowIncomeMarried','standardSingle','standardMarried','deductionPerAllowance','creditPerAllowance','bonusRate'])if(!Number.isFinite(ca[key])||ca[key]<0)throw new Error('Invalid California withholding value: '+key);
  for(const status of ['Single','Joint','HOH']){
   const t=ca[status];if(!t||!['bounds','base','rates'].every(k=>Array.isArray(t[k])&&t[k].length===10&&t[k].every(n=>Number.isFinite(n)&&n>=0)))throw new Error('Invalid California withholding brackets.');
   if(t.bounds[0]!==0||t.bounds.some((n,i)=>i&&n<=t.bounds[i-1])||t.rates.some(n=>n>1))throw new Error('Invalid California withholding rates or thresholds.');
  }
 }
 return data;
}
export function setTaxYear(data,year){
 data.year=year;
 if(data.stateWithholding?.California)data.stateWithholding.California.year=year;
 for(const [table,rows]of Object.entries(data.tables))for(const row of rows){row.values.year=year;row.values.lookupKey=String(year)+(table==='SEqn'?row.state:'')+row.category;}
 data.reviewStatus='Edited annual data; review required';return data;
}
