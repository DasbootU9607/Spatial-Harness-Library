"""Recover and explain a result from the visible grid; check native parameter geometry."""
import json
import sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
REF=HERE.parent/'skills/spatialviz-paper-folding/references'
sys.path.insert(0,str(REF))
from audit_images import solve_image, transport


def physical_signature(size,history,punches):
    return json.dumps([size,history,sorted(punches)],sort_keys=True,separators=(',',':'))


def original_signatures():
    rows=json.loads((REF/'observations.json').read_bytes())['items']
    return {physical_signature(r['grid'],h['folds'],r['punches']) for r in rows for h in r['exactFoldHistories']}


def check_native(plan,h,punches):
    # Upstream diagonal endpoints name cells; the reader recovers crease vertices.
    n=plan['size']
    t,l,b,r=0,0,n,n
    axial=[]
    for letter,offset in zip(plan['axes'],plan['lines'],strict=True):
        horizontal=letter=='H'
        start,end=(t,b) if horizontal else (l,r)
        near=2*offset < end-start
        line=start+offset
        axial.append(dict(axis='horizontal' if horizontal else 'vertical',line=line,
                          movingSide=(('top' if near else 'bottom') if horizontal else ('left' if near else 'right'))))
        if horizontal:
            t,b=(line,b) if near else (t,line)
        else:
            l,r=(line,r) if near else (l,line)
    if h['folds'][:-1]!=axial or list(plan['origin'])!=[t,l]:
        raise ValueError('Printed axial order, moving side or offset differs from the upstream plan')
    (y,x),(v,u)=plan['diagonal']
    width=abs(v-y)+1
    if (u-x)*(v-y)<0:
        corner=(t,l) if min(y,v)==min(x,u)==0 else (b,r)
    else:
        corner=(t,r) if min(y,v)==0 and max(x,u)==r-l-1 else (b,l)
    cy,cx=corner
    ends={(cy+(width if cy==t else -width),cx),(cy,cx+(width if cx==l else -width))}
    diag=h['folds'][-1]
    if set(map(tuple,diag['endpoints']))!=ends or tuple(diag['movingCorner'])!=corner:
        raise ValueError('Printed diagonal endpoints or folded corner differ from the upstream plan')
    if sorted((t+y,l+x) for y,x in plan['punches'])!=sorted(map(tuple,punches)):
        raise ValueError('Printed red punch centers differ from the upstream plan')


def cell_list(cells):
    return ', '.join(f'R{r+1}C{c+1}' for r,c in sorted(cells)) or 'none'


def answer(result):
    histories=result['exactFoldHistories']
    labels=result['predictedLabels']
    if len(histories)!=1 or len(labels)!=1 or result['duplicateOptionPairs']:
        raise ValueError('The print must determine one history, four distinct grids and one answer')
    h=histories[0]
    expected=set(map(tuple,h['unfoldedHoles']))
    summary=[]
    for target in result['punches']:
        original=[]
        for row,col in expected:
            pos=(row,col)
            for fold in h['folds']:
                pos=transport(pos,fold)
            if tuple(pos)==tuple(target):
                original.append((row,col))
        summary.append(cell_list([target])+' pierces '+cell_list(original))
    trace='Read rows from the top and columns from the left. '+'. '.join(summary)+'.'
    options=[]
    for label,points in result['readOptions'].items():
        shown=set(map(tuple,points))
        detail='Every hole matches. '+trace if shown==expected else 'Missing holes: '+cell_list(expected-shown)+'. Extra holes: '+cell_list(shown-expected)+'.'
        options.append(dict(label=label,explanation=detail))
    return dict(index='ABCD'.index(labels[0]),explanation=trace,options=options)


def effects(row):
    h=row['exactFoldHistories'][0]
    diag=h['folds'][-1]
    (y,x),(v,u)=diag['endpoints']
    slope=(u-x)//(v-y)
    intercept=x-slope*y
    before={(r,c) for r in range(row['grid']) for c in range(row['grid'])}
    for step in h['folds'][:-1]:
        before={transport(p,step) for p in before}
    kinds=[]
    for a,b in row['punches']:
        on_line=2*b+1==slope*(2*a+1)+2*intercept
        layer_count=sum(transport(p,diag)==(a,b) for p in before)
        kinds.append('flap' if layer_count==2 else 'crease' if on_line and min(y,v)<=a+.5<=max(y,v) else 'outside')
    return kinds


def coverage(row,band):
    h=row['exactFoldHistories'][0]['folds']
    keys=[]
    if len(h)==2:
        keys.append('single-strip')
    elif h[0]['axis']!=h[1]['axis']:
        keys.append('crossed-strips')
    else:
        keys.append('parallel-same' if h[0]['movingSide']==h[1]['movingSide'] else 'parallel-opposed')
    kinds=effects(row)
    keys+=sorted(set(kinds))
    if len(kinds)>1:
        keys.append('multiple')
    keys.append('row-band' if band=='row' else 'column-band')
    return keys

