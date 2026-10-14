
export function parseDollarInput(raw){
 const text=String(raw).trim().replace(/^([+-]?)\$\s*/,'$1');
 if(!/^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/.test(text))throw Error('Enter a dollar amount such as 18000 or 18,000.50.');
 const value=Number(text.replaceAll(',',''));
 if(!Number.isFinite(value))throw Error('Enter a finite dollar amount.');
 return value;
}
