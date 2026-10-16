import {validatePlan} from './model.mjs';
export const STORAGE_KEY='sss.budget.plan.v1';
export function savePlan(plan,storage=localStorage){validatePlan(plan);storage.setItem(STORAGE_KEY,JSON.stringify(plan));}
export function loadPlan(storage=localStorage){const text=storage.getItem(STORAGE_KEY);return text===null?null:validatePlan(JSON.parse(text));}
export function clearPlan(storage=localStorage){storage.removeItem(STORAGE_KEY);}
