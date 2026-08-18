Read docs/handoff-2026-08-18b.md FIRST and verify the git state it describes
(the N12/N40 batch #381-#383 on top of 26f29133 - if the chain does not match,
stop and say so). This session runs in **#380 BUDGET MODE - the scope is PINNED,
do not widen it.**

PICK ONE (two at most):

① **N10 · N15 · N39 - TRIAGE.** The three items deferred from the #380 scope.
Deliverable shape = docs/n40-triage-connecting.md: read the code, name the
mechanism, write the verdict or the on-device protocol. Build only if the
mechanism is named AND the fix is small AND no dial is needed - otherwise stop
at the triage doc and hand off.
  - N10 App-invite Cancel in chat does nothing (should cancel, keep the bubble,
    say "Canceled" on BOTH ends). C# here + maybe BE.
  - N15 Group typing indicator shows nothing (bot + private). Attribution is a
    known BE ask (C21); whether the GENERIC pill can show may be ours.
  - N39 Request/cancel story: a payment request has no cancel; an outgoing
    contact-request delete should prompt revoke + explain (`ixian:undorequest`
    EXISTS - likely buildable without BE).

② **The 4 known smoke pre-existers** (#136 · #149③ · M5 · B3) - carried since
#290-294, real and unrelated to any recent batch. One cheap session to fix or
formally retire them.

NOTHING ELSE. Do not touch N57 (Core-side, my protocol run pending), the
deferred pile, or anything in the archived 17g handoff §6.

ECONOMY RULES (hard): smoke as bookends only - baseline once (expect 1971/4) and
final once (state the new number) - plus ONE batched mutation-proof run for any
new pins. ONE Opus review round at the end, and only if C#/money/data paths
changed; no r2/r3 unless it finds a MAJOR. No agent fan-outs. Standing set
otherwise unchanged: cloud twin · verify against code (#215) · **bundle BEFORE
shells, and read the bundle build's output - it was silently dead for months
(#383)** · locale pipeline + i18n-lint + pseudo + i18n-overflow-audit only IF
strings changed · DECISIONS rows at decision time · security gate row · tarball
delivery + updated handoff + F5 checklist (short - only the legs this session
touched). I commit.
