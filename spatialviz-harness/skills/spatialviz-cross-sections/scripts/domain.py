"""Section outlines of stacked convex lofts, retaining each material boundary."""
import math
from diagram import paper,label,choice,project,fit,INK

def dot(a,b):
    return sum(x*y for x,y in zip(a,b))

def minus(a,b):
    return [x-y for x,y in zip(a,b)]

def cross(a,b):
    return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]

def unit(a):
    return [x/math.sqrt(dot(a,a)) for x in a]

def mesh(t):
    x,y,z,h,w,v,kind=t
    n={"triangle":3,"square":4,"round":96}[kind]
    def ring(r,level):
        if kind=="square":
            return [(x+a*r,y+b*r,level) for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]]
        return [(x+r*math.cos(i*2*math.pi/n+math.pi/2),y+r*math.sin(i*2*math.pi/n+math.pi/2),level) for i in range(n)]
    lo,hi=ring(w,z),ring(v,z+h)
    return [lo,hi]+[[lo[i-1],lo[i],hi[i],hi[i-1]] for i in range(n)]


def basis(plane):
    origin,right,up=plane
    return origin,right,up,unit(cross(right,up))


def hull(points):
    pts=sorted(set(tuple(round(k,6) for k in p) for p in points))
    if len(pts)<3:
        return []
    def half(seq):
        h=[]
        for p in seq:
            while len(h)>=2 and ((h[-1][0]-h[-2][0])*(p[1]-h[-2][1])-(h[-1][1]-h[-2][1])*(p[0]-h[-2][0]))<=1e-8:
                h.pop()
            h.append(p)
        return h
    return half(pts)[:-1]+half(pts[::-1])[:-1]


def section(tiers,plane):
    origin,u,v,n=basis(plane)
    regions=[]
    for t in tiers:
        pts=[]
        for face in mesh(t):
            for a,b in zip(face,face[1:]+face[:1]):
                da,db=dot(minus(a,origin),n),dot(minus(b,origin),n)
                if abs(da)<1e-9:
                    p=a
                elif da*db<0:
                    p=[k+(j-k)*da/(da-db) for k,j in zip(a,b)]
                else:
                    continue
                pts.append([dot(minus(p,origin),u),dot(minus(p,origin),v)])
        h=hull(pts)
        if h:
            regions.append(h)
    return regions


def clipped(tiers,plane):
    # Independent half-space intersection in the 2D paper plane.
    o,u,v,_=basis(plane)
    result=[]
    for t in tiers:
        inside=[t[0],t[1],t[2]+t[3]/2]
        poly=[(-64,-64),(64,-64),(64,64),(-64,64)]
        for face in mesh(t):
            n=cross(minus(face[1],face[0]),minus(face[2],face[0]))
            if dot(n,n)<1e-14:
                continue
            if dot(n,minus(inside,face[0]))>0:
                n=[-k for k in n]
            a,b,c=dot(n,u),dot(n,v),dot(n,minus(o,face[0]))
            out=[]
            for p,q in zip(poly,poly[1:]+poly[:1]):
                dp,dq=a*p[0]+b*p[1]+c,a*q[0]+b*q[1]+c
                if dp<=1e-8:
                    out.append(p)
                if (dp<0<dq or dq<0<dp) and abs(dp-dq)>1e-10:
                    out.append([x+(y-x)*dp/(dp-dq) for x,y in zip(p,q)])
            poly=out
        h=hull(poly)
        if h:
            result.append(h)
    return result


def same(a,b):
    def canonical(shape):
        allpts=[p for ring in shape for p in ring]
        if not allpts:
            return []
        origin=list(map(min,zip(*allpts)))
        return sorted([sorted(tuple(round(x-y,4) for x,y in zip(p,origin)) for p in ring) for ring in shape])
    return canonical(a)==canonical(b)


