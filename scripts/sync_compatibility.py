#!/usr/bin/env python3
"""Copies the YouTube compatibility (app identity, supported versions, minimum Android) of a
Morphe Patches release into patches/.../youtube/shared/Constants.kt, so the editor declares exactly
what the official patches support.

Usage: sync_compatibility.py [--tag v2.3.0]   (default: the latest Morphe Patches release)
Needs the GitHub CLI (gh), signed in.
"""
import argparse
import base64
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "patches/src/main/kotlin/app/morphe/patches/youtube/shared/Constants.kt"
UPSTREAM = "MorpheApp/morphe-patches"
PATH = "patches/src/main/kotlin/app/morphe/patches/youtube/shared/Constants.kt"


def gh(*args):
    return subprocess.run(["gh", "api", *args], check=True, capture_output=True, text=True).stdout


ap = argparse.ArgumentParser()
ap.add_argument("--tag")
tag = ap.parse_args().tag or json.loads(gh(f"repos/{UPSTREAM}/releases/latest"))["tag_name"]
upstream = base64.b64decode(json.loads(gh(f"repos/{UPSTREAM}/contents/{PATH}?ref={tag}"))["content"]).decode("utf-8")

text = TARGET.read_text(encoding="utf-8")
header = text[:text.index("package ")]
header = re.sub(r"at release \S+\.", f"at release {tag}.", header)
TARGET.write_text(header + upstream, encoding="utf-8", newline="\n")
print(f"Constants.kt now matches Morphe Patches {tag}")
