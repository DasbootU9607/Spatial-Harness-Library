# Rotation construction skills

The default two skills now run the actual official FreeCAD and image-composition pipeline. See [integration and limitations](../spatialviz-harness/official-rotation/README.md) and each current SKILL.md for setup and parameters. New official-pipeline examples are listed in `official-rotation-examples.md`.

## Historical JavaScript/SVG implementation

The following describes the first published batch. These immutable cases and their links remain available. Their bounds, SVG renderer and paired-view/layer presentation are historical, not the current default.

Two independent packages extend the shared SpatialViz authoring workflow:

- [2D rotation](../spatialviz-harness/skills/spatialviz-2d-rotation/SKILL.md): colored or directional grids, 2-5 rows and columns, complete cell/motif/corner transforms, mirror/swap/orientation/corner proposals, and independent four-orientation equivalence.
- [3D rotation](../spatialviz-harness/skills/spatialviz-3d-rotation/SKILL.md): connected 6-12-cube originals (edited options 5-13), at most four positions per axis, can/cannot polarity, add/delete/move/mirror proposals, and independent 24-proper-rotation equivalence.

Both support safe-integer seeds and parameter JSON. They produce three figures A-C plus the text option D. D means no graphical option meets the current question. The supported answer mode has exactly one qualifying A-C choice. The prior fixed six-cell demonstration remains a separate package.

## Use

The full start/read/note/generate/render/verify/review/finish workflow is in each SKILL.md. Start before task-specific references. An installed package requires the shared checkout, bound by:

```text
node tools/install.cjs --harness spatialviz-harness --destination EMPTY_SKILL_DIRECTORY
```

Example parameter files:

```json
{"rows":3,"cols":4,"mode":"colored","distractors":["mirror","swap"]}
```

```json
{"rows":2,"cols":3,"mode":"patterned","distractors":["orientation","marker"]}
```

```json
{"cubes":8,"polarity":"can","distractors":["mirror","move"]}
```

```json
{"cubes":9,"polarity":"cannot","distractors":["delete"]}
```

After start returns RUN, use `node SKILL_DIRECTORY/scripts/construct.cjs generate --run RUN --task TASK.json --seed 71 --params PARAMETERS.json`. Render, verify and actually inspect the image before recording a passed visual review and finishing. The publisher enforces the final candidate's visual-review gate. Images, task JSON, A-D explanations, reports, candidate history and usage observations use the existing shared exhibition.

## Accepted examples

These are new agent-authored, unranked tasks, not official benchmark records. Each task page links to its exact JSON, verification and build history; the full-size diagram is downloadable SVG.

| Family | Seed | Task | Process |
| --- | ---: | --- | --- |
| colored-grid | 71 | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-fdb5690e9420f87ba277605a) | [Evidence](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-fdb5690e9420f87ba277605a) |
| directional-grid | 107 | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-6c5380284c0b8f6e6e30cda3) | [Evidence](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-6c5380284c0b8f6e6e30cda3) |
| spatial-can | 21 | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-9fbe9af571d1fbcb2850bf19) | [Evidence](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-9fbe9af571d1fbcb2850bf19) |
| spatial-cannot | 89 | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-fe43c745dcc327aa423dc573) | [Evidence](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-fe43c745dcc327aa423dc573) |

The patterned sample preserves an explicitly intentional displaced-corner negative control followed by restoration. Both 3D samples retain an actual visual-review failure: the initial second camera looked from below and could appear inside-out. The accepted revision uses a rear view from above. Historical previews retain the exact recorded rendering and renderer revision; publication does not redraw old versions with current code.

## Evidence and checks

The packages include four requested original questions and one supplementary patterned question, with full annotations, original PNGs and hashes. The initial patterned reference has visually duplicate A/C distractors; this is documented, preserved and supplemented. Official source facts and proposed generation rules are separate in the reference notes. The Chinese working draft is preserved outside the formal packages.

Validation covers seed variation, rectangular rotations, internal motifs, corners, proper rotation groups, achiral and chiral mirrors, count-preserving changes, overlap, connectivity, multi-answer/no-answer rejection, polarity, labels, D semantics, explanation witnesses, malformed data, visual gates, historical rendering preservation and packaged source fidelity. The two packages pass skill-creator validation. The shared/domain suite has 29 tests, including 15 new rotation/publication tests; the existing recorder suite has 44 tests. Browser checks exercise each accepted task on desktop and mobile, including full-size image links, all four answer controls, D feedback, complete explanations, downloads and overflow.

The Windows sandbox initially denied atomic rename in the legacy test temporary directory; those 44 tests pass outside that filesystem restriction. A standalone SVG browser screenshot attempt timed out; the inspected images were rasterized successfully inside an HTML document using the repository's browser configuration. Failed checks remain in local development evidence.

## Deliberate limits

2D supports a fixed palette, dot patterns and triangles; it does not accept arbitrary raster motifs, custom palettes, line motifs or arbitrary-angle rotations. 3D supports bounded equal lattice cubes, not arbitrary meshes or unequal blocks. Every 3D task includes paired views and complete z-layer grids; this is deliberately not a single-view hidden-structure puzzle. Layer round-trip verification proves full occupancy encoding, while human/agent image review checks legibility. Do not crop the layer diagrams out of the delivered question.

D-as-answer generation and calibrated difficulty are not implemented. Models that cannot satisfy requested distractors within the retry bound fail explicitly. Runtime usage remains partial observed session intervals, not complete billed task totals; these sample intervals share an authoring session, overlap and must not be added as independent task costs. Unwrapped editor operations and external commands are outside automatic recorder coverage.
