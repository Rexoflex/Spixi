Read docs/handoff-2026-08-18.md FIRST and verify the git state it describes
(the N4 batch #378-#379 + the #380 doc followup on top of 646ef4e9 - if the
chain does not match, stop and say so). This session runs in **#380 BUDGET
MODE - the scope is PINNED, do not widen it:**

① **N13 - BUILD.** Onboarding "Back up now" does nothing at account creation
(data-loss class, the top open bug). Triage against code first (#215): find
the wired handler on the launch/onboarding backup CTA, compare with the
WORKING Account → Backup path, and name the break before touching anything.
Fix the smallest correct way (reuse the working path; no new verbs without
logging a security-gate row). If the fix turns out to need BE work or a
Damir dial, STOP at a triage doc + plan and hand off.

② **N40 - TRIAGE ONLY, NO BUILD.** "Connecting…" stops showing on a LIVE
document after long offline use (D-21 candidate). Prime suspect: the
update-available branch starving the connectivity block (loop r1 note on
#357); second: the delay-counter. Read the code, decide which mechanism fits,
and write the repro protocol for me (what to do on device, what log lines
decide it). The deliverable is a verdict-or-protocol doc, not code.

NOTHING ELSE. N10/N15/N39 are the NEXT session. Do not touch N57 (Core-side,
my protocol run pending), the §5 pile, or anything in handoff §6.

ECONOMY RULES (hard): smoke as bookends only - baseline once (expect
1947/4) and final once (state the new number) - plus ONE batched
mutation-proof run for any new pins. ONE Opus review round at the end, only
because N13 touches a data path; no r2/r3 unless it finds a MAJOR. No agent
fan-outs. Standing set otherwise unchanged: cloud twin · verify against code
(#215) · bundle before shells · locale pipeline + i18n-lint + pseudo +
i18n-overflow-audit only IF strings changed · DECISIONS rows at decision
time · security gate row · tarball delivery + updated handoff + F5 checklist
(short - only the legs this session touched). Archive the consumed
docs/f5-checklist-2026-08-18-n4.md in the batch. I commit.
