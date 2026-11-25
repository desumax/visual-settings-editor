#!/usr/bin/env node
// README media for the Visual Settings Editor: PNG stills and GIFs of editor/web, written to docs/media.
//   node scripts/demos/make.js                 every scene
//   node scripts/demos/make.js --only search   scenes whose name contains "search"
//   node scripts/demos/make.js --keep          keep the raw frame folders (printed) for inspection
// See README.md next to this file for what each scene captures.
"use strict";
const L = require("./lib");
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const { sleep, OUT } = L;
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i > 0 ? process.argv[i + 1] : ""; })();
const KEEP = process.argv.includes("--keep");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const GIF_SCALE = 1.5, GIF_W = 480, GIF_FPS = 15; // captured at 618 CSS-px-wide pixels, written 480 wide

// ---- pointer helpers: real mouse events, so the editor's own press handling runs ------------------------
async function centre(p, sel, { index = 0, text = null } = {}) {
  const box = await p.evaluate(([sel, index, text]) => {
    let els = [...document.querySelectorAll(sel)].filter(e => e.offsetParent || e.getClientRects().length);
    if (text) els = els.filter(e => e.textContent.trim().includes(text));
    const e = els[index]; if (!e) return null;
    const q = e.getBoundingClientRect(); if (q.bottom > innerHeight || q.top < 0) e.scrollIntoView({ block: "center", behavior: "instant" });
    const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2];
  }, [sel, index, text]);
  if (!box) throw new Error(`no element ${sel}${text ? ` "${text}"` : ""}`);
  return box;
}
async function tap(p, sel, opts = {}) {
  const [x, y] = await centre(p, sel, opts);
  await p.mouse.move(x, y); await p.mouse.down(); await sleep(70); await p.mouse.up();
  await p.mouse.move(-10, -10); // no hover state left behind
}
const row = k => `#list [data-row="${k}"]`;
// tap a row's title (selects it: the preview highlights or plays its part)
const tapRow = (p, k) => tap(p, `${row(k)} .ttl`);
// tap a row's toggle (the two-word toggle, the switch, or Morphe's own state chip)
const tapToggle = (p, k) => tap(p, `${row(k)} [data-sw]`);
// scroll the list (not the window) so a row sits `below` px under the sticky preview; the top bar stays
async function scrollRow(p, k, below = 0, smooth = false) {
  await p.evaluate(([k, below, smooth]) => {
    const r = document.querySelector(`#list [data-row="${k}"]`), sc = $("scroller"), st = $("stick");
    const top = sc.scrollTop + r.getBoundingClientRect().top - st.getBoundingClientRect().bottom - below;
    sc.scrollTo({ top, behavior: smooth ? "smooth" : "instant" }); window.scrollTo(0, 0);
  }, [k, below, smooth]);
  await sleep(smooth ? 900 : 350);
  await p.evaluate(() => $("app").classList.remove("barhidden"));
  await sleep(300);
}

