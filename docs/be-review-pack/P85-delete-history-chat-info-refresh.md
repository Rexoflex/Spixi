# P85 · "DELETE HISTORY": CHAT INFO RE-SCANS AND SHOWS NOTHING OF THE DELETED HISTORY; CHAT INFO'S DELETE RUNS THE SENT-COPY SWEEP (batch fixb3, item 2)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (deleted items stop showing; my own Sent copies of that chat leave the disk as on the other delete paths) | none | none: no verb, push name, cap, `spixi.*` key or pref; the existing push `setSharedItems` gets two more call sites; two type-only warns; ⚠ chat info now runs a FILE-DELETING sweep it did not run before (the Sent sweep, row 1 below) | built, NO switch (a hole-closing fix, #1321) · ⚠ C# UNCOMPILED (`ContactDetails.xaml.cs`, `HomePage.xaml.cs`; `FixB3ChatInfoRules.cs` runs in the harness) | 10 min |

**Look here first:** `ContactDetails.onRemoveHistory`, `pushSharedItems`, `refreshSharedItemsAfterDelete`, the
`ixian:sharedDeleteLocal` re-push, the `ixian:sharedView` main-thread push (`Spixi/Pages/Contacts/ContactDetails.xaml.cs`);
`HomePage.onRemoveHistoryFor`; `Spixi/Utils/FixB3ChatInfoRules.cs`; `SharedItems.scan(…, remember)` + `SharedItems.remember`
(`Spixi/Utils/SharedItems.cs`).

**DECISIONS:** #1744 (3) (Damir, a main-chat row) · #1106 · #1190 · S9 #46 r1 m-3 · #1321 · this batch: #1811.

## The finding, first (data at rest)
| What | Where | Before | Now |
|---|---|---|---|
| my Sent copies of files I sent in that chat | `<spixiUserFolder>/Sent/` | chat info › Delete history did NOT run the Sent sweep (the three other delete paths do): the copies stayed until a later delete elsewhere | chat info uses `SContacts.removeHistory` (one body), which runs the sweep: a copy that NO remaining history names, older than 10 min, leaves. ⚠ LIMIT (#46 r1 S m-3, recorded, not changed): a copy YOUNGER than `SentSweepMinAgeSeconds` (600 s, `Spixi/Utils/SContacts.cs:383`–`:386`; a send in flight is never touched) is skipped, and no later pass is scheduled for it — it stays until a later delete on any path runs the sweep again |
| received files that were downloaded | `<spixiUserFolder>/Downloads/` | kept by every "Delete history" unless the chats-list sheet's box "Delete media & files" is ticked (CH3); chat info has no box; Account › Downloads lists them | unchanged (a choice of the redesign) — question Q-2 |
| the kept thumbnails / waveforms (Android) | the photo1a store | deleted on both paths | unchanged |

## What changed and why (the view)
- **Before:** chat info asks for its media / files / links ONCE at open (`ixian:sharedItems` → one `setSharedItems`). After
  Delete history nothing asked again: on Windows the chat-info pane stays open beside the chat, so it kept showing the deleted
  history's media and files (WALK #1540, the remark on SW-S5-ROTATE).
- **Now:** after a SUCCESSFUL delete, `onRemoveHistory` pushes `removeHistoryResult` (as before), then re-runs the page's own scan
  off the UI thread and pushes `setSharedItems` again — an empty history gives `[]`, and the shell drops the section and closes
  an open "See all" cover (shell unchanged; proven in jsdom on the built shell). A per-page `SharedScanGate` gives each scan a
  token; on the main thread only the LATEST scan of a live page pushes, so a late boot scan or a "Delete from this device"
  re-scan cannot paint the deleted items again. The chats-list "Delete chat" (`HomePage.onRemoveHistoryFor`) tells every open
  chat-info overlay of that contact to re-scan (only on `ok`).
- `onRemoveHistory`'s body is now `SContacts.removeHistory(friend)` (the chats-list path's body): the same local-store clears,
  `ChatMediaStore.deleteChat`, `arrivals.forgetAddress`, the contacts flush and the chat reload, plus the Sent sweep. Order: the
  chat reload now runs before the `removeHistoryResult` push (two different WebViews; neither reads the other).
- **The cache of the scan (#46 r1 S m-1):** `SharedItems.scan` wrote its per-address cache (`lastScan`, read by `resolve()` for
  `sharedView` / `sharedShow` / `sharedOpen` / `sharedDeleteLocal` / `sharedShowInDownloads`) when IT finished — so a slow OLDER
  scan that the gate drops could still write the deleted history's items back after the re-scan, and `resolve()` then answered
  old tokens. Now `scan(friend, remember: false)` at the two gated sites (`pushSharedItems`, the `sharedDeleteLocal` re-push)
  and `SharedItems.remember(scanned, items)` on the main thread right AFTER the gate passed, before the push: the same key, the
  same `cacheLock`, never throws. The default `remember = true` keeps the old write for any other caller (today there is none).
  The cache stays static per address: two open pages of ONE contact share it, as before.
  **(#46 r2 S n-1)** The cache is emptied at the delete; the re-scan writes the new list: `onRemoveHistory` (on success, after the
  viewer reset) and `refreshSharedItemsAfterDelete` (inside its try) call `SharedItems.remember(friend, new List<SharedItem>());`
  BEFORE `pushSharedItems()` — so between the delete and the re-scan's push `resolve()` answers no token of the deleted history.
