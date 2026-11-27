# Authoring a SpatialViz question

Use the skill's installed `scripts/construct.cjs` for all commands. The bridge locates the library and selects the same generator and independent verifier as the skill's explicit recipes. Read the selected pattern and inspect one representative before writing the design. The guide returns the selected pattern, matched original, and supported inference targets. Each skill includes a filled design example. Configure the native dependencies described in the domain skill.

| Command (arguments after the bridge) | Result |
| --- | --- |
| `guide` | List the supported choices without starting a run. Ask in the user's language only when their request is open. |
| `guide --task TASK.json --choice ID` | Start a recorded run. Read the selected pattern and the returned original annotation. Open the returned image path at readable scale. |
| `guide --task TASK.json --choice random --eligible ID1,ID2` | Draw uniformly within the eligible choices and record the set and result. Omit the filter for an unconstrained draw. |
| `source --run RUN --id SOURCE_ID` | Locate a matched contrast original in the same official task family when needed. |
| `viewed --run RUN --id SOURCE_ID --observation TEXT` | After opening the image, attest to the visible detail you inspected. A missing image viewer is a concrete missing observation. |
| `design --run RUN --file DESIGN.json` | Record the planned inference, decisive condition, plausible foil and distinguishing evidence before generation. Use one target from the selected pattern. For a more closely matched alternative original, explain your choice in `referenceReason`. |
| `generate --run RUN --task TASK.json --seed N --params PARAMETERS.json` | Generate new geometry or operations through the current domain adapter, with author-controlled parameters and a recorded seed. |
| `render --run RUN --candidate VERSION` | Save the exact candidate's preview. |
| `verify --run RUN --candidate VERSION` | Run the domain verifier and the candidate's declared inference check. Look at all failed checks, the named alternative and the local evidence. |
| `review --run RUN --candidate VERSION --outcome passed --review TEXT` | Inspect the rendered figure and record what distinguishes the two closest choices at reading size. A failed review takes `--outcome failed`. |
| `finish --run RUN --candidate VERSION --task TASK.json` | Seal and publish according to the existing publication policy. Use `--local-only` for private checks or `--prepare-only` for staging. |

Revise in the same run. Keep the previous candidate ID; pass it to a changed design with `design --parent VERSION` and to generation with `--parent VERSION --basis "Specific correction"`. Verify and review the revised bytes. The public history carries the authored design, image-view declarations, actual resource deliveries, corresponding candidate and target-check evidence. Source IDs declared by a generator describe ancestry; viewed original IDs describe an author action. Explicit scripts and existing archived candidates remain reproducible with their original contracts.

When the brief calls for multiple clues, select a target that admits joint evidence. Reserve the stronger orientation, checkpoint, critical-joint and essential-view claims for layouts that can pass their specific counterfactual or witness tests. A passed computational check concerns the declared operation; the final visual review checks what a reader can actually distinguish.

See the [12-skill acceptance and native tool audit](spatialviz-authoring-acceptance.md) for worked checks and case identities.
