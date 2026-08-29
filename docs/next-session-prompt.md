Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen at 097341a.
Read docs/handoff-2026-09-03-pattern.md and follow it.

★★ THIS IS A SMALL STANDALONE SESSION AND ITS SUBJECT IS THE CHAT BACKGROUND PATTERN.
  Damir, 2026-08-29: "i will fix up the background pattern, which is still a bit off...
  it will be a small standalone session for pattern."
★★ HE IS DRIVING IT FROM HIS OWN INSTRUCTIONS. START BY INTERVIEWING HIM. DO NOT OPEN WITH
  A PROPOSAL, AND DO NOT REDESIGN THE PATTERN. Handoff §0 has the questions worth asking.
⚠ THE #46 LOOP IS SESSION F, NOT THIS ONE. It is still ordered — docs/handoff-2026-09-02.md
  §4 holds the scopes — and it runs AFTER this. Do not run it here and do not fold pattern
  work into it.

VERIFY THE BASELINE FIRST. If any number differs, say so and STOP:
  bundle 307 · shells 18 · smoke BASELINE OK 3660 / the 3 known (#136 · M5 · B3)
  · locales ALL CLEAN 779 · cs-syntax 140+1 · i18n-lint ✓ · pseudo 9/9
  · Ixian-Core 097341a (170 modified files = CRLF churn; --ignore-cr-at-eol is EMPTY)
★ MEASURE THE CLOSING NUMBER AFTER THE LAST EDIT TO THE SUITE, or it is not the closing
  number (#681 — three documents carried a figure recorded before the final pin landed).
⚠ Smoke takes ~6 min and the bridge shell kills anything past 45 s — run it in the container.
⚠ cs-syntax-check needs tree-sitter, whose native build FAILS on the device VM. Container too.
⚠ CHECK WHAT IS MOUNTED before anything else. Ixian-Core is OUTSIDE the git repo; if
  $HOME/mnt/ shows only Spixi, ask Damir to add it. Session C lost two rows to this.

★★ THE PATTERN HAS SIX INDEPENDENT DIALS AND "A BIT OFF" COULD BE ANY OF THEM (handoff §2):
  the style · the tile artwork · its scale · the ink colour · the strength · AND THE GROUND
  BEHIND IT, which is NOT the same in both themes (light is flat, dark carries a blue
  radial). Localise before touching. 49 existing pins reference this surface.
⚠ src/styles/chat-pattern.css is GENERATED — never hand-edit it; change the generator or the
  source SVG and re-run scripts/generate-chat-pattern.mjs. The generator GUARDS the line-art
  SVG (Damir's export): do not pass --accept-lineart-change to silence an error.
★ THE REBUILD IS CHEAP HERE: CSS + bundle + shells, NO C#, so NO obj/bin wipe and NO
  UNINSTALL. Those were for the launcher icon and the splash theme. Bundle before shells
  (#258 §5.6). Windows still builds with F5 only (#663).

★★ THE RULES THIS PROJECT KEEPS PAYING FOR:
1. ★★ TRACE WHAT THE PLATFORM ACTUALLY READS, not the artifact you expect to matter.
2. ★★ CHECK A BLOCKING CLAIM AT SOURCE BEFORE REPEATING IT.
3. ★★ STRIP COMMENTS BEFORE ANY NEGATIVE SWEEP (the top-level stripCode in smoke-test.mjs).
4. ★★ MUTATE EVERY PIN BEFORE BELIEVING IT, AND READ BOTH HOMES — src/components AND
   src/demo/spixi.iife.js. ★ Session D's three pin classes: BOUND A SLICE BY THE NEXT
   DECLARATION, NEVER BY A CHARACTER COUNT · A BARE KEY NAME IS A PREFIX TEST · AND A PIN'S
   TEXT GOES STALE LIKE A COMMENT — when you re-time or re-colour anything, GREP THE SUITE
   FOR THE OLD NUMBER, not just the old code.
   ⚠ The harness: cp -al the tree, ONE edit per copy, os.remove before writing (never write
   through a hardlink), three runs at a time — seven concurrent jsdom runs wedge the box.
5. When a reviewer finds the same class twice, question the DESIGN.
6. ★★ MEASURE BEFORE ASSUMING (#294), AND RENDER BEFORE HE REBUILDS. Three rows in a row
   were decided by a measurement that contradicted the obvious reading: L14's mechanism was
   falsified (#688), L10 was a no-op whose probe would have called it a success (#670), and
   "the launcher is too dark" was wrong — it was under-saturated, and lightening it made it
   worse (#689). A rasteriser settles a look question; opinion does not.
7. SIZE THE SESSION AROUND THE REVIEW, NOT THE ROWS.

⚠ Owed by Damir: his pattern instructions (this session's whole input) · L12 (an admin
  account) · the desktop leg of the L14 order, which is free and still unspent.
Do NOT re-open anything in docs/handoff-2026-09-02.md §8.
Interview him for anything unknown, don't assume. One command per code block, real paths,
no placeholders. He has been right every time he pushed back.
