# P84 · A MINI-APP ACTION BEFORE `ixian:onload` IS REFUSED "NOT READY"; THE TWO CATCHES LOG THE COMMAND NAME ONLY (batch fixb3, item 1)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (fewer bytes reach the log; an action that crashed now stops earlier) | none: the guard returns before the handler, so nothing is signed, stored or sent | none: no verb, push name, cap, `spixi.*` key or pref; the existing `SpixiAppSdk.ar` reply gets one new error word `not ready`; 3 log lines change text (fixed words only) | built, NO switch (a hole-closing fix, #1321) · ⚠ C# UNCOMPILED (`MiniAppPage.xaml.cs`; `FixB3Rules.cs` runs in the harness) | 5 min |

**Look here first:** the first statement of `MiniAppPage.handleAction` and its two `catch` blocks
(`Spixi/Pages/MiniApps/MiniAppPage.xaml.cs`); `Spixi/Utils/FixB3Rules.cs`.

**DECISIONS:** #1744 (4) (Damir, a main-chat row) · #1321 · #1478 · this batch: #1810.

## What changed and why
- **Before:** `miniAppActionHandler` is set only in `onLoad` (`ixian:onload`). An `ixian:action` / `xa:` action before it hit a
  null field; the catch wrote `Logging.error("Exception while processing Mini App action '{0}': {1}", action, e)` — the WHOLE
  action text and the whole exception (message + stack) — into the log that the Developer page shows and shares with one tap.
  The response catch wrote the whole exception of the POST to the mini-app-supplied `responseUrl`.
- **Now:** (1) `FixB3Rules.refuseBeforeOnload(miniAppActionHandler != null, peek, sendActionRejected)`: no handler → ONE warn
  `MiniAppPage: an action before ixian:onload was refused (<name>)`, the existing reply `sendActionRejected(c, id, "not
  ready")` (it answers only `getStorage` / `setStorage` / `sendPayment`), return. No dialog, no exception, no call into the
  handler or the storage; `peek` (the same `JsonConvert` call) and the reply are each inside a try. (2) the outer catch:
  `MiniAppPage: a mini-app action failed (<name>, <ExceptionType>)`; the response catch: `MiniAppPage: the answer of a mini-app
  action was not sent (<name>, <ExceptionType>)`.
- `<name>` = one of the eleven `MiniAppCommands` values from a fixed list (the list's own string), else `unknown`.
  `<ExceptionType>` = `e.GetType().Name` only if it is a plain ASCII identifier of 1–64 characters, else `Exception`.
- **No switch:** the old path IS the leak (#1321); #1478 adds no flag duty.

## Recorded, not changed (legacy, at the fork point `0e85a4b8`; P61 (6))
- The outer catch still sends `e.Message` back to the SAME mini app (`sendActionRejected(…, e.Message)`) and shows the error
  alert `app-action-error-processing` with the action text on the user's own screen. Neither is the log; both are legacy.
- `handleAction` is `async void` with no in-flight latch; actions sign before the confirm (P61 (1)–(7)).
- The not-ready reply echoes the action's own `id` to the same mini app (as every other reply does).
- (#46 r3 S n-6) Two log sinks beside this path log a whole exception: `MiniAppStorage.cs` (the storage thread; an IO text can
  name `AppsStorage/<app id>/<table>`, the table limited to `[A-Za-z0-9_-]`) and `Utils.sendUiCommand`'s catch (`Utils.cs:303`),
  which the not-ready reply uses like every push. Not in this delta.
- (#46 r3 S n-7) A refused action writes one fixed line per action, with no limit (the base wrote a longer, mini-app-chosen line
  and an alert per action). A once-per-page latch is a later option.

## Proof
csh `FixB3GuardTests` (9 tests: ready / not ready; 20 hostile peeks — 100 000 characters, a 64-hex value, "seed: …", CR LF,
NUL, ESC, U+2028 / U+2029 / U+202E, JSON-like text, other case, padded, empty, null — each line equals one of the 12 fixed lines
and holds no byte of the input; a throwing peek and reply; the type word; + 1 test (#46 r1 S M-1): hostile text OUTSIDE the
Message — a 2-level InnerException chain, an AggregateException of hostile inner exceptions, Source / HelpLink / Data["k"], a
thrown exception with a stack trace — each catch line is still EXACTLY the fixed line) · pin `scripts/pins-fixb3/a-miniapp-guard.mjs` k1 the
name list = `MiniAppCommands`, k2 the guard is the first statement, k3 no log call in `handleAction` takes the action, `e`,
`.Message`, `.ToString()` or an interpolation, k4 the rest of `handleAction` = the base, k5 the rest of the file = the base,
k6 `FixB3Rules.cs` WHOLE (SHA-256 of its comment-stripped, whitespace-collapsed code; an edit re-bases after a look at its diff)
+ ≥ 9 `[TestMethod]`s in `FixB3GuardTests.cs`, k7 (#46 r2 S n-5) every `Logging.` call in `Spixi/MiniApps/MiniAppActionHandler.cs`
(the callee k3 cannot see; today two `Logging.warn("<fixed text>")`) takes only plain string literals (their limits are in the pin) · re-based: `pins-fixb2/d-pay-confirm` (three hashes; its APP-ON keys unchanged), inline smoke
gate 18 (`LEGACY_G3`: the catch's entry `<no literal>`) · walk rows W-BUILD / W-3 (the Safety walk test app has no onload, so
every action it sends is "before onload").
