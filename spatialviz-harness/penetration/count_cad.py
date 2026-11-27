"""Execute the pinned CubeCounting entry in the FreeCAD GUI process."""
import json
import random
import time
import traceback
from pathlib import Path
from types import SimpleNamespace

import FreeCAD as App
import FreeCADGui as Gui


def replace_once(source, old, new):
    if source.count(old) != 1:
        raise ValueError("Unexpected revision of create_cube_counting.py")
    return source.replace(old,new)


def run(config_path):
    job=json.loads(Path(config_path).read_text("utf-8"))
    folder=Path(job["folder"])
    try:
        entry=Path(job["source"])/"create_visual_penetration/create_cube_counting.py"
        raw=entry.read_text(encoding="utf8")
        # main's local document must be available to the upstream create_cube helper.
        raw=replace_once(raw,'        doc = App.newDocument("Cubes")',
                         '        global doc\n        doc = App.newDocument("Cubes")')
        raw=replace_once(raw,'obj.Placement.Base = App.Vector(x, y, z)',
                         'obj.Placement = App.Placement(App.Vector(x,y,z),App.Rotation())')
        raw=replace_once(raw,"        time.sleep(0.5)","        wait_for_techdraw()")
        raw=replace_once(raw,"        App.closeDocument(doc.Name)\n\nif __name__",
                         "        save_native(doc, save_dir)\n        App.closeDocument(doc.Name)\n        return\n\nif __name__")

        def wait_for_techdraw():
            for _ in range(95):
                Gui.updateGui()
                time.sleep(.032)

        def save_native(doc, target):
            out=Path(target)
            cells=[]
            for obj in doc.Objects:
                if obj.Name.startswith("Cube_"):
                    xyz=obj.Placement.Base
                    cells.append([round(xyz.x),round(xyz.y),round(xyz.z)])
            doc.saveAs(str(out/"model.FCStd"))
            result={"directory":out.name,"cells":sorted(cells),"freecadVersion":".".join(App.Version()[:3])}
            (folder/"cad-result.json").write_text(json.dumps(result,indent=2),encoding="utf8")

        ns={"__name__":"official_counting_cad","save_native":save_native,"wait_for_techdraw":wait_for_techdraw}
        exec(compile(raw,str(entry),"exec"),ns)
        heights=job.get("cadHeightRows")
        if heights is None:
            ns["random"]=random.Random(job["seed"])
        else:
            # Inject only the input occupancy decisions at the sampler boundary.
            # The source still constructs every unit, compound and projection.
            size=job["size"]
            stream=iter(heights[y][x]>z for z in range(size) for y in range(size) for x in range(size)
                        if z==0 or heights[y][x]>=z)
            ns["random"]=SimpleNamespace(choice=lambda _:next(stream))
        ns["main"](SimpleNamespace(num_samples=1 if heights is not None else 128,space_size=[job["size"]]*3,
                save_folder=job["levelFolder"],template_path=App.getResourceDir()+"Mod/TechDraw/Templates/A4_Landscape_blank.svg"))
        if not (folder/"cad-result.json").exists():
            raise ValueError("No model having the requested extents was produced by the official sampler")
    except Exception:
        (folder/"cad-error.txt").write_text(traceback.format_exc(),encoding="utf8")
    finally:
        for name in tuple(App.listDocuments()):
            App.closeDocument(name)
        Gui.getMainWindow().close()
