"use strict";
// Snackbar, proxies, flashes, scrolling the preview to an element, and the selection ring.

// ------------------------------------------------------------------ interactions
let snackTimer = null, undoFn = null;
function snack(msg, undo) {
  $("snackMsg").innerHTML = msg; undoFn = undo || null; $("snackUndo").hidden = !undo;
  $("snack").classList.add("show"); clearTimeout(snackTimer);
  snackTimer = setTimeout(() => $("snack").classList.remove("show"), 3200);
}
$("canvas").addEventListener("click", () => stopScenario());
$("snackUndo").onclick = () => { if (undoFn) undoFn(); undoFn = null; $("snack").classList.remove("show"); };

// A setting that has no element of its own in the preview (it changes how something behaves) points
// at the element that does the behaviour: its parent's element (Playback speed button for "Tap to
// cycle speeds"), or a named one (the seekbar for the seekbar colour and thumb settings).
const PROXY_K = { morphe_seekbar_custom_color: "morphe_hide_seekbar" };
// Where a setting without a part of its own acts in the preview, so selecting it (or picking one of its
// options) scrolls the preview there first (Max, Nov 24: scrolled down on the video page, "Video action bar
// layout" and "Like and Subscribe glow" left the action bar out of view). Its proxy part when it has one.
const FOCUS_K = { morphe_video_action_bar_layout: '[data-k="morphe_hide_action_bar"]', morphe_disable_like_subscribe_glow: '[data-k="morphe_hide_action_bar"]' };
function focusEls(k) {
  const pr = proxyEls(k); if (pr.length) return pr;
  return FOCUS_K[k] ? [...document.querySelectorAll(`#stage ${FOCUS_K[k]}`)].filter(e => e.getClientRects().length) : [];
}
const coversStage = e => { const s = $("stage").getBoundingClientRect(), r = e.getBoundingClientRect(); return r.width * r.height > s.width * Math.min(s.height, 420) * .8; };
function proxyEls(k) {
  const q = x => [...document.querySelectorAll(`#stage [data-k="${x}"], #stage [data-also~="${x}"]`)].filter(e => e.getClientRects().length && (!e.classList.contains("off") || e.classList.contains("ghost")));
  if (q(k).length) return [];
  // data-proxy="<key>": a part that flashes for a setting without being its selectable part, so the
  // setting and the ones under it all flash it the same way (the seekbar thumb's ring: Max, round 141,
  // "Custom seekbar thumb" must flash as "Thumb image" does)
  const qp = x => [...document.querySelectorAll(`#stage [data-proxy~="${x}"]`)].filter(e => e.getClientRects().length);
  if (qp(k).length) return qp(k);
  const seen = new Set();
  for (let p = PROXY_K[k] || PARENT_OF[k]; p && !seen.has(p); p = PROXY_K[p] || PARENT_OF[p]) { seen.add(p); const e = q(p).length ? q(p) : qp(p); if (e.length) return e; }
  return [];
}
// Any interaction with a card (tap, hold, its toggle or options, or its element in the preview)
// selects it, and a selected card always shows its whole description.
// Selecting by tapping a card's control (a switch, a value pill) ends the running comparison too: it used
// to set the selection before select() ran, so select() saw no change and the last setting's comparison
// kept playing (Max, Nov 23: it happened only when the new setting was picked through its control)
function touchSel(k) { if (selected === k) return; stopScenario(); if (ghosts.has(selected)) unghost(selected); selected = k; highlight(k, false); renderInspector(); }
// Descriptions show two lines; a longer one is cut (with a fade) and unfolds when its setting is
// selected, folding back when another one is. Every card keeps the same size whatever its state.
// An unfold starts two frames later, after the work that selected the card (a redraw, the preview,
// the demo) is done, so it never begins in a busy frame and stutters.
const afterBusy = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
function unfold(el) { afterBusy(() => { if (el.isConnected && el.classList.contains("long") && el.closest(".row.sel")) el.classList.add("open"); }); }
function fitSums(root = $("list"), keep = new Set()) {
  // every description measured first, then marked: one layout for the list, not one per row (performance)
  const els = (Array.isArray(root) ? root : [root]).flatMap(r => [...r.querySelectorAll(":scope > .txt > .sum:not(.need), .row > .txt > .sum:not(.need)")]); // one box, or the cards just drawn
  const sizes = els.map(el => [parseFloat(getComputedStyle(el).lineHeight) || 17.5, el.scrollHeight]);
  els.forEach((el, i) => {
    const [lh, full] = sizes[i];
    el.classList.toggle("long", full > lh * 2 + 3); // (how far it unfolds is CSS's: .sum.open, max-content)
    const want = el.classList.contains("long") && !!el.closest(".row.sel");
    if (!want) el.classList.remove("open"); else if (keep.has(el)) el.classList.add("open"); else if (!el.classList.contains("open")) unfold(el);
  });
}
function highlight(k, flash = true, reveal = false) {
  document.querySelectorAll(".sel").forEach(e => e.classList.remove("sel", "selx")); wakeRings(); syncLocked(k);
  document.querySelectorAll(`[data-k="${k}"], [data-row="${k}"], [data-also~="${k}"]`).forEach(e => e.classList.add("sel"));
  document.querySelectorAll("#list .sum.open").forEach(e => { if (!e.closest(".row.sel")) e.classList.remove("open"); }); document.querySelectorAll(`#list [data-row="${k}"] > .txt > .sum.long:not(.open)`).forEach(unfold);
  const els = [...document.querySelectorAll(`#stage [data-k="${k}"], #stage [data-also~="${k}"]`)];
  // a parent's part that covers the whole preview (the flying comments layer) doesn't flash for the settings
  // under it: the whole preview lit up for every one of them, saying nothing (Max, Nov 24: Niconico comments)
  const proxy = els.length ? [] : proxyEls(k).filter(e => !coversStage(e));
  const finish = () => { els.forEach(e => {
    fitOutline(e);
    // big components (bars, shelves) only glow: scaling them up looked like the whole preview jumping
    if (flash) flashStage(e);
  }); if (flash) proxy.forEach(e => { fitRing(e); flashStage(e); }); };
  const finish0 = finish;
  const finishAll = () => { finish0(); lastFlash = { k, t: Date.now() }; if (parentFlashFor === k) flashParents(k); };
  if (!reveal || skipReveal) { skipReveal = false; return finishAll(); }
  // wait until a growing (ghost-revealed or restored) element has its full size, then scroll to it
  const liveEls = () => [...document.querySelectorAll(`#stage [data-k="${k}"], #stage [data-also~="${k}"]`)];
  // a setting with no part of its own still scrolls to where it acts (focusEls), without an outline of its own
  const go = () => { if (selected !== k) return; const live = liveEls(); els.splice(0, els.length, ...live); fT(finishAll, revealInStage(live.length ? live : focusEls(k)) ? 340 : 0); };
  fT(() => {
    if (selected !== k) return;
    const growing = liveEls().flatMap(e => e.getAnimations()).filter(a => a.playState === "running" && isFinite(a.effect?.getComputedTiming().endTime) && a.effect?.getComputedTiming().fill !== "forwards");
    if (growing.length) { const run = clock.run("focus"); Promise.all(growing.map(a => a.finished.catch(() => {}))).then(() => { if (clock.alive("focus", run)) go(); }); } else go();
  }, 60);
}
let skipReveal = false;
// One flash look for everything: the selected element, and the parent settings it depends on,
// in the preview and in the list, all start on the same frame with the same pulse (FLASH_MS each).
const FLASH_MS = 480;
let lastFlash = { k: null, t: 0 }, parentFlashFor = null, quietFlashUntil = 0;
function flashStage(e, times = 1) {
  if (times === 1 && Date.now() < quietFlashUntil) return;
  const big = e.offsetWidth > $("stage").clientWidth * .5 || e.offsetHeight > 80; // big components only glow
  clearTimeout(e._flashT); e.classList.remove("flash", "flat", "twice"); void e.offsetWidth;
  if (!big) popOrigin(e);
  e.classList.add("flash"); e.classList.toggle("flat", big); e.classList.toggle("twice", times > 1); wakeRings();
  e._flashT = setTimeout(() => e.classList.remove("flash", "flat", "twice"), FLASH_MS * times + 40);
}
function flashRow(el) { clearTimeout(el._attnT); el.classList.remove("attn"); void el.offsetWidth; el.classList.add("attn"); el._attnT = setTimeout(() => el.classList.remove("attn"), FLASH_MS * 2 + 40); }
// The setting and its element(s) flash together: used when arriving at a setting (search, "Take me there").
function flashTarget(k) {
  document.querySelectorAll(`#stage [data-k="${k}"], #stage [data-also~="${k}"]`).forEach(e => flashStage(e, 2));
  document.querySelectorAll(`[data-row="${k}"]`).forEach(el => { if (el.offsetParent) flashRow(el); });
}
// Only the parents that actually block k: "Hide snackbar" is already off, so it does not flash
// when "Custom snackbar" is the one to switch on.
function blockingParents(k) {
  const p = PREF[k], out = [];
  const any = p.parents.filter(x => x.mode === "any");
  for (const x of p.parents) if (x.mode !== "any" && (x.mode === "not" ? !!state[x.key] : !state[x.key])) out.push(x.key);
  if (any.length && !any.some(x => !!state[x.key])) out.push(...any.map(x => x.key));
  if (!availOk(k)) out.push(...(p.availabilityParents || []), ...availKeys(k));
  return [...new Set(out)];
}
function flashParents(k) {
  parentFlashFor = null;
  flashTarget(k);
  for (const key of blockingParents(k)) {
    document.querySelectorAll(`#stage [data-k="${key}"], #stage [data-also~="${key}"]`).forEach(e => flashStage(e, 2));
    document.querySelectorAll(`[data-row="${key}"]`).forEach(flashRow);
  }
}
// Scrollable boxes inside the preview (feeds, action bars, chip rows) scroll so the selected
// element is centred before it flashes. Works for overflow:hidden strips too.
function scrollBoxes(el) {
  const out = [], stage = $("stage");
  for (let p = el.parentElement; p && p !== stage; p = p.parentElement) {
    const cs = getComputedStyle(p);
    // a sideways strip stays sideways even while a flashing (slightly scaled up) child makes it a
    // few pixels taller than its box; reading it as a vertical scroller sent the selection off screen
    // only real scrollers move: a clipped screen (overflow hidden) never scrolls, or selecting a part at
    // its edge (the fullscreen action bar) shifted the whole preview up
    const sx = !p.classList.contains("inner-scroll") && p.scrollWidth > p.clientWidth + 1 && /auto|scroll/.test(cs.overflowX);
    const sy = p.scrollHeight > p.clientHeight + (sx ? 12 : 1) && /auto|scroll/.test(cs.overflowY);
    if (sx || sy) out.push([p, sx, sy]);
  }
  return out;
}
function frameFor(el, box) {
  const lim = box.clientHeight * .9; let best = el;
  for (let q = el.parentElement; q && q !== box; q = q.parentElement) { const h = q.getBoundingClientRect().height; if (h > lim) break; if (h > best.getBoundingClientRect().height + 2) best = q; }
  return best;
}
function revealInStage(els) {
  let moved = false;
  els.filter(e => e.offsetParent || e.getClientRects().length).slice(0, 1).forEach(el => {
    scrollBoxes(el).forEach(([box, sx, sy]) => {
      // a small element inside a bigger card (a label on a thumbnail) centres the whole card,
      // so you see what it belongs to
      const r = (sy ? frameFor(el, box) : el).getBoundingClientRect(), b = box.getBoundingClientRect();
      let dx = 0, dy = 0;
      if (sx && (r.left < b.left + 4 || r.right > b.right - 4)) dx = (r.left + r.width / 2) - (b.left + b.width / 2);
      if (sy && (r.top < b.top + 4 || r.bottom > b.bottom - 4)) dy = (r.top + Math.min(r.height, b.height) / 2) - (b.top + b.height / 2);
      // absolute targets: a relative scrollBy issued while an earlier smooth scroll is still running
      // lands off target (quick successive selections). With nothing to move, stop any scroll still
      // running from the previous selection so it can't carry this element out of view.
      if (dx || dy) { box.scrollTo({ left: box.scrollLeft + dx, top: box.scrollTop + dy, behavior: "smooth" }); moved = true; }
      else box.scrollTo({ left: box.scrollLeft, top: box.scrollTop, behavior: "instant" });
    });
  });
  return moved;
}
// The selection outline sits outside the element; when that would be clipped by the preview edge,
// draw it inside instead.
// The ring (outline, flash, hold, ghost dashes) goes around what an element actually draws, not
// around its wrapper: a caption line is centred in a full-width positioning box, a menu item's text
// sits in a padded row, a dot sits in a corner of its button. Measure the painted content and, when
// the wrapper is clearly bigger, draw the ring at those insets. Runs after every render and whenever
// the selected element changes size (a slider, text typed in by an animation).
const paints = st => st.backgroundColor !== "rgba(0, 0, 0, 0)" || st.backgroundImage !== "none" || parseFloat(st.borderTopWidth) > 0 || parseFloat(st.borderBottomWidth) > 0 || st.boxShadow !== "none";
function paintedBox(el) {
  let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
  const add = q => { if (q.width < .5 || q.height < .5) return; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); };
  const walk = n => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { if (c.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(c); for (const q of rg.getClientRects()) add(q); } continue; }
      if (c.nodeType !== 1) continue;
      const st = getComputedStyle(c);
      if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") continue;
      const tag = c.tagName.toLowerCase();
      if (tag === "svg" || tag === "img" || tag === "canvas" || paints(st)) add(c.getBoundingClientRect());
      if (tag !== "svg" && st.overflow === "visible") walk(c); else if (tag !== "svg") add(c.getBoundingClientRect());
    }
  };
  walk(el);
  return r > l ? { l, t, r, b } : null;
}
function fitRing(el) {
  if (!el.isConnected || el.classList.contains("shade")) { el.classList.remove("fit"); return; }
  const st = getComputedStyle(el);
  if (st.display === "none" || paints(st)) { if (st.display !== "none") el.classList.remove("fit"); return; }
  const box = el.getBoundingClientRect(), u = paintedBox(el);
  if (!u || !box.width) { el.classList.remove("fit"); return; }
  const P = 3; // breathing room between the content and the ring
  const g = [u.l - box.left, u.t - box.top, box.right - u.r, box.bottom - u.b].map(x => Math.max(0, Math.round(x - P)));
  if (Math.max(...g) < 8) { el.classList.remove("fit"); return; }
  // an unselected ghost's ring that would run into the edge of what clips it stays just inside; a
  // selected part's ring is drawn on the ring layer instead, which may run past the preview's border
  if (!el.classList.contains("sel")) {
    const c = clipOf(el).getBoundingClientRect(), edge = [box.left - c.left, box.top - c.top, c.right - box.right, c.bottom - box.bottom];
    g.forEach((x, i) => { if (edge[i] > -3 && edge[i] + x < 4) g[i] = Math.max(x, 4 - Math.max(0, edge[i])); });
  }
  ["--fl", "--ft", "--fr", "--fb"].forEach((v, i) => el.style.setProperty(v, g[i] + "px"));
  el.classList.add("fit");
}
let ringObs = null;
function watchRing(el) {
  if (ringObs) ringObs.disconnect();
  if (!window.ResizeObserver || !el) return;
  ringObs = new ResizeObserver(() => { fitRing(el); wakeRings(); });
  ringObs.observe(el); el.querySelectorAll("*").forEach(c => ringObs.observe(c));
  if ($("stage")) ringObs.observe($("stage"));
}
function clipOf(el) {
  for (let p = el.parentElement; p && p !== $("stage"); p = p.parentElement) { const cs = getComputedStyle(p); if (cs.overflowX !== "visible" || cs.overflowY !== "visible") return p; }
  return $("stage");
}
function fitOutline(el) { fitRing(el); watchRing(el); wakeRings(); }
// ---- The selection ring above the preview frame
// The frame's rounded border clips the preview, so the ring of a part that sits against it (the
// whole-window controls background, the fullscreen action bar) and its selection pop were cut off.
// Such a ring is drawn on a layer above the frame instead, where it may run past the border; it
// follows the part through the pop, scrolling and resizing. An inner scroller's edge still applies:
// a part scrolled under a header shows no ring there, and one sitting against that edge has its
// ring drawn just inside it.
const RING_ROOM = 6;
let ringRAF = 0, ringQuiet = 0, ringKey = "", ringQuick = "", ringEls = [];
function wakeRings() { ringQuiet = 0; if (!ringRAF) ringRAF = requestAnimationFrame(ringTick); }
function ringTick() {
  ringRAF = 0;
  ringQuiet = syncRings() ? 0 : ringQuiet + 1;
  if (ringQuiet < 45) ringRAF = requestAnimationFrame(ringTick);
}
// The boxes around el that clip it (overflow other than visible), up to stop. The ring layer asks every
// frame while a part moves; which boxes clip does not change from one frame to the next, so the list is
// kept for a moment instead of reading every ancestor's style each frame (Max, Nov 22: performance).
const clipCache = new WeakMap();
function clipChain(el, stop) {
  const now = performance.now(), c = clipCache.get(el);
  if (c && c.stop === stop && now - c.at < 400) return c.list;
  const list = [];
  for (let p = el.parentElement; p && p !== stop; p = p.parentElement) {
    const cs = getComputedStyle(p); if (cs.overflowX !== "visible" || cs.overflowY !== "visible") list.push(p);
  }
  clipCache.set(el, { stop, at: now, list }); return list;
}
// the box that actually clips el: the frame, narrowed by any scroller inside it
function clipEdges(el, F) {
  let l = F.left, t = F.top, r = F.right, b = F.bottom;
  for (const p of clipChain(el, $("stage"))) {
    const q = p.getBoundingClientRect();
    l = Math.max(l, q.left); t = Math.max(t, q.top); r = Math.min(r, q.right); b = Math.min(b, q.bottom);
  }
  return { l, t, r, b };
}
function ringGeom(el, F, frameR) {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  const A = clipEdges(el, F), s = el.offsetWidth ? r.width / el.offsetWidth : 1;
  const fit = el.classList.contains("fit"), ghost = el.classList.contains("ghost");
  const off = (ghost && fit ? 1 : 2) * s, w = (ghost ? 1.5 : 2) * s, d = off + w;
  const v = n => fit ? (parseFloat(el.style.getPropertyValue(n)) || 0) * s : 0;
  const bx = { l: r.left + v("--fl"), t: r.top + v("--ft"), r: r.right - v("--fr"), b: r.bottom - v("--fb") };
  // only a ring that would reach what clips the part (now, or while the pop scales it) moves here
  const mx = Math.max(RING_ROOM, r.width * .06), my = Math.max(RING_ROOM, r.height * .06);
  if (bx.l - d - mx >= A.l && bx.t - d - my >= A.t && bx.r + d + mx <= A.r && bx.b + d + my <= A.b) return null;
  const R = { l: bx.l - d, t: bx.t - d, r: bx.r + d, b: bx.b + d }, cut = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
  // the frame's own edge: the ring runs past it, unless the part itself is cut off there
  // a scroller's edge inside the frame: the ring is drawn just inside it, or cut where the part is scrolled past it
  if (A.l > F.left + 2) { if (bx.l >= A.l - 3) R.l = Math.max(R.l, A.l); else cut.l = A.l; } else if (bx.l < F.left - 3) cut.l = F.left;
  if (A.t > F.top + 2) { if (bx.t >= A.t - 3) R.t = Math.max(R.t, A.t); else cut.t = A.t; } else if (bx.t < F.top - 3) cut.t = F.top;
  if (A.r < F.right - 2) { if (bx.r <= A.r + 3) R.r = Math.min(R.r, A.r); else cut.r = A.r; } else if (bx.r > F.right + 3) cut.r = F.right;
  if (A.b < F.bottom - 2) { if (bx.b <= A.b + 3) R.b = Math.min(R.b, A.b); else cut.b = A.b; } else if (bx.b > F.bottom + 3) cut.b = F.bottom;
  const ins = [cut.t - R.t, R.r - cut.r, R.b - cut.b, cut.l - R.l].map(x => Math.max(0, x));
  const hidden = R.r - R.l - ins[1] - ins[3] < 2 * w + 1 || R.b - R.t - ins[0] - ins[2] < 2 * w + 1;
  // corners follow the ring's usual curve; one at a corner of the frame follows the frame's curve
  const cs = getComputedStyle(el, fit ? "::before" : null), ref = Math.min(bx.r - bx.l, bx.b - bx.t);
  const px = x => String(x).endsWith("%") ? parseFloat(x) * ref / 100 : parseFloat(x) || 0;
  const aL = Math.abs(bx.l - F.left) <= 3, aR = Math.abs(bx.r - F.right) <= 3, aT = Math.abs(bx.t - F.top) <= 3, aB = Math.abs(bx.b - F.bottom) <= 3;
  const corner = (prop, x, y) => Math.round((x && y ? frameR : px(cs[prop]) * s) + d);
  const rad = [corner("borderTopLeftRadius", aL, aT), corner("borderTopRightRadius", aR, aT), corner("borderBottomRightRadius", aR, aB), corner("borderBottomLeftRadius", aL, aB)];
  return { R, ins, hidden, w, ghost, rad };
}
function syncRings() {
  const st = $("stage"), layer = $("ringLayer");
  if (!st || !layer) return false;
  st.querySelectorAll(".selx:not(.sel)").forEach(e => e.classList.remove("selx"));
  // nothing selected in the preview, or the preview hidden: no ring to place, and no layout to read
  // (asking whether the preview is shown is itself a layout, so it comes second; Max, Nov 22: performance)
  // (nor while a comparison covers the preview: a setting that has both a part in the preview and a
  // comparison, such as Bypass Ambient mode restrictions, drew its part's ring across the two phones)
  const sel = [...st.querySelectorAll(".c.sel")], live = sel.length && st.offsetParent && !$("canvas").classList.contains("show") ? sel : [];
  if (!live.length) { if (layer.firstChild) layer.replaceChildren(); ringQuick = ""; const k = ""; const ch = k !== ringKey; ringKey = k; return ch; }
  const L = layer.getBoundingClientRect(), F = st.getBoundingClientRect();
  // nothing moved since the last frame (the same parts, at the same places, the frame and the layer
  // where they were): the rings stay as drawn, without reading any styles (performance)
  const rk = q => `${q.left},${q.top},${q.width},${q.height}`;
  const quick = [rk(L), rk(F), innerWidth, innerHeight, ...live.map(el => rk(el.getBoundingClientRect()) + el.className + el.getAttribute("style"))].join("|");
  if (quick === ringQuick && live.length === ringEls.length && live.every((el, i) => el === ringEls[i])) return false;
  ringQuick = quick; ringEls = live;
  const sb = getComputedStyle(st.parentElement);
  const frameR = Math.max(0, parseFloat(sb.borderTopLeftRadius) - parseFloat(sb.borderTopWidth) || 0);
  const out = [];
  // what of the ring layer can be seen: the screen and every clipping box around the preview. A ring
  // that would run past it (the preview pinned at the top of the screen after scrolling, its edge on the
  // screen's edge) is drawn just inside instead, so no side of it ever disappears (Max, Nov 20)
  const V = { l: 0, t: 0, r: innerWidth, b: innerHeight };
  for (const a of clipChain(layer, document.documentElement)) {
    const q = a.getBoundingClientRect(); V.l = Math.max(V.l, q.left); V.t = Math.max(V.t, q.top); V.r = Math.min(V.r, q.right); V.b = Math.min(V.b, q.bottom);
  }
  let key = `${Math.round(F.left)},${Math.round(F.top)},${Math.round(V.t)},${Math.round(V.b)}`;
  for (const el of live) {
    const g = ringGeom(el, F, frameR);
    if (g) {
      const R = g.R, was = { ...R };
      R.l = Math.max(R.l, V.l); R.t = Math.max(R.t, V.t); R.r = Math.min(R.r, V.r); R.b = Math.min(R.b, V.b);
      g.ins = [g.ins[0] - (R.t - was.t), g.ins[1] - (was.r - R.r), g.ins[2] - (was.b - R.b), g.ins[3] - (R.l - was.l)].map(x => Math.max(0, x));
      if (R.r - R.l < 2 * g.w + 1 || R.b - R.t < 2 * g.w + 1) g.hidden = true;
    }
    el.classList.toggle("selx", !!g);
    if (!g) { const q = el.getBoundingClientRect(); key += `|${q.left | 0},${q.top | 0},${q.width | 0},${q.height | 0}`; continue; }
    const f = n => Math.round(n * 10) / 10;
    out.push({ ghost: g.ghost, css: g.hidden ? "display:none" : `left:${f(g.R.l - L.left)}px;top:${f(g.R.t - L.top)}px;width:${f(g.R.r - g.R.l)}px;height:${f(g.R.b - g.R.t)}px;border-width:${f(g.w)}px;border-radius:${g.rad.map(x => x + "px").join(" ")};clip-path:inset(${g.ins.map(x => f(x) + "px").join(" ")})` });
  }
  while (layer.children.length > out.length) layer.lastChild.remove();
  while (layer.children.length < out.length) layer.appendChild(document.createElement("i"));
  out.forEach((o, i) => { const ring = layer.children[i]; if (ring._css !== o.css) { ring.style.cssText = o.css; ring._css = o.css; } ring.classList.toggle("ghost", o.ghost); key += "|" + o.css; });
  const changed = key !== ringKey; ringKey = key;
  return changed;
}
// anything that moves or resizes the selected part wakes the ring layer for a moment
["scroll", "animationstart", "animationiteration", "transitionrun"].forEach(t => document.addEventListener(t, e => {
  // a comparison or demo playing over the preview (#canvas) moves nothing a ring follows
  const st = $("stage"); if (st && e.target instanceof Element && (st.contains(e.target) || e.target.contains(st)) && !e.target.closest("#canvas")) wakeRings();
}, { capture: true, passive: true }));
window.addEventListener("resize", wakeRings);
// the pop grows away from a clipping edge the part sits against, so it is never cut off there
function popOrigin(e) {
  const st = $("stage"); if (!st || !st.contains(e)) return;
  const r = e.getBoundingClientRect(), A = clipEdges(e, st.getBoundingClientRect()), gx = r.width * .06 + 1, gy = r.height * .06 + 1;
  const L = r.left - A.l < gx, R = A.r - r.right < gx, T = r.top - A.t < gy, B = A.b - r.bottom < gy;
  e.style.setProperty("--pop", `${L === R ? "center" : L ? "left" : "right"} ${T === B ? "center" : T ? "top" : "bottom"}`);
}
// A scroll that follows its target while it moves: the row's place is read again on every frame, so a
// preview, top bar or description changing size mid-scroll bends the path instead of ending off target
// and needing a second scroll. Touching the list takes over at once.
let rowGlide = null;
["wheel", "touchstart", "pointerdown", "keydown"].forEach(t => document.addEventListener(t, e => { if (rowGlide && $("scroller")?.contains(e.target)) rowGlide = null; }, { capture: true, passive: true }));
function glideScrollTo(sc, targetOf, ms = 620) {
  const id = {}, t0 = performance.now(), y0 = sc.scrollTop; rowGlide = id;
  progScrollUntil = t0 + ms + 400;
  const step = now => {
    if (rowGlide !== id) return;
    const raw = targetOf(); if (Number.isNaN(raw)) { rowGlide = null; return; }
    const t = Math.min(1, (now - t0) / ms), y1 = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, raw));
    sc.scrollTop = y0 + (y1 - y0) * moveEase(t);
    // after the move, hold the row in place a little longer while late layout changes settle
    if (now - t0 < ms + 350) requestAnimationFrame(step); else rowGlide = null;
  };
  requestAnimationFrame(step);
}
function scrollRowIntoView(k, center) {
  const row = document.querySelector(`[data-row="${k}"]`); if (!row) return;
  if (center) { // centred: one continuous move that tracks the row (see glideScrollTo)
    const sc = $("scroller");
    glideScrollTo(sc, () => {
      const r = document.querySelector(`[data-row="${k}"]`); if (!r || selected !== k) return NaN;
      const two = $("content").offsetWidth >= 600 && !$("content").classList.contains("stacked"), stickH = two ? 0 : $("stick").offsetHeight;
      const top = r.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
      return top - stickH - (sc.clientHeight - stickH) / 2 + r.offsetHeight / 2;
    });
    return;
  }
  const sc = $("scroller"), two = $("content").offsetWidth >= 600 && !$("content").classList.contains("stacked"), stickH = two ? 0 : $("stick").offsetHeight;
  const top = row.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
  const target = center ? top - stickH - (sc.clientHeight - stickH) / 2 + row.offsetHeight / 2 : top - stickH - 8;
  if (center || top < sc.scrollTop + stickH || top + row.offsetHeight > sc.scrollTop + sc.clientHeight) { progScrollUntil = performance.now() + 900; sc.scrollTo({ top: target, behavior: "smooth" }); }
}

