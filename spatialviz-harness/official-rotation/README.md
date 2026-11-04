# Official SpatialViz rotation integration

The two skills now execute actual official modeling code in the FreeCAD GUI application, then execute the selected official `generate_data.py` dispatch on the rendered objects. No local object renderer or replacement compositor is used for new cases. The independent image auditor reconstructs expected pixels only for checking; those pixels are never delivered as the question.

## Dependencies and invocation

Validated on Windows with FreeCAD 1.0.2, embedded Python 3.11, Qt/PySide, Part and Image workbenches. The official portable release was downloaded from `https://github.com/FreeCAD/FreeCAD/releases/download/1.0.2/FreeCAD_1.0.2-conda-Windows-x86_64-py311.7z`; SHA-256 `e89afe0433063c7f2484326b8b9a64e3027dc29d145ddb438a44046c960827a6`. Runtime binaries stay private and are not committed. Other FreeCAD/platform versions require a real render smoke test; they are not claimed validated.

Set `SPATIALVIZ_FREECAD` to the actual GUI executable. A local `.harness/freecad-official/runtime.json` can alternatively specify `freecad` plus distribution provenance. `SPATIALVIZ_PYTHON` optionally selects host Python. Install host dependencies:

```text
python -m pip install -r spatialviz-harness/official-rotation/requirements.txt
```

Use the skill's `scripts/construct.cjs` entrypoint so recording starts before task-specific resources. Direct `generate.py --dimension 2 --seed 81 --params PARAMETERS.json --out NEW_DIRECTORY` is a development entrypoint, not an accepted recorded build. FreeCAD must run in a desktop/application environment. `FreeCADCmd` and importing FreeCADGui into host Python are not substitutes. Each job has an isolated configuration, a 150-second application timeout and retained logs. Generation bounds 12 object attempts and 24 official selection attempts each; unavailable rendering or exhausted sampling stops explicitly.

## Source and adaptations

Upstream: [SpatialViz-Bench](https://github.com/wangst0181/SpatialViz-Bench/tree/c27f9111a2674f2ea03e2ca1f5833326cf1eec1a), MIT, copyright 2025 wangst0181. Eight selected files are byte-preserved under `../vendor/SpatialViz-Bench-c27f9111a267`, with archive and individual hashes in SOURCE.json. Original source and license are distinct from this local adapter. `upstream.py` applies asserted text patches in memory and records original/adapted hashes, reasons and occurrence counts per invocation.

| Official entry | Actual invocation and local adaptations |
| --- | --- |
| `create_mental_rotation/create_2D_rotation.py` | Calls `create_squares` with a parameterized binary mask, actual upstream palette/corner selection, Part geometry and FreeCAD `saveImage`. Captures actual geometry/camera at save boundaries. Uses 12-unit cells and 3-unit markers to match upstream integer marker placement. |
| `create_mental_rotation/create_2D_rotation_complex.py` | Calls `create_squares`, including mode 1 when asymmetric patterns exist. Supplies locally authored six dot textures plus quarter-turn variants because upstream expects external assets. Injects App, fixes FreeCAD 1.0 DiffuseColor list compatibility, and retains texture identity before FreeCAD embeds/renames image files. |
| `create_mental_rotation/create_3D_rotation.py` | Calls `main`, `create_cube`, compound creation, axis rotations, random removal and actual FreeCAD renderer. Fixes undefined `i`, diagonal base connectivity, rejected-document cleanup and unbounded loops. Exposes count filtering; optional structured coordinates replace only random placement and skip base additions. |
| `utils.py` | Keeps the upstream crop/rotation/flip functions. Replaces `split('.')` with `splitext` so dotted working directories are valid. Preserves actual cv2 flip operations. |
| `mental_rotation_tasks_utils.py` | Executes the official option selection and `create_composite_image_Roatation`. Packages its named DejaVu font and license, sorts traversal, fixes literal answer-label placeholders and incorrect 2D flip-axis descriptions, and sets the requested D wording. |
| `generate_data.py` | Removes unrelated task imports, supplies the working folder and activates exactly the selected official 2D or 3D mode. All other dispatches stay inactive. |

Runtime adjustments initialize FreeCAD's GUI off screen (hiding the main window prevents GUI document creation), wait for camera animation, use orthographic projection and white PNG background, and capture actual camera and visible solids/planes before saving. An output-aspect framing step fits visible bounds with a 24-pixel margin: upstream `fitAll` uses the GUI viewport aspect, which can clip tall models when saving a different PNG aspect. The verifier separately requires every projected cube vertex inside the PNG. FreeCAD reports its own version. Coordinates come from visible solid bounding boxes after object placement, not intended generator labels. Pillow is pinned for exact compositor pixel replay.

## Validation and presentation

The independent solver enumerates four decorated planar rotations or all 24 proper lattice rotations, removing translation. Final explanations are derived from these comparisons. Original annotations remain a provenance record. D means none of A-C qualifies; accepted tasks have exactly one A-C answer. Removed-cube options must remain face connected.

The official 2D filenames call cv2.flip axis 0 “horizontal” and axis 1 “vertical”; tracing follows the actual pixels. At the fixed 3D isometric camera only horizontal screen reflection corresponds to an integer-lattice spatial reflection. The official vertical screen reflection is rejected and selection resampled. A mirror that remains properly rotation equivalent is rejected regardless of its filename.

Raw PNGs are checked against captured geometry: projected grid color, dot count/direction and red marker; projected cube silhouette and full-face edge samples with a two-pixel raster tolerance. Cell indices and corner semantics are checked against their actual FreeCAD positions; opaque texture cells compare the visible dot geometry, not the covered plane material. Every shown cube needs a full-face witness using convex projected occlusion (unit-face area tolerance 1e-5 for camera float precision). Visible face signatures are compared against every original orientation for non-equivalent options. Exact crop/rotation/flip replay binds raw PNGs to panels; independent compositor reconstruction binds the panels and label positions to final PNG pixels. All four panels stay in the upstream one-row single-view presentation. D is text in the question interface, as in the benchmark.

These checks plus actual final-image inspection are separate acceptance steps. Single-view inversion is not proved unique among arbitrary hidden solids: the question explicitly states that every cube has a fully visible face. Silhouette checks alone are insufficient. Small raster tolerance and sampled visible signatures are not a replacement for the exact geometry test or visual review. No difficulty calibration is claimed.

## Reproducibility and history

Public task JSON retains parameters, object/selection seeds, actual structures and placements, camera data, FreeCAD version, source/patch receipts, raw/panel/final PNGs and a hashed final FreeCAD document snapshot. That document contains the modeling session's final state; raw records are the authoritative per-view snapshots. Private jobs also retain macros, all output directories, logs and rejected sampling attempts. Fully composited rejected candidates are imported into the shared immutable version/test history. Failures before a complete structural candidate remain recorded command/resampling evidence.

The recorder and publisher only gained PNG preview support. There is no new recorder, exhibition site or publication authority. Previous JS/SVG records remain immutable at their old links and are labeled legacy on their task pages. Their old 2–5 grid and 6–12 cube bounds, paired 3D views and layer diagrams do not apply to this adapter. New bounds (1–8 grid dimensions with at least four cells; 5–16 original cubes within six positions per axis) are local implementation limits, not official benchmark rules.

Not implemented by the official adapter: D answers, arbitrary pattern images, continuous-angle transforms, arbitrary mesh solids, added/moved cube distractors, manual swap/marker distractors, multi-view question images, human difficulty grading, and automatic FreeCAD installation. The retained legacy adapters still support their documented historical capabilities.
