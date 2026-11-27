"""Build rigid members and their physical interfaces in the FreeCAD document."""
import math
import FreeCAD as App
import FreeCADGui as Gui
import InvoluteGearFeature
import Part

V = App.Vector
PALETTE = {"gear": (0.16, .57, .56), "carrier": (.91,.56,.18), "drum": (.83,.47,.17),
           "weight": (.35,.39,.51), "crank": (.88,.52,.19), "slider": (.21,.50,.69)}
STEEL = (.48,.56,.60)
BRASS = (.93,.71,.31)
FRAME = (.73,.77,.77)


def cylinder(x,y,z,r,h):
    return Part.makeCylinder(r,h,V(x,y,z))


def box(x,y,z,w,h,t):
    return Part.makeBox(w,h,t,V(x,y,z))


def beam(x,y,X,Y,z,w,h):
    length=math.hypot(X-x,Y-y)
    if length<.001:
        return cylinder(x,y,z,w/2,h)
    bar=box(0,-w/2,0,length,w,h)
    bar.rotate(V(),V(0,0,1),math.degrees(math.atan2(Y-y,X-x)))
    bar.translate(V(x,y,z))
    return bar.fuse(cylinder(x,y,z,w/2,h)).fuse(cylinder(X,Y,z,w/2,h)).removeSplitter()


def gear_phases(members, joints):
    angles={}
    edges=[j['ports'] for j in joints if j['kind']=='mesh']
    for start in members:
        if start in angles or members[start]['kind']!='gear':
            continue
        angles[start]=0.0
        queue=[start]
        while queue:
            a=queue.pop()
            for pair in edges:
                if a not in pair: continue
                b=pair[1-pair.index(a)]
                if b in angles: continue
                u,v=members[a],members[b]
                az=math.degrees(math.atan2(u['at'][1]-v['at'][1],v['at'][0]-u['at'][0]))
                angles[b]=az+180-180/v['teeth']-(angles[a]-az)*u['teeth']/v['teeth']
                queue.append(b)
    return angles


