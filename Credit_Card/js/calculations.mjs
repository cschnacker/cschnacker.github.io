const cents=n=>Math.round((n+Number.EPSILON)*100)/100;
export function projectCard(card, months){
  let balance=card.balance, apr=card.apr, charges=card.charges, extra=card.extra;
  const rows=[];
  for(let month=1;month<=months;month++){
    if(month>1&&(month-1)%12===0){charges*=1+card.chargeGrowth/100;extra*=1+card.extraGrowth/100;}
    const e=card.changes.find(e=>e.month===month)||{};
    if(e.balance!==undefined) balance=e.balance;
    if(e.apr!==undefined) apr=e.apr;
    if(e.charges!==undefined) charges=e.charges;
    if(e.extra!==undefined) extra=e.extra;
    const opening=cents(balance), interest=cents(opening*apr/1200), added=cents(charges+(e.oneCharge||0));
    const due=cents(opening+interest+added);
    const minimum=cents(Math.min(due,Math.max(card.minimum,opening*card.minimumPercent/100)));
    const payment=cents(Math.min(due,(card.fixedPayment===undefined?minimum+extra:Math.max(minimum,card.fixedPayment))+(e.onePayment||0)));
    balance=cents(Math.max(0,due-payment));
    if(!Number.isFinite(balance)||balance>1e15) throw Error('Projection exceeds supported amounts. Reduce rates, growth, or duration.');
    rows.push({month,opening,apr,interest,charges:added,minimum,payment,principal:cents(payment-interest),balance});
  }
  const lastPositive=rows.reduce((last,r,i)=>r.balance>0?i:last,-1);
  const payoff=rows.length&&rows[rows.length-1].balance===0 ? (lastPositive<0 ? (card.balance>0||rows.some(r=>r.payment>0)?1:0) : lastPositive+2) : null;
  return {rows,payoff,interest:cents(rows.reduce((s,r)=>s+r.interest,0)),payments:cents(rows.reduce((s,r)=>s+r.payment,0))};
}
export function project(plan){
  const cards=plan.cards.map(c=>({...projectCard(c,plan.settings.months),id:c.id,name:c.name}));
  const rows=Array.from({length:plan.settings.months},(_,i)=>cards.reduce((r,c)=>{for(const k of ['opening','interest','charges','minimum','payment','principal','balance'])r[k]=cents(r[k]+c.rows[i][k]);return r;},{month:i+1,opening:0,interest:0,charges:0,minimum:0,payment:0,principal:0,balance:0}));
  return {cards,rows,interest:cents(cards.reduce((s,c)=>s+c.interest,0)),payoff:cards.some(c=>c.payoff===null)?null:Math.max(0,...cards.map(c=>c.payoff))};
}

// Search integer cents using the same projection engine as the plan.
export function solvePayment(card,months){
  if(!Number.isInteger(months)||months<1||months>600)throw Error('Choose a payoff date within the plan.');
  const trial=payment=>projectCard({...card,fixedPayment:payment},months);
  const paid=payment=>{try{const rows=trial(payment).rows;return rows[months-1].balance===0&&rows.every(r=>r.minimum<=payment);}catch{return false;}};
  let low=0,high=100;
  while(!paid(high/100)&&high<100000000000)high=Math.min(100000000000,high*2);
  if(!paid(high/100))throw Error('No payment within the supported limit can meet this target.');
  while(low<high){const middle=Math.floor((low+high)/2);if(paid(middle/100))high=middle;else low=middle+1;}
  const payment=low/100,projection=trial(payment);
  return {payment,projection,firstPayment:projection.rows[0].payment,interest:projection.interest};
}

