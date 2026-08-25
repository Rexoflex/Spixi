# Opus #46 loop — VERDICT: the F5 fix batch (#553–#556) + Batch E (#557) + F5-6 (#558)

Fresh break-my-verdict re-review of the FIX ROUND. I did not build and I did not audit
round 1. Method: re-derive every fix from source, mutate three of the new/rebased pins,
rebuild the generated artifacts and diff, then run the gates.

Tree: `redesign/frontend`, uncommitted on `0acd5ada`. Ixian-Core read-only at the frozen
sibling. The only file I wrote is this one; the working tree is byte-identical to how I
found it (§5).

---

## VERDICT: **FAIL** — 2 MAJOR · 6 MINOR · 6 NIT

The loop's mechanical work is good: **C-1 · C-3 · C-5 mutation-verified RED by me**,
generated artifacts in sync, cs-syntax 144 ✓, i18n-lint ✓, pseudo 9/9, smoke
**3028 pass / the 3 KNOWN pre-existers (#136 · M5 · B3)** — the builder's claims there
all hold.

It fails on two findings, and both are the same failure shape the loop is supposed to
catch: **a fix whose comment and whose pin say it works, while the runtime value it
depends on is never what the code reads.**

- **R-1** — E-1's safe-area clamp reads `--safe-top` with `parseFloat` over a
  `max(env(), var())` **token stream**. It is `NaN` on every engine, so `safeTop` is
  always `0`, `minTop` is always `8`, and E-1's worked example — the quick-react row
  under the Dynamic Island — reproduces unchanged. The bottom limit was never
  implemented at all. **This repo already learned this lesson**: `home.html:566`
  `probeMeasure()` exists precisely because `--safe-top` cannot be read directly.
- **R-2** — A-1's new predicate is right about "answered" and wrong about "declined":
  a locally DECLINED incoming call now posts a **"Missed call"** row into the tray, at
  the moment the user dismissed it. Introduced by this fix round, on a common path, and
  against the doctrine written four lines above it in the same file.

Neither is fixed here (re-reviewer rule). Both are one-block changes.

---

## 1. Findings

| ID | Sev | file:line | Claim | Evidence | Fix |
|---|---|---|---|---|---|
| **R-1** | **MAJOR** | `src/components/desktop-anchors.js:127-131` · pin `scripts/smoke-test.mjs:14856-14858` | **E-1 is NOT fixed. The safe-area floor is inert on every platform — `safeTop` is always 0, so `minTop` is always `M_GAP` (8), the pre-fix value.** The bottom half of E-1 was not implemented at all. | `--safe-top` is declared as `max(env(safe-area-inset-top, 0px), var(--android-inset-top, 0px))` (`src/styles/base.css:31`). It is an **unregistered custom property**: its computed value is the token stream with `var()`/`env()` substituted, never an evaluated length — no engine resolves `max()` for it. So `getComputedStyle(document.documentElement).getPropertyValue('--safe-top')` returns `max(59px, 0px)` (or the raw declaration), and `parseFloat` of anything starting with `m` is **NaN** → `\|\| 0` → `safeTop = Math.max(0, 0 - fr.top) = 0`. Measured in-repo: jsdom returns `max(env(safe-area-inset-top,0px),var(--android-inset-top,0px))`, `parseFloat` → NaN, both with and without `--android-inset-top` set. ★ **The repo's own code is the proof**: `src/shells/home.html:566` `probeMeasure(expr)` applies the expression to a probe element's `padding-top` and reads back the computed `paddingTop` — that helper exists for exactly this reason, and `home.html:588` uses it on `var(--safe-top)`. Contrast `--kb-inset`, which IS read numerically elsewhere because JS writes it as a plain `'<n>px'` (`chat.html:4970`). **Consequence, E-1's own worked example, unchanged:** iPhone 15 (inset-top 59), message menu ≈253px, row at `rr.top = 270` → `above = 270 − 8 − 253 = 9`; `9 >= minTop(8)` is TRUE → `top: 9px` → the quick-react row renders at y=9…61, under the status bar / Dynamic Island. With a working `safeTop` (59) `minTop` is 67, the above-branch fails and the menu goes BELOW. **Bottom half:** the JS clamp still bottoms at `fr.height - h - M_GAP` (`:145`) — `safeBottom` is never read, and the `[data-m-anchor]` rule's flat `padding: 8 12 12` (overlay.css:227) out-specifies `.c-sheet`'s `padding-bottom: calc(16px + env(safe-area-inset-bottom))` (overlay.css:37), so a clamped menu ends 8px from the physical bottom edge — ~26px of its last row under the home indicator. The CSS `max-height` bounds the HEIGHT, not the POSITION, so it cannot substitute. **The pin cannot see any of this**: `:14856` asserts the presence of the string `--safe-top` and the literal `const minTop = safeTop + M_GAP;`. Both are true with `safeTop === 0`. (r1 N-9 already recorded that jsdom's zero-size rects mean `anchorSheetToRow` returns at its `!fr.width` guard on every run — that is why this shipped green.) | Read the resolved value, not the token stream — the house helper already exists. One probe per call (or once, cached, re-read on `resize`): `const p = document.createElement('div'); p.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;padding-top:var(--safe-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)'; document.body.append(p); const cs = getComputedStyle(p); const safeTop = parseFloat(cs.paddingTop) \|\| 0, safeBottom = parseFloat(cs.paddingBottom) \|\| 0; p.remove();` Then `minTop = Math.max(0, safeTop - fr.top) + gap` and `bottomLimit = fr.height - safeBottom - gap` in BOTH the below-overflow test and the clamp. ★ And make the pin behavioural: stub `getBoundingClientRect`/`offsetHeight` on a fixture (the #520 ResizeObserver precedent) and assert `top` against a non-zero inset — a source-shape pin cannot distinguish 0 from 59. |
| **R-2** | **MAJOR** | `Spixi/VoIP/VoIPManager.cs:222-223` (predicate) · `:426-444` (`rejectCall`) | **A-1's predicate fixed the missed call and broke the DECLINED call: declining an incoming call now posts a "Missed call" notification.** Introduced by this fix round — the old OR-of-three cancelled it. | Flag semantics, re-derived on both roles: outgoing `initiateCall` sets `accepted=true, calleeAccepted=false, initiator=true` (`:56-59`); incoming `onReceivedCall` sets `calleeAccepted=true, accepted=false, initiator=false` (`:92-95`); `acceptCall` sets `accepted=true` (`:394`); `onAcceptedCall` sets `calleeAccepted=true` (`:419`). So `answeredCall = accepted && calleeAccepted` is correct on **both** roles — that half of A-1 is sound. Full shape matrix: incoming-answered → cancel ✓ · incoming-timed-out → re-post ✓ (the fix's point) · outgoing (answered / unanswered / cancelled / peer-rejected) → `initiator` → cancel ✓ · C18b stale paths → `hangupCall` returns before `endVoIPSession` ✓ · **incoming-DECLINED → `rejectCall` sets no flag, calls `endVoIPSession` at `:443` with `accepted=false, calleeAccepted=true, initiator=false` → `answeredCall` false, `initiator` false → the ELSE branch → `SPushService.showLocalNotification(callNotifId, …, "notification-missed-call", …)` at `:225-233`.** The row exists to be replaced: `Node.fireLocalNotification` posts the "Incoming call" row whenever `App.isInForeground == false \|\| Utils.getChatPage(friend) == null` (`Meta/Node.cs:945`) — true for a call arriving while the user is on the chats list, which is the ordinary case. So: user taps Decline in the ring overlay → a tray row appears saying "Missed call". False statement, appearing at the moment of dismissal. ★ It also contradicts the doctrine written directly above the predicate (`:204-206`): *"Only when the call was NOT answered. `acceptCall` cancels instead: once you are talking, there is nothing left to tell you."* A decline is the same class — the user saw it and acted. (The codec-unsupported `rejectCall` at `:110` is fine: nothing was announced and the call genuinely was not taken.) | A one-field latch, symmetric with `currentCallInitiator`: set `currentCallDeclinedLocally = true` in `rejectCall` before `endVoIPSession()`, add it to the cancel predicate (`if (answeredCall \|\| currentCallInitiator \|\| currentCallDeclinedLocally)`), and reset it in the `:305-313` block beside `currentCallInitiator` (A-8's rule). ⚠ Do NOT close F5-1 on "the row appears" without also declining a call and checking that no row appears. 🟡 If Damir wants a record of declined calls, that is a different row with different copy ("Declined call") — a product call, not this predicate. |
| **R-3** | MINOR | `Spixi/App.xaml.cs:1399` · `Spixi/Pages/Settings/SettingsPage.xaml.cs:1083` (`wipeEverything`) | The A-3 `Node.startCounter == 0` guard is **inert on the post-wipe in-process launch flow** — the one path the codebase already names as the F-3 suspect. | `startCounter` is a **process-lifetime** counter (`Meta/Node.cs:39`, incremented at `:225`, never reset; `Node.stop()` does not touch it, and `HomePage:1737` reads it as a run counter). `wipeEverything` clears `IxianHandler.wallets` and calls `IxianHandler.shutdown()` but leaves `startCounter` at its pre-wipe value, then `goToWelcome()` continues **in the same process**. A user who deletes their account and then restores/creates one passes guard 1 the moment `Node.loadWallet()` returns and passes guard 2 unconditionally — i.e. the `loadWallet → HomePage.Node.start()` window that A-3 raised is open again, and `SettingsPage.xaml.cs:1062` already records that this exact in-process sequence is the F-3/N68 suspect ("the next in-process `Node.start()` (LaunchPage → HomePage ctor)"). The first-boot flow IS closed, which is the logged trigger — this is the residue, narrower but on the path with the loudest history. The fix's own comment states the boundary as *"has started at least once this process-life"*; that sentence is exactly the assumption that fails after a wipe. | Either reset `Node.startCounter = 0` inside `wipeEverything` next to `IxianHandler.wallets.Clear()` (one line, and it makes the run counter honest too), or take A-3's original proposal — an explicit `launchFlowOwnsNode` flag set where the launch flow stops the node and cleared by whoever starts it. |
| **R-4** | MINOR | `Spixi/Network/StreamProcessor.cs:743-747` · `:791-795` · `:844-848` | The A-2 reshape **lost the exception log** the calling path provided. A throw inside the deferred VoIP handling is now an unobserved Task exception: silent, no line in `ixian.log`. | The synchronous handler path is wrapped: `receiveData`'s `try { switch (spixi_message.type) … }` / `catch (Exception e) { Logging.error("Exception occured in StreamProcessor.receiveData: " + e); }` (`:228` / `:540-543`). The three new `Task.Run(() => { VoIPManager.onAcceptedCall/onRejectedCall/onHangupCall(…); UIHelpers.refreshAppRequests = true; })` bodies have no try/catch, no `await`, no continuation — .NET does not crash on an unobserved Task exception, it discards it. `endVoIPSession` fences its audio disposal and its notification write, but the message block at `:276-297` is unfenced (`currentCallContact.endCall(…)`, `tmp_messages.Last()`, `UIHelpers.insertMessage`). A throw there already skipped the field-reset block at `:305-313` — that consequence is **pre-existing** — but until this batch it at least produced a log line. In a batch whose other half exists solely to make an unlogged crash logged, losing a log line is the wrong direction. | Wrap each `Task.Run` body: `try { … } catch (Exception e) { Logging.error("F5-1 deferred VoIP handling threw: " + e); }`. (The #503 rule — "a push callback must never throw" — is the same reasoning one lane over.) |
| **R-5** | MINOR | `src/strings/en-us.js` · `src/strings/draft/*.json` (12) · `src/demo/strings.iife.js` · the 18 built shells | **The i18n pipeline was left mid-run for F5-6.** `maxNeedsRecipient` exists in 12 draft JSONs and NOWHERE else, so the hint ships the inline English fallback in **every** locale and the 12 drafts are inert. | Measured: `grep -c maxNeedsRecipient` → `src/strings/en-us.js` 0 · `src/strings/de-de.js` 0 · `src/demo/strings.iife.js` 0 · `Spixi/Resources/Raw/html/settings.html` 0 · `Raw/html/index.html` 0. `node scripts/extract-strings.mjs --check` reports **771 keys**, while the committed `en-us.js` holds **770** and `docs/i18n-strings.md:1004` still summarises **770** — the extract ran for the settings.html edit (the `addressInfoSafety` kind flip is in the diff) and was not re-run after F5-6 landed. Shells build `window.SL` from the dictionary, so a key absent from the dictionary can never reach them. This is the #314 / #288-MAJOR-2 class again ("i18n gaps = missing DRAFTS" / "the launch drop-ins shipped a 664-key dictionary"). ⚠ Note the knock-on: the artifacts are byte-in-sync **only because** the strings pipeline was not run — running it changes `en-us.js`, `i18n-strings.md`, 12 locale `.js`/`.json`, `strings.iife.js` and all 18 shells. | Run the full order before commit: `extract-strings` → `build-locales` → `build-strings-iife` → `build-demo-bundle` → `build-shells` → lint + pseudo + smoke. Expect 770 → 771 and a shell rewrite. |
| **R-6** | MINOR | `DECISIONS.md:657-661` | **No DECISIONS row for #558**, and two of the five rows now describe code the fix round changed. CLAUDE.md's hard rule is "every significant decision gets a row when it's made". | The file ends at **#557**; `#558` appears only in code comments (`wallet-send.js:211`) and a smoke message (`:14898`). F5-6 was an explicit non-negotiable in the brief ("an OPEN dial — not in scope"); Damir answering mid-session outranks the brief, but the answer is a decision and it has no row. Stale rows: **#554** states *"The no-session mini-app fall-through moved into the same deferred block"* — the A-2 fix moved it back OUT, so the row now says the opposite of the code; **#553** does not mention the `startCounter` guard; **#556** does not mention E-5's restored `addrfield` inset. A reader of DECISIONS is currently misinformed about `StreamProcessor`. | Add #558 (F5-6 option B, Damir 2026-08-25). Amend #553/#554/#556 in place with the r2 shape — superseded text marked, never deleted (the house rule). |
| **R-7** | MINOR | `docs/` (absent) · `src/styles/components/wallet-send.css:39-45` · `DECISIONS.md` #556 | **E-2's adjudication cites a carrier that does not exist.** The fix summary says the flat picker was *"carried to the F5 checklist as an explicit eyeball item with a one-rule revert path"*. There is no Batch-E F5 checklist, and no checklist was created or modified in this batch. | `git status docs/` shows only `i18n-strings.md`, `security-handover-gate.md`, `security-review-for-be-engineer.md` modified plus the four untracked review files. `grep -rn "Batch E" docs/f5-checklist-*.md` returns one line, in the 08-24 overnight checklist, saying Batch E was not started. Neither the CSS comment nor DECISIONS #556 records the revert path or the objection. **On the substance** the adjudication is defensible — Damir's words ("a straight contacts list") do read as flat, and a design dial is his — but the auditor's two measurable points are unrecorded and unanswered: (a) the Contacts **directory** list is still a card (`contacts-shell.css:86-93`, the five declarations that were deleted here), so the three surfaces now disagree 2-flat-to-1-card; (b) dropping the card removes only **4px** of side inset, while the likely source of "extra paddings on the side" is `.c-wallet-send { padding: var(--spacing-16) }` (`wallet-send.css:24`), untouched — so the change may not answer the complaint at all. | Write the checklist item the summary claims exists, with both numbers in it (card 4 + row 8 + section 16 = 28px to the avatar, vs the directory's stack), so Damir's eyeball decides against a measurement rather than against a memory. Record the revert as one rule in the CSS comment. |
| **R-8** | MINOR (verify-first, #294) | `Spixi/Pages/Contacts/ContactDetails.xaml.cs:360-365` | The posted **"first async nav turn drained"** marker may execute **INLINE**, bracketing nothing — and then it actively lies, printing "drained" for an async turn that never ran. This is A-4's finding recurring inside A-4's fix. | The `Navigating` handler runs on the **main thread**. Some MAUI/Essentials builds implement `MainThread.BeginInvokeOnMainThread` as `if (IsMainThread) action(); else PlatformBeginInvokeOnMainThread(action);` — under that implementation the lambda runs synchronously at the call site, i.e. immediately after `[CRASHDIAG] leave: teardown dispatched`, and the pending navigation work still has not started. A reviewer reading the log would conclude the first async turn completed and exonerate the path — exactly what A-4 warned about. I have **no MAUI toolchain here to settle which implementation ships** (no `Microsoft.Maui.Essentials` source or assembly in the container), so per #294 this is flagged, not asserted. ⚠ The same uncertainty sits under A-2 and was not resolved in round 1 either; there it fails safe (both posts come from a non-main stream thread — auditor A verified that), here it does not. | Use `Dispatcher.Dispatch(...)` (the page's `IDispatcher`), which posts unconditionally, or drop the marker and say in the checklist that "teardown dispatched" is the last line the diagnostic can honestly claim. Either way, one line in the F5 checklist: what the presence of the drained marker does and does not prove. |
| N-a | NIT | `docs/security-handover-gate.md:553` | The gate row counts **"7 breadcrumbs"**; the tree has **11** (ContactDetails 5 incl. the posted marker · HomePage 3 · SingleChatPage 3 — A-6 added the third path after the row was written). | Count in the diff. | Update the number. The verdict (fixed text + booleans + the fixed `ok/left/blocked/fail` vocabulary) is unchanged and remains correct. |
| N-b | NIT | `src/styles/components/overlay.css:206` | E-4 was closed with its first half only: the SELECTED row now gets **no** ctx-source feedback at all. Right-clicking the open conversation is visually indistinguishable from not right-clicking it. | `:root[data-desktop] [data-dt-ctx-source]:not([aria-current])` — the selected row keeps its tonal and gains nothing. E-4's proposal was "add `:not([aria-current])` **and give the selected case its own one-step-deeper tonal**". | A second rule for `[data-dt-ctx-source][aria-current]` at one step deeper, or accept and say so in the comment. |
| N-c | NIT | `src/components/settings-shell.js:619` · `src/shells/settings.html:849` | The **two doors** to `openAddressSheet` pass different options: the hub row passes the raw `host` and an `onShare` adapter; `onAddressInfo` passes `document.body` and `isDesktop ? undefined : shareAddress`. In the demo (`host: phone`) one door renders inside the phone frame and the other outside. | Both call sites in the diff; C-9's `hostFor()` NIT was not taken. | `host: hostFor()` on the row and the same host on the handler. Production is unaffected (both resolve to `document.body`). |
| N-d | NIT | `scripts/smoke-test.mjs:14203-14207` | C-1's cascade-wide floor covers `.c-addr-sheet__qrcard` only. The **same node** also carries `.c-wallet-receive__qrcard` (`wallet-receive.js:436`), whose own `width` (`wallet-receive.css:15`) has **no** floor pin — so the wallet Receive screen's card is unguarded. | The addr card is protected from that rule by source order alone (receive rule at :13, addr rule at :180). | Extend `rulesFor` to both selectors, or add the receive card's own floor pin. |
| N-e | NIT | `src/strings/draft/*.json` (12) | All 12 drafts lost their trailing newline (`\ No newline at end of file` on every one). | The diff. | Restore it, or let the next generator run normalise — but then it churns 12 files in an unrelated batch. |
| N-f | NIT | `src/styles/components/overlay.css:230` | `overscroll-behavior: contain` (E-1's proposal) was not taken on `[data-m-anchor]`. | Harmless today — `[data-overlay-open] { overflow: hidden }` leaves nothing to chain into. | One declaration, cheap insurance if the body lock ever changes. |

---

## 2. Round-1 → fix-round disposition

Every A- / E- / C- finding, with my agreement or objection.

### Auditor A (C#)

| # | Sev | Disposition | My call |
|---|---|---|---|
| A-1 | MAJOR | **Fixed** — `bool answeredCall = accepted && calleeAccepted; if (answeredCall \|\| initiator)` | **Agree on the mechanism, OBJECT on completeness.** The predicate is correct on both roles (matrix re-derived, §1 R-2). It introduced **R-2**: a locally declined call now posts "Missed call". |
| A-2 | MINOR | **Fixed** — deferral carries only the VoIP re-check; the mini-app fall-through runs synchronously on the calling thread; handling hops back off the UI thread with `Task.Run` | **Agree** on the reshape. Double-handling re-checked and impossible (the sync `hasSession` fast path returns first; a `spixi.voip` request creates no `MiniAppPage`, and session ids are GUIDs). `Task.Run` is safe on all three platforms and restores the original non-UI thread context. Two riders: **R-4** (lost exception log) and a stated-but-unrecorded ordering residual — `Task.Run` un-orders the WORK the main-thread hop ordered, so two deferred VoIP legs in one fetched batch can execute out of order. Both orders converge today (every handler re-guards on `hasSession`), but the comment claims ordering it no longer provides for the work itself. |
| A-3 | MINOR | **Fixed** — `if (Node.startCounter == 0) return;` | **Agree for the first-boot flow, OBJECT for the post-wipe flow → R-3.** Legitimate callers re-checked and none break: Windows `OnWindowCreated`, iOS `OnActivated`, Android `OnResume` after process death, a second Windows window — all either run with `status == warmUp` (initial, `Ixian-Core/Meta/IxianNode.cs:131`, so the restart branch never ran anyway) or with `startCounter > 0`. The #545 wipe→welcome→background→resume path is covered by guard 1. Only wipe→**re-create/restore in the same process** slips. |
| A-4 | MINOR | **Fixed** — "dispatched" wording + a posted drained marker | **Agree on the wording; the marker is conditional → R-8.** |
| A-5 | MINOR | **Fixed** — one sync flush per path | **Agree.** ContactDetails 1, HomePage 1, SingleChatPage 1, plus one inside the posted marker and one inside the crash hook. The ANR shape is gone. |
| A-6 | NIT | **Fixed** — SingleChatPage leave path bracketed | **Agree.** Order-pinned by C-5's rewritten pin. |
| A-7 | NIT | **Fixed** — both sentences corrected (managed-frames limit named; the `status` string described as the fixed vocabulary) | **Agree.** The `args.Exception` verbatim reach stays accepted with its retirement condition, correctly. One count slipped → N-a. |
| A-8 | NIT | **Fixed** — `currentCallInitiator = false` in the reset block | **Agree.** Now load-bearing, since A-1's predicate reads it. |
| A-9 | NIT | **Fixed** — comment states the catch-all and where the crumbs earn their keep | **Agree.** |

### Auditor B (components / CSS)

| # | Sev | Disposition | My call |
|---|---|---|---|
| P-1 | MAJOR | **Resolved** — no mutation artifacts in the tree | **Agree.** Verified: `wallet-send.css` and `wallet-receive.css` carry no `AUDITC-MUTATION` block, and the fixes they masked are live (`padding: 0` on the QR card; no card chrome on the picker list). |
| E-1 | MAJOR | Claimed fixed — CSS `max-height` + JS `minTop` | **OBJECT — NOT FIXED → R-1.** The CSS half is real and correct. The JS half is a no-op, and the bottom limit does not exist. |
| E-2 | MAJOR | **Not reverted** — adjudicated to Damir's words | **Adjudication defensible, carrier missing → R-7.** Damir's literal wording does support flat and a design dial is his call, so I do not re-litigate the choice. But the claimed F5-checklist item does not exist, and the auditor's two measurable objections are recorded nowhere. |
| E-3 | MINOR | **Accepted residual** — no chats-row lift (#506② stacking-context risk) | **PARTIAL OBJECTION.** The stated reason rejects only ONE of the two fixes the auditor offered. The second — scope `--surface-scrim-deep` to the surfaces that lift — is pure CSS and carries no stacking risk whatever, and it is not mentioned. As shipped, the one long-press surface with no lift is the one whose ground got darker: chats-row text 3.69→2.60 (light) and 3.38→2.43 (dark), on the row the menu now points at. 🟡 Damir's dial (b) was argued from the lifted case; say so, or scope it. |
| E-4 | MINOR | **Fixed** — `:not([aria-current])` | **Agree**, with N-b (second half not taken). Verified the tag lands on `.c-chatlist-item`, which is the node carrying `aria-current` in the split view. |
| E-5 | MINOR | **Fixed** — `padding: 0 var(--spacing-8) var(--spacing-8)` restored | **Agree.** Aligns the revealed input with the flat `c-contact-row` 8px inset. |
| E-6 | MINOR | **Accepted residual, stated in the docblock** | **Agree.** The wording is honest — the action model is captured, only the affordance goes stale. ⚠ One phrase overreaches: *"the overlay dismisses on every route out"* is true of routes and not of a list re-render, which is the case E-6 is about. |
| E-7 | MINOR | **Accepted residual, stated** | **Agree**, with a note: *"resolves on the next open"* is not accurate — the same placement recurs while the keyboard is up. The exposure is small (the above-branch is preferred and is unaffected) and `--kb-inset` is already maintained by the chat shell and, unlike `--safe-top`, IS numerically readable. |
| N-1…N-8 | NIT | Comment/wording items | Not re-audited; none blocks. N-8 (demo-frame 1px border) and N-2 (channel-selector scrim) remain as recorded. |
| N-9 | NIT | Not addressed | **This is the finding that let R-1 ship green.** The Batch E (a) geometry has never executed in any test. Recommend the stubbed-rect fixture with the fix for R-1, so the *value* is pinned, not the *shape*. |

### Auditor C (shells + pins)

| # | Sev | Disposition | My call |
|---|---|---|---|
| C-1 | MAJOR | **Fixed** — cascade-wide floor moved onto `.c-addr-sheet__qrcard` (`:14203-14211`) | **Agree — mutation-verified RED by me (M1).** Residual N-d. |
| C-2 | MINOR | **Fixed** — `rulesFor('.c-wallet-send__list')` + per-declaration check (`:1932`) | **Agree (read-verified).** Cascade-wide; a later same-selector override goes red. A chrome re-add under a *different* selector still slips — acceptable. |
| C-3 | MAJOR | **Fixed** — each leg's window end-bounded at the next `' static void '` (`:14933`) | **Agree — mutation-verified RED by me (M2).** Both the leg pin and the A-2 fall-through pin went red on the unwrap. |
| C-4 | MINOR | **Fixed** — handler-lambda slice `iHook → first '};'` | **Agree (read-verified).** The body contains `catch (Exception) { }` (no `};`), so the first `};` is the lambda close. |
| C-5 | MINOR | **Fixed** — `orderOk` index interleaving on all three paths | **Agree — mutation-verified RED by me (M3).** ⚠ `orderOk` searches the whole file, not the method; the M3 mutation discriminated, but a narrower reorder inside a different method could in principle satisfy it. |
| C-6 | MINOR | **Fixed** — shell + demo `wallet-receive.css` pinned (`:14889`) | **Agree.** Both links present and pinned. |
| C-7 | MINOR | **Fixed** — `.c-settings__addrinfo-body` deleted | **Agree.** `grep -rn addrinfo-body src/` → nothing. `.c-settings__addrinfo` kept. |
| C-8 | MINOR | **Fixed** — `try { closeAddressSheet(); } catch {}` in `exitSettings` + pinned | **Agree.** The invariant is now stated rather than emergent. |
| C-9 | NIT | **Not taken** | Folded into N-c — with the second door added, the divergence is now visible in the demo. |
| C-10 | NIT | Not taken | Sound today. |
| C-11 | NIT (Damir dial) | Not taken | Correctly left to Damir. |

### New this round, unaudited by anyone

| Item | Note |
|---|---|
| **F5-6 (#558)** — `maxHint` + `aria-describedby` + 12 locale drafts | Landed in the FIX round, so no round-1 auditor ever saw it. My own pass: the gating logic is correct (`maxHint.hidden = !!state.recipient`) and honest — the hint speaks only while the recipient is the reason, and the other disable condition (`maxSendU === null && !fresh`) stays unexplained by design; the `#523` no-invented-fee gate is untouched; `overlayId` is the house mint; `[hidden]` is globally enforced. Two findings ride it: **R-5** (i18n pipeline mid-run) and **R-6** (no DECISIONS row). One NIT not raised separately: `aria-describedby` on a natively `disabled` button is not announced by every SR and the button is out of the tab order — the hint is visible text, so nothing is lost. |

---

## 3. Non-negotiables re-verified

| Invariant | Verdict | Evidence |
|---|---|---|
| No Ixian-Core changes (`097341a`) | ✅ | Nothing in the diff touches the sibling; it was read-only here. |
| #268 stands — no desktop wash | ✅ | `:root[data-desktop] .c-scrim[data-dt-clear] { background: transparent; }` intact; the deeper scrim is `:root:not([data-desktop])`-scoped. |
| The lift stays | ✅ | `message-menu.js:135` still sets `row.dataset.menuLift`, cleared through `onDismiss`; `[data-m-anchor]` declares no `z-index` (pinned), so sheet 44 > lift 42 > scrim 40 holds. |
| No new NuGet | ✅ | One new `using System.Threading.Tasks;` — BCL. |
| ★ Chat isolation (#221) | ✅ | No cross-pane JS; every change is presentation, one C# dispatcher hop, or a log line. |
| Money path untouched | ✅ | `wallet-send.js` gains a hint element and an `aria-describedby`; no change to `maxBtn.disabled`'s conditions, the quote flow, `sanitizeAmount`, or any signing path. |
| No new verb / `spixi.*` key / WebView setting / HTML sink / network fetch | ✅ | Confirmed against the gate row; the row's own claim holds (count slip N-a aside). |

---

## 4. Mutation log

Every mutation applied to the real file, the **full** suite run, then restored from a
pre-mutation `cp` and md5-verified (§5).

Baseline for all runs: **BASELINE OK — 3028 pass / the 3 KNOWN pre-existers (#136 · M5 · B3)**.

| # | Pin under test | Mutation | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| M1 | `:14208` C-1 cascade-wide QR floor | append `.c-addr-sheet__qrcard svg { width: 120px; height: 120px; }` to `wallet-receive.css` (auditor C's M1, verbatim) | RED | **RED** — `✗ ★★ F5-5/C-1 (CASCADE-WIDE): no rule in any stylesheet gives the sheet's QR svg a fixed size` | **NOT vacuous** |
| M2 | `:14944` C-3 end-bounded F5-1 leg | unwrap `MainThread.BeginInvokeOnMainThread(() => { … });` in `handleAppRequestReject` → synchronous re-check (auditor C's M3, verbatim) | RED | **RED ×2** — the reject leg's ordering pin AND its A-2 fall-through pin | **NOT vacuous** |
| M3 | `:14921` C-5 crumb interleaving | move all three following `[CRASHDIAG] leave:` crumbs directly under `leave: start` (count unchanged at 4; auditor C's M5) | RED | **RED** — `✗ ★★ F5-2 r2 (C-5): the ContactDetails leave crumbs INTERLEAVE the teardown steps in order` | **NOT vacuous** |

C-2 and C-4 were **read-verified**, not mutated (budget): C-2 now uses the cascade-wide
`rulesFor` + per-declaration helpers, C-4 slices the handler lambda body (`iHook` → first
`};`, which is the lambda close because the only inner block is `catch (Exception) { }`).
Both fixes address their stated vacuity by construction.

★ Not mutated because it cannot be: **`:14856` (the E-1 JS pin) is vacuous by
construction** — it asserts the literal source text `const minTop = safeTop + M_GAP;`,
which is present and green while `safeTop` is permanently 0 (R-1). No source mutation can
expose that; only a behavioural fixture can.

---

## 5. Working-tree integrity

Restored byte-identical. md5 verified per file against pre-mutation backups:

```
d6b7aa90f2287c7215407a16faa06379  src/styles/components/wallet-receive.css
c29d3943c7548fdddacfeefa6dec4cb4  Spixi/Network/StreamProcessor.cs
d3de6c0945eb97e9ae7acc41a7ced76f  Spixi/Pages/Contacts/ContactDetails.xaml.cs
a7137c96848fd40bd42e6cac75252bb5  src/styles/components/wallet-send.css
7515695b3913ad14ab6c0c8fbcc0fd0c  Spixi/Platforms/Android/MainApplication.cs
```

`git --no-optional-locks status --short` returns the same 58 modified paths + 4 untracked
review docs I found. The only file I added is this verdict.

**Loop-clean checks (all run post-restore):**

| Gate | Result |
|---|---|
| `node scripts/smoke-test.mjs` | **BASELINE OK — 3028 pass / the 3 KNOWN pre-existers** (#136 · M5 · B3) |
| `node scripts/cs-syntax-check.mjs` | 144 files parse cleanly ✓ · 1 known grammar-gap skip |
| `node scripts/i18n-lint.mjs` | ✓ (1 dev-only exemption) |
| `node scripts/pseudo-locale-smoke.mjs` | 9/9 ✓ |
| NUL sweep over `src/`, `Raw/html`, `scripts/` | clean |
| **Artifacts rebuilt and diffed** (bundle BEFORE shells) | `build-demo-bundle` → 292 exports, `src/demo/spixi.iife.js` **byte-identical**; `build-shells` → 18 shells, `diff -rq` over the whole `Raw/html` tree returns **nothing**. The committed artifacts are in sync with the sources **as they stand** — see R-5: running the strings pipeline will change that. |

---

## 6. What round 3 must do

1. **R-1 first** — it is the batch's own headline (a) item and it does not work. Fix the
   read (probe element), add the bottom limit, and replace the shape pin with a
   behavioural one. Do not close it on reading; N-9 is the reason it got here.
2. **R-2** — one latch. Then F5 both directions: a missed call must LEAVE a tagged row,
   and a declined call must leave NONE.
3. R-3 / R-4 / R-8 — three one-line C# changes, each with a named mechanism.
4. R-5 / R-6 / R-7 — the pipeline run and three doc corrections. R-5 rewrites the shells,
   so it must land BEFORE anyone re-diffs the artifacts.
5. E-3: give Damir the choice the residual currently makes for him.

---

# ROUND 2 RE-REVIEW — the fix round for R-1…R-8

Deltas only. Same rules: I did not build, I do not fix, and the only file I write is
this one. Tree restored byte-identical (§R2-5).

## VERDICT: **PASS** — 0 MAJOR · 0 MINOR · 5 NIT

Both MAJORs are genuinely closed, and closed at the mechanism rather than at the symptom.
R-1 now measures the insets the way the repo's own `probeMeasure` measures them, bounds
**both** ends, and its pin is falsifiable (mutation-verified below). R-2's latch sits in
the one right place — **below** the C18b accepted-call guard, so it can never be set on a
live call. R-3/R-4/R-5/R-6 all landed as described and I verified each at source rather
than on the claim.

---

## R2-1. Disposition of the round-2 findings

| # | Sev (r2) | Disposition | Verified how |
|---|---|---|---|
| **R-1** | MAJOR | **FIXED** | See R2-2 — math re-derived, double-subtraction checked, pin mutation-verified RED. |
| **R-2** | MAJOR | **FIXED** | See R2-3 — all seven call shapes re-walked at source. |
| **R-3** | MINOR | **FIXED** | `SettingsPage.xaml.cs:1127` `Node.startCounter = 0;` immediately after `IxianHandler.wallets.Clear()` / `balances.Clear()`, inside `wipeEverything`, which is the sole caller path from `onDeleteAccount:1032`. `startCounter` is `public static int` (`Meta/Node.cs:39`) so the assignment is legal; it cannot throw, so its position between two `try`-wrapped statements is fine. Pinned by ORDER at `smoke-test.mjs:14936` (`indexOf('Node.startCounter = 0;') > indexOf('IxianHandler.wallets.Clear()')`) — a reset placed before the clear would go red. The post-wipe in-process re-create/restore now re-enters the launch flow with `startCounter == 0`, i.e. guard 2 fires exactly as on a first boot. |
| **R-4** | MINOR | **FIXED** | All three `Task.Run` bodies fenced: `try { … } catch (Exception ex) { Logging.error("Deferred VoIP accept/reject/hangup failed: " + ex); }`. Distinct messages per leg, so a log line attributes itself. ⚠ Unpinned → N-h. |
| **R-5** | MINOR | **FIXED** | `extract --check` = **771** and the committed dictionary is now 771: `maxNeedsRecipient` present in `src/strings/en-us.js`, `src/strings/de-de.js` and `src/demo/strings.iife.js`. ★ Correction to my own r2 evidence: the built shells were never a valid staleness signal here — `maxTitle` and `maxConfirm` are absent from `Raw/html/index.html` too, because shells carry `*SL{}` carriers, not the dictionary. The load-bearing artifacts are the locale files + the strings IIFE + the bundle's inline fallback, and all are correct. **Order verified independently, not accepted on the claim** (R2-4). |
| **R-6** | MINOR | **FIXED, with a process NIT** | `DECISIONS.md` now ends at **#559**; #558 records the F5-6 dial. #559 is unusually good — it names both round-2 MAJORs, their mechanisms, and three carried lessons. The NIT is its status stamp → N-i. |
| **R-7** | MINOR | **PENDING, accepted** | Per the coordinator, the F5 checklist doc is next. ⚠ #559 still asserts the carrier as delivered ("carried to the F5 checklist with a one-rule revert path") — fold into N-i. |
| **R-8** | MINOR | **STANDS as flagged** | Unchanged; #559 records it as a #294-flagged residual. Correct handling — no toolchain here can settle it, and the F5 checklist must say what the drained marker does and does not prove. |
| N-a…N-f (r2 NITs) | NIT | Not re-checked | None blocking; N-a (breadcrumb count) and N-e (draft trailing newline) are still open as far as I looked. |

---

## R2-2. R-1 — the geometry, re-derived

**The read.** `resolvePx(expr)` builds a probe (`position:absolute; left:-9999px; top:0;
visibility:hidden; padding-top:<expr>`), appends it, reads `parseFloat(getComputedStyle(
probe).paddingTop)`, removes it. That is `home.html:566 probeMeasure` verbatim in shape,
and it is the correct technique: `padding-top` is a *resolved* value on a laid-out box, so
`max(env(59px), 0px)` becomes `59px`. Both insets go through it — `var(--safe-top, 0px)`
(top, honouring the AND-7 rule that no component reads `env(safe-area-inset-top)` directly)
and `env(safe-area-inset-bottom, 0px)` (bottom, which has no CSS-var twin by design,
`base.css:26-30`). Fenced in `try/catch` returning 0, and jsdom-safe (`""` → NaN → `|| 0`).

**Framed-host terms.**

| Case | `safeTop = max(0, inset − max(0, fr.top))` | `safeBottom = max(0, inset − max(0, winH − fr.bottom))` | Correct? |
|---|---|---|---|
| Production (host = body, `height:100%`, scroll locked) | `fr.top = 0` → full inset | `fr.bottom = winH` → full inset | ✓ |
| Demo phone frame inset from the viewport | frame top > 0 → reduced/0 | space below the frame → reduced/0 | ✓ |
| Host sub-region starting exactly at the inset (59) | `59 − 59 = 0` | symmetric | ✓ — the host's own edge already clears it |
| `fr.top < 0` (host scrolled above the viewport) | `max(0, fr.top)` keeps the FULL inset (conservative) | — | ✓ safe direction; cannot arise in production (body locked) |

**No double-subtraction — the CSS cap and the JS band are the same interval, by
construction:**

- CSS: `max-height: calc(100% − var(--safe-top,0px) − env(safe-area-inset-bottom,0px) − 2*var(--spacing-8))`. `.c-sheet` is `position:absolute` and body is static, so `100%` resolves against the ICB = viewport height → `h_max = winH − top − bottom − 16`.
- JS: `maxBottom − minTop = (fr.height − 8 − safeBottom) − (safeTop + 8) = fr.height − safeTop − safeBottom − 16`.
- In production `fr.height == winH`, so the two are **equal**: the CSS caps the height to exactly the band the JS positions inside. The clamp `top = max(minTop, maxBottom − h)` therefore reaches `minTop` only at equality, never overflows, and never subtracts an inset twice. In a demo frame the containing block is `.demo-phone` (position:relative) and both insets are 0 on desktop, so `frameH − 16` on both sides. ✓

**Both branches and the clamp are bounded** — `above >= minTop` gates the preferred branch,
`top + h > maxBottom` gates the fallback, and the clamp lands between `minTop` and
`maxBottom − h`. The r2 defect (`top: 9px` under a 59px inset) is arithmetically
unreachable: `minTop = 67` makes `9 >= 67` false and placement falls to BELOW.

**The pin is now falsifiable** (`:14861-14866`): it asserts the probe pattern
(`padding-top:' + expr`, `getComputedStyle(probe).paddingTop`), both `resolvePx` call
sites, the `minTop`/`maxBottom` pair, **and** forbids `getPropertyValue('--safe-top')`
inside the function — the negative is scoped to the function slice, not the file.
Mutation-verified RED (R2-4).

---

## R2-3. R-2 — the shape walk

`currentCallDeclinedLocally` is declared beside `currentCallInitiator` (`:34`), written in
exactly one place, read in exactly one place, and reset in the `:309-313` block.

| Shape | Flags at `endVoIPSession` | Branch | Honest? |
|---|---|---|---|
| Incoming, **answered** | acc T · callee T · init F · decl F | cancel | ✓ (and `acceptCall` already cancelled at answer) |
| Incoming, **ring timeout** — `startRingTimeout:598` calls `endVoIPSession()` directly, never `rejectCall` | acc F · callee T · init F · **decl F** | **re-post "Missed call"** | ✓ **the fix's whole point, preserved** |
| Incoming, **locally declined** (`rejectCall`) | acc F · callee T · init F · **decl T** | cancel | ✓ **R-2 closed** |
| **C18b stale-UI reject on an ACCEPTED call** | guard `if (accepted && calleeAccepted) { warn; return; }` at `:441-445` sits **ABOVE** the latch at `:450` → returns first | nothing runs | ✓ ★ the ordering is the load-bearing detail: the latch can never be set on a live call, so a stale Decline cannot poison a later teardown |
| Incoming, **codec-unsupported auto-reject** (`onReceivedCall:110` → `rejectCall`) | decl T | cancel | ✓ by consistency — `onReceivedCall` returns **false** on that path, so `Node.addMessageWithType(voiceCall…)` never runs, no "Incoming call" row was ever posted (`Node.cs:945`) and no chat entry exists. `cancelNotification` on an id that was never posted is a no-op, and the tray now matches the message layer instead of showing a row with no history behind it. ⚠ comment wording → N-j |
| Outgoing, **peer rejected** (`onRejectedCall`) | init T | cancel | ✓ |
| Outgoing — unanswered / cancelled / `hangupCall` error path | init T | cancel | ✓ |
| **Stale-UI hang-up, no session** | `hangupCall:481` returns before `endVoIPSession` | nothing | ✓ |

**Reset:** cleared with `currentCallInitiator`, so a decline cannot eat the next call's
missed row. The only way to strand it true is an exception in the unfenced
`:276-297` message block — which also strands `currentCallSessionId`, i.e. the
pre-existing latch-forever state where no further call is accepted at all. No **new**
failure mode. (R-4's fences now at least make such a throw visible for the deferred path.)

Pins: predicate + the sole writer's placement in `rejectCall` + both resets
(`:12236`, `:14975-14983`).

---

## R2-4. Gates and mutation log

Baseline: **BASELINE OK — 3031 pass / the 3 KNOWN pre-existers (#136 · M5 · B3)** —
matches the claimed count exactly (3028 → 3031, +3 net).

| Gate | Result |
|---|---|
| `smoke-test.mjs` | **3031 / the 3 KNOWN** ✓ |
| `cs-syntax-check.mjs` | **144 parse cleanly ✓ · 1 known grammar-gap skip** ✓ |
| **Artifact sync, verified not accepted** | Snapshot → `build-locales` → `build-strings-iife` → `build-demo-bundle` → `build-shells` (bundle **before** shells) → `diff -rq` over `Raw/html` **empty**, `spixi.iife.js` **byte-identical**, `strings.iife.js` **byte-identical**. A second `build-locales` run left `src/strings` byte-identical → deterministic and in sync. **The R-5 order claim holds.** |

| # | Pin under test | Mutation | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| M4 | `:14861` R-1 probe pattern | restore the r2 regression verbatim — `const safeTop = Math.max(0, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) \|\| 0) - Math.max(0, fr.top));` | RED | **RED** — `✗ ★★ Batch E (a) r3 (R-1): the safe insets are RESOLVED through a probe element (computed padding-top → px), never getPropertyValue-parsed — top AND bottom` | **NOT vacuous** |

(r1 M1/M2/M3 from the first round remain valid — none of their subjects changed.)

---

## R2-5. New this round — 5 NIT, none blocking

| ID | Sev | file:line | Finding |
|---|---|---|---|
| **N-g** | NIT | `src/components/desktop-anchors.js:130` · `src/shells/home.html:2813` | `resolvePx` appends its probe to **`host`**, which in production is `document.body` — and `home.html:2813` observes `{ childList: true }` on `document.body`. Two probes per menu open therefore fire that observer four times (append + remove ×2). **Harmless today, and I checked rather than assumed:** the callback is `if (nudgeQueue.length) pumpNudges()`, and `pumpNudges` → `nudgeContextClear():2729` returns false while `document.body.dataset.overlayOpen` is set — which `openSheet`/`openOverlay` sets **before** `anchorSheetToRow` runs. So a queued backup/rating nudge cannot present over the menu. It is an undocumented new coupling all the same. **Fix, free:** append the probe to `document.documentElement` (observed nowhere) instead of `host` — the resolved values are identical, since `--safe-top` is declared on `:root` and `env()` is viewport-level. |
| **N-h** | NIT | `Spixi/Network/StreamProcessor.cs:745` · `:795` · `:850` | R-4's three `try/catch` fences are **unpinned**. Deleting all three leaves the suite green, and the failure they prevent is by definition silent — the exact shape that made them necessary. One line: assert each leg's `Task.Run` slice contains `catch (Exception` + `Logging.error("Deferred VoIP`. |
| **N-i** | NIT (process) | `DECISIONS.md` #559 | The row was stamped **"✅ CLEAN r2"** / "CLEAN after 2 rounds" **before** the re-reviewer signed — the builder adjudicating its own loop, which the protocol reserves for the fresh reviewer. It happens to be right (this verdict is PASS), but had round 2 found a third MAJOR the tree would have carried a false CLEAN. Same row asserts R-7's F5-checklist carrier as delivered while it is still pending. **Fix:** status → `✅ CLEAN r2 (Opus verdict appended <date>)`, and mark the checklist clause pending until the doc exists. |
| **N-j** | NIT | `Spixi/VoIP/VoIPManager.cs:446-450` · `:34` | The flag's comment says *"a call the USER declined … they saw it and answered it with a decline"*, but `rejectCall` has a second, **automatic** caller: the codec-mismatch reject in `onReceivedCall:110`, where the user saw nothing. The resulting behaviour is correct (R2-3), the wording is not. One clause: "…or one this device auto-rejected before it could ring (unsupported codec) — in that case nothing was ever announced, so there is nothing to correct." |
| **N-k** | NIT | `scripts/smoke-test.mjs:14848` · `:14851` | The CSS `max-height` pin's comment and message still say **"r2 (loop E-1)"** while the JS pins beside them say r3. Cosmetic drift; the pin itself is correct and still passes. |

---

## R2-6. Working-tree integrity

Restored byte-identical. `src/components/desktop-anchors.js` md5
**`6ed524767fc0e86de8a4948eb966bab3`** before and after M4.
`git --no-optional-locks status --short` = **92** paths, unchanged across my rebuild and
my mutation; `diff -rq` over `Raw/html` and `cmp` on both IIFEs confirm the generated
artifacts were not disturbed. The only file I wrote is this verdict.

**Nothing blocks the commit.** The five NITs are a comment clause, a status stamp, a probe
host, a pin, and a stale "r2" label.

---

# ROUND 3 — the fold-ins (#560 · #561 · #562)

Three same-day Damir-ordered fold-ins landed after the ROUND 2 PASS. Deltas only.
Same rules: I do not fix, and the only file I write is this one.

## VERDICT: **PASS** — 0 MAJOR · 2 MINOR · 6 NIT

Nothing here blocks. Both MINORs are one-liners and both are the same shape: **a signal
the code already has, thrown away** — a `transitionend` that is not checked for its
property, and a hide-time timestamp that is written and then never read.

★ #560 vindicates round 1's **E-2** — the objection was right at source, Damir's
screenshots settled it, and the fix is now stronger than the thing E-2 asked for: not
"restore the card" but a **cascade-wide parity assertion** across all three surfaces.
And the real cause E-2 named — the untouched outer `padding: 16` — turned out to be the
actual "extra paddings on the side" (double 16, host **and** component). That is the
finding closing properly rather than being papered over.

---

## R3-1. #560 — money-list parity + receive rework

| Check (as asked) | Verdict | Evidence |
|---|---|---|
| **Sticky CTA — any overflow ancestor between it and the scroller?** | ✅ **works** | Chain: `.c-wallet-receive__cta` → `.c-wallet-receive__ask` (`wallet-receive.css:98` — plain flex column, **no overflow**) → `.c-wallet-receive` (`:5-10` — flex column + padding, **no overflow**) → `.wallet-takeover__body` (`home.html:186` — `overflow-y: auto`, the scrollport). The only `overflow` in the file besides the desktop dialog is `:35`, the visually-hidden live region — a different element. So the nearest scrollport IS the takeover body and sticky binds to it. The CTA's containing block is `askBox`, which spans label → search → the full-length roster → CTA, so it stays stuck for the whole list — the correct construction. Sticky on a flex item is fine. |
| **Parity pin — `cardDecls` JSON comparison sound?** | ✅ sound, with one narrow blind spot (N-o) | `JSON.stringify(want, Object.keys(want).sort())` — the array second argument is the **replacer as an allow-list**, and the output key order follows *the replacer array's* order, so the sorted list genuinely normalises ordering. Each selector derives its own list from its own keys, so a **missing** prop changes the key set and the strings diverge → red. `rulesFor` is `cssCompoundHas(cssSubject(s), sel)`, i.e. it matches by rule **subject** — so `.c-wallet-send .c-wallet-send__list` is caught too (the r1 C-2 lesson applied). **Mutation-verified RED (M5).** |
| **Chat attach-Pay compose keeps its padding** | ✅ | The zeroing rule is child-scoped: `.wallet-takeover__body > .c-wallet-send, … > .c-wallet-receive`. `chat.html:2726` mounts the same component under `.chat-send-takeover__body` — a different class — so the component default `padding: var(--spacing-16)` (`wallet-send.css:24`) still applies there. The comment claims exactly this and it is true. |
| **Desktop (560px cap)** | ✅ no conflict | `:root[data-desktop] .c-wallet-send / .c-wallet-receive { max-width: 560px; margin-inline: auto }` (`wallet-send.css:228`, `wallet-receive.css:270`) sets no padding, so the new `(0,2,0)` rule composes rather than fights. The 560px box now has no inner padding, but on desktop the surrounding gutter dwarfs 16px. Sticky uses the same scrollport. |
| **The keyboard case the removed 328px cap used to serve** | ✅ served by order, as claimed | The amount field is appended to `el` at `wallet-receive.js:141`, **before** `askBox` at `:216` — so with the keyboard up the amount input is above the roster and the page scrolls to it; W-k drops the keyboard on Enter. The old cap kept the field on screen by shrinking the list; order does it without a scroll-inside-scroll. |
| Receive roster full-length, page scrolls | ✅ | `max-height` / `overflow-y` / `-webkit-overflow-scrolling` all removed; pinned cascade-wide (`:1954-1956`). |

---

## R3-2. #561 — swipe

| Check (as asked) | Verdict |
|---|---|
| Desktop gate placed before any wrapper | ✅ `chats-swipe.js:43-47` sits after the `enabled` computation and before `document.createElement('div')`, returning the bare `rowEl` — the same contract the pre-existing "fully parked" early return already had, so no caller changes. `?desktop=1` demos render bare rows; `closeChatRowSwipe()` is then a no-op because `currentClose` is never set. |
| Double-fire (transitionend **and** the 280 ms belt) | ✅ the `done` latch makes `go()` idempotent; the late timeout returns immediately. Exactly one `onAction`. |
| `closeChatRowSwipe` / `currentClose` bookkeeping | ✅ `fire` clears `wrap.dataset.open` and `currentClose` up front, then animates home with a direct `setX(0, true)` — equivalent to what `close()` did. A `closeChatRowSwipe()` during the 280 ms window is a correct no-op (the row is already going home); another row opening calls `closeCurrent()`, which no longer targets this one — also correct. |
| **transitionend from another property/element bubbling in** | ⚠ **MINOR-1** — see below |

| ID | Sev | file:line | Finding |
|---|---|---|---|
| **MINOR-1** | MINOR | `src/components/chats-swipe.js:105-110` | **The settle guarantee is unreliable: `go()` accepts ANY bubbled `transitionend`.** The listener is on `content`, `transitionend` bubbles, and `content` wraps the whole chat row — which has **two** transitions running on the very gesture that fires the swipe: `.c-chatlist-item { transition: background-color var(--duration-100) }` (`chatlist-item.css:17`, **100 ms — always wins**) and the press-feedback `::before` `transition: opacity var(--duration-200)` release fade (`base.css:437`, 200 ms, started at the same pointerup as the transform's own 200 ms — a coin flip). So on a real device `go()` commonly runs **before** the spring rests, which is exactly the pre-#561 behaviour Damir reported ("just appears at its own position instantly"). **Severity judged as asked:** never a double-fire, never a lost action, never a wrong action — the failure degrades to the old symptom, silently, and no pin can see it (`:14953` asserts the source shape). **Fix, one line:** `const go = (e) => { if (e && (e.target !== content || e.propertyName !== 'transform')) return; … }` — `content` is precisely the element carrying `transition: transform` (`chats-swipe.css:39-42`) and `setX` writes `content.style.transform`, so the guard is exact. Keep the belt calling `go()` with no argument. |
| N-l | NIT | same | The action buttons stay live and hittable for the 280 ms the drawer takes to close, so a fast double-tap can queue two `onAction`s (each `fire()` has its own `done`). Pre-existing in kind — the old code fired inline and the re-render removed the buttons — but the window is new. `pin` double-toggles to a no-op; `delete` opens a modal. Cheap belt: latch on `wrap`. |

---

## R3-3. #562 — hide request, durable

The design is right and the two dangerous halves are handled: **the revive branch clears
the key AND the map** (`home.html:3051`), so a legitimately resurrected row cannot be
re-hidden by the next `visibilitychange` — the check that mattered most. Both consumers
are present (`storage` **and** `visibilitychange`), which is the correct #285 grammar
since WKWebView fires no cross-WebView storage event.

| Check (as asked) | Verdict |
|---|---|
| **Revive / re-hide against a legitimately resurrected row** | ✅ `hideReqClear(wallet)` runs inside the revive branch beside `deletedChats.delete(wallet)`; with no key, `consumeHideReqs` finds nothing to re-hide. No reachable key-without-map state (armed keys are seeded at boot, un-armed keys are armed in the same `addChat` before the tomb read). |
| **JSON.parse on hostile localStorage values** | ✅ Both parse sites are `try`-fenced; values are only ever read through `Number(...) \|\| 0`. A raw-timestamp value parses to a **number**, so `typeof p === 'object'` correctly reports un-armed (the `catch` never runs for it — N-n). An array value passes `typeof === 'object'` and degrades to a zeros tombstone, which any push resurrects — harmless. The address-bearing key name rides security MAJOR #4 with its siblings, correctly stated in the gate row. |
| **Boot seeding before `state` exists** | ✅ No TDZ, checked: `state` is declared at `home.html:1163`, `deletedChats` at `:1191`, the seeder runs at `:1906` and touches only `deletedChats`. `consumeHideReqs` reads `state.chats` but is only ever called from listeners registered at `:1938-1939`, which cannot fire before boot completes. |
| **#109 handshaking-row interaction** | ✅ The handshaking branch of `openChatRowMenu` returns at `:71` — before the `capabilities.delete && chat.request` item — so a stalled handshake still shows only "Cancel handshake". Untouched. |
| **Old B1 pin / copy promising "revoke / withdrawn"** | ✅ in production; ⚠ one demo-only leftover (N-m). `revokeRequest`/`…Body`/`…Title`/`…Confirm` are **retired from `en-us.js`** and replaced by `hideRequest*`; the smoke pins were rewritten in place (`:14704-14713`) and now assert the copy *behaviourally* — the modal text, and that nothing fires before confirm. The action **id** `revokeRequest` is deliberately kept as plumbing and pinned as such. `chat.html:2929`'s `ixian:undorequest` is the **incoming** Decline, which is legitimately destructive and correctly untouched. |
| **`identity.address` empty at strip time** | ⚠ N-p |
| **The un-armed → armed race** | ⚠ **MINOR-2** |

| ID | Sev | file:line | Finding |
|---|---|---|---|
| **MINOR-2** | MINOR | `src/shells/home.html:3030-3038` (arming) · `:3046-3054` (tomb) · `src/shells/chat.html:2999` (the writer) | **The hide's fate is decided by the PUSH SHAPE, not by evidence — and the one piece of evidence the code already writes is thrown away.** The chat shell writes `String(Date.now())` as the un-armed value; `addChat` then arms with `(t, n)` from *whatever push arrives first* and immediately falls into the tomb read, where `revived = (t > tomb.ts) \|\| (n > tomb.unread)` is **false by construction** (the tombstone was just set to those same values). So the outcome is purely `chatsFlushing`: **(a)** if the first push is a **full flush that already carries the peer's accept**, the key is armed at the accept's own tail, `revived` is false, and the branch `return`s — the row is hidden **permanently**, and no later flush can ever beat that tail. The modal's promise ("if they accept it, the chat comes back") is then false, silently and durably. **(b)** if the first push is a **lone `addChat`**, `!chatsFlushing` clears the tombstone *and deletes the durable key* even when the tail is unchanged — a hide that undoes itself, contradicting "durable" (narrow today only because an outgoing pending request has no messages until the accept; it rests on an assumption about C#, not a guarantee). **Fix, using data already on disk:** the raw value IS the hide's wall-clock. `const hidAt = Number(hv) \|\| 0; if (!armed) { if (t && t > hidAt) { hideReqClear(wallet); /* evidence — it moved after the hide */ } else hideReqArm(wallet, t \|\| 0, n); }` — evidence then decides both branches, which is the #193 rule this batch cites. |
| N-m | NIT | `src/components/contacts-shell.js:1063-1130` | `createPendingContact` still offers a **destructive** "Cancel request" wired to `onCancelRequest` → `ixian:undorequest` (its docblock says so at `:1063`) — the third door, and the exact behaviour #562 exists to eliminate. **Only reachable from `src/demo/chats.html:468`**, never from a production shell, so nothing ships broken. But if it is ever wired, #562's ruling is violated silently. One line in its docblock, or convert it to the hide flow. |
| N-n | NIT | `src/shells/home.html:1912` | The boot seeder's `catch` carries the comment "raw timestamp — armed by addChat at the first push", but `JSON.parse("1756…")` **succeeds** (returns a number) — the `catch` never runs for that case; the `typeof v === 'object'` guard is what handles it. The behaviour is right, the comment points at the wrong line. |
| N-o | NIT | `scripts/smoke-test.mjs:1935-1941` | `cardDecls` filters on the four **shorthands** exactly (`/^(background\|box-shadow\|border-radius\|padding)$/`). A drift written as `background-color`, `padding-inline` or `border-start-start-radius` is invisible to the parity comparison. Widen to a prefix test (`/^(background\|box-shadow\|border-radius\|padding)/`) and normalise. |
| N-p | NIT | `src/shells/chat.html:2999` | `localStorage.setItem('spixi.hidereq.' + (identity.address \|\| ''), …)` writes a **garbage key with an empty address** if the strip is confirmed before the identity lands (#217c established that window exists). Inert — `consumeHideReqs` finds no row for `''` and `continue`s, the boot seeder skips a raw value — but it is an un-prunable orphan in an address-bearing key family. Guard: `if (!identity.address) return;` before the write. Also: the old strip button was a one-shot (`disabled = true`); two fast taps now stack two modals. |
| N-q | NIT | `src/components/wallet-receive.js:186` | Stale comment on the roster element: *"scrolls (Damir F5); NO card/.u-scroll — both added padding inside the request box"*. #560 reversed **both** halves — it is now a card and it does not scroll. |
| N-r | NIT | `docs/security-handover-gate.md` (#562 row) | The row says the key's *"value = a timestamp"*. Two writers, two shapes: the chat shell writes a raw timestamp, `home.html hideReqArm` writes `JSON.stringify({ ts, unread })`. The verdict is unaffected (no content, no secret) but a gate row should be exact about what a key holds. (Carried from round 2: the same document still says "7 breadcrumbs" where the tree has 11 — N-a.) |

---

## R3-4. Docs

| Item | Verdict |
|---|---|
| DECISIONS **#560** | ✅ accurate, and honest about the reversal — names #556's F5-4 as superseded, cites Damir's screenshots as the settling evidence, and credits loop **E-2** with having flagged the premise at source. Both mechanisms (the card + the double 16) are recorded. |
| DECISIONS **#561** | ✅ accurate — both halves, with the symptom quoted and the mechanism named ("the re-render tore the spring down mid-flight"). Does not claim the transitionend is filtered, so MINOR-1 is an omission, not a false claim. |
| DECISIONS **#562** | ✅ accurate, and it records the *evidence* (Damir's repro of the peer's accept landing in a void) rather than the preference — which is what makes RC1's cost concrete for the BE handover. |
| Gate rows (#560–#562) | ✅ substantively right, incl. the one that matters: `spixi.hidereq.<addr>` is named as **address-bearing** and routed to security MAJOR #4 with `spixi.draft.*`/`spixi.exdel.*`, and the batch is correctly described as **removing** two verb emissions. Value-shape imprecision → N-r. |

---

## R3-5. Pipeline and mutations

**The i18n question, answered end to end.** 771 is not a stall — it is a **wash**: four
keys retired (`revokeRequest`, `revokeRequestBody`, `revokeRequestTitle`,
`revokeRequestConfirm` — all now `0` occurrences in `en-us.js`) and four added
(`hideRequest*`, all `1`). The legacy-mapping split moved 138/633 → **139/632**, i.e. one
of the new keys maps to a legacy id, which is the corroborating detail. `extract --check`
= 771 = the committed dictionary = `docs/i18n-strings.md:10`'s summary; `hideRequestBody`
is present in `de-de.js`, `de-de.json` and the drafts.

| Gate | Result |
|---|---|
| `smoke-test.mjs` | **BASELINE OK — 3040 pass / the 3 KNOWN pre-existers** ✓ (matches the claim) |
| `cs-syntax-check.mjs` | **144 ✓ · 1 known skip** ✓ |
| `i18n-lint.mjs` | ✓ |
| `extract-strings --check` | 771 · **0 fallback conflicts** ✓ |
| **Artifact sync — verified, not accepted** | Snapshot → `build-locales` → `build-strings-iife` → `build-demo-bundle` → `build-shells` (bundle **before** shells): `src/strings` byte-identical, `strings.iife.js` byte-identical, `spixi.iife.js` byte-identical, `diff -rq` over `Raw/html` **empty**. |

| # | Pin under test | Mutation | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| M5 | `:1949` #560 cascade-wide card parity | delete `box-shadow: var(--elevation-1)` from `.c-wallet-receive__contacts` (a one-declaration drift on one of the three surfaces) | RED | **RED** — `✗ ★★ #560 (CASCADE-WIDE PARITY): the send picker AND the receive roster wear the directory card VERBATIM` | **NOT vacuous** |
| M6 | `:14683` #562 "emits NO verb" | re-insert `bridge.send('ixian:undorequest:' + chat.address);` into the hide branch — the dead-chat regression, verbatim | RED | **RED** — `✗ ★★ #562 SHELL: the hide branch emits NO verb (the Friend record must survive for a future accept)…` | **NOT vacuous** |

(M6 is the one that matters: it is the exact regression #562 exists to prevent, and the
pin catches it at source.)

---

## R3-6. Working-tree integrity

Restored byte-identical after both mutations:

```
9fff8983efecdab4530efa1bea96f59f  src/styles/components/wallet-receive.css
e0a1140836c6eea50700439b22a2617e  src/shells/home.html
```

`git --no-optional-locks status --short` = **95** paths, unchanged across my rebuild and
my mutations; `diff -rq` over `Raw/html` and `cmp` on the bundle confirm the generated
artifacts were not disturbed. The only file I wrote is this verdict.

**Recommended before commit:** MINOR-1 and MINOR-2 (one line each). Everything else is
a comment, a demo-only leftover, a pin widening, and two doc precisions.
