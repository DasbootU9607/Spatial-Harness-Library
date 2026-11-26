"""Solve from displayed panel content and world geometry, then audit public evidence."""
import base64
import hashlib
import json
import math
from pathlib import Path
import sys
import numpy as np
from cubes import AXES, feasible, positions, projection
from pixels import BASES, boundary, composition, crop_box, cube_pixels, decode, difference, distance, face_map, ink
from parameters import PAIRS, resolve

D="All three other options are incorrect"
HERE=Path(__file__).resolve().parent


def question(p):
    if p["branch"]=="cubes":
        return ("The image shows a stack of identical small cubes. Most cubes are gray, and a few are red. "
                "The top row, from left to right, shows the isometric, front, and top views of the cube stack. "
                "Which of the bottom images is the Left View of the cube stack? Please choose from options A, B, C, or D. "
                "Each column is supported from below.")
    return (f"The upper-left image is an isometric view of a 3D model, and the right image is the {p['given']} View. "
            f"Which of the lower images is the model's {p['target']} View? Please choose from options A, B, C, or D. "+
            ("The plate has two vertical through-bores and no other cuts or bosses." if p["mechanism"]=="bores" else
             "A single rectangular boss meets the back and left edges of the base."))


def cells(image,shape):
    arr=np.asarray(image)
    y,x=np.where(arr.min(2)<220)
    rows,cols=shape
    out=[]
    for i in range(rows):
        row=""
        for j in range(cols):
            px=int(x.min()+(j+.5)*(x.max()-x.min()+1)/cols)
            py=int(y.min()+(i+.5)*(y.max()-y.min()+1)/rows)
            r,g,b=map(int,arr[py,px])
            row+=("." if min(r,g,b)>245 else "R" if r-g>150 else "G")
        out.append(row)
    return tuple(out)


def solve(s):
    p=s["parameters"]
    views=s["pipeline"]["views"]
    target=p["target"]
    reasons=[]
    matches=[]
    if p["branch"]=="cubes":
        model=s["geometry"]["cubes"]
        correct=projection(model,"Left")
        shape=len(correct),len(correct[0])
        grids=[]
        for i,label in enumerate("ABCD"):
            grid=cells(decode(views[label]["image"]),shape)
            grids.append(grid)
            wrong=next(((r,c) for r in range(shape[0]) for c in range(shape[1]) if grid[r][c]!=correct[r][c]),None)
            if wrong:
                r,c=wrong
                names={"R":"red","G":"gray",".":"empty"}
                reasons.append(f"At row {r+1}, column {c+1} from the upper left, this option shows {names[grid[r][c]]}. The left view requires {names[correct[r][c]]}.")
            else:
                reds=[f"({r+1}, {c+1})" for r,row in enumerate(grid) for c,v in enumerate(row) if v=="R"]
                reasons.append("The outline and nearest cube colors match. Visible red cells by (row, column) from the upper left: "+(", ".join(reds) or "none")+".")
                matches.append(i)
    else:
        expected=boundary(face_map(s["geometry"]["faces"],target))
        for i,label in enumerate("ABC"):
            mask=ink(decode(views[label]["image"]))
            missing,extra=distance(expected,mask),distance(mask,expected)
            if max(missing,extra)<4.5:
                matches.append(i)
                reasons.append(f"The outline and visible feature edges align with the {target.lower()} projection of the {p['mechanism']=='bores' and 'drilled plate' or 'stepped base'}.")
            else:
                a,b=(expected,mask) if missing>=extra else (mask,expected)
                import cv2
                field=cv2.distanceTransform(1-b,cv2.DIST_L2,5)*a
                y,x=np.unravel_index(field.argmax(),field.shape)
                vertical="upper" if y<125 else "lower" if y>195 else "middle"
                horizontal="left" if x<125 else "right" if x>195 else "center"
                reasons.append(f"The {vertical}-{horizontal} region of the aligned drawing "+("omits a required edge." if missing>=extra else "contains an edge absent from the requested view."))
        reasons.append(f"D means none of A through C matches. {len(matches)} graphical option matches." if len(matches)==1 else f"D means none matches. Matching drawings: {len(matches)}.")
    return dict(index=matches[0] if matches else 3,eligible=matches,explanation="Compare visible surfaces along the requested viewing direction.",
                options=[dict(label=l,qualifies=i in matches,explanation=r) for i,(l,r) in enumerate(zip("ABCD",reasons))])


