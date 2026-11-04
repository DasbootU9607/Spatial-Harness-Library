# Official FreeCAD rotation examples

These four new, unranked questions were generated through the updated skills, the real FreeCAD 1.0.2 GUI application and the pinned official generate_data/compositor. They are separate from official benchmark records and the [legacy JS/SVG batch](rotation-skills.md). Each final PNG was inspected and each delivered specification passed independent geometry, pixel and answer validation.

| Family | Seed | Answer | Task | Construction history |
| --- | ---: | --- | --- | --- |
| colored | 31 | B | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-b951b5f3f5b0adbf7edb6ef8) | [Process](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-b951b5f3f5b0adbf7edb6ef8) |
| patterned | 37 | A | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-1ffc3acd58a1ff99886e687d) | [Process](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-1ffc3acd58a1ff99886e687d) |
| can | 81 | C | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-f79db8d6a2473b80ac1a9005) | [Process](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-f79db8d6a2473b80ac1a9005) |
| cannot | 0 | C | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-0dd9dde74dafe28bbfdc8e59) | [Process](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-0dd9dde74dafe28bbfdc8e59) |

The task pages link to the full PNG, exact JSON, A-D explanations and verification report. JSON includes original/panel images, actual grid or cube structures, camera/placement data, actual object and selection seeds, source and patch hashes, FreeCAD version and a CAD snapshot. Histories retain rejected complete candidates; failures before a complete candidate remain command/resampling evidence. The negative example retains 148 versions, including visibility/connectivity failures and the transition to an explicitly supplied path. Dense random originals can have a high rejection rate under the single-view contract.

## Parameters

### colored

```json
{
  "rows": 3,
  "cols": 2,
  "mode": "colored"
}
```

### patterned

```json
{
  "rows": 2,
  "cols": 4,
  "mode": "patterned",
  "matrix": [
    [
      1,
      1,
      0,
      1
    ],
    [
      1,
      0,
      1,
      1
    ]
  ]
}
```

### can

```json
{
  "count": 8,
  "polarity": "can"
}
```

### cannot

```json
{
  "count": 9,
  "polarity": "cannot",
  "cubes": [
    [
      0,
      0,
      0
    ],
    [
      1,
      0,
      0
    ],
    [
      2,
      0,
      0
    ],
    [
      3,
      0,
      0
    ],
    [
      3,
      1,
      0
    ],
    [
      3,
      2,
      0
    ],
    [
      3,
      3,
      0
    ],
    [
      3,
      3,
      1
    ],
    [
      3,
      3,
      2
    ]
  ]
}
```

Use the relevant skill bridge with `start`, `read`, `generate --seed SEED --params PARAMETERS.json`, `render`, `verify`, `review` and `finish`. See [official integration, dependencies, source scripts and all local patches](../spatialviz-harness/official-rotation/README.md).

## Difference from the earlier batch

The earlier cases used custom JavaScript/SVG, paired 3D views and complete layer diagrams. These cases use actual official FreeCAD rendering and official image-level option/composition operations, with one view per model. The new independent checks bind source geometry to visible pixels and reject non-lattice screen flips, clipped solids, hidden-only differences, equivalent mirrors and duplicated options. Official images were not reused as newly generated questions. The old task and process URLs remain intact and their pages identify the legacy generator.

The supported bounds are local implementation bounds, not original benchmark rules: 1–8 rows/columns with at least four cells, and 5–16 original unit cubes within six positions per axis. Arbitrary textures/meshes, continuous rotation, D-answer tasks, automatic difficulty grading and added/moved-cube distractors are not implemented in this official adapter. Every shown 3D cube must have a fully visible face; unrestricted hidden-solid reconstruction is not claimed. See each skill for complete input limits.

## Validation performed

Both skill-creator validations passed. The shared Node suite passed 33 tests, including the 13-test Python suite that replays all four committed FreeCAD outputs and exercises geometry, image tampering, semantic positions and frame bounds. The recorder suite passed 44 tests; the authoring integration suite passed 14. Existing site, attribution, history, thumbnail and integrity checks passed. Desktop/mobile browser checks passed 28 scenarios including all old and new rotation tasks, their D choices and explanations. Windows system-temp restrictions required running the existing integration suites with normal process access; those tests passed on retry.

The first deployment attempt exposed a platform-specific font-layout difference (Linux RAQM versus Windows BASIC), while geometry, source-image correspondence and option replay passed. The strict official image tests now run on the validated Windows backend; the existing Linux site/browser suites remain enabled. Deployment requires both jobs. This changes CI environment selection, not the question images or their recorded validation.
