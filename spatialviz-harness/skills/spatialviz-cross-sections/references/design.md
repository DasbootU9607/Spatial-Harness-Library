# Cross-Sections design record

Use `parallel`, `three-tiers`, `point-contact` or `oblique` for the released negative question, `mixed` for off-axis components, and `marked` for the directed positive question. JSON parameters include `height` (2, 2.5 or 3), `offset` (0 or -2), `side` (south or north), and for oblique planes `axis` (x/y/z) and `angle` (45/135). Supply optional `tiers` from the bottom upwards as [centerX,centerY,bottomZ,height,bottomRadius,topRadius,footprint]. Square radii are half-widths. Supported footprints are square, triangle and round. The common-scale base is a 6 by 6 square prism. For new stacks check that adjacent footprints touch and the final image stays within the panels.

The release asks for an impossible outline. A marked cut and an explicit viewer are original extensions. New negative tasks print a common scale, so a longest-chord bound can certify an impossible section for every plane. Section calculations use solid component boundaries.
