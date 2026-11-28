---
name: spatialviz-block-movement
description: Author and verify SpatialViz Mental Animation cube-stack problems using axis-addressed unit moves, exchanges, support and gravity.
---

# Block Movement

## Author a new question

Use the installed `scripts/construct.cjs` bridge's **guide** command for new tasks. Offer track floor occupancy and swaps, track supported stacks, choose a path using its intermediate stack, infer a missing first instruction, or a random choice, in one sentence in the user's language. A specified family or recognizable inference selects the matching choice directly. If several choices fit a specified inference, choose a compatible realization. Only ask when the request leaves the substantive choice open. Keep dimensions and similar implementation decisions with the author.

`node scripts/construct.cjs guide` lists the IDs. Start with `guide --task TASK.json --choice ID`; for an explicit random request use `--choice random` and, when constrained, `--eligible ID1,ID2`. Read the returned [pattern](references/patterns.json) and open its original image with your image viewer. Record what you saw with `viewed --run RUN --id SOURCE_ID --observation TEXT`. Read a second, same-type source only to resolve a specific symmetry, occlusion or ambiguity. Keep the returned run for all steps and revisions.

Before generation, write four short, instance-specific sentences to DESIGN.json and select a supported target. This is one possible design:

```json
{
  "target": "support-drop",
  "inference": "Infer which color occupies the new base after its support moves.",
  "condition": "A supported upper cube sits over the source of a legal move into a vacancy.",
  "foil": "The competing path leaves that upper cube suspended at its former height.",
  "evidence": "Replay the settling step, then compare the source column and the next addressed occupant."
}
```

Use `design --run RUN --file DESIGN.json`, then `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json`. The selected pattern supplies starting parameters. Render and verify the returned candidate. Read the target check's witness and local repair feedback. For a correction, keep the original, record any revised design with `--parent VERSION`, then generate with `--parent VERSION --basis TEXT`. Inspect the exact final preview and record a separate `review` before `finish`. The guide response provides the shared command reference. Use the native tooling and parameter rules below with the same run. Standalone sample commands are also available for explicit reproduction.


For explicit reproduction using the standalone builder, run `node scripts/build.cjs 421 stack fall` to reproduce its seeded sample. For extended geometry parameters see the bridge in [MAINTENANCE.md](MAINTENANCE.md). Inspect the rendered question before recording a review and sealing the run.

## Choose a reasoning target

- Use `flat` for colored occupancy on one level. An occupied destination exchanges colors while a move to an empty cell changes the footprint. Include a foil that matches a conspicuous cube but leaves a different neighbor. Equal-colored swaps can be invisible. Match the full colored arrangement.
- Use `stack` when a support, vertical exchange or settling step changes a later address. Pair opposing views for each time point. Lay out a source under another cube and an adjacent, supported empty destination to force a drop. Re-read the original source after settling. Keep the axes fixed in world coordinates across views.
- For an original checkpoint problem, construct multiple legal paths with the same final stack and distinct states after the first command. For a missing-instruction problem, remove the first move that withdraws support. Keep the suffix fixed across all choices. Test the suffix from each settled hypothesis.
- Pick repeated colors deliberately. A matching silhouette with two exchanged colors is a wrong state. A swap of indistinguishable cubes can be compatible with a final state even if its hidden identities differ. Print a complete layer key when a cube is occluded in both projections.

## Accept a candidate

Use [official coverage](references/coverage.md) for the released scope and [upstream trace](references/upstream-trace.md) for the construction path. [Acceptance records](references/acceptance.md) distinguish reproduced profiles from original variants.

Replay all four choices from the structured states and commands and compare each visible state with its panel. Retain an explicit differing cell or illegal step for each foil. Reject multiple matches, equivalent printed choices, illegible stack colors or axes, and a final image whose labels disagree with the public structure. Record visual findings against the exact preview. Keep rejected versions in their original run; save a corrected version with a parent and reason.

## Accept the question text and figure

Deliver the stem, necessary written conditions and every text answer as selectable text in the task data. Deliver a separate figure containing the visual evidence, with only the panel letters, stage or view names, axes, legends and component labels needed to read it. Keep graphical alternatives in the figure. Inspect the diagram at normal size and enlarged. Reject a figure containing the question, text answers, reasoning, or a transcription that gives away the visual state. Solve the delivered text and figure together before acceptance.
