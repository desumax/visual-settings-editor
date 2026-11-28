#!/usr/bin/env python3
"""
Extracts a machine-readable catalogue of every YouTube preference that
Morphe patches expose, by statically reading a checkout of morphe-patches:

  * extensions/**/Settings*.java      -> key, type, default, reboot, parents
  * patches/**/*.kt                   -> which patch adds it, preference widget,
                                         settings screen / sub-screen
  * addresources/values/**/strings.xml -> titles, summaries, list entries

Usage: extract_catalogue.py <morphe-patches checkout> <out.json>

Nothing here modifies Morphe. The output is the single source of truth the
visual editor reads; anything the editor has no adapter for falls back to
the "Misc" list automatically.
"""
import json, re, sys, subprocess, xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2])

# --------------------------------------------------------------- strings
def load_strings():
    strings, arrays = {}, {}
    base = ROOT / "patches/src/main/resources/addresources/values"
    for sub in ("shared", "shared-youtube", "youtube", "sponsorblock"):
        for f in ("strings.xml", "arrays.xml"):
            p = base / sub / f
            if not p.exists():
                continue
            tree = ET.parse(p)
            for el in tree.getroot().iter():
                name = el.get("name")
                if not name:
                    continue
                if el.tag == "string":
                    v = "".join(el.itertext()).strip()
                    if len(v) > 1 and v[0] == '"' and v[-1] == '"': v = v[1:-1]
                    strings[name] = v.replace("\\'", "'").replace('\\"', '"').replace("\\n", "\n")
                elif el.tag == "string-array":
                    arrays[name] = [ "".join(i.itertext()).strip() for i in el.findall("item") ]
    return strings, arrays

STRINGS, ARRAYS = load_strings()

def res(s):
    if s and s.startswith("@string/"):
        return STRINGS.get(s[8:], s)
    return s

# --------------------------------------------------------------- java settings
SETTING_RE = re.compile(
    r'public\s+static\s+final\s+(\w+)(?:<[^>]*>)?\s+(\w+)\s*=\s*new\s+(\w+)(?:<[^>]*>)?\(\s*"([^"]+)"\s*,(.*?)\);\s*$',
    re.S | re.M)

def split_top(s):
    out, depth, cur, q = [], 0, "", None
    for ch in s:
        if q:
            cur += ch
            if ch == q: q = None
            continue
        if ch in "\"'": q = ch
        elif ch in "([{<": depth += 1
        elif ch in ")]}>": depth -= 1
        if ch == "," and depth == 0:
            out.append(cur.strip()); cur = ""
        else:
            cur += ch
    if cur.strip(): out.append(cur.strip())
    return out

class Computed(str):
    """A default Morphe works out while it runs (a method call, a device check): there is no value to
    copy, so the catalogue records the expression apart from the default and leaves the default empty."""

# Named number constants the defaults use (NICONICO_COMMENTS_MAX_LENGTH_NO_LIMIT = 0), by name.
def load_constants():
    consts = {}
    for f in (ROOT / "extensions").rglob("*.java"):
        if not any(part in ("shared", "shared-youtube", "youtube") for part in f.relative_to(ROOT / "extensions").parts[:1]): continue
        for m in re.finditer(r'static\s+final\s+(?:int|long|float|double)\s+(\w+)\s*=\s*(-?[\d_.]+)[LlFfDd]?\s*;', f.read_text(errors="ignore")):
            consts.setdefault(m.group(1), m.group(2).replace("_", ""))
    return consts

CONSTS = load_constants()

def strip_comments(raw):
    # comments go, string literals stay whole ("https://..." is not a comment)
    return re.sub(r'("(?:\\.|[^"\\])*")|/\*.*?\*/|//[^\n]*', lambda m: m.group(1) or '', raw, flags=re.S).strip()

def norm_default(t, raw):
    raw = strip_comments(raw)
    if raw in ("TRUE", "true", "Boolean.TRUE"): return True
    if raw in ("FALSE", "false", "Boolean.FALSE"): return False
    if t in ("IntegerSetting", "LongSetting", "FloatSetting"):
        num = CONSTS.get(raw.split(".")[-1], raw) if re.fullmatch(r'[\w.]*[A-Z_][A-Z0-9_]*', raw) else raw
        try: return float(num.rstrip("fFdD")) if t == "FloatSetting" else int(num.rstrip("lL").replace("_", ""))
        except ValueError: return Computed(raw)
    if t == "StringSetting":
        m = re.fullmatch(r'"(.*)"', raw, re.S)
        return bytes(m.group(1), "utf-8").decode("unicode_escape") if m else Computed(raw)
    if t == "EnumSetting":
        m = re.fullmatch(r'[\w.]*?\b([A-Z][A-Z0-9_]*)', raw)
        return m.group(1) if m else Computed(raw)
    return Computed(raw)

