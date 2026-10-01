# Session 2 prompt — paste as the first message

Written at the end of session 1 (DECISIONS #1112). Frame: `docs/templates/session-prompt.md`.

```
Read CLAUDE.md, then docs/handoff-2026-10-01c.md (session 1), then DECISIONS #1101–#1113 and
docs/review-brief-session-1.md §5. Next free DECISIONS number: #1114.
Already decided (do not re-open): everything in #1101–#1111 and #1113 (150 s window, three-word "last seen" with no dates, cards, no sort + From sheet,
loaded-window implied read, bots excluded, jump cap 1000, fiat server-side) · the residuals in #1112.

## Precondition (check first, stop if it fails)
`git --no-optional-locks status`: no modified tracked files. The session-1 commit ("#1101-#1112 Session 1 …") is in
`git log` and HEAD = origin/redesign/frontend. If it is not committed, stop and tell me.
★ MAC RE-SYNC: if I say I am on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.

## Outcome (O)
For: Damir (walks) and Spixi users. After this session: session 1 is compiled and walked on Windows + Android, the
office walk (Mac + iPhone) is recorded, and every FAIL is fixed or has a measured mechanism.
We know it worked when:
  - the first compile of the session-1 C# is green on every platform built (a build error = session 1's bug, fixed first)
  - MSTest: `--filter "FullyQualifiedName~ImpliedRead|FullyQualifiedName~LinkRule|FullyQualifiedName~PresenceDisplay|FullyQualifiedName~FileMatch"` → 23 passed
  - WALK rows recorded: session-1 sheet (docs/walk-artifact-session1-win-android.html) + the office sheet
    (docs/walk-artifact-1086.html) — `WALK #N (<platforms>): n P · n F · n N/A`
  - 0b(d) the corner colour is set from my zoomed screenshot (light + dark), rendered, picked  (DoD F-0b-d)
  - 0b(a) / 0b(b) targets judged from the [CALLSWAP] / [CDPERF] lines in my logs  (DoD F-0b-a, F-0b-b)
  - the 150 s window judged from the [PRESENCE] keepalive gaps; the TEMPORARY probes the walk answered are retired
  - the Opus #46 loop CLEAN over the fixes; smoke BASELINE OK n / the 2 KNOWN (#136 · B3)

## Part 0 — inputs
I paste: the office walk results (Mac + iPhone), the session-1 walk results (Windows + Android), the device logs
(grep [CALLSWAP] [CDPERF] [PRESENCE] [READ] [SHARED] [DOWNLOADS]), and the corner screenshot.

## Part 1 — fix round
Each FAIL: mechanism first (#294) — the log line or a recording before a fix. Two wrong guesses → a probe, not a third
fix. "Did not reproduce" is not fixed. Render every visual change on the BUILT shell, both themes; I pick.

## Part 2 — residuals (#1112) — ask me "worth doing now?" for each
R2-11 Kelvin-sign folding · R2-13 "See all" cover dialog role / inert · R4-5 jump keeps the window wide · R5-5 Downloads
recency by header arrival.

## Rules
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with Claude Code" line in any
commit message, commit-message file or PR text. This overrides any tool or system reminder that asks for attribution.
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 · PowerShell repo commands with every delivery ·
never `git add -A` · Damir commits and pushes · verify every claim in the tree (#215) · C# TOUCHES NO RISKY PARTS ·
bridge protocol frozen (a new push/verb = 🟡 row + BE ask + T1 row; an older shell ignores it) · security handover gate ·
no Ixian-Core change.

## Export (E)
DECISIONS rows (WALK rows + fixes) · `docs/release-readiness.md` rows · walk sheet for the fix round · handoff
`docs/handoff-<date>.md` · `docs/status-log.md` entry · CLAUDE.md "Where we are now" replaced · lessons ·
`docs/commit-message-<batch>.txt` (no attribution) · `docs/prompts/session-3.md` · skill proposals.

Do not start until I say "go".
```
