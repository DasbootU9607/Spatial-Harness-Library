"""FreeCAD GUI job. The upstream main owns both axonometric captures and runs its four slicing routines."""
import importlib.util
import json
import math
from pathlib import Path
import random
import shutil
import time
import traceback
from types import SimpleNamespace
import FreeCAD as App
import FreeCADGui as Gui
import Part
from PySide import QtCore


def execute(job):
    root = Path(job["folder"])
    source = Path(job["source"]) / "create_visual_penetration/create_cross_section.py"
    spec = importlib.util.spec_from_file_location("official_cross_section", source)
    upstream = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(upstream)
    raw = root / "screens"
    raw.mkdir()
    records, calls = {}, []
    tiers, mode = job["tiers"], job["mode"]
    vector = App.Vector
    axes = {"x":vector(1,0,0), "y":vector(0,1,0), "z":vector(0,0,1)}

    class SourceRandom(random.Random):
        def choice(self, seq):
            if list(seq)==["x","y","z"]:
                return job["axis"]
            if list(seq)==["parallel_to_YZ","parallel_to_XZ"]:
                return "parallel_to_XZ"
            return super().choice(seq)
    upstream.random = SourceRandom(job["seed"])

    def settle(seconds):
        # Camera transitions progress on the Qt event loop even with a hidden window.
        view=Gui.activeDocument().activeView()
        last=None; stable=0
        for _ in range(100):
            Gui.updateGui()
            QtCore.QCoreApplication.processEvents()
            pose=tuple(round(float(v),7) for v in view.getCameraOrientation().Q)
            stable=stable+1 if pose==last else 0
            last=pose
            time.sleep(.013)
            if stable>=8:break
    upstream.time=SimpleNamespace(sleep=settle)

    def stack(items,label):
        doc=App.ActiveDocument
        upstream.doc=doc
        members=[]
        for x,y,z,h,a,b,kind in items:
            s={"square":2,"round":1,"triangle":math.sqrt(3)}[kind]
            if a==b:
                name={"square":"cube","round":"cylinder","triangle":"triangular_prism"}[kind]
                args=[a*s,a*s,h] if kind=="square" else [a*s,h]
            elif b==0:
                name={"square":"pyramid_square","round":"cone","triangle":"pyramid_triangle"}[kind]
                args=[a*s,h]
            else:
                name={"square":"frustum_square","round":"frustum_circle","triangle":"frustum_triangle"}[kind]
                args=[a*s,b*s,h]
            fn="create_"+name
            getattr(upstream,fn)(*args)
            calls.append(fn)
            child=doc.Objects[-1]
            placement=child.Placement
            # makeBox begins in the positive octant. Other official constructors are centered.
            placement.Base=vector(x-a if name=="cube" else x,y-a if name=="cube" else y,z)
            child.Placement=placement
            child.ViewObject.Visibility=False
            doc.recompute()
            members.append(child.Shape.copy())
        compound=Part.makeCompound(members)
        body=doc.addObject("Part::Feature",label)
        body.Shape=compound
        doc.recompute()
        return compound,body

    def question_stack(names):
        result=stack(tiers,"Reference")
        upstream.reference=result[1]
        return result
    upstream.create_objects_in_order=question_stack

    def false_stack(body):
        # Force a broken containment relation so the real source cut has a global certificate.
        altered=[list(t) for t in tiers]
        altered[1][4]=max(tiers[0][4]*1.8, 5.8)
        altered[1][0:2]=tiers[0][0:2]
        if altered[1][5]>0:
            altered[1][5]=min(altered[1][4]*.8,altered[1][5])
        return stack(altered,"Foil")
    upstream.adjust_object_sizes=false_stack

    def save_view(filename):
        view=Gui.activeDocument().activeView()
        Gui.updateGui();view.fitAll();settle(.04)
        view.saveImage(str(filename),1280,1024)

    def marked_plan(folder):
        doc=App.ActiveDocument
        body=upstream.reference
        body.ViewObject.Visibility=True
        top=body.Shape.BoundBox.ZMax+.08
        y=job["offset"]
        sign=1 if job["side"]=="south" else -1
        lines=[((-3.5,y),(3.5,y)),((3.4,y-sign),(3.4,y)),((3.4,y),(3.2,y-.28*sign)),((3.4,y),(3.6,y-.28*sign))]
        mark=doc.addObject("Part::Feature","TraceAndSightArrow")
        mark.Shape=Part.makeCompound([Part.makeLine(vector(a,b,top),vector(c,d,top)) for (a,b),(c,d) in lines])
        mark.ViewObject.LineColor=(.90,.06,.03);mark.ViewObject.LineWidth=5.0
        doc.recompute();Gui.activeDocument().activeView().viewTop()
        save_view(folder/"Isometric_rotate.png")
        mark.ViewObject.Visibility=False;body.ViewObject.Visibility=False

    def archive_wire(filename, compound, normal, distance, rotate=None):
        n=vector(*normal)
        cam=Gui.activeDocument().activeView().getCameraOrientation()
        right,up=cam.multVec(vector(1,0,0)),cam.multVec(vector(0,1,0))
        if rotate:
            inv=App.Rotation(axes[rotate[0]],rotate[1]).inverted()
            right,up=inv.multVec(right),inv.multVec(up)
        loops=[]
        for solid in compound.Solids:
            for wire in solid.slice(n, distance):
                pts=wire.discretize(Deflection=.0007)
                if len(pts)<3: continue
                loops.append([[round(p.dot(right),6),round(p.dot(up),6)] for p in pts])
        records[filename]={"normal":normal,"distance":distance,"right":list(right),"up":list(up),"regions":loops}

    def wrap_parallel(family,axis):
        name="get_sections_parallel_to_"+family
        original=getattr(upstream,name)
        def run(compound,body,k=3,mode=0,save_dir=None):
            calls.append(name)
            folder=Path(save_dir)
            if job["mode"]=="marked" and family=="YZ" and not mode:
                marked_plan(folder)
            if job["mode"]=="marked" and family=="XZ" and not mode:
                k=5
            # Use the same plane in the reference and altered compounds. A widened
            # triangular tier would otherwise move the midpoint used for the foil.
            sample_body=upstream.reference if mode else body
            original(compound,sample_body,k=k,mode=mode,save_dir=save_dir)
            bounds=sample_body.Shape.BoundBox
            lo=getattr(bounds,axis+"Min");hi=getattr(bounds,axis+"Max")
            n=[int(axis==c) for c in "XYZ"]
            for i in range(1,k+1):
                suffix=f"Section_Parallel_{family}_{i}.png"
                key=("incorrect_" if mode else "")+suffix
                if not (folder/key).is_file():continue
                d=lo+(hi-lo)*i/(k+1)
                archive_wire(key,compound,n,d)
                if job["mode"]=="marked" and family=="XZ" and not mode and i in (1,3):
                    doc=App.ActiveDocument
                    wire=doc.addObject("Part::Feature","OppositeCut")
                    wire.Shape=Part.Compound(compound.slice(vector(*n),d));doc.recompute()
                    view=Gui.activeDocument().activeView();view.viewRear()
                    key=f"Back_{i}.png";save_view(folder/key);archive_wire(key,compound,n,d)
                    wire.ViewObject.Visibility=False;view.viewFront();settle(1)
        setattr(upstream,name,run)
    for family,axis in [("XY","Z"),("XZ","Y"),("YZ","X")]:
        wrap_parallel(family,axis)

    rotate_original=upstream.get_sections_rotated
    def rotated(compound,center,mode=0,save_dir=None):
        calls.append("get_sections_rotated")
        rotate_original(compound,center,mode=mode,save_dir=save_dir)
        axis=job["axis"]
        for angle in (45,135):
            c,s=math.cos(math.radians(angle)),math.sin(math.radians(angle))
            normal={"x":[0,c,s],"y":[c,0,s],"z":[c,s,0]}[axis]
            rotation=angle+180 if axis=="x" or (axis=="y" and angle==135) else angle
            archive_wire(f"Section_Rotated_{angle}_{axis}.png",compound,normal,vector(*normal).dot(center),(axis,rotation))
    upstream.get_sections_rotated=rotated

    class HostApp:
        def __getattr__(self,key):return getattr(App,key)
        def closeDocument(self,name):
            doc=App.getDocument(name)
            for obj in doc.Objects:
                obj.ViewObject.Visibility=(obj==upstream.reference)
            doc.recompute()
            doc.saveAs(str(root/"compound.FCStd"))
            App.closeDocument(name)
    upstream.App=HostApp()
    raw_root=root/"upstream"
    calls.append("main")
    upstream.main(SimpleNamespace(num_samples=1,num_objs=len(tiers),save_folder=str(raw_root)))
    generated=next(raw_root.iterdir())
    for png in generated.glob("*.png"):shutil.copyfile(png,raw/png.name)
    (root/"native-wires.json").write_text(json.dumps({"wires":records,"calls":calls,"version":App.Version()[:3]}),"utf-8")


def run(jobpath):
    root=Path(jobpath).parent
    try:
        execute(json.loads(Path(jobpath).read_text("utf-8")))
    except BaseException:
        (root/"cad-error.txt").write_text(traceback.format_exc(),"utf-8")
    finally:
        for name in list(App.listDocuments()):App.closeDocument(name)
        Gui.getMainWindow().close()
        QtCore.QCoreApplication.quit()
