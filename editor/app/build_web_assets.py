#!/usr/bin/env python3
"""Packs the designed editor into the extension: builds the in-app copy of the web preview
(build_app_web.py) and turns it into WebAssets.java (gen_web_assets.py).

Run by the extension's Gradle build (generateWebAssets); it can also be run by hand.

Usage: build_web_assets.py <java_source_dir>
"""
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PACKAGE = "app/morphe/extension/youtube/visualeditor"

out_dir = Path(sys.argv[1]).resolve()
target = out_dir / PACKAGE / "WebAssets.java"
target.parent.mkdir(parents=True, exist_ok=True)

with tempfile.TemporaryDirectory(prefix="visual-editor-web-") as tmp:
    appweb = Path(tmp) / "appweb"
    subprocess.run([sys.executable, str(HERE / "build_app_web.py"), str(appweb)], check=True)
    subprocess.run([sys.executable, str(HERE / "gen_web_assets.py"), str(appweb), str(target)], check=True)
print(f"WebAssets.java written ({target.stat().st_size} bytes)")
