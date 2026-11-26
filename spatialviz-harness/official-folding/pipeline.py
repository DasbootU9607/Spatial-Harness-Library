"""Launch the official model builders and run the selected generate_data dispatch."""
import contextlib,json,os,random,shutil,subprocess,sys,tempfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
SHARED=HERE.parent/'official-rotation'
sys.path.append(str(SHARED))
from upstream import load
from runner import runtime
from motifs import COLORS,FAMILIES,tile

def launch(job,folder):
    short=Path(os.environ.get('SPATIALVIZ_TMP',folder))
    short.mkdir(exist_ok=True,parents=True)
    work=Path(tempfile.mkdtemp(prefix='fold-',dir=short))
    (folder/'workspace.txt').write_text(str(work))
    (work/'assets').mkdir()
    for mark in FAMILIES[job['family']]:
        for q in range(4):
            tile(mark).rotate(90*q).save(work/'assets'/f'{mark}-{q}.png')
    jobfile=work/'job.json'
    jobfile.write_text(json.dumps(dict(job,palette=COLORS)))
    macro=work/'fold.FCMacro'
    macro.write_text("import sys\nfrom PySide import QtCore\nsys.path[:0]=%r\nimport gui_job\nQtCore.QTimer.singleShot(1000,lambda:gui_job.run(%r))\n"%([str(HERE),str(SHARED)],str(jobfile)))
    exe,_=runtime()
    env=dict(os.environ,TEMP=str(work),TMP=str(work),PYTHONDONTWRITEBYTECODE='1')
    with (work/'gui.log').open('wb') as log:
        subprocess.run([exe,'--user-cfg',str(work/'user.cfg'),str(macro)],env=env,stdout=log,stderr=subprocess.STDOUT,
                       creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0),timeout=180)
    if not (work/'receipt.json').exists():
        err=work/'error.txt'
        raise RuntimeError(err.read_text() if err.exists() else 'Missing GUI receipt in '+str(work))
    return work

def compose(job,work):
    unfold=job['task']=='CubeUnfolding'
    color=job['family']=='color'
    raw=work/'raw'
    parent=work/'MentalFolding'/job['task']/'Authored'
    out=parent/'0'
    out.mkdir(parents=True)
    for f in raw.glob('*.png'):
        name=f.name
        if unfold and name=='cube.png':
            name='_'.join(job['cubes']['target'][k][0] for k in ('Front','Top','Right'))+'_cube.png'
        elif unfold:
            name='0_unfold_'+f.stem+(('_'+'-'.join(job['cubes']['target'][k][0] for k in ('Front','Left'))) if color and 'incorrect' in name else '')+'.png'
        elif not unfold and name=='target.png':
            name='0_unfold.png'
        shutil.copyfile(f,out/name)
    if not unfold and color:
        shutil.copyfile(raw/'0/info.json',out/'info.json')
    receipts=[]
    def module(file,patches,ns=None):
        mod,rec=load('create_freecad/'+file+'.py',ns,patches)
        sys.modules[file]=mod
        receipts.append(rec)
        return mod
    module('utils',[('img.resize((new_w, Image.LANCZOS))','img.resize((new_w,target_height), Image.LANCZOS)','Restore intended reference height'),
                    ('cv2.threshold(gray, 170','cv2.threshold(gray, 245','Include pale surfaces in tight crops')])
    patches=[('folder_path.split(os.sep)','os.path.normpath(folder_path).split(os.sep)','Windows path components'),
             ('ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)','ImageFont.truetype(FONT,font_size)','Use bundled font'),
             ('heights["C"], widths["D"]','heights["C"], heights["D"]','Use panel height for vertical bounds'),
             ("png_path.split(\'.\')[0]","os.path.splitext(png_path)[0]","Preserve dotted paths"),
             ('if random.choice([True, False]):','if BRANCH:','Expose question polarity or view/text branch'),
             ('num_rotated_incorrect = random.randint(1, 2)','num_rotated_incorrect = 1','Supply one independently constructed single-face turn'),
             ('random.choice([0,1])','1','Mirror horizontally, preserving upright isometric silhouettes'),
             ('"None of the above"','"All three other options are incorrect"','Use released fallback wording'),
             ('in os.listdir(folder_path)','in sorted(os.listdir(folder_path))','Stable seeded panel order'),
             ('if "incorrect" not in f and "unfold" not in f','if f.endswith(".png") and "incorrect" not in f and "unfold" not in f','Filter actual view files')]
    module('metal_folding_tasks_utils',patches,dict(FONT=str(SHARED/'assets/DejaVuSans-Bold.ttf'),BRANCH=job['mode'] in ('can','view')))
    dispatch='prepare_composite_image_'+job['task']+('' if color else 'Complex')
    actual=dispatch.replace('CubeReconstruction','ReconstructCube')
    changes=[('from '+name+' import *','# unrelated task','Isolate selected domain') for name in
             ['mental_rotation_tasks_utils','mental_animation_tasks_utils','visual_penetration_tasks_utils']]
    changes.extend([('save_folder = "path/to/save"','save_folder = FOLDER','Supply authored case folder'),
                    ('# '+dispatch+'(dir_path)',actual+'(dir_path)','Enable selected dispatch and resolve actual upstream function name')])
    random.seed(job['seed'])
    with (work/'compose.log').open('w') as log,contextlib.redirect_stdout(log):
        module('generate_data',changes,dict(FOLDER=str(parent)))
    return out,receipts

