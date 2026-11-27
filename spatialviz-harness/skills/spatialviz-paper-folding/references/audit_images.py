"""Decode the released Paper Folding PNGs with Pillow, NumPy and OpenCV.

Run from this directory (or pass --references). Use 'decode --output blind.json'
to freeze image-only predictions, then 'compare --blind blind.json --output
observations.json' to add the released answer and summaries. All geometry is in
the fixed coordinates of the original sheet, increasing down and right.
"""
import argparse
from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

LETTERS = "ABCD"


def digest(raw):
    return sha256(raw).hexdigest()


def serialized(data):
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def edge(p, q):
    return tuple(sorted((p, q)))


def segment(p, q):
    dr, dc = q[0] - p[0], q[1] - p[1]
    length = max(abs(dr), abs(dc))
    step = (int(np.sign(dr)), int(np.sign(dc)))
    return {edge((p[0] + i * step[0], p[1] + i * step[1]),
                 (p[0] + (i + 1) * step[0], p[1] + (i + 1) * step[1]))
            for i in range(length)}


def rectangle(bounds):
    t, l, b, r = bounds
    return (segment((t, l), (t, r)) | segment((b, l), (b, r))
            | segment((t, l), (b, l)) | segment((t, r), (b, r)))


def straight_candidates(bounds):
    for dimension, name in enumerate(("horizontal", "vertical")):
        lo, hi = bounds[dimension], bounds[dimension + 2]
        for axis in range(lo + 1, hi):
            for sign in (-1, 1):
                # The visible sheet is confined to its starting outline.
                width = axis - lo if sign == -1 else hi - axis
                if width > (hi - lo) / 2:
                    continue
                retained = list(bounds)
                retained[dimension if sign == -1 else dimension + 2] = axis
                flap = retained.copy()
                flap[dimension + 2 if sign == -1 else dimension] = axis - sign * width
                fold = {"axis": name, "line": axis, "movingSide":
                        (("top", "bottom") if dimension == 0 else ("left", "right"))[sign == 1]}
                yield fold, tuple(retained), rectangle(retained) | rectangle(flap)


def diagonal_candidates(bounds):
    t, l, b, r = bounds
    for corner, dr, dc in [((t, l), 1, 1), ((t, r), 1, -1),
                           ((b, l), -1, 1), ((b, r), -1, -1)]:
        for width in range(2, min(b - t, r - l) + 1):
            p = (corner[0] + dr * width, corner[1])
            q = (corner[0], corner[1] + dc * width)
            opposite = (p[0], q[1])
            edges = rectangle(bounds) - segment(corner, p) - segment(corner, q)
            edges |= segment(p, q) | segment(p, opposite) | segment(q, opposite)
            yield {"axis": "diagonal", "endpoints": [p, q], "movingCorner": corner}, bounds, edges


def groups(points, max_gap):
    return [(int(run[0]), int(run[-1]))
            for run in np.split(points, np.flatnonzero(np.diff(points) > max_gap) + 1)
            if len(run)]


def get_panels(im):
    # The lower half contains four thin, closed, black square frames. The gray
    # grid adjacent to their top edge exposes the cell spacing even on blank rows.
    cutoff = im.shape[0] // 2
    foreground = (im[cutoff:].max(axis=2) < 32).astype(np.uint8)
    stats = cv2.connectedComponentsWithStats(foreground)[2][1:]
    frames = sorted((int(x), int(y) + cutoff, int(w - 1)) for x, y, w, h, _ in stats
                    if w == h and w > 200)
    if len(frames) != 4:
        raise ValueError(f"Expected four printed option frames, found {frames}")
    x, y, side = frames[0]
    ticks = groups(np.flatnonzero(im[y + 5, x:x + side + 1, 0] < 246), 2)
    n = len(ticks) - 1
    centers = np.array([(a + b) / 2 for a, b in ticks])
    if n < 2 or max(abs(centers - np.linspace(0, side, n + 1))) > 2:
        raise ValueError(f"Uneven grid ticks: {ticks}")
    top = im[:cutoff]
    blue = (top[:, :, 2] > 210) & (top[:, :, 0] < 210) & (top[:, :, 1] < 210)
    ys, xs = np.where(blue)
    top_y = int(ys.min())
    columns = groups(np.unique(xs), 15)
    if len(columns) not in (3, 4) or int(ys.max()) - top_y != side - 1:
        raise ValueError("Unrecognized operation row bounds")
    if any(abs(right - left - side) > 2 for left, right in columns):
        raise ValueError("Unexpected operation panel width")
    return n, frames, [(x, top_y, side - 1) for x, _ in columns]


