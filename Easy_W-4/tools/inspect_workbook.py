import json, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
source = Path(r'C:/Users/criss/OneDrive/Final Spreadsheets/Applications/Easy_W-4_0.45-2026.xlsx')
ns = {'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as z:
    strings = [''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = {x.attrib['Id']:x.attrib['Target'] for x in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sheets = {}
    for s in wb.find('m:sheets',ns):
        target = rels[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        root = ET.fromstring(z.read('xl/'+target.lstrip('/').removeprefix('xl/')))
        cells = {}
        for c in root.findall('.//m:sheetData/m:row/m:c',ns):
            v, f = c.find('m:v',ns), c.find('m:f',ns)
            value = v.text if v is not None else None
            if c.attrib.get('t') == 's': value = strings[int(value)]
            elif c.attrib.get('t') == 'inlineStr': value = ''.join(c.find('m:is',ns).itertext())
            elif value is not None and c.attrib.get('t') not in ('str','e'):
                value = float(value)
                if value.is_integer(): value = int(value)
            if value is not None or f is not None:
                cells[c.attrib['r']] = {'value':value, **({'formula':f.text, 'formulaAttributes':f.attrib} if f is not None else {})}
        sheets[s.attrib['name']] = cells
    Path('analysis').mkdir(exist_ok=True)
    Path('analysis/workbook.json').write_text(json.dumps(sheets,indent=2),encoding='utf-8')
    print(json.dumps({name:{'cells':len(cells),'formulas':sum('formula' in c for c in cells.values())} for name,cells in sheets.items()},indent=2))
    print('NAMES',ET.tostring(wb.find('m:definedNames',ns),encoding='unicode'))
