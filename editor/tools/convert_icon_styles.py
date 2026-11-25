import sys, json, re, xml.etree.ElementTree as ET, os
R = sys.argv[1]; OUT = sys.argv[2]
A = "{http://schemas.android.com/apk/res/android}"
STYLES = {"FLUENT": "_fluent", "PHOSPHOR": "_phosphor", "PHOSPHOR_LIGHT": "_phosphor_light", "PHOSPHOR_FILL": "_phosphor_fill", "PHOSPHOR_DUOTONE": "_phosphor_duotone", "IONICONS": "_ionicons", "SHARP": "_sharp"}
MAP = {"play": "playericons/drawable/morphe_player_play", "pause": "playericons/drawable/morphe_player_pause", "prev": "playericons/drawable/morphe_player_previous",
       "next": "playericons/drawable/morphe_player_next", "cc": "playericons/drawable/morphe_player_captions_off", "cast": "playericons/drawable/morphe_player_cast",
       "gear": "playericons/drawable/morphe_player_settings", "full": "playericons/drawable/morphe_fullscreen_enter", "replay": "playericons/drawable/morphe_player_replay",
       "link": "copyvideolinkbutton/drawable/morphe_yt_copy", "loop": "loopvideobutton/drawable/morphe_loop_video_button_off", "vol": "mutevideobutton/drawable/morphe_mute_video_button_off",
       "pip": "pictureinpicturebutton/drawable/morphe_pip_button", "reload": "reloadbutton/drawable/morphe_reload_video_button", "clock": "savetowatchlaterbutton/drawable/morphe_save_to_watch_later_button",
       "queue": "playallbutton/drawable/morphe_play_all_button", "crop": "fullscreenvideoscalebutton/drawable/morphe_fullscreen_video_scale_fit", "dl": "downloads/drawable/morphe_yt_download_button"}
def col(v):
    if v is None: return None
    if "white" in v: return "#fff"
    if "black" in v: return "#000"
    if v.startswith("#"):
        h = v[1:]
        if len(h) == 8:
            a = int(h[:2], 16) / 255
            if a == 0: return "none"
            return f"rgba({int(h[2:4],16)},{int(h[4:6],16)},{int(h[6:],16)},{a:.2f})"
        return v
    return "#fff"
def node(e):
    tag = e.tag
    if tag == "group":
        g = lambda k, d=0: float(e.get(A + k, d))
        px, py = g("pivotX"), g("pivotY")
        t = []
        if g("translateX") or g("translateY"): t.append(f"translate({g('translateX')} {g('translateY')})")
        if g("rotation"): t.append(f"rotate({g('rotation')} {px} {py})")
        sx, sy = g("scaleX", 1), g("scaleY", 1)
        if sx != 1 or sy != 1: t.append(f"translate({px} {py}) scale({sx} {sy}) translate({-px} {-py})")
        inner = "".join(node(c) for c in e)
        return f'<g transform="{" ".join(t)}">{inner}</g>' if t else f"<g>{inner}</g>"
    if tag == "path":
        a = lambda k: e.get(A + k)
        at = [f'd="{a("pathData")}"']
        f = col(a("fillColor")); at.append(f'fill="{f or "none"}"')
        if a("fillAlpha"): at.append(f'fill-opacity="{a("fillAlpha")}"')
        if a("fillType") == "evenOdd": at.append('fill-rule="evenodd"')
        s = col(a("strokeColor"))
        if s and s != "none":
            at.append(f'stroke="{s}" stroke-width="{a("strokeWidth") or 1}"')
            if a("strokeLineCap"): at.append(f'stroke-linecap="{a("strokeLineCap")}"')
            if a("strokeLineJoin"): at.append(f'stroke-linejoin="{a("strokeLineJoin")}"')
            if a("strokeMiterLimit"): at.append(f'stroke-miterlimit="{a("strokeMiterLimit")}"')
            if a("strokeAlpha"): at.append(f'stroke-opacity="{a("strokeAlpha")}"')
        return "<path " + " ".join(at) + "/>"
    if tag == "clip-path": return ""
    return "".join(node(c) for c in e)
out = {}
for st, suf in STYLES.items():
    out[st] = {}
    for k, base in MAP.items():
        p = os.path.join(R, base + suf + ".xml")
        if not os.path.exists(p): continue
        v = ET.parse(p).getroot()
        if v.tag != "vector": v = v.find(".//vector")
        if v is None: print("skip", p); continue
        out[st][k] = [f'0 0 {v.get(A+"viewportWidth")} {v.get(A+"viewportHeight")}', "".join(node(c) for c in v)]
js = ("// Generated from morphe-patches@31234a8 (patches/src/main/resources/*/drawable/*_<style>.xml) by\n"
      "// editor/tools/convert_icon_styles.py: the real icons of each \"Player icon style\" (MIT and\n"
      "// Apache 2.0 icon sets: Fluent UI, Phosphor, Ionicons, Material Symbols Sharp; see the source files).\n"
      "// [viewBox, svg markup] per preview icon name.\n"
      "const ICON_STYLES = " + json.dumps(out, separators=(",", ":")) + ";\n")
open(OUT, "w").write(js)
print({k: len(v) for k, v in out.items()}, len(js))
