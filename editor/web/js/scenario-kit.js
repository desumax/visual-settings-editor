"use strict";
// More comparison animations built from the small scenario kit (home feed, other screens, playback).

// ------------------------------------------------------------------ round 9: scenario kit
// Small phone pages for settings that have no place in the live preview. Most are "remove this
// element" pages (hidePage), the rest are short stories with a finger, toasts and sheets.
const ico7 = (n, s = 8, c = "") => I(n, "ico", `style="width:${s}px;height:${s}px;flex:none;${c ? "fill:" + c : ""}"`);
const top7 = (title = "YouTube", icons = ["cast", "bell", "search"]) => `<div style="display:flex;align-items:center;gap:5px;height:12px"><b style="font-size:7.5px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</b>${icons.map(n => ico7(n)).join("")}</div>`;
const row7 = (i, t, extra = "", sub = "") => `<div style="display:flex;gap:4px;align-items:center"><div style="width:30px;height:17px;border-radius:2px;background:${ART[i % ART.length]};flex:none;position:relative">${extra}</div><div style="min-width:0;flex:1"><div style="font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</div>${sub ? `<div style="font-size:5.5px;color:#aaa;line-height:1.15">${sub}</div>` : bar7(60, "#2a2a2a", 3)}</div></div>`;
// h: the thumbnail's height (CSS); a story about something drawn on the thumbnail passes a real 16:9 one
const big7 = (i, t, extra = "", h = "height:38px") => `<div><div class="th7" style="${h};border-radius:3px;background:${ART[i % ART.length]};position:relative">${extra}</div><div style="display:flex;gap:3px;margin-top:3px;align-items:center"><span style="width:9px;height:9px;border-radius:50%;background:${AV[i % AV.length]};flex:none"></span><span style="font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</span></div></div>`;
// A menu row's words wrap onto a second line when the phone is too narrow for them, as Android menus do:
// on one line they ran out past the phone's edge and were cut mid-word ("Allow ads on this cha").
const item7 = (icon, t, cls = "") => `<div class="${cls}" style="display:flex;gap:5px;align-items:center;padding:2px 0;line-height:1.15">${ico7(icon)}<span style="min-width:0;overflow-wrap:break-word">${t}</span></div>`;
const chip7 = (t, hi) => `<span style="flex:none;padding:1px 5px;border-radius:5px;background:${hi ? "#f1f1f1" : "#272727"};color:${hi ? "#0f0f0f" : "#ddd"};font-size:6px">${t}</span>`;
const chips7 = (list) => `<div style="display:flex;gap:3px;overflow:hidden">${list.map((t, i) => chip7(t, i === 0)).join("")}</div>`;
const tgt7 = (html, w) => `<div class="tgt7${w ? " w7" : ""}">${html}</div>`;
// A Short filling the phone: video, its channel line at the bottom and the action column on the right.
// Messages on it go in the free middle (SHORT_PILL), never over the channel line at the bottom.
const SHORT_PILL = "44%";
// A swipe to the next Short (shared): the one on screen slides up while the next slides in under the
// finger, together, as in the app. The next one used to pop in only after the screen had gone black,
// which read as the picture being replaced. What belongs to a Short (its speed readout, a LIVE badge)
// is drawn inside it (inner), so it leaves and arrives with its Short: a readout that stayed in place
// showed the old Short's value on the new one until its text was changed.
function swipeShort7(dev, art, ms = 400, inner = "") {
  const cur = dev.querySelector(".sv7"); if (!cur) return null;
  const nx = cur.cloneNode(false); nx.style.transition = "none"; nx.style.background = art; nx.style.transform = "translateY(100%)"; nx.innerHTML = inner;
  cur.after(nx); void nx.offsetWidth;
  const d = Math.round(ms * scStretch);
  [cur, nx].forEach(e => { e.style.transition = `transform ${d}ms var(--ease)`; });
  cur.style.transform = "translateY(-100%)"; nx.style.transform = "none";
  later(() => cur.remove(), d + 50);
  return nx;
}
const short7 = (art, inner = "") => `<div class="pg7" style="position:absolute;inset:0"><div style="position:absolute;inset:0;background:${ART[art]};transition:background .3s"></div>
  <div style="position:absolute;right:4px;bottom:16px;display:grid;gap:5px;justify-items:center">${["like", "comment", "share"].map(n => ico7(n, 8)).join("")}</div>
  <b style="position:absolute;left:5px;right:20px;bottom:6px;font-size:6.5px">@fjordtimber · Tiny cabin tour</b>${inner}</div>`;
const nav7 = (tabs = ["home", "shorts", "plus", "subs", "you"]) => `<div style="position:absolute;left:0;right:0;bottom:0;height:16px;background:#0f0f0f;border-top:1px solid #222;display:flex;justify-content:space-around;align-items:center">${tabs.map(n => /^</.test(n) ? n : ico7(n, 8)).join("")}</div>`; // an icon name, or a button's own markup
const sheetRows = (rows) => rows.map(r => typeof r === "string" ? `<div>${r}</div>` : item7(r[0], r[1])).join("");
function x7(dev, el) {
  const k = devScale(dev), d = dev.getBoundingClientRect(), r0 = el.getBoundingClientRect();
  const r = { left: (r0.left - d.left) / k, top: (r0.top - d.top) / k, width: r0.width / k, height: r0.height / k }, s = Math.min(r.width, r.height, 22) + 6;
  dev.insertAdjacentHTML("beforeend", `<div class="x7" style="left:${r.left + r.width / 2 - s / 2 - 3}px;top:${r.top + r.height / 2 - s / 2 - 3}px;width:${s}px;height:${s}px">${ico7("close", s, "#ff0033")}</div>`);
}
function clock7(dev, label) {
  dev.insertAdjacentHTML("beforeend", `<div class="clock7"><div class="face"><i class="h"></i><i class="m"></i></div><span>${label}</span></div>`);
  return dev.querySelector(".clock7");
}
function check7(dev, text, ok = true) { dev.insertAdjacentHTML("beforeend", `<div class="check7 ${ok ? "ok" : "no"}">${ico7(ok ? "toggle" : "close", 9, ok ? "#4caf50" : "#ff0033")}<span>${text}</span></div>`); }
// The finger goes to a part of the phone (its middle, or a point inside it given as fractions).
function fingerOn(dev, f, el, fx = .5, fy = .5, ms = 0) {
  if (!el || !f) return;
  const k = devScale(dev), d = dev.getBoundingClientRect(), r = el.getBoundingClientRect();
  fingerTo(f, (r.left - d.left + r.width * fx) / k - dev.clientLeft, (r.top - d.top + r.height * fy) / k - dev.clientTop, ms);
}
// Every "mark, then remove" story (a part of the page outlined in red, then folded away) runs on one
// clock, so all of them change speed together (Max, Nov 24: 30% faster than the 350 / 1050 / 1700 ms
// they had). The fold itself is .tgt7's transition (motion.css), sped up the same way.
// A part that fills the phone up to its edges (a scrim, a gradient) has its red outline drawn inside
// itself: drawn outside, the phone cut off all but one side, which read as a stray red line across the
// video (Max, Nov 25: Tap and hold gradient).
function atEdges7(e) {
  const d = e.closest(".dev"); if (!d) return false;
  const r = e.getBoundingClientRect(), o = d.getBoundingClientRect(), s = o.width / (d.offsetWidth || 1), c = d.clientLeft * s, k = 2.5 * s;
  return [r.left - o.left - c < k, o.right - c - r.right < k, r.top - o.top - c < k, o.bottom - c - r.bottom < k].filter(Boolean).length >= 2;
}
const MARK_T = { mark: 245, gone: 735, unmark: 1190 };
function markGone(targets, remove, o = {}) {
  const t = [...targets];
  at(MARK_T.mark, () => t.forEach(e => { e.classList.remove("instant7"); if (o.reveal) e.classList.remove("gone7"); e.classList.toggle("in7", atEdges7(e)); e.classList.add("mark7"); }));
  at(MARK_T.gone, () => { if (remove) t.forEach(e => e.classList.add("gone7")); if (o.then) o.then(); });
  at(MARK_T.unmark, () => t.forEach(e => e.classList.remove("mark7")));
}
// A page where one element (class tgt7) is removed when the setting is on (or added, with invert).
function hidePage(sec, key, sit, page, o = {}) {
  scen(sec, key, (box, on) => {
    situation(sit);
    box.innerHTML = device(o.dev || "port", (o.raw ? page : pageRows(page)) + (o.nav ? nav7(o.nav === true ? undefined : o.nav) : ""));
    const dev = box.querySelector(".dev"), t = [...dev.querySelectorAll(".tgt7")];
    const show = o.invert ? on : !on;
    if (o.invert) t.forEach(e => e.classList.add("gone7", "instant7"));
    markGone(t, !o.invert && !show, { reveal: o.invert && show });
    // no caption: "Removed" / "Shown (stock)" only repeated the Hide / Show label above each phone,
    // and the marked part disappearing shows it; the phones get that room instead
    return "";
  });
}
const feed7 = (inner, title = "YouTube") => top7(title) + chips7(["All", "Music", "Live", "Gaming"]) + inner;
const search7 = (q, inner) => `<div style="display:flex;gap:4px;align-items:center">${ico7("back")}<div style="flex:1;min-width:0;height:11px;border-radius:6px;background:#272727;font-size:6.5px;line-height:11px;padding:0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${q}</div>${ico7("mic")}</div>` + inner;
const you7 = (inner) => top7("You", ["cast", "search", "gear"]) + `<div style="display:flex;gap:5px;align-items:center"><span style="width:18px;height:18px;border-radius:50%;background:${AV[1]}"></span><div><b style="font-size:7.5px">Kari N.</b><div style="font-size:5.5px;color:#aaa">@kari · View channel</div></div></div>` + inner;
const player7 = (i = 3, inner = "") => `<div style="height:52px;border-radius:2px;background:${ART[i]};position:relative;margin:-6px -6px 0">${inner}</div>`;
const chat7 = (rows) => rows.map(([c, n, t]) => `<div style="display:flex;gap:3px;font-size:6px;line-height:1.3"><span style="width:7px;height:7px;border-radius:50%;background:${AV[c]};flex:none"></span><span><b style="color:#aaa">${n}</b> ${t}</span></div>`).join("");

