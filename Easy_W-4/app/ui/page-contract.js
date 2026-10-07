export const UI_VERSION='2026-10-06.4';
export function validatePage(document){
 const required=['household-fields','dependent-fields','income-adjustment-fields','deduction-fields','job-fields','benefit-fields','w4-fields','state-fields','help-link','help-guide','save-status','itemizing-guidance','paycheck-breakdown','annual-results'];
 if(document.documentElement.dataset.uiVersion!==UI_VERSION||required.some(id=>!document.getElementById(id))){
  throw new Error('This page is from an older or incomplete app version. Load the latest calculator to continue. Saved inputs will be kept.');
 }
}
