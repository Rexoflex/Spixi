# Review brief — Session 16: security batch (F1–F5, F8, MAJOR #9) · L8 walletpass → SecureStorage · #1311 fixes + hold shield (#1321–)

Work order for the SECURITY-ONLY #46 loop at HIGH effort (#1312 rule 2). Written before round 1; the verdict goes into §5.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS / packet |
|---|---|---|---|
| F1 | LockPage refuses `ixian:change` on an app lock (first statement of the branch); `App.onUnlock` releases only on `EventArgs<bool>(true)` | `LockPage.xaml.cs` change branch · `App.xaml.cs` onUnlock · `S16SecRules.changeLeg / unlockReleases` | #1320 F1 · P01 |
| F2 | `pushPageLoaded` drops a navigation while a lock stages (< 5 s; warn); `cancelPreload` never cancels a staging LockPage | `SpixiContentPage.cs` pushPageLoaded / cancelPreload · `S16SecRules.overlayRefused` | F2 · P05 |
| F3 / F4 | flag `MediaInputGate`: `voicerec:start` + the paste read refused unless foreground + this chat shown + no app lock (incl. staging / in-place lock); a recording stops when an app lock is presented | `SingleChatPage.xaml.cs` onVoiceRecStart / onPickPhotos(RoutePaste) · `App.xaml.cs` pause lock + presentAppLock · `S16SecRules.mediaInputRefusal` | F3 F4 · P12 P10 |
| F5 | home `declineRequest` removes only an incoming, not-approved request | `HomePage.xaml.cs` · `S16SecRules.declineAllowed` | F5 · P09 |
| F8 | DownloadsPage logs type names; mutechat logs a length | `DownloadsPage.xaml.cs` · `HomePage.xaml.cs` | F8 · P11 P21 |
| MAJOR #9 | Android `OnPermissionRequest`: VIDEO only, only for a trusted page whose document is the scan shell, not http(s); else Deny | `Platforms/Android/WebViewRenderer.cs` · `S16SecRules.captureRefusal` | #1313 · P07 |
| L8 | `walletpass` → SecureStorage behind flag `SecureWalletPass` (default ON; dev toggle when dev mode is on): prefetch at App() top, bounded cold read (3 s), verify-then-remove migration, reverse copy when OFF, no plaintext write when ON, iOS/Mac ThisDeviceOnly, wipe + no-wallet start clear, BackupPage refuses an unreadable / wrong password, retry `proceed` verifies before it stores | NEW `Spixi/Meta/WalletPassStore.cs` · `Spixi/Utils/S16PassRules.cs` · `Spixi/Utils/SpixiFlags.cs` · `Node.cs` · `App.xaml.cs` ctor · `LaunchPage.xaml.cs` · `SettingsPage.xaml.cs` · `EncryptionPassword.xaml.cs` · `BackupPage.xaml.cs` · `DevPage.xaml.cs` + `src/shells/dev.html` | #1300 #909 · P03 → P24 |
| #1311 (a) | `[THEME]` diagnostic lines (event / push / resume / gen-stale) | `App.xaml.cs` theme lambda · `UIHelpers.cs` · `MainActivity.cs` · `SpixiContentPage.cs` generatePage · `S16FixRules` | #1311 |
| #1311 (b) | RESTORE-B: the cold-start lock's "Use a different wallet" sheet explains the way and only closes (no `ixian:change`); 13 `.txt` alerts name Account › Delete data… › Delete account | `src/components/lock-shell.js` · strings · `Spixi/Resources/Raw/lang/*.txt` · `LaunchPage.xaml.cs:329/981` literals | #1311 |
| #1311 (c) | unfinished-sent-file re-arm once per transfer id per process | `SpixiLocalStorageCallbacks.cs` · `TransferManager.cs` · `S16FixRules` | #1311 |
| #1294 (c) | Android hold shield: a transparent clickable sibling under the held stage until input-live / close / swap-out (+ 1.5 s backstop) | `SpixiContentPage.cs` hold region | #1294 |

