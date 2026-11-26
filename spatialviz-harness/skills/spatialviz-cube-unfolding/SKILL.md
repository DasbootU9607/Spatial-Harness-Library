---
name: spatialviz-cube-unfolding
description: Generate and verify four candidate cube nets against the visible corner of a colored or patterned cube.
---

# Cube Unfolding

Start a recorder run with the package bridge before opening references. Use [the official audit](references/coverage.md) to choose a mechanism. The package includes original images and annotations for every in-scope source ID. Build new input through FreeCAD with the seeded generator.

Fold each of A–D. Compare only the three visible markings, their cyclic order and their printed orientation under each proper rotation. Distinct layouts or hidden faces may yield the same visible corner. For can, exactly one matches. For cannot, exactly one fails.

Run the [recorded invocation](MAINTENANCE.md). Inspect the full PNG after verification. Record which visible marks or edges establish the answer before sealing or publishing the candidate.
