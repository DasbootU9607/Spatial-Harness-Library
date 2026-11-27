"""Exact rigid placement on the cubic lattice."""
from itertools import permutations, product
from diagram import paper,label,cubes,choice,INK,FILL

NONE="All three other options are incorrect"


def normal(piece):
    mins=tuple(map(min,zip(*piece)))
    return tuple(sorted(tuple(v-m for v,m in zip(p,mins)) for p in piece))


def rotations(piece, turn):
    if not turn:
        return {normal(piece)}
    variants=set()
    for perm in permutations(range(3)):
        inversions=sum(a>b for i,a in enumerate(perm) for b in perm[i+1:])
        for signs in product((-1,1),repeat=3):
            if (-1)**inversions * signs[0]*signs[1]*signs[2] == 1:
                variants.add(normal([tuple(p[a]*s for a,s in zip(perm,signs)) for p in piece]))
    return variants


def placements(piece,target,turn):
    result=set()
    for oriented in rotations(piece,turn):
        for q in target:
            delta=[a-b for a,b in zip(q,oriented[0])]
            translated=frozenset(tuple(a+b for a,b in zip(p,delta)) for p in oriented)
            if translated <= target:
                result.add(translated)
    return sorted(result,key=lambda s:sorted(s))


def pack(target,pieces,turn):
    target=frozenset(map(tuple,target))
    if sum(map(len,pieces))!=len(target):
        return 0,None
    candidates=[placements(p,target,turn) for p in pieces]
    count,first=0,None
    def search(i,occupied,placed):
        nonlocal count,first
        if i==len(pieces):
            if occupied==target:
                count+=1
                if first is None:
                    first=[sorted(p) for p in placed]
            return
        for p in candidates[i]:
            if occupied.isdisjoint(p):
                search(i+1,occupied|p,placed+[p])
    search(0,frozenset(),[])
    return count,first


def build(rng, mechanism, params):
    if mechanism not in ("two-parts","three-parts","interface","relocated","equal-three","changed-view"):
        raise ValueError("Unknown assembly mechanism")
    length=params.get("arm",rng.choice([2,3,4]))
    if type(length) is not int or not 2<=length<=5:
        raise ValueError("arm must be 2 through 5")
    base=[(0,0,0),(1,0,0),(1,1,0)]
    cw=base+[(1,1,1)]
    ccw=base+[(0,0,1)]
    key=ccw if mechanism=="relocated" else cw
    anchor=[(x,-1,0) for x in range(length+1)]+[(length,0,0),(length,0,1)]
    target=anchor+key
    given=[anchor] if mechanism not in ("three-parts","equal-three","changed-view") else [anchor[:-2],anchor[-2:]]
    turn=mechanism in ("interface","relocated")
    if turn:
        shapes=[cw,ccw,base+[(1,0,1)]]
    else:
        shapes=[key,key[:-1],key[1:]]
        if mechanism=="equal-three":
            shapes[1]=[(0,0,i) for i in range(4)]
    if params.get("none",False):
        shapes[shapes.index(key)]=[(i,0,0) for i in range(4 if turn else 3)]
        index=3
    else:
        index=shapes.index(key)
    order=list(range(3))
    rng.shuffle(order)
    opts=[{"type":"image","cells":normal(shapes[i])} for i in order]+[{"type":"text","text":NONE}]
    if mechanism=="changed-view":
        for o,yaw in zip(opts,[18,65,43]):
            o["cameraYaw"]=yaw
    return {"target":normal(target),"given":[normal(p) for p in given],"turn":turn},opts,(order.index(index) if index<3 else 3)


def layer_key(d,cells,box):
    cells=normal(cells)
    nx,ny,nz=[max(p[j] for p in cells)+1 for j in range(3)]
    l,t,r,b=box
    unit=min(14,(r-l-12*(nz-1))//(nx*nz),(b-t)//ny)
    x0=(l+r-(nx*unit+12)*nz+12)/2
    for z in range(nz):
        x=x0+z*(nx*unit+12)
        for i in range(nx):
            for j in range(ny):
                y=t+(ny-1-j)*unit
                full=(i,j,z) in cells
                d.rectangle((x+i*unit,y,x+(i+1)*unit,y+unit),fill=INK if full else "white",outline="#82999e")


def panel(d,cells,box,yaw=32):
    l,t,r,b=box
    cubes(d,cells,(l,t,r,b-56),yaw)
    layer_key(d,cells,(l,b-47,r,b))


def draw(g,opts):
    rule="You may rotate and translate rigid pieces. Reflections are forbidden." if g["turn"] else "Slide the pieces without turning them. All views use the same axes."
    if "cameraYaw" in opts[0]:
        rule="Slide pieces without turning. Pictorial cameras vary. All layer maps have the same axes."
    im,d=paper("Which piece completes the target?",[rule,"Layer maps show all cubes, bottom layer first from left to right. Back is up in each map. Dark squares are occupied."])
    parts=[g["target"]]+g["given"]
    for i,p in enumerate(parts):
        w=1200/len(parts)
        label(d,(36+i*w,153),"Target" if i==0 else f"Given piece {i}",22)
        panel(d,p,(45+i*w,191,10+(i+1)*w,443))
    for i,o in enumerate(opts):
        box=choice(d,i)
        if "cells" in o:
            panel(d,o["cells"],box,o.get("cameraYaw",32))
        else:
            label(d,(box[0],565),"All three other",22)
            label(d,(box[0],598),"options are incorrect",22)
    return im


def solve(g,opts,image=None):
    valid=[]
    notes=[]
    proof=[]
    for o in opts[:3]:
        parts=g["given"]+[o["cells"]]
        count,witness=pack(g["target"],parts,g["turn"])
        valid.append(count>0)
        proof.append({"placementCount":count,"coordinatesByPiece":witness})
        total=sum(map(len,parts))
        if count:
            notes.append(f"The pieces cover all {total} target cells without overlap ({count} placement sets).")
        elif total!=len(g["target"]):
            notes.append(f"The pieces supply {total} cubes for {len(g['target'])} target cells.")
        else:
            candidate=list(map(tuple,o["cells"]))
            degrees=sorted(sum(sum(abs(a-b) for a,b in zip(p,q))==1 for q in candidate) for p in candidate)
            if max(degrees)==3:
                problem="Its central cube has three face neighbors, while the required four-cell turn is a path."
            elif any(len({p[j] for p in candidate})==len(candidate) for j in (0,1,2)):
                problem="Its cubes are collinear. The unfilled cells turn a corner."
            else:
                problem="Its riser sits above the opposite endpoint of the L. Swapping the two hands requires a reflection."
            notes.append(problem+" Testing every allowed placement gives zero exact covers.")
    valid.append(not any(valid))
    notes.append("No offered piece fits." if valid[-1] else "A displayed piece has a complete packing.")
    return valid,notes,{"optionPlacements":proof}
