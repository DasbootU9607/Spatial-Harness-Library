"""Independent structural and single-view geometry; imports no generator or FreeCAD."""
import itertools
import math


def normalized(points):
    low = [min(p[i] for p in points) for i in range(3)]
    return sorted(tuple(round(p[i] - low[i], 7) for i in range(3)) for p in points)


def connected(points):
    remaining = set(map(tuple, points))
    if not remaining:
        return False
    queue = [remaining.pop()]
    while queue:
        p = queue.pop()
        for axis in range(3):
            for delta in (-1, 1):
                q = list(p)
                q[axis] += delta
                q = tuple(q)
                if q in remaining:
                    remaining.remove(q)
                    queue.append(q)
    return not remaining


def rotations3():
    result = []
    for permutation in itertools.permutations(range(3)):
        parity = (-1) ** sum(permutation[i] > permutation[j] for i in range(3) for j in range(i + 1, 3))
        for signs in itertools.product((-1, 1), repeat=3):
            if parity * math.prod(signs) == 1:
                result.append([[signs[i] if j == permutation[i] else 0 for j in range(3)] for i in range(3)])
    return result


ROTATIONS = rotations3()


def transform3(points, matrix):
    return normalized([[sum(row[j] * p[j] for j in range(3)) for row in matrix] for p in points])


def relation3(a, b):
    target = set(normalized(b))
    attempts = []
    for matrix in ROTATIONS:
        points = set(transform3(a, matrix))
        attempts.append({'matrix': matrix, 'missing': sorted(points - target), 'extra': sorted(target - points)})
    best = min(attempts, key=lambda x: len(x['missing']) + len(x['extra']))
    equivalent = not best['missing'] and not best['extra']
    if equivalent:
        text = 'All %d cubes match under proper rotation matrix %s, after removing translation.' % (len(a), best['matrix'])
    elif len(a) != len(b):
        text = 'The original has %d cubes and this option has %d; rotation cannot change the count.' % (len(a), len(b))
    else:
        text = 'None of the 24 proper rotations matches. At the closest minimum-corner alignment, missing %s; extra %s.' % (best['missing'], best['extra'])
    return {'equivalent': equivalent, 'witness': best, 'explanation': text}


def decorated(grid):
    cells = []
    for cell in grid['cells']:
        motif = cell.get('pattern')
        # An opaque texture covers the underlying FreeCAD plane material.
        cells.append((None if motif else tuple(cell['color'][:3]), None if not motif else tuple(sorted(map(tuple, motif['points'])))))
    return grid['rows'], grid['cols'], tuple(grid['marker']), tuple(cells)


