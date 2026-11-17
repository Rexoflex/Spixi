# P52 · ANDROID: THE SPARE CHAT PAGE IS KEPT OVER A SHORT SLEEP BY DEFAULT (`sparekeep` ON) · addendum to P40 (batch fixb1, item 7)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW–MEDIUM (P40's kept hidden WebView now runs for every Android user with the app lock off, not only in dev mode) | no | none: no verb, push, key; the default of an existing pref changes | built · ⚠ C# UNCOMPILED (the Android arm compiles in Damir's build) | 5 min |

**Look here first:** `SpixiFlags.init` (`Spixi/Utils/SpixiFlags.cs:159`, `:196`) and P40 (the keep itself, unchanged).

**DECISIONS:** #1560 · #1564 · #1565 / #1596 (3 minutes, 1000 ms) · #1611 (Damir after WALK #1610: "ON by default") ·
this batch: #1650.

## What changed and why
- **Why.** WALK #1610: the tap at once after a return went 308 → 129 ms with the switch ON (spare 5 of 5); row A-2
  passed with it ON (1 minute and 5 minutes, never a blank chat). Damir ruled "ON by default" (#1611).
- **The change.** `flagSpareKeepShortSleep` is read with absent = 1 and computed by `S16PassRules.effectiveFlag(dev,
  pk)` — the rule of the other three switches of batch 1a: ON unless dev mode is on AND the stored value is 0.
  `PerfB1Rules.effectiveOptIn` (the opt-in rule) is removed; it had no other caller. The start value before `init`
  stays `false` (the old path). `leaveDevMode` still turns it off in THIS process (the old path until the next start)
  and has TWO callers: leaving dev mode (the keys are removed, so the next start is ON again) and the account wipe
  (`SettingsPage.wipeEverything`) — so after a delete-account ANY user runs on the old path (the drop at sleep) until
  the next start, although the start line said `sparekeep=1` (#46 r1 S-S-1; fail to the old path, recorded).
- **Unchanged (P40).** Android only (`#if ANDROID`); a READY spare is kept only with the app lock OFF and no lock up,
  no chat staging; a kept spare is UNPROVEN until one `document.readyState` read on its own WebView answers `complete`
  inside 1000 ms; the limit is 3 minutes; any doubt drops it (fail closed). iPhone and Mac keep the drop; Windows
  never drops at sleep. The `[FLAGS] warmidle= sparerearm= sparekeep= noemptydetail=` line is unchanged in its words
  and now shows `sparekeep=1` on a fresh start — on every platform, while only Android acts on it (every use is under
  `#if ANDROID`).
- **What the reviewer turns off.** Dev mode on + the adb walk's `-Flags …,sparekeep=0,…` (P48), or the DevPage verb
  `ixian:devflash:sparekeep:0` (no on-screen control sends it yet) → the old drop at the next start. A user without dev
  mode cannot turn it off (the account wipe above gives the old path only until the next start).
- **The cost (from #1611).** App process +0.4 MB and one WebView more in the background for up to 3 minutes; the
  renderer memory is not read yet (owed at the next sitting; the plan expected about 15 MB, #802).

## Files
`Spixi/Utils/SpixiFlags.cs` · `Spixi/Utils/PerfB1Rules.cs` · csh `PerfB1FlagsTests`, `PerfB1ExtraTests`, `FixB1Tests`
(`spare_keep_matrix`, `spare_keep_fresh_start_line`) · pins `scripts/pins-fixb1/g-sparekeep.mjs`, the re-based
`scripts/pins-perfb1/f-flags.mjs`.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A kept spare shows a dead blank chat | P40's proof at the moment of use (unchanged) | P40 · walk A-3 |
| The keep runs with the app lock on | P40's sleep site (unchanged): lock on or up → the drop | P40 pins `c-spare-keep` |
| The switch cannot be turned off | Dev mode + a stored 0 → OFF at the next start | csh `spare_keep_matrix` (absent / 0 / 1 / 7 × dev on / off) |
