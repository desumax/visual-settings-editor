#!/usr/bin/env node
// Lists every line of text each Off / On comparison renders, so redundant ones can be found and removed.
//
// Usage: node tools/captions.js [out.md]   (from editor/; default out: captions.md)
//
// Runs the editor's scripts in node with a do-nothing DOM, plays each comparison (both sides, every
// timed step at once) and records:
//   - the blue line over the phones (situation; only lines passed keep = true are shown)
//   - the white line under each phone (the scenario's return value, setFoot)
//   - messages inside the phones (toast7, check7, showPill, any .toastin / .check7 pill in the HTML)
// A white line is hidden when the story is told inside the phones or its key is in FOOT_OFF
// (web/js/scenarios.js). A shown line that shares most of its words with the side labels, the
// setting's title or a message in the phones is flagged as a likely repeat.
const vm = require("vm"), fs = require("fs"), path = require("path");
const W = path.join(__dirname, "..", "web") + "/";
const out = process.argv[2] || "captions.md";

const rec = { pills: [] };
const strip = s => String(s).replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<br\s*\/?>/g, " · ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const PILL = /class="[^"]*\b(toastin|check7)\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
const scan = v => { if (typeof v === "string") for (const m of v.matchAll(PILL)) { const t = strip(m[2]); if (t) rec.pills.push(t); } };
const mk = () => new Proxy(function () {}, {
  get: (t, p) => p === Symbol.toPrimitive ? () => 0 : p === "length" ? 0 : p === Symbol.iterator ? function* () {} : p === "then" ? undefined : any,
  apply: (t, th, args) => { args.forEach(scan); return any; },
  construct: () => any,
  set: (t, p, v) => { scan(v); return true; },
});
const any = mk();
const ctx = { console, Math, JSON, Date, Number, String, Object, Array, Set, Map, WeakMap, RegExp, Error, Promise, Symbol, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  performance: { now: () => 0 }, document: any, navigator: any, localStorage: { getItem: () => null, setItem() {} },
  MutationObserver: function () { return any; }, ResizeObserver: function () { return any; }, IntersectionObserver: function () { return any; },
  getComputedStyle: () => any, matchMedia: () => any, addEventListener() {}, location: any, CSS: any, fetch: () => any,
  Intl, encodeURIComponent, decodeURIComponent, structuredClone, __rec: rec, __strip: strip };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);

const files = "core iconstyles scenes scenarios demos scenario-kit list interactions select press layout tutorial".split(" ");
let src = files.map(f => fs.readFileSync(W + "js/" + f + ".js", "utf8")).join("\n;\n");
src += `
CAT = ${fs.readFileSync(W + "catalogue.json", "utf8")};
CAT.preferences.push(...SB_CATS.map(([k, t, d]) => ({ key: "morphe_sb_" + k, title: t, widget: "ListPreference", type: "string", default: d, parents: [{ key: "morphe_sb_enabled", mode: "all" }], customAvailability: [], screen: "SPONSORBLOCK", subScreen: null, synthetic: true, entries: SB_BEHAVIOUR })).filter(p => !CAT.preferences.some(x => x.key === p.key)));
for (const p of CAT.preferences) { PREF[p.key] = p; defaults[p.key] = initialValue(p); }
setPrefs(defaults);
buildMembers();
situation = (t, keep) => __rec.sit.push({ t: String(t), keep: !!keep, i: scSide ? scSide.i : 0 });
setFoot = t => { if (t) __rec.foot[scSide ? scSide.i : 0].push(String(t)); };
showPill = t => { if (t) __rec.pills.push(__strip(t)); };
toast7 = (dev, t) => { if (t) __rec.pills.push(__strip(t)); };
check7 = (dev, t) => { if (t) __rec.pills.push(__strip(t)); };
const __rows = [];
for (const k of Object.keys(SCN)) {
  const fn = SCN[k], self = SCN_SELF_DUO.has(k);
  const vals = self ? [[V(k), ""]] : duoValues(k);
  const row = { k, title: shownTitle(k), section: sectionOf(k), labels: vals.map(v => String(v[1])), self,
    told: toldInside(fn), off: FOOT_OFF.has(k), inVersion: inVersion(k), sit: [], foot: [[], []], pills: [[], []], err: "" };
  vals.forEach(([v], i) => {
    __rec.sit = row.sit; __rec.foot = row.foot; __rec.pills.length = 0;
    scSide = self ? null : { i, foot: document }; scCollect = [];
    try {
      const ft = fn(document, v, vals[1 - i] ? vals[1 - i][0] : undefined);
      if (ft) row.foot[i].unshift(String(ft));
      for (let n = 0; scCollect.length && n < 400; n++) {
        scCollect.sort((a, b) => a[0] - b[0]);
        const [, f, side] = scCollect.shift(); scSide = side; f();
      }
    } catch (e) { row.err = row.err || String(e && e.message || e).slice(0, 80); }
    row.pills[i] = [...new Set(__rec.pills)];
    scSide = null; scCollect = null;
  });
  __rows.push(row);
}
globalThis.__out = { rows: __rows, sections: SECTIONS.map(s => [s.id, s.title]) };
`;
vm.runInContext(src, ctx, { filename: "editor.js" });
const { rows, sections } = ctx.__out;

