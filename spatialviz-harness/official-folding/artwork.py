import base64,hashlib,io,textwrap
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
FONT=Path(__file__).resolve().parents[1]/'official-rotation/assets/DejaVuSans-Bold.ttf'

def record(im):
    b=io.BytesIO()
    im.convert('RGB').save(b,'PNG')
    data=b.getvalue()
    return dict(width=im.width,height=im.height,sha256=hashlib.sha256(data).hexdigest(),pngBase64=base64.b64encode(data).decode())

def decode(r):
    b=base64.b64decode(r['pngBase64'],validate=True)
    if hashlib.sha256(b).hexdigest()!=r['sha256']:
        raise ValueError('Wrong image digest')
    im=Image.open(io.BytesIO(b)).convert('RGB')
    if im.size!=(r['width'],r['height']):
        raise ValueError('Wrong image dimensions')
    return im

def footer(fig,question,options):
    w=max(fig.width,1150)
    lines=textwrap.wrap(question,max(35,w//16))
    words=['  '.join(o['label']+'. '+o['text'] for o in options if o['type']=='text')]
    lines+=words if words[0] else []
    out=Image.new('RGB',(w,fig.height+40+len(lines)*34),'white')
    out.paste(fig,((w-fig.width)//2,0))
    draw=ImageDraw.Draw(out)
    font=ImageFont.truetype(str(FONT),22)
    for i,line in enumerate(lines):
        draw.text((28,fig.height+i*34),line,font=font,fill='black')
    return out

