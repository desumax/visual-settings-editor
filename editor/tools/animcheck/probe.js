// animcheck probe: injected into the editor page before its own scripts. It drives a setting the way
// a user does (tap the card, pick an option), samples the preview every frame step while the
// animation plays, and applies the rules below to the samples. See README.md for the rules.
(() => {
  "use strict";
  const ids = new WeakMap(); let nextId = 1;
  const idOf = el => { let i = ids.get(el); if (!i) { i = nextId++; ids.set(el, i); } return i; };
  const q = (sel, root = document) => [...root.querySelectorAll(sel)];
  const rect = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const txt = el => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  // drawn opacity: the element's own and every ancestor's, up to the preview box
  function opacityOf(el, stop) {
    if (getComputedStyle(el).visibility === "hidden") return 0;
    let o = 1;
    for (let e = el; e && e !== stop; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none") return 0; o *= parseFloat(cs.opacity); if (o < .02) return 0; }
    return o;
  }
  // the box an element is clipped to: every ancestor that cuts its overflow, up to the preview box
  function clipOf(el, stop) {
    const c = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 }; let by = "";
    for (let e = el.parentElement; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        const r = e.getBoundingClientRect();
        if (r.left > c.l) { c.l = r.left; } if (r.top > c.t) { c.t = r.top; } if (r.right < c.r) { c.r = r.right; } if (r.bottom < c.b) { c.b = r.bottom; }
        by = by || (e.id ? "#" + e.id : "." + String(e.className).split(" ")[0]);
      }
      if (e === stop) break;
    }
    return { ...c, by };
  }
  // the keyframes of an element's running animations; scaleOnly: one that only grows or shrinks it in place
  const anims = el => el.getAnimations().filter(a => a.playState === "running" && a.effect && a.effect.getKeyframes).map(a => a.effect.getKeyframes());
  const scaleOnly = ks => ks.some(k => "scale" in k || "transform" in k) && ks.every(k => (!("transform" in k) || /^(none|scale\([^)]*\))$/.test(k.transform) || /^matrix\(([^,]+), 0, 0, ([^,]+), [^,]+, 0\) scale\(/.test(k.transform)) && !("translate" in k));
  const TEXT_SEL = {
    canvas: [["pill", ".dev .toastin, .dev .badge7, .dev .check7"], ["label", ".duo7 .dl7 > span"], ["caption", ".dl7 > .sf7, .glide7"], ["line", ".sit, .foot, .cap"]],
    stage: [["pill", ".toastin, .demo-label"]],
  };
  // parts of the live preview a message pill must not sit on (the same list showPill steps around)
  const STAGE_PARTS = ".chip, .badge-txt, .pbtn, .time, .toastin:not(.dyn)";
  function sample(t, S) {
    const stick = document.getElementById("stick"), canvas = document.getElementById("canvas"), stage = document.getElementById("stage");
    const shown = canvas.classList.contains("show");
    const s = { t, shown, items: [], devs: [], art: [], prog: null, sides: null, box: rect(document.querySelector(".stagebox") || stick), muts: S.muts };
    // is the preview itself on screen? (a hidden page or a scrolled-away box makes every other rule blind)
    s.seen = getComputedStyle(stick).visibility !== "hidden" && !stick.hidden && Math.min(s.box.b, innerHeight) - Math.max(s.box.t, 0) > 80 && s.box.w > 80;
    S.muts = 0;
    const roots = shown ? [["canvas", canvas]] : [["stage", stage]];
    for (const [rootName, root] of roots) {
      for (const [kind, sel] of TEXT_SEL[rootName]) for (const el of q(sel, root)) {
        const text = txt(el); if (!text) continue;
        const r = rect(el); if (r.w < 1 || r.h < 1) continue;
        const op = opacityOf(el, stick); if (op < .12) continue;
        const dev = el.closest(".dev");
        const cover = el.closest(".sm7");
        s.items.push({ id: idOf(el), kind, root: rootName, text, r, op, clip: clipOf(el, stick), dev: dev ? idOf(dev) : 0, dyn: el.classList.contains("dyn"), host: cover ? idOf(cover) : 0,
          flash: anims(el).some(ks => ks.some(k => "boxShadow" in k)), grow: anims(el).some(scaleOnly), off: [el.offsetLeft, el.offsetTop, el.offsetWidth] });
      }
    }
    if (shown) {
      q(".dev", canvas).forEach(dev => {
        const r = rect(dev), cell = dev.closest(".dl7"), side = cell ? [...cell.parentElement.children].indexOf(cell) : -1;
        const raw = rect(dev); // before the faded-half adjustment below (pair-misaligned compares whole phones)
        // a faded half phone (web/js/scenarios.js CROP7, .crop7): the cut end is masked out and takes no
        // room, so only the part that is shown counts (the cut, scaled like the phone, read from --cut7)
        const cut = parseFloat(getComputedStyle(dev).getPropertyValue("--cut7")) || 0;
        if (cut && dev.classList.contains("crop7")) {
          const k = r.h / (dev.offsetHeight || 1) || 1;
          if (dev.classList.contains("cbot7")) r.t += cut * k; else r.b -= cut * k;
          r.h = r.b - r.t;
        }
        const m = getComputedStyle(dev).transform.match(/^matrix\(([^,]+), ([^,]+)/);
        s.devs.push({ id: idOf(dev), r, raw, side, clip: clipOf(dev, stick), turning: !!m && Math.abs(parseFloat(m[2])) > .02 });
        artOf(dev, r, s.art);
      });
      // a red "mark" outline drawn outside a part that fills its phone: the phone cuts all but one side,
      // a stray red line (Max, Nov 25: Tap and hold gradient); such parts draw it inside (.in7)
      s.markCut = q(".tgt7.mark7:not(.in7)", canvas).some(e => { const d = e.closest(".dev"); if (!d) return false; const r = e.getBoundingClientRect(), o = d.getBoundingClientRect(), k = o.width / (d.offsetWidth || 1), c = d.clientLeft * k, b = { left: o.left + c, right: o.right - c, top: o.top + c, bottom: o.bottom - c }; return [r.left - b.left < 2.5, b.right - r.right < 2.5, r.top - b.top < 2.5, b.bottom - r.bottom < 2.5].filter(Boolean).length >= 2; });
      const pg = canvas.querySelector(".prog"); if (pg) s.prog = { r: rect(pg), op: opacityOf(pg, stick) };
      const sides = q(".duo7.gen > .dl7 > .side", canvas);
      if (sides.length === 2) s.sides = sides.map(x => x.innerHTML.replace(/ id="[^"]*"/g, ""));
      s.ask = !!canvas.querySelector(".ask7");
    } else {
      const root = stage.firstElementChild;
      if (root) {
        artOf(root, rect(root), s.art);
        // The screen on top (a whole-screen cover, else the preview itself) is the one a message is read
        // against. A part with something else drawn over its middle is not there to be covered: the hit
        // test tells, and a cover (which ignores taps) is opened to it for the moment of the test.
        const top = q(".sm7", stage).pop() || null, host = top || root, pe = host.style.pointerEvents;
        if (top) host.style.pointerEvents = "auto";
        const under = e => { const b = e.getBoundingClientRect(), hit = document.elementsFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2).find(h => host.contains(h) && !h.closest(".dyn")); return !!hit && !e.contains(hit) && !hit.contains(e); };
        s.parts = q(STAGE_PARTS, host).filter(e => (top || !e.closest(".sm7")) && opacityOf(e, stick) > .3 && !under(e)).map(e => ({ r: rect(e), text: txt(e) })).filter(p => p.r.w > 1 && p.r.w * p.r.h < s.box.w * s.box.h * .2);
        if (top) { host.style.pointerEvents = pe; if (mo) mo.takeRecords(); } // the probe's own change is not the page's
        s.items.forEach(it => { if (it.dyn) it.onTop = it.host === (top ? idOf(top) : 0); });
      }
      s.extra = q(".sm7, .dyn", stage).length;
      s.sig = hash(stage.innerHTML); // the preview's markup, inline styles included: everything a demo changes step by step
    }
    // fingers: the hand's drawn width against the short side of the phone it is in (a scenario phone, or the
    // live preview), so a hand drawn too big for its phone is caught (Max, Nov 25: several hands too big)
    s.fingers = [];
    for (const f of q(".finger.show", shown ? canvas : stage)) {
      const svg = f.querySelector("svg"); if (!svg || opacityOf(f, stick) < .3) continue;
      const ph = f.closest(".dev") || stage.firstElementChild || stage; const pr = ph.getBoundingClientRect(), pw = Math.min(pr.width, pr.height), fw = svg.getBoundingClientRect().width;
      if (pw > 20 && fw > 1) s.fingers.push(fw / pw);
      const fr = svg.getBoundingClientRect();
      (s.fpos = s.fpos || []).push({ id: idOf(f), x: fr.left / (pw / 100), y: fr.top / (pw / 100), hold: f.classList.contains("hold") });
    }
    // everything inside is measured from the preview box: when the box itself slides (the top bar hides
    // as a card is selected) nothing in it has moved
    const sh = r => { if (r) { r.l -= s.box.l; r.r -= s.box.l; r.t -= s.box.t; r.b -= s.box.t; } };
    for (const it of s.items) { sh(it.r); sh(it.clip); }
    for (const d of s.devs) { sh(d.r); sh(d.clip); }
    for (const a of s.art) sh(a.r);
    if (s.prog) sh(s.prog.r);
    if (s.parts) for (const p of s.parts) sh(p.r);
    return s;
  }
  // the pictures of a screen: big parts with a background image (the video, a Short, a page)
  function artOf(root, rr, out) {
    const min = rr.w * rr.h * .35; if (min < 4) return;
    for (const el of [root, ...root.querySelectorAll("*")]) {
      const cs = getComputedStyle(el); if (cs.backgroundImage === "none") continue;
      const r = rect(el); if (r.w * r.h < min) continue;
      out.push({ id: idOf(el), bg: cs.backgroundImage, r, op: parseFloat(cs.opacity), root: idOf(root) });
    }
  }

  // ---- driving the editor as a user does ---------------------------------------------------------
  const pe = (el, type) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: r.left + Math.min(40, r.width / 2), clientY: r.top + Math.min(14, r.height / 2), button: 0, pointerType: "touch", isPrimary: true })); };
  function tapCard(k) {
    const row = document.querySelector(`#list [data-k="${k}"]`);
    if (row && row.getBoundingClientRect().height > 0) { pe(row, "pointerdown"); pe(row, "pointerup"); if (selected === k) return "tap"; }
    select(k, "list"); return "select()";
  }
  function pick(k, v) {
    const p = PREF[k];
    if (p.type === "boolean") {
      if (!!state[k] === !!v) return "same";
      const sw = document.querySelector(`#list [data-sw="${k}"]`);
      if (sw) { sw.click(); if (!!state[k] === !!v) return "switch"; }
      if (!!state[k] !== !!v) { touchSel(k); toggle(k); }
      return "toggle()";
    }
    if (String(state[k]) === String(v)) return "same";
    const opt = q(`#list button.opt[data-set="${k}"]`).find(o => String(o.dataset.val) === String(v));
    if (opt) { opt.click(); if (String(state[k]) === String(v)) return "pill"; }
    ensureMod(); touchSel(k); const before = state[k]; setPref(k, coerce(k, v)); afterChange(k, before); return "afterChange()";
  }
  // Where a run starts and ends: every setting on its default, except that the settings this one depends
  // on are switched the way it needs (its card is locked otherwise, and a user could not change it).
  function unlock(k, depth = 0) {
    const p = PREF[k]; if (!p || depth > 4) return;
    const ps = p.parents || [], any = ps.filter(x => x.mode === "any");
    for (const x of ps) { if (!(x.key in state) || x.mode === "any") continue; unlock(x.key, depth + 1); setPref(x.key, x.mode !== "not"); }
    if (any.length && !any.some(x => state[x.key])) { unlock(any[0].key, depth + 1); setPref(any[0].key, true); }
    // a rule of Morphe's own (availability): try each setting it reads, one value at a time
    if (!availOk(k)) for (const x of [...(p.availabilityParents || []), ...availKeys(k)]) {
      if (!(x in PREF) || x === k) continue;
      const was = state[x], tries = PREF[x].type === "boolean" ? [!was] : entriesFor(x).map(e => e.value).filter(v => String(v) !== String(was));
      if (tries.some(v => { setPref(x, coerce(x, v)); return availOk(k); })) { unlock(x, depth + 1); break; }
      setPref(x, was);
    }
  }
  function rest0(k) { Object.keys(state).forEach(x => { if (x in defaults) setPref(x, defaults[x]); }); unlock(k); }
  // bring a card into the free space under the preview by scrolling the editor's own list (scrollIntoView
  // would also scroll the page around the editor, and the preview with it)
  function showRow(row) {
    const sc = document.getElementById("scroller"), stick = document.getElementById("stick"); if (!row || !sc) return;
    const r = row.getBoundingClientRect(), b = sc.getBoundingClientRect(), top = Math.max(b.top, stick.getBoundingClientRect().bottom);
    if (r.top < top + 8 || r.bottom > b.bottom - 8) sc.scrollTop += r.top - (top + Math.max(8, (b.bottom - top - r.height) / 2));
    window.scrollTo(0, 0);
  }
  // a card on the same tab that plays nothing: tapping it is how a user leaves the animation
  function neutralKey(k) {
    const sec = sectionOf(k);
    return memberKeys(sec).find(x => x !== k && !SCN[x] && !DEMOS[x] && PREF[x] && PREF[x].type !== "screen" && document.querySelector(`#list [data-k="${x}"]`)) || null;
  }
  const memberKeys = sec => { const m = MEMBERS[sec]; return m ? [...m.live, ...m.misc] : []; };
  const stageSig = () => { const st = document.getElementById("stage").cloneNode(true); st.querySelectorAll(".finger, #hud, .ring, .ringlayer").forEach(e => e.remove()); st.querySelectorAll(".sel, .selx, .flash, .pressing, .flat, .twice").forEach(e => e.classList.remove("sel", "selx", "flash", "pressing", "flat", "twice")); st.querySelectorAll('[style*="--pop"]').forEach(e => e.style.removeProperty("--pop")); /* --pop is the flash's origin (popOrigin), worked out anew at each flash, like the flash classes above */ st.querySelectorAll('[style*="--ring-r"]').forEach(e => e.style.removeProperty("--ring-r")); st.querySelectorAll(".rown").forEach(e => e.classList.remove("rown")); st.querySelectorAll("[style]").forEach(e => e.setAttribute("style", e.style.cssText)); /* one way of writing each inline style: setting a property rewrites the whole attribute in the browser's own format */ /* the ring's corners (ringRadius), measured when a part is first outlined: they only shape a ring, a flash or a hold line */ /* a looping animation that keeps its place across redraws (the flying comments' clock) gets a new start
     offset at each draw: the same picture, so the offset is not compared */ return st.innerHTML.replace(/ class=""/g, "").replace(/ style=""/g, "").replace(/(animation:[^;"]*?linear )-?[\d.]+s( infinite)/g, "$1Xs$2"); };

  const hash = str => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; };
  const S = { samples: [], muts: 0, raf: 0, on: false, t0: 0, next: 0, step: 50, errors: [] };
  window.addEventListener("error", e => S.errors.push(String(e.message)));
  window.addEventListener("unhandledrejection", e => S.errors.push("promise: " + String(e.reason && e.reason.message || e.reason)));
  let mo = null;
  function begin(step, fineUntil) {
    window.__apart = []; S.samples = []; S.muts = 0; S.on = true; S.t0 = performance.now(); S.next = 0; S.step = step; S.fineUntil = fineUntil;
    if (!mo) { mo = new MutationObserver(ms => { S.muts += ms.length; }); mo.observe(document.getElementById("stick"), { subtree: true, childList: true, attributes: true, characterData: true }); }
    // One sample per frame the runner draws, taken once the frame is done: other code fits things in its
    // own frame callbacks (a pill moved back inside its phone), and those run after this one, so reading
    // the page here would see a state that is never drawn. A zero timer runs right after the frame.
    const tick = () => {
      if (!S.on) return;
      const t = Math.round(performance.now() - S.t0);
      setTimeout(() => { if (!S.on) return; try { S.samples.push(sample(t, S)); } catch (e) { S.errors.push("probe: " + e.message); } }, 0);
      S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }
  function end() { S.on = false; cancelAnimationFrame(S.raf); }

  // ---- rules -----------------------------------------------------------------------------------
  const FINGER_MAX = .31; // a story phone's hand is 30% of its short side (FINGER_K, scenarios.js); a fixed 40px hand was 43%
  const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const mid = r => [(r.l + r.r) / 2, (r.t + r.b) / 2];
  function judge(job) {
    const out = [], seen = new Set();
    // one finding per rule and part: the first frame it shows in
    const add = (rule, t, detail, level = "fail", what = detail) => { const key = rule + "|" + what; if (seen.has(key)) return; seen.add(key); out.push({ rule, t, detail, level }); };
    const ss = S.samples, cmp = ss.filter(s => s.shown);
    const isCmp = job.kind === "scn"; job.ask = ss.some(s => s.ask);
    for (const e of [...new Set(S.errors)]) add("error", 0, e);
    if (!ss.length) { add("no-samples", 0, "the probe took no samples"); return out; }
    const unseen = ss.filter(s => !s.seen); if (unseen.length > ss.length / 4) add("preview-hidden", unseen[0].t, "the preview is not on screen while the animation plays");
    if (isCmp && !cmp.length) add("no-comparison", 0, "the comparison never appeared");
    if (isCmp && cmp.length && !cmp.some(s => s.devs.length)) add("no-phone", 0, "the comparison drew no phone");
    const tol = 1.5;
    let prev = null, prev2 = null;
    // pair-misaligned (Max, Nov 24: in Play next in queue type one phone sat a little higher than the other,
    // and the phones moved from option to option; a long label was a shorter box): two phones of the same
    // size side by side, at rest, must have the same top
    for (const s of cmp) {
      const d = s.devs.filter(x => x.side === 0 || x.side === 1); if (d.length !== 2 || d.some(x => x.turning)) continue;
      const [a, b] = d[0].side === 0 ? d : [d[1], d[0]];
      if (Math.abs(a.raw.h - b.raw.h) > 1 || Math.abs(a.raw.w - b.raw.w) > 1 || Math.abs(mid(a.raw)[0] - mid(b.raw)[0]) < a.raw.w / 2) continue;
      const pv = ss[ss.indexOf(s) - 1], was = pv && pv.devs.find(x => x.id === a.id); if (!was || Math.abs(was.raw.t - a.raw.t) > .5) continue;
      if (Math.abs(a.raw.t - b.raw.t) > 1) add("pair-misaligned", s.t, `the two phones' tops differ by ${Math.abs(a.raw.t - b.raw.t).toFixed(1)}px`, "fail", "tops");
    }
    ss.forEach((s, i) => {
      // clipped text: a pill, label or caption cut by its phone or by the preview box
      for (const it of s.items) {
        if (it.op < .3) continue;
        // only at rest: text that slides out with its screen (a Short's readout) is cut on purpose
        const was = prev && prev.items.find(o => o.id === it.id); if (!was) continue;
        { const [x, y] = mid(it.r), [px, py] = mid(was.r); if (Math.hypot(x - px, y - py) > 1) continue; }
        const c = it.clip, cut = Math.max(c.l - it.r.l, it.r.r - c.r, c.t - it.r.t, it.r.b - c.b);
        if (!inter(it.r, c)) continue; // wholly outside (a screen that has slid away): not drawn at all
        if (cut > tol) add(it.flash ? "pill-clipped-flashing" : "text-clipped", s.t, `${it.kind} "${it.text}" is cut by ${Math.round(cut)}px (${c.by})${it.flash ? " while it flashes" : ""}`, "fail", it.text);
      }
      // text over text: two messages, labels or captions drawn over each other
      // only what is drawn counts: a readout that has slid out of its phone lies under the label above the phone, unseen
      const cutTo = (r, c) => { const l = Math.max(r.l, c.l), t = Math.max(r.t, c.t), rr = Math.min(r.r, c.r), bb = Math.min(r.b, c.b); return rr - l > 1 && bb - t > 1 ? { l, t, r: rr, b: bb, w: rr - l, h: bb - t } : null; };
      const vis = s.items.filter(it => it.op >= .4 && it.kind !== "line").map(it => ({ ...it, full: it.r, r: cutTo(it.r, it.clip) })).filter(it => it.r);
      for (let a = 0; a < vis.length; a++) for (let b = a + 1; b < vis.length; b++) {
        const A = vis[a], B = vis[b], ov = inter(A.r, B.r); if (!ov) continue;
        if (ov > .2 * Math.min(A.full.w * A.full.h, B.full.w * B.full.h)) add("text-overlap", s.t, `${A.kind} "${A.text}" and ${B.kind} "${B.text}" overlap`);
      }
      // a message pill on the live preview over one of its buttons or readouts
      if (s.parts) for (const it of s.items) if (it.dyn && it.onTop && it.op >= .4) for (const p of s.parts) {
        const ov = inter(it.r, p.r); if (ov > .25 * p.r.w * p.r.h && ov > 30) add("pill-over-part", s.t, `pill "${it.text}" covers "${p.text || "a control"}"`, "warn");
      }
      // phones cut by the preview box, or drawn over the progress line
      if (s.shown && s.t > 500) {
        // (a phone that is turning: its corners sweep a few px past the box for a moment, which is the turn)
        for (const d of s.devs) { const c = d.clip, cut = Math.max(c.l - d.r.l, d.r.r - c.r, c.t - d.r.t, d.r.b - c.b); if (cut > (d.turning ? 8 : 2.5)) add("phone-clipped", s.t, `a phone is cut by ${Math.round(cut)}px (${c.by})`, "fail", "phone"); }
        if (s.prog && s.prog.r.w > 2) for (const d of s.devs) if (!d.turning && inter(d.r, { ...s.prog.r, t: s.prog.r.t - 1 }) > 2) add("progress-covered", s.t, "a phone is drawn over the progress line");
      }
      // a jump cut: something that sat still, moved in one step, and sits still again
      // the story starts over (the progress line too, or new phones are drawn): everything is redrawn then
      const restart = !!(prev && (prev.prog && s.prog && s.prog.r.w < prev.prog.r.w - 2 || prev.devs.length && s.devs.length && !s.devs.some(d => prev.devs.some(o => o.id === d.id))));
      if (prev && prev2 && ss[i + 1] && !restart) {
        const nx = ss[i + 1], find = (x, id) => x.items.find(o => o.id === id) || x.devs.find(o => o.id === id);
        for (const it of [...s.items, ...s.devs]) {
          const p = find(prev, it.id), p2 = find(prev2, it.id), n = find(nx, it.id); if (!p || !p2 || !n) continue;
          if (it.op !== undefined && (it.op < .5 || p.op < .5)) continue;
          const [x, y] = mid(it.r), [px, py] = mid(p.r), [p2x, p2y] = mid(p2.r), [nx_, ny] = mid(n.r);
          const d = Math.hypot(x - px, y - py), before = Math.hypot(px - p2x, py - p2y), after = Math.hypot(nx_ - x, ny - y);
          if (d > 14 && before < 1 && after < 1) add("jump", s.t, `${it.kind || "phone"} ${it.text ? `"${it.text}" ` : ""}jumps ${Math.round(d)}px in one step`, "warn", it.id);
        }
      }
      // a picture replaced in place: the same part shows another picture from one step to the next
      if (prev) for (const a of s.art) {
        const p = prev.art.find(o => o.id === a.id); if (!p || p.bg === a.bg) continue;
        if (Math.abs(p.r.l - a.r.l) < 1 && Math.abs(p.r.t - a.r.t) < 1 && Math.abs(p.r.w - a.r.w) < 1 && a.op > .5 && p.op > .5) add("picture-swap", s.t, "a picture is replaced in place, with no motion");
      }
      // a flashing pill must grow around its own middle
      if (prev) for (const it of s.items) {
        if (!it.flash) continue; const p = prev.items.find(o => o.id === it.id); if (!p || !p.flash) continue;
        if (p.off.join() !== it.off.join()) continue;
        const [x, y] = mid(it.r), [px, py] = mid(p.r); if (Math.hypot(x - px, y - py) > 2.5 && Math.abs(it.r.w - p.r.w) > .5) add("flash-off-centre", s.t, `"${it.text}" slides ${Math.round(Math.hypot(x - px, y - py))}px while it flashes`, "fail", it.text);
      }
      // an animation that only grows a part must leave it where it is: a jump when it starts or ends means
      // its keyframes replaced the part's own transform (a centred pill popping in half its width aside)
      if (prev) for (const it of s.items) {
        const p = prev.items.find(o => o.id === it.id); if (!p || p.grow === it.grow || p.off.join() !== it.off.join()) continue;
        const [x, y] = mid(it.r), [px, py] = mid(p.r), d = Math.hypot(x - px, y - py);
        // only a part that was standing still: one that is still sliding in with its screen moves on its own
        const q = prev2 && prev2.items.find(o => o.id === it.id);
        if (q) { const [qx, qy] = mid(q.r); if (Math.hypot(px - qx, py - qy) >= 1) continue; }
        if (d > 3) add("animation-jump", s.t, `${it.kind} "${it.text}" jumps ${Math.round(d)}px when its animation ${it.grow ? "starts" : "ends"}`, "fail", it.text);
      }
      prev2 = prev; prev = s;
    });
    if (isCmp && cmp.length) {
      // the two sides must differ at some point, and the story must start promptly
      const duo = cmp.filter(s => s.sides && !s.ask);
      if (duo.length > 4) {
        if (!duo.some(s => s.sides[0] !== s.sides[1])) add("sides-same", 0, "the two phones never differ");
        else {
          // comparisons loop now (Max, Nov 20): the end is the last frame before the next round starts
          const roundEnd = ss[0].t + SC_FADE + SC_TOTAL - 20, inRound = duo.filter(s => s.t < roundEnd), last = (inRound.length ? inRound : duo)[(inRound.length ? inRound : duo).length - 1];
          if (last.sides[0] === last.sides[1]) add("sides-end-same", last.t, "the two phones end the same", "warn");
        }
      }
      const first = cmp[0].t, change = cmp.find(s => s.t > first && s.muts > 0 && s.devs.length); // stories now start within 60 ms (Max, Nov 24: no delays): only the first sample itself is the drawing
      // nothing moving until the story starts over is a still comparison (two pictures side by side), which is fine
      if (cmp.some(s => s.devs.length) && job.kind === "scn" && !job.ask) {
        if (!change || change.t - first > 5000) add("still", 0, "a still comparison: two pictures, no motion", "info");
        else if (change.t - first > 900) add("slow-start", change.t, `nothing changes in the first ${change.t - first} ms`, "warn");
      }
      const pr = cmp.filter(s => s.prog).map(s => s.prog.r.w);
      if (!job.ask && (!pr.length || Math.max(...pr) < 8)) add("no-progress", 0, "the progress line never grows");
    }
    { const fr = ss.flatMap(s => s.fingers || []); if (fr.length) { const m = Math.max(...fr); job.finger = m; if (m > FINGER_MAX) add("finger-big", ss.find(s => (s.fingers || []).includes(m)).t, `the hand is ${(m * 100).toFixed(1)}% of its phone's short side (at most ${FINGER_MAX * 100}%)`); } }
    // drag-no-hold (Max, Nov 25: Pinch-to-zoom's fingers had no red hold circle): a finger that moves on the
    // phone for over 300 ms is dragging, and a dragging finger shows its hold ring (.finger.hold)
    { const run = {}; for (const s of ss) for (const p of (s.fpos || [])) {
        const r = run[p.id]; run[p.id] = { ...p, t: s.t, moving: 0 };
        if (!r || s.t - r.t > 250) continue; // first seen, or hidden in between: it landed afresh
        const d = Math.hypot(p.x - r.x, p.y - r.y);
        run[p.id].moving = d > 1.5 && !p.hold ? (r.moving || 0) + (s.t - r.t) : 0;
        if (run[p.id].moving > 300) add("drag-no-hold", s.t, "a finger drags across the phone without its hold ring", job.kind === "scn" ? "fail" : "warn", "drag");
      } }
    { const m = ss.find(s => s.markCut); if (m) add("mark-outline-cut", m.t, "a red mark outline sits outside a part that fills its phone, so only one side of it shows"); }
    if (job.kind === "demo") { if (ss.reduce((n, s) => n + s.muts, 0) < 2) add("nothing-happens", 0, "the preview never changes", "warn"); }
    return out;
  }

  // debugging: ANIMCHECK_EVAL can read window.__pills, every message pill the preview placed in this run
  window.__pills = [];
  window.addEventListener("load", () => { if (typeof placePill !== "function") return; const real = placePill; placePill = (d, host) => { real(d, host); const h = host.getBoundingClientRect(), v = document.getElementById("stage").getBoundingClientRect(); window.__pills.push({ text: d.textContent, top: d.style.top, host: [Math.round(h.top), Math.round(h.height)], stage: [Math.round(v.top), Math.round(v.height)] }); }; });
  // and window.__apart, every pill the shared rule moved off another one (text, how far in phone pixels)
  window.__apart = [];
  window.addEventListener("load", () => { if (typeof pillsApart !== "function") return; const real = pillsApart; pillsApart = dev => { const ps = [...dev.querySelectorAll(".toastin, .badge7")], was = ps.map(e => e.offsetTop); real(dev); ps.forEach((e, i) => { if (e.offsetTop !== was[i]) window.__apart.push([(e.textContent || "").trim().slice(0, 30), e.offsetTop - was[i]]); }); }; });
  window.__animcheck = {
    info() {
      const jobs = [];
      const vals = k => { const p = PREF[k]; if (p.type === "boolean") return [false, true]; const es = entriesFor(k).map(e => e.value); return es.length ? es.slice(0, 8) : [defaults[k]]; };
      for (const sec of Object.keys(MEMBERS)) for (const k of memberKeys(sec)) {
        if (!inVersion(k)) continue;
        if (!PREF[k] || PREF[k].type === "screen") continue;
        const kind = SCN[k] ? "scn" : DEMOS[k] ? "demo" : null; if (!kind) continue;
        if (kind === "scn" && PREF[k].type === "boolean") { jobs.push({ key: k, kind, value: defaults[k], section: sec }); continue; }
        for (const v of vals(k)) jobs.push({ key: k, kind, value: v, section: sec });
      }
      return { jobs, total: SC_TOTAL, fade: SC_FADE, loop: LOOP_MS };
    },
    // 1: go to the tab and reset
    prepare(job) {
      S.errors = [];
      try { stopDemo(); stopScenario(); } catch (e) { S.errors.push("stop: " + e.message); }
      rest0(job.key);
      selected = null; commit(); window.scrollTo(0, 0);
      if (section !== sectionOf(job.key)) switchSection(sectionOf(job.key));
      // App view opens on its card menu: leave it the way tapping a card does
      if (document.documentElement.classList.contains("menupage")) setPicker(false);
    },
    // 2: the tab has settled: tap a neutral card and note what the preview looks like at rest
    rest(job) { const n = neutralKey(job.key); if (n) tapCard(n); else { selected = null; stopDemo(); stopScenario(); renderStage(); } return n; },
    baseline() { S.base = stageSig(); return S.base.length; },
    // 3: the user's own steps: tap the card, then pick the option
    tap(job) { showRow(document.querySelector(`#list [data-k="${job.key}"]`)); return tapCard(job.key); },
    pick(job) { begin(job.step || 50, job.fineUntil || 2500); return pick(job.key, job.value); },
    startSampling(job) { begin(job.step || 50, job.fineUntil || 2500); },
    // 4: the story is over: judge it, leave it, and compare the preview with how it looked at rest
    locked(job) { return !parentsOk(job.key); },
    finish(job) { end(); const v = judge(job); return { v, n: S.samples.length, ask: S.samples.some(s => s.ask), finger: job.finger }; },
    leave(job) { rest0(job.key); commit(); const n = neutralKey(job.key); if (n) tapCard(n); else { selected = null; stopDemo(); stopScenario(); renderStage(); } },
    leftovers() {
      const out = [], stage = document.getElementById("stage"), canvas = document.getElementById("canvas");
      if (canvas.classList.contains("show")) out.push({ rule: "leftover", t: 0, detail: "the comparison is still on screen after another card was tapped", level: "fail" });
      const extra = q(".sm7, .dyn", stage).filter(e => !e.classList.contains("demo-label"));
      if (extra.length) out.push({ rule: "leftover", t: 0, detail: `${extra.length} leftover part(s) on the preview: ${[...new Set(extra.map(e => "." + String(e.className).split(" ").join(".")))].join(", ")}`, level: "fail" });
      const now = stageSig();
      if (S.base && now !== S.base) {
        let i = 0; while (i < now.length && now[i] === S.base[i]) i++;
        out.push({ rule: "preview-changed", t: 0, detail: `the preview does not return to how it was: …${S.base.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, " ")}… became …${now.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, " ")}…`, level: "warn" });
      }
      return out;
    },
    // what a run looked like, in short: the texts it showed and how its pictures and extra parts came and went
    trace() {
      const rle = xs => xs.filter((x, i) => i === 0 || x !== xs[i - 1]).join(">");
      const texts = [...new Set(S.samples.flatMap(s => s.items.map(i => i.text)))].join(",");
      return texts + "#" + rle(S.samples.map(s => s.sig || 0)) + "#" + rle(S.samples.map(s => s.extra || 0)) + "#" + rle(S.samples.map(s => s.art.map(a => a.bg.length + ":" + Math.round(a.r.w / 8)).join(","))) + "#" + (S.samples.find(s => s.sides) ? rle(S.samples.filter(s => s.sides).map(s => s.sides.join("|").length)) : "");
    },
    stageTrace() { return document.getElementById("stage").innerHTML.length; },
  };
})();
