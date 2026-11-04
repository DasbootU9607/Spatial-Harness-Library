"""Load byte-preserved upstream files with explicit, bounded local patches."""
from pathlib import Path
import hashlib
import types

ROOT = Path(__file__).resolve().parents[2]
VENDOR = ROOT / 'spatialviz-harness/vendor/SpatialViz-Bench-c27f9111a267'
REVISION = 'c27f9111a2674f2ea03e2ca1f5833326cf1eec1a'


def patched(relative, replacements=()):
    raw = (VENDOR / relative).read_bytes()
    text = raw.decode('utf-8')
    changes = []
    for old, new, reason in replacements:
        count = text.count(old)
        if not count:
            raise RuntimeError('Upstream patch no longer matches: ' + reason)
        text = text.replace(old, new)
        changes.append({'reason': reason, 'occurrences': count})
    return text, {'file': relative, 'originalSha256': hashlib.sha256(raw).hexdigest(),
                  'adaptedSha256': hashlib.sha256(text.encode()).hexdigest(), 'changes': changes}


def load(relative, namespace=None, replacements=(), name=None):
    text, provenance = patched(relative, replacements)
    module = types.ModuleType(name or Path(relative).stem)
    module.__dict__.update(namespace or {})
    module.__file__ = str(VENDOR / relative)
    exec(compile(text, str(VENDOR / relative), 'exec'), module.__dict__)
    return module, provenance
