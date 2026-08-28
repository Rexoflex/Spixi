# Opus #46 review brief — #507–#511. THE WORK ORDER.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

**Status: the loop is OWED and was NOT run.** #507–#511 shipped on the builder's own
self-review plus mutation testing. That is exactly the standard #46 says is insufficient, and
the batch contains **two security-gate rows**. Run this before the menu batch builds on top of
it — the menu batch layers an anchored dropdown directly onto the z-order and lift work below,
and a finding is far cheaper now than after a new presentation sits on it.

Commits: `0088a3e9` (the batch) + `8c73a95d` (docs). Verdict:
`docs/f5-verdict-2026-08-22-lock-qr.md`. DECISIONS **#507–#511**.

---

## 0. Loop protocol — the house form

1. **3 disjoint READ-ONLY auditors**, scopes in §2. Findings with `file:line`. No fixes.
2. **Verify each finding against the tree** before acting — briefs in this project have been
   wrong often enough that #297 is a named lesson.
3. **Fix agents**, disjoint file scopes, explicit cross-file contracts.
4. ★ **A FRESH break-my-verdict reviewer over the FIXES.** #258's reviewer found a MAJOR the
   fixers had missed; #250's found one; #272's found five, two of them lock-integrity bugs.
   This step is where the value is. Do not let the fixer review itself.
5. Loop 3↔4 until CLEAN. Rebuild generators and run smoke between passes.
6. Append the verdict to this file.

