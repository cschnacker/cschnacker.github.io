import { SETTINGS, emptyPlan, emptyModification } from '../data/defaults.js';
import { sanitize } from './storage.js';

export function exportPlan(plan) {
  return JSON.stringify({ format: 'loan-planner', version: SETTINGS.schemaVersion,
    exportedAt: new Date().toISOString(), inputs: sanitize(plan) }, null, 2);
}

export function importPlan(text) {
  if (text.length > 100000) throw new Error('This file is too large to be a Loan Planner plan.');
  let file;
  try { file = JSON.parse(text); } catch { throw new Error('Choose a plan JSON file created with Download plan.'); }
  if (file?.format !== 'loan-planner') throw new Error('Choose a Loan Planner plan file, rather than a payment CSV or other file.');
  if (file.version !== SETTINGS.schemaVersion) throw new Error('This plan uses an unsupported version.');
  const inputs = file.inputs;
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) throw new Error('The plan file is missing its loan entries.');
  const numeric = value => (typeof value === 'string' && value.length <= 40 && (value.trim() === '' || Number.isFinite(Number(value)))) || (typeof value === 'number' && Number.isFinite(value));
  for (const [key,value] of Object.entries(emptyPlan())) {
    if (typeof value === 'string' && key !== 'view' && !numeric(inputs[key])) throw new Error(`The plan contains an invalid or missing ${key} entry.`);
  }
  if (!['annual','monthly'].includes(inputs.view) || typeof inputs.modificationsEnabled !== 'boolean' || !Array.isArray(inputs.modifications) || inputs.modifications.length > SETTINGS.maxChanges) throw new Error('The plan contains invalid display settings or loan changes.');
  for (const change of inputs.modifications) {
    if (!change || typeof change !== 'object' || Array.isArray(change)) throw new Error('The plan contains an invalid loan change.');
    for (const key of Object.keys(emptyModification())) {
      if (key === 'refinance' ? typeof change[key] !== 'boolean' : !numeric(change[key])) throw new Error(`A loan change contains an invalid or missing ${key} entry.`);
    }
  }
  return sanitize(inputs);
}