// A line repeats when most of its words are already on screen (labels, the setting's title, a pill)
const STOP = new Set("a an the and or of to in on at is it its by for with from as be are was this that then than no not off up out one two any all only when while into over under stock".split(" "));
const words = s => String(s).toLowerCase().replace(/[^a-z0-9×.:% ]+/g, " ").split(/\s+/).filter(w => w && !STOP.has(w));
const repeats = (line, row, i) => {
  const w = words(line); if (!w.length) return false;
  const seen = new Set([...words(row.labels.join(" ")), ...words(row.title), ...row.pills[i].flatMap(words)]);
  return w.filter(x => seen.has(x)).length / w.length >= 0.6;
};
const q = s => `"${s}"`;
const title = Object.fromEntries(sections);
const bySec = {};
let nWhite = 0, nShown = 0, nFlag = 0, nBlue = 0;
for (const r of rows) {
  const blue = [...new Set(r.sit.filter(s => s.keep && s.i === 0).map(s => s.t))];
  const dropped = [...new Set(r.sit.filter(s => !s.keep).map(s => s.t))];
  const sides = r.self ? [0] : [0, 1];
  const white = sides.map(i => [...new Set(r.foot[i].filter(Boolean))]);
  const hidden = r.told ? "hidden: the story is told inside the phones" : r.off ? "hidden: in FOOT_OFF" : "";
  const lines = [];
  if (blue.length) {
    nBlue++; const flag = blue.some(t => repeats(t, r, 0)); if (flag) nFlag++;
    lines.push(`- Blue line: ${blue.map(q).join(" › ")}${flag ? " **⚠ likely repeat**" : ""}`);
  }
  sides.forEach(i => {
    if (!white[i].length) return;
    nWhite++; if (!hidden) nShown++;
    const flag = !hidden && white[i].some(t => repeats(t, r, i)); if (flag) nFlag++;
    lines.push(`- White line${r.self ? "" : ", " + r.labels[i]}: ${white[i].map(q).join(" › ")}${hidden ? ` (${hidden})` : ""}${flag ? " **⚠ likely repeat**" : ""}`);
  });
  sides.forEach(i => { if (r.pills[i].length) lines.push(`- In the phone${r.self ? "" : ", " + r.labels[i]}: ${r.pills[i].map(q).join(", ")}`); });
  if (dropped.length) lines.push(`- Not shown (blue line without keep): ${dropped.map(q).join(" › ")}`);
  if (r.err) lines.push(`- (could not be read fully here: ${r.err})`);
  if (!lines.length) continue;
  (bySec[r.section] = bySec[r.section] || []).push(`**${r.title}**${r.inVersion ? "" : " (not in this version or device)"} · \`${r.k}\`${r.self ? " · one phone" : ` · ${r.labels.join(" | ")}`}\n${lines.join("\n")}`);
}
const order = sections.map(s => s[0]).filter(s => bySec[s]).concat(Object.keys(bySec).filter(s => !title[s]));
const md = `# Comparison captions

Every line of text the Off / On comparisons render, by tab. Generated by \`tools/captions.js\` from the editor's own code.

- **Blue line**: over the phones. Only lines a scenario marks as needed are shown.
- **White line**: under each phone. Hidden when the phones tell the story with a message, or when the key is in \`FOOT_OFF\` (web/js/scenarios.js).
- **In the phone**: messages drawn inside the phones.
- **⚠ likely repeat**: a shown line whose words are mostly already on screen (the Off / On labels, the setting's title or a message in the phone).

${rows.length} comparisons · ${nBlue} with a blue line · ${nWhite} white lines, ${nShown} shown. ${nFlag} lines flagged as likely repeats.

${order.map(s => `## ${title[s] || s}\n\n${bySec[s].join("\n\n")}`).join("\n\n")}
`;
fs.writeFileSync(out, md);
console.log(`${out}: ${rows.length} comparisons, ${nShown} white lines shown, ${nFlag} flagged`);