def load_settings():
    files = [
        "extensions/shared/library/src/main/java/app/morphe/extension/shared/settings/SharedSettings.java",
        "extensions/shared-youtube/library/src/main/java/app/morphe/extension/shared/settings/SharedYouTubeSettings.java",
        "extensions/youtube/src/main/java/app/morphe/extension/youtube/settings/Settings.java",
    ]
    # Morphe has moved its declarations between files before (BaseSettings became SharedSettings, the
    # shared YouTube file was split off): a file that is gone is skipped with a warning, and any other
    # file of the YouTube extensions that declares "morphe_" settings is read too, so a move or a new
    # file changes nothing here.
    missing = [f for f in files if not (ROOT / f).exists()]
    for f in missing: print("warning: settings file not found, skipped:", f, file=sys.stderr)
    files = [f for f in files if f not in missing]
    for sub in ("shared", "shared-youtube", "youtube"):
        for jf in sorted((ROOT / "extensions" / sub).rglob("*.java")):
            rel = str(jf.relative_to(ROOT))
            if rel in files or "/settings/" not in rel: continue
            if re.search(r'public\s+static\s+final\s+\w+Setting(?:<[^>]*>)?\s+\w+\s*=\s*new\s+\w+Setting(?:<[^>]*>)?\(\s*"morphe_', jf.read_text(errors="ignore")):
                print("note: settings also declared in", rel, file=sys.stderr); files.append(rel)
    if not files: sys.exit("no settings declarations found under " + str(ROOT / "extensions"))
    settings, field_to_key, renames = {}, {}, {}
    texts = []
    for f in files:
        text = (ROOT / f).read_text()
        texts.append(text)
        # remember the "// Section" comment that precedes each declaration
        section = None
        for line_no, line in enumerate(text.splitlines()):
            pass
        sections = [(m.start(), m.group(1).strip()) for m in re.finditer(r'^\s*//\s*([A-Z][^\n]{0,40})$', text, re.M)]
        for m in SETTING_RE.finditer(text):
            decl_t, field, cls, key, rest = m.groups()
            args = split_top(rest)
            default = norm_default(cls, args[0]) if args else None
            vd = re.match(r'(?:VersionCheckPatch\.)?IS_(\d+)_(\d+)_OR_GREATER\s*\?\s*(.+?)\s*:\s*(.+)$', strip_comments(args[0])) if args else None
            version_default = {"when": "V(%d,%d)" % (int(vd.group(1)), int(vd.group(2))), "then": norm_default(cls, vd.group(3)), "else": norm_default(cls, vd.group(4))} if vd else None
            if version_default and any(isinstance(version_default[x], Computed) for x in ("then", "else")): version_default = None
            computed = None
            if version_default: default = version_default["else"] # the value on the oldest supported version
            elif isinstance(default, Computed): computed, default = str(default), None
            flags = [a for a in args[1:] if a in ("true", "false", "TRUE", "FALSE")]
            dialog = next((a.strip('"') for a in args[1:] if a.startswith('"')), None)
            avail = next((a for a in args[1:] if "parent" in a or "Availability" in a), None)
            sec = None
            for pos, name in sections:
                if pos < m.start(): sec = name
            settings[key] = {
                "key": key, "field": field,
                "type": cls.replace("Setting", "").lower(),
                "default": default,
                "rebootApp": flags[0].lower() == "true" if flags else False,
                "includeWithImport": (flags[1].lower() == "true") if len(flags) > 1 else True,
                "dialog": res("@string/" + dialog) if dialog else None,
                "availability": avail,
                "versionDefault": version_default,
                "computedDefault": computed,
                "sourceSection": sec,
                "sourceFile": f.split("/")[-1],
            }
            field_to_key[field] = key
    # Renamed settings: Morphe keeps the old key as a DEPRECATED_ field and copies its value over with
    # migrateOldSettingToNew(OLD, NEW). The map (old key -> new key) lets the editor serve a build of
    # Morphe from before a rename, and lets check_drift.py name the replacement of a stale hint.
    any_key = {}
    for text in texts:
        for m in re.finditer(r'static\s+final\s+\w+(?:<[^>]*>)?\s+(\w+)\s*=\s*new\s+\w+(?:<[^>]*>)?\(\s*"([^"]+)"', text): any_key.setdefault(m.group(1), m.group(2))
    for text in texts:
        for m in re.finditer(r'migrateOldSettingToNew\(\s*(\w+)\s*,\s*(\w+)\s*\)', text):
            a, b = any_key.get(m.group(1)), any_key.get(m.group(2))
            if a and b and a != b: renames[a] = b
    # resolve parent(FIELD) references into keys
    for s in settings.values():
        a = s.get("availability")
        if not a: continue
        deps = []
        for kind, inner in re.findall(r'(parentsAll|parentsAny|parentNot|parent)\(([^()]*(?:\([^()]*\))?[^()]*)\)', a):
            for tok in re.findall(r'\b[A-Z][A-Z0-9_]+\b', inner):
                if tok in field_to_key:
                    deps.append({"key": field_to_key[tok], "mode": "not" if kind == "parentNot" else ("any" if kind == "parentsAny" else "all")})
        s["parents"] = deps
        s["customAvailability"] = re.findall(r'new (?:\w+\.)*(\w+Availability)', a)
        s["availabilityArgs"] = {m.group(1): m.group(2).split(".")[-1] for m in re.finditer(r'new (?:\w+\.)*(\w+Availability)\(\s*([\w.]+)\s*\)', a)}
    return settings, field_to_key, renames

