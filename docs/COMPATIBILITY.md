# Visual settings editor: compatibility design

How the visual editor stays working while Morphe and YouTube keep changing, and why it adds no
work for the Morphe developer. This is the basis for the pull request description and for any
discussion with the maintainers.

## In one paragraph

The editor is a front end (a "wrapper") for the existing Morphe settings. It does not copy,
own or change any setting. At runtime it reads the list of settings from the same file the regular
Morphe settings screen loads. It changes values through the same functions those screens call. It
asks each setting, through Morphe's own code, whether it is available on this YouTube version. The
only thing it brings is a list of hints saying which picture and animation go with which setting.
When a hint is out of date, that one setting loses its picture and still works as a plain row.
Nothing crashes and no setting goes missing.

## What six months of Morphe history show

Measured on MorpheApp/morphe-patches, `main` branch, 2026-05-02 to 2026-11-16 (v1.25.0 to v2.3.0,
about 30 releases, roughly one a week). Script: count the settings declared in
`extensions/youtube/.../settings/Settings.java` at each release and compare.

| Change | Count | Example |
| --- | --- | --- |
| Settings at the start / end | 414 → 710 | |
| Added | 439 | |
| Removed | 142 | `morphe_hide_view_products_banner`, the RYD settings |
| Renamed (same field, new key) | 47 | the SponsorBlock keys gained the `morphe_` prefix (July) |
| Default value changed | 50 | |
| Reworked from a switch to a list | several | `disable_continue_watching_prompt` became the three-way `continue_watching_prompt` |
| Replaced under a new name | regular | `watch_later_hide_removal_snackbar` became `playlist_hide_removal_snackbar` |

Two other files matter. `SettingsPatch.kt` (how the Morphe settings screen is built) changed in 19
of those releases, and the `morphe-patches-library` dependency that holds the `Setting` class went
through 22 versions (1.2.0 to 2.2.0), including a 2.0.0. The patches also contain over 500
YouTube version checks (`is_XX_YY_or_greater`).

What this means: anything that keeps its own copy of the settings list, or edits the files the
developer works in, would break or conflict nearly every week.

## Rules the code follows

### 1. The installed build is the only source of truth

- **The settings list:** `PreferenceTree` reads `res/xml/morphe_prefs.xml` at runtime, the same
  resource `AbstractPreferenceFragment` inflates for the regular screens. That gives titles,
  summaries, list entries and values, order, screens and dependencies.
- **Values:** `SettingsBridge` uses only `Setting.getSettingFromPath`, `get`, `save`,
  `isAvailable`, `isSetToDefault` and `resetToDefault`, the same calls the regular screens make.
- **List settings:** the editor moves a list setting to the next entry that the regular screen
  offers (read from the XML). It never invents a value.
- **The catalogue ships only as preview hints.** The in-app editor is the web preview, so its
  `catalogue.json` is packed into the extension (generated `WebAssets.java`). At runtime the live
  data wins: which settings show comes from the installed preference rows, and titles, summaries,
  entries, defaults, types and availability come from Morphe (`LiveSettings`, `Setting` API). The
  catalogue only adds preview hints (drawing, animation, order, grouping). If Morphe's values can't
  be read, the editor closes and the regular Morphe list is used.

### 2. Preview hints, never truth

The web editor's scenes and animations name the settings they draw (`editor/web/js`). At runtime:

- A hint whose setting has no row in the installed build is never drawn. That covers renamed, removed and
  version-gated settings.
- A setting with no hint is shown as a plain row under "More settings", grouped by its Morphe
  screen. A new setting is therefore usable on day one, just without its animation.
- The worst case after an upstream change is a missing animation, never a missing setting or a
  crash.

### 3. No upstream file is edited

| Need | Done with |
| --- | --- |
| An entry at the top of Morphe settings | One call injected at the start of `YouTubePreferenceFragment.initialize()` (in finalize, so it works whichever bundle's patches run first). The extension then adds its rows above About once the list is built. If the fragment or method is missing, the patch only logs a warning, so a successful patch run alone doesn't prove the editor is in: check for its row in Morphe settings. |
| The editor's own settings (on, tabs) | `VisualEditorSettings` in the editor's own package, not `Settings.java`. |
| Opening the editor | A preference class in the editor's package, inflated from the generated XML like any other. |
| Morphe Manager, the patcher, other patches | Not touched. In the standalone test bundle it is the only patch and is on by default; it needs the Morphe Patches bundle in the same run (Manager: Expert mode, both bundles, at least one patch that adds Morphe settings). |
| Text | The entry switch is an English literal for now, outside upstream's translation workflow. An upstream PR needs it as a string resource. |

The developer can rename, move, add or remove settings exactly as today. The editor follows
without any change on their side.

## YouTube versions

YouTube versions differ in two ways that matter here: which settings exist, and what the app
looks like.

**Which settings exist.** This is handled entirely by Morphe's own code:

- **Patch level:** the editor declares `compatibleWith(COMPATIBILITY_YOUTUBE)`, the same list of
  supported YouTube versions (and minimum Android per version) as every other YouTube patch. The
  standalone builder keeps upstream's `youtube/shared/Constants.kt` from the tag it builds
  against, so the declaration always matches that release. Morphe Manager only offers it where the
  rest of Morphe works.
- **Settings not added on this version:** Morphe only adds a version-gated setting when that
  version needs it (for example `if (!is_21_30_or_greater) ...` in the patches). A setting that
  isn't added isn't in `morphe_prefs.xml`, so the editor never shows it and skips its hint.
- **Settings that are present but unavailable:** some rules are checked at runtime
  (`Setting.Availability`, version checks in the extension). The editor asks `isAvailable()`, so it
  greys out exactly what the regular screen greys out, with the developer's own logic.

**What the app looks like.** The preview drawings are the editor's own code, and layouts do change
between versions. In the prototype: the action bar layout from 21.36, the miniplayer types removed
from 21.29, and the channel moving into the action bar on newer builds.

- **Choosing the drawing:** each preview picks its variant from the same version flags the patches
  use (`VersionCheckPatch.IS_21_xx_OR_GREATER`), so the picture matches the installed app. The web
  prototype does the same with its YouTube version picker, driven by the catalogue's version rules,
  with no hand-kept version table.
- **Versions newer than the editor knows** (Morphe marks some as experimental): the newest drawing
  is used. The preview is a picture, so at worst it looks slightly different from the real app.
  Every setting still works.
- **If a drawing fails anyway:** the preview area is hidden for that screen and the list stays. If
  the editor itself can't open, a short message points to the regular settings, which are right
  there. The editor can never stop the Morphe settings from working.

## Keeping it current

The only recurring work is updating the hints and drawings when YouTube or Morphe changes
something visible. That work belongs to whoever maintains the editor, never to the Morphe
developer.

- `../tools/check_drift.py` compares the hints with any Morphe release. Build a catalogue of the
  release with `../tools/extract_catalogue.py`, then run the check. It lists the settings the
  editor names that are gone, and exits with 1 when the hints are stale.
- This can run in CI on each upstream release. The editor keeps working while an update waits.

## What to tell the maintainers (PR summary)

- An optional patch, off by default, that adds one entry above About.
- It edits no existing file, and it uses only the public settings API and the generated settings
  XML.
- Renaming, adding or removing settings needs no change for the editor. The worst case is a
  missing animation until its maintainer updates the map.
- It follows the same supported YouTube versions, version gates and availability rules as the rest
  of Morphe, because it asks Morphe's own code.
- A failure inside the editor is contained, and the regular settings stay available.
