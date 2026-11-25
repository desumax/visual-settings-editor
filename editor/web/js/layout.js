"use strict";
// Theme colours, tablet layout, devices and UI scale.

// ------------------------------------------------------------------ theme and tablet layout
// UI design (Max, Nov 23): "yt" = Original (YouTube's own settings look), "m3" = Morphe (Morphe Manager's
// Material 3), "glass" = Glass (Liquid Glass, design 1: the Morphe layout as clear glass over a colourful backdrop).
let theme = "yt";
const UI_DESIGNS = [["yt", "Original"], ["m3", "Morphe"], ["glass", "Glass"]];
function applyTheme() {
  if (theme === "glass" && glassUnsupported()) theme = "m3"; // saved from a device where it ran, or pretended
  const ph = $("phone");
  ph.classList.toggle("theme-yt", theme === "yt"); ph.classList.toggle("theme-m3", theme !== "yt"); ph.classList.toggle("theme-glass", theme === "glass");
  if (theme === "glass") glassTierApply(); else { ph.removeAttribute("data-gt"); liquidSync(); }
  applyAppColors();
}
// Glass adapts to the device, after ntvien/liquid-glass's device tiers: the same design is drawn with as
// much real glass as the device can afford, so it never stutters. Only small, still things bend what is
// behind them; nothing large is sampled while the list scrolls (see the Glass notes in index.html).
//   2 Full:  the lens on the top bar, tabs, dialogs, menu and snackbar, and on up to LENS_CAP chosen
//            thumbs in the list. Chromium with SVG backdrop filters, on 8 cores, or 6 cores and 6 GB.
//   1 Light: the lens on the top bar, tabs, dialogs, menu and snackbar only.
//   0 Flat:  no backdrop-filter at all (the same paint): no backdrop-filter support, reduced transparency
//            asked for, or a low-end device (2 GB or 2 cores or fewer).
// While glass is on, frames are timed during scrolls and menu/dialog openings (glassSample); a device
// that keeps falling behind drops a tier, remembered for GLASS_CAP_DAYS.
let glassTier = null, glassCap = null;
// the preview's own page can force a level, to see each one on any computer (Max, Nov 23 PM); the app never does
let glassForced = null; try { const f = localStorage.getItem(LS + "-glassforce"); if (f !== null && /^[012]$/.test(f)) glassForced = +f; else if (f === "x" || f === "w") glassForced = f; } catch { /* storage unavailable */ }
const GLASS_CAP_KEY = LS + "-glasscap", GLASS_CAP_DAYS = 7;
// a flagship never gets the slow warning, and starts at Full (Max, Nov 23 evening: a Snapdragon 8 Gen 5
// was warned; WebViews often don't say how much memory there is, so unknown memory counts as enough)
function glassHighEnd() { const c = navigator.hardwareConcurrency || 0, m = navigator.deviceMemory || 8; return c >= 8 && m >= 4; }
function glassTierDetect() {
  const sup = q => { try { return CSS.supports(q); } catch { return false; } };
  const mq = q => { try { return matchMedia(q).matches; } catch { return false; } };
  if (!(sup("backdrop-filter: blur(1px)") || sup("-webkit-backdrop-filter: blur(1px)"))) return 0;
  if (mq("(prefers-reduced-transparency: reduce)") || glassLowEnd()) return 0;
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 4;
  const chromium = !!(window.chrome || /\bChrome\/\d/.test(navigator.userAgent));
  if (chromium && lensOK && (glassHighEnd() || (mem >= 6 && cores >= 6)) && !mq("(prefers-reduced-motion: reduce)")) return 2;
  return 1;
}
function glassTierApply() {
  if (glassCap === null) {
    glassCap = 2;
    try {
      localStorage.removeItem(LS + "-glass"); // the old, permanent cap: one slow moment kept a phone down for good
      const c = JSON.parse(localStorage.getItem(GLASS_CAP_KEY) || "null");
      if (c && c.cap >= 0 && c.cap <= 2 && Date.now() - c.t < GLASS_CAP_DAYS * 864e5) glassCap = c.cap; else localStorage.removeItem(GLASS_CAP_KEY);
    } catch { /* storage unavailable */ }
  }
  if (typeof glassForced === "number") glassTier = glassForced;
  else if (glassTier === null) glassTier = Math.min(glassForced === "w" ? 0 : glassTierDetect(), glassCap);
  $("phone").dataset.gt = glassTier;
  glassArtPlace(); lensR = new WeakMap(); liquidSoon();
}
const GLASS_TIER_NAMES = ["Flat glass", "Light glass", "Full glass"];
// Glass where it can't run (Max, Nov 23): no backdrop-filter at all, or an Android older than
// GLASS_MIN_ANDROID. Its button in UI design is greyed out; tapping it says why (a message, not a choice).
// The preview's Glass level menu can pretend the device is one of these ("Unsupported" there).
const GLASS_MIN_ANDROID = 10;
function glassUnsupported() {
  if (glassForced === "x") return true;
  const sup = q => { try { return CSS.supports(q); } catch { return false; } };
  if (!(sup("backdrop-filter: blur(1px)") || sup("-webkit-backdrop-filter: blur(1px)"))) return true;
  const a = /Android (\d+)/.exec(navigator.userAgent);
  return !!a && +a[1] < GLASS_MIN_ANDROID;
}
const uiOff = () => glassUnsupported() ? ["glass"] : [];
// a greyed-out choice: says why and is not picked (true)
function uiNo(id) { if (id !== "glass" || !glassUnsupported()) return false; snack("Unsupported on this Android version"); return true; }
// picking a UI design, from the screen menu or the tutorial
function uiPick(id) {
  if (uiNo(id)) return false;
  theme = id; applyTheme(); renderBar(); store.save(); glassSample();
  if (theme === "glass" && glassLowEnd()) setTimeout(glassSlowWarn, 450); // after the thumb has moved
  return true;
}
// A device that is too weak for glass: found by detection (2 GB or 2 cores), or by frames that stay slow
// even in Flat glass on a device that isn't high-end (glassJudge). A popup says so, in the dialog look of
// the rest (Max, Nov 23). Dropping a tier is quiet: it only means less real glass.
const GLASS_SLOW_MSG = "Your device is not powerful enough for this glass design, please switch to alternatives for best performance!";
function glassLowEnd() { if (glassForced === "w") return true; const m = navigator.deviceMemory || 4, c = navigator.hardwareConcurrency || 4; return m <= 2 || c <= 2; }
function glassSlowWarn() {
  if (theme !== "glass" || typeof openDialog !== "function") return;
  if ($("dlg").classList.contains("open")) { setTimeout(glassSlowWarn, 1500); return; } // after the dialog that is open now
  openDialog(`<div class="di">${I("warning")}</div><h2 id="dlgTitle">Glass design</h2>
    <p>${GLASS_SLOW_MSG}</p>
    <div class="acts"><button class="dbtn primary" id="dOk">OK</button></div>`);
  $("dOk").onclick = closeDialog;
}
// ---------- the backdrop ----------
// The darker original glows (index.html --g-bg-img), drawn at the phone's own size in px: the phone paints
// them from its top left corner; whatever hides the list paints the same glows shifted by its own place
// (--g-art-x/-top here; --g-art-y adds the top bar in index.html), so the copies meet without a seam.
function glassArtPlace() {
  const ph = $("phone"), app = $("app"), st = $("stick"); if (!ph || !app || theme !== "glass") return;
  const pr = ph.getBoundingClientRect(), k = pr.width / (ph.offsetWidth || 1) || 1, top = pr.top + ph.clientTop * k, left = pr.left + ph.clientLeft * k;
  ph.style.setProperty("--g-art-w", ph.clientWidth + "px"); ph.style.setProperty("--g-art-h", ph.clientHeight + "px");
  ph.style.setProperty("--g-art-top", Math.round((app.getBoundingClientRect().top - top) / k) + "px");
  if (st && st.offsetWidth) ph.style.setProperty("--g-art-x", Math.round((st.getBoundingClientRect().left - left) / k) + "px");
}
if (window.ResizeObserver) { const ro = new ResizeObserver(() => glassArtPlace()); ro.observe($("phone")); ro.observe($("stick")); }
// ---------- Liquid Glass lens (Max, Nov 23: glass design 1) ----------
// Clear glass that bends what is behind it at its edges, with no frost: the web port of ntvien/liquid-glass's
// AGSL lens. For each surface size a displacement map is baked once in a canvas: inside a band B from the
// rounded edge, every point is pushed inward along the edge normal by (1 - sqrt(1 - u²)) × A, u = 1 - depth/B.
// The map feeds feDisplacementMap through backdrop-filter: url(#…), then a saturation lift. No recipe uses the
// colour fringe (chroma) any more: on a dialog it took three more displacement passes, three channel picks
// and two composites over one of the largest surfaces, every frame the preview moved under it, for a hairline
// of colour. Maps are cached by size, corner and recipe (see lensFilter). The recipes are the lab's. What bends:
//   2 Full:  top bar, tabs, dialogs, menu, snackbar, and up to LENS_CAP chosen thumbs on screen;
//   1 Light: top bar, tabs, dialogs, menu, snackbar;
//   0 Flat:  nothing.
// Cards and tracks never bend: they scroll, and each would be sampled again on every frame of a scroll
// (that is what made Full glass slow on a flagship). Only what is on screen gets a lens.
// GLASS_K: how strong the glass reads, the same share as --g-k in glass.css (Max, Nov 24 evening: 30% less):
// each lens bends GLASS_K as far, lifts colour GLASS_K as much and blurs GLASS_K as wide as its recipe says.
const GLASS_K = .7;
const LENS = Object.fromEntries(Object.entries({
  chrome: { band: 16, amount: 26, sat: 1.6, blur: 2.5 }, menu: { band: 20, amount: 30, sat: 1.6, blur: 6 },
  dlg: { band: 20, amount: 30, sat: 1.6, blur: 6 },
  ctl: { band: 8, amount: 12, sat: 1.5 }, thumb: { band: 9, amount: 14, sat: 1.8 },
}).map(([r, L]) => [r, { ...L, amount: L.amount * GLASS_K, sat: +(1 + (L.sat - 1) * GLASS_K).toFixed(3), ...(L.blur ? { blur: L.blur * GLASS_K } : {}) }]));
const LENS_ROLES = [
  { sel: ".appbar > .iconbtn, .secpill, .seg, .snack", L: "chrome", tier: 1 },
  { sel: ".dlg", L: "dlg", tier: 1 },
  { sel: "html:not(.inapp) #picker", L: "menu", tier: 1 },
  { sel: ".tab7:not([aria-selected=\"true\"])", L: "ctl", tier: 1 },
  { sel: ".tab7[aria-selected=\"true\"]", L: "thumb", tier: 1 },
  { sel: ".seg3.th > .seg3-th, .lt7 > i, .ctl .opt[aria-pressed=\"true\"]", L: "thumb", tier: 2, cap: true },
];
const LENS_CAP = 6;
const lensOK = (() => { try { return CSS.supports("backdrop-filter", "url(#x)") || CSS.supports("-webkit-backdrop-filter", "url(#x)"); } catch { return false; } })();
// maps by size and recipe, oldest first; at most LENS_KEEP, so resizing or many dialog sizes can't grow the
// page without end (a map an element still wears is never dropped)
const lensMaps = new Map(), LENS_KEEP = 24; let lensN = 0, lensR = new WeakMap(); // corner radius per element, read once
const lensCv = document.createElement("canvas"); // one canvas, reused for every map
function lensSd(px, py, hw, hh, r) { const qx = Math.abs(px) - hw + r, qy = Math.abs(py) - hh + r; return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r; }
function lensFilter(w, h, r, L) {
  w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h)); r = Math.min(r, w / 2, h / 2);
  const key = [w, h, Math.round(r), L.band, L.amount, L.chroma || 0, L.blur || 0, L.sat].join();
  if (lensMaps.has(key)) { const id = lensMaps.get(key); lensMaps.delete(key); lensMaps.set(key, id); return id; } // now the newest
  const cv = lensCv; cv.width = w; cv.height = h; const cx = cv.getContext("2d"), im = cx.createImageData(w, h), D = im.data;
  const hw = w / 2, hh = h / 2, gr = Math.min(r * 1.5, hw, hh), B = L.band, A = L.amount, S = 2 * (A + 1);
  for (let i = 0; i < w * h; i++) { D[i * 4] = D[i * 4 + 1] = D[i * 4 + 2] = 128; D[i * 4 + 3] = 255; }
  // only the band at the edge moves: rows and columns deeper than B are skipped
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= B && x < w - B && y >= B && y < h - B && x >= r && x < w - r) { x = w - Math.max(B, r) - 1; continue; }
    const px = x + .5 - hw, py = y + .5 - hh, dep = -lensSd(px, py, hw, hh, r); if (dep >= B || dep <= -1) continue;
    const u = 1 - Math.max(0, dep) / B, d = (1 - Math.sqrt(Math.max(0, 1 - u * u))) * A, e = .5;
    let gx = lensSd(px + e, py, hw, hh, gr) - lensSd(px - e, py, hw, hh, gr), gy = lensSd(px, py + e, hw, hh, gr) - lensSd(px, py - e, hw, hh, gr); const l = Math.hypot(gx, gy) || 1;
    const ox = Math.max(-x, Math.min(w - 1 - x, -gx / l * d)), oy = Math.max(-y, Math.min(h - 1 - y, -gy / l * d)), i = (y * w + x) * 4;
    D[i] = Math.round((.5 + ox / S) * 255); D[i + 1] = Math.round((.5 + oy / S) * 255);
  }
  cx.putImageData(im, 0, 0);
  const id = "lens" + (lensN++), src = L.blur ? "b" : "SourceGraphic", ca = L.chroma || 0;
  let body = `<feImage href="${cv.toDataURL()}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>` + (L.blur ? `<feGaussianBlur in="SourceGraphic" stdDeviation="${L.blur}" result="b"/>` : "");
  if (!ca) body += `<feDisplacementMap in="${src}" in2="m" scale="${S}" xChannelSelector="R" yChannelSelector="G" result="d"/>`;
  else {
    const ch = ["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0", "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0", "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"];
    [1, 1 + ca, 1 + 2 * ca].forEach((k, i) => { body += `<feDisplacementMap in="${src}" in2="m" scale="${S * k}" xChannelSelector="R" yChannelSelector="G" result="d${i}"/><feColorMatrix in="d${i}" values="${ch[i]}" result="c${i}"/>`; });
    body += `<feComposite in="c0" in2="c1" operator="arithmetic" k2="1" k3="1" result="c01"/><feComposite in="c01" in2="c2" operator="arithmetic" k2="1" k3="1" result="d"/>`;
  }
  body += `<feColorMatrix in="d" type="saturate" values="${L.sat}"/>`;
  let defs = $("lensDefs"); if (!defs) { document.body.insertAdjacentHTML("beforeend", '<svg id="lensDefs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false"><defs></defs></svg>'); defs = $("lensDefs"); }
  defs.firstChild.insertAdjacentHTML("beforeend", `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">${body}</filter>`);
  lensMaps.set(key, id);
  if (lensMaps.size > LENS_KEEP) {
    const worn = new Set([...lensOn].map(e => (/#(lens\d+)/.exec(e.style.backdropFilter) || [])[1]));
    for (const [k, v] of lensMaps) { if (lensMaps.size <= LENS_KEEP) break; if (v === id || worn.has(v)) continue; lensMaps.delete(k); document.getElementById(v)?.remove(); }
  }
  return id;
}
let lensOn = new Set(), lensRaf = 0;
function lensClear(e) { e.style.backdropFilter = ""; e.style.webkitBackdropFilter = ""; }
function liquidSync() {
  lensRaf = 0;
  const ph = $("phone"), tier = theme === "glass" && lensOK ? +(ph.dataset.gt || 0) : 0;
  if (!tier) { lensOn.forEach(lensClear); lensOn = new Set(); return; }
  const vh = innerHeight, vw = innerWidth, want = [], seen = new Set();
  // the list's thumbs count only where the list can be seen: inside the scroller, below the sticky preview
  // (the window's bounds let a hidden thumb take one of the LENS_CAP places)
  const scr = $("scroller"), sc = scr.getBoundingClientRect(), stk = $("stick"), lt = Math.max(sc.top, stk && stk.offsetHeight ? stk.getBoundingClientRect().bottom : sc.top), lb = sc.bottom;
  // reads first, then writes (one layout)
  for (let i = LENS_ROLES.length - 1; i >= 0; i--) { // later roles win
    const R = LENS_ROLES[i]; if (tier < R.tier) continue;
    let n = 0;
    ph.querySelectorAll(R.sel).forEach(e => {
      if (seen.has(e) || (R.cap && n >= LENS_CAP)) return; seen.add(e);
      const b = e.getBoundingClientRect(); if (b.width < 4 || b.height < 4 || b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) return;
      if (R.cap && scr.contains(e) && (b.bottom <= lt || b.top >= lb)) return;
      if (e.checkVisibility && !e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true })) return; // a closed menu or dialog
      n++;
      let r = lensR.get(e); if (r === undefined) { r = parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0; lensR.set(e, r); }
      want.push([e, e.offsetWidth || b.width, e.offsetHeight || b.height, r, LENS[R.L + (tier === 2 && LENS[R.L + "Full"] ? "Full" : "")]]);
    });
  }
  const next = new Set();
  want.forEach(([e, w, h, r, L]) => { const v = `url(#${lensFilter(w, h, r, L)})`; if (e.style.backdropFilter !== v) { e.style.backdropFilter = v; e.style.webkitBackdropFilter = v; } next.add(e); });
  lensOn.forEach(e => { if (!next.has(e)) lensClear(e); }); lensOn = next;
}
function liquidSoon() { if (!lensRaf && theme === "glass") lensRaf = requestAnimationFrame(() => requestAnimationFrame(liquidSync)); }
// what can change which glass is on screen asks for one sync on the next frames: choices and redraws in the
// list and the tabs, the top bar, and dialogs, the menu and the snackbar opening. The live preview is left
// out on purpose: its animations change the page many times a second and never hold glass.
{
  const mo = new MutationObserver(liquidSoon), A = ["aria-pressed", "aria-selected", "aria-checked", "data-at"];
  ["list", "tabs", "pickGrid"].forEach(id => { const e = $(id); if (e) mo.observe(e, { childList: true, subtree: true, attributes: true, attributeFilter: A }); });
  const bar = document.querySelector(".appbar"); if (bar) mo.observe(bar, { childList: true, subtree: true, attributes: true, attributeFilter: A });
  const mc = new MutationObserver(() => { liquidSoon(); setTimeout(liquidSoon, 420); }); // again once it has faded in or out
  ["dlg", "picker", "snack", "app"].forEach(id => { const e = $(id); if (e) mc.observe(e, { attributes: true, attributeFilter: ["class"] }); });
  mo.observe($("phone"), { attributes: true, attributeFilter: ["data-gt", "class"] });
  // only Full has glass in the list (chosen thumbs), so only Full looks again after a scroll
  let st = 0; document.addEventListener("scroll", () => { if ($("phone").dataset.gt !== "2") return; clearTimeout(st); st = setTimeout(liquidSoon, 120); }, { capture: true, passive: true });
  addEventListener("resize", liquidSoon);
}
// Frame watch (rebuilt Nov 23 evening, after a Snapdragon 8 Gen 5 was told it was too slow): 90 frames
// while the list or the menu scrolls, or a menu or dialog opens, leaving out the first frames (the first
// paint of a new layer is always slow) and gaps from a hidden page. A window is slow when its median frame
// takes over 22 ms (most frames under 45 fps), whatever the display's rate: a device held at a steady 30 fps
// is slow, though it never shows a fast frame to compare with (it used to pass that way). Two slow windows
// in a row drop the tier one step, quietly; only Flat still being slow, on a device that isn't high-end,
// shows the warning (glass itself costs nothing in Flat, but the device can't keep up with this look).
let glassWatch = null, glassStrikes = 0;
function glassSample(ev) {
  if (ev && ev.type === "scroll") { if (ev.target !== $("scroller") && ev.target !== $("picker")) return; } // the preview's own motion isn't a scroll of the list
  else setTimeout(liquidSoon, 40); // a menu or dialog opening: its glass gets its lens once it shows (a scroll never asks: the
  // listener above looks again only in Full, once the scroll has been quiet for 120 ms, so a gesture measures nothing)
  if (theme !== "glass" || glassWatch || typeof glassForced === "number" || document.hidden) return;
  const dts = []; let last = 0, skip = 8;
  glassWatch = requestAnimationFrame(function f(t) {
    if (document.hidden) { glassWatch = null; return; }
    if (last && --skip < 0) { const dt = t - last; if (dt < 200) dts.push(dt); }
    last = t;
    if (dts.length < 90) { glassWatch = requestAnimationFrame(f); return; }
    glassWatch = null; glassJudge(dts);
  });
}
function glassJudge(dts) {
  dts.sort((a, b) => a - b);
  glassStrikes = dts[dts.length >> 1] > 22 ? glassStrikes + 1 : 0;
  if (glassStrikes < 2 || theme !== "glass") return;
  glassStrikes = 0;
  if (glassTier > 0) {
    glassTier--; glassCap = glassTier;
    try { localStorage.setItem(GLASS_CAP_KEY, JSON.stringify({ cap: glassCap, t: Date.now() })); } catch { /* storage unavailable */ }
    $("phone").dataset.gt = glassTier;
    if (typeof renderBar === "function" && $("picker").classList.contains("open")) renderBar();
  } else if (!glassHighEnd()) glassSlowWarn();
}
document.addEventListener("scroll", glassSample, { capture: true, passive: true });
function setGlassForce(v) {
  glassForced = v === "" || v === null ? null : v === "x" || v === "w" ? v : +v; glassTier = null;
  if (glassForced === "x" && theme === "glass") theme = "m3"; // pretending glass can't run here: it can't stay on
  try { if (glassForced === null) localStorage.removeItem(LS + "-glassforce"); else localStorage.setItem(LS + "-glassforce", String(glassForced)); } catch { /* storage unavailable */ }
  applyTheme(); renderBar();
}
// Morphe's theme patch (Pure black / AMOLED, Material You, Catppuccin, custom) changes YouTube's
// background, so the preview and, in the YouTube look, the editor itself follow it.
function appBg() {
  if (mode === "orig") return "#0f0f0f";
  const t = state.morphe_theme_color_dark;
  if (t === "CUSTOM") return String(state.morphe_theme_color_dark_custom || "#0f0f0f").replace(/^#(..)(......)$/, "#$2");
  return (typeof THEME_DARK !== "undefined" && THEME_DARK[t]) || "#0f0f0f";
}
function lift(hex, amt) { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v + (255 - v) * amt))); return "#" + c.map(v => v.toString(16).padStart(2, "0")).join(""); }
function applyAppColors() {
  const ph = $("phone"), bg = appBg();
  ph.style.setProperty("--app-bg", bg);
  if (theme !== "yt") { ["--m-bg", "--m-surface", "--m-c", "--m-c-high", "--m-c-highest"].forEach(v => ph.style.removeProperty(v)); return; }
  ph.style.setProperty("--m-bg", bg); ph.style.setProperty("--m-surface", bg); ph.style.setProperty("--m-c", bg);
  ph.style.setProperty("--m-c-high", lift(bg, .13)); ph.style.setProperty("--m-c-highest", lift(bg, .22));
}
// Portrait tablet: the preview sits on top and the settings fill two columns below it, on every tab.
// (This used to be limited to tabs with a 16:9 player, so Playback, Player menu, Home and the others
// fell back to one narrow column beside the preview. Every preview is at most ~420px tall, so all fit.)
function applyLayout() {
  const ed = document.querySelector(".editor"); if (!ed) return;
  const st = ed.clientWidth >= 600 && ed.clientHeight >= ed.clientWidth * 0.95;
  $("content").classList.toggle("stacked", st);
  fitOpts(); // column widths change with the layout, so the pills are fitted again
}
window.addEventListener("resize", applyLayout);

