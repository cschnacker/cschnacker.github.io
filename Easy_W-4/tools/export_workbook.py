"""Read-only workbook export. Never saves or modifies the supplied workbook."""
import argparse, json, re, hashlib
from pathlib import Path
import openpyxl

p = argparse.ArgumentParser()
p.add_argument('workbook')
p.add_argument('--output', default='app/data')
p.add_argument('--include-model', action='store_true', help='Regenerate calculation model for a reviewed formula change')
args = p.parse_args()
source = Path(args.workbook)
wb = openpyxl.load_workbook(source, data_only=False)
cached = openpyxl.load_workbook(source, data_only=True)
out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
year = wb['FEqn']['A4'].value
if not isinstance(year, int): raise ValueError('FEqn!A4 must contain the tax year')
tables = {}
columns = json.loads(Path('app/data/columns.json').read_text(encoding='utf-8'))
state_columns = dict(zip(list('ABCDEFGHIJK'),['year','state','category','lookupKey','minimumEffectiveRate','maximumEffectiveRate','legacyCurveCoefficient','legacyCurveMultiplier','standardDeductionOrCredit','exemptionOrCredit','socialSecurityTaxable']))
state_columns.update({openpyxl.utils.get_column_letter(c):f'bracketRateOrLowerBound{c-11}' for c in range(12,25)})
wh_columns = {**columns, **{openpyxl.utils.get_column_letter(c):f'withholdingRateOrBound{c-38}' for c in range(39,56)}}
column_maps = {'FEqn':columns,'FEqnWH':wh_columns,'SEqn':state_columns}
for name in ['FEqn','FEqnWH','SEqn']:
    sheet = wb[name]
    rows = range(4,9) if name != 'SEqn' else range(5,158)
    tables[name] = []
    for r in rows:
        if sheet[f'A{r}'].value != year: raise ValueError(f'Mixed tax years: {name}!A{r}')
        values = {openpyxl.utils.get_column_letter(c): cached[name].cell(r,c).value for c in range(1,56 if name=='FEqnWH' else 44 if name=='FEqn' else 25)}
        tables[name].append({'sourceRow':r,'category':values['B'] if name!='SEqn' else values['C'], **({'state':values['B']} if name=='SEqn' else {}), 'values':{column_maps[name][col]:value for col,value in values.items()}})
# Normalize explicitly labeled source credits instead of subtracting text as a deduction.
for row in tables['SEqn']:
    value=row['values'].get('standardDeductionOrCredit')
    if isinstance(value,str) and re.fullmatch(r'\$[\d,]+ credit',value):
        row['values']['standardDeductionOrCredit']=0
        row['values']['exemptionOrCredit']=int(value.split()[0][1:].replace(',',''))
        rate=next(r for r in tables['SEqn'] if r['state']==row['state'] and r['category']=='Rate')
        rate['values']['standardDeductionOrCredit']='Credit'
        rate['values']['exemptionOrCredit']=0
constants = {'otherDependentCredit':500,'studentLoanIncomeLimit':85000,'studentLoanDeductionLimit':2500,'iraContributionLimit':7000,'saltLimit':10000,'bonusFederalRate':0.22,'medicalExpenseFloor':0.1}
data = {'schemaVersion':1,'year':year,'source':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'reviewStatus':'Source workbook values; annual tax review required','constants':constants,'columnMaps':column_maps,'tables':tables}
(out/f'{year}.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
if args.include_model:
    s = wb['Easy W-4']
    model={'formulas':{},'values':{},'labels':{},'cached':{}}
    replacements={'500':'otherDependentCredit','85000':'studentLoanIncomeLimit','2500':'studentLoanDeductionLimit','7000':'iraContributionLimit','10000':'saltLimit','0.22':'bonusFederalRate'}
    for row in s:
        for c in row:
            if c.value is None: continue
            if c.data_type=='f':
                f=c.value[1:]
                for literal,name in replacements.items():
                    f=re.sub(r'(?<![A-Za-z0-9.$])'+re.escape(literal)+r'(?![A-Za-z0-9.])',f'PARAM("{name}")',f)
                if c.coordinate.startswith('G27'): f=f.replace('0.1*','PARAM("medicalExpenseFloor")*')
                model['formulas'][c.coordinate]=f
                model['cached'][c.coordinate]=cached[s.title][c.coordinate].value
            else: model['values'][c.coordinate]=c.value
            if c.column==2 and isinstance(c.value,str): model['labels'][str(c.row)]=c.value
    # Year always follows the selected data bundle, not the computer clock.
    model['formulas']['A3']='TAXYEAR()'
    model['formulas']['C3']='TAXYEAR()'
    Path('app/calculations').mkdir(parents=True,exist_ok=True)
    Path('app/calculations/workbook-model.json').write_text(json.dumps(model,indent=2),encoding='utf-8')
print(f'Exported {year} data from {source.name}. Source unchanged.')
