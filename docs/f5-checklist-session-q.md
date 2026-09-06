# F5 checklist — Session Q (#804, the Account sublevels stop booting a WebView)

The batch is three deleted tokens in one shell, plus the comments in C# that the deletion
made untrue. **§3 is the point of the session**: an Account minute measured before and
after, on one phone, with the thermal confound closed.

---

## §1 · The gates (run each block on its own — ONE command per block)

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
```

```powershell
node scripts/extract-strings.mjs --check
```

```powershell
node scripts/build-demo-bundle.mjs
```

```powershell
node scripts/build-shells.mjs
```

```powershell
node scripts/build-shells.mjs --check
```

```powershell
node scripts/build-legal-docs.mjs --check
```

```powershell
node scripts/i18n-lint.mjs
```

```powershell
node scripts/pseudo-locale-smoke.mjs
```

```powershell
node scripts/verify-locales.mjs
```

```powershell
node scripts/cs-syntax-check.mjs
```

```powershell
node scripts/smoke-test.mjs
```

The two release gates. Gate 1 proves the packaging strip was deterministic, gate 2 proves
it was harmless (Session N). They are not optional just because this batch did not touch
the strip — a run that skips them proves neither.

```powershell
Remove-Item -Recurse -Force $env:TEMP\spixi-pkg -ErrorAction SilentlyContinue; Copy-Item -Recurse .\Spixi\Resources\Raw\html $env:TEMP\spixi-pkg
```

```powershell
node scripts/strip-release.mjs --out $env:TEMP\spixi-pkg
```

```powershell
node scripts/strip-release.mjs --check $env:TEMP\spixi-pkg
```

```powershell
node scripts/smoke-packaged.mjs $env:TEMP\spixi-pkg
```

> ⚠ `--out`/`--check` take a directory; do NOT let the path end in a backslash inside the
> quotes (#795 — a Windows argv trap that eats the closing quote).
> ★ The MSBuild leg of the strip target is still proved separately, against the DEPLOYED
> folder, per the Session N checklist §2C. This block proves the script, not the target.

Expected, exactly: bundle **320 exports** · **18 shells** · `build-shells --check` ✓ ·
`extract-strings --check` ✓ · `build-legal-docs --check` ✓ · i18n-lint ✓ (6 dev exemptions) ·
pseudo **9/9** · locales **784 ALL CLEAN** · cs-syntax **138 + 1** ·
smoke **BASELINE OK 4377 / the 3 known (#136 · M5 · B3)** · `strip-release --check` GATE 1 OK ·
`smoke-packaged` GATE 2 OK at **4376**.

> 4377 assumes the **Ixian-Core sibling is present** beside the repo; without it the count
> is **4376** (the M1 `#448` pair). Record which you ran. Gate 2 always reads one less than
> the suite, because it runs without the sibling.

> No component changed, so `build-demo-bundle` is expected to rewrite the bundle
> byte-identically. Run it anyway: bundle BEFORE shells, always.

---

## §2 · Build

