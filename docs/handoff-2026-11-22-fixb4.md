# Handoff 2026-11-22 — Fix batch 4 (`fixb4`): slide 4, the protect-account fields on Android, two new-account defaults, the Developer log, three walk findings

Read this FIRST, then DECISIONS #1845–#1855. Number block of this session: #1845–#1859 (used: #1845–#1855; #1856–#1859
stay empty) · lessons L265–L268 (all used) · packets P87–P89 (used: P87–P88; P89 stays empty). The main chat writes the
next prompt.

## 0 · State
- Branch: `work/fixb4` · base: `redesign/frontend` @ `338d30f4` "Merge pull request #18 from Rexoflex/work/defaultsb" ·
  delivery by #1546: the session pushes the branch; **Damir opens the pull request** (the compare link and the texts are
  in the status doc `claude/session-fixb4-status.md`) · merge = Damir (a merge commit, #1505).
- CI (`redesign-ci`): runs on the pull request (not run at the time of this commit).
- Smoke: `BASELINE OK 6814 / the 2 KNOWN (#136 · B3)` = 6774 + 40 (the full run after the last fix, 2026-11-23; cloud
  twin, Ixian-Core @ `097341a`, jsdom 29.1.1, .NET SDK 10.0.115, `TZ=America/Los_Angeles`; before the round-1 fixes
  `BASELINE OK 6804` = 6774 + 30) · CSH `pass=817 fail=0` (= 806 + 11) · gates `build-shells --check`,
  `build-locales --check` ✓ · `cs-syntax-check` 289 ✓.
- Review: #46 **CLEAN at r3** (#1854; MAJOR per round 0 → 1 (the walk sheet) → 0; no code change after r3) — `docs/review-brief-fixb4.md` § 5. Readers by #1606 as the prompt applies it: no `chat.html` and
  no component that draws untrusted text changed → fresh read-only Claude Opus readers (no Fable reader owed).
- ⚠ C# UNCOMPILED: `Spixi/Pages/Launch/LaunchPage.xaml.cs` (`PageDefaultsRules.cs` and `SpixiFlags.cs` compile and run in
  the harness). CI compiles Windows; Android in Damir's build; iOS / Mac in the Apple phase.
- New files: `Spixi/Utils/PageDefaultsRules.cs` · `scripts/csh/PageDefaultsTests.cs` · `scripts/pins-fixb4/*` (5 smoke
  modules + 2 Chromium scripts) · `docs/fixb4-mechanisms.md` · `docs/contract-fixb4.md` · `docs/review-brief-fixb4.md` ·
  `docs/walk-fixb4.md` · `docs/be-review-pack/P87…P88` · this handoff · `docs/commit-message-fixb4.txt`.
- Definition of done: no row of `docs/release-readiness.md` changed (that file belongs to session `docsb` now).

## 1 · What this session did
| Item | Result | Evidence | Switch |
|---|---|---|---|
| 1 `n-20261115-split-ships-slide4` | built: "Mini apps like Blitz Chess open right in your chats." in 14 locales; key `slide4Copy3` | #1848 · `a-slide4` | — |
| 2 `n-20261113-protect-account-keyboard` | built: on Android the focused field + ring is brought into the step's body (`scrollTop` only); 360 × 640 and 412 × 774 BASE fail → NEW pass | #1849 · `c-keyboard` + `c-keyboard-render.mjs` | — (layout) |
| 3 `n-20261118-default-media-autoload-off` | built: a new / restored account starts with Load pictures Off (+ the C# mirror Off) | #1845, #1846 · csh `PageDefaultsTests` · `b-defaults` · P87 | `DefaultMediaTapToLoad` |
| 4 `n-20261118-default-list-density-compact` | built: the Compact list on Windows / Mac | #1847 · P88 | `DefaultListCompact` |
| 5 `n-20261122-win-broken-picture-tile-stays-sending` | mechanism: an unsent file (a Seed contact never takes a file); walk rows W-2 / A-2 of `docs/walk-photo1b.md` corrected; a pin | #1851 · `e-tile-states` | — |
| 6 `n-20261122-dev-log-window-half-row` | built: the log floor 60vh (26 / 18 / 25 rows) | #1850 · `d-devlog` + `d-devlog-render.mjs` | — |
| 7 `n-20261122-win-drag-drop-files-into-chat` | mechanism only: never built; question Q-DD; FILE-NAV (inherited) listed | #1852 | — |

## 2 · Walk
Sheet: `docs/walk-fixb4.md` = the Artifact "Spixi Fix batch 4 — walk rows" (https://claude.ai/artifact/WDmgPY77DTVJALQcevsYmH;
Windows 7 rows, Android 6 rows; every set-up command in full). Result: owed. Windows makes a new account in a second
folder through `ixian.cfg` (`spixiUserFolder = SpixiWalkFixb4`). Two stores stay SHARED by both folders (#46 r2
MAJOR-1): the native preferences AND the app's one WebView store — the welcome screen of an empty folder clears the test
account's `spixi.*` keys (pins, drafts, appearance). The sheet copies the WebView store (`EBWebView`, found by a
PowerShell line) before W-3 and puts it back in W-9, or uses a second Windows user. ⚠ `docs/walk-defaultsb.md` has the
same omission (not this batch's file): the main chat should add the same step there. **The test phone has no safe way to make a new account** (L149): A-3 …
A-5 on an emulator or a spare phone, else N/A. The corrected rows W-2 / A-2 of `docs/walk-photo1b.md` need a second
device with a real contact (optional). The Artifact page of the photo1b walk still shows the old W-2 / A-2 text.

## 3 · Questions for Damir (the status doc and Mission Control carry them)
- **Q-DD (#1852) drag and drop into a chat:** (A) build it in its own batch, desktop first, C# takes the file from the OS
  drag data · (B, recommended) v1.0.x + a drop guard later · (C) never, with the guard. W-5 of the walk tells what a drop
  does today.
- **Q-T (#1853) the slide-4 title "Play and plan together.":** (A, recommended) "Play together." (a new key, 14 locales) ·
  (B) another title · (C) keep.
- Proposal (no question): the Developer screen could show the log above the switch cards (one tap less on the phone).

## 4 · For the next batch / the merge
- `SpixiFlags.cs`: `readFixb4();` is the last call of `init`, right after `readPhoto1b();`. Session `histcs` adds its own
  block at the same time: the merge keeps both calls (base order) and re-bases the tail pins named in
  `docs/commit-message-fixb4.txt` commit 2 and the four csh position checks.
- `pins-on1/ring-geometry.json` hashes `launch.html`, `launch-shell.js` and the launch strings: any edit there needs
  `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-on1/capture-rings.mjs`.
- The smoke row at `scripts/smoke-test.mjs` that tests `/min-height: 0/` on all of `settings-app.css` stays green but no
  longer pins the old log rule (meaning only; not changed).

## 5 · How Damir builds and walks it
Windows: close Visual Studio, delete `Spixi\bin` and `Spixi\obj`, check out `work/fixb4`, open the solution, F5 (never
`dotnet build`). Android: delete `Spixi/bin` and `Spixi/obj`, then the dev build. Then the walk page above.
