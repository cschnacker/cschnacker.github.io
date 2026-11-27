import { collections, emptyPlan, modules, normalize, singleton } from './model.mjs?v=2026-10';

const format = 'schnacker-income-tax-plan';
const version = 1;
const maximumRows = 500;

export function serialize(plan) {
  return JSON.stringify({ format, version, exportedAt: new Date().toISOString(), plan }, null, 2);
}

export function readBackup(text, defaultYear) {
  const data = JSON.parse(text);
  if (data?.format !== format || data.version !== version || !data.plan) {
    throw new Error('Choose an Income & Tax Planner version 1 backup.');
  }
  return validatePlan(data.plan, defaultYear);
}

function validatePlan(plan, defaultYear) {
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  for (const key of singleton) {
    if (!record(plan[key])) throw new Error('Missing or invalid ' + key + ' section.');
  }
  for (const key of collections) {
    if (!Array.isArray(plan[key]) || plan[key].length > maximumRows || !plan[key].every(record)) {
      throw new Error('Invalid ' + key + ' section.');
    }
  }
  return normalizePlan(plan, defaultYear);
}

function normalizePlan(plan, defaultYear) {
  const result = emptyPlan(defaultYear);
  for (const key of singleton) result[key] = normalize(key, plan[key], defaultYear);
  for (const key of collections) result[key] = (plan[key] ?? []).map(row => normalize(key, row, defaultYear));
  return result;
}

function connect() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(format, version);
    request.onupgradeneeded = () => request.result.createObjectStore('modules');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other planner tabs to open the database.'));
  });
}

export async function openPlanStore(defaultYear) {
  const db = await connect();
  db.onversionchange = () => db.close();
  function transaction(mode, operation) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('modules', mode);
      const result = operation(tx.objectStore('modules'));
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error ?? new Error('Database transaction interrupted.'));
    });
  }
  return {
    async hasPlan() {
      const request = await transaction('readonly', store => store.count());
      return request.result > 0;
    },
    async load() {
      const requests = await transaction('readonly', store => modules.map(key => store.get(key)));
      const plan = Object.fromEntries(modules.map((key, index) => [key, requests[index].result]));
      return normalizePlan(plan, defaultYear);
    },
    save(key, record) {
      return transaction('readwrite', store => store.put(record, key));
    },
    replace(plan) {
      const normalized = validatePlan(plan, defaultYear);
      return transaction('readwrite', store => {
        for (const key of modules) store.put(normalized[key], key);
      });
    },
    clear() {
      return transaction('readwrite', store => {
        store.clear();
        store.put(true, 'initialized');
      });
    }
  };
}
