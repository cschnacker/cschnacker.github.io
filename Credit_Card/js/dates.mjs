export function monthIndex(value){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return NaN;
  const [year,month]=value.split('-').map(Number);
  return year*12+month-1;
}
export function endMonth(start,months){
  const index=monthIndex(start)+months-1;
  return `${String(Math.floor(index/12)).padStart(4,'0')}-${String(index%12+1).padStart(2,'0')}`;
}
export function inclusiveMonths(start,end){return monthIndex(end)-monthIndex(start)+1;}
