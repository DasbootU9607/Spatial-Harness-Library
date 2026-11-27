"""FreeCAD macro entry point. Render both sides of each public state with the upstream cube maker."""
import json
import time
import traceback
from pathlib import Path

def capture(file, source):
    import FreeCAD as App
    import FreeCADGui as Gui
    from PySide import QtCore
    import sys
    sys.path.insert(0,source)
    import create_block_moving as native
    from pivy import coin
    job=Path(file)
    try:
        win=Gui.getMainWindow()
        win.setAttribute(QtCore.Qt.WA_DontShowOnScreen,True)
        win.show()
        Gui.activateWorkbench('PartWorkbench')
        prefs=App.ParamGet('User parameter:BaseApp/Preferences/View')
        prefs.SetBool('ShowNaviCube',False)
        prefs.SetBool('ShowAxisCross',False)
        palette={'red':(1.,0.,0.),'green':(0.,1.,0.),'blue':(0.,0.,1.),'cyan':(0.,1.,1.),
                 'magenta':(1.,0.,1.),'gold':(1.,1.,0.)}
        data=json.loads(job.read_bytes())
        w,h,d=data['size']
        for i,rows in enumerate(data['panels'].values()):
            doc=App.newDocument('Stack')
            native.doc,native.cube_size=doc,1
            space=[[[0]*w for _ in range(h)] for _ in range(d)]
            cubes,colors={},{}
            for x in range(w):
                for y in range(h):
                    tile=doc.addObject('Part::Feature','Tile')
                    tile.Shape=native.Part.makePlane(1,1,App.Vector(x,y,0))
                    tile.ViewObject.ShapeColor=(.82,.82,.82)
            for x,y,z,color in rows:
                native.create_cube(x,y,z,space,cubes,colors,palette[color])
            for vector,color,label in [((w+1,0,0),(1.,0.,0.),'X'),((0,h+1,0),(0.,.65,0.),'Y'),((0,0,d+1),(0.,0.,1.),'Z')]:
                native.draw_axis(App.Vector(0,0,0),vector,color,label)
            doc.recompute()
            view=Gui.activeDocument().activeView()
            view.viewAxonometric()
            for _ in range(24):
                Gui.updateGui();time.sleep(.02)
            view.setCameraType('Orthographic')
            for side in range(2):
                if side:
                    # World-space yaw reveals faces on the opposite side of the stack.
                    turn=App.Rotation(App.Vector(0,0,1),180)
                    view.setCameraOrientation(turn.multiply(view.getCameraOrientation()))
                view.fitAll()
                for _ in range(20):
                    Gui.updateGui();time.sleep(.012)
                view.saveImage(str(job.parent/f'panel-{i}-{side}.png'),800,650,'White')
            App.closeDocument(doc.Name)
        (job.parent/'cad-version.txt').write_text(' '.join(App.Version()[:3]))
    except Exception:
        (job.parent/'cad-error.txt').write_text(traceback.format_exc())
    finally:
        for name in list(App.listDocuments()):
            App.closeDocument(name)
        QtCore.QTimer.singleShot(100,QtCore.QCoreApplication.quit)
