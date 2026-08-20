# Spixi Frontend Architecture — Redesign Proposal

**Status:** Draft for backend review
**Branch:** `redesign/frontend`
**Scope:** WebView UI layer (`Spixi/Resources/Raw/html`) and its JS↔C# bridge. No C# changes are required to adopt this proposal; new bridge commands are *proposed only* (section 8) and mocked on the JS side until approved.

Full source-level audits backing this document are in [`docs/audit/`](docs/audit/):
[bridge-audit-A.md](docs/audit/bridge-audit-A.md) (Chat, Contacts, Home, Launch, Wallet pages), [bridge-audit-B.md](docs/audit/bridge-audit-B.md) (Settings, Scan, MiniApps, Downloads, Dev, Contributors + shared base class), [assets-audit.md](docs/audit/assets-audit.md) (HTML/JS/CSS assets, localization, duplication analysis).

---

## 1. Summary

The current UI is 29 standalone HTML pages, each owned by a MAUI `SpixiContentPage` subclass, communicating over two stringly-typed channels. The redesign consolidates these into **9 flow shells**, replaces Bootstrap/jQuery/FontAwesome with a single token-driven stylesheet + inline SVG icon sprite, and introduces a mock bridge so every screen runs and can be demoed in a plain browser. **The existing bridge protocol is kept as-is** — every current `ixian:` command and `executeUiCommand` call keeps working — so the C# side needs zero changes to ship the new frontend.

Headline numbers from the audit:

| Metric | Current |
|---|---|
| HTML pages | 29 (1 orphaned: `address.html`) |
| JS→C# `ixian:` command handlers | ~204 page-level + 3 global |
| C#→JS functions invoked | ~125 (several names reused with different arity per page) |
| Inline JS across pages | ~2,400 lines, heavily copy-pasted |
| Third-party payload | Bootstrap 5.3.8 (324 KB), jQuery 4.0.0 (95 KB), Font Awesome 7.2.0 (302 KB), html5-qrcode (375 KB), qrcode.js, clipboard.js |
| Theme stylesheets | 2 × 115 KB parallel copies (light/dark) |
| Localization | Custom `*SL{key}` build-time substitution, 13 languages, ~576 keys |

## 2. Current architecture (as audited)

### 2.1 Page lifecycle

Each MAUI page calls `loadPage(webView, "file.html")`. `generatePage()` runs the HTML through `SpixiLocalization.localizeHtml` (string-replacing `*SL{key}` tokens), then loads it — in-memory on Android, written to disk as `ll_<file>.html` on iOS/macOS/Windows. The page JS signals readiness by navigating to `ixian:onload` (`intro.html` uses `ixian:introload`); C#-side messages are queued until `document.readyState == "complete"`.

### 2.2 JS → C# transport

The page sets `location.href = "ixian:<command>[:params]"`. Each C# page's `onNavigating` handler URL-decodes the whole URL, delegates to a shared `onNavigatingGlobal` (3 commands: `appAccept`, `appReject`, `hangUp`), then matches its own commands with a mix of `Equals` / `StartsWith` / `Contains` and parses params positionally with `Substring`/`Split` on `:` and `|`. `MiniAppPage` adds a second scheme, `xa:<base64 JSON>`, for mini-app actions.

### 2.3 C# → JS transport

`Utils.sendUiCommand(page, fn, args...)` builds `executeUiCommand(fn, 'b64', 'b64', ...)` and injects it via `EvaluateJavaScriptAsync`, wrapped in a swallow-all `try/catch`. The function name is a bare JS identifier; **every argument is a Base64-encoded UTF-8 string**, positional, no JSON. `spixi.js` decodes and dispatches.

### 2.4 Update model

`HomePage` owns a 1-second UI tick that fans `updateScreen()` out to the visible page and the embedded split-view detail page. Several views rebuild entire lists every tick (e.g. `ContactDetails` re-pushes its whole activity list each second).

## 3. Command inventory (JS → C#)

Condensed reference; exact parsing rules, behaviors, and edge cases per command are in the audit appendices.

### Global (all pages via `onNavigatingGlobal`)

| Command | Purpose |
|---|---|
| `ixian:appAccept:<addr>:<sessionId>` | Accept VoIP call / mini-app session request |
| `ixian:appReject:<addr>:<sessionId>` | Reject VoIP call / mini-app session request |
| `ixian:hangUp:<sessionId>` | Hang up active call |

### Home (`index.html` → `HomePage`, 40 commands)

`onload` · `quickscan` · `qrresult:<data>` · `filter:<all|sent|received>` · `balance:<hide|show>` · `newchat` · `newcontact` · `newapp` · `sendixi` · `receiveixi` · `settings` · `lock` · `about` · `guide` · `backup` · `encpass` · `chat:<addr>` · `details:<addr>` · `txdetails:<txid>` · `tab:<tabId>` · `downloads` · `contributors` · `share` · `rating:<yes|no>` · `sendLog` · `onboardingComplete` · `joinBot` · `startApp:<appId>` · `startAppMulti:<appId>` · `appDetails:<appId>` · `explorer` · `miniAppsStartNoteHidden` · `enableDevMode` / `disableDevMode` · `dev` · `spixiAppsLink` · (deprecated/no-op: `wallet`, `avatar`, `activity`, `copy`)

