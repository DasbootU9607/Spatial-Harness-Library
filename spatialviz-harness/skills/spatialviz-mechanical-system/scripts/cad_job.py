"""FreeCAD GUI entry. Save the assembly, reopen it, inspect it and photograph its actual solids."""
import json
import math
import os
import traceback
import time
from PySide import QtCore
from pathlib import Path
import FreeCAD as App
import FreeCADGui as Gui
import Part
from cad_model import build
from cad_check import inspect


def dump(file,data):
    file.write_text(json.dumps(data,indent=2),encoding='utf8')


def recheck(folder, model):
    folder=Path(folder)
    try:
        doc=App.openDocument(model)
        doc.recompute()
        report=inspect(doc);report['freecadVersion']='.'.join(App.Version()[:3])
        dump(folder/'native-verification.json',report)
        App.closeDocument(doc.Name)
    except BaseException:
        (folder/'cad-error.txt').write_text(traceback.format_exc(),encoding='utf8')
    finally:os._exit(0)


def run(folder):
    folder=Path(folder)
    try:
        system=json.loads((folder/'system.json').read_text(encoding='utf8'))
        doc=App.newDocument('MechanicalAssembly');doc.Label=system['title']
        anchors=build(doc,system)
        doc.recompute()
        view=Gui.activeDocument().activeView()
        orient=App.Rotation(App.Vector(0,1,0),-13).multiply(App.Rotation(App.Vector(1,0,0),system['cad']['tiltDeg']))
        view.setCameraOrientation(orient.Q);view.fitAll();Gui.updateGui()
        model=folder/'assembly.FCStd';doc.saveAs(str(model));App.closeDocument(doc.Name)
        doc=App.openDocument(str(model));doc.recompute()
        report=inspect(doc);report['freecadVersion']='.'.join(App.Version()[:3]);dump(folder/'geometry.json',report)
        view=Gui.activeDocument().activeView()
        def capture(name):
            for _ in range(28):
                Gui.updateGui();QtCore.QCoreApplication.processEvents();time.sleep(.018)
            view.saveImage(str(folder/name),1000,840,'Transparent')
            if not (folder/name).is_file():raise RuntimeError('FreeCAD viewport did not produce '+name)
        view.setCameraOrientation(orient.Q);view.fitAll();capture('assembly-view.png')
        App.closeDocument(doc.Name)
        doc=App.openDocument(str(model));view=Gui.activeDocument().activeView()
        view.setCameraOrientation((0,0,0,1));view.fitAll();capture('front-view.png')
        # Register label positions in the actual front-view pixels with transient guides.
        # The marker passes use exactly the same camera as the clean exposure.
        top=max(o.Shape.BoundBox.ZMax for o in doc.Objects if hasattr(o,'Shape') and not o.Shape.isNull())
        for n,(x,y,z) in anchors.items():
            probe=doc.addObject('Part::Feature','Registration')
            probe.Shape=Part.makeSphere(1.6,App.Vector(x,y,top+4))
            probe.ViewObject.ShapeColor=(1.,0.,1.);probe.ViewObject.DisplayMode='Shaded'
            doc.recompute();capture('marker-'+n+'.png');doc.removeObject(probe.Name)
        App.closeDocument(doc.Name)
        dump(folder/'capture.json',{'renderer':'FreeCADGui activeView.saveImage','model':'assembly.FCStd','views':['assembly-view.png','front-view.png'],'memberIds':list(anchors),'version':report['freecadVersion']})
    except BaseException:
        (folder/'cad-error.txt').write_text(traceback.format_exc(),encoding='utf8')
    finally:os._exit(0)
