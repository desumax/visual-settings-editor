# README media generator

Makes the stills and GIFs in `docs/media` from the editor page itself (`editor/web`), in headless
Chromium, YouTube dark look, phone viewport 412 x 915 CSS px.

```sh
node scripts/demos/make.js                # every scene (about 2.5 minutes)
node scripts/demos/make.js --only anim-   # scenes whose name contains "anim-"
node scripts/demos/make.js --keep         # keep each GIF's raw frames and print the folder
```

Needs Node, Playwright with its Chromium, and `ffmpeg` on PATH (or `FFMPEG=<path>`). Playwright is
taken from `NODE_PATH` or `scripts/demos/node_modules` (see `loadPlaywright` in `lib.js`); run
`npm install && npx playwright install chromium` in this folder if neither is there. Roboto loads from Google Fonts; set `MV_BLOCK_FONTS=1` to work offline.

The page is served from `editor/web` by a small local server and opened with the first-run tutorial,
the one-time tabs tutorial and the dev markers (`.devdone`, `.devonly`, `#devTour*`, the inspector) hidden
through localStorage and an injected style; nothing under `editor/` is changed. Each scene starts from
the defaults: Original UI design, Clean list design, screens grouped into tabs.

Stills are captured at device scale 2. GIFs are screenshots on a 15 fps clock at scale 1.5, re-timed by
their real timestamps and encoded by ffmpeg with a per-file palette; animation GIFs keep the top 640 CSS
px (preview, tabs, the cards around the change), full-screen GIFs are 480 px wide.

| Scene | File | What it does |
| --- | --- | --- |
| hero | hero.png | Player controls; taps the Cast button card so its button is outlined in the preview |
| ui-designs | ui-designs.png | Watch page in the Original, Morphe and Glass UI designs, side by side |
| list-designs | list-designs.png | Player controls cards in the Morphe, Switches and Clean list designs, side by side |
| menu-tabs | menu-tabs.gif | Opens the screen menu, turns Group screens into tabs off (25 screens) and on (6 cards), opens Watch page, taps the Comments tab |
| ui-design-switch | ui-design-switch.gif | Screen menu: UI design Original, Morphe, Glass, then opens Watch page in Glass |
| list-design-switch | list-design-switch.gif | Screen menu: Settings list design Switches, its sample popup, OK, opens Player |
| anim-hide | anim-hide.gif | Taps Cast button's toggle: the button folds out of the player, then back in |
| anim-reveal | anim-reveal.gif | Taps the hidden Autoplay button's card: the toggle appears in the player, pulsing in a red outline |
| anim-compare | anim-compare.gif | Comments tab, taps Search comments: the Off / On comparison plays |
| anim-demo | anim-demo.gif | Seekbar & gestures tab, taps Seekbar thumbnails: a finger drags the seekbar and the thumbnail follows |
| original-vs-morphe | original-vs-morphe.gif | Watch page with a lived-in setup (compact action bar, dislikes as a percentage, Dark blue background, several parts hidden), taps Original (stock YouTube) then Morphe in the top bar |
| search | search.gif | Search, types "dislike", picks Show dislikes as percentage, switches it on (2.1K becomes 4%) |
| niconico | niconico.gif | Flying comments tab, switches Niconico comments on |
| previews | previews.png | Nine live previews: Player, SponsorBlock, Flying comments, Watch page, Comments, Home feed, Shorts, Miniplayer, glass Navigation bar |

Files: `make.js` (CLI, capture and compositing helpers), `scenes.js` (one function per file), `lib.js`
(server, page opener, Playwright lookup).