Not built: the wallet sync strip (#1304; renders first, Damir picks), perf levers (S17), freeze prep (after perf).

## 2 · How to run
- Tree: the cloud twin = `ac28dace` (prompt commit) + the S16 working-tree diff (`git diff HEAD` incl. staged; new files staged). Ixian-Core @097341a at `../Ixian-Core`.
- Pipeline: FULL ran once after the merge; every `--check` gate green. CSH `pass=407 fail=0` (378 + 29). pins-s16 `24 / 0`.
- Smoke: running at the time of writing (`smoke-m1.log`). ⚠ Do NOT run node while it runs (check for `SMOKEDONE`). Mutation runs only in your own copy (`cp -a Spixi <you>`), serialized with `flock .runlock`, single module via `MODS=… node scripts/_s16run.mjs`, csh via `node scripts/run-csh.mjs`.
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint) — SECURITY lens first, then correctness
| Auditor | Scope | Focus |
|---|---|---|
| R1 | F1 F2 F3/F4 F5 F8 MAJOR #9 (a-sec files) | can each hole still be reached (script in lock.html / chat.html / home.html / a mini-app; DevTools on Windows)? a legit path broken (Settings authorise Cancel, cold-start hatch, biometric, grace, QR scan on Android, voice in a shown chat, paste)? compile-level C#; staging age bound; Android WebView URL forms |
| R2 | L8 (a-l8 files) | can the password leak (logs, plaintext written under flag ON, a timing path that falls back to plaintext)? lockout paths (a verified password that ends unreadable with no plaintext)? UI-thread deadlock (Windows DPAPI), the semaphore + timeouts, Android EncryptedSharedPreferences concurrency, iOS accessible, reverse copy, the wipe, BackupPage, proceed, both changepass legs, the restore paths, flag init order vs prefetch, dev toggle reachability |
| R3 | #1311 (a)(b)(c) + hold shield (a-fix files) | log lines carry only enums / ints; the sheet sends no verb; the re-arm cannot skip a real first arm or leak streams; the shield cannot leave the app untappable (every release path, exceptions, platform guards) |
| R4 | tests: `scripts/pins-s16/*`, `scripts/csh/S16*Tests.cs`, every re-based pin (`smoke-test.mjs` 9555/9610 + 4114-4126, pins-s9 a1/a2, pins-s11 c-wiring, pins-s13 b-swap) | does each check fail when its behaviour breaks (mutation budget ~25, effectful lines)? were re-based pins weakened? |

## 4 · Non-negotiables and accepted dials
- Must hold: PARAMOUNT isolation (#220) · no key / password across the bridge or into a WebView · no WebView path into a file op · no value (password, address, path, file name, text, token) in a log line · a lost / unreadable key = the retry screen, never a plaintext fallback (flag ON never WRITES plaintext; the existing plaintext is removed only after a verified secure copy) · existing `ixian:` verbs keep working.
- Accepted (do not re-open): Damir's picks — flags only for L8 + the F3/F4 gate · F3/F4 = a1 state gate (no input window) · F2 drop + warn + 5 s bound · MAJOR #9 Android only · RESTORE-B honest copy · L8 prefetch + 3 s bound, ThisDeviceOnly, Mac measured on the walk (no entitlement now), flag default ON + dev toggle with reverse copy · [THEME] lines only.

## 5 · Verdict

**CLEAN at r5** (#1325). Environment: the cloud twin; smoke BASELINE OK 5756 / the 2 KNOWN after the last fix · CSH 423.

| Round | Reader | MAJOR | MINOR | NIT | Notes |
|---|---|---|---|---|---|
| r1 | R1 a-sec scope | 2 | 2 | 7 | Android QR camera denied (URL = about:blank); covered chat opens the mic |
| r1 | R2 L8 | 1 | 4 | 5 | refused backup showed "Backed up"; no leak / lockout / deadlock found |
| r1 | R3 fixes + shield | 1 | 2 | 9 | "reinstall" advice false on W / M / Android Auto Backup |
| r1 | R4 tests | 4 | 5 | 3 | 2 red smoke pins; `locked` OR survived; name-only scan test; WalletPassStore unpinned — 45 mutations, 31 killed |
| r2 | fresh | 1 | 3 | 6 | chat info covering the chat on a phone still "shown" |
| r3 | fresh | 1 | 2 | 3 | a narrowed window: the col-2 pane over the chat still "beside"; XAML marker spellings |
| r4 | fresh | 0 | 1 | 2 | third spelling round → design change: the scan WebView by identity |
| r5 | fresh (identity fix) | 0 | 0 | 2 | CLEAN; n1 token count applied |

MAJORs: mechanism, fix and lesson in the r1 fixes table (DECISIONS #1325) and the handoff §6 (L126–L129). Every fix has a deliberate break that fails its check.
Recorded, not fixed: see DECISIONS #1325 and the handoff §5.
