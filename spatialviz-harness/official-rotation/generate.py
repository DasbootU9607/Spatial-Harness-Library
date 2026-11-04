"""Bounded construction controller around actual official FreeCAD and composition calls."""
import argparse
import base64
import json
import math
import random
from pathlib import Path
from runner import launch, sha
from compose import build
from geometry import normalized, connected, visibility, relation3, reflect_screen
from verify import answer_for, audit

CAMERA = {'right': [math.sqrt(.5), math.sqrt(.5), 0],
          'up': [-1 / math.sqrt(6), 1 / math.sqrt(6), 2 / math.sqrt(6)],
          'toward': [1 / math.sqrt(3), -1 / math.sqrt(3), 1 / math.sqrt(3)]}


def propose(seed, count, need_chiral):
    """Supply new coordinates to upstream create_cube; no local object renderer exists."""
    rng = random.Random(seed)
    for _ in range(1000):
        cubes = [(0, 0, 0)]
        while len(cubes) < count:
            frontier = set()
            for p in cubes:
                for axis in range(3):
                    for delta in (-1, 1):
                        q = list(p)
                        q[axis] += delta
                        q = tuple(q)
                        if q not in cubes and all(max(v[i] for v in cubes + [q]) - min(v[i] for v in cubes + [q]) < 6 for i in range(3)):
                            frontier.add(q)
            cubes.append(rng.choice(sorted(frontier)))
        cubes = normalized(cubes)
        if any(max(p[i] for p in cubes) == 0 for i in range(3)):
            continue
        if not visibility(cubes, CAMERA)['allCubesHaveFullFace']:
            continue
        if need_chiral and relation3(cubes, reflect_screen(cubes, CAMERA, 'horizontal'))['equivalent']:
            continue
        return [list(map(int, p)) for p in cubes]
    raise ValueError('No legible connected construction within 1000 coordinate proposals')


def parameters(dimension, supplied):
    allowed = {'rows', 'cols', 'mode', 'matrix'} if dimension == 2 else {'count', 'polarity', 'cubes', 'spaceSize', 'cubeRange', 'sourceMode'}
    if set(supplied) - allowed:
        raise ValueError('Unsupported official-pipeline parameters: ' + str(set(supplied) - allowed))
    if dimension == 2:
        p = {'rows': 3, 'cols': 2, 'mode': 'colored', **supplied}
        assert all(isinstance(p[k], int) and 1 <= p[k] <= 8 for k in ('rows', 'cols')) and p['rows'] * p['cols'] >= 4
        assert p['mode'] in ('colored', 'patterned')
        if 'matrix' in p:
            assert len(p['matrix']) == p['rows'] and all(len(row) == p['cols'] and all(x in (0, 1) for x in row) for row in p['matrix'])
    else:
        p = {'count': 8, 'polarity': 'can', 'sourceMode': 'controlled-coordinates', **supplied}
        assert isinstance(p['count'], int) and 5 <= p['count'] <= 16 and p['polarity'] in ('can', 'cannot')
        assert p['sourceMode'] in ('controlled-coordinates', 'upstream-random')
        if p.get('cubes'):
            p['cubes'] = [list(map(int, q)) for q in p['cubes'] if len(q) == 3 and all(isinstance(v, int) for v in q)]
            assert len(p['cubes']) == len(supplied['cubes']) and 5 <= len(p['cubes']) <= 16
            assert len(set(map(tuple, p['cubes']))) == len(p['cubes']) and connected(p['cubes'])
            p['cubes'] = [list(map(int, q)) for q in normalized(p['cubes'])]
            assert all(max(q[i] for q in p['cubes']) < 6 for i in range(3))
        if p['sourceMode'] == 'upstream-random':
            p.setdefault('spaceSize', [3, 3, 2])
            p.setdefault('cubeRange', [8, 10])
            assert len(p['spaceSize']) == 3 and all(isinstance(x, int) and 1 <= x <= 6 for x in p['spaceSize'])
            assert len(p['cubeRange']) == 2 and 5 <= p['cubeRange'][0] <= p['cubeRange'][1] <= 16
    return p


