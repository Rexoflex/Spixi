# P33 · MINI-APP PATHS · The app id, the storage table and the picked file name build no path outside the app's own folders (Session Safety S-1 · S-2 · S-3)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH (publisher / mini-app / document-provider strings reached `Path.Combine` → a write, a read and a recursive DELETE; one Install tap with id `../..` deleted the whole Spixi folder) | yes — `wallet.ixi` was reachable (truncated by S-1, deleted by S-2, overwritten as `wallet.ixi.tmp` by S-3); after the fix no such string leaves `html/Apps/<id>`, `AppsStorage/<id>` or `html/Apps/Tmp` | no new verb, push word, `spixi.*` key or WebView setting; 3 int prefs (the flags); dev: 3 of the 6 safety switch names on the existing `ixian:devflash:` verb + the dev push `setFlagsDevSafety` | built behind flags `SpixiFlags.SafeAppId` (S-2), `SafeStorage` (S-1), `SafePick` (S-3), default ON · ⚠ UNCOMPILED for MAUI until the Safety build | 6 min |

**Look here first:** `Spixi/Utils/SafetyRules.cs:31` `isSafeAppId` · `:53` `isSafeTableName` · `:68` `isInside` · `:86` `childPath` · `:103` `safeBaseName` (pure; csh `SafetyRulesTests`) and `Spixi/MiniApps/MiniAppManager.cs:424` `installFromPathCore` (the catch that deletes only what this call created, `:577-584`).

**DECISIONS:** #1312 · #1313 (MAJOR #8 / #9 and the mini-app rows become ours to fix) · #1465 (the dials) · **#1466 (this change)** · #1470 (#46, S-7) (Session Safety; Safety Dials, Damir 2026-10-16: S-1, S-2, S-3 = build). Mechanisms + proofs at `562366e4`: `docs/safety-mechanisms.md` rows S-1 … S-3.

## ⚠ The worst finding (MAJOR #10 / H-9, worse than filed)
At the fork point `0e85a4b8` (and in the store app) `installFromPath` built the target as `Path.Combine(appsPath, app.id)`. A `Directory.Move` onto an EXISTING folder throws, and the catch deleted the target recursively. `id = ../..` resolves to `<spixiUserFolder>` → **one Install tap on a crafted app deleted the whole Spixi folder, `wallet.ixi` and `Acc/` included** (proof S-2f). A rooted id deleted any folder the process could write (S-2c). Reach: a chat app invite (`ixian:installApp:<url>` → fetch → Install → `installFromUrlAsync` → `installFromPath`; the publisher sets `id` and `checksum`), or Add app → pick a file. The filed MAJOR #10 named only `remove()`; this path needs no earlier install. S-2 closes both.

