"use strict";
// The scenes: one function per media file (or per small set). Each opens a fresh page in the YouTube
// dark look, Clean list design, screens grouped into tabs, unless it says otherwise.
const L = require("./lib");
const { SCENES, tap, tapRow, tapToggle, scrollRow, capture, hstack, grid, tmpPng } = require("./make");
const { sleep } = L;
const path = require("path");
const fs = require("fs");
const GIF = { scale: 1.5 };
// animation GIFs show the top of the screen (preview, tabs and the cards around the one being changed)
const CROP = { clip: { x: 0, y: 0, width: 412, height: 640 }, width: 618 };
const FULL = { width: 480 };
const ev = (p, fn, arg) => p.evaluate(fn, arg);
const go = (p, k) => ev(p, k => goToSetting(k), k);

// 1. Hero: Player controls, the Cast button card selected and its button outlined in the preview
SCENES.hero = async () => {
  const { ctx, p } = await L.open();
  await scrollRow(p, "morphe_hide_cast_button", 180);
  await tapRow(p, "morphe_hide_cast_button"); await sleep(1600);
  await L.still(p, "hero.png");
  await ctx.close();
};

// 2. UI designs: Original, Morphe and Glass, the same screen side by side
SCENES["ui-designs"] = async () => {
  const files = [];
  for (const theme of ["yt", "m3", "glass"]) {
    const { ctx, p } = await L.open({ prefs: { theme } });
    await ev(p, () => switchSection("watch")); await sleep(1500);
    const f = tmpPng("ui-" + theme); await p.screenshot({ path: f }); files.push(f);
    await ctx.close();
  }
  hstack(files, "ui-designs.png", 48); files.forEach(f => fs.rmSync(f));
};

// 3. Settings list designs: Morphe, Switches and Clean, the same cards side by side
SCENES["list-designs"] = async () => {
  const files = [];
  for (const design of ["classic", "toggles", "clean"]) {
    const { ctx, p } = await L.open({ prefs: { design } });
    await scrollRow(p, "morphe_hide_collapse_button"); await sleep(400);
    const f = tmpPng("ld-" + design); await p.screenshot({ path: f }); files.push(f);
    await ctx.close();
  }
  hstack(files, "list-designs.png", 48); files.forEach(f => fs.rmSync(f));
};


// drag a row's slider from where it is to a value, in steps, like a finger would
async function drag(p, k, to, ms = 900) {
  const g = await ev(p, k => { const i = document.querySelector(`#list [data-row="${k}"] input[type=range]`); const r = i.getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width, min: +i.min, max: +i.max, v: +i.value }; }, k);
  const px = v => g.x + 10 + (g.w - 20) * (v - g.min) / (g.max - g.min);
  await p.mouse.move(px(g.v), g.y); await p.mouse.down();
  const n = Math.round(ms / 40);
  for (let i = 1; i <= n; i++) { await p.mouse.move(px(g.v + (to - g.v) * i / n), g.y); await sleep(40); }
  await p.mouse.up(); await p.mouse.move(-10, -10);
}
// slow typing into the search field
async function type(p, text) { for (const ch of text) { await p.keyboard.type(ch); await sleep(140); } }
const section = async (p, id) => { await ev(p, id => switchSection(id), id); await sleep(1300); };

// 4. Organisation: the screen menu, grouped into six tabbed screens or the plain list of all screens
SCENES["menu-tabs"] = async () => {
  const { ctx, p } = await L.open(GIF);
  await capture(p, "menu-tabs.gif", async () => {
    await sleep(400);
    await tap(p, "#secPill"); await sleep(1100);
    await tap(p, "#pickGrid [data-group-toggle]"); await sleep(1500);
    await tap(p, "#pickGrid [data-group-toggle]"); await sleep(700);
    await ev(p, () => $("picker").scrollTo({ top: 0, behavior: "smooth" })); await sleep(500);
    await tap(p, '#pickGrid [data-group="g_watch"]'); await sleep(1100);
    await tap(p, '#tabs [data-tab="comments"]'); await sleep(1300);
  }, FULL);
  await ctx.close();
};

// 2b. UI design switched from the screen menu: Original, Morphe, Glass
SCENES["ui-design-switch"] = async () => {
  const { ctx, p } = await L.open(GIF);
  await capture(p, "ui-design-switch.gif", async () => {
    await sleep(500);
    await tap(p, "#secPill"); await sleep(1100);
    await tap(p, '#pickGrid [data-ui="m3"]'); await sleep(1300);
    await tap(p, '#pickGrid [data-ui="glass"]'); await sleep(1300);
    await tap(p, '#pickGrid [data-group="g_watch"]'); await sleep(1800);
  }, FULL);
  await ctx.close();
};

// 3b. Settings list design: picking Switches opens a sample card, then the list follows
SCENES["list-design-switch"] = async () => {
  const { ctx, p } = await L.open(GIF);
  await capture(p, "list-design-switch.gif", async () => {
    await sleep(500);
    await tap(p, "#secPill"); await sleep(1000);
    await tap(p, '#pickGrid [data-design="toggles"]'); await sleep(2200);
    await tap(p, "#dOk"); await sleep(500);
    await tap(p, '#pickGrid [data-group="g_player"]'); await sleep(1600);
  }, FULL);
  await ctx.close();
};

