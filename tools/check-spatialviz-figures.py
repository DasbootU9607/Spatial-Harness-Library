"""Extract and check the public diagrams for exhibited immutable worksheet builds."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HARNESS = ROOT / 'spatialviz-harness'
SITE = HARNESS / 'site'
sys.path.insert(0, str(HARNESS / 'official-folding'))
from artwork import decode
from verify import replay

sys.path.insert(0, str(HARNESS / 'skills/spatialviz-mechanical-system/scripts'))
from cad_plate import read_pixels


def read(path):
    return json.loads(path.read_bytes())


def original_diagram(task, image, record):
    kind = task['taskType']
    if kind in ('CubeReconstruction', 'CubeUnfolding'):
        panels = {k: decode(v) for k, v in task['pipeline']['panels'].items()}
        if len(panels) == 1:
            figure = panels['reference']
        else:
            figure = replay(panels, 'Cube' if kind == 'CubeUnfolding' else 'Cube Net')
        left = (image.width - figure.width) // 2
        assert image.crop((left, 0, left + figure.width, figure.height)).tobytes() == figure.tobytes()
        return figure
    if kind in ('BlockMoving', 'ArrowMoving', 'PaperFolding'):
        if kind == 'PaperFolding':
            width, height = task['pipeline']['figureDimensions']
            digest = task['pipeline']['figureDigest']
        else:
            width, height = image.width, task['rendering']['diagramHeight']
            digest = task['rendering']['diagramSha256']
        figure = image.crop((0, 0, width, height))
        assert hashlib.sha256(figure.tobytes()).hexdigest() == digest
        return figure
    if kind == 'MechanicalSystem':
        text = read_pixels(record)
        assert text['drive'] + ' ' + text['ask'] == task['question']
        assert text['facts'] == read(record.parent / 'geometry.json')['facts']
        assert text['options'] == [o['label'] + '  ' + o['text'] for o in task['options']]
        return image.crop((0, 90, image.width, 490))
    return None


def check(write=False):
    cases = {c['id']: c for c in read(ROOT / 'catalog/cases.json')['cases']}
    assets = SITE / 'figures'
    if write:
        assets.mkdir(exist_ok=True)
    total = 0
    for groups in read(ROOT / 'catalog/spatialviz-showcase.json').values():
        for group in groups:
            for case_id in group['cases']:
                item = cases[case_id]
                task = read(SITE / item['taskArtifact'])
                if task['rendering'].get('presentation') == 'diagram-only':
                    continue
                record = SITE / item['thumbnail']
                with Image.open(record) as source:
                    figure = original_diagram(task, source.convert('RGB'), record)
                if figure is None:
                    continue
                dest = assets / (case_id + '.png')
                if write:
                    figure.save(dest)
                with Image.open(dest) as delivered:
                    assert delivered.size == figure.size and delivered.convert('RGB').tobytes() == figure.tobytes(), case_id
                total += 1
    print(f'Checked {total} separate diagrams against their sealed renders.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='materialize the verified diagrams')
    check(parser.parse_args().write)
