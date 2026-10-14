
import {validatePlan,accountTotal} from './model.js';
export function localDate(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function validBalanceDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
export function appendBalanceSnapshot(account,{date,amount,note='',applied=false}){
 account.balanceHistory??=[];
 account.balanceHistory.push({id:crypto.randomUUID(),date,amount,note,applied});
}
export function recordBalance(plan,accountId,entry,today=localDate()){
 if(!validBalanceDate(entry.date)||entry.date>today)throw Error('Enter a valid balance date no later than today.');
 const next=structuredClone(plan),a=next.accounts.find(a=>a.id===accountId);if(!a)throw Error('Account no longer exists.');
 if(typeof entry.amount!=='number'||!Number.isFinite(entry.amount)||entry.amount<0)throw Error('Enter a nonnegative balance.');
 if(entry.apply&&a.balanceAsOf&&entry.date<a.balanceAsOf)throw Error('This date is older than the current balance. Save as history only.');
 if(entry.apply){a.mode='balance';a.balance=entry.amount;a.balanceAsOf=entry.date;}
 appendBalanceSnapshot(a,{...entry,applied:entry.apply===true});
 return validatePlan(next);
}
export function sortedBalanceHistory(account){return (account.balanceHistory||[]).map((h,i)=>({...h,sequence:i})).sort((a,b)=>a.date.localeCompare(b.date)||a.sequence-b.sequence);}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function balanceHistoryView(plan,selectedId,money){
 const a=plan.accounts.find(a=>a.id===selectedId)||plan.accounts[0];
 if(!a)return '<section class="card"><h2>Balance history</h2><p>Add an account to begin recording actual balances.</p><button data-go="accounts">Go to accounts</button></section>';
 const rows=sortedBalanceHistory(a),w=760,h=260,max=Math.max(1,...rows.map(r=>r.amount)),x=i=>65+(rows.length===1?.5:i/(rows.length-1))*670,y=v=>220-v/max*190;
 const chart=rows.length?`<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Recorded balance history for ${esc(a.name)}. Each point is one dated update; exact values appear in the table.">${[0,.5,1].map(v=>`<line x1="65" x2="745" y1="${y(max*v)}" y2="${y(max*v)}" stroke="#dce5df"/><text x="2" y="${y(max*v)-4}" font-size="11">${esc(money(max*v))}</text>`).join('')}<path d="${rows.map((r,i)=>(i?'L':'M')+x(i)+','+y(r.amount)).join(' ')}" stroke="#176657" stroke-width="3" fill="none"/>${rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.amount)}" r="5" fill="#176657"><title>${r.date}: ${esc(money(r.amount))} — ${esc(r.note)}</title></circle>`).join('')}<text x="65" y="247" font-size="12">${rows[0].date}</text><text x="735" y="247" text-anchor="end" font-size="12">${rows.at(-1).date}</text></svg>`:'<p class="note">No recorded history yet. Existing balances have no known observation date; history starts with your first recorded update.</p>';
 return `<section class="card"><div class="card-head"><h2>Actual account balance history</h2><button data-balance-update="${esc(a.id)}">Update balance</button></div><label for="history-account">Account<select id="history-account">${plan.accounts.map(p=>`<option value="${esc(p.id)}" ${p.id===a.id?'selected':''}>${esc(p.name)} · ${esc(p.owner)}</option>`).join('')}</select></label><p>Current modeled account value: <strong>${money(accountTotal(plan,a))}</strong>${a.balanceAsOf?' · last applied balance date '+esc(a.balanceAsOf):''}</p>${chart}<p class="help">Recorded observations, not projected returns. Points are evenly spaced in date order, including multiple updates on the same date. Balance changes can include deposits, withdrawals, transfers and market movement; they are not a calculated investment return.</p><div class="table-scroll"><table><thead><tr><th>Date</th><th>Balance</th><th>Change from previous observation</th><th>Used to update plan</th><th>Note</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${r.date}</td><td>${money(r.amount)}</td><td>${i?money(r.amount-rows[i-1].amount):'—'}</td><td>${r.applied?'Yes, when recorded':'History only'}</td><td>${esc(r.note)}</td></tr>`).join('')||'<tr><td colspan="5">No observations.</td></tr>'}</tbody></table></div><p class="help">History is saved with each account and travels with plan, database and investment-module exports. Recording history alone does not change projections. Applying an entered balance replaces the starting value used throughout your selected projection; the date does not restart the plan or roll its start year forward. Review Plan start year and ages when beginning a new annual plan.</p></section>`;
}
