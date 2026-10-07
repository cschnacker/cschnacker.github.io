// Confirmed formula/reference repairs. Original formulas remain in workbook-model.json.
// All policy amounts are supplied by the annual data bundle.
export function correctedModel(original){
 const model={...original,formulas:{...original.formulas}};const f=model.formulas;
 const frequency=c=>`IF(${c}36="Weekly",52,IF(${c}36="Bi-Weekly",26,IF(${c}36="Twice a Month",24,IF(${c}36="Monthly",12,IF(${c}36="Quarterly",4,1)))))`;
 for(let j=0;j<4;j++){
  const c='CDEF'[j],o=j*31,r=247+j;
  f[c+'37']=frequency(c);f[c+'51']='IF($C$10="Joint","Joint","Single")';
  f[c+'61']=`${c}60*FEqn!I4`;f[c+'64']=`${c}63*PARAM("otherDependentCredit")`;
  f[`B${r}`]=`${c}40`;f[`C${r}`]=`${c}41`;
  f[`G${r}`]=`IF(H${r}="Joint",2,1)+$C$6`;
  f[`C${83+o}`]=`SUM(${c}43/100*${c}38,${c}44*${c}37,${c}45)/${c}37`;
  f[`C${86+o}`]=`MAX(0,${c}38-SUM(${c}40,${c}41)-SUM(${c}43/100*${c}38,${c}44*${c}37,${c}45)+${c}66-${c}68)`;
  f[`C${87+o}`]=`SUM(${c}61,${c}64)/${c}37`;
  f[`C${88+o}`]=`IF(${c}50="Other",0,IF(VLOOKUP(TAXYEAR()&${c}50&"Rate",SEqn!D5:J157,6,FALSE)="Credit",0,VLOOKUP(TAXYEAR()&${c}50&"Rate",SEqn!D5:J157,7,FALSE)*(IF(${c}51="Joint",2,1)+${c}60)))`;
  f[`C${89+o}`]=`MAX(0,${c}38-SUM(${c}40,${c}41)-SUM(${c}43/100*${c}38,${c}44*${c}37,${c}45)-IF(${c}50="Other",0,VLOOKUP(TAXYEAR()&${c}50&${c}51,SEqn!D5:J157,6,FALSE))-C${88+o}+${c}66-${c}68)`;
  f[`C${90+o}`]=`IF(${c}50="Other",0,IF(VLOOKUP(TAXYEAR()&${c}50&"Rate",SEqn!D5:J157,6,FALSE)="Credit",VLOOKUP(TAXYEAR()&${c}50&${c}51,SEqn!D5:J157,7,FALSE)+VLOOKUP(TAXYEAR()&${c}50&"Rate",SEqn!D5:J157,7,FALSE)*${c}60,0))/${c}37`;
  f[`C${91+o}`]=`MAX(0,FEDWH(C${86+o},${c}57,${c}58)/${c}37-C${87+o})+${c}69`;
  f[`C${92+o}`]=`MAX(0,IF(${c}50="Other",${c}54/100*C${89+o},STATETAX(C${89+o},${c}50,${c}51,IF(${c}58="Yes",2,1)))/${c}37-C${90+o})`;
  // Annual-average payroll tax, including the wage cap; bonus allocated separately.
  f[`C${93+o}`]=`MIN(${c}38,FEqn!R4)*FEqn!S4/${c}37`;
  f[`C${94+o}`]=`${c}38*FEqn!T4/${c}37`;
  f[`C${96+o}`]=`IF(${c}38=0,0,MIN(${c}37,ROUNDUP(FEqn!R4/(${c}38/${c}37),0)))`;
  f[`C${98+o}`]=`C${82+o}-SUM(C${83+o}:C${85+o})-SUM(C${91+o}:C${95+o})-C${97+o}`;
  f[`C${107+o}`]=`MIN(${c}39,MAX(0,FEqn!R4-${c}38))*FEqn!S4`;
  f[`C${108+o}`]=`${c}39*FEqn!T4`;
  f[`C${106+o}`]=`IF(${c}39=0,0,IF(${c}50="Other",MAX(0,${c}39-C${104+o})*${c}54/100,MAX(0,STATETAX(C${89+o}+MAX(0,${c}39-C${104+o}),${c}50,${c}51,1)-STATETAX(C${89+o},${c}50,${c}51,1))))`;
  // Independent withholding choices; household filing remains for annual tax liability.
  f[c+'57']=`IF(OR(${c}3000=0,${c}3000="Household"),$C$10,${c}3000)`;
  f[`C${92+o}`]=`STATEWH(${c}50,${c}3001,MAX(0,${c}38-SUM(${c}40,${c}41)-SUM(${c}43/100*${c}38,${c}44*${c}37,${c}45)),${c}37,${c}3002,${c}3003,${c}3004,${c}3005,IF(${c}50="California",${c}3006,"Manual"),${c}3007)`;
  f[`C${106+o}`]=`IF(${c}3007="Yes",0,IF(${c}3006="Manual",${c}3008,STATEBONUS(${c}50,MAX(0,${c}39-C${104+o}),${c}3008)))`;
  f[c+'3100']=`MAX(0,${c}38-SUM(${c}40,${c}41)-SUM(${c}43/100*${c}38,${c}44*${c}37,${c}45))`;
  f[c+'3101']=`STATESUGGEST($C$3107,${c}3100,SUM($C$3100:$F$3100),${c}37,$C$3105)`;
  f[`C${92+o}`]=`IF(${c}3006="Suggested",${c}3101+${c}3004,${f[`C${92+o}`]})`;
  f[`C${106+o}`]=`IF(${c}3006="Suggested",0,${f[`C${106+o}`]})`;
  f[c+'71']=`C${91+o}`;f[c+'72']=`C${92+o}`;
 }
 for(let j=0;j<5;j++){
  const r=254+j,t=222+j,cr=262+j,d=270+j,inc=238+j,p=246+j;
  f[`C${t}`]=`MAX(0,FEDTAX(O${r},H${p})-SUM(B${cr},C${cr},D${cr},E${cr},G${cr},H${cr}))`;
  f[`F${t}`]=`MAX(0,IF(E${p}="Other",$C$26/100*T${r},STATETAX(T${r},E${p},I${p},1))-I${cr})`;
  // Tax credits reduce tax, never itemized deduction totals. Do not double-count pensions.
  f[`L${d}`]=`SUM(B${d}:G${d})`;
  f[`O${r}`]=original.formulas[`O${r}`].replace(`SUM(I${inc}:K${inc})`,`SUM(I${inc}:J${inc})`);
 }
 // Actual other taxable household income, separate from withholding elections.
 f.F238='$C$16+$C$3106';
 f.C3107='STATEWAGETAX()';
 f.E246='$C$11';
 f.C3105='AND(OR(SUM(C38,C39)=0,C50=$C$11),OR(SUM(D38,D39)=0,D50=$C$11),OR(SUM(E38,E39)=0,E50=$C$11),OR(SUM(F38,F39)=0,F50=$C$11))';
 f.B254='IF(B214=0,0,IF(C28="No",M270,MAX(L270,M270)))';
 for(let r=255;r<=258;r++)f['B'+r]=`IF(B$214=0,0,B$254*B${r-40}/B$214)`;
 f.C73='C222-SUM(C71*C37,D71*D37,E71*E37,F71*F37,C105,C136,C167,C198)';
 f.C74='F222-SUM(C72*C37,D72*D37,E72*E37,F72*F37,C106,C137,C168,C199)';
 f.B262='SUM(C42:F42)';
 return model;
}