def generate(dimension, seed, supplied, directory):
    directory = Path(directory).resolve()
    directory.mkdir(parents=True, exist_ok=False)
    requested = parameters(dimension, supplied)
    rejected = []
    for attempt in range(12):
        object_seed = seed + attempt * 7919
        p = dict(requested)
        if dimension == 3 and p['sourceMode'] == 'controlled-coordinates':
            p['cubes'] = requested.get('cubes') or propose(object_seed, p['count'], p['polarity'] == 'can')
            p['spaceSize'] = [1 + max(v[i] for v in p['cubes']) for i in range(3)]
            p['cubeRange'] = [len(p['cubes'])] * 2
        raw_dir = directory / ('object-%02d' % attempt)
        metadata = launch(dimension, object_seed, p, raw_dir)
        for selection in range(24):
            selection_seed = seed + 100003 * attempt + 104729 * selection
            try:
                composition = build(raw_dir / 'raw', metadata, dimension, p.get('polarity', 'can'), selection_seed,
                                    directory / ('composition-%02d-%02d' % (attempt, selection)))
                question = composition['annotation']['Question']
                if dimension == 2 and p['mode'] == 'patterned':
                    question = question.replace('colored grid paper', 'patterned grid paper')
                if dimension == 3:
                    question += ' Every cube has at least one fully visible face in the displayed view.'
                result = {'dimension': dimension, 'polarity': p.get('polarity', 'can'), 'question': question,
                          'parameters': requested, 'objectParameters': p, 'seed': seed, 'objectSeed': object_seed,
                          'pipeline': {**composition, 'freecadVersion': metadata['freecadVersion'],
                                       'runtimeDistribution': metadata['runtimeDistribution'], 'upstream': metadata['upstream'],
                                       'modelAdaptations': metadata['adaptations'], 'runtimeAdjustments': metadata['runtimeAdjustments'],
                                       'patternAssets': metadata['patterns']}}
                answer = answer_for(composition['views'], dimension, result['polarity'])
                result['answer'] = {k: v for k, v in answer.items() if k != 'eligible'}
                checks = audit(result)
                failed = [c for c in checks if c['verdict'] != 'passed']
                if failed:
                    (directory / ('rejected-%02d-%02d.json' % (attempt, selection))).write_text(json.dumps(result), encoding='utf-8')
                    raise ValueError(json.dumps(failed))
                cad = raw_dir / 'raw/construction.FCStd'
                result['pipeline']['cad'] = {'sha256': sha(cad), 'base64': base64.b64encode(cad.read_bytes()).decode()}
                result['rejections'] = rejected
                result['checks'] = checks
                (directory / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
                (directory / 'question.png').write_bytes(base64.b64decode(composition['finalImage']['pngBase64']))
                return result
            except (ValueError, AssertionError) as error:
                rejected.append({'objectAttempt': attempt, 'selectionAttempt': selection, 'objectSeed': object_seed,
                                 'selectionSeed': selection_seed, 'reason': str(error)})
                (directory / 'rejections.json').write_text(json.dumps(rejected, indent=2), encoding='utf-8')
                # Rotation cannot recover a hidden original cube; sample a new original immediately.
                if 'Original every cube' in str(error):
                    break
    raise RuntimeError('Official generation exhausted bounded resampling. Rejected artifacts retained at ' + str(directory))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dimension', type=int, required=True)
    parser.add_argument('--seed', type=int, required=True)
    parser.add_argument('--params', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = generate(args.dimension, args.seed, json.loads(args.params.read_text(encoding='utf-8-sig')), args.out)
    print(json.dumps({'accepted': True, 'dimension': args.dimension, 'answer': result['answer']['index'],
                      'objectSeed': result['objectSeed'], 'rejections': len(result['rejections'])}))