// 6a. Hiding a part: the Cast button folds out of the player, then comes back
SCENES["anim-hide"] = async () => {
  const { ctx, p } = await L.open(GIF);
  await scrollRow(p, "morphe_hide_cast_button", 120);
  await capture(p, "anim-hide.gif", async () => {
    await sleep(500);
    await tapToggle(p, "morphe_hide_cast_button"); await sleep(1600);
    await tapToggle(p, "morphe_hide_cast_button"); await sleep(1500);
  }, CROP);
  await ctx.close();
};

// 6b. A hidden part: tapping its card shows it for a moment, outlined in red, without changing it
SCENES["anim-reveal"] = async () => {
  const { ctx, p } = await L.open(GIF);
  await scrollRow(p, "morphe_hide_autoplay_button", 160);
  await capture(p, "anim-reveal.gif", async () => {
    await sleep(500);
    await tapRow(p, "morphe_hide_autoplay_button"); await sleep(3000);
  }, CROP);
  await ctx.close();
};

// 6c. Off / On comparison for a setting with no place in the live preview (Search comments)
SCENES["anim-compare"] = async () => {
  const { ctx, p } = await L.open(GIF);
  await section(p, "comments");
  await scrollRow(p, "morphe_search_comments", 120);
  await capture(p, "anim-compare.gif", async () => {
    await sleep(400);
    await tapRow(p, "morphe_search_comments"); await sleep(4200);
  }, CROP);
  await ctx.close();
};

// 6d. Gesture demo on the live preview (Seekbar thumbnails: a finger drags the seekbar)
SCENES["anim-demo"] = async () => {
  const { ctx, p } = await L.open(GIF);
  await section(p, "seekbar");
  await scrollRow(p, "morphe_seekbar_thumbnail_preview", 120);
  await capture(p, "anim-demo.gif", async () => {
    await sleep(400);
    await tapRow(p, "morphe_seekbar_thumbnail_preview"); await sleep(3600);
  }, CROP);
  await ctx.close();
};

// 8a. Original (stock YouTube) against Morphe (your settings), the compare switch in the top bar
// a lived-in setup, so the flip shows a real difference: compact action bar, dislikes as a percentage, rarely used
// buttons, the comment preview and the crowdfunding box hidden, Dark blue background
const LIVED_IN = {
  morphe_video_action_bar_layout: "MINIMAL", morphe_theme_color_dark: "DARK_BLUE", morphe_ryd_dislike_percentage: true,
  morphe_hide_remix_button: true, morphe_hide_thanks_button: true, morphe_hide_download_button: true, morphe_hide_clip_button: true,
  morphe_hide_ask_button: true, morphe_hide_hype_button: true, morphe_hide_shop_button: true,
  morphe_hide_comments_preview_comment: true, morphe_hide_crowdfunding_box: true,
};
SCENES["original-vs-morphe"] = async () => {
  const { ctx, p } = await L.open({ ...GIF, prefs: { state: LIVED_IN } });
  await section(p, "watch");
  await capture(p, "original-vs-morphe.gif", async () => {
    await sleep(700);
    await tap(p, "#btnOrig"); await sleep(1700);
    await tap(p, "#btnMod"); await sleep(1700);
  }, CROP);
  await ctx.close();
};

// 7. Search: type a query, pick a result, land on the setting (Return YouTube Dislike's percentage), switch it
SCENES.search = async () => {
  const { ctx, p } = await L.open(GIF);
  await capture(p, "search.gif", async () => {
    await sleep(500);
    await tap(p, "#btnSearch"); await sleep(500);
    await type(p, "dislike"); await sleep(1000);
    await tap(p, ".sres .ttl", { text: "Show dislikes as percentage" }); await sleep(1900);
    await tapToggle(p, "morphe_ryd_dislike_percentage"); await sleep(1400);
  }, FULL);
  await ctx.close();
};

// 8b. Niconico flying comments switched on
SCENES.niconico = async () => {
  const { ctx, p } = await L.open(GIF);
  await section(p, "danmaku");
  await capture(p, "niconico.gif", async () => {
    await sleep(500);
    await tapToggle(p, "morphe_niconico_comments"); await sleep(4200);
  }, CROP);
  await ctx.close();
};

// 5. Live preview types: nine screens' previews in a grid, cut from the page at the preview's own box
SCENES.previews = async () => {
  const { ctx, p } = await L.open({ prefs: { state: { morphe_navigation_bar_glass: true, morphe_navigation_bar_glass_round: true, morphe_niconico_comments: true } } });
  const ids = ["player", "sponsorblock", "danmaku", "watch", "comments", "feed", "shorts", "miniplayer", "nav"]; // rows of similar height
  const files = [];
  for (const id of ids) {
    await section(p, id); await sleep(id === "danmaku" ? 1800 : 600);
    const box = await ev(p, () => { const r = document.querySelector(".stagebox").getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    const f = tmpPng("pv-" + id); await p.screenshot({ path: f, clip: box }); files.push(f);
  }
  await ctx.close();
  grid(files, 3, "previews.png", 24); files.forEach(f => fs.rmSync(f));
};
