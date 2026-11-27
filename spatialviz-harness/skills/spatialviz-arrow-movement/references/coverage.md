# Arrow Movement in the released test split

The 80 records have the source prefix `MentalAnimation/ArrowMoving/`. Each has one PNG, one question and four choices. Two pairs share figure bytes, giving 78 distinct PNGs. All 40 Level 0 cases and all 40 Level 1 cases use a 3 by 3 Cartesian grid. Each level contains 20 two-command, 10 three-command and 10 four-command paths. A distance counts cells and each command sets the next facing direction.

## Released evidence

| Row key | Level | Cases | Representative suffix | What the reader sees and tests | Closest misleading result in that case |
| --- | --- | ---: | --- | --- | --- |
| single-travel | 0 | 30 | 0-3-3-2 | Red and green mark the same arrow at different times. Replay four printed paths to match the green cell and heading. | B returns north to the red cell. |
| single-return | 0 | 10 | 1-3-3-2 | Red and green occupy the same cell. Check both exposed arrowheads, then find the path that returns with the new facing. | D returns west to the correct cell. |
| path-empty | 1 | 4 | 4-3-3-2 | Compare start and end boards against four coordinate-addressed paths. The matching path lands exclusively on empty cells. | B leaves purple west at the original coordinate. |
| path-swap | 1 | 18 | 3-3-3-2 | At least one matching command exchanges two occupied cells. Check each displaced arrow's arrival facing as well as the mover. | B leaves (0,1) empty where blue must face west. |
| state-empty | 1 | 7 | 2-3-3-2 | Start board and printed commands lead to four picture choices. All command destinations are empty at execution time. | C leaves purple at the center rather than at the bottom. |
| state-swap | 1 | 11 | 0-3-3-2 | The printed commands include at least one occupied landing. All cells and facings must agree with one picture. | A shows red facing south at (0,0), where green must face west. |

Complete each suffix with the source prefix and the corresponding `Level0/` or `Level1/`. The 22 board-to-path items have answer counts A 6, B 4, C 7, D 5. The 18 board-to-picture items have counts A 2, B 5, C 6, D 5. The red/green format has counts A 6, B 11, C 11, D 12. Overall the counts are A 14, B 20, C 24 and D 22. The table partitions cases by the replay of the matching printed path. An incorrect path can use a swap even in an empty-landing row.

## Reading motion from endpoints

Position is the cell containing the shaft and tip. Facing is the orientation of the tip. The last displacement sets facing. In a series of turns it can differ from the vector connecting the two printed endpoints. In Level 0 color encodes time. In Level 1 a moving arrow retains its color, but several arrows can be the same color. Read a command at its printed coordinate on the *current* board and compare the multiset of colored, oriented cells. There is no visible serial number that could distinguish two identical arrows. A length-two command uses the occupant of its destination; only that occupant is exchanged.

The next comparisons describe the path inferred by evaluating the offered options or following the printed commands. The figures do not show intermediate frames. The history selected by the generator is only one possible unoffered history between endpoints.

