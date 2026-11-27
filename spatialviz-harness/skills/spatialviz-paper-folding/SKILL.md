---
name: spatialviz-paper-folding
description: Construct and verify SpatialViz grid-paper folding questions from axial and diagonal folds, visible punch sites and four unfolded hole patterns.
---

# Paper Folding

Start a recorded build before opening task-specific references. Choose the reasoning you want the learner to demonstrate using the [released mechanisms](references/coverage.md). All four letters label drawings. The final picture in the top row tells the learner where the punch passes through the folded stack. The choices show the original square sheet with its holes.

## Design from an empty grid

1. Choose a square. A 3-by-3 sheet uses one punch and a 4-by-4 sheet uses two. Both get one straight fold followed by a diagonal. A 5-by-5 sheet uses three punches and two straight folds before the diagonal. Parallel straight folds stack strips; crossed straight folds bring rows and columns together.
2. Place each straight crease on a boundary between active rows or columns. Fold the shorter side inward. For equal widths the source folds the bottom upward or the right side leftward. Keep the original grid visible so the reader can locate each new footprint. When folding again, measure the next boundary in the surviving rectangle. Drawing the flap edge inside that rectangle makes unequal folds readable.
3. Fold a corner of the remaining rectangle along a 45-degree diagonal. The diagonal joins two adjacent boundaries of the active sheet. The source parameters give the first and last **cell centers** on this crease. The printed stroke continues to **grid vertices**. Follow the solid outline and the dotted former corner to identify the moving triangle.
4. Select distinct retained cell centers for the red punch rings. A center on the crease stays fixed during the diagonal fold. A mark in the folded-over triangle has a reflected partner. A mark beyond that triangle receives no diagonal partner. Earlier strip folds can still give any of these marks multiple layers. To compose a harder item, place marks in different regions or repeat straight folds on a partially covered strip.
5. Map every original cell center through the visible folds in order. A cell is punched when it lands under a red ring. The union gives the black-dot answer. Choose an occupied row or column and an empty parallel band. Omit the occupied band in one distractor, copy it to the empty band in another, and relocate it in the third. Keep all other dots fixed. Shuffle A–D.
6. Inspect the full printed PNG. Reject a crease with no moving cells, a punch on missing paper, a reused official fold-and-punch stem, an unchanged distractor, duplicate grids, an ambiguous crease history, or multiple matching answers. Verify that the four hole grids, captions, step order and red-ring locations survive composition. Record a visual observation about a specific crease or distinguishing cell before sealing.

[Run the generator and recorder](MAINTENANCE.md). For direct evidence consult the [original annotations and PNG filenames](references/official.json), [per-image fold reconstructions](references/observations.json) and [upstream trace](references/source-trace.md).

