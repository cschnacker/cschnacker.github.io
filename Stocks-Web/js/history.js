/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
export function recordSnapshot(holding,{kind='price',value,symbol=holding.symbol,source='manual',recordedAt=new Date().toISOString(),marketTime='',shares}={}){
 const entry={kind,value,symbol:symbol.trim().toUpperCase(),source,recordedAt,marketTime,...(shares!==undefined?{shares}:{})};validateHistory([entry]);holding.history??=[];
 if(holding.history.some(x=>x.kind===kind&&x.symbol===entry.symbol&&x.source===source&&x.recordedAt===recordedAt&&x.value===value))return;
 if(holding.history.length>=20000)throw Error('History is full. Export a backup before starting a new holding.');holding.history.push(entry);
}
export function validateHistory(history){
 if(history===undefined)return;if(!Array.isArray(history)||history.length>20000)throw Error('Invalid investment history.');
 for(const h of history)if(!h||!['price','value'].includes(h.kind)||!['manual','api','calculated'].includes(h.source)||typeof h.value!=='number'||!Number.isFinite(h.value)||h.value<0||h.value>1e12||typeof h.symbol!=='string'||h.symbol.length>24||typeof h.recordedAt!=='string'||!Number.isFinite(Date.parse(h.recordedAt))||typeof h.marketTime!=='string'||h.marketTime.length>500)throw Error('Invalid investment history observation.');
 for(const h of history)if(h.shares!==undefined&&(!Number.isFinite(h.shares)||h.shares<0||h.shares>1e12)||h.estimated!==undefined&&typeof h.estimated!=='boolean')throw Error('Invalid investment history share count.');
}
// Preserve supplied observations; only derive a missing counterpart at the same time.
export function completeHoldingHistory(holding,fallbackShares=holding.shares){
 const original=holding.history||[],result=[...original];
 if(['manual','mixed','holdings'].includes(holding.valuationMode))return result;
 const present=new Set(original.map(e=>JSON.stringify([e.symbol,e.recordedAt,e.kind])));
 for(const entry of original){
  const kind=entry.kind==='price'?'value':'price';
  if(present.has(JSON.stringify([entry.symbol,entry.recordedAt,kind])))continue;
  const shares=entry.shares??fallbackShares;
  if(!Number.isFinite(shares)||shares<=0)continue;
  const value=kind==='value'?entry.value*shares:entry.value/shares;
  if(!Number.isFinite(value)||value<0||value>1e12||result.length>=20000)continue;
  result.push({...entry,kind,value,shares,source:'calculated',estimated:entry.estimated===true||entry.shares===undefined});
 }
 return result;
}
export function recordHoldingSnapshot(holding,{recordedAt=new Date().toISOString(),source='manual',price=holding.price,marketTime=''}={}){
 if(holding.valuationMode==='dollars'){
  recordSnapshot(holding,{kind:'value',value:holding.balance,recordedAt,source,marketTime});return;
 }
 recordSnapshot(holding,{kind:'price',value:price,shares:holding.shares,recordedAt,source,marketTime});
 recordSnapshot(holding,{kind:'value',value:holding.shares*price,shares:holding.shares,recordedAt,source:'calculated',marketTime});
}
export function historyScale(values){
 const min=Math.min(...values),max=Math.max(...values),pad=max>min?(max-min)*.1:Math.max(max*.001,.03);
 const lower=Math.max(0,min-pad),upper=max+pad,rough=(upper-lower)/6,power=10**Math.floor(Math.log10(rough)),ratio=rough/power;
 const step=Math.max(.01,([1,2,2.5,5,10].find(n=>n>=ratio)||10)*power),lo=Math.max(0,Math.floor(lower/step)*step),hi=Math.ceil(upper/step)*step;
 const ticks=Array.from({length:Math.round((hi-lo)/step)+1},(_,i)=>Number((lo+i*step).toPrecision(14)));
 return {lo,hi,ticks};
}
export function historySeries(holding,kind){return (holding.history||[]).filter(h=>h.kind===kind&&h.symbol===(holding.symbol||'').trim().toUpperCase()).sort((a,b)=>Date.parse(a.recordedAt)-Date.parse(b.recordedAt));}
export function historyView(holding,esc,format){
 const complete={...holding,history:completeHoldingHistory(holding)};
 const sections=['value','price'].map(kind=>{
  const entries=historySeries(complete,kind);if(!entries.length)return '';
  const data=entries.slice(-1000),values=data.map(e=>e.value),times=data.map(e=>Date.parse(e.recordedAt)),{lo,hi,ticks}=historyScale(values);
  const x=i=>112+(times[i]-times[0])/(times.at(-1)-times[0]||1)*560,y=v=>276-(v-lo)/(hi-lo)*232,date=t=>new Date(t).toLocaleString();
  const tickLines=ticks.map(v=>`<line x1="112" y1="${y(v)}" x2="672" y2="${y(v)}" stroke="#d4ded8" stroke-width="1" stroke-dasharray="2 5"/><text x="102" y="${y(v)+4}" text-anchor="end" font-size="12" fill="#52665a">${esc(format(v))}</text>`).join('');
  const title=kind==='price'?'Share price ($)':'Investment dollar value ($)';
  const sameDay=new Date(times[0]).toDateString()===new Date(times.at(-1)).toDateString(),dateLabel=t=>new Date(t).toLocaleDateString()+(sameDay?' '+new Date(t).toLocaleTimeString(): '');
  return `<section><h3>${title}</h3><p class="muted">${entries.length} history point${entries.length===1?'':'s'}${entries.length>1000?' · chart shows latest 1,000':''}. ${entries.some(e=>e.estimated)?'Includes estimates based on share counts; earlier purchases or sales may change actual historical values.':''} ${kind==='value'?'Dollar values include deposits, withdrawals and market changes; this is not a performance chart.':''}</p><svg viewBox="0 0 720 330" role="img" aria-label="${esc(title)} history, ${data.length} recorded observations">${tickLines}<path d="M112 44V276H672" fill="none" stroke="#aab9b2"/>${data.length>1?`<polyline points="${data.map((e,i)=>`${x(i)},${y(e.value)}`).join(' ')}" fill="none" stroke="#30644b" stroke-width="2"/>`:''}${data.map((e,i)=>`<circle cx="${x(i)}" cy="${y(e.value)}" r="3" fill="#30644b"><title>${esc(date(e.recordedAt))}: ${esc(format(e.value))} · ${esc(e.source)}${e.estimated?` · estimated using ${e.shares} shares`:e.shares!==undefined?` · ${e.shares} shares`:''}</title></circle>`).join('')}<text x="112" y="310" font-size="11">${esc(dateLabel(times[0]))}</text><text x="672" y="310" text-anchor="end" font-size="11">${esc(dateLabel(times.at(-1)))}</text></svg><details><summary>History points (latest ${Math.min(entries.length,100)})</summary><div class="table-wrap"><table><thead><tr><th>Recorded</th><th>Value</th><th>Source</th><th>Market time</th></tr></thead><tbody>${entries.slice(-100).reverse().map(e=>`<tr><td>${esc(date(e.recordedAt))}</td><td>${esc(format(e.value))}</td><td>${e.estimated?'Estimated · '+esc(e.shares)+' shares':e.source==='api'?'API':e.source==='calculated'?'Calculated':'Manual'}</td><td>${esc(e.marketTime||'—')}</td></tr>`).join('')}</tbody></table></div></details></section>`;
 }).join('');
 return `<p>History uses your saved updates; missing days are not filled in.</p><details><summary>About calculated history</summary><p>Saved updates provide the observations. Missing price or dollar-value points are backcalculated from recorded shares when available; otherwise the current share count is used and the result is marked Estimated. Estimates may differ from actual history after earlier purchases or sales. Monthly updates give monthly observations; daily updates give daily observations. Lines connect recorded observations; missing days are not filled in. Dates show when you saved or retrieved the value.</p></details>${sections||'<p class="notice">No history yet for this ticker. Save an entered price or dollar value, or successfully retrieve a price, to begin. Earlier values are not reconstructed.</p>'}${(holding.history||[]).some(e=>e.symbol!==holding.symbol.trim().toUpperCase())?'<p class="muted">History from earlier tickers is retained in the backup but excluded from this chart.</p>':''}`;
}
