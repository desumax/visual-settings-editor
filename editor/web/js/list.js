"use strict";
// Rendering the settings list and tabs, search, and the restart prompt.

// ------------------------------------------------------------------ rendering
const $ = id => document.getElementById(id);
// Every redraw of the editor's own UI goes through paint(), always in the same order:
//   1. the new HTML is written;
//   2. the mark passes run: they set classes, attributes and structure from the data only (greyed parts,
//      hidden rows, merged groups) and never read a size or a style. The box is .painting while they run,
//      which turns transitions off, so whatever they set is the element's first look and never plays;
//   3. one style flush, then transitions are back on;
//   4. back in the caller: measure (sizes, scroll positions), place, animate.
// A class set after something read a style plays its transition: that was the Player icon style flash
// (greyed parts faded on every redraw). Phones inside comparisons are not painted this way: their
// stories draw and then change on purpose, on their own clock.
// iOS-like value changes (Max, Nov 24, every design): a number or label that changes cross-fades, the old
// text blurring away over the new one as it comes into focus. el already shows the new text; was is the old.
// The old text is a short-lived copy laid exactly over el (placed, measured, corrected: the preview phone
// is scaled), so nothing around it moves. Used by the list's descriptions and value readouts (renderList),
// a slider's readout while it is dragged (press.js) and the screen's name in the top bar (renderBar).
function textSwap(el, was, ms = 240) {
  if (!el || !el.isConnected || was == null || was === el.textContent || GLIDE_REDUCED.matches) return;
  if (el._tsGhost) { el._tsGhost.remove(); el._tsGhost = null; }
  if (el.offsetWidth && el.parentElement) {
    const g = el.cloneNode(false); g.textContent = was; g.removeAttribute("id"); g.removeAttribute("data-val-of"); g.setAttribute("aria-hidden", "true");
    Object.assign(g.style, { position: "absolute", left: el.offsetLeft + "px", top: el.offsetTop + "px", width: el.offsetWidth + "px", margin: "0", pointerEvents: "none" });
    el.after(g); el._tsGhost = g;
    const er = el.getBoundingClientRect(), gr = g.getBoundingClientRect(), k = er.width / el.offsetWidth || 1;
    g.style.left = el.offsetLeft + (er.left - gr.left) / k + "px"; g.style.top = el.offsetTop + (er.top - gr.top) / k + "px";
    g.animate([{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(4px)" }], { duration: ms * .75, easing: "ease-in", fill: "forwards" })
      .onfinish = () => { g.remove(); if (el._tsGhost === g) el._tsGhost = null; };
  }
  el.animate([{ opacity: 0, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)" }], { duration: ms, easing: "ease-out" });
}
// a card's description and value readout, by setting, to compare after a redraw of the same screen
const rowTexts = list => new Map([...list.querySelectorAll(".row[data-row]")].map(r => [r.dataset.row, [r.querySelector(":scope > .txt > .sum")?.textContent, r.querySelector(".ctl .val")?.textContent]]));
function swapRowTexts(list, was) {
  list.querySelectorAll(".row[data-row]").forEach(r => {
    const w = was.get(r.dataset.row); if (!w) return;
    textSwap(r.querySelector(":scope > .txt > .sum"), w[0]); textSwap(r.querySelector(".ctl .val"), w[1]);
  });
}
function paint(el, html, ...marks) {
  el.__cards = false; // drawn whole: paintList has nothing of its own to keep here
  el.classList.add("painting");
  el.innerHTML = html;
  for (const m of marks) m(el);
  void el.offsetHeight;
  el.classList.remove("painting");
  return el;
}
// The settings list's own paint (Nov 23 evening): the same steps as paint(), but a card whose markup is the
// same as last time, and that nothing has touched since it was drawn, stays where it is. A tap used to
// replace every card of the screen and lay all of them out again (most of a redraw's time); now only the
// cards that changed are new, and the rest keep their layout, their focus and their running state.
// A card = a row, or a parent with its sub-options, directly inside a .group (the swipe zones block is put
// together from its rows after each draw, so those few are always new).
// A card is kept only when all of this holds, otherwise it is drawn new exactly as before:
//   - the list showed this same screen (not search results, not another tab);
//   - its new markup equals the markup it was made from (__src), so every value it shows is unchanged;
//   - nothing changed it after it settled: no class, attribute, style or child (listSeen, a mutation
//     observer), and nothing in it is animating. A selection, a flash, a fold or a glide touches it;
//   - it holds no locked setting (those are hidden, shown and unlocked by steps that expect a new card).
// Headings are always new (they are tiny, and fold by their own rules). Returns the new cards: the steps
// that only measure what was just drawn (fitOpts, fitSums) go over those alone.
const listTouched = new Set();
const cardOf = n => { let e = n.nodeType === 1 ? n : n.parentElement; while (e && e.__src === undefined) e = e.parentElement; return e || null; };
const listNote = recs => recs.forEach(r => { const c = cardOf(r.target); if (c) listTouched.add(c); });
// one-line titles are measured again a frame after anything in the list changed (a selection can change a
// card's width); only a title whose fit changed gets its class changed
let fitLinesRaf = 0;
const listSeen = new MutationObserver(recs => { listNote(recs); if (!fitLinesRaf) fitLinesRaf = requestAnimationFrame(() => { fitLinesRaf = 0; if (typeof fitLines === "function") listQuiet(() => fitLines($("list"))); }); });
listSeen.observe($("list"), { subtree: true, childList: true, attributes: true, characterData: true });
// a step that only finishes how new cards are drawn (fitting pills, clamping descriptions): what it sets is
// part of the card as drawn, not a change to it; anything noticed before it still counts
function listQuiet(fn) { listNote(listSeen.takeRecords()); const r = fn(); listSeen.takeRecords(); return r; }
// renderList hands over the screen in pieces, so an unchanged card is recognised from its text alone and is
// neither parsed nor compared in the page: a heading's markup, or a group as an array of its cards' markup.
const cardKey = e => e.matches(".unit") ? "u:" + (e.firstElementChild?.dataset.row || "") : e.matches(".shared") ? "s:" + (e.querySelector(".row")?.dataset.row || "") : e.dataset.row ? "r:" + e.dataset.row : e.dataset.h !== undefined ? "h:" + e.dataset.h : e.className;
const srcKey = t => { const r = /data-row="([^"]+)"/.exec(t); if (r) return (t.startsWith('<div class="unit"') ? "u:" : t.startsWith('<div class="shared"') ? "s:" : "r:") + r[1]; const h = /data-h="([^"]*)"/.exec(t); return h ? "h:" + h[1] : t.slice(0, 48); };
const lockedCard = c => c.matches(".row.dis") || (c.matches(".unit") && !!c.firstElementChild?.matches(".dis"));
function paintList(list, parts, ...marks) {
  const same = list.__cards === true && list.dataset.view === section;
  listNote(listSeen.takeRecords());
  if (same) list.getAnimations({ subtree: true }).forEach(a => { const t = a.effect && a.effect.target, c = t && cardOf(t); if (c) listTouched.add(c); });
  else list.textContent = "";
  const fresh = [], tpl = document.createElement("template");
  const make = t => { tpl.innerHTML = t; const n = tpl.content.firstElementChild; n.__src = t; n.classList.add("painting"); fresh.push(n); return n; };
  const isGroup = e => e.classList.contains("group");
  // one level: what left the screen goes, what is unchanged stays, the rest is made new in its place
  const walk = (box, items, keep) => {
    const keys = new Set(items.map(t => Array.isArray(t) ? "" : srcKey(t)));
    let cur = box.firstElementChild;
    for (const t of items) {
      while (cur && !isGroup(cur) && !keys.has(cardKey(cur))) { const nx = cur.nextElementSibling; cur.remove(); cur = nx; }
      if (Array.isArray(t)) {
        if (cur && isGroup(cur)) { walk(cur, t, true); cur = cur.nextElementSibling; }
        else { const g = document.createElement("div"); g.className = "group"; t.forEach(c => g.appendChild(make(c))); box.insertBefore(g, cur); }
        continue;
      }
      if (keep && cur && cur.__src === t && !listTouched.has(cur) && !lockedCard(cur) && !cur.matches(".subhead")) { cur = cur.nextElementSibling; continue; } // kept
      const n = make(t);
      if (cur && !isGroup(cur) && cardKey(cur) === cardKey(n)) { const nx = cur.nextElementSibling; cur.replaceWith(n); cur = nx; } else box.insertBefore(n, cur);
    }
    while (cur) { const nx = cur.nextElementSibling; cur.remove(); cur = nx; }
  };
  walk(list, parts, false);
  for (const m of marks) m(list);
  void list.offsetHeight;
  fresh.forEach(n => n.classList.remove("painting"));
  list.__cards = true; listTouched.clear(); listSeen.takeRecords(); // the draw itself is not a change
  return fresh;
}
const secInfo = () => SECTIONS.find(s => s.id === section);

function renderBar() {
  const s = secInfo(), g = groupOf(section);
  const labWas = $("secLabel").textContent;
  $("secLabel").textContent = grouped ? g.title : s.title; textSwap($("secLabel"), labWas);
  $("secIcon").innerHTML = `<path d="${P[grouped ? g.icon : s.icon] || P.list}"/>`;
  renderTabs();
  $("btnReset").disabled = mode !== "mod" || !Object.keys(PREF).some(k => JSON.stringify(state[k]) !== JSON.stringify(defaults[k]));
  // the screen menu is drawn now only while it can be seen; a change made in a screen (every tap redraws
  // the bar) leaves it for a quiet moment instead, off the tap's own frames, and opening it draws it first
  if (pickerOpen || !$("pickGrid").firstChild) paintPicker(); else { pickDirty = true; clearTimeout(pickLater); pickLater = setTimeout(() => { if (pickDirty) paintPicker(); }, 400); }
}
let pickDirty = false, pickLater = 0;
// No card shows as the current one until a screen has been opened from the menu (or search): Max, Nov 24,
// the first open already had a card marked (app and web view alike)
let menuChosen = false;
const chooseCard = () => { if (!menuChosen) { menuChosen = true; pickDirty = true; } }; // the menu is drawn again when it next shows
const markCurrent = () => menuChosen;
function paintPicker() {
  pickDirty = false; clearTimeout(pickLater);
  const g = markCurrent() ? groupOf(section) : null, cur = markCurrent() ? section : null;
  const pick = (x, i) => {
    const m = MEMBERS[x.id];
    const sub = `${m.live.length + m.misc.length} settings`;
    return `<button class="pick" role="menuitem" data-sec="${x.id}" aria-current="${x.id === cur}" style="transition-delay:${Math.min(i, 12) * 12}ms"><span class="pi">${I(x.icon)}</span><span><div class="pt">${esc(x.title)}${devMark(x.id)}</div><div class="ps">${sub}</div></span></button>`;
  };
  const vis = SECTIONS.filter(x => SCENES[x.id]), plain = SECTIONS.filter(x => !SCENES[x.id]);
  // a group card (design D, Max Nov 22): a rail on the left with the icon and the number of settings,
  // the group's name and one line per tab on the right
  const gpick = (x, i) => { const n = tabsOf(x).reduce((a, [t]) => a + MEMBERS[t].live.length + MEMBERS[t].misc.length, 0);
    return `<button class="pick gcard" role="menuitem" data-group="${x.id}" aria-current="${x === g}" style="transition-delay:${i * 12}ms"><span class="gc-rail"><span class="pi">${I(x.icon)}</span><span class="gc-n"><b>${n}</b><small>settings</small></span></span><span class="gc-body"><span class="gc-t">${esc(x.title)}${devMarkGroup(x)}</span><span class="gc-tabs">${tabsOf(x).map(([, t]) => `<span>${esc(t)}</span>`).join("")}</span></span></button>`; };
  paint($("pickGrid"), (grouped ? `<div class="pg pvis pgroups">${GROUPS.map(gpick).join("")}</div>` : `<div class="pg pvis">${vis.map(pick).join("")}</div>` + `<div class="plaincard"><div class="ph">${I("list")}No preview · standard settings</div><div class="pg">${plain.map(pick).join("")}</div></div>`)
    + `<div class="themerow simrow"><div class="themetog" data-group-toggle role="menuitemcheckbox" aria-checked="${grouped}"><span class="pi">${I("layers")}</span><div class="tt">Group screens into tabs<small>Six screens instead of ${SECTIONS.length}. Each one has tabs right under the live preview, and every tab brings its own preview.</small></div><span class="sw" role="presentation" aria-checked="${grouped}"></span></div></div>`
    // UI design sits right above the list design (Max, Nov 23)
    // one line: the title on the left, its toggle on the right (Max, Nov 23 PM)
    + `<div class="themerow uirow"><span class="pi">${I("palette")}</span><div class="tt">UI design${theme === "glass" && glassTier !== null ? `<small>${GLASS_TIER_NAMES[glassTier]}${typeof glassForced === "number" ? " (forced)" : ""}</small>` : ""}</div>${seg3("UI design", "ui", UI_DESIGNS, theme, uiOff())}</div>`
    + `<div class="themerow designrow"><div class="dcol"><div class="dsg"><span class="pi">${I("list")}</span><div class="tt">Settings list design</div></div><div class="drow">${seg3("Settings list design", "design", LIST_DESIGNS, design)}<button class="offnew" data-editor-off>${I("power")}<span class="ofl"><span>Disable</span> <span>new design</span></span></button></div></div></div>`);
  placeSeg3(); centreIcons($("pickGrid"));
  $("barOrd").disabled = !customOrder;
  fitMenuSoon();
}
// Reset order sits in the top bar while the menu is open, between its title and search (Max, Nov 24: its own
// line under the cards cost them room; web and app alike). press.js askOrderReset; greyed out until the
// screens have been moved.
{ const b = document.createElement("button"); b.id = "barOrd"; b.className = "ordreset barord"; b.dataset.orderReset = ""; b.title = "Hold a screen to move it. This restores Morphe's order.";
  b.innerHTML = `${I("reset")}Reset order`; b.onclick = () => askOrderReset(); $("btnSearch").before(b); }
// An icon's drawing rarely fills its 24 px box evenly (a gear sits a little low, a play triangle to one
// side), so an icon centred by its box looks off centre in a round pill: each one is moved so the
// drawing itself is centred (Max, Nov 24: "slightly offset downwards"). For any .pi icon, whatever the set.
// Menu icons sit in the middle of their round pill by what is drawn, not by the icon's 24-unit box and not
// by the outline's box either (round 137: the gauge still sat low and to the right, its outline box is not
// where its ink is). Each drawing is painted once into a small canvas, the box of its solid pixels gives the
// offset (kept per drawing), and the shift is rounded to whole device pixels so a 1x screen does not smear it.
const ICON_INK = new Map();
function inkOffset(svg, done) {
  const key = svg.innerHTML + "|" + svg.getAttribute("viewBox");
  if (ICON_INK.has(key)) { const v = ICON_INK.get(key); if (Array.isArray(v)) done(v); else v.push(done); return; }
  const wait = [done]; ICON_INK.set(key, wait);
  const finish = off => { ICON_INK.set(key, off); wait.forEach(f => f(off)); };
  const vb = svg.viewBox.baseVal, W = vb.width || 24, H = vb.height || 24, N = 96;
  const fallback = () => { try { const b = svg.getBBox(); finish([vb.x + W / 2 - (b.x + b.width / 2), vb.y + H / 2 - (b.y + b.height / 2)]); } catch { ICON_INK.delete(key); } };
  try {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d");
        g.drawImage(img, 0, 0, N, N); const d = g.getImageData(0, 0, N, N).data;
        let x0 = N, x1 = -1, y0 = N, y1 = -1;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) return fallback();
        finish([(N / 2 - (x0 + x1 + 1) / 2) * W / N, (N / 2 - (y0 + y1 + 1) / 2) * H / N]);
      } catch { fallback(); }
    };
    img.onerror = fallback;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${W} ${H}" width="${N}" height="${N}" fill="#fff">${svg.innerHTML}</svg>`);
  } catch { fallback(); }
}
function centreIcons(root) {
  root.querySelectorAll(".pi > svg").forEach(s => inkOffset(s, ([ux, uy]) => {
    if (!s.isConnected) return;
    const k = (parseFloat(getComputedStyle(s).width) || 20) / (s.viewBox.baseVal.width || 24), dpr = window.devicePixelRatio || 1, snap = v => Math.round(v * k * dpr) / dpr;
    const dx = snap(ux), dy = snap(uy);
    s.style.translate = dx || dy ? `${dx}px ${dy}px` : "";
  }));
}
// ---- DEV ONLY: "finished" checkmarks -------------------------------------------------------------
// Screens Max has signed off ("lock it"). Shown as a small check in the screen menu and on the tabs.
// To remove before shipping: delete this block, the .devdone CSS rule, and the three devMark /
// devMarkGroup calls (screen menu card, group card, tab).
const DEV_DONE = new Set(["player", "seekbar", "fullscreen", "flyout", "endscreen", "playback", "behaviour", "captions", "sponsorblock"]); // section ids, e.g. "player"
// settings Max approved without a preview: a tab id approves all of its settings that have none, a key one setting
const NO_PREVIEW_OK = new Set(["fullscreen", "player", "morphe_custom_seekbar_thumb_file", "morphe_swipe_seek_sensitivity"]);
const devMark = id => DEV_DONE.has(id) ? `<span class="devdone" title="Finished (development marker)">✓</span>` : "";
const devMarkGroup = g => tabsOf(g).length && tabsOf(g).every(([id]) => DEV_DONE.has(id)) ? devMark(tabsOf(g)[0][0]) : "";
// Click a title with the mouse to copy it in quotes ("Open advanced quality menu"), for writing feedback
// faster. Only in the web preview (no MorpheApp bridge) and only for a mouse, so a phone never sees it.
const DEV_WEB = typeof window.MorpheApp === "undefined";
function devCopy(t, x, y) {
  t = String(t).replace(/✓/g, "").replace(/\s+/g, " ").trim(); if (!t) return;
  const q = `"${t}"`, done = () => { const n = document.createElement("div"); n.className = "devcopy"; n.textContent = "Copied " + q; n.style.left = x + "px"; n.style.top = y + "px"; document.body.appendChild(n); setTimeout(() => n.remove(), 1100); };
  const old = () => { const ta = document.createElement("textarea"); ta.value = q; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { /* no clipboard */ } ta.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(q).then(done, old); else old();
}
document.addEventListener("click", e => {
  if (!DEV_WEB || e.pointerType !== "mouse" || !(e.target instanceof Element) || e.target.closest("#devTour")) return;
  const row = e.target.closest(".row .ttl") && e.target.closest("[data-row]"), res = e.target.closest(".sres .ttl") && e.target.closest("[data-res]");
  const plain = e.target.closest(".gc-t, .tab7, .pick .pt, .sit, .gtitle, #canvas .cap");
  // (a row in an area box shows its title shortened: "'New posts'" is copied as shown, not with "button")
  const inBox = row && row.closest(".shared[data-area]"), shownTtl = inBox && row.querySelector(".ttl");
  const t = row ? (shownTtl ? shownTtl.textContent : shownTitle(row.dataset.row)) : res ? title(res.dataset.res) : plain ? plain.textContent : "";
  if (t) devCopy(t, e.clientX, e.clientY);
}, true);
// Animation tour: step through every setting that has an animation (a two-phone comparison or a live
// preview animation), tab by tab in menu order, with the buttons, the arrow keys or the mouse wheel over
// the bar. Each step opens the setting the way a search result does. Click the name to copy it.
function tourKeys() {
  const ids = grouped ? GROUPS.flatMap(g => tabsOf(g).map(([t]) => t)) : SECTIONS.map(s => s.id), out = [];
  for (const id of ids) { const m = MEMBERS[id]; if (m) for (const k of [...m.live, ...m.misc]) if ((SCN[k] || DEMOS[k]) && inVersion(k) && !out.includes(k)) out.push(k); }
  return out;
}
// The tour keeps its own place (Max, Nov 25: it jumped to random numbers): it used to start each step from
// the selected setting, which a story, a parent or a screen still opening had often changed meanwhile.
let tourAt = -1;
function tourGo(d) {
  const ks = tourKeys(); if (!ks.length) return;
  let i = tourAt;
  if (i < 0 || i >= ks.length) { const s = ks.indexOf(selected); i = s < 0 ? (d > 0 ? -1 : ks.length) : s; }
  i = (i + d + ks.length) % ks.length; tourAt = i;
  goToSetting(ks[i]); tourLabel(ks[i], i, ks.length);
}
function tourLabel(k, i, n) {
  const b = document.getElementById("devTour"); if (!b) return;
  const sec = SECTIONS.find(z => z.id === sectionOf(k));
  b.querySelector(".dt-n").textContent = `${i + 1} / ${n} · ${sec ? sec.title : ""}`;
  const nm = b.querySelector(".dt-k"); nm.textContent = shownTitle(k); nm.dataset.k = k;
}
function tourOpen(open) {
  let b = document.getElementById("devTour");
  if (!b) {
    b = document.createElement("div"); b.id = "devTour";
    b.innerHTML = `<button class="dt-go" data-d="-1" aria-label="Previous animation">‹</button><div class="dt-mid"><div class="dt-n">Animation tour</div><div class="dt-k" title="Click to copy">Press › to start</div></div><button class="dt-go" data-d="1" aria-label="Next animation">›</button><button class="dt-x" aria-label="Close the tour">×</button>`;
    document.body.appendChild(b);
    b.addEventListener("click", e => {
      const go = e.target.closest(".dt-go"), x = e.target.closest(".dt-x"), nm = e.target.closest(".dt-k");
      if (go) tourGo(Number(go.dataset.d)); else if (x) tourOpen(false); else if (nm && nm.dataset.k) devCopy(nm.textContent, e.clientX, e.clientY);
    });
    let wheelAt = 0;
    b.addEventListener("wheel", e => { e.preventDefault(); const now = performance.now(); if (now - wheelAt < 350 || !e.deltaY) return; wheelAt = now; tourGo(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  }
  b.hidden = !open; document.getElementById("devTourBtn").hidden = open;
  if (open) { const ks = tourKeys(), i = selected ? ks.indexOf(selected) : -1; tourAt = i; if (i >= 0) tourLabel(selected, i, ks.length); }
}
document.addEventListener("keydown", e => {
  const b = document.getElementById("devTour"); if (!b || b.hidden || e.target.closest?.("input, textarea, [contenteditable]")) return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); tourGo(1); }
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); tourGo(-1); }
});
if (DEV_WEB) window.addEventListener("load", () => {
  const t = document.createElement("button"); t.id = "devTourBtn"; t.textContent = "▶ Tour"; t.title = "Step through every animation (development tool)";
  t.onclick = () => tourOpen(true); document.body.appendChild(t);
});
// To remove before shipping: delete everything from "Click a title" to here, and the .devcopy and
// #devTour CSS rules.
// ---- end DEV ONLY ---------------------------------------------------------------------------------
function renderTabs() {
  const box = $("tabs"); if (!box) return;
  $("stick").classList.toggle("grouped", grouped);
  if (!grouped) { box.innerHTML = ""; return; }
  const g = groupOf(section), tabs = tabsOf(g), key = tabs.map(x => x[0]).join(" ");
  if (box.dataset.key === key && box.children.length) { if (box.dataset.sel !== section) markTab(section); return; }
  glideStop(box);
  paint(box, tabs.map(([id, t]) => `<button class="tab7" role="tab" data-tab="${id}" aria-selected="${id === section}"><span class="ol"><span class="tx">${esc(t)}</span>${devMark(id)}</span></button>`).join(""));
  box.dataset.key = key; box.dataset.sel = section;
  const cur = box.querySelector('[aria-selected="true"]');
  if (cur) box.scrollTo({ left: cur.offsetLeft - (box.clientWidth - cur.offsetWidth) / 2, behavior: "smooth" });
}
// The selected tab moves at the tap (the screen follows a moment later): its fill glides from the old
// tab to the new one (glideRun), the labels stay above it (.ol)
function markTab(id) {
  const box = $("tabs"), old = box.querySelector('[aria-selected="true"]'), was = old && (glideNow(box) || gRect(old, box));
  glideStop(box);
  const tabs = box.querySelectorAll(".tab7");
  // the tabs change colour at once (the glide is the motion): read with a transition running, the new
  // tab's fill was still the old dark one, so the glide was dark and the tab turned white only after it
  settled(tabs, () => { tabs.forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === id))); box.dataset.sel = id; });
  const cur = box.querySelector('[aria-selected="true"]'); if (!cur) return;
  if (was) { const cs = getComputedStyle(cur); glideRun(box, was, gRect(cur, box), { bg: settledBg(cur), rim: settledRim(cur), radius: parseFloat(cs.borderTopLeftRadius) || 0, z: 0, done: () => { cur.style.transitionProperty = "transform"; requestAnimationFrame(() => { cur.style.transitionProperty = ""; }); } }); }
  box.scrollTo({ left: cur.offsetLeft - (box.clientWidth - cur.offsetWidth) / 2, behavior: "smooth" });
}
// Screen menu order: Morphe's own order by default (its settings screens, then their sub-screens);
// hold a card to drag it somewhere else. The custom order is saved; Reset order restores Morphe's.
let customOrder = null, morpheOrder = [];
function computeMorpheOrder() {
  const titleOf = scr => (CAT.screens && CAT.screens[scr]) || scr || "~";
  const rank = id => {
    const m = MEMBERS[id]; const keys = m ? [...m.live, ...m.misc] : [];
    if (!keys.length) return "~~";
    const count = {}; keys.forEach(k => { const p = PREF[k]; const t = titleOf(p.screen) + "|" + (p.subScreenTitle || ""); count[t] = (count[t] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  };
  morpheOrder = [...SECTIONS].map(s => [s.id, s.id === "misc" ? "~~~" : rank(s.id)]).sort((a, b) => a[1].localeCompare(b[1])).map(x => x[0]);
}
function applyOrder() {
  if (!morpheOrder.length) computeMorpheOrder();
  const ids = customOrder ? [...customOrder.filter(id => SECTIONS.some(s => s.id === id)), ...morpheOrder.filter(id => !customOrder.includes(id))] : morpheOrder;
  const all = [...SECTIONS]; SECTIONS.length = 0;
  ids.forEach(id => { const s = all.find(x => x.id === id); if (s && !SECTIONS.includes(s)) SECTIONS.push(s); });
  all.forEach(s => { if (!SECTIONS.includes(s)) SECTIONS.push(s); });
}
let pickDrag = null, pickSuppress = false;
$("pickGrid").addEventListener("pointerdown", e => {
  const card = e.target.closest(".pick"); if (!card || e.button > 0) return;
  pickDrag = { card, x: e.clientX, y: e.clientY, on: false, t: setTimeout(() => {
    if (!pickDrag) return; pickDrag.on = true; card.classList.add("lifted"); card.parentElement.classList.add("arranging");
    try { card.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    tapFeel("lift");
  }, LONG) };
});
$("pickGrid").addEventListener("pointermove", e => {
  if (!pickDrag) return;
  if (!pickDrag.on) { if (Math.hypot(e.clientX - pickDrag.x, e.clientY - pickDrag.y) > 10) { clearTimeout(pickDrag.t); pickDrag = null; } return; }
  e.preventDefault();
  const { card } = pickDrag, grid = card.parentElement;
  card.style.transform = `translate(${e.clientX - pickDrag.x}px, ${e.clientY - pickDrag.y}px) scale(1.04)`;
  // hit-test on layout boxes (not transformed ones, which are mid-slide)
  const g = grid.getBoundingClientRect(), px = e.clientX - g.left, py = e.clientY - g.top;
  const over = [...grid.children].find(c => c !== card && px >= c.offsetLeft && px <= c.offsetLeft + c.offsetWidth && py >= c.offsetTop && py <= c.offsetTop + c.offsetHeight);
  if (over) {
    const before = { left: card.offsetLeft, top: card.offsetTop };
    const list = [...grid.children]; const after = list.indexOf(over) > list.indexOf(card);
    // FLIP the siblings so they slide into place
    const first = new Map(list.map(c => [c, [c.offsetLeft, c.offsetTop]]));
    grid.insertBefore(card, after ? over.nextSibling : over); tapFeel("snap");
    list.forEach(c => { if (c === card) return; const [l, t] = first.get(c); if (l !== c.offsetLeft || t !== c.offsetTop) c.animate([{ transform: `translate(${l - c.offsetLeft}px, ${t - c.offsetTop}px)` }, { transform: "none" }], { duration: 180, easing: "cubic-bezier(.2,0,0,1)" }); });
    pickDrag.x += card.offsetLeft - before.left; pickDrag.y += card.offsetTop - before.top;
    card.style.transform = `translate(${e.clientX - pickDrag.x}px, ${e.clientY - pickDrag.y}px) scale(1.04)`;
  }
}, { passive: false });
function endPickDrag() {
  if (!pickDrag) return;
  clearTimeout(pickDrag.t);
  if (pickDrag.on) {
    const { card } = pickDrag; card.classList.remove("lifted"); card.parentElement.classList.remove("arranging");
    card.animate([{ transform: card.style.transform }, { transform: "none" }], { duration: 160, easing: "cubic-bezier(.2,0,0,1)" }); card.style.transform = "";
    customOrder = [...$("pickGrid").querySelectorAll(".pick")].map(c => c.dataset.sec);
    if (JSON.stringify(customOrder) === JSON.stringify(morpheOrder.filter(id => customOrder.includes(id)))) customOrder = null;
    applyOrder(); store.save(); pickSuppress = true; setTimeout(() => { pickSuppress = false; }, 50);
    document.querySelectorAll("[data-order-reset]").forEach(rb => { rb.disabled = !customOrder; });
  }
  pickDrag = null;
}
$("pickGrid").addEventListener("pointerup", endPickDrag);
$("pickGrid").addEventListener("pointercancel", endPickDrag);
$("pickGrid").addEventListener("contextmenu", e => { if (e.target.closest(".pick")) e.preventDefault(); });
let pickFrom = null; // the button the screen menu grew out of (the pill, or App view's back arrow); it closes into it
// src: the button the menu grows from (default: the button just tapped, else the screen pill); null: no
// growth at all, the menu is already in place (the app's Back swipe drew it behind the screen, Max Nov 25:
// it popped in a second time, from whatever button the swipe started on)
function setPicker(open, src) {
  const was = pickerOpen; pickerOpen = open;
  if (open && pickDirty) paintPicker(); // a change made in a screen, not drawn yet
  if (open && !was) { const t = cardTap && performance.now() - cardTap.t < 1500 && cardTap.el; pickFrom = src !== undefined ? src : t && t.matches("button") && !t.closest("#picker") ? t : $("secPill"); cardTap = null; }
  $("picker").classList.toggle("open", open); $("pickScrim").classList.toggle("open", open);
  if (open !== was && src !== null && !(open && !pickFrom)) popFrom($("picker"), pickFrom || $("secPill"), open, null, "--spring-soft");
  if (open) { placeSeg3(); glassSample(); } // drawn while hidden: its thumb is placed once it can be measured
  $("secPill").setAttribute("aria-expanded", String(open));
  document.documentElement.classList.toggle("pickopen", open);
  if (open) fitMenu();
}
// The card menu fills its space without scrolling while screens are grouped into tabs (Max, Nov 24: on
// a 6.8" phone it was a little longer than the screen; the web view's menu the same). The group cards take the height the rows under
// them leave, split evenly, and their contents are zoomed to it: smaller on a shorter screen (or larger
// text), a little larger on a taller one, never below MENU_ZOOM[0] (then the menu scrolls) or above [1].
const MENU_ZOOM = [.7, 1.2];
function fitMenu() {
  const grid = $("pickGrid"), pk = $("picker"), pg = grid.querySelector(".pg.pgroups");
  if (!pg || !pk.clientHeight) { if (!pg) grid.classList.remove("gfit"); return; }
  grid.classList.remove("gfit");
  const cards = [...pg.children]; if (!cards.length) return;
  // columns as laid out (two; three on a phone turned sideways, app.css)
  const cols = Math.max(1, getComputedStyle(pg).gridTemplateColumns.split(" ").filter(Boolean).length);
  const nat = Math.max(...cards.map(c => c.offsetHeight)), rows = Math.ceil(cards.length / cols);
  const gs = getComputedStyle(grid), ps = getComputedStyle(pk), gap = parseFloat(gs.rowGap) || 0, rgap = parseFloat(getComputedStyle(pg).rowGap) || 0;
  // the rows under the cards, however they are laid out (one under the other, or two side by side): their extent
  // (layout boxes, not screen rects: the menu grows from its button with a scale, and rects measured
  // mid-growth were smaller, so the cards were fitted too tall and the menu scrolled)
  const others = [...grid.children].filter(k => k !== pg && k.offsetHeight);
  const mg = (k, side) => parseFloat(getComputedStyle(k)["margin" + side]) || 0;
  const rest = others.length ? Math.max(...others.map(k => k.offsetTop + k.offsetHeight + mg(k, "Bottom"))) - Math.min(...others.map(k => k.offsetTop - mg(k, "Top"))) : 0;
  const avail = pk.clientHeight - parseFloat(ps.paddingTop) - parseFloat(ps.paddingBottom) - rest - (rest ? gap : 0);
  // larger only while every line still fits its card's width: a zoomed card is narrower in its own px
  // (W / z), and the rail and paddings beside the words keep their size in them
  // Words are measured in layout px: the menu may be mid-growth from its button (popFrom scales it), and a
  // scaled word read narrower, so the cards were zoomed past their width ("Seekbar & ge…" in the web view)
  // and refitted bigger or smaller once the growth ended (the text resized after a Back to the menu).
  let wide = MENU_ZOOM[1];
  const was = parseFloat(grid.style.getPropertyValue("--gz")) || 0;
  grid.style.removeProperty("--gz");
  cards.forEach(c => { const k = c.getBoundingClientRect().width / c.offsetWidth || 1; c.querySelectorAll(".gc-t, .gc-tabs span").forEach(el => { const r = document.createRange(); r.selectNodeContents(el); const w = r.getBoundingClientRect().width / k; if (w > 0) wide = Math.min(wide, c.offsetWidth / (w + c.offsetWidth - el.clientWidth)); }); });
  // sideways the screen is too short for the whole menu: the cards keep their size (and the menu scrolls)
  // instead of shrinking to small print
  const sideways = pk.clientWidth > pk.clientHeight * 1.5;
  const fit = Math.max((avail - rgap * (rows - 1)) / rows, sideways ? nat : 0);
  // every card's longest line fits its width (Max, Nov 25: "Seekbar & ge…", "Flying comm…" were cut): the
  // one zoom for all cards is never more than the narrowest fit allows, even below the usual smallest
  const want = fit / nat, z0 = Math.max(.5, Math.min(want < 1 ? Math.max(MENU_ZOOM[0], want) : want, wide * .99));
  // a refit that only differs by rounding keeps the zoom it has: no visible resize of the menu's text
  const z = was && Math.abs(z0 - was) < .012 && z0 >= was - .012 && was <= wide * .99 ? was : z0;
  const rowH = Math.max(nat * MENU_ZOOM[0], fit);
  // height the zoom leaves over goes between the lines (up to 4.5 px each), the rest stays below them
  const spare = Math.max(0, rowH / z - nat), most = Math.max(...cards.map(c => c.querySelectorAll(".gc-tabs span").length), 1);
  grid.style.setProperty("--gcl", (16.5 + Math.min(4.5, spare / (most + 1))).toFixed(2) + "px");
  grid.style.setProperty("--gch", Math.floor(rowH) + "px"); grid.style.setProperty("--gz", z.toFixed(4));
  grid.classList.add("gfit");
}
// (paintPicker fits, and once more on the next frame: the cards' words can still change width after the first layout)
let fitRaf = 0;
const fitMenuSoon = () => { fitMenu(); cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitMenu); };
window.addEventListener("load", () => { fitMenu(); setTimeout(fitMenu, 700); setTimeout(fitMenu, 1600); }); // and once the page has settled (late styles and fonts)
if (window.ResizeObserver) new ResizeObserver(() => fitMenu()).observe($("picker"));
if (document.fonts) { document.fonts.addEventListener("loadingdone", () => fitMenu()); document.fonts.ready.then(() => fitMenu()); } // words measured in the final font

let stageHold = 0;
let renderCount = 0;
let stageStale = false; // the preview skipped a redraw while a comparison covered it (select.js)
// One preview height (Max, Nov 25: the previews' heights differed from tab to tab). The player-type previews
// (a 16:9 video: Player, SponsorBlock, Flying comments, Seekbar, Fullscreen, Captions, End screen) and Shorts
// (a full phone screen) keep their own; every other preview is SCENE_H tall, the tallest of them before.
const SCENE_H = 350;
const ownHeight = root => root.matches(".video") || root.id === "shortsStage";
function renderStage() {
  if (stageHold) return;
  stageStale = false;
  const st = $("stage");
  const scene = SCENES[section];
  $("stick").hidden = !scene && !grouped;
  $("stick").classList.toggle("noscene", !scene);
  if (!scene) { st.innerHTML = ""; return; }
  const same = st.dataset.sec === section; st.dataset.sec = section; renderCount++;
  if (!same) { ghosts.clear(); fading.clear(); }
  const scrollers = same ? [...st.querySelectorAll(".inner-scroll")].map(e => e.scrollTop) : [];
  const hscroll = same ? [...st.querySelectorAll("[data-hs]")].map(e => e.scrollLeft) : [];
  st.className = "stage" + (mode === "orig" ? " original" : "");
  // a custom seekbar colour shows on every seekbar, not only on its own screen
  st.style.setProperty("--seek-1", V("morphe_seekbar_custom_color") ? String(V("morphe_seekbar_custom_color_primary") || "") : "");
  // the Player menu: switching between the menu and one of its sheets plays like a user opening it
  const flyFrom = same && section === "flyout" ? { sub: st.dataset.flysub || "", html: st.querySelector(".inner-scroll")?.outerHTML, top: st.querySelector(".inner-scroll")?.scrollTop || 0 } : null;
  // greying is a mark pass (see paint): set after a style read, .fixed7 played its opacity transition and
  // every redraw faded the greyed parts (times, seekbar, Cast): Player icon style, Max, Nov 23
  paint(st, scene().replace(/background:#0f0f0f/g, "background:var(--app-bg,#0f0f0f)"), markFixed, fillFingers);
  const root = st.firstElementChild; if (root && !ownHeight(root)) root.style.height = SCENE_H + "px";
  if (section === "flyout") { st.dataset.flysub = flySub || ""; if (flyFrom && flyFrom.html && flyFrom.sub !== (flySub || "")) flyTransition(st, flyFrom, flySub || ""); }
  st.querySelectorAll(".inner-scroll").forEach((e, i) => { if (scrollers[i]) e.scrollTop = scrollers[i]; });
  st.querySelectorAll('[style*="overflow-x:auto"]').forEach((e, i) => { e.dataset.hs = ""; if (hscroll[i]) e.scrollLeft = hscroll[i]; });
  hugComponents(st);
  st.querySelectorAll(".c").forEach(fitRing);
  const sel = st.querySelector(".c.sel"); if (sel) watchRing(sel); wakeRings();
  // a part the selected setting just added but that is no part of its own (the action buttons of Feed card
  // layout's longest option) is scrolled into the preview, or the change happens below its edge unseen
  const fo = selected && st.querySelector(`[data-focus="${selected}"]`);
  if (fo) { const sc = fo.closest(".inner-scroll"); if (sc) { const r = fo.getBoundingClientRect(), b = sc.getBoundingClientRect(); if (r.top < b.top + 4 || r.bottom > b.bottom - 4) sc.scrollTo({ top: sc.scrollTop + (r.top + r.height / 2) - (b.top + b.height / 2), behavior: "smooth" }); } }
}
// Opening a sheet: the menu row is tapped, the menu slides down and the sheet slides up, as in the
// app. Going back to the menu plays it the other way. The old sheet is a copy without settings on it.
const FLY_ROW = { quality: "morphe_hide_player_flyout_quality", captions: "morphe_hide_player_flyout_captions", audio: "morphe_hide_player_flyout_audio_track" };
// the menu row lighting up, the old sheet sliding down, the pause before the new one, its slide up (ms)
const FLY_MS = { tap: 182, out: 168, gap: 140, in: 224 };
function flyTransition(st, from, to) {
  const sheet = st.querySelector(".inner-scroll"); if (!sheet) return;
  const t = document.createElement("div"); t.innerHTML = from.html; const old = t.firstElementChild; if (!old) return;
  old.classList.remove("inner-scroll"); old.style.pointerEvents = "none"; old.style.zIndex = "6";
  const tapRow = to && old.querySelector(`[data-k="${FLY_ROW[to]}"]`);
  old.querySelectorAll("[data-k], [data-also]").forEach(e => { e.removeAttribute("data-k"); e.removeAttribute("data-also"); e.classList.remove("sel", "flash", "selx"); });
  sheet.after(old); old.scrollTop = from.top;
  const T = FLY_MS, ease = "cubic-bezier(.2,0,0,1)", wait = tapRow ? T.tap : 0;
  if (tapRow) { tapRow.style.transition = `background ${T.tap * .7}ms`; requestAnimationFrame(() => { tapRow.style.background = "rgba(255,255,255,.14)"; }); }
  sheet.style.transform = "translateY(100%)";
  old.animate([{ transform: "none" }, { transform: "translateY(100%)" }], { duration: T.out, delay: wait, easing: "cubic-bezier(.3,0,1,1)", fill: "forwards" }).onfinish = () => old.remove();
  const a = sheet.animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: T.in, delay: wait + T.gap, easing: ease, fill: "backwards" });
  sheet.style.transform = "";
  const ring = () => { try { wakeRings(); } catch { /* not loaded */ } };
  [0, wait + T.gap, wait + T.gap + T.in].forEach(ms => setTimeout(ring, ms)); a.onfinish = ring;
}
// Parts of the preview that no setting on this screen changes are greyed out: plain controls (the
// play button, the time, a seekbar that belongs to another tab) and components of other screens.
const FIXED_SEL = ".pbtn, .bigbtn, .time, .seek, .chip, svg.ico, .tb, .badge-txt";
const fillFingers = st => st.querySelectorAll(".finger").forEach(f => { if (!f.firstChild) f.innerHTML = I("gesture"); });
function markFixed(st) {
  const mine = new Set(sectionKeys()), ours = e => mine.has(e.dataset.k) || (e.dataset.also || "").split(" ").some(x => mine.has(x));
  const cs = [...st.querySelectorAll(".c[data-k]")];
  cs.forEach(c => { if (!ours(c) && !c.classList.contains("ghost") && !c.querySelector("[data-k], [data-also]") && !c.closest(".finger")) c.classList.add("fixed7"); });
  st.querySelectorAll(FIXED_SEL).forEach(e => {
    const host = e.closest(".c[data-k]");
    if (host) return; // inside a component: it follows that component (greyed above if it isn't ours)
    if ([...e.querySelectorAll("[data-k], [data-also]")].some(ours)) return;
    if (e.parentElement.closest(".fixed7")) return;
    e.classList.add("fixed7");
  });
}
// Many components are drawn as a wrapper around one card that carries its own margins. The outline,
// flash and ghost dashes belong to the card, not to the full-width wrapper, so move the card's margins
// (and its corner radius) onto the wrapper. Layout stays the same.
const MARGINS = ["marginTop", "marginRight", "marginBottom", "marginLeft"];
// Performance (Max, Nov 22): every card is read first and changed after, so the preview is laid out once
// instead of once per card (a read after a change makes the browser redo the layout).
function hugComponents(root) {
  const moves = [];
  root.querySelectorAll(".c").forEach(c => {
    if (c.children.length !== 1 || c.childNodes.length > 1 && [...c.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const ch = c.firstElementChild, cs = ch.style;
    if (!MARGINS.some(m => cs[m]) || c.style.padding || c.style.background) return;
    const own = getComputedStyle(ch);
    moves.push([c, ch, MARGINS.map(m => own[m]), own.borderTopLeftRadius]);
  });
  moves.forEach(([c, ch, ms, rad]) => {
    MARGINS.forEach((m, i) => { if (ms[i] && ms[i] !== "0px" && ms[i] !== "auto") { c.style[m] = ms[i]; ch.style[m] = "0px"; } });
    if (rad !== "0px") c.style.borderRadius = rad;
  });
  // a left-aligned card narrower than its block wrapper: shrink the wrapper to the card
  [...root.querySelectorAll(".c.blk, div.c")].filter(hugsNarrow).forEach(c => { c.style.width = "fit-content"; });
}
function hugsNarrow(c) {
  if (c.children.length !== 1 || c.style.width) return false;
  const r = c.getBoundingClientRect(), q = c.firstElementChild.getBoundingClientRect();
  if (!r.width || q.width > r.width - 6 || Math.abs(q.left - r.left) > 1) return false;
  const cs = getComputedStyle(c); return cs.display === "block" && !getComputedStyle(c.parentElement).display.includes("flex");
}
function hugWidth(c) { if (hugsNarrow(c)) c.style.width = "fit-content"; }

function stateChip(k) {
  const a = A[k], p = PREF[k], v = V(k);
  if (p.type === "boolean") {
    if (a && (a.kind === "vis" || a.kind === "overlay")) return shown(k) ? `<span class="state on">Shown</span>` : `<span class="state off">Hidden</span>`;
    return v ? `<span class="state on">On</span>` : `<span class="state">Off</span>`;
  }
  return "";
}
function summaryFor(k) { const p = PREF[k]; const v = V(k);
  // a list drawn as toggles (listChoices): Morphe's "Enter ... separated by new lines" would ask for typing
  if (p.type === "string" && isListBox(k) && !listJSON(k) && !listNumeric(k) && listNames(k)) return "Hide takes out everything whose title contains the name";
  if (p.type === "boolean") return cleanSum(k, fmtSum(k, (v ? p.summaryOn : p.summaryOff) || p.summary || "")); return fmtSum(k, p.summary || ""); }
// "Disable X" reads "X" in the clean design, with On on the left and Off on the right, but Morphe's
// description still tells what turning it on does ("Disables playlist and live chat panels from opening
// automatically" under "Player popup panels: On | Off" said the opposite of the toggle; Max, Nov 23, again).
// One rule for every such setting: the description names the state it describes ("Off: disables ...").
// A setting with its own On and Off descriptions keeps them.
// A description that says what the switch prevents by doing something ("Prevents dragging ...") reads as what
// On allows instead, with no state in front (Max, Nov 28: remove the "Off" tag from Drag and drop and Horizontal
// drag gesture). Others ("Prevents feeds from refreshing ...") would not read right turned round, and keep it.
function cleanSum(k, t) {
  const p = PREF[k], c = design === "clean" && cleanOf(k);
  if (!t || !c || c.labels[0] !== "On" || p.summaryOn || p.summaryOff) return t;
  if (/^prevents [a-z]+ing\b/i.test(t)) return "Allows " + t.replace(/^prevents\s+/i, "");
  return `${c.labels[1]}: ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}
// Morphe fills some descriptions at run time (String.format: "Saved videos: %s"). The preview fills the
// same slots, in every place a description shows, so a raw %s never reaches the screen: the setting's own
// value when it has one, else a stand-in from FMT_FILL (slot 1, 2, ...), else an ellipsis.
const FMT_FILL = { morphe_loop_count_clear: ["0"], morphe_series_tracker_completion: ["90", "30"], morphe_export_download_folder: ["Download"] };
function fmtSum(k, t) {
  if (!/%(\d+\$)?[sd]/.test(t)) return t;
  const v = V(k), own = v !== undefined && v !== null && v !== "" && typeof v !== "boolean" ? String(v) : null, fill = FMT_FILL[k] || [];
  let n = 0;
  return t.replace(/%%|%(\d+\$)?[sd]/g, (m, pos) => m === "%%" ? "%" : (i => own ?? fill[i] ?? "…")(pos ? parseInt(pos, 10) - 1 : n++));
}
const RANGES = { font_size: [8, 48], travel_duration: [2, 15], width_dip: [100, 400], caption_scale: [50, 300], corner_radius: [0, 24], blur: [0, 100], smoothing: [0, 100], dim_duration: [0, 10] };
const sameVal = (a, b) => String(a) === String(b) || (a !== "" && b !== "" && a != null && b != null && !isNaN(a) && !isNaN(b) && Number(a) === Number(b));
function controlFor(k) {
  const p = PREF[k]; const v = V(k); const dis = !parentsOk(k) ? "disabled" : "";
  let ents = entriesFor(k).filter(e => !(OFF_LIST.has(k) && e.value === "off"));
  // The default (the grey pill) always leads on the far left of a row of choices (Max, Nov 24: Expandable
  // cards under videos, then Play next in queue type, whose default is Native queue). Lists that count
  // (speeds, qualities, sizes: most labels carry a number) keep their order, a default in the middle of a
  // scale would read wrong; so do the long ones drawn as a grid or a dropdown.
  // A default that turns the thing off (Disable) stays at the end where Morphe puts it (Max, Nov 24: Hook/Greetings
  // had Disable first while every other SponsorBlock row ends with it).
  const offDef = ents.some(e => sameVal(e.value, defaults[k]) && OFF_CHOICE.test(String(e.label)));
  if (ents.length > 1 && ents.length <= 8 && !offDef && !sameVal(ents[0].value, defaults[k]) && ents.filter(e => /\d/.test(String(e.label))).length * 2 < ents.length)
    ents = [...ents.filter(e => sameVal(e.value, defaults[k])), ...ents.filter(e => !sameVal(e.value, defaults[k]))];
  if (OFF_LIST.has(k) && String(v) === "off") return "";
  // up to 8 choices: a row of pills; 9 to 16 (icon styles, theme colours, qualities): a 3-column grid
  // of pills built from the same entries, so it follows whatever list Morphe ships; more: a dropdown
  if (ents.length && ents.length <= 16) return `<div class="ctl optgrid">${ents.map(e => `<button class="opt${NEG_WORD.has(String(e.label)) ? " neg" : ""}${sameVal(e.value, defaults[k]) ? " def" : ""}${OFF_CHOICE.test(String(e.label)) ? " offw" : ""}" data-set="${k}" data-val="${esc(e.value)}" aria-pressed="${sameVal(e.value, v)}" ${dis}><span class="ol">${esc(e.label)}</span></button>`).join("")}</div>`; // .ol: the label sits over the gliding colour, the colour over the pill borders
  // more than 16: a button that opens the choices as one of the editor's own dialogs (Max, Nov 25: the system's
  // dropdown was plain white in every design and had no pop-in), growing out of the button (openDialog)
  if (ents.length) { SEL_ENTS[k] = ents; const cur = ents.find(e => sameVal(e.value, v)); return `<div class="ctl"><button class="selbtn" data-selbtn="${k}" ${dis} aria-haspopup="listbox" aria-label="${esc(shownTitle(k))}"><span>${esc(cur ? cur.label : String(v ?? ""))}</span>${I("expand")}</button></div>`; }
  if (p.type === "integer" || p.type === "float" || p.type === "long") {
    const r = Object.entries(RANGES).find(([n]) => k.includes(n));
    // a range Morphe states in the description ("0-5000 ms", "(5-75)") makes a slider too, so a new
    // setting with one needs no entry here
    const sr = /\(?(\d+)\s*[-–]\s*(\d+)\s*(ms|dp|sp|%)?\)/.exec(String(p.summary || ""));
    // Morphe's own range and step (its SeekBarConfig, catalogue "range") win; the guesses below are for a
    // slider the catalogue does not know yet (Max, Nov 28: correctness pass, caption size went to 300% here
    // while Morphe stops at 150%)
    const sb = p.range;
    if (sb || r || sr || /opacity|scale|strength|display_area/.test(k)) {
      const [min, max] = sb ? [sb.min, sb.max] : r ? r[1] : sr ? [Number(sr[1]), Number(sr[2])] : [0, 100], step = sb && sb.step > 0 ? sb.step : 1;
      return `<div class="ctl side whl">${wheelHTML(k, min, max, step, v, dis)}<input class="wsrc" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-set="${k}" style="--pct:${max > min ? Math.round((v - min) / (max - min) * 1000) / 10 : 0}%;--pf:${max > min ? Math.round((v - min) / (max - min) * 1000) / 1000 : 0}" ${dis} tabindex="-1" aria-hidden="true"><span class="val" data-val-of="${k}">${v}</span></div>`;
    }
    // a number without a stated range: the same wheel, open-ended upward (and below 0 only if it already is)
    const st = p.type === "float" ? .05 : 1, n = Number(v) || 0;
    return `<div class="ctl side whl">${wheelHTML(k, Math.min(0, n), Infinity, st, n, dis)}<input class="wsrc" type="number" value="${v}" data-set="${k}" ${dis} tabindex="-1" aria-hidden="true" step="${st}"></div>`;
  }
  if (p.type === "string") {
    // Morphe opens the system file picker for these; the preview does the same (FILE_PICK: what each one takes)
    if (p.widget === "NonInteractivePreference" && /_file$/.test(k)) { const fp = FILE_PICK[k] || FILE_PICK.image; return `<div class="ctl side"><label class="opt filepick" ${dis ? 'aria-disabled="true"' : ""}>${I(fp.icon)}${v ? "Change " + fp.word : "Choose " + fp.word}<input type="file" accept="${fp.accept}" data-file="${k}" ${dis} hidden></label>${v ? `<span class="val">${esc(v)}</span>` : ""}</div>`; }
    if (/color/.test(k) && /^#/.test(String(v))) return `<div class="ctl side"><input type="color" value="#${String(v).slice(-6)}" data-set="${k}" ${dis} aria-label="${esc(shownTitle(k))}"><span class="val">${esc(v)}</span></div>`;
    if (isListBox(k)) return listBox(k, dis);
    return `<div class="ctl"><input type="text" value="${esc(v)}" data-set="${k}" ${dis} aria-label="${esc(shownTitle(k))}"></div>`;
  }
  return "";
}
// Settings that hold a list as text, one entry per line (speeds, filter words, channel whitelists):
// one shared editor for all of them. Each entry is a chip with a remove button, and a field at the end
// adds one (Enter or +). It reads and writes exactly Morphe's format, the entries joined by new lines,
// so Morphe parses what it always did.
// Only a list of words, names or numbers becomes chips (Max, Nov 25: "Edit video effects" in Miscellaneous,
// a setting this editor doesn't know that holds code, showed hundreds of removable pills of garbled code).
// Code, JSON objects, long lines or a very long list keep a plain text field (or Morphe's own editor, app-pre.js).
const LIST_MAX = 60;
const wordLine = t => t.length <= 80 && !/[{}<>;=\\`]|":|^\s*"|\b(function|return|var|const)\b/.test(t);
const isListBox = k => {
  if (PREF[k].type !== "string" || !(String(PREF[k].default ?? "").includes("\n") || /strings|phrases|speeds|whitelist|filter/.test(k))) return false;
  if (/_channel_whitelist$/.test(k)) return true;
  const v = String(V(k) ?? PREF[k].default ?? "");
  if (/^\s*[[{]/.test(v)) return false; // JSON that isn't a channel whitelist
  const items = listItems(k, v);
  return items.length <= LIST_MAX && items.every(wordLine);
};
const listNumeric = k => /speeds/.test(k);
// Channel whitelists are stored by Morphe as JSON ([{"id":"UC…","name":"Fjord & Timber"}]), not one per line.
// Their chips show the names and can be removed; channels are added from a video's ⋮ menu (Morphe needs the
// channel id), so they have no add field. Their format is kept exactly, so Morphe still parses it.
const listJSON = k => /_channel_whitelist$/.test(k);
function jsonEntries(v) { try { const a = JSON.parse(String(v || "[]")); return Array.isArray(a) ? a.filter(e => e && typeof e === "object") : []; } catch (e) { return []; } }
function listItems(k, from = V(k)) {
  if (listJSON(k)) return jsonEntries(from).map(e => String(e.name || e.id || "")).filter(Boolean);
  const v = String(from ?? "");
  // older or hand-typed values may use spaces or commas; Morphe's own default is one per line
  const parts = v.includes("\n") || !listNumeric(k) ? v.split("\n") : v.split(/[\s,]+/);
  return parts.map(x => x.trim()).filter(Boolean);
}
// A list whose Morphe description names its entries ("Enter a keyword or full name (e.g., Ask, Community,
// Hype, Listen)", Comments carousel filter) gets one toggle per name instead of typing (Max, Nov 25), two to
// a line like a family of switches. Hide adds the name as its own line, Show takes that line out, so the value
// stays Morphe's newline list and Morphe matches it as before (title.contains, case as written). A line that
// was typed before (or in Morphe) and isn't one of the names gets a toggle of its own, so nothing is lost;
// one switched to Show keeps its toggle until the editor reloads. The names are read from the description, of
// the setting or of its parent, so a name Morphe adds there shows up on its own.
const lchOff = {}; // names switched to Show in this visit that aren't Morphe's: their toggles stay
function listNames(k) {
  const src = [PREF[k].summary, ...(PREF[k].parents || []).map(x => PREF[x.key]?.summary)].map(t => /\(e\.g\.,?\s*([^)]+)\)/i.exec(String(t || ""))).find(Boolean);
  return src ? src[1].split(",").map(x => x.trim().replace(/\.$/, "")).filter(Boolean) : null;
}
function listChoices(k, dis) {
  const names = listNames(k), items = listItems(k);
  const all = [...names, ...items.filter(t => !names.includes(t)), ...(lchOff[k] || []).filter(t => !names.includes(t) && !items.includes(t))];
  const tog = (t, on) => design === "clean"
    ? `<button class="lt7" role="switch" data-lch="${esc(t)}" aria-checked="${on}" data-at="${on ? "l" : "r"}" data-tone="${on ? "neg" : "pos"}" ${dis} aria-label="${esc(t)}: ${on ? "Hide" : "Show"}"><i></i><span>Hide</span><span>Show</span></button>`
    : `<button class="sw" role="switch" data-lch="${esc(t)}" aria-checked="${on}" ${dis} aria-label="Hide ${esc(t)}"></button>`;
  return `<div class="ctl lch2" data-lst="${k}">${all.map(t => `<span class="lchc"><span class="lchn">${esc(t)}</span>${tog(t, items.includes(t))}</span>`).join("")}</div>`;
}
function listChoose(k, t) {
  const items = listItems(k), i = items.indexOf(t);
  if (i >= 0) { items.splice(i, 1); if (!listNames(k).includes(t)) (lchOff[k] ||= []).includes(t) || lchOff[k].push(t); }
  else { const names = listNames(k); items.push(t); items.sort((a, b) => (names.indexOf(a) + 1 || 1e3) - (names.indexOf(b) + 1 || 1e3)); }
  ensureMod(); touchSel(k); const before = state[k]; setPref(k, items.join("\n")); afterChange(k, before);
}
function listBox(k, dis) {
  if (!listJSON(k) && !listNumeric(k) && listNames(k)) return listChoices(k, dis);
  const items = listItems(k), num = listNumeric(k);
  const chips = items.map((t, i) => `<span class="lchip">${esc(t)}${num ? "×" : ""}<button class="lx" data-lx="${i}" ${dis} aria-label="Remove ${esc(t)}">${I("close")}</button></span>`).join("");
  if (listJSON(k)) return `<div class="ctl lst" data-lst="${k}">${chips}<span class="lhint">${items.length ? "Add more" : "No channels yet. Add one"} from a video's ⋮ menu: Whitelist channel</span></div>`;
  return `<div class="ctl lst" data-lst="${k}">${chips}
    <span class="ladd"><input class="lin" data-lin="${k}" ${dis} placeholder="${num ? "Add speed" : "Add entry"}" ${num ? 'inputmode="decimal"' : ""} aria-label="Add to ${esc(shownTitle(k))}"><button class="lplus" data-ladd="${k}" ${dis} aria-label="Add">${I("plus")}</button></span></div>`;
}
// returns an error to show, or null once the entry is added
function listAdd(k, raw) {
  const t = String(raw).trim(); if (!t) return null;
  const items = listItems(k);
  if (listNumeric(k)) { const n = Number(t.replace(",", ".")); if (!(n > 0 && n <= 8)) return "Enter a speed between 0.05 and 8"; if (items.some(x => Number(x) === n)) return "Already in the list"; items.push(String(n).includes(".") ? String(n) : n.toFixed(1)); if (!/cycle/.test(k)) items.sort((a, b) => a - b); } // a cycle keeps its order: it is the order taps go through
  else { if (items.includes(t)) return "Already in the list"; items.push(t); }
  listSet(k, items); return null;
}
function listRemove(k, i) {
  if (!listJSON(k)) { const items = listItems(k); items.splice(i, 1); return listSet(k, items); }
  const es = jsonEntries(V(k)).filter(e => e.name || e.id); es.splice(i, 1);
  ensureMod(); touchSel(k); const before = state[k]; setPref(k, es.length ? JSON.stringify(es) : ""); afterChange(k, before);
}
function listSet(k, items) { if (listJSON(k)) { ensureMod(); touchSel(k); const before = state[k]; setPref(k, items.length ? JSON.stringify(items.map(n => ({ id: n, name: n }))) : ""); afterChange(k, before); return; }
  ensureMod(); touchSel(k); const before = state[k]; setPref(k, items.join("\n")); afterChange(k, before); requestAnimationFrame(() => document.querySelector(`[data-lin="${k}"]`)?.focus({ preventScroll: true })); }
const whereOf = x => { const s = sectionOf(x); return s !== section ? ` (${esc(SECTIONS.find(z => z.id === s)?.title || "Miscellaneous")})` : ""; };
function shortNeed(k) {
  if (!classicParentsOk(k)) { const b = PREF[k].parents.find(x => x.mode === "not" ? !!state[x.key] : !state[x.key]) || PREF[k].parents[0]; return `Parent setting must be ${stateWord(b.key, b.mode !== "not")}`; }
  if (needsTablet(k)) return "Only on tablets and large screens";
  return /S\("/.test(String(PREF[k].availability || "")) ? "Parent setting must be enabled" : "Not available with the current settings";
}
function needText(k) {
  if (!classicParentsOk(k)) return "Needs " + PREF[k].parents.map(x => `“${esc(shownTitle(x.key))}” set to ${stateWord(x.key, x.mode !== "not")}${whereOf(x.key)}`).join(", ");
  if (needsTablet(k)) return deviceWhy(k); // one wording for every device lock
  const un = unmetClauses(k).map(clauseText).filter(Boolean);
  if (un.length) return "Needs " + un.join(" and ");
  const ap = (PREF[k].availabilityParents || []).filter(x => PREF[x]);
  return ap.length ? `Not available with the current ${ap.map(x => `“${esc(shownTitle(x))}”`).join(", ")}` : "Not available here";
}
// A Morphe availability rule split at its top-level "and"s, keeping the parts that are not met now (Max,
// Nov 25: Glass miniplayer needs a bar miniplayer AND the glass navigation bar; it said "one of these", led
// to the first only, and setting it left the card locked with nothing more to do). Each part names its
// settings and the values that unlock it, and the lock leads to the first part still unmet.
function splitAnd(rule) {
  let r = String(rule).trim();
  const wraps = t => { if (t[0] !== "(") return false; let d = 0, q = null; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === q && t[i - 1] !== "\\") q = null; continue; } if (c === '"' || c === "'") q = c; else if (c === "(") d++; else if (c === ")" && --d === 0 && i < t.length - 1) return false; } return true; };
  while (wraps(r)) r = r.slice(1, -1).trim();
  const out = []; let d = 0, q = null, from = 0;
  for (let i = 0; i < r.length; i++) { const c = r[i]; if (q) { if (c === q && r[i - 1] !== "\\") q = null; continue; } if (c === '"' || c === "'") q = c; else if (c === "(") d++; else if (c === ")") d--; else if (!d && c === "&" && r[i + 1] === "&") { out.push(r.slice(from, i).trim()); from = i + 2; i++; } }
  out.push(r.slice(from).trim());
  return out.filter(Boolean);
}
function unmetClauses(k) {
  const av = PREF[k] && PREF[k].availability; if (!av) return [];
  const get = x => (x in PREF ? V(x) : null);
  return splitAnd(av).filter(c => { try { return !evalRule(c, get); } catch { return true; } });
}
function clauseText(c) {
  const keys = [...new Set([...c.matchAll(/S\("([^"]+)"\)/g)].map(m => m[1]))].filter(x => PREF[x] && inVersion(x));
  if (!keys.length) return "";
  const label = (x, v) => (PREF[x].entries || []).find(e => String(e.value) === v)?.label;
  const one = x => {
    const vals = [...new Set([...c.matchAll(new RegExp(`S\\("${x}"\\)\\)?\\s*===?\\s*"([^"]*)"`, "g"))].map(m => m[1]))];
    if (vals.length) { const ls = vals.map(v => label(x, v)).filter(Boolean); return `“${esc(shownTitle(x))}” set to ${ls.length ? ls.join(" or ") : vals.join(" or ")}${whereOf(x)}`; }
    if (PREF[x].type === "boolean") return `“${esc(shownTitle(x))}” ${stateWord(x, !new RegExp(`!\\s*\\(?S\\("${x}"`).test(c))}${whereOf(x)}`;
    return `a different “${esc(shownTitle(x))}”${whereOf(x)}`;
  };
  return keys.length === 1 ? one(keys[0]) : (c.includes("||") ? "one of " : "") + keys.map(one).join(c.includes("||") ? " or " : " and ");
}
// The setting to visit so that k becomes available.
function blockerOf(k) {
  const p = PREF[k];
  if (!classicParentsOk(k)) return (p.parents.find(x => x.mode === "not" ? !!state[x.key] : !state[x.key]) || p.parents[0]).key;
  const un = unmetClauses(k), first = un.length ? [...un[0].matchAll(/[SD]\("([^"]+)"\)/g)].map(m => m[1]) : [];
  const cands = [...new Set([...first, ...availKeys(k)])].filter(x => PREF[x] && inVersion(x));
  // prefer a setting on this screen (e.g. a DeArrow title place) over one on another screen
  return cands.find(x => sectionOf(x) === section) || cands[0] || null;
}
const availKeys = k => [...new Set([...(PREF[k].availabilityParents || []), ...[...String(PREF[k].availability || "").matchAll(/[SD]\("([^"]+)"\)/g)].map(m => m[1])])].filter(x => x !== k);
const dependsOn = (k, parent) => PREF[k].parents.some(x => x.key === parent) || availKeys(k).includes(parent);
// The setting on another screen that k was unlocked through (via the popup): k then offers "More" to reach it again.
const borrowedParent = k => [...PREF[k].parents.map(x => x.key), ...availKeys(k)].find(x => borrowed[section] && borrowed[section].has(x) && sectionOf(x) !== section);

// Rows that are a button in Morphe (it runs something instead of storing a value) get a button here too.
// In the app a tap runs Morphe's own row (app-post.js, MorpheApp.action), so its dialog opens exactly as
// in the regular settings; the web preview shows the same dialog with Morphe's texts.
const ACTION_ROWS = {
  morphe_loop_count_clear: { btn: "Clear", icon: "reset", ask: "Clear saved loop counts?", msg: "The videos of your playlists forget their loop count, and Loop video no longer turns on when a playlist plays them", ok: "Clear", done: "Saved loop counts cleared" },
  morphe_pref_import_export: { btn: "Open", icon: "copy", run: () => importExportDialog() },
};
// Import / Export as Morphe's own dialog has it (AbstractPreferenceFragment.showImportExportTextDialog,
// Setting.exportToJson / importFromJSON): the settings that differ from their default, sorted by key, as
// JSON lines without the outer braces, editable; Export to file / Import from file; Save applies the text (a
// setting it names takes that value, every other setting goes back to its default), Copy copies it,
// Cancel closes. The messages are Morphe's. In the app Morphe's own dialog opens instead (app-post.js).
const IE_KINDS = new Set(["boolean", "integer", "long", "float", "string", "enum"]);
const ieKeys = () => Object.keys(PREF).filter(k => IE_KINDS.has(PREF[k].type));
function exportText() {
  const lines = ieKeys().filter(k => !sameVal(state[k], defaults[k])).sort().map(k => `${JSON.stringify(k)}:${JSON.stringify(state[k])}`);
  return lines.join(",\n");
}
function importText(text) {
  if (text === exportText()) return;
  let t = text.trim(), json;
  if (!/^\{/.test(t)) t = "{" + t + "}"; // Morphe adds the braces it leaves out of the export
  try { json = JSON.parse(t); if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("Not a JSON object"); }
  catch (e) { snack(`Import failed: ${e.message}`); return; }
  let n = 0;
  for (const k of ieKeys()) {
    if (k in json) { const v = coerceVal(k, json[k]); if (!sameVal(state[k], v)) { setPref(k, v); n++; } }
    else if (!sameVal(state[k], defaults[k])) { setPref(k, defaults[k]); n++; }
  }
  commit();
  snack(Object.keys(json).length ? `Imported ${n} settings` : "Morphe settings reset to default");
}
const SEL_ENTS = {}; // a long list's choices, as its button was drawn with them
function choiceDialog(k) {
  const ents = SEL_ENTS[k] || PREF[k].entries || [], v = V(k);
  openDialog(`<h2 id="dlgTitle">${esc(shownTitle(k))}</h2><div class="chlist" role="listbox" aria-labelledby="dlgTitle">${ents.map(e => `<button class="chopt" role="option" data-chv="${esc(e.value)}" aria-selected="${sameVal(e.value, v)}"><i class="rad"></i><span>${esc(e.label)}</span></button>`).join("")}</div>
    <div class="acts"><button class="dbtn tonal" id="dBack">Cancel</button></div>`);
  const box = $("dlgBox"), on = box.querySelector('.chopt[aria-selected="true"]'), list = box.querySelector(".chlist");
  if (on && list) list.scrollTop = on.offsetTop - list.clientHeight / 2 + on.offsetHeight / 2;
  $("dBack").onclick = closeDialog;
  list.onclick = e => {
    const b = e.target.closest(".chopt"); if (!b) return;
    list.querySelectorAll(".chopt").forEach(x => x.setAttribute("aria-selected", String(x === b))); tapFeel("tick");
    setTimeout(() => { closeDialog(); ensureMod(); const before = state[k]; setPref(k, coerce(k, b.dataset.chv)); afterChange(k, before); }, 140);
  };
}
function importExportDialog() {
  openDialog(`<h2 id="dlgTitle">Import / Export</h2><textarea class="iex" id="iexText" spellcheck="false" autocomplete="off"></textarea>
    <div class="iexrow"><button class="dbtn tonal" id="iexOut">Export to file</button><button class="dbtn tonal" id="iexIn">Import from file</button></div>
    <div class="acts"><button class="dbtn primary" id="iexSave">Save</button><button class="dbtn tonal" id="iexCopy">Copy</button><button class="dbtn tonal" id="dBack">Cancel</button></div>`);
  const ta = $("iexText"); ta.value = exportText();
  if (!ta.value) setTimeout(() => ta.focus(), 60); // nothing set yet: ready for pasting, as Morphe does
  $("iexSave").onclick = () => { const v = ta.value; closeDialog(); importText(v); };
  $("iexCopy").onclick = () => { try { navigator.clipboard.writeText(ta.value).catch(() => { ta.select(); document.execCommand("copy"); }); } catch { try { ta.select(); document.execCommand("copy"); } catch { /* no clipboard */ } } snack("Copied to clipboard"); closeDialog(); };
  $("dBack").onclick = closeDialog;
  // in the app the files go through Morphe's own Import / Export (it holds the system's file pickers)
  if (window.__morpheAction) { $("iexOut").onclick = $("iexIn").onclick = () => { closeDialog(); window.__morpheAction("morphe_pref_import_export"); }; return; }
  $("iexOut").onclick = () => {
    try {
      const a = document.createElement("a"), d = new Date(), pad = x => String(x).padStart(2, "0");
      a.href = URL.createObjectURL(new Blob([ta.value], { type: "text/plain" }));
      a.download = `YouTube_Settings_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.txt`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      snack("Settings exported successfully");
    } catch { snack("Failed to export settings"); }
  };
  $("iexIn").onclick = () => {
    const f = document.createElement("input"); f.type = "file"; f.accept = "text/plain,.txt,application/json";
    f.onchange = () => { const file = f.files && f.files[0]; if (!file) return; file.text().then(t => { ta.value = t; snack("Settings imported successfully, tap Save to apply"); }, () => snack("Failed to import settings")); };
    f.click();
  };
}
function actionFor(k) {
  const a = ACTION_ROWS[k]; if (!a) return "";
  return `<button class="actpill" data-act="${k}">${I(a.icon)}${esc(a.btn)}</button>`;
}
function runActionRow(k) {
  const a = ACTION_ROWS[k]; if (!a) return;
  // In the app Morphe's own row runs instead (app-post.js); this is only reached on an app build that can't.
  // The App view's stand-in has no Morphe behind it (MorpheApp.preview): it gets the web's copy of Morphe's
  // dialog, as the preview does (Max, Nov 24: Import / Export only said "Update the visual editor patch").
  const realApp = typeof INAPP !== "undefined" && INAPP && !(window.MorpheApp && MorpheApp.preview);
  if (a.run && !realApp) return a.run();
  if (realApp) { snack("Update the visual editor patch to use this"); return; }
  openDialog(`<div class="di">${I(a.icon)}</div><h2 id="dlgTitle">${esc(a.ask)}</h2><p>${esc(a.msg)}</p>
    <div class="acts"><button class="dbtn primary neg" id="dAct">${esc(a.ok)}</button><button class="dbtn tonal" id="dBack">Cancel</button></div>`);
  $("dAct").onclick = () => { closeDialog(); snack(a.done); };
  $("dBack").onclick = closeDialog;
}
// An info row Morphe opens a website from ("Tap here to open OpenRouter.ai"): the same link as a button
function linkFor(k) {
  const m = /Tap here to open ([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/.exec(String(PREF[k].summary || "")); if (!m) return "";
  return `<div class="ctl"><a class="opt linkbtn" href="https://${esc(m[1])}" target="_blank" rel="noopener noreferrer">${I("link")}Open ${esc(m[1])}</a></div>`;
}
// A sub-option that has sub-options of its own (Audio pitch controls > Audio time stretching): its own
// dependents sit right under it inside the parent's group, so it gets the same pill as a top-level parent,
// a lock with the count while they are hidden and the count while they show (no folding of its own).
function deepKidPill(k) {
  if (!PARENT_OF[k]) return "";
  const dk = sectionKeys().filter(x => DIRECT_PARENT[x] === k); if (!dk.length) return "";
  const shown = dk.filter(x => kidVisible(x) || peeking(x)).length;
  return shown ? `<span class="kidbtn kidin" aria-expanded="true" aria-label="${shown} sub-settings, shown below">${shown}${I("expand")}</span>`
    : kidLock(k, dk.length);
}
// the lock pill of a parent whose sub-settings are hidden: a button that shows them, locked
const peeking = x => x === peekKid || (!!peekPar && (PARENT_OF[x] === peekPar || DIRECT_PARENT[x] === peekPar));
const kidLock = (k, n) => `<button class="kidbtn kidoff" data-kidpeek="${k}" aria-expanded="${peekPar === k}" title="Show the ${n} locked sub-settings" aria-label="${n} sub-settings, locked: show them">${n}${I("lock")}</button>`;
// Two columns for a family of plain switches (Max, Nov 25: Fullscreen's Action bar). A parent whose
// sub-settings are all on/off, at least four of them, each Morphe title ending in the same word ("Hide Like
// button", "Hide Dislike button"), lists them two to a line, title then toggle. The shared word is dropped
// from each title ("Like") and said once on the parent ("Action bar buttons"). It is read from Morphe's
// titles, so a button Morphe adds joins the grid, and a family that stops matching gets the usual list.
const COMPACT_MIN = 4;
const lastWord = x => ((/([A-Za-z]+)\W*$/.exec(String(PREF[x]?.title || "")) || [])[1] || "").toLowerCase().replace(/(.{4,})s$/, "$1"); // "Previous & Next buttons" is one of the buttons
function compactWord(k) {
  const ks = KIDS[k]; if (!ks || ks.length < COMPACT_MIN) return "";
  if (!ks.every(x => PREF[x].type === "boolean" && !OFF_LIST.has(x) && !KIDS[x] && DIRECT_PARENT[x] === k)) return "";
  const w = lastWord(ks[0]); return w.length > 2 && ks.every(x => lastWord(x) === w) ? w : "";
}
const dropWord = (t, w) => t.replace(new RegExp(`\\s+${w}s?$`, "i"), "").replace(/'([^']+)'$/, "$1"); // 'Live chat' button: Live chat
const withWord = (t, w) => new RegExp(`\\b${w}s?$`, "i").test(t) ? t : `${t} ${w}s`;
// Cards grouped by where their part sits (Max, Nov 25: "a split based on location", Player → Controls had
// 19 "button" cards). On a tab in AREAS, the plain on/off cards of each area share one box under the area's
// name, two to a line, title then toggle, without the repeated word ("Cast" for "Cast button") and without
// their descriptions. A card of that area with sub-settings (or any other control) follows right after the
// box, before the next area's box. The tables list Morphe's keys in the order the parts appear; a key the
// installed Morphe doesn't have is skipped, a key Morphe adds keeps its own card after the areas, and an area
// with one plain card still gets its box (the card then spans the box), so the areas read top to bottom. Fullscreen keeps its captions (LAYOUT).
const AREAS = {
  player: [
    ["Top area", ["hide_collapse_button", "hide_autoplay_button", "hide_captions_button", "hide_cast_button", "hide_settings_button"]],
    ["Middle area", ["hide_player_previous_next_buttons"]],
    // Morphe's own buttons sit in the bottom row, left of the Fullscreen button (scenes.js)
    ["Bottom area", ["hide_fullscreen_button", "loop_video_button", "mute_video_button", "pip_button_overlay", "reload_video_button", "playlist_panel_button", "video_delay_button_overlay", "external_downloader_overlay_button",
      "copy_video_link_button", "playback_speed_dialog_button", "video_quality_dialog_button", "save_to_watch_later_button", "play_all_button", "fullscreen_video_scale_button"]],
    // the shading behind all three areas comes right after their boxes, before the Bottom area's cards (Max,
    // Nov 25, asked twice: at the end of the list it read as not done); a card of its own (it has sub-settings)
    ["Behind the controls", ["hide_player_control_buttons_background"], { early: true }],
  ],
  shorts: [
    ["Top area", ["hide_shorts_auto_dubbed_label"]],
    ["Middle area", ["hide_shorts_gesture_hints", "hide_shorts_paused_overlay_buttons"]],
    ["Right side", ["hide_shorts_like_button", "hide_shorts_comments_button", "hide_shorts_share_button", "hide_shorts_save_button", "hide_shorts_remix_button", "hide_shorts_sound_button"]],
    // the pills above the channel name, the channel bar, the title and what is under it, the navigation bar
    // 'New posts' is one of the suggested actions (ShortsFilter suggestedAction: box pencil icon), the pills above the channel
    ["Bottom area", ["hide_shorts_upcoming_button", "hide_shorts_save_sound_button", "hide_shorts_new_posts_button", "hide_shorts_use_sound_button", "hide_shorts_use_template_button", "hide_shorts_effect_button", "hide_shorts_green_screen_button",
      "hide_shorts_tagged_products", "hide_shorts_shop_button", "hide_shorts_super_thanks_button", "hide_shorts_location_label", "hide_shorts_hashtag_button", "hide_shorts_info_panel",
      "hide_shorts_channel_bar", "hide_shorts_subscribe_button", "hide_shorts_join_button", "hide_shorts_video_title", "hide_shorts_preview_comment",
      "hide_shorts_sound_metadata_label", "hide_shorts_ai_button", "hide_shorts_full_video_link_label", "hide_shorts_navigation_bar"]],
    // no part on the Shorts player: the entries of its menu, and the places Shorts can be taken out of
    // in the order the sheet in the preview lists them (Morphe's items first, then YouTube's), read left to
    // right, top to bottom (Max, 14:35)
    ["Shorts menu", ["shorts_playback_speed_flyout_button", "shorts_download_flyout_button", "hide_shorts_flyout_captions", "hide_shorts_flyout_audio_track"]],
    ["Shorts in other places", ["hide_shorts_search", "hide_shorts_search_suggestions", "hide_shorts_subscriptions", "hide_shorts_channel", "hide_shorts_history", "hide_shorts_notifications", "hide_shorts_video_description", "hide_shorts_live_preview"]],
  ],
  // the comments sheet scrolls, so its areas are its parts, top to bottom
  comments: [
    ["Top of the sheet", ["hide_comments_top_fans_button", "hide_comments_info_button", "hide_comments_filter_bar_options", "hide_timed_reactions", "hide_comments_ai_chat_summary",
      "hide_comments_community_guidelines", "hide_comments_channel_guidelines", "hide_subscribers_community_guidelines", "hide_comments_by_members_header"]],
    ["Comment box", ["hide_comments_emoji_button", "hide_comments_timestamp_button", "hide_comments_gif_button", "hide_comments_thanks_button", "hide_comments_create_a_short_button"]],
    ["On each comment", ["hide_comments_contexts", "hide_comments_menu_button", "hide_comments_translate_button", "hide_comments_dislike_button", "hide_comments_gift_button", "hide_comments_gifs_and_images", "hide_comments_gift_animation_and_cards"]],
    ["Live chat", ["hide_comments_live_chat_donators_bar", "hide_comments_live_chat_scroll_to_bottom_button", "hide_comments_live_chat_tooltips"]],
  ],
  // the player menu is one list: the top and bottom of it mean nothing there (Max, Nov 25), so it is split by
  // who adds the entry, Morphe's first (they sit at the top of the menu), then YouTube's in the menu's order,
  // two to a line like every other box (Max, 14:35); Quality, Captions and Audio track keep their cards
  // (they have sub-settings) right after the box
  flyout: [
    ["Added by Morphe", ["pip_button_flyout", "save_to_watch_later_flyout_button", "video_delay_button_flyout"]],
    ["YouTube's entries", ["hide_player_flyout_quality", "hide_player_flyout_captions", "hide_player_flyout_speed", "hide_player_flyout_sleep_timer", "hide_player_flyout_loop_video", "hide_player_flyout_ambient_mode",
      "hide_player_flyout_lock_screen", "hide_player_flyout_stable_volume", "hide_player_flyout_audio_track", "hide_player_flyout_listen_with_youtube_music", "hide_player_flyout_watch_in_vr",
      "hide_player_flyout_on_the_go", "hide_player_flyout_additional_settings", "hide_player_flyout_help"]],
  ],
  description: [
    ["Top area", ["hide_video_details_section", "hide_ai_generated_video_summary_section", "hide_ask_section", "hide_hype_points", "hide_key_concepts_section"]],
    ["Middle area", ["hide_chapters_section", "hide_search_inside_this_video_section", "hide_transcript_section", "hide_how_this_was_made_section", "hide_corrections_section", "hide_attributes_section"]],
    ["Bottom area", ["hide_hashtag_section", "hide_info_cards_section", "hide_explore_section", "hide_course_progress_section", "hide_quizzes_section"]],
  ],
  channel: [
    ["Top area", ["hide_links_preview", "hide_subscribe_button_in_channel_page", "hide_join_button", "hide_store_button", "hide_community_button"]],
    ["Under the header", ["hide_filter_bar_in_channel_page", "hide_members_shelf", "hide_members_only_chip", "hide_posts_shelf"]],
  ],
  // the seekbar's parts on the player, then the two families with no part of their own
  seekbar: [
    ["On the player", ["hide_player_gesture_hints", "seekbar_thumbnail_preview", "hide_tap_and_hold_gradient", "hide_timestamp", "hide_chapters_timeline_button", "hide_seekbar", "seekbar_custom_color", "custom_seekbar_thumb"]],
    ["Seeking gestures", ["tap_to_seek", "slide_to_seek", "disable_precise_seeking_gesture", "disable_chapter_skip_double_tap"]],
    ["Haptics", ["disable_haptic_feedback_chapters", "disable_haptic_feedback_precise_seeking", "disable_haptic_feedback_seek_undo", "disable_haptic_feedback_tap_and_hold", "disable_haptic_feedback_zoom"]],
  ],
};
// What a box's titles say once, dropped from each: the word they share ("Cast button": Cast; "Previous & Next
// buttons": Previous & Next, but "Paused overlay buttons" keeps it, it would not say what it is; "menu",
// "section", "haptics"), where the menu is ("... in the Shorts menu"), a lead-in "In" ("In search results"
// under "Shorts in other places"), and the box's own name ("Live chat tooltips" under "Live chat").
const AREA_WORDS = /(?:\s+button)?\s+in (?:the )?(?:Shorts menu|player settings flyout)$|\s+(?:button|menu|section|haptics)$|(?<=&.*)\s+buttons$/i;
function areaTitle(t, box) {
  const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
  let d = t.replace(AREA_WORDS, "").replace(/^'([^']+)'$/, "$1").replace(/^In\s+/, "");
  if (box && d.toLowerCase().startsWith(box.toLowerCase() + " ")) d = d.slice(box.length + 1);
  return cap(d.trim() || t);
}
let FAMILY = {}, AREA_BOX = [], AREA_OVER = {}; // setting -> its area box's name; the boxes on the screen drawn last; titles taken from a sub-screen
const boxable = k => PREF[k]?.type === "boolean" && !KIDS[k] && !OFF_LIST.has(k) && !cleanBroken(k);
function gatherAreas(list, rest) {
  FAMILY = {}; AREA_BOX = []; AREA_OVER = {}; const spec = AREAS[section]; if (!spec) return;
  const pool = new Set([...list, ...rest]), taken = new Set(), out = [];
  for (const [name, ks0, opt] of spec) {
    const ks = ks0.map(x => "morphe_" + x).filter(k => pool.has(k) && !taken.has(k) && !PARENT_OF[k]);
    ks.forEach(k => taken.add(k));
    const box = ks.filter(boxable), after = ks.filter(k => !boxable(k));
    // early: cards that go straight after the boxes above, ahead of the last box's own cards
    if (!box.length && opt && opt.early) { const at = out.findLastIndex(x => String(x).startsWith("@area:")); out.splice(at + 1, 0, ...ks); continue; }
    if (!box.length) { out.push(...ks); continue; }
    box.forEach(k => { FAMILY[k] = name; });
    // a card that is one of a Morphe sub-screen's "Hide in ..." rows, alone in its box, goes by that
    // sub-screen's title ("In channel page" of Filter bar, in the Channel tab: Filter bar)
    box.forEach(k => { const o = overOf(k); if (o && !box.some(x => x !== k && overOf(x) === o)) AREA_OVER[k] = o; });
    out.push("@area:" + (AREA_BOX.push({ name, keys: box }) - 1), ...after);
  }
  list.splice(0, list.length, ...out, ...list.filter(k => !taken.has(k)));
  for (let i = rest.length - 1; i >= 0; i--) if (taken.has(rest[i])) rest.splice(i, 1);
}
function areaCard(i, live) {
  const a = AREA_BOX[i]; if (!a) return "";
  return `<div class="shared fam2" data-share="${esc(a.name)}" data-area="${esc(a.name)}"><div class="shead">${esc(a.name)}</div><div class="kin duo2">${a.keys.map(k => rowHTML(k, live(k))).join("")}</div></div>`;
}
// One-line titles beside toggles (two-column cells, a list's name toggles): one that doesn't fit is marked
// (.ovf: it fades out with an ellipsis), and a press slides it right to left to show the rest, then back.
// What a file setting's picker takes, as Morphe's own picker does: the seekbar thumb asks for an image
// (CustomSeekbarThumbPreference: image/*); the font asks for any file and keeps only a .ttf or .otf, with
// Morphe's message for anything else (CustomFontFilePreference; Max, Nov 25: it said "Choose image" and took
// only images).
const FILE_PICK = {
  image: { icon: "image", word: "image", accept: "image/*" },
  morphe_custom_font_file: { icon: "font", word: "font", accept: ".ttf,.otf,font/ttf,font/otf", only: /\.(ttf|otf)$/i, bad: "The picked file is not a TTF or OTF font" },
};
const FIT_LINE = ":is(.kids, .shared) > .kin.duo2 .ttl, .lchn";
// An area box whose titles mostly don't fit two to a line (Comments: "Community Guidelines") lists them one
// to a line instead (.one), measured again at every width, so a wide screen gets its two columns back.
const overflows = e => e.scrollWidth > e.clientWidth + 1;
function fitLines(root) {
  root.querySelectorAll(".shared[data-area] > .kin.duo2").forEach(b => {
    b.classList.remove("one");
    const t = [...b.querySelectorAll(":scope > .row .ttl")];
    if (t.filter(overflows).length * 3 > t.length) b.classList.add("one");
  });
  root.querySelectorAll(FIT_LINE).forEach(e => e.classList.toggle("ovf", overflows(e)));
  resumeSlide();
}
// The slide goes far enough for the last letter to clear the fade at the right edge (it stopped 6 px
// past the edge, so a short overflow like "Course progress" never showed its end), and the start of the
// line is only faded once it has moved (--mql). The press usually redraws the card a moment later, which
// threw the sliding title away mid-slide, so every title broke off after about 0.4 s: fitLines, which runs
// after every redraw, finds the new title by its setting and carries the slide on from the same point
// (Max, Nov 25: "broken universally").
const MQ_FADE = 10;
let mqLast = null;
function slideLine(e, key, from = 0) {
  const over = e.scrollWidth - e.clientWidth; if (over < 2 || e.classList.contains("mq")) return;
  e.classList.add("mq");
  const d = -(over + MQ_FADE + 4) + "px", l = MQ_FADE + "px", dur = 1600 + over * 22;
  const a = e.animate([{ textIndent: "0px", "--mql": "0px" }, { "--mql": l, offset: .12 }, { textIndent: d, "--mql": l, offset: .42 }, { textIndent: d, "--mql": l, offset: .62 }, { "--mql": l, offset: .88 }, { textIndent: "0px", "--mql": "0px" }], { duration: dur, easing: "cubic-bezier(.45,0,.25,1)" });
  if (from) a.currentTime = Math.min(from, dur - 1);
  a.onfinish = a.oncancel = () => e.classList.remove("mq");
  mqLast = key ? { key, el: e, t0: performance.now() - from, dur } : null;
}
function resumeSlide() {
  const m = mqLast; if (!m || m.el.isConnected) return;
  const at = performance.now() - m.t0; if (at >= m.dur) { mqLast = null; return; }
  const t = $("list").querySelector(m.key); if (t) slideLine(t, m.key, at);
}
// the title a row shows in the list: shortened in a two-column family, the family's word added to its parent
function rowTitle(k) {
  if (FAMILY[k]) return AREA_OVER[k] || areaTitle(shownTitle(k), FAMILY[k]);
  const pw = DIRECT_PARENT[k] && compactWord(DIRECT_PARENT[k]); if (pw) return dropWord(shownTitle(k), pw);
  const w = compactWord(k); return w ? withWord(shownTitle(k), w) : shownTitle(k);
}
function rowHTML(k, live) {
  const p = PREF[k]; const a = A[k];
  const dis = !parentsOk(k);
  const isBool = p.type === "boolean";
  // an info row Morphe still stores a value for (a picked file, a channel whitelist) keeps its editor
  // (Morphe draws these with its own slider, picker or list dialog; any one with a value type has an editor here)
  const editInfo = p.widget === "NonInteractivePreference" && !!p.type && p.type !== "screen";
  const info = !editInfo && (!p.type || p.type === "screen" || p.widget === "NonInteractivePreference" || p.widget === "IntentPreference");
  let right = "", ctl = "";
  const swHTML = () => `<button class="sw" role="switch" data-sw="${k}" aria-checked="${!!V(k)}" aria-label="${esc(shownTitle(k))}"></button>`;
  if (OFF_LIST.has(k)) { right = `<button class="sw" role="switch" data-sw="${k}" aria-checked="${String(V(k)) !== "off"}" aria-label="${esc(shownTitle(k))}"></button>`; ctl = controlFor(k); }
  else if (isBool && design === "clean" && cleanOf(k)) right = toggleHTML(k);
  else if (isBool && design === "toggles") right = swHTML();
  else if (live && a.kind !== "scenario") { right = stateChip(k); if (!isBool) ctl = controlFor(k); }
  else if (isBool) right = swHTML();
  else if (!info) ctl = controlFor(k);
  else if (ACTION_ROWS[k]) right = actionFor(k); // a compact pill on the right, where the toggles sit (Max, Nov 24)
  else ctl = linkFor(k);
  // A list setting (speeds, filter words): the chips are the control, so nothing sits on the right and
  // they get the card's full width. Its Reset is a small pill beside the title, greyed out like the
  // screen's Reset until the list differs from Morphe's own (it asks before restoring).
  // locked (Max, Nov 23): the control is greyed out under a cover that shows only the gold lock; when the
  // setting unlocks, the lock breaks and the cover opens from the middle to both ends (unlockFx)
  if (dis) { if (right) right = withLock(right); else if (ctl) ctl = withLock(ctl); }
  let lreset = "";
  if (!info && isListBox(k)) { const same = String(V(k) ?? "") === String(defaults[k] ?? ""); right = ""; lreset = `<button class="resetbtn lreset" data-lreset="${k}" ${same || dis ? "disabled" : ""} title="Restore the default list" aria-label="Restore the default list">${I("reset")}Reset</button>`; }
  const cls = ["row", live ? "live" : "fallback"];
  if (selected === k) cls.push("sel");
  if (dis) cls.push("dis");
  if (PARENT_OF[k]) { if (peeking(k)) cls.push("peek"); else if (!kidVisible(k)) cls.push("hide"); }
  if (live && (a.kind === "vis" || a.kind === "overlay") && !shown(k)) cls.push("offstate");
  const sum = info ? (fmtSum(k, String(p.summary || "")).replace(/\s*Tap here to open \S+\s*$/, "") || (p.type === "screen" ? "Opens a sub-screen in Morphe settings" : "Information")) : summaryFor(k); // the link has its own button (linkFor)
  const blk = dis ? blockerOf(k) : null;
  const bp = dis ? null : borrowedParent(k);
  const goto = blk ? `<button class="goto" data-goto="${k}">${sectionOf(blk) !== section ? "Change it here" : "Take me there"} ${I("arrow")}</button>`
    : bp ? `<button class="goto more" data-more="${k}" data-target="${bp}" title="${esc(shownTitle(bp))}">More ${I("arrow")}</button>` : "";
  // locked: a short line beside "Take me there" (the full reason is its tooltip), so the card keeps
  // the height of an unlocked one
  const need = dis ? `<div class="need3" title="${esc(needText(k).replace(/<[^>]*>/g, ""))}">${shortNeed(k)}</div>` : "";
  const tags = "";
  const kids = KIDS[k] ? KIDS[k].filter(x => kidVisible(x) || (x === peekKid && peekPar !== k)).length : 0;
  const kidbtn = kids ? `<button class="kidbtn" data-kidtoggle="${k}" aria-expanded="${!collapsed.has(k)}" aria-label="${kids} sub-options">${kids}${I("expand")}</button>`
    : KIDS[k] ? kidLock(k, KIDS[k].length)
    : deepKidPill(k); // same footprint as the open/close button, so the card never changes width
  const over = overOf(k) ? `<div class="over">${esc(overOf(k))}</div>` : "";
  const segCol = sbColor(k); if (segCol) cls.push("segcol");
  return `<div class="${cls.join(" ")}" data-row="${k}" data-k="${k}" tabindex="0"${segCol ? ` style="--seg-col:${segCol};--seg-ink:${inkOn(segCol)}"` : ""}>
    <div class="txt">${over}${lreset ? '<div class="ttlrow">' : ""}<div class="ttl">${ttlHTML(rowTitle(k), (dis ? I("lock", "lk") : "") + tags + kidbtn)}</div>${lreset ? lreset + "</div>" : ""}
      ${sum ? `<div class="sum">${esc(sum)}</div>` : ""}${ctl}</div>${right || goto || need ? `<div class="side">${right}${need}${goto}</div>` : ""}</div>`;
}
// "Hide in comments" alone does not say what is hidden: the row carries its Morphe sub-screen's title
// ("Filter bar") above its own. Rows of one such family that end up next to each other share one card
// with that title once (Max, Nov 24: five small "Filter bar" titles in a row were redundant). Any family
// Morphe groups this way gets it (shareCards), wherever its rows land; a lone row keeps its small title.
const overOf = k => /^(hide|show) in /i.test(title(k)) && PREF[k] && PREF[k].subScreenTitle ? PREF[k].subScreenTitle : "";
function shareCards(cards) {
  const keyOf = t => { const r = /^<div class="row[^"]*" data-row="([^"]+)"/.exec(t); return r ? r[1] : null; };
  const out = [];
  for (let i = 0; i < cards.length;) {
    const k = keyOf(cards[i]), o = k && overOf(k);
    let j = i + 1;
    if (o) while (j < cards.length && keyOf(cards[j]) && overOf(keyOf(cards[j])) === o) j++;
    if (j - i < 2) { out.push(cards[i]); i = j; continue; }
    const drop = `<div class="over">${esc(o)}</div>`;
    out.push(`<div class="shared" data-share="${esc(o)}"><div class="shead">${esc(o)}</div>${cards.slice(i, j).map(t => t.replace(drop, "")).join("")}</div>`);
    i = j;
  }
  return out;
}
// A "Disable X" card shown as "X" with Off | On keeps Morphe's description as written, with no
// "When Off:" lead-in (Max, Nov 23: dropped on every such card).
// The last word of a title and the badges after it never wrap apart, so a sub-options pill can't end up alone on a line.
function ttlHTML(t, after) { if (!after) return esc(t); const i = t.lastIndexOf(" "); return `${esc(t.slice(0, i + 1))}<span class="nw">${esc(t.slice(i + 1))}${after}</span>`; }

// Rows follow the order their components appear in the preview, top to bottom, left to right
// (doodle and top bar first). Settings without a component (scenarios) keep their order after them.
// Measured once per screen with every hidden component drawn, so toggling never reshuffles the list.
let posCache = { sec: null, pos: {} };
const LAYOUT = {
  fullscreen: [
    ["On the player", ["hide_video_title", "hide_live_chat_replay_button", "hide_player_related_videos_overlay", "hide_quick_actions", "fullscreen_video_scale", "fullscreen_playlist_panel"]],
    ["Swipe zones", ["swipe_left_zone", "swipe_right_zone", "swipe_top_zone", "swipe_zone_preview", "swipe_zone_width"]],
    ["Shared by every swipe zone", ["swipe_overlay_style", "swipe_overlay_background_opacity", "swipe_overlay_progress_brightness_color", "swipe_overlay_progress_volume_color", "swipe_overlay_progress_speed_color", "swipe_text_overlay_size", "swipe_haptic_feedback", "swipe_press_to_engage", "volume_boost", "swipe_ignore_when_locked", "swipe_lowest_value_enable_auto_brightness", "swipe_save_and_restore_brightness", "swipe_threshold", "swipe_brightness_sensitivity", "swipe_volume_distance", "swipe_volume_steps"]],
    ["Swipe to seek", ["swipe_seek"]],
    ["Entering and leaving fullscreen", ["open_videos_fullscreen", "exit_fullscreen", "force_fullscreen_landscape", "disable_fullscreen_dragged_down_gesture", "disable_fullscreen_pulled_up_gesture", "disable_fullscreen_sliding_down_gesture"]],
    ["Pinch to zoom", ["disable_fullscreen_zoom_gesture", "restore_pinch_to_zoom"]],
  ],
};
function stagePositions() {
  const st = $("stage");
  if (posCache.sec === section || st.dataset.sec !== section) return posCache.pos;
  const pos = {}, sr = st.getBoundingClientRect();
  st.classList.add("measure");
  st.querySelectorAll("[data-k], [data-also]").forEach(e => {
    const k = e.dataset.k || (e.dataset.also || "").split(" ")[0], r = e.getBoundingClientRect(); if (!r.width && !r.height) return;
    let y = r.top - sr.top, x = r.left - sr.left;
    for (let q = e.parentElement; q && q !== st; q = q.parentElement) { y += q.scrollTop; x += q.scrollLeft; }
    const v = Math.round(y / 14) * 10000 + Math.max(0, Math.round(x));
    if (pos[k] === undefined || v < pos[k]) pos[k] = v;
    if (e.dataset.also && e.dataset.k && (pos[e.dataset.k] === undefined || v < pos[e.dataset.k])) pos[e.dataset.k] = v;
  });
  st.classList.remove("measure");
  posCache = { sec: section, pos };
  return pos;
}
function byPosition(keys) {
  const pos = stagePositions(), idx = new Map(keys.map((k, i) => [k, i]));
  const at = k => pos[k] !== undefined ? pos[k] : null;
  const placed = keys.filter(k => at(k) !== null).sort((a, b) => at(a) - at(b) || idx.get(a) - idx.get(b));
  const rest = placeDependents([placed], keys.filter(k => at(k) === null));
  return keepTogether([...placed, ...rest]);
}
// Related settings sit together in a tab's list (Max, Nov 20: the three Shorts speed settings were apart),
// whatever their parts' places in the preview and whether they have a preview at all: each group lands,
// in this order, where its first member would be. A member without a preview leaves "More settings" for
// its group; a group with no previewed member stays together under "More settings". Members in another
// tab, or that are sub-options, are left where they are. One table for every tab.
const RELATED = [
  // Shorts
  ["shorts_playback_speed_default", "shorts_remember_playback_speed", "shorts_playback_speed_flyout_button"],
  ["shorts_autoplay", "shorts_autoplay_background", "shorts_disable_background_playback"],
  ["hide_shorts_flyout_audio_track", "hide_shorts_flyout_captions", "shorts_download_flyout_button"],
  // Video & audio
  ["playback_speed_default", "custom_speed_menu", "remember_playback_speed_last_selected", "disable_playback_speed_music", "playback_speed_channel_whitelist"],
  ["video_quality_default_wifi", "video_quality_default_mobile", "remember_video_quality_last_selected", "video_quality_prioritize", "advanced_video_quality_menu", "hide_premium_video_quality"],
  ["shorts_quality_default_wifi", "shorts_quality_default_mobile", "remember_shorts_quality_last_selected"],
  ["video_delay", "video_delay_bluetooth_only"],
  // Watch page: Ambient mode first, its fullscreen switch next to it, then Enhanced (which replaces it) with its options
  ["disable_ambient_mode", "bypass_ambient_mode_restrictions", "disable_fullscreen_ambient_mode", "enhanced_ambient_mode"],
  // Behaviour
  ["do_not_remember_loop_video", "loop_count", "loop_count_clear"],
  ["download_force_4k", "download_mode"],
  // Look
  ["theme_color_dark", "theme_color_dark_custom", "theme_color_light", "theme_color_light_custom", "theme_color_change_foreground"],
  ["custom_font_type", "custom_font_file"],
  ["gradient_loading_screen", "splash_screen_style", "splash_screen_duration"],
  ["series_tracker", "series_tracker_completion", "series_tracker_backup"],
  // Feed
  ["hide_view_count", "feed_view_count"],
  ["hide_community_posts", "hide_post_like_dislike_buttons", "hide_post_comment_button", "hide_post_share_button", "hide_post_comments_preview", "post_buttons_layout", "post_image_download", "post_translate"],
  ["hide_filter_bar_in_feed", "hide_filter_bar_in_search", "hide_filter_bar_in_related_videos", "hide_filter_bar_in_history", "hide_filter_bar_in_comments"],
  ["hide_keyword_content_home", "hide_keyword_content_subscriptions", "hide_keyword_content_search", "hide_keyword_content_comments", "hide_keyword_content_about_whole_words", "hide_keyword_content_about"],
  ["hide_aislist_blocklist_home", "hide_aislist_blocklist_search", "hide_aislist_warnlist_home", "hide_aislist_warnlist_search", "aislist_submit_flyout_menu", "hide_aislist_about", "hide_aislist_attribution"],
  ["hide_feed_flyout_menu", "ads_channel_whitelist_flyout_menu", "ask_summarize_flyout_menu", "playback_speed_channel_whitelist_flyout_menu", "feed_download_flyout_button"],
  ["playlist_long_press_drag", "playlist_wide_drag_handles", "playlist_hide_removal_snackbar"],
  // Captions
  ["preferred_caption_language", "secondary_caption_language", "auto_translate_additional_languages"],
];
function relate(list, rest) {
  for (const g of RELATED) {
    const ks = g.map(x => "morphe_" + x).filter(k => !PARENT_OF[k] && (list.includes(k) || rest.includes(k))); if (ks.length < 2) continue;
    const at = Math.min(...ks.map(k => list.indexOf(k)).filter(i => i >= 0)), into = isFinite(at) ? list : rest;
    const where = isFinite(at) ? at : Math.min(...ks.map(k => rest.indexOf(k)));
    ks.forEach(k => [list, rest].forEach(l => { const i = l.indexOf(k); if (i >= 0) l.splice(i, 1); }));
    into.splice(where, 0, ...ks);
  }
}
// settings that belong right after another one wherever their own parts sit
const NEXT_TO = { morphe_custom_speed_menu: "morphe_playback_speed_default" };
function keepTogether(list) {
  for (const [k, after] of Object.entries(NEXT_TO)) {
    const i = list.indexOf(k); if (i < 0 || !list.includes(after)) continue;
    list.splice(i, 1); list.splice(list.indexOf(after) + 1, 0, k);
  }
  return list;
}
// A setting that only matters once another one is set up (Speed step needs a Speed swipe zone) and has
// nothing of its own in the preview goes right after the related settings: after the one that unlocks
// under the same condition and is most alike by name (Overlay timeout after the overlay settings), else
// after the setting it depends on. Not at the top or the bottom of the screen. One rule for every tab,
// the captioned ones and sub-options included.
// lists: the arrays the rows are placed into (changed in place); returns the rows with nothing related.
const condOf = k => String(PREF[k].availability || "") + "|" + (PREF[k].parents || []).map(x => x.key + x.mode).join(",");
const alike = (a, b) => { let n = 0; while (n < a.length && a[n] === b[n]) n++; return n; };
function placeDependents(lists, movable) {
  const rest = [];
  for (const k of movable) {
    const c = condOf(k); let at = null, best = -1;
    if (c !== "|") lists.forEach(l => l.forEach((x, i) => { if (x !== k && condOf(x) === c && alike(x, k) >= best) { best = alike(x, k); at = [l, i]; } }));
    if (!at) { const deps = new Set([...(PREF[k].parents || []).map(x => x.key), ...availKeys(k)]); lists.forEach(l => l.forEach((x, i) => { if (deps.has(x)) at = [l, i]; })); }
    if (at) at[0].splice(at[1] + 1, 0, k); else rest.push(k);
  }
  return rest;
}
// a switch's identity across a redraw: its setting, or its list and name for a list's own toggles (listChoices)
const swKey = x => x.dataset.sw ?? `${x.closest("[data-lst]")?.dataset.lst}|${x.dataset.lch}`;
let lastVis = { sec: null, keys: new Set() };
const pickedFiles = {}; // images chosen with a file picker, kept for this visit only
const foldingKids = new Map(); // sub-option groups still folding away: their old rows, and until when
// peekPar: a parent whose locked sub-settings are shown, locked, after a tap on its lock pill (Max, Nov 20:
// the pill looked like a button and did nothing). Each one says what unlocks it.
let peekKid = null, peekPar = null, lastOpen = new Set(), lastDis = { sec: null, keys: new Set() };
const collapsed = new Set();
function renderList() {
  if (searching) return renderSearch();
  const m = MEMBERS[section];
  const parts = []; // a heading's markup, or a group as an array of its cards' markup (see paintList)
  const isLive = k => m.live.includes(k);
  const wantOpen = new Set();
  const withKids = k => {
    if (k.startsWith("@area:")) return areaCard(+k.slice(6), isLive);
    let out = rowHTML(k, isLive(k));
    const ks = KIDS[k];
    if (ks) {
      const any = ks.some(x => kidVisible(x) || peeking(x));
      if (any && (!collapsed.has(k) || ks.some(peeking))) wantOpen.add(k);
      // parent and its sub-options travel as one unit, so in two columns they stay in the same column
      // a sub-option of a sub-option (Audio time stretching needs Audio pitch controls) sits right under
      // the one it depends on, one step further in
      const deep = x => DIRECT_PARENT[x] && DIRECT_PARENT[x] !== k && ks.includes(DIRECT_PARENT[x]);
      const flat = byPosition(ks).filter(x => !deep(x)), order = [];
      const put = x => { order.push(x); byPosition(ks.filter(y => deep(y) && DIRECT_PARENT[y] === x)).forEach(put); };
      flat.forEach(put); ks.forEach(x => { if (!order.includes(x)) order.push(x); });
      out = `<div class="unit">${out}<div class="kids ${lastOpen.has(k) ? "open" : ""}" data-kids-of="${k}"><div class="kin${compactWord(k) ? " duo2" : ""}">${order.map(x => { const h = rowHTML(x, isLive(x)); return deep(x) ? h.replace('class="row ', 'class="row deep ') : h; }).join("")}</div></div></div>`;
    }
    return out;
  };
  if (section !== "misc") {
    const top = m.live.filter(k => !PARENT_OF[k]);
    // in the clean design a setting whose title can't be converted keeps Morphe's look, at the end
    const ordered0 = byPosition(top), ordered = [...ordered0.filter(k => !cleanBroken(k)), ...ordered0.filter(cleanBroken)];
    const rest = m.misc.filter(k => !PARENT_OF[k]);
    relate(ordered, rest);
    gatherAreas(ordered, rest);
    let live = [];
    const lay = LAYOUT[section];
    if (lay) {
      // screens with a lot of related settings get small captions so it is clear what belongs together
      // a caption can take settings without a preview too: they leave "More settings" for it
      const used = new Set(), caps = lay.map(([cap, ks]) => [cap, ks.map(x => "morphe_" + x).filter(x => ordered.includes(x) || rest.includes(x))]);
      caps.forEach(([, inSec]) => inSec.forEach(x => { const i = rest.indexOf(x); if (i >= 0) rest.splice(i, 1); }));
      caps.forEach(([, inSec]) => inSec.forEach(x => used.add(x)));
      // settings not in a caption join the related ones (see placeDependents); only the rest go first
      const left = placeDependents(caps.map(c => c[1]), ordered.filter(x => !used.has(x))).map(withKids);
      for (const [cap, inSec] of caps) {
        const body = inSec.map(withKids);
        if (body.length) live.push(`<div class="subhead" data-h="${esc(cap)}">${esc(cap)}</div>`, ...body);
      }
      live = [...left, ...live];
    } else live = ordered.map(withKids);
    if (live.length) parts.push(shareCards(live));
    if (rest.length) { if (ordered.length) parts.push(`<div class="sechead" data-h="more">More settings<span class="nolive">No live preview or animation</span></div>`); parts.push(shareCards(rest.map(withKids))); }
  } else {
    const groups = {};
    for (const k of m.misc) {
      if (PARENT_OF[k]) continue;
      const p = PREF[k];
      const g = (p.screenTitle || "Unplaced") + (p.subScreenTitle ? " › " + p.subScreenTitle : "");
      (groups[g] = groups[g] || []).push(k);
    }
    for (const g of Object.keys(groups).sort()) parts.push(`<div class="gtitle" data-h="${esc(g)}">${esc(g)} · <span class="gn">${groups[g].length}</span></div>`, shareCards(groups[g].map(withKids)));
  }
  const list = $("list");
  // sub-options that are about to fold away keep their old look (no locks popping in) while they
  // close; the new state is swapped in once they are out of sight
  // (a second render during the fold, e.g. from the selection that follows the toggle, keeps them too)
  const closingOld = new Map(), now0 = performance.now();
  if (lastVis.sec !== section) foldingKids.clear();
  foldingKids.forEach((v, grp) => { if (v.until > now0 && !wantOpen.has(grp)) closingOld.set(grp, v.old); else foldingKids.delete(grp); });
  if (lastVis.sec === section) list.querySelectorAll(".kids.open").forEach(b => { if (!wantOpen.has(b.dataset.kidsOf)) { const old = b.querySelector(".kin").innerHTML, btn = list.querySelector(`[data-row="${b.dataset.kidsOf}"] .kidbtn`)?.outerHTML; closingOld.set(b.dataset.kidsOf, old); foldingKids.set(b.dataset.kidsOf, { old, btn, until: now0 + 320 }); } });
  // switches keep their old position for a frame so the change slides instead of snapping
  const swWas = new Map(); list.querySelectorAll("[data-sw], [data-lch]").forEach(x => swWas.set(swKey(x), [x.getAttribute("aria-checked"), x.dataset.at, x.dataset.tone]));
  // groups caught mid-fold by this render: their new box carries on from the height it had
  const midFold = new Map(); list.querySelectorAll(".kids:not(.open)").forEach(b => { const h = b.getBoundingClientRect().height; if (h > .5 && foldingKids.has(b.dataset.kidsOf)) midFold.set(b.dataset.kidsOf, h); });
  // descriptions that were unfolded stay unfolded through the redraw, without playing the unfold again
  // (one caught mid-unfold, e.g. by the switch tap that selected its card, carries on from its height)
  // a sub-option that folds away inside a group that stays open keeps its old look while it folds:
  // drawn in its new state it showed a lock and its "Needs ..." line, grew, then shrank
  const oldKidRows = new Map(); list.querySelectorAll(".kids .row:not(.hide)").forEach(r => oldKidRows.set(r.dataset.row, r.outerHTML));
  const wasOpen = new Map([...list.querySelectorAll(".row > .txt > .sum.open")].map(e => [e.closest(".row").dataset.row, e.getBoundingClientRect().height]));
  const headsWere = list.dataset.view === section ? shownHeads(list) : null;
  // a locked card that unlocks loses its "Take me there" and its "needs ..." line: the card eases to its new
  // height and the two fade where they were, instead of the card snapping shorter (Max, Nov 23)
  const lockedWas = new Map(); if (list.dataset.view === section) list.querySelectorAll(".row.dis[data-row]").forEach(r => { const sd = r.querySelector(":scope > .side"); if (!sd || !r.offsetHeight || sd.offsetParent !== r) return; lockedWas.set(r.dataset.row, { h: r.offsetHeight, side: sd.cloneNode(true), x: sd.offsetLeft, y: sd.offsetTop, w: sd.offsetWidth }); });
  const textsWere = list.dataset.view === section ? rowTexts(list) : null;
  const fresh = paintList(list, parts, mergeZonePreview); list.dataset.view = section;
  if (textsWere) requestAnimationFrame(() => { if (list.dataset.view === section) swapRowTexts(list, textsWere); });
  const goneNow = listQuiet(() => { fitOpts(fresh); fitLines(list); return hideLocked(list); });
  midFold.forEach((h, grp) => {
    const box = list.querySelector(`[data-kids-of="${grp}"]`), left = (foldingKids.get(grp)?.until ?? 0) - performance.now(); if (!box || left < 30) return;
    box.classList.remove("open");
    box.animate([{ height: h + "px", gridTemplateRows: "1fr" }, { height: "0px", gridTemplateRows: "1fr" }], { duration: left, easing: "cubic-bezier(.2,0,0,1)" });
  });
  list.querySelectorAll("[data-sw], [data-lch]").forEach(x => {
    const was = swWas.get(swKey(x)), now = [x.getAttribute("aria-checked"), x.dataset.at, x.dataset.tone];
    if (!was || was[0] === now[0]) return;
    const put = v => { x.setAttribute("aria-checked", v[0]); if (v[1]) x.dataset.at = v[1]; else delete x.dataset.at; if (v[2]) x.dataset.tone = v[2]; else delete x.dataset.tone; };
    toggleGlide(x, was, now, put); // a switch or the two-way toggle: the thumb glides like every other choice
  });
  closingOld.forEach((old, grp) => {
    // the parent's sub-options pill keeps its count until the fold is over, then turns into the
    // lock pill: switching it at once drew the lock mid-fold. It fades in to its own resting opacity (the
    // lock pill is dimmed): fading to full and dropping to the dim value made it flash (Max, Nov 24)
    const fold = foldingKids.get(grp), nb = list.querySelector(`[data-row="${grp}"] .kidbtn`);
    if (fold && fold.btn && nb && nb.outerHTML !== fold.btn) {
      const fresh = nb.outerHTML; nb.outerHTML = fold.btn;
      setTimeout(() => { const cur = list.querySelector(`[data-row="${grp}"] .kidbtn`); if (cur && !list.querySelector(`[data-kids-of="${grp}"]`)?.classList.contains("open")) { cur.outerHTML = fresh; const n = list.querySelector(`[data-row="${grp}"] .kidbtn`); if (n) n.animate([{ opacity: 0 }, { opacity: getComputedStyle(n).opacity }], { duration: 160 }); } }, Math.max(0, fold.until - performance.now()) + 20);
    }
    const kin = list.querySelector(`[data-kids-of="${grp}"] > .kin`); if (!kin) return;
    // (taken clean: a card that stayed through this redraw may still wear an unlock that is playing)
    const now = kin.cloneNode(true); stripUnlock(now); const fresh = now.innerHTML; kin.innerHTML = old; stripUnlock(kin);
    kin.querySelectorAll(".row").forEach(r => r.classList.remove("sel", "attn", "nudge"));
    const left = Math.max(0, (foldingKids.get(grp)?.until ?? now0) - performance.now());
    setTimeout(() => { if (kin.isConnected && !kin.parentElement.classList.contains("open")) kin.innerHTML = fresh; }, left + 20);
  });
  const keepOpen = [...list.querySelectorAll(".row > .txt > .sum")].filter(e => wasOpen.has(e.closest(".row").dataset.row));
  keepOpen.forEach(e => { e.style.transition = "none"; e.style.maxHeight = wasOpen.get(e.closest(".row").dataset.row) + "px"; });
  listQuiet(() => fitSums(fresh, new Set(keepOpen)));
  // the unfold carries on once the redraw and everything after it is done (two frames on), so it
  // doesn't start inside that busy stretch and skip its first frames
  if (keepOpen.length) { void list.offsetHeight; afterBusy(() => keepOpen.forEach(e => { e.style.transition = ""; e.style.maxHeight = ""; })); }
  // animate sub-option groups and rows from their previous state to the new one
  void list.offsetHeight;
  const sameSec = lastVis.sec === section;
  const nowVis = new Set();
  list.querySelectorAll(".kids .row").forEach(r => {
    const k = r.dataset.row, vis = !r.classList.contains("hide"), box = r.closest(".kids"), grp = box.dataset.kidsOf;
    if (vis) nowVis.add(k);
    if (!sameSec) return;
    const was = lastVis.keys.has(k);
    if (was && !vis) {
      // keep it on screen while it folds away, then hide it
      r.classList.remove("hide");
      if (wantOpen.has(grp) && lastOpen.has(grp) && oldKidRows.has(k)) { const t = document.createElement("div"); t.innerHTML = oldKidRows.get(k); const o = t.firstElementChild; o.classList.remove("sel", "attn", "nudge"); stripUnlock(o); r.replaceWith(o); r = o; }
      if (wantOpen.has(grp) && lastOpen.has(grp)) { const an = sizeAnim(r, false); const end = () => { r.classList.add("hide"); r.getAnimations().forEach(a => a.cancel()); }; if (an) an.onfinish = end; else end(); }
      else setTimeout(() => r.classList.add("hide"), 300);
    } else if (!was && vis && lastOpen.has(grp) && wantOpen.has(grp)) sizeAnim(r, true);
  });
  list.querySelectorAll(".kids").forEach(e => e.classList.toggle("open", wantOpen.has(e.dataset.kidsOf)));
  lastOpen = wantOpen; lastVis = { sec: section, keys: nowVis };
  // locked settings that came or went fold in and out like sub-options
  if (lastGone.sec === section) {
    list.querySelectorAll(".row[data-row]").forEach(r => {
      const k = r.dataset.row, box = r.closest(".gunit") || r;
      if (lastGone.keys.has(k) && !goneNow.has(k)) sizeAnim(box, true);
      else if (!lastGone.keys.has(k) && goneNow.has(k)) { box.classList.add("going"); foldAway(box, () => syncGroups(list)); }
    });
    syncGroups(list);
    syncHeads(list, headsWere);
  }
  lastGone = { sec: section, keys: goneNow };
  // rows that just became available on this screen get the unlock animation
  // read from the settings, not the drawn rows: a sub-option folding away keeps its unlocked look
  // while it folds, and read from the DOM it never counted as locked, so it unlocked only once
  const dis = new Set([...list.querySelectorAll(".row[data-row]")].map(r => r.dataset.row).filter(k => PREF[k] && !parentsOk(k)));
  if (lastDis.sec === section) unlockBatch(() => { carryUnlocks(list); lastDis.keys.forEach(k => { if (!dis.has(k)) { const r = list.querySelector(`[data-row="${k}"]`); if (r && !r.dataset.ulk && !r.classList.contains("hide")) unlockFx(r); } }); });
  else unlocking.clear();
  lastDis = { sec: section, keys: dis };
  lockedWas.forEach((w, k) => { const r = list.querySelector(`.row[data-row="${k}"]:not(.dis)`); if (r) unlockMorph(r, w); });
}
// the unlocking card: height from the locked card's to its own, the old side column fading in place
function unlockMorph(r, w) {
  const h1 = r.offsetHeight;
  if (!h1) return;
  const ghost = w.side; ghost.classList.add("sidefade"); ghost.querySelectorAll("button").forEach(b => { b.disabled = true; b.tabIndex = -1; });
  ghost.style.cssText = `position:absolute;left:${w.x}px;top:${w.y}px;width:${w.w}px;margin:0;pointer-events:none;z-index:3`;
  r.appendChild(ghost);
  ghost.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.92)" }], { duration: ULK_MS * .45, easing: "ease-out", fill: "forwards" }).onfinish = () => ghost.remove();
  if (Math.abs(h1 - w.h) > 1) r.animate([{ height: w.h + "px", minHeight: "0px", overflow: "hidden" }, { height: h1 + "px", minHeight: "0px", overflow: "hidden" }], { duration: ULK_MS * .6, easing: "cubic-bezier(.4,0,.2,1)" });
}
// "Swipe zone preview" is one column on the right of the left, right and top zone rows, its title
// running vertically, since it previews all three
// A locked setting (its parent is off) isn't listed until the parent is on; one reached by search or
// "Take me there" stays while it is selected, with its lock and the way to unlock it.
let lastGone = { sec: null, keys: new Set() };
// selecting a locked setting (from search) unfolds it; selecting something else folds it away again
function syncLocked(k) {
  const list = $("list"); if (!list || searching) return;
  const before = shownHeads(list); let changed = false;
  list.querySelectorAll(".gunit").forEach(box => {
    const row = box.classList.contains("row") ? box : box.querySelector(":scope > .row"); if (!row) return;
    const want = row.dataset.row === k || !row.classList.contains("dis"), out = isOut(box);
    if (want && out) {
      box.getAnimations().forEach(a => a.cancel()); box.classList.remove("gone", "going"); lastGone.keys.delete(row.dataset.row); changed = true;
      syncGroups(list); fitOpts(box); listQuiet(() => fitLines(box)); sizeAnim(box, true);
    } else if (!want && !out) {
      lastGone.keys.add(row.dataset.row); changed = true;
      foldAway(box, () => syncGroups(list));
    }
  });
  if (changed) syncHeads(list, before);
}
// Option pills: as many columns as the longest label allows on this screen width, then the rows evened
// out (6 speeds a row, 5 qualities, all pitches on one line when they fit), worked out again whenever
// the list is drawn or the window changes size. Nothing is fixed per setting.
let optCtx = null;
// Every pill in a box gets the width of the one with the longest text. When an even row would stretch
// them far past that (a few long options, one per line), they keep that width instead of filling the line.
// What fitPills reads from the page, read for every box before any box is changed: reading after each
// write made the browser lay the whole list out again once per box (Max, Nov 22: performance).
function pillsMeasure(box, pills) {
  const W = box.clientWidth; if (!W || !pills.length) return null;
  const cs = getComputedStyle(pills[0]);
  return { W, fontSize: cs.fontSize, font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, gap: parseFloat(getComputedStyle(box).columnGap) || 6 };
}
function fitPills(box, pills, textOf, chrome, tight = false, pre) {
  if (!pre) { box.classList.remove("tight"); box.style.removeProperty("--tight-fs"); pre = pillsMeasure(box, pills); }
  if (!pre) return;
  const { W, gap } = pre, cs = { fontSize: pre.fontSize };
  optCtx = optCtx || document.createElement("canvas").getContext("2d"); optCtx.font = pre.font;
  let need = Math.ceil(Math.max(...pills.map(o => optCtx.measureText(textOf(o)).width)) + chrome), colCap = Infinity;
  // A few long labels (Chinese (Simplified)) take two lines when that gains a column, so one long name
  // does not halve the grid (Max, Nov 20). Each label's best two-line width is its widest half.
  if (!tight || pills.length > 8 || pills.some(o => /\s/.test(textOf(o).trim()))) {
    const w = t => optCtx.measureText(t).width;
    const two = t => { const p = t.split(/\s+/); let b = w(t); for (let i = 1; i < p.length; i++) b = Math.min(b, Math.max(w(p.slice(0, i).join(" ")), w(p.slice(i).join(" ")))); return b; };
    const need2 = Math.ceil(Math.max(...pills.map(o => two(textOf(o)))) + chrome);
    const wraps = pills.filter(o => w(textOf(o)) + chrome > need2).length;
    // Labels of two words or more may take two lines whenever one more column saves a line of pills
    // (Max, Nov 23 PM: Player icon style, 2 columns of 5 lines became 3 of 4), every word kept whole.
    const colsAt = nd => Math.max(1, Math.floor((W + gap) / (nd + gap))), rowsAt = c => Math.ceil(pills.length / Math.min(pills.length, c));
    const c1 = colsAt(need), c2 = Math.min(colsAt(need2), c1 + 1);
    if (colsAt(need2) > c1 && wraps <= Math.max(1, Math.floor(pills.length / 4))) need = need2; // a few long labels: as many columns as fit
    else if (c2 > c1 && rowsAt(c2) < rowsAt(c1)) { need = need2; colCap = c2; } // many: one more column, one line less
  }
  const maxCols = Math.min(colCap, Math.max(1, Math.floor((W + gap) / (need + gap))));
  const n = pills.length, rows = Math.ceil(n / Math.min(n, maxCols)), cols = Math.ceil(n / rows);
  // fill the line only when that stretches the pills by at most a quarter; otherwise each keeps the
  // widest pill's width (three long options one per line stay that long, not the whole card wide)
  // One line beats equal widths: when equal pills would wrap but the pills at their own widths fit
  // on one line (Off · Volume · Brightness · Speed), they share the line in proportion to their text.
  if (maxCols < n) {
    const own = pills.map(o => Math.ceil(optCtx.measureText(textOf(o)).width + chrome)), sum = own.reduce((a, b) => a + b, 0) + gap * (n - 1);
    if (sum <= W) { box.style.gridTemplateColumns = own.map(w => `minmax(${w}px, ${w}fr)`).join(" "); box.style.justifyContent = ""; return; }
    // Short values that only just miss one line (Auto · 2160p · … · 240p) get a smaller text and the
    // least padding to stay on it, down to 10.5 px text; past that they wrap as usual.
    if (tight) {
      const fs = parseFloat(cs.fontSize), texts = pills.map(o => optCtx.measureText(textOf(o)).width), T = texts.reduce((a, b) => a + b, 0), TC = 8;
      const sc = Math.min(1, (W - TC * n - gap * (n - 1)) / T);
      if (fs * sc >= 10.5) {
        box.classList.add("tight"); box.style.setProperty("--tight-fs", (fs * sc).toFixed(2) + "px");
        box.style.gridTemplateColumns = texts.map(w => { const px = Math.ceil(w * sc + TC); return `minmax(${px}px, ${px}fr)`; }).join(" "); box.style.justifyContent = ""; return;
      }
    }
  }
  const even = (W - gap * (cols - 1)) / cols;
  const fill = cols > 1 && (even <= need * 1.25 || colCap === cols); // a column gained by wrapping: the pills share the line
  box.style.gridTemplateColumns = fill ? `repeat(${cols}, minmax(0, 1fr))` : `repeat(${cols}, ${Math.min(need, W)}px)`;
  box.style.justifyContent = fill ? "" : "center"; // pills that don't fill the line sit in its middle
}
function fitOpts(root = $("list")) {
  const all = q => (Array.isArray(root) ? root : [root]).flatMap(r => [...r.querySelectorAll(q)]); // one box, or the cards just drawn
  const jobs = all(".ctl.optgrid").map(box => [box, [...box.querySelectorAll(".opt")], o => o.textContent, 2 * OPT_PAD + 2, true])
    // list chips (speeds, words): text, then the remove button; the add field takes its own line
    .concat(all(".ctl.lst").map(box => [box, [...box.querySelectorAll(".lchip")], o => o.firstChild ? o.firstChild.textContent : "", LCHIP_CHROME, false]));
  // all writes undone, then all reads, then all writes: one layout for the whole list instead of one per box
  jobs.forEach(([box]) => { box.classList.remove("tight"); box.style.removeProperty("--tight-fs"); });
  const pre = jobs.map(([box, pills]) => pillsMeasure(box, pills));
  jobs.forEach((j, i) => { if (pre[i]) fitPills(...j, pre[i]); });
}
// ---------- Glide: one motion for every picked thumb ----------
// Option grids, the three-way toggles in the menu, the two-way Hide/Show toggles and the tabs all move
// their colour from the old choice to the new one through glideRun(), so they always move alike and a
// new motion is one change here. The motion is drawn by temporary blobs in a .glayer laid over the box
// (under the labels): the control's own thumb or picked fill is hidden while they run (.gliding) and
// shows again, in place, when they finish. Each motion is sampled once into keyframes (transform, size,
// corner, opacity) and played by the compositor-friendly Web Animations engine: no per-frame script.
// A tap during a glide carries on from where the colour is (glideNow).
// The motions are the five iterations from Nov 23 (option-glide/iterations); the preview page can switch
// between them (inspector, "Glide style").
const GLIDE_STYLES = [["pour", "Smooth pour (D1, chosen)"], ["goo", "Goo drop"], ["spring", "Spring slide"], ["lens", "Liquid lens"], ["worm", "Worm"], ["grow", "Grow in place"]];
let glideStyle = (() => { try { const v = localStorage.getItem(LS + "-glide"); return GLIDE_STYLES.some(s => s[0] === v) ? v : "pour"; } catch { return "pour"; } })();
function setGlideStyle(v) { glideStyle = v; try { localStorage.setItem(LS + "-glide", v); } catch { /* storage unavailable */ } }
const GLIDE_REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
// a damped spring from 0 to 1 after t ms: [position, speed] (k stiffness, z damping ratio)
function gSpring(t, k, z) {
  const w0 = Math.sqrt(k), s = t / 1000; if (s <= 0) return [0, 0];
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z), e = Math.exp(-z * w0 * s), c = Math.cos(wd * s), sn = Math.sin(wd * s); return [1 - e * (c + (z * w0 / wd) * sn), e * (w0 * w0 / wd) * sn / w0]; }
  const e = Math.exp(-w0 * s); return [1 - e * (1 + w0 * s), w0 * s * e];
}
const gLerp = (a, b, p) => a + (b - a) * p;
// each motion: the blobs at d ms from the old place f to the new place t ({x, y, w, h} in the box)
const GLIDE_MOTION = {
  // D1 "Smooth pour" (Max chose it, Nov 23): the drop travels on a critically damped spring; the old
  // fill drains into a drop as it leaves and the drop melts into the new fill as it lands, so the colour
  // is always somewhere. Its goo neck is a little wider than goo's (stdDeviation 7, alpha 18 -7).
  // iOS-like landing (Max, Nov 24): the new fill grows on its own underdamped spring from the moment the
  // drop is 40% of the way (113 ms), so it swells about 6% past its size and settles, like a press let go.
  pour: { goo: [7, 18, -7], end: 800, draw: (f, t, d) => {
    const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const [p, v0] = gSpring(d, 150, 1), v = v0 * 1.6, oldK = 1 - sm(p / .55), newK = d < 113 ? 0 : gSpring(d - 113, 180, .66)[0];
    const fx = f.x + f.w / 2, fy = f.y + f.h / 2, tx = t.x + t.w / 2, ty = t.y + t.h / 2, hor = Math.abs(tx - fx) >= Math.abs(ty - fy);
    const bell = Math.pow(Math.max(0, 1 - Math.abs(2 * p - 1)), .35), s0 = Math.min(f.h, t.h) * .95 * bell, sp = Math.min(1, Math.abs(v) * .6);
    const dw = s0 * (hor ? 1 + sp * .8 : 1 - sp * .2), dh = s0 * (hor ? 1 - sp * .2 : 1 + sp * .8), on = p > .005 && p < .995 ? 1 : 0;
    return [{ x: t.x + t.w * (1 - newK) / 2, y: t.y + t.h * (1 - newK) / 2, w: t.w * newK, h: t.h * newK },
      { x: gLerp(fx, tx, p) - dw * on / 2, y: gLerp(fy, ty, p) - dh * on / 2, w: dw * on, h: dh * on },
      { x: f.x + f.w * (1 - oldK) / 2, y: f.y + f.h * (1 - oldK) / 2, w: f.w * oldK, h: f.h * oldK }]; } },
  spring: { end: 520, draw: (f, t, d) => { const [p] = gSpring(d, 560, .78); return [{ x: gLerp(f.x, t.x, p), y: gLerp(f.y, t.y, p), w: gLerp(f.w, t.w, p), h: gLerp(f.h, t.h, p) }]; } },
  lens: { end: 600, draw: (f, t, d) => {
    const [p, v] = gSpring(d, 480, .74), lift = Math.max(0, Math.min(1, Math.abs(v) * 1.2)), dist = Math.hypot(t.x - f.x, t.y - f.y), hor = Math.abs(t.x - f.x) >= Math.abs(t.y - f.y) || !dist;
    const st = 1 + Math.min(.35, lift * .35 * Math.min(1, dist / 60)), sq = 1 - (st - 1) * .45, up = 1 + lift * .1;
    const w = gLerp(f.w, t.w, p) * (hor ? st : sq) * up, h = gLerp(f.h, t.h, p) * (hor ? sq : st) * up, cx = gLerp(f.x + f.w / 2, t.x + t.w / 2, p), cy = gLerp(f.y + f.h / 2, t.y + t.h / 2, p);
    return [{ x: cx - w / 2, y: cy - h / 2, w, h, o: 1 - lift * .25 }]; } },
  worm: { end: 560, draw: (f, t, d) => {
    const fast = gSpring(d, 760, .8)[0], slow = gSpring(Math.max(0, d - 20), 400, .84)[0], right = t.x + t.w / 2 >= f.x + f.w / 2, down = t.y + t.h / 2 >= f.y + f.h / 2;
    const l = gLerp(f.x, t.x, right ? slow : fast), r = gLerp(f.x + f.w, t.x + t.w, right ? fast : slow), tp = gLerp(f.y, t.y, down ? slow : fast), bt = gLerp(f.y + f.h, t.y + t.h, down ? fast : slow);
    return [{ x: l, y: tp, w: r - l, h: bt - tp }]; } },
  // metaball liquid: the old fill shrinks, a drop pulls away from it, travels stretched by its speed and
  // melts into the new fill as it swells (the blobs are joined by the goo filter on the layer)
  goo: { goo: [5, 20, -8], end: 620, draw: (f, t, d) => {
    const [p, v] = gSpring(d, 400, .82), old = Math.max(0, 1 - Math.pow(Math.min(1, d / 270), 1.3)), nw = gSpring(Math.max(0, d - 70), 520, .72)[0];
    const fx = f.x + f.w / 2, fy = f.y + f.h / 2, tx = t.x + t.w / 2, ty = t.y + t.h / 2, hor = Math.abs(tx - fx) >= Math.abs(ty - fy);
    const s0 = Math.min(f.h, t.h) * .9, sp = Math.min(1, Math.abs(v) * .6), dw = s0 * (hor ? 1 + sp * 1.4 : 1 - sp * .25), dh = s0 * (hor ? 1 - sp * .25 : 1 + sp * 1.4), on = p < .97 ? 1 : 0;
    return [{ x: t.x + t.w * (1 - nw) / 2, y: t.y + t.h * (1 - nw) / 2, w: t.w * nw, h: t.h * nw },
      { x: gLerp(fx, tx, p) - dw * on / 2, y: gLerp(fy, ty, p) - dh * on / 2, w: dw * on, h: dh * on },
      { x: f.x + f.w * (1 - old) / 2, y: f.y + f.h * (1 - old) / 2, w: f.w * old, h: f.h * old }]; } },
  // Material 3 Expressive: nothing crosses the other choices; the old fill melts, the new springs out
  grow: { end: 520, draw: (f, t, d) => {
    const out = Math.max(0, 1 - d / 160), g = gSpring(d, 620, .62)[0], w = t.w * g, h = t.h * (.4 + .6 * g);
    return [{ x: t.x + (t.w - w) / 2, y: t.y + (t.h - h) / 2, w, h, r: gLerp(t.h * .2, t.h / 2, Math.min(1, d / 260)) },
      { x: f.x + f.w * (1 - out) * .15, y: f.y + f.h * (1 - out) * .15, w: f.w * (1 - (1 - out) * .3), h: f.h * (1 - (1 - out) * .3), o: out }]; } },
};
// the goo filter of a motion ([blur, alpha gain, alpha offset]), made once per motion
// Nov 24 round 3 (Max: a toggle's travelling pill lost the reflective glass edge, which came back only
// when the glide ended): the goo filter turns every box-shadow into nothing, so the filter now draws the
// landing part's own rim itself (its inset shadows: a ring of n px, a highlight shifted by x/y px) around
// the merged shape, wherever it is. The colour then looks like the part it lands on all the way.
function rimParts(sh) {
  if (!sh || sh === "none") return [];
  return sh.split(/,(?![^(]*\))/).map(x => x.trim()).filter(x => /\binset\b/.test(x)).map(x => {
    const c = (/rgba?\([^)]*\)/.exec(x) || [""])[0], n = x.replace(c, "").replace("inset", "").trim().split(/\s+/).map(parseFloat);
    const m = /rgba?\(([^,]+),([^,]+),([^,)]+)(?:,([^)]+))?\)/.exec(c.replace(/\s/g, ""));
    return m && { rgb: [+m[1] / 255, +m[2] / 255, +m[3] / 255], a: m[4] === undefined ? 1 : +m[4], x: n[0] || 0, y: n[1] || 0, b: n[2] || 0, s: n[3] || 0 };
  }).filter(q => q && !q.b && q.a > 0 && (q.s > 0 || q.x || q.y));
}
function gooFilter([sd, a, b], rim) {
  const parts = rimParts(rim), tag = parts.length ? "_r" + [...JSON.stringify(parts)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36) : "";
  const id = `gGoo${sd}_${a}_${-b}${tag}`;
  if (!document.getElementById(id)) {
    const fx = parts.map((q, i) => (q.s > 0 ? `<feMorphology in="g" operator="erode" radius="${q.s}" result="e${i}"/>` : "")
      + (q.x || q.y ? `<feOffset in="${q.s > 0 ? "e" + i : "g"}" dx="${q.x}" dy="${q.y}" result="e${i}"/>` : "")
      + `<feComposite in="g" in2="e${i}" operator="out" result="b${i}"/><feColorMatrix in="b${i}" type="matrix" values="0 0 0 0 ${q.rgb[0]}  0 0 0 0 ${q.rgb[1]}  0 0 0 0 ${q.rgb[2]}  0 0 0 ${q.a} 0" result="w${i}"/>`).join("");
    const merge = parts.length ? `<feMerge><feMergeNode in="c"/>${parts.map((q, i) => `<feMergeNode in="w${i}"/>`).join("")}</feMerge>` : "";
    document.body.insertAdjacentHTML("beforeend", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="${sd}"/><feColorMatrix mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${a} ${b}" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop" result="c"/>${fx}${merge}</filter></svg>`);
  }
  return id;
}
// a part's place in a box, in the box's own coordinates (padding box, scrolled content included)
function gRect(el, box) { const b = box.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - b.left - box.clientLeft + box.scrollLeft, y: r.top - b.top - box.clientTop + box.scrollTop, w: r.width, h: r.height }; }
// where a running glide's colour is now (the largest blob), or null
function glideNow(box) {
  const g = box._glide; if (!g || !g.layer.isConnected) return null;
  let best = null; g.layer.querySelectorAll("i").forEach(e => { const r = gRect(e, box); if (r.w > 1 && r.h > 1 && (!best || r.w * r.h > best.w * best.h)) best = r; });
  return best;
}
const GLIDE_HANDOFF = 140;
function glideStop(box) { if (box._handoff) { box._handoff.remove(); box._handoff = null; } const g = box._glide; if (g) { box._glide = null; g.anims.forEach(a => a.cancel()); g.layer.remove(); box.classList.remove("gliding"); (g.path || []).forEach(c => c.classList.remove("gpath")); } }
// o: bg (the new colour), fromBg (the old one, if it differs), radius (the thumb's corner), z (layer
// stacking), done (called once the colour has landed or the glide was replaced)
// Every glide takes the chosen element's final colour, never a value caught mid-transition (Max, Nov 24:
// "there's a delay before it turns white"). settled(els, fn) runs a state change with the elements'
// transitions off for that frame; settledBg(el) reads an element's settled background.
// Only colours are held: a pressed part still eases back from its press (transform), it used to snap.
function settled(els, fn) {
  const list = [...els]; list.forEach(e => { e.style.transitionProperty = "transform"; });
  fn(); list.forEach(e => void e.offsetWidth);
  requestAnimationFrame(() => list.forEach(e => { e.style.transitionProperty = ""; }));
}
function settledBg(el) {
  const keep = el.style.transition; el.style.transition = "none";
  const bg = getComputedStyle(el).backgroundColor; void el.offsetWidth; el.style.transition = keep; return bg;
}
// the part's settled rim (its box-shadow), drawn around the moving colour by the goo filter
function settledRim(el) {
  const keep = el.style.transition; el.style.transition = "none";
  const sh = getComputedStyle(el).boxShadow; void el.offsetWidth; el.style.transition = keep; return sh;
}
function glideRun(box, f, t, o) {
  const prev = box._glide; glideStop(box); if (prev && prev.done) prev.done(true);
  if (GLIDE_REDUCED.matches || Math.hypot(t.x - f.x, t.y - f.y) < 1 && Math.abs(t.w - f.w) < 1) { if (o.done) o.done(false); return; }
  const M = GLIDE_MOTION[glideStyle] || GLIDE_MOTION.pour, goo = M.goo && gooFilter(M.goo, o.rim);
  const STEP = 1000 / 60, frames = [];
  for (let d = 0; d < M.end; d += STEP) frames.push(M.draw(f, t, d));
  frames.push([{ x: t.x, y: t.y, w: t.w, h: t.h }]);
  // a motion's last frames that no longer move (under half a pixel from the end) are dropped: the control's
  // own fill takes over as soon as the colour has landed, not a quarter second later
  // (a blob melting inside the landed fill can't be seen either)
  const near = (b, e) => Math.abs(Math.max(0, b.w) - Math.max(0, e.w)) < .5 && Math.abs(Math.max(0, b.h) - Math.max(0, e.h)) < .5 && (b.w < .5 || b.h < .5 || Math.abs(b.x - e.x) < .5 && Math.abs(b.y - e.y) < .5) && (b.o ?? 1) > .98;
  const inside = b => b.w < .5 || b.h < .5 || b.x >= t.x - .5 && b.y >= t.y - .5 && b.x + b.w <= t.x + t.w + .5 && b.y + b.h <= t.y + t.h + .5;
  const still = fr => { const landed = fr.some(b => near(b, t)); return fr.every((b, i) => near(b, frames[frames.length - 1][i] || { x: 0, y: 0, w: 0, h: 0 }) || landed && inside(b)); };
  while (frames.length > 3 && still(frames[frames.length - 2])) frames.splice(frames.length - 2, 1);
  // the goo filter turns a see-through colour (a glass switch's off thumb) to nothing: the blobs are
  // drawn opaque and the layer carries the colour's own see-through instead
  const split = c => { const m = /^rgba?\(([^,]+),([^,]+),([^,)]+)(?:,\s*([\d.]+))?\)$/.exec(String(c || "").replace(/\s/g, "")); return m ? [`rgb(${m[1]},${m[2]},${m[3]})`, m[4] === undefined ? 1 : +m[4]] : [c, 1]; };
  const [bgO, aTo] = split(o.bg), [fromO, aFrom] = o.fromBg ? split(o.fromBg) : [null, aTo];
  if (goo && (aTo < 1 || aFrom < 1)) o = { ...o, bg: bgO, fromBg: fromO, alpha: [aFrom, aTo] };
  const layer = document.createElement("span"); layer.className = goo ? "glayer goo" : "glayer"; layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = `z-index:${o.z ?? 0};width:${box.scrollWidth}px;height:${box.scrollHeight}px${goo ? `;filter:url(#${goo})` : ""}`;
  // Only transform and opacity move, so the compositor plays the glide by itself: a phone draws the new
  // screen on the main thread while a tab's glide runs, and a glide that animated sizes and corners froze
  // there and skipped half its way (Max, Nov 24: "changed but not fixed"). Each blob is drawn once at its
  // resting size (or its largest, if it melts away) and scaled from there; a colour change is a second
  // blob in the old colour fading out on top.
  const n = Math.max(...frames.map(fr => fr.length)), R = o.radius ?? 999, last = frames.length - 1, mid = Math.round(last * .4);
  const anims = [], twin = o.fromBg && o.fromBg !== o.bg;
  for (let i = 0; i < n; i++) {
    const at = fr => fr[i] || { x: t.x + t.w / 2, y: t.y + t.h / 2, w: 0, h: 0 };
    const rest = at(frames[last]); let W = Math.max(0, rest.w), H = Math.max(0, rest.h), rr = rest.r;
    if (W < 1 || H < 1) frames.forEach(fr => { const b = at(fr); if (b.w * b.h > W * H) { W = b.w; H = b.h; rr = b.r; } });
    if (W < 1 || H < 1) continue;
    const css = `width:${W}px;height:${H}px;border-radius:${Math.max(0, Math.min(rr ?? R, W / 2, H / 2))}px`;
    const kf = frames.map(fr => { const b = at(fr), w = Math.max(0, b.w), h = Math.max(0, b.h); return { transform: `translate(${b.x}px,${b.y}px) scale(${w / W},${h / H})`, opacity: b.o ?? 1 }; });
    const e = document.createElement("i"); e.style.cssText = css; e.style.backgroundColor = o.bg; layer.appendChild(e);
    anims.push(e.animate(kf, { duration: last * STEP, easing: "linear", fill: "forwards" }));
    if (twin) {
      const e2 = document.createElement("i"); e2.style.cssText = css; e2.style.backgroundColor = o.fromBg; layer.appendChild(e2);
      anims.push(e2.animate(kf.map((k, j) => ({ ...k, opacity: k.opacity * Math.max(0, 1 - j / mid) })), { duration: last * STEP, easing: "linear", fill: "forwards" }));
    }
  }
  if (!anims.length) { if (o.done) o.done(false); return; }
  if (o.alpha) anims.push(layer.animate([{ opacity: o.alpha[0] }, { opacity: o.alpha[1], offset: .4 }, { opacity: o.alpha[1] }], { duration: last * STEP, fill: "forwards" }));
  // the parts the colour passes over lose their glass lens while it moves (a lens bends the fill into
  // streaks and lifts the part above it); the others keep theirs, so nothing else flickers when it ends
  const x0 = Math.min(f.x, t.x) - 4, x1 = Math.max(f.x + f.w, t.x + t.w) + 4, y0 = Math.min(f.y, t.y) - 4, y1 = Math.max(f.y + f.h, t.y + t.h) + 4;
  const path = [...box.children].filter(c => { if (c.classList.contains("glayer")) return false; const r = gRect(c, box); return r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0; });
  path.forEach(c => c.classList.add("gpath"));
  box.prepend(layer); box.classList.add("gliding");
  const g = box._glide = { layer, anims, done: o.done, path };
  // the control's own fill comes back without its transitions (done turns them off for a frame)
  // Nov 24 (Max: the static part popped in at the end, and a glass thumb got its rim back at once): the
  // control's own fill, rim and label colour come back under the landed colour, which then fades out over
  // GLIDE_HANDOFF ms instead of vanishing in one frame
  anims[0].onfinish = () => {
    if (box._glide !== g) return; box._glide = null;
    // Nov 24 round 3: the part's own fill must be in place in this very frame. A finished animation's
    // event runs just before the frame's rAF callbacks, so a "transitions off until the next rAF" in done
    // was undone before the style was worked out, and a glass tab faded from see-through grey to white
    // (and its label from light to dark) after the colour had landed: settled() works the style out at once.
    settled([...box.children].filter(c => c !== layer), () => { if (o.done) o.done(false); box.classList.remove("gliding"); path.forEach(c => c.classList.remove("gpath")); });
    if (box._handoff) box._handoff.remove();
    // a see-through colour (a glass tab's white) over the same colour adds up to a brighter one while it
    // fades: it goes at once, as the colour now carries the part's rim and matches it
    if (aTo < 1) { layer.remove(); return; }
    box._handoff = layer;
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: GLIDE_HANDOFF, easing: "ease-out", fill: "forwards" }).onfinish = () => { layer.remove(); if (box._handoff === layer) box._handoff = null; };
  };
}
// Every two-state toggle glides like the other choices (Max, Nov 23: "Group screens into tabs" and the
// Original/Morphe toggle still slid on their own). One helper for all of them: a switch (.sw, its thumb is
// ::after), the Original/Morphe toggle (.seg and the tutorial's .tseg, ::before) and the two-way toggle
// (.lt7 > i). put(v) sets the control to a state; was and now are the two states. Used by the list, the
// screen menu, the top bar and the tutorial.
function thumbBox(x) {
  const th = x.matches(".lt7") && x.querySelector(":scope > i");
  const cs = th ? getComputedStyle(th) : getComputedStyle(x, x.matches(".seg, .tseg") ? "::before" : "::after");
  let r;
  if (th) r = gRect(th, x);
  else { const m = cs.transform && cs.transform !== "none" ? new window.DOMMatrixReadOnly(cs.transform) : null; r = { x: parseFloat(cs.left) + (m ? m.e : 0), y: parseFloat(cs.top) + (m ? m.f : 0), w: parseFloat(cs.width), h: parseFloat(cs.height) }; }
  return { r, bg: cs.backgroundColor, rim: cs.boxShadow, rad: parseFloat(cs.borderTopLeftRadius) || 0 };
}
function toggleGlide(x, was, now, put) {
  if (!x || !x.isConnected || !x.offsetWidth || String(was) === String(now)) { put(now); return; }
  const running = glideNow(x); glideStop(x);
  x.classList.add("still"); put(was); void x.offsetWidth; const f = thumbBox(x);
  put(now); void x.offsetWidth; const t = thumbBox(x); // read at once: the style object is live
  if (running) f.r = running;
  put(was); void x.offsetWidth; x.classList.remove("still"); void x.offsetWidth; put(now); // the labels' colour still eases
  glideRun(x, f.r, t.r, { bg: t.bg, fromBg: f.bg, rim: t.rim, radius: t.rad, z: x.matches(".sw") ? 1 : -1 });
}
// The Original/Morphe toggle in the top bar
function modeButtons(was, now) {
  toggleGlide(document.querySelector(".appbar .seg"), was, now, m => { $("btnOrig").setAttribute("aria-pressed", String(m === "orig")); $("btnMod").setAttribute("aria-pressed", String(m === "mod")); });
}
// A row of choices whose picked one carries the fill itself (the tutorial's small menu pickers and tabs):
// pickSnap before the change, pickGlide after it.
function pickSnap(box, sel = ".on") {
  const o = box && box.querySelector(`:scope > ${sel}`); if (!o) return null;
  const cs = getComputedStyle(o), r = glideNow(box) || gRect(o, box); glideStop(box);
  return { r, bg: cs.backgroundColor, rad: parseFloat(cs.borderTopLeftRadius) || 0 };
}
function pickGlide(box, f, sel = ".on", z = -1) {
  const n = box && box.querySelector(`:scope > ${sel}`); if (!f || !n) return;
  glideRun(box, f.r, gRect(n, box), { bg: settledBg(n), fromBg: f.bg, rim: settledRim(n), radius: f.rad, z });
}
// Option pills: optSnap runs before the state changes (the grid is redrawn), optGlide once the new grid
// is laid out, in every option grid (list rows and the "needs" popup).
let optFrom = null;
function optSnap(btn) {
  optFrom = null;
  const box = btn.closest(".ctl.optgrid"); if (!box || GLIDE_REDUCED.matches) return;
  const old = box.querySelector('.opt[aria-pressed="true"]'), now = glideNow(box);
  const r = now || (old ? gRect(old, box) : gRect(btn, box));
  optFrom = { k: btn.dataset.set, pop: !!box.closest(".dlglist"), ...r, bg: box._glide ? box._glide.layer.firstChild.style.backgroundColor : old ? getComputedStyle(old).backgroundColor : null, t: performance.now() };
  glideStop(box);
}
function optGlide() {
  const f = optFrom; optFrom = null;
  if (!f || performance.now() - f.t > 400) return;
  const scope = f.pop ? document.querySelector("#dlgBox .dlglist") : $("list");
  const on = scope && [...scope.querySelectorAll(`.opt[data-set="${f.k}"][aria-pressed="true"]`)].find(o => o.offsetParent);
  const box = on && on.parentElement; if (!box || !box.classList.contains("optgrid")) return;
  const cs = getComputedStyle(on), t = gRect(on, box);
  // nothing was picked before: the colour grows out of the tapped pill
  const from = f.bg ? f : { x: t.x + t.w * .3, y: t.y + t.h * .25, w: t.w * .4, h: t.h * .5 };
  glideRun(box, from, t, { bg: settledBg(on), fromBg: f.bg, rim: settledRim(on), radius: parseFloat(cs.borderTopLeftRadius) || 0, z: 1, done: () => {
    // hand back to the pill without its background transition flashing it on the last frame
    on.style.transitionProperty = "transform"; requestAnimationFrame(() => { on.style.transitionProperty = ""; }); } });
}
const OPT_PAD = 6; // the least room beside a pill's text
const LCHIP_CHROME = 8 + 2 + 22 + 2; // left padding, gap, remove button, right padding (4 speeds a row in a ~300px card)
addEventListener("resize", () => { clearTimeout(fitOpts._t); fitOpts._t = setTimeout(() => { fitOpts(); fitLines($("list")); }, 120); });
if (document.fonts) document.fonts.ready.then(() => fitLines($("list")));
function hideLocked(list) {
  const gone = new Set();
  list.querySelectorAll(".row.dis[data-row]").forEach(r => {
    const k = r.dataset.row; if (k === selected || r.closest(".kids")) return;
    const unit = r.parentElement.classList.contains("unit") && r.parentElement.firstElementChild === r ? r.parentElement : r;
    unit.classList.add("gone", "gunit"); gone.add(k);
  });
  syncHeads(list, null);
  return gone;
}
// Captions and headings ("Swipe zones", "More settings", a Miscellaneous group) only show while
// something under them does, in every tab and list design: worked out from the rows, never fixed in
// the markup. A row folding away ("going") already counts as gone, so its heading folds with it.
// before: the headings shown before the change (headId), to fold the ones that came or went; null
// just sets them.
const HEADS = ".subhead, .sechead, .gtitle";
const isOut = n => n.classList.contains("gone") || n.classList.contains("going");
const headId = h => h.dataset.h || h.textContent;
const shownHeads = list => new Set([...list.querySelectorAll(HEADS)].filter(h => !isOut(h)).map(headId));
function headBody(h) {
  if (h.classList.contains("subhead")) { const out = []; for (let n = h.nextElementSibling; n && !n.matches(HEADS); n = n.nextElementSibling) out.push(n); return out; }
  const g = h.nextElementSibling; return g && g.classList.contains("group") ? [...g.children].filter(n => !n.matches(HEADS)) : [];
}
function syncHeads(list, before) {
  // a shared card goes once every row in it is gone
  list.querySelectorAll(".shared").forEach(c => c.classList.toggle("gone", ![...c.querySelectorAll(":scope > .row, :scope > .kin > .row")].some(n => !isOut(n)))); // a family card's rows sit in its grid
  list.querySelectorAll(HEADS).forEach(h => {
    const items = headBody(h).filter(n => !isOut(n)), show = items.length > 0, going = h.classList.contains("going");
    const gn = h.querySelector(".gn"); if (gn && show) gn.textContent = items.length;
    const was = before ? before.has(headId(h)) : show;
    if (was === show && !(going && show)) { if (!going) h.classList.toggle("gone", !show); return; }
    h.getAnimations().forEach(a => a.cancel()); h.classList.remove("going", "gone", "sizing", "sizew", "sizei");
    if (show) sizeAnim(h, true);
    else foldAway(h);
  });
  syncGroups(list);
}
// a card group stays while a row in it is still folding away
const syncGroups = list => list.querySelectorAll(".group").forEach(g => g.classList.toggle("gone", ![...g.children].some(n => !n.matches(HEADS) && !n.classList.contains("gone"))));
// folds a row or heading away, then hides it for good
function foldAway(el, then) {
  el.classList.remove("gone"); el.classList.add("going");
  const an = sizeAnim(el, false);
  const end = () => { el.classList.remove("going"); el.classList.add("gone"); el.getAnimations().forEach(a => a.cancel()); if (then) then(); };
  if (an) an.onfinish = end; else end();
}
function mergeZonePreview(list) {
  const pv = list.querySelector('.row[data-row="morphe_swipe_zone_preview"]'); if (!pv) return;
  const zs = ["left", "right", "top"].map(s => list.querySelector(`.row[data-row="morphe_swipe_${s}_zone"]`)).filter(Boolean)
    .map(r => r.parentElement.classList.contains("unit") ? r.parentElement : r).filter(e => e.parentElement === pv.parentElement);
  if (zs.length < 2) return;
  const g = document.createElement("div"); g.className = "zgrid";
  const col = document.createElement("div"); col.className = "zcol";
  zs[0].before(g); zs.forEach(e => col.appendChild(e)); g.append(col, pv); pv.classList.add("zprev");
}
// One unlock animation per setting, on one clock. Every tap redraws the list, which threw the running
// badge away with the old rows (it vanished, or a stale copy of the row brought it back from the start:
// the flicker on a quick second tap). Now a redraw picks the animation up where it was instead.
const ULK_MS = 560, unlocking = new Map(); // setting -> when its unlock animation started
// Several unlocks in one redraw (a main switch turned on unlocks every row under it) are done in
// passes over all the rows: read what is moving, write every row, then find the started animations
// in one look and move them to their time. Row by row, each read after a write made the browser
// work out the whole page's styles again (25 rows: 50 times), which was most of that redraw's cost.
let ulkBatch = null; // row -> out, while unlockBatch collects
function unlockBatch(fn) {
  if (ulkBatch) return fn();
  ulkBatch = new Map();
  let rows;
  try { fn(); } finally { rows = [...ulkBatch]; ulkBatch = null; }
  const writes = rows.map(([row, out]) => unlockPlan(row, out));
  const seeks = new Map(writes.map(w => w()).filter(Boolean).map(x => [x.row, x]));
  if (!seeks.size) return;
  // openings picked up after a redraw carry on from where they were: one look at the page's animations
  const hits = [];
  document.getAnimations().forEach(a => {
    const n = a.animationName || ""; if (!/^(unlock|lk)/.test(n)) return;
    const t = a.effect && a.effect.target, x = t && seeks.get(t.closest(".row")); if (!x) return;
    if (/^unlock/.test(n) ? t === x.row && !a.effect.pseudoElement : !!x.host && x.host.contains(t)) hits.push([a, x.el]);
  });
  hits.forEach(([a, el]) => { a.currentTime = el; });
}
function unlockFx(row, out = false) {
  if (!ulkBatch) return unlockBatch(() => unlockFx(row, out));
  if (!ulkBatch.has(row)) ulkBatch.set(row, out);
}
// reads only; returns the row's writes. When the row resumes an opening they return { row, host, el }:
// its animations are then moved to el, where the opening was
function unlockPlan(row, out) {
  const k = row.dataset.row, t0 = unlocking.get(k), resume = t0 !== undefined && performance.now() - t0 < ULK_MS;
  if (!resume) unlocking.set(k, performance.now());
  // A row that just appeared (a sub-option unfolding) is still growing from zero height with its
  // overflow clipped: measuring it then put the badge in the wrong place, clipped, between two cards.
  // So a new badge waits until the row and its sub-option group have finished moving, and it is placed
  // inside the control's own box (centred by CSS), so it can't drift from it whatever the layout does.
  const moving = resume ? [] : [row, row.closest(".kids")].filter(Boolean).flatMap(e => e.getAnimations())
    .filter(a => { const t = a.effect && a.effect.getComputedTiming(); return t && isFinite(t.endTime); });
  const go = () => {
    if (!row.isConnected) return null;
    if (!resume && moving.length) unlocking.set(k, performance.now()); // the opening plays whole once the row stops moving
    const el = performance.now() - unlocking.get(k); if (el >= ULK_MS) return null;
    // locked again mid-opening: the row's own locked cover stays, the opening fades over it
    row.querySelectorAll(out ? ".ulk, .lk7.go" : ".ulk, .lk7").forEach(e => e.remove());
    row.classList.add("unlock");
    // the locked cover comes back on the now unlocked control and plays its opening (lockOpening)
    const host = lockHost(row), u = host && lockOpening(host);
    if (!host) setTimeout(() => row.classList.remove("unlock"), ULK_MS - el);
    // locked again mid-animation (the parent tapped off): the badge fades from where it is, no jump
    else if (out) { unlocking.delete(k); u.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: "forwards" }).onfinish = () => { lockClosed(host, u); row.classList.remove("unlock"); }; }
    else setTimeout(() => { lockClosed(host, u); row.classList.remove("unlock"); }, ULK_MS - el);
    return resume ? { row, host, el } : null; // a new opening starts at zero by itself
  };
  return () => {
    row.dataset.ulk = "1";
    // the control stays locked (greyed, gold lock) until its opening starts, so it never shows unlocked first
    if (!resume && !out) { const h = lockHost(row); if (h && !h.querySelector(".lk7")) h.insertAdjacentHTML("beforeend", LOCK_COVER); }
    if (!moving.length) return go();
    let done = false; const once = () => { if (!done) { done = true; go(); } };
    Promise.all(moving.map(a => a.finished.catch(() => {}))).then(once); setTimeout(once, 700);
    return null;
  };
}
// after a redraw: running unlocks carry on on the new rows (only while the setting is still unlocked)
function carryUnlocks(list) {
  const now = performance.now();
  unlocking.forEach((t, k) => {
    if (now - t >= ULK_MS) return unlocking.delete(k);
    const r = list.querySelector(`.row[data-row="${k}"]`);
    if (!r || r.dataset.ulk || r.classList.contains("hide")) return;
    unlockFx(r, r.classList.contains("dis") || !parentsOk(k));
  });
}
// copies of old rows (kept on screen while they fold away) must not bring a finished or running badge back
// ---- The lock on a locked setting's control, and its opening
// The gold lock (same colour as the "Parent setting must be…" line) is drawn in two parts, the shackle
// and the body, so it can open and break.
const LOCK_SVG = `<svg class="lki" viewBox="0 0 24 24" aria-hidden="true"><path class="lks" d="M8 11V8a4 4 0 0 1 8 0v3"/><rect class="lkb" x="5.5" y="10.5" width="13" height="10" rx="2.4"/><circle class="lkk" cx="12" cy="15.5" r="1.5"/></svg>`;
// a <b>, not a <span>: the toggle styles its own spans (its two words)
const LOCK_COVER = `<b class="lk7" aria-hidden="true">${LOCK_SVG}</b>`;
// the cover goes inside the control's own box (a toggle, a switch, a state chip, a box of options)
const withLock = html => html.replace(/<\/(\w+)>\s*$/, `${LOCK_COVER}</$1>`);
const lockHost = row => row.querySelector(".side > .lt7, .side > .sw, .side > .state") || row.querySelector(".txt > .ctl");
// The opening (Max, Nov 23: design A "Doors"), in ULK_MS like the rest of the unlock: the shackle swings
// open on the left door, the lock cracks down the middle and its two halves slide out to both ends with
// the grey, like sliding doors. As they part, each door casts a shadow on the control behind it and shows
// a lit edge, and a shade over the control lifts, so the doors read as in front of it. The control itself
// is never moved, scaled or filtered: that made it settle and shift at the end (Max, Nov 23).
function lockOpening(host) {
  const u = document.createElement("b");
  u.className = "lk7 go"; u.setAttribute("aria-hidden", "true");
  const half = side => `<span class="lkh ${side}"><span class="lkc">${LOCK_SVG}</span></span>`;
  u.innerHTML = `<span class="lkshade"></span>` + half("l") + half("r");
  host.appendChild(u);
  return u;
}
const lockClosed = (host, u) => u.remove();
const stripUnlock = root => { root.querySelectorAll(".ulk, .lk7.go").forEach(e => e.remove()); (root.matches?.(".row") ? [root] : []).concat([...root.querySelectorAll(".row")]).forEach(r => { r.classList.remove("unlock"); delete r.dataset.ulk; }); };

// ------------------------------------------------------------------ search
let searching = false, query = "";
// A search started on the screen menu and closed without opening a result goes back to the menu (Max,
// Nov 24: it opened the screen of the last card used); search closes the menu while it is open.
let searchFromMenu = false;
function setSearch(on) {
  if (on === searching) return;
  if (on) searchFromMenu = pickerOpen;
  searching = on;
  // the bar grows out of the search button to both sides, and shrinks back into it
  { const bar = $("searchBar"), b = bar.getBoundingClientRect(), r = $("btnSearch").getBoundingClientRect();
    if (b.width && r.width) { bar.style.setProperty("--cl", Math.max(0, r.left - b.left) + "px"); bar.style.setProperty("--cr", Math.max(0, b.right - r.right) + "px"); } }
  $("app").classList.toggle("searching", on);
  $("btnSearch").setAttribute("aria-expanded", String(on));
  $("q").tabIndex = on ? 0 : -1; $("qClose").tabIndex = on ? 0 : -1;
  if (on) { stopDemo(); stopScenario(); setPicker(false); $("q").value = query; setTimeout(() => { $("q").focus(); $("q").select(); }, 60) /* a remembered search is selected, so one key replaces or clears it */; $("scroller").scrollTop = 0; renderList(); }
  else { $("q").blur(); renderStage(); renderList(); if (searchFromMenu) { searchFromMenu = false; setPicker(true); } }
}
const SEARCH_LITTLE = new Set(["a", "an", "the", "to", "in", "on", "of", "for", "and", "or", "into", "at", "by", "with"]);
const SEARCH_SAME = [["swipe", "pull", "slide", "drag", "flick"], ["zoom", "pinch"], ["hide", "remove"], ["button", "btn"], ["fullscreen", "full"]];
const searchStem = w => { w = w.replace(/(?:ing|ed|es|s)$/, ""); if (w.length > 3) w = w.replace(/e$/, ""); return w.replace(/([b-df-hj-np-tv-z])\1$/, "$1"); };
const searchStems = t => String(t).toLowerCase().replace(/[-_/·›.,:;()"“”']+/g, " ").split(/\s+/).filter(Boolean).map(searchStem);
// the typed words, each as the stems that may stand for it
function searchTerms(q) {
  const raw = String(q).toLowerCase().replace(/[-_/·›.,:;()"“”']+/g, " ").split(/\s+/).filter(Boolean);
  const kept = raw.filter(w => !SEARCH_LITTLE.has(w));
  return (kept.length ? kept : raw).map(w => { const st = searchStem(w), grp = SEARCH_SAME.find(g => g.some(x => searchStem(x) === st)); return grp ? grp.map(searchStem) : [st]; });
}
function renderSearch() {
  $("list").dataset.view = "search";
  const q = query.trim().toLowerCase();
  // settings this device leaves out of the lists (offDevice) are still found, locked, with the reason
  const all = CAT.preferences.filter(p => inYtVersion(p.key) && p.locationConfidence !== "root" && !(p.type === "screen" && offDevice(p.key)));
  if (!q) { paint($("list"), `<div class="shint">Type to search all ${all.length} settings.</div>`); return; }
  const words = q.split(/\s+/).filter(Boolean);
  // a search reads words the way a person types them (Max, Nov 24: "Pull up to fullscreen" found nothing):
  // hyphens and underscores are spaces ("swipe-up", the key's "pulled_up"), word endings don't matter
  // (pulled, pulling, pull), the gesture verbs stand for each other (swipe, pull, slide, drag, flick),
  // and little words (to, the, in...) only count when nothing else is typed. Every setting's own title,
  // the title the list shows (the clean design drops Hide / Disable), its descriptions, sub-screen, tab,
  // group heading and key are searched.
  const terms = searchTerms(q);
  const hits = [];
  for (const p of all) {
    const sec = SECTIONS.find(s => s.id === resSection(p.key));
    const hay = searchStems(`${title(p.key)} ${shownTitle(p.key)} ${p.summary || ""} ${p.summaryOn || ""} ${p.summaryOff || ""} ${p.subScreenTitle || ""} ${placeLabel(resSection(p.key))} ${p.key}`);
    if (!terms.every(alts => alts.some(w => hay.some(h => h.startsWith(w))))) continue;
    const t = title(p.key).toLowerCase();
    hits.push({ p, sec, score: (t.startsWith(q) ? 0 : t.includes(q) ? 1 : 2) });
  }
  // a sub-screen and its own main switch with the same name (Voice over translation) are one result: the setting
  for (let i = hits.length - 1; i >= 0; i--) { const s = hits[i].p; if (s.type === "screen" && hits.some(h => h.p.subScreen === s.key && title(h.p.key) === title(s.key))) hits.splice(i, 1); }
  hits.sort((a, b) => a.score - b.score || SECTIONS.indexOf(a.sec) - SECTIONS.indexOf(b.sec));
  const mark = t => { let h = esc(t); for (const w of words) h = h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>"); return h; };
  paint($("list"), hits.length
    ? `<div class="sechead">${hits.length} result${hits.length > 1 ? "s" : ""}</div><div class="group">${hits.slice(0, 120).map(({ p, sec }) => {
        const par = PARENT_OF[p.key];
        const where = p.type === "screen" ? `Screen · ${placeLabel(resSection(p.key))}` : `${placeLabel(resSection(p.key))}${par ? ` › ${title(par)}` : ""}`;
        const off = offDevice(p.key);
        return `<div class="sres${off ? " soff" : ""}" data-res="${p.key}" tabindex="0"><div class="ttl">${mark(title(p.key))}${off ? I("lock", "lk") : ""}</div><div class="where">${esc(where)}</div>${off ? `<div class="sum need">${esc(deviceWhy(p.key))}</div>` : summaryFor(p.key) ? `<div class="sum">${esc(summaryFor(p.key))}</div>` : ""}</div>`;
      }).join("")}</div>`
    : `<div class="shint">No settings match “${esc(query)}”.</div>`);
}
$("btnSearch").onclick = () => setSearch(true);
$("qClose").onclick = () => { query = ""; setSearch(false); };
$("q").addEventListener("input", e => { query = e.target.value; renderSearch(); });
$("q").addEventListener("keydown", e => { if (e.key === "Escape") { query = ""; setSearch(false); } if (e.key === "Enter") { const f = $("list").querySelector("[data-res]"); if (f) openResult(f.dataset.res); } });
// a setting this device leaves out has no row to open: its result stays, and its reason pulses
function openResult(k) {
  if (offDevice(k)) { const r = $("list").querySelector(`[data-res="${k}"] .need`); if (r) r.animate([{ opacity: .35 }, { opacity: 1 }, { opacity: .35 }, { opacity: 1 }], { duration: 700 }); return; }
  searchFromMenu = false; chooseCard(); setSearch(false); returnTo = null; goToSetting(k);
}
// the tab a result belongs to; a setting left out on this device keeps the tab it would be in
const resSection = k => offDevice(k) && A[k] && SECTIONS.some(s => s.id === A[k].section) ? A[k].section : sectionOf(k);

function renderInspector() {
  // the in-app editor never shows the inspector (app.css): drawing it there was a third of every change's work
  if (document.documentElement.classList.contains("inapp")) return;
  const k = selected, p = k && PREF[k];
  if (!p) $("selCard").innerHTML = `<h2>Selected</h2><p>Nothing selected. Tap a component in the preview or a row in the list.</p>`;
  else {
    const a = A[k];
    const src = p.sourceFile ? `<a href="https://github.com/MorpheApp/morphe-patches/blob/main/${esc(p.sourceFile)}" target="_blank" rel="noopener">${esc(p.sourceFile.split("/").pop())}</a>` : "–";
    $("selCard").innerHTML = `<h2>Selected</h2><h3>${esc(shownTitle(k))}</h3><p>${esc(cleanSum(k, fmtSum(k, p.summary || "")) || summaryFor(k) || "")}</p>
      <dl class="kv">
        <dt>Key</dt><dd>${esc(k)}</dd>
        <dt>Adapter</dt><dd><span class="pill">${a ? (a.kind === "scenario" ? "ScenarioAnimation" : KIND_NAME[a.kind]) : KIND_NAME.fallback}</span></dd>
        <dt>Type</dt><dd>${esc(p.type || p.widget)}${p.rebootApp ? ' · <span style="color:var(--m-warning)">restarts app</span>' : ""}</dd>
        <dt>Default</dt><dd>${esc(JSON.stringify(defaults[k]))}</dd>
        <dt>Current</dt><dd>${esc(JSON.stringify(state[k]))}</dd>
        <dt>Stock</dt><dd>${esc(JSON.stringify(stockOf(k)))}</dd>
        <dt>Screen</dt><dd>${esc([p.screenTitle, p.subScreenTitle].filter(Boolean).join(" › ") || "–")}</dd>
        <dt>Patch</dt><dd>${esc(p.patch || "(internal)")}</dd>
        <dt>Source</dt><dd>${src}</dd>
        ${p.parents && p.parents.length ? `<dt>Depends on</dt><dd>${p.parents.map(x => esc((x.mode === "not" ? "!" : "") + x.key)).join("<br>")}</dd>` : ""}
      </dl>`;
  }
  const total = CAT.preferences.length;
  // Every setting is in the editor; what differs is how much the preview does for it. Three kinds,
  // the same in the totals, each tab's bar and its list: animated (plays a demo or an Off / On
  // comparison), shown (drawn in the preview, changes it, no animation), no preview (a plain row under
  // the tab's "More settings", or in Miscellaneous when it has no tab).
  const okNone = k => NO_PREVIEW_OK.has(k) || NO_PREVIEW_OK.has(sectionOf(k));
  // a setting without its own entry that still lights up a part of the preview counts as shown: it
  // acts on another setting's element (NEEDS), flashes a named one (PROXY_K) or its parent's element in the preview (a
  // sub-option such as "Tap Playback speed button to cycle speeds")
  const lights = k => { if (NEEDS[k] || PROXY_K[k]) return true; const seen = new Set(); for (let p = PARENT_OF[k]; p && !seen.has(p); p = PARENT_OF[p]) { seen.add(p); if ((A[p] && A[p].kind !== "scenario") || NEEDS[p] || PROXY_K[p]) return true; } return false; };
  const kindOf = k => A[k] && A[k].kind !== "list" ? (isAnimated(k) ? "anim" : "shown") : NO_PREVIEW_OK.has(k) ? "ok" : lights(k) ? "shown" : okNone(k) ? "ok" : "none";
  const count = keys => { const c = { anim: 0, shown: 0, ok: 0, none: 0 }; keys.forEach(k => c[kindOf(k)]++); return c; };
  const bar = (c, t) => `<div class="bar3">${["anim", "shown", "ok", "none"].map(x => c[x] ? `<i class="${x}" style="width:${c[x] / t * 100}%"></i>` : "").join("")}</div>`;
  const all = count(CAT.preferences.map(p => p.key));
  const tabs = SECTIONS.filter(s => s.id !== "misc").map(s => { const m = MEMBERS[s.id], keys = [...m.live, ...m.misc]; return { s, keys, c: count(keys) }; });
  const miscN = MEMBERS.misc ? MEMBERS.misc.live.length + MEMBERS.misc.misc.length : 0;
  const openTabs = new Set([...$("covCard").querySelectorAll("details[open]")].map(d => d.dataset.s)); // stays open through redraws
  $("covCard").innerHTML = `<h2>Coverage</h2>
    <p class="covlead">All ${total} settings in Morphe are in the editor. The bars show how much the preview does for them.</p>
    <div class="covkey"><span><i class="anim"></i><b>${all.anim}</b> animated</span><span><i class="shown"></i><b>${all.shown}</b> shown, not animated</span><span><i class="ok"></i><b>${all.ok}</b> no preview, approved</span><span><i class="none"></i><b>${all.none}</b> no preview</span></div>
    <div class="covhelp">Animated: plays a demo or an Off / On comparison. Shown: drawn in the preview, or lights up the part of it it changes, without an animation. Approved: no preview, and fine that way. No preview: a plain setting row, under its tab's "More settings" (or in Miscellaneous when it has no tab). Tap a tab to see its settings without a preview.</div>
    <div class="cov">${tabs.map(({ s, keys, c }) => `<details class="r3" data-s="${s.id}"${openTabs.has(s.id) ? " open" : ""}><summary><span>${esc(s.title)}</span>${bar(c, keys.length)}<span class="num">${c.anim}<i>·</i>${c.shown}<i>·</i>${c.ok}<i>·</i>${c.none}</span></summary>
      <div class="covmiss">${c.none || c.ok ? keys.filter(k => /none|ok/.test(kindOf(k))).map(k => `<div>${esc(shownTitle(k))}${kindOf(k) === "ok" ? " <i>(approved)</i>" : ""}</div>`).join("") : "Every setting here has a preview."}</div></details>`).join("")}</div>
    <div class="covhelp">Numbers per tab: animated · shown · approved without preview · no preview. ${miscN ? `Miscellaneous holds ${miscN} more with no tab of their own.` : ""}</div>
    <p style="margin-top:12px;font-size:12px">Source: <span style="font-family:var(--mono)">${esc(CAT.source)}</span></p>`;
  const ch = changedOnly(); const n = Object.keys(ch).length;
  $("chgCard").innerHTML = `<h2>Changed settings</h2><p>${n ? `${n} setting${n > 1 ? "s" : ""} differ from Morphe's defaults. Saved in this browser only.` : "All settings are at Morphe's defaults."}</p>
    ${n ? `<pre class="json" id="json">${esc(JSON.stringify(ch, null, 1))}</pre>` : ""}
    <div class="btnrow">${n ? `<button class="btn" id="copyJson">Copy as JSON</button><button class="btn danger" id="resetAll">Reset all</button>` : ""}</div>`;
  const cp = $("copyJson");
  if (cp) cp.onclick = () => { const txt = JSON.stringify(ch, null, 1); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => snack("Copied changed settings"), () => selectPre()); };
  const rs = $("resetAll");
  if (rs) rs.onclick = () => { const before = { ...state }; setPrefs(defaults); commit(); snack("Reset all settings to defaults", () => { setPrefs(before); commit(); }); };
}
function selectPre() { const pre = $("json"); if (!pre) return; const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); snack("Press Ctrl+C to copy"); }

function renderAll() { renderBar(); renderStage(); renderList(); renderInspector(); applyLayout(); store.save(); }
function commit() { window.__drawBehind = null; applyAppColors(); renderBar(); renderStage(); renderList(); renderInspector(); store.save(); }

// ------------------------------------------------------------------ restart handling
const pendingRestart = () => Object.keys(PREF).filter(k => PREF[k].rebootApp && JSON.stringify(state[k]) !== JSON.stringify(baseline[k]));
// iOS-like cards (Max, Nov 24, every design): a popup grows out of the row, button or preview part that
// was just tapped and shrinks back into it when it closes. It starts clipped to that part's size and
// place and opens on the shared spring (--spring), so its text never squashes. Without a tap just before
// it (the Back key, a timer, a popup opened from another popup) it springs up in place (CSS). Closing
// finds the row again by its key when the list was redrawn meanwhile (a choice was made).
let cardTap = null, cardOrigin = null, cardAnim = null;
// Nov 24 round 3 (Max: "too slow, increase animation by 50%"): 520 and 300 ms played 1.5x as fast
const DLG_OPEN_MS = 350, DLG_CLOSE_MS = 200;
document.addEventListener("pointerdown", e => {
  const el = e.target.closest && e.target.closest("#app .row, #app button, #app .c, #app .pick");
  // the button or pill itself when one was tapped (Max, Nov 24: it grew from the whole row, not the button),
  // the row when the row was; a part too small or too wide to read as a source falls back to its row
  const row = el && el.closest(".row"), r = el && el.getBoundingClientRect();
  const own = el && (el.matches("button, .c, .pick") && r.width >= 16 && r.height >= 12 && r.width < 300 || !row);
  // (a menu card's place and corners are kept too: the menu may be drawn again before its screen grows from it)
  const card = el && el.closest("#picker .pick");
  cardTap = el && !el.closest("#dlg") ? { el: own ? el : row, key: el.closest("[data-row]")?.dataset.row, cls: own && el !== row ? el.classList[0] : null, t: performance.now(), card: card ? { rect: card.getBoundingClientRect(), radius: getComputedStyle(card).borderRadius } : null } : null;
}, true);
// a press the system took over (a Back swipe from the screen's edge starts as a press on whatever is
// under the finger) is no tap: nothing grows from that button later
document.addEventListener("pointercancel", () => { cardTap = null; }, true);
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function cardRect(o) {
  if (!o) return null;
  let el = o.el;
  if (!el.isConnected && o.key) { const row = document.querySelector(`#list [data-row="${CSS.escape(o.key)}"]`); el = row && (o.cls && row.querySelector("." + CSS.escape(o.cls)) || row); }
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  return r.width > 4 && r.height > 4 ? r : null;
}
// [the part's frame, the popup's own frame] (page px are turned into the popup's px: the preview phone is scaled).
// Nov 24 round 2 (Max: "not very smooth or refined"): transform and opacity only, so the phone's compositor
// draws every frame (a moving clip was repainted each frame); the popup is scaled evenly, never squashed,
// from about the size of the part, centred on it.
function cardFrames(box, r) {
  const b = box.getBoundingClientRect(), k = b.width / box.offsetWidth || 1, w = box.offsetWidth || 1, h = box.offsetHeight || 1;
  const s0 = Math.max(.12, Math.min(.6, Math.max(r.width / k / w, r.height / k / h)));
  const dx = (r.left + r.width / 2 - b.left - b.width / 2) / k, dy = (r.top + r.height / 2 - b.top - b.height / 2) / k;
  return [{ transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s0.toFixed(3)})` }, { transform: "translate(0px, 0px) scale(1)" }];
}
function cardStop() {
  const a = cardAnim; cardAnim = null; if (a) a.cancel();
  $("dlg").classList.remove("closing"); $("dlgBox").style.transition = "";
}
// the CSS transition is held while the frames play: a running transition would win over them
function cardPlay(frames, o, done) {
  const box = $("dlgBox"); box.style.transition = "none";
  const a = cardAnim = box.animate(frames, o);
  a.onfinish = () => { if (cardAnim !== a) return; cardAnim = null; box.style.transition = ""; if (done) done(); };
}
function openDialog(html) {
  const dlg = $("dlg"), box = $("dlgBox"), was = dlg.classList.contains("open");
  let r = null;
  if (!was) {
    cardStop();
    cardOrigin = cardTap && performance.now() - cardTap.t < 1500 ? cardTap : null; cardTap = null;
    r = !GLIDE_REDUCED.matches && cardRect(cardOrigin);
    if (r) box.style.transition = "none"; // measured at its open size, not mid-transition
  }
  paint(box, html); dlg.classList.add("open"); glassSample();
  if (r) { const [from, to] = cardFrames(box, r); cardPlay([{ ...from, opacity: 0 }, { offset: .25, opacity: 1 }, { ...to, opacity: 1 }], { duration: DLG_OPEN_MS, easing: cssVar("--spring") || "ease-out" }); }
  setTimeout(() => box.querySelector("button")?.focus(), 50);
}
function closeDialog() {
  const dlg = $("dlg"), box = $("dlgBox");
  if (!dlg.classList.contains("open")) return;
  cardStop(); // measured at its open place, not mid-spring
  const r = !GLIDE_REDUCED.matches && cardRect(cardOrigin), f = r && cardFrames(box, r);
  cardOrigin = null;
  dlg.classList.remove("open");
  if (!f) return;
  dlg.classList.add("closing"); // stays visible while it shrinks back (taps already go through)
  cardPlay([{ ...f[1], opacity: 1 }, { offset: .55, opacity: .85 }, { ...f[0], opacity: 0 }], { duration: DLG_CLOSE_MS, easing: "cubic-bezier(.4, 0, .2, 1)" }, () => dlg.classList.remove("closing"));
}
// The same grow-from-the-button motion for every other popup (Max, Nov 25: the Reset dialog's popup is
// perfect, give it to every popup menu): the screen menu from the button that opened it, the preview's
// tray of buttons that are off from its pill. open: it grows out of src; closing: it shrinks back into src.
// Transform and opacity only, the dialogs' timing and spring; the popup's own CSS transition is held.
function popFrom(el, src, open, done, spring = "--spring") {
  const r = !GLIDE_REDUCED.matches && el && el.isConnected && src && src.isConnected && src.getBoundingClientRect();
  if (!r || r.width < 4 || r.height < 4) { if (done) done(); return null; }
  if (el._pop) el._pop.cancel();
  el.style.transition = "none"; el.style.transformOrigin = "50% 50%"; // cardFrames scales about the middle
  const [from, to] = cardFrames(el, r);
  const a = el._pop = el.animate(open ? [{ ...from, opacity: 0 }, { offset: .25, opacity: 1 }, { ...to, opacity: 1 }] : [{ ...to, opacity: 1 }, { offset: .55, opacity: .85 }, { ...from, opacity: 0 }],
    { duration: open ? DLG_OPEN_MS : DLG_CLOSE_MS, easing: open ? cssVar(spring) || cssVar("--spring") || "ease-out" : "cubic-bezier(.4, 0, .2, 1)" });
  const reset = () => { el._pop = null; el.style.transition = el.style.transformOrigin = ""; };
  a.onfinish = () => { if (el._pop !== a) return; reset(); if (done) done(); };
  a.oncancel = () => { if (el._pop === a) reset(); };
  return a;
}
// Changes that only apply after YouTube restarts (Max, Nov 20). Values are saved as soon as they are
// changed; leaving asks what to do with these: restart now, keep them for later, or reset them to the
// values YouTube runs with. Opening the editor again with some still waiting asks the same in reverse.
// leaveHost holds what each answer does: the web demo's versions here, the in-app editor's in app-post.js.
const pendingList = keys => `<ul>${keys.map(k => `<li>${esc(shownTitle(k))}</li>`).join("")}</ul>`;
const nSettings = n => `${n} setting${n > 1 ? "s" : ""}`;
const leaveHost = {
  restart() { $("restarting").classList.add("on"); setTimeout(() => { baseline = { ...state }; storeBaseline(); savedPending(null); renderBar(); $("restarting").classList.remove("on"); snack("YouTube restarted. All changes are applied."); }, 1400); },
  saveForLater() { savedPending(pendingRestart()); webLeave("Saved. They apply the next time YouTube restarts"); },
  reset(leaving) { for (const k of pendingRestart()) setPref(k, baseline[k]); savedPending(null); commit(); if (leaving) webLeave("Changes reset"); else snack("Changes reset"); },
};
function webLeave(msg) {
  const app = $("app"); app.classList.remove("exitflash"); void app.offsetWidth; app.classList.add("exitflash");
  setTimeout(() => snack(`${msg} (demo: the editor reopens)`), 350);
}
function savedPending(keys) { try { if (keys && keys.length) localStorage.setItem(LS + "-pending", JSON.stringify(keys)); else localStorage.removeItem(LS + "-pending"); } catch { /* storage unavailable */ } }
function resetConfirm(n, leaving, back) {
  openDialog(`<div class="di">${I("reset")}</div><h2 id="dlgTitle">Reset these changes?</h2>
    <p>${nSettings(n)} go${n > 1 ? "" : "es"} back to the value${n > 1 ? "s" : ""} YouTube is running with now.</p>
    <div class="acts"><button class="dbtn primary neg" id="dReset">Reset</button><button class="dbtn tonal" id="dBack">Cancel</button></div>`);
  $("dReset").onclick = () => { closeDialog(); leaveHost.reset(leaving); };
  $("dBack").onclick = back;
}
// leaving the editor
function restartDialog() {
  const keys = pendingRestart();
  openDialog(`<div class="di">${I("restart")}</div><h2 id="dlgTitle">Restart to apply</h2>
    <p>${nSettings(keys.length)} only take${keys.length > 1 ? "" : "s"} effect after YouTube restarts. They are saved.</p>
    ${pendingList(keys)}
    <div class="acts"><button class="dbtn primary" id="dRestart">Restart now</button><button class="dbtn tonal" id="dLater">Save for later</button><button class="dbtn text neg" id="dReset">Reset changes</button></div>`);
  $("dRestart").onclick = () => { closeDialog(); leaveHost.restart(); };
  $("dLater").onclick = () => { closeDialog(); leaveHost.saveForLater(); };
  $("dReset").onclick = () => resetConfirm(keys.length, true, restartDialog);
}
// opening the editor with changes saved earlier that still wait for a restart
// (saved: the keys the app kept from the last visit; the App view stand-in has no live values, so it
// can only list those)
function pendingDialog(saved = []) {
  const now = pendingRestart(), keys = now.length ? now : saved.filter(k => PREF[k]); if (!keys.length) return;
  openDialog(`<div class="di">${I("restart")}</div><h2 id="dlgTitle">Changes not applied yet</h2>
    <p>You saved ${nSettings(keys.length)} last time. YouTube hasn't restarted since, so ${keys.length > 1 ? "they aren't" : "it isn't"} applied yet.</p>
    ${pendingList(keys)}
    <div class="acts"><button class="dbtn primary" id="dRestart">Apply and restart</button><button class="dbtn tonal" id="dGo">Continue changes</button><button class="dbtn text neg" id="dReset">Reset changes</button></div>`);
  $("dRestart").onclick = () => { closeDialog(); leaveHost.restart(); };
  $("dGo").onclick = closeDialog;
  $("dReset").onclick = () => resetConfirm(keys.length, false, () => pendingDialog(saved));
}
// The menu's three-way toggles: one thumb slides to the picked option (Max, Nov 22). The picker
// is drawn again on every change, so the thumb starts from where the old one was (seg3From) and glides.
// Picking a Settings list design opens a sample of it in a popup (Max, Nov 23 PM: the sample under the
// toggle showed all the time; it now shows when the design is picked, says what it is, and closes with
// OK). A real card of the list drawn in the picked design: two settings, so a switch and a choice both
// show; it is drawn by rowHTML itself, so it always matches the list. It doesn't react to taps.
const DESIGN_SAMPLE = ["morphe_hide_cast_button", "morphe_hide_autoplay_button"];
const LIST_DESIGNS = [["classic", "Morphe"], ["toggles", "Switches"], ["clean", "Clean"]];
function designPreview() {
  const ks = DESIGN_SAMPLE.filter(k => PREF[k] && inVersion(k));
  if (!ks.length) return "";
  let rows = ks.map(k => rowHTML(k, true)).join("");
  rows = rows.replace(/\s(data-row|data-k|data-also|data-set|data-sw|tabindex|data-kidtoggle|data-goto)="[^"]*"/g, "").replace(/\b(sel|dis|peek)\b(?=[^"]*")/g, "");
  return `<div class="dprev" aria-hidden="true" inert><div class="group">${rows}</div></div>`;
}
function designPopup() {
  const name = (LIST_DESIGNS.find(([id]) => id === design) || [, design])[1], sample = designPreview();
  if (!sample) return;
  openDialog(`<div class="di">${I("list")}</div><h2 id="dlgTitle">${esc(name)} list design</h2>
    <p>A sample of how settings look in the list with this design. These two are examples only and can't be changed here.</p>
    ${sample}
    <div class="acts"><button class="dbtn primary" id="dOk">OK</button></div>`);
  $("dOk").onclick = closeDialog;
}
// Every three-way toggle in the menu (UI design, Settings list design) works the same way.
// off: choices this device can't use, drawn greyed out; tapping one says why instead of picking it
const seg3 = (label, attr, opts, cur, off = []) => `<div class="seg3" role="radiogroup" aria-label="${label}" data-seg="${attr}"><i class="seg3-th"></i>${opts.map(([id, t]) => `<button role="radio" data-${attr}="${id}" aria-checked="${cur === id}"${off.includes(id) ? ' aria-disabled="true"' : ""}>${t}</button>`).join("")}</div>`;
let seg3From = {};
function seg3Snap(root = $("pickGrid")) { root.querySelectorAll(".seg3.th").forEach(seg => { const th = seg.querySelector(".seg3-th"), now = glideNow(seg); seg3From[seg.dataset.seg] = now ? [now.x, now.w] : [th.offsetLeft, th.offsetWidth]; glideStop(seg); }); }
function placeSeg3(root = $("pickGrid")) {
  root.querySelectorAll(".seg3").forEach(seg => {
    const th = seg.querySelector(".seg3-th"), on = seg.querySelector('[aria-checked="true"]');
    if (!th || !on || !on.offsetWidth) return; // hidden: the picked button keeps its own fill (CSS)
    const to = [on.offsetLeft, on.offsetWidth], from = seg3From[seg.dataset.seg]; delete seg3From[seg.dataset.seg];
    seg.classList.add("th"); // shown first, so its starting place is drawn and the move animates
    th.style.transition = "none"; th.style.left = to[0] + "px"; th.style.width = to[1] + "px";
    if (from) { const cs = getComputedStyle(th), y = th.offsetTop, h = th.offsetHeight; glideRun(seg, { x: from[0], y, w: from[1], h }, { x: to[0], y, w: to[1], h }, { bg: cs.backgroundColor, rim: cs.boxShadow, radius: parseFloat(cs.borderTopLeftRadius) || 0, z: -1 }); }
    requestAnimationFrame(() => { th.style.transition = ""; });
  });
}
function storeBaseline() { try { localStorage.setItem(LS + "-baseline", JSON.stringify(baseline)); } catch { /* storage unavailable */ } }
// with the search bar open, the back arrow closes search (like its cross), it doesn't leave the editor;
// this runs before any other handler of the arrow, the in-app one too
$("btnBack").addEventListener("click", e => { if (searching) { e.stopImmediatePropagation(); e.preventDefault(); $("qClose").click(); } }, true);
$("btnBack").onclick = () => {
  if (pendingRestart().length) return restartDialog();
  webLeave("Back to Morphe settings");
};
// Settings from other screens changed through the popup count as part of this screen for Reset.
const borrowed = {};
function borrowPopup(k, target) {
  const sec = SECTIONS.find(z => z.id === sectionOf(target)), p = PREF[target];
  const where = [p.screenTitle, p.subScreenTitle].filter(Boolean).join(" › ");
  openDialog(`<h2 id="dlgTitle">${esc(shownTitle(target))}</h2>
    <p class="dlgwhere">Lives on the <b>${esc(sec ? sec.title : "Miscellaneous")}</b> screen${where ? ` · in Morphe: ${esc(where)}` : ""}. “${esc(shownTitle(k))}” needs it.</p>
    <div class="dlglist">${rowHTML(target, false).replace('class="row', 'class="row inpop')}</div>
    <div class="acts"><button class="dbtn tonal" id="dDone">Done</button></div>`);
  const box = $("dlgBox");
  const after = () => {
    (borrowed[section] = borrowed[section] || new Set()).add(target);
    const r = box.querySelector(".dlglist"); if (r) r.innerHTML = rowHTML(target, false).replace('class="row', 'class="row inpop');
    commit();
    if (parentsOk(k)) setTimeout(() => { closeDialog(); const row = document.querySelector(`[data-row="${k}"]`); if (row) { scrollRowIntoView(k); unlockFx(row); } select(k); }, 350);
  };
  box.onclick = e => {
    if (e.target.id === "dDone") return closeDialog();
    const sw = e.target.closest("[data-sw]"), opt = e.target.closest("button.opt[data-set]");
    if (sw) { ensureMod(); setPref(target, !state[target]); after(); }
    else if (opt) { ensureMod(); optSnap(opt); setPref(target, coerce(target, opt.dataset.val)); after(); optGlide(); }
  };
  box.onchange = e => { const t = e.target; if (!t.dataset || t.dataset.set !== target) return; ensureMod(); setPref(target, t.type === "range" || t.type === "number" ? Number(t.value) : coerce(target, t.value)); after(); };
}
// Reset sits next to search and asks whether to reset this preview's screen or every setting.
const changedKeys = keys => keys.filter(k => JSON.stringify(state[k]) !== JSON.stringify(defaults[k]));
const screenChanges = () => changedKeys([...new Set([...sectionKeys(), ...(borrowed[section] || [])])]);
const allChanges = () => changedKeys(Object.keys(PREF));
function doReset(keys, all, label) {
  if (!keys.length) return;
  const before = {}; keys.forEach(k => { before[k] = state[k]; setPref(k, defaults[k]); });
  const lent = all ? { ...borrowed } : { [section]: borrowed[section] };
  if (all) Object.keys(borrowed).forEach(x => delete borrowed[x]); else delete borrowed[section];
  commit(); snack(`Reset ${keys.length} setting${keys.length > 1 ? "s" : ""} ${label}`, () => { setPrefs(before); Object.entries(lent).forEach(([x, v]) => { if (v) borrowed[x] = v; }); commit(); });
}
$("btnReset").onclick = () => {
  const scr = screenChanges(), all = allChanges(), name = SECTIONS.find(x => x.id === section)?.title || "this screen";
  if (!all.length) return snack("Nothing to reset: everything is at its default");
  const n = x => `${x} change${x === 1 ? "" : "s"}`;
  openDialog(`<h2 id="dlgTitle">Reset settings?</h2><p>Put settings back to Morphe's defaults.</p>
    <div class="choice"><button data-reset="screen" ${scr.length ? "" : "disabled"}><span>Only ${esc(name)}</span><small>${n(scr.length)}</small></button>
    <button data-reset="all"><span>Everything</span><small>${n(all.length)}</small></button></div>
    <div class="acts"><button class="dbtn tonal" id="dCancel">Cancel</button></div>`);
  $("dlgBox").onclick = e => {
    const b = e.target.closest("[data-reset]");
    if (e.target.id === "dCancel") return closeDialog();
    if (!b || b.disabled) return;
    closeDialog();
    if (b.dataset.reset === "all") doReset(allChanges(), true, "everywhere"); else doReset(screenChanges(), false, `on ${name}`);
  };
};
// hide the top bar while scrolling down, show it again on the way up
var progScrollUntil = 0;
// Tablets and desktops have room to spare, so there the bar always stays (phone portrait and
// landscape still hide it). Based on the app's own size, so the in-app WebView follows the device.
const barStays = () => { const a = $("app"); return a.clientWidth >= 600 && a.clientHeight >= 600; };
window.addEventListener("resize", () => { if (barStays()) $("app").classList.remove("barhidden"); });
// crossing the tablet size changes which settings Morphe offers or that do anything (offDevice): rebuild the lists then
{ let wasTab = null; window.addEventListener("resize", () => { const t = previewIsTablet(); if (wasTab !== null && t !== wasTab) { buildMembers(); renderBar(); renderList(); renderInspector(); } wasTab = t; }); }
// the editor sits one bar lower than the top (see .app > .editor): keep --abh at the bar's real height
{ const bar = document.querySelector(".appbar"); if (bar && window.ResizeObserver) new ResizeObserver(() => $("app").style.setProperty("--abh", bar.offsetHeight + "px")).observe(bar); }
{
  let lastY = 0, acc = 0, barMoveUntil = 0;
  // Nov 24 (Max: after Show on Mute button the top bar stayed hidden at the top of the list; only a small
  // scroll down and up again brought it back): a hidden bar at the top, or over a list too short to
  // scroll past it, is never right. Scrolls that came during a jump, a hold or the bar's own move were
  // ignored, and once the list sits at its top no scroll can come any more (pulling past the end only
  // stretches it), so the bar stayed hidden. barCheck brings it back from any of those, on every screen:
  // at every scroll (before anything is ignored), when a scroll or fling ends, when a finger lifts and
  // when the list changes size.
  const barCheck = () => {
    const sc = $("scroller"), app = $("app"); if (!app.classList.contains("barhidden") || window.vEditing) return; // typing a value keeps it hidden
    const bar = document.querySelector(".appbar"), abh = bar ? bar.offsetHeight : 56;
    if (sc.scrollTop < 8 || sc.scrollHeight - sc.clientHeight <= abh + 24) { app.classList.remove("barhidden"); acc = 0; barMoveUntil = performance.now() + 320; }
  };
  window.barCheck = barCheck;
  $("scroller").addEventListener("scrollend", barCheck, { passive: true });
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach(t => document.addEventListener(t, () => { barCheck(); setTimeout(barCheck, 360); }, { passive: true, capture: true }));
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(barCheck)).observe($("content"));
  // A text field's caret is drawn by the phone above everything: a focused field scrolled up under the
  // pinned preview showed its blinking caret over the preview (Max, Nov 25). Its caret is hidden while
  // the field is under the preview (or the top bar), and comes back when it scrolls out again.
  const caretCheck = () => {
    const f = document.activeElement;
    if (!f || !f.matches || !f.matches("#list input, #list textarea")) return;
    const r = f.getBoundingClientRect(), sr = $("stick")?.getBoundingClientRect();
    // the preview covers the field only where they share columns (beside the list in landscape, it doesn't)
    const over = sr && sr.left < r.right && sr.right > r.left ? sr.bottom : 0, cover = Math.max(over, $("scroller").getBoundingClientRect().top);
    f.classList.toggle("caretoff", r.top < cover - 2 || r.bottom > innerHeight);
  };
  window.caretCheck = caretCheck;
  document.addEventListener("focusin", caretCheck);
  document.addEventListener("focusout", e => e.target.classList && e.target.classList.remove("caretoff"));
  // The bar follows the way you scroll: d px of your own scrolling (down positive). Shared by the finger
  // (rubberBand hands over each of its moves, interactions.js) and wheels or trackpads (the scroll events).
  const barFollow = d => {
    const sc = $("scroller"), y = sc.scrollTop, app = $("app");
    if (window.vEditing) return;
    if (app.classList.contains("searching") || pickerOpen || barStays()) { app.classList.remove("barhidden"); acc = 0; return; }
    // only your own scrolling moves the bar: jumps to a setting (and holds) leave it where it is
    if (performance.now() < progScrollUntil || press) { acc = 0; return; }
    acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
    const bar = document.querySelector(".appbar"), hid = app.classList.contains("barhidden");
    if (bar && !hid) app.style.setProperty("--abh", bar.offsetHeight + "px");
    const room = sc.scrollHeight - sc.clientHeight - y, abh = bar ? bar.offsetHeight : 56;
    let want = hid;
    if (y < 8) want = false;
    // hidden, the list grows by the bar's height: it must still scroll past the bar then, or barCheck brings it back
    else if (acc > 24 && room > abh + 24 && sc.scrollHeight - sc.clientHeight - abh > abh + 24) want = true;
    else if (acc < -24) want = false;
    if (want !== hid) { app.classList.toggle("barhidden", want); acc = 0; barMoveUntil = performance.now() + 320; }
  };
  // On a touch screen the list moves under the finger (and its fling) through rubberBand, which tells the bar
  // each move it makes, in the moment it makes it. Max saw the bar hide and come back on one swipe (Nov 25,
  // Miscellaneous; again Nov 26): the scroll events it read also carried the page's own adjustments (a card
  // above growing or shrinking, the end of the list coming closer) and those read as scrolling the other way.
  $("scroller").__ownMove = barFollow;
  $("scroller").addEventListener("scroll", () => {
    caretCheck();
    const sc = $("scroller"), y = sc.scrollTop, d = y - lastY; lastY = y;
    if (window.vEditing) return;
    barCheck();
    if (sc.__touchOwn) return; // the finger's moves come through __ownMove
    // Wheels and trackpads: the scroll events are all there is. Showing or hiding the bar resizes the
    // scroller; near the end of the list that moves the scroll position by itself, which read as scrolling
    // the other way and flipped the bar back, so scrolls during the bar's own move are ignored.
    if (performance.now() < barMoveUntil) { acc = 0; return; }
    barFollow(d);
  }, { passive: true });
}
$("dlg").addEventListener("click", e => { if (e.target.id === "dlg") closeDialog(); });
