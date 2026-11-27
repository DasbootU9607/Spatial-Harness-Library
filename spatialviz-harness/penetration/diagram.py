"""Shared deterministic paper layout. Coordinates increase rightward and upward in section space."""
from math import sin, cos, radians
from PIL import Image, ImageDraw, ImageFont

INK = "#183143"
MUTED = "#465d68"
FILL = "#c2dce0"
RULE = "#b9cbce"
W, H = 1240, 740


def font(size):
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        return ImageFont.load_default(size=size)


def label(d, xy, words, size=22, color=INK, anchor="la"):
    d.text(xy, words, font=font(size), fill=color, anchor=anchor)


def paper(title, lines):
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    label(d, (36, 19), title, 33)
    for i, line in enumerate(lines):
        label(d, (36, 73+i*26), line, 19, MUTED)
    d.line((36, 139, W-36, 139), fill=RULE, width=2)
    return im, d


def fit(points, box, cap=100):
    xs, ys = zip(*points)
    l, t, r, b = box
    scale = min((r-l)/max(.01,max(xs)-min(xs)), (b-t)/max(.01,max(ys)-min(ys)), cap)
    mx, my = (max(xs)+min(xs))/2, (max(ys)+min(ys))/2
    return lambda p: ((l+r)/2+(p[0]-mx)*scale, (t+b)/2-(p[1]-my)*scale)


def project(point, yaw):
    x,y,z=point
    c,s=cos(radians(yaw)),sin(radians(yaw))
    return (c*x+s*y, z*.87+(-s*x+c*y)*.49)


def draw_solid(d, faces, box, yaw=32, overlay=None):
    c,s=cos(radians(yaw)),sin(radians(yaw))
    def depth(poly):
        return sum(s*x-c*y+.56*z for x,y,z in poly)/len(poly)
    ordered=sorted(faces,key=lambda f:depth(f[0]))
    transform=fit([project(p,yaw) for poly,_ in faces for p in poly],box,55)
    for poly,tone in ordered:
        xy=[transform(project(p,yaw)) for p in poly]
        d.polygon(xy,fill=tone)
        d.line(xy+[xy[0]], fill=INK, width=2)
    if overlay:
        xy=[transform(project(p,yaw)) for p in overlay]
        d.line(xy,fill="#c84924",width=5)


def cubes(d, cells, box, yaw=32):
    occupied=set(map(tuple,cells))
    faces=[]
    for x,y,z in occupied:
        for offset,vertices,tone in [
            ((1,0,0),[(1,0,0),(1,1,0),(1,1,1),(1,0,1)],"#789ba8"),
            ((0,-1,0),[(0,0,0),(1,0,0),(1,0,1),(0,0,1)],"#adcbd0"),
            ((0,0,1),[(0,0,1),(1,0,1),(1,1,1),(0,1,1)],"#e4eef0")]:
            if (x+offset[0],y+offset[1],z+offset[2]) not in occupied:
                faces.append(([(x+a,y+b,z+c) for a,b,c in vertices],tone))
    draw_solid(d,faces,box,yaw)


def choice(d, i):
    x=30+i*300
    d.rounded_rectangle((x,459,x+280,718),radius=9,outline=RULE,width=2)
    label(d,(x+15,471),chr(65+i),24)
    return (x+14,511,x+266,697)
