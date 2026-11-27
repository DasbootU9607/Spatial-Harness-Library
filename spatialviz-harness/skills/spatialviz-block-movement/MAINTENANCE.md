# Block Movement maintenance

Use Node 20+, Python 3 with Pillow, NumPy and Matplotlib. Install FreeCAD GUI with Draft and pivy. Set SPATIALVIZ_FREECAD to the executable, or configure .harness/freecad-official/runtime.json. The GUI macro constructs native solids, floor tiles and labeled axes and captures each state twice. Keep the checkout for the recorder and domain runtime. To install only this package from the repository root:

```powershell
node tools/install.cjs --harness spatialviz-harness --skill spatialviz-block-movement --destination .harness/my-block-skills
node .harness/my-block-skills/spatialviz-block-movement/scripts/build.cjs 643 stack fall
```

Use a fresh destination for installation. Build arguments are an integer seed, mechanism, effect and optional JSON file. Mechanisms are flat, stack, checkpoint and missing. Select any, slide, swap, mixed, vertical, elevated, horizontal-swap, fall, invisible, revisit, unchanged or same-color. Use fall with missing. Set `size` and `steps` in the JSON file. Horizontal dimensions range from 2 to 5. Use [3,3,1] for flat and [3,2,2] or [3,2,3] for official stacks. Use 2 to 4 commands, at least 3 in checkpoint mode. The planner rejects unsatisfied constraints. The report checks printed data and solves before comparing the stored answer. A visual review checks the native views against the printed coordinate register.

The build command returns a run, candidate and PNG. Use `node scripts/construct.cjs verify --run RUN --candidate ID` to verify again while active. Record the review with `review --run RUN --candidate ID --outcome passed --review TEXT`. Use `finish --run RUN --candidate ID --task TASK --local-only` to seal, and `node tools/publish.cjs --run RUN --task TASK --skill SKILL_DIRECTORY` from the repository root to register and publish. For revisions use the same bridge's generate command with --parent and --basis. Source pins are checked by the adapter. Run `python -B -m unittest discover -s spatialviz-harness/mental-animation` for domain regression checks.
