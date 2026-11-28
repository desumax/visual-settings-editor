"use strict";
// Selecting a setting (focus path), ghosts, toggling and navigating to a setting.

// ------------------------------------------------------------------ focus: select, scroll, flash
// The one path from "this setting is selected" to "you can see it". Every way of getting to a
// setting (a tap in the preview, a tap on its card, search, "Take me there") comes through here,
// and every step runs on the clock's "focus" track, so selecting something else cancels whatever
// is still queued for the previous setting:
//   1. open:    a sub-option whose parent is folded (or that is still locked) is shown first
//   2. reveal:  its preview element scrolls into view inside its feed or strip, then flashes
//   3. card:    its card scrolls to the middle of the list (after a tap in the preview, or on arrival)
//   4. parents: the settings that block it flash together with it
const fT = (fn, ms) => clock.after("focus", ms, fn);
// step 1: unfold the parent of a sub-option, or show a locked one for a moment; true when it had to
function openFor(k) {
  const par = PARENT_OF[k], hidden = !!par && !kidVisible(k);
  if (!par || !(hidden || collapsed.has(par))) return false;
  collapsed.delete(par);
  if (hidden) { peekKid = k; renderList(); }
  else { lastOpen.add(par); document.querySelector(`[data-kids-of="${par}"]`)?.classList.add("open"); document.querySelector(`[data-kidtoggle="${par}"]`)?.setAttribute("aria-expanded", "true"); }
  return true;
}
// selQuiet: the setting is already selected and only its value moved (a wheel coming to rest, the next
// press on the same wheel, a typed value): no green flash (Max, Nov 28: the part flashed at the end of
// every turn of a wheel; it flashes on the first press and when the card is pressed, not after each change)
let selQuiet = false;
function selectQuiet(k, from) { selQuiet = true; try { select(k, from); } finally { selQuiet = false; } }
function focusSetting(k, { from, arrive = false } = {}) {
  const par = PARENT_OF[k], hidden = !!par && !kidVisible(k);
  const bring = from === "stage" || arrive, opened = bring && openFor(k);
  const blocked = hidden || !parentsOk(k);
  if (arrive) quietFlashUntil = Date.now() + 700; // one synced flash on arrival instead of a first one mid-scroll
  highlight(k, !selQuiet, from !== "stage" && !selQuiet);
  if (selQuiet) return;
  if (bring) fT(() => scrollRowIntoView(k, true), opened ? 300 : 0);
  // arriving: the card, its element and its blockers flash together once everything is in place
  if (arrive) fT(() => blocked ? flashParents(k) : flashTarget(k), par ? 520 : 380);
  else if (from === "stage" && hidden) fT(() => flashParents(k), 700);
  else if (blocked) pointToParents(k);
}
function select(k, from, arrive = false) {
  const prevSel = selected;
  selected = k;
  clock.start("focus");
  const dropGhost = prevSel && prevSel !== k && ghosts.has(prevSel) ? prevSel : null, renders = renderCount;
  // A comparison that opens at once covers the preview: the preview is not redrawn under it for the
  // new selection (a sub-option of a player button drew that button in place, a sub-screen switched).
  // That redraw showed through the comparison as it faded in, a jump just as the card was tapped (Max,
  // round 142, "Show only in fullscreen": "an awkward hitch or pre-animation"), and cost a frame. The
  // preview catches up when the comparison closes (stopScenario).
  const covered = !!(SCN[k] && from);
  const redraw = () => { if (covered) stageStale = true; else renderStage(); };
  if (section === "flyout" && (FLY_SUB[k] || null) !== flySub) redraw();
  if (section === "player" && mode === "mod") {
    // the tray of 13 buttons only opens from its own pill; selecting a hidden one previews it in place
    if (trayOpen && from !== "stage") trayOpen = false;
    // a sub-option of an off button (Swap Save and Queue, Show resolution) previews that button too
    const cust = x => !!x && [x, PARENT_OF[x]].some(y => y && CUSTOM_KEYS.has(y));
    if (cust(k) || cust(prevSel)) redraw();
  }
  if (section === "endscreen" && (ENDSCREEN_SEL.has(k) || ENDSCREEN_SEL.has(prevSel))) redraw();
  if (section === "shorts" && (SHORTS_SHEET.has(k) || SHORTS_SHEET.has(prevSel))) redraw();
  if (section === "feed" && (k === "morphe_feed_card_layout" || prevSel === "morphe_feed_card_layout")) redraw();
  if (section === "captions" && (k === "morphe_secondary_caption_language" || prevSel === "morphe_secondary_caption_language")) redraw();
  if (section === "look" && LIGHT_LOOK.has(k) !== LIGHT_LOOK.has(prevSel)) redraw(); // the light theme page (scenarios.js)
  // a hidden setting stays revealed while it is selected; it collapses once you move to another one
  // (unless the new selection needs it, such as the hidden seekbar for Tap to seek)
  if (dropGhost && lentTo(k, dropGhost)) { ghosts.delete(dropGhost); stageEls(dropGhost).forEach(e => e.classList.remove("sel", "selx")); wakeRings(); }
  else if (dropGhost) { if (renders === renderCount) unghost(dropGhost); else { clearGhost(dropGhost); renderStage(); } }
  lend(prevSel, k);
  focusSetting(k, { from, arrive });
  renderInspector();
  if (from === "list" && mode === "mod" && A[k] && (A[k].kind === "vis" || A[k].kind === "overlay") && !shown(k) && document.querySelector(`#stage [data-k="${k}"]`)) ghost(k);
  // any move to another setting ends a running animation (also a change made through a value pill,
  // which selects without a "from"); stopped before a demo starts, as stopping may close the preview area
  if (!(SCN[k] && from) && k !== prevSel) stopScenario();
  if (DEMOS[k]) startDemo(k); else stopDemo();
  if (SCN[k] && from) playScenario(k);
  const a = A[k];
  const notApplicable = a && (a.kind === "vis" || a.kind === "overlay") && a.section === section && !CUSTOM_KEYS.has(k) && !document.querySelector(`#stage [data-k="${k}"], #stage [data-also~="${k}"]`);
  if (notApplicable && SCENES[section]) {
    const why = k === "morphe_hide_end_screen_suggested_video" ? "Appears only when autoplay is off. Set Autoplay mode to Off to see it."
      : k === "morphe_hide_autoplay_preview" ? "Appears only when autoplay is on."
      : /^morphe_miniplayer_/.test(k) ? "Not part of the current miniplayer type." : "Not shown in the current layout.";
    label(why, true, 2600, true);
  }
}
function pointToParents(k) {
  // wait for the element's own flash (it may first scroll into view), then flash everything together
  const onStage = document.querySelector(`#stage [data-k="${k}"], #stage [data-also~="${k}"]`);
  if (!onStage || selected !== k || (lastFlash.k === k && Date.now() - lastFlash.t < 200)) return flashParents(k);
  parentFlashFor = k;
  fT(() => { if (parentFlashFor === k) flashParents(k); }, 1500);
}
// elements a setting needs (NEEDS) show as ghosts while it is selected, and go again when it isn't
function lend(prev, k) {
  const was = (NEEDS[prev] || []).filter(x => !ghosts.has(x) && !fading.has(x)), now = (NEEDS[k] || []).filter(x => lentTo(k, x));
  was.filter(x => !now.includes(x)).forEach(x => stageEls(x).forEach(e => e.classList.remove("ghost")));
  now.forEach(x => stageEls(x).forEach(e => { if (!e.classList.contains("ghost")) { e.classList.add("ghost"); hugWidth(e); fitRing(e); } }));
}
const ghostTimers = new Map();
const stageEls = k => document.querySelectorAll(`#stage [data-k="${k}"]`);
function clearGhost(k) { (ghostTimers.get(k) || []).forEach(clearTimeout); ghostTimers.delete(k); ghosts.delete(k); fading.delete(k); stageEls(k).forEach(e => { e.classList.remove("leaving", "ghost-out"); e.getAnimations().forEach(a => a.cancel()); }); }
function ghost(k, grow = true) {
  // a part still folding away (you came back quickly) unfolds again from where it is, not from nothing
  // or at full size at once (Max, Nov 24: quick switching made the previews clip each other)
  const already = ghosts.has(k);
  stageEls(k).forEach(sizeSnap);
  clearGhost(k);
  ghosts.add(k);
  stageEls(k).forEach(e => { e.getAnimations().forEach(a => a.cancel()); e.classList.remove("ghost-out", "leaving"); e.classList.add("ghost"); hugWidth(e); if (grow && !already && !e.classList.contains("intray")) sizeAnim(e, true); });
}
function unghost(k) {
  (ghostTimers.get(k) || []).forEach(clearTimeout);
  ghosts.delete(k); fading.add(k);
  stageEls(k).forEach(e => { e.classList.remove("sel", "selx", "flash"); if (e.classList.contains("intray")) e.classList.add("ghost-out"); else { e.classList.add("leaving"); sizeAnim(e, false, 420); } }); wakeRings();
  const t2 = setTimeout(() => { fading.delete(k); ghostTimers.delete(k); stageEls(k).forEach(e => { e.classList.remove("ghost", "ghost-out", "leaving", "sizing", "sizew", "sizei"); e.getAnimations().forEach(a => a.cancel()); }); }, 440);
  ghostTimers.set(k, [t2]);
}

