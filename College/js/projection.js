export function project(plan) {
  const { household: h, students, holdings, adjustments } = plan;
  const errors = [];
  if (h.startYear == null) return { errors: ['Enter a first projection year.'], rows: [] };
  if (h.endYear != null && h.endYear < h.startYear) errors.push('The last projection year must be on or after the first.');

  const completeStudents = students.filter(s => [s.start, s.duration, s.cost, s.base].every(value => value != null));
  const pendingStudents = students.length - completeStudents.length;
  const incomeChanges = new Map();
  const investments = holdings.map((account, index) => ({
    index, account, changes: new Map(), balance: account.balance ?? 0, extra: account.extra ?? 0,
    rate: account.growth ?? 0, primaryRate: account.primaryRate ?? 0, spouseRate: account.spouseRate ?? 0,
  }));
  const investmentById = new Map(investments.map(entry => [entry.account.id, entry]));
  let lastChange = 0;
  for (const change of adjustments) {
    if (change.year == null) continue;
    const investment = investmentById.get(change.investmentId);
    const label = investment ? investment.account.name?.trim() || `Investment ${investment.index + 1}` : 'Household income';
    const changes = investment?.changes ?? incomeChanges;
    if (changes.has(change.year)) errors.push(`Merge the ${change.year} adjustments for ${label} into one entry.`);
    changes.set(change.year, change);
    lastChange = Math.max(lastChange, change.year);
  }
  if (errors.length) return { errors, rows: [] };

  const lastCollege = Math.max(0, ...completeStudents.map(s => s.start + s.duration - 1));
  const endYear = h.endYear ?? Math.max(h.startYear + 9, lastCollege, lastChange);
  const rows = [];
  let unpaid = 0;
  let primarySalary = h.primarySalary ?? 0;
  let spouseSalary = h.spouseSalary ?? 0;
  let salaryGrowth = h.salaryGrowth ?? 0;
  let spouseSalaryGrowth = h.spouseSalaryGrowth;
  const salaryFunding = h.fundFromSalary !== false && h.fundFromSalary !== null;

  for (let year = h.startYear; year <= endYear; year++) {
    const change = incomeChanges.get(year) ?? {};
    const offset = year - h.startYear;
    salaryGrowth = change.salaryGrowth ?? salaryGrowth;
    spouseSalaryGrowth = change.spouseSalaryGrowth ?? spouseSalaryGrowth;
    const salaryFactor = offset ? 1 + salaryGrowth / 100 : 1;
    const spouseSalaryFactor = offset ? 1 + (spouseSalaryGrowth ?? salaryGrowth) / 100 : 1;
    primarySalary = change.primarySalary ?? primarySalary * salaryFactor;
    spouseSalary = change.spouseSalary ?? spouseSalary * spouseSalaryFactor;
    const primaryPay = year < (h.primaryStopWork ?? Infinity) ? primarySalary : 0;
    const spousePay = h.includeSpouse && year < (h.spouseStopWork ?? Infinity) ? spouseSalary : 0;
    const primaryActive = year < (h.primaryStop ?? Infinity);
    const spouseActive = year < (h.spouseStop ?? Infinity);
    let beginning = 0 - unpaid;
    let positiveOpening = 0;
    let earnings = 0;
    let primary = 0;
    let spouse = 0;
    let recurring = 0;
    let oneTime = 0;

    for (const entry of investments) {
      const { account } = entry;
      const change = entry.changes.get(year) ?? {};
      entry.rate = change.growth ?? entry.rate;
      entry.primaryRate = change.primaryRate ?? entry.primaryRate;
      entry.spouseRate = change.spouseRate ?? entry.spouseRate;
      const contributionGrowth = account.extraGrowth ?? (salaryFunding ? salaryGrowth : 0);
      entry.extra = change.extra ?? entry.extra * (offset ? 1 + contributionGrowth / 100 : 1);

      const openingBalance = change.openingBalance ?? entry.balance;
      const earningBalance = Math.max(openingBalance, 0);
      const investmentGain = earningBalance * entry.rate / 100;
      const primaryContribution = salaryFunding && primaryActive ? primaryPay * entry.primaryRate / 100 : 0;
      const spouseContribution = salaryFunding && spouseActive ? spousePay * entry.spouseRate / 100 : 0;
      const recurringContribution = !salaryFunding || primaryActive ? entry.extra : 0;
      const deposit = change.oneTime ?? (!offset ? account.oneTime ?? 0 : 0);
      const available = openingBalance + investmentGain + primaryContribution + spouseContribution + recurringContribution + deposit;
      entry.balance = Math.max(available, 0);
      unpaid += Math.max(-available, 0);
      beginning += openingBalance;
      positiveOpening += earningBalance;
      earnings += investmentGain;
      primary += primaryContribution;
      spouse += spouseContribution;
      recurring += recurringContribution;
      oneTime += deposit;
    }
    const contributions = primary + spouse + recurring + oneTime;
    const studentCosts = completeStudents.map(s => {
      if (year < s.start || year >= s.start + s.duration) return 0;
      const factor = 1 + (s.inflation ?? 0) / 100;
      return s.cost === 0 ? 0 : s.cost * factor ** (year - s.base);
    });
    const cost = studentCosts.reduce((total, item) => total + item, 0);
    unpaid += cost;
    const investmentBalances = investments.map(entry => {
      const payment = Math.min(entry.balance, unpaid);
      entry.balance -= payment;
      unpaid -= payment;
      return entry.balance;
    });
    const balance = investmentBalances.reduce((total, amount) => total + amount, 0) - unpaid;
    const rate = positiveOpening ? earnings / positiveOpening * 100 : null;
    if (!Number.isFinite(balance)) return { errors: ['Check cost base years and growth rates. The projection exceeds the supported range.'], rows: [] };
    rows.push({
      year, cost, beginning, earnings, balance, rate, primaryPay, spousePay, primary,
      spouse, recurring, oneTime, contributions, studentCosts, investmentBalances, unpaid,
    });
  }
  const trough = rows.reduce((minimum, row) => row.balance < minimum.balance ? row : minimum, rows[0]);
  return {
    errors, rows, holdings, completeStudents, pendingStudents, endYear,
    totalCosts: rows.reduce((total, row) => total + row.cost, 0),
    gap: Math.max(0, -trough.balance),
    gapYear: trough.balance < 0 ? trough.year : null,
    firstShortfall: rows.find(row => row.balance < 0)?.year,
    outsideYears: lastCollege > endYear || lastChange > endYear ||
      completeStudents.some(s => s.start < h.startYear) || adjustments.some(a => a.year != null && a.year < h.startYear),
  };
}
