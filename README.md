# Spatial Harness Library

Use agent skills to build spatial reasoning tasks, check their solutions, and inspect how each example was made. [Explore the library](https://dasbootu9607.github.io/Spatial-Harness-Library/).

| Harness | Authoring | What you can explore |
| --- | --- | --- |
| [Maze](maze-harness/) | Available | Play MazeBench rooms and agent-built puzzles in 3D, then replay their solutions. |
| [SpatialViz](spatialviz-harness/) | Available | 12 skills cover 41 patterns. Each pattern pairs an official reference with a verified new question and its build record. |
| [BabyVision](babyvision-harness/) | Upcoming | Browse official visual questions and image annotation tasks. |
| [SpatialB](spatialb-harness/) | Upcoming | Practice 2D path tracing and 3D voxel rotation with generated questions. |

## Use a SpatialViz skill

[Choose a skill](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/#how-to-use) to see its patterns, copy a request, or open a worked example. On a fresh checkout, install the skill from the repository root, replacing `YOUR_SKILLS_DIRECTORY` with your agent's skills folder.

```sh
node tools/install.cjs --harness spatialviz-harness --skill spatialviz-2d-rotation --destination "YOUR_SKILLS_DIRECTORY"
```

Keep the checkout available and ask your agent, for example, `$spatialviz-2d-rotation Create a dice-dot puzzle where the direction of the dots distinguishes two options.` See the [authoring guide](docs/spatialviz-authoring.md) for generation and verification, and [build records](docs/observability.md) for the evidence each run saves.

## Preview locally

From the repository root, build into an empty directory and serve it.

```sh
node .github/scripts/build-pages.cjs outputs/pages
python -m http.server 4173 --bind 127.0.0.1 --directory outputs/pages
```

Open [localhost:4173](http://localhost:4173/). The [question browser](https://dasbootu9607.github.io/Spatial-Harness-Library/questions/) includes the official collections and [source credits](questions/SOURCES.txt).
