# Handover — the overnight session + the same-day F5 (2026-08-24)

**All five priority batches LANDED, loop-clean, and F5-WALKED by Damir the same day:
28/30 pass.** W (wallet follow-ups) · A (info/groups + the remove-contact data bug) ·
B (requests) · C (account lifecycle + splash) · D (missed call). DECISIONS #535–#552.
Batch E (menu) was NOT started — queued whole (#551). Everything is on
`redesign/frontend`; the commit message is prepared (see §Commit below).

## State of the tree

- The overnight tarball (`_deliveries/spixi-overnight-2026-08-24.tar.gz`, 130 files)
  and the findings tarball (`f5-findings-2026-08-24.tar.gz`) are BOTH extracted and
  hash-verified on Damir's machine. Cloud tree == Damir's tree.
- Pipeline at handover: bundle **291** · shells **18** · smoke **BASELINE OK 2996 /
  the 3 KNOWN (#136 · M5 · B3)** · cs-syntax **144 + 1** · locales CLEAN · overflow
  NO BREAKERS · Ixian-Core `097341a` (untouched).
- Android Debug build DEPLOYED and walked on device; Windows launched via the
  two-command pattern (`docs/f5-checklist-2026-08-25-windows.md`:48 — `-t:Run` hits
  MSB3073/9009 on this repo, build then run the exe).

## The F5 result (#552) — the NEXT session's work, in priority order

`docs/f5-findings-2026-08-24-overnight.md` is the full triage with file:line. Order:

1. **F5-3 restore race** (data-loss-adjacent): `App.EnsureNodeRunning` (App.xaml.cs:1368)
   restarts the node mid-account-transition when the restore file picker bounces
   OnResume — no wallet loaded → KeyNotFoundException → zombie → "Connecting…"
   forever. Guard it (and the OfflinePushMessages timer) on "no wallet loaded".
   Mechanism pinned by `fatalexception.txt`; the three overnight F-3 fixes held.
2. **F5-1 missed call**: the tray row still vanishes. The tagged path is VERIFIED
   correct (VoIPManager.cs:220 → SPushService.cs:392 tag → :274 spare) — the vanished
   row was UNTAGGED. Prime suspect: the offline-push fetch (SPushService.cs:739 posts
   EVERY push as kind "message"). Fix: route call pushes with kind "call" / re-tag by
   the call id. Second suspect: the OneSignal SDK's own display path.
3. **F5-2 bot-group removal crash** (Android, unlogged): needs Damir's
   `adb logcat -d` capture on repro before naming. The leave itself worked
   (`aftercrash.txt` shows the group gone + the server still streaming at it).
4. **F5-4 / F5-5 styling**: picker rows flat like the directory (drop the
   `.c-wallet-send__list` card chrome); address sheet QR padding to Account
   proportions + styled desktop overflow scrollbar + flatten the info-disc double
   icon (Damir's screenshot).
5. **F5-6 dial**: Max disabled pre-recipient is BY DESIGN (#523) — ask ONE line:
   keep, or add the "pick a recipient to use Max" hint.

Then **Batch E** per `docs/handoff-2026-08-25-menu-requests.md` §2 (all four calls
answered; W-c's rebuilt `openAddressSheet` makes E-(d) reuse, not build).

## Commit

The `git add` list for the new/untracked files and the prepared commit message are
in `docs/commit-2026-08-24-overnight.txt`. Never `git add -A` (`_deliveries/`,
`_scratch/` and logs must stay out).

## Open dials

A9 meta ink 0.7 (3.73:1) and the C5 night-splash mark size drew NO objection in the
F5 — treat as accepted unless Damir says otherwise. F5-6 (Max hint) is the one open
question. iOS D1 remains reasoning-only.

## BE rows

`docs/security-review-for-be-engineer.md` §1e (new, with file:line): the
commented-out unknown-sender fetch (writers absent from bot rosters), the 500-member
roster cap, post-leave streaming, no poison-message drop (the decrypt loop's
redelivery). Nothing in Ixian-Core was changed.

## Where things are

Loop verdicts: `docs/opus-review-verdict-batch-w.md` (3 rounds) · `-batch-a.md` (2) ·
`-batch-bcd.md` (2), auditor reports beside them. Gate rows:
`docs/security-handover-gate.md` Batch W/A/B/C/D sections. The interactive checklist
(now with per-item notes): the "Overnight F5" artifact; offline twin
`docs/f5-checklist-2026-08-24-overnight.md`. Next session:
`docs/next-session-prompt.md`.
