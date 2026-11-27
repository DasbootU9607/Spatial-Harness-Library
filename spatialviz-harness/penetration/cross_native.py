"""Run the pinned SpatialViz CAD builder and its image compositor."""
import base64
import hashlib
import importlib
import io
import json
import math
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys
from unittest.mock import patch
import cv2
import numpy as np
from PIL import Image, ImageFont

HERE=Path(__file__).resolve().parent
LETTERS="ABCD"
MODES=("parallel","three-tiers","mixed","point-contact","marked","joined-rims","oblique")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def settings(seed,params):
    mode=params.get("mechanism","parallel")
    allowed={"mechanism","side","offset","axis","angle","height","tiers"}
    if set(params)-allowed or mode not in MODES:raise ValueError("Unknown cross-section mechanism or parameter")
    rng=random.Random(seed)
    h=params.get("height",rng.choice([2,2.5,3]))
    side=params.get("side","south");offset=params.get("offset",0)
    axis=params.get("axis","x");angle=params.get("angle",45)
    if side not in ("south","north") or offset not in (0,-2) or axis not in ("x","y","z") or angle not in (45,135) or h not in (2,2.5,3):
        raise ValueError("Invalid viewer, plane, height or angle")
    r=rng.choice([1.45,1.65,1.8])
    tiers=[[0,0,0,h,3,3,"square"],[0,0,h,2,r,.65,"round"]]
    if mode=="marked":
        tiers[1]=[1,.5,h,2,1.35,.70,"square"]
    if mode in ("mixed","three-tiers"):
        shift=.4 if mode=="mixed" else 0
        tiers[1]=[shift,shift,h,1.7,1.85,1.5,"triangle"]
        tiers.append([shift,shift,h+1.7,1.65,.65,.65,"round"])
    if mode=="point-contact":
        tiers[1]=[0,0,h,2,1.8,0,"square"]
        tiers.append([0,0,h+2,1.4,1.2,.65,"triangle"])
    if mode=="joined-rims":
        tiers=[[0,0,0,h,2,2,"round"],[0,0,h,2,2,0,"round"]]
    tiers=params.get("tiers",tiers)
    if len(tiers) not in (2,3):raise ValueError("Provide two or three tiers")
    z=0
    for x,y,bottom,height,a,b,shape in tiers:
        if not all(math.isfinite(float(v)) for v in (x,y,bottom,height,a,b)) or abs(bottom-z)>1e-6 or not (0<height<=4 and 0<a<=3 and 0<=b<=3) or shape not in ("square","round","triangle"):
            raise ValueError("Invalid native tier")
        z+=height
    if mode=="marked" and "tiers" in params and (tiers[0][0:2]!=[0,0] or tiers[0][4]!=3):
        raise ValueError("The marked cut requires a six-unit base centered at the origin")
    return dict(mode=mode,seed=seed,tiers=tiers,offset=offset,side=side,axis=axis,angle=angle)


def launch(job,folder):
    config=HERE.parents[1]/".harness/freecad-official/runtime.json"
    binding=json.loads(config.read_text("utf-8")) if config.is_file() else {}
    exe=os.environ.get("SPATIALVIZ_FREECAD") or binding.get("freecad") or shutil.which("FreeCAD") or shutil.which("freecad")
    if not exe or not Path(exe).is_file():raise RuntimeError("Set SPATIALVIZ_FREECAD to the FreeCAD GUI executable")
    jobfile=folder/"cross-job.json";jobfile.write_text(json.dumps(job),"utf-8")
    macro=folder/"build-cross.FCMacro"
    macro.write_text("import sys\nfrom PySide import QtCore\nsys.path.insert(0,%r)\nimport cross_freecad\nQtCore.QTimer.singleShot(600,lambda:cross_freecad.run(%r))\n"%(str(HERE),str(jobfile)),"utf-8")
    kwargs={}
    if os.name=="nt":
        startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW
        startup.wShowWindow=0
        kwargs.update(startupinfo=startup,creationflags=subprocess.CREATE_NO_WINDOW)
    with (folder/"cad.log").open("wb") as log:
        result=subprocess.run([exe,"--user-cfg",str(folder/"cross.cfg"),str(macro)],stdout=log,stderr=subprocess.STDOUT,timeout=160,**kwargs)
    if (folder/"cad-error.txt").is_file():raise RuntimeError((folder/"cad-error.txt").read_text("utf-8"))
    if result.returncode or not (folder/"compound.FCStd").is_file():raise RuntimeError("FreeCAD did not deliver the cross-section model")


