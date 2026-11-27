# From two modeled stacks to one printed question

The upstream revision is `c27f9111a2674f2ea03e2ca1f5833326cf1eec1a`. The modeling entry is `create_freecad/create_mental_animation/create_block_moving.py`. It imports FreeCAD, FreeCADGui, Part, Draft, Pivy/Coin and NumPy. It draws unit boxes and floor planes, places colored xyz axes, and renders two views of each state using the FreeCAD camera. The second view rotates around the vertical axis by approximately π. The file's command-line entry calls `main(args)`; a GUI-capable FreeCAD environment is needed for its view captures.

1. Set `space_size`, `num_moves`, `num_samples` and `save_folder`. The placement loop visits cells bottom-up, probabilistically placing blocks where the floor or another block provides support. It retries stacks with fewer than three blocks. Color draws use replacement. Neither object IDs nor an original per-case random seed appear in the released PNGs.
2. The initial pair is saved as `init.png` and `init_back.png`. For a unit axis command, `move_cube` checks source, bounds and support at any empty destination. An occupied target swaps with the source. `drop_cubes` repeatedly lowers unsupported cubes. `generate_random_transformation` changes the modeled objects and indexes as it applies each command.
3. `transformed.png` and `transformed_back.png` show this result. The generator simulates alternative sequences and compares coordinate-to-color dictionaries with `check_if_diff`. It writes one selected path and three alternatives to `info.json`. This dictionary comparison can admit equivalent distractors. Also, `generate_incorrect_random_transformation` consults an object dictionary alongside a copied color dictionary. The object dictionary reflects a modeled state that can differ from the simulation, so every displayed move needs independent legality checking.
4. The commented Block example in `create_freecad/generate_data.py` points to `prepare_composite_image_BlocksMoving` in `mental_animation_tasks_utils.py`. `utils.crop_blank_area` trims the PNGs using OpenCV; the compositor uses Pillow and DejaVu Sans Bold to label and stack the four views. It shuffles the four textual sequences and assigns the answer letter. The compositor's current strings differ from the released strings as documented in the coverage table.

## Representative reconstruction

For `MentalAnimation/BlockMoving/Level1/2-3-2-2-3`, the encoded profile is 3 × 2 × 2. The released figure shows a red/green column at (0,0), a blue/red column at (0,1), a lone red at (1,1), and a red/blue column at (2,0), each column described bottom-up. Both camera angles locate the covered bases. The two lower views show green/red at (1,0), blue on the floor at (2,0), and a single red at (0,0); (0,1) and (1,1) retain their colors.

Candidate C runs as follows.

1. The red base at (2,0,0) moves one cell toward negative x. Blue falls from (2,0,1) into that vacated base. A red support now occupies (1,0,0).
2. Green leaves (0,0,1) for the supported space at (1,0,1). The footprint of the two involved columns and the visible green top constrain this move.
3. Green at (1,0,1) swaps downward with red. This accounts for both the green base and the exposed red top at (1,0). All seven colored cells match the lower views.

Choice A loses support for its third destination at (1,1,1). Choice B makes one floor exchange while leaving green at (0,0,1). Choice D also leaves green on that initial top and fails to build the new two-high column at (1,0). The complete option strings, decoded endpoint maps and machine replay are in the entry for this source ID in [observations.json](observations.json).

The PNG supplies two spatial states with two views each. It does not show a temporal series of three commands. The three-step explanation follows by testing C against the endpoints. The archive provides no released `info.json`, random state or exact camera session for this case. A fresh run of the archived modeling and compositing path tests the tools; exact regeneration of the released pixels additionally requires the original random choices and rendering environment.

| Source file under create_freecad | SHA-256 of archived bytes |
|---|---|
| create_mental_animation/create_block_moving.py | 1232ee1ae4a0f9937b5f2db24757c345b370465241de66d351bac68da12c2acf |
| generate_data.py | ce972fe493f4a8b4ce4b7065d490fc44a8cc415c7764203442a30faaa910b1fa |
| mental_animation_tasks_utils.py | 0065a623502e1bcf2e4d3caa258e6bb5ff4504bceeea930686f62f108127c84d |
| utils.py | 0cbea9458b251e44609590de9fb011c7f2f6d7e74d31f2b76a9b0f3f75952e15 |

