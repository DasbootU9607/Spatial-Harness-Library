"""Host-side launcher; FreeCAD geometry/rendering runs in the GUI subprocess."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw
from upstream import ROOT, VENDOR

HERE = Path(__file__).resolve().parent


def sha(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def runtime():
    config = ROOT / '.harness/freecad-official/runtime.json'
    data = json.loads(config.read_text()) if config.exists() else {}
    exe = os.environ.get('SPATIALVIZ_FREECAD') or data.get('freecad') or shutil.which('FreeCAD') or shutil.which('freecad')
    if not exe or not Path(exe).is_file():
        raise RuntimeError('FreeCAD GUI executable unavailable. Set SPATIALVIZ_FREECAD to the real application; no SVG fallback is permitted.')
    return exe, data


def patterns(folder, mode='patterned'):
    # ImagePlane uses MODULATE: a white texel preserves its grey material.
    # A grey texture would multiply that material again and darken patterned cells.
    folder.mkdir(parents=True, exist_ok=True)
    if mode == 'geometric':
        from geometry import transform_motif
        motifs = {
            '1': {'segments': [], 'circles': [{'center': [0, 0], 'radius': 2.5}]},
            '2': {'segments': [[[-3.2, -3.2], [3.2, 3.2]]], 'circles': []},
            '3': {'segments': [[[-3.2, 3.2], [3.2, -3.2]]], 'circles': []},
            '4': {'segments': [[[-3.2, y], [3.2, y]] for y in (-1, 1)], 'circles': []},
            '5': {'segments': [[[x, -3.2], [x, 3.2]] for x in (-1, 1)], 'circles': []},
            '6': {'segments': [[[-3.2, -3.2], [3.2, 3.2]], [[-3.2, 3.2], [0, 0]]], 'circles': []}}
        for motif in motifs.values():
            motif['kind'] = 'geometric'
        for key in list(motifs):
            motifs[key + '_0'] = transform_motif(motifs[key], [[0, -1], [1, 0]])
        for key, motif in motifs.items():
            img = Image.new('RGB', (256, 256), 'white')
            draw = ImageDraw.Draw(img)
            def pixel(p):
                return tuple(128 + 38*v for v in p)
            for segment in motif['segments']:
                draw.line([pixel(p) for p in segment], fill='black', width=3)
            for circle in motif['circles']:
                x, y = pixel(circle['center']); r = 38*circle['radius']
                draw.ellipse((x-r, y-r, x+r, y+r), outline='black', width=3)
            img.save(folder / (key + '.png'))
            motif['assetSha256'] = sha(folder / (key + '.png'))
            motif['textureBackground'] = [255, 255, 255]
        return motifs
    points = {'1': [[0, 0]], '2': [[-2, 0], [2, 0]], '3': [[-2, -2], [-2, 2], [2, 2]],
              '4': [[-2, -2], [2, -2], [-2, 2], [2, 2]],
              '5': [[-2, -2], [2, -2], [0, 0], [-2, 2], [2, 2]],
              '6': [[-2, -2], [-2, 0], [-2, 2], [2, -2], [2, 0], [2, 2]]}
    for k in ('2', '3', '6'):
        points[k + '_0'] = [[-y, x] for x, y in points[k]]
    definitions = {}
    for name, dots in points.items():
        img = Image.new('RGB', (256, 256), 'white')
        draw = ImageDraw.Draw(img)
        for x, y in dots:
            cx, cy = 128 + x * 38, 128 + y * 38
            draw.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill='black')
        img.save(folder / (name + '.png'))
        definitions[name] = {'kind': 'dots', 'points': dots, 'assetSha256': sha(folder / (name + '.png')),
                             'textureBackground': [255, 255, 255]}
    return definitions


def launch(dimension, seed, parameters, directory):
    directory = Path(directory).resolve()
    directory.mkdir(parents=True, exist_ok=False)
    source_manifest = json.loads((VENDOR / 'SOURCE.json').read_text())
    for name, expected in source_manifest['files'].items():
        if sha(VENDOR / name) != expected:
            raise RuntimeError('Vendored source changed: ' + name)
    image_folder = directory / 'patterns'
    definitions = patterns(image_folder, parameters.get('mode')) if dimension == 2 else {}
    job = {'dimension': dimension, 'seed': seed, 'parameters': parameters, 'output': str(directory / 'raw'),
           'patternDirectory': str(image_folder), 'patterns': definitions}
    job_file = directory / 'job.json'
    job_file.write_text(json.dumps(job, indent=2), encoding='utf-8')
    macro = directory / 'execute.FCMacro'
    macro.write_text('import sys\nfrom PySide import QtCore\nsys.path.insert(0, %r)\nimport freecad_job\nQtCore.QTimer.singleShot(1200, lambda: freecad_job.run(%r))\n' % (str(HERE), str(job_file)), encoding='utf-8')
    exe, config = runtime()
    args = [exe, '--user-cfg', str(directory / 'user.cfg'), str(macro)]
    kwargs = {}
    if os.name == 'nt':
        startup = subprocess.STARTUPINFO()
        startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startup.wShowWindow = 0
        kwargs.update(startupinfo=startup, creationflags=subprocess.CREATE_NO_WINDOW)
    with (directory / 'freecad.log').open('wb') as log:
        process = subprocess.Popen(args, stdout=log, stderr=subprocess.STDOUT, **kwargs)
        try:
            code = process.wait(timeout=150)
        except subprocess.TimeoutExpired:
            process.terminate()
            process.wait(timeout=15)
            raise RuntimeError('FreeCAD GUI job exceeded 150 seconds; retained job and log: ' + str(directory))
    report = directory / 'raw/render.json'
    if not report.exists():
        error = directory / 'raw/error.txt'
        raise RuntimeError(error.read_text() if error.exists() else 'FreeCAD exited without rendering evidence; exit=%s, log=%s' % (code, directory / 'freecad.log'))
    result = json.loads(report.read_text())
    result['runtimeDistribution'] = ({k: v for k, v in config.items() if k != 'freecad'} if exe == config.get('freecad') else {'note': 'Executable selected by environment or PATH; actual application version is recorded separately.'})
    result['upstream'] = source_manifest
    result['patterns'] = definitions
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dimension', type=int, required=True)
    parser.add_argument('--seed', type=int, required=True)
    parser.add_argument('--params', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = launch(args.dimension, args.seed, json.loads(args.params.read_text(encoding='utf-8-sig')), args.out)
    (args.out / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'status': result['status'], 'views': list(result['raw']), 'version': result['freecadVersion']}))
