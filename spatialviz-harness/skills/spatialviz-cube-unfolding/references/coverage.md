# Released cube unfolding questions

The [source index](official.json) preserves the 120 original annotations, IDs, provenance and packaged image filenames. [Level 0](level0.jpg), [Level 1](level1.jpg) and [Level 2](level2.jpg) each show all 40 items in source order. Original PNGs are under `official/`. [Mechanism observations](mechanisms.json) include the local silhouette fit for each displayed net, in panel order. The score is intersection over union. Unresolved fits carry a null layout.

| Level | Released figures | Question and choices |
| --- | --- | --- |
| 0 | Six solid colors | 40 cannot. A–D are nets. |
| 1 | IDs 0–19 use black pips, 20–39 use geometric line motifs | 21 can and 19 cannot, four nets. |
| 2 | Multicolor 3 by 3 dot arrangements with blank sites | 15 can and 25 cannot, four nets. |

## Reading the figures

In Level 1 the number of pips can identify a face while the axis of a pair, the missing corner of a three-pip pattern or the long axis of six pips determines orientation. The second family includes rings, diagonals, parallel lines and asymmetric branching strokes. A ring survives a quarter turn. Parallel lines survive a half turn. Level 2 requires tracking occupied sites and their colors together. Two views with the same color counts may disagree on the position of a single colored dot.

Level0/30 has answer D. A and D share the same silhouette and differ in placement of the green and cyan faces. Compare the shown red/yellow/green corner. In Level1/20, B and C have identical silhouettes with parallel stripes in different directions. In Level2/0, compare the central patterned tiles of A and B. A changed filename or a hidden face alone does not establish incompatibility.

## Source and local interpretation

The released PNGs and answer keys are official evidence. The shape estimates and symmetry reasoning are local analyses. The source defines six four-in-a-row layouts with two tabs, three 2–3–1 layouts, a 3–3 layout and a 2–2–2 staircase. One complex unfolding table includes an extraneous seventh occupied cell in its 3–3 matrix. The directed upstream face lookup and a filename containing “incorrect” are insufficient evidence of a well-defined problem. A case-wide uniqueness proof for every released answer is outside these visual observations.

## New construction

The input uses the eleven six-cell masks in `official-folding/design.py` indexed 0–10. Each printed tile stores its paper coordinates and number of counterclockwise quarter turns. Use solid colors, pips, lines or colored mosaics. Each generated family contains six distinct motifs. Face assignments, turns, layouts and label order vary with seed. The new artwork is drawn by `motifs.py` using independent coordinates and strokes informed by the above figures. The inspected source archive omits the numbered pattern inputs. The local official data contains rendered questions. The authored motifs ship under the library license. The source script bytes and upstream MIT license are pinned separately.


## Observed silhouettes and source explanations

Every released net silhouette matched one of the eleven masks above 0.90 intersection over union. Panel counts for layout IDs 0 through 10 are 52, 44, 38, 50, 52, 35, 30, 42, 42, 36, 59. The per-item mechanism index lists the exact source explanation lines that attribute a distractor to a face turn, swap or mirrored view. These labels preserve the source interpretation.
