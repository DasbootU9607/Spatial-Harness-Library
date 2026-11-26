"""Resolve seed and structured construction parameters before starting FreeCAD."""
import random
from cubes import positions, projection, feasible

PAIRS = [("Front","Top"),("Top","Left"),("Top","Front"),("Front","Left"),("Left","Front")]


def resolve(seed, p):
    rng = random.Random(seed)
    branch = p.get("branch")
    if branch == "cad":
        assert not set(p)-{"branch","mechanism","size","given","target","holes","bossSize"}
        kind = p.get("mechanism",rng.choice(["step","bores"]))
        assert kind in ("step","bores")
        dims = p.get("size",[rng.randrange(36,55),rng.randrange(24,35),rng.randrange(12,21)])
        assert len(dims)==3 and all(type(v) is int and 10<=v<=80 for v in dims)
        pairs = [(g,t) for g,t in PAIRS if p.get("given",g)==g and p.get("target",t)==t]
        if not pairs:
            raise ValueError("Unsupported given/target pair")
        given,target = rng.choice(pairs)
        w,d,h = dims
        if kind == "step":
            features = [{"op":"fuseBox","base":[0,d*.35,h],"size":[w*rng.uniform(.28,.49),d*.65,h*rng.uniform(.55,1.15)]}]
        else:
            features = [{"op":"cutCylinder","center":[w*.29,d*.32],"radius":min(w,d)*rng.uniform(.10,.14)},
                        {"op":"cutCylinder","center":[w*.71,d*.65],"radius":min(w,d)*rng.uniform(.15,.19)}]
        if "holes" in p:
            assert kind=="bores" and len(p["holes"])==2
            features=[]
            for x,y,r in p["holes"]:
                assert 1<=r<min(x,w-x,y,d-y)-.5
                features.append({"op":"cutCylinder","center":[x,y],"radius":r})
            (x,y,r),(u,v,s)=p["holes"]
            assert (x-u)**2+(y-v)**2>(r+s+1)**2
        if "bossSize" in p:
            a,b,c=p["bossSize"]
            assert kind=="step" and 1<=a<=w-1 and 1<=b<=d-1 and 1<=c<=80
            features=[{"op":"fuseBox","base":[0,d-b,h],"size":[a,b,c]}]
        return dict(branch=branch,mechanism=kind,size=dims,features=features,given=given,target=target)
    assert branch=="cubes" and not set(p)-{"branch","heightMap","red","alternativeRed"}
    for _ in range(120):
        heights = p.get("heightMap")
        if heights is None:
            w,d=rng.randint(2,4),rng.randint(2,4)
            heights=[[rng.randint(1,3) if x==0 or rng.random()<.5 else 0 for x in range(w)] for y in range(d)]
        assert 1<=len(heights)<=8 and 1<=len(heights[0])<=8
        assert all(len(r)==len(heights[0]) and all(type(h) is int and 0<=h<=8 for h in r) for r in heights)
        coords=[(x,y,z) for y,row in enumerate(heights) for x,h in enumerate(row) for z in range(h)]
        if len(coords)<3:
            raise ValueError("Need at least three cubes for two color assignments")
        def paint(key):
            chosen = p[key] if key in p else rng.sample(coords, min(3,max(1,len(coords)//4)))
            red=set(map(tuple,chosen))
            assert len(red)==len(chosen) and red and red<set(coords)
            return [[*c,"R" if c in red else "G"] for c in coords]
        original,variant=paint("red"),paint("alternativeRed")
        if 2*sum(c[-1]=="R" for c in original)>=len(original):
            raise ValueError("The stem requires a gray majority")
        try:
            positions(original)
        except AssertionError:
            if "heightMap" in p:
                raise
            continue
        target=projection(original,"Left")
        wrong=[projection(original,"Right"),projection(variant,"Left"),projection(variant,"Right")]
        if len(set([target,*wrong]))!=4:
            continue
        try:
            if any(feasible(projection(original,"Front"),projection(original,"Top"),w) for w in wrong):
                continue
        except ValueError:
            continue
        return dict(branch=branch,heightMap=heights,cubes=original,alternative=variant,target="Left")
    raise ValueError("Cannot establish distinct and forced choices for this seed and input within 120 proposals")
