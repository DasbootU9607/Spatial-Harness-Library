# Running cube reconstruction construction

Use the repository checkout or a package installed by `node tools/install.cjs --harness spatialviz-harness --destination DIRECTORY`. The installed bridge locates the same shared runtime. Host Python needs Pillow, NumPy, OpenCV and PyMuPDF, and the FreeCAD GUI needs Part and ImagePlane support. The runtime reads `SPATIALVIZ_FREECAD` or the private shared FreeCAD configuration. Set `SPATIALVIZ_TMP` to a writable short directory on the build drive. Intermediate models, textures, GUI configuration and logs remain there for diagnosis.

From the repository root run these PowerShell commands. Replace the review text after opening the exact PNG. Select local-only or prepare-only when that is the requested delivery scope.

```powershell
$bridge = 'spatialviz-harness/skills/spatialviz-cube-reconstruction/scripts/construct.cjs'
$run = node $bridge start --task 'Build a new reconstruction example' --title 'Marked cube reconstruction'
$spec = Join-Path $run 'delivery.json'
$params = Join-Path $run 'params.json'
'{"family":"mosaic","mode":"view","layout":7}' | Set-Content $params
node $bridge read --run $run --file 'spatialviz-harness/skills/spatialviz-cube-reconstruction/references/coverage.md'
$c = node $bridge generate --run $run --seed 74 --params $params --task $spec | ConvertFrom-Json
node $bridge render --run $run --candidate $c.id
node $bridge verify --run $run --candidate $c.id
# Inspect the rendered preview before recording an observation.
node $bridge review --run $run --candidate $c.id --outcome passed --review 'REPLACE WITH YOUR OBSERVATION'
node $bridge finish --run $run --candidate $c.id --task $spec --prepare-only
```

Use `family` values `color`, `pips`, `lines` and `mosaic`. Solid colors support opposite and view. Pattern families support view. The optional integer `layout` selects one of eleven source-derived nets. A seed chooses the remaining parameters. The shared geometry uses exact integer frames. The solver reads only visible corner markings, enumerates all 24 rotations and compares rotated tile pixels. The image verifier rectifies every displayed face, checks the empty net cells, compares competing motifs and reproduces all labels and the question footer.

The selected upstream functions create the Part planes and solid or six ImagePlanes inside FreeCAD. The local driver supplies exact exterior placements and selected counterexamples, uses a face-on paper camera and a fixed isometric cube camera, and records the native documents. `generate_data.py` activates the corresponding upstream preparation routine. The verified figure uses its crop, shuffle, option transform, label, composite and answer output. Host fixes bind the font, repair the reference resize and D height, resolve the two reconstruction dispatch names, stabilize file order and preserve Windows paths. Each specification includes original and adapted source digests and substitution counts. For revised candidates retain the same run and pass `--parent` and `--basis` to generate. The official PNG annotation and newly derived learner explanation remain separate.

Run `python -m unittest discover -s spatialviz-harness/official-folding` and the shared repository checks after changing geometry, artwork or dispatch. The original FreeCAD render can vary across graphics environments. Reject any candidate failing face recognition or unique-answer verification.

For a single build, run the following command. It prints the retained run, candidate, verified task and PNG paths. Continue that run for visual review and publication.

~~~powershell
node spatialviz-harness/skills/spatialviz-cube-reconstruction/scripts/build.cjs 76 mosaic view 2
~~~
