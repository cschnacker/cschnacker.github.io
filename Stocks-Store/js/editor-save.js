/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
export function invalidEditorField(form){
 for(const field of form.elements){if(field.disabled||!field.willValidate||field.closest('[hidden]'))continue;if(field.matches('input[data-dollar]'))field.setCustomValidity('');if(!field.checkValidity())return field;}return null;
}
export function bindEditorSave({form,dialog,error,save,read,render}){
 form.noValidate=true;let busy=false;
 form.onsubmit=async event=>{event.preventDefault();if(busy)return;error.textContent='';
  const focused=form.ownerDocument?.activeElement;if(focused&&form.contains(focused))focused.blur?.();
  const invalid=invalidEditorField(form);if(invalid){const label=invalid.getAttribute('aria-label')||invalid.name||'Field';error.textContent=label+': '+(invalid.validationMessage||'Check this value.');invalid.scrollIntoView?.({block:'center'});invalid.focus?.();return;}
  const button=event.submitter||form.querySelector('button[type="submit"]');busy=true;if(button)button.disabled=true;
  try{await save(read(form));dialog.close();render();}
  catch(err){error.textContent=err?.message||'Changes could not be saved. Your entries are still here; retry or export a backup.';error.scrollIntoView?.({block:'nearest'});}
  finally{busy=false;if(button)button.disabled=false;}
 };
}