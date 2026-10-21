// Presentation only: consumes calculated monthly balances; never recalculates debt.
export function balanceChart(plan, result, months, formatMoney, monthLabel, escape, kind='balance'){
  const payments=kind==='payment';
  const colors=['#2864b7','#b45d16','#8b4aa0','#087f82','#b23c64','#657522'];
  const total=plan.cards.reduce((sum,c)=>sum+c.balance,0);
  const series=[{name:'Combined total',color:'#143f3d',width:4,values:payments?result.rows.slice(0,months).map(r=>r.payment):[total,...result.rows.slice(0,months).map(r=>r.balance)]},...result.cards.map((card,i)=>({name:card.name||`Card ${i+1}`,color:colors[i%colors.length],width:2.5,dash:i%2?'7 4':'',values:payments?card.rows.slice(0,months).map(r=>r.payment):[plan.cards[i].balance,...card.rows.slice(0,months).map(r=>r.balance)]}))];
  const maximum=Math.max(1,...series[0].values),step=Math.pow(10,Math.floor(Math.log10(maximum)))/2;
  const top=Math.ceil(maximum/step)*step;
  const left=100,right=875,yTop=30,bottom=365;
  const span=payments?Math.max(1,months-1):months;
  if(payments&&months===1)series.forEach(s=>s.values.push(s.values[0]));
  const x=i=>left+i/span*(right-left),y=value=>bottom-value/top*(bottom-yTop);
  const grid=Array.from({length:5},(_,i)=>{const value=top*i/4,py=y(value);return `<line x1="${left}" y1="${py}" x2="${right}" y2="${py}" stroke="#dce5df"/><text x="${left-14}" y="${py+5}" text-anchor="end" fill="#506559" font-size="14">${escape(formatMoney(value))}</text>`;}).join('');
  const ticks=[...new Set([0,Math.round(span/4),Math.round(span/2),Math.round(span*3/4),span])];
  const dates=ticks.map(i=>`<text x="${x(i)}" y="${bottom+30}" text-anchor="${i===0?'start':i===span?'end':'middle'}" fill="#506559" font-size="14">${payments?escape(monthLabel(Math.min(months,i+1))):i===0?'Start':escape(monthLabel(i))}</text>`).join('');
  const lines=series.slice(1).concat(series[0]).map(s=>`<polyline data-series="${escape(s.name)}" points="${s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-dasharray="${s.dash||''}" stroke-linejoin="round"><title>${escape(s.name)}: ${escape(formatMoney(s.values[0]))} initially; ${escape(formatMoney(s.values[s.values.length-1]))} at ${escape(monthLabel(months))}</title></polyline>`).join('');
  const legend=series.map(s=>`<span class="legend-item"><svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true"><line x1="0" y1="6" x2="30" y2="6" stroke="${s.color}" stroke-width="${s.width}" stroke-dasharray="${s.dash||''}"/></svg>${escape(s.name)}</span>`).join('');
  return `<div class="balance-legend" aria-label="Chart legend">${legend}</div><div class="balance-chart-scroll" tabindex="0" role="region" aria-label="${payments?'Monthly payment':'Balance'} chart; scroll horizontally on small screens"><svg class="balance-plot" viewBox="0 0 900 450" role="img" aria-label="Monthly ${payments?'payments':'balances'} for all cards and their combined total, from ${escape(monthLabel(1))} through ${escape(monthLabel(months))}"><title>Monthly ${payments?'payment':'balance'} projection</title><desc>The thick dark line is the combined ${payments?'payment':'balance'}. Each card has a separate labeled line. Each segment joins actual monthly calculated ${payments?'payments':'balances'}.</desc>${grid}<path d="M${left} ${yTop} V${bottom} H${right}" fill="none" stroke="#506559" stroke-width="1.5"/><text x="22" y="${(yTop+bottom)/2}" transform="rotate(-90 22 ${(yTop+bottom)/2})" text-anchor="middle" fill="#193733" font-size="15">${payments?'Monthly payment ($)':'Balance ($)'}</text><text x="${(left+right)/2}" y="435" text-anchor="middle" fill="#193733" font-size="15">Month</text>${dates}${lines}</svg></div>`;
}



export function enableChartValues(root,plan,result,months,formatMoney,monthLabel,escape,kind='balance'){
  const payments=kind==='payment',svg=root.querySelector('.balance-plot'),region=root.querySelector('.balance-chart-scroll');
  const colors=['#2864b7','#b45d16','#8b4aa0','#087f82','#b23c64','#657522'];
  const series=[{name:'Combined total',color:'#143f3d',values:payments?result.rows.slice(0,months).map(r=>r.payment):[plan.cards.reduce((sum,c)=>sum+c.balance,0),...result.rows.slice(0,months).map(r=>r.balance)]},...result.cards.map((c,i)=>({name:c.name||`Card ${i+1}`,color:colors[i%colors.length],values:payments?c.rows.slice(0,months).map(r=>r.payment):[plan.cards[i].balance,...c.rows.slice(0,months).map(r=>r.balance)]}))];
  const count=series[0].values.length,span=payments?Math.max(1,months-1):months;
  const tooltip=document.createElement('div');tooltip.className='chart-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','status');region.after(tooltip);
  const guide=document.createElementNS('http://www.w3.org/2000/svg','line');guide.setAttribute('y1','30');guide.setAttribute('y2','365');guide.setAttribute('stroke','#506559');guide.setAttribute('stroke-dasharray','4 4');guide.style.pointerEvents='none';guide.style.display='none';svg.append(guide);
  let selected=0;
  function show(index){
    selected=Math.max(0,Math.min(count-1,index));
    const date=payments?monthLabel(selected+1):selected===0?`Start of ${monthLabel(1)}`:`End of ${monthLabel(selected)}`;
    tooltip.innerHTML=`<strong>${escape(date)}</strong><small>${payments?'Monthly payment':'Balance'}</small>${series.map((s,i)=>`<div class="tooltip-row ${i===0?'tooltip-total':''}"><span><i style="background:${s.color}"></i>${escape(s.name)}</span><b>${escape(formatMoney(s.values[selected]))}</b></div>`).join('')}`;
    tooltip.hidden=false;guide.style.display='';const px=100+selected/span*775;guide.setAttribute('x1',px);guide.setAttribute('x2',px);
  }
  function hide(){tooltip.hidden=true;guide.style.display='none';}
  function pointValue(event){
    const matrix=svg.getScreenCTM();if(!matrix)return;
    const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const local=point.matrixTransform(matrix.inverse());
    if(local.x<100||local.x>875||local.y<30||local.y>365){hide();return;}
    show(Math.round((local.x-100)/775*span));
  }
  svg.addEventListener('pointermove',pointValue);svg.addEventListener('pointerdown',pointValue);
  root.addEventListener('pointerleave',hide);
  region.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','Home','End','Escape'].includes(event.key)){
      event.preventDefault();if(event.key==='Escape'){hide();return;}
      show(event.key==='Home'?0:event.key==='End'?count-1:selected+(event.key==='ArrowLeft'?-1:1));
    }
  });
  region.addEventListener('blur',hide);
  const hint=document.createElement('p');hint.className='chart-value-hint';hint.textContent='Hover or tap the graph for values. Keyboard: focus the graph and use ← / → to move between months.';root.append(hint);
}

