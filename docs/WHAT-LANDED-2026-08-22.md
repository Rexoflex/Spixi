# WHAT LANDED — 2026-08-22. Read this on your phone.

**Nothing is committed.** Everything is uncommitted in your working tree, with a full green pipeline.
Language rule: ASD-STE100, as you decided today.

---

## The four dials you gave me

| | |
|---|---|
| The 39 tracked tarballs (#513) | **`git rm --cached`** — your call. ⚠ NOT DONE YET, see "Owed to you" |
| ASD-STE100 | **Keep it.** Every comment and doc in this batch follows it |
| Privacy shield on Windows deactivate | **Dropped.** Gated `#if !WINDOWS`, mobile keeps its shield byte-for-byte |
| Landing on disk | **Wait for your go-ahead** — honoured until you said "do it now" |

## The pipeline

| | expected | got |
|---|---|---|
| Ixian-Core | clean at `097341a` | ✅ |
| chat pattern | triangles 224×193.988 default | ✅ |
| bundle | 275 exports | ✅ |
| shells | 18 | ✅ |
| **smoke** | BASELINE OK / the 3 KNOWN | ✅ **2691 pass** (was 2580) |
| cs-syntax | 142 clean + 1 known gap | ✅ |
| locales | ALL CLEAN | ✅ |

---

## 1. #503 IS CLOSED

Your notiflog had `[NOTIFDIAG] raw push suppressed by mute/global master **(service-extension)**`
three times. `where` is a parameter, and the whole tree has exactly two call sites that can fill it.
Only `SNotificationServiceExtension.cs:89` produces that string. **The background lane ran.** A
Samsung bundler cannot forge a string from our own call site — which is what made this different
from the false pass.

Two things stay owed, and neither blocks the close: **A2.2** (no `(foreground)` line in that
capture) and A1.1's row-count note, which moved to **#495**, the row its id keying actually tests.

⚠ **One thing nobody asked for:** that log carries **1,397 errors in 2 minutes 27 seconds**, running
to the last second — eight distinct undecryptable payloads, each re-processed about **56 times**.
A retry loop, not eight bad messages. Recorded as an observation, nothing built on it.

## 2. W-4.6 IS SOLVED — your log named it

Three idle locks in your failing session. Two logged `lock/webview-onload`. **The third did not.**

```
20:49:38.5104  warn: Preload of LockPage timed out — presenting anyway.
20:49:38.6354  lock/onPresentedInPlace · uiReady=False → SKIP: gate not ready
```

The lock was presented **with its WebView unloaded**. The dark surface painted, the HTML never
arrived, `uiReady` stayed false for two hours. That is the black screen, and it is not the privacy
shield.

And the escape hatch could not see it: eight `resume/entered` lines from your clicking, **zero**
sweep lines. It asked *"is a lock on screen?"* — one was. It never asked *"did it load?"*

**Fixed in three parts:** the blank lock now logs itself at the moment it happens; a bounded
watchdog re-issues the WebView source; and the hatch gained a clause that repairs a blank lock on a
window activation. It never refuses to present — that would leave the app unlocked.

⚠ **One link is unproven:** whether re-assigning the Source revives a dead WebView2. The log will
say. If you see three `lock/blank-repair` lines then `lock/blank-repair-spent` with no
`lock/webview-onload`, the reload is the wrong lever and the next step is the WebView2 handler.

## 3. The #46 loop found an app-lock bypass — on Windows, in this batch

Park the app on **Account → Delete account** (an authorise lock, which has a Cancel), walk away.
`lockOnIdle` refused to lock over it. On Android the resume path is the backstop — **#505 gated that
off on Windows**. So the app never locked, and one Cancel press was inside your account. At the
commit before this batch, that sequence locked.

★ **And the fix for it created the next finding**, which is exactly why the fresh reviewer exists:
with two locks now able to coexist, `LockPage` popped the **top** modal rather than itself, so a
covered authorise lock could dismiss the app lock above it with no password. `CallPage` has had the
correct guard since #399. `LockPage` never got it. Both now route through one guarded method.

## 4. A reviewer got the OneSignal source that nuget refused

`nuget.org` is 403 here, but the SDKs are open source and `raw.githubusercontent.com` answers.
Read at your pinned 6.1.9 tag, then re-verified by a second agent. Three questions that have been
open for two sessions are now answered:

* **#510's bytecode claim was right.** The park is real — and **bounded at 30 s**.
* **Both lanes can fire**, but never after a discard: `PreventDefault(true)` ends the function.
* **There is no boolean overload on the managed surface.** MAJOR-6 is **unfixable in our code**; the
  real fix is upstream. The docblock now says that instead of "go read the AAR".

## 5. Everything else in the batch

* **The notification lane discarded the SDK's row before ours existed.** A throw while posting left
  you with **no** row, and the fallback called the same method that had just thrown. It also keyed
  that fallback on `GetHashCode`, which .NET randomises per process — one stacked row per process
  life, uncancellable. Reversed, and both the fallback and the second id scheme are deleted.
* **The long-press lift was already dead under Live flow.** Two comments in the tree contradicted
  each other; the pessimistic one was right. Fixed by enforcing the precondition, not by disabling
  the lift.
* **Tap Delete twice fast and you got Tip.** Moving the sheet to z-44 put every sheet above every
  scrim, and a closing sheet stays in the DOM for 400 ms. Closed.
* **The wallet tab froze** on a long history — that pre-dates this batch and this batch doubled it.
  Now off the UI thread.
* **The sound belt** is the clip's own duration, floored at 15 s and **capped at 60 s**.
* **Four `Logging.info` calls on the sound path: NOT DONE.** See below.

## 6. ★ The pins were the weakest part of the batch

`rule()` read only the **first** matching rule, in **one** file, without stripping comments. That one
helper is why three pins were vacuous **and** why the Live-flow defect was invisible for a whole
batch. A CSS pin that reads one rule in one file cannot pin a cascade.

Rebuilt cascade-wide. Then a fresh reviewer ran **42 mutations** against the rebuild and **16 came
back green — 14 real holes**: `.c-chat-canvas { rotate: 0.5deg }` passed the entire suite, so did
`position: sticky`, `.messages`, `.u-scroll`, and **two separate defeats of the pin written to
enforce "pin the guarantee, not the shape"**. Round 2 closed all of them, ran **119 more mutations**,
and four more came back green on the first try and were closed in turn.

---

## OWED TO YOU — what did NOT land

| | |
|---|---|
| **The menu batch** | Not started. It was blocked behind the loop, and the loop found a bypass in the exact z-order and lift code the anchored dropdown would sit on. Unblocked now |
| **The dev HUD 72 px rail offset** | Not done — a one-liner, deferred with the menu batch |
| **The four `Logging.info` calls on the sound path** | Not done. Without them the idle-sound bug still cannot be diagnosed, and #294 says do not touch a trigger first |
| **The idle-sound bug** | Untouched, correctly. ⚠ But your notiflog shows an "idle" app running a hot decrypt loop — the app is not idle. That is a lead, not a diagnosis |
| **`git rm --cached` on the 39 tarballs** | Your call is taken but not executed — it is a commit, and nothing here is committed |
| **The sound-picks interview** | Still owed. You asked to be interviewed; that is conversation, not build time |
| **iOS #503** | Still gated on three Apple prerequisites and a design decision you owe (`docs/ios-nse-spec.md` §2) |
| **`maxLogCount` = 5** | Still carries its RELEASE BLOCKER marker |
| **W-3.1 pane widths** | Still no mechanism. Screenshot before/after a language pick, and which pane moves |
| **A3.1 Release configuration** | Still unconfirmed |

## THE FIRST THING TO DO TOMORROW

Build Windows, enable the app lock, and **leave the machine 11 minutes with Account → Delete
account open**. Expect an app lock **with no Cancel** on top. That is the bypass, and it is the one
finding in this batch that is a security gate.

Then watch for these lines, which are the acceptance test for W-4.6:
`lock/presented-blank` → `lock/blank-repair` → `lock/webview-onload` + `lock/blank-repaired`.
