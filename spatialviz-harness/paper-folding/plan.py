"""Choose compatible parameters before asking the upstream routine to draw."""
import random


def choose(level, params, rng, module):
    size = level + 3
    axes = params.get('axes')
    shape = params.get('mechanism', 'strip' if level < 2 else rng.choice(['parallel', 'crossed']))
    if shape not in (['strip'] if level < 2 else ['parallel', 'crossed']):
        raise ValueError('strip uses Level 0/1; parallel and crossed use Level 2')
    if axes is None:
        first = rng.choice('HV')
        axes = first if shape == 'strip' else first + (first if shape == 'parallel' else ('V' if first == 'H' else 'H'))
    if axes not in {'strip': ['H','V'], 'parallel': ['HH','VV'], 'crossed': ['HV','VH']}[shape]:
        raise ValueError('The explicit axes disagree with the chosen mechanism')
    if 'lines' in params and len(params['lines']) != len(axes):
        raise ValueError('Supply one local boundary index for each axial fold')
    paper = module.Paper(size, size)
    lines = []
    for i, axis in enumerate(axes):
        extent = paper.current_rows if axis == 'H' else paper.current_cols
        line = params['lines'][i] if 'lines' in params else rng.randrange(1, extent)
        if type(line) is not int or not 0 < line < extent:
            raise ValueError('Axial crease is outside the active sheet')
        paper.fold('horizontal' if axis == 'H' else 'vertical', line=line)
        lines.append(line)
    diagonals = module.find_45_degree_fold_endpoints(paper.current_rows, paper.current_cols)
    diag = tuple(map(tuple, params['diagonal'])) if 'diagonal' in params else rng.choice(diagonals)
    if diag not in diagonals and diag[::-1] not in diagonals:
        raise ValueError('Expected two boundary cell centers defining a finite corner fold')
    origin = (paper.get_start_row(), paper.get_start_col())
    paper.fold('diagonal', diagonal_points=diag)
    if not (paper.grid == -1).any():
        raise ValueError('Diagonal moved no cell centers')
    (r,c),(u,v) = diag
    slope = (v-c)//(u-r)
    available = {}
    for y in range(paper.current_rows):
        for x in range(paper.current_cols):
            if paper.grid[y,x] < 0:
                continue
            d = x-c-slope*(y-r)
            twin = (y+slope*d, x-d)
            if d == 0 and min(r,u)<=y<=max(r,u):
                kind = 'crease'
            elif 0<=twin[0]<paper.current_rows and 0<=twin[1]<paper.current_cols and paper.grid[twin]<0:
                kind = 'flap'
            else:
                kind = 'outside'
            available[y,x] = kind
    count = level + 1
    if len(available) < count:
        raise ValueError('Too few cells remain')
    holes = list(map(tuple,params['punches'])) if 'punches' in params else rng.sample(list(available),count)
    if len(set(holes)) != count or any(h not in available for h in holes):
        raise ValueError('Punch positions must be distinct retained cells, in local row/column order')
    effects = [available[h] for h in holes]
    effect = params.get('effect','any')
    if effect not in ['any','mixed','crease','flap','outside']:
        raise ValueError('Unknown punch effect')
    if (effect == 'mixed' and len(set(effects)) < 2) or (effect not in ('any','mixed') and effect not in effects):
        raise ValueError('The punches do not demonstrate the requested effect')
    paper.punch(holes)
    paper.unfold()
    axes_available = []
    for axis, vectors in [('row',paper.grid),('col',paper.grid.T)]:
        occupied = [bool((vector==1).any()) for vector in vectors]
        if any(occupied) and not all(occupied):
            axes_available.append(axis)
    distractor = params.get('distractor') or (rng.choice(axes_available) if axes_available else None)
    if distractor not in axes_available:
        raise ValueError('The distractor needs an occupied and an empty band on the same axis')
    return dict(level=level,size=size,mechanism=shape,axes=axes,lines=lines,diagonal=diag,punches=holes,
                origin=origin,effects=effects,distractor=distractor)


def select(seed,params,module):
    unknown=set(params)-{'level','mechanism','axes','lines','diagonal','punches','effect','distractor'}
    if unknown:
        raise ValueError('Unknown parameters: '+', '.join(sorted(unknown)))
    rng=random.Random(seed)
    level=params.get('level',rng.choice([0,1,2]))
    if type(level) is not int or level not in (0,1,2):
        raise ValueError('Expected integer level 0, 1 or 2')
    for attempt in range(512):
        try:
            return choose(level,params,rng,module),attempt+1
        except (ValueError,IndexError) as error:
            reason=str(error)
    raise ValueError('No valid construction under these parameters: '+reason)

