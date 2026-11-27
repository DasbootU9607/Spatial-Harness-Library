---
name: spatialviz-cross-sections
description: Author SpatialViz cross-section questions with the original FreeCAD modeling and slicing tools and the benchmark compositor. Verify possible and impossible plane sections.
---

# Cross-Sections

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer identify an impossible section, identify a directed marked cut, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "marked-plane",
  "inference": "Identify the cut that reaches the narrower upper tier.",
  "condition": "The plan marks a plane through the cap and an arrow toward the front shoulder.",
  "foil": "The base-only option would result from moving the cut beyond the cap.",
  "evidence": "Compare clipped profiles at the marked and displaced planes."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


The released CrossSection asks which of four wires cannot occur. Two CAD views establish the component order, the footprint and the contact between tiers. Treat each answer as a cut in its own plane. Retain the visible common boundary of two component sections. Eliminate hidden surface edges, which can appear in an object view but do not intersect the cutting plane. See the [official audit and original figures](references/official-audit.md) and [coverage and solved examples](references/coverage.md).

## Design a marked pair

Work backwards from a broad rectangular section with a narrower trapezoidal cap and unequal shoulders. Choose a square prism 6 units wide and 2 high. Center a square frustum at (1, 0.5) on the top face. Give it a base half-width of 1.35 and top half-width of 0.70 over a rise of 2. Cut at y=0 and look north from the south. The prism section runs from x=-3 to 3. The cap runs from x=-0.35 to 2.35 at the join and 0.30 to 1.70 at its top. Preserve the contact line. The resulting shorter shoulder on the right distinguishes this view from the opposite-side drawing.

For the control, move the plane to y=-2. The same base is cut through its full width. The cap begins at y=-0.85, so moving the plane removes both sloping edges and the top of the trapezoid. The base's upper edge becomes continuous. Keep the seed and the complete list of answer panels fixed. The red wire and sight arrow in the CAD plan identify the changed plane and viewing side. The official square-prism and frustum constructors build the stack, and the official XZ slicer supplies its cut profiles. A rear CAD camera supplies the reflected-looking foil. The benchmark compositor prints both views and all four choices. Marked-plane selection is an original extension.

## Design a release-format question

Choose `parallel`, `three-tiers`, `mixed`, `point-contact`, `joined-rims` or `oblique`. Give each attainable wire a real plane witness. For the impossible wire, change the width of an upper tier at a nested contact and use the archived slicer on the changed compound. On the actual stack its upper footprint fits inside the supporting face. Intersecting both with any plane preserves this containment on the common chord. An upper chord that extends past a supporting chord is impossible at every angle. Use the surviving interface, a point-contact gap, or an inclined cut across a curved side to distinguish the valid options. The independently cropped panels have different apparent scales; relationships within each option provide the evidence.

From an installed package, using the library binding, run:

```sh
node scripts/author.cjs generate --mechanism marked --seed 64231 --out new-question
node scripts/author.cjs solve --out new-question
node scripts/author.cjs test
```

Pass `--params parameters.json` to specify the plane, stack and sight direction. [Design parameters and native evidence](references/design.md) documents the supported combinations. Open the final image before accepting a candidate. Check the small shoulder or chord endpoints, unit component order, sight arrow, shuffled labels and bracketed plane witnesses. Use `node scripts/author.cjs accept --out new-question --review "Concrete observations from the final figure"` to publish a reviewed item.
