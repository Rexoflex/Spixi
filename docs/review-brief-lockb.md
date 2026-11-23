# Review brief — lockb, the lock batch (#1915–#1934)

Work order for the #46 adversarial loop (docs/process.md). Written BEFORE round 1. The verdict goes into § 5 when the loop
closes (#660). Readers by #1606: **a fresh read-only Claude Fable 5.2 instance for the security-only pass and for the riskiest
file `Spixi/App.xaml.cs`** (it holds the lock delay and the lock decision); fresh read-only Claude Opus instances for every other
reader; one Fable instance at a time; no fallback below the named model. A fresh break-my-verdict reader attacks the fixes of
each round.

## 1 · What the batch is
| Item | What landed | Where (files) | Switch | DECISIONS |
|---|---|---|---|---|
| 1 the Android lock flash (#1795, ruling #1825 (1) A) | the pause lock holds its password form while the deferred prompt waits: C# sends two of the four "pending" values the existing push `setAuthPending` has always ignored — `"True"` (hold, no belt) at `onLoad` while deferred, `"1"` (hold, the 3 s belt from now) when the prompt's window opens (`App.OnResume` → `LockPage.promptWindowOpens()`, and each `PROMPT`); the pause lock is popped with no animation | `src/shells/lock.html` (+ the built `Spixi/Resources/Raw/html/lock.html`), `Spixi/Pages/Launch/LockPage.xaml.cs`, `Spixi/Utils/LockShellRules.cs` (new, R1–R3), one call in `Spixi/App.xaml.cs` | `LockbFlags.HoldWhileDeferred` | #1916 |
| 2 D-1, no alert with no credential (#1794, #1825 (2) A) | `SetResultAsync`: the "Authentication Failed" alert is skipped when the status is `NotAvailable` or `Denied`; the form opens as before | `LockPage.xaml.cs`, `LockShellRules.cs` (R4) | `LockbFlags.NoAlertNoCredential` | #1917 |
| 3 R1-1, the wall clock (#1796, #1825 (3) A) | the no-auth window must ALSO be inside the bound on Android `SystemClock.ElapsedRealtime` (twin stamps of `backgroundedDate` / `unlockedDate`; an override that can only turn "inside" into "outside") | `Spixi/App.xaml.cs`, `Spixi/Utils/LockClockRules.cs` (new) | `LockbFlags.SecondClock` | #1918 |
| the switches | `LockbFlags` (lazy, once per process; absent = ON; a stored 0 acts only in dev mode; `[FLAGS] lockb hold= noalert= clock=`) | `Spixi/Utils/SpixiFlags.cs` (one block, appended) | — | #1915 |

Not built, and why: the first-notice Moment sheet of #1825 (4) (cut to the next page batch, #1838) · the Apple twin of the
second clock (a question, mechanisms § 5) · a twin for the own-intent stamp (inherited, outside the ruling; mechanisms § 5).

## 2 · How to run
- Tree: the container twin of `work/lockb` (base `462ba3e4`, "Merge pull request #24 from Rexoflex/work/histcs") · the diff:
  `git diff 462ba3e4` + the untracked new files (the lead gives the reader a tree copy) · Ixian-Core @097341a beside it.
- Pipeline: FULL ran (only `lock.html` of the built html changed) · smoke before the batch: `BASELINE OK 7000 / the 2 KNOWN`;
  after: see § 5 · CSH `pass=895 fail=0` (866 + 14 + 15).
- Pins: `node scripts/run-pins.mjs pins-lockb/a-shell pins-lockb/b-csharp` · csh `LockShellTests`, `LockClockTests` · by hand:
  `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-lockb/a-shell-render.mjs`.
- Mechanisms (read first): `docs/lockb-mechanisms.md`; the interfaces: `docs/contract-lockb.md` § 3.
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint)
| Reader | Model | Scope | Focus |
|---|---|---|---|
| S (security-only) | Fable 5.2 | all C# of the diff + `src/shells/lock.html` | can ANY path now bring a lock down, or skip it, where the base keeps it up (the clock override, the twins, the #500 restore, the no-stamp fallback, the unlock clear, a reboot, a failed read, overflow) · can the hold strand the user (no way to the form) · the push grammar (no new verb / push / carrier value; an older shell ignores the values) · the gate triggers (log lines, a new lock-page state) · C# touches no risky parts · #438 MAJOR-2 ("never cover a lock") |
| B (behaviour) | Opus | `src/shells/lock.html`, `LockPage.xaml.cs`, the call site in `App.xaml.cs` | the Android lifecycle order of mechanisms § 1 with the new pushes (page loads before / after the return, a reload, a prompt that pauses the activity, a cancel, NotAvailable, a pause with no stop) · per platform: nothing on Windows, nothing of item 1 / 3 on iPhone / Mac · all switches OFF = the base |
| P (pins) | Opus | `scripts/pins-lockb/**`, `scripts/csh/LockShellTests.cs`, `scripts/csh/LockClockTests.cs`, every re-base of another batch's pin in this diff | does each pin fail when the behaviour breaks (a break per key)? are the re-bases exact (they accept only the lockb lines)? a source pin states its limits first; a gap of the stated class is a NIT, not a MAJOR (#1735) |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · C# touches no risky parts · no new verb, push, carrier key or value ·
  no URL / address / name / text in logs · bundle BEFORE shells · **the lock is a security control: an unclear rule takes the
  "locked" side; nothing may bring a lock down where the base keeps it up** · #438 MAJOR-2 stays ("never cover a lock") · each
  change has its own switch; all three OFF = the base behaviour (#1478, #1312).
- Accepted (do not re-open): #1825 (1)–(3) option A each (Damir) · the 1-minute delay (#1750) · the 3 s belt counts from the
  prompt's start (#1795 (A)) — so a slow pattern can still have the form under it; the un-animated pop shortens what follows ·
  the Apple twin is not built (#1825 (3): a question).

## 5 · Verdict
(the final verdict is written when the loop closes; the rounds so far:)

### Round 1 (tree r1: `App.xaml.cs` f8b749b5…, `LockPage.xaml.cs` 462f1e5b…, `lock.html` 4d7e0676…; smoke BASELINE OK 7018 / the 2 KNOWN, CSH 895)
| Reader | Model | Result | Findings |
|---|---|---|---|
| S (security-only) | Fable 5.2 | 1 MAJOR · 1 MINOR · 2 NIT | MAJOR-1: a pause with NO stop (a translucent permission dialog) — MAUI raises `Application.OnResume` only from `OnRestart`, so no `"1"` follows the `"True"` hold: a spinner with no way to the form (base: the belt showed the form). MINOR-1: (a) a failed `dismissPauseLock` pop, (b) a throw in `OnResume` before the hand-off end in the same state. NIT-1: the send queue is flushed at `webViewNavigated`, not `ixian:onload` (doc). NIT-2: the App comment promised more. |
| B (behaviour) | Opus | 1 MAJOR · 1 MINOR · 1 NIT | MAJOR-1 = S MAJOR-1 (found independently). MINOR-1 = S MINOR-1 (a). NIT-1: mechanisms § 1 row 5 named the wrong edge. |
| P (pins) | Opus | 1 MAJOR · 3 MINOR · 1 NIT | MAJOR-1: a-shell a1 / a7 looked 10 s ahead (a 30 s belt kept green). MINOR-1: a8 never advanced the clock before boot. MINOR-2: the #438 inline re-base admitted code on the same line. MINOR-3: b9 counted `[TestMethod]` in comments. NIT-1: the header's BOM text. |
**Fixes (round 1):** `LockPage.releaseHold(why)` (R5 `releaseHoldWithoutPrompt`; reveals the form, sets `holdReleased`; `lock/hold-released why=<post-resume|pop-failed|other>`), called from `App.releaseDeferredAuth` when no prompt was handed over and a pause lock is up (the `OnPostResume` edge follows every return) and from `dismissPauseLock`'s pop-failed catch; a reload of a released lock sends `"1"`, never `"True"` (builder-e, Opus); the docs (mechanisms § 1 / § 3 / § 7 / § 8, P97, the gate row, walk row A-7); the pins (builder-f, Sonnet).

### Round 2 (tree r2: `App.xaml.cs` 1042729b…, `LockPage.xaml.cs` cc1d7c0f…, `LockShellRules.cs` a2456616…; smoke BASELINE OK 7019 / the 2 KNOWN, CSH 898)
| Reader | Model | Result | Findings |
|---|---|---|---|
| S2 (security-only) | Fable 5.2 | **0 MAJOR** · 1 MINOR · 3 NIT | MINOR-1: `lockOnPause`'s "did not present" handler and its catch drop `pauseLock` without releasing the hold (the sibling of r1 m-1; no throw found). NIT-1: a second `OnPostResume` after a consumed hand-off reveals early (no security effect). NIT-2: the "every False after `ixian:onload`" sentence (doc). NIT-3: the pop-failed release helps only before MAUI removes the page (comment). Verified the MAUI 10.0.71 lifecycle (`OnRestart` → `Window.Resumed` → `SendResume`). |
| X2 (break-my-verdict, the fixes) | Opus | **0 MAJOR** · 2 MINOR · 2 NIT | MINOR-1 = S2 NIT-1 (release only while deferred). MINOR-2: the #454 inline row's window 1400 → 1600 admitted a non-lockb move (b7 still caught it). NIT-1 = S2 NIT-2. NIT-2: a1 / a7 proved "no reveal within 1 h", not "no belt". |
**Fixes (round 2):** R5 = `on && builtDeferred && authDeferred`; `releaseHold("not-presented")` in both `lockOnPause` failure paths; the comments; the doc sentences; the #454 row an exact method slice; a1 / a7 assert no pending timer; the re-bases.
