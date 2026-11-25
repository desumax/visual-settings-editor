"use strict";
// The mock YouTube screens the preview draws, each component tagged with its setting.

// ------------------------------------------------------------------ scenes
const SCENES = {};

// Parts of the player that several screens draw (time, seekbar, player buttons) are tied to their
// setting wherever they appear: hide the time on Seekbar & gestures and it is gone on Controls and
// Fullscreen too, and Original brings it back everywhere. On a screen that doesn't own the setting
// they are greyed out (markFixed).
// The chapter chip (• chapter ›) sits right after the time on the time bar (Morphe hides both the chip
// and the chapter title next to the timestamp): drawn with the time everywhere, owned by Seekbar & gestures.
const sharedTime = (t, pos) => `<div style="position:absolute;${pos};display:flex;align-items:center;gap:6px">${C("hide_timestamp", `<div class="time">${t}</div>`)}${C("hide_chapters_timeline_button", `<div class="time" style="white-space:nowrap">• Building the frame ›</div>`)}</div>`;
const sharedSeek = (inner, pos, extra = "") => C("hide_seekbar", `<div class="seek" style="position:relative;left:0;right:0;${extra}">${inner}</div>`, { style: `position:absolute;${pos}` });
function videoFrame(i = 0, extra = "") {
  return `<div class="frame" style="background:${ART[i]}"></div>${extra}`;
}

// Another tab's preview can be this same player with its own parts added (SponsorBlock: its buttons in the
// bottom row, segments on the seekbar, the skip button), so what is set under Player controls shows there
// too (Max, round 136: one shared live preview). playerWith(add) draws it; add = { buttons, segs, time, over }.
let playerAdd = null;
function playerWith(add) { playerAdd = add; try { return SCENES.player(); } finally { playerAdd = null; } }
SCENES.player = () => {
  const add = playerAdd || {};
  const bgHidden = !!V("morphe_hide_player_control_buttons_background");
  const shade = bgHidden ? 0 : (Number(V("morphe_player_control_buttons_background_opacity")) / 100);
  const op = Number(V("morphe_player_overlay_opacity")) / 100;
  // "Show resolution on Quality button": 1080 instead of the FHD label
  const qual = `<span class="badge-txt">${V("morphe_video_quality_dialog_button_resolution") ? "1080" : "FHD"}</span>`;
  const list = [
    ["copy_video_link_button", I("link")], ["playback_speed_dialog_button", I("speed")], ["video_quality_dialog_button", qual],
    ["loop_video_button", I("loop")], ["mute_video_button", I("vol")], ["pip_button_overlay", I("pip")], ["reload_video_button", I("reload")],
    ["save_to_watch_later_button", I("clock")], ["playlist_panel_button", I("plist")], ["play_all_button", I("queue")],
    ["fullscreen_video_scale_button", I("crop")], ["video_delay_button_overlay", `<span class="badge-txt">ms</span>`], ["external_downloader_overlay_button", I("dl")],
  ];
  const btn = ([k, ic], extra = "") => C(k, `<div class="pbtn" style="width:32px;height:32px">${ic}</div>`, { cls: extra });
  const on = list.filter(([k]) => shown("morphe_" + k) || (mode === "mod" && (selected === "morphe_" + k || PARENT_OF[selected] === "morphe_" + k) && !trayOpen));
  const off = list.filter(([k]) => !shown("morphe_" + k));
  const pill = off.length && mode === "mod" && !playerAdd
    ? `<button class="traypill" data-tray aria-expanded="${trayOpen}" title="Buttons that are off">${I(trayOpen ? "close" : "plus")}<span>${off.length}</span></button>` : "";
  const tray = trayOpen && off.length && mode === "mod" && !playerAdd
    ? `<div class="tray" role="group" aria-label="Buttons that are off"><div class="trayhead">Off · tap to preview, hold to add</div><div class="trayrow">${off.map(b => btn(b, "intray")).join("")}</div></div>` : "";
  return `<div class="video">
    ${videoFrame(0)}
    ${C("hide_player_control_buttons_background", "", { also: "player_control_buttons_background_opacity", cls: "shade", style: `position:absolute;inset:0;background:rgba(0,0,0,${shade})` })}
    <div class="ctrls" style="position:absolute;inset:0;opacity:${Math.max(op, .08)};pointer-events:none">
      <div style="position:absolute;left:6px;top:6px">${pb("hide_collapse_button", I("down"))}</div>
      <div style="position:absolute;right:6px;top:6px;display:flex;gap:2px;align-items:center">
        ${C("hide_autoplay_button", `<div class="pbtn" style="width:48px"><div class="toggle-auto">${I("play")}</div></div>`)}
        ${pb("hide_captions_button", I("cc"))}${pb("hide_cast_button", I("cast"))}${pb("hide_settings_button", I("gear"))}
      </div>
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:28px;align-items:center">
        ${pb("hide_player_previous_next_buttons", I("prev"))}
        <div class="pbtn bigbtn">${I("pause")}</div>
        ${pb("hide_player_previous_next_buttons", I("next"))}
      </div>
      <div style="position:absolute;right:6px;bottom:18px;display:flex;gap:2px;max-width:340px;align-items:center">${pill}${add.buttons || ""}${on.map(b => btn(b)).join("")}${pb("hide_fullscreen_button", I("full"))}</div>
      ${sharedTime(add.time || "3:12 / 18:42", "left:12px;bottom:24px")}
      ${sharedSeek(`<div class="buf" style="width:40%"></div>${add.segs || ""}<div class="played" style="width:17%"></div><div class="knob" style="left:17%"></div>`, "left:12px;right:12px;bottom:10px")}
    </div>
    ${add.over || ""}
    ${tray}
  </div>`;
};
const CUSTOM_KEYS = new Set(["copy_video_link_button", "playback_speed_dialog_button", "video_quality_dialog_button", "loop_video_button", "mute_video_button", "pip_button_overlay", "reload_video_button", "save_to_watch_later_button", "playlist_panel_button", "play_all_button", "fullscreen_video_scale_button", "video_delay_button_overlay", "external_downloader_overlay_button"].map(k => "morphe_" + k));

SCENES.endscreen = () => {
  const auto = V("morphe_autoplay_mode");
  const card = (i) => `<div style="display:flex;gap:6px;align-items:center;background:rgba(0,0,0,.55);border-radius:6px;padding:4px;width:150px">${thumb(i, "width:64px;flex:none;border-radius:4px")}<div class="t2" style="color:#fff;font-size:10.5px;line-height:1.25">${esc(VIDEOS[i].t.slice(0, 38))}…</div></div>`;
  const upnext = (selected === "morphe_hide_autoplay_preview" || (auto === "AUTO" && selected !== "morphe_hide_end_screen_suggested_video"))
    ? C("hide_autoplay_preview", `<div style="width:124px;background:rgba(0,0,0,.6);border-radius:8px;padding:6px">
        <div style="font-size:10px;color:#ddd;margin-bottom:4px">Up next in <b style="color:#fff" class="cd">5</b></div>${thumb(3, "border-radius:6px")}
        <div style="font-size:10.5px;margin-top:4px;line-height:1.25">${esc(VIDEOS[3].t)}</div>
        <div style="display:flex;gap:6px;margin-top:6px"><span class="chip" style="height:22px;font-size:10.5px;padding:0 8px">Cancel</span><span class="chip" style="height:22px;font-size:10.5px;padding:0 8px;background:#fff;color:#000">Play now</span></div></div>`, { cls: "upnext" })
    : C("hide_end_screen_suggested_video", `<div style="width:124px;background:rgba(0,0,0,.6);border-radius:8px;padding:6px">
        <div style="font-size:10px;color:#ddd;margin-bottom:4px">You may also like</div>${thumb(5, "border-radius:6px")}
        <div style="font-size:10.5px;margin-top:4px;line-height:1.25">${esc(VIDEOS[5].t)}</div></div>`);
  return `<div class="video">
    ${videoFrame(1)}<div class="scrim" style="background:rgba(0,0,0,.35)"></div>
    <div style="position:absolute;left:8px;top:8px">${C("hide_end_screen_store_banner", `<div class="chip" style="height:24px;font-size:11px;background:rgba(0,0,0,.65)">${I("shop")} Official store · 4 items</div>`)}</div>
    <div style="position:absolute;right:8px;top:8px">${C("hide_info_cards", `<div class="pbtn" style="width:28px;height:28px;background:rgba(0,0,0,.5)">${I("info")}</div>`)}</div>
    <div style="position:absolute;left:10px;top:44px">${C("hide_end_screen_cards", `<div style="display:grid;gap:6px">${card(1)}${card(2)}</div>`)}</div>
    <div style="position:absolute;right:46px;top:30px">${upnext}</div>
    <div style="position:absolute;right:10px;bottom:12px">${C("hide_channel_watermark", `<div style="opacity:.8">${av(2, 26)}</div>`)}</div>
    ${sharedSeek(`<div class="played" style="width:100%"></div>`, "left:12px;right:12px;bottom:4px")}
  </div>`;
};

SCENES.seekbar = () => {
  const custom = V("morphe_seekbar_custom_color");
  const c1 = custom ? V("morphe_seekbar_custom_color_primary") : "#ff0033";
  const c2 = custom ? V("morphe_seekbar_custom_color_accent") : "#ff0033";
  const seekStyle = custom ? `--seek-1:${c1};` : "";
  return `<div class="video" style="${seekStyle}">
    ${videoFrame(3)}<div class="scrim" style="opacity:.35"></div>
    <div style="position:absolute;left:50%;top:38px;transform:translateX(-50%)">${C("hide_player_gesture_hints", `<div class="toastin" style="position:static;transform:none">Pull up for precise seeking</div>`)}</div>
    <div class="pbtn bigbtn" style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);background:rgba(0,0,0,.3)">${I("play")}</div>
    <div id="thumbBubble" style="position:absolute;left:calc(12px + 0.42 * (100% - 24px));bottom:40px;transform:translateX(-50%)">${C("seekbar_thumbnail_preview", `<div style="width:96px">${thumb(4, "border-radius:4px;border:2px solid #fff")}<div class="time" style="text-align:center;margin-top:2px">7:51</div></div>`)}</div>
    ${sharedTime("3:12 / 18:42", "left:12px;bottom:30px")}
    ${C("hide_seekbar", `<div class="seek" id="seek" style="position:relative;left:0;right:0;height:4px;${custom ? `background:linear-gradient(90deg,rgba(255,255,255,.3),rgba(255,255,255,.3))` : ""}">
        <div class="buf" style="width:55%"></div><div class="played" id="played" style="width:17%;${custom ? `background:linear-gradient(90deg,${c1},${c2})` : ""};transition:width .35s"></div>
        <div class="knob" id="knob" style="left:17%;transition:left .35s;${custom ? `background:${c2}` : ""}"></div>
        <div class="c knobring" id="knobRing" data-proxy="morphe_custom_seekbar_thumb" style="position:absolute;top:50%;translate:-50% -50%;left:17%;transition:left .35s;--kr:${V("morphe_custom_seekbar_thumb") && V("morphe_custom_seekbar_thumb_scale_type") === "ORIGINAL" ? 30 : 18}px"></div></div>`, { style: "position:absolute;left:12px;right:12px;bottom:10px;padding:6px 0" })}
    <div id="film" style="position:absolute;left:0;right:0;bottom:30px;display:none;gap:3px;padding:0 12px;justify-content:center">${[0, 1, 2, 3, 4].map(i => thumb(i + 1, "width:58px;border-radius:3px")).join("")}</div>
    <div class="finger" id="finger"></div>
  </div>`;
};

