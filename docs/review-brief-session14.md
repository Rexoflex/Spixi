# Review brief — Session 14 (#1279–#1291)

Repo: /home/claude/tw/Spixi (cloud twin of `redesign/frontend` @ 8616c663 + the uncommitted S14 batch; `git diff` shows it).
Ixian-Core sibling: /home/claude/tw/Ixian-Core @097341a. MAUI 10.0.71 source (sparse): /home/claude/maui.
Contract the units built against: the S14 contract (session scratch, summarised in DECISIONS #1280–#1286).
DECISIONS rows #1278–#1292 (bottom of DECISIONS.md) state every mechanism and Damir's picks.

## What landed
| # | What | Files |
|---|---|---|
| 1279 | About art: heart + gold star | src/components/settings-app.js, src/styles/tokens.css |
| 1280 | Android 16 predictive back: always-enabled AndroidX back callback → MAUI back handlers → else MoveTaskToBack | Spixi/Platforms/Android/MainActivity.cs, Spixi.csproj (comment) |
| 1281 | Backup rules on the runtime path `Documents/Spixi/…` + new exclusions incl. app_webview | Platforms/Android/Resources/xml/*.xml |
| 1282 | Overlay stage container = Clip (no shadow); dev switch Clip/Shadow/None | Spixi/Utils/SpixiContentPage.cs, S11ChatRules.cs, Pages/Dev/DevPage.xaml.cs, src/shells/dev.html |
| 1283 | Chat info rides the chat → group swap | SpixiContentPage.cs, Pages/Contacts/ContactDetails.xaml.cs |
| 1284 | `ixian:landtab:<id>[:<nick>]` = one verb for land + save + hand-off | src/shells/settings.html, Pages/Settings/SettingsPage.xaml.cs |
| 1285 | `ixian:aboutLink:<id>` whitelist; Settings openLink branch deleted | settings.html, settings-app.js, SettingsPage.xaml.cs, Meta/Config.cs |
| 1286 | No balance in WebView failure texts (signSend / payRequest / tip) | Utils/SPayments.cs, Pages/Chat/SingleChatPage.xaml.cs |
| 1287 | Account subscreen swap no longer re-inserts the screen (art replay) | src/shells/settings.html |
| 1288 | About chip fill, launcher-coloured icon tile, blue band | settings-app.css, tokens.css, settings-app.js |
| 1289–1291 | Wallet: empty state hides tools + misstx link; art A (no cards); tx row inset 16 | wallet-shell.js/.css, home.html, illustrations.js |
Pins: scripts/pins-s14/{a1-backup-back,a2-container-ride,b-settings,c-balance-text,d-backup-about,e-wallet}.mjs (registered in smoke-test.mjs); CSH scripts/csh/S14OverlayTests.cs.
Green: smoke BASELINE OK 5706 / the 2 KNOWN · CSH 349. ⚠ No Android / iOS / Windows compile is possible here: read C# at compile level.

## Must hold
- CLAUDE.md ground rules: chat isolation, C# touches no risky parts, bridge frozen (new verb aboutLink + widened landtab are 🟡 rows), security handover gate (introduce nothing), log lines fixed words + integers only.
- No re-parent of a chat / overlay WebView on any path (no Children reorder, no ZIndex change, no cascaded InputTransparent flip) — docs/s13-flash-mechanism.md.
- A held swap never shows the list or a blank between old and new; chat info is never stranded on screen nor closed twice; back during the hold returns to a live, touchable screen.
- Back: every back press runs the page back pipeline exactly ONCE on every Android version (≤ 15 legacy key path and 16 predictive); nothing finishes MainActivity.
- landtab: a nick containing ':' survives; an unknown id never strands the user on Account; no nick in any log.
- Backup rules: identical in the three lists; wallet / Acc / avatars / preferences still backed up.
- One CSS animation entrance per element lifetime (#1263).
- Re-based pins are not weakened (compare old vs new predicates in `git diff scripts/`).

## Accepted dials (do not re-open)
O-01 accepted (feeQuery balance in chat) · 12-BAND accepted · S12GroundWait kept · O-40 accept · no back-to-home preview animation (Damir OK) · wallet art A · white chat bubble on the About band · chat info → group uses the COLD chat path.

## Scopes (round 1, disjoint)
- R1 Android C#: MainActivity.cs, SpixiContentPage.cs (container helper + ride-along + every touched path), ContactDetails.xaml.cs, DevPage.xaml.cs, S11ChatRules.cs. Compile-level API names (AndroidX.Activity, Microsoft.Maui.LifecycleEvents, Shapes.RectangleGeometry), threading (UI thread), lifetimes, every exit path of the ride.
- R2 shells + C# settings/payments + security: settings.html, settings-app.js/.css, dev.html, home.html wallet, wallet-shell.js/.css, illustrations.js, SettingsPage.xaml.cs, Config.cs, SPayments.cs, SingleChatPage.xaml.cs (the changed hunks), backup XML, docs/security-handover-gate.md rows. Threat model + behaviour + a11y of new controls.
- R3 tests: every pins-s14 module and every re-based pin (git diff scripts/): does each fail when its behaviour breaks? Derive your own mutation list (budget ~15), report survivors with the exact break. Re-based pins must not be weaker than before.

## §5 Verdict
| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | R1 Android C# (Opus) | 0 | 4 | 7 |
| r1 | R2 shells + security (Opus) | 1 | 6 | 10 |
| r1 | R3 tests (Opus, 19 mutations, 6 survivors) | 2 | 6 | 4 |
| r2 | fresh reader (Opus, 10 mutations on the fixes, 1 equivalent survivor) | 0 | 0 | 6 |

MAJORs (all fixed, see DECISIONS #1294): nick blur-commit + tab = two navigations (carry rule + one verb + C# exit latch) · ride restore
unpinned (riderEffects rule + pins) · hook-bracket reader unpinned (pinned). Recorded 🟡: walletpass in backed-up sharedpref · tip fee hint ·
hold tap fall-through · lossy nick round-trip. Final: smoke BASELINE OK — 5706 / the 2 KNOWN · CSH 352 · every --check gate. **CLEAN.**