def component_name(t):
    shape=t[-1];a,b=t[4:6]
    return {"square":["cube","pyramid_square","frustum_square"],"round":["cylinder","cone","frustum_circle"],
            "triangle":["triangular_prism","pyramid_triangle","frustum_triangle"]}[shape][0 if a==b else 1 if b==0 else 2]


def selected(g):
    mode=g["mode"]
    levels=["Section_Parallel_XY_3","Section_Parallel_XZ_2","Section_Parallel_YZ_2"]
    if mode=="parallel":levels[-1]="Section_Parallel_XZ_1"
    if mode=="point-contact":levels[-1]="Section_Parallel_XZ_1"
    if mode in ("oblique","joined-rims"):levels[-1]=f"Section_Rotated_{g['angle']}_{g['axis']}"
    if mode=="marked":
        direct,reverse=("Section_Parallel_XZ","Back") if g["side"]=="south" else ("Back","Section_Parallel_XZ")
        return [direct+"_3",direct+"_1",reverse+"_3","Section_Parallel_XY_3"]
    return levels+["incorrect_Section_Parallel_XZ_2"]


def compositor(source):
    sys.path.insert(0,str(source))
    return importlib.import_module("visual_penetration_tasks_utils")


def choose_font():
    font=ImageFont.truetype
    local=HERE.parent/"official-rotation/assets/DejaVuSans-Bold.ttf"
    def pinned(name,*args,**kw):
        return font(str(local) if name=="DejaVuSans-Bold.ttf" else name,*args,**kw)
    return patch.object(ImageFont,"truetype",pinned)


def make_sheet(seed,g,folder,source):
    u=compositor(source)
    names=selected(g);marked=g["mode"]=="marked"
    path=folder/"VisualPenetration"/"CrossSection"/"Authored"/("0-"+"-".join(component_name(t) for t in reversed(g["tiers"])))
    path.mkdir(parents=True)
    refs=["Isometric","Isometric_rotate"]
    for name in refs+names:shutil.copyfile(folder/"screens"/(name+".png"),path/(name+".png"))
    with choose_font(),patch.object(u,"random",random.Random(seed)):
        if marked:
            order=list(LETTERS);u.random.shuffle(order)
            for f in path.glob("*.png"):u.crop_blank_area(str(f))
            for name,label in zip(names,order):
                (path/(name+".png")).rename(path/(name+"_"+label+".png"))
            question=("View 2 is a plan. The red trace locates a vertical cut; its arrow points from the viewer towards the solid. "
                      "Keeping the base below the cap, which image is the section at that cut?")
            key=order[0 if g["offset"]==0 else 1]
            u.create_composite_image_CrossSection(str(path),str(path/(path.name+".png")))
            u.save_json("VisualPenetration","CrossSection","Authored",path.name,question,list(LETTERS),key,{},str(path))
        else:
            u.prepare_composite_image_CrossSection(str(path))
    record=json.loads((path/"data.json").read_text("utf-8"))[0]
    by_label={f.stem[-1]:f.stem[:-2] for f in path.glob("*_?.png") if f.stem[-1] in LETTERS}
    png=path/(path.name+".png");shutil.copyfile(png,folder/"question.png")
    panels=refs+[by_label[l]+"_"+l for l in LETTERS]
    images=[Image.open(path/(p+".png")).convert("RGB") for p in panels]
    width,height=Image.open(png).size
    # Official compositing geometry, for checking source crops against the final printed row.
    bounds=[]
    for row,y in [(images[:2],160),(images[2:],320+max(im.height for im in images[:2]))]:
        x=(width-sum(im.width for im in row)-(len(row)-1)*70)//2
        for im in row:
            bounds.append([x,y,x+im.width,y+im.height]);x+=im.width+70
    return record,[by_label[l] for l in LETTERS],bounds,[digest(im.tobytes()) for im in images]


