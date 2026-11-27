import copy
import json
from pathlib import Path
import unittest
from PIL import ImageDraw
from evidence import REF, answer, effects, solve_image, transport
from verify import audit, decode
from artwork import record


class PaperMechanics(unittest.TestCase):
    def test_unequal_fold_and_second_offset(self):
        top=dict(axis='horizontal',line=2,movingSide='top')
        bottom=dict(axis='horizontal',line=4,movingSide='bottom')
        self.assertEqual([transport(transport((r,1),top),bottom)[0] for r in range(5)],[3,2,2,3,3])

    def test_finite_diagonal_and_crease(self):
        d=dict(axis='diagonal',endpoints=[[2,0],[0,2]],movingCorner=[0,0])
        self.assertEqual(transport((0,0),d),(1,1))
        self.assertEqual(transport((0,1),d),(0,1))
        self.assertEqual(transport((0,3),d),(0,3))

    def test_duplicate_and_ambiguous_answers(self):
        for labels,pairs in [(['A','C'],[]),(['B'],['AC'])]:
            with self.assertRaises(ValueError):
                answer(dict(exactFoldHistories=[{}],predictedLabels=labels,duplicateOptionPairs=pairs))

    def test_original_reference_and_blank_distractor(self):
        row=json.loads((REF/'official.json').read_bytes())[1]
        result=solve_image(REF/row['packagedImage'],3,2)
        self.assertIn([],result['readOptions'].values())
        self.assertEqual(answer(result)['index'],row['answerIndex'])
        self.assertEqual(effects(result),['crease'])


class RecordedDelivery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root=Path(__file__).resolve().parents[2]
        cat=json.loads((root/'catalog/cases.json').read_bytes())
        cls.specs=[json.loads((root/'spatialviz-harness/site'/r['taskArtifact']).read_bytes())
                   for r in cat['cases'] if r['taskType']=='PaperFolding' and r['harnessId']=='spatialviz-harness']
        if not cls.specs:
            raise AssertionError('Expected registered Paper Folding evidence')

    def test_all_deliveries_from_images_and_required_coverage(self):
        covered=set()
        for s in self.specs:
            with self.subTest(seed=s['seed']):
                self.assertEqual(len(audit(s)),4)
                covered.update(s['coverage'])
        expected=set(json.loads((REF/'mechanisms.json').read_bytes()))
        self.assertTrue(expected<=covered)

    def test_label_order_and_blue_outline(self):
        s=copy.deepcopy(self.specs[0])
        for box in [(0,70,1965,155),(310,160,655,549)]:
            damaged=copy.deepcopy(s)
            image=decode(s['rendering']['image'])
            ImageDraw.Draw(image).rectangle(box,fill='white')
            damaged['rendering']['image']=record(image)
            with self.assertRaises(ValueError):
                audit(damaged)

    def test_answer_key_and_missing_punch(self):
        s=copy.deepcopy(self.specs[0])
        s['answer']['index']=(1+s['answer']['index'])%4
        with self.assertRaises(ValueError):
            audit(s)
        s=copy.deepcopy(self.specs[0])
        s['geometry']['punches']=[]
        with self.assertRaises(ValueError):
            audit(s)

    def test_semantically_equivalent_stems_are_not_new(self):
        from evidence import original_signatures,physical_signature
        original=json.loads((REF/'observations.json').read_bytes())['items']
        known=original_signatures()
        self.assertEqual(len(known),112)
        self.assertIn(physical_signature(original[0]['grid'],original[0]['exactFoldHistories'][0]['folds'],original[0]['punches']),known)


if __name__=='__main__':
    unittest.main()

