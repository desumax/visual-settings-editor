# regress

One check per bug that was reported, so a fixed bug that comes back fails here before it reaches a
test release (Max, Nov 24). The animation and layout rules live in `tools/animcheck` (probe.js); these
are the behaviours a frame check can't see: scrolling, menus, gestures, dialogs, search.

```sh
node tools/regress/regress.js              # every check, on web/ and the App view build
node tools/regress/regress.js --only menu  # checks whose name contains "menu"
```

It builds the site the way the preview is published (web/ plus `app/build_app_view.py`), serves it,
and exits 1 when a check fails. GitHub Actions runs it, and the animation check, on every push that
touches the editor (`.github/workflows/editor-checks.yml`).

## Adding a check

For every bug Max reports: add a check named after what must stay true, with the date and words of
the report in `report`. Run it on the code that had the bug (a `git worktree` of the commit before the
fix, with this file copied in) and confirm it fails there and passes on the fix. A check that never
failed on the old code guards nothing; say so in a comment when the original bug depended on timing a
headless browser doesn't reproduce.