SETTINGS, FIELD_TO_KEY, RENAMES = load_settings()

# Sliders: Morphe registers each one's range with SeekBarPreference.register(new SeekBarConfig(SETTING,
# min, max, step, unit[, divisor[, labels]])), and clampToRange keeps every read inside it. The editor's
# wheel and every preview that reads the value use this range, so they move the way Morphe does.
def load_seekbars():
    out = {}
    for f in (ROOT / "extensions").rglob("*.java"):
        if f.relative_to(ROOT / "extensions").parts[0] not in ("shared", "shared-youtube", "youtube"): continue
        text = f.read_text(errors="ignore")
        if "SeekBarConfig(" not in text: continue
        for m in re.finditer(r'new\s+SeekBarConfig\(\s*(?:\w+\.)?(\w+)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*"([^"]*)"\s*(?:,\s*([^,)]+?)\s*)?[,)]', strip_comments(text)):
            field, *nums, unit, div = m.groups()
            vals = []
            for n in nums + [div or "1"]:
                n = CONSTS.get(n.split(".")[-1], n)
                try: vals.append(int(str(n).rstrip("lL").replace("_", "")))
                except ValueError: vals.append(None)
            key = FIELD_TO_KEY.get(field)
            if not key or None in vals[:3]: continue
            r = {"min": vals[0], "max": vals[1], "step": vals[2] or 1, "unit": unit}
            if vals[3] and vals[3] != 1: r["divisor"] = vals[3]
            out[key] = r
    return out

SEEKBARS = load_seekbars()

# --------------------------------------------------------------- availability rules
# Setting.Availability classes decide when Morphe greys a preference out. Their isAvailable()
# bodies are translated into small JS expressions over S("key") (current value) and V(maj, min)
# (YouTube version check), so the editor follows the same rules. Anything that depends on the
# device or on code the translator does not understand becomes "true" and is listed in "unknown".
def _block(text, open_idx):
    d, i = 0, open_idx
    while i < len(text):
        if text[i] == "{": d += 1
        elif text[i] == "}":
            d -= 1
            if d == 0: return text[open_idx + 1:i]
        i += 1
    return text[open_idx + 1:]