def generate(seed,params,folder,source):
    folder=Path(folder).resolve();source=Path(source).resolve();folder.mkdir(parents=True,exist_ok=True)
    g=settings(seed,params)
    launch({**g,"source":str(source),"folder":str(folder)},folder)
    upstream=json.loads((folder/"native-wires.json").read_text("utf-8"))
    record,order,boxes,fingerprints=make_sheet(seed,g,folder,source)
    options=[{"type":"image","wire":upstream["wires"][s+".png"]} for s in order]
    data=(folder/"question.png").read_bytes()
    width,height=Image.open(io.BytesIO(data)).size
    marked=g["mode"]=="marked"
    question=record["Question"]
    if not marked:question+=" The component order is preserved in the section drawings."
    task={"schemaVersion":1,"title":"CrossSection | "+g["mode"],"category":"VisualPenetration","taskType":"CrossSection",
          "description":question,"question":question,"geometry":g,"options":options,
          "contract":{"mechanism":g["mode"],"uniqueAnswerRequired":True},
          "generator":{"seed":seed,"parameters":params},"rendering":{"width":width,"height":height,"pngBase64":base64.b64encode(data).decode(),
                   "sha256":digest(data),"panelBoxes":boxes,"panelPixelDigests":fingerprints},
          "provenance":{"sourceKind":"agent-authored","sourceRevision":"c27f9111a2674f2ea03e2ca1f5833326cf1eec1a",
          "generationMethod":"SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline",
          "nativeEvidence":{"model":"compound.FCStd","modelSha256":digest((folder/"compound.FCStd").read_bytes()),
                "freecadVersion":upstream["version"],"geometryModule":"create_visual_penetration/create_cross_section.py",
                "nativeCalls":sorted(set(upstream["calls"])),"compositor":"visual_penetration_tasks_utils."+("create_composite_image_CrossSection" if marked else "prepare_composite_image_CrossSection"),
                "extensions":"Parameterized official primitives, interface-violating foil and plane selection."+(" CAD plan trace, rear camera and positive selection." if marked else "")}}}
    key=LETTERS.index(record["Answer"])
    results,notes,_=classify(task)
    task["answer"]={"index":key,"explanation":notes[key],"options":[{"label":l,"explanation":n} for l,n in zip(LETTERS,notes)]}
    return task


def expected(tiers,wire):
    n,u,v=[np.array(wire[k],float) for k in ("normal","right","up")]
    origin=n*wire["distance"]
    contours=[]
    for x,y,z,h,a,b,shape in tiers:
        slopes=np.arange(180)*math.tau/180 if shape=="round" else (np.arange(4)*math.tau/4 if shape=="square" else np.radians([30,150,270]))
        apothem=.5 if shape=="triangle" else 1
        taper=(b-a)*apothem/h
        halfspaces=[(np.array([0,0,-1]),-z),(np.array([0,0,1]),z+h)]
        for theta in slopes:
            c,s=math.cos(theta),math.sin(theta)
            halfspaces.append((np.array([c,s,-taper]),c*x+s*y+a*apothem-taper*z))
        points=np.array([[-50.,-50.],[50.,-50.],[50.,50.],[-50.,50.]])
        for plane,limit in halfspaces:
            if not len(points):break
            residual=points@np.array([plane@u,plane@v])+plane@origin-limit
            clipped=[]
            for j,p in enumerate(points):
                k=(j+1)%len(points);q=points[k];d,e=residual[j],residual[k]
                if d<=1e-9:clipped.append(p)
                if d*e<0:clipped.append(p+(q-p)*(d/(d-e)))
            points=np.array(clipped)
        if len(points)>=3 and cv2.contourArea(points.astype('float32'))>1e-6:contours.append(points)
    return contours


def support(poly):
    directions=np.arange(72)*math.tau/72
    return (np.array(poly)@np.array([np.cos(directions),np.sin(directions)])).max(axis=0)


def same(regions,model,center=False):
    if len(regions)!=len(model) or not len(regions):return False
    def prepare(rings):
        origin=np.concatenate([np.asarray(r) for r in rings]).min(axis=0) if center else np.zeros(2)
        return [support(np.array(r)-origin) for r in rings]
    return all(np.max(abs(a-b))<.028 for a,b in zip(prepare(regions),prepare(model)))


def short_shoulder(contours):
    base, cap = contours
    # Both contours are already in the reader's directed section plane.
    seam = min(point[1] for point in cap)
    intervals = []
    for contour in (base, cap):
        edge = [x for x, y in contour if abs(y - seam) < 1e-6]
        if not edge:
            return None
        intervals.append((min(edge), max(edge)))
    left = intervals[1][0] - intervals[0][0]
    right = intervals[0][1] - intervals[1][1]
    if abs(left - right) < 1e-6:
        return None
    return "left" if left < right else "right"


