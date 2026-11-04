"""Start or reuse the loopback viewer; never change client/model configuration."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

root = Path(sys.argv[1]).resolve()
state_file = root / "viewer.json"

def healthy(url):
    try:
        with urllib.request.urlopen(url + "/api/health", timeout=1) as response:
            return json.load(response).get("application") == "spatial-harness-observatory"
    except Exception:
        return False

lock = root / ".viewer-start-lock"
for attempt in range(50):
    try:
        lock.mkdir()
        break
    except FileExistsError:
        time.sleep(0.1)
else:
    raise RuntimeError("Viewer startup is locked; inspect the existing process.")

try:
    previous = json.loads(state_file.read_text(encoding="utf-8")) if state_file.exists() else {}
    if previous.get("url") and healthy(previous["url"]):
        print(previous["url"])
    else:
        with (root / "viewer.stdout.log").open("w") as stdout, (root / "viewer.stderr.log").open("w") as stderr:
            child = subprocess.Popen(
                [sys.argv[2], str(Path(__file__).with_name("viewer.cjs")), str(root)],
                stdin=subprocess.DEVNULL, stdout=stdout, stderr=stderr,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                start_new_session=os.name != "nt",
            )
        for attempt in range(50):
            if child.poll() is not None:
                raise RuntimeError("Viewer process exited; inspect its local stderr log.")
            try:
                current = json.loads(state_file.read_text(encoding="utf-8"))
                if current.get("pid") == child.pid and healthy(current["url"]):
                    print(current["url"])
                    break
            except (OSError, ValueError):
                pass
            time.sleep(0.1)
        else:
            raise RuntimeError("Viewer could not be reached; local networking may require permission.")
finally:
    lock.rmdir()
