# Spatial Harness Library

A collection of harnesses for authoring and verifying spatial reasoning tasks. [Open the library on GitHub Pages](https://dasbootu9607.github.io/spatial-harness-library/).

| Harness | Source project and repository | Status |
| --- | --- | --- |
| [Maze Harness](maze-harness/README.md) | [MazeBench](https://github.com/mazebench/MazeBenchEngine) | Available |
| [SpatialViz Harness](spatialviz-harness/README.md) | [SpatialViz-Bench](https://github.com/wangst0181/SpatialViz-Bench) | Under construction |
| [BabyVision Harness](babyvision-harness/README.md) | [BabyVision](https://github.com/UniPat-AI/BabyVision) | Under construction |
| [SpatialB Harness](spatialb-harness/README.md) | [SpatialBench](https://github.com/spicylemonade/spatialbench) | Under construction |

Each harness has its own README and `site/` directory. The Maze directory contains the skills, tools, trials and playable website from the original Maze Harness repository. Its history before the reorganization is available in [the previous layout](https://github.com/DasbootU9607/spatial-harness-library/tree/4e1bd2f). The other directories provide starting points for future development.

To preview the same public files as GitHub Pages, run the following commands from the repository root and open the local address printed by Python.

```sh
node .github/scripts/build-pages.cjs outputs/pages
python -m http.server 4173 --bind 127.0.0.1 --directory outputs/pages
```

The Pages workflow runs the Maze checks, assembles the four sites and publishes them on pushes to `main`.
