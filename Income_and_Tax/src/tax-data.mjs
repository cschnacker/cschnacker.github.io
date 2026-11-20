export function validateRelease(tables, rules) {
  if (tables.schemaVersion !== 1 || tables.year !== rules.year || tables.releaseId !== rules.releaseId) {
    throw new Error('Tax schedules and planner rules are from different releases.');
  }
  const jurisdictions = [tables.federal, ...Object.values(tables.states)];
  for (const { filingMap, schedules } of jurisdictions) {
    for (const status of ['Single', 'Joint', 'Separate', 'HoH']) {
      if (!schedules[filingMap[status]]?.length) throw new Error('Missing ' + status + ' tax schedule.');
    }
    for (const schedule of Object.values(schedules)) {
      let lower = 0;
      schedule.forEach(({ upper, rate }, index) => {
        if (!Number.isFinite(rate) || rate < 0 || rate > 100 ||
            (upper === null ? index !== schedule.length - 1 : !Number.isFinite(upper) || upper <= lower)) {
          throw new Error('Invalid tax bracket in the ' + tables.year + ' release.');
        }
        lower = upper;
      });
    }
  }
  for (const [state, { filingMap }] of Object.entries(tables.states)) {
    for (const status of new Set(Object.values(filingMap))) {
      const amounts = rules.stateAllowances[state]?.[status];
      if (!amounts || !['deduction', 'exemption', 'credit'].every(key =>
        Number.isFinite(amounts[key]) && amounts[key] >= 0)) {
        throw new Error('Missing planner allowances for ' + state + ' (' + status + ').');
      }
    }
  }
  return { tables, rules };
}

async function loadJSON(file) {
  const response = await fetch(new URL('../data/' + file, import.meta.url));
  if (!response.ok) throw new Error('Could not load ' + file + '.');
  return response.json();
}

export async function loadReleases() {
  const manifest = await loadJSON('releases.json');
  if (manifest.schemaVersion !== 1 || !manifest.years?.length || !manifest.years.every(Number.isInteger)) {
    throw new Error('The tax release manifest is invalid.');
  }
  return Promise.all([...new Set(manifest.years)].sort((a, b) => a - b).map(async year => {
    const [tables, rules] = await Promise.all([loadJSON('tax-' + year + '.json'), loadJSON('planner-' + year + '.json')]);
    if (rules.year !== year) throw new Error('Unexpected tax year in the release.');
    return validateRelease(tables, rules);
  }));
}

export function releaseFor(releases, year) {
  return releases.findLast(release => release.rules.year <= year) ?? releases[0];
}

export function bracketTax(income, schedule, indexing = 1) {
  let total = 0;
  let lower = 0;
  for (const { upper, rate } of schedule) {
    const limit = upper === null ? Infinity : upper * indexing;
    total += Math.max(0, Math.min(income, limit) - lower) * rate / 100;
    lower = limit;
  }
  return income > lower ? null : total;
}

export function scheduleFor(jurisdiction, status) {
  return jurisdiction.schedules[jurisdiction.filingMap[status]];
}
