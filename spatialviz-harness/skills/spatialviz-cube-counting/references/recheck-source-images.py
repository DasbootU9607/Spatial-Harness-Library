"""Decode released projection cells from original PNGs, then enumerate supported height maps."""
import hashlib, itertools, json, re
from collections import Counter, defaultdict
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--library',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
ROOT=args.library
REF=args.output
SITE='https://dasbootu9607.github.io/Spatial-Harness-Library/questions/'
REF.mkdir(parents=True,exist_ok=True)
FONT=ImageFont.truetype(str(ROOT/'spatialviz-harness/official-rotation/assets/DejaVuSans-Bold.ttf'),15)

def read_panels(path,count):
    gray=cv2.imread(str(path),cv2.IMREAD_GRAYSCALE)
    # All official labels end above y=160; detect every enclosed unit square at native resolution.
    ink=np.uint8(gray[160:] < 128)
    occupied=np.flatnonzero(ink.any(axis=0))
    strips=np.split(occupied,np.where(np.diff(occupied)>1)[0]+1)
    assert len(strips)==count,(path,len(strips))
    grids=[]
    for span in strips:
        sub=ink[:,span[0]:span[-1]+1]
        ys=np.flatnonzero(sub.any(axis=1))
        sub=sub[ys[0]:ys[-1]+1]
        inverse=np.pad(1-sub,2,constant_values=1)
        _,pixels,stats,_=cv2.connectedComponentsWithStats(inverse)
        outside=pixels[0,0]
        cells=[tuple(map(int,s[:4])) for i,s in enumerate(stats) if i not in (0,outside) and s[4]>100]
        assert cells
        side=np.median([w for x,y,w,h in cells])
        widths=round(sub.shape[1]/side); heights=round(sub.shape[0]/side)
        grid=[[0]*widths for _ in range(heights)]
        for x,y,w,h in cells:
            assert max(w/h,h/w)<1.13 and abs(w-side)<5,(path,x,y,w,h,side)
            r=int((y+h/2-2)*heights/sub.shape[0]); c=int((x+w/2-2)*widths/sub.shape[1])
            assert not grid[r][c]
            grid[r][c]=1
        grids.append(grid)
    return grids

def solve(front,top,left):
    # Retain a witness for each (columns already reaching front, total); row maxima are enforced immediately.
    states={(0,0):[]}
    for y,foot in enumerate(top):
        cap=left[y] if left else max(front)
        choices=itertools.product(*(range(1,1+min(cap,front[x])) if on else (0,) for x,on in enumerate(foot)))
        steps=[]
        for row in choices:
            if left and max(row)!=cap:continue
            bits=sum(1<<x for x,h in enumerate(row) if h==front[x])
            steps.append((bits,sum(row),row))
        after={}
        for (old,amount),partial in states.items():
            for bits,n,row in steps:
                after.setdefault((old|bits,amount+n),partial+[row])
        states=after
    return dict(sorted((n,rows) for (bits,n),rows in states.items() if bits==(1<<len(front))-1))

def argmode(q):
    return 'minimum' if 'minimum' in q else 'maximum' if 'maximum' in q else 'possible'
def ps(grid):
    return [''.join(map(str,row)) for row in grid]
def seq(p):
    return tuple(map(sum,zip(*p)))