### Chat (`chat.html` → `SingleChatPage`, 29 commands + 7 context sub-actions)

`onload` · `back` · `request` · `details` · `send` · `accept` · `loadmore` · `call` · `sendmedia` · `sendfile` · `acceptfile:<id>` · `openfile:<id>` · `chat:<text>` · `viewPayment:<msgId>` · `app:<appId>` · `installApp:<url>` · `joinApp:<appId>` · `loadContacts` · `populateChannelSelector` · `selectChannel:<i>` · `contextAction:<action>:<msgId>[:<data>]` (tip · like · deleteMessage · report · kickUser · banUser · sendContactRequest) · `enableNotifications` / `disableNotifications` · `sendContactRequest:<addr>` · `kick:<addr>` · `ban:<addr>` · `typing` · `leave` · `openLink:<url>` · `undorequest`

### Wallet flow (5 pages, ~30 commands)

- `wallet_send.html`: `onload` · `back` · `pick` · `quickscan` · `error` / `error2` · `send:<addr>` · `getMaxAmount:<addr>` · `addrecipient:<addr>` · `checkAddress:<addr>`
- `wallet_send_2.html`: `onload` · `back` · `send:<amount>` · `getMaxAmount`
- `wallet_sent.html`: `onload` · `dismiss` · `viewexplorer`
- `wallet_request.html`: `onload` · `back` · `pick` · `error` · `sendrequest:<addr>:<amt>|...` · `addrecipient:<addr>`
- `wallet_recipient.html`: `onload` · `back` · `newcontact` · `select:<flags+name>:|<addr>|...` · `avatar`
- `wallet_contact_request.html`: `onload` · `back` · `decline` · `send`

### Contacts (2 pages)

- `contact_new.html`: `onload` · `back` · `error` · `request:<addr>` · `quickscan` · `qrresult:<data>` · `checkAddress:<addr>`
- `contact_details.html`: `onload` · `back` · `remove` · `removehistory` · `request` · `send` · `chat` · `txdetails:<txid>` · `userdefinednick:<nick>`

### Launch / lock (2 pages)

