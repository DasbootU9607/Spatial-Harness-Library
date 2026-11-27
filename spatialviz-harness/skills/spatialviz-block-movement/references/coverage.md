# Released Block Movement coverage

The 80 source IDs in `questions/data/spatialviz.json` begin with `MentalAnimation/BlockMoving/`. Each record links one PNG containing four labeled views. Read a row across to resolve occlusion, then compare rows at fixed world coordinates. The rotated panel changes the camera. All 80 prompts ask which printed sequence can produce the lower state. Every item has four textual A–D choices made of absolute unit displacements applied to the **current occupant** of a named coordinate.

| Released profile | Cases | A | B | C | D |
|---|---:|---:|---:|---:|---:|
| Level0, one layer, 3 × 3 | 40 | 10 | 10 | 8 | 12 |
| Level1, 3 × 2 footprint, two or three layers | 40 | 9 | 13 | 8 | 10 |
| Both levels | 80 | 19 | 23 | 16 | 22 |

The following rows count distinct questions whose independently solved matching option includes the stated operation. Counts overlap because an option has three moves. The final row counts endpoint equality. References in the table omit the common source ID prefix above. A released stem alone gives no privileged access to any intermediate frame.

| Row | Count | Level | Representative source ID | Visible clue and discrimination |
|---|---:|---|---|---|
| flat-transfer | 31 | 0 | Level0/6-3-3-1-2 | A floor cell becomes vacant while another gains red. A route can place red correctly yet leave a blue block one cell out. |
| flat-swap | 32 | 0 | Level0/22-3-3-1-2 | Two occupied cells exchange blue and yellow while their footprint stays fixed. A sequence that moves either color to the neighboring empty cell fails. |
| stack-swap | 35 | 1 | Level1/1-3-2-2-3 | A horizontal exchange on one level replaces both occupants. The next instruction at the same coordinate can move a different color. The adjacent upper cube may obscure the lower exchange in one view. |
| vertical-swap | 17 | 1 | Level1/0-3-2-2-3 | The same column keeps its height but reverses green and magenta. Only the option exchanging those two levels fits both views. |
| stack-transfer | 27 | 1 | Level1/15-3-2-2-3 | A horizontal transfer ends in an empty cell of a stacked scene. In seven cases a legal landing is above floor level. Here blue must provide support before the upper yellow travels. |
| settle | 15 | 1 | Level1/39-3-2-3-4 | Moving a base into a vacancy drops cyan into the base's old cell. A plausible horizontal-only route puts the wrong color at a neighboring base. Two cases have two falling blocks in one command. |
| unchanged | 7 | 0 (3), 1 (4) | Level0/10-3-3-1-2 | Both rows have the same colored state. Inverse moves and same-color exchanges can jointly restore it. A proposed route that leaves even one extra occupied cell fails. |

### Representative replays and matched comparisons

- **Floor transfer.** In L0/6, C slides red left from (2,1,0) to (1,1,0), then moves blue out and back. In L0/31-3-3-1-3, B begins with a green/yellow exchange and its inverse, then slides blue left. Both demand a net one-cell footprint change. Changing the target from empty to occupied requires tracking the displaced color at the source.
- **Floor exchange.** In L0/22, A exchanges blue/yellow along x three times, leaving the colors reversed. In L0/0-3-3-1-2, A first moves yellow out and back, then swaps cyan and magenta along y. Both end with exactly two color substitutions on an unchanged footprint; the repeated commands alone do not reveal that net effect.
- **Horizontal exchange on a stack.** In L1/1, B swaps green/blue at ground level, then the new blue occupant swaps with magenta on its other side. A final same-color vertical swap leaves the new ground colors intact. In L1/3-3-2-2-3, A swaps vertically, exchanges two matching reds at height one, then swaps vertically on the adjacent column. Both use a horizontal exchange, but only L1/1 needs it to explain the final colors.
- **Vertical exchange.** In L1/0, B swaps two reds at floor level, then two greens aloft. Its final downward exchange changes the upper and lower colors of column (0,0). In L1/30-3-2-3-4, B changes the order of blue/red at (0,1) first; two horizontal swaps cancel. Preserving footprint and height still leaves the visible vertical order to be checked.
- **Supported transfer.** In L1/15, D moves a blue base into (1,1,0), slides yellow onto it, then moves the vacated column's remaining yellow base sideways. In L1/20-3-2-2-3, A first places magenta at (0,1,0), slides cyan onto it, then exchanges their vertical order. Both require support at the instant of landing. The final sorting step changes the second problem.
- **Settling.** In L1/39, A first exchanges green and blue at floor level. It moves blue out of (0,0,0), drops cyan one level, and then exchanges two other ground occupants. In L1/34-3-2-3-4, D extracts the blue base at (2,0,0); cyan and the top blue fall in order. A vertical exchange then uses the newly lowered blue, followed by a same-color horizontal exchange. An extra block above the extracted base changes the source occupant of the next instruction.
- **Same visible endpoints.** In L0/10, C swaps distinguishable colors, undoes the swap, then swaps two blues. In L0/29-3-3-1-2, A exchanges two yellows on the same edge three times. Both fit identical endpoint rows; only the first requires restoring a temporarily visible color change. A solver need only establish which printed sequence fits. Hidden serial numbers cannot break a tie.

### Evidence and observed discrepancies

The [short visual notes](case-notes.md) list the change and closest distractor for each source ID. The [per-item ledger](observations.json) gives each source ID, original media location and SHA-256, calibrated view frames, full initial/final coordinate maps, all printed options, each replay, mismatching visible coordinates, and the nearest rejected option. The nearest distractor minimizes the number of mismatched cells among legal options; ties use printed order. The [raster audit](audit_originals.py) reproduces the ledger from full-size PNGs and the public choices. It infers the origin from the colored axes, fits the footprint scale, samples face interiors, and enumerates supported column heights consistent with both views. All 160 endpoint reconstructions are unique under the released grid profiles. All 80 keys match the sole fitting option. The ledger's intermediate changes are deductions under each printed sequence.

- Of 240 distractors, 40 have one instruction, 100 have two and 100 have three. Every fitting route has three. The final source-ID suffix is 2 for 30 records and 4 for 10 records. The generator reads the requested length into the directory name but calls both transformation functions with a literal 3.
- Four records repeat a printed distractor verbatim (L0/22 and /36, L1/14 and /20). Eight records have at least two legal wrong routes with identical visible endpoints, including those four. Their letters appear in `equivalentLegalEndpoints`. Eleven wrong options fail on a missing source or unsupported destination; two items each contain two such wrong options. None of these defects introduces a second fitting key.
- Nineteen fitting routes exchange identically colored blocks at least once; seven finish with the starting colors in every cell. The six RGB values repeat. The source script calls pure magenta “pink”; the ledger calls the rendered red–blue color magenta.
- The release prints signs such as `x+` and separators `--`. The archived compositor formats “positive x” and a longer arrow. The release and archived annotations also differ in prose. The upstream source explains the geometry and construction; the release supplies the authoritative printed content.

### New-item design rules

Construct each candidate around a different *visible* decision. For vacancy versus exchange, make both options predict the same moved color at the destination and contrast what remains at the source. For settling, make a later instruction read from a newly occupied level. For unchanged endpoints, give a reversible legal sequence and wrong choices with visibly distinct outcomes. For duplicate colors, compare complete coordinate-to-color maps. Packages may make axes and occluded cells easier to read with explicitly labeled layers or multiple projections. Record such presentation changes with the sample. Reject any pair of equivalent choices, ambiguous support convention, or second option compatible with the given views.


[Verified new items and separate original variants](acceptance.md).
