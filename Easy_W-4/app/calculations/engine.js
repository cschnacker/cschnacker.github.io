import {stateWithholding} from './state-withholding.js';
// A deliberately small, non-eval interpreter for this workbook's Excel formulas.
// Cell addresses retain a direct audit trail to the supplied calculation model.
export class FormulaError extends Error { constructor(code,cell=''){super(code);this.code=code;this.cell=cell;} }
const fail=(code)=>{throw new FormulaError(code);};
const num=v=>{if(v==null||v==='')return 0;if(typeof v==='number'||typeof v==='boolean')return Number(v);return fail('#VALUE!');};
const str=v=>v==null?'':typeof v==='boolean'?(v?'TRUE':'FALSE'):String(v);
const colNum=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
const colName=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
const address=s=>{const m=s.replaceAll('$','').match(/^([A-Z]+)(\d+)$/);if(!m)fail('#REF!');return [colNum(m[1]),Number(m[2])];};
const precedence={'=':1,'<>':1,'<':1,'>':1,'<=':1,'>=':1,'&':2,'+':3,'-':3,'*':4,'/':4,'^':5};
export function bracketTax(income,lowerBounds,rates){
 income=Math.max(0,num(income));let total=0;
 for(let i=0;i<rates.length;i++){const lower=lowerBounds[i];if(typeof lower!=='number'||typeof rates[i]!=='number')fail('#DATA!');const upper=i+1<rates.length?lowerBounds[i+1]:Infinity;if(upper<lower)fail('#DATA!');total+=Math.max(0,Math.min(income,upper)-lower)*rates[i];}return total;
}
export function parseFormula(source){
 const tokens=[];const re=/\s+|"(?:[^"]|"")*"|'(?:[^']|'')*'|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.[0-9]+|\$?[A-Za-z_][A-Za-z_0-9.$]*|<>|<=|>=|[()+\-*/^&=<>!,:]/gy;
 let p=0;while(p<source.length){re.lastIndex=p;const m=re.exec(source);if(!m)throw new Error(`Unsupported formula at ${source.slice(p,p+30)}`);p=re.lastIndex;if(!/^\s+$/.test(m[0]))tokens.push(m[0]);}
 let i=0;const take=t=>{if(tokens[i++]!==t)throw new Error(`Expected ${t} in ${source}`);};
 function atom(){let t=tokens[i++];if(t==='+'||t==='-')return {type:'unary',op:t,value:atom()};if(t==='('){const n=expr();take(')');return n;}
 if(t?.startsWith('"'))return {type:'literal',value:t.slice(1,-1).replaceAll('""','"')};
 if(/^\d|^\.\d/.test(t))return {type:'literal',value:Number(t)};
 if(tokens[i]==='('){i++;const args=[];if(tokens[i]!==')'){do{args.push(expr());if(tokens[i]!==',')break;i++;}while(true);}take(')');return {type:'call',name:t.toUpperCase(),args};}
 if(t==='TRUE'||t==='FALSE')return {type:'literal',value:t==='TRUE'};
 let sheet='Easy W-4';if(tokens[i]==='!'){sheet=t.replace(/^'|'$/g,'').replaceAll("''", "'");i++;t=tokens[i++];}
 const start=t.replaceAll('$','').toUpperCase();address(start);if(tokens[i]===':'){i++;const end=tokens[i++].replaceAll('$','').toUpperCase();address(end);return {type:'range',sheet,start,end};}return {type:'ref',sheet,address:start};
 }
 function expr(min=0){let left=atom();while(precedence[tokens[i]]>=min){const op=tokens[i++];left={type:'binary',op,left,right:expr(precedence[op]+1)};}return left;}
 const result=expr();if(i!==tokens.length)throw new Error(`Trailing formula tokens: ${source}`);return result;
}
export function createEngine(model,data,inputs={}){
 const parsed=new Map(),memo=new Map(),active=new Set();const sheets={};let wageTaxEngine;
 for(const [name,rows] of Object.entries(data.tables)){sheets[name]={};for(const row of rows)for(const [col,field]of Object.entries(data.columnMaps[name]))sheets[name][col+row.sourceRow]=row.values[field]??null;}
 function cell(sheet,a){const key=sheet+'!'+a;if(memo.has(key)){const v=memo.get(key);if(v instanceof Error)throw v;return v;}
 if(active.has(key))throw new FormulaError('#CYCLE!',key);active.add(key);
 try{let v;if(sheet!=='Easy W-4'){if(!sheets[sheet])fail('#REF!');v=sheets[sheet][a]??null;}else if(Object.hasOwn(inputs,a))v=inputs[a];else if(model.formulas[a]){if(!parsed.has(a))parsed.set(a,parseFormula(model.formulas[a]));v=run(parsed.get(a));}else v=model.values[a]??null;
 if(typeof v==='number'&&!Number.isFinite(v))fail('#NUM!');memo.set(key,v);return v;
 }catch(e){if(!e.cell)e.cell=key;memo.set(key,e);throw e;}finally{active.delete(key);}}
 function range(n){const [c1,r1]=address(n.start),[c2,r2]=address(n.end);return Array.from({length:r2-r1+1},(_,r)=>Array.from({length:c2-c1+1},(_,c)=>cell(n.sheet,colName(c+c1)+(r+r1))));}
 function run(n){
 if(n.type==='literal')return n.value;
 if(n.type==='ref')return cell(n.sheet,n.address);
 if(n.type==='range')return range(n);
 if(n.type==='unary')return (n.op==='-'?-1:1)*num(run(n.value));
 if(n.type==='binary'){let a=run(n.left),b=run(n.right);if(n.op==='&')return str(a)+str(b);if(['=','<>','<','>','<=','>='].includes(n.op)){a=a??0;b=b??0;if(typeof a==='string')a=a.toLowerCase();if(typeof b==='string')b=b.toLowerCase();if(n.op==='=')return a===b;if(n.op==='<>')return a!==b;return n.op==='<'?a<b:n.op==='>'?a>b:n.op==='<='?a<=b:a>=b;}
 a=num(a);b=num(b);switch(n.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':if(b===0)fail('#DIV/0!');return a/b;case '^':return a**b;}}
 const args=n.args,e=i=>run(args[i]);
 if(n.name==='IF')return e(0)?e(1):(args[2]?e(2):false);
 if(n.name==='ISERROR'){try{e(0);return false;}catch(err){if(err instanceof FormulaError)return true;throw err;}}
 if(n.name==='ISNUMBER'){try{return typeof e(0)==='number';}catch(err){if(err instanceof FormulaError)return false;throw err;}}
 if(n.name==='PARAM'){const v=data.constants[e(0)];if(typeof v!=='number')fail('#PARAM!');return v;}
 if(n.name==='STATEWAGETAX'){
  // Reuse annual rules with non-payroll income removed; never infer actual income from W-4 elections.
  if(!wageTaxEngine){const wageInputs={...inputs};for(const a of ['C16','C17','C18','C19','C20','C21','C22','C3106'])wageInputs[a]=0;wageTaxEngine=createEngine(model,data,wageInputs);}
  return wageTaxEngine.get('F222');
 }
 if(n.name==='STATESUGGEST'){
  const tax=num(e(0)),weight=num(e(1)),total=num(e(2)),periods=num(e(3));
  if(!e(4))throw new Error('Suggested state withholding requires jobs in the household filing state; use manual entries for multistate work.');
  if(total<=0)return 0;
  return Math.max(0,tax)*weight/total/periods;
 }
 if(n.name==='STATEWH')return stateWithholding(data,{state:e(0),status:e(1)||'Single',wages:num(e(2)),periods:num(e(3)),allowances:num(e(4)),deductions:num(e(5)),extra:num(e(6)),manual:num(e(7)),mode:e(8),exempt:e(9)});
 if(n.name==='STATEBONUS'){const state=e(0);if(state==='California'){const policy=data.stateWithholding?.California;if(!policy||policy.year!==data.year)fail('#DATA!');return num(e(1))*policy.bonusRate;}return num(e(2));}
 if(n.name==='TAXYEAR')return data.year;
 if(['FEDTAX','FEDWH','STATETAX'].includes(n.name)){
  const income=num(e(0)),status=n.name==='STATETAX'?e(2):e(1);
  if(n.name==='STATETAX'){
   const state=e(1),rows=data.tables.SEqn,rs=rows.find(x=>x.state===state&&x.category==='Rate'),bs=rows.find(x=>x.state===state&&x.category===status);if(!rs||!bs)fail('#N/A');
   const rates=[],bounds=[];for(let i=1;i<=13;i++){const rate=rs.values[`bracketRateOrLowerBound${i}`],bound=bs.values[`bracketRateOrLowerBound${i}`];if(rate==null)break;rates.push(rate);bounds.push((bound??0)/num(e(3)));}if(!rates.length)fail('#DATA!');return bracketTax(income,bounds,rates);
  }
  const table=n.name==='FEDTAX'?'FEqn':'FEqnWH',rs=data.tables[table].find(x=>x.category==='Rate'),bs=data.tables[table].find(x=>x.category===status);if(!rs||!bs)fail('#N/A');
  if(n.name==='FEDTAX')return bracketTax(income,[0,...Array.from({length:6},(_,i)=>bs.values[`bracketRateOrLimit${i+1}`])],Array.from({length:7},(_,i)=>rs.values[`bracketRateOrLimit${i+1}`]));
  const offset=e(2)==='Yes'?9:1;return bracketTax(income,Array.from({length:8},(_,i)=>bs.values[`withholdingRateOrBound${offset+i}`]??0),Array.from({length:8},(_,i)=>rs.values[`withholdingRateOrBound${offset+i+1}`]));
 }
 if(n.name==='TODAY')return new Date(data.year,0,1);
 if(n.name==='YEAR')return e(0).getFullYear();
 if(n.name==='VLOOKUP'){
 const key=e(0),r=args[1],idx=num(e(2)),approx=args[3]?e(3):true;if(r.type!=='range')fail('#VALUE!');
 const [c1,r1]=address(r.start),[c2,r2]=address(r.end);if(idx<1||idx>c2-c1+1)fail('#REF!');let match=null;
 for(let row=r1;row<=r2;row++){const k=cell(r.sheet,colName(c1)+row);if(k===null)continue;if(str(k).toLowerCase()===str(key).toLowerCase()){match=row;break;}if(approx&&typeof k===typeof key&&k<=key)match=row;}
 if(match===null)fail('#N/A');return cell(r.sheet,colName(c1+idx-1)+match)??0;
 }
 const v=args.map(run).flat(Infinity);if(n.name==='SUM')return v.filter(x=>typeof x==='number').reduce((a,b)=>a+b,0);
 if(n.name==='MIN'||n.name==='MAX'){const numbers=v.filter(x=>typeof x==='number');return Math[n.name.toLowerCase()](...(numbers.length?numbers:[0]));}
 if(n.name==='AND')return v.every(Boolean);if(n.name==='OR')return v.some(Boolean);
 if(n.name==='ABS')return Math.abs(num(v[0]));
 if(n.name==='LOG'){if(num(v[0])<=0||num(v[1])<=0||num(v[1])===1)fail('#NUM!');return Math.log(num(v[0]))/Math.log(v[1]??10);}
 if(n.name==='ROUNDDOWN'||n.name==='ROUNDUP'){const factor=10**num(v[1]),x=num(v[0]);return Math.sign(x)*Math[n.name==='ROUNDUP'?'ceil':'floor'](Math.abs(x)*factor)/factor;}
 throw new Error(`Unsupported function: ${n.name}`);
 }
 return {get:(a,sheet='Easy W-4')=>cell(sheet,a),read(a,sheet='Easy W-4'){try{return {value:cell(sheet,a),error:null};}catch(e){return {value:null,error:e.code||e.message,cell:e.cell};}},evaluate:source=>run(parseFormula(source))};
}
