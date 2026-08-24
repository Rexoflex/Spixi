NEXT SESSION — entry prompt.
READ docs/handoff-2026-08-26-morning.md FIRST (state through the walk day:
#553–#563 landed, #564–#575 = the walk-day rounds; §WALK-DAY at the end is the
live queue). Then read the walk results Damir posts from the "Menu Batch F5"
artifact (offline twin: docs/f5-checklist-2026-08-25-f5-batch-e.md).
THE JOB, in this order:
① NEW F5 FINDINGS from Damir's continuing walk — triage with mechanisms named
(#294: no log line / repro / source read, no fix).
② #568 — the desktop restore picker (root-caused, DECISIONS #568): WinUI
   FileOpenPicker throws COMException 0x80004005 inside MAUI PlatformPickAsync.
   Build the Windows SFilePicker fallback: catch COMException → classic Win32
   GetOpenFileNameW (owner = the MAUI window hwnd; path is OS-chosen, gate-
   clean). Damir's answer so far: NO Visual Studio — the exe was launched
   from PowerShell. ASK: was that PowerShell elevated ("Administrator:" in
   the title)? Elevated → classic E_FAIL confirmed; normal shell → the
   broker/OS-fault branch. The fallback is right either way.
③ THE WALK-NOTE FIXES (#572, all small FE/C#): (a) hidden request must not
   feed the unread badge (home.html skip) · (b) merge the hub's two QR entries
   into ONE openAddressSheet row (F23 dial) · (c) extend the pressed-row
   highlight to the MOBILE anchored menu (`data-m-anchor` — the E-3 dial is
   now CALLED by evidence, do the #506② stacking check first) · (d) declined-
   locally call bubble says "Missed call" — needs a declined variant at the
   C# addCall writer (C4 class). PLUS #573 (Android, real crash): headless
   incoming call = silent ring — SSpixiPermissions.cs:20 + SPlatformUtils.cs:60
   dereference a NULL MainActivity.Instance when the process wakes in the
   background; take Platform.AppContext with an Activity fallback.
   Then #569 — tip sheet: truncate the address (#211 canon, truncateAddressMiddle
   at the tip-sheet header) — likely also clears the sheet's horizontal
   overflow. #570 — liked+tipped SHORT bubble: heart + "Tipped" chip collide
   with the bubble/meta on both platforms — min-width floor or stack-below
   when the bubble is narrower than the pill row. Both logged with screenshots
   in the session of 2026-08-25.
③b #574 ① — the PHANTOM CALL OVERLAY: tapping a missed-call notification
   after a cold boot presented a live call overlay for a call already
   abandoned (answer = one-sided 10 s call). Real state bug — verify the
   stale app-request replay mechanism first (#294; Damir's B8 log is the
   evidence). ③c #575 — the address-sheet polish spec (smaller QR ·
   near-full sheet · dismiss button · Share = icon beside Copy · explainer
   text alignment) + the ONE Account address row (subtitle copy, opens
   openAddressSheet; both old entries retire).
④ #565 ② — contacts appear only on the 3rd restart after restore: STILL OPEN;
   the owed capture must cover HomePage boot THROUGH loadChats on a restart
   where the list is empty. Also the #565 residual: split "not an account
   backup" from "account backup, failed mid-restore".
⑤ The QUEUED rows if the walk stays clean: recipient-side honest accept
   (#562 ④, the #109 grammar, verify the carrier first) · the F5-2 REAL fix =
   BE §1e-6 core one-liner (when unfrozen; then restore the #539 acknowledged
   leave grammar and retire/logSafe-wrap the F5-2 hook log per its gate row).
   Privacy toggles are v1.1 — OUT of scope.
⑥ The E-3 dial if Damir calls it (chats-row lift under the deeper scrim —
   the #506② stacking check comes FIRST, on device evidence).
LANGUAGE RULE: ASD-STE100 Simplified Technical English — chat replies and code
comments.
SETUP
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
cd Spixi && npm install --no-save jsdom tree-sitter tree-sitter-c-sharp
⚠ The walk-day rounds (#564–#571) must be IN the clone — check DECISIONS.md
ends at #575. Missing → Damir has not pushed (docs/commit-2026-08-25.txt has
the staging list; the walk-day deltas ride the same commit) → STOP and say so.
Verify before you touch anything. If any number differs, say so and STOP.
bundle 292 · shells 18 · smoke BASELINE OK 3049 / the 3 KNOWN (#136 · M5 · B3)
· cs-syntax 144+1 · locales CLEAN 771 · Ixian-Core 097341a.
THE WORK
Verify-first everywhere (#294/#215). DECISIONS rows (#576+) at decision time.
Handover-gate rows AS BUILT for every new verb/key/log line. The #46 loop is
OPUS-run, builder never reviews own work, verdict to disk with the batch in
the filename. Mutate before believing — and remember #559's lessons: a pin
that moves between files keeps reading the old file; an unregistered custom
property never computes to px (measure through a probe element); fixing a
predicate means re-walking EVERY caller's shape.
DO-NOTs
1. No Ixian-Core changes (097341a frozen); core needs = BE row
   (security-review-for-be-engineer.md §1e is the current list, now 6 rows).
2. No re-interviewing settled dials (#556→#560 supersession included;
   #566→#567 mitigate is SETTLED).
3. No half-landed batches. 4. No new NuGet (#495). 5. No invented data.
6. Bundle BEFORE shells, always. 7. v1.1 items stay OUT (privacy toggles are
   there now, by Damir's call). 8. Do NOT rebuild the address sheet — reuse
   openAddressSheet. 9. Windows runs via TWO commands (build, then the exe) —
   -t:Run hits MSB3073/9009; wipe obj/bin after a C# change (#387).
10. The F5-2 hook's verbatim exception log has a retirement condition (gate
   row) — retire/logSafe-wrap it WITH the F5-2 real fix, not before.
DELIVERY
Everything UNCOMMITTED via a _deliveries/ tarball + the bridge when the
desktop is online; tar --overwrite; VERIFY THE EXTRACT LANDED (hash the
extracted files against the cloud tree). Write: the F5 checklist for the new
batch (fresh artifact, per-item notes) · the handoff · the fresh next-session
prompt · the prepared commit message. git --no-optional-locks always · never
git add -A (_scratch/ is untracked and must stay out) · git push does not work
from the bridge. If the bridge is offline, hold the tarball and say so.
