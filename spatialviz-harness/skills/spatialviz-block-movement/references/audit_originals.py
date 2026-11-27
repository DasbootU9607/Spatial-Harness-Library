"""Read the four released raster panels; enumerate supported stacks consistent with both views.

Run from the library root with Python, Pillow and NumPy. Colors are the six FreeCAD
diffuse face colors measured on the released PNGs. Coordinates use the labeled axes.
"""
from collections import Counter, defaultdict
from itertools import product
import hashlib
import json
import math
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path.cwd()
OUT = Path(__file__).resolve().parent
PALETTE = {(17, 17, 158): 'blue', (156, 17, 17): 'red', (17, 157, 17): 'green',
           (156, 17, 158): 'magenta', (156, 157, 17): 'yellow', (17, 157, 158): 'cyan',
           (111, 117, 122): 'floor', (255, 255, 255): 'air'}
DIRECTIONS = {'x+': (1, 0, 0), 'x-': (-1, 0, 0), 'y+': (0, 1, 0),
              'y-': (0, -1, 0), 'z+': (0, 0, 1), 'z-': (0, 0, -1)}


def calibrate(image, sign, nx, ny):
    """Red shaft slope and blue shaft x locate the origin. The footprint gives unit length."""
    rgb = image.astype(int)
    blue = np.where(np.all(rgb == [0, 0, 255], axis=2))
    ox = np.median(blue[1])
    red_y, red_x = np.where(np.all(rgb == [255, 0, 0], axis=2))
    green_y, green_x = np.where(np.all(rgb == [0, 255, 0], axis=2))
    oy = np.median(np.concatenate([red_y - (red_x - ox) / math.sqrt(3), green_y + (green_x-ox) / math.sqrt(3)]))
    face = (rgb[:, :, 0] == 156) | (rgb[:, :, 0] == 17)
    face &= (rgb[:, :, 1] == 17) | (rgb[:, :, 1] == 157)
    face &= (rgb[:, :, 2] == 17) | (rgb[:, :, 2] == 158)
    face &= np.max(rgb,axis=2)>20
    face |= np.all(rgb == [111, 117, 122], axis=2)
    far = np.max(sign * (np.where(face)[1] - ox))
    return ox, oy, (far + 2) / (nx + ny)


def rays(image, bounds, sign):
    nx, ny, nz = bounds
    ox, oy, unit = calibrate(image, sign, nx, ny)
    cells = list(product(range(nx), range(ny), range(nz)))
    sight = np.array((sign,-sign,1))
    samples = set()
    for x,y,z in cells:
        samples.add((x+.38,y+.54,z+1))
        samples.add((x+(1+sign)/2,y+.47,z+.61))
        samples.add((x+.43,y+(1-sign)/2,z+.39))
        if z==0:
            samples.add((x+.38,y+.54,0))
    readings=[]
    for sample in sorted(samples):
        pt=np.array(sample)
        layer=[]
        floor_point=pt-pt[2]*sight
        if 0 < floor_point[0] < nx and 0 < floor_point[1] < ny:
            layer.append((-pt[2],None))
        for cell in cells:
            t1=(np.array(cell)-pt)/sight
            t2=t1+1/sight
            entry=max(np.minimum(t1,t2))
            leave=min(np.maximum(t1,t2))
            if leave-entry>1e-6:
                layer.append((leave,cell))
        x,y,z=sample
        px=round(ox+unit*sign*(x+y))
        py=round(oy+unit/math.sqrt(3)*(sign*(x-y)-2*z))
        if not (3 <= px < image.shape[1]-3 and 3 <= py < image.shape[0]-3):
            color = 'air'
        else:
            patch = image[py-3:py+4, px-3:px+4]
            color = Counter(PALETTE.get(tuple(pixel)) for pixel in patch.reshape(-1, 3)).most_common(1)[0][0]
        if color:
            readings.append((color, [cell for _, cell in sorted(layer, key=lambda a: -a[0])]))
    return readings, (round(float(ox), 1), round(float(oy), 1), round(float(unit), 2))


