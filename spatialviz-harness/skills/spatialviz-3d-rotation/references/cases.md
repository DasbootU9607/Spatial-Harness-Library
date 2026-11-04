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

## Visibility and current official pipeline

Both official images use a single view, whose occlusion does not fully specify hidden structure. The current default actually executes the official FreeCAD and composition scripts and preserves this single-view presentation. Our additional acceptance condition requires a fully visible face for every cube, independent image/structure checks, and actual final-PNG inspection. The explicit visibility condition limits possible unseen structure; it does not prove unrestricted single-view reconstruction. Read `official-pipeline.md` for source provenance and local adaptations.

Earlier JS/SVG cases used opposite views and complete z-layer diagrams. Those records remain immutable and are labeled legacy. Their add/move distractors and complete-layer contract are not part of the current official adapter. New official-pipeline cases vary cube count, coordinates, rotations, removal, verified image mirrors and labels. Do not inherit official source identity or Level0/Level1 difficulty. Arbitrary meshes and hidden-only distinguishing evidence remain unsupported.
