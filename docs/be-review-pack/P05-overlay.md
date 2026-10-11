# P05 · OVERLAY · Overlay navigation, present-on-paint and pane hand-offs

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no — but the app lock: an overlay must never cover or replace it | yes | shipped | 8 min |

**Look here first:** `Spixi/Utils/SpixiContentPage.cs:3577` — the one guard that drops a new overlay while a lock is up; it tests a lock SHOWN in place only, and the supersede branch at `:3609` does not test a lock that is still STAGING (see Given up).

**DECISIONS:** #220 · #222 · #225 · #229 · #230 · #240 · #245 · #248 · #270 · #315 · #336 · #370 · #375 · #404 · #614 · #629 · #669 · #670 · #715 · #739 · #760 · #766 · #791 · #798 · #827 · #852 · #883 · #922 · #1086 · #1093 · #1118 · #1133 · #1205 · #1249 · #1250 · #1262 · #1264 · #1284

## What changed and why
Redesigned screens are not pushed any more: each loads hidden in HomePage's grid in its own WebView and is shown in place; close = remove + Dispose (#222, #225). The lock stages the same way and is shown in place only over the overlay host, on ZIndex 200 (#229, #230, #270).
Every shell mirrors "a sheet is open" with a 0/1 verb so hardware back closes the sheet first (#336, #370, #375, #614, #715); `homeoverlay` carries a level 0/1/2 since #670.
A staged page presents on its shell's `ixian:painted` (timer kept as backstop), chat first, then every shell (#760, #766), gated on generated content (#798); Android holds the list until the chat WebView drew (#1118, #1262, #1264).
Account → Home is one verb `ixian:landtab:<id>[:<nick>]`; home switches tab under the cover and answers `ixian:coverpainted` (#739, #1133, #1284). A user navigation supersedes whatever is staging (#629). Add contact / Add app now run inside home.html, so four legacy verbs answer on HomePage (#827).

## Files (verified at 387ca78b)
- `Spixi/Utils/SpixiContentPage.cs:3577` — no stage/present while `modalOverlayOp` (lock in place) is set; target disposed (#230).
- `Spixi/Utils/SpixiContentPage.cs:3609` — a different navigation cancels the staging op, whatever it is (#629).
- `Spixi/Utils/SpixiContentPage.cs:3956` — host grid input-frozen while a lock stages (taps only, not script) (#229).
- `Spixi/Utils/SpixiContentPage.cs:6302` / `:6324` — `painted` and `cdping` answered only for generated shells; cdping digits ≤16 (#798, #791).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:377` — landtab split + exit latch (`claimExit` `:1218`); `HomePage.xaml.cs:5436` fixed tab set (#1284).
- `Spixi/Pages/Home/HomePage.xaml.cs:1434` — `chatinfo:` anchored, known friend only (`:1450`) (#248).
- `Spixi/Platforms/Android/PresentHold.cs:20` — timing only, 250 ms cap (`SpixiContentPage.cs:4690`) (#1118).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `chatoverlay` · `cdoverlay` · `downloadsoverlay` · `appdetailsoverlay` · `launchoverlay` | `<0\|1>` | chat.html (untrusted) · contact_details.html (untrusted) · downloads.html (peer file names) · app_details.html (remote app text) · launch.html | `SingleChatPage.xaml.cs:446` · `ContactDetails.xaml.cs:529` · `DownloadsPage.xaml.cs:149` · `AppDetailsPage.xaml.cs:117` · `LaunchPage.xaml.cs:210` | ours (#375 #370 #715 #614) |
| `homeoverlay` | `<0\|1\|2>` level | home.html (untrusted names/previews) | `HomePage.xaml.cs:1727` | ours #336, reshaped #670 |
| `painted` | none | any generated shell | `SpixiContentPage.cs:6292` | ours #760, widened #766 |
| `cdping` → push `cdpong` | `<digits ≤16>` echoed | chat.html (TEMPORARY) | `SpixiContentPage.cs:6307` | ours #791 |
| `coverpainted` · `bootDropped` | none | home.html | `HomePage.xaml.cs:1011` · `:908` | ours #739/#1133 · #1205/#1249 |
| `landtab` · `handoff` | `<id>[:<nick>]` · none | settings.html | `SettingsPage.xaml.cs:377` · `:393` | ours #1284 · #739 (older shells only) |
| `cleardetail` · `chatinfo` | none · `<address b58>` | home.html | `HomePage.xaml.cs:1703` · `:1434` | ours #669 · #248 |
| `checkAddress:` `request:` `fetch:` `selectAppFile` | address · address · URL · none | home.html now (was contact_new / app_new) | `HomePage.xaml.cs:1168` · `:1172` · `:1192` · `:1196` | legacy, RELOCATED #827 |
| push `chatBack` `homeBack` `cdBack` `launchBack` `downloadsBack` `appDetailsBack` | none | C# → own shell | `HomePage.xaml.cs:5779` `:5834` `:5761` · `LaunchPage.xaml.cs:457` · `DownloadsPage.xaml.cs:314` · `AppDetailsPage.xaml.cs:330` | ours |
| push `onRepresented` · `window.paintAck` | none | C# → parked Account · held chat | `SpixiContentPage.cs:1575` · `:5151` | ours #315 · #1264 |
| push `onChatShown` `onSettingsShown` `onSettingsClosed` `onHandoff` `onExitRequest` | none | C# → home.html / settings.html | `HomePage.xaml.cs:5586` `:5578` `:5454` `:5414` `:5701` | ours #1093 · #1086 · #739 · #240 |
| push `landOnTab` | `<chats\|wallet\|apps\|contacts>` | C# → home.html | `HomePage.xaml.cs:5441` | ours #1284 |
| push `setPaneAvailable` `setPaneMode` `setPaneMetrics` `setPresentation` | `<0\|1>` · `<0\|1>` · `<int>` · `dialog` | C# → home / settings, chat info / settings / downloads | `HomePage.xaml.cs:542` · `SettingsPage.xaml.cs:65` `:151` · `DownloadsPage.xaml.cs:277` | ours #852 · #240 · #245 · #1250 |
| push `setInsetTop` `setInsetBottom` `setInsetSides` | number(s) | C# → every generated shell (not mini-apps) | `UIHelpers.cs:426` `:448` `:469` · `SpixiContentPage.cs:880` | ours #404 · #883 · #922 |

## Threat → rule → proof
| A hostile … could try… | What stops it | Proof |
|---|---|---|
| chat script (a peer XSS) opens chat info over a lock shown in place | `SpixiContentPage.cs:3577` drop; `:1537` parked refuse; lock ZIndex 200 `:3924` | smoke `#315 ★ #230 fail-closed`; no dedicated pin on `:3577` |
| chat script fires `ixian:details` while a lock is STAGING (≤1.2 s; desktop idle lock) | nothing: `:3609` supersedes, `cancelPreload` (`:5792`) disposes the lock; only taps (`:3956`) and deep links (`HomePage.xaml.cs:4998`) are blocked | no proof — candidate, code read only |
| chat script drives another pane or opens the wallet | its overlay verb sets one bool (`SingleChatPage.xaml.cs:452`); no chat verb opens the wallet; panes meet only in C# (#220) | smoke `N51: SingleChatPage mirrors…`; rest walk only |
| home script (peer name) picks a pane or a tab | `chatinfo` known friend only `HomePage.xaml.cs:1450`; `landOnTab` fixed set `:5436` | smoke `★★ gate 19 (A-6)`; `pins-s14/b-settings.mjs` `landGuard` |
| mini-app sends `ixian:painted` / `ixian:cdping:` | `hasGeneratedContent` gate `SpixiContentPage.cs:6302` / `:6324` | smoke `★★ Session O ⑤` · `★ Session N [CDPERF] rtt` |

## Given up / left open
- ⚠ Candidate (README flag F2), not in any earlier doc: since #629 a navigation cancels a STAGING lock (`:3609` has no `modalMode` test); script-only vector, needs a compromised shell.
- `fetch:` (network, user-typed URL) is now raised from home.html, which renders peer names — inherited, relocated (#827).
- `homeoverlay` level: the gate doc's overlay-verb rows (`docs/security-handover-gate.md:138`, `:151`) still describe the class as "ONE bit"; #670 made home's a 0/1/2 level.
- `cdping` / `cdpong` are temporary and retire with the temporary `[CDPERF]` timing probes (#791).

## Question for BE
Should `pushPageLoaded` refuse (like `HomePage.xaml.cs:4998` does for deep links) while `isLockStaging()` (`SpixiContentPage.cs:2320`) is true — yes/no?
