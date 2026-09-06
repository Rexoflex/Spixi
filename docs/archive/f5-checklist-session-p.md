# F5 checklist — Session P (the pre-warm #800 + the batch transport #801 + the loop #802)

Both levers are ONE build. The stamps stay separable: `attach spare=` says which path an
open took, `batch n= json= t=` and the shell's `batch=` token say which transport carried it.

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

Expected, exactly: bundle **320 exports** · **18 shells** · `build-shells --check` ✓ ·
`extract-strings --check` ✓ · `build-legal-docs --check` ✓ · i18n-lint ✓ (6 dev exemptions) ·
pseudo **9/9** · locales **784 ALL CLEAN** · cs-syntax **138 + 1** ·
smoke **BASELINE OK 4360 / the 3 known (#136 · M5 · B3)**.

> The 4360 assumes the **Ixian-Core sibling is present** beside the repo. Without it the
> number is 4359 (the M1 `#448` pair). Record which you ran.

---

## §2 · Build

C# changed in five files, so the incremental build is not enough.

```powershell
Remove-Item -Recurse -Force .\Spixi\obj, .\Spixi\bin -ErrorAction SilentlyContinue
```

Then **F5 in Visual Studio** for Windows — `dotnet build` does NOT stage `MauiAsset` beside
`Spixi.exe` and the app then silently serves the previous build's shell (#663). Android is
unaffected; deploy it the usual way.

---

## §3 · THE MEASUREMENT — DONE on Android, 2026-09-06. Read it, do not redo it.

Motorola, Release + `SpixiDevCoexist`, heavy seed (53 chats × ~50 rows). Everything below is
measured on the phone. Only the **Windows** rows are still owed.

### 3a · What the levers bought

| | before (Session O) | after (this build) |
|---|---|---|
| `attach` | n/a | **`spare=1 tap=0ms` on 10/10 opens** |
| transport | per-row | **`batch=1` on every open** |
| `chat batch n=50` | n/a | `json=9 448–16 336` · `t=3–106 ms` |
| `drain → painted` | 122 / 178 ms | **15–133 ms** |
| `present t=` | 300 / 409 ms | **67–262 ms** (67 best) |

`batch t=` peaked at 181 ms, comfortably under the shell's 500 ms first-paint fallback, so the
r12 race is closed by measurement (§3c's question is answered: nobody needs to dial the timeout).

### 3b · What the pre-warm costs — ~15 MB, and how that was established

⚠ **Do not compare memory across builds.** The same build read `TOTAL PSS 248 907` and then
`307 153 KB` — **58 MB of drift**. Any cross-build delta would have been noise.

The number came from four `dumpsys meminfo` readings **paired inside one process**. The spare-free
condition is produced without a rebuild: backgrounding fires `dropSpareChat("sleep")` and trigger B
is one-shot, so after a Home-and-return there is no spare until a chat closes.

```
A · Home → reopen → wait 3 s   WebViews: 3   TOTAL PSS 292 844 / 305 522 KB
B · open a chat → back → 3 s   WebViews: 4   TOTAL PSS 312 588 / 316 496 KB
paired cost = +19.7 and +11.0 MB PSS  ->  ~15 MB, about 5%
```

The ordering tracks the WebView count, not elapsed time: the second **A** read came *after* the
first **B** read and was lower. Within-condition spread 12.7 MB, so the honest figure is a range.
`CHAT_SPARE_ENABLED` carries these figures in its docblock and a pin asserts them.

To re-take it after any change, use exactly that A/B — same process, same session, four reads:

```powershell
adb shell dumpsys meminfo com.ixilabs.spixi.dev | Select-String "TOTAL PSS|TOTAL RSS|WebViews"
```

### 3c · ⚠ #799's frame probe is RETIRED. Do not use it as an acceptance test.

`chats-after-close frames drop=` read **11,9,9,1,7,9,10,9,3,1**, then **3,6,8,4,2**, then
**6,7,7,6,6** — three captures of the *same* build. The spread between identical builds is as wide
as the effect the probe exists to detect. It convicts nobody. The earlier instruction in this file
("`drop=` and `max=` must not RISE — if they do, delay the warm") was acted on, produced a 1200 ms
experiment, and the experiment was cancelled once the noise floor was known. If a future session
needs this question answered, build the counterfactual instead (§3d).

### 3d · The one test that settles a "did we make it worse" question

`git stash push` → build → install → **same phone, same seed** → use it. Run on 2026-09-06: the
pre-Session-P baseline stutters **identically** (list scroll, Account → Password/Backup/Download).
Both levers are exonerated. Restore with `git stash pop`; never commit while stashed.

### 3e · The jank that is real, and is NOT this branch

Exactly three Account entries push a NEW page with its OWN WebView —
`SettingsPage.xaml.cs:383` (EncryptionPassword) · `:489` (BackupPage) · `:501` (DownloadsPage).
How-to-use and About are in-hub sublevels in the already-open settings WebView, and they are
smooth. Each of the three pays a cold **130–230 ms** Chromium boot + parse on the main thread, and
`dumpsys` shows `WebViews: 3` in ONE pid with **no `:sandboxed_process` rows** — WebView runs
**in-process** on this device, so every shell boot competes with the UI it is animating. That is
the disease #800 cures, aimed at the wrong three pages. Next session's target (#803).

### 3f · Windows — MEASURED 2026-09-06, and it found a design limit

WinUI, dual pane, 63 chats. The lever works, and it is the fastest open in the project:

```
chat warm start · warm onload t=148
chat attach spare=1 tap=1ms  ->  chat present t=87
chat attach spare=0 why=none ->  chat present t=178-241   (every other open)
```

⚠ **But there was exactly ONE spare in the whole session.** Trigger B is one-shot. Trigger A
fires from `onOverlayClosed` and needs the LAST conversation to close — and on desktop you
switch conversations, which tag-replaces rather than closes. `warmSpareChat` also refuses
`why=chat` while any chat WebView is open, deliberately (one chat WebView at a time). So on
desktop the pre-warm buys **one fast open per session** and every later open takes the fallback.
Mobile is unaffected: backing out to the chats list IS a close, so trigger A re-arms every time.

A third trigger (warm after a chat SWITCH) would need a second resident chat WebView, which is
the thing the `why=chat` guard exists to prevent, and it would cost another ~15 MB. Measure
before building either (#294).

Still owed on Windows: alt-tab during the first 1.8 s (on WinUI `OnSleep` fires on window
DEACTIVATION, #507 — confirm it does not leave the session spare-less), and that the mobile
`dropSpareChat("sleep")` (guarded `#if !WINDOWS`) is genuinely not running there.

⚠ A build whose log has NO `chat warm` line at all has `CHAT_SPARE_ENABLED = false`. That is
the only silent exit in the whole path; every other refusal stamps a `why=`.

### How to read the lines

| line | means |
|---|---|
| `chat warm start` | a spare is loading |
| `chat warm onload t=<ms>` | its shell booted — this is the cost paid OFF the critical path |
| `chat warm refused why=<word>` | no spare was made. `background` while backgrounded is normal and re-arms |
| `chat warm drop why=<word>` | a spare was thrown away (a theme flip, a language pick, sleep, a refused tap) |
| `chat attach spare=1 tap=<ms>` | the open rode the spare. **`tap=` is tap → attach** |
| `chat attach spare=0 why=<word>` | the open took today's path, and `why` says which guard refused |
| `chat batch n=<rows> json=<chars> t=<ms>` | the whole history crossed once. `t=` is the BUILD, and it over-measures on purpose |
| `chat-shell … batch=1` | the shell rendered from the batch. `batch=0` means the old per-row path |

⚠ **An attach that THROWS leaves TWO lines for ONE open** — `spare=1 tap=…` then
`spare=0 why=attach`. Read the pair as one refused open, not two.

⚠ **No `chat warm` lines at all** means `CHAT_SPARE_ENABLED` is `false`, not that a trigger broke.

---

## §4 · The walk

Open `docs/walk-artifact-session-p.html` in a browser — P / F / N per row, one copyable block
at the end. The rows below are the same list, for the record.

### The pre-warm

| # | row | expect |
|---|---|---|
| A1 | Open a conversation from the chats list, twice in a row | Both open. The second is the interesting one: it should feel immediate |
| A2 | Close a chat, wait a second, open ANOTHER one | `spare=1`. This is trigger A |
| A3 | Cold start → wait on the chats list → open a chat | `spare=1`. This is trigger B |
| A4 | Open a chat within ~300 ms of closing one (fast tapping) | `spare=0 why=warming` and the chat still opens normally |
| A5 | Flip the OS theme, then open a chat | The conversation is in the NEW theme. `warm drop why=theme` in the log |
| A6 | Account → Language → pick another → open a chat | The conversation is in the new language |
| A7 | **Account → Chat appearance → change the TEXT SIZE → back → open a chat** | The new size, on the FIRST open. This was a real defect (r2) |
| A8 | Same, but change the pattern or the ground | Same answer |
| A9 | Background the app for a minute, return, open a chat | Opens normally. On mobile the spare was dropped on sleep |
| A10 | Desktop: narrow the window, wait, widen it, open a chat | Opens in the right column, no resize flash |
| A11 | Desktop: lock the app (or wait for the idle lock), unlock, open a chat | Opens normally |
| A12 | Open a chat, then open a SECOND one straight from the first | Both open. No conversation is ever invisible |

### The batch transport

| # | row | expect |
|---|---|---|
| B1 | Open a conversation with a long history | It paints ONCE. No fill-in, no flicker. `batch n=` says how many rows crossed |
| B2 | Open a conversation with exactly ONE message | The message is there. (A one-token slip opened these EMPTY — r10) |
| B3 | Open a conversation with NO messages | The secure notice, no spinner left behind |
| B4 | **Open a conversation whose first row is a contact request** | The whole history is there (r11 — this one opened empty) |
| B5 | Scroll up → "Show older messages" | The older slice lands and **your reading position holds** — no jump to the bottom |
| B6 | A conversation with reactions | Every pill is on the right message |
| B7 | A GROUP with reactions and unread messages | Same, and the unread divider is where you left off |
| B8 | Delete every message in a chat | It empties immediately |
| B9 | A bot: switch channels | The channel's history paints once |
| B10 | Receive a message WHILE a chat is opening | It appears. It is not swallowed by the load (r5) |
| B11 | A conversation with avatars on many rows | Avatars render; `json=` is not enormous (they are interned once) |

### Regression

| # | row | expect |
|---|---|---|
| C1 | Send a message | Normal, ticks normal |
| C2 | Receive one in an open chat | Appears live |
| C3 | A payment card, a file card, an app invite | All render |
| C4 | The group leave that broke last session (#797) | Still leaves cleanly |
| C5 | The three form pages (add contact, add app, create) | Still present at onload (#766) |

---

## §5 · If something is wrong

- **A conversation opened blank** → the pair of `attach` lines and the `batch` line for that
  open. The `n=` says whether the history crossed.
- **A conversation is one pick behind** (theme, language, size) → which pick, and whether a
  `warm drop why=` line is near it.
- **The chats list got janky** → §3 row 4. That number decides whether the warm stays where
  it is.
- **A tap did nothing** → the two `attach` lines for it. `why=attach` means the attach threw
  and the fallback ran; anything else is a refusal that should still have opened the chat.

---

## §6 · Commit

`docs/commit-message-session-p.txt`. New files to `git add`:

```
docs/f5-checklist-session-p.md
docs/walk-artifact-session-p.html
docs/commit-message-session-p.txt
docs/handoff-2026-09-06.md
docs/opus-review-brief-session-p.md
docs/opus-review-verdict-session-p.md
docs/next-session-prompt.md
```

`docs/handoff-2026-09-05e.md` and `docs/f5-checklist-session-o.md` move to `docs/archive/`
(git shows renames). Never `git add -A` — CRLF churn on ~116 files.
