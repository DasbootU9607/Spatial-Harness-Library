# Blind solution to the arrow starting-panel question

The only input was the final printed PNG, SHA-256 `b2aba4171bc5f6d8775e8a0170f7a53831da3326e1e3197edf9cea273aa5a73f`. The following decision was recorded before opening a task specification, generator answer or verification report.

**Answer D.** The teal arrow ends in cell (2,0) pointing east. Forward 2 followed by Backward 2 takes the arrow back to its starting cell. The backward leg changes its heading to the exact opposite of its starting heading. The target therefore requires a west-pointing arrow at (2,0). D travels west to (0,0), then east to (2,0). Both legs stay on the board.

| Candidate | Endpoint after the two printed commands |
| --- | --- |
| A | Starts at the right cell but faces north. It returns to (2,0) pointing south. |
| B | Goes from (0,0) to (0,2) and back, ending at (0,0) pointing south. |
| C | Goes from (1,2) to (1,0) and back, ending at (1,2) pointing north. |
| D | Returns to (2,0) pointing east, matching the print. |

The captions and plotted glyphs agree for all five panels. The explicit heading-update rule distinguishes A from D even though both begin in the target cell.
