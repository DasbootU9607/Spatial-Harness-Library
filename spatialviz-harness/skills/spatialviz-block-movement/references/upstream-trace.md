# Following the block generator from model to print

The archive revision is `c27f9111a2674f2ea03e2ca1f5833326cf1eec1a`. Released question `MentalAnimation/BlockMoving/Level1/0-3-2-2-3` uses the two-height, 3 by 2 floor profile. The execution below generates a fresh example with those dimensions. Its sequential file basename can equal a release basename. Compare source IDs and image content separately.

## Generation and dispatch

1. In a real FreeCAD GUI process, load `create_freecad/create_mental_animation/create_block_moving.py`, set Python random seed 511 and call `main` with `space_size=[3,2,2]`, `num_moves=3`, `num_samples=1` and an empty output folder. Ground planes and colored `Part.makeBox` objects are instantiated by layer. Cubes on a higher layer need support. Six palette entries may repeat. The script draws Draft X/Y/Z axes and records initial views with `ActiveView.saveImage`.
2. `generate_random_transformation` samples legal axis steps on the current occupancy. `move_cube` exchanges colors and physical objects for occupied targets. For a vacant target it checks bounds and support, moves the object, then `drop_cubes` lowers every unsupported cube. The rendering uses actual FreeCAD solids. `generate_incorrect_random_transformation` simulates separate programs on fresh copies of the initial color map and compares full colored endpoints.
3. `generate_data.py` dispatches `prepare_composite_image_BlocksMoving(dir_path)`. OpenCV crops the four PNGs. Pillow lays the front/rotated pair for the initial state above the equivalent final pair and prints the four headers. The text sequences and shuffled answer are in the accompanying annotation. Option shuffling used seed 19.
4. To execute the dispatcher we supplied the input directory, activated the Block call, omitted unrelated imports, used a platform-native path join, and supplied the repository DejaVu Sans Bold font by absolute path. These are local execution adjustments. An observer wrapped the existing random-transformation call, saving its inputs and outputs without modifying the returned sequence. The FreeCAD 1.0.2 application ran off screen with the Part workbench, white background and navigation cube disabled.

## Worked native result

The PNG shows blue over magenta at (0,0), cyan at (0,1), red over green at (1,0), magenta at (2,0) and green at (2,1). Coordinates in this sentence identify floor columns. At the end, the (1,0) column has only red on the floor and a green cube occupies (1,1,0). Multiple green cubes occur. Only their visible color and position identify the endpoint.

| Option | Consequence of replay |
| --- | --- |
| A | The first move swaps green upward with red. Green then travels east onto the eastern magenta column. The last move exchanges the newly exposed red with the western magenta. The target has neither that elevated green nor that red at the western base. |
| B | The first and last lifts of the lone cyan settle back onto the floor. The middle vertical exchange reverses the blue and magenta in the western column. The target retains blue above magenta. |
| C | Red moves east above magenta and returns, then exchanges with the western blue horizontally. The target requires red to finish at floor height. |
| D | Cyan moves along negative y, exchanging with the magenta at (0,0,0). The next positive-y move from (0,0,0) reverses that exchange. Finally green moves from (1,0,0) into (1,1,0). The unsupported red directly above the source falls into (1,0,0). This matches the displayed stack. |

The native correct path contains a cancellation that cannot be read off the endpoints alone. Simulation of each *offered* sequence establishes which option matches. We saved the 1433 by 1807 composite with SHA-256 `5a7b7f9768c3aae28aa7d5589f775c2dc90f2556eb91deb6b7f6bebcb1f98885`. The source names the positive explanation with a literal `{answer}`; new answers need explicit per-option consequences.

## Observed failure and source differences

- Seed 183 generated identical initial and final colored stacks. A positive-z step with empty space overhead passes the pre-move support check because the source lies directly underneath its destination. The moved cube then falls back. Two such lifts followed by an exchange of same-colored floor cubes accomplished no visible change. The model computes an initial/final difference but does not use it to reject this case. The composite hash is `8d5e1701d97941affd239328f91ec6b59c6a0dbc535510f5a0451d667bae44ed`. Keep this probe as a regression fixture.
- The source saves four camera images after changing the view with `viewAxonometric` or by multiplying the camera's current orientation by a half-turn. Frame capture can race the animated camera. On seed 183 the axes in both right-column views still placed +X to the right. On seed 511 the initial pair had opposing horizontal bearings but the final pair had different inclinations. Inspect the axes and visible support faces in **each** saved panel. For generated diagrams with controlled cameras, settle the view and verify world-axis directions.
- Both correct and alternative generation calls hardcode `num_moves=3` in this archived `main`, although the folder name contains the requested move count. The released Level 0 labels contain `3-3-1-2`; some released options have two moves and others three. Recover a released option's length by reading its text.
- The release uses short `x+`, `y-` tokens. The archived compositor formats e.g. “positive x” and “negative y”. It writes a generic explanation that omits any obstructing block or gravity effect. The semantic comparison uses unit coordinate vectors.

## Evidence

The private `.harness/animation/native-probes` folder retains `probe.py` and `cadprobe.py` for seed 183, the corresponding `probe2.py` and `cadprobe2.py` for 511, initial and final snapshots, PNGs, option JSON, composite hashes, and GUI and dispatcher logs. Generated delivery checks should use printed views, rules and options. The private snapshots support this source trace only.
