# Spixi JS↔C# Bridge Audit — Part A (Chat, Contacts, Home, Launch, Wallet)

Repo root: `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi`
Scope: every `.xaml.cs` in `Spixi\Spixi\Pages\{Chat, Contacts, Home, Launch, Wallet}` — 16 files / 16 page classes.

---

## 0. Shared bridge infrastructure (context for all pages)

### `Utils\SpixiContentPage.cs` (base class `SpixiContentPage : ContentPage`)

**Page loading:** `loadPage(webview, "file.html")` sets `webView.Source = generatePage(file)` and hooks `Navigated`/`Navigating`. `generatePage` runs the HTML through `SpixiLocalization.localizeHtml` (Android: inline `HtmlWebViewSource` from assets; other platforms: writes a localized copy `ll_<file>.html` to the HTML folder and loads by URL). Platform `#if` branches: `#if WINDOWS` in `webViewNavigating` grabs `CoreWebView2` to disable the status bar and enable DevTools; `#if IOS || MACCATALYST` and `#if ANDROID` blocks in `checkIfPageLoaded` apply safe-area/edge-to-edge padding.

**C#→JS transport:** `sendMessage(msg)` → if `pageLoaded`, `evaluateJavascript(msg)` (wraps as `try{ <script> }catch(e){}` via `EvaluateJavaScriptAsync` on the main thread); otherwise the message is **queued** in `messageQueue` and flushed after `Navigated` fires and `document.readyState == "complete"`.

**`Utils.sendUiCommand(page, command, params string[] args)`** (in `Utils\Utils.cs`) builds:
```js
executeUiCommand(<command>, 'base64(arg1)', 'base64(arg2)', ...);
```
- `command` is emitted **unquoted** — the JS side receives it as a bare identifier (a function reference), so every command below is a global JS function name.
- Every argument is a **Base64-encoded UTF-8 string** (`escapeHtmlParameter` = `Convert.ToBase64String`); the JS side must decode. `null` args are emitted as JS `null`.
- There is no JSON; everything is positional stringly-typed args.

**JS→C# transport:** the page JS navigates to `ixian:<command>[:params]` URLs. Each page's `onNavigating` handler does `HttpUtility.UrlDecode(e.Url)` first, then matches with `Equals`/`StartsWith`/`Contains` and cancels navigation (`e.Cancel = true`). Params are parsed by `Substring(prefix.Length)` or `Split` on the prefix — **the raw URL-decoded remainder of the string**, positional `:`/`|` separators, no escaping. Most pages allow `file:` URLs (or any unmatched URL, see per-page notes) to navigate normally.

**Global handler `onNavigatingGlobal(url)`** — called first by most pages (NOT by the Launch pages or OnboardPage):

| Command | Params | Behavior |
|---|---|---|
| `ixian:appAccept:<address>:<sessionId>` | `Split(':')`, positional [2]=address, [3]=hex session id | Accept VoIP call if session matches, else accept mini-app request and push its `MiniAppPage` |
| `ixian:appReject:<address>:<sessionId>` | same | Reject VoIP call or mini-app request |
| `ixian:hangUp:<sessionId>` | `Substring` | `VoIPManager.hangupCall` |

**Base-class C#→JS calls (inherited by all pages, driven by `updateScreen()` / VoIP events):**

