/* Generic bracket calculation. Rates and thresholds live in data/*.json. */
(function(root){
  'use strict';
  function validate(data) {
    if (!data || data.schemaVersion !== 1 || !Number.isInteger(data.year) || !data.federal || !data.states) throw new Error('Invalid tax data file.');
    for (const jurisdiction of [data.federal,...Object.values(data.states)]) {
      if (!jurisdiction.schedules || !jurisdiction.filingMap) throw new Error('Missing filing schedules.');
      for (const [name,schedule] of Object.entries(jurisdiction.schedules)) {
        if (!Array.isArray(schedule) || !schedule.length) throw new Error('Empty schedule: '+name);
        let lower=0;
        schedule.forEach((b,index)=>{
          if (!Number.isFinite(b.rate) || b.rate<0 || b.rate>100) throw new Error('Invalid rate.');
          if (b.upper===null) {if(index!==schedule.length-1) throw new Error('Open bracket must be last.');}
          else if (!Number.isFinite(b.upper) || b.upper<=lower) throw new Error('Bracket limits must increase.');
          lower=b.upper;
        });
      }
      for(const target of Object.values(jurisdiction.filingMap)) if(!jurisdiction.schedules[target]) throw new Error('Unknown filing mapping.');
    }
    return data;
  }
  function create(data) {
    validate(data);
    // Isolate the runtime from later mutations of the editable source object.
    data=JSON.parse(JSON.stringify(data));
    function calculate(income,filing,kind,state) {
      if(typeof income!=='number'||!Number.isFinite(income)||income<0) throw new Error('Enter a valid taxable income of zero or more.');
      if(!['Single','Joint','Separate','HoH'].includes(filing)) throw new Error('Choose a filing status.');
      if(!['Federal','State'].includes(kind)) throw new Error('Choose federal or state.');
      const jurisdiction=kind==='Federal'?data.federal:data.states[state];
      if(!jurisdiction) throw new Error('Choose a supported state.');
      const schedule=jurisdiction.schedules[jurisdiction.filingMap[filing]];
      if(!schedule) throw new Error('This data release does not support that filing status.');
      const last=schedule[schedule.length-1];
      if(last.upper!==null && income>last.upper) throw new Error('The existing '+state+' table does not cover this income. An updated state table is required.');
      let lower=0,total=0;
      const brackets=schedule.map(b=>{
        const portion=Math.max(0,Math.min(income,b.upper===null?income:b.upper)-lower);
        const tax=portion*b.rate/100;
        const result={lower,upper:b.upper,rate:b.rate,portion,tax};
        lower=b.upper;total+=tax;return result;
      });
      return {total,effective:income===0?0:total/income,brackets};
    }
    return {calculate,states:Object.keys(data.states),year:data.year,releaseId:data.releaseId};
  }
  root.TaxEngine={create,validate};
  if(root.TaxData) root.TaxModel=create(root.TaxData);
  if(typeof module!=='undefined'&&module.exports) module.exports=root.TaxEngine;
})(typeof window==='undefined'?globalThis:window);
