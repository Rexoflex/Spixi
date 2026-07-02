# Spixi JS <-> C# Bridge Audit — Part B
Scope: `Pages/Settings`, `Pages/Scan`, `Pages/MiniApps`, `Pages/Downloads`, `Pages/Dev`, `Pages/Contributors` + shared base class `Utils/SpixiContentPage.cs`.
Repo root: `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi` (all paths below relative to `Spixi\Spixi\`).

---

## 0. Shared bridge infrastructure

### 0.1 `Utils\SpixiContentPage.cs` — base class `SPIXI.SpixiContentPage : ContentPage, IDisposable`

**Page loading / HTML templating**
- `loadPage(WebView web_view, string html_file_name)` — resets `pageLoaded = false`, stores webview in `_webView`, sets `Source = generatePage(html_file_name)`, wires `Navigated += webViewNavigated` and `Navigating += webViewNavigating` (base handlers; pages additionally wire their own `onNavigating`/`onNavigated` via XAML).
- `generatePage(html_file_name)`:
  - **Android**: reads asset `html/<file>` as stream, returns `HtmlWebViewSource` with `BaseUrl = getAssetsBaseUrl() + "html/"` and `Html = SpixiLocalization.localizeHtml(stream)` (in-memory localization templating).
  - **Other platforms** (iOS/Mac/Windows): copies/localizes asset file to `<htmlPath>/ll_<file>` via `SpixiLocalization.localizeHtml(src, dst)` and returns `UrlWebViewSource { Url = getHtmlBaseUrl() + "ll_" + file }`.
  - So HTML templating = string localization pass (`SpixiLocalization.localizeHtml`), with localized files prefixed `ll_` on disk for non-Android.

**Page-load detection & message queue (C# -> JS reliability layer)**
- `pageLoaded` flag + private `Queue<string> messageQueue`.
- `sendMessage(string msg)`: if `pageLoaded && _webView != null` -> `evaluateJavascript(msg)` immediately; otherwise the raw JS string is **enqueued**.
- `webViewNavigated` (fires on WebView `Navigated`): sets `pageLoaded = await checkIfPageLoaded()`; if true, `processMessageQueue()` dequeues and evaluates every queued message in order.
- `checkIfPageLoaded()`: evaluates `document.readyState` on the main thread and returns true when it equals `"complete"`. Side effects inside this method (unusual placement):
  - `#if IOS || MACCATALYST`: applies safe-area insets as page `Padding` (`top` inset, bottom 10) and sets `BackgroundColor = ThemeManager.getBackgroundColor()`.
  - `#if ANDROID`: on Android 15+ (API 35), if the page is in the modal stack, pads top by `MainActivity.Insets.Top / 3` (edge-to-edge fix); sets themed background color.
- `evaluateJavascript(script)` (private): marshals to main thread and calls `_webView.EvaluateJavaScriptAsync("try{ " + script + " }catch(e){  }")` — every injected script is wrapped in a swallow-all try/catch.
- `webViewNavigating` (base): `#if WINDOWS` only — grabs `CoreWebView2` from the handler and sets `IsStatusBarEnabled = false`, `AreDevToolsEnabled = true`. No-op elsewhere.
- `reload()`: `pageLoaded = false` then `_webView.Reload()` on main thread.

**C# -> JS argument encoding (via `Utils.sendUiCommand`, `Utils\Utils.cs:61`)**
- `Utils.sendUiCommand(SpixiContentPage page, string command, params string[] args)` builds `executeUiCommand(<command>,'<b64 arg1>','<b64 arg2>',...);` and passes it to `page.sendMessage(...)`.
  - **First token is unquoted** — it is a JS expression naming the handler function (e.g. `setNickname` or `SpixiAppSdk.onInit`), so the page-side `executeUiCommand(fn, ...args)` receives the function reference.
  - Every non-null argument is Base64-encoded via `Utils.escapeHtmlParameter(string)` = `Convert.ToBase64String(UTF8(str))` and wrapped in single quotes (JS side must Base64-decode). `null` arguments are emitted as literal `null`.
  - Positional string arguments only; no JSON at this layer (JSON payloads, where used, are serialized first and passed as one Base64 string argument).

**Global JS -> C# commands — `onNavigatingGlobal(string url)` (protected; every page calls it first and cancels navigation if it returns true)**

| Command | Params | Behavior |
|---|---|---|
| `ixian:appAccept:<address>:<sessionId>` | split on `:`; `split[2]` = sender wallet address, `split[3]` = hex session id | `onAppAccept`: if session belongs to VoIP -> `VoIPManager.acceptCall`; else `MiniAppManager.acceptAppRequest` and `Navigation.PushAsync` the returned `MiniAppPage`. |
| `ixian:appReject:<address>:<sessionId>` | same split | `onAppReject`: VoIP session -> `VoIPManager.rejectCall`; else `MiniAppManager.rejectAppRequest`. |
| `ixian:hangUp:<sessionId>` | substring after prefix, hex-decoded via `Crypto.stringToHash` | `VoIPManager.hangupCall(sessionId)`. |

**Global C# -> JS commands (available on every page's HTML)**
- `executeUiCommand(displayCallBar,'<b64 sessionIdHex>','<b64 text>','<b64 startedTime>')` — via `displayCallBar()`; shows in-call bar (called from `displayAppRequests` for active/dialing calls).
- `executeUiCommand(hideCallBar)` — via `hideCallBar()`.
- `executeUiCommand(clearAppRequests)` then per pending mini-app request `executeUiCommand(addAppRequest,'<b64 sessionIdHex>','<b64 localized "X wants to use Y" text>','<b64 Accept label>','<b64 Reject label>')` and for an incoming un-accepted call `executeUiCommand(addCallAppRequest,'<b64 callerWalletAddress>','<b64 sessionIdHex>','<b64 "Incoming call - nick">')` — all via `displayAppRequests()`, triggered from `updateScreen()` whenever `UIHelpers.refreshAppRequests` is set (which `OnAppearing` always sets).

**Lifecycle / navigation helpers used by pages**
- `OnAppearing` -> sets `UIHelpers.refreshAppRequests = true` and calls `updateScreen()`.
- `OnDisappearing` -> `Dispose()`: only if page is **not** in the navigation stack — clears `pageLoaded`/`messageQueue`, detaches Navigated/Navigating handlers, removes webview from parent layout, nulls `Source`, disconnects handler (leak mitigation).
- `popPageAsync()` / `popToRootAsync()` / `removePage(page)` — pop/remove with delayed `Dispose()` of popped `SpixiContentPage`s.
- `displaySpixiAlert(title, message, ok[, cancel])` — main-thread-marshaled `DisplayAlert` wrappers returning `Task`/`Task<bool>`.

**Shared page conventions** (seen in all pages below): `onNavigating` first `HttpUtility.UrlDecode`s `e.Url`, delegates to `onNavigatingGlobal`, then matches `ixian:` commands; any unmatched URL falls through with `e.Cancel = false` (normal navigation allowed). All pages hide the MAUI navigation bar and most have an empty `onNavigated` marked "Deprecated due to WPF, use onLoad" — the real load signal is the page's JS navigating to `ixian:onload`.

---

## 1. Pages\Settings\SettingsPage.xaml.cs — `SettingsPage`
**HTML:** `settings.html` (reloaded in-place on language/appearance change).

### JS -> C# commands
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` | — | `onLoad()`: pushes nickname, appearance, lock state, avatar to JS (see below). |
| `ixian:back` | — | Deletes temp avatar `avatars/avatar-tmp.jpg` if present, `resetLanguage()` (reloads persisted language, discarding unsaved selection), `popPageAsync()`. |
| `ixian:error` | — | Alert: empty-nickname error (`settings-emptynick-*`). JS-side validation reports through this. |
| `ixian:delete` | — | Push modal `LockPage(true)`; on auth success -> `onDeleteWallet`: deletes wallet, then account data, isolates network, clears prefs (`onboardingComplete`, `lockenabled`, `waletpass` [sic]), clears pending tx/storage/activity/TIV cache/wallet list, `IxianHandler.shutdown()`, `popToRootAsync()`, pushes `LaunchPage`. Failure -> alert. |
| `ixian:deletea` | — | Push modal `LockPage(true)`; on success -> `onDeleteAccount`: deletes avatars, account file, downloads, pending messages, entire history, accounts, friend list; re-runs `onLoad()`; confirmation alert. |
| `ixian:deleteh` | — | `onDeleteHistory()`: `FriendList.deleteEntireHistory()` + alert. No auth gate. |
| `ixian:deleted` | — | `onDeleteDownloads()`: resets incoming transfers, deletes every file in `<spixiUserFolder>/Downloads`, alert with count (error alert on exception). |
| `ixian:backup` | — | `Navigation.PushAsync(new BackupPage())`. |
| `ixian:save:<nick>` | matched with `Contains`, split on literal `"ixian:save:"`; `split[1]` = nickname (URL-decoded plain text) | `onSaveSettings(nick)`: persists language + `lockenabled`; if nickname changed, updates local storage and `FriendList.broadcastNicknameChange()`; writes account file; `applyAvatar()` (promotes `avatar-tmp.jpg` to real avatar + `broadcastAvatarChange()`); applies appearance (reloads `HomePage`); `popPageAsync()`. |
| `ixian:avatar` | — | Fire-and-forget `onChangeAvatarAsync`: `SFilePicker.PickImageAsync()`, resize to 960x960 q80, save as `avatar-tmp.jpg`, then C#->JS `loadAvatar` with temp path. Error -> alert. |
| `ixian:remove` | — | `onRemoveAvatar()`: `deleteOwnAvatar()`, then `showRemoveAvatar('0')` + `loadAvatar(defaultPath)`. |
| `ixian:language:<code>` | substring after prefix | `SpixiLocalization.loadLanguage(lang)`; on success stores `selectedLanguage`, persists `language` pref immediately, and **reloads** `settings.html`. On failure `selectedLanguage = null`. |
| `ixian:lock:<on\|off>` | substring after prefix | `on` -> `lockEnabled = true` (persisted only on save). anything else -> push modal `LockPage(true)`; on auth success `HandleAuthSucceeded` sets `lockEnabled = false` and pushes `setLockEnabled("False")` to JS. |
| `ixian:appearance:<int>` | substring parsed with `Convert.ToInt32` into `ThemeAppearance` enum | `ThemeManager.changeAppearance`; if changed -> `SPlatformUtils.setEdgeToEdge()` and reload `settings.html`. |

### C# -> JS (all via `Utils.sendUiCommand` => `executeUiCommand(fn,'<b64 arg>',...)`)
| JS function | Args (positional, Base64 strings) | Trigger |
|---|---|---|
| `setNickname` | nickname | `onLoad` |
| `setAppearance` | appearance enum index as string (e.g. `"0"`) | `onLoad` |
| `setLockEnabled` | `"True"`/`"False"` (C# `bool.ToString()`) | `onLoad`; also `HandleAuthSucceeded` after lock disabled |
| `showRemoveAvatar` | `"1"` (custom avatar exists, `onLoad`) or `"0"` (after removal) | `onLoad` / `onRemoveAvatar` |
| `loadAvatar` | absolute file path of avatar (default, temp, or reset) | `onLoad`, `onChangeAvatarAsync`, `onRemoveAvatar` |
| `onBack` | — | Hardware back button (`OnBackButtonPressed` returns true and forwards to JS so JS can run its own back/cleanup and emit `ixian:back`) |

### Data contract
- In: nickname, appearance index, lock flag, avatar path/visibility. Out: save/back/error plus destructive account ops, language/lock/appearance/avatar mutations.
### Unusual
- Language and appearance changes reload the HTML page immediately (settings applied before "Save"); language pref persisted at selection time *and* on save; back discards temp avatar but the already-persisted language pref line in `ixian:language:` makes "cancel" only partially revert (resetLanguage reloads persisted value).
- Destructive flows gated behind `LockPage(true)` modal with `authSucceeded` event; wallet deletion path shuts down the node and rebuilds nav stack (`popToRootAsync` + push `LaunchPage`).
- Hardware back is intercepted and bounced through JS (`onBack`), unlike other pages that pop directly.

---

## 2. Pages\Settings\BackupPage.xaml.cs — `BackupPage`
**HTML:** `settings_backup.html`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` | — | `onLoad()` — empty. |
| `ixian:back` | — | `popPageAsync()`. |
| `ixian:error` | — | Alert `settings-backup-invalidpassword-*` (JS-side password validation failure). |
| `ixian:backupAccount` | — | `onBackupAccount()`: zips `Acc/**`, `account.ixi`, `avatar.jpg`, wallet file into `spixi.account.backup.ixi`; prepends `"SPIXIACCB1"` header; encrypts with `CryptoManager.lib.encryptWithPassword` using the **`walletpass` preference value**; shares via `SFileOperations.share(..., "Share Spixi Account Backup File")`. |
| `ixian:backupWallet` | — | `onBackupWallet()`: shares raw wallet file `<spixiUserFolder>/<walletFile>` via `SFileOperations.share(..., "Backup Spixi Wallet")`. |

### C# -> JS
- None (no `sendMessage`/`sendUiCommand` calls; inherits global call-bar/app-request pushes only).
### Data contract
- Pure command sink; results surface as OS share sheet or alert.
### Unusual
- Backup password comes from `Preferences.Default.Get("walletpass","")`, not from JS input; errors only logged (`Logging.error`), no JS feedback on backup failure. Hardware back -> `popPageAsync()`.

---

## 3. Pages\Settings\EncryptionPassword.xaml.cs — `EncryptionPassword`
**HTML:** `settings_encryption.html`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` | — | empty `onLoad()`. |
| `ixian:back` | — | `popPageAsync()`. |
| `ixian:error` | — | Alert `settings-encryption-invalidpassword-*` (JS-side validation). |
| `ixian:changepass:...` | Entire URL split on delimiter token `--1ec4ce59e0535704d4--`; `split[1]` = old password, `split[2]` = new password (plain text in URL, URL-decoded) | If `isValidPassword(old)` -> `writeWallet(new)` + success alert + `popPageAsync()`; else invalid-current-password alert. |

### C# -> JS
- None.
### Data contract
- Passwords travel JS->C# inside the navigation URL, separated by a magic hex delimiter string rather than `:`-separation (so passwords may contain `:`).
### Unusual
- The magic delimiter `--1ec4ce59e0535704d4--` is the only such pattern in this folder set. Hardware back -> `popPageAsync()`.

---

## 4. Pages\Settings\SetLockPage.xaml.cs — `SetLockPage`
**HTML:** `settings_lock.html`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` | — | `onLoad()` -> sends `unlock` to JS. |
| `ixian:back` | — | `popPageAsync()`. |
| `ixian:unlock` | — | Sends `unlock` to JS again (echo/ack loop). |

### C# -> JS
| JS function | Args | Trigger |
|---|---|---|
| `unlock` | — (`executeUiCommand(unlock);`) | `onLoad` and on receiving `ixian:unlock` |

### Data contract
- Minimal; the page mostly signals "unlocked" state to the JS UI.
### Unusual
- `ixian:unlock` -> C# -> `unlock()` back to JS is effectively a round-trip ping; no actual authentication happens in this class. Hardware back -> `popPageAsync()`.

---

## 5. Pages\Scan\ScanPage.xaml.cs — `ScanPage`
**HTML:** `scan.html` (QR scanning done in JS/HTML).

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` | — | empty. |
| `ixian:back` | — | `OnBackButtonPressed()` -> `popPageAsync()` + `GC.Collect()`. |
| `ixian:error` | — | Alert `global-invalid-address-*`. |
| `ixian:qrresult:<text>` | matched with `Contains`, split on literal `"ixian:qrresult:"`; `split[1]` = scanned payload; wrapped in swallow-all try/catch | `processQRResult(text)`: guarded by `allowScanning` (one-shot); pops the page, then raises public event `scanSucceeded(this, EventArgs<string>(text))` for the subscribing parent page. |

### C# -> JS
- None.
### Data contract
- Out: single scanned string via the `scanSucceeded` C# event (consumed by e.g. `AppNewPage.quickScan`).
### Unusual
- Explicit `GC.Collect()` on back (camera/WebView memory). `allowScanning` prevents double-fire; page pops itself *before* invoking the event.

---

## 6. Pages\Downloads\DownloadsPage.xaml.cs — `DownloadsPage`
**HTML:** `downloads.html`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` (StartsWith) | — | `onLoad()` -> `loadFiles()` + `updateScreen()`. |
| `ixian:back` | — | `Navigation.PopModalAsync()` (page is presented modally). |
| `ixian:open:<fileName>` | substring after prefix; joined to `TransferManager.downloadsPath` | If file exists, `SFileOperations.open(path)` (OS open/preview). |
| `ixian:delete:<fileName>` | substring after prefix | If file exists, `File.Delete` then `onLoad()` to re-push the list. |

### C# -> JS
| JS function | Args (Base64 positional) | Trigger |
|---|---|---|
| `clearFiles` | — | `loadFiles()` (on load / after delete) |
| `addFile` | file name, creation time (`DateTime.ToString()`, locale-dependent) | per file in `TransferManager.downloadsPath` |

### Data contract
- In: full downloads listing (name + creation time), re-sent wholesale after any change. Out: open/delete/back.
### Unusual
- `OnAppearing` calls `onLoad()` directly (list refresh without waiting for `ixian:onload`); `OnDisappearing` sets `webView = null` before base dispose (pattern shared by all MiniApps/Dev/Contributors pages). `e.Cancel = true` is set at the top of `onNavigating` and only reset for unmatched URLs. No path sanitization on `<fileName>` (`..` traversal would be possible in principle).

---

## 7. Pages\Dev\DevPage.xaml.cs — `DevPage`
**HTML:** `dev.html`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` (StartsWith) | — | `onLoad()` — copies `ixian.log` to `ixian.log.tmp`, reads full text, deletes temp, pushes to JS. |
| `ixian:back` | — | `Navigation.PopModalAsync()`. |

### C# -> JS
| JS function | Args | Trigger |
|---|---|---|
| `setLog` | entire log file contents as one Base64 string | `onLoad` (also invoked from `OnAppearing`) |

### Data contract
- In: whole `ixian.log` dump. Out: back only.
### Unusual
- Copy-then-read dance avoids reading a file locked by the logger. Unbounded log size is injected into a single `EvaluateJavaScriptAsync` call. `OnAppearing` triggers `onLoad()` in addition to the JS `ixian:onload`, so the log may be sent twice (first send is queued until `document.readyState == "complete"`).

---

## 8. Pages\Contributors\ContributorsPage.xaml.cs — `ContributorsPage`
**HTML:** `contributors.html`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` (StartsWith) | — | `onLoad()` -> `updateScreen()` (no-op). |
| `ixian:back` | — | `Navigation.PopModalAsync()`. |

### C# -> JS
- None. Static content page.
### Unusual
- Same modal/`webView = null` lifecycle pattern as Downloads/Dev.

---

## 9. Pages\MiniApps\AppsPage.xaml.cs — `AppsPage`
**HTML:** `apps.html`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` (StartsWith) | — | `onLoad()` -> `loadApps()`. |
| `ixian:back` | — | `popPageAsync()`. |
| `ixian:details:<appId>` | substring after prefix | Push `AppDetailsPage(app_id)`. |
| `ixian:newapp` | — | Push `AppNewPage`. |

### C# -> JS
| JS function | Args (Base64 positional) | Trigger |
|---|---|---|
| `clearApps` | — | `loadApps()` |
| `addApp` | app id, app name, icon path (empty string if none) | per installed app from `Node.MiniAppManager.getInstalledApps()` (iterated under lock) |

### Data contract
- In: installed-app list (id/name/icon). Out: navigation to details / new-app / back.
### Unusual
- `OnAppearing` -> `onLoad()` refresh (list re-pushed every appearance).

---

## 10. Pages\MiniApps\AppDetailsPage.xaml.cs — `AppDetailsPage`
**HTML:** `app_details.html`.
Two constructors: by `app_id` (installed app) or by fetched `MiniApp` object, with optional `path` (local install file), `installing` flag, `friendOrGroup`, `shouldReloadDetailView`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` (StartsWith) | — | `onLoad()`: resolves app (fetched or via `MiniAppManager.getApp(appId)`) + icon, checks installed state, sends `init` (below). |
| `ixian:back` | — | `onBack()`: `popPageAsync()`; if `shouldReloadDetailView`, calls `reloadDetailView()` -> `HomePage.removeDetailContent()` (clears split-view detail pane). |
| `ixian:install` (StartsWith) | — | `onInstall()`: requires `fetchedApp`; sends `showInstalling`; background `Task.Run` -> `installFromUrl(fetchedApp)` or `installFromPath(path)` (deleting the temp file afterwards); sets `UIHelpers.shouldRefreshApps` and sends `showInstallSuccess` / `showInstallFailed`. |
| `ixian:uninstall` (StartsWith) | — | `onUninstall()`: `MiniAppManager.remove(appId)`; success -> `showAppRemoved` + `shouldReloadDetailView = true`; failure -> alert + `popPageAsync()`; always sets `UIHelpers.shouldRefreshApps`. |
| `ixian:details` (StartsWith) | — | `onDetails()`: reloads installed app info and **replaces** this page with a fresh `AppDetailsPage(app, null, false, friendOrGroup, true)` (`PushAsync` + `removePage(this)`). Note: because this check comes after `ixian:install`/`ixian:uninstall` StartsWith checks but before `startApp`, ordering matters — `ixian:details` is only reachable because it doesn't share a prefix with them. |
| `ixian:startApp:<appId>` | substring after prefix | `onStartApp`: creates single-user `MiniAppPage(appId, primaryAddress, null, entryPoint)` with `accepted = true`, registers via `MiniAppManager.addAppPage`, pushes it on main thread. |
| `ixian:startAppMulti:<appId>` | substring after prefix | `onStartAppMulti`: if `friendOrGroup` preset -> `onJoinApp` directly; else pushes `WalletRecipientPage(false,false)` and on pick -> `HandlePickAppMultiUserSucceeded`: resolves friend, pops picker, `onJoinApp` (creates + pushes multi-user `MiniAppPage`, returns its `sessionId`), then `StreamProcessor.sendAppRequest(friend, appId, sessionId, null, appInfo)` and logs an `appSession` message via `FriendList.addMessageWithType`. |

### C# -> JS
| JS function | Args (Base64 positional) | Trigger |
|---|---|---|
| `init` | 14 args: name, icon, publisher, description, version, url, human content size, capabilities string, appId, hasSingleUser (`"True"/"False"`), hasMultiUser, installed (`"false"` if `installing` else installed state — note lowercase literal vs `Bool.ToString()` casing mismatch), verified (`"False"`, hardcoded), `"True"` (hardcoded final flag) | `onLoad` |
| `showInstalling` | — | `onInstall` start |
| `showInstallSuccess` / `showInstallFailed` | — | install result (from background thread; safe because `sendMessage` marshals to main thread) |
| `showAppRemoved` | — | successful uninstall |

### Data contract
- In: full app metadata blob + capability/install/verify flags. Out: install/uninstall/start(single/multi)/details/back.
### Unusual
- `app_verified` is always `false` and the last `init` arg is always `"True"` — placeholders. Mixed-case booleans (`"false"` vs `"True"`). `onJoinApp` has `await Task.Delay(200)` before `PushAsync` commented "WinUI Crash fix". Page self-replacement via `removePage(this)`.

---

## 11. Pages\MiniApps\AppNewPage.xaml.cs — `AppNewPage`
**HTML:** `app_new.html`.

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload` (StartsWith) | — | `onLoad()` (no-op beyond `updateScreen`). |
| `ixian:back` | — | `popPageAsync()`. |
| `ixian:quickscan` | — | `quickScan()`: pushes `ScanPage`, subscribes `scanSucceeded` -> `processQRResult(url)`. |
| `ixian:qrresult:<data>` | matched with `Contains`, split on literal `"ixian:qrresult:"` (this page's own HTML can also scan) | `processQRResult(result)`. |
| `ixian:fetch:<url>` | substring after prefix | `onFetch(url)`: `await Node.MiniAppManager.fetch(url)`; null -> `showUrlError`; else set `app.url` and navigate to `AppDetailsPage(app, null, installing:true)` + `removePage(this)`. |
| `ixian:selectAppFile` (StartsWith) | — | `onSelectAppFile()`: `SFilePicker.PickFileAsync()`; reads bytes, writes `<tmpPath>/<name>.tmp`, `extractAppInfo(filepath)`; success -> `AppDetailsPage(app, filepath, installing:true)` + `removePage(this)`; failure at any stage -> `showUrlError` (+ temp file cleanup). |

### C# -> JS
| JS function | Args (Base64 positional) | Trigger |
|---|---|---|
| `setScannedData` | app URL string | `processQRResult`: if payload contains `":ixi"`, the part before `:ixi` is used; otherwise raw payload only if `20 < length < 128` (heuristic address/url length check) |
| `showUrlError` | — | fetch failure, file-pick failure, invalid app package |

### Data contract
- In: scanned URL echo + error signal. Out: fetch-by-url, file install, quick-scan navigation.
### Unusual
- Two scan paths (embedded HTML scanner via `ixian:qrresult:` and native-page `ScanPage` via C# event) converge on `processQRResult`. QR payload format `"<url>:ixi..."` split on literal `:ixi`.

---

## 12. Pages\MiniApps\MiniAppPage.xaml.cs — `MiniAppPage` (the mini-app runtime host)
**HTML:** *not* loaded via `loadPage`/`generatePage` — constructor manually sets `UrlWebViewSource { Url = "file://" + app_entry_point }` (the installed mini-app's own entry HTML), assigns `_webView`, and wires the base `webViewNavigated`/`webViewNavigating` handlers itself. No localization templating for mini-apps.
State: `appId`, `sessionId = sha3_512sqTrunc(UTF8(appId))` (TODO: randomize), `hostUserAddress`, optional `friendOrGroup` (multi-user), `accepted`, `sdkVersion` default **40** (4.0), `MiniAppActionHandler`.
Constructor also fetches presence for the friend or all group contacts (unless the group hides participant addresses).

### JS -> C#
| Command | Params | Behavior |
|---|---|---|
| `ixian:onload[:<sdkVer>]` (StartsWith) | optional suffix after `ixian:onload` + 1 char, e.g. `:5.0`; parsed `sdkVersion = (int)(float.Parse(v) * 100)` | `onLoad(version)`: builds `MiniAppActionHandler(appId, sessionId, hostUserAddress, friendOrGroup, sdkVersion, Node.MiniAppStorage)` then sends `SpixiAppSdk.onInit` (see below). |
| `ixian:back` | — | `onBack()`: if multi-user, `StreamProcessor.sendAppEndSession(friend, sessionId, null)`; `MiniAppManager.removeAppPage(sessionId)`; `popPageAsync()`. |
| `ixian:data:<payload>` (StartsWith `ixian:data`) | `current_url.Substring(10)` (skips `ixian:data:`), UTF8 bytes | `sendNetworkData`: `StreamProcessor.sendAppData(friendOrGroup, sessionId, data)`; error-logged if single-user. |
| `ixian:protocolData<protocolId>=<data>` (StartsWith `ixian:protocolData`) | protocolId = chars between prefix and first `=`; data = after `=`; protocolId `"null"` -> null, else `sha3_512Trunc(UTF8(protocolId))` | `sendNetworkProtocolData`: `StreamProcessor.sendAppProtocolData(friendOrGroup, protocolIdBytes, UTF8(data))`. |
| `ixian:getStorageData<key>` (StartsWith) | key = substring after prefix | Reads `Node.MiniAppStorage.getStorageData(appId, "main", key)`; replies `SpixiAppSdk.onStorageData(key, base64OrLiteral"null")`. |
| `ixian:setStorageData<key>=<value>` (StartsWith) | key between prefix and `=`; value after `=`; `"null"` -> null else `Convert.FromBase64String(value)` | `Node.MiniAppStorage.setStorageData(appId, "main", key, value)`. No reply. |
| `ixian:action<json>` (StartsWith `ixian:action`) | JSON after prefix | `handleAction(json)` (see below). |
| `xa:<base64 json>` | Base64-decoded to JSON | `handleAction(decoded)` — compact/binary-safe alias for `ixian:action`. **Only non-`ixian:` command scheme in the audited set.** |
| `file:...` (any casing, trimmed) | — | Allowed through (`e.Cancel = false`) — mini-apps may navigate among their local files. **Everything else is cancelled** (unlike other pages, there is no general fall-through to normal navigation: non-file, non-command URLs are blocked). |

**`handleAction(action)` flow** (`MiniAppActionBase { c = command, id, responseUrl }` via Newtonsoft JSON):
- Deserializes, then `miniAppActionHandler.processAction(jsonResult.c, action)` -> `actionResponse` string (null -> "unknown action" alert).
- `NETWORK_DATA_SEND`: already processed, no response.
- `STORAGE_GET` / `STORAGE_SET`: reply `SpixiAppSdk.ar(actionResponse)` immediately (no user prompt).
- IxiName commands (`NAME_EXTEND`, `NAME_TRANSFER`, `NAME_REGISTER`, `NAME_UPDATE_CAPACITY`, `NAME_UPDATE`, `NAME_ALLOW_SUBNAMES`): OK/Cancel confirmation alert showing the raw response; cancel aborts; on confirm, falls through to `responseUrl` HTTP POST (below).
- `SEND_PAYMENT`: deserializes `TransactionResponse`, decodes base64 `tx` into a `Transaction`, resolves recipient nickname, OK/Cancel alert with recipient + amount; reject -> `sendActionRejected(..., "rejected")`. If no `responseUrl`: `IxianHandler.addTransaction(...)` -> success: `SpixiAppSdk.ar(actionResponse)`, failure: rejected with `"error"`. With `responseUrl`: falls through to POST.
- Default (other commands): generic OK/Cancel confirmation, then POST.
- POST path: `HttpClient.PostAsync(jsonResult.responseUrl, actionResponse as application/x-www-form-urlencoded)` (synchronous `.Result`); success -> "sent" alert; failure -> error alert with status/body.
- Any exception: `sendActionRejected(command, id, ex.Message)` (only for STORAGE_GET/STORAGE_SET/SEND_PAYMENT) + processing-error alert.

### C# -> JS (all target the `SpixiAppSdk` JS namespace; args Base64 positional via `executeUiCommand`)
| JS function | Args | Trigger |
|---|---|---|
| `SpixiAppSdk.onInit` | sdk >= 5.0 multi-user: sessionIdHex, hostAddress(masked), ...memberAddresses (one arg each); sdk >= 5.0 single-user: sessionIdHex, hostAddress; sdk < 5.0 multi-user: sessionIdHex, comma-joined member addresses; sdk < 5.0 single-user: **no args** | `onLoad` |
| `SpixiAppSdk.onStorageData` | key, base64 value or `"null"` string | reply to `ixian:getStorageData` |
| `SpixiAppSdk.ar` | one JSON string (serialized `MiniAppActionResponse { id, e }` for rejections, or the handler's `actionResponse` JSON) | action responses: storage get/set, accepted payment, rejection/error paths |
| `SpixiAppSdk.onNetworkData` | senderAddress (masked), data as UTF8 string | `networkDataReceived` (called by stream layer; main-thread marshaled) |
| `SpixiAppSdk.onNetworkProtocolData` | senderAddress (masked), protocolName, data as UTF8 string | `networkProtocolDataReceived` |
| `SpixiAppSdk.onRequestAccept` | senderAddress (masked), data string (may be empty) | `appRequestAcceptReceived` |
| `SpixiAppSdk.onRequestReject` | senderAddress (masked), data string | `appRequestRejectReceived` |
| `SpixiAppSdk.onAppEndSession` | senderAddress (masked), data string | `appEndSessionReceived` |
| `SpixiAppSdk.onTransactionReceived` | senderAddress (unmasked), amount, txid, data as hex (`Crypto.hashToString`), verified `"True"/"False"` | `transactionReceived` — only if app has `TransactionSigning` capability |
| `SpixiAppSdk.onPaymentSent` | same shape as above | `paymentSent` — same capability gate |

### Data contract
- In: session init (session id + participant addresses), storage reads, action responses, network/protocol data, session lifecycle, transaction events. Out: raw data frames, protocol frames, storage get/set, JSON actions (payments, IxiNames, etc.), back/end-session.
### Unusual
- **Address masking**: `maskSenderAddress` — in groups with `hideParticipantAddresses`, addresses are re-derived via `GroupChat.DeriveGroupAddress(...)` and truncated to 32 chars "to prevent apps from accidentally sending IXI to virtual/hidden addresses"; owner vs member derivation asymmetry; host address forced-derived on init.
- SDK version negotiation via the `ixian:onload:<ver>` suffix changes the `onInit` argument shape (>= 5.0 gets host address + variadic members).
- Multiple `// TODO TODO TODO probably a different encoding should be used for data` comments — network data crosses the bridge as raw UTF-8 inside URLs/JS calls.
- Session id is deterministic (`sha3` of appId) with a TODO to randomize — collides across concurrent sessions of the same app.
- Navigation lockdown: only `file:` URLs escape cancellation (mini-app sandbox).
- `HttpClient ... .Result` blocking call inside async method (potential deadlock/jank).

---

## Cross-cutting observations
1. **Two-layer send path**: page code -> `Utils.sendUiCommand` (Base64-escape + build `executeUiCommand(...)`) -> `SpixiContentPage.sendMessage` (queue until `document.readyState == "complete"`, then `EvaluateJavaScriptAsync` wrapped in `try{...}catch(e){}`). Queued messages survive until the *next* `Navigated` event; a failed load leaves them queued indefinitely.
2. **Command parsing is ad hoc**: mixture of `Equals`, `StartsWith`, `Contains`, `Split` on literal prefixes, custom delimiters (`--1ec4ce59e0535704d4--`), and `=`-separated key/value suffixes. `HttpUtility.UrlDecode` is applied to the whole URL first everywhere.
3. **`ixian:onload` is the real page-ready signal** for C#-side data pushes, even though the queue mechanism keys off `document.readyState`; several pages (Downloads, Dev, Apps, Contributors) also push on `OnAppearing`, relying on the queue for ordering.
4. **Lifecycle quirk**: MiniApps/Downloads/Dev/Contributors pages set `webView = null` (the XAML field) in `OnDisappearing` before `base.OnDisappearing()` disposes `_webView` — the base keeps its own `_webView` reference so cleanup still works.
5. **Placeholders/incomplete**: `AppDetailsPage.init`'s `app_verified` always false and trailing hardcoded `"True"`; `MiniAppPage` deterministic session id; unauthenticated `ixian:deleteh`/`ixian:deleted` vs auth-gated wallet/account deletion.
6. **Only two URL schemes**: `ixian:` everywhere plus `xa:` (Base64 action alias) in `MiniAppPage`.
