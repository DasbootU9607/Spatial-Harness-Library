"""Exercise the official-pixel contract through the same verifier the installed entry uses."""
import copy
import json
from pathlib import Path
import sys

from engine import FAMILIES, HERE, METHOD, checked_sources, verify

kind = sys.argv[1]
root = HERE.parents[1]
catalog = json.loads((root / "catalog/cases.json").read_text("utf-8"))
prefix = root / "spatialviz-harness/site"
checked_sources(kind)
native = {}
for case in catalog["cases"]:
    if case["harnessId"]!="spatialviz-harness" or kind not in case.get("skillIds",[]):
        continue
    record = json.loads((prefix / case["taskArtifact"]).read_text("utf-8"))
    if record["provenance"].get("generationMethod")==METHOD:
        assert verify(kind,record)["verdict"]=="passed",case["id"]
        native[record["contract"]["mechanism"]]=record
if not native:
    raise RuntimeError("Missing reviewed native task fixtures for "+kind)

example=next(iter(native.values()))
corrupt=copy.deepcopy(example)
corrupt["provenance"]["officialTools"]["compositeSha256"]="0"*64
assert verify(kind,corrupt)["verdict"]=="failed","The stored PNG must match the observed official compositor output"
corrupt=copy.deepcopy(example)
corrupt["answer"]["index"]=(example["answer"]["index"]+1)%4
assert verify(kind,corrupt)["verdict"]=="failed","Reject a changed answer"
if kind=="cross-sections":
    positive=next(x for x in (json.loads((prefix / c["taskArtifact"]).read_text("utf-8")) for c in catalog["cases"]
        if kind in c.get("skillIds",[]) and c.get("harnessId")=="spatialviz-harness" and not c.get("supersededBy"))
        if x.get("contract",{}).get("mechanism")=="marked" and x["geometry"]["offset"]==0)
    reversed_view=copy.deepcopy(positive)
    reversed_view["geometry"]["side"]="north" if positive["geometry"]["side"]=="south" else "south"
    assert verify(kind,reversed_view)["verdict"]=="failed","Reject a reversed viewing arrow"
elif kind=="cube-assembly":
    from assembly_native import solver
    d=solver()
    hand=[(0,0,0),(1,0,0),(1,1,0),(1,1,1)]
    assert d.pack(hand,[[(-x,y,z) for x,y,z in hand]],True)==(0,None)
    assert d.pack(hand,[[(z,x,y) for x,y,z in hand]],True)[0]>0
elif kind=="cube-counting":
    import runpy
    runpy.run_path(str(HERE/"test_count_native.py"),run_name="__main__")
print(kind,"native artifact and domain checks passed")
