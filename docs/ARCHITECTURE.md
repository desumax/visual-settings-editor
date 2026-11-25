# Visual settings editor: native patch

The bundle holds one patch, "Visual settings editor", used in Morphe Manager next to the official
Morphe Patches bundle. It depends on no patch object of the official bundle, so nothing runs twice
and no patch name clashes. The editor is the web preview itself (`editor/web`, plus `editor/app`
for in-app mode) hosted in a WebView and bridged to the real settings (`WebEditorDialog`), so the
app looks and animates exactly like the preview. When no WebView is available (or it fails to
start, or is too old for the page), the regular Morphe settings list stays and a short message says
why; there is no second, native editor to keep in sync.

The patch and extension folders follow the layout of
[morphe-patches](https://github.com/MorpheApp/morphe-patches), so each file can be copied to the
same path there if the editor is ever proposed upstream.

## A front end, not a fork of the settings

The editor is a *wrapper* around the existing settings, or more exactly an alternative front end
(a "view layer") for them. It doesn't copy, move or change any setting:

- **The list of settings is read at runtime** from `res/xml/morphe_prefs.xml`, the same file the
  regular Morphe settings screen inflates (`PreferenceTree`). Titles, summaries, list entries,
  order, screens and dependencies all come from the installed build.
- **Values and availability go through the extension's `Setting` API** (`getSettingFromPath`,
  `get`, `save`, `isAvailable`, `resetToDefault`), the same calls the regular screens make
  (`SettingsBridge`). Parent rules such as "only while X is on" are the developer's own
  `isAvailable()` logic, so they stay right when the developer changes them.
- **Morphe's own list decides which rows exist.** `LiveSettings.meta()` sends one entry per row
  the installed list shows (a setting whose patch was left out has no row, so no entry), and the
  web editor builds its list from those entries alone (`adaptCatalogue` in `editor/app/app-pre.js`).
- **The only thing the editor adds is preview hints** (`editor/web`): which preview, and which kind of
  animation, a known setting belongs to. They are never the source of truth: a hint whose setting
  no longer exists is never drawn, and a setting without hints is still listed as a plain row.

### Why this matters

The YouTube settings change constantly. From May to November 2026 (about 30 releases),
`Settings.java` went from 414 to 710 settings. 142 were removed, 47 renamed (the SponsorBlock
keys gained the `morphe_` prefix in July) and 50 had their default changed. Some were reworked
from an on/off switch into a list: `disable_continue_watching_prompt` became the three-way
`continue_watching_prompt`.

A design that copied the settings into the editor would break on almost every release. With this
design, a change upstream has at most one visible effect: a new or renamed setting appears without
its animation (as a plain row) until the map is updated. Nothing crashes, no setting goes missing,
and the developer doesn't need to do anything for the editor.

## Touches nothing upstream

| Concern | How it is handled |
| --- | --- |
| Entry at the top of Morphe settings | A new screen made with the public `PreferenceScreen.Screen(...)` API, which every patch uses. Root entries are sorted by key, and `00_0_visual_editor` sorts before `00_about`, so it lands above About. `SettingsPatch.kt` is not edited. |
| The editor's own on switch and two options | `VisualEditorSettings` in the editor's own package. `Settings.java` is not edited. |
| Other patches | Not edited. Each one still reads its own setting. |
| Morphe Manager and the patcher | Not touched. It is an ordinary optional patch, off by default. |

The trade-off is that the on switch sits one tap in, inside the "Visual settings editor" entry,
rather than as a bare switch on the root list. A bare switch there would need a five-line accessor
added to `SettingsPatch.kt`, which is exactly the kind of upstream change this design avoids.

## Keeping the hints current

`editor/tools/check_drift.py` compares the web editor's hints with any Morphe release. Make a catalogue
of the release with `editor/tools/extract_catalogue.py`, then run the check. It lists the settings the
editor names that the release no longer has, and exits with 1 when something is out of date. This
can run automatically in CI after each upstream release. Updating the hints is the only recurring
maintenance, and the editor keeps working while it waits.

## Files

| Path | What it does |
| --- | --- |
| `patches/.../misc/visualeditor/VisualSettingsEditorPatch.kt` | The patch. Depends on no other patch object; in finalize it adds one call at the end of Morphe's settings fragment `initialize()`. |
| `extensions/visualeditor/.../VisualEditorEntry.java` | Adds the "Visual settings editor" switch above About, and opens the editor when settings open while the switch is on. |
| `extensions/visualeditor/.../WebEditorDialog.java` | Hosts the editor (the web page, packed into `WebAssets.java` at build time) in a WebView, and the `MorpheApp` bridge it talks to. |
| `extensions/visualeditor/.../LiveSettings.java` | The rows of the installed settings list, one entry per row, with types, defaults, availability and translated text. The only place that decides which rows the editor has. |
| `extensions/visualeditor/.../PendingChanges.java` | Changes that wait for an app restart, kept across visits. |
| `extensions/visualeditor/.../PreferenceTree.java` | Reads the live settings list from `morphe_prefs.xml`. |
| `extensions/visualeditor/.../SettingsBridge.java` | Reads, changes and resets real settings through the `Setting` API, with Morphe's own confirmations and restart flag. |
| `extensions/visualeditor/.../VisualEditorSettings.java` | The editor's own settings (on, grouped tabs, design). |

## Two ways to ship it

1. **As a pull request to morphe-patches (preferred).** The patch sits next to the others, and
   users switch it on in Morphe Manager like any other optional patch. It edits no existing file,
   so it doesn't change how the developer works. They would still be accepting a large UI feature
   to maintain, so it's worth discussing with them before opening the PR.
2. **As your own patch bundle, used next to the official one.** The same code works, because it
   only relies on the public settings API and `morphe_prefs.xml`. The bundle has to be built
   against the same `morphe-patches-library` version as the official patches, and rebuilt when
   that library changes in a way that affects the settings API.

## Porting order

1. Build the patch with an empty preview: the entry, the switch, the list, toggling and the
   restart prompt. This checks `PreferenceTree` and `SettingsBridge` on a device.
2. Port the preview adapters by kind (`vis` first, since it covers most settings), screen by
   screen, following the screen order in the preview map.
3. Port the scenarios (`scenario` kind) last. They are self-contained animations.