| JS function | Args (all Base64 strings) | Trigger |
|---|---|---|
| `displayCallBar(sessionIdHex, text, callStartedTime)` | hex hash, display text, unix-time string | VoIP call in progress (from `displayAppRequests`, or external callers) |
| `hideCallBar()` | — | call ended |
| `clearAppRequests()` | — | start of `displayAppRequests()` (runs when `UIHelpers.refreshAppRequests` is set, checked in `updateScreen()` — called every second by HomePage's UI tick and on `OnAppearing`) |
| `addAppRequest(sessionIdHex, text, acceptLabel, rejectLabel)` | 4 strings | pending (unaccepted) mini-app session |
| `addCallAppRequest(walletAddress, sessionIdHex, text)` | 3 strings | incoming unanswered VoIP call |

Also shared: `displaySpixiAlert(...)` (native MAUI `DisplayAlert`, not webview), `popPageAsync`/`popToRootAsync`/`removePage` navigation helpers with explicit `Dispose()` of webviews.

---

## 1. Pages\Chat\SingleChatPage.xaml.cs

**Class:** `SingleChatPage : SpixiContentPage` — **HTML:** `chat.html`
Constructors: `(Friend)` and `(Friend, HomePage?)`. When constructed with a `HomePage` it is embedded as the right-hand detail pane (split view) instead of pushed as a page; several actions then delegate to `homePage.*` instead of `Navigation.PushAsync`. Constructor also calls `StreamProcessor.fetchFriendsPresence(friend, true)` and starts hidden (`webView.Opacity = 0`, faded in on load).

### JS→C# commands (after `onNavigatingGlobal`)

| Command | Param parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `onLoad()`: full page init (see C#→JS list) |
| `ixian:back` | — | `popToRootAsync()` if nav stack > 1 |
| `ixian:request` | — | Request IXI from friend: `homePage.onReceiveIxi(friend)` or push `WalletReceivePage(friend)`; blocked (log error) for bots/groups |
| `ixian:details` | — | Contact details: `homePage.onContactDetails(friend)` or push `ContactDetails(friend, true)` |
| `ixian:send` | — | Send IXI: `homePage.onSendIxi(...)` or push `WalletSendPage(ExtendedAddress(friend, OfflineTag))`; blocked for bots/groups |
| `ixian:accept` | — | Accept friend request: `friend.approved = true`, `StreamProcessor.sendAcceptAdd` |
| `ixian:loadmore` | — | `messagesToShow += Config.messagesToLoad`, reload messages |
| `ixian:call` | — | Toggle VoIP: hang up if `VoIPManager.isInitiated()` else `initiateCall(friend)` |
| `ixian:sendmedia` | — | Fire-and-forget `onSendFile(true)` → native image picker → `TransferManager.prepareFileTransfer` → send `fileHeader` SpixiMessage; blocked for bots / blind groups |
| `ixian:sendfile` | — | Same with generic file picker (`onSendFile(false)`) |
| `ixian:acceptfile:<transferId>` | `Substring` | Look up `FriendMessage` by `transferId` in selected channel → `onAcceptFile` → `TransferManager.prepareIncomingFileTransfer` + `acceptFile`; group handling resolves actual sender friend; blocked for blind groups |
| `ixian:openfile:<transferId>` | `Substring` | `SFileOperations.open(fm.filePath)`; iOS fallback: retry from `TransferManager.downloadsPath` (comment: "Handle special case for iOS") |
| `ixian:chat:<message>` | `Substring` (entire remainder = message text) | `onSend`: trims, optionally validates balance vs. bot message cost (builds a throwaway `Transaction` to estimate), stores message via `Node.addMessageWithType`, sends `clearInput` to JS, `CoreStreamProcessor.sendChatMessage` |
| `ixian:viewPayment:<msgIdHex>` | `Substring` | For `sentFunds` (or `:`-prefixed) messages: resolve txid → `homePage.onTransaction` or push `WalletSentPage`. For received `requestFunds`: `onConfirmPaymentRequest` → `homePage.onConfirmPaymentRequest` or push `WalletContactRequestPage` |
| `ixian:app:<appId>` | `Substring` | Start mini-app session with friend: create `MiniAppPage` (via homePage or directly), then `StreamProcessor.sendAppRequest` + store `appSession` message; blocked for bots |
| `ixian:installApp:<url>` | `Substring` | `Node.MiniAppManager.fetch(url)` then push `AppDetailsPage(app, null, true, friend)` (via homePage if present) |
| `ixian:joinApp:<appId>` | `Substring` | Join existing app session: push `MiniAppPage` (via homePage if present) |
| `ixian:loadContacts` | — (`StartsWith`) | `loadContacts()`: push bot/group participant list to JS |
| `ixian:populateChannelSelector` | — | Push each bot channel to JS via `addChannelToSelector` |
| `ixian:selectChannel:<index>` | `Substring` + `Int32.Parse` | Switch `selectedChannel`, echo `setSelectedChannel` to JS, reload messages |
| `ixian:contextAction:<action>:<msgIdHex>[:<data>]` | double `Substring`: action = up to next `:`, remainder = msgId, optional `:data` suffix split again inside `onContextAction` | Message context menu (see sub-table below) |
| `ixian:enableNotifications` | — | Set `friend.metaData.botInfo.sendNotification = true`, save, `sendBotAction(enableNotifications, [1])` |
| `ixian:disableNotifications` | — | Same with `false` / `[0]` |
| `ixian:sendContactRequest:<address>` | `Substring` → `new Address(...)` | Add friend (state `RequestSent`), save, `StreamProcessor.sendContactRequest`, `resubscribeEvents` if approved |
| `ixian:kick:<address>` | `Substring` | `onKickUser`: `sendBotAction(kickUser, ...)` + native alert |
| `ixian:ban:<address>` | `Substring` (note: substring computed twice, second one used) | `onBanUser`: `sendBotAction(banUser, ...)` + native alert |
| `ixian:typing` | — | `StreamProcessor.sendTyping(friend)` |
| `ixian:leave` | — | Bots/groups only: send leave (`sendLeave`), remove friend (or `pendingDeletion` for bots), alert, `popPageAsync` + `homePage?.removeDetailContent()` |
| `ixian:openLink:<url>` | `Substring`; prefixes `http://` if no `://`; `WebUtility.HtmlDecode` | Opens external browser (`Browser.Default.OpenAsync`) — note obsolete-API pragma |
| `ixian:undorequest` | — | `FriendList.removeFriend(friend)`, pop page, remove detail content (TODO in code: notify other party) |
| `file:...` | — | Allowed through (`e.Cancel = false`) — local file navigation only |

`ixian:contextAction` sub-actions (`action` values): 
- **`tip`** (data = amount): builds tx to message sender (`ExtendedAddress` with `OfflineTag`), balance/amount validation with native alerts, adds `tip:<txid>` reaction, `sendReaction`, `IxianHandler.addTransaction`
- **`sendContactRequest`**: add sender of message as friend + send contact request
- **`kickUser`** / **`banUser`**: resolve sender address of msg → `onKickUser`/`onBanUser`
- **`report`**: bots only — `sendMsgReport` + delete local message
- **`deleteMessage`**: `sendMsgDelete`; local delete + JS `deleteMessage` echo for non-bots
- **`like`**: adds `like:` reaction (blind-group case derives a group address via `GroupChat.DeriveGroupAddress`), `sendReaction`, updates reactions in JS

### C#→JS calls (`Utils.sendUiCommand` unless noted)

| JS function | Args (positional strings, Base64) | Trigger |
|---|---|---|
| `onChatScreenReady(friendAddress)` | wallet address | `onLoad()` first call |
| `hideBackButton()` | — | `onLoad()` when embedded in HomePage split view |
| `setChatMode(type, cost, costText, admin, serverDescription, sendNotification)` | type: "0" 1:1 / "1" group / "2" blind group / "3" bot; cost decimal string; bools as `.ToString()` ("True"/"False") | `onLoad()` — **arity mismatch:** bot/group branch sends 6 args, 1:1 branch sends only 4 (`"0","0.00000000","","False"`) |
| `setSelectedChannel(index, icon, channelName)` | icon hardcoded `"fa-globe-africa"` | `onLoad()` and `ixian:selectChannel` |
| `addChannelToSelector(index, name, icon, unread)` | unread = "True"/"False" | `ixian:populateChannelSelector` |
| `setChannelSelectorStatus("")` | single empty string | `onLoad()` when any bot channel has unread |
| `showRequestSentModal(flag)` | "1" show / "0" hide | `onLoad()` when `FriendState.RequestSent`; hidden from `updateScreen()` once approved |
| `showCallButton("")` | empty string | background task in `onLoad()` if audio codecs supported and friend approved |
| `clearMessages(showMore)` | "true"/"false" (lowercase literals) | `loadMessages()` |
| `addMe(...)` / `addThem(...)` (prefix chosen by `localSender`) | `msgIdHex, address, nick, avatarPath, message, timestamp, sent, confirmed, read, paid, errorSending` (11 args; bools `.ToString()`) | per standard message in `loadMessages()`/`insertMessage()` |
| `showContactRequest("1")` | — | `insertMessage` when a `requestAdd` message arrives and friend not approved |
| `addPaymentRequest(msgIdHex, txid, address, nick, avatar, label, amount, status, statusIcon, timestamp, localSender, confirmed, read, enableView)` | 14 args; `localSender` slot is `""` for remote messages; status text localized; icon is a FontAwesome class | `insertMessage` for `requestFunds` and `sentFunds` messages |
| `addFile(msgIdHex, address, nick, avatar, uid, name, timestamp, localSender, confirmed, read, progress, completed, paid)` | 13 args; progress "0"/"100" | `insertMessage` for `fileHeader` |
| `addAppRequest(msgIdHex, appId, appName, appImage, address, nick, avatar, timestamp, localSender, confirmed, read, appState, appInstallUrl)` | 13 args; appState `""` or `"Missing"`; **overloads/shadows the base-class 4-arg `addAppRequest`** — both are sent to the same page | `insertMessage` for `appSession` messages (local/remote branches are byte-identical) |
| `addCall(msgIdHex, text, declined, timestamp)` | declined "True"/"False" | `insertMessage` for `voiceCall`/`voiceCallEnd` |
| `clearInput()` | — | after sending a chat message |
| `deleteMessage(msgIdHex)` | — | `deleteMessage()` public API (called from contextAction + external stream events) |
| `showUserTyping()` | — | `showTyping()` (called externally when friend is typing) |
| `addReactions(msgIdHex, reactionsStr)` | reactionsStr = `"key:count;key:count;"` packed string | `updateReactions` (after loading each message, on reaction events) |
| `updateMessage(msgIdHex, message, sent, confirmed, read, paid, errorSending)` | 7 args | `updateMessage()` public API (stream events) |
| `updateFile(uid, progress, complete)` | progress numeric string | `updateFile()` (transfer progress) + after accepting a file |
| `updateGroupChatNicks(address, nick)` | — | external nick updates |
| `updateTransactionStatus(txid, status, statusIcon)` | localized status text | `updateTransactionStatus()` (tx confirmation events) |
| `updatePaymentRequestStatus(msgIdHex, txid, status, statusIcon, enableView)` | 5 args | `updateRequestFundsStatus()` (called by `WalletContactRequestPage` and stream events) |
| `clearApps()` / `addApp(appId, name, icon, publisher)` | 4 args | `loadApps()` on load/resume — only apps with `MultiUser` capability |
| `onChatScreenLoaded()` | — | end of background init in `onLoad()` |
| `setNickname(nick)` | — | `updateScreen()` (every second) when nickname changed |
| `setOnlineStatus(text)` | localized "Online"/"Offline"/"Waiting for response"/member-count string | `updateScreen()` (bots: member count each tick; 1:1: on state change) |
| `showWarning(text)` | localized connectivity warning or `""` to clear | `updateScreen()` — relay-node/DLT connectivity, with 1-cycle delay counter |
| `setUnreadIndicator(count)` | number string, "0" clears | `updateScreen()` |

### Data contract summary
- **In:** friend identity (address, nickname, avatar), chat mode + bot metadata (cost, admin, description, notifications), channel list + selection, full message history (typed renderers: text / payment / file / app / call), reactions, read/sent/confirmed status, typing indicator, online status, connectivity warnings, unread badge, installed multi-user apps, call bar / app requests (base class).
- **Out (events):** send text, send media/file, accept/open file transfer, accept friend request / undo request, request/send IXI, view payment, start/join/install app, channel select, context actions (tip/like/delete/report/kick/ban/contact request), typing, call toggle, notifications toggle, leave group, open external link, load more.

### Notable
- Blocking `Thread.Sleep(100)` loop (up to 5 s) in `onLoad()` waiting for bot info; pops page with alert on timeout.
- `selectedChannel = 0;` hard reset marked `// TODO: remove this after groupchat UI improvements` overrides the persisted channel.
- `OnDisappearing` sets `webView = null` (the field), unusual vs. base `Dispose`.
- Message read receipts (`msgRead` SpixiMessage) sent from `updateMessageReadStatus` when app in foreground.
- `convertToBot()` reloads the chat via HomePage when a contact turns out to be a bot.

---

## 2. Pages\Contacts\ContactDetails.xaml.cs

**Class:** `ContactDetails : SpixiContentPage` — **HTML:** `contact_details.html`
Constructor `(Friend, bool customChatButton = false)` — `customChatBtn=true` when opened from a chat, so `ixian:chat` just pops back.

### JS→C# (after `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `onLoad()`: `setAddress`, `updateScreen()` |
| `ixian:back` | — | `popPageAsync()` |
| `ixian:remove` | — | Remove contact (bots: mark `pendingDeletion` + `sendLeave`; others: `FriendList.removeFriend`), native alert, on success `popToRootAsync()` + `HomePage.Instance().removeDetailContent()` |
| `ixian:removehistory` | — | `friend.deleteHistory()` + alert |
| `ixian:request` | — | Push `WalletReceivePage(friend)` |
| `ixian:send` | — | Push `WalletSendPage(ExtendedAddress(friend, OfflineTag))` |
| `ixian:chat` | — | Pop (if `customChatBtn`) else push `SingleChatPage(friend)` |
| `ixian:txdetails:<txid>` | `Split` on prefix (uses `Contains`, so matches anywhere in URL); `Transaction.txIdLegacyToV8` | Look up activity; push `WalletSentPage(activity.transaction)` |
| `ixian:userdefinednick:<nick>` | `Split` on prefix | `friend.setUserDefinedNick(nick)` |
| anything else | — | **Allowed through** (`e.Cancel = false`) — broader than the `file:`-only allowance in chat/home |

### C#→JS

| JS function | Args | Trigger |
|---|---|---|
| `setAddress(address)` | — | `onLoad()` |
| `setNickname(nick)` | — | `updateScreen()` (every second) |
| `setAvatar(path)` | `""` if none | `updateScreen()` |
| `showIndicator(online)` | "true"/"false" | `updateScreen()` |
| `clearRecentActivity()` | — | `loadTransactions()` (from `updateScreen()`, i.e. re-sent every second) |
| `addPaymentActivity(txid, type, time, amount, confirmed)` | type = localized Sent/Received; confirmed "true"/"error" | per activity involving this friend |

### Data contract
- **In:** address, nickname, avatar, online indicator, recent transaction list (rebuilt every tick).
- **Out:** back, remove contact, delete history, send/request IXI, open chat, open tx details, set user-defined nickname.

### Notable
- The whole transaction list is cleared and re-pushed **every second** via `updateScreen()` — a performance smell.
- Uses `Contains` (not `StartsWith`) for parameterized commands.

---

## 3. Pages\Contacts\ContactNewPage.xaml.cs

**Class:** `ContactNewPage : SpixiContentPage` — **HTML:** `contact_new.html`
Constructors: `()` and `(string wal_id)` (pre-filled address). Exposes `pickSucceeded` event (`EventArgs<string>` = contact address) — used by `WalletRecipientPage`/`HomePage` to chain flows.

### JS→C# (after `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | If `wallet_to_add` preset → `setAddress` to JS |
| `ixian:back` | — | `OnBackButtonPressed()` → pop |
| `ixian:error` | — | Native "invalid address" alert (JS-side validation failed) |
| `ixian:request:<address>` | `Split` on prefix (`Contains`); try/catch → invalid-address alert | `onRequest`: validate `ExtendedAddress`, reject self-address & existing friends (revives `pendingDeletion` ones), `FriendList.addFriend(RequestSent)` + `sendContactRequest` + `requestAddSent` message; then fire `pickSucceeded` or pop |
| `ixian:quickscan` | — | Push `ScanPage`, subscribe `scanSucceeded` → `processQRResult` |
| `ixian:qrresult:<data>` | `Split` on prefix | `processQRResult`: if payload contains `:ixi`, take prefix as wallet; else accept raw string of length 20–128 → `setAddress` to JS |
| `ixian:checkAddress:<address>` | `Substring` (`StartsWith`) | Try `new ExtendedAddress(address)`; on success send `onValidAddress()` to JS (silent on failure) |
| anything else | — | Allowed through |

### C#→JS

| JS function | Args | Trigger |
|---|---|---|
| `setAddress(address)` | — | onload (preset), QR scan result |
| `onValidAddress()` | — | `ixian:checkAddress` success |

### Data contract
- **In:** optional pre-filled address, address-validity feedback.
- **Out:** add-contact request, QR scan request/result, live address validation, back, error.

### Notable
- QR results can arrive two ways: native `ScanPage` event or JS `ixian:qrresult:` (in-page scanning).
- `pickSucceeded` turns this page into a reusable "contact picker" component.

---

## 4. Pages\Home\EmptyDetail.xaml.cs

**Class:** `EmptyDetail : SpixiContentPage` — **HTML:** `empty_detail.html`
Placeholder for the right pane of HomePage's split view.

- **JS→C#:** `ixian:onload` (no-op), `ixian:back` (no-op); global handler checked; everything else allowed through.
- **C#→JS:** none (only inherited base-class calls).
- **Data contract:** none. `OnBackButtonPressed` swallows the hardware back button.

---

## 5. Pages\Home\HomePage.xaml.cs

**Class:** `HomePage : SpixiContentPage` — **HTML:** `index.html`
Singleton (`HomePage.Instance(force_new)`), starts the Ixian node (`Node.start()` + `connectToNetwork()` on a background task) in its constructor. Hosts a two-pane layout (`mainGrid` + `rightContent`); `OnPageSizeChanged` collapses to single-pane under 700 px width. Injects localization variables before load: `miniAppsStartNoteHidden`, `devMode`, `apps-not-sure-text`, later `OnboardingComplete`.

### JS→C# (after `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `onLoaded()`: push onboarding modal if `onboardingComplete` pref missing, `setAsRoot()` (Android nav-stack workaround), refresh flags, initial JS pushes, fade in, `checkForRating()` |
| `ixian:wallet` | — | Deprecated no-op |
| `ixian:quickscan` | — | Push `ScanPage` → `processQRResult` |
| `ixian:qrresult:<data>` | `Split` (`Contains`) | `processQRResult`: `<addr>:send...` → push `WalletSendPage`; otherwise open `ContactNewPage(address)` with `pickSucceeded` chained into chat creation |
| `ixian:filter:<all\|sent\|received>` | `Split` | `filterTransactions` → sets `transactionFilter` (0/1/2) + `loadTransactions(true)` |
| `ixian:balance:<hide\|show>` | `Split` | Toggle `hideBalance`, persist pref `hidebalance` |
| `ixian:newchat` | — | `newChat()`: push `WalletRecipientPage(true,false)` (multi-contact picker) → on pick, create 1:1 or group chat (`GroupChat.CreateGroup`, optional group avatar from `WalletRecipientPage.temporaryImagePath`, sends `createGroup` SpixiMessage) then `onChat` |
| `ixian:newcontact` | — | Push `ContactNewPage` |
| `ixian:newapp` | — | Push `AppNewPage` |
| `ixian:sendixi` | — | `onSendIxi(null)` → push `WalletSendPage()` |
| `ixian:receiveixi` | — | `onReceiveIxi(null)` → push `WalletReceivePage()` |
| `ixian:avatar` | — | Commented out (dead command) |
| `ixian:settings` | — | `fromSettings = true`; push `SettingsPage` (page regenerates `index.html` on return via `OnAppearing`) |
| `ixian:lock` | — | Push `SetLockPage` |
| `ixian:activity` | — | TODO no-op |
| `ixian:about` / `ixian:guide` | — | Open external browser (`Config.aboutUrl` / `Config.guideUrl`) |
| `ixian:backup` | — | Push `BackupPage` |
| `ixian:encpass` | — | Push `EncryptionPassword` |
| `ixian:chat:<address>` | `Split` (`Contains`) | `onChat`: split-view → embed `SingleChatPage(friend, this)` in right pane + `selectChat` echo; narrow → `PushAsync(SingleChatPage)` (duplicate-page guard via `Utils.getChatPage`, pops to root first; commented-out Windows multi-window code) |
| `ixian:details:<address>` | `Split` | Push `ContactDetails(friend)` (cancels if friend unknown) |
| `ixian:txdetails:<txid>` | `Split`, `txIdLegacyToV8` | `onTransaction`: split-view → embed `WalletSentPage(tx, true, this)` + `selectTx` echo; narrow → push |
| `ixian:tab:<tabId>` | `Split` | Track `currentTab`; `tab2` → `loadTransactions(true)`, `tab3` → `loadApps(true)` |
| `ixian:downloads` | — | `PushModalAsync(DownloadsPage)` |
| `ixian:contributors` | — | `PushModalAsync(ContributorsPage)` |
| `ixian:share` | — | Native share sheet with primary wallet address |
| `ixian:rating:<yes\|no>` | `Split` | yes → store rating URL per-platform (`DeviceInfo.Platform` Android/iOS); no → support email URL; open browser + set pref `rating_action=done` |
| `ixian:copy` | — | Empty handler (no-op) |
| `ixian:sendLog` | `StartsWith` | Zips `ixian.log` (+ `ixian.0.log`) into `spixi.log.zip` and opens native share (`SFileOperations.share`) |
| `ixian:onboardingComplete` | — | `completeOnboard()`: pref + localization var + regenerate `index.html` |
| `ixian:joinBot` | — | `joinBot()`: add hardcoded "Spixi Group Chat" friend (`419jmKRK...`) + contact request |
| `ixian:startApp:<appId>` | `Substring` | Push single-user `MiniAppPage` |
| `ixian:startAppMulti:<appId>` | **`StartsWith("ixian:startAppMulti")` (no colon) but `Substring("ixian:startAppMulti:".Length)`** | Push `WalletRecipientPage(false,false)` picker → `onJoinApp` + `sendAppRequest` + `appSession` message |
| `ixian:appDetails:<appId>` | `StartsWith("ixian:appDetails")` but `Substring("ixian:appDetails:".Length)` | Push `AppDetailsPage(appId)` |
| `ixian:explorer` | — | Open block-explorer URL for own address |
| `ixian:miniAppsStartNoteHidden` | — | Persist pref + localization var |
| `ixian:enableDevMode` / `ixian:disableDevMode` | — | Toggle `devMode` pref + localization var |
| `ixian:dev` | — | `PushModalAsync(DevPage)` |
| `ixian:spixiAppsLink` | — | Open `Config.spixiAppsUrl` in browser |
| `file:...` | — | Allowed through |

**Ordering hazard:** `ixian:startAppMulti` is checked **before** `ixian:appDetails`, and both prefix checks omit the trailing colon; a bare `ixian:startAppMulti` (no arg) would throw on `Substring`. Also `ixian:startApp:` is checked before `ixian:startAppMulti` — safe only because the first check includes the colon.

### C#→JS

| JS function | Args | Trigger |
|---|---|---|
| `selectTab(tabId)` | e.g. "tab1" | `onLoaded()` |
| `loadAvatar(path)` | own avatar path | `onLoaded()`; again from `updateScreen()` when `Node.changedSettings` |
| `setVersion(versionString)` | `Config.version + " BETA (" + startCounter + ")"` | `onLoaded()` |
| `setAddress(extendedAddress)` | primary address with `OfflineTag` flag | `onLoaded()` |
| `setHideBalance(bool)` | "True"/"False" | `onLoaded()` |
| `selectChat(address)` | address or `""` (clear) | split-view chat selection / `removeDetailContent` |
| `selectTx(txid)` | — | split-view tx selection |
| `clearContacts()` / `addContact(address, nickname, avatar, online, unreadCount)` | online "true"/"false" | `loadContacts()` when `UIHelpers.shouldRefreshContacts` (checked每 tick) |
| `setUnreadIndicator(count)` | total unread | `loadChats()` |
| `clearChats()` / `addChat(address, nickname, timestamp, avatar, online, excerpt, type, unreadCount)` | type ∈ `""`,`typing`,`read`,`confirmed`,`pending`,`default`; excerpt is localized per message type | `loadChats()` (sorted by timestamp desc) |
| `clearChatsDone()` | — | end of `loadChats()` |
| `updateChat` — actually re-uses `addChat` | same 8 args | `updateChat(friend)` public API (single-row refresh) |
| `clearPaymentActivity(filter)` | "all"/"sent"/"received" | `loadTransactions()` (on tab2, filter change, or `shouldRefreshTransactions`) |
| `addPaymentActivity(txid, received, counterpartyText, time, amount, fiatAmount, confirmed)` | received "0"/"1"; confirmed "true"/"false"/"unknown"/"error" | per activity (rejected+reverted+pending first, then finals) — **7-arg variant, differs from ContactDetails' 5-arg function of the same name (different HTML)** |
| `toggleAnimatedSlider("backup-prompt")` | — | `displayBackupReminder()` per `Config.backupReminder` interval |
| `updateDebugInfo(html)` | pre-built HTML string with network/stream/offline message counters | `updateDebugOverlay()` every tick when `devMode` |
| `showWarning(text)` | update-available or connecting-DLT text, `""` clears | `updateScreen()` (update check via `UpdateVerify` + connectivity) |
| `setBalance(balance, fiatBalance, nickname)` | human-formatted strings | `updateScreen()` every second |
| `setContactStatus(address, online, unread, excerpt, timestamp)` | from `contactStatusCache` (thread-safe producer `setContactStatus`, consumer flush each tick) | `updateContactStatus()` |
| `showRatingPrompt()` | — | `checkForRating()` (Android/iOS only, pref `rating_action == "show"`) |

### Data contract
- **In:** version, own address/avatar/balance (+fiat), hide-balance flag, contact list, chat list with excerpts/status glyphs, payment activity + filter, unread badges, contact presence deltas, connectivity/update warnings, backup reminder, rating prompt, dev debug overlay, tab/selection state.
- **Out:** tab switching, chat/contact/tx selection, new chat/contact/app, send/receive IXI, QR scan, settings/lock/backup/encpass navigation, share address, log export, onboarding completion, join official bot, mini-app start/details, dev-mode toggles, external links, rating response, balance-visibility & tx filter.

### Notable
- HomePage owns the 1-second UI tick: `OnUpdateUI()` calls `updateScreen()` on the top nav-stack page and on the embedded detail page.
- `App.startingScreen` (push-notification deep-link) is consumed inside `updateScreen()` and routed into `onChat`.
- `fromSettings` forces a full `loadPage(index.html)` re-render when returning from Settings (localization/theme may have changed).
- `calculateReceivedAmount(tx)` static helper shared with `SingleChatPage`/`WalletSentPage`.
- Platform checks via `DeviceInfo.Platform` (rating URLs, rating prompt) rather than `#if`.

---

## 6. Pages\Home\OnboardPage.xaml.cs

**Class:** `OnboardPage : SpixiContentPage` — **HTML:** `onboarding.html`
Modal pushed by HomePage on first run. Emits `onboardDone` event (`EventArgs<bool>` = joinBot flag).

### JS→C# (NO `onNavigatingGlobal` call)

| Command | Behavior |
|---|---|
| `ixian:back` | `Navigation.PopModalAsync()` |
| `ixian:joinbot` (`Contains`) | `joinBot = true`; `finishOnboarding()` → fire `onboardDone(true)` + `PopModalAsync(false)` |
| `ixian:error` | Native alert (empty-nickname localization keys — including a typo'd key `"global -dialog-ok"`) |
| `ixian:finish` | `finishOnboarding()` → `onboardDone(joinBot)` + pop modal |
| else | Allowed through |

- **C#→JS:** none.
- **Data contract:** out-only events (finish / join bot / back / error). No `ixian:onload` handler despite the pattern.

---

## 7. Pages\Launch\LaunchPage.xaml.cs

**Class:** `LaunchPage : SpixiContentPage` — **HTML:** `intro.html`
Constructor force-loads language `en-us` and persists pref `language`.

### JS→C# (NO `onNavigatingGlobal`; uses **`ixian:introload`** instead of `ixian:onload`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:introload` | — | `onLoad()`: `setVersion`; `showTerms` if terms not yet accepted |
| `ixian:create` | — | Push `LaunchCreatePage` |
| `ixian:restore` | — | Push `LaunchRestorePage` |
| `ixian:accept` | — | `acceptedTerms = true` (in-memory only) |
| `ixian:language:<lang>` | `Substring` | `SpixiLocalization.loadLanguage`, persist pref, **reload `intro.html`**, then `showOnboardingSection` |
| `ixian:appearance:<int>` | `Substring` + `Convert.ToInt32` → `ThemeAppearance` enum | `ThemeManager.changeAppearance`; on change `SPlatformUtils.setEdgeToEdge()` + reload `intro.html` |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `setVersion(version)` | `Config.version` | introload |
| `showTerms()` | — | introload if not accepted |
| `showOnboardingSection()` | — | after language switch (queued across the page reload via `messageQueue`) |

**Data contract:** in — version, terms visibility; out — language/theme selection, terms acceptance, create/restore navigation. Unused `onCreateAccount`/`onRestoreAccount` UI event handlers exist (XAML legacy).

---

## 8. Pages\Launch\LaunchCreatePage.xaml.cs

**Class:** `LaunchCreatePage : SpixiContentPage` — **HTML:** `intro_new.html`

### JS→C# (NO `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `setVersion` |
| `ixian:back` | — | pop |
| `ixian:create:<nick>:<password>` | `Split` on prefix, then nick = text up to first `:`; password = remainder via `Replace(nick+":","")` — **password may contain `:`; a password containing the substring `nick:` elsewhere would be corrupted by the Replace** | `onCreateAccount(nick, pass)`: background thread, wake locks (`SPowerManager`), `Node.generateWallet(pass)`, store nickname + account file, clear onboarding/lock prefs, **stores wallet password in plaintext `Preferences` (`walletpass`, marked TODO encrypt)**, seeds balance list, navigates to `HomePage.Instance(true)` and removes itself |
| `ixian:error` | — | Native empty-nick alert (same typo'd `"global -dialog-ok"` key) |
| `ixian:avatar` | — | `onChangeAvatarAsync`: native image picker → resize 960×960 q80 → write own-avatar file → `loadAvatar` to JS |
| `ixian:restore` | — | Push `LaunchRestorePage` |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `setVersion(version)` | — | onload |
| `loadAvatar(filePath)` | absolute native path | after avatar pick/resize |

**Data contract:** in — version, avatar preview path; out — create account (nick+password), avatar pick, restore, back, validation error.

---

## 9. Pages\Launch\LaunchRestorePage.xaml.cs

**Class:** `LaunchRestorePage : SpixiContentPage` — **HTML:** `intro_restore.html`

### JS→C# (NO `onNavigatingGlobal`; no `ixian:onload`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:back` | — | pop |
| `ixian:selectfile` | — | Native file picker → copies picked bytes to `<userFolder>/<walletFile>.tmp` → `setUploadedFileName` to JS; alerts on error |
| `ixian:restore:<password>` | `Split` on prefix (whole remainder = password, `// Todo: secure this`) | `onRestore`: clears onboarding/lock prefs, stores `walletpass` plaintext pref, then tries `restoreAccountFile` (encrypted `SPIXIACCB1`-headered zip: decrypt with password, verify wallet, move `Acc/`, `account.ixi`, `avatar.jpg`, `wallet.ixi` into place) and falls back to `restoreWalletFile` (bare wallet file verify+move). On success `Node.loadWallet()` + navigate to `HomePage.Instance(true)`; on wallet-verify failure sends `showPasswordError` + `removeLoadingOverlay` |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `setUploadedFileName(path)` | temp file path | after successful file pick |
| `showPasswordError()` | — | wrong password / verify failure |
| `removeLoadingOverlay()` | — | any restore failure path (JS shows a spinner before invoking `ixian:restore:`) |

**Data contract:** in — selected file name, password error, spinner dismissal; out — file selection, restore(password), back.

---

## 10. Pages\Launch\LaunchRetryPage.xaml.cs

**Class:** `LaunchRetryPage : SpixiContentPage` — **HTML:** `intro_retry.html`
Shown when the stored wallet password fails at startup.

### JS→C# (NO `onNavigatingGlobal`; no `ixian:onload`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:back` | — | pop |
| `ixian:proceed:<password>` | `Split` on prefix (`// Todo: secure this`) | `proceed`: stores `walletpass` pref (TODO encrypt), `Node.loadWallet()`; on failure alert + increment attempt counter (after `Config.encryptionRetryPasswordAttempts` replaces itself with `LaunchPage`) + `removeLoadingOverlay`; on success navigate `HomePage.Instance(true)` and remove self |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `removeLoadingOverlay()` | — | wrong password |

**Data contract:** in — spinner dismissal; out — password submission, back.

---

## 11. Pages\Launch\LockPage.xaml.cs

**Class:** `LockPage : SpixiContentPage` — **HTML:** `lock.html`
Constructors `()` and `(bool justConfirm)` (confirm-action mode used from settings). Events: `authSucceeded`, `authWithPassword` (`EventArgs<bool>`).

### JS→C# (NO `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `onLoad()`: `setJustConfirm("True")` if confirm mode; then (unless `Device.RuntimePlatform == Device.WinUI` — **runtime platform branch, not #if**) launch biometric auth via `Plugin.Fingerprint` (`AuthenticateAsync` with `AllowAlternativeAuthentication`); success → `performUnlock()`, failure → native alert |
| `ixian:back` | — | Deliberate no-op (no back from lock screen); hardware back also swallowed |
| `ixian:unlock:<password>` | `Split` on prefix | `doUnlock`: `WalletStorage.verifyWallet(walletFile, pass)`; wrong → alert; right → fire `authWithPassword(true)` then `performUnlock()` (fire `authSucceeded(true)`, and either `PopModalAsync` in confirm mode or `InsertPageBefore(HomePage.Instance(true))` + remove self) |
| `ixian:change` | — | Confirm mode: fire `authSucceeded(false)` + pop modal (i.e. "cancel"); lock mode: push `LaunchPage` (lets user recreate/restore wallet) and remove self |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `setJustConfirm("True")` | — | onload in confirm mode |

**Data contract:** in — confirm-mode flag; out — password unlock, change/cancel. Biometrics happen entirely natively.

---

## 12. Pages\Wallet\WalletContactRequestPage.xaml.cs

**Class:** `WalletContactRequestPage : SpixiContentPage` — **HTML:** `wallet_contact_request.html`
Constructor `(FriendMessage request_msg, Friend, string amount, string date)` — confirmation screen for an incoming payment request.

### JS→C# (after `onNavigatingGlobal`)

| Command | Behavior |
|---|---|
| `ixian:onload` | `setData` push (below) |
| `ixian:decline` | If request not already answered (message not `:`-prefixed): send `requestFundsResponse` SpixiMessage with the msg-id only, rewrite local message to `::`-prefixed (declined marker), persist, live-update any open chat page via `chat_page.updateRequestFundsStatus(..., "declined")`; pop |
| `ixian:send` | `onSend`: validate amount ≥ 0 and balance covers amount+fee (native alerts); `Node.sendTransactionFrom(from, ExtendedAddress(friend, OfflineTag), amount)`; send `requestFundsResponse` (`msgId:txId`), rewrite local message to `:<txid>`, persist, update open chat page status to "pending"; pop |
| `ixian:back` | pop |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `setData(address, nickname, amount, fee, date)` | fee = `ConsensusConfig.forceTransactionPrice` | onload |

**Data contract:** in — requester identity, amount, fee, date; out — send / decline / back.
**Notable:** the "already answered" state is encoded in-band by prefixing the stored message string with `:` (paid) or `::` (declined) — a stringly-typed protocol shared with `SingleChatPage.insertMessage`.

---

## 13. Pages\Wallet\WalletReceivePage.xaml.cs

**Class:** `WalletReceivePage : SpixiContentPage` — **HTML:** `wallet_request.html`
Constructors: `()` (from wallet tab) and `(Friend)` (request from a specific contact).

### JS→C# (after `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `setAddress` (own primary address as `ExtendedAddress` with `OfflineTag`); if friend preset → `addRecipient` |
| `ixian:back` | — | pop |
| `ixian:pick` | — | Push `WalletRecipientPage()`; on pick, `addRecipient` per address, pop picker |
| `ixian:error` | — | Native amount-error alert |
| `ixian:sendrequest:<addr>:<amount>|<addr>:<amount>|...` | `Split` on prefix, then `|`-separated entries each `Split(':')` — positional multi-recipient batch | Per entry: validate address (`ExtendedAddress.Validate`), validate amount (≤1 decimal point, non-zero, non-negative — with distinct alerts), then `onRequest`: `Node.addMessageWithType(requestFunds)` + `StreamProcessor.transactionRequest`; pops on success. Whole loop wrapped in try/catch → generic request-error alert |
| `ixian:addrecipient:<address>` | `Contains("ixian:addrecipient")` then `Split` on `"ixian:addrecipient:"` | Validate; echo `addRecipient(address, address)` (address doubles as nickname) or invalid-address alert |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `setAddress(extendedAddress)` | own receiving address (QR display) | onload |
| `addRecipient(nickname, address)` | — | onload (preset friend), pick flow, `ixian:addrecipient` |

**Data contract:** in — own address, recipient rows; out — send payment request(s), pick contact, manual recipient add, back.
**Notable:** requests only actually go out for recipients who are friends (`FriendList.getFriend != null`) — silently ignored otherwise (`// else error?`).

---

## 14. Pages\Wallet\WalletRecipientPage.xaml.cs

**Class:** `WalletRecipientPage : SpixiContentPage` — **HTML:** `wallet_recipient.html`
Constructor `(bool multiContactMode = false, bool payment = true)`. Event `pickSucceeded` (`EventArgs<(List<ExtendedAddress>, string? groupName, bool blindMode)>`). Also the owner of `static temporaryImagePath` (group avatar staging file, consumed by `HomePage.HandlePickSucceeded`).

### JS→C# (after `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `loadContacts()`; delete stale temp avatar |
| `ixian:back` | — | pop |
| `ixian:newcontact` | — | Push `ContactNewPage`, chain its `pickSucceeded` into this page's pick event |
| `ixian:select:<flag+name>:|<addr>|<addr>...` | **Most complex parse in the audit:** `name` = substring between `ixian:select:` and the next `:`; first char of `name` is the blind-mode flag (`'1'` = true), rest is the group name; then `Split` on `name + ":|"` and `'|'`-split the remainder into `ExtendedAddress` list | `onPickSucceeded(addresses, name, blindMode)` → fires `pickSucceeded` to the caller (WalletSendPage / WalletReceivePage / HomePage newChat / multi-user app start) |
| `ixian:avatar` | — | `onChangeAvatarAsync` (fire-and-forget): pick + resize 960×960 → write to `temporaryImagePath` → `loadAvatar` to JS (group avatar preview) |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `noContacts()` | — | `loadContacts()` when friend list empty |
| `setMultiContactMode()` | — | `loadContacts()` when picker allows multi-select (group creation) |
| `clearContacts()` | — | `loadContacts()` |
| `addContact(address, nickname, avatarPath, online, type)` | type "0" normal / "1" group / "2" bot-or-no-group-capability; online "true"/"false" | per friend; Payment/Temporary friends skipped unless `HomePage.Instance().devMode`; Group friends skipped in `payment` mode |
| `loadAvatar(filePath)` | temp path | after avatar pick |

**Data contract:** in — contact roster with types/avatars, multi-select mode, no-contacts empty state, group-avatar preview; out — selection result (addresses + group name + blind flag), new-contact flow, avatar pick, back.
**Notable:** `OnAppearing` re-runs `loadContacts()` (roster refresh after returning from ContactNewPage). Group name is embedded in the URL and then used as a split token — a group name containing `:|` would break parsing.

---

## 15. Pages\Wallet\WalletSendPage.xaml.cs

**Class:** `WalletSendPage : SpixiContentPage` — **HTML:** `wallet_send.html`
Constructors: `()` and `(ExtendedAddress recipient)` (pre-filled). Step 1 of the send flow (recipient entry).

### JS→C# (after `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `setBalance`; if recipient preset → `addRecipient` (nickname from `FriendList` if known) |
| `ixian:back` | — | pop |
| `ixian:pick` | — | Push `WalletRecipientPage()` → on pick, `addRecipient` per address, pop |
| `ixian:quickscan` | — | Push `ScanPage` → `processQRResult`: handles `<addr>:ixi...`, `<addr>:send:...` and raw address formats → `addRecipient` |
| `ixian:error` | — | Invalid-address alert |
| `ixian:error2` | — | Invalid-amount alert |
| `ixian:send:<address>` | `Split` on prefix (`Contains`) | Validate `ExtendedAddress.Validate` (fail → `showSendingFailedModal`); then on main thread: `showSendingModal`, async `CoreStreamProcessor.resolveExtendedAddress` (network resolution; fail → `showSendingFailedModal`), 200 ms delay (**"WinUI Crash fix"** comment), `hideSendingModal`, push `WalletSend2Page(resolvedAddress)`. A large commented-out block shows a legacy multi-recipient `addr:amount|addr:amount` format ("TODO re-enable in a future update") |
| `ixian:getMaxAmount:<address>` | `Contains("ixian:getMaxAmount")`, `Split` on `"ixian:getMaxAmount:"` | Compute fee via `Node.calculateTransactionFeeFromAvailableBalance` → `setAmount(balance - fee)` |
| `ixian:addrecipient:<address>` | `Contains` + `Split` | Validate → `addRecipient(address, address)` or invalid-address alert |
| `ixian:checkAddress:<address>` | `StartsWith` + `Substring` | Try-construct `ExtendedAddress` → `onValidAddress()` (silent failure) |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `setBalance(balance, fiatPrice)` | raw `IxiNumber.ToString()` + fiat *price* (not fiat balance — differs from HomePage's 3-arg `setBalance`) | onload |
| `addRecipient(nickname, address)` | — | preset recipient, pick flow, QR, manual add |
| `showSendingModal()` / `hideSendingModal()` / `showSendingFailedModal()` | — | during async address resolution in `ixian:send` |
| `setAmount(amount)` | max spendable | `ixian:getMaxAmount` |
| `onValidAddress()` | — | `ixian:checkAddress` success |

**Data contract:** in — balance/fiat price, recipient rows, max amount, address-validity + sending progress modals; out — recipient selection (pick/QR/manual/validate), send (address only — amount handled on page 2), max-amount query, back, errors.

---

## 16. Pages\Wallet\WalletSend2Page.xaml.cs

**Class:** `WalletSend2Page : SpixiContentPage` — **HTML:** `wallet_send_2.html`
Constructor `(ExtendedAddress)`. Step 2: amount entry + broadcast. Fields `to_list`/`totalAmount` are vestigial (single-recipient only).

### JS→C# (after `onNavigatingGlobal`)

| Command | Parsing | Behavior |
|---|---|---|
| `ixian:onload` | — | `setRecipient` (nickname resolution, hardcoded avatar `img/spixiavatar.png`), `setBalance`, `setFees` (fee for `transactionDustLimit` amount) |
| `ixian:back` | — | `OnBackButtonPressed()` → pop |
| `ixian:send:<amount>` | `Split` on prefix (`Contains`); remainder = decimal amount string (implicit `IxiNumber` conversion) | `sendPayment`: reject negative (alert); `Node.prepareTransactionFrom` (null tx → amount alert); `IxianHandler.addTransaction(tx, relayNodes, extendedAddresses, null, true)` broadcast; push `WalletSentPage(tx, view_only:false)` |
| `ixian:getMaxAmount` | — (`Contains`) | fee calc → `setMaxAmount(balance - fee)` |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `setRecipient(nickname, extendedAddress, avatarPath)` | avatar hardcoded | onload |
| `setBalance(balance, fiatPrice)` | as WalletSendPage | onload |
| `setFees(fee)` | dust-limit-based estimate | onload |
| `setMaxAmount(amount)` | (note: page 1 uses `setAmount`, page 2 uses `setMaxAmount` for the same concept) | `ixian:getMaxAmount` |

**Data contract:** in — recipient identity, balance, fee estimate, max amount; out — amount submission (fires the actual on-chain transaction), max-amount query, back.

---

## 17. Pages\Wallet\WalletSentPage.xaml.cs

**Class:** `WalletSentPage : SpixiContentPage` — **HTML:** `wallet_sent.html`
Constructor `(Transaction tx, bool view_only = true, HomePage? home = null)` — transaction detail / post-send confirmation; also embedded as HomePage right-pane detail. Starts at opacity 0, fades in on load.

### JS→C# (after `onNavigatingGlobal`)

| Command | Behavior |
|---|---|
| `ixian:onload` | `onLoad()`: dismiss immediately if `transaction == null`, else `checkTransaction()`; `hideBackButton` if embedded; fade in |
| `ixian:dismiss` | `onDismiss()`: if `!viewOnly` (fresh send) removes the two previous pages (WalletSendPage + WalletSend2Page) from the nav stack — `removePage(stack[count-2])` **twice** — then pops |
| `ixian:viewexplorer` | Opens `<explorerUrl>?p=transaction&id=<txid>` in external browser |
| else | Allowed through |

### C#→JS
| JS function | Args | Trigger |
|---|---|---|
| `clearEntries()` | — | `checkTransaction()` (onload + every tick until final) |
| `addEntry(address, username, avatarPath, amount, fiatAmount, time, type, confirmed)` | type "send"/"receive"; confirmed "true"/"false"/"unknown"/"error"; only first recipient rendered (`// TODO Handle multiple recipients`) | `checkTransaction()` |
| `setReceivedMode()` | — | received-payment branch |
| `setData(amount, fee, time, txid, confirmed)` | fee = tx fee + last two toList outputs (relay-node fees) | `checkTransaction()` |
| `hideBackButton()` | — | onload when embedded in HomePage |

**Data contract:** in — transaction party/amount/fiat/fee/status/time/txid; out — dismiss, open explorer.
**Notable:** `updateScreen()` (per-second tick, driven by HomePage even when embedded) polls `checkTransaction()` until status is `Final`; `lastActivityStatus` guard prevents redundant JS pushes. Received-amount math counts only own addresses in `toList` (mirrors `HomePage.calculateReceivedAmount`).

---

## Cross-cutting observations for the backend review

1. **Two transports, both stringly-typed.** JS→C# is URL-decoded `ixian:` strings parsed with ad-hoc `Substring`/`Split`/`Contains` (no schema, separators `:` and `|` collide with user data — e.g. passwords in `ixian:create:`, group names in `ixian:select:`). C#→JS is `executeUiCommand(fn, 'base64', ...)` — positional Base64 args, no JSON anywhere.
2. **Inconsistent matching:** mix of `Equals(..., Ordinal)`, `StartsWith`, and `Contains` (the `Contains` variants would match the command anywhere in a URL). Several `StartsWith` checks omit the trailing colon while the `Substring` assumes it (HomePage `startAppMulti`/`appDetails`), an exception waiting on malformed input.
3. **Global vs. local handlers:** Launch pages and OnboardPage skip `onNavigatingGlobal` (no app/call requests pre-login — probably intentional but implicit).
4. **Fall-through navigation policy differs by page:** SingleChatPage/HomePage explicitly allow only `file:` URLs; every other page allows *any* unmatched URL to navigate (`e.Cancel = false`).
5. **Same JS function name, different arity per HTML file:** `addPaymentActivity` (5 args in contact_details vs 7 in index), `setBalance` (2 args wallet pages vs 3 in index), `addAppRequest` (4-arg base-class variant vs 13-arg chat variant on the same chat.html page), `setChatMode` (4 vs 6 args), `setAmount` vs `setMaxAmount`.
6. **Security-relevant:** wallet password stored in plaintext `Preferences` (`walletpass`) on create/restore/retry paths (explicit TODOs); passwords/nicknames transit through webview navigation URLs; `ixian:openLink:` opens arbitrary URLs from chat content (with HtmlDecode).
7. **Per-second polling model:** HomePage's tick fans out `updateScreen()` to the visible page and the embedded detail page; ContactDetails rebuilds its whole activity list every tick, WalletSentPage re-polls until confirmation.
8. **Platform branching:** `#if WINDOWS/IOS/MACCATALYST/ANDROID` in the shared base; runtime checks `Device.RuntimePlatform == Device.WinUI` (LockPage skips biometrics), `DeviceInfo.Platform` (rating URLs), Android-specific `setAsRoot()` nav-stack workaround, iOS file-open fallback in chat, "WinUI Crash fix" 200 ms delays before pushes.
9. **In-band state encoding:** payment-request status stored by prefixing the message string (`:txid` = paid, `::` = declined); tips/likes encoded as reaction strings `tip:<txid>` / `like:`.
