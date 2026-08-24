# Opus #46 loop — Batch W · ROUND 2 (break-my-verdict over the round-1 FIXES)

**Scope.** The round-1 fixes recorded in DECISIONS #538, read as suspects. One question per
fix: *does it break another path?* Tree = the uncommitted delta on `42e72109`, **untouched**
(`git diff --stat` = 65 files / 1543 insertions / 448 deletions at entry and at exit).

**Method.** Every MAJOR and MINOR below was EXECUTED, not reasoned:
- six throwaway jsdom probes driving the live components out of `src/demo/wallet.html`
  (`/tmp/probe`, never in the repo);
- a full scratch twin of the repo under `/tmp/w2` (`node_modules` symlinked) for the pin
  mutations — **eight mutation runs of the whole suite**, each one restoring the twin first;
- `node scripts/smoke-test.mjs /tmp/w2` on the unmutated twin → `BASELINE OK — 2897 pass /
  the 3 KNOWN pre-existers`;
- `cs-syntax-check` 143 ✓ + 1 known skip · `i18n-lint` ✓ · `verify-locales` ALL CLEAN ·
  `pseudo-locale-smoke` 9/9 · `extract-strings --check` 0 conflicts · no NUL byte in any
  bundle or built shell;
- a rebuild of the bundle, the strings IIFE and all 18 shells **inside the twin**, then
  `diff -rq` against the working tree: **byte-identical**. The committed artifacts are current.

---

## Findings

