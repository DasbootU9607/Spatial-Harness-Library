# Spatial Harness Library

A collection of harnesses for authoring and verifying spatial reasoning tasks. [Open the library on GitHub Pages](https://dasbootu9607.github.io/Spatial-Harness-Library/).

| Harness | Source project and repository | Status |
| --- | --- | --- |
| [Maze Harness](maze-harness/README.md) | [MazeBench](https://github.com/mazebench/MazeBenchEngine) | Available |
| [SpatialViz Harness](spatialviz-harness/README.md) | [SpatialViz-Bench](https://github.com/wangst0181/SpatialViz-Bench) | 1,180 official questions available; authoring in development |
| [BabyVision Harness](babyvision-harness/README.md) | [BabyVision](https://github.com/UniPat-AI/BabyVision) | 388 visual questions and 280 image tasks available; authoring in development |
| [SpatialB Harness](spatialb-harness/README.md) | [SpatialBench](https://github.com/spicylemonade/spatialbench) | Two practice modes available; authoring in development |

Each harness has its own README and `site/` directory. The Maze directory contains the skills, tools, trials and playable website from the original Maze Harness repository. Its history before the reorganization is available in [the previous layout](https://github.com/DasbootU9607/Spatial-Harness-Library/tree/4e1bd2f). The other harness pages link directly to their question collections.

The shared `questions/` site packages 1,848 official records and 1,803 distinct source images, with category filters, search, shareable case URLs, enlarged figures and answer reveals. SpatialBench provides freshly generated practice rounds, separate from its official 50-question leaderboard set. [Browse the collections](https://dasbootu9607.github.io/Spatial-Harness-Library/questions/) or read [sources and credits](questions/SOURCES.txt). All browser assets are local to the site and work under the repository's Pages path.

To preview the same public files as GitHub Pages, run the following commands from the repository root and open the local address printed by Python.

```sh
node .github/scripts/build-pages.cjs outputs/pages
python -m http.server 4173 --bind 127.0.0.1 --directory outputs/pages
```

The Pages workflow runs the Maze checks, assembles the four harness sites and shared question collections, and publishes them on pushes to `main`.