def _java_expr_to_js(expr, locals_, helpers, unknown):
    e = re.sub(r'\s+', ' ', expr).strip()
    for name, val in locals_.items():
        e = re.sub(r'\b%s\b(?!\s*\()' % re.escape(name), "(" + val + ")", e)
    # String.equals("X") -> === "X"
    e = re.sub(r'\.equals\(([^()]*)\)', r' == \1', e)
    def setting(m):
        k = FIELD_TO_KEY.get(m.group(1))
        if k: return 'S("%s")' % k
        unknown.append(m.group(1)); return "null"
    # Settings.X.isSetToDefault() -> D("key") (the editor compares the value with its default); without
    # this the setting's name was lost and the rule could never pass
    def is_default(m):
        k = FIELD_TO_KEY.get(m.group(1))
        if k: return 'D("%s")' % k
        unknown.append(m.group(1)); return "true"
    e = re.sub(r'\b(?:Settings|SharedYouTubeSettings|SharedSettings|BaseSettings)\.([A-Z0-9_]+)\.isSetToDefault\(\)', is_default, e)
    e = re.sub(r'\b(?:Settings|SharedYouTubeSettings|SharedSettings|BaseSettings)\.([A-Z0-9_]+)\.get\(\)', setting, e)
    # enum helper methods on a setting value, e.g. type.isModern()
    e = re.sub(r'(S\("[^"]+"\)|\(S\("[^"]+"\)\))\.(\w+)\(\)', lambda m: ENUM_METHODS[m.group(2)].replace("X", m.group(1)) if m.group(2) in ENUM_METHODS else (unknown.append(m.group(0)) or 'U("%s")' % m.group(2)), e)
    def helper(m):
        nm = m.group(1)
        if nm in ("S", "V", "U", "D"): return m.group(0)
        if nm in helpers and not m.group(2).strip(): return "(" + helpers[nm] + ")"
        unknown.append(nm + "()"); return 'U("%s")' % nm
    e = re.sub(r'\b(?:[A-Za-z]\w*\.)*(\w+)\(((?:[^()]|"[^"]*")*)\)', helper, e)
    e = re.sub(r'\bVersionCheckPatch\.IS_(\d+)_(\d+)_OR_GREATER\b', r'V(\1,\2)', e)
    e = re.sub(r'\b(?:[A-Z]\w*\.)+([A-Z][A-Z0-9_]+)\b', r'"\1"', e)  # Enum.VALUE
    e = re.sub(r'(?<![\w"])([A-Z][A-Z0-9_]{2,})(?![\w"(])', r'"\1"', e)  # bare enum constant
    e = e.replace("==", "===").replace("!===", "!==")
    e = re.sub(r'(S\("[^"]+"\))\.\w+', lambda m: (unknown.append(m.group(0)) or "true"), e)  # field access on a value
    if re.search(r'\b[a-z_]\w*\.[a-z]', re.sub(r'"[^"]*"', '""', e)):
        unknown.append(e); return "true"
    return e

ENUM_METHODS = {
    # MiniplayerPatch.MiniplayerType.isModern(): types with a modernPlayerType
    "isModern": '["MODERN_1","MODERN_2","MODERN_3","MODERN_4","MODERN_5","MINIMAL_BAR","MINIMAL_BAR_2"].includes(X)',
}

def load_availability():
    rules = {}
    for f in (ROOT / "extensions").rglob("*.java"):
        text = f.read_text()
        if "Setting.Availability" not in text: continue
        helpers = {}
        for m in re.finditer(r'(?:private|public)?\s*static boolean (\w+)\(\)\s*\{', text):
            body = _block(text, m.end() - 1)
            loc = {lm.group(1): lm.group(2) for lm in re.finditer(r'\w+ (\w+) = ([^;]+);', body)}
            r = re.search(r'return ([^;]+);', body)
            if r and body.count("return") == 1:
                helpers[m.group(1)] = _java_expr_to_js(r.group(1), loc, {}, [])
        for m in re.finditer(r'class (\w+Availability)\s+implements Setting\.Availability\s*\{', text):
            body = _block(text, m.end() - 1)
            im = re.search(r'boolean isAvailable\(\)\s*\{', body)
            if not im: continue
            ib = _block(body, im.end() - 1)
            loc = {lm.group(1): lm.group(2) for lm in re.finditer(r'\w+ (\w+) = ([^;]+);', ib)}
            r = re.search(r'return ([^;]+);', ib)
            unknown = []
            js = _java_expr_to_js(r.group(1), loc, helpers, unknown) if r and ib.count("return") == 1 else "true"
            pm = re.search(r'getParentSettings\(\)\s*\{([^}]*)\}', body)
            parents = [FIELD_TO_KEY[t] for t in re.findall(r'\.([A-Z0-9_]+)\b', pm.group(1)) if t in FIELD_TO_KEY] if pm else []
            cm = re.search(r'%s\(\s*\w+ (\w+)\s*\)' % m.group(1), body)
            fm = re.search(r'this\.(\w+)\s*=\s*%s' % cm.group(1), body) if cm else None
            rules[m.group(1)] = {"js": js, "parents": parents, "unknown": unknown, "param": (fm.group(1) if fm else (cm.group(1) if cm else None))}
    return rules

AVAILABILITY = load_availability()

# --------------------------------------------------------------- version guards in patches
# A preference registered inside `if (is_21_29_or_greater) { ... }` (or its else branch) only
# exists on those YouTube versions. guard_at() returns that condition as a JS expression over V().
def brace_map(text):
    pairs, stack, i, n = {}, [], 0, len(text)
    while i < n:
        c = text[i]
        if text.startswith("//", i):
            i = text.find("\n", i); i = n if i < 0 else i; continue
        if text.startswith("/*", i):
            i = text.find("*/", i); i = n if i < 0 else i + 2; continue
        if c == '"':
            j = i + 1
            while j < n and text[j] != '"': j += 2 if text[j] == "\\" else 1
            i = j + 1; continue
        if c == "{": stack.append(i)
        elif c == "}" and stack: pairs[stack.pop()] = i
        i += 1
    return pairs

