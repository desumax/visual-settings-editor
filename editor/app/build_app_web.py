#!/usr/bin/env python3
"""Builds the in-app copy of the web preview: web/ plus the app-mode scripts.

Usage: build_app_web.py <out_dir>
The output is what the editor's WebView loads (see app/gen_web_assets.py).
"""
import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WEB = HERE.parent / "web"
sys.path.insert(0, str(HERE))
import outdir  # noqa: E402

out = outdir.fresh(Path(sys.argv[1]))
(out / "js").mkdir(parents=True)

html = (WEB / "index.html").read_text(encoding="utf-8")
# No network inside YouTube: Roboto is the system font on Android.
html = re.sub(r'<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*', "", html)
# The page's style files (web/css), inlined in their order: the app opens on one file, as before
# the styles were split, with no extra requests before the first frame.
def inline_css(m):
    return "<style>\n" + (WEB / m.group(1)).read_text(encoding="utf-8") + "</style>"
html = re.sub(r'<link rel="stylesheet" href="(css/[a-z0-9-]+\.css)">', inline_css, html)
assert 'href="css/' not in html, "a style file was not inlined"
# After the page's own styles, so the in-app rules win.
html = html.replace('<script src="js/core.js"></script>', '<link rel="stylesheet" href="app.css">\n<script src="js/core.js"></script>', 1)
if not html.lstrip().lower().startswith("<!doctype"):
    html = '<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + html
html = html.replace('<script src="js/boot.js"></script>',
                    '<script src="js/app-pre.js"></script>\n<script src="js/boot.js"></script>\n<script src="js/app-post.js"></script>', 1)
assert "js/app-pre.js" in html, "boot.js script tag not found"
(out / "index.html").write_text(html, encoding="utf-8")
for f in (WEB / "js").glob("*.js"):
    shutil.copy2(f, out / "js" / f.name)
shutil.copy2(HERE / "app-pre.js", out / "js" / "app-pre.js")
shutil.copy2(HERE / "app-post.js", out / "js" / "app-post.js")
shutil.copy2(HERE / "app.css", out / "app.css")
cat = json.loads((WEB / "catalogue.json").read_text(encoding="utf-8"))
(out / "catalogue.json").write_text(json.dumps(cat, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
print("in-app web built in", out)
