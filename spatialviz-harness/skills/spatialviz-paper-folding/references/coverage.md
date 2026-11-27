# Paper Folding coverage

All 120 source IDs under MentalFolding/PaperFolding have their original PNG. The [manifest](source-ids.txt) lists them in release order. [Annotations](official.json) keep the original question, choices, explanation and answer. [Image-only observations](observations.json) record the inferred moving side, crease vertices, punch sites, layer counts, unfolded holes, four option grids and key comparison for each source ID.

## Released question and visual evidence

All 120 ask which of four labeled drawings shows the original square sheet after unfolding. Solid blue lines show the retained sheet and flap. Pale dashed lines retain the old footprint. Read operations left to right, then red punch rings; compare black hole centers below A–D. The 3-by-3, 4-by-4 and 5-by-5 profiles have 40 each. They show one, two and three punch sites respectively. The first two profiles use two creases, the third uses three. Answer positions A/B/C/D occur 31/32/35/22 times.

## Mechanisms

Rows overlap. Counts describe released figures. Geometry and punch regions are local pixel inferences. The original English explanations identify the distractor axis. The [machine-readable coverage table](mechanisms.json) lists every contributing source ID. The question and four graphic options above apply to every row.

| Mechanism | Level 0 | Level 1 | Level 2 | Representative sourceId | Required reasoning / distinguishing marks |
|---|---:|---:|---:|---|---|
| One axial strip followed by a corner | 40 | 40 | 0 | MentalFolding/PaperFolding/Level0/0-3-3-2-1 | Read the retained rectangle after a horizontal or vertical fold, then undo the final diagonal and the earlier strip. |
| Two parallel strips from the same side | 0 | 0 | 8 | MentalFolding/PaperFolding/Level2/19-5-5-3-3 | Move the same edge twice. Recompute the active boundary before the second reflection. |
| Two parallel strips from opposite sides | 0 | 0 | 11 | MentalFolding/PaperFolding/Level2/0-5-5-3-3 | Fold the two ends of one dimension inward in order. Overlapping bands carry different original strips. |
| Two perpendicular strips | 0 | 0 | 21 | MentalFolding/PaperFolding/Level2/2-5-5-3-3 | Track row and column preimages through two different axes before the corner fold. |
| Punch on the finite diagonal crease | 16 | 17 | 22 | MentalFolding/PaperFolding/Level0/1-3-3-2-1 | A punch centered on the crease has one preimage at this step. Earlier strips may still multiply it. |
| Punch through the folded-over corner | 10 | 16 | 16 | MentalFolding/PaperFolding/Level0/0-3-3-2-1 | The two sides of the diagonal contribute different cell centers at a marked site. |
| Punch outside the folded-over corner | 14 | 32 | 39 | MentalFolding/PaperFolding/Level0/4-3-3-2-1 | Reflect only the finite triangular flap. The uncovered part of the retained sheet contributes no extra diagonal partner. |
| Combine several punched stacks | 0 | 40 | 40 | MentalFolding/PaperFolding/Level1/0-4-4-2-2 | Map each separate ring to its original sites, then take the union in the unfolded sheet. |
| Row distractors | 14 | 24 | 24 | MentalFolding/PaperFolding/Level0/1-3-3-2-1 | Compare missing, copied and relocated holes on two distinct rows, keeping the other cells fixed. |
| Column distractors | 26 | 16 | 16 | MentalFolding/PaperFolding/Level0/0-3-3-2-1 | Compare missing, copied and relocated holes on two distinct columns, keeping the other cells fixed. |

## Anomalies and diversity

All 120 blind predictions identified one fold history and one matching letter. All matched the released key; no within-item duplicate answer grids were found. A blank grid can be a legitimate distractor when removing the only occupied band. Four pairs share both a physical stem and the same unordered options: Level0 items 0/20 and 2/23, Level1 items 14/22, and Level2 items 7/13. The original annotations are preserved separately. Across all releases there are 112 distinct fold-and-punch stems and 95 different target grids. The observations file also lists repeated stems with different alternatives.

The [printed option comparison](option-audit.json) independently accounts for every missing and extra dot. All 360 distractor explanations agree with the indicated row or column in the released image.

## New construction rules

Match a physical profile and choose explicit creases or let a seed choose. A reversal of fold side, sequential offset, crease extent, division of punch sites between the flap and uncovered paper, or placement of a nonempty distractor band changes the reasoning. Font, output scale and shuffling the option letters preserve the physical problem. The constructors reject physical stems already in the release, use the upstream model and draw functions, and bind accepted PNGs to independently derived solutions. New task difficulties describe observed layers and operations and have no population calibration.

## Accepted constructions

| Mechanism | Source | New task | Evidence |
|---|---|---|---|
| One axial strip followed by a corner | MentalFolding/PaperFolding/Level0/0-3-3-2-1 | [Seed 326](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-2dcb317285257792dd5e658b) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-2dcb317285257792dd5e658b/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-2dcb317285257792dd5e658b) |
| Two parallel strips from the same side | MentalFolding/PaperFolding/Level2/19-5-5-3-3 | [Seed 527](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-f4dc785cecd1ead2ff7a7096) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-f4dc785cecd1ead2ff7a7096/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-f4dc785cecd1ead2ff7a7096) |
| Two parallel strips from opposite sides | MentalFolding/PaperFolding/Level2/0-5-5-3-3 | [Seed 746](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-1c2816fae927f768cb0d1468) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-1c2816fae927f768cb0d1468/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-1c2816fae927f768cb0d1468) |
| Two perpendicular strips | MentalFolding/PaperFolding/Level2/2-5-5-3-3 | [Seed 721](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-20b5e1226e98d04ee3747a6f) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-20b5e1226e98d04ee3747a6f/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-20b5e1226e98d04ee3747a6f) |
| Punch on the finite diagonal crease | MentalFolding/PaperFolding/Level0/1-3-3-2-1 | [Seed 317](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-55ff7e11741379bb06c0d33e) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-55ff7e11741379bb06c0d33e/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-55ff7e11741379bb06c0d33e) |
| Punch through the folded-over corner | MentalFolding/PaperFolding/Level0/0-3-3-2-1 | [Seed 623](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-e426070849f483c0f4e07277) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-e426070849f483c0f4e07277/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-e426070849f483c0f4e07277) |
| Punch outside the folded-over corner | MentalFolding/PaperFolding/Level0/4-3-3-2-1 | [Seed 216](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-6336e9146796c47b0497dcaf) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-6336e9146796c47b0497dcaf/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-6336e9146796c47b0497dcaf) |
| Combine several punched stacks | MentalFolding/PaperFolding/Level1/0-4-4-2-2 | [Seed 326](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-2dcb317285257792dd5e658b) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-2dcb317285257792dd5e658b/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-2dcb317285257792dd5e658b) |
| Row distractors | MentalFolding/PaperFolding/Level0/1-3-3-2-1 | [Seed 317](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-55ff7e11741379bb06c0d33e) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-55ff7e11741379bb06c0d33e/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-55ff7e11741379bb06c0d33e) |
| Column distractors | MentalFolding/PaperFolding/Level0/0-3-3-2-1 | [Seed 623](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-e426070849f483c0f4e07277) | [Checks](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/records/authored-e426070849f483c0f4e07277/verification.json) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-e426070849f483c0f4e07277) |

The [acceptance matrix](acceptance.json) states where each mechanism appears in its reviewed PNG.
