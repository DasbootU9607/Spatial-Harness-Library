"""Generate or independently check one public task. A checker never receives the random oracle."""
import argparse
import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import random
import sys
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
KINDS={"cross-sections":"CrossSection","cube-assembly":"CubeAssembly","cube-counting":"CubeCounting"}
DEFAULTS={"cross-sections":"marked","cube-assembly":"interface","cube-counting":"min-3"}


def domain(kind):
    path=ROOT/"skills"/("spatialviz-"+kind)/"scripts/domain.py"
    spec=importlib.util.spec_from_file_location("penetration_domain",path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def encode(image):
    buffer=io.BytesIO()
    image.save(buffer,format="PNG")
    return buffer.getvalue()


def wording(kind,g):
    if kind=="cross-sections":
        if g["mode"]=="marked":
            return "Which section lies on the marked plane when viewed from the indicated side?"
        return "Two views show the same stack. Which image cannot be a plane section? Use the common scale and retain component boundaries."
    if kind=="cube-assembly":
        return "Which option, together with the given pieces, exactly covers the target? "+("Rotations and translations are allowed." if g["turn"] else "Keep the shown orientations.")
    return {"min":"What is the minimum number of cubes?", "max":"What is the maximum number of cubes?",
            "possible":"Which listed number of cubes is possible?", "exact":"How many cubes are in the stack?"}[g["sense"]]


def verify(kind,s):
    mod=domain(kind)
    img=s["rendering"]; data=base64.b64decode(img["pngBase64"],validate=True)
    im=Image.open(io.BytesIO(data)).convert("RGB")
    g,opts=s["geometry"],s["options"]
    valid,notes,proof=mod.solve(g,opts,im)
    results={}
    results["Final PNG agrees with the public drawing primitives, panel labels and option order"]=(
        im.size==(img["width"],img["height"]) and hashlib.sha256(data).hexdigest()==img["sha256"] and
        mod.draw(g,opts).tobytes()==im.tobytes())
    results["Question matches the displayed task and contract"]=s["question"]==wording(kind,g) and s["taskType"]==KINDS[kind]
    results["Exactly one displayed option satisfies the independent solver"]=sum(valid)==1 and valid[s["answer"]["index"]]
    results["Per-option explanations match the solver"]=s["answer"]["options"]==[{"label":chr(65+i),"explanation":n} for i,n in enumerate(notes)]
    results["Four distinct choices"]=len(opts)==4 and len({json.dumps(o,sort_keys=True) for o in opts})==4
    if kind=="cross-sections":
        results["No pair of section drawings is identical"]=all(not mod.same(o["regions"],p["regions"]) for i,o in enumerate(opts) for p in opts[i+1:])
    return {"checks":[{"name":k,"verdict":"passed" if v else "failed"} for k,v in results.items()],
            "verdict":"passed" if all(results.values()) else "failed","geometryEvidence":proof}


