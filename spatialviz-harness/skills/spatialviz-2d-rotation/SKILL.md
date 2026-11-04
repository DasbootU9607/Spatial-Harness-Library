---
name: spatialviz-2d-rotation
description: Construct, render, independently verify and publish new 2D rotation questions from seeded parameters using the Spatial Harness recorder. For question authoring, not model evaluation.
---

# SpatialViz 2D Rotation

Build actual new tasks, not copies of the reference questions. Preserve the official question identities and original difficulty annotations only in references. Generated tasks are unranked. Keep maintained files and generated task text in English.

## Start recording before reference use

Run this package's bridge from any working directory, using its actual absolute path. The installed package needs the shared library checkout bound by `tools/install.cjs`; it has no separate recorder or publisher.

```text
node SKILL_DIRECTORY/scripts/construct.cjs start --task TASK.json --title "2D rotation construction"
```

Retain the returned run directory. Before reading task-specific references, explicitly start or `resume --run RUN --task TASK.json`. Read `references/cases.md` and the relevant packaged JSON using `read --run RUN --file FILE`. Open the matching original PNG directly with the available image viewer, and record the delivered image and actual findings in the run. The original PNGs and full official annotations travel with this package. Read the limitations and fact/rule distinction in `references/cases.md`.

Use `note --run RUN --file NOTE.json` for public `goal`, `sources`, `change`, `reason`, and `expectedChecks`. Record concise design decisions, not private reasoning. Passive usage capture retains the current client/model and reports missing coverage honestly; never launch or change a model just to collect usage.

## Supported construction

Rows and columns independently range from 2 to 5. `mode` is `colored` or `patterned`. Colored cells use a five-color palette; patterned cells use directional dot sets or filled triangles. Arbitrary images, custom palettes, line motifs, free-angle rotation and D-answer tasks are not supported. The independent solver nevertheless includes the identity rotation.

Parameters: `{"rows":3,"cols":2,"mode":"colored","distractors":["mirror","swap"]}`. Exactly two distractor methods are required. Supported methods: `mirror`, `swap`, `orientation` (patterned only), `marker`. Use `{"rows":2,"cols":4,"mode":"patterned","distractors":["orientation","marker"]}` to exercise directional geometry. A method is only a proposal: reject any result that is still rotation equivalent or duplicates a displayed option.

All seeds must be safe integers. Variation changes geometry, poses, edits and option order. A, B and C are the three graphical choices. D is the text `All three other options are incorrect`: none of A-C satisfies the current question. Exactly one A-C choice must qualify. D is never the correct answer in this version. Reject duplicate displayed options and multiple or zero qualifying choices.

Use screen coordinates: x right, y down. One clockwise turn maps `(x,y)` to `(-y,x)` before translating the grid bounds to zero. Rotate cell centers, local motif coordinates and boundary-corner coordinates together. A quarter-turn exchanges rows and columns. Match actual point/edge geometry, not motif names or generation labels. Dots are unordered; closed polygon edges are invariant to vertex start and traversal direction.

## Construct, inspect and revise

Write parameters to a JSON file, then use the shared interface:

```text
node SKILL_DIRECTORY/scripts/construct.cjs generate --run RUN --task TASK.json --seed 71 --params PARAMETERS.json
node SKILL_DIRECTORY/scripts/construct.cjs render --run RUN --candidate v001
node SKILL_DIRECTORY/scripts/construct.cjs verify --run RUN --candidate v001
```

Verification reads the saved structural candidate and recomputes equivalence, answer polarity, final labels, uniqueness, per-option witnesses and rendering contract. It does not trust constructor operation labels. See `scripts/solve.cjs`; `scripts/model.cjs` uses a separate construction transform. The adapter report binds the exact specification and tool revision.

Open the final SVG at full size or rasterize it with a browser and inspect the PNG. Check labels A-C, D text, uncut geometry, consistent scale, readable details and the actual distinguishing evidence for each option. Inspect every motif direction and corner; do not treat a motif identifier as visible proof.

```text
node SKILL_DIRECTORY/scripts/construct.cjs review --run RUN --candidate v001 --outcome passed --review "Actual visual findings for this exact candidate"
```

Do not record a passed visual review without inspecting the image. Preserve failed versions. Edit TASK.json, save a new candidate with `save --run RUN --task TASK.json --parent v001 --basis "Specific correction"`, then render, verify and visually review that new version. For an intentional change to geometry or option order, recompute the answer using the domain solver rather than editing labels by hand. Reports for old versions do not validate new bytes.

## Deliver through the existing workflow

```text
node SKILL_DIRECTORY/scripts/construct.cjs finish --run RUN --candidate VERSION --task TASK.json
```

The normal completion seals the run, verifies exact evidence, registers the task in the common catalog, publishes to the authorized library and checks deployment. Honor explicit `--local-only` or `--prepare-only` requests. Never reopen a sealed run. Return task, skill and process URLs and actual test results. Deliver the SVG, exact JSON, answer and A-D explanations, independent verification report, candidate history and available usage evidence. The publisher requires a passed visual review for the final candidate of this skill.

For implementation changes and regression commands, read `MAINTENANCE.md`. Reads or commands outside the bridge remain outside automatic recorder coverage and must not be described as fully observed.
