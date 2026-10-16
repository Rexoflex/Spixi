# Review brief — Session Safety (security-only #46 at HIGH effort)

Tree: `/home/claude/w/Spixi` (base `562366e4` + the uncommitted Session Safety work; `git diff` + `git status --short` show it).
Ixian-Core (read only): `/home/claude/w/Ixian-Core` @097341a. Mechanisms + proofs: `docs/safety-mechanisms.md`. Build contract:
`/home/claude/w/contract-safety.md`. Damir's picks (Safety Dials): S-1, S-2, S-3, S-6 build · q1 = A (native confirm on chat + chat
info; HOME keeps its page sheet = BE decision D5 as written) · q2 = park the nickname prompt · q3 = A (Downloads + Sent + cache/share,
KEEP the cache root) · q4 = A (O-02 Windows build; C-12 + D24 parked with a walk check). Do NOT re-open these dials.

## What landed
| Row | Flag | Files |
|---|---|---|
| S-2 mini-app id (MAJOR #10 / H-9; one Install tap with id `../..` deleted the Spixi folder) | SafeAppId | MiniApp.cs, MiniAppManager.cs |
| S-1 storage table (H-6) | SafeStorage | MiniAppActionHandler.cs, MiniAppStorage.cs |
| S-3 picked name (H-8) | SafePick | Pages/MiniApps/AppNewPage.xaml.cs, Platforms/Android/SFilePicker.cs |
| S-4 Android share folders (H-10) | none (resource) | Platforms/Android/Resources/xml/provider_paths.xml, SFileOperations.cs, MainActivity.cs |
| S-5 native confirms | NativeConfirm | Utils/SConfirm.cs (new), Utils/ConfirmGate.cs (new, #46 r2), Pages/Chat/SingleChatPage.xaml.cs, Pages/Contacts/ContactDetails.xaml.cs, Utils/SpixiContentPage.cs (displaySpixiAlert), src/shells/contact_details.html |
| S-6 deleteh / deleted behind LockPage(true) | HistoryLock | Pages/Settings/SettingsPage.xaml.cs |
| O-02 Windows mini-app marker | WinAppMarker | Platforms/Windows/WindowsWebViewHandler.cs, Utils/SpixiContentPage.cs (:523 region) |
| flags + rules + dev switches | — | Utils/SafetyRules.cs (new), Utils/SpixiFlags.cs, Pages/Dev/DevPage.xaml.cs, src/shells/dev.html, lang/*.txt (4 keys; the r0 brief said 3, #46 r3 N-4) |
| tests | — | scripts/csh/SafetyRulesTests.cs, SafetyAppTests.cs, ConfirmGateTests.cs, StubsSafety.cs, Stubs.cs, csh.csproj; scripts/pins-safety/{a-miniapp,b-share,c-confirm,d-lock-win}.mjs |

## Must-hold invariants
1. Flag OFF = the old path in behaviour (each flag; S-4 has no flag — the fallback is a revert of provider_paths.xml).
2. With the flag ON, no mini-app-supplied string (id, table, picked name) can make C# read, write, move or delete outside
   `html/Apps/<id>`, `AppsStorage/<id>` or `Apps/Tmp`; no recursive delete can start from an id.
3. A destructive chat / chat-info verb acts only after a NATIVE OK the page cannot answer; Cancel changes nothing; one dialog at a time.
4. deleteh / deleted act only after LockPage(true) raises true.
5. The Windows mini-app WebView gets no DevTools, no permission grant, no new window, no host objects (flag ON); shells unchanged.
6. The FileProvider never grants a path outside Downloads / Sent / cache (share + root); backup / log Share still work via staging.
7. Logs: fixed words + type names only (no id, table, path, name, address, ex.Message) in every NEW line.
8. No new verb (dev switches reuse `ixian:devflash:`), no new WebView setting except O-02's drops, one new push word (`cancelled`).
9. Claims rules in new strings (the four banned claim words of the house rule never appear).

## How to run (ONLY when the main session says the smoke is done — L153: nothing executes beside the full smoke)
`node scripts/run-csh.mjs` (C# harness) · `node scripts/run-pins.mjs pins-safety/<mod>` (one module) · `node scripts/cs-syntax-check.mjs <files>`.
Until told, READ ONLY (cat / grep / sed are fine; no node, no dotnet).

## 5 · Verdict — CLEAN at r6

**Verdict: CLEAN at round 6** (a fresh read-only reader found 0 MAJOR · 0 MINOR · 3 NIT).
Protocol: 3 disjoint read-only auditors (r1: R1 mini-app paths · R2 confirms / lock / Windows · R3 Android share + tests) → verify against the tree → fixes → a FRESH break-my-verdict reviewer per round (r2–r6). Findings, verdicts and claimed fixes per round: the session's `review-r1-fixes.md` (rounds 1–5).

| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | R1 (mini-app paths) · R2 (confirms / lock / Windows) · R3 (Android share + tests) — Opus, disjoint | 0 + 2 + 1 | 4 + 6 + 4 | 7 + 5 + 6 | 3 MAJOR fixed (below); MINORs fixed except R2 MINOR-4 (desktop type-ahead → walk row) and R3 m-2 (accepted) |
| r2 | R4, fresh, over the r1 fixes | 1 | 4 | 6 | M-A fixed; m-1..m-4 fixed (ConfirmGate made pure + csh); n-3..n-6 recorded; pin survivors M1–M5 turned into executed tests / stronger pins |
| r3 | R5, fresh | 1 | 3 | 5 | MAJOR-1 → DESIGN CHANGED (no clock, fail closed); MINOR-1..3 fixed; N-1, N-3, N-5 recorded |
| r4 | R6, fresh | 0 | 2 | 6 | MINOR-1 (600 ms fast-OK) + MINOR-2 (`loaded`) fixed; NIT-1..4 fixed; NIT-5, NIT-6 recorded |
| r5 | R7, fresh | 0 | 1 | 7 | MINOR (steady rhythm) recorded — not fixable with MAUI DisplayAlert; NITs fixed or recorded (3 inherited) |
| r6 | R8, fresh, read-only | 0 | 0 | 3 | **CLEAN** — NITs: pin-regex tightness of c-confirm `alertGate3` and a-miniapp `loadedPlace`; a test-header comment |

### The MAJORs
1. **r1 R3 M-1 — the FileProvider roots named folders that do not exist.** *Mechanism:* `files-path` is relative to `getFilesDir()`, and on .NET 10 Android `SpecialFolder.Personal` = `getFilesDir()/Documents` (S14 #1281), so `Config.spixiUserFolder` (`Meta/Config.cs:22`) = `files/Documents/Spixi`. The r0 roots `Spixi/Downloads/` + `Spixi/Sent/` granted nothing → no received or sent file would open. *Evidence:* `Platforms/Android/Resources/xml/backup_rules.xml:5-7` (the device log `files/Documents/Spixi/MsgQueue/`), the S14 pin. *Fix:* roots `Documents/Spixi/Downloads/` + `Documents/Spixi/Sent/` + the `Spixi/…` twins (`provider_paths.xml:25-36`); `b-share.mjs` models the runtime layout and cross-checks `backup_rules.xml`. *First answers wrong:* the mechanism pass (`docs/safety-mechanisms.md` S-4) and the build contract both said `files/Spixi` — corrected there. *Lesson:* every new Android path root is checked against the S14 runtime fact (Personal = files/Documents), never against the C# folder name alone.
2. **r1 R2 MAJOR-1 — the dialog fallback was a spoof channel.** *Mechanism:* `SafetyRules.dialogName` cleaned the name but returned the FALLBACK raw, and ContactDetails kick / ban passed the raw WebView verb tail as the fallback → a page could put its own text (newlines, RLO, "Spixi security notice …") into the native dialog. *Fix:* the fallback is cleaned the same way (`SafetyRules.cs:171-190`); `confirmMember` parses the address FIRST (a bad payload = the fixed warn, no dialog) and passes the parsed address (`ContactDetails.xaml.cs:1250-1279`); csh hostile corpus over the new pure `confirmTexts`. *Lesson:* every string that reaches a native dialog is cleaned, the fallback included; parse before you show.
3. **r1 R2 MAJOR-2 — other alerts could stack over or under the confirm (tap-jack).** *Mechanism:* OK-only alerts (e.g. `sendContactRequestGuarded`) and the peer-timed bot-not-ready alert could open around the confirm, so a repeated tap lands on the destructive button. TRUE in principle (the platform layout is unverified). *Fix:* both `displaySpixiAlert` overloads drop every other alert while a confirm is up and count each while it is up; `SConfirm` refuses while another alert is up; later made one atomic step (r4 NIT-1) and per-alert tokens (r3 MINOR-1); the bot alert routed through `displaySpixiAlert` (r2 n-1).
4. **r2 R4 M-A — the case-variant takeover (introduced by an r1 fix).** *Mechanism:* the r1 orphan pre-delete (R1 MINOR-1) + case-insensitive NTFS / APFS: `COM.FOO.APP` skipped the update branch (`appList` is case-sensitive) and deleted / took over `com.foo.app`'s folder and storage. *Fix:* a package whose id equals an installed id ignoring case (not ordinally) is refused before `remove()` / Move (`MiniAppManager.cs:483-500`, csh `s2_case_variant_of_an_installed_id_is_refused`); r3: one install at a time (`installSync`) and the orphan test needs a started manager; r4: needs a LOADED list (`loaded`). *Lesson:* a fix that deletes gets its own adversarial pass; compare ids the way the file system compares names.
5. **r3 R5 MAJOR-1 — the time-bound gate released a confirm still on screen.** *Mechanism:* r1 (R2 MINOR-3) and r2 (m-1) bounded the gate at 120 s so a never-completing dialog could not block forever; R5 showed a page can simply wait 120 s with the confirm still visible, then stack alerts or a second confirm. The same defect class twice → **design changed:** `ConfirmGate` has NO clock; it is released only by the holder's `exit(token)`; FAIL CLOSED (a never-completing dialog = confirms answer `busy`, other alerts dropped = cancel, until restart) — recorded in P35 + a walk row; csh `no_time_bound`, `foreign_exit`. *Lesson:* a safety gate held by a UI dialog is released only by that dialog's completion, never by a clock; record the stuck case instead.

### Deliberate breaks (mutations)
Every new pin and csh test had its break: the lane mutation sets **C1–C19** (c-confirm), **R2M1–R2M8** (r2), **R4a–c** (r4: `fast`, the atomic alert drop, the `, true)` caller count), **R5a–c** (r5: `loadedPlace` ×2, `alertGate3`) — all caught. Survivors: r2 R4 listed M1–M5 (shape-only pins) → the gate moved into pure `ConfirmGate` executed in csh, and c-confirm pins the lock branch return, the post-dialog lock check, the 3-arg throw path and the bot alert route. Survivors at close: **0**.

### Recorded, not fixed
- MAJOR #8 (Android file access for the mini app) — NOT closed by S-1 (P33; ours since #1313, rides P17 #6).
- C-12 (Windows mini-app storage partition, size M) — OPEN, parked (q4 = A; P37). D24 (`NSAllowsArbitraryLoads`) — parked, needs an iPhone + Mac walk.
- Mini-app signatures → proposed v1.1 (P33). The nickname native prompt → after launch (q2). Home keeps its page sheet (D5).
- P33: R1 NITs (no-dot table names, log flood, apps with an old id disappearing); R4 n-3 (Tmp sweep on a Node restart), n-4 (install between stop and start); R5 N-5 (table names differing by case = one file, own app only); R7 inherited (update branch reads `appList` outside its lock; `removeAllApps` not serialised with `installSync`; update-branch log lines carry `app.id`) → also `legacy-not-ours.md`.
- P34: R3 m-2 (Android ≤ 9 external-storage sent rows do not open); staged copies live in the cache until pruned; MAUI Essentials' second FileProvider (its own authority); a custom `spixiUserFolder` breaks the fixed roots.
- P35: R2 MINOR-4 desktop type-ahead (walk row); R7 MINOR steady-rhythm tap + R6 MINOR-1 part 2 (confirm only from the top page / no recent WebView tap) = a later option; the 600 ms timer runs from the request; a fast OK is a silent Cancel; the shared-group count is taken before the dialog; direct `DisplayAlert` / `DisplayActionSheet` / share sheet / Save-as are not counted (R5 N-3); R4 n-5 / R6 NIT-5 invisible `Lo` fillers in a nick; R4 n-6; the fail-closed stuck case (walk row).
- P36: R6 NIT-6 the 2-minute latch can expire during a slow unlock / delete.
- r6 NITs: c-confirm `alertGate3` and a-miniapp `loadedPlace` regexes could be tighter; one test-header comment.

### Final numbers
CSH (cloud twin): **506 pass, 0 fail** (475 + 31: SafetyRulesTests 8, SafetyAppTests 17, ConfirmGateTests 6). Pins: `pins-safety` **4 modules, 32 checks green** (a-miniapp 12 · b-share 6 · c-confirm 7 · d-lock-win 7). Suite: **BASELINE OK 6295 / the 2 KNOWN (#136 · B3)** — see the DECISIONS row.
⚠ C# UNCOMPILED for MAUI: `Spixi/Utils/SafetyRules.cs`, `ConfirmGate.cs`, `SConfirm.cs`, `SpixiFlags.cs`, `SpixiContentPage.cs`; `Spixi/MiniApps/MiniApp.cs`, `MiniAppManager.cs`, `MiniAppStorage.cs`, `MiniAppActionHandler.cs`; `Spixi/Pages/MiniApps/AppNewPage.xaml.cs`; `Spixi/Pages/Chat/SingleChatPage.xaml.cs`; `Spixi/Pages/Contacts/ContactDetails.xaml.cs`; `Spixi/Pages/Settings/SettingsPage.xaml.cs`; `Spixi/Pages/Dev/DevPage.xaml.cs`; `Spixi/Platforms/Android/SFilePicker.cs`, `SFileOperations.cs`, `MainActivity.cs`; `Spixi/Platforms/Windows/WindowsWebViewHandler.cs` (csh runs SafetyRules, ConfirmGate and the three MiniApp files for real). Walk: Windows F5 first, then Android Debug.
