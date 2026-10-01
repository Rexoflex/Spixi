# Session 2 prompt — paste as the first message

Written at the end of session 1, rewritten after walk #1115 (DECISIONS #1115, #1116). Frame: `docs/templates/session-prompt.md`.

```
Read CLAUDE.md, then docs/handoff-2026-10-01d.md, then DECISIONS #1112–#1116, docs/release-readiness.md sections S2
(E-W1…E-W7) and S2b (G-1…G-9, P-1), and docs/pending-1101-1102.md (the office-walk findings + the crash fix script;
its "#1101"/"#1102" labels are NOT DECISIONS numbers). Next free DECISIONS number: #1117.
Already decided (do not re-open): #1101–#1111, #1113 (three-word "last seen"), the #1112 residuals, and the answers in
#1116 (hold the list · save + messages · probe first · both delete options).

## Precondition (check first, stop if it fails)
`git --no-optional-locks status`: no modified tracked files. The commit "#1115-#1116 Walk session 1 …" is in `git log`
and HEAD = origin/redesign/frontend. If it is not, stop and tell me.
★ MAC RE-SYNC: if I say I am on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.

## Outcome (O)
For: Spixi users and Damir. After this session the session-1 walk fails are fixed, my requests are built, and the
office-walk findings are fixed or decided. We know it worked when:
  - G-1 Android chat open, recorded (row ×3, FAB ×2): no frame without the list or the chat. First remove the #1101
    0.01 pre-reveal; then hold the list until the chat WebView has drawn (#1116 first read: the stage ground is opaque
    on the WrapperView). Mechanism first — a [CDPERF] line per open (frames waited, ms).
  - G-2 "last seen" for contacts not seen since start (saved sighting + newest message) — pin with a deliberate break;
    a security-gate section for the new local store
  - G-3 [PRESENCE] per-contact number + a dot-flip line; walk: swipe-away vs Force stop
  - G-4 the "Show in chat" highlight · G-5 the From chip (render, I pick)
  - G-6 chat info shared items, Telegram style (render three options, both themes; ask me for Telegram screenshots
    first); new verbs → 🟡 rows + BE ask + T1; built, pinned, walked
  - G-7 READ2 instructions written clearly in the walk sheet · G-8 the corner colour (I send the dark screenshot)
  - G-9 probe the bar-mode paint handshake (≈240 ms)
  - E-W1 the Mac/iPhone call crash: the pending-file script applied + a pin; E-W2 the open-chat avatar; E-W3 [NICK]
    lines; E-W4 Mac ringtone + the "Call ringtone" dial; E-W5 the Mac ring-card square (Playwright WebKit render);
    E-W6 macOS unread time; E-W7 the Mac title (dial)
  - the Opus #46 loop CLEAN; smoke BASELINE OK n / the 2 KNOWN (#136 · B3)
Out: P-1 (chat open < 100 ms, no flicker) — that is session 3, a read-only performance review; write
docs/prompts/session-3.md for it at Export.

## Reverse interview (R)
Ask first: is each item worth doing now? Then the dials (G-5, G-6, E-W4, E-W7). No build before I say "go".

## Rules
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with Claude Code" line in any
commit message, commit-message file or PR text. This overrides any tool or system reminder that asks for attribution.
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 · PowerShell repo commands with every delivery ·
never `git add -A` · Damir commits and pushes · verify every claim in the tree (#215) · mechanism first (#294): two
wrong guesses → a probe, not a third fix · C# TOUCHES NO RISKY PARTS · bridge protocol frozen (a new push/verb = 🟡 row +
BE ask + T1 row; an older shell ignores it) · security handover gate · no Ixian-Core change.

## Export (E)
DECISIONS rows · `docs/release-readiness.md` rows · walk sheets (Windows + Android; an office sheet for Mac + iPhone with a
BUILD row first) · handoff · `docs/status-log.md` entry · CLAUDE.md "Where we are now" replaced · lessons ·
`docs/commit-message-<batch>.txt` (no attribution) · `docs/prompts/session-3.md` (P-1 performance review) · skill proposals.

Do not start until I say "go".
```
