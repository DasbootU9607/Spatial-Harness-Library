"""Recompute answers and validate captured model -> raw PNG -> operations -> composite."""
import copy
import base64
import hashlib
import json
import math
import re
import sys
from pathlib import Path
import numpy as np
from geometry import (PLANAR, ROTATIONS, connected, normalized, decorated, transform2,
                      transform3, relation2, relation3, reflect_screen, visibility)
from image_audit import decode, replay, crop_box, grid_pixels, cube_pixels, composition_image

HERE = Path(__file__).resolve().parent
D = 'All three other options are incorrect'


def expected_question(dimension, polarity, mode):
    if dimension == 2:
        return ('The left image shows a %s grid paper, with one corner marked by a red square. '
                'Which of the grid papers in the options can be obtained by only rotating the grid paper on the left? '
                'Please choose from options A, B, C, or D.') % ('patterned' if mode == 'patterned' else 'colored')
    return ('The left image is the original cube stack, made of identical cubes. '
            'Which of the cube stacks in the options %s be obtained by only rotating the original cube stack? '
            'Please choose from options A, B, C, or D. '
            'Every cube has at least one fully visible face in the displayed view.') % ('can' if polarity == 'can' else 'CANNOT')


def answer_for(views, dimension, polarity):
    relations = [(relation2(views[0]['geometry'], v['geometry']) if dimension == 2 else
                  relation3(views[0]['geometry']['cubes'], v['geometry']['cubes'])) for v in views[1:]]
    eligible = [i for i, r in enumerate(relations) if r['equivalent'] == (polarity == 'can')]
    explanations = []
    for i, relation in enumerate(relations):
        explanations.append({'label': 'ABC'[i], 'equivalent': relation['equivalent'], 'qualifies': i in eligible,
                             'explanation': relation['explanation'] + (' This %s the cannot-be-obtained condition.' % ('satisfies' if i in eligible else 'does not satisfy') if polarity == 'cannot' else '')})
    explanations.append({'label': 'D', 'qualifies': len(eligible) == 0,
                         'explanation': 'D means none of A, B, C satisfies the question. %d graphical option(s) satisfy it.' % len(eligible)})
    return {'index': eligible[0] if eligible else 3, 'eligible': eligible, 'options': explanations,
            'explanation': 'Select the unique %s model.' % ('rotation-equivalent' if polarity == 'can' else 'non-equivalent')}


