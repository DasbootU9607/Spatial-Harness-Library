"""Run SpatialViz-Bench CubeCounting and independently solve the displayed TechDraw cells."""
import base64
import contextlib
import hashlib
import io
import itertools
import json
import os
from pathlib import Path
import random
import re
import shutil
import subprocess
import sys
from unittest import mock

import cv2
import numpy as np
from PIL import Image, ImageFont

HERE=Path(__file__).resolve().parent
CAD_ENTRY="create_visual_penetration/create_cube_counting.py"
CANDIDATE_TYPES={"min":"at least","max":"at most","possible":"possibly","exact":"possibly"}
NONE="None of the above"
HOST_CHANGES=[
    "Bind the active FreeCAD document for the upstream cube helper and assign complete unit placements.",
    "Allow GUI events to settle before the upstream TechDraw PDF export; save the accepted document as FCStd.",
    "Normalize light gray paper to white on the three official PDF crops before upstream grid detection.",
    "Resolve the official label font with the bundled DejaVu Sans Bold file."
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def official(source):
    # Load the recorded source path directly, including when another skill has imported a module named utils.
    import importlib.util
    def load(name):
        spec=importlib.util.spec_from_file_location(name,source/(name+".py"))
        module=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    utils=load("utils")
    with mock.patch.dict(sys.modules,{"utils":utils}):
        return load("visual_penetration_tasks_utils")


def native_model(folder,source,seed,size,heights,count):
    exe=os.environ.get("SPATIALVIZ_FREECAD")
    if not exe:
        runtime=HERE.parents[1]/".harness/freecad-official/runtime.json"
        exe=json.loads(runtime.read_text())["freecad"] if runtime.exists() else shutil.which("FreeCAD")
    if not exe:
        raise RuntimeError("Supply SPATIALVIZ_FREECAD or the library FreeCAD runtime binding")
    parent=folder/"VisualPenetration/CubeCounting"/("Level0" if count==2 else "Level1")
    parent.mkdir(parents=True)
    cfg=folder/"cad-input.json"
    cfg.write_text(json.dumps(dict(folder=str(folder),source=str(source),size=size,seed=seed,
                     levelFolder=str(parent),cadHeightRows=heights)),encoding="utf8")
    macro=folder/"count.FCMacro"
    macro.write_text("import sys\nfrom PySide import QtCore\nsys.path.insert(0,%r)\nimport count_cad\nQtCore.QTimer.singleShot(750,lambda:count_cad.run(%r))\n"%(str(HERE),str(cfg)),encoding="utf8")
    with (folder/"freecad.log").open("wb") as log:
        subprocess.run([exe,"--user-cfg",str(folder/"user.cfg"),str(macro)],cwd=folder,
            stdout=log,stderr=subprocess.STDOUT,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0),timeout=150,check=False)
    if (folder/"cad-error.txt").exists():
        raise RuntimeError((folder/"cad-error.txt").read_text("utf8"))
    cad=json.loads((folder/"cad-result.json").read_text("utf8"))
    return parent/cad["directory"],cad


