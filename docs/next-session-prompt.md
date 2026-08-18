Read docs/handoff-2026-08-18.md FIRST and verify the git state it describes
(the N4 #378-#379 commit should be at HEAD, parent 646ef4e9 - if it is not,
stop and say so). Then run the §C FIX-FIRST BLOCK from
docs/master-worklist-2026-08-17.md, in this order: ① N13 (🔴 TOP - the
data-loss class; read its worklist row + any triage doc it names, verify the
mechanism against code BEFORE building, #215). ② N40 ("Connecting…" stops
showing on a LIVE document after long offline use - D-21 candidate; prime
suspect = the update-available branch starving the connectivity block, second
= the delay-counter; this may end as a repro protocol for me rather than a
build - decide and say which). ③ N10. ④ N15. ⑤ N39. N61 does NOT go here -
it rides the R4 restore round. Do NOT touch N57 (Core-side; my protocol run
is pending), do NOT re-attempt anything in handoff §6, do NOT build past the
block into the rounds (R3 → R4 → R7 → R6 → R8 → R5 → R9 come after, per §F).
House rules in full: cloud twin, verify against code before building (#215),
bundle before shells, smoke green with mutation-proven pins (state the new
number vs 1947/4), extract/build-locales/iife/verify + i18n-lint + pseudo +
i18n-overflow-audit after any string change, the #46 loop on Opus for
anything substantial, DECISIONS rows at decision time, security gate while
building (the #379 gate section is the latest template), tarball delivery +
updated handoff + F5 checklist at the end. I commit.