// ---- GIF capture: screenshots on a clock, re-timed by their real timestamps ------------------------------
async function capture(p, name, script, { fps = GIF_FPS, width = GIF_W, clip = null, colors = 200 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mvgif-"));
  const shots = []; let on = true;
  const loop = (async () => {
    const dt = 1000 / fps;
    while (on) {
      const t = Date.now(), f = path.join(dir, `f${String(shots.length).padStart(5, "0")}.jpg`);
      await p.screenshot({ path: f, type: "jpeg", quality: 92, ...(clip ? { clip } : {}) });
      shots.push([f, t]);
      const w = t + dt - Date.now(); if (w > 0) await sleep(w);
    }
  })();
  try { await script(); } finally { on = false; await loop.catch(() => {}); }
  // concat list with each frame's real duration, so slow screenshots don't speed the motion up
  const lines = [];
  shots.forEach(([f, t], i) => { const next = i + 1 < shots.length ? shots[i + 1][1] : t + 1000 / fps; lines.push(`file '${f.replace(/\\/g, "/")}'`, `duration ${((next - t) / 1000).toFixed(4)}`); });
  lines.push(`file '${shots[shots.length - 1][0].replace(/\\/g, "/")}'`);
  const list = path.join(dir, "list.txt"); fs.writeFileSync(list, lines.join("\n"));
  const out = path.join(OUT, name);
  const vf = `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`;
  cp.execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", vf, "-loop", "0", out], { stdio: "inherit" });
  const secs = (shots[shots.length - 1][1] - shots[0][1]) / 1000;
  console.log(`  wrote ${name} ${(fs.statSync(out).size / 1048576).toFixed(2)} MB, ${shots.length} frames over ${secs.toFixed(1)} s`);
  if (KEEP) console.log("  frames kept in", dir); else L.rmrf(dir);
}

// ---- composites: stills side by side with a transparent gap (reads on GitHub's light and dark pages) -----
function hstack(files, name, gap = 32) {
  const out = path.join(OUT, name), args = ["-y", "-loglevel", "error"];
  files.forEach(f => args.push("-i", f));
  const pads = files.map((_, i) => i < files.length - 1 ? `[${i}:v]format=rgba,pad=iw+${gap}:ih:0:0:color=0x00000000[v${i}]` : `[${i}:v]format=rgba[v${i}]`);
  args.push("-filter_complex", pads.join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") + `hstack=inputs=${files.length}`, out);
  cp.execFileSync(FFMPEG, args, { stdio: "inherit" });
  console.log("  wrote", name, (fs.statSync(out).size / 1024).toFixed(0) + " KB");
}
// rows of stills: each row's cells padded (transparent, at the bottom) to the row's tallest, then stacked
function grid(files, cols, name, gap = 24) {
  const out = path.join(OUT, name), args = ["-y", "-loglevel", "error"];
  files.forEach(f => args.push("-i", f));
  const parts = [], rows = [];
  for (let r = 0; r * cols < files.length; r++) {
    const idx = files.map((_, i) => i).slice(r * cols, r * cols + cols);
    // scale2ref is avoided: every cell is padded to a large fixed height first, then the row is cropped
    idx.forEach((i, j) => parts.push(`[${i}:v]format=rgba,pad=iw+${j < idx.length - 1 ? gap : 0}:4000:0:0:color=0x00000000[c${i}]`));
    parts.push(idx.map(i => `[c${i}]`).join("") + `hstack=inputs=${idx.length}[r${r}]`);
    rows.push(r);
  }
  const H = files.map(f => pngSize(f)[1]);
  rows.forEach(r => { const h = Math.max(...H.slice(r * cols, r * cols + cols)); parts.push(`[r${r}]crop=iw:${h + (r < rows.length - 1 ? gap : 0)}:0:0[q${r}]`); });
  parts.push(rows.map(r => `[q${r}]`).join("") + `vstack=inputs=${rows.length}`);
  args.push("-filter_complex", parts.join(";"), out);
  cp.execFileSync(FFMPEG, args, { stdio: "inherit" });
  console.log("  wrote", name, (fs.statSync(out).size / 1024).toFixed(0) + " KB");
}
// width and height from a PNG header
function pngSize(f) { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
const tmpPng = n => path.join(os.tmpdir(), `mvstill-${n}.png`);

// ---- scenes -----------------------------------------------------------------------------------------------
const SCENES = {};

module.exports = { SCENES, tap, tapRow, tapToggle, scrollRow, capture, hstack, grid, tmpPng, centre, row };
require("./scenes");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const s = await L.start();
  try {
    for (const [name, fn] of Object.entries(SCENES)) {
      if (ONLY && !name.includes(ONLY)) continue;
      console.log("scene", name);
      await fn();
    }
  } finally { await s.close(); }
})().catch(e => { console.error(e); process.exit(1); });
