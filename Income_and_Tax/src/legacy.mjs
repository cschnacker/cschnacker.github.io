import { changeSpec, emptyPlan, normalize } from './model.mjs?v=2026-8';

const legacyName = 'incomeandtax0.27-2026';
const legacyKey = 'this_form_';

export function convertLegacy(form, defaultYear) {
  if (!form || typeof form !== 'object') return null;
  const get = (row, col) => {
    const raw = form['XLEW_2_' + row + '_' + col];
    if (typeof raw === 'number') return raw;
    if (typeof raw !== 'string') return undefined;
    const value = raw.replace(/^[ns]:/, '').trim();
    if (!value || value === 'N/A') return undefined;
    return value.replace(/^[\$]|,(?=\d)/g, '');
  };
  if (![3, 4, 5, 19, 25, 27].some(row => get(row, 4) !== undefined || get(row, 5) !== undefined)) return null;
  const plan = emptyPlan(defaultYear);
  const filing = value => value === 'HOH' ? 'HoH' : value;
  const state = value => value === 'New Mexica' ? 'New Mexico' : value;
  plan.household = normalize('household', {
    year: get(2, 4) === 'N' ? get(3, 4) : 2026, age: get(4, 4), spouse: get(5, 4) === 'Y',
    spouseAge: get(6, 4), state: state(get(25, 5)), extraExemptions: get(26, 5),
    status: filing(get(27, 5)), stateStatus: filing(get(28, 5)),
    federalRate: get(30, 5), stateRate: get(31, 5)
  }, defaultYear);
  plan.income = normalize('income', {
    wages: get(19, 5), wageGrowth: get(19, 6), spouseWages: get(20, 5), spouseGrowth: get(20, 6),
    other: get(21, 5), otherGrowth: get(21, 6), pretax: get(22, 5), pretaxGrowth: get(22, 6),
    health: get(23, 5), healthGrowth: get(23, 6), credits: get(24, 5), creditGrowth: get(24, 6),
    retireAge: get(34, 5), spouseRetireAge: get(34, 6)
  });
  plan.retirement = normalize('retirement', {
    social: get(36, 5), socialAge: get(35, 5), socialGrowth: get(37, 5),
    spouseSocial: get(36, 6), spouseSocialAge: get(35, 6), spouseSocialGrowth: get(37, 6),
    taxable: get(40, 5), taxableAge: get(41, 5), taxableGrowth: get(42, 5),
    nontaxable: get(40, 6), nontaxableAge: get(41, 6), nontaxableGrowth: get(42, 6)
  });
  if (get(7, 4) === 'Y') {
    for (let row = 9; row <= 15; row += 1) {
      const birth = get(row, 3);
      if (birth && Number(birth) >= 1900) {
        plan.dependents.push(normalize('dependents', { birth, college: get(row, 4) }, defaultYear));
      }
    }
  }
  const fields = ['wages', 'wageGrowth', 'spouseWages', 'spouseGrowth', 'other', 'otherGrowth', 'pretax',
    'health', 'state', 'extraExemptions', 'status', 'stateStatus', 'credits'];
  for (let col = 4; col <= 8; col += 1) {
    const year = get(45, col);
    if (!year || Number(year) < 1900) continue;
    fields.forEach((field, index) => {
      const value = get(46 + index, col);
      if (value === undefined || changeSpec(field) === undefined) return;
      const mapped = field === 'state' ? state(value) : filing(value);
      plan.changes.push(normalize('changes', { year, field, value: String(mapped) }, defaultYear));
    });
  }
  return plan;
}

export async function readLegacy(defaultYear) {
  const databases = await indexedDB.databases?.();
  let record;
  if (databases?.some(database => database.name === legacyName)) {
    record = await new Promise((resolve, reject) => {
      const request = indexedDB.open(legacyName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(legacyName)) {
          db.close();
          resolve(null);
          return;
        }
        const tx = db.transaction(legacyName);
        const result = tx.objectStore(legacyName).get(legacyKey);
        tx.oncomplete = () => { db.close(); resolve(result.result); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  }
  if (!record) record = JSON.parse(localStorage.getItem(legacyName + '/' + legacyKey) || 'null');
  return convertLegacy(record, defaultYear);
}
