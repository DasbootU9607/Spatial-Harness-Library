# Cube Counting source audit

## Released questions

The catalog uses category `VisualPenetration`, type `CubeCounting`, and source IDs of the form `VisualPenetration/CubeCounting/LevelN/image-id`. The [120 individual records](official-cases.json) include exact stems, options in printed order, official annotations, stable full-resolution original image links, SHA-256 digests, measured cell arrays, compatible totals, height-map witnesses and an analyzed alternative. Every package includes the native PNGs under [originals](originals/), organized by level and source suffix. Each original is also available in the library checkout at `questions/` followed by its recorded `mediaField`. The archive pins code revision `c27f9111a2674f2ea03e2ca1f5833326cf1eec1a`. The released data revision is `c722d00b2f740eacb1b56f4cbcd3af47bbbe40b8`.

Every item supplies an orthographic Front outline and Top footprint. Sixty also supply a Left outline in a third panel. Unit borders subdivide occupied squares. Internal line segments on an elevation mark units along that elevation, without indicating how deep each column is. In the printed order, Top columns match Front columns from left to right. Top rows from top to bottom match Left columns from left to right. No released item asks for visible-cube count or absolute physical count from a single isometric picture. The count embedded in the source ID describes the modeled stack. Solvers can ignore it for all six mechanisms.

| Level | Front + Top elementary minimum / maximum / possible | Front + Top + Left minimum / maximum / possible | Four numbers | Three numbers and an all-incorrect option | Key positions A / B / C / D |
|---|---|---|---:|---:|---|
| 0 | 13 / 10 / 17 | 0 / 0 / 0 | 26 | 14 | 9 / 12 / 11 / 8 |
| 1 | 0 / 0 / 0 | 16 / 16 / 8 | 21 | 19 | 4 / 10 / 7 / 19 |
| 2 | 5 / 7 / 8 | 4 / 11 / 5 | 30 | 10 | 16 / 6 / 10 / 8 |

The 43 all-incorrect choices occur at A, B, C and D in 13, 13, 11 and 6 items. No official key selects that choice. Each level contains 40 questions. At Levels 0 and 1 each measured axis spans one to three units. Level 2 includes grids up to four units per axis. The two-view subset is the first 20 Level 2 items. Thirty of the 120 displayed constraint sets force one total. The remaining 90 admit multiple totals.

## From a printed grid to a count

The released wording refers to satisfying the views. The upstream model builder creates ground-supported vertical stacks. Its bottom-layer connectivity uses eight neighbors, so corner contact can occur. The solving convention below follows its height-column arithmetic. New questions should state the support and axis rules on the question itself.

Write a positive integer on every occupied Top square, and zero on every blank one. The column maxima must equal Front heights. When Left is present, impose row maxima as well. This gives a direct way to check a proposed height map. The lower bound and the upper bound alone suffice for the two extremal questions only after establishing attainability. For a possible-total option, exhibit a compatible height map of that total. The per-case file stores at least one example for each feasible numerical option.

| Released example | Geometry a reader can check | Inference |
|---|---|---|
| Level0/0-3-3-3-7, minimum | Top contains five squares. Only the third Front column needs a stack taller than one, and its peak is three. | Start at five. Put two more cubes on one of the two third-column bases. Seven is attainable. Eight uses one unnecessary cube. |
| Level0/1-3-3-3-8, maximum | Front heights are 1, 2, 3. Top permits one base under the first column, one under the second and two under the third. | Even at all four caps the sum is 1+2+3+3 = 9. The offered 10 breaches a cap. |
| Level0/3-3-3-2-5, possible | Four occupied Top cells include a single base under the right-hand Front peak of two. Both other columns have height one. | The right-hand stack has height two and all others have height one. Five is possible. Four loses the printed upper square. |
| Level1/0-3-3-3-11, minimum | Seven occupied bases. Front peaks 2,1,3 and Left peaks 3,1,2. | Height rows 103 / 111 / 201 have total 10. Reaching the third Front column's three costs two extra cubes and reaching the first column's two costs another. Eight cannot meet both. |
| Level1/1-3-3-3-9, maximum | Top rows 100 / 111 / 101. Only Front column one can exceed one. Left requires peaks 2,1,3 in those rows. | The first-column heights are forced to 2,1,3. The other three occupied cells take one each. Nine is attainable and ten is impossible. |
| Level1/12-3-3-3-8, possible | Top rows 001 / 001 / 111. Front heights 2,1,3 and Left heights 3,1,2. | The two single-base rows force heights three and one. The last row can be 211 or 212. Totals eight and nine are both possible. Only eight appears among the choices. |

## Independent panel review

