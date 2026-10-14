
const colors=['#176657','#668bc4','#9171b0','#c49b3a','#c46552','#7b9094'];
const n=(r,k)=>Number(r[k])||0;
const sum=(...keys)=>r=>keys.reduce((v,k)=>v+n(r,k),0);
const series=(label,value,color)=>({label,value:typeof value==='string'?r=>n(r,value):value,color});
export const projectionChartGroups=[
 {title:'Total investments by category',note:'Year-end balances. Linked bonds are included in their account category; standalone bonds are in Taxable.',series:[
 series('Traditional','traditional',colors[0]),series('Roth','roth',colors[1]),series('Taxable','taxable',colors[2]),series('Cash','cash',colors[5])]},
 {title:'Income sources by category',note:'Household income plus withdrawals. Cash used may include redeemed principal; linked investment payments are counted only when withdrawn.',series:[
 series('Refundable tax credits','refundableCredits','#468c78'),series('Salary','salary',colors[1]),series('Social Security','ss',colors[0]),series('Pensions',sum('primaryPension','spousePension'),'#437d96'),
 series('Bond interest','householdBondInterest',colors[3]),series('Annuity income','householdAnnuityIncome','#af7842'),
 series('Other income',sum('other','free'),colors[2]),series('Account withdrawals','withdrawals',colors[4]),series('Cash used','cashDraw',colors[5])]},
 {title:'Taxes and expenses',note:'Living expenses plus federal, state and payroll taxes. Medicare includes Additional Medicare Tax. Contributions appear in the optional investment activity graph.',series:[
 series('Living expenses','expenses',colors[0]),series('Federal tax','federal',colors[4]),series('State tax','state',colors[1]),series('Social Security payroll tax','socialSecurityTax',colors[3]),series('Medicare tax','medicareTax',colors[2])]},
 {title:'Saving and moving investments',line:true,note:'Separate lines, not an added total. Conversions and cash transfers move existing assets; they do not create income.',series:[
 series('Your contributions','contributions',colors[0]),series('Employer contributions','match',colors[1]),series('Roth conversions','conversion',colors[2]),
 series('Cash to investments','cashTransferred',colors[3]),series('Bond purchases + annuity premiums',sum('bondPurchases','annuityPremiums'),colors[5])]},
 {title:'Cash surplus and funding gaps',line:true,note:'Surplus is before scheduled cash transfers. Unfunded spending is after permitted withdrawals; unmet investment requests are capped.',series:[
 series('Income surplus','cashSurplus',colors[0]),series('Unfunded spending','shortfall','#bd2637'),
 series('Unfunded investing',r=>Math.max(0,n(r,'baseContributionRequest')-n(r,'baseContributions'))+n(r,'investmentUnfunded'),'#b17d1f')]}
];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function projectionCharts(rows,settings,money,selectedYear){
 if(!rows.length)return '';
 const selected=rows.find(r=>r.year===Number(selectedYear))||rows[0],index=rows.indexOf(selected);
 const retirementYear=settings.startYear+settings.primaryRetire-settings.primaryAge;
 const cards=projectionChartGroups.map(group=>{
 const w=600,h=265,left=65,right=16,top=18,bottom=219,pw=w-left-right,ph=bottom-top;
 const max=Math.max(1,...rows.map(r=>group.line?Math.max(...group.series.map(s=>s.value(r))):group.series.reduce((v,s)=>v+s.value(r),0)))*1.08;
 const x=i=>left+(i+.5)*pw/rows.length,y=v=>bottom-v/max*ph;
 let plot='';
 if(group.line){
 plot=group.series.map(s=>{
 const path=rows.map((r,i)=>(i?'L':'M')+x(i).toFixed(2)+','+y(s.value(r)).toFixed(2)).join(' ');
 return `<path d="${path}" stroke="${s.color}" stroke-width="2.5" fill="none"/>${rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(s.value(r))}" r="${i===index?4:2}" fill="${s.color}"><title>${r.year}: ${esc(s.label)} ${money(s.value(r))}</title></circle>`).join('')}`;
 }).join('');
 }else{
 const bw=Math.max(1,pw/rows.length*.76);
 plot=rows.map((r,i)=>{let total=0;return group.series.map(s=>{
 const value=s.value(r),out=`<rect x="${x(i)-bw/2}" y="${y(total+value)}" width="${bw}" height="${value/max*ph}" fill="${s.color}"><title>${r.year}: ${esc(s.label)} ${money(value)}</title></rect>`;
 total+=value;return out;
 }).join('');}).join('');
 }
 const ticks=[...new Set([0,Math.round((rows.length-1)/4),Math.round((rows.length-1)/2),Math.round(3*(rows.length-1)/4),rows.length-1])];
 const ri=rows.findIndex(r=>r.year===retirementYear);
 const compact=v=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1,style:'currency',currency:'USD'}).format(v);
 return `<section class="card projection-graph"><h3>${group.title}</h3><p class="help">${group.note}</p><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(group.title)}. Exact selected-year values appear below."><title>${esc(group.title)} - ${rows[0].year} to ${rows.at(-1).year}</title>${[0,.25,.5,.75,1].map(f=>`<line x1="${left}" x2="${w-right}" y1="${y(max*f)}" y2="${y(max*f)}" stroke="#dfe7e1"/><text x="2" y="${y(max*f)+4}">${compact(max*f)}</text>`).join('')}<rect x="${x(index)-pw/rows.length/2}" y="${top}" width="${pw/rows.length}" height="${ph}" fill="#e5ece4"/>${plot}${ri>=0?`<line x1="${x(ri)}" x2="${x(ri)}" y1="${top}" y2="${bottom}" stroke="#253c37" stroke-dasharray="4 4"><title>Selected retirement year ${retirementYear}</title></line>`:''}${ticks.map(i=>`<text x="${x(i)}" y="${bottom+21}" text-anchor="middle">${rows[i].year}</text>`).join('')}</svg><div class="projection-legend">${group.series.map(s=>`<div><span><i style="background:${s.color}"></i>${s.label}</span><strong>${money(s.value(selected))}</strong></div>`).join('')}</div>${!group.line?`<div class="projection-total">${selected.year} total <strong>${money(group.series.reduce((v,s)=>v+s.value(selected),0))}</strong></div>`:''}</section>`;
 });
 return `<div id="projection-dashboard"><section class="card"><div class="card-head"><div><h2>Your projection at a glance</h2><p>${rows[0].year}–${rows.at(-1).year} · nominal dollars · each graph has its own scale</p></div><label for="projection-chart-year">Show values for<select id="projection-chart-year">${rows.map(r=>`<option value="${r.year}" ${r.year===selected.year?'selected':''}>${r.year} · age ${r.primaryAge}</option>`).join('')}</select></label></div><p class="help">The shaded column marks the selected year. The dashed line marks your selected retirement year. Hover over a bar or point for its amount. Exact values for the selected year are shown below every graph.</p></section><div class="projection-graphs projection-primary">${cards.slice(0,3).join('')}</div><details class="projection-extra"><summary>More graphs: investment activity and funding gaps</summary><div class="projection-graphs">${cards.slice(3).join('')}</div></details></div>`;
}
