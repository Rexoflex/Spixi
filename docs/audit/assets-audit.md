# Spixi Web Assets Audit

Assets root: `Spixi\Spixi\Resources\Raw\html` (loaded into MAUI `WebView` by `SpixiContentPage.loadPage()` / `generatePage()`).
Repo root referenced below: `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend`.

---

## 1. Shared asset inventory

### 1.1 `js/` (8 files, ~700 KB)

| File | Size | Kind | Notes |
|---|---|---|---|
| `html5-qrcode.min.js` | 375 KB | 3rd-party | mebjas/html5-qrcode (minified; no version banner embedded). Used only by `scan.html`. |
| `jquery.min.js` | 95 KB | 3rd-party | **jQuery v4.0.0** |
| `bootstrap.min.js` | 92 KB | 3rd-party | **Bootstrap v5.3.8** bundle |
| `chat.js` | 71 KB | custom | All chat-screen logic (see 1.5) |
| `qrcode.min.js` | 20 KB | 3rd-party | davidshimjs **qrcode.js** (QR generation; no version banner) |
| `home.js` | 19 KB | custom | Home-screen logic (see 1.5) |
| `spixi.js` | 15 KB | custom | Shared helper runtime included by every page (see 1.5) |
| `clipboard.min.js` | 11 KB | 3rd-party | **clipboard.js v2.0.11** |

### 1.2 `css/` (8 files, ~500 KB)

| File | Size | Notes |
|---|---|---|
| `bootstrap.min.css` | 232 KB | **Bootstrap v5.3.8** |
| `spixiui-dark.css` | 115 KB | Full app theme, dark |
| `spixiui-light.css` | 115 KB | Full app theme, light (near-duplicate of dark — two maintained copies of the same stylesheet) |
| `spixi-login.css` | 14 KB | Login/intro styling |
| `spixiui-intro.css` | 9 KB | Intro/lock pages (used by `intro_retry.html`, `lock.html`) |
| `normalize.css` | 6.5 KB | **normalize.css v8.0.1** |
| `empty-spixiui-light.css` / `empty-spixiui-dark.css` | ~2.2 KB each | Minimal theme for `empty_detail.html` |

Theme selection is done **server-side at page-generation time**: every page links `css/*SL{SpixiThemeMode}`, a localization token replaced by C# with e.g. `spixiui-dark.css` (`ThemeManager.cs:35` — `addCustomString("SpixiThemeMode", name + "-" + appearance_name + ".css")`). Theme changes therefore require a page reload.

### 1.3 `libs/` — Font Awesome only

- `libs/fontawesome/css/`: `fontawesome.min.css` (58 KB), `solid.min.css`, `regular.min.css`, `brands.min.css`
- `libs/fontawesome/webfonts/`: `fa-solid-900.woff2` (115 KB), `fa-brands-400.woff2` (110 KB), `fa-regular-400.woff2` (19 KB)
- Version: **Font Awesome Free 7.2.0** (banner in `fontawesome.min.css`). Pages load `fontawesome.min.css` + `solid.min.css`.

### 1.4 `fonts/` — Inter

- `Inter-Regular.woff2` (111 KB), `Inter-Bold.woff2` (115 KB), `InterDisplay-SemiBold.woff2` (114 KB)

Also `img/` — 43 entries, 2.2 MB, including `flags/` (13 language flag PNGs), `dark/` + `light/` duplicated illustration sets, onboarding art.

### 1.5 Custom shared JS — what each does

