SPIXI — wrap-up delivery, 2026-08-19 (DECISIONS #399-#420)
==========================================================

WHAT THIS IS
  The complete uncommitted delta on top of 679b917: the overnight batch, two review
  rounds, the four system-bar rounds your F5 produced, three on-device probes, and
  the full documentation set.

  Smoke 1992 -> 2070 pass / the SAME 4 known pre-existers (#136 #149(3) M5 B3).
  F5'd on Android: the bar round passed 5/5.

APPLY
      tar -xzf spixi-wrap-2026-08-19.tar.gz          (extracts over the repo root)

  Then rebuild the generated files and verify:
      node scripts/extract-strings.mjs
      node scripts/build-locales.mjs
      node scripts/build-strings-iife.mjs
      node scripts/build-demo-bundle.mjs
      node scripts/build-shells.mjs
      node scripts/smoke-test.mjs                    -> BASELINE OK - 2070 / the 4 known

** ONE THING THE TARBALL CANNOT DO **
  A tarball only ADDS files. Four docs were ARCHIVED (moved) and their copies are
  already in docs/archive/ inside this tarball -- but the ORIGINALS are still sitting
  in docs/ on your disk. Delete them so you do not end up with both:

      git rm docs/handoff-2026-08-19d.md docs/handoff-2026-08-19e.md `
             docs/handoff-2026-08-19f.md docs/f5-checklist-2026-08-18-launch.md

  (Or move them yourself; the point is docs/ should end with exactly ONE handoff,
   handoff-2026-08-19g.md, and ONE checklist, f5-checklist-2026-08-18-overnight.md.)

READ IN THIS ORDER
  1. docs/handoff-2026-08-19g.md       <- the state. Section 5 is the honest gap list
  2. docs/f5-checklist-2026-08-18-overnight.md   <- section 7 has the commit message
  3. DECISIONS.md rows #399-#420
  4. docs/next-session-prompt.md

COMMIT
  The message is in the F5 checklist section 7. Verify first:
      git --no-optional-locks status
      git --no-optional-locks diff --ignore-cr-at-eol --stat   (must match plain --stat)

STILL OPEN, AND WAITING ON YOU
  * N80 - rate-me first-show gate: open COUNTER or first-run DAY? Your dial.
  * N79 - three undefined SL ids on wallet_send.html: add the keys, or let the
          redesign retire the page? Your call, it is the money path.
  * N72 - scan feedback: confirm-and-land, or confirm-as-PENDING? Design it WITH
          N69(b), or the copy repeats the lie N69 is about.
  * The in-call strip on Android has still never been exercised - it needs a real
    two-device call (checklist 1.6).
