export const numericFields = ['balance','apr','charges','extra','minimum','minimumPercent','chargeGrowth','extraGrowth'];
export function newCard(config, id) {
  return {id, name:'New card', balance:0, apr:0, charges:0, extra:0, minimum:config.defaultMinimum, minimumPercent:config.defaultMinimumPercent, chargeGrowth:0, extraGrowth:0, changes:[]};
}
export function newPlan(config) {
  const d=new Date();
  return {schemaVersion:1, application:'SSS-CreditCardPlanner', settings:{start:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,months:config.defaultMonths, defaultsYear:config.year},cards:[]};
}
export function validate(data) {
  if(!data || data.schemaVersion!==1 || data.application!=='SSS-CreditCardPlanner') throw Error('This is not a supported Credit Card Planner database (version 1).');
  const s=data.settings;
  if(!s || !/^\d{4}-(0[1-9]|1[0-2])$/.test(s.start) || !Number.isInteger(s.months) || s.months<1 || s.months>600 || !Number.isInteger(s.defaultsYear)) throw Error('Invalid plan settings. Use 1–600 months.');
  if(!Array.isArray(data.cards)||data.cards.length>100) throw Error('Database must contain no more than 100 cards.');
  const ids=new Set();
  for(const c of data.cards){
    if(typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.name!=='string'||c.name.length>100) throw Error('Invalid or duplicate card identity.');
    ids.add(c.id);
    if(c.fixedPayment!==undefined&&(typeof c.fixedPayment!=='number'||!Number.isFinite(c.fixedPayment)||c.fixedPayment<0||c.fixedPayment>1e9))throw Error('Invalid locked payment.');
    if(c.payoffTarget!==undefined&&(typeof c.payoffTarget!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(c.payoffTarget)))throw Error('Invalid payoff target date.');
    for(const k of numericFields) if(typeof c[k]!=='number'||!Number.isFinite(c[k])||c[k]<0||c[k]>(['apr','minimumPercent','chargeGrowth','extraGrowth'].includes(k)?100:1e9)) throw Error(`Invalid ${k} for ${c.name}.`);
    if(!Array.isArray(c.changes)||c.changes.length>600) throw Error('Invalid scheduled changes.');
    const months=new Set();
    for(const e of c.changes){
      if(!Number.isInteger(e.month)||e.month<1||e.month>600||months.has(e.month)) throw Error('Choose a unique change month and year within 50 years of the plan start.');
      months.add(e.month);
      for(const k of Object.keys(e)){
        if(k==='month') continue;
        if(!['balance','apr','charges','extra','oneCharge','onePayment'].includes(k)||typeof e[k]!=='number'||!Number.isFinite(e[k])||e[k]<0||e[k]>(k==='apr'?100:1e9)) throw Error('Invalid scheduled change value.');
      }
    }
  }
  return JSON.parse(JSON.stringify(data));
}


