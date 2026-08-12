Spixi — continue the redesign. Repo = the connected folder ~/Documents/GitHub/Spixi,
branch redesign/frontend. Read `docs/handoff-2026-08-13.md` FIRST (it is the state +
work order), then `docs/android-findings.md` + `docs/ios-sim-findings.md` (#336 blocks)
and `READ-ME-FIRST-WINDOWS-FINDINGS.md` (Damir's PC session — W2/W5/W6/W7/F1; do NOT
delete it until those are done). Everything from 2026-08-12 is on disk, UNCOMMITTED
(Damir commits in GitHub Desktop, #306). Smoke baseline = BASELINE OK 1040 / same-4.

RULES (unchanged): zero-C# unless evidence forces (#215) · ★ #221 chat isolation ·
measure-first on EVERY keyboard/viewport/inset lever, all platforms (#294 — it refuted
the AND-20 big lever this session) · bundle BEFORE shells · smoke stays 1040/same-4 ·
commits = Damir · git --no-optional-locks · the bridge mount FORBIDS unlink (write files
in place: `git show <commit>:path > path` or SendUserFile→device_commit_files; NEVER
`git checkout --` on the mount) · iOS device build = two steps + `-p:RuntimeIdentifier=
ios-arm64 -p:_DeviceName=<UDID>` (single -t:Run races mlaunch = MT1044).

★ FIRST TASK — the owed #46 adversarial audit over EVERYTHING built 2026-08-12
(nothing after the overnight #334/#335 loop has been reviewed). Full loop: 3 disjoint
read-only auditors → fix agents (disjoint scopes, explicit cross-file contracts) →
fresh break-my-verdict reviewer → loop until CLEAN; rebuild + smoke between passes.
Deltas to audit (all #336): W0 csproj RID guard · W1 theme decode (empty_detail stub
dispatcher + contact_details setTheme) · W3 chip size · W4 desktop bubble token ·
AND-16 v2 measured keyboard re-pin (★ near-bottom-judged-pre-shrink + the Android UA
gate can't fire on iOS) · #15 settings hub scroll-restore · #10 invalid-address titles
(8 locales + 2 C# keys) · ★ AND-29 (+v2) HARDWARE-BACK routing (home takeover + wallet
takeover state push + overlay.js sheet coverage + homeBack dismissTopOverlay-first —
audit hard: state desync? sheet-over-takeover ordering? a native overlay also open?
does a stale push swallow a legit back?) · iOS-65 media-viewer bottom-close · the
splash revert (values-v31). Land fixes, keep smoke green.

THEN the open work (priority per Damir; details in the handoff + findings docs):
- Android: AND-25 remove-contact FATAL crash (get logcat first) · AND-28 existing-
  contact avatars (C# avatar path existing-vs-new) · AND-26 Account↔Wallet flicker/slow
  (AND-19 Opacity-staging half) · AND-7 wallet full-bleed top (MainActivity top-inset →
  CSS push; unblocked) · AND-20 keyboard SMOOTHNESS (WindowInsetsAnimation / adjustNothing
  + CSS inset — measure frames first) · AND-24 native-dialog routing (design decision) ·
  AND-27 mic-denied no call screen (repro) · AND-30 member sheet already-contact actions.
- iOS: iOS-56b edge-swipe back in subscreens (generalize the #325 lever) · iOS-66
  Account snaps to bottom on language change.
- Windows (READ-ME-FIRST-WINDOWS-FINDINGS.md): W2 rail covered · W5 chat pattern STYLES
  (Damir-approved prototype, full spec + locked tuning in §W5 — substantial FE) · W6
  wallet Receive request-amount · W7 change-password hang · F1 AI-agent chat (design
  note / phase-3, not the fix batch).

Before building anything: analyse the plan against the code and see whether it can be
done better than described — this caught ship-blockers in every recent session
(#297/#334: ~1/3 of briefed plans were defective; the AND-20 lever was refuted by
measurement). Verify-first, then build.
