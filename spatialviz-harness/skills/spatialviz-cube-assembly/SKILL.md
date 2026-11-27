---
name: spatialviz-cube-assembly
description: Design and check missing-polycube puzzles for irregular target stacks with fixed orientations or proper rigid rotations.
---

# Cube Assembly

Start with the complete target and carve a connected missing piece whose local interface exposes a specific turn. Build an L in layer zero from (0,0,0), (1,0,0), (1,1,0). Put the fourth cube at (1,1,1). Place the remaining piece along the front, with a return and a raised cube at its far end. The long arm fixes the position of the given piece. Match its return to the target first. The empty L now demands that the riser sits above the far end. Moving just this riser to (0,0,1) gives the paired target. Keep the same pieces on offer and the same orientation rule. Both residuals have four cubes. The order of the three perpendicular turns distinguishes the two hands. A central riser creates a degree-three junction instead of a path.

Draw the irregular target and each detached piece in a consistent oblique camera. Mark every visible unit face. Include bottom-to-top layer maps when a cube can hide behind another. The origin of each piece's maps is fixed across its layers. Solid cells in the map disclose every cube. The original task provides one piece at Level0 or two at Level1 and asks which of A/B/C completes the target; D rejects all three. Its stems do not specify a rotation group. The generator's fixed-camera convention and the observed release variations are documented in the audit. State the movement contract on each new item.

For a fixed pose translate each normalized part across the target. For rotation enumerate signed coordinate permutations of determinant +1. Normalize and deduplicate equivalent poses, anchor a cell on every possible target cell and reject placements outside the target. Recursively choose disjoint placements. At completion require union equal to target. Keep the first full coordinate witness and count placements for each option separately. Reject two winning options even when each has just one placement. Several placements of one winning option are permitted.

## Author and verify

Use `changed-view` to present the three candidate silhouettes from different oblique cameras while retaining aligned layer maps. Use `two-parts` or `three-parts` for deletion foils, `equal-three` for a three-piece volume tie, and `interface` or `relocated` for the handed pair. Set `arm` from 2 to 5 and set `none` to true to withhold the winning piece. The seed selects the arm length when omitted and permutes A/B/C.

From this package directory with Node 20+, Python 3 and Pillow installed, run the following commands. An installation made with the library installer keeps a local binding to the checkout.

```sh
node scripts/author.cjs generate --mechanism interface --seed 93177 --out new-question
node scripts/author.cjs solve --out new-question
node scripts/author.cjs test
```

Pass `--params parameters.json` to set the design parameters. Generation starts a recorder, writes the native geometry to task.json, exports question.png and runs the independent checker. Open the final image, solve it from the visible information, and inspect verification.json. After review, use `node scripts/author.cjs accept --out new-question --review "Your concrete observations"` for library publication.

Read the [official audit](references/official-audit.md) for the source images, construction history and observed exceptions. The [coverage table](references/coverage.md) connects mechanisms to verified tasks. The [design record](references/design.md) identifies the distinction between release conventions and the new verifier contract.