def decode(image):
    """Recover every closed square from the final composited PNG, independent of model or filenames."""
    gray=np.array(image.convert("L"))
    # Official compositor puts labels at padding - 10 and drawings at padding + font_size = 160.
    ink=np.uint8(gray[160:]<128)
    xs=np.flatnonzero(ink.any(axis=0))
    strips=np.split(xs,np.flatnonzero(np.diff(xs)>1)+1)
    if len(strips) not in (2,3):
        raise ValueError("Expected two or three separable projected drawings")
    grids={}
    for name,span in zip(("Front","Top","Left"),strips):
        patch=ink[:,span[0]:span[-1]+1]
        ys=np.flatnonzero(patch.any(axis=1))
        patch=patch[ys[0]:ys[-1]+1]
        n,labels,stats,_=cv2.connectedComponentsWithStats(np.pad(1-patch,2,constant_values=1))
        cells=[stats[i][:4] for i in range(1,n) if i!=labels[0,0] and stats[i,4]>100]
        if not cells:
            raise ValueError("Missing enclosed unit cells")
        side=np.median([w for _,_,w,_ in cells])
        nx,ny=round(patch.shape[1]/side),round(patch.shape[0]/side)
        grid=[[0]*nx for _ in range(ny)]
        for x,y,w,h in cells:
            if max(w/h,h/w)>1.13 or abs(w-side)>5:
                raise ValueError("Irregular unit-square outline")
            col=int((x+w/2-2)*nx/patch.shape[1])
            row=int((y+h/2-2)*ny/patch.shape[0])
            if grid[row][col]:
                raise ValueError("Detected multiple unit cells at a projection coordinate")
            grid[row][col]=1
        if name!="Top" and any(list(col)!=sorted(col) for col in zip(*grid)):
            raise ValueError("Unsupported gap in the displayed elevation")
        grids[name]=grid
    return grids


def witnesses(grids):
    front=[sum(c) for c in zip(*grids["Front"])]
    top=grids["Top"]
    left=[sum(c) for c in zip(*grids["Left"])] if "Left" in grids else None
    if len(top[0])!=len(front) or (left is not None and len(left)!=len(top)):
        raise ValueError("The displayed views disagree on their shared axes")
    states={(0,0):[]}
    for y,foot in enumerate(top):
        after={}
        ceiling=left[y] if left is not None else max(front)
        choices=itertools.product(*(range(1,min(ceiling,h)+1) if on else (0,) for h,on in zip(front,foot)))
        for heights in choices:
            if left is not None and max(heights)!=ceiling:
                continue
            bits=sum(1<<x for x,h in enumerate(heights) if h==front[x])
            for (seen,n),partial in states.items():
                after.setdefault((bits|seen,n+sum(heights)),partial+[list(heights)])
        states=after
    return dict(sorted((n,m) for (seen,n),m in states.items() if seen==2**len(front)-1))


def solve(grids,opts,sense):
    models=witnesses(grids)
    if not models:
        raise ValueError("No supported height map fits the displayed views")
    totals=list(models)
    keys={"min":[min(totals)],"max":[max(totals)],"possible":totals,"exact":totals}[sense]
    numeric=[o["text"].isdigit() and int(o["text"]) in keys for o in opts]
    valid=[not any(numeric) if o["text"]==NONE else n for o,n in zip(opts,numeric)]
    ambiguous=sense=="exact" and len(totals)!=1
    if ambiguous:
        valid=[False]*len(opts)
    base=sum(map(sum,grids["Top"]));front=list(map(sum,zip(*grids["Front"])))
    intro=f"The footprint has {base} occupied cells. Match the front peaks {front}"
    if "Left" in grids:intro+=f" and the left peaks {list(map(sum,zip(*grids['Left'])))}"
    intro+=". "
    reasons=[]
    for o,yes in zip(opts,valid):
        value=o["text"]
        if ambiguous:
            detail=f"Totals {min(totals)} and {max(totals)} both match the displayed panels."
        elif value==NONE:
            detail="At least one offered number satisfies the condition." if not yes else "Each offered number fails the condition."
        elif yes:
            witness=models[int(value)]
            detail=f"Rows {witness} attain {value}. The full feasible range is {min(totals)} to {max(totals)}."
        elif int(value) in models:
            detail=f"{value} is attainable but misses the required endpoint {keys[0]}."
        else:
            detail=f"{value} is outside the attainable totals {min(totals)} through {max(totals)}."
        reasons.append(intro+detail)
    proof={"decodedViews":grids,"feasibleTotals":totals,"heightWitnesses":models}
    return valid,reasons,proof


