# Released 3ViewProjection coverage

The [source-keyed inventory](inventory.json) retains all 100 original annotations including every choice, answer, distractor explanation, image hash/path and dataset revision. Resolve `image` relative to the library's `questions` directory. Thirteen representative and ambiguity-case PNGs are included with this installed reference. The other originals remain in the bound checkout. The inventory script checks normalized fields against their original fields, answer indices, image digests, identities and counts. The visual census used ten contact sheets and separate full-resolution inspection of representative and ambiguous items.

## Official observations

| Family and supplied drawings after the isometric | Requested drawing | Count | Answer format |
|---|---|---:|---|
| Cubes, Front and Top | Left | 50 | A–D are all pictures |
| CAD, Front | Top | 16 | A–C drawings, textual D |
| CAD, Top | Left | 13 | A–C drawings, textual D |
| CAD, Top | Front | 9 | A–C drawings, textual D |
| CAD, Front | Left | 7 | A–C drawings, textual D |
| CAD, Left | Front | 5 | A–C drawings, textual D |

Cube answers A/B/C/D occur 11/12/18/9 times. The CAD counts are 15/17/18/0. The CAD release labels D “All three other options are incorrect”. The upstream script emits “None of the above”. The isometric occupies the upper left in both families. The options form a second row. In CAD the adjacent upper drawing is explicitly labeled, so its position alone does not identify its view. The separate engineering sheet inside FreeCAD uses first-angle layout, with Front at upper left, Left at upper right and Top below Front.

In world coordinates +Z points up. Seen from −Y, front-right is +X and front-up is +Z. Seen from +Z, top-right is +X and top-up is +Y. Seen from −X, left-right is −Y and left-up is +Z. Right views instead show +Y to the right. Only the nearest opaque face contributes its color. Stair edges, boundaries between neighboring cubes and holes in the footprint are visible. Interior hidden cubes have no separate outline.

All released cube IDs encode 3 by 3 by 3 occupied extents with 5–19 unit cubes. The images include straight towers, stepped profiles, branched footprints, dense multilayer blocks, open notches, and columns meeting only diagonally. The official placement routine requires support below and connects base components using eight neighbors. Its visible-face sampler paints the whole selected cube red. Sampling faces can select the same cube twice. The copying/recoloring branch produces the same occupied coordinates with a different marker assignment. The three wrong images are the original right, the recolored left and the recolored right. Opposite silhouettes can coincide.

- [0-3-3-3-15](0-3-3-3-15.png) has four square side outlines. A retains red in the top and bottom cells of the right column. D loses the lower marker. The annotations' generic “right view shape” wording alone cannot distinguish these pictures.
- [10-3-3-3-11](10-3-3-3-11.png) distinguishes the visible vertical stripe from displaced markers. In 47-3-3-3-5 the three occupied top cells form a diagonal. This source illustrates the upstream connectivity convention. Local examples require face connectivity.

CAD imports STEP geometry, checks face count, volume and single-solid status, then generates visible-edge TechDraw views and a shaded isometric. These data do not identify the original author's Boolean history. The following groups describe visible geometry. IDs are the terminal components of the source IDs in the inventory.

| Visible feature families | Representative source IDs and evidence |
|---|---|
| Bosses, stepped blocks, ledges and brackets | 00001614, 00010531, 00008298, 00012224, 00003419. A riser changes the silhouette. The edge where the near and far surfaces meet may continue inside it. |
| Flanges, shafts, circular bosses and pin arrays | 00000126, 00001009, 00001926, 00002512, 00004640, 00005081, 00005321, 00010109, 00010555, 00011960, 00020047, 00020955, 00026994. Viewing along an axis exposes concentric outlines or separate pin ends. |
| Bores, recesses, polygonal sockets and intersecting holes | 00001213, 00001971, 00002694, 00003443, 00003444, 00003847, 00004677, 00005017, 00005338, 00021071, 00025181, 00025183, 00026396, 00026398, 00026583. A transverse bore can disappear in a side view. A hole visible on a face retains its rim. |
| Grooves, split rings, open channels and curved extrusions | 00000168, 00003676, 00007280, 00008897, 00008958, 00010775, 00012350, 00029078, 00029419. Boundaries inside the outline identify channels and changes of depth. |
| Tapered, beveled, rounded or mixed-profile solids | 00001378, 00005894, 00006645, 00010530, 00011994, 00020739, 00021816, 00022276. Curved and inclined faces have direction-dependent profiles. |

CAD distractors remove internal contours from the requested or remaining view, or mirror/quarter-turn a different view. The deletion code uses raster morphology, so very close lines and stroke weights can change. [00001009](00001009.png) resolves by checking both mounting holes and the central bore. [00001213](00001213.png) resolves by checking both polygonal openings. In 00003444 the two narrower distractors retain opposite sides of the slit, a subtle difference at thumbnail size. 00025181 contains two visually equivalent plain-square distractors. In 00026398 A and C are both plain squares although A is keyed. Exclude these last two as construction exemplars. The upstream rotation fallback also describes the rotated image as the correct view even when it was made from the remaining view.

## Local scope

| Mechanism | Support | Sample coverage |
|---|---|---|
| Face-connected supported columns, red and gray cells, right-side and recolored foils | Supported with exact occlusion and conservative feasibility checks | Two stacks with different footprints and maximum heights |
| Corner boss fused to a base | Supported single STEP solid | Top given, Front requested |
| Two vertical cylindrical through-bores cut from a plate | Supported single STEP solid | Front given, Top requested |
| Other released CAD view combinations | All five pairs passed independent drawing and composite replay for each of the two sample solids, using their original authored TechDraw PDFs | Top→Left, Front→Left and Left→Front are tested combinations outside the four published examples |
| Diagonal-only stacks, arbitrary STEP files, complex curvature, oblique axes, intersecting cuts, tangent seams, hidden-line drawings | Outside the local generator or verifier | See the official inventory |

The official levels identify sources only. Local tasks preserve ordinary visible-edge drawings and add a short construction condition to the stem. The verifier rejects duplicate or insufficiently distinct displayed projections, including different models that expose the same surface pattern.
