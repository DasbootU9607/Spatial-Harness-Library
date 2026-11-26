"""Independently rectify the final panels and replay their labels and text."""
import json,sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from artwork import decode,footer,FONT
from answer import pixels,solve
from geometry import fold
from motifs import FAMILIES,COLORS
from generate import CONVENTION

def require(condition,message):
    if not condition:
        raise ValueError(message)

def appearance(a,color):
    a=a.astype(float)
    if color:
        rgb=np.median(a.reshape(-1,3),axis=0)
        require(np.ptp(rgb)>35,'Face has insufficient color saturation')
        return (rgb-rgb.min())/np.ptp(rgb)
    # Estimate the grey substrate independently on each face to cancel GUI lighting.
    grey=np.median(a.reshape(-1,3),axis=0)
    return np.clip(a/np.maximum(grey,1),0,1.8)

def recognize(im,quad,expected,family):
    quad=np.float32(quad)
    target=np.float32([(0,0),(100,0),(0,100)])
    a=cv2.warpAffine(im,cv2.getAffineTransform(quad,target),(101,101))[5:-5,5:-5]
    color=family=='color'
    actual=appearance(a,color)
    def template(mark,angle,mirror):
        arr=cv2.resize(pixels(mark,angle,mirror),(101,101),interpolation=cv2.INTER_AREA)[5:-5,5:-5]
        return appearance(arr,color)
    target=template(*expected)
    score=np.mean((actual-target)**2)
    alternatives=[]
    for mark in FAMILIES[family]:
        for angle in range(1 if color else 4):
            for mirror in ([''] if color else ['','side']):
                v=template(mark,angle,mirror)
                if not np.array_equal(target,v):
                    alternatives.append(float(np.mean((actual-v)**2)))
    require(score<(.055 if color else .035) and score+.001<min(alternatives),
            f'Face {expected}: rendered error {score:.4f}, nearest alternative {min(alternatives):.4f}')

def inspect_panel(im,structure,net,family):
    a=np.asarray(im.convert('RGB'))
    ys,xs=np.where(a.min(axis=2)<210)
    x,y=xs.min(),ys.min()
    w,h=xs.max()-x+1,ys.max()-y+1
    if net:
        frames=fold(structure)
        require({c['mark'] for c in structure}==set(FAMILIES[family]),'Expected six distinct family marks')
        for cell in structure:
            require(type(cell['turn'])==int and 0<=cell['turn']<4,'Invalid paper rotation')
            r,u,n=frames[tuple(cell['xy'])]
            require(cell['foldedFrame']==dict(right=list(r),up=list(u),outward=list(n)),'Folded frame differs')
        cols=max(c['xy'][0] for c in structure)+1
        rows=max(c['xy'][1] for c in structure)+1
        require(abs(w/cols-h/rows)<4,'Net grid aspect differs')
        cells={tuple(c['xy']):c for c in structure}
        for row in range(rows):
            for col in range(cols):
                left=x+w*col/cols
                top=y+h*(rows-1-row)/rows
                if (col,row) not in cells:
                    empty=a[int(top+4):int(top+h/rows-4),int(left+4):int(left+w/cols-4)]
                    require(empty.min()>235,'Unexpected printed cell')
                    continue
                c=cells[col,row]
                recognize(a,[(left,top),(left+w/cols,top),(left,top+h/rows)],(c['mark'],c['turn'],''),family)
    else:
        require(abs(w/h-.866)<.025,'Wrong isometric silhouette')
        quads=[[(.5,0),(1,.25),(0,.25)],[(0,.25),(.5,.5),(0,.75)],[(.5,.5),(1,.25),(.5,1)]]
        for face,quad in zip(structure,quads,strict=True):
            recognize(a,[(x+u*(w-1),y+v*(h-1)) for u,v in quad],face,family)

