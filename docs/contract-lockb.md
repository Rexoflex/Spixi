# Agent contract — lockb (the lock batch)

Written by the lead BEFORE any agent starts (`docs/orchestration.md` § 4). Every agent gets this file, its own row and
`docs/lockb-mechanisms.md`. An agent that needs a file outside its row stops and asks the lead.

## 1 · Base
- Tree: `work/lockb` @ "Merge pull request #24 from Rexoflex/work/histcs" (`462ba3e4`) · baseline: see the status doc (expected
  `BASELINE OK 7000 / the 2 KNOWN (#136 · B3)`) · CSH `pass=866 fail=0` (observed 2026-11-23 in the cloud twin) · tools: jsdom
  29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160) · .NET SDK 10.0.115 ·
  Ixian-Core `097341a` beside the tree.
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge — NO new verb, NO new
  push name, NO new carrier key or value (mechanisms § 3: the existing push `setAuthPending` with two of its existing "pending"
  values) · #1312 / #1478: each change has its OWN switch, the old path = the fallback, all three OFF = the base behaviour · the
  security handover gate (a new log line, a new state of the lock page) · edit `src/`, never `Spixi/Resources/Raw/html` · no
  commit, no push, no full smoke, nothing in Ixian-Core · **the lock is a security control: when a rule is unclear, the safe
  side is "locked"**; nothing in this batch may make a lock come down where the base keeps it up.