def build(doc,system):
    m=system['members']; js=system['connections']; mod=system['cad']['moduleMm']
    level=12.0; thick=5.0; bore=2.8
    at={n:(a['at'][0]*mod,-a['at'][1]*mod,a['at'][2]*level) for n,a in m.items()}
    if any(z<0 for _,_,z in at.values()):raise ValueError('CAD axial planes start at zero')
    phases=gear_phases(m,js)
    keyed={p for j in js if j['kind']=='key' for p in j['ports']}
    objects={}; anchors={}; fixtures=doc.addObject('App::DocumentObjectGroup','Hardware')
    profiles=doc.addObject('App::DocumentObjectGroup','InvoluteProfiles')
    links=doc.addObject('App::DocumentObjectGroup','Connections')
    def add(name,label,shape,color,group=None):
        o=doc.addObject('Part::Feature',name);o.Label=label;o.Shape=shape
        o.ViewObject.ShapeColor=color;o.ViewObject.LineColor=(.14,.20,.24)
        o.ViewObject.DisplayMode='Flat Lines';o.ViewObject.LineWidth=1.0;o.ViewObject.Deviation=.10
        if group:group.addObject(o)
        return o
    def shaft_hole(n,s):
        x,y,z=at[n];hole=cylinder(x,y,z-1,bore+.04,12)
        if n in keyed:hole=hole.fuse(box(x+bore-1,y-.82,z-1,2.05,1.64,12))
        return s.cut(hole)
    # The frame is behind the pitch plane. Moving planet axles sit in the carrier only.
    gear_names=[n for n in m if m[n]['kind']=='gear']
    radii={n:mod*m[n]['teeth']/2+mod for n in gear_names}
    rear=min(z for x,y,z in at.values())-9
    bounds=[(at[n][0]-radii[n],at[n][1]-radii[n],at[n][0]+radii[n],at[n][1]+radii[n]) for n in gear_names]
    if not bounds:bounds=[(x-12,y-12,x+12,y+12) for x,y,z in at.values()]
    xmin=min(b[0] for b in bounds)-3; xmax=max(b[2] for b in bounds)+3
    ymin=min(b[1] for b in bounds)-3; ymax=max(b[3] for b in bounds)+3
    plate=box(xmin,ymin,rear,xmax-xmin,ymax-ymin,2.6)
    for xx in [xmin+3,xmax-3]:
        for yy in [ymin+3,ymax-3]:plate=plate.cut(cylinder(xx,yy,rear-1,1.3,5))
    add('Frame','Fixed rear mounting plate',plate,FRAME,fixtures)
    for n,item in m.items():
        x,y,z=at[n]; k=item['kind']; label=n+'  |  '+k
        if k=='gear':
            pr=InvoluteGearFeature.makeInvoluteGear('Profile'+n)
            pr.NumberOfTeeth=item['teeth'];pr.Modules=mod;pr.HighPrecision=True
            doc.recompute();profiles.addObject(pr)
            outline=pr.Shape.copy(); outline.rotate(V(),V(0,0,1),phases[n]);outline.translate(V(x,y,z))
            s=shaft_hole(n,Part.Face(outline.Wires[0]).extrude(V(0,0,thick)))
            radius=radii[n];anchors[n]=(x-.38*radius,y+.55*radius,z+thick+.3)
            pr.Visibility=False
        elif k=='drum':
            r=item['radius']*mod;rr=.65
            s=cylinder(x,y,z,r-rr,6).fuse(cylinder(x,y,z,r+1.6,1)).fuse(cylinder(x,y,z+5,r+1.6,1))
            s=shaft_hole(n,s);anchors[n]=(x-.43*r,y+.42*r,z+6.5)
        elif k=='weight':
            s=box(x-4,y-4,z,8,8,6);anchors[n]=(x,y,z+6.2)
        elif k=='crank':
            j=next(j for j in js if j['kind'] in ('yoke','stroke') and j['ports'][0]==n)
            r=j['radius']*mod
            s=shaft_hole(n,beam(x,y,x,y+r,z,10,4))
            anchors[n]=(x-2,y+r*.35,z+4)
        elif k=='slider':
            j=next(j for j in js if j['kind'] in ('yoke','stroke') and j['ports'][1]==n)
            h=j['radius']*mod+4
            s=box(x-5.2,y-h,z,10.4,2*h,3).cut(box(x-2.1,y-h+2,z-1,4.2,2*h-4,5))
            rod=max(35,xmax-x+23)
            s=s.fuse(box(x+5,y-1.65,z,rod,3.3,3)).removeSplitter()
            anchors[n]=(x+12,y,z+3.2)
        elif k=='carrier':
            carried={p for j in js if j.get('arm')==n for p in j['ports']}
            if not carried:raise ValueError('Carrier needs a moving-center gear mesh')
            s=cylinder(x,y,z,5.5,3.5)
            for p in carried:
                X,Y,_=at[p];s=s.fuse(beam(x,y,X,Y,z,9,3.5))
            for p in carried:
                X,Y,_=at[p]
                if (X,Y)!=(x,y):s=s.cut(cylinder(X,Y,z-.1,bore,3.7))
            s=shaft_hole(n,s.removeSplitter());other=max(carried,key=lambda p:math.dist(at[p][:2],(x,y)))
            X,Y,_=at[other];anchors[n]=((X+x)/2,(Y+y)/2,z+3.6)
        else:raise ValueError('No native part builder for '+k)
        color=PALETTE[k]
        if k=='gear' and list(gear_names).index(n)%2:color=(.29,.47,.63)
        objects[n]=add('Body'+n,label,s,color)
        obj=objects[n];obj.addProperty('App::PropertyString','MemberID','Mechanism');obj.MemberID=n
    # Locate axles. Each common shaft spans its mounted hubs. Its actual feather key engages both keyways.
    keylinks=[j for j in js if j['kind']=='key']
    offaxis={p for j in js if j.get('arm') for p in j['ports'] if at[p][:2]!=at[j['arm']][:2]}
    axes={}
    for n,o in objects.items():
        if m[n]['kind'] in ('weight','slider'):continue
        axes.setdefault(at[n][:2],[]).append(n)
    for i,((x,y),ns) in enumerate(axes.items()):
        low=min(at[n][2] for n in ns);high=max(at[n][2] for n in ns)+6.7
        start=low-1.0 if all(n in offaxis for n in ns) else rear+2.6
        if any(n in offaxis for n in ns):
            high=max([high]+[at[j['arm']][2]+3.5 for j in js if j.get('arm') and any(n in j['ports'] for n in ns)])
        axle=cylinder(x,y,start,bore,high-start)
        if any(n in keyed for n in ns):axle=axle.cut(box(x+bore-.8,y-.8,low,2,1.6,high-low))
        add('Axle'+str(i),'Axle at '+', '.join(ns),axle,STEEL,fixtures)
        if not all(n in offaxis for n in ns):
            bush=cylinder(x,y,rear+2.6,5.2,low-rear-2.7).cut(cylinder(x,y,rear+2.5,bore+.12,low-rear))
            add('Bearing'+str(i),'Frame bearing at '+', '.join(ns),bush,STEEL,fixtures)
    for i,j in enumerate(js):
        ids=j['ports'];a=ids[0];x,y,z=at[a];k=j['kind']; hw=[]
        if len(ids)>1:b=ids[1];X,Y,Z=at[b]
        if k=='key':
            lo=min(z,Z);hi=max(z,Z)+5.5
            hw.append(add('Key'+str(i),'Feather key '+a+' / '+b,box(x+bore-.79,y-.77,lo,1.75,1.54,hi-lo),BRASS,fixtures))
        elif k=='cord':
            side=1 if j['side']=='right' else -1;r=m[a]['radius']*mod
            if abs((X-x)-side*r)>.04 or Y>=y-8:raise ValueError('Cord must meet the selected drum tangent above the load')
            mid=z+3
            rope=Part.makeCylinder(.65,y-(Y+4),V(X,Y+4,mid),V(0,1,0))
            turn=Part.makeTorus(r,.65,V(x,y,mid),V(0,0,1),0,360,90)
            if side<0:turn.rotate(V(x,y,mid),V(0,0,1),90)
            hw.append(add('Cord'+str(i),'Taut wrapped line '+a+' / '+b,rope.fuse(turn),(0.60,.19,.12),fixtures))
        elif k in ('yoke','stroke'):
            r=j['radius']*mod
            if abs(X-x)>.01 or abs(Y-y-r)>.01 or Z<z+5:raise ValueError('Slider slot must capture the upper crank pin in a forward plane')
            hw.append(add('Pin'+str(i),'Crank pin captured in '+b,cylinder(x,y+r,z+4,2,Z+3.4-z-4),BRASS,fixtures))
            rails=[]
            first=max(13,xmax-X+2)
            for off in (first,first+11):
                sleeve=box(X+off,Y-4.5,Z-1.9,5.5,9,7).cut(box(X+off-.1,Y-1.8,Z-.15,5.7,3.6,3.3))
                foot=box(X+off,Y-4.5,rear,5.5,2.45,Z-1.9-rear)
                extension=box(min(X+off,xmax-3),Y-4.5,rear,max(3,X+off+5.5-(xmax-3)),2.45,2.6)
                foot=foot.fuse(extension)
                rails.append(sleeve.fuse(foot))
            hw.append(add('Guides'+str(i),'Twin frame guides for '+b,Part.makeCompound(rails),STEEL,fixtures))
        elif k=='ground':
            # Two through bolts fasten the sun directly to the backplate. Cut matching holes first.
            pins=[]
            for sign in [-1,1]:
                px=x;py=y+sign*radii[a]*.55
                objects[a].Shape=objects[a].Shape.cut(cylinder(px,py,z-.1,1.62,5.2))
                pins.append(cylinder(px,py,rear+2.6,1.6,z+5-rear-2.6).fuse(cylinder(px,py,z+5,2.5,1.3)))
            hw.append(add('Lock'+str(i),'Frame bolts on '+a,Part.makeCompound(pins),BRASS,fixtures))
        elif k!='mesh':raise ValueError('No native interface for '+k)
        link=doc.addObject('App::FeaturePython','Joint'+str(i));links.addObject(link)
        link.Label=k+'  |  '+' - '.join(ids);link.addProperty('App::PropertyString','Law','Interface');link.Law=k
        link.addProperty('App::PropertyLinkList','Members','Interface');link.Members=[objects[n] for n in ids]
        link.addProperty('App::PropertyLinkList','Hardware','Interface');link.Hardware=hw
        if j.get('arm'):
            link.addProperty('App::PropertyLink','Carrier','Interface');link.Carrier=objects[j['arm']]
    doc.recompute()
    for pr in profiles.Group:pr.Visibility=False
    return anchors
