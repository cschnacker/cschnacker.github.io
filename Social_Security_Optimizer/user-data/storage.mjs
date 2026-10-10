import {cleanInputs,defaults} from './schema.mjs';
export const STORAGE_KEY='social-security-optimizer:plan:v1';
export function alignPlanYear(plan,year){const delta=year-plan.startYear;if(Number.isInteger(delta)&&delta!==0){for(const key of ['primary','spouse'])if(plan[key].age!=='')plan[key].age+=delta;}plan.startYear=year;return delta;}
export function loadPlan(storage,year){try{const raw=storage.getItem(STORAGE_KEY);const plan=raw?cleanInputs(JSON.parse(raw),year):defaults(year);const delta=raw?alignPlanYear(plan,year):0;return {plan,status:raw?(delta?'Saved ages advanced to the current plan year.':'Your saved plan is restored.'):'Inputs save automatically in this browser.'};}catch{return{plan:defaults(year),status:'Saved data could not be read. You can clear it or import a backup.'};}}
export function savePlan(storage,plan){try{storage.setItem(STORAGE_KEY,JSON.stringify(plan));return true;}catch{return false;}}
export function clearPlan(storage){try{storage.removeItem(STORAGE_KEY);return storage.getItem(STORAGE_KEY)===null;}catch{return false;}}
