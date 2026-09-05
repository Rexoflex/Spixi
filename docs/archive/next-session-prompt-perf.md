Spixi frontend redesign — PERF ROUND (the chat open). Repo:
C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen at 097341a.

READ docs/perf-chat-open-brief.md FIRST. It re-measured the two background documents in a clean
clone and corrects four of their headline numbers — one of them (55 pins read built artifacts,
not 4) changes what a lever costs. Where the brief and the other two disagree, the brief was
measured. Then read docs/perf-lean-workorder.md §4 (Damir's risk ranking, #782) and, for
background only, docs/lean-build-audit.md. Then DECISIONS #780 · #781 · #782 (the pre-warm, the
bridge transport, the ruling) and #785 (Session M put ixian:painted on four more shells, which
changes investigation 7).
Session M's own handoff is docs/handoff-2026-09-05.md — read §3 for the render harness and its
two traps, and §1b for two ways a measurement can lie that both bit that session.

VERIFY THE BASELINE FIRST — clean clone, Linux container (npm i jsdom tree-sitter
tree-sitter-c-sharp), Ixian-Core sibling at 097341a. If any number differs, say so and STOP:
bundle 321 · shells 18 · smoke BASELINE OK 4090 / the 3 known (#136 · M5 · B3) WITH the
sibling (one assertion fewer without it — the M1 hold-out gate, #748; record which)
locales ALL CLEAN 786 · i18n-lint OK (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 141 clean + 1 known gap · extract-strings --check OK · build-shells --check OK
build-legal-docs --check OK (terms baked · privacy HELD)
⚠ If Session M is still uncommitted, it is a SEPARATE batch — do not fold it into yours.

★ ITEM 0 — SETTLE THE FORK IN BRIEF §1 BEFORE WRITING ANY CODE. Does the comment strip run
inside build-shells.mjs (committed artifacts change, 55 pin sources to re-verify, the readable
artifact the [WEBVIEW] mirror traces against is gone) or as a Release packaging step (zero diff,
every pin untouched — but build-shells --check then proves what is COMMITTED, not what SHIPS,
and that guarantee is the whole reason 83 549 lines of build output are committed)? The second
is almost certainly right AND it needs its own gate in the same batch: a check that the shipped
artifact is a comment-strip of the committed one and differs in nothing else. Write that gate
first or do not start the lever. Bring the answer to Damir before building.

THEN, in this order, and land ONE thing at a time with the closing numbers recorded:
① Investigation 1 — per-file parse timing on device (temporary stamps, removed after). Every
  per-lever estimate in both documents rests on a byte-share model the brief's corrected table
  already contradicts, so nothing downstream is trustworthy until this exists.
② Investigation 7 — time ONE ixian:painted round trip. Two stamps. Settles the direct-bridge
  question (#781) forever, either way. ⚠ It now runs on five surfaces, not one (#785).
③ tokens.css is 69% comments — 67 KB, CSS only, no JS line numbers move. The safest byte in the
  audit and a clean first exercise of whatever ② of the fork decides.
④ The doodle tile: SVGO measured at −58.2% (231 → 96 KB) but NOT pixel-identical — the file is
  pure path data, the lossless config saves exactly 0%, and the default output differs on 2.5%
  of pixels (worst case ~6/255 at the 0.07 alpha the chat paints). Render the real chat canvas
  both ways, both themes, and put it in front of Damir as a change to the picture — not as a
  free win. Keep the generator's drift-guard natural size intact.

⑤ ★ 579 KB of DEAD payload, verified by what loads it rather than by grep (brief §3): fonts/
  (340 KB — the redesign embeds its own Inter in spixi.base.css), SIX of the eight files in
  css/ including spixiui-dark and spixiui-light at ~110 KB each, and two unreachable pages —
  apps.html (AppsPage has ZERO references in any .cs or .xaml) and address.html (no loadPage
  call exists). Install size, not open speed, but it is free and nothing can break.
⑥ ★★ THE CHEAPEST LARGE WIN, and it is not in either background doc: swap TEN FontAwesome
  glyphs. libs/fontawesome (344 KB) is alive only because two legacy screens still render it —
  settings_lock.html (arrow-left, info-circle, lock) and wallet_recipient.html (arrow-left,
  check-square, image, pencil-alt, plus, search, square). The redesign already ships every one
  of those in spixi.icons.js. Replace them and libs/ + bootstrap.min.css + normalize.css +
  most of js/ — about 1.3 MB — unblock, with no screen redesigned. Small, bounded, visual;
  Damir's eye on the two pages before it lands.

⛔ DO NOT START, and the brief says why for each: L1 in any form before the fork is settled ·
anything in Tier 3 (per-shell bundle/icon subsetting — the #421 lesson is that an export used
but not destructured boots the shell to a permanent SPINNER; the #780 pre-warm; the L6 bridge
rewrite; the conditional pattern load; one rAF instead of two) · deleting libs/fontawesome
BEFORE ⑥ (two live screens lose their icons — #640 kept wallet_recipient.html deliberately).

Mutate in FULL tar copies (rebuild bundle + shells inside the copy when a component moves),
never cp -al. Bundle BEFORE shells, always. Measure the closing number AFTER the last suite
edit. Render on the real shells before I rebuild (harness: handoff-2026-09-05.md §3).
Measure on device before any fix (#215) — every number in the brief is a measurement of the
ARTIFACT in a container, not of the phone, and the phone is what decides.
⚠ Every pin declares stripCode or raw EXPLICITLY (#771) — this work is ABOUT what built files
contain, so that declaration is the subject here, not bookkeeping. A comment stating an
invariant the code does not enforce is a defect (#772); file:line in a comment is a searchable
anchor, never a number (#773) — the work order broke that rule the same day it was written and
brief §1 is the repair.
⚠ Built chat.html has ~1.6 KB of headroom under the #345 pin ceiling; any prose edit to that
shell budgets a raise IN THE SAME COMMIT, priced the way the pin's docblock prices it.

Commit is mine, in GitHub Desktop; write the message file, the handoff, and the walk artifact
(clickable, P/F/N per row, copyable results) — plus the PowerShell build blocks. Archive
consumed handoffs/checklists into docs/archive; docs/ ends with ONE handoff and ONE checklist.
