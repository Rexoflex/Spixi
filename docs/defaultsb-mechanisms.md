# Defaults batch (`defaultsb`) — the mechanisms, read before any fix (#294)

Tree: `work/defaultsb` from `redesign/frontend` @ `14ae57f2` ("Merge pull request #16 from Rexoflex/work/photo1a").
Scope: Damir's ruling #1750 (main-chat row, `claude/talk-rulings-2026-11-18-defaults.md`). Every `file:line` below was
re-found in this tree. Method: reading the source (the cloud has no device); the walk rows of `docs/walk-defaultsb.md`
are the device proof. **The line numbers are those of the base `14ae57f2`** (the batch inserts a few lines; in the
branch the create call is `LaunchPage.xaml.cs:595`, the restore calls `:1163` / `:1241`).

## 1 · Where an account becomes real

| Path | The one place | What it writes today (Preferences) |
|---|---|---|
| Create | `Spixi/Pages/Launch/LaunchPage.xaml.cs:584` `if (Node.generateWallet(pass))` — the body runs on a worker thread; the writes start at `:594` | `:594` **Remove `lockenabled`** · `:595` Remove `walletpass` · `:602` Remove `backupReminderTimestamp` · `:613` Set `walletCreatedHere` · `:618` `WalletPassStore.write(pass)` |
| Restore — account zip | `LaunchPage.xaml.cs:1161` `applyRestorePrefs(pass)` right before `Node.loadWallet(pass)` (`:1162`), AFTER the verify (the A-13 boundary, `:1084`) | `applyRestorePrefs` (`:766`): `:768` **Remove `lockenabled`** · `:779` Set `backupReminderTimestamp` · `:784` Remove `walletCreatedHere` · `:787` `WalletPassStore.write(pass)` |
| Restore — bare wallet file | `LaunchPage.xaml.cs:1239` the same `applyRestorePrefs(pass)`, after `ws.verifyWallet` passed (`:1228`; a wrong password returns at `:1233`) | the same |
| Not a new account | `proceed(pass)` (`:1246`, the retry screen of an EXISTING wallet) · the cold start in `App()` (`Spixi/App.xaml.cs:415–440`) | nothing of the two keys |

A wrong restore password returns with `showPasswordError` (`:1061` the zip, `:1230` the file) before the A-13 boundary: `applyRestorePrefs` does not
run, so a failed restore writes nothing. **Delete account** (`Spixi/Pages/Settings/SettingsPage.xaml.cs:1670`,
`wipeEverything` `:1761`) runs `Preferences.Default.Clear()` (`:1849`; the list at `:1733–1735`): both keys go; the next create
is a create.

**So there is exactly one write site per path:** the create body (after `:594`) and `applyRestorePrefs` (after `:768`).

## 2 · Every reader of the two keys

| Key | Reader | Absent = | Writer (today) |
|---|---|---|---|
| `lockenabled` (bool) | `App.isLockEnabled()` `Spixi/App.xaml.cs:485–493` (`ContainsKey` then `Get(…, false)`); callers: the cold start `:427`, `lockOnPause` `:640`, `lockOnIdle` `:960`, the sweep `:1114`, `OnResume` `:1312`, `OnSleep` `:1410`, the spare keep `:1441`, `MainActivity.applyRecentsPrivacy` `Spixi/Platforms/Android/MainActivity.cs:560`, `SDesktopIdle` `Spixi/Platforms/Windows/SDesktopIdle.cs:161` | Off | Settings: `ixian:lock:on` (`SettingsPage.xaml.cs:1161–1171`, the field) → `saveSettingsCore` `:1402` `Set("lockenabled", lockEnabled)`; Off only after `LockPage(true)` (`HandleAuthSucceeded` `:1525`) |
| `lockenabled` | `SettingsPage.onLoad` `:348–350` (the row; `setLockEnabled` push `:352`) | Off (field default `false`) | — |
| `paymentauth` (bool, `SPayments.PAYMENT_AUTH_PREF` `Spixi/Utils/SPayments.cs:29`) | `SPayments.paymentAuthEnabled()` `:58–61` `Get(…, false)`; callers: `confirmAndAuth` `:619`, the Settings seed `SettingsPage.xaml.cs:340` | Off | Settings `ixian:paymentAuth:on` `:1191` Set true; Off only after `LockPage(true)` (`HandlePaymentAuthOffAuth` `:1544`) |
| `paymentauth` | `SPayments.paymentAuthSupported()` `:73–76` — the ROW exists only where `RuntimePlatform != WinUI` | — | — |