def _cond_js(cond):
    c = re.sub(r'\bis_(\d+)_(\d+)_or_greater\b', r'V(\1,\2)', cond)
    rest = re.sub(r'V\(\d+,\d+\)|&&|\|\||!|\(|\)|\s', '', c)
    return c.strip() if not rest and "V(" in c else None

def _header_conds(text, open_idx, close_of):
    start = max(0, open_idx - 300)
    head = text[start:open_idx].rstrip()
    m = re.search(r'(else\s+)?if\s*\(((?:[^()]|\([^()]*\))*)\)$', head)
    conds = []
    if m:
        js = _cond_js(m.group(2))
        if js: conds.append("(" + js + ")")
        if m.group(1):
            conds += _else_conds(text, start + m.start(), close_of)
        return conds
    if re.search(r'\belse$', head):
        return _else_conds(text, start + head.rfind("else"), close_of)
    return conds

def _else_conds(text, else_idx, close_of):
    before = text[:else_idx].rstrip()
    if not before.endswith("}"): return []
    close = len(before) - 1
    opener = next((o for o, cl in close_of.items() if cl == close), None)
    if opener is None: return []
    prev = _header_conds(text, opener, close_of)
    if not prev: return []
    # prev[0] is the if's own condition; the rest are conditions of earlier branches in the chain
    return ["!" + prev[0]] + prev[1:]

def guard_at(text, pos, close_of):
    conds = []
    for o, cl in close_of.items():
        if o < pos < cl: conds += _header_conds(text, o, close_of)
    line = text[text.rfind("\n", 0, pos) + 1:pos]
    m = re.search(r'if\s*\(((?:[^()]|\([^()]*\))*)\)\s*(?:preferences|\w+)?\s*(?:\+=|\.add)?', line)
    if m and _cond_js(m.group(1)): conds.append("(" + _cond_js(m.group(1)) + ")")
    return " && ".join(conds) or None

# --------------------------------------------------------------- kotlin prefs
PREF_TYPES = {"SwitchPreference", "ListPreference", "TextPreference", "NonInteractivePreference",
              "IntentPreference", "PreferenceScreenPreference", "PreferenceCategory"}
SCREEN_HELPERS = {
    "addPlayerOverlayPreferences": ("PLAYER", "morphe_overlay_buttons_screen"),
    "addPlayerFlyoutMenuPreferences": ("PLAYER", "morphe_hide_player_flyout"),
    "addShortsPlayerPreferences": ("SHORTS", "morphe_shorts_player_screen"),
}

def scan_calls(text):
    """Return list of (callee, open_idx, close_idx) for every call, ignoring strings/comments."""
    calls, stack = [], []
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if text.startswith("//", i):
            i = text.find("\n", i); i = n if i < 0 else i; continue
        if text.startswith("/*", i):
            i = text.find("*/", i); i = n if i < 0 else i + 2; continue
        if text.startswith('"""', i):
            j = text.find('"""', i + 3); i = n if j < 0 else j + 3; continue
        if c == '"':
            j = i + 1
            while j < n and text[j] != '"':
                j += 2 if text[j] == "\\" else 1
            i = j + 1; continue
        if c == "(":
            m = re.search(r'([\w.]+)\s*(?:<[\w<>, ?]*>)?\s*$', text[max(0, i - 120):i])
            stack.append([m.group(1) if m else "", i, None])
        elif c == ")" and stack:
            e = stack.pop(); e[2] = i; calls.append(tuple(e))
        i += 1
    return calls

def first_string_arg(text, open_idx, close_idx):
    body = text[open_idx + 1:close_idx]
    m = re.match(r'\s*"([^"]+)"', body)
    if m: return m.group(1)
    m = re.search(r'\bkey\s*=\s*"([^"]+)"', body)
    return m.group(1) if m else None

def named_arg(body, name):
    # Only the preference's own arguments: stop before nested child preferences.
    body = re.split(r'\bpreferences\s*=|\b[A-Z]\w*Preference(?:Category)?\s*\(', body, maxsplit=1)[0]
    m = re.search(r'\b%s\s*=\s*"([^"]+)"' % name, body)
    return m.group(1) if m else None

PATCH_NAME_RE = re.compile(r'(?:val\s+(\w+)\s*=\s*)?(?:bytecodePatch|resourcePatch|patch)\s*\(\s*name\s*=\s*"([^"]+)"(?:\s*,\s*description\s*=\s*((?:"[^"]*"\s*\+?\s*)+))?', re.S)

