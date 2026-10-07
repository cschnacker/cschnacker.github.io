export const retirementGroups=[{key:'401kMethod',rows:[43,44,45]},{key:'rothMethod',rows:[46,47,48]}];
export const retirementMethods=['Percent','Dollars per paycheck','Annual dollars'];
export function retirementMethod(inputs,column,group){
 return inputs[column+group.key]??retirementMethods[Math.max(0,group.rows.findIndex(row=>Number(inputs[column+row])>0))];
}
export function retirementVisibility(inputs){
 const visibility={};
 for(const column of 'CDEF')for(const group of retirementGroups){
  const selected=retirementMethods.indexOf(retirementMethod(inputs,column,group));
  group.rows.forEach((row,index)=>visibility[column+row]=index===selected);
 }
 return visibility;
}