**Consequence (the ruling's "existing account keeps today's behaviour"):** no reader changes. An absent key still reads
Off; only the two write sites of § 1 write On, and only behind their switches. No start, update or migration path
writes either key.

## 3 · How the lock decides to show, per platform

| Moment | Android | iPhone / Mac | Windows |
|---|---|---|---|
| Cold start (a new process — also after a process death or a kill from the recents list) | `App()` `:427`: `isLockEnabled()` → `new LockPage()` is the NavigationPage ROOT. No timer, no grace: **a cold start with App lock On always locks** | same | same |
| Leaving the screen | `MainActivity` pause → `App.lockOnPause` (`:632`): stamp `backgroundedDate` (`markBackgrounded` `:152`, first edge wins), then PUSH the pause lock `new LockPage(true, true)` (`:708`) with the prompt deferred (`:715`) — the last drawn frame is the lock (#454) | `OnSleep` (`:1367`) stamps; no pause lock (the note in `OnResume` `:1290–1294`); the lock comes at the resume | `locksOnBackground = false` (`:135`): no stamp, no lock at deactivation (#505) |
| Coming back | `OnResume` `:1172`: `withinGrace = 0 ≤ sinceBackground ≤ LOCK_GRACE_SECONDS` (`:1204–1205`, `LOCK_GRACE_SECONDS = 5` `:103`). Within it → `dismissPauseLock` (no auth). Else the lock stays up, the stamp is put back (#500, `:1260`) and the prompt is released after the activity is RESUMED (`:1289` → `MainActivity.OnPostResume` → `releaseDeferredAuth` `:45`) | `OnResume` `:1312`: `locksOnBackground && isLockEnabled() && !withinGrace && …` → `presentAppLock` | the idle watcher `SDesktopIdle` (`DEFAULT_IDLE_MINUTES = 10` `:63`, key `lockIdleMinutes` `:82`) → `lockOnIdle` `:956` |

With no stamp (a resume with no pause before it) the measure falls back to `sinceUnlock` (`:1203`) — the conservative,
older measure.

**The delay change (item 2) is ONE input of ONE test:** the grace bound in `withinGrace`. It decides only WHEN the lock
comes. It is not read by the cold start, by `lockOnPause`, by the idle watcher or by `dismissPauseLock`. (Review round 1
added ONE more statement on the same switch, in `onUnlock`: R1-2 below.)
After the change, on the phone and the Mac:
- an absence ≤ 60 s → the pause lock is popped without auth (today ≤ 5 s); an absence > 60 s → the lock stays and asks;
- a negative absence (a clock set back) is still not "within" (the `≥ 0` guard stays);
- **a process death or a kill inside or after the minute** → the next open is a cold start → locks (row 1 above);
- **a renderer death** of a page under the lock changes nothing here; a blank LOCK page is repaired by the #507 watchdog
  under the lock (`LockPage.armBlankUiWatchdog` `Spixi/Pages/Launch/LockPage.xaml.cs:276`) and never unlocks;
- **a resume from the recents list with the process alive** is an ordinary resume (the rows above);
- **the #500 sequences** (a short return after a long absence, Back on the pattern prompt) stay closed: the stamp is put back
  whenever the lock stays up, so the absence keeps counting from the FIRST leaving edge; the bound grew, the rule did not;
- Windows: `withinGrace` is never reached with a lock on (`locksOnBackground = false`); 10 minutes of no input as before.

L157 holds: no path unlocks on a timer; the bound only says whether a lock that is already up needs an auth.

**Two inherited mechanisms that the longer bound makes visible (review round 1, reader S):**
- **R1-2 (fixed in round 1, same switch):** when the pause lock stays up, `OnResume` puts the stamp back (#500) and
  `onUnlock` never cleared it, so after the FIRST verified unlock of a pause lock every later return measured from the old
  stamp and asked again, however short. Invisible at 5 s; at 60 s it defeats the item. The fix: a verified unlock clears
  the stamp (`DefaultsRules.stampAfterUnlock`, only after `S16SecRules.unlockReleases`; switch `LockDelayOneMinute`, OFF =
  the stamp is kept as before). `lockOnPause` stamps before it pushes any pause lock, so no pause lock can be up without a
  stamp.
- **R1-1 (recorded, not changed — a question):** the absence is measured on the local wall clock (`DateTime.Now`). A person
  with the unlocked phone can set the time or the time zone back to 0–60 s after the stamp and open Spixi without an auth;
  each failed try puts the stamp back, so tries are unlimited; a daylight-saving fall-back does the same for an absence of
  3600–3660 s. The mechanism exists at the fork point (a 5 s window: about 12 tries per candidate minute; 60 s: one). A fix
  needs a second, sleep-counting clock (Android `SystemClock.ElapsedRealtime`; iOS `mach_continuous_time`) that must also
  be inside the bound — platform code, its own batch.

## 4 · What the lock and the payment confirm do with NO device credential (no screen lock, no fingerprint)

Plugin.Fingerprint `3.0.0-beta.1` (`Spixi/Spixi.csproj:284`). Read from its source (GitHub `smstuebe/xamarin-fingerprint`,
master @ `54807b6`, the line the beta is built from; not checked byte for byte against the package):
`FingerprintImplementationBase.AuthenticateAsync` asks `GetAvailabilityAsync(AllowAlternativeAuthentication)` first and,
when that is not `Available`, RETURNS `Status = NotAvailable` (no UI). On Android, with alternative auth allowed and no
biometric, `GetAvailabilityAsync` returns `Available` only when `KeyguardManager.IsDeviceSecure`; otherwise `NoFallback`.

| Gate | No credential on the device | Proof by reading |
|---|---|---|
| App lock (Android, iPhone, Mac) | `LockPage.maybeAuthenticate` (`LockPage.xaml.cs:370`) → `AuthenticateAsync` (`:637`, `AllowAlternativeAuthentication = true`) → `NotAvailable` → `SetResultAsync` (`:656`): not authenticated → `revealPasswordForm()` + an alert "Authentication Failed / Enter password to unlock Spixi" (`global-lock-invalidpassword-*`). The password form unlocks through `doUnlock` → `WalletStorage.verifyWallet(file, pass)` (`:485–503`) — the Spixi password, checked against the wallet file, not the stored copy | **falls back to the Spixi password, as today.** ⚠ Finding D-1 below |
| App lock (Windows) | `maybeAuthenticate` returns at `SKIP: WinUI` (`:381–388`); the form is the only way in | the Spixi password, as today |
| Confirm payments (Android, iPhone, Mac) | `confirmAndAuth` (`SPayments.cs:577`): the NATIVE confirm first (`:589–611`); Cancel / any error → not sent. Then `paymentAuthEnabled()` → `IsAvailableAsync(true)` = false → `return true` (`:631–633`): **the explicit native confirm stands** | never sent without the native confirm; never blocked for ever (the confirm always shows; no credential = the confirm alone) |
| Confirm payments, a device WITH a credential | the prompt; `result.Authenticated` decides (`:640`); a throw → `false` (`:643–646`, fail closed for this send; the next send asks again) | a cancel blocks this send only; turning the setting Off costs a `LockPage(true)` auth, which itself falls back to the Spixi password |
| Confirm payments (Windows) | no row (`paymentAuthSupported` false); `confirmAndAuth` returns after the native confirm (`:623–625`) | unchanged; the batch writes nothing here |

**Finding D-1 (inherited, made common by the new default):** on a device with no screen lock and no fingerprint, EVERY app
lock shows the alert "Authentication Failed / Enter password to unlock Spixi" before the password form, because
`SetResultAsync` treats `NotAvailable` like a failed prompt. It is not a bypass and not a lockout (the form works). With App
lock On by default, every new user on such a device sees it at each unlock. Not built (no ruling; lock code; it would
change what the lock shows). Proposal: skip the alert when `result.Status` is `NotAvailable` / `Denied` (no new text). In the
status doc as a question.

## 5 · The Android lock-screen flash (`n-20261117-android-applock-screen-cascade`)

Damir's report (walk-fixb1 row A-3, Galaxy A52s, unlock method = a PATTERN): on the return with the app lock on, "the
password screen for a moment, then the pattern screen; after the pattern, the password screen again".

Reading of the path (Android, the pause lock of § 3):
1. **At the pause** `lockOnPause` pushes `LockPage(true, true)` with `PushModalAsync(lockPage, false)` (`App.xaml.cs:727`).
   Its WebView loads `lock.html` with the carrier `LockAuthPending = "1"` (`LockPage.markAuthPending` `:53`, every
   non-WinUI page). The shell then HOLDS the form behind the boot spinner and arms **a 3-second belt that reveals the
   password form unconditionally** (`src/shells/lock.html:192–203`, `setTimeout(revealLock, 3000)` at `:198`). The prompt itself is
   deferred until the return (`deferAuthentication`, `LockPage.xaml.cs:594`).
2. **While the app is away** the WebView's timers keep running (MAUI does not pause the Android WebView's timers at an
   activity pause); after 3 s the belt fires and the Spixi PASSWORD FORM is the lock's state. Any absence longer than the
   grace (5 s today, 60 s after item 2) is longer than the belt, so on EVERY locked return the form is what is drawn.
3. **The return** draws that form (**flash 1: "the password screen for a moment"**), and only then — posted after the
   activity reached RESUMED (`App.xaml.cs:1289` → `MainActivity.OnPostResume` `Spixi/Platforms/Android/MainActivity.cs:614` → `releaseDeferredAuth` `App.xaml.cs:45`) — `maybeAuthenticate`
   calls Plugin.Fingerprint, whose device-credential fallback for a pattern is `ConfirmDeviceCredential`, a SEPARATE
   ACTIVITY (the F3 note, `App.xaml.cs:1262–1288`) — **"then the pattern screen"**.
4. **After the pattern** that activity closes and MainActivity shows its last state — the form — until
   `SetResultAsync` → `performUnlock` (`LockPage.xaml.cs:506`) → `popOwnModal` (`:565`) → `Navigation.PopModalAsync()` with
   its default ANIMATION (`:571`): the form slides away (**flash 2: "the password screen again"**).

Cause: **app behaviour, not system behaviour.** Flash 1 is the shell's 3-second belt firing while a deferred prompt waits
for the return (the belt was designed for a prompt that starts within ~0.5 s of the page load — the cold start, #457 —
not for a lock that loads at the pause and prompts minutes later). Flash 2 is the gap between the credential activity's
exit and the end of an animated modal pop.
Evidence: the source above, and the old device log of 2026-08-22 (`docs/archive/f5-verdict-2026-08-22b.md` § 1: the
prompt is released only after `resume/activity-resumed`, i.e. after the first frame of the return). The SLockDiag lines in
`ixian.log` (`pause/push-requested`, `lock/webview-onload`, `resume/deferred-auth-released`, `lock/auth-returned`) date
each step on a device; the walk sheet asks for them.

**Why this batch stops the item:** the fix of flash 1 must change the belt in `src/shells/lock.html` (the hold must last
while C# says a deferred prompt is pending, and the 3-second belt must count from the prompt's start). `src/**` and the
built html are OUT of this batch (and owned by `photo1b` while it runs). A C#-only cover over the lock is the shape the
break-my-verdict MAJOR-2 of #438 forbids ("NEVER cover a lock", `Spixi/Utils/SpixiContentPage.cs:1303–1306`). The C#-only
half (an un-animated pop of the app lock) would leave flash 1 and does not meet the done text. → A question with three
options in the status doc and Mission Control.

## 6 · Side effects of the new defaults that the ruling did not name (facts, for the record)

- **Android 13+ recents thumbnail:** with App lock On, `MainActivity.applyRecentsPrivacy` (`:552`) turns the recents
  screenshot OFF (#461). A new user's task switcher shows a blank card for Spixi. Legacy behaviour of the lock.
- **A payment prompt pauses the app:** on Android the pattern / PIN of Confirm payments is `ConfirmDeviceCredential`, a
  separate activity, so a send pauses MainActivity and `lockOnPause` pushes the pause lock under it; the return pops it
  only within the grace. Today (5 s) a slow PIN after a send meant an app-lock prompt right after the payment prompt; with
  the 1-minute delay that needs a PIN entry longer than a minute. Legacy mechanism; the delay change makes the double ask rare.
- **Short trips now pop a drawn lock:** every absence ≤ 60 s still draws the pause lock (the #454 design: the last frame is
  the lock) and pops it on the return without auth. Unchanged mechanism; it happens more often now than at 5 s.
- **Mac — the privacy shield on each click away (round 2, F-4):** on the Mac `OnSleep` fires on window deactivation and,
  with App lock On, raises the privacy shield (`App.xaml.cs` `OnSleep`, the `#if !WINDOWS` block). Every new Mac account
  now gets a covered window on each click away and an ask after 60 s away. Legacy mechanism; the Apple phase checks it.
- **Settings save writes the field (round 2, F-3, inherited):** `SettingsPage.saveSettingsCore` writes
  `lockenabled = lockEnabled` (the field), which is `false` until `onLoad` reads the key. If `onLoad` threw before that
  read, the next save would turn the lock Off with no auth. No such throw was found. With the lock On by default this would
  now turn a DEFAULT off; a later lock batch can read the key first in `onLoad`, or write it only from the lock verb.
- **First notice:** a new user is not told that App lock is on. Not built (no new text, no new screen). Proposal in the
  status doc: none needed for v1 — the first lock appears only after a minute away and asks for the password the user set
  a minute earlier; if Damir wants one, a Moment sheet of `SMoments` is the existing carrier.
