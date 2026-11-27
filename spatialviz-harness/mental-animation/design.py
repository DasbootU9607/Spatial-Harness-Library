"""Sample legal programs with the pinned upstream transition functions; select by observable effect."""
import ast
import itertools
import random
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace
import sys

HERE = Path(__file__).resolve().parent
VENDOR = HERE.parent/'vendor/SpatialViz-Bench-c27f9111a267/create_freecad'
NATIVE = VENDOR/'create_mental_animation'
sys.path.insert(0,str(NATIVE))
import create_arrow_moving_complex as fleet

DIRECTIONS = 'NESW'
COLORS = ['red','blue','green','purple','orange','teal']
METHOD = {'arrow':'SpatialViz-Bench Arrow Moving models and Matplotlib',
          'block':'SpatialViz-Bench Block Moving model and FreeCAD'}


def block_physics(size):
    # Execute the four intact simulation functions without requiring a host-side GUI import.
    names = {'is_valid_position','has_support','move_cube','drop_cubes'}
    tree = ast.parse((NATIVE/'create_block_moving.py').read_bytes())
    tree.body = [node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in names]
    ns = dict(zip(('space_size_x','space_size_y','space_size_z'),size))
    exec(compile(tree,'create_block_moving.py','exec'),ns)
    return ns['move_cube']


def matrix(board,size):
    w,h = size
    grid = [[None]*w for _ in range(h)]
    for x,y,col,heading in board:
        grid[h-1-y][x] = dict(color=col,direction=DIRECTIONS.index(heading))
    return grid


def arrow_moves(board,size,single):
    w,h = size
    obj = object.__new__(fleet.ArrowMap)
    obj.x,obj.y,obj.directions = w,h,[(0,1),(1,0),(0,-1),(-1,0)]
    for x,y,color,heading in board:
        for relative,distance in itertools.product(['Left','Right','Forward','Backward'],range(1,max(size))):
            obj.map = matrix(board,size)
            obj.path,obj.states = [],[]
            if not obj.move([h-1-y,x],relative.lower(),distance):
                continue
            new = tuple(sorted((u,h-1-v,a['color'],DIRECTIONS[a['direction']]) for v,row in enumerate(obj.map) for u,a in enumerate(row) if a))
            prefix = '' if single else f'({x},{y}) '
            tag = 'swap' if obj.map[h-1-y][x] is not None else 'slide'
            yield prefix+f'{relative} {distance}',new,{tag}


def block_moves(board,size,move):
    colors = {tuple(row[:3]):row[3] for row in board}
    for src in colors:
        for axis,sign in itertools.product(range(3),[-1,1]):
            dst = tuple(v+(sign if i==axis else 0) for i,v in enumerate(src))
            copy = dict(colors)
            if not move(src,dst,None,copy,simulate=True):
                continue
            new = tuple(sorted((*pos,c) for pos,c in copy.items()))
            tags = {'swap' if dst in colors else 'slide'}
            if axis==2 and dst in colors and colors[dst]!=colors[src]:
                tags.add('vertical')
            if dst not in colors and dst[2]>0 and dst[:2]!=src[:2]:
                tags.add('elevated')
            if dst in colors and axis!=2 and colors[dst]!=colors[src]:
                tags.add('horizontal-swap')
            if dst not in colors and (*src[:2],src[2]+1) in colors:
                tags.add('fall')
            if new==board:
                tags.add('invisible')
            yield '(%d,%d,%d) %s%s'%(*src,'xyz'[axis],'+' if sign==1 else '-'),new,tags


def initial(rng,size,single):
    w,h = size[:2]
    sites = list(itertools.product(range(w),range(h)))
    rng.shuffle(sites)
    if len(size)==2:
        palette=rng.sample(COLORS,len(COLORS))
        return tuple(sorted((x,y,palette[i%len(palette)],rng.choice(DIRECTIONS)) for i,(x,y) in enumerate(sites[:1 if single else rng.randint(3,min(7,w*h))])))
    cols = ['red','blue','green','magenta','gold','cyan']
    return tuple(sorted((x,y,z,rng.choice(cols)) for x,y in sites[:rng.randint(3,min(6,len(sites)))] for z in range(rng.randint(1,size[2]))))


