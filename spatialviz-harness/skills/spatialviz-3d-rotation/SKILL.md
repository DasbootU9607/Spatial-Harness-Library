---
name: spatialviz-3d-rotation
description: Construct, render, independently verify and publish new 3D rotation questions from seeded parameters using the Spatial Harness recorder. For question authoring, not model evaluation.
---

# SpatialViz 3D Rotation

Build actual new tasks, not copies of the reference questions. Preserve the official question identities and original difficulty annotations only in references. Generated tasks are unranked. Keep maintained files and generated task text in English.

## Start recording before reference use

Run this package's bridge from any working directory, using its actual absolute path. The installed package needs the shared library checkout bound by `tools/install.cjs`; it has no separate recorder or publisher.

```text
node SKILL_DIRECTORY/scripts/construct.cjs start --task TASK.json --title "3D rotation construction"
```

Retain the returned run directory. Before reading task-specific references, explicitly start or `resume --run RUN --task TASK.json`. Read `references/cases.md` and the relevant packaged JSON using `read --run RUN --file FILE`. Open the matching original PNG directly with the available image viewer, and record the delivered image and actual findings in the run. The original PNGs and full official annotations travel with this package. Read the limitations and fact/rule distinction in `references/cases.md`.

Use `note --run RUN --file NOTE.json` for public `goal`, `sources`, `change`, `reason`, and `expectedChecks`. Record concise design decisions, not private reasoning. Passive usage capture retains the current client/model and reports missing coverage honestly; never launch or change a model just to collect usage.

## Supported construction

Generate 6 to 12 cubes with at most four lattice positions along each axis. Local edits may give options 5 to 13 cubes. Every model is unique-position and face connected. Both `can` and `cannot` question polarities are supported.

Parameters: `{"cubes":8,"polarity":"can","distractors":["mirror","move"]}` or `{"cubes":9,"polarity":"cannot","distractors":["delete"]}`. Supply two distractor methods for `can`, one for `cannot`; `add`, `delete`, `move`, and `mirror` are supported. Recheck connectivity and all 24 proper rotations after every edit. Some reflections are rotation equivalent and must be rejected. The generator retries a bounded number of times and explicitly fails if it cannot satisfy the request.

Output uses paired isometric views plus complete, consistently oriented z-layer grids. The layers are part of the question and disclose every occupied and empty position. This is not an unaided single-view reconstruction task. Arbitrary meshes, arbitrary camera poses, unequal cubes, continuous rotations outside this lattice representation, internally hidden evidence without layer disclosure, D-answer tasks and calibrated difficulty are not supported.

All seeds must be safe integers. Variation changes geometry, poses, edits and option order. A, B and C are the three graphical choices. D is the text `All three other options are incorrect`: none of A-C satisfies the current question. Exactly one A-C choice must qualify. D is never the correct answer in this version. Reject duplicate displayed options and multiple or zero qualifying choices.

Use a right-handed integer lattice. The solver independently enumerates signed permutation matrices of determinant +1, exactly 24, and normalizes translation before comparing occupied coordinates. Determinant -1 reflections are excluded. A 180-degree turn about an axis is a valid rotation. Different cube counts prove inequivalence; equal counts require the full structural comparison. For negative questions, a non-equivalent model is the qualifying answer; keep equivalence and correctness distinct.

## Construct, inspect and revise

Write parameters to a JSON file, then use the shared interface:

```text
node SKILL_DIRECTORY/scripts/construct.cjs generate --run RUN --task TASK.json --seed 71 --params PARAMETERS.json
node SKILL_DIRECTORY/scripts/construct.cjs render --run RUN --candidate v001
node SKILL_DIRECTORY/scripts/construct.cjs verify --run RUN --candidate v001
```

Verification reads the saved structural candidate and recomputes equivalence, answer polarity, final labels, uniqueness, per-option witnesses and rendering contract. It does not trust constructor operation labels. See `scripts/solve.cjs`; `scripts/model.cjs` uses a separate construction transform. The adapter report binds the exact specification and tool revision.

Open the final SVG at full size or rasterize it with a browser and inspect the PNG. Check labels A-C, D text, uncut geometry, consistent scale, readable details and the actual distinguishing evidence for each option. Compare the two views with every z layer. Layer origin is bottom left, x increases right and y increases up; z increases from left to right. Verify no layer is clipped or missing. The complete-layer round-trip check proves encoding coverage, not human legibility. Do not accept hidden differences on the strength of the 3D solver alone.

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
