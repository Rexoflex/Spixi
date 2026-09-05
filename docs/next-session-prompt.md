Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend, HEAD = the Session O commit (docs/commit-message-session-o.txt).
Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen at 097341a.
READ docs/handoff-2026-09-05e.md FIRST (it supersedes every earlier handoff), then DECISIONS
#798 (the #46 loop over Sessions M + N's C# + #797 → CLEAN in five rounds; cancel-first on all
19 onNavigating handlers) and #799 (the pre-warm's BEFORE instrument), then the verdict in
docs/opus-review-brief-sessions-m-n.md §Verdict, then docs/prewarm-chat-spec.md (the build) and
docs/cdperf-2026-09-05-session-n-capture.md (its before-number), and docs/chat-transport-spec.md
for item 2.
VERIFY THE BASELINE FIRST — clean clone of HEAD, Linux container (npm i jsdom tree-sitter
tree-sitter-c-sharp playwright-core), Ixian-Core sibling at 097341a. If any number differs, say
so and STOP:
bundle 320 · shells 18 · smoke BASELINE OK 4229 / the 3 known (#136 · M5 · B3) WITH the
sibling (one fewer without it — the M1 hold-out gate, #748)
locales ALL CLEAN 784 · i18n-lint OK (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 138 clean + 1 known gap
extract-strings --check OK · build-shells --check OK · build-legal-docs --check OK
strip-release --check OK (gate 1) · smoke-packaged OK (gate 2, 4228)
Mutate in FULL tar copies, never cp -al (and run the COPY's scripts — smoke-test resolves its
root from its own path). Bundle BEFORE shells, always. Measure the closing number AFTER the last
suite edit. Render on the real shells before Damir rebuilds. Measure on device before any fix
(#215). A size pin's headroom is quoted in the pin's OWN unit (normalized chars).
⚠ Every pin declares stripCode or raw (#771) and asserts a PROPERTY, not a line (Session O: four
pins written to close #771 findings were themselves vacuous); a behavioural pin that STUBS the
function under test proves nothing; a comment stating an invariant the code does not enforce is
a defect (#772); file:line is a searchable anchor, never a number (#773); a slice needs an END
anchor and a guard; a reference graph is built from what LOADS, never from what MENTIONS; an
onNavigating handler cancels FIRST and re-allows only file: (#797, now all 19); a refusal is
documented from the cases you did not think of, never from the author's list (#798).
════════════════════════════════════════════════════════════════════════
THE NEXT SESSION — the order (Damir, 2026-09-05: BUILD BOTH LEVERS in this session; the
Session O walk may NOT have run yet — do not wait for A15 or F1, both captures are his and
happen on the Session O build BEFORE this batch lands on the phone):
1. THE PRE-WARM BUILD per docs/prewarm-chat-spec.md §3 — the blank SingleChatPage ctor, the
   deferred ixian:onload, attach(friend), pushParkedPage, HomePage.onChat takeSpare + fallback,
   warm() on idle after the close (350 ms) and once after the first clearChatsDone, dropSpare
   on trim/theme/language/delete/stop, the spare in NO enumerator (Utils.getChatPages ·
   UIHelpers.getLiveShellPages), never re-parked. The seven pins (§5), mutated. The
   `[CDPERF] chat attach spare=1|0` stamp so a capture says which path an open took.
   ⛔ #779 (the retained warm WebView) stays parked with the lead.
2. THE BATCH TRANSPORT (#298, docs/chat-transport-spec.md §1–§4) IN THE SAME SESSION:
   addMessages (one base64 JSON array, append|prepend, reactions folded in) + messagesDone for
   the load burst; the shell (src/shells/chat.html) stays idempotent on BOTH transports (an old
   exe still pushes addThem×N); the 250 ms burst timer is deleted only on the messagesDone
   path; insertMessage stays for live arrivals. Small C# in SingleChatPage.loadMessages.
   Bridge freeze: additive verbs, logged in ARCHITECTURE §4 + the security gate (a new push
   carrying message text = a sink, same argument-escaping path as today).
   ⚠ The two levers land as ONE build, so the phone reads ONE number — Damir's call. Keep the
   stamps separable anyway: `attach spare=` on the open, `burst=` on the drain.
3. A #46 loop AFTER both (auditors → verifiers → fixers → break-my-verdict, CLEAN), then the
   deliverables. Expected: an open in the ~70–90 ms band from ~315 (#796), spare READY.
4. Damir's rulings when given: A15 (a blank Windows lock without the html folder → one
   about:blank clause in the shared tail, 19 places) · D1 doodle SVGO land/keep (land = cp the
   candidate over src/assets/images/chat-bg-doodles.svg → generate-chat-pattern → build-shells)
   · D2 lossy PNGs render/no · D3 contacts-es.svg convert/keep · D4 the four Session M dials.
5. Then: the #788 `[CDPERF] present <page> by=paint|timer` line · the BE row for the
   bot-in-a-group leave · gate 2 per release (spixi.base.css only after a content pin; JS OFF
   the list) · the M tail · release hardening LAST (retire every [CDPERF] line incl. the
   Session N pair, chats-after-close and attach spare=, the probes, maxLogCount=5,
   SpixiDevCoexist, the keystore).
The measurement plan for Damir's phone, in the checklist: (a) on the SESSION O build first:
eight chat opens (#796 stamps) + eight chats-after-close lines = BEFORE; (b) on THIS build:
8 opens with `attach spare=1` + 3 with `spare=0`, the same chats-after-close lines, memory at
rest; frame drops after a close must not rise — if they do, delay the warm or gate it on the
list being idle (no scroll for 300 ms), a tuning step.
Deliverables as always: a commit-message file, the handoff (ONE live handoff in docs/), a
clickable walk artifact (P/F/N, copyable), a checklist with PowerShell blocks (ONE command per
block), consumed docs archived. The commit is Damir's in GitHub Desktop; never git add -A;
nothing pushes from the container. Ask questions if needed.
