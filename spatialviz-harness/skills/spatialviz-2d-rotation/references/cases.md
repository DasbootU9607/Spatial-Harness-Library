# Official evidence and derived construction rules

The adjacent JSON files preserve the complete original question, A-D choices, answer, explanation, sourceId and dataset/code provenance. The PNG files are byte-identical copies from `questions/media`; `imageSha256` binds them. These resources are inside the installed package. Source text and annotations below are official facts; mechanism observations and proposed rules are our analysis, not additional official labels.

## Colored rectangular grid

Official facts: `MentalRotation/2DRotation/Level0/0-2-3`, row 600. See `official-level0.json` and `official-level0.png`. Answer A; the official explanation describes a 90-degree rotation. B and C are described as rotations followed by reflections. The image has a 3-row, 2-column original, a single green cell, grey cells and an external red corner. A exchanges the row and column counts. D is the text “All three other options are incorrect”.

Visual inspection: the red marker carries information that the repeated grey cells do not. The green middle cell alone has symmetry. The marker and cell arrangement must therefore be checked jointly.

Derived rules: vary rectangular dimensions, palette and placements. Use exact decorated-grid equivalence across four rotations, including zero degrees. Do not infer inequivalence merely from a reflection operation; symmetrical content can erase the distinction. Generated answers need not occupy A, and generated difficulty is unranked.

## Patterned grid, initial reference

Official facts: `MentalRotation/2DRotation/Level1/0-2-3`, row 640. See `official-level1.json` and `official-level1.png`. Official answer B is described as a 180-degree rotation; A and C as rotated/reflected variants. Dot pairs and single dots occur inside individual cells.

Visual issue: A and C appear identical in the supplied original image, including their red top-right markers. This does not introduce a second correct answer, but it produces redundant distractors. Preserve this source unchanged as an example of a reference limitation. Do not reproduce that redundancy in newly authored questions.

Derived rules: treat a dot pair as point geometry, so a horizontal pair becomes vertical under a quarter-turn. Distinguish in-cell orientation from cell placement. The independent solver must normalize unordered dots and polygon edge traversal so harmless representation changes do not create false distractors.

## Supplement: local pattern orientation

Official facts: `MentalRotation/2DRotation/Level1/1-2-3`, row 641. See `official-pattern-direction.json` and `official-pattern-direction.png`. Official answer B is a 180-degree rotation; A is described as rotation plus horizontal reflection, and C as rotation of asymmetric internal patterns.

Visual inspection: A, B and C are visibly distinct. The original's top-left horizontal dot pair becomes vertical in C while the original bottom-left red marker remains there. B relocates the complete layout and marker by half a turn, including the triangular three-dot arrangement. This supplements the initial reference's duplicate-choice issue.

Derived rules: generate local orientation errors and corner displacement separately, and then verify the entire decorated grid. Reject swaps of identical cells, rotations of symmetric motifs that change nothing, equivalent mirrors, and duplicate displays. References motivate the family; they do not restrict generation to these six cells, this dot vocabulary or these answer positions.

## Provenance boundary

All five source fields (sourceId, original annotation, annotation hash, dataset revision, code revision) remain in each JSON. This package proposes its own seeded palette/motif generator, bounded dimensions, independent matrix solver, SVG layout and validation requirements. Those implementation choices are not claims about the official generator. Official Level0/Level1 are source metadata only.
