"""Rebuild the source-keyed inventory and optional private inspection sheets."""
import argparse
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "spatialviz-harness/skills/spatialviz-3view-projection/references"
QUESTIONS = ROOT / "questions"


def inventory(sheets):
    rows = [x for x in json.loads((QUESTIONS / "data/spatialviz.json").read_text("utf8"))
            if x["type"] == "3ViewProjection"]
    assert len({x["sourceId"] for x in rows}) == 100
    assert Counter(x["level"] for x in rows) == {"Level0-Cubes3View": 50, "Level1-CAD3View": 50}
    REF.mkdir(parents=True, exist_ok=True)
    records = []
    for i, row in enumerate(rows):
        raw = row["original"]
        assert row["sourceId"] == "/".join(raw[k] for k in ["Category", "Task", "Level", "Image_id"])
        assert all(row[k] == raw[j] for k, j in [("question", "Question"), ("options", "Choices"), ("answer", "Answer")])
        explanations = ast.literal_eval(raw["Explanation"])
        assert row["explanation"] == "\n".join(explanations.values())
        assert row["answerIndex"] == "ABCD".index(row["answer"])
        path = QUESTIONS / row["image"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == path.stem
        record = {k: row[k] for k in ["sourceId","original","image","provenance","width","height"]}
        if i in [0, 10, 47, 50, 51, 52, 53, 55, 60, 62, 92, 95, 96]:
            record["packagedOriginal"] = raw["Image_id"] + ".png"
            shutil.copyfile(path, REF / record["packagedOriginal"])
        records.append(record)
        if sheets:
            sheets.mkdir(parents=True, exist_ok=True)
            if i % 10 == 0:
                canvas = Image.new("RGB", (1450, 5 * 244), "white")
            with Image.open(path) as im:
                assert im.size == (row["width"], row["height"])
                im.thumbnail((706, 218))
                x, y = (i % 2) * 725, (i % 10 // 2) * 244
                canvas.paste(im, (x + (720-im.width)//2,y))
                ImageDraw.Draw(canvas).text((x+5,y+219),f"{i:02}   {raw['Image_id']}   answer {raw['Answer']}", fill="black")
            if i % 10 == 9:
                canvas.save(sheets / f"sheet-{i//10}.jpg", quality=92)
    (REF / "inventory.json").write_text(json.dumps(records, indent=2)+"\n","utf8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheets", type=Path)
    inventory(parser.parse_args().sheets)
