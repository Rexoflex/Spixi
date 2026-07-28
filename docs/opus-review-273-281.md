# Opus #46 adversarial review — post-freeze batches #273–#281

Range `17dc04c3..c0ceae1e` (07-20 Mac bring-up + #273–#278 bug batches + 07-22 iOS-sim/RocksDB/#279–#281).
Run 2026-07-28 (Cowork/cloud + device bridge). Protocol: 3 disjoint read-only Opus auditors
(A native C# · B web source · C cross-cutting contracts) → orchestrator verification against source →
mechanical fixes → **fresh break-my-verdict re-reviewer** → round-2 fixes. `[verified]` = re-checked
against source in-session. Known-open iOS-26..32 and everything in
`opus-review-macsession-282-283.md` not re-reported.

## MAJOR — all fixed in-session

1. **#274 language-pick restore was DEAD CODE [verified — this is Damir's "NOT fixed on first VM
   test"].** `settings.html` boot consumed the `spixi.settings.view` stash into `currentView`
   (`takeResumeView()`), then the top-level `showHub()` unconditionally reset `currentView='hub'`
   and rendered — every language pick landed on the empty Account detail with fresh artifacts.
   The planned F12 `VIEW_RESUME_KEY` probe would have mis-concluded "stale artifact" (the constant
   IS in the shipped source). **Fixed:** boot now calls `renderLayout()` (currentView already
   restored). Hardening riders: non-pane `langBuilt` tracking + refresh in `rebuildHub` (a restored
   picker can boot before `setPaneMode`/`setLanguage` land); `showHub()` drops an un-consumed stash
   (old-exe misfire inside the 15 s window); cross-mode `langBuilt` keys clear each other.

2. **#275 lock had no GROUP guard [verified mechanism; state occurrence 🟡 core].** Groups are
   `FriendType.Group` with `bot == false`, so `if (!friend.bot)` + the widened `state != Approved`
   predicate meant any non-Approved group would get the OUTGOING lock: "Waiting for {group}…" +
   **Cancel request → `ixian:undorequest` → `FriendList.removeFriend` with NO `sendLeave`** (silent
   client-side group drop; the shell's `showRequestSentModal` handler had no `isMulti` guard — the
   heartbeat lock has one, this push path didn't). Whether a group can carry a non-Approved state
   lives in Ixian-Core (not in tree) — **BE confirm 🟡** — but the guard is warranted regardless.
   **Fixed both sides:** C# `!friend.bot && friend.type != FriendType.Group` at onLoad + the
   updateScreen pending branch; shell belt `if (!mode.isMulti)` in `showRequestSentModal`.

3. **Re-review round: the one-shot latch broke RE-ENTRY (introduced by this loop's own A5 fix,
   caught by the break-my-verdict pass).** `_waitingForContactConfirmation` was never reset in
   `onLoad`; a WebView reload of a live pending chat (desktop pane re-home #225/#247, WKWebView
   process reload) re-arms the shell UNLOCKED (`onChatScreenReady → setComposerLock(null)`) while
   the latched C# pushed nothing → live composer on a pending contact (the ⑪ delivery-lie,
   re-entry variant). **Fixed:** latch reset joins the onLoad reset block; `updateScreen()` at :644
   re-pushes + re-latches same-tick (anti-churn preserved).

## MAJOR-risk — VERIFY-GATED (not fixable from this tree; do NOT build around them, #215 rule)

- **B1 — #281's exported prefixed selectors may starve OneSignal's own delegate install.**
  OneSignal's swizzle is `class_addMethod(prefixedSel)` → `method_exchangeImplementations`;
  `class_addMethod` FAILS when the class already defines the selector — now exactly our case — so
  the exchange plausibly swaps our two managed impls and OneSignal's own handler installs nowhere.
  Crash verifiably gone; unverified whether `handleNotificationReceived`/offline-push fetch still
  fire for a REAL remote push. **Device F5: foreground remote push → log inside
  handleNotificationReceived + fetchPushMessages.** If dead: register the prefixed selector
  dynamically post-init instead of `[Export]`.
- **B3 — #281 verified only under the DYNAMIC registrar (sim Debug).** A hand-written `[Export]`
  with an `Action<UNNotificationPresentationOptions>` block param and no `[BlockProxy]` is the
  classic STATIC-registrar failure (device/Release). **Gate: build `-c Release
  -p:RuntimeIdentifier=ios-arm64` before any device ship.**
- **B2 — a remote-push tap can now be handled TWICE** (revived delegate route `DidReceive…` +
  OneSignal `Clicked` handler; divergent: `updateScreen()` vs `popToRootAsync()`). Device F5 with a
  real push; then pick one owner (idempotency latch or drop the Clicked handler).
- **A2 — the widened lock has exactly ONE unlock (peer-driven state→Approved) and its only in-app
  escape is destructive** (Cancel → removeFriend; no resend verb exists). For a legacy-terminal
  non-Approved state that is functionally fine, the lock converts a cosmetic label bug into a hard
  block with a data-destroying exit. **BE: enumerate FriendState; whitelist genuinely-pending
  states + provide a non-destructive "resend request" recovery.** (Damir's F5 proved SOME legacy
  states fake-deliver — the lock direction is right; the escape hatch is the gap.)
- **C-9 — the whole `spixi.*` localStorage family rides UNVALIDATED `file://` WKWebView
  persistence** (per-WebView-ephemeral is a documented platform behavior class). One 60-second
  Inspector probe on the sim (set in settings.html → reload → read back → read from home.html)
  clears or invalidates ~8 shipped mechanisms at once (#274 stash, appearance, drafts, pins,
  exdel, mentions, backup stamp). **Add as an ios-sim-findings row at next device pass.**

## MINOR — fixed in-session

- **A3/A5** updateScreen pending branch: 1 Hz un-deduped `setOnlineStatus` push = full topbar
  teardown every second (focus + aria-live churn) → one-shot on the pending EDGE; symmetric
  `showRequestSentModal("1")` re-push on a mid-session regression into pending (RequestReceived
  excluded — request pane keeps its affordance).
- **A4** accept-while-offline left "Waiting for response" as the sub-line forever → unlock block
  pushes `chat-offline` explicitly; pending edge re-arms the presence bool.
- **#276 → #263 regression [B+C converged]:** new `tx.address` bypassed global hide — with balance
  hidden, the tx sheet showed the FULL counterparty base58 + copy button under masked amounts →
  address now rides the hide flag (push-time + `_raw` + `applyWalletVisibility`); comments + the
  false-green smoke assertion updated (address-search dead while hidden = same dial as name).
- **C1** `DecidePolicy` catch could double-invoke `decisionHandler` (native NSException the managed
  catch can't intercept) → one-shot `decide` wrapper both directions + guarded logging.
- **R2 (re-review):** the #283 delete-history fix's empty `clearMessages` dropped the request pane
  with no requestAdd left to re-arm it (locked chat, no Accept/Decline) → pane survives while the
  `'incoming'` lock holds.
- **D1** csproj sim-RID default keyed `!= 'Release'` → forced the SIMULATOR RocksDB slice onto
  custom device configs (Ad-Hoc/AppStore) → now `== 'Debug'`.
- **D2** MacCatalyst NativeReference pointed at a machine-local gitignored dylib → clean-clone
  builds died at link → `Exists()`-gated.
- **C10** `ios-sim-findings.md` crash-triage stated the #280-guard root cause that #281 DISPROVED
  (selector-lookup abort dies BEFORE managed code; the guard cannot log it) and iOS-27's next-step
  reasoned from it → both corrected (check the .ips for a marshalling/lookup abort FIRST).
- **C8** `docs/archive/fable-build-brief-missing-bits-batch-b.md` was binary-to-git via ONE NUL
  byte (#255 debris class, invisible to grep/rg) → stripped.

## MINOR — flagged, NOT fixed (owner)

- **isContact misclassification (B-NIT/C-3):** truncated `name` ≠ full `address` → tx sheet titles
  "Sent to 3JDN…vBq" + gradient avatar for strangers. Component fix (`wallet-shell.js:343` — home
  should pass `contact:` explicitly like `wallet_sent.html` does) → **next bundle-rebuild batch**.
- **C7 — `_to_delete_index.lock`/`.lock2` are TRACKED** (gitignore can't untrack): Damir —
  `git rm --cached _to_delete_index.lock _to_delete_index.lock2` + commit; the 07-22 handoff's
  "gitignored/untracked, just trash them" line is wrong.
- **C6 — nuget.config hardening (Damir/BE call):** local folder feed is unscoped (any nupkg dropped
  in `local-nuget/` can shadow ANY package id) + no `<clear/>` + no lock file; suggested:
  `<packageSourceMapping>` pinning `RocksDB`→local, `*`→nuget.org; record the nupkg sha512 in
  `local-nuget/README.md`.
- **A6 — `onSend`/`onSendFile` have no state guard** (the ⑪ invariant is FE-only; one stale shell
  = silent fake-delivery). 🟡 recommend the same predicate as the lock, refuse + log.
- **Smoke coverage gaps (backlog):** #274 restore is grep-only (a jsdom seed-stash test would have
  caught MAJOR-1); #279's sort-canon delta has no assertion (needs an echo-contact fixture);
  `isRequestRow` (the actual chip-count predicate) unpinned.
- **NITs:** `request-done` rows tint action-blue on legacy accounts (design dial) · `miss.title`
  tooltip duplicates the visible label when uncompacted · RO collapse won't fire in RTL (none
  shipped) · a group that regresses Approved→pending now keeps a stale "Online" sub-line (both
  branches skip groups) · exporting-prefixed-selector completion invoked outside its guard
  (B4 hardening) · D3 csproj RID conditions rely on evaluation order (works today).

## CLEAN (verified)

#273 locale-proof canon carriers + collision-null + chip arithmetic + leave-guard + glyph degrade ·
#274a `!inline` single call-site + mobile sheets byte-untouched + stash is #254-compliant
(view-name only, one-shot, 15 s, whitelisted) · #276 search-vs-display, full address preserved on
copy rows, group chips · #277 byte-exact row parity · #278 no RO loop, no media-query fight, a11y
name survives compact · #280 completion handlers invoked on every path, selector names/arity
correct, no re-entrancy · #275 excludes bots on both paths; RequestReceived double-covered ·
bundle↔source 1:1 (zero orphan hunks), all 16 rebuilt shells carry the identical delta, no NUL in
the range diff · Windows TFM conditional is a no-op on Windows; Android untouched · money/signing
untouched; ★ #221 isolation holds (every new push is same-WebView `sendUiCommand`).

## Also landed this session (pre-review plate items)

- **Launch shells rebuilt — iOS-2 NOW SHIPPED** (`backupIllustration` + `images/backup.svg` in all
  5, zero NUL). ⚠ `build-shells.mjs all` also overwrites the two still-LEGACY demo drop-ins
  (`apps.html`, `wallet_send.html` — money page!); they were restored from HEAD. **Use
  `node scripts/build-shells.mjs launch` for launch rebuilds, never `all`.**
- **Delete-history immediacy, both legs:** `loadMessages` pushes `clearMessages` before the empty
  early-return (shell's 250 ms burst fallback paints the emptied log; R2 pane guard covers the
  RequestReceived edge) · `SettingsPage.onDeleteHistory` re-renders every live conversation via
  `Utils.getChatPages()` · **`getChatPages()` gained the HomePage detail-content branch** — it
  missed the most-visible desktop chat for ALL its callers (onLowMemory eviction exclusion,
  reloadScreen-all, now delete-all).

## Damir — build/test/commit

Components UNCHANGED → **NO bundle rebuild**. Shells already rebuilt in-session (17 + the 5 launch;
NUL-swept; fixes verified in built output). The device VM killed long node runs this session →
**run `node scripts/smoke-test.mjs` locally** (expect the #276 assertion label change). Then build
net10.0-windows (NOT Rebuild — changed: SingleChatPage, SettingsPage, Utils, iOSWebViewHandler,
Spixi.csproj) and F5:
1. Account pane → Language → pick Deutsch → **pane returns ON the Language picker, new check,
   translated UI** (the #274 verdict, finally testable).
2. Open a "Request sent" 1:1 → locked + waiting strip; a GROUP chat → composer LIVE, no strip.
3. Delete history from contact details with the chat open → **log empties immediately**; Settings →
   delete all history with a desktop pane open → pane empties.
4. Wallet: hide balance → tap a row → sheet shows NO address row; unhide → address + copy back.
5. Sim (when next on the Mac): launch/onboarding backup illustration renders (iOS-2).
Commit hygiene: `git rm --cached _to_delete_index.lock _to_delete_index.lock2` · delete
`_to_delete/review-273-281/` (session scratch) · CRLF churn on Raw/html + .cs is the known checkout
noise (`--ignore-cr-at-eol` shows the real delta).
