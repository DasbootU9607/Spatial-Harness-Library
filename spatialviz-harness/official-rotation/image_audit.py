"""Audit source pixels, image operations and composition separately from 3D equivalence."""
import base64
import hashlib
import io
import itertools
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from geometry import project, visibility


def image_record(file):
    data = file.read_bytes()
    image = Image.open(io.BytesIO(data))
    return {'sha256': hashlib.sha256(data).hexdigest(), 'width': image.width, 'height': image.height,
            'pngBase64': base64.b64encode(data).decode('ascii')}


def decode(record):
    data = base64.b64decode(record['pngBase64'], validate=True)
    assert hashlib.sha256(data).hexdigest() == record['sha256'], 'Image hash differs'
    image = Image.open(io.BytesIO(data)).convert('RGB')
    assert image.size == (record['width'], record['height']), 'Image dimensions differ'
    return image


def crop_box(image, padding=10):
    # Deliberately preserve the upstream BGR conversion of a PIL RGB array.
    gray = cv2.cvtColor(np.array(image.convert('RGB')), cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 170, 255, cv2.THRESH_BINARY_INV)
    ys, xs = np.where(mask > 0)
    if not len(xs):
        raise ValueError('Blank FreeCAD render')
    return [max(int(xs.min()) - padding, 0), max(int(ys.min()) - padding, 0),
            min(int(xs.max()) + 1 + padding, image.width), min(int(ys.max()) + 1 + padding, image.height)]


def replay(image, operations):
    image = image.convert('RGB')
    for op in operations:
        if op['kind'] == 'crop':
            assert crop_box(image) == op['box'], 'Crop does not match the upstream content rule'
            image = image.crop(op['box'])
        elif op['kind'] == 'rotate':
            image = image.rotate(-op['degreesClockwise'], expand=True)
        elif op['kind'] == 'flip':
            image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT if op['axis'] == 'horizontal' else Image.Transpose.FLIP_TOP_BOTTOM)
        else:
            raise ValueError('Unknown pixel operation')
    return image


