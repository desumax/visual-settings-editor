"use strict";
// Off / On comparison animations: the kit, the canvas, and the scenarios for the player screens.

// ------------------------------------------------------------------ scenario animations (standard canvas)
// Every scenario uses the same frame: fade the preview to black (220 ms), caption top-left with the
// setting and its new state, device illustration in the middle, one-line outcome at the bottom,
// a progress line, then fade back (220 ms). Body length is SC_HOLD.
const SC_FADE = 220, SC_HOLD = 3000;
const SCN_HOLD = {}; // per-scenario body length when a story needs longer than SC_HOLD
// Settings whose story acts away from their parent's part in the preview (a feed thumbnail, an alert), so
// selecting them doesn't flash that part (Max, Nov 25: Feed thumbnail like count flashed the dislike count)
const AWAY = new Set();
const SCN = {};
const scen = (section, keys, fn) => keys.split(/\s+/).forEach(k => { A["morphe_" + k] = { section, kind: "scenario" }; SCN["morphe_" + k] = fn; });
// Device illustration. Content that depends on orientation goes in .dv-video (the player area)
// and .dv-below (the page under the player); CSS lays both out for .port and .land, so a
// scenario can rotate the phone with rotate() and nothing ends up covering anything else.
const DEV_SIZE = { port: [92, 172], land: [190, 108], duo: [206, 186] };
// Two phones side by side (stock on the left, the setting on the right), scaled together as one.
// sides: [[value, label], [value, label]] from duoValues, so the words and sides match the card's toggle
// a hand-built pair: the same markup as a generated one, so it is laid out the same way (labels beside it)
const duo7 = (left, right, sides = [[false, "Off"], [true, "On"]]) => `<div class="duo7 gen">${[left, right].map((html, i) => `<div class="dl7"><span class="${NEG_WORD.has(sides[i][1]) ? "neg" : i ? "on" : ""}">${esc(sides[i][1])}</span><div class="side">${device("port", html)}</div><div class="sf7"></div></div>`).join("")}</div>`;
// The faded half phone (Max, rounds 140 to 142). Two whole upright phones side by side are narrow and
// tall: the preview's height limits them and most of its width stays black. A story whose point sits
// in the top part of the screen (or the bottom part) shows only that part: the rest of the phone fades
// out and takes no room, so the pair is drawn about a third larger. The phone keeps its whole drawing
// (92 x 172, every position in a story stays as it was); only CROP_CUT px of it, at the far end, is
// cut away (preview.css .crop7). Turned on its side the phone is whole again, the cut sliding away
// with the turn. Message pills stay in the part that is shown (devBand, keepPillIn, pillOffText).
// The stories are listed here, by setting, not at each story: one list, one place to add or take out.
// Not for stories that turn the phone with turn() / turnTo() (their slot is sized for the whole phone);
// rotate() is fine.
const CROP_CUT = 44, CROP_FADE = 26; // the same lengths as --cut7 and --fade7 in preview.css
const CROP7 = {};
("hide_album_cards hide_artist_cards hide_channel_buttons hide_get_premium_button hide_handle hide_help_feedback_menu "
  + "hide_history_shelf hide_image_shelf hide_invite_to_message_card hide_notifications_menu_header hide_latest_videos_button "
  + "hide_notify_me_button hide_search_term_thumbnails hide_show_more_button hide_subscribed_channels_bar "
  + "hide_subscribed_channels_bar_names hide_unavailable_videos_hidden_banner hide_web_search_results hide_you_may_like_section "
  + "hide_floating_microphone_button playlist_hide_removal_snackbar hide_aislist_blocklist_home hide_aislist_blocklist_search "
  + "hide_aislist_warnlist_home hide_aislist_warnlist_search hide_filter_bar_in_comments hide_filter_bar_in_history "
  + "hide_filter_bar_in_related_videos hide_filter_bar_in_search hide_keyword_content_comments hide_channel_tab "
  + "override_youtube_music_buttons settings_search_history series_tracker hide_toolbar_microphone_button "
  + "hide_subscribers_community_guidelines hide_comments_carousel hide_comments_zero_state disable_layout_updates "
  + "fix_status_bar_layout spoof_app_version theme_color_change_foreground custom_filter bypass_ambient_mode_restrictions "
  + "enhanced_ambient_mode_dim_while_scrolling fix_transcript minimal_comments_button sanitize_comments_highlighted_search_links "
  + "hide_shorts_channel hide_shorts_history hide_shorts_notifications hide_shorts_search hide_shorts_subscriptions "
  + "hide_shorts_live_preview shorts_autoplay_background shorts_disable_background_playback shorts_remember_playback_speed "
  + "skip_live_shorts autoplay_control disable_playlist_autoplay do_not_remember_loop_video "
  + "seek_notification_media_prev_next force_original_audio remember_live_stream_position video_delay_bluetooth_only "
  + "disable_playback_speed_music shorts_quality_default_mobile shorts_quality_default_wifi remember_playback_speed_last_selected "
  + "remember_video_quality_last_selected remember_shorts_quality_last_selected vot_enabled dearrow_connection_toast "
  + "restore_original_titles playlist_wide_drag_handles post_image_download open_channel_of_live_avatar "
  + "fullscreen_video_scale_button_fullscreen_only disable_rolling_number_animations "
  + "search_comments copy_select_text copy_video_title remove_viewer_discretion_dialog").split(" ").forEach(k => CROP7["morphe_" + k] = "top");
("queue_type hide_ask_gemini_button hide_sync_button download_force_4k auto_translate_additional_languages "
  + "advanced_video_quality_menu hide_premium_video_quality live_chat_translate "
  + "live_chat_translate_bold live_chat_translate_use_color live_chat_translate_copy_button hide_comments_live_chat_donators_bar "
  + "hide_comments_live_chat_scroll_to_bottom_button hide_comments_live_chat_tooltips hide_shorts_video_description "
  + "hide_shorts_search_suggestions narrow_navigation_buttons navigation_bar_animations miniplayer_disable_horizontal_drag "
  + "miniplayer_disable_horizontal_drag_playback").split(" ").forEach(k => CROP7["morphe_" + k] = "bot");
