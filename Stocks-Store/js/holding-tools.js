export function holdingLocation(plan,holding){
 if(holding.accountId)return (plan.accounts||[]).find(a=>a.id===holding.accountId)?.name||holding.account||'Linked account';
 return 'Standalone investment'+(holding.account?' · '+holding.account:'');
}
export function copyHoldingForLocation(source,id,withDollarMode=true){
 if(!source)throw Error('Investment no longer exists.');
 const copy={id,symbol:source.symbol,name:source.name,type:source.type,account:'',owner:'Both',taxType:'Taxable',shares:0,price:source.price,basis:0,growth:source.growth,yield:source.yield,reinvest:source.reinvest,contributionMode:'none',contribution:0,contributionGrowth:0,primaryPct:0,spousePct:0,primaryDollars:0,spouseDollars:0};
 if(withDollarMode){copy.valuationMode=source.valuationMode||'shares';copy.balance=0;}
 if(source.quote)copy.quote=structuredClone(source.quote);
 return copy;
}
