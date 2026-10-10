/* Annual data contract. The UI and generated calculation adapter share this module. */
export function prepareTables(data) {
  if (data.schemaVersion !== 1) throw new Error('Unsupported data format. Expected schemaVersion 1.');
  const positive = (x, label) => { if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0) throw new Error(`${label} must be a positive number.`); };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated || '') || typeof data.release !== 'string' || !data.release.trim()) throw new Error('A release name and update date are required.');
  const model = data.model;
  if (!model || !Array.isArray(model.bendPoints) || model.bendPoints.length !== 2 || !Array.isArray(model.benefitRates) || model.benefitRates.length !== 3) throw new Error('The model needs two bend points and three benefit rates.');
  model.bendPoints.forEach(x=>positive(x,'Bend point'));
  if (model.bendPoints[0] >= model.bendPoints[1]) throw new Error('Bend points must be in increasing order.');
  model.benefitRates.forEach(x=>{positive(x,'Benefit rate'); if(x>1)throw new Error('Benefit rates must be at most 1.');});
  for (const key of ['benefitBaseYear','wageIndexBaseYear']) if (!Number.isInteger(model[key]) || model[key]<1955 || model[key]>2110) throw new Error('Model reference year is outside the supported range.');
  for (const key of ['taxableMaximumGrowth','wageIndexGrowth']) if (typeof data.assumptions?.[key] !== 'number' || !Number.isFinite(data.assumptions[key]) || data.assumptions[key]<0 || data.assumptions[key]>.2) throw new Error(`${key} must be between 0 and 0.2.`);
  if (!Number.isFinite(data.assumptions.defaultColaPercent) || data.assumptions.defaultColaPercent<0 || data.assumptions.defaultColaPercent>15) throw new Error('Default COLA must be between 0 and 15 percent.');
  if (!data.benefitCola || typeof data.benefitCola!=='object' || Array.isArray(data.benefitCola)) throw new Error('Historical benefit COLAs are missing.');
  for (const [year,value] of Object.entries(data.benefitCola)) if(!/^\d{4}$/.test(year)||+year<1975||+year>2115||!Number.isFinite(value)||value<0||value>20)throw new Error(`Invalid benefit COLA for ${year}.`);
  for(let year=1993;year<=2025;year++)if(!Number.isFinite(data.benefitCola[year]))throw new Error(`Historical benefit COLA is missing for ${year}.`);
  function series(source, first, rate, label) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error(`${label} is missing.`);
    for (const [year,value] of Object.entries(source)) {
      if (!/^\d{4}$/.test(year) || +year<first || +year>2115) throw new Error(`Invalid ${label} year: ${year}`);
      positive(value,`${label} ${year}`);
    }
    positive(source[first],`${label} ${first}`);
    const result={};
    for(let year=first;year<=2115;year++) result[year]=Object.hasOwn(source,year)?source[year]:result[year-1]*(1+rate);
    return result;
  }
  const caps=series(data.taxableMaximum,1937,data.assumptions.taxableMaximumGrowth,'Taxable maximum');
  const awi=series(data.averageWageIndex,1951,data.assumptions.wageIndexGrowth,'Wage index');
  const indexFactors=Object.fromEntries(Object.keys(awi).map(y=>[y,awi[model.wageIndexBaseYear]/awi[y]]));
  return {caps,awi,indexFactors,model};
}
