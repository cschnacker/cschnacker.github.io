// Stable application defaults. No annual reference data or yearly updates required.
export const SETTINGS = Object.freeze({ storageKey: 'loan-planner:user-data:v1', schemaVersion: 1, maxYears: 100, maxChanges: 4 });
export function emptyPlan() {
  return { startYear: '', startMonth: '1', years: '', principal: '', rate: '', taxes: '', insurance: '', extra: '', lumpSum: '', taxGrowth: '3', insuranceGrowth: '3', extraGrowth: '0', modificationsEnabled: false, modifications: [], view: 'annual' };
}
export function emptyModification() {
  return { year: '', years: '', balance: '', rate: '', taxes: '', insurance: '', extra: '', lumpSum: '', refinance: false };
}