def replay(panels,refname):
    images=list(panels.values())
    im=images[0]
    height=images[1].height
    images[0]=im.resize((int(im.width*(height/im.height)),height),Image.Resampling.LANCZOS)
    w=sum(im.width for im in images)+70*(len(images)-1)+200
    fig=Image.new('RGB',(w,max(im.height for im in images)+260),'white')
    draw=ImageDraw.Draw(fig)
    font=ImageFont.truetype(str(FONT),60)
    x=100
    for label,im in zip([refname,*list(panels)[1:]],images):
        fig.paste(im,(x,160))
        box=draw.textbbox((0,0),label,font=font)
        draw.text((x+im.width//2-(box[2]-box[0])//2,90),label,font=font,fill='black')
        x+=im.width+70
    return fig

def audit(s):
    g=s['geometry']
    p=s['parameters']
    a=s['pipeline']['annotation']
    unfold=s['taskType']=='CubeUnfolding'
    text=p['mode']=='opposite'
    labels=['reference']+([] if text else list('ABC' if not unfold and p['family']=='color' else 'ABCD'))
    panels={k:decode(s['pipeline']['panels'][k]) for k in labels}
    require(s['question']==CONVENTION+' '+a['Question'],'Question differs from composed annotation')
    q=s['question'].lower()
    if unfold:
        require(('cannot form' if p['mode']=='cannot' else 'can form') in q,'Wrong question polarity')
    elif text:
        require('opposite the '+g['askedColor']+' face' in q,'Wrong opposite-face prompt')
    else:
        require('possible' in q and 'isometric' in q,'Wrong viewing prompt')
    require(a['Task']==s['taskType'] and a['Category']=='MentalFolding','Dispatch mismatch')
    values=a['Choices']
    require(len(values)==4 and len(set(values))==4,'Expected four distinct answers')
    fallback='All three other options are incorrect'
    if text:
        require(fallback in values and all(v==fallback or v.lower() in COLORS for v in values),'Unexpected text choices')
    else:
        require(values==(list('ABC')+[fallback] if len(labels)==4 else list('ABCD')),'Incorrect graphical options')
    require(s['options']==[dict(label=l,type='figure') if v==l else dict(label=l,type='text',text=v) for l,v in zip('ABCD',values)],'Choice order differs')
    if text:
        require(values.count(fallback)==1 and sum(v.lower() in COLORS for v in values)==3,'Invalid color fallback')
    require(solve(s)==s['answer'] and a['Answer']=='ABCD'[s['answer']['index']],'Folded answer differs from upstream')
    inspect_panel(panels['reference'],g['view'] if unfold else g['net'],not unfold,p['family'])
    signatures=set()
    for label,obj in zip(labels[1:],g.get('options',[]),strict=True):
        inspect_panel(panels[label],obj,unfold,p['family'])
        sig=(tuple(sorted((tuple(c['xy']),pixels(c['mark'],c['turn']).tobytes()) for c in obj)) if unfold else tuple(pixels(*v).tobytes() for v in obj))
        require(sig not in signatures,'Indistinguishable options')
        signatures.add(sig)
    fig=panels['reference'] if text else replay(panels,'Cube' if unfold else 'Cube Net')
    expected=footer(fig,s['question'],s['options'])
    require(np.array_equal(expected,decode(s['rendering']['image'])),'Final figure, labels or footer differ')
    return ['Hinge consistency, six normals, proper rotations and exact unique answer',
            'Published prompt, polarity, upstream answer and ordered figure/text options',
            'Rectified CAD faces, rotations, reflections, grid occupancy and visually distinct panels',
            'Pixel-exact labeled composition and complete question PNG']

if __name__=='__main__':
    spec,id,fp,out=sys.argv[1:]
    s=json.loads(Path(spec).read_text('utf8'))
    try:
        checks=[dict(name=n,verdict='passed') for n in audit(s)]
        verdict='passed'
    except Exception as e:
        verdict='failed'
        checks=[dict(name='Folding audit',verdict=verdict,detail=str(e))]
    report=dict(schemaVersion=1,candidateId=id,testedFingerprints=json.loads(Path(fp).read_text()),
                verifier=s['verifier'],checks=checks,verdict=verdict,scope='Exact exterior folding and rectified panel matching under the declared camera.')
    Path(out).write_text(json.dumps(report))
    print(json.dumps(checks))
    sys.exit(int(verdict!='passed'))

