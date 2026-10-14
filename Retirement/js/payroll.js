export function payrollTaxes(primary,spouse,filing,year,inflation,rules){
 const p=rules.payroll;
 if(!p)throw Error('Annual rules lack payroll tax data. Import current retirement rules or choose Use shared data in Data & backups.');
 const wageBase=p.socialSecurityWageBase*(p.inflateWageBase?(1+inflation/100)**Math.max(0,year-rules.year):1);
 const socialSecurityTax=(Math.min(primary,wageBase)+Math.min(spouse,wageBase))*p.socialSecurityRate;
 const medicareBaseTax=(primary+spouse)*p.medicareRate;
 const threshold=p.additionalMedicareThresholds[filing];
 // Joint returns combine wages; other modeled returns apply a threshold per earner.
 const additionalMedicareTax=(filing==='Joint'?Math.max(0,primary+spouse-threshold):Math.max(0,primary-threshold)+Math.max(0,spouse-threshold))*p.additionalMedicareRate;
 const medicareTax=medicareBaseTax+additionalMedicareTax;
 return {socialSecurityTax,medicareTax,additionalMedicareTax,payroll:socialSecurityTax+medicareTax};
}