SCENES.watch = () => {
  const layout = V("morphe_video_action_bar_layout");
  const minimal = layout === "MINIMAL";
  const two = layout === "CLASSIC_TWO_ROWS";
  const act = (k, icon, label) => C(k, `<div class="chip" ${minimal ? 'style="padding:0 9px"' : ""}>${I(icon)}${minimal ? "" : label}</div>`);
  const likeChip = C("hide_like_dislike_button", `<div class="chip likechip" style="padding:0;gap:0"><span style="display:flex;gap:6px;align-items:center;padding:0 10px 0 12px;border-right:1px solid #444">${I("like")}${minimal ? "" : "48K"}</span><span style="padding:0 12px;display:flex">${I("dislike")}</span></div>`);
  const actions = [likeChip, act("hide_share_button", "share", "Share"), act("hide_remix_button", "remix", "Remix"), act("hide_thanks_button", "dollar", "Thanks"),
    act("hide_download_button", "dl", "Download"), act("hide_clip_button", "clip", "Clip"), act("hide_save_button", "save", "Save"), act("hide_ask_button", "spark", "Ask"),
    act("hide_hype_button", "fire", "Hype"), act("hide_shop_button", "shop", "Shop"), act("hide_promote_button", "speed", "Promote"), act("hide_stop_ads_button", "close", "Stop ads"),
    act("hide_report_button", "flag", "Report"), act("hide_more_button", "moreh", "")].join("");
  const rowStyle = two ? "display:flex;flex-wrap:wrap;gap:8px" : "display:flex;gap:8px;overflow-x:auto;scrollbar-width:none";
  return `<div style="background:#0f0f0f;height:330px;overflow-y:auto;scrollbar-width:thin" class="inner-scroll">
    <div style="height:96px;position:relative">${videoFrame(0)}${sharedSeek(`<div class="played" style="width:30%"></div>`, "left:0;right:0;bottom:0", "border-radius:0")}</div>
    <div style="padding:10px 12px 0">
      <div style="font-size:17px;font-weight:500;line-height:1.3">${esc(VIDEOS[0].t)}</div>
      <div class="t2" style="margin-top:4px">${VIDEOS[0].v} · ${VIDEOS[0].a} <b style="color:#fff">...more</b></div>
    </div>
    ${C("hide_channel_bar", `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px">${av(0, 32)}<div style="flex:1;min-width:0"><span class="t1">${VIDEOS[0].c}</span> <span class="t2">412K</span></div>
      ${C("hide_join_membership_button", `<div class="chip" style="background:transparent;border:1px solid #555">Join</div>`)}
      <div class="chip subbtn" style="background:#f1f1f1;color:#0f0f0f">Subscribe</div></div>`)}
    ${C("hide_action_bar", `<div style="${rowStyle};padding:0 12px 10px">${actions}</div>`)}
    ${C("hide_comments_section", `<div style="margin:0 12px 10px;background:#272727;border-radius:12px;padding:10px 12px">
        <div class="t1">Comments <span class="t2">1.2K</span></div>
        ${C("hide_comments_preview_comment", `<div style="display:flex;gap:8px;margin-top:8px;align-items:center">${av(4, 24)}<div class="t2" style="color:#ddd;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">The wood stove at 12:04 is pure cosiness</div></div>`)}
      </div>`, { blk: 1 })}
    ${C("hide_info_panels", `<div style="margin:0 12px 10px;border:1px solid #333;border-radius:12px;padding:10px 12px;display:flex;gap:10px">${I("info", "ico", 'style="fill:#aaa;flex:none"')}<div><div class="t1" style="font-size:13px">Norway · Context</div><div class="t2">Norway is a Nordic country in Northern Europe. Wikipedia</div></div></div>`, { blk: 1 })}
    ${C("hide_player_related_videos", `<div style="padding:0 12px 12px;display:grid;gap:10px">${[2, 3].map(i => `<div style="display:flex;gap:10px">${thumb(i, "width:150px;flex:none")}<div style="min-width:0"><div class="t1" style="font-size:13px">${esc(VIDEOS[i].t)}</div><div class="t2">${VIDEOS[i].c} · ${VIDEOS[i].v}</div></div></div>`).join("")}</div>`, { blk: 1 })}
  </div>`;
};

SCENES.fullscreen = () => {
  const scale = V("morphe_fullscreen_video_scale");
  // the video keeps its 16:9 frame (fit, black bars at the sides); stretch widens it to the screen and
  // squashes the picture, zoom scales it evenly so the top and bottom are cropped
  const vstyle = "left:9%;right:9%;top:0;bottom:0;transition:transform .35s var(--ease);transform:" + (scale === "STRETCH" ? "scaleX(1.22)" : scale === "ZOOM" ? "scale(1.22)" : "none");
  const q = (k, ic, label) => C(k, `<div class="chip" style="height:26px;font-size:11px;padding:0 9px;background:rgba(255,255,255,.14)">${I(ic)}${label}</div>`);
  return `<div class="video" style="background:#000">
    <div class="frame" style="${vstyle};position:absolute;background:${ART[0]}"></div>
    <div class="scrim" style="opacity:.4"></div>
    ${C("hide_video_title", `<div style="font-size:13px;font-weight:500;max-width:240px;line-height:1.25">${esc(VIDEOS[2].t)}</div>`, { style: "position:absolute;left:12px;top:10px" })}
    <div style="position:absolute;right:8px;top:4px;display:flex">${C("hide_captions_button", I("cc", "ico", 'style="margin:8px 6px"'))}${C("hide_settings_button", I("gear", "ico", 'style="margin:8px 6px"'))}</div>
    <div class="pbtn bigbtn" style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);background:rgba(0,0,0,.3)">${I("pause")}</div>
    ${C("hide_player_related_videos_overlay", `<div style="display:flex;gap:6px;padding:6px 8px;background:linear-gradient(transparent,rgba(0,0,0,.8))"><div class="t2" style="color:#fff;writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px">More videos</div>${[1, 4, 5].map(i => `<div style="width:96px">${thumb(i, "border-radius:4px")}<div style="font-size:9.5px;line-height:1.2;margin-top:2px">${esc(VIDEOS[i].t.slice(0, 30))}…</div></div>`).join("")}</div>`, { cls: "moreoverlay", style: "position:absolute;left:0;right:0;bottom:54px" })}
    ${C("hide_live_chat_replay_button", `<div class="chip" style="height:26px;font-size:11px;padding:0 9px;background:rgba(255,255,255,.14)">${I("chat")}Chat replay</div>`, { style: "position:absolute;right:10px;bottom:40px" })}
    ${sharedTime("21:40 / 41:05", "left:12px;bottom:36px")}
    ${sharedSeek(`<div class="played" style="width:52%"></div><div class="knob" style="left:52%"></div>`, "left:12px;right:12px;bottom:30px")}
    ${C("hide_quick_actions", `<div style="display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;height:26px;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 18px),transparent)">
      ${q("hide_quick_actions_like_button", "like", "120K")}${q("hide_quick_actions_dislike_button", "dislike", "")}${q("hide_quick_actions_comments_button", "comment", "1.4K")}${q("hide_quick_actions_live_chat_button", "chat", "")}
      ${q("hide_quick_actions_save_button", "save", "")}${q("hide_quick_actions_share_button", "share", "")}${q("hide_quick_actions_playlist_button", "plist", "")}
      ${q("hide_quick_actions_mix_button", "queue", "")}${q("hide_quick_actions_more_videos_button", "tv", "")}${q("hide_quick_actions_ask_button", "spark", "")}${q("hide_quick_actions_more_button", "moreh", "")}</div>`, { style: "position:absolute;left:10px;right:10px;bottom:6px;height:26px" })}
    <div id="hud" style="position:absolute;display:none;z-index:31"></div>
    <div class="finger" id="finger"></div>
  </div>`;
};