def structural(s):
    p=s["parameters"]
    g=s["geometry"]
    if p["branch"]=="cubes":
        for key in ("cubes","alternative"):
            assert positions(g[key])==positions(p[key])
        assert {tuple(c[:3]) for c in g["cubes"]}=={tuple(c[:3]) for c in g["alternative"]}
        assert g["axesRightUpTowardViewer"]=={k:list(v) for k,v in AXES.items()}
        assert p["target"]=="Left"
    else:
        assert (p["given"],p["target"]) in PAIRS and g["solidCount"]==1
        assert hashlib.sha256(base64.b64decode(g["brep"],validate=True)).hexdigest()==g["brepSha256"]
        assert all(f["surface"] in ("Part::GeomPlane","Part::GeomCylinder") for f in g["faces"])
        w,d,h=p["size"]
        volume=w*d*h
        for f in p["features"]:
            if f["op"]=="cutCylinder":
                volume-=math.pi*f["radius"]**2*h
            else:
                assert f["op"]=="fuseBox"
                volume+=math.prod(f["size"])
        assert math.isclose(volume,g["volume"],rel_tol=1e-7)
    assert p==resolve(s["seed"],s["generator"]["parameters"]), "Seed or construction history differs"
    assert s["question"]==question(p)
    assert s["contract"]=={"branch":p["branch"],"target":p["target"]}


def image_checks(s):
    p=s["parameters"]
    g=s["geometry"]
    views=s["pipeline"]["views"]
    sources=s["pipeline"]["sources"]
    cad=p["branch"]=="cad"
    labels="ABC" if cad else "ABCD"
    upper=["Isometric",p["given"]] if cad else ["Isometric","Front","Top"]
    assert set(views)==set(upper+list(labels))
    if cad:
        from drawing import option_operations
        option_operations(s["pipeline"],p["target"])
        faces=g["faces"]
        for v in ("Top","Left","Front","Isometric"):
            im=decode(sources[v])
            predicted=boundary(face_map(faces,v))
            err=difference(predicted,ink(im,v=="Isometric"))
            assert err<4.5, f"{v} mesh-to-drawing edge displacement {err:.1f}"
        for k in [*labels]:
            mask=ink(decode(views[k]["image"]))
            for l in labels[:labels.index(k)]:
                assert difference(mask,ink(decode(views[l]["image"])))>8,"Indistinguishable CAD options"
            score=difference(boundary(face_map(faces,p["target"])),mask)
            assert score<4.5 or score>8,"Uncertain CAD distractor"
        for k in upper:
            raw=decode(sources[k])
            if k=="Isometric":
                raw=raw.crop(crop_box(raw))
            assert np.array_equal(raw,decode(views[k]["image"]))
    else:
        for k,v in views.items():
            name=v["file"]
            rawname=name.rsplit("_",1)[0] if k in labels else name
            view=rawname.split("_")[-1]
            model=g["alternative" if "incorrect" in rawname else "cubes"]
            cam=s["runtime"]["cameras"][rawname]
            assert np.allclose([cam[key] for key in ("right","up","toward")],BASES[view],atol=1e-5), "Unexpected camera "+view
            im=decode(sources[rawname])
            cube_pixels(model,view,im)
            assert np.array_equal(im.crop(crop_box(im)),decode(v["image"])), "Panel crop differs"
        model=g["cubes"]
        front,top,correct=[projection(model,k) for k in ("Front","Top","Left")]
        shape=len(correct),len(correct[0])
        grids=[cells(decode(views[k]["image"]),shape) for k in labels]
        assert len(set(grids))==4
        for grid in grids:
            if grid!=correct:
                assert not feasible(front,top,grid), "Another supported stack fits the given views and this option"
    assert np.array_equal(composition(views,upper,list(labels)),decode(s["rendering"]["image"])), "Final composite differs"


def audit(s):
    checks=[]
    def check(name,fn):
        try:
            fn()
            checks.append(dict(name=name,verdict="passed"))
        except Exception as e:
            checks.append(dict(name=name,verdict="failed",detail=f"{type(e).__name__}: {e}"))
    def answer():
        p=s["parameters"]
        a=solve(s)
        assert len(a["eligible"])==1 and a==s["answer"],"Computed answer or explanation differs"
        choices=["A","B","C","D" if p["branch"]=="cubes" else D]
        assert s["options"]==[dict(label=l,type="figure") if v==l else dict(label=l,type="text",text=v) for l,v in zip("ABCD",choices)]
        raw=s["pipeline"]["annotation"]
        assert raw["Answer"]=="ABCD"[a["index"]] and raw["Choices"]==choices and s["question"].startswith(raw["Question"])
    check("World geometry, construction parameters, viewing contract and question",lambda:structural(s))
    check("Independent projected answer, released choice semantics and per-option explanations",answer)
    check("Visible surfaces, occlusion, distinctive options, crop and final labeled composition",lambda:image_checks(s))
    return checks


if __name__=="__main__":
    spec,id,fp,out=sys.argv[1:]
    s=json.loads(Path(spec).read_text("utf8"))
    checks=audit(s)
    verdict="passed" if all(c["verdict"]=="passed" for c in checks) else "failed"
    Path(out).write_text(json.dumps(dict(schemaVersion=1,candidateId=id,testedFingerprints=json.loads(Path(fp).read_text()),
        verifier=s["verifier"],checks=checks,verdict=verdict,scope="Discrete nearest-surface projection or face-mesh depth testing, displayed option uniqueness and exact composite replay.")))
    print(json.dumps(checks))
    sys.exit(int(verdict!="passed"))