all_rows=json.loads((ROOT/'questions/data/spatialviz.json').read_text(encoding='utf8'))
rows=[r for r in all_rows if r['sourceId'].startswith('VisualPenetration/CubeCounting/')]
audit=[]
for i,r in enumerate(rows):
    mode=argmode(r['question']); count=3 if 'three views' in r['question'] else 2
    path=ROOT/'questions'/r['image']
    panels=read_panels(path,count)
    front,top=seq(panels[0]),panels[1]
    left=seq(panels[2]) if count==3 else None
    for grid in (panels[0],panels[2] if left else []):
        assert all(list(col)==sorted(col) for col in zip(*grid))
    assert len(front)==len(top[0]) and (left is None or len(left)==len(top))
    witness=solve(front,top,left)
    assert witness,(r['sourceId'],front,top,left)
    low=min(witness); high=max(witness)
    target={'minimum':{low},'maximum':{high},'possible':set(witness)}[mode]
    valid=['ABCD'[j] for j,v in enumerate(r['options']) if v.isdigit() and int(v) in target]
    if not valid:valid=['ABCD'[j] for j,v in enumerate(r['options']) if not v.isdigit()]
    label=r['answer']; expected=r['options'][r['answerIndex']]
    competing=[('ABCD'[j],v) for j,v in enumerate(r['options']) if j!=r['answerIndex'] and v.isdigit()]
    alt=next(((letter,v) for letter,v in competing if letter in valid),None)
    if alt is None:alt=min(competing,key=lambda pair:min(abs(int(pair[1])-n) for n in target))
    letter,v=alt; num=int(v)
    if letter in valid: foil=f'{letter} ({v}) also satisfies the displayed constraints. Its height map is in the witnesses.'
    elif num in witness: foil=f'{letter} ({v}) can be built but misses the {mode} of {min(target) if mode=="minimum" else max(target)}.'
    elif num<low:foil=f'{letter} ({v}) is {low-num} below the smallest supported pile matching all printed panels.'
    else:foil=f'{letter} ({v}) exceeds the largest compatible pile by {num-high}.'
    rep=sorted(witness) if high-low<2 else [low,high]
    keep=set(rep)|{int(v) for v in r['options'] if v.isdigit() and int(v) in witness}
    official_range=list(map(int,re.findall(r'\d+',r['explanation'])))
    item=dict(sourceId=r['sourceId'],level=r['level'],originalImage=SITE+r['image'],mediaField=r['image'],
        originalImageSha256=hashlib.sha256(path.read_bytes()).hexdigest(),question=r['question'],options=r['options'],
        officialAnswer=label,officialExplanation=r['explanation'],ask=mode,displayedViews=count,
        given=dict(frontHeights=front,topBitmap=ps(top),leftHeights=left),
        decisiveClue=f'Top fixes {sum(map(sum,top))} occupied bases with bitmap {"/".join(ps(top))}; Front requires peaks {list(front)}'+(f' and Left requires {list(left)} in the matching top rows.' if left else '.'),
        feasibleTotals=list(witness),witnesses={n:witness[n] for n in sorted(keep)},qualifyingOptions=valid,
        plausibleAlternative=foil,keyAgrees=(valid==[label]),officialBoundsAgree=(official_range==[low,high]))
    suffix=r['sourceId'].split('/')[-2:]
    image_copy=Path('originals')/suffix[0]/(suffix[1]+'.png')
    (REF/image_copy).parent.mkdir(parents=True,exist_ok=True)
    (REF/image_copy).write_bytes(path.read_bytes())
    item['packagedOriginal']=image_copy.as_posix()
    audit.append(item)
    if i%10==0:
        sheet=Image.new('RGB',(960,1050),'white');draw=ImageDraw.Draw(sheet)
    x=i%2*480; y=(i%10//2)*210
    im=Image.open(path);im.thumbnail((478,178),Image.Resampling.LANCZOS)
    sheet.paste(im,(x+(480-im.width)//2,y+22))
    draw.text((x+10,y+4),r['sourceId'].split('/')[-2]+'/'+r['sourceId'].split('/')[-1]+'   '+mode,font=FONT,fill='#273a43')
    if i%10==9:sheet.save(REF/('panels-%02d.png'%(i//10+1)))
(REF/'official-cases.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8')
print('audited',len(audit),'key mismatches',[(i['sourceId'],i['officialAnswer'],i['qualifyingOptions']) for i in audit if not i['keyAgrees']])
print('interval discrepancies',[(i['sourceId'],i['feasibleTotals'],i['officialExplanation']) for i in audit if not i['officialBoundsAgree']])
