# animcheck

Plays every animated setting of the visual editor in a headless browser and checks it step by step
against rules written from the bugs found in review. It runs the web preview and the App view build
(the same page the in-app WebView loads), for every option of every setting.

It exists because static lint and a single screenshot kept missing what a person sees in a second:
a pill cut at the edge, a picture swapping under the animation, a part jumping when its animation
starts, a story that never shows the change it is about.

## Run it

```sh
# everything: every animation and option, App view and web, phone size (about 2.5 minutes)
node tools/animcheck/animcheck.js

# only the settings you changed, with a contact sheet of the frames to look at
node tools/animcheck/animcheck.js --keys morphe_exit_fullscreen,morphe_loop_video --sheet --out /tmp/ac

# the other two sizes: a small phone, and the web preview at desktop width
node tools/animcheck/animcheck.js --size 360x740
node tools/animcheck/animcheck.js --target web --size 1280x800
```

Run all three sizes before reporting. The preview box, and with it every phone in a comparison,
changes size with the screen while message pills keep their size, so a layout that is clean at one
size can overlap at another (the first run at 360x740 found two pills overlapping and a message
judged against a button that was hidden).

| Option | Meaning |
| --- | --- |
| `--target app\|web\|both` | App view build, web preview, or both (default). The App view is built with `app/build_app_view.py`. |
| `--size 412x896` | Viewport in CSS pixels. |
| `--keys a,b` / `--grep text` | Only these settings. |
| `--values all\|default` | Every option of each setting (default), or only its default. |
| `--sheet` | A contact sheet per run in `OUT/sheets/`. Use it with `--keys` or `--grep`: a sheet for every run is slow. |
| `--at 1500,3000` | Whole-screen frames at these times in `OUT/frames/`. After 5.2 s the step is 200 ms, so a frame is named after the step it lands on. |
| `--frame 50` | Step of the fine window, in ms. |
| `--jobs N` | Parallel browsers (default: one per core, between 2 and 8). |
| `--out dir` | Where `report.md`, `report.json`, sheets and frames go. |

Environment: `ANIMCHECK_DEBUG=1` prints each run; `ANIMCHECK_EVAL="expr"` evaluates an expression
in the page after each run and prints it (for example `window.__pills.slice(-4)`, the last pill
placements, or `window.__apart`, the pills the shared rule moved off another pill in this run).

The exit code is 1 when there is a failure. Warnings are listed and counted; info lines (a still
comparison) are listed only.

Needs Node with Playwright and its Chromium, and Python 3 with Pillow for the sheets.

## How it works

- **A virtual clock.** Chromium runs with begin-frame control, so time only moves when the runner
  grants it (`Emulation.setVirtualTimePolicy`) and a frame is only drawn when the runner asks
  (`HeadlessExperimental.beginFrame`). An 11 second comparison takes well under a second, and every
  run sees the same frames, so a finding can be reproduced exactly.
- **It drives the page like a person.** `probe.js` opens the setting's tab, scrolls its row into
  view, taps the row and then taps each option. A setting that is locked is unlocked through its
  parent settings first. If an option had to be set by code instead of a tap, that is reported
  (`not-tapped`), because a person could not have reached it.
- **One sample per frame.** After each frame the probe records the preview box: every phone, pill,
  label and text with its rectangle (relative to the box), what clips it, whether it is pulsing,
  the progress line, the two sides of a comparison, and a hash of the drawing. The rules run over
  that list of samples.
- **One browser per worker.** Pages in one browser share the virtual clock, so each parallel worker
  has its own browser.

## Rules

Each rule is a bug that was reported at least once.

| Rule | What it catches |
| --- | --- |
| `error`, `no-samples` | A script error, or the preview never drew. |
| `preview-hidden` | The preview box is not on screen (this is how the App view's menu page hid everything from an earlier checker). |
| `no-comparison`, `no-phone` | A comparison that never opens, or opens with no phone in it. |
| `text-clipped`, `pill-clipped-flashing` | Text or a pill cut by the edge of its phone or of the box while at rest, or while it pulses. |
| `text-overlap`, `pill-over-part` | Two texts drawn on top of each other, or a message sitting on a button or readout of the screen it is shown on. Only what is drawn counts: text cut away by its phone, or a button hidden under something else, is not there to collide with. |
| `phone-clipped` | A phone drawn partly outside the box. |
| `progress-covered`, `no-progress` | The comparison's progress line is covered, or never grows. |
| `jump` | A phone or part that moves a long way in one step with no animation (a hard cut). |
| `picture-swap` | The picture under the animation is replaced in one step (the "background swap" at the start of a story). |
| `flash-off-centre` | The blue pulse is not centred on the part it marks. |
| `animation-jump` | A part that was standing still jumps when its animation starts or ends (keyframes replacing its own transform). |
| `sides-same`, `sides-end-same` | The two phones never differ, or end the same. |
| `slow-start`, `still` | Nothing changes for the first 0.9 s; nothing moves at all (info: a still comparison is allowed). |
| `nothing-happens` | A live preview that never changes after the tap. |
| `leftover`, `preview-changed` | Layers left behind after the animation is stopped; the rest preview differs before and after. |
| `options-same` | Two options of one setting play exactly the same frames. |
| `not-tapped` | The option could not be reached by tapping. |

`ALLOW` at the top of `animcheck.js` lists the few accepted findings, each with its reason. Add to
it only with a reason a reviewer would accept; do not use it to get a clean run.

## Adding a rule

When review finds something the checker passed:

1. Reproduce it on the old code with `--keys` and `--sheet`, and look at the sheet.
2. Add what the probe needs to see to the sample in `probe.js`, and a rule over the samples.
3. Run it on the old code (it must fail) and on the fix (it must pass).
4. Run the whole suite: a new rule usually finds the same bug in other settings, and those get the
   same shared fix.

## Limits

It checks geometry, timing and structure, not taste: a story can pass every rule and still explain
its setting badly, so contact sheets of anything redesigned are still looked at by eye. It runs
desktop Chromium, not the phone's WebView, and it does not run the native app.
