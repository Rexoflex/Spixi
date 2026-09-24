The OFFICE iPhone day — item 0 the fifth Opus reader over Session AE's round-4 fixes, then the first iOS compile in a month and `docs/walk-artifact-ios-office.html` (DECISIONS #938–#943; #915/#919/#932)

0 · Before anything else (#215)
Read `docs/handoff-2026-09-23d.md`, then DECISIONS #938–#943 and `docs/opus-review-verdict-session-ae.md`.
Check `device_bash`; use `git --no-optional-locks status` (never plain `git status` on the VM). Verify
Session AE has LANDED and been COMMITTED (the tarball was delivered in chat because the PC was off; if
`git status` shows AE's files uncommitted or absent, landing + `docs/f5-checklist-session-ae.md` §1 + the
AE walk + its commit is item 0a — no C# in it, so no compile). Run the four `--check` gates on the real
tree. The FULL suite runs in the container on a SNAPSHOT copy with the Ixian-Core sibling — BEFORE
(expect 4862 / the 2 KNOWN; Damir's local number +14 over his AD run) and AFTER anything you change;
predicted is not an acceptable last line. Reviews run on Opus — pin the model explicitly.

0b · THE FIFTH READER (#943; handoff §2) — before ANY build
Session AE's #46 loop ran four rounds and every round was NOT CLEAN; round 4's fixes are pinned and
mutation-killed but unread. ONE fresh Opus break-my-verdict reviewer over the r4 delta ONLY:
`src/shells/chat.html` (`setChatMode`: `mode.answeredFor` set BEFORE `chatSelect.refresh()`; `setInset`:
`composerFadeTrack(340)` only on an inset CHANGE), `src/components/attach-sheet.js` (the removed redundant
`unwatchTrayContent(existing)` on the closing-tray path), `scripts/smoke-test.mjs` (the tracking fixture's
`setRaf(7)`, the statement-level `composerFadeNow()` clause, `CHAT_KB_CEIL = 658`). Verdict written INTO
`docs/opus-review-verdict-session-ae.md` §Verdict (#660). CLEAN → say so there and move on. NOT CLEAN →
fix, pin, mutate through the real pin text, a sixth reader, AFTER run.

1 · The office (Damir on the Mac + the iPhone; handoff §3)
1. iO.1 the portal is DONE (#932) — mark P. Install the two development profiles.
2. Wipe `obj`/`bin` → Debug build for the iPhone. ★ FIRST COMPILE of `Spixi-PushService/` (#919),
   `Platforms/iOS/SPushPrefsShare.cs`, the iOS half of `SPushService.cs`, #912 ②, #490's iOS line. A build
   error is an AC/AD bug — paste it WHOLE; first suspects in `docs/ios-nse-spec.md` + DECISIONS #919/#921
   (the extension's `SupportedOSPlatformVersion`; the App Group id IDENTICAL in both Entitlements;
   `OneSignal_app_groups_key` in both Info.plist). No guessing at a compiler message.
3. `docs/walk-artifact-ios-office.html` — 31 rows. §1 is the day: iOS notifications on par with Android;
   ★ iO.7 THE MUTE TEST is the one question no document could answer (nothing, or a blank row? — the
   extension can only MUTATE, never cancel). The answer is the note.
4. §2 (iOS-43/44/55, BUILT #905, never walked on an iPhone) · §3 every surface · §4 landscape on iOS (the
   bar stays, the rail refuses) · AE.6b rides along (the fade through the keyboard slide, iOS only) · §5
   optional: APP-1 restore · route B (#920) LAST, only if the iPhone walk is done — the first Mac run is
   the `dlopen` test the July stamp never reached.
5. Sessions I → AE have never been on an iPhone: anything wrong on the device is a walk NOTE first (row,
   what you saw, screenshot), a fix second (#935). Fixes found on the day get their own DECISIONS row,
   a render where visual, a pin, a mutation, the AFTER run — same standard, no "office exception".

2 · Records at the end
DECISIONS rows (the fifth reader's verdict · the first iOS compile outcome · the iO.7 answer · anything
fixed on the day) · `docs/ios-nse-spec.md` §2 answered where the mute test settles it · the office sheet's
results pasted into its own §Verdict block · a new handoff + this prompt rewritten for the ENDGAME (#916 as
shaped by #933: L6 → freeze → sweep → strip → gate re-run → merge → TestFlight) · 09-23c and 09-23d →
`docs/archive/` when superseded.

3 · NOT this session
Batch 4's medium rows (CI6 · C22 · A8 · FC1 · C12 · NT1(b) · PV1) · L6 (its own security-gated
mini-session) · the memory kill · the translator pass · the strip · L8 / L2 (OUT) · CORE-9/-10/-11/-12/-13
(his) · #934 (a) · #936 · C14 · C20 · the #940 residuals unless the iPhone makes one a walk FAIL.

Rules #215 · #294 · #660 · #663 · #771 · #798 · #811 · #882 ③ · #895 · #906 · #926 · #929 · #935 ·
★ #943: the ceiling is measured LAST; a round that blesses a fix is the round whose fix the next reader
  reads; the loop ends on the round that finds nothing ·
★ #892/#893: a rejected dial is a boundary, not a veto — render before you pin, let Damir say no.