def grid_pixels(raw):
    image = np.array(decode(raw['image']))
    geometry, camera = raw['geometry'], raw['camera']
    errors = []
    unit = geometry['unit']
    scale = image.shape[0] / camera['height']
    for index, cell in enumerate(geometry['cells']):
        center = cell['center']
        expected_center = [(index % geometry['cols'] + .5)*unit, (geometry['rows'] - index//geometry['cols'] - .5)*unit, 0]
        if any(abs(a-b)>1e-6 for a,b in zip(center,expected_center)):
            errors.append('Cell order disagrees with its actual FreeCAD position')
        cx, cy = project(center, camera)
        if not (8 <= cx-unit*scale/2 and cx+unit*scale/2 <= image.shape[1]-9 and 8 <= cy-unit*scale/2 and cy+unit*scale/2 <= image.shape[0]-9):
            errors.append('Cell boundary is outside the image margin')
        half = unit * scale * .43
        x0, y0 = round(cx - half), round(cy - half)
        x1, y1 = round(cx + half), round(cy + half)
        patch = image[y0:y1, x0:x1]
        if patch.size == 0:
            errors.append('Cell is outside the image')
            continue
        motif = cell.get('pattern')
        if motif:
            mask = (np.max(patch, axis=2) < 90).astype(np.uint8)
            count, _, stats, centroids = cv2.connectedComponentsWithStats(mask)
            actual = [centroids[i] + [x0, y0] for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] > 8]
            expected = [project([center[0] + x * unit * 38 / 256, center[1] - y * unit * 38 / 256, center[2]], camera) for x, y in motif['points']]
            if len(actual) != len(expected) or any(min((np.linalg.norm(p - np.array(q)) for p in actual), default=1e6) > unit * scale * .04 for q in expected):
                errors.append('Cell %d dot geometry differs from rendered texture (%d vs %d dots)' % (index, len(actual), len(expected)))
        else:
            actual = np.median(patch.reshape(-1, 3), axis=0)
            expected = np.array(cell['color'][:3]) * 255
            if np.max(np.abs(actual - expected)) > 12:
                errors.append('Cell %d color does not match FreeCAD material' % index)
    expected_marker = [-unit/8 if geometry['marker'][0] == 0 else geometry['cols']*unit+unit/8,
                       geometry['rows']*unit+unit/8 if geometry['marker'][1] == 0 else -unit/8,0]
    if any(abs(a-b)>1e-6 for a,b in zip(geometry['markerCenter'],expected_marker)):
        errors.append('Marker corner disagrees with actual FreeCAD position')
    x, y = map(round, project(geometry['markerCenter'], camera))
    color = image[y, x]
    if not (color[0] > 200 and color[1] < 50 and color[2] < 50):
        errors.append('Recorded marker is not red at its projected location')
    return {'passed': not errors, 'errors': errors, 'minimumCellPixels': unit * scale}


def cube_pixels(raw):
    image = np.array(decode(raw['image']))
    expected = np.zeros(image.shape[:2], np.uint8)
    bounded = True
    visible = visibility(raw['geometry']['cubes'], raw['camera'])
    missing_edges, total_edges = 0, 0
    for cube, axes in zip(raw['geometry']['cubes'], visible['fullFaceAxes']):
        vertices = [project([cube[i] + delta[i] for i in range(3)], raw['camera']) for delta in itertools.product((0, 1), repeat=3)]
        bounded &= all(8 <= p[0] <= image.shape[1]-9 and 8 <= p[1] <= image.shape[0]-9 for p in vertices)
        hull = cv2.convexHull(np.round(vertices).astype(np.int32))
        cv2.fillConvexPoly(expected, hull, 1)
        for axis in axes:
            face_axes = [i for i in range(3) if i != axis]
            for edge_axis in face_axes:
                fixed_axis = next(i for i in face_axes if i != edge_axis)
                for side in (0,1):
                    for t in (.15,.35,.5,.65,.85):
                        p = list(cube)
                        p[axis] += 1 if raw['camera']['toward'][axis] > 0 else 0
                        p[fixed_axis] += side
                        p[edge_axis] += t
                        x,y = map(round,project(p,raw['camera']))
                        patch = image[max(0,y-2):y+3,max(0,x-2):x+3]
                        total_edges += 1
                        missing_edges += int(not patch.size or np.min(np.max(patch,axis=2)) > 90)
    actual = (np.min(image, axis=2) < 235).astype(np.uint8)
    kernel = np.ones((5, 5), np.uint8)
    unexplained = int(np.count_nonzero(actual & (1 - cv2.dilate(expected, kernel))))
    missing = int(np.count_nonzero(expected & (1 - cv2.dilate(actual, kernel))))
    union = max(1, int(np.count_nonzero(expected | actual)))
    error = (unexplained + missing) / union
    return {'passed': error < .003 and bounded and missing_edges == 0, 'allProjectedVerticesInsideImage': bounded, 'silhouetteMismatchFraction': error,
            'missingVisibleEdgeSamples': missing_edges, 'visibleEdgeSamples': total_edges,
            'projectedUnitPixels': image.shape[0] / raw['camera']['height']}


def composition_image(views, font_file):
    """Independent reconstruction of the documented upstream layout, not its function."""
    panels = [decode(view['image']) for view in views]
    width = sum(im.width for im in panels) + 3 * 70 + 200
    height = max(im.height for im in panels) + 260
    result = Image.new('RGB', (width, height), 'white')
    draw, font = ImageDraw.Draw(result), ImageFont.truetype(str(font_file), 60)
    x = 100
    for label, panel in zip(('Original', 'A', 'B', 'C'), panels):
        result.paste(panel, (x, 160))
        center = x + panel.width // 2
        box = draw.textbbox((center, 90), label, font=font)
        draw.text((center - (box[2] - box[0]) // 2, 90), label, fill='black', font=font)
        x += panel.width + 70
    return result
