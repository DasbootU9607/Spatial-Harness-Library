"""Seeded inputs for upstream CAD builders. Each cube uses the same camera."""
import random
from geometry import fold,poses,turns,FRAMES,SLOTS
from motifs import FAMILIES,period

LAYOUTS=['1000/1111/1000','1000/1111/0100','1000/1111/0010','1000/1111/0001',
         '0100/1111/0010','0100/1111/0100','1100/0111/0100','1100/0111/0010',
         '1100/0111/0001','11100/00111','1100/0110/0011']

def net(layout,cube):
    rows=LAYOUTS[layout].split('/')
    cells=[dict(xy=[x,len(rows)-1-y]) for y,row in enumerate(rows) for x,v in enumerate(row) if v=='1']
    frames=fold(cells)
    for cell in cells:
        r,u,n=frames[tuple(cell['xy'])]
        slot=next(k for k,f in FRAMES.items() if f[2]==n)
        mark,q=cube[slot]
        cell.update(mark=mark,turn=turns(r,u).index(turns(*FRAMES[slot][:2])[q]))
    return cells

def design(task,seed,params):
    rng=random.Random(seed)
    unfold=task=='CubeUnfolding'
    family=params.get('family','color')
    mode=params.get('mode','cannot' if unfold else 'view')
    if set(params)-{'family','mode','layout'} or family not in FAMILIES or mode not in (
            (['cannot'] if family=='color' else ['can','cannot']) if unfold else
            (['opposite','view'] if family=='color' else ['view'])):
        raise ValueError('Unsupported parameters for '+task)
    layout=params.get('layout',rng.randrange(11))
    if type(layout)!=int or not 0<=layout<11:
        raise ValueError('layout must be an integer from 0 through 10')
    marks=rng.sample(FAMILIES[family],6)
    if family!='color' and not any(period(m)>1 for m in marks[:3]):
        j=next(i for i in range(3,6) if period(marks[i])>1)
        marks[0],marks[j]=marks[j],marks[0]
    cube={k:[m,rng.randrange(4)] for k,m in zip(FRAMES,marks)}
    cells=net(layout,cube)
    result=dict(task=task,mode=mode,family=family,layout=layout,seed=seed,nets={},cubes={})
    def altered(which):
        other={k:v.copy() for k,v in cube.items()}
        if which=='opposite':
            other['Left'],other['Front']=other['Front'],other['Left']
        elif which=='mirror':
            other['Front'],other['Right']=other['Right'],other['Front']
        else:
            slot=next(k for k in SLOTS if period(cube[k][0])>1)
            other[slot][1]=(other[slot][1]+1)%4
        return other
    if unfold:
        result['cubes']['target']=cube
        layouts=[layout]+rng.sample([i for i in range(11) if i!=layout],3)
        variants=([cube,altered('opposite'),altered('mirror'),altered('turn')] if mode=='can' else
                  [cube,cube,cube,altered('opposite' if family=='color' else 'turn')])
        for i,(l,c) in enumerate(zip(layouts,variants)):
            key=('correct' if c==cube else 'incorrect')+'_'+str(i)
            result['nets'][key]=net(l,c)
    else:
        result['nets']['target']=cells
        choices=list(poses(cells))
        rng.shuffle(choices)
        result['cubes']=dict(zip(['FrontTopRight','FrontTopLeft','BackTopRight'],choices[:3]))
        if family!='color':
            result['cubes']['FrontTopRight_incorrect_turn']=altered('turn')
    return result

