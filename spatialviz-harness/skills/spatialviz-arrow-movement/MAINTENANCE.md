# Arrow Movement maintenance

Use Node 20+, Python 3 with Pillow, NumPy and Matplotlib. The authoring adapter selects the Matplotlib Agg backend. Keep the checkout for the recorder and domain runtime. To install only this package from the repository root:

```powershell
node tools/install.cjs --harness spatialviz-harness --skill spatialviz-arrow-movement --destination .harness/my-arrow-skills
node .harness/my-arrow-skills/spatialviz-arrow-movement/scripts/build.cjs 643 fleet-state swap
```

Use a fresh destination for installation. Build arguments are an integer seed, mechanism, effect and optional JSON file. Mechanisms are single, fleet-path, fleet-state, checkpoint and predecessor. Effects include any, slide, swap, mixed and overlap. Set `size` and `steps` in the JSON file. Horizontal dimensions range from 2 to 5. Use [3,3] for the released grid. Use 2 to 4 commands, at least 3 in checkpoint mode. The planner rejects unsatisfied constraints. The report checks printed data and solves before comparing the stored answer. A visual review checks the native views against the printed coordinate register.

The build command returns a run, candidate and PNG. Use `node scripts/construct.cjs verify --run RUN --candidate ID` to verify again while active. Record the review with `review --run RUN --candidate ID --outcome passed --review TEXT`. Use `finish --run RUN --candidate ID --task TASK --local-only` to seal, and `node tools/publish.cjs --run RUN --task TASK --skill SKILL_DIRECTORY` from the repository root to register and publish. For revisions use the same bridge's generate command with --parent and --basis. Source pins are checked by the adapter. Run `python -B -m unittest discover -s spatialviz-harness/mental-animation` for domain regression checks.
