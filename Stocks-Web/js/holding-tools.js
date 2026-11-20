/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
export function holdingLocation(plan,holding){
 if(holding.accountId)return (plan.accounts||[]).find(a=>a.id===holding.accountId)?.name||holding.account||'Linked account';
 return 'Standalone investment'+(holding.account?' · '+holding.account:'');
}
// The last explicitly edited dollar total or price determines what a share edit recalculates.
export function reconcileHoldingValues(values,changed,anchor='price'){
 const next={...values};
 if(changed==='balance')anchor='value';
 if(changed==='price')anchor='price';
 if(!['balance','shares','price'].every(k=>Number.isFinite(next[k])&&next[k]>=0))return {values:next,anchor};
 if(anchor==='value'){
  if(next.shares>0)next.price=next.balance/next.shares;
 }else next.balance=next.shares*next.price;
 return {values:next,anchor};
}
export function bindHoldingValues(form,{anchor='price',notify=()=>{}}={}){
 const fields=form.elements;
 const sync=changed=>{
  const current=Object.fromEntries(['balance','shares','price'].map(k=>[k,Number(fields[k].value)]));
  const result=reconcileHoldingValues(current,changed,anchor);anchor=result.anchor;
  for(const key of ['balance','shares','price'])if(key!==changed&&Number.isFinite(result.values[key]))fields[key].value=String(Number(result.values[key].toPrecision(15)));
  notify(result.values,anchor);
 };
 form.addEventListener('input',event=>{if(['balance','shares','price'].includes(event.target.name))sync(event.target.name);});
 form.addEventListener('focusout',event=>{if(event.target.name==='shares'&&anchor==='value'&&Number(fields.shares.value)>0)anchor='price';});
 return {sync,setAnchor:value=>{anchor=value;}};
}
export function copyHoldingForLocation(source,id,withDollarMode=true){
 if(!source)throw Error('Investment no longer exists.');
 const copy={id,symbol:source.symbol,name:source.name,type:source.type,account:'',owner:'Both',taxType:'Taxable',shares:0,price:source.price,basis:0,growth:source.growth,yield:source.yield,reinvest:source.reinvest,contributionMode:'none',contribution:0,contributionGrowth:0,primaryPct:0,spousePct:0,primaryDollars:0,spouseDollars:0};
 if(withDollarMode){copy.valuationMode=source.valuationMode||'shares';copy.balance=0;}
 if(source.quote)copy.quote=structuredClone(source.quote);
 return copy;
}