**`js/spixi.js`** — the shared runtime included by *every* page:
- `onload()` → navigates to `ixian:onload` (the page-ready handshake with C#) and starts relative-timestamp refresh.
- **C#→JS bridge**: `executeUiCommand(fn, ...base64Args)` — C# (`Utils.sendUiCommand`, `Utils/Utils.cs:61`) calls `executeUiCommand(fnName,'<base64>',...)` via `EvaluateJavaScriptAsync`; args are Base64-encoded (`escapeHtmlParameter` = `Convert.ToBase64String`), decoded by `base64ToBytes()` then HTML-entity-escaped via `escapeParameter()`.
- `escapeParameter`/`unescapeParameter` — custom HTML-entity escaping used across the bridge.
- Touch: `addSwipe()` (pointer-event swipe detector), drag disabled globally.
- Time helpers: `getRelativeTime`, `getUserFriendlyFormattedTimestamp`, `startRelativeTimeUpdate`, `startCallTimeUpdate` (uses injected globals `SL_TimeJustNow`, `SL_AMinuteAgo`, `SL_MinutesAgo`).
- Global VoIP/app-session overlays: `addCallAppRequest`, `addAppRequest`, `removeAppRequest`, `clearAppRequests`, `appAccept`/`appReject` (→ `ixian:appAccept/appReject`), `displayCallBar`, `hangUp` (→ `ixian:hangUp`), `hideCallBar`, `showWarning` (network warning bar).
- Modal system: `showModalDialog(title, body, leftBtnHtml, rightBtnHtml)` / `hideModalDialog` (string-concatenated innerHTML).
- Misc: `amountWithCommas`, `maskWalletAddress`, `parseBoolean`, `toggleAnimatedSlider`, `limitToTwoDecimals`, `quickScanJS` (references **Instascan**, a library no longer shipped — dead code), `isBlank`.

**`js/home.js`** — logic for `index.html` (HomePage): tab switching (`selectTab` → `ixian:tab`), FAB and main menus, balance display/hide (`displayBalance`, `toggleBalance`), chat list (`addChat`, `clearChats`, `selectChat`, `setUnreadIndicator`, `setNotificationCount`), contact list (`addContact`, `contactSearch`, `setContactStatus`), payment activity (`addPaymentActivity`, `updateFilterButton` → `ixian:filter`), avatar (`loadAvatar`), rating prompt (`showRatingPrompt` → `ixian:rating`), hidden dev-mode toggle (`countLogoClick` → `ixian:enableDevMode`/`disableDevMode`), `updateDebugInfo`. Uses injected `SL_*` globals defined inline in `index.html`.

**`js/chat.js`** — logic for `chat.html` (SingleChatPage), ~90 functions: message rendering (`addMe`/`addThem`/`addText`, `updateMessage`, `deleteMessage`, reactions, `linkify` + external-link confirm modal), file transfer (`addFile`, `updateFile`, `ixian:acceptfile/openfile/sendfile/sendmedia`), calls (`addCall`, `showCallButton`), payments in chat (`addPaymentRequest`, `updatePaymentRequestStatus`, `ixian:viewPayment`), mini-app sessions (`addAppRequest`, `ixian:joinApp/installApp/app`), group chat (channels selector, kick/ban, group details, bot channels via `ixian:selectChannel/populateChannelSelector`), context menus, typing indicators (`ixian:typing`), sticky date headers, input resize, platform hacks keyed off `SL_Platform` (`Xamarin-iOS`, `Xamarin-WPF`). Uses `SL_Modals` dictionary + many `SL_*` globals defined inline in `chat.html`.

---

## 2. Per-page inventory (29 pages)

Common to nearly all pages (the "standard head"): `normalize.css`, `bootstrap.min.css`, `css/*SL{SpixiThemeMode}` (theme), `fontawesome.min.css` + `solid.min.css`; scripts `jquery.min.js`, `bootstrap.min.js`, `qrcode.min.js`, `spixi.js` (+ `clipboard.min.js` where copying exists). Deviations noted per page. "Globals defined" = functions defined in inline `<script>` that C# invokes via `sendUiCommand`/`executeUiCommand` (plus onclick handlers).

| # | Page | C# owner (`Pages\...`) | Purpose | Inline JS (lines) |
|---|---|---|---|---|
| 1 | `index.html` (732 lines) | `Home\HomePage` | Main screen: Chats/Contacts/Wallet/Apps tabs, FAB, balance, QR | 210 (+ `home.js`) |
| 2 | `chat.html` (434) | `Chat\SingleChatPage` | Conversation screen (1:1, group, bot) | 79 (+ `chat.js`) |
| 3 | `contact_details.html` (323) | `Contacts\ContactDetails` | Contact profile: avatar, QR, activity, actions | 174 |
| 4 | `contact_new.html` (166) | `Contacts\ContactNewPage` | Add contact by address/QR | 52 |
| 5 | `apps.html` (91) | `MiniApps\AppsPage` | Installed mini-app list | 21 |
| 6 | `app_new.html` (114) | `MiniApps\AppNewPage` | Add mini app by URL/QR/file | 38 |
| 7 | `app_details.html` (420) | `MiniApps\AppDetailsPage` | Mini-app detail, install/uninstall/launch (solo/multi) | 187 |
| 8 | `wallet_send.html` (269) | `Wallet\WalletSendPage` | Send step 1: pick recipient(s) | 175 |
| 9 | `wallet_send_2.html` (318) | `Wallet\WalletSend2Page` | Send step 2: amount, fee, confirm | 145 |
| 10 | `wallet_sent.html` (236) | `Wallet\WalletSentPage` | Tx result / tx detail view (send & receive modes) | 117 |
| 11 | `wallet_request.html` (266) | `Wallet\WalletReceivePage` | Receive: my QR + request amount from contacts | 169 |
| 12 | `wallet_recipient.html` (360) | `Wallet\WalletRecipientPage` | Contact picker for send/request (single & multi) | 223 |
| 13 | `wallet_contact_request.html` (118) | `Wallet\WalletContactRequestPage` | Incoming payment request: accept/decline | 12 |
| 14 | `settings.html` (456) | `Settings\SettingsPage` | Settings hub: nickname, avatar, language, theme, lock, delete acct/history | 162 |
| 15 | `settings_backup.html` (97) | `Settings\BackupPage` | Backup account / wallet seed | 15 |
| 16 | `settings_encryption.html` (151) | `Settings\EncryptionPassword` | Set/change encryption password | 55 |
| 17 | `settings_lock.html` (146) | `Settings\SetLockPage` | Set app-lock password | 36 |
| 18 | `intro.html` (393) | `Launch\LaunchPage` | First-run: language, appearance, ToS carousel | 143 |
| 19 | `intro_new.html` (236) | `Launch\LaunchCreatePage` | Create account wizard: name/avatar/password | 129 |
| 20 | `intro_restore.html` (180) | `Launch\LaunchRestorePage` | Restore from backup file + password | 103 |
| 21 | `intro_retry.html` (111) | `Launch\LaunchRetryPage` | Wallet decrypt failed → retry password | 37 |
| 22 | `lock.html` (128) | `Launch\LockPage` | App-lock unlock screen | 59 |
| 23 | `onboarding.html` (43) | `Home\OnboardPage` | Post-setup "join community bot" prompt | 9 |
| 24 | `scan.html` (90) | `Scan\ScanPage` | QR scanner (html5-qrcode camera view) | 40 |
| 25 | `downloads.html` (92) | `Downloads\DownloadsPage` | Received-files list (open/delete) | 28 |
| 26 | `contributors.html` (66) | `Contributors\ContributorsPage` | Credits page | 3 |
| 27 | `dev.html` (52) | `Dev\DevPage` | Hidden dev log viewer | 5 |
| 28 | `empty_detail.html` (27) | `Home\EmptyDetail` | Desktop split-view placeholder (own minimal CSS, no JS) | 0 |
| 29 | `address.html` (126) | **none — ORPHANED** | Legacy "my address" QR/share screen; no C# page loads it (superseded by `wallet_request.html`) | 50 |

### 2.1 Globals defined per page (called from C#) and `ixian:` URLs emitted

`ixian:` URLs are the JS→C# channel: the page sets `location.href = "ixian:..."`; `SpixiContentPage.webViewNavigating` intercepts and each page's `onNavigating*` override dispatches. Args are appended colon-separated (e.g. `ixian:appAccept:<addr>:<sessionId>`).

| Page | Global JS functions defined (inline) | `ixian:` emitted |
|---|---|---|
| `address.html` | `generateQR`, `setAddress` | `back` |
| `app_details.html` | `init`, `viewAppDetails`, `showInstalling/showInstallSuccess/showInstallFailed/showAppRemoved`, `confirmInstallCall`, `confirmRemoveApp`, `removeAppHandler`, `onLaunchHandler`, `launchSoloMode`, `launchMultiUserMode`, `handleClickOutside` | `back, details, install, onload, startApp, startAppMulti, uninstall` |
| `app_new.html` | `setScannedData`, `scanAppCode`, `selectAppFile`, `showUrlError` | `back, fetch, quickscan, selectAppFile` |
| `apps.html` | `addApp`, `clearApps` | `back, details, newapp, onload` |
| `chat.html` | `toggleAttachBar` (rest in chat.js; inline block mostly defines `SL_*` string globals) | inline: `ban, call, leave`; via chat.js: `accept, acceptfile, app, back, chat, contextAction, details, disable/enableNotifications, installApp, joinApp, kick, loadContacts, loadmore, openLink, openfile, populateChannelSelector, request, selectChannel, send, sendContactRequest, sendfile, sendmedia, typing, undorequest, viewPayment` |
| `contact_details.html` | `setAddress`, `setNickname`, `setAvatar`, `setUserDefinedNick`, `generateQR`, `addPaymentActivity`, `clearRecentActivity`, `showIndicator`, `show/dismiss/submitEditUsername`, `onRemoveContact`, `onRemoveChatHistory` | `back, chat, remove, removehistory, request, send, txdetails, userdefinednick` |
| `contact_new.html` | `setAddress`, `checkAddress`, `onValidAddress`, `onMenuClose` | `back, checkAddress, error, quickscan, request` |
| `contributors.html` | — | `back, onload` |
| `dev.html` | `setLog` | `back, onload` |
| `downloads.html` | `addFile`, `clearFiles` | `back, delete, onload, open` |
| `empty_detail.html` | — | — |
| `index.html` | `setAddress`, `generateQR`, `addApp`, `clearApps`, `searchMiniApps`, `onLaunchHandler`, `launchSoloMode`, `launchMultiUserMode`, `handleClickOutside`, `hideMiniAppsStartNote`, `showIxiNamesMessage`, `toggleImportantNotice` (+ ~30 in home.js: `setBalance`, `addChat`, `addContact`, `setNickname`…) | `appDetails, backup, copy, loadApps, miniAppsStartNoteHidden, newapp, newchat, newcontact, onload, quickscan, receiveixi, sendixi, share, startApp, startAppMulti` + home.js: `balance, chat, details, dis/enableDevMode, filter, rating, tab, txdetails` |
| `intro.html` | `prepareIntro`, `changeLanguage`, `toggleTheme`, `initialAppearance`, `nextStep/prevStep/toggleStep/updateNavDots`, `showTerms`, `onGetStarted`, `showOnboardingSection`, `setVersion` | `accept, appearance, create, introload, language` |
| `intro_new.html` | `loadAvatar`, `onInputHandler`, `onPasswordCheck`, `togglePasswordVisible`, `nextStep/prevStep/toggleStep`, `onNewAccountClick`, `onFinishSetup`, `onRestoreAccount`, `setVersion` | `avatar, create, restore` |
| `intro_restore.html` | `onSelectBackupFile`, `setUploadedFileName`, `removeSelectedFile`, `onPassInput`, `showPasswordError`, `togglePasswordVisible`, `onRestoreAccount`, `removeLoadingOverlay`, `nextStep/prevStep/toggleStep` | `back, restore, selectfile` |
| `intro_retry.html` | `checkPassword`, `restoreWallet`, `removeLoadingOverlay` | `proceed` |
| `lock.html` | `checkPassword`, `unlock`, `showError`, `setJustConfirm` | `change, onload, unlock` |
| `onboarding.html` | `onJoinCommunityClick`, `onFinishOnboarding` | `finish, joinbot` |
| `scan.html` | `androidFix` (html5-qrcode camera init inline) | `back, qrresult` |
| `settings.html` | `loadAvatar`, `setNickname`, `setLanguage/changeLanguage`, `setAppearance/changeAppearance`, `setLockEnabled`, `showRemoveAvatar`, `onBack` | `appearance, avatar, back, delete, deletea, deleted, deleteh, error, language, lock, onload, save` |
| `settings_backup.html` | — (onclick only) | `back, backupAccount, backupWallet` |
| `settings_encryption.html` | `checkPasswordMatch` | `back, changepass` |
| `settings_lock.html` | `setAddress` | `back, error, request` |
| `wallet_contact_request.html` | `setData` | `back, decline, send` |
| `wallet_recipient.html` | `addContact`, `clearContacts`, `noContacts`, `contactSearch`, `loadAvatar`, `selectRecipient/selectSingleRecipient/selectContacts`, `setMultiContactMode`, `updateButton/enableButton/updateRecipientsLabel`, `test` | `avatar, back, newcontact, select` |
| `wallet_request.html` | `setAddress`, `generateQR`, `addRecipient/removeRecipient/recipientExists`, `checkAmount`, `validate`, `test` | `addrecipient, back, pick, sendrequest` |
| `wallet_send.html` | `setAddress`, `setBalance`, `setAmount`, `checkAddress`, `onValidAddress`, `addRecipient/removeRecipient/recipientExists`, `validate`, `show/hideSendingModal`, `showSendingFailedModal` | `addrecipient, back, getMaxAmount, onload, pick, quickscan, send` |
| `wallet_send_2.html` | `setBalance`, `setFees`, `setRecipient`, `setMaxAmount`, `setTotalAmount`, `updateAmount`, `onMenuClose` | `back, getMaxAmount, onload, send` |
| `wallet_sent.html` | `setData`, `addEntry/clearEntries`, `setReceivedMode`, `hideBackButton` | `dismiss, viewexplorer` |

Shared `ixian:` from `spixi.js` (available on every page): `onload`, `qrresult`, `appAccept`, `appReject`, `hangUp`.

Script-inclusion deviations: `intro.html`/`intro_new.html`/`intro_restore.html`/`onboarding.html` load **only `spixi.js`** (no jQuery/Bootstrap JS); `intro_retry.html` and `lock.html` use `spixiui-intro.css` instead of the themed `*SL{SpixiThemeMode}` stylesheet (so they don't theme-switch); `scan.html` additionally loads `html5-qrcode.min.js`; `chat.html` loads `chat.js`; `index.html` loads `home.js`; `empty_detail.html` loads nothing but `empty-*SL{SpixiThemeMode}` CSS.

---

## 3. Localization — end-to-end mechanism

**No .resx is used.** Localization is a custom key=value text-file system plus HTML preprocessing.

1. **String tables**: `Spixi\Spixi\Resources\Raw\lang\<code>.txt` — plain `key = value` lines, `;` comments (en-us has ~576 keys). 13 languages: `cn-cn, en-us, es-co, de-de, id-id, fr-fr, it-it, ja-jp, lt-lt, pt-br, ru-ru, sl-si, sr-sp` (list hardcoded in `Spixi\Spixi\Lang\SpixiLocalization.cs:13`). Flag icons in `html\img\flags\`.
2. **Loading**: `SpixiLocalization.loadLanguage(lang)` parses the file into a `Dictionary<string,string>`; falls back to language-prefix match (e.g. `en-GB` → `en-us`). `testLanguageFiles()` + `Spixi-UnitTests\LocalizationTests.cs` validate key parity and `{0}`-arg counts across all files.
3. **Tokens in HTML**: pages embed `*SL{key}` placeholders — in markup text, attributes, **and inside inline `<script>`** (`var SL_Platform = "*SL{Platform}";`) and even in `<link href="css/*SL{SpixiThemeMode}">`. Roughly 540 token occurrences across the 29 pages (chat 88, index 79, settings 50, …).
4. **Preprocessing at page load**: `SpixiContentPage.generatePage()` (`Spixi\Spixi\Utils\SpixiContentPage.cs:173`) runs `SpixiLocalization.localizeHtml(...)` which does a line-by-line string replace of every `*SL{key}` with `_SL(key)` (unknown key → logged + empty string). On **Android** the localized HTML is served as an in-memory `HtmlWebViewSource` with `BaseUrl` pointing at the assets; on **other platforms** it writes a localized copy to disk as `ll_<name>.html` and loads it via `UrlWebViewSource`. Localization therefore happens **once per page navigation** — language/theme changes require regenerating the page.
5. **Dynamic values via the same channel**: `SpixiLocalization.addCustomString(key, value)` injects non-translation runtime values into the same dictionary, consumed by `*SL{}` tokens: `Platform` (`Xamarin-Droid/iOS/Mac/WPF`, set in each platform bootstrap), `SpixiThemeMode`/`SpixiThemeName` (`ThemeManager.cs:34-35`), `miniAppsStartNoteHidden`, `devMode`, `OnboardingComplete`, pre-formatted strings like `apps-not-sure-text`. i.e. the i18n system doubles as a template/config injection system.
6. **JS-side strings**: shared JS (`spixi.js`, `chat.js`, `home.js`) never contains tokens itself; each page's inline script defines `SL_*` globals (`SL_ChatPlaceholder`, `SL_Modals = {...}`, `SL_TimeJustNow`, …) from `*SL{}` tokens, which the shared JS reads. C#-composed messages (e.g. `string.Format(_SL("global-app-wants-to-use"), ...)`) also flow in via `sendUiCommand`.
7. **Language switching**: `intro.html`/`settings.html` emit `ixian:language:<code>`; C# calls `loadLanguage()` and reloads the page.

Implications for redesign: strings are baked into the DOM at generation time (no client-side i18n dictionary), the `*SL{}` replacement is line-based (`Trim()`s every line, drops blank lines — multi-line tokens would break), and there is no HTML-escaping of values on substitution.

---

## 4. Duplication patterns (consolidation targets)

### 4.1 Structural boilerplate (all pages)
- **Head block**: identical 5-link CSS set + 4-6 script tags copy-pasted into ~24 pages (only ordering differs, e.g. `clipboard.min.js` before/after `spixi.js`).
- **Toolbar/header**: the exact same `spixi-toolbar shadow > spixi-toolbar-row` block with `#backbtn` (fa-arrow-left) + `*SL{<page>-title}` appears on **~22 pages**, each with its own copy of `document.getElementById("backbtn").onclick = ... "ixian:back"`. `index.html` and `chat.html` have specialized variants (logo/title, chat identity + unread badge).
- **Bottom sheet / slide-up menus**: `toggleAnimatedSlider` pattern with blurred `#wrap` duplicated in index, contact_new, wallet_send, wallet_send_2, settings (each re-implements `onMenuClose`/`handleClickOutside`).

### 4.2 Copy-pasted inline JS (verified near-identical bodies)
| Cluster | Pages | Duplicated functions |
|---|---|---|
| QR display | `address`, `index`, `contact_details`, `wallet_request` | `generateQR` + `setAddress` (only diff: wallet_request appends `":ixi"`) |
| Recipient chips | `wallet_send`, `wallet_request` | `addRecipient`, `removeRecipient`, `recipientExists`, `validate`, `setAddress` (send version has multi-recipient part commented out) |
| Address validation | `contact_new`, `wallet_send` | `checkAddress` → `ixian:checkAddress`, `onValidAddress` |
| Mini-app launch | `index`, `app_details` | `onLaunchHandler`, `launchSoloMode`, `launchMultiUserMode`, `handleClickOutside` |
| App list | `apps`, `index` (+ `chat.js`) | `addApp`, `clearApps` |
| Contact list rendering | `wallet_recipient` vs `home.js` | `addContact`, `clearContacts`, `contactSearch`, `loadAvatar` |
| Step wizard | `intro`, `intro_new`, `intro_restore` | `nextStep`, `prevStep`, `toggleStep` (+ `setVersion` in intro/intro_new) |
| Password UX | `intro_new`, `intro_restore`; `lock`, `intro_retry`, `settings_encryption` | `togglePasswordVisible`; `checkPassword`/error display, `removeLoadingOverlay` |
| Avatar loading | `intro_new`, `settings`, `wallet_recipient`, `home.js`, `chat.js` | `loadAvatar` variants |

Also: `spixiui-light.css` vs `spixiui-dark.css` are two full parallel 115 KB themes, and `img/light/` vs `img/dark/` duplicate illustration sets.

### 4.3 Near-identical page variants (candidate merges for a ~9-shell architecture)

| Proposed shell | Pages absorbed | Rationale |
|---|---|---|
| Launch/intro wizard | `intro`, `intro_new`, `intro_restore`, `intro_retry`, `onboarding` | Same fullscreen no-toolbar layout, shared step-wizard + password JS; retry is a 1-step subset of restore |
| Lock/password prompt | `lock`, `settings_lock`, `settings_encryption` | All are title + password field(s) + error + single action; lock and settings_lock differ mostly in the emitted `ixian:` verb |
| Home shell | `index` (+ `empty_detail` as empty state) | Already tabbed; empty_detail is a static placeholder |
| Chat | `chat` | Unique |
| Contact form/detail | `contact_new`, `contact_details`, `wallet_contact_request` | Address entry/validation and profile+action layouts share toolbar, avatar, QR and action-list markup |
| Wallet flow | `wallet_send`, `wallet_send_2`, `wallet_recipient`, `wallet_request`, `wallet_sent` | One send/request pipeline artificially split into 5 pages; send vs request are ~70% identical, sent has send/receive modes already (`setReceivedMode`) |
| Simple list | `apps`, `downloads` (+ list part of `wallet_recipient`) | Toolbar + searchless list with add/clear/select functions of identical shape |
| Detail/installer | `app_details`, `app_new` | Both mini-app acquisition screens sharing install modals |
| Static/utility | `settings`, `settings_backup`, `contributors`, `dev`, `scan`, `address` (delete — orphaned) | Settings hub can host backup (3 buttons) as a section; contributors/dev are trivially static; scan stays a thin camera shell |

### 4.4 Other observations
- `address.html` is dead (no `loadPage` call references it) — delete or fold into the receive screen.
- `quickScanJS()` in `spixi.js` references the removed Instascan library — dead code.
- Every dynamic list item is built by string-concatenated `innerHTML` with `onclick="location.href='ixian:...'"` — a shared component/template layer would remove most of the per-page inline JS (~2,400 inline JS lines total across the 29 pages).
- Platform-specific hacks are keyed off the localization token `SL_Platform` at runtime (`chat.js:31,46,283`), mixing i18n and platform detection.
