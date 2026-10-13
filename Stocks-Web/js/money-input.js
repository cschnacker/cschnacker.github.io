export function steppedMoney(value,direction,increment,min=-Infinity,max=Infinity){
 const current=value===''?0:Number(value);if(!Number.isFinite(current)||!Number.isFinite(increment)||increment<=0)return null;const next=Math.min(max,Math.max(min,Number((current+direction*increment).toPrecision(15))));return Number.isFinite(next)?next:null;
}
export function bindMoneyInputs(doc){
 const adjust=(input,direction)=>{const min=input.min===''?-Infinity:Number(input.min),max=input.max===''?Infinity:Number(input.max),next=steppedMoney(input.value,direction,Number(input.dataset.increment),min,max);if(next===null)return;input.value=String(next);input.setCustomValidity('');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
 doc.addEventListener('click',event=>{const button=event.target.closest('[data-money-step]');if(!button)return;event.preventDefault();const input=button.closest('.money-control').querySelector('input[data-dollar]');adjust(input,Number(button.dataset.moneyStep));});
 doc.addEventListener('keydown',event=>{if(!event.target.matches('input[data-dollar]')||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();adjust(event.target,event.key==='ArrowUp'?1:-1);});
 for(const type of ['input','change'])doc.addEventListener(type,event=>{if(event.target.matches('input[data-dollar]'))event.target.setCustomValidity('');});
}