def transform2(grid, matrix):
    def apply(p):
        return [sum(matrix[i][j] * p[j] for j in range(2)) for i in range(2)]
    corners = [apply([x, y]) for x in (0, grid['cols']) for y in (0, grid['rows'])]
    low = [min(p[i] for p in corners) for i in range(2)]
    high = [max(p[i] for p in corners) for i in range(2)]
    cols, rows = [high[i] - low[i] for i in range(2)]
    cells = [None] * (rows * cols)
    for i, c in enumerate(grid['cells']):
        x, y = [int(a - b) for a, b in zip(apply([i % grid['cols'] + .5, i // grid['cols'] + .5]), low)]
        motif = c.get('pattern')
        cells[y * cols + x] = {'color': c['color'][:3], 'pattern': None if motif is None else {'kind': 'dots', 'points': [apply(p) for p in motif['points']]}}
    return {'rows': rows, 'cols': cols, 'cells': cells, 'marker': [a - b for a, b in zip(apply(grid['marker']), low)]}


PLANAR = [[[1, 0], [0, 1]], [[0, -1], [1, 0]], [[-1, 0], [0, -1]], [[0, 1], [-1, 0]]]


def relation2(a, b):
    attempts = []
    for i, matrix in enumerate(PLANAR):
        g = transform2(a, matrix)
        issues = []
        if (g['rows'], g['cols']) != (b['rows'], b['cols']):
            issues.append('grid dimensions differ')
        else:
            for k, (u, v) in enumerate(zip(decorated(g)[3], decorated(b)[3])):
                if u != v:
                    issues.append('cell row %d, column %d differs in color or internal pattern direction' % (k // g['cols'] + 1, k % g['cols'] + 1))
        if g['marker'] != b['marker']:
            issues.append('red corner differs')
        attempts.append({'degreesClockwise': i * 90, 'differences': issues})
    best = min(attempts, key=lambda a: len(a['differences']) + 100 * ('grid dimensions differ' in a['differences']))
    text = ('A %d degree clockwise rotation maps the cells, internal patterns and red corner together.' % best['degreesClockwise'] if not best['differences'] else
            'No match in four orientations. Closest alignment is %d degrees clockwise: %s.' % (best['degreesClockwise'], '; '.join(best['differences'][:4])))
    return {'equivalent': not best['differences'], 'witness': best, 'explanation': text}


def reflect_screen(cubes, camera, axis):
    normal = camera['right' if axis == 'horizontal' else 'up']
    matrix = [[(1 if i == j else 0) - 2 * normal[i] * normal[j] for j in range(3)] for i in range(3)]
    if any(abs(v - round(v)) > 1e-5 for row in matrix for v in row):
        raise ValueError('Screen reflection is not a lattice-preserving spatial reflection; resample the official option selection')
    return transform3(cubes, [[round(v) for v in row] for row in matrix])


def project(point, camera, width=1280, height=1024):
    delta = [point[i] - camera['position'][i] for i in range(3)]
    scale = height / camera['height']
    return [width / 2 + scale * sum(delta[i] * camera['right'][i] for i in range(3)),
            height / 2 - scale * sum(delta[i] * camera['up'][i] for i in range(3))]


def ray_blocked(point, direction, other):
    lower, upper = 1e-5, float('inf')
    for axis in range(3):
        if abs(direction[axis]) < 1e-8:
            if not other[axis] < point[axis] < other[axis] + 1:
                return False
        else:
            times = [(other[axis] - point[axis]) / direction[axis], (other[axis] + 1 - point[axis]) / direction[axis]]
            lower, upper = max(lower, min(times)), min(upper, max(times))
    return upper > lower + 1e-6


def covered_face(cube, axis, direction, other):
    """Exact positive-area shadow on a unit face, by convex clipping (not ray samples)."""
    sign = 1 if direction[axis] > 0 else -1
    plane = cube[axis] + (1 if sign > 0 else 0)
    low, high = list(other), [x + 1 for x in other]
    if sign > 0:
        low[axis] = max(low[axis], plane)
    else:
        high[axis] = min(high[axis], plane)
    if low[axis] >= high[axis] - 1e-8:
        return False
    axes = [i for i in range(3) if i != axis]
    points = []
    for v in itertools.product(*[(low[i], high[i]) for i in range(3)]):
        t = (v[axis] - plane) / direction[axis]
        points.append(tuple(v[i] - t * direction[i] - cube[i] for i in axes))
    points = sorted(set(points))
    def cross(a, b, c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    def hull(seq):
        out = []
        for p in seq:
            while len(out) >= 2 and cross(out[-2], out[-1], p) <= 1e-10:
                out.pop()
            out.append(p)
        return out
    poly = hull(points)[:-1] + hull(points[::-1])[:-1]
    for dim, bound, direction_sign in ((0, 0, 1), (0, 1, -1), (1, 0, 1), (1, 1, -1)):
        clipped = []
        for a, b in zip(poly, poly[1:] + poly[:1]):
            ina, inb = direction_sign*(a[dim]-bound) >= -1e-10, direction_sign*(b[dim]-bound) >= -1e-10
            if ina:
                clipped.append(a)
            if ina != inb:
                t = (bound-a[dim])/(b[dim]-a[dim])
                clipped.append(tuple(a[i]+t*(b[i]-a[i]) for i in range(2)))
        poly = clipped
    area = abs(sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(poly, poly[1:]+poly[:1]))) / 2
    # FreeCAD serializes the isometric camera at float precision; tolerate only
    # a 0.001% unit-face sliver (well below one pixel in supported renders).
    return area > 1e-5


def visibility(cubes, camera):
    """Conservative full-face witnesses and visible sample signature at the actual camera."""
    toward = camera['toward']
    points, full_faces = [], []
    for index, cube in enumerate(cubes):
        witnesses = []
        for axis in range(3):
            sign = 1 if toward[axis] > 0 else -1
            other_axes = [i for i in range(3) if i != axis]
            visible = []
            for u, v in itertools.product((.1, .3, .5, .7, .9), repeat=2):
                p = [float(x) for x in cube]
                p[axis] += 1 if sign > 0 else 0
                p[other_axes[0]] += u
                p[other_axes[1]] += v
                clear = not any(ray_blocked(p, toward, other) for j, other in enumerate(cubes) if j != index)
                visible.append(clear)
                if clear:
                    points.append([sum(p[i] * camera['right'][i] for i in range(3)), sum(p[i] * camera['up'][i] for i in range(3))])
            if not any(covered_face(cube, axis, toward, other) for j, other in enumerate(cubes) if j != index):
                witnesses.append(axis)
        full_faces.append(witnesses)
    lo = [min(p[i] for p in points) for i in range(2)]
    signature = sorted(set(tuple(round(p[i] - lo[i], 4) for i in range(2)) for p in points))
    return {'allCubesHaveFullFace': all(full_faces), 'fullFaceAxes': full_faces, 'signature': signature}
