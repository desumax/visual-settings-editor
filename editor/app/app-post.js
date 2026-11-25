"use strict";
// In-app mode, part 2 (loaded after boot.js). Every change the editor stores is sent to Morphe's
// own settings; Back and Restart go to the app.
if (INAPP) {
  // Every change goes through setPref (core.js), which lists the key in changedPrefs; each save
  // sends exactly those keys to Morphe. The first save only ends the start-up (values the editor
  // fitted to this YouTube version are not changes the user made).
  let started = false;
  const fileSave = store.save;
  store.save = function () {
    const keys = [...changedPrefs];
    changedPrefs.clear();
    fileSave();
    if (!Object.keys(PREF).length) return;
    if (!started) { started = true; carryPending(); return; }
    for (const k of keys) {
      if (!(k in LIVE.values)) continue;
      try { MorpheApp.set(__morpheKey(k), JSON.stringify(state[k])); } catch (e) { /* ignore */ }
    }
  };
  // Changes saved earlier that still wait for a restart (Morphe keeps the values YouTube runs with):
  // they count as changed from the start, so the restart prompt on leaving lists them again, and
  // window.__pendingAtOpen holds them for the prompt shown when the editor opens.
  window.__pendingAtOpen = [];
  function carryPending() {
    let p = {};
    try { p = JSON.parse(MorpheApp.pending ? MorpheApp.pending() : "{}") || {}; } catch (e) { /* older app */ }
    for (const mk in p) { const k = __editorKey(mk); if (k in PREF) { baseline[k] = p[mk]; __pendingAtOpen.push(k); } }
    if (__pendingAtOpen.length) { renderBar(); pendingDialog(__pendingAtOpen); } // "Changes not applied yet": apply and restart, continue, or reset
  }
  // Leaving with "Save for later": the values are already saved; Morphe keeps the list for next time.
  window.savePendingForLater = () => {
    const o = {}; for (const k of pendingRestart()) o[__morpheKey(k)] = baseline[k];
    try { MorpheApp.savePending(JSON.stringify(o)); } catch (e) { /* older app */ }
  };
  // "Reset": every change waiting for a restart goes back to the value YouTube runs with.
  window.resetPendingChanges = () => {
    // Morphe puts the values back itself (resetPending), so they are loaded, not sent again
    loadPrefs(Object.fromEntries(pendingRestart().map(k => [k, baseline[k]])));
    try { MorpheApp.resetPending(); } catch (e) { /* older app */ }
    commit();
  };
  // Morphe kept another value (a confirmation was declined, or the value was refused).
  window.morpheSetValue = (k, json) => {
    k = __editorKey(k); // Morphe's key for a setting the editor knows under another (app-pre.js)
    if (!(k in PREF)) return;
    try { loadPrefs({ [k]: JSON.parse(json) }); } catch (e) { return; }
    commit();
  };
  // Availability as Morphe's own list has it. Available natively: unlocked whatever the catalogue's
  // parents say. Not available: the catalogue's parents explain it if they can, otherwise the
  // availability rule (which reads the native value, see applyLive) locks it.
  const catalogueParentsOk = classicParentsOk;
  classicParentsOk = k => (__liveAvail[k] === true ? true : catalogueParentsOk(k));
  window.morpheAvailability = map => {
    let changed = false;
    for (const mk in map) { const k = __editorKey(mk); if (k in __liveAvail && __liveAvail[k] !== map[mk]) { __liveAvail[k] = map[mk]; changed = true; } }
    if (changed) commit();
  };
  // The leave and reopen prompts (restartDialog, pendingDialog in list.js) run Morphe's own actions here.
  leaveHost.restart = () => { try { MorpheApp.restart(); } catch (e) { /* ignore */ } };
  leaveHost.saveForLater = () => { savePendingForLater(); try { MorpheApp.close(); } catch (e) { /* ignore */ } };
  leaveHost.reset = leaving => { resetPendingChanges(); if (leaving) { try { MorpheApp.close(); } catch (e) { /* ignore */ } } else snack("Changes reset"); };
  // Navigation in the app: the editor opens on the screen menu, shown as a page of cards. A card
  // opens its live preview screen; Back (key, gesture or arrow) from a screen returns to the menu,
  // Back from the menu leaves the editor. The restart prompt only comes when leaving the editor.
  let menuPage = false;
  const pickerToggle = setPicker;
  const menuTitle = document.createElement("div");
  menuTitle.className = "menutitle"; menuTitle.textContent = "Visual settings";
  $("secPill").before(menuTitle);
  // Reset order (list.js, shown while the menu is open) sits between the title and search
  menuTitle.after($("barOrd"));
  $("secPill").onclick = null; $("secPill").removeAttribute("aria-haspopup"); $("secPill").tabIndex = -1;
  function setMenu(on) {
    if (!on && window.__drawBehind) window.__drawBehind(); // the screen behind the menu, not drawn yet at start (boot.js)
    menuPage = on;
    document.documentElement.classList.toggle("menupage", on);
    if (on) { $("scroller").scrollTop = 0; $("app").classList.remove("barhidden"); }
    pickerToggle(on);
    $("app").style.setProperty("--abh", document.querySelector(".appbar").offsetHeight + "px");
  }
  // Every caller that closed the dropdown (a card, search, the scrim) now leaves the menu page.
  setPicker = open => setMenu(open);
  const searchOpen = openResult;
  openResult = k => { const s = menuPage && sectionOf(k); if (s && s !== section) quickSection(s); setMenu(false); searchOpen(k); };

  const leave = () => {
    if (pendingRestart().length) return restartDialog();
    try { MorpheApp.close(); } catch (e) { /* ignore */ }
  };
  $("btnBack").onclick = () => (menuPage ? leave() : setMenu(true));
  $("btnBack").setAttribute("aria-label", "Back");
  // The phone's Back key: close what is open first, then go back like the arrow.
  window.morpheBack = () => {
    if ($("dlg").classList.contains("open")) { closeDialog(); return; }
    if ($("tut") && $("tut").classList.contains("on")) { $("tut").closeTutorial ? $("tut").closeTutorial() : $("tutOk") && $("tutOk").click(); return; }
    if (searching) { $("qClose").click(); return; }
    $("btnBack").click();
  };
  // Action rows (import / export, export logs, links...): a tap runs Morphe's own row, so its
  // dialog or screen opens exactly as in the regular settings. Search results lead to them too.
  const runAction = k => { try { MorpheApp.action(k); actionRan = true; } catch (e) { snack("Update the visual editor patch to use this"); } };
  // Morphe's own rows can change settings behind the editor: Import / Export applies the pasted or
  // imported text on Save (AbstractPreferenceFragment.importSettingsText, Setting.importFromJSON),
  // and Morphe may add more such rows. When the editor gets the screen back after one (its dialog or a
  // file picker closed), it reads Morphe's values again, so it shows what Morphe now has. They are not
  // edits made in the editor, so nothing is sent back. The ones that need a restart are noted by the
  // app (MorpheApp.pending) and count as changed here too, so leaving shows the editor's own restart
  // prompt and never Morphe's dialog. MorpheApp.state is the same read the editor starts with; the
  // app calls morpheReloadValues itself once it has noted them.
  let actionRan = false;
  window.morpheReloadValues = () => {
    let live; try { live = JSON.parse(MorpheApp.state()); } catch (e) { return; }
    const vals = (live && live.values) || {}, next = {};
    for (const mk in vals) { const k = __editorKey(mk); if (k in PREF && JSON.stringify(state[k]) !== JSON.stringify(vals[mk])) next[k] = vals[mk]; }
    const any = Object.keys(next).length > 0;
    if (any) { loadPrefs(next); Object.assign(baseline, next); }
    // what now waits for a restart: the baseline is the value YouTube still runs with
    let p = {}, had = pendingRestart().length;
    try { p = JSON.parse(MorpheApp.pending ? MorpheApp.pending() : "{}") || {}; } catch (e) { /* older app */ }
    for (const mk in p) { const k = __editorKey(mk); if (k in PREF) baseline[k] = p[mk]; }
    if (any) commit(); else if (pendingRestart().length !== had) renderBar();
  };
  const backFromAction = () => { if (!actionRan || document.hidden) return; actionRan = false; setTimeout(window.morpheReloadValues, 60); };
  window.addEventListener("focus", backFromAction);
  document.addEventListener("visibilitychange", backFromAction);
  document.addEventListener("click", e => {
    const row = e.target.closest("#list [data-row]");
    if (!row || !__liveActions.has(row.dataset.row)) return;
    e.stopPropagation(); select(row.dataset.row, "list"); runAction(row.dataset.row);
  }, true);
  // Back swipe, iOS-like (Max, Nov 24, every design): while the Back gesture is held on a screen, the
  // screen follows the finger sideways with a shadow on its edge, and the card menu comes in behind it
  // from a little to the side (parallax) and brightens. Letting go slides the screen the rest of the way
  // and the menu takes over; swiping back in springs it back (--spring). The app forwards the system
  // gesture (Android 14+ predictive back) with the finger's place (x, in page px); a swipe in from the
  // left edge of the page does the same where the system leaves that edge to the app (three-button
  // navigation, older Android). Without x (an older app) the progress stands in for the finger.
  let peek = null;
  const ed = document.querySelector(".editor"), pk = $("picker");
  const canPeek = () => !menuPage && !$("dlg").classList.contains("open") && !($("tut") && $("tut").classList.contains("on")) && !searching;
  const peekW = () => ed.offsetWidth || innerWidth;
  // f: how far the screen has gone (0 = in place, 1 = gone)
  const peekDraw = f => {
    const s = peek.edge === 1 ? -1 : 1, w = peekW();
    peek.f = f;
    ed.style.transform = `translateX(${s * f * w}px)`;
    ed.style.boxShadow = `${-s * 6}px 0 24px rgba(0,0,0,${(.45 * (1 - f * .6)).toFixed(3)})`;
    pk.style.transform = `translateX(${-s * 30 * (1 - f)}%)`;
    pk.style.opacity = String(.7 + .3 * f);
  };
  const peekAt = (p, x) => {
    if (typeof x === "number" && isFinite(x)) return Math.min(1, Math.max(0, (peek.edge === 1 ? peek.x - x : x - peek.x) / peekW()));
    return Math.min(1, Math.max(0, p)) * .45; // an older app: the progress only
  };
  // Back to the plain page in one frame, with nothing transitioning (Max, Nov 24: a back swipe started and
  // then cancelled flashed the screen, and a see-through copy of the menu faded out over it: the menu went
  // back above the screen while its closing fade, and its cards' fades, still ran). closeMenu: the menu
  // behind is put away at once (a cancelled swipe); otherwise it stays as the page (the swipe went through).
  const peekEnd = closeMenu => {
    const root = document.documentElement;
    root.classList.add("peekreset");
    if (closeMenu) pk.classList.remove("open");
    root.classList.remove("peekback");
    ed.style.transition = ed.style.transform = ed.style.boxShadow = ed.style.opacity = pk.style.opacity = pk.style.transform = pk.style.transition = "";
    void pk.offsetWidth; void ed.offsetWidth; // the final look is worked out now, with transitions off
    peek = null;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("peekreset")));
  };
  // from where the screen is to f, then done (the spring when it comes back, a quick glide when it leaves)
  const peekTo = (f, ms, ease, done) => {
    const t = `${ms}ms ${ease}`;
    ed.style.transition = `transform ${t}, box-shadow ${t}`; pk.style.transition = `transform ${t}, opacity ${t}`;
    peekDraw(f); peek.timer = setTimeout(done, ms + 20);
  };
  window.morpheBackStart = (edge, x) => {
    if (!canPeek()) return;
    if (peek) { clearTimeout(peek.timer); peekEnd(true); }
    peek = { edge: edge === 1 ? 1 : 0, x: typeof x === "number" && isFinite(x) ? x : (edge === 1 ? peekW() : 0), f: 0 };
    pk.classList.add("open"); // the menu, drawn behind the screen
    document.documentElement.classList.add("peekback");
    ed.style.transition = pk.style.transition = "none"; peekDraw(0);
  };
  window.morpheBackProgress = (p, x) => { if (peek && !peek.timer) peekDraw(peekAt(p, x)); };
  window.morpheBackCancel = () => {
    if (!peek || peek.timer) return;
    // no overshoot: a spring past the start showed a strip of the menu at the other edge for a moment
    peekTo(0, 320, "cubic-bezier(.2, .8, .3, 1)", () => { if (!peek) return; peekEnd(true); });
  };
  const keyBack = window.morpheBack;
  window.morpheBack = () => {
    if (!peek) return keyBack();
    if (peek.timer) return;
    // the gesture was let go: the screen slides the rest of the way, then the menu page takes over
    const left = 1 - peek.f;
    peekTo(1, Math.round(140 + 160 * left), "cubic-bezier(.2, .8, .3, 1)", () => { peekEnd(); setMenu(true); });
  };
  // the page's own edge swipe (where the system doesn't take the edge)
  (() => {
    let sw = null;
    document.addEventListener("touchstart", e => {
      sw = null;
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX > 20 || !canPeek() || peek) return;
      sw = { x: t.clientX, y: t.clientY, on: false, lx: t.clientX, lt: performance.now(), v: 0 };
    }, { capture: true, passive: true });
    document.addEventListener("touchmove", e => {
      if (!sw) return;
      const t = e.touches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
      if (!sw.on) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > dx) { sw = null; return; }
        if (dx < 10) return;
        sw.on = true; window.morpheBackStart(0, t.clientX);
        if (!peek) { sw = null; return; }
      }
      if (e.cancelable) e.preventDefault();
      const now = performance.now(); if (now > sw.lt) sw.v = (t.clientX - sw.lx) / (now - sw.lt) * 1000;
      sw.lx = t.clientX; sw.lt = now;
      window.morpheBackProgress(0, t.clientX);
    }, { capture: true, passive: false });
    const end = () => {
      const s = sw; sw = null;
      if (!s || !s.on || !peek) return;
      if (peek.f > .33 || s.v > 500) window.morpheBack(); else window.morpheBackCancel();
    };
    document.addEventListener("touchend", end, true); document.addEventListener("touchcancel", end, true);
  })();
  setMenu(true);
  // Tell the app the first screen is drawn, so it can fade the editor in (no loading frames).
  // The screen behind the menu is drawn after the app has faded the editor in (boot.js).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    try { MorpheApp.ready(); } catch (e) { /* older app */ }
    setTimeout(() => { if (window.__drawBehind) window.__drawBehind(); }, 400);
  }));
}