* **single-travel.** In Level0/0-3-3-2 red points south at (0,1). D moves forward to (0,0), then left from south to (1,0) east. Level0/2-3-3-2 starts south at (2,0) and ends north at (2,2). A moves backward one and then forward one; these two commands travel in the same world direction after the facing update. Level0/22-3-3-3 reuses exactly that second picture with different commands. Its route goes west, back east, then north two. The offered paths change what must be tested.
* **single-return.** In Level0/1-3-3-2 the exposed red head points east from (1,1). C turns left to (1,2) north and returns backward to (1,1) south. D has the correct cell but ends west. Level0/13-3-3-2 also overlays arrows at (1,1). The red head projects to the left of the green shaft; B moves west, then back east. Reading only the green endpoint loses the starting orientation.
* **path-empty.** In Level1/4-3-3-2 A takes purple west at (0,0) backward two, arriving east at (2,0), then backward one, arriving west at (1,0). The other three arrows stay fixed. In Level1/5-3-3-2 A moves red first, then pink from a different origin. This changes whether the next command uses the first mover's updated heading.
* **path-swap.** In Level1/3-3-3-2 A moves west-facing yellow backward into green at (2,0). Yellow ends east, green returns west to (1,0); blue then moves west two to (0,1). In Level1/6-3-3-2 both participants on the top row are red. D exchanges them twice. The second command acts on the red arrow now facing east. Both final cells remain red, but the pair must point apart. Tracking colors alone loses the exchange.
* **state-empty.** In Level1/2-3-3-2 purple moves backward from (1,1) to (1,0) south. West-facing yellow at (2,1) turns right into (2,2) north. Only A has both. Level1/39-3-3-4 pictures one green arrow on the initial board. Following its four moves passes through (0,1), (0,0) and (0,2), finishing at (1,2) east in C. The addressing rule stays the same even when there is only one occupied cell.
* **state-swap.** In Level1/0-3-3-2 an east-facing red at (0,0) turns left two into red at (0,2), returning that occupant south. Green then moves west into the newly returned red. Green finishes west at (0,0) and red east at (1,0), selecting C. In Level1/1-3-3-2 purple/red and pink/red exchange at separate pairs of cells. The first exchange in case 0 supplies the occupant for the second; the exchanges in case 1 can be checked independently.

## Audit findings and design consequences

* **Answer replay.** Each case has exactly one visible matching label. All 80 agree with the released answer. In 15 picture-choice cases the released explanation nevertheless calls BCD incorrect while the key is B, C or D. For Level1/0-3-3-2 the original annotation's wrong-group dictionary key is ABD, whereas its text says BCD. See the original explanation and observation flags for each affected source ID.
* **Picture-choice leakage.** All 18 picture-choice figures retain an inset plot title that identifies the designated result as “Path 1 End State.” The three others are labeled “Alternative Path.” A pixel digest of the title crop matches the keyed option on all 18. The replay ignores these titles. Publish neutral A–D titles.
* **Duplicate choices.** The four Level 0 cases beginning 5, 13, 14 and 17 repeat a wrong path verbatim. In Level1/0-3-3-2, A and D have identical colored-arrow boards. In Level1/2-3-3-2, B and D do too. Across both path formats, eight records (including the repeated-text cases) have at least one pair of paths ending on the same wrong board. Keep option text distinct and compare endpoint boards to target diagnostic errors independently.
* **Overlays.** Ten Level 0 pairs share a cell. For opposite headings only a small red head may remain visible. Inspect a full-size image and preserve a clear cue to each orientation in new artwork.
* **Level is a distribution, not a rule.** The level encodes the format in this split. Increasing path length does not introduce a new motion law. A correct path can use an arrow more than once, jump over an occupied cell or exchange equal colors; the option is judged by its complete visible outcome.

## Reproduce or inspect the audit

The package includes the 80 original PNGs under `originals/<level>/<suffix>.png`, the selected dataset fields in [official.json](official.json), and the [source license](LICENSE-upstream.txt). The source catalog is the test split at dataset revision `c722d00b2f740eacb1b56f4cbcd3af47bbbe40b8`. The [per-case report](observations.json) contains visible initial and target states, the printed path or four text choices, replay-derived changes, closest wrong choice and individual discrepancies. For picture choices the checker compares four independently decoded final boards to the result of the printed path. The wrong choice called closest minimizes coordinate distance and then facing disagreement for one arrow, or cell-state disagreement and then occupancy disagreement for a board. Ties use letter order.

Run `python references/audit_images.py --out audit.json` from the skill directory with Pillow and NumPy installed. To read the library catalog and media in place, add `--root /path/to/spatial-harness-library`. The audit reads the PNGs at native resolution, verifies the original byte digest, locates the plotted cells and resolves heading from colored ink relative to the cell center. The released answer is compared only after replaying all options. The [upstream trace](upstream-trace.md) covers execution of the source pipeline.

[Verified new items and separate original variants](acceptance.md).