def cad_views(cells,count):
    minx,miny,minz=map(min,zip(*cells))
    cells=[(x-minx,y-miny,z-minz) for x,y,z in cells]
    nx,ny,nz=[max(axis)+1 for axis in zip(*cells)]
    h=[[0]*nx for _ in range(ny)]
    for x,y,z in cells:h[ny-1-y][x]+=1
    if any(z>=h[ny-1-y][x] for x,y,z in cells):
        raise ValueError("Native stack has an unsupported or repeated unit")
    def elev(peaks):
        return [[int(z<=height) for height in peaks] for z in range(nz,0,-1)]
    grids={"Front":elev(list(map(max,zip(*h)))),"Top":[[int(v>0) for v in row] for row in h]}
    if count==3:grids["Left"]=elev(list(map(max,h)))
    return grids


def compose(source,leaf,folder,seed,sense,count,require_none,profile):
    module=official(source)
    original_crop=module.detect_subfigures
    cache={}
    def white_paper(*args,**kwargs):
        if cache.get("cropped"):return True
        if not original_crop(*args,**kwargs):
            raise ValueError("Official PDF segmentation found fewer than three views")
        for name in ("Front","Left","Top"):
            path=leaf/(name+".png")
            with Image.open(path) as raw:
                mask=raw.convert("L").point(lambda v:255 if v>=160 else 0).convert("RGB")
            mask.save(path)
        cache["cropped"]=True
        return True
    module.detect_subfigures=white_paper
    # Rerun only the upstream annotation sampling after an option collision. Keep the same official plate.
    original_compose=module.create_composite_image_CubeCounting
    def plate(*args,**kwargs):
        if not cache.get("plate"):
            original_compose(*args,**kwargs)
            cache["plate"]=True
    module.create_composite_image_CubeCounting=plate
    original_grid=module.detect_grid
    def grid(path,*axes):
        if path not in cache:cache[path]=original_grid(path,*axes)
        return cache[path]
    module.detect_grid=grid
    font=HERE.parent/"official-rotation/assets/DejaVuSans-Bold.ttf"
    open_font=ImageFont.truetype
    def resolve_font(name,*args,**kw):
        return open_font(str(font) if name=="DejaVuSans-Bold.ttf" else name,*args,**kw)

    # Compare the two diagnostic plates with identical upstream-drawn choices and ordering.
    # A rejected draw has no effect on the geometry or the benchmark's final annotation.
    class UnmatchedDraw(Exception):
        pass
    if sense=="exact":
        save_annotation=module.save_json
        diagnostic_numbers=[str(int(leaf.name.split("-")[-1])+delta) for delta in (-2,1,0)]
        requested=[diagnostic_numbers[0],diagnostic_numbers[1],NONE,diagnostic_numbers[2]]
        def save_matched(category,task,level,image_id,question,choices,key,why,output):
            if choices!=requested:
                raise UnmatchedDraw
            return save_annotation(category,task,level,image_id,question,choices,key,why,output)
        module.save_json=save_matched
    rejected=[]
    png=leaf/(leaf.name+".png")
    with (folder/"composition.log").open("w",encoding="utf8") as log,contextlib.redirect_stdout(log),mock.patch.object(ImageFont,"truetype",resolve_font):
        for attempt in range(100000 if sense=="exact" else 4096):
            sample_seed=seed+attempt
            module.random=random.Random(sample_seed)
            # Request a sense by conditioning on the first random choice made in prepare_composite_image_CubeCounting.
            if random.Random(sample_seed).choice(list(CANDIDATE_TYPES.values())[:3])!=CANDIDATE_TYPES[sense]:
                continue
            try:
                module.prepare_composite_image_CubeCounting(str(leaf),count-2)
            except UnmatchedDraw:
                continue
            a=json.loads((leaf/"data.json").read_text("utf8"))[0]
            if "pixels" not in cache:
                with Image.open(png) as im:cache["pixels"]=decode(im)
            display=cache["pixels"]
            opts=[{"type":"text","text":v} for v in a["Choices"]]
            valid,notes,proof=solve(display,opts,sense)
            measured=[min(proof["feasibleTotals"]),max(proof["feasibleTotals"])]
            official_range=list(map(int,re.findall(r"-?\d+",a["Explanation"]["ABCD"])))[-2:]
            discrepancy=None
            if measured!=official_range:
                if profile!="competing-peaks" or measured[1]!=official_range[1]:
                    raise ValueError(f"Rejected official numerical bounds {official_range}; projected cells give {measured}. Use a different model seed.")
                discrepancy={"sourceBounds":official_range,"measuredBounds":measured,
                    "explanation":"The upstream lower bound allows two incompatible peak placements to share one column."}
                if sense=="min":
                    if valid["ABCD".index(a["Answer"])]:
                        raise ValueError("The diagnostic predecessor unexpectedly has a valid minimum key")
                    return a,sample_seed,rejected,discrepancy
            if (sense=="exact" and count==2) or (sum(valid)==1 and valid["ABCD".index(a["Answer"])] and
                                                  (not require_none or NONE in a["Choices"])):
                return a,sample_seed,rejected,discrepancy
            rejected.append(dict(seed=sample_seed,choices=a["Choices"],reason="Option uniqueness or requested option format"))
    raise ValueError("No legal upstream choice draw under these projection constraints")


