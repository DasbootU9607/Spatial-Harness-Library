"""Run an isolated FreeCAD GUI process and require a fresh native result."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

HERE=Path(__file__).resolve().parent

def find_freecad():
    requested=os.environ.get('SPATIALVIZ_FREECAD')
    if not requested:
        config=Path.cwd()/'.harness/freecad-official/runtime.json'
        if config.is_file():requested=json.loads(config.read_text('utf-8-sig'))['freecad']
    exe=shutil.which(requested or 'freecad') or (requested if requested and Path(requested).is_file() else None)
    if not exe:raise RuntimeError('FreeCAD GUI executable required. Set SPATIALVIZ_FREECAD to its path.')
    return exe

def launch(folder,model=None):
    exe=find_freecad()
    if any((folder/n).exists() for n in ['assembly.FCStd','capture.json','cad-error.txt']):
        raise RuntimeError('Each FreeCAD build requires a fresh native output directory')
    macro=folder/'assemble.FCMacro'
    invocation=('cad_job.recheck(%r,%r)'%(str(folder),str(model))) if model else ('cad_job.run(%r)'%str(folder))
    macro.write_text("import sys\nfrom PySide import QtCore\nsys.path.insert(0, %r)\nimport cad_job\nQtCore.QTimer.singleShot(150, lambda:%s)\n"%(str(HERE),invocation),encoding='utf8')
    env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1',TMP=str(folder),TEMP=str(folder))
    args=[str(exe),'--user-cfg',str(folder/'user.cfg'),str(macro)]
    with (folder/'freecad.log').open('wb') as log:
        result=subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,env=env,timeout=300,
                              creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    error=folder/'cad-error.txt'
    if error.exists():raise RuntimeError(error.read_text(encoding='utf8'))
    if result.returncode or not (folder/('native-verification.json' if model else 'capture.json')).is_file():raise RuntimeError('Missing native FreeCAD capture. Inspect '+str(folder/'freecad.log'))

if __name__=='__main__':launch(Path(sys.argv[1]).resolve(),Path(sys.argv[2]).resolve() if len(sys.argv)>2 else None)
