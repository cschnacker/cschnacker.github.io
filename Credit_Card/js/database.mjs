import {validate} from './model.mjs';
const DATABASE='SchnackerSoftwareSolutions.CreditCardPlanner';
let connection;
async function open(){
  if(connection) return connection;
  connection=await new Promise((resolve,reject)=>{
    const r=indexedDB.open(DATABASE,1);
    r.onupgradeneeded=()=>r.result.createObjectStore('plans');
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close other planner tabs to upgrade the database.'));
  });
  return connection;
}
async function transaction(mode, action){
  const db=await open();
  return new Promise((resolve,reject)=>{const tx=db.transaction('plans',mode);const r=action(tx.objectStore('plans'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Database operation aborted.'));});
}
export async function load(){const p=await transaction('readonly',s=>s.get('active'));return p?validate(p):null;}
export async function save(plan){const p=validate(plan);await transaction('readwrite',s=>s.put(p,'active'));}
export async function clear(){await transaction('readwrite',s=>s.delete('active'));}
export function serialize(plan){return JSON.stringify(validate(plan),null,2);}
export function deserialize(text){return validate(JSON.parse(text));}
