"use strict";
// Live demos: the looping animations played on the preview itself for gestures and behaviours.

// ------------------------------------------------------------------ demos (gesture / behaviour), faster loop
const LOOP_MS = 1500;
let demoStep = 0;
// What each demo does, by type. A bug or a wish that applies to one type ("should also play while the
// element is only previewed") is fixed once, for the whole type, in startDemo / the shared helpers.
//   transient  the setting's own element appears during a gesture and goes again (a hint, a thumbnail,
//              a sheet). When your settings hide it, the selected element is previewed as a ghost and the
//              demo still spawns and removes it, on the ghost, so you see what you are hiding.
//   gesture    a finger does something and the result shows (seek, swipe, double-tap, tap and hold);
//              the element it acts on comes from NEEDS when your settings hide it.
//   toast      a confirmation pill appears (remember speed / quality).
//   motion     an element already on screen changes over time (countdown, glow, captions, nav width).
//   overlay    guides drawn over the player (swipe zones and their style, size and colours).
// Comparisons (Off / On side by side) are not demos: they live in scenarios.js (scen()).
const DEMO_TYPES = {
  transient: "hide_player_gesture_hints hide_shorts_gesture_hints hide_shorts_paused_overlay_buttons seekbar_thumbnail_preview sb_create_new_segment sb_create_new_segment_step sb_voting_button",
  gesture: "tap_to_seek slide_to_seek disable_precise_seeking_gesture swipe_seek disable_shorts_double_tap_to_like swap_save_and_queue_actions",
  toast: "remember_playback_speed_last_selected_toast remember_video_quality_last_selected_toast",
  motion: "exit_fullscreen disable_like_subscribe_glow stable_caption_blocks niconico_comments",
  overlay: "swipe_left_zone swipe_right_zone swipe_top_zone swipe_overlay_style swipe_overlay_background_opacity swipe_text_overlay_size swipe_overlay_progress_volume_color swipe_overlay_progress_brightness_color swipe_overlay_progress_speed_color swipe_zone_width swipe_overlay_timeout swipe_speed_step swipe_speed_sensitivity swipe_zone_preview swipe_speed_zone_height",
};
const DEMO_TYPE = {};
Object.entries(DEMO_TYPES).forEach(([t, ks]) => ks.split(" ").forEach(k => { DEMO_TYPE["morphe_" + k] = t; }));
// true while a transient demo plays on a ghost (its element is hidden by your settings)
let demoOnGhost = false;
// fade a selectable element in or out, also when it is a ghost (whose opacity is otherwise fixed)
function fadeC(el, show) { if (!el) return; el.classList.add("dzt"); el.classList.toggle("dz", !show); }
// Every timer a demo starts runs on the clock's "demo" track, so switching to another setting (or
// toggling this one) cancels what the previous run still had queued, and the finger starts clean:
// no hold ring, seek position or toast from the last demo leaks into the next.
const dT = (fn, ms) => clock.after("demo", ms, fn);
const dEvery = (fn, ms) => clock.every("demo", ms, fn);
// cleanups a demo registers for when it is cut short (another setting selected mid-animation)
const demoUndo = [];
const onDemoStop = fn => { if (demoUndo.length < 8) demoUndo.push(fn); };
function stopDemo() {
  clock.stop("demo");
  demoUndo.splice(0).forEach(fn => { try { fn(); } catch { /* the scene was redrawn */ } });
  demoOnGhost = false;
  document.querySelectorAll("#stage .finger").forEach(f => { f.style.transition = "none"; f.classList.remove("show", "hold", "tap"); });
  document.querySelectorAll("#stage .toastin.dyn").forEach(n => n.remove()); document.querySelectorAll("#stage .demo-label.dyn").forEach(n => { n.style.opacity = "0"; setTimeout(() => { n.remove(); showSceneLabel(); }, 250); }); }
