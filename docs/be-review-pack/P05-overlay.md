# P05 · OVERLAY · Overlay navigation, present-on-paint and pane hand-offs

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no — but the app lock: an overlay must never cover or replace it | yes | shipped · F2 fixed (#1322) | 8 min |

**Look here first:** `Spixi/Utils/SpixiContentPage.cs:3584` and `:3594` — the two guards that drop a new overlay while a lock is up: `:3584` a lock SHOWN in place, `:3594` a lock still STAGING (< 5 s, `S16SecRules.overlayRefused`). Both sit before the supersede branch (`:3627`).

**DECISIONS:** #220 · #222 · #225 · #229 · #230 · #240 · #245 · #248 · #270 · #315 · #336 · #370 · #375 · #404 · #614 · #629 · #669 · #670 · #715 · #739 · #760 · #766 · #791 · #798 · #827 · #852 · #883 · #922 · #1086 · #1093 · #1118 · #1133 · #1205 · #1249 · #1250 · #1262 · #1264 · #1284 · #1322 · #1325

## What changed and why
Redesigned screens are not pushed any more: each loads hidden in HomePage's grid in its own WebView and is shown in place; close = remove + Dispose (#222, #225). The lock stages the same way and is shown in place only over the overlay host, on ZIndex 200 (#229, #230, #270).
Every shell mirrors "a sheet is open" with a 0/1 verb so hardware back closes the sheet first (#336, #370, #375, #614, #715); `homeoverlay` carries a level 0/1/2 since #670.
A staged page presents on its shell's `ixian:painted` (timer kept as backstop), chat first, then every shell (#760, #766), gated on generated content (#798); Android holds the list until the chat WebView drew (#1118, #1262, #1264).
Account → Home is one verb `ixian:landtab:<id>[:<nick>]`; home switches tab under the cover and answers `ixian:coverpainted` (#739, #1133, #1284). A user navigation supersedes whatever is staging (#629) — except a staging lock: it is dropped with a warn while the lock stages, and `cancelPreload` never cancels a lock (F2, #1322). Add contact / Add app now run inside home.html, so four legacy verbs answer on HomePage (#827).

## Files (verified at the S16 tree)
- `Spixi/Utils/SpixiContentPage.cs:3584` — no stage/present while `modalOverlayOp` (lock in place) is set; target disposed (#230).
- `Spixi/Utils/SpixiContentPage.cs:3594` — F2: drop + type-name warn while `isLockStaging()` (`:2326`) and the age < 5 s; the age is monotonic (`Environment.TickCount64`, stamped at `:3905`). `:5928` — `cancelPreload` returns early for a modal LockPage op (backstop).
- `Spixi/Utils/SpixiContentPage.cs:3627` — a different navigation cancels the staging op (#629); a lock no longer reaches it.
- `Spixi/Utils/SpixiContentPage.cs:3974` — host grid input-frozen while a lock stages (taps only, not script) (#229).
- `Spixi/Utils/SpixiContentPage.cs:6455` / `:6477` — `painted` and `cdping` answered only for generated shells; cdping digits ≤16 (#798, #791).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:377` — landtab split + exit latch (`claimExit` `:1233`); `HomePage.xaml.cs:5449` fixed tab set (#1284).
- `Spixi/Pages/Home/HomePage.xaml.cs:1443` — `chatinfo:` anchored, known friend only (`:1459`) (#248).
- `Spixi/Platforms/Android/PresentHold.cs:20` — timing only, 250 ms cap (`SpixiContentPage.cs:4709`) (#1118).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `chatoverlay` · `cdoverlay` · `downloadsoverlay` · `appdetailsoverlay` · `launchoverlay` | `<0\|1>` | chat.html (untrusted) · contact_details.html (untrusted) · downloads.html (peer file names) · app_details.html (remote app text) · launch.html | `SingleChatPage.xaml.cs:446` · `ContactDetails.xaml.cs:529` · `DownloadsPage.xaml.cs:149` · `AppDetailsPage.xaml.cs:117` · `LaunchPage.xaml.cs:210` | ours (#375 #370 #715 #614) |
| `homeoverlay` | `<0\|1\|2>` level | home.html (untrusted names/previews) | `HomePage.xaml.cs:1736` | ours #336, reshaped #670 |
| `painted` | none | any generated shell | `SpixiContentPage.cs:6445` | ours #760, widened #766 |
| `cdping` → push `cdpong` | `<digits ≤16>` echoed | chat.html (TEMPORARY) | `SpixiContentPage.cs:6460` | ours #791 |
| `coverpainted` · `bootDropped` | none | home.html | `HomePage.xaml.cs:1020` · `:917` | ours #739/#1133 · #1205/#1249 |
| `landtab` · `handoff` | `<id>[:<nick>]` · none | settings.html | `SettingsPage.xaml.cs:377` · `:393` | ours #1284 · #739 (older shells only) |
| `cleardetail` · `chatinfo` | none · `<address b58>` | home.html | `HomePage.xaml.cs:1712` · `:1443` | ours #669 · #248 |
| `checkAddress:` `request:` `fetch:` `selectAppFile` | address · address · URL · none | home.html now (was contact_new / app_new) | `HomePage.xaml.cs:1177` · `:1181` · `:1201` · `:1205` | legacy, RELOCATED #827 |
| push `chatBack` `homeBack` `cdBack` `launchBack` `downloadsBack` `appDetailsBack` | none | C# → own shell | `HomePage.xaml.cs:5792` `:5847` `:5774` · `LaunchPage.xaml.cs:457` · `DownloadsPage.xaml.cs:314` · `AppDetailsPage.xaml.cs:330` | ours |
| push `onRepresented` · `window.paintAck` | none | C# → parked Account · held chat | `SpixiContentPage.cs:1581` · `:5250` | ours #315 · #1264 |
| push `onChatShown` `onSettingsShown` `onSettingsClosed` `onHandoff` `onExitRequest` | none | C# → home.html / settings.html | `HomePage.xaml.cs:5599` `:5591` `:5467` `:5427` `:5714` | ours #1093 · #1086 · #739 · #240 |
| push `landOnTab` | `<chats\|wallet\|apps\|contacts>` | C# → home.html | `HomePage.xaml.cs:5454` | ours #1284 |
| push `setPaneAvailable` `setPaneMode` `setPaneMetrics` `setPresentation` | `<0\|1>` · `<0\|1>` · `<int>` · `dialog` | C# → home / settings, chat info / settings / downloads | `HomePage.xaml.cs:542` · `SettingsPage.xaml.cs:65` `:151` · `DownloadsPage.xaml.cs:277` | ours #852 · #240 · #245 · #1250 |
| push `setInsetTop` `setInsetBottom` `setInsetSides` | number(s) | C# → every generated shell (not mini-apps) | `UIHelpers.cs:426` `:448` `:469` · `SpixiContentPage.cs:880` | ours #404 · #883 · #922 |

## Threat → rule → proof
| A hostile … could try… | What stops it | Proof |
|---|---|---|
| chat script (a peer XSS) opens chat info over a lock shown in place | `SpixiContentPage.cs:3584` drop; `:1543` parked refuse; lock ZIndex 200 `:3942` | smoke `#315 ★ #230 fail-closed`; no dedicated pin on `:3584` |
| chat script fires `ixian:details` while a lock is STAGING (≤1.2 s; desktop idle lock) | `SpixiContentPage.cs:3594` drops it; `cancelPreload` spares a lock (`:5928`); taps (`:3974`) and deep links (`HomePage.xaml.cs:5011`) blocked as before | csh `S16SecTests.overlay_refused_while_the_lock_stages`; pin `scripts/pins-s16/a-sec.mjs` F2 (order: after `:3584`, before the supersede) |
| chat script drives another pane or opens the wallet | its overlay verb sets one bool (`SingleChatPage.xaml.cs:452`); no chat verb opens the wallet; panes meet only in C# (#220) | smoke `N51: SingleChatPage mirrors…`; rest walk only |
| home script (peer name) picks a pane or a tab | `chatinfo` known friend only `HomePage.xaml.cs:1459`; `landOnTab` fixed set `:5449` | smoke `★★ gate 19 (A-6)`; `pins-s14/b-settings.mjs` `landGuard` |
| mini-app sends `ixian:painted` / `ixian:cdping:` | `hasGeneratedContent` gate `SpixiContentPage.cs:6455` / `:6477` | smoke `★★ Session O ⑤` · `★ Session N [CDPERF] rtt` |

## Given up / left open
- F2 recorded residual: past 5 s a stuck staging lock no longer blocks navigation, and a supersede then orphans the lock op (the lock still presents on its own path, `cancelPreload` never cancels it).
- `fetch:` (network, user-typed URL) is now raised from home.html, which renders peer names — inherited, relocated (#827).
- `homeoverlay` level: the gate doc's overlay-verb rows (`docs/security-handover-gate.md:138`, `:151`) still describe the class as "ONE bit"; #670 made home's a 0/1/2 level.
- `cdping` / `cdpong` are temporary and retire with the temporary `[CDPERF]` timing probes (#791).

## Question for BE
F2 is fixed as drop + warn under a 5 s bound (`SpixiContentPage.cs:3594`). Is 5 s the right bound for a stuck staging lock, or must navigation stay blocked until the lock presents (yes / no)?
