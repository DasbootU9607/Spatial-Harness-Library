# Historical goal-only SVG author trials

The tasks and build histories below remain available. See the [FreeCAD constructions](freecad-coverage.md) for the current exhibition.

Independent authors received the English-equivalent goals below and access to the installed skill. They selected the mechanisms, constraints, dimensions, inputs, observation order and candidate answers. Each authored JSON was passed to the installed build command. Readers received anonymized PNGs.

## Relative spin and orbit

> Create one question in which the solver must determine separately the moving member's own rotation relative to the machine frame and the motion of its support around a fixed center. The solver must choose the correct reference frame first, and both observations must be determinable from the figure.

A 20-tooth input drives the 30-tooth carrier gear in the rear plane. Its key drives H independently of the concentric frame-locked S. H carries the idler I and output P at two separated bearings. The separate input mesh requires the solver to infer H's orbital sense. Unequal end wheels prevent exact cancellation and make the observer choice decisive.

Closest audited example: MentalAnimation/MechanicalSystem/Level0/5. The official item asks for the last wheel's spin and revolution through two carrier-mounted external meshes, with a fixed first wheel and CCW revolution. The official interpretation gives cancellation for equal end wheels. Here the labeled 24- and 36-tooth end wheels produce opposite senses for the last wheel's spin in the two observer frames.

1. Use clockwise as positive and normalize A to +1. A and B mesh on frame-located axles, so B and its keyed carrier H rotate at -20/30 = -2/3. The bearing of P therefore orbits counterclockwise.
2. On H, the fixed S appears to spin at +2/3. The S-I and I-P meshes reverse this relative spin twice. Their tooth ratios telescope, giving P relative to H = (24/36)(2/3) = +4/9.
3. Restore the fixed frame by adding H's -2/3. P spins at -2/9 while its bearing orbits at -2/3. Both observations are counterclockwise.

[Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-00b9461d9da38dc9a593b897) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-00b9461d9da38dc9a593b897) · [System](../assets/systems/frame.json)

## One face change in a split drive

> Design a question that asks whether two observed outputs are both moving. Change one visible connection so the previously blocked branch can move, while motion at the other output can still be inferred independently. Keep the input, question and four options the same.

A is a CW-driven double face wheel. The clutch/brake branch ends at C. A solid key and a top-pin crank independently drive slide Y. Cross the two feasible clutch-output states with slide travel versus a stationary slide. All four answer texts and their order stay identical under seed 419. MentalAnimation/MechanicalSystem/Level0/10, MentalAnimation/MechanicalSystem/Level0/12. The official pair selects an alternative side of a face engagement to ask about the common shaft. Here switching the loaded face changes the input direction to a CW-locking clutch, so the observed rotor changes between rest and motion. A separate crank slide tests whether the local brake affects the second branch. MentalAnimation/MechanicalSystem/Level1/6, MentalAnimation/MechanicalSystem/Level0/34. The former asks about two face-driven outputs and the latter about one top-pin crank and yoke. In this assembly just one output depends on the active face and the other on a keyed crank. The marked shaft-end tangent arrows determine the face relation.

| Assembly | Active connection | Result | Evidence |
|---|---|---|---|
| Before | Far face seated, B CW tangent opposes A CW tangent | C held, Y right (C) | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-bc68d000175581634942beb3) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-bc68d000175581634942beb3) · [System](../assets/systems/before.json) |
| After | Near face seated, B CW tangent aligns with A CW tangent | C CW, Y right (D) | [Question](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/task.html?id=authored-787aa94100d865b658688aad) · [Build](https://dasbootu9607.github.io/Spatial-Harness-Library/spatialviz-harness/process.html?id=authored-787aa94100d865b658688aad) · [System](../assets/systems/after.json) |

### Before

1. A turns CW, so its active face travels along the rightward A CW tangent.
2. At contact 1 the B CW tangent points left. Matching contact velocity requires B to turn CCW.
3. Contact 2 overruns under B CCW. The holding brake arrests C.
4. On the other branch, contact 3 is a solid key, so K turns CW. Its upper pin travels right, and contact 4 transmits the pin's horizontal component to Y.

### After

1. A turns CW at the same instant, with the same rightward A CW tangent.
2. At contact 1 the B CW tangent now points right. Matching contact velocity makes B turn CW.
3. Contact 2 locks under B CW and drives C clockwise.
4. Independently, contact 3 still keys K to A. Its upper pin travels right across Y's vertical slot, driving Y right at contact 4.

The first different inference is the sign of B at contact 1. Engagement at contact 2 changes as a consequence. Contacts 3 and 4 have the same input and outcome in both diagrams. A deep comparison of the input descriptions found just one changed scalar, the face bank. All members, dimensions, input, targets and ordered answer texts match.

## Independent image reading

### The offset wheel on a geared carrier (frame)

1. The fixed-center external 20T/30T mesh reverses A. B and its keyed carrier H turn CCW.
2. The frame holds S. Relative to H, S turns CW. Two external meshes through I give P the same relative direction at 24/36 of the carrier speed.
3. Restoring the carrier motion leaves P spinning CCW at one third of the carrier speed while H orbits CCW.

The reader selected A, P CCW / H CCW. The S and H labels are close at the shared axis. The contact cards identify the fixed member and the driven carrier. The SVG-only check recovered 5 contacts and exactly one matching printed choice.

### Face-wheel drive with a crank slide (before)

1. The solid pinion occupies the far seat. A CW gives a rightward tangent and B CW would give a leftward tangent, so B turns CCW.
2. The clutch overruns and the holding brake keeps C stationary.
3. A drives crank K CW through the key. The upper pin carries the horizontal yoke Y right.

The reader selected C, C stationary / Y right. The vacant near seat has an open circle and the shaft-end inset identifies the active tangent. The SVG-only check recovered 4 contacts and exactly one matching printed choice.

### Face-wheel drive with a crank slide (after)

1. The solid pinion occupies the near seat. A and B have rightward CW tangents at contact, so B turns CW.
2. The clutch locks and drives C CW.
3. The keyed shaft turns crank K CW. Its upper pin carries the slider Y right.

The reader selected D, C CW / Y right. The shaft-end inset resolves the tangent direction at the unfolded contact. The SVG-only check recovered 4 contacts and exactly one matching printed choice.

## Revision observed in the builds

The first split-drive plates indicated the changed face only with a tangent arrow in a section. The main view resembled two touching discs. Both candidate histories retain this failed visual review despite passing structural verification. The accepted main assemblies show the seated pinion and the vacant seat. Their section arrows specify directions from the marked shaft ends.
