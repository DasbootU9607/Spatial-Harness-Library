"""Supported-column puzzles, read from the published projection cells."""
import itertools
from diagram import paper, label, choice, INK, FILL

NONE = "All three other options are incorrect"
NAMES = {"min":"minimum", "max":"maximum", "possible":"possible", "exact":"exact"}


def elevations(h):
    return [max(col) for col in zip(*h)], [max(row) for row in h]


def profiles(maxima, height):
    return [[int(value >= z) for value in maxima] for z in range(height,0,-1)]


def build(rng, mechanism, params):
    sense, n = mechanism.split("-")
    if sense not in NAMES or n not in ("2","3"):
        raise ValueError("Choose min/max/possible/exact and 2 or 3 views")
    size = params.get("size",3)
    if type(size) is not int or not 2 <= size <= 4:
        raise ValueError("size must be 2 through 4")
    if sense == "exact":
        heights = [[2,0],[1,1]]
    else:
        heights = [[0]*size for _ in range(size)]
        for i in range(size):
            heights[i][i] = rng.randint(1,3)
        for i in range(size-1):
            heights[i+1][i] = rng.randint(1,3)
        heights[0][0] = 3
    if params.get("profile")=="competing-peaks" and sense!="exact":
        heights=[[1,0,3],[0,1,3],[2,2,3]]
    front,left = elevations(heights)
    top = [[int(h>0) for h in row] for row in heights]
    grids={"Front":profiles(front,max(front)), "Top":top}
    if n == "3":
        grids["Left"]=profiles(left,max(front))
    # A second, direct Cartesian product provides the generation oracle for small grids.
    cells=[(x,y) for y,row in enumerate(top) for x,v in enumerate(row) if v]
    ranges=[range(1,(min(front[x],left[y]) if n=="3" else front[x])+1) for x,y in cells]
    feasible=set()
    for assignment in itertools.product(*ranges):
        h=[[0]*len(front) for row in top]
        for (x,y),v in zip(cells,assignment):
            h[y][x]=v
        f,l=elevations(h)
        if f==front and (n=="2" or l==left):
            feasible.add(sum(assignment))
    key={"min":min(feasible),"max":max(feasible),"possible":sum(map(sum,heights)),"exact":sum(map(sum,heights))}[sense]
    values=[key,min(feasible)-1,max(feasible)+1,max(feasible)+2]
    if sense in ("min","max") and min(feasible)!=max(feasible):
        values[2]=max(feasible) if sense=="min" else min(feasible)
    if sense=="exact":
        values=[4,5,3,6]
    if params.get("none",False):
        values[0]=NONE
        key=NONE
    elif rng.choice([False,True]):
        values[-1]=NONE
    rng.shuffle(values)
    return {"grids":grids,"sense":sense},[{"type":"text","text":str(v)} for v in values],values.index(key)


def enumerate_totals(grids):
    front=list(map(sum,zip(*grids["Front"])))
    top=grids["Top"]
    left=list(map(sum,zip(*grids["Left"]))) if "Left" in grids else None
    # One witness per (achieved front maxima, running total). Later rows cannot distinguish them.
    states={(tuple(0 for _ in front),0):[]}
    for y,mask in enumerate(top):
        choices=[range(1,cap+1) if occupied else (0,) for cap,occupied in zip(front,mask)]
        next_states={}
        for heights in itertools.product(*choices):
            if left is not None and max(heights)!=left[y]:
                continue
            for (peaks,count),previous in states.items():
                state=(tuple(map(max,zip(heights,peaks))),count+sum(heights))
                next_states.setdefault(state,previous+[heights])
        states=next_states
    return {n:h for (seen,n),h in states.items() if list(seen)==front}


def layout(grids):
    count=len(grids)
    for i,(name,grid) in enumerate(grids.items()):
        unit=min(53,220//len(grid),260//len(grid[0]))
        cx=(i+.5)*1240/count
        yield name,grid,int(cx-len(grid[0])*unit/2),int(305-len(grid)*unit/2),unit


def draw(g,opts):
    q={"min":"What is the minimum number of cubes?", "max":"What is the maximum number of cubes?",
       "exact":"How many cubes are in the stack?", "possible":"Which listed number of cubes is possible?"}[g["sense"]]
    im,d=paper(q,["Each filled top-view cell is a solid column of cubes standing on the floor.",
        "Front columns align with top columns."+(" Left-view columns follow top rows from top to bottom." if "Left" in g["grids"] else "")])
    for name,grid,x,y,u in layout(g["grids"]):
        label(d,(x,y-37),name,23)
        for r,row in enumerate(grid):
            for c,full in enumerate(row):
                if full:
                    d.rectangle((x+c*u,y+r*u,x+(c+1)*u,y+(r+1)*u),fill=FILL,outline=INK,width=2)
    for i,o in enumerate(opts):
        l,t,r,b=choice(d,i)
        if o["text"]==NONE:
            label(d,((l+r)/2,580),"All three other",21,anchor="mm")
            label(d,((l+r)/2,610),"options are incorrect",21,anchor="mm")
        else:
            label(d,((l+r)/2,596),o["text"],45,anchor="mm")
    return im


def solve(g,opts,image):
    # Decode occupied cells from the answerer's PNG. Layout supplies panel bounds and unit size only.
    decoded={}
    for name,grid,x,y,u in layout(g["grids"]):
        decoded[name]=[[int(image.getpixel((x+c*u+u//2,y+r*u+u//2))!=(255,255,255))
                        for c in range(len(grid[0]))] for r in range(len(grid))]
    witnesses=enumerate_totals(decoded)
    totals=sorted(witnesses)
    sense=g["sense"]
    if not totals:
        raise ValueError("No model matches the visible grids")
    target={"min":[min(totals)],"max":[max(totals)],"possible":totals,"exact":totals}[sense]
    valid=[o["text"].isdigit() and int(o["text"]) in target for o in opts]
    no_numeric=not any(valid)
    valid=[no_numeric if o["text"]==NONE else v for o,v in zip(opts,valid)]
    if sense=="exact" and len(totals)!=1:
        valid=[False]*4
    base=sum(map(sum,decoded["Top"]))
    heights=list(map(sum,zip(*decoded["Front"])))
    side=list(map(sum,zip(*decoded["Left"]))) if "Left" in decoded else None
    constraint=f"Start with {base} occupied bases and match column peaks {heights}"+(f" and row peaks {side}" if side else "")+"."
    reason=constraint+f" The visible grids allow totals {', '.join(map(str,totals))}."
    details=[reason+" "+("All listed numbers fail." if no_numeric else "A listed number qualifies.") if o["text"]==NONE
             else reason+f" {o['text']} "+("satisfies" if v else "fails")+f" the {NAMES[sense]} condition." for o,v in zip(opts,valid)]
    return valid,details,{"decodedViews":decoded,"heightWitnesses":witnesses,"feasibleTotals":totals}
