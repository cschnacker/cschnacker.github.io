// Plan data only. No calculated results belong in the portable database.
export const FORMAT = 'business-finance-planner';
export const VERSION = 2;
export function createId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
}
export const CATEGORIES = [
  ['revenue', 'Revenue', 5], ['cogs', 'Cost of goods sold', 3],
  ['other', 'Other expenses', 3], ['salaries', 'Salaries', 3],
  ['payroll', 'Payroll', 3], ['healthcare', 'Healthcare', 6], ['retirement', '401(k)', 3]
];
export function newPlan(name = 'My business plan') {
  return {id: createId(), name, updatedAt: new Date().toISOString(),
    inputs: {startYear: new Date().getFullYear(), years: 40, socialSecurityRate: 6.2,
      initial: Object.fromEntries(CATEGORIES.map(([k]) => [k, null])),
      growth: Object.fromEntries(CATEGORIES.map(([k,,v]) => [k, v])), overrides: {}, growthOverrides: {}, notes: ''}};
}
const record = x => x && typeof x === 'object' && !Array.isArray(x);
function number(x, min, max, label, nullable = false) {
  if (nullable && x === null) return;
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max) throw Error(`Invalid ${label}.`);
}
export function validatePlan(p) {
  if (!record(p) || typeof p.id !== 'string' || !/^[\w-]{1,100}$/.test(p.id)) throw Error('Invalid plan ID.');
  if (typeof p.name !== 'string' || p.name.length > 120) throw Error('Plan name must be 120 characters or fewer.');
  if (typeof p.updatedAt !== 'string' || !Number.isFinite(Date.parse(p.updatedAt))) throw Error('Invalid saved date.');
  const i = p.inputs;
  if (!record(i) || !record(i.initial) || !record(i.growth) || !record(i.overrides)) throw Error('Missing plan inputs.');
  number(i.startYear, 1900, 9900, 'start year'); number(i.years, 1, 40, 'forecast length');
  if (!Number.isInteger(i.startYear) || !Number.isInteger(i.years)) throw Error('Years must be whole numbers.');
  number(i.socialSecurityRate, 0, 100, 'Social Security rate');
  if (typeof i.notes !== 'string' || i.notes.length > 10000) throw Error('Notes must be 10,000 characters or fewer.');
  for (const [k] of CATEGORIES) {
    number(i.initial[k], -1e12, 1e12, `${k} initial amount`, true);
    number(i.growth[k], -100, 1000, `${k} growth rate`);
  }
  for (const [offset, values] of Object.entries(i.overrides)) {
    if (!/^(?:[1-9]|[12][0-9]|3[0-9])$/.test(offset) || !record(values)) throw Error('Invalid override year.');
    for (const [k,v] of Object.entries(values)) {
      if (!CATEGORIES.some(([key]) => key === k)) throw Error('Unknown override category.');
      number(v, -1e12, 1e12, `${k} override`);
    }
  }
  const growthOverrides=i.growthOverrides===undefined?{}:i.growthOverrides;
  if(!record(growthOverrides))throw Error('Invalid growth adjustments.');
  for(const [offset,values] of Object.entries(growthOverrides)){
    if(!/^(?:[1-9]|[12][0-9]|3[0-9])$/.test(offset)||!record(values))throw Error('Invalid growth adjustment year.');
    for(const [k,v] of Object.entries(values)){
      if(!CATEGORIES.some(([key])=>key===k))throw Error('Unknown growth category.');
      number(v,-100,1000,`${k} growth adjustment`);
    }
  }
  // Select known fields instead of accepting executable or computed payloads.
  return {id:p.id, name:p.name, updatedAt:p.updatedAt, inputs:{startYear:i.startYear, years:i.years,
    socialSecurityRate:i.socialSecurityRate, notes:i.notes,
    initial:Object.fromEntries(CATEGORIES.map(([k]) => [k,i.initial[k]])),
    growth:Object.fromEntries(CATEGORIES.map(([k]) => [k,i.growth[k]])),
    overrides:JSON.parse(JSON.stringify(i.overrides)),growthOverrides:JSON.parse(JSON.stringify(growthOverrides))}};
}
export function validateDatabase(db) {
  if (!record(db) || db.format !== FORMAT || ![1,VERSION].includes(db.schemaVersion)) throw Error('Unsupported plan file or version.');
  if (!Array.isArray(db.plans) || db.plans.length < 1 || db.plans.length > 100) throw Error('A database must contain 1–100 plans.');
  const plans = db.plans.map(validatePlan);
  if (new Set(plans.map(p => p.id)).size !== plans.length) throw Error('Duplicate plan IDs.');
  if (!plans.some(p => p.id === db.activePlanId)) throw Error('Active plan is missing.');
  return {format:FORMAT, schemaVersion:VERSION, activePlanId:db.activePlanId, plans};
}
export function newDatabase() {
  const p = newPlan(); return {format:FORMAT, schemaVersion:VERSION, activePlanId:p.id, plans:[p]};
}
export function parseImport(text) {
  if (text.length > 5e6) throw Error('Plan file is too large (maximum 5 MB).');
  return validateDatabase(JSON.parse(text));
}
export function mergeImport(current, incoming) {
  // Imports are copies: never overwrite an existing plan, even with matching IDs.
  const copies = validateDatabase(incoming).plans.map(p => ({...p,id:createId(),name:(p.name+' (imported)').slice(0,120)}));
  return validateDatabase({...current, plans:[...current.plans,...copies],activePlanId:copies[0].id});
}
