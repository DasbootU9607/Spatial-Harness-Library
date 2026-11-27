---
name: spatialviz-cube-counting
description: Build SpatialViz CubeCounting questions with the benchmark's FreeCAD and TechDraw generator and official figure and option compositor. Determine the attainable cube totals from the actual exported views.
---

# Cube Counting

Start from the question the learner must answer. The released two-view family gives Front and Top. The three-view family adds Left. Front gives a peak for each column of the Top footprint. Left gives a peak for each row, with left-to-right peaks corresponding to the top-to-bottom rows of Top. Each occupied plan square supports a solid column starting on the floor. State that convention in the public stem. A choice can ask for the minimum, maximum or any feasible total. The exact-count diagnostic is an original extension.

For an exact-count pair, arrange the shown height rows as [3,1,0], [1,0,1], [1,0,0]. Five plan squares are occupied. Front reads [3,1,1]. Its three-unit column can rise over any of the three occupied cells in the first plan column. For example, promoting another one of these stacks from one to two preserves Front and Top while raising the total from seven to eight. Preserve both witnesses and the failed two-view candidate. Add the Left peaks [3,1,1]. Both lower plan rows are now capped at one, so the lone three-stack must occupy the top row. The total is seven. Use the same seed for both versions to compare the same native geometry and the same four offered choices.

## Build and solve

Run the installed entry with the checkout's Node and Python dependencies, a FreeCAD GUI runtime and its A4 landscape TechDraw template. The generation command starts a recorder and invokes the pinned `create_cube_counting.main`. It places FreeCAD boxes, compounds them, creates the First Angle projection group and exports a PDF. The benchmark's `detect_subfigures`, `create_composite_image_CubeCounting`, `prepare_composite_image_CubeCounting` and `save_json` produce the panel crops, labeled PNG and ordered answer annotation. The printed figure contains the views. The corresponding question, choices and support convention appear beside it in the delivered task. Keep both parts together when reviewing the learner's evidence.

```sh
node scripts/author.cjs generate --mechanism min-3 --seed 93177 --out new-question
node scripts/author.cjs solve --out new-question
node scripts/author.cjs test
```

Use `min-2`, `max-2`, `possible-2`, `min-3`, `max-3` or `possible-3` for the released families. Pass `--params parameters.json` for `size` 3 or 4. The optional boolean `none` requests an official draw containing the “None of the above” distractor. Native sampling continues until one model meets the official size filter. The original chooser can produce two feasible numeric options on a possible-count item. Rejection sampling retains an official draw with a single winning option.

Use `exact-2` followed by `exact-3` with the same seed to retain the ambiguous predecessor and add the resolving elevation. The prescribed native input fixes the occupancy decisions. The official tool handles each box, camera, PDF, crop, label and choice shuffle. For the audited lower-bound counterexample, `{"profile":"competing-peaks"}` with `min-3` first retains the original failed minimum question and independent witnesses. Revise with `max-3` using the same seed and profile to draw a maximum question on the identical stack. Keep the failed original and accepted revision together.

## Check the actual views

Open the final PNG with its public question and answer choices. Confirm that every occupied square has a closed outline and the Front, Top and optional Left panels fit their labels. Check whether the exact count is unique over all compatible models. For a possible-count question, test each listed number individually. The independent solver decodes the printed square interiors, enumerates compatible row heights and retains one witness per attainable total. The native model is checked separately against those pixels. After verification and visual review, the installed `accept` command prepares the question for publication.

[Official item inventory and audit](references/official-audit.md) · [Coverage table](references/coverage.md) · [Native construction and evidence](references/design.md)
