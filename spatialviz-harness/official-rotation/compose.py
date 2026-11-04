"""Invoke the official generate_data dispatch and its original compositor."""
import copy
import contextlib
import json
import random
import re
import shutil
import sys
from pathlib import Path
import numpy as np
from upstream import load
from geometry import PLANAR, transform2, reflect_screen
from image_audit import image_record, decode, crop_box, replay

HERE = Path(__file__).resolve().parent
D = 'All three other options are incorrect'


def build(raw_directory, metadata, dimension, polarity, selection_seed, directory):
    directory = Path(directory).resolve()
    parent = directory / 'MentalRotation' / ('2DRotation' if dimension == 2 else '3DRotation') / 'Authored'
    folder = parent / '0-new-construction'
    folder.mkdir(parents=True, exist_ok=False)
    raw = copy.deepcopy(metadata['raw'])
    for name, record in raw.items():
        file = Path(raw_directory) / name
        shutil.copyfile(file, folder / name)
        record['image'] = image_record(file)
    utilities, u_receipt = load('create_freecad/utils.py', replacements=[
        ("image_path.split('.')[0]", 'os.path.splitext(image_path)[0]', 'Handle dotted workspace directories without truncating the filename')], name='utils')
    sys.modules['utils'] = utilities
    tasks, t_receipt = load('create_freecad/mental_rotation_tasks_utils.py', {'FONT_FILE': str(HERE / 'assets/DejaVuSans-Bold.ttf')}, replacements=[
        ('ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)', 'ImageFont.truetype(FONT_FILE, font_size)', 'Use the packaged licensed upstream-named font on Windows'),
        ('"None of the above"', repr(D), 'Use the requested benchmark D wording'),
        ('explanations[choices[2]] = "Option {choices[2]}', 'explanations[choices[2]] = f"Option {choices[2]}', 'Expand the removed-cube answer label'),
        ('explanations[answer] = "Option {answer}', 'explanations[answer] = f"Option {answer}', 'Expand the negative-question answer label'),
        ('{h_rotation} degrees and then flipping it horizontally.', '{h_rotation} degrees and then flipping it vertically.', 'Describe actual cv2.flip axis 0 despite the upstream filename'),
        ('{v_rotation} degrees and then flipping it vertically.', '{v_rotation} degrees and then flipping it horizontally.', 'Describe actual cv2.flip axis 1 despite the upstream filename'),
        ('explanations[choices[i+1]] = "Option {choices[i+1]}', 'explanations[choices[i+1]] = f"Option {choices[i+1]}', 'Expand the local-pattern answer label'),
        ('png_paths = os.listdir(folder_path)', 'png_paths = sorted(f for f in os.listdir(folder_path) if f.endswith(".png"))', 'Deterministic image-only traversal'),
        ('[f for f in os.listdir(folder_path) if f.endswith', '[f for f in sorted(os.listdir(folder_path)) if f.endswith', 'Deterministic option file traversal')], name='mental_rotation_tasks_utils')
    sys.modules['mental_rotation_tasks_utils'] = tasks
    random.seed(selection_seed)
    selected = ('prepare_composite_image_2DRotation(dir_path)' if dimension == 2 else
                'prepare_composite_image_3DRotation(dir_path, mode=%d)' % (1 if polarity == 'can' else 0))
    dispatch_patches = [
        ('from metal_folding_tasks_utils import *', '# Unrelated folding tasks are not dispatched', 'Avoid unrelated task imports'),
        ('from visual_penetration_tasks_utils import *', '# Unrelated penetration tasks are not dispatched', 'Avoid unrelated task imports'),
        ('from mental_animation_tasks_utils import *', '# Unrelated animation tasks are not dispatched', 'Avoid unrelated task imports'),
        ('save_folder = "path/to/save"', 'save_folder = ' + repr(str(parent)), 'Parameterize the official dispatch input folder'),
        ('# ' + selected, selected, 'Activate exactly the requested official rotation task')]
    with (directory / 'official-composition.log').open('w', encoding='utf-8') as log, contextlib.redirect_stdout(log):
        _, entry_receipt = load('create_freecad/generate_data.py', replacements=dispatch_patches)
    annotation = json.loads((folder / 'data.json').read_text())[0]
    base_name = next(name for name in raw if 'transform' not in name) if dimension == 2 else 'original.png'
    panels = []
    for label in ('Original', 'A', 'B', 'C'):
        files = [p for p in folder.glob('*.png') if (p.stem == 'original' or p.stem.endswith('_original'))] if label == 'Original' else [p for p in folder.glob('*.png') if p.stem.endswith('_' + label)]
        if len(files) != 1:
            raise ValueError('Composite label does not identify exactly one image: ' + label)
        file = files[0]
        operations, name = [], base_name
        if label != 'Original':
            stem = file.stem[:-2]
            if dimension == 2:
                if stem.endswith('incorrect_transform'):
                    name = stem + '.png'
                else:
                    match = re.search(r'_(90|180|270)_(rotated|horizontal|vertical)$', stem)
                    if not match:
                        raise ValueError('Unknown official planar image transform: ' + stem)
                    operations.append({'kind': 'rotate', 'degreesClockwise': int(match[1])})
                    if match[2] != 'rotated':
                        # Upstream filename horizontal uses cv2.flip(..., 0), i.e. vertical.
                        operations.append({'kind': 'flip', 'axis': 'vertical' if match[2] == 'horizontal' else 'horizontal'})
            elif stem in ('horizontal', 'vertical'):
                operations.append({'kind': 'flip', 'axis': stem})
            else:
                name = stem + '.png'
        operations.insert(0, {'kind': 'crop', 'box': crop_box(decode(raw[name]['image']))})
        image = image_record(file)
        expected = replay(decode(raw[name]['image']), operations)
        if not np.array_equal(np.array(expected), np.array(decode(image))):
            raise ValueError('Official output pixels disagree with traced operations')
        geometry = copy.deepcopy(raw[name]['geometry'])
        for op in operations:
            if op['kind'] == 'rotate':
                geometry = transform2(geometry, PLANAR[op['degreesClockwise'] // 90])
            elif op['kind'] == 'flip':
                if dimension == 2:
                    geometry = transform2(geometry, [[-1, 0], [0, 1]] if op['axis'] == 'horizontal' else [[1, 0], [0, -1]])
                else:
                    geometry = {'cubes': reflect_screen(geometry['cubes'], raw[name]['camera'], op['axis'])}
        panels.append({'label': label, 'rawName': name, 'operations': operations, 'geometry': geometry, 'image': image})
    return {'raw': raw, 'views': panels, 'annotation': annotation,
            'finalImage': image_record(folder / (folder.name + '.png')),
            'compositionAdaptations': [u_receipt, t_receipt, entry_receipt], 'selectionSeed': selection_seed}
