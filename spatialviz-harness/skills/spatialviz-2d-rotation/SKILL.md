---
name: spatialviz-2d-rotation
description: Author new 2D rotation questions through SpatialViz-Bench's actual FreeCAD modeling and official image-composition pipeline, with independent geometry and pixel validation, recorded revisions and publication.
---

# SpatialViz 2D Rotation

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer colored squares, dice dots, lines and circles, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "motif-orientation",
  "inference": "Infer the turn of the black dot pair inside its new cell.",
  "condition": "One reflected choice shares the grid occupancy and corner of the correct choice.",
  "foil": "The closest foil moves the pair to the right cell but leaves it horizontal.",
  "evidence": "Erase internal directions: both choices should survive; restore the two dot positions to separate them."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


Create new unranked questions. Default to the pinned official FreeCAD pipeline; never silently substitute the legacy JavaScript/SVG generator or reuse official question images. Keep maintained instructions and generated questions in English. Original annotations remain unchanged in packaged references.

## Prepare and record

Keep the shared library checkout available. Installed packages bind to it through `node tools/install.cjs --harness spatialviz-harness --destination EMPTY_DIRECTORY`. Read `references/official-pipeline.md` for actual dependencies, source version, patches and limits. A real FreeCAD GUI application is required; host Python cannot import its GUI modules. Set `SPATIALVIZ_FREECAD` to the executable and install the host dependencies described there. Failure to launch or render is a concrete blocker, not permission to switch renderers.

For explicit reproduction of an earlier recipe, the bridge also supports the following start command. In guided authoring continue with the RUN returned by guide.

```text
node SKILL_DIRECTORY/scripts/construct.cjs start --task TASK.json --title "Official 2D rotation construction"
node SKILL_DIRECTORY/scripts/construct.cjs read --run RUN --file SKILL_DIRECTORY/references/cases.md
```

Retain RUN. For an existing active run, explicitly `resume --run RUN --task TASK.json`. Read the relevant packaged JSON through `read`, and directly inspect its original PNG. The JSON/PNG resources are included in the installed skill. Record source findings and design choices with `note --run RUN --file NOTE.json` using goal, sources, change, reason and expectedChecks. Do not present unwrapped commands as recorder-observed work.

## Supported inputs

Choose `mode:"colored"`, `mode:"patterned"` (dice dots), or `mode:"geometric"` (line/circle motifs). Read [coverage.md](references/coverage.md) for the complete pinned official inventory, parameter examples and motif IDs. All three modes accept `rows` and `cols` independently from 1 to 8, with at least four cells: 2x3, 3x2, 3x3, 3x4 and 4x3 are supported, not a fixed six-cell template. These are adapter bounds, not benchmark rules. Describe sizes as rows x columns; official source filenames encode columns then rows.

Optional `matrix` is a rows-by-cols binary mask: 1 fills a cell, 0 retains a grey empty cell. In patterned/geometric mode, optional `patternMatrix` selects texture IDs `"1"` through `"6"` or `null` for grey. Its mask must agree with `matrix` if both are supplied. Upstream palette/texture selection remains seeded when unspecified. Textures are locally authored inputs to the official FreeCAD image-plane script, not copied official question images.

Rotate cell positions, dot geometry or line endpoints/circle centers, and the red corner together; quarter-turns exchange rows and columns. The independent solver enumerates all four orientations including identity, canonicalizes unordered dots and undirected segments, and preserves circle radii. The pixel auditor checks actual dots or line/circle marks. Do not use motif IDs alone to establish equivalence. The official compositor proposes mirrors and locally rotated asymmetric motifs; equivalent mirrors, symmetry-preserving edits and duplicate displays are rejected.

Patterned and empty cells must share the same light-grey background. The adapter supplies white-background black motifs and matches the FreeCAD image-plane material to the underlying square; FreeCAD applies the grey once. Inspect the actual PNG and require the automatic per-cell background check. Do not recolor delivered images after rendering or use background shade as an extra pattern cue.

Arbitrary external textures, filled polygons, custom palettes, mixed dot/line vocabularies in one grid, manual swaps/marker edits and non-right-angle rotations remain unsupported. Six line/circle motifs cover the visually audited geometric family, not arbitrary geometry.

A, B and C are graphical options. D is the text `All three other options are incorrect`, meaning no A-C option satisfies the current question. Exactly one A-C answer is required; D-answer tasks are outside this release. All seeds must be safe integers. The controller bounds both object generation and option resampling and preserves rejected output. A proposed operation alone never establishes a distractor's validity.

## Generate, validate and inspect

Write the chosen parameters to PARAMETERS.json:

```text
node SKILL_DIRECTORY/scripts/construct.cjs generate --run RUN --task TASK.json --seed 81 --params PARAMETERS.json
node SKILL_DIRECTORY/scripts/construct.cjs render --run RUN --candidate VERSION
node SKILL_DIRECTORY/scripts/construct.cjs verify --run RUN --candidate VERSION
```

Use the returned VERSION: rejected fully composited candidates may precede it. The bridge invokes the official modeling script inside FreeCAD, captures actual document geometry and camera at each render, and executes the official `generate_data.py` dispatch and compositor. The shared run records the actual command. The independent verifier recomputes rotation relations, question polarity, answer uniqueness, labels, per-option explanations, connectivity, model-to-pixel correspondence, actual crop/rotation/flip operations and final composite pixels. Verifier identity covers local runtime source, vendored source and font bytes.

Open the exact final PNG at full size. Inspect Original/A/B/C labels, clear and complete geometry, red markers or cube faces, and visible evidence for each answer relation. D remains text in the task interface, matching the official layout. No internal auxiliary image may replace this final-image inspection.

```text
node SKILL_DIRECTORY/scripts/construct.cjs review --run RUN --candidate VERSION --outcome passed --review "Specific findings from the actual PNG"
```

Record a failed review if the image is ambiguous and generate a new candidate in the same run using `--parent VERSION --basis "Specific correction"`. Retain rejected versions and their reports. Do not hand-edit an answer or label to fit the intended result. Re-run verification and visual review for revised bytes.

## Deliver

```text
node SKILL_DIRECTORY/scripts/construct.cjs finish --run RUN --candidate VERSION --task TASK.json
```

The existing publisher seals, registers, checks, publishes and observes Pages deployment; honor explicit local-only or prepare-only requests. A sealed run cannot reopen. Deliver the PNG, exact task JSON (including raw render images, model/camera data, source/adaptation receipts and CAD snapshot), answers, independent verification and build-process links. Usage is passive current-session evidence with coverage limitations. Preserve historical JS/SVG cases and their original links and generation labels. See `MAINTENANCE.md` before implementation changes.
