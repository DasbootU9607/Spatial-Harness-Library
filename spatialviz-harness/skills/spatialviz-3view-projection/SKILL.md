---
name: spatialviz-3view-projection
description: Build new SpatialViz orthographic projection questions from colored cube stacks or parameterized STEP solids using FreeCAD, TechDraw and the official question compositor.
---

# Three-view projection

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer left view of a colored stack, visible edges of a stepped cad solid, projection of holes in a cad solid, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "nearest-surface",
  "inference": "Infer which red face remains visible from the left.",
  "condition": "The two left-view candidates share the occupied silhouette but differ at one projected ray.",
  "foil": "One option paints the farther cube through its opaque neighbor.",
  "evidence": "Trace the nearest surface at that ray and compare both panels."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


The following explicit recipe reproduces an earlier build. In guided authoring use the RUN from guide and continue at generate after recording the design.

```text
node SKILL/scripts/construct.cjs start --task TASK.json --title "Orthographic projection"
node SKILL/scripts/construct.cjs read --run RUN --file SKILL/references/coverage.md
node SKILL/scripts/construct.cjs generate --run RUN --task TASK.json --seed 117 --params PARAMS.json
node SKILL/scripts/construct.cjs render --run RUN --candidate VERSION
node SKILL/scripts/construct.cjs verify --run RUN --candidate VERSION
```

Read [coverage.md](references/coverage.md) and inspect a packaged original from the selected family. The source-keyed inventory links every audited image to the library's questions directory. [Maintenance and parameters](MAINTENANCE.md) describes the executable environment, coordinates, inputs, evidence and rejection conditions.

Choose `{"branch":"cubes"}` for four graphical left-view options or `{"branch":"cad","mechanism":"bores","given":"Front","target":"Top"}` for a STEP drawing with three graphical options and a textual D. Supply a distinct seed or explicit geometry to vary the construction. Preserve the exported structure and exact final PNG together.

Inspect the candidate PNG. Trace the nearest colored surfaces for cubes. For CAD, follow the requested viewing direction and identify the surviving silhouette, opening and step edges. Reject a plausible second answer, repeated picture, clipping, misplaced label or a discrepancy with the exported structure. Use `review --run RUN --candidate VERSION --outcome failed --review "Observed issue"` and regenerate with `--parent VERSION --basis "Specific correction"`. Keep failed versions and command evidence. For an interrupted run use `resume --run RUN --task TASK.json`.

After a passed independent verification and inspection, record the visual findings and deliver the exact verified candidate.

```text
node SKILL/scripts/construct.cjs review --run RUN --candidate VERSION --outcome passed --review "Specific visible evidence"
node SKILL/scripts/construct.cjs finish --run RUN --candidate VERSION --task TASK.json
```

Honor local-only or prepare-only delivery when requested. Generated questions are unranked. A unique choice concerns the offered views of the described solid. Multiple solids can share orthographic views.
