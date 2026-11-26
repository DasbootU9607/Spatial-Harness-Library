"""Runs in the FreeCAD GUI Python interpreter."""
import json, random, time, traceback
from pathlib import Path
import FreeCAD as App
import FreeCADGui as Gui
from PySide import QtCore
from upstream import load
from geometry import FRAMES,fold

def run(job_file):
    folder=Path(job_file).parent
    job=json.loads(Path(job_file).read_text())
    unfold=job['task']=='CubeUnfolding'
    color=job['family']=='color'
    target=folder/'raw'
    target.mkdir()
    active={}
    def capture(view,doc):
        doc.recompute()
        if active['net']:
            view.viewTop()
        else:
            view.viewIsometric()
        for _ in range(40):
            Gui.updateGui()
            time.sleep(.02)
        view.setCameraType('Orthographic')
        view.fitAll()
        view.zoomOut()
        Gui.updateGui()
        file=target/active['file']
        view.saveImage(str(file),640,640,'White')
        doc.saveAs(str(file.with_suffix('.FCStd')))
    try:
        Gui.getMainWindow().setAttribute(QtCore.Qt.WA_DontShowOnScreen,True)
        Gui.getMainWindow().show()
        Gui.activateWorkbench('PartWorkbench')
        prefs=App.ParamGet('User parameter:BaseApp/Preferences/View')
        prefs.SetBool('ShowNaviCube',False)
        prefs.SetBool('ShowCoordinateSystem',False)
        prefs.SetBool('CornerCoordSystem',False)
        prefs.SetBool('ShowAxisCross',False)
        random.seed(job['seed'])
        fname=('create_cube_unfolding' if color else 'create_cube_unfold_complex') if unfold else ('create_cube_reconstruction'+('' if color else '_complex'))
        patches=[('view.saveImage(image_path, 1280, 1024)','capture(view,doc)','Set the specified orthographic camera, save white-background PNG and archive the FreeCAD document')]
        if not unfold:
            patches.append(('for view_name, direction in views.items():' if color else 'for view_name in views_selected:',
                            'for view_name, direction in list(views.items())[:1]:' if color else 'for view_name in views_selected[:1]:',
                            'Render one supplied solid pose per panel instead of random additional cameras'))
        m,receipt=load('create_freecad/create_mental_folding/'+fname+'.py',dict(App=App,FreeCADGui=Gui,capture=capture),patches)
        m.cube_size=10
        m.save_folder=str(target)
        m.views={'Front_Top_Right':(1,-1,1)}
        palette={k:tuple(c/255 for c in rgb) for k,rgb in job['palette'].items()}
        m.color_value=palette
        textures={p.stem:str(p) for p in (folder/'assets').glob('*.png')}
        m.image_paths=textures
        for key,cells in job['nets'].items():
            w=max(c['xy'][0] for c in cells)+1
            h=max(c['xy'][1] for c in cells)+1
            matrix=[[0]*w for _ in range(h)]
            faces={}
            colors={}
            marks={}
            names={}
            frames=fold(cells)
            for c in cells:
                x,y=c['xy']
                mark=c['mark']
                k=next(k for k,f in FRAMES.items() if f[2]==frames[x,y][2])
                faces[k]=(h-1-y,x)
                matrix[h-1-y][x]=1
                colors[k]=palette.get(mark)
                names[k]=mark
                marks[k]=mark+'-'+str(c['turn'])
            active.update(net=True,file=key+'.png')
            if color and unfold:
                m.create_squares(matrix,faces,names,str(target),save_name='0')
            elif color:
                m.create_squares(matrix,faces,colors,str(target),'0')
                (target/'0').mkdir()
                m.save_json(matrix,faces,{k:[v] for k,v in names.items()},str(target),'0')
            elif unfold:
                m.create_squares(matrix,faces,marks,'planes_1_4_1_0',save_name='0')
            else:
                m.create_squares(matrix,faces,textures,marks,save_folder=str(target),save_name='0')
            for name in list(App.listDocuments()):
                App.closeDocument(name)
        for key,cube in job['cubes'].items():
            active.update(net=False,file=('cube' if unfold else key)+'.png')
            if color:
                names={k:v[0] for k,v in cube.items()}
                m.make_colored_cube(names if unfold else {k:palette[v] for k,v in names.items()},str(target),'0')
            else:
                info={}
                for k,(r,u,n) in FRAMES.items():
                    center=App.Vector(*(5+5*c for c in n))
                    rot=App.Rotation(App.Vector(*r),App.Vector(*u),App.Vector(*n),'ZXY')
                    info[k]=App.Placement(center,rot)
                m.info={'cube':{'planes_info':info}}
                marks={k:v[0]+'-'+str(v[1]) for k,v in cube.items()}
                if unfold:
                    m.make_cube_wi_images(marks,'cube','Front_Top_Right','0')
                else:
                    m.make_cube_wi_images(marks,'cube',m.info,textures,str(target),'0',10)
            for name in list(App.listDocuments()):
                App.closeDocument(name)
        (folder/'receipt.json').write_text(json.dumps(dict(freecadVersion=App.Version(),source=receipt)))
    except Exception:
        (folder/'error.txt').write_text(traceback.format_exc())
    finally:
        for name in list(App.listDocuments()):
            App.closeDocument(name)
        QtCore.QTimer.singleShot(100,QtCore.QCoreApplication.quit)