def generate(seed,params,folder,source):
    folder=Path(folder).resolve();source=Path(source).resolve()
    folder.mkdir(parents=True,exist_ok=True)
    unknown=set(params)-{"mechanism","size","none","profile","heights"}
    if unknown:raise ValueError(f"Unknown CubeCounting parameters: {unknown}")
    mechanism=params.get("mechanism","min-3")
    if not re.fullmatch(r"(min|max|possible|exact)-[23]",mechanism):raise ValueError("Unsupported CubeCounting mechanism")
    sense,n=mechanism.split("-");n=int(n);size=params.get("size",3)
    if type(size) is not int or size not in (3,4):raise ValueError("The official sampler requires size 3 or 4")
    if type(params.get("none",False)) is not bool:raise ValueError("none must be boolean")
    profile=params.get("profile")
    if profile not in (None,"competing-peaks"):raise ValueError("Unknown stack profile")
    heights=None
    if sense=="exact":
        heights=params.get("heights",[[1,0,0],[1,0,1],[3,1,0]])
        if (not isinstance(heights,list) or len(heights)!=size or
            any(not isinstance(row,list) or len(row)!=size or any(type(h) is not int or not 0<=h<=size for h in row) for row in heights)
            or max(max(row) for row in heights)!=size):
            raise ValueError("Exact totals need a square height map with a full-height column")
    elif "heights" in params:
        raise ValueError("Specify heights only for an exact-count model")
    if profile=="competing-peaks":
        if mechanism not in ("min-3","max-3"):raise ValueError("The competing-peaks pair uses three-view minimum and maximum questions")
        heights=[[2,2,3],[0,1,3],[1,0,3]]
    if heights and size!=3:raise ValueError("This prescribed native model has three cells on each axis")

    leaf,cad=native_model(folder,source,seed,size,heights,n)
    a,draw,rejected,discrepancy=compose(source,leaf,folder,seed,sense,n,params.get("none",False),profile)
    png=folder/"question.png"
    shutil.copyfile(leaf/(leaf.name+".png"),png)
    data=png.read_bytes()
    with Image.open(io.BytesIO(data)) as image:
        width,height=image.size
        observed=decode(image)
    if observed!=cad_views(cad["cells"],n):raise ValueError("The exported CAD projections disagree with the model occupancy")
    options=[dict(type="text",text=x) for x in a["Choices"]]
    key="ABCD".index(a["Answer"])
    valid,notes,proof=solve(observed,options,sense)
    paths=[CAD_ENTRY,"visual_penetration_tasks_utils.py","utils.py"]
    artifacts={p.name:sha(p.read_bytes()) for p in leaf.iterdir() if p.suffix.lower() in (".fcstd",".pdf",".png",".json")}
    evidence={"entrypoints":[CAD_ENTRY+":main","utils.py:detect_subfigures","visual_penetration_tasks_utils.py:prepare_composite_image_CubeCounting",
        "visual_penetration_tasks_utils.py:create_composite_image_CubeCounting","utils.py:save_json"],
        "sourceFiles":{p:sha((source/p).read_bytes()) for p in paths},"freecadVersion":cad["freecadVersion"],
        "artifactSha256":artifacts,"annotation":a,"modelSeed":seed,"acceptedCompositionSeed":draw,
        "rejectedOptionDraws":len(rejected),"inputKind":"prescribed occupancy decisions" if heights else "official seeded occupancy sampler",
        "hostAdaptations":HOST_CHANGES}
    if discrepancy:evidence["sourceBoundsDiscrepancy"]=discrepancy
    (folder/"composition-attempts.json").write_text(json.dumps(rejected,indent=2),encoding="utf8")
    question=("Given these views, how many cubes are in the stack? Choose A, B, C or D." if sense=="exact" else a["Question"])
    question+=" Each occupied top square is a solid vertical column standing on the floor. Front columns align with top columns."
    if n==3:question+=" Left-view columns, from left to right, correspond to top-view rows from top to bottom."
    return dict(schemaVersion=1,title=f"Cube Counting | {mechanism}",description=question,question=question,
        category="VisualPenetration",taskType="CubeCounting",contract={"mechanism":mechanism,"uniqueAnswerRequired":True},
        geometry={"sense":sense,"cells":cad["cells"],"camera":"First Angle Front, Top and optional Left"},
        options=options,answer={"index":key,"explanation":notes[key],"options":[{"label":"ABCD"[i],"explanation":s} for i,s in enumerate(notes)]},
        generator={"seed":seed,"parameters":params},rendering={"width":width,"height":height,"sha256":sha(data),"pngBase64":base64.b64encode(data).decode()},
        provenance={"sourceKind":"agent-authored","sourceRevision":"c27f9111a2674f2ea03e2ca1f5833326cf1eec1a",
        "generationMethod":"SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline","nativeEvidence":evidence})


