# Official generation workflow

The default bridge uses the shared official integration documented in `spatialviz-harness/official-rotation/README.md` in the bound library checkout. Installed skills require that checkout, just as the shared recorder does. This reference is packaged with the skill; original source-case JSON/PNG files remain alongside it.

Install host Python dependencies from `spatialviz-harness/official-rotation/requirements.txt`. Set `SPATIALVIZ_FREECAD` to a real FreeCAD GUI executable; validated with the official FreeCAD 1.0.2 Windows portable build. The adapter runs modeling in the application, not host Python. No renderer fallback is permitted. Setup and all exact patch explanations are in the shared README.

Pinned official source: https://github.com/wangst0181/SpatialViz-Bench/tree/c27f9111a2674f2ea03e2ca1f5833326cf1eec1a (MIT). Untouched source files, LICENSE and SOURCE.json live under `spatialviz-harness/vendor/SpatialViz-Bench-c27f9111a267`. Local adapters apply explicit in-memory compatibility, parameter/export and dispatch patches with hashes. The modeling functions, FreeCAD saveImage rendering, official option-selection utilities and official generate_data/compositor are actually executed. Locally supplied dot texture assets and structured cube coordinates are authoring inputs, not copied official question images.

The verifier recomputes structural equivalence and image transformations. A 2D upstream “horizontal” filename actually applies a vertical cv2 flip; the implementation traces the real operation. A vertical screen flip of a 3D isometric image is not a lattice reflection and must be rejected. Mirrored models may also remain rotation equivalent. Rejection sampling is bounded and recorded.

Published PNGs use the original single-row Original/A/B/C arrangement, one view per object. D remains a text option. A 3D task's full-face visibility condition is an explicit local acceptance restriction; it is not a claim about all original benchmark questions. The previous paired views and complete layers belong to the legacy JS/SVG generator only.

Preserve old cases and their old source method. New task JSON includes actual model/camera data, raw PNGs, traced transforms, final PNG, official revision, FreeCAD version, seeds, patches and CAD snapshot. Final diagrams need actual visual inspection after independent verification. Reference annotations describe source facts; our sampled bounds and rejection rules describe the local implementation.
