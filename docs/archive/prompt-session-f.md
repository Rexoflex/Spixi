Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen at 097341a.
Read docs/handoff-2026-09-04.md and follow it. §4a is the running order — do NOT resequence it.

★★★ THIS IS A BIG OVERNIGHT SESSION AND DAMIR IS ASLEEP. YOU CANNOT ASK HIM ANYTHING.
  That changes the rules, not the standards. Every row is either already ruled or explicitly
  deferred with the reason. A row needing a taste decision he has not made is NOT yours to
  decide: do the measurable half, RENDER the choice, and write it into §7 for the morning.
  Those rows are marked ⏸ in the handoff. Work the whole night; do not stop early because
  something is ambiguous — do the unambiguous part and log the rest.
★★ WRITE PROGRESS BACK INTO docs/handoff-2026-09-04.md AS YOU GO, row by row, never only at
  the end (#515). If you die at 04:00 he must be able to read exactly where it stopped.

VERIFY THE BASELINE FIRST. If any number differs, say so and STOP:
  bundle 307 · shells 18 · smoke BASELINE OK 3686 / the 3 known (#136 · M5 · B3)
  · locales ALL CLEAN 778 · cs-syntax SKIPPED (tree-sitter native build fails, container too)
  · i18n-lint ✓ · pseudo 9/9
  · Ixian-Core 097341a (170 modified files = CRLF churn; --ignore-cr-at-eol is EMPTY)
★ MEASURE THE CLOSING NUMBER AFTER THE LAST EDIT TO THE SUITE, or it is not the closing
  number (#681).
⚠ Smoke takes ~6 min and the bridge shell kills anything past 45 s — run it in the container.
⚠ CHECK WHAT IS MOUNTED before anything else. Ixian-Core is OUTSIDE the git repo; if
  $HOME/mnt/ shows only Spixi, ask Damir to add it — and if he is asleep, say so in §7 and
  work only the rows that do not need it.

THE ORDER (handoff §4a), and it is chosen so a partial night is still coherent:
  1 · PAY THE MUTATION DEBT (§5) — owed on work that already shipped. ~40 min, mechanical.
      Two mutations of the second pass never completed, and the ENTIRE E1c round is
      unmutated because every value changed after that pass ran. Earlier results for those
      slots tested SUPERSEDED values and do not carry over.
  2 · THE ADVERSARIAL LOOP (§4b) — read-only, four scopes. Session E's own output is now the
      largest unaudited surface in the repo; §4b of docs/handoff-2026-09-02.md names what was
      ALREADY unaudited before it. Both lists stand. Write the verdict INTO the handoff.
      ★ Auditor A also settles the #686 roster-paint flag: a ~146 ms win recorded 29 Aug
      against an L10 that the loop later found was a no-op. If they are the same change the
      premise for chunking is a phantom and the row dies.
  3 · GIFs (#684) — two traced defects, neither is the picker. ① a pasted Giphy/Tenor SHARE
      link is a PAGE url and mediaUrlOf's allowlist matches only the DIRECT media host.
      ② the GIF keyboard commits a `paste` carrying a file and nothing reads clipboardData.files.
  4 · NOTIFICATIONS P1 + P2 (docs/privacy-workorder-2026-08-29.md). P1 is three lines and
      closes a live PRE-CONSENT data flow on Android: ConsentRequired before Initialize,
      ConsentGiven on acceptance and on later launches. ★ It KEEPS #493's early handler
      registration — do not "fix" it by moving Initialize later.
  5 · THE WINDOWS .ico — it carries ONE 64x64 bitmap today, which is the "rough" he reported.
      Emit 16/24/32/48/64/128/256 with alpha. ⚠ VERIFY AT THE ARTIFACT, never at the taskbar.
  6 · ⏸ THE DARK CANVAS (#701) — the UNAMBIGUOUS HALF ONLY. Take the lift .20 → .06 and mark
      it provisional. DO NOT touch --chat-canvas-base: his words say "near black close to
      neutral01" but BOTH readings of neutral01 measure LIGHTER than the #0f1115 that ships
      (L* 7.50 and 6.26 against 5.03). The base is his to settle; the lift is not ambiguous.
  7 · L3 + L4 + L9 — the final FE batch, LAST because a partial batch is still coherent.
      ★ Fix the live defect inside it FIRST: 9 of 13 shells emit ixian:back but never import
      dismissTopOverlay, so a sheet open in them is not a back level. L3 is Android/Windows
      only — the iOS half is Mac work. If you cannot finish L3, land L4 + L9 and cost L3.
★ STOP AT A ROW BOUNDARY if you run out of night, and say which one.

★★ DO NOT DECIDE THESE ALONE (handoff §4e): the secure-notice copy (§0 — it is a COPY ruling,
  it costs an i18n pass across twelve locales, and the app ships in days) · the dark canvas
  BASE · the rail logo (measured: logo.svg and the app-icon mark are the SAME artwork, so
  there is nothing in the repo to swap to) · any pattern style retirement (ruled at #690) ·
  the legal documents, which are OUT OF SCOPE tonight.

★★ THE RULES THIS PROJECT KEEPS PAYING FOR:
1. ★★ TRACE WHAT THE PLATFORM ACTUALLY READS, not the artifact you expect to matter.
   Session E found build-shells.mjs about to overwrite Damir's new illustrations (#693) and
   the MauiIcon `Color` flooding the rounded corners it was meant to leave alone (#698) —
   both only because someone read the copy step and the BUILT artifact.
2. ★★ CHECK A BLOCKING CLAIM AT SOURCE BEFORE REPEATING IT.
3. ★★ STRIP COMMENTS BEFORE ANY NEGATIVE SWEEP — and XML comments are NOT JS comments;
   stripCode() sails straight past <!-- -->.
4. ★★ MUTATE EVERY PIN BEFORE BELIEVING IT, AND READ BOTH HOMES — src/components AND
   src/demo/spixi.iife.js. ★ A BARE KEY NAME IS A PREFIX TEST (it caught Session E on the
   same day that rule was quoted at it) · BOUND A SLICE BY THE NEXT DECLARATION, NEVER BY A
   CHARACTER COUNT · AND A PIN'S TEXT GOES STALE LIKE A COMMENT.
   ⚠ The harness: cp -al the tree, ONE edit per copy, os.remove before writing (never write
   through a hardlink), three runs at a time; seven concurrent jsdom runs wedge the box.
5. ★★ A PIN THAT OUTLIVES ITS RULING IS HOW A DELIBERATE DECISION GETS "FIXED" BACK.
   Session E retired two — N82(c)'s "light is untouched" and E1's ground symmetry — and both
   are pinned AS reversals with the old ruling in the comment. Do not restore them.
6. ★★ MEASURE BEFORE ASSUMING, AND RENDER BEFORE HE REBUILDS. Five rows have now been decided
   by a measurement that contradicted the obvious reading (#294, #670, #688, #689, #701).
   The one thing Session E decided without a render — the Windows corners — came back wrong.
7. SIZE THE SESSION AROUND THE REVIEW, NOT THE ROWS.
⚠ Owed by Damir: the secure-notice ruling · the ipn.ixian.io TTL · a rail logo file · L12
  (an admin account) · the desktop leg of the L14 order, free and still unspent.
Do NOT re-open anything in docs/handoff-2026-09-04.md §8.
