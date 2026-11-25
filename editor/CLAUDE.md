# Visual editor: working rules

- **Every bug Max reports gets a regression check**: `tools/regress/regress.js` for behaviour,
  `tools/animcheck/probe.js` rules for animation and layout. Confirm it fails on the old code and
  passes on the fix (see tools/regress/README.md).
- **Tests**: Max's standing rule is to skip tests unless he asks, with one exception: a "fix it
  everywhere" (all around, for all designs or pages, or similar) request is tested for that request.
  GitHub Actions runs both suites on every push that touches the editor.
- **Publishing the preview**: the publish must include `app/index.html` (the App view page, with the
  styles inlined). It was left out from v135 to v147, and the App view ran old styles with new scripts.
- Commit subjects are user-facing (they become the release changelog).
