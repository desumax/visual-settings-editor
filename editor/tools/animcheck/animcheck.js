#!/usr/bin/env node
// animcheck: plays every animated setting of the visual editor in a headless browser on a virtual
// clock (an 11 s comparison takes well under a second) and checks each frame step against rules
// taken from the bugs reported in review. See README.md.
//
//   node tools/animcheck/animcheck.js                 every animation, App view and web, phone size
//   node tools/animcheck/animcheck.js --keys morphe_exit_fullscreen,morphe_loop_video --sheet
//   options: --target app|web|both   --size 412x896   --jobs N   --values all|default
//            --keys a,b   --grep text   --sheet (contact sheets for the chosen keys)   --out dir
//            --at 1500,3000 (whole-screen frames at these times)
"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const { chromium } = require("playwright");
const HERE = __dirname, VE = path.join(HERE, "..", ".."), WEB = path.join(VE, "web");
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const OUT = path.resolve(arg("out", path.join(os.tmpdir(), "animcheck")));
const TARGETS = arg("target", "both") === "both" ? ["app", "web"] : [arg("target")];
const [VW, VH] = String(arg("size", "412x896")).split("x").map(Number);
const JOBS = Number(arg("jobs", Math.max(2, Math.min(8, os.cpus().length))));
const KEYS = arg("keys") ? String(arg("keys")).split(",").map(k => k.startsWith("morphe_") ? k : "morphe_" + k) : null;
const FRAME = Number(arg("frame", 50)); // ms of animation per checked frame
const GREP = arg("grep") ? String(arg("grep")) : null, SHEET = !!arg("sheet"), VALUES = arg("values", "all");
const AT = arg("at") ? String(arg("at")).split(",").map(Number) : []; // whole-screen frames at these times (ms)
// Findings that are the point of the animation, not a bug: [key, rule, why]
const ALLOW = [
  ["morphe_navigation_bar_animations", "picture-swap", "Off shows the tab changing with no animation: that is the setting"],
  ["morphe_disable_resuming_shorts_player", "picture-swap", "the app restarting is a cut"],
  ["morphe_playback_buffer_size", "slow-start", "the first size is the first drawing and stays a full step, like the others"],
  ["morphe_swipe_press_to_engage", "sides-end-same", "both phones end on the volume overlay: the difference is the press before the swipe"],
];
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
function serve(dir) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]), f = path.join(dir, u === "/" ? "index.html" : u);
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": (types[path.extname(f)] || "application/octet-stream") + "; charset=utf-8" }); r.end(d); });
    });
    srv.listen(0, () => res(srv));
  });
}
// The browser draws a frame only when told to (begin-frame control), and its clock only moves when
// given a budget (virtual time). One step = let `ms` of timers run, then draw one frame at that time:
// requestAnimationFrame, CSS transitions and scripted animations all advance by exactly `ms`, so a run
// is the same every time and takes a few milliseconds per frame instead of real time.
const FLAGS = ["--enable-begin-frame-control", "--run-all-compositor-stages-before-draw", "--disable-threaded-animation", "--disable-threaded-scrolling", "--disable-checker-imaging", "--disable-new-content-rendering-timeout", "--disable-image-animation-resync"];
const hr = () => Number(process.hrtime.bigint() / 1000000n), sleep = ms => new Promise(r => setTimeout(r, ms));
async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, hasTouch: true });
  const errors = []; page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem("morphe-visual-editor-v1-tutorial", "1"); ["tabs", "clean", "grouped"].forEach(x => localStorage.setItem("morphe-visual-editor-v1-tut-" + x, "1")); } catch (e) { /* no storage */ } });
  await page.addInitScript({ path: path.join(HERE, "probe.js") });
  const cdp = await page.context().newCDPSession(page);
  let ticks = hr(), pumping = true;
  const frame = (interval, shot) => cdp.send("HeadlessExperimental.beginFrame", { frameTimeTicks: ticks, interval, noDisplayUpdates: !shot, ...(shot ? { screenshot: { format: "png" } } : {}) });
  // while the page loads, frames follow the real clock
  const pump = (async () => { while (pumping) { ticks = Math.max(ticks + 1, hr()); try { await frame(16, false); } catch (e) { /* navigating */ } await sleep(12); } })();
  await page.goto(url);
  await page.waitForFunction(() => typeof PREF !== "undefined" && Object.keys(PREF).length > 100 && typeof MEMBERS !== "undefined" && Object.keys(MEMBERS).length > 3, null, { polling: 50 });
  await sleep(300);
  pumping = false; await pump;
  await cdp.send("Emulation.setVirtualTimePolicy", { policy: "pause" });
  const grant = ms => new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error("virtual time stalled")), 20000);
    cdp.once("Emulation.virtualTimeBudgetExpired", () => { clearTimeout(to); res(); });
    cdp.send("Emulation.setVirtualTimePolicy", { policy: "pauseIfNetworkFetchesPending", budget: ms }).catch(rej);
  });
  // one step of `ms`; with shot, returns the frame as a PNG buffer
  const step = async (ms, shot) => { await grant(ms); ticks += ms; const r = await frame(ms, shot); return shot && r.screenshotData ? Buffer.from(r.screenshotData, "base64") : null; };
  const run = async (ms, every = 50) => { for (let t = 0; t < ms; t += every) await step(Math.min(every, ms - t)); };
  const ev = (fn, a) => page.evaluate(([f, x]) => window.__animcheck[f](x), [fn, a]);
  return { page, step, run, ev, errors };
}
const same = (a, b) => String(a) === String(b);
async function runJob(P, job, info, sheetDir) {
  const { page, step, run, ev, errors } = P; errors.length = 0;
  const res = { ...job, v: [], how: "" };
  await ev("prepare", job); await run(1300, 100);
  await ev("rest", job); await run(900, 100);
  await ev("baseline");
  const isDefault = same(job.value, job.def);
  const dur = job.kind === "scn" ? info.total + info.fade + 900 : info.loop * 6 + 700;
  // every frame of the first seconds (where a story happens once in full), then coarser to the end
  const fine = job.kind === "scn" ? 5200 : info.loop * 3 + 900;
  const shots = [];
  if (isDefault) { await ev("startSampling", job); res.how = await ev("tap", job); }
  else { res.how = await ev("tap", job); await run(700); res.how += " + " + await ev("pick", job); }
  let box = null;
  for (let t = 0; t < dur;) {
    const st = t < fine ? FRAME : 200; t += st;
    const want = sheetDir && shots.length < 48 && (t <= 3000 ? t % 150 === 0 : t <= fine + 400 ? t % 300 === 0 : t % 1000 === 0);
    const full = AT.some(a => a > t - st && a <= t);
    const png = await step(st, want || full);
    if (png && full) fs.writeFileSync(path.join(OUT, "frames", `${job.target}__${job.key.replace(/^morphe_/, "")}__${String(job.value)}__${t}.png`), png);
    if (png && want) {
      // cropped to the preview box where it is in this frame (it slides up as the top bar hides)
      const at = await page.evaluate(() => { const b = (document.querySelector(".stagebox") || document.getElementById("stick")).getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height)]; });
      box = Math.max(box || 0, at[1]);
      const f = path.join(sheetDir, `f${shots.length}.png`); fs.writeFileSync(f, png); shots.push([f, t, at[0]]);
    }
  }
  const fin = await ev("finish", job); res.v.push(...fin.v); res.samples = fin.n; res.ask = fin.ask;
  // driven by a call instead of a tap: the checker did not go the way a user does, so say so
  if (/\(\)/.test(res.how)) res.v.push({ rule: "not-tapped", t: 0, detail: `could not be driven through the list (${res.how})${await ev("locked", job) ? ": the setting is locked" : ""}`, level: "warn" });
  res.trace = await ev("trace");
  if (process.env.ANIMCHECK_EVAL) console.error(job.target, job.key, String(job.value), JSON.stringify(await page.evaluate(process.env.ANIMCHECK_EVAL))); // debugging: an expression read in the page after the run
  await ev("leave", job); await run(1300, 100);
  res.v.push(...await ev("leftovers"));
  for (const e of new Set(errors)) res.v.push({ rule: "error", t: 0, detail: e, level: "fail" });
  res.v = res.v.filter(v => !ALLOW.some(([k, r]) => k === job.key && r === v.rule));
  if (sheetDir && shots.length) {
    const name = `${job.target}__${job.key.replace(/^morphe_/, "")}__${String(job.value)}.png`;
    fs.writeFileSync(path.join(sheetDir, "frames.json"), JSON.stringify({ frames: shots, height: box }));
    cp.execFileSync("python3", [path.join(HERE, "sheet.py"), path.join(sheetDir, "frames.json"), path.join(OUT, "sheets", name)]);
    res.sheet = path.join(OUT, "sheets", name);
  }
  return res;
}
(async () => {
  fs.mkdirSync(path.join(OUT, "sheets"), { recursive: true }); fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
  const t0 = Date.now(), all = [];
  for (const target of TARGETS) {
    let dir = WEB;
    if (target === "app") { dir = path.join(OUT, "appbuild"); cp.execFileSync("python3", [path.join(VE, "app", "build_app_view.py"), dir], { stdio: "ignore" }); dir = path.join(dir, "app"); }
    const srv = await serve(dir), url = `http://127.0.0.1:${srv.address().port}/index.html`;
    // one browser per worker: pages of one browser share a process, and with it the virtual clock
    const open = async () => { const browser = await chromium.launch({ args: FLAGS }); return { browser, ...await openPage(browser, url) }; };
    const first = await open(), info = await first.ev("info");
    const defs = await first.page.evaluate(() => Object.fromEntries(Object.keys(PREF).map(k => [k, defaults[k]])));
    let jobs = info.jobs.map(j => ({ ...j, target, def: defs[j.key] }));
    if (KEYS) jobs = jobs.filter(j => KEYS.includes(j.key));
    if (GREP) jobs = jobs.filter(j => j.key.includes(GREP));
    if (VALUES === "default") jobs = jobs.filter(j => same(j.value, j.def));
    const queue = jobs.slice(), n = Math.min(JOBS, Math.max(1, jobs.length));
    const workers = [first, ...await Promise.all(Array.from({ length: n - 1 }, open))];
    let done = 0;
    await Promise.all(workers.map(async (P, wi) => {
      const sheetDir = SHEET ? path.join(OUT, "tmp" + wi) : null; if (sheetDir) fs.mkdirSync(sheetDir, { recursive: true });
      for (let job; (job = queue.shift());) {
        try { all.push(await runJob(P, job, info, sheetDir)); }
        catch (e) {
          if (process.env.ANIMCHECK_DEBUG) console.error(job.key, job.value, e.stack);
          all.push({ ...job, v: [{ rule: "crash", t: 0, detail: String(e.message).split("\n")[0], level: "fail" }] });
          try { await P.browser.close(); } catch (x) { /* gone */ }
          Object.assign(P, await open());
        }
        if (++done % 50 === 0) process.stderr.write(`  ${target}: ${done}/${jobs.length}\n`);
      }
    }));
    await Promise.all(workers.map(P => P.browser.close().catch(() => {})));
    srv.close();
  }
  // options of one live-preview animation that all look the same
  const byKey = {};
  for (const r of all) if (r.kind === "demo" && r.trace !== undefined) (byKey[r.target + " " + r.key] = byKey[r.target + " " + r.key] || []).push(r);
  for (const rs of Object.values(byKey)) if (rs.length > 1 && rs.every(r => r.trace === rs[0].trace)) rs[0].v.push({ rule: "options-same", t: 0, detail: `all ${rs.length} options play exactly the same`, level: "warn" });
  all.sort((a, b) => (a.target + a.key + a.value).localeCompare(b.target + b.key + b.value));
  const flat = all.flatMap(r => r.v.map(v => ({ target: r.target, key: r.key, value: r.value, section: r.section, kind: r.kind, ...v })));
  const fails = flat.filter(v => v.level === "fail"), warns = flat.filter(v => v.level === "warn");
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ size: [VW, VH], runs: all.map(({ trace, ...r }) => r) }, null, 1));
  const byRule = {}; for (const v of flat) (byRule[v.rule] = byRule[v.rule] || []).push(v);
  const md = [`# Animation check`, ``, `${all.length} runs (${TARGETS.join(" + ")}, ${VW}x${VH}) in ${((Date.now() - t0) / 1000).toFixed(1)} s. ${fails.length} failures, ${warns.length} warnings.`, ``];
  for (const [rule, vs] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) {
    md.push(`## ${rule} (${vs.length}, ${vs[0].level})`, ``);
    for (const v of vs) md.push(`- ${v.target} · \`${v.key.replace(/^morphe_/, "")}\` = ${v.value} · ${v.t} ms · ${v.detail}`);
    md.push(``);
  }
  fs.writeFileSync(path.join(OUT, "report.md"), md.join("\n"));
  console.log(md.slice(0, 3).join("\n"));
  for (const [rule, vs] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${rule}: ${vs.length} (${new Set(vs.map(v => v.key)).size} settings)`);
  console.log(`report: ${path.join(OUT, "report.md")}`);
  if (SHEET) all.forEach(r => r.sheet && console.log("sheet:", r.sheet));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