SCREEN_REF = re.compile(r'\bPreferenceScreen\.([A-Z][A-Z_]+)\b')

def build_indirections(files, texts):
    """Preference groups (global mutable sets) and shared factories that receive a screen."""
    groups, factories = {}, {}
    for f in files:
        text = texts[f]
        for g in re.findall(r'(?:internal|private)?\s*val\s+(\w+)\s*=\s*mutable(?:Set|List)Of<BasePreference>\(\)', text):
            groups[g] = f
        if "/shared/" in str(f) and re.search(r'preferenceScreen\s*:\s*BasePreferenceScreen\.Screen', text):
            for fn in re.findall(r'fun\s+(\w+)\s*\(', text):
                factories[fn] = f
    factory_screen = {}
    for fn, sf in factories.items():
        for f in files:
            if "/youtube/" not in str(f): continue
            t = texts[f]
            m = re.search(r'\b%s\s*\((.*?)\n\)' % fn, t, re.S)
            if m:
                sm = re.search(r'preferenceScreen\s*=\s*PreferenceScreen\.([A-Z][A-Z_]+)', m.group(1)) or SCREEN_REF.search(m.group(1))
                if sm: factory_screen.setdefault(sf, sm.group(1))
    return groups, factory_screen

def resolve_var(var, f, texts, calls_cache, groups):
    """Find where a preference collection variable is handed to a settings screen."""
    search = [f] + ([groups[var]] if var in groups and groups[var] != f else [])
    for sf in search:
        text = texts[sf]
        calls = calls_cache.setdefault(sf, scan_calls(text))
        for m in re.finditer(r'\b%s\b' % re.escape(var), text):
            enc = sorted([e for e in calls if e[1] < m.start() < e[2]], key=lambda e: -e[1])
            screen = sub = None
            for cal, eo, ec in enc:
                cb = cal.split(".")[-1]
                if cb == "PreferenceScreenPreference" and not sub:
                    sub = first_string_arg(text, eo, ec)
                mm = re.match(r'PreferenceScreen\.([A-Z_]+)\.addPreferences', cal)
                if mm: screen = mm.group(1); break
                if cb in SCREEN_HELPERS:
                    screen, hs = SCREEN_HELPERS[cb]; sub = sub or hs; break
            if screen: return screen, sub
    # Group consumed indirectly (e.g. captions split the group into categories):
    # fall back to the single sub-screen its defining file adds.
    if var in groups:
        m = re.findall(r'PreferenceScreen\.([A-Z][A-Z_]+)\.addPreferences\(\s*PreferenceScreenPreference\(\s*key\s*=\s*"([^"]+)"', texts[groups[var]])
        if len(m) == 1: return m[0]
    return None

