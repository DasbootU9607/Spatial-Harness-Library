import copy
import json
from pathlib import Path
import unittest

from cubes import projection, positions, feasible
from parameters import resolve
from verify import audit, solve

ROOT=Path(__file__).resolve().parents[2]


class ProjectionTests(unittest.TestCase):
    def test_depth_order_and_unchanged_silhouette(self):
        stack=[[0,0,0,"G"],[1,0,0,"R"],[0,1,0,"R"]]
        self.assertEqual(projection(stack,"Left"),("RG",))
        self.assertEqual(projection(stack,"Right"),("RR",))
        self.assertEqual(projection(stack,"Front"),("GR",))
        self.assertEqual(projection(stack,"Top"),("R.","GR"))
        hidden=copy.deepcopy(stack)
        hidden[1][-1]="G"
        self.assertEqual(projection(stack,"Left"),projection(hidden,"Left"))
        self.assertNotEqual(projection(stack,"Right"),projection(hidden,"Right"))
        symmetric=[[0,0,0,"G"],[0,1,0,"G"]]
        self.assertEqual(projection(symmetric,"Left"),projection(symmetric,"Right"))

    def test_invalid_geometry_and_stem(self):
        for model in [[[0,0,0,"G"]]*2,[[0,0,0,"G"],[0,0,2,"R"]],[[0,0,0,"G"],[1,1,0,"R"]]]:
            with self.assertRaises(AssertionError):
                positions(model)
        with self.assertRaisesRegex(ValueError,"majority"):
            resolve(0,dict(branch="cubes",heightMap=[[2,1],[1,0]],red=[[0,0,0],[0,0,1],[1,0,0]]))

    def test_feasible_side_can_be_underdetermined(self):
        # Behind a nearer gray cube, under a gray top, the rear bottom can be either color.
        front=("G","G")
        top=("G","G")
        self.assertTrue(feasible(front,top,("GG","RG")))
        self.assertTrue(feasible(front,top,("GG","GG")))
        self.assertFalse(feasible(front,top,("GR","RG")))

    def test_accepted_tasks_and_mutated_labels(self):
        records=json.loads((ROOT/"catalog/cases.json").read_text("utf8"))["cases"]
        records=[r for r in records if "3view-projection" in r["skillIds"]]
        self.assertGreaterEqual(len(records),4)
        for r in records:
            with self.subTest(r=r["id"]):
                s=json.loads((ROOT/r["harnessId"]/"site"/r["taskArtifact"]).read_text("utf8"))
                self.assertEqual([c for c in audit(s) if c["verdict"]!="passed"],[])
                s["answer"]["index"]=(s["answer"]["index"]+1)%4
                self.assertNotEqual(solve(s),s["answer"])
                s["pipeline"]["views"]["B"]=s["pipeline"]["views"]["A"]
                self.assertTrue(any(c["verdict"]=="failed" for c in audit(s)))


if __name__=="__main__":
    unittest.main()
