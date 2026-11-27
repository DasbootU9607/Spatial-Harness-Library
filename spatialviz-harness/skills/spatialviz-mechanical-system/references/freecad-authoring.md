# Native assembly description

Describe the mechanism in JSON, using the four [native source designs](../assets/freecad/) as working inputs. The accepted backend creates editable FreeCAD documents with separate rigid members, original FreeCAD involute profiles, physical hardware and named connection records linking the bodies and hardware. The FCStd represents the stated pose. The library solves ideal kinematic constraints separately.

| Field | Meaning |
|---|---|
| title, intent, references | English question title, design objective and audited source IDs. |
| cad | `moduleMm` is 1–4 mm. `tiltDeg` is 0–55 degrees for the assembled overview. The orthographic front view always looks along the axle toward the frame. |
| members | Uppercase body IDs. Each has `kind` and `at: [x,y,plane]`. Multiply x and y by the module to obtain mm. x increases rightward, y downward in the front view. Integer axial planes 0–5 are spaced 12 mm apart. |
| input, targets, interval | Drive a rotary member CW or CCW. Request an ordered list of spin, carrier orbit, horizontal or vertical travel, or cycle motion. Use `instant` for the shown state and `turn` for a complete crank revolution. |
| choices | Four objects with `motions` in target order and a full English `reason`. The solved constraints select the correct tuple. |

Gear bodies use 12–90 teeth and a 20-degree involute profile. Their pitch radius in module units is half the tooth count. Drum and crank radius use module units. The native parts also include a guided slider, suspended weight and carrier. Each connection has `kind` and ordered `ports`.

| Interface | Layout and working condition |
|---|---|
| mesh [a,b] | Two external gears in one plane. Center distance equals the sum of pitch radii. Default supports are frame bearings. Optional `arm` names a carrier whose pivot and satellite bores locate the gear centers. Place the carrier in front of the gears. |
| key [a,b] | Coaxial rotary bodies at different axial planes. A shaft and separate rectangular feather key fit both cut keyways. |
| cord [drum,weight] | Set `side` to left or right. Put the load below the tangent in the drum plane. Set its x coordinate to null to attach it to the selected tangent automatically. The physical model includes a wrapped arc, straight taut segment and load. |
| yoke or stroke [crank,slider] | Give the connection a positive throw `radius`. Put the slider center directly above the crank by this radius, in the next forward plane. The pin rides in a vertical slot. Twin frame guides constrain the rod horizontally. Use stroke for a complete-turn observation. |
| ground [gear] | Two through-bolts join the gear to the fixed backplate. A planet's moving axle must remain on its carrier. |

For example, start from a gear-to-crank connection and replace the input drive with two external meshes and an idler. Choose centers to keep every pitch circle tangent and choose enough axial clearance for the pin and guide. Recompute the answer and distractors after the change. Adding a named contact also requires room for its real hardware.

The geometry receipt records displayed-pose interference and physical fit. It describes an ideal kinematic model, without tolerance-stack design, shaft stress analysis, frictional slip or dynamic load simulation. See the [coverage map](freecad-coverage.md) for native limits. Use the archived wider [constraint vocabulary](system-format.md) as design research.