def load_prefs():
    prefs = {}
    kt_root = ROOT / "patches/src/main/kotlin/app/morphe/patches"
    files = list((kt_root / "youtube").rglob("*.kt")) + list((kt_root / "shared").rglob("*.kt"))
    texts = {f: f.read_text() for f in files}
    GROUPS, FACTORY_SCREEN = build_indirections(files, texts)
    calls_cache = {}
    for f in files:
        text = texts[f]
        rel = str(f.relative_to(ROOT))
        calls = calls_cache.setdefault(f, scan_calls(text))
        close_of = brace_map(text)
        patch_names = [(m.start(), m.group(2), re.sub(r'"\s*\+\s*"', "", (m.group(3) or "")).strip().strip('"')) for m in PATCH_NAME_RE.finditer(text)]
        file_screens = sorted(set(SCREEN_REF.findall(text)) - {"SHORTS_PLAYER"})
        file_helpers = [h for h in SCREEN_HELPERS if re.search(r'\b%s\(' % h, text)]
        for callee, o, c in calls:
            base = callee.split(".")[-1]
            if base not in PREF_TYPES: continue
            key = first_string_arg(text, o, c)
            body = text[o + 1:c]
            # a row with no stored setting (key = null: Import / export, SponsorBlock import / export)
            # still shows in Morphe's screen; it is named after its title string, minus "_title"
            if not key and re.match(r'\s*key\s*=\s*null\b', body):
                tk = named_arg(body, "titleKey")
                key = re.sub(r'_title$', '', tk) if tk else None
            if not key: continue
            # enclosing calls (innermost first)
            enclosing = sorted([e for e in calls if e[1] < o and e[2] > c], key=lambda e: -e[1])
            screen = sub = category = None
            for cal, eo, ec in enclosing:
                cb = cal.split(".")[-1]
                mm = re.match(r'PreferenceScreen\.([A-Z_]+)\.addPreferences', cal)
                if mm and not screen: screen = mm.group(1)
                if cb in SCREEN_HELPERS and not screen:
                    screen, hs = SCREEN_HELPERS[cb]; sub = sub or hs
                if cb == "PreferenceScreenPreference" and not sub:
                    sub = first_string_arg(text, eo, ec)
                if cb == "PreferenceCategory" and not category:
                    category = first_string_arg(text, eo, ec)
            confidence = "exact" if screen else None
            if not screen:
                var = None
                for cal, eo, ec in enclosing:
                    head = cal.split(".")[0]
                    if head in GROUPS or (cal.endswith((".add", ".addAll")) and head):
                        var = head; break
                colls = [e for e in enclosing if e[0].split(".")[-1] in ("mutableSetOf", "setOf", "arrayOf", "listOf", "mutableListOf")]
                if not var and colls:
                    outer = colls[-1]
                    vm = re.findall(r'\bval\s+(\w+)\s*=', text[max(0, outer[1] - 300):outer[1]])
                    if vm: var = vm[-1]
                if not var:
                    gm = re.search(r'(\w+)\s*(?:\+=|\.add)\s*\(?\s*$', text[max(0, o - 200):o].rsplit(base, 1)[0])
                    if gm: var = gm.group(1)
                # the settings' own top-level list (SettingsPatch: `private val preferences = mutableSetOf<BasePreference>()`,
                # handed to the root screen): "About" sits above every screen, in none of them. The name matched
                # a Shorts parameter of the same name further down, which filed About under Shorts (Max, Nov 25)
                if var and re.search(r'^private val %s\s*=\s*mutableSetOf<BasePreference>\(\)' % re.escape(var), text, re.M):
                    confidence = "root"; var = None
                if var:
                    r = resolve_var(var, f, texts, calls_cache, GROUPS)
                    if r:
                        screen, vs = r; sub = sub or vs; confidence = "variable"
            if confidence == "root": pass
            elif not screen and f in FACTORY_SCREEN:
                screen = FACTORY_SCREEN[f]; confidence = "factory"
            if not screen and confidence != "root" and file_helpers:
                screen, hs = SCREEN_HELPERS[file_helpers[0]]; sub = sub or hs; confidence = "file-helper"
            if not screen and confidence != "root" and len(file_screens) == 1:
                screen = file_screens[0]; confidence = "file-screen"
            pname = pdesc = None
            for pos, nm, ds in patch_names:
                if pos < o or pname is None: pname, pdesc = nm, ds
                if pos > o: break
            entry = prefs.setdefault(key, {"key": key, "widget": base, "occurrences": []})
            entry["occurrences"].append({
                "file": rel, "screen": screen, "subScreen": sub if sub != key else None,
                "category": category, "confidence": confidence or "unresolved",
                "patch": pname, "patchDescription": pdesc,
                "summary": "summary = false" not in body,
                "entriesKey": named_arg(body, "entriesKey"),
                "entryValuesKey": named_arg(body, "entryValuesKey"),
                "tag": named_arg(body, "tag"),
                "titleKey": named_arg(body, "titleKey"),
                "summaryKey": named_arg(body, "summaryKey"),
                "when": guard_at(text, o, close_of),
            })
    return prefs

PREFS = load_prefs()

# --------------------------------------------------------------- merge
SCREEN_TITLES = {
    "ADS": "Ads", "DEARROW": "DeArrow", "FEED": "Feed", "GENERAL": "General", "MISC": "Miscellaneous",
    "PLAYER": "Player", "RETURN_YOUTUBE_DISLIKE": "Return YouTube Dislike", "SEEKBAR": "Seekbar",
    "SHORTS": "Shorts", "SPONSORBLOCK": "SponsorBlock", "SWIPE_CONTROLS": "Swipe controls", "VIDEO": "Video",
}

def best_occ(occs):
    order = {"exact": 0, "root": 0, "variable": 1, "factory": 1, "file-helper": 2, "file-screen": 3, "unresolved": 4}
    return sorted(occs, key=lambda o: order[o["confidence"]])[0]

