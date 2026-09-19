Next session — commit Session AA, then the bubble gap + the tail (which is NOT a token edit)

0 · Before anything else (#215)
Read `docs/handoff-2026-09-19.md`, then DECISIONS #892–#900. ★ §2 of that handoff matters most:
TWO of Session AA's walk rows look like closures and are not — AA.8 is N/A because finding ③ did
not reproduce (the diagnostic stays armed; nothing was fixed), and AA.9/AA.10 pass for a reason
that is a HYPOTHESIS, not a proven fix. Do not close either.

Check `device_bash` (node 22 / git / npm on the VM). Use `git --no-optional-locks status`. Run
`node scripts/generate-icons.mjs --check`, `node scripts/build-shells.mjs --check`,
`node scripts/extract-strings.mjs --check` and `node scripts/build-legal-docs.mjs --check` on the
real tree before believing any statement about it. CHECK DECISIONS before accepting any "owed" row
from this prompt (#660). ★ The FULL suite runs in the container (#882 ①; recipe in the previous
handoff §4 — which paths to exclude, and that `local-nuget/` must be KEPT) — BEFORE and AFTER;
"predicted" is not an acceptable last line. ★ Reviews run on Opus — pin the model explicitly.

★ Session AA's own lesson, and it applies to item 2 directly: a prescribed plan in a handoff is a
hypothesis. #891 prescribed a one-line revert as "the cheapest test" and reading the code falsified
it before it could spend a build. Check the plan against the tree first.

1 · Item 0 — Session AA is walked and ready
It is UNCOMMITTED and it needs a build (C# in three files). If Damir has not committed it, that is
the first thing: `docs/commit-message-session-aa.txt`, and the `git add` list is in the previous
handoff §7. Local smoke should read **4758** (container 4756 + the measured +2 on his machine).

2 · Build — the bubble gap, then the tail
① THE GAP — a one-token dial and a REVERT. `--bubble-gap-inner: 1px` (`tokens.css:1135`) → `2px`.
   It was 2px at dial C and 3px before that; the token's own comment carries the history. ONE pin
   re-bases (`smoke-test.mjs:24264` asserts the literal `'1px'`) — EXTEND its comment, which holds
   the Session T story, rather than overwrite it.

② ★★ THE TAIL IS NOT A TOKEN EDIT. `--bubble-tail: 8px` / `--bubble-tail-h: 13px` set the BOX; the
   SHAPE is four hard-coded `clip-path` values in absolute pixels, drawn for a 9 × 13 box
   (width = tail + 1, the seam overlap into the bubble): LTR received, LTR sent, and both mirrored
   for RTL (`message-bubble.css:190`, `:196`, `:199`, `:201`). Shrink the tokens without redrawing
   all four and you get a 9 × 13 shape clipped inside a smaller box — a cut-off flag, not a smaller
   tail. All four are pinned at `smoke-test.mjs:24303` together with
   `width: calc(var(--bubble-tail) + 1px)`.
   ⚠ RENDER IT. This is a shape, in two directions and two themes, and "slightly reduce" is a
   judgement Damir makes with his eyes — a number in a docblock is not evidence about a shape.
   Render before pinning (#893), and ASSERT THE SUBJECT IS IN FRAME before shooting (#811).
   ⚠ Read `message-bubble.css:46-58` first — it records why the row inset no longer carries a tail
   term (Damir's dial), and GATE 49 (`smoke-test.mjs:31605`) fails if it comes back. The tail is
   positioned at `-1 × --bubble-tail`, so it follows the body on its own.

③ Then, from `release-readiness.md` §3 — buildable now, no decision needed. Treat it as a MENU and
   re-verify a row before building it (two of its entries were already built when it last ran):
   iOS-44 attach sheet under the composer · iOS-55 untranslated tx timestamps · iOS-43 clipped
   button label · AND-28 existing contacts show no avatar · AND-35 chat-appearance copy + order ·
   R7 share-sheet home leg · the four landscape rows. ⚠ AND-36 is verify-first and #897 may have
   moved it.

★ Each fix walked the same day, on the device that shows it.

3 · Then
* The #46 loop on the batch (Opus). Records (#901+), handoff, checklist + walk artifact, commit
  message.
* The shipping path, since Damir has now answered it: real mainnet money · Android + iOS + Windows ·
  TestFlight / Play. That is a soft launch. The two long-lead items depend on other people and
  should already be moving: the **#232/#523 money-path review** and **counsel on the privacy
  policy** (#899 closed the content, not the legal read). Then AND-25 / AND-27 logcats, the iOS-67
  Inspector call, and an iOS walk — none since ~2026-08-27.
* Still open and unasked-for: the Z.10 chooser copy pick (three sessions now), S1 timed (#872 ②,
  which gates #864 and the spare), AND-40, the #890 dials, the translator pass over
  `src/strings/draft/*.json`, the freeze (#825), the BE cutover.

Rules #215 · #294 · #660 · #663 · #771 (it appeared THREE times in Session AA, twice inside pins
written by the author quoting it) · #798 · #811 · #828 · #861 · #865/#882 ③ · #881 · #890 ·
★ #892: a grep for a retired token finds the pins that NAME it and misses the pins that COUNT it ·
★ #898: the mechanism may be in the page, not the layer above it — two rounds of theory about
overlays and compositors sat on top of one line of `FadeTo`.

Files: `DECISIONS.md` (563 rows, #892–#900) · `docs/handoff-2026-09-19.md` ·
`docs/diagnostic-session-aa-findings.md` (LIVE — the call finding is not closed) ·
`docs/release-readiness.md` · `docs/security-handover-gate.md` · `docs/sheets/session-aa/`.