def read_edges(im, panel, n):
    left, top, side = panel
    block = im[top:top + side + 1, left:left + side + 1]
    # Gray grid lines and pastel dashes fall outside the saturated blue mask.
    blue = (block[:, :, 0] < 90) & (block[:, :, 1] < 90) & (block[:, :, 2] > 205)
    observed = set()
    for r in range(n + 1):
        for c in range(n + 1):
            for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
                if not (0 <= r + dr <= n and 0 <= c + dc <= n):
                    continue
                for fraction in (.23, .48, .77):
                    y = round((r + dr * fraction) * side / n)
                    x = round((c + dc * fraction) * side / n)
                    if not blue[max(0, y-2):y+3, max(0, x-2):x+3].any():
                        break
                else:
                    observed.add(edge((r, c), (r + dr, c + dc)))
    return observed


def read_marks(im, panel, n, punch=False):
    left, top, side = panel
    image = im[top:top + side + 1, left:left + side + 1]
    if punch:
        mask = (image[:, :, 0] > 205) & (image[:, :, 1] < 100) & (image[:, :, 2] < 100)
    else:
        mask = image.max(axis=2) < 40
    found = set()
    for r in range(n):
        for c in range(n):
            x, y = (c + .5) * side / n, (r + .5) * side / n
            radius = (.29 if punch else .14) * side / n
            window = mask[round(y-radius):round(y+radius)+1, round(x-radius):round(x+radius)+1]
            if (punch and window.sum() > 15) or (not punch and window.mean() > .85):
                found.add((r, c))
    return found


def transport(cell, fold):
    r, c = cell
    if fold["axis"] == "diagonal":
        (r1, c1), (r2, c2) = fold["endpoints"]
        # Integer vertex coordinates describe the line. Evaluate cell centers
        # with doubled coordinates so a crease through a center is exact.
        slope = (c2 - c1) // (r2 - r1)
        intercept = c1 - slope * r1
        cr, cc = fold["movingCorner"]
        delta = 2*c + 1 - slope*(2*r + 1) - 2*intercept
        if delta * (cc - slope*cr - intercept) > 0:
            return (slope*(2*c + 1 - 2*intercept) - 1)//2, (slope*(2*r + 1) + 2*intercept - 1)//2
        return cell
    axis = fold["line"]
    d = 0 if fold["axis"] == "horizontal" else 1
    near = fold["movingSide"] in ("left", "top")
    if (cell[d] < axis) == near:
        reflected = 2*axis - 1 - cell[d]
        return (reflected, c) if d == 0 else (r, reflected)
    return cell


def signature(holes):
    return [list(site) for site in sorted(holes)]