catalogue = []
for key, p in PREFS.items():
    if p["widget"] in ("PreferenceCategory",):
        continue
    o = best_occ(p["occurrences"])
    s = SETTINGS.get(key, {})
    # a Kotlin template (e.g. "${arrayKeySuffix}") picks a version-specific array; fall back to the shared one
    tmpl = lambda x: re.sub(r'\$\{[^}]*\}|\$[A-Za-z_]\w*', '', x) if x else x
    ek = tmpl(o["entriesKey"]) or (key + "_entries")
    evk = tmpl(o["entryValuesKey"]) or (key + "_entry_values")
    entries = [res(x) for x in ARRAYS.get(ek, [])]
    values = ARRAYS.get(evk, [])
    item = {
        "key": key,
        "title": STRINGS.get(o["titleKey"] or "") or STRINGS.get(key + "_title") or STRINGS.get(key),
        "summary": STRINGS.get(o["summaryKey"] or "") or STRINGS.get(key + "_summary"),
        "summaryOn": STRINGS.get(key + "_summary_on"),
        "summaryOff": STRINGS.get(key + "_summary_off"),
        "widget": p["widget"],
        "type": s.get("type") or ("screen" if p["widget"] == "PreferenceScreenPreference" else None),
        "default": s.get("default"),
        "rebootApp": s.get("rebootApp", False),
        "dialog": s.get("dialog"),
        "parents": s.get("parents", []),
        "customAvailability": s.get("customAvailability", []),
        **({"versionDefault": s["versionDefault"]} if s.get("versionDefault") else {}),
        **({"computedDefault": s["computedDefault"]} if s.get("computedDefault") else {}),
        "screen": o["screen"],
        "screenTitle": SCREEN_TITLES.get(o["screen"]),
        "subScreen": o["subScreen"],
        "subScreenTitle": STRINGS.get((o["subScreen"] or "") + "_title"),
        "category": o["category"],
        "patch": o["patch"],
        "patchDescription": o["patchDescription"],
        "sourceFile": o["file"],
        "locationConfidence": o["confidence"],
    }
    if entries:
        item["entries"] = [{"label": l, "value": v} for l, v in zip(entries, values or entries)]
    if key in SEEKBARS: item["range"] = SEEKBARS[key]
    # version guards: the preference exists when any of its registrations' guards holds
    whens = [x["when"] for x in p["occurrences"]]
    if any(whens):
        item["when"] = None if not all(whens) else " || ".join("(" + w + ")" for w in dict.fromkeys(whens))
        variants = []
        for x in p["occurrences"]:
            if not x["when"]: continue
            vl = ARRAYS.get(x["entryValuesKey"] or (key + "_entry_values"), [])
            el = [res(e) for e in ARRAYS.get(x["entriesKey"] or (key + "_entries"), [])]
            if el: variants.append({"when": x["when"], "entries": [{"label": l, "value": v} for l, v in zip(el, vl or el)]})
        if variants: item["entryVariants"] = variants
    rules = [(a, AVAILABILITY[a]) for a in s.get("customAvailability", []) if a in AVAILABILITY]
    def bind(a, r):
        js, arg = r["js"], s.get("availabilityArgs", {}).get(a)
        if r.get("param") and arg: js = re.sub(r'\b%s\b' % r["param"], '"%s"' % arg, js)
        return js
    if rules:
        item["availability"] = " && ".join("(" + bind(a, r) + ")" for a, r in rules)
        rules = [r for _, r in rules]
        item["availabilityParents"] = sorted({k for r in rules for k in r["parents"]})
        unk = [u for r in rules for u in r["unknown"]]
        if unk: item["availabilityUnknown"] = unk
    catalogue.append(item)

catalogue.sort(key=lambda x: (x["screen"] or "~", x["subScreen"] or "", x["key"]))
rev = subprocess.run(["git", "-C", str(ROOT), "log", "-1", "--format=%h %cs"], capture_output=True, text=True).stdout.strip()
internal = sorted(k for k in SETTINGS if k not in PREFS)
consts = (ROOT / "patches/src/main/kotlin/app/morphe/patches/youtube/shared/Constants.kt").read_text()
yt_versions = [{"version": m.group(1), "experimental": "isExperimental = true" in m.group(0)}
               for m in re.finditer(r'AppTarget\(\s*version\s*=\s*"([^"]+)"[^)]*\)', consts)]
out = {
    "source": "MorpheApp/morphe-patches@" + rev,
    "youtubeVersions": yt_versions,
    "generatedBy": "editor/tools/extract_catalogue.py",
    "counts": {
        "preferences": len(catalogue),
        "settingsDeclared": len(SETTINGS),
        "internalOnly": len(internal),
        "unresolvedScreen": sum(1 for c in catalogue if not c["screen"]),
    },
    "screens": SCREEN_TITLES,
    "preferences": catalogue,
    "internalSettings": internal,
    "renames": dict(sorted(RENAMES.items())),
}
OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False))
print(json.dumps(out["counts"]))