def audit(payload, include_images=True):
    dimension, polarity = payload['dimension'], payload['polarity']
    pipeline = payload['pipeline']
    views, raw = pipeline['views'], pipeline['raw']
    checks = []
    def check(name, condition, detail=None):
        checks.append({'name': name, 'verdict': 'passed' if condition else 'failed', **({'detail': str(detail)} if detail is not None else {})})
    check('Supported dimensionality and polarity', dimension in (2, 3) and polarity in ('can', 'cannot') and (dimension == 3 or polarity == 'can'))
    check('Original and A-C in final compositor order', [v['label'] for v in views] == ['Original', 'A', 'B', 'C'])
    check('Official annotation has A-C plus requested text D', pipeline['annotation']['Choices'] == ['A', 'B', 'C', D])
    check('Exact supported question and single-view contract', payload['question'] == expected_question(dimension, polarity, payload['parameters'].get('mode')))
    official_question = expected_question(dimension, polarity, 'colored').replace(' Every cube has at least one fully visible face in the displayed view.', '')
    check('Official dispatch wording agrees with the delivered question', pipeline['annotation']['Question'] == official_question)
    manifest = json.loads((HERE.parent / 'vendor/SpatialViz-Bench-c27f9111a267/SOURCE.json').read_text())
    check('Pinned official source and actual FreeCAD version are recorded', pipeline['upstream'] == manifest and len(pipeline['freecadVersion']) >= 3)
    receipts = pipeline['modelAdaptations'] + pipeline['compositionAdaptations']
    check('Model, utilities and official dispatch adaptation receipts', len(receipts) == 4 and all(r['originalSha256'] == manifest['files'].get(r['file']) and re.fullmatch('[a-f0-9]{64}', r['adaptedSha256']) for r in receipts))
    question = payload['question'].lower()
    check('Question wording agrees with polarity', ('cannot' in question) == (polarity == 'cannot') and ('can' in question))
    valid = True
    for view in views:
        g = view['geometry']
        if dimension == 3:
            p = g['cubes']
            valid &= 4 <= len(p) <= 32 and all(len(x) == 3 and all(isinstance(v, (int, float)) and abs(v - round(v)) < 1e-6 for v in x) for x in p)
            valid &= len(set(map(tuple, p))) == len(p) and connected(p)
        else:
            valid &= 1 <= g['rows'] <= 8 and 1 <= g['cols'] <= 8 and len(g['cells']) == g['rows'] * g['cols']
            valid &= len(g['marker']) == 2 and g['marker'][0] in (0, g['cols']) and g['marker'][1] in (0, g['rows'])
    check('Valid decorated grids or unique face-connected unit cubes', valid)
    computed = answer_for(views, dimension, polarity)
    check('Independent rotation group yields exactly one A-C answer', len(computed['eligible']) == 1, computed['eligible'])
    check('Official output label agrees with independent answer', pipeline['annotation']['Answer'] == 'ABCD'[computed['index']])
    check('Final answer and all explanations are independently reproducible', payload['answer'] == {k: v for k, v in computed.items() if k != 'eligible'})
    signatures = [decorated(v['geometry']) if dimension == 2 else normalized(v['geometry']['cubes']) for v in views[1:]]
    check('No duplicate displayed structural options', len(set(map(str, signatures))) == 3)
    for view in views:
        source = raw[view['rawName']]
        camera = source['camera']
        ideal = ([[math.sqrt(.5), math.sqrt(.5), 0], [-1/math.sqrt(6), 1/math.sqrt(6), 2/math.sqrt(6)], [1/math.sqrt(3), -1/math.sqrt(3), 1/math.sqrt(3)]] if dimension == 3 else [[1,0,0],[0,1,0],[0,0,1]])
        check(view['label'] + ' supported settled orthographic camera', camera['projection'] == 'orthographic' and camera['height'] > 0 and all(abs(a-b) < 1e-5 for k, target in zip(('right','up','toward'),ideal) for a,b in zip(camera[k],target)))
        check(view['label'] + ' only traced official image operations', bool(view['operations']) and view['operations'][0] == {'kind': 'crop', 'box': crop_box(decode(source['image']))} and all(o['kind'] in ('rotate','flip') for o in view['operations'][1:]))
        geometry = copy.deepcopy(source['geometry'])
        for op in view['operations']:
            if op['kind'] == 'rotate':
                assert dimension == 2 and op['degreesClockwise'] in (90, 180, 270)
                geometry = transform2(geometry, PLANAR[op['degreesClockwise'] // 90])
            elif op['kind'] == 'flip':
                assert op['axis'] in ('horizontal', 'vertical')
                geometry = (transform2(geometry, [[-1, 0], [0, 1]] if op['axis'] == 'horizontal' else [[1, 0], [0, -1]]) if dimension == 2 else
                            {'cubes': reflect_screen(geometry['cubes'], source['camera'], op['axis'])})
        check(view['label'] + ' structure follows actual image transforms', decorated(geometry) == decorated(view['geometry']) if dimension == 2 else normalized(geometry['cubes']) == normalized(view['geometry']['cubes']))
        if include_images:
            check(view['label'] + ' pixels exactly replay official crop/rotation/reflection', np.array_equal(np.array(replay(decode(source['image']), view['operations'])), np.array(decode(view['image']))))
        if dimension == 3:
            observed = visibility(view['geometry']['cubes'], source['camera'])
            check(view['label'] + ' every cube has a fully visible face in its single view', observed['allCubesHaveFullFace'], observed['fullFaceAxes'])
            if view['label'] != 'Original' and not computed['options']['ABC'.index(view['label'])]['equivalent']:
                original = views[0]['geometry']['cubes']
                possible = [visibility(transform3(original, m), source['camera'])['signature'] for m in ROTATIONS]
                check(view['label'] + ' difference changes visible face evidence under every proper rotation', observed['signature'] not in possible)
    if include_images:
        used = set(v['rawName'] for v in views)
        for name in used:
            r = cube_pixels(raw[name]) if dimension == 3 else grid_pixels(raw[name])
            check('FreeCAD model-to-pixel correspondence: ' + name, r['passed'], r)
        check('A-C panels have distinct pixel arrays', len({hashlib.sha256(np.array(decode(v['image'])).tobytes()).hexdigest() for v in views[1:]}) == 3)
        expected = composition_image(views, HERE / 'assets/DejaVuSans-Bold.ttf')
        check('Final PNG exactly matches independent reconstruction of official layout and labels', np.array_equal(np.array(expected), np.array(decode(pipeline['finalImage']))))
    return checks


def report(spec, candidate_id, fingerprints):
    checks = []
    try:
        checks = audit(spec)
        assert spec['options'] == [{'label': v['label'], 'type': 'figure', 'geometry': v['geometry']} for v in spec['pipeline']['views'][1:]] + [{'label': 'D', 'type': 'text', 'text': D}], 'Final labels differ from composited image'
        assert spec['geometry'] == spec['pipeline']['views'][0]['geometry'], 'Original structure differs'
        assert spec['rendering']['image'] == spec['pipeline']['finalImage'], 'Rendered image differs'
        assert spec['provenance']['generationMethod'] == 'SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline', 'Wrong source method'
        assert spec['contract'] == {'answerMode': 'unique-A-C', 'graphicalOptions': 3, 'textOptionD': D, 'properRotations': 4 if spec['dimension'] == 2 else 24, 'reflection': False}, 'Wrong rotation contract'
        assert spec['generator']['parameters'] == spec['parameters'] and spec['generator']['seed'] == spec['seed'], 'Parameter provenance drift'
        if 'cad' in spec['pipeline']:
            cad = spec['pipeline']['cad']
            assert hashlib.sha256(base64.b64decode(cad['base64'], validate=True)).hexdigest() == cad['sha256'], 'CAD digest mismatch'
        checks.append({'name': 'Delivered labels, structure and final rendering agree', 'verdict': 'passed'})
    except Exception as error:
        checks.append({'name': 'Well-formed traceable official-pipeline task', 'verdict': 'failed', 'detail': str(error)})
    return {'schemaVersion': 1, 'candidateId': candidate_id, 'testedFingerprints': fingerprints,
            'verifier': spec.get('verifier'), 'checks': checks,
            'verdict': 'passed' if checks and all(c['verdict'] == 'passed' for c in checks) else 'failed',
            'scope': 'Independent four/24-rotation geometry, label/polarity uniqueness, connectivity, FreeCAD geometry-to-pixel correspondence, exact image-operation and compositor replay, full-face visibility and visible non-equivalence. Human visual review is additionally required; no universal single-view reconstruction or difficulty claim.'}


if __name__ == '__main__':
    spec_file, candidate_id, fp_file, output_file = sys.argv[1:]
    result = report(json.loads(Path(spec_file).read_text()), candidate_id, json.loads(Path(fp_file).read_text()))
    Path(output_file).write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'verdict': result['verdict'], 'failed': [c for c in result['checks'] if c['verdict'] != 'passed']}))
    sys.exit(0 if result['verdict'] == 'passed' else 1)