**Baseline to hold:** bundle **275 exports** · **18 shells** · smoke **BASELINE OK 2580 pass /
the 3 KNOWN** (#136 · M5 · B3) · cs-syntax **142** + 1 known gap · verify-locales ALL CLEAN.

⚠ **Mutate every pin you write or touch.** Five of the builder's were vacuous on the first
pass in the last session and reading found none of them: one matched text the mutation left
behind, one matched an `import` line, one matched a `lock` around a different statement.

---

## 1. ★ Where the builder is LEAST confident — start here

Stated plainly so an auditor spends its budget where the risk is, not where the diff is
largest.

1. **`App.sweepStrandedCover()` and its interaction with `presentAppLock`.** This is new
   control flow on the app-lock path — the same surface that produced #229, #234, #442, #454,
   #460, #472 and **#500, which was an app-lock BYPASS introduced by the fix before it**. The
   builder found two of his own defects here (the sweep's placement, and a window where it
   could stage a SECOND lock) which is evidence the area is slippery, not evidence it is now
   clean. **Try to break it**: can the sweep clear `isLockScreenActive` while a lock is
   genuinely up? Can `presentAppLock` be re-entered? Can a lock be dismissed without auth?
2. **The extraction itself.** `presentAppLock` is the old OnResume branch lifted out. Diff it
   against `35f58b0`'s inline version **line by line** — nothing may have been lost or
   reordered, especially `showPrivacyShield(true)` and `CallPage.hideSurface()`.
3. **`SPushService.decidePush` and its memo.** A dictionary on a push callback path, written
   from SDK threads and the foreground listener. Check the lock discipline, the 64-entry cap,
   and whether the memo can return a STALE decision for a genuinely new notification.
4. **`preventDefault(true)` vs `preventDefault()`.** The builder read the OneSignal 6.1.9
   bytecode and concluded the no-argument form parks a coroutine on a display waiter.
   **Re-verify that claim** — it is the load-bearing fact of #510 and it came from
   disassembly, not documentation.
5. **The z-band and its stacking-context precondition.** `scrim 40 < message 42 < sheet 44 <
   modal 50`. The lift works only while nothing between the row and the host creates a
   stacking context. There is a pin for it; **mutate the pin**, and check every other overlay
   that shares the band (call surface z-60, toast z-70, the takeovers at z-30).

## 2. Auditor scopes — disjoint

**Auditor A — the lock (C#).** `App.xaml.cs` (`locksOnBackground`, `markBackgrounded`,
`presentAppLock`, `lockOnIdle`, `sweepStrandedCover`, `OnResume`, `OnSleep`),
`SpixiContentPage.hasPrivacyShield`, `Platforms/Windows/SDesktopIdle.cs`, `MauiProgram.cs`.
★ Mobile must be **byte-identical in behaviour** — `locksOnBackground` is the only gate;
prove no Android/iOS path changed. Check the tick-wrap arithmetic, the negative-clock guards,
and that `static readonly` really avoids CS0162 on both branches.

**Auditor B — notifications (C# + manifest).** `SNotificationServiceExtension.cs`,
`SPushService.cs` (`decidePush`, `decidePushUncached`, `postOurPushRow`,
`handleNotificationReceived`), `AndroidManifest.xml`. ★ The `[Register]` name and the manifest
value must be the same class — a drift kills the lane silently. Check `[Preserve]` really
survives a Release linker. Trace a malformed / hostile `fa` from the payload to every place it
lands (see the security row in `docs/security-handover-gate.md`).

**Auditor C — the FE surface.** `message-menu.js/css`, `overlay.css`, `tokens.css`,
`settings-shell.js/css`, `chat-info.css`, `home.html` (the `*Done` handlers, the probe marks),
`Platforms/Android/SPlatformUtils.cs` (`playEffect` rooting + the fd hand-off + the 15 s belt).
★ Check the QR quiet-zone arithmetic independently — module size, radius, corner depth. It is
a wallet address.

## 3. ACCEPTED DIALS — do not re-litigate

* **Desktop contextual menus get NO backdrop wash** (#268, re-affirmed by Damir 2026-08-22
  after seeing it beside the mobile lift). The complaint is the `[data-dt-ctx-source]`
  highlight, not the absence of a wash.
* **The idle threshold is 10 minutes**, `lockIdleMinutes`, clamped 1 min – 24 h (Damir).
* **A short system lock deliberately does NOT lock Spixi.** While Windows is locked, Spixi is
  unreachable; only idle ≥ threshold matters.
* **`maxLogCount` is 5** with a release-blocker marker (Damir). Not a finding.
* **iOS #503 is not built**, deliberately — three Apple prerequisites and a design decision
  Damir owes (`docs/ios-nse-spec.md` §2). Not a finding.
* **Both the fd hand-off AND the player rooting ship** for #506①, even though the fd was
  probably never the cause. Deliberate: if the sound is still clipped, both hypotheses die at
  once.

## 4. Known open, NOT for this loop

W-3.1 (no mechanism found — screenshot owed) · W-5.1 (the #248/#250 WebView2 resize dial) ·
the privacy-shield posture dial · the idle-sound bug (blocked on the four log lines) ·
`ixian.0.log`.

## 5. ⚠ Specific things the builder wants challenged

* **#503 is recorded 🟡 on purpose.** A1.1–A1.4 passed but A1.5 — the `(service-extension)`
  line — was never read, and 2.1 was a FALSE PASS last round for exactly this reason. If an
  auditor can find a way the lane could pass those four symptoms WITHOUT the extension
  running, say so — that is the most valuable finding available.
* **W-4.6 did not reproduce**, so the escape hatch is UNEXERCISED code on the lock path.
  Unexercised code on that path is how #500 happened. Read it as if it has never run, because
  it has not.
* **The sweep's `presentInFlight` guard** uses a 5-second wall-clock window. Ask whether a
  slow `pushModalLoaded` can exceed it, and what happens if it does.
* **The `*Done` verbs are new pushes on a frozen bridge.** They are argument-free and mirror
  `clearChatsDone`, and they are now in the ARCHITECTURE §4 contract — but if that reasoning
  does not hold, say so.

## 6. Verdict

**RAN 2026-08-22. CLEAN after two rounds. Recorded in DECISIONS #515. Committed in
`e1237928`.**

⚠ **This section read "(append here)" until 2026-08-30, and that cost three sessions.**
Three handoffs read the empty section, concluded the loop was still owed, and copied the
row forward — while DECISIONS #515 held the answer the whole time. ★ **A verdict that is
not written back into its own brief is a verdict nobody can find.** See DECISIONS #660 for
the rule this set.

### Round 1 — three disjoint auditors, 7 MAJORs

★★ **The headline is an APP-LOCK BYPASS, and it is the #500 shape again.** `lockOnIdle`
refused to present over any `LockPage` on the ModalStack, so that a user is not asked to
authenticate twice. The settings delete flows create `new LockPage(true)` — a justConfirm
lock that has a **Cancel**. On Android the resume branch is the backstop, and **#505 gated
that branch behind `locksOnBackground`, which is `false` on Windows**, so the backstop was
gone. Park the app on an authorise lock, walk away for hours, press Cancel, and you are
inside the account.

★★ **The notification lane called `PreventDefault(true)` BEFORE the row existed.** The
extension discarded the SDK's row and posted ours second, so a throw inside
`showLocalNotification` left the user with **no row at all** — and the "fallback" called
the method that had just thrown. It also keyed that fallback on `fa.GetHashCode()`, a
second id scheme that .NET randomises per process, so it stacked one row per process life
and `cancelNotification` could never reach it. Reversed: post first, discard only on
success. The fallback and the second id scheme are deleted.

★★ **The front end: the lift's precondition was already broken in the tree, and two
comments said so in opposite directions.** `message-menu.css` asserted `.c-chat-canvas` has
`z-index: auto`; `chat-flow.css:17` deliberately set `z-index: 0` and its own comment said
it creates a stacking context. The second was right, so under Live flow the lifted row
could never clear the scrim. Fixed by enforcing the precondition, not by disabling the lift.

Also round 1: a sheet at z-44 sat above **every** scrim, including one mounted later, and
`dismissOverlay` leaves the sheet in the DOM for up to 400 ms with no `pointer-events`
guard — tap Delete, tap again quickly, and the second tap lands on **Tip**.

### Round 2 — the fresh break-my-verdict reviewers, 7 more MAJORs

★ **And the fix for the bypass created the next finding, which is exactly why the fresh
reviewer exists.** With two locks now able to coexist, `LockPage`'s two close legs popped
the **TOP** modal rather than themselves, so a covered authorise lock could dismiss the app
lock above it **with no password**. `CallPage.hideSurface` has carried the correct guard,
and a comment explaining this exact hazard, since #399; `LockPage` never got it. Both legs
route through **`popOwnModal`** now (`LockPage.xaml.cs:558`), which tests
`ModalStack.LastOrDefault() == this`.

★ **A third, found the same way.** `isLockStaging()` read `activePreload` only, while
`pushModalLoaded` sets `preloadPending` a dispatcher turn earlier — so the ONE guard the
bypass fix deliberately kept was blind for that whole turn. Closed with a lock-scoped stamp
bounded at 5 s, which fixes `CallPage.lockUp` at the shared predicate for free.

★★ **A reviewer got the artifact this batch said it could not get.** `nuget.org` answers
403, but the OneSignal SDKs are open source and `raw.githubusercontent.com` answers. Read
at the pinned 6.1.9 tag and re-verified by a second agent, which settled the 30 s callback
budget, the single `processNotificationData` driver, and the `PreventDefault()` overload
question at source instead of by inference.

⚠ **Round 1 made one thing worse and round 2 undid it.** A 5 s `Monitor.TryEnter` was added
in front of `fetchPushMessages` — `1 + N` blocking HTTP calls on an `HttpClient` with no
`Timeout` — spending a sixth of the SDK's budget waiting. The wait is **0** now: take the
lock if it is free, else skip. The lock moved to `Node.cs`, because the contended pair was
never two push callbacks; it is the push lane against `Node.mainLoop`.

★★ **The pins were the weakest part of the batch, and that is the finding worth keeping.**
`rule()` read only the FIRST matching rule, in ONE nominated file, without stripping
comments. That single helper is why three pins were vacuous **and** why the Live-flow MAJOR
was invisible for a whole batch: **a CSS pin that reads one rule in one file cannot pin a
cascade.** It is a cascade-aware `rulesFor` set now, over every stylesheet the shell links.

### Stated residuals

* **`Ixian-Core/Streaming/OfflinePushMessages.cs:118`** creates an `HttpClient` with **no
  `Timeout`** and blocks on `.Result` at `:121` and `:186`. One line closes the last of the
  two-rows path. Ixian-Core is frozen at `097341a`; not touched. **BE-owned.**
* **#503 stays 🟡 on purpose.** A1.5 — the `(service-extension)` log line — was never read.
* Most of round 1's MAJOR-7 fix is **dead code**, kept as labelled insurance rather than
  disguised as a guarantee.
