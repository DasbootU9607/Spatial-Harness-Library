"""Build an authored STEP or stack and dispatch the pinned benchmark compositor."""
import base64
import contextlib
import json
import os
import random
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SHARED = HERE.parent/"official-rotation"
sys.path.append(str(SHARED))
from upstream import load, VENDOR, REVISION
from runner import runtime, sha
from image_audit import image_record
from parameters import resolve
from cubes import AXES

D = "All three other options are incorrect"


def launch(p,folder):
    job=folder/"params.json"
    job.write_text(json.dumps(p),"utf8")
    macro=folder/"project.FCMacro"
    macro.write_text("import sys\nfrom PySide import QtCore\nsys.path[:0]=%r\nimport gui_job\nQtCore.QTimer.singleShot(1200,lambda:gui_job.run(%r))\n"%([str(HERE),str(SHARED)],str(job)),"utf8")
    exe,_=runtime()
    with (folder/"gui.log").open("wb") as log:
        subprocess.run([exe,"--user-cfg",str(folder/"user.cfg"),str(macro)],stdout=log,stderr=subprocess.STDOUT,
                       creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0),timeout=150,check=False)
    if not (folder/"render.json").is_file():
        error=folder/"error.txt"
        raise RuntimeError(error.read_text() if error.exists() else "GUI produced no render receipt; inspect gui.log")
    return json.loads((folder/"render.json").read_text())


def compose(p,seed,folder):
    cad=p["branch"]=="cad"
    parent=folder/"MentalRotation/3ViewProjection/Authored"
    out=parent/"0"
    out.mkdir(parents=True)
    for f in ((folder/"0") if cad else folder).iterdir():
        if f.suffix in (".png",".pdf"):
            shutil.copyfile(f,out/f.name)
    sources={}
    if not cad:
        sources={f.stem:image_record(f) for f in out.glob("*.png")}
    receipts=[]
    def module(file,patches=(),bindings=None):
        mod,r=load("create_freecad/"+file+".py",bindings,patches,name=file)
        receipts.append(r)
        sys.modules[file]=mod
        return mod
    module("utils",[
        ("img.resize((new_w, Image.LANCZOS))","img.resize((new_w, target_height), Image.LANCZOS)",
         "Restore reference image height; upstream passed the resampling enum as the pixel height"),
        ("edges = cv2.Canny(gray, 50, 150)","_, edges = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV)",
         "Find closed dark drawing strokes instead of fragmented double Canny edges"),
        ("cv2.cvtColor(sub_img, cv2.COLOR_RGB2BGR))\n        print", "np.where(sub_img.mean(axis=2) < 128, 32, 255).astype(np.uint8))\n        print",
         "Normalize TechDraw paper and line palette before distractor generation")])
    def given(path):
        for v in ("Front","Top","Left"):
            sources[v]=image_record(Path(path)/(v+".png"))
        ref=p["given"]
        os.rename(Path(path)/(ref+".png"),Path(path)/(ref+"_ref.png"))
        return ref
    patches=[('ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)','ImageFont.truetype(FONT, font_size)',"Use the packaged DejaVu font"),
             ('folder_path.split(os.sep)','os.path.normpath(folder_path).split(os.sep)',"Normalize mixed Windows separators"),
             ("png_path.split('.')[0]","os.path.splitext(png_path)[0]","Preserve dotted workspace directory names"),
             ('in os.listdir(folder_path) if f.endswith','in sorted(os.listdir(folder_path)) if f.endswith',"Stable distractor order")]
    if cad:
        sources["Isometric"]=image_record(out/"0_Isometric.png")
        patches+= [('ref_view = find_max_area(folder_path)','ref_view = given(folder_path)',"Expose reference choice and archive the three PDF crops"),
                   ('choice_view = random.choice(views)','choice_view = TARGET',"Expose requested view"),
                   ('mark=[choices[2]],','mark=[choices[num_incorrect+1]],',"Use the next unused label"),
                   ('if i > 2:', 'if i > 2 and num_incorrect < 2:',"Keep a successful rotation fallback"),
                   ('if detect_subfigures(pdf_path, folder_path, padding=10) is None:', 'if not detect_subfigures(pdf_path, folder_path, padding=10):',"Reject a failed PDF crop"),
                   ('"None of the above"',repr(D),"Match released dataset text for D")]
    module("mental_rotation_tasks_utils",patches,dict(FONT=str(SHARED/"assets/DejaVuSans-Bold.ttf"),given=given,TARGET=p["target"]))
    call="prepare_composite_image_"+("CAD" if cad else "Cubes3View")+"(dir_path)"
    dispatch=[("from "+s+" import *","# unused domain","Skip unrelated dispatch dependencies") for s in
              ("metal_folding_tasks_utils","visual_penetration_tasks_utils","mental_animation_tasks_utils")]
    dispatch += [('save_folder = "path/to/save"','save_folder = FOLDER',"Use the authored object folder"),
                 ("# "+call,call,"Activate official projection dispatch")]
    random.seed(seed)
    with (folder/"compose.log").open("w") as log,contextlib.redirect_stdout(log):
        module("generate_data",dispatch,dict(FOLDER=str(parent)))
    annotation=json.loads((out/"data.json").read_text())[0]
    views={}
    for f in out.glob("*.png"):
        if f.stem=="0":
            continue
        suffix=f.stem.split("_")[-1]
        if suffix in ("A","B","C","D","ref","Front","Top","Isometric"):
            label=p["given"] if suffix=="ref" else suffix
            if cad and suffix in ("Front","Top"):
                continue
            views[label]=dict(file=f.stem,image=image_record(f))
    return dict(sources=sources,views=views,annotation=annotation,receipts=receipts),image_record(out/"0.png")


