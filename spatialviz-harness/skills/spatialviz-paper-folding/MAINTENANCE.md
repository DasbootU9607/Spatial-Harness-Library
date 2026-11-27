# Build and verify a Paper Folding question

From the repository root use Python with the dependencies in `spatialviz-harness/paper-folding/requirements.txt`. The generator uses the noninteractive Agg backend. Each recorder run keeps its own Matplotlib cache, upstream panel PNGs, data.json, info.json and constructed figure. The repository's bundled bold DejaVu font labels the figure.

```powershell
node spatialviz-harness/skills/spatialviz-paper-folding/scripts/build.cjs 721 2 crossed mixed
```

The arguments are seed, profile level (0–2), mechanism and optionally a punch effect. Use `strip` for levels 0 and 1. Level 2 supports `parallel` and `crossed`. Effects are `any`, `crease`, `flap`, `outside` and `mixed`. A named effect requires at least one punch of that kind; mixed requires two different kinds. The command prints the task, verified candidate and preview paths. Open the PNG, record a specific visual observation, and finish the run with the requested delivery scope.

For explicit construction, use the shared bridge. Lines are positive offsets from the retained rectangle's top or left edge. Diagonal endpoints and punches are zero-based local cell indices after the straight folds. The decoder reports all locations in the original sheet. `distractor` accepts `row` or `col`. A seed determines eligible choices and the letter order.

```powershell
$bridge='spatialviz-harness/skills/spatialviz-paper-folding/scripts/construct.cjs'
$run=node $bridge start --task 'Construct a crossed strip problem' --title 'Crossed paper strips'
$task=Join-Path $run 'delivery.json'
$params=Join-Path $run 'parameters.json'
'{"level":2,"mechanism":"crossed","axes":"HV","lines":[2,1],"diagonal":[[0,1],[1,0]],"punches":[[1,1],[2,1],[0,1]],"distractor":"col"}' | Set-Content $params -Encoding utf8
node $bridge read --run $run --file 'spatialviz-harness/skills/spatialviz-paper-folding/references/coverage.md'
$c=node $bridge generate --run $run --task $task --params $params --seed 721 | ConvertFrom-Json
node $bridge render --run $run --candidate $c.id
node $bridge verify --run $run --candidate $c.id
```

Record the image-specific observation with `review --run RUN --candidate ID --outcome passed --review TEXT`. Pass `--parent ID --basis TEXT` when generating a correction in that run. Use `finish --run RUN --candidate ID --task TASK --local-only` for local acceptance, or the repository publisher for verified delivery. Install with `node tools/install.cjs --harness spatialviz-harness --destination DIRECTORY`, then invoke the installed package's scripts/build.cjs with the same arguments.

Rerun `python -B -m unittest discover -s spatialviz-harness/paper-folding` and `node tools/check.cjs` after changes. For an archive update reproduce the image-only predictions with the two phases in references/audit_images.py before comparing new annotations. The decoder requires the four framed option grids and the original upright layout, solid blue folds and red rings.

