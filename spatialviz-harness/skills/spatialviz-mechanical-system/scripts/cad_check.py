"""Measure the saved native solids. Joint objects identify the surfaces to inspect."""
import math
import FreeCAD as App
import Part


def require(condition, message):
    if not condition:
        raise ValueError(message)


def cylinders(obj):
    return [f.Surface for f in obj.Shape.Faces if isinstance(f.Surface,Part.Cylinder)]


def axle(obj):
    holes=[s for s in cylinders(obj) if abs(s.Radius-2.84)<.001 and abs(s.Axis.z)>.999]
    require(holes,'No modeled axle bore in '+obj.Label)
    return holes[0].Center


def inspect(doc):
    bodies={o.MemberID:o for o in doc.Objects if 'MemberID' in o.PropertiesList}
    checks=[];facts=[]
    def check(test,label):
        require(test,label);checks.append(label)
    for o in list(bodies.values())+list(doc.Hardware.Group):
        check(o.Shape.isValid() and all(s.Volume>0 for s in o.Shape.Solids) and len(o.Shape.Solids)>0,'Valid positive-volume solid: '+o.Label)
    profiles={}
    for n,o in bodies.items():
        profile=doc.getObject('Profile'+n)
        if not profile:continue
        teeth=profile.NumberOfTeeth;module=profile.Modules.Value;r=(teeth+2)*module/2
        center=axle(o)
        # Each physical tooth intersects a ring between pitch and tip on two flanks.
        probe=Part.makeCircle(r-.6*module,App.Vector(center.x,center.y,o.Shape.BoundBox.Center.z))
        hits=len(probe.section(o.Shape).Vertexes)
        check(hits==2*teeth,f'Counted {hits} physical flank crossings for {teeth} teeth on {n}')
        profiles[n]=(teeth,module,center)
    pairs=[]
    for j in doc.Connections.Group:
        ids=[o.MemberID for o in j.Members];a=j.Members[0];n=ids[0];k=j.Law
        if len(ids)==2:b=j.Members[1];p=ids[1]
        if k=='mesh':
            na,ma,ca=profiles[n];nb,mb,cb=profiles[p];d=math.hypot(ca.x-cb.x,ca.y-cb.y)
            check(abs(ma-mb)<.001 and abs(d-(na+nb)*ma/2)<.09,'Native pitch distance %.3f mm at %s/%s'%(d,n,p))
            check(min(a.Shape.BoundBox.ZMax,b.Shape.BoundBox.ZMax)-max(a.Shape.BoundBox.ZMin,b.Shape.BoundBox.ZMin)>3,'Working tooth faces overlap axially')
            volume=a.Shape.common(b.Shape).Volume
            check(volume<.025,'Meshed B-reps at the displayed pose have %.6f cubic mm interference'%volume)
            arm='frame'
            if 'Carrier' not in j.PropertiesList:
                for c in [ca,cb]:
                    seats=[s for o in doc.Hardware.Group if o.Name.startswith('Bearing') for s in cylinders(o) if abs(s.Axis.z)>.999 and math.hypot(s.Center.x-c.x,s.Center.y-c.y)<.02]
                    check(bool(seats),'A physical frame bearing locates a fixed mesh axle at '+n+' / '+p)
            if 'Carrier' in j.PropertiesList:
                h=j.Carrier;arm=h.MemberID;ch=axle(h)
                for center in [ca,cb]:
                    bearings=[s for s in cylinders(h) if abs(s.Axis.z)>.999 and math.hypot(s.Center.x-center.x,s.Center.y-center.y)<.02]
                    check(bool(bearings),'Carrier bore locates a mesh axle on '+arm)
            facts.append(f'{n} {na}T / {p} {nb}T : external mesh on {arm}.')
            pairs.append({'members':ids,'pitchDistanceMm':round(d,5),'overlapMm3':round(volume,7)})
        elif k=='key':
            ca,cb=axle(a),axle(b);key,=j.Hardware;bb=key.Shape.BoundBox
            check(math.hypot(ca.x-cb.x,ca.y-cb.y)<.01,'Keyed hubs have a common axis')
            for part in [a,b]:
                pb=part.Shape.BoundBox
                check(min(bb.ZMax,pb.ZMax)-max(bb.ZMin,pb.ZMin)>2 and key.Shape.distToShape(part.Shape)[0]<.15 and key.Shape.common(part.Shape).Volume<.005,'Solid key sits in the keyway of '+part.MemberID)
            facts.append(f'{n} and {p} are keyed to one shaft.')
        elif k=='cord':
            cd=axle(a);line,=j.Hardware
            straight=[s for s in cylinders(line) if abs(s.Axis.y)>.999]
            check(len(straight)==1,'One vertical straight takeoff on the wrapped line')
            cx=straight[0].Center.x
            drum=[s for s in cylinders(a) if abs(s.Axis.z)>.999 and abs(abs(cx-cd.x)-s.Radius-.65)<.035]
            check(bool(drum) and abs(cx-b.Shape.BoundBox.Center.x)<.02,'Wrapped line exits the drum tangentially above the load')
            check(line.Shape.distToShape(b.Shape)[0]<.02 and line.Shape.distToShape(a.Shape)[0]<.03,'Line meets the load and the barrel')
            side='left' if cx<cd.x else 'right'
            facts.append(f'{p} hangs from the taut {side} tangent of {n}.')
        elif k in ('yoke','stroke'):
            ck=axle(a);pin,guides=j.Hardware;pc=pin.Shape.BoundBox.Center
            check(abs(pc.x-ck.x)<.02 and pc.y>ck.y and pin.Shape.distToShape(a.Shape)[0]<.02,'Upper pin bears on the crank')
            check(pin.Shape.distToShape(b.Shape)[0]<.15 and pin.Shape.common(b.Shape).Volume<.005,'Pin fits between the working slot faces')
            # Probe both slot walls and both empty axial guide channels from physical faces.
            z=b.Shape.BoundBox.Center.z;V=App.Vector
            check(all(b.Shape.isInside(V(pc.x+t,pc.y+dy,z),.001,True) for t in [-3,3] for dy in [-2,2]),'Vertical retaining walls on both sides of the upper pin')
            check(len(guides.Shape.Solids)>=2 and guides.Shape.distToShape(b.Shape)[0]<.22 and guides.Shape.common(b.Shape).Volume<.005,'Slide rod fits the two horizontal frame guides')
            facts.append(f'Top pin on {n} runs in the vertical slot of {p}.')
            facts.append(f'Two horizontal frame guides locate {p}.')
        elif k=='ground':
            bolts,=j.Hardware
            check(len(bolts.Shape.Solids)==2 and bolts.Shape.distToShape(doc.Frame.Shape)[0]<.02 and bolts.Shape.distToShape(a.Shape)[0]<.02,'Two through-bolts clamp '+n+' to the fixed frame')
            facts.append(f'{n} is bolted to the fixed frame.')
        else:raise ValueError('Unsupported native joint '+k)
    # Check all moving body pairs for unintended interpenetration.
    from itertools import combinations
    known={frozenset(q['members']) for q in pairs}
    for (n,a),(p,b) in combinations(bodies.items(),2):
        if frozenset([n,p]) in known or not a.Shape.BoundBox.intersect(b.Shape.BoundBox):continue
        check(a.Shape.common(b.Shape).Volume<.025,'Independent members clear at the shown pose: '+n+' / '+p)
    return {'checks':checks,'facts':facts,'meshMeasurements':pairs,'scope':'Reopened B-reps and mounted interfaces at the displayed pose. Tooth phasing is a pose check. Motion signs are derived separately from the printed problem.'}
