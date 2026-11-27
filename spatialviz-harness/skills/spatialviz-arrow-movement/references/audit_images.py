"""Re-audit released ArrowMoving PNGs directly. Run from the library root."""
import argparse
import hashlib
import itertools
import json
import re
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

PALETTE = {"red": (255, 0, 0), "green": (0, 128, 0), "blue": (0, 0, 255),
           "purple": (128, 0, 128), "yellow": (255, 255, 0), "pink": (255, 192, 203)}
COMPASS = "NESW"
VECTORS = [(0, 1), (1, 0), (0, -1), (-1, 0)]
TURN = {"Forward": 0, "Right": 1, "Backward": 2, "Left": 3}
LABEL = "ABCD"
TOKENS = re.compile(r"\((?:\((\d+),\s*(\d+)\)\s*)?(Forward|Backward|Left|Right),\s*(\d+) units?\)")


def panels(image):
    # All 80 images share two print geometries. Coordinates below are the measured
    # outer spines. Check for the actual black spines before sampling cell ink.
    simple = image.size == (762, 790)
    count = {(762, 790): 1, (1794, 1050): 2, (4290, 1050): 5}[image.size]
    first_x, first_y, side, pitch = (29, 32, 724, 0) if simple else (148, 192, 705, 832)
    pixels = np.asarray(image.convert("RGB"))
    out = []
    for i in range(count):
        x0 = first_x + i * pitch
        assert (pixels[first_y + 1:first_y + side, x0] == 0).all(axis=1).sum() > side * .95
        board = {}
        for x, y in itertools.product(range(3), repeat=2):
            left = x0 + round(x * side / 3)
            top = first_y + round((2-y) * side / 3)
            region = pixels[top:top+round(side/3), left:left+round(side/3)]
            for color, rgb in PALETTE.items():
                ys, xs = np.where(np.all(region == rgb, axis=2))
                if not xs.size:
                    continue
                # Offset toward the triangular head remains measurable when the
                # green endpoint covers part of the red arrow on a return.
                dx, dy = xs.mean() - side / 6, side / 6 - ys.mean()
                assert max(abs(dx),abs(dy)) > 9 and min(abs(dx),abs(dy)) < 3
                facing = ("E" if dx > 0 else "W") if abs(dx)>abs(dy) else ("N" if dy>0 else "S")
                board[(x, y, color)] = facing
        out.append(board)
    return out


def printable(board):
    return " / ".join(f"{color} {facing}@({x},{y})" for (x,y),(color,facing) in sorted(board.items()))


def differences(expected, actual):
    changed = []
    for p in sorted(expected.keys() | actual.keys()):
        if expected.get(p) != actual.get(p):
            describe = lambda v: "empty" if v is None else " ".join(v)
            changed.append(f"{p} has {describe(actual.get(p))}, needs {describe(expected.get(p))}")
    return changed


def replay(initial, path):
    moves = TOKENS.findall(path)
    if not moves or "--".join(m.group() for m in TOKENS.finditer(path)) != path:
        raise ValueError(path)
    state = dict(initial)
    trail = []
    swaps = 0
    for x,y,turn,length in moves:
        p = (int(x),int(y)) if x else next(iter(state))
        if p not in state:
            return None,trail+[f"No arrow at {p}."],swaps
        color,facing = state[p]
        index = (COMPASS.index(facing)+TURN[turn])%4
        dx,dy = VECTORS[index]
        target = (p[0]+dx*int(length),p[1]+dy*int(length))
        if any(v not in range(3) for v in target):
            return None,trail+[f"The {color} arrow would leave the board at {target}."],swaps
        displaced = state.pop(target,None)
        del state[p]
        state[target] = (color,COMPASS[index])
        move = f"{color} {facing} at {p} moves {turn.lower()} {length} to {target}, facing {COMPASS[index]}."
        if displaced:
            opposite = COMPASS[(index+2)%4]
            state[p] = (displaced[0],opposite)
            move += f" {displaced[0]} returns to {p}, facing {opposite}."
            swaps += 1
        trail.append(move)
    return state,trail,swaps


def score(expected, observed):
    if len(expected) == len(observed) == 1:
        a, b = next(iter(expected)), next(iter(observed))
        return (abs(a[0]-b[0])+abs(a[1]-b[1]), expected[a]!=observed[b])
    return (len(differences(expected,observed)), len(expected.keys() ^ observed.keys()))


