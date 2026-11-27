"""Compose native viewport pixels and read the visible worksheet type directly from a PNG."""
import json
import string
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
FONT=HERE.parent/'assets/type/DejaVuSansMono.ttf'
W=1160
X=38
START=530
ROW=27
CELL=11
INK=(28,48,58)
ACCENT=(20,100,96)
PAPER=(255,255,255)

def font(size):return ImageFont.truetype(str(FONT),size)
def glyph(char):
    image=Image.new('RGB',(CELL,ROW),PAPER)
    ImageDraw.Draw(image).text((0,1),char,font=font(18),fill=INK)
    return image
GLYPHS={c:glyph(c) for c in string.ascii_letters+string.digits+" .,:;/-()"}
def line(image,y,s):
    if X+len(s)*CELL>W-24:raise ValueError('Printed line exceeds worksheet width')
    for i,c in enumerate(s):image.paste(GLYPHS[c],(X+i*CELL,y))
def tag(draw,xy,name):
    x,y=xy;f=font(16);w=draw.textlength(name,font=f)+10
    draw.rounded_rectangle((x-w/2,y-11,x+w/2,y+11),4,fill=(252,251,247),outline=INK,width=1)
    draw.text((x,y),name,font=f,fill=INK,anchor='mm',stroke_width=0)
def screenshot(panel,folder,name,frame,marks):
    img=Image.open(folder/name).convert('RGBA')
    bounds=img.getchannel('A').getbbox()
    if not bounds or bounds[0]<=0 or bounds[1]<=0 or bounds[2]>=img.width or bounds[3]>=img.height:
        raise ValueError('Empty or clipped FreeCAD viewport '+name)
    x,y,w,h=frame;source=img.crop(bounds)
    ratio=min(w/source.width,h/source.height);size=(round(source.width*ratio),round(source.height*ratio))
    rendered=source.resize(size,Image.Resampling.LANCZOS)
    ox=x+(w-size[0])//2;oy=y+(h-size[1])//2
    panel.paste(rendered,(ox,oy),rendered)
    centers=[]
    for n in marks:
        a=np.asarray(Image.open(folder/('marker-'+n+'.png')).convert('RGB')).astype(float)
        mask=(a[:,:,0]>1.8*a[:,:,1])&(a[:,:,2]>1.8*a[:,:,1])&(a[:,:,0]>80)
        yy,xx=np.where(mask)
        if len(xx)<4:raise ValueError('Unresolved native anchor for '+n)
        px=ox+(float(np.median(xx))-bounds[0])*ratio;py=oy+(float(np.median(yy))-bounds[1])*ratio
        if any(abs(px-cx)<26 and abs(py-cy)<23 for cx,cy in centers):
            raise ValueError('Component labels overlap in the front view')
        centers.append((px,py));tag(ImageDraw.Draw(panel),(px,py),n)

def compose(folder):
    q=json.loads((folder/'worksheet.json').read_text('utf8'));report=json.loads((folder/'geometry.json').read_text('utf8'))
    facts=report['facts'];H=START+(2+len(facts))*ROW+37+4*ROW+24
    panel=Image.new('RGB',(W,H),PAPER);d=ImageDraw.Draw(panel)
    d.text((X,17),'MECHANICAL SYSTEM  /  FREECAD LABORATORY',fill=ACCENT,font=font(16))
    title=q['title'];size=min(30,int(1750/max(1,len(title))))
    d.text((X,44),title,font=font(size),fill=INK,stroke_width=1,stroke_fill=INK)
    d.text((X,100),'ASSEMBLY',fill=ACCENT,font=font(15));d.text((657,100),'FRONT  /  ALL DIRECTIONS READ HERE',fill=ACCENT,font=font(15))
    d.rounded_rectangle((24,133,632,481),8,fill=(239,244,243))
    d.rounded_rectangle((643,133,W-24,481),8,fill=(242,244,245))
    screenshot(panel,folder,'assembly-view.png',(40,151,576,312),[])
    screenshot(panel,folder,'front-view.png',(660,151,460,312),q['members'])
    d.text((X,499),'OBSERVATION AND WORKING CONNECTIONS',font=font(16),fill=ACCENT)
    rows=[q['drive'],q['ask'],*facts]
    for i,text in enumerate(rows):line(panel,START+i*ROW,text)
    y=START+len(rows)*ROW;d.line((X,y+3,W-X,y+3),fill=(172,196,194),width=1)
    d.text((X,y+10),'CHOOSE ONE',font=font(15),fill=ACCENT)
    for i,opt in enumerate(q['options']):line(panel,y+37+i*ROW,opt['label']+'  '+opt['text'])
    panel.save(folder/'plate.png')

def read_pixels(file):
    im=Image.open(file).convert('RGB')
    n,rem=divmod(im.height-START-37-4*ROW-24,ROW)
    if im.width!=W or rem or n<3:raise ValueError('Unknown worksheet geometry')
    atlas={i.tobytes():c for c,i in GLYPHS.items()}
    def row(y):
        chars=[]
        for x in range(X,W-24-CELL+1,CELL):
            cell=im.crop((x,y,x+CELL,y+ROW)).tobytes()
            if cell not in atlas:raise ValueError(f'Unrecognized printed glyph at {x},{y}')
            chars.append(atlas[cell])
        return ''.join(chars).rstrip()
    lines=[row(START+i*ROW) for i in range(n)]
    return {'drive':lines[0],'ask':lines[1],'facts':lines[2:],'options':[row(START+n*ROW+37+i*ROW) for i in range(4)]}

if __name__=='__main__':
    if sys.argv[1]=='compose':compose(Path(sys.argv[2]))
    elif sys.argv[1]=='read':print(json.dumps(read_pixels(sys.argv[2])))
    else:raise ValueError('Use compose DIRECTORY or read final.png')
