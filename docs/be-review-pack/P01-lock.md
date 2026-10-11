# P01 · LOCK · App lock, grace window, desktop idle lock

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — the gate in front of the whole app; the wallet password rides `ixian:unlock:` | yes | shipped · F1 fixed (#1322) | 7 min |

**Look here first:** `Spixi/Pages/Launch/LockPage.xaml.cs:456` — the FIRST statement of the `ixian:change` branch asks `S16SecRules.changeLeg` (`Spixi/Utils/S16SecRules.cs:21`): only a Settings authorise lock (confirm mode, not an app lock) may Cancel; every other lock refuses the verb. The second wall: `App.onUnlock` (`Spixi/App.xaml.cs:496`) releases only on `EventArgs<bool>(true)`.

**DECISIONS:** #229 · #234 · #235 · #272 · #348 · #438 · #442 · #454 · #457 · #458 · #484 · #496 · #500 · #505 · #507 · #511 · #586 · #789 · #798 · #1293 · #1303 · #1307 · #1311 · #1322 · #1325

## What changed and why
- The pause/resume lock's Cancel unlocked with no password; both App locks are now `LockPage(true, true)` and a `setAppLock` push makes the shell show no Cancel and no hatch (#234, #458).
- Android presents the lock at pause, so the last drawn frame is the lock; an opaque shield covers resume and staging (#438, #442, #454).
- The 5 s grace runs from backgrounding (Damir's call); the first cut was a bypass, so the stamp is put back while the lock stays up (#484, #496, #500).
- Windows does not lock on window deactivation; `SDesktopIdle` locks after `lockIdleMinutes` (default 10, clamp 1 min–24 h) of input idle or a sleep gap (#505, #507, #511).
- Session 15 (Oct 2026): own-intent (picker / save) suppression 5 min → 60 s (O-29); a failed idle read fails closed, one lock per unknown streak (O-30) (#1293, #1303, #1307).
- Session 16 (F1, #1322): C# no longer depends on the shell. `ixian:change` is refused on an app lock AND on the cold-start lock: its old leg (push LaunchPage) has no sender since RESTORE-B, whose "Use a different wallet" sheet only explains the way and closes (#1311 (b), #1324). `onUnlock` ignores a false.

## Files (verified at the S16 tree)
- `Spixi/Pages/Launch/LockPage.xaml.cs:456` — the F1 refusal (fixed-word warn `:458`), before `lockClosing`; the Cancel leg `:465` is the only `authSucceeded(false)`.
- `Spixi/Pages/Launch/LockPage.xaml.cs:441` — `ixian:unlock:` anchored `StartsWith` + one `Substring` (was `Contains` + `Split[1]`, which truncated a password holding the literal) (#798).
- `Spixi/Pages/Launch/LockPage.xaml.cs:325` — `if (appLockMode)` push `setAppLock`; this is the only effect `appLockMode` has on input (#458).
- `Spixi/App.xaml.cs:1188` — `withinGrace` from one constant `LOCK_GRACE_SECONDS = 5` (`:103`) with a negative-age guard; `:1244` puts the stamp back when the lock stays up (#496, #500).
- `Spixi/App.xaml.cs:695` / `:902` — pause lock and `presentAppLock` both `new LockPage(true, true)`, after `CallPage.hideSurface()` (`:690`, `:900`) (#272, #458).
- `Spixi/Utils/S15SecRules.cs:24` — `ownIntentWithinWindow` (0 ≤ age < 60 s), read by `App.xaml.cs:569` (consume) and `:615` (peek) (#1303).
- `Spixi/Platforms/Windows/SDesktopIdle.cs:117` — a throw → `IdleUnknown`; `:160` asks `S15SecRules.idleLockDue` (`S15SecRules.cs:49`); `App.xaml.cs:135` `locksOnBackground = false` on Windows only (#507, #1303).
- `Spixi/Utils/SpixiContentPage.cs:1259` — privacy shield, never over a LockPage (`:1302`); `:1335` 8 s safety release; `:4217` in-place lock only over HomePage (#235, #438).
- `Spixi/Pages/Launch/LockPage.xaml.cs:204` — blank-lock reload (max 3 + 3), never pops or unlocks; `Spixi/Meta/SLockDiag.cs:69` log-only phase lines, no secrets (#507).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:unlock:<pass>` | `<password, URL-decoded>` | `src/shells/lock.html` → `Raw/html/lock.html`, LockPage; no peer content | `LockPage.xaml.cs:441` | reshaped parse (#798); password-over-URL is legacy L2 |
| `ixian:change` | none | lock.html → LockPage; sent only by confirm-mode Cancel (`src/bridge/lock-page.js:55`) | `LockPage.xaml.cs:450` | legacy verb; C# refuses it on every lock with no Cancel (#1322); the cold-start sender is gone (#1324) |
| push `setAppLock` | `"True"` | C# → lock.html | `LockPage.xaml.cs:326` | ours (#458) |
| push `setAuthPending` + carrier `*SL{LockAuthPending}` | `"False"` · `"0"\|"1"` | C# → lock.html | `LockPage.xaml.cs:626`, `:55` | ours (#457) |
| `ixian:lock:<on\|off>` | `<on\|off>` | `settings.html` → SettingsPage (renders peer download names) | `SettingsPage.xaml.cs:1046`; off → LockPage auth, `e.Value` read `:1415` | legacy verb; ON now echoes legacy `setLockEnabled` (#348); dead `SetLockPage` (hung off HomePage `ixian:lock`) deleted (#789) |
No lock verb is handled by `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs`.

## Threat → rule → proof
| Attacker could try… | What stops it | Proof |
|---|---|---|
| A person at an idle-locked Windows PC opens WebView2 DevTools on lock.html (on in every build, legacy, `SpixiContentPage.cs:523`) and navigates to `ixian:change` | refused first (`LockPage.xaml.cs:456`); `onUnlock` needs TRUE (`App.xaml.cs:496`) | csh `S16SecTests.change_on_an_app_lock_is_refused` · `change_cancels_only_a_settings_authorise_lock` · `unlock_releases_only_on_true`; pin `scripts/pins-s16/a-sec.mjs` F1 |
| A thief presses Home and back within 5 s, or Back on the pattern prompt, to ride the grace | stamp restored while the lock stays up (`App.xaml.cs:1244`) | smoke "★★ #500 SECURITY (audit MAJOR on #496)…"; Windows device walk §3.6/§3.7 |
| A thief leaves the phone in the app's own picker to reopen lock-free | one-shot 60 s window (`S15SecRules.cs:24`), consumed on every resume (`App.xaml.cs:568`) | csh `S15SecTests.own_intent_window_is_about_a_minute_not_five`; `pins-s15/b-native.mjs` O-29 |
| A failing `GetLastInputInfo` silences the Windows idle lock | unknown idle locks (`SDesktopIdle.cs:117`, `S15SecRules.cs:49`) | csh `idle_read_failure_fails_closed_for_every_window`, `unknown_idle_locks_once_per_streak` |
| A peer's call paints name/photo over the lock, or its teardown pops the lock | call surface hidden before every app lock (`App.xaml.cs:690`, `:900`); `popOwnModal` pops only itself (`LockPage.xaml.cs:566`) | smoke "★★ #586: no ring while OUR lock is up" |

## Given up / left open
- A script inside lock.html can still send `ixian:unlock:<guess>`: it must know the password (Windows DevTools are on in all builds, legacy).
- From-backgrounding grace: an app never away > 5 s is never re-asked; Windows has no biometric prompt, password only (#496, #505).
- A lock that fails to present leaves the app unlocked (#229 fail-open ruling); the shield drops after 8 s (#438).
- After an unknown-idle lock, more unknown reads do not relock until a read succeeds (sleep gap still locks) (#1307); MacCatalyst has no idle watcher, it keeps the mobile background lock (#507).

## Question for BE
F1 is fixed in C#: `ixian:change` is refused on every lock with no Cancel, and `App.onUnlock` releases only on true. Is this the behaviour you want, with the shell as the first wall only (yes / no)?
