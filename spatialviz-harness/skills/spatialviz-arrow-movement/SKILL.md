---
name: spatialviz-arrow-movement
description: Author and verify SpatialViz Mental Animation arrow problems using relative turns, moving headings, coordinate-selected arrows and occupied-cell swaps.
---

# Arrow Movement

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer find a path for a single arrow, choose a program connecting two boards, choose the resulting board, disambiguate paths at an intermediate pose, recover a starting pose, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "moving-occupant",
  "inference": "Track which arrow moves after two arrows exchange places.",
  "condition": "The second command names a cell whose occupant changed in the first command.",
  "foil": "A foil follows the former occupant from its original address.",
  "evidence": "Replay the chosen route, including both displaced headings; locate the first differently colored or directed cell."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


For explicit reproduction using the standalone builder, run `node scripts/build.cjs 421 fleet-path mixed` to reproduce its seeded sample. For extended geometry parameters see the bridge in [MAINTENANCE.md](MAINTENANCE.md). Inspect the rendered question before recording a review and sealing the run.

## Choose a reasoning target

- Use `single` to ask for a path between the red starting pose and the green ending pose. Work backward from a final heading to constrain the last leg. A turn changes the basis for the *next* command. Include a foil that reaches a nearby cell or the same cell facing another way. For coincident endpoints show separate start and finish panels so both arrowheads are visible.
- Use `fleet-path` for two grids and four coordinate-addressed programs. A command selects the present occupant. Construct an exchange followed by a move from one of the affected cells to test the reciprocal heading. Check every stationary cell as well. Color persists, but released maps may repeat colors.
- Use `fleet-state` for one program and four final grids. Build plausible alternative grids by varying a command and keeping the other arrows fixed. Give every panel a neutral caption. Compare whole visible boards for duplicates.
- For an original checkpoint problem, select different first poses on routes to the *same final pose*. Show the state after step one so both observations enter the test. For a predecessor problem, print the final pose and the program and offer four viable initial poses. Trace the sequence backward or test each start.

## Accept a candidate

Use [official coverage](references/coverage.md) for the released scope and [upstream trace](references/upstream-trace.md) for the construction path. [Acceptance records](references/acceptance.md) distinguish reproduced profiles from original variants.

Replay all four choices from the structured states and commands and compare each visible state with its panel. Retain an explicit differing cell or illegal step for each foil. Reject multiple matches, equivalent printed choices, illegible arrowheads or answer-revealing panel titles, and a final image whose labels disagree with the public structure. Record visual findings against the exact preview. Keep rejected versions in their original run; save a corrected version with a parent and reason.

## Accept the question text and figure

Deliver the stem, necessary written conditions and every text answer as selectable text in the task data. Deliver a separate figure containing the visual evidence, with only the panel letters, stage or view names, axes, legends and component labels needed to read it. Keep graphical alternatives in the figure. Inspect the diagram at normal size and enlarged. Reject a figure containing the question, text answers, reasoning, or a transcription that gives away the visual state. Solve the delivered text and figure together before acceptance.
