# Visual case notes

Each row compares the two initial camera views with the two final camera views. Cells use world (x,y,z). A dot denotes an empty cell. The arrow in the changes column reads from the top pair to the bottom pair. The closest rejected route is chosen by final mismatched cell count and then by printed order. Exact reconstructions and the deductions for all four letters are in [observations.json](observations.json).

| Source ID | Visible changes | Matching route | Closest distractor and decisive observation |
|---|---|---|---|
| MentalAnimation/BlockMoving/Level0/0-3-3-1-2 | (2,1,0) cyan → magenta, (2,2,0) magenta → cyan | A | B. At (1, 0, 0) this predicts empty. The final views show yellow. |
| MentalAnimation/BlockMoving/Level0/1-3-3-1-2 | (0,0,0) cyan → magenta, (1,0,0) magenta → cyan | D | B. At (0, 1, 0) this predicts cyan. The final views show green. |
| MentalAnimation/BlockMoving/Level0/2-3-3-1-2 | (1,1,0) cyan → green, (2,1,0) green → cyan | B | D. At (1, 1, 0) this predicts empty. The final views show green. |
| MentalAnimation/BlockMoving/Level0/3-3-3-1-2 | (1,1,0) red → ., (2,2,0) . → red | C | B. At (1, 1, 0) this predicts red. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/4-3-3-1-2 | (1,0,0) blue → green, (1,1,0) . → blue, (2,1,0) green → . | D | A. At (1, 1, 0) this predicts empty. The final views show blue. |
| MentalAnimation/BlockMoving/Level0/5-3-3-1-2 | (0,0,0) cyan → ., (0,1,0) blue → cyan, (1,0,0) . → cyan, (1,1,0) cyan → magenta, (1,2,0) magenta → blue | D | A. At (0, 0, 0) this predicts cyan. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/6-3-3-1-2 | (1,1,0) . → red, (2,1,0) red → . | C | B. At (0, 1, 0) this predicts blue. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/7-3-3-1-2 | (0,0,0) red → ., (0,1,0) . → red, (0,2,0) green → ., (1,0,0) magenta → yellow, (1,1,0) yellow → magenta, (1,2,0) . → green | D | A. At (0, 0, 0) this predicts red. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/8-3-3-1-2 | (0,2,0) magenta → blue, (1,0,0) . → blue, (1,1,0) blue → ., (1,2,0) blue → magenta, (2,0,0) cyan → red, (2,1,0) red → cyan | A | D. At (0, 2, 0) this predicts magenta. The final views show blue. |
| MentalAnimation/BlockMoving/Level0/9-3-3-1-2 | (1,1,0) yellow → magenta, (2,1,0) magenta → yellow | D | C. At (0, 1, 0) this predicts yellow. The final views show red. |
| MentalAnimation/BlockMoving/Level0/10-3-3-1-2 | Same occupied cells and colors. | C | A. At (0, 1, 0) this predicts green. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/11-3-3-1-2 | (0,0,0) magenta → ., (1,2,0) yellow → ., (2,0,0) . → magenta, (2,2,0) . → yellow | B | D. At (0, 0, 0) this predicts magenta. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/12-3-3-1-2 | (0,2,0) yellow → blue, (1,2,0) blue → yellow | D | A. At (0, 0, 0) this predicts empty. The final views show blue. |
| MentalAnimation/BlockMoving/Level0/13-3-3-1-2 | (1,1,0) . → magenta, (2,1,0) magenta → . | A | D. At (1, 2, 0) this predicts empty. The final views show red. |
| MentalAnimation/BlockMoving/Level0/14-3-3-1-2 | (0,0,0) red → ., (0,2,0) . → red, (1,2,0) green → cyan, (2,2,0) cyan → green | A | D. At (0, 0, 0) this predicts red. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/15-3-3-1-2 | (1,0,0) green → ., (1,2,0) magenta → green, (2,0,0) . → magenta | A | B. At (0, 2, 0) this predicts magenta. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/16-3-3-1-2 | (0,0,0) . → magenta, (1,0,0) magenta → . | B | A. At (0, 0, 0) this predicts empty. The final views show magenta. |
| MentalAnimation/BlockMoving/Level0/17-3-3-1-2 | (0,2,0) blue → cyan, (1,2,0) cyan → blue | D | C. At (2, 1, 0) this predicts empty. The final views show cyan. |
| MentalAnimation/BlockMoving/Level0/18-3-3-1-2 | (1,0,0) cyan → blue, (1,1,0) blue → cyan | B | D. At (0, 1, 0) this predicts blue. The final views show magenta. |
| MentalAnimation/BlockMoving/Level0/19-3-3-1-2 | (1,0,0) cyan → magenta, (1,1,0) yellow → cyan, (2,0,0) magenta → cyan, (2,1,0) cyan → yellow | C | D. At (1, 0, 0) this predicts cyan. The final views show magenta. |
| MentalAnimation/BlockMoving/Level0/20-3-3-1-2 | (0,2,0) cyan → ., (1,0,0) . → cyan | C | B. At (0, 2, 0) this predicts cyan. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/21-3-3-1-2 | (0,2,0) blue → green, (1,1,0) blue → red, (1,2,0) green → blue, (2,1,0) . → blue, (2,2,0) red → . | D | B. At (0, 1, 0) this predicts blue. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/22-3-3-1-2 | (1,2,0) blue → yellow, (2,2,0) yellow → blue | A | D. At (0, 2, 0) this predicts blue. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/23-3-3-1-2 | (0,1,0) yellow → ., (0,2,0) cyan → yellow, (1,0,0) green → ., (1,1,0) . → cyan, (2,0,0) . → green | C | B. At (0, 1, 0) this predicts green. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/24-3-3-1-2 | (0,0,0) . → cyan, (0,2,0) cyan → ., (1,0,0) magenta → ., (1,1,0) . → magenta | A | D. At (0, 0, 0) this predicts empty. The final views show cyan. |
| MentalAnimation/BlockMoving/Level0/25-3-3-1-2 | (0,0,0) . → magenta, (0,1,0) green → ., (0,2,0) magenta → green, (1,1,0) . → green, (2,1,0) green → . | D | C. At (0, 0, 0) this predicts empty. The final views show magenta. |
| MentalAnimation/BlockMoving/Level0/26-3-3-1-2 | (0,0,0) cyan → ., (0,1,0) . → cyan, (1,0,0) cyan → ., (2,1,0) . → cyan | B | A. At (0, 0, 0) this predicts cyan. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/27-3-3-1-2 | (0,1,0) blue → red, (0,2,0) red → green, (2,1,0) green → blue | B | D. At (0, 1, 0) this predicts blue. The final views show red. |
| MentalAnimation/BlockMoving/Level0/28-3-3-1-2 | (0,1,0) . → cyan, (0,2,0) magenta → cyan, (1,1,0) cyan → ., (1,2,0) cyan → ., (2,2,0) . → magenta | B | A. At (0, 1, 0) this predicts magenta. The final views show cyan. |
| MentalAnimation/BlockMoving/Level0/29-3-3-1-2 | Same occupied cells and colors. | A | B. At (0, 2, 0) this predicts yellow. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/30-3-3-1-3 | (0,1,0) green → cyan, (1,2,0) cyan → green | C | B. At (0, 0, 0) this predicts green. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/31-3-3-1-3 | (1,1,0) . → blue, (2,1,0) blue → . | B | A. At (0, 0, 0) this predicts blue. The final views show green. |
| MentalAnimation/BlockMoving/Level0/32-3-3-1-3 | (2,1,0) blue → ., (2,2,0) . → blue | D | C. At (1, 2, 0) this predicts empty. The final views show green. |
| MentalAnimation/BlockMoving/Level0/33-3-3-1-3 | (0,0,0) cyan → green, (0,1,0) green → cyan, (1,2,0) magenta → ., (2,1,0) . → magenta | B | A. At (1, 2, 0) this predicts magenta. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/34-3-3-1-3 | (0,1,0) cyan → ., (0,2,0) . → cyan | A | B. At (0, 0, 0) this predicts empty. The final views show red. |
| MentalAnimation/BlockMoving/Level0/35-3-3-1-3 | Same occupied cells and colors. | A | D. At (1, 0, 0) this predicts blue. The final views show magenta. |
| MentalAnimation/BlockMoving/Level0/36-3-3-1-3 | (0,2,0) . → cyan, (1,0,0) green → red, (1,1,0) red → ., (1,2,0) cyan → ., (2,0,0) . → green | C | B. At (0, 2, 0) this predicts empty. The final views show cyan. |
| MentalAnimation/BlockMoving/Level0/37-3-3-1-3 | (0,0,0) yellow → ., (1,1,0) cyan → yellow, (1,2,0) . → cyan | D | B. At (0, 0, 0) this predicts yellow. The final views show empty. |
| MentalAnimation/BlockMoving/Level0/38-3-3-1-3 | (1,0,0) green → red, (1,1,0) red → magenta, (1,2,0) red → ., (2,0,0) magenta → green, (2,2,0) . → red | D | A. At (1, 0, 0) this predicts green. The final views show red. |
| MentalAnimation/BlockMoving/Level0/39-3-3-1-3 | (0,1,0) red → ., (0,2,0) yellow → red, (1,0,0) green → ., (1,1,0) . → yellow, (2,0,0) . → green | B | C. At (0, 1, 0) this predicts yellow. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/0-3-2-2-3 | (0,0,0) magenta → green, (0,0,1) green → magenta | B | A. At (0, 0, 0) this predicts magenta. The final views show green. |
| MentalAnimation/BlockMoving/Level1/1-3-2-2-3 | (0,1,0) blue → green, (1,1,0) green → magenta, (2,1,0) magenta → blue | B | C. At (0, 1, 0) this predicts blue. The final views show green. |
| MentalAnimation/BlockMoving/Level1/2-3-2-2-3 | (0,0,1) green → ., (1,0,0) . → green, (1,0,1) . → red, (2,0,0) red → blue, (2,0,1) blue → . | C | B. At (0, 0, 1) this predicts green. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/3-3-2-2-3 | (0,0,0) green → red, (0,0,1) red → green, (1,0,0) red → green, (1,0,1) green → red | A | D. At (0, 0, 0) this predicts green. The final views show red. |
| MentalAnimation/BlockMoving/Level1/4-3-2-2-3 | (2,0,0) magenta → cyan, (2,1,1) cyan → magenta | A | D. At (0, 1, 0) this predicts green. The final views show blue. |
| MentalAnimation/BlockMoving/Level1/5-3-2-2-3 | Same occupied cells and colors. | B | A. At (1, 0, 0) this predicts green. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/6-3-2-2-3 | (1,1,0) . → yellow, (2,0,0) yellow → cyan, (2,0,1) cyan → . | C | B. At (1, 0, 0) this predicts empty. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/7-3-2-2-3 | Same occupied cells and colors. | B | C. At (0, 0, 0) this predicts blue. The final views show red. |
| MentalAnimation/BlockMoving/Level1/8-3-2-2-3 | Same occupied cells and colors. | D | A. At (0, 0, 0) this predicts empty. The final views show cyan. |
| MentalAnimation/BlockMoving/Level1/9-3-2-2-3 | Same occupied cells and colors. | A | B. At (0, 1, 0) this predicts cyan. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/10-3-2-2-3 | (0,0,0) cyan → magenta, (0,1,0) magenta → cyan, (1,1,1) green → cyan, (2,1,0) cyan → green | A | B. At (1, 1, 0) this predicts green. The final views show magenta. |
| MentalAnimation/BlockMoving/Level1/11-3-2-2-3 | (0,0,0) yellow → magenta, (0,1,0) cyan → yellow, (1,0,0) magenta → yellow, (1,1,0) . → cyan, (2,1,0) yellow → blue, (2,1,1) blue → . | D | B. At (0, 1, 0) this predicts cyan. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/12-3-2-2-3 | (0,0,0) cyan → red, (0,1,0) green → blue, (0,1,1) blue → green, (1,0,0) . → cyan, (1,1,0) red → . | B | D. At (0, 0, 0) this predicts green. The final views show red. |
| MentalAnimation/BlockMoving/Level1/13-3-2-2-3 | (1,0,0) green → blue, (1,1,0) blue → green | C | D. At (0, 0, 0) this predicts green. The final views show blue. |
| MentalAnimation/BlockMoving/Level1/14-3-2-2-3 | (0,0,0) magenta → red, (1,0,0) . → magenta, (1,1,0) red → ., (1,1,1) blue → ., (2,1,0) . → blue | C | A. At (0, 0, 0) this predicts yellow. The final views show red. |
| MentalAnimation/BlockMoving/Level1/15-3-2-2-3 | (0,0,0) . → yellow, (0,1,0) yellow → ., (0,1,1) yellow → ., (1,1,0) . → blue, (1,1,1) . → yellow, (2,1,0) blue → . | D | A. At (0, 0, 0) this predicts empty. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/16-3-2-2-3 | (2,0,0) yellow → blue, (2,1,0) blue → yellow | B | D. At (1, 0, 0) this predicts blue. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/17-3-2-2-3 | (0,0,0) . → yellow, (0,1,0) yellow → ., (1,0,0) magenta → ., (1,1,0) blue → magenta, (2,0,0) . → blue | A | C. At (0, 0, 0) this predicts empty. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/18-3-2-2-3 | (0,0,0) . → cyan, (1,0,0) cyan → ., (1,0,1) blue → ., (1,1,1) . → blue | B | A. At (0, 0, 0) this predicts empty. The final views show cyan. |
| MentalAnimation/BlockMoving/Level1/19-3-2-2-3 | (0,0,0) green → magenta, (0,0,1) magenta → ., (1,0,0) . → green | D | C. At (0, 0, 0) this predicts green. The final views show magenta. |
| MentalAnimation/BlockMoving/Level1/20-3-2-2-3 | (0,0,1) cyan → ., (0,1,0) . → cyan, (0,1,1) . → magenta, (1,1,0) magenta → . | A | C. At (0, 1, 1) this predicts empty. The final views show magenta. |
| MentalAnimation/BlockMoving/Level1/21-3-2-2-3 | (1,1,0) green → yellow, (1,1,1) yellow → ., (2,0,0) yellow → green, (2,1,0) . → yellow | D | A. At (1, 0, 1) this predicts yellow. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/22-3-2-2-3 | (0,0,0) . → magenta, (0,1,1) blue → ., (1,0,0) magenta → green, (1,0,1) green → ., (1,1,1) . → blue | D | B. At (0, 1, 1) this predicts blue. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/23-3-2-2-3 | (1,1,0) magenta → cyan, (2,0,0) cyan → yellow, (2,0,1) green → ., (2,1,0) yellow → magenta, (2,1,1) . → green | B | A. At (1, 1, 0) this predicts magenta. The final views show cyan. |
| MentalAnimation/BlockMoving/Level1/24-3-2-2-3 | (0,0,0) yellow → cyan, (0,1,0) cyan → blue, (0,1,1) blue → yellow, (2,0,0) yellow → ., (2,1,0) . → yellow | D | C. At (0, 0, 1) this predicts blue. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/25-3-2-2-3 | (0,1,0) . → red, (1,0,1) red → green, (1,1,1) green → . | D | C. At (0, 0, 1) this predicts empty. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/26-3-2-2-3 | (1,0,0) . → blue, (1,1,0) blue → . | C | B. At (1, 1, 0) this predicts magenta. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/27-3-2-2-3 | (1,0,0) blue → ., (2,0,0) . → blue | A | B. At (0, 1, 0) this predicts empty. The final views show green. |
| MentalAnimation/BlockMoving/Level1/28-3-2-2-3 | (0,0,1) red → green, (1,0,1) green → red, (2,0,1) green → ., (2,1,0) . → green | B | A. At (2, 0, 0) this predicts green. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/29-3-2-2-3 | (0,0,0) cyan → ., (0,1,0) . → cyan, (1,0,0) . → green, (1,1,0) green → . | A | D. At (0, 0, 0) this predicts cyan. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/30-3-2-3-4 | (0,1,0) red → blue, (0,1,1) blue → red | B | A. At (1, 0, 0) this predicts empty. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/31-3-2-3-4 | (0,0,0) yellow → green, (1,0,0) green → yellow | B | C. At (0, 0, 1) this predicts blue. The final views show magenta. |
| MentalAnimation/BlockMoving/Level1/32-3-2-3-4 | (1,0,0) . → blue, (1,1,0) blue → ., (1,1,1) blue → ., (2,0,0) . → red, (2,1,0) red → blue | C | A. At (1, 0, 0) this predicts empty. The final views show blue. |
| MentalAnimation/BlockMoving/Level1/33-3-2-3-4 | (0,0,0) green → red, (0,1,0) red → blue, (1,0,0) blue → ., (1,1,0) . → green | B | C. At (0, 0, 0) this predicts blue. The final views show red. |
| MentalAnimation/BlockMoving/Level1/34-3-2-3-4 | (1,0,0) . → blue, (2,0,2) blue → . | D | C. At (2, 0, 0) this predicts cyan. The final views show blue. |
| MentalAnimation/BlockMoving/Level1/35-3-2-3-4 | (0,0,1) yellow → green, (0,0,2) green → ., (0,1,1) green → yellow, (0,1,2) . → green | C | A. At (0, 0, 2) this predicts green. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/36-3-2-3-4 | (0,1,0) green → red, (1,0,0) blue → green, (1,0,1) magenta → ., (1,1,0) red → magenta, (2,0,0) . → blue | B | C. At (0, 0, 0) this predicts blue. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/37-3-2-3-4 | (1,0,0) . → yellow, (1,1,0) yellow → cyan, (1,1,1) cyan → . | D | C. At (0, 0, 0) this predicts empty. The final views show yellow. |
| MentalAnimation/BlockMoving/Level1/38-3-2-3-4 | (0,0,1) cyan → magenta, (0,0,2) magenta → ., (0,1,0) . → yellow, (1,0,0) magenta → cyan, (2,0,0) yellow → magenta | C | A. At (0, 0, 2) this predicts magenta. The final views show empty. |
| MentalAnimation/BlockMoving/Level1/39-3-2-3-4 | (0,0,0) blue → cyan, (0,0,1) cyan → ., (0,1,0) . → blue, (1,0,0) blue → green, (2,1,0) green → blue | A | C. At (1, 0, 0) this predicts blue. The final views show green. |
