"""Entry point executed inside the real FreeCAD GUI macro."""
import json
import re
import sys
import time
import traceback
from pathlib import Path
from types import SimpleNamespace
import FreeCAD as App
import FreeCADGui as Gui
import Part
from PySide import QtCore
from upstream import load

PREFIX = "create_freecad/create_mental_rotation/create_"


def capture(view, file, cameras):
    for _ in range(36):
        Gui.updateGui()
        time.sleep(.02)
    view.setCameraType("Orthographic")
    view.fitAll()
    Gui.updateGui()
    raw = view.getCamera()
    height = float(re.search(r"\bheight\s+([\d.eE+-]+)",raw)[1])*1.18
    view.setCamera(re.sub(r"\bheight\s+[\d.eE+-]+","height %.12g"%height,raw))
    rot=view.getCameraOrientation()
    cameras[Path(file).stem]=dict(right=list(rot.multVec(App.Vector(1,0,0))),
        up=list(rot.multVec(App.Vector(0,1,0))),toward=list(rot.multVec(App.Vector(0,0,1))),
        position=list(map(float,re.search(r"position\s+([^\n]+)",raw)[1].strip().split())),height=height)
    view.saveImage(str(file),1280,1024,"White")


def cube_views(folder,p,cameras):
    mod,receipt=load(PREFIX+"cubes_3view_projection.py",{"capture":lambda view,file:capture(view,file,cameras)},
        [('view.saveImage(f"{prefix}_{name}.png", 1280, 1024)','capture(view, f"{prefix}_{name}.png")',
          "Capture the settled orthographic camera and render with a white background")])
    doc=App.newDocument("Stack")
    m=p["heightMap"]
    grid=[[[0]*len(m[0]) for row in m] for z in range(max(map(max,m)))]
    bounds={key+axis: (999 if key=="min_" else 0) for key in ("min_","max_") for axis in "xyz"}
    for x,y,z,c in p["cubes"]:
        mod.create_cube(x,y,z,grid,doc,bounds)
    mod.copy_all_cubes(doc)
    models=[]
    for mode,model in enumerate([p["cubes"],p["alternative"]]):
        for obj in doc.Objects:
            obj.ViewObject.Visibility=("Copy" in obj.Name)==bool(mode)
        actual=[]
        for x,y,z,c in model:
            obj=doc.getObject(f"Cube_{x}_{y}_{z}"+("_Copy" if mode else ""))
            color=(1.,0.,0.) if c=="R" else (174/255,181/255,189/255)
            obj.ViewObject.ShapeColor=color
            obj.ViewObject.DiffuseColor=[color]*6
            obj.ViewObject.LineColor=(.1,.1,.1)
            box=obj.Shape.BoundBox
            assert all(abs(s-1)<1e-7 for s in (box.XLength,box.YLength,box.ZLength))
            actual.append([round(box.XMin),round(box.YMin),round(box.ZMin),
                           "R" if obj.ViewObject.DiffuseColor[0][1]<.1 else "G"])
        models.append(actual)
        doc.recompute()
        mod.save_views(str(folder/("cubes_incorrect" if mode else "cubes")),mode)
    return {"cubes":models[0],"alternative":models[1]},receipt


def cad_views(folder,p,cameras):
    w,d,h=p["size"]
    shape=Part.makeBox(w,d,h)
    for f in p["features"]:
        if f["op"]=="fuseBox":
            shape=shape.fuse(Part.makeBox(*f["size"],App.Vector(*f["base"])))
        else:
            x,y=f["center"]
            shape=shape.cut(Part.makeCylinder(f["radius"],h+2,App.Vector(x,y,-1)))
    shape=shape.removeSplitter()
    step=folder/"0.step"
    shape.exportStep(str(step))
    def evidence(view,png_path,part_obj):
        shape=part_obj.Shape
        mesh=[]
        for face in shape.Faces:
            pts,tris=face.tessellate(.02)
            mesh.append({"surface":face.Surface.TypeId,"vertices":[list(pt) for pt in pts],"triangles":tris})
        (folder/"mesh.json").write_text(json.dumps(mesh))
        shape.exportBrep(str(folder/"model.brep"))
        capture(view,png_path,cameras)
    mod,receipt=load(PREFIX+"cad_3view_projection.py",{"App":App,"evidence":evidence},[
        ('view.saveImage(png_path, 1280, 1024)','evidence(view,png_path,part_obj)',
         "Export reimported STEP faces and BRep at the isometric render boundary"),
        ('time.sleep(0.5)','\n        for _ in range(80):\n            FreeCADGui.updateGui()\n            time.sleep(.025)',
         "Allow asynchronous TechDraw projection and page layout to settle before PDF export")])
    template=Path(App.getResourceDir())/"Mod/TechDraw/Templates/A4_Landscape_blank.svg"
    info=mod.generate_info([str(step)],str(folder/"info.json"))
    mod.export_drawings([str(step)],info,str(folder),str(template),dict(min_faces=7,max_faces=20,min_volume=.001))
    return {"faces":json.loads((folder/"mesh.json").read_text()),"volume":info[str(step)]["volume"],
            "solidCount":info[str(step)]["solids"]},receipt


def run(job_file):
    folder=Path(job_file).parent
    try:
        p=json.loads(Path(job_file).read_text("utf8"))
        window=Gui.getMainWindow()
        window.setAttribute(QtCore.Qt.WA_DontShowOnScreen, True)
        window.show()
        Gui.activateWorkbench("PartWorkbench")
        prefs=App.ParamGet("User parameter:BaseApp/Preferences/View")
        prefs.SetBool("ShowNaviCube",False)
        prefs.SetBool("ShowAxisCross",False)
        cams={}
        geometry,receipt=(cube_views if p["branch"]=="cubes" else cad_views)(folder,p,cams)
        (folder/"render.json").write_text(json.dumps(dict(geometry=geometry,cameras=cams,receipt=receipt,freecadVersion=App.Version())))
    except Exception:
        (folder/"error.txt").write_text(traceback.format_exc())
    finally:
        for name in list(App.listDocuments()):
            App.closeDocument(name)
        QtCore.QTimer.singleShot(200,QtCore.QCoreApplication.quit)
