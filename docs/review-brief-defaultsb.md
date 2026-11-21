# Review brief — Defaults batch `defaultsb` (#1790–#1809)

Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE round 1. The verdict goes into § 5 (#660).
Ruling: #1750 (main-chat row, not in `DECISIONS.md` yet). Mechanisms: `docs/defaultsb-mechanisms.md`. Contract:
`docs/contract-defaultsb.md`.

## 1 · What the batch is
| Item | What landed | Where (files) | Switch |
|---|---|---|---|
| 1 App lock On for a NEW or RESTORED account | create and restore write `lockenabled = true` (fixed value, C#) right after the existing `Remove("lockenabled")`; an absent key still reads Off | `Spixi/Utils/DefaultsRules.cs` (new) · `Spixi/Pages/Launch/LaunchPage.xaml.cs` (two inserted statements) · `Spixi/App.xaml.cs` (`isLockEnabled` delegates to `DefaultsRules.lockEnabledStored`, the same logic) | `DefaultAppLockOn` |
| 2 Lock delay 1 minute (phone + Mac) | the grace bound of `OnResume`'s `withinGrace` is 60 s (5 s with the switch off); Windows unchanged (10 min idle) | `App.xaml.cs` (the `withinGrace` statement; `LOCK_GRACE_SECONDS` removed) · `DefaultsRules.withinGrace` | `LockDelayOneMinute` |
| 3 Confirm payments On for a NEW or RESTORED account (Android, iPhone, Mac) | the same two write sites write `paymentauth = true` where `SPayments.paymentAuthSupported()`; the send path is untouched | `DefaultsRules.writeNewAccount` · `LaunchPage.xaml.cs` | `DefaultPayConfirmOn` |
| — | the three switches, their `[FLAGS] defaultsb` line | `Spixi/Utils/SpixiFlags.cs` (one block) | — |
| — | tests | `scripts/csh/DefaultsTests.cs` · `scripts/pins-defaultsb/a-defaults.mjs` · re-bases of other pins (listed in § 2) | — |

Not built, and why: **item 4, the Android lock-screen flash** — the mechanism is the shell's 3 s belt in
`src/shells/lock.html` + an animated modal pop; the fix needs `src/**`, out of this batch (mechanisms § 5; a question for
Damir). **Finding D-1** (no-credential alert) — reported, not built.

## 2 · How to run
- Tree: the cloud clone, `work/defaultsb` working tree on `redesign/frontend` @ `14ae57f2`; diff = `git diff 14ae57f2`.
- Pipeline: none (C# + scripts only; no html changed) · gates `build-shells --check`, `build-locales --check` ·
  smoke before: `BASELINE OK 6660` (observed in this environment, see the status doc) · CSH 766 → 766 + n ·
  Ixian-Core @ `097341a` present.
- Pins: `node scripts/run-pins.mjs pins-defaultsb/a-defaults` + the re-based pins (the builder's list).
- Known failures: the 2 KNOWN (#136 · B3). C# UNCOMPILED: `App.xaml.cs`, `LaunchPage.xaml.cs` (MAUI targets).

## 3 · Readers (Claude Fable 5.2, fresh, read-only, ONE at a time — the account's Fable limit)
| Reader | Scope | Focus |
|---|---|---|
| S (security-only, the riskiest file) | `App.xaml.cs` (the whole lock state machine around the changed lines), `DefaultsRules.cs`, `SpixiFlags.cs`, `LaunchPage.xaml.cs` (create + both restore paths), read-only `LockPage.xaml.cs`, `SPayments.cs`, `SettingsPage.xaml.cs` | can any path unlock without auth because of the 60 s bound (process death, renderer death, recents, the #500 sequences, a clock change, the no-stamp fallback, iPhone / Mac resume)? can a WebView value reach the write? does a failed restore write? does an existing account change? is the payment confirm intact, and is a no-credential device never blocked for ever and never sent without the confirm? does the L8 stored password change? |
| P (pins and tests) | `scripts/csh/DefaultsTests.cs`, `scripts/pins-defaultsb/**`, the re-based pins | does each test fail when its behaviour breaks? are the stated pin limits true? did a re-base weaken another batch's pin beyond our lines? |

Each round's fixes get a FRESH reader (break-my-verdict). Limit: round 5; before round 3 the cost note goes into the status
doc.

## 4 · Non-negotiables and accepted dials
- Must hold: ★ C# touches no risky parts (no new verb / argument / push; FIXED values; nothing from a WebView) · L157 fail
  closed (no unlock on a timer; a cold start with App lock On always locks) · #1478 one switch per change, old path = the
  fallback · an existing account keeps today's behaviour (absent = Off; no start / update / migration writes) · the native
  payment confirm of Fix batch 2 unchanged (`SPayments.cs`, `SConfirm.cs` byte-identical) · the L8 password store unchanged
  · no `src/**` / built html change.
- Accepted (do not re-open): App lock and Confirm payments On for new and restored accounts; the delay of 1 minute on the
  phone and the Mac, also for existing users with App lock On; Windows 10 minutes (#1750, Damir). Source-pin limits as
  stated in the pin's header (#1735).

## 5 · Verdict — **CLEAN at round 3** (0 MAJOR in a code path in every round; the pin gaps of round 3 are of the stated class, #1735)

| Round | Reader (all Claude Fable 5.2, fresh, read-only, one at a time) | MAJOR | What | Action |
|---|---|---|---|---|
| r1 | S — security-only, the whole lock / payment state machine | 0 | R1-1 MINOR the wall-clock measure (inherited mechanism, 5 s → 60 s makes it cheaper) · R1-2 MINOR the #500 stamp was never cleared after an unlock (item 2 defeated after the first lock) · R1-3 MINOR Mac plugin unproven · R1-4 NIT a pause with no stop · R1-5 NIT no switch control · R1-6 NIT stale comments / line numbers | R1-2 FIXED (Fable builder: `DefaultsRules.stampAfterUnlock` in `onUnlock`, same switch); R1-1 → question #1796; the rest recorded |
| r2 | S′ — break my verdict, the R1-2 fix first | 0 | F-1 NIT an unlock in the background leaves no stamp (the accepted dial from a verified unlock) · F-2 MINOR docs named one statement · F-3 NIT Settings writes the field (inherited) · F-4 NIT Mac shield on each click away · F-5 NIT agrees R1-1 | F-2 fixed (docs); the rest recorded |
| r2 | P — pins and tests (an Opus reader was refused by the session's safety check twice; run on Fable) | 1 (pin) | MAJOR-1 `[Conditional("SPIXI_DEV_COEXIST")]` on `writeNewAccount` passes every pin and CSH (the harness defines the symbol; a store build would drop both calls) · MINOR-1 the App-lock catch not exercised · MINOR-2 d3's "no new writer" vs a key built from pieces · NIT raw-string wording | FIXED in the pin only (Sonnet): d14 holds `DefaultsRules.cs` whole by SHA-256 (#1653 precedent), d9 forbids any attribute; header limits extended |
| r3 | P′ — break my verdict on the pin fix | 1 → graded NIT | d14 holds (hash = the file). MAJOR-1 a `#region … /*` directive line hides live code from the comment mask in an UNPINNED file (a remover of the keys) · MINOR-1 a `//` comment ended by U+2028 / a lone CR in `App.xaml.cs` — red only in `pins-coldstart1/a-lines` `plainLineEnds` · MINOR-2 the init locals are held only by `pins-fixb1/g-sparekeep` FLAGSFILE · NITs | **Not fixed (rule 9 + #1735):** rounds 2 and 3 each found a NEW class of silent fault in the same source-text pin (an attribute insertion; a directive mask), so no third fix round on the pin. Both are DELIBERATELY HIDDEN CODE — the class the pin's FIRST version states ("a masked `#define` / `#if` trick …", #1627 / #1735) — so they grade NIT. MINOR-1 / MINOR-2 are caught by other batches' pins (named above); recorded with that reliance. Damir can overrule in the main chat |

**Code files as the last code readers read them (r2, SHA-256):** `DefaultsRules.cs` `3184bb27…bde99a` · `SpixiFlags.cs`
`e56a1754…57fe` · `LaunchPage.xaml.cs` `92c6f469…7b2c` · `App.xaml.cs` `1e1245f3…6ed5`. After r2 only the pin module and docs
changed. Round costs: 4 Fable readers + 2 Fable builds; MAJOR per round in CODE 0 → 0 → 0; in the PIN — → 1 → 1 (graded NIT).
Before round 3 the cost note was recorded here (one more Fable reader, ~20 min; the code had been CLEAN twice).
