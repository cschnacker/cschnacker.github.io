// Project user-supplied SSA monthly estimates without applying the legacy benefit formula.
export function projectSsaEstimates({startYear, currentAge, endAge, birthMonth, birthDay, claimAge, monthlyAt67, monthlyAt70, dollarYear, colaPercent}) {
  const integers = {startYear,currentAge,endAge,birthMonth,birthDay,claimAge,dollarYear};
  for (const [name,value] of Object.entries(integers)) if (!Number.isInteger(value)) throw new Error(`${name} must be a whole number.`);
  if (startYear < 2024 || startYear > 2070 || dollarYear < 2020 || dollarYear > 2070) throw new Error('Review the plan year and estimate dollar year.');
  if (currentAge < 18 || currentAge > 95 || endAge < currentAge || endAge > 110) throw new Error('Review the current and plan-through ages.');
  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > new Date(2000,birthMonth,0).getDate()) throw new Error('Enter a valid birthday month and day.');
  if (claimAge !== 67 && claimAge !== 70) throw new Error('Enter an SSA estimate for the chosen claiming age.');
  if (!Number.isFinite(monthlyAt67) || monthlyAt67 <= 0 || !Number.isFinite(monthlyAt70) || monthlyAt70 <= 0) throw new Error('Enter both positive monthly SSA estimates.');
  if (!Number.isFinite(colaPercent) || colaPercent < 0 || colaPercent > 15) throw new Error('Future COLA must be from 0 to 15 percent.');
  const basisMonthly = claimAge === 67 ? monthlyAt67 : monthlyAt70;
  const birthYear = startYear-currentAge;
  // SSA treats a birthday on the first as occurring in the previous month.
  const effectiveMonth = birthDay===1 ? birthMonth-1 : birthMonth;
  const claimYear = birthYear+claimAge-(effectiveMonth===0 ? 1 : 0);
  const claimStartMonth = effectiveMonth===0 ? 12 : effectiveMonth;
  const claimSerial = claimYear*12+claimStartMonth;
  const rows=[];
  for (let year=startYear;year<=startYear+endAge-currentAge;year++) {
    const monthlyFuture=basisMonthly*Math.pow(1+colaPercent/100,year-dollarYear);
    let months=0;
    for(let month=1;month<=12;month++) if(year*12+month>=claimSerial)months++;
    rows.push({year,age:currentAge+year-startYear,months,monthlyToday:basisMonthly,monthlyFuture,annualBenefits:monthlyFuture*months});
  }
  return {claimYear,claimStartMonth,basisMonthly,rows};
}