// Settings with a value (number, colour, text) can't flip on a hold: jump to their control instead.
function focusControl(k) {
  if (selected !== k) select(k);
  scrollRowIntoView(k);
  const row = document.querySelector(`[data-row="${k}"]`); if (!row) return;
  const ctl = row.querySelector("input,select,textarea,button.opt");
  row.classList.remove("nudge"); void row.offsetWidth; row.classList.add("nudge");
  if (ctl) setTimeout(() => ctl.focus({ preventScroll: true }), 250);
}
const canToggle = k => { const p = PREF[k]; return !!p && (OFF_LIST.has(k) || p.type === "boolean" || entriesFor(k).length > 0); };
function toggle(k) {
  const p = PREF[k];
  if (mode === "orig") setMode("mod");
  if (!parentsOk(k)) { tapFeel("lock"); pointToParents(k); snack(needText(k)); return; }
  const before = state[k];
  if (OFF_LIST.has(k)) { if (String(state[k]) === "off") setPref(k, offListPick[k] || entriesFor(k).find(e => e.value !== "off" && e.value !== "en").value); else { offListPick[k] = state[k]; setPref(k, "off"); } }
  else if (p.type === "boolean") setPref(k, !state[k]);
  else if (entriesFor(k).length && !p.entries) { const vals = entriesFor(k).map(e => e.value); const i = vals.findIndex(x => String(x) === String(state[k]) || Number(x) === Number(state[k])); setPref(k, coerce(k, vals[(i + 1) % vals.length])); }
  else if (p.entries && p.entries.length) { const vals = entriesFor(k).map(e => e.value); const i = vals.indexOf(String(state[k])); setPref(k, coerce(k, vals[(i + 1) % vals.length])); }
  else { focusControl(k); return; }
  const visual = A[k] && (A[k].kind === "vis" || A[k].kind === "overlay");
  const wasShown = visual ? (isHideKey(k) ? !before : !!before) : null;
  const wasGhost = ghosts.has(k) || fading.has(k);
  clearGhost(k);
  const nowShown = visual ? shown(k) : null;
  // a setting with a demo of its own doesn't fold its part away first: the demo shows it going, and the
  // fold made the demo start late and then start again when the preview was redrawn (the finger flickered)
  if (visual && wasShown && !nowShown && !DEMOS[k]) {
    // collapse the visible component first, then draw the new layout
    const els = [...stageEls(k)].filter(e => !e.classList.contains("intray") && e.offsetParent);
    if (els.length) {
      stageHold++;
      const done = () => { if (!stageHold) return; stageHold = 0; renderStage(); if (selected) highlight(selected); if (selected && DEMOS[selected]) startDemo(selected); };
      els.forEach(e => e.classList.remove("pressing", "charging"));
      // scroll the component into view first so you see it go
      const wait = revealInStage(els) ? 360 : 0; skipReveal = true;
      setTimeout(() => { els.forEach(e => sizeAnim(e, false)); setTimeout(done, SIZE_MS + 20); }, wait);
    }
  }
  afterChange(k, before);
  if (visual && !wasShown && nowShown) stageEls(k).forEach(e => { if (wasGhost || e.closest(".tray")) { e.classList.remove("reveal"); void e.offsetWidth; e.classList.add("reveal"); } else if (!DEMOS[k]) sizeAnim(e, true); }); // a part with a demo is brought in by the demo itself: unfolding it at the same time clipped it as the demo began (Seekbar thumbnails, round 139)
}
// Collapse or expand a component along the axis it takes space in.
const SIZE_MS = 280;
function axisOf(el) {
  const cs = getComputedStyle(el);
  if (cs.position === "absolute" || cs.position === "fixed") return "none";
  const ps = el.parentElement ? getComputedStyle(el.parentElement) : null;
  if (ps && ps.display.includes("flex") && !ps.flexDirection.startsWith("column")) return "w";
  if (ps && !ps.display.includes("flex") && !ps.display.includes("grid") && cs.display.startsWith("inline")) return "w";
  return "h";
}
// One size motion per part at a time. A new one starts from where the running one has the part now
// (sizeSnap reads that before anything cancels it), and only the latest motion may lift the clipping:
// an unfold that finished under a fold used to drop overflow:hidden, and the folding part's content
// painted over its neighbours (quick switching between Shorts settings, Max, Nov 24).
function sizeSnap(el) {
  const a = el._sizeA; if (!a || a.playState !== "running" || el._sizeFrom) return;
  const r = el.getBoundingClientRect(); el._sizeFrom = { w: r.width, h: r.height, o: +getComputedStyle(el).opacity };
}
// (The open size stays measured, not auto: many stage parts have a set height of their own, and an
// unfold to auto would end at their content's height and then jump to the set one.)
function sizeAnim(el, show, ms = SIZE_MS) {
  sizeSnap(el); const from = el._sizeFrom; el._sizeFrom = null;
  if (el._sizeA) { const p = el._sizeA; el._sizeA = null; p.cancel(); }
  const ax = axisOf(el), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  let full, zero;
  if (ax === "w") {
    // in a flex row the gap would stay behind and jump away at the end, so pull it in with a negative margin
    const gap = parseFloat(getComputedStyle(el.parentElement).columnGap) || 0;
    full = { width: r.width + "px", marginLeft: cs.marginLeft, marginRight: cs.marginRight, opacity: 1 }; zero = { width: "0px", marginLeft: "0px", marginRight: -gap + "px", opacity: 0 };
    el.classList.add("sizew");
    if (cs.display === "inline") el.classList.add("sizei");
  }
  // padding and a minimum height would keep a folding card from reaching zero, then it jumped shut at the end
  else if (ax === "h") { full = { height: r.height + "px", minHeight: "0px", marginTop: cs.marginTop, marginBottom: cs.marginBottom, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: 1 }; zero = { height: "0px", minHeight: "0px", marginTop: "0px", marginBottom: "0px", paddingTop: "0px", paddingBottom: "0px", borderTopWidth: "0px", opacity: 0 }; }
  else { full = { opacity: 1, transform: cs.transform === "none" ? "scale(1)" : cs.transform }; zero = { opacity: 0, transform: (cs.transform === "none" ? "" : cs.transform + " ") + "scale(.8)" }; }
  if (!r.width && !r.height && ax !== "none") return null;
  el.classList.add("sizing");
  let start = show ? zero : full;
  if (from && ax !== "none") { start = { ...start, opacity: from.o }; if (ax === "w") start.width = from.w + "px"; else start.height = from.h + "px"; }
  const a = el.animate([start, show ? full : zero], { duration: ms, easing: "cubic-bezier(.4,0,.2,1)", fill: show ? "none" : "forwards" });
  el._sizeA = a;
  // a collapsed element keeps overflow:hidden until it is hidden for good, otherwise its content
  // would paint at full size for a frame between the end of the animation and display:none
  if (show) a.onfinish = a.oncancel = () => { if (el._sizeA !== a && el._sizeA) return; if (el._sizeA === a) el._sizeA = null; el.classList.remove("sizing", "sizew", "sizei"); };
  return a;
}
// A card changed through its own control stays where it is on screen: whatever else moves (the preview
// above changing height, the list redrawn), the scroll follows it, and if the card itself grows or
// shrinks (a list gaining a line of chips) it does so smoothly instead of jumping.
function holdRow(k) {
  // Rebuilding the list can clamp or nudge the scroll position for a moment. That must not read as
  // the user scrolling, or the hidden top bar slides back in and pushes the whole list down.
  progScrollUntil = Math.max(progScrollUntil, performance.now() + 950);
  const row = document.querySelector(`#list [data-row="${k}"]`), sc = $("scroller"); if (!row || !sc || searching) return () => {};
  const top = row.getBoundingClientRect().top, h = row.offsetHeight;
  return () => {
    const r0 = document.querySelector(`#list [data-row="${k}"]`); if (!r0) return;
    const h2 = r0.offsetHeight; if (Math.abs(h2 - h) > .5) r0.animate([{ height: h + "px", overflow: "hidden" }, { height: h2 + "px", overflow: "hidden" }], { duration: 220, easing: "cubic-bezier(.2,0,0,1)" });
    // held for a moment, frame by frame: the preview resizing, a demo or comparison starting and late
    // redraws all land after this call; a finger or wheel on the list lets go at once
    const until = performance.now() + 900; let stop = false;
    const off = () => { stop = true; }; setTimeout(() => ["wheel", "touchstart", "pointerdown"].forEach(t => sc.addEventListener(t, off, { once: true, passive: true })), 0); // after the tap or key that made the change
    const hold = () => {
      if (stop) return;
      const r = document.querySelector(`#list [data-row="${k}"]`);
      if (r) { const d = r.getBoundingClientRect().top - top; if (Math.abs(d) > .5) sc.scrollTop += d; }
      if (performance.now() < until) requestAnimationFrame(hold);
    };
    hold();
  };
}
function afterChange(k, before, sure) {
  // a setting Morphe asks about before it leaves its default: the editor asks first, in its own dialog
  if (sure !== true && confirmChange(k, before, () => afterChange(k, before, true))) return;
  if (peekKid && kidVisible(peekKid)) peekKid = null;
  if (peekPar && sectionKeys().filter(x => PARENT_OF[x] === peekPar || DIRECT_PARENT[x] === peekPar).every(kidVisible)) peekPar = null; // unlocked: shown as usual
  const settle = holdRow(k);
  if (k === "morphe_change_form_factor") buildMembers(); // a Tablet layout brings back tablet-only settings (offDevice)
  commit(); select(k); settle();
  // the whole preview only pulses when nothing in it stands for this setting
  const sb = document.querySelector(".stagebox"); if (sb && !document.querySelector(`#stage [data-k="${k}"], #stage [data-also~="${k}"]`) && !proxyEls(k).length) { sb.classList.remove("changed"); void sb.offsetWidth; sb.classList.add("changed"); }
  tapFeel("toggle");
  if (SCN[k]) playScenario(k, before);
  // teleport back to the setting that was waiting on this one
  if (returnTo && parentsOk(returnTo.key) && dependsOn(returnTo.key, k)) {
    const back = returnTo; returnTo = null;
    setTimeout(() => goToSetting(back.key, () => {
      const row = document.querySelector(`[data-row="${back.key}"]`);
      if (row) unlockFx(row);
      snack(`<b>${esc(shownTitle(back.key))}</b> is unlocked`);
    }), 650);
  }
}
// Colour inputs only take #RRGGBB; keep the alpha byte of Morphe's #AARRGGBB values.
function fromColor(k, hex) { const cur = String(state[k] || ""); const alpha = cur.length === 9 ? cur.slice(1, 3) : ""; return ("#" + alpha + hex.slice(1)).toUpperCase(); }
function ensureMod() { if (mode === "orig") { mode = "mod"; modeButtons("orig", "mod"); } }
function coerce(k, v) { const t = PREF[k].type; if (t === "integer" || t === "long" || t === "float") return Number(v); if (t === "boolean") return v === true || v === "true"; return v; }

