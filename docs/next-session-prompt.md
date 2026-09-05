Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend, HEAD 056a59eb. Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen
at 097341a.
READ docs/handoff-2026-09-05d.md FIRST (it supersedes every earlier handoff), then DECISIONS
#789–#797 (Session N: the legacy purge · the reachability gate · the two [CDPERF] instruments ·
the comment-strip fork with its two gates, MSBuild leg verified on the APK · the SVGO doodle for
Damir's eye · the pre-warm SPEC · #796 the capture · #797 the undeletable group), then
docs/cdperf-2026-09-05-session-n-capture.md before anything perf, docs/prewarm-chat-spec.md and
docs/chat-transport-spec.md for items 1 and 2, and the Sessions I–K verdict in
docs/opus-review-brief-sessions-i-k.md §Verdict before touching the present machinery, the
gates, the pins, or anything animated.
VERIFY THE BASELINE FIRST — clean clone of 056a59eb, Linux container (npm i jsdom tree-sitter
tree-sitter-c-sharp playwright-core), Ixian-Core sibling at 097341a. If any number differs, say
so and STOP:
bundle 321 · shells 18 · smoke BASELINE OK 4132 / the 3 known (#136 · M5 · B3) WITH the
sibling (one fewer without it — the M1 hold-out gate, #748; record which)
locales ALL CLEAN 786 · i18n-lint OK (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 138 clean + 1 known gap
extract-strings --check OK · build-shells --check OK · build-legal-docs --check OK
strip-release --check OK (gate 1) · smoke-packaged OK (gate 2)
Mutate in FULL tar copies, never cp -al. Bundle BEFORE shells, always. Measure the closing number
AFTER the last suite edit. Render on the real shells before Damir rebuilds. Measure on device
before any fix (#215). A size pin's headroom is quoted in the pin's OWN unit (normalized chars).
⚠ Every pin declares stripCode or raw (#771); a behavioural pin that STUBS the function under test
proves nothing; a comment stating an invariant the code does not enforce is a defect (#772);
file:line is a searchable anchor, never a number (#773); a slice needs an END anchor and a guard;
a reference graph is built from what LOADS, never from what MENTIONS; an onNavigating handler
cancels FIRST (#797).
════════════════════════════════════════════════════════════════════════
THE NEXT SESSION — the order (handoff §3):
0. THE OWED #46 LOOPS, a CLEAN verdict before any build item: Session M (never reviewed; it
   changed the present path every load-then-present page shares) and Session N's C# + #797
   (SpixiContentPage · HomePage · AppDetailsPage · the csproj target · SContacts ·
   ContactDetails · SingleChatPage). Three disjoint read-only auditors → verifiers → fixers on
   disjoint files → a fresh break-my-verdict reviewer per round, as Session L ran it. Verdict
   written to disk AND back into the brief that ordered it (#660).
1. THE PRE-WARM BUILD per docs/prewarm-chat-spec.md — with the phone in the room: the
   chats-list frame probe BEFORE (spec §4 row 1), the seven pins (§5), the measurement plan
   (§6: 8 opens with the spare READY + 3 fallback, frame drops after every close, memory at
   rest), a #46 loop AFTER. Before-number = #796 (median ~315, create 72–79 + parse 102–109).
   ⛔ #779 (the retained warm WebView) stays parked with the lead.
2. THE BATCH TRANSPORT (#298, docs/chat-transport-spec.md §1–§4): addMessages + messagesDone
   for the load burst — the eval queue's measured 50–70 ms (drain→painted 96–126 vs the
   shell's own 26–38). Small C#; the shell stays idempotent on both transports. Same stamps.
3. Damir's rulings when given: D1 doodle SVGO land/keep (land = cp the candidate over
   src/assets/images/chat-bg-doodles.svg → generate-chat-pattern → build-shells) · D2 lossy
   PNGs render/no · D3 contacts-es.svg convert/keep · D4 the four Session M dials.
4. Small, with a device walk: cancel-first in WalletSentPage · LockPage · LaunchPage (#797's
   class, two lines each) · the #788 `[CDPERF] present <page> by=paint|timer` line.
5. Gate 2 recorded per release; next allowlist candidate spixi.base.css after one release on
   tokens alone. JS stays OFF the list. Then the M tail; release hardening LAST (retire every
   [CDPERF] line incl. the Session N pair, the probes, maxLogCount=5, SpixiDevCoexist, the
   keystore).
Deliverables as always: a commit-message file, the handoff (ONE live handoff in docs/), a
clickable walk artifact (P/F/N, copyable), a checklist with PowerShell blocks (ONE command per
block), consumed docs archived. The commit is Damir's in GitHub Desktop; never git add -A;
nothing pushes from the container. Ask questions if needed.