## What changed and why
- **S-2 the app id (flag `SafeAppId`).** `MiniApp.cs:75` — an id outside `SafetyRules.isSafeAppId` stays `""` (1–128 ASCII letters / digits / `.` `_` `-`, letter or digit at both ends, no `..`, not `Tmp` in any case, no Windows device name incl. COM0 / LPT0). All four `new MiniApp(` sites already treat `""` as "not an app": `start()` skips it (`MiniAppManager.cs:97-108`), `fetchWithReason` → `Invalid` (`:215`), `extractAppInfo` → null (`:372`), `installFromPathCore` → null and the extract is cleaned (`:453-460`). Belt: the target, `remove()`, the entry point and the icon go through `SafetyRules.childPath(appsPath, id, false)` (`:466`, `:609`, `:693`, `:709`) — one segment that stays inside `html/Apps`, else refused / null.
- **S-2 the catch.** It deletes the target ONLY when this call created it (`created_target`, set right after the Move, `:556`) and it lies inside `html/Apps` (`:580`). A folder that existed before is never deleted.
- **S-2 the install, #46 additions (flag ON).** ① The expected id: `installFromUrlAsync` passes the id the user saw (`:307`); a package whose own `appinfo.spixi` names another id is refused before any `remove()` / Move (`:474`). ② The case twin (r2 M-A): `COM.FOO.APP` next to an installed `com.foo.app` is refused (`:483-500`) — NTFS / APFS are case-insensitive, `appList` is not, so the twin skipped the version check and landed in the other app's folder and storage. ③ The orphan: a folder at the target that no listed app owns (ignoring case) is removed before the Move, only when the list is LOADED (`loaded`, set at the end of `start()`'s fill `:113`, cleared in `stop()` `:169`), only inside `html/Apps`, never `Tmp` (`:538-552`). ④ One install at a time: `installFromPath` takes `installSync` (`:410-422`), so the twin check, the orphan test, the Move and the `appList.Add` are one critical section. ⑤ The two error lines log the exception TYPE only (`:397`, `:570`).
- **S-1 the storage table (flag `SafeStorage`).** `MiniAppActionHandler.processStorageGet` / `processStorageSet` (`:167`, `:197`): a table outside `isSafeTableName` (1–64 ASCII letters / digits / `_` / `-`, no dot, no device name) is not read / not written. The answer keeps its shape (get: `r = "null"` + the request id, the missing-key answer; set: the normal ack), so the SDK's pending request resolves and the app does not hang. Belt in `MiniAppStorage`: `safeTablePath` (`:83`) = `AppsStorage/<safe id>/<safe table>` and inside `AppsStorage`, checked in `getStorageCache` (`:92`) BEFORE a cache entry exists and again in `writeStorageData` (`:160`) — a refused name never reaches the write loop. The legacy `ixian:getStorageData` / `setStorageData` verbs use the fixed table `main` (`MiniAppPage.xaml.cs:194`, `:220`) — unchanged, it passes.
- **S-3 the picked file (flag `SafePick`).** `AppNewPage.pickAppFileCore` names its own temp file: `Path.Combine(tmpPath, AuditRules.packageTempName())` (`AppNewPage.xaml.cs:262-264`; a GUID + `.zip`, the `installFromUrlAsync` shape, H-7). The Android picker keeps the base name only (`SFilePicker.cs:73`, `SafetyRules.safeBaseName`: both separators, control + bidi characters dropped, 128 cap keeping the extension, a null name stays null) — for display / send only; the other three platforms already took `Path.GetFileName`. #46 r1: `start()` sweeps the FILES directly in `Tmp` (`MiniAppManager.cs:82-85`, `:122-153`; folders are left alone) — every pick is a fresh name now, so an abandoned pick would pile up.
- **Flags.** Int prefs `flagSafeAppId`, `flagSafeStorage`, `flagSafePick` (`SpixiFlags.cs:23-25`), read once at start, absent = ON, a stored 0 acts only in dev mode (`S16PassRules.effectiveFlag`, `:135-137`); one line `[FLAGS] safeappid=… safestorage=… safepick=… nativeconfirm=… historylock=… winappmarker=…` (`:141`). Developer › Release flags: `ixian:devflash:safeappid|safestorage|safepick:<0|1>` (`DevPage.xaml.cs:141`, routed before the generic devflash branch; dev mode on, exact tail) + push `setFlagsDevSafety("a,b,c,d,e,f")` (`:410`). OFF = the old path (each csh test runs its OFF leg).

