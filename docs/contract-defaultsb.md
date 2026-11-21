# Agent contract — defaultsb (Defaults batch)

Written by the lead BEFORE any agent starts (`docs/orchestration.md` § 4). Every agent gets this file plus its own row.
An agent that needs a file outside its row stops and asks the lead. Mechanisms: `docs/defaultsb-mechanisms.md` (#294).

## 1 · Base
- Tree: `work/defaultsb` @ `14ae57f2` "Merge pull request #16 from Rexoflex/work/photo1a" · baseline: `BASELINE OK 6660 /
  the 2 KNOWN (#136 · B3)` (to be observed in this environment, `TZ=America/Los_Angeles`) · CSH **766** (observed) ·
  tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160) ·
  .NET SDK 10.0.115 · Ixian-Core sibling @ `097341ac` (the CI pin).
- Must hold for everyone: the PARAMOUNT isolation invariant · ★ C# touches no risky parts (no key, password or seed across
  the bridge; no new verb, no new argument, no new push; the two defaults are written in C# with FIXED values, never a
  WebView value) · #1478 (each change its own switch, old path = the fallback) · L157 (fail closed; no unlock on a timer)
  · the security handover gate (no new storage key in the WebView; the three new `flag*` preferences are C#-only) ·
  no edit in `src/**` or `Spixi/Resources/Raw/html` · no commit, no push, no full smoke · nothing in Ixian-Core.
- **L153:** nothing that EXECUTES runs while a full smoke runs: before each `dotnet` / `node` run, check
  `pgrep -f smoke-test.mjs`; if it prints a pid, wait (`sleep 60`) and check again.

## 2 · Items and ownership

Item 4 (`n-20261117-android-applock-screen-cascade`) is **STOPPED by the lead** (mechanisms § 5: the fix needs
`src/shells/lock.html`, out of this batch). No agent builds it. Three switches, not four.

| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes | Scratch folder |
|---|---|---|---|---|---|---|
| 1 App lock On at create / restore · 2 the lock delay of 1 minute · 3 Confirm payments On at create / restore | **B1** builder | **Claude Fable 5.2** (#1640: lock + payment code) | NEW `Spixi/Utils/DefaultsRules.cs` · `Spixi/Utils/SpixiFlags.cs` (ONE new block, § 3) · `Spixi/Pages/Launch/LaunchPage.xaml.cs` (two inserted statements, § 3) · `Spixi/App.xaml.cs` (ONLY `isLockEnabled()`'s body and the `withinGrace` statement + the `LOCK_GRACE_SECONDS` declaration, § 3) · NEW `scripts/csh/DefaultsTests.cs` · `scripts/csh/csh.csproj` (one `<Compile>` line) · NEW `scripts/pins-defaultsb/a-defaults.mjs` · the re-bases of hashed pins its edits break (name each key) · ONE registration line in `scripts/smoke-test.mjs` (after the photo1a line) | `SPayments.cs`, `SConfirm.cs`, `LockPage.xaml.cs`, `SettingsPage.xaml.cs`, `SDesktopIdle.cs`, `MainActivity.cs`, the mechanisms doc | the CSH tests + the pin, each key with ONE deliberate break (one-token mutation in a copy, #802); the list of re-based pins with the reason | `/home/claude/agents/b1/` |
| — | doc-check | Haiku | none (read-only) | the mechanisms doc + the tree | a list of `file:line` claims that do not match | `/home/claude/agents/h1/` |

`SPayments.cs` and `SConfirm.cs` are NOT edited (Fix batch 2 holds them whole by SHA-256): the payment default is written
from `LaunchPage` with the existing public constant `SPayments.PAYMENT_AUTH_PREF` and gated by the existing
`SPayments.paymentAuthSupported()`. `SettingsPage.xaml.cs` is not edited: its row reads the stored value (`:348–352`).

## 3 · Interfaces (the only shapes the build may add)

**Switches (`SpixiFlags.cs`, ONE block after the photo1a block; the photo1a pattern):**

| Property (start value `false` = the old path before `init`) | Key (int pref; absent = 1) | ON | OFF (= today, byte for byte in behaviour) |
|---|---|---|---|
| `DefaultAppLockOn` | `flagDefaultAppLockOn` | create and restore write `lockenabled = true` | `lockenabled` is removed (absent = Off) |
| `DefaultPayConfirmOn` | `flagDefaultPayConfirmOn` | create and restore write `paymentauth = true` where `paymentAuthSupported()` | nothing written |
| `LockDelayOneMinute` | `flagLockDelayOneMinute` | the grace bound is 60 s | 5 s |

`init()`: three int reads inside the existing `try` (absent = 1), three `S16PassRules.effectiveFlag(dev, x)` after the
catch, then ONE `Logging.info(DefaultsRules.flagsLine(DefaultAppLockOn, DefaultPayConfirmOn, LockDelayOneMinute));` as the
LAST statement of `init`. No Developer-screen control. The keys go with the wipe (`Preferences.Clear`).

**`Spixi/Utils/DefaultsRules.cs`** (`namespace SPIXI`, `public static class DefaultsRules`; usings: `System`,
`IXICore.Meta` (Logging), `Microsoft.Maui.Storage` only — it compiles in csh against `Stubs.cs`):
- `public const string LockKey = "lockenabled";` · `public const double GraceSecondsOld = 5;` · `public const double GraceSecondsNew = 60;`
- `public static bool lockEnabledStored()` — EXACTLY the old body of `App.isLockEnabled()` (`ContainsKey(LockKey)` then
  `(bool)Get(LockKey, false)`; absent = false). `App.isLockEnabled()` becomes `return DefaultsRules.lockEnabledStored();`.
- `public static double graceSeconds(bool oneMinute)` → `oneMinute ? 60 : 5`.
- `public static bool withinGrace(double secondsAway, bool oneMinute)` → `secondsAway >= 0 && secondsAway <= graceSeconds(oneMinute)`
  (the old expression with the bound as the only variable). In `OnResume` the statement becomes
  `bool withinGrace = DefaultsRules.withinGrace(sinceBackground.TotalSeconds, SpixiFlags.LockDelayOneMinute);`; the
  `LOCK_GRACE_SECONDS` declaration goes (its docblock stays, one line added: the bound lives in DefaultsRules). Nothing
  else in `OnResume` changes.
- `public static void writeNewAccount(bool appLockOn, bool payConfirmOn, bool paySupported, string payKey)` — writes
  `Preferences.Default.Set(LockKey, true)` when `appLockOn`; `Set(payKey, true)` when `payConfirmOn && paySupported`;
  writes NOTHING else and removes nothing; every write in its own `try` (a throw is logged with the exception TYPE only and
  the other write still runs); then ONE `Logging.info` of the fixed line `[DEFAULTS] new account: applock=<0|1> pay=<0|1>`
  (the values WRITTEN, 0 = not written). No other input, no WebView value, no password.
- `public static string flagsLine(bool appLock, bool pay, bool delay)` → `[FLAGS] defaultsb applock=<0|1> paydefault=<0|1> lockdelay=<60|5>` (fixed words).

**The two call sites (`LaunchPage.xaml.cs`), each ONE inserted statement on its own line, nothing moved:**
- create: directly AFTER `Preferences.Default.Remove("lockenabled");` (`:594`) —
  `DefaultsRules.writeNewAccount(SpixiFlags.DefaultAppLockOn, SpixiFlags.DefaultPayConfirmOn, SPayments.paymentAuthSupported(), SPayments.PAYMENT_AUTH_PREF);   // ★ defaultsb (#1750)`
- restore: directly AFTER `Preferences.Default.Remove("lockenabled");` in `applyRestorePrefs` (`:768`) — the same statement.

## 4 · What the builder returns
- The list of files it CHANGED (the lead copies back only these).
- Per CSH test and pin key: the command, the green line, the deliberate break and the red line with the failing key.
- The pins of other batches it re-based: the file, the key, the old and new hash, and why (a look at the diff, #1634).
- What it could not prove (⚠ C# UNCOMPILED: `App.xaml.cs`, `LaunchPage.xaml.cs` — the MAUI targets do not build in the cloud).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Tests owed (behaviour first, #1735)
CSH (`scripts/csh/DefaultsTests.cs`, over the REAL `DefaultsRules` + the REAL `SpixiFlags.init` with the stub preferences):
absent `lockenabled` → `lockEnabledStored()` false (the existing account) · stored true / false read back · after
`writeNewAccount(true, true, true, "paymentauth")` both keys are True · switch off → the key stays absent · `paySupported`
false (Windows) → no `paymentauth` · `writeNewAccount` touches no other key (the dictionary before / after) · a create after
a wipe (`Clear`) writes again · `withinGrace` at −1, 0, 5, 5.001, 59.9, 60, 60.001 for both bounds · `init` with no keys →
the three switches ON and the line `… applock=1 paydefault=1 lockdelay=60`; `devMode` + a stored 0 → that switch OFF; a
stored 0 without `devMode` → ON.
Source pin (`scripts/pins-defaultsb/a-defaults.mjs`, its LIMITS in its first lines, #1735): the two call sites (one
statement each, the exact text, directly after the `Remove("lockenabled")` line, in the create body and in
`applyRestorePrefs`; no other caller of `writeNewAccount` in `Spixi/`); `isLockEnabled` = the one delegating statement;
the `withinGrace` statement; `OnResume`'s body otherwise equal to the base (SHA-256 with that one statement taken out);
`SPayments.cs`, `SConfirm.cs`, `SDesktopIdle.cs`, `LockPage.xaml.cs`, `SettingsPage.xaml.cs` byte-identical to the base;
`DefaultsRules.cs` holds no `ixian:`, `sendUiCommand`, `SecureStorage`, `WalletPassStore`, `walletpass`, timer, `Task`,
`Thread`; the three keys appear only in `SpixiFlags.cs`.

## 6 · Integration (the lead)
Copy back → the two `--check` gates → the new + the affected pins → CSH → the #46 loop (security-only pass on FRESH Fable
5.2 readers, one at a time) → the full smoke once after the last fix (#1503) → the export → the commits → merge the newest
base if it moved → ONE push → read back (#1546).

## 7 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
