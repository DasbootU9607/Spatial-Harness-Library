"""Run the pinned FreeCAD CubeAssembly builder and its released option compositor."""
import base64
import hashlib
import importlib
import importlib.util
import io
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys

from PIL import Image, ImageFont

HERE=Path(__file__).resolve().parent
MODES=("two-parts","three-parts","equal-three","changed-view","interface","relocated")
NONE="None of the above"
CAD="create_visual_penetration/create_cube_assembly.py"
COMPOSITOR="prepare_composite_image_CubeAssemply"
REVISION="c27f9111a2674f2ea03e2ca1f5833326cf1eec1a"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def solver():
    file=HERE.parent/"skills/spatialviz-cube-assembly/scripts/domain.py"
    spec=importlib.util.spec_from_file_location("assembly_exact_cover",file)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def explicit_design(mode,arm):
    base=[(0,1,0),(1,1,0),(1,2,0)]
    far=base+[(1,2,1)]
    near=base+[(0,1,1)]
    branch=base+[(1,1,1)]
    key=near if mode=="relocated" else far
    rail=[(x,0,0) for x in range(arm+1)]
    post=[(arm,1,0),(arm,1,1)]
    given=[rail+post] if mode in ("interface","relocated") else [rail,post]
    if mode in ("interface","relocated"):
        foils=[far if key==near else near,branch]
    elif mode=="equal-three":
        foils=[[(0,0,z) for z in range(4)],key[1:]]
    else:
        foils=[key[:-1],key[1:]]
    return {"target":rail+post+key,"parts":given+[key],"foils":foils}


def run_cad(seed,params,folder,source):
    mode=params.get("mechanism","interface")
    if mode not in MODES:
        raise ValueError("Unknown assembly mechanism")
    sampled=mode in ("two-parts","three-parts")
    allowed={"mechanism","size" if sampled else "arm","none"}
    if set(params)-allowed:
        raise ValueError(f"Unsupported {mode} parameters: {sorted(set(params)-allowed)}")
    if params.get("none",False) is not False:
        raise ValueError("The official CubeAssembly writer places the valid part among A, B and C; D is its fallback option.")
    parts=2 if mode in ("two-parts","interface","relocated") else 3
    size=params.get("size",[2,3,3])
    if not isinstance(size,list) or len(size)!=3 or any(type(x) is not int or not 2<=x<=5 for x in size):
        raise ValueError("size must be three integer grid dimensions between 2 and 5")
    arm=params.get("arm",random.Random(seed).randint(2,5))
    if type(arm) is not int or not 2<=arm<=5:
        raise ValueError("arm must be 2 through 5")
    design=None if sampled else explicit_design(mode,arm)
    if design:
        size=[1+max(c[axis] for c in design["target"]) for axis in range(3)]
    folder.mkdir(parents=True,exist_ok=True)
    config=HERE.parents[1]/".harness/freecad-official/runtime.json"
    exe=os.environ.get("SPATIALVIZ_FREECAD") or (read(config).get("freecad") if config.is_file() else None) or shutil.which("freecad") or shutil.which("FreeCAD")
    if not exe or not Path(exe).is_file():
        raise RuntimeError("Set SPATIALVIZ_FREECAD to the installed FreeCAD GUI executable")
    job={"seed":seed,"parts":parts,"mode":mode,"source":str(source),"folder":str(folder),"size":size,"design":design}
    argsfile=folder/"assembly-job.json"
    argsfile.write_text(json.dumps(job,indent=2),"utf8")
    macro=folder/"assembly.FCMacro"
    macro.write_text("import sys\nfrom PySide import QtCore\nsys.path.insert(0,%r)\nimport assembly_job\nQtCore.QTimer.singleShot(1000,lambda:assembly_job.run(%r))\n"%(str(HERE),str(argsfile)),"utf8")
    env=dict(os.environ,TMP=str(folder),TEMP=str(folder),PYTHONDONTWRITEBYTECODE="1")
    flags={"creationflags":subprocess.CREATE_NO_WINDOW} if os.name=="nt" else {}
    with (folder/"FreeCAD.log").open("wb") as log:
        result=subprocess.run([str(exe),"--user-cfg",str(folder/"user.cfg"),str(macro)],stdout=log,stderr=subprocess.STDOUT,env=env,timeout=210,**flags)
    if result.returncode or not (folder/"cad-result.json").is_file():
        error=folder/"cad-error.txt"
        raise RuntimeError(error.read_text("utf8") if error.is_file() else f"FreeCAD failed, see {folder/'FreeCAD.log'}")
    meta=read(folder/"cad-result.json")
    return mode,parts,folder/meta["sample"],meta["attempts"]


