# Official evidence and derived construction rules

The packaged JSON files preserve the full official question, options, answer, explanation and provenance; their PNGs are exact copies of the original `questions/media` assets. Verify `imageSha256` when maintaining them. They remain accessible with an installed package. Official labels below are distinguished from our visual observations and proposed rules.

## Choose the rotation-equivalent model

Official facts: `MentalRotation/3DRotation/Level1/0-3-2-2-5`, row 720. See `official-level1.json` and `official-level1.png`. The question asks which model can be obtained by rotation. C is the official answer, described as an x-axis 90-degree rotation. A is described as a vertical mirror, and B as one cube removed. A-C are figures and D is the text “All three other options are incorrect”.

Visual inspection: the grey blocks have visible unit-cube edges; the original and A have a similar stepped structure, while B lacks a block and C displays a different pose. The rear faces and some joins are occluded. The annotation supplies transformations but not a voxel coordinate list, so this package does not claim a unique coordinate reconstruction or an independent proof of the official mirror label from this single image. Preserve the image and explanation as source evidence.

Derived rules: represent new models explicitly as integer occupied coordinates. Use equal cubes, unique positions and face adjacency. Treat reflection as a distractor proposal only: an achiral solid's reflection can equal a proper rotation. Enumerate all 24 proper rotations to classify each final option. Local modifications must retain connectivity.

## Choose the non-equivalent model

Official facts: `MentalRotation/3DRotation/Level0/0-3-3-1-5`, row 680. See `official-level0.json` and `official-level0.png`. The question asks which model cannot be obtained by rotation. A is the official answer, described as one cube removed. B and C are described as y-axis rotations of 270 and 180 degrees.

Visual inspection: the removed end cube in A changes the visible chain, while B presents the reference vertically. This complementary case has a straightforward visible count/extent change and supports the reversed question polarity. Read the original question rather than assuming every rotation task asks for an equivalent model.

Derived rules: positive questions require one equivalent and two non-equivalent figures; negative questions require two equivalent and one non-equivalent figure. D means none of A-C meets that question's condition. Assign labels and regenerate explanations after shuffling. Do not describe every non-equivalent shape as an incorrect answer.

## Visibility and scope decisions for new tasks

Both official images use a single view, whose occlusion does not fully specify hidden structure. New tasks therefore provide opposite isometric views and complete z-layer diagrams for each model. The layer strips use x right, y up and increasing z; they show empty as well as occupied positions. This deliberately changes the presentation to make all structural evidence available, without claiming the original renderer used this method. A round-trip audit and actual final-image inspection are both required. Layer evidence must not be cropped out when publishing the question.

Generated models vary cube count, placement, pose, mutation and answer order. Add/delete/move/mirror are proposals; only independent comparison supplies equivalence. Do not inherit source identity or Level0/Level1 difficulty. Arbitrary meshes and single-view hidden-structure reasoning remain outside the supported contract.
