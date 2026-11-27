---
name: spatialviz-mechanical-system
description: Construct and verify SpatialViz Mechanical System questions about gear trains, carriers, one-sided engagement, slots, cams, guided followers and loads. Use to design a new assembly from a desired reasoning dependency or reproduce a MechanicalSystem question family.
---

# Design from the output

Name the physical quantity and its reference first. A wheel can have stationary orientation while its axle orbits. A slot can transmit sideways force while its pin moves along the slot. State whether the observer wants the initial tangent, net advance over a stroke, or motion over a full cycle. [Components and constraints](references/components.md) gives usable ports and failure conditions. [Coverage](references/coverage.md) maps the generator selectors to the actual official source IDs. Consult the per-item audit there when the source key depends on an unstated condition.

## Work a design backwards

Suppose the target is the vertical motion of a load. Start with a drum on a fixed axis and a taut cord tangent to its left edge. A CW drum lifts the load because the leftmost point travels up. Move just the cord takeoff to the right and the same drum lowers it. Keep the drawing, driver and choices aligned between versions so a reader can locate the changed joint.

Now make the drum direction depend on a gear contact. Drive A CW, mesh its outside teeth with B, and key B to drum D. B and D turn CCW. The left-hand line descends and the right-hand line rises. An answer that follows A misses the gear mesh. An answer that follows D without examining the cord can fit only one arrangement.

To test conditional transmission, replace the key with a clutch locking on CW input and give the drum a holding brake in overrun. With A CW the CCW intermediate shaft releases the clutch. The brake holds the drum and the load stays still. Replace the clutch with the key again: the load descends. Explain the brake in the question because gravity could otherwise unwind a free drum. The solver must establish B's motion before deciding whether D is driven. The same exercise accepts a separate transfer idler to change B's sense.

## Construct a plate

Run the installed `scripts/build.cjs` with an integer seed, a selector from the coverage table (or `wind-left`, `wind-right`, `clutch-hoist`) and optionally a parameters JSON path. For example, from the library root:

```sh
node spatialviz-harness/skills/spatialviz-mechanical-system/scripts/build.cjs 481 clutch-hoist
```

Direction is `CW` or `CCW` in the marked shaft-end view. For a slider driver, CW selects its down-track orientation. Set `teeth` (8–64) and `ratio` (integer 2–4) for the gear dimensions. The slider exercise accepts `drive` P or Q. The sweep accepts `stage` 0 or 180. The hoist clutch accepts `bypass` true for a rigid replacement and `transfer` direct or idler. Inputs are saved in the run. The result includes the final SVG, structured question, answer, choice explanations and verification. Read [maintenance and publication](references/maintenance.md) for review and release.

To build a new family, compose members and joints in `scripts/design.cjs`. Reuse a member letter for the same rigid body across detail views. Give independent sleeves different letters. A mesh accepts two wheels and a carrier or fixed frame. A key accepts co-rotating hubs. A cord consumes drum rotation and produces vertical line motion. A slot consumes relative point velocity and transmits only its normal component. A clutch requires a defined overrun state. Select distractors that reverse the active face, skip an idler, swap outputs or drive a released lug. Change the decisive joint and verify that the computed output changes. Include a new visible contact detail and its reader if a relationship requires a new symbol.

For acceptance, open the rendered plate. Trace every required contact from the input label, check the shaft views, stroke interval and marked target, and solve the displayed options. Record the review on that candidate. Rebuild in the same run after a correction. The shared verifier reads the visible plate lettering and tangent arrows, independently solves the constraints and compares all four options.
