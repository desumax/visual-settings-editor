#!/usr/bin/env python3
"""Regression check: Morphe Manager shows each test release as its own changelog entry.

Max saw every release grouped under one entry (test 12 holding tests 9 to 11). Manager drops any
version with a "-" (read as a prerelease) from a stable source's changelog, then falls back to the
feed's description as a single entry. So: every CHANGELOG.md heading parses the way Manager's
ChangelogParser reads it, with a version that has no "-", newest first, and the feed's description
holds one release only.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# Manager's ChangelogParser.VERSION_HEADING
HEADING = re.compile(r"^#{1,3}\s+(?:\S+\s+)?(?:\[([^]]+)]\([^)]*\)|([^\s\[(]+))\s+\((\d{4}-\d{2}-\d{2})\)", re.I)

errors = []
versions = []
for line in (ROOT / "CHANGELOG.md").read_text(encoding="utf-8").splitlines():
    m = HEADING.match(line)
    if m:
        versions.append((m.group(1) or m.group(2)).strip())
if not versions:
    errors.append("CHANGELOG.md has no release heading Manager can read")
for v in versions:
    if "-" in v:
        errors.append(f"{v}: Manager hides versions with '-' from a stable source's changelog")
nums = [tuple(map(int, re.findall(r"\d+", v))) for v in versions]
if nums != sorted(nums, reverse=True):
    errors.append(f"releases are not newest first: {versions}")

feed = json.loads((ROOT / "patches-bundle.json").read_text(encoding="utf-8"))
desc = feed.get("description", "")
if len(re.findall(r"^### ", desc, re.M)) > 1:
    errors.append("the feed description holds several releases; Manager shows it as one entry")

for e in errors:
    print("FAIL:", e)
print("changelog check:", "failed" if errors else f"ok ({len(versions)} releases)")
sys.exit(1 if errors else 0)
