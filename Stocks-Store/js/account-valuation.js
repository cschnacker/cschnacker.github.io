// Partial account tracking: selected investments plus one automatic remainder.
export const holdingValue=h=>h.valuationMode==='dollars'?h.balance:h.shares*h.price;
export function trackedAccountValue(plan,id){const start=plan.settings.startYear;return (plan.holdings||[]).filter(h=>h.accountId===id).reduce((s,h)=>s+holdingValue(h),0)+(plan.bonds||[]).filter(b=>b.accountId===id&&b.existing&&b.maturityYear>=start&&(b.sellYear==null||b.sellYear>=start)).reduce((s,b)=>s+b.principal,0)+(plan.otherInvestments||[]).filter(h=>h.accountId===id).reduce((s,h)=>s+h.value,0);}
export const accountRemainder=(plan,a)=>Math.max(0,a.price-trackedAccountValue(plan,a.id));
export function accountPosition(plan,a){if(a.valuationMode!=='mixed')return a;const price=accountRemainder(plan,a);return {...a,price,name:a.name+' — Remaining investments',basis:a.price?a.basis*price/a.price:0};}
