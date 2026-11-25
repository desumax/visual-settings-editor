"use strict";
// In-app mode, part 1 (loaded after core.js, before boot.js). Active only inside YouTube, where the
// visual editor patch provides window.MorpheApp. The preview then edits the real Morphe settings:
//   - the list holds exactly the rows Morphe's own list has (adaptCatalogue), at the installed YouTube version
//   - the starting values are the live values, not localStorage
const INAPP = typeof window.MorpheApp !== "undefined";
let LIVE = { values: {}, version: "" };
if (INAPP) {
  document.documentElement.classList.add("inapp");
  // Morphe could not give its values or its rows: go back to its regular list rather than show an
  // editor that would look right but save nothing, or one with no rows at all (the empty state is
  // only for the standalone preview).
  let liveOk = false;
  const some = o => !!o && typeof o === "object" && Object.keys(o).length > 0;
  try { LIVE = JSON.parse(MorpheApp.state()); liveOk = !!LIVE && some(LIVE.values) && some(LIVE.meta); } catch (e) { /* handled below */ }
  if (!liveOk && !MorpheApp.preview) {
    LIVE = { values: {}, version: "" };
    window.MORPHE_STOP = true; // boot.js draws nothing while the app swaps in its regular list
    try { MorpheApp.fallback(); } catch (e) { try { MorpheApp.close(); } catch (e2) { /* ignore */ } }
  }
  try { localStorage.removeItem(LS + "-baseline"); } catch (e) { /* storage unavailable */ }
  // Text read from Morphe's rows is cleaned before it is used: Morphe marks a new setting by appending
  // an invisible character (U+2060, with a dot drawn on it) to its title and to its screen's title,
  // which would end up in titles, in search and in the "Hide X" / "Show X" reading of the clean design.
  const cleanText = s => typeof s === "string" ? s.replace(/[\u200b-\u200d\u2060-\u2064\ufeff\ufffc]/g, "").trim() : s;
  for (const m of Object.values(LIVE.meta || {})) {
    if (!m || typeof m !== "object") continue;
    for (const f of ["title", "summary", "summaryOn", "summaryOff", "screenTitle", "subScreenTitle"]) if (typeof m[f] === "string") m[f] = cleanText(m[f]);
    if (Array.isArray(m.entries)) m.entries = m.entries.filter(e => Array.isArray(e) && e.length > 1).map(([label, value]) => [cleanText(String(label ?? value)), value]);
  }
  // A setting Morphe knows under another key than this editor's catalogue does. Inside the editor it
  // keeps the catalogue's key, so its preview, animation and place in the list stay; at the border to
  // Morphe (reading values, saving, availability, pending changes) the key is translated.
  //   catalogue key -> Morphe's key (RENAMED) and back (BACK)
  const RENAMED = {}, BACK = {};
  window.__morpheKey = k => RENAMED[k] || k;
  window.__editorKey = k => BACK[k] || k;
  const KIND = { boolean: "switch", enum: "text", string: "text", integer: "number", long: "number", float: "number" };
  function bridgeRenames(cat, skip) {
    const meta = LIVE.meta || {}, values = LIVE.values || {};
    const known = new Set(cat.preferences.map(p => p.key));
    const bridge = (mine, theirs) => {
      RENAMED[mine] = theirs; BACK[theirs] = mine;
      meta[mine] = meta[theirs]; delete meta[theirs];
      if (theirs in values) { values[mine] = values[theirs]; delete values[theirs]; }
    };
    const lost = () => cat.preferences.filter(p => p.type && KIND[p.type] && !(p.key in meta) && !skip(p.key));
    const fresh = () => Object.keys(meta).filter(k => !known.has(k) && !(k in BACK) && meta[k] && KIND[meta[k].type] && !/^morphe_visual_editor_/.test(k));
    // 1. Renames Morphe recorded itself (catalogue.renames, old key -> new key, from its migrations):
    //    an older build of the patches still has the row under the old key.
    const ren = cat.renames || {};
    for (const p of lost()) {
      const olds = Object.keys(ren).filter(o => { let k = o; for (let i = 0; i < 8 && k in ren; i++) { k = ren[k]; if (k === p.key) return true; } return false; });
      const hit = olds.filter(o => o in meta && !known.has(o) && !(o in BACK) && KIND[meta[o].type] === KIND[p.type]);
      if (hit.length === 1) bridge(p.key, hit[0]);
    }
    // 2. A rename after this catalogue was made: one catalogue row without a row in Morphe, and one row
    //    of Morphe the catalogue doesn't know, with the same title and the same kind of control. The
    //    screen decides between rows that share a title ("Hide Subscribe button" exists four times);
    //    anything not one-to-one is left alone and shows as a plain new row.
    const norm = s => cleanText(String(s || "")).toLowerCase();
    for (const sig of [x => [norm(x.title), norm(x.screenTitle), norm(x.subScreenTitle), KIND[x.type]].join("\n"), x => [norm(x.title), KIND[x.type]].join("\n")]) {
      const a = {}, b = {};
      for (const p of lost()) if (p.title) (a[sig(p)] = a[sig(p)] || []).push(p.key);
      for (const k of fresh()) if (meta[k].title) (b[sig(meta[k])] = b[sig(meta[k])] || []).push(k);
      for (const s in b) if (b[s].length === 1 && a[s] && a[s].length === 1) bridge(a[s][0], b[s][0]);
    }
  }
  const cmpV = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  // THE ONE PLACE that decides which rows the in-app editor has. boot.js calls it once the
  // preview's own rows are assembled (the catalogue, then SponsorBlock's categories).
  //   - Morphe decides: LIVE.meta holds one entry per row its own list shows (LiveSettings.meta),
  //     settings and action rows alike. A setting without an entry is not in this build's list
  //     (its patch was left out), so it is not in the editor either.
  //   - The one exception: SponsorBlock builds its category rows in code, so they have no entry of
  //     their own; they are in while SponsorBlock's screen is (morphe_sb_enabled has an entry) and
  //     this build has their setting.
  //   - Every row's facts come from Morphe (applyLive); the catalogue adds only preview hints.
  //   - Rows Morphe has that the catalogue doesn't know are added as plain rows.
  // Elsewhere the editor only leaves out rows that do nothing on this device (offDevice, a design
  // rule). The App view's stand-in (MorpheApp.preview) keeps the preview's catalogue.
  window.adaptCatalogue = cat => {
    if (MorpheApp.preview || window.MORPHE_STOP) return;
    const meta = LIVE.meta || {}, values = LIVE.values || {};
    const sbScreen = "morphe_sb_enabled" in meta;
    const sbKeys = new Set(SB_CATS.map(([c]) => "morphe_sb_" + c));
    bridgeRenames(cat, k => sbKeys.has(k));
    const exists = k => k in meta || (sbScreen && sbKeys.has(k) && k in values);
    cat.preferences = cat.preferences.filter(p => exists(p.key));
    // the SponsorBlock scene draws only the categories this build has
    for (let i = SB_CATS.length - 1; i >= 0; i--) if (!exists("morphe_sb_" + SB_CATS[i][0])) SB_CATS.splice(i, 1);
    applyLive(cat);
    // the installed YouTube version picks the preview's layout (the newest one at or below it)
    if (Array.isArray(cat.youtubeVersions) && cat.youtubeVersions.length && LIVE.version) {
      const vs = cat.youtubeVersions.slice().sort((a, b) => cmpV(b.version, a.version));
      cat.youtubeVersions = [vs.find(v => cmpV(v.version, LIVE.version) <= 0) || vs[vs.length - 1]];
    }
  };
  // Live data: what this Morphe build says (LIVE.meta, from the regular settings rows and the
  // Setting API) wins over the catalogue; the catalogue keeps only preview hints (element,
  // animation, order, grouping). Availability follows Setting.isAvailable(), refreshed after
  // every change (morpheAvailability), instead of the catalogue's copied rules.
  window.__liveAvail = {};
  // Morphe's action rows (not settings): a tap runs the real row in the app, see app-post.js
  window.__liveActions = new Set(Object.keys(LIVE.meta || {}).filter(k => LIVE.meta[k] && LIVE.meta[k].type === "action"));
  // A row Morphe draws with a class of its own (button order, a gesture's action, a file or folder
  // picker) holds text in a format of its own, and a plain text field would break it. Morphe flags
  // these rows ("custom"). Where the editor has a control made for the format (the chip list for
  // words, speeds and channel whitelists, the colour field) that control stays; any other such row
  // is tapped like an action row and opens Morphe's own editor for it. Numbers stay numbers.
  const opensInMorphe = (k, m, def) => !!m.custom && m.type === "string" && !(Array.isArray(m.entries) && m.entries.length)
    && !(String(m.default ?? def ?? "").includes("\n") || /strings|phrases|speeds|whitelist|filter|color/.test(k));
  function applyLive(cat) {
    const meta = LIVE.meta || {};
    const known = new Set(cat.preferences.map(p => p.key));
    const TYPE_WIDGET = { action: "Preference", boolean: "SwitchPreference", enum: "ListPreference", string: "TextPreference", integer: "TextPreference", long: "TextPreference", float: "TextPreference" };
    const liveType = m => m.type === "action" ? null : m.type;
    const FAMILY = { boolean: "switch", enum: "text", string: "text", integer: "number", long: "number", float: "number" };
    for (const p of cat.preferences) {
      const m = meta[p.key]; if (!m) continue;
      delete p.when; // Morphe shows this row in this build, whatever YouTube version the catalogue rule names
      // Morphe changed the setting's type (a switch became a list, say): its type and widget win,
      // so the control and the value format match what Morphe saves.
      // Within one family (integer / long / float, string / enum) only the value format follows, so
      // a read-only counter stays read-only and a list stays a list.
      if (FAMILY[m.type] && FAMILY[m.type] === FAMILY[p.type]) p.type = m.type;
      else if (m.type && TYPE_WIDGET[m.type] && liveType(m) !== p.type && !(m.type === "action" && p.type == null)) {
        dropHints(p.key); // the preview and animation were made for the old kind of control
        p.type = liveType(m);
        p.widget = Array.isArray(m.entries) && m.entries.length ? "ListPreference" : TYPE_WIDGET[m.type];
        delete p.entryVariants; delete p.versionDefault; delete p.summaryOn; delete p.summaryOff;
        if (p.widget !== "ListPreference") { delete p.entries; delete RUNTIME_ENTRIES[p.key]; }
      }
      if (m.title) p.title = m.title;
      if (m.summary != null) p.summary = m.summary;
      if (p.type === "boolean") { if (m.summaryOn != null) p.summaryOn = m.summaryOn; if (m.summaryOff != null) p.summaryOff = m.summaryOff; }
      if (Array.isArray(m.entries) && m.entries.length) {
        // values this editor's stories were not written for (added or renamed since): shown plainly (core.js)
        const mine = [...(p.entries || []), ...(p.entryVariants || []).flatMap(v => v.entries || [])].map(e => String(e.value));
        if (mine.length) { const news = m.entries.map(e => String(e[1])).filter(v => !mine.includes(v)); if (news.length) STALE_VALUES[p.key] = new Set(news); }
        p.entries = m.entries.map(([label, value]) => ({ label, value }));
        delete p.entryVariants;
        delete RUNTIME_ENTRIES[p.key];
      }
      if ("default" in m) { p.default = m.default; delete p.versionDefault; }
      if (typeof m.rebootApp === "boolean") p.rebootApp = m.rebootApp;
      if (typeof m.available === "boolean") {
        __liveAvail[p.key] = m.available;
        // The value comes from the native map; the catalogue rule stays in the text (never
        // evaluated) so "Needs ..." and "Take me there" can still name the settings involved.
        const live = `__liveAvail[${JSON.stringify(p.key)}] !== false`;
        p.availability = p.availability ? `!(false && (${p.availability})) && ${live}` : live;
      }
      if (opensInMorphe(p.key, m, p.default)) { p.type = null; p.widget = "Preference"; delete p.entries; __liveActions.add(p.key); }
    }
    // Settings this build has that the catalogue doesn't know: plain rows under Misc, so nothing is hidden.
    for (const [k, m] of Object.entries(meta)) {
      if (known.has(k) || !TYPE_WIDGET[m.type] || /^morphe_visual_editor_/.test(k)) continue;
      const entries = Array.isArray(m.entries) && m.entries.length ? m.entries.map(([label, value]) => ({ label, value })) : undefined;
      cat.preferences.push({ key: k, title: m.title || "", summary: m.summary ?? null, summaryOn: m.summaryOn ?? null, summaryOff: m.summaryOff ?? null,
        widget: entries ? "ListPreference" : TYPE_WIDGET[opensInMorphe(k, m) ? "action" : m.type], type: m.type === "action" || opensInMorphe(k, m) ? null : m.type, default: m.default, rebootApp: !!m.rebootApp, parents: [], customAvailability: [],
        screen: null, screenTitle: m.screenTitle || null, subScreen: null, subScreenTitle: m.subScreenTitle || null, entries, live: true });
      if (opensInMorphe(k, m)) __liveActions.add(k);
      // availability as Morphe has it, read through the same rule the known rows use
      if (typeof m.available === "boolean") {
        __liveAvail[k] = m.available;
        cat.preferences[cat.preferences.length - 1].availability = `__liveAvail[${JSON.stringify(k)}] !== false`;
      }
    }
  }
  const fileLoad = store.load;
  store.load = function () {
    const s = fileLoad();
    s.state = Object.assign({}, LIVE.values);
    delete s.yt; delete s.device;
    return s;
  };
  navigator.vibrate = ms => { try { MorpheApp.vibrate(Number(Array.isArray(ms) ? ms[0] : ms) || 15); } catch (e) { /* ignore */ } return true; };
}