- **A viewer decode in flight (#46 r1 S m-2):** `onRemoveHistory` (on success, first) and `refreshSharedItemsAfterDelete` set
  `viewerLatest = null`; the `sharedView` task's `stillWanted` reads it after the decode AND (new) again on the main thread
  right before the `viewerImage` push (that check was `isDisposed` only) — so a decode of the deleted history, in flight or
  already queued, pushes nothing. NOT here: an OPEN viewer in the shell whose item left the list (the shell's half, `src/**`).
- **No switch:** the old path is the fault (deleted data visible / on disk), #1321; #1478 adds no flag duty.

## Recorded, not changed
- A phone's chat info is a pushed page, not an overlay: the chats-list path does not tell it; a re-open makes a new page, which
  scans an empty history.
- The `ixian:sharedDeleteLocal` re-push takes a gate token too (`sharedScanGate.begin()` before its task), so a delete-from-device
  re-scan and a history-delete re-scan never paint over each other; the one that began LAST pushes.
- Fail closed (#46 r1 S N-3): when the NEWEST scan throws (a type-only warn), the gate has already dropped the older scan's
  answer — the shell keeps what it showed last (after a delete: possibly the deleted items) and the cache keeps the last list
  that passed a gate, until the next ask or re-open. Nothing wrong is pushed; the good answer can be lost.
- A STAGING `ContactDetails` (made, not yet an overlay) is not in `getOverlayPages()`, so the chats-list path does not tell it
  (#46 r1 S N-2). Not reachable by hand: a staging page becomes the overlay in the same open, and its own boot scan runs after.
- Between the delete and the re-scan's push (one scan of an empty history), the shell still shows the old tiles; the cache is
  already empty (#46 r2 S n-1), so a tap in that window resolves nothing: the viewer gets the EMPTY answer (`viewerImage(token, "")`),
  never an image or data (#46 r3 S n-2).
- (#46 r3 S n-4) `onRemoveHistory` tells only its own page. A SECOND open `ContactDetails` of the same contact (the one
  `ContactNewPage` makes outside the `chatinfo` tag) keeps its tiles, and a scan of it still in flight can pass its own gate and
  write the old list back into the shared static cache. The base had the same stale second pane. Fix direction: one helper that
  walks the overlay pages, as `HomePage.onRemoveHistoryFor` does.
- (#46 r4 S n-4) `stillWanted` compares the token TEXT: a second tap of the same tile inside the one-scan window after the delete
  can re-arm an old decode of that tile (not reachable by hand: a modal alert follows the delete). Fix direction: a per-tap counter.
- (#46 r4 S n-7, Core, inherited) with no `Chats/<address>` folder Core's `deleteMessages` returns false and `deleteHistory` returns
  before `flushHistory()`: nothing is cleared and nothing is pushed, as at the base.
- (#46 r3 S n-5) Remove contact / Leave group from the chats list do not tell an open chat-info page and do not empty the cache
  (inherited; outside item 2).
- (#46 r2 S n-2) If `SContacts.removeHistory` throws AFTER the Core delete (a local-store clear, the sweep's scheduling, the store
  delete, the flush or the chat reload), `onRemoveHistory` skips the viewer reset, the cache empty, the `removeHistoryResult`
  push and the re-scan (the exception leaves `onRemoveHistory`, which has no catch of its own). Order: the chat reload now runs before the
  `removeHistoryResult` push. No evidence that any of those steps throws today; a re-open of chat info scans the empty history.
- (#46 r2 S n-6) Two "Delete from this device" taps inside one pool reorder: each takes a gate token, only the LAST-begun scan
  pushes; if that scan ran before the FIRST tap's delete finished, the first row may still show "on this device" until the next
  scan (a re-open, another delete). Not reachable by hand (two confirms, each a sheet).
- Ixian-Core (BE-only, CORE-18 in `core-asks.md`): `LocalStorage.writeMessages` copies the list BEFORE it takes `messagesLock`
  (`Streaming/Storage/LocalStorage.cs:673`–`:677`; `deleteMessages` `:780`), so a write racing the delete can write the deleted
  history back, and a write pending after the delete can log the contact's address (`:236`) — legacy (#46 r1 S N-4).
- Settings › Delete all history (`ixian:deleteh`, `SettingsPage.xaml.cs` — another session's file): a chat-info page open at
  that moment is not told (desktop only; Settings is a tab). A later batch.
- Q-2: received downloads stay after chat-info Delete history (no box there). A shell change (Fix batch 4) or as is.

## Proof
csh `FixB3ChatInfoTests` (7: tokens increase; only the last is latest; 8 threads × 10 000) · pin
`scripts/pins-fixb3/b-delete-history.mjs` k1 the body, k2 `SContacts.removeHistory` runs the sweep and the store call, k3 the
gate (`pushSharedItems` held WHOLE; the delete-from-device re-push scans `Friend scanned = friend;`), k4 the HomePage hook on
`ok` only, k5 the BUILT `contact_details.html` in jsdom: `setSharedItems` → `removeHistoryResult` + `setSharedItems("[]")` → no
section, the cover closed, k6 the cache written after the gate (`SharedItems.cs` is not in csh: a text read) + (#46 r2 S n-1) emptied at the two delete
sites before the re-scan, k7 the viewer token reset + the main-thread re-check, (#46 r2) k2 also `SentSweepMinAgeSeconds = 600`
(n-4), k8 the sharedView / sharedDeleteLocal push target is `this` (m-1), k9 no line starting with `#` in the raw
`ContactDetails.xaml.cs` (n-3; the hidden-code class #1627 is in the pin's limits) · re-based (after a look): `pins-photo1a/b-store`, `pins-s4/fixr1`, `pins-s8/cs-wiring`,
`pins-s5/viewer` (also `viewOffUi` / `delOffUi` for m-1 / m-2), `pins-s6/probe` (`bothScans`), inline smoke
`offUiThreadNoBots` · walk rows W-1, W-2, A-1.
