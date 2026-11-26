import copy
import unittest
import numpy as np

from answer import inspect,pixels,solve,view
from design import design,net,LAYOUTS
from geometry import fold,poses,ROTATIONS,X,Y,Z,cross,apply,SLOTS,FRAMES
from motifs import period

class FoldingTests(unittest.TestCase):
    def setUp(self):
        self.job=design('CubeUnfolding',17,{'family':'mosaic','mode':'cannot'})
        self.cube=self.job['cubes']['target']
        self.target=view(self.cube)
        self.cells=net(0,self.cube)

    def test_rotation_group(self):
        self.assertEqual(24,len(set(ROTATIONS)))
        for rot in ROTATIONS:
            self.assertEqual(apply(rot,Z),cross(apply(rot,X),apply(rot,Y)))

    def test_all_layouts_and_rotations(self):
        for i in range(len(LAYOUTS)):
            cells=net(i,self.cube)
            frames=fold(cells)
            self.assertEqual(len({n for r,u,n in frames.values()}),6)
            self.assertTrue(all(cross(r,u)==n for r,u,n in frames.values()))
            for posed in poses(cells):
                self.assertTrue(inspect(cells,view(posed))[0])

    def test_invalid_nets(self):
        for coords in [[(i,0) for i in range(6)],[(0,0),(1,0),(0,1),(1,1),(2,0),(3,0)],
                       [(0,0),(0,1),(1,1),(2,1),(3,1),(8,8)],[(1,1)]*6]:
            with self.assertRaises(ValueError):
                fold([dict(xy=p) for p in coords])

    def test_back_faces(self):
        changed=copy.deepcopy(self.cube)
        changed['Back'],changed['Bottom']=changed['Bottom'],changed['Back']
        self.assertTrue(inspect(net(7,changed),self.target)[0])

    def test_opposite_mirror_single_turn(self):
        for pair in [('Front','Left'),('Front','Right')]:
            changed=copy.deepcopy(self.cube)
            a,b=pair
            changed[a],changed[b]=changed[b],changed[a]
            self.assertFalse(inspect(net(0,changed),self.target)[0])
        for target in [view(self.cube,True),copy.deepcopy(self.target)]:
            if target==self.target:
                target[0][1]=(target[0][1]+1)%4
            self.assertFalse(inspect(self.cells,target)[0])

    def test_actual_symmetry(self):
        self.assertEqual([period(k) for k in ['pip-1','parallel','fork','pip-3','grid-1']],[1,2,4,4,4])
        cube=copy.deepcopy(self.cube)
        cube['Top']=['ring',0]
        target=view(cube)
        target[0][1]=1
        self.assertTrue(inspect(net(3,cube),target)[0])
        a=pixels('grid-1',0,'side')
        self.assertFalse(any(np.array_equal(a,pixels('grid-1',q)) for q in range(4)))

    def test_unobservable_edit_cannot_define_unique_answer(self):
        cube=copy.deepcopy(self.cube)
        cube['Top']=['ring',0]
        original=net(2,cube)
        cube['Top'][1]=1
        options=[original,net(4,cube),net(5,cube),net(6,cube)]
        for mode in ['can','cannot']:
            with self.assertRaises(ValueError):
                solve(dict(taskType='CubeUnfolding',geometry=dict(view=view(cube),options=options),
                           parameters=dict(mode=mode),options=list('ABCD')))

