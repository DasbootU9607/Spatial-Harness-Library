---
name: spatialviz-cube-assembly
description: Create missing-polycube questions with the SpatialViz-Bench FreeCAD builder and official option compositor. Verify rigid packings for irregular target stacks.
---

# Cube Assembly

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer complete a target from one given part, complete a target from two given parts, distinguish equal-volume interfaces, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "equal-volume-interface",
  "inference": "Decide which equal-count L piece fits the raised endpoint.",
  "condition": "A return on the given rail fixes the side of the target interface.",
  "foil": "The foil raises the other endpoint and so has the same volume and opposite handedness.",
  "evidence": "Find a disjoint full packing for the key and exhaust proper rotations of the equal-volume foil."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


Use the archived CubeAssembly toolchain for the learner's image. Its FreeCAD script builds unit solids, captures the complete stack and images the detached parts. Its assembler crops the actual PNGs, labels A/B/C, arranges the upper and lower rows and writes the official choice record. Preserve the native FCStd file, source panels, official composite and annotation. The independent checker reads the unit-cell geometry measured from the native solids and checks the assembled image against the source panels.

## Design a missing piece

For a released-style question, start with a supported irregular stack. Grow a face-connected component along the interface and check that the remainder stays connected. Give the player either one part (Level0) or two parts (Level1). Three pictorial choices offer complements and textual D rejects all three. The archived builder removes different cubes from the missing piece to form its two foils. The official audit also records equal-volume foils and differences between camera angles. Specify the allowed movements in the delivered question.

For an equal-volume question, start with an L-shaped footprint at (0,1,0), (1,1,0) and (1,2,0). Place its fourth cube over the far endpoint at (1,2,1). Place a four-cell rail along the front from (0,0,0) to (3,0,0) and extend it at the right end with (3,1,0) and (3,1,1). The rail and its return fix the given part's position in the target. The required complement has a riser at one end of its L. Put a riser at the other end for a handed foil and above the elbow for a degree-three foil. Each choice has four units.

For the paired question move the single target cube at (1,2,1) to (0,1,1). The official images of the three candidates retain the same letter order. Only the upper cube on the complete target changes position. Re-evaluate the handed pair under all 24 proper lattice rotations. The original complement now fails and the other hand fits. A rotation preserves handedness and the branching degree. In either question the bottom row of the official composite lets the reader inspect where each riser meets the lower elbow.

## Generate

Use this package's installed `scripts/author.cjs` with its Spatial Harness Library binding. Set `SPATIALVIZ_FREECAD` to the FreeCAD GUI executable or provide the checkout's `.harness/freecad-official/runtime.json`. The host Python needs Pillow, OpenCV, NumPy and PyMuPDF for the official utility module.

```sh
node scripts/author.cjs generate --mechanism interface --seed 93177 --out new-question
node scripts/author.cjs solve --out new-question
node scripts/author.cjs test
```

Choose `two-parts` or `three-parts` to run the native random stack and split algorithms. Supply `{"size":[2,3,3]}` via `--params` to set the sampling space. Choose `interface` and `relocated` with the same seed and `{"arm":3}` for the controlled pair. `equal-three` puts a straight equal-volume candidate next to a bent one. `changed-view` varies candidate camera yaw in the native view. For these four designed modes, `arm` is an integer from 2 through 5. The official choice writer assigns the intact missing piece to A, B or C.

## Verify and release

Test each candidate together with the given parts. Normalize proper rotated placements and enumerate lattice translations into the target. For fixed-orientation problems use translations alone. Reject out-of-target cells and intersecting placements, then require exact target coverage. Record the number of packings and a placement witness for each candidate. Multiple packings of one option are admissible. Two winning options invalidate the question.

Open the official composite at readable size with the accompanying question. Check the total cube count, interfaces, movement rule, order of detached pieces and every option label before approving the recorded review. The checker fingerprints each cropped panel against the corresponding rectangle in the final image and tests the target and options against native B-rep coordinates. Finish through the bound publication entry after the visual review.

Read the [official audit](references/official-audit.md) for released examples and annotation exceptions, the [design record](references/design.md) for tool responsibilities and host adaptations, and the [coverage table](references/coverage.md) for verified cases.

## Accept the question text and figure

Deliver the stem, necessary written conditions and every text answer as selectable text in the task data. Deliver a separate figure containing the visual evidence, with only the panel letters, stage or view names, axes, legends and component labels needed to read it. Keep graphical alternatives in the figure. Inspect the diagram at normal size and enlarged. Reject a figure containing the question, text answers, reasoning, or a transcription that gives away the visual state. Solve the delivered text and figure together before acceptance.
