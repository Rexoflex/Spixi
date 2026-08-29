# HANDOFF — SESSION E: THE CHAT BACKGROUND PATTERN. Nothing else.

★★ **THIS IS A SMALL STANDALONE SESSION AND ITS SUBJECT IS ONE THING.** Damir,
2026-08-29: *"i will fix up the background pattern, which is still a bit off… it will be a
small standalone session for pattern."*

⚠ **THE #46 LOOP MOVES TO SESSION F.** It was ordered by `docs/handoff-2026-09-02.md` §4
and that order still stands — it is now the session *after* this one. **Do not run it here,
and do not fold pattern work into it.**

## 0 · ★★ START BY INTERVIEWING HIM. DO NOT OPEN WITH A PROPOSAL.

Damir is driving this from his own instructions and wants help, not a redesign. **"A bit
off" has six independent dials behind it** (§2) and they interact. Localise before touching
anything.

★ **He has been right every time he pushed back, and the last three rounds of this project
were decided by a MEASUREMENT that contradicted the obvious reading** — L14's mechanism
(#688), the L10 phantom, and "the launcher is too dark" (#689, it was under-saturated, and
lightening it made it worse). **Ask which dial, then render it before he rebuilds.**

Questions worth putting to him, in his words not mine:
* **Which theme is off — light, dark, or both?** ⚠ They are NOT symmetric (§2 ⑥), so this
  single answer can eliminate half the dials.
* **Is it the ARTWORK (the triangles themselves), the SCALE, the STRENGTH, or the GROUND
  behind it?** Those are four different files.
* **Is it off in the chat, in the settings SWATCHES, or both?** The swatches deliberately
  run at 6× alpha (§2 ⑤) and are not a preview of the real thing.
* **Which style is he looking at?** The default is `triangles`; `lineart`, `matrix` and
  desktop-only `flow` all still ship.

## 1 · The baseline

```
bundle 307 · shells 18 · smoke BASELINE OK 3660 / the 3 known (#136 · M5 · B3)
· locales ALL CLEAN 779 · cs-syntax 140+1 · i18n-lint ✓ · pseudo 9/9
· Ixian-Core 097341a (170 modified files = CRLF churn; --ignore-cr-at-eol EMPTY)
```

