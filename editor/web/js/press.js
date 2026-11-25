"use strict";
// Pointer handling (tap, hold, drag), list controls, tabs and the menus.

// press handling (tap vs hold), shared by stage and list
let press = null;
const LONG = 480, PRESS_LEAD = 120; // hold length; with touch, how long a finger stays put before the hold shows
// Mouse drag scrolls the preview's feeds and strips, like a finger would on the phone.
let drag = null;
function scrollTargets(t) {
  const out = []; const stage = $("stage");
  for (let p = t; p && p !== stage && p.nodeType === 1; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (!p.classList.contains("inner-scroll") && p.scrollWidth > p.clientWidth + 1 && /auto|scroll/.test(cs.overflowX)) out.push([p, "x"]);
    if (p.scrollHeight > p.clientHeight + 1 && /auto|scroll/.test(cs.overflowY)) out.push([p, "y"]);
  }
  return out;
}
function down(e) {
  if (e.button > 0) return;
  if (e.pointerType === "mouse" && e.target.closest("#stage")) drag = { x: e.clientX, y: e.clientY, t: e.target, on: false };
  // tapping a switch flips it straight away (the row itself keeps tap = select, hold = switch)
  if (e.target.closest(".sw,.lt7")) return;
  if (e.target.closest("input,select,textarea,button.opt,.lst,.lreset,.filepick,.goto,.kidbtn,.replay,[data-tray]")) return;
  const el = e.target.closest("[data-k]"); if (!el) return;
  const k = el.dataset.k; const from = el.closest("#stage") ? "stage" : "list";
  // holding only does something for settings it can switch (on/off, or a short list it can step
  // through); for a slider, colour or text field the hold ring would charge up to nothing
  if (!canToggle(k)) { press = { el, k, from, x: e.clientX, y: e.clientY, long: false }; return; }
  // A finger that lands to scroll the list must not light up the hold (Max, Nov 24: the hold ring flashed
  // on every fling). With touch the ring shows only once the finger has stayed put a moment; it then
  // starts that far into its run (--press-lead), so the hold still completes at LONG.
  const lead = e.pointerType === "touch" ? PRESS_LEAD : 0;
  const show = () => {
    if (!press || press.el !== el) return;
    el.style.setProperty("--press-lead", -lead + "ms"); el.classList.add("pressing");
    if (from === "stage" && el.classList.contains("off")) { (ghostTimers.get(k) || []).forEach(clearTimeout); ghostTimers.delete(k); el.classList.remove("ghost-out"); el.classList.add("charging"); }
  };
  press = { el, k, from, x: e.clientX, y: e.clientY, long: false };
  if (lead) press.vis = setTimeout(show, lead); else show();
  // holding a preview element brings its setting into view while the hold is still charging
  if (from === "stage") press.peek = setTimeout(() => { if (!press || press.k !== k) return; document.querySelectorAll(".row.sel").forEach(r => r.classList.remove("sel")); document.querySelector(`[data-row="${k}"]`)?.classList.add("sel"); const o = openFor(k); setTimeout(() => scrollRowIntoView(k, true), o ? 300 : 0); }, 160);
  press.t = setTimeout(() => { if (!press) return; press.long = true; el.classList.remove("pressing"); touchSel(k); toggle(k); if (from === "stage") setTimeout(() => scrollRowIntoView(k, true), 30); }, LONG);
}
// Press looks (:active scale, tint, the toggle's stretching thumb) wait the same moment with touch: until
// then html has .touchwait and the CSS :active rules don't apply. A finger that starts scrolling keeps
// them off until it lifts (pointercancel comes without a pointerup, so touchend ends it).
(() => {
  const de = document.documentElement; let t = 0, x0 = 0, y0 = 0;
  const end = () => { clearTimeout(t); de.classList.remove("touchwait"); };
  document.addEventListener("pointerdown", e => { if (e.pointerType !== "touch") return; x0 = e.clientX; y0 = e.clientY; clearTimeout(t); de.classList.add("touchwait"); t = setTimeout(end, PRESS_LEAD); }, true);
  document.addEventListener("pointermove", e => { if (e.pointerType === "touch" && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) clearTimeout(t); }, true);
  document.addEventListener("pointercancel", e => { if (e.pointerType === "touch") clearTimeout(t); }, true);
  document.addEventListener("pointerup", e => { if (e.pointerType === "touch") end(); }, true);
  document.addEventListener("touchend", end, true); document.addEventListener("touchcancel", end, true);
})();
function cancelPress() { if (press) { clearTimeout(press.t); clearTimeout(press.peek); clearTimeout(press.vis); press.el.classList.remove("pressing", "charging"); press = null; } }
function move(e) {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
  if (!drag || !(e.buttons & 1)) { drag = null; return; }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.on && Math.hypot(dx, dy) < 8) return;
  if (!drag.on) { drag.on = true; const ts = scrollTargets(drag.t); drag.box = (ts.find(([, ax]) => ax === (Math.abs(dx) > Math.abs(dy) ? "x" : "y")) || ts[0] || [null])[0]; $("stage").classList.add("dragging"); }
  if (drag.box) { drag.box.scrollLeft -= dx; drag.box.scrollTop -= dy; }
  drag.x = e.clientX; drag.y = e.clientY;
}
document.addEventListener("pointerup", () => { if (drag) { drag = null; $("stage").classList.remove("dragging"); } });
function up() {
  if (!press) return;
  clearTimeout(press.t); clearTimeout(press.peek); clearTimeout(press.vis); press.el.classList.remove("pressing", "charging");
  const { k, from, long } = press; press = null;
  if (long) return;
  const a = A[k];
  if (mode === "mod" && a && (a.kind === "vis" || a.kind === "overlay") && !shown(k)) {
    if (from === "stage") ghost(k, false);
    select(k, from);
    if (from !== "stage" && document.querySelector(`#stage [data-k="${k}"]`)) ghost(k);
  } else select(k, from);
}
$("list").addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && !b.disabled) { e.stopPropagation(); select(b.dataset.act, "list"); runActionRow(b.dataset.act); } });
$("list").addEventListener("change", e => {
  const inp = e.target.closest("input[data-file]"); if (!inp || !inp.files || !inp.files[0]) return;
  const k = inp.dataset.file, file = inp.files[0];
  if (pickedFiles[k]) URL.revokeObjectURL(pickedFiles[k]);
  pickedFiles[k] = URL.createObjectURL(file);
  const before = state[k]; setPref(k, file.name); afterChange(k, before);
});
["stage", "list"].forEach(id => {
  const el = $(id);
  el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", cancelPress);
  el.addEventListener("pointerleave", e => { if (e.target === el) cancelPress(); });
  el.addEventListener("contextmenu", e => { if (e.target.closest("[data-k]")) e.preventDefault(); });
});
$("stage").addEventListener("click", e => {
  if (e.target.closest("[data-tray]")) { trayOpen = !trayOpen; renderStage(); if (selected) highlight(selected); return; }
  if (trayOpen && !e.target.closest(".tray") && !e.target.closest("[data-k]")) { trayOpen = false; renderStage(); if (selected) highlight(selected); }
});
// mouse wheel scrolls horizontal strips (action bars, chips)
$("app").addEventListener("wheel", e => {
  if (!e.target.closest("#stage") || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  const ts = scrollTargets(e.target);
  const y = ts.find(([b, ax]) => ax === "y" && (e.deltaY > 0 ? b.scrollTop + b.clientHeight < b.scrollHeight - 1 : b.scrollTop > 0));
  if (y) return; // native vertical scroll
  const x = ts.find(([, ax]) => ax === "x");
  if (x) { x[0].scrollLeft += e.deltaY; e.preventDefault(); }
}, { passive: false });
$("list").addEventListener("keydown", e => {
  const row = e.target.closest("[data-row]"); if (!row || e.target !== row) return;
  if (e.key === "Enter") { select(row.dataset.row, "list"); e.preventDefault(); }
  if (e.key === " ") { toggle(row.dataset.row); e.preventDefault(); }
});
// the shared list editor: remove a chip, add an entry with + or Enter
const listMsg = (k, msg) => { const box = document.querySelector(`[data-lst="${k}"]`); if (!box) return; box.querySelector(".lerr")?.remove(); if (msg) box.insertAdjacentHTML("beforeend", `<span class="lerr">${esc(msg)}</span>`); };
$("list").addEventListener("click", e => {
  const x = e.target.closest(".lx"); if (x) { listRemove(x.closest("[data-lst]").dataset.lst, Number(x.dataset.lx)); return; }
  // restoring the default list asks first, so a stray tap can't wipe a list someone built up
  const rs = e.target.closest("[data-lreset]"); if (rs) {
    const k = rs.dataset.lreset, def = listItems(k, defaults[k]), num = listNumeric(k);
    openDialog(`<div class="di">${I("reset")}</div><h2 id="dlgTitle">Restore the default list?</h2><p>${esc(shownTitle(k))} goes back to Morphe's own list${def.length ? ":" : "."}</p>${def.length ? `<p class="t2">${def.map(t => esc(t) + (num ? "×" : "")).join(", ")}</p>` : ""}<div class="acts"><button class="dbtn tonal" data-dlg-cancel>Cancel</button><button class="dbtn primary" data-dlg-ok>Restore</button></div>`);
    $("dlgBox").onclick = null;
    $("dlgBox").querySelector("[data-dlg-cancel]").onclick = closeDialog;
    $("dlgBox").querySelector("[data-dlg-ok]").onclick = () => { closeDialog(); if (listJSON(k)) { ensureMod(); touchSel(k); const before = state[k]; setPref(k, defaults[k] ?? ""); afterChange(k, before); } else listSet(k, def); };
    return;
  }
  const add = e.target.closest("[data-ladd]"); if (add) { const k = add.dataset.ladd, inp = document.querySelector(`[data-lin="${k}"]`); listMsg(k, listAdd(k, inp ? inp.value : "")); }
});
$("list").addEventListener("keydown", e => { const inp = e.target.closest("[data-lin]"); if (inp && e.key === "Enter") { e.preventDefault(); listMsg(inp.dataset.lin, listAdd(inp.dataset.lin, inp.value)); } });
$("list").addEventListener("click", e => {
  const res = e.target.closest("[data-res]");
  if (res) { openResult(res.dataset.res); return; }
  const kp = e.target.closest("[data-kidpeek]");
  if (kp) { const k = kp.dataset.kidpeek; peekPar = peekPar === k ? null : k; collapsed.delete(k); renderList(); if (peekPar) select(k); return; }
  const kb = e.target.closest("[data-kidtoggle]");
  if (kb) {
    const k = kb.dataset.kidtoggle, open = collapsed.has(k);
    if (open) collapsed.delete(k); else collapsed.add(k);
    kb.setAttribute("aria-expanded", String(open));
    const box = document.querySelector(`[data-kids-of="${k}"]`); if (box) box.classList.toggle("open", open);
    if (open) lastOpen.add(k); else lastOpen.delete(k);
    return;
  }
  const mo = e.target.closest("[data-more]");
  if (mo) { borrowPopup(mo.dataset.more, mo.dataset.target); return; }
  const go = e.target.closest("[data-goto]");
  if (go) {
    const k = go.dataset.goto; const target = blockerOf(k); if (!target) return;
    if (sectionOf(target) !== section) { borrowPopup(k, target); return; }
    returnTo = { key: k };
    // "any of these" (brightness colour needs the left, right or top swipe on Brightness): every one
    // of them on this screen flashes and the note names them all, not just the first
    const av = String(PREF[k].availability || ""), any = av.includes("||") ? availKeys(k).filter(x => PREF[x] && inVersion(x) && sectionOf(x) === section) : [];
    if (any.length > 1) {
      goToSetting(target, () => any.forEach(x => document.querySelectorAll(`#list [data-row="${x}"]`).forEach(flashRow)));
      const val = (av.match(/===\s*"([^"]+)"/) || [])[1], names = any.map(x => `<b>${esc(shownTitle(x))}</b>`);
      const list = names.slice(0, -1).join(", ") + " or " + names[names.length - 1];
      snack(val ? `Set ${list} to <b>${esc(entryLabel(any[0], val) || val)}</b>, and you'll be brought back` : `Change ${list}, and you'll be brought back`);
      return;
    }
    goToSetting(target);
    snack(PREF[target].type === "boolean" ? `Switch <b>${esc(shownTitle(target))}</b> by holding it, and you'll be brought back` : `Change <b>${esc(shownTitle(target))}</b>, and you'll be brought back`);
    return;
  }
  const rp = e.target.closest("[data-replay]");
  const sw = e.target.closest("[data-sw]");
  if (sw) { const k = sw.dataset.sw; if (A[k]) { touchSel(k); toggle(k); } else { select(k); toggle(k); } return; }
  const opt = e.target.closest("button.opt[data-set]");
  if (opt) { ensureMod(); const k = opt.dataset.set; touchSel(k); const before = state[k]; optSnap(opt); setPref(k, coerce(k, opt.dataset.val)); afterChange(k, before); optGlide(); }
});
$("list").addEventListener("input", e => {
  const t = e.target; const k = t.dataset && t.dataset.set; if (!k || t.tagName === "SELECT") return;
  if (t.type === "range") { tapFeel("tick"); /* each input is a step: a light tick under the finger */ const f = t.max > t.min ? (t.value - t.min) / (t.max - t.min) : 0; t.style.setProperty("--pct", f * 100 + "%"); t.style.setProperty("--pf", f); } // the filled part of a styled track (it ends under the knob's middle)
  // a number box applies each keystroke straight away (the box keeps focus), like a slider does
  const num = t.type === "number" && t.value !== "" && isFinite(t.value);
  if (t.type === "range" || t.type === "color" || num) {
    ensureMod();
    if (!("before" in t.dataset)) t.dataset.before = JSON.stringify(state[k] ?? null);
    setPref(k, t.type === "color" ? fromColor(k, t.value) : Number(t.value));
    const lab = document.querySelector(`[data-val-of="${k}"]`); if (lab) { const was = lab.textContent; lab.textContent = t.value; textSwap(lab, was, 150); }
    // redrawn without the selection pop: it flashed the preview on every step of the slider
    // a slider with a live overlay (swipe overlay look, zone sizes) redraws only that overlay: redrawing
    // the whole preview on every step flashed parts of it
    if (LIVE_HUD[k] && selected === k) LIVE_HUD[k]();
    else { if (selected !== k) stopScenario(); selected = k; renderStage(); highlight(k, false); if (LIVE_HUD[k]) LIVE_HUD[k](); }
  }
});
$("list").addEventListener("change", e => {
  const t = e.target; const k = t.dataset && t.dataset.set; if (!k) return;
  ensureMod();
  const before = "before" in t.dataset ? JSON.parse(t.dataset.before) : state[k]; delete t.dataset.before;
  setPref(k, t.type === "range" || t.type === "number" ? Number(t.value) : t.type === "color" ? fromColor(k, t.value) : coerce(k, t.value));
  if (t.type === "range" || t.type === "color") { commit(); select(k); if (returnTo) afterChange(k, before); } else afterChange(k, before);
});

$("secPill").onclick = () => setPicker(!pickerOpen);
$("tabs").addEventListener("click", e => { if (tabDrag.justDragged) { tabDrag.justDragged = false; return; } const t = e.target.closest("[data-tab]"); if (!t || t.dataset.tab === section) return; returnTo = null; markTab(t.dataset.tab); switchSection(t.dataset.tab); });
// Tabs scroll sideways (touch, mouse wheel, mouse drag). Holding a tab lifts it; drag it to reorder.
const tabDrag = { justDragged: false };
(() => {
  const box = $("tabs"); let st = null;
  box.addEventListener("wheel", e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { box.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  box.addEventListener("pointerdown", e => {
    if (e.button > 0) return;
    const t = e.target.closest("[data-tab]");
    st = { x: e.clientX, sl: box.scrollLeft, t, mode: null, id: e.pointerId };
    if (t) st.hold = setTimeout(() => { if (!st || st.mode) return; st.mode = "lift"; t.classList.add("lift"); box.setPointerCapture(st.id); tapFeel("lift"); }, 450);
  });
  box.addEventListener("pointermove", e => {
    if (!st) return;
    const dx = e.clientX - st.x;
    if (!st.mode && Math.abs(dx) > 8) { clearTimeout(st.hold); st.mode = e.pointerType === "mouse" ? "scroll" : "native"; if (st.mode === "scroll") box.setPointerCapture(st.id); }
    if (st.mode === "scroll") box.scrollLeft = st.sl - dx;
    if (st.mode === "lift") {
      const tabs = [...box.querySelectorAll(".tab7")], me = st.t;
      const over = tabs.find(o => { if (o === me) return false; const r = o.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right; });
      if (over) { const r = over.getBoundingClientRect(), nx = me.nextSibling; over.parentNode.insertBefore(me, e.clientX < r.left + r.width / 2 ? over : over.nextSibling); if (me.nextSibling !== nx) tapFeel("snap"); }
      const br = box.getBoundingClientRect(); if (e.clientX > br.right - 24) box.scrollLeft += 8; else if (e.clientX < br.left + 24) box.scrollLeft -= 8;
    }
  });
  const end = () => {
    if (!st) return; clearTimeout(st.hold);
    if (st.mode === "lift") {
      st.t.classList.remove("lift");
      const g = groupOf(section), ids = [...box.querySelectorAll(".tab7")].map(b => b.dataset.tab), def = g.tabs.map(([t]) => t).filter(t => ids.includes(t));
      if (JSON.stringify(ids) === JSON.stringify(def)) delete tabOrder[g.id]; else tabOrder[g.id] = ids;
      store.save(); tabDrag.justDragged = true; setTimeout(() => { tabDrag.justDragged = false; }, 300);
    } else if (st.mode === "scroll") { tabDrag.justDragged = true; setTimeout(() => { tabDrag.justDragged = false; }, 300); }
    st = null;
  };
  box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
  box.addEventListener("contextmenu", e => e.preventDefault());
  box.addEventListener("touchmove", e => { if (st && st.mode === "lift") e.preventDefault(); }, { passive: false }); // a lifted tab moves, the strip doesn't
})();
$("pickScrim").onclick = () => setPicker(false);
$("pickGrid").addEventListener("click", e => {
  if (pickSuppress) return;
  const dz = e.target.closest("[data-design]");
  if (dz) { if (dz.dataset.design === design) return; seg3Snap(); design = dz.dataset.design; renderBar(); renderList(); store.save(); setTimeout(designPopup, 420); return; } // after the thumb has moved
  const ui = e.target.closest("[data-ui]");
  if (ui) { if (ui.dataset.ui === theme || uiNo(ui.dataset.ui)) return; seg3Snap(); uiPick(ui.dataset.ui); return; }
  if (e.target.closest("[data-group-toggle]")) {
    const y0 = e.target.closest("[data-group-toggle]").getBoundingClientRect().top;
    const was = grouped; grouped = !grouped; renderBar();
    const tog = document.querySelector("#pickGrid [data-group-toggle]"), sw = tog && tog.querySelector(".sw"); // drawn again: it glides from the old state
    if (tog) $("picker").scrollTop += tog.getBoundingClientRect().top - y0; // the list of screens above changed length: the toggle stays under the finger
    if (sw) toggleGlide(sw, String(was), String(grouped), v => sw.setAttribute("aria-checked", v));
    renderStage(); store.save(); if (grouped) tutOnce("groups"); return;
  }
  const gb = e.target.closest("[data-group]");
  if (gb) { const g = GROUPS.find(x => x.id === gb.dataset.group), tabs = tabsOf(g), id = lastTab[g.id] && tabs.some(([t]) => t === lastTab[g.id]) ? lastTab[g.id] : tabs[0][0]; returnTo = null; chooseCard();
    if (menuCovers()) { quickSection(id); setPicker(false); } else { setPicker(false); switchSection(id); } return; }
  // leaves the new design for Morphe's own settings screen; in the app the patch's switch at the top
  // of Morphe's settings turns it back on
  if (e.target.closest("[data-editor-off]")) {
    openDialog(`<div class="di">${I("power")}</div><h2 id="dlgTitle">Disable the new design?</h2><p>Morphe's settings open in their original look. You can turn the new design back on from the top of Morphe's settings. Your settings are not changed.</p><div class="acts"><button class="dbtn primary" data-dlg-ok>Disable</button><button class="dbtn tonal" data-dlg-cancel>Cancel</button></div>`);
    $("dlgBox").querySelector("[data-dlg-cancel]").onclick = closeDialog;
    $("dlgBox").querySelector("[data-dlg-ok]").onclick = () => {
      closeDialog();
      if (typeof window.MorpheApp !== "undefined" && window.MorpheApp.disableEditor) { try { window.MorpheApp.disableEditor(); } catch (err) { /* ignore */ } }
      else snack("In the app this switches back to Morphe's original settings");
    };
    return;
  }
  if (e.target.closest("[data-order-reset]")) { askOrderReset(); return; }
  const b = e.target.closest("[data-sec]"); if (!b) return; returnTo = null; chooseCard();
  if (menuCovers()) { quickSection(b.dataset.sec); setPicker(false); } else { setPicker(false); switchSection(b.dataset.sec); } });
// Reset order: from the menu's own row (web) or the top bar beside the menu's title (app)
function askOrderReset() {
    openDialog(`<div class="di">${I("reset")}</div><h2 id="dlgTitle">Reset screen order?</h2><p>The screens go back to Morphe's own order. Your settings are not changed.</p><div class="acts"><button class="dbtn primary" data-dlg-ok>Reset</button><button class="dbtn tonal" data-dlg-cancel>Cancel</button></div>`);
    $("dlgBox").querySelector("[data-dlg-cancel]").onclick = closeDialog;
    $("dlgBox").querySelector("[data-dlg-ok]").onclick = () => { customOrder = null; applyOrder(); renderBar(); store.save(); closeDialog(); snack("Screens are back in Morphe's order"); };
}
document.addEventListener("keydown", e => { if (e.key === "Escape") { setPicker(false); closeDialog(); if (searching) { query = ""; setSearch(false); } } });
function setMode(m) {
  const was = mode; mode = m;
  modeButtons(was, m); // glides like every other toggle
  commit(); if (selected) select(selected);
}
// a two-way toggle: a tap anywhere on it switches between Original and Morphe
document.querySelector(".appbar .seg").onclick = () => setMode(mode === "orig" ? "mod" : "orig");
