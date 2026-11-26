---
name: spatialviz-3view-projection
description: Build new SpatialViz orthographic projection questions from colored cube stacks or parameterized STEP solids using FreeCAD, TechDraw and the official question compositor.
---

# Three-view projection

Use the installed package's `scripts/construct.cjs` bridge with the shared library checkout. Start a run for the exact destination before reading references. Keep variants of one question in that run.

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
