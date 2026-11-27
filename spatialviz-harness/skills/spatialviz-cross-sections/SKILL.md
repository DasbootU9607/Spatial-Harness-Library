---
name: spatialviz-cross-sections
description: Author SpatialViz cross-section questions with the original FreeCAD modeling and slicing tools and the benchmark compositor. Verify possible and impossible plane sections.
---

# Cross-Sections

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
