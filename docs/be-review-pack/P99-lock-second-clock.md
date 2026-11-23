# P99 · THE LOCK DELAY IS ALSO MEASURED ON A CLOCK THE USER CANNOT SET — ANDROID (batch lockb, item 3)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| MEDIUM (the security dial of the app lock; it can only add locks) | none | none | `LockbFlags.SecondClock` (`flagLockSecondClock`, absent = ON; a stored 0 acts only in dev mode); OFF = the wall clock alone (the base) | 6 min |

**Look here first:** `Spixi/App.xaml.cs` `OnResume`: the base statement `bool withinGrace = DefaultsRules.withinGrace(…)` is
UNCHANGED; then `if (secondClock && withinGrace) { withinGrace = LockClockRules.withinGrace(sinceBackground.TotalSeconds,
nowMono, stampMono, SpixiFlags.LockDelayOneMinute); }` — it runs only when the base said "inside" and can only turn that into
"outside". `Spixi/Utils/LockClockRules.cs` (pure, run by csh `LockClockTests`): `nowMs()` = Android
`SystemClock.ElapsedRealtime()` (since boot, counts sleep, not settable; `-1` if the read throws; `null` off Android) and the
five steps of `withinGrace`. The twin stamps `backgroundedMono` / `unlockedMono` are written, cleared and restored only with
their wall stamps (`markBackgrounded`, the top of `OnResume`, the #500 restore, `onUnlock` via `keepTwin`).

**DECISIONS:** #496 (the window from the leaving edge) · #500 (the stamp restored while the lock stays up) · #1750 / #1793 (60 s)
· #1796 R1-1 (the wall clock set back opens a pause lock) · #1825 (3) (Damir: option A) · this batch #1918.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The clock / time zone set back inside the window opens the lock (R1-1) | the second clock must also be inside the bound | csh `wall_clock_set_back_is_outside` (wall 0 s, mono 600 s → outside) |
| The new rule opens a lock the base keeps | the override runs only when the base said inside; the rule repeats the wall test as step 1 | csh `never_inside_where_the_wall_rule_is_outside`; pin `b-csharp` b1 (the statement shape, no other assignment) |
| A reboot, a failed read, a damaged value, overflow | a reading below 0 → outside; a negative difference → outside; the stamps are memory only (a reboot = a cold start = locked) | csh `mono_negative_difference_is_outside`, `failed_read_is_outside`, `mono_extremes_do_not_overflow` |
| A path writes the wall stamp without its twin | a clock but no twin → outside (fail closed) | csh `no_twin_stamp_is_outside`; pin `b-csharp` b2 (the twin sites) |
| A stale twin outlives its wall stamp after an unlock | `keepTwin(backgroundedDate, backgroundedMono)` right after the `stampAfterUnlock` line | csh `keep_twin_follows_the_wall_stamp` |

Log: `resume/pauseLock-held …` gains ` mono=<n>s` (`-1` clamped, `-2` no twin) only with the switch on and a second clock;
OFF = the base line, byte for byte. Platforms: Android only; iPhone / Mac have no second clock here (the wall rule alone = the
base; a question for the Apple phase); Windows does not lock on background. **Inherited, not changed:** the own-intent return
(`ownIntentFresh`, S15 O-29) is also measured on the wall clock (a 🟡 proposal, #1920). ⚠ C# UNCOMPILED: `App.xaml.cs`.