def seed_for_writer(seed,mode):
    # The diagnostic pair preserves the displayed alternatives. Upstream always
    # assigns the first shuffled letter to the actual complement, so swap the
    # two endpoint letters by selecting a second seed for the official shuffle.
    if mode!="relocated":
        return seed
    letters=list("ABC")
    random.Random(seed).shuffle(letters)
    want=[letters[1],letters[0],letters[2]]
    candidate=seed
    while True:
        order=list("ABC")
        random.Random(candidate).shuffle(order)
        if order==want:
            return candidate
        candidate+=1


def compose(raw,folder,source,seed):
    staged=folder/"composed"/"VisualPenetration"/"CubeAssembly"/raw.parent.name/raw.name
    staged.mkdir(parents=True)
    for file in sorted(raw.glob("*.png")):
        shutil.copyfile(file,staged/file.name)
    # Import the real compositor and its matching utils.py from the checked-out release.
    sys.path.insert(0,str(source))
    old={k:sys.modules.pop(k,None) for k in ("utils","visual_penetration_tasks_utils")}
    truetype=ImageFont.truetype
    font=HERE.parent/"official-rotation/assets/DejaVuSans-Bold.ttf"
    def resolve_font(name,*args,**kwargs):
        return truetype(str(font) if name=="DejaVuSans-Bold.ttf" else name,*args,**kwargs)
    state=random.getstate()
    try:
        ImageFont.truetype=resolve_font
        module=importlib.import_module("visual_penetration_tasks_utils")
        random.seed(seed)
        getattr(module,COMPOSITOR)(str(staged))
    finally:
        random.setstate(state)
        ImageFont.truetype=truetype
        sys.path.remove(str(source))
        for key,prior in old.items():
            sys.modules.pop(key,None)
            if prior is not None:sys.modules[key]=prior
    return staged


def panel_evidence(staged,raw,parts,im):
    native=read(raw/"brep.json")
    files={"target":staged/"total.png"}
    for i in range(parts-1):
        files[f"part {i+1}"]=staged/f"compound_{i}.png"
    for letter in "ABC":
        hits=list(staged.glob("*_"+letter+".png"))
        if len(hits)!=1:raise ValueError("Official compositor has no unique panel for "+letter)
        files[letter]=hits[0]
    records={}
    for label,file in files.items():
        stem=file.stem.rsplit("_",1)[0] if label in ("A","B","C") else file.stem
        with Image.open(file) as p:
            rgb=p.convert("RGB")
        raw_file=raw/(stem+".png")
        with Image.open(raw_file) as original:
            bounds=original.convert("L").point(lambda value:255 if value<170 else 0).getbbox()
            if bounds is None or min(bounds[0],bounds[1],original.width-bounds[2],original.height-bounds[3])<2:
                raise ValueError("Native view is empty or clipped: "+stem)
        records[label]={"nativeInkBounds":bounds,"nativePanel":stem+".png","rawSha256":digest((raw/(stem+".png")).read_bytes()),
                        "croppedSha256":digest(file.read_bytes()),"rgbSha256":digest(rgb.tobytes()),
                        "size":list(rgb.size),"cells":native["panelSolids"][stem]}
    upper=[x for x in records if x not in ("A","B","C")]
    for keys,y in [(upper,160),(list("ABC"),320+max(records[k]["size"][1] for k in upper))]:
        width=sum(records[k]["size"][0] for k in keys)+(len(keys)-1)*70
        x=(im.width-width)//2
        for k in keys:
            w,h=records[k]["size"]
            records[k]["box"]=[x,y,x+w,y+h]
            x+=w+70
    return native,records


