# P06 · MINIAPPS · Mini-apps: install, uninstall, invites, the camera refusal

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no — the mini-app SEND_PAYMENT confirm is legacy and unchanged | yes | shipped | 8 min |

**Look here first:** `Spixi/Network/StreamProcessor.cs:1433` — the zero-click trust boundary: a hostile peer composes the invite string, and this line stores it after `sanitizeAppInvite` (`MiniAppManager.cs:583`) reduces only the icon field to canonical https or empty; id, install URL and name are stored as sent and later pushed to the chat WebView (#214, #805). (The iOS camera gate, `iOSWebViewHandler.cs:393`, is P07's.)

**DECISIONS:** #214 · #216 · #265 · #293 · #334 · #340 · #544 · #585 · #789 · #805 · #806 · #827 · #928 · #1128 · #1233 · #1245 · #1247 · #1262 · #1263

## What changed and why
- The apps tab now lives in the home shell. AppsPage is deleted. Fetch, file pick and uninstall now also answer on HomePage, through the same MiniAppManager code (#216, #789, #827).
- An invite carries an install URL and an icon URL. The icon field a peer sends is reduced to a canonical https URL, or to empty, at the point where it is stored (#214, #805).
- Join sends Core's appRequestAccept once per peer and session. Decline sends a silent appRequestReject in a 1:1 chat. Both are kept in C# preferences, not in localStorage (#1233, #1247).
- Package download: async, https only, 15 s fetch and 120 s download limits, a 100 MB cap counted on the bytes read, and a GUID temp name. The mini-app bridge verbs are fenced: a malformed verb is dropped, not thrown (#1245, #928).
- The mini-app WebView is marked `ClassId="miniapp"`. Android turns DOM storage off for it. iOS gives it its own non-persistent data store, no external-link handoff, no camera and no call pushes (#334, #265, #805, #806).

## Files (verified at 387ca78b)
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:389` — `captureRefusal` (OURS; the baseline had no UI delegate, so WebKit refused every request) admits only: a trusted host (`:393`, refuses the mini-app), camera only, main frame, scan document (`:416`). The microphone is never granted.
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:723` — the mini-app WebView gets `NonPersistentDataStore` (iOS half of the legacy shared-`localStorage` finding).
- `Spixi/Platforms/Android/WebViewRenderer.cs:482` — `DomStorageEnabled` is off when ClassId is "miniapp".
- `Spixi/MiniApps/MiniAppManager.cs:197` — install temp file has a GUID name, not one taken from the URL (closes legacy H-7).
- `Spixi/Pages/Home/HomePage.xaml.cs:6251` — `onStartAppWith`: non-friend addresses are skipped and only the FIRST friend is invited; the app id must be installed (`:6292`); then the network invite goes out (`:6313`) with no native confirm.
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:4217` — `onAppDecline`: hex id; must be an incoming invite row (`:4228`); app and session ids are read from the stored row.
- `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs:125` — every mini-app navigation is handled inside a try; a bad verb is dropped and the navigation stays cancelled.

## Bridge surface
| Verb / push | Args (shape) | Who can send it (which WebView / shell) | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:startappwith:` | `<appId>:\|<addr b58>[\|…]` | home (`src/shells/home.html`, HomePage); renders untrusted names/previews | `HomePage.xaml.cs:1674` | ours |
| `ixian:appscan` | none | home | `HomePage.xaml.cs:1200` (same ScanPage as P08 `qr`) | ours |
| `ixian:fetch:` · `ixian:selectAppFile` | `<https url>` · none | home (before: only `app_new.html`) | `HomePage.xaml.cs:1192` · `:1196` | relocated |
| `ixian:uninstall:` | `<appId>` | home (before: only `app_details.html`) | `HomePage.xaml.cs:1696` | relocated |
| `ixian:appDecline:` | `<msgId hex>` | chat (`src/shells/chat.html`, SingleChatPage); untrusted | `SingleChatPage.xaml.cs:726` | ours |
| `ixian:joinApp:` | `<appId>` | chat; untrusted | `SingleChatPage.xaml.cs:721` → accept on the wire `:4200` | reshaped |
| `ixian:contextAction:cancelInvite:` → push `cancelInviteResult` | `<msgId hex>` → `<msgId>, ok\|fail` | chat; untrusted | `SingleChatPage.xaml.cs:4747` (own `appSession` message, not a bot, else `fail`; sends a silent delete to the peer) | ours (#544, #1128) |
| `ixian:appdetailsoverlay:` | `<0\|1>` | `app_details.html` (AppDetailsPage); renders publisher metadata | `AppDetailsPage.xaml.cs:117` | ours (display state only) |
| `ixian:protocolData` · `setStorageData` · `xa:` | as at the fork | mini-app WebView (third-party code) | `MiniAppPage.xaml.cs:125` | reshaped (fenced parsing) |
| push `pickAppTargets` · `selectApp` | `<appId>` · `<appId \| "">` | → home | `HomePage.xaml.cs:6331` · `:5542`, `:5610` | ours |
| push `clearAppsDone` · `closeAddApp` · `appDetailsBack` | none | → home · home · app_details | `HomePage.xaml.cs:6204` · `:6444` · `AppDetailsPage.xaml.cs:330` | ours |
| push `addApp` · `showUrlError` | `<id,name,icon data-URI,publisher,single,multi>` · `<reason word>` | → home (before: AppsPage, 3 args) | `HomePage.xaml.cs:6188` · `:6441` | reshaped |

## Threat → rule → proof
| An attacker could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| A mini-app calls `getUserMedia` on iOS | `iOSWebViewHandler.cs:393` (refuses first; the catch also refuses) | smoke "gate 9" (refusal first; fail-closed walk); no on-device run yet |
| A hostile peer sends an invite icon `http:/host/x.gif` or a local path | `StreamProcessor.cs:1433` → `MiniAppManager.cs:583` | smoke "gate 20 THE WALK" + "gate 20 FAIL CLOSED" |
| Untrusted chat content declines or joins a forged id | `SingleChatPage.xaml.cs:4228`; `AppInviteRules.cs:30` | csh `S8RulesTests.invite_rules`, `my_invite_for_session_and_accept_cap`; pin `pins-s8/cs-wiring.mjs` "S8 A2 decline" |
| A hostile publisher sends a huge or slow package, or a crafted temp name | `MiniAppManager.cs:191`, `:197` | csh `S9AuditTests.package_url_must_be_https`, `package_temp_name_is_ours_not_the_urls`, `copy_capped_counts_the_bytes_actually_read` |
| A mini-app sends a malformed verb to crash Spixi | `MiniAppPage.xaml.cs:125` | csh `S9AuditTests.bridge_key_value_is_validated_before_slicing`, `bridge_base64_never_throws` |
| A compromised home WebView invites a peer to an app id that is not installed | `HomePage.xaml.cs:6292` | smoke "★ #340 (C-MINOR-3): startappwith rejects an id that names no installed app BEFORE it invites anyone" |

## Given up / left open
- LEGACY, left to BE (`legacy-not-ours.md`): H-6 storage key → wallet path · H-8 picker name → path · H-9 / MAJOR #10 unvalidated app id → install + delete · H-10 FileProvider whole tree · MAJOR #8 Android file access · MAJOR #9 Android grants mic + camera · D24 arbitrary loads. H-7 and D25 are already fixed (#1245).
- ⚠ The legacy `MiniAppManager.cs:421` delete (MAJOR #10) and the H-8 picker write (`AppNewPage.xaml.cs:258`) can now also be triggered from the home WebView (`:1696`, `:1196`). Same code; one more page can send the verb.
- Android: no `getUserMedia` refusal. `WebViewRenderer.cs:55` still grants every request (MAJOR #9 — legacy, ours to fix in Session 16 since #1313). Windows does not read the marker and has no storage partition (O-02, O-03 #805); MacCatalyst runs the iOS handler (#1245, P07), not walked.
- `startappwith:` and `uninstall:` have only a confirm inside the shell, no native confirm. Neither moves money or takes a path from the WebView (#805).

## Question for BE
Is it the right layer to rewrite a peer's invite icon in Spixi at receive time (`StreamProcessor.cs:1433`), rather than in Core's `AppDataMessage` parse? (The `ClassId="miniapp"` contract question is P07's.)
