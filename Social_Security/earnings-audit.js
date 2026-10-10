export function auditCoveredEarnings(text, caps) {
  const records=[];
  const seen=new Set();
  for(const original of text.split(/\r?\n/)) {
    const line=original.trim();
    if(!line)continue;
    const simple=line.match(/^(\d{4})(?:\s*[:=–—-]\s*|\s+)(\$?[\d,]+(?:\.\d{1,2})?|not yet recorded|not recorded|pending)\s*$/i);
    const columns=simple?[simple[1],simple[2]]:(line.includes('|')?line.split('|'):line.includes('\t')?line.split('\t'):line.split(',')).map(x=>x.trim()).filter(Boolean);
    if(!/^\d{4}$/.test(columns[0]||''))continue;
    const year=Number(columns[0]);
    if(seen.has(year))throw new Error(`Year ${year} appears more than once in the earnings record.`);
    seen.add(year);
    const maximum=caps[year];
    if(!Number.isFinite(maximum))throw new Error(`No Social Security earnings limit is available for ${year}.`);
    const amountText=columns[1]?.replace(/&#x20;|&nbsp;/gi,'').trim()||'';
    const missing=/not yet recorded|not recorded|pending/i.test(amountText);
    const normalized=amountText.replace(/[$,\s]/g,'');
    if(!missing&&!/^\d+(?:\.\d{1,2})?$/.test(normalized))throw new Error(`Year ${year} has an invalid Social Security covered-earnings amount.`);
    const covered=missing?null:Number(normalized);
    records.push({year,covered,maximum,percent:covered===null?null:covered/maximum*100,above:covered!==null&&covered>maximum+0.01});
  }
  if(!records.length)throw new Error('No year and covered-earnings pairs were found. Enter one per line, such as “2024 100921” or “2024 | $100,921”.');
  records.sort((a,b)=>b.year-a.year);
  const recent=records.filter(x=>x.covered!==null).slice(0,35);
  return {records,recent,atMax:recent.filter(x=>Math.abs(x.covered-x.maximum)<=0.01).length,aboveMax:records.filter(x=>x.above)};
}
