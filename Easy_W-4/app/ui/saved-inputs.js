// Browser-local, tax-year-specific household scenarios. Annual tax tables are not saved here.
const key=year=>`easy-w4:inputs:v1:${year}`;
export function saveInputs(storage,year,inputs,job){
 storage.setItem(key(year),JSON.stringify({schemaVersion:1,year,inputs,job}));
}
export function restoreInputs(storage,year,validate){
 const raw=storage.getItem(key(year));
 if(raw===null)return null;
 const saved=JSON.parse(raw);
 if(saved.schemaVersion!==1||saved.year!==year)throw new Error('Saved inputs have an incompatible format.');
 return {inputs:validate(saved.inputs),job:Number.isInteger(saved.job)&&saved.job>=0&&saved.job<4?saved.job:0};
}
export function clearInputs(storage,year){storage.removeItem(key(year));}
