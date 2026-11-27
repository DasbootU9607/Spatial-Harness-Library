# Maintaining the official 2D rotation skill

The default bridge selects `tools/observatory/adapters/official-rotation-2d.cjs`. Shared local adaptation lives in `spatialviz-harness/official-rotation`; byte-preserved upstream files and MIT license live in `spatialviz-harness/vendor/SpatialViz-Bench-c27f9111a267`. Read `references/official-pipeline.md` and the shared adapter README before edits.

Keep `scripts/model.cjs`, `solve.cjs`, `render.cjs` and the old `rotation-2d.cjs` adapter as legacy JS/SVG support. They are not the default generation path. Do not rewrite old task JSON, diagrams or history. The new adapter's revision covers all active Python runtime files, source manifest/files and compositor font. Fresh verification is required after implementation changes.

From the library root run:

```text
python -m unittest discover -s spatialviz-harness/official-rotation -p "test_*.py"
node --test tools/observatory/tests/*.test.cjs
node tools/check.cjs
node .github/scripts/build-pages.cjs EMPTY_OUTPUT/Spatial-Harness-Library
node tools/browser-check.cjs --root EMPTY_OUTPUT --out QA_DIRECTORY
```

Run skill-creator's `scripts/quick_validate.py` on both packages and exercise an installed bridge. Python tests and saved-task verification need host dependencies but not FreeCAD. New generation requires the actual GUI application. CI verifies committed real outputs rather than claiming to render FreeCAD on a display-less runner. When changing rendering, repeat real FreeCAD generation and inspect every final PNG before publication.

Extend tests for group symmetry, image reflection, equal-count changes, disconnection, duplicate views, hidden differences, question/answer drift and pixel tampering. Keep source facts separate from local proposed rules. Do not make difficulty claims from official level metadata.

Coverage regressions live in `official-rotation/test_coverage.py`: rectangular motif rotations, undirected line/circle symmetry, actual FreeCAD line/circle pixel tampering, and uniform background colors. `fixtures/geometric-raw.json` preserves the real FreeCAD 1.0.2 original render and captured geometry from the geometric-mode seed-37 3x3 construction (2026-11-26); it is an authored regression fixture, not an official source question. Keep `references/coverage.json` synchronized with the pinned dataset; its reviewed family labels are observations, not generator rules.

For patterned/geometric backgrounds, keep black motifs on white texture assets: FreeCAD ImagePlane multiplies texels by its material. Its material must match the empty square. New texture metadata opts into a one-level per-channel background check against the actual material and across all cells. Retain the historical dark-background fixture; `fixtures/uniform-geometric-raw.json` and `fixtures/uniform-dots-raw.json` capture corrected real renders. Regressions must reject a reintroduced dark patterned cell without invalidating historical records. Repeat actual FreeCAD renders for both families after changing this appearance contract.
