# Lock batch (`lockb`) — the mechanisms, read before any code (#294)

Session `lockb` (ruling #1825 (1)–(3), Ready by #1838). Base `redesign/frontend` @ `462ba3e4`. Line numbers are the BASE's.
Sources: `docs/defaultsb-mechanisms.md` § 4 and § 5 (the first reading, 2026-11-18), the source below, and the old device log
of 2026-08-22 (`docs/archive/f5-verdict-2026-08-22b.md` § 1). No new device log was taken in this session (no operator).

## 1 · The lock cycle on Android today (the pause lock, App lock On, a pattern / PIN / fingerprint on the phone)

| # | Edge (thread) | Code | `[LOCKDIAG]` line | What the lock page shows |
|---|---|---|---|---|
| 1 | `MainActivity.OnPause` (UI) | `MainActivity.cs:649–667` → `App.lockOnPause` (`App.xaml.cs:628`): `markBackgrounded()` (the wall-clock stamp, `:152–162`), `new LockPage(true, true)`, `deferAuthentication()` (`:711`), `PushModalAsync(lockPage, false)` (`:723`) | `pause/creating-lock`, `lock/deferAuthentication`, `pause/push-requested` | the WebView starts to load `lock.html`; the carrier `LockAuthPending = "1"` (`LockPage.markAuthPending`, `LockPage.xaml.cs:53–57`, every non-WinUI lock) |
| 2 | the page loads (UI; the WebView keeps running while the activity is paused) | `lock.html:192–203` `boot()`: `AUTH_PENDING` → the form hidden behind the spinner, **`setTimeout(revealLock, 3000)` (`:198`)**; `mountLockPage` sends `ixian:onload` → `LockPage.onLoad` (`LockPage.xaml.cs:320`) → `maybeAuthenticate` → `SKIP: deferred (waiting for OnResume)` (`:397–402`) | `lock/OnAppearing`, `lock/webview-onload`, `auth/maybeAuthenticate … → SKIP: deferred` | the spinner |
| 3 | **3 s after the load, the app still away** | the belt fires `revealLock()` | — (the page logs nothing) | **the password form** (the lock's state while away) |
| 4 | `App.OnSleep` (from `OnStop`) | the privacy shield is NOT raised: a lock is up (`App.xaml.cs` `OnSleep`, `!isLockScreenActive`) | — | — |
| 5 | the return after a STOP: `App.OnResume` (UI). ⚠ Corrected in review r1 (S MAJOR-1, B NIT-1): MAUI raises `Application.OnResume` from the activity's **`OnRestart`** (`OnRestart` → `Window.Resumed` → `SendResume`; the activity's `OnResume` raises only `Window.Activated`), so it runs only after an `OnStop` — a pause with NO stop (a translucent permission dialog) returns without it | `:1168`: one reading of the wall clock, `sinceBackground = DateTime.Now − wentAway` (`:1197–1199`), `withinGrace = DefaultsRules.withinGrace(…, LockDelayOneMinute)` (`:1200`, ≤ 60 s). Inside → `dismissPauseLock` (`PopModalAsync(false)`). Outside → the stamp is restored (#500, `:1255`) and `pendingForegroundAuth = held` (`:1284`) | `resume/entered`, `resume/pauseLock-held … withinGrace=`, `resume/lock-stays-up` | **flash 1 — the form is drawn** (step 3 made it the state) |
| 6 | `MainActivity.OnPostResume` → `decor.Post` (`MainActivity.cs:614–646`) | `App.releaseDeferredAuth` (`App.xaml.cs:45`) → `LockPage.onForegroundReturned` (`:605`) → `maybeAuthenticate` → `PROMPT` (`:404–406`) → `Plugin.Fingerprint.AuthenticateAsync` | `resume/activity-resumed lifecycle=RESUMED`, `resume/deferred-auth-released`, `lock/onForegroundReturned`, `auth/maybeAuthenticate … → PROMPT` | the form; then the system prompt — for a pattern / PIN `ConfirmDeviceCredential`, a SEPARATE activity (it pauses MainActivity again; the stamp stays, #500) |
| 7 | the prompt returns | `SetResultAsync` (`:656`): authenticated → `performUnlock` → `popOwnModal("unlock")` (`:565`) → **`Navigation.PopModalAsync()` — animated (`:571`)**; not authenticated → `revealPasswordForm()` + the alert "Authentication Failed" (`:667–668`) | `lock/auth-returned` | **flash 2 — the form shows from the credential activity's exit until the animated pop ends** |

`App.onUnlock` (`:500`) then clears the latches, the shield and (with `LockDelayOneMinute`) the leaving stamp (`DefaultsRules.stampAfterUnlock`).

## 2 · Where the form becomes visible before the prompt (item 1)

- **Flash 1** = step 3. The 3-second belt (#457) was designed for a prompt that starts within ~0.5 s of the page load (the cold
  start). The pause lock loads at the PAUSE and prompts at the RETURN, minutes later, so the belt always fires while the app is
  away. Every locked return draws the form first.
- **Flash 2** = step 7: the gap between the credential activity's exit and the end of the ANIMATED modal pop. (If the user takes
  longer than the belt inside the prompt, the form is also what lies under the prompt.)

## 3 · Which existing C# → page message can carry "a prompt is pending" (no new push, no new verb)

The shell already defines the push **`setAuthPending(pending)`** as a bare global (`lock.html:187–190`), and C# already sends it
(`LockPage.revealPasswordForm`, `:625–635`, value `"False"`). The shell's contract: **the values `'True'`, `'true'`, `true`, `'1'`
are "pending" and are IGNORED** (`return`); any other value reveals the form. C# never sends a "pending" value today.

**The carrier of "a deferred prompt is pending": two of the four "pending" values of the existing push.**

| Value C# sends (only with the item-1 switch on, only for a lock built deferred) | New shell (this batch) | A shell built before this batch |
|---|---|---|
| `"True"` — at `onLoad` while the prompt is still deferred | hold the form; **stop the 3 s belt** (the prompt has not started) | ignored (`return`) = the old behaviour |
| `"1"` — when the prompt's window opens (the return, and each `PROMPT`) | hold the form; **the 3 s belt counts from now** | ignored = the old behaviour |
| `"False"` — as today (the prompt resolved without an unlock, or it threw) | reveal | reveal |
| (no push) — the switch off, and every lock that is not built deferred | as today: hold + the 3 s belt from the load | the same |

So: **no new verb, no new push name, no new carrier key, no new carrier value.** An older shell ignores both values by its own
code, so the template's constraint line is met by construction. It IS a new state of the lock page ("deferred hold": the form
hidden with no belt running) → its section in `docs/security-handover-gate.md` (this batch), and a review packet.

The carrier `LockAuthPending` is NOT changed: it is a process-global dictionary value (`SpixiLocalization.addCustomString`), and
`SpixiContentPage.reload()` (`:6361`, also called for every page by `UIHelpers.reloadAllPages` on a theme change) re-generates a
live lock from whatever value the LAST lock construction wrote. A per-lock carrier value could re-boot a cold-start lock into a
hold with no belt. The push is per page instance: a reload re-boots the page with `"1"` (hold + belt) and `onLoad` sends the
state again.

**Why the hold cannot strand the user** (as corrected after review round 1):
- `"True"` is sent only while `authDeferred` is set (the pause lock, before the return).
- A return after a STOP: `App.OnResume` decides "the lock stays up" on the UI thread and calls the lock **directly** → `"1"` →
  the belt runs from the return; or it dismisses the lock (within the window).
- A return with NO stop (a translucent dialog: the RECORD_AUDIO or camera permission), or a throw in `App.OnResume` before the
  hand-off: `App.OnResume` does not hand a prompt over, so `MainActivity.OnPostResume` → `App.releaseDeferredAuth` finds no held
  prompt; when a pause lock is up it calls `LockPage.releaseHold("post-resume")` → `"False"` → the form (the base's state: the
  base belt had shown it; no prompt comes on this path, as in the base). `OnPostResume` follows EVERY return to the foreground.
- A `dismissPauseLock` whose posted pop throws leaves the page on screen: its catch calls `releaseHold("pop-failed")` → the form,
  and the password clears it (the base's state). It helps only for a throw before MAUI's `PopModalAsync` removes the page; after
  that the page is disposed (`OnDisappearing` → `Dispose`), the base's same dead page (review r2, S2 NIT-3).
- `lockOnPause`'s two failure paths (the push did not present; the catch) drop `pauseLock`; each calls
  `releaseHold("not-presented")` first (review r2, S2 MINOR-1).
- The release fires only while the prompt is still deferred (`authDeferred`): after a consumed hand-off a second `OnPostResume`
  with no restart (the prompt's own credential UI, a notification tap) reveals nothing — the shell already has `"1"` (review
  r2, X2 MINOR-1 / S2 NIT-1).
- A page that loads AFTER that call gets `"1"` from `onLoad` (the state rule of § 6, not an event).
- After any reveal, `"True"` and `"1"` are ignored (the form is never hidden again — the base's invariant).
- The lock itself never comes down from any of this: the password form is "never the thing being protected" (#457); a hold only
  delays the form, and the system prompt, the form and `doUnlock` are unchanged.

**Flash 2:** the pause lock (only that lock: built deferred) is popped with `PopModalAsync(false)` — the same un-animated pop
`dismissPauseLock` already uses (`App.xaml.cs` `dismissPauseLock`). The rule #438 MAJOR-2 ("never cover a lock") is untouched: no
cover, no shield, no native view over the lock.

## 4 · D-1, the alert on a device with no credential (item 2)

`SetResultAsync` (`LockPage.xaml.cs:656–668`) treats every not-authenticated result alike: `revealPasswordForm()` + the alert
"Authentication Failed / Enter password to unlock Spixi". With no screen lock and no biometric, Plugin.Fingerprint returns
`Status = NotAvailable` WITHOUT showing any UI (`docs/defaultsb-mechanisms.md` § 4), so the alert is the first thing the user
sees at every lock. `Denied` (iOS: the Face ID permission was refused) is the same case: no prompt was shown. The rule: with the
switch on, when `result.Status` is `NotAvailable` or `Denied`, no alert; the form opens (the push is unchanged). Every other
status keeps the alert. No new text. Not a bypass: the form still needs the Spixi password, checked against the wallet file
(`doUnlock`, `:485–503`).

## 5 · The wall clock (item 3, R1-1)

`App.xaml.cs` measures the absence ONLY with `DateTime.Now` — local time: the stamp (`markBackgrounded`, `:152–162`), the
fallback `unlockedDate` (`:67`, set in `onUnlock`), and the grace test (`:1197–1200`). A person with the unlocked phone in hand
who sets the clock or the time zone back (or a daylight-saving fall-back) to 0–60 s after the stamp opens a pause lock with no
auth (`withinGrace` true → `dismissPauseLock`). The negative guard of `withinGrace` stops only a clock set back BEFORE the stamp.

**The second clock:** Android `SystemClock.ElapsedRealtime()` — milliseconds since boot, counting deep sleep, not settable by the
user or an app. Not `Environment.TickCount64` / `Stopwatch`: on Linux / Android they read `CLOCK_MONOTONIC`, which stops in
suspend (a phone asleep 10 minutes would look like seconds — the unsafe direction).

**The rule (with the switch on):** the lock comes down without auth only when BOTH clocks say "inside the bound" (≥ 0 and ≤ 5 / 60
s by `LockDelayOneMinute`). Each wall stamp (`backgroundedDate`, `unlockedDate`) gets a second-clock twin written at the same
statement; the #500 restore and the R1-2 unlock clear move the twin with it.

| Case | Wall clock | Second clock | Result |
|---|---|---|---|
| away 30 s | 30 s | 30 s | inside → no auth (as today) |
| away 10 min, the clock set BACK 10 min | ≈ 0 s | 600 s | **outside → the lock asks** (the R1-1 hole is closed) |
| away 30 s, the clock set FORWARD 1 h | 3630 s | 30 s | outside → the lock asks (as today; the safe side) |
| the time zone changed while away | shifted by hours | true | the second clock decides "outside" if it is |
| a reboot | the process dies: the stamps are memory only, so no stamp survives; the next start is a cold start, which always locks (`App` makes `LockPage` the root). A second-clock stamp larger than "now" (a value from before a boot, if one ever existed) is negative → **outside → the lock asks** | | locked |
| the platform has no second clock (iPhone, Mac, Windows today) | — | none | the wall rule alone = today's behaviour |
| a second clock on the platform but no twin stamp (a code path that wrote only the wall stamp) | — | missing | **outside → the lock asks** (fail closed) |

Why "both" and not "the second clock only": the wall test stays as a belt; the result can only be MORE locks than today, never
fewer (the safe side, the prompt's constraint).

**Per platform:** Android only. iPhone / Mac: no second clock in this batch — the twin is a question for the Apple phase (status
doc): (A) `clock_gettime_nsec_np(CLOCK_MONOTONIC)` by P/Invoke (on Darwin it counts sleep) · (B) keep the wall clock on Apple
for v1 and record it with the BE engineer · (C) `NSProcessInfo.systemUptime` — NOT safe (it stops in sleep). Windows: the app
does not lock on background (`locksOnBackground = false`); the idle lock (`SDesktopIdle`) has its own sleep check — untouched.

Inherited, not changed (for the record; corrected after builder-c's reading): **`ownIntentFresh` / `consumeOwnIntentSuppression`
(`App.xaml.cs:574–579`, `:620–625`, S15 O-29) is a second wall-clock path past the lock, and the second clock does NOT cover
it.** The own-intent stamp is laid when the app opens its own picker / save-as; at the pause `ownIntentFresh()` builds no pause
lock, and at the resume `ownIntentReturn` skips the lock (`!ownIntentReturn` in the resume-lock condition; `ownIntentReturn ||
withinGrace` for a held pause lock). A phone left inside the picker for hours, with the clock then set back to 0–60 s after the
stamp, returns with no lock. Same class as R1-1, inherited (the window and its negative guard exist at the base). Not built:
ruling #1825 (3) names the lock delay; a twin of `ownIntentStamp` would close it — a 🟡 proposal in DECISIONS (this batch's
block) and a question in the status doc. `lastLockPresentAt` (the Windows sweep) and `LockPage.isBlankLock` (`:181`) also read
`DateTime.Now`; both only re-present or repair a lock, neither takes one down.

## 6 · Per platform (the lock page is shared by Windows, Mac and iPhone)

| Platform | Item 1 (the hold, the pop) | Item 2 (no alert) | Item 3 (the clock) |
|---|---|---|---|
| Android | changes | changes | changes |
| iPhone | **nothing** — no lock is built deferred (`lockOnPause` is called only by `MainActivity.OnPause`); the new shell values are never sent; the shell behaves as the base with no push | changes (`NotAvailable` with no passcode; `Denied` when Face ID was refused) | nothing (no second clock: the wall rule alone) |
| Mac | nothing (as iPhone) | changes (the plugin's behaviour on Mac Catalyst is unproven — #1792 R1-3) | nothing |
| Windows | **nothing** — carrier `"0"`: the form at once; no deferred lock | **nothing** — `maybeAuthenticate` returns at `SKIP: WinUI` before the plugin | **nothing** (`locksOnBackground = false`; `SDesktopIdle` untouched) |

The walk has a Windows row that shows the lock exactly as before (the password form at once, no spinner hold).

## 7 · The log lines this batch adds (the gate's log rule: fixed words and digits)
- `[FLAGS] lockb hold=<0|1> noalert=<0|1> clock=<0|1>` — once per process, at the first read of the switches.
- `resume/pauseLock-held …` gets ` mono=<n>s` (whole seconds of the second clock; `-1` = a negative difference or a failed
  read, clamped; `-2` = no twin) only when the item-3 switch is on and the platform has the clock.
- Three error lines in `LockPage` catches: `LockPage: promptWindowOpens failed (<Type>)`, `LockPage: setAuthPending hold push
  failed (<Type>)`, `LockPage: releaseHold failed (<Type>)` — fixed words and the exception TYPE name only.
- `[LOCKDIAG] … lock/hold-released · why=<post-resume|pop-failed|other>` (review r1 fix): the hold was released with no prompt.
No other line changes.

## 8 · How it was built (the shapes the readers should know)
- `App.OnResume`: the base `withinGrace` statement is untouched; the second clock is an override that runs only when the base
  said "inside" and can only turn it to "outside" (`if (secondClock && withinGrace) { withinGrace = LockClockRules.withinGrace(…); }`)
  — "only more locks" holds by the statement's shape. A second-clock reading below 0 (`LockClockRules.FailedRead = -1` when
  the Android read throws, or a damaged value) is OUTSIDE; this also keeps `now − stamp` from overflowing.
- The twin stamps are written always (one clock read each); the switch is read only in `OnResume`.
- A deferred lock that loads after the deferral ended gets `"1"` twice (from `onLoad` and from `PROMPT`); each re-arms the 3 s
  belt — harmless.
- Inherited shell edge (builder-b, not changed): a `"False"` push BEFORE `boot()` would latch "revealed" before the hold and
  strand the form. Not reachable through C#: `sendMessage` queues pushes until the page is loaded and flushes them at
  `webViewNavigated` → `checkIfPageLoaded` (`document.readyState == "complete"`, `SpixiContentPage.cs:628–630`; corrected in
  review r1, S NIT-1); the queue is flushed only once `readyState` is `complete`, and `boot()` has run by then (the load event
  is dispatched in the same task). A `"False"` from `releaseHold` CAN be sent before the page's first load (a quick no-stop
  return, review r2 S2 NIT-2 / X2 NIT-1): it waits in that queue and is drawn after `boot()`. `'True'` / `'1'` before `boot()` do
  nothing (`holdUp` is false).
