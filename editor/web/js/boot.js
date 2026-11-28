"use strict";
// Loading the catalogue and starting the editor.

// ------------------------------------------------------------------ boot
async function boot() {
  if (window.MORPHE_STOP) return; // in the app with no settings to edit: the app shows its regular list (app-pre.js)
  try { const r = await fetch("catalogue.json"); CAT = await r.json(); }
  catch (err) { $("list").innerHTML = `<div class="secnote" style="padding:20px 16px">Could not load catalogue.json. Serve this folder over HTTP (for example <code>python3 -m http.server</code>) and reload.</div>`; return; }
  CAT.preferences.push(...SB_CATS.map(([k, t, d]) => ({ key: "morphe_sb_" + k, title: t, summary: "What SponsorBlock does with this kind of segment", widget: "ListPreference", type: "string", default: d, rebootApp: false, parents: [{ key: "morphe_sb_enabled", mode: "all" }], customAvailability: [], screen: "SPONSORBLOCK", subScreen: null, synthetic: true, entries: SB_BEHAVIOUR })).filter(p => !CAT.preferences.some(x => x.key === p.key)));
  if (typeof adaptCatalogue === "function") adaptCatalogue(CAT); // in the app: Morphe's own rows decide (app-pre.js)
  addCoveredParents(CAT.preferences);
  for (const p of CAT.preferences) { PREF[p.key] = p; defaults[p.key] = initialValue(p); }
  loadPrefs(defaults);
  const saved = store.load();
  if (saved.state) for (const k in saved.state) if (k in PREF) loadPrefs({ [k]: saved.state[k] });
  baseline = { ...state };
  try { const b = JSON.parse(localStorage.getItem(LS + "-baseline") || "null"); if (b) for (const k in b) if (k in PREF) baseline[k] = b[k]; } catch { /* storage unavailable */ }
  if (saved.section && SECTIONS.some(s => s.id === saved.section)) section = saved.section;
  if (UI_DESIGNS.some(([id]) => id === saved.theme)) theme = saved.theme;
  if (saved.lv >= 2 && typeof saved.grouped === "boolean") grouped = saved.grouped; // older saves predate tabs being the default
  if (saved.tabs) Object.assign(lastTab, saved.tabs);
  applyTheme();
  if (saved.device && DEVICES.some(d => d.id === saved.device)) device_ = saved.device;
  if (CAT.youtubeVersions && CAT.youtubeVersions.length) {
    YT_VERSIONS.length = 0; YT_EXPERIMENTAL.clear();
    CAT.youtubeVersions.forEach(v => { YT_VERSIONS.push(v.version); if (v.experimental) YT_EXPERIMENTAL.add(v.version); });
    ytVersion = YT_VERSIONS[0];
  }
  if (saved.yt && YT_VERSIONS.includes(saved.yt)) ytVersion = saved.yt;
  applyVersion();
  $("ytVer").innerHTML = YT_VERSIONS.map(v => `<option value="${v}" ${v === ytVersion ? "selected" : ""}>${v}${YT_EXPERIMENTAL.has(v) ? " (experimental)" : ""}</option>`).join("");
  $("ytVer").onchange = e => { ytVersion = e.target.value; applyVersion(); trayOpen = false; buildMembers(); commit(); };
  buildMembers();
  if (Array.isArray(saved.order)) customOrder = saved.order;
  if (saved.tabOrder && typeof saved.tabOrder === "object") tabOrder = saved.tabOrder;
  if (["classic", "toggles", "clean"].includes(saved.design)) design = saved.design;
  if (saved.borrowed && typeof saved.borrowed === "object") for (const [sec, ks] of Object.entries(saved.borrowed)) if (Array.isArray(ks)) borrowed[sec] = new Set(ks.filter(x => PREF[x]));
  applyOrder();
  // In the app the editor opens on its screen menu, with the screen behind it hidden: only the menu is
  // drawn before the app is told the page is ready (app-post.js), and the hidden screen's list and
  // preview follow once the page is shown (window.__drawBehind), so the editor appears sooner.
  let seenTut = false; try { seenTut = localStorage.getItem(LS + "-tutorial") === "1"; } catch { /* storage unavailable */ }
  if (typeof INAPP !== "undefined" && INAPP && seenTut) {
    renderBar(); renderInspector(); applyLayout(); store.save();
    window.__drawBehind = () => { window.__drawBehind = null; renderStage(); renderList(); };
  } else renderAll();
  if (window.innerWidth > 860) applyDevice(); else $("devBtns").innerHTML = "";
  tick(); setInterval(tick, 30000);
  let seen = false; try { seen = localStorage.getItem(LS + "-tutorial") === "1"; } catch { /* storage unavailable */ }
  if (!seen) runTutorial();
  // changes saved for later on the last visit that still wait for a restart: ask what to do with them
  else { let pend = null; try { pend = JSON.parse(localStorage.getItem(LS + "-pending") || "null"); } catch { /* storage unavailable */ } if (Array.isArray(pend) && pendingRestart().some(k => pend.includes(k))) pendingDialog(); }
}
store.save = function () { try { localStorage.setItem(LS, JSON.stringify({ state: changedOnly(), section, device: device_, yt: ytVersion, theme, grouped, lv: 2, design, tabs: lastTab, tabOrder, order: customOrder, borrowed: Object.fromEntries(Object.entries(borrowed).map(([s, v]) => [s, [...v]])) })); localStorage.setItem(LS + "-baseline", JSON.stringify(baseline)); } catch { /* storage unavailable */ } };
boot();
