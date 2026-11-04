# Maintaining the official 3D rotation skill

The default bridge selects `tools/observatory/adapters/official-rotation-3d.cjs`. Shared local adaptation lives in `spatialviz-harness/official-rotation`; byte-preserved upstream files and MIT license live in `spatialviz-harness/vendor/SpatialViz-Bench-c27f9111a267`. Read `references/official-pipeline.md` and the shared adapter README before edits.

Keep `scripts/model.cjs`, `solve.cjs`, `render.cjs` and the old `rotation-3d.cjs` adapter as legacy JS/SVG support. They are not the default generation path. Do not rewrite old task JSON, diagrams or history. The new adapter's revision covers all active Python runtime files, source manifest/files and compositor font. Fresh verification is required after implementation changes.

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
