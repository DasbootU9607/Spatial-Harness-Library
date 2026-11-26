# Released cube reconstruction questions

The [source index](official.json) preserves the 120 original annotations, IDs, provenance and packaged image filenames. [Level 0](level0.jpg), [Level 1](level1.jpg) and [Level 2](level2.jpg) each show all 40 items in source order. Original PNGs are under `official/`. [Mechanism observations](mechanisms.json) include the local silhouette fit for each displayed net, in panel order. The score is intersection over union. Unresolved fits carry a null layout.

| Level | Released figures | Question and choices |
| --- | --- | --- |
| 0 | Six solid colors | 20 possible-view items have three figures and D as fallback. Another 20 ask for an opposite face with four shuffled text choices including a fallback. |
| 1 | IDs 0–19 use black pips, 20–39 use geometric line motifs | 40 possible-view questions, four figures. |
| 2 | Multicolor 3 by 3 dot arrangements with blank sites | 40 possible-view questions, four figures. |

## Reading the figures

In Level 1 the number of pips can identify a face while the axis of a pair, the missing corner of a three-pip pattern or the long axis of six pips determines orientation. The second family includes rings, diagonals, parallel lines and asymmetric branching strokes. A ring survives a quarter turn. Parallel lines survive a half turn. Level 2 requires tracking occupied sites and their colors together. Two views with the same color counts may disagree on the position of a single colored dot.

Level0/0 supplies figures A–C. Level0/1 supplies a net alone and records D as the answer to a color question. Level1/20 includes a ring and branched strokes. Level2/1 requires tracking the corner position of colored dots. The source compositor uses whole-image horizontal/vertical reflections and substitution of rotated textures. The wrong corner order in a reflected image can survive an unordered adjacency test.

## Source and local interpretation

The released PNGs and answer keys are official evidence. The shape estimates and symmetry reasoning are local analyses. The source defines six four-in-a-row layouts with two tabs, three 2–3–1 layouts, a 3–3 layout and a 2–2–2 staircase. One complex unfolding table includes an extraneous seventh occupied cell in its 3–3 matrix. The directed upstream face lookup and a filename containing “incorrect” are insufficient evidence of a well-defined problem. A case-wide uniqueness proof for every released answer is outside these visual observations.

## New construction

The input uses the eleven six-cell masks in `official-folding/design.py` indexed 0–10. Each printed tile stores its paper coordinates and number of counterclockwise quarter turns. Use solid colors, pips, lines or colored mosaics. Each generated family contains six distinct motifs. Face assignments, turns, layouts and label order vary with seed. The new artwork is drawn by `motifs.py` using independent coordinates and strokes informed by the above figures. The inspected source archive omits the numbered pattern inputs. The local official data contains rendered questions. The authored motifs ship under the library license. The source script bytes and upstream MIT license are pinned separately.


## Observed silhouettes and source explanations

Every released net silhouette matched one of the eleven masks above 0.90 intersection over union. Panel counts for layout IDs 0 through 10 are 9, 9, 8, 13, 13, 17, 12, 6, 12, 9, 12. The per-item mechanism index lists the exact source explanation lines that attribute a distractor to a face turn, swap or mirrored view. These labels preserve the source interpretation.

Among the 20 text questions the fallback appears at A nine times, B three times, C five times and D three times. All four answer letters occur in the released text questions.
