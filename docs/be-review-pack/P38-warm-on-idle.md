# P38 · WARM ON IDLE · A hidden WebView starts its boot only after 1.2 s without a touch, and two hidden boots never start together (Speed batch 1a, P-12)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (a wait in front of an existing warm; the one new input read is a TIME, never a position) | no | no verb, push, `spixi.*` key or new log word; 1 touch time stamp (a `long`, written by Android's touch dispatch) and 1 boot time stamp (a `long`, main thread); 1 pref; dev: 1 switch name on `ixian:devflash:`; the one `[FLAGS]` line (plumbing, see the gate section) | built behind flag `SpixiFlags.WarmOnIdle` (default ON) · ⚠ C# UNCOMPILED (Android build) · no device number yet | 4 min |

**Look here first:** `Spixi/Utils/SpixiContentPage.cs` `warmSpareChat` (`:1887`), its FIRST statement `:1889`, and `Spixi/Platforms/Android/MainActivity.cs` `DispatchTouchEvent` (`:432`, 2 statements).

**DECISIONS:** #1312 · #1478 (own switch, old path = fallback) · #1473 (the speed plan) · ruling 1147 (4) (the warm at the close; see the trade below). This batch's own rows: written at integration (lead). Review: `docs/review-brief-perfb1.md` (#46 r1 A-1, A-6, S-7, S-10).

