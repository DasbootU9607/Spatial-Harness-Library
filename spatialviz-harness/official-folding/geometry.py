"""Integer exterior frames; paper coordinates increase rightward and upward."""
from collections import deque
from itertools import permutations

X,Y,Z=(1,0,0),(0,1,0),(0,0,1)
def neg(v):
    return tuple(-a for a in v)

def cross(a,b):
    return tuple(a[(i+1)%3]*b[(i+2)%3]-a[(i+2)%3]*b[(i+1)%3] for i in range(3))

FRAMES={'Top':(X,Y,Z),'Front':(X,Z,neg(Y)),'Right':(Y,Z,X),
        'Bottom':(X,neg(Y),neg(Z)),'Back':(neg(X),Z,Y),'Left':(neg(Y),Z,neg(X))}
SLOTS=('Top','Front','Right')
ROTATIONS=[(a,b,cross(a,b)) for a,b in permutations([X,Y,Z,neg(X),neg(Y),neg(Z)],2) if any(cross(a,b))]
def apply(rot,v):
    return tuple(sum(v[j]*rot[j][i] for j in range(3)) for i in range(3))

def turns(r,u):
    return (r,u,neg(r),neg(u))

def fold(cells):
    points={tuple(c['xy']) for c in cells}
    if len(points)!=6 or len(cells)!=6 or any(len(p)!=2 or not all(type(v)==int for v in p) for p in points):
        raise ValueError('Expected six distinct integer cells')
    root=min(points)
    frames={root:(X,Y,Z)}
    queue=deque([root])
    while queue:
        x,y=queue.popleft()
        r,u,n=frames[x,y]
        for point,frame in [((x+1,y),(neg(n),u,r)),((x-1,y),(n,u,neg(r))),
                            ((x,y+1),(r,neg(n),u)),((x,y-1),(r,n,neg(u)))]:
            if point not in points:
                continue
            if point in frames and frames[point]!=frame:
                raise ValueError('Contradictory fold along a shared edge')
            if point not in frames:
                frames[point]=frame
                queue.append(point)
    if len({f[2] for f in frames.values()})!=6:
        raise ValueError('Disconnected or overlapping cube faces')
    return frames

def poses(cells):
    frames=fold(cells)
    for rot in ROTATIONS:
        faces={}
        for cell in cells:
            r,u,n=frames[tuple(cell['xy'])]
            slot=next(k for k,f in FRAMES.items() if f[2]==apply(rot,n))
            direction=apply(rot,turns(r,u)[cell['turn']])
            q=turns(*FRAMES[slot][:2]).index(direction)
            faces[slot]=[cell['mark'],q]
        yield faces