| # | Sev | file:line | Failing scenario (executed) | Fix |
|---|---|---|---|---|
| **R2-1** | **MAJOR** | `src/shells/home.html:2223` · `src/shells/chat.html:2727` vs `chat.html:2801` and `Spixi/Utils/SPayments.cs:38-49` | **The r1 B-2 fix was applied to ONE of the two callers, and the compose is now the odd one out: at 30 s it declares a live payment failed, and a payment that then succeeds is reported to the user as a failure.** B-2 said the 30 s backstop re-arms Confirm while the native dialog is still open, and named the compose as the same shape (":2712-2718"). The pay-request path went to **125 000 ms**; both compose paths are still **30 000 ms**, against a C# latch that self-heals at **120 000 ms**. Walk it: the user taps Confirm → `handleSignSend` takes `acquireConfirm()` and awaits `confirmAndAuth` (a native alert **plus**, on mobile, a biometric prompt). At t=30 s the shell fires `c.fail('No response from the app…')`, sets `walletSendCtrl = null` and re-arms Confirm. The user now confirms the dialog. C# signs, broadcasts, pushes `signSendResult('ok')` → `walletSendCtrl` is null → `dbg('signSendResult (no pending review)')`, **dropped**: the sheet keeps the failure text, the takeover stays open, no pending row appears, and the money is gone. If the user takes the invitation and presses Confirm before the first call returns, `acquireConfirm` refuses and the sheet shows the generic "The payment could not be sent. Please try again." **over a live confirm dialog** — B-2's exact symptom, still shipping. A press after the first call completes acquires the latch and signs a **second real transaction**. A slow broadcast reaches the same place with no slow user at all. | Raise both compose backstops above the C# self-heal (the value the pay path already uses), or stop re-arming Confirm on the backstop: keep it latched, switch the copy to "Still waiting — check the confirmation dialog", leave Cancel as the exit. Whichever is chosen, the two money paths must carry the SAME number, in one named constant. |
| **R2-2** | **MAJOR** | `src/components/wallet-send.js:565` (`safeUnits`), used at `:568`, `:569`, `:726`, `:731`, `:738` | **The guard written for r1 m2/m7 does not gate — it COERCES. A non-numeric fee becomes a real number on the confirm step and ARMS Confirm.** `safeUnits` returns `null` only when `toUnits` **throws**, and `sanitizeAmount` never throws: it strips every non-`[0-9.]` character. Measured on the live component (probe `p5.mjs`, both the constructor arg and the `setQuote` bridge-echo path): `fee:'abc'` → **"Fee 0 IXI · Total 10 IXI", Confirm ENABLED** · `fee:'NaN'` → same · `fee:'1e3'` → **13 IXI** · `fee:'-1'` → **1 IXI** · `quote fee:'9e9'` → **99 IXI**. Before the fix these THREW (that was m2's defect — the sheet stranded on "Calculating…"); the fix replaced a strand with a fabricated number beside an armed "Confirm & send", which is the exact inverse of the M1 rationale sitting six lines above it and of the brief's standing rule *"No invented fee (W6, #523)"*. **Reachability, stated plainly:** the shipped C# pushes `Node.calculateTransactionFee(...).ToString()` (invariant `IxiNumber`), so no live push produces this today, and the native confirm still shows C#'s own numbers. This is a defect in the guard, on the money surface, not a live break. | `safeUnits` must **reject** rather than sanitize: `const s = String(v == null ? '' : v).trim(); return /^\d+(\.\d+)?$/.test(s) ? toUnits(s) : null;`. A null fee then falls into the honest pending / `quoteFailed()` state the batch already built. Add a pin that feeds `'abc'` and asserts `confirm.disabled === true`. |
| **R2-3** | MINOR | `src/components/wallet-send.js:512` + `:529-530`, against `src/components/overlay.js:156-170` | **The M4 one-sheet slot makes Review a DEAD TAP for up to ~400 ms after every Cancel / Esc / back.** `state.review` is cleared only inside `onCancel`, and `onDismiss` runs from `overlay.js remove()` — after `transitionend` or the 400 ms fallback. REPRODUCED (probe `p2/p3`): Cancel the sheet, tap Review 20 ms later → **no new sheet opens**; the only `.c-sendreview` in the DOM is the dying one, and 500 ms later there are **zero**. The user sees the sheet finish leaving, believes their tap did it, and has to tap Review again. `openAddressSheet` has the same shape one screen away (`wallet-receive.js:417-418`): inside the removal window `addrSheetLive.isConnected` is still true, so "Show my address" **returns the dying element** and opens nothing — reproduced identically. No pin covers focus or re-open after a dismiss. | Clear the slot at dismissal time, not at removal time: null `state.review` in the Cancel handler and in `close()` as well as in `onDismiss`; for the address sheet, treat an element that is no longer on the overlay stack as gone. |
| **R2-4** | MINOR | `src/components/contact-row.js:60` · `wallet-send.js:499-500` | **The r1 m4 rule was carried only into checkbox rows, and its own stated reason ("Send keeps them pickable only if an addressless contact can even be paid — it cannot, so block there too") was not applied.** `blocked` is gated on `select === 'checkbox'`, so a contact with no `address` is a normal pickable Send row. Two consequences, both reproduced. (a) **Quote flow (production):** picking it emits `ixian:feeQuery:undefined:5`; C# answers `error:'address'` with the echo `"undefined"`; `matchesRecipient` compares that string against `state.recipient.address` (`undefined`) → **false**, so the rejection is DROPPED and the compose sits on "Calculating network fee…" for ever with no error and no exit but ✕. That is the wedge class the previous loop closed for mistyped addresses. (b) **Static-fee flow (demos / "legacy integrations"):** Review ARMS, the review sheet renders `Amount 5 IXI` under a **blank** address line, and Confirm hands out `{"name":"No Address"}` with no address at all. Not reachable from the shipped roster (C# `addContact` always carries an address), which is why it is a MINOR. | Block address-less rows in both forms (`const blocked = !c.address || (select === 'checkbox' && c.pending);`), and make `matchesRecipient` compare `String(state.recipient.address)` so a stringified echo can never silently miss. |
| **R2-5** | MINOR | `scripts/smoke-test.mjs:13891-13910` (`GATE_PURE`) | **The r1 G-3 fix moved the blind spot out of a heuristic and into a list that states a falsehood.** The list is documented as *"exports of CSS-owning modules that build NO DOM"*, and the gate exempts everything in it from any stylesheet requirement. At least **17 entries create DOM**, verified by reading their function bodies: `settingsConfirm` (builds a whole `createModal` + warn strip + icon), `settingsOptionSheet`, `settingsThemeSheet`, `passwordField`, `addReactions` (calls `createBadge`), `wrapChatRowSwipe`, `setDownloads`, `setDevLog`, `setDiscoverFeed`, `setBackupStatus`, `setMessageStatus`, `setComposerContext`, `setComposerCost`, `setScrollLatestCount`, `enterChatSelect`, `setChatInfoPresence`, `setLoading`. So a shell that destructures ONLY one of them gets **no** requirement at all — G-3's hole, reopened for a named set. **No live miss today:** I ran the full requirement for every PURE-listed DOM export across all 18 shells; the single unlinked family is `chat.html → chatlist-item`, which is already a documented ALLOW entry. The guarantee holds by luck, not by construction. | Rename the property the list asserts — it is "adds no NEW css family", not "builds no DOM" — and compute it: an entry qualifies only when every family it reaches is already required by a DOMISH export the same shell destructures. Otherwise it needs its own `need` entry like any other export. |
| **R2-6** | MINOR | `scripts/smoke-test.mjs:13845-13851` (`reaches`) | **The companion derivation is ONE module hop, and neither DECISIONS #536 nor the gate header says so.** `reaches(b, fn)` walks local functions transitively but never follows an imported DOM symbol into the imported module's own body, so `shell → A.createX → B.createY → C.createZ` requires `A.css` and `B.css` and never `C.css`. The r1 report's own reasoning (B-5c: "the transitive dependency that WAS the W-a root cause") is about exactly this shape. I implemented the full closure and diffed it against the shipped gate over all 18 shells: **one extra candidate, and it is a false positive** — `downloads.html → avatar.css` via `createSettingsDownloads → createTopbar → createAvatar`, where `topbar.js:44` only builds the avatar for `variant === 'chat'` and `settings-app.js:97` passes `'view'`. So there is no live miss; the depth limit is undocumented, and the next 2-hop render will be invisible. | Either take the closure (≈15 lines, and it needs an ALLOW entry for the topbar variant), or state the one-hop limit in the gate header AND in #536, so the doc does not promise more than the code checks. |
| **R2-7** | MINOR | `scripts/smoke-test.mjs:14189` (the ★★ M1 pin) | **The batch's headline money pin cannot fail on a single mutation.** The behaviour is guarded twice — `setQuote` returns early at `wallet-send.js:729` and `render()` returns early at `:679` — and the pin drives the state only through `setQuote`. PROVEN in the twin, both directions, full-suite runs: delete `:729` alone → **M1 pin PASSES**; delete `:679` alone → **M1 pin PASSES**. Only deleting both turns it red. The redundancy is fine; a pin that survives the removal of either half of what it certifies is not. (Control: the M2, M3, M4 and M5 pins are honest — I mutated each guard and each pin went red for its own mutation, 4 for 4.) | Drive the pin through both doors: assert `render()` itself is inert while `sending` (call it via a path that bypasses `setQuote`, e.g. a late `quoteFailed`/`setQuote` after a forced `sending`), or split it into two assertions, one per guard. |
| n1 | NIT | `src/components/wallet-send.js:739` | A quote that lands after `fail(msg)` **wipes the failure message**: `if (f !== null) { …; if (!overShown) clearErr(); }` clears an error `fail()` wrote, not only the insufficient one `render()` wrote. Reproduced (`p1` step B3: "The payment could not be sent." → `""`, hidden). Not reachable in the shipped wiring — the sheet asks exactly one quote and C# answers one per ask — but the flag tracks only ONE of the two writers of that node. Track the writer (`errSource = 'over' \| 'fail'`) instead of a single boolean. |
| n2 | NIT | `src/components/contact-row.js:11` | r1 D-1 was corrected in `DECISIONS.md:642` (28 → 16) and left in the source: the component docblock still says *"28 smoke pins key on `.c-contacts__row`"*. The real count today is **15**. The number is the stated rationale for #537, so it should read the same in both places. |
| n3 | NIT | `DECISIONS.md` #538 | The row records *"Baseline 2867 → **2898**"*. The unmutated tree prints **2897 pass / the 3 KNOWN pre-existers**. One off; worth correcting before commit, because the next session compares against this figure. |
| n4 | NIT | `src/components/contact-row.js:75` | A blocked **address-less** row shows an EMPTY sub-line, so the fix's own contract ("a row that cannot be a target is DISABLED and says why on its sub-line") is met for pending rows and not for the F2 half the rule is named after: `contactSubLine` sees a nick, so it returns `truncateAddressMiddle(undefined)` = `''`. Reproduced (probe `p4` B1). **Inherited, not introduced** — `contacts-shell.js:143-146` computes `blockedReason` as `''` for the same case and falls through identically, so the W-j parity claim holds. Worth one shared line of copy when the directory gets it. |
| n5 | NIT | `src/shells/home.html:2063` | The Send takeover got the M4 teardown hook (`_closeReview`); the **Receive** takeover's `close()` is still a bare `over.remove()`, so a programmatic close orphans an open `openAddressSheet` over the wallet home (reproduced in the demo, `p6` m9a: sheet + scrim survive the topbar Back). Today every reachable path is blocked by the sheet's own scrim — the comment at `home.html:941` relies on exactly that — so it is not live; it is one call site away from being live, and unlike Send there is no hook to call. |
| n6 | NIT | `src/components/wallet-send.js:542-556` (the `openPaymentReview` docblock) | r1 m7 asked for the RAW-decimal contract to be stated the way `createWalletSend`'s NB contract is. The sanitation landed; the contract line did not. It matters because the sanitizer is not neutral: `amount: '1.234,00'` (a de-DE grouped 1234) renders **"1.234 IXI"** — a 1000× under-read on a confirm step. Blocked upstream today by `canSheet`'s `/^\d+(\.\d+)?$/` at `chat.html:1868`, i.e. by one caller, one level up. |
| n7 | NIT | `src/components/wallet-send.js:715-718` | `onQuote(...)` is called **before** `ctrl` exists (it is assigned at `:720`). A shell that answers a quote synchronously would call `setQuote` on an undefined controller. Every shipped caller answers through `bridge.send`, so it is latent. Arm the timer and call `onQuote` after the controller is built. |
| n8 | NIT | `src/components/wallet-send.js:516-518` | `openSendReview` does not thread `balance`, so `balU` is null on the compose path and the r1 M2 retraction branch is **dead code there** — the insufficient state can only ever appear on the chat W-d path. Harmless (the compose's own `valid()` already gates on balance, and C# re-checks), but the fix is only exercised on one of its two callers. |

---

## VERIFIED CLEAN — what I tried to break and could not

**★ The mandate's most important check passes.** `ExtendedAddress.Validate(string)`
(`Ixian-Core/Address/ExtendedAddress.cs:241-252`) constructs through the **string ctor**, which
splits on `'_'` at `:105-111` and validates the extended data's checksum at `:122`. It therefore
**accepts the extended `X_Y` form**, so `HomePage.quickScanForSend` (`:1388-1412`) lets a Spixi
receive QR (`<base58>_<ext>:ixi`) through to `quickScanResult` and W-e is **not** undone by the
r1 B-4 validation gate. The encode/decode checksum asymmetry at `:233` vs `:122` is only
apparent — `sha3_512sqTrunc(input, offset=0, count=0, …)` defaults `count` to the whole buffer
(`Crypto/CryptoLib.cs:466`). `displaySpixiAlert` is root-routed and main-thread-marshalled
(`Spixi/Utils/SpixiContentPage.cs`), so the invalid-QR alert cannot be lost the way #531's bare
`DisplayAlert` was.

**The r1 M5 / M3 / M2 / M4 fixes hold under execution.** fail → retry Confirm → done runs the
SECOND attempt correctly and fires `onDone` exactly once (`failedAttempt === my` rejects the
retired attempt, not the new one, because `my` is a fresh `++attempt`). `done(); done()` fires
`onDone` once. `fail(); done()` keeps the error and never morphs to "Sent". A throwing
`onConfirm` shows the default failure copy, re-enables Cancel, un-latches Confirm, leaves
`isSending() === false`, and `dismissTopOverlay()` then closes the sheet — every exit restored.
A throwing `onSend` on the compose clears `state.sending`, so Review re-opens.

**`quoteDead` recovers.** A 40 ms quote timeout renders `["2 IXI","—","—"]` + "The network fee
could not be estimated"; a late real quote then restores `["2 IXI","0.3 IXI","2.3 IXI"]`, hides
the error and arms Confirm. An `error:'address'` answer leaves the fee row at "—", never frozen
on "Calculating…".

**`state.sending` does not stick.** The only path that force-closes a sheet mid-flight is
`el._closeReview()`, and both call sites (`home.html:2184`, `chat.html:2679`) destroy the compose
in the same breath. `el._closeReview()` after `done()` is a no-op: `onDone` nulls `state.review`
before the shell's `onDone` runs.

**The W-d id latch is exact.** `SingleChatPage.onPayRequest` (`:503-519`) forwards the shell's own
`msg_id` string verbatim and `SPayments.handlePayRequest` echoes that same `msgIdHex` on all
eight result pushes, so `String(id) === chatPayId` can only match the card that asked. The
`gone` status is handled in BOTH branches, `payRequestGone` and `feeUnavailable` are extracted
in `en-us.json` and drafted in all 7 visible-locale drafts, and the no-sheet branch calls
`renderLog()` **before** the toast, so the Pay `oneShot` latch is released either way.

**A-2's 1:1 fence is complete, including bots.** `setChatMode` types are 0=1:1, 1=group,
2=blind group, **3=bot** (`chat.html:800-803`), so `mode.type === 0` excludes a bot chat — it
matches C#'s `friend.bot || friend.type == Group` guard exactly, and a group/bot request card
falls to the direct verb → `gone` → an honest toast.

**W-f's `_` normalisation is safe.** Base58 excludes `_` (`Ixian-Core/Utils/Base58CheckEncoding.cs:28`),
so the split cannot cut a payment address. A hostile QR of the form `<contact-base58>_<attacker-ext>`
matches the contact, but `setSendRecipient` picks the **roster** record, so the attacker's
extension is discarded. `X_Y:send:2.5` seeds the amount (`wallet-send.js:792-796`), and a HIT
composes against the **bare** roster address — which `SPayments.handleSignSend:200-206` re-flags
`OfflineTag` for a friend, exactly as the shell comment claims.

**The gate and the fence are mutation-honest for their own defects.** Four mutations in the
scratch twin, full-suite runs: drop `search-field.css` from `settings.html` →
`settings.html → search-field.css (createSettingsDownloads→settings-app)` reported · remove one
`GATE_PURE` entry → `unclassified: topbar.setTopbarSub` reported · empty the `app_new` ALLOW
list → `app_new.html → apps-discover.css` reported · append a later
`.c-contacts__row { min-height: 60px; … }` to `contacts-shell.css` → the **W-j drift fence goes
red** (G-7 closed: it now reads the effective value across every rule in every file). The gate
self-test runs the real `shellCssGate` on a synthetic shell in a temp dir, so G-1/G-4 are closed
too. The r1 G-2 live miss is fixed at `settings.html:53`, and `chat.html:110` picked up
`txlist-item.css`.

**Other r1 fixes confirmed at source.** m5: the receive roster cap is `328px` (5 × 64 rows) ·
m8: `:root[data-desktop] .c-addr-sheet { max-height: calc(76vh - 92px) }` now binds before the
dialog's own `76%` · A-3: `contact-row.css:79` carries the `prefers-reduced-motion` companion ·
n2: the duplicate `:disabled { opacity: .6 }` is gone from `wallet-receive.css` · I-1: the
orphan `pendingContact` is gone from all 12 drafts · m4/m10: address-less **and** pending rows
are disabled in checkbox form, `aria-checked` forced false, click handler withheld, and
`syncCta()` still runs after the loop, so the count line and the CTA cannot disagree · W-g:
`SPayments.paymentAuthSupported()` is now the single predicate for the cap and the seed (B-1's
availability residual is documented at `SPayments.cs:61-70` rather than gated — a stated
ruling, not a silent one).

**The demo path works end to end.** Hero Send → pick → amount `12` → Review armed → sheet shows
`["12 IXI","0.00001 IXI","12.00001 IXI"]` with the **full** address (#99) → Confirm → the mock
`ctrl.done()` → "Sent" morph → sheet closes → the wallet home returns with the fresh pending row
`Baracuda / Pending / -12`.

**Pipeline integrity.** Bundle 285 exports (1 030 189 B), 18 shells, and every built artifact in
`Spixi/Resources/Raw/html` is **byte-identical** to a fresh rebuild — nothing stale, and
`build-shells.mjs all` no longer touches the legacy `apps.html` / `wallet_send.html`. No NUL
byte anywhere. No new `localStorage`, `fetch(`, `innerHTML` or log line in the delta.

---

**VERDICT: 2 MAJOR · 5 MINOR · 8 NIT.** The round-1 fixes are sound where they were applied;
both MAJORs are fixes applied to **one of two symmetrical callers** (R2-1) or a guard that
sanitizes where it was asked to gate (R2-2). R2-1 is the one that can cost a user money and
should not ship as it stands.
