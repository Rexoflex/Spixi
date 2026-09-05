Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen at 097341a.
READ docs/handoff-2026-09-05c.md FIRST (it supersedes every earlier handoff), then DECISIONS
#789–#797 (Session N: the legacy purge · the reachability gate · the two [CDPERF] instruments ·
the comment-strip fork with its two gates · the SVGO doodle for Damir's eye · the pre-warm
SPEC · the image set), then docs/prewarm-chat-spec.md if the pre-warm is on the plate, and the
Sessions I–K verdict in docs/opus-review-brief-sessions-i-k.md §Verdict before touching the
present machinery, the gates, the pins, or anything animated.
VERIFY THE BASELINE FIRST — clean clone, Linux container (npm i jsdom tree-sitter
tree-sitter-c-sharp playwright-core), Ixian-Core sibling at 097341a. If any number differs, say
so and STOP:
bundle 321 · shells 18 · smoke BASELINE OK 4132 / the 3 known (#136 · M5 · B3) WITH the
sibling (one fewer without it — the M1 hold-out gate, #748; record which)
locales ALL CLEAN 786 · i18n-lint OK (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 138 clean + 1 known gap (141 → 138: three C# pages are deleted)
extract-strings --check OK · build-shells --check OK · build-legal-docs --check OK
strip-release --check OK (gate 1) · smoke-packaged OK (gate 2, one fewer without the sibling)
#797 landed after the walk (the undeletable group, C# only): smoke 4125 → 4132; gate 1 was
verified against the Signed APK (handoff §2b). Queued from it: cancel-first in WalletSentPage ·
LockPage · LaunchPage (two lines each, the same class).
Mutate in FULL tar copies, never cp -al. Bundle BEFORE shells, always. Measure the closing number
AFTER the last suite edit. Render on the real shells before Damir rebuilds. Measure on device
before any fix (#215). A size pin's headroom is quoted in the pin's OWN unit (normalized chars).
⚠ Every pin declares stripCode or raw (#771); a behavioural pin that STUBS the function under test
proves nothing; a comment stating an invariant the code does not enforce is a defect (#772);
file:line is a searchable anchor, never a number (#773); a slice needs an END anchor and a guard;
a reference graph is built from what LOADS, never from what MENTIONS.
════════════════════════════════════════════════════════════════════════
SESSION N+1 — the order (handoff §3):
0. THE OWED #46 LOOPS: Session M (never reviewed; it changed the present path every
   load-then-present page shares) and Session N's C# in a SEPARATE session.
1. THE CAPTURE IS DONE (#796, docs/cdperf-2026-09-05-session-n-capture.md): read it before
   anything perf. rtt 3–4 ms → #781 dropped · strings 5 ms → L2 dropped · the pre-warm moves
   ~180 ms of ~315 · the eval queue (~12 serial evals per open) is 60–90 ms → #298's batch
   transport is the second lever. Still owed: the #788 `present <page> by=paint|timer` line.
2. Damir's rulings: D1 doodle SVGO land/keep · D2 lossy PNGs · D3 contacts-es.svg → PNG ·
   D4 the four Session M dials (Canvas/Colour · None/Off · boost ×3 · matrix larger).
3. THE PRE-WARM BUILD per docs/prewarm-chat-spec.md — with the phone in the room: the chats-list
   frame probe BEFORE, the seven pins, a #46 loop AFTER. ⛔ #779 stays parked with the lead.
4. Gate 2 recorded per release; next allowlist candidate spixi.base.css after one release on
   tokens alone (its post-conditions already pass). JS stays OFF the allowlist.
5. The unchanged tail of the M queue; release hardening LAST (retire every [CDPERF] line incl.
   the Session N pair, the probes, maxLogCount=5, SpixiDevCoexist, the keystore).
Commit is mine, in GitHub Desktop; write the message file, the handoff, and the walk artifact
(clickable, P/F/N per row, copyable results) — plus the PowerShell build blocks, ONE command per
block. Archive consumed handoffs/checklists into docs/archive; docs/ ends with ONE handoff and
ONE checklist.
