# P39 · SPARE RE-ARM · After a drop, the blank chat spare is warmed again at the next quiet moment (Speed batch 1a, P-11 switch 1)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (timers and two bools; nothing new reaches a WebView; the cost is memory) | no | no verb, push, `spixi.*` key or log line; 1 pref; dev: 1 switch name on `ixian:devflash:`; the one `[FLAGS]` line (plumbing, see the gate section) | built behind flag `SpixiFlags.SpareRearm` (default ON) · ⚠ C# UNCOMPILED (Android / iPhone / Mac) · no device number yet | 4 min |

**Look here first:** `SpixiContentPage.dropSpareChat` (`Spixi/Utils/SpixiContentPage.cs:2047`; arm / clear at `:2052-2059`, inside the preload lock), `takeSpareRearm` (`:1778`) and `HomePage.rearmChatSpareAfterDrop` (`Spixi/Pages/Home/HomePage.xaml.cs:4383`).

**DECISIONS:** #1312 · #1478 · #1473 · this batch's own rows: #1560 (the four switches) · #1562 (this change) · #1563 (🟡 the quiet resume: the warm is scheduled at the resume itself). P-11 switch 2 (`SpareKeepShortSleep`) is its own switch and its own packet (P40).

## What changed and why
- **Why.** Trigger B (the warm after the first chats flush) is one-shot. After a drop (`sleep`, `theme`, `language`, `reload`, `devmode`) no spare came back until a conversation closed. Device (Galaxy A52s, 2026-11-12, `claude/device-numbers-2026-11-12.md`): after 60 s in the background no spare existed in 15 of 15 opens; the open took 286–296 ms against 97–114 ms on a spare.
- **Arm.** `dropSpareChat(why)` sets `spareRearmPending` when `SpareRearmRules.rearmsAfterDrop(flag, why)` is true (`sleep · theme · language · reload · devmode`, `SpareRearmRules.rearmsAfterDrop`, `SpareRearmRules.cs:23-35`) and resets the flush ask (`SpixiContentPage.cs:2054-2055`). `stop` and `lowmem` clear it (`:2059`, `SpareRearmRules.cs:44`). Not re-arming: `timeout`, `host`, the tap-refusal words. The drop at sleep (`App.OnSleep`, `Spixi/App.xaml.cs:1432`, not on Windows) stands AFTER `isInForeground = false` (`:1411`), so a chats flush already running cannot take the re-arm in between (#46 r2 R2-5); it is unchanged while `SpareKeepShortSleep` is OFF (P40): then no spare lives in the background. With P40 ON (Android, opt-in) a kept spare lives in the background for up to 3 minutes.
- **Take, never while locked or in the background.** `takeSpareRearm(appLockUp)` (`SpixiContentPage.cs:1778`) returns true once, only with the switch ON, a pending re-arm, the app in the FOREGROUND (`App.isInForeground`) and no lock: the app lock (`HomePage.appLockUp`, `HomePage.xaml.cs:4416`), a lock shown in place (`modalOverlayOp`) or a lock still staging (`isLockStaging()`, which counts like a lock that is up). `askSpareRearmFlush` (`:1761`) passes the same two tests. A refused take clears the flush ask (`:1784`): one forced flush per SUCCESSFUL take, so the tick asks again after the lock or the background is gone. On true, `rearmChatSpareAfterDrop` releases trigger B's latch (`chatSpareFirstWarmScheduled = false`, `HomePage.xaml.cs:4383-4391`).
- **Three ways to reach the take.** (1) The chats flush, in the statement before trigger B (`HomePage.xaml.cs:4265`). (2) A quiet resume: `HomePage.onResume` (`:4398`; `App.OnResume` calls it on the current page only when the resume does NOT lock, `App.xaml.cs:1325`) takes it and schedules trigger B at once: resume + 1800 ms. (3) The fallback, the 2 s tick in `updateScreen` asks ONE flush for a pending re-arm (`askSpareRearmFlush`, `SpixiContentPage.cs:1761`, call `HomePage.xaml.cs:5324`) by raising the existing `UIHelpers.shouldRefreshContacts`: a locked resume after the unlock, or home not the current page. Only one caller wins the take (preload lock).
- **Same funnel, every refusal kept.** The warm still runs `scheduleChatSpareWarm → warmChatSpareNow → warmSpareChat` (`scheduleChatSpareWarm` `HomePage.xaml.cs:4471`, `warmChatSpareNow` `:4480`; `SpixiContentPage.warmSpareChat` `:1887`): `exists · lock · host · staging · chat · grid · content · race · background`; on Android behind the P38 idle gate. The re-arm can only ask for a warm, never skip a refusal.
- **Cost.** The spare's renderer is about 15 MB PSS (Session P, #802) and is held again after every return from the background, theme, language or dev-mode change. Applies to Android, iPhone and Mac (the sleep drop is `#if !WINDOWS`); Windows never drops at sleep.
- **Flag.** Int pref `flagSpareRearm` (`SpixiFlags.cs:30`, `:97`, `:144`, `:179`), absent = ON, a stored 0 acts only in dev mode; `[FLAGS] … sparerearm=…`. Dev switch `ixian:devflash:sparerearm:<0|1>` (`DevPage.xaml.cs:159`). OFF: `takeSpareRearm` and `askSpareRearmFlush` are always false → the old one-shot trigger B.

## Files
`Spixi/Utils/SpareRearmRules.cs` (new, pure) · `Spixi/Utils/SpixiContentPage.cs` (`askSpareRearmFlush` `:1761`, `takeSpareRearm` `:1778`, `dropSpareChat` `:2047`) · `Spixi/Pages/Home/HomePage.xaml.cs` (`:4265`, `:4383`, `:4398`, `:4416`, `:5324`) · pin `scripts/pins-perfb1/b-spare-rearm.mjs` (6 rows: DROP · TAKE · RESUME · ASK · WORDS / OFF · REFUSE) · csh `PerfB1SpareRearmTests` (15 tests) · the inline pin re-based in `scripts/smoke-test.mjs:29056` ("trigger B is one-shot … cleared at exactly three": the declaration, the background refusal, the re-arm).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| Chat content in the spare (the PARAMOUNT isolation invariant) | Unchanged: the spare is the blank `SingleChatPage()`, its own WebView, given a friend only at the user's tap. The re-arm adds a schedule, not a page or a data path | pin `b-spare-rearm` (`sameFunnel`); P16 |
| A warm over a lock screen or a lock that comes up later | Take refused while `isAppLockActive` or `modalOverlayOp`; a locked resume waits for the tick after the unlock; the funnel refuses `lock` again | csh `never_while_locked`, `model_a_locked_resume_waits_for_the_unlock`, `model_a_staging_lock_counts_as_a_lock` · pin `TAKE` (`takeReadsLock`), `REFUSE` (`bothReadTheStagingLock`) |
| A take while the app is in the background (the warm would be refused with `why=background` and the re-arm lost) | `takesRearm` / `asksFlush` take `foreground`; both call sites pass `App.isInForeground`; a refused take clears the ask, so the tick asks again | csh `never_in_the_background`, `model_a_take_in_the_background_is_refused_and_the_next_resume_still_rearms`, `model_a_lock_between_the_ask_and_the_take_lets_the_tick_ask_again` · pin `REFUSE` (`bothReadTheForeground`, `refusedTakeClearsTheAsk`) |
| A warm after delete-account / shutdown | `stop()` clears `running` BEFORE its `stop` drop, which cancels the re-arm; the warm path also returns when not `running` | csh `stop_and_lowmem_cancel_a_pending_rearm` · pin `DROP` (`stopClearsAfterRunningFalse`) |
| A page makes the app warm repeatedly (a loop) | No verb or push reaches the flags; one pending bool, one forced flush per successful take, one latch | csh `nothing_pending_nothing_happens_and_the_flush_is_asked_once`, `model_both_paths_racing_schedule_exactly_once` |
| A key, path or address leaves a WebView or enters a log | No WebView input is read; no `Logging` call on the path | pin `WORDS` (`noNewLog`) |
| Switch OFF differs from today | The switch is tested first in every rule | csh `switch_off_never_rearms` · pin `WORDS` (`offFirst`) |

## NOT proven
- ⚠ C# UNCOMPILED for Android, iPhone and Mac. The csh harness runs the rule and a model of the call order; the pins read source text.
- No device number after the change: whether the open falls back to about 100 ms after a return, and what the held 15 MB costs on iPhone / Mac (a hidden WebView is a jetsam candidate; `lowmem` still drops it), are not measured. The keep rule: a switch that does not measurably help on the device is removed.
- **Mac (R2-8, not measured).** On the Mac `OnSleep` is a window deactivation and the sleep drop is `#if !WINDOWS`, so with `SpareRearm` ON every window activation boots one hidden chat WebView 1.8 s later (the old path: no spare until the next chat close). A question for the Apple phase: keep it, or keep the re-arm off on the Mac.
- The drop at `sleep` arms even when no spare existed, and a later `sleep` re-arms after a `lowmem` drop (the rule keeps no memory of why the last spare went). A design note, not a hole.

## How to switch it off
Developer mode on → send `ixian:devflash:sparerearm:0` (no row on the Developer screen in this batch) → restart.

## Question for BE
Is it acceptable that the blank spare WebView (about 15 MB) is held again after every return from the background on iPhone and Mac, given the `lowmem` drop? (yes / no)