def predict(im):
    n, frames, panels = get_panels(im)
    choices = {k: read_marks(im, panel, n) for k, panel in zip(LETTERS, frames)}
    punches = read_marks(im, panels[-1], n, punch=True)
    drawn = [read_edges(im, panel, n) for panel in panels]
    if drawn[-1] != drawn[-2] or not punches:
        raise ValueError("Punch panel does not repeat the final fold or has no punches")
    histories = [((0, 0, n, n), [])]
    for i, observed in enumerate(drawn[:-1]):
        candidates = diagonal_candidates if i == len(panels)-2 else straight_candidates
        new_histories = []
        distances = []
        for bounds, history in histories:
            for fold, new_bounds, template in candidates(bounds):
                distances.append(len(template ^ observed))
                if template == observed:
                    new_histories.append((new_bounds, history + [fold]))
        if not new_histories:
            raise ValueError(f"Operation {i+1}: no exact template; best edge distance {min(distances,default=None)}")
        histories = new_histories
    possibilities = []
    for _, history in histories:
        preimages = {pt: [] for pt in punches}
        for r in range(n):
            for c in range(n):
                pos = (r, c)
                for fold in history:
                    pos = transport(pos, fold)
                if pos in punches:
                    preimages[pos].append((r, c))
        if not all(preimages.values()):
            continue
        holes = {hole for layer in preimages.values() for hole in layer}
        possibilities.append({"folds": history,
                              "layersPerPunch": [len(preimages[k]) for k in sorted(punches)],
                              "unfoldedHoles": signature(holes),
                              "matchingLabels": [k for k in LETTERS if holes == choices[k]]})
    return {"grid": n, "observedSolidEdgeCounts": [len(edges) for edges in drawn[:-1]],
            "punches": signature(punches), "readOptions": {k: signature(v) for k, v in choices.items()},
            "exactFoldHistories": possibilities,
            "predictedLabels": sorted({k for h in possibilities for k in h["matchingLabels"]}),
            "duplicateOptionPairs": [a+b for i,a in enumerate(LETTERS) for b in LETTERS[i+1:]
                                     if choices[a] == choices[b]]}


def solve_image(image, size=None, steps=None):
    """Read a PIL image or file path. Optional size and steps validate the print.

    size denotes the number of cells on each side of the square sheet.
    steps counts crease operations, excluding the final punch panel.
    Raises ValueError for unsupported layouts and inconsistent visual clues.
    """
    if isinstance(image, Image.Image):
        result = predict(np.asarray(image.convert("RGB")))
    else:
        with Image.open(image) as original:
            result = predict(np.asarray(original.convert("RGB")))
    if size is not None and result["grid"] != size:
        raise ValueError(f"Expected sheet size {size}; observed {result['grid']}")
    if steps is not None and len(result["observedSolidEdgeCounts"]) != steps:
        raise ValueError(f"Expected {steps} folds; observed {len(result['observedSolidEdgeCounts'])}")
    return result


def decode(refs):
    # Use the original PNGs alone. File identifiers label records after solving.
    observations = []
    for filename in sorted((refs/"originals").glob("*/*.png"),
                           key=lambda p: (p.parent.name, int(p.stem.split("-")[0]))):
        try:
            result = solve_image(filename)
        except ValueError as err:
            raise ValueError(f"{filename.name}: {err}") from err
        observations.append({"image": filename.relative_to(refs).as_posix(),
                             "pngSha256": digest(filename.read_bytes()), **result})
    return observations


def observation(item):
    labels = item["predictedLabels"]
    h = item["exactFoldHistories"]
    punch_count = len(item["punches"])
    outcomes = sorted({len(s["unfoldedHoles"]) for s in h})
    if len(h) == 1:
        operations = []
        for fold in h[0]["folds"]:
            if fold["axis"] == "diagonal":
                operations.append(f"fold the corner at {tuple(fold['movingCorner'])} across the diagonal "
                                  f"from {tuple(fold['endpoints'][0])} to {tuple(fold['endpoints'][1])}")
            else:
                operations.append(f"fold the {fold['movingSide']} flap across {fold['axis']} line {fold['line']}")
        sites = ", ".join(f"{tuple(p)} ({k} {'layer' if k == 1 else 'layers'})"
                          for p, k in zip(item["punches"], h[0]["layersPerPunch"]))
        return (f"On this {item['grid']} by {item['grid']} sheet, " + ", then ".join(operations)
                + f". The red punch sites are {sites}. Unfolding yields {outcomes[0]} holes. "
                + ("Only option " + labels[0] + " has that pattern." if len(labels) == 1 else
                   "Matching options: " + (", ".join(labels) or "none") + "."))
    return (f"The {item['grid']} by {item['grid']} grid shows {len(item['observedSolidEdgeCounts'])} folds "
            f"and {punch_count} punched site{'s' if punch_count != 1 else ''}. "
            f"Exactly {len(h)} fold {'history matches' if len(h)==1 else 'histories match'} the solid strokes and occupied punch sites. "
            f"The unfolded hole count is {' or '.join(map(str,outcomes))}. "
            + (f"The matching printed {'option is' if len(labels)==1 else 'options are'} {', '.join(labels)}."
               if labels else "No printed option matches the unfolded pattern."))


