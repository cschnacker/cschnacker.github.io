
export const cashSources=[
 ['refundableCredits','Refundable tax credits','#468c78'],
 ['salary','Salary','#356ca5'],['ss','Social Security benefits','#249989'],
 ['primaryPension','Primary pension','#6774b9'],['spousePension','Spouse pension','#a386c3'],
 ['householdBondInterest','Bond / CD interest paid to household','#bf941f'],
 ['householdAnnuityIncome','Annuity payments to household','#dd9c64'],
 ['other','Other taxable income','#708975'],['free','Tax-exempt income','#a3b675'],
 ['taxableDraw','Taxable account withdrawals','#ba6689'],
 ['traditionalDraw','Traditional withdrawals (includes RMD)','#c65c47'],
 ['rothDraw','Roth withdrawals','#874ea2'],['cashDraw','Cash used / redeemed principal','#8798a3']
];
export function cashFlowTotals(r){
 const sources=cashSources.reduce((v,[k])=>v+(r[k]||0),0),uses=r.expenses+r.taxes+r.contributions;
 return {sources,uses,shortfall:r.shortfall,surplus:r.cashSurplus};
}
export function cashFlowView(rows,money,selectedYear){
 if(!rows.length)return '<div class="card">Enter a plan to see annual cash flow.</div>';
 const chosen=rows.find(r=>r.year===Number(selectedYear))||rows[0];
 const active=cashSources.filter(([k])=>rows.some(r=>r[k]>.005));
 const width=Math.max(820,rows.length*27+70),height=310,plot=230,left=64,top=20,bottom=top+plot;
 const max=Math.max(1,...rows.map(r=>Math.max(cashFlowTotals(r).sources+r.shortfall,cashFlowTotals(r).uses)));
 const y=v=>bottom-v/max*plot,step=(width-left-20)/rows.length;
 const bars=rows.map((r,i)=>{let base=0;const x=left+i*step+3;
 const segments=active.map(([k,label,color])=>{const value=r[k]||0,rect=`<rect x="${x}" y="${y(base+value)}" width="${step-6}" height="${value/max*plot}" fill="${color}"><title>${r.year}: ${label} — ${money(value)}</title></rect>`;base+=value;return rect;}).join('');
 return segments+`<rect x="${x}" y="${y(base+r.shortfall)}" width="${step-6}" height="${r.shortfall/max*plot}" fill="#d62839"><title>${r.year}: Unfunded gap — ${money(r.shortfall)}</title></rect><text x="${x+step/2-3}" y="${bottom+18}" transform="rotate(-55 ${x+step/2-3} ${bottom+18})" text-anchor="end">${r.year}</text>`;
 }).join('');
 const line=rows.map((r,i)=>`${i?'L':'M'}${left+i*step+step/2},${y(cashFlowTotals(r).uses)}`).join(' ');
 const total=cashFlowTotals(chosen);
 return `<section class="card"><h2>Where each year's dollars come from</h2><p>Stacked bars show household income and money drawn from investments. The dark line shows spending + taxes + employee contributions. Red shows an unfunded gap.</p><div class="table-scroll"><svg width="${width}" height="${height}" role="img" aria-label="Annual household cash sources versus spending, taxes and contributions. Choose a year below for exact amounts." style="font:11px Segoe UI,sans-serif">${[0,.25,.5,.75,1].map(f=>`<line x1="${left}" x2="${width-10}" y1="${y(max*f)}" y2="${y(max*f)}" stroke="#e0e7e1"/><text x="2" y="${y(max*f)-4}">${money(max*f)}</text>`).join('')}${bars}<path d="${line}" stroke="#163c38" fill="none" stroke-width="3"/></svg></div><div class="cash-legend">${active.map(([,label,color])=>`<span><i style="background:${color}"></i>${label}</span>`).join('')}<span><i style="background:#d62839"></i>Unfunded gap</span><span><i style="background:#163c38"></i>Spending + taxes + contributions</span></div></section>
 <section class="card"><div class="card-head"><h2>Annual cash-flow detail</h2><label for="cash-flow-year">Year<select id="cash-flow-year">${rows.map(r=>`<option value="${r.year}" ${r.year===chosen.year?'selected':''}>${r.year} · age ${r.primaryAge}</option>`).join('')}</select></label></div><div class="grid-2"><div><h3>Sources</h3><table><tbody>${cashSources.map(([k,label])=>`<tr><th scope="row">${label}</th><td>${money(chosen[k]||0)}</td></tr>`).join('')}<tr><th>Total available</th><td>${money(total.sources)}</td></tr></tbody></table></div><div><h3>Uses and balance</h3><table><tbody>${[['Living expenses (inflated)',chosen.expenses],['Federal income tax',chosen.federal],['State income tax',chosen.state],['Social Security payroll tax',chosen.socialSecurityTax],['Medicare tax',chosen.medicareTax],['Employee contributions',chosen.contributions],['Total needed',total.uses],['Surplus before cash transfers',total.surplus],['Year-end cash transferred to investments',chosen.cashTransferred||0],['Ending available cash',chosen.cash],['Unfunded gap',total.shortfall]].map(([label,value])=>`<tr><th scope="row">${label}</th><td>${money(value)}</td></tr>`).join('')}</tbody></table><h3>Other investment activity</h3><p>Employer contributions: ${money(chosen.match)}<br>Bond purchases: ${money(chosen.bondPurchases)}<br>Bond principal redeemed: ${money(chosen.bondRedemptions)}<br>Annuity premiums: ${money(chosen.annuityPremiums)}</p></div></div></section>
 <div class="note">Investment withdrawals may include earnings and principal. Interest and annuity payments retained inside linked accounts appear as household cash only when withdrawn; they are not counted twice. Cash used may include redeemed bond principal. Purchases and premiums use starting cash or account funds before household cash flow and appear separately above. Employer contributions, reinvested dividends, market growth and Roth conversions are not household spending cash. All amounts are nominal dollars for the selected year.</div>`;
}