The review read each original PNG at native resolution. It detected every enclosed unit square below the captions and checked square dimensions, panel counts and gravity-consistent elevations. Contact sheets retain the complete geometry and captions for ten items per sheet. Review them in source order and use each record's direct link to inspect the original.

| Level | First ten | Second ten | Third ten | Fourth ten |
|---|---|---|---|---|
| 0 | [0–9](panels-01.png) | [10–19](panels-02.png) | [20–29](panels-03.png) | [30–39](panels-04.png) |
| 1 | [0–9](panels-05.png) | [10–19](panels-06.png) | [20–29](panels-07.png) | [30–39](panels-08.png) |
| 2 | [0–9](panels-09.png) | [10–19](panels-10.png) | [20–29](panels-11.png) | [30–39](panels-12.png) |

The [audit replay](recheck-source-images.py) takes `--library CHECKOUT --output DIRECTORY` and uses OpenCV, NumPy and Pillow. It enumerates possible rows, retains the maxima already witnessed in Front and records one witness per reachable total. Exhausting these states checks each numeric choice and the complement choice. It never conditions on the source-ID cube count.

## Released explanations with unattainable minima

The upstream three-view minimum is the larger of the Front-only and Left-only lower bounds. Sometimes the two requirements force extra tall stacks in mutually incompatible places. Six source rows have a larger true minimum. Independent option verdicts agree with 117 of the 120 released keys.

| Source suffix | Printed minimum | Actual minimum | Consequence |
|---|---:|---:|---|
| Level1/34-3-3-3-16 | 13 | 15 | A, the all-incorrect option, qualifies. The key selects B (13). |
| Level2/20-4-4-3-11 | 10 | 11 | Total 11 is forced. The keyed possible-count choice qualifies. |
| Level2/21-4-4-4-26 | 22 | 23 | No offered number equals the minimum. |
| Level2/27-4-4-4-20 | 17 | 19 | No offered number equals the minimum. |
| Level2/33-4-4-4-21 | 18 | 19 | The keyed maximum still qualifies. |
| Level2/39-4-4-4-27 | 22 | 25 | The keyed maximum still qualifies. |

For Level1/34, Front is 2,2,3. Left is 3,3,3. Top contains seven occupied cells. Each of the three rows needs a height-three stack and only column three admits it. This costs six cubes above the base layer. The first two columns also each need a height-two stack. Their two extra cubes bring the minimum to 7+6+2 = 15. A concrete witness has rows 103 / 013 / 223.

## Upstream construction and replay

`create_freecad/create_visual_penetration/create_cube_counting.py` samples a supported occupancy array layer by layer, joins isolated bottom regions and constructs separate unit boxes using FreeCAD Part. It compounds them, sets a First Angle TechDraw projection group, and exports a Front, Left and Top PDF plus an isometric reference PNG. The displayed questions use cropped TechDraw views. This source version rejects a candidate if any actual axis is shorter than three. The release includes smaller spans, including the single cube in Level1/37. Treat that difference as evidence that the archived sampler settings alone cannot regenerate every released item byte for byte.

`create_freecad/generate_data.py` lists the two mode-specific calls to `prepare_composite_image_CubeCounting` in `visual_penetration_tasks_utils.py`. The latter runs `utils.detect_subfigures` on the PDF, composes and labels panels with Pillow, recovers cell arrays using OpenCV contours, chooses a minimum/maximum/possible prompt, shuffles numbers and a potential none choice, and writes a letter and explanatory bounds with `save_json`. Its possible branch keys the filename's cube count and can sample other in-range values as distractors. The released possible questions inspected here each have only one qualifying option.

A local replay used FreeCAD 1.0.2, seed 812, four attempts at 3×3×3, a blank A4 landscape template and composition seed 5759. It saved a nine-cube native model. The macro bound the active document for the upstream cube helper, assigned an entire Placement value and pumped GUI events while TechDraw settled. These compatibility changes and an additional native save were applied to a working copy. The initial unsynchronized PDF failed the three-region crop. A second run cropped the panels, but light-gray face interiors passed the upstream 250 threshold as ink and produced impossible bounds (−3 and 0). Mapping light paper to white before the original contour detector restored the cells. The unmodified option and answer stage then gave bounds 8–11 with two views and 9–10 with three. The final three-view geometry has Front 3,2,1, Left 2,2,3 and Top 010 / 111 / 100. This replay example has an independent seed and no identity relationship to a released row with the same dimension/count suffix. [Replayed three-view composite](upstream-three-views.png)

The diagnostic exact-count pair and explicit support wording in this skill are original authoring rules. Coverage of released questions uses the six observed combinations above.

The [replay receipt](upstream-replay.json) lists input digests, seeds, native and intermediate outputs, failed attempts and final panel digests.
