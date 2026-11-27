---
name: spatialviz-block-movement
description: Author and verify SpatialViz Mental Animation cube-stack problems using axis-addressed unit moves, exchanges, support and gravity.
---

# Block Movement

Start a recorder run before reading case evidence. From this package directory run `node scripts/build.cjs 421 stack fall` for a fresh sample. For explicit geometry parameters or revisions use the bridge in [MAINTENANCE.md](MAINTENANCE.md). Inspect the rendered question before recording a review and sealing the run.

## Choose a reasoning target

- Use `flat` for colored occupancy on one level. An occupied destination exchanges colors while a move to an empty cell changes the footprint. Include a foil that matches a conspicuous cube but leaves a different neighbor. Equal-colored swaps can be invisible. Match the full colored arrangement.
- Use `stack` when a support, vertical exchange or settling step changes a later address. Pair opposing views for each time point. Lay out a source under another cube and an adjacent, supported empty destination to force a drop. Re-read the original source after settling. Keep the axes fixed in world coordinates across views.
- For an original checkpoint problem, construct multiple legal paths with the same final stack and distinct states after the first command. For a missing-instruction problem, remove the first move that withdraws support. Keep the suffix fixed across all choices. Test the suffix from each settled hypothesis.
- Pick repeated colors deliberately. A matching silhouette with two exchanged colors is a wrong state. A swap of indistinguishable cubes can be compatible with a final state even if its hidden identities differ. Print a complete layer key when a cube is occluded in both projections.

## Accept a candidate

Use [official coverage](references/coverage.md) for the released scope and [upstream trace](references/upstream-trace.md) for the construction path. [Acceptance records](references/acceptance.md) distinguish reproduced profiles from original variants.

Replay all four choices from the printed state key and commands. Retain an explicit differing cell or illegal step for each foil. Reject multiple matches, equivalent printed choices, illegible stack colors or axes, and a final image whose labels disagree with the public structure. Record visual findings against the exact preview. Keep rejected versions in their original run; save a corrected version with a parent and reason.
