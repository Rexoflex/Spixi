# P21 · DEV · Dev mode, Send log, dev seed, perf stamps and log lines

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MED | no — the asset is `ixian.log` (peer data, addresses) leaving the device | yes | shipped (seed · `[P1]` · log tail · console mirror: dev builds only) | 6 min |

**Look here first:** `Spixi/Pages/Dev/DevPage.xaml.cs:245` — the only C# gate before the log leaves the device; it trusts the `devMode` preference that the home WebView itself sets (`ixian:enableDevMode`, `Spixi/Pages/Home/HomePage.xaml.cs:1804`), and the legacy `ixian:sendLog` at `HomePage.xaml.cs:1642` does not pass through it.

**DECISIONS:** #321 · #476 · #732 · #740 · #752 · #800 · #805 · #825 · #928 · #1127 · #1132 · #1222 · #1251 · #1262 · #1282 · #1293 · #1303 · #1311 · #1322 · #1323 · #1324

## What changed and why
- Dev mode can send the current log again: share sheet on mobile, a "Save as" dialog on Windows, refused in C# unless dev mode is on (#321, O-19 (#1303)).
- The Developer screen has probe switches (flash, overlay container). Each takes fixed words and acts only with dev mode on (#1262, #1282).
- Dev builds only (`SPIXI_DEV_COEXIST`): a seed harness writes 50 fake contacts with up to 11 600 messages into the real store, and `[P1]` stamps + a log-to-logcat tail exist (#740, #752, #1127, #1222).
- A store build refuses the dev symbol (O-35 (#1303)). Every new log line carries fixed words, integers or a type name (#805).
- Session 16, every build: `[THEME]` lines (event / push / resume / gen-stale: enum and theme words, ints; #1324), `[FLAGS]` and `[L8]` start lines (P24), and two dev switches for the S16 flags (P24, P25).

## Files (verified at the S16 tree)
- `Spixi/Pages/Dev/DevPage.xaml.cs:58` — `ixian:sendlog`; `:245` dev-mode gate; `:259` Windows `saveAs`; `:261` share sheet; C#-named `spixi-log.txt` (#321, #1303).
- `Spixi/Pages/Home/HomePage.xaml.cs:1642` — LEGACY `ixian:sendLog`: zips `ixian.log` + `ixian.0.log`, share sheet, no dev-mode test (#1303 residual).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:112` — seed verbs (inside `#if SPIXI_DEV_COEXIST`, dispatched `:334`); `:349` `ixian:dev` needs dev mode (#740, #928).
- `Spixi/Utils/SDevSeed.cs:134` — `FriendList.addFriend(... Approved ...)` into the real account; `:210` unseed removes exactly the 50 hashed addresses (#740, #752).
- `Spixi/Spixi.csproj:40` / `:43` — dev symbol defaults ON in Debug; `:428` store gate (#732, #1303).
- `Spixi/Utils/P1Perf.cs:171` — `[P1]` grammar `[a-z0-9_.=-]`, ≤ 16 tokens, else dropped; `Spixi/Platforms/Android/WebViewRenderer.cs:120` mirrors OUR WebViews' console (chat included, mini-app excluded) to `ixian.log` in dev builds (#1127, #805 O-22).
- `Spixi/Meta/SpixiLocalStorageCallbacks.cs:54` / `:77` — the G/I-1 transfer log line (once carried message text + address + path), now fixed words + type (#1251); since S16 written once per transfer id (`:69`, #1311 (c), #1324).
- `Spixi/Meta/SLockDiag.cs:91` — `[LOCKDIAG]` lines, compiled into EVERY build: phase words, booleans, page class names (#469 → #825).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:sendlog` | none | `dev.html` → DevPage (log shown as textContent) | `DevPage.xaml.cs:58` | ours |
| `ixian:devflash:<candidate\|grounds\|input>:<0\|1>` | fixed words | `dev.html` → DevPage | `DevPage.xaml.cs:116` | ours |
| `ixian:devflash:container:<clip\|shadow\|none>` | fixed word | `dev.html` → DevPage | `DevPage.xaml.cs:93` | ours |
| `ixian:devflash:<securepass\|mediagate>:<0\|1>` | fixed words; stored only with dev mode on; acts at the next start | `dev.html` → DevPage | `DevPage.xaml.cs:71` | ours (S16 flags, P24 / P25) |
| `ixian:devseed` · `ixian:devseed:heavy` · `ixian:devunseed` | none | `settings.html` → SettingsPage; dev builds only; NO dev-mode test | `SettingsPage.xaml.cs:112` | ours |
| `ixian:enableDevMode` / `disableDevMode` | none | `home.html` → HomePage (renders peer names + previews = untrusted) | `HomePage.xaml.cs:1804` / `:1811` | reshaped (+ drops the chat spare, #800) |
| `ixian:dev` (new site) | none | `settings.html` → SettingsPage | `SettingsPage.xaml.cs:347` | ours (HomePage `:1825` = legacy, no gate) |
| push `setDevSeed` | `<fixed English sentence>` | C# → `settings.html` | `SettingsPage.xaml.cs:127`, `:286` | ours |
| push `setCapDev` | `<"1"\|"0">` | C# → `settings.html` | `SettingsPage.xaml.cs:1352` | ours |
| push `window.setFlashDev` | `<"b,b,b">` | C# → `dev.html` | `DevPage.xaml.cs:199` | ours |
| push `window.setContainerDev` | `<clip\|shadow\|none>`, Android only | C# → `dev.html` | `DevPage.xaml.cs:215` | ours |
| push `window.setFlagsDev` | `<0\|1>,<0\|1>` | C# → `dev.html` | `DevPage.xaml.cs:232` | ours (S16) |
| push `setCaps("sendlog")` | fixed word | C# → `dev.html` | `DevPage.xaml.cs:155` | ours (`setLog` = legacy) |
Mini-app WebView: `MiniAppPage` handles none of these.

## Threat → rule → proof
| A hostile … could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| compromised home WebView: `enableDevMode` then `ixian:dev`, then export the log | `sendlog` only from DevPage's own WebView + gate `DevPage.xaml.cs:245`; the OS sheet / dialog needs a user pick | `pins-s15/b-native.mjs` O-19 · csh `S15SecTests.log_export_needs_dev_mode` |
| same WebView: legacy `ixian:sendLog` | nothing in C# — only the OS share sheet (`HomePage.xaml.cs:1642`) | no proof (legacy) |
| peer: message text / address / path into the shareable log (G/I-1) | fixed words + type, `SpixiLocalStorageCallbacks.cs:54`, `:69`, `:77` | `pins-s9/a1-wiring.mjs` "S9 A1 M24 transfer direction" · smoke gate 18 |
| peer-chosen token forges a log line through `mutechat` | F8 fixed: `HomePage.xaml.cs:1351` logs the token LENGTH only | pin `scripts/pins-s16/a-sec.mjs` F8 (operand allow-list) |
| a store build with the seed, its verbs or the console mirror | `Spixi.csproj:428` (only with `-p:SpixiStoreRelease=true`); `#if` on `SDevSeed.cs` | `pins-s15/d-build.mjs` O-35 · smoke "★ Seed harness: SDevSeed.cs is wrapped whole…" |
| dev shell stores junk flags | fixed grammar + dev mode, `DevPage.xaml.cs:81`, `:104`, `:124` | csh `S11ChatTests` · `S16PassTests.flag_verb_tail_is_exactly_0_or_1` · `pins-s11/c-settings.mjs` · `pins-s16/b-l8.mjs` FLAGS-j |

## Given up / left open
- `Config.maxLogCount = 5` (`Spixi/Meta/Config.cs:105`) is a release blocker (more history in the log). Flip to 1 at the tag (#825).
- Core `Streaming/Friends/FriendList.cs:433` logs the full address when a removal is refused (Core, frozen). #1311 (c) fixed (#1324): the 1 436 lines in 3.5 h came from a re-arm on every message load; now once per transfer id per session.
- A dev-coexist build moves the app id on Android only (`.dev`). On iOS and Windows the seed writes into the real account (#732, #740).

## Question for BE
May we delete the legacy `ixian:sendLog` branch (`HomePage.xaml.cs:1642`, no shell sends it now), so the log leaves only through the dev-mode-gated DevPage path?
