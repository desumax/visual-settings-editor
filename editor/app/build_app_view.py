#!/usr/bin/env python3
"""Builds the "App view" of the live preview: the exact page the in-app editor loads (web/ plus the
app layer from build_app_web.py), shown inside a phone frame, with a stand-in for the app's bridge.

Usage: build_app_view.py <out_dir>
The output holds appview.html (the frame) and app/ (the in-app page). Publish both next to the
live preview's index.html, so the preview's "App view" button can open it.
"""
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import outdir  # noqa: E402

out = outdir.fresh(Path(sys.argv[1]).resolve())
app = out / "app"
subprocess.run([sys.executable, str(HERE / "build_app_web.py"), str(app)], check=True)

# Stand-in for window.MorpheApp: no live values (the preview's defaults are used), changes stay in
# the page, and leaving or restarting tells the frame, which shows what the app would do.
STUB = """<script>
window.MorpheApp = {
  preview: true, // no live values here: the page keeps the preview's catalogue and defaults
  state: () => JSON.stringify({ values: {}, version: "" }),
  set: () => {}, ready: () => setTimeout(() => window.morpheEnter && window.morpheEnter(), 0), vibrate: ms => { try { navigator.vibrate && Navigator.prototype.vibrate.call(navigator, ms); } catch (e) {} },
  close: () => parent.postMessage({ appview: "close" }, "*"),
  restart: () => parent.postMessage({ appview: "restart" }, "*"),
  disableEditor: () => parent.postMessage({ appview: "disable" }, "*"),
  // changes waiting for a restart, kept across "Open the editor again" like the app keeps them
  pending: () => { try { return localStorage.getItem("appview-pending") || "{}"; } catch (e) { return "{}"; } },
  savePending: json => { try { const o = Object.assign(JSON.parse(json), JSON.parse(localStorage.getItem("appview-pending") || "{}")); localStorage.setItem("appview-pending", JSON.stringify(o)); } catch (e) {} },
  resetPending: () => { try { localStorage.removeItem("appview-pending"); } catch (e) {} },
};
(() => { const r = window.MorpheApp.restart; window.MorpheApp.restart = () => { window.MorpheApp.resetPending(); r(); }; })();
</script>
"""
page = (app / "index.html").read_text(encoding="utf-8")
page = page.replace('<script src="js/app-pre.js"></script>', STUB + '<script src="js/app-pre.js"></script>', 1)
assert "window.MorpheApp" in page
(app / "index.html").write_text(page, encoding="utf-8")
shutil.copy2(HERE / "appview.html", out / "appview.html")
print("app view built in", out)
