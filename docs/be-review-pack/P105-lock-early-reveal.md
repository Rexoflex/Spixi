# P105 · THE LOCK PAGE SHOWS ITS FORM WHEN THE REVEAL ARRIVES BEFORE THE PAGE STARTED (batch fixb5, item 5)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (what the lock page SHOWS; nothing unlocks) | none | **none**: no verb, push name, push value, carrier key or carrier value; the existing push `setAuthPending` is read as before | none: a hole-closing shell fix, the old line is not kept (#1321) | 2 min |

**Look here first:** `src/shells/lock.html`, `revealLock()` (built: `Spixi/Resources/Raw/html/lock.html`). ONE guard moved: the
flag `lockRevealed` is latched only when the FORM (`.c-lock`) exists, not when `#lock-root` exists; and the dead "fail open" line
of `boot()` is deleted (with the new guard it could do nothing).

**DECISIONS:** #457 (the cold-start hold and the 3 s belt) · #1825 (1) / P97 (the "Inherited shell edge" note: a `"False"` before `boot()`
strands the form) · #1924 + #1844 (6) (the ruling: the page must show the form when the reveal arrives before it finished starting).

## What and why
`#lock-root` is static markup, so the old guard `if (!lockHost) return;` never held. A `setAuthPending("False")` that ran
before `boot()` set `lockRevealed = true` over the boot spinner; `boot()` then mounted the form, hid it (`AUTH_PENDING = "1"`) and every
later reveal and the 3 s belt returned early: the form stayed hidden for good, on a page whose back button is swallowed. Now `revealLock()`
returns without latching until `.c-lock` exists. An early reveal changes nothing; `boot()` holds the form as before and the 3 s belt (or a
later push) reveals it. Carrier `"0"`: `boot()` calls `revealLock()` after the mount, the form exists, it shows at once.
C# cannot send the push that early today (pushes queue until `readyState` is `complete`, after `boot()`; P97): this closes the edge in the shell.

## The diff (`src/shells/lock.html`)
```diff
     const lockHost = document.getElementById('lock-root');
-    // ★ AUDIT NIT-1: ... (four comment lines)
-    if (!lockHost) return;
+    const screen = lockHost && lockHost.querySelector('.c-lock');
+    // The flag is set only once the FORM exists. ... (four comment lines)
+    if (!screen) return;
     lockRevealed = true;
     lockHost.querySelector('.boot')?.remove();   // mountLockPage appends — drop the boot spinner
-    const screen = lockHost.querySelector('.c-lock');
-    if (screen) screen.hidden = false;
+    screen.hidden = false;
```
And in `boot()`, the AUTH_PENDING branch:
```diff
       holdUp = !!screen;
-      if (!screen) revealLock();                // nothing to hold: fail open
```
With the new guard `revealLock()` returns at once when `.c-lock` is missing, so the line was a no-op; `mountLockPage` always appends the
form (`src/bridge/lock-page.js:70`). No reachable state changes.
Also in this file (item 8, text only): one comment line no longer spells the token `*SL{…}`; `localizeHtml` replaces every `*SL{key}` of a line,
comments included, so the built page logged `Unknown localization key; …` at each load (our own comment; the fork-point page has no such token). No code changed by it.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The form is shown too early (the thing protected is exposed) | it is never the thing protected: unlocking needs the Spixi password (`doUnlock`); the hold only avoids a flash (#457). The only new reveal is the form shown at the 3 s belt in the case where an early reveal used to hide it for good; every other path reveals when it did, and none earlier | `b-lock` b4 (no early push: hidden at 2.9 s, shown at 3.1 s) |
| The user is stuck behind a spinner or a hidden form | an early reveal latches nothing; the belt (3 s) and every later `"False"` still reveal; carrier `"0"` reveals at once after the mount | `b-lock` b1 (carrier `"1"`), b2 (carrier `"0"`), b3 (a late `"False"`) |
| A reveal re-hides the form, or a late push re-hides it | `lockRevealed` is set only on a real reveal; `holdUp && !lockRevealed` of the push is unchanged | `b-lock` b1 (after a later `'True'` / `'1'`), b5 (an early `'1'` then `'True'` after boot: no belt is left and the form stays held — the `holdUp &&` half), the lockb pins a1–a9 |
| A new surface | no verb, push, carrier key, storage key, setting, sink, fetch or log line | `b-lock-keys` (the carriers of the page), `pins-lockb/a-shell` a9 (built = source) |

## Proof
Pins `pins-fixb5/b-lock` (jsdom on the BUILT `lock.html`, a modelled clock; limits in its first lines: no WebView, no real timer, the push is
simulated at DOMContentLoaded) and `pins-fixb5/b-lock-keys` (source / text pin) — each red on a one-edit break (the guard removed; the old comment back).
NOT proven: the real WebView ordering of the native push and the page load.
