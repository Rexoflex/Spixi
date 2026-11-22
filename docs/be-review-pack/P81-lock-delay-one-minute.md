# P81 · THE APP LOCK ASKS AFTER ONE MINUTE AWAY, NOT FIVE SECONDS — PHONE AND MAC (batch defaultsb, item 2)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| MEDIUM (the security dial of the app lock: a longer no-auth window; Damir's ruling #1750) | no key; nothing unlocks by the bound | none: +1 int pref `flagLockDelayOneMinute`; the start line `[FLAGS] defaultsb applock=<0\|1> paydefault=<0\|1> lockdelay=<60\|5>` | `SpixiFlags.LockDelayOneMinute` (absent = ON; a stored 0 acts only in dev mode); OFF = 5 s | 5 min |

**Look here first:** TWO statements in `Spixi/App.xaml.cs`, both on the switch: (1) in `OnResume`
`bool withinGrace = DefaultsRules.withinGrace(sinceBackground.TotalSeconds, SpixiFlags.LockDelayOneMinute);` —
`DefaultsRules.withinGrace` = `secondsAway >= 0 && secondsAway <= (oneMinute ? 60 : 5)`; `LOCK_GRACE_SECONDS` is gone;
nothing else in `OnResume` changed (pin `d6` hashes the rest of the body against `14ae57f2`); (2) in `onUnlock`, after the
`S16SecRules.unlockReleases(e)` guard, `backgroundedDate = DefaultsRules.stampAfterUnlock(backgroundedDate, SpixiFlags.LockDelayOneMinute);`
(review round 1, R1-2: a VERIFIED unlock clears the leaving stamp; OFF = kept, the old path; pin `d13`). The invariant:
`onUnlock` nulls `pauseLock` in the same call, and `lockOnPause` calls `markBackgrounded()` before it pushes a pause lock,
so a pause lock is never up without a stamp.

**DECISIONS:** #496 (the window measures from the moment the app went away) · #500 (the stamp is put back while the lock
stays up) · #505 (Windows locks on input idle) · #1750 (Damir: 1 minute; it also changes for existing users who have App
lock On; no setting) · this batch #1793.

## What the bound decides, and what it does not
- It decides ONLY whether a lock that is ALREADY up (Android: pushed at the pause; iPhone / Mac: presented at the resume)
  needs an auth. An absence of at most 60 s pops it without auth (before: 5 s). No timer unlocks (L157).
- **Unchanged:** a cold start with App lock On always locks (`App()` makes `LockPage` the root) — also after a process
  death or a kill from the recents list, inside or after the minute · the negative-age guard (a clock set back is never
  "inside") · the #500 re-stamp (a short return after a long absence, Back on the pattern prompt) · the no-stamp fallback
  to `sinceUnlock` · Windows: `locksOnBackground = false`, the 10-minute idle watcher (`SDesktopIdle.cs`, byte-identical).
- A renderer death under the lock is handled by the #507 watchdog (it reloads the lock, never unlocks); not touched.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The bound widens silently | one call, the constants 5 / 60 in one file | csh `within_grace_bounds` (−1, 0, 5, 5.001, 59.9, 60, 60.001 for both bounds); pin `d5`, `d10`; smoke rows #454 / #496 re-based to the new text (ruling #1750) |
| The rest of the resume decision moves | the body hash | pin `d6`, `d7` |
| A switch-off path that is not the old one | `withinGrace(x, false)` = `x >= 0 && x <= 5` | csh `within_grace_bounds` |

**After an unlock that completes while the app is in the background** (a pattern accepted, then no return): no stamp
is left, so a return within 60 s of THAT verified unlock opens without an auth (round 2, F-1) — the accepted dial,
counted from a verified unlock. **Inherited (R1-1):** the absence is measured on the local wall clock; a clock set back
inside the window opens a pause lock without an auth (the mechanism is at the fork point; a question for Damir, #1796).

**Known (facts, not changed):** the Mac raises `OnSleep` on window deactivation like Windows did before #505 (only Windows
was moved to the idle model): on a Mac with App lock On, a window in the background for more than 60 s asks on its return
(before: 5 s), and with App lock On `OnSleep` raises the privacy shield on each window deactivation (`App.xaml.cs`
`OnSleep`, legacy) — every new Mac account now gets a covered window on each click away (round 2, F-4). The Apple phase
checks both (`docs/walk-defaultsb.md`).
