// Estimate the spousal excess separately from the spouse's own worker payment.
// The excess is based on both workers' unreduced benefits, never the primary
// worker's larger payment after delayed retirement credits.
export function projectSpousalSupplement({startYear,colaPercent,primaryFullAt,spouseFullAt,primaryClaim,spouseClaim,spouseBirthYear,spouseBirthMonth=1,spouseFullRetirementMonths}){
  const serial=({year,month=1})=>year*12+month;
  const firstSerial=Math.max(serial(primaryClaim),serial(spouseClaim),serial({year:spouseBirthYear+62,month:spouseBirthMonth}));
  const firstYear=Math.floor((firstSerial-1)/12);
  const entitlementAgeMonths=firstSerial-serial({year:spouseBirthYear,month:spouseBirthMonth});
  const earlyMonths=Math.max(0,spouseFullRetirementMonths-entitlementAgeMonths);
  const factor=1-Math.min(36,earlyMonths)*25/3600-Math.max(0,earlyMonths-36)*5/1200;
  const monthlyAt=year=>Math.max(0,primaryFullAt(year)/2-spouseFullAt(year))*factor;
  const monthsInYear=year=>{
    const first=Math.max(year*12+1,firstSerial);
    return Math.max(0,year*12+12-first+1);
  };
  const referenceYear=Math.max(startYear,firstYear);
  const toToday=amount=>Math.round(amount/Math.pow(1+colaPercent/100,referenceYear-startYear)*100)/100;
  const monthlyToday=toToday(monthlyAt(referenceYear));
  const halfPrimaryToday=toToday(primaryFullAt(referenceYear)/2);
  return {firstYear,firstMonth:firstSerial-firstYear*12,factor,monthlyAt,monthsInYear,monthlyToday,halfPrimaryToday};
}
