"""Regressions for audited grid families."""
import copy
import tempfile
import json
import unittest
import base64
import hashlib
import io
import numpy as np
from PIL import Image
from pathlib import Path
from generate import parameters
from geometry import PLANAR, decorated, relation2, transform2, motif_signature, project
from runner import patterns
from image_audit import grid_pixels, decode


class CoverageTests(unittest.TestCase):
    def test_real_freecad_uniform_backgrounds_for_both_families(self):
        for family in ('dots', 'geometric'):
            raw=json.loads((Path(__file__).parent/'fixtures'/('uniform-'+family+'-raw.json')).read_text(encoding='utf8'))
            report=grid_pixels(raw)
            self.assertTrue(report['passed'], report)
            self.assertTrue(report['uniformBackgroundChecked'])
            self.assertEqual(report['backgroundColors'], [[173,181,189]]*len(raw['geometry']['cells']))
        old=json.loads((Path(__file__).parent/'fixtures/geometric-raw.json').read_text(encoding='utf8'))
        self.assertTrue(grid_pixels(old)['passed'])
        self.assertFalse(grid_pixels(old, uniform_background=True)['passed'])

    def test_darkened_pattern_background_rejected_without_changing_marks(self):
        for family in ('dots', 'geometric'):
            raw=json.loads((Path(__file__).parent/'fixtures'/('uniform-'+family+'-raw.json')).read_text(encoding='utf8'))
            pixels=np.array(decode(raw['image']))
            cell=next(c for c in raw['geometry']['cells'] if c['pattern'])
            cx,cy=project(cell['center'],raw['camera'])
            half=raw['geometry']['unit']*pixels.shape[0]/raw['camera']['height']*.44
            patch=pixels[round(cy-half):round(cy+half),round(cx-half):round(cx+half)]
            patch[np.all(patch==[173,181,189],axis=2)]=[119,131,144]
            buffer=io.BytesIO();Image.fromarray(pixels).save(buffer,format='PNG');data=buffer.getvalue()
            raw['image'].update(sha256=hashlib.sha256(data).hexdigest(),pngBase64=base64.b64encode(data).decode())
            self.assertFalse(grid_pixels(raw)['passed'])
            for c in raw['geometry']['cells']:
                if c['pattern']: c['pattern'].pop('textureBackground')
            self.assertTrue(grid_pixels(raw)['passed'], 'The mutation must preserve motif geometry')

    def test_all_texture_variants_preserve_material_color(self):
        for family in ('patterned','geometric'):
            with tempfile.TemporaryDirectory() as d:
                definitions=patterns(Path(d),family)
                for key,motif in definitions.items():
                    self.assertEqual(motif['textureBackground'],[255]*3)
                    with Image.open(Path(d)/(key+'.png')) as texture:
                        self.assertEqual(texture.getpixel((0,0)),(255,255,255))
                        self.assertEqual(set(texture.getdata()),{(0,0,0),(255,255,255)})

    def test_real_freecad_geometric_pixels_and_tampering(self):
        raw=json.loads((Path(__file__).parent/'fixtures/geometric-raw.json').read_text(encoding='utf8'))
        self.assertTrue(grid_pixels(raw)['passed'])
        for mutation in ('diagonal','circle','branch'):
            r=copy.deepcopy(raw)
            if mutation=='diagonal': r['geometry']['cells'][1]['pattern']['segments']=[[[-3.2,3.2],[3.2,-3.2]]]
            if mutation=='circle': r['geometry']['cells'][2]['pattern']['circles'][0]['radius']=1.5
            if mutation=='branch': r['geometry']['cells'][0]['pattern']['segments'].pop()
            self.assertFalse(grid_pixels(r)['passed'],mutation)

    def test_geometric_family_rotates_with_rectangular_grid(self):
        with tempfile.TemporaryDirectory() as d:
            motifs = patterns(Path(d), 'geometric')
        for rows, cols in ((2,3),(3,2),(3,3),(3,4),(4,3)):
            grid = {'rows':rows,'cols':cols,'marker':[0,0], 'cells':[
                {'color':[.6,.6,.6],'pattern':motifs[str(i%6+1)]} for i in range(rows*cols)]}
            for m in PLANAR:
                self.assertTrue(relation2(grid,transform2(grid,m))['equivalent'])
            b=copy.deepcopy(grid)
            b['cells'][1]['pattern']=motifs['2_0']
            self.assertFalse(relation2(grid,b)['equivalent'])
            self.assertFalse(relation2(grid,transform2(grid,[[-1,0],[0,1]]))['equivalent'])

    def test_circle_symmetry_and_segment_endpoint_order(self):
        circle={'kind':'geometric','segments':[],'circles':[{'center':[0,0],'radius':2.5}]}
        g={'rows':1,'cols':1,'marker':[0,0],'cells':[{'color':[.5]*3,'pattern':circle}]}
        for m in PLANAR:
            self.assertEqual(motif_signature(circle),motif_signature(transform2(g,m)['cells'][0]['pattern']))
        a={'kind':'geometric','circles':[],'segments':[[[-1,0],[1,0]],[[0,0],[0,1]]]}
        b=copy.deepcopy(a);b['segments']=[s[::-1] for s in b['segments'][::-1]]
        self.assertEqual(motif_signature(a),motif_signature(b))

    def test_pattern_matrix_is_a_texture_selection_not_missing_cells(self):
        p=parameters(2,{'rows':2,'cols':3,'mode':'geometric','patternMatrix':[['1',None,'2'],['3','4','6']]})
        self.assertEqual(p['matrix'],[[1,0,1],[1,1,1]])
        for bad in ({'matrix':[[1,1,1],[1,1,1]]},{'mode':'colored'},{'patternMatrix':[['7']]}):
            with self.assertRaises(AssertionError): parameters(2,{**p,**bad})

if __name__=='__main__': unittest.main()
