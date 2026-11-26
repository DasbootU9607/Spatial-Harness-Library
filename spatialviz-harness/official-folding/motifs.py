"""Original, reproducible square textures. Quarter turns are counterclockwise."""
from PIL import Image,ImageDraw
from functools import lru_cache
import numpy as np
COLORS={'red':(235,35,35),'green':(27,182,51),'blue':(38,64,229),'cyan':(22,196,204),'pink':(218,37,185),'yellow':(224,204,28)}
PIPS=['....k....','...k.k...','k.....k.k','k.k...k.k','k.k.k.k.k','k.kk.kk.k']
GRIDS=['rbg.gk..m','gk.rgm.b.','b.mg.kb.r','mk.b.rgkg','r.rbg..km','gmkk..mbr']
INK=dict(r='#cd2929',b='#2249c0',g='#17813a',k='#171717',m='#ad2386')
FAMILIES={'color':list(COLORS),'pips':['pip-'+str(i+1) for i in range(6)],
          'lines':['ring','diagonal','parallel','cross','fork','tee'],
          'mosaic':['grid-'+str(i+1) for i in range(6)]}

@lru_cache(None)
def tile(mark):
    if mark in COLORS:
        return Image.new('RGB',(201,201),COLORS[mark])
    im=Image.new('RGB',(201,201),'#aeb8c5')
    d=ImageDraw.Draw(im)
    d.rectangle((0,0,200,200),outline='#30363b',width=3)
    if mark.startswith(('pip-','grid-')):
        seq=(PIPS if mark.startswith('pip-') else GRIDS)[int(mark.split('-')[1])-1]
        for i,c in enumerate(seq):
            if c!='.':
                x,y=40+i%3*60,40+i//3*60
                d.ellipse((x-16,y-16,x+16,y+16),fill=INK[c])
    elif mark=='ring':
        d.ellipse((30,30,170,170),outline='black',width=9)
    else:
        strokes={'diagonal':[(18,18,182,182)],'parallel':[(65,18,65,182),(135,18,135,182)],
                 'cross':[(18,18,182,182),(18,182,182,18)],'fork':[(18,18,182,182),(100,100,182,18)],
                 'tee':[(32,52,168,52),(100,52,100,178)]}
        for x,y,a,b in strokes[mark]:
            for i in range(max(abs(a-x),abs(b-y))+1):
                t=i/max(abs(a-x),abs(b-y))
                cx,cy=round(x+(a-x)*t),round(y+(b-y)*t)
                d.ellipse((cx-4,cy-4,cx+4,cy+4),fill='black')
    return im

@lru_cache(None)
def period(mark):
    a=np.asarray(tile(mark))
    return next(k for k in (1,2,4) if np.array_equal(a,np.rot90(a,k)))

