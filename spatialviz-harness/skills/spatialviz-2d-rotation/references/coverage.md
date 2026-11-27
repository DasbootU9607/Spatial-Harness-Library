# Official 2D coverage and authoring controls

Audit scope: all 80 2DRotation questions in the pinned local official dataset (revision c722d00b2f740eacb1b56f4cbcd3af47bbbe40b8). All original-image contact sheets were visually reviewed. `coverage.json` lists every sourceId, image hash and reviewed family. It is an inventory, not an independent proof of each official answer or a claim about future upstream data.

| Observed family | Official records | Original rows x columns |
| --- | --- | --- |
| Colored cells | Level0, samples 0–39: 40 | 3x2 (20), 3x3 (15), 4x3 (5) |
| Dice dots | Level1, samples 0–24: 25 | 3x2 (10), 3x3 (15) |
| Lines and circles | Level1, samples 25–39: 15 | 3x3 (15) |

These are observed source facts, not hardcoded size limits. Source filename suffixes are columns-rows, whereas the skill takes rows and cols. Quarter-turn options exchange dimensions. A grey cell is retained when its mask value is zero.

## Added official references

- `official-rectangle.json/png`: MentalRotation/2DRotation/Level0/38-3-4, the user's colored example, has a 4-row/3-column original and 3-row/4-column rotated option.
- `official-geometric.json/png`: MentalRotation/2DRotation/Level1/29-3-3, the user's geometric example, contains circle outlines, diagonal lines, parallel lines and a branched diagonal. The source explanation and answer are preserved without claiming that the new texture files are the original assets.

Derived rule: transform internal line endpoints, circles and the external marker with the whole grid. A circle is invariant under rotation; a diagonal or branched motif generally is not. Endpoint reversal or reordering segments is a representation change, not an incorrect option. Local orientation errors still require full-grid equivalence checks.

## Inputs

`{"rows":4,"cols":3,"mode":"colored"}` creates a rectangular colored question.

`{"rows":3,"cols":2,"mode":"patterned","patternMatrix":[[null,null],["2","3"],["6","5"]]}` selects dots explicitly. IDs 1–6 mean the six dot arrangements documented by their actual point coordinates in the output, not arbitrary pictures.

`{"rows":3,"cols":3,"mode":"geometric","patternMatrix":[["6","2","1"],[null,"1","5"],["4","3",null]]}` selects line/circle motifs. With geometric mode, the six local IDs are:

| ID | Motif in its base orientation |
| --- | --- |
| 1 | Circle outline |
| 2 | Top-left to bottom-right diagonal |
| 3 | Bottom-left to top-right diagonal |
| 4 | Two horizontal parallel lines |
| 5 | Two vertical parallel lines |
| 6 | Top-left/bottom-right diagonal with a branch from bottom-left to the center |

The official script still creates grey grid planes, texture image planes and the corner marker, renders through FreeCAD, and selects/composes options through the official utilities. The textures and explicit motif selection are local authoring inputs. All modes allow variable rectangular dimensions within the documented bounds; geometric mode is not restricted to the observed 3x3 references. Arbitrary shapes and dot/line mixed grids are not yet supported.
