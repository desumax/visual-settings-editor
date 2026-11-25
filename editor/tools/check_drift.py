#!/usr/bin/env python3
"""Compare the web editor's preview hints with a Morphe release.

Usage: check_drift.py <catalogue.json>

Make the catalogue from the release first: extract_catalogue.py <morphe-patches checkout> <catalogue.json>.
The web editor names settings in its scenes, animations and placement rules (web/js/*.js). This
prints every setting it names that the release no longer has (renamed or removed upstream), and
every name prefix ("morphe_swipe_") that no longer matches any setting, and every list value it
compares against ("MODERN_4") that no list of the release offers any more. For a renamed setting it
names the new key (Morphe keeps the old one as a DEPRECATED_ field; the catalogue records the pairs).
None of this breaks the editor: a hint for a missing setting is never drawn, a value without a story
is shown plainly, and settings without hints are plain rows.
The report only says which hints to update. Exits with 1 when something is out of date, so it can
run in CI after each upstream release.
"""
import json
import re
import sys
from pathlib import Path

WEB_JS = Path(__file__).resolve().parent.parent / "web" / "js"

cat = json.load(open(sys.argv[1], encoding="utf-8"))
keys = {p["key"] for p in cat["preferences"]}
# Rows the editor adds itself (boot.js): SponsorBlock's segment categories, built by Morphe in code.
scen = (WEB_JS / "scenarios.js").read_text(encoding="utf-8")
m = re.search(r"const SB_CATS = (\[.*?\]);", scen)
keys |= {"morphe_sb_" + c[0] for c in json.loads(m.group(1))} if m else set()

named, prefixes = {}, {}
for f in sorted(WEB_JS.glob("*.js")):
    for hit in re.finditer(r"""["'`](morphe_[a-z0-9_]+)["'`]""", f.read_text(encoding="utf-8")):
        k = hit.group(1)
        (prefixes if k.endswith("_") else named).setdefault(k, set()).add(f.name)

# List values the hints compare against: every one must still be a value of some list in the release
# (Morphe renames them: LIVESTREAMS_... became LIVE_STREAMS_..., the client types changed five times).
values = set(cat.get("screens") or {}) | {p.get("screen") for p in cat["preferences"]} | {p.get("subScreen") for p in cat["preferences"]}
for p in cat["preferences"]:
    for e in (p.get("entries") or []) + [e for v in (p.get("entryVariants") or []) for e in v["entries"]]:
        values.add(str(e["value"]))
    if isinstance(p.get("default"), str): values.add(p["default"])
NOT_VALUES = {"HDR", "SDR", "FHD", "SELECT"} # words drawn in the preview, not list values
literals = {}
for f in sorted(WEB_JS.glob("*.js")):
    if f.name == "iconstyles.js": continue
    for hit in re.finditer(r"""["'`]([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*)["'`]""", f.read_text(encoding="utf-8")):
        if len(hit.group(1)) > 2: literals.setdefault(hit.group(1), set()).add(f.name)
stale = sorted(v for v in literals if v not in values and v not in NOT_VALUES)

renames = cat.get("renames") or {}
def now_called(k):
    seen = set()
    while k in renames and k not in seen: seen.add(k); k = renames[k]
    return k

gone = sorted(k for k in named if k not in keys)
dead = sorted(p for p in prefixes if not any(k.startswith(p) for k in keys))
print(f"{len(keys)} settings in the release, {len(named)} named by the web editor, {len(prefixes)} name prefixes, {len(literals)} list values")
print(f"\nNamed by the editor but gone upstream ({len(gone)}):")
for k in gone:
    new = now_called(k)
    print("  -", k, "(" + ", ".join(sorted(named[k])) + ")" + (f"  now {new}" if new != k and new in keys else ""))
print(f"\nName prefixes that match nothing ({len(dead)}):")
for p in dead:
    print("  -", p + "*", "(" + ", ".join(sorted(prefixes[p])) + ")")
print(f"\nList values the hints compare against that no list has ({len(stale)}):")
for v in stale:
    print("  -", v, "(" + ", ".join(sorted(literals[v])) + ")")
sys.exit(1 if gone or dead or stale else 0)