C# changed in one file (comments only — no logic), and one shell changed. Wipe anyway, because
an incremental Android build does **not** repackage `Resources/Raw`, and that has produced a
"the fix did nothing" report before (#320).

```powershell
Remove-Item -Recurse -Force .\Spixi\obj, .\Spixi\bin -ErrorAction SilentlyContinue
```

Windows: **F5 in Visual Studio**, never `dotnet build` — it does not stage `MauiAsset` beside
`Spixi.exe` and the app then silently serves the previous build's shell (#663).

Android:

```powershell
dotnet build .\Spixi\Spixi.csproj -c Release -f net10.0-android -t:SignAndroidPackage
```

```powershell
adb install -r .\Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk
```

```powershell
adb shell dumpsys package com.ixilabs.spixi.dev | Select-String "lastUpdateTime"
```

⚠ Read that timestamp before you measure anything. Session P lost an hour to a stale binary.

---

## §3 · ★★ THE MEASUREMENT — the whole point of this session

#803 measured the disease on this phone: **12.19 % janky frames, 90th 23 ms, 95th 30 ms,
99th 48 ms**, on a BRAND-NEW account with zero contacts and zero chats, with the **GPU idle**
at 11 ms through every janky frame. Three Account rows, three cold Chromium boots on the main
thread. This build removes those three boots. The question is what the number becomes.

### 3a · The rule that closes the confound

★★ **A perf capture on a device whose thermal state is unknown has an uncontrolled variable in
it.** Session P's rung ladder could not separate 11 600 messages from 6 °C, because the phone
warmed from 32 °C to 38 °C during the run and the temperature was only noticed afterwards.

So every capture below is bracketed by a temperature reading, and the run has an
**acceptance rule** rather than a hope:

* Read the temperature **immediately before** `gfxinfo reset` and **immediately after** the
  `gfxinfo` read.
* A capture whose **end − start > 3 °C is VOID.** Cool down and take it again.
* The two captures being compared must **start within 1 °C of each other.** If they do not,
  cool down and re-take the second one.
* Cool-down = app swiped away, screen off, phone off the cable, **5 minutes**. The phone
  discharges while plugged in with the screen on, so the cable is not a thermal rescue.
* Order the captures **A → B → B → A** (before, after, after, before). Any drift that survives
  the rules cancels instead of loading onto one arm.

`temperature` is reported in tenths of a degree: `temperature: 320` means 32.0 °C.

### 3b · The routine, identical every time

On a phone in the **Account tab**, with the app already open (so the SettingsPage WebView is
warm and only the sublevels are being measured):

> **Backup → back → Password → back → Download → back**, three times through. Roughly one
> minute. Tap at a steady, unhurried pace — the janky **percentage** has the frame count in its
> denominator, so racing through inflates it and dawdling deflates it.

### 3c · One capture, block by block

```powershell
adb shell dumpsys battery | Select-String temperature
```

```powershell
adb shell dumpsys gfxinfo com.ixilabs.spixi.dev reset
```

> Now do §3b on the phone: Account → Backup → back → Password → back → Download → back, ×3.

```powershell
adb shell dumpsys gfxinfo com.ixilabs.spixi.dev | Select-String "Total frames|Janky frames|50th|90th|95th|99th|Number Missed Vsync"
```

```powershell
adb shell dumpsys battery | Select-String temperature
```

Write the five numbers plus both temperatures into the table in §3e before you touch the phone
again.

### 3d · Getting the BEFORE arm on the same phone, same day

The published 12.19 % was taken on a different day at a different temperature, so it is a
sanity check, not the control. Take the control yourself:

```powershell
git stash push
```

```powershell
dotnet build .\Spixi\Spixi.csproj -c Release -f net10.0-android -t:SignAndroidPackage
```

```powershell
adb install -r .\Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk
```

…capture per §3c… then

```powershell
git stash pop
```

⚠ **Never commit while stashed**, and re-check `lastUpdateTime` after every install.

★ Use the **empty-account** profile if you can (a fresh `.dev` install, account created, no
contacts). That is what makes the result unarguable: #803 showed the Account jank needs no data
at all, so an empty profile removes the seed as a variable and removes the heat a 11 600-message
seed generates. If you would rather not lose the seeded profile, run the seeded one — just say
which, and compare like with like.

### 3e · Record it here

| | before (stashed parent) | after (this build) |
|---|---|---|
| profile (empty / heavy seed) | | |
| battery temp START / END | / | / |
| Total frames | | |
| **Janky frames %** | | |
| 90th / 95th / 99th | / / | / / |
| Missed Vsync | | |

**PASS if the janky percentage falls and the 99th falls.** The mechanism removed is three cold
WebView boots; if the number does not move, the mechanism was not the whole cause and the next
step is a systrace, not another guess.

⚠ If the two arms' START temperatures differ by more than 1 °C, the row is void. Say so rather
than reporting it.

---

## §4 · The walk

Open `docs/walk-artifact-session-q.html` in a browser — P / F / N per row, one copyable block at
the end. The same rows, for the record:

### The three sublevels, on the phone

| # | row | expect |
|---|---|---|
| A1 | Account → **Backup** | Opens as a sublevel with a slide, exactly like How-to-use. NO full-screen page swap, no white flash |
| A2 | back from Backup | Returns to the hub, on the row you left, with the bottom nav back |
| A3 | Account → **Change Spixi password** | Same: a sublevel, title "Change Spixi password", three fields and a sticky CTA |
| A4 | back from Change password | Returns to the hub. Re-open it: the three fields are EMPTY |
| A5 | Account → **Downloads** | Same, and the file list fills (or the empty state shows) |
| A6 | back from Downloads | Returns to the hub |
| A7 | hardware back from each of the three | Returns to the hub, does NOT leave the Account |
| A8 | the whole routine, felt | Smooth. This is the subjective half of §3 — say what it feels like |

### The three still work

| # | row | expect |
|---|---|---|
| B1 | Backup → **Back up now** | The OS share sheet appears with the archive, as before |
| B2 | Backup → Advanced → export wallet | As before |
| B3 | Change password: wrong current password | The inline error, on the screen, no native alert |
| B4 | Change password: a correct change | Morph → returns to the hub → **restart the app and confirm it opens with the NEW password** (the #341 MAJOR-2 test — it must still pass on this route) |
| B5 | Downloads → tap a file | Opens it |
| B6 | Downloads → delete a file | Row goes, list re-pushes |

### Nothing else moved

| # | row | expect |
|---|---|---|
| C1 | Account → About, How-to-use, Chat appearance, Contributors, Theme, Language | Unchanged |
| C2 | Account → nickname edit → tap Chats → back to Account | The edit is still saved (auto-save + park, #315) |
| C3 | **Desktop, WIDE window**: Account pane → the same three rows | Unchanged — this is the route that already shipped |
| C4 | Desktop, wide: the pane's hub column stays beside the sublevel | Unchanged |
| C3b | ★ **Desktop, NARROW window** (below the pane breakpoint, so the Account is full-window): the same three rows | **This DID change, and the batch is not claiming otherwise.** A narrow desktop window runs with no `data-pane`, so it took the pushed pages too and now takes the inline route. Expect: a sublevel with the Account's own left rail still beside it, fields centred, exactly like About and How-to-use there. Rendered in `docs/sheets/session-q/inline-encpass-narrow-desktop.png` — compare |
| C3c | Desktop, narrow: back from each of the three | Returns to the hub, rail intact |
| C5 | The backup **nudge** (home, after a first real contact or a balance) → Back up now | Still opens `BackupPage`, the full page. That route is HomePage's, not the Account's, and it is deliberately untouched |
| C6 | Delete-account / app-lock-off / payment-auth confirm | Still raise the LockPage auth. Untouched — they are modals, not Account rows |

### D · The two surfaces this batch did NOT fix (Damir, mid-session)

Add contact and Add app are the last two hot rows that push a page with its own WebView.
A FAIL here is not a defect in this batch — it is the measurement that decides whether the
next one is worth the C# it costs (the handoff prices it).

| # | row | expect |
|---|---|---|
| D1 | Chats → **Add contact** | Does it stutter the way Backup and Password used to? Say it in your own words |
| D2 | Apps → **Add app** | Same question |

★ If the three Account rows are smooth after this build and these two still are not, that is
the evidence. If these two are ALSO smooth, something else was carrying the stutter and the
next step is a systrace, not another routing change.

---

## §5 · Commit

One batch, 39 paths. `git status` on your machine should show exactly:

* **modified** — `DECISIONS.md` · `scripts/smoke-test.mjs` · `src/shells/settings.html` ·
  `src/components/lock-shell.js` · `src/components/settings-shell.js` ·
  `src/styles/components/lock-shell.css` · `src/demo/spixi.iife.js` ·
  `Spixi/Pages/Settings/SettingsPage.xaml.cs` · `Spixi/Pages/Settings/EncryptionPassword.xaml.cs` ·
  `Spixi/Pages/Home/HomePage.xaml.cs` · `Spixi/Utils/SpixiContentPage.cs` ·
  `Spixi/Resources/Raw/html/{settings,intro,lock,settings_encryption}.html` ·
  `Spixi/Resources/Raw/html/spixi.bundle.js` · `docs/next-session-prompt.md` ·
  `docs/security-handover-gate.md` · `docs/security-review-for-be-engineer.md` ·
  **`CLAUDE.md`** (the Session Q status row)
* **new** — `docs/{handoff-2026-09-06b.md, f5-checklist-session-q.md,
  walk-artifact-session-q.html, commit-message-session-q.txt,
  opus-review-verdict-session-q.md, **release-readiness.md**}` ·
  `docs/sheets/session-q/` (seven renders) · the six `docs/archive/` copies
* **deleted** — the six Session P docs that moved into `docs/archive/` (git shows renames
  once both halves are staged): the handoff, the checklist, the walk artifact, the commit
  message, and the loop's brief and verdict. Four of the six also left a spare copy in
  `_to_delete/session-p-consumed/`, because `git rm` is refused on the session's mount.
  Those spares are duplicates of what is now in `docs/archive/` — delete `_to_delete/`
  locally.

⚠ Also present and NOT part of the batch: `_deliveries/spixi-session-q.tar.gz` (the delivery
copy) and a pre-existing `Claude outputs/spixi-session-p.tar.gz` deletion.

Message in `docs/commit-message-session-q.txt`. Never `git add -A` (CRLF churn on ~116 files).

---

## §6 · The numbers this session closed on

Fill `<N>` in §1 from here.

| gate | expected |
|---|---|
| `build-demo-bundle` | **320 exports**. ⚠ NOT byte-identical — two components gained corrected comments, so the bundle and the three shells that inline it move too |
| `build-shells` | **18 shells** · `--check` ✓ |
| `extract-strings --check` | ✓ (no new string key) |
| `build-legal-docs --check` | ✓ |
| `i18n-lint` | ✓, 6 dev exemptions |
| `pseudo-locale-smoke` | 9/9 |
| `verify-locales` | 784, ALL CLEAN |
| `cs-syntax-check` | 138 + 1 |
| `smoke-test` **with** the Ixian-Core sibling | **BASELINE OK 4377 / the 3 known** (4376 without) |
| `smoke-packaged` | **BASELINE OK 4376** + GATE 2 OK |
| `strip-release --check` | GATE 1 OK |

⚠ `package.json` and `package-lock.json` exist only in the container clone this session ran
in (jsdom, tree-sitter and playwright-core were installed there). They are NOT part of the
batch and must not appear in the commit.