def generate(seed,params,folder):
    folder.mkdir(parents=True)
    p=resolve(seed,params)
    result=launch(p,folder)
    pipeline,final=compose(p,seed,folder)
    geometry=result.pop("geometry")
    if p["branch"]=="cad":
        geometry["brep"]=base64.b64encode((folder/"model.brep").read_bytes()).decode()
        geometry["brepSha256"]=sha(folder/"model.brep")
        pdf=folder/"0/0_3View.pdf"
        import fitz
        import hashlib
        with fitz.open(pdf) as doc:
            doc.set_metadata({})
            drawing=doc.tobytes(garbage=4,deflate=True,no_new_id=True)
        pipeline["drawingPdf"]=base64.b64encode(drawing).decode()
        pipeline["drawingSha256"]=hashlib.sha256(drawing).hexdigest()
    else:
        geometry["axesRightUpTowardViewer"]=AXES
    a=pipeline["annotation"]
    question=a["Question"]
    if p["branch"]=="cad":
        question += (" The plate has two vertical through-bores and no other cuts or bosses." if p["mechanism"]=="bores"
                     else " A single rectangular boss meets the back and left edges of the base.")
    else:
        question += " Each column is supported from below."
    spec=dict(schemaVersion=1,title=("Colored cube stack" if p["branch"]=="cubes" else "Machined plate / "+p["mechanism"])+
              " / "+p["target"]+" view",description="Select the requested orthographic projection.",category="MentalRotation",
              taskType="3ViewProjection",difficulty={"label":"Unranked","basis":"No calibration."},question=question,
              options=[dict(label=l,type="figure") if v==l else dict(label=l,type="text",text=v) for l,v in zip("ABCD",a["Choices"])],
              parameters=p,seed=seed,geometry=geometry,pipeline=pipeline,runtime=result,contract=dict(target=p["target"],branch=p["branch"]),
              rendering=dict(image=final),provenance=dict(sourceKind="agent-authored",generationMethod="SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline",
              sourceRevision=REVISION,manifest=json.loads((HERE/"source.json").read_text())))
    from verify import solve
    expected=solve(spec)
    # Preserve the upstream selected answer. Independent verification must agree.
    spec["answer"]=dict(expected,index="ABCD".index(a["Answer"]))
    (folder/"task.json").write_text(json.dumps(spec),"utf8")


if __name__=="__main__":
    seed,params,out=sys.argv[1:]
    generate(int(seed),json.loads(Path(params).read_text("utf-8-sig")),Path(out).resolve())
