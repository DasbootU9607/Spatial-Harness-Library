---
name: spatialviz-mechanical-system
description: Design SpatialViz-Bench Mechanical System questions from a reasoning goal. Compose an assembly, draw its working contacts, derive unique motions from the final plate and test the dependence on a critical connection.
---

# Design a mechanical reasoning question

Begin with one sentence describing the observation and the inference it requires. For example, “To tell which way the last wheel turns, the reader must identify which boundary carries the teeth.” Name the observer, the observed body, the quantity and the interval. A carrier's orbit, a planet's own orientation and motion relative to the carrier are three different observations. A ratchet's net advance over a return stroke needs different evidence from a pin's instantaneous tangent.

## Work backward through the necessary contacts

1. Sketch the smallest system that can produce the observation. Work from the output contact back to the driver. At every step identify the remaining degree of freedom and the fact that determines it. Give an unpowered body its actual constraint. A bearing allows independent rotation. A holding brake arrests it under the specified condition.
2. Decide what the reader must distinguish. The official planetary assemblies reuse the same sun, planet, ring and carrier. Locking the ring in one assembly and the sun in the other changes the zero-speed term in the carrier-relative mesh equations. Recompute both the spin and the orbit. For crown and bevel gears, differently shaped contact surfaces use the same rule: the engaged flanks must have compatible contact velocity. Mark the two viewing ends and each local CW tangent. See [official contrasts and evidence](references/design-contrasts.md).
3. Work a substitution by hand. To test tooth-boundary recognition, start with a fixed-axis 20-tooth driver and a 40-tooth follower. With their centers 30 pitch units apart, their outside pitch circles touch. A CW driver turns the follower CCW. Keep the driver, mount a 60-tooth annulus on a *frame-located bearing*, and put its center 20 units from the driver's center. Its *inner* teeth now engage the driver. At that shared point the CW tangents align, so the ring turns CW. The frame locates both axes and leaves both spins free. A frame lock on the ring would jam this driven pair. Show the pitch boundaries, centers, input sense and the single active contact. An answer reversing the follower can reveal the reader applied the outside rule to the inside boundary. An answer of zero can reveal confusion between a located bearing and a locked body. A translation answer can reveal confusion between rim-point travel and rigid-body motion.
4. Add a dependency with a purpose. Choose a second joint whose operation consumes the intermediate spin, pin velocity or engagement state. Remove or reconnect it on paper. Does the requested motion change, become free or stay fixed for a reason? If two parallel paths already determine the answer, ask about an output that really depends on the intended decision. An underdetermined output requires another visible constraint.
5. Draw the assembled system first. Give each independently moving body a distinct ID. Assign pitch geometry, centers and axial planes. Position working ports at their physical contacts. Mark bearings, rigid couplings, locks and active flanks. Place the input and every output directly on their bodies. Use a local section where the front projection hides an active face or a guide direction. A line crossing or a common axis alone supplies no torque.
6. Write four candidate motion tuples in the same observer frame and output order. Predict the result once with the correct constraints. For each alternative, change one inference and follow its consequences. Use those causal explanations as option feedback. Check all four again after a connection edit, especially if a previous distractor becomes correct.

## Build the authored system

Write the members, connections, input, interval, observations and four hypotheses in the [system description format](references/system-format.md). The agent chooses the mechanism and geometry. Existing joint laws compose through shared body IDs. Start the task recorder before consulting task-specific references. For a system file in the current directory, start with the following commands in PowerShell from the package directory.

```powershell
$system = [IO.Path]::GetFullPath('system.json')
$run = node scripts/construct.cjs start --task $system --title 'Mechanical reasoning design' --no-viewer
node scripts/construct.cjs read --run $run --file references/components.md
# Write the authored description to $system, then render and verify it.
node scripts/build.cjs --system $system --seed 481 --run $run
```

For a saved design use `node scripts/build.cjs --system system.json --seed 481`. The command starts its own recorder and prints the candidate, final SVG, structured task and run directory. Inspect the actual plate separately with `node scripts/inspect.cjs final.svg`. The seed controls option placement. Change members, dimensions, ports or initial conditions to generate a new configuration.

Open the final plate at reading size. Trace the numbered contacts and solve in the stated frame before seeing the computed result. Compare the physical output and the selected option. Save rejected drafts when the connections or text cannot be read. [Maintenance and release](references/maintenance.md) covers review, installation and publication. Use the [official coverage table](references/coverage.md), [component reference](references/components.md) and [individual audit](references/audit.json) for source analogues. The older selector builds remain available for regression and historical reproduction.
