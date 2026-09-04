Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen at 097341a.
READ docs/handoff-2026-09-05.md FIRST (it supersedes every earlier handoff), then
DECISIONS #783–#787 (Session M: appearance restructure · apps layout · present-on-paint ·
the split-screen row Damir ruled not-built), and #780–#782 if you touch perf (a parallel
session's lean-build work order, re-ranked by RISK on his ruling: docs/perf-lean-workorder.md).
Then docs/fable-build-brief-premium-density.md §10 + §12 + §13 (the picks ledger — every value
has its reversal in the token comment). The Sessions I–K verdict is written into the brief that
ordered it: docs/opus-review-brief-sessions-i-k.md (§Verdict) — read it before touching the
present machinery, the gates, the pins, or anything animated.

VERIFY THE BASELINE FIRST — clean clone, Linux container (npm i jsdom tree-sitter
tree-sitter-c-sharp), Ixian-Core sibling at 097341a. If any number differs, say so and STOP:
bundle 321 · shells 18 · smoke BASELINE OK 4090 / the 3 known (#136 · M5 · B3) WITH the
sibling (one assertion fewer without it — the M1 hold-out gate, #748; record which)
locales ALL CLEAN 786 · i18n-lint OK (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 141 clean + 1 known gap · extract-strings --check OK · build-shells --check OK
build-legal-docs --check OK (terms baked · privacy HELD)

★ ITEM 0 — THE #46 ADVERSARIAL LOOP OVER SESSION M, before any further build on those
surfaces. I–K and L are reviewed; Session M (#783–#787) is not. It is not blocking the walk.

Then work handoff §2 in order. ⓪ is PARKED (#779) — do not start it. ① and ⑧ are DONE;
② is ruled logged-not-built (#786) — do not build it back on your own.

⚠ Session M's open dials, all Damir's, all one word: the appearance card is still called
"Canvas" (not "Colour") · the empty background tile is "None" (not "Off") · the data-matrix
swatch could go LARGER than 144px · the doodles swatch boost is x3 (#787) with x4.5 and x2
rendered either side. Every strip is in docs/sheets/session-m/.

Mutate in FULL tar copies (rebuild bundle + shells inside the copy when a component moves),
never cp -al. Bundle BEFORE shells, always. Measure the closing number AFTER the last suite
edit. Render on the real shells before I rebuild (the harness is handoff §3 — note the two
traps it records: a `*/` inside a path comment, and dialling a pseudo-element property with
an inline style, which photographs a strip of identical tiles that looks like data).
Measure on device before any fix (#215).
⚠ Every pin declares stripCode or raw EXPLICITLY (#771), and a behavioural pin that stubs the
function under test proves nothing. A comment stating an invariant the code does not enforce
is a defect (#772); file:line in a comment is a searchable anchor, never a number.
⚠ Built chat.html has ~1.6 KB of headroom under the #345 pin ceiling — any prose edit to that
shell budgets a raise IN THE SAME COMMIT, priced the way the pin's docblock prices it.

Commit is mine, in GitHub Desktop; write the message file, the handoff, and the walk artifact
(clickable, P/F/N per row, copyable results) — plus the PowerShell build blocks. Archive
consumed handoffs/checklists into docs/archive; docs/ ends with ONE handoff and ONE checklist.
