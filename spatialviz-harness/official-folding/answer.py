"""Solve from the printed nets and visible panels, with no hidden target faces."""
from functools import lru_cache
import numpy as np
from geometry import fold,poses,neg,SLOTS
from motifs import tile, GRIDS

@lru_cache(None)
def pixels(mark,q=0,mirror=''):
    a=np.rot90(np.asarray(tile(mark)),q)
    if mirror=='side':
        a=np.fliplr(a)
    elif mirror=='top':
        # Paper coordinates (right, up) -> (-up, -right), equivalent to transpose in image coordinates.
        a=a.transpose(1,0,2)
    return np.ascontiguousarray(a)

def view(cube,mirrored=False):
    slots=('Top','Right','Front') if mirrored else SLOTS
    return [[*cube[k],('top' if i==0 else 'side') if mirrored else ''] for i,k in enumerate(slots)]

def inspect(cells,visible):
    marks=[v[0] for v in visible]
    def identify(mark):
        cell=next(c for c in cells if c['mark']==mark)
        x,y=cell['xy']
        if mark.startswith('grid-'):
            colors={'r':'red','g':'green','b':'blue','k':'black','m':'magenta','.':'blank'}
            row=np.rot90(np.array(list(GRIDS[int(mark.split('-')[1])-1])).reshape(3,3),cell['turn'])[0]
            mark='tile with top row '+', '.join(colors[c] for c in row)
        elif mark.startswith('pip-'):
            mark=mark.split('-')[1]+'-pip face'
        return f'{mark} (column {x+1}, row {max(c["xy"][1] for c in cells)-y+1} from the upper left)'
    named=False
    for p in poses(cells):
        if [p[k][0] for k in SLOTS]!=marks:
            continue
        named=True
        aligned=p
        wrong=[k for k,v in zip(SLOTS,visible) if not np.array_equal(pixels(*p[k]),pixels(*v))]
        if not wrong:
            return True,'Reading the net from its upper left, the top, left and right faces come from '+', then '.join(identify(m) for m in marks)+'. All three markings retain the pictured orientation.'
    if named:
        slot=wrong[0]
        mark,angle=aligned[slot]
        shown=visible[SLOTS.index(slot)]
        fixes=[q for q in (1,2,3) if np.array_equal(pixels(mark,(angle+q)%4),pixels(*shown))]
        diff=(f' would need an extra {90*fixes[0]} degree counterclockwise turn' if fixes else ' has a reflected marking')
        return False,'The face order matches. The '+{'Front':'left','Top':'top','Right':'right'}[slot]+' face from '+identify(mark)+diff+' to reproduce the view.'
    normals={c['mark']:fold(cells)[tuple(c['xy'])][2] for c in cells}
    for i,m in enumerate(marks):
        for other in marks[i+1:]:
            if normals[m]==neg(normals[other]):
                return False,f'{identify(m)} and {identify(other)} are opposite and cannot meet at the visible corner.'
    return False,'The three faces meet, but '+', '.join(identify(m) for m in marks)+' in top/left/right order reverses their order around the vertex.'

def solve(s):
    g=s['geometry']
    options=s['options']
    mode=s['parameters']['mode']
    result=[]
    if mode=='opposite':
        cells=g['net']
        normal={c['mark']:fold(cells)[tuple(c['xy'])][2] for c in cells}
        target=g['askedColor']
        opposite=next(k for k in normal if normal[k]==neg(normal[target]))
        offered=any(o['text'].lower()==opposite for o in options)
        for o in options:
            if o['text']=='All three other options are incorrect':
                result.append((not offered,f'The opposite color is {opposite}, which '+('appears among the other choices.' if offered else 'is absent from the other choices.')))
                continue
            match=o['text'].lower()==opposite
            result.append((match,f'{target.capitalize()} folds opposite {opposite}. '+('This option names that face.' if match else 'This option does not name it.')))
    elif s['taskType']=='CubeUnfolding':
        for net in g['options']:
            ok,why=inspect(net,g['view'])
            result.append((ok==(mode=='can'),why))
    else:
        for v in g['options']:
            result.append(inspect(g['net'],v))
        if len(result)==3:
            exists=any(ok for ok,_ in result)
            result.append((not exists,'At least one pictured view is possible.' if exists else 'Every pictured view is impossible.'))
    eligible=[i for i,(ok,_) in enumerate(result) if ok]
    if len(eligible)!=1:
        raise ValueError('Expected one answer, found '+str(eligible))
    i=eligible[0]
    return dict(index=i,explanation=result[i][1],options=[dict(label=chr(65+j),explanation=v[1]) for j,v in enumerate(result)])