// Opening a screen from a menu that covers the editor (the app's card menu): the new screen is drawn
// at once, before the menu goes, so nothing of the screen that was open before shows for a moment
// (Max, Nov 24: Player > back > App flashed the Player preview's frame, a hitch on every card).
function quickSection(id) {
  if (id === section) return;
  stopDemo(); stopScenario();
  section = id; selected = null; peekKid = null; peekPar = null; trayOpen = false; lastTab[groupOf(id).id] = id;
  window.__drawBehind = null; // drawn here, not the old screen first (boot.js)
  $("scroller").scrollTop = 0; renderAll();
}
const menuCovers = () => document.documentElement.classList.contains("menupage");
function switchSection(id, after) {
  if (id === section) { after && after(); return; }
  const from = SECTIONS.findIndex(s => s.id === section), to = SECTIONS.findIndex(s => s.id === id);
  // The tabs stay put. The preview and the settings slide out and in together, and the preview
  // frame grows or shrinks smoothly to the new screen's height.
  const content = $("content"); content.style.setProperty("--dir", (to > from ? -24 : 24) + "px");
  const box = document.querySelector(".stagebox"), parts = [$("stage"), $("list")];
  const shown = el => el && el.offsetParent !== null;
  const h0 = shown(box) ? box.offsetHeight : 0;
  parts.forEach(p => { p.classList.remove("swap-in"); p.classList.add("swap-out"); });
  stopDemo(); stopScenario();
  setTimeout(() => {
    section = id; selected = null; peekKid = null; peekPar = null; trayOpen = false; lastTab[groupOf(id).id] = id;
    $("scroller").scrollTop = 0; renderAll();
    const h1 = shown(box) ? box.offsetHeight : 0;
    if (h0 && h1 && Math.abs(h1 - h0) > 2) {
      box.getAnimations().forEach(a => a.cancel());
      box.animate([{ height: h0 + "px" }, { height: h1 + "px" }], { duration: 260, easing: "cubic-bezier(.2,0,0,1)" });
    }
    parts.forEach(p => { p.classList.remove("swap-out"); void p.offsetWidth; p.classList.add("swap-in"); });
    after && setTimeout(after, 120);
  }, 120);
}
// A sub-screen (Voice over translation, Loop count, ...) is reached through its first setting, normally its
// main switch: arriving there plays its animation and flash like any setting, instead of an empty landing.
// A sub-screen of Morphe's menu (a search result such as "Post buttons") opens at the setting that stands
// for it: one with the screen's own name, else one whose name starts with it ("Post buttons layout"), else
// its main switch. Every setting of that screen flashes on arrival, so the result reads as the whole
// screen and not as the one card it landed on (Max, round 137: "Post buttons" led to "Comment button").
const screenKids = k => CAT.preferences.filter(p => p.subScreen === k && p.type && p.type !== "screen" && inVersion(p.key) && sectionOf(p.key));
// null when no setting carries the screen's name: then no single card stands for it (goToSetting)
function screenLead(k) {
  const kids = screenKids(k), t = String(title(k)).toLowerCase();
  return (kids.find(p => title(p.key) === title(k)) || kids.find(p => String(title(p.key)).toLowerCase().startsWith(t)) || {}).key || null;
}
function goToSetting(k, after) {
  const isScreen = PREF[k] && PREF[k].type === "screen", kids = isScreen ? screenKids(k) : [];
  const flashKids = () => kids.forEach(p => document.querySelectorAll(`#list [data-row="${p.key}"]`).forEach(el => { if (el.offsetParent) flashRow(el); }));
  const lead = isScreen ? screenLead(k) : null;
  if (lead) return goToSetting(lead, () => { flashKids(); after && after(); });
  // A screen with no setting of its own name ("Action buttons", "Shorts player", "Navigation bar"): it used
  // to land on its first on/off setting in Morphe's order, an arbitrary card ("Disable Like and Subscribe
  // glow" for Action buttons). Now it opens the tab that holds most of the screen's settings, at the
  // topmost of them in the editor's own order, and all of them flash (round 139 audit: 22 of 31 screens).
  if (isScreen && kids.length) {
    const count = {}; kids.forEach(p => { const sec = sectionOf(p.key); count[sec] = (count[sec] || 0) + 1; });
    const sec = Object.keys(count).sort((x, y) => count[y] - count[x])[0], set = new Set(kids.map(p => p.key));
    switchSection(sec, () => {
      const first = [...document.querySelectorAll("#list [data-row]")].find(el => set.has(el.dataset.row) && el.offsetParent);
      if (first) select(first.dataset.row, "list", true);
      fT(() => { flashKids(); after && after(); }, 380);
    });
    return;
  }
  if (PREF[k] && PREF[k].type === "screen") { // a sub-screen: open the editor screen and show it from the top
    switchSection(sectionOf(k), () => { $("scroller").scrollTo({ top: 0 }); const pill = $("secPill"); if (pill) { pill.classList.remove("attn"); void pill.offsetWidth; pill.classList.add("attn"); } after && after(); });
    return;
  }
  switchSection(sectionOf(k), () => {
    // arriving (a search result, Take me there, a popup) plays what tapping the card plays: its
    // animation or comparison, and the reveal of a hidden part
    select(k, "list", true);
    if (after) fT(after, PARENT_OF[k] ? 520 : 380);
  });
}
