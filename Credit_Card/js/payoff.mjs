import {solvePayment} from './calculations.mjs';
import {endMonth,inclusiveMonths} from './dates.mjs';
export function payoffPanel(c,plan,money,escape){
  const target=c.payoffTarget||endMonth(plan.settings.start,Math.min(12,plan.settings.months));
  return `<details class="payoff-calculator"><summary>Payoff calculator${c.fixedPayment===undefined?'':` — Locked: ${money(c.fixedPayment)}/month`}</summary><p class="eyebrow">YOUR PAYOFF TARGET</p><h3>Pay this card off by…</h3><div class="payoff-controls"><label>Payoff month &amp; year<input type="month" data-payoff-target value="${escape(target)}" min="${plan.settings.start}" max="${endMonth(plan.settings.start,plan.settings.months)}" required></label><button data-action="calculate-payoff">Calculate payment</button></div><p class="lock-status">${c.fixedPayment===undefined?'Currently using minimum + extra payments.':`Locked monthly payment: ${money(c.fixedPayment)} (or minimum, if higher).`}</p>${c.fixedPayment===undefined?'':'<button data-action="unlock-payment">Unlock payment</button>'}<div class="payoff-result" role="status"></div><p class="note">Calculates from the plan start using your balance, APR, planned charges, annual charge increases, and scheduled changes through the target date. A locked payment replaces recurring extra payments, their increases, and scheduled extra-payment overrides; those settings are retained for unlocking. Minimums still apply if higher. One-time payments are additional. The final payment may be smaller. Later charges can create a new balance; changing assumptions can change the payoff date.</p></details>`;
}
export function payoffQuote(c,plan){
  const months=inclusiveMonths(plan.settings.start,c.payoffTarget||endMonth(plan.settings.start,Math.min(12,plan.settings.months)));
  if(!Number.isInteger(months)||months<1||months>plan.settings.months)throw Error('Choose a payoff month between the start and Plan through dates.');
  return {...solvePayment(c,months),months};
}
export function showQuote(element,quote,money){
  element.innerHTML=`<div class="payoff-amount"><small>Fixed monthly payment</small><strong>${money(quote.payment)}</strong></div><p>First payment: ${money(quote.firstPayment)} · Interest through target: ${money(quote.interest)}</p><p>Balance at target: ${money(quote.projection.rows[quote.months-1].balance)}. Minimum payments apply if higher; one-time payments are additional.</p><button class="primary" data-action="apply-payoff">Apply payment to plan</button>`;
}

