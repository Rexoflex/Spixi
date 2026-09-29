SMALL FE BATCH (Damir's premium-walk notes, #1049), then the office (Mac + iPhone).

0 · Read `docs/handoff-2026-09-29b.md` FIRST, then DECISIONS #1039–#1049. Check: PC HEAD is the commit that
carries #1049 (on top of `8bc4a49a`); `node scripts/smoke-test.mjs` = BASELINE OK 4969 / the 2 KNOWN.

1 · Build the three items in handoff §1:
  ① tx-sheet address as ONE continuous mono block (no visual gaps, `word-break: break-all`) — render first;
  ② "See details" the same size as Close — ask Damir for the screenshot if it is not in the chat; verify first (#294);
  ③ Notifications: OneSignal in its own card, the description as a footnote under it — render both themes.

2 · Opus #46 loop over ①–③ until CLEAN. FULL pipeline (extract-strings → build-locales → build-strings-iife →
build-demo-bundle → build-shells) → the three `--check` gates → smoke (any new number-format pin sets
`lang = 'en-US'`).

3 · Deliver to the PC, one short walk sheet (Windows + Android), DECISIONS rows, handoff. Then the office walk
(handoff §2). Commit + push = Damir. Chat replies in ASD-STE100 (#931).