SCENES.feed = () => {
  const layout = V("morphe_feed_card_layout");
  // Default leaves it to YouTube's A/B test, which on most accounts now sends the card layout
  const cards = layout === "CARDS" || layout === "CARDS_WITH_ACTION_BUTTONS" || layout === "DEFAULT";
  const actions = layout === "CARDS_WITH_ACTION_BUTTONS";
  const abNote = layout === "DEFAULT" && selected === "morphe_feed_card_layout" ? `<div class="demo-label" style="position:sticky;top:6px;left:8px;z-index:30;display:inline-block;margin:6px 8px 0">Default: YouTube picks per account (A/B test), often cards</div>` : "";
  const vcard = (i, opts = {}) => {
    const progress = C("hide_seekbar_thumbnail", `<div style="height:3px;background:rgba(255,255,255,.3)"><div style="height:3px;width:${opts.prog || 0}%;background:#ff0033"></div></div>`, { style: "position:absolute;left:0;right:0;bottom:0" });
    const tn = C("hide_video_thumbnail", `<div style="position:relative">${thumb(i, cards ? "border-radius:12px 12px 0 0" : "border-radius:0", `<span class="dur">${VIDEOS[i].d}</span>${opts.prog ? progress : ""}${C("feed_watch_later_button", `<span style="width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.65);display:grid;place-items:center">${I("clock", "ico", 'style="width:16px;height:16px"')}</span>`, { style: "position:absolute;right:8px;top:8px" })}${C("native_queue_thumbnail_button", `<span style="width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.65);display:grid;place-items:center">${I("queue", "ico", 'style="width:16px;height:16px"')}</span>`, { style: "position:absolute;right:42px;top:8px" })}${i === 1 ? C("hide_video_labels", `<span style="display:flex;gap:4px"><span style="padding:1px 5px;border-radius:3px;background:#f1f1f1;color:#0f0f0f;font-size:10px;font-weight:600">NEW</span><span style="padding:1px 5px;border-radius:3px;background:rgba(0,0,0,.7);font-size:10px;font-weight:600">4K</span></span>`, { style: "position:absolute;left:8px;top:8px" }) : ""}`)}</div>`, { blk: 1 });
    const meta = `<div style="display:flex;gap:10px;padding:10px 12px ${actions ? 4 : 12}px">${av(i, 34)}<div style="flex:1;min-width:0"><div class="t1"${cards ? ' style="font-weight:400"' : ""}>${esc(VIDEOS[i].t)}</div>
      <div class="t2" style="display:flex;flex-wrap:wrap;gap:0 4px;margin-top:2px"><span>${VIDEOS[i].c}</span>${C("hide_view_count", `<span>· ${VIDEOS[i].v}</span>`, { tag: "span" })}${C("hide_upload_time", `<span>· ${VIDEOS[i].a}</span>`, { tag: "span" })}</div></div>${I("more", "ico", 'style="width:18px;height:18px;flex:none"')}</div>`;
    // FeedCardLayoutPatch: compact mono text buttons under the card: like, comment (opens the video with its
    // comments) and save (to Watch later), lined up under the title
    const tb = (n, t) => `<span style="display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border-radius:14px;font-size:12px;font-weight:500;color:#f1f1f1">${I(n, "ico", 'style="width:18px;height:18px"')}${t}</span>`;
    const acts = actions ? `<div class="c" data-also="morphe_feed_card_layout"${i ? "" : ' data-focus="morphe_feed_card_layout"'} style="display:flex;gap:2px;padding:0 8px 8px 48px">${tb("like", ["48K", "12K", "3.4K"][i % 3])}${tb("comment", ["1.2K", "341", "88"][i % 3])}${tb("save", "Save")}</div>` : "";
    // cards: 12 dp corners, 12 dp at the sides and 6 dp above and below each card (12 between two)
    // what the layout changes stands for the setting, so it flashes on a change instead of the whole preview
    // (round 137): the action rows when the layout adds them, otherwise each card's frame
    return `<div${actions ? "" : ' class="c" data-also="morphe_feed_card_layout"'} style="${cards ? "margin:6px 12px;background:#1c1c1c;border-radius:12px;overflow:hidden" : "margin-bottom:6px"}">${tn}${meta}${acts}</div>`;
  };
  const logo = `<div style="width:28px;height:20px;border-radius:6px;background:#ff0033;display:grid;place-items:center">${I("play", "ico", 'style="width:14px;height:14px"')}</div><b style="font-size:17px;letter-spacing:-.4px">YouTube</b>`;
  const doodle = `<div class="doodle"><span style="background:#4285f4">Y</span><span style="background:#ea4335">o</span><span style="background:#fbbc05">u</span><span style="background:#34a853">T</span><span style="background:#ff0033">ube</span></div>`;
  return `<div style="background:#0f0f0f;height:350px;overflow-y:auto;scrollbar-width:thin" class="inner-scroll">
    ${abNote}
    <div style="display:flex;align-items:center;padding:8px 6px 4px 12px;gap:4px">
      ${C("hide_youtube_doodles", doodle, { style: "display:flex;align-items:center" })}<div class="plainlogo" style="display:flex;align-items:center;gap:4px">${logo}</div>
      <div style="flex:1"></div>${C("hide_cast_button", I("cast", "ico", 'style="margin:0 8px"'))}${I("bell", "ico", 'style="margin:0 8px"')}${I("search", "ico", 'style="margin:0 8px"')}
    </div>
    ${C("hide_filter_bar_in_feed", `<div style="display:flex;gap:8px;padding:10px 12px;overflow-x:auto;scrollbar-width:none">${["All", "Music", "Live", "Gaming", "Podcasts", "Trains"].map((t, i) => `<span class="chip" style="${i === 0 ? "background:#f1f1f1;color:#0f0f0f" : ""}">${t}</span>`).join("")}</div>`, { blk: 1 })}
    ${vcard(0, { prog: 64 })}
    ${C("hide_shorts_home", `<div style="padding:4px 12px 14px"><div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">${I("shorts", "ico", 'style="fill:#ff0033"')}<b style="font-size:16px">Shorts</b></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[5, 6, 7].map(i => `<div style="aspect-ratio:9/16;border-radius:8px;background:${ART[i]};position:relative"><div style="position:absolute;left:6px;bottom:6px;right:6px;font-size:11px;font-weight:500">${["Snow in 3 seconds", "Cat vs cucumber", "Tiny pancakes"][i - 5]}</div></div>`).join("")}</div></div>`, { blk: 1 })}
    ${C("hide_community_posts", `<div style="margin:0 12px 14px;border:1px solid #333;border-radius:12px;padding:12px"><div style="display:flex;gap:8px;align-items:center">${av(3, 24)}<span class="t1" style="font-size:13px">Pocket Science</span><span class="t2">· 1 day ago</span></div><div style="font-size:13.5px;margin-top:8px;line-height:1.4">Next week: why ice is slippery. Guess the answer below!</div><div style="display:flex;gap:16px;margin-top:10px" class="t2">${I("like", "ico", 'style="width:18px;height:18px;fill:#aaa"')} 2.1K ${I("comment", "ico", 'style="width:18px;height:18px;fill:#aaa"')} 340</div></div>`, { blk: 1 })}
    ${C("hide_mix_playlists", `<div style="display:flex;gap:10px;padding:0 12px 14px"><div style="width:150px;flex:none;position:relative">${thumb(4)}<div style="position:absolute;right:0;top:0;bottom:0;width:44%;background:rgba(0,0,0,.7);display:grid;place-items:center;border-radius:0 8px 8px 0">${I("queue")}</div></div><div><div class="t1" style="font-size:13px">Mix: Lo-fi beats</div><div class="t2">Midnight Tapes, Nujabes and more</div></div></div>`, { blk: 1 })}
    ${vcard(1)}
    ${C("hide_live_streams", `<div style="position:relative">${vcard(2)}<span style="position:absolute;left:${cards ? 18 : 8}px;top:8px;background:#cc0000;font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px">LIVE</span></div>`, { blk: 1 })}
  </div>`;
};

// Where each part sits follows ShortsFilter (round 136 fix pass): everything in its suggestedActionsBuffer
// (shop, tagged products, location, save music, search suggestions, Super Thanks, use sound, use template,
// upcoming, effect, green screen, new posts, hashtag) is a pill in the row above the channel; the AI button,
// the full video link and the sound label are items of the reel carousel, the line of labels at the bottom.
SCENES.shorts = () => {
  const rb = (k, icon, label) => C(k, `<div style="display:grid;justify-items:center;gap:1px"><div class="pbtn" style="width:36px;height:36px;background:rgba(255,255,255,.12)">${icon}</div><span style="font-size:10px;font-weight:500;line-height:12px">${label}</span></div>`);
  return `<div style="position:relative;height:420px;background:${ART[5]};overflow:hidden" id="shortsStage">
    <div style="position:absolute;inset:0;background:linear-gradient(transparent 55%,rgba(0,0,0,.7))"></div>
    <div style="position:absolute;right:10px;top:8px;display:flex;gap:6px">${I("search")}${I("more")}</div>
    <div style="position:absolute;right:6px;bottom:${shown("morphe_hide_shorts_navigation_bar") ? 64 : 14}px;display:grid;gap:6px;justify-items:center">
      ${rb("hide_shorts_like_button", I("like"), "12K")}
      ${rb("hide_shorts_comments_button", I("comment"), "341")}${rb("hide_shorts_share_button", I("share"), "Share")}${rb("hide_shorts_save_button", I("save"), "Save")}${rb("hide_shorts_remix_button", I("remix"), "Remix")}
      ${C("hide_shorts_sound_button", `<div style="width:30px;height:30px;border-radius:8px;border:2px solid #fff;background:${ART[3]}"></div>`)}
    </div>
    <div style="position:absolute;left:10px;right:70px;bottom:${shown("morphe_hide_shorts_navigation_bar") ? 60 : 12}px;display:grid;gap:6px">
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${C("hide_shorts_tagged_products", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">${I("shop")} 2 products</span>`)}
        ${C("hide_shorts_shop_button", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">${I("shop")} Shop</span>`)}
        ${C("hide_shorts_use_template_button", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">Use template</span>`)}
        ${C("hide_shorts_effect_button", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">${I("spark")} Effect</span>`)}
        ${C("hide_shorts_green_screen_button", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">Green screen</span>`)}
        ${C("hide_shorts_use_sound_button", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">${I("music")} Use sound</span>`)}
        ${C("hide_shorts_super_thanks_button", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">${I("dollar")} Thanks</span>`)}
        ${C("hide_shorts_location_label", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)">📍 Lisbon</span>`)}
        ${C("hide_shorts_hashtag_button", `<span class="chip" style="height:26px;font-size:11.5px;background:rgba(0,0,0,.5)"># cooking</span>`)}
      </div>
      ${C("hide_shorts_info_panel", `<div style="background:rgba(0,0,0,.5);border-radius:8px;padding:6px 8px;font-size:11px">${I("info", "ico", 'style="width:14px;height:14px;display:inline;vertical-align:-2px"')} Context: Snowflakes form around dust particles.</div>`)}
      ${C("hide_shorts_channel_bar", `<div style="display:flex;align-items:center;gap:8px">${av(5, 30)}<b style="font-size:13px">@tinykitchen</b>
          ${C("hide_shorts_subscribe_button", `<span class="chip" style="height:28px;background:#f1f1f1;color:#0f0f0f">Subscribe</span>`)}
          ${C("hide_shorts_join_button", `<span class="chip" style="height:28px;background:transparent;border:1px solid #fff">Join</span>`)}</div>`)}
      ${C("hide_shorts_video_title", `<div style="font-size:13.5px;line-height:1.3">Tiny pancakes for a tiny breakfast</div>`)}
      ${C("hide_shorts_preview_comment", `<div style="font-size:11.5px;color:#ddd;display:flex;gap:6px;align-items:center">${av(1, 18)}"I need these in my life"</div>`)}
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${C("hide_shorts_sound_metadata_label", `<span style="font-size:11.5px">${I("music", "ico", 'style="width:14px;height:14px;display:inline;vertical-align:-3px"')} Original sound · tinykitchen</span>`, { tag: "span" })}
        ${C("hide_shorts_ai_button", `<span style="font-size:11.5px">${I("info", "ico", 'style="width:14px;height:14px;display:inline;vertical-align:-3px"')} AI</span>`, { tag: "span" })}
        ${C("hide_shorts_full_video_link_label", `<span style="font-size:11.5px">${I("play", "ico", 'style="width:14px;height:14px;display:inline;vertical-align:-3px"')} Full video</span>`, { tag: "span" })}
      </div>
    </div>
    ${C("hide_shorts_navigation_bar", navBarStatic(), { style: "position:absolute;left:0;right:0;bottom:0" })}
    <div id="heart" style="position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) scale(0);transition:transform .25s;z-index:70">${I("heart", "ico", 'style="width:80px;height:80px;fill:#fff;filter:drop-shadow(0 2px 8px rgba(0,0,0,.55))"')}</div>
    <div class="finger" id="finger"></div>
  </div>`;
};

function navBar(plain) {
  const swap = !!V("morphe_swap_create_with_notifications_button");
  const narrow = !!V("morphe_narrow_navigation_buttons");
  const style = V("morphe_navigation_bar_style");
  const bg = plain ? "rgba(15,15,15,.96)" : style === "TRANSLUCENT" ? "rgba(15,15,15,.7)" : style === "TRANSPARENT" ? "transparent" : style === "OPAQUE" ? "#000" : "#0f0f0f";
  // YouTube's A/B layout without labels ("icon only" buttons); Morphe gives them their labels back unless
  // Disable navigation buttons without labels is switched off (ClassicSubscriptionsLayoutPatch)
  const iconOnly = !V("morphe_disable_icon_only_navigation_buttons");
  const lab = t => iconOnly ? "" : C("hide_navigation_button_labels", `<span style="font-size:10px;display:block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</span>`, { tag: "span", style: "max-width:100%;min-width:0;overflow:hidden" });
  const tab = (k, icon, t, extra = "") => C(k, `<div style="display:grid;justify-items:center;gap:2px;position:relative;min-width:0">${icon}${lab(t)}${extra}</div>`, { cls: "ntab" });
  const dot = C("hide_navigation_new_content_dot", `<span style="position:absolute;left:calc(50% + 7px);top:-1px;width:7px;height:7px;border-radius:50%;background:#ff0033;display:block"></span>`, { tag: "span", style: "position:absolute;inset:0;pointer-events:auto" });
  const center = swap
    ? tab("hide_notifications_button", I("bell"), "Notifications")
    : C("hide_create_button", `<div style="width:40px;height:40px;border-radius:50%;border:1.5px solid #fff;display:grid;place-items:center;margin:0 auto">${I("plus")}</div>`, { cls: "ntab" });
  return `<div class="navbar${narrow ? " narrow" : ""}" style="display:flex;justify-content:center;align-items:center;height:52px;padding:0 4px;background:${bg};border-top:1px solid #222">
    ${tab("hide_home_button", I("home"), "Home")}${tab("hide_shorts_button", I("shorts"), "Shorts")}${center}
    ${tab("hide_subscriptions_button", I("subs"), "Subscriptions", dot)}
    ${tab("show_search_button", I("search"), "Search")}${tab("show_watch_later_button", I("clock"), "Watch later")}${tab("show_settings_button", I("gear"), "Settings")}
    <div class="ntab" style="display:grid;justify-items:center;gap:2px">${av(6, 24)}${lab("You")}</div>
  </div>`;
}

SCENES.nav = () => {
  const logo = V("morphe_header_logo");
  const logoTxt = logo === "PREMIUM" ? "Premium" : logo === "MORPHE" ? "Morphe" : "YouTube";
  const swap = !!V("morphe_swap_create_with_notifications_button");
  const tb = (k, icon) => C(k, `<div class="pbtn">${icon}</div>`);
  const meta = i => `<div style="display:flex;gap:10px;padding:10px 12px">${av(i, 34)}<div><div class="t1">${esc(VIDEOS[i].t)}</div><div class="t2">${VIDEOS[i].c} · ${VIDEOS[i].v}</div></div></div>`;
  // the feed scrolls behind a glass bar: it is drawn one video further on, so a thumbnail (not a line of
  // text cut at the frame) shows through the capsule and the room under it
  const glassBar = !!V("morphe_navigation_bar_glass") && !V("morphe_hide_navigation_bar");
  return `<div style="background:#0f0f0f;height:330px;position:relative;overflow:hidden">
    <div style="display:flex;align-items:center;padding:6px 6px 6px 12px;gap:2px">
      ${C("header_logo", `<div style="display:flex;align-items:center;gap:4px"><div style="width:28px;height:20px;border-radius:6px;background:${logo === "MORPHE" ? "#1e5aa8" : "#ff0033"};display:grid;place-items:center">${I("play", "ico", 'style="width:14px;height:14px"')}</div><b style="font-size:17px;letter-spacing:-.4px">${logoTxt}</b></div>`)}
      <div style="flex:1"></div>
      ${C("hide_cast_button", I("cast", "ico", 'style="margin:0 8px"'))}${tb("hide_toolbar_chat_button", I("chat"))}
      ${swap ? tb("hide_toolbar_create_button", I("plus")) : tb("hide_toolbar_notification_button", I("bell"))}
      ${tb("hide_toolbar_search_button", I("search"))}${tb("show_toolbar_settings_button", I("gear"))}
    </div>
    <div style="display:flex;gap:8px;padding:4px 12px 10px">${["All", "New to you", "Music"].map((t, i) => `<span class="chip" style="${i === 0 ? "background:#f1f1f1;color:#0f0f0f" : ""}">${t}</span>`).join("")}</div>
    ${glassBar ? meta(1) : ""}${thumb(2, "border-radius:0")}
    ${glassBar ? "" : meta(2)}
    ${C("hide_navigation_bar", navBar(false), { also: "disable_icon_only_navigation_buttons", style: "position:absolute;left:0;right:0;bottom:0" })}
  </div>`;
};

SCENES.comments = () => {
  const cm = (i, name, txt, likes) => `<div style="display:flex;gap:10px;padding:10px 12px">${av(i, 28)}<div style="flex:1;min-width:0">
    <div class="t2">@${name} · 2d</div><div style="font-size:13.5px;line-height:1.4;margin-top:2px">${txt}</div>
    ${C("hide_comments_translate_button", `<div style="font-size:12px;color:#3ea6ff;margin-top:4px">Translate to English</div>`)}
    <div style="display:flex;gap:16px;align-items:center;margin-top:6px" class="t2">${I("like", "ico", 'style="width:16px;height:16px;fill:#aaa"')}${likes}
      ${C("hide_comments_dislike_button", I("dislike", "ico", 'style="width:16px;height:16px;fill:#aaa"'))}${I("comment", "ico", 'style="width:16px;height:16px;fill:#aaa"')}
      ${C("hide_comments_gift_button", I("gift", "ico", 'style="width:16px;height:16px;fill:#aaa"'))}</div></div>
    ${C("hide_comments_menu_button", I("more", "ico", 'style="width:18px;height:18px"'))}</div>`;
  return `<div style="background:#0f0f0f;height:350px;position:relative;overflow:hidden">
    <div style="height:60px;position:relative">${videoFrame(0)}</div>
    <div style="position:absolute;left:0;right:0;top:44px;bottom:0;background:#212121;border-radius:14px 14px 0 0;overflow-y:auto;scrollbar-width:thin">
      <div style="width:36px;height:4px;border-radius:2px;background:#555;margin:8px auto"></div>
      <div style="display:flex;align-items:center;padding:0 12px 6px;gap:8px"><b style="font-size:16px">Comments</b><span class="t2">1.2K</span><div style="flex:1"></div>
        ${C("hide_comments_info_button", I("info", "ico", 'style="width:20px;height:20px"'))}${I("sort", "ico", 'style="width:20px;height:20px"')}${I("close", "ico", 'style="width:20px;height:20px"')}</div>
      ${C("hide_comments_filter_bar_options", `<div style="display:flex;gap:8px;padding:2px 12px 8px">${["Top", "Newest", "Timed"].map((t, i) => `<span class="chip" style="height:28px;${i === 0 ? "background:#f1f1f1;color:#0f0f0f" : "background:#3a3a3a"}">${t}</span>`).join("")}</div>`, { blk: 1 })}
      ${C("hide_timed_reactions", `<div style="display:flex;gap:10px;align-items:center;padding:0 12px 8px;font-size:17px">❤️ 😂 🔥 😮<span class="t2" style="font-size:12px">React at this moment</span></div>`, { blk: 1 })}
      ${C("hide_comments_ai_chat_summary", `<div style="margin:0 12px 8px;padding:8px 10px;border-radius:10px;background:#2c2c3a;font-size:12.5px;line-height:1.4">${I("spark", "ico", 'style="width:14px;height:14px;display:inline;vertical-align:-2px;fill:#b9a3ff"')} Viewers love the wood stove and want a follow-up on the roof.</div>`, { blk: 1 })}
      ${C("hide_comments_community_guidelines", `<div class="t2" style="padding:0 12px 6px">Remember to keep comments respectful and to follow our Community Guidelines</div>`, { blk: 1 })}
      ${C("hide_comments_channel_guidelines", `<div class="t2" style="padding:0 12px 6px">Channel guidelines: no spoilers please</div>`, { blk: 1 })}
      <div style="display:flex;align-items:center;gap:8px;padding:6px 12px 8px">${av(6, 26)}<div style="flex:1;color:#aaa;font-size:13px">Add a comment...</div>
        ${C("hide_comments_emoji_button", I("emoji", "ico", 'style="width:20px;height:20px"'))}${C("hide_comments_timestamp_button", I("clock", "ico", 'style="width:20px;height:20px"'))}
        ${C("hide_comments_gif_button", `<span class="badge-txt">GIF</span>`)}${C("hide_comments_thanks_button", I("dollar", "ico", 'style="width:20px;height:20px"'))}</div>
      ${C("hide_comments_create_a_short_button", `<div style="margin:0 12px 6px"><span class="chip" style="height:28px;background:#3a3a3a">${I("shorts")} Create a Short</span></div>`, { blk: 1 })}
      ${cm(2, "nordiclight", 'The wood stove at <span style="color:#3ea6ff">12:04</span> is pure cosiness', "2.4K")}
      ${cm(5, "carpenter_jo", "Kom igjen! Taket trenger en egen video.", "381")}
    </div>
  </div>`;
};

// What a bottom sheet (the player menu, its Quality, Captions and Audio track sheets) opens over: the
// watch page, dimmed, as in the app. Whenever a sheet slides away or in, this is what shows behind it,
// never an empty black screen.
const sheetBackdrop = (i = 4) => `<div class="shbg" style="position:absolute;inset:0;pointer-events:none">
    <div style="aspect-ratio:16/9;position:relative">${videoFrame(i)}</div>
    <div style="padding:10px 12px 4px"><div class="t1" style="font-size:15px">${esc(VIDEOS[i].t)}</div><div class="t2">${VIDEOS[i].c} · ${VIDEOS[i].v}</div></div>
    <div style="display:flex;gap:10px;align-items:center;padding:6px 12px">${av(i, 30)}<span style="flex:1;font-size:13px">${VIDEOS[i].c}</span><span style="padding:6px 12px;border-radius:16px;background:#f1f1f1;color:#0f0f0f;font-size:12.5px;font-weight:500">Subscribe</span></div>
    <div style="padding:8px 12px;display:grid;gap:10px">${[1, 2].map(j => `<div style="display:flex;gap:10px">${thumb(j, "width:140px;flex:none")}<div style="min-width:0"><div class="t1">${esc(VIDEOS[j].t)}</div><div class="t2">${VIDEOS[j].c}</div></div></div>`).join("")}</div>
    <div style="position:absolute;inset:0;background:rgba(0,0,0,.6)"></div></div>`;
SCENES.flyout = () => {
  const row = (k, icon, t, val = "") => C(k, `<div style="display:flex;align-items:center;gap:16px;padding:11px 18px">${I(icon)}<span style="flex:1;font-size:14px">${t}</span><span class="t2">${val}</span></div>`, { blk: 1 });
  return `<div style="background:#0f0f0f;height:350px;position:relative;overflow:hidden">
    ${sheetBackdrop(4)}
    <div class="inner-scroll" style="position:absolute;left:0;right:0;top:56px;bottom:0;background:#212121;border-radius:14px 14px 0 0;overflow-y:auto;scrollbar-width:thin;padding-bottom:8px">
      <div style="width:36px;height:4px;border-radius:2px;background:#555;margin:8px auto 4px"></div>
      ${row("hide_player_flyout_quality", "tune", "Quality", "Auto (1080p)")}${row("hide_player_flyout_captions", "cc", "Captions", "Off")}
      ${row("hide_player_flyout_speed", "speed", "Playback speed", "Normal")}${row("hide_player_flyout_sleep_timer", "timer", "Sleep timer", "Off")}
      ${row("hide_player_flyout_loop_video", "loop", "Loop video", "Off")}${row("hide_player_flyout_ambient_mode", "bright", "Ambient mode", "On")}
      ${row("hide_player_flyout_lock_screen", "lock", "Lock screen")}${row("hide_player_flyout_stable_volume", "vol", "Stable volume", "On")}
      ${row("hide_player_flyout_audio_track", "music", "Audio track", "English (original)")}${row("pip_button_flyout", "pip", "Picture-in-picture")}${row("save_to_watch_later_flyout_button", "clock", "Save to Watch later")}
      ${row("video_delay_button_flyout", "clock", "Video delay", "0 ms")}${row("hide_player_flyout_listen_with_youtube_music", "music", "Listen with YouTube Music")}
      ${row("hide_player_flyout_watch_in_vr", "vr", "Watch in VR")}${row("hide_player_flyout_on_the_go", "gesture", "On the go")}
      ${row("hide_player_flyout_additional_settings", "gear", "Additional settings")}${row("hide_player_flyout_help", "help", "Help & feedback")}
    </div>
  </div>`;
};

SCENES.captions = () => {
  const scale = Number(V("morphe_caption_scale")) / 100;
  const sec = V("morphe_secondary_caption_language");
  const fs = (14 * scale).toFixed(1);
  return `<div class="video">${videoFrame(7)}<div class="scrim" style="opacity:.15"></div>
    ${C("caption_scale", `<div style="display:grid;justify-items:center;gap:2px"><span id="capLine" style="background:rgba(8,8,8,.75);padding:2px 6px;font-size:${fs}px;line-height:1.3">the pancake needs to rest for one minute</span>
      ${C("secondary_caption_language", `<span style="background:rgba(8,8,8,.75);padding:2px 6px;font-size:${(fs * .9).toFixed(1)}px;color:#ffe680">${sec && sec !== "off" ? CAP_LINE[sec] || CAP_LINE.es : "(no second language)"}</span>`, { tag: "span", cls: sec && sec !== "off" ? "" : selected === "morphe_secondary_caption_language" ? "off ghost" : "off" })}</div>`, { style: "position:absolute;left:12px;right:12px;bottom:14px;display:flex;justify-content:center" })}
    ${C("captions_in_pip", `<div style="width:110px;position:relative;border-radius:6px;overflow:hidden;border:1px solid #444">${thumb(7, "border-radius:0")}<span style="position:absolute;left:4px;right:4px;bottom:3px;background:rgba(8,8,8,.8);font-size:7.5px;text-align:center">rest for one minute</span></div>`, { style: "position:absolute;right:8px;top:8px" })}
  </div>`;
};

SCENES.miniplayer = () => {
  const type = V("morphe_miniplayer_type");
  const round = !V("morphe_miniplayer_disable_rounded_corners");
  const op = Number(V("morphe_miniplayer_opacity")) / 100;
  const w = Math.max(140, Math.min(260, Number(V("morphe_miniplayer_width_dip")) || 192));
  let mini = "";
  if (type === "DISABLED") mini = `<div class="demo-label" style="top:auto;bottom:66px;left:12px">Miniplayer disabled: closing the player stops the video</div>`;
  else if (type === "DEFAULT" || type === "MINIMAL" || type === "MINIMAL_BAR_2") {
    const minimal = type !== "DEFAULT";
    mini = `<div style="position:absolute;left:0;right:0;bottom:52px;background:#212121;display:flex;align-items:center;gap:10px;padding-right:8px;opacity:${op}">
      <div style="width:${minimal ? 70 : 96}px;flex:none">${thumb(0, "border-radius:0")}</div>
      ${C("miniplayer_hide_title", `<div style="min-width:0"><div style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(VIDEOS[0].t)}</div><div class="t2">${VIDEOS[0].c}</div></div>`, { style: "flex:1;min-width:0" })}
      ${C("miniplayer_hide_overlay_buttons", `<div style="display:flex">${I("pause", "ico", 'style="margin:6px"')}${I("close", "ico", 'style="margin:6px"')}</div>`)}
      <div style="position:absolute;left:0;right:0;top:0;height:2px;background:#555"><div style="width:30%;height:2px;background:#ff0033"></div></div></div>`;
  } else {
    mini = `<div style="position:absolute;right:10px;bottom:62px;width:${w}px;opacity:${op}">
      <div style="position:relative;border-radius:${round ? 12 : 0}px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.6)">${thumb(0, "border-radius:0")}
        ${C("miniplayer_hide_overlay_buttons", `<div style="position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:space-between;padding:4px">${I("full", "ico", 'style="width:18px;height:18px"')}<div style="display:flex;gap:10px;align-self:center">${I("prev", "ico", 'style="width:20px;height:20px"')}${I("pause", "ico", 'style="width:26px;height:26px"')}${I("next", "ico", 'style="width:20px;height:20px"')}</div>${I("close", "ico", 'style="width:18px;height:18px"')}</div>`, { style: "position:absolute;inset:0" })}
      </div>
      ${C("miniplayer_hide_title", `<div style="font-size:11.5px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(VIDEOS[0].t)}</div>`)}
    </div>`;
  }
  return `<div style="background:#0f0f0f;height:350px;position:relative;overflow:hidden">
    <div style="margin:8px 10px;background:#2b2b2b;border-radius:16px;padding:10px 12px;display:flex;gap:10px;align-items:center">
      <div style="width:40px;height:40px;border-radius:8px;background:${ART[0]};flex:none"></div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(VIDEOS[0].t)}</div><div class="t2">YouTube · media notification</div>
        ${C("disable_notification_media_seekbar", `<div style="height:3px;background:#555;border-radius:2px;margin-top:6px"><div style="width:30%;height:3px;background:#fff;border-radius:2px"></div></div>`)}</div>
      <div style="display:flex;align-items:center">${C("hide_notification_media_prev_next", I("prev", "ico", 'style="width:20px;height:20px;margin:4px"'))}${I("pause", "ico", 'style="margin:4px"')}${C("hide_notification_media_prev_next", I("next", "ico", 'style="width:20px;height:20px;margin:4px"'))}</div>
    </div>
    <div style="padding:0 12px">${thumb(3)}<div style="display:flex;gap:10px;padding:10px 0">${av(3, 34)}<div><div class="t1">${esc(VIDEOS[3].t)}</div><div class="t2">${VIDEOS[3].c} · ${VIDEOS[3].v}</div></div></div></div>
    ${mini}
    <div style="position:absolute;left:0;right:0;bottom:0">${navBarStatic()}</div>
  </div>`;
};
function navBarStatic() {
  return `<div style="display:flex;justify-content:space-around;align-items:center;height:52px;background:#0f0f0f;border-top:1px solid #222">${["home", "shorts", "plus", "subs", "you"].map(n => I(n)).join("")}</div>`;
}

// ------------------------------------------------------------------ more sections and scenes
let fading = new Set(), trayOpen = false, baseline = {}, returnTo = null, pickerOpen = false;

const EXTRA_SECTIONS = [
  { id: "description", icon: "list", title: "Description", scopes: [["PLAYER", "morphe_hide_description_components_screen"]] },
  { id: "ambient", icon: "bright", title: "Ambient mode", scopes: [["PLAYER", "morphe_ambient_mode_screen"]] },
  { id: "danmaku", icon: "chat", title: "Flying comments", scopes: [["PLAYER", "morphe_niconico_comments_screen"]] },
  { id: "channel", icon: "you", title: "Channel page", scopes: [["FEED", "morphe_channel_screen"]] },
  { id: "explore", icon: "search", title: "Explore menu", scopes: [["FEED", "morphe_explore_menu_screen"]] },
];
{
  const watch = SECTIONS.find(s => s.id === "watch");
  watch.scopes = watch.scopes.filter(([, sub]) => sub !== "morphe_hide_description_components_screen");
  const order = ["player", "endscreen", "seekbar", "fullscreen", "flyout", "captions", "watch", "description", "ambient", "comments", "danmaku", "miniplayer", "feed", "channel", "explore", "shorts", "nav", "misc"];
  const all = [...SECTIONS, ...EXTRA_SECTIONS];
  SECTIONS.length = 0;
  order.forEach(id => SECTIONS.push(all.find(s => s.id === id)));
}

const DESC = [
  ["hide_video_details_section", "Details", "1.2M views · 3 days ago · #cabin #norway"],
  ["hide_ai_generated_video_summary_section", "✦ Summary", "A two-week build of a 12 m² cabin using reclaimed pine."],
  ["hide_ask_section", "Ask", "Ask questions about this video"],
  ["hide_hype_points", "Hype", "2,410 points this week"],
  ["hide_key_concepts_section", "Key concepts", "Timber framing · Wood stove · Insulation"],
  ["hide_chapters_section", "Chapters", "0:00 Intro · 2:14 Foundation · 7:40 Walls · 12:04 Stove"],
  ["hide_search_inside_this_video_section", "Search inside this video", "Find moments by keyword"],
  ["hide_transcript_section", "Transcript", "Follow along using the transcript"],
  ["hide_how_this_was_made_section", "How this was made", "Altered or synthetic content: No"],
  ["hide_corrections_section", "Corrections", "1:20 The wall is 2.4 m, not 2.6 m"],
  ["hide_attributes_section", "Music", "Northern Lights · Midnight Tapes"],
  ["hide_featured_links_section", "Featured links", "fjordtimber.no · Tool list"],
  ["hide_featured_videos_section", "Featured videos", "Part 1 · Part 2 · Roofing"],
  ["hide_featured_playlists_section", "Featured playlists", "Cabin build (14 videos)"],
  ["hide_featured_channels_section", "Featured channels", "Slow Rails · Darkroom Diaries"],
  ["hide_channel_links_section", "Channel links", "Instagram · Patreon"],
  ["hide_hashtag_section", "Hashtags", "#cabin #norway #woodworking"],
  ["hide_explore_section", "Explore", "Explore more in Woodworking"],
  ["hide_explore_course_section", "Course", "Timber framing basics · 8 lessons"],
  ["hide_course_progress_section", "Course progress", "Lesson 3 of 8 completed"],
  ["hide_quizzes_section", "Quiz", "Which joint holds the roof beam?"],
  ["hide_explore_podcast_section", "Podcast", "Fjord & Timber Talks"],
  ["hide_info_cards_section", "Info cards", "Featured items and the channel card"],
];
// Morphe's Info cards section is YouTube's infocards_section (DescriptionComponentsFilter): the featured
// videos, playlists, channels and links (compact_infocard lockups), the channel card's Subscribe button and
// its link buttons all sit inside it, which is why Morphe makes them its sub-settings (parentNot). Hiding
// it takes all of them away; each sub-setting hides only its own part (Max, Nov 25).
const INFO_PARTS = ["hide_featured_videos_section", "hide_featured_playlists_section", "hide_featured_channels_section", "hide_featured_links_section", "hide_channel_links_section"];
// The description sheet as YouTube draws it: player on top, sheet with title, stats, text, then each
// section in its own shape (chapter strip, music row, chips, link rows, channel row at the end).
SCENES.description = () => {
  const H = (t, extra = "") => `<div style="display:flex;align-items:center;gap:6px;padding:14px 14px 8px"><b style="font-size:15px;flex:1">${t}</b>${extra}</div>`;
  const strip = items => `<div style="display:flex;gap:8px;padding:0 14px;overflow-x:auto;scrollbar-width:none">${items}</div>`;
  const linkRow = (icon, t, sub) => `<div style="display:flex;gap:12px;align-items:center;padding:6px 14px">${I(icon, "ico", 'style="fill:#aaa;flex:none"')}<div style="min-width:0"><div style="font-size:13px">${t}</div><div class="t2" style="color:#3ea6ff">${sub}</div></div></div>`;
  const btn = t => `<div style="margin:6px 14px 2px"><span class="chip" style="height:32px;background:transparent;border:1px solid #555;width:100%;justify-content:center">${t}</span></div>`;
  const SEC = {
    hide_video_details_section: () => `<div style="padding:4px 14px 6px"><div style="font-size:16px;font-weight:600;line-height:1.3">${esc(VIDEOS[0].t)}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center;margin:12px 0 10px">${[["48K", "Likes"], ["1.2M", "Views"], ["14 Nov", "2026"]].map(([a, b]) => `<div><b style="font-size:16px">${a}</b><div class="t2">${b}</div></div>`).join("")}</div>
      <div style="font-size:13px;line-height:1.45">Two weeks, one 12 m² cabin and a lot of reclaimed pine. <span style="color:#3ea6ff">#cabin #norway</span></div></div>`,
    hide_ai_generated_video_summary_section: () => `<div style="margin:10px 14px 0;padding:10px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(62,166,255,.14),rgba(180,120,255,.12))"><div style="display:flex;gap:6px;align-items:center;font-size:12px;font-weight:600">${I("spark", "ico", 'style="width:16px;height:16px"')}Summary</div><div style="font-size:12.5px;margin-top:4px;line-height:1.4">A two-week build of a 12 m² cabin using reclaimed pine, with a wood stove.</div></div>`,
    hide_ask_section: () => `<div style="padding:10px 14px 0"><span class="chip" style="height:32px;background:rgba(255,255,255,.1)">${I("spark")} Ask about this video</span></div>`,
    hide_hype_points: () => `<div style="display:flex;gap:10px;align-items:center;margin:10px 14px 0;padding:8px 12px;border-radius:12px;background:#2c2c2c">${I("fire", "ico", 'style="fill:#ff8a3d"')}<div><b style="font-size:13px">2,410 hype points</b><div class="t2">#4 in Woodworking this week</div></div></div>`,
    hide_key_concepts_section: () => H("Key concepts") + `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 14px">${["Timber framing", "Wood stove", "Insulation", "Off-grid"].map(t => `<span class="chip" style="height:28px">${t}</span>`).join("")}</div>`,
    hide_chapters_section: () => H("Chapters", `<span class="t2">View all</span>`) + strip([["0:00", "Intro", 0], ["2:14", "Foundation", 3], ["7:40", "Walls", 4], ["12:04", "Stove", 6]].map(([t, n, i]) => `<div style="width:118px;flex:none">${thumb(i, "border-radius:8px")}<div style="font-size:12px;margin-top:4px">${n}</div><div class="t2" style="color:#3ea6ff">${t}</div></div>`).join("")),
    hide_search_inside_this_video_section: () => `<div style="margin:12px 14px 0;display:flex;align-items:center;gap:8px;height:36px;border-radius:18px;background:#2c2c2c;padding:0 12px;color:#aaa;font-size:13px">${I("search", "ico", 'style="width:18px;height:18px;fill:#aaa"')}Search inside this video</div>`,
    hide_transcript_section: () => H("Transcript") + `<div class="t2" style="padding:0 14px">Follow along using the transcript.</div>` + btn("Show transcript"),
    hide_how_this_was_made_section: () => H("How this was made") + `<div style="display:flex;gap:10px;padding:0 14px;align-items:flex-start">${I("info", "ico", 'style="fill:#aaa;flex:none"')}<div style="font-size:12.5px">Altered or synthetic content<div class="t2">Sound or visuals were not significantly edited or digitally generated.</div></div></div>`,
    hide_corrections_section: () => H("Corrections") + `<div style="padding:0 14px;font-size:12.5px"><span style="color:#3ea6ff">1:20</span> The wall is 2.4 m, not 2.6 m</div>`,
    hide_attributes_section: () => H("Music") + `<div style="display:flex;gap:10px;align-items:center;padding:0 14px"><div style="width:44px;height:44px;border-radius:6px;background:${ART[7]};flex:none"></div><div><div style="font-size:13px">Northern Lights</div><div class="t2">Midnight Tapes · Fjord Sessions</div></div></div>` + btn(`${I("music")} Music`),
    hide_featured_links_section: () => H("Featured links") + linkRow("link", "Tool list", "fjordtimber.no/tools") + linkRow("link", "Plans", "fjordtimber.no/plans"),
    hide_featured_videos_section: () => H("Featured videos") + strip([1, 2, 5].map(i => `<div style="width:140px;flex:none">${thumb(i, "border-radius:8px")}<div style="font-size:12px;margin-top:4px">${esc(VIDEOS[i].t.slice(0, 32))}…</div></div>`).join("")),
    hide_featured_playlists_section: () => H("Featured playlists") + `<div style="display:flex;gap:10px;padding:0 14px;align-items:center"><div style="width:120px;position:relative;flex:none">${thumb(4, "border-radius:8px")}<span class="dur">${I("plist", "ico", 'style="width:12px;height:12px;vertical-align:-2px"')} 14</span></div><div><div style="font-size:13px">Cabin build</div><div class="t2">Fjord & Timber · Playlist</div></div></div>`,
    hide_featured_channels_section: () => H("Featured channels") + strip([[1, "Slow Rails"], [3, "Darkroom Diaries"], [5, "Pocket Science"]].map(([i, n]) => `<div style="display:grid;justify-items:center;gap:4px;width:84px;flex:none">${av(i, 52)}<div style="font-size:11.5px;text-align:center">${n}</div></div>`).join("")),
    hide_channel_links_section: () => `<div style="display:flex;gap:8px;padding:6px 14px;overflow-x:auto;scrollbar-width:none">${["Videos", "About", "Instagram", "Patreon"].map(t => `<span class="chip" style="height:32px;flex:none;padding:0 16px;justify-content:center;background:transparent;border:1px solid #555">${t}</span>`).join("")}</div>`,
    hide_info_cards_section: () => INFO_PARTS.slice(0, 4).map(k => sec(DESC.find(d => d[0] === k))).join("")
      + `<div style="display:flex;align-items:center;gap:10px;padding:16px 14px 6px;margin-top:10px;border-top:1px solid #333">${av(0, 36)}<div style="flex:1;min-width:0"><div class="t1">${VIDEOS[0].c}</div><div class="t2">412K subscribers</div></div>
        ${C("hide_subscribe_button", `<span class="chip" style="background:#f1f1f1;color:#0f0f0f;height:30px">Subscribe</span>`)}</div>`
      + sec(DESC.find(d => d[0] === "hide_channel_links_section")),
    hide_hashtag_section: () => `<div style="padding:10px 14px 0;font-size:13px;color:#3ea6ff">#cabin #norway #woodworking #offgrid</div>`,
    hide_explore_section: () => H("Explore more") + `<div style="margin:0 14px;padding:10px 12px;border-radius:12px;background:#2c2c2c;display:flex;gap:10px;align-items:center">${I("tv")}<div style="font-size:13px">Woodworking<div class="t2">Topic</div></div></div>`,
    hide_explore_course_section: () => H("Course") + `<div style="margin:0 14px;padding:10px 12px;border-radius:12px;background:#2c2c2c;display:flex;gap:10px;align-items:center">${thumb(3, "width:72px;border-radius:6px;flex:none")}<div style="font-size:13px">Timber framing basics<div class="t2">8 lessons · Free</div></div></div>`,
    hide_course_progress_section: () => `<div style="margin:10px 14px 0"><div style="font-size:12.5px">Lesson 3 of 8 completed</div><div style="height:4px;border-radius:2px;background:#3a3a3a;margin-top:6px"><div style="width:37%;height:4px;border-radius:2px;background:#3ea6ff"></div></div></div>`,
    hide_quizzes_section: () => H("Quiz") + `<div style="margin:0 14px;padding:10px 12px;border-radius:12px;border:1px solid #444;font-size:13px">Which joint holds the roof beam?<div style="display:flex;gap:6px;margin-top:8px">${["Mortise", "Dovetail", "Lap"].map(t => `<span class="chip" style="height:28px">${t}</span>`).join("")}</div></div>`,
    hide_explore_podcast_section: () => H("Podcast") + `<div style="display:flex;gap:10px;padding:0 14px;align-items:center"><div style="width:52px;height:52px;border-radius:8px;background:${ART[6]};flex:none"></div><div style="font-size:13px">Fjord & Timber Talks<div class="t2">Podcast · 32 episodes</div></div></div>`,
  };
  function sec([k, t, b]) { return C(k, SEC[k] ? SEC[k]() : H(esc(t)) + `<div class="t2" style="padding:0 14px">${esc(b)}</div>`, { blk: 1 }); }
  return `<div style="background:#0f0f0f;height:350px;position:relative;overflow:hidden">
    <div style="height:84px;position:relative">${videoFrame(0)}</div>
    <div class="inner-scroll" style="position:absolute;left:0;right:0;top:70px;bottom:0;background:#212121;border-radius:14px 14px 0 0;overflow-y:auto;scrollbar-width:thin;padding-bottom:14px">
      <div style="width:36px;height:4px;border-radius:2px;background:#555;margin:8px auto 0"></div>
      <div style="display:flex;align-items:center;padding:6px 14px 2px;border-bottom:1px solid #333"><b style="font-size:17px;flex:1;padding:6px 0">Description</b>${I("close", "ico", 'style="width:20px;height:20px"')}</div>
      ${DESC.filter(d => !INFO_PARTS.includes(d[0])).map(sec).join("")}
    </div></div>`;
};

// Ambient mode (Max, Nov 23 PM: the old drawing read poorly): a watch page with a film in the player
// (black bars above and below it). Ambient mode: a soft glow of the film's colours spills from under the
// player onto the page. Disabled: a plain dark page. Enhanced: the whole page and the black bars are lit
// with the film itself, as bright as Light strength, as soft as Light blur (0 keeps its shapes), with a
// shade behind the text when Keep text readable is on.
const AMB_ART = "radial-gradient(circle at 72% 38%,#ffd36b 0 9%,transparent 10%),linear-gradient(180deg,#ff8a3d 0%,#e2456f 45%,#3b2a7a 100%)";
const AMB_GLOW = "radial-gradient(ellipse at 50% 30%,rgba(255,138,61,.85) 0%,rgba(226,69,111,.55) 38%,transparent 70%)";
SCENES.ambient = () => {
  const enh = !!V("morphe_enhanced_ambient_mode");
  const strength = Math.max(0, Math.min(1, Number(V("morphe_enhanced_ambient_mode_strength") ?? 100) / 100));
  const blur = Math.max(0, Number(V("morphe_enhanced_ambient_mode_blur")) || 0);
  const readable = enh && !!V("morphe_enhanced_ambient_mode_readable_text");
  const light = enh ? `<div style="position:absolute;inset:-30px;background:${AMB_ART};background-size:100% 70%;background-repeat:no-repeat;filter:blur(${6 + blur * .6}px) saturate(1.3);opacity:${(.35 + .5 * strength).toFixed(2)}"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,15,0) 0%,rgba(15,15,15,.25) 55%,rgba(15,15,15,.5) 100%)"></div>` : "";
  return `<div style="background:#0f0f0f;height:300px;position:relative;overflow:hidden">
    ${C("enhanced_ambient_mode", light, { also: "enhanced_ambient_mode_strength enhanced_ambient_mode_blur enhanced_ambient_mode_smoothing enhanced_ambient_mode_dim_while_scrolling enhanced_ambient_mode_dim_duration", cls: "shade", style: "position:absolute;inset:0" })}
    ${C("disable_ambient_mode", enh ? "" : `<div style="position:absolute;inset:0;background:${AMB_GLOW};filter:blur(14px)"></div>`, { also: "bypass_ambient_mode_restrictions", cls: "shade", style: "position:absolute;left:-12%;right:-12%;top:104px;height:130px" })}
    <div style="position:relative;z-index:1;height:150px;background:${enh ? "transparent" : "#000"}"><div style="position:absolute;left:0;right:0;top:24px;bottom:24px;background:${AMB_ART}"></div></div>
    ${C("enhanced_ambient_mode_readable_text", `<div style="padding:12px 14px 0">
      <div class="t1">${esc(VIDEOS[0].t)}</div><div class="t2">${VIDEOS[0].v} · ${VIDEOS[0].a}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px">${av(0, 26)}<div class="t1" style="flex:1;font-size:13px">${VIDEOS[0].c}</div><span class="chip" style="background:#f1f1f1;color:#0f0f0f;height:28px">Subscribe</span></div>
      <div style="display:flex;gap:6px;margin-top:10px">${["Like", "Share", "Save", "Clip"].map(t => `<span class="chip" style="height:28px;background:rgba(255,255,255,.12)">${t}</span>`).join("")}</div>
    </div>`, { style: `position:relative;z-index:1;${readable ? "background:linear-gradient(180deg,rgba(0,0,0,.45),rgba(0,0,0,.6));border-radius:12px;margin:6px 6px 0;padding-bottom:10px" : ""}` })}
  </div>`;
};

const DANMAKU = ["8888888", "the stove!!", "cosy", "草", "need this cabin", "wow the view", "who else is here in 2026", "beautiful", "the snow sound", "lol", "this is so calming", "ASMR vibes"];
const danmakuClock = { phase: 0, last: 0, period: 1 };
SCENES.danmaku = () => {
  const on = !!V("morphe_niconico_comments");
  const fs = Number(V("morphe_niconico_comments_font_size")) || 20;
  const op = (Number(V("morphe_niconico_comments_opacity")) || 100) / 100;
  const area = (Number(V("morphe_niconico_comments_display_area")) || 100) / 100;
  const dur = Number(V("morphe_niconico_comments_travel_duration")) || 7;
  const lanes = Math.max(1, Math.floor(203 * area / (fs * .8)));
  // Keep the flight position across re-renders: phase advances with time at the old speed,
  // so changing size, opacity, area or duration never restarts the comments.
  const period = dur * .55, now = performance.now();
  if (danmakuClock.last) danmakuClock.phase += (now - danmakuClock.last) / 1000 / danmakuClock.period;
  danmakuClock.last = now; danmakuClock.period = period;
  const items = on ? DANMAKU.map((t, i) => { const f = (danmakuClock.phase + i * 1.7 / DANMAKU.length) % 1; return `<span style="position:absolute;white-space:nowrap;left:100%;top:${(i % lanes) * fs * .8}px;font-size:${fs * .6}px;font-weight:700;color:#fff;text-shadow:0 0 2px #000,0 0 2px #000;animation:fly ${period}s linear ${-f * period}s infinite">${esc(t)}</span>`; }).join("") : "";
  return `<div class="video">${videoFrame(0)}<div class="scrim" style="opacity:.15"></div>
    <style>@keyframes fly{from{transform:translateX(0)}to{transform:translateX(calc(-360px - 100%))}}</style>
    ${C("niconico_comments", `<div style="position:absolute;left:0;right:0;top:0;height:${area * 100}%;overflow:hidden;opacity:${op};outline:${on ? "1px dashed rgba(255,255,255,.18)" : "0"}">${items}</div>`, { style: "position:absolute;inset:0", also: "niconico_comments_display_area" })}
    ${on ? "" : `<div class="demo-label">Flying comments are off</div>`}
  </div>`;
};

SCENES.channel = () => `<div class="inner-scroll" style="background:#0f0f0f;height:350px;overflow-y:auto;scrollbar-width:thin">
  <div style="height:70px;background:${ART[3]}"></div>
  <div style="display:flex;gap:12px;padding:12px">${av(0, 64)}<div style="min-width:0"><div style="font-size:20px;font-weight:700">${VIDEOS[0].c}</div><div class="t2">@fjordtimber · 412K subscribers · 230 videos</div>
    ${C("hide_links_preview", `<div class="t2" style="color:#ddd;margin-top:4px">fjordtimber.no and 3 more links</div>`)}</div></div>
  <div style="display:flex;gap:8px;padding:0 12px 10px;flex-wrap:wrap">
    ${C("hide_subscribe_button_in_channel_page", `<span class="chip" style="background:#f1f1f1;color:#0f0f0f">Subscribe</span>`)}
    ${C("hide_join_button", `<span class="chip" style="background:transparent;border:1px solid #555">Join</span>`)}
    ${C("hide_store_button", `<span class="chip">${I("shop")} Store</span>`)}
    ${C("hide_community_button", `<span class="chip">${I("chat")} Community</span>`)}
  </div>
  <div style="display:flex;gap:18px;padding:6px 12px 0;border-bottom:1px solid #333;font-size:14px;font-weight:500">${["Home", "Videos", "Shorts", "Live", "Posts", "Store"].map((t, i) => `<span style="padding-bottom:8px;${i === 0 ? "border-bottom:2px solid #fff" : "color:#aaa"}">${t}</span>`).join("")}</div>
  ${C("hide_filter_bar_in_channel_page", `<div style="display:flex;gap:8px;padding:10px 12px">${["Latest", "Popular", "Oldest"].map((t, i) => `<span class="chip" style="height:28px;${i === 0 ? "background:#f1f1f1;color:#0f0f0f" : ""}">${t}</span>`).join("")}</div>`, { blk: 1 })}
  ${C("hide_members_shelf", `<div style="padding:8px 12px"><b style="font-size:15px">Members-only videos</b><div style="display:flex;gap:8px;margin-top:8px">${[4, 5].map(i => thumb(i, "width:150px;flex:none")).join("")}</div></div>`, { blk: 1 })}
  <div style="display:flex;gap:10px;padding:10px 12px"><div style="position:relative;width:150px;flex:none">${thumb(1)}${C("hide_members_only_chip", `<span style="position:absolute;left:4px;top:4px;background:#2ba640;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">Members only</span>`, { tag: "span", style: "position:absolute;inset:0" })}</div><div><div class="t1" style="font-size:13px">Behind the build: the stove</div><div class="t2">Members only · 2 days ago</div></div></div>
  ${C("hide_posts_shelf", `<div style="margin:6px 12px 12px;border:1px solid #333;border-radius:12px;padding:12px"><b style="font-size:13px">Posts</b><div style="font-size:13px;margin-top:6px">Roof video drops Friday. What should we build next?</div></div>`, { blk: 1 })}
</div>`;

const EXPLORE = [["hide_music_menu", "music", "Music"], ["hide_movies_menu", "tv", "Movies & TV"], ["hide_live_menu", "speed", "Live"], ["hide_gaming_menu", "vr", "Gaming"], ["hide_news_menu", "list", "News"], ["hide_sports_menu", "fire", "Sports"], ["hide_learning_menu", "help", "Learning"], ["hide_courses_menu", "layers", "Courses"], ["hide_fashion_menu", "spark", "Fashion & Beauty"], ["hide_podcasts_menu", "mic", "Podcasts"], ["hide_playables_menu", "play", "Playables"], ["hide_shopping_menu", "shop", "Shopping"], ["hide_hype_menu", "fire", "Hype"], ["hide_memberships_menu", "you", "Memberships"]];
const MORE_YT = [["hide_youtube_premium_menu", "YouTube Premium"], ["hide_youtube_studio_menu", "YouTube Studio"], ["hide_youtube_music_menu", "YouTube Music"], ["hide_youtube_kids_menu", "YouTube Kids"], ["hide_youtube_create_menu", "YouTube Create"], ["hide_youtube_works_menu", "YouTube Works"]];
SCENES.explore = () => {
  const row = (k, ic, t, red) => C(k, `<div style="display:flex;align-items:center;gap:20px;padding:9px 18px">${I(ic, "ico", red ? 'style="fill:#ff0033"' : "")}<span style="font-size:14px">${t}</span></div>`, { blk: 1 });
  return `<div class="inner-scroll" style="background:#0f0f0f;height:350px;overflow-y:auto;scrollbar-width:thin">
    ${C("hide_explore_button", `<div style="padding:12px 18px 4px;font-size:16px;font-weight:700">Explore</div>`, { blk: 1 })}
    ${EXPLORE.map(([k, ic, t]) => row(k, ic, t)).join("")}
    <div style="padding:12px 18px 4px;font-size:16px;font-weight:700;border-top:1px solid #333;margin-top:6px">More from YouTube</div>
    ${MORE_YT.map(([k, t]) => row(k, "play", t, true)).join("")}
    ${C("hide_privacy_tos_footer", `<div class="t2" style="padding:12px 18px 16px">Privacy Policy · Terms of Service</div>`, { blk: 1 })}
  </div>`;
};

// Extra adapters on existing scenes, for coverage
def("description", "vis", DESC.map(d => d[0]).join(" ") + " hide_subscribe_button");
def("ambient", "vis", "disable_ambient_mode");
def("ambient", "style", "enhanced_ambient_mode enhanced_ambient_mode_strength enhanced_ambient_mode_blur enhanced_ambient_mode_readable_text");
def("danmaku", "behaviour", "niconico_comments");
def("danmaku", "style", "niconico_comments_font_size niconico_comments_opacity niconico_comments_display_area niconico_comments_travel_duration");
def("channel", "vis", "hide_links_preview hide_subscribe_button_in_channel_page hide_join_button hide_store_button hide_community_button hide_filter_bar_in_channel_page hide_members_shelf hide_members_only_chip hide_posts_shelf");
def("explore", "vis", ["hide_explore_button", "hide_privacy_tos_footer", ...EXPLORE.map(e => e[0]), ...MORE_YT.map(e => e[0])].join(" "));
def("watch", "vis", "hide_crowdfunding_box hide_emergency_box hide_medical_panels");
def("flyout", "vis", "hide_player_flyout_quality_header hide_player_flyout_quality_footer hide_player_flyout_captions_header hide_player_flyout_captions_footer hide_player_flyout_audio_track_footer");
def("comments", "vis", "hide_comments_top_fans_button hide_comments_gifs_and_images hide_comments_by_members_header hide_timed_reactions"); // timed reactions: the emoji bar of the comments and live chat (emoji_control_panel)
def("feed", "vis", "hide_post_like_dislike_buttons hide_post_dislike_button hide_post_comment_button hide_post_share_button hide_post_comments_preview hide_horizontal_shelves hide_playables hide_surveys hide_ticket_shelf");
def("seekbar", "style", "fullscreen_large_seekbar");

// Patch extra components into existing scenes without rewriting them
{
  const wrap = (id, fn) => { const base = SCENES[id]; SCENES[id] = () => fn(base()); };
  wrap("comments", html => html
    .replace('<b style="font-size:16px">Comments</b>', `<b style="font-size:16px">Comments</b>${C("hide_comments_top_fans_button", `<span class="chip" style="height:24px;font-size:11px;padding:0 8px;background:#3a3a3a">Top fans</span>`, { tag: "span" })}`)
    .replace(/(Kom igjen! Taket trenger en egen video\.)/, `$1${C("hide_comments_gifs_and_images", `<div style="width:120px;height:68px;border-radius:8px;margin-top:6px;background:${ART[4]}"></div>`)}`)
    .replace(/(<div style="display:flex;align-items:center;gap:8px;padding:6px 12px 8px">)/, `${C("hide_comments_by_members_header", `<div style="margin:0 12px 6px;padding:6px 10px;border-radius:8px;background:#1f3324;font-size:12px">Comments by members</div>`, { blk: 1 })}$1`));
  wrap("feed", html => html
    .replace(/(<div style="display:flex;gap:16px;margin-top:10px" class="t2">)[\s\S]*?(<\/div><\/div>)/, `<div style="display:flex;gap:14px;margin-top:10px;align-items:center" class="t2">
      ${C("hide_post_like_dislike_buttons", `<span style="display:flex;gap:10px;align-items:center">${I("like", "ico", 'style="width:18px;height:18px;fill:#aaa"')}2.1K ${C("hide_post_dislike_button", I("dislike", "ico", 'style="width:18px;height:18px;fill:#aaa"'), { tag: "span" })}</span>`, { tag: "span" })}
      ${C("hide_post_comment_button", `<span style="display:flex;gap:4px;align-items:center">${I("comment", "ico", 'style="width:18px;height:18px;fill:#aaa"')}340</span>`, { tag: "span" })}
      ${C("hide_post_share_button", I("share", "ico", 'style="width:18px;height:18px;fill:#aaa"'), { tag: "span" })}</div>
      ${C("hide_post_comments_preview", `<div class="t2" style="margin-top:8px;color:#ccc">@sam: Because of a thin water layer!</div>`)}</div>`)
    .replace(/(<div class="c[^"]*" data-k="morphe_hide_mix_playlists")/, `${C("hide_horizontal_shelves", `<div style="padding:0 12px 14px"><b style="font-size:15px">Breaking news</b><div style="display:flex;gap:8px;margin-top:8px;overflow:hidden">${[1, 2, 3].map(i => thumb(i, "width:140px;flex:none")).join("")}</div></div>`, { blk: 1 })}
      ${C("hide_playables", `<div style="margin:0 12px 14px;padding:10px 12px;border-radius:12px;background:#1d2a3a;display:flex;gap:10px;align-items:center">${I("vr")}<div><div class="t1" style="font-size:13px">Playables</div><div class="t2">Play instant games on YouTube</div></div></div>`, { blk: 1 })}
      ${C("hide_surveys", `<div style="margin:0 12px 14px;padding:10px 12px;border-radius:12px;border:1px solid #333"><div class="t1" style="font-size:13px">How are your recommendations?</div><div style="display:flex;gap:6px;margin-top:8px">${["Great", "OK", "Bad"].map(t => `<span class="chip" style="height:26px">${t}</span>`).join("")}</div></div>`, { blk: 1 })}
      ${C("hide_ticket_shelf", `<div style="margin:0 12px 14px;padding:10px 12px;border-radius:12px;background:#272727"><div class="t1" style="font-size:13px">Tickets · Midnight Tapes live in Oslo</div><div class="t2">Sat, 21 Nov · Rockefeller</div></div>`, { blk: 1 })}$1`));
  wrap("seekbar", html => !V("morphe_custom_seekbar_thumb") ? html : html.replace('<div class="knob" id="knob" style="', `<div class="knob" id="knob" data-thumb="${V("morphe_custom_seekbar_thumb_scale_type") === "ORIGINAL" ? "big" : "fit"}" ${pickedFiles.morphe_custom_seekbar_thumb_file ? `data-img style="--img:url('${pickedFiles.morphe_custom_seekbar_thumb_file}');` : 'style="'}`));
  wrap("seekbar", html => V("morphe_fullscreen_large_seekbar") ? html.replace('id="seek" style="position:relative;left:0;right:0;height:4px;', 'id="seek" style="position:relative;left:0;right:0;height:9px;') : html);
}

// Player menu sub-sheets: the header and footer settings belong to the Quality, Captions and
// Audio track sheets, so selecting one of them opens that sheet in the preview.
const FLY_SUB = {
  morphe_hide_player_flyout_quality_header: "quality", morphe_hide_player_flyout_quality_footer: "quality",
  morphe_hide_player_flyout_captions_header: "captions", morphe_hide_player_flyout_captions_footer: "captions",
  morphe_hide_player_flyout_audio_track_footer: "audio",
};
let flySub = null;
{
  const base = SCENES.flyout;
  const opt = (t, sel, sub = "") => `<div style="display:flex;align-items:center;gap:14px;padding:10px 18px"><span style="width:20px;display:grid;place-items:center">${sel ? '<span style="width:8px;height:8px;border-radius:50%;background:#f1f1f1;display:block"></span>' : ""}</span><div><div style="font-size:14px">${t}</div>${sub ? `<div class="t2">${sub}</div>` : ""}</div></div>`;
  const SHEETS = {
    quality: () => `${C("hide_player_flyout_quality_header", `<div style="padding:2px 18px 8px;font-size:15px;font-weight:500">Quality for current video</div>`, { blk: 1 })}
      ${opt("Auto (recommended)", true, "Adjusts to give you the best experience")}${opt("Higher picture quality", false, "Uses more data")}${opt("Data saver", false, "Lower picture quality")}${opt("Advanced", false, "Select a specific resolution")}
      ${C("hide_player_flyout_quality_footer", `<div class="t2" style="padding:8px 18px 12px;border-top:1px solid #333;margin-top:4px">Applies to this video only. To change quality for all videos, go to Settings › Video quality preferences</div>`, { blk: 1 })}`,
    captions: () => `${C("hide_player_flyout_captions_header", `<div style="padding:2px 18px 8px;font-size:15px;font-weight:500">Captions</div>`, { blk: 1 })}
      ${opt("Turn off captions", true)}${opt("English (auto-generated)", false)}${opt("Norwegian", false)}${opt("Auto-translate", false)}
      ${C("hide_player_flyout_captions_footer", `<div style="padding:10px 18px 12px;border-top:1px solid #333;margin-top:4px;display:flex;align-items:center;gap:14px">${I("gear")}<span style="font-size:14px">Caption preferences</span></div>`, { blk: 1 })}`,
    audio: () => `<div style="padding:2px 18px 8px;font-size:15px;font-weight:500">Audio track</div>
      ${opt("English (original)", true)}${opt("Spanish (dubbed)", false)}${opt("German (dubbed)", false)}
      ${C("hide_player_flyout_audio_track_footer", `<div class="t2" style="padding:8px 18px 12px;border-top:1px solid #333;margin-top:4px">Dubbed tracks are generated automatically. The original track is marked as original.</div>`, { blk: 1 })}`,
  };
  SCENES.flyout = () => {
    flySub = FLY_SUB[selected] || null;
    if (!flySub) return base();
    return `<div style="background:#0f0f0f;height:350px;position:relative;overflow:hidden">
      ${sheetBackdrop(4)}
      <div style="position:absolute;left:0;right:0;top:56px;bottom:0;background:#212121;border-radius:14px 14px 0 0;overflow-y:auto;scrollbar-width:thin" class="inner-scroll">
        <div style="width:36px;height:4px;border-radius:2px;background:#555;margin:8px auto 6px"></div>
        ${SHEETS[flySub]()}
      </div></div>`;
  };
}
