# F5 checklist — AND-45 (2026-09-18): the transparent navigation bar under the composer

Rows: DECISIONS **#883** (built + the Opus loop) · **#884** (your Session Z list, recorded). Finding: `docs/android-findings.md` AND-45.

Everything below already RAN — bundle · 18 shells · `build-shells --check` on the VM, and the FULL smoke suite in the
container on this exact tree: **BASELINE OK — 4727 pass / the 2 KNOWN**. `cs-syntax-check` 138 clean. Every landed file's
hash read back. Your run is the confirmation on Windows, not the first run — but **C# changed this time**, so the
Android build is the walk.

## 1 · The paste (PowerShell, repo root, one line at a time)

```powershell
npm.cmd i --no-save jsdom eslint globals
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
Remove-Item -Recurse -Force _to_delete
```

Expected last suite line: **BASELINE OK — 4727 pass / the 2 KNOWN** (+13 over Y's 4714: the AND-45 block ×14 as properties
incl. the positive bottom-chrome walk and the publisher-body pin, minus one folded). ⚠ `parser missing` = the `npm i` line
did not run. ⚠ `.git/index.lock` → delete it before GitHub Desktop (#882 ②).

**Then Windows F5 in Visual Studio (never `dotnet build`, #663)** — nothing should move on Windows (`--safe-bottom` = 0
there; the desktop pane's anchors resolve the same variable). Then Android:

```powershell
adb devices
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true -t:Run
```

⚠ **Wipe `obj`/`bin` first if the composer still shows the old band** — the #320 stale-asset trap. **Check the build is THIS
build:** open a chat — the composer's surface runs to the very bottom of the screen with the gesture pill / the 3 buttons
drawn over it. A band of the screen colour under the composer = the previous build.

## 2 · The walk — Android, BOTH navigation modes (Settings → Display/System → Navigation), both themes

`docs/walk-artifact-and-45.html` is the P/F/NA sheet (open it in any browser; Copy results at the top). The rows:

| # | do | expect | P/F |
|---|---|---|---|
| A.1 | open a chat, keyboard DOWN | the composer's surface continues under the nav bar; no band of the screen colour below it; 3-button: the buttons sit ON the composer surface with no grey scrim behind them | |
| A.2 | tap the field → keyboard UP | the composer sits DIRECTLY on the keyboard (no gap of a bar height); no jump on open; the newest bubble stays pinned | |
| A.3 | dismiss the keyboard (Back, or tap away) | no jump — the composer lands on the bar in one move; the list re-pins | |
| A.4 | K1: keyboard up → tap ⊕ | the tray replaces the keyboard; the composer bar does NOT move by a bar height (Session J); ⊕ again → keyboard back, same edge | |
| A.5 | keyboard down → tap ⊕ | the tray opens from the bar; its bottom row clears the pill / buttons | |
| A.6 | #770: keyboard up → rotate → rotate back | composer stays on the keyboard both ways; no slot poisoning (the tray after this is still keyboard-height) | |
| A.7 | any bottom sheet — tip / request / row menu / address / Add-contact chooser | the sheet's last row clears the bar; #608: a sheet with a field rises for the keyboard and scrolls | |
| A.8 | home: bottom nav + FAB | the nav is taller by the inset and paints under the bar; the FAB sits above the nav | |
| A.9 | Settings → save → the toast | the toast clears the bar (not under it) | |
| A.10 | launch (sign out → welcome), lock, change-password, scan | every footer / CTA clears the bar | |
| A.11 | a call: the strip and the full call surface | bottom controls clear the bar | |
| A.12 | a photo → the media viewer | the foot (✕) clears the bar | |
| A.13 | Apps → an app you have NOT installed | the sticky **Install** bar sits above the nav bar, fully tappable (was under it — Opus MAJOR-1) | |
| A.14 | open an installed mini-app; then focus a field in it | content ends above the bar; with the keyboard it ends AT the keyboard, no dead band (MAJOR-2) | |
| A.15 | cold start on GESTURE nav | the launch footer does not settle down ~24 dp a moment after first paint | |
| A.16 | switch gesture ⇄ 3-button WHILE the app is open, return | every screen re-pads live (chat, home, a sheet) | |
| A.17 | DARK, any of the above | the bar glyphs are light over our dark surface; LIGHT: dark glyphs (AND-7d picks from the bottom colour) | |
| A.18 | settings sub-page / contact details — scroll to the end | the last row scrolls UNDER the bar (same as iOS under the home indicator). **Your dial:** pad the last scroller by the inset? note yes/no | |
| A.19 | Windows F5 | nothing moved — desktop pane, sheets, toasts as before | |

## 3 · Owed by Damir

1. This walk (§2) — then the commit (`docs/commit-message-and-45.txt`), one batch.
2. **S1 timed** (#872 ②) — still the one number that decides #864 and the spare.
3. The AND-40 meminfo series · the iOS walk · the four #882 dials.
4. Session Z (`docs/handoff-2026-09-18.md` §3): sheets +padding · the dark chooser hue · the colour sweep verdicts · the label case + translations · the on-card hairline · the pencil centring.

## 4 · Commit

One batch, `docs/commit-message-and-45.txt`. `git add` the new files: `docs/handoff-2026-09-18.md` · `docs/f5-checklist-and-45.md` ·
`docs/walk-artifact-and-45.html` · `docs/commit-message-and-45.txt`; the three moves into `docs/archive/`
(`handoff-2026-09-17b.md` · `f5-checklist-session-y.md` · `commit-message-session-y.txt`).
