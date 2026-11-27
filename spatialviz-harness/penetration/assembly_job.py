"""FreeCAD GUI job. Feed geometry into the pinned CubeAssembly builder and retain its actual B-rep cells."""
import argparse
import json
import os
from pathlib import Path
import random
import re
import time
import traceback
import FreeCAD as App
import FreeCADGui as Gui
import Part


def lattice_cells(shapes):
    cells=[]
    for shape in shapes:
        for solid in shape.Solids:
            b=solid.BoundBox
            if any(abs(v-1)>1e-6 for v in (b.XLength,b.YLength,b.ZLength)):
                raise ValueError("Assembly contains a non-unit solid")
            xyz=[b.XMin,b.YMin,b.ZMin]
            if any(abs(v-round(v))>1e-6 for v in xyz):
                raise ValueError("Nonintegral placement")
            cells.append(tuple(round(v) for v in xyz))
    if len(cells)!=len(set(cells)):
        raise ValueError("Overlapping native cubes")
    return sorted(cells)


def run(job_file):
    job=json.loads(Path(job_file).read_text("utf-8"))
    root=Path(job["folder"])
    try:
        source=Path(job["source"])/"create_visual_penetration/create_cube_assembly.py"
        code=source.read_text("utf-8")
        design=job.get("design")
        def change(old,new):
            nonlocal code
            if code.count(old)!=1:
                raise ValueError("Upstream source differs at "+old[:65])
            code=code.replace(old,new)

        # The archive's create_cube helper uses the module-level document.
        change("    num_samples = args.num_samples","    global doc\n    num_samples = args.num_samples")
        # Save the accepted native document and read the actual OCCT solids from its parts.
        change("        App.closeDocument(doc.Name)\n\nif __name__",
               "        archive_model(doc, compounds, save_dir)\n        App.closeDocument(doc.Name)\n\nif __name__")
        rotations={}
        def settle(view):
            for _ in range(48):
                Gui.updateGui()
                time.sleep(.017)
            view.setCameraType("Orthographic")

        def record_camera(view,name):
            settle(view)
            yaw=0
            if job["mode"]=="changed-view" and name in ("Cube_Compound3","Cube_Incorrect_Compound_1","Cube_Incorrect_Compound_2"):
                yaw={"Cube_Compound3":22,"Cube_Incorrect_Compound_1":-17,"Cube_Incorrect_Compound_2":9}[name]
                view.setCameraOrientation(App.Rotation(App.Vector(0,0,1),yaw).multiply(view.getCameraOrientation()))
                settle(view)
            rotations[name]=list(view.getCameraOrientation().Q)

        def capture(view,pathname,width,height):
            camera=view.getCamera()
            height_expr=r"\bheight\s+([\d.eE+-]+)"
            old_height=float(re.search(height_expr,camera)[1])
            view.setCamera(re.sub(height_expr,"height %.12g" % (old_height*1.24),camera))
            Gui.updateGui()
            view.saveImage(pathname,width,height)
        if code.count("view.saveImage(image_path, 1280, 1024)")!=2:
            raise ValueError("Unexpected native capture count")
        code=code.replace("view.saveImage(image_path, 1280, 1024)","capture(view, image_path, 1280, 1024)")
        change("            view.viewIsometric()\n            FreeCADGui.updateGui()",
               "            view.viewIsometric()\n            record_camera(view,compound_obj.Name)\n            FreeCADGui.updateGui()")
        change("        view.viewIsometric()\n        FreeCADGui.updateGui()",
               "        view.viewIsometric()\n        record_camera(view,'target')\n        FreeCADGui.updateGui()")
        def archive_model(doc,compounds,folder):
            target=[obj.Shape for obj in doc.Objects if obj.Name.startswith("Cube_") and obj.Name.split("_")[1].isdigit()]
            shapes={"total":lattice_cells(target)}
            for idx,obj in enumerate(compounds):
                if "Incorrect" in obj.Name:
                    raw=f"incorrect_compound_{job['parts']-1}_{idx-job['parts']}"
                else:
                    raw=f"compound_{idx}"
                shapes[raw]=lattice_cells([obj.Shape])
            doc.recompute()
            doc.saveAs(str(Path(folder)/"assembly.FCStd"))
            record={"FreeCAD":App.Version()[:3],"cameraQuaternions":rotations,"panelSolids":shapes}
            (Path(folder)/"brep.json").write_text(json.dumps(record,indent=2),"utf8")

        namespace={"__name__":"spatialviz_official_cube_assembly","__file__":str(source),
                   "archive_model":archive_model,"record_camera":record_camera,"capture":capture}
        if design:
            # Retain the upstream unit-box constructor, Part.makeCompound and image loop.
            begin=code.index("        k=1\n")
            end=code.index("        solids_count =",begin)
            code=code[:begin]+"""        for x,y,z in design["target"]:
            create_cube(x,y,z,placement_space)
"""+code[end:]
            def prescribed_parts(cubes,percentage,num_parts):
                return [{tuple(c):cubes[tuple(c)] for c in cells} for cells in design["parts"]]
            def foil_shapes(cells,original):
                # Copy one of the original unit B-reps and supply the foil placement.
                result=[]
                for cell in cells:
                    part=original.copy()
                    part.Placement=App.Placement(App.Vector(*cell),App.Rotation())
                    result.append(part)
                return result
            change("        compound1 = Part.makeCompound(part_obj1)",
                   """        incorrect_part_obj_1 = foil_shapes(design["foils"][0],part_obj_incorrect[0])
        incorrect_part_obj_2 = foil_shapes(design["foils"][1],part_obj_incorrect[0])
        compound1 = Part.makeCompound(part_obj1)""")
            namespace.update(design=design,foil_shapes=foil_shapes)
        exec(compile(code,str(source),"exec"),namespace)
        if design:
            namespace["split_cubes"]=prescribed_parts
        random.seed(job["seed"])
        stage=root/"raw"/"VisualPenetration"/"CubeAssembly"/("Level"+str(job["parts"]-2))
        args=argparse.Namespace(save_folder=str(stage),space_size=job["size"],num_samples=1,num_parts=job["parts"])
        for attempt in range(48):
            namespace["main"](args)
            results=list(stage.glob("*/brep.json"))
            if results:
                (root/"cad-result.json").write_text(json.dumps({"sample":str(results[0].parent.relative_to(root)),
                                                                "attempts":attempt+1}),"utf8")
                break
        else:
            raise ValueError("The archived sampler did not find a connected split within 48 attempts")
        exit_code=0
    except BaseException:
        (root/"cad-error.txt").write_text(traceback.format_exc(),"utf8")
        exit_code=1
    os._exit(exit_code)
