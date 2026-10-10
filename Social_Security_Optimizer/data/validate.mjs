export function validateAnnualData(d){
 if(!d||d.schemaVersion!==1||!Number.isInteger(d.publishedYear)||d.publishedYear<2026||d.publishedYear>2100)throw Error('Unsupported SSA data version.');
 for(const key of ['taxableMaximums','averageWageIndex','bendPoints','colaByEffectiveYear','earningsTest'])if(!d[key]||typeof d[key]!=='object')throw Error(`Missing ${key} table.`);
 for(const [year,value]of Object.entries(d.taxableMaximums))if(!/^\d{4}$/.test(year)||!Number.isFinite(value)||value<=0)throw Error('Invalid wage cap.');
 for(const value of Object.values(d.averageWageIndex))if(!Number.isFinite(value)||value<=0)throw Error('Invalid wage index.');
 for(const value of Object.values(d.bendPoints))if(!Array.isArray(value)||value.length!==2||!value.every(Number.isFinite)||value[0]<=0||value[1]<=value[0])throw Error('Invalid bend points.');
 for(const value of Object.values(d.colaByEffectiveYear))if(!Number.isFinite(value)||value<0||value>.3)throw Error('Invalid COLA.');
 for(let y=1951;y<=d.publishedYear-2;y++)if(!d.averageWageIndex[y])throw Error(`Missing wage index for ${y}.`);
 for(let y=1951;y<=d.publishedYear;y++)if(!d.taxableMaximums[y])throw Error(`Missing wage cap for ${y}.`);
 for(let y=1979;y<=d.publishedYear;y++)if(!d.bendPoints[y])throw Error(`Missing bend points for ${y}.`);
 for(let y=1979;y<d.publishedYear;y++)if(d.colaByEffectiveYear[y]===undefined)throw Error(`Missing COLA for ${y}.`);
 const e=d.earningsTest[d.publishedYear];if(!e||!Number.isFinite(e.underFra)||!Number.isFinite(e.fraYear)||e.underFra<=0||e.fraYear<=e.underFra)throw Error('Missing earnings-test thresholds.');
 if(typeof d.verifiedOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.verifiedOn))throw Error('Missing verification date.');
 if(!Array.isArray(d.sources)||!d.sources.length||!d.sources.every(s=>typeof s.name==='string'&&/^https:\/\/(www\.|secure\.)?ssa\.gov\//i.test(s.url)))throw Error('Data must include SSA source links.');
 return d;
}
