"""Repair the option selection with the original CAD renders and official compositor."""
import base64
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "spatialviz-harness/official-rotation"))
from compose import build
from verify import answer_for, audit

spec = json.loads(Path(sys.argv[1]).read_text("utf8"))
original = spec["pipeline"]
with tempfile.TemporaryDirectory() as temp:
    folder = Path(temp)
    for name, raw in original["raw"].items():
        (folder / name).write_bytes(base64.b64decode(raw["image"]["pngBase64"]))
    # Keep the object, camera and texture images. This selection includes a foil
    # from the rendered local texture turn, with the original red corner intact.
    composition = build(folder, original, 2, "can", 0, folder / "recomposition")
spec["pipeline"] = {**original, **composition}
spec["answer"] = answer_for(composition["views"], 2, "can")
spec["answer"].pop("eligible")
failures = [c for c in audit(spec) if c["verdict"] != "passed"]
if failures:
    raise ValueError(failures)
views = composition["views"]
print(json.dumps({"taskType": "2d-rotation", "answer": spec["answer"], "geometry": views[0]["geometry"],
                  "options": [{"label": v["label"], "type": "figure", "geometry": v["geometry"]} for v in views[1:]],
                  "parameters": spec["parameters"], "previewDigest": composition["finalImage"]["sha256"]}))
