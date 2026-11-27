# Original assemblies

| Assembly | Changes and required judgment | Inferred answer | Evidence |
|---|---|---|---|
| wind-left | A meshes externally with B; B is keyed to D; W leaves D on the left. Level1/32 uses a cam profile upstream of its load. Here a solver must combine external gear reversal and winding side. | D · down | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-1f0eab592bd5b8de20a915de) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-1f0eab592bd5b8de20a915de) |
| wind-right | Keep the same 16/32 pair, key, input, output and option order. Rethread only the takeoff. The first divergent step is the final tangent of D. | A · up | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-d0c6f70600e876612fd70683) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-d0c6f70600e876612fd70683) |
| clutch-hoist | Keep the left takeoff. Replace the key with a CW-locking clutch and an overrun brake. Level0/8–9 supplies a directional drive precedent; Level1/32–35 supplies a loaded drum. The CCW intermediate shaft now determines whether the brake holds. | C · stationary | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-acf135368cd2ed93d11cd163) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-acf135368cd2ed93d11cd163) |

## Replacement and blind reading

Rigidly bypassing the clutch restores the left-wound keyed assembly. The independent solver changes from stationary to down. An image-only reader identified the external 16/32 mesh, B driving the clutch, overrun brake and taut line at the left. The reader selected C, stationary, before seeing the structural report. The final raster matched the blind input byte for byte.