def build(rng,mode,params):
    if mode not in ("parallel","three-tiers","oblique","marked","mixed","point-contact","joined-rims"):
        raise ValueError("Unknown section mechanism")
    offset=params.get("offset",0)
    side=params.get("side","south")
    if side not in ("south","north") or offset not in (0,-2):
        raise ValueError("Set side to north/south and offset to 0 or -2")
    h=params.get("height",rng.choice([2,2.5,3]))
    if h not in (2,2.5,3):
        raise ValueError("height must be 2, 2.5 or 3")
    tiers=[[0,0,0,h,3,3,"square"],[1,.5,h,2,1.35,.7,"square"]]
    if mode in ("parallel","oblique"):
        tiers[1]=[0,0,h,2,1.7,.8,"round"]
    elif mode in ("mixed","three-tiers","point-contact"):
        tiers[1]=[.4,.3,h,1.7,1.9,1.5,"triangle"]
        tiers.append([.45,.4,h+1.7,1.8,.65,.65,"round"])
    if mode=="three-tiers":
        for tier in tiers:
            tier[0:2]=[0,0]
    if mode=="point-contact":
        tiers[1]=[0,0,h,2,1.8,0,"square"]
        tiers[2]=[0,0,h+2,1.4,1.1,.6,"triangle"]
    if mode=="joined-rims":
        tiers=[[0,0,0,h,2,2,"round"],[0,0,h,2,2,0,"round"]]
    if "tiers" in params:
        tiers=params["tiers"]
        if len(tiers) not in (2,3):
            raise ValueError("Supply two or three convex tiers")
        level=0
        for x,y,z,height,bottom,top,shape in tiers:
            if shape not in ("square","triangle","round") or z!=level or not (0<height<=4 and 0<bottom<=3 and 0<=top<=3):
                raise ValueError("Invalid loft, radius or contact height")
            level+=height
        if tiers[0][:3]!=[0,0,0] or tiers[0][4:7]!=[3,3,"square"]:
            raise ValueError("The common-scale base must be a square prism of width 6")
        h=tiers[0][3]
    front=[[0,offset,0],[1,0,0],[0,0,1]]
    if side=="north":
        front[1]=[-1,0,0]
    horizontal=[[0,0,h+1],[1,0,0],[0,1,0]]
    mid=[[0,.2,0],[1,0,0],[0,0,1]]
    third=[[.4,0,0],[0,1,0],[0,0,1]]
    angled=[[0,0,h],unit([1,0,1]),[0,1,0]]
    alt=[[0,0,h],[1,0,0],unit([0,1,1])]
    if mode=="oblique":
        axis=params.get("axis","x"); angle=params.get("angle",45)
        if axis not in ("x","y","z") or angle not in (45,135):
            raise ValueError("Use axis x/y/z and angle 45/135")
        c=math.cos(math.radians(angle)); s=math.sin(math.radians(angle))
        oblique={"x":([1,0,0],[0,-s,c]),"y":([s,0,-c],[0,1,0]),
                 "z":([-s,c,0],[0,0,1])}[axis]
        planes=[[[0,0,h],*oblique],mid,horizontal]
    else:
        planes=[horizontal,mid,third]
        if mode=="point-contact":
            planes[-1]=[[0,.85,0],[1,0,0],[0,0,1]]
        if mode=="parallel": # asymmetric offset changes chord of a circular frustum
            planes[-1]=[[1.42,0,0],[0,1,0],[0,0,1]]
    if mode=="marked":
        planes=[[[0,0,0],front[1],front[2]],[[0,-2,0],front[1],front[2]],horizontal]
    if mode=="joined-rims":
        planes=[horizontal,mid,alt]
    opts=[{"type":"image","regions":section(tiers,p),"witness":p} for p in planes]
    if mode=="marked":
        # The mirror of a one-region rectangle coincides with the correct shape.
        source=section(tiers,[[0,0,0],front[1],[0,0,1]])
        bad=[[[-x,y] for x,y in ring] for ring in source]
        index=0 if offset==0 else 1
    else:
        # A changed component width is physically impossible at the common printed scale.
        src=section(tiers,mid)
        bad=[list(ring) for ring in src]
        bad[-1]=[(x*1.2,y) for x,y in bad[-1]]
        xmin=min(p[0] for p in bad[-1]); xmax=max(p[0] for p in bad[-1])
        bad[-1]=[((x-(xmin+xmax)/2)*10.5/(xmax-xmin),y) for x,y in bad[-1]]
        index=3
    if mode=="joined-rims":
        lower,upper=section(tiers,alt)
        bad=[lower,[(.72*x,y) for x,y in upper]]
    opts.append({"type":"image","regions":bad})
    order=list(range(4)); rng.shuffle(order)
    return {"tiers":tiers,"mode":mode,"plane":front,"side":side},[opts[i] for i in order],order.index(index)