★ N75 (#391) collapsed the four launch pages into ONE (`LaunchPage` + `intro.html`);
★ N76 (#391) deleted the onboarding tail (`OnboardPage` + `onboarding.html`). The
verbs below are the union the one page now handles — none were added or removed.

- `intro.html`: `introload` · `create` · `restore` · `back` · `accept` ·
  `language:<code>` · `avatar` · `error` · `create:<nick>:<password>` ·
  `selectfile` · `restore:<password>` · `proceed:<password>`
  (pushes: `setVersion` · `showTerms` · `showOnboardingSection` · `loadAvatar` ·
  `setUploadedFileName` · `showPasswordError` · `removeLoadingOverlay` ·
  `setLaunchView`). `appearance:<int>` retired with the welcome picker (N72).
- `lock.html`: `onload` · `back` (no-op) · `unlock:<password>` · `change`

### Settings (4 pages)

- `settings.html`: `onload` · `back` · `error` · `delete` · `deletea` · `deleteh` · `deleted` · `backup` · `save:<nick>` · `avatar` · `remove` · `language:<code>` · `lock:<on|off>` · `appearance:<int>`
- `settings_backup.html`: `onload` · `back` · `error` · `backupAccount` · `backupWallet`
- `settings_encryption.html`: `onload` · `back` · `error` · `changepass:<old>--1ec4ce59e0535704d4--<new>` (magic-delimiter format)
- `settings_lock.html`: `onload` · `back` · `unlock`

### Mini-apps (4 pages)

- `apps.html`: `onload` · `back` · `details:<appId>` · `newapp`
- `app_new.html`: `onload` · `back` · `quickscan` · `qrresult:<data>` · `fetch:<url>` · `selectAppFile`
- `app_details.html`: `onload` · `back` · `install` · `uninstall` · `details` · `startApp:<appId>` · `startAppMulti:<appId>`
- `MiniAppPage` (mini-app runtime, loads the app's own HTML — **out of redesign scope**): `onload[:<sdkVer>]` · `back` · `data:<payload>` · `protocolData<id>=<data>` · `getStorageData<key>` · `setStorageData<key>=<val>` · `action<json>` · `xa:<b64 json>`

### Utility (4 pages)

- `scan.html`: `onload` · `back` · `error` · `qrresult:<text>`
- `downloads.html`: `onload` · `back` · `open:<file>` · `delete:<file>`
- `dev.html`: `onload` · `back`
- `contributors.html`: `onload` · `back`

## 4. Per-view data contracts (C# → JS)

What C# pushes into each view. Full argument lists and triggers in the appendices.

| View | Data pushed in (JS functions) |
|---|---|
| **Home** | `selectTab` · `loadAvatar` · `setVersion` · `setAddress` · `setHideBalance` · `selectChat` / `selectTx` (split view) · `clearContacts`/`addContact(addr, nick, avatar, online, unread)` · `clearChats`/`addChat(addr, nick, ts, avatar, online, excerpt, type, unread, kind, mention)`/`clearChatsDone` · `addChatReaction(addr, nick, key, unixSecs)` · `setUnreadIndicator` · `clearPaymentActivity(filter)`/`addPaymentActivity(txid, received, counterparty, time, amount, fiat, confirmed)` · `setBalance(balance, fiat, nick)` · `setContactStatus` · `showWarning` · `toggleAnimatedSlider` · `showRatingPrompt` · `updateDebugInfo` |
| **Chat** | `onChatScreenReady`/`onChatScreenLoaded` · `setChatMode(type, cost, costText, admin, desc, notif)` · channel functions (`addChannelToSelector`, `setSelectedChannel`, `setChannelSelectorStatus`) · message renderers: `addMe`/`addThem` (11 args) · `addPaymentRequest` (14) · `addFile` (13) · `addAppRequest` (13) · `addCall` (7 — +outgoing/missed/durationSecs, #208) · `updateMessage` · `updateFile` · `updateTransactionStatus` · `updatePaymentRequestStatus` · `addReactions` (+ trailing own-keys arg, #208) · `deleteMessage` · `clearMessages` · `clearInput` · `showUserTyping` · `setNickname` · `setOnlineStatus` · `setUnreadIndicator` · `showWarning` · `showCallButton` · `showRequestSentModal` · `showContactRequest` · `clearApps`/`addApp` · `hideBackButton` |
| **Contact details** | `setAddress` · `setNickname` · `setAvatar` · `showIndicator` · `clearRecentActivity`/`addPaymentActivity(txid, type, time, amount, confirmed)` — note: 5-arg variant vs Home's 7-arg |
| **Contact new** | `setAddress` · `onValidAddress` |
| **Wallet send 1** | `setBalance(balance, fiatPrice)` — 2-arg variant · `addRecipient(nick, addr)` · `setAmount` · `onValidAddress` · `showSendingModal`/`hideSendingModal`/`showSendingFailedModal` |
| **Wallet send 2** | `setRecipient(nick, addr, avatar)` · `setBalance` · `setFees` · `setMaxAmount` |
| **Wallet sent** | `clearEntries`/`addEntry(addr, user, avatar, amount, fiat, time, type, confirmed)` · `setData(amount, fee, time, txid, confirmed)` · `setReceivedMode` · `hideBackButton` |
| **Wallet request** | `setAddress` (own QR) · `addRecipient` |
| **Recipient picker** | `clearContacts`/`addContact(addr, nick, avatar, online, type)` · `noContacts` · `setMultiContactMode` · `loadAvatar` |
| **Payment request confirm** | `setData(addr, nick, amount, fee, date)` |
| **Launch pages** | `setVersion` · `showTerms` · `showOnboardingSection` · `loadAvatar` · `setUploadedFileName` · `showPasswordError` · `removeLoadingOverlay` |
| **Lock** | `setJustConfirm` |
| **Settings** | `setNickname` · `setAppearance` · `setLockEnabled` · `showRemoveAvatar` · `loadAvatar` · `onBack` (hardware-back bounce) · `setVersion` · `setAddress` (plain identity form, #208) · `setLanguage` |
| **Apps / app details** | `clearApps`/`addApp(id, name, icon)` · `init` (14 args) · `showInstalling`/`showInstallSuccess`/`showInstallFailed`/`showAppRemoved` · `setScannedData` · `showUrlError` |
| **Downloads** | `clearFiles`/`addFile(name, created)` |
| **Dev** | `setLog(fullLogText)` |
| **All pages** (base class) | `displayCallBar` · `hideCallBar` · `clearAppRequests`/`addAppRequest(sessionId, text, acceptLabel, rejectLabel)` · `addCallAppRequest` |

## 5. Consolidation proposal: 29 pages → 9 flow shells

Each shell is one HTML file with internal client-side views ("routes"). **The MAUI page classes and navigation stack stay exactly as they are** — multiple C# pages simply load the same shell file and select their view with one extra bridge call on load (`setRoute('<view>')`, see section 8). This keeps the C# diff to near-zero while eliminating 20 files of duplicated markup.

| # | Shell | Absorbs | Internal views |
|---|---|---|---|
| 1 | `launch.html` | intro (ONE page since N75; intro_new/intro_restore/intro_retry/onboarding deleted) | welcome (language/terms) · create · restore · retry |
| 2 | `lock.html` | lock, settings_lock, settings_encryption | unlock · confirm-action · set-lock · change-encryption-password |
| 3 | `home.html` | index, empty_detail | tabs (chats/contacts/wallet/apps) · empty-detail pane |
| 4 | `chat.html` | chat | 1:1 · group · blind group · bot (already modal internally) |
| 5 | `payments.html` | wallet_send, wallet_send_2, wallet_recipient, wallet_request, wallet_sent, wallet_contact_request | recipient → amount → result pipeline · request mode · incoming-request confirm · tx detail |
| 6 | `contacts.html` | contact_new, contact_details | add-contact · contact profile |
| 7 | `apps.html` | apps, app_new, app_details | installed list · add (URL/QR/file) · details/installer |
| 8 | `settings.html` | settings, settings_backup, downloads, dev, contributors | hub · backup · downloads · log viewer · credits |
| 9 | `scan.html` | scan | camera view (kept separate: html5-qrcode is a 375 KB payload only this shell needs) |

Deleted: `address.html` (orphaned — no C# page loads it). Untouched: `MiniAppPage` runtime (loads mini-apps' own HTML; not part of the Spixi UI surface).

Why this grouping holds up against the audit:

- **payments** — the send/request pipeline is already one flow artificially split across 5 files with verified copy-pasted `addRecipient`/`generateQR`/`validate` bodies; `wallet_sent.html` already has dual send/receive modes (`setReceivedMode`).
- **launch** — all of them share the fullscreen step-wizard + password-toggle JS; `intro_retry` is a one-step subset of `intro_restore`. ★ N75 went further than the grouping: one shell AND one C# page AND one WebView, switching views in place.
- **lock** — three variations of title + password field + error + action; they differ mostly in which `ixian:` verb they emit.
- **Name-collision fix for free**: today `addPaymentActivity`, `setBalance`, `setChatMode`, `addAppRequest` exist with different arities on different pages. Since shells are separate files, existing C# calls keep working unchanged — each shell implements the arity its C# callers use.

### Rollout / review checkpoints

1. BE reviews this document (esp. sections 5, 8, 9).
2. Shells built one at a time against the mock bridge; browser demo per shell.
3. Each shell verified against the command inventory above (every command its absorbed pages handled must be handled by the shell).
4. C# `loadPage` calls re-pointed per shell — a one-line change per page class, done in a single reviewed PR.

## 6. New frontend stack

- **Build:** Vite, vanilla JS (no framework). Built output is committed to `Resources/Raw/html`, so MAUI builds and CI need no Node toolchain. Source lives in `src/` at repo root.
- **Styling:** one stylesheet generated from design tokens (`src/styles/tokens.css`, exported from the Figma `tokens` variable collection). Dark mode = token swap on a `data-theme` attribute — replaces the two parallel 115 KB theme files. Default follows the OS (`prefers-color-scheme`) with manual override; the existing `ixian:appearance:<int>` command keeps working and no longer requires a page reload.
- **Icons:** Tabler icons as an inline SVG sprite (only the icons used, ~5–10 KB) — replaces Font Awesome (302 KB).
- **Fonts:** Sora (headings) + Source Sans 3 (body) as variable WOFF2, Latin subset, replacing Inter.
- **Dropped:** Bootstrap, jQuery, Font Awesome, normalize.css (~730 KB of third-party payload → ~0). `qrcode.min.js`, `clipboard.min.js`, `html5-qrcode` are kept (small, or isolated to the scan shell).
- **Mock bridge:** `src/bridge/mock.js` implements both transports (`executeUiCommand` injection and `ixian:` interception) with fixture data, so every shell runs in a plain desktop browser for demos and development. The real bridge (`src/bridge/native.js`) is a thin adapter; shells never talk to either directly.
- **WebView baseline:** conservative CSS (no nesting, no container queries, no `:has()`); flex/grid + custom properties only. Candidate modern features will be flagged per-case during demos.

## 7. Localization plan

Constraint: the current system substitutes `*SL{key}` tokens at page-generation time in C# (`SpixiLocalization.localizeHtml`), which forces a full page regeneration on language change, does line-based replacement (multi-line values break), and doesn't HTML-escape values.

Approach for the shells — **no C# changes required**:

- Keep the `*SL{...}` token channel, but each shell embeds exactly one token block: an inline `<script>` defining a `window.SL = { key: "value", ... }` dictionary of only the keys that shell uses (the mechanism already injects tokens into inline JS today — e.g. `SL_Platform`; this generalizes that pattern).
- All markup is rendered client-side from templates reading `SL`, so strings are applied with `textContent` (XSS-safe, no escaping bugs), and a language switch only needs the existing reload behavior — but becomes instant later if a `getStrings` bridge command is approved (section 8).
- Config values currently smuggled through the i18n channel (`Platform`, `SpixiThemeMode`, `devMode`, `OnboardingComplete`, `miniAppsStartNoteHidden`) arrive the same way in a `window.SPIXI_ENV` block, keeping them separate from translation strings.
- The 13 language files and the key-parity unit tests stay untouched.

## 8. Proposed new bridge commands (spec only — for BE approval)

Mocked in `src/bridge/mock.js`; shells degrade gracefully if unimplemented (feature-detected via a capability handshake). None block the redesign.

| Proposed command | Direction | Purpose |
|---|---|---|
| `setRoute(view, paramsB64)` | C#→JS | Tell a shell which internal view to show. Interim fallback: a `*SL{Route}` custom string injected at generation time, which works today with one `addCustomString` call per page class. |
| `ixian:ready:<shellId>` | JS→C# | Replaces `ixian:onload`/`ixian:introload` inconsistency for shells (old commands still emitted for compatibility). |
| `getStrings(langCode)` → `setStrings(jsonB64)` | JS→C# → C#→JS | Instant language switching without page regeneration. |
| `patchList(listId, jsonB64)` | C#→JS | Delta updates for chat/contact/activity lists instead of clear-and-rebuild every tick (fixes the 1 s full-list rebuild in ContactDetails and reduces main-thread JS churn everywhere). |
| `ixian:secure:<command>` + body via `postMessage` | JS→C# | Migration path to stop sending passwords through navigation URLs (see 9.1). Existing commands untouched until BE decides. |
| **Favorites + pinned chats** — `ixian:chatFlag:<addr>:<favorite\|pin>:<0\|1>` (persist C#-side) + extend `addChat` with `favorite`/`pinned` args (or a flags arg). UI: Favorites filter chip + pin glyph already designed; both feature-flagged off until BE lands this (DECISIONS #67) | both | Chat-list filter chips (All/Unread/Favorites/Groups) — Unread/Groups filter client-side today; Favorites/pinned have no bridge persistence. |
| **Voice messages** — `ixian:voiceRecord:start/stop/cancel` (native mic capture), `voiceNote` message type riding the existing file-transfer pipeline (`fileHeader` with audio MIME + duration metadata), `addVoiceNote(...)` renderer call, playback via local file path | both | Damir 2026-07-03: voice support planned soon; composer ships with a feature-flagged mic slot (DECISIONS #64) so UI needs no rework when BE lands this. |
| `showWarning(text, kind)` — add a warning-class arg (`connectivity` / `update` / `generic`) to the existing C#→JS call | C#→JS | Lets the shell route connectivity states into the top-bar title (premium messenger pattern, DECISIONS #59) while actionable notices keep the banner. Backwards compatible: missing arg → `generic` → banner. |
| `ixian:contextAction:reply:<msgId>` + reply metadata in message payloads | JS→C# / C#→JS | Reply-to-message: send referenced msgId with outgoing chat text; message renderers receive optional replied-to excerpt. Menu shows Reply only if BE confirms support. |
| `ixian:contextAction:edit:<msgId>:<newText>` + `updateMessage` reuse | JS→C# | Edit own message; C# validates ownership/time window, propagates via existing `updateMessage` C#→JS call. Menu shows Edit only if BE confirms support. |
| `ixian:search:<queryB64>` → `setSearchResults(jsonB64)` | JS→C# → C#→JS | Full-text search across all chats' message history (bodies, filenames, links). Histories live C#-side only; the WebView never receives them, and caching them in WebView storage would breach SECURITY.md isolation — so this cannot be frontend-only. Frontend ships chat-LIST search meanwhile (names + excerpts + highlight, DECISIONS #52, no BE needed). Results `[{chatAddress, msgId, ts, senderNick, snippet, type}]` (`type` ∈ text/file/link/mention — lets the frontend group results WhatsApp-style), capped ~50; tapping a result uses existing chat navigation. BE effort estimate: bridge plumbing = hours (existing patterns); MVP capped linear scan over per-contact stores = ~2–4 days incl. async + 4-platform testing; indexed (SQLite FTS / in-memory) = 1–2 weeks. Contract identical either way — index is a drop-in upgrade. |
| `ixian:sendlog` | JS→C# | Dev screen "Send log": C# opens the OS email/share sheet with ixian.log ATTACHED (mailto: can't carry it — URL limits), suggested recipient BE's pick (info@ixian.io floated). FE ships the button §9-gated behind `onSendLog` (DECISIONS #153②, settings-shell-spec §9b⑦). |
| **Share app** — details + ⋮ "Share app" → contact picker → sends the install link as a chat message | JS→C# | Single-player apps can't be shared via App invite today; workaround = dig the URL out of Advanced → paste in chat (DECISIONS #128①, approved #129). |
| **OS share sheet** — share the account address / receive-QR payload via the native share sheet | JS→C# | No legacy share command exists. Wallet receive "Share" + the settings address-chip share button ship against `navigator.share` where available; a bridge command makes it uniform (DECISIONS #137, #148⑤). |
| **Settings preference family** — read-receipts toggle · typing-indicator toggle · global notification prefs (master / lock-screen previews / in-app sounds) · security-tier commit (FE sends the tier id, the policy cascade is C#-side — proposed Basic/Moderate/Strict translation table in settings-shell-spec §10 for BE confirm) · confirm-payments preference (`capabilities.paymentAuth`, C# enforces PIN/bio before a payment leaves review) · optional pref-sync for FE-only settings (chat appearance persists in WebView localStorage until then) | both | Legacy bridge has only per-chat group/bot mute; all five screens are built and ship capability-gated (DECISIONS #147, #150⑤). |
| **`addApp` publisher field** — extend the `addApp` payload | C#→JS | Installed app rows show the creator the design wants; gracefully omitted until then (DECISIONS #122). |
| ~~**Hosted panes (desktop)** — embedded pages route through the host WebView~~ **— ❌ WITHDRAWN on security grounds (DECISIONS #220 · SECURITY.md §1, the paramount invariant).** Routing embedded panes through ONE host WebView would put chat (which renders untrusted content) in the SAME WebView/DOM/JS context as the wallet — collapsing surface isolation, so a chat exploit could read wallet/other-pane data. **Chat, and any untrusted surface, ALWAYS resides in its own WebView.** Desktop stays **N isolated WebViews** (one per pane); cross-pane coordination via C# (`selectChat`/`selectTx`), never a shared JS context; layout chrome may share a WebView but chat CONTENT never does. Only ever a proposal — never built; the real app already uses the separate-WebView model (#177) and stays that way. Cost accepted: multi-pane layout is MAUI-side work hosting N WebViews, NOT pure-frontend. | both | ❌ Superseded by SECURITY.md §1 / DECISIONS #220. |

UX rework of the payments, add-contact, and chat screens stays within existing bridge capabilities per kickoff agreement; anything needing more will be added to this table, not implemented unilaterally.

## 9. Findings for backend attention

Not blocking the redesign; listed for awareness and future hardening. Sources: audit appendices.

### 9.1 Security

- Wallet password stored in plaintext `Preferences["walletpass"]` on create/restore/retry paths (existing TODOs in code). **Verified bug:** every write/read uses the key `"walletpass"`, but all three removal sites (`SettingsPage.cs:264`, `LaunchCreatePage.cs:142`, `LaunchRestorePage.cs:126`) remove the misspelled key `"waletpass"` — the plaintext password is never actually deleted, including on wallet deletion.
- Passwords transit through WebView navigation URLs (`ixian:create`, `ixian:restore`, `ixian:proceed`, `ixian:unlock`, `ixian:changepass`).
- `ixian:deleteh` (delete all history) and `ixian:deleted` (delete downloads) are not auth-gated, while wallet/account deletion is LockPage-gated.
- `downloads.html` `ixian:open:<file>` / `ixian:delete:<file>` do no filename sanitization (path traversal possible in principle).
- Backup encryption silently uses the `walletpass` preference, with failures only logged — no user feedback.

### 9.2 Protocol robustness (parsing bugs the redesign will avoid triggering)

- `ixian:create:<nick>:<password>` parses the password with `Replace(nick + ":", "")` — corrupts passwords containing that substring.
- `ixian:select:` (recipient picker) uses the group name itself as a split token — a group name containing `:|` breaks parsing.
- `HomePage` checks `StartsWith("ixian:startAppMulti")` / `("ixian:appDetails")` without the trailing colon but `Substring`s with it — a bare command throws.
- Several handlers match with `Contains` rather than `StartsWith`, so a command string anywhere in a URL would trigger them.
- Mini-app session IDs are deterministic (`sha3(appId)`, TODO in code) — collides across concurrent sessions of the same app.

### 9.3 Performance

- 1-second tick rebuilds entire lists (`ContactDetails` activity list, Home chat/contact lists on refresh flags); `patchList` (section 8) is the proposed fix.
- Blocking `Thread.Sleep` loop (up to 5 s) in chat `onLoad` waiting for bot info; blocking `HttpClient .Result` inside mini-app action handling.
- `dev.html` receives the entire unbounded log file as a single Base64 `EvaluateJavaScriptAsync` call.

### 9.4 Dead code

- `address.html` — orphaned, no C# page loads it.
- `quickScanJS()` in `spixi.js` references the removed Instascan library.
- `ixian:wallet`, `ixian:avatar` (Home), `ixian:activity`, `ixian:copy` — deprecated/no-op handlers.

### 9.5 Redesign feature dependencies — the Phase-3 BE-review sync table

Every item below surfaced during the frontend redesign (component + shell work) and is **tabled for BE confirmation**. **None blocks the redesign** — each feature ships feature-flagged or against mock data in `src/bridge/mock.js` and degrades gracefully until the signal/flag lands. Fully-specified *command* proposals live in §8; this table is the single authoritative list of **everything else BE needs to provide, confirm, or harden**, kept in sync with `DECISIONS.md` (row refs in the last column). *Re-synced 2026-07-06 for the Phase-3 review — consolidates DECISIONS #120–#171 on top of the #119 sync.*

Kind legend: **signal** = new C#→JS event/push · **data** = extra fields on an existing payload · **confirm** = behavior/semantics question · **config** = value/decision BE owns · **guard** = C#-side hardening mirroring an FE gate (see §9.1/§9.2).

| Area | Ask | Kind | Frontend today | Ref |
|---|---|---|---|---|
| Chat | **Contact-accept handshake**: explicit **complete** and **fail/timeout** events on accept (or Accept-ack semantics) — a message sent before key exchange finishes would fail | signal | staged "Establishing…" row; entry unblocks on *complete*; mock timers (650 ms ack → 2.6 s complete) + `failHandshake` path | #109/#116/#117 |
| Chat | **Request delivery shape** — do incoming requests arrive via `showContactRequest` or `addChat(type=request)`? | confirm | model normalizes both to a `relation:'pending'` entry | chats-shell-spec §5, #86 |
| Chat | **Per-chat mark-read call** | confirm | unread counts clear client-side only | chats-shell-spec §10 |
| Chat | **Unread badge total** — are muted chats excluded from the total C#-side? FE excludes them | confirm | badge = mock sum, muted excluded | #42 |
| Chat | **Blind-group flag + member addresses** exposed to the WebView? | data | member sheet shows full address for verification; blind groups hide identity | #99 |
| Chat | **Per-member relation state** `none / pending / contact` | data | member-sheet CTA switches on it; fixture | #102 |
| Chat | **Reaction senders** — aggregation must carry sender names/addresses, not only per-emoji counts | data | "+N" reactions sheet lists *who*; fixture | #83 |
| Chat | ✅ **Declined vs missed call** distinguished — LANDED #208 (`addCall` args 5–7 outgoing/missed/durationSecs). OPEN: call-back nudge shows during an ACTIVE call (Damir finding 3 → be-cutover C4). | data | third call-card state (declined = no call-back nudge) | #87⑦/#208 |
| Chat | **Self-destructing messages** — per-chat **window command**, message **TTL + deletion signal**, and **both-peer expiry enforcement** | signal | chat-info setting row ships capability-gated (`capabilities.selfDestruct`) | #87③/#142 |
| Chat | **1:1 mute/notifications** — bridge has only group/bot `ixian:en/disableNotifications` | confirm | toggle designed for both, 1:1 gated off | #141 |
| Chat | **Shared-media inventory** — paged media-strip command | signal | chat-info media strip gated `capabilities.media` | #141 |
| Chat | **Presence / last-seen push** for the chat-info hero line | signal | fixture | #141 |
| Chat | **Group name/avatar edit** — no verb; admin-side semantics | confirm | desktop group-rename blocked on it (`onNickname` is 1:1-only) | #141, desktop-split-spec §6c⑨ |
| Chat | **Room-wide payment request** in groups — anyone-pays semantics? | confirm | group request bubble parked on the answer | #139/#141 |
| Chat | **Bot member roster feed + paging** — chat-info member list now renders for `kind='bot'` (12.4k-member scale) | signal | demo-fed list, no real feed | desktop-split-spec §6d⑤ |
| Chat | **Pay/Decline/Cancel callbacks** — verify matching `ixian:` commands exist (§3 inventory shows only `viewPayment`) | confirm | shell contract assumes bridge re-render replaces latched cards | audit/chat-full-audit-r2.md |
| Chat | **Tipping**: ① network fee — absorbed, shown, or min-amount floor? ② does the bridge re-emit the reaction/tip set (pill state) or does FE paint optimistically? ③ groups: C# resolves MSGID→sender address itself? ④ repeat tips aggregate ("6 IXI") or last-wins? | confirm | `ixian:contextAction:tip:MSGID:AMOUNT` exists (chat.js:1670); sheet built | #138, tipping-spec |
| Chat | **Amount display parity** — FE renders ≤2 dp **string-truncated, never rounded**; C# must mirror the rule (confirm rounding stance) | confirm | `formatIxiAmount` shared FE-side | #77/#95 |
| Chat | **Link-preview payload** — P2P can't unfurl server-side → sender composes `{url, title, domain, image}`; bridge carries it (Signal-style) | data | preview card; URLs already linkify + confirm-gated without it | #82 (→§8 candidate) |
| Chat | **Image thumbnail standard** — which BlurHash/ThumbHash family + decoder? Component takes the *decoded* thumb as `preview`. Plus: who owns "auto-load media" | config | media tile's blurred preview; tap-to-load is the P2P-safe default | #81 |
| Chat | **Sender-side transfer progress** — does `updateFile` cover both directions? | confirm | outgoing bubbles render "Uploading · x of y"; direction-agnostic mock | #107 |
| Chat | **Download-start notify** to the sender (+ "stay online" prompt) — P2P needs both peers online | signal | "Keep Spixi open" hint on transfer bubbles | #87⑤ |
| Wallet | **Tx fee in payload** — `addPaymentActivity` carries no fee | data | detail sheet shows Fee only when provided | #134 |
| Wallet | **History paging** for the activity list — or confirm full-rebuild stays | confirm | mock feed | #133 |
| Wallet | **IxiScope URL pattern** (BE/lang config) + wallet-history **refresh semantics** | config | "Missing a transaction?" explainer sheet; placeholder URL | #98/#133 |
| Wallet | **Balance-fiat source** — logged for later (v1 = IXI-only home per Damir) | config | fiat line omitted | #134 |
| Wallet | **Dust display floor** — amounts <0.01 IXI render "0"; pick a floor/rule | config | — | #85/#133 |
| Wallet | **`ixian:sendrequest` single-contact semantics** — legacy fired addr:amount pairs | confirm | receive/request surface mirrors legacy format | #137 |
| Apps | **Discover feed transport** — iOS WKWebView http/https whitelist: direct fetch of `apps.spixi.io/data/apps.json` vs bridge proxy | confirm | demo fetches live, falls back to a bundled snapshot; shell owns transport | #128④/#129/#131 |
| Apps | Feed **schema wishlist** (site repo, non-bridge): cover, screenshots[], related[], size, verified | config | graceful omission | #129 |
| Settings | **Backup**: last-backup timestamp persisted + exposed · dirty-since signal (contacts/wallet activity since) · explicit completion callback (vs "share sheet opened") | signal | date-only mock states, capability-flagged (#115 convention) | #131②/#146, backup-ux-spec §5 |
| Settings | **`ixian:deleteh` auth gate** — should it ride the LockPage gate like deletea/delete? (§9.1) | confirm | FE always confirms destructively | #146 |
| Settings | ✅ **Version string** for the About row — LANDED #208 (`SettingsPage.onLoad` → `setVersion`). Also landed: `setAddress` (identity form) + `setLanguage` current pick. | data | real | #146/#208 |
| Settings | **Language list source** — expose available lang files, or FE ships the list at build time | config | FE list | #146 |
| Settings | **Security tiers** — tier id commit + C#-side policy cascade; confirm the proposed Basic/Moderate/Strict table | confirm | screen ships gated `securityTiers` (→§8 family) | #147, settings-shell-spec §10 |
| Settings | **Downloads path sanitization** C#-side on `ixian:open/delete:<name>` (`..` traversal, §9.1) | guard | FE never composes paths | #152⑤ |
| Settings | **`addFile` ISO timestamp** instead of locale-opaque `DateTime.ToString()` (nice-to-have) | data | ctime displayed as-is, never parsed | #152⑥ |
| Settings | **Bulk download/export verb** — desktop downloads multiselect parked on it (per-file `ixian:open` only) | confirm | multiselect not built ("not cheap") | desktop-split-spec §6d |
| Contacts | **Roster `addContact` pending flag** — picker badges request-sent contacts | data | mock only; real shell can infer if it owns both models | #155 |
| Contacts | **`addContact` originalNick** — carry BOTH user-set nickname and the contact's own (e.g. `addContact(address, nickname, avatar, online, type, originalNick)`) | data | row subline = middle-truncated address until then | #156, contacts-spec §2 |
| Contacts | **`:\|` sanitize server-side** — group name reaches a `:\|`-split parse (§9.2); FE gates but that's not a boundary | guard | FE inline-errors, never sends | #155 |
| Contacts | **Nickname/handle lookup** for add-contact (address-only today) | signal | carried §8 ask | contacts-spec §2 |
| Scan | **`ixian:qrresult:` self-truncation guard** — hostile QR embedding the literal prefix truncates itself through C# `Split` (§9.2) | guard | FE one-shot decode gates hostile payloads | #158 |
| Lock | **Biometric retry** — bless the `ixian:onload` re-emit (LockPage.onLoad relaunches Plugin.Fingerprint) or ship `ixian:bioretry` | confirm | re-emit IS the retry affordance | #159, lock-spec |
| Lock | **Explicit unlock-failed signal** — `ixian:unlock:` gets NO JS reply on wrong password; FE silently auto-releases at 1600 ms (value kept) | signal | auto-release contract, never wedges | #159, lock-spec |
| Lock | **Encpass delimiter guard** C#-side — password containing the `--1ec4ce59e0535704d4--` literal shifts C# `Split` slots (§9.2) | guard | FE gates all 3 fields | #159 |
| Lock | **Page-replace latency** after unlock success — FE's success morph auto-reverts at +1400 ms; if C# replaces the page slower, the screen reads wedged | confirm | [L1] timing flag | #162 |
| Launch | **`create:<nick>:<password>` parse guard** C#-side — nick-colon corruption (§9.2) | guard | FE gates both hazards inline | #163/#165, launch-spec §9 |
| Launch | **Explicit create-failure signal** — today a silent death = indefinite spinner | signal | FE can only spin | launch-spec §9③ |
| Launch | **Backup-tail routing** — "Back up now" = onboardingComplete + open Backup; confirm `ixian:backup` reuse, no new verb | confirm | tail built on the reuse assumption | launch-spec §9② |

### 9.6 New `ixian:` verbs landed by the 2026-08-19 overnight batch (#441–#447)

The bridge is frozen unless BE approves a new command (§8). Three verbs were added in this
batch, each with its C# handler in the same commit, and each listed here so the freeze
stays an accounting rule rather than an honour system.

| Verb | Host page | What it does | Why it needed a verb | Ref |
|---|---|---|---|---|
| `ixian:chatreply:<id-hex>:<text>` | `SingleChatPage` | send a message that references another | a reply target cannot ride `ixian:chat:` — its payload is the raw body | #441 |
| `ixian:txexplorer:<txid>` | `HomePage` | open ONE transaction on explorer.ixian.io | only an address-scoped `ixian:explorer` existed (this closes **W3** on this page) | #443 |
| `ixian:viewcontact:<address>` | `ContactNewPage` | open the contact you already have | the add-contact screen had no route to an existing contact | #443 |

★ **`ixian:chatreply:` is unreachable AND has no carrier (#448).** The `reply` capability
is declared by no `setCaps` call, so nothing can create a reply — and the Ixian-Core field a
reply would ride is held out for the BE cutover
(`docs/be-cutover-ixian-core-reply-carrier.md`), so a target that somehow arrived would be
parsed, logged and dropped. The verb ships now so the FE↔C# contract is settled and the
cutover is a small diff. ⚠ Do NOT declare `reply` before the carrier lands.

**Already specified as command proposals in §8** (repeated here so BE reviews them in one pass): favorites + pinned-chat persistence (`ixian:chatFlag…` + `addChat` flags, **#67** — the Chats shell parks pin/mute on this), voice messages (**#64**), full-text message-history search (`ixian:search` → `setSearchResults`), `patchList` delta list updates, the `showWarning(text, kind)` connectivity class, reply + edit context actions (**#25**), `getStrings`/`setStrings` instant language switching (Phase 3 i18n rides this), hosted desktop panes, `ixian:sendlog` (**#153②**), Share app (**#128①**), the OS share sheet (**#137/#148⑤**), the settings preference family incl. security tiers + confirm-payments (**#147/#150⑤**), and the `addApp` publisher field (**#122**).

---

*Prepared on branch `redesign/frontend`. Corrections to any command or contract listed here should be made against the detailed audits in `docs/audit/` first, then reflected in this summary.*
