import { validatePlan } from './plan-schema.js?v=15';

const databaseName = 'SchnackerSoftwareSolutions.College';
const storeName = 'plans';
const activeKey = 'active';
let connection;

function openDatabase() {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        connection = undefined;
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  }).catch(error => {
    connection = undefined;
    throw error;
  });
  return connection;
}

async function transact(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error ?? request.error ?? new Error('Database transaction interrupted.'));
  });
}

export async function loadPlan() {
  const saved = await transact('readonly', store => store.get(activeKey));
  return saved === undefined
    ? { plan: null, revision: null }
    : { plan: validatePlan(saved.plan), revision: saved.revision };
}

async function changePlan(expectedRevision, replacement) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const read = store.get(activeKey);
    let conflict = false;
    read.onsuccess = () => {
      if ((read.result?.revision ?? null) !== expectedRevision) {
        conflict = true;
        transaction.abort();
        return;
      }
      if (replacement) store.put(replacement, activeKey);
      else store.delete(activeKey);
    };
    transaction.oncomplete = () => resolve(replacement?.revision ?? null);
    transaction.onabort = () => reject(conflict
      ? new Error('Another tab changed this plan. Export your edits before reloading to see the saved version.')
      : new Error('The browser could not write the plan database. Export a backup to keep your edits.'));
  });
}

export function savePlan(plan, revision) {
  return changePlan(revision, { plan: validatePlan(plan), revision: crypto.randomUUID() });
}

export function clearPlan(revision) {
  return changePlan(revision, null);
}

export function readBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Choose a planner backup.');
  }
  return validatePlan(data);
}
