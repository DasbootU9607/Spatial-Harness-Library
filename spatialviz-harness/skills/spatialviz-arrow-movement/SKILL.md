---
name: spatialviz-arrow-movement
description: Author and verify SpatialViz Mental Animation arrow problems using relative turns, moving headings, coordinate-selected arrows and occupied-cell swaps.
---

# Arrow Movement

Start a recorder run before reading case evidence. From this package directory run `node scripts/build.cjs 421 fleet-path mixed` for a fresh sample. For explicit geometry parameters or revisions use the bridge in [MAINTENANCE.md](MAINTENANCE.md). Inspect the rendered question before recording a review and sealing the run.

## Choose a reasoning target

- Use `single` to ask for a path between the red starting pose and the green ending pose. Work backward from a final heading to constrain the last leg. A turn changes the basis for the *next* command. Include a foil that reaches a nearby cell or the same cell facing another way. For coincident endpoints ensure both heads can be recovered from the printed key.
- Use `fleet-path` for two grids and four coordinate-addressed programs. A command selects the present occupant. Construct an exchange followed by a move from one of the affected cells to test the reciprocal heading. Check every stationary cell as well. Color persists, but released maps may repeat colors.
- Use `fleet-state` for one program and four final grids. Build plausible alternative grids by varying a command and keeping the other arrows fixed. Give every panel a neutral caption. Compare whole visible boards for duplicates.
- For an original checkpoint problem, select different first poses on routes to the *same final pose*. Show the state after step one so both observations enter the test. For a predecessor problem, print the final pose and the program and offer four viable initial poses. Trace the sequence backward or test each start.

## Accept a candidate

Use [official coverage](references/coverage.md) for the released scope and [upstream trace](references/upstream-trace.md) for the construction path. [Acceptance records](references/acceptance.md) distinguish reproduced profiles from original variants.

Replay all four choices from the printed state key and commands. Retain an explicit differing cell or illegal step for each foil. Reject multiple matches, equivalent printed choices, illegible arrowheads or answer-revealing panel titles, and a final image whose labels disagree with the public structure. Record visual findings against the exact preview. Keep rejected versions in their original run; save a corrected version with a parent and reason.