- **The riskiest file (#1606): `Spixi/App.xaml.cs`** — it holds the lock delay (`OnResume`: the stamp, `withinGrace`) and the lock
  decision (`dismissPauseLock` vs the lock staying up, `presentAppLock`). Its builder is Claude Fable 5.2 (#1825 (3)); its
  security reader is a fresh Fable 5.2 instance each round.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes (pins + one deliberate break each) | Scratch folder |
|---|---|---|---|---|---|---|
| 1 + 2 (C#) | builder-a | Claude Opus | `Spixi/Pages/Launch/LockPage.xaml.cs` · `Spixi/Utils/LockShellRules.cs` (new) · `scripts/csh/LockShellTests.cs` (new) | `Spixi/Utils/SpixiFlags.cs` (the `LockbFlags` block, written by the lead), the mechanisms doc | csh tests of § 3 rules R1–R4 + the switch read; each with a break | `/home/claude/scratch/a/` |
| 1 (shell) | builder-b | Claude Sonnet | `src/shells/lock.html` · `scripts/pins-lockb/a-shell.mjs` (new, a smoke module) · `scripts/pins-lockb/a-shell-render.mjs` (new, Chromium by hand) | the mechanisms doc § 3 | the pin "prompt pending → form hidden" + the states of § 3 S1–S7 on the BUILT shell, with breaks; the render: both states × both themes, PNGs | `/home/claude/scratch/b/` |
| 3 (+ the one item-1 call site in App) | builder-c | **Claude Fable 5.2** (#1825 (3)) | `Spixi/App.xaml.cs` · `Spixi/Utils/LockClockRules.cs` (new) · `scripts/csh/LockClockTests.cs` (new) | `LockbFlags`, `DefaultsRules.cs`, `LockPage.xaml.cs` (the method names of § 3), the mechanisms doc § 5 | csh tests of the clock rule (forward, back, a reboot, no twin, no clock, switch off = base) with breaks | `/home/claude/scratch/c/` |
| pins + re-bases | builder-d (after a, b, c are merged) | Claude Sonnet | `scripts/pins-lockb/b-csharp.mjs` (new) · the lockb line in `scripts/smoke-test.mjs` · the re-bases of other batches' pins / csh tests that the merged tree turns red (each after a look at the diff, #1634) | everything | the source pin over the C# sites (its limits are its first lines), breaks | `/home/claude/scratch/d/` |
| — | lead | Claude Opus (lead) | `Spixi/Utils/SpixiFlags.cs` (the `LockbFlags` block, ONE block, written before the agents start) · `scripts/csh/csh.csproj` (the two Compile lines) · every doc · the built html (the FULL pipeline) | | | |

Each builder works in a full copy of the tree at `<scratch>/spixi` (with `<scratch>/Ixian-Core` → the pinned Core and
`node_modules` linked). A builder may add the csh.csproj Compile line of ITS rule file in its OWN copy to run its tests; it does
not return csh.csproj (the lead owns it).

## 3 · Interfaces between items (the only way two items meet)

### The switches (the lead; `SpixiFlags.cs`, class `LockbFlags`)
| Name | Key (int pref, absent = 1) | OFF = |
|---|---|---|
| `LockbFlags.HoldWhileDeferred` | `flagLockHoldWhileDeferred` | no hold push; the animated pop (item 1) |
| `LockbFlags.NoAlertNoCredential` | `flagLockNoAlertNoCredential` | the alert after every not-authenticated prompt (item 2) |
| `LockbFlags.SecondClock` | `flagLockSecondClock` | the wall clock alone (item 3) |
Lazy read once per process (`ensureRead`), a stored 0 acts only in dev mode, `[FLAGS] lockb hold=<0|1> noalert=<0|1> clock=<0|1>`
logged once at the first read. `LockbFlags.read()` is `internal` for the csh tests.

### The push values (builder-a sends, builder-b receives) — the existing push `setAuthPending`
| C# sends | When (only with `HoldWhileDeferred` on AND this lock was built deferred, i.e. `deferAuthentication()` ran) | The shell does |
|---|---|---|
| `"True"` | in `onLoad`, while `authDeferred` is set and the prompt window has not opened | S2: hold the form; clear the belt timer (no belt) |
| `"1"` | in `promptWindowOpens()`; in `onLoad` when the deferral is over or the window opened; at every `PROMPT` of `maybeAuthenticate` | S3: hold the form; clear the belt timer and arm a new one of 3000 ms from now |
| `"False"` | as today (`revealPasswordForm`) | reveal |
The shell, its other states: S1 carrier `"1"`, no push → as the base (hold + the 3 s belt from boot) · S4 `"False"` at any time
→ reveal · S5 after ANY reveal, `"True"` / `"1"` change nothing (the form is never hidden again) · S6 carrier `"0"` (WinUI) → the
form at once; `"True"` / `"1"` change nothing · S7 `'true'` (lower case) and the boolean `true` stay ignored as in the base ·
`"True"` / `"1"` before `boot()` ran (no screen yet) must not throw and must not latch anything that hides a later reveal.

### The LockPage method App calls (builder-a provides, builder-c calls)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| `LockPage.promptWindowOpens()` | `public void`, no arguments, never throws (its own try / catch). With the switch on and this lock built deferred: marks the window open and sends `setAuthPending("1")` (queued by `sendMessage` when the page is not loaded). Otherwise a no-op that logs nothing. It never unlocks, never pops, never changes `authDeferred`. | builder-a | builder-c: `App.OnResume`, the lock-stays-up branch, `#if ANDROID`, the statement directly BEFORE `pendingForegroundAuth = held;` |

### The pure rules (builder-a; `Spixi/Utils/LockShellRules.cs`; no MAUI type, no Plugin type: the harness runs them)
| Rule | Shape |
|---|---|
| R1 `holdPushAtLoad(bool on, bool builtDeferred, bool authDeferred, bool windowOpened, bool authAttempted)` → `string?` | `null` unless `on && builtDeferred && !authAttempted`; then `"True"` when `authDeferred && !windowOpened`, else `"1"` |
| R2 `holdPushAtPrompt(bool on, bool builtDeferred)` → `string?` | `"1"` when both, else `null` |
| R3 `popAnimated(bool on, bool builtDeferred)` → `bool` | `false` only when both (the pause lock pops with no animation) |
| R4 `alertAfterPrompt(bool on, string? status)` → `bool` | `false` only when `on` and `status` is exactly `"NotAvailable"` or `"Denied"` (the enum name, `result.Status.ToString()`); `true` otherwise (null, any other name) |
`LockPage.SetResultAsync`: not authenticated → `revealPasswordForm()` as today, then the alert only when R4 says so.
`popOwnModal`: `PopModalAsync()` as today when R3 is true, `PopModalAsync(false)` when it is false.

### The clock rule (builder-c; `Spixi/Utils/LockClockRules.cs`)
| Rule | Shape |
|---|---|
| `nowMs()` → `long?` | Android: `Android.OS.SystemClock.ElapsedRealtime()` (`#if ANDROID`); every other platform and the harness: `null` |
| `withinGrace(double wallSecondsAway, long? nowMono, long? stampMono, bool oneMinute)` → `bool` | `DefaultsRules.withinGrace(wallSecondsAway, oneMinute)` AND: `nowMono == null` → the wall rule alone; `nowMono != null && stampMono == null` → `false`; a reading below 0 (either value; `FailedRead = -1` when the Android read throws) → `false`; else `DefaultsRules.withinGrace((nowMono − stampMono) / 1000.0, oneMinute)` (a negative difference = outside). Added by builder-c (stricter, the safe side only) |
App: with `LockbFlags.SecondClock` OFF the `withinGrace` statement is the base expression; with it ON the rule above, fed by
the twin stamps (`backgroundedDate` ↔ a second-clock twin written in the same statement block; `unlockedDate` ↔ its twin; the
#500 restore and the `stampAfterUnlock` clear move the twin with the wall stamp). The `resume/pauseLock-held` diag line gets
` mono=<n>s` only when the switch is on and `nowMono != null`.

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these).
- Per pin / test: the command, the green output line, the break it made (a one-token mutation in a full copy, #802), the red
  line with the failing key.
- What it could not prove (⚠ C# UNCOMPILED, unrun, not rendered).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only → the FULL pipeline (bundle BEFORE shells) → the `--check` gates → `cs-syntax-check`.
2. builder-d: the lockb smoke line; grep the smoke for the tokens of every edited line (the INLINE pins, L84); the re-bases.
3. The full smoke (one at a time, nothing that executes beside it, L153) + CSH → the #46 loop until CLEAN (the security-only pass
   and `App.xaml.cs`: a fresh Fable 5.2 reader; the shell / pins: a fresh Opus reader; one Fable instance at a time) → the
   export docs → commits, ONE push of `work/lockb`, read each commit back, the compare link (#1546).

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
| 1 + 2 C# | 1 | Opus | green (CSH +14) | merged |
| 1 shell | 1 | Sonnet | green (a-shell 9 / 9, render 18 rows) | merged |
| 3 | 1 | Fable 5.2 | green (CSH +15) | merged |
| pins + re-bases | 1 | Sonnet | green (b-csharp 9 keys, 4 inline rows, 3 modules re-based) | merged |
| review r1 fix (C#) | 1 | Opus | green (CSH 898; `releaseHold`, the backstop, `holdReleased`) | merged |
| review r1 fix (pins) | 1 | Sonnet | green (b10, 57 breaks) | merged |
| review r2 fix (C#) | 1 | Opus | green (R5 + `authDeferred`, not-presented) | merged |
| review r2 fix (pins) | 1 | Sonnet | green (66 breaks, the #454 slice) | merged |
