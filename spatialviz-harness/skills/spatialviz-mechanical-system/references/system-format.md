# Authored assembly format

Use JSON with the following fields. All directions are expressed in the printed view. The solver derives the correct option. The description has no answer field.

| Field | Meaning |
|---|---|
| title, intent | A short English title and the reasoning goal. Avoid revealing the answer in the title. |
| references | Optional array of audited source IDs such as `MentalAnimation/MechanicalSystem/Level0/20`. |
| members | Object keyed by distinct uppercase IDs of up to four letters or digits, starting with a letter. Each body has `kind` and `at: [x,y,plane]`. Positive x is right, positive y down. An integer plane identifies an axial layer. The plate unfolds layers in ascending order. |
| connections | Array of objects with `kind`, ordered `ports` and the joint-specific fields below. Reuse an ID when two contacts act on the same rigid body. |
| input | `{"member":"A","motion":"CW"}`. A translation driver takes an appropriate guide direction. |
| targets | Ordered array such as `[{"name":"P","kind":"spin"},{"name":"H","kind":"orbit"}]`. Use a carrier ID for orbit of the supported axle. |
| interval | `instant` (default), `turn`, `stroke` or `start`. These distinguish a shown phase, a full revolution, a pawl cycle and startup. |
| choices | Exactly four objects with `motions` (one motion per target in order) and `reason` (complete explanatory feedback). The seed shuffles all four together. |

Rotating member kinds are gear, ring, carrier, shaft, drum, crank, rocker, rotor, housing, cam, groove, wheel, ratchet and arm. Translating member kinds are rack, slider and weight. A gear or ring requires integer `teeth` from 6 through 240. A drum requires its positive `radius`. Other non-gears can specify a drawing radius. Pitch radius is half the tooth count. A coordinate error under 0.035 pitch units is tolerated for rounded diagonal placements. For readable worksheets choose moderate tooth counts and length scales.

| Joint and ordered ports | Additional description and constraints |
|---|---|
| mesh [pinion, wheel or ring] | Same plane. Center distance equals sum of pitch radii for exterior contact or ring radius minus pinion radius for interior contact. Optional `arm` is a carrier ID. Default is frame-located centers. Place the carrier at its physical pivot. |
| ground [body], parallel-guide [body] | Frame lock fixes the body. A parallelogram holds its orientation as its supported axle travels. Supply the moving support separately. |
| key, sleeve, inertia [first, second] | Same x/y in distinct planes. A key unites both spins. A sleeve allows independent spin. Inertia describes the driven balanced rotor pack and free housing at torque-free startup. |
| clutch [driver, output] | Coaxial. `locks` is CW or CCW. In overrun a holding brake arrests the output. |
| cord [drum, weight] | `side` is left or right. Put the weight below the drum on that exact vertical tangent in its plane. Taut no-slip winding. |
| face [first, second], helix [first, second] | Face takes `bank` near (CW tangents align) or far (oppose) and `form` bevel pair, crown and pinion, opposed bevels, left sector, right sector, transfer pinion or double face wheel. Helix uses opposed developed flank arrows. Local sections supply the view. |
| index-tooth [driver, follower], lug [arm, lug], ratchet [arm, wheel] | Seated exterior tooth, detented CCW-pushing lug at `phase` 0 or 180, or complete reciprocating pawl stroke with CCW stop. |
| roll [wheel, center], racks [horizontal rack, SE rack] | Rolling without slip on fixed lower rail, or matching the horizontal normal velocity of interlocking flanks. Use a slider to mark center travel. |
| yoke, stroke [crank, slider], rocker [crank, rocker] | Top pin in a vertical slot, positive throw `radius`. Use stroke for horizontal reciprocation over one complete turn. |
| slide-arm [arm, slider], index [planet, carrier, slotted output] | Vertical arm and `rail` SE or SW. For the compound radial output give positive `orbit`, `offset` and `lever` on the depicted rightward ray. |
| cams, grooves [first, second] | `a` and `b` are pairs of positive local radii before/after equal small CW increments. A shared groove pin needs the same initial radius on both profiles. |

Spin and orbit choices take CW, CCW, stationary or translates. Horizontal choices take right, left, stationary or rotates. Vertical choices take up, down, stationary or rotates. Diagonal choices take up-left, up-right, down-left, down-right or stationary. Cycle choices take horizontal reciprocation, vertical reciprocation, continuous rotation or stationary. Type-incompatible motions within those lists can serve as deliberate misconceptions.

## Rebuild the saved inputs

From the package root run `node scripts/build.cjs --system assets/systems/inner-contact.json --seed 481`. The three installed author trials use `assets/systems/frame.json` with seed 311 and `assets/systems/before.json` or `assets/systems/after.json` with seed 419. Use `--run RUN --parent v001 --basis TEXT` when revising an existing candidate in that run.

## Expressive boundary

The primitive laws model ideal engagement, specified constraints and qualitative observation. New arrangements of their ports use the same entry point. New laws need implementation in the constraint solver, visible drawing and plate reader, with a distinguishing test. Examples include belt slip under a tension limit, elastic deflection, inertia-dependent speed magnitude, arbitrary shaft-end projection, contact opening at an unspecified future time and impact dynamics. Local developed sections for slots, cams and face contacts prescribe the illustrated geometry. The tool does not reconstruct arbitrary 3D solid contact from a mesh. Use a new law for different guide geometry or engagement conditions.
