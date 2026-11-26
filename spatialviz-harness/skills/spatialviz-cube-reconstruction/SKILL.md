---
name: spatialviz-cube-reconstruction
description: Generate and verify opposite-face and possible-view questions from a colored or patterned cube net.
---

# Cube Reconstruction

Start a recorder run with the package bridge before opening references. Use [the official audit](references/coverage.md) to choose a mechanism. The package includes original images and annotations for every in-scope source ID. Build new input through FreeCAD with the seeded generator.

For an opposite-face question, take the negative of the named face normal and follow the actual text ordering. For a view question, transport the printed right/up axes and compare the ordered corner under proper rotations. The color-view fallback refers to all three pictured choices. Pattern questions have four figures.

Run the [recorded invocation](MAINTENANCE.md). Inspect the full PNG after verification. Record which visible marks or edges establish the answer before sealing or publishing the candidate.
