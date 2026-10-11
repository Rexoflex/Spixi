# P01 · LOCK · App lock, grace window, desktop idle lock

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — the gate in front of the whole app; the wallet password rides `ixian:unlock:` | yes | shipped | 7 min |

**Look here first:** `Spixi/Pages/Launch/LockPage.xaml.cs:459` — `ixian:change` on a confirm-style (`justConfirm`) lock still fires `authSucceeded(false)` and closes the lock with NO `appLockMode` check, and `App.onUnlock` (`Spixi/App.xaml.cs:463`) ignores the bool; the #234 close is only the shell not drawing Cancel.

**DECISIONS:** #229 · #234 · #235 · #272 · #348 · #438 · #442 · #454 · #457 · #458 · #484 · #496 · #500 · #505 · #507 · #511 · #586 · #789 · #798 · #1293 · #1303 · #1307

## What changed and why
- The pause/resume lock's Cancel unlocked with no password; both App locks are now `LockPage(true, true)` and a `setAppLock` push makes the shell show no Cancel and no hatch (#234, #458).
- Android presents the lock at pause, so the last drawn frame is the lock; an opaque shield covers resume and staging (#438, #442, #454).
- The 5 s grace runs from backgrounding (Damir's call); the first cut was a bypass, so the stamp is put back while the lock stays up (#484, #496, #500).
- Windows does not lock on window deactivation; `SDesktopIdle` locks after `lockIdleMinutes` (default 10, clamp 1 min–24 h) of input idle or a sleep gap (#505, #507, #511).
- Session 15 (Oct 2026): own-intent (picker / save) suppression 5 min → 60 s (O-29); a failed idle read fails closed, one lock per unknown streak (O-30) (#1293, #1303, #1307).

## Files (verified at 387ca78b)
- `Spixi/Pages/Launch/LockPage.xaml.cs:440` — `ixian:unlock:` anchored `StartsWith` + one `Substring` (was `Contains` + `Split[1]`, which truncated a password holding the literal) (#798).
- `Spixi/Pages/Launch/LockPage.xaml.cs:324` — `if (appLockMode)` push `setAppLock`; this is the only effect `appLockMode` has on input (#458).
- `Spixi/App.xaml.cs:1150` — `withinGrace` from one constant `LOCK_GRACE_SECONDS = 5` (`:103`) with a negative-age guard; `:1206` puts the stamp back when the lock stays up (#496, #500).
- `Spixi/App.xaml.cs:658` / `:864` — pause lock and `presentAppLock` both `new LockPage(true, true)`, after `CallPage.hideSurface()` (`:653`, `:862`) (#272, #458).
- `Spixi/Utils/S15SecRules.cs:24` — `ownIntentWithinWindow` (0 ≤ age < 60 s), read by `App.xaml.cs:533` (consume) and `:579` (peek) (#1303).
- `Spixi/Platforms/Windows/SDesktopIdle.cs:117` — a throw → `IdleUnknown`; `:160` asks `S15SecRules.idleLockDue` (`S15SecRules.cs:49`); `App.xaml.cs:135` `locksOnBackground = false` on Windows only (#507, #1303).
- `Spixi/Utils/SpixiContentPage.cs:1253` — privacy shield, never over a LockPage (`:1296`); `:1329` 8 s safety release; `:4199` in-place lock only over HomePage (#235, #438).
- `Spixi/Pages/Launch/LockPage.xaml.cs:203` — blank-lock reload (max 3 + 3), never pops or unlocks; `Spixi/Meta/SLockDiag.cs:69` log-only phase lines, no secrets (#507).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:unlock:<pass>` | `<password, URL-decoded>` | `src/shells/lock.html` → `Raw/html/lock.html`, LockPage; no peer content | `LockPage.xaml.cs:440` | reshaped parse (#798); password-over-URL is legacy L2 |
| `ixian:change` | none | lock.html → LockPage | `LockPage.xaml.cs:449` | legacy, C# unchanged; shell stops emitting it in `'locked'` mode (#458) |
| push `setAppLock` | `"True"` | C# → lock.html | `LockPage.xaml.cs:325` | ours (#458) |
| push `setAuthPending` + carrier `*SL{LockAuthPending}` | `"False"` · `"0"\|"1"` | C# → lock.html | `LockPage.xaml.cs:625`, `:54` | ours (#457) |
| `ixian:lock:<on\|off>` | `<on\|off>` | `settings.html` → SettingsPage (renders peer download names) | `SettingsPage.xaml.cs:1031`; off → LockPage auth, `e.Value` read `:1400` | legacy verb; ON now echoes legacy `setLockEnabled` (#348); dead `SetLockPage` (hung off HomePage `ixian:lock`) deleted (#789) |
No lock verb is handled by `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs`.

## Threat → rule → proof
| Attacker could try… | What stops it | Proof |
|---|---|---|
| A person at an idle-locked Windows PC opens WebView2 DevTools on lock.html (on in every build, legacy, `SpixiContentPage.cs:523`) and navigates to `ixian:change` | nothing in C# — `LockPage.xaml.cs:459` → `App.xaml.cs:463` unlocks | smoke "★ #234: 'locked' mode offers NEITHER exit" pins the SHELL only; no proof for C# |
| A thief presses Home and back within 5 s, or Back on the pattern prompt, to ride the grace | stamp restored while the lock stays up (`App.xaml.cs:1206`) | smoke "★★ #500 SECURITY (audit MAJOR on #496)…"; Windows device walk §3.6/§3.7 |
| A thief leaves the phone in the app's own picker to reopen lock-free | one-shot 60 s window (`S15SecRules.cs:24`), consumed on every resume (`App.xaml.cs:532`) | csh `S15SecTests.own_intent_window_is_about_a_minute_not_five`; `pins-s15/b-native.mjs` O-29 |
| A failing `GetLastInputInfo` silences the Windows idle lock | unknown idle locks (`SDesktopIdle.cs:117`, `S15SecRules.cs:49`) | csh `idle_read_failure_fails_closed_for_every_window`, `unknown_idle_locks_once_per_streak` |
| A peer's call paints name/photo over the lock, or its teardown pops the lock | call surface hidden before every app lock (`App.xaml.cs:653`, `:862`); `popOwnModal` pops only itself (`LockPage.xaml.cs:565`) | smoke "★★ #586: no ring while OUR lock is up" |

## Given up / left open
- #234 is closed in the shell only (#458): C# still unlocks on `ixian:change` from an app lock — reachable only by script inside lock.html (no peer content; Windows DevTools are on in all builds, legacy).
- From-backgrounding grace: an app never away > 5 s is never re-asked; Windows has no biometric prompt, password only (#496, #505).
- A lock that fails to present leaves the app unlocked (#229 fail-open ruling); the shield drops after 8 s (#438).
- After an unknown-idle lock, more unknown reads do not relock until a read succeeds (sleep gap still locks) (#1307); MacCatalyst has no idle watcher, it keeps the mobile background lock (#507).

## Question for BE
Should `LockPage` refuse `ixian:change` when `appLockMode` is set, and `App.onUnlock` release only on `e.Value == true`, so the app lock does not depend on the shell?