// ---------- Home feed
// The feed goes stale while you are away. Stock: YouTube pulls a refresh by itself and your place is gone.
// On: nothing happens until you pull down yourself.
SCN_HOLD.morphe_disable_auto_feed_refresh = 4600;
scen("feed", "disable_auto_feed_refresh", (box, on) => {
  situation("You scrolled to a video, then left the app for a while", true);
  const mark = `<span class="bm7" style="position:absolute;right:-3px;top:-3px;padding:0 3px;border-radius:3px;background:#3ea6ff;color:#000;font-size:5px;font-weight:700">YOUR SPOT</span>`;
  box.innerHTML = device("port", pageRows(feed7(`<div class="fd7" style="display:grid;gap:5px;transition:opacity .25s">${big7(3, "Building a tiny cabin")}${row7(4, "Night train to Bodø")}<div style="position:relative;outline:1.5px solid #3ea6ff;outline-offset:1px;border-radius:2px">${row7(5, "Why ice is slippery")}${mark}</div>${row7(2, "Lo-fi beats")}</div>`)));
  const dev = box.querySelector(".dev"), fd = dev.querySelector(".fd7"), f = dev.querySelector(".finger"), W = dev.clientWidth, H = dev.clientHeight;
  const spinner = () => { dev.insertAdjacentHTML("beforeend", `<div class="spin7"><i></i></div>`); return dev.querySelector(".spin7"); };
  let c;
  at(300, () => { c = clock7(dev, "40 min later, the feed is old"); });
  at(1400, () => { c.remove(); });
  if (!on) {
    at(1600, () => spinner());
    at(2400, () => { fd.style.opacity = 0; later(() => { fd.innerHTML = `${big7(6, "Stove install, part 2")}${row7(0, "Shorts you missed")}${row7(1, "Live: northern lights")}${row7(7, "Top 10 axes")}`; fd.style.opacity = 1; dev.querySelector(".spin7")?.remove(); }, 260); });
    at(2900, () => toast7(dev, "Refreshed itself, your spot is lost", "82%"));
  } else {
    at(1600, () => { const sp = spinner(); sp.classList.add("dead"); });
    at(1850, () => x7(dev, dev.querySelector(".spin7")));
    at(2400, () => { dev.querySelectorAll(".spin7,.x7").forEach(e => e.remove()); check7(dev, "Same videos, same spot"); dev.querySelector(".check7").style.top = "74%"; });
    // you can still refresh whenever you want, by pulling down
    at(3300, () => { dev.querySelector(".check7")?.remove(); fingerTo(f, W * .5, H * .25, 0); });
    at(3400, () => fingerTo(f, W * .5, H * .45, 500));
    at(3700, () => spinner());
    at(4100, () => { f.classList.remove("show"); toast7(dev, "Pull down to refresh anytime", "82%"); });
  }
  return on ? "The feed stays as you left it; refresh by pulling down" : "The feed refreshes by itself and you lose your place (stock)";
});
scen("feed", "feed_long_press_menu", (box, on) => {
  situation("Holding a video in the feed");
  box.innerHTML = device("port", pageRows(feed7(`${big7(3, "Building a tiny cabin")}${row7(4, "Night train to Bodø")}`)));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(250, () => holdAt(f, W * .5, H * .3));
  at(1100, () => { f.classList.remove("hold", "show"); if (on) sheet7(dev, sheetRows([["clock", "Save to Watch later"], ["plist", "Save to playlist"], ["dl", "Download"], ["share", "Share"], ["close", "Not interested"]])); else { dev.querySelector(".pg7").style.filter = "brightness(.6)"; toast7(dev, "Inline preview plays", "40%"); } });
  return on ? "Hold a video: its menu opens" : "Hold a video: it starts an inline preview (stock)";
});
// Playback in feeds (YouTube's own "Playback in feeds" setting, kept in Morphe's menu): a video that stops
// in view starts a muted preview in its thumbnail: Always on, only on Wi-Fi, or never. The story starts on
// Wi-Fi and switches to mobile data, so all three end differently.
SCN_HOLD.morphe_playback_in_feeds = 3400;
scen("feed", "playback_in_feeds", (box, v) => {
  const n = Number(v), plays = wifi => n === 2 || (n === 1 && wifi);
  situation(n === 2 ? "A video stops in view, on any network" : "A video stops in view, on Wi-Fi and then on mobile data");
  const art = `<span class="pz7" style="position:absolute;inset:0;border-radius:3px;background:inherit;transition:scale 2.4s linear"></span><span class="badge7 mu7" style="left:3px;top:3px;opacity:0;transition:opacity .2s">${ico7("mute", 6)} Muted</span><i class="pp7" style="position:absolute;left:0;bottom:0;height:2px;width:0;background:#ff0033"></i><span class="badge7 du7" style="left:auto;right:3px;top:auto;bottom:3px;transition:opacity .2s">12:04</span>`;
  box.innerHTML = device("port", pageRows(feed7(`<div class="fd7" style="display:grid;gap:5px;transition:transform .5s var(--ease)">${row7(4, "Night train to Bodø")}${big7(3, "Building a tiny cabin", art)}${row7(2, "Lo-fi beats")}</div>`)) + (n === 2
    // Always on: the network does not matter, so both are shown together and nothing switches (Max, round 136)
    ? `<span class="badge7 net7" style="left:4px;top:auto;bottom:6px;display:inline-flex;flex-direction:row;align-items:center;gap:3px;white-space:nowrap">${ico7("wifi", 6)}${ico7("phone", 6)}<span>Any network</span></span>`
    : `<span class="badge7 net7" style="left:4px;top:auto;bottom:6px;display:inline-grid">${[["wifi", "Wi-Fi", 1], ["phone", "Mobile data", 0]].map(([ic, t, on]) => `<span class="nt7" style="grid-area:1/1;transition:opacity .2s;opacity:${on}">${ico7(ic, 6)} ${t}</span>`).join("")}</span>`));
  const dev = box.querySelector(".dev"), pp = dev.querySelector(".pp7"), pz = dev.querySelector(".pz7"), mu = dev.querySelector(".mu7"), du = dev.querySelector(".du7"), net = dev.querySelector(".net7");
  const play = (on, from) => {
    mu.style.opacity = on ? 1 : 0; du.style.opacity = on ? 0 : 1;
    pp.getAnimations().forEach(a => a.cancel());
    if (on) { pp.animate([{ width: from + "%" }, { width: from + 22 + "%" }], { duration: 1600 * scStretch, fill: "forwards" }); pz.style.scale = "1.04"; }
    else { pp.style.width = from + "%"; pz.style.scale = "1"; }
  };
  at(60, () => play(plays(true), 0));
  if (n === 2) return "";
  // both labels share the pill's box, so it keeps its size and place when the network changes
  at(1900, () => { net.querySelectorAll(".nt7").forEach((e, i) => { e.style.opacity = i; }); flash7(net); });
  at(2200, () => { if (!plays(false)) play(false, plays(true) ? 22 : 0); else play(true, 22); });
  return "";
});
// Play next in queue type (AddToQueuePatch.QueueType): what "Play next in queue" in a video's menu does.
// Default adds nothing (YouTube's own item, as without Morphe); Native queue opens the queue in YouTube's
// own playlist panel; Morphe queue keeps it as a playlist on your YouTube account; client side keeps it on
// the phone, with a Queue (n) button. The story taps the item and shows where the video went.
// Round 136 (Max: no animation for Default; Native vs Morphe hard to tell apart): Default now opens the menu
// too, without a queue item (AddToQueuePatch.QueueType.DEFAULT: "No queue features are added"). The three
// queues end on different pictures of where the video went: YouTube's own queue panel under a playing video
// (NATIVE), a private playlist in the account's playlists (MORPHE), a Queue (1) button on the phone (LOCAL).
SCN_HOLD.morphe_queue_type = 3200;
scen("feed", "queue_type", (box, v) => {
  const stock = v === "DEFAULT";
  situation(stock ? "A video's menu in the feed" : "Play next in queue, from a video's menu");
  const dots = `<span class="qd7" style="position:absolute;right:1px;top:41px;width:8px;height:8px;display:grid;place-items:center">${ico7("more", 7)}</span>`;
  box.innerHTML = device("port", pageRows(feed7(`<div style="position:relative">${big7(3, "Building a tiny cabin")}${dots}</div>${row7(4, "Night train to Bodø")}${row7(2, "Lo-fi beats")}`)));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger");
  const items = [["queue", "Play next in queue"], ["clock", "Save to Watch later"], ["plist", "Save to playlist"], ["share", "Share"]];
  at(60, () => fingerOn(dev, f, dev.querySelector(".qd7"), .5, .5, 250));
  at(400, () => { tapF(f); sheet7(dev, sheetRows(stock ? items.slice(1) : items)); });
  if (stock) { at(800, () => { f.classList.remove("show"); toast7(dev, "No queue item: nothing is added (stock)", "30%"); }); return ""; }
  at(800, () => fingerOn(dev, f, dev.querySelector(".sh7 > div"), .4, .5, 250));
  at(1150, () => tapF(f));
  at(1350, () => {
    f.classList.remove("show"); dev.querySelectorAll(".sh7,.shs7").forEach(e => e.remove());
    const add = html => dev.insertAdjacentHTML("beforeend", `<div class="qr7" style="position:absolute;left:5%;width:90%;box-sizing:border-box;bottom:6px;z-index:4;display:grid;gap:3px;animation:sheetup .3s var(--ease)">${html}</div>`);
    const shell = (head, body, note) => `<div style="border-radius:5px;background:#212121;padding:4px;display:grid;grid-template-columns:minmax(0,1fr);gap:3px;box-shadow:0 -2px 8px rgba(0,0,0,.5)"><div style="display:flex;gap:3px;align-items:center;font-size:6.5px">${head}</div>${body}<div style="color:#aaa;font-size:5.5px;line-height:1.3">${note}</div></div>`;
    const line = (art, t, sub, lead = "") => `<div style="display:flex;gap:3px;align-items:center;font-size:6px">${lead}<span style="width:20px;height:11px;border-radius:2px;background:${ART[art]};flex:none"></span><span style="min-width:0;flex:1;line-height:1.25"><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</span><span style="display:block;color:#aaa;font-size:5px">${sub}</span></span></div>`;
    if (v === "NATIVE") add(shell(`${ico7("queue", 7)}<b style="flex:1">Queue</b><span style="color:#aaa">1 / 2</span>${ico7("close", 7)}`,
      line(4, "Night train to Bodø", "Playing now", ico7("play", 5)) + line(3, "Building a tiny cabin", "Next"),
      "Native: YouTube's own queue panel, under the player"));
    else if (v === "MORPHE") { add(shell(`${ico7("plist", 7)}<b style="flex:1">Your playlists</b>`,
      `<div style="display:flex;gap:3px;align-items:center;font-size:6px"><span style="width:20px;height:11px;border-radius:2px;background:${ART[3]};flex:none;position:relative"><i style="position:absolute;right:0;top:0;bottom:0;width:8px;background:rgba(0,0,0,.7);display:grid;place-items:center;font-size:4.5px;font-style:normal">1</i></span><span style="min-width:0;flex:1;line-height:1.25"><b style="display:block">Morphe queue</b><span style="display:block;color:#aaa;font-size:5px">Private playlist · 1 video</span></span></div>`,
      "Morphe: a playlist on your YouTube account")); toast7(dev, "Added to queue", "16%"); }
    else { add(shell(`${ico7("phone", 7)}<b style="flex:1">Queue (1)</b>`, line(3, "Building a tiny cabin", "Next"), "Client side: kept only on this phone")); toast7(dev, "Added to queue", "16%"); }
  });
  return "";
});
// Show view count on thumbnails: Morphe moves the count from the line under the title to the bottom left
// of the thumbnail (it does not add or remove it). Both phones start as stock; the On phone's count moves.
scen("feed", "feed_view_count", (box, on) => {
  situation("Video rows in the feed");
  const card = (art, av, title, ch, views, age) => `<div><div style="height:38px;border-radius:3px;background:${ART[art]};position:relative"><span class="vc7" style="position:absolute;left:2px;bottom:2px;padding:0 3px;border-radius:2px;background:rgba(0,0,0,.78);font-size:5.5px;line-height:1.5;opacity:0;transition:opacity .3s">${views} views</span></div><div style="display:flex;gap:3px;margin-top:3px"><span style="width:9px;height:9px;border-radius:50%;background:${AV[av]};flex:none"></span><div style="min-width:0;flex:1"><div style="font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div><div style="display:flex;gap:2px;padding:2px 0;font-size:5.5px;color:#aaa;white-space:nowrap">${ch} ${tgt7(`· ${views} views`, 1)} · ${age}</div></div></div></div>`;
  box.innerHTML = device("port", pageRows(feed7(card(4, 1, "Night train to Bodø", "Fjord", "1.2M", "3d") + card(2, 2, "Cabin build, part 2", "Fjord", "84K", "1w") + card(5, 3, "Why ice is slippery", "Pocket", "410K", "2d"))));
  const dev = box.querySelector(".dev");
  if (!on) return "";
  markGone(dev.querySelectorAll(".tgt7"), true, { then: () => dev.querySelectorAll(".vc7").forEach(e => { e.style.opacity = 1; }) });
  return "";
});
// The You tab's bottom menu, one picture for its three settings (Max, Nov 24: Downloads needs the same
// picture as the menu filter it sits under). LayoutComponentsFilter: with "Enable Library / You bottom menu
// filter" on, items whose name contains a line of the filter are removed (hideAccountItem, any case);
// Downloads is a video lockup the name filter can't match, so it has its own switch.
const YOU_MENU = [["clock", "Your videos"], ["dl", "Downloads"], ["tv", "Your movies & TV"], ["spark", "Get YouTube Premium"], ["timer", "Time watched"]];
const youFilter = v => String(v || "").split("\n").map(x => x.trim()).filter(Boolean);
function youMenuScen(key, plan) {
  scen("feed", key, (box, v) => {
    const { sit, gone } = plan(v);
    situation(sit);
    const rows = YOU_MENU.map(([i, t, sub]) => { const h = item7(i, sub ? `${t}<span style="color:#aaa"> · ${sub}</span>` : t); return gone(t) ? tgt7(h) : h; }).join("");
    box.innerHTML = device("port", pageRows(you7(`<div><b style="font-size:7px">History</b><div style="display:flex;gap:3px;margin-top:2px">${[2, 4, 6].map(i => `<div style="width:26px;height:15px;border-radius:2px;background:${ART[i]}"></div>`).join("")}</div></div><div style="display:grid;gap:1px">${rows}</div>`)));
    markGone(box.querySelectorAll(".dev .tgt7"), true);
    return "";
  });
}
const nameHit = names => t => names.some(n => t.toLowerCase().includes(n.toLowerCase()));
// the filter's own lines when it has some, otherwise an example of what it does
const youNames = () => { const n = youFilter(V("morphe_hide_account_menu_filter_strings")); return n.length ? { names: n, own: true } : { names: ["Premium", "Time watched"], own: false }; };
youMenuScen("hide_account_menu", on => {
  const { names, own } = youNames(), dl = !!V("morphe_hide_account_menu_downloads");
  if (!on) return { sit: "The You tab's menu", gone: () => false };
  return { sit: `${own ? "Filter" : "Filter, for example"}: ${names.join(", ")}${dl ? " and Downloads" : ""}`, gone: t => nameHit(names)(t) || (dl && t === "Downloads") };
});
youMenuScen("hide_account_menu_filter_strings", v => {
  const names = youFilter(v);
  if (names.length) return { sit: `Filter: ${names.join(", ")}`, gone: nameHit(names) };
  const ex = ["Premium", "Time watched"]; // empty: what two lines would do
  return { sit: `Lines like ${ex.join(" and ")} remove those items`, gone: nameHit(ex) };
});
youMenuScen("hide_account_menu_downloads", on => ({ sit: "The You tab's menu", gone: t => !!on && t === "Downloads" }));
// The comments carousel under a video (CommentsFilter.onCommentsLoaded: video_metadata_carousel): the comments
// box is a row of pages you swipe sideways, titled Comments, Ask, Community, Hype, Listen. With "Enable comments
// carousel filter" on, every page whose title contains a line of "Comments carousel filter" is taken out
// (title.contains, case as typed); comments themselves are never filtered, and taking out every page hides
// the whole comments section. Max (Nov 25): drawn as the swipeable row it is, the pages that go are marked
// and removed, then a swipe runs through the pages that are left; no blue line.
const CAROUSEL = [["comment", "Comments", "1.2K · Lovely build!"], ["spark", "Ask", "Ask about this video"], ["fire", "Hype", "Hype this video"], ["plist", "Community", "Fjord & Timber posted"]];
function carouselScen(key, plan) {
  scen("comments", key, (box, v) => {
    const { gone, cap } = plan(v);
    const pages = CAROUSEL.map(([i, t, sub]) => `<div class="cpg7${gone(t) ? " tgt7 w7" : ""}" style="flex:none;width:72%;overflow:hidden"><div style="margin-right:4px;padding:4px 5px;border-radius:5px;background:#272727;display:grid;gap:2px"><b style="display:flex;gap:2px;align-items:center;font-size:6.5px;white-space:nowrap">${ico7(i, 7)}${t}</b><span style="font-size:5.5px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</span></div></div>`).join("");
    const left = CAROUSEL.filter(c => !gone(c[1])).length;
    box.innerHTML = device("port", pageRows(player7(3) + `<b style="font-size:7px">Building a tiny cabin</b><div class="crs7" style="overflow:hidden"><div class="crt7" style="display:flex;transition:transform .45s var(--ease)">${pages}</div></div><div class="cdt7" style="display:flex;gap:2px;justify-content:center">${CAROUSEL.map((_, i) => `<i style="width:3px;height:3px;border-radius:50%;background:${i ? "#555" : "#f1f1f1"};transition:background .2s,width .3s,opacity .3s"></i>`).join("")}</div>` + row7(2, "Night train to Bodø") + row7(4, "Lo-fi beats")));
    const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), W = dev.clientWidth;
    markGone(dev.querySelectorAll(".tgt7"), true);
    // the dots follow: one per page that is left
    at(MARK_T.gone, () => dev.querySelectorAll(".cdt7 i").forEach((d, i) => { if (i >= left) { d.style.width = "0"; d.style.opacity = "0"; d.style.marginLeft = "-2px"; } }));
    // a swipe through the pages that are left, one page at a time
    const yOf = () => { const r = dev.querySelector(".crs7").getBoundingClientRect(), d = dev.getBoundingClientRect(); return (r.top - d.top + r.height / 2) / (d.width / W); };
    const swipe = (n, t0) => {
      at(t0, () => fingerTo(f, W * .8, yOf()));
      at(t0 + 120, () => {
        fingerTo(f, W * .3, yOf(), 380);
        const p = [...dev.querySelectorAll(".cpg7")].filter(e => !e.classList.contains("gone7"))[n]; if (p) dev.querySelector(".crt7").style.transform = `translateX(${-p.offsetLeft}px)`;
        dev.querySelectorAll(".cdt7 i").forEach((d, i) => d.style.background = i === n ? "#f1f1f1" : "#555");
      });
      at(t0 + 560, () => f.classList.remove("show"));
    };
    for (let n = 1; n < Math.min(left, 3); n++) swipe(n, 900 + (n - 1) * 750);
    return ""; // no sentences under a redrawn animation (Max, Nov 25, permanent)
  });
}
const carouselNames = v => youFilter(v);
carouselScen("hide_comments_carousel", on => {
  const own = carouselNames(V("morphe_hide_comments_carousel_filter_strings")), names = own.length ? own : ["Ask", "Hype"];
  if (!on) return { cap: "Every page of the carousel stays", gone: () => false };
  return { cap: `${names.join(" and ")} ${names.length > 1 ? "pages leave" : "page leaves"} the carousel`, gone: t => names.some(n => t.includes(n)) };
});
carouselScen("hide_comments_carousel_filter_strings", v => {
  const names = carouselNames(v);
  if (names.length) return { cap: `Pages titled ${names.join(", ")} leave the carousel`, gone: t => names.some(n => t.includes(n)) };
  return { cap: "Lines like Ask and Hype take those pages out", gone: t => t === "Ask" || t === "Hype" };
});
hidePage("feed", "hide_album_cards", "Searching for an artist", search7("midnight tapes", tgt7(`<div style="display:flex;gap:4px;align-items:center;padding:3px;border-radius:3px;background:#1b1b1b"><div style="width:22px;height:22px;background:${ART[6]};border-radius:2px"></div><div style="font-size:6.5px">Neon Fjord<div style="font-size:5.5px;color:#aaa">Album · 2025</div></div></div>`) + row7(2, "Midnight Tapes live") + row7(3, "Lo-fi to study to")));
hidePage("feed", "hide_artist_cards", "Searching for an artist", search7("midnight tapes", tgt7(`<div style="display:flex;gap:5px;align-items:center;padding:3px;border-radius:3px;background:#1b1b1b"><span style="width:22px;height:22px;border-radius:50%;background:${AV[4]}"></span><div style="font-size:6.5px">Midnight Tapes<div style="font-size:5.5px;color:#aaa">Artist · 1.1M subscribers</div></div></div>`) + row7(2, "Midnight Tapes live") + row7(3, "Lo-fi to study to")));
hidePage("feed", "hide_channel_buttons", "A channel row in search", search7("fjord timber", `<div style="display:flex;gap:5px;align-items:center"><span style="width:14px;height:14px;border-radius:50%;background:${AV[0]};flex:none"></span><div style="font-size:6.5px;line-height:1.15;flex:1;min-width:0">Fjord<div style="font-size:5.5px;color:#aaa">412K</div></div>${tgt7(`<span style="display:inline-block;padding:2px 5px;border-radius:6px;background:#f1f1f1;color:#000;font-size:6px">Subscribe</span>`, 1)}</div>` + row7(3, "Building a tiny cabin")));
hidePage("feed", "hide_compact_banner", "Home feed: a small banner and the empty dividers", feed7(tgt7(`<div style="display:flex;gap:4px;align-items:center;padding:3px 4px;border-radius:4px;background:#1f2a3a;font-size:6px">${ico7("info", 8)}<span style="flex:1">Your feed is paused. <span style="color:#3ea6ff">Turn on history</span></span>${ico7("close", 7)}</div>`) + big7(3, "Building a tiny cabin") + tgt7(`<div style="height:7px;border-top:1px solid #2a2a2a;border-bottom:1px solid #2a2a2a;background:repeating-linear-gradient(45deg,#161616 0 3px,#0f0f0f 3px 6px)"></div>`) + row7(4, "Night train to Bodø") + tgt7(`<div style="height:7px;border-top:1px solid #2a2a2a;border-bottom:1px solid #2a2a2a;background:repeating-linear-gradient(45deg,#161616 0 3px,#0f0f0f 3px 6px)"></div>`) + row7(5, "Why ice is slippery")), { hidden: "Compact banners (small notices like this) and the empty divider strips are removed" });
hidePage("feed", "hide_feed_flyout_menu", "The ⋮ menu of a video", feed7(big7(3, "Building a tiny cabin")) + `<div style="background:#212121;border-radius:6px 6px 0 0;padding:4px;display:grid;gap:1px;margin:0 -6px -6px">${item7("clock", "Save to Watch later")}${tgt7(item7("spark", "Ask about this video"))}${item7("share", "Share")}${tgt7(item7("flag", "Report"))}</div>`, { hidden: "Menu items you filtered are removed" });
hidePage("feed", "hide_floating_microphone_button", "The search screen", search7("", `<div style="display:grid;gap:3px">${item7("clock", "cabin build")}${item7("clock", "lo-fi beats")}${item7("clock", "night train")}</div><div style="height:12px"></div>` + `<div style="display:flex;justify-content:flex-end;padding-right:4px">${tgt7(`<span style="width:20px;height:20px;border-radius:50%;background:#ff0033;display:grid;place-items:center">${ico7("mic", 10)}</span>`, true)}</div>`)); // lower right, as Morphe says; the outline hugs the round button
hidePage("feed", "hide_get_premium_button", "The You tab", you7(tgt7(`<div style="padding:3px 5px;border-radius:4px;background:#ff0033;font-size:6.5px;text-align:center">Get YouTube Premium</div>`) + `<div style="display:grid;gap:1px">${item7("clock", "History")}${item7("plist", "Playlists")}</div>`));
hidePage("feed", "hide_handle", "The account menu", you7("").replace("@kari · View channel", `<span class="tgt7 w7" style="display:inline-flex">@kari ·&nbsp;</span>View channel`), { raw: false, hidden: "Your @handle is not shown" });
hidePage("feed", "hide_help_feedback_menu", "Settings in the account menu", you7(`<div style="display:grid;gap:1px">${item7("gear", "Settings")}${item7("eye", "Your data in YouTube")}${tgt7(item7("help", "Help & feedback"))}</div>`));
hidePage("feed", "hide_history_shelf", "The You tab", you7(tgt7(`<div><b style="font-size:7px">History</b><div style="display:flex;gap:3px;margin-top:2px">${[2, 4, 6].map(i => `<div style="width:26px;height:15px;border-radius:2px;background:${ART[i]}"></div>`).join("")}</div></div>`) + `<div style="display:grid;gap:1px">${item7("plist", "Playlists")}${item7("dl", "Downloads")}</div>`));
hidePage("feed", "hide_image_shelf", "Search results", search7("aurora", tgt7(`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px">${[0, 5, 7].map(i => `<div style="height:18px;border-radius:2px;background:${ART[i]}"></div>`).join("")}</div>`) + row7(2, "Aurora timelapse 4K")));
// Morphe: "the invite card shown in the Notifications tab Messages section" (it was drawn on the Home feed)
hidePage("feed", "hide_invite_to_message_card", "Notifications, the Messages section", top7("Notifications", ["search", "gear"]) + chips7(["Messages", "Activity"]) + tgt7(`<div style="padding:4px;border-radius:4px;background:#1b1b1b;font-size:6px;line-height:1.3;display:flex;gap:4px;align-items:center">${ico7("chat", 9)}<span style="flex:1">Invite others to message on YouTube <span style="color:#3ea6ff">Invite</span></span></div>`) + row7(2, "Kari: saw the new cabin video?", "", "2 hours ago") + row7(4, "Lars sent a video", "", "1 day ago"));
// Morphe: "the blue 'Latest videos' banner that appears at the top of the Home feed" (it was a grey pill on Subscriptions)
hidePage("feed", "hide_latest_videos_button", "Home feed, new videos are waiting", feed7(`<div style="display:flex;justify-content:center">${tgt7(`<div style="padding:2px 7px;border-radius:7px;background:#3ea6ff;color:#000;font-size:6px;font-weight:500;display:inline-flex;gap:2px;align-items:center">${ico7("arrow", 6, "#000")}Latest videos</div>`)}</div>` + big7(3, "Building a tiny cabin") + row7(4, "Night train to Bodø")));
hidePage("feed", "hide_movies_section", "Home feed", feed7(big7(3, "Building a tiny cabin") + tgt7(`<div><b style="font-size:7px">Movies for you</b><div style="display:flex;gap:3px;margin-top:2px">${[1, 6, 7].map(i => `<div style="width:20px;height:28px;border-radius:2px;background:${ART[i]}"></div>`).join("")}</div></div>`)));
hidePage("feed", "hide_notifications_menu_header", "Tapping the bell: the Notifications screen", top7("Notifications", ["search", "gear"]) + tgt7(`<div style="display:flex;gap:4px;align-items:center;padding:4px;border-radius:4px;background:#1b1b1b;font-size:6px;line-height:1.3">${ico7("bell", 9)}<span style="flex:1">Get notified about the channels you like. <span style="color:#3ea6ff">Learn more</span></span></div>`) + row7(2, "Fjord & Timber uploaded", "", "2 hours ago") + row7(4, "Pocket Science is live", "", "5 hours ago") + row7(6, "Midnight Tapes premieres Friday", "", "1 day ago"), { hidden: "The header with the help link is gone; notifications start at the top" });
hidePage("feed", "hide_notify_me_button", "An upcoming premiere in the feed", feed7(big7(6, "Premieres Friday 18:00", `<span style="position:absolute;left:3px;bottom:3px;padding:0 3px;border-radius:2px;background:rgba(0,0,0,.7);font-size:5px">UPCOMING</span>`) + `<div style="display:flex;justify-content:flex-end;margin-top:-2px">${tgt7(`<span style="padding:2px 6px;border-radius:7px;background:#f1f1f1;color:#000;font-size:6px;display:inline-flex;gap:2px;align-items:center">${ico7("bell", 7, "#000")}Notify me</span>`, 1)}</div>` + row7(3, "Building a tiny cabin")), { hidden: "No reminder button on upcoming streams and premieres" });
hidePage("feed", "hide_search_term_thumbnails", "Search suggestions", search7("cab", `<div style="display:grid;gap:3px">${["cabin build", "cabin tour", "cabin in the woods"].map((t, i) => `<div style="display:flex;gap:4px;align-items:center;font-size:6.5px">${ico7("search", 7)}<span style="flex:1">${t}</span>${tgt7(`<div style="width:20px;height:11px;border-radius:2px;background:${ART[i + 2]}"></div>`, 1)}</div>`).join("")}</div>`));
hidePage("feed", "hide_show_more_button", "Search results", search7("cabin", row7(2, "Cabin build in 30 days") + row7(3, "Cabin tour") + tgt7(`<div style="text-align:center;font-size:6px;padding:2px;border:1px solid #333;border-radius:8px">Show more</div>`) + row7(4, "Off-grid cabin")));
hidePage("feed", "hide_subscribed_channels_bar", "Subscriptions", top7("Subscriptions", ["search"]) + tgt7(`<div style="display:flex;gap:5px">${[0, 1, 2, 3].map(i => `<span style="width:13px;height:13px;border-radius:50%;background:${AV[i]}"></span>`).join("")}</div>`) + row7(3, "Building a tiny cabin") + row7(5, "Why ice is slippery"));
hidePage("feed", "hide_subscribed_channels_bar_names", "Subscriptions", top7("Subscriptions", ["search"]) + `<div style="display:flex;gap:5px">${["Fjord", "Pocket", "Tapes", "Nico"].map((n, i) => `<div style="display:grid;justify-items:center;gap:1px"><span style="width:13px;height:13px;border-radius:50%;background:${AV[i]}"></span>${tgt7(`<span style="font-size:5px">${n}</span>`)}</div>`).join("")}</div>` + row7(3, "Building a tiny cabin"));
hidePage("feed", "hide_unavailable_videos_hidden_banner", "A playlist with removed videos", top7("Road trip mix", ["search", "more"]) + tgt7(`<div style="padding:3px;border-radius:3px;background:#1b1b1b;font-size:6px;color:#aaa">2 unavailable videos are hidden</div>`) + row7(1, "Night train to Bodø") + row7(2, "Lo-fi beats"));
hidePage("feed", "hide_web_search_results", "Search results", search7("how to split wood", row7(2, "Splitting wood the easy way") + tgt7(`<div style="padding:3px;border-radius:3px;background:#1b1b1b;font-size:6px">${ico7("search", 7)} Results from the web · wikihow.com</div>`) + row7(3, "Axe vs maul")));
hidePage("feed", "hide_you_may_like_section", "Search results", search7("cabin", row7(2, "Cabin build in 30 days") + tgt7(`<div><b style="font-size:6.5px">You may also like</b>${row7(6, "Tiny house tour")}</div>`) + row7(3, "Cabin tour")));
// the four flyout additions above share one scene: an item added to the video menu
for (const [k, icon, text] of [["ads_channel_whitelist_flyout_menu", "dollar", "Allow ads on this channel"], ["ask_summarize_flyout_menu", "spark", "Summarize with Ask"], ["playback_speed_channel_whitelist_flyout_menu", "speed", "Use normal speed on this channel"], ["aislist_submit_flyout_menu", "flag", "Report as AI slop"]])
  hidePage("feed", k, "The ⋮ menu of a video", feed7(big7(3, "Building a tiny cabin")) + `<div style="background:#212121;border-radius:6px 6px 0 0;padding:4px;display:grid;gap:1px;margin:0 -6px -6px">${item7("clock", "Save to Watch later")}${tgt7(item7(icon, text))}${item7("share", "Share")}</div>`, { invert: true, shown: `“${text}” is added to the menu`, hidden: "Not in the menu (stock)" });
scen("feed", "open_channel_of_live_avatar", (box, on) => {
  situation("Tapping the avatar of a live stream");
  box.innerHTML = device("port", pageRows(feed7(`<div style="position:relative">${big7(5, "Live: northern lights")}<span style="position:absolute;left:3px;top:3px;background:#cc0000;font-size:5px;font-weight:700;padding:0 3px;border-radius:2px">LIVE</span></div>`)));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(250, () => fingerTo(f, 11, H * .41)); at(600, () => tapF(f));
  at(850, () => { f.classList.remove("show"); dev.querySelector(".pg7").innerHTML = on ? top7("Pocket Science", ["search", "more"]) + `<div style="height:16px;border-radius:2px;background:${ART[5]}"></div><div style="display:flex;gap:4px;align-items:center"><span style="width:14px;height:14px;border-radius:50%;background:${AV[5]}"></span><b style="font-size:7px">Pocket Science</b></div>${row7(1, "Live now")}${row7(2, "Why ice is slippery")}` : player7(5, `<span style="position:absolute;left:3px;top:3px;background:#cc0000;font-size:5px;font-weight:700;padding:0 3px;border-radius:2px">LIVE</span>`) + chat7([[1, "ola", "wow!!"], [2, "mia", "green!"], [3, "ken", "😍"]]); });
  return on ? "The avatar opens the channel" : "The avatar opens the live stream (stock)";
});
// the middle of an element in the phone's own px (its drawing is scaled on screen)
const rowMid = (dev, el) => { const d = dev.getBoundingClientRect(), r = el.getBoundingClientRect(), z = d.width / dev.clientWidth; return (r.top - d.top + r.height / 2) / z; };
scen("feed", "playlist_long_press_drag", (box, on) => {
  box.innerHTML = device("port", pageRows(top7("Road trip mix", ["search", "more"]) + `<div class="pl7" style="display:grid;gap:4px;position:relative">${[1, 2, 3, 4].map(i => `<div class="pi7" style="transition:transform .3s">${row7(i, ["Night train to Bodø", "Lo-fi beats", "Fjord drive", "Coffee jazz"][i - 1])}</div>`).join("")}</div>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), it = dev.querySelectorAll(".pi7"); const W = dev.clientWidth, H = dev.clientHeight;
  // the finger holds the first row and moves exactly as far as the row does (Max, Nov 25: it ended a row
  // above the row it carried): both come from the rows' own places, measured in the phone
  const pitch = it[1].offsetTop - it[0].offsetTop, y0 = rowMid(dev, it[0]);
  at(250, () => holdAt(f, W * .5, y0));
  at(1000, () => { if (!on) { f.classList.remove("hold", "show"); sheet7(dev, sheetRows([["clock", "Save to Watch later"], ["close", "Remove from playlist"]])); return; } it[0].style.transform = "scale(1.05)"; it[0].style.background = "#333"; });
  at(1300, () => { if (!on) return; fingerTo(f, W * .5, y0 + 2 * pitch, 600); const mv = (f.style.transition.match(/top ([^,]+)/) || [0, `${600 * scStretch}ms var(--ease)`])[1]; it.forEach(e => { e.style.transition = "transform " + mv; }); /* the rows move with the finger's own timing */ it[0].style.transform = `translateY(${2 * pitch}px) scale(1.05)`; it[1].style.transform = `translateY(${-pitch}px)`; it[2].style.transform = `translateY(${-pitch}px)`; });
  at(2000, () => { if (!on) return; f.classList.remove("hold", "show"); it[0].style.transform = `translateY(${2 * pitch}px)`; it[0].style.background = ""; });
  return ""; // no sentences (Max, Nov 25): the drag and the menu say it
});
scen("feed", "playlist_wide_drag_handles", (box, on) => {
  situation("Grabbing a playlist row to move it");
  box.innerHTML = device("port", pageRows(top7("Road trip mix", ["search", "more"]) + [1, 2, 3].map(i => `<div style="display:flex;gap:3px;align-items:center"><div class="hd7${on && i === 1 ? " new7" : ""}" style="width:${on ? 16 : 6}px;align-self:stretch;display:grid;place-items:center;border-radius:2px;background:${on ? "rgba(62,166,255,.18)" : "transparent"}">${ico7("list", 6, "#aaa")}</div><div style="flex:1">${row7(i, ["Night train to Bodø", "Lo-fi beats", "Fjord drive"][i - 1])}</div></div>`).join("")));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const H = dev.clientHeight;
  at(300, () => holdAt(f, on ? 13 : 9, H * .17));
  at(1000, () => { f.classList.remove("hold", "show"); toast7(dev, on ? "Easy to grab" : "Small target, often missed", "80%"); });
  return on ? "A wide drag handle on each row" : "A thin drag handle (stock)";
});
// Post buttons layout (LayoutComponentsFilter.PostButtonsLayout): Server keeps what YouTube sends the
// account (the classic posts: like and dislike at the start, comments and share far off at the end);
// Enforced turns on the grouped layout of the post template, the comment and share buttons right next to
// like and dislike, the same for every account. The Enforced phone starts like Server and pulls together.
// Round 136 (Max: "shows nothing, maybe explanation is better"): the buttons are drawn large, each side says
// in words what it shows, and the Enforced side moves at once.
// Nov 24 (Max: "keep the white text, remove the simulated phones"): words only. Each side is the
// explanation of its layout in white, where a phone would be; nothing moves or flashes.
scen("feed", "post_buttons_layout", (box, v) => {
  situation("The buttons below a community post");
  const enforced = v === "ENFORCED";
  const say = enforced
    ? ["Grouped", "Comment and Share sit right next to Like and Dislike", "The same for every account"]
    : ["As YouTube sends it", "Like and Dislike at the start, Comment and Share far off at the end", "It can differ between accounts"];
  box.innerHTML = device("port", `<div class="say7"><b>${say[0]}</b><span>${say[1]}</span><span>${say[2]}</span></div>`, "height:112px").replace('class="dev port', 'class="dev port txt7');
  return "";
});
// Morphe: "A download button is shown next to the Share button of posts with images or GIFs, and a
// download item is added to their menu" (the story used to be a long press on the image).
scen("feed", "post_image_download", (box, on) => {
  situation("A community post with an image");
  const act = (n, cls = "") => `<span class="${cls}" style="display:grid;place-items:center;width:13px;height:11px;border-radius:5px;background:#272727">${ico7(n, 7)}</span>`;
  box.innerHTML = device("port", pageRows(`<div style="display:flex;gap:4px;align-items:center"><span style="width:12px;height:12px;border-radius:50%;background:${AV[3]}"></span><b style="font-size:7px;flex:1">Pocket Science</b>${ico7("more", 8)}</div><div style="font-size:6.5px">Frost patterns this morning ❄️</div><div style="height:56px;border-radius:4px;background:${ART[0]}"></div><div style="display:flex;gap:4px;align-items:center">${act("like")}${act("dislike")}${act("comment")}<span style="flex:1"></span>${act("share")}${on ? act("dl", "pd7 new7") : ""}</div>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger");
  if (!on) { toast7(dev, "No way to save the image", "82%"); return "Images in posts can't be saved (stock)"; }
  at(700, () => fingerOn(dev, f, dev.querySelector(".pd7"))); at(1050, () => tapF(f));
  at(1350, () => { f.classList.remove("show"); toast7(dev, "Saved to Pictures", "82%"); });
  return "A download button next to Share saves the image";
});
// Morphe: "Adds a flyout menu item to translate content creator posts" (the story used to draw a link under the post).
scen("feed", "post_translate", (box, on) => {
  situation("A community post in another language");
  box.innerHTML = device("port", pageRows(`<div style="display:flex;gap:4px;align-items:center"><span style="width:12px;height:12px;border-radius:50%;background:${AV[0]}"></span><b style="font-size:7px;flex:1">Fjord & Timber</b><span class="mo7" style="display:grid">${ico7("more", 8)}</span></div><div class="tx7" style="font-size:6.5px;line-height:1.35;transition:opacity .25s">Taket er ferdig! Neste uke: vedovnen.</div><div style="height:34px;border-radius:4px;background:${ART[3]}"></div>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger");
  at(300, () => fingerOn(dev, f, dev.querySelector(".mo7"))); at(650, () => tapF(f));
  at(900, () => { f.classList.remove("show"); sheet7(dev, sheetRows([...(on ? [["translate", "Translate"]] : []), ["share", "Share"], ["flag", "Report"]])); if (on) dev.querySelector(".sh7 > div").classList.add("new7"); });
  if (!on) return ""; // the menu without the item, and the post staying as it is, say it
  at(1700, () => { fingerOn(dev, f, dev.querySelector(".sh7 > div"), .3); });
  at(2050, () => tapF(f));
  at(2300, () => { f.classList.remove("show"); dev.querySelectorAll(".sh7, .shs7").forEach(e => e.remove()); const t = dev.querySelector(".tx7"); t.style.opacity = 0; later(() => { t.textContent = "The roof is done! Next week: the wood stove."; t.style.opacity = 1; }, 260); });
  return "";
});
scen("feed", "native_queue_fetch_on_scroll", (box, on) => {
  situation("Scrolling to the end of the queue");
  box.innerHTML = device("port", pageRows(top7("Queue", ["more"]) + `<div class="q7" style="display:grid;gap:4px;transition:transform .6s var(--ease)">${[1, 2, 3, 4].map(i => row7(i, "Queued video " + i)).join("")}</div>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), q = dev.querySelector(".q7"); const W = dev.clientWidth, H = dev.clientHeight;
  at(250, () => fingerTo(f, W * .5, H * .75)); at(500, () => { fingerTo(f, W * .5, H * .3, 600); q.style.transform = "translateY(-40px)"; });
  at(1200, () => { f.classList.remove("show"); if (on) { q.insertAdjacentHTML("beforeend", `<div style="font-size:6px;color:#aaa;text-align:center">Loading more…</div>`); later(() => { q.lastChild.remove(); q.insertAdjacentHTML("beforeend", [5, 6].map(i => row7(i, "Up next " + i)).join("")); }, 500); } else q.insertAdjacentHTML("beforeend", `<div style="font-size:6px;color:#aaa;text-align:center">End of queue</div>`); });
  return on ? "More videos load as you reach the end" : "The queue just ends (stock)";
});
scen("feed", "restore_original_titles", (box, on) => {
  situation("A video with a translated title");
  box.innerHTML = device("port", pageRows(feed7(`${big7(3, "")}<div class="tt7 chg7" style="font-size:7px;font-weight:600;transition:opacity .25s">Ich habe eine winzige Hütte gebaut</div>${row7(4, "Nachtzug nach Bodø")}`)));
  const dev = box.querySelector(".dev"), t = dev.querySelector(".tt7");
  toast7(dev, on ? "The creator's original title" : "Auto-translated title (stock)", "84%");
  at(300, () => { if (!on) return; t.style.opacity = 0; later(() => { t.textContent = "I built a tiny cabin"; t.style.opacity = 1; }, 260); });
  return on ? "Titles show as the creator wrote them" : "Titles are auto-translated to your language (stock)";
});
hidePage("feed", "playlist_hide_removal_snackbar", "Removing a video from a playlist", top7("Road trip mix", ["search", "more"]) + row7(1, "Night train to Bodø") + row7(2, "Lo-fi beats") + `<div style="height:16px"></div>` + tgt7(`<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;padding:3px 5px;border-radius:3px;background:#f1f1f1;color:#000;font-size:6px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Removed from Road trip mix</span><b style="color:#065fd4;flex:none">UNDO</b></div>`), { hidden: "No “Removed” snackbar after each removal" });
for (const [k, where, text] of [["hide_aislist_blocklist_home", "Home feed", "AI-generated channel"], ["hide_aislist_blocklist_search", "Search results", "AI-generated channel"]])
  hidePage("feed", k, where, (/Search/.test(where) ? search7("history facts", "") : feed7("")) + row7(2, "Real video") + tgt7(row7(7, "10 CRAZY facts (AI voice)", "", text)) + row7(3, "Another real video"), { hidden: "Videos from channels on the AI slop list are removed" });
for (const [k, where] of [["hide_aislist_warnlist_home", "Home feed"], ["hide_aislist_warnlist_search", "Search results"]])
  hidePage("feed", k, where, (/Search/.test(where) ? search7("space news", "") : feed7("")) + row7(2, "Real video") + tgt7(row7(6, "Space news daily", "", "⚠ on the AI warn list")) + row7(3, "Another real video"), { hidden: "Videos from channels on the warn list are removed" });
// each place has its own filter bar: the comments' one sorts comments (CommentsFilter hides its chip_bar
// while the player is open), the others filter videos with that page's chips
const vids7 = row7(2, "Building a tiny cabin") + row7(4, "Night train to Bodø");
for (const [k, where, page, chips, body] of [
  ["hide_filter_bar_in_comments", "Comments", top7("Comments", ["sort", "close"]), ["Top", "Newest", "Timed"], cmt7(2, "Lovely build!") + cmt7(3, "Subscribed for part 2") + cmt7(4, "That view at 3:12")],
  ["hide_filter_bar_in_history", "Watch history", top7("History", ["search", "more"]), ["All", "Videos", "Shorts", "Podcasts", "Music"], vids7],
  ["hide_filter_bar_in_related_videos", "Up next", player7(3), ["All", "From Fjord & Timber", "Related", "Watched"], vids7],
  ["hide_filter_bar_in_search", "Search results", search7("cabin", ""), ["All", "Shorts", "Videos", "Unwatched", "Live"], vids7]])
  hidePage("feed", k, where, page + tgt7(chips7(chips)) + body);
hidePage("feed", "hide_keyword_content_comments", "Comments with filtered words", top7("Comments", ["sort", "close"]) + cmt7(2, "Lovely build!") + tgt7(cmt7(4, "FREE GIFT CARDS click my profile")) + cmt7(3, "Subscribed for part 2"), { hidden: "Comments with your keywords are removed" });

// Expandable cards under videos (LayoutComponentsFilter, expandable_metadata / inline_expander): the cards
// that fold open under a video's title, such as the AI summary ("PAfeedback_genai") and the chapter or
// music card. Hide summary card only removes the summary; Hide all removes every one of them. A card that
// stays is tapped open, so it is clear what kind of card this is.
scen("watch", "hide_expandable_card", (box, v) => {
  situation("Under a video's title");
  const card = (cls, ic, head, body) => `<div class="${cls}" style="border-radius:4px;background:#272727;padding:3px 4px;font-size:6px;display:grid;gap:2px"><div style="display:flex;gap:3px;align-items:center">${ico7(ic, 7)}<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${head}</span>${ico7("expand", 7)}</div><div class="xb7" style="display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s var(--ease)"><div style="overflow:hidden;color:#bbb;line-height:1.3">${body}</div></div></div>`;
  const sum = card("xs7", "spark", "Summary", "Kari builds a 12 m² cabin from reclaimed pine in two weeks."), chap = card("xc7", "list", "Chapter 2 · Raising the roof", "0:00 Clearing the site<br>4:12 Raising the roof<br>9:40 The wood stove");
  const hideSum = v === "HIDE_SUMMARY_ONLY" || v === "HIDE_ALL", hideAll = v === "HIDE_ALL";
  box.innerHTML = device("port", pageRows(player7(0) + `<div style="font-size:7px;font-weight:600;line-height:1.25">Building a tiny cabin in the Norwegian forest</div>` + (hideSum ? tgt7(sum) : sum) + (hideAll ? tgt7(chap) : chap) + row7(2, "Night train to Bodø")));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger");
  markGone(dev.querySelectorAll(".tgt7"), true);
  const keep = hideAll ? null : dev.querySelector(hideSum ? ".xc7" : ".xs7");
  if (keep) {
    at(1300, () => fingerOn(dev, f, keep, .5, .3, 300)); at(1650, () => tapF(f));
    at(1850, () => { f.classList.remove("show"); keep.querySelector(".xb7").style.gridTemplateRows = "1fr"; });
  }
  return "";
});
// ---------- other screens
hidePage("ads", "hide_fullscreen_ads", "Opening a video", player7(3) + row7(2, "Up next") + row7(4, "Up next") + `<div class="tgt7" style="position:absolute;inset:0;max-height:200px;background:#fff;color:#000;display:grid;place-items:center;font-size:7px;z-index:4"><div style="text-align:center"><b>Ad · 0:05</b><div style="font-size:6px">Install Pocket Planner</div></div></div>`, { hidden: "No full-screen ad before the video" });
hidePage("channel", "hide_channel_tab", "A channel page", top7("Fjord & Timber", ["search", "more"]) + `<div style="height:18px;border-radius:2px;background:${ART[3]}"></div><div style="display:flex;gap:5px;font-size:5.5px;white-space:nowrap;border-bottom:1px solid #333;padding-bottom:2px"><span style="flex:none">Home</span><span style="flex:none">Videos</span>${tgt7("<span>Shorts</span>", 1)}${tgt7("<span>Store</span>", 1)}</div>` + row7(2, "Building a tiny cabin"), { hidden: "Channel tabs you filtered are removed" });
scen("look", "disable_layout_updates", (box, on) => {
  situation("YouTube tests a new layout on you"); // no blue line (Max, Nov 20)
  box.innerHTML = device("port", pageRows(feed7(`<div class="ly7" style="display:grid;gap:5px;transition:opacity .3s">${big7(3, "Building a tiny cabin")}${row7(4, "Night train to Bodø")}</div>`)));
  const dev = box.querySelector(".dev"), ly = dev.querySelector(".ly7");
  toast7(dev, "Server: try layout B", "50%");
  at(1200, () => { dev.querySelector(".t7")?.remove(); if (on) { x7(dev, ly); later(() => { dev.querySelector(".x7")?.remove(); check7(dev, "Layout stays the same"); }, 600); } else { ly.style.opacity = 0; later(() => { ly.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">${[3, 4, 5, 6].map(i => `<div style="height:22px;border-radius:3px;background:${ART[i]}"></div>`).join("")}</div>`; ly.style.opacity = 1; }, 300); } });
  return on ? "Server-side layout experiments are ignored" : "YouTube can switch your layout at any time (stock)";
});
scen("look", "fix_status_bar_layout", (box, on) => {
  situation("Opening a video");
  box.innerHTML = device("port", `<div style="position:absolute;left:0;right:0;top:0;height:8px;background:#000;font-size:5px;display:flex;justify-content:space-between;padding:0 4px;align-items:center;z-index:3"><span>9:41</span><span>5G ▮</span></div>` + `<div class="pv7" style="position:absolute;left:0;right:0;top:${on ? 8 : 0}px;height:52px;background:${ART[3]};transition:top .3s"></div><div style="position:absolute;left:5px;right:5px;top:66px;display:grid;gap:4px">${bar7(90)}${bar7(70)}</div>`);
  const dev = box.querySelector(".dev");
  toast7(dev, on ? "Video sits below the status bar" : "Status bar covers the video", "78%");
  return on ? "The status bar no longer overlaps the player" : "On some devices the status bar overlaps the top of the player (stock)";
});
// Morphe: "Morphe messages, such as the confirmation of a player button, are shown in the YouTube snackbar
// instead of a popup". Off is the popup (an Android toast), On is YouTube's own snackbar. The two sides
// used to be the other way round, and showed a YouTube message instead of a Morphe one (audit, Nov 24).
// Drawn from NativeSnackbarPatch: On runs the command a server response uses (AddToToastAction), so the
// message is YouTube's own snackbar: a bar the width of the screen less its margins, sliding up from the
// bottom and resting right on the navigation bar (Morphe removes the extra room YouTube left under it),
// shown for YouTube's fixed time, one message at a time. Off is Android's toast: a small pill with the app
// icon, floating well above the bottom, fading in and out. No lines (Max, Nov 25): the phones tell it.
// Show messages in YouTube snackbar (NativeSnackbarPatch): On, YouTube's own snackbar (AddToToastAction) rests
// right on the navigation bar; Off, Android's toast with the app's icon. Copying the link three times in a
// row (Max, Nov 25 14:35: loop it 3x, 10% faster). Each message comes in and goes with its own animation
// (WAAPI: the On side's transition used to start late and leave the bar half under the navigation bar).
const SNACK_LOOP = 2900, SNACK_N = 3; // one copy and its message, 10% quicker than the 3.2 s it was
scen("look", "native_snackbar", (box, on) => {
  box.innerHTML = device("port", watch7(`<span class="cl7" style="position:absolute;right:4px;top:4px;display:grid;place-items:center;width:11px;height:11px;border-radius:50%;background:rgba(0,0,0,.55)">${ico7("link", 7)}</span>`) + nav7());
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger");
  const msg = on
    ? `<div class="msg7" style="position:absolute;left:4px;right:4px;bottom:17px;z-index:3;padding:5px 6px;border-radius:4px;background:#f1f1f1;color:#0f0f0f;font-size:6.5px;line-height:1.2;box-shadow:0 2px 6px rgba(0,0,0,.4);opacity:0">Link copied to clipboard</div>`
    : `<div class="msg7" style="position:absolute;left:50%;bottom:34px;translate:-50% 0;z-index:3;width:max-content;max-width:86%;padding:3px 8px 3px 4px;border-radius:9px;background:#3a3a3a;color:#fff;font-size:6px;line-height:1.2;display:flex;gap:4px;align-items:center;box-shadow:0 2px 6px rgba(0,0,0,.4);opacity:0"><span style="width:8px;height:8px;border-radius:50%;background:#ff0033;flex:none;display:grid;place-items:center">${ico7("play", 5)}</span>Link copied to clipboard</div>`;
  const shown = on ? [{ transform: "translateY(6px)", opacity: 0 }, { transform: "none", opacity: 1 }] : [{ opacity: 0 }, { opacity: 1 }];
  for (let r = 0; r < SNACK_N; r++) {
    const t = r * SNACK_LOOP;
    at(t + 220, () => fingerOn(dev, f, dev.querySelector(".cl7"))); at(t + 540, () => tapF(f));
    at(t + 765, () => {
      f.classList.remove("show"); dev.querySelector(".msg7")?.remove();
      dev.insertAdjacentHTML("beforeend", msg);
      dev.querySelector(".msg7").animate(shown, { duration: on ? 250 : 220, easing: "cubic-bezier(.2, .8, .3, 1)", fill: "forwards" });
    });
    // YouTube's snackbar and the toast both go after a short while: the bar slides back down, the toast fades
    at(t + 2500, () => { const m = dev.querySelector(".msg7"); if (m) m.animate([...shown].reverse(), { duration: 200, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" }); });
  }
  return "";
});
SCN_HOLD.morphe_native_snackbar = SNACK_LOOP * SNACK_N + 200; // all three messages, each with its going
hidePage("look", "override_youtube_music_buttons", "Tapping a YouTube Music link", feed7(big7(6, "Midnight Tapes · Neon Fjord")) + tgt7(`<div style="padding:3px;border-radius:4px;background:#1b1b1b;font-size:6px;display:flex;gap:3px;align-items:center">${ico7("music", 7, "#ff0033")}Opens your preferred music app</div>`), { invert: true, shown: "Music buttons open your preferred music app", hidden: "Music buttons open the stock YouTube Music (stock)" });
hidePage("look", "settings_search_history", "Searching in settings", search7("speed", `<div style="display:grid;gap:3px">${tgt7(item7("clock", "seekbar"))}${tgt7(item7("clock", "captions"))}${item7("gear", "Playback speed")}</div>`), { invert: true, shown: "Your recent settings searches are listed", hidden: "No search history (stock)" });
// Show Morphe setting icons: the icons beside the sections of Morphe's own settings screen (not YouTube's
// menus). Tap Morphe in YouTube's settings, the Morphe screen slides in with or without its icons.
scen("look", "show_menu_icons", (box, on) => {
  situation("Opening Morphe settings");
  const secs = [["dollar", "Ads"], ["home", "Feed"], ["layout", "General"], ["tv", "Player"], ["shorts", "Shorts"], ["timer", "SponsorBlock"], ["gesture", "Swipe controls"], ["speed", "Video"]];
  const row = ([i, t]) => `<div style="display:flex;gap:6px;align-items:center;height:11px;white-space:nowrap">${on ? ico7(i, 8) : ""}<span>${t}</span></div>`;
  box.innerHTML = device("port", pageRows(top7("Settings", ["search"]) + ["General", "Account", "Notifications", "Privacy"].map(t => `<div style="height:11px;display:flex;align-items:center">${t}</div>`).join("") + `<div class="mo7" style="height:11px;display:flex;align-items:center;gap:5px;font-weight:700">Morphe</div>`)
    + `<div class="ms7" style="position:absolute;inset:0;background:#0f0f0f;padding:6px;display:grid;grid-auto-rows:max-content;gap:5px;font-size:7px;color:#ddd;transform:translateX(100%);transition:transform .4s var(--ease)">${top7("Morphe", ["search"])}${secs.map(row).join("")}</div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), mo = dev.querySelector(".mo7");
  at(150, () => { const k = devScale(dev), d = dev.getBoundingClientRect(), r = mo.getBoundingClientRect(); fingerTo(f, (r.left - d.left) / k + 14, (r.top - d.top + r.height / 2) / k); });
  at(450, () => tapF(f));
  at(550, () => { dev.querySelector(".ms7").style.transform = "none"; f.classList.remove("show"); }); // the finger leaves, so the list reads clearly
  return on ? "Each Morphe settings section has its icon" : "Morphe settings sections are text only";
});
scen("look", "spoof_app_version", (box, on) => {
  // the version YouTube really is (the preview's version), and the older one it is told; what comes back
  // is said in Morphe's own words for that choice ("21.11.48 - Restore old captions behavior")
  const ents = entriesFor("morphe_spoof_app_version_target"), cur = V("morphe_spoof_app_version_target");
  const ent = ents.find(e => sameVal(e.value, cur)) || ents[0] || { value: "19.01.34", label: "" };
  box.innerHTML = device("port", pageRows(top7("Settings", ["search"]) + `<div style="display:grid;gap:3px;font-size:6.5px"><div>About</div><div style="color:#aaa">App version YouTube sees</div><b class="v7 chg7" style="font-size:8px;transition:opacity .25s">${ytVersion}</b></div>` + feed7(big7(3, ""))));
  const dev = box.querySelector(".dev"), v = dev.querySelector(".v7");
  at(300, () => { if (!on) return; v.style.opacity = 0; later(() => { v.textContent = ent.value; v.style.opacity = 1; }, 260); });
  // (no message pill naming what the version brings back, Max, Nov 25: the version shown is the story)
  return "";
});
// Morphe: "Use the theme color for text and icons" (ThemeColorPatch.getForegroundColor): the text and icons
// YouTube draws in its own white (#F1F1F1, dark theme) or black (#0F0F0F, light theme) take the colour of the
// other theme instead, so the dark theme writes in your light theme's colour. Drawn with your colours: the
// dark theme unless it is App default (then nothing changes there, and the light theme is shown); when the
// other theme's colour is too close to the stock white / black to see, Light pink / Material You (Primary)
// stand in so the change can be seen.
// (Max, Nov 25: the look must follow the theme settings as Morphe's code does; it used to show a made-up teal.)
scen("look", "theme_color_change_foreground", (box, on) => {
  const dark = V("morphe_theme_color_dark") !== "APP_DEFAULT", bg = themeColor(dark), stock = dark ? "#f1f1f1" : "#0f0f0f";
  const near = (x, y) => [1, 3, 5].every(i => Math.abs(parseInt(x.substr(i, 2), 16) - parseInt(y.substr(i, 2), 16)) < 24);
  let ink = themeColor(!dark); if (near(ink, stock)) ink = dark ? "#fccff3" : youColor("MATERIAL_YOU_PRIMARY", true);
  const items = [["clock", "History"], ["plist", "Playlists"], ["dl", "Downloads"], ["gear", "Settings"]];
  box.innerHTML = device("port", pageRows(top7("You", ["cast", "search", "gear"]) + `<div style="display:grid;gap:3px">${items.map(([i, t]) => `<div class="fg7" style="display:flex;gap:5px;align-items:center;font-size:7px;color:${stock};fill:${stock};transition:color .4s,fill .4s">${I(i, "ico", 'style="width:9px;height:9px;fill:inherit;transition:fill .4s"')}<span>${t}</span></div>`).join("")}</div>`));
  const dev = box.querySelector(".dev"), pg = dev.querySelector(".pg7") || dev;
  dev.style.background = bg; pg.style.background = bg; pg.style.color = stock;
  dev.querySelectorAll(".pg7 > div:first-child svg").forEach(e => { e.style.transition = "fill .4s"; e.style.fill = stock; });
  at(300, () => { if (!on) return; dev.querySelectorAll(".fg7").forEach(e => { e.style.color = ink; e.style.fill = ink; }); pg.style.color = ink; dev.querySelectorAll(".pg7 > div:first-child svg").forEach(e => { e.style.fill = ink; }); });
  return "";
});
// Startup animation (Max, Nov 25: it did nothing): opening the app from the home screen, as Morphe plays it.
// Drawn from SplashAnimationPatch and Morphe's own animation file (custom-branding/raw/morphe_startup_animation
// .json, 42 frames at 60 fps): the Morphe mark's left pillar (#1E5AA8) and right pillar (#00AFAE) grow up from
// their feet with a small overshoot (frames 0-18 and 3-21), the wave (gradient #1E5AA8 to #00AFAE) rises 26 units
// into place (5-21), the mark grows from 33.3 to 37% (0-28) and a white sheen sweeps across it (23-39).
// - Color / Monochrome: YouTube's own one-second logo animation, in red or in the theme's foreground colour.
// - Morphe Color / Morphe Monochrome: the Morphe animation above, in its colours or in the foreground colour.
// - Glow / Morphe Glow 1 / Morphe Glow 2 (Rive, 21.30+ and 21.39+): the logo comes into focus out of a coloured
//   glow, for as long as Startup animation duration says (1200 ms by default); a tap skips it.
// - Disabled: Android's splash shows the plain icon for a moment and the app opens.
// The splash is drawn in the theme's background colour (Morphe's splash theme follows the theme colour).
const MORPHE_MARK = {
  wave: "M127 108C93 108 83 133 83 148L83 202C113 169 158 229 163 235C191 267 207 322 256 324C304 322 323 268 349 235C349 235 394 161 429 155C429 127 418 108 385 108C351 108 327 158 310 180C293 202 285 226 256 226C227 226 218 201 202 180C185 158 161 108 127 108Z",
  right: "M349 285L349 370C350 391 368 408 389 408C410 408 428 391 429 370L429 182C418 168 355 245 349 285Z",
  left: "M123 140C102 140 84 157 83 178L83 370C84 391 102 408 123 408C144 408 162 391 163 370L163 178C162 157 144 140 123 140Z",
};
let markN = 0;
function morpheMark(size, mono) {
  const id = "mm" + (++markN), fill = c => mono ? mono : c;
  return `<svg class="mark7" viewBox="83 108 346 300" style="width:${size}px;height:${size * 300 / 346}px;overflow:visible"><defs><linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="83" y1="216" x2="429" y2="216"><stop offset="0" stop-color="${fill("#1e5aa8")}"/><stop offset="1" stop-color="${fill("#00afae")}"/></linearGradient>
    <clipPath id="${id}c"><path d="${MORPHE_MARK.wave}"/><path d="${MORPHE_MARK.left}"/><path d="${MORPHE_MARK.right}"/></clipPath></defs>
    <path class="pl7" d="${MORPHE_MARK.left}" fill="${fill("#1e5aa8")}" style="transform-origin:123px 408px"/><path class="pr7" d="${MORPHE_MARK.right}" fill="${fill("#00afae")}" style="transform-origin:389px 408px"/>
    <path class="wv7" d="${MORPHE_MARK.wave}" fill="url(#${id}g)"/><g clip-path="url(#${id}c)"><rect class="sh7" x="-32" y="-104" width="64" height="720" fill="#fff" fill-opacity=".55" transform="translate(0 0)" style="transform:translate(-120px,0) rotate(20deg);transform-box:view-box;transform-origin:0 256px"/></g></svg>`;
}
// YouTube's logo: the rounded red tile with its white play triangle (or the theme's foreground colour)
const ytLogo = (size, mono, bg) => `<svg class="ytl7" viewBox="0 0 28 20" style="width:${size}px;height:${size * 20 / 28}px"><rect width="28" height="20" rx="5.6" fill="${mono || "#ff0033"}"/><path d="M11.2 5.6v8.8l7.6-4.4z" fill="${mono ? bg : "#fff"}"/></svg>`;
const LOTTIE_EASE = "cubic-bezier(.2,.2,.1,1)", F60 = n => n * 1000 / 60;
function playMorpheMark(svg) {
  const o = (f0, f1) => ({ delay: F60(f0), duration: F60(f1 - f0), easing: LOTTIE_EASE, fill: "both" });
  svg.querySelector(".pl7").animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1.06)", offset: 12 / 18 }, { transform: "scaleY(1)" }], o(0, 18));
  svg.querySelector(".pr7").animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1.06)", offset: 12 / 18 }, { transform: "scaleY(1)" }], o(3, 21));
  svg.querySelector(".wv7").animate([{ transform: "translateY(26px)" }, { transform: "translateY(0)" }], o(5, 21));
  svg.animate([{ transform: "scale(.9)" }, { transform: "scale(1)" }], o(0, 28));
  svg.querySelector(".sh7").animate([{ transform: "translate(-40px,0) rotate(20deg)" }, { transform: "translate(560px,0) rotate(20deg)" }], { delay: F60(23), duration: F60(16), easing: "cubic-bezier(.45,0,.8,.2)", fill: "both" });
}
const SPLASH_RIVE = new Set(["RIVE_GLOW", "RIVE_GLOW_MORPHE", "RIVE_GLOW_MORPHE_2"]);
function splashStory(box, style, glowMs) {
  const bg = themeColor(true), ink = themeInk(true), mono = /BLACK_AND_WHITE|MONOCHROME/.test(style) ? ink : null;
  const morphe = /^MORPHE|^RIVE_GLOW_MORPHE/.test(style);
  const icon = `<span style="width:20px;height:20px;border-radius:6px;background:#0f1a2b;display:grid;place-items:center">${morpheMark(13)}</span>`;
  const apps = ["#3ddc84", "#4285f4", "#ea4335", "#fbbc04", "#a142f4", "#24c1e0", "#f6aea9"];
  box.innerHTML = device("port", `<div class="hs7" style="position:absolute;inset:0;background:linear-gradient(160deg,#22304f,#3b2a55 55%,#1b1e2b);display:grid;grid-template-columns:repeat(4,1fr);align-content:end;gap:9px 0;justify-items:center;padding:0 6px 26px">
      ${apps.map(c => `<span style="width:20px;height:20px;border-radius:6px;background:${c};opacity:.85"></span>`).join("")}<span class="ic7">${icon}</span></div>
    <div class="spl7" style="position:absolute;inset:0;background:${bg};display:grid;place-items:center;opacity:0;clip-path:circle(0 at 80% 84%)"></div>
    <div class="app7" style="position:absolute;inset:0;opacity:0">${pageRows(feed7(`${big7(2, "Night train to Bodø")}${big7(4, "Building a tiny cabin")}`)).replace("background:#0f0f0f", `background:${bg}`)}</div>`);
  const dev = box.querySelector(".dev"), f = dev.querySelector(".finger"), spl = dev.querySelector(".spl7"), app = dev.querySelector(".app7");
  const ic = dev.querySelector(".ic7"), W = dev.clientWidth, H = dev.clientHeight;
  const r = ic.getBoundingClientRect(), d = dev.getBoundingClientRect(), k = d.width / (dev.offsetWidth || 1);
  const ix = (r.left - d.left + r.width / 2) / k - dev.clientLeft, iy = (r.top - d.top + r.height / 2) / k - dev.clientTop;
  spl.style.clipPath = `circle(0 at ${ix}px ${iy}px)`;
  at(120, () => fingerTo(f, ix, iy));
  at(420, () => tapF(f));
  const T0 = 540, open = () => spl.animate([{ opacity: 0, clipPath: `circle(0 at ${ix}px ${iy}px)` }, { opacity: 1, clipPath: `circle(${Math.hypot(W, H)}px at ${ix}px ${iy}px)` }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
  // the splash lasts as long as the style plays, in real time (at() stretches a story to fill its round)
  const show = ms => later(() => app.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "ease-out", fill: "forwards" }), 260 + ms);
  at(T0, () => { f.classList.remove("show"); open(); });
  if (style === "DISABLED") { // Android's own splash: the plain icon, then the app
    at(T0, () => { spl.innerHTML = icon.replace("width:20px;height:20px", "width:26px;height:26px"); show(220); });
    return;
  }
  if (SPLASH_RIVE.has(style)) { // the logo comes into focus out of its glow, as long as the duration says
    const ms = Math.max(200, Number(glowMs) || 1200), logo = morphe ? morpheMark(34, mono) : ytLogo(34, mono, bg);
    const glow = morphe ? "radial-gradient(circle,rgba(30,90,168,.9),rgba(0,175,174,.55) 45%,transparent 70%)" : "radial-gradient(circle,rgba(255,0,51,.85),rgba(255,120,60,.5) 45%,transparent 70%)";
    at(T0, () => {
      spl.innerHTML = `<div style="position:relative;display:grid;place-items:center"><i class="gl7" style="position:absolute;width:80px;height:80px;border-radius:50%;background:${glow}"></i><div class="lg7" style="position:relative">${logo}</div></div>`;
      spl.querySelector(".gl7").animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1.1)", offset: .45 }, { opacity: 0, transform: "scale(1.5)" }], { duration: ms, easing: "ease-out", fill: "both" });
      spl.querySelector(".lg7").animate([{ opacity: 0, filter: "blur(6px)", transform: "scale(1.25)" }, { opacity: 1, filter: "blur(0)", transform: "scale(1)", offset: .6 }, { opacity: 1, filter: "blur(0)", transform: "scale(1)" }], { duration: ms, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
      show(ms);
    });
    return;
  }
  if (morphe) { at(T0, () => { spl.innerHTML = morpheMark(34, mono); playMorpheMark(spl.querySelector("svg")); show(F60(42) + 120); }); return; }
  // YouTube's own logo animation (one second): the tile pops in, the triangle follows
  at(T0, () => {
    spl.innerHTML = ytLogo(34, mono, bg);
    const s = spl.querySelector("svg");
    s.animate([{ transform: "scale(0)" }, { transform: "scale(1.12)", offset: .45 }, { transform: "scale(.96)", offset: .7 }, { transform: "scale(1)" }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
    s.querySelector("path").animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)" }], { delay: 300, duration: 400, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
    s.querySelector("path").style.transformOrigin = "14px 10px";
    show(1000);
  });
}
scen("look", "splash_screen_style", (box, v) => { splashStory(box, String(v), V("morphe_splash_screen_duration")); return ""; });
scen("look", "splash_screen_duration", (box, v) => { const st = String(V("morphe_splash_screen_style")); splashStory(box, SPLASH_RIVE.has(st) ? st : "RIVE_GLOW_MORPHE", v); return ""; });
scen("look", "custom_filter", (box, on) => {
  situation("Your own custom filter");
  box.innerHTML = device("port", pageRows(feed7(big7(3, "Building a tiny cabin") + tgt7(`<div style="padding:3px;border-radius:3px;background:#1b1b1b;font-size:6px">Sponsored shelf you don't want</div>`) + row7(4, "Night train to Bodø"))));
  const dev = box.querySelector(".dev"), t = dev.querySelector(".tgt7");
  markGone([t], on);
  return on ? "Components matching your filter strings are removed" : "No custom filter (stock)";
});
hidePage("look", "series_tracker", "Watching a series", player7(3, `<span style="position:absolute;left:3px;bottom:3px;font-size:5.5px;background:rgba(0,0,0,.7);padding:0 3px;border-radius:2px">Ep 4</span>`) + tgt7(`<div style="display:flex;gap:3px;align-items:center;font-size:6px;padding:3px;border-radius:3px;background:#1b1b1b">${ico7("list", 7)}Cabin build · 3 of 12 watched${bar7(20, "#3ea6ff", 3)}</div>`) + row7(2, "Episode 5"), { invert: true, shown: "Your progress through a series is tracked", hidden: "No series tracker (stock)" });
// Morphe: "Shows Subscriptions in the navigation bar, if YouTube moves it to a tab at the top of Home".
// The phone with the tabs has Subscriptions at the top of Home and none in the bar; the other has it in the bar.
scen("nav", "disable_toolbar_navigation_tabs", (box, on) => {
  situation("Where Subscriptions lives");
  const tabs = !on; // the setting disables the tabs: without it YouTube keeps Home / Subscriptions in the toolbar
  const tab = (t, hi) => `<span style="padding:0 0 1px;border-bottom:1px solid ${hi ? "#fff" : "transparent"};color:${hi ? "#fff" : "#aaa"}">${t}</span>`;
  const navBtn = (n, t, cls = "") => `<span class="${cls}" style="display:grid;justify-items:center;gap:1px;font-size:4.5px;color:#ddd">${ico7(n, 8)}${t}</span>`;
  box.innerHTML = device("port", pageRows(top7() + (tabs ? `<div class="new7" style="display:flex;gap:7px;font-size:6.5px">${tab("Home", 1)}${tab("Subscriptions")}</div>` : "") + chips7(["All", "Music", "Live", "Gaming"]) + big7(3, "Building a tiny cabin") + row7(4, "Night train to Bodø"))
    + nav7([navBtn("home", "Home"), navBtn("shorts", "Shorts"), ico7("plus", 9), ...(tabs ? [] : [navBtn("subs", "Subscriptions", "new7")]), navBtn("you", "You")]));
  return "";
});
hidePage("nav", "hide_toolbar_microphone_button", "The search bar", search7("", "").replace(ico7("mic"), tgt7(ico7("mic"), 1)) + `<div style="display:grid;gap:3px">${item7("clock", "cabin build")}${item7("clock", "lo-fi beats")}</div>`);
// A small watch page for the Ambient mode comparisons: the film's glow under the player (.amg7), or with
// enhanced: the whole page lit (.aml7). Same film and colours as the live preview (AMB_ART, AMB_GLOW).
const ambPage = (enh) => `<div class="pg7" style="position:absolute;inset:0;background:#0f0f0f;overflow:hidden">${enh ? `<div class="aml7" style="position:absolute;inset:-12px;background:${AMB_ART};background-size:100% 60%;background-repeat:no-repeat;filter:blur(6px) saturate(1.3);opacity:.8;transition:opacity .45s"></div>` : `<div class="amg7" style="position:absolute;left:-15%;right:-15%;top:30px;height:60px;background:${AMB_GLOW};filter:blur(5px);transition:opacity .45s"></div>`}<div class="apl7" style="position:relative;height:44px;background:${enh ? "transparent" : "#000"}"><div style="position:absolute;left:0;right:0;top:7px;bottom:7px;background:${AMB_ART}"></div></div><div class="acn7" style="position:relative;padding:5px 6px;display:grid;gap:4px;font-size:7px;color:#ddd"><b style="font-size:7px">Building a tiny cabin</b><div style="display:flex;gap:3px">${chip7("Like")}${chip7("Share")}${chip7("Save")}</div>${row7(2, "Up next · Night train")}${row7(4, "Up next · Lo-fi beats")}${row7(1, "Up next · Rain on a roof")}</div></div>`;
// Bypass Ambient mode restrictions: battery saver comes on. Stock turns the glow off to save power; on, it stays.
scen("ambient", "bypass_ambient_mode_restrictions", (box, on) => {
  situation("Battery saver turns on");
  box.innerHTML = device("port", ambPage(false));
  const dev = box.querySelector(".dev"), glow = dev.querySelector(".amg7");
  at(500, () => { dev.insertAdjacentHTML("beforeend", `<span class="badge7" style="right:3px;top:3px;z-index:3">${ico7("power", 6, "#ffcc00")} Battery saver</span>`); });
  at(900, () => { if (!on) glow.style.opacity = 0; toast7(dev, on ? "The glow stays on" : "The glow is switched off", "80%"); });
  return "";
});
// Dim while scrolling (Morphe AmbientLightController): a touch on the page below the player, or the page
// scrolling after it, dims the light to a quarter (DIMMED_STRENGTH 64 of 256) in 180 ms; while the page
// scrolls the player gets shorter and crops the video. When nothing has been touched for the Dim duration
// the light comes back over 1.6 s (RESTORE_DURATION_MS). Off: the light stays as it is. (Max, Nov 25: the
// story did not actually show scrolling; no sentences.)
SCN_HOLD.morphe_enhanced_ambient_mode_dim_while_scrolling = 3600;
scen("ambient", "enhanced_ambient_mode_dim_while_scrolling", (box, on) => {
  box.innerHTML = device("port", ambPage(true));
  const dev = box.querySelector(".dev"), lit = dev.querySelector(".aml7"), f = box.querySelector("#scFinger"), W = dev.clientWidth, H = dev.clientHeight;
  const pl = dev.querySelector(".apl7"), cn = dev.querySelector(".acn7"); pl.style.zIndex = 2; // the page scrolls under the player
  cn.insertAdjacentHTML("beforeend", row7(3, "Up next · Fjord drive") + row7(5, "Up next · Coffee jazz") + row7(0, "Up next · Cabin tour"));
  at(150, () => fingerTo(f, W * .55, H * .82));
  at(450, () => {
    f.classList.add("hold");
    if (on) { lit.style.transition = "opacity .18s linear"; lit.style.opacity = .2; } // the touch dims it
  });
  at(600, () => {
    // the finger pushes the page up: the rows scroll, the player gets shorter
    fingerTo(f, W * .55, H * .38, 750);
    // the rows that pass the player's bottom edge go out of sight there (clip-path follows the scroll)
    pl.style.transition = cn.style.transition = ["height", "transform", "clip-path"].map(x => `${x} ${750 * scStretch}ms cubic-bezier(.3,0,.3,1)`).join(",");
    cn.style.clipPath = "inset(0 0 0 0)"; void cn.offsetWidth;
    pl.style.height = "28px"; cn.style.transform = "translateY(-46px)"; cn.style.clipPath = "inset(46px 0 0 0)";
  });
  at(1350, () => { f.classList.remove("hold", "show"); cn.style.transition = ["transform", "clip-path"].map(x => `${x} ${500 * scStretch}ms cubic-bezier(.1,.6,.3,1)`).join(","); cn.style.transform = "translateY(-58px)"; cn.style.clipPath = "inset(58px 0 0 0)"; }); // a short fling after the lift
  at(2000, () => { if (on) { lit.style.transition = `opacity ${1600 * scStretch}ms ease`; lit.style.opacity = .8; } }); // nothing touched: the light comes back
  return "";
});
scen("ambient", "disable_fullscreen_ambient_mode", (box, on) => {
  situation("Ambient glow in fullscreen");
  box.innerHTML = device("land", `<div class="am7" style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,138,61,.8) 0%,rgba(226,69,111,.5) 35%,#000 68%);transition:opacity .5s"></div><div style="position:absolute;left:28%;right:28%;top:14%;bottom:14%;background:${AMB_ART};border-radius:2px"></div>`); // the film of the live preview
  const dev = box.querySelector(".dev");
  toast7(dev, on ? "Plain black around the video" : "Colours glow around the video", "86%");
  at(300, () => { if (on) dev.querySelector(".am7").style.opacity = 0; });
  return on ? "No ambient glow in fullscreen" : "Ambient glow in fullscreen too (stock)";
});
// Auto captions visibility (Max, Nov 23 PM): a video with auto-generated captions starts muted, then the
// sound comes on. The caption line shows in the part of the story the choice allows: always, never, only
// with sound, or only while muted.
// Morphe (AutoCaptionsPatch): two moments turn captions on by themselves: a video previewing muted in the
// feed, and a video starting with sound on the watch page. Each option picks which of the two may show
// them (Max, Nov 24: the old story played both on one video, as if unmuting were the trigger).
// "Always show" keeps YouTube's own (both); the CC button still works by hand in every case.
// Round 136 (Max: "the last two buttons I don't think it's what they do"), read again from AutoCaptionsPatch:
//   disableAutoCaptions: the caption track YouTube selects by itself when a video loads is kept only by
//     BOTH_ENABLED and WITH_VOLUME_ONLY ("Show when unmuted");
//   disableMuteAutoCaptions: YouTube's "captions when the phone's volume is at zero" feature stays on only
//     for BOTH_ENABLED and WITHOUT_VOLUME_ONLY ("Show when muted").
// So the two moments are one video: it starts with the volume up, then the phone's volume goes to zero.
// Two readouts under the video keep both answers on screen, so every option ends different.
// Round 137 (Max: hard to read): no small print. The two moments are two videos on one screen, each with a
// readout in the standard pill size (volume up / volume at zero) and its caption line drawn large or not at
// all; the second one lights up after the first, and both stay, so every option ends on its own picture.
SCN_HOLD.morphe_auto_captions_style = 2560; // 20% faster (Max, round 139)
scen("captions", "auto_captions_style", (box, v) => {
  situation("A video starts with sound, and with the phone's volume at zero");
  const show = muted => v === "BOTH_ENABLED" || (muted ? v === "WITHOUT_VOLUME_ONLY" : v === "WITH_VOLUME_ONLY");
  // one thing per spot: the volume readout top left; at the bottom either the caption line or a grey "Off"
  const vid = (id, art, muted, line) => `<div class="ac7" data-s="${id}" style="position:relative;min-height:0;border-radius:4px;background:${ART[art]};opacity:.3;transition:opacity .3s">
      <span class="badge7" style="left:3px;top:3px;display:inline-flex;flex-direction:row;align-items:center;gap:3px;white-space:nowrap">${ico7(muted ? "mute" : "vol", 6)}<span>${muted ? "Vol 0%" : "Vol 60%"}</span></span>
      <span class="cap7" style="position:absolute;left:50%;bottom:9px;translate:-50% 0;font-size:8.5px;line-height:1.35;font-weight:500;color:#fff;background:rgba(8,8,8,.85);padding:1px 5px;border-radius:2px;white-space:nowrap;opacity:0;transition:opacity .25s">${line}</span>
      <span class="badge7 cc7" style="left:50%;right:auto;top:auto;bottom:9px;translate:-50% 0;color:#aaa;opacity:0;transition:opacity .25s;display:inline-flex;flex-direction:row;align-items:center;gap:3px;white-space:nowrap">${ico7("cc", 6, "#aaa")}<span>Off</span></span></div>`;
  // the two videos share the phone's height, whatever size the phone is drawn at
  box.innerHTML = device("port", `<div class="pg7" style="position:absolute;inset:0;background:#0f0f0f;padding:6px;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:1fr 1fr;gap:5px;font-size:7px;color:#ddd">${vid("up", 3, false, "Hello again!") + vid("zero", 4, true, "Hello again!")}</div>`);
  const dev = box.querySelector(".dev");
  const play = (id, on) => { const e = dev.querySelector(`.ac7[data-s="${id}"]`); if (!e) return; e.style.opacity = 1; const c = e.querySelector(on ? ".cap7" : ".cc7"); c.style.opacity = 1; flash7(c); };
  at(60, () => play("up", show(false)));
  at(1120, () => play("zero", show(true)));
  return "";
});
scen("captions", "auto_translate_additional_languages", (box, on) => {
  situation("Auto-translate menu in captions");
  box.innerHTML = device("port", pageRows(player7(3) + `<div style="background:#212121;border-radius:5px;padding:4px;display:grid;gap:1.5px;font-size:8px;line-height:1.2"><b>Auto-translate</b>${["English", "German", "Spanish"].map(t => `<div>${t}</div>`).join("")}<div class="mo7" style="display:grid;gap:2px"></div></div>`));
  const dev = box.querySelector(".dev");
  at(700, () => { if (on) dev.querySelector(".mo7").innerHTML = ["Norwegian", "Icelandic", "Welsh", "Yoruba"].map(t => `<div style="color:#3ea6ff;animation:ghostin .3s">${t}</div>`).join(""); });
  return on ? "More languages in the auto-translate list" : "Only the default languages (stock)";
});
scen("captions", "fix_transcript", (box, on) => {
  situation("Opening the transcript");
  box.innerHTML = device("port", pageRows(player7(3) + `<b style="font-size:7px">Transcript</b><div class="tr7" style="display:grid;gap:3px;font-size:6px"></div>`));
  const dev = box.querySelector(".dev"), tr = dev.querySelector(".tr7");
  at(500, () => { tr.innerHTML = on ? ["0:00 Welcome back to the cabin", "0:04 Today: the roof", "0:09 First the beams"].map(t => `<div>${t}</div>`).join("") : `<div style="color:#aaa">Transcript unavailable</div>`; });
  return on ? "The transcript loads" : "The transcript fails to load on patched builds (stock)";
});
for (const [k, sit, html] of [
  ["hide_comments_live_chat_donators_bar", "Live chat", `<div style="display:flex;gap:3px">${[1, 3, 5].map(i => `<span style="padding:0 4px;border-radius:6px;background:${["#1e88e5", "#ffb300", "#e53935"][i % 3]};font-size:5.5px">€${i * 2}</span>`).join("")}</div>`],
  ["hide_comments_live_chat_scroll_to_bottom_button", "Scrolling up in live chat", `<div style="display:flex;justify-content:center"><span style="width:14px;height:14px;border-radius:50%;background:#3ea6ff;display:grid;place-items:center">${ico7("down", 9, "#000")}</span></div>`],
  ["hide_comments_live_chat_tooltips", "Live chat", `<div style="padding:3px 4px;border-radius:3px;background:#3ea6ff;color:#000;font-size:6px;line-height:1.25;width:max-content;max-width:100%">Subscribers-only chat</div>`],
  ["hide_comments_zero_state", "A video with no comments yet", `<div style="text-align:center;font-size:6px;color:#aaa;padding:6px">${ico7("comment", 12, "#aaa")}<div>No comments yet. Start the conversation</div></div>`]]) {
  const isChat = /live chat/i.test(sit);
  // a live chat ends in its input bar: the donators bar sits over the messages, the tooltip and the
  // scroll-to-bottom button over the input bar (Morphe: "tooltip popups shown near the chat input bar");
  // the empty state is the whole list, with no comment beside it
  const input = (t) => `<div style="display:flex;gap:3px;align-items:center"><div style="flex:1;min-width:0;height:10px;border-radius:5px;background:#272727;font-size:5.5px;line-height:10px;padding:0 4px;color:#aaa">${t}</div>${ico7("emoji", 7)}</div>`;
  const msgs = chat7([[1, "ola", "so pretty"], [2, "mia", "green!!"], [3, "ken", "😍"]]);
  hidePage("comments", k, sit, player7(5) + (isChat ? (/donators/.test(k) ? tgt7(html) + msgs : msgs + tgt7(html)) + input("Chat…")
    : top7("Comments", ["sort", "close"]) + tgt7(html) + (/zero_state/.test(k) ? input("Add a comment…") : cmt7(2, "Lovely build!"))));
}
hidePage("comments", "hide_comments_section_in_home_feed", "Home feed with inline comments", feed7(big7(3, "Building a tiny cabin") + tgt7(`<div style="padding:3px;border-radius:3px;background:#1b1b1b">${cmt7(2, "Lovely build!")}</div>`) + row7(4, "Night train to Bodø")));
scen("comments", "minimal_comments_button", (box, on) => {
  box.innerHTML = device("port", pageRows(player7(3) + `<b style="font-size:7px">Building a tiny cabin</b><div class="cb7${on ? " new7" : ""}" style="transition:all .3s;overflow:hidden;border-radius:5px;background:#272727;padding:${on ? "2px 6px" : "4px"};font-size:6px;${on ? "width:max-content" : ""}">${on ? `${ico7("comment", 7)} 341` : `<b>Comments 341</b>${cmt7(2, "Lovely build!")}`}</div>${row7(2, "Up next")}`));
  return on ? "A small comments button instead of the preview card" : "A large comments card with a preview (stock)";
});
scen("comments", "sanitize_comments_highlighted_search_links", (box, on) => {
  situation("A comment with a highlighted word");
  box.innerHTML = device("port", pageRows(top7("Comments", ["sort", "close"]) + cmt7(2, `Which <span class="hl7 chg7" style="color:#3ea6ff;white-space:nowrap">${I("search", "ico", 'style="width:6px;height:6px;fill:#3ea6ff;display:inline-block;vertical-align:-1px;margin-right:1px"')}wood stove</span> is that?`) + cmt7(3, "Subscribed for part 2")));
  const dev = box.querySelector(".dev");
  at(700, () => { if (!on) return; const h = dev.querySelector(".hl7"); h.innerHTML = "wood stove"; h.style.color = "inherit"; });
  return on ? "Words in comments are plain text, not search links" : "YouTube turns some words into search links (stock)";
});
scen("shorts", "disable_shorts_resuming_on_startup", (box, on) => {
  box.innerHTML = device("port", `<div style="position:absolute;inset:0;display:grid;place-items:center;background:#000"><div style="width:24px;height:17px;border-radius:5px;background:#ff0033;display:grid;place-items:center">${ico7("play", 10)}</div></div>`);
  const dev = box.querySelector(".dev");
  at(700, () => { dev.innerHTML = on ? pageRows(feed7(big7(3, "Building a tiny cabin") + row7(4, "Night train to Bodø"))) + nav7() : `<div style="position:absolute;inset:0;background:${ART[5]}"></div><div style="position:absolute;right:4px;bottom:20px;display:grid;gap:4px">${ico7("like", 10)}${ico7("comment", 10)}${ico7("share", 10)}</div>` + nav7(); });
  return ""; // no lines (Max, Nov 25): the phones show where the app opens
});
for (const [k, where, page] of [
  ["hide_shorts_channel", "A channel page", top7("Fjord & Timber", ["search", "more"]) + `<div style="display:flex;gap:6px;font-size:6px"><span>Videos</span><span>Live</span></div>`],
  ["hide_shorts_history", "History", top7("History", ["search", "more"])],
  ["hide_shorts_notifications", "Notifications", top7("Notifications", ["gear"])],
  ["hide_shorts_search", "Search results", search7("cabin", "")],
  ["hide_shorts_subscriptions", "Subscriptions", top7("Subscriptions", ["search"])]])
  hidePage("shorts", k, where, page + row7(2, "Building a tiny cabin") + tgt7(`<div><div style="display:flex;gap:3px;align-items:center;font-size:6.5px">${ico7("shorts", 8, "#ff0033")}<b>Shorts</b></div><div style="display:flex;gap:3px;margin-top:2px">${[5, 6, 7].map(i => `<div style="width:18px;height:30px;border-radius:2px;background:${ART[i]}"></div>`).join("")}</div></div>`) + row7(4, "Night train to Bodø"));
hidePage("shorts", "hide_shorts_video_description", "A Short", `<div style="position:absolute;inset:0;background:${ART[5]}"></div><div style="position:absolute;left:5px;bottom:8px;right:20px;font-size:6px;display:grid;gap:2px"><b>@fjordtimber</b>${tgt7("<div>Roof day! Part 4 of the cabin build #diy #cabin</div>")}</div>`, { raw: true });
hidePage("shorts", "hide_shorts_live_preview", "Shorts feed", `<div style="position:absolute;inset:0;background:${ART[5]}"></div>` + `<div class="tgt7" style="position:absolute;left:5px;top:10px;padding:2px 4px;border-radius:3px;background:#cc0000;font-size:6px">LIVE · Northern lights</div>`, { raw: true });
hidePage("shorts", "hide_shorts_search_suggestions", "A Short", `<div style="position:absolute;inset:0;background:${ART[5]}"></div><div style="position:absolute;left:5px;right:22px;bottom:8px;display:grid;gap:3px;justify-items:start;font-size:6px"><div class="tgt7" style="padding:2px 5px;border-radius:7px;background:rgba(0,0,0,.6);display:flex;gap:3px;align-items:center">${ico7("search", 7)}Search “cabin roof”</div><div style="display:flex;gap:3px;align-items:center"><span style="width:9px;height:9px;border-radius:50%;background:${AV[5 % AV.length]}"></span><b>@tinykitchen</b></div><div>Tiny pancakes for a tiny breakfast</div></div>`, { raw: true }); // a suggested action: the pill above the channel (ShortsFilter), not a bar at the top
scen("shorts", "shorts_autoplay_background", (box, on) => {
  situation("A Short ends while the app is in the background", true);
  box.innerHTML = device("port", `<div style="position:absolute;inset:0;background:#222;display:grid;place-items:center;font-size:6.5px;color:#aaa">Other app</div><div class="toastin" style="top:6px">${ico7("music", 7)} Playing: Short 1</div>`);
  const dev = box.querySelector(".dev");
  at(1000, () => { dev.querySelector(".toastin").innerHTML = on ? `${ico7("music", 7)} Playing: Short 2` : `${ico7("pause", 7)} Short 1 · ended`; });
  return on ? "The next Short plays in the background" : "Playback stops at the end of the Short (stock)";
});
scen("shorts", "shorts_disable_background_playback", (box, on) => {
  situation("Leaving the app during a Short", true);
  box.innerHTML = device("port", `<div style="position:absolute;inset:0;background:${ART[5]}"></div>`);
  const dev = box.querySelector(".dev");
  at(600, () => { dev.innerHTML = `<div style="position:absolute;inset:0;background:#222;display:grid;place-items:center;font-size:6.5px;color:#aaa">Home screen</div><div class="toastin" style="top:6px">${on ? `${ico7("pause", 7)} Short paused` : `${ico7("music", 7)} Short keeps playing`}</div>`; });
  return on ? "Shorts stop when you leave the app" : "Shorts keep playing in the background like videos (patched default)";
});
scen("shorts", "shorts_remember_playback_speed", (box, on) => {
  situation("Changing speed on a Short, then swiping"); // no blue line (Max, Nov 20)
  // the whole story: the Short plays at 1×, you set 1.5× on it (both phones), then swipe. The next
  // Short brings its own readout: still 1.5× when remembered, back to 1× when not.
  const sp = (t, cls = "") => `<div class="sp7 toastin ${cls}" style="top:8px">${t}</div>`;
  box.innerHTML = device("port", `<div class="sv7" style="position:absolute;inset:0;background:${ART[5]};transition:transform .4s var(--ease)">${sp("1×", "chg7")}</div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(400, () => { fingerTo(f, W * .5, 13); tapF(f); });
  at(700, () => { dev.querySelector(".sp7").textContent = "1.5×"; });
  at(880, () => f.classList.remove("show"));
  at(1700, () => fingerTo(f, W * .5, H * .7)); at(1900, () => { fingerTo(f, W * .5, H * .25, 400); swipeShort7(dev, ART[6], 400, sp(on ? "1.5×" : "1×")); });
  at(2400, () => { f.classList.remove("show"); flash7([...dev.querySelectorAll(".sp7")].pop()); });
  return on ? "The next Short keeps your speed" : "Every Short starts at normal speed (stock)";
});
scen("shorts", "skip_live_shorts", (box, on) => {
  situation("Swiping through Shorts");
  box.innerHTML = device("port", `<div class="sv7" style="position:absolute;inset:0;background:${ART[5]};transition:transform .4s var(--ease)"></div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  // the LIVE badge is part of the live Short: it slides in with it
  const live = `<span style="position:absolute;left:5px;top:8px;background:#cc0000;font-size:6px;padding:0 3px;border-radius:2px">LIVE</span>`;
  at(400, () => fingerTo(f, W * .5, H * .7)); at(600, () => { fingerTo(f, W * .5, H * .25, 400); swipeShort7(dev, on ? ART[6] : ART[0], 400, on ? "" : live); });
  at(1100, () => { f.classList.remove("show"); if (on) toast7(dev, "Live Short skipped", "50%"); });
  return on ? "Live streams in the Shorts feed are skipped" : "Live streams show up between Shorts (stock)";
});
// Morphe (QuickActionsMarginPatch): the quick actions container under the fullscreen seekbar gets a top
// margin of this many dp (Math.round(dp * density) px; 0 leaves YouTube's own). The row stays at the bottom
// of the screen, so the space opens above it: the seekbar and time go up. True to scale: the drawn phone is
// a landscape phone 412 dp tall (Realme GT 8 Pro), so a dp is its height / 412 px (Max, Nov 25: match the
// scale). The dp label sits on the row's line, right of the buttons, so it never crosses the seekbar.
// a phone's inner height, measured once per phone size: reading it from a phone just drawn laid the whole
// page out again at every value of a slider (Max, Nov 25: the wheel lagged)
const DEV_INNER = {};
const devInnerH = dev => DEV_INNER[dev.style.height + "/" + dev.className] ??= dev.clientHeight;
scen("watch", "quick_actions_top_margin", (box, v) => {
  // no blue or white lines (Max, Nov 25): the drawing and the dp labels say it
  const m = Number(v) || 0, live = scLive;
  const qa = ["like", "dislike", "comment", "save", "share", "plist"].map(n => `<span style="flex:none;display:grid;place-items:center;width:15px;height:10px;border-radius:5px;background:rgba(255,255,255,.16)">${ico7(n, 6, "#fff")}</span>`).join("");
  box.innerHTML = device("land", `<div style="position:absolute;inset:0;background:${ART[3]}"></div><div style="position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,.55))"></div>
    <div class="up7" style="position:absolute;left:8px;right:8px;bottom:19px"><b style="display:block;font-size:5.5px;margin-bottom:2px">21:40 / 41:05</b><div style="height:2px;border-radius:1px;background:rgba(255,255,255,.35)"><div style="width:52%;height:100%;background:#f00;border-radius:1px"></div></div></div>
    <div class="gap7" style="position:absolute;right:4px;bottom:19px;width:2px;height:0;border:solid #ffd21f;border-width:1px 0;background:linear-gradient(#ffd21f,#ffd21f) center/1px 100% no-repeat;box-sizing:border-box;opacity:0"></div>
    <div style="position:absolute;left:8px;right:8px;bottom:4px;display:flex;gap:3px">${qa}</div>`);
  const dev = box.querySelector(".dev"), up = dev.querySelector(".up7"), gap = dev.querySelector(".gap7");
  const k = devInnerH(dev) / 412, px = dp => dp * k;
  // the space at a size in dp, with the yellow measure beside it (only while there is a space)
  const set = dp => { up.style.translate = `0 -${px(dp)}px`; gap.style.height = px(dp) + "px"; gap.style.opacity = dp > .5 ? 1 : 0; };
  const label = () => { if (m) dev.insertAdjacentHTML("beforeend", `<b class="new7" style="position:absolute;right:4px;bottom:5px;font-size:5px;line-height:8px;color:#ffd21f">${m} dp</b>`); };
  // while the slider moves the space follows the finger, gliding on from where it is drawn right now (the
  // 24 dp example when the drag starts at the default); otherwise it opens on its side as you watch
  const g = liveGlide("morphe_quick_actions_top_margin", m);
  if (live) {
    set(m); label();
    if (g && Math.abs(g[0] - m) > .05) {
      const o = { duration: LIVE_GLIDE_MS, easing: LIVE_GLIDE_EASE };
      up.animate([{ translate: `0 -${px(g[0])}px` }, { translate: `0 -${px(m)}px` }], o);
      gap.animate([{ height: px(g[0]) + "px", opacity: g[0] > .5 ? 1 : 0 }, { height: px(m) + "px", opacity: m ? 1 : 0 }], o);
    }
  } else if (m) at(350, () => {
    const o = { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" };
    set(m); label();
    up.animate([{ translate: "0 0" }, { translate: `0 -${px(m)}px` }], o);
    gap.animate([{ height: "0px", opacity: 0 }, { height: px(m) + "px", opacity: 1 }], o);
  });
  return "";
});
scen("fullscreen", "swipe_ignore_when_locked", (box, on) => {
  situation("Swiping while the screen is locked"); // no blue line (Max, Nov 20)
  box.innerHTML = device("land", `<div style="position:absolute;inset:0;background:${ART[3]}"></div><div class="toastin" style="top:6px">${ico7("lock", 9)} Locked</div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(300, () => fingerTo(f, W * .82, H * .7)); at(500, () => fingerTo(f, W * .82, H * .3, 500));
  at(1100, () => { f.classList.remove("show"); if (on) { toast7(dev, "Ignored while locked", "50%"); } else dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:40%">${ico7("vol", 11)} 80%</div>`); });
  return on ? "Swipe gestures do nothing while locked" : "Swipes still change volume when locked (stock)";
});
scen("fullscreen", "swipe_lowest_value_enable_auto_brightness", (box, on) => {
  situation("Swiping brightness all the way down");
  box.innerHTML = device("land", `<div class="br7" style="position:absolute;inset:0;background:${ART[3]};transition:filter .6s"></div>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(300, () => fingerTo(f, W * .18, H * .3)); at(500, () => { fingerTo(f, W * .18, H * .85, 700); dev.querySelector(".br7").style.filter = "brightness(.35)"; });
  at(1300, () => { f.classList.remove("show"); dev.insertAdjacentHTML("beforeend", `<div class="toastin" style="top:40%">${ico7("bright", 8)} ${on ? "Auto" : "0%"}</div>`); if (on) dev.querySelector(".br7").style.filter = "brightness(.8)"; });
  return on ? "Below the lowest level, brightness switches to automatic" : "It stays at the lowest level (stock)";
});
scen("fullscreen", "swipe_save_and_restore_brightness", (box, on) => {
  situation("Leaving fullscreen after dimming the video"); // no blue line (Max, Nov 20)
  box.innerHTML = device("land", `<div class="br7" style="position:absolute;inset:0;background:${ART[3]};filter:brightness(.45)"></div>`);
  const dev = box.querySelector(".dev");
  at(600, () => { rotate(dev, "port"); dev.innerHTML = pageRows(player7(3) + row7(2, "") + row7(4, "")); dev.querySelector(".pg7").style.filter = on ? "none" : "brightness(.45)"; toast7(dev, on ? "Bright again" : "Still dimmed", "72%"); }); // short words, no row titles: these turned phones are small and the pill covered them
  return on ? "Brightness goes back to your system level outside fullscreen" : "The swipe brightness stays everywhere (stock)";
});
// ---------- Playback
const watch7 = (inner = "") => pageRows(player7(3, inner) + `<b style="font-size:7px">Building a tiny cabin</b>` + row7(2, "Up next · Night train") + row7(4, "Up next · Lo-fi beats"));
scen("playback", "autoplay_control", (box, on) => {
  situation("A video ends");
  box.innerHTML = device("port", watch7(`<div class="ap7" style="position:absolute;right:3px;top:3px;display:flex;gap:2px;align-items:center;font-size:5.5px">${on ? `<span class="new7" style="padding:0 3px;border-radius:5px;background:rgba(0,0,0,.6)">${ico7("play", 6)} Auto</span>` : ""}</div>`));
  const dev = box.querySelector(".dev");
  toast7(dev, on ? "Autoplay follows your rule: next in playlist only" : "Next video starts automatically", "86%");
  return on ? "A player button and a rule decide what plays next" : "YouTube decides (stock)";
});
scen("playback", "disable_playlist_autoplay", (box, on) => {
  situation("End of a video in a playlist");
  box.innerHTML = device("port", pageRows(player7(3, `<span class="cd7 toastin" style="top:50%;translate:0 -50%;white-space:nowrap">Next in 5</span>`) + `<b class="pl8" style="font-size:6.5px">Road trip mix · 2 / 12</b>` + row7(2, "Night train") + row7(4, "Lo-fi beats")));
  const dev = box.querySelector(".dev"), cd = dev.querySelector(".cd7");
  // every second shows, down to 1, 10% quicker than one step per 300 ms (Max, Nov 23)
  [4, 3, 2, 1].forEach((n, i) => at(360 + i * 270, () => { cd.textContent = "Next in " + n; }));
  at(1440, () => { cd.innerHTML = on ? `${ico7("pause", 7)} Stopped` : `${ico7("play", 7)} Playing 3 / 12`; if (!on) dev.querySelector(".pl8").textContent = "Road trip mix · 3 / 12"; });
  return on ? "Playlists stop after each video" : "Playlists play on (stock)";
});
// Two acts (playlist, then live stream), stock and patched side by side whatever the switch is set to.
// Stock: the panel jumps up on its own and buries the page. On: it waits as a small bar until tapped.
SCN_HOLD.morphe_disable_player_popup_panels = 8400;
scen("playback", "disable_player_popup_panels", (box) => {
  situation("1 · You open a video from a playlist"); // no blue line (Max, Nov 20)
  const desc = `<div class="ds7" style="display:grid;gap:3px"><b style="font-size:7px" class="tt7">Night train to Bodø</b><div style="display:flex;gap:3px">${chip7("Like")}${chip7("Share")}${chip7("Save")}</div><div style="font-size:6px;color:#aaa">Comments 312</div>${chat7([[1, "ola", "this view!"], [2, "mia", "take me there"], [3, "ken", "pure calm"]])}</div>`;
  const feed = `<div class="fd7" style="display:grid;gap:5px">${top7()}${row7(2, "Road trip mix", "", "Playlist · 12 videos")}${row7(4, "Lo-fi beats")}${row7(1, "Northern lights LIVE", `<span style="position:absolute;left:1px;bottom:1px;font-size:4.5px;background:#f03;padding:0 2px;border-radius:2px">LIVE</span>`, "1.2K watching")}${row7(5, "Cabin build")}</div>`;
  const sides = duoValues("morphe_disable_player_popup_panels");
  box.innerHTML = duo7(pageRows(feed), pageRows(feed), sides);
  const bar = (label) => `<div class="pb7" style="position:absolute;left:4px;right:4px;bottom:4px;height:15px;border-radius:4px;background:#272727;display:flex;align-items:center;gap:3px;padding:0 5px;font-size:6px;z-index:3;animation:sheetup .3s var(--ease)">${ico7(label[0], 7)}<span style="flex:1;white-space:nowrap;overflow:hidden">${label[1]}</span>${ico7("expand", 7)}</div>`;
  const panel = (title, rows) => `<div class="pp7" style="position:absolute;left:0;right:0;top:52px;bottom:0;background:#1b1b1b;border-radius:5px 5px 0 0;padding:5px;display:grid;gap:3px;align-content:start;font-size:6px;animation:sheetup .35s var(--ease);z-index:4"><div style="width:16px;height:2px;border-radius:1px;background:#555;justify-self:center"></div><b style="font-size:6.5px">${title}</b>${rows}</div>`;
  const story = (dev, on) => {
    const pg = dev.querySelector(".pg7"), f = dev.querySelector(".finger"), W = dev.clientWidth, H = dev.clientHeight;
    const openWatch = (art, live) => { pg.innerHTML = player7(art, live ? `<span style="position:absolute;left:3px;top:3px;font-size:5px;background:#f03;padding:0 3px;border-radius:2px">LIVE</span>` : "") + desc; if (live) pg.querySelector(".tt7").textContent = "Northern lights · live"; };
    const popAct = (t0, label, title, rows) => {
      at(t0, () => dev.insertAdjacentHTML("beforeend", bar(label)));
      if (!on) {
        // the bar buzzes with a spark, jumps open by itself, and a red frame marks the page it now covers
        at(t0 + 700, () => { const b = dev.querySelector(".pb7"); b.insertAdjacentHTML("beforeend", `<span style="position:absolute;left:50%;top:-10px;translate:-50% 0;animation:pop .2s">${ico7("spark", 9, "#ffcc00")}</span>`); b.style.animation = "buzz .25s 3"; });
        at(t0 + 1250, () => { dev.querySelectorAll(".pb7").forEach(e => e.remove()); dev.insertAdjacentHTML("beforeend", panel(title, rows)); });
        at(t0 + 1750, () => { dev.insertAdjacentHTML("beforeend", `<div class="cv7" style="position:absolute;left:3px;right:3px;top:54px;bottom:3px;border:1.5px dashed #ff0033;border-radius:5px;z-index:5;animation:ghostin .2s"></div>`); toast7(dev, `${ico7("spark", 7, "#ffcc00")} Opened by itself`, "13%"); });
      } else {
        // the bar stays put with a lock; only the finger's tap opens it
        at(t0 + 700, () => { const b = dev.querySelector(".pb7"); b.style.boxShadow = "0 0 0 1.5px #4caf50"; b.insertAdjacentHTML("beforeend", `<span style="position:absolute;right:-3px;top:-6px;width:11px;height:11px;border-radius:50%;background:#4caf50;display:grid;place-items:center;animation:pop .2s">${ico7("lock", 7, "#000")}</span>`); toast7(dev, "Stays a small bar", "13%"); });
        at(t0 + 1500, () => { dev.querySelectorAll(".t7").forEach(e => e.remove()); fingerTo(f, W * .5, H - 12, 0); f.style.opacity = 0; requestAnimationFrame(() => { f.style.opacity = ""; fingerTo(f, W * .5, H - 12); }); });
        at(t0 + 1900, () => tapF(f));
        at(t0 + 2100, () => { f.classList.remove("show"); dev.querySelectorAll(".pb7").forEach(e => e.remove()); dev.insertAdjacentHTML("beforeend", panel(title, rows)); toast7(dev, `${ico7("toggle", 7, "#4caf50")} Opens on your tap`, "13%"); });
      }
    };
    at(350, () => fingerTo(f, W * .35, 36)); at(800, () => tapF(f));
    at(1050, () => { f.classList.remove("show"); openWatch(2, false); });
    popAct(1250, ["plist", "Playlist · 2 / 12"], "Road trip mix · 2 / 12", [1, 2, 4, 5].map(i => row7(i, "Video " + i)).join(""));
    at(4400, () => { dev.querySelectorAll(".pp7,.pb7,.cv7,.t7").forEach(e => e.remove()); pg.innerHTML = feed; });
    at(4600, () => fingerTo(f, W * .35, 78)); at(5000, () => tapF(f));
    at(5250, () => { f.classList.remove("show"); openWatch(1, true); });
    popAct(5450, ["chat", "Live chat"], "Live chat", chat7([[1, "ola", "so pretty"], [2, "mia", "green!!"], [3, "ken", "😍"], [4, "liv", "where is this?"], [5, "bo", "hi from Oslo"]]));
  };
  const [left, right] = box.querySelectorAll(".dev");
  story(left, sides[0][0]); story(right, sides[1][0]);
  at(4400, () => situation("2 · Then you open a live stream"));
  return `Stock panels jump open; set to ${sides.find(x => x[0] === true)[1]} they wait for your tap`;
});
// A long session with nobody touching the phone, shown as a run of videos with a clock.
SCN_HOLD.morphe_continue_watching_prompt = 5200;
scen("playback", "continue_watching_prompt", (box, v) => {
  situation("Autoplay runs for hours, nobody touches the phone"); // no blue line (Max, Nov 20)
  const vids = [[3, "Building a tiny cabin"], [2, "Night train to Bodø"], [4, "Lo-fi beats to relax"], [5, "Rain on a tin roof"]];
  box.innerHTML = device("port", pageRows(player7(3, `<span class="tm7" style="position:absolute;left:3px;bottom:3px;font-size:5.5px;background:rgba(0,0,0,.6);padding:0 3px;border-radius:3px">0:58</span><span class="pz7" style="position:absolute;left:0;bottom:0;height:2px;background:#f03;width:0"></span>`) + `<b class="tt7" style="font-size:7px">Building a tiny cabin</b><div class="run7" style="display:flex;gap:2px;align-items:center;font-size:5.5px;color:#aaa;white-space:nowrap;overflow:hidden">${ico7("clock", 7, "#aaa")}<span class="hrs7">0 h idle</span></div>` + row7(2, "Up next · Night train") + row7(4, "Up next · Lo-fi beats")));
  const dev = box.querySelector(".dev"), pv = dev.querySelector(".pg7 > div"), pz = dev.querySelector(".pz7"), hrs = dev.querySelector(".hrs7"), run = dev.querySelector(".run7");
  const play = (i, ms) => { const [art, t] = vids[i]; pv.style.background = ART[art]; dev.querySelector(".tt7").textContent = t; hrs.textContent = `${i + 1} h idle`; run.insertAdjacentHTML("beforeend", `<span style="width:7px;height:4px;border-radius:1px;background:${ART[art]};animation:pop .2s"></span>`); pz.style.transition = "none"; pz.style.width = "0"; void pz.offsetWidth; pz.style.transition = `width ${ms}ms linear`; pz.style.width = "100%"; };
  const prompt = (ghost) => `<div class="pr7" style="position:absolute;left:8px;right:8px;top:62%;background:#212121;border-radius:6px;padding:5px;font-size:6.5px;display:grid;gap:4px;z-index:5;animation:pop .25s;${ghost ? "color:#999;filter:grayscale(1);outline:1.5px dashed #888;outline-offset:1px" : ""}"><b>Video paused. Continue watching?</b><div style="text-align:right;color:#3ea6ff">Yes</div></div>`;
  play(0, 700);
  if (v === "DEFAULT") {
    at(800, () => play(1, 700));
    at(1600, () => { pz.style.transition = "none"; pz.style.width = "40%"; pv.style.filter = "brightness(.45)"; pv.insertAdjacentHTML("beforeend", `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">${ico7("pause", 14)}</span>`); dev.insertAdjacentHTML("beforeend", prompt(false)); });
    at(2500, () => { hrs.textContent = "Paused"; run.style.color = "#ff6b6b"; });
    at(3200, () => toast7(dev, "Playback waits for you", "86%"));
  } else if (v === "DISABLED") {
    // the stock prompt tries to appear, gets crossed out, and the run of videos simply continues
    at(800, () => play(1, 700));
    at(1550, () => { dev.insertAdjacentHTML("beforeend", prompt(true)); });
    at(1850, () => x7(dev, dev.querySelector(".pr7")));
    at(2300, () => { dev.querySelectorAll(".pr7,.x7").forEach(e => { e.style.transition = "opacity .25s"; e.style.opacity = 0; }); play(2, 900); });
    at(2650, () => dev.querySelectorAll(".pr7,.x7").forEach(e => e.remove()));
    at(3250, () => play(3, 900));
    at(3500, () => { check7(dev, "Keeps playing"); dev.querySelector(".check7").style.top = "70%"; });
  } else {
    // no pause prompt; every handover shows the autoplay countdown first
    const cd = (t0, next) => {
      at(t0, () => { pz.style.transition = "none"; pz.style.width = "100%"; dev.insertAdjacentHTML("beforeend", `<div class="cd7" style="position:absolute;left:6px;right:6px;top:12px;background:rgba(0,0,0,.8);border-radius:5px;padding:4px;font-size:6px;z-index:5;display:flex;gap:4px;align-items:center;animation:pop .25s"><span class="rg7" style="width:12px;height:12px;border-radius:50%;border:1.5px solid #fff;display:grid;place-items:center;font-size:6px;font-weight:700">5</span><span style="flex:1">Up next</span><span style="color:#3ea6ff">Cancel</span></div>`); });
      [4, 3, 2, 1].forEach((n, i) => at(t0 + 150 + i * 150, () => { const r = dev.querySelector(".rg7"); if (r) r.textContent = n; }));
      at(t0 + 800, () => { dev.querySelectorAll(".cd7").forEach(e => e.remove()); play(next, 800); });
    };
    cd(800, 1); cd(2400, 2);
    at(4000, () => { check7(dev, "Never pauses"); dev.querySelector(".check7").style.top = "70%"; });
  }
  return v === "DEFAULT" ? "YouTube pauses and asks 'Continue watching?' (stock)" : v === "ALWAYS_COUNTDOWN" ? "No pause prompt; the autoplay countdown shows before every next video" : "No prompt at all: playback just keeps going";
});
scen("playback", "do_not_remember_loop_video", (box, on) => {
  situation("Loop was on, then you open the next video", true);
  box.innerHTML = device("port", watch7(`<span class="lp7" style="position:absolute;right:3px;top:3px;width:12px;height:12px;border-radius:50%;background:rgba(62,166,255,.9);display:grid;place-items:center">${ico7("loop", 8, "#000")}</span>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth, H = dev.clientHeight;
  at(300, () => fingerTo(f, W * .5, H * .45)); at(600, () => tapF(f));
  // the next video fades in (it used to replace the picture in one frame)
  at(850, () => { f.classList.remove("show"); const v = dev.querySelector(".pg7 > div"); v.style.background = ART[2]; v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "cubic-bezier(.4,0,.2,1)" }); const l = dev.querySelector(".lp7"); if (on) l.style.background = "rgba(0,0,0,.5)"; toast7(dev, on ? "Loop is off again" : "Still looping", "80%"); });
  return on ? "Loop switches off for each new video" : "Loop stays on for the next videos (stock)";
});
// Morphe (ForceFullscreenLandscapePatch): on tablets and other large screens only (phones already open
// fullscreen in landscape), entering fullscreen turns the screen to landscape, and leaving it brings back
// the orientation it had before. Stock: a tablet held upright stays upright, the video letterboxed.
scen("fullscreen", "force_fullscreen_landscape", (box, on) => {
  situation("A tablet held upright: tapping fullscreen", true);
  box.innerHTML = device("port", playerArea(3));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"); const W = dev.clientWidth;
  at(300, () => fingerTo(f, W - 10, 44)); at(600, () => tapF(f));
  at(850, () => {
    f.classList.remove("show");
    if (on) turnTo(dev, "land", miniVideo(3));
    else devContent(dev, `<div style="position:absolute;inset:0;background:#000"></div><div style="position:absolute;left:0;right:0;top:50%;height:30%;translate:0 -50%;background:${ART[3]}"></div>`);
  });
  return on ? "Fullscreen turns the tablet's screen to landscape" : "Fullscreen stays upright: the video is letterboxed (stock)";
});
// Morphe (FullscreenPlaylistPanelPatch): on tablets, opening the playlist panel in fullscreen keeps
// fullscreen and shows the panel over the player. Stock: opening it leaves fullscreen first.
scen("fullscreen", "fullscreen_playlist_panel", (box, on) => {
  situation("A tablet in fullscreen: opening the playlist", true);
  const list = `<b style="font-size:6px">Road trip mix · 2 / 12</b>${[1, 2, 4, 5].map(i => `<div style="display:flex;gap:3px;align-items:center;font-size:5.5px"><span style="width:16px;height:9px;flex:none;background:${ART[i]}"></span>Video ${i}</div>`).join("")}`;
  box.innerHTML = device("land", `<div class="pv7" style="position:absolute;left:0;top:0;width:100%;height:100%;background:${ART[3]};transition:all .45s var(--ease)"></div><span style="position:absolute;right:6px;top:5px;z-index:2">${ico7("plist", 9)}</span>`);
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), pv = dev.querySelector(".pv7"); const W = dev.clientWidth;
  at(300, () => fingerTo(f, W - 9, 9)); at(600, () => tapF(f));
  at(850, () => {
    f.classList.remove("show");
    if (on) dev.insertAdjacentHTML("beforeend", `<div style="position:absolute;right:0;top:0;bottom:0;width:40%;background:rgba(15,15,15,.92);padding:5px;display:grid;gap:3px;align-content:start;z-index:3;animation:slidein7 .35s var(--ease)">${list}</div>`);
    else {
      // out of fullscreen: the watch page, video top left, the playlist beside it
      Object.assign(pv.style, { width: "58%", height: "60%", left: "4px", top: "4px", borderRadius: "3px" });
      later(() => { dev.insertAdjacentHTML("beforeend", `<div style="position:absolute;left:4px;top:calc(60% + 8px);font-size:6px"><b>Building a tiny cabin</b></div><div style="position:absolute;right:4px;top:4px;bottom:4px;width:36%;background:#1b1b1b;border-radius:3px;padding:4px;display:grid;gap:3px;align-content:start;animation:ghostin .3s">${list}</div>`); toast7(dev, "Left fullscreen", "84%"); }, 300);
    }
  });
  return on ? "The playlist opens over the fullscreen video" : "Opening the playlist leaves fullscreen (stock)";
});
// Chapters (the chip after the time) is drawn on Seekbar & gestures and Live chat replay (a fullscreen
// player button) on Fullscreen. Ask Gemini and Sync to video time live in panels no preview draws:
// the 'Ask about this video' panel (DescriptionComponentsFilter: the Gemini button in chat_footer) and
// the transcript, whose 'Sync to video time' button comes back after you scroll away from the playing line.
const panel7 = (title, body) => player7(3) + `<div style="margin:0 -6px -6px;background:#212121;border-radius:6px 6px 0 0;padding:5px;display:grid;gap:4px;font-size:6px"><div style="display:flex;align-items:center"><b style="flex:1;font-size:6.5px">${title}</b>${ico7("close", 7)}</div>${body}</div>`;
hidePage("description", "hide_ask_gemini_button", "", panel7("Ask about this video", `<div style="padding:3px 4px;border-radius:5px;background:#2c2c2c;line-height:1.3">This video shows a tiny cabin being built over one summer.</div>
  <div style="display:flex;gap:3px;flex-wrap:wrap">${chip7("Summarize")}${chip7("Tools used")}</div>
  <div style="display:flex;gap:3px;align-items:center"><span style="flex:1;padding:2px 4px;border-radius:6px;background:#2c2c2c;color:#aaa">Ask a question…</span></div>
  ${tgt7(`<div style="display:flex;gap:3px;align-items:center;justify-content:center;padding:2px;border-radius:6px;border:1px solid #444">${ico7("spark", 6)}Ask Gemini</div>`)}`));
hidePage("captions", "hide_sync_button", "", panel7("Transcript", ["0:12 · Today we start the roof", "0:31 · First the rafters go up", "0:48 · Then the boards, one by one", "1:05 · Time for the shingles"].map((t, n) => `<div style="color:${n === 1 ? "#fff" : "#aaa"}">${t}</div>`).join("") + tgt7(`<div style="justify-self:center;padding:2px 6px;border-radius:8px;background:#f1f1f1;color:#0f0f0f;width:max-content;margin:0 auto">Sync to video time</div>`)));
hidePage("comments", "hide_subscribers_community_guidelines", "Before posting in a channel's community", top7("Fjord & Timber", ["more"]) + tgt7(`<div style="padding:3px;border-radius:3px;background:#1b1b1b;font-size:6px">Please follow the community guidelines · Got it</div>`) + cmt7(2, "Love the roof!"));
hidePage("seekbar", "hide_tap_and_hold_gradient", "Holding the video for 2× speed", `<div style="position:absolute;inset:0;background:${ART[3]}"></div><div class="tgt7 fade7" style="position:absolute;left:0;right:0;top:0;bottom:60%;background:linear-gradient(rgba(0,0,0,.75),transparent)"></div><div class="toastin" style="top:6px;z-index:2">2× ▶▶</div>`, { dev: "land", raw: true });
// Morphe (OnTheGoSheet): the player menu's On-the-go opens Morphe's own panel right under the video:
// a handle, "On-the-go" and ✕, the thumbnail, title and channel, a time bar, big previous / −10 /
// play-pause / +10 / next buttons, then audio mode (headset) and speed. Audio mode slides the panel up
// over the video. Stock: On-the-go is a Premium feature, so the item opens YouTube's Premium offer.
P.seekb = "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z";
P.seekf = "M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z";
P.headset = "M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h3v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h3a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z";
P.copy = "M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z";
const seek7 = (dir, sz) => `<span style="position:relative;display:grid;place-items:center;width:${sz}px;height:${sz}px">${ico7(dir, sz)}<b style="position:absolute;left:50%;top:58%;transform:translate(-50%,-50%);font-size:${(sz * .3).toFixed(1)}px">10</b></span>`;
SCN_HOLD.morphe_on_the_go = 5600;
scen("playback", "on_the_go", (box, on) => {
  situation("Player menu › On-the-go");
  box.innerHTML = device("port", watch7(`<span style="position:absolute;right:3px;top:3px">${ico7("gear", 9)}</span>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), W = dev.clientWidth, H = dev.clientHeight;
  const menu = `<div class="fm7" style="position:absolute;left:0;right:0;bottom:0;background:#212121;border-radius:6px 6px 0 0;padding:6px 7px;display:grid;gap:6px;font-size:7.5px;z-index:4;animation:sheetup .25s var(--ease)">${item7("tune", "Quality")}${item7("speed", "Playback speed")}${item7("gesture", "On-the-go", "og7")}${item7("cc", "Captions")}</div>`;
  at(300, () => fingerTo(f, W - 7, 7)); at(600, () => tapF(f));
  at(800, () => { f.classList.remove("show"); dev.insertAdjacentHTML("beforeend", menu); });
  at(1150, () => fingerTo(f, 30, H - 33)); at(1450, () => { tapF(f); const o = dev.querySelector(".og7"); if (o) o.style.background = "rgba(255,255,255,.12)"; });
  if (!on) {
    at(1700, () => {
      f.classList.remove("show"); dev.querySelector(".fm7")?.remove();
      dev.insertAdjacentHTML("beforeend", `<div style="position:absolute;left:0;right:0;bottom:0;background:#212121;border-radius:6px 6px 0 0;padding:8px 7px;display:grid;gap:5px;justify-items:center;text-align:center;z-index:4;animation:sheetup .3s var(--ease)"><b style="font-size:8.5px"><span style="color:#ff0033">▶</span> Premium</b><div style="font-size:7px;color:#ccc">On-the-go is part of YouTube Premium</div><span style="font-size:7px;font-weight:600;background:#3ea6ff;color:#000;border-radius:8px;padding:2px 9px">Try it free</span></div>`);
    });
    return "A Premium offer opens instead (stock)";
  }
  const pnl = `<div class="og8" style="position:absolute;left:0;right:0;top:46px;bottom:0;background:#212121;border-radius:6px 6px 0 0;padding:3px 7px 6px;display:flex;flex-direction:column;gap:3px;z-index:4;transition:top .4s var(--ease);animation:sheetup .3s var(--ease)">
    <i style="width:14px;height:2px;border-radius:1px;background:#666;align-self:center"></i>
    <div style="display:flex;align-items:center"><b style="flex:1;font-size:8.5px">On-the-go</b>${ico7("close", 8)}</div>
    <i style="height:1px;background:#3a3a3a;margin:0 -7px"></i>
    <div class="th8" style="height:22px;border-radius:3px;background:${ART[3]};flex:none;transition:height .4s var(--ease)"></div>
    <div><b style="font-size:7.5px">Building a tiny cabin</b><div style="font-size:6px;color:#aaa">Fjord &amp; Timber</div></div>
    <div style="margin-top:auto;font-size:6px">3:12 / 18:42</div>
    <div style="position:relative;height:2px;border-radius:1px;background:#555"><i style="position:absolute;left:0;top:0;bottom:0;width:17%;background:#ff0033"></i><i style="position:absolute;left:17%;top:50%;width:5px;height:5px;border-radius:50%;background:#ff0033;transform:translate(-50%,-50%)"></i></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:3px">${ico7("prev", 9)}${seek7("seekb", 11)}<span class="pp8" style="width:21px;height:21px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center">${ico7("pause", 11)}</span>${seek7("seekf", 11)}${ico7("next", 9)}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px">${ico7("dl", 8)}<span class="am8 chg7">${ico7("headset", 8)}</span><b style="font-size:7px">1×</b>${ico7("queue", 8)}</div>
  </div>`;
  at(1700, () => { f.classList.remove("show"); dev.querySelector(".fm7")?.remove(); dev.insertAdjacentHTML("beforeend", pnl); toast7(dev, "Big controls under the video", "6%"); });
  // the big play button
  at(2700, () => { dev.querySelectorAll(".t7").forEach(e => e.remove()); fingerTo(f, W / 2, H - 31); }); at(3000, () => { tapF(f); const b = dev.querySelector(".pp8"); if (b) b.innerHTML = ico7("play", 11); });
  // audio mode: the panel covers the video and the thumbnail takes its place
  at(3500, () => fingerTo(f, W / 2 - 8, H - 12)); at(3800, () => { tapF(f); const pn = dev.querySelector(".og8"); if (!pn) return; pn.style.top = "0px"; pn.querySelector(".th8").style.height = "46px"; pn.querySelector(".am8").innerHTML = ico7("tv", 8); });
  at(4100, () => { f.classList.remove("show"); toast7(dev, `${ico7("headset", 7)} Audio mode`, "40%"); });
  return "Morphe's panel";
});
// Sanitize video subtitle: no animation (Max, 2026-11-19)
// Morphe's download item in the ⋮ menu of a video in the feed
const dlMenu7 = (icon, text) => `<div style="background:#212121;border-radius:6px 6px 0 0;padding:4px;display:grid;gap:1px">${item7("plist", "Save to playlist")}${tgt7(item7(icon, text))}${item7("share", "Share")}</div>`;
hidePage("feed", "feed_download_flyout_button", "", feed7(big7(3, "Building a tiny cabin")) + `<div style="margin:0 -6px -6px">${dlMenu7("dl", "Download with your app")}</div>`, { invert: true });
// Download in Shorts menu: the live Shorts menu sheet shows it (scenarios.js SHORTS_SHEET), as on the phone
scen("miniplayer", "seek_notification_media_prev_next", (box, on) => {
  box.innerHTML = device("port", `<div style="position:absolute;inset:0;background:#1b1b1b"></div><div style="position:absolute;left:4px;right:4px;top:10px;padding:4px;border-radius:6px;background:#2a2a2a;font-size:6px;display:grid;gap:3px"><b>Building a tiny cabin</b><div style="display:flex;justify-content:space-around" class="nb7"></div></div>`);
  const dev = box.querySelector(".dev");
  at(300, () => { dev.querySelector(".nb7").innerHTML = (on ? ["prev", "pause", "next"] : ["prev", "pause", "next"]).map((n, i) => `<span style="display:grid;justify-items:center;font-size:5px">${ico7(n, 9)}${on && i !== 1 ? (i ? "+10 s" : "−10 s") : ""}</span>`).join(""); });
  return on ? "Previous and next seek back and forward instead" : "Previous and next change the video (stock)";
});
// Morphe: YouTube leaves 1440p and 4K out of the download qualities when it decides this device can't
// play them; the setting offers them anyway (nothing to do with Premium: Max, Nov 24)
scen("playback", "download_force_4k", (box, on) => {
  situation("Downloading on a phone YouTube rates below 4K");
  const q = t => `<div>${t}</div>`, extra = t => `<div class="new7" style="color:#3ea6ff">${t}</div>`;
  box.innerHTML = device("port", pageRows(player7(3) + `<div style="background:#212121;border-radius:5px;padding:4px;display:grid;gap:2px;font-size:6.5px"><b>Download quality</b>${q("360p")}${q("720p")}${q("1080p")}${on ? extra("1440p") + extra("2160p (4K)") : `<div style="color:#777">1440p and 4K not offered</div>`}</div>`));
  return "";
});
// Morphe (LiveChatTranslatePatch): a row becomes "author original (translation)" (or the translation
// only, or the translation first, per the style setting); the translation takes the custom colour
// (#38BDF8 unless changed) and can be bold; an optional copy icon at the end copies the message.
// One chat, drawn large, shared by the translation setting and its sub-settings.
// short lines: with its translation each message has to fit the phone (the last one ran out of it)
const LC_MSGS = [[1, "yuki", "綺麗！", "Pretty!"], [2, "lars", "Så fint!", "So nice!"], [3, "ana", "¡Qué bonito!", "Lovely!"]];
const cssColor = c => { c = String(c || ""); return /^#[0-9a-f]{8}$/i.test(c) ? "#" + c.slice(3) + c.slice(1, 3) : c; };
function lcChat(o = {}) {
  const tr = !!o.tr, bold = o.bold ?? !!V("morphe_live_chat_translate_bold"), copy = o.copy ?? !!V("morphe_live_chat_translate_copy_button");
  const color = (o.color ?? !!V("morphe_live_chat_translate_use_color")) ? cssColor(V("morphe_live_chat_translate_color") || "#38BDF8") : "";
  const style = String(V("morphe_live_chat_translate_style") || "ORIGINAL_AND_TRANSLATED");
  return `<div class="lc7" style="display:grid;gap:6px">${LC_MSGS.map(([c, n, orig, t]) => {
    const tt = `<span class="lt8" style="${color ? `color:${color};` : ""}${bold ? "font-weight:700;" : ""}">${style === "TRANSLATED_ONLY" ? t : `(${t})`}</span>`;
    const msg = !tr ? orig : style === "TRANSLATED_ONLY" ? tt : style === "TRANSLATED_AND_ORIGINAL" ? `${tt} ${orig}` : `${orig} ${tt}`;
    return `<div style="display:flex;gap:4px;font-size:8px;line-height:1.35"><span style="width:10px;height:10px;border-radius:50%;background:${AV[c]};flex:none"></span><span><b style="color:#aaa;font-weight:500">${n}</b> ${msg}${tr && copy ? ` <span class="cp8" style="display:inline-grid;vertical-align:-1px">${ico7("copy", 8, "#aaa")}</span>` : ""}</span></div>`;
  }).join("")}</div>`;
}
const lcPage = chat => device("port", pageRows(player7(5, `<span style="position:absolute;left:3px;top:3px;font-size:5px;background:#f03;padding:0 3px;border-radius:2px">LIVE</span>`) + `<b style="font-size:7.5px">Live chat</b>` + chat));
scen("comments", "live_chat_translate", (box, on) => {
  situation("Live chat in other languages");
  box.innerHTML = lcPage(lcChat());
  const dev = box.querySelector(".dev");
  at(800, () => { if (!on) return; const c = dev.querySelector(".lc7"); c.outerHTML = lcChat({ tr: true }); dev.querySelector(".lc7").animate([{ opacity: .3 }, { opacity: 1 }], { duration: 300 }); });
  return ""; // the chat with and without its translations says it
});
scen("comments", "live_chat_translate_bold", (box, on) => {
  // drawn with its weight from the first frame (it used to turn bold 0.7 s in, which read as lag)
  box.innerHTML = lcPage(lcChat({ tr: true, bold: on }));
  const dev = box.querySelector(".dev");
  at(150, () => { if (on) dev.querySelectorAll(".lt8").forEach(e => e.animate([{ opacity: .45 }, { opacity: 1 }], { duration: 300 })); });
  return ""; // the drawn chat says it; no caption
});
scen("comments", "live_chat_translate_use_color", (box, on) => {
  box.innerHTML = lcPage(lcChat({ tr: true, color: on }));
  const dev = box.querySelector(".dev");
  at(150, () => { if (on) dev.querySelectorAll(".lt8").forEach(e => e.animate([{ opacity: .45 }, { opacity: 1 }], { duration: 300 })); });
  return ""; // the drawn chat says it; no caption
});
scen("comments", "live_chat_translate_copy_button", (box, on) => {
  box.innerHTML = lcPage(lcChat({ tr: true, copy: on }));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger");
  if (on) {
    at(500, () => { const c = dev.querySelector(".cp8"), d = dev.getBoundingClientRect(), r = c.getBoundingClientRect(), k = d.width / dev.offsetWidth; fingerTo(f, (r.left + r.width / 2 - d.left) / k, (r.top + r.height / 2 - d.top) / k); });
    at(900, () => tapF(f));
    at(1100, () => { f.classList.remove("show"); toast7(dev, `${ico7("copy", 7)} Copied`, "58%"); });
  }
  return on ? "A copy icon after each message copies it" : "No copy icon (stock)";
});
// Loop count: Morphe adds "Loop count" beside "Loop video" in the player's More menu, to choose how
// many times the video plays before the next one. The menu opens, the entry is tapped, the video plays
// its three rounds and the next video starts. (It used to be a counter appearing out of nowhere.)
SCN_HOLD.morphe_loop_count = 4600;
scen("playback", "loop_count", (box, on) => {
  situation("The player's More menu");
  box.innerHTML = device("port", watch7(`<span class="lc8 badge7" style="right:3px;top:3px"></span>`));
  const dev = box.querySelector(".dev"), f = box.querySelector("#scFinger"), row = () => dev.querySelectorAll(".sh7 > div")[1];
  at(300, () => { sheet7(dev, sheetRows([["loop", "Loop video"], ...(on ? [["loop", "Loop count"]] : []), ["speed", "Playback speed"], ["cc", "Captions"]])); if (on) row().classList.add("new7"); });
  if (!on) return "";
  at(1300, () => fingerOn(dev, f, row(), .3)); at(1650, () => tapF(f));
  at(1900, () => { f.classList.remove("show"); dev.querySelectorAll(".sh7, .shs7").forEach(e => e.remove()); dev.querySelector(".lc8").textContent = "Loop 1 of 3"; });
  [2, 3].forEach((n, i) => at(2500 + i * 600, () => { dev.querySelector(".lc8").textContent = `Loop ${n} of 3`; }));
  at(3700, () => { dev.querySelector(".lc8").textContent = ""; toast7(dev, "Next video", "30%"); });
  return ""; // the menu entry and the counter say it; no caption
});
scen("playback", "advanced_video_quality_menu", (box, on) => {
  situation("Tapping Quality");
  box.innerHTML = device("port", pageRows(player7(3)) + `<div style="position:absolute;left:0;right:0;bottom:0;background:#212121;border-radius:6px 6px 0 0;padding:7px 7px 8px;display:grid;gap:6px;font-size:8.5px;line-height:1.2;animation:sheetup .25s">${on ? ["1080p60", "720p60", "480p", "360p", "Auto"].map(t => `<div>${t}</div>`).join("") : ["Auto", "Higher quality", "Data saver", "Advanced ›"].map(t => `<div>${t}</div>`).join("")}</div>`);
  return on ? "All resolutions open directly" : "A simplified menu first (stock)";
});
// Four settings that each tell their own short story on the watch page (they used to share one
// waveform drawing, so moving between them looked like the animation had frozen).
const prog7 = (pct, color = "#f03") => `<div class="sk7" style="position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.3)"><div class="skp7" style="height:100%;width:${pct}%;background:${color};transition:width .5s"></div></div>`;
const ring7 = () => `<span class="rg7" style="position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid #fff;border-top-color:transparent;animation:clock7 .7s linear infinite"></span>`;
// Force original audio language: speech, not music. A Spanish creator's video; stock picks the AI-dubbed
// track in your language, on keeps the creator's own voice.
scen("playback", "force_original_audio", (box, on) => {
  situation("A Spanish video with a dubbed track");
  const line = on ? "¡Hola a todos!" : "Hi everyone!", track = on ? "Español · original" : "English · dubbed";
  box.innerHTML = device("port", watch7(`<span class="badge7" style="right:3px;top:3px">${ico7("translate", 6)} ${track}</span><span class="sp7" style="position:absolute;left:50%;bottom:6px;transform:translateX(-50%);font-size:6px;background:rgba(0,0,0,.75);padding:1px 5px;border-radius:6px;white-space:nowrap;opacity:0;transition:opacity .3s">🗣 ${line}</span>` + prog7(20)));
  const dev = box.querySelector(".dev");
  toast7(dev, on ? "The creator's own voice" : "An AI-dubbed voice in your language", "78%");
  at(300, () => { dev.querySelector(".sp7").style.opacity = 1; }); // the voice line flashes as it fades up (revealFlash)
  return "";
});
// Remember live stream position: you went back in a live stream, left, and come back to it.
scen("playback", "remember_live_stream_position", (box, on) => {
  situation("Coming back to a live stream you rewound"); // no blue line (Max, Nov 20)
  const live = `<span class="lv7 badge7" style="left:3px;top:3px;background:#555">LIVE</span><span class="lag7 badge7" style="right:3px;top:3px">−12:40</span>`;
  box.innerHTML = device("port", watch7(live + prog7(62)));
  const dev = box.querySelector(".dev"), pg = dev.querySelector(".pg7");
  toast7(dev, on ? "Back where you were" : "Jumps to the live edge", "78%");
  at(500, () => { pg.style.transition = "opacity .25s"; pg.style.opacity = .15; }); // leaving for a moment
  at(1100, () => {
    pg.style.opacity = 1;
    if (on) return;
    dev.querySelector(".skp7").style.width = "100%"; dev.querySelector(".lv7").style.background = "#f03"; dev.querySelector(".lag7").remove();
  });
  return "";
});
// Only delay with Bluetooth audio: Video delay holds the picture back to match the late sound of Bluetooth
// headphones. With headphones both phones delay and stay in sync. Then the sound moves to the phone
// speaker, which is not late: Off keeps delaying, so the picture now lags the sound; On drops the delay.
scen("playback", "video_delay_bluetooth_only", (box, on) => {
  situation("Bluetooth headphones, then the phone speaker");
  const ms = Number(V("morphe_video_delay")) > 0 ? Number(V("morphe_video_delay")) : 200;
  const sync = ok => `${ico7(ok ? "check" : "close", 7, ok ? "#4caf50" : "#ff6b6b")} ${ok ? "In sync" : "Picture lags sound"}`; // short: two lines reached the Delay pill on a small phone (Nov 24 test)
  box.innerHTML = device("port", watch7(`<span class="out7 badge7" style="left:3px;top:3px">${ico7("headset", 6)} Bluetooth</span><span class="dl8 badge7" style="right:3px;top:3px">Delay ${ms} ms</span>` + prog7(35)));
  const dev = box.querySelector(".dev");
  toast7(dev, sync(true), "78%");
  // the headphones part is held on purpose: at(0) keeps the start from being pulled forward to 0.3 s
  // (LEAD_MS), which is what cut it short before (Max, Nov 20, twice)
  // the video plays on through the headphones part, so the phones never sit still
  at(0, () => {});
  [150, 350, 550, 750, 950].forEach((t, i) => at(t, () => { dev.querySelector(".skp7").style.width = 38 + i * 6 + "%"; }));
  at(1000, () => { // twice as fast as before (Max, Nov 23)
    dev.querySelector(".out7").innerHTML = `${ico7("vol", 6)} Speaker`;
    if (on) dev.querySelector(".dl8").textContent = "No delay";
    const t = dev.querySelector(".toastin"); if (t) t.innerHTML = sync(on);
  });
  return "";
});
// Use normal speed for music: your speed is 2×. A video plays at 2× on both phones, then a music video
// comes up next: Off keeps it at 2× (the song runs fast), On plays it at 1× (Max, Nov 23: video vs music).
scen("playback", "disable_playback_speed_music", (box, on) => {
  situation("Your speed is 2×: a video, then a music video");
  box.innerHTML = device("port", watch7(`<span class="kd7 badge7" style="left:3px;top:3px">${ico7("play", 6)} Travel video</span><span class="sp7 badge7" style="right:3px;top:3px">${ico7("speed", 6)} 2×</span>` + prog7(10)));
  const dev = box.querySelector(".dev"), bar = () => dev.querySelector(".skp7");
  toast7(dev, "The video plays at 2×", "78%");
  at(0, () => {}); // the video part is held, not pulled forward (see Only delay with Bluetooth audio)
  [200, 400, 600, 800].forEach((t, i) => at(t, () => { bar().style.width = 22 + i * 12 + "%"; })); // 2×: big steps
  at(1000, () => {
    const b = bar(); b.style.transition = "none"; b.style.width = "4%"; void b.offsetWidth; b.style.transition = "";
    dev.querySelector(".kd7").innerHTML = `${ico7("music", 6)} Music video`;
    const title = dev.querySelector('b[style*="font-size:7px"]'); if (title) title.textContent = "Northern Lights · Midnight Tapes";
    if (on) dev.querySelector(".sp7").innerHTML = `${ico7("speed", 6)} 1×`;
    const t = dev.querySelector(".toastin"); if (t) t.innerHTML = on ? "Music plays at normal speed" : "The song plays at 2× too";
  });
  [1250, 1500, 1750, 2000].forEach((t, i) => at(t, () => { bar().style.width = 4 + (i + 1) * (on ? 6 : 12) + "%"; })); // 1× moves half as fast
  return "";
});
// Prioritize video quality: the network gets slow.
// Prioritize video quality: Morphe drops the efficient format (VP9) where the highest resolution only
// exists in the older one (AVC), so the top quality is offered. Without it an older video can be stuck
// low with no quality options (Morphe's own warning). It used to tell a slow-network story.
scen("playback", "video_quality_prioritize", (box, on) => {
  situation("An older video, opening Quality");
  box.innerHTML = device("port", watch7(`<span class="q7 badge7 chg7" style="right:3px;top:3px">${on ? "1080p · AVC" : "360p · VP9"}</span>`));
  const dev = box.querySelector(".dev");
  at(700, () => { sheet7(dev, `<b style="font-size:6.5px;color:#aaa">Quality</b>` + (on ? ["1080p", "720p", "480p", "360p"] : ["360p"]).map((t, i) => `<div style="display:flex;gap:4px;align-items:center">${i ? `<span style="width:7px"></span>` : ico7("toggle", 7)}${t}</div>`).join("") + (on ? "" : `<div style="color:#888;font-size:6px">No other qualities</div>`)); dev.querySelector(".sh7").classList.add("chg7"); });
  return on ? "The highest quality, in the older video format" : "Older videos can be stuck at a low quality";
});
// Skip silence and its Minimum pause length: a talk plays with seven pauses of different lengths under
// the video. Speech plays at the same pace on both phones; every pause at least the minimum length is
// shortened to 40% of its length as the playhead reaches it (what Morphe does: SILENCE_RETENTION_RATIO),
// the shorter ones play in full, so the side that skips reaches the end sooner. The pauses span every
// choice (0.5 s to 10 s), so each one cuts a different set. Off (or no minimum) plays every pause.
const SIL_PAUSES = [0.8, 2.5, 0.6, 8, 1.5, 12, 4], SIL_KEEP = .4, SIL_MS = 195; // real ms per second of audio
// "MS_700" / "S_2" (Morphe's MinimumPause names) in seconds; read from the value, so a new choice upstream still works
const silMin = v => { const m = /^(MS|S)_(\d+)$/.exec(String(v)); return m ? Number(m[2]) / (m[1] === "MS" ? 1000 : 1) : .7; };
const silS = x => (Math.round(x * 10) / 10).toString(); // seconds, one decimal at most
function silenceScen(box, min) {
  const SPEECH = 2, SW = 9, gw = p => 4 + 5 * Math.log2(1 + p); // drawn widths in phone pixels
  const cut = SIL_PAUSES.map(p => min != null && p >= min);
  const bars = i => [3, 7, 5, 9, 4, 6, 8, 5].slice(i % 4, i % 4 + 4);
  const segs = []; // [kind, index, sim start, sim length, drawn width, drawn start]
  let t = 0, x = 0;
  for (let i = 0; i <= SIL_PAUSES.length; i++) {
    segs.push(["s", i, t, SPEECH, SW, x]); t += SPEECH; x += SW;
    if (i === SIL_PAUSES.length) break;
    const p = SIL_PAUSES[i], len = cut[i] ? p * SIL_KEEP : p, w = gw(len);
    segs.push(["g", i, t, len, w, x]); t += len; x += w;
  }
  const total = t, saved = SIL_PAUSES.reduce((a, p, i) => a + (cut[i] ? p * (1 - SIL_KEEP) : 0), 0);
  // A pause to be shortened is drawn in two parts from the start: the part Morphe keeps (grey) and the part
  // it drops (red, hatched). When the playhead arrives the dropped part vanishes at once and only the kept
  // part plays, so nothing plays during a skip. A pause shorter than the minimum is one grey line: it plays in full.
  const line = c => `<i style="position:absolute;left:0;right:0;top:50%;height:1px;background:${c};transition:background .2s"></i>`;
  const track = segs.map(([k, i, , , w]) => {
    if (k === "s") return `<div class="ss7" style="flex:none;width:${SW}px;display:flex;align-items:center;justify-content:space-around">${bars(i).map(h => `<i style="width:1.2px;height:${h}px;border-radius:1px;background:#bbb;transition:background .1s"></i>`).join("")}</div>`;
    const p = SIL_PAUSES[i], lab = `<span style="position:absolute;left:50%;top:15px;transform:translateX(-50%);font-size:5px;color:${cut[i] ? "#ff8a80" : "#888"};white-space:nowrap;transition:color .2s">${silS(p)}s</span>`;
    if (!cut[i]) return `<div class="sg7" style="flex:none;position:relative;width:${w}px">${line("#555")}${lab}</div>`;
    return `<div class="sg7" style="flex:none;position:relative;display:flex"><div class="sk8" style="position:relative;width:${w}px">${line("#555")}</div><div class="sx8" style="position:relative;width:${gw(p) - w}px;overflow:hidden;background:repeating-linear-gradient(135deg,rgba(255,80,80,.55) 0 1px,transparent 1px 3px);transition:width .12s ease-in">${line("#ff6b6b")}</div>${lab}</div>`;
  }).join("");
  box.innerHTML = device("land", `<div style="position:absolute;left:0;right:0;top:0;height:58px;background:${ART[3]}">
      ${min != null ? `<span class="badge7" style="left:3px;top:3px">Shortens ≥ ${silS(min)} s</span><span class="sv7 badge7" style="right:3px;top:3px">Saved 0 s</span>` : ""}
      <span class="tm7" style="position:absolute;left:4px;bottom:3px;font-size:6px;color:#fff;text-shadow:0 0 2px #000">0:00</span></div>
    <div class="tr7" style="position:absolute;left:6px;top:66px;height:14px;display:flex">${track}
      <i class="ph7" style="position:absolute;left:0;top:-2px;bottom:-2px;width:1px;background:#fff;box-shadow:0 0 2px #fff"></i></div>`);
  const dev = box.querySelector(".dev"), ph = dev.querySelector(".ph7"), tm = dev.querySelector(".tm7"), sv = dev.querySelector(".sv7");
  const ss = [...dev.querySelectorAll(".ss7")], sg = [...dev.querySelectorAll(".sg7")];
  const clockText = sim => `0:${String(Math.floor(sim)).padStart(2, "0")}`;
  let got = 0;
  at(0, () => { // the audio clock follows the playhead, from the first frame
    const t0 = performance.now(), K = SIL_MS * scStretch;
    const tick = () => { if (!tm.isConnected) return; const sim = Math.min(total, (performance.now() - t0) / K); const tx = clockText(sim); if (tm.textContent !== tx) tm.textContent = tx; /* only when the shown time changes */ if (sim < total) requestAnimationFrame(tick); };
    tick();
  });
  segs.forEach(([k, i, start, len, w, x0]) => at(start * SIL_MS, () => {
    const ms = len * SIL_MS * scStretch;
    ph.style.transition = `left ${ms}ms linear`; ph.style.left = x0 + w + "px";
    // each bar turns red as the playhead passes it, not all at once
    if (k === "s") { ss[i].querySelectorAll("i").forEach((b, j, all) => { b.style.transitionDelay = (j + .5) / all.length * ms + "ms"; b.style.background = "#f03"; }); return; }
    if (!cut[i]) return;
    const g = sg[i], lab = g.querySelector("span"), sx = g.querySelector(".sx8");
    sx.style.transitionDuration = Math.min(120, ms * .6) + "ms"; sx.style.width = "0px"; // gone before the playhead gets there
    g.querySelector(".sk8 i").style.background = "#4cc764";
    lab.style.color = "#4cc764"; lab.textContent = silS(len) + "s";
    got += SIL_PAUSES[i] * (1 - SIL_KEEP); if (sv) sv.textContent = `Saved ${silS(got)} s`; // a corner readout: flashes
  }));
  at(total * SIL_MS, () => { tm.textContent = clockText(total) + (saved ? `  (−${silS(saved)} s)` : ""); });
  return "";
}
SCN_HOLD.morphe_skip_silence = SCN_HOLD.morphe_skip_silence_minimum_pause = 10200;
scen("playback", "skip_silence", (box, on) => silenceScen(box, on ? silMin(V("morphe_skip_silence_minimum_pause")) : null));
// Minimum pause length: one phone with the length you picked, redrawn on every pick (a default-against-
// choice pair showed 0.5 s on its second phone whenever 0.7 s, the default, was the one picked)
scen("playback", "skip_silence_minimum_pause", (box, v) => silenceScen(box, silMin(v)));
// Playback buffer size: one phone cycles through every size by itself, no picking. Morphe multiplies how
// much video is loaded ahead: Default ×1 (YouTube's own), Low ×2, Medium ×4, Maximum ×8 (memory capped).
SCN_HOLD.morphe_playback_buffer_size = 3600;
// The picked size (Max, Nov 24: the story stepped through all four on its own, whatever pill was picked):
// YouTube's own amount first, then the bar grows to the picked size and its pill lights up.
scen("playback", "playback_buffer_size", (box, pick) => {
  const steps = [["DEFAULT", 1, "YouTube's own"], ["LOW", 2, "2× more ahead"], ["MEDIUM", 4, "4× more ahead"], ["MAXIMUM", 8, "8× ahead, fewest stalls"]];
  const name = v => entryLabel("morphe_playback_buffer_size", v), ahead = m => Math.min(76, 8 * m); // % of the bar
  // a landscape phone: the video with its loaded-ahead bar on the left, the four sizes on the right, so every word fits
  box.innerHTML = device("land", `<div style="position:absolute;left:0;top:0;bottom:0;width:56%;background:${ART[3]}">
      <span class="bf7 badge7" style="right:3px;top:3px">${name("DEFAULT")}</span>
      <div style="position:absolute;left:5px;right:5px;bottom:7px;height:4px;border-radius:2px;background:rgba(255,255,255,.3);overflow:hidden"><div class="ba7" style="position:absolute;left:20%;top:0;bottom:0;width:8%;background:#d0d0d0;transition:width .45s var(--ease)"></div><div style="position:absolute;left:0;top:0;bottom:0;width:20%;background:#f03"></div></div></div>
    <div style="position:absolute;left:58%;right:4px;top:5px;bottom:5px;display:grid;align-content:space-between;font-size:6.5px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="color:#aaa">Loaded ahead</span><b class="bx7 chg7" style="font-size:9px">×1</b></div>
      <div class="bt7" style="color:#f1f1f1;line-height:1.25;min-height:2.5em">YouTube's own</div>
      <div class="bp7" style="display:grid;grid-template-columns:1fr 1fr;gap:2px">${steps.map(([v]) => `<span data-v="${v}" style="text-align:center;padding:2px 0;border-radius:4px;background:${v === "DEFAULT" ? "#3a3a3a" : "#2a2a2a"};transition:background .25s">${name(v)}</span>`).join("")}</div></div>`);
  const dev = box.querySelector(".dev");
  const put = v => {
    const [, m, txt] = steps.find(x => x[0] === v) || steps[0];
    dev.querySelector(".bf7").textContent = name(v); dev.querySelector(".bx7").textContent = "×" + m;
    dev.querySelector(".ba7").style.width = ahead(m) + "%"; dev.querySelector(".bt7").textContent = txt;
    dev.querySelectorAll(".bp7 span").forEach(e => { e.style.background = e.dataset.v === v ? (v === "DEFAULT" ? "#3a3a3a" : "var(--on-green)") : "#2a2a2a"; });
  };
  // the bar starts growing as the pill is pressed (Max, Nov 24: no delay before an animation)
  if (steps.some(x => x[0] === pick) && pick !== "DEFAULT") at(60, () => put(pick));
  return "";
});
// A comparison told in words instead of an animation: two cards the size of the phones, a heading and
// up to three short points each, keyed by the setting's value so they sit on the toggle's sides.
function textScen(sec, key, sit, byVal) {
  scen(sec, key, (box, v) => {
    situation(sit);
    const [head, pts] = byVal[String(!!v)];
    box.innerHTML = device("port", `<div class="tx7"><b>${head}</b>${pts.map(p => `<div>${p}</div>`).join("")}</div>`).replace('class="dev port"', 'class="dev port card7"');
    return "";
  });
}
// Autoplay mode: the three modes differ in what may start after a video, which is a rule, not a picture
// (Morphe: playlists and queues go on, a Mix stops after "Mix length" videos in Auto and after one in
// Single, Off stops every list, a suggested video never starts). It used to play the end screen's
// countdown, the same for Single and Off.
scen("endscreen", "autoplay_mode", (box, v) => {
  situation("A video ends: what starts next?");
  const n = Number(VE("morphe_autoplay_mix_stop_after")), mix = v === "OFF" ? "A Mix: stops" : v === "SINGLE" ? "A Mix: stops after 1 video" : n > 0 ? `A Mix: stops after ${n} videos` : "A Mix: plays on, no limit";
  const pts = [v === "OFF" ? "Playlists and queues: stop" : "Playlists and queues: play on", mix, "A suggested video: never starts"];
  box.innerHTML = device("port", `<div class="tx7"><b>${esc(entryLabel("morphe_autoplay_mode", v) || String(v))}</b>${pts.map(p => `<div>${p}</div>`).join("")}</div>`).replace('class="dev port"', 'class="dev port card7"');
  return "";
});
// DRC = dynamic range compression: YouTube can play a compressed audio track that evens out the volume
textScen("playback", "disable_drc_audio", "What you hear", {
  false: ["Evened-out sound", ["Quiet parts louder, loud parts softer", "Steady volume in noisy places", "Music and films lose some punch"]],
  true: ["Original sound", ["The full range of the mix", "Whispers stay quiet, bangs hit hard", "Best with headphones or good speakers"]],
});
scen("playback", "hide_premium_video_quality", (box, on) => {
  box.innerHTML = device("port", pageRows(player7(3)) + `<div style="position:absolute;left:0;right:0;bottom:0;background:#212121;border-radius:6px 6px 0 0;padding:5px;display:grid;gap:3px;font-size:6.5px">${tgt7(`<div>1080p Premium <span style="color:#aaa">· enhanced bitrate</span></div>`)}<div>1080p</div><div>720p</div><div>Auto</div></div>`);
  const dev = box.querySelector(".dev"), t = dev.querySelector(".tgt7");
  markGone([t], on);
  return ""; // the list in the phones says it
});
// Default Shorts quality on mobile data / Wi-Fi: a Short opens at the default (Auto) or at the chosen quality
for (const [k, net, label] of [["shorts_quality_default_mobile", "phone", "Mobile data"], ["shorts_quality_default_wifi", "wifi", "Wi-Fi"]]) {
  scen("playback", k, (box, v) => {
    situation(`Opening a Short on ${label.toLowerCase()}`);
    box.innerHTML = device("port", short7(5, `<span class="badge7" style="left:3px;top:3px">${ico7(net, 6)} ${label}</span>`));
    const dev = box.querySelector(".dev");
    at(300, () => dev.querySelector(".pg7").insertAdjacentHTML("beforeend", `<span class="badge7" style="right:3px;top:3px">${esc(entryLabel("morphe_" + k, v))}</span>`)); // the Short starts at that quality
    return "";
  });
}
for (const [k, what, val] of [["remember_playback_speed_last_selected", "speed", "1.5×"], ["remember_shorts_quality_last_selected", "Shorts quality", "720p"], ["remember_video_quality_last_selected", "quality", "1080p"]]) {
  scen("playback", k, (box, on) => {
    // no blue line and no picture swap (Max, Nov 20: the swap read as a glitch): the badge shows the
    // picked value, then what the next video starts at, and the pill says which
    // Shorts quality on a Short (full-height video), the others on the watch page
    const rv = `<span class="rv7 badge7" style="right:3px;top:3px">${what === "speed" ? ico7("speed", 6) + " " : ""}${val}</span>`;
    const isShort = what === "Shorts quality";
    box.innerHTML = device("port", isShort ? short7(5, rv) : watch7(rv));
    const dev = box.querySelector(".dev");
    toast7(dev, on ? `Your ${what} is kept` : `Back to the default ${what}`, isShort ? SHORT_PILL : "80%");
    at(300, () => { dev.querySelector(".rv7").innerHTML = (what === "speed" ? ico7("speed", 6) + " " : "") + (on ? val : (what === "speed" ? "1×" : "Auto")); });
    return on ? `The last ${what} you picked becomes the default` : `Each video starts at the default ${what} (stock)`;
  });
}
scen("playback", "vot_enabled", (box, on) => {
  situation("A video in a language you don't speak");
  box.innerHTML = device("port", watch7(`<span class="vo7 chg7" style="position:absolute;left:50%;bottom:4px;transform:translateX(-50%);font-size:6px;background:rgba(0,0,0,.75);padding:0 4px;white-space:nowrap;border-radius:3px">🗣 Привет, друзья!</span>`));
  const dev = box.querySelector(".dev");
  at(800, () => { if (on) dev.querySelector(".vo7").innerHTML = "🎧 Hi, friends! <span style='color:#3ea6ff'>(voice-over)</span>"; });
  return ""; // the subtitle line in the phones says it
});
hidePage("dearrow", "dearrow_connection_toast", "DeArrow can't reach its server", feed7(big7(3, "Building a tiny cabin")) + tgt7(`<div style="padding:3px 5px;border-radius:8px;background:#323232;font-size:6px;text-align:center">DeArrow is temporarily unavailable</div>`), { invert: true, shown: "A toast tells you when DeArrow is down", hidden: "Fails silently" });

// Narrow navigation buttons: the bar spread over the width beside the bar drawn together. (The single
// preview flipped between both without saying which was which.)
SCN_HOLD.morphe_narrow_navigation_buttons = 1800;
scen("nav", "narrow_navigation_buttons", (box, on) => {
  const tabs = [["home", "Home"], ["shorts", "Shorts"], ["plus", ""], ["subs", "Subs"], ["you", "You"]];
  box.innerHTML = device("port", pageRows(feed7(big7(3, "Building a tiny cabin") + row7(2, "Night train"))) + `<div class="chg7" style="position:absolute;left:0;right:0;bottom:0;height:19px;background:#0f0f0f;border-top:1px solid #222;display:flex;justify-content:center;align-items:center">${tabs.map(([n, t]) => `<span class="nb7" style="display:grid;justify-items:center;gap:1px;font-size:4.5px;line-height:1;flex:1 1 0;min-width:0;transition:flex .52s var(--ease)">${ico7(n, 8)}<span>${t}</span></span>`).join("")}</div>`);
  // Nov 24 (Max: broken): 16 px buttons filled nearly the whole 92 px bar, so both sides looked the same.
  // The narrow side starts spread like stock and its buttons pull together to the middle, leaving
  // clear space at both ends.
  // four plays per loop and 15% faster than v146 (Max, Nov 24): body 1800 ms (4 runs, stretch 1.3), the
  // pull starts at 320 x 1.3 = 416 ms (was 480) and takes .52 s (was .6)
  if (on) at(320, () => box.querySelectorAll(".nb7").forEach(e => { e.style.flex = "0 0 14px"; }));
  return ""; // no sentences (Max, Nov 25): the bars say it
});

function inScope(p, scopes) { return scopes.some(([s, sub]) => p.screen === s && (p.subScreen || null) === sub); }
// Settings without a preview or animation that sit in the main list of a Morphe screen but belong with
// another tab's settings (Max, Nov 20: organised by where they act, not by Morphe's menu)
const MISC_HOME = {
  morphe_seek_notification_media_fast_forward_length: "miniplayer", morphe_seek_notification_media_rewind_length: "miniplayer",
};
function buildMembers() {
  MEMBERS = {};
  SECTIONS.forEach(s => (MEMBERS[s.id] = { live: [], misc: [] }));
  const assigned = new Set();
  // scenarios are written for "playback"; the ones of Morphe's Player screen belong to the Behaviour tab
  for (const k in A) if (A[k].section === "playback" && PREF[k] && PREF[k].screen !== "VIDEO") A[k].section = "behaviour";
  for (const k in A) if (PREF[k] && MEMBERS[A[k].section] && inVersion(k)) { MEMBERS[A[k].section].live.push(k); assigned.add(k); }
  for (const p of CAT.preferences) {
    if (assigned.has(p.key) || !inVersion(p.key) || p.type === "screen") continue; // sub-screen links are navigation, not settings
    // the settings' own top row (Morphe's "About": version and links, above every screen) is no setting of
    // any tab; the catalogue had filed it under Shorts, where it did nothing (Max, Nov 25)
    if (p.locationConfidence === "root") continue;
    const s = SECTIONS.find(s => s.id === MISC_HOME[p.key]) || SECTIONS.find(s => s.scopes && inScope(p, s.scopes));
    (s ? MEMBERS[s.id].misc : MEMBERS.misc.misc).push(p.key);
  }
  buildKids();
}
// Sub-options: a setting that depends on another setting of the same screen sits under it,
// offset, and only shows while that dependency is met. MANUAL_PARENT adds groupings that
// Morphe does not express as a dependency.
const MANUAL_PARENT = {
  // the list of speeds is what the custom speed menu shows
  morphe_custom_playback_speeds: { key: "morphe_custom_speed_menu" },
  // restoring free pinch zoom means nothing while pinch is switched off altogether
  morphe_restore_pinch_to_zoom: { key: "morphe_disable_fullscreen_zoom_gesture", mode: "not" },
  morphe_player_overlay_opacity: { key: "morphe_hide_player_control_buttons_background", always: true },
  // the clear button belongs with Loop count (Morphe has them on one screen); it works whether or not the
  // loop count is on, so it always shows in that card (Max, Nov 24)
  morphe_loop_count_clear: { key: "morphe_loop_count", always: true },
  // with the swap on, Create lives in the top bar (its own toggle there); this one only acts on the bottom bar
  morphe_hide_create_button: { key: "morphe_swap_create_with_notifications_button", mode: "not" },
  morphe_hide_toolbar_notification_button: { key: "morphe_swap_create_with_notifications_button", mode: "not" },
};
// Navigation bar style is its own card above Glass navigation bar (Max, Nov 25): nested in the glass card,
// its Opaque made the glass bar unavailable and took the glass bar and Narrow navigation buttons with it
const NOT_PARENT = {};
// Two settings that are alternatives, not a setting and its sub-option: the second stays its own row,
// greyed out (with its lock) while the first is on. Enhanced Ambient mode takes the place of Ambient mode,
// so nesting "Ambient mode" under "Enhanced Ambient mode" read as one of Enhanced's options (Max, Nov 23 PM).
const NO_NEST = new Set(["morphe_disable_ambient_mode"]);
let DIRECT_PARENT = {};
let PARENT_OF = {}, KIDS = {};
function buildKids() {
  PARENT_OF = {}; KIDS = {};
  for (const s of SECTIONS) {
    const keys = [...MEMBERS[s.id].live, ...MEMBERS[s.id].misc], set = new Set(keys);
    const avOf = k => { const av = String(PREF[k].availability || ""); return [av, [...new Set([...(PREF[k].availabilityParents || []), ...[...av.matchAll(/S\("([^"]+)"\)/g)].map(m => m[1])])].filter(x => x !== k && set.has(x))]; };
    // Peers: settings that together unlock something ("any swipe zone is on"). When only ONE of the peers
    // also has a dependent of its own (the top zone's height), nesting it would give that peer a lock pill
    // the others lack although they unlock the same menu, so that dependent stays a plain greyed row too.
    const families = [], soloKids = {};
    for (const k of keys) {
      const [av, ks] = avOf(k);
      if (ks.length > 1 && av.includes("||")) families.push(ks);
      else if (ks.length === 1) (soloKids[ks[0]] = soloKids[ks[0]] || []).push(k);
    }
    const lonePeerKid = k => { const [av, ks] = avOf(k); if (ks.length !== 1 || av.includes("||")) return false; const p = ks[0];
      return soloKids[p].length === 1 && families.some(f => f.includes(p) && f.every(m => m === p || !soloKids[m])); };
    for (const k of keys) {
      const ok = x => x !== k && x !== NOT_PARENT[k] && set.has(x);
      const av = String(PREF[k].availability || "");
      const avKeys = lonePeerKid(k) ? [] : avOf(k)[1].filter(ok);
      // a setting that unlocks when ANY of several settings is on (DeArrow titles in any place, any swipe
      // zone) is not a sub-option of one of them: nesting it under the first made it pop up under a
      // parent that was never touched. It stays a normal row that is greyed out until one is on.
      const shared = avKeys.length > 1 && av.includes("||");
      // with several required parents, the nearest one is the one that itself needs the others
      // (Audio time stretching needs the speed menu and Audio pitch controls: it belongs under the latter)
      const ps = (PREF[k].parents || []).map(x => x.key).filter(ok);
      // and of a chain, the deepest: the one that needs the most of the others (Display area in portrait needs
      // Niconico comments, Show in portrait and Separate settings for portrait: it belongs under the last, which
      // needs both others; picking the first match put it under Show in portrait, above its real parent, Max, Nov 24)
      const needs = x => ps.filter(y => y !== x && (PREF[x]?.parents || []).some(z => z.key === y)).length;
      const near = ps.reduce((b, x) => needs(x) > (b ? needs(b) : 0) ? x : b, null) || ps[0];
      const par = MANUAL_PARENT[k] && set.has(MANUAL_PARENT[k].key) ? MANUAL_PARENT[k].key : near || (shared ? null : avKeys[0]);
      if (par && !NO_NEST.has(k)) PARENT_OF[k] = par;
    }
  }
  DIRECT_PARENT = { ...PARENT_OF };
  for (const k in PARENT_OF) { let r = PARENT_OF[k], g = 0; while (PARENT_OF[r] && g++ < 6) r = PARENT_OF[r]; PARENT_OF[k] = r; }
  for (const k in PARENT_OF) (KIDS[PARENT_OF[k]] = KIDS[PARENT_OF[k]] || []).push(k);
}
function availBlockedByParent(k) {
  const up = new Set(); let d = DIRECT_PARENT[k], g = 0; while (d && g++ < 8) { up.add(d); d = DIRECT_PARENT[d]; } if (PARENT_OF[k]) up.add(PARENT_OF[k]);
  const keys = unmetClauses(k).flatMap(c => [...c.matchAll(/[SD]\("([^"]+)"\)/g)].map(m => m[1]));
  return !keys.length || keys.some(x => up.has(x)) || !keys.some(x => PREF[x] && inVersion(x));
}
function kidVisible(k, depth = 0, from = null) {
  const m = MANUAL_PARENT[k];
  if (m && m.always) return true;
  if (m && (m.mode === "not" ? !!state[m.key] : !state[m.key])) return false;
  // a parent that is unavailable only because of the sub-option asking does not take that sub-option with
  // it: Navigation bar style sits in the glass bar's card, and its Opaque makes the glass bar unavailable,
  // which hid the style itself, so it could not be set back (Max, Nov 25)
  if (!classicParentsOk(k)) return false;
  // unavailable because of a setting beside it, not above it (the glass bar while Navigation bar style is
  // Opaque): the card stays, locked, and leads to that setting; only a parent's state folds a card away
  if (!availOk(k) && !(from && availKeys(k).includes(from)) && availBlockedByParent(k)) return false;
  // a sub-sub-option also hides with its own parent
  const d = DIRECT_PARENT[k];
  return !d || !PARENT_OF[d] || depth > 6 || kidVisible(d, depth + 1, k);
}
const sectionKeys = () => MEMBERS[section] ? [...MEMBERS[section].live, ...MEMBERS[section].misc] : [];
const sectionOf0 = k => SECTIONS.find(s => MEMBERS[s.id].live.includes(k) || MEMBERS[s.id].misc.includes(k))?.id || "misc";
// A Morphe sub-screen (Captions, Miniplayer...) is not a row: it leads to the editor screen that
// holds most of its settings.
const screenSecCache = {};
function screenSection(k) {
  if (screenSecCache[k]) return screenSecCache[k];
  const n = {};
  for (const p of CAT.preferences) if (p.subScreen === k && p.type !== "screen" && inVersion(p.key)) { const s = sectionOf0(p.key); n[s] = (n[s] || 0) + 1; }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return (screenSecCache[k] = best ? best[0] : "misc");
}
const sectionOf = k => PREF[k] && PREF[k].type === "screen" ? screenSection(k) : sectionOf0(k);
// Where a screen is, in the words of the current layout: "Captions", or "Playback › Captions" with tabs.
function placeLabel(id) {
  if (grouped) { const g = groupOf(id), t = g.tabs.find(([x]) => x === id); return `${g.title} › ${t ? t[1] : id}`; }
  return SECTIONS.find(s => s.id === id)?.title || "Other";
}

// ---------- Flying comments (Niconico comments), the settings under it that change when or how comments fly.
// Read from NiconicoCommentsController / YouTubeChatSource / NiconicoCommentsOverlayView (Max, Nov 24: each of
// these gets its own animation; the others under it, such as Max refresh rate, can't be drawn and don't flash).
const NICO7 = ["8888888", "the stove!!", "cosy", "wow", "need this cabin", "lol", "草"];
// The size, pace, area and opacity every flying-comment story draws with, read from the settings (Max, Nov 25:
// the stories ignored the Display area slider). NiconicoCommentsController: in portrait, with "Separate
// settings for portrait" on, the portrait font size, travel duration and display area are used instead.
// 20 sp is 6 px in a story phone and a 7 s flight is 2.4 s, the pace the stories were drawn at.
function nicoCfg(portrait, over = {}, force) {
  const P = force || portrait && V("morphe_niconico_comments_portrait") && V("morphe_niconico_comments_separate_portrait");
  const g = (k, d) => { const v = Number(over[k] ?? V("morphe_niconico_comments_" + (P ? "portrait_" : "") + k)); return Number.isFinite(v) && v > 0 ? v : d; };
  return { fs: 6 * g("font_size", 20) / 20, ms: Math.round(2400 * g("travel_duration", 7) / 7), area: Math.min(100, g("display_area", 100)), op: Math.min(1, (Number(V("morphe_niconico_comments_opacity")) || 100) / 100) };
}
// the layer comments fly in: the top part of the video the display area allows (dashed when it is not all of it)
const naLayer = (c = nicoCfg(false), css = "") => `<div class="na7" data-fs="${c.fs}" data-ms="${c.ms}" style="position:absolute;left:0;right:0;top:0;height:${c.area}%;overflow:hidden;opacity:${c.op};${c.area < 100 ? "outline:1px dashed rgba(255,255,255,.3);outline-offset:-1px;" : ""}${css}"></div>`;
// after a turn, the layer takes the other orientation's values
function naApply(dev, c) { const a = dev.querySelector(".na7"); if (!a) return; a.dataset.fs = c.fs; a.dataset.ms = c.ms; a.style.height = c.area + "%"; a.style.outline = c.area < 100 ? "1px dashed rgba(255,255,255,.3)" : ""; }
// how many lanes of comments fit the layer
const naLanes = (area, fs) => Math.max(1, Math.floor((area.clientHeight - 2) / (fs * 1.25)));
// one comment flies right to left across the area (.na7), in a lane (taken modulo the lanes that fit), at the
// layer's size and pace unless the story gives its own (o.k scales them, for a small window)
function nico7(area, text, lane, o = {}) {
  if (!area || !area.isConnected) return null;
  const k = o.k || 1, fs = o.fs || (Number(area.dataset.fs) || 6) * k, e = document.createElement("span");
  e.className = "nc7"; e.textContent = text;
  e.style.cssText = `position:absolute;left:100%;top:${2 + (lane % naLanes(area, fs)) * fs * 1.25}px;white-space:nowrap;font-size:${fs}px;font-weight:700;color:${o.color || "#fff"};text-shadow:0 0 2px #000,0 0 2px #000;${o.css || ""}`;
  area.appendChild(e);
  const w = area.clientWidth + e.offsetWidth + 4;
  const a = e.animate([{ transform: "translateX(0)" }, { transform: `translateX(-${w}px)` }], { duration: o.ms || (Number(area.dataset.ms) || 2400) * (o.k ? .8 : 1), easing: "linear" });
  a.onfinish = () => e.remove();
  return e;
}
// a stream of comments, one every `gap` ms from `from`, lanes taken in turn
function nicoRun(dev, list, { from = 250, gap = 330, lanes = 3, fs, ms, k, area = ".na7" } = {}) {
  list.forEach((t, i) => at(from + i * gap, () => nico7(dev.querySelector(area), t, i % lanes, { fs, ms, k })));
}
const badge7n = (t, bg) => `<span style="position:absolute;left:5px;top:5px;z-index:2;padding:1px 4px;border-radius:3px;background:${bg};font-size:5.5px;font-weight:700">${t}</span>`;
// YouTubeChatSource: a video's kind decides whether its chat flies (live stream, Premiere playing, ended Premiere)
for (const [key, badge, bg, on1, off1] of [
  ["niconico_comments_live_streams", "● LIVE", "#cc0000", "The live chat flies across the video", "No flying comments on live streams"],
  ["niconico_comments_live_premieres", "PREMIERE", "#3a3a3a", "The Premiere's chat flies across the video", "No flying comments while a Premiere plays"],
  ["niconico_comments_ended_premieres", "Premiered 2 days ago", "rgba(0,0,0,.6)", "Its chat replay flies across the video", "No flying comments on ended Premieres"]]) {
  scen("danmaku", key, (box, on) => {
    box.innerHTML = device("land", `<div style="position:absolute;inset:0;background:${ART[3]}"></div>${badge7n(badge, bg)}${naLayer()}`);
    const dev = box.querySelector(".dev");
    if (on) nicoRun(dev, NICO7); else at(300, () => toast7(dev, "No flying comments", "80%"));
    return on ? on1 : off1;
  });
}
// NiconicoCommentsOverlayView.setHideCrowdedComments: when every lane of the display area is taken, a new
// comment is dropped instead of being drawn over the others
scen("danmaku", "niconico_comments_hide_crowded", (box, on) => {
  box.innerHTML = device("land", `<div style="position:absolute;inset:0;background:${ART[3]}"></div>${naLayer()}`);
  const dev = box.querySelector(".dev"), area = () => dev.querySelector(".na7"), n = naLanes(area(), Number(area().dataset.fs) || 6);
  // a burst: the first comments take every lane, the rest arrive while they are full
  const pool = ["8888888", "the stove!!", "cosy", "wow", "need this cabin", "lol", "草", "nice", "so calm", "cabin goals", "88888", "the snow!"];
  const burst = Array.from({ length: n + Math.min(6, n + 2) }, (_, i) => pool[i % pool.length]), drop = burst.length - n;
  burst.forEach((t, i) => at(250 + i * Math.max(60, 140 * 2 / n), () => {
    if (!on || i < n) return void nico7(area(), t, i % n, { ms: 2600 });
    if (i < n + 2) { const e = nico7(area(), t, i % n, { ms: 2600, css: "opacity:.25" }); if (e) e.animate([{ opacity: .9 }, { opacity: 0 }], { duration: 420, fill: "forwards" }); } // dropped: a ghost that fades at the edge
  }));
  at(1700, () => toast7(dev, on ? `Full: ${drop} dropped, none overlap` : "Comments pile on each other", "72%"));
  return on ? "When the area is full, new comments are dropped" : "New comments are drawn over the others (stock)";
});
// NiconicoCommentsController: a comment longer than the limit is never shown (100 is "no limit")
scen("danmaku", "niconico_comments_max_length", (box, v) => {
  const max = Number(v) || 100, none = max >= 100;
  box.innerHTML = device("land", `<div style="position:absolute;inset:0;background:${ART[3]}"></div>${naLayer()}`);
  const dev = box.querySelector(".dev"), long = "the most relaxing cabin build I have seen in my whole life";
  ["cosy", long, "wow", "8888888"].forEach((t, i) => at(250 + i * 380, () => {
    const e = nico7(dev.querySelector(".na7"), t, i % 3, { ms: 2800 });
    if (e && t === long && !none) { e.style.textDecoration = "line-through"; e.style.color = "#ff6b6b"; e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 250, fill: "forwards" }); }
  }));
  at(1500, () => toast7(dev, none ? "Every comment flies" : `1 comment over ${max} characters hidden`, "72%"));
  return none ? "Comments of any length fly" : `Comments over ${max} characters are hidden`;
});
// NiconicoCommentsController: in picture-in-picture the comments are drawn scaled down to fit the window
scen("danmaku", "niconico_comments_pip", (box, on) => {
  box.innerHTML = device("port", pageRows(feed7(row7(2, "Night train to Bodø") + row7(4, "Lo-fi beats") + row7(5, "Aurora timelapse"))) + `<div style="position:absolute;right:4px;bottom:22px;width:52px;height:30px;border-radius:3px;overflow:hidden;background:${ART[3]};box-shadow:0 2px 6px rgba(0,0,0,.6);z-index:3">${naLayer()}</div>`);
  const dev = box.querySelector(".dev");
  if (on) nicoRun(dev, NICO7.slice(0, 5), { k: .6, lanes: 4 }); else at(400, () => toast7(dev, "No comments in the window", "40%"));
  return on ? "The comments shrink to fit the window" : "No comments in picture-in-picture";
});
// NiconicoCommentsController.shouldShow: in portrait only with "Show in portrait"; in landscape always
scen("danmaku", "niconico_comments_portrait", (box, on) => {
  box.innerHTML = device("land", playerArea(3, naLayer()));
  const dev = box.querySelector(".dev");
  nicoRun(dev, NICO7.slice(0, 3), { gap: 300 });
  at(1300, () => turn(dev, "port", () => naApply(dev, nicoCfg(true))));
  if (on) nicoRun(dev, NICO7.slice(3), { from: 2000, gap: 300, k: .75 });
  else at(2000, () => toast7(dev, "Only in landscape", "60%"));
  return on ? "Comments keep flying in portrait" : "Comments stop when the phone is upright";
});
// NiconicoCommentsController.usesPortraitSettings: portrait uses its own font size, travel duration and
// display area (the "in portrait" settings) instead of the landscape ones. The turn is 20% quicker than the
// others (Max, Nov 25).
scen("danmaku", "niconico_comments_separate_portrait", (box, on) => {
  box.innerHTML = device("land", playerArea(3, naLayer()));
  const dev = box.querySelector(".dev"), L = nicoCfg(false), P0 = nicoCfg(true, {}, true);
  // the same values in portrait: an example of a smaller portrait size, so the two sides differ
  const P = on ? { ...P0, fs: P0.fs === L.fs ? L.fs * .6 : P0.fs } : L, sp = c => Math.round(c.fs * 20 / 6);
  nicoRun(dev, NICO7.slice(0, 3), { gap: 300 });
  at(1300, () => turn(dev, "port", () => naApply(dev, P), MOVE_MS * .8));
  // the landscape size in the small portrait player reads as big; its own size fits it
  nicoRun(dev, NICO7.slice(3), { from: 1900, gap: 320, lanes: 2 });
  at(2200, () => toast7(dev, on ? `Portrait: ${sp(P)} sp, its own` : `Portrait: ${sp(L)} sp, as landscape`, "78%"));
  return on ? "Portrait gets its own size, speed and area" : "Portrait uses the landscape size, speed and area";
});
SCN_HOLD.morphe_niconico_comments_portrait = SCN_HOLD.morphe_niconico_comments_separate_portrait = 3800;
// The three "in portrait" sliders (Max, Nov 25: they did nothing): the upright player with comments flying at
// the slider's value, the other portrait values as set
for (const [k, other, unit] of [["portrait_font_size", 12, " sp"], ["portrait_travel_duration", 4, " s"], ["portrait_display_area", 50, "%"]]) {
  const key = "morphe_niconico_comments_" + k;
  DUO_OTHER[key] = other; DUO_UNIT[key] = unit;
  scen("danmaku", "niconico_comments_" + k, (box, v) => {
    box.innerHTML = device("port", playerArea(3, naLayer(nicoCfg(true, { [k.slice(9)]: v }, true))));
    nicoRun(box.querySelector(".dev"), NICO7, { gap: 300 });
    return "";
  });
}
// YouTubeChatSource: on a video without a chat, top comments with a time in them (1:23) fly at that time
scen("danmaku", "niconico_comments_timed_comments", (box, on) => {
  box.innerHTML = device("port", playerArea(3, naLayer(nicoCfg(true)) + `<b class="tc7" style="position:absolute;left:4px;bottom:3px;font-size:5.5px;text-shadow:0 0 2px #000">1:20</b>`));
  const dev = box.querySelector(".dev"), below = dev.querySelector(".dv-below");
  below.style.cssText = "font-size:6px;gap:4px;padding:5px"; below.innerHTML = `<b style="font-size:6.5px">Comments</b>${cmt7(2, `<span style="color:#3ea6ff">1:23</span> the stove is lit!`)}${cmt7(5, "Lovely build")}`;
  [21, 22, 23].forEach((s, i) => at(450 + i * 450, () => { const t = dev.querySelector(".tc7"); if (t) t.textContent = "1:" + s; }));
  at(1350, () => { if (on) nico7(dev.querySelector(".na7"), "the stove is lit!", 1, { k: .85 }); else toast7(dev, "Nothing flies", "22%"); });
  return on ? "At 1:23 that comment flies across" : "Only chat flies; this video has none";
});
// YouTubeChatSource: on replays of live streams and Premieres, the timed comments are added to the chat replay
scen("danmaku", "niconico_comments_timed_comments_with_replay", (box, on) => {
  box.innerHTML = device("land", `<div style="position:absolute;inset:0;background:${ART[3]}"></div>${badge7n("Chat replay", "rgba(0,0,0,.6)")}${naLayer()}`);
  const dev = box.querySelector(".dev");
  nicoRun(dev, ["8888888", "cosy", "lol", "wow"], { gap: 420 });
  if (on) at(620, () => nico7(dev.querySelector(".na7"), "1:23 the stove is lit!", 2, { css: "color:#9fd3ff" }));
  at(1400, () => toast7(dev, on ? "Chat replay + timed comments" : "Chat replay only", "72%"));
  return on ? "The chat replay and timed comments fly together" : "Only the chat replay flies (stock)";
});

// The like and dislike pill under a video in the stories. Its labels get room to spare on both sides of the
// divider: tiny text in the scaled phone is measured at its small size but drawn larger, and on some phones
// (other font metrics) it came out wider than measured and ran into the divider (Max, Nov 25: "Hidden by
// owner" clipped). Nothing in it may shrink, so the pill grows instead of cutting a label.
const likePill7 = (like, dislike) => `<div class="lkp7" style="display:flex;width:max-content;border-radius:8px;background:#272727;font-size:5.5px;align-items:center;white-space:nowrap"><span style="display:flex;flex:none;gap:2px;align-items:center;padding:2px 3px;border-right:1px solid #444">${ico7("like", 6)}<span style="padding-right:1.5px">${like}</span></span><span style="display:flex;flex:none;gap:2px;align-items:center;padding:2px 4px 2px 3px">${ico7("dislike", 6)}${dislike}</span></div>`;

// ---------- Return YouTube Dislike: the settings that act away from the action bar (Max, Nov 25: they did nothing)
// ReturnYouTubeDislike.createDislikeSpan: on a video whose creator hid the likes, the like button says "Hidden by
// owner" unless estimated likes are on, which show the like count Return YouTube Dislike estimates
scen("watch", "ryd_estimated_like", (box, on) => {
  // the dislike count is left out: the phone is narrow and "Hidden by owner" is what the story is about
  const pill = likePill7(`<span class="lkc7">Like</span>`, "");
  box.innerHTML = device("port", pageRows(player7(3) + `<b style="font-size:7px">Building a tiny cabin</b>` + pill + row7(2, "Night train to Bodø")));
  const dev = box.querySelector(".dev");
  // the count arrives from Return YouTube Dislike a moment after the page, as it does in the app
  at(450, () => { const l = dev.querySelector(".lkc7"), was = l.textContent; l.textContent = on ? "~41K" : "Hidden by owner"; l.classList.add("chg7"); textSwap(l, was); });
  return ""; // no lines (Max, Nov 25: a permanent rule for every new animation)
});
// FeedEngagementCountsPatch: a badge on feed thumbnails with the like icon and count and/or the like ratio
// (with a like bar under it). Its place: in one row continuing the view count badge at the bottom
// (NEXT_TO_VIEW_COUNT), stacked at the middle of the right edge under the Watch later button (MIDDLE_RIGHT), or
// stacked at the top left (TOP_LEFT). One picture for its three settings.
const FEED_POS = ["NEXT_TO_VIEW_COUNT", "MIDDLE_RIGHT", "TOP_LEFT"];
// The badge is 10% smaller than the stock badges' text was drawn here and its contents sit in its middle,
// top to bottom and side to side (Max, Nov 28): one line height, the same room above and below, the like
// bar inside that room. The thumbnail is a real one, 16:9 and the full width of the screen as in the app's
// feed, so the badge's place reads clearly.
function feedLikeBadge({ count, ratio, pos }) {
  if (!count && !ratio) return "";
  const bar = ratio ? `<i style="display:block;height:1.35px;margin-top:.9px;border-radius:1px;background:linear-gradient(90deg,#f1f1f1 96%,#ff4e45 96%)"></i>` : "";
  const c = count ? `<span style="display:flex;gap:1.35px;align-items:center">${ico7("like", 4.95, "#fff")}<span>48K</span></span>` : "", r = ratio ? `<span>96%</span>` : "";
  const box7 = "background:rgba(0,0,0,.75);border-radius:2px;padding:1.2px 2.3px;font-size:4.5px;font-weight:600;color:#fff;line-height:1;align-content:center";
  if (pos === "NEXT_TO_VIEW_COUNT") return `<div class="fb7" style="position:absolute;left:3px;bottom:3px;${box7};display:grid"><div style="display:flex;gap:2px;align-items:center;justify-content:center"><span>1.2M views</span><span style="width:.5px;height:4.5px;background:#888"></span>${c}${r}</div>${bar}</div>`;
  // stacked: the like bar spans the badge right under the ratio (it had no width in the centred grid, so
  // the badge only showed an empty strip at its bottom, Max, Nov 25), and at MIDDLE_RIGHT the badge ends
  // under the Watch later button and above the duration badge (FeedEngagementCountsPatch: top =
  // max(minTop, middle - height / 2)) instead of covering either
  const at7 = pos === "MIDDLE_RIGHT" ? "right:3px;top:50%;translate:0 -50%" : "left:3px;top:3px";
  return `<div class="fb7" style="position:absolute;${at7};${box7};font-size:4.15px;display:grid;justify-items:center;gap:.6px">${c}${r}${bar.replace("margin-top:.9px", "margin-top:0;justify-self:stretch")}</div>`;
}
function feedLikeScen(key, plan) {
  AWAY.add("morphe_" + key);
  scen("watch", key, (box, v) => {
    // the Watch later button at the top right is stock and drawn in every place (the badge sits under it at
    // MIDDLE_RIGHT, FeedEngagementCountsPatch's TOP_BUTTON_DP), so comparing two places flashes only the badge
    const o = plan(v), d = `<span style="position:absolute;right:3px;top:3px;width:9px;height:9px;border-radius:50%;background:rgba(0,0,0,.6);display:grid;place-items:center">${ico7("clock", 6, "#fff")}</span>`;
    // the stock badges: views at the bottom left (or none where the like row takes its place), the duration at the bottom right
    const base = `${o.pos === "NEXT_TO_VIEW_COUNT" && (o.count || o.ratio) ? "" : `<span class="ctx7" style="position:absolute;left:3px;bottom:3px;background:rgba(0,0,0,.75);border-radius:2px;padding:1px 2.5px;font-size:5px;font-weight:600">1.2M views</span>`}<span style="position:absolute;right:3px;bottom:3px;background:rgba(0,0,0,.75);border-radius:2px;padding:1px 2.5px;font-size:5px;font-weight:600">12:04</span>${d}`;
    box.innerHTML = device("port", pageRows(feed7(big7(3, "Building a tiny cabin", base, "aspect-ratio:16/9;margin:0 -6px;border-radius:0") + row7(2, "Night train to Bodø") + row7(4, "Lo-fi beats"))));
    const dev = box.querySelector(".dev"), th = dev.querySelector(".th7"); // big7's thumbnail
    // the badge comes in once the counts are fetched, as in the app
    const badge = feedLikeBadge(o);
    if (badge && th) at(400, () => { th.insertAdjacentHTML("beforeend", badge); const b = th.querySelector(".fb7"); b.classList.add("chg7"); b.animate([{ opacity: 0, scale: .8 }, { opacity: 1, scale: 1 }], { duration: 260, easing: "ease-out" }); if (o.pos === "NEXT_TO_VIEW_COUNT") th.querySelectorAll(":scope > span").forEach(s => { if (/views/.test(s.textContent)) s.remove(); }); });
    return "";
  });
}
const feedNow = () => ({ count: !!V("morphe_ryd_feed_like_count"), ratio: !!V("morphe_ryd_feed_like_ratio"), pos: String(V("morphe_ryd_feed_counts_position") || "NEXT_TO_VIEW_COUNT") });
feedLikeScen("ryd_feed_like_count", on => ({ ...feedNow(), count: !!on }));
feedLikeScen("ryd_feed_like_ratio", on => ({ ...feedNow(), ratio: !!on }));
// the place only shows with something in it: with neither switched on, the picture shows both
feedLikeScen("ryd_feed_counts_position", v => { const n = feedNow(), any = n.count || n.ratio; return { count: any ? n.count : true, ratio: any ? n.ratio : true, pos: String(v) }; });
// The connection error alerts of Return YouTube Dislike and SponsorBlock, drawn as DeArrow's is
AWAY.add("morphe_ryd_toast_on_connection_error"); AWAY.add("morphe_sb_toast_on_connection_error");
hidePage("watch", "ryd_toast_on_connection_error", "Return YouTube Dislike can't reach its server", player7(3) + `<b style="font-size:7px">Building a tiny cabin</b>${likePill7("48K", "")}` + row7(2, "Night train to Bodø") + tgt7(`<div style="padding:3px 5px;border-radius:8px;background:#323232;font-size:6px;text-align:center">Dislikes are temporarily not available (API timed out)</div>`), { invert: true });
hidePage("sponsorblock", "sb_toast_on_connection_error", "SponsorBlock can't reach its server", player7(3, `<div style="position:absolute;left:4px;right:4px;bottom:3px;height:1.5px;background:rgba(255,255,255,.35)"><div style="width:30%;height:100%;background:#f00"></div></div>`) + `<b style="font-size:7px">Building a tiny cabin</b>` + row7(2, "Night train to Bodø") + row7(4, "Lo-fi beats") + tgt7(`<div style="padding:3px 5px;border-radius:8px;background:#323232;font-size:6px;text-align:center">SponsorBlock is temporarily not available (API timed out)</div>`), { invert: true });
