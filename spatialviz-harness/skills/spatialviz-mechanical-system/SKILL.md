---
name: spatialviz-mechanical-system
description: Design SpatialViz-style mechanical reasoning questions from a desired relationship, build the working assembly in FreeCAD, and verify its native model and final question image.
---

# Design from the motion to be explained

Name the observed body, quantity, observer and interval. Choose the intermediate decision the reader must make. A wheel can spin about its own axle while the axle orbits. A crank pin at the top of its path can have zero vertical speed while a horizontal yoke moves. These require different supports, observations and views.

Official MechanicalSystem questions were authored by people drawing on public simulations. The benchmark uses FreeCAD in its programmatic workflows. The released material does not identify the software used to draw the original MechanicalSystem images. Attribute formal questions built with this package to **Spatial Harness original FreeCAD assembly**.

1. Work back from the output to a minimal connected assembly. Give every independent moving member its own ID. Locate the axle or guide that constrains it. Name what drives it and which relative motion the interface transmits. A common axis needs a physical coupling if the two members must spin together.
2. Work the same dependency after one meaningful change. For a winding load, choose a drum, a taut takeoff and a gravity direction. Add a meshed driver and key the driven wheel to the drum. The external mesh first establishes the drum sense. The tangent then establishes vertical travel. Moving the line to the opposite rim preserves the gear ratio and reverses load motion. In a carrier train use spin relative to the carrier at each mesh, then restore the carrier motion for the frame observer.
3. Specify the physical state. Choose tooth counts, module, pitch centers, axial planes, keyways, frame locks, captured pins and translation guides as needed. Select a FreeCAD overview that exposes the depth order. Read directions in a labeled front view of the same model. Inspect the line of contact, occupied slot or axle bearing at normal reading size.
4. Write four motion hypotheses in one output order. For each distractor, follow an identifiable mistake to its prediction. Examples include copying the input direction across an external mesh, following the opposite tangent, treating a frame bearing as a lock and reporting velocity along a slot instead of across it.
5. Write the assembly in the [native system format](references/freecad-authoring.md). Recombine the listed parts and interfaces by body ID. A seed shuffles the choices. Tooth counts, dimensions and connectivity belong in the authored system. The [source map and native coverage](references/freecad-coverage.md) distinguishes implemented constructions from the wider official design material.

## Build and accept

Use the installed package with its library runtime binding, Python with Pillow and NumPy, and the FreeCAD GUI executable. Set `SPATIALVIZ_FREECAD` or the checkout's `.harness/freecad-official/runtime.json`. Start the recorder before reading task-specific sources. For a prepared system the build command starts its own run.

```powershell
node scripts/build.cjs --system assets/freecad/guided-slide.json --seed 427
```

For a new design run `node scripts/construct.cjs start --task ABSOLUTE_SYSTEM_JSON --title "Mechanical assembly" --no-viewer` before drafting. Read the needed references through the recorder. Pass the returned directory to the build command with `--run`. For a revision also specify `--parent v001 --basis "Describe the correction"`.

Formal generation requires a saved and reopened FCStd, measured native interfaces, actual FreeCAD viewport captures, rebuild parameters and the final composed PNG. Unavailable FreeCAD, an unsupported native interface or a failed native check stops the build. The overview and front photograph show the model. Letter badges and worksheet text are added after capture.

Check the model and the question separately. The first pass reopens the document, measures B-rep tooth contacts, key fits, bearings and other working hardware. Gear phase is prescribed to seat the teeth at the shown instant. This pose check supplies no answer. The second pass reads the final PNG lettering and solves the visible contact and support constraints before evaluating all four choices. Open the final PNG, follow the physical path, and confirm its labels, contact side, driver, output and answer choices. Use an image-only reader for a representative new relationship. Record the review, seal the exact candidate, and publish its model, parameters, final image and build history. [Release procedure](references/maintenance.md)
