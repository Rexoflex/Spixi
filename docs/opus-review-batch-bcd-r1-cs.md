# Opus #46 loop — Batch B+C+D AUDIT r1, AUDITOR 1 (the C#)

Date 2026-08-24 · Scope: the C# half of Batches B, C, D (DECISIONS #543–#549).
Method: reading only. `node scripts/cs-syntax-check.mjs` → **144 files parse clean · 1 known
grammar skip**. No tree file was modified except this report. Ixian-Core read at
`/root/Ixian-Core` (frozen 097341a).

---

## FINDINGS

| # | Rank | Item | Where | What is wrong |
|---|---|---|---|---|
| MAJOR-1 | MAJOR | C1 — `NetworkUtils.isolate()` is a ONE-WAY DOOR: after the wipe the process has NO NETWORK for the rest of its life | `SettingsPage.xaml.cs:1086` · `Ixian-Core/Network/Network.cs:646` · `NetworkClientManagerBase.cs:249,126,218` | `isolate()` = `pause()` on NetworkClientManager + NetworkServer + StreamClientManager. `pause()` sets the instance field `paused = true` (`:251`). `stop()` (`:218`) does NOT clear it, `start()` does NOT clear it — only `resume()` does, and **nothing in Spixi ever calls `NetworkClientManager.resume` / `StreamClientManager.resume` / `NetworkUtils.resumeNetworkOperations`** (grep: only `Node.resume()`, which is the main-loop restart, App.xaml.cs:1067/1306, MauiProgram:117/167/188). The managers are static singletons, so `paused` survives the whole process. After `wipeEverything` the user creates or restores an account in-process → `goHome()` → new `HomePage` ctor → `Node.start()` + `Node.connectToNetwork()` (HomePage.xaml.cs:331-336) → `NetworkClientManager.start(2)`: the initial wait loop is skipped (`IxianHandler.forceShutdown` is also latched `true` by `IxianHandler.shutdown()`, IxianNode.cs:288, with a private setter and no reset), then `reconnectLoop` runs `if (!paused)` forever. **Result: no relay, no stream, empty lists — and a restart recovers.** That is F-3's symptom, produced by a THIRD mechanism #545 does not name and does not close. ★ It is NEW on this route: the old `onDeleteAccount` (`git show HEAD:…:1112-1155`) called `wipeAccountData()` only — no isolate, no shutdown. Only the retired delete-WALLET route had it. |
| MAJOR-2 | MAJOR | B2 — the recipient's invite is NOT removed; it becomes a GHOST CARD | `Ixian-Core/Streaming/Friends/Friend.cs:949-980` · `SingleChatPage.xaml.cs:2251-2318` | `handleMsgDelete` (CoreStreamProcessor.cs:1665) → `friend.deleteMessage(id, channel)`, which does **not delete anything**: it sets `fm.message = ""` and leaves the `FriendMessage` in the list with `type` intact (`:961`). The live chat page gets a `deleteMessage` UI command (StreamProcessor.cs:459 → UIHelpers:313 → SingleChatPage:2465) so it LOOKS removed while the chat is open. On the recipient's next load, `insertMessage` takes the `appSession` branch (`:2251`) with `message.message == ""` → `app_id = ""`, `app_name = ""`, `am.getApp("")` = null → `app_state = "Missing"`, and it pushes `addAppRequest` with an EMPTY id and name — a nameless, iconless invite card that still offers Join/Decline on an empty app id. #544's "**the RECIPIENT'S invite is REMOVED through the existing delete path**" is false past the first reload; what the peer keeps is worse than either "removed" or "Canceled". |
| MAJOR-3 | MAJOR | D1 — `SingleChatPage.onResume()` IS NEVER CALLED in overlay mode, so the missed-call row is never cleared by opening the chat | `App.xaml.cs:1221-1227` · `SingleChatPage.xaml.cs:2804-2826` · `HomePage.xaml.cs:1987` | App.OnResume dispatches `onResume()` to `((NavigationPage)MainPage).CurrentPage` **only**. Since #225 a conversation is an OVERLAY inside HomePage's grid (`pushPageLoaded(new SingleChatPage(...), 4000, "chat", …)`, HomePage:1987) — the nav stack's last page is HomePage, never the chat. `SingleChatPage` is the ONLY `override void onResume` in the tree (grep), and it is the one page that is structurally never `CurrentPage`. So the new D1 block (`:2816-2825`) and the pre-existing `clearNotifications` (`:2813`) are dead on the normal mobile path. #549's "**Opening the conversation that holds the missed-call bubble clears THAT contact's call row (the one place it is seen)**" is false: with the sweep now sparing call rows, nothing clears them at all — the row sits on the shade until the user swipes it or another call to the same contact replaces it. **Fix:** move the cancel into `onLoad()`, beside the existing `clearNotifications` at `SingleChatPage.xaml.cs:937` (that block runs on every open). |
| MAJOR-4 | MAJOR (device-confirmable) | D1/iOS — `OneSignalNative.Notifications.ClearAll()` runs ONE LINE BEFORE the sparing sweep and is documented as an app-wide `removeAllDeliveredNotifications` | `Platforms/iOS/SPushService.cs:260-281` | The new enumerated sweep is written to spare `call-<id>` rows, but `ClearAll()` executes first, on every tick. The OneSignal iOS SDK implements `Notifications.clearAll()` as `[UNUserNotificationCenter removeAllPendingNotificationRequests] + [removeAllDeliveredNotifications]` — i.e. every delivered row for the app, ours included. If that holds on device, the whole iOS half of D1 is a no-op and the prefix sparing is moot. The SDK is not vendored here (`local-nuget` has RocksDB only), so this is stated as a reading + an open device question — but the fix is free and safe either way: **delete the `ClearAll()` call from `clearNotifications` on iOS.** The enumerated `RemoveDeliveredNotifications(ids)` below it is a strict superset minus call rows (OneSignal's rows live in the same `UNUserNotificationCenter` and are enumerated by `GetDeliveredNotifications`). Note the Android twin is fine: `clearRemoteNotifications` there is called immediately after posting our own local row (`Node.cs:1024-1025`) and message notifications demonstrably survive, so Android's `ClearAllNotifications()` only touches SDK rows. |
| MINOR-1 | MINOR | C1 — step 6 (`wipeLocalState`) is a fire-and-forget JS eval racing its own teardown | `SettingsPage.xaml.cs:1115` · `SpixiContentPage.cs:361-375,389-399` · `:983-1005` | `Utils.sendUiCommand` → `sendMessage` → `evaluateJavascript`, which wraps the call in `MainThread.BeginInvokeOnMainThread`. `wipeEverything` already runs ON the main thread, so the eval is queued to a LATER turn; control returns and the `finally` runs `goToWelcome()` in the SAME turn → `popToRootAsync()` (parks the page, `parkOnClose` is true) → `disposeParkedOverlay()` (queues the Dispose) → `PushAsync(LaunchPage)`. FIFO dispatcher order happens to favour the wipe (the eval was queued first), but `EvaluateJavaScriptAsync` only SUBMITS the script — nothing guarantees it executed before the WebView is destroyed, and there is no confirmation. The one enumerated step with no receipt is the one that can silently not happen. **Fix:** post `goToWelcome()` one dispatcher turn later, or have the shell answer `wipeLocalStateDone` and route on that with a timeout fallback. |
| MINOR-2 | MINOR | C1 — seven destructive calls under ONE try; a throw in the first skips the rest | `SettingsPage.xaml.cs:1096,1120-1129` | `wipeEverything` carefully wraps every OTHER step individually, but step 3 is `try { wipeAccountData(); }` around seven statements. `deleteAllAvatars` (LocalStorage.cs:852) and `deleteAllDownloads` (`:890`) are bare `Directory.Delete(path, true)` — they throw `IOException` if any file in the tree is open (Windows) and `DirectoryNotFoundException` if the folder is gone. Either throw skips `deletePendingMessages`, `deleteEntireHistory`, `deleteAccounts` and `FriendList.clear()`, and the user lands on welcome with their **contact list still on disk** while the log says only "wipe: account data threw". Give each line its own try, matching the rest of the method. |
| MINOR-3 | MINOR | C1 — "closed by step 1" is conditional on `Node.running` | `Node.cs:559-566` · `SettingsPage.xaml.cs:1091-1092` | `IxianHandler.shutdown()` → `Node.stop()`, which early-returns `if (!running)`. In that case nothing closes RocksDB and step 2 deletes the directories under an open database again — the exact bug C1 exists to fix, silently. Cheap belt: call `Node.storage.stopStorage()` / `Node.activityStorage.stopStorage()` (both idempotent) immediately before the two `deleteData()` calls. |
| MINOR-4 | MINOR | C3 — the tap is still swallowed in the `preloadPending` window | `SpixiContentPage.cs:1906-1917` vs `:1937-1945, 2029-2034` | `claimWarmingOverlay` inspects `activePreload` only. `pushPageLoaded` sets `preloadPending = true` under the lock and assigns `activePreload = op` in a LATER dispatcher turn (`:2031`). A tap landing in that window sees `activePreload == null` → no claim → `getParkedOverlay()` null → `pushPageLoaded` hits `if (preloadPending || activePreload != null)` and disposes the new target: the tap does nothing, exactly the regression the loop-r1 fix targets, one turn earlier. Narrow, but real (the WebView navigating callback and the queued staging block are two separate main-thread items). **Fix:** have `warmParkedOverlay` record the pending warm target (type + a flag) under the same lock, and let `claimWarmingOverlay` clear it in the pending window too. |
| MINOR-5 | MINOR | C3 — a CLAIMED warm page presents with no geometry re-check and on the 6 s timeout | `SpixiContentPage.cs:1906-1917` · `HomePage.xaml.cs:1872-1875, 2440-2448` | The parked path is guarded (`!railPane && !parkedSettings.isPaneMode`, HomePage:1878-1880) precisely because pane geometry does not survive a breakpoint crossing (#315/A9). The claim path has NO such guard: it returns before `railPane` is consulted. Warm at narrow → resize to wide/rail during the load → tap → the page presents full-span with no rail inset and no `setPaneMetrics`. Second-order: warm uses `timeoutMs = 6000` vs the tap path's 4000, so a claimed page whose WebView wedged shows a blank Account for up to 6 s. Re-check the mode inside the claim (dispose + fresh construct on mismatch), and drop the claimed op's timeout to the tap budget. |
| MINOR-6 | MINOR | B1 — the guard and the row are two different predicates | `HomePage.xaml.cs:4125` vs `:2128` / `index.html:5002-5006` | The fix (`f.state == FriendState.RequestSent`) is correct and fail-closed, but the C# row it serves is built on `friend.state != FriendState.Approved` (`:2128`) and the shell recognises it by excerpt text + a non-empty status type (`isRequestSentPush`). The non-Approved-but-not-RequestSent states (`RequestReceived`, `Ignored`, `Unknown`, and `FriendType.Payment` friends created at CoreStreamProcessor.cs:3247 with `state = Unknown, approve: false`) can still paint a "Waiting for response" row; if one ever carries a localSender marker the menu offers Revoke and the verb always answers `fail`. Either widen to `state != Approved` for non-bot 1:1s, or make the C# row emission itself `state == RequestSent`. (Also: the comment cites "HomePage:2122"; the line is 2128.) |
| NIT-1 | NIT | C1 — `Preferences.Default.Clear()` and the same-run boot | `SettingsPage.xaml.cs:1112` · `App.xaml.cs:222-236,254-256` · `ThemeManager.cs:35-61` | Nothing the LaunchPage needs is re-read from Preferences in the same run: the language lives in `SpixiLocalization`'s statics (only read from Preferences at App startup, `:224`) and the appearance in `ThemeManager.activeAppearance` + the injected `SpixiThemeMode` string. **The welcome screen does NOT boot in English or in light — it keeps the user's language and theme for the rest of the run.** On the NEXT start: appearance is absent → `automatic` (follow the OS), language is absent → `CultureInfo.CurrentCulture` (the device language, `:231`). **My view: acceptable, and correct fresh-install semantics** — the only thing lost is a deliberate choice of a language different from the device's. If you want one carry-over, make it `language` (re-`Set` it right after the Clear); appearance is better left at automatic. `uid` (device id) and `windowWidth/Height` also go — fresh-install, fine. |
| NIT-2 | NIT | C1 — `getWalletStorage()` throws, never returns null | `Ixian-Core/Meta/IxianNode.cs:319-326` | `wallets[primaryWalletAddress.addressNoChecksum]` — a `KeyNotFoundException` (or NRE) on an empty list. The `if (ws != null …)` at SettingsPage:1102 is dead defensiveness; the surrounding try makes it harmless (a second wipe logs "wipe: deleteWallet threw" and continues). |
| NIT-3 | NIT | C1 — an improvement worth recording | `SettingsPage.xaml.cs:1099-1109` vs `HEAD:…:1033` | The old route gated the ENTIRE teardown on `walletGone`, so a missing/already-deleted wallet file meant nothing at all was cleaned. The new code logs and carries on. Good. |
| NIT-4 | NIT | C3 — first-open staleness is new | `SpixiContentPage.cs:1022-1080` · `SettingsPage.xaml.cs:85-198` | `representParkedOverlay` deliberately does not re-run `onLoad`, so the FIRST Account open now shows nickname/avatar/address/language/lock/notif state captured at boot + 900 ms, not at tap time. Only `updateScreen()` (the unread badge) is refreshed. This is #315's accepted trade extended to the first open; nothing on that page changes from outside it today, so it is correct — but it is a new surface for that class of bug. |
| NIT-5 | NIT | D1 — `clearRemoteNotifications` on iOS is unreachable | `Platforms/iOS/SPushService.cs:187-189` | `public static void clearRemoteNotifications(int unreadCount) { return; …}` — dead body behind an unconditional `return` (pre-existing, not this batch). It means `Node.cs:1025`'s post-then-clear is a no-op on iOS, which is the only reason MAJOR-4 is not also firing on every posted message row. Worth deleting or fixing deliberately rather than by accident. |

---

## VERIFIED CLEAN

**Q1 — did shutdown-first break the account half of the wipe? NO. It made it safer.**
Every method `wipeAccountData()` calls is filesystem- or memory-only and has no dependency on a
started `localStorage`:

| call | file:line | what it is |
|---|---|---|
| `localStorage.deleteAllAvatars()` | `Ixian-Core/Streaming/Storage/LocalStorage.cs:852` | `Directory.Delete(avatarsPath, true)` + recreate |
| `localStorage.deleteAccountFile()` | `LocalStorage.cs:463` | `File.Delete` under `accountLock` |
| `localStorage.deleteAllDownloads()` | `LocalStorage.cs:890` | `Directory.Delete(Downloads, true)` + recreate |
| `CoreStreamProcessor.deletePendingMessages()` | `CoreStreamProcessor.cs:2640` → `PendingMessageProcessor.deleteAll():625` | `pendingRecipients.Clear()` + `Directory.Delete` |
| `FriendList.deleteEntireHistory()` | `FriendList.cs:491` → `Friend.deleteHistory():533` | metaData write (`saveMetaData():1084`, pure file I/O) + `localStorage.deleteMessages():780` (`Directory.Delete`) + `flushHistory():523` (in-memory) |
| `FriendList.deleteAccounts()` | `FriendList.cs:479` → `Friend.delete():1132` | `Directory.Delete(accountsPath/<addr>, true)` |
| `FriendList.clear()` | in-memory | — |

The ONLY `running` guard in `LocalStorage` is `requestWriteMessages` (`LocalStorage.cs:640-642`,
throws "local storage is not running"), and it is **not** on this path — its callers are
`setMessageReceived/Sent/Error`, `deleteMessage`, `addReaction` (Friend.cs:717/753/786/976/1038)
and the send paths, none of which the wipe touches. `LocalStorage.stop()` (`:144-160`) only
`flush()`es and joins the 1 Hz storage thread.
★ Running the deletes AFTER `stop()` is strictly BETTER than the legacy order: `stop()` flushes
pending writes first, and the storage loop can no longer re-create a `Chats/<addr>` directory a
moment after `deleteMessages` removed it. **No reorder is needed for the account half.**
`WalletStorage.deleteWallet()` (`Ixian-Core/Wallet/WalletStorage.cs:1315-1325`) is `File.Delete` +
in-memory `reset()` — it works after shutdown and needs no node.
`IxianHandler.balances` IS a public static `Dictionary<Address, Balance>` (`Meta/IxianNode.cs:120`);
`IxianHandler.wallets` likewise (`:145`). Both `.Clear()` calls are valid.
The SettingsPage WebView IS still alive at step 6: `Node.shutdown()` (`Node.cs:693-697`) calls
`HomePage.stop()` → `removeDetailContent(false)` (`HomePage:3667`), which disposes the legacy
detail pane only, never the overlay stack; the page is closed by `goToWelcome()` in the `finally`,
after `wipeEverything` returns. (See MINOR-1 for the eval-vs-teardown race that follows.)

**Q2 — both F-3 claims are CORRECT as written, and (a) is stronger than stated.**
(a) `IxianHandler.balances` is `Dictionary<Address, Balance>` and `Dictionary.Add` throws
`ArgumentException` on a duplicate key. `Node.loadWallet` does exactly that at **`Node.cs:279`**,
and `IxianHandler.addWallet(...)` runs BEFORE it — so the wallet registers and then the throw
lands. `git show HEAD:Spixi/Pages/Settings/SettingsPage.xaml.cs | grep balances` → **empty**: no
`Clear`, no `Remove`, nowhere on the old delete path (grep across the whole tree finds only three
`balances.Add` sites — Node.cs:279, LaunchPage.xaml.cs:486, and the Core API server — and no
`Clear` at all before this batch). ★ The RESTORE path itself goes through `Node.loadWallet()`
(`LaunchPage.xaml.cs:664` restore-account-file, `:693` restore-wallet-file, `:704` unlock), so a
delete → restore-the-same-backup in one process hits the duplicate key with certainty, leaves the
wallet registered but the balance list inconsistent, and "a restart recovers" because the static
starts empty. That is a precise match for F-3's report.
(b) `RocksDBStorage.deleteData()` (`Storage/RocksDBStorage.cs:1432-1438`) and
`ActivityStorage.deleteData()` (`Activity/ActivityStorage.cs:1176-1182`) are bare
`Directory.Delete(pathBase, true)` — they never look at `openDatabases`, never close a handle.
The old `deleteWalletWork` called them at `HEAD:…:1079-1080` and `IxianHandler.shutdown()` at
`HEAD:…:1083` — deletion under an open RocksDB, confirmed. The new order closes correctly:
`Node.stop()` → `storage.stopStorage()` (`IStorage.cs:86-111`: cancel loop, join task, then
`shutdown()` → `closeDatabases()` + `compact()`), deterministic, no background re-creation.

**Q3 — the park mechanics are correct.**
`op.stage` is created `Opacity = 0, InputTransparent = true` (`SpixiContentPage.cs:1959-1962`) and
the park branch (`:2326-2355`) never flips either — only the present branches do.
`representParkedOverlay` flips **both** (`:1057-1058`), and also re-sends `onRepresented`,
re-runs `onOverlayPresented` and `updateScreen()`.
`PreloadOp.tryFinish()` is `Interlocked.Exchange(ref done, 1) == 0` (`:639-642`), so the
`Task.Delay(timeoutMs).ContinueWith(_ => presentPreload(op, "timeout"))` fired after a successful
park returns immediately — confirmed harmless.
`warmParkedOverlay` passes `parkOnClose = true` (7th positional arg of
`pushPageLoaded(target, timeoutMs, "settings", -1, null, default, true, true)`, `:1894`), so a
user-close of the warm page parks it again via `closeOverlay`'s `op.parkOnClose && pageLoaded`
gate (`:1470`). ✔
The claim/park flip race is CLOSED: `parkOnLoadNow(op)` reads under the lock (`:2221-2224`) and
there is no `await` between that read and the `lock` that assigns `parkedOverlay` (`:2336-2343`) —
both `claimWarmingOverlay` (from the WebView navigating callback) and the park branch run on the
main thread, so they cannot interleave there. ✔
`SettingsPage` while hidden: the ctor is `InitializeComponent()` + `loadPage(webView,
"settings.html")` only — no network, no storage (`SettingsPage.xaml.cs:44-54`). `onLoad()`
(`:85-198`) pushes state and does **no** measurement, focus, `applyPlatformPageChrome` or status-bar
repaint — nothing that misbehaves off-screen. Its only I/O is `Utils.imageToDataUri(avatarPath)`
(`:197`), a file read + base64. So "zero boot cost by construction" is honest: nothing runs before
the first paint, and the 900 ms delay after `clearChatsDone` is real
(`HomePage.xaml.cs:2429-2457`). `rightContent.IsVisible` is read inside the main-thread lambda
after the delay — correct. ✔ (Residual gaps: MINOR-4, MINOR-5.)

**Q4 — the platform bindings are right.**
Android: `NotificationManager.GetActiveNotifications()` → `StatusBarNotification[]`; `.Tag`
(string, `getTag()`) and `.Id` (int, `getId()`) both exist; `Cancel(string tag, int id)` and
`Notify(string tag, int id, Notification)` both exist. The API-23 guard
(`Build.VERSION.SdkInt >= BuildVersionCodes.M`) is correct for `GetActiveNotifications`, the pre-M
fallback logs before it sweeps, `sbn.Tag == CALL_TAG` resolves to the `string ==` value comparison,
and an untagged row's `Cancel(null, id)` is equivalent to `cancel(id)`. ✔
iOS: `UNUserNotificationCenter.Current.GetDeliveredNotifications(Action<UNNotification[]>)`,
`RemoveDeliveredNotifications(string[])`, `RemovePendingNotificationRequests(string[])` are the
correct binding names; `n.Request.Identifier` is the right property. ✔
The id scheme holds on both platforms: the incoming row (`Node.cs:1024`, kind `"call"`) and the
missed re-post (`VoIPManager.cs:220-227`, kind `"call"`) use the same
`SNotificationPrefs.notificationIdFor(addr, true)` and the same tag/prefix, so the missed row still
REPLACES the incoming one. ✔
Other `clearNotifications` callers: `SingleChatPage:937` (loader, at unread 0), `SingleChatPage:2813`
(onResume — see MAJOR-3), `HomePage:3077` (the ~1 s tick). None of them wants a blanket
`CancelAll`; no caller regresses from the narrowed sweep. `SNotificationServiceExtension` does not
call it (grep). Windows/MacCatalyst are no-op services. ✔

**Q5 — the corrected predicate is right, and the old one would have been wrong twice over.**
`Friend.approved` is `public bool approved = true;` (`Ixian-Core/Streaming/Friends/Friend.cs:196`)
and the ctor default is `bool approve = true` (`:233`) — #399 confirmed. The only writes in Spixi
are `approved = true` (SingleChatPage:1177, HomePage:3961). So `!f.approved` was dead for outgoing
rows, exactly as the r1 comment says. Worse: the ONLY friends created with `approve: false` are the
INCOMING `RequestReceived` ones (CoreStreamProcessor.cs:1763/1837) and the `FriendType.Payment`
ones (`:3247`) — so had `!approved` "worked", the revoke would have fired on precisely the wrong
set. All three outgoing sites set `FriendState.RequestSent` (ContactNewPage:256,
SpixiContentPage:3157, SingleChatPage:1646), so `f.state == FriendState.RequestSent`
(`HomePage.xaml.cs:4125`) is the correct signal. ✔ (Predicate-width caveat: MINOR-6.)

**Q6 — `sendMsgDelete` exists and the recipient DOES act on an `appSession` id.**
`CoreStreamProcessor.sendMsgDelete(Friend friend, byte[] msg_id, int channel = 0)` at
`Ixian-Core/Streaming/CoreStreamProcessor.cs:2852`; Spixi's `StreamProcessor` derives from
`CoreStreamProcessor`, so `StreamProcessor.sendMsgDelete(...)` resolves to the inherited static. ✔
The receive path (`:1349-1366` → `handleMsgDelete:1665`) has **no type filter** — it calls
`friend.deleteMessage(id, channel)` for any message type, `appSession` included, and pushes
`UIHelpers.deleteMessage` to a live chat page. So B2's mechanism is wired. What that call actually
DOES to the row is MAJOR-2. `selectedChannel` is 0 for a 1:1 (`SingleChatPage.xaml.cs:35`, and
`:75` reads `metaData.lastMessageChannel`, which is 0 for non-bots; the guard excludes bots
anyway), so the channel passed to `sendMsgDelete` matches B1's channel 0. ✔

**Also clean:** `IxianHandler.shutdown()` resets `status` on the next `Node.start()`
(`Node.cs:170`), so only `forceShutdown` latches (MAJOR-1); the `deleteInFlight` one-shot,
the two-hop `BeginInvokeOnMainThread`, and the `finally`-routes-to-welcome shape are unchanged
and still correct; `warmAccountAfterFirstPaint`'s `accountWarmed` latch is per-HomePage-instance
and fires once (`HomePage.xaml.cs:2429-2435`).

---

## VERDICT

**4 MAJOR · 6 MINOR · 5 NIT — NOT ready as claimed.** The C# is well-shaped and the three
mechanisms the batch went looking for are real and correctly identified (both #545 F-3 candidates
verify, `handleMsgDelete` verifies, the D1 tick sweep verifies), but three of the batch's own
outcome claims do not survive reading: #545's "closed by this order" misses a third, sufficient
cause of "no network" that this batch newly puts on the delete-account route (MAJOR-1); #544's
"the recipient's invite is removed" is false past one reload and leaves a ghost card (MAJOR-2);
and #549's "opening the conversation clears that contact's call row" runs in a method that is
never dispatched in overlay mode (MAJOR-3), with the iOS half additionally undone one line
earlier by the SDK's own blanket clear (MAJOR-4). MAJOR-1 and MAJOR-3 are one-line fixes;
MAJOR-4 is a deletion; MAJOR-2 needs a decision (a real remote-remove in Ixian-Core = RC1/BE, or
render the blanked `appSession` row as the "Canceled" tombstone on the recipient side too).
