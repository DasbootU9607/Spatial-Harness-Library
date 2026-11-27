---
name: spatialviz-cube-counting
description: Design cube-counting puzzles from two or three orthographic views and solve for the minimum, maximum, feasible or exact total.
---

# Cube Counting

Choose which inference the solver must make before choosing the stack. In each top cell with ink, a contiguous column has an integer height of at least one. The front elevation sets a maximum for every top column and requires some cell to attain it. A left elevation adds the same constraint to every row. The released two-view pair is Front and Top. The three-view form adds Left. Provide their alignment on new diagrams. The archived model generator places cubes on the floor or on an occupied cell. State this support convention in the new stem.

For example, draw top rows [1,0] and [1,1], and front heights [2,1]. Write the height rows as [a,0], [b,1]. At least one of a,b must be 2. Both [2,0]/[1,1] and [2,0]/[2,1] fit, giving four and five cubes. Save the exact-count candidate with both witnesses and the failing report. Add a left elevation [2,1]. Now the second row has maximum one, so b=1. The first front column still requires height two, so a=2. The total is four. Reuse the same grid axes, option values and seed to isolate the new information.

For a minimum or maximum, require the relevant endpoint of the feasible set. For a possible-count question test each offered number for membership. For exact count require precisely one total across all explanations, even if only one listed number happens to fit. Apply the fallback text option after evaluating all numbers. Do not take the larger of the two independent elevation lower bounds as proof of feasibility. Compute jointly attainable row and column maxima. The checker reads the colored projection cells back from the PNG and keeps a height-map witness for each attainable total.

## Author and verify

Use `profile: competing-peaks` in parameter JSON for a footprint where row and column lower bounds cannot be attained together. Use `min-2`, `min-3`, `max-2`, `max-3`, `possible-2` or `possible-3`. Set `size` from 2 to 4 for the footprint and `none` to true for a fallback answer. `exact-2` deliberately emits the ambiguous diagnostic. `exact-3` adds the resolving left elevation.

From this package directory with Node 20+, Python 3 and Pillow installed, run the following commands. An installation made with the library installer keeps a local binding to the checkout.

```sh
node scripts/author.cjs generate --mechanism min-3 --seed 93177 --out new-question
node scripts/author.cjs solve --out new-question
node scripts/author.cjs test
```

Pass `--params parameters.json` to set the design parameters. Generation starts a recorder, writes the native geometry to task.json, exports question.png and runs the independent checker. Open the final image, solve it from the visible information, and inspect verification.json. After review, use `node scripts/author.cjs accept --out new-question --review "Your concrete observations"` for library publication.

Read the [official audit](references/official-audit.md) for the source images, construction history and observed exceptions. The [coverage table](references/coverage.md) connects mechanisms to verified tasks. The [design record](references/design.md) identifies the distinction between release conventions and the new verifier contract.
