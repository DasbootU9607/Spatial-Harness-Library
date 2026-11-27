"""Evaluate a declared inference using the existing native domain solvers."""
import base64
import io
import json
from pathlib import Path
import sys

from PIL import Image

LIBRARY = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(LIBRARY / "spatialviz-harness/penetration"))
LABELS = "ABCD"


def result(passed, evidence, feedback=""):
    return {"passed": bool(passed), "evidence": evidence, "feedback": feedback}


def winners(flags):
    return [label for label, flag in zip(LABELS, flags) if flag]


def check_key(spec, flags, evidence, correction):
    found = winners(flags)
    key = LABELS[spec["answer"]["index"]]
    if found != [key]:
        options = ", ".join(found) or "none"
        return result(False, evidence, f"Solver choices: {options}; designated answer: {key}. {correction}")


def counting(spec, target):
    from count_native import decode, solve
    sense = spec["geometry"]["sense"]
    png = base64.b64decode(spec["rendering"]["pngBase64"], validate=True)
    with Image.open(io.BytesIO(png)) as image:
        grids = decode(image)
    options = spec["options"]
    flags, _, proof = solve(grids, options, sense)
    evidence = {"sense": sense, "withViews": list(grids), "totals": proof["feasibleTotals"],
                "choices": winners(flags), "heightWitnesses": proof["heightWitnesses"]}
    bad_key = check_key(spec, flags, evidence, "Retain the footprint and inspect the competing row/column peaks or numeric foils.")
    if bad_key:
        return bad_key
    if target == "count-feasibility":
        return result(True, evidence)
    if "Left" not in grids:
        return result(False, evidence, "The PNG contains Front and Top only. Add a Left elevation which separates the proposed stacks.")
    without_left = {name: grid for name, grid in grids.items() if name != "Left"}
    relaxed_flags, _, relaxed = solve(without_left, options, sense)
    evidence.update(withoutLeft=relaxed["feasibleTotals"], choicesWithoutLeft=winners(relaxed_flags))
    extra = set(relaxed["feasibleTotals"]) - set(proof["feasibleTotals"])
    if extra:
        value = min(extra)
        evidence["excludedExample"] = {"total": value, "heights": relaxed["heightWitnesses"][value]}
    if relaxed_flags == flags:
        return result(False, evidence,
                      f"Removing Left still selects {winners(flags)[0]} for the {sense} question. Keep Front/Top; change a row peak or offer a value that the Left view rules out.")
    return result(True, evidence)


def assembly(spec, target):
    from assembly_native import solver
    g, options = spec["geometry"], spec["options"]
    flags, _, proof = solver().solve(g, options)
    missing = len(g["target"]) - sum(map(len, g["given"]))
    placements = proof["optionPlacements"]
    evidence = {"missingVolume": missing, "choices": winners(flags), "placements": placements}
    bad_key = check_key(spec, flags, evidence, "Keep the movement rule; adjust the candidate riser or the unfilled interface, then replay every placement.")
    if bad_key:
        return bad_key
    foils = [LABELS[i] for i, option in enumerate(options[:3])
             if len(option["cells"]) == missing and placements[i]["placementCount"] == 0]
    evidence["equalVolumeFoils"] = foils
    if target == "equal-volume-interface" and not foils:
        sizes = ", ".join(f"{LABELS[i]}={len(o['cells'])}" for i, o in enumerate(options[:3]))
        return result(False, evidence, f"The residual has {missing} cells ({sizes}). Volume eliminates every wrong graphical choice. Preserve its size; move an end cube to a different neighbor.")
    return result(True, evidence)


def sections(spec, target):
    from cross_native import classify
    g = spec["geometry"]
    marked = g["mode"] == "marked"
    if marked != (target != "seam-containment"):
        return result(False, {"mode": g["mode"]}, f"The {g['mode']} plate cannot test {target}. Select the matching question form before rendering.")
    flags, _, certs = classify(spec)
    evidence = {"choices": winners(flags), "planes": certs}
    bad_key = check_key(spec, flags, evidence, "Compare the labeled wire endpoints with a fresh half-space clip of the same tiers.")
    if bad_key:
        return bad_key
    if not marked:
        for i, cert in enumerate(certs):
            if not flags[i] and not cert["matchesIndependentClip"]:
                return result(False, evidence, f"{LABELS[i]} has no matching plane witness. Keep the stack and redraw that attainable option with the witnessed slice.")
        return result(True, evidence)
    if target == "marked-side":
        changed = {"side": "north" if g["side"] == "south" else "south"}
        repair = "Keep the stack; cut a visibly off-center feature and include the opposite shoulder order."
    else:
        changed = {"offset": -2 if g["offset"] == 0 else 0}
        repair = "Keep the stack; place the second cut across a different tier footprint and include its outline."
    control = {**spec, "geometry": {**g, **changed}}
    changed_flags, _, _ = classify(control)
    evidence.update(control=changed, controlChoices=winners(changed_flags))
    if sum(changed_flags) != 1 or changed_flags == flags:
        return result(False, evidence,
                      f"Changing {changed} selects {winners(changed_flags)} instead of one different option from {winners(flags)}. {repair}")
    return result(True, evidence)


def main():
    request = json.load(sys.stdin)
    spec, target = request["spec"], request["target"]
    if spec["taskType"] == "MechanicalSystem":
        folder = LIBRARY / "spatialviz-harness/skills/spatialviz-mechanical-system/scripts"
        sys.path.insert(0, str(folder))
        from cad_plate import read_pixels
        png = base64.b64decode(spec["rendering"]["pngBase64"], validate=True)
        return {"printed": read_pixels(io.BytesIO(png))}
    functions = {"CubeCounting": counting, "CubeAssembly": assembly, "CrossSection": sections}
    return functions[spec["taskType"]](spec, target)


if __name__ == "__main__":
    try:
        print(json.dumps(main(), allow_nan=False))
    except (ValueError, KeyError, IndexError, TypeError) as error:
        print(json.dumps(result(False, {}, f"Cannot read the candidate witness: {error}. Check its final plate, option order and geometry.")))
