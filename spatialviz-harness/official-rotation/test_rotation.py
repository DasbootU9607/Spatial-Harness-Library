"""Independent adversarial regressions and replay of real published FreeCAD output."""
import copy
import base64
import io
import hashlib
import itertools
import json
import math
import unittest
from pathlib import Path
from geometry import (ROTATIONS, PLANAR, connected, relation2, relation3, transform2,
                      transform3, reflect_screen, visibility)
from verify import audit, answer_for
from image_audit import decode, grid_pixels, cube_pixels

ROOT = Path(__file__).resolve().parents[2]
CAMERA = {'right': [math.sqrt(.5),math.sqrt(.5),0], 'up': [-1/math.sqrt(6),1/math.sqrt(6),2/math.sqrt(6)], 'toward': [1/math.sqrt(3),-1/math.sqrt(3),1/math.sqrt(3)]}


def grid():
    return {'rows': 2, 'cols': 3, 'marker': [0,0], 'cells': [
        {'color':[i/10, .5, .8], 'pattern':{'kind':'dots','points':[[0,0],[1,0],[0,2]]} if i == 0 else None} for i in range(6)]}


class GeometryTests(unittest.TestCase):
    def test_four_rectangular_rotations_move_all_decorations(self):
        g=grid()
        for i,m in enumerate(PLANAR):
            b=transform2(g,m)
            self.assertTrue(relation2(g,b)['equivalent'])
            self.assertEqual((b['rows'],b['cols']), (3,2) if i%2 else (2,3))
        self.assertEqual(transform2(g,PLANAR[1])['marker'],[2,0])

    def test_local_orientation_swap_and_corner_edits(self):
        g=grid()
        for edit in ('motif','swap','corner'):
            b=copy.deepcopy(g)
            if edit=='motif': b['cells'][0]['pattern']['points']=[[0,0],[0,1],[-2,0]]
            if edit=='swap': b['cells'][0],b['cells'][1]=b['cells'][1],b['cells'][0]
            if edit=='corner': b['marker']=[3,2]
            self.assertFalse(relation2(g,b)['equivalent'],edit)

    def test_reflection_labels_do_not_establish_inequivalence(self):
        g=grid()
        for c in g['cells']: c.update(color=[.5,.5,.5],pattern=None)
        # Rectangle plus one corner has a reflection equivalent to a half turn.
        self.assertTrue(relation2(g,transform2(g,[[-1,0],[0,-1]]))['equivalent'])
        square={'rows':2,'cols':2,'marker':[0,0],'cells':[g['cells'][0]]*4}
        self.assertTrue(relation2(square,transform2(square,[[-1,0],[0,1]]))['equivalent'])
        self.assertFalse(relation2(grid(),transform2(grid(),[[-1,0],[0,1]]))['equivalent'])

    def test_24_proper_rotations_and_translation(self):
        self.assertEqual(len({str(m) for m in ROTATIONS}),24)
        cubes=[[0,0,0],[1,0,0],[2,0,0],[2,1,0],[2,1,1]]
        for m in ROTATIONS:
            moved=[[x+17,y-12,z+5] for x,y,z in transform3(cubes,m)]
            self.assertTrue(relation3(cubes,moved)['equivalent'])

    def test_chiral_and_symmetric_mirrors(self):
        chiral=[[0,0,0],[1,0,0],[2,0,0],[2,1,0],[2,1,1]]
        self.assertFalse(relation3(chiral,reflect_screen(chiral,CAMERA,'horizontal'))['equivalent'])
        symmetric=list(itertools.product(range(2),repeat=3))
        self.assertTrue(relation3(symmetric,reflect_screen(symmetric,CAMERA,'horizontal'))['equivalent'])
        with self.assertRaisesRegex(ValueError,'not a lattice'): reflect_screen(chiral,CAMERA,'vertical')

    def test_connectivity_and_equal_count_edit(self):
        a=[[0,0,0],[1,0,0],[2,0,0],[3,0,0],[3,1,0]]
        b=[[0,0,0],[1,0,0],[2,0,0],[2,1,0],[2,2,0]]
        self.assertTrue(connected(a) and connected(b))
        self.assertFalse(relation3(a,b)['equivalent'])
        self.assertFalse(connected([[0,0,0],[1,1,0]]))
        self.assertFalse(connected([a[0]]+a[2:]))

    def test_single_view_rejects_hidden_cubes(self):
        self.assertFalse(visibility(list(itertools.product(range(2),repeat=3)),CAMERA)['allCubesHaveFullFace'])
        self.assertTrue(visibility([[0,0,0],[1,0,0],[2,0,0]],CAMERA)['allCubesHaveFullFace'])

    def test_multiple_answers_and_question_polarity(self):
        g=grid(); views=[{'geometry':g}]+[{'geometry':transform2(g,m)} for m in PLANAR[1:]]
        self.assertEqual(answer_for(views,2,'can')['eligible'],[0,1,2])
        a=[[0,0,0],[1,0,0],[2,0,0],[3,0,0],[3,1,0]]
        b=a[:-1]
        views=[{'geometry':{'cubes':x}} for x in (a,a,a,b)]
        self.assertEqual(answer_for(views,3,'cannot')['eligible'],[2])


class RealArtifactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tasks=[]
        for file in (ROOT/'spatialviz-harness/site/records').glob('*/task.json'):
            task=json.loads(file.read_text(encoding='utf-8'))
            if task.get('rendering',{}).get('presentation')=='official-single-view': cls.tasks.append(task)

    def test_pinned_source_is_byte_preserved(self):
        vendor=ROOT/'spatialviz-harness/vendor/SpatialViz-Bench-c27f9111a267'
        manifest=json.loads((vendor/'SOURCE.json').read_text())
        for file,digest in manifest['files'].items():
            self.assertEqual(hashlib.sha256((vendor/file).read_bytes()).hexdigest(),digest)

    def test_all_committed_freecad_outputs(self):
        for task in self.tasks:
            with self.subTest(title=task['title']):
                self.assertEqual([c for c in audit(task) if c['verdict']!='passed'],[])

    def test_tampered_labels_question_and_structures(self):
        for task in self.tasks:
            for mutation in ('label','question','answer','structure','flip'):
                s=copy.deepcopy(task)
                if mutation=='label': s['pipeline']['views'][1]['label']='C'
                if mutation=='question': s['question']='Which cannot be obtained?'
                if mutation=='answer': s['answer']['index']=(s['answer']['index']+1)%3
                if mutation=='structure':
                    g=s['pipeline']['views'][1]['geometry']
                    if s['dimension']==2: g['marker']=[-1,-1]
                    else: g['cubes'][0]=[99,99,99]
                if mutation=='flip': s['pipeline']['views'][1]['operations'].append({'kind':'flip','axis':'vertical'})
                try: failed=any(c['verdict']!='passed' for c in audit(s,include_images=False))
                except (ValueError,AssertionError,KeyError): failed=True
                self.assertTrue(failed,mutation)

    def test_png_and_crop_tampering_rejected(self):
        for task in self.tasks:
            s=copy.deepcopy(task);s['pipeline']['finalImage']['sha256']='0'*64
            with self.assertRaises(AssertionError): audit(s)
            s=copy.deepcopy(task);s['pipeline']['views'][1]['operations'][0]['box'][0]+=1
            with self.assertRaises(AssertionError): audit(s)
            s=copy.deepcopy(task);image=decode(s['pipeline']['finalImage']);image.putpixel((0,0),(0,0,0))
            buffer=io.BytesIO();image.save(buffer,format='PNG');data=buffer.getvalue()
            s['pipeline']['finalImage'].update(pngBase64=base64.b64encode(data).decode(),sha256=hashlib.sha256(data).hexdigest())
            self.assertTrue(any(c['verdict']!='passed' for c in audit(s)))

    def test_semantic_positions_and_image_frame_are_bound(self):
        for task in self.tasks:
            raw=copy.deepcopy(task['pipeline']['raw'][task['pipeline']['views'][0]['rawName']])
            if task['dimension']==2:
                raw['geometry']['cells'][0],raw['geometry']['cells'][-1]=raw['geometry']['cells'][-1],raw['geometry']['cells'][0]
                self.assertFalse(grid_pixels(raw)['passed'])
                raw=copy.deepcopy(task['pipeline']['raw'][task['pipeline']['views'][0]['rawName']])
                raw['geometry']['marker']=[raw['geometry']['cols']-raw['geometry']['marker'][0],raw['geometry']['marker'][1]]
                self.assertFalse(grid_pixels(raw)['passed'])
            else:
                raw['camera']['height']/=2
                self.assertFalse(cube_pixels(raw)['allProjectedVerticesInsideImage'])


if __name__=='__main__': unittest.main()