def generate(seed,params,folder,source):
    folder=Path(folder).resolve();source=Path(source).resolve()
    mode,parts,raw,attempts=run_cad(seed,params,folder,source)
    writer_seed=seed_for_writer(seed,mode)
    staged=compose(raw,folder,source,writer_seed)
    data=read(staged/"data.json")[0]
    output=folder/"question.png"
    shutil.copyfile(staged/(staged.name+".png"),output)
    with Image.open(output) as img:
        im=img.convert("RGB")
    native,records=panel_evidence(staged,raw,parts,im)
    mod=solver()
    cells=lambda key: [list(p) for p in mod.normal(records[key]["cells"])]
    turn=mode in ("interface","relocated")
    geometry={"target":cells("target"),"given":[cells(f"part {i+1}") for i in range(parts-1)],"turn":turn}
    opts=[{"type":"image","cells":cells(k)} for k in "ABC"]+[{"type":"text","text":NONE}]
    valid,notes,proof=mod.solve(geometry,opts)
    correct=ord(data["Answer"])-65
    if sum(valid)!=1 or not valid[correct]:
        raise ValueError("The official choice fails independent exact cover")
    rule=("You may rotate and translate rigid pieces. Reflections are forbidden." if turn else
          "Translate the pieces in their original orientations. "+("The candidate views use different cameras." if mode=="changed-view" else "All panels use the same camera orientation."))
    question=data["Question"]+" "+rule
    evidence={"cadEntry":CAD,"compositionEntry":"visual_penetration_tasks_utils.py:"+COMPOSITOR,
              "calls":["create_cube_assembly.main","Part.makeBox","Part.makeCompound","viewIsometric","view.saveImage",COMPOSITOR,
                       "crop_blank_area","create_composite_image_CubeAssembly","save_json"],
              "upstreamSha256":{f:digest((source/f).read_bytes()) for f in (CAD,"visual_penetration_tasks_utils.py","utils.py")},
              "geometryInput":"upstream sampled and split" if mode in ("two-parts","three-parts") else "authored cell placements and candidate interfaces",
              "nativeFilename":"assembly.FCStd","nativeModelSha256":digest((raw/"assembly.FCStd").read_bytes()),
              "FreeCAD":native["FreeCAD"],"cameraQuaternions":native["cameraQuaternions"],"panels":records,
              "compositionSeed":writer_seed,"sampleAttempts":attempts,"officialAnswer":data["Answer"],
              "officialAnnotationSha256":digest((staged/"data.json").read_bytes()),"officialQuestion":data["Question"]}
    title={"two-parts":"One given piece","three-parts":"Two given pieces","interface":"Far-end riser","relocated":"Near-end riser",
           "equal-three":"Equal-volume rod","changed-view":"Changing candidate cameras"}[mode]
    content=output.read_bytes()
    return {"schemaVersion":1,"title":"Cube Assembly | "+title,"category":"VisualPenetration","taskType":"CubeAssembly",
       "description":question,"question":question,"geometry":geometry,"options":opts,
       "answer":{"index":correct,"explanation":notes[correct],"options":[{"label":chr(65+i),"explanation":v} for i,v in enumerate(notes)]},
       "contract":{"mechanism":mode,"uniqueAnswerRequired":True},"generator":{"seed":seed,"parameters":params},
       "rendering":{"width":im.width,"height":im.height,"sha256":digest(content),"pngBase64":base64.b64encode(content).decode("ascii")},
       "provenance":{"sourceKind":"agent-authored","sourceRevision":REVISION,"nativeEvidence":evidence,
                     "generationMethod":"SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline"}}


def verify(s):
    proof={};checks=[]
    def check(name,ok):checks.append({"name":name,"verdict":"passed" if ok else "failed"})
    mod=solver()
    meta=s["provenance"]["nativeEvidence"]
    panels=meta["panels"];render=s["rendering"];g=s["geometry"];opts=s["options"]
    content=base64.b64decode(render["pngBase64"],validate=True)
    im=Image.open(io.BytesIO(content)).convert("RGB")
    check("Official composite PNG and dimensions",digest(content)==render["sha256"] and list(im.size)==[render["width"],render["height"]])
    check("Every native cropped panel occurs at its official label position",
          all(digest(im.crop(p["box"]).tobytes())==p["rgbSha256"] for p in panels.values()))
    check("All three displayed candidates have distinct native images",len({panels[k]["rgbSha256"] for k in "ABC"})==3)
    def matches(label,cells):
        return mod.normal(panels[label]["cells"])==mod.normal(cells)
    check("Target and every choice match cells measured from native OCCT unit solids",
          matches("target",g["target"]) and all(matches(f"part {i+1}",v) for i,v in enumerate(g["given"]))
          and all(matches(k,o["cells"]) for k,o in zip("ABC",opts)))
    mode=s["contract"]["mechanism"]
    quaternions=list(meta["cameraQuaternions"].values())
    aligned=lambda q,r: abs(sum(a*b for a,b in zip(q,r)))>0.99999
    expected_mixed=mode=="changed-view"
    check("FreeCAD camera contract agrees with the native views",
          any(not aligned(quaternions[0],q) for q in quaternions[1:])==expected_mixed)
    check("Specified motion rule and official stem",g["turn"]==(mode in ("interface","relocated"))
          and s["question"].startswith(meta["officialQuestion"]) and ("Reflections are forbidden." in s["question"])==g["turn"])
    valid,notes,proof=mod.solve(g,opts)
    index=s["answer"]["index"]
    check("Unique exact packing option and official writer agree",len(opts)==4 and sum(valid)==1 and valid[index] and chr(65+index)==meta["officialAnswer"])
    check("Checked per-choice geometric explanations",s["answer"]["options"]==[{"label":chr(65+i),"explanation":n} for i,n in enumerate(notes)])
    check("FreeCAD file and upstream entry signatures recorded",meta["cadEntry"]==CAD and COMPOSITOR in meta["compositionEntry"] and len(meta["nativeModelSha256"])==64)
    return {"verdict":"passed" if all(c["verdict"]=="passed" for c in checks) else "failed","checks":checks,"geometryEvidence":proof}
