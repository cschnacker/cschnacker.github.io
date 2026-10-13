/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
import {recordSnapshot} from './history.js';
// Calculated accounts observe their linked starting values, never projected future values.
export function recordDerivedAccountHistory(next,previous,getValue){
 for(const a of next.accounts||[]){
  if(a.valuationMode!=='holdings')continue;
  const old=(previous.accounts||[]).find(x=>x.id===a.id);
  if((a.history||[]).length>(old?.history||[]).length)continue;
  const changed=!old||getValue(next,a)!==getValue(previous,old)||next.holdings.some(h=>h.accountId===a.id&&(h.history||[]).length!==(previous.holdings.find(x=>x.id===h.id)?.history||[]).length);
  if(changed)recordSnapshot(a,{kind:'value',value:getValue(next,a),source:'calculated'});
 }
}
