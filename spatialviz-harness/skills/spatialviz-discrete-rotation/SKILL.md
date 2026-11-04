---
name: spatialviz-discrete-rotation
description: Construct and verify an asymmetric grid figure and its clockwise quarter-turn choices using the SpatialViz demonstration adapter. For authoring, not model evaluation.
---

# SpatialViz Discrete Rotation

This completed demonstration package exercises the library's construction workflow.
It generates a bounded six-cell grid task with four choices. It does not claim to
implement all SpatialViz rotation tasks or reproduce official benchmark samples.

Before reading task-specific references, start through `scripts/construct.cjs`:

```text
node scripts/construct.cjs start --task TASK.json --title "Quarter-turn construction" --harness spatialviz-harness --skill SKILL_DIRECTORY
```

Retain the returned absolute run directory. Deliver this package's
`references/construction.md` through `read --run RUN --file FILE` before generation.
Use `note --run RUN --file ANNOTATION.json` for concise public goal, sources, change,
reason and expectedChecks. Do not request or reconstruct private reasoning.

The coordinate frame is fixed, with x to the right and y upward. A clockwise
quarter-turn maps (x,y) to (y,-x). The original's unequal arms disambiguate all four
rotations. The answer must identify exactly one option in its recorded order.
No translations, reflections or equivalent duplicate choices are allowed.

```text
node scripts/construct.cjs generate --run RUN --task TASK.json --seed 17
node scripts/construct.cjs render --run RUN --candidate v001
node scripts/construct.cjs verify --run RUN --candidate v001
```

For edits, save a new candidate with `save --task TASK.json --parent v001 --basis
"Explicit revision of v001"`, then render and verify that new candidate. Preserve
failed attempts. Record actual visual inspection with `review --candidate VERSION
--review "Public visual findings" --outcome passed`; generating an image alone
is not visual review. Use `resume --task TASK.json` explicitly after interruption.

Complete with `finish --run RUN --candidate VERSION --task TASK.json --skill
SKILL_DIRECTORY`. This seals the authoring record, checks exact verification and
publishes to the authorized Spatial Harness Library repository and Pages site.
Honor explicit local-only or prepare-only requests with those flags. Observe the
commit's deployment and return the task, skill and process URLs. Unwrapped calls,
unsaved edits and reads outside this bridge remain outside recorded coverage.

The passive collector retains the current client and model. Missing tokens remain
unavailable; observed session subtotals are never presented as billed task totals.
