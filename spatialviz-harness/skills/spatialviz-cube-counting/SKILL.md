---
name: spatialviz-cube-counting
description: Build SpatialViz CubeCounting questions with the benchmark's FreeCAD and TechDraw generator and official figure and option compositor. Determine the attainable cube totals from the actual exported views.
---

# Cube Counting

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer find a minimum count, find a maximum count, find a possible count, determine the unique total, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "third-view-essential",
  "inference": "Determine a unique total using the extra row elevation.",
  "condition": "Two different heights over the same footprint meet all front peaks until Left caps the lower rows.",
  "foil": "A taller second column fits Front and Top but breaks a Left peak.",
  "evidence": "Remove Left, retain witnesses for both totals, and restore it to exclude the foil."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


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

## Accept the question text and figure

Deliver the stem, necessary written conditions and every text answer as selectable text in the task data. Deliver a separate figure containing the visual evidence, with only the panel letters, stage or view names, axes, legends and component labels needed to read it. Keep graphical alternatives in the figure. Inspect the diagram at normal size and enlarged. Reject a figure containing the question, text answers, reasoning, or a transcription that gives away the visual state. Solve the delivered text and figure together before acceptance.