## Files
- `Spixi/Utils/SafetyRules.cs:31` `isSafeAppId` · `:53` `isSafeTableName` · `:68` `isInside` (canonical, strict, ignore-case only where the separator is `\`) · `:86` `childPath` · `:103` `safeBaseName` · `:272` `flagsLine` · `:277` `devFlagsArg` · `:281` `DevSwitchNames`.
- `Spixi/MiniApps/MiniApp.cs:68-82` the id.
- `Spixi/MiniApps/MiniAppManager.cs:56` `loaded` · `:82` the Tmp sweep call · `:97-108` start skip · `:122` `sweepTmpFiles` · `:307` expected id · `:329` `deleteDirQuietly` · `:397` type-only · `:410` `installSync` · `:424` `installFromPathCore` · `:466` belt · `:474` expected id · `:483` case twin · `:538` orphan · `:556` `created_target` · `:577` the catch · `:596` `remove` (`:605` the flag) · `:686` entry point · `:701` icon.
- `Spixi/MiniApps/MiniAppStorage.cs:83` `safeTablePath` · `:92` `getStorageCache` · `:160` `writeStorageData` · `:201` / `:218` refused = null / no-op.
- `Spixi/MiniApps/MiniAppActionHandler.cs:167` get · `:197` set.
- `Spixi/Pages/MiniApps/AppNewPage.xaml.cs:262` the temp name · `Spixi/Platforms/Android/SFilePicker.cs:73` the base name.
- `Spixi/Utils/SpixiFlags.cs:23-25` keys · `:72-76` flags · `:105-107` reads · `:135-137` effective · `:141` the line. `Spixi/Pages/Dev/DevPage.xaml.cs:141` the switch · `:397-410` the push · `:415` `safetySwitchKey`; `src/shells/dev.html:266`, `:294-296`, `:426`.
- Tests: `scripts/csh/SafetyRulesTests.cs` (8) · `scripts/csh/SafetyAppTests.cs` (17; runs the REAL `MiniApp.cs`, `MiniAppStorage.cs`, `MiniAppManager.cs` in temp folders, flag ON and OFF) · pin `scripts/pins-safety/a-miniapp.mjs` (12 checks).

## Bridge surface
| Verb / push / sink | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| SDK `STORAGE_GET` / `STORAGE_SET` action | JSON `t` (table), `k`, `v`, `id` | any installed mini app (UNTRUSTED, publisher code) | `MiniAppActionHandler.processStorageGet` `:157` / `processStorageSet` `:188` | reshaped: an unsafe `t` is not read / written; the answer keeps its shape |
| `ixian:getStorageData` / `ixian:setStorageData` | key (+ value); table fixed `main` | the mini-app WebView | `MiniAppPage.xaml.cs:191` / `:202` | unchanged |
| install: `ixian:installApp:<url>` → Install; Add app → pick a file | the publisher's `appinfo.spixi` (`id`, `checksum`, …) inside a package | a chat invite (peer) · a file the user picks | `installFromUrlAsync` `:250` / `AppNewPage.pickAppFileCore` → `extractAppInfo` `:344` → `installFromPath` `:412` | reshaped: id checked + expected id + case twin + one at a time + created-only delete |
| folders `html/Apps/<id>` · `AppsStorage/<id>/<t>` · `html/Apps/Tmp/<guid>.zip` | C#-checked segments; the temp name is C#'s | C# only | `childPath` / `safeTablePath` / `packageTempName` | reshaped |
| `ixian:devflash:safeappid\|safestorage\|safepick:<0\|1>` · push `setFlagsDevSafety("a,b,c,d,e,f")` | one digit · six digits | dev.html → DevPage (dev mode only) | `DevPage.xaml.cs:141` · `:410` | ours (dev surface) |
| log `MiniApp: refused an unsafe app id` · `App id is empty or unsafe, the app folder was skipped` · `MiniApp: refused to install an app outside the apps folder` · `MiniApp: refused a package whose id differs from the app info` · `MiniApp: refused a package whose id differs from an installed app only by case` · `MiniApp: removed an orphan app folder before the install` · `MiniApp: refused to remove an app outside the apps folder` · `installFromPath: a folder was not deleted (<Type>)` · `Error extracting app info: <Type>` · `Error installing app: <Type>` · `MiniAppStorage: refused an unsafe storage name` · `MiniAppActionHandler: refused an unsafe storage table` · `MiniApp: the temp folder sweep failed (<Type>)` · `MiniApp: temp folder swept, removed=<n> kept=<n>` · `[FLAGS] safeappid=… …` | fixed words + a type name / counts (never an id, a table, a path) | C# | the files above | ours |

## Threat → rule → proof
| A hostile publisher / mini app / document provider could try… | What stops it | Proof |
|---|---|---|
| id `../..` → the install catch deletes the Spixi folder (wallet.ixi, Acc/) | the ctor refuses it (`""` = not an app); belt `childPath`; the catch deletes only a folder this call created, inside `html/Apps` | csh `s2f_install_dotdot_cannot_delete_the_spixi_folder` |
| a relative or rooted id (`../victim`, `/abs/victim`) | the same | csh `s2bc_install_relative_and_rooted_ids_delete_nothing` · `s2a_parse_refuses_an_unsafe_id_on_and_keeps_it_off` |
| a bad id already on disk → `remove()` deletes outside `Apps`; the entry point carries `..` | `start()` skips it; `remove` / entry / icon use `childPath` | csh `s2de_an_unsafe_id_on_disk_is_skipped_and_never_removed` · `s2_belt_refuses_an_injected_unsafe_id` |
| show app A on the details screen, install package B (replace another app) | the expected id | csh `s2_package_with_another_id_is_refused` |
| `COM.FOO.APP` takes over `com.foo.app`'s folder and storage (NTFS / APFS) | the case twin is refused; one install at a time | csh `s2_case_variant_of_an_installed_id_is_refused` · pin `a-miniapp` (inst) |
| an orphan folder blocks the reinstall forever, or the pre-delete eats a LISTED app | orphan = loaded list, no entry ignoring case, inside `Apps`, not `Tmp`; a stopped manager deletes nothing | csh `s2_orphan_folder_is_replaced_on_install` · `s2_installed_apps_folder_is_never_deleted` · pin `a-miniapp` (`loadedPlace`) |
| a failed Move deletes a folder that was there before | `created_target` | csh `s2_catch_deletes_a_target_this_call_created` |
| `t = "../../wallet.ixi"` truncates the wallet | `isSafeTableName` in the handler + the belt before any cache entry | csh `s1a_storage_table_cannot_rewrite_the_wallet` |
| a rooted `t` reads a file outside `AppsStorage` | the same | csh `s1b_storage_cannot_read_outside_and_refuses_an_unsafe_app_id` |
| a provider display name `../../../wallet.ixi` → a write outside `Tmp` | C# names the temp file; Android keeps the base name | csh `s3_picked_name_builds_no_path` · `SafetyRulesTests.picked_name_keeps_the_base_only` |
| fill `Tmp` with abandoned picks | `start()` sweeps the files in `Tmp` | csh `s3_start_sweeps_tmp_files` |
| an id / table / path in ixian.log | fixed words + type names | SafetyAppTests (`assertNoLeak`) · pin `a-miniapp` (logs) |
| the real apps break | every public id (`com.ixilabs.spixi.*`, `com.mostnonameuser.spixi.aiassistant`) and table (`main`, `settings`, `game`, `table`, `test`) passes | csh `app_id_allow_list` · `table_allow_list` · `s2_on_normal_install_update_open_remove_still_work` |
| (flag OFF) | the old path | the OFF leg of each SafetyAppTests case |
| (worst case) | a mini app still READS app files on Android (MAJOR #8, below) | — |

## Recorded, not fixed (#46 rounds 1–5)
- **R1 NIT** a table name with a dot is refused (no public app uses one; such an app loses its storage writes).
- **R1 NIT** a mini app can flood ixian.log with refused-table warns (one line per refused call; no cap).
- **R1 NIT** an app installed earlier under an id the new rule refuses disappears from the list at start (its folder stays on disk; flag OFF brings it back).
- **R4 n-3** the `Tmp` file sweep also runs on a Node restart (`stop()` → `start()`); a package picked and not yet installed at that moment is removed (the Install then fails; pick again).
- **R4 n-4** an install between `stop()` and `start()` sees an empty list: no orphan pre-delete (`loaded` is false); a Move onto an existing folder fails and nothing is deleted (`created_target` false).
- **R5 N-5** on Windows / Mac two table names that differ only by case are one file — inside the app's OWN storage folder only.
- **R7 (inherited, baseline code)** the update branch reads `appList` outside its lock (`MiniAppManager.cs:503-505`, also `extractAppInfo` `:377-379`); `removeAllApps` (`:633`) is not serialised with `installSync`; the update-branch log lines carry `app.id` (`:507`, `:517`, `:381`). Also in `legacy-not-ours.md`.
- **MAJOR #8 (Android file access for the mini app) is NOT closed by S-1.** S-1 closes the SDK storage path only. The mini-app WebView still has `AllowFileAccessFromFileURLs`, so publisher JS can still XHR-read app files on Android (rides the https-origin lever, P17 #6).

## Cost
One allow-list check per storage call and per id parse; one lock per install; one directory listing at start (the Tmp sweep). Nothing else at runtime.

## Given up / left open
- **Signatures → v1.1 (proposed).** `MiniApp.cs:126-131` parses `publicKey` / `signature`; nothing verifies them; `installFromPath` still has `// TODO sig check` (`MiniAppManager.cs:530`). A real check is a feature (key distribution, a trust list, UI for unsigned apps), gated before user-made apps are promoted (strategy §6.3).
- MAJOR #8 stays open (above).

## How to switch it off
Developer mode on → Developer › Release flags → "Mini app id check (Safety S-2)" / "Mini app storage stays in its folder (Safety S-1)" / "Picked file name is a base name (Safety S-3)" off → restart.

## Question for BE
Is the id allow-list (ASCII, 128, no `..`, not `Tmp`, no device names) acceptable as the long-term rule for publisher ids, or do you want it in the SDK spec (yes / no)?