// ------------------------------------------------------------------ devices and UI scale
const DEVICES = [
  { id: "phone", label: "Phone", w: 400, h: 820 },
  { id: "land", label: "Phone landscape", w: 860, h: 420 },
  { id: "tablet", label: "Tablet", w: 820, h: 1100 },
  { id: "desktop", label: "Desktop", w: 1180, h: 760, desktop: true },
];
let device_ = "phone", uiScale = 100;
function applyDevice() {
  const d = DEVICES.find(x => x.id === device_);
  const ph = $("phone");
  ph.style.width = d.w + "px"; ph.style.height = d.h + "px"; ph.classList.toggle("desktop", !!d.desktop);
  $("app").style.zoom = uiScale / 100;
  const avail = Math.min(window.innerWidth - 40, d.w), availH = window.innerHeight - 40;
  const s = Math.min(1, avail / d.w, Math.max(.45, availH / d.h));
  ph.style.transform = s < 1 ? `scale(${s})` : "";
  $("devwrap").style.width = d.w * s + "px"; $("devwrap").style.height = d.h * s + "px";
  applyLayout(); if (barStays()) $("app").classList.remove("barhidden");
  $("devBtns").innerHTML = DEVICES.map(x => `<button class="btn" data-dev="${x.id}" aria-pressed="${x.id === device_}">${x.label}</button>`).join("");
}
$("devBtns").addEventListener("click", e => { const b = e.target.closest("[data-dev]"); if (!b) return; device_ = b.dataset.dev; applyDevice(); store.save(); });
{ const gs = $("glideStyle"); if (gs) { gs.innerHTML = GLIDE_STYLES.map(([v, t]) => `<option value="${v}">${t}</option>`).join(""); gs.value = glideStyle; gs.addEventListener("change", e => setGlideStyle(e.target.value)); } }
{ const gf = $("glassForce"); if (gf) { gf.value = glassForced === null ? "" : String(glassForced); gf.addEventListener("change", e => setGlassForce(e.target.value)); } }
$("uiScale").addEventListener("input", e => { uiScale = Number(e.target.value); $("uiScaleOut").textContent = uiScale + "%"; applyDevice(); });
window.addEventListener("resize", () => { if (window.innerWidth > 860) applyDevice(); else { $("phone").style.transform = ""; $("devwrap").style.width = ""; $("devwrap").style.height = ""; $("phone").style.width = ""; $("phone").style.height = ""; } });
