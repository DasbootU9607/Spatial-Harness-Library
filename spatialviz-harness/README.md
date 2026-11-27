# SpatialViz Harness

Generate and check spatial visualization tasks with the library recorder and the official generators. Paper Folding uses Matplotlib and Pillow for the printed panels. The cube skills use FreeCAD.

**Status** 路 Official question browser available. Construction skills and task verification are in development.

[Browse all 1,180 official questions](https://dasbootu9607.github.io/Spatial-Harness-Library/questions/#/spatialviz) with filters for the four categories, 12 task types and source difficulty levels. Each case includes its original figure, question, answer and stable case ID.

## Mental Animation

[Arrow Movement](skills/spatialviz-arrow-movement/SKILL.md) traces relative headings and occupied-cell exchanges. [Block Movement](skills/spatialviz-block-movement/SKILL.md) traces cube swaps, support and gravity across paired views. Both packages include a source audit and independently verified examples.

## Mental Folding

[Paper Folding](skills/spatialviz-paper-folding/SKILL.md) covers the three released grid profiles. Its [coverage table](skills/spatialviz-paper-folding/references/coverage.md) links all released mechanisms to independently verified examples and build records.

## Visual Penetration

[Cross-Sections](skills/spatialviz-cross-sections/SKILL.md) constructs possible and impossible cuts through stacked solids. [Cube Assembly](skills/spatialviz-cube-assembly/SKILL.md) verifies complete lattice packings. [Cube Counting](skills/spatialviz-cube-counting/SKILL.md) determines attainable totals from the displayed projections. The three skills run the pinned SpatialViz-Bench FreeCAD model scripts and compose the final figure with the corresponding upstream options function. Each reviewed build records the FreeCAD launch, native files, source revision and exact figure hash. The independent checkers test cut boundaries, rigid packings or totals inferred from the published views. The source audits and coverage tables identify authored extensions.

## Source

[SpatialViz-Bench](https://github.com/wangst0181/SpatialViz-Bench) is the upstream project for this harness. Explore mental rotation, folding, cross-sections and moving shapes.

The library preview uses the original paper-folding question `MentalFolding/PaperFolding/Level2/0-5-5-3-3` from the [SpatialViz-Bench dataset](https://huggingface.co/datasets/PLM-Team/Spatial-Visualization-Benchmark/tree/c722d00b2f740eacb1b56f4cbcd3af47bbbe40b8). [Upstream license](site/preview-license.txt).

[Open the harness page](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/) 路 [Back to the library](../README.md)