## What changed and why
- **Why.** On Android all WebViews share ONE renderer thread. A hidden page that boots during a scroll freezes the visible one (adb walk, Galaxy A52s, 2026-11-12: the chat spare cost 18 dropped frames, worst 117 ms, against 2–3 and 33–50 ms without it). Two hidden pages boot at idle: the chat spare and the parked Account.
- **The rule (pure).** `WarmIdleRules.waitMs(flagOn, gatedPlatform, nowMs, lastTouchMs, lastHiddenBootMs)` (`WarmIdleRules.cs:62`; it builds on the 4-input quiet rule at `:31`): switch OFF or an ungated platform → 0 (`:64`); the larger of the quiet wait (`QuietMs = 1200`, `:19`: no touch for that long; no touch since the start → 0; a clock that went back → `QuietMs`) and the stagger (`StaggerMs = 900`, `:56`: the time since the last hidden boot that passed the gate; none yet → 0).
- **Why the stagger (review A-1).** Both waiters count "last touch + 1200 ms" from the same stamp, so after one touch the Account warm and the spare would boot at the same instant; the old path kept them 900 ms apart. One main-thread stamp `SpixiContentPage.lastHiddenBootMs` (a time, Android only, `SpixiContentPage.cs:1804`) is written by `markHiddenBoot` (`:1832`, only when `inputIdleGates` `:1821` says the gate is on) and READ only by `inputIdleWaitMs` (`:1811`; `inputIdleGates` does not read it), in the SAME main-thread turn in which the gate answered 0: the spare in `spareWaitsForInputIdle` (`:1846`, stamp `:1852`), the Account loop right before `warmParkedOverlay` (`HomePage.xaml.cs:4326-4328`). The stamp is written BEFORE the refusals of the warm (#46 r2 R2-6), so a refused warm can delay the other waiter by up to 900 ms, once (one stamp per trigger; no starvation).
- **The touch time stamp.** `MainActivity.lastTouchMs` is `internal static long … { get; private set; }` (`MainActivity.cs:430`): one writer by the language, not only by a pin. `DispatchTouchEvent` (`:432-436`) stores the tick count and returns `base.DispatchTouchEvent(e)`. No position, no pointer id, no log, no allocation, no event kept. Read at one place: `SpixiContentPage.inputIdleWaitMs` (`SpixiContentPage.cs:1811`, `#if ANDROID`; every other platform returns 0).
- **The spare.** `warmSpareChat` asks `spareWaitsForInputIdle` first (`:1889`). Not idle yet → ONE coalesced re-check (`spareIdleRecheckPending`, `:1794`) after the remaining time; `warmSpareChat` returns false with nothing built. The re-check calls `onSpareIdleRecheck` (`:1869`), which HomePage overrides to re-enter `warmChatSpareNow` unless stopped (`HomePage.xaml.cs:4423`). So **every refusal that exists today runs AFTER the wait** (`exists · lock · host · staging · chat · grid`, `SpixiContentPage.cs:1897-1913`; `content`, `race` after; `background` in `warmChatSpareNow`, `HomePage.xaml.cs:4497-4500`).
- **The Account warm.** After its own 900 ms and the rail-pane test, a loop waits the remaining time (`HomePage.xaml.cs:4309`) and stops when `running` is false. Then, with the gate on, the boot starts only while the page runs AND the app is in the foreground (`WarmIdleRules.bootsAfterWait`, `:94`; call `HomePage.xaml.cs:4320`; review A-6: "no touch for 1.2 s" is also true when the user LEFT the app). On refusal the latch `accountWarmed` is released (`:4322`) and the bool `accountWarmRetryOnResume` is set (`:4323`, one bool, main thread; #46 r2 R2-4): the next chats flush OR a quiet resume asks again, once, through the same method (`HomePage.onResume`, `:4407-4410`). `warmParkedOverlay` keeps every refusal (`:4328`).
- **Old delays = a lower bound.** Close 0 · first paint 1800 · desktop present 600 (`HomePage.xaml.cs:4363-4364`, `:4523`) · Account 900 (`await Task.Delay(900)`, `:4296`) are unchanged and run BEFORE the gate. Switch OFF, Windows, iPhone, Mac = today's timers, byte for byte.
- **Timing (Android, switch ON; F = the first chats flush).** The table is the csh model (`cold_start_no_touch_keeps_the_old_900_and_1800` and the three after it).

| Case | Account boot | Spare boot |
|---|---|---|
| no touch | F + 900 | F + 1800 (unchanged) |
| one touch at F + 700 | F + 1900 | F + 2800 (either may be first; 900 ms apart) |
| scroll until S | S + 1200 | S + 2100 (the second 900 ms after the first) |
| switch OFF / Windows / iPhone / Mac, any touches | F + 900 | F + 1800 |

- **Known trade (ruling 1147 (4)).** After a chat close the warm waits about 1.2 s after the close tap (the tap is a touch; csh `trigger_a_after_a_close_tap_waits_1200_from_the_tap`). A re-open inside that window opens cold (about 290 ms); the old path warmed at once. Said here on purpose.
- **Flag.** Int pref `flagWarmOnIdle` (`SpixiFlags.cs:29`, `:95`, `:143`, `:178`), absent = ON, a stored 0 acts only in dev mode (`S16PassRules.effectiveFlag`); in the `[FLAGS] warmidle=…` line (`:182`). Dev switch `ixian:devflash:warmidle:<0|1>` (`DevPage.xaml.cs:159`).

## Files
`Spixi/Utils/WarmIdleRules.cs` (new, pure) · `Spixi/Utils/SpixiContentPage.cs:1792-1871`, `:1889` · `Spixi/Pages/Home/HomePage.xaml.cs:4281-4335`, `:4398-4411`, `:4423` · `Spixi/Platforms/Android/MainActivity.cs:430-436` · `Spixi/Utils/SpixiFlags.cs` (above).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| Chat content reaches the spare while it waits (the PARAMOUNT isolation invariant) | While it waits NO page exists: the wait is before `make()`. The built spare is the blank `SingleChatPage()` (no friend; private constructor `SingleChatPage.xaml.cs:174-181`); `createSpare` (`:183`) has one caller | pin `a-warm-idle` row `gate` (`oneSpareMaker`, `spareGate`) |
| The stamp becomes an input log (position, key, target) | It holds a time only; no `GetX` / `GetY` / pointer / log / `new` in the override; one override, one writer (a `private set`), one reader | pin `a-warm-idle` row `stamp` |
| A WebView, a push or a log line can read a stamp | Both are C# statics; read only by `inputIdleWaitMs`, which turns them into a wait length; nothing is sent, logged or stored | pin `a-warm-idle` row `stamp` (`readByGateOnly`) |
| The wait skips a lock / staging / host refusal | The re-check re-enters the whole funnel | pin `a-warm-idle` row `gate` (`recheckReentersFunnel`, `funnel`) |
| Two hidden boots on one renderer thread at the same instant | The stagger: stamp in the same turn as the gate's 0 | pin `a-warm-idle` row `stagger` (`bothWaitersStamp`, `sameTurnAsTheZero`) · csh `one_touch_at_f_plus_700_keeps_the_two_boots_900_apart` |
| A hidden boot while the user has left the app | Gate on: the Account boot needs `running` and the foreground; else the latch is released and one retry is asked at the next quiet resume | pin `a-warm-idle` row `foreground` · csh `a_boot_after_the_wait_needs_the_foreground_only_with_the_gate_on` |
| A warm after shutdown, or a timer pile-up | `onSpareIdleRecheck` and the Account loop return when `running` is false; at most one pending re-check | pin `a-warm-idle` row `gate` (`coalescedOnePending`, `accountGate`) |
| A user who keeps touching blocks the warm for ever | Accepted: the next open is the cold path (as before P-12); only a timer, no growth | csh `waits_until_1200_ms_without_a_touch` |
| A new log word or value | None. Note: the TIME of the existing `[CDPERF] chat warm start` / `refused why=…` lines is now "last touch + 1200 ms" (gate row, S-7) | pin `a-warm-idle` row `off` |
| Switch OFF / other platform differs from today | The gate answers 0 first; no stagger logic runs | csh `switch_off_or_ungated_runs_no_stagger_logic`, `switch_off_two_boots_are_the_old_timers_whatever_the_touches` · pin row `off` |

## NOT proven
- ⚠ C# UNCOMPILED for Android (the cloud cannot build the app): the csh harness runs the pure rules and a model of the timers; the pins read source text.
- No device number after the change. The gain (fewer dropped frames during a scroll) and its price (the cold re-open above) are not measured yet; the device sitting follows the delivery.
- The keep rule: a switch that does not measurably help on the device is removed. If 1200 ms or 900 ms is wrong, only the constant changes.
- Windows, iPhone, Mac are not gated by design (own renderer processes); not changed, not walked here.

## How to switch it off
Developer mode on → send `ixian:devflash:warmidle:0` (NO row on the Developer screen in this batch; the row comes in a later shell batch) → restart. Leaving dev mode removes the stored value.

## Question for BE
Is one static time stamp of the last touch, held in the Activity (a `private set`) and read by one gate, acceptable as an input read (a time only, no position, never stored or sent)? (yes / no)
