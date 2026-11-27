"""Regression checks using actual benchmark question media and a real upstream-composed FreeCAD export."""
from pathlib import Path
from PIL import Image
from count_native import decode,solve

references=Path(__file__).resolve().parents[1]/"skills/spatialviz-cube-counting/references"
with Image.open(references/"upstream-three-views.png") as figure:
    grid=decode(figure)
choices=[{"type":"text","text":t} for t in ("9","10","7","None of the above")]
valid,_,evidence=solve(grid,choices,"exact")
assert not any(valid) and evidence["feasibleTotals"]==[9,10]
assert evidence["heightWitnesses"][9]!=evidence["heightWitnesses"][10]
for sense,expected in [("min",[True,False,False,False]),("max",[False,True,False,False]),("possible",[True,True,False,False])]:
    assert solve(grid,choices,sense)[0]==expected
with Image.open(references/"originals/Level1/34-3-3-3-16.png") as figure:
    calibrated=decode(figure)
_,_,proof=solve(calibrated,choices,"min")
assert min(proof["feasibleTotals"])==15
print("CubeCounting native figure, ambiguity, attainable minimum and possible-option regressions passed")
