---
name: spatialviz-cube-reconstruction
description: Generate and verify opposite-face and possible-view questions from a colored or patterned cube net.
---

# Cube Reconstruction

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer identify the opposite face, choose a colored corner view, choose a pips corner view, choose a lines corner view, choose a mosaic corner view, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "face-orientation",
  "inference": "Infer the direction of a stripe after folding the marked face toward the observer.",
  "condition": "Two choices name the same three faces around the corner.",
  "foil": "One choice rotates the striped face in place.",
  "evidence": "Compare ordered markings under proper rotations, then ignore tile direction to identify the surviving foil."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


Use [the official audit](references/coverage.md) for additional evidence on the selected mechanism. The package includes original images and annotations for every in-scope source ID. Build new input through FreeCAD with the seeded generator.

For an opposite-face question, take the negative of the named face normal and follow the actual text ordering. For a view question, transport the printed right/up axes and compare the ordered corner under proper rotations. The color-view fallback refers to all three pictured choices. Pattern questions have four figures.

Run the [recorded invocation](MAINTENANCE.md). Inspect the full PNG after verification. Record which visible marks or edges establish the answer before sealing or publishing the candidate.

## Accept the question text and figure

Deliver the stem, necessary written conditions and every text answer as selectable text in the task data. Deliver a separate figure containing the visual evidence, with only the panel letters, stage or view names, axes, legends and component labels needed to read it. Keep graphical alternatives in the figure. Inspect the diagram at normal size and enlarged. Reject a figure containing the question, text answers, reasoning, or a transcription that gives away the visual state. Solve the delivered text and figure together before acceptance.