⚠ Verify it BEFORE work and measure it AFTER the last edit to the suite — session D's entry
baseline was one pin low because three documents copied a number recorded 37 minutes before
the final pin landed (#681).

★ **49 pins already reference the pattern.** Expect several to go red on any real change;
that is them working. Update their TEXT as well as their regex — #687 caught a pin that kept
passing while its own sentence had gone stale.

## 2 · ★★ THE SIX DIALS — the whole surface, and where each one lives

| | dial | home | today |
|---|---|---|---|
| ① | **which style** | `PATTERN_STYLES`, `src/components/settings-screens.js:33` | `triangles` (default since 2026-08-22) · `lineart` · `matrix` · `flow` (desktop only) |
| ② | **the tile artwork** | `scripts/generate-chat-pattern.mjs` — `TRI` for triangles, `MATRIX` for the matrix; **line art is Damir's export**, `src/assets/images/chat-bg-pattern.svg` | `TRI = { step: 56, rows: 4, cols: 4, stroke: 1, alpha: 0.9 }` |
| ③ | **tile scale** | derived by the generator, emitted as `--chat-pattern-size-*` | triangles `224 × 193.988` · lineart `314 × 314` · matrix `288 × 288` |
| ④ | **ink colour** | `src/styles/tokens.css:992` (light) · `:1165` (dark) | `--chat-pattern-ink` `#181a20` light · `#f0f4ff` dark |
| ⑤ | **strength** | `tokens.css:998–1000` · `:1166–1168`; selected by a LEVEL INDEX via `patternLevelVar()` | `--chat-pattern-alpha-1` `.042` light / `.045` dark (Default) · `--chat-pattern-alpha-2` `0.1` both (Strong) |
| ⑥ | **the ground behind it** | `tokens.css:1025` (light) · `:1173` (dark) | ⚠ **light `--gradient-chat` is FLAT `--chat-canvas-base`; dark adds a radial `rgba(80,122,249,.10)` at 50% 0%.** The two themes are not the same surface |

★ **⑥ is the dial nobody names and the one most likely to be "a bit off".** The pattern is
inked onto a ground that differs between themes, so an identical tile at an identical alpha
genuinely does not look identical. If his complaint is theme-specific, start here.

★ **The layer contract** (`message-bubble.css:8–32`): `.c-chat-canvas` paints
`--gradient-chat`; its `::before` is the pattern layer — an inset-0 box whose
`background-color` is the ink, masked by the tile, at `opacity: --chat-pattern-opacity`.
Messages are children and sit above it. **Geometry and intensity live in `message-bubble.css`;
the paint lives in the generated `chat-pattern.css`.** Two files, on purpose.

## 3 · ⚠ Rules this surface has already paid for

* **`src/styles/chat-pattern.css` is GENERATED. Never hand-edit it.** Change the generator or
  the source SVG, then `node scripts/generate-chat-pattern.mjs`. Its own header says so.
* **The generator has a guard on the line art**: a changed `chat-bg-pattern.svg` fails the
  run unless you pass `--accept-lineart-change`. That file is Damir's export; a silent
  change to it is exactly what the guard exists to stop. **Do not pass the flag to make an
  error go away** — find out why the file moved.
* **The swatches are amplified 6×** (`PATTERN_SWATCH_BOOST`). At true alpha, Off and Default
  are the same tile at 56 px in light mode and the control cannot be read. ⚠ **If you change
  `--chat-pattern-alpha-*`, re-check the swatches** — the boost keeps the Default:Strong
  ratio, so a new ratio changes what the picker looks like.
* **The strength pref is a LEVEL INDEX (0/1/2), not an alpha.** `readPatternLevel()` migrates
  the pre-#422 fractional prefs (`0 / 0.3 / 0.5 / 0.7`). A fractional stored value is OLD, an
  integer 1 or 2 is NEW; they overlap only at 0, which means Off in both. **Do not
  reintroduce a fractional pref.**
* **The tile must stay SEAMLESS.** The triangle tile is seamless by construction — every
  stroke leaving an edge re-enters on the opposite one. Any new artwork owes the same proof,
  and the proof is a render of 2×2 tiles, not an assurance.
* **Retiring a style silently re-skins whoever chose it.** Line art was kept for exactly
  this reason when triangles became the default. If Damir wants one gone, that is a ruling
  to take from him explicitly, not a tidy-up.
* **`flow` is desktop-only and is a CANVAS engine**, not a tile — `--chat-pattern-tile: none`
  hides the `::before` and `chat-flow.js` paints. Its fallback deliberately keeps the
  line-art URI resolvable so a failed mount flips back to a tile.
* **Fail-soft is a feature**: without `chat-pattern.css` the canvas degrades to
  gradient-only, never a solid ink rectangle. Keep that true.

## 4 · ★ The instrument — render before he rebuilds

He has spent real rebuilds on look-and-feel this project (two on the launcher icon alone).
**A pattern change is cheap to render and expensive to walk, so render it.**

* `cairosvg` + `PIL` in the container will rasterise a tile, repeat it 2×2 to prove
  seamlessness, ink it, composite it at the real alpha over the real `--gradient-chat`, in
  BOTH themes, at phone size. That is a truthful preview; a swatch is not.
* ★ For a colour or intensity question, **measure, do not eyeball** — the launcher row
  (#689) was settled by sampling L\* and chroma off his own screenshot, after two rounds of
  opinion got it backwards.

## 5 · ⚠ The rebuild is CHEAPER than the last three

A pattern change is CSS + the generated stylesheet + the bundle + the shells. **No C#.**
So: **no `obj`/`bin` wipe and NO UNINSTALL** — those were for the launcher icon and the
splash theme, which Android caches hard. A plain redeploy shows a pattern change.

★ Bundle before shells, always (#258 §5.6). Windows still builds with **F5 only** (#663).

## 6 · What this session must NOT do

* Not the #46 loop — session F (`docs/handoff-2026-09-02.md` §4 has the scopes).
* Not L3 / L4 / L9, not the Mac rows, not the floating composer or the batched roster paint
  (#686 costed both and Damir deferred both).
* Not the L14 fix — falsified (#688). And not the `[LANDTAB]` probe removal unless Damir
  asks; it is ordered as a trio in the next code batch.

## 7 · Owed by Damir

* **His pattern instructions** — this session's whole input.
* L12 (an admin account) · the desktop leg of the L14 order (free, still unspent).
