"""Numerical visible-face projections and independent replay of the published layout."""
from itertools import product
from pathlib import Path
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SHARED=Path(__file__).resolve().parents[1]/"official-rotation"
sys.path.append(str(SHARED))
from image_audit import decode, crop_box

N=320
BASES={
    "Front": [[1,0,0],[0,0,1],[0,-1,0]], "Left":[[0,-1,0],[0,0,1],[-1,0,0]],
    "Top":[[1,0,0],[0,1,0],[0,0,1]], "Right":[[0,1,0],[0,0,1],[1,0,0]],
    "Isometric": [[2**-.5,2**-.5,0],[-6**-.5,6**-.5,2*6**-.5],[3**-.5,-3**-.5,3**-.5]]}


def normalized(mask):
    y,x=np.where(mask)
    if not len(x):
        raise ValueError("Blank panel")
    raw=mask[y.min():y.max()+1,x.min():x.max()+1].astype(np.uint8)
    scale=(N-12)/max(raw.shape)
    h,w=[max(1,round(s*scale)) for s in raw.shape]
    small=cv2.resize(raw.astype(np.float32),(w,h),interpolation=cv2.INTER_AREA)>.09
    out=np.zeros((N,N),np.uint8)
    i,j=(N-h)//2,(N-w)//2
    out[i:i+h,j:j+w]=small
    return out


def face_map(faces,view):
    basis=np.asarray(BASES[view])
    projected=[np.asarray(f["vertices"])@basis.T for f in faces]
    lo=np.concatenate(projected).min(0)
    hi=np.concatenate(projected).max(0)
    scale=(N-14)/max((hi-lo)[:2])
    depths=np.full((N,N),-np.inf)
    ids=np.zeros((N,N),np.int32)
    for idx,(face,points) in enumerate(zip(faces,projected),1):
        v=points.copy()
        v[:,0]=(points[:,0]-(hi[0]+lo[0])/2)*scale+N/2
        v[:,1]=((hi[1]+lo[1])/2-points[:,1])*scale+N/2
        for tri in face["triangles"]:
            a,b,c=v[tri]
            normal=np.cross(b-a,c-a)
            if abs(normal[2])<1e-8:
                continue
            x0,y0=np.floor(np.minimum.reduce([a,b,c])[:2]).astype(int)
            x1,y1=np.ceil(np.maximum.reduce([a,b,c])[:2]).astype(int)+1
            yy,xx=np.mgrid[y0:y1,x0:x1]
            dx,dy=xx+.5-a[0],yy+.5-a[1]
            s=(dx*(c[1]-a[1])-dy*(c[0]-a[0]))/normal[2]
            t=(dy*(b[0]-a[0])-dx*(b[1]-a[1]))/normal[2]
            z=a[2]+s*(b[2]-a[2])+t*(c[2]-a[2])
            sub=depths[y0:y1,x0:x1]
            take=(s>=-1e-8)&(t>=-1e-8)&(s+t<=1+1e-8)&(z>sub)
            sub[take]=z[take]
            ids[y0:y1,x0:x1][take]=idx
    return ids


def boundary(ids):
    return normalized((ids!=np.roll(ids,1,axis=0))|(ids!=np.roll(ids,1,axis=1)))


def distance(a,b):
    d=cv2.distanceTransform(1-b.astype(np.uint8),cv2.DIST_L2,5)
    return float(d[a.astype(bool)].max())


def difference(a,b):
    return max(distance(a,b),distance(b,a))


def ink(image,iso=False):
    rgb=np.asarray(image.convert("RGB"))
    return normalized(rgb.max(2)<(75 if iso else 150))


def cube_faces(model):
    faces=[]
    for x,y,z,color in model:
        for axis in range(3):
            other=[i for i in range(3) if i!=axis]
            for side in (0,1):
                vertices=[]
                for a,b in ((0,0),(0,1),(1,1),(1,0)):
                    v=[x,y,z]
                    v[axis]+=side
                    v[other[0]]+=a
                    v[other[1]]+=b
                    vertices.append(v)
                faces.append(dict(vertices=vertices,triangles=[[0,1,2],[0,2,3]],color=color))
    return faces


def cube_pixels(model,view,image):
    faces=cube_faces(model)
    ids=face_map(faces,view)
    actual=np.asarray(image.convert("RGB"))
    mask=actual.min(2)<215
    assert not (mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any()), "Clipped cube image"
    assert difference(boundary(ids),ink(image))<4.5, "Missing or incorrect projected cube edges: "+view
    y,x=np.where(mask)
    rgb=actual[min(y):max(y)+1,min(x):max(x)+1]
    yy,xx=np.where(ids>0)
    grid=ids[min(yy):max(yy)+1,min(xx):max(xx)+1]
    rgb=cv2.resize(rgb,(grid.shape[1],grid.shape[0]),interpolation=cv2.INTER_AREA).astype(int)
    kernel=np.ones((7,7),np.uint8)
    interior=(grid>0)&(cv2.dilate(grid.astype(np.float32),kernel)==cv2.erode(grid.astype(np.float32),kernel,borderType=cv2.BORDER_CONSTANT,borderValue=0))
    color=np.array([False]+[f["color"]=="R" for f in faces])[grid]
    red=(rgb[:,:,0]>235)&(rgb[:,:,1]<20)&(rgb[:,:,2]<20)
    gray=np.max(np.abs(rgb-[174,181,189]),axis=2)<=10
    for selection,match in ((interior&color,red),(interior&~color,gray)):
        if selection.any():
            assert match[selection].mean()>.99, "Rendered color differs in "+view
    return True


def composition(views,upper,lower):
    panels={k:decode(v["image"]) for k,v in views.items()}
    if len(upper)==2:
        im=panels[upper[1]]
        h=panels["Isometric"].height
        panels[upper[1]]=im.resize((int(im.width*(h/im.height)),h),Image.Resampling.LANCZOS)
    widths=[sum(panels[k].width for k in row)+70*(len(row)-1) for row in (upper,lower)]
    heights=[max(panels[k].height for k in row) for row in (upper,lower)]
    canvas=Image.new("RGB",(max(widths)+200,sum(heights)+420),"white")
    draw=ImageDraw.Draw(canvas)
    font=ImageFont.truetype(str(SHARED/"assets/DejaVuSans-Bold.ttf"),60)
    for row,width,y in zip((upper,lower),widths,(160,320+heights[0])):
        x=(canvas.width-width)//2
        for k in row:
            im=panels[k]
            canvas.paste(im,(x,y))
            box=draw.textbbox((0,0),k,font=font)
            draw.text((x+im.width//2-(box[2]-box[0])//2,y-70),k,font=font,fill="black")
            x+=im.width+70
    return canvas
