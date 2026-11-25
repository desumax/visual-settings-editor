"use strict";
// The first-run tutorial.

// ------------------------------------------------------------------ first-run tutorial
// Short numbered pages. Each page's animation loops until Next is pressed; the dots jump to any page.
// The pages follow the current layout: "Group screens into tabs" adds a first page about screens
// and tabs. There is no double-tap anywhere: hold, or the toggle on the card, changes a setting.
const TUT_PAGES = {
  groups: { cap: "Pick a screen, then a tab", sub: "Six screens in the menu. Tabs under the preview switch it to that part of the app" },
  tap: { ms: 4800, cap: "Tap the preview or a card", sub: "Tapping something in the preview opens its card. Tapping a card shows its part of the preview. Greyed-out parts, like this seekbar, are changed on another tab" },
  change: { cap: "Hold it to change the setting", sub: "The toggle on its card works too. Here the button gets hidden" },
  find: { ms: 5200, cap: "Tap a hidden setting to find it", sub: "An outline shows where it was. Hold it, or use the toggle, to show it or hide it again" },
  tools: { ms: 10400, cap: "Search, reset and compare", sub: "Search finds any setting. Reset undoes your changes. Original shows stock YouTube, Morphe shows yours" },
  custom: { ms: 12300, cap: "Make it yours", sub: "At the end of the screen menu: group screens into tabs, and pick how the editor and its list look" },
  // the last page: pick a look right here; the whole editor, this tutorial included, changes as you tap (Max, Nov 23 PM)
  style: { ms: 600000, cap: "Pick your style", sub: "Tap to try each one. The editor changes as you tap, and you can change it again at the end of the screen menu" },
};
const tutPages = () => [...(grouped ? ["groups"] : []), "tap", "change", "find", "tools", "custom", "style"];
const TUT_STEP_MS = 4200;
const TUT_QUERY = "cast button";
// the Cast setting's card as each list design draws it
function tutRowHTML(d) {
  const sum = esc((PREF.morphe_hide_cast_button && PREF.morphe_hide_cast_button.summary) || "");
  const right = d === "clean" ? `<span class="lt7" id="tlSw" role="presentation" aria-checked="false" data-at="r" data-tone="pos"><i></i><span>Hide</span><span>Show</span></span>`
    : d === "toggles" ? `<span class="sw" id="tlSw" role="presentation" aria-checked="false"></span>` : `<span class="state on" id="tlSw" aria-checked="false">Shown</span>`;
  return `<div class="tl-t">${d === "clean" ? "Cast button" : "Hide Cast button"}<small>${sum}</small></div>${right}<div class="tl-bar" id="tlBar"></div>`;
}
// small stand-ins for what the preview shows on a few screens, so picking a screen or tab visibly changes it
const TUT_VIEWS = `<div class="tview" data-v="watch"><div class="tv-vid" style="background:${ART[0]}"></div><div class="tv-l w80"></div><div class="tv-l w50"></div><div class="tv-chips"><i></i><i></i><i></i><i></i></div></div>
  <div class="tview" data-v="comments"><div class="tv-vid short" style="background:${ART[0]}"></div><div class="tv-h">Comments</div>${[0, 1, 2].map(i => `<div class="tv-c"><b style="background:${AV[i + 1]}"></b><span><i class="w40"></i><i class="w80"></i></span></div>`).join("")}</div>`;
