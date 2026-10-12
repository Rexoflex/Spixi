# Sparkle swap — port into src (#1357)

Damir, 2026-10-12 15:03: the four-point sparkle reads as the Gemini / AI mark and goes everywhere. His pick on
`sparkle-swap-render.html`: tile glyph **B Rocket** · twinkles **1 Bokeh dots** · coin face **Shine bars**.
The port does in source exactly what `swapArt` / `swapHeart` do at render time (page.template.html).

## What changed

| File | Change |
|---|---|
| `src/components/illustrations.js` | 14 bodies (lines 50–79): sparkle def → new defs, content / twinkle `<use>`s re-pointed |
| `src/components/illustrations-s17.js` | 13 bodies (lines 17–55) + `MOMENT_AI_TPL` (line 63): same; heartBg's 6 quadratic stars → dots |
| `src/styles/components/settings-app.css` | `.c-settings-contrib__spark` (~l. 577): `clip-path` star → `border-radius: 50%` (same 6 px, colours, `ct-spark`) |
| `src/components/settings-app.js` | unchanged (the spawn code needs nothing) |
| `scripts/pins-s17/k-sparkle-swap.mjs` | NEW pin (the lead registers it in the pins-s17 list, smoke-test.mjs:42361) |

Per drawing, with `<p>` = the old id minus its `Sp` / `sp` / `spG` suffix:

| Kind | Old | New def | Uses |
|---|---|---|---|
| Content, violet tile / disc (appsEmpty, welcome4, explore, welcome3) | `<use href="#<p>Sp@@" transform=…>` ×2 (glyph + companion) | `<g id="<p>Rkt@@" fill="#fff">` = GLYPH.rocket | ONE use, moved to the tile centre (26 26 · 24 24 · 23 23; welcome3 stays at the disc centre 124 124), scale kept; the companion mini-star is removed |
| Content, gold coin (backup, walletEmptyA/B, aboutGlassFg, moFirstixi, moPay) | `<use href="#…sp@@" transform=… fill="#fff">` | `<g id="<p>Shn@@">` = COIN.shine | same attrs (transform, fill, opacity) |
| Decorative twinkle (il-tw, rn-tw, mo-tw wn-loop) | `<use href="#…Sp@@" class style …>` | `<g id="<p>Dot@@">` = DECO.dots.a (halo r 5.2 @ .24 + core r 2.5) | every attr kept (class, `--i`, x / y, transform); fill still from the wrapper (`var(--il-spark)`, `var(--rn-spark)`, `#fff`) |
| Contributors heart (heartBg, ct-tw) | `<path d="M90 142Q…" fill="#fff" class="ct-tw wn-loop" style="--i:n"/>` ×6 | `<g id="htDot@@">` added at the head of its `<defs>` | `<g transform="translate(cx cy) scale(r/6.5)" class="ct-tw wn-loop" style="--i:n"><use href="#htDot@@" fill="#fff"/></g>` (ctTw is opacity-only, so the transform on the same `<g>` is safe) |

- The sparkle `<path id="…Sp@@" d="M0-6.5C…"/>` def is removed in all 27 drawings: after the swap nothing references it.
  New ids keep the `@@` suffix; each is checked unique in its body.
- Rocket window: `#8466F2` (the tile gradient's own `.78` stop, already in the set) instead of the template's `#8a6ff3`
  (not in the set's palette). Reads on all four tiles, both themes (screens below).
- Every other byte of every body is unchanged (diff = the 28 body lines only).

Counts: 4 rockets (3 companion stars removed) · 6 shine faces · 78 bokeh-dot `<use>`s in 27 drawings (6 of them the heart's) ·
91 old sparkle uses gone. Bundle: illustrations.js +1.4 KB, s17 +29 B (no shell inlines the art; no size ceiling hit).

## Verification (no build scripts run)

- Scratch: `…/scratchpad/sparkport/` — `port.mjs` (the transform, reads the original copies `orig-*.js`), `verify.mjs`
  (0 cubic / quadratic sparkles, every href / url(#) local, ids unique; 4 rockets · 6 shine · dots), `render.mjs`
  (before | after, light + dark, illo.css + the tokens.css `--il-*` values, Playwright Chromium, reduced motion = the
  static end frame), `breaks.mjs` (the pin's deliberate breaks on a scratch copy of the root).
- Pin `k-sparkle-swap`: 7 / 7 pass. Breaks: old appsEmpty body back → 3 fail naming appsEmpty; `il-tw` dropped from a
  welcome2 twinkle → (d) fails naming welcome2; clip-path back on the spark → fails; a 2nd rocket `<use>` in welcome4 →
  fails naming welcome4; moPay's coin `<use>` → `#mpaSp@@` → (b) + (c) fail naming moPay.

## Existing pins — what the lead re-bases

None of the existing pins asserts the sparkle markup (grep of smoke-test.mjs + scripts/pins-*/ for `Sp@@`, `M0-6.5C`,
`sparkle`, `il-tw`, `ct-tw`, `contrib__spark`, `clip-path`). Checked by reading, expected to stay green on the rebuilt shells:

| Pin | Why it holds |
|---|---|
| `scripts/pins-s14/e-wallet.mjs:88` | walletEmptyA / B keep ≥ 3 `.il-tw` (4 each) and every ref local |
| `scripts/pins-s17/e-downloads.mjs:190–192` | still 8 `.c-settings-contrib__spark` spans per tap, cleaned up (spawn code unchanged) |
| `scripts/pins-s17/d-set.mjs:39–45` | the chest silhouette count reads `<path>`s only; the removed def was a single path, the shine is rects |
| `scripts/pins-s11/b-illo.mjs:22–53` | ids unique per call, every href / url(#) resolves (new ids carry `@@`) |
| `scripts/pins-s11/b-motion.mjs:24, 40` | `var(--il-spark)` / `var(--rn-spark)` still read; the il-* / rn-* class set is unchanged |
| `scripts/smoke-test.mjs:519` | the stacking-context list flags `clip-path`; one fewer `clip-path` declaration can only help |

## Not ported (outside this change)

- Built output carries the old art until the lead runs the pipeline: `src/demo/spixi.iife.js` (build-demo-bundle),
  `Spixi/Resources/Raw/html/spixi.bundle.js` + `settings.html` (build-shells).
- ⚠ The DESIGN SOURCES still draw the sparkle: `docs/renders/whats-new/parts/art.js`, `parts-e/art2.js`, `parts-i/dc.js`,
  `parts-j/mo.js` and the What's new / kit / moments / add-app renders. The s17 header says "edit the render, then
  regenerate; never hand-edit a body" — a re-port from those sources brings the sparkle back. `k-sparkle-swap` fails then.
