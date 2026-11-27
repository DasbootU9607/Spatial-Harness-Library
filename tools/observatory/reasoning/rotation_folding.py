"""Targeted diagnostics layered on the normal pixel and structure verifiers.

Each invocation handles one candidate. Separate Python processes also isolate the
domain solvers' existing top-level geometry and verify module names.
"""
import json
import sys
from pathlib import Path

DOMAIN = Path(__file__).resolve().parents[3] / "spatialviz-harness"
LABELS = "ABCD"


def result(passed, evidence, feedback=""):
    return {"passed": bool(passed), "evidence": evidence, "feedback": feedback}


def labels(values):
    return [LABELS[i] for i, yes in enumerate(values) if yes]


def key_error(spec, matches, evidence):
    key = LABELS[spec["answerIndex"]]
    if matches != [key]:
        return result(False, evidence, f"The delivered key is {key}; the full solver selects {matches}. "
                      "Keep the reasoning goal and correct the ambiguous option, marks or geometry.")
    return None


def rotation2(spec, target):
    from geometry import PLANAR, decorated, motif_signature, relation2, transform2, transform_motif

    original = spec["geometry"]
    figures = [o["geometry"] for o in spec["options"] if o["type"] == "figure"]
    rotated = [transform2(original, m) for m in PLANAR]

    def motif_free_turns(cell):
        pattern = cell.get("pattern")
        if pattern is None:
            return ("color", tuple(cell["color"][:3]))
        # Quotient by proper quarter-turns only, preserving chirality and motif identity.
        return min(motif_signature(transform_motif(pattern, m)) for m in PLANAR)

    def corner(g):
        return (g["rows"], g["cols"], tuple(g["marker"]))

    evidence = {"fullMatches": [], "ignoringMotifOrientation": [], "cornerAndSizeOnly": [], "orientationDifferences": {}}
    for label, candidate in zip(LABELS, figures):
        printed = decorated(candidate)
        for state in rotated:
            if corner(state) != corner(candidate):
                continue
            evidence["cornerAndSizeOnly"].append(label)
            if decorated(state) == printed:
                evidence["fullMatches"].append(label)
            weak = [motif_free_turns(c) for c in state["cells"]]
            other = [motif_free_turns(c) for c in candidate["cells"]]
            if weak == other:
                evidence["ignoringMotifOrientation"].append(label)
                if decorated(state) != printed:
                    evidence["orientationDifferences"][label] = [
                        [i // state["cols"] + 1, i % state["cols"] + 1]
                        for i, (a, b) in enumerate(zip(decorated(state)[3], printed[3])) if a != b]
            # Several orientations of a symmetric original can reach one option.
        for name in ("cornerAndSizeOnly", "ignoringMotifOrientation", "fullMatches"):
            evidence[name] = list(dict.fromkeys(evidence[name]))
    failed = key_error(spec, evidence["fullMatches"], evidence)
    if failed:
        return failed
    if target == "motif-orientation":
        if evidence["orientationDifferences"]:
            return result(True, evidence)
        candidates = ", ".join(evidence["cornerAndSizeOnly"])
        cue = (f"The red corner and grid size already select {candidates}. " if len(evidence["cornerAndSizeOnly"]) == 1
               else f"The corner and size admit {candidates}, but the motif identities or positions finish the selection. ")
        return result(False, evidence, cue + "Keep the grid and corner. Build one foil with the same motif in each cell "
                      "and turn an asymmetric dot or line pattern; a circle's turn leaves no visible error.")
    if target == "decorated-grid":
        # This broad goal permits multiple routes. Only the specifically declared
        # motif goal requires orientation to decide between two plausible panels.
        if len(evidence["cornerAndSizeOnly"]) == 1:
            evidence["shortcut"] = f"The corner and grid dimensions alone identify {evidence['fullMatches'][0]}."
        evidence["optionAlignments"] = {label: relation2(original, panel)["witness"]
                                        for label, panel in zip(LABELS, figures)}
        return result(True, evidence)
    raise ValueError(f"Unsupported 2D rotation goal {target}")


def rotation3(spec, target):
    from geometry import relation3
    original = spec["geometry"]["cubes"]
    solids = [o["geometry"]["cubes"] for o in spec["options"] if o["type"] == "figure"]
    relations = [relation3(original, solid) for solid in solids]
    positive = spec["polarity"] == "can"
    matches = labels([r["equivalent"] == positive for r in relations])
    counts = {LABELS[i]: len(solid) for i, solid in enumerate(solids)}
    evidence = {"fullMatches": matches, "originalCount": len(original), "cubeCounts": counts,
                "alignments": {LABELS[i]: r["witness"] for i, r in enumerate(relations)}}
    failed = key_error(spec, matches, evidence)
    if failed:
        return failed
    if target == "proper-rotation":
        # A same-count non-equivalent solid forces more reasoning than reciting the count.
        if not any(len(s) == len(original) and not r["equivalent"] for s, r in zip(solids, relations)):
            return result(False, evidence, f"Choice counts {counts} settle the can/cannot question by counting. "
                          "Keep the original; use a same-count visible mirror that fails all 24 rotations "
                          "in a can question, or declare the cube-count change as the target.")
    elif target == "cube-count-change":
        if all(n == len(original) for n in counts.values()):
            return result(False, evidence, f"Every option still has {len(original)} cubes. Keep the connected original; "
                          "remove a visible terminal cube from one option and check connectivity and visibility.")
    else:
        raise ValueError(f"Unsupported 3D rotation goal {target}")
    return result(True, evidence)


def projection(spec, target):
    from pixels import boundary, decode, difference, face_map, ink
    from verify import cells
    from cubes import projection as project
    p, g, views = spec["parameters"], spec["geometry"], spec["views"]
    if target == "nearest-surface" and p["branch"] == "cubes":
        correct = project(g["cubes"], "Left")
        panels = {k: cells(decode(views[k]["image"]), (len(correct), len(correct[0]))) for k in LABELS}

        def silhouette(grid):
            return tuple(row.replace("R", "G") for row in grid)
        matches = [k for k, panel in panels.items() if correct == panel]
        witnesses = {}
        for k, panel in panels.items():
            if panel != correct and silhouette(correct) == silhouette(panel):
                witnesses[k] = [[r+1, c+1, want, got] for r, (a, b) in enumerate(zip(correct, panel))
                                for c, (want, got) in enumerate(zip(a, b)) if want != got]
        # In the Left view, rows descend in z, columns descend in y and
        # the first cube on a ray has the smallest x. A recoloring elsewhere
        # cannot serve as a witness to depth ordering.
        max_y = max(cube[1] for cube in g["cubes"])
        max_z = max(cube[2] for cube in g["cubes"])
        occlusions = {}
        for label, differences in witnesses.items():
            for row, col, expected, shown in differences:
                ray = sorted((x, color) for x, y, z, color in g["cubes"]
                             if y == max_y - col + 1 and z == max_z - row + 1)
                behind = [x for x, color in ray[1:] if color == shown]
                if ray and ray[0][1] == expected and behind:
                    occlusions.setdefault(label, []).append({"row": row, "column": col,
                        "nearX": ray[0][0], "hiddenX": behind, "nearColor": expected, "foilColor": shown})
        evidence = {"fullMatches": matches, "leftView": correct, "sameOutlineDifferentColor": witnesses,
                    "occludingRays": occlusions}
        failed = key_error(spec, matches, evidence)
        if failed:
            return failed
        if not witnesses:
            return result(False, evidence, f"Only {matches} fits the Left outline. Keep the heights and replace a foil "
                          "with the same outline whose nearest painted cube changes at a visible row and column.")
        if not occlusions:
            return result(False, evidence, f"Foils {list(witnesses)} share the Left outline, but no changed cell "
                          "shows the color of a cube hidden behind its nearer neighbor. Keep the outline; "
                          "align different colors along one x ray and use its farther color in that foil.")
        return result(True, evidence)
    if target == "cad-view" and p["branch"] == "cad":
        faces = g["faces"]
        expected = boundary(face_map(faces, p["target"]))
        given = boundary(face_map(faces, p["given"]))
        distances = {k: difference(expected, ink(decode(views[k]["image"]))) for k in "ABC"}
        matches = [k for k, score in distances.items() if score < 4.5]
        separation = difference(given, expected)
        evidence = {"fullMatches": matches, "givenView": p["given"], "targetView": p["target"],
                    "givenTargetDistance": separation, "optionEdgeDistances": distances}
        failed = key_error(spec, matches, evidence)
        if failed:
            return failed
        if separation <= 8:
            return result(False, evidence, f"{p['given']} and {p['target']} coincide within the edge audit margin. "
                          "Keep the stock; relocate the boss or through-bore so the requested view changes a visible edge.")
        return result(True, evidence)
    raise ValueError(f"{target} cannot be demonstrated by the {p['branch']} projection branch")


def folding(spec, target):
    from geometry import SLOTS, fold, neg, poses
    from answer import inspect
    geom = spec["geometry"]
    repair = "Keep the net and change a visible face assignment or an asymmetric local turn, then re-fold every option."
    if target == "opposite-face":
        if spec["parameters"]["mode"] != "opposite":
            raise ValueError("The opposite-face goal requires a net and named face in the question.")
        cells, asked = geom["net"], geom["askedColor"]
        frames = fold(cells)
        normals = {c["mark"]: frames[tuple(c["xy"])][2] for c in cells}
        opposite = next(k for k, n in normals.items() if n == neg(normals[asked]))
        answers = [o["text"].lower() for o in spec["options"]]
        fallback = "all three other options are incorrect"
        matches = labels([text == opposite or (text == fallback and opposite not in answers) for text in answers])
        evidence = {"asked": asked, "opposite": opposite, "foldedNormals": normals, "fullMatches": matches}
        if matches != [LABELS[spec["answerIndex"]]]:
            return result(False, evidence, f"The folded normal of {asked} points away from {opposite}; {matches} name "
                          "that face or satisfy the fallback. Preserve the net and give it one distinct answer.")
        return result(True, evidence)
    if target not in ("face-orientation", "visible-corner") or spec["parameters"]["mode"] == "opposite":
        raise ValueError(f"Choose a compatible view or net family to demonstrate {target}")
    unfold = spec["taskType"] == "CubeUnfolding"
    pairs = [(net, geom["view"]) for net in geom["options"]] if unfold else [(geom["net"], view) for view in geom["options"]]
    positive = spec["parameters"]["mode"] != "cannot"
    full, no_direction, witnesses = [], [], {}
    for label, (net, view) in zip(LABELS, pairs):
        fits, reason = inspect(net, view)
        marks = [v[0] for v in view]
        named = any([pose[k][0] for k in SLOTS] == marks for pose in poses(net))
        full.append(fits)
        no_direction.append(named)
        witnesses[label] = reason
    def offered(relations):
        selected = labels([r == positive for r in relations])
        if not unfold and len(relations) == 3 and not selected:
            selected.append("D")
        return selected
    matches = offered(full)
    weakened = offered(no_direction)
    evidence = {"fullMatches": matches, "ignoringFaceTurns": weakened, "foldedCornerWitnesses": witnesses}
    failed = key_error(spec, matches, evidence)
    if failed:
        return failed
    if target == "face-orientation" and weakened == matches:
        return result(False, evidence, f"Reading face names and order alone yields {matches}; the printed turns "
                      "do not distinguish a choice. " + repair)
    return result(True, evidence)


def main():
    data = json.load(sys.stdin)
    spec, target = data["spec"], data["target"]
    domains = {"2d-rotation": ("official-rotation", rotation2), "3d-rotation": ("official-rotation", rotation3),
               "3ViewProjection": ("official-projection", projection), "CubeReconstruction": ("official-folding", folding),
               "CubeUnfolding": ("official-folding", folding)}
    directory, verify = domains[spec["taskType"]]
    sys.path.insert(0, str(DOMAIN / directory))
    return verify(spec, target)


if __name__ == "__main__":
    try:
        outcome = main()
    except (ValueError, KeyError, TypeError, IndexError, StopIteration, AssertionError) as error:
        outcome = result(False, {}, f"Cannot establish this target from the delivered geometry or choices: {error}. "
                         "Restore the visible options and the matching net, view or grid, then run its domain verifier.")
    print(json.dumps(outcome, allow_nan=False))
