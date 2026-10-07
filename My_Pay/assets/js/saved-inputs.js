import {defaults,migrateContributions} from './pay-engine.js';
const legacyKey='my-pay-inputs-v1';
const key=year=>`my-pay-inputs-${year}-v2`;
export function normalizeInputs(value){
  if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('Choose a My Pay input file.');
  const migrated=migrateContributions({...defaults,...value});
  // Missing modes on old files need the legacy migration, before defaults mask them.
  if(value.retirementMode===undefined||value.rothMode===undefined){
    const old={...defaults,...value};
    for(const prefix of ['retirement','roth'])if(value[prefix+'Mode']===undefined)delete old[prefix+'Mode'];
    Object.assign(migrated,migrateContributions(old));
  }
  const result={};
  for(const [name,fallback] of Object.entries(defaults)){
    const v=migrated[name];
    if(typeof v!==typeof fallback || (typeof v==='number'&&(!Number.isFinite(v)||v<0)))throw new Error(`Invalid saved input: ${name}.`);
    result[name]=v;
  }
  return result;
}
export function saveInputs(storage,year,input){storage.setItem(key(year),JSON.stringify({schemaVersion:2,year,inputs:input}));}
export function restoreInputs(storage,year){
  const stored=storage.getItem(key(year));
  if(stored){const parsed=JSON.parse(stored);if(parsed.schemaVersion!==2||parsed.year!==year)throw new Error('Saved inputs belong to a different year.');return normalizeInputs(parsed.inputs);}
  const old=year===2026?storage.getItem(legacyKey):null;
  if(!old)return null;
  const result=normalizeInputs(JSON.parse(old));saveInputs(storage,year,result);return result;
}
export function clearInputs(storage,year){storage.removeItem(key(year));if(year===2026)storage.removeItem(legacyKey);}
