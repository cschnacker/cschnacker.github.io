/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
import {validatePlan,emptyPlan,uid} from './model.js';
// Named records share one small IndexedDB store. Legacy single plans migrate atomically.
export function createPlanStorage(indexedDB,databaseName='stocks-funds-user-data'){
 let db,currentId,migrated=false;
 async function connect(){if(db)return db;db=await new Promise((resolve,reject)=>{const r=indexedDB.open(databaseName,1);r.onupgradeneeded=()=>r.result.createObjectStore('documents');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close other planner tabs and retry.'));});return db;}
 async function transact(mode,work){const d=await connect();return new Promise((resolve,reject)=>{const tx=d.transaction('documents',mode),store=tx.objectStore('documents');let result,error;const done=v=>{result=v;},fail=e=>{error=e;tx.abort();};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(error||tx.error||Error('Database operation failed.'));tx.onabort=()=>reject(error||tx.error||Error('Database operation aborted.'));try{work(store,done,fail);}catch(e){fail(e);}});}
 async function read(){const result=await transact('readwrite',(store,done,fail)=>{const r=store.get('plan-index');r.onsuccess=()=>{try{const index=r.result;if(index!==undefined&&!Array.isArray(index))throw Error('Saved plan index is invalid. Existing data has not been overwritten.');if(index?.length){const active=store.get('active-plan');active.onsuccess=()=>{const id=index.some(x=>x.id===active.result)?active.result:index[0].id;if(active.result!==id)store.put(id,'active-plan');const record=store.get('plan:'+id);record.onsuccess=()=>{try{if(!record.result)throw Error('Saved plan record missing. Existing data has not been overwritten.');done({id,plan:validatePlan(record.result),migrated:false});}catch(e){fail(e);}};};}else{const legacy=store.get('plan');legacy.onsuccess=()=>{try{const plan=legacy.result?validatePlan(legacy.result):emptyPlan(),id=uid();store.put(plan,'plan:'+id);store.put([{id,name:plan.settings.name,updatedAt:new Date().toISOString()}],'plan-index');store.put(id,'active-plan');store.delete('plan');done({id,plan,migrated:true});}catch(e){fail(e);}};}}catch(e){fail(e);}};});currentId=result.id;migrated=result.migrated;return result.plan;}
 async function listPlans(){return transact('readonly',(store,done)=>{const r=store.get('plan-index');r.onsuccess=()=>done(r.result||[]);});}
 function validName(name,index,ignoreId){name=String(name||'').trim();if(!name||name.length>160)throw Error('Enter a plan name up to 160 characters.');if(index.some(x=>x.id!==ignoreId&&x.name.trim().toLowerCase()===name.toLowerCase()))throw Error('A plan with that name already exists. Choose another name.');return name;}
 async function mutate(change){const expected=currentId;return transact('readwrite',(store,done,fail)=>{const a=store.get('active-plan');a.onsuccess=()=>{try{if(!expected||a.result!==expected)throw Error('Another tab switched plans. Reload before editing.');const r=store.get('plan-index');r.onsuccess=()=>{try{change(store,r.result||[],done,fail,expected);}catch(e){fail(e);}};}catch(e){fail(e);}};});}
 async function write(plan){const value=validatePlan(plan);await mutate((store,index,done,fail,id)=>{value.settings.name=validName(value.settings.name,index,id);const item=index.find(x=>x.id===id);if(!item)throw Error('Active plan no longer exists. Reload.');item.name=value.settings.name;item.updatedAt=new Date().toISOString();store.put(value,'plan:'+id);store.put(index,'plan-index');done();});}
 async function createPlan(plan){const value=validatePlan(plan),id=uid();await mutate((store,index,done)=>{value.settings.name=validName(value.settings.name,index);if(index.length>=1000)throw Error('Maximum 1,000 named plans.');index.push({id,name:value.settings.name,updatedAt:new Date().toISOString()});store.put(value,'plan:'+id);store.put(index,'plan-index');store.put(id,'active-plan');done();});currentId=id;return value;}
 async function selectPlan(id){const result=await mutate((store,index,done,fail)=>{if(!index.some(x=>x.id===id))throw Error('Plan not found. Reload.');const r=store.get('plan:'+id);r.onsuccess=()=>{try{const plan=validatePlan(r.result);store.put(id,'active-plan');done(plan);}catch(e){fail(e);}};});currentId=id;return result;}
 async function clear(){const plan=await read(),next=emptyPlan();next.settings.name=plan.settings.name;await write(next);return next;}
 return {connect,read,listPlans,write,createPlan,selectPlan,clear,activeId:()=>currentId,didMigrate:()=>migrated};
}
let adapter;
const storage=()=>adapter??=createPlanStorage(globalThis.indexedDB);
export const connect=(...a)=>storage().connect(...a);
export const read=(...a)=>storage().read(...a);
export const listPlans=(...a)=>storage().listPlans(...a);
export const write=(...a)=>storage().write(...a);
export const createPlan=(...a)=>storage().createPlan(...a);
export const selectPlan=(...a)=>storage().selectPlan(...a);
export const clear=(...a)=>storage().clear(...a);
export const activeId=()=>storage().activeId();
export const didMigrate=()=>storage().didMigrate();
export function serialize(plan){return JSON.stringify(validatePlan(plan),null,2);}
export function parse(text){if(text.length>10000000)throw Error('File exceeds 10 MB.');return validatePlan(JSON.parse(text));}
