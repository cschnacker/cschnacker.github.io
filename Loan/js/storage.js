import { SETTINGS, emptyPlan, emptyModification } from '../data/defaults.js';

// Only inputs are persisted; calculated results are always rebuilt.
export function sanitize(input) {
  const plan = emptyPlan();
  if (!input || typeof input !== 'object') return plan;
  for (const key of Object.keys(plan)) {
    if (typeof plan[key] === 'string' && (typeof input[key] === 'string' || typeof input[key] === 'number')) plan[key] = String(input[key]).slice(0, 40);
  }
  plan.view = input.view === 'monthly' ? 'monthly' : 'annual';
  plan.modificationsEnabled = input.modificationsEnabled === true;
  plan.modifications = (Array.isArray(input.modifications) ? input.modifications : []).slice(0, SETTINGS.maxChanges).map(item => {
    const change = emptyModification();
    for (const key of Object.keys(change)) {
      if (key === 'refinance') change[key] = item?.[key] === true;
      else if (typeof item?.[key] === 'string' || typeof item?.[key] === 'number') change[key] = String(item[key]).slice(0, 40);
    }
    return change;
  });
  return plan;
}
export function loadPlan(storage) {
  try {
    const raw = storage.getItem(SETTINGS.storageKey);
    if (!raw) return { plan: emptyPlan(), status: 'empty' };
    const saved = JSON.parse(raw);
    if (saved.version !== SETTINGS.schemaVersion || !saved.inputs || typeof saved.inputs !== 'object') throw new Error('Unsupported saved data');
    return { plan: sanitize(saved.inputs), status: 'loaded' };
  } catch { return { plan: emptyPlan(), status: 'unavailable' }; }
}
export function savePlan(storage, plan) {
  try { storage.setItem(SETTINGS.storageKey, JSON.stringify({ version: SETTINGS.schemaVersion, inputs: sanitize(plan) })); return true; }
  catch { return false; }
}
export function clearPlan(storage) {
  try { storage.removeItem(SETTINGS.storageKey); return true; } catch { return false; }
}
