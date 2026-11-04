---
name: spatialviz-3d-rotation
description: Author new 3D rotation questions through SpatialViz-Bench's actual FreeCAD modeling and official image-composition pipeline, with independent geometry and pixel validation, recorded revisions and publication.
---

# SpatialViz 3D Rotation

Create new unranked questions. Default to the pinned official FreeCAD pipeline; never silently substitute the legacy JavaScript/SVG generator or reuse official question images. Keep maintained instructions and generated questions in English. Original annotations remain unchanged in packaged references.

## Prepare and record

Keep the shared library checkout available. Installed packages bind to it through `node tools/install.cjs --harness spatialviz-harness --destination EMPTY_DIRECTORY`. Read `references/official-pipeline.md` for actual dependencies, source version, patches and limits. A real FreeCAD GUI application is required; host Python cannot import its GUI modules. Set `SPATIALVIZ_FREECAD` to the executable and install the host dependencies described there. Failure to launch or render is a concrete blocker, not permission to switch renderers.

Use this package's bridge (substitute absolute paths). Start before task-specific reference reads or generation:

```text
node SKILL_DIRECTORY/scripts/construct.cjs start --task TASK.json --title "Official 3D rotation construction"
node SKILL_DIRECTORY/scripts/construct.cjs read --run RUN --file SKILL_DIRECTORY/references/cases.md
```

Retain RUN. For an existing active run, explicitly `resume --run RUN --task TASK.json`. Read the relevant packaged JSON through `read`, and directly inspect its original PNG. The JSON/PNG resources are included in the installed skill. Record source findings and design choices with `note --run RUN --file NOTE.json` using goal, sources, change, reason and expectedChecks. Do not present unwrapped commands as recorder-observed work.

## Supported inputs

Use `{"count":8,"polarity":"can"}` or `{"count":9,"polarity":"cannot"}`. Default `sourceMode` is `controlled-coordinates`: the adapter proposes new face-connected coordinates, and passes them to the official cube creation, compound, rotation, removal and FreeCAD rendering functions. Optional `cubes` supplies complete integer coordinates. Originals support 5–16 cubes within six positions per axis; an official removal can leave four cubes. These are local validation bounds, not official rules.

`sourceMode:"upstream-random"` retains the upstream placement algorithm with local connectivity fixes; optional `spaceSize:[3,3,2]` and `cubeRange:[8,10]` expose its defaults. It may exhaust bounded rejection sampling. The can mode selects one proper rotation, a verified image mirror and a removed-cube option. The cannot mode selects the removed-cube model and two proper rotations. Add/move edits from the previous JS generator are not exposed by this official adapter.

Use only the official single isometric view of each object in the task image. No paired views or layer diagrams. Enumerate the 24 determinant-positive lattice rotations after translation normalization. Every displayed cube must have a fully visible face, checked by projected-face occlusion and actual image inspection. Reject disconnected removals and rotation-equivalent mirrors. The official vertical screen flip is not lattice-preserving at this camera and is rejected; horizontal flips are interpreted using the actual camera reflection matrix. A single view cannot establish uniqueness for unrestricted unseen geometry: the task explicitly states the full-face visibility condition.

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
