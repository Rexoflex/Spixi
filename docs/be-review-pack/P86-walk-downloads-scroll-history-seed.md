# P86 · THE ADB WALK: `downloads` SCROLLS THE ACCOUNT HUB FIRST; `history` CAN RUN ON A NAMED DEV-SEED CHAT (batch fixb3, items 3 + 4)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (developer tooling on Damir's PC; opt-in; nothing ships in the app) | none | none: no app file changes; no new adb command shape; `$script:LogRe` unchanged | built (scripts only) · ⚠ never executed in the cloud (no PowerShell there): a tree-sitter parse check only; the operator block is the first run | 5 min |

**Look here first:** `Invoke-DownloadsRep`, `Invoke-CalAccountScroll`, `Invoke-HistorySeedRep` / `-Restart` and the
`-HistorySeed` block in `scripts/device/adb-walk.ps1`; `HistorySeedDefs` in `adb-walk-parse.ps1`.

**DECISIONS:** #1739 (3), #1742 (2) (Damir, main-chat rows) · #1520–#1523, #1530, #1666, #1671, #1674, #1718 · this batch: #1812.

## What changed and why
- **`downloads` (#1739 (3)):** the Downloads row of the Account hub is below the first screen (#1674 ③). After the Account
  tab's gates: a focus check, ONE swipe `swipes.accountDownloads` (a fling that ends at the bottom of the hub), the settle, the
  check `screens.accountScrolled` (a screenshot for its probes, deleted in a `finally`, never kept), and ONLY on a pass the tap
  `taps.accountDownloads`. A failed check sends no tap; the app is restarted and the restart proven. The four keys gate the step;
  they stay absent in `a52s.json` until the operator block (absent = "no data", no command).
- **`-Calibrate`:** after the Account tab: the swipe (the map key, else the fixed default `input swipe 540 2000 540 400 150`,
  printed), cal-17s (the scrolled hub, kept while its key is absent, deleted when it fails), the tap and cal-17 only when both
  `screens.accountScrolled` passes and `taps.accountDownloads` is set. First calibrate → three keys; a second (the proof run) →
  `screens.downloads`: the tap point is read from a picture before any tap on the hub (#1671 ⑤). cal-17s is deleted at once
  when `screens.accountScrolled` is set (pass or fail, also after an exception: a `finally`, and the run's last sweep). A `swipes.accountDownloads` that is PRESENT but invalid still sends the fixed default, and the swipe note then adds the gap text of `Get-SwipeGap` (review round 3, n3); an absent key says only "the fixed calibrate default".
- **Load-time refusals (before any adb command):** a present but invalid `screens.accountScrolled`; with both hub keys set, a
  map whose `minMatch` is below its probe count or that has no probe within 60 px of the tap's y. Limit (stated): a fling
  that stops short by exactly one row is not seen; the calibrate note asks for one probe on a feature that does not repeat.
- **`-HistorySeed <k>` (#1742 (2)):** one dev-seed index 0..55 (55 = Seed 56, the photo chat with one older page). Usage errors
  before any adb command (with `-Flags`, with `-Calibrate`, without `history`, any other value). Per rep: the app brought to
  Chats, a PROVEN restart (or a halt), the `fa` intent with `Get-DevSeedAddress k` (derived, masked `<seed-index k>`), the chat
  check, swipes until ONE page request; zero = "no data" (the rep records `pages`; the parser gates EVERY row of the step on `pages ≥ 1`: a rep with
  0 / a missing `pages` is "no data" in the page rows AND in the scroll, long-task and swipes rows, because such a rep may have hit
  `historyMaxSwipes` and would skew a median (review round 3, m1); the page rows take the first `[P1] chat load` after the first
  `[P1] shell send loadmore`). Step name `history-seed-kNN`; the parser gives it the
  history rows with the first page; the step ends with the PNG sweep. Without the option `history` and every old step are byte-identical (pin `o1`).
- **A rule that moved:** #1666 ④ said "no screenshot on the Account screen". #1739 (3) asks for a screen check of the scrolled
  hub, so that one check photographs the hub for its probes and deletes the picture at once; the calibrate keeps cal-17s for
  the lead's look. The rule's aim — no Account data kept in files — holds for the walk.

## Recorded, not changed (review round 4)
- O4 m1: the long calibrate notes (the probe rule for `screens.accountScrolled`: one probe ON the Downloads row at the tap's y, one on
  a row edge, one on a feature that does not repeat, `minMatch` = all) are cut to 120 characters in `calibrate.json`
  (`Get-SafeNote`); the full rule is in the script header. Reason: the lead fills the keys from the pictures and applies the header
  rule; the operator never writes the map. Fix direction (a later scripts batch): `Say-Log` the long notes or split them.
- O4 n3: a run with `-HistorySeed` restarts the app in every rep, so the steps after `history` run in the process of the last restart:
  run `-HistorySeed` as its own run (`-Steps history -HistorySeed 55`), as the operator block does.
- The page rows: "older pages loaded" counts the `[P1] chat load` lines from t0 (at least one); "first swipe -> 1st page" takes the
  first `[P1] chat load` after the first `[P1] shell send loadmore`.

## Proof
pin `scripts/pins-fixb3/c-walk.mjs` (d1 swipe → check → tap, d2 the four keys, d3 the calibrate (incl. the finally), d4 the
PNG sweeps, d5 the load-time refusals, h1 usage, h2 the derived address + one proven restart, h3 one page + `pages`, h4–h4d
the parser rows (h4c: every row gated on `pages ≥ 1`), n1 the new function bodies by SHA-256, m1 every added line by its exact text + the usage block whole, o1 old
statements byte-identical, o2 `$script:LogRe`, o3 the allowlist; source / statement pins, their limits in the pin) · **LIMITS (n1, corrected in round 3):** a trailing comment on a statement line and the spaces inside a line ARE caught (only whole-line comments, blank lines and the indentation are not code) · **re-base after the map commit (n2):** the keys `d2 realFileGap` and `d5 realFileInert` read the REAL `scripts/device/a52s.json` and turn red BY DESIGN when the operator block commits the hub keys to it (the same tripwire as filewalk b6, #1674) · re-based `pins-perfb1toggle/b-walk`,
`pins-filewalk/b-walk-steps`, `pins-photo1a/c-walk` (after a look at the diff, #1596 / #1634) · `tree-sitter-powershell` parse:
0 errors in both scripts · NOT proven: a fake-adb dry run (no PowerShell in the cloud), Windows PowerShell 5.1, the phone.

## The operator block (2026-11-22; #1817, #1818)
- The four keys of `downloads` are in `scripts/device/a52s.json` (two calibrates). The first walk run stopped at once: the typed
  parameter `[string[]]$HistorySeed` was reused as the state variable; renamed to `$script:HistSeedIdx` (`bfc991b`, review round 5
  CLEAN). No adb command, allowlist entry, file write or log line changed.
- Runs `20261122-1342`, `-1346` (`downloads,history`): RESULT OK. Runs `20261122-1350`, `-1354` (`history -HistorySeed 55`): every
  rep ok with a proven restart, one older page each; the row "first swipe -> 1st page" gives no data (#1818: the shell's send line
  reaches logcat after the C# answer). Recorded, not changed.
