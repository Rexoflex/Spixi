# P97 · THE ANDROID PAUSE LOCK HOLDS ITS PASSWORD FORM UNTIL THE PROMPT, AND POPS WITH NO ANIMATION (batch lockb, item 1)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW–MEDIUM (what the lock page SHOWS while a prompt waits; nothing unlocks) | none | **none**: two values of the EXISTING push `setAuthPending` that every shell already ignores (`'True'`, `'1'`); no new verb, push name, carrier key or carrier value | `LockbFlags.HoldWhileDeferred` (`flagLockHoldWhileDeferred`, absent = ON; a stored 0 acts only in dev mode); OFF = no push, the animated pop | 6 min |

**Look here first:** `Spixi/Utils/LockShellRules.cs` R1–R3 (pure, run by csh `LockShellTests`) and their four call sites in
`Spixi/Pages/Launch/LockPage.xaml.cs`: `onLoad` (R1, after `if (authAttempted) revealPasswordForm();`), the `PROMPT` branch of
`maybeAuthenticate` (R2), `promptWindowOpens()` (new, public), `popOwnModal` (R3: `PopModalAsync(false)` for the pause lock
only). Five calls in `Spixi/App.xaml.cs`: `OnResume`, the lock-stays-up branch, `#if ANDROID`: `held.promptWindowOpens();` directly
before `pendingForegroundAuth = held;` · `releaseDeferredAuth`: `releaseHold("post-resume")` when no prompt was handed over and a
pause lock is up · `dismissPauseLock`'s pop-failed catch: `releaseHold("pop-failed")` · `lockOnPause`'s "did not present" handler and
its catch: `releaseHold("not-presented")`. A release acts only while the prompt is still deferred (R5
`releaseHoldWithoutPrompt(on, builtDeferred, authDeferred)`); its log word is one of `post-resume`, `pop-failed`,
`not-presented`, `other`. The shell: `src/shells/lock.html` `window.setAuthPending` (a kept belt timer id).

**DECISIONS:** #457 (the cold-start hold + the 3 s belt) · #460 / F3 (the deferred prompt, released from `OnPostResume`) ·
#1795 (the mechanism of the flash) · #1825 (1) (Damir: option A) · this batch #1916.

## What changes
- The pause lock (built by `App.lockOnPause` at the Android PAUSE, prompting at the RETURN) loads with the carrier
  `LockAuthPending = "1"` as before. At `onLoad`, while the prompt is deferred, C# sends `setAuthPending("True")`: the shell
  keeps the form hidden and stops its 3 s belt. When `OnResume` decides that the lock stays up, C# sends `"1"`: the hold
  continues and the belt runs 3 s from now. `"False"` (the prompt resolved without an unlock) reveals as before.
- A successful prompt pops the pause lock with `PopModalAsync(false)` (as `dismissPauseLock` already does).
- Every other lock (the cold start, the iPhone / Mac resume lock, the Windows idle lock, the Settings authorise locks) gets no
  new push and the animated pop.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The user is stuck behind a spinner with no way in | `"True"` only while `authDeferred` (before the return). A return after a STOP: `OnResume` sends `"1"` directly (the belt runs). A return with NO stop (a permission dialog; MAUI raises `Application.OnResume` only from `OnRestart`) or a throw in `OnResume` before the hand-off: `App.releaseDeferredAuth` (the `OnPostResume` edge, every return) finds no handed prompt and calls `LockPage.releaseHold("post-resume")` → the form. A failed dismiss pop: `releaseHold("pop-failed")`. A pause lock that did not present (`lockOnPause`'s handler or catch): `releaseHold("not-presented")`. A later load / reload gets `"1"` (never `"True"`) once the window opened or the hold was released. After any reveal both values change nothing (review round 1, S / B MAJOR-1) | csh `r1_truth_table_32`; pin `pins-lockb/a-shell` a1–a8 (jsdom, a fake clock); render `a-shell-render.mjs` (Chromium: geometry of both states) |
| A lock is hidden or comes down | the push only changes what the PAGE shows; the lock page stays on the stack; `doUnlock` / the prompt / `onUnlock` unchanged; #438 MAJOR-2: no cover over the lock | pin `b-csharp` b4, b7 (the rest of `LockPage.xaml.cs` = the base by SHA-256) |
| An older shell breaks | `'True'` / `'1'` are in the base shell's ignore list (`return`) | the base text of `lock.html`; pin a7 |
| A new bridge surface | no new verb / push / carrier | pin `b-csharp` b5 (the sets of `ixian:` verbs and command names = the base) |

**Known:** the belt counts from the prompt's start (#1795 (A)): a pattern drawn more slowly than 3 s leaves the form under the
prompt; the un-animated pop makes that last a frame. Inherited shell edge (not changed): a `"False"` push before `boot()` would
strand the form — not reachable through C# (pushes are queued until the page is loaded and flushed at `webViewNavigated` once `readyState` is `complete`, after `boot()`; a `releaseHold` `"False"` sent earlier waits in that queue). ⚠ C# UNCOMPILED: `LockPage.xaml.cs`, `App.xaml.cs`.
