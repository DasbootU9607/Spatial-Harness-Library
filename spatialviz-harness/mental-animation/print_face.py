"""Print diagrams and an exact coordinate key for the same visible states on one problem sheet."""
import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path
from types import SimpleNamespace
from PIL import Image,ImageDraw,ImageFont,ImageChops
HERE=Path(__file__).resolve().parent
FONT=HERE.parent/'official-rotation/assets/DejaVuSans-Bold.ttf'

def prompt(f):
    size=' x '.join(map(str,f['size']))
    if len(f['size'])==3:
        rules=f'Use the {size} board. Each pair shows the same stack from opposite sides. Coordinates (x,y,z) follow the axes, starting at zero. Move the cube at the named current cell one unit. An occupied target swaps with the mover. An empty elevated target needs support immediately before the move. After each step, settle every column downward, preserving its order. Equal colors are interchangeable.'
    else:
        rules=f'Use the {size} grid with x increasing right and y up. Read each command relative to the current heading. Move the stated distance and face the direction traveled. Stay inside the grid.'
        if f['mode'].startswith('fleet'):
            rules+=' Select the arrow at the named current cell. Only the landing cell matters. An occupant swaps back to the source and faces its own displacement.'
        if f['mode']=='single':
            rules+=' Red marks the start and green marks the finish of one arrow.'
    queries={'single':'Which path reaches the displayed final position and heading?',
             'fleet-path':'Which path produces the entire final grid?',
             'flat':'Which sequence produces the entire final arrangement?',
             'stack':'Which sequence produces the entire final stack?',
             'fleet-state':'Execute '+f['given']+'. Which panel shows the result?',
             'checkpoint':'Which sequence matches both the panel after step 1 and the final panel?',
             'predecessor':'Execute '+f['given']+'. Which starting panel yields the displayed final state?',
             'missing':'The first instruction is missing. Then execute '+f['given']+'. Which first instruction completes the sequence?'}
    return rules+' '+queries[f['mode']]


def native_pictures(f,work):
    if len(f['size'])==3:
        from design import NATIVE
        sys.path.insert(0,str(HERE.parent/'official-rotation'))
        from runner import runtime
        exe,_=runtime()
        job=work/'scene.json'
        job.write_text(json.dumps(f))
        macro=work/'scene.FCMacro'
        macro.write_text("import sys\nfrom PySide import QtCore\nsys.path.insert(0,%r)\nfrom cad_scene import capture\nQtCore.QTimer.singleShot(800,lambda:capture(%r,%r))\n"%(str(HERE),str(job),str(NATIVE)))
        with (work/'cad.log').open('wb') as log:
            subprocess.run([exe,'--user-cfg',str(work/'user.cfg'),str(macro)],stdout=log,stderr=log,
                           timeout=120,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        if not (work/'cad-version.txt').exists():
            err=work/'cad-error.txt'
            raise RuntimeError(err.read_text() if err.exists() else 'See cad.log')
        result=[]
        for i,name in enumerate(f['panels']):
            views=[]
            for side in range(2):
                im=Image.open(work/f'panel-{i}-{side}.png').convert('RGB')
                box=ImageChops.difference(im,Image.new('RGB',im.size,'white')).getbbox()
                if not box:raise ValueError('Empty CAD view')
                views.append(im.crop(box))
            joined=Image.new('RGB',(sum(im.width for im in views)+30,max(im.height for im in views)),'white')
            joined.paste(views[0]);joined.paste(views[1],(views[0].width+30,0))
            result.append((name,joined))
        return result
    from design import fleet,matrix,DIRECTIONS
    import create_arrow_moving as solo
    size=f['size']
    if f['mode']=='single':
        a,b=(rows[0] for rows in f['panels'].values())
        obj=SimpleNamespace(x=size[0],y=size[1],positions=[a[:2],b[:2]],orientations=[DIRECTIONS.index(a[3]),DIRECTIONS.index(b[3])],directions=[(0,1),(1,0),(0,-1),(-1,0)])
        p=work/'overlay.png'
        solo.plot_arrow_path(obj,str(p))
        return [('Start and finish',Image.open(p).convert('RGB'))]
    result=[]
    for i,(name,board) in enumerate(f['panels'].items()):
        obj=SimpleNamespace(x=size[0],y=size[1],directions=[(0,1),(1,0),(0,-1),(-1,0)])
        p=work/f'panel-{i}.png'
        fleet.plot_map(obj,matrix(board,size),str(p),'')
        result.append((name,Image.open(p).convert('RGB')))
    return result


def diagram(f,work):
    pics=native_pictures(f,work)
    block=len(f['size'])==3
    cols=1 if block else min(3,len(pics))
    width=1200
    cellw=width//cols
    cellh=320 if block else 315
    rows=(len(pics)+cols-1)//cols
    canvas=Image.new('RGB',(width,rows*cellh),'white')
    draw=ImageDraw.Draw(canvas)
    for i,(name,pic) in enumerate(pics):
        x=i%cols*cellw;y=i//cols*cellh
        draw.text((x+cellw//2,y+5),name,font=ImageFont.truetype(str(FONT),22),anchor='mt',fill='black')
        pic.thumbnail((cellw-36,cellh-42),Image.Resampling.LANCZOS)
        canvas.paste(pic,(x+(cellw-pic.width)//2,y+35))
    return canvas


def sheet(f,diagram):
    block=len(f['size'])==3
    labels=['Block Movement' if block else 'Arrow Movement',prompt(f)]
    for name,board in f['panels'].items():
        tokens=[]
        for row in board:
            coord=','.join(map(str,row[:3 if block else 2]))
            val=' '.join(row[3 if block else 2:]) if f['mode']!='single' else ('red' if name=='Initial' else 'green')+' '+row[-1]
            tokens.append('('+coord+') '+val)
        labels.append(name+'   '+'   |   '.join(tokens))
    if f['choices']!=list('ABCD'):
        labels+=['%s.  %s'%(l,v) for l,v in zip('ABCD',f['choices'])]
    font=ImageFont.truetype(str(FONT),19)
    lines=[]
    for entry in labels:
        line=''
        for word in entry.split():
            extended=(line+' '+word).strip()
            if line and font.getlength(extended)>1140:
                lines.append(line);line=word
            else:line=extended
        lines.append(line);lines.append('')
    y=diagram.height+12
    out=Image.new('RGB',(1200,y+27*len(lines)+12),'white')
    out.paste(diagram);draw=ImageDraw.Draw(out)
    for line in lines:
        draw.text((28,y),line,fill='#182331',font=font)
        y+=27
    return out
