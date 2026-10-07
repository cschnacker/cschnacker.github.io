import {retirementVisibility} from './retirement-inputs.js';
// Visibility is a relevance aid, not a determination of tax-credit eligibility.
export function expenseVisibility(inputs){
 const itemizing=inputs.C28==='Yes';
 return {C29:itemizing,C30:itemizing,C31:itemizing,C32:itemizing,C9:Number(inputs.C8)>0,C34:Number(inputs.C6)>0||Number(inputs.C7)>0||inputs.otherCare==='Yes'};
}
export function calculationInputs(inputs){
 const effective={...inputs};
 for(const [address,visible] of Object.entries({...expenseVisibility(inputs),...retirementVisibility(inputs)}))if(!visible)effective[address]=0;
 return effective;
}
