// Share one household allocation across all four W-4s, regardless of editing order.
// Totals correspond to rows 59, 62, 65 and 67 before subtracting W-4 entries.
export const w4Allocations=[
 {row:60,key:'children',label:'Children',unit:'count',total:'C6'},
 {row:63,key:'dependents',label:'Other dependents',unit:'count',total:'C7'},
 {row:66,key:'income',label:'Other income',unit:'money',total:'SUM(F238:H238)'},
 {row:68,key:'deductions',label:'Additional deductions',unit:'money',total:'MAX(0,SUM(B270:F270,G270)-M270)'}
];
export function getW4Availability(engine,inputs,job){
 if(!Number.isInteger(job)||job<0||job>3)throw new Error('Choose a job from 1 to 4.');
 return w4Allocations.map(spec=>{
  try{
   const total=engine.evaluate(spec.total);
   if(typeof total!=='number'||!Number.isFinite(total))throw new Error('Unavailable total');
   const earlier=[...'CDEF'].slice(0,job).reduce((sum,c)=>sum+Number(inputs[c+spec.row]??0),0);
   const entered=Number(inputs['CDEF'[job]+spec.row]??0);
   const allocated=[...'CDEF'].reduce((sum,c)=>sum+Number(inputs[c+spec.row]??0),0);
   const otherJobs=allocated-entered;
   return {...spec,total,earlier,available:total-otherJobs,entered,allocated,otherJobs,remaining:total-allocated,error:null};
  }catch(error){return {...spec,error:error.code||error.message};}
 });
}
