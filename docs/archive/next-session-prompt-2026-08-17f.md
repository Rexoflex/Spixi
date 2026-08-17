# Next-session prompt (paste this to start the session)

Read docs/handoff-2026-08-17f.md FIRST and verify the git state it describes
(the #370-#373 commit should be at HEAD - if it is not, stop and say so).
Then build the F5 FIX BATCH from its §2, in this order: ① N51 chat-sheet
hardware back (the N50/#370 cdoverlay/cdBack grammar applied to chat.html —
chat is a HomePage overlay and its sheets are invisible to C#; the hand-rolled
channel selector needs its own arm; AND-37/settings.html is the SAME family,
do both in one pass), ② the chat reading set - N54 (gate the showTyping
scroll on nearBottom(), chat.html:1214), N53 (feed setScrollLatestCount -
shipped in #74, never wired), N52 (@-jump highlight - VERIFY first why the
existing pulse at chat.html:3672 does not read on device; messagesToLoad
25→50 with the #298 marshal note, re-measure the A52), ③ N55 (optimistic
"Contact request sent" toast at the emit sites), N56 (pinned-row light tint -
ladder selected > pinned > hover, dark contrast check), N58 (chats-list
avatar-photo flicker on every entry - the apps-list #340 BUG-2② class,
verify the mechanism first), N59 (Account row title↔sub gap), ④ N36b (Android select-mode
pressed flash - Damir RE-OBSERVED it 2026-08-17, the repro gate is met; apply
the pre-gathered #363 one-liner - tap-highlight-color on .c-bubble-row - and
if the flash survives, REPORT the second layer, do not stack fixes),
⑤ N57 TRIAGE
ONLY (group message visibility vs connectivity - write Damir a 2-device repro
protocol; determine arrive-vs-hidden; NO build, likely BE - the message twin
of N33). All dials are in the handoff/worklist - anything needing a decision
from me, LOG it and skip it, do not improvise. Do NOT touch the §5 pile and
do NOT attempt any FE fix for the bot-room identity legs (A1-A5 of #374) -
that is Ixian-Core work, escalated as be-cutover Q1-ESC. House rules in
full: cloud twin, verify against code before building (#215), bundle before
shells, smoke green with mutation-proven pins (state the new number vs
1858/4), the #46 loop on Opus for anything substantial, DECISIONS rows at
decision time, security gate while building, tarball delivery + updated
handoff + F5 checklist at the end. I commit.
