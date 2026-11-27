import copy
import unittest
from solve import solve,advance,unpack


class Replay(unittest.TestCase):
    def test_heading_changes_basis_and_ignores_intermediate_occupancy(self):
        board={(0,0):('red','E'),(1,0):('green','N'),(2,0):('red','W')}
        advance(board,'(0,0) Forward 2',[3,3])
        self.assertEqual(board[(0,0)],('red','W'))
        self.assertEqual(board[(1,0)],('green','N'))
        advance(board,'(0,0) Right 1',[3,3])
        self.assertEqual(board[(0,1)],('red','N'))

    def test_swap_noop_depends_only_on_color(self):
        board={(0,0,0):('cyan',),(1,0,0):('cyan',)}
        original=board.copy()
        advance(board,'(0,0,0) x+',[3,3,1])
        self.assertEqual(original,board)

    def test_support_and_chain_settling(self):
        board={(0,0,z):(color,) for z,color in enumerate(['red','gold','cyan'])}
        advance(board,'(0,0,0) x+',[3,2,3])
        self.assertEqual(board,{(1,0,0):('red',),(0,0,0):('gold',),(0,0,1):('cyan',)})
        with self.assertRaisesRegex(ValueError,'No support'):
            advance(board,'(0,0,1) y+',[3,2,3])

    def test_duplicate_distractor_outcomes(self):
        face=dict(size=[3,3],mode='single',panels={'Initial':[[0,0,'red','E']],'Final':[[2,0,'red','E']]},
                  choices=['Forward 2','Forward 1 / Forward 1','Left 1','Left 2'],given='')
        with self.assertRaisesRegex(ValueError,'equivalent'):
            solve(face)

    def test_visible_uniqueness_without_key(self):
        from design import design
        for kind,modes in [('arrow',['single','fleet-path','fleet-state','checkpoint','predecessor']),
                           ('block',['flat','stack','checkpoint','missing'])]:
            for mode in modes:
                with self.subTest(kind=kind,mode=mode):
                    face,index=design(kind,109,{'mechanism':mode})
                    self.assertEqual(solve(face)['index'],index)
                    if mode.startswith('fleet-state'):
                        bad=copy.deepcopy(face)
                        bad['panels']['A']=bad['panels']['B']
                        with self.assertRaisesRegex(ValueError,'Equivalent printed diagrams'):solve(bad)
                    if mode=='checkpoint':
                        # Withhold the checkpoint. All four programs share the final state.
                        bad=copy.deepcopy(face)
                        del bad['panels']['After step 1']
                        with self.assertRaises(ValueError):solve(bad)