// ------------------------------------------------------------------ scrolling and rubber-band ends
// Max, Nov 24 (every design): pulling a list past its top or bottom drags it on with growing resistance
// and it springs back when let go; a fling that runs into an end bounces a little past it.
// Max, Nov 24 evening: scrolling 20% less sensitive. A finger on the list (or the screen menu) moves it
// SCROLL_K as far as the finger moves, and a fling leaves at SCROLL_K of the finger's speed, then slows on
// Android's own fling curve (OverScroller's spline and friction, flingPlan), so it feels like the phone's
// other lists, only shorter. The list does its own vertical scrolling for that: its touch-action keeps
// only sideways panning (strips, sliders) and pinch for the browser; a scrolling box inside it keeps its
// own native scrolling. At the top the whole page moves (preview and list); at the bottom only the list
// moves, under the pinned preview. Mouse wheels and trackpads scroll natively.
const RUBBER_REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
const SCROLL_K = .8;
// Android's fling (SplineOverScroller): the distance and time a fling at v px/s travels, and the shape of
// its slowing down (a table of the position along the way, 0 to 1)
const FLING_NB = 100, FLING_POS = (() => {
  const P = new Float64Array(FLING_NB + 1), I = .35, P1 = .5 * I, P2 = 1 - (1 - I);
  let xMin = 0;
  for (let i = 0; i < FLING_NB; i++) {
    const a = i / FLING_NB; let xMax = 1, x = 0, coef = 0;
    for (let n = 0; n < 60; n++) { x = xMin + (xMax - xMin) / 2; coef = 3 * x * (1 - x); const tx = coef * ((1 - x) * P1 + x * P2) + x * x * x; if (Math.abs(tx - a) < 1e-5) break; if (tx > a) xMax = x; else xMin = x; }
    P[i] = coef * ((1 - x) * .5 + x) + x * x * x;
  }
  P[FLING_NB] = 1; return P;
})();
function flingPlan(v) { // v in CSS px/s; Android works in device px with its screen density
  const dpr = window.devicePixelRatio || 1, fr = .015 * 9.80665 * 39.37 * 160 * dpr * .84, DR = Math.log(.78) / Math.log(.9);
  const l = Math.log(.35 * Math.abs(v) * dpr / fr);
  return { dist: Math.sign(v) * fr * Math.exp(DR / (DR - 1) * l) / dpr, dur: 1000 * Math.exp(l / (DR - 1)) };
}
function rubberBand(sc, topEl, botEl) {
  if (!sc || !topEl || !botEl) return;
  let pull = null, last = { s: 0, t: 0, v: 0 }, bounce = null, flingRaf = 0, selfUntil = 0;
  const room = () => Math.max(0, sc.scrollHeight - sc.clientHeight);
  sc.style.touchAction = "pan-x pinch-zoom";
  // iOS's rubber curve, half as far (Max, Nov 24: "reduce the bounciness by 50%"): 1:2 at first, never
  // more than half the list's height; measured in finger px past the end
  const RUBBER_K = .5;
  const rubber = d => { const D = sc.clientHeight || 600, x = Math.abs(d); return Math.sign(d) * (1 - 1 / (x * .55 / D + 1)) * D * RUBBER_K; };
  const put = (el, y) => { el.style.translate = y ? `0 ${y}px` : ""; };
  const stopBounce = () => { if (bounce) { bounce.cancel(); bounce = null; } };
  const stopFling = () => { if (flingRaf) { cancelAnimationFrame(flingRaf); flingRaf = 0; } };
  const scrollTo = y => { selfUntil = performance.now() + 120; sc.scrollTop = y; };
  // back to rest on a critically damped spring from offset y (px) with velocity v (px/s)
  const settle = (el, y, v = 0) => {
    stopBounce(); put(el, 0);
    const w = 16, fr = [];
    for (let t = 0; t <= .5; t += 1 / 60) { const x = (y + (v + w * y) * t) * Math.exp(-w * t); fr.push({ translate: `0 ${x.toFixed(2)}px` }); }
    fr.push({ translate: "0 0px" });
    bounce = el.animate(fr, { duration: 500, easing: "linear" });
    bounce.onfinish = () => { bounce = null; };
  };
  // a fling that runs into an end goes on a little past it, then comes back (at most about 17 px)
  const hitEnd = (atTop, vel) => { if (!RUBBER_REDUCED.matches) settle(atTop ? topEl : botEl, 0, Math.min(3000, Math.abs(vel)) * .5 * RUBBER_K * (atTop ? 1 : -1)); };
  const fling = v => {
    stopFling();
    const plan = flingPlan(v); if (!(plan.dur > 16) || Math.abs(plan.dist) < 1) return;
    const s0 = sc.scrollTop, t0 = performance.now(); let at = s0;
    const step = now => {
      flingRaf = 0;
      if (Math.abs(sc.scrollTop - at) > 1) return; // something else scrolled the list: it wins
      const x = Math.min(1, (now - t0) / plan.dur), i = Math.min(FLING_NB - 1, Math.floor(x * FLING_NB)), d = FLING_POS[i + 1] - FLING_POS[i];
      const y = s0 + plan.dist * (FLING_POS[i] + d * (x * FLING_NB - i)), vel = d * FLING_NB * plan.dist / plan.dur * 1000, R = room();
      if (y <= 0 || y >= R) { scrollTo(y <= 0 ? 0 : R); if (x < 1) hitEnd(y <= 0, vel); return; }
      scrollTo(y); at = sc.scrollTop;
      if (x < 1) flingRaf = requestAnimationFrame(step);
    };
    flingRaf = requestAnimationFrame(step);
  };
  // a box inside the list that scrolls up and down itself keeps the finger
  const innerY = t => { for (let e = t; e && e !== sc && e.nodeType === 1; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY)) return true; return false; };
  sc.addEventListener("touchstart", e => {
    const caught = !!flingRaf;
    eatEnd(); stopFling(); stopBounce(); put(topEl, 0); put(botEl, 0);
    if (e.touches.length !== 1 || innerY(e.target)) { pull = null; return; }
    const t = e.touches[0];
    pull = { x: t.clientX, y: t.clientY, s0: sc.scrollTop, on: false, pts: [], caught, over: 0 };
  }, { passive: true });
  sc.addEventListener("touchmove", e => {
    if (!pull) return;
    const t = e.touches[0], dx = t.clientX - pull.x, dy = t.clientY - pull.y;
    if (!pull.on) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { pull = null; return; } // sideways: the browser's
      if (Math.abs(dy) < 8) return;
      pull.on = true; pull.y += Math.sign(dy) * 8;
      document.documentElement.classList.add("touchwait"); // no press looks while the list moves (as when the browser scrolled)
    }
    if (e.cancelable) e.preventDefault();
    const now = performance.now(); pull.pts.push([now, t.clientY]);
    while (pull.pts.length > 2 && now - pull.pts[0][0] > 100) pull.pts.shift();
    const R = room(), s = pull.s0 - (t.clientY - pull.y) * SCROLL_K, rub = !RUBBER_REDUCED.matches;
    put(topEl, 0); put(botEl, 0); pull.over = 0;
    if (s < 0 && rub) { scrollTo(0); pull.over = rubber(-s / SCROLL_K); pull.el = topEl; put(topEl, pull.over); }
    else if (s > R && rub) { scrollTo(R); pull.over = -rubber((s - R) / SCROLL_K); pull.el = botEl; put(botEl, pull.over); }
    else scrollTo(Math.max(0, Math.min(R, s)));
  }, { passive: false });
  // the click a lifted finger may still bring: a tap that stops a fling only stops it (as on the phone's own
  // lists), and a finger that moved the list taps nothing
  // (only that click: the next touch ends the wait)
  let eat = null;
  const eatEnd = () => { if (eat) { document.removeEventListener("click", eat, true); eat = null; } };
  const eatClick = () => { eatEnd(); eat = ev => { ev.stopPropagation(); ev.preventDefault(); eatEnd(); }; document.addEventListener("click", eat, true); setTimeout(eatEnd, 400); };
  const end = e => {
    const p = pull; pull = null; if (!p) return;
    if (!p.on) { if (p.caught && e.type === "touchend") eatClick(); return; }
    if (e.type === "touchend") eatClick();
    if (p.over) { settle(p.el, p.over); return; }
    if (e.type !== "touchend") return;
    // the finger's speed over its last 100 ms (least squares), none when it stood still before lifting
    const pts = p.pts, now = performance.now();
    if (pts.length < 2 || now - pts[pts.length - 1][0] > 40) return;
    const n = pts.length, mt = pts.reduce((a, q) => a + q[0], 0) / n, my = pts.reduce((a, q) => a + q[1], 0) / n;
    let num = 0, den = 0; pts.forEach(([t, y]) => { num += (t - mt) * (y - my); den += (t - mt) ** 2; });
    const vf = den ? Math.max(-8000, Math.min(8000, num / den * 1000)) : 0; // px/s, as Android's maximum fling
    if (Math.abs(vf) >= 50) fling(-vf * SCROLL_K);
  };
  sc.addEventListener("touchend", end); sc.addEventListener("touchcancel", end);
  sc.addEventListener("scroll", () => {
    const now = performance.now(), s = sc.scrollTop, dt = now - last.t;
    if (dt > 0 && dt < 100) last.v = (s - last.s) / dt * 1000; else last.v = 0;
    // a wheel or trackpad fling (the browser's own) that runs into an end bounces too
    if (!pull && now > selfUntil && Math.abs(last.v) > 600 && (s <= .5 && last.s > .5 || s >= room() - .5 && last.s < room() - .5)) hitEnd(s <= .5, last.v);
    last.s = s; last.t = now;
  }, { passive: true });
}
rubberBand($("scroller"), $("content"), $("list"));
rubberBand($("picker"), $("pickGrid"), $("pickGrid"));