def read_case(row, root):
    file = root / row["image"] if root else Path(__file__).parent / "originals" / row["level"] / (row["sourceId"].split("/")[-1]+".png")
    assert hashlib.sha256(file.read_bytes()).hexdigest() == Path(row["image"]).stem
    with Image.open(file) as im:
        raw = panels(im)
        leaked_labels = []
        if len(raw) == 5:
            # Matched against the inspected "Path 1 End State" inset on the
            # original C panel of Level1/0-3-3-2. Ignore these pixels in replay.
            for j,label in enumerate(LABEL,1):
                inset = im.crop((148+j*832,168,853+j*832,187)).convert("L")
                digest = hashlib.sha256(inset.tobytes()).hexdigest()
                if digest.startswith("5a95539c36dc906e"):
                    leaked_labels.append(label)
    stem = row["question"]
    if len(raw) == 1:
        red,green = {},{}
        for (x,y,col),face in raw[0].items():
            assert col in ("red","green")
            (red if col=="red" else green)[(x,y)] = ("arrow", face)
        boards = [red,green]
    else:
        boards = [{(x,y):(c,f) for (x,y,c),f in b.items()} for b in raw]
    choose_state = len(raw) == 5
    paths = [re.search(r"transformations '(.+?)'",stem)[1]] if choose_state else row["options"]
    replays = [replay(boards[0],p) for p in paths]
    target = replays[0][0] if choose_state else boards[1]
    assert target is not None
    options = boards[1:] if choose_state else [v[0] for v in replays]
    validations = []
    for j,outcome in enumerate(options):
        diffs = differences(target,outcome) if outcome is not None else [replays[j][1][-1]]
        validations.append(dict(label=LABEL[j], matches=not diffs, discrepancies=diffs,
                                resultingBoard=printable(outcome) if outcome is not None else None))
    wins = [j for j,v in enumerate(validations) if v["matches"]]
    rank = sorted((score(target,options[j]),j) for j,v in enumerate(validations)
                  if not v["matches"] and options[j] is not None)
    if not rank: rank=[(1,j) for j,v in enumerate(validations) if not v["matches"]]
    rival = validations[rank[0][1]]
    duplicates = [LABEL[i]+LABEL[j] for i,j in itertools.combinations(range(4),2) if options[i]==options[j] and options[i] is not None]
    text_dupes = [LABEL[i]+LABEL[j] for i,j in itertools.combinations(range(4),2) if row["options"][i]==row["options"][j]]
    notes = []
    if leaked_labels:
        assert leaked_labels == [row["answer"]]
        notes.append("Inset plot titles disclose the designated Path 1 end panel among Alternative Path panels.")
    if duplicates:
        notes.append(("Visually equivalent option boards: " if choose_state else "Different labels produce the same endpoint board: ")+", ".join(duplicates)+".")
    if text_dupes: notes.append("Repeated option text: "+", ".join(text_dupes)+".")
    if wins != [LABEL.index(row["answer"])]:
        notes.append("Visible matching labels differ from the released single key.")
    if len(raw)==1 and boards[0].keys()==target.keys():
        notes.append("Coincident arrows: green partially covers red. The exposed red tip gives the initial heading.")
    bad_group = re.search(r"Option ([A-D]+) is incorrect", row["explanation"])
    if bad_group and row["answer"] in bad_group[1]:
        notes.append(f"Released explanation calls {bad_group[1]} incorrect, including keyed {row['answer']}.")
    if len(raw)==1:
        key = "single-return" if boards[0].keys()==target.keys() else "single-travel"
    else:
        key = ("state-" if choose_state else "path-") + ("swap" if replays[0 if choose_state else wins[0]][2] else "empty")
    k=0 if choose_state else (wins[0] if wins else LABEL.index(row["answer"]))
    return dict(sourceId=row["sourceId"],image=row["image"],sha256=hashlib.sha256(file.read_bytes()).hexdigest(),
                rowKey=key,level=row["level"],format=["red-green-path","boards-path","boards-state"][{1:0,2:1,5:2}[len(raw)]],
                initial=printable(boards[0]),displayedTarget=None if choose_state else printable(target),
                printedPath=paths[0] if choose_state else None,
                stem=stem,optionText=row["options"],releasedExplanation=row["explanation"],endpoint=printable(target),releasedKey=row["answer"],
                visibleMatches=[LABEL[i] for i in wins],optionChecks=validations,
                changedCells=[f"{pos}: {' '.join(boards[0].get(pos,('empty',)))} to {' '.join(target.get(pos,('empty',)))}"
                              for pos in sorted(boards[0].keys() | target.keys()) if boards[0].get(pos)!=target.get(pos)],
                disclosedByInset=leaked_labels,
                visibleInference=replays[k][1],swaps=replays[k][2],
                closestDistractor=f"{rival['label']}: {rival['discrepancies'][0]}.",
                observations=notes,optionsEquivalentAtEndpoint=duplicates,optionsIdenticalInText=text_dupes)


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",type=Path)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    q=args.root/"questions" if args.root else None
    catalog=q/"data/spatialviz.json" if q else Path(__file__).parent/"official.json"
    rows=[r for r in json.loads(catalog.read_bytes())
          if r["sourceId"].startswith("MentalAnimation/ArrowMoving/")]
    cases=[read_case(r,q) for r in rows]
    args.out.write_text(json.dumps(cases,indent=2)+"\n",encoding="utf8")
    print("Decoded",len(cases),"images.",dict(Counter(x["format"] for x in cases)))


if __name__ == "__main__":
    main()