let scKey = null; // the setting whose comparison is being drawn (playScenario), for its phones' crop
const cropOf = dev => !dev || !dev.classList.contains("crop7") ? "" : dev.classList.contains("cbot7") ? "bot" : "top";
// the part of a phone that is shown, top to bottom in its own px: all of it, or the part a crop keeps
// (without the fade, so a message there reads in full)
function devBand(dev) {
  const H = dev.clientHeight, c = dev.classList.contains("port") ? cropOf(dev) : "";
  return c === "top" ? [0, H - CROP_CUT - CROP_FADE] : c === "bot" ? [CROP_CUT + CROP_FADE, H] : [0, H];
}
// A story phone's hand is sized from the phone (30% of its short side, at most the live preview's 40px):
// a fixed 40px hand covered almost half of a portrait phone (Max, Nov 25: Rolling number animations,
// Open system share sheet, Select text, Drag and drop and others too big).
const FINGER_K = .3, fingerSize = (w, h) => Math.min(40, Math.min(w, h) * FINGER_K).toFixed(1) + "px";
function device(orient, inner, extra = "", crop = scKey && CROP7[scKey]) {
  const [w, h] = DEV_SIZE[orient], c = crop === true ? "top" : crop || "";
  return `<div class="dev ${orient}${c ? ` crop7 c${c}7` : ""}" style="width:${w}px;height:${h}px;--fz7:${fingerSize(w, h)};${extra}"><div class="waves l"></div><div class="waves r"></div>${inner}<div class="finger" id="scFinger">${I("gesture")}</div></div>`;
}
const playerArea = (i, overlay = "") => `<div class="dv-video" style="background:${ART[i]}">${overlay}</div><div class="dv-below"><i></i><i></i><i></i></div>`;
function setOrient(dev, orient) { const [w, h] = DEV_SIZE[orient]; dev.classList.remove("port", "land"); dev.classList.add(orient); dev.style.width = w + "px"; dev.style.height = h + "px"; dev.style.setProperty("--fz7", fingerSize(w, h)); }
// in a pair, a phone changing shape re-lays out the pair, and everything glides there (see fitDev)
function rotate(dev, orient) { const g = dev.closest(".duo7.gen"); if (g) { g._turn = true; g._was = g._was || pairSnap(g); } setOrient(dev, orient); fitDevSoon(orient); }
// Performance (Max, Nov 22): a phone turning and its caption changing in the same step, or both phones
// changing at the same moment, re-lay out the pair once, at the end of that step and before it is drawn,
// instead of once per change (each one measured the whole pair again). While a comparison is being
// drawn nothing is laid out until both phones are there (draw lays them out once at its end).
let fitQueue = null, scDrawing = false;
function fitDevSoon(orient, after) {
  if (scDrawing) return;
  if (!fitQueue) { fitQueue = { orient, after: [] }; queueMicrotask(() => { const q = fitQueue; fitQueue = null; fitDev(q.orient); q.after.forEach(f => f()); }); }
  else if (orient) fitQueue.orient = orient;
  if (after) fitQueue.after.push(after);
}
// The phone in a scenario is drawn at a fixed small size (so all coordinates stay simple) and then
// scaled up to fill the space the canvas has, between the caption line and the footer.
function fitScale(w, h) {
  // the preview keeps its size during a comparison, so use all of it: room for the title, the
  // situation line, and the bottom caption only when there is one
  const canvas = $("canvas"), sit = canvas.querySelector(".sit"), foot = canvas.querySelector(".foot");
  // only a few px of black stay above, below and beside the phones (Max, Nov 23: the phones take the room);
  // a story where a phone turns keeps a little more, for the corners of the phone while it is mid-turn
  const t = scTurns ? 6 : 0;
  const availW = canvas.clientWidth - 6 - t, availH = canvas.clientHeight - (canvas.querySelector(".cap") ? 30 : 4) - (foot && foot.textContent.trim() ? 24 : 0) - (sit ? sit.offsetHeight + 4 : 0) - 2 - t;
  return Math.max(.35, Math.min(3, availW / (w + 2 + t), availH / (h + 2 + t)));
}
// The pair is measured, not estimated: an invisible copy with every transition switched off shows
// the final size of everything in it (a phone that is still turning, a caption that wraps to more
// lines, a long label), laid out side by side and stacked.
// Performance (Max, Nov 22): a phone's drawing never changes the pair's size (each .dev has its own
// width and height), so the copy is made without it, and a pair whose labels, captions, phone sizes
// and label scale are unchanged reuses the last measurement: a comparison asks many times a second.
function measurePair(gen) {
  const devs = [...gen.querySelectorAll(".dev")], cap = c => c.textContent;
  const key = [devs.map(d => d.style.width + "x" + d.style.height).join(), [...gen.querySelectorAll(":scope > .dl7 > span")].map(cap).join("|"),
    [...gen.querySelectorAll(":scope > .dl7 > .sf7")].map(cap).join("|"), gen.style.getPropertyValue("--dsc"), gen.querySelectorAll(".ask7").length, gen.parentElement.clientWidth].join("#");
  if (gen._measured && gen._measured.key === key) return gen._measured.m;
  const base = gen.cloneNode(true);
  base.querySelectorAll(".dev").forEach(d => d.replaceChildren());
  base.removeAttribute("data-fit"); base.classList.add("probe7");
  base.querySelectorAll("[id]").forEach(e => e.removeAttribute("id")); base.querySelectorAll(".glide7").forEach(e => e.remove()); base.classList.remove("capgo");
  // one copy per layout, all laid out together and read after: the page is laid out once for the four
  // instead of once per layout tried (Max, Nov 22: performance)
  // labels beside the phones (labout side by side, labright stacked): see the CSS
  const variant = (dir, side = false, top = false) => { const v = base.cloneNode(true); v.classList.toggle("capside", side); v.classList.toggle("labright", dir === "column" && !top); v.classList.toggle("labout", dir === "row" && !top); v.style.flexDirection = dir; return v; };
  // captions beside the phones: only for portrait pairs (landscape phones are already wide)
  const portrait = !base.querySelector(".dev.land");
  // labels above the phones, side by side: taken only when it draws the phones clearly larger (a wide,
  // short preview gives the width to the labels beside; a tall one can spare a line on top; Max, Nov 20)
  const probes = [variant("row"), variant("column"), portrait ? variant("row", true) : null, variant("row", false, true)];
  probes.forEach(v => v && gen.parentElement.appendChild(v));
  const [rowWH, colWH, sideWH, topWH] = probes.map(v => v ? [v.offsetWidth, v.offsetHeight] : null);
  probes.forEach(v => v && v.remove());
  const m = { rowWH, colWH, sideWH, topWH };
  gen._measured = { key, m };
  return m;
}
// where an element sits inside the pair, in the pair's own unscaled pixels (whatever its scale is right
// now), measured from the pair's centre: the pair is centred in the preview, so when it changes size its
// centre stays put while its corner moves
function inPair(gen, el) {
  const G = gen.getBoundingClientRect(), r = el.getBoundingClientRect(), k = G.width / (gen.offsetWidth || 1) || 1, cs = getComputedStyle(el);
  return { x: (r.left - (G.left + G.width / 2)) / k, y: (r.top - G.top) / k, w: el.offsetWidth, fs: cs.fontSize, lh: cs.lineHeight };
}
// The one motion curve of a comparison: phones turning, the pair resizing and captions moving all
// use .5 s on --ease (cubic-bezier(.4, 0, .2, 1)), started on the same frame, so they move as one.
const MOVE_MS = 500;
let pairMs = MOVE_MS; // a quicker turn (turn(..., ms)) moves the rest of its pair on the same clock
const moveEase = (() => { // cubic-bezier(.4, 0, .2, 1), the CSS --ease
  const x1 = .4, y1 = 0, x2 = .2, y2 = 1, B = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let n = 0; n < 24; n++) { t = (lo + hi) / 2; if (B(t, x1, x2) < x) lo = t; else hi = t; } return B(t, y1, y2); };
})();
// where a caption ends up once the phones have finished turning: an untransitioned copy of the pair
function finalCapPlaces(gen) {
  const probe = gen.cloneNode(true); probe.removeAttribute("data-fit"); probe.classList.add("probe7");
  probe.querySelectorAll(".dev").forEach(d => d.replaceChildren()); // sizes only (see measurePair)
  probe.querySelectorAll("[id]").forEach(e => e.removeAttribute("id")); probe.querySelectorAll(".glide7").forEach(e => e.remove());
  probe.classList.remove("capgo"); probe.classList.toggle("capside", gen.dataset.lay === "side"); probe.classList.toggle("labright", gen.classList.contains("labright")); probe.classList.toggle("labout", gen.classList.contains("labout"));
  gen.parentElement.appendChild(probe);
  const out = [...probe.querySelectorAll(".dl7 > .sf7")].map(c => inPair(probe, c));
  probe.remove(); return out;
}
// A caption moving to a new layout: a stand-in copy goes from where the caption was to where it will
// be, on the same curve and clock as the phones, morphing its width, font size and line breaks, then
// hands over to the real caption.
function glideCap(gen, cap, from, to) {
  if (cap._gliding) { cap._gliding.remove(); }
  const g = cap.cloneNode(true); g.className = "sf7 glide7"; cap._gliding = g; g._to = to;
  const px = v => parseFloat(v) || 0, t0 = performance.now();
  g.style.cssText = `position:absolute;margin:0;min-width:0;pointer-events:none;z-index:2;text-align:center;left:calc(50% + ${from.x}px);top:${from.y}px;width:${from.w}px;font-size:${from.fs};line-height:${from.lh}`;
  gen.appendChild(g); cap.style.opacity = "0";
  const lerp = (a, b, e) => a + (b - a) * e;
  const step = now => {
    // replaced by a newer glide (the other phone turning, a new caption): that one owns the caption now;
    // clearing it here showed the real caption under the new copy (two lines drawn over each other)
    if (cap._gliding !== g) { g.remove(); return; }
    if (!g.isConnected || !cap.isConnected) { g.remove(); cap.style.opacity = ""; cap._gliding = null; return; }
    const t = Math.min(1, (now - t0) / pairMs), e = moveEase(t), to = g._to;
    g.textContent = cap.textContent;
    // measured from the pair's centre, which the pair's own resize keeps in place
    g.style.left = `calc(50% + ${lerp(from.x, to.x, e)}px)`; g.style.top = lerp(from.y, to.y, e) + "px";
    g.style.width = lerp(from.w, to.w, e) + "px";
    g.style.fontSize = lerp(px(from.fs), px(to.fs), e) + "px"; g.style.lineHeight = lerp(px(from.lh), px(to.lh), e) + "px";
    // out of its old place and into the new one: it never crosses over (or hides behind) the phones
    // that are growing past it at mid-move
    g.style.opacity = String(e < .5 ? Math.max(0, 1 - 3 * e) : Math.max(0, (e - .65) / .35));
    if (t < 1) requestAnimationFrame(step);
    else { g.remove(); cap.style.opacity = ""; cap._gliding = null; cap._pos = inPair(gen, cap); }
  };
  step(t0);
  requestAnimationFrame(step);
}
// The labels and phone slots of a pair, and where each one's centre is drawn right now, in the pair's
// own (unscaled) pixels measured from its top centre, whatever its scale or a running glide.
const pairParts = gen => [...gen.querySelectorAll(":scope > .dl7 > span, :scope > .dl7 > .side")];
function pairSnap(gen) {
  const G = gen.getBoundingClientRect(), k = G.width / (gen.offsetWidth || 1) || 1;
  return pairParts(gen).map(el => { const r = el.getBoundingClientRect(); return [el, (r.left + r.width / 2 - (G.left + G.width / 2)) / k, (r.top + r.height / 2 - G.top) / k]; });
}
// Whenever the pair re-lays out (a phone turning, a caption growing), its final layout lands at once
// and every label and phone glides from where it was drawn to its new place, on the pair's own curve
// and clock (MOVE_MS, --ease), while the pair rescales: one continuous motion, nothing snapping across
// halfway or at the end.
// where each part's centre sits in the new layout, in the same coordinates; offsets ignore transforms,
// so a glide still running doesn't count
const absOff = el => { let x = 0, y = 0; for (let e = el; e; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return [x, y]; };
function pairTargets(gen) {
  const [gx, gy] = absOff(gen), gw = gen.offsetWidth;
  return new Map(pairParts(gen).map(el => { const [x, y] = absOff(el); return [el, [x - gx + el.offsetWidth / 2 - gw / 2, y - gy + el.offsetHeight / 2]]; }));
}
function pairGlide(gen, was) {
  if (!was) return;
  const to = pairTargets(gen);
  was.forEach(([el, x, y]) => {
    const n = to.get(el); if (!n) return;
    const run = el.getAnimations().filter(a => a.id === "pairglide" && a.playState === "running");
    // already on its way to the same place: let it carry on rather than starting over
    if (run.length && el._at && Math.abs(el._at[0] - n[0]) < .5 && Math.abs(el._at[1] - n[1]) < .5) return;
    run.forEach(a => a.cancel()); el._at = n;
    const dx = x - n[0], dy = y - n[1]; if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return;
    el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { id: "pairglide", duration: pairMs, easing: "cubic-bezier(.4,0,.2,1)" });
  });
}
function fitDev(orient) {
  const canvas = $("canvas"), box = canvas.querySelector(".scbox"), gen = box && box.querySelector(".duo7.gen");
  if (gen) { // the two phones sit side by side or stacked, whichever lets them be drawn larger
    // the pair's first moments (its own setup calls, the first caption) settle without animating
    if (!gen.dataset.fit) gen.dataset.fit = String(performance.now());
    const first = performance.now() - Number(gen.dataset.fit) < 250, resized = canvasResized && !first; canvasResized = false;
    // where everything was drawn before this change (a turning phone measures it before it reshapes)
    const turning = gen._turn, wasParts = first ? null : gen._was || pairSnap(gen); gen._turn = false; gen._was = null;
    if (first) gen.style.transition = "none"; // a new pair appears at its size; only later changes animate
    // the Off / On labels are sized for the screen (divided by --dsc), so a new pair is measured once,
    // given its scale, and measured again with its labels at their real size
    // (a few rounds: a label that wraps differently at its real size changes the pair's width, and so its scale)
    // (again when the preview changed size: the labels keep their size on screen at the new scale)
    // a new round of the same comparison starts in the layout the last round ended in (see below): the
    // labels are then sized for that layout, not for the best one (Nov 24 round 4: sized for the best,
    // they stuck out of the preview for the first moment of a round in six comparisons)
    // (only a layout from an earlier round's pair: a pair's own first calls, made while it is still being
    // drawn, used to fix its layout for good: Nov 24, eight comparisons began with labels beside the phones)
    const memoLay = first && !resized && pairMemo && pairMemo.gen !== gen && pairMemo.k === scPlaying && pairMemo.size === canvas.clientWidth + "x" + canvas.clientHeight ? pairMemo.lay : null;
    const LAY_WH = { side: "sideWH", row: "rowWH", column: "colWH", top: "topWH" };
    if (first || resized) {
      const f = (wh) => wh ? fitScale(wh[0], wh[1]) : 0;
      for (let n = 0, m = measurePair(gen); n < 4; n++) {
        const best = memoLay && m[LAY_WH[memoLay]] ? f(m[LAY_WH[memoLay]]) : scTurns ? Math.max(f(m.rowWH), f(m.sideWH), f(m.topWH)) : Math.max(f(m.rowWH), f(m.colWH), f(m.sideWH), f(m.topWH)), was = parseFloat(gen.style.getPropertyValue("--dsc")) || 0;
        gen.style.setProperty("--dsc", best.toFixed(3)); if (Math.abs(best - was) < .005) break;
        m = measurePair(gen);
      }
    }
    const { rowWH, colWH, sideWH, topWH } = measurePair(gen);
    const row = fitScale(rowWH[0], rowWH[1]), col = fitScale(colWH[0], colWH[1]), side = sideWH ? fitScale(sideWH[0], sideWH[1]) : 0, top = fitScale(topWH[0], topWH[1]);
    const S = { side, row, column: col, top }, WH = { side: sideWH, row: rowWH, column: colWH, top: topWH };
    let pick = side >= Math.max(row, col) * 1.04 ? "side" : row >= col || scTurns ? "row" : "column";
    if (top >= S[pick] * 1.06) pick = "top";
    // a new round of the same comparison starts in the layout the last round ended in (Max, Nov 24: Show
    // only in fullscreen flashed its labels beside the phones at each restart, before the turn put them
    // back on top): every round looks the same, and only a real change (another preview size) re-picks
    if (memoLay && S[memoLay]) pick = memoLay;
    // a caption changing mid-story must not flip the layout back and forth or nudge the size:
    // keep the current layout (and scale) unless the new one is clearly better
    // (not when the preview itself changed size: then the pair takes the layout a new pair would get there,
    // or the next round of the story would pop to it; see the observer below fitDev)
    const cur = gen.dataset.lay, curSc = parseFloat(gen.style.scale) || 0;
    if (!first && !resized && cur && S[cur] && S[pick] < S[cur] * 1.1) pick = cur;
    let sc = S[pick];
    // (never larger than what fits: with only a few px of black left around the phones, the old 3% of
    // slack cut a turning phone or a longer caption at the preview's edge)
    if (!first && !resized && pick === cur && Math.abs(sc - curSc) / curSc < .06 && sc > curSc * .97) sc = Math.min(curSc, sc);
    const [w0, h0] = WH[pick], w = w0, h = h0;
    // a layout change (a phone turning mid-story): each caption flows from its old place to the new one
    // while its box, font and line breaks morph into the new shape, in step with the phones resizing.
    // Positions are read in the pair's own (unscaled) coordinates, so the pair's scale animation and the
    // caption's move add up to one smooth path.
    const caps = [...gen.querySelectorAll(":scope > .dl7 > .sf7")], was = gen.dataset.lay, moved = !first && was && (was !== pick || turning);
    const snap = c => inPair(gen, c);
    // where each caption was last drawn (a phone may already have turned before this call)
    const before = moved ? caps.map(c => c._pos || snap(c)) : null;
    gen.dataset.lay = pick; pairMemo = { k: scPlaying, lay: pick, size: canvas.clientWidth + "x" + canvas.clientHeight, gen };
    // The final layout lands at once, captions in their final places (hidden while their gliding copies
    // move); the phones and labels glide there (pairGlide). Taking the captions out of the flow until
    // the end of the move made everything jump into place when they came back.
    gen.classList.remove("capgo"); gen.classList.toggle("capside", pick === "side"); gen.classList.toggle("labright", pick === "column"); gen.classList.toggle("labout", pick === "row" || pick === "side"); gen.style.flexDirection = pick === "column" ? "column" : "row";
    gen.style.scale = sc.toFixed(3); if (first || resized || !gen.style.getPropertyValue("--dsc")) gen.style.setProperty("--dsc", sc.toFixed(3));
    pairGlide(gen, wasParts);
    if (before) { const ends = finalCapPlaces(gen); caps.forEach((c, i) => glideCap(gen, c, before[i], ends[i])); }
    // the other phone turning a moment later changes where the captions end: retarget them
    else if (caps.some(c => c._gliding)) { const ends = finalCapPlaces(gen); caps.forEach((c, i) => { if (c._gliding) c._gliding._to = ends[i]; }); }
    caps.forEach(c => { if (!c._gliding) c._pos = snap(c); });
    box.style.width = Math.round(w * sc) + "px"; box.style.height = Math.round(h * sc) + "px";
    if (first) { box.style.transition = "none"; void gen.offsetWidth; gen.style.transition = ""; box.style.transition = ""; }
    return;
  }
  const duo = box && box.querySelector(".duo7"), dev = duo || (box && box.querySelector(".dev")); if (!dev) return;
  const o = duo ? "duo" : orient || (dev.classList.contains("land") ? "land" : "port"), [w, h0] = DEV_SIZE[o], h = h0 - (o === "port" && cropOf(dev) ? CROP_CUT : 0);
  const sc = fitScale(w, h), first = !dev.style.getPropertyValue("--dsc");
  // a phone or a hand-built pair appears at its size; only later changes animate (the popup panels pair
  // used to zoom in from its unscaled size because .duo7 transitions its scale)
  if (first) { dev.style.transition = "none"; box.style.transition = "none"; }
  dev.style.scale = sc.toFixed(3); if (first) dev.style.setProperty("--dsc", sc.toFixed(3));
  box.style.width = Math.round((w + 6) * sc) + "px"; box.style.height = Math.round((h + 6) * sc) + "px";
  if (first) { void dev.offsetWidth; dev.style.transition = ""; box.style.transition = ""; }
}
// The preview can change size while a comparison shows (its scene redrawn under it, the tab's preview area
// opening, the window turning). The pair is laid out again at once, gliding to the layout a new pair gets
// at that size; before, it kept the old one until the story's next round drew the pair again, which then
// popped to it (Max, Nov 24: Voice over translation started with its Off / On labels beside the phones and
// jumped to the top a moment later). Fonts arriving late change the labels' size the same way.
let canvasResized = false;
(() => {
  const canvas = document.getElementById("canvas"); if (!canvas) return; // ($ is defined by a later script)
  let size = "";
  const refit = force => {
    const now = canvas.clientWidth + "x" + canvas.clientHeight, gen = canvas.querySelector(".scbox .duo7.gen");
    if (!force && now === size) return; size = now;
    if (!gen || !canvas.classList.contains("show") || !gen.dataset.lay) return;
    if (force) gen._measured = null;
    canvasResized = true; fitDevSoon();
  };
  if (window.ResizeObserver) new ResizeObserver(() => refit(false)).observe(canvas);
  if (document.fonts) document.fonts.addEventListener("loadingdone", () => refit(true));
})();
const devScale = dev => (dev.getBoundingClientRect().width / (dev.offsetWidth || 1)) || 1;
// Scenarios are drawn twice, Off and On side by side. scSide is the side being drawn (null for a
// scenario that draws its own comparison); scStretch slows the whole story down to the 11 s budget.
let scSide = null, scStretch = 1;
// A scenario that tells its story with a message inside the phones (toast7, check7, a .toastin pill)
// gets no caption under them: the caption only repeated that message and took room from the phones.
// Read from the scenario's own code, so every scenario follows it, including new ones.
let scTold = false;
// A story that turns a phone keeps its two phones side by side: stacked phones would have to swap to side
// by side as one turns (or back), and on the way the moving phone crosses the other. Read from the code.
let scTurns = false;
let scPlaying = null, pairMemo = null; // the comparison on screen (setting and the values compared: another value has other labels, Nov 24 round 4), and the layout its pair has now (fitDev)
const turnsPhone = fn => /\b(turn|turnTo|rotate)\(/.test(String(fn));
const SCN_TURNS = new Set(); // stories whose turn is in a helper they are given (gestureScen's result)
const toldInside = fn => /toast7\(|check7\(|toastin/.test(String(fn));
// The situation line: the first one of a story is there with the phones (it used to fade in 160 ms
// after them); a later, different line crossfades; the same line again (each new run) stays put.
// The blue line over a comparison only says what the drawing can't show: time passing, the app in the
// background, a tablet, a vibration, a step in a sequence (Max, Nov 20: every line that only named the
// screen or the gesture drawn was redundant). Such a line passes keep = true; the rest are dropped here,
// so a new scenario has no line unless it asks for one, and the empty line takes no room.
function situation(text, keep) {
  if (!keep || scSide && scSide.i) return; const el = document.querySelector("#canvas .sit"); if (!el) return;
  if (el.textContent === text) return;
  if (!el.textContent) { el.style.transition = "none"; el.textContent = text; el.style.opacity = 1; void el.offsetWidth; el.style.transition = ""; return; }
  el.style.opacity = 0; later(() => { el.textContent = text; el.style.opacity = 1; }, 160);
}
function setFoot(text) {
  if (scTold) return;
  if (scSide) {
    const f = scSide.foot; if (f.textContent === text) return;
    const gen = f.closest(".duo7.gen");
    // a caption already on screen is swapped in one beat (out, new text and layout, in); the first one just appears
    // new words fade up in place (no gap); if the layout changes with them, fitDev flows it to its new place
    const shown = gen && f.textContent && gen.dataset.fit && performance.now() - Number(gen.dataset.fit) > 250;
    if (gen) gen._was = gen._was || pairSnap(gen); // the phones glide if the new words change the layout
    f.textContent = text;
    const fade = () => { if (shown && !f._gliding) f.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 260, easing: "ease-out" }); };
    if (gen) fitDevSoon(undefined, fade); else fade();
    return;
  } const el = document.querySelector("#canvas .foot"); if (el) el.textContent = text; }
// A vibration: the phone trembles fast with a tiny amplitude (a big slow shake read as "no"), arcs
// ripple out on both sides, and a vibrate icon pops up over the phone and buzzes with it. Without
// vibration the same moment shows the icon crossed out and still, so both sides mark the event.
const BUZZ_MS = 120; // the drawn tremble and the phone's own vibration last the same and start together
function buzz(dev, on) {
  // the real vibration first, so it lands on the same frame as the tremble below
  // the phone itself vibrates only while haptics are on for the setting (its toggle on On); the
  // drawn tremble still shows on the side that vibrates
  if (on && !(selected && /haptic/.test(selected) && V(selected))) try { navigator.vibrate && navigator.vibrate(BUZZ_MS); } catch { /* not supported */ }
  const host = dev;
  host.querySelectorAll(".vib7").forEach(e => e.remove());
  host.insertAdjacentHTML("beforeend", `<div class="vib7 ${on ? "on" : "off"}">${I(on ? "vibration" : "phone7")}</div>`);
  const ic = host.querySelector(".vib7");
  clock.after("steps", on ? 650 : 750, () => ic.classList.add("out")); clock.after("steps", 1000, () => ic.remove());
  if (!on) return;
  dev.classList.remove("buzz"); void dev.offsetWidth; dev.classList.add("buzz");
  dev.querySelectorAll(".waves").forEach(w => { w.classList.remove("go"); void w.offsetWidth; w.classList.add("go"); });
}
// steps belong to the scenario that scheduled them; a replaced scenario never runs its leftover steps
// a sub-step inside a comparison step (not slowed down again); it belongs to the same pass
const later = (fn, ms) => clock.after("steps", ms, fn);
const atNow = (ms, f, side) => clock.after("steps", ms * scStretch, () => { const p = scSide; scSide = side; try { f(); } finally { scSide = p; } });
// While a comparison is being drawn its steps are collected (scCollect) and then started together, with
// any idle lead-in trimmed: the first thing that happens comes at most LEAD_MS after the phones appear,
// in every story, whatever times it was written with (an 0.8 s wait with nothing moving read as lag).
const LEAD_MS = 60; // Max, Nov 24: no delays anywhere, a story starts as its button is pressed
let scCollect = null;
const at = (ms, f) => { if (scCollect) { scCollect.push([ms, f, scSide]); return; } return atNow(ms, f, scSide); };
// steps due at the same moment (the two phones' turns, say) run in one timer, in the order they were
// written, so their layout work is done once for both (see fitDevSoon)
function startCollected(list) {
  // a story that turns its phone keeps a 300 ms lead: a turn started while the pair is still settling into
  // place left a phone cut by the edge of the preview (animcheck phone-clipped, round 137)
  const lead = list.length ? Math.max(0, Math.min(...list.map(x => x[0])) - (scTurns ? 300 : LEAD_MS)) : 0, due = new Map();
  list.forEach(([ms, f, side]) => { const t = ms - lead; if (!due.has(t)) due.set(t, []); due.get(t).push([f, side]); });
  due.forEach((steps, t) => clock.after("steps", t * scStretch, () => steps.forEach(([f, side]) => {
    const p = scSide; scSide = side;
    try { f(); } catch (e) { setTimeout(() => { throw e; }); } finally { scSide = p; }
  })));
}
// One way for every finger to arrive (stage demos, phone stories, the tutorial): it fades in where
// it lands (Max, round 140: "a fade in, rather than a pop in", for every animation). A hidden finger
// is first put in its place with transitions off: a finger just made or just reset had no drawn
// start to fade from, so it popped in, and one hidden elsewhere slid in from its last spot.
const FINGER_FADE = 200;
// A finger that fades in lands on the screen; moving it on from there before it taps is a drag, so it
// shows its hold ring (Max, Nov 25: Pinch-to-zoom's fingers had none; every drag in every story). After
// a tap it is lifted, and a move is only the hand going to the next spot.
function fingerShow(f, x, y, ms = 0) {
  if (!f.classList.contains("show")) { f.style.transition = "none"; f.style.left = x + "px"; f.style.top = y + "px"; void f.offsetWidth; ms = 0; f._lifted = false; f.classList.remove("hold"); }
  else if (ms && !f._lifted) f.classList.add("hold");
  f.style.transition = (ms ? `left ${ms}ms var(--ease), top ${ms}ms var(--ease), ` : "") + `opacity ${FINGER_FADE}ms var(--ease)`;
  f.style.left = x + "px"; f.style.top = y + "px"; f.classList.add("show");
}
function fingerTo(f, x, y, ms = 0) { fingerShow(f, x, y, ms); }
function tapF(f) { f._lifted = true; f.classList.remove("hold", "tap"); void f.offsetWidth; f.classList.add("tap"); }
const miniSeek = (pct = 30, marks = []) => `<div class="msk" style="position:absolute;left:8%;right:8%;bottom:16%;height:3px;background:rgba(255,255,255,.3)"><div class="mp" style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:#ff0033;transition:width .9s linear"></div>${marks.map(m => `<i style="position:absolute;left:${m}%;top:-1px;width:2px;height:5px;background:#000"></i>`).join("")}</div>`;
// the time over the mini seekbar, as YouTube puts it: just above the bar's left end, never on it (Max, Nov 25:
// "Copy timestamp by default" drew it across the seekbar); one helper for every story with a time
const miniTime = (txt, cls = "") => `<div class="mtm7${cls ? " " + cls : ""}" style="position:absolute;left:8%;bottom:calc(16% + 6px);font-size:8px;line-height:1;color:#ddd;white-space:nowrap">${txt}</div>`;
const miniVideo = (i = 0, h = "100%") => `<div style="position:absolute;left:0;right:0;top:0;height:${h};background:${ART[i]}"></div>`;
function haptic(eventLabel, script) {
  return (box, disabled) => {
    const portrait = script.portrait;
    // letterbox: a 16:9 video on the wider phone screen, with black bars at the sides (zoom fills them);
    // the seekbar stays drawn on top, as in the app
    const land = script.letterbox ? `<div style="position:absolute;inset:0;background:#000"></div><div class="mv7" style="position:absolute;top:0;bottom:0;left:11%;right:11%;background:${ART[1]}"></div>${miniSeek(30, [45, 62, 80])}` : `${miniVideo(1)}${miniSeek(30, [45, 62, 80])}`;
    box.innerHTML = device(portrait ? "port" : "land", portrait ? `${miniVideo(1, "34%")}<div style="position:absolute;left:0;right:0;top:34%;bottom:0;background:#0f0f0f"></div>` : land);
    const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger");
    script.run(dev, f, () => buzz(dev, !disabled));
    // the event is the situation line; vibrates / no vibration is what the buzz icon (or the crossed-out
    // one) shows on each phone, so there is no caption repeating it under them. No line when the phones
    // already say the event (the "Release to cancel" pill, the held finger with its 2x pill)
    if (eventLabel) situation(eventLabel); // no blue line on the haptics stories (Max, Nov 20)
    return "";
  };
}
scen("seekbar", "disable_haptic_feedback_chapters", haptic("Crossing a chapter", { run(dev, f, b) {
  // the finger drags the seekbar; at each chapter mark the thumb sticks for a moment (as in the app)
  // and the phone vibrates the instant the thumb reaches the mark
  const W = dev.clientWidth, H = dev.clientHeight, y = H * .84 - 2, X = m => W * (.08 + .84 * m), mp = dev.querySelector(".mp");
  const stops = [.30, .45, .62, .80, .92]; let t = 300;
  at(100, () => { fingerTo(f, X(stops[0]), y); mp.style.width = "30%"; });
  for (let i = 1; i < stops.length; i++) {
    const dur = Math.round(1700 * (stops[i] - stops[i - 1]));
    at(t, () => { fingerTo(f, X(stops[i]), y, dur * scStretch); mp.style.transition = `width ${dur * scStretch}ms linear`; mp.style.width = stops[i] * 100 + "%"; });
    t += dur;
    if (i < stops.length - 1) { at(t, b); t += 420; }
  }
} }));

scen("seekbar", "disable_haptic_feedback_precise_seeking", haptic("Entering precise seeking", { run(dev, f, b) {
  // hold the seekbar and pull up: the thumbnail strip opens right above the seekbar, under the finger,
  // and sliding sideways scrubs through it
  const W = dev.clientWidth, H = dev.clientHeight, y0 = H * .84 - 2;
  at(100, () => { fingerTo(f, W * .4, y0); f.classList.add("hold"); });
  at(450, () => fingerTo(f, W * .4, H * .6, 500));
  at(950, () => { b(); dev.insertAdjacentHTML("beforeend", `<div class="ps7" style="position:absolute;left:4%;right:4%;bottom:25%;height:28%;overflow:hidden;border-radius:2px;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s"><div class="ps7s" style="position:absolute;left:0;top:0;bottom:0;display:flex;gap:2px;transition:transform 1.2s var(--ease)">${[1, 2, 3, 4, 5, 6, 7, 0].map(i => `<div style="height:100%;aspect-ratio:16/9;background:${ART[i]}"></div>`).join("")}</div><i style="position:absolute;left:calc(50% - 1px);top:0;bottom:0;width:2px;background:#fff"></i></div>`); requestAnimationFrame(() => { const s = dev.querySelector(".ps7"); if (s) { s.style.opacity = 1; s.style.transform = "none"; } }); });
  at(1500, () => { fingerTo(f, W * .62, H * .6, 1200 * scStretch); const s = dev.querySelector(".ps7s"); if (s) { s.style.transitionDuration = 1200 * scStretch + "ms"; s.style.transform = "translateX(-30%)"; } });
  at(2900, () => f.classList.remove("hold"));
} }));
scen("seekbar", "disable_haptic_feedback_seek_undo", haptic("", { run(dev, f, b) {
  const W = dev.clientWidth, H = dev.clientHeight;
  at(100, () => fingerTo(f, W * .3, H * .84)); at(300, () => { fingerTo(f, W * .7, H * .84, 700); dev.querySelector(".mp").style.width = "70%"; });
  at(1100, () => fingerTo(f, W * .7, H * .2, 500)); at(1600, () => { b(); dev.querySelector(".mp").style.width = "30%"; dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:8px">Release to cancel</div>`); });
} }));
scen("seekbar", "disable_haptic_feedback_tap_and_hold", haptic("", { run(dev, f, b) {
  const W = dev.clientWidth, H = dev.clientHeight;
  at(150, () => { fingerTo(f, W * .55, H * .45); f.classList.add("hold"); }); at(800, () => { b(); dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:8px">2x ▸▸</div>`); });
  at(2000, () => f.classList.remove("hold"));
} }));
scen("seekbar", "disable_haptic_feedback_zoom", haptic("Pinch to zoom snaps to fill", { letterbox: true, run(dev, f, b) {
  // the video starts with black bars at the sides; two fingers spread it, and it snaps to fill the screen
  const W = dev.clientWidth, H = dev.clientHeight, v = dev.querySelector(".mv7");
  const f2 = f.cloneNode(true); f2.removeAttribute("id"); dev.appendChild(f2);
  at(150, () => { fingerTo(f, W * .44, H * .42); fingerTo(f2, W * .56, H * .58); });
  at(400, () => { fingerTo(f, W * .3, H * .3, 600 * scStretch); fingerTo(f2, W * .7, H * .7, 600 * scStretch); v.style.transition = `left ${600 * scStretch}ms, right ${600 * scStretch}ms, top ${600 * scStretch}ms, bottom ${600 * scStretch}ms`; v.style.left = v.style.right = "6%"; v.style.top = v.style.bottom = "-5%"; });
  // the snap: the last stretch jumps to the edges quickly
  at(1050, () => { fingerTo(f, W * .24, H * .24, 160); fingerTo(f2, W * .76, H * .76, 160); v.style.transition = "left 160ms cubic-bezier(.3,1.4,.5,1), right 160ms cubic-bezier(.3,1.4,.5,1), top 160ms, bottom 160ms"; v.style.left = v.style.right = "0"; v.style.top = v.style.bottom = "-12%"; });
  at(1210, () => { b(); dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:8px">Zoomed to fill</div>`); });
  at(2000, () => { f.classList.remove("show"); f2.classList.remove("show"); });
} }));

scen("fullscreen", "swipe_haptic_feedback", (box, on) => {
  box.innerHTML = device("land", `${miniVideo(6)}`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  // the volume level fills one step at a time; with ticks on, each step keeps a small buzz mark, so the
  // two phones still differ when the swipe is over (no white line here, Max, Nov 20)
  dev.insertAdjacentHTML("beforeend", `<div class="lvl7" style="position:absolute;left:8px;top:18%;bottom:18%;width:6px;display:grid;grid-template-rows:repeat(4,1fr);gap:2px">${[3, 2, 1, 0].map(i => `<i data-s="${i}" style="position:relative;border-radius:2px;background:#ffffff33;transition:background .15s"></i>`).join("")}</div>`);
  at(100, () => fingerTo(f, W * .82, H * .8)); at(300, () => fingerTo(f, W * .82, H * .2, 1400));
  [500, 800, 1100, 1400].forEach((t, i) => at(t, () => {
    const seg = dev.querySelector(`.lvl7 [data-s="${i}"]`); seg.style.background = "#fff";
    if (on) seg.insertAdjacentHTML("beforeend", `<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);display:flex">${ico7("vibration", 10, "#4caf50")}</span>`);
    buzz(dev, on);
  }));
  at(1900, () => f.classList.remove("show"));
  return on ? "Swiping volume or brightness: a tick at each step" : "Swiping volume or brightness: no ticks";
});
// Where a component really sits in the live preview, as fractions of its video frame, so a
// scenario draws its button in the same place. Measured before the canvas covers the stage;
// the fallback is used when the component is not on screen (switched off or in the tray).
function anchor(k, fx, fy) {
  const el = [...document.querySelectorAll(`#stage [data-k="${k}"]`)].find(e => e.offsetParent && !e.classList.contains("intray"));
  const frame = el && el.closest(".video");
  if (!el || !frame) return [fx, fy];
  const r = el.getBoundingClientRect(), b = frame.getBoundingClientRect();
  if (!r.width || !b.width) return [fx, fy];
  return [(r.left + r.width / 2 - b.left) / b.width, (r.top + r.height / 2 - b.top) / b.height];
}
const at_ = (fx, fy, size) => `position:absolute;left:calc(${(fx * 100).toFixed(1)}% - ${size / 2}px);top:calc(${(fy * 100).toFixed(1)}% - ${size / 2}px);width:${size}px;height:${size}px`;
scen("player", "fullscreen_video_scale_button_fullscreen_only", (box, on) => {
  const [fx, fy] = anchor("morphe_fullscreen_video_scale_button", .78, .86);
  const btn = `<div class="scb" style="${at_(fx, fy, 18)};border-radius:5px;background:rgba(0,0,0,.45);display:grid;place-items:center;transition:opacity .4s var(--ease)">${I("crop", "ico", 'style="width:13px;height:13px"')}</div>`;
  box.innerHTML = device("port", playerArea(0, btn));
  const dev = box.querySelector(".dev"), b = box.querySelector(".scb");
  // Start in the new state: with the option on, the portrait player never shows the button.
  // No sentences under the phones (FOOT_OFF): the phones get that room and the button says it.
  b.style.opacity = on ? "0" : "1";
  at(1300, () => { rotate(dev, "land"); b.style.opacity = "1"; flash7(b); });
  // the loop ends as it began
  at(2500, () => { rotate(dev, "port"); b.style.opacity = on ? "0" : "1"; });
  return "";
});
scen("player", "copy_video_link_with_timestamp_button", (box, on) => {
  // The "Copy video link" button: a tap copies the plain link, or with this option the link with the
  // time it was paused at. Each side shows the button, the tap, and the link that was copied.
  const [fx, fy] = anchor("morphe_copy_video_link_button", .8, .2);
  box.innerHTML = device("land", `${miniVideo(0)}<div class="cpb" style="${at_(fx, fy, 22)};display:grid;place-items:center;border-radius:50%;background:rgba(0,0,0,.45);transition:transform .2s,background .2s">${I("link", "ico", 'style="width:14px;height:14px"')}</div>${miniSeek(17)}${miniTime("3:12 / 18:42")}`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), btn = dev.querySelector(".cpb"); const W = dev.clientWidth, H = dev.clientHeight;
  const plain = "youtu.be/cAb1n", timed = "youtu.be/cAb1n?t=192";
  // two lines (Max, Nov 25: three reached down over the time and the seekbar), placed above them
  const toast = link => { dev.querySelectorAll(".toastin").forEach(e => e.remove()); dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:34%">Link copied<br><b style="font-weight:500;color:#9cd1ff">${link}</b></div>`); keepPillIn(dev.lastElementChild); };
  const press = on => { btn.style.transform = on ? "scale(.88)" : ""; btn.style.background = on ? "rgba(62,166,255,.55)" : "rgba(0,0,0,.45)"; };
  const fade = () => dev.querySelectorAll(".toastin").forEach(e => { e.style.transition = "opacity .3s"; e.style.opacity = 0; });
  at(150, () => fingerTo(f, W * fx, H * fy, 350));
  at(800, () => { tapF(f); press(true); }); at(1000, () => { press(false); toast(on ? timed : plain); });
  // only the tap (Max, Nov 25: with the hold shown too, each side's pill took the other side's link in
  // turn, so the link with the time jumped left and right as the story looped): each side keeps its link
  at(3600, fade);
  return "";
});
SCN_HOLD.morphe_copy_video_link_with_timestamp_button = 4200;
scen("player", "loop_video", (box, on) => {
  box.innerHTML = device("land", `${miniVideo(2)}${miniTime("0:00 / 0:42", "lv7")}${miniSeek(55)}`);
  const dev = box.querySelector(".dev"); const mp = dev.querySelector(".mp"), t = dev.querySelector(".lv7");
  const runClock = (from, to, ms) => { const t0 = performance.now(); const tick = () => { const p = Math.min(1, (performance.now() - t0) / (ms * scStretch)); const s = Math.round(from + (to - from) * p); const tx = `0:${String(s).padStart(2, "0")} / 0:42`; if (t.isConnected && t.textContent !== tx) t.textContent = tx; /* only when the second changes */ if (p < 1 && t.isConnected) requestAnimationFrame(tick); }; tick(); };
  situation("The video reaches its end");
  at(100, () => { mp.style.transition = `width ${1000 * scStretch}ms linear`; mp.style.width = "100%"; runClock(23, 42, 1000); });
  at(1150, () => {
    if (on) { mp.style.transition = "none"; mp.style.width = "0%"; t.textContent = "0:00 / 0:42"; dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:30%">⟲ Replaying</div>`); }
    else dev.insertAdjacentHTML("beforeend", `<div style="position:absolute;inset:0;background:rgba(0,0,0,.65);display:grid;place-content:center;gap:4px;justify-items:center;font-size:10px"><span style="color:#aaa;font-size:8px">Up next in 3</span><b style="font-weight:500">Night train to Bodø</b></div>`);
  });
  // with the option on, the same video really plays again from the start
  at(1500, () => { if (!on) return; situation("…and plays again from the start"); dev.querySelectorAll(".toastin").forEach(e => { e.style.transition = "opacity .3s"; e.style.opacity = 0; }); void mp.offsetWidth; mp.style.transition = `width ${2200 * scStretch}ms linear`; mp.style.width = "48%"; runClock(0, 20, 2200); });
  return on ? "At the end the video starts again and keeps playing" : "At the end YouTube moves on to the next video";
});
SCN_HOLD.morphe_loop_video = 3800;
scen("shorts", "shorts_autoplay", (box, on) => {
  situation("A Short is ending");
  box.innerHTML = device("port", `<div class="sh" style="position:absolute;left:0;right:0;top:0;height:200%;transition:transform .5s var(--ease)"><div style="height:50%;background:${ART[5]}"></div><div style="height:50%;background:${ART[7]}"></div></div>${miniSeek(70)}`);
  const dev = box.querySelector(".dev"); const mp = dev.querySelector(".mp");
  at(100, () => { mp.style.width = "100%"; });
  at(1100, () => { mp.style.transition = "none"; mp.style.width = "0%"; if (on) dev.querySelector(".sh").style.transform = "translateY(-50%)"; else dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:40%">⟲ Repeats</div>`); });
  return on ? "When a Short ends, the next one starts" : "When a Short ends, it repeats";
});
scen("seekbar", "disable_chapter_skip_double_tap", (box, disabled) => {
  box.innerHTML = device("land", `${miniVideo(3)}${miniSeek(30, [45, 70])}`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(100, () => fingerTo(f, W * .8, H * .45)); at(350, () => tapF(f)); at(550, () => tapF(f));
  at(700, () => { dev.querySelector(".mp").style.width = disabled ? "35%" : "45%"; dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:8px">${disabled ? "+10 seconds" : "Next chapter ▸"}</div>`); });
  return disabled ? "Double-tap skips 10 seconds" : "Double-tap can jump to the next chapter (stock)";
});
scen("seekbar", "speed_tap_and_hold", (box, v) => {
  box.innerHTML = device("land", `${miniVideo(4)}${miniSeek(30)}`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(150, () => { fingerTo(f, W * .5, H * .45); f.classList.add("hold"); });
  // both sides hold for the same time, so the faster speed covers proportionally more of the video
  at(600, () => { dev.querySelector(".mp").style.transition = `width ${1.4 * scStretch}s linear`; dev.querySelector(".mp").style.width = Math.min(95, 30 + 11 * v) + "%"; dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:8px">${v}x ▸▸</div>`); });
  at(2000, () => f.classList.remove("hold"));
  return `Hold the video: plays at ${v}x`;
});

// ------------------------------------------------------------------ YouTube version model
// The preview follows the YouTube build being patched. Versions are the targets Morphe lists in
// patches/.../youtube/shared/Constants.kt. Rules mirror version checks in Settings.java:
//   MINIPLAYER_TYPE default is MODERN_4 on 21.29+, where YouTube removed the other types,
//   VIDEO_ACTION_BAR_LAYOUT default is DEFAULT (channel inside the action bar) on 21.36+, CLASSIC before.
// The native editor will not need a picker: the patched app knows its own version.
const YT_VERSIONS = ["21.45.82", "21.44.528", "21.43.523", "21.30.216", "21.28.208", "21.23.492", "20.51.39", "20.26.46"];
const YT_EXPERIMENTAL = new Set(["21.45.82", "21.44.528", "21.43.523"]);
let ytVersion = YT_VERSIONS[0];
const vNum = v => v.split(".").slice(0, 2).map(Number);
const ytAtLeast = (maj, min) => { const [a, b] = vNum(ytVersion); return a > maj || (a === maj && b >= min); };
// Everything below is driven by the catalogue, so new version checks in Morphe show up here
// after regenerating it: "when" (preference only registered on some versions), "entryVariants"
// (list entries that differ by version), "versionDefault" (default that differs by version) and
// "availability" (Setting.Availability rules, which can also depend on the version).
const ytV = (maj, min) => ytAtLeast(maj, min);
const unknownAssume = name => !/spoof/i.test(name); // device checks pass; "is spoofing" checks do not
// Morphe's Utils.isTablet(): smallestScreenWidthDp >= 600. The preview answers it for the screen it is
// shown on (CSS px stand in for dp), so a phone-only or tablet-only setting locks the way it does in
// Morphe; inside the app the live Setting.isAvailable() answer is used instead.
const previewIsTablet = () => { const a = document.getElementById("app"); return !a || Math.min(a.clientWidth, a.clientHeight) >= 600; };
const deviceCheck = name => name === "isTablet" ? previewIsTablet() : unknownAssume(name);
const needsTablet = k => /U\("isTablet"\)/.test(String(PREF[k]?.availability || "")) && !previewIsTablet();
// Settings that only do something on one kind of device are left out where they do nothing (Max, Nov 20),
// so the list matches the phone or tablet the editor runs on, and they come back when the size changes.
// A rule Morphe states itself (availability on Utils.isTablet, such as Force landscape) is read from the
// catalogue (needsTablet). DEVICE_ONLY names the ones Morphe ties to a device size in its code or text
// without stating a rule; an unknown key is never hidden, so upstream changes can't remove a setting.
const DEVICE_ONLY = {
  // FullscreenPlaylistPanelPatch: "Playlist panel exits fullscreen on tablets"; phones already open it
  // over the fullscreen player (YouTube's own overlay). Also counts with Device layout set to Tablet.
  morphe_fullscreen_playlist_panel: "tablet",
  // RestoreOldVideoActionBarPatch: tablets always use YouTube's default action bar, whatever is picked
  morphe_video_action_bar_layout: "phone",
};
const tabletLayout = () => previewIsTablet() || String(V("morphe_change_form_factor")) === "LARGE";
const offDevice = k => { const d = DEVICE_ONLY[k]; return d === "tablet" ? !tabletLayout() : d === "phone" ? previewIsTablet() : needsTablet(k); };
// D("key") in a rule: Morphe's Setting.isSetToDefault() (Change foreground colour needs a theme colour
// that is not the default one)
const isDefault = k => !(k in PREF) || JSON.stringify(V(k)) === JSON.stringify(defaults[k]);
const compiled = new Map();
function evalRule(expr, getter) {
  if (!expr) return true;
  let fn = compiled.get(expr);
  if (fn === undefined) { try { fn = new Function("S", "V", "U", "D", `return (${expr});`); } catch { fn = null; } compiled.set(expr, fn); }
  if (!fn) return true;
  try { return !!fn(getter, ytV, deviceCheck, isDefault); } catch { return true; }
}
// in this YouTube version and on this kind of device (offDevice): everything else leaves the lists
const inYtVersion = k => { const p = PREF[k]; return !p || evalRule(p.when, () => null); };
const inVersion = k => inYtVersion(k) && !offDevice(k);
// Why this device leaves a setting out: search still lists it, locked, with this line (Max, Nov 20)
const deviceWhy = k => DEVICE_ONLY[k] === "phone" ? "Only on phones" : "Only on tablets and large screens (600 dp or wider)";
const availOk = k => { const p = PREF[k]; return !p || !p.availability || evalRule(p.availability, x => (x in PREF ? V(x) : null)); };
// What a setting does right now: its value while it is available, otherwise nothing (a switch counts as
// off, anything else as its default). A preview drawn from V() alone let a hidden setting with an "on"
// default win over a visible one (Glass miniplayer, on by default but only for bar miniplayers, kept
// the corners round whatever "Disable rounded corners" said).
const VE = k => (parentsOk(k) ? V(k) : typeof defaults[k] === "boolean" ? false : defaults[k]);
// Lists Morphe builds at runtime (caption languages from YouTube's translation list, the user's own
// custom speeds). The preview uses a representative copy.
const LANGS = [["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"], ["ja", "Japanese"], ["ko", "Korean"], ["zh-Hans", "Chinese (Simplified)"], ["ru", "Russian"], ["ar", "Arabic"], ["hi", "Hindi"]];
const CAP_LINE = { en: "the pancake needs to rest for one minute", es: "el panqueque necesita reposar un minuto", fr: "la crêpe doit reposer une minute", de: "der Pfannkuchen muss eine Minute ruhen", it: "il pancake deve riposare un minuto", pt: "a panqueca precisa descansar um minuto", ja: "パンケーキは1分休ませます", ko: "팬케이크는 1분 동안 두세요", "zh-Hans": "煎饼需要静置一分钟", ru: "блину нужно отдохнуть минуту", ar: "تحتاج الفطيرة إلى الراحة لمدة دقيقة", hi: "पैनकेक को एक मिनट आराम चाहिए" };
const speedList = () => String(V("morphe_custom_playback_speeds") || "0.25 0.5 0.75 1.0 1.25 1.5 1.75 2.0").split(/[\s,]+/).filter(Boolean).map(Number).filter(n => n > 0);
const RUNTIME_ENTRIES = {
  morphe_preferred_caption_language: () => [{ label: "Off", value: "off" }, { label: "App language", value: "default" }, ...LANGS.map(([v, l]) => ({ label: l, value: v }))],
  morphe_secondary_caption_language: () => [{ label: "Off", value: "off" }, ...LANGS.map(([v, l]) => ({ label: l, value: v }))],
  morphe_playback_speed_default: () => [{ label: "Auto", value: "-2.0" }, ...speedList().map(n => ({ label: n + "x", value: String(n) }))],
  morphe_shorts_playback_speed_default: () => [{ label: "Auto", value: "-2.0" }, ...speedList().map(n => ({ label: n + "x", value: String(n) }))],
  morphe_playback_audio_pitch_default: () => [{ label: "Auto", value: "-2.0" }, ...[0.5, 0.75, 0.9, 1.1, 1.25, 1.5].map(n => ({ label: n + "x", value: String(n) }))],
};
// "Off or a choice" lists show as a switch; the choice appears under it once switched on.
const OFF_LIST = new Set(["morphe_secondary_caption_language"]);
const offListPick = {};
function entriesFor(k) {
  if (RUNTIME_ENTRIES[k]) return RUNTIME_ENTRIES[k]();
  const p = PREF[k];
  const v = (p.entryVariants || []).find(x => evalRule(x.when, () => null));
  const ents = v ? v.entries : (p.entries || []);
  // choices that are all "N seconds" read "Ns"; the unit moves to the title (unitOf)
  return unitOf(k) ? ents.map(e => ({ ...e, label: e.label.replace(/\s*seconds?$/, "s") })) : ents;
}
function versionDefault(k) { const d = PREF[k].versionDefault; return d ? (evalRule(d.when, () => null) ? d.then : d.else) : undefined; }
function applyVersion() {
  for (const k in PREF) {
    const p = PREF[k];
    const nd = versionDefault(k);
    const vals = entriesFor(k).map(e => e.value);
    const target = nd !== undefined ? nd : defaults[k];
    const fix = v => { let x = v === defaults[k] ? target : v; if (vals.length && !vals.includes(String(x))) x = vals.includes(String(target)) ? target : vals[0]; return x; };
    if (nd !== undefined || (p.entryVariants && vals.length)) {
      setPref(k, coerceVal(k, fix(state[k]))); baseline[k] = coerceVal(k, fix(baseline[k]));
      defaults[k] = coerceVal(k, vals.length && !vals.includes(String(target)) ? vals[0] : target);
      if (nd !== undefined) STOCK[k] = defaults[k];
    }
  }
  if (selected && !inVersion(selected)) selected = null;
}
function coerceVal(k, v) { const t = PREF[k].type; return (t === "integer" || t === "long" || t === "float") && v !== "" && v != null ? Number(v) : v; }

// ------------------------------------------------------------------ watch page, per action bar layout
SCENES.watch = () => {
  // RestoreOldVideoActionBarPatch.VideoActionBarLayout:
  //   DEFAULT: what the server sends (21.36+: the channel at the start of the action bar, "compact_channel_bar");
  //   CLASSIC: pills with their text, scrolling in one row that starts with the subscribe button;
  //   CLASSIC_TWO_ROWS: the same pills in their own row, below a channel row with the subscribe button at its end;
  //   MINIMAL: like, dislike, share and save as an icon above its text (at most 5 visible, 150 wide), every
  //   other button in a "More actions" menu, the subscribe button in the channel row.
  const layout = V("morphe_video_action_bar_layout");
  const modern = layout === "DEFAULT", minimal = layout === "MINIMAL", two = layout === "CLASSIC_TWO_ROWS", classic = layout === "CLASSIC";
  // the dislike count always exists: off, it's hidden like any other element, so its outline and ghost show
  const dislike = V("morphe_ryd_dislike_percentage") ? "4%" : "2.1K", rydOn = !!V("morphe_ryd_enabled");
  const act = (k, icon, label) => C(k, `<div class="chip">${I(icon)}${label}</div>`);
  const likeChip = C("hide_like_dislike_button", `<div class="chip likechip" style="padding:0;gap:0"><span style="display:flex;gap:6px;align-items:center;padding:0 10px 0 12px;border-right:1px solid #444">${I("like")}<span class="rollnum" data-n="48">48K</span></span><span style="padding:0 12px;display:flex;gap:6px;align-items:center">${I("dislike")}${C("ryd_enabled", `<span>${dislike}</span>`, { tag: "span", also: "ryd_dislike_percentage" })}</span></div>`);
  const subBtn = `<div class="chip subbtn" style="background:#f1f1f1;color:#0f0f0f">Subscribe</div>`;
  const channelChip = C("hide_channel_profile_button", `<div class="chip" style="padding:0 4px 0 4px;gap:6px">${C("hide_channel_bar", av(0, 26), { tag: "span" })}<span style="font-size:12.5px">Fjord & Timber</span>${C("hide_channel_profile_subscribe_button", `<span class="chip subbtn" style="height:26px;background:#f1f1f1;color:#0f0f0f;font-size:12px;padding:0 10px">Subscribe</span>`, { tag: "span" })}</div>`);
  const joinChip = C("hide_join_membership_button", `<div class="chip" style="background:transparent;border:1px solid #555">Join</div>`);
  const rest = [act("hide_comments_button", "comment", "1.2K"), act("hide_share_button", "share", "Share"), act("hide_save_button", "save", "Save"), act("hide_remix_button", "remix", "Remix"), act("hide_thanks_button", "dollar", "Thanks"),
    act("hide_download_button", "dl", "Download"), act("hide_clip_button", "clip", "Clip"), act("hide_ask_button", "spark", "Ask"),
    act("hide_hype_button", "fire", "Hype"), act("hide_shop_button", "shop", "Shop"), act("hide_connect_button", "link", "Connect"), act("hide_promote_button", "speed", "Promote"), act("hide_stop_ads_button", "close", "Stop ads"),
    act("hide_report_button", "flag", "Report"), act("hide_more_button", "moreh", "")].join("");
  // minimal: five equal tiles, an icon above its text; the last one opens the menu with the other buttons
  const tile0 = (icon, label, extra = "") => `<div class="mtile" ${extra}style="flex:1 1 0;min-width:0;display:grid;justify-items:center;gap:3px;padding:6px 0;border-radius:12px;font-size:11px;color:#f1f1f1">${I(icon)}<span style="white-space:nowrap">${label}</span></div>`;
  const tile = (k, icon, label, extra) => C(k, tile0(icon, label, extra), { style: "flex:1 1 0;min-width:0;display:flex" });
  const minimalBar = `<div class="mbar" style="display:flex;gap:2px;padding:0 8px 10px">${C("hide_like_dislike_button", `<div style="flex:1;display:flex;gap:2px">${tile0("like", `<span class="rollnum" data-n="48">48K</span>`, 'data-glow="1" ')}${tile0("dislike", rydOn ? dislike : "Dislike")}</div>`, { style: "flex:2 1 0;min-width:0;display:flex" })}${tile("hide_share_button", "share", "Share")}${tile("hide_save_button", "save", "Save")}${tile("hide_more_button", "moreh", "More", 'data-more="1" ')}</div>`;
  // Round 136, read again from setVideoActionBarLayout: the classic row is built as the subscribe item first
  // (the compact channel bar: avatar, name and Subscribe in one pill), then like and dislike, then share and
  // save in the server's order, then every item of the minimal layout's menu. One row has no channel row
  // above it; two rows moves that first item into its own row (name beside the avatar, Subscribe at the end).
  const actions = modern || classic ? channelChip + joinChip + likeChip + rest : likeChip + rest;
  const rowStyle = "display:flex;gap:8px;overflow-x:auto;scrollbar-width:none";
  // the channel row above the buttons: with the subscribe button at its end (two rows, minimal), without it
  // when the button leads the row of pills (classic)
  const classicBar = C("hide_channel_bar", `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px">${av(0, 32)}<div style="flex:1;min-width:0"><span class="t1">${VIDEOS[0].c}</span> <span class="t2">412K</span></div>
      ${classic ? "" : C("hide_join_membership_button", `<div class="chip" style="background:transparent;border:1px solid #555">Join</div>`) + subBtn}</div>`, { blk: 1 });
  return `<div style="background:#0f0f0f;height:330px;overflow-y:auto;scrollbar-width:thin;position:relative" class="inner-scroll">
    <div class="finger"></div>
    <div style="height:96px;position:relative">${videoFrame(0)}<div class="seek" style="bottom:0;left:0;right:0;border-radius:0"><div class="played" style="width:30%"></div></div></div>
    <div style="padding:10px 12px ${modern || classic ? 8 : 0}px">
      <div style="font-size:17px;font-weight:500;line-height:1.3">${esc(VIDEOS[0].t)}</div>
      <div class="t2" style="margin-top:4px"><span class="rollnum" data-n="1.2">1.2M</span> views · ${VIDEOS[0].a} <b style="color:#fff">...more</b></div>
    </div>
    ${modern || classic ? "" : classicBar}
    ${C("hide_action_bar", minimal ? minimalBar : `<div class="abrow" style="${rowStyle};padding:12px 12px 10px;margin-top:-12px">${actions}</div>`, { blk: 1 })}
    ${C("hide_comments_section", `<div style="margin:0 12px 10px;background:#272727;border-radius:12px;padding:10px 12px">
        <div class="t1">Comments <span class="t2">1.2K</span></div>
        ${C("hide_comments_preview_comment", `<div style="display:flex;gap:8px;margin-top:8px;align-items:center">${av(4, 24)}<div class="t2" style="color:#ddd;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">The wood stove at 12:04 is pure cosiness</div></div>`)}
      </div>`, { blk: 1 })}
    ${C("hide_info_panels", `<div style="margin:0 12px 10px;border:1px solid #333;border-radius:12px;padding:10px 12px;display:flex;gap:10px">${I("info", "ico", 'style="fill:#aaa;flex:none"')}<div><div class="t1" style="font-size:13px">Norway · Context</div><div class="t2">Norway is a Nordic country in Northern Europe. Wikipedia</div></div></div>`, { blk: 1 })}
    ${C("hide_player_related_videos", `<div style="padding:0 12px 12px;display:grid;gap:10px">${[2, 3].map(i => `<div style="display:flex;gap:10px">${thumb(i, "width:150px;flex:none")}<div style="min-width:0"><div class="t1" style="font-size:13px">${esc(VIDEOS[i].t)}</div><div class="t2">${VIDEOS[i].c} · ${VIDEOS[i].v}</div></div></div>`).join("")}</div>`, { blk: 1 })}
  </div>`;
};
def("watch", "vis", "hide_channel_profile_button hide_channel_profile_subscribe_button hide_comments_button hide_connect_button");
def("watch", "vis", "ryd_enabled");
def("watch", "style", "ryd_dislike_percentage");
// Extra panels (emergency, medical, crowdfunding) go above the related videos on every layout.
const watchExtras = html => html
    .replace(/(<div class="c[^"]*" data-k="morphe_hide_player_related_videos")/, `${C("hide_emergency_box", `<div style="margin:0 12px 10px;background:#3b1f1f;border-radius:12px;padding:10px 12px"><div class="t1" style="font-size:13px">Emergency information</div><div class="t2">Call 112 for emergency services in Norway</div></div>`, { blk: 1 })}
      ${C("hide_medical_panels", `<div style="margin:0 12px 10px;border:1px solid #333;border-radius:12px;padding:10px 12px"><div class="t1" style="font-size:13px">Health info from a licensed source</div><div class="t2">Carbon monoxide safety · NHS</div></div>`, { blk: 1 })}
      ${C("hide_crowdfunding_box", `<div style="margin:0 12px 10px;background:#272727;border-radius:12px;padding:10px 12px;display:flex;gap:10px;align-items:center">${I("heart", "ico", 'style="fill:#f06292;flex:none"')}<div><div class="t1" style="font-size:13px">Support the cabin on Patreon</div><div class="t2">Crowdfunding</div></div></div>`, { blk: 1 })}$1`);
{ const base = SCENES.watch; SCENES.watch = () => watchExtras(base()); }

// ------------------------------------------------------------------ miniplayer, one design per type
// the miniplayer itself stands for its type and for every look setting: selecting one rings it
const MINI_LOOKS = "miniplayer_disable_rounded_corners miniplayer_glass miniplayer_docked miniplayer_opacity miniplayer_width_dip";
SCENES.miniplayer = () => {
  const type = V("morphe_miniplayer_type");
  const round = !VE("morphe_miniplayer_disable_rounded_corners");
  const glass = !!VE("morphe_miniplayer_glass");
  const docked = !!VE("morphe_miniplayer_docked");
  const op = Number(VE("morphe_miniplayer_opacity") ?? 100) / 100;
  const w = Math.max(130, Math.min(260, Number(VE("morphe_miniplayer_width_dip")) || 192));
  const ttl = (extra = "") => C("miniplayer_hide_title", `<div style="min-width:0;${extra}"><div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(VIDEOS[0].t)}</div><div class="t2" style="font-size:11px">${VIDEOS[0].c}</div></div>`, { style: "flex:1;min-width:0" });
  const ic = (n, s = 20) => I(n, "ico", `style="width:${s}px;height:${s}px"`);
  const surface = glass ? "background:rgba(40,40,40,.55);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);border:1px solid rgba(255,255,255,.12)" : "background:#212121";
  const radius = round || glass ? 14 : 0;
  const prog = `<div style="position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.25)"><div style="width:30%;height:2px;background:#ff0033"></div></div>`;
  const pos = docked ? "right:0;bottom:52px" : "right:10px;bottom:62px";
  let mini = "";
  if (type === "DISABLED") mini = `<div class="demo-label" style="top:auto;bottom:66px;left:12px">Miniplayer disabled: closing the player stops the video</div>`;
  else if (type === "DEFAULT" || type === "MINIMAL" || type === "MINIMAL_BAR" || type === "MINIMAL_BAR_2") {
    // Bar miniplayers: a strip above the navigation bar.
    const minimal = type !== "DEFAULT";
    const bar2 = type === "MINIMAL_BAR_2";
    mini = `<div class="mini" style="position:absolute;inset:0;${surface};border-radius:${docked ? 0 : glass ? 14 : 0}px;overflow:hidden;display:flex;align-items:center;gap:10px;padding-right:6px;opacity:${op};">
      <div style="width:${minimal ? (bar2 ? 0 : 64) : 96}px;flex:none;display:${bar2 ? "none" : "block"}">${thumb(0, "border-radius:0")}</div>
      ${bar2 ? `<div style="width:8px"></div>` : ""}${ttl()}
      ${C("miniplayer_hide_overlay_buttons", `<div style="display:flex">${minimal ? "" : `<span style="margin:6px">${ic("prev")}</span>`}<span style="margin:6px">${ic("pause", 24)}</span>${minimal ? "" : `<span style="margin:6px">${ic("next")}</span>`}<span style="margin:6px">${ic("close")}</span></div>`)}
      ${prog}</div>`;
    // the miniplayer is the element of Miniplayer type and of every look setting (MINI_LOOKS): selecting
    // any of them rings and flashes it
    mini = C("miniplayer_type", mini, { also: MINI_LOOKS, style: `position:absolute;left:${docked || !glass ? 0 : 8}px;right:${docked || !glass ? 0 : 8}px;bottom:${docked || !glass ? 52 : 60}px;height:${bar2 ? 44 : 54}px;z-index:1` });
  } else {
    // Floating miniplayers (Modern 1 to 4). Each type draws its controls differently.
    const ov = {
      MODERN_1: `<div style="position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:space-between;padding:4px">${ic("full", 18)}<div style="display:flex;gap:12px;align-self:center">${ic("prev")}${ic("pause", 28)}${ic("next")}</div>${ic("close", 18)}</div>`,
      MODERN_2: `<div style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.55),transparent 40%,transparent 60%,rgba(0,0,0,.55));padding:4px"><div style="display:flex;justify-content:space-between">${ic("full", 18)}${ic("close", 18)}</div><div style="position:absolute;left:0;right:0;bottom:6px;display:flex;justify-content:center;gap:18px">${ic("reload", 18)}${ic("pause", 22)}${ic("reload", 18).replace("<svg", '<svg style="transform:scaleX(-1)"')}</div></div>`,
      MODERN_3: `<div style="position:absolute;right:4px;top:4px;display:flex;gap:6px;background:rgba(0,0,0,.45);border-radius:12px;padding:2px 6px">${ic("pause", 18)}${ic("close", 18)}</div>`,
      MODERN_4: `<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.25)"><div style="width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.55);display:grid;place-items:center">${ic("pause", 24)}</div><div style="position:absolute;right:4px;top:4px">${ic("close", 18)}</div><div style="position:absolute;left:4px;top:4px">${ic("full", 18)}</div></div>`,
    }[type === "TABLET" ? "MODERN_1" : type] || "";
    const below = type === "MODERN_3" ? `<div style="display:flex;align-items:center;gap:6px;padding:6px 8px">${ttl()}</div>` : type === "MODERN_2" ? `<div style="padding:4px 8px 6px">${ttl()}</div>` : "";
    mini = `<div class="mini" style="position:relative;width:100%;opacity:${op};${type === "MODERN_2" || type === "MODERN_3" ? surface + ";" : ""}border-radius:${docked ? `${radius}px 0 0 0` : radius + "px"};overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.6)">
      <div style="position:relative">${thumb(0, "border-radius:0")}${C("miniplayer_hide_overlay_buttons", ov, { style: "position:absolute;inset:0" })}${prog}</div>
      ${below}
      ${type === "MODERN_1" || type === "MODERN_4" ? C("miniplayer_hide_title", `<div style="position:absolute;left:0;right:0;bottom:2px;padding:10px 6px 4px;background:linear-gradient(transparent,rgba(0,0,0,.8));font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(VIDEOS[0].t)}</div>`, { style: "position:absolute;left:0;right:0;bottom:0" }) : ""}
    </div>`;
    mini = C("miniplayer_type", mini, { also: MINI_LOOKS, style: `position:absolute;${pos};width:${w}px;z-index:1;border-radius:${docked ? `${radius}px 0 0 0` : radius + "px"}` });
  }
  const resume = C("miniplayer_disable_resuming", `<div style="${surface};border-radius:14px;padding:8px;display:flex;gap:8px;align-items:center"><div style="width:72px;flex:none;border-radius:8px;overflow:hidden">${thumb(1, "border-radius:0")}</div><div style="min-width:0;flex:1"><div class="t2" style="font-size:10.5px">Continue watching</div><div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(VIDEOS[1].t)}</div></div>${ic("close", 18)}</div>`, { also: "miniplayer_disable_resuming", style: "position:absolute;left:10px;right:10px;top:60px;z-index:2" });
  const notAvail = "";
  return `<div style="background:#0f0f0f;height:350px;position:relative;overflow:hidden" id="miniStage">
    <div style="margin:8px 10px;background:#2b2b2b;border-radius:16px;padding:10px 12px;display:flex;gap:10px;align-items:center">
      <div style="width:40px;height:40px;border-radius:8px;background:${ART[0]};flex:none"></div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(VIDEOS[0].t)}</div><div class="t2">YouTube · media notification</div>
        ${C("disable_notification_media_seekbar", `<div style="height:3px;background:#555;border-radius:2px;margin-top:6px"><div style="width:30%;height:3px;background:#fff;border-radius:2px"></div></div>`)}</div>
      <div style="display:flex;align-items:center">${C("hide_notification_media_prev_next", I("prev", "ico", 'style="width:20px;height:20px;margin:4px"'))}${I("pause", "ico", 'style="margin:4px"')}${C("hide_notification_media_prev_next", I("next", "ico", 'style="width:20px;height:20px;margin:4px"'))}</div>
    </div>
    <div style="padding:0 12px">${thumb(3)}<div style="display:flex;gap:10px;padding:10px 0">${av(3, 34)}<div><div class="t1">${esc(VIDEOS[3].t)}</div><div class="t2">${VIDEOS[3].c} · ${VIDEOS[3].v}</div></div></div></div>
    ${resume}${mini}${notAvail}
    <div style="position:absolute;left:0;right:0;bottom:0">${navBarStatic()}</div>
    <div class="finger" id="finger"></div>
  </div>`;
};
def("miniplayer", "vis", "miniplayer_disable_resuming");

def("miniplayer", "style", "miniplayer_glass miniplayer_docked");

// ------------------------------------------------------------------ SponsorBlock
SECTIONS.splice(SECTIONS.findIndex(s => s.id === "captions") + 1, 0, { id: "sponsorblock", icon: "skip", title: "SponsorBlock", scopes: [["SPONSORBLOCK", null]] });
P.skip = "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z";
// Segment categories: Morphe builds these rows in code (not in the patch's preference list), so the
// catalogue misses them. Keys, defaults and colours follow Settings.java.
// A segment category's colour (its own colour setting, else SponsorBlock's), and an ink that reads on it:
// the category's choices are filled with it in the list (Max, Nov 23: the colour showcased in its toggle)
function sbColor(k) {
  const c = SB_CATS.find(x => "morphe_sb_" + x[0] === k); if (!c) return null;
  const v = String(V(k + "_color") || c[3]).replace(/^#..(......)$/, "#$1");
  return /^#[0-9a-f]{6}$/i.test(v) ? v : c[3];
}
function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16), lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  return .2126 * lin(n >> 16) + .7152 * lin((n >> 8) & 255) + .0722 * lin(n & 255) > .2 ? "#111" : "#fff";
}
const SB_BEHAVIOUR = [{ label: "Skip automatically", value: "skip" }, { label: "Skip automatically once", value: "skip-once" }, { label: "Show a skip button", value: "manual-skip" }, { label: "Show in seekbar", value: "seekbar-only" }, { label: "Disable", value: "ignore" }];
const SB_CATS = [["sponsor", "Sponsor", "skip-once", "#00d400"], ["selfpromo", "Unpaid/Self promotion", "manual-skip", "#ffff00"], ["interaction", "Interaction reminder", "manual-skip", "#cc00ff"], ["highlight", "Highlight", "manual-skip", "#ff1684"], ["hook", "Hook/Greetings", "ignore", "#395699"], ["intro", "Intermission/Intro animation", "manual-skip", "#00ffff"], ["outro", "Endcards/Credits", "manual-skip", "#0202ed"], ["preview", "Preview/Recap", "ignore", "#008fd6"], ["filler", "Filler tangent/Jokes", "ignore", "#7300ff"], ["music_offtopic", "Music: Non-music section", "manual-skip", "#ff9900"]];
const SB_SEGS = { sponsor: [8, 9], selfpromo: [46, 5], interaction: [30, 3], intro: [0, 3], outro: [88, 12], highlight: [60, 1], filler: [70, 6], music_offtopic: [20, 4], preview: [3, 2], hook: [36, 2] };
// The SponsorBlock preview is the Player controls preview with SponsorBlock's parts added (playerWith), so
// the buttons, opacity and icon style chosen under Player controls show here too. Its two buttons sit in
// the player's bottom row with Morphe's other player buttons, the segments on the player's own seekbar.
SCENES.sponsorblock = () => {
  const on = !!V("morphe_sb_enabled");
  const sq = !!V("morphe_sb_square_layout");
  const compact = !!V("morphe_sb_compact_skip_button");
  const r = sq ? 2 : 18;
  const noseg = !!V("morphe_sb_video_length_without_segments");
  const segs = on ? SB_CATS.filter(([k]) => SB_SEGS[k] && V("morphe_sb_" + k) !== "ignore").map(([k, , , col]) => `<i data-seg="${k}" style="position:absolute;left:${SB_SEGS[k][0]}%;width:${SB_SEGS[k][1]}%;top:0;bottom:0;background:${String(V("morphe_sb_" + k + "_color") || col).replace(/^#..(......)$/, "#$1")}"></i>`).join("") : "";
  const sbBtn = (k, icon, o) => C(k, `<div class="pbtn" style="width:32px;height:32px;border-radius:${sq ? 4 : 16}px">${I(icon)}</div>`, o);
  return playerWith({
    buttons: on ? sbBtn("sb_create_new_segment", "plus", { also: "sb_create_new_segment_step" }) + sbBtn("sb_voting_button", "like") : "",
    segs: C("sb_enabled", segs, { also: "sb_video_length_without_segments", style: "position:absolute;inset:0" }),
    time: `3:12 / ${on && noseg ? `18:42 <span style="color:#9be89b">(16:50)</span>` : "18:42"}`,
    over: (on ? C("sb_compact_skip_button", `<div class="sbskip" style="display:flex;align-items:center;gap:6px;height:34px;padding:0 ${compact ? 10 : 14}px;border-radius:${r}px;background:rgba(0,0,0,.72);border:1px solid rgba(255,255,255,.25);font-size:12.5px;font-weight:500">${I("skip", "ico", 'style="width:18px;height:18px"')}${compact ? "Skip" : "Skip sponsor"}</div>`, { style: "position:absolute;right:12px;bottom:58px", also: "sb_square_layout" }) : `<div class="demo-label">SponsorBlock is off</div>`)
      + `<div class="finger" id="finger"></div>`,
  });
};
def("sponsorblock", "style", "sb_enabled sb_square_layout sb_compact_skip_button sb_video_length_without_segments");
def("sponsorblock", "vis", "sb_create_new_segment sb_voting_button");
def("sponsorblock", "style", SB_CATS.map(c => "sb_" + c[0]).join(" "));
def("sponsorblock", "style", "sb_create_new_segment_step");
scen("sponsorblock", "sb_toast_on_skip", (box, on) => {
  situation("A sponsor segment starts");
  box.innerHTML = device("land", `${miniVideo(2)}<div class="msk" style="position:absolute;left:8%;right:8%;bottom:16%;height:3px;background:rgba(255,255,255,.3)"><i style="position:absolute;left:30%;width:25%;top:0;bottom:0;background:#00d400"></i><div class="mp" style="position:absolute;left:0;top:0;bottom:0;width:20%;background:#ff0033;transition:width .9s linear"></div></div>`);
  const dev = box.querySelector(".dev"), mp = dev.querySelector(".mp");
  at(200, () => { mp.style.width = "30%"; });
  at(1100, () => { mp.style.transition = "width .15s"; mp.style.width = "55%"; if (on) dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="bottom:8px;top:auto">Skipped sponsor</div>`); });
  return on ? "The segment is skipped and a notice appears" : "The segment is skipped silently";
});
scen("sponsorblock", "sb_auto_hide_skip_button", (box, on) => {
  situation("Inside a segment");
  box.innerHTML = device("land", `${miniVideo(2)}<div class="sk" style="position:absolute;right:8px;bottom:22px;font-size:9px;background:rgba(0,0,0,.75);border:1px solid #666;border-radius:9px;padding:2px 7px;transition:opacity .4s">Skip sponsor ▸</div>`);
  const sk = box.querySelector(".sk");
  if (on) at(1600, () => { sk.style.opacity = "0"; setFoot("The button fades after the set duration"); });
  return on ? "The Skip button shows, then fades" : "The Skip button stays for the whole segment";
});

// ------------------------------------------------------------------ fullscreen gestures (scenarios)
const gestureScen = (key, orient, from, to, label, result) => (turnsPhone(result) && SCN_TURNS.add("morphe_" + key), scen("fullscreen", key, (box, disabled) => {
  situation(label);
  box.innerHTML = device(orient, orient === "land" ? miniVideo(6) : playerArea(6));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(100, () => fingerTo(f, W * from[0], H * from[1])); at(350, () => fingerTo(f, W * to[0], H * to[1], 700));
  at(1100, () => {
    if (disabled) { dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:40%">Nothing happens</div>`); return; }
    result(dev);
  });
  return disabled ? `${label}: ignored` : `${label}: ${result.text}`;
}));
// A message pill inside a phone always stays inside it: one that would run past the bottom (a long
// message, or a phone drawn small) moves up just enough. Watches the scenario canvas, so it covers
// every scenario's pills however they were added.
function keepPillIn(t) {
  const dev = t.closest(".dev"); if (!dev || !t.isConnected || getComputedStyle(t).position !== "absolute") return;
  // inside the part of the phone that is shown (a faded half phone keeps only part of it: devBand)
  const [B0, B1] = devBand(dev), h = t.offsetHeight, mid = /-50%/.test(t.style.translate || "");
  const top = t.offsetTop - (mid ? h / 2 : 0);
  let dy = top + h > B1 - 3 ? B1 - 3 - (top + h) : 0;
  if (top + dy < B0 + 2) dy = B0 + 2 - top;
  if (dy) { t.style.top = (t.offsetTop + dy) + "px"; t.style.bottom = "auto"; }
}
// A message never sits on the words it is about. A scenario gives its pill a place ("top:40%",
// "bottom:8px") that was right for the screen its author had in mind; with a longer row, a smaller
// phone or one more line of content the same place lands on a title, a comment or a menu row, and the
// two texts read as one (the audit of Nov 24 found this in a dozen stories). One rule for every
// story, run from the observer below before the pill is first drawn: when the pill covers text or a
// marked part of its phone, it moves up or down to the nearest place where it covers none. In a phone
// with no clear place it stays where the story put it.
// data-stay on a pill keeps it where it was put.
function pillOffText(t) {
  const dev = t.closest(".dev"); if (!dev || !t.isConnected || t._offText || t.dataset.stay !== undefined || getComputedStyle(t).position !== "absolute") return;
  t._offText = true;
  keepPillIn(t); // first into the part of the phone that is shown, then off the words there
  const k = devScale(dev), D0 = dev.getBoundingClientRect(), [B0, B1] = devBand(dev), y0 = D0.top + dev.clientTop * k;
  // the phone as far as it is shown (a faded half phone: only its kept part counts, and the pill stays in it)
  const D = { left: D0.left, right: D0.right, top: B0 ? y0 + B0 * k : D0.top, bottom: B1 < dev.clientHeight ? y0 + B1 * k : D0.bottom }, r = t.getBoundingClientRect(), w = t.offsetWidth * k, h = t.offsetHeight * k; if (!w || !h) return;
  // where it is drawn at rest (its pop-in animation scales it around its middle)
  const a = { l: (r.left + r.right) / 2 - w / 2, r: (r.left + r.right) / 2 + w / 2, t: (r.top + r.bottom) / 2 - h / 2, b: (r.top + r.bottom) / 2 + h / 2 };
  const shown = e => { for (let x = e; x && x !== dev; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.visibility === "hidden" || parseFloat(cs.opacity) < .05) return false; } return true; };
  const boxes = [], add = (q, wt) => { const l = Math.max(q.left, D.left), rr = Math.min(q.right, D.right), tp = Math.max(q.top, D.top), bt = Math.min(q.bottom, D.bottom); if (rr - l > 1 && bt - tp > 1) boxes.push([l, rr, tp, bt, wt]); };
  const walk = document.createTreeWalker(dev, NodeFilter.SHOW_TEXT), range = document.createRange();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const e = n.parentElement; if (!n.nodeValue.trim() || !e || e.closest(".toastin, .badge7, .check7") || !shown(e)) continue;
    range.selectNodeContents(n); add(range.getBoundingClientRect(), 1);
  }
  dev.querySelectorAll(".new7, .chg7").forEach(e => { if (!e.contains(t) && !e.closest(".toastin, .badge7, .check7") && shown(e)) add(e.getBoundingClientRect(), 1); });
  if (!boxes.length) return;
  const pad = 1.5 * k, cost = dy => { let c = 0; for (const [l, rr, tp, bt, wt] of boxes) { const ox = Math.min(a.r + pad, rr) - Math.max(a.l - pad, l), oy = Math.min(a.b + dy + pad, bt) - Math.max(a.t + dy - pad, tp); if (ox > 0 && oy > 0) c += ox * oy * wt; } return c; };
  const here = cost(0); if (here < 4 * k * k) return;
  const edge = 3 * k + dev.clientTop * k, lo = D.top + edge - a.t, hi = D.bottom - edge - a.b;
  let best = 0, least = here;
  for (let step = 2 * k, d = step; d <= Math.max(-lo, hi); d += step) for (const dy of [-d, d]) {
    if (dy < lo || dy > hi) continue;
    const c = cost(dy); if (c < least - 1) { least = c; best = dy; }
    if (!least) break;
  }
  if (!best || least > here * .1) return; // no clear place in this phone: it stays (moving it from one text onto another helps nobody)
  t.style.top = (t.offsetTop + best / k) + "px"; t.style.bottom = "auto";
  (window.__offText = window.__offText || []).push([t.textContent.trim().slice(0, 30), Math.round(best / k)]);
}
// Two pills in one phone never sit on each other. Pills keep one size on screen, so in a phone drawn
// small they are bigger next to it, and two that fit side by side (or one under the other) in a large
// phone would overlap: then the later one moves down just clear of the other, so a readout in the right
// corner drops under the one in the left corner. One rule for every scenario, run from the observer
// below. Only pills placed in the same box are compared (a readout riding on a sliding Short is not).
function pillsApart(dev) {
  if (!dev.isConnected) return;
  const k = devScale(dev), gap = 2, D = dev.getBoundingClientRect(), edge = 3 * k + dev.clientLeft * k;
  // where a pill is drawn, without the growth of a pulse that may be running: its middle, and its laid-out size
  const box = e => { const r = e.getBoundingClientRect(), w = e.offsetWidth * k, h = e.offsetHeight * k, x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2; return { l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 }; };
  // a pill fading in (its pop animation) counts already; only one hidden on purpose does not
  const pills = [...dev.querySelectorAll(".toastin, .badge7")].filter(e => !e.classList.contains("dyn") && e.offsetWidth && getComputedStyle(e).position === "absolute" && getComputedStyle(e).visibility !== "hidden" && parseFloat(e.style.opacity || "1") > .5)
    .map((e, i) => { const o = { e, i, q: box(e), old: !!e._apart }; e._apart = true; return o; }).sort((a, b) => Math.round((a.q.t - b.q.t) / k) || a.i - b.i); // top to bottom, and in a row the first one stays
  // pills in the same screen (their boxes coincide), not one riding on a Short that slides over the other
  const sameBox = (x, y) => { if (x.offsetParent === y.offsetParent) return true; const p = x.offsetParent && x.offsetParent.getBoundingClientRect(), q = y.offsetParent && y.offsetParent.getBoundingClientRect(); return !!p && !!q && Math.abs(p.left - q.left) < 1 && Math.abs(p.top - q.top) < 1 && Math.abs(p.width - q.width) < 1 && Math.abs(p.height - q.height) < 1; };
  // a pill already on screen that moves glides there (a quarter second), so nothing jumps; a new one is
  // placed before it is first drawn (this runs in the frame it was added)
  const glide = (o, dx, dy) => { if (o.old && (dx || dy)) o.e.animate([{ translate: `${-dx / k}px ${-dy / k}px` }, { translate: "0px 0px" }], { duration: 250, easing: "cubic-bezier(.4,0,.2,1)", composite: "add" }); };
  let pair = [];
  const hits = (q, but) => pills.some(o => o !== but && !pair.includes(o) && Math.min(o.q.r, q.r) - Math.max(o.q.l, q.l) > 1 && Math.min(o.q.b, q.b) - Math.max(o.q.t, q.t) > 1);
  for (let j = 1; j < pills.length; j++) for (let i = 0; i < j; i++) {
    const a = pills[i], b = pills[j]; if (!sameBox(a.e, b.e) || a.e.contains(b.e) || b.e.contains(a.e)) continue;
    if (Math.min(a.q.r, b.q.r) - Math.max(a.q.l, b.q.l) <= 1 || Math.min(a.q.b, b.q.b) - Math.max(a.q.t, b.q.t) <= 1) continue;
    pair = [a, b];
    // under the other one, if the phone has the room; else beside it (right, then left), at its own height
    const down = a.q.b - b.q.t + gap * k;
    if (b.q.b + down <= D.bottom - edge) { b.e.style.top = (b.e.offsetTop + down / k) + "px"; b.e.style.bottom = "auto"; b.q.t += down; b.q.b += down; glide(b, 0, down); continue; }
    const w = b.q.r - b.q.l, tries = [a.q.r + gap * k, a.q.l - gap * k - w].map(l => ({ l, r: l + w, t: b.q.t, b: b.q.b })).filter(q => q.l >= D.left + edge && q.r <= D.right - edge && !hits(q, b));
    const shift = (o, q) => { const dx = q.l - o.q.l; o.e.style.left = (o.e.offsetLeft + dx / k) + "px"; o.e.style.right = "auto"; o.q = q; glide(o, dx, 0); };
    if (tries.length) { shift(b, tries[0]); continue; }
    // or both side by side around the middle of the phone (two centred messages)
    const wa = a.q.r - a.q.l, mid = (D.left + D.right) / 2, l0 = mid - (wa + gap * k + w) / 2;
    const qa = { l: l0, r: l0 + wa, t: a.q.t, b: a.q.b }, qb = { l: qa.r + gap * k, r: qa.r + gap * k + w, t: b.q.t, b: b.q.b };
    if (qa.l >= D.left + edge && qb.r <= D.right - edge && !hits(qa, a) && !hits(qb, b)) { shift(a, qa); shift(b, qb); continue; }
    b.e.style.top = (b.e.offsetTop + down / k) + "px"; b.e.style.bottom = "auto"; b.q.t += down; b.q.b += down;
    if (b.e.matches(".toastin")) keepPillIn(b.e);
  }
}
// A small part of a scenario that changes (a corner readout such as "1.5×" or "720p", or anything marked
// .chg7) flashes twice so the eye finds it: one shared rule for every animation, run from the observer
// below, so a scenario only has to change the text. The first drawing of a phone never flashes, except
// for .new7: a small part the setting itself adds or changes that is there from the first frame (the
// Auto button of Autoplay control, a Translate link, the 4K row): it flashes once the phones are up, so
// the eye finds what differs even when nothing in the story changes it later.
const CHG_SEL = ".badge7, .chg7", NEW_SEL = ".new7", NEW_FLASH_MS = 380;
function flash7(el) {
  if (!el || !el.isConnected || el._flashAt && performance.now() - el._flashAt < 300) return;
  el._flashAt = performance.now();
  const cs = getComputedStyle(el);
  if (cs.borderTopLeftRadius === "0px") el.style.borderRadius = ".35em"; // plain text (a time readout): a rounded ring
  // Grow around the part's own middle. A pill centred with transform: translateX(-50%) (every message
  // pill) would otherwise grow around the box it was moved out of and slide sideways: so the scale is
  // added after its own transform, not as the separate scale property (which applies before it).
  const base = cs.transform && cs.transform !== "none" ? cs.transform + " " : "";
  const k = s => base ? { transform: `${base}scale(${s})` } : { scale: s };
  // It grows by 30%, or by less when that would take it past the edge of its phone or of the preview
  // box: a readout in a corner (3px from the edge) was cut on that side every time it pulsed.
  // The room is measured to whatever clips the part (the phone's screen, a scrolling sheet), not only to
  // the phone: a menu sheet sitting on the screen's bottom edge lost its bottom and side ring (Max, Nov 23:
  // Open Advanced quality menu). With no room for the ring on some side, it is drawn inside the part.
  let big = 1.3, ring = "0 0 0 .2em", half = "0 0 0 .1em";
  const host = el.closest(".dev") || el.closest("#stage, #canvas");
  if (host) {
    const r = el.getBoundingClientRect(); let clip = host;
    for (let a = el.parentElement; a && a !== host; a = a.parentElement) { const o = getComputedStyle(a); if (o.overflowX !== "visible" || o.overflowY !== "visible") { clip = a; break; } }
    const h = clip.getBoundingClientRect(), bz = clip.clientLeft * (h.width / (clip.offsetWidth || 1));
    const roomX = Math.min(r.left - h.left, h.right - r.right) - bz, roomY = Math.min(r.top - h.top, h.bottom - r.bottom) - bz;
    if (r.width && r.height) big = Math.max(1.04, Math.min(1.3, 1 + 2 * Math.max(0, roomX - 1) / r.width, 1 + 2 * Math.max(0, roomY - 1) / r.height));
    const ringPx = .2 * parseFloat(cs.fontSize) * (r.width / (el.offsetWidth || r.width || 1));
    if (Math.min(roomX, roomY) < ringPx + (big - 1) * Math.min(r.width, r.height) / 2) {
      big = 1; ring = "inset 0 0 0 .2em"; half = "inset 0 0 0 .1em";
      // a part flush with a rounded edge of what clips it (a sheet on the screen's bottom edge) takes that
      // edge's rounding for the flash, so the inside ring follows the corners instead of being cut there
      const sc = (el.offsetWidth || 1) / (r.width || 1), oc = getComputedStyle(clip), near = 1.5;
      const inner = c => Math.max(0, parseFloat(oc[`border${c}Radius`]) - clip.clientLeft) * (h.width / (clip.offsetWidth || 1)) * sc;
      const edge = { Top: r.top - h.top, Bottom: h.bottom - r.bottom, Left: r.left - h.left, Right: h.right - r.right };
      const saved = {};
      for (const [v, hz] of [["Top", "Left"], ["Top", "Right"], ["Bottom", "Left"], ["Bottom", "Right"]]) {
        if (edge[v] - bz > near || edge[hz] - bz > near) continue;
        const prop = `border${v}${hz}Radius`, want = inner(v + hz);
        if (want > parseFloat(cs[prop])) { saved[prop] = el.style[prop]; el.style[prop] = want + "px"; }
      }
      if (Object.keys(saved).length) setTimeout(() => Object.assign(el.style, saved), 950);
    }
  }
  const off = ring.startsWith("inset") ? "inset 0 0 0 0" : "0 0 0 0";
  el.animate([{ ...k(1), boxShadow: `${off} rgba(62,166,255,0)` }, { ...k(big), boxShadow: `${ring} rgba(62,166,255,.95)`, offset: .25 },
    { ...k(1), boxShadow: `${half} rgba(62,166,255,.5)`, offset: .5 }, { ...k(big), boxShadow: `${ring} rgba(62,166,255,.95)`, offset: .75 },
    { ...k(1), boxShadow: `${off} rgba(62,166,255,0)` }], { duration: 900, easing: "ease-in-out" });
}
// Parts that differ between the two phones from the first frame flash once the phones are up, on both
// sides (Max, Nov 23: the audio track badge of Force original audio language never flashed, after the
// Auto button and the Translate link had to be marked by hand). Every small part of one phone (a label,
// an icon, a readout, a menu line: under a fifth of the phone, messages left out) is paired with the
// same part in the other phone (same place in the drawing, same order); a different text, colour or
// icon, or a part only one phone has, flashes. When more than 8 parts differ the whole drawing differs
// (a waveform, a different screen): nothing flashes then. One rule for every comparison, no marks needed.
const DIFF_MAX = 8;
// .ctx7 marks a stock part a picture leaves out on one side only because the change takes its place (the
// views badge where the like row continues it): it never flashes on the other side
function smallPart(e, dev, da) {
  if (e.closest(".toastin, .ctx7")) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.width * r.height <= da * .2;
}
function diffFlash(box) {
  const devs = [...box.querySelectorAll(".dl7 .dev")]; if (devs.length !== 2) return;
  const parts = d => {
    const m = new Map(), dr = d.getBoundingClientRect(), da = dr.width * dr.height;
    d.querySelectorAll("*").forEach(e => {
      const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim();
      if (e.children.length && !own && e.tagName !== "svg") return; // a container: its parts are compared
      if (own.length > 40) return; // a sentence of a text card is not a part
      if (e.closest("svg") && e.tagName !== "svg") return; // an icon is compared whole
      if (!smallPart(e, d, da)) return;
      const path = []; for (let x = e; x && x !== d; x = x.parentElement) path.unshift(x.tagName + "." + [...x.classList].filter(c => c !== "new7" && c !== "sel").join("."));
      const st = (e.getAttribute("style") || "").replace(/(^|;)\s*(left|top|right|bottom|width|height|transform|transition|animation|opacity|margin[a-z-]*|inset)\s*:[^;]*/g, "");
      const sig = (e.tagName === "svg" ? e.innerHTML.slice(0, 120) : own) + "|" + st;
      const key = path.join(">"); if (!m.has(key)) m.set(key, []); m.get(key).push({ e, sig });
    });
    return m;
  };
  const [a, b] = devs.map(parts), hits = [[], []];
  new Set([...a.keys(), ...b.keys()]).forEach(k => {
    // parts the same on both phones pair up first, wherever they sit in the order, so one part that only
    // one phone has does not shift every part after it out of step (Max, Nov 25: Feed thumbnail like
    // position flashed the duration, the title and the views badge when only the like badge moved)
    let x = a.get(k) || [], y = b.get(k) || [];
    const ys = y.slice(); x = x.filter(p => { const i = ys.findIndex(q => q.sig === p.sig); if (i < 0) return true; ys.splice(i, 1); return false; }); y = ys;
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      if (!x[i] || !y[i]) hits[x[i] ? 0 : 1].push((x[i] || y[i]).e);
      else if (x[i].sig !== y[i].sig) { hits[0].push(x[i].e); hits[1].push(y[i].e); }
    }
  });
  if (hits[0].length > DIFF_MAX || hits[1].length > DIFF_MAX) return;
  // three or more differing lines of one box (a menu, a text card) flash as that box, once
  hits.forEach((side, i) => {
    const by = new Map(); side.forEach(e => { const p = e.parentElement; if (!by.has(p)) by.set(p, []); by.get(p).push(e); });
    const da = devs[i].offsetWidth * devs[i].offsetHeight * devScale(devs[i]) ** 2;
    by.forEach((es, p) => { const r = p.getBoundingClientRect(); if (es.length >= 3 && p !== devs[i] && r.width * r.height <= da * .45) hits[i] = hits[i].filter(e => !es.includes(e)).concat(p); });
  });
  // a part inside another flashing part flashes with it, not on its own
  const all = hits.flat(), top = all.filter(e => !all.some(o => o !== e && o.contains(e)));
  top.forEach(e => { if (!e.matches(NEW_SEL)) setTimeout(() => flash7(e), NEW_FLASH_MS); });
  if (window.__dfLog) window.__dfLog(top);
}
// A small part the story brings in later by fading it up from nothing (a voice line, a label) flashes as
// it appears, like a part added later; messages and taps are left out.
function revealFlash(e) {
  const d = e.closest(".dev"); if (!d || e.closest(".toastin") || e.matches(".tap7, .rip7, [class*='tap'], [class*='finger'], [class*='ripple']")) return;
  const dr = d.getBoundingClientRect();
  if (!smallPart(e, d, dr.width * dr.height)) return;
  flash7(e); if (window.__rvLog) window.__rvLog(e);
}
new MutationObserver(ms => {
  const hit = new Set(), devs = new Set(), PILLS = ".toastin, .badge7";
  ms.forEach(m => {
    if (m.type === "attributes") { // style: faded up from opacity 0 (see revealFlash)
      const was = /(^|;)\s*opacity\s*:\s*0(\s*[;!]|\s*$)/.test(m.oldValue || ""), now = m.target.style.opacity;
      if (was && now !== "" && +now > 0) requestAnimationFrame(() => revealFlash(m.target));
      return;
    }
    const t = m.target.nodeType === 1 ? m.target : m.target.parentElement, own = t && t.closest && t.closest(CHG_SEL);
    if (own && own.closest(".dev")) hit.add(own); // its text or content changed
    const pill = t && t.closest && t.closest(PILLS); if (pill && pill.closest(".dev")) devs.add(pill.closest(".dev")); // a pill's text changed: its size did too
    m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      [...(n.matches(".toastin, .check7") ? [n] : []), ...n.querySelectorAll(".toastin, .check7")].forEach(t => { pillOffText(t); if (t.matches(".toastin")) requestAnimationFrame(() => keepPillIn(t)); });
      if (n.matches(PILLS) || n.querySelector(PILLS)) [...(n.closest(".dev") ? [n.closest(".dev")] : n.querySelectorAll(".dev"))].forEach(d => devs.add(d));
      if (n.matches(CHG_SEL) && m.target.closest && m.target.closest(".dev")) hit.add(n); // a readout appearing later
      [...(n.matches(NEW_SEL) ? [n] : []), ...n.querySelectorAll(NEW_SEL)].forEach(e => setTimeout(() => flash7(e), NEW_FLASH_MS));
    });
  });
  hit.forEach(flash7);
  // at once (a pill added inside a frame callback is drawn in that frame), and again after keepPillIn
  if (devs.size) { devs.forEach(pillsApart); requestAnimationFrame(() => devs.forEach(pillsApart)); }
}).observe(document.getElementById("canvas"), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style"], attributeOldValue: true }); // $() is defined later, in list.js
// swap what the device shows (fullscreen video vs portrait watch page) as it turns
// The new screen goes in underneath, fully drawn, and the old one fades off the top of it. (Both used to
// fade at once, old out and new in a little later, so the screen dipped to black in between: the flicker
// at the end of every turn: force landscape, the fullscreen swipe gestures, anything using turn().)
function devContent(dev, html) {
  const old = [...dev.children].filter(c => !c.classList.contains("waves") && !c.classList.contains("finger"));
  const tmp = document.createElement("div"); tmp.innerHTML = html;
  [...tmp.children].reverse().forEach(c => dev.insertBefore(c, dev.firstChild));
  old.forEach(c => { c.style.transition = "opacity .25s"; requestAnimationFrame(() => { c.style.opacity = "0"; }); later(() => c.remove(), 260); });
}
// Turn the phone and show what the app shows in the new orientation. The new screen crossfades in
// while the phone is still turning, so it is fully there before the phone settles: swapping after the
// turn showed the old layout re-laid out for a moment (the watch page's lower half flashing under the
// fullscreen video). Every turn that changes the screen goes through here.
function turnTo(dev, orient, html) {
  const cur = dev.classList.contains("land") ? "land" : "port";
  if (cur === orient) return devContent(dev, html);
  turn(dev, orient); later(() => devContent(dev, html), 180);
}
// the phone turns visibly (its screen rotates with it), then the app lays out for the new orientation
function turn(dev, orient, then, ms = MOVE_MS) {
  const cur = dev.classList.contains("land") ? "land" : "port";
  if (cur === orient) { if (then) then(); return; }
  const gen = dev.closest(".duo7.gen"); if (gen) return turnInPair(gen, dev, cur, orient, then, ms);
  // while it turns, the phone is scaled so its rotated outline still fits the preview
  const [w, h] = DEV_SIZE[cur];
  dev.querySelectorAll(".finger").forEach(f => f.classList.remove("show"));
  dev.style.transition = `transform ${ms}ms var(--ease), scale ${ms}ms var(--ease)`; dev.style.transform = `rotate(${orient === "land" ? -90 : 90}deg)`;
  const inPair = !!dev.closest(".duo7.gen"); // in a pair the turning phone shrinks to stay inside its own slot
  dev.style.scale = (inPair ? Math.min(w, h) / Math.max(w, h) : Math.min(parseFloat(dev.style.scale) || 1, fitScale(h, w))).toFixed(3);
  later(() => {
    // the phone is re-laid out for the new orientation; it starts from exactly the box the turned
    // phone had and eases into its new size, so the swap doesn't jump
    const b = dev.getBoundingClientRect();
    dev.style.transition = "none"; dev.style.transform = ""; if (inPair) dev.style.scale = ""; rotate(dev, orient);
    const a = dev.getBoundingClientRect(), s = parseFloat(getComputedStyle(dev).scale) || 1;
    if (a.width && a.height && b.width) {
      dev.style.transform = `translate(${((b.left + b.width / 2) - (a.left + a.width / 2)) / s}px, ${((b.top + b.height / 2) - (a.top + a.height / 2)) / s}px) scale(${b.width / a.width}, ${b.height / a.height})`;
      void dev.offsetWidth; dev.style.transition = "transform .28s var(--ease)"; dev.style.transform = "";
    }
    if (then) then();
  }, ms + 20);
}
// In a pair everything moves as one, on the same .5 s curve, started on the same frame: the phone turns
// with its screen while its slot takes the new shape at once, so the pair re-lays out and rescales, and
// the other phone, the labels and the captions glide to their new places (fitDev) as it turns. It ends
// exactly in the box of the new orientation, where it is re-laid out for it and nothing jumps.
function turnInPair(gen, dev, cur, orient, then, ms = MOVE_MS) {
  const slot = dev.parentElement, [w0, h0] = DEV_SIZE[cur], [w1, h1] = DEV_SIZE[orient];
  dev.querySelectorAll(".finger").forEach(f => f.classList.remove("show"));
  gen.querySelectorAll(":scope > .dl7 > .sf7").forEach(c => { if (!c._gliding) c._pos = inPair(gen, c); });
  gen._was = pairSnap(gen); gen._turn = true; pairMs = ms;
  dev.getAnimations().filter(a => a.id === "turn").forEach(a => a.cancel());
  slot.style.width = w1 + "px"; slot.style.height = h1 + "px";
  Object.assign(dev.style, { position: "absolute", left: "50%", top: "50%", translate: "-50% -50%", scale: "", transform: "" });
  fitDev(orient);
  // turned a quarter, the old phone's width becomes the new height and its height the new width
  const R = orient === "land" ? -90 : 90, a = h1 / w0, b = w1 / h0;
  dev.animate([{ transform: "none" }, { transform: `rotate(${R}deg) scale(${a.toFixed(4)}, ${b.toFixed(4)})` }], { id: "turn", duration: ms, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
  later(() => {
    dev.style.transition = "none";
    dev.getAnimations().filter(x => x.id === "turn").forEach(x => x.cancel());
    Object.assign(dev.style, { position: "", left: "", top: "", translate: "" }); slot.style.width = slot.style.height = "";
    setOrient(dev, orient); void dev.offsetWidth; dev.style.transition = ""; pairMs = MOVE_MS;
    if (then) then();
  }, ms);
}
const r1 = dev => turnTo(dev, "port", playerArea(6)); r1.text = "leaves fullscreen";
gestureScen("disable_fullscreen_dragged_down_gesture", "land", [.5, .25], [.5, .85], "Swipe down in fullscreen", r1);
const r2 = dev => turnTo(dev, "land", miniVideo(6)); r2.text = "enters fullscreen";
gestureScen("disable_fullscreen_pulled_up_gesture", "port", [.5, .3], [.5, .08], "Swipe up on the player", r2);
// Morphe's gesture type for this one is MAXIMIZED_TO_FULLSCREEN_SLIDING: pulling the portrait player
// down slides it into fullscreen (not down to the miniplayer)
const r3 = dev => { const v = dev.querySelector(".dv-video"); if (v) { v.style.transition = "transform .3s var(--ease)"; v.style.transformOrigin = "50% 0"; v.style.transform = "scaleY(1.25)"; } later(() => turnTo(dev, "land", miniVideo(6)), 260); }; r3.text = "slides into fullscreen";
gestureScen("disable_fullscreen_sliding_down_gesture", "port", [.5, .1], [.5, .45], "Swipe down on the player", r3);
// Two fingers on the fullscreen video, one shared story for both pinch settings (Max, Nov 24: Disable
// pinch-to-zoom showed the snap, not the zoom Restore pinch to zoom already drew). mode: "zoom" (the
// video scales with the fingers, in and out, with its zoom readout), "snap" (a pinch only jumps from
// fitted to filled) or "none" (nothing happens).
function pinchStory(box, mode, art) {
  box.innerHTML = device("land", `<div class="zv" style="position:absolute;left:10%;right:10%;top:0;bottom:0;background:${ART[art]};transform-origin:50% 50%"></div><div class="zr7 toastin" style="top:8px;opacity:0;transition:opacity .2s">1.0x</div>`);
  const dev = box.querySelector(".dev"), f1 = box.querySelector("#scFinger"), zv = box.querySelector(".zv"), zr = box.querySelector(".zr7"); const W = dev.clientWidth, H = dev.clientHeight;
  const f2 = f1.cloneNode(true); f2.id = ""; dev.appendChild(f2);
  const spread = (d, ms) => { fingerTo(f1, W * (.5 - d), H * (.5 + d * .55), ms); fingerTo(f2, W * (.5 + d), H * (.5 - d * .55), ms); };
  const zoomTo = (sc, ms) => { zv.style.transition = `transform ${ms}ms var(--ease)`; zv.style.transform = `scale(${sc})`; zr.textContent = sc.toFixed(1) + "x"; };
  at(150, () => spread(.06, 0));
  at(380, () => {
    spread(.3, 900 * scStretch);
    if (mode === "zoom") { zr.style.opacity = "1"; zoomTo(2.4, 900 * scStretch); }
  });
  if (mode === "snap") at(700, () => { zv.style.transition = "left .22s var(--ease), right .22s var(--ease)"; zv.style.left = zv.style.right = "0"; });
  if (mode === "none") { at(1150, () => { f1.classList.remove("show"); f2.classList.remove("show"); toast7(dev, "Nothing happens", "40%"); }); return; }
  at(1450, () => { spread(.2, 500 * scStretch); if (mode === "zoom") zoomTo(1.7, 500 * scStretch); });
  at(2200, () => { f1.classList.remove("show"); f2.classList.remove("show"); });
}
scen("fullscreen", "disable_fullscreen_zoom_gesture", (box, disabled) => {
  situation("Fullscreen, two fingers spread, then pinch back a little");
  pinchStory(box, disabled ? "none" : "zoom", 6);
  return disabled ? "Pinch does nothing: the video stays fitted" : "Pinch: the video zooms with your fingers";
});

scen("fullscreen", "restore_pinch_to_zoom", (box, on) => {
  situation("Fullscreen, two fingers spread, then pinch back a little");
  // Morphe's restore scales the video with the fingers, smoothly, anywhere from 1x up to 8x; without it
  // (YouTube 21.36+) a pinch only snaps between fitted and filled
  pinchStory(box, on ? "zoom" : "snap", 0);
  return on ? "Pinch: the zoom follows your fingers, in and out (up to 8x)" : "Pinch: the video only snaps from fitted to filled";
});

// ------------------------------------------------------------------ swipe controls: overlay style settings feed the swipe demo
def("fullscreen", "style", "swipe_overlay_background_opacity swipe_overlay_progress_volume_color swipe_overlay_progress_brightness_color swipe_overlay_progress_speed_color swipe_text_overlay_size swipe_zone_width");
def("fullscreen", "gesture", "swipe_top_zone");
def("fullscreen", "style", "swipe_zone_preview swipe_speed_zone_height swipe_overlay_timeout swipe_speed_step swipe_speed_sensitivity");
scen("fullscreen", "swipe_change_video", (box, on) => {
  situation("Fullscreen, swipe sideways");
  box.innerHTML = device("land", `<div class="sv" style="position:absolute;inset:0;display:flex;width:200%;transition:transform .45s var(--ease)"><div style="flex:1;background:${ART[6]}"></div><div style="flex:1;background:${ART[2]}"></div></div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(100, () => fingerTo(f, W * .8, H * .5)); at(350, () => fingerTo(f, W * .2, H * .5, 500));
  at(800, () => { if (on) box.querySelector(".sv").style.transform = "translateX(-50%)"; else dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:40%">Nothing happens</div>`); });
  return on ? "Swipe sideways: next video" : "Swipe sideways: nothing (stock)";
});
scen("fullscreen", "swipe_press_to_engage", (box, on) => {
  situation("Fullscreen, right edge");
  box.innerHTML = device("land", miniVideo(6));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(100, () => { fingerTo(f, W * .82, H * .8); if (on) f.classList.add("hold"); });
  at(on ? 900 : 300, () => { f.classList.remove("hold"); fingerTo(f, W * .82, H * .2, 800); dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:40%">🔊 Volume</div>`); });
  return on ? "Hold first, then swipe: avoids accidental changes" : "Any swipe on the edge changes volume";
});
scen("fullscreen", "volume_boost", (box, on) => {
  situation("Swiping up at full volume");
  box.innerHTML = device("land", `${miniVideo(6)}<div class="vb chg7 toastin" style="top:40%;translate:0 -50%">🔊 100%</div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), vb = box.querySelector(".vb"); const W = dev.clientWidth, H = dev.clientHeight;
  at(100, () => fingerTo(f, W * .82, H * .7)); at(350, () => fingerTo(f, W * .82, H * .15, 900));
  at(900, () => { vb.textContent = on ? "🔊 Boost 130%" : "🔊 100% (max)"; if (on) vb.style.color = "#ffb74d"; });
  return on ? "Past maximum the volume is boosted" : "Volume stops at maximum";
});

// ------------------------------------------------------------------ shorts player extras
SCENES.shorts = (base => () => {
  let html = base();
  // Drawn from ShortsFilter: the paused overlay is "lens_paused_state" / "shorts_paused_state", the buttons
  // YouTube lays over a paused Short (Google Lens search, Remix); it shows only while paused, so its demo
  // pauses the Short. 'Save music' (bookmark icon), 'New posts' (box pencil) and Upcoming (bell) are
  // suggested actions ("suggested_action"): pills in the row above the channel, like Shop or Use sound.
  // The gesture hint is the "Swipe up" tip YouTube inflates over the first Shorts (a ViewStub).
  const chip = (k, icon, t) => C(k, `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">${icon ? I(icon) + " " : ""}${t}</span>`);
  const paused = C("hide_shorts_paused_overlay_buttons", `<div style="display:flex;gap:10px">${[["search", "Search"], ["remix", "Remix"]].map(([ic, t]) => `<span class="chip" style="height:30px;background:rgba(0,0,0,.55)">${I(ic)} ${t}</span>`).join("")}</div>`, { style: "position:absolute;left:50%;top:39%;translate:-50% 0;z-index:3" });
  const top = `<div style="position:absolute;left:10px;top:8px;display:flex;gap:6px;align-items:center">
    ${C("hide_shorts_auto_dubbed_label", `<span class="chip" style="height:22px;font-size:10.5px;background:rgba(0,0,0,.5)">Auto-dubbed</span>`, { tag: "span" })}</div>`;
  const hint = C("hide_shorts_gesture_hints", `<div class="toastin shint7" style="position:static;transform:none"><span class="sharrow7">${I("up")}</span>Swipe up for more</div>`, { style: "position:absolute;left:50%;top:16%;translate:-50% 0;z-index:3" });
  const sugg = chip("hide_shorts_save_sound_button", "bookmark", "Save music") + chip("hide_shorts_new_posts_button", "pencil", "New posts") + chip("hide_shorts_upcoming_button", "bell", "Upcoming");
  html = html.replace(/(<div style="display:flex;flex-wrap:wrap;gap:6px">)/, `$1${sugg}`);
  return html.replace('<div id="heart"', paused + top + hint + '<div id="heart"');
})(SCENES.shorts);
// Shorts "more" menu: picking one of its settings opens the sheet, as on the phone. Drawn from FlyoutUtils
// (addShortsPlayerFlyoutButtons): Morphe adds its items at the top of the menu, Playback speed then Download,
// then a divider, above the app's own items. Download used to be a separate comparison with another menu
// drawing (Max, Nov 25: "animated differently"); it is the same menu, so it opens the same sheet.
// The sheet slides up only when it opens: moving between its settings, or any redraw while it is open,
// keeps it in place (it restarted the opening animation on every pick).
const SHORTS_SHEET = new Set(["morphe_hide_shorts_flyout_audio_track", "morphe_hide_shorts_flyout_captions", "morphe_shorts_playback_speed_flyout_button", "morphe_shorts_download_flyout_button"]);
SCENES.shorts = (base => () => {
  // "Shorts icon style" (Max, Nov 25: it did nothing): the buttons on the right draw the real icons of the
  // chosen set, from the patch's own drawables (shortsicons, iconstyles.js SHORTS_ICON_STYLES)
  const sty = V("morphe_shorts_icon_style") || "AUTO", set = typeof SHORTS_ICON_STYLES !== "undefined" && SHORTS_ICON_STYLES[sty];
  let html = base().replace('id="shortsStage"', `id="shortsStage" data-icons="${esc(sty)}"`);
  if (set) for (const [n, [vb, svg]] of Object.entries(set)) if (P[n]) html = html.split(`<svg class="ico" viewBox="0 0 24 24" ><path d="${P[n]}"/></svg>`).join(`<svg class="ico sty" viewBox="${vb}">${svg}</svg>`);
  if (!SHORTS_SHEET.has(selected)) return html;
  const open = !!document.querySelector("#stage #shortsStage .shsheet");
  const row = (k, icon, t) => { const r = `<div style="display:flex;align-items:center;gap:16px;padding:11px 18px">${I(icon)}<span style="font-size:14px">${t}</span></div>`; return k ? C(k, r, { blk: 1 }) : r; };
  const sheet = `<div class="shscrim" style="position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:25${open ? "" : ";animation:ghostin .25s var(--ease)"}"></div>
    <div class="shsheet" style="position:absolute;left:0;right:0;bottom:0;z-index:26;background:#212121;border-radius:14px 14px 0 0;padding:6px 0 10px${open ? "" : ";animation:sheetup .28s var(--ease)"}">
      <div style="width:36px;height:4px;border-radius:2px;background:#555;margin:2px auto 6px"></div>
      ${row("shorts_playback_speed_flyout_button", "speed", "Playback speed")}${row("shorts_download_flyout_button", "dl", "Download")}
      <div style="height:1px;background:#3a3a3a;margin:4px 0"></div>
      ${row(null, "tune", "Quality")}${row("hide_shorts_flyout_captions", "cc", "Captions")}${row("hide_shorts_flyout_audio_track", "music", "Audio track")}
      ${row(null, "info", "Description")}${row(null, "flag", "Report")}${row(null, "help", "Send feedback")}
    </div>`;
  return html.replace('<div class="finger" id="finger"></div>', sheet + '<div class="finger" id="finger"></div>');
})(SCENES.shorts);
def("shorts", "vis", "hide_shorts_flyout_audio_track hide_shorts_flyout_captions shorts_playback_speed_flyout_button shorts_download_flyout_button");
def("shorts", "style", "shorts_icon_style");
def("shorts", "vis", "hide_shorts_paused_overlay_buttons hide_shorts_save_sound_button hide_shorts_new_posts_button hide_shorts_upcoming_button hide_shorts_auto_dubbed_label hide_shorts_gesture_hints");

// ------------------------------------------------------------------ navigation: glass bar
// Drawn from YouTubeGlassNavigationBar, GlassNavigationBarLayout and GlassCapsuleDrawable (dark style):
// a capsule 12 dp from the screen edges and 10 dp above the bottom; height = Glass navigation bar size %
// of the bar's 52 dp (never less than the buttons need); corners 0.3 x the height, 0.5 (round ends) with
// Round glass navigation bar; fill = the app background lifted 14% toward white at alpha 0.5 x opacity/50
// (Glass opacity 20 = a clear glass); a light rim on top; a soft pill behind the selected tab. Maximum
// width and Button spacing (same size dialog) shape the width: each button is its content plus the
// spacing, at least 48 dp, all within the most width; buttons that don't fit are cut.
// (The match used to look for an older opening tag of the bar, so glass changed nothing in the preview.)
{
  const base = navBar;
  let measure = null;
  const textW = t => { measure = measure || document.createElement("canvas").getContext("2d"); measure.font = "10px Roboto, sans-serif"; return measure.measureText(t).width; };
  navBar = function (plain) {
    const html = base(plain);
    if (!V("morphe_navigation_bar_glass") || V("morphe_hide_navigation_bar")) return html;
    const num = (k, d) => { const v = V("morphe_navigation_bar_glass_" + k), n = Number(v); return v === "" || v == null || !isFinite(n) ? d : n; };
    const tpl = document.createElement("template"); tpl.innerHTML = html.trim();
    const bar = tpl.content.firstElementChild; if (!bar) return html;
    // the buttons drawn (a hidden one is drawn collapsed: "off") and the content of the widest: icon and label
    // (GlassNavigationBarLayout.measureButtons)
    const tabs = [...bar.children].filter(e => e.classList.contains("ntab") && !e.classList.contains("off"));
    const labelOf = e => { const l = e.querySelector('[data-k="morphe_hide_navigation_button_labels"]'); return l && !l.classList.contains("off") ? l.textContent.trim() : ""; };
    const labels = tabs.map(labelOf), anyLabel = labels.some(Boolean);
    const content = Math.ceil(Math.max(24, ...labels.map(t => t ? textW(t) : 0))), contentH = anyLabel ? 38 : 24;
    // getButtonsLayout: the most width is the screen less 12 dp each side, times Maximum width; a button is its
    // content plus Button spacing (at least 48 dp, content + 8 dp to fit); buttons that don't fit are hidden from the end
    const W = ($("stage") && $("stage").clientWidth) || 360, maxW = Math.max(0, (W - 24) * num("width", 100) / 100);
    const minBtn = Math.max(48, content + 8), shown = Math.max(1, Math.min(tabs.length || 1, Math.floor(maxW / minBtn)));
    const bw = Math.floor(Math.min(Math.max(48, content + num("button_spacing", 48)), maxW / shown));
    tabs.slice(shown).forEach(e => e.classList.add("gcut"));
    if (tabs[0]) tabs[0].classList.add("gsel"); // the selected button (Home) has the indicator
    // getCapsuleHeight: Glass navigation bar size % of the bar's 52 dp, never less than the content + 4 dp each side
    const minH = contentH + 8, h = Math.max(minH, Math.round(Math.max(52, minH) * num("height", 100) / 100));
    const r = (V("morphe_navigation_bar_glass_round") ? .5 : .3) * h;
    // GlassCapsuleDrawable, dark style: fill = the app background lifted 14% toward white at 0.5 x opacity/50, a soft
    // white sheen at the top, a rim lit from outside (top 30%, ends 50%, bottom 6%) with a dark line inside it,
    // a faint shadow; the app's own blurred background shows through (translucent bar, Android 14+)
    const alpha = Math.min(1, .5 * num("opacity", 20) / 50);
    bar.classList.add("glassnav");
    bar.setAttribute("style", `--gr:${r}px;--gbw:${bw}px;width:${shown * bw}px;height:${h}px;border-radius:${r}px;background:linear-gradient(rgba(255,255,255,.10), rgba(255,255,255,0) 55%) rgba(49,49,49,${alpha.toFixed(3)});backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);border:1.5px solid rgba(255,255,255,.12);border-top-color:rgba(255,255,255,.3);border-bottom-color:rgba(255,255,255,.06);box-shadow:inset 0 0 0 .5px rgba(0,0,0,.35),inset 1px 0 0 rgba(255,255,255,.2),inset -1px 0 0 rgba(255,255,255,.2),0 2px 10px rgba(0,0,0,.1)`);
    return bar.outerHTML;
  };
}
def("nav", "style", "navigation_bar_glass navigation_bar_glass_opacity navigation_bar_glass_height navigation_bar_glass_round navigation_bar_glass_width navigation_bar_glass_button_spacing");
scen("nav", "disable_auto_hide_navigation_bar", (box, on) => {
  situation("Scrolling the home feed");
  box.innerHTML = device("port", `<div class="feedscroll" style="position:absolute;left:0;right:0;top:0;transition:transform 1s var(--ease)">${[0, 1, 2, 3, 4].map(i => `<div style="height:46px;margin:6px;background:${ART[i]};border-radius:4px"></div>`).join("")}</div>${nav7().replace('<div style="', '<div class="nb" style="transition:transform .35s var(--ease);')}`); // the bar shows its tab icons (Max, Nov 20)
  at(300, () => { box.querySelector(".feedscroll").style.transform = "translateY(-90px)"; if (!on) box.querySelector(".nb").style.transform = "translateY(100%)"; });
  return on ? "The navigation bar stays while scrolling" : "The navigation bar slides away while scrolling";
});
scen("nav", "navigation_bar_animations", (box, on) => {
  situation("Switching tabs");
  box.innerHTML = device("port", `<div class="pg" style="position:absolute;inset:0 0 16px 0;background:${ART[1]};transition:${on ? "opacity .4s, transform .4s" : "none"}"></div>${nav7()}`); // the bar shows its tab icons (Max, Nov 20)
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), pg = box.querySelector(".pg"); const W = dev.clientWidth, H = dev.clientHeight;
  at(150, () => fingerTo(f, W * .3, H - 8)); // onto the Shorts tab at(400, () => tapF(f));
  at(450, () => { if (on) { pg.style.opacity = "0"; pg.style.transform = "translateX(-12px)"; later(() => { pg.style.transition = "none"; pg.style.background = ART[5]; pg.style.transform = "translateX(12px)"; void pg.offsetWidth; pg.style.transition = "opacity .4s, transform .4s"; pg.style.opacity = "1"; pg.style.transform = "none"; }, 400); } else pg.style.background = ART[5]; });
  return on ? "The new tab slides and fades in" : "The new tab appears instantly";
});

// ------------------------------------------------------------------ miniplayer gestures (scenarios)
const miniDev = () => `${playerArea(3)}<div class="mp2" style="position:absolute;right:6px;bottom:20px;width:40px;height:23px;border-radius:4px;background:${ART[0]};box-shadow:0 2px 6px #000;transition:all .55s var(--ease)"></div><div style="position:absolute;left:0;right:0;bottom:0;height:14px;background:#0f0f0f;border-top:1px solid #333"></div>`;
scen("miniplayer", "miniplayer_disable_drag_and_drop", (box, disabled) => {
  situation("Dragging the miniplayer");
  box.innerHTML = device("port", miniDev());
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), m = box.querySelector(".mp2"); const W = dev.clientWidth, H = dev.clientHeight;
  at(150, () => { fingerTo(f, W - 26, H - 31); f.classList.add("hold"); });
  at(500, () => { fingerTo(f, 26, H * .45, 700); if (!disabled) { m.style.right = (W - 46) + "px"; m.style.bottom = (H * .55 - 11) + "px"; } });
  at(1300, () => { f.classList.remove("hold"); if (disabled) dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:20%">Stays put</div>`); });
  return disabled ? "The miniplayer stays in its corner" : "Drag it to any corner";
});
scen("miniplayer", "miniplayer_disable_horizontal_drag", (box, disabled) => {
  situation("Flinging the miniplayer sideways");
  box.innerHTML = device("port", miniDev());
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), m = box.querySelector(".mp2"); const W = dev.clientWidth, H = dev.clientHeight;
  at(150, () => fingerTo(f, W - 26, H - 31)); at(400, () => { fingerTo(f, W + 10, H - 31, 400); if (!disabled) { m.style.right = "-60px"; m.style.opacity = "0"; } });
  at(1000, () => { if (disabled) dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:20%">Stays open</div>`); else dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:20%">Closed</div>`); });
  return disabled ? "A sideways fling does not close it" : "A sideways fling closes it (stock)";
});
// Dragging the miniplayer off the side tucks it into a thin tab at the edge (YouTube's horizontal drag).
// The two settings below change what happens then: whether the video keeps playing, and whether the tab
// stays tucked when you move on. The miniplayer shows its own pause / play mark and progress line.
const miniTuck = (box, situationText) => {
  situation(situationText);
  box.innerHTML = device("port", miniDev());
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), m = box.querySelector(".mp2"); const W = dev.clientWidth, H = dev.clientHeight;
  m.style.overflow = "hidden";
  m.innerHTML = `<span class="mpi chg7" style="position:absolute;left:50%;top:50%;translate:-50% -50%;transition:left .55s var(--ease),translate .55s var(--ease);display:grid;place-items:center;width:11px;height:11px;border-radius:50%;background:rgba(0,0,0,.5)">${ico7("pause", 7)}</span><div class="mpp" style="position:absolute;left:0;bottom:0;height:1.5px;width:22%;background:#f03"></div>`;
  const prog = m.querySelector(".mpp");
  requestAnimationFrame(() => { prog.style.transition = `width ${9000 * scStretch}ms linear`; prog.style.width = "100%"; }); // playing
  const pause = () => { prog.style.width = getComputedStyle(prog).width; prog.style.transition = "none"; m.querySelector(".mpi").innerHTML = ico7("play", 7); };
  at(150, () => { fingerTo(f, W - 26, H - 31); f.classList.add("hold"); });
  // tucked: a strip stays at the edge, its pause / play mark moved onto the strip so the state still shows
  const mark = m.querySelector(".mpi");
  at(450, () => { fingerTo(f, W + 8, H - 31, 450); m.style.right = "-25px"; mark.style.left = "2.5px"; mark.style.translate = "0 -50%"; });
  at(950, () => f.classList.remove("hold", "show"));
  return { dev, f, m, W, H, pause, back: () => { m.style.right = "6px"; mark.style.left = "50%"; mark.style.translate = "-50% -50%"; } };
};
scen("miniplayer", "miniplayer_disable_horizontal_drag_playback", (box, on) => {
  const t = miniTuck(box, "Dragging the miniplayer off the side");
  at(1000, () => { if (on) { t.pause(); toast7(t.dev, `${ico7("pause", 7)} Paused`, "30%"); } else toast7(t.dev, `${ico7("play", 7)} Still playing`, "30%"); });
  return on ? "Tucked away at the edge, the video pauses" : "Tucked away at the edge, the video keeps playing (stock)";
});
scen("miniplayer", "miniplayer_disable_horizontal_reposition", (box, on) => {
  const t = miniTuck(box, "Tucking the miniplayer away, then opening another page");
  at(1250, () => { fingerTo(t.f, t.W * .5, t.H * .17); }); // onto the video: another page opens
  at(1650, () => tapF(t.f));
  at(1850, () => { t.f.classList.remove("show"); const v = t.dev.querySelector(".dv-video"); if (v) v.style.background = ART[5]; if (!on) t.back(); toast7(t.dev, on ? "Stays tucked at the edge" : "Back in its corner", "30%"); });
  return on ? "It stays tucked away while you move around" : "It pops back out to its corner (stock)";
});
scen("miniplayer", "miniplayer_swipe_up_expand", (box, on) => {
  situation("Swiping the miniplayer up");
  box.innerHTML = device("port", miniDev());
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), m = box.querySelector(".mp2"); const W = dev.clientWidth, H = dev.clientHeight;
  at(150, () => fingerTo(f, W - 26, H - 31)); at(400, () => fingerTo(f, W - 26, H * .3, 500));
  at(800, () => { if (on) { m.style.right = "0"; m.style.bottom = (H * .66) + "px"; m.style.width = W + "px"; m.style.height = (H * .34) + "px"; m.style.borderRadius = "0"; } else { m.style.bottom = (H - 40) + "px"; } });
  return on ? "Swipe up opens the full player" : "Swipe up moves the miniplayer to the top";
});

// ------------------------------------------------------------------ player: rolling numbers, exit fullscreen
scen("watch", "disable_rolling_number_animations", (box, disabled) => {
  situation("You tap Like");
  box.innerHTML = device("port", `${playerArea(0)}<div style="position:absolute;left:6px;top:42%;display:flex;gap:4px;align-items:center;font-size:10px;background:#272727;border-radius:9px;padding:2px 7px">👍 <span class="rn" style="display:inline-block;overflow:hidden;height:13px;line-height:13px"><span class="rni" style="display:block;transition:transform .5s var(--ease)">48,201<br>48,202</span></span></div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), rni = box.querySelector(".rni"); const H = dev.clientHeight;
  at(150, () => fingerTo(f, 14, H * .42 + 7)); at(450, () => tapF(f));
  at(550, () => { if (disabled) { rni.style.transition = "none"; } rni.style.transform = "translateY(-13px)"; });
  return disabled ? "The count changes instantly" : "The count rolls to the new number";
});

// ------------------------------------------------------------------ Ads, App look, Snackbar, Playback, DeArrow
SECTIONS.push(
  { id: "ads", icon: "dollar", title: "Ads", scopes: [["ADS", null]] },
  { id: "look", icon: "palette", title: "App look", scopes: [["GENERAL", null], ["GENERAL", "morphe_custom_filter_screen"], ["GENERAL", "morphe_series_tracker_screen"]] },
  { id: "snackbar", icon: "chat", title: "Snackbar", scopes: [["GENERAL", "morphe_snackbar_screen"]] },
  // Morphe's Video screen and its Player screen, kept apart so each tab fits on its group card
  { id: "playback", icon: "speed", title: "Video & audio", scopes: [["VIDEO", null], ["VIDEO", "morphe_vot_screen"]] },
  { id: "behaviour", icon: "loop", title: "Behaviour", scopes: [["PLAYER", null], ["PLAYER", "morphe_loop_count_screen"], ["PLAYER", "morphe_external_downloader_screen"]] },
  { id: "dearrow", icon: "eye", title: "DeArrow", scopes: [["DEARROW", null]] },
);
SECTIONS.find(s => s.id === "watch").scopes.push(["RETURN_YOUTUBE_DISLIKE", null]);
SECTIONS.find(s => s.id === "feed").scopes.push(["FEED", "morphe_post_buttons_screen"], ["FEED", "morphe_hide_aislist_screen"], ["FEED", "morphe_hide_keyword_content_screen"]);

SCENES.ads = () => {
  const card = (k, inner, o = {}) => C(k, inner, { blk: 1, ...o });
  return `<div class="inner-scroll" style="background:#0f0f0f;max-height:350px;overflow-y:auto">
    <div style="position:relative;height:118px;background:${ART[1]}">
      ${C("hide_video_ads", `<div style="position:absolute;inset:0;background:${ART[5]};display:flex;align-items:flex-end;justify-content:space-between;padding:8px"><span style="font-size:11px;background:#ffcc00;color:#000;font-weight:700;padding:1px 5px;border-radius:3px">Ad · 0:05</span><span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.7)">Skip ▸|</span></div>`, { style: "position:absolute;inset:0" })}
      ${C("hide_paid_promotion_labels", `<span style="font-size:11px;background:rgba(0,0,0,.7);padding:2px 6px;border-radius:3px">Includes paid promotion</span>`, { style: "position:absolute;left:8px;top:8px" })}
      ${C("hide_player_popup_ads", `<div style="display:flex;gap:6px;align-items:center;background:#fff;color:#000;border-radius:8px;padding:4px 8px 4px 4px;font-size:11px"><div style="width:26px;height:26px;border-radius:5px;background:${ART[7]}"></div><div><b>Pocket Planner</b><div style="color:#555">Install · Free</div></div></div>`, { style: "position:absolute;right:8px;top:8px" })}
      <div class="seek" style="bottom:0;left:0;right:0;border-radius:0"><div class="played" style="width:22%"></div></div>
    </div>
    <div style="padding:10px 12px 4px"><div class="t1" style="font-size:15px">${esc(VIDEOS[1].t)}</div><div class="t2">${VIDEOS[1].c} · ${VIDEOS[1].v}</div></div>
    ${card("hide_merchandise_banners", `<div style="margin:6px 12px;padding:10px;border-radius:12px;background:#272727;display:flex;gap:10px;align-items:center">${I("shop")}<div><div class="t1" style="font-size:13px">Switch Lab merch</div><div class="t2">Keycap set · €29</div></div></div>`)}
    ${card("hide_creator_store_shelf", `<div style="padding:6px 12px"><div class="t1" style="font-size:13px;margin-bottom:6px">Store</div><div style="display:flex;gap:8px">${[2, 3, 4].map(i => `<div style="width:90px"><div style="aspect-ratio:1;border-radius:8px;background:${ART[i]}"></div><div class="t2" style="font-size:11px;margin-top:3px">€${12 + i * 5}</div></div>`).join("")}</div></div>`)}
    ${card("hide_shopping_links", `<div style="margin:6px 12px;font-size:12.5px;color:#3ea6ff">${I("link", "ico", 'style="width:14px;height:14px;fill:#3ea6ff;vertical-align:-2px"')} Products in this video · 3 links</div>`)}
    ${card("hide_youtube_premium_promotions", `<div style="margin:8px 12px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,#3a0d12,#1d1d1d)"><div class="t1" style="font-size:13px">Try YouTube Premium</div><div class="t2">Ad-free, background play, downloads</div></div>`)}
    ${card("hide_self_sponsor_ads", `<div style="margin:8px 12px;padding:10px 12px;border-radius:12px;border:1px solid #333"><div class="t2" style="font-size:11px">Sponsored by the creator</div><div class="t1" style="font-size:13px">Get 20% off at switchlab.shop</div></div>`)}
    ${card("hide_general_ads", `<div style="margin:8px 12px 12px;border-radius:12px;overflow:hidden;background:#1c1c1c">${thumb(6, "border-radius:0")}<div style="display:flex;gap:8px;padding:8px 10px;align-items:center"><span style="font-size:10.5px;background:#ffcc00;color:#000;font-weight:700;padding:0 4px;border-radius:3px">Sponsored</span><div class="t1" style="font-size:13px;flex:1">Learn to code in 30 days</div><span class="chip" style="height:26px;background:#3ea6ff;color:#000;font-size:11.5px">Sign up</span></div></div>`)}
  </div>`;
};
def("ads", "vis", "hide_video_ads hide_paid_promotion_labels hide_player_popup_ads hide_merchandise_banners hide_creator_store_shelf hide_shopping_links hide_youtube_premium_promotions hide_self_sponsor_ads hide_general_ads");

// A full Android status bar: clock and notification icons left, system icons right
function statusBar() {
  const sv = (d, w = 13) => `<svg viewBox="0 0 24 24" style="width:${w}px;height:${w}px;fill:#e8e8e8;flex:none"><path d="${d}"/></svg>`;
  const left = [P.play, "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z", P.chat, P.dl].map(d => sv(d, 11)).join("");
  const wifi = "M12 21l3.6-4.8A6 6 0 0 0 12 15a6 6 0 0 0-3.6 1.2L12 21zm0-18C7.95 3 4.21 4.34 1.2 6.6L3 9c2.5-1.88 5.62-3 9-3s6.5 1.12 9 3l1.8-2.4C19.79 4.34 16.05 3 12 3zm0 6c-2.7 0-5.19.89-7.2 2.4L6.6 13.8A8.97 8.97 0 0 1 12 12c2.02 0 3.88.67 5.4 1.8l1.8-2.4C17.19 9.89 14.7 9 12 9z";
  const sig = "M2 22h20V2L2 22z", alarm = "M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39 6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm1 9.41V8h-2v6.41l4.29 4.3 1.41-1.42L13 13.41z";
  const bat = `<span style="display:inline-flex;align-items:center;gap:2px;font-size:10px">78%<span style="width:18px;height:9px;border:1.3px solid #e8e8e8;border-radius:2.5px;padding:1px;display:inline-block;position:relative"><i style="display:block;height:100%;width:78%;background:#e8e8e8;border-radius:1px"></i></span></span>`;
  return `<div style="height:22px;display:flex;align-items:center;gap:5px;padding:0 12px;font-size:11.5px;color:#e8e8e8"><b style="font-weight:500;margin-right:3px">9:41</b>${left}<span style="flex:1"></span>${sv(alarm, 11)}${sv(wifi)}${sv(sig, 11)}<span style="font-size:9.5px;font-weight:600">5G</span>${bat}</div>`;
}
const THEME_DARK = { APP_DEFAULT: "#0f0f0f", PURE_BLACK: "#000000", MATERIAL_YOU_PURE_BLACK: "#000000", MATERIAL_YOU_NEUTRAL: "#1b1b1f", MATERIAL_YOU_PRIMARY: "#1a2433", MATERIAL_YOU_SECONDARY: "#22262e", MATERIAL_YOU_TERTIARY: "#2a2230", CATPPUCCIN_MOCHA: "#181825",
  // the rest are the exact colours in Morphe's theme patch (BaseThemePatch THEME_COLORS_DARK)
  CLASSIC_YOUTUBE: "#212121", DARK_PINK: "#290025", DARK_BLUE: "#001029", DARK_GREEN: "#002905", DARK_YELLOW: "#282900", DARK_ORANGE: "#291800", DARK_RED: "#290000" };
SCENES.look = () => {
  const t = V("morphe_theme_color_dark");
  const bg = t === "CUSTOM" ? String(V("morphe_theme_color_dark_custom") || "#0f0f0f").replace(/^#(..)(......)$/, "#$2") : (THEME_DARK[t] || "#0f0f0f");
  const font = V("morphe_custom_font_type") === "SYSTEM" ? "system-ui, sans-serif" : V("morphe_custom_font_type") === "CUSTOM" ? "Georgia, serif" : "inherit";
  const wide = V("morphe_searchbar_type") === "EXTRA_WIDE";
  const grad = !!V("morphe_gradient_loading_screen");
  return `<div style="background:${bg};height:330px;position:relative;overflow:hidden;font-family:${font};transition:background .3s">
    ${C("hide_status_bar", statusBar(), { blk: 1 })}
    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px 6px 12px">
      ${wide ? "" : `<div style="width:24px;height:17px;border-radius:5px;background:#ff0033"></div><b style="font-size:16px;letter-spacing:-.4px">YouTube</b><div style="flex:1"></div>`}
      ${C("searchbar_type", wide ? `<div style="flex:1;display:flex;align-items:center;gap:8px;height:34px;border-radius:17px;background:rgba(255,255,255,.1);padding:0 12px;color:#aaa;font-size:13px;min-width:250px">${I("search", "ico", 'style="width:18px;height:18px;fill:#aaa"')}Search YouTube</div>` : `<div class="pbtn">${I("search")}</div>`, { style: wide ? "flex:1" : "" })}
      <div class="pbtn">${I("bell")}</div>
    </div>
    ${C("gradient_loading_screen", `<div style="margin:6px 12px;height:110px;border-radius:12px;background:${grad ? "linear-gradient(110deg,#222 30%,#3a3a3a 50%,#222 70%) 0 0/300% 100%;animation:shimmer 1.4s linear infinite" : "#272727"}"></div>
      <div style="margin:8px 12px;height:12px;width:70%;border-radius:6px;background:#272727"></div><div style="margin:6px 12px;height:12px;width:45%;border-radius:6px;background:#272727"></div>`, { blk: 1 })}
    <div style="display:flex;gap:10px;padding:10px 12px">${av(2, 32)}<div><div class="t1">${esc(VIDEOS[2].t)}</div><div class="t2">${VIDEOS[2].c} · ${VIDEOS[2].v}</div></div></div>
    <style>@keyframes shimmer{to{background-position:-300% 0}}</style>
  </div>`;
};
def("look", "vis", "hide_status_bar");
def("look", "style", "theme_color_dark theme_color_dark_custom custom_font_type searchbar_type gradient_loading_screen");

SCENES.snackbar = () => {
  const custom = !!V("morphe_custom_snackbar_theme");
  const bg = custom ? String(V("morphe_custom_snackbar_color_dark") || "#212121") : "#212121";
  const r = custom ? Number(V("morphe_custom_snackbar_corner_radius")) || 0 : 8;
  const stroke = custom ? String(V("morphe_custom_snackbar_stroke_color") || "#00000000") : "#00000000";
  const hex8 = h => { const m = /^#(..)(......)$/.exec(h); return m ? `#${m[2]}${m[1]}` : h; };
  return `<div style="background:#0f0f0f;height:300px;position:relative;overflow:hidden">
    ${thumb(0, "border-radius:0")}
    <div style="display:flex;gap:10px;padding:10px 12px">${av(0, 32)}<div><div class="t1">${esc(VIDEOS[0].t)}</div><div class="t2">${VIDEOS[0].c}</div></div></div>
    ${C("hide_snackbar", `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:${hex8(bg)};border-radius:${r}px;border:1px solid ${hex8(stroke)};box-shadow:0 4px 12px rgba(0,0,0,.5);font-size:13px">Saved to Watch later<span style="margin-left:auto;color:#3ea6ff;font-weight:500">Change</span></div>`, { style: "position:absolute;left:12px;right:12px;bottom:14px", also: "custom_snackbar_theme" })}
  </div>`;
};
def("snackbar", "vis", "hide_snackbar");
def("snackbar", "style", "custom_snackbar_theme custom_snackbar_color_dark custom_snackbar_corner_radius custom_snackbar_stroke_color");


// ------------------------------------------------------------------ section order with the new ones
{
  const order = ["player", "endscreen", "seekbar", "fullscreen", "flyout", "captions", "sponsorblock", "playback", "behaviour", "watch", "description", "ambient", "comments", "danmaku", "miniplayer", "feed", "channel", "explore", "shorts", "nav", "ads", "look", "snackbar", "dearrow", "misc"];
  const all = [...SECTIONS]; SECTIONS.length = 0;
  order.forEach(id => { const s = all.find(x => x.id === id); if (s) SECTIONS.push(s); });
}

// Every scenario plays for SC_TOTAL as an Off / On comparison, whatever the setting is set to now.
// A short story is slowed down (up to 1.6x) and played again if there is time; a list setting
// compares its default with the chosen value (or the first other value when it is on the default).
const SC_TOTAL = 11000;
// The white line under the phones is a scenario's return value or setFoot. It is hidden when the story
// is told by a message inside the phones (toldInside) and for every key in FOOT_OFF: the one list of
// lines taken out as redundant. tools/captions.js writes every line each comparison renders (blue line,
// white lines per side, messages in the phones) with the ones that look like repeats flagged, so a
// redundant line is found from that list and its key added here, instead of a blanket rule.
const FOOT_OFF = new Set([
  "morphe_fullscreen_video_scale_button_fullscreen_only", // the button is there or not, in each turn of the phone: drawn (Max, round 139: no white sentences)
  "morphe_auto_translate_additional_languages", // "More languages in the auto-translate list": the list is drawn
  "morphe_open_channel_of_live_avatar", // "The avatar opens the channel": the channel page opens in the phone
  "morphe_shorts_player_type", // "Opens in the Shorts player": the Off / On labels say it
  "morphe_custom_filter", // "No custom filter": the labels and the drawing say it
  "morphe_swipe_haptic_feedback", // the buzz icon on each phone says it (Max, Nov 20)
  "morphe_navigation_bar_animations", // the tab change is drawn (Max, Nov 20)
  "morphe_seek_notification_media_prev_next", // the buttons and their -10 s / +10 s say it (Max, Nov 20)
  "morphe_show_menu_icons", // the icons are drawn (Max, Nov 20)
  "morphe_continue_watching_prompt", // the prompt, the countdown and the phone's own message say it (Max, Nov 20)
  "morphe_disable_auto_hide_navigation_bar", // the bar staying or sliding away is drawn (Max, Nov 20)
  "morphe_disable_player_popup_panels", // the panels jumping open or waiting, and the phones' messages, say it (Max, Nov 23)
  "morphe_download_force_4k", "morphe_sb_auto_hide_skip_button", "morphe_disable_fullscreen_ambient_mode", // the phones say it (Max, Nov 23 PM)
  "morphe_minimal_comments_button", "morphe_sanitize_comments_highlighted_search_links", // the button and the link are drawn: no white lines, the phones get the room (Max, Nov 24)
]);
let askOnly = false; // drawing only the default side while the other waits for a choice
const SCN_NO_FLASH = new Set(["morphe_disable_drc_audio", "morphe_post_buttons_layout"]); // its differences are the whole text card: no blue flash (Max, Nov 23)
const SCN_SELF_DUO = new Set(["morphe_disable_player_popup_panels", "morphe_playback_buffer_size", "morphe_skip_silence_minimum_pause", "morphe_hide_account_menu_filter_strings", "morphe_hide_comments_carousel_filter_strings"]); // one phone that tells all values itself (a text: what it holds now)
const DUO_OTHER = { morphe_speed_tap_and_hold: 4, morphe_quick_actions_top_margin: 24, morphe_niconico_comments_max_length: 30 };
const DUO_UNIT = { morphe_quick_actions_top_margin: " dp", morphe_niconico_comments_max_length: " characters" }; // the slider's unit on its Off / On labels
// Short words beside the phones where Morphe's option names don't read as a contrast on their own
// ("Default" next to "Disabled, always show the autoplay countdown"; Max, Nov 20). Only the comparison
// labels change; the list keeps Morphe's names.
const DUO_LABEL = {
  morphe_continue_watching_prompt: { DEFAULT: "Asks to continue", DISABLED: "Never asks", ALWAYS_COUNTDOWN: "Countdown only" },
  morphe_niconico_comments_max_length: { 100: "No limit" }, // Settings.NICONICO_COMMENTS_MAX_LENGTH_NO_LIMIT
};
function duoValues(k, prev) {
  const p = PREF[k];
  // an on/off setting is compared under the same words, on the same sides, as its card's toggle
  // (Hide | Show for "Hide X" in the clean design: Hide on the left drawing it hidden), never Off | On
  // with the sides swapped
  if (p.type === "boolean") {
    const c = design === "clean" && cleanOf(k);
    if (!c) return [[false, "Off"], [true, "On"]];
    const [l0, l1] = c.labels; return NEG_WORD.has(l0) ? [[false, l0], [true, l1]] : [[true, l1], [false, l0]];
  }
  const ents = entriesFor(k), lab = v => DUO_LABEL[k]?.[v] || ents.find(e => sameVal(e.value, v))?.label || String(v) + (DUO_UNIT[k] || (/speed/.test(k) ? "×" : ""));
  const d = defaults[k], cur = V(k);
  // a clearer contrast than the next step up for a few settings (2x vs 4x speed)
  if (DUO_OTHER[k] !== undefined && sameVal(cur, d) && (prev === undefined || sameVal(prev, d))) return [[d, lab(d)], [DUO_OTHER[k], lab(DUO_OTHER[k])]];
  const other = ents.length ? ents.find(e => !sameVal(e.value, d))?.value : typeof d === "number" ? Math.round(d * 150) / 100 : undefined;
  const r = !sameVal(cur, d) ? cur : prev !== undefined && !sameVal(prev, d) ? prev : (other ?? cur);
  return [[d, lab(d)], [r, lab(r)]];
}
// A slider whose setting has a comparison redraws it while it moves (Max, Nov 25: Quick actions top margin
// didn't follow the slider; neither did any other slider with a comparison, not even on release). One redraw a
// frame; scLive tells a story it is being redrawn for a slider step, so it can skip its opening motion.
let scLive = false, liveRaf = 0;
// A slider's picture that follows the finger: where its moving part is drawn at this moment, so the next
// value glides on from there (not from the last value it was heading to) and a fast drag reads as one
// smooth movement (Max, Nov 25: dragging Quick actions top margin cut from the 24 dp example, then glided
// in steps). Returns [from, to] while the slider moves, undefined otherwise.
const liveGlides = {}, LIVE_GLIDE_MS = 260, liveEase = t => 1 - (1 - t) ** 3; // matches LIVE_GLIDE_EASE
const LIVE_GLIDE_EASE = "cubic-bezier(.33,1,.68,1)";
function liveGlide(k, v) {
  const id = k + "|" + (scSide ? scSide.i : 0), g = liveGlides[id], now = performance.now();
  const at = g ? g.from + (g.to - g.from) * liveEase(Math.min(1, (now - g.t0) / LIVE_GLIDE_MS)) : v;
  liveGlides[id] = { from: scLive ? at : v, to: v, t0: now };
  return scLive && g ? [at, v] : undefined;
}
function liveScenario(k, before) {
  cancelAnimationFrame(liveRaf);
  liveRaf = requestAnimationFrame(() => { liveRaf = 0; if (selected !== k || !SCN[k]) return; scLive = true; try { playScenario(k, before === undefined || sameVal(before, V(k)) ? undefined : before); } finally { scLive = false; } });
}
function playScenario(k, prevValue) {
  const fn = SCN[k]; if (!fn) return;
  if (!hintOk(k, V(k), prevValue === undefined ? V(k) : prevValue, ...duoValues(k, prevValue).map(s => s[0]))) return; // a value without a story: shown plainly (core.js)
  clock.start("scenario"); clock.stop("steps");
  const canvas = $("canvas"); const stick = $("stick");
  // a tab with no preview opens the preview area for the comparison; stopping it closes the area again
  // (the comparison loops now, so there is no end of story to do it)
  if (!scClose && (stick.hidden || stick.classList.contains("noscene"))) {
    stick.hidden = false; stick.classList.remove("noscene"); $("stage").innerHTML = `<div style="height:320px"></div>`;
    scClose = () => { if (!SCENES[section]) { stick.hidden = !grouped; stick.classList.add("noscene"); $("stage").innerHTML = ""; } };
  }
  // the comparison draws inside the preview as it is: the preview area never grows for it
  canvas.innerHTML = `<div class="cap"><b>${esc(shownTitle(k))}</b></div><div class="sit"></div><div class="scbox" style="display:grid;place-items:center"></div><div class="foot"></div><div class="prog"></div>`;
  canvas.classList.add("show");
  const box = canvas.querySelector(".scbox"), self = SCN_SELF_DUO.has(k);
  // no title line in any comparison, the phones get that height (the selected card already names it);
  // the ones that draw both sides in one picture (SCN_SELF_DUO) used to keep it: a white title over
  // the phones that no other comparison has (Player popup panels, Max, Nov 23)
  canvas.querySelector(".cap").remove();
  canvas.classList.add("nocap");
  const L = SCN_HOLD[k] || SC_HOLD, runs = self ? 1 : Math.max(1, Math.floor(SC_TOTAL / (L * 1.45)));
  const slot = SC_TOTAL / runs, stretch = Math.max(1, Math.min(1.6, (slot - 400) / L));
  let vals = duoValues(k, prevValue);
  // A list setting with several choices, opened on its default (tapping the card or its value):
  // instead of guessing which choice to compare, the right side asks. The story starts once one
  // is picked. Picking a choice in the list itself compares straight away.
  const d = defaults[k], choices = entriesFor(k).filter(e => !sameVal(e.value, d));
  const ask = !self && PREF[k].type !== "boolean" && choices.length > 1 && sameVal(V(k), d) && (prevValue === undefined || sameVal(prevValue, d));
  const draw = () => {
    clock.start("steps"); scKey = k; scPlaying = k + "=" + JSON.stringify(vals) + (askOnly ? "?" : ""); scStretch = stretch; scTold = toldInside(fn) || FOOT_OFF.has(k); scTurns = turnsPhone(fn) || SCN_TURNS.has(k); scCollect = [];
    scDrawing = true;
    let failed = null;
    try { drawSides(); } catch (err) { failed = err; } finally { scDrawing = false; scKey = null; const list = scCollect; scCollect = null; if (!failed) startCollected(list); }
    if (failed) { hintFailed(k, failed); stopScenario(); return; } // the story broke on this build's data: the comparison closes, the editor goes on
    fitDev();
    if (!self && !SCN_NO_FLASH.has(k)) diffFlash(box);
  };
  // The waiting side, drawn with the pair (before it is laid out, so the pair is laid out once with it:
  // Nov 24, Max's second report: it was added after, and the layout picked without it, labels beside
  // the phones, stayed for the whole wait). The request sits in an outline the shape of the default
  // side's phone, a faded half phone too when that one is (CROP7), not as a label beside it.
  const askSide = cell => {
    // its label keeps its room, unseen, so the outline sits level with the phone beside it
    cell.querySelector("span").style.visibility = "hidden";
    const dev = box.querySelector(".dl7 .dev"), c = cropOf(dev), dw = dev ? dev.style.width : "92px", dh = dev ? dev.style.height : "172px";
    cell.querySelector(".side").innerHTML = `<div class="ask7${c ? " ask" + c + "7" : ""}" style="width:${dw};height:${c ? `calc(${dh} - ${CROP_CUT}px)` : dh}"><span>Select an option</span></div>`;
  };
  const drawSides = () => {
    if (self) {
      const foot = fn(box, V(k), prevValue);
      if (foot && !scTold) canvas.querySelector(".foot").textContent = foot;
    } else {
      box.innerHTML = `<div class="duo7 gen">${vals.map(([, l], i) => `<div class="dl7"><span class="${NEG_WORD.has(String(l)) ? "neg" : i ? "on" : ""} ${String(l).length > 14 ? "xlong" : String(l).length > 8 ? "long" : ""}">${esc(l)}</span><div class="side"></div><div class="sf7"></div></div>`).join("")}</div>`;
      box.querySelectorAll(".dl7").forEach((cell, i) => {
        if (i && askOnly) return askSide(cell); // waiting for a choice: an outline instead of the right phone (see below)
        const side = { i, foot: cell.querySelector(".sf7") };
        scSide = side;
        try { const ft = fn(cell.querySelector(".side"), vals[i][0], vals[1 - i][0]); if (ft && !scTold && !side.foot.textContent) side.foot.textContent = ft; }
        finally { scSide = null; }
      });
    }
  };
  // The comparison plays over and over while its setting stays selected (Max, Nov 20); selecting
  // another setting or leaving the tab stops it (stopScenario). The progress line shows each round.
  const round = (first) => {
    if (!first) draw();
    for (let r = 1; r < runs; r++) clock.after("scenario", (first ? SC_FADE : 0) + r * slot, draw);
    canvas.querySelector(".prog").animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: SC_TOTAL, delay: first ? SC_FADE : 0, fill: "forwards" });
    clock.after("scenario", (first ? SC_FADE : 0) + SC_TOTAL, () => round(false));
  };
  const start = () => { draw(); round(true); };
  if (!ask) return start();
  // the default side is drawn as its first frame and held; the other side waits, empty, until a
  // choice is picked on the setting's pills in the list (which plays the comparison)
  // the default side plays its whole story and stays on its last frame (it used to freeze on its first
  // frame, which cut the story short: the Shorts quality badge never appeared)
  // (it plays again and again too, while it waits)
  const askRound = () => {
    askOnly = true; try { draw(); } finally { askOnly = false; }
    clock.after("scenario", slot, askRound);
  };
  askRound();
  document.querySelectorAll(`#list [data-row="${k}"] .ctl .opt`).forEach(o => { o.classList.remove("nudge7"); void o.offsetWidth; o.classList.add("nudge7"); });
}
let scClose = null;
function stopScenario() {
  clock.stop("scenario"); clock.stop("steps"); $("canvas").classList.remove("show");
  if (scClose) { const c = scClose; scClose = null; c(); }
  if (stageStale) renderStage(); // the redraw skipped while the comparison covered the preview
}
