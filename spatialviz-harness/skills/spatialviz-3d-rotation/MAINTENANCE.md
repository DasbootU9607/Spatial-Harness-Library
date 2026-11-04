# Maintaining spatialviz-3d-rotation

Keep this package separate from the six-cell `spatialviz-discrete-rotation` demonstration. `scripts/model.cjs` constructs candidates; `scripts/solve.cjs` independently enumerates equivalence; `scripts/render.cjs` creates SVG diagrams. The shared adapter in `tools/observatory/adapters/rotation-3d.cjs` supplies the common task/report contract. `rotation-support.cjs` hashes all three domain files and its own source into the verifier revision. All public candidate tests bind exact bytes through the existing recorder.

Run from the library root:

```text
node --test tools/observatory/tests/rotation-domains.test.cjs
node --test tools/observatory/tests/*.test.cjs
node tools/check.cjs
node .github/scripts/build-pages.cjs EMPTY_OUTPUT_DIRECTORY/Spatial-Harness-Library
node tools/browser-check.cjs --root EMPTY_OUTPUT_DIRECTORY --out QA_DIRECTORY
```

Also run the skill-creator `scripts/quick_validate.py` on this package. Test an installed copy using `node tools/install.cjs --harness spatialviz-harness --destination EMPTY_DIRECTORY`, then use its bridge for start/read/generate/render/verify/review/finish. The installed reference PNGs must hash identically to `imageSha256` in the packaged official JSON. Keep the library checkout available for adapters and publication.

A solver or renderer change invalidates old tool revisions for new publication. Retain already published immutable records; create fresh runs and samples for changed implementations. Do not silently regenerate old thumbnails. When changing schemas, exercise legacy demonstrations, shared UI, privacy projection, publication checks and all four harness pages. Use the common parameter-file interface; do not add a private recorder or independent site.

Add genuinely new edge-case tests when extending scope. Check symmetric shapes, mirror-equivalent examples, equal-count edits, malformed structures, duplicate displays, polarity drift, D semantics and final label reorder. Geometric verification and image inspection are separate acceptance steps. New mutations are not proof of non-equivalence. Do not copy official difficulty levels into generated records.
