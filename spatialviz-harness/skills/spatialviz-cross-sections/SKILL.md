---
name: spatialviz-cross-sections
description: Design SpatialViz plane-section puzzles for stacked solids, draw oriented cuts and certify which sectional outlines are possible.
---

# Cross-Sections

The released CrossSection asks which of four outlines cannot occur. The two pictures of the stack are object views. The answer pictures are planar cuts. The released stem does not specify a viewing arrow. Three-dimensional silhouettes seen from the side can include material outside the plane. Section only the material intersected by the plane.

To design backwards, start with a rectangle carrying a narrower, right-shifted trapezoid. Use a 6 by 6 square prism with bottom at z=0 and height 2. Center a square frustum at (1,0.5) on its top. Its half-width narrows from 1.35 to 0.70 over a rise of 2. For the cut y=0, both the base and the cap intersect the plane throughout their height. Looking north from the south, horizontal paper coordinates increase with x. Draw the base from x=-3 to 3, then the cap from x=-0.35 to 2.35 at the contact and from 0.30 to 1.70 at the top. The cap's right shoulder on the base is shorter. The source compound keeps distinct component boundaries, so the horizontal contact line remains. Suppress hidden object edges, diagonal triangulation lines and boundaries between faces of one flat cut surface. A fused single-material extension would remove the shared interior contact.

Move the plane to y=-2. The base retains its full width. The cap starts at y=-0.85 and entirely misses this plane. Its three exposed sides disappear and the base top becomes one uninterrupted edge. Draw the cut in plan and an arrow parallel to its normal. Reverse the viewing side by reversing the paper's horizontal basis. Draw a left-right mirror, the base alone and a horizontal cap section as the alternative choices. Keep the solid, view scale and options identical in the paired items.

For the released negative question, give three actual plane witnesses. Generate a fourth profile by widening one component until its diameter exceeds the longest chord of every component. Print a scale in the choice area. This supplies a global impossibility proof even for planes the generator has never sampled. Use two and three tiers, face contact, point contact and rotated planes. Compare each valid witness to an independent paper-plane half-space clip. Circular boundaries use a 96-segment display approximation; for radius 3 its chord sagitta is below 0.002 units, well below one output pixel. Reject a candidate if two options look identical at the delivery scale.

## Author and verify

Use `joined-rims` for the equal-diameter cone and cylinder. Their common face forces identical seam chords for every cutting plane. Use `parallel`, `three-tiers`, `point-contact` or `oblique` for the released negative question, `mixed` for off-axis components, and `marked` for the directed positive question. JSON parameters include `height` (2, 2.5 or 3), `offset` (0 or -2), `side` (south or north), and for oblique planes `axis` (x/y/z) and `angle` (45/135). Supply optional `tiers` from the bottom upwards as [centerX,centerY,bottomZ,height,bottomRadius,topRadius,footprint]. Square radii are half-widths. Supported footprints are square, triangle and round. The common-scale base is a 6 by 6 square prism. For new stacks check that adjacent footprints touch and the final image stays within the panels.

From this package directory with Node 20+, Python 3 and Pillow installed, run the following commands. An installation made with the library installer keeps a local binding to the checkout.

```sh
node scripts/author.cjs generate --mechanism marked --seed 93177 --out new-question
node scripts/author.cjs solve --out new-question
node scripts/author.cjs test
```

Pass `--params parameters.json` to set the design parameters. Generation starts a recorder, writes the native geometry to task.json, exports question.png and runs the independent checker. Open the final image, solve it from the visible information, and inspect verification.json. After review, use `node scripts/author.cjs accept --out new-question --review "Your concrete observations"` for library publication.

Read the [official audit](references/official-audit.md) for the source images, construction history and observed exceptions. The [coverage table](references/coverage.md) connects mechanisms to verified tasks. The [design record](references/design.md) identifies the distinction between release conventions and the new verifier contract.