def verify(s):
    img=s["rendering"];data=base64.b64decode(img["pngBase64"],validate=True)
    with Image.open(io.BytesIO(data)) as im:
        grids=decode(im)
        extent=im.size
    sense,n=s["contract"]["mechanism"].split("-");n=int(n)
    valid,notes,proof=solve(grids,s["options"],sense)
    ev=s["provenance"]["nativeEvidence"];a=ev["annotation"]
    expected_question=("Given these views, how many cubes are in the stack? Choose A, B, C or D." if sense=="exact" else a["Question"])
    expected_question+=" Each occupied top square is a solid vertical column standing on the floor. Front columns align with top columns."
    if n==3:expected_question+=" Left-view columns, from left to right, correspond to top-view rows from top to bottom."
    checks={
      "Final image is the official compositor output":sha(data)==img["sha256"]==ev["artifactSha256"].get(a["Image_id"]+".png") and extent==(img["width"],img["height"]),
      "Prompt, choices and key agree with upstream annotation":s["question"]==expected_question and CANDIDATE_TYPES[sense] in a["Question"] and
         a["Choices"]==[o["text"] for o in s["options"]] and len(set(a["Choices"]))==4 and "ABCD"[s["answer"]["index"]]==a["Answer"],
      "Published projection cells agree with the native model":len(grids)==n and grids==cad_views(s["geometry"]["cells"],n),
      "Visible constraints yield exactly one qualifying choice":sum(valid)==1 and valid[s["answer"]["index"]],
      "Per-option explanations agree with the independent solver":s["answer"]["options"]==[{"label":"ABCD"[i],"explanation":x} for i,x in enumerate(notes)]
    }
    return {"verdict":"passed" if all(checks.values()) else "failed","geometryEvidence":proof,
        "checks":[{"name":name,"verdict":"passed" if ok else "failed"} for name,ok in checks.items()]}