def compare(refs, blind):
    raw = blind.read_bytes()
    items = json.loads(raw)
    by_path = {entry["packagedImage"]: entry for entry in json.loads((refs/"official.json").read_text(encoding="utf-8"))}
    if len(items) != len(by_path) or set(by_path) != {item["image"] for item in items}:
        raise ValueError("The predictions do not cover the exact manifest")
    stats = Counter()
    duplicates = {field: defaultdict(list) for field in ("originalFile", "rgbPixels", "physicalStem", "stemAndOrderedOptions", "stemAndUnorderedOptions", "unfoldedPattern")}
    for item in items:
        entry = by_path[item["image"]]
        if digest((refs / item["image"]).read_bytes()) != item["pngSha256"]:
            raise ValueError(f"Source bytes changed: {item['image']}")
        key = LETTERS[entry["answerIndex"]]
        labels = item["predictedLabels"]
        histories = item["exactFoldHistories"]
        item.update(sourceId=entry["sourceId"], publishedLabel=key, observation=observation(item))
        item["keyComparison"] = ("unique-match" if labels == [key] else
                                 "ambiguous-includes-key" if key in labels else "disagreement")
        stats[item["keyComparison"]] += 1
        stats["withDuplicateOptions"] += bool(item["duplicateOptionPairs"])
        stats["multipleFoldHistories"] += len(histories) > 1
        duplicates["originalFile"][item["pngSha256"]].append(entry["sourceId"])
        with Image.open(refs / item["image"]) as visible:
            pixel_digest = digest(visible.convert("RGB").tobytes())
        duplicates["rgbPixels"][pixel_digest].append(entry["sourceId"])
        stem = {"grid": item["grid"], "folds": [h["folds"] for h in histories], "punches":item["punches"]}
        duplicates["physicalStem"][digest(serialized(stem))].append(entry["sourceId"])
        for name, options in (("stemAndOrderedOptions", item["readOptions"]),
                              ("stemAndUnorderedOptions", sorted(item["readOptions"].values()))):
            duplicates[name][digest(serialized([stem, options]))].append(entry["sourceId"])
        patterns = {"grid": item["grid"], "patterns":[h["unfoldedHoles"] for h in histories]}
        duplicates["unfoldedPattern"][digest(serialized(patterns))].append(entry["sourceId"])
    return {"description": "Independent pixel decoding of the released operation, punch and option panels.",
            "coordinates": "Zero-based [row,column] from the upper left. Crease endpoints and axial lines use grid vertices. Punches and unfolded holes are cell indices.",
            "decoderSha256": digest(Path(__file__).read_bytes()), "blindFileSha256": digest(raw),
            "blindContentSha256": digest(serialized(json.loads(raw))), "itemsAudited":len(items),
            "summary":dict(stats),
            "duplicateGroups":{name: [group for group in by_key.values() if len(group)>1]
                               for name, by_key in duplicates.items()}, "items":items}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("decode","compare"))
    parser.add_argument("--references", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--blind", type=Path, help="Frozen predictions (compare only)")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    data = decode(args.references) if args.phase == "decode" else compare(args.references, args.blind)
    # Keep the per-item evidence diffable without one line per coordinate.
    if args.phase == "compare":
        common = dict(data)
        records = common.pop("items")
        prefix = json.dumps(common,ensure_ascii=False,indent=2)[:-2]
        payload = prefix + ',\n  "items": [\n    ' + ",\n    ".join(json.dumps(r,ensure_ascii=False) for r in records) + "\n  ]\n}\n"
    else:
        payload = json.dumps(data,ensure_ascii=False,indent=2) + "\n"
    args.output.write_bytes(payload.encode())
    print(json.dumps(data["summary"] if args.phase=="compare" else {"decoded":len(data)}))


if __name__ == "__main__":
    main()