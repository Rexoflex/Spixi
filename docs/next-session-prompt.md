Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend, Session L committed. Ixian-Core is a SIBLING clone at
..\Ixian-Core, frozen at 097341a.
READ docs/handoff-2026-09-04.md FIRST (it supersedes every earlier handoff), then
docs/fable-build-brief-premium-density.md §10 + §12 + §13 (the picks ledger — every value has
its reversal in the token comment), then DECISIONS #767–#773. The Sessions I–K verdict is
written into the brief that ordered it: docs/opus-review-brief-sessions-i-k.md (§Verdict) —
read it before touching the present machinery, the gates, the pins, or anything animated.
VERIFY THE BASELINE FIRST — clean clone, Linux container (npm i jsdom tree-sitter
tree-sitter-c-sharp), Ixian-Core sibling at 097341a. If any number differs, say so and STOP:
bundle 321 · shells 18 · smoke BASELINE OK 4067 / the 3 known (#136 · M5 · B3) WITH the
sibling (one assertion fewer without it — the M1 hold-out gate, #748; record which)
locales ALL CLEAN 786 · i18n-lint OK (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 141 clean + 1 known gap · extract-strings --check OK · build-shells --check OK
build-legal-docs --check OK (terms baked · privacy HELD)
Mutate in FULL tar copies (rebuild bundle + shells inside the copy when a component moves),
never cp -al. Bundle BEFORE shells, always. Measure the closing number AFTER the last suite
edit. Render on the real shells before I rebuild (the harness is handoff §3) — my eye rules
every dial. Measure on device before any fix (#215) — the capture recipe is
docs/f5-checklist-session-l.md.
⚠ Built chat.html is 1,663 B under the #345 pin ceiling — any prose edit to that shell budgets
a raise IN THE SAME COMMIT, priced the way the pin's docblock prices it. Don't raise it quietly.
⚠ Every pin declares stripCode or raw EXPLICITLY (#771), and a behavioural pin that stubs the
function under test proves nothing. A comment stating an invariant the code does not enforce is
a defect (#772); file:line in a comment is a searchable anchor, never a number.
Then, in order (handoff §2 — the loop is CLEAN and THE WALK IS ALREADY DONE, so every item
below is written against measurements, not guesses; walk results: docs/walk-session-l-results.md):
⓪ ⛔ WARM CHAT WEBVIEW IS PARKED — DO NOT START (#779). Largest measured win but #777 made it
an architecture decision with a security trade; it is with the lead engineer. If he says yes:
close MAJOR #3 first, wipe FAIL-CLOSED, cap the page lifetime, gate row, #46 loop.
① #766 generalized: the DATA pages present on their own paint (the chat's ixian:painted grammar,
per page) + the [CDPERF] chats pair. The three FORM pages are measured and good.
② #770's THIRD trigger: at ih=475 (split-screen / small window) the ⊕ gets no viewport grow
inside 450 ms, so `reveal by=backstop`. Rotation IS fixed; this is not. My sheet said FAILS:none
and R4 was unscored — the log found it. An unscored row is not a passed row.
③ RAM: the FE lever is DEMOTED (#778, my ruling) — releasing the parked Account WebView
contradicts #766/#315 for 15-25 MB of a 150 MB gap. Only under real OS memory pressure, if ever.
The row goes to BE/core with the measured split.
④ [SCROLL]: MEASURED CLEAN (drop=0, max 8-25 ms). No fix. Don't spend a session on it.
⑤ The group-avatar device fact. ⑥ Alignment: CLOSED, it was #768's stale assets (G1/G2 pass).
⑦ Chat appearance restructure (#774) — three rulings resolved, ONE OWED: dark mode, hide the
colour selector or design a gradient. Render both grounds and show me; don't answer it in prose.
⑧ Apps list (#775): default GRID + the view must survive a restart (spixi.apps.layout, read at
seed time). The new key gets its security-gate row IN THE SAME BATCH.
⑨ W4: image paste is unimplemented on Windows (no clipboard handling in Platforms/Windows at
all) — a feature row, not a regression.
⑩ Walk fallout from my eye on the rest. ⑪ The TG-order chat-info rebuild (render round).
⑫ My pending rulings (URL previews · privacy wording · "left the group").
⑬ The pre-launch security batch (docs/batch-security-close-spec.md) — S-2 traversal, S-1 link
spoof, S-3 drafts, S-4 wallet password. All ours, no BE engineer, no core change.
⑭ The iOS rows when I say Mac. ⑮ Release hardening last.
Commit is mine, in GitHub Desktop; write the message file, the handoff, and the walk
artifact (clickable, P/F/N per row, copyable results) — plus the PowerShell build blocks.
Archive consumed handoffs/checklists into docs/archive; docs/ ends with ONE handoff and ONE
checklist.