def draw(g,opts):
    marked=g["mode"]=="marked"
    title="Which section lies on the red cut?" if marked else "Which drawing cannot be a section of this solid?"
    side=g["side"]
    lines=["Read the red line in plan. Up on the answer sheet is vertical.",f"Look from the {side} toward the cut. Each component boundary is drawn."] if marked else [
        "One plane cuts the stack. Both views show the same object. Each cut component has its own outline.",
        "All answer diagrams use the scale below. The base is 6 units on each side."]
    if g["mode"]=="joined-rims":
        lines[1]="The solid cone and cylinder share their entire circular rim. Each component boundary is drawn."
    im,d=paper(title,lines)
    def solid(box,yaw):
        tiers=g["tiers"]
        transform=fit([project(p,yaw) for t in tiers for ring in mesh(t)[:2] for p in ring],box,52)
        camera=[math.sin(math.radians(yaw)),-math.cos(math.radians(yaw)),.49/.87]
        for i,tier in enumerate(tiers):
            faces=mesh(tier)
            tone=["#d1e0dc","#e7c597","#9dc1cf"][i]
            rgb=bytes.fromhex(tone[1:])
            for face in faces[2:]:
                n=cross(minus(face[1],face[0]),minus(face[2],face[0]))
                if dot(n,camera)<=0:
                    continue
                factor=.8+.13*(n[0]-n[1])/max(.001,math.sqrt(dot(n,n)))
                xy=[transform(project(p,yaw)) for p in face]
                color=tuple(int(x*factor) for x in rgb)
                smooth=tier[-1]=="round"
                d.polygon(xy,fill=color,outline=color if smooth else INK)
                if smooth:
                    d.line(xy[:2],fill=INK,width=1)
            if tier[5]>0:
                d.polygon([transform(project(p,yaw)) for p in faces[1]],fill=tone,outline=INK,width=2)
    solid((70,161,555,419),32)
    if marked:

        x,y,u=873,295,34
        for t in g["tiers"]:
            for ring in mesh(t)[:2]:
                d.polygon([(x+a*u,y-b*u) for a,b,_ in ring],fill="#c8d9dc",outline=INK,width=2)
        yy=y-g["plane"][0][1]*u
        d.line((x-122,yy,x+122,yy),fill="#c84924",width=4)
        start=-1 if side=="north" else 1
        xx=x+136
        d.line((xx,yy+start*54,xx,yy+start*5),fill=INK,width=3)
        d.polygon([(xx,yy),(xx-6,yy+start*11),(xx+6,yy+start*11)],fill=INK)
        label(d,(x,155),"Plan   /   North up",19,anchor="ma")
    else:
        solid((670,161,1160,419),138)
    unit_px=22
    d.line((46,434,46+unit_px,434),fill=INK,width=3)
    label(d,(78,422),"1 unit in the answer diagrams",16)
    for i,o in enumerate(opts):
        l,t,r,b=choice(d,i)
        allpts=[p for ring in o["regions"] for p in ring]
        xs,ys=zip(*allpts)
        cx=(max(xs)+min(xs))/2; cy=(max(ys)+min(ys))/2
        for ring in o["regions"]:
            xy=[((l+r)/2+(x-cx)*unit_px,(t+b)/2-(y-cy)*unit_px) for x,y in ring]
            d.polygon(xy,fill="#edf3f4",outline=INK,width=2)
    return im


def solve(g,opts,image=None):
    marked=g["mode"]=="marked"
    regions=clipped(g["tiers"],g["plane"]) if marked else None
    valid=[]; notes=[]; proof=[]
    for opt in opts:
        if marked:
            match=same(regions,opt["regions"])
            if match:
                why=("Only the broad base intersects the red line." if len(regions)==1 else
                     "The plane cuts both tiers. The shorter shoulder is on the "+("right." if g["side"]=="south" else "left."))
            elif len(opt["regions"])>len(regions):
                why="This adds a cap above the base although the red line misses its footprint."
            elif len(opt["regions"])<len(regions):
                why="The red line crosses two components. This drawing omits a section at the contact."
            elif same(regions,[[[-x,y] for x,y in ring] for ring in opt["regions"]]):
                why="The two shoulders have exchanged sides relative to the viewing arrow."
            else:
                why="This horizontal footprint has the wrong dimensions for a vertical cut through the six-unit base."
            notes.append(why)
            proof.append({"expected":regions})
        elif "witness" in opt:
            expected=clipped(g["tiers"],opt["witness"])
            if not same(expected,opt["regions"]):
                raise ValueError("Valid section witness does not reproduce its outlines")
            match=False
            notes.append(f"A plane with normal {tuple(round(k,3) for k in basis(opt['witness'])[3])} cuts {len(expected)} component(s) in these proportions.")
            proof.append({"plane":opt["witness"]})
        elif g["mode"]=="joined-rims":
            a,b=opt["regions"]
            # These option coordinates put the inclined join on a horizontal wire.
            y=max(p[1] for p in a)
            chord=lambda ring: sorted(p[0] for p in ring if abs(p[1]-y)<1e-4)
            lower,upper=chord(a),chord(b)
            bottom,top=g["tiers"]
            equal_face=(bottom[:2]==top[:2] and bottom[6]==top[6] and bottom[5]==top[4]
                        and bottom[2]+bottom[3]==top[2])
            match=equal_face and len(lower)>=2 and len(upper)>=2 and any(abs(f(lower)-f(upper))>1e-4 for f in (min,max))
            notes.append("Both solids meet in the same disk. A cutting plane gives both the same chord there. The two drawn chords have different endpoints.")
            proof.append({"lowerChord":lower,"upperChord":upper})
        else:
            def diameter(vertices):
                return max(math.dist(p,q) for i,p in enumerate(vertices) for q in vertices[i:])
            bound=max(diameter([p for ring in mesh(t)[:2] for p in ring]) for t in g["tiers"])
            observed=max(diameter(ring) for ring in opt["regions"])
            match=observed>bound+1e-5
            notes.append(f"The widest component section spans {observed:.2f} units. The largest possible point separation in any component is {bound:.2f}.")
            proof.append({"componentDiameterBound":bound,"observedDiameter":observed})
        valid.append(match)
    return valid,notes,{"certificates":proof}
