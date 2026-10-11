# LEGACY · Inherited exposures we found and did NOT change

Rule (gate, CLAUDE.md): an exposure that exists at the fork point `0e85a4b8` is legacy and goes to BE untouched; ours we fix (#1312). Every row below was checked present at `0e85a4b8` and its anchor verified by grep at `387ca78b`. Severity is as filed in `docs/security-review-for-be-engineer.md` / `docs/be-cutover-brief.md` § Blockers.

| id | Exposure (one line) | Where (HEAD) | Severity as filed | What we did |
|---|---|---|---|---|
| MAJOR #8 (Android files) | Every WebView, mini-apps included, has `AllowFileAccessFromFileURLs = true`; `IsAllowedURL` passes every non-http(s) URL → mini-app JS can XHR-read `wallet.ixi` | `Spixi/Platforms/Android/WebViewRenderer.cs:484` · `Spixi/Utils/Utils.cs:857` · gate `WebViewRenderer.cs:162` (S16 tree) | MAJOR · § Blockers YES | ⚠ **taken over by #1313 (Damir): now OURS to fix** — still rides the https-origin lever (P17 #6), planned so mini-apps lose file access too; NOT built in S16; listed here until built |
| MAJOR #9 | `OnPermissionRequest` granted mic + camera to every WebView, mini-apps included | was `Spixi/Platforms/Android/WebViewRenderer.cs:55`; now `:59` (S16 tree) | MAJOR · § Blockers YES | **fixed by us, #1322 (Android)**: VIDEO only, only for the `ClassId="scan"` WebView, never http(s); else Deny — see P07. The iOS twin was ours and fixed earlier (#805) |
| H-6 | Mini-app storage `t` field → `Path.Combine` + `File.Open(FileMode.Create)`: `t = "../../wallet.ixi"` truncates the wallet | `Spixi/MiniApps/MiniAppStorage.cs:152` (from `MiniAppActionHandler.cs:176`) | § Blockers YES | nothing |
| MAJOR #10 + H-9 | Downloaded `app.id` is never validated; it reaches the install path and a recursive delete (rooted id = any directory) | `Spixi/MiniApps/MiniApp.cs:68` → `MiniAppManager.cs:378` (install) · `:421` (`Directory.Delete`) | MAJOR | nothing |
| H-8 | Android picker display name → `Path.Combine(tmpPath, name + ".tmp")` → write | `Spixi/Pages/MiniApps/AppNewPage.xaml.cs:258` | sweep row | nothing |
| H-10 | FileProvider publishes `files-path "."` and `external-path "."` (whole trees) | `Spixi/Platforms/Android/Resources/xml/provider_paths.xml:15`, `:3` | sweep row | nothing (the peer-file-name → download-path residual it amplified is closed, #1250) |
| MAJOR #4 / C-12 | Shells and mini-apps may share one `localStorage` origin | Windows: `Spixi/Platforms/Windows/WindowsWebViewHandler.cs` (no partition) | MAJOR (Windows untested) | narrowed: Android mini-app DOM storage off (`WebViewRenderer.cs:482`, #334); iOS separate store (2026-09-06 sweep batch), Mac gets the same handler (#1245) |
| D24 | `NSAllowsArbitraryLoads = true` on both Apple targets | `Spixi/Platforms/iOS/Info.plist:41` · `Spixi/Platforms/MacCatalyst/Info.plist:7` | sweep row | nothing (D25, "Mac has no handler", closed by #1245 A-14) |
| L8 / A1 | Wallet password stored in plaintext `Preferences["walletpass"]` | at 387ca78b: read `Spixi/Meta/Node.cs:413`; set `Spixi/Pages/Launch/LaunchPage.xaml.cs:603`, `:717`, `:1087` · `Spixi/Pages/Settings/SettingsPage.xaml.cs:608` · `Spixi/Pages/Settings/EncryptionPassword.xaml.cs:88` | was a blocker; v1.1 stated limit (#1165) | narrowed by #1300 (out of the Android backup); **built #1323**: SecureStorage behind flag `SecureWalletPass` (default ON) — see P24; flag OFF keeps the legacy plaintext |
| L2 (= "MAJOR #8" password) | Passwords ride navigation URLs and are form-decoded (`+` → space) | `Spixi/Pages/Settings/SettingsPage.xaml.cs:319` · `Spixi/Pages/Launch/LaunchPage.xaml.cs:150` | open, needs a migration | nothing on purpose (a fix locks out live wallets) |
| SEND_PAYMENT | Mini-app hands over a serialized tx; C# deserializes and broadcasts it after a native OK | `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs:301` → `:310` → `:318` | S13 sweep: LEGACY | nothing |
| chat-info verbs | `txdetails` opens ANY wallet tx (not peer-locked); `removehistory`, `userdefinednick` act with no native step | `Spixi/Pages/Contacts/ContactDetails.xaml.cs:1107` · `:599` · `:1120` | not filed (perf research §2b) | nothing; option B plans native confirms (planned, flagged) |
| chat admin verbs | `kick`, `ban`, `leave` act with no native confirm (Core kick/ban cases are empty, CORE-1) | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:793` · `:799` · `:815` | not filed (perf research §2b) | `leave` routed through `SContacts.leaveGroup` (#567); no confirm added |
| RENDERER | All Android WebViews share ONE renderer process (no site isolation): a renderer exploit in chat shares memory with the wallet pane | platform behaviour, no Spixi line (Android WebView puts all of an app's WebViews in one renderer; Spixi sets no profile or data-directory suffix) | not filed (perf research §0.1) | nothing; perf lever #5 `ChatProfile` (chat in its own renderer profile, P17) planned |
| IOS-INT | `UseInterpreter=true` on every iOS build (upstream 6e63a31f) | `Spixi/Spixi.csproj:145` | perf lead 13 | nothing; reason = Core ask (#1127, #1312) |
| LOG-25 | Incoming transfer id written to the log | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:3586` | S13 sweep: LEGACY (moved) | nothing |

**Inherited classes the census confirmed and did not re-file** (one line each in the gate doc, "The rows — INHERITED"): the twelve `Contains("ixian:` dispatch branches · `MiniAppPage`'s seven verbs · `localizeHtml`'s unescaped `*SL{}` · `updateDebugOverlay` HTML in C# · vendored `html5-qrcode.min.js` (byte-identical) · the IDN homoglyph link label · Windows `AreDevToolsEnabled` for every WebView (`Spixi/Utils/SpixiContentPage.cs:523`) · the remote update string · the price-service poll · the mini-app publisher POST.

## Legacy rows we CLOSED (BE sees them in the "ours" packets, not here)
| id | Closed by |
|---|---|
| #234 resume-lock Cancel unlocks | #458 (the shell) + #1322 (C#: `Spixi/Pages/Launch/LockPage.xaml.cs:456` refuses, `Spixi/App.xaml.cs:496` needs true); see P01 `lock` |
| L6 restore writes prefs before verifying | #1245 (A-13, `Spixi/Pages/Launch/LaunchPage.xaml.cs:697` `applyRestorePrefs`) |
| S16 residual: peer file name → download path | #1250 (`Spixi/Data/TransferManager.cs:831`) |
| G/I-1 log line with text + address + path | #1251 (`Spixi/Meta/SpixiLocalStorageCallbacks.cs:40`, `:53`) |
| H-7 install file name from the URL | #1245 (C-04, `Spixi/MiniApps/MiniAppManager.cs:197`) |
| D25 Mac without a WebView handler | #1245 (A-14, `Spixi/MauiProgram.cs:54`) |
| SECURITY.md §5.1 tip broadcast before confirm | closed by us, see P02 `money` (#626; `Spixi/Pages/Chat/SingleChatPage.xaml.cs:4594` confirm → `:4617`) |
| `waletpass` typo · Downloads `..` traversal | #346 · #267 |

## ⚠ Contradictions
- **I-1 (nuget)** is listed as INHERITED in `be-cutover-brief.md` § 2026-09-06 sweep and in the security review; the gate census says OURS and fixed (F-21). Code agrees with the census: `nuget.config` is absent at `0e85a4b8` (added 2db0c335, 2026-07-20). Not legacy — dropped here.
- **mutechat NIT** ("inherited", security review; #930 "PRE-EXISTING") — `ixian:mutechat` does not exist at `0e85a4b8` (added d5aef318, #476). The token-echo log line was OURS; fixed by #1322 (it logs the length, `Spixi/Pages/Home/HomePage.xaml.cs:1351`; P21).
- **#234, L6, S16 residual** still read "YES" in `be-cutover-brief.md` § Blockers and #234 sits in the gate's "Legacy — his" table; all three are closed in the tree (rows above).
- **G/I-1 anchor**: the census names `Data/TransferManager.cs`; the baseline lines are `Spixi/Meta/SpixiLocalStorageCallbacks.cs:27` and `:40` (at `0e85a4b8`).
- **SECURITY.md §3 / §5.1** still cite deleted pages (`WalletSend2Page`, `WalletContactRequestPage`) and the open tip gap.