def decode(image, bounds):
    nx, ny, nz = bounds
    width = image.shape[1]
    observations = []
    frames = []
    for sub, sign in [(image[:, :width//2], 1), (image[:, width//2:], -1)]:
        read, frame = rays(sub, bounds, sign)
        observations.extend(read)
        frames.append(frame)

    layouts = []
    # Checking the shape and colored first visible surface jointly also catches occlusion.
    for heights in product(range(nz + 1), repeat=nx*ny):
        state = {}
        for color, layer in observations:
            first = next((c for c in layer if c is None or heights[c[0]*ny+c[1]] > c[2]), 'air')
            if first is None or first == 'air':
                if color != ('floor' if first is None else 'air'):
                    break
            elif color in ('floor', 'air') or state.get(first, color) != color:
                break
            else:
                state[first] = color
        else:
            for x, y in product(range(nx), range(ny)):
                for z in range(heights[x*ny+y]):
                    state.setdefault((x, y, z), '?')
            layouts.append(state)
    return layouts, frames


def parse(text):
    return [(tuple(map(int, (x, y, z))), axis) for x, y, z, axis in re.findall(
        r'\((\d+),\s*(\d+),\s*(\d+)\)\s*([xyz][+-])', text)]


def replay(initial, steps, bounds):
    state = dict(initial)
    trace = []
    for src, axis in steps:
        dst = tuple(a+b for a, b in zip(src, DIRECTIONS[axis]))
        if src not in state or any(c < 0 or c >= s for c, s in zip(dst, bounds)):
            return None, trace + [dict(error='Missing source or target outside grid.', source=src, target=dst)]
        if dst not in state and dst[2] and (dst[0],dst[1],dst[2]-1) not in state:
            return None, trace + [dict(error='Unsupported destination.', source=src, target=dst)]
        mover = state.pop(src)
        other = state.get(dst)
        if other is not None:
            state[src] = other
        state[dst] = mover
        falls = []
        normalized = {}
        for (x, y, z), color in sorted(state.items()):
            height = sum(pos[:2] == (x, y) for pos in normalized)
            normalized[(x, y, height)] = color
            if height != z:
                falls.append(dict(color=color, source=(x, y, z), target=(x,y,height)))
        trace.append(dict(source=src,target=dst,mover=mover,exchangedWith=other,falls=falls))
        state = normalized
    return state, trace


def packed(state):
    return {','.join(map(str,pos)):c for pos,c in sorted(state.items())}


def audit(row):
    im = np.asarray(Image.open(ROOT/'questions'/row['image']).convert('RGB'))
    _, nx, ny, nz, _ = map(int,row['sourceId'].split('/')[-1].split('-'))
    bounds = nx,ny,nz
    before, cal1 = decode(im[:len(im)//2],bounds)
    after, cal2 = decode(im[len(im)//2:],bounds)
    result = dict(sourceId=row['sourceId'], level=row['level'], image=row['image'],
                  imageSha256=hashlib.sha256((ROOT/'questions'/row['image']).read_bytes()).hexdigest(),
                  officialAnswer=row['answer'], options=row['options'], viewCalibration=[cal1,cal2],
                  initial=[packed(s) for s in before], final=[packed(s) for s in after])
    return assess(result, before, after, bounds)


def changed_cells(state, target):
    cells = sorted(set(state) | set(target))
    return [dict(cell=pos, observed=target.get(pos, 'empty'), predicted=state.get(pos, 'empty'))
            for pos in cells if state.get(pos) != target.get(pos)]


def classify(initial, final, trace, nz):
    tags = set()
    if initial == final:
        tags.add('unchanged')
    for step in trace:
        if step['falls']:
            tags.add('settle')
        if step['source'][2] != step['target'][2] and step['exchangedWith']:
            tags.add('vertical-swap')
        elif step['source'][2] == step['target'][2]:
            prefix = 'flat' if nz == 1 else 'stack'
            tags.add(prefix + ('-swap' if step['exchangedWith'] else '-transfer'))
    return sorted(tags)


def assess(result, before, after, bounds):
    if len(before) != 1 or len(after) != 1 or any('?' in s.values() for s in before + after):
        raise ValueError('Partial reconstruction: inspect source ' + result['sourceId'])
    initial, final = before[0], after[0]
    checks = []
    endpoints = defaultdict(list)
    for i, text in enumerate(result['options']):
        letter = chr(65+i)
        steps = parse(text)
        if len(steps) != len(text.split('--')):
            raise ValueError('Unrecognized instruction: ' + text)
        reached, trace = replay(initial, steps, bounds)
        diffs = None if reached is None else changed_cells(reached, final)
        if reached is None:
            clue = f"Step {len(trace)} cannot move {trace[-1]['source']} to {trace[-1]['target']}. {trace[-1]['error']}"
        elif diffs:
            d = diffs[0]
            clue = f"At {d['cell']} this predicts {d['predicted']}. The final views show {d['observed']}."
        else:
            clue = f"All {len(final)} occupied coordinates and their colors match, including the empty floor cells."
        checks.append(dict(option=letter, replay=trace, mismatchCount=None if diffs is None else len(diffs),
                           verdict='matches' if diffs == [] else 'rejected', visibleComparison=clue))
        if reached is not None:
            endpoints[tuple(sorted(reached.items()))].append(letter)
    valid = [c for c in checks if c['verdict'] == 'matches']
    if len(valid) != 1:
        raise ValueError('Ambiguous or unsolved: '+result['sourceId'])
    best = min((c for c in checks if c != valid[0]), key=lambda c: c['mismatchCount'] if c['mismatchCount'] is not None else 100)
    endpoint_change = changed_cells(initial, final)
    first_changes = [f"{c['cell']} {c['predicted']} to {c['observed']}" for c in endpoint_change[:3]]
    note = ('The two upper views and two lower views show '+', '.join(first_changes)+'.' if endpoint_change else
            'All colored cells coincide in the two rows; an unchanged visible arrangement is required.')
    if len(endpoint_change)>3:
        note += f" Another {len(endpoint_change)-3} changed coordinates are listed in endpointChanges."
    result.update(coverage=classify(initial, final, valid[0]['replay'], bounds[2]),
                  independentAnswer=valid[0]['option'], matchesOfficial=valid[0]['option']==result['officialAnswer'],
                  optionChecks=checks, nearestDistractor=best['option'], observation=note+' '+best['option']+': '+best['visibleComparison'],
                  endpointChanges=[dict(cell=c['cell'], initial=c['predicted'], final=c['observed']) for c in endpoint_change],
                  equivalentLegalEndpoints=[v for v in endpoints.values() if len(v)>1],
                  duplicatePrintedSequences=[list(k) for k in
                      ([chr(65+j) for j,x in enumerate(result['options']) if x==word] for word in dict.fromkeys(result['options']))
                      if len(k)>1])
    return result


def main():
    rows = [r for r in json.loads((ROOT/'questions/data/spatialviz.json').read_bytes())
            if r['sourceId'].startswith('MentalAnimation/BlockMoving/')]
    output = [audit(r) for r in rows]
    (OUT/'observations.json').write_text(json.dumps(output, indent=2)+'\n',encoding='utf-8')

if __name__ == '__main__':
    main()

