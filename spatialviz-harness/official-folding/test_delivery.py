import copy,json,unittest
from pathlib import Path
from artwork import decode,record
from PIL import ImageOps
from verify import audit
ROOT=Path(__file__).resolve().parents[2]

class PublishedFoldingTests(unittest.TestCase):
    def test_delivered_folding_tasks(self):
        rows=json.loads((ROOT/'catalog/cases.json').read_text('utf8'))['cases']
        matches=[r for r in rows if set(r['skillIds']) & {'cube-unfolding','cube-reconstruction'}]
        self.assertGreaterEqual(len(matches),6)
        for row in matches:
            file=ROOT/'spatialviz-harness/site'/row['taskArtifact']
            s=json.loads(file.read_text('utf8'))
            with self.subTest(file=row['id']):
                audit(s)
                changed=copy.deepcopy(s)
                changed['options'][0],changed['options'][1]=changed['options'][1],changed['options'][0]
                with self.assertRaises(ValueError):
                    audit(changed)
                if 'A' in s['pipeline']['panels']:
                    changed=copy.deepcopy(s)
                    r=changed['pipeline']['panels']['A']
                    changed['pipeline']['panels']['A']=record(ImageOps.mirror(decode(r)))
                    with self.assertRaises(ValueError):
                        audit(changed)

