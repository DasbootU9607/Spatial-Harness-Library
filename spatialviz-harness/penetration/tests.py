"""Domain-specific observable regressions. Run one family independently."""
import copy
import sys
from engine import generate,verify,domain

kind=sys.argv[1]
d=domain(kind)
if kind=="cross-sections":
    s=generate(kind,14,{"mechanism":"marked"})
    assert verify(kind,s)["verdict"]=="passed"
    index=s["answer"]["index"]
    s["options"][index]["regions"]=[[(-x,y) for x,y in ring] for ring in s["options"][index]["regions"]]
    assert verify(kind,s)["verdict"]=="failed", "A reversed front view must fail"
    for m in ["parallel","three-tiers","oblique","mixed","point-contact","joined-rims"]:
        assert verify(kind,generate(kind,17,{"mechanism":m}))["verdict"]=="passed",m
elif kind=="cube-assembly":
    p=[(0,0,0),(1,0,0),(1,1,0),(1,1,1)]
    mirror=[(-x,y,z) for x,y,z in p]
    assert d.pack(p,[mirror],True)==(0,None)
    assert d.pack(p,[[(z,x,y) for x,y,z in p]],True)[0]>0
    for mode in ["two-parts","three-parts","interface","relocated","equal-three","changed-view"]:
        for none in [False,True]:
            assert verify(kind,generate(kind,47,{"mechanism":mode,"none":none}))["verdict"]=="passed",mode
else:
    s=generate(kind,19,{"mechanism":"exact-2"})
    result=verify(kind,s)
    assert result["verdict"]=="failed" and result["geometryEvidence"]["feasibleTotals"]==[4,5]
    assert verify(kind,generate(kind,19,{"mechanism":"exact-3"}))["geometryEvidence"]["feasibleTotals"]==[4]
    for mode in ["min","max","possible"]:
        for n in (2,3):
            assert verify(kind,generate(kind,19,{"mechanism":f"{mode}-{n}","none":True}))["verdict"]=="passed"
print(kind,"regressions passed")