def classify(s):
    g=s["geometry"];tiers=g["tiers"];positive=g["mode"]=="marked"
    front={"normal":[0,1,0],"right":[1 if g["side"]=="south" else -1,0,0],"up":[0,0,1],"distance":g["offset"]}
    target=expected(tiers,front) if positive else []
    flags=[];notes=[];proof=[]
    for opt in s["options"]:
        w=opt["wire"];actual=w["regions"]
        candidate=expected(tiers,w)
        realized=same(actual,candidate)
        info={"planeNormal":w["normal"],"planeDistance":w["distance"],"nativeComponents":len(actual),"matchesIndependentClip":realized}
        if positive:
            match=same(actual,target,center=True)
            if match:
                if len(target) == 2:
                    direction = short_shoulder(target)
                    note = ("The line crosses both tiers; the cap has its short shoulder on the "+direction+"."
                            if direction else "The two clipped profiles match in the indicated viewing direction.")
                else:
                    note = "The red trace misses the cap, leaving just the rectangular base section."
            elif len(actual)>len(target):note="The drawing includes a cap although the red trace misses its footprint."
            elif len(actual)<len(target):note="The line traverses both tiers, but this drawing omits one component."
            else:note="The outline has the wrong footprint or the two shoulders are reversed relative to the arrow."
        elif realized:
            match=False;note=f"The plane with normal {tuple(round(float(n),3) for n in w['normal'])} reaches {len(actual)} component(s); the independently clipped profiles agree."
        else:
            # The reference upper footprint fits inside the lower footprint at their shared z-plane.
            # Intersection with any plane preserves subset inclusion on that seam.
            parent,child=tiers[:2]
            if parent[6]=="square":
                contained=all(abs(child[j]-parent[j])+child[4]<=parent[5]+1e-7 for j in (0,1))
            else:
                contained=parent[6]==child[6]=="round" and math.dist(parent[:2],child[:2])+child[4]<=parent[5]+1e-7
            interface=child[2]
            spans=[]
            for ring in actual[:2]:
                xs=[x for x,y in ring if abs(y-interface)<.018]
                spans.append([min(xs),max(xs)] if xs else [])
            overlap=(len(spans)==2 and all(len(a)==2 for a in spans))
            match=bool(contained and overlap and np.allclose(w["up"],[0,0,1],atol=.005) and
                (spans[1][0]<spans[0][0]-.05 or spans[1][1]>spans[0][1]+.05))
            info.update({"upperFootprintContained":contained,"interfaceIntervals":spans})
            note="At the first join from the base, the upper chord projects past the lower chord. The upper footprint lies inside the lower top face, so no plane can produce that ledge."
        flags.append(match);notes.append(note);proof.append(info)
    return flags,notes,proof


def outline_matches(panel,regions):
    binary=(cv2.cvtColor(np.asarray(panel),cv2.COLOR_RGB2GRAY)<170).astype("uint8")
    ys,xs=np.where(binary)
    if not len(xs):return False
    rings=[np.asarray(r,float) for r in regions]
    pts=np.concatenate(rings)
    lo=pts.min(axis=0);hi=pts.max(axis=0)
    scale=np.array([xs.max()-xs.min(),ys.max()-ys.min()])/(hi-lo)
    if not np.all(np.isfinite(scale)) or max(scale)/min(scale)>1.055:return False
    drawn=np.zeros_like(binary)
    for ring in rings:
        pix=(ring-lo)*scale
        pix[:,0]+=xs.min();pix[:,1]=ys.max()-pix[:,1]
        cv2.polylines(drawn,[np.rint(pix).astype("int32")],True,1,1)
    dist=cv2.distanceTransform(1-binary,cv2.DIST_L2,3)
    inverse=cv2.distanceTransform(1-drawn,cv2.DIST_L2,3)
    return max(np.quantile(dist[drawn>0],.98),np.quantile(inverse[binary>0],.98))<4


def verify(s):
    r=s["rendering"];data=base64.b64decode(r["pngBase64"],validate=True);im=Image.open(io.BytesIO(data)).convert("RGB")
    panels=[im.crop(box) for box in r["panelBoxes"]]
    flags,notes,certs=classify(s)
    geometry=all(c["matchesIndependentClip"] or flags[i] for i,c in enumerate(certs))
    unique=all(not same(o["wire"]["regions"],other["wire"]["regions"],center=True) for i,o in enumerate(s["options"]) for other in s["options"][:i])
    readings=[bool(outline_matches(panel,opt["wire"]["regions"])) for panel,opt in zip(panels[2:],s["options"])]
    checks={"Final official composite and native panel order":len(panels)==6 and digest(data)==r["sha256"] and [digest(p.tobytes()) for p in panels]==r["panelPixelDigests"],
            "Final visible wire pixels match oriented native section geometry":all(readings),
            "Exactly one answer under independent plane clipping or global seam containment":geometry and sum(flags)==1 and flags[s["answer"]["index"]],
            "Four distinct outlines":unique,"Per-option explanations":s["answer"]["options"]==[{"label":l,"explanation":v} for l,v in zip(LETTERS,notes)]}
    return {"checks":[{"name":k,"verdict":"passed" if v else "failed"} for k,v in checks.items()],
            "verdict":"passed" if all(checks.values()) else "failed","geometryEvidence":{"optionCertificates":certs,"visibleWireMatches":readings}}