function runTutorial(startAt) {
  const t = $("tut"), pages = tutPages();
  const playerTabs = GROUPS[0].tabs.map(([, n]) => n), watchTabs = GROUPS.find(g => g.id === "g_watch").tabs.map(([, n]) => n);
  const pickGroups = GROUPS.map(g => `<span data-g="${g.id}">${I(g.icon)}${esc(g.title)}</span>`).join("");
  const pickScreens = SECTIONS.filter(x => x.id !== "misc").slice(0, 12).map(s => `<span class="sm">${esc(s.title)}</span>`).join("");
  const total = CAT.preferences.filter(p => inVersion(p.key)).length;
  const castWhere = esc(placeLabel(sectionOf("morphe_hide_cast_button")) || "Player");
  paint(t, `<h2>Visual settings</h2><p class="tsub">See what each Morphe setting changes</p>
    <div class="tcap" id="tcap"></div>
    <div class="tdemo">
      <div class="tbar7" id="tBar"><span class="tpill" id="tPill"></span><span class="tsp"></span><span class="tic" id="tSearch">${I("search")}</span><span class="tic" id="tReset">${I("reset")}</span><span class="tseg"><b id="tOrig">Original</b><b id="tMorphe" class="on">Morphe</b></span><div class="tq" id="tQ"><span id="tQt"></span></div></div>
      <div class="tstage" id="tStage" style="background:${ART[0]}"><div class="tbtns"><div class="tb" id="tbCC">${I("cc")}</div><div class="tb" id="tbCast">${I("cast")}<div class="tring" id="tring"></div></div><div class="tb">${I("gear")}</div></div>
        <div class="tseek"><div></div></div>${TUT_VIEWS}
        <div class="tpick" id="tPick"><div class="tpg" id="tPg">${pickGroups}</div>
          <div class="tpfoot"><div class="tprow">Group screens into tabs<span class="sw" id="tGsw" aria-checked="${grouped}"></span></div>
            <div class="tprow">List design<span class="tseg3">${[["classic", "Morphe"], ["toggles", "Switches"], ["clean", "Clean"]].map(([d, n]) => `<b data-d="${d}" class="${d === design ? "on" : ""}">${n}</b>`).join("")}</span></div></div></div></div>
      <div class="ttabs" id="tTabs">${playerTabs.map((n, i) => `<span class="${i ? "" : "on"}">${esc(n)}</span>`).join("")}</div>
      <div class="tstyle" id="tStyle"><div class="tsrow"><span>UI design</span>${seg3("UI design", "tui", UI_DESIGNS, theme, uiOff())}</div><div class="tsrow"><span>List design</span>${seg3("List design", "tld", [["classic", "Morphe"], ["toggles", "Switches"], ["clean", "Clean"]], design)}</div></div>
      <div class="tlist" id="tlist">${tutRowHTML(design)}</div>
      <div class="tres" id="tRes"><div class="tres-hint" id="tHint">Type to search all ${total} settings</div>
        <div class="tres-n">1 result</div><div class="tsres" id="tSres"><div class="ttl" id="tSttl"></div><div class="where">${castWhere}</div></div></div>
      <div class="tmenu" id="tMenu"><div class="tdlg"><b>Reset settings?</b><p>Put settings back to Morphe's defaults.</p>
        <div class="tch"><span id="tChScreen">Only Player<small>1 change</small></span><span>Everything<small>1 change</small></span></div>
        <div class="tacts"><span id="tCancel">Cancel</span></div></div></div>
    </div>
    <div class="finger tfinger" id="tFinger">${I("gesture")}</div>
    <div class="steps" role="tablist" aria-label="Tutorial pages">${pages.map((_, n) => `<button role="tab" data-step="${n}" aria-label="Page ${n + 1}"><i></i></button>`).join("")}</div>
    <button class="ok show" id="tutOk">Next</button>`);
  t.classList.add("on");
  // opened to explain one new page: that page loops and the button closes the tutorial
  const single = !!startAt;
  let step = Math.max(0, pages.indexOf(startAt)); const seen = new Set();
  const cast = $("tbCast"), f = $("tFinger"), ring = $("tring"), row = $("tlist"), stage = $("tStage"), demo = t.querySelector(".tdemo");
  let rowDesign = design, sw = $("tlSw");
  const setRowDesign = d => { if (d === rowDesign) return; const h = sw.getAttribute("aria-checked") === "true"; rowDesign = d; row.innerHTML = tutRowHTML(d); sw = $("tlSw"); setHidden(h, true); row.classList.remove("morph"); void row.offsetWidth; row.classList.add("morph"); const ts3 = t.querySelector(".tseg3"), f3 = pickSnap(ts3, "b.on"); t.querySelectorAll(".tseg3 b").forEach(b => b.classList.toggle("on", b.dataset.d === d)); pickGlide(ts3, f3, "b.on"); };
  const box = t.getBoundingClientRect.bind(t);
  // pages 1 and 5 play 30% slower (Max: they were rushed); every step and move on them stretches evenly
  let tk = 1;
  const at2 = (ms, fn) => clock.after("tutPage", ms * tk, fn);
  const centerOf = el => { const r = el.getBoundingClientRect(), b = box(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; };
  const move = (el, ms, dx = 0, dy = 0) => { ms *= tk; const [x, y] = centerOf(el); fingerShow(f, x + dx, y + dy, ms); };
  const tap = () => { f.classList.remove("tap"); void f.offsetWidth; f.classList.add("tap"); };
  // a hold charges for as long as the app's (480 ms): the ring fills on the button, the bar on the card
  const hold = (onCast, fn) => {
    f.classList.add("hold");
    if (onCast) { ring.classList.add("go"); cast.classList.add("charging"); } else $("tlBar").classList.add("go");
    at2(LONG, () => { f.classList.remove("hold"); ring.classList.remove("go"); cast.classList.remove("charging"); $("tlBar")?.classList.remove("go"); fn(); });
  };
  const putHidden = h => {
    sw.setAttribute("aria-checked", String(h)); // the description stays as in the list; only the toggle changes
    if (rowDesign === "clean") { sw.dataset.at = h ? "l" : "r"; sw.dataset.tone = h ? "neg" : "pos"; }
    if (rowDesign === "classic") { sw.className = "state " + (h ? "off" : "on"); sw.textContent = h ? "Hidden" : "Shown"; }
  };
  // the switch and the two-way toggle glide like the ones in the list (toggleGlide)
  const setHidden = (h, still) => {
    if (!still && rowDesign !== "classic") return toggleGlide(sw, sw.getAttribute("aria-checked") === "true", h, putHidden);
    if (still) { glideStop(sw); sw.classList.add("still"); }
    putHidden(h);
    if (still) { void sw.offsetWidth; sw.classList.remove("still"); }
  };
  // where a finger taps to show or hide the setting from its card
  const showTarget = () => rowDesign === "clean" ? sw.lastElementChild : sw;
  const hideTarget = () => rowDesign === "clean" ? sw.children[1] : sw;
  // the top bar has no screen title: the menu button shows the screen's icon and an arrow
  const setPill = g => { $("tPill").innerHTML = I(g.icon) + I("expand"); };
  const setView = v => { stage.dataset.view = v || ""; };
  const setTabs = (names, on) => {
    const tb = $("tTabs"), same = [...tb.children].map(s => s.textContent).join("|") === [...tb.children].map((s, i) => names[i] || "").join("|"), f = same && pickSnap(tb, "span.on");
    tb.querySelectorAll("span").forEach((s, i) => { s.textContent = names[i] || ""; s.style.display = names[i] ? "" : "none"; s.classList.toggle("on", i === on); });
    if (f) pickGlide(tb, f, "span.on", 0); // the same tabs: the fill glides to the new one, like the editor's tabs (over the other tabs' own fill)
  };
  const setGrouped = g => { const gs = $("tGsw"); toggleGlide(gs, gs.getAttribute("aria-checked") === "true", g, v => gs.setAttribute("aria-checked", String(v))); demo.classList.toggle("grouped", g); $("tPg").innerHTML = g ? pickGroups : pickScreens; $("tPg").classList.toggle("many", !g); };
  const setMode = orig => { toggleGlide($("tOrig").parentElement, $("tOrig").classList.contains("on"), orig, o => { $("tOrig").classList.toggle("on", o); $("tMorphe").classList.toggle("on", !o); }); stage.classList.toggle("stock", orig); };
  const pageSub = id => id === "change" && design === "classic" ? "Here the button gets hidden"
    : id === "find" && design === "classic" ? "An outline shows where it was. Hold it to show it or hide it again" : TUT_PAGES[id].sub;
  // the caption area keeps the height of the tallest page, so the demo below never jumps
  { const cap = $("tcap"); let hMax = 0; pages.forEach((id, n) => { cap.innerHTML = `<b>${n + 1}</b>${TUT_PAGES[id].cap}<small>${pageSub(id)}</small>`; hMax = Math.max(hMax, cap.offsetHeight); }); cap.style.minHeight = hMax + "px"; }
  // the demo keeps its height while search folds the preview and the card away
  demo.style.minHeight = demo.offsetHeight + "px";
  // the style page shows its choices where the preview and the tabs were, in the same height
  $("tStyle").style.minHeight = stage.offsetHeight + (grouped ? $("tTabs").offsetHeight + 8 : 0) + "px";
  const pageMs = () => TUT_PAGES[pages[step]].ms || TUT_STEP_MS; // at2 stretches it on pages 1 and 5
  const show = () => {
    clock.start("tutPage");
    tk = step === 0 || step === 4 ? 1.3 : 1;
    seen.add(step);
    const id = pages[step];
    t.querySelectorAll(".steps button").forEach((b, n) => { b.classList.toggle("on", n === step); b.setAttribute("aria-selected", String(n === step)); b.classList.toggle("done", seen.has(n)); });
    $("tcap").innerHTML = `<b>${step + 1}</b>${TUT_PAGES[id].cap}<small>${pageSub(id)}</small>`;
    $("tutOk").textContent = single || step === pages.length - 1 ? "Done" : "Next";
    // every page starts from the same scene; each one switches on the extras it needs
    demo.dataset.page = id;
    f.classList.remove("tap", "hold"); ring.classList.remove("go"); row.classList.remove("sel", "morph"); cast.classList.remove("charging");
    ["tPick", "tMenu", "tQ"].forEach(x => $(x).classList.remove("show")); $("tQt").textContent = "";
    demo.classList.remove("searching", "found"); $("tSres").classList.remove("hit"); demoMorphReset(demo);
    setMode(false);
    setTabs(playerTabs, 0); setPill(GROUPS[0]); setView("");
    setGrouped(grouped); setRowDesign(design);
    t.querySelectorAll("#tPick span, .tseg3 b, .tprow, .tch span, #tCancel").forEach(s => s.classList.remove("hit"));
    // the card only exists once something was tapped (page 2 makes it appear)
    row.classList.toggle("pre", id === "groups" || id === "tap");
    if (id === "groups") { // open the screen menu, pick Watch page, then a tab: the preview follows each choice
      cast.className = "tb"; setHidden(false, true); move($("tPill"), 0, 0, 60);
      at2(60, () => move($("tPill"), 500));
      at2(650, () => { tap(); $("tPick").classList.add("show"); });
      at2(1250, () => move(t.querySelector('#tPick [data-g="g_watch"]'), 450));
      at2(1800, () => { tap(); t.querySelector('#tPick [data-g="g_watch"]').classList.add("hit"); });
      at2(2100, () => { $("tPick").classList.remove("show"); setPill(GROUPS.find(g => g.id === "g_watch")); setTabs(watchTabs, 0); setView("watch"); });
      at2(2600, () => move(t.querySelectorAll("#tTabs span")[2], 450));
      at2(3150, () => { tap(); setTabs(watchTabs, 2); setView("comments"); });
      at2(3900, () => f.classList.remove("show"));
    }
    if (id === "tap") { // tap the button: it lights up and its card appears. Then the other way: tap the card, the button lights up
      cast.className = "tb"; setHidden(false, true);
      move(cast, 0, 0, 120);
      at2(60, () => move(cast, 700));
      at2(900, () => { tap(); cast.classList.add("sel"); row.classList.remove("pre"); row.classList.add("sel"); });
      at2(1900, () => { cast.classList.remove("sel"); row.classList.remove("sel"); });
      at2(2100, () => move(row, 550, -40));
      at2(2800, () => { tap(); row.classList.add("sel"); cast.classList.remove("flash"); void cast.offsetWidth; cast.classList.add("sel", "flash"); });
      at2(3900, () => f.classList.remove("show"));
    }
    if (id === "change") { // hold the button: it goes away, and its toggle follows
      cast.className = "tb sel"; row.classList.add("sel"); setHidden(false, true); move(cast, 0, 0, 80);
      at2(60, () => move(cast, 600));
      at2(900, () => hold(true, () => { setHidden(true); cast.className = "tb off"; }));
      at2(2600, () => f.classList.remove("show"));
    }
    if (id === "find") { // hidden: tapping its card shows an outline where it was; Show brings it back, then Hide hides it again
      cast.className = "tb off"; setHidden(true, true); move(row, 0, -40, 40);
      at2(60, () => move(row, 500, -40));
      at2(700, () => { tap(); row.classList.add("sel"); cast.className = "tb ghost"; });
      if (rowDesign === "classic") {
        at2(1500, () => move(row, 400, -40)); at2(2000, () => hold(false, () => { setHidden(false); cast.className = "tb sel reveal"; }));
        at2(3300, () => move(row, 300, -30)); at2(3700, () => hold(false, () => { setHidden(true); cast.className = "tb ghost"; }));
      } else {
        at2(1500, () => move(showTarget(), 500)); at2(2200, () => { tap(); setHidden(false); cast.className = "tb sel reveal"; });
        at2(3100, () => move(hideTarget(), 450)); at2(3700, () => { tap(); setHidden(true); cast.className = "tb ghost"; });
      }
      at2(4600, () => f.classList.remove("show"));
    }
    if (id === "tools") { // search for the Cast button and open it, a look at the reset prompt (nothing is reset), then Original / Morphe
      cast.className = "tb off"; setHidden(true, true); move($("tSearch"), 0, 0, 60);
      $("tSttl").innerHTML = rowDesign === "clean" ? "<mark>Cast button</mark>" : "Hide <mark>Cast button</mark>";
      at2(60, () => move($("tSearch"), 560));
      // as in the app: the search bar opens over the top bar, and the preview and the cards make way for results
      { // the bar grows out of the search icon to both sides, as in the app
        const q = $("tQ").getBoundingClientRect(), r = $("tSearch").getBoundingClientRect();
        $("tQ").style.setProperty("--cl", Math.max(0, r.left - q.left) + "px"); $("tQ").style.setProperty("--cr", Math.max(0, q.right - r.right) + "px"); }
      at2(700, () => { tap(); $("tQ").classList.add("show"); demoMorph(demo, () => demo.classList.add("searching")); });
      [...TUT_QUERY].forEach((c, i) => at2(1000 + i * 110, () => { $("tQt").textContent += c; if (i === 3) demoMorph(demo, () => demo.classList.add("found")); }));
      at2(2300, () => move($("tSres"), 450));
      at2(2850, () => { tap(); $("tSres").classList.add("hit"); });
      // the result opens the Cast button's card, as at the start of the tutorial: hidden, so the outline shows where it is
      at2(3100, () => { $("tQ").classList.remove("show"); $("tQt").textContent = ""; demoMorph(demo, () => demo.classList.remove("searching", "found"), true); row.classList.add("sel"); cast.className = "tb ghost"; });
      at2(3700, () => move($("tReset"), 500));
      at2(4250, () => { tap(); $("tMenu").classList.add("show"); });
      at2(4600, () => move($("tChScreen"), 450, 40));
      at2(5500, () => move($("tCancel"), 450));
      at2(6000, () => { tap(); $("tCancel").classList.add("hit"); });
      at2(6200, () => $("tMenu").classList.remove("show"));
      at2(6500, () => move($("tOrig"), 450));
      // stock YouTube has the Cast button, so its toggle goes to Show; with your settings it goes back to Hide
      at2(7000, () => { tap(); setMode(true); setHidden(false); cast.className = "tb reveal"; });
      at2(8000, () => move($("tMorphe"), 300));
      at2(8350, () => { tap(); setMode(false); setHidden(true); cast.className = "tb ghost"; });
      at2(9300, () => f.classList.remove("show"));
    }
    if (id === "style") { // no finger: the choices are real and change the editor as they are tapped
      cast.className = "tb"; setHidden(false, true); f.classList.remove("show"); row.classList.remove("pre");
      t.querySelectorAll("[data-tui]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.tui === theme)));
      t.querySelectorAll("[data-tld]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.tld === design)));
      requestAnimationFrame(() => placeSeg3($("tStyle"))); // the same sliding thumb as the screen menu's toggles
    }
    if (id === "custom") { // the screen menu's own settings: tabs off and on again, then each list design
      cast.className = "tb"; setHidden(false, true); move($("tPill"), 0, 0, 60);
      at2(90, () => move($("tPill"), 600));
      at2(840, () => { tap(); $("tPick").classList.add("show"); });
      at2(1650, () => move($("tGsw"), 600));
      at2(2475, () => { tap(); setGrouped(!grouped); });
      at2(3825, () => { tap(); setGrouped(grouped); });
      const others = ["toggles", "classic", "clean"].filter(d => d !== design);
      [...others, design].forEach((d, i) => {
        at2(4950 + i * 1950, () => move(t.querySelector(`.tseg3 [data-d="${d}"]`), 420));
        at2(5700 + i * 1950, () => { tap(); setRowDesign(d); });
      });
      at2(11250, () => { $("tPick").classList.remove("show"); f.classList.remove("show"); });
    }
    // the page plays again from the start until Next is pressed
    at2(pageMs(), show);
  };
  show();
  const close = () => { clock.stop("tutPage"); t.classList.remove("on"); try { localStorage.setItem(LS + "-tutorial", "1"); } catch { /* storage unavailable */ } };
  t.closeTutorial = close; // Back in the app closes it from any page
  t.querySelector(".steps").addEventListener("click", e => {
    const b = e.target.closest("[data-step]"); if (!b) return;
    step = Number(b.dataset.step); show();
  });
  $("tStyle").addEventListener("click", e => {
    const u = e.target.closest("[data-tui]"), l = e.target.closest("[data-tld]");
    if (u || l) seg3Snap($("tStyle"));
    if (u && u.dataset.tui !== theme) uiPick(u.dataset.tui);
    if (l && l.dataset.tld !== design) { design = l.dataset.tld; setRowDesign(design); renderBar(); renderList(); store.save(); }
    if (u || l) { t.querySelectorAll("#tStyle [role=radio]").forEach(b => b.setAttribute("aria-checked", String((b.dataset.tui || b.dataset.tld) === (b.dataset.tui ? theme : design)))); placeSeg3($("tStyle")); }
  });
  $("tutOk").onclick = () => { if (single || step === pages.length - 1) return close(); step++; show(); };
}
$("replayTut").onclick = () => runTutorial();
// The first time tabs or the shorter list are switched on, show the tutorial page that explains them.
function tutOnce(id) { let done = false; try { done = localStorage.getItem(LS + "-tut-" + id) === "1"; localStorage.setItem(LS + "-tut-" + id, "1"); } catch { /* storage unavailable */ } if (!done) setTimeout(() => runTutorial(id), 400); }

function tick() { const d = new Date(); $("clock").textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; }

// The parts of a tutorial demo that fold away or unfold (search: the preview, the tabs and the card
// make way for the results) change by their real heights, measured before and after, in one motion,
// inside a demo that keeps its height, so nothing around it (the page text, the buttons, the other
// animations) moves. max-height guesses started late, stopped short, and the results replacing the
// hint jumped, which shook the whole page each time search opened or closed.
const MORPH_SEL = ".tstage, .ttabs, .tlist, .tres";
function demoMorph(demo, change, last = false, ms = 350) {
  const els = [...demo.querySelectorAll(MORPH_SEL)];
  const snap = () => els.map(e => { const cs = getComputedStyle(e); return { height: e.getBoundingClientRect().height + "px", marginTop: cs.marginTop, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: cs.opacity }; });
  const from = snap(); // read mid-motion too, so a change during the last one carries on from where it is
  els.forEach(e => e.getAnimations().filter(a => a.id === "morph").forEach(a => a.cancel()));
  if (!demo.style.minHeight) demo.style.minHeight = demo.getBoundingClientRect().height + "px";
  change();
  els.forEach(e => { e.style.transition = "none"; });
  const to = snap();
  els.forEach((e, i) => {
    if (JSON.stringify(from[i]) === JSON.stringify(to[i])) { e.style.transition = ""; return; }
    const an = e.animate([{ ...from[i], overflow: "hidden" }, { ...to[i], overflow: "hidden" }], { id: "morph", duration: ms, easing: "cubic-bezier(.4,0,.2,1)" });
    an.onfinish = () => { e.style.transition = ""; };
  });
  clearTimeout(demo._morphT);
  if (last) demo._morphT = setTimeout(() => { demo.style.minHeight = ""; }, ms + 20);
}
function demoMorphReset(demo) {
  clearTimeout(demo._morphT); demo.style.minHeight = "";
  demo.querySelectorAll(MORPH_SEL).forEach(e => { e.getAnimations().filter(a => a.id === "morph").forEach(a => a.cancel()); e.style.transition = ""; });
}
