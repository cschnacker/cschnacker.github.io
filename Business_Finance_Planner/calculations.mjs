import {CATEGORIES} from './model.mjs';
// Pure forecast engine: inputs in, derived rows out. No browser or storage access.
// Source: Business.26.xlsx, Business Finance Planner!D47:M125.
export function calculate(inputs) {
  const rows=[],rates={...inputs.growth};
  for(let offset=0;offset<inputs.years;offset++) {
    const row={year:inputs.startYear+offset,offset};
    Object.assign(rates,inputs.growthOverrides?.[offset]??{});
    row.growth={...rates};
    for(const [key] of CATEGORIES) {
      row[key]=offset===0 ? (inputs.initial[key] ?? 0) :
        (inputs.overrides[offset]?.[key] ?? rows[offset-1][key]*(1+rates[key]/100));
    }
    row.socialSecurity=(row.salaries+row.payroll)*inputs.socialSecurityRate/100;
    row.expenses=CATEGORIES.slice(1).reduce((sum,[key]) => sum+row[key],row.socialSecurity);
    row.profit=row.revenue-row.expenses;
    row.margin=row.revenue===0 ? null : row.profit/row.revenue*100;
    rows.push(row);
  }
  return rows;
}
