---
name: spatialviz-paper-folding
description: Construct and verify SpatialViz grid-paper folding questions from axial and diagonal folds, visible punch sites and four unfolded hole patterns.
---

# Paper Folding

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer one strip and a corner fold, two parallel strips and a corner fold, two crossed strips and a corner fold, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "diagonal-partner",
  "inference": "Infer the extra hole mirrored through the final corner crease.",
  "condition": "One ring lies inside the finite triangular flap and off the crease.",
  "foil": "A foil unfolds only the earlier straight folds and misses its reflected partner.",
  "evidence": "Trace each cell to the ring with and without the corner fold and identify a changed original cell."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


The [released mechanisms](references/coverage.md) document the original paper-folding families in greater detail. All four letters label drawings. The final picture in the top row tells the learner where the punch passes through the folded stack. The choices show the original square sheet with its holes.

## Design from an empty grid

1. Choose a square. A 3-by-3 sheet uses one punch and a 4-by-4 sheet uses two. Both get one straight fold followed by a diagonal. A 5-by-5 sheet uses three punches and two straight folds before the diagonal. Parallel straight folds stack strips; crossed straight folds bring rows and columns together.
2. Place each straight crease on a boundary between active rows or columns. Fold the shorter side inward. For equal widths the source folds the bottom upward or the right side leftward. Keep the original grid visible so the reader can locate each new footprint. When folding again, measure the next boundary in the surviving rectangle. Drawing the flap edge inside that rectangle makes unequal folds readable.
3. Fold a corner of the remaining rectangle along a 45-degree diagonal. The diagonal joins two adjacent boundaries of the active sheet. The source parameters give the first and last **cell centers** on this crease. The printed stroke continues to **grid vertices**. Follow the solid outline and the dotted former corner to identify the moving triangle.
4. Select distinct retained cell centers for the red punch rings. A center on the crease stays fixed during the diagonal fold. A mark in the folded-over triangle has a reflected partner. A mark beyond that triangle receives no diagonal partner. Earlier strip folds can still give any of these marks multiple layers. To compose a harder item, place marks in different regions or repeat straight folds on a partially covered strip.
5. Map every original cell center through the visible folds in order. A cell is punched when it lands under a red ring. The union gives the black-dot answer. Choose an occupied row or column and an empty parallel band. Omit the occupied band in one distractor, copy it to the empty band in another, and relocate it in the third. Keep all other dots fixed. Shuffle A–D.
6. Inspect the full printed PNG. Reject a crease with no moving cells, a punch on missing paper, a reused official fold-and-punch stem, an unchanged distractor, duplicate grids, an ambiguous crease history, or multiple matching answers. Verify that the four hole grids, captions, step order and red-ring locations survive composition. Record a visual observation about a specific crease or distinguishing cell before sealing.

[Run the generator and recorder](MAINTENANCE.md). For direct evidence consult the [original annotations and PNG filenames](references/official.json), [per-image fold reconstructions](references/observations.json) and [upstream trace](references/source-trace.md).


## Accept the question text and figure

Deliver the stem, necessary written conditions and every text answer as selectable text in the task data. Deliver a separate figure containing the visual evidence, with only the panel letters, stage or view names, axes, legends and component labels needed to read it. Keep graphical alternatives in the figure. Inspect the diagram at normal size and enlarged. Reject a figure containing the question, text answers, reasoning, or a transcription that gives away the visual state. Solve the delivered text and figure together before acceptance.