const showSceneLabel = () => { if (!document.querySelector("#stage .demo-label.dyn")) document.querySelectorAll("#stage .demo-label:not(.dyn)").forEach(n => { n.style.visibility = ""; }); };
// Demos no longer caption themselves (Max, Round 24: the animation explains itself). Only notes
// that say why nothing shows (force) still appear.
function label(text, bad, ms, force) {
  if (!force) return;
  const st = $("stage");
  st.querySelectorAll(".demo-label.dyn").forEach(n => n.remove());
  st.querySelectorAll(".demo-label:not(.dyn)").forEach(n => { n.style.visibility = "hidden"; }); // the scene's own label would sit right under it
  const d = document.createElement("div");
  d.className = "demo-label dyn" + (bad ? " bad" : "");
  d.textContent = text + (demoOnGhost ? " (hidden)" : "");
  st.firstElementChild?.appendChild(d);
  const top = d.getBoundingClientRect().bottom - (st.firstElementChild || st).getBoundingClientRect().top + 8;
  st.querySelectorAll(".toastin.dyn").forEach(t => { if (parseFloat(t.style.top) < top) t.style.top = top + "px"; }); // a pill shown first moves below
  if (ms) dT(() => { d.style.opacity = "0"; setTimeout(() => { d.remove(); showSceneLabel(); }, 300); }, ms);
}
const ENDSCREEN_SEL = new Set(["morphe_hide_autoplay_preview", "morphe_hide_end_screen_suggested_video"]);
function finger() { return document.querySelector("#stage .finger"); }
// A part of the stage that a demo moves often has its resting value as an inline style of its own
// (the seekbar's fill and knob, the thumbnail bubble). Clearing the property after the demo dropped that
// value: the bubble sat clipped at the edge, the seekbar lost its glide. keepRest remembers the
// inline value before the demo first writes it; toRest puts it back. Every demo uses these.
function keepRest(el, prop) { if (el && el.dataset["rest_" + prop] === undefined) el.dataset["rest_" + prop] = el.style[prop]; }
function toRest(el, prop) { if (el) el.style[prop] = el.dataset["rest_" + prop] || ""; }
// A part that a demo moved goes back to its start without travelling there: it fades out where it
// is and fades in at its start, like the finger but faster (Max, round 141, for every such part).
// `back` puts everything in its starting place; it runs while the parts are invisible.
const FADE_BACK = 110;
// The next round of a demo can begin before the fade has finished: fadeBackStop(els) at the start of a
// round drops the steps still due, so they don't put a transition back onto a part that is now
// following the finger (Max, round 142: the thumb lagged behind the finger in Seekbar thumbnails).
function fadeBack(els, back) {
  els = els.filter(Boolean); if (!els.length) return back();
  const tok = {}, mine = () => els.every(e => e._fadeBack === tok);
  els.forEach(e => e._fadeBack = tok);
  const show = () => els.forEach(e => { e._fadeBack = null; e.style.opacity = ""; toRest(e, "transition"); });
  onDemoStop(show);
  els.forEach(e => { keepRest(e, "transition"); e.style.transition = `opacity ${FADE_BACK}ms var(--ease)`; e.style.opacity = "0"; });
  dT(() => {
    if (!mine()) return;
    back(); els.forEach(e => e.style.transition = "none"); void els[0].offsetWidth;
    els.forEach(e => { e.style.transition = `opacity ${FADE_BACK}ms var(--ease)`; e.style.opacity = ""; });
    dT(() => { if (mine()) els.forEach(e => { e._fadeBack = null; toRest(e, "transition"); }); }, FADE_BACK + 20);
  }, FADE_BACK);
}
function fadeBackStop(els) { els.forEach(e => { if (e && e._fadeBack) { e._fadeBack = null; e.style.opacity = ""; } }); }
// Demos give the finger's spot in the preview's coordinates (from #stage's box). The finger is drawn
// inside a part of the scene, often one that scrolls (the watch page), so the spot is turned into that
// part's own coordinates, scroll included: measured while the page still scrolled back to its top, the
// finger otherwise appeared at the very top of the screen and stayed off its target (Max, Nov 25,
// Video action bar layout). Every stage demo places its finger through here.
function place(f, x, y, ms) {
  const p = f.offsetParent, st = $("stage");
  if (p && p !== st && st.contains(p)) { const a = st.getBoundingClientRect(), b = p.getBoundingClientRect(); x += a.left - b.left + p.scrollLeft - p.clientLeft; y += a.top - b.top + p.scrollTop - p.clientTop; }
  fingerShow(f, x, y, ms);
}
function hideF(f, after) { dT(() => { f.classList.remove("show", "hold"); }, after); }
function tapAt(x, y, f = finger()) { if (!f) return; place(f, x, y); f._lifted = true; f.classList.remove("tap"); void f.offsetWidth; f.classList.add("tap"); hideF(f, 520); }
function fmt(total, pct) { const s = Math.round(total * pct / 100); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function setSeek(pct) { const p = $("played"); if (p) p.style.width = pct + "%"; ["knob", "knobRing"].forEach(id => { const k = $(id); if (k) k.style.left = pct + "%"; }); }
// A message pill on the live preview: on the screen that is on top (a story's cover, else the preview).
function showPill(text, ms = 1100) {
  const st = covers().pop() || $("stage").firstElementChild; if (!st) return;
  const d = document.createElement("div"); d.className = "toastin dyn"; d.textContent = text; st.appendChild(d);
  placePill(d, st);
  flash7(d); // the same blue double pulse as a changing part in the comparisons, so the eye finds it
  dT(() => d.remove(), ms);
}
// Where a message pill goes: the highest spot inside the preview box where it covers nothing: no
// button, badge, readout or other message, and no text. On a crowded screen every spot covers
// something: then it takes the spot that covers least. It never leaves the box (stepping below one
// part after another used to push it out under the bottom edge, where it was cut off).
const PILL_PARTS = ".toastin, .demo-label, .c, .chip, .badge-txt, .pbtn, .time";
function placePill(d, host) {
  const stage = $("stage"), hr = host.getBoundingClientRect(), vr = stage.getBoundingClientRect(), k = (vr.width / (stage.offsetWidth || 1)) || 1;
  const seen = e => { if (!e.getClientRects().length) return false; const cs = getComputedStyle(e); return cs.visibility !== "hidden" && parseFloat(cs.opacity) > .05; }; // a hidden part is no obstacle
  const boxes = [], area = hr.width * hr.height || 1;
  // Nor is a part with something else drawn over its middle (the centre button under the end screen's
  // cards). The hit test tells: a cover ignores taps, so it is opened to the test while this runs.
  const pe = host.style.pointerEvents; host.style.pointerEvents = "auto";
  const under = (e, q) => { const top = document.elementsFromPoint((q.left + q.right) / 2, (q.top + q.bottom) / 2).find(h => host.contains(h) && h !== d && !d.contains(h)); return !!top && !e.contains(top) && !top.contains(e); };
  host.querySelectorAll(PILL_PARTS).forEach(e => { // only small parts count, not whole panels
    if (e === d || e.contains(d) || !seen(e)) return;
    const q = e.getBoundingClientRect(); if (q.width * q.height <= area * .2 && !under(e, q)) boxes.push([q, 3]);
  });
  host.style.pointerEvents = pe;
  const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT), range = document.createRange();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!n.nodeValue.trim() || d.contains(n) || !seen(n.parentElement)) continue;
    range.selectNodeContents(n); const q = range.getBoundingClientRect(); if (q.width > 1 && q.height > 1) boxes.push([q, 1]);
  }
  const first = 14, last = (Math.min(hr.bottom, vr.bottom) - Math.max(hr.top, vr.top)) / k - d.offsetHeight - 12;
  d.style.top = first + "px";
  // measured with the room its pulse takes (it grows by 30% around its middle, plus the ring)
  const a = d.getBoundingClientRect(), gx = a.width * .15 + 3 * k, gy = a.height * .15 + 3 * k;
  let best = first, least = Infinity;
  for (let top = first; top <= Math.max(first, last); top += 4) {
    const dy = (top - first) * k; let cost = 0;
    for (const [q, w] of boxes) {
      const ox = Math.min(a.right + gx, q.right) - Math.max(a.left - gx, q.left), oy = Math.min(a.bottom + dy + gy, q.bottom) - Math.max(a.top + dy - gy, q.top);
      if (ox > 2 && oy > 2) cost += ox * oy * w;
    }
    if (cost < least) { least = cost; best = top; if (!cost) break; }
  }
  d.style.top = best + "px";
}
// A gesture that the setting leaves without effect says so, in the same words as the comparisons
// ("Nothing happens"): a finger moving over a preview where nothing answers looked broken.
const nothing7 = (ms = 1100) => showPill("Nothing happens", ms);
const DEMOS = {
  morphe_tap_to_seek(on) {
    const seek = $("seek"); if (!seek) return;
    const st = $("stage").getBoundingClientRect(), r = seek.getBoundingClientRect();
    const pct = [72, 30, 55, 88, 12][demoStep % 5];
    tapAt(r.left - st.left + r.width * pct / 100, r.top - st.top + r.height / 2); onDemoStop(() => setSeek(17));
    if (on) { dT(() => setSeek(pct), 120); label(`Tap on seekbar: jumps to ${fmt(18 * 60 + 42, pct)}`); }
    else { label("Tap on seekbar: nothing happens. Stock YouTube needs a drag.", true); dT(() => nothing7(900), 200); }
  },
  morphe_slide_to_seek(on) {
    const f = finger(); if (!f) return; const W = $("stage").clientWidth;
    place(f, W * .3, 90); f.classList.add("hold"); onDemoStop(() => setSeek(17));
    if (on) {
      // every loop starts from the resting point, so the seekbar moves each time, in step with the finger
      const moving = [$("played"), $("knob"), $("knobRing")].filter(Boolean);
      moving.forEach(e => { keepRest(e, "transition"); e.style.transition = "none"; }); setSeek(17); void $("stage").offsetWidth;
      label("Press and hold the video, then slide: seeks");
      dT(() => { place(f, W * .7, 90, 700); moving.forEach(e => e.style.transition = "width .7s var(--ease), left .7s var(--ease)"); setSeek(60); }, 250);
      dT(() => moving.forEach(e => toRest(e, "transition")), 1000); onDemoStop(() => moving.forEach(e => toRest(e, "transition")));
    }
    else { label("Press and hold the video: plays at 2x speed (stock)", true); showPill("2x ▸▸"); }
    hideF(f, 1150);
  },
  morphe_disable_precise_seeking_gesture(disabled) {
    const film = $("film"), f = finger(); if (!film || !f) return; const st = $("stage");
    place(f, st.clientWidth * .42, st.clientHeight - 40);
    dT(() => place(f, st.clientWidth * .42, st.clientHeight - 110, 450), 120);
    // the thumbnails rise into place one after another, then fade out together
    const cards = [...film.children], ease = "cubic-bezier(.2,.8,.2,1)";
    if (!disabled) {
      dT(() => { film.style.display = "flex"; cards.forEach((c, i) => c.animate([{ opacity: 0, transform: "translateY(10px) scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: Math.abs(i - 2) * 45, easing: ease, fill: "backwards" })); }, 430);
      dT(() => film.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(4px)" }], { duration: 220, easing: ease, fill: "forwards" }), 1050);
      label("Pull up on the seekbar: precise seeking opens");
    } else {
      // a gesture that is off has no hint: "Pull up for precise seeking" beside "Nothing happens" contradicted itself
      const hint = document.querySelector('#stage [data-k="morphe_hide_player_gesture_hints"]');
      if (hint) { const was = hint.style.visibility; hint.style.visibility = "hidden"; onDemoStop(() => { hint.style.visibility = was; }); }
      label("Pull up on the seekbar: precise seeking stays off", true); dT(() => nothing7(700), 500);
    }
    const close = () => { film.style.display = "none"; film.getAnimations().forEach(a => a.cancel()); };
    dT(close, 1290); hideF(f, 1150); onDemoStop(close);
  },
  morphe_swipe_left_zone(v) { swipeDemo("left", v); },
  morphe_swipe_right_zone(v) { swipeDemo("right", v); },
  // the overlay style (and its opacity and text size) is shared by every swipe zone: alternate sides
  morphe_swipe_overlay_style() {
    const side = ["left", "right", "top"][demoStep % (V("morphe_swipe_top_zone") && V("morphe_swipe_top_zone") !== "OFF" ? 3 : 2)];
    const v = V("morphe_swipe_" + side + "_zone");
    swipeDemo(side, v && v !== "OFF" ? v : side === "left" ? "BRIGHTNESS" : side === "right" ? "VOLUME" : "SPEED", "Shared by every zone · ");
  },
  morphe_swipe_top_zone(v) { swipeDemo("top", v); },
  // the overlay shows the way it is set up, and stays for the timeout after the finger lifts; the loop
  // waits for it, so a long timeout plays out in full
  morphe_swipe_overlay_timeout() {
    const ms = Math.max(0, Math.min(5000, Number(V("morphe_swipe_overlay_timeout")) || 0)), every = Math.ceil((1300 + ms) / LOOP_MS);
    if (demoStep % every) return;
    const side = ["left", "right", "top"].find(x => { const v = V("morphe_swipe_" + x + "_zone"); return v && v !== "OFF"; }) || "left";
    const v = V("morphe_swipe_" + side + "_zone");
    swipeDemo(side, v && v !== "OFF" ? v : "BRIGHTNESS", "", false, ms);
    dT(() => label(`Finger lifted: the overlay stays ${ms} ms`, false, ms + 200), 1050);
  },
  morphe_swipe_speed_step() { swipeDemo(speedSide(), "SPEED"); dT(() => label(`Speed changes in ${(SPEED_STEPS[V("morphe_swipe_speed_step")] || .05).toFixed(2)}x steps`), 1000); },
  morphe_swipe_speed_sensitivity() { swipeDemo(speedSide(), "SPEED"); dT(() => label(`Sensitivity ${V("morphe_swipe_speed_sensitivity")}: this swipe reaches ${speedAt(1)}`), 1000); },
  morphe_swipe_overlay_background_opacity() { stillHud(); },
  morphe_swipe_text_overlay_size() { stillHud(); },
  morphe_swipe_overlay_progress_volume_color() { swipeDemo("right", "VOLUME"); },
  morphe_swipe_overlay_progress_brightness_color() { swipeDemo("left", "BRIGHTNESS"); },
  morphe_swipe_overlay_progress_speed_color() { swipeDemo("right", "SPEED"); },
  morphe_swipe_zone_width() { swipeZones(1400, true); label(`Left and right zones: ${V("morphe_swipe_zone_width")}% of the width each`, false, 1400); },
  morphe_swipe_seek(on) {
    const f = finger(); if (!f) return; const W = $("stage").clientWidth;
    place(f, W * .35, 80); dT(() => place(f, W * .7, 80, 650), 150);
    if (on) { { const t = seekJump(); label(`Swipe sideways in fullscreen: +${t}, release to seek`); showPill(`+${t}  ▸▸`); } } else { label("Swipe sideways: does nothing (stock)", true); dT(() => nothing7(800), 300); }
    hideF(f, 1100);
  },
  morphe_disable_shorts_double_tap_to_like(disabled) {
    const W = $("stage").clientWidth;
    tapAt(W * .45, 170); dT(() => tapAt(W * .45, 170), 180);
    const h = $("heart");
    // the like itself shows where it lands: the Like button turns on (filled, popping), then the next round
    // starts unliked (Max, Nov 24: "the like button doesn't get triggered"); 12K stays 12K, as YouTube rounds
    const lb = document.querySelector('#stage [data-k="morphe_hide_shorts_like_button"]'), lbtn = lb && lb.querySelector(".pbtn");
    const unlike = () => { if (lbtn) lbtn.classList.remove("liked7"); };
    if (!disabled && h) {
      dT(() => { h.style.transform = "translate(-50%,-50%) scale(1)"; }, 260); dT(() => { h.style.transform = "translate(-50%,-50%) scale(0)"; }, 900);
      dT(() => { if (lbtn) lbtn.classList.add("liked7"); }, 300);
      dT(unlike, 1380); onDemoStop(unlike); label("Double-tap: likes the Short (stock)");
    }
    else { label("Double-tap: does nothing, no accidental likes", true); dT(() => nothing7(800), 300); }
  },
  morphe_disable_like_subscribe_glow(disabled) {
    // YouTube's glow, from descriptions of the real thing rather than a guess (Max, round 138): "a quick zip
    // of red/orange/yellow around the Subscribe button" that "lasts just a second or two" (Tubefilter, Sep
    // 2023; 9to5Google: "a splash of color ... for a couple of seconds"). Morphe removes it as the element
    // "animated_button_border". So: a warm arc, yellow at its head through orange to red at its tail, runs
    // once around each button's border, fading in and out at the ends. It takes as long as the message
    // pill's flash (900 ms), so cause and glow read as one event. Drawn on the button's own edge: an outer
    // glow is cut off by the scrolling action bar.
    const parts = [...document.querySelectorAll("#stage .likechip, #stage .mtile[data-glow], #stage .subbtn")];
    showPill("\u201CLike and subscribe!\u201D", 1300);
    if (!parts.length || disabled) { label("Creator says \"hit like\": no glow", true); return; }
    const N = 60, arc = a => `conic-gradient(from ${a}deg, rgba(255,0,51,0) 0deg, #ff0033 70deg, #ff7a00 125deg, #ffd21f 165deg, rgba(255,210,31,0) 180deg, rgba(255,0,51,0) 360deg)`;
    const frames = Array.from({ length: N + 1 }, (_, i) => ({ background: arc(-90 + 360 * i / N), opacity: i < 6 ? i / 6 : i > N - 8 ? (N - i) / 8 : 1 }));
    parts.forEach(e => {
      const keep = e.style.position; e.style.position = "relative";
      const g = document.createElement("i");
      g.style.cssText = "position:absolute;inset:0;border-radius:inherit;pointer-events:none;padding:2px;-webkit-mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);opacity:0";
      e.appendChild(g);
      const a = g.animate(frames, { duration: 900, easing: "linear" });
      const end = () => { g.remove(); e.style.position = keep; };
      a.onfinish = end; onDemoStop(end);
    });
    label("Creator says \"hit like\": the buttons glow (stock)");
  },
  morphe_stable_caption_blocks(on) {
    const line = $("capLine"); if (!line) return;
    const words = "the pancake needs to rest for one minute".split(" ");
    if (on) { line.textContent = words.join(" "); line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 }); label("Stable blocks: whole sentence at once"); }
    else { let i = 0; line.textContent = ""; const t = dEvery(() => { if (!document.body.contains(line) || i >= words.length) { clearInterval(t); return; } line.textContent += (i ? " " : "") + words[i++]; }, 120); label("Word by word: text shifts as spoken (stock)"); }
  },
  morphe_niconico_comments(on) { label(on ? "Comments fly across the video" : "Flying comments are off", !on); },
};
const argb = (v, fallback) => { const m = /^#([0-9a-f]{2})?([0-9a-f]{6})$/i.exec(String(v || "")); if (!m) return fallback; const a = m[1] ? parseInt(m[1], 16) / 255 : 1; const n = parseInt(m[2], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(2)})`; };
function swipeZones(ms = 900, labels = false) {
  const st = $("stage").firstElementChild; if (!st) return;
  st.querySelectorAll(".zones").forEach(z => z.remove());
  const zw = Math.max(5, Math.min(50, Number(V("morphe_swipe_zone_width")) || 37));
  const th = Math.max(10, Math.min(60, Number(V("morphe_swipe_speed_zone_height")) || 30));
  const act = side => V("morphe_swipe_" + side + "_zone");
  const name = side => { const v = act(side); return !v || v === "OFF" ? "Off" : entryLabel("morphe_swipe_" + side + "_zone", v); };
  const top = act("top") && act("top") !== "OFF";
  const lab = side => labels ? `<b>${side[0].toUpperCase() + side.slice(1)}<small>${esc(name(side))}</small></b>` : "";
  const z = document.createElement("div"); z.className = "zones" + (labels ? " lab" : "");
  z.innerHTML = `<i class="${act("left") === "OFF" ? "zoff" : ""}" style="left:0;width:${zw}%">${lab("left")}</i><i class="${act("right") === "OFF" ? "zoff" : ""}" style="right:0;width:${zw}%">${lab("right")}</i>${top || labels ? `<i class="${top ? "" : "zoff"}" style="left:${zw}%;right:${zw}%;top:0;bottom:auto;height:${th}%">${lab("top")}</i>` : ""}`;
  st.appendChild(z);
  // a live change (dragging a zone slider) slides the zones from their last size instead of snapping
  const prev = swipeZones.last; swipeZones.last = { zw, th };
  if (!ms && prev && (prev.zw !== zw || prev.th !== th)) {
    const [l, r, t] = z.querySelectorAll(":scope > i");
    const set = (w, h) => { if (l) l.style.width = w + "%"; if (r) r.style.width = w + "%"; if (t) { t.style.left = t.style.right = w + "%"; t.style.height = h + "%"; } };
    set(prev.zw, prev.th); void z.offsetWidth; z.classList.add("slide"); set(zw, th);
  }
  if (ms) { dT(() => z.classList.add("out"), ms); dT(() => z.remove(), ms + 400); }
}
// still: the overlay stays up, half full and without a finger, so a slider for its look (opacity,
// text size) can be dragged while watching it change
// hold: how long the overlay stays after the finger lifts (the "Swipe overlay timeout" demo passes the
// setting; the other demos keep it short so they fit their loop)
function swipeDemo(side, action, prefix = "", still = false, hold = 100) {
  const st = $("stage"), f = finger(), hud = $("hud"); if (!f || !hud) return;
  const zw = Math.max(5, Math.min(50, Number(V("morphe_swipe_zone_width")) || 37)) / 100;
  const W = st.clientWidth, H = st.firstElementChild.clientHeight, x = side === "top" ? W * .5 : side === "left" ? W * zw / 2 : W * (1 - zw / 2);
  if (!still) {
    swipeZones();
    if (side === "top") { place(f, W * .35, H * .12); dT(() => place(f, W * .65, H * .12, 800), 120); }
    else { place(f, x, H * .75); dT(() => place(f, x, H * .25, 800), 120); }
  }
  const sideName = side === "top" ? "Top" : side === "left" ? "Left" : "Right";
  if (!action || action === "OFF") { label(`${sideName} swipe: does nothing (off)`, true); hud.style.display = "none"; if (!still) dT(() => nothing7(800), 300); }
  else {
    const ic = action === "VOLUME" ? "vol" : action === "BRIGHTNESS" ? "bright" : "speed";
    const style = state.morphe_swipe_overlay_style || "HORIZONTAL";
    const circ = style.startsWith("CIRCULAR"), vert = style.startsWith("VERTICAL"), min = style.includes("MINIMAL");
    const bgA = (Number(V("morphe_swipe_overlay_background_opacity")) || 0) / 100;
    const col = argb(V(action === "VOLUME" ? "morphe_swipe_overlay_progress_volume_color" : action === "BRIGHTNESS" ? "morphe_swipe_overlay_progress_brightness_color" : "morphe_swipe_overlay_progress_speed_color"), "#fff");
    const ts = Math.max(8, Math.min(30, Number(V("morphe_swipe_text_overlay_size")) || 14)) * .8;
    const txt = `<span class="hv" style="font-size:${ts}px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums;white-space:nowrap">${action === "SPEED" ? "1.0x" : "20"}</span>`;
    let inner;
    // The minimal styles are Morphe's own reductions: the ring keeps a larger icon and loses its number,
    // the horizontal and vertical ones keep icon and number and lose the bar.
    if (circ) inner = `<div style="width:64px;height:64px;border-radius:50%;background:conic-gradient(${col} var(--p,0%),rgba(255,255,255,.25) 0);display:grid;place-items:center"><div style="width:52px;height:52px;border-radius:50%;background:rgba(0,0,0,${bgA});display:grid;place-items:center">${min ? `<span style="display:grid;transform:scale(1.5)">${I(ic)}</span>` : I(ic) + txt}</div></div>`;
    else if (min) inner = `<div style="display:${vert ? "grid" : "flex"};justify-items:center;align-items:center;gap:${vert ? 6 : 8}px;background:rgba(0,0,0,${bgA});padding:8px ${vert ? 8 : 12}px;border-radius:${vert ? 14 : 18}px">${I(ic)}${txt}</div>`;
    else if (vert) inner = `<div style="display:grid;justify-items:center;gap:6px;background:rgba(0,0,0,${bgA});padding:8px;border-radius:14px">${I(ic)}<div style="width:6px;height:80px;background:rgba(255,255,255,.25);border-radius:3px;position:relative"><div style="position:absolute;bottom:0;left:0;right:0;height:var(--p,0%);background:${col};border-radius:3px"></div></div>${txt}</div>`;
    else inner = `<div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,${bgA});padding:8px 12px;border-radius:18px">${I(ic)}<div style="width:110px;height:5px;background:rgba(255,255,255,.25);border-radius:3px;position:relative"><div style="position:absolute;left:0;top:0;bottom:0;width:var(--p,0%);background:${col};border-radius:3px"></div></div>${txt}</div>`;
    hud.innerHTML = inner; hud.style.display = "block";
    if (style === "HORIZONTAL_MINIMAL_TOP") { hud.style.left = "50%"; hud.style.right = "auto"; hud.style.top = "12px"; hud.style.transform = "translateX(-50%)"; }
    else if (vert) { hud.style.left = side === "left" ? "auto" : "14px"; hud.style.right = side === "left" ? "14px" : "auto"; hud.style.top = "50%"; hud.style.transform = "translateY(-50%)"; }
    else { hud.style.left = "50%"; hud.style.right = "auto"; hud.style.top = "50%"; hud.style.transform = "translate(-50%,-50%)"; }
    // the bar follows the finger frame by frame: it reads where the finger actually is on its way,
    // so the fill and the number move exactly with it instead of stepping on a timer of their own
    const hv = hud.querySelector(".hv"), a0 = side === "top" ? W * .35 : H * .75, a1 = side === "top" ? W * .65 : H * .25;
    const show = fr0 => {
      // the threshold: the first stretch of the swipe changes nothing
      const dead = swipeDead(), fr = Math.max(0, (fr0 - dead) / (1 - dead));
      const [frac, txt] = action === "VOLUME" ? volAt(fr) : action === "BRIGHTNESS" ? brightAt(fr) : [.2 + .7 * fr, speedAt(fr)];
      hud.style.setProperty("--p", (frac * 100).toFixed(2) + "%");
      if (hv) hv.textContent = txt;
    };
    if (still) { show(.6); hud.style.transition = "none"; hud.style.opacity = "1"; return; }
    show(0);
    hud.style.transition = "opacity 160ms var(--ease)"; hud.style.opacity = "0"; requestAnimationFrame(() => { hud.style.opacity = "1"; });
    const t0 = performance.now();
    const t = dEvery(() => {
      const cur = parseFloat(getComputedStyle(f)[side === "top" ? "left" : "top"]);
      show(Math.max(0, Math.min(1, (cur - a0) / (a1 - a0))));
      if (performance.now() - t0 > 1000) clearInterval(t);
    }, 16);
    label(`${prefix}${sideName} swipe: ${entryLabel("morphe_swipe_" + side + "_zone", action) || action.toLowerCase()}`);
    dT(() => { hud.style.opacity = "0"; }, 1050 + hold);
    dT(() => { hud.style.display = "none"; hud.style.opacity = ""; }, 1220 + hold);
  }
  hideF(f, 1050);
}
// the speed a swipe reaches: it moves in "Speed step" steps, and a higher "Speed swipe sensitivity"
// needs more swiping per step, so the same swipe covers fewer steps (as in Morphe)
const SPEED_STEPS = { STEP_005: .05, STEP_010: .1, STEP_025: .25 };
function speedAt(fr) {
  const step = SPEED_STEPS[V("morphe_swipe_speed_step")] || .05, sens = Math.max(1, Number(V("morphe_swipe_speed_sensitivity")) || 10);
  const n = Math.floor(fr * 10 * (10 / sens) + 1e-6); // ticks this swipe covers
  return Math.min(8, 1 + n * step).toFixed(2).replace(/0$/, "") + "x";
}
// Volume and brightness follow their settings the same way: "Volume steps" splits the bar into that
// many steps, a higher volume or brightness sensitivity needs more swiping per step, and "Swipe magnitude
// threshold" is a dead stretch at the start of every swipe. Each returns [bar fill 0-1, shown value].
const VOL_STEPS = { STEPS_5: 5, STEPS_10: 10, STEPS_15: 15, STEPS_20: 20, STEPS_30: 30, STEPS_50: 50 };
const volSteps = () => VOL_STEPS[V("morphe_swipe_volume_steps")] || 15; // device default: 15 on most phones
function volAt(fr) {
  const steps = volSteps(), dist = Math.max(1, Number(V("morphe_swipe_volume_distance")) || 10), start = Math.round(steps * .2);
  const n = Math.min(steps, start + Math.floor(fr * (steps - start) * (10 / dist) + 1e-6)); return [n / steps, VE("morphe_volume_boost") ? Math.round(n / steps * 100) + "%" : String(n)]; // Morphe shows the step alone ("4"), or a percentage once Volume boost allows more than 100
}
function brightAt(fr) { const sens = Math.max(1, Number(V("morphe_swipe_brightness_sensitivity")) || 1), p = Math.min(100, Math.round(20 + 80 * fr / sens)); return [p / 100, p + (String(V("morphe_swipe_overlay_style")).startsWith("VERTICAL") ? "" : "%")]; } // the vertical bar has no room for the sign (as in Morphe)
const swipeDead = () => Math.max(0, Math.min(.6, (Number(V("morphe_swipe_threshold")) || 0) / 300));
// "Seek swipe sensitivity" (100 by default) scales how far a sideways swipe seeks
const seekJump = () => { const s = Math.max(0, Math.round(90 * (Number(V("morphe_swipe_seek_sensitivity")) || 100) / 100)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const speedSide = () => ["left", "right", "top"].find(x => V("morphe_swipe_" + x + "_zone") === "SPEED") || "right";
// the overlay's look, held still on the first zone that has a gesture; dragging its slider redraws it live
function stillHud() {
  const side = ["left", "right", "top"].find(x => { const v = V("morphe_swipe_" + x + "_zone"); return v && v !== "OFF"; }) || "left";
  const v = V("morphe_swipe_" + side + "_zone");
  swipeDemo(side, v && v !== "OFF" ? v : "BRIGHTNESS", "", true);
}
// redrawn on every step of a slider or keystroke in a number box, so the preview follows the value live
const LIVE_HUD = {
  morphe_swipe_overlay_background_opacity: stillHud, morphe_swipe_text_overlay_size: stillHud,
  morphe_swipe_zone_width: () => swipeZones(0, true), morphe_swipe_speed_zone_height: () => swipeZones(0, true),
};
function startDemo(k) {
  stopDemo();
  const fn = DEMOS[k]; if (!fn) return;
  demoStep = 0;
  // the clock drops these as soon as another demo starts, so a stale loop can't stop the new one
  const run = () => {
    if (selected !== k) return stopDemo();
    demoOnGhost = DEMO_TYPE[k] === "transient" && (ghosts.has(k) || fading.has(k));
    // previewed while hidden: play the story of the element being there (a hide key's "shown" value is false)
    if (!hintOk(k, V(k))) return stopDemo(); // a value without a story: shown plainly (core.js)
    try { fn(demoOnGhost ? !isHideKey(k) : V(k)); } catch (err) { hintFailed(k, err); return stopDemo(); }
    demoStep++;
  };
  // at once, in this same turn (Max, Nov 24: the finger came late and flickered); while a hidden part is
  // still folding away the preview is about to be redrawn, and the redraw starts the demo (stageHold)
  if (!stageHold) run();
  clock.every("demo", LOOP_MS, run);
}
const isAnimated = k => { const a = A[k]; return !!a && (a.kind === "gesture" || a.kind === "behaviour" || a.kind === "scenario" || !!DEMOS[k]); };

// ------------------------------------------------------------------ seekbar: more animations
def("seekbar", "style", "custom_seekbar_thumb custom_seekbar_thumb_scale_type");
Object.assign(DEMOS, {
  morphe_seekbar_thumbnail_preview(on) {
    const seek = $("seek"), f = finger(), bub = $("thumbBubble"); if (!seek || !f) return;
    const st = $("stage").getBoundingClientRect(), r = seek.getBoundingClientRect();
    const pr = bub && bub.offsetParent ? bub.offsetParent.getBoundingClientRect() : st;
    const y = r.top - st.top + r.height / 2, p0 = 17, p1 = 70, total = 18 * 60 + 42;
    const xAt = pct => r.left + r.width * pct / 100;
    const played = $("played"), knob = $("knob"), ring = $("knobRing"), tl = bub && bub.querySelector(".time");
    fadeBackStop([played, knob, ring]);
    [played, knob, ring].forEach(e => { if (e) { keepRest(e, "transition"); e.style.transition = "none"; } });
    if (bub) { bub.classList.add("dragging"); bub.style.opacity = on ? "1" : "0"; }
    const frame = pct => {
      setSeek(pct); place(f, xAt(pct) - st.left, y);
      if (bub) { const half = 50, x = Math.min(Math.max(xAt(pct) - pr.left, half + 4), pr.width - half - 4); bub.style.left = x + "px"; }
      if (tl) tl.textContent = fmt(total, pct);
    };
    // the bubble's resting place is an inline left of its own: clearing it dropped the bubble to the left edge,
    // half outside the preview, between two rounds (Max, round 139: "starts with the thumbnail clipped")
    keepRest(bub, "left");
    const reset = () => { if (bub) { bub.classList.remove("dragging"); toRest(bub, "left"); bub.style.opacity = ""; } if (tl) tl.textContent = "7:51"; [played, knob, ring].forEach(e => toRest(e, "transition")); setSeek(p0); };
    onDemoStop(reset);
    frame(p0); f.classList.add("hold");
    const t0 = performance.now() + 40, dur = 1000, tok = clock.run("demo");
    const step = now => {
      if (!clock.alive("demo", tok) || !document.body.contains(seek)) return;
      const t = Math.min(1, Math.max(0, (now - t0) / dur)), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      frame(p0 + (p1 - p0) * e);
      if (t < 1) requestAnimationFrame(step);
      // (the fade out and back in end by about 1.4 s, inside the 1.5 s round, so the next drag starts clean)
      else dT(() => { f.classList.remove("show", "hold"); fadeBack([played, knob, ring], reset); }, 120);
    };
    requestAnimationFrame(step);
    label(on ? "Drag the seekbar: a thumbnail follows your finger" : "Drag the seekbar: no thumbnail, only the time", !on);
  },
  // Watch later button: a tap, then a tap and hold; which one saves and which opens the queue options swaps
  morphe_swap_save_and_queue_actions(swapped) {
    const btn = [...document.querySelectorAll('#stage [data-k="morphe_save_to_watch_later_button"]')].find(e => e.getClientRects().length); if (!btn) return;
    // the player scene has no finger of its own: add one
    if (!finger()) { const v = $("stage").firstElementChild; if (!v) return; v.insertAdjacentHTML("beforeend", `<div class="finger">${I("gesture")}</div>`); }
    const f = finger();
    const st = $("stage").getBoundingClientRect(), r = btn.getBoundingClientRect(), x = r.left - st.left + r.width / 2, y = r.top - st.top + r.height / 2;
    const hold = demoStep % 2 === 1, queue = hold !== swapped;
    if (hold) { place(f, x, y); f.classList.add("hold"); dT(() => f.classList.remove("hold"), 650); hideF(f, 900); } else tapAt(x, y);
    dT(() => showPill(queue ? "Queue: Play next · Add to queue" : "Saved to Watch later", 900), hold ? 600 : 150);
    label(`${hold ? "Tap and hold" : "Tap"}: ${queue ? "queue options" : "saves to Watch later"}`, false);
  },
  // every hint the setting hides, one gesture per round (Max, Nov 24: only the first one showed): pull up
  // on the seekbar, slide back down to cancel, hold the video for 2x
  // the Shorts "Swipe up" tip: it appears over a Short, the arrow nudging up, and goes again
  morphe_hide_shorts_gesture_hints(hidden) {
    const hint = document.querySelector('#stage [data-k="morphe_hide_shorts_gesture_hints"]'); if (!hint) return;
    fadeC(hint, false); dT(() => fadeC(hint, !hidden), 40); dT(() => fadeC(hint, false), 1250);
    onDemoStop(() => hint.classList.remove("dz", "dzt"));
  },
  // a tap pauses the Short: the pause sign shows and, unless hidden, the paused overlay's buttons with it;
  // a second tap plays it again and both go
  morphe_hide_shorts_paused_overlay_buttons(hidden) {
    const st = $("stage"), W = st.clientWidth, H = st.clientHeight, ov = document.querySelector('#stage [data-k="morphe_hide_shorts_paused_overlay_buttons"]'), host = $("shortsStage");
    if (!ov || !host) return;
    fadeC(ov, false); tapAt(W * .45, H * .29);
    const sign = document.createElement("div"); sign.className = "psign7"; sign.innerHTML = I("play"); host.appendChild(sign);
    dT(() => { sign.classList.add("on"); fadeC(ov, !hidden); }, 160);
    dT(() => tapAt(W * .45, H * .29), 1050);
    dT(() => { sign.classList.remove("on"); fadeC(ov, false); }, 1200);
    onDemoStop(() => { sign.remove(); ov.classList.remove("dz", "dzt"); });
  },
  morphe_hide_player_gesture_hints(hidden) {
    const f = finger(); if (!f) return; const st = $("stage"), W = st.clientWidth, H = st.clientHeight;
    const hint = document.querySelector('#stage [data-k="morphe_hide_player_gesture_hints"]'), pill = hint && hint.querySelector(".toastin");
    if (pill && !pill.dataset.first) pill.dataset.first = pill.textContent;
    const say = (txt, ms, lab) => dT(() => { if (pill) pill.textContent = txt; if (hint) fadeC(hint, !hidden); label(hidden ? `${lab}: no hint appears` : `${lab}: "${txt}"`, hidden); }, ms);
    if (hint) fadeC(hint, false);
    const step = demoStep % 3;
    // every one of these is a press that stays down, so the finger shows its hold circle for all three (Max, round 139)
    f.classList.add("hold");
    if (step === 0) { place(f, W * .42, H - 16); dT(() => place(f, W * .42, H - 90, 500), 120); say("Pull up for precise seeking", 320, "Pull up on the seekbar"); }
    else if (step === 1) { place(f, W * .42, H - 90); dT(() => place(f, W * .42, H - 26, 420), 120); say("Release to cancel", 360, "Slide back down"); }
    else { place(f, W * .7, H * .42); say("2x", 300, "Hold the video"); }
    dT(() => fadeC(hint, false), 1250); hideF(f, 1250);
    onDemoStop(() => { if (hint) hint.classList.remove("dz", "dzt"); if (pill && pill.dataset.first) { pill.textContent = pill.dataset.first; delete pill.dataset.first; } });
  },
});
const liveDev = (rew) => `${miniVideo(5)}<span style="position:absolute;left:8px;top:7px;font-size:8px;font-weight:700;background:#cc0000;padding:1px 4px;border-radius:2px">LIVE</span><div class="msk" style="position:absolute;left:8%;right:8%;bottom:16%;height:3px;background:rgba(255,255,255,.3)"><div class="buf" style="position:absolute;left:${rew}%;right:0;top:0;bottom:0;background:rgba(255,255,255,.35)"></div><div class="mp" style="position:absolute;left:0;top:0;bottom:0;width:100%;background:#ff0033;transition:width .9s var(--ease)"></div></div>`;
scen("seekbar", "live_stream_dvr", (box, on) => {
  situation("A live stream that blocks rewinding"); // no blue line (Max, Nov 20)
  box.innerHTML = device("land", liveDev(on ? 0 : 96));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), mp = dev.querySelector(".mp"); const W = dev.clientWidth, H = dev.clientHeight;
  at(150, () => fingerTo(f, W * .9, H * .84)); at(450, () => { fingerTo(f, W * .35, H * .84, 900); if (on) mp.style.width = "35%"; });
  at(1400, () => dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:8px">${on ? "−1:12:40 · rewinding" : "This stream can't be rewound"}</div>`));
  return on ? "You can drag back on any live stream" : "Rewinding is blocked on this stream (stock)";
});
scen("seekbar", "expand_live_stream_dvr_duration", (box, on) => {
  situation("Dragging back on a long live stream");
  box.innerHTML = device("land", liveDev(on ? 0 : 70));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), mp = dev.querySelector(".mp"); const W = dev.clientWidth, H = dev.clientHeight;
  at(150, () => fingerTo(f, W * .9, H * .84)); at(450, () => { fingerTo(f, W * .1, H * .84, 1000); mp.style.width = on ? "3%" : "70%"; });
  at(1500, () => dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:8px">${on ? "−3 days · stream start" : "Stops at −4:00:00"}</div>`));
  return on ? "Rewind up to 7 days back" : "Rewind stops after a few hours (stock)";
});
// ------------------------------------------------------------------ section membership
let MEMBERS = {};
// ------------------------------------------------------------------ round 7 additions
Object.assign(DEMOS, {
  // The + button opens the segment editor and the like button the voting menu. Each panel opens once
  // (the finger taps its button) and stays while the setting is selected; the rounds only move the
  // highlight through its steps. It used to be drawn again every round, so it popped in, bounced and
  // shifted every 1.5 s (Max, Nov 24, reported before).
  morphe_sb_create_new_segment(on) { sbPanel("morphe_sb_create_new_segment", on); },
  morphe_sb_create_new_segment_step() { sbPanel("morphe_sb_create_new_segment_step", true); },
  morphe_sb_voting_button(on) { sbPanel("morphe_sb_voting_button", on); },
});
function sbPanel(k, on) {
  const st = $("stage").firstElementChild; if (!st) return;
  const vote = k === "morphe_sb_voting_button", btnKey = vote ? "morphe_sb_voting_button" : "morphe_sb_create_new_segment";
  if (!on) { st.querySelectorAll(".sbedit").forEach(n => n.remove()); label(vote ? "The voting button is hidden" : "The 'Create new segment' button is hidden", true, 1300); return; }
  const step = Number(V("morphe_sb_create_new_segment_step")) || 150;
  let ed = st.querySelector(`.sbedit[data-for="${btnKey}"]`);
  if (!ed) {
    st.querySelectorAll(".sbedit").forEach(n => n.remove());
    ed = document.createElement("div"); ed.className = "sbedit"; ed.dataset.for = btnKey;
    const ic = n => I(n, "ico", 'style="width:14px;height:14px"');
    ed.innerHTML = vote
      ? `<span class="chip">${ic("like")} Upvote</span><span class="chip">${ic("dislike")} Downvote</span><span class="chip">Change category</span>`
      : `<span class="chip" data-s="minus">${ic("prev")} −${step} ms</span><span class="chip" data-s="start">Start <b class="sbt">1:30.000</b></span><span class="chip" data-s="end">End …</span><span class="chip" data-s="plus">+${step} ms ${ic("next")}</span><span class="chip" data-s="pub">${ic("arrow")} Publish</span>`;
    ed.style.visibility = "hidden"; st.appendChild(ed);
    const btn = st.querySelector(`[data-k="${btnKey}"] .pbtn`), f = finger();
    if (btn && f) { const sr = $("stage").getBoundingClientRect(), r = btn.getBoundingClientRect(); tapAt(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2); }
    dT(() => { ed.style.visibility = ""; ed.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: "cubic-bezier(.2,0,0,1)" }); }, 220);
    onDemoStop(() => ed.remove());
  }
  const chips = [...ed.querySelectorAll(".chip")], n = demoStep;
  const lit = i => chips.forEach((c, j) => { c.style.transition = "background .2s, color .2s"; c.style.background = j === i ? "#3ea6ff" : ""; c.style.color = j === i ? "#000" : ""; });
  if (vote) { lit(n % 3); label(["Upvote a segment", "Downvote a segment", "Give it another category"][n % 3], false, 1300); return; }
  if (k === "morphe_sb_create_new_segment_step") {
    const plus = n % 2 === 0, t = ed.querySelector(".sbt"), ms = 30000 + (plus ? step : -step);
    lit(plus ? 3 : 0); if (t) t.textContent = `1:${String(Math.floor(ms / 1000)).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
    label(`${plus ? "+" : "−"}${step} ms: the start moves by one step`, false, 1300); return;
  }
  lit([1, 2, 4][n % 3]); label(["Mark where the segment starts", "Mark where it ends", "Publish it to SponsorBlock"][n % 3], false, 1300);
}
// Shared pieces for small "phone" scenarios: a page made of rows, a toast, a sheet.
const pageRows = (rows) => `<div class="pg7" style="position:absolute;inset:0;background:#0f0f0f;padding:6px;display:grid;grid-template-columns:minmax(0,1fr);grid-auto-rows:max-content;gap:5px;align-content:start;font-size:7px;color:#ddd">${rows}</div>`;
const bar7 = (w = 100, c = "#2a2a2a", h = 6) => `<i style="display:block;height:${h}px;width:${w}%;border-radius:3px;background:${c}"></i>`;
const cmt7 = (i, txt) => `<div class="cm7" style="display:flex;gap:4px;align-items:flex-start;padding:3px;border-radius:4px;transition:background .2s"><span style="width:12px;height:12px;border-radius:50%;background:${AV[i % AV.length]};flex:none"></span><span style="line-height:1.3">${txt}</span></div>`;
function toast7(dev, text, top = "78%") { dev.querySelectorAll(".t7").forEach(n => n.remove()); dev.insertAdjacentHTML("beforeend", `<div class="toastin t7" style="top:${top}">${text}</div>`); keepPillIn(dev.lastElementChild); /* fitted at once, not a frame later */ }
// a sheet in a scenario phone dims what it opens over, like the player menu sheets in the preview
function sheet7(dev, rows) { dev.insertAdjacentHTML("beforeend", `<div class="shs7" style="position:absolute;inset:0;background:rgba(0,0,0,.5);animation:ghostin .25s var(--ease);z-index:5"></div><div class="sh7" style="position:absolute;left:0;right:0;bottom:0;background:#212121;border-radius:8px 8px 0 0;padding:6px;display:grid;gap:4px;font-size:7.5px;animation:sheetup .25s var(--ease);z-index:5">${rows}</div>`); }
function holdAt(f, x, y) { fingerTo(f, x, y); f.classList.add("hold"); }

scen("comments", "copy_comments", (box, on) => {
  situation("Holding a comment");
  box.innerHTML = device("port", pageRows(`<b style="font-size:8px">Comments</b>${cmt7(2, "The wood stove at 12:04 is pure cosiness")}${cmt7(5, "Kom igjen! Taket trenger en egen video.")}${cmt7(3, "Subscribed for part 2")}`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  const c = dev.querySelectorAll(".cm7")[0];
  at(200, () => holdAt(f, W * .55, H * .13)); at(700, () => { c.style.background = "rgba(255,255,255,.12)"; });
  at(1100, () => { f.classList.remove("hold", "show"); if (on) toast7(dev, "Comment copied"); else sheet7(dev, ["Report", "Block user"].map(t => `<div>${t}</div>`).join("")); });
  return on ? "Hold a comment: its text is copied" : "Hold a comment: only the report menu (stock)";
});
// Morphe (CommentsSearchFilter): a search button beside the comments panel's close button opens a "Search
// comments" dialog (hint "Words to search for"; Clear, Cancel, Search). Search reloads the panel with only the
// loaded comments that contain all the words, and the button's icon is filled while a search is on.
scen("comments", "search_comments", (box, on) => {
  const list = ["The wood stove at 12:04 is pure cosiness", "Which stove model is that?", "Subscribed for part 2", "Rain on the roof = perfect"];
  const icon = fill => `<span class="srch7" style="width:11px;height:11px;display:grid;place-items:center;border-radius:50%;transition:background .2s;${fill ? "background:#f1f1f1" : ""}">${I("search", "ico", `style="width:8px;height:8px;${fill ? "fill:#0f0f0f" : ""}"`)}</span>`;
  box.innerHTML = device("port", pageRows(`<div style="display:flex;align-items:center;gap:5px"><b style="font-size:8px;flex:1">Comments</b>${on ? icon(false) : ""}${I("close", "ico", 'style="width:9px;height:9px"')}</div><div class="cl7" style="display:grid;gap:5px;transition:opacity .2s">${list.map((t, i) => cmt7([2, 5, 3, 1][i], t)).join("")}</div>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  if (!on) return "Not searchable";
  const T = ms => Math.round(ms * .9); // Max, Nov 25: 10% faster
  const spot = q => { const e = dev.querySelector(q), r = e.getBoundingClientRect(), d = dev.getBoundingClientRect(), z = d.width / W; return [(r.left - d.left + r.width / 2) / z, (r.top - d.top + r.height / 2) / z]; };
  at(T(150), () => fingerTo(f, ...spot(".srch7"))); at(T(450), () => tapF(f));
  at(T(650), () => {
    f.classList.remove("show");
    dev.insertAdjacentHTML("beforeend", `<div class="dim7" style="position:absolute;inset:0;background:rgba(0,0,0,.55);animation:ghostin .2s var(--ease);z-index:5"></div><div class="dlg7" style="position:absolute;left:8%;right:8%;top:24%;background:#282828;border-radius:7px;padding:7px;display:grid;gap:6px;font-size:6.5px;color:#ddd;z-index:6;animation:dlgin7 .25s var(--ease)"><b style="font-size:8px;color:#fff">Search comments</b><div style="border-bottom:1px solid #3ea6ff;padding:2px 1px;font-size:7px"><span class="q7" style="color:#fff"></span><span class="ph7" style="color:#888">Words to search for</span></div><div style="display:flex;gap:7px;font-weight:600;color:#3ea6ff"><span style="flex:1">Clear</span><span>Cancel</span><span class="go7">Search</span></div></div>`);
  });
  "stove".split("").forEach((ch, i) => at(T(950 + i * 110), () => { dev.querySelector(".ph7")?.remove(); const q = dev.querySelector(".q7"); if (q) q.textContent += ch; }));
  at(T(1650), () => fingerTo(f, ...spot(".go7"))); at(T(1900), () => tapF(f));
  // the panel reloads with the matches only, and the button stays filled
  at(T(2100), () => {
    f.classList.remove("show"); dev.querySelectorAll(".dim7, .dlg7").forEach(n => n.remove());
    const cl = dev.querySelector(".cl7"), s7 = dev.querySelector(".srch7"); cl.style.opacity = "0";
    later(() => { cl.innerHTML = list.map((t, i) => /stove/i.test(t) ? cmt7([2, 5, 3, 1][i], t.replace(/stove/i, m => `<b style="color:#fff">${m}</b>`)) : "").join(""); cl.style.opacity = "1"; s7.style.background = "#f1f1f1"; s7.querySelector("svg").style.fill = "#0f0f0f"; }, T(220));
  });
  return "";
});
SCN_HOLD.morphe_search_comments = 3060;
// Morphe (ChannelSearchPatch): on a channel page a second button, Morphe's own channel search icon (a
// magnifier with a person in it, tinted like the toolbar), sits just left of YouTube's search. It opens the
// same search field with the hint "Search channel"; the search then opens a sheet (SheetBottomDialog, slides
// up in 300 ms, 8dp from the edges, 12dp corners, handle bar): the query in bold, "Channel search results •
// <channel>", a divider, Videos / Posts chips and the sort button, then the channel's matching videos. Off:
// YouTube's only search button searches all of YouTube, results from other channels on the results page.
const CH_SEARCH_ICO = sz => `<svg viewBox="0 0 24 24" style="width:${sz}px;height:${sz}px;flex:none;display:block"><path d="M3,11a8,8 0,1 0,16 0a8,8 0,1 0,-16 0M16.66,16.66L21,21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path fill="currentColor" d="M11,8.6m-2.1,0a2.1,2.1 0,1 0,4.2 0a2.1,2.1 0,1 0,-4.2 0M7.3,15.2C7.6,13.1 9.1,12 11,12C12.9,12 14.4,13.1 14.7,15.2C13.7,15.9 12.4,16.3 11,16.3C9.6,16.3 8.3,15.9 7.3,15.2Z"/></svg>`;
scen("channel", "channel_search", (box, on) => {
  const ico = () => I("search", "ico", 'style="width:10px;height:10px;display:block"');
  const btn = (inner, cls) => `<span class="${cls}" style="display:grid;place-items:center;width:14px;height:14px;border-radius:50%;color:#f1f1f1;transition:background .18s">${inner}</span>`;
  box.innerHTML = device("port", pageRows(`<div class="top7" style="height:14px;display:flex;align-items:center;justify-content:flex-end;gap:2px;white-space:nowrap;overflow:hidden">${on ? btn(CH_SEARCH_ICO(10), "chb7") : ""}${btn(ico(), "ysb7")}</div><div style="height:22px;border-radius:4px;background:${ART[3]}"></div><div style="display:flex;gap:4px;align-items:center"><span style="width:16px;height:16px;border-radius:50%;background:${AV[0]}"></span><b style="font-size:8px">Fjord &amp; Timber</b></div><div class="body7" style="display:grid;gap:5px">${bar7(80)}${bar7(60)}${[0, 1, 2].map(i => `<div style="display:flex;gap:4px;align-items:center"><div style="width:26px;height:15px;border-radius:2px;background:${ART[i + 1]}"></div>${bar7(50)}</div>`).join("")}</div>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth;
  const top = dev.querySelector(".top7"), body = dev.querySelector(".body7"), hit = dev.querySelector(on ? ".chb7" : ".ysb7");
  const tx = hit.offsetLeft + 7 + 6, ty = 6 + 7; // the button's middle (pageRows pads 6px)
  at(150, () => fingerTo(f, tx, ty));
  at(500, () => { tapF(f); hit.style.background = "rgba(255,255,255,.2)"; });
  // the field opens out of the tapped button, its hint fades in
  at(720, () => {
    f.classList.remove("show");
    top.style.justifyContent = "flex-start";
    top.innerHTML = `${I("back", "ico", 'style="width:9px;height:9px;flex:none;opacity:0;transition:opacity .2s"')}<div class="fld7" style="flex:1;min-width:0;height:13px;border-radius:7px;background:#2c2c2c;font-size:7px;line-height:13px;padding:0 6px;color:#ddd;overflow:hidden;white-space:nowrap;transform-origin:${tx - 6}px 50%;transform:scaleX(.12);opacity:.4;transition:transform .32s var(--spring-soft, var(--ease)),opacity .2s"><span class="q7" style="color:#fff"></span><span class="ph7" style="color:#888">${on ? "Search channel" : "Search YouTube"}</span></div>`;
    void top.offsetWidth; top.querySelector(".fld7").style.transform = "none"; top.querySelector(".fld7").style.opacity = "1"; top.querySelector(".ico").style.opacity = "1";
  });
  "stove".split("").forEach((ch, i) => at(1000 + i * 85, () => { dev.querySelector(".ph7")?.remove(); const q = dev.querySelector(".q7"); if (q) q.textContent += ch; }));
  const row = (art, name, ch, d) => `<div class="rw7" style="display:flex;gap:4px;align-items:center;opacity:0;transform:translateY(5px);transition:opacity .22s ${d}ms,transform .3s var(--ease) ${d}ms"><div style="width:26px;height:15px;border-radius:2px;background:${ART[art]};flex:none"></div><span style="display:grid;gap:1px;min-width:0"><span style="font-size:6.5px;color:#f1f1f1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span><span style="display:flex;gap:2px;align-items:center;font-size:5.5px;color:#aaa;white-space:nowrap"><i style="width:5px;height:5px;border-radius:50%;background:${AV[ch]};flex:none"></i>${ch ? ["", "Pocket Camp", "Tapes", "Nico Outdoors"][ch] : "Fjord &amp; Timber"}</span></span></div>`;
  const rise = host => requestAnimationFrame(() => requestAnimationFrame(() => host.querySelectorAll(".rw7").forEach(r => { r.style.opacity = "1"; r.style.transform = "none"; })));
  at(1550, () => {
    if (!on) {
      // YouTube's results page: videos from all of YouTube, other channels among them
      body.style.transition = "opacity .16s"; body.style.opacity = "0";
      later(() => { body.innerHTML = [[4, "Stove review 2026", 1], [5, "Camping stoves ranked", 2], [6, "Wood stove in a van", 3], [1, "Stove install, part 1", 0]].map(([a, n, c], i) => row(a, n, c, i * 60)).join(""); body.style.opacity = "1"; rise(body); }, 170);
      return;
    }
    // Morphe's sheet slides up over a dimmed page with this channel's videos only
    dev.insertAdjacentHTML("beforeend", `<div class="dim7" style="position:absolute;inset:0;background:rgba(0,0,0,0);transition:background .3s;z-index:5"></div><div class="sht7" style="position:absolute;left:2px;right:2px;bottom:2px;height:60%;border-radius:4px;background:#212121;z-index:6;padding:3px 4px 0;display:grid;grid-template-columns:minmax(0,1fr);grid-auto-rows:max-content;gap:3px;overflow:hidden;font-size:7px;color:#f1f1f1;transform:translateY(105%);transition:transform .3s cubic-bezier(.2,0,0,1)"><i style="justify-self:center;width:12px;height:1.5px;border-radius:1px;background:#4a4a4a"></i><div style="display:flex;gap:4px;align-items:center">${I("search", "ico", 'style="width:7px;height:7px;flex:none"')}<span style="display:grid;min-width:0;flex:1"><b style="font-size:8px">stove</b><span style="font-size:5.5px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Channel search results  •  Fjord &amp; Timber</span></span></div><i style="height:.5px;margin:0 -5px;background:#3a3a3a"></i><div style="display:flex;gap:2px;font-size:5px;white-space:nowrap"><span style="padding:1px 2.5px;border-radius:5px;background:#f1f1f1;color:#0f0f0f">Videos</span><span style="padding:1px 2.5px;border-radius:5px;background:rgba(255,255,255,.1)">Posts</span><span style="padding:1px 2.5px;border-radius:5px;background:rgba(255,255,255,.1)">Relevance</span></div><div class="lst7" style="display:grid;gap:4px">${[[1, "Stove install, part 1"], [2, "Stove vs rain"], [3, "Cabin stove tour"]].map(([a, n], i) => row(a, n, 0, 160 + i * 60)).join("")}</div></div>`);
    const sh = dev.querySelector(".sht7"); void sh.offsetWidth;
    dev.querySelector(".dim7").style.background = "rgba(0,0,0,.5)"; sh.style.transform = "none"; rise(sh);
  });
  return "";
});
SCN_HOLD.morphe_channel_search = 3200;
// Morphe (CopyTextPatch.showSelectTextDialog): holding a description or a post opens a "Select text" dialog
// with the whole text, selectable (setTextIsSelectable), and Cancel / "Copy all"; Copy all puts it all on the
// clipboard with "Text copied to clipboard". So On: hold, the dialog opens, a word is held and the selection
// dragged over a part, Android's own Copy bar copies just that part.
scen("description", "copy_select_text", (box, on) => {
  situation("Holding the description text");
  const txt = `Two weeks, one 12 m² cabin and a lot of <span class="w7" style="border-radius:2px;transition:background .25s">reclaimed</span><span class="w8" style="border-radius:2px;transition:background .25s"> pine</span>.`;
  box.innerHTML = device("port", pageRows(`<b style="font-size:8px">Description</b><span class="d7" style="line-height:1.35">${txt.replace(/class="w[78]"/g, "")}</span>${bar7(90)}${bar7(70)}`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(200, () => holdAt(f, W * .45, H * .13));
  if (!on) { at(900, () => { f.classList.remove("hold", "show"); toast7(dev, "Nothing to select", "60%"); }); return "Hold the description: nothing to select (stock)"; }
  at(800, () => {
    f.classList.remove("hold", "show");
    dev.insertAdjacentHTML("beforeend", `<div style="position:absolute;inset:0;background:rgba(0,0,0,.55);animation:ghostin .2s var(--ease);z-index:5"></div><div class="dlg7" style="position:absolute;left:8%;right:8%;top:22%;background:#282828;border-radius:7px;padding:7px;display:grid;gap:5px;font-size:6.5px;color:#ddd;z-index:6;animation:dlgin7 .25s var(--ease)"><b style="font-size:8px;color:#fff">Select text</b><span style="line-height:1.4">${txt}</span><div style="display:flex;justify-content:flex-end;gap:8px;font-weight:600;color:#3ea6ff"><span>Cancel</span><span class="all7">Copy all</span></div></div>`);
  });
  // hold a word: it is selected with its two handles, then the end handle is dragged to take in the next word
  const sel = (el, on2) => { if (el) el.style.background = on2 ? "rgba(62,166,255,.45)" : ""; };
  const spot = q => { const e = dev.querySelector(q), r = e.getBoundingClientRect(), d = dev.getBoundingClientRect(), z = d.width / W; return [(r.left - d.left) / z, (r.top - d.top) / z, r.width / z, r.height / z]; };
  at(1300, () => { const [x, y, w, h] = spot(".dlg7 .w7"); holdAt(f, x + w * .5, y + h * .5); });
  at(1750, () => { sel(dev.querySelector(".dlg7 .w7"), true); f.classList.remove("hold"); });
  at(1950, () => { const [x, y, w, h] = spot(".dlg7 .w8"); fingerTo(f, x + w, y + h * .5, 450); });
  at(2400, () => {
    sel(dev.querySelector(".dlg7 .w8"), true); f.classList.remove("show");
    const y = spot(".dlg7 .w7")[1]; // Android's bar sits over the selection, kept inside the screen
    dev.insertAdjacentHTML("beforeend", `<div class="bar7" style="position:absolute;left:50%;translate:-50% 0;top:${y - 15}px;display:flex;gap:6px;padding:2px 6px;border-radius:4px;background:#3c3c3c;font-size:6px;white-space:nowrap;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.5);z-index:7;animation:dlgin7 .2s var(--ease)"><span class="cp7">Copy</span><span>Select all</span><span>Share</span></div>`);
  });
  at(2900, () => { const [x, y, w, h] = spot(".bar7 .cp7"); fingerTo(f, x + w / 2, y + h / 2); });
  at(3150, () => { tapF(f); });
  at(3400, () => { f.classList.remove("show"); dev.querySelector(".bar7")?.remove(); toast7(dev, "\u201Creclaimed pine\u201D copied", "92%"); });
  return "Hold the description: select any part of it and copy it";
});
SCN_HOLD.morphe_copy_select_text = 4400;
scen("watch", "copy_video_title", (box, on) => {
  situation("Holding the video title");
  box.innerHTML = device("port", playerArea(0) + `<div style="position:absolute;left:6px;right:6px;top:38%;font-size:8px;font-weight:600;line-height:1.3" class="tt7">Building a tiny cabin in the Norwegian forest</div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(200, () => holdAt(f, W * .5, H * .41));
  at(900, () => { f.classList.remove("hold", "show"); if (on) { dev.querySelector(".tt7").style.background = "rgba(255,255,255,.12)"; toast7(dev, "Title copied"); } else toast7(dev, "Description opens", "80%"); });
  return on ? "Hold the title: it is copied" : "Hold the title: same as a tap, the description opens (stock)";
});
// Off: YouTube's own share panel (its title, a row of round targets with Copy link first).
// On: Android's share sheet (OpenSystemShareSheetPatch): a drag handle, the link with its copy button,
// people you share with, then the apps installed on the phone. Each is drawn after its real layout so
// the difference is the panel itself, not a caption.
scen("watch", "open_system_share_sheet", (box, on) => {
  situation("Tapping Share under a video");
  const pill = (ic, t, cls = "") => `<span class="${cls}" style="flex:none;display:inline-flex;align-items:center;gap:2px;background:#272727;border-radius:7px;padding:2px 5px;font-size:6px">${I(ic, "ico", 'style="width:7px;height:7px"')}${t}</span>`;
  box.innerHTML = device("port", `<div class="dv-video" style="background:${ART[0]}"></div><div class="dv-below" style="padding:5px 5px;gap:4px"><div style="font-size:6.5px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Building a tiny cabin in the Norwegian forest</div><div style="display:flex;gap:3px;overflow:hidden">${pill("like", "48K")}${pill("share", "Share", "shr7")}${pill("save", "Save")}</div></div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger");
  at(200, () => fingerOn(dev, f, dev.querySelector(".shr7"), .5, .5, 300)); at(600, () => tapF(f));
  const round = (bg, ic, t) => `<span style="display:grid;justify-items:center;gap:1px;width:18px"><span style="width:13px;height:13px;border-radius:50%;background:${bg};display:grid;place-items:center">${ic ? I(ic, "ico", 'style="width:7px;height:7px"') : ""}</span><span style="font-size:4.3px;color:#ccc;white-space:nowrap">${t}</span></span>`;
  const yt = `<div style="display:flex;justify-content:space-between;align-items:center;font-weight:600">Share${I("close", "ico", 'style="width:8px;height:8px"')}</div>
    <div style="display:flex;justify-content:space-between">${round("#3a3a3a", "link", "Copy")}${round("#2e7d32", "", "Messages")}${round("#1565c0", "", "Email")}${round("#3a3a3a", "moreh", "More")}</div>`;
  const sys = `<div style="justify-self:center;width:18px;height:2px;border-radius:1px;background:#777"></div>
    <div style="display:flex;align-items:center;gap:4px;background:#2b2b2b;border-radius:5px;padding:3px"><span style="width:16px;height:10px;border-radius:2px;background:${ART[0]};flex:none"></span><span style="min-width:0;flex:1;display:grid"><span style="font-size:5.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Building a tiny cabin in the Norwegian forest</span><span style="font-size:5px;color:#aaa">youtu.be/…</span></span>${I("copy", "ico", 'style="width:7px;height:7px;flex:none"')}</div>
    <div style="display:flex;justify-content:space-between">${[1, 2, 3, 4].map((i, n) => round(AV[i], "", ["Ana", "Leo", "Mia", "Sam"][n])).join("")}</div>
    <div style="height:1px;background:#333"></div>
    <div style="display:flex;justify-content:space-between">${round("#2e7d32", "", "Messages")}${round("#1565c0", "", "Email")}${round("#6a1b9a", "", "Notes")}${round("#455a64", "", "Nearby")}</div>`;
  at(850, () => { f.classList.remove("show"); sheet7(dev, on ? sys : yt); if (on) dev.querySelector(".sh7").style.background = "#2b2c30"; });
  return "";
});
scen("watch", "remove_viewer_discretion_dialog", (box, on) => {
  situation("Opening an age-sensitive video");
  box.innerHTML = device("port", playerArea(2));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  dev.insertAdjacentHTML("beforeend", `<div class="dlg7" style="position:absolute;left:8%;right:8%;top:30%;background:#282828;border-radius:6px;padding:6px;font-size:7px;display:grid;gap:4px;transition:opacity .25s"><b>Viewer discretion advised</b><span style="color:#aaa">This video may be inappropriate for some users.</span><span style="justify-self:end;color:#3ea6ff">I understand</span></div>`);
  const d = dev.querySelector(".dlg7");
  if (on) { d.style.opacity = "0"; at(100, () => d.style.opacity = "1"); at(400, () => { d.style.opacity = "0"; toast7(dev, "Accepted for you", "70%"); }); return "The dialog is accepted automatically (age limits still apply)"; }
  toast7(dev, "Playback waits for you", "82%");
  at(1300, () => fingerTo(f, W * .75, H * .47)); at(1900, () => tapF(f)); at(2100, () => { d.style.opacity = "0"; f.classList.remove("show"); dev.querySelectorAll(".t7").forEach(e => e.remove()); });
  at(2300, () => toast7(dev, "Every time you open one", "82%"));
  return "You have to confirm the dialog each time (stock)";
});

def("player", "style", "player_icon_style");
// DeArrow: the same video card in each place DeArrow can rewrite, original vs crowd-sourced title
SCENES.dearrow = () => {
  const places = [["dearrow_titles_home", "Home"], ["dearrow_titles_subscription", "Subscriptions"], ["dearrow_titles_search", "Search"], ["dearrow_titles_player", "Up next"], ["dearrow_titles_library", "You"]];
  const icon = !!V("morphe_dearrow_titles_icon"), casual = !!V("morphe_dearrow_casual_mode");
  const card = ([k, where], i) => {
    const on = !!V("morphe_" + k);
    const t = on ? (casual && i % 2 ? "I built a tiny cabin in Norway (original title kept)" : "Building a 12 m² cabin from reclaimed pine in two weeks") : "I BUILT a TINY CABIN in the FOREST?! 😱 (insane)";
    return C(k, `<div style="display:flex;gap:10px;padding:8px 12px;align-items:flex-start"><div style="width:132px;flex:none;position:relative">${thumb(on ? 3 : 0, "border-radius:8px")}${on ? `<span class="dur" style="left:4px;right:auto">still · ${entryLabel("morphe_dearrow_thumbnail_stills_time", V("morphe_dearrow_thumbnail_stills_time"))}</span>` : ""}</div>
      <div style="min-width:0"><div class="t2" style="font-size:10.5px;margin-bottom:2px">${where}</div><div class="t1" style="font-size:13px;line-height:1.3">${on && icon ? C("dearrow_titles_icon", `<span style="display:inline-grid;place-items:center;width:15px;height:15px;border-radius:4px;background:#1e88e5;margin-right:4px;vertical-align:1px;font-size:9px;line-height:1">DA</span>`, { tag: "span" }) : ""}${esc(t)}</div><div class="t2">Fjord & Timber · 1.2M views</div></div></div>`, { blk: 1 });
  };
  return `<div class="inner-scroll" style="background:#0f0f0f;max-height:350px;overflow-y:auto;padding:4px 0">
    ${places.map(card).join("")}
    ${C("dearrow_vote_button", `<div style="margin:6px 12px 10px"><span class="chip" style="height:30px">${I("like")} DeArrow: vote for a title</span></div>`, { blk: 1 })}
  </div>`;
};
def("dearrow", "vis", "dearrow_titles_icon dearrow_vote_button");
def("dearrow", "style", "dearrow_titles_home dearrow_titles_subscription dearrow_titles_search dearrow_titles_player dearrow_titles_library dearrow_casual_mode dearrow_thumbnail_stills_time");
// Playback: the player shows what its defaults lead to (speed, quality, HDR, codec), with the
// speed list of the custom speed menu under it.
SCENES.playback = () => {
  const spd = Number(V("morphe_playback_speed_default")), q = String(V("morphe_video_quality_default_wifi")), qm = String(V("morphe_video_quality_default_mobile"));
  const hdr = !V("morphe_disable_hdr_video") || !!V("morphe_force_hdr_video");
  const codec = V("morphe_video_codec"), pitch = Number(V("morphe_playback_audio_pitch_default"));
  const badge = (k, t, extra = "") => C(k, `<span class="chip" style="height:22px;font-size:11px;padding:0 7px;background:rgba(0,0,0,.6)${extra}">${t}</span>`, { tag: "span" });
  const speeds = speedList();
  return `<div class="inner-scroll" style="background:#0f0f0f;max-height:350px;overflow-y:auto">
    <div class="video" style="position:relative">${videoFrame(5)}<div class="scrim" style="opacity:.25"></div>
      <div style="position:absolute;left:8px;top:8px;display:flex;gap:5px;flex-wrap:wrap">
        ${badge("playback_speed_default", spd > 0 ? spd + "x" : "Auto speed")}
        ${badge("video_quality_default_wifi", `${I("wifi", "ico", 'style="width:12px;height:12px"')}${q === "-2" ? "Auto" : q + "p"}`)}
        ${badge("video_quality_default_mobile", `${I("phone", "ico", 'style="width:12px;height:12px"')}${qm === "-2" ? "Auto" : qm + "p"}`)}
        ${C("disable_hdr_video", `<span class="chip" style="height:22px;font-size:11px;padding:0 7px;background:${hdr ? "#d4a000;color:#000" : "rgba(0,0,0,.6)"}">${hdr ? "HDR" : "SDR"}</span>`, { tag: "span", also: "force_hdr_video" })}
        ${badge("video_codec", codec === "VP9" ? "VP9" : codec === "AVC" ? "H.264" : "Codec: auto")}
        ${pitch > 0 ? badge("playback_audio_pitch_default", `Pitch ${pitch}x`) : ""}
      </div>
      <div class="pbtn bigbtn" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.3)">${I("pause")}</div>
      <div class="time" id="pbTime" style="position:absolute;left:12px;bottom:14px">3:12 / 18:42</div>
      <div class="seek" style="bottom:6px"><div class="played" style="width:17%"></div></div>
    </div>
    ${C("custom_playback_speeds", `<div style="padding:10px 12px 4px"><div class="t2" style="margin-bottom:6px">Playback speed</div><div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none">${speeds.map(n => `<span class="chip" style="height:28px;flex:none;${n === (spd > 0 ? spd : 1) ? "background:#f1f1f1;color:#0f0f0f" : ""}">${n}x</span>`).join("")}</div></div>`, { blk: 1, also: "custom_speed_menu" })}
    <div style="padding:10px 12px 14px"><div class="t1">${esc(VIDEOS[5].t)}</div><div class="t2">${VIDEOS[5].c} · ${VIDEOS[5].v}</div></div>
  </div>`;
};
// Behaviour: a watch page, the place where autoplay, loops, live chat and the player's popups happen.
// Every setting here plays its own Off / On scenario; the page is what the tab shows between them.
SCENES.behaviour = () => {
  const ap = !!V("morphe_autoplay_control"), lc = !!V("morphe_loop_count");
  return `<div class="inner-scroll" style="background:#0f0f0f;max-height:350px;overflow-y:auto">
    <div class="video" style="position:relative">${videoFrame(3)}<div class="scrim" style="opacity:.25"></div>
      ${C("autoplay_control", `<span class="chip" style="position:absolute;right:8px;top:8px;height:22px;font-size:11px;padding:0 7px;background:rgba(0,0,0,.6)">${I("play", "ico", 'style="width:12px;height:12px"')} Autoplay ${ap ? "on" : "off"}</span>`, { tag: "span" })}
      ${lc ? C("loop_count", `<span class="chip" style="position:absolute;left:8px;top:8px;height:22px;font-size:11px;padding:0 7px;background:rgba(0,0,0,.6)">${I("loop", "ico", 'style="width:12px;height:12px"')} Loop 2</span>`, { tag: "span" }) : ""}
      <div class="pbtn bigbtn" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.3)">${I("pause")}</div>
      <div class="time" style="position:absolute;left:12px;bottom:14px">12:05 / ${VIDEOS[3].d}</div>
      <div class="seek" style="bottom:6px"><div class="played" style="width:96%"></div></div>
    </div>
    <div style="padding:10px 12px 4px"><div class="t1">${esc(VIDEOS[3].t)}</div><div class="t2">${VIDEOS[3].c} · ${VIDEOS[3].v}</div></div>
    <div class="t2" style="padding:8px 12px 4px">Up next</div>
    ${[4, 5].map(i => `<div style="display:flex;gap:10px;padding:6px 12px">${thumb(i, "width:120px;border-radius:8px;flex:none")}<div><div class="t1" style="font-size:13px">${esc(VIDEOS[i].t)}</div><div class="t2">${VIDEOS[i].c}</div></div></div>`).join("")}
  </div>`;
};
def("playback", "style", "playback_speed_default video_quality_default_wifi video_quality_default_mobile disable_hdr_video force_hdr_video video_codec playback_audio_pitch_default custom_playback_speeds custom_speed_menu");
// A tap on one of the preview's chips: it takes the picked look (and text, when given) for the length of
// the demo, then the preview is as it was. msg is the toast that answers the pick, if any.
function pickDemo(want, msg, text) {
  const st = $("stage"), chip = [...st.querySelectorAll(".chip")].find(c => c.offsetWidth && want(c)); if (!chip) { if (msg) showPill(msg, 1300); return; }
  const s0 = st.getBoundingClientRect(), k = (s0.width / (st.offsetWidth || 1)) || 1, r = chip.getBoundingClientRect();
  tapAt((r.left - s0.left + r.width / 2) / k, (r.top - s0.top + r.height / 2) / k);
  const was = { bg: chip.style.background, col: chip.style.color, html: chip.innerHTML }, others = [...(chip.parentElement?.children || [])].filter(c => c !== chip && c.classList.contains("chip")).map(c => [c, c.style.background, c.style.color]);
  const undo = () => { chip.style.background = was.bg; chip.style.color = was.col; if (text) chip.innerHTML = was.html; others.forEach(([c, b, col]) => { c.style.background = b; c.style.color = col; }); };
  dT(() => { if (!document.body.contains(chip)) return; if (text) { const tn = [...chip.childNodes].reverse().find(n => n.nodeType === 3); if (tn) tn.nodeValue = text; else chip.append(text); } else others.forEach(([c]) => { c.style.background = ""; c.style.color = ""; }); chip.style.background = "#f1f1f1"; chip.style.color = "#0f0f0f"; }, 260);
  if (msg) dT(() => showPill(msg, 1000), 420);
  onDemoStop(undo);
}
Object.assign(DEMOS, {
  // The toasts answer a change, so the change is shown: a tap on a speed (or on the quality readout),
  // the new value taking over, then the toast. With the setting off the same happens without a word.
  morphe_remember_playback_speed_last_selected_toast(on) { pickDemo(c => /^1\.5x$/.test(c.textContent.trim()), on && "Changed default speed to: 1.5x"); label(on ? "A toast confirms the new default speed" : "No toast when the default speed changes", !on, 1300); },
  morphe_remember_video_quality_last_selected_toast(on) { pickDemo(c => !!c.closest('[data-k="morphe_video_quality_default_wifi"]'), on && "Changed default Wi-Fi quality to: 1080p", "1080p"); label(on ? "A toast confirms the new default quality" : "No toast when the default quality changes", !on, 1300); },
});
def("playback", "behaviour", "remember_playback_speed_last_selected_toast remember_video_quality_last_selected_toast"); // skip silence: a comparison (scenario-kit.js)
// Stories that leave the screen the tab draws (shared: a video opening from the feed, the player leaving
// fullscreen, anything that goes to another screen and back). The other screens are covers: layers the
// size of the preview box that hold another tab's real scene (coverOf) or a copy of the preview exactly
// as it is right now (coverNow). A cover only ever moves as a whole, the way a screen does on the phone
// (it slides in or out, or shrinks into the player): nothing is morphed between two layouts, so no part
// can be squashed or left behind. The live preview under the covers is never touched, so ending a
// story is removing its covers, and a story that is cut short leaves nothing to put back.
const COVER_EASE = "cubic-bezier(.2,0,0,1)";
function cover7(content, z) {
  const el = document.createElement("div"); el.className = "sm7 dyn";
  if (typeof content === "string") el.innerHTML = content.replace(/background:#0f0f0f/g, "background:var(--app-bg,#0f0f0f)"); else el.appendChild(content);
  // scenery only: not a setting target, no message or finger of the story it was copied in
  el.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
  el.querySelectorAll("[data-k], [data-also]").forEach(e => { e.removeAttribute("data-k"); e.removeAttribute("data-also"); e.classList.remove("sel", "selx", "flash", "pressing"); });
  el.querySelectorAll(".toastin.dyn, .demo-label.dyn, .finger, .sm7").forEach(e => e.remove());
  Object.assign(el.style, { position: "absolute", inset: "0", zIndex: String(z), overflow: "hidden", pointerEvents: "none", background: "#000" });
  $("stage").appendChild(el);
  return el;
}
const coverOf = (otherId, edit = html => html, z = 29) => (SCENES[otherId] && $("stage").firstElementChild ? cover7(edit(SCENES[otherId]()), z) : null);
const coverNow = (z = 30) => { const here = $("stage").firstElementChild; return here && !here.classList.contains("sm7") ? cover7(here.cloneNode(true), z) : null; };
const covers = () => [...$("stage").querySelectorAll(".sm7")];
const clearCovers = () => covers().forEach(n => n.remove());
// The video of the Fullscreen preview, on the other screens of its stories (same title and length).
const fsVideo = html => html.split(esc(VIDEOS[0].t)).join(esc(VIDEOS[2].t)).split(`>${VIDEOS[0].d}<`).join(`>${VIDEOS[2].d}<`);
// The player leaving fullscreen: a copy of the preview shrinks into the watch page's player (measured)
// and fades into it. back = true plays it the other way (into fullscreen again).
function fullscreenMove(watch, back, ms = 460) {
  const st = $("stage"), copy = coverNow(30), strip = watch && watch.querySelector(".frame"); if (!copy || !strip) return 0;
  const b = st.getBoundingClientRect(), r = strip.getBoundingClientRect(), k = (b.width / (st.offsetWidth || 1)) || 1;
  const small = `translate(${((r.left + r.right) / 2 - (b.left + b.right) / 2) / k}px, ${(r.top - b.top) / k}px) scale(${r.height / (b.height || 1)})`;
  copy.style.transformOrigin = "50% 0"; copy.style.background = "transparent";
  // the fullscreen player is the picture while it moves: the watch page's own picture takes over at the end
  const fadeAt = back ? .35 : .65, key = (x, y) => (back ? [{ opacity: y }, { opacity: x, offset: fadeAt }, { opacity: x }] : [{ opacity: x }, { opacity: x, offset: fadeAt }, { opacity: y }]);
  copy.animate(back ? [{ transform: small }, { transform: "none" }] : [{ transform: "none" }, { transform: small }], { duration: ms, easing: COVER_EASE, fill: "both" });
  copy.animate(key(1, 0), { duration: ms, easing: "linear", fill: "both" });
  strip.animate(key(0, 1), { duration: ms, easing: "linear", fill: "both" });
  return ms;
}
Object.assign(DEMOS, {
  // The video reaches its end on the fullscreen preview. If the chosen option covers this (landscape)
  // fullscreen, the player shrinks into the watch page and stays there until the next round, which
  // starts by going fullscreen again. Otherwise a message says it stays. One story every three loops.
  morphe_exit_fullscreen(v) {
    if (demoStep % 3) return;
    const st = $("stage"), root = st.firstElementChild, pl = root.querySelector(".seek .played"), kn = root.querySelector(".seek .knob"), time = root.querySelector(".time");
    const set = (w, ms) => [pl, kn].forEach(e => { if (!e) return; e.style.transition = ms ? `${e === pl ? "width" : "left"} ${ms}ms linear` : "none"; e.style[e === pl ? "width" : "left"] = w + "%"; });
    const total = VIDEOS[2].d, clockAt = t => { if (time) time.textContent = `${t} / ${total}`; };
    const rest = time ? time.textContent : "";
    if (!demoStep) onDemoStop(() => { clearCovers(); set(52, 0); if (time) time.textContent = rest; });
    // the last round ended on the watch page: back into fullscreen first, a little before the end
    const was = covers(); set(88, was.length ? 0 : 200); clockAt("36:10");
    let t = 260;
    if (was.length) { const ms = fullscreenMove(was[0], true, 380); dT(clearCovers, ms + 20); t = ms + 260; }
    dT(() => set(100, 900), t); dT(() => clockAt(total), t + 900);
    const exits = /LANDSCAPE/.test(String(v)); // the preview is a landscape fullscreen
    dT(() => {
      if (!exits) { showPill(String(v) === "PORTRAIT" ? "Stays in landscape fullscreen" : "Stays in fullscreen", 1700); return; }
      const watch = coverOf("watch", fsVideo, 29); if (!watch) return;
      const played = watch.querySelector(".seek .played"); if (played) played.style.width = "100%"; // the same video, at its end
      const ms = fullscreenMove(watch, false);
      dT(() => { covers().forEach(n => { if (n !== watch) n.remove(); }); showPill("Leaves fullscreen", 1500); }, ms + 20);
    }, t + 1050);
  },
});
def("fullscreen", "behaviour", "exit_fullscreen");
// a plain row on the Fullscreen tab, in its "Entering and leaving fullscreen" group, with no animation (Max, Nov 20)
def("fullscreen", "list", "open_videos_fullscreen");
// Comments: context lines (pinned, creator heart), gift cards, and a scrollable panel
{ const base = SCENES.comments; SCENES.comments = () => base()
    .replace('<div style="position:absolute;left:0;right:0;top:44px;bottom:0;background:#212121;border-radius:14px 14px 0 0;overflow-y:auto;scrollbar-width:thin">', '<div class="inner-scroll" style="position:absolute;left:0;right:0;top:44px;bottom:0;background:#212121;border-radius:14px 14px 0 0;overflow-y:auto;scrollbar-width:thin;padding-bottom:10px">')
    .replace(/(<div style="display:flex;gap:10px;padding:10px 12px">)/, `${C("hide_comments_contexts", `<div class="t2" style="padding:6px 12px 0 50px;display:flex;gap:6px;align-items:center;font-size:11.5px">${I("lock", "ico", 'style="width:12px;height:12px;fill:#aaa"')}Pinned by @fjordtimber</div>`, { blk: 1 })}$1`)
    .replace(/(<\/div>\s*<\/div>\s*)$/, `${C("hide_comments_gift_animation_and_cards", `<div style="margin:6px 12px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,#3b2a12,#2a2a2a);display:flex;gap:10px;align-items:center">${I("gift", "ico", 'style="fill:#ffb74d"')}<div><b style="font-size:12.5px">@carpenter_jo sent 5 gifts</b><div class="t2">Gifted memberships to the community</div></div></div>`, { blk: 1 })}
      <div style="display:flex;gap:10px;padding:10px 12px">${av(7, 28)}<div style="flex:1"><div class="t2">@slowrails · 5h ${I("heart", "ico", 'style="width:12px;height:12px;fill:#ff4e45;vertical-align:-2px"')}</div><div style="font-size:13.5px;margin-top:2px">Which stove model is that?</div></div></div>$1`); }
def("comments", "vis", "hide_comments_contexts hide_comments_gift_animation_and_cards");
// "Player icon style": the player buttons draw the real icons of the chosen set, from the patch's own drawables
const styledIcons = (html, style) => {
  const set = typeof ICON_STYLES !== "undefined" && ICON_STYLES[style];
  if (!set) return html;
  return html.replace(/(<div class="pbtn[^"]*"[^>]*>\s*)<svg class="ico" viewBox="0 0 24 24"\s*><path d="([^"]*)"\/><\/svg>/g, (m, open, d) => {
    const name = Object.keys(set).find(k => P[k] === d);
    return name ? `${open}<svg class="ico sty" viewBox="${set[name][0]}">${set[name][1]}</svg>` : m;
  });
};
{ const base = SCENES.player; SCENES.player = () => { const st = V("morphe_player_icon_style") || "AUTO"; return styledIcons(base(), st).replace(/^\s*<div/, `<div data-icons="${esc(st)}"`); }; }
// Open Shorts with (Max, Nov 25: review these animations): the tapped Short grows out of its tile into
// the player the option picks, so each side ends on a clearly different screen and no sentences are needed.
// Shorts player: the Short fills the screen, the action column on the right, title and channel at the
// bottom, the thin Shorts progress line. Regular player: a 16:9 player with the vertical video between black
// bars, the title, channel and comments under it. Regular player fullscreen: black screen, the video at full
// height with the regular player's seekbar and time (no Shorts buttons).
SCN_HOLD.morphe_shorts_player_type = 2400; // three plays per loop
scen("shorts", "shorts_player_type", (box, v) => {
  const shelf = `<div class="dv-feed" style="position:absolute;inset:0;background:#0f0f0f;padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;align-content:start;transition:opacity .25s">
    <div style="grid-column:1/-1;height:8px;width:40%;border-radius:3px;background:#ff0033;opacity:.8"></div>
    ${[5, 6].map(i => `<div class="${i === 5 ? "sh7" : ""}" style="aspect-ratio:9/16;border-radius:5px;background:${ART[i]}"></div>`).join("")}<i style="grid-column:1/-1;height:8px;border-radius:3px;background:#2a2a2a"></i><i style="grid-column:1/-1;height:8px;width:70%;border-radius:3px;background:#2a2a2a"></i></div>`;
  box.innerHTML = device("port", shelf);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  const tile = dev.querySelector(".sh7"), tx = tile.offsetLeft + 6, ty = tile.offsetTop + 6; // pageRows-like 6px padding is inside .dv-feed
  const vid = (css) => `<div style="position:absolute;${css};background:${ART[5]}"></div>`;
  const screen = v === "REGULAR_PLAYER"
    ? `<div style="position:absolute;inset:0;background:#0f0f0f"><div style="position:absolute;left:0;right:0;top:0;height:${Math.round(W * 9 / 16)}px;background:#000">${vid("left:39%;right:39%;top:0;bottom:0")}<div style="position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.25)"><div style="width:22%;height:2px;background:#ff0033"></div></div></div><div style="position:absolute;left:6px;right:6px;top:${Math.round(W * 9 / 16) + 5}px;display:grid;gap:4px"><i style="display:block;height:6px;width:85%;border-radius:3px;background:#eee"></i><div style="display:flex;gap:3px;align-items:center"><span style="width:10px;height:10px;border-radius:50%;background:${AV[2]}"></span><i style="height:5px;width:40%;border-radius:3px;background:#555"></i></div><i style="display:block;height:14px;border-radius:4px;background:#272727"></i><i style="display:block;height:14px;border-radius:4px;background:#1e1e1e"></i></div></div>`
    : v === "REGULAR_PLAYER_FULLSCREEN"
    ? `<div style="position:absolute;inset:0;background:#000">${vid("left:14%;right:14%;top:0;bottom:0")}<div style="position:absolute;left:8%;right:8%;bottom:9%;height:2px;background:rgba(255,255,255,.35)"><div style="width:22%;height:2px;background:#ff0033"></div><i style="position:absolute;left:22%;top:-2px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#ff0033"></i></div><span style="position:absolute;left:8%;bottom:calc(9% + 5px);font-size:5.5px;color:#ddd">0:04 / 0:19</span>${ico7("full", 7, "#fff").replace('style="', 'style="position:absolute;right:8%;bottom:calc(9% + 4px);')}</div>`
    : `<div style="position:absolute;inset:0">${vid("inset:0")}<div style="position:absolute;right:4px;bottom:20%;display:grid;gap:6px;justify-items:center">${["like", "dislike", "comment", "share"].map(n => ico7(n, 9, "#fff")).join("")}</div><div style="position:absolute;left:6px;bottom:7%;display:grid;gap:3px;width:62%"><div style="display:flex;gap:3px;align-items:center"><span style="width:9px;height:9px;border-radius:50%;background:${AV[2]}"></span><i style="height:4px;width:50%;border-radius:2px;background:rgba(255,255,255,.75)"></i></div><i style="display:block;height:4px;border-radius:2px;background:rgba(255,255,255,.55)"></i></div><div style="position:absolute;left:0;right:0;bottom:0;height:1.5px;background:rgba(255,255,255,.3)"><div style="width:22%;height:1.5px;background:#fff"></div></div></div>`;
  at(150, () => fingerTo(f, tx + tile.offsetWidth * .5, ty + tile.offsetHeight * .5));
  at(450, () => tapF(f));
  at(620, () => {
    f.classList.remove("show");
    // the tile grows into the screen
    const r = tile.getBoundingClientRect(), d = dev.getBoundingClientRect(), z = d.width / W;
    const x = (r.left - d.left) / z, y = (r.top - d.top) / z, w = r.width / z, h = r.height / z;
    dev.insertAdjacentHTML("beforeend", `<div class="grow7" style="position:absolute;inset:0;overflow:hidden;z-index:2;transform-origin:0 0;border-radius:${5 * W / w}px;transform:translate(${x}px,${y}px) scale(${w / W},${h / H});transition:transform ${380 * scStretch}ms cubic-bezier(.2,0,0,1),border-radius ${380 * scStretch}ms">${screen}</div>`);
    const g = dev.querySelector(".grow7"); void g.offsetWidth; g.style.transform = "none"; g.style.borderRadius = "0";
    dev.querySelector(".dv-feed").style.opacity = ".35";
  });
  return "";
});

Object.assign(DEMOS, {
  morphe_swipe_zone_preview() { swipeZones(1400, true); label("Swipe zones: left, right and top, with their gesture", false, 1400); },
  morphe_swipe_speed_zone_height() { swipeZones(1400, true); label(`Top zone: ${V("morphe_swipe_speed_zone_height")}% of the player height`, false, 1400); },

});

// Video action bar layout: the pill layouts scroll their row (a finger drags it along and back), the
// minimal one keeps four buttons and its More button opens the menu with all the others
// moves a row's scroll with the finger that drags it (a smooth scrollTo runs on its own clock)
function scrollTween(el, to, ms) {
  const from = el.scrollLeft, t0 = performance.now(), ease = t => 1 - Math.pow(1 - t, 3), id = el.__tw = (el.__tw || 0) + 1;
  const step = () => { if (!el.isConnected || el.__tw !== id) return; /* a newer move, or the demo stopped (it bumps __tw) */ const t = Math.min(1, (performance.now() - t0) / ms); el.scrollLeft = from + (to - from) * ease(t); if (t < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
DEMOS.morphe_video_action_bar_layout = v => {
  const root = $("stage").firstElementChild, f = finger(); if (!root || !f) return;
  const st = $("stage").getBoundingClientRect(), at = (el, fx = .5) => { const r = el.getBoundingClientRect(); return [r.left - st.left + r.width * fx, r.top - st.top + r.height / 2]; };
  if (String(v) === "MINIMAL") {
    const more = root.querySelector(".mtile[data-more]"); if (!more) return;
    let menu = root.querySelector(".abmenu");
    if (!menu) {
      const items = [["remix", "Remix"], ["dollar", "Thanks"], ["dl", "Download"], ["clip", "Clip"], ["spark", "Ask"], ["flag", "Report"]];
      // a small menu that opens from the More button, as YouTube's overflow menus do
      root.insertAdjacentHTML("beforeend", `<div class="abmenu" style="position:absolute;right:10px;width:46%;z-index:20;background:#282828;border-radius:12px;padding:4px 0;box-shadow:0 6px 24px rgba(0,0,0,.6);opacity:0;scale:.92;transform-origin:85% 100%;transition:opacity .18s,scale .22s var(--ease)">${items.map(([i, t]) => `<div style="display:flex;align-items:center;gap:10px;padding:4px 12px;font-size:12px;color:#f1f1f1">${I(i, "ico", 'style="width:18px;height:18px"')}${t}</div>`).join("")}</div>`);
      menu = root.querySelector(".abmenu");
      const rr = root.getBoundingClientRect(), mr = more.getBoundingClientRect();
      menu.style.top = Math.max(4, mr.top - rr.top + root.scrollTop - menu.offsetHeight - 2) + "px";
      onDemoStop(() => root.querySelectorAll(".abmenu").forEach(n => n.remove()));
    }
    if (demoStep % 2 === 0) { const [x, y] = at(more); tapAt(x, y); dT(() => { more.style.background = "rgba(255,255,255,.12)"; menu.style.opacity = 1; menu.style.scale = "1"; }, 160); }
    else { tapAt(st.width * .5, 40); dT(() => { more.style.background = ""; menu.style.opacity = 0; menu.style.scale = ".92"; }, 160); }
    return;
  }
  const row = root.querySelector(".abrow"); if (!row) return;
  const max = row.scrollWidth - row.clientWidth; if (max < 8) return;
  // back at the start; parts whose pop origin was worked out at the clipped edge get it again
  if (!demoStep) onDemoStop(() => { row.__tw = (row.__tw || 0) + 1; row.scrollLeft = 0; row.querySelectorAll('[style*="--pop"]').forEach(popOrigin); });
  const fwd = demoStep % 2 === 0, [x0, y] = at(row, fwd ? .82 : .25);
  // the sideways drag, 15% quicker than it was (650 ms, Max, Nov 25); where it goes is measured when it goes:
  // the page may still be scrolling to the row (selected from another setting), and a spot measured 120 ms
  // earlier sent the finger up to 76 px above the row
  place(f, x0, y); f.classList.add("hold");
  dT(() => { const [x1, y1] = at(row, fwd ? .25 : .82); place(f, x1, y1, 553); scrollTween(row, fwd ? Math.min(max, 220) : 0, 553); }, 120);
  hideF(f, 780);
};