def design(kind,seed,params):
    rng = random.Random(seed)
    modes = {'arrow':['single','fleet-path','fleet-state','checkpoint','predecessor'],
             'block':['flat','stack','checkpoint','missing']}
    mode = params.get('mechanism',modes[kind][0])
    if mode not in modes[kind] or set(params)-{'mechanism','effect','size','steps'}:
        raise ValueError('Unknown mechanism or parameter')
    block = kind=='block'
    single = not block and mode in ('single','checkpoint','predecessor')
    default = ([3,3,1] if mode=='flat' else [3,2,2]) if block else [3,3]
    size = params.get('size',default)
    if len(size)!=len(default) or any(type(n)!=int or not 2<=n<=5 for n in size[:2]) or (block and not 1<=size[2]<=3):
        raise ValueError('Use two board axes in 2..5 and a block height in 1..3')
    if block and (mode=='flat')!=(size[2]==1):
        raise ValueError('Flat uses one layer. Stacked mechanisms require two or three.')
    steps = params.get('steps',3 if block or mode=='checkpoint' else 2)
    if not isinstance(steps,int) or not 2<=steps<=4 or (mode=='checkpoint' and steps<3):
        raise ValueError('Use 2..4 steps and at least three for checkpoints')
    effect = params.get('effect','fall' if mode=='missing' else 'any')
    if effect not in ('any','slide','swap','mixed','fall','vertical','invisible','return','overlap','unchanged','revisit','same-color','elevated','horizontal-swap'):
        raise ValueError('Unknown effect')
    if block:
        native=block_physics(size)
    for trial in range(100):
        start = initial(rng,size,single)
        if mode=='single':
            x,y,_,heading=start[0]
            start=((x,y,'red',heading),)
        memo = {}
        def moves(state):
            if state not in memo:
                memo[state]=list(block_moves(state,size,native) if block else arrow_moves(state,size,single))
            return memo[state]
        programs = {}
        for attempt in range(420):
            state=start
            hist=[]; text=[]; tags=set()
            for _ in range(steps):
                cmd,state,t = rng.choice(moves(state))
                hist.append(state); text.append(cmd); tags.update(t)
            programs[tuple(text)]=(tuple(text),tuple(hist),tags)
        values=list(programs.values());rng.shuffle(values)
        for cmds,history,tags in values:
            end=history[-1]
            closing=end==start
            overlap=single and end[0][:2]==start[0][:2]
            if mode=='single' and closing: continue
            if closing and effect not in ('unchanged','invisible','return') and mode!='checkpoint': continue
            if mode=='missing' and 'fall' not in next(t for c,s,t in moves(start) if c==cmds[0]): continue
            effects=tags | ({'mixed'} if {'slide','swap'}<=tags else set())
            if closing: effects.update(['return','unchanged'])
            if overlap: effects.add('overlap')
            if any(s==start for s in history[:-1]): effects.add('revisit')
            if block and len({r[3] for r in start})<len(start): effects.add('same-color')
            if effect!='any' and effect not in effects: continue
            if effect=='swap' and 'slide' in tags or effect=='slide' and 'swap' in tags: continue
            key=lambda v: (v[1][0],v[1][-1]) if mode=='checkpoint' else v[1][-1]
            def distance(a,b):return len(set(a)^set(b))
            alt=[];seen={key((cmds,history,tags))}
            pool=values
            if mode=='missing':
                pool=[v for v in values if v[0][1:]==cmds[1:]]
            if mode=='checkpoint':
                pool=[v for v in values if v[1][-1]==end and v[1][0]!=history[0]]
            # Prefer near misses and shared command prefixes. Distinct visible outcomes are essential.
            for v in sorted(pool,key=lambda v:(distance(v[1][-1],end),sum(a!=b for a,b in zip(cmds,v[0])))):
                if key(v) not in seen:
                    alt.append(v);seen.add(key(v))
                    if len(alt)==3:break
            if mode!='predecessor' and len(alt)<3: continue
            panels={'Initial':start,'Final':end}
            given=''
            if mode=='predecessor':
                opts=[start]
                for x,y,d in itertools.product(range(size[0]),range(size[1]),DIRECTIONS):
                    b=((x,y,start[0][2],d),)
                    cur=b
                    for c in cmds:
                        cur=next((s for a,s,t in moves(cur) if a==c),None)
                        if cur is None:break
                    if cur is not None and cur!=end:opts.append(b)
                if len(opts)<4:continue
                opts=[start]+rng.sample(opts[1:],3);rng.shuffle(opts)
                idx=opts.index(start);panels={'Final':end,**dict(zip('ABCD',opts))};choices=list('ABCD');given=' / '.join(cmds)
            else:
                entries=[(cmds,history,tags)]+alt;rng.shuffle(entries)
                idx=next(i for i,v in enumerate(entries) if v[0]==cmds)
                choices=[' / '.join(v[0]) for v in entries]
                if mode=='fleet-state':
                    panels={'Initial':start,**{l:v[1][-1] for l,v in zip('ABCD',entries)}};choices=list('ABCD');given=' / '.join(cmds)
                if mode=='checkpoint':panels={'Initial':start,'After step 1':history[0],'Final':end}
                if mode=='missing':
                    choices=[v[0][0] for v in entries];given=' / '.join(cmds[1:])
            return dict(size=size,mode=mode,panels=panels,given=given,choices=choices),idx
    raise ValueError('No distinguishable candidate for this parameter combination in 100 layouts')
