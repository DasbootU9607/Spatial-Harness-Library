"""Executed by a macro inside the real FreeCAD GUI application, never host Python."""
import json
import random
import re
import time
import traceback
from pathlib import Path
from types import SimpleNamespace

import FreeCAD as App
import FreeCADGui as Gui
from PySide import QtCore
from upstream import load


def vector(v):
    return [float(v.x), float(v.y), float(v.z)]


def run(job_file):
    job = json.loads(Path(job_file).read_text(encoding='utf-8'))
    output = Path(job['output'])
    output.mkdir(parents=True, exist_ok=True)
    records, adaptations = {}, []
    params = job['parameters']

    def settle(view):
        # Upstream saves immediately after viewTop/viewIsometric. Finish the GUI animation.
        for _ in range(50):
            Gui.updateGui()
            time.sleep(.015)
        view.setCameraType('Orthographic')
        view.fitAll()
        Gui.updateGui()

    def capture(view, image_path, document):
        document.recompute()
        settle(view)
        rotation = view.getCameraOrientation()
        camera = view.getCamera()
        number = r'([-+\d.eE]+)'
        position = [float(x) for x in re.search(r'position\s+' + '\\s+'.join([number] * 3), camera).groups()]
        height = float(re.search(r'height\s+' + number, camera).group(1))
        # fitAll uses the GUI viewport aspect, whereas saveImage uses 1280x1024.
        # Fit the actual visible bounds into that output aspect with a 24px margin.
        right, up = vector(rotation.multVec(App.Vector(1,0,0))), vector(rotation.multVec(App.Vector(0,1,0)))
        factor = 1.0
        for obj in document.Objects:
            if hasattr(obj, 'Shape') and obj.ViewObject.Visibility:
                box = obj.Shape.BoundBox
                for x in (box.XMin,box.XMax):
                    for y in (box.YMin,box.YMax):
                        for z in (box.ZMin,box.ZMax):
                            delta = [x-position[0],y-position[1],z-position[2]]
                            factor = max(factor,abs(sum(a*b for a,b in zip(delta,right)))*1024/height/616,
                                         abs(sum(a*b for a,b in zip(delta,up)))*1024/height/488)
        if factor > 1:
            height *= factor * 1.001
            view.setCamera(re.sub(r'height\s+' + number, 'height %.12g' % height, camera))
            Gui.updateGui()
        record = {'camera': {'quaternion': list(rotation.Q), 'position': position, 'height': height,
                             'right': vector(rotation.multVec(App.Vector(1, 0, 0))),
                             'up': vector(rotation.multVec(App.Vector(0, 1, 0))),
                             'toward': vector(rotation.multVec(App.Vector(0, 0, 1))),
                             'projection': 'orthographic'}, 'width': 1280, 'height': 1024}
        if job['dimension'] == 3:
            cubes, placements = [], []
            for obj in document.Objects:
                if hasattr(obj, 'Shape') and obj.ViewObject.Visibility:
                    placements.append({'object': obj.Name, 'matrix': list(obj.Placement.toMatrix().A)})
                    for solid in obj.Shape.Solids:
                        box = solid.BoundBox
                        if max(abs(x - 1) for x in (box.XLength, box.YLength, box.ZLength)) > 1e-5:
                            raise ValueError('Rendered solid is not an axis-aligned unit cube')
                        cubes.append([round(box.XMin), round(box.YMin), round(box.ZMin)])
            record.update(geometry={'cubes': cubes}, placements=placements)
        else:
            rows, cols = params['rows'], params['cols']
            cells = []
            for r in range(rows):
                for c in range(cols):
                    obj = document.getObject('Square_%d_%d' % (r, c))
                    plane = document.getObject('Image_%d_%d' % (r, c))
                    motif = None
                    if plane:
                        motif = job['patterns'][plane.PatternKey]
                    cells.append({'color': [round(float(x), 6) for x in obj.ViewObject.ShapeColor],
                                  'pattern': motif, 'center': vector(obj.Shape.CenterOfMass)})
            marker = document.getObject('Corner_Marker')
            box = marker.Shape.BoundBox
            corner = [0 if box.XMin < 0 else cols, 0 if box.YMin >= rows * 12 else rows]
            record['geometry'] = {'rows': rows, 'cols': cols, 'cells': cells, 'marker': corner,
                                  'markerCenter': vector(marker.Shape.CenterOfMass), 'unit': 12}
        # Same FreeCAD saveImage renderer as upstream; explicit white background is portable.
        view.saveImage(str(image_path), 1280, 1024, 'White')
        records[Path(image_path).name] = record

    try:
        window = Gui.getMainWindow()
        window.setAttribute(QtCore.Qt.WA_DontShowOnScreen, True)
        window.show()
        Gui.activateWorkbench('PartWorkbench')
        preferences = App.ParamGet('User parameter:BaseApp/Preferences/View')
        preferences.SetBool('Simple', True)
        preferences.SetBool('Gradient', False)
        preferences.SetUnsigned('BackgroundColor', 4294967295)
        preferences.SetBool('ShowNaviCube', False)
        preferences.SetBool('ShowAxisCross', False)
        random.seed(job['seed'])
        common = [('view.saveImage(image_path, 1280, 1024)', 'capture(view, image_path, doc)',
                   'Export actual document geometry and settled camera at each official saveImage boundary')]
        if job['dimension'] == 2:
            complex_mode = params['mode'] == 'patterned'
            file = 'create_freecad/create_mental_rotation/create_2D_rotation' + ('_complex' if complex_mode else '') + '.py'
            replacements = common + [('red_obj.ViewObject.DiffuseColor = (1.0, 0.0, 0.0)',
                                      'red_obj.ViewObject.DiffuseColor = [(1.0, 0.0, 0.0)]',
                                      'FreeCAD 1.0 DiffuseColor sequence compatibility'),
                                     ('plane.ImageFile = image_paths[image_name]',
                                      'plane.ImageFile = image_paths[image_name]; plane.addProperty("App::PropertyString", "PatternKey"); plane.PatternKey = image_name',
                                      'Retain texture identity before FreeCAD renames its embedded copy'),
                                     ('plane.ImageFile = image_paths[f"{image_name}_0"]',
                                      'plane.ImageFile = image_paths[f"{image_name}_0"]; plane.addProperty("App::PropertyString", "PatternKey"); plane.PatternKey = f"{image_name}_0"',
                                      'Retain the rotated texture identity')] if complex_mode else common
            module, receipt = load(file, {'App': App, 'capture': capture}, replacements)
            adaptations.append(receipt)
            matrix = params.get('matrix') or [[random.randint(0, 1) for _ in range(params['cols'])] for _ in range(params['rows'])]
            if complex_mode:
                paths = {k: str(Path(job['patternDirectory']) / (k + '.png')) for k in job['patterns']}
                record = []
                module.create_squares(matrix, str(output), paths, unit_size=12, marker_size=3, save_name='grid', record=record)
                if set(record) & {'2', '3', '6'}:
                    module.create_squares(matrix, str(output), paths, unit_size=12, marker_size=3, save_name='grid', mode=1, record=record.copy())
            else:
                module.create_squares(matrix, str(output), unit_size=12, marker_size=3, save_name='grid')
        else:
            file = 'create_freecad/create_mental_rotation/create_3D_rotation.py'
            replacements = common + [
                ('{i}-{actual_space_size_x}', '{generated}-{actual_space_size_x}', 'Fix undefined sample counter i'),
                ('[(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]',
                 '[(-1, 0), (1, 0), (0, -1), (0, 1)]', 'Require face connectivity instead of diagonal base contact'),
                ('x += dx\n                    y += dy', 'x += dx', 'Connect base regions by face-adjacent Manhattan steps'),
                ('if solids_count < 8 or solids_count > 10:', 'if solids_count < args.cube_range[0] or solids_count > args.cube_range[1]:',
                 'Expose the official 8-10 cube filter as a parameter'),
                ('            continue \n', '            App.closeDocument(doc.Name)\n            continue \n', 'Close rejected documents'),
                ('while generated < args.num_samples:', 'attempts = 0\n    while generated < args.num_samples:\n        attempts += 1\n        if attempts > 200:\n            raise RuntimeError("Official model generation exhausted 200 attempts")', 'Bound upstream rejection loop'),
            ]
            text_marker = '        # Generate cubes in a random structure'
            if params.get('cubes'):
                from upstream import patched
                text, _ = patched(file)
                start, end = text.index(text_marker), text.index('        # Connect any isolated regions')
                replacements.append((text[start:end], '        for x, y, z in args.cubes:\n            create_cube(x, y, z, placement_space, doc, cube_size)\n\n', 'Optional structured coordinates still use official create_cube and compound/render pipeline'))
                replacements.append(('        connect_isolated_cubes(placement_space, space_size_x, space_size_y, doc, cube_size)',
                                     '        if not args.cubes:\n            connect_isolated_cubes(placement_space, space_size_x, space_size_y, doc, cube_size)',
                                     'Preserve explicitly supplied face-connected coordinates without adding base-layer cubes'))
            module, receipt = load(file, {'capture': capture}, replacements)
            adaptations.append(receipt)
            args = SimpleNamespace(save_folder=str(output), space_size=params['spaceSize'], num_samples=1,
                                   cube_range=params['cubeRange'], cubes=params.get('cubes'))
            module.main(args)
            # Upstream puts one sample in a parameter-named child directory.
            child = next(p for p in output.iterdir() if p.is_dir())
            for p in child.glob('*.png'):
                p.replace(output / p.name)
        if App.ActiveDocument:
            App.ActiveDocument.saveAs(str(output / 'construction.FCStd'))
        result = {'status': 'rendered', 'freecadVersion': App.Version(), 'seed': job['seed'],
                  'parameters': params, 'raw': records, 'adaptations': adaptations,
                  'runtimeAdjustments': ['Initialized GUI off screen', 'Waited for camera animation',
                                         'Orthographic projection', 'Fit visible bounds to output aspect with 24-pixel margin', 'White image background', '12-unit 2D cells and 3-unit marker']}
        (output / 'render.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    except Exception:
        (output / 'error.txt').write_text(traceback.format_exc(), encoding='utf-8')
    finally:
        for name in list(App.listDocuments()):
            App.closeDocument(name)
        QtCore.QTimer.singleShot(200, QtCore.QCoreApplication.quit)
