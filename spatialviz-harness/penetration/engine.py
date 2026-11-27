"""Run the pinned SpatialViz tools and bind their unmodified output PNG to the task."""
import base64
from collections import Counter
import hashlib
import importlib
import io
import json
import shlex
from pathlib import Path
import sys
import zipfile

from PIL import Image

HERE = Path(__file__).resolve().parent
MANIFEST = json.loads((HERE / "official-source.json").read_text("utf-8"))
SOURCE = HERE.parent / "vendor" / ("SpatialViz-Bench-" + MANIFEST["revision"][:12]) / "create_freecad"
METHOD = "SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline"
FAMILIES = {
    "cross-sections": ("cross_native", "CrossSection", "create_cross_section.py"),
    "cube-assembly": ("assembly_native", "CubeAssembly", "create_cube_assembly.py"),
    "cube-counting": ("count_native", "CubeCounting", "create_cube_counting.py"),
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text("utf-8-sig"))


def checked_sources(kind):
    files = ["create_visual_penetration/" + FAMILIES[kind][2], "visual_penetration_tasks_utils.py", "utils.py"]
    result = {}
    for name in files:
        actual = digest((SOURCE / name).read_bytes())
        if actual != MANIFEST["files"][name]:
            raise ValueError("Pinned SpatialViz source differs: " + name)
        result[name] = actual
    return result


class NativeTrace:
    """Observe actual process launches and bytes at the upstream compositor return boundary."""
    def __init__(self, function):
        self.function = function
        self.compositor = str((SOURCE / "visual_penetration_tasks_utils.py").resolve()).casefold()
        self.calls = Counter()
        self.executables = []
        self.outputs = set()
        self.recording = True

    def audit(self, event, args):
        if self.recording and event == "subprocess.Popen":
            command = args[1]
            first = shlex.split(command,posix=False)[0].strip('"') if isinstance(command,str) else command[0]
            name = Path(str(args[0] or first)).name
            if name.lower() in ("freecad", "freecad.exe"):
                self.executables.append(name)

    def profile(self, frame, event, arg):
        fn = frame.f_code.co_name
        if not fn.startswith(("create_composite_image_", "prepare_composite_image_", "detect_grid", "get_cube_ans")):
            return
        if str(Path(frame.f_code.co_filename).resolve()).casefold() != self.compositor:
            return
        if event == "call":
            self.calls[fn] += 1
        elif event == "return" and fn == self.function:
            path = Path(frame.f_locals["output_path"])
            if path.is_file():
                self.outputs.add(digest(path.read_bytes()))


def file_evidence(folder):
    assets=[]
    for path in sorted(folder.rglob("*")):
        ext=path.suffix.lower()
        if ext not in (".fcstd", ".pdf", ".png") or not path.is_file():
            continue
        if ext == ".fcstd":
            with zipfile.ZipFile(path) as doc:
                if "Document.xml" not in doc.namelist():
                    raise ValueError("Invalid FreeCAD document")
        if ext == ".pdf" and not path.read_bytes().startswith(b"%PDF-"):
            raise ValueError("Invalid TechDraw PDF")
        assets.append({"file":path.relative_to(folder).as_posix(),"sha256":digest(path.read_bytes()),"bytes":path.stat().st_size})
    return assets


def generate(kind, seed, params, folder):
    sources = checked_sources(kind)
    module_name, task_type, model_script = FAMILIES[kind]
    module = importlib.import_module(module_name)
    compositor = "create_composite_image_" + task_type
    trace = NativeTrace(compositor)
    sys.addaudithook(trace.audit)
    previous = sys.getprofile()
    sys.setprofile(trace.profile)
    try:
        spec = module.generate(seed, params, folder, SOURCE)
    finally:
        sys.setprofile(previous)
        trace.recording = False
    data = (folder / "question.png").read_bytes()
    sha = digest(data)
    if not trace.executables or not trace.calls[compositor] or sha not in trace.outputs:
        raise RuntimeError(f"Unbound official build: FreeCAD launches {trace.executables}, calls {dict(trace.calls)}, observed composites {trace.outputs}, delivered {sha}")
    if base64.b64decode(spec["rendering"]["pngBase64"],validate=True) != data:
        raise ValueError("Delivered task differs from the official composite")
    files = file_evidence(folder)
    native = [a for a in files if a["file"].lower().endswith(".fcstd")]
    if not native or (kind=="cube-counting" and not any(a["file"].lower().endswith(".pdf") for a in files)):
        raise ValueError("Native model or counting projection PDF missing")
    receipt = {"revision":MANIFEST["revision"],"sourceFiles":sources,
        "modelEntry":"create_visual_penetration/"+model_script,"freecadLaunches":trace.executables,
        "observedFunctions":dict(trace.calls),"compositor":compositor,"compositeSha256":sha,"nativeFiles":files}
    (folder / "official-tools.json").write_text(json.dumps(receipt,indent=2),"utf-8")
    spec.setdefault("schemaVersion",1)
    spec["category"]="VisualPenetration"
    spec["taskType"]=task_type
    spec.setdefault("description",spec["question"])
    spec.setdefault("generator",{}).update(seed=seed,parameters=params)
    spec.setdefault("contract",{}).setdefault("mechanism",params.get("mechanism","default"))
    spec.setdefault("provenance",{}).update(sourceKind="agent-authored",sourceRevision=MANIFEST["revision"],
        generationMethod=METHOD,officialTools=receipt)
    with Image.open(io.BytesIO(data)) as im:
        spec["rendering"].update(width=im.width,height=im.height,sha256=sha)
    return spec


def verify(kind,spec):
    provenance=spec.get("provenance",{})
    if provenance.get("generationMethod")=="Visual Penetration parametric geometry and Pillow":
        from legacy_verify import verify as old_verify
        return old_verify(kind,spec)
    module_name,task_type,script=FAMILIES[kind]
    report=importlib.import_module(module_name).verify(spec)
    receipt=provenance.get("officialTools",{})
    files=receipt.get("nativeFiles",[])
    data=base64.b64decode(spec["rendering"]["pngBase64"],validate=True)
    composite=digest(data)
    function="create_composite_image_"+task_type
    checks={
        "Unmodified official source fingerprints": receipt.get("sourceFiles")==checked_sources(kind) and provenance.get("sourceRevision")==MANIFEST["revision"],
        "FreeCAD launch and native document recorded": bool(receipt.get("freecadLaunches")) and any(p["file"].lower().endswith(".fcstd") for p in files),
        "Pinned compositor emitted the delivered PNG": receipt.get("observedFunctions",{}).get(function,0)>0 and
          receipt.get("compositor")==function and receipt.get("compositeSha256")==spec["rendering"].get("sha256")==composite and
          any(f["file"]=="question.png" and f["sha256"]==composite for f in files),
        "Official method and task identity": provenance.get("generationMethod")==METHOD and spec.get("taskType")==task_type,
    }
    report["checks"].extend({"name":k,"verdict":"passed" if v else "failed"} for k,v in checks.items())
    if not all(checks.values()) or any(c["verdict"]!="passed" for c in report["checks"]):
        report["verdict"]="failed"
    return report


if __name__=="__main__":
    action,kind=sys.argv[1:3]
    if action=="generate":
        out=Path(sys.argv[5]).resolve()
        result=generate(kind,int(sys.argv[3]),read(Path(sys.argv[4])),out.parent)
    elif action=="verify":
        out=Path(sys.argv[4]).resolve()
        result=verify(kind,read(Path(sys.argv[3])))
    else:
        raise ValueError("Choose generate or verify")
    out.write_text(json.dumps(result,indent=2),"utf-8")
