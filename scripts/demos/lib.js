"use strict";
// Shared helpers for the README media generator: a static server for editor/web, a page opener that
// skips the tutorial and hides dev-only bits, PNG stills and GIF encoding through ffmpeg.
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");

// Playwright: a global or NODE_PATH install, or a local one (npm install in scripts/demos).
function loadPlaywright() {
  const tries = [
    "playwright",
    path.join(__dirname, "node_modules", "playwright"),
  ];
  for (const t of tries) { try { return require(t); } catch { /* next */ } }
  throw new Error("playwright not found: run `npm i playwright` in scripts/demos, or set NODE_PATH");
}
const { chromium } = loadPlaywright();

const REPO = path.resolve(__dirname, "..", "..");
const WEB = path.join(REPO, "editor", "web");
const OUT = path.join(REPO, "docs", "media");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
function serve(dir = WEB) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]), f = path.join(dir, u === "/" ? "index.html" : u);
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": (types[path.extname(f)] || "application/octet-stream") + "; charset=utf-8" }); r.end(d); });
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

// Hidden in every capture: dev-only markers and tools (workbench.css / list.js "DEV ONLY"), the
// mouse-click "Copied" toast, the text caret and scrollbars.
const HIDE_CSS = `
.devdone, .devonly, #devTour, #devTourBtn, .devcopy, .inspector { display: none !important; }
html, body { margin: 0 !important; }
* { caret-color: transparent !important; }
::-webkit-scrollbar { display: none !important; }
`;

let browser = null, BASE = "";
async function start() {
  const srv = await serve();
  BASE = `http://127.0.0.1:${srv.address().port}/`;
  browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
  return { srv, close: async () => { await browser.close(); srv.close(); } };
}

// opts: viewport, scale (deviceScaleFactor), prefs (localStorage "morphe-visual-editor-v1" save object
// merged in), glide (glide style), video (dir to record into)
async function open(opts = {}) {
  const viewport = opts.viewport || { width: 412, height: 915 };
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: opts.scale || 2, colorScheme: "dark", hasTouch: false,
    ...(opts.video ? { recordVideo: { dir: opts.video, size: viewport } } : {}),
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => console.warn("  page error:", e.message));
  // Roboto from Google Fonts, as the app draws it; MV_BLOCK_FONTS=1 (or opts.blockFonts) works offline
  if (opts.blockFonts || process.env.MV_BLOCK_FONTS) await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const save = { lv: 2, theme: "yt", grouped: true, design: "clean", ...(opts.prefs || {}) };
  await p.addInitScript(([save, glide, css]) => {
    try {
      localStorage.setItem("morphe-visual-editor-v1-tutorial", "1");
      localStorage.setItem("morphe-visual-editor-v1-tut-groups", "1"); // the one-time tabs tutorial (tutOnce)
      localStorage.setItem("morphe-visual-editor-v1", JSON.stringify(save));
      if (glide) localStorage.setItem("morphe-visual-editor-v1-glide", glide);
    } catch { /* none */ }
    document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); });
  }, [save, opts.glide || "", HIDE_CSS]);
  await p.goto(BASE + "index.html");
  await p.waitForFunction(() => typeof CAT !== "undefined" && CAT && document.querySelector("#list [data-row]"), null, { timeout: 15000 });
  await p.evaluate(() => document.fonts.ready); await sleep(opts.settle || 1200);
  await p.mouse.move(-10, -10);
  return { ctx, p };
}

async function still(p, name) {
  const f = path.join(OUT, name);
  await p.screenshot({ path: f });
  console.log("  wrote", name, (fs.statSync(f).size / 1024).toFixed(0) + " KB");
}

// Frame capture by screenshots on a fixed clock (deterministic, independent of the screencast).
// Returns a recorder: rec.frame() is driven by a loop started with rec.start(); rec.stop() ends it.
function recorder(p, fps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mvdemo-"));
  let n = 0, on = false, loop = null;
  return {
    dir,
    get count() { return n; },
    start() {
      on = true;
      loop = (async () => {
        const dt = 1000 / fps; let t0 = Date.now();
        while (on) {
          await p.screenshot({ path: path.join(dir, `f${String(n++).padStart(5, "0")}.png`), animations: "allow" });
          t0 += dt; const w = t0 - Date.now(); if (w > 0) await sleep(w); else t0 = Date.now();
        }
      })();
    },
    async stop() { on = false; await loop; },
  };
}

// Encode a frame folder (or video) to a palette-optimised looping GIF.
function gif(input, name, { fps = 15, width = 412, inFps = null, trim = null } = {}) {
  const out = path.join(OUT, name);
  const isDir = fs.existsSync(input) && fs.statSync(input).isDirectory();
  const src = isDir ? ["-framerate", String(inFps || fps), "-i", path.join(input, "f%05d.png")] : [...(trim ? ["-ss", String(trim[0]), "-t", String(trim[1])] : []), "-i", input];
  const vf = `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`;
  cp.execFileSync(FFMPEG, ["-y", "-loglevel", "error", ...src, "-vf", vf, "-loop", "0", out], { stdio: "inherit" });
  console.log("  wrote", name, (fs.statSync(out).size / 1024).toFixed(0) + " KB");
  return out;
}
const rmrf = d => { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* gone */ } };

module.exports = { start, open, still, recorder, gif, rmrf, sleep, OUT, REPO, get browser() { return browser; } };
