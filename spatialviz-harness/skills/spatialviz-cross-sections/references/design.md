# Designing with the native CrossSection generator

The data category is VisualPenetration and the released task identifier is CrossSection. Set the FreeCAD GUI executable with SPATIALVIZ_FREECAD or the checkout's FreeCAD runtime binding. The host requires the same OpenCV and Pillow dependencies as the official compositor. The runtime uses the pinned create_freecad/create_visual_penetration/create_cross_section.py, visual_penetration_tasks_utils.py and utils.py.

| Mechanism | Design parameters | Intended decision |
|---|---|---|
| parallel | height of 2, 2.5 or 3 | Horizontal, central vertical and offset vertical cuts of a taper on a square support |
| three-tiers / mixed | optional tiers from bottom upwards | Compare component chords and their two interfaces; mixed permits displaced centers |
| point-contact | height | A plane missing the apex can intersect the material on both sides of the contact in separate regions |
| joined-rims | height | Both faces at the join share the same disk and every cutting chord has the same endpoints |
| oblique | axis x, y or z; angle 45 or 135 | Use the original rotated-wire alignment and its native camera |
| marked | offset 0 or -2; side south or north | Read a vertical cut from the red plan trace and the arrow |

Pass `tiers` as two or three rows of [centerX, centerY, bottomZ, height, bottomRadius, topRadius, footprint]. Use square, triangle or round. Square radii are half-widths and triangular radii are circumradii. All tiers have horizontal faces at their contact heights. Select a lower footprint containing the next tier's base for the first interface. For example, a triangular pyramid on a circular frustum on a square base gives a change of vertex count and chord containment at two joins. Inspect the sampled planes when designing a new stack. A coincident or invisible answer panel can invalidate a geometrically sensible assembly.

The original main routine controls camera setup and calls its axis-parallel and rotated section generators. The adapter supplies tier dimensions to upstream constructors and a controlled changed compound to provide the foil. The marked extension creates its red trace and arrow in FreeCAD and captures an additional plan and rear view. The official crop, compositor and answer writer produce the delivered plate. The native artifacts include compound.FCStd, the six panel crops, the uncropped native screenshots, upstream data.json and native-wires.json. Inspect these alongside the final PNG and fingerprint-bound verification.

Verification independently intersects convex half spaces in the paper plane and checks the support values of the resulting outlines against the exact native wires. Circular surfaces use a polygonal envelope in the checker. Orthographic native rendering retains the actual CAD curves. Pixel bounds and distances between the visible linework and projected wires establish the orientation and order in the final sheet. The impossible option requires an all-plane contact certificate. See the [source audit](official-audit.md) for differences between the release, the archived sampler and the marked extension.
