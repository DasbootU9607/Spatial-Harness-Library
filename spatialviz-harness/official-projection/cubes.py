"""Exact discrete projections and bounded feasibility from the given two ortho views."""
from itertools import product

if not __debug__:
    raise RuntimeError("Projection construction requires Python assertions enabled")

AXES = {"Front": ("+X", "+Z", "-Y"), "Top": ("+X", "+Y", "+Z"),
        "Left": ("-Y", "+Z", "-X"), "Right": ("+Y", "+Z", "+X")}


def positions(model):
    cells = {}
    for x,y,z,color in model:
        assert all(type(t) is int and 0 <= t < 8 for t in (x,y,z)), "Invalid lattice coordinate"
        assert color in ("R","G") and (x,y,z) not in cells, "Invalid color or overlapping cubes"
        cells[x,y,z] = color
    assert cells and all(min(p[k] for p in cells) == 0 for k in range(3))
    assert all(z == 0 or (x,y,z-1) in cells for x,y,z in cells), "Unsupported column"
    reached = {next(iter(cells))}
    pending = list(reached)
    while pending:
        x,y,z = pending.pop()
        for p in ((x+1,y,z),(x-1,y,z),(x,y+1,z),(x,y-1,z),(x,y,z+1),(x,y,z-1)):
            if p in cells and p not in reached:
                reached.add(p)
                pending.append(p)
    assert len(reached) == len(cells), "Stack is disconnected"
    return cells


def projection(model, view):
    rays = {}
    for x,y,z,c in model:
        u,v,near = {"Front":(x,z,-y),"Top":(x,y,z),"Left":(-y,z,-x),"Right":(y,z,x)}[view]
        old = rays.get((u,v))
        if old is None or near > old[0]:
            rays[u,v] = (near,c)
    us, vs = zip(*rays)
    return tuple("".join(rays.get((u,v),(0,"."))[1] for u in range(min(us),max(us)+1))
                 for v in range(max(vs),min(vs)-1,-1))


def feasible(front, top, left, limit=150000):
    """Any supported colored height field matching all three grids? Ignore ISO conservatively."""
    height, width, depth = len(front),len(front[0]),len(top)
    if len(left)!=height or len(left[0])!=depth:
        return False
    top, front = top[::-1],front[::-1]
    side = [row[::-1] for row in left[::-1]]
    def skyline(rows,i):
        return max((z+1 for z,row in enumerate(rows) if row[i]!="."),default=0)
    cx = [skyline(front,x) for x in range(width)]
    cy = [skyline(side,y) for y in range(depth)]
    fp = [(x,y) for y in range(depth) for x in range(width) if top[y][x]!="."]
    ranges = [range(1,min(cx[x],cy[y])+1) for x,y in fp]
    for n,hs in enumerate(product(*ranges)):
        if n>=limit:
            raise ValueError("Ambiguity search limit reached")
        h = dict(zip(fp,hs))
        if any(max((h.get((x,y),0) for y in range(depth)),default=0)!=cx[x] for x in range(width)):
            continue
        if any(max((h.get((x,y),0) for x in range(width)),default=0)!=cy[y] for y in range(depth)):
            continue
        colors = {(x,y,v-1):top[y][x] for (x,y),v in h.items()}
        compatible = True
        for z in range(height):
            for x in range(width):
                if cx[x]>z:
                    y=next(y for y in range(depth) if h.get((x,y),0)>z)
                    if colors.setdefault((x,y,z),front[z][x])!=front[z][x]:
                        compatible=False
            for y in range(depth):
                if cy[y]>z:
                    x=next(x for x in range(width) if h.get((x,y),0)>z)
                    if colors.setdefault((x,y,z),side[z][y])!=side[z][y]:
                        compatible=False
        if compatible:
            return True
    return False
