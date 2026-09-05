# F5 CHECKLIST — SESSION N (2026-09-05): the legacy purge · the perf instruments · the strip fork

Two goals shipped. **Goal 1** deleted the last four legacy documents and everything only
they loaded (DECISIONS #789/#790). **Goal 2** shipped the two investigations as temporary
instruments (#791), settled the comment-strip fork with its two gates (#792), rendered the
SVGO doodle for your eye (#793), designed the pre-warm (#794), and measured the image set
(#795). The clickable version of the rows is `docs/walk-artifact-session-n.html`.

⚠ **PowerShell: ONE command per block. Nothing in a code block that is not a command.**

---

## 0 · Land the batch, then the pipeline (pre-commit confirmation)

The batch lands as a tar over your tree (bridge). The generators already ran in the
container and every gate is green there; re-run them on your machine before you commit.

**New files to `git add`:** `scripts/strip-release.mjs` · `scripts/smoke-packaged.mjs` ·
`docs/prewarm-chat-spec.md` · `docs/sheets/session-n/` (3 files) · `docs/handoff-2026-09-05c.md`
· `docs/f5-checklist-session-n.md` · `docs/walk-artifact-session-n.html` ·
`docs/commit-message-session-n.txt` · `docs/archive/handoff-2026-09-05b-session-m-to-n.md`.

**Deletions git shows as `D` (do NOT restore):** `Spixi/Pages/MiniApps/AppsPage.xaml(.cs)` ·
`Spixi/Pages/Settings/SetLockPage.xaml(.cs)` · `Spixi/Pages/Wallet/WalletRecipientPage.xaml(.cs)` ·
`Spixi/Resources/Raw/html/{apps,address,settings_lock,wallet_recipient}.html` ·
`Spixi/Resources/Raw/html/{css,libs,fonts}/**` · `Spixi/Resources/Raw/html/js/*` except
`html5-qrcode.min.js` · `Spixi/Resources/Raw/html/img/**` except the 13 flags ·
`Spixi/Resources/Raw/html/images/{wallet-es.png,triangle-pattern.svg,onboarding/join-community.svg,onboarding/backup.png}` ·
the same three under `src/demo/images/`. They were MOVED to `_to_delete/purged/` over the
bridge, so GitHub Desktop already lists them as deleted — tick them. **Never `git add -A`**
(CRLF churn). Delete `_to_delete/` after the commit.

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
```
```powershell
node scripts\extract-strings.mjs
```
```powershell
node scripts\build-locales.mjs
```
```powershell
node scripts\build-strings-iife.mjs
```
```powershell
node scripts\build-demo-bundle.mjs
```
```powershell
node scripts\build-shells.mjs
```
```powershell
node scripts\i18n-lint.mjs
```
```powershell
node scripts\pseudo-locale-smoke.mjs
```
```powershell
node scripts\verify-locales.mjs
```
```powershell
node scripts\build-shells.mjs --check
```
```powershell
node scripts\smoke-test.mjs
```

Expected (seen green in the container, Ixian-Core sibling PRESENT):

```
bundle 321 · shells 18 · smoke BASELINE OK 4125 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 786 · i18n-lint OK (6 dev) · pseudo 9/9 · cs-syntax 138 clean + 1 known gap
extract-strings --check OK · build-shells --check OK · build-legal-docs --check OK
```

`cs-syntax` reads **138** now, not 141: three C# pages are deleted. `cs-syntax-check`
reports SKIPPED on the bridge VM; it ran in the container.

---

## 1 · Build

**C# changed** (`SpixiContentPage.cs` · `UIHelpers.cs` · `Utils.cs` · `ThemeManager.cs` ·
`SpixiLocalization.cs` · `HomePage.xaml.cs` · `AppDetailsPage.xaml.cs` · `Spixi.csproj` and
three pages DELETED) — a real build. **Wipe `obj` and `bin` first** (three xaml pages left
the project; a stale `obj` keeps their generated `.g.cs`).

⚠⚠ **WINDOWS: BUILD WITH F5, never a bare `dotnet build` (#663).** Not Rebuild Solution.

```powershell
Remove-Item -Recurse -Force Spixi\obj, Spixi\bin
```

Android, Release with dev-coexist (a Debug build's timings are not honest for B):

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true -t:Run
```

⚠ **This is the first build with the Release-only strip target.** The build log must show
`Spixi: Release packaging strip applied (spixi.tokens.css from …obj…spixi-strip…)`. If
`node` is not on the PATH the Release build FAILS LOUD at that target — that is by design;
`-p:SpixiStripHtml=false` opts out.

---

## 2 · The rows

### A · The legacy purge (#789) — every surface that could have lost a route

| # | Do | Expect |
|---|---|---|
| A1 | Cold start; visit Chats · Wallet · Apps · Account | All four render, themed. Nothing legacy loads at boot (there is nothing legacy left to load) |
| A2 | Account → App lock ON; kill the app; reopen; Account | Lock still ON (`ixian:lock:on\|off` → SettingsPage — the deleted HomePage branch was never on this path). Toggle OFF, same again |
| A3 | Apps → an app → App details → **Open** | The app launches. (single-user) |
| A4 | Apps → a MULTI-user app → App details → **Invite a contact** | The in-shell contacts PICKER opens (never a legacy recipient list). Pick one → the invite lands in that chat |
| A5 | Chats → FAB (new chat) | The in-shell contacts picker — no legacy page |
| A6 | Chats → FAB → create a GROUP with a photo | The group is created WITH its photo (the temp-avatar path now has one resolver, `groupAvatarTempPath`) |
| A7 | Account → QR / Scan a contact's QR | Camera preview + decode work (`js/html5-qrcode.min.js` is the ONE legacy-folder file that survived — on purpose) |
| A8 | Account → Language | 13 flags render on the rows (`img/flags/` survived; `gb.png` did not — it was never a flag) |
| A9 | Apps tab with NO apps · Chats with NO chats · Contacts picker with NO contacts | Each empty state shows its illustration (apps-es · chats-es · contacts-es) |
| A10 | Receive an app invite for an app that has NO icon | The card shows the ROCKET glyph — no broken-image square (the `img/app-noicon.jpg` file is gone; the shell maps the marker) |
| A11 | Flip the OS theme while on Wallet; look at every open surface incl. the desktop welcome pane | Everything re-themes by push. No reload, no flash (the legacy reload branch is gone) |
| A12 | Open a mini-app | Its content still sits BELOW the status bar (the native inset survived for third-party pages) |
| A13 | Android/iOS: walk all 18 screens | Nothing renders under the notch — every shipped document is `viewport-fit=cover` |
| A14 | Package size | Raw/html went 15 MB → ~7.7 MB; the APK is smaller by roughly that |
| A15 | Fresh install (or a second device): the welcome carousel + Restore | The four slides + the restore hero show their art (`images/onboarding/` survived) — N/A if no fresh install |

### B · The instruments (#791) — a capture, not a verdict

Build Release + dev-coexist, open a chat **3 times**, capture:

```powershell
& "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe" logcat -c
```
```powershell
& "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe" logcat -v time | Select-String "CDPERF" | Out-File -Encoding utf8 cdperf-n.log
```

| # | Do | Expect |
|---|---|---|
| B1 | Open a chat ×3 | Each open logs ONE `[CDPERF] chat-shell parse pre=… tokens=… base=… styles=… pattern=… body=… icons=… strings=… bundle=… inline=…` line. **Paste the three lines.** These replace every estimate in `docs/perf-lean-workorder.md` |
| B2 | ~1.5 s after each open | ONE `[CDPERF] chat-shell rtt n=5 med=… min=… max=…` line. **Paste them.** Decision rule (#791): med ≤ ~3 ms → drop the direct-channel idea forever; ≥ ~15 ms → it is the route below ~120 ms |
| B3 | Two-device: does anything look different while the probe runs? | Nothing — the pings start 1.5 s after the open and never touch the composer |
| B4 | (still owed since #788) `[CDPERF] present <page> by=paint\|timer` | NOT built — phone-only, next perf session. N/A |

### C · The strip fork (#792) — Release only

| # | Do | Expect |
|---|---|---|
| C1 | Release build log | `Spixi: Release packaging strip applied (spixi.tokens.css from …)` |
| C2 | **GATE 1** against the DEPLOYED html folder (the one beside `Spixi.exe` on Windows, or the APK's `assets\html`) | `strip-release --check: GATE 1 OK …` |
| C3 | The Release app, light AND dark, every tab | Themed exactly as before — tokens.css lost only its comments |
| C4 | **GATE 2** (5 min) | `smoke-packaged: GATE 2 OK` |
| C5 | A Debug build | No strip line, `node` never runs, `spixi.tokens.css` ships unstripped |

Gate 1 on Windows — the DEPLOYED folder is the `html` folder beside `Spixi.exe` in the Release
output (`AppDomain.BaseDirectory` — #663). NOT `Documents\Spixi\html` (that holds the
localized `ll_*.html` copies; gate 1 fails loud there by design). The first command may print
more than one folder on a multi-TFM tree — take the one whose parent holds `Spixi.exe`:

```powershell
Get-ChildItem -Path Spixi\bin\Release -Recurse -Filter Spixi.exe | ForEach-Object { Join-Path $_.DirectoryName html }
```
```powershell
node scripts\strip-release.mjs --check "<paste the folder from above>"
```

Gate 1 on Android — from the built APK:

```powershell
Get-ChildItem -Path Spixi\bin\Release -Recurse -Include *-Signed.apk, *.aab | Select-Object -ExpandProperty FullName
```
```powershell
Copy-Item "<paste the apk path>" "$env:TEMP\spixi-apk.zip"
```
```powershell
Expand-Archive -Force "$env:TEMP\spixi-apk.zip" "$env:TEMP\spixi-apk"
```
```powershell
node scripts\strip-release.mjs --check "$env:TEMP\spixi-apk\assets\html"
```

Gate 2:

```powershell
node scripts\smoke-packaged.mjs
```

### D · Your eye (nothing landed)

| # | Look at | Say |
|---|---|---|
| D1 | `docs/sheets/session-n/doodle-svgo-sheet.png` — original vs SVGO tile on the real shell, both themes, 4× crops at the worst pixel (max delta 6/255 on <0.001 % of pixels) | **land / keep** — landing = copy `chat-bg-doodles.svgo-candidate.svg` over `src/assets/images/chat-bg-doodles.svg`, `generate-chat-pattern`, `build-shells`: −135 KB per chat open |
| D2 | The lossy PNG set (pngquant q80–98, −55 %, 1.33 → 0.74 MB) | **render it first / no** — a sheet is one harness run away |
| D3 | `contacts-es.svg` is a 325 KB base64 PNG in an SVG wrapper; its siblings are 640-px PNGs | **convert / keep** |
| D4 | The four Session M dials (#783/#787): Canvas-vs-Colour · None-vs-Off · doodles boost ×3 (×4.5/×2) · matrix swatch larger | one word each — still `?` on the walk-M sheet |

---

## 3 · Commit

Message: `docs/commit-message-session-n.txt`. One batch. The `git rm` block for the deletions
the bridge could not make is in the handoff §2.
