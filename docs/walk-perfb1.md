# Walk perfb1 — Speed batch 1a: the measuring plan and the look rows

Added 2026-11-13 (Session Speed batch 1a; DECISIONS #1560–#1573; packets P38–P42). Platforms here: **Android (A, the
Galaxy A52s) · Windows (W)**. The iPhone and Mac rows are owed to the Apple phase (#1515) — § 6. The copy for marking
is the Artifact **"Spixi Speed 1a Walk"**. This sheet has two kinds of row: **script** rows (a number or a log line;
the adb walk passes them, #1514) and **Damir** rows (a look or a feel). The main chat runs the sitting with Damir and
writes the WALK row; this session measured nothing.

## 1 · The four switches

The state that ran is ONE log line, written once at every start (Account › Developer › open the log, or
`adb logcat -d | findstr /C:"[FLAGS] warmidle"`):
`[FLAGS] warmidle=<0|1> sparerearm=<0|1> sparekeep=<0|1> noemptydetail=<0|1>` — the delivery state is
`[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1`.

| Letter | Switch (packet) | Dev name | Default | What ON does | OFF = the old path |
|---|---|---|---|---|---|
| W | `WarmOnIdle` — P-12 (P38) | `warmidle` | 1 | Android: a hidden page (the Account warm, the spare chat page) starts its boot only after 1.2 s without a touch, and at least 0.9 s after the other hidden page | the fixed timers (900 ms, 1800 ms, at once after a chat close) |
| R | `SpareRearm` — P-11 switch 1 (P39) | `sparerearm` | 1 | after the spare chat page was dropped (sleep, theme, language, reload) it is prepared again: 1.8 s after a return to the app | no spare page until the next chat close |
| K | `SpareKeepShortSleep` — P-11 switch 2 (P40) | `sparekeep` | 0 (opt-in) | Android, app lock off: the spare chat page is kept for up to 3 minutes in the background and checked at the return | the spare page is dropped when the app leaves the screen |
| E | `PhoneNoEmptyDetail` — P-13 (P41) | `noemptydetail` | 1 | a phone does not build the empty right pane at start | the pane's page boots at every start |

**⚠ How to set a switch — OPEN QUESTION (#1569).** The C# takes `ixian:devflash:<dev name>:<0|1>` (Developer mode
on; the change acts at the next start; a stored value does nothing without Developer mode). But the Developer screen
has NO rows for these four switches: its rows are fixed in the shell (`src/shells/dev.html`), and a shell change was
outside this batch. Until Damir rules on #1569, only **plan B** below can run. Plan A needs the rows (or another way
to send the verb).

## 2 · Set-up (both plans)

- **(0) ★ COPY YOUR DATA FIRST (L149)** before any row that removes a contact or the seed. Android: Account › Backup.
  Windows: close Spixi, then
  `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" "$env:USERPROFILE\Documents\Spixi-copy-perfb1"`.
- **(1) The build.** Android: wipe `Spixi\obj` + `Spixi\bin`, then the Release dev build with
  `-p:SpixiDevCoexist=true` (the build of the adb walk, `docs/handoff-2026-11-13-tooling.md` § 1). **This is the FIRST
  Android compile of this C# — a build error is this batch's bug (§ 7 lists the files).** Windows: close Visual
  Studio, wipe `Spixi\bin` + `Spixi\obj`, then F5 (never `dotnet build`, #663).
- **(2) The phone state of the adb walk:** the TEST account, app lock OFF, Developer mode ON, light theme, battery
  above 50 %, "Do not disturb" on.
- **(3) The seed.** Account › About › **Remove the seed, then Seed "heavy"** — never tap Seed on top of an old seed.
  Reason (a hypothesis from the code, not proven on the phone, #1571): after an app restart a second "heavy" seed can
  add the old messages of Seed 01–10 AGAIN — Core checks a new message id only against the last 100 messages it holds
  in memory (`Ixian-Core/Streaming/Friends/Friend.cs:899`, `FriendList.cs:258`), and the heavy chats hold 1000. The
  phone got a second heavy seed on 2026-11-13 and measured 1.5–3× slower after it
  (`claude/device-numbers-2026-11-13.md` § 4–5). Remove + Seed gives the clean state of 2026-11-12. The status line
  must name `3 image chats (Seed 51-53)`.
  The image chats are the seed indexes **50, 51, 52** = "Seed 51 Petra Hočevar" (12 photos), "Seed 52 Gregor Zorman"
  (10 photos; **the album: 6 received photos in one group**), "Seed 53 Alenka Bregar" (24 photos). They sit BELOW the
  fifty text chats (their messages carry a fixed date, 2026-01-01, on every seed), so row 1 of the chat list is a text seed chat as before.
- **(4)** The step `scroll-image` of the adb walk needs the local key `"imageChatAddress"` in
  `Claude outputs\adbwalk\walk.local.json` (`docs/handoff-2026-11-13-walksteps2.md` § 1): the address of ONE image
  chat = `addressFor(i)` of `Spixi/Utils/SDevSeed.cs` with **i = 51 ("Seed 52", the album) or i = 52 ("Seed 53", 24
  photos)**, found the same way as the other seed addresses of that file. The addresses do not change with a new seed.
- **(5)** One `-Calibrate` run and a look at `cal-01-home.png` before the first full run (L179).

## 3 · The runs (adb walk, 5 repeats; the same day, the same phone state)

Two runs agree when, for every row, the medians differ by less than 20 %, or by at most 17 ms, or by at most 1 for a
count (#1530). One run pair shows a change of about 20 % or more, not a change of 5 %. Rows with n = 1 are single
samples. **The before-number of every row is run 0 of the SAME sitting (L182):** the phone measured 1.5–3× slower on
2026-11-13 than on 2026-11-12 with one install, so the numbers of another day are context, never a baseline. Keep
the phone cool and off the charger between runs, and note the battery temperature of each run.

The walk lines (`docs/handoff-2026-11-13-walksteps2.md` § 1): the full run (about 36 minutes) for runs 0 and 1; for
run 2 and run 3 the short line `… adb-walk.ps1 -Steps resume-now,resume-3s -Repeats 5` (add the steps of the row
that got worse).

**Plan A — one build, the switches set by hand (needs #1569):**

| Run | State W R K E | Purpose |
|---|---|---|
| 0 | 0 0 0 0 | the old paths: the before-numbers on THIS build |
| 1 | 1 1 0 1 | the delivery defaults |
| 2 | 1 1 1 1 | switch 2 on top of the defaults |
| 3 (only if a row of run 1 is worse than run 0) | one switch back to 0 | find the switch that made it worse |

Runs 0 and 1 differ in three switches at once. That is enough because each switch has its own rows (§ 4): R and K
move only the resume rows, E moves only the memory and cold-start rows, W moves only the rows around a touch. Run 3
exists for the case that a shared row gets worse.

**Plan B — no way to set a switch yet (works today):** run 0 = the adb walk on a build of `redesign/frontend`
BEFORE this batch; run 1 = the adb walk on the build of `work/perfb1` (the defaults). Two builds and two installs on
the same day. Switch 2 (K) cannot be measured in plan B, and a worse row cannot be traced to one switch: in plan B
the rows P11b-S1, P11b-S2 and A-2 are N/A, and run 3 does not exist.

## 4 · Script rows (the adb walk passes them; `summary.md` step · metric)

| ID | Switch | Runs | Rows of `summary.md` | Pass when |
|---|---|---|---|---|
| **BUILD** | all | run 1 | the log line of § 1 | `[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1` is in the log after a start (only this build writes it) |
| P11a-S1 | R | 0 → 1 | `resume-3s` (a tap 3 s after the return, #1550) · `spare used`, `present ms=` | run 1: `spare used` 5 of 5, and `present ms=` agrees (#1530) with `chat-tap` · `present ms=` of the same run (the open on a spare). Run 0: `spare used` 0 of 5 (2026-11-13: 0 of 10, 564–625 ms). The budget of #1517 (≤ 160 ms) is read on a cool phone |
| P11a-S2 | R | 0 → 1 | `resume-now` (a tap at once) and `resume` (a tap after 2 s) · `present ms=`, `spare used` | no bar for R alone: `resume-now` stays cold (#1536 says so); `resume` (2 s) can go either way, because the spare page is ready about 2.0–2.2 s after the return. Record the numbers; run 1 not worse than run 0 (#1530) |
| P11a-S3 | R | run 1 | `resume-long` (5 minutes; n = 1) · `spare used` | 1 when the tap comes 3 s or more after the return |
| P11a-S4 | R, K | 0 → 1, 1 → 2 | `mem-home` · `app + renderer PSS` | not above 390000 kB (#1517) |
| P11b-S1 | K | 1 → 2 | `resume-now` (a tap at once) · `spare used`, `present ms=` | run 2: `spare used` 5 of 5 and `present ms=` agrees (#1530) with `chat-tap` · `present ms=`; run 1 is the cold number. ⚠ The proof of the kept spare needs its answer first (at most 1 s): if the walk taps faster than the answer, that open is cold and `spare used` is 0 for it — then read `resume` (2 s) and `resume-3s` of run 2 as well |
| P11b-S2 | K | 1 → 2 | not a walk row — one reading by hand, 60 s after HOME: `adb shell dumpsys meminfo com.ixilabs.spixi.dev` (the `WebViews:` line) and the renderer PID | record the cost: run 2 holds one WebView more in the background (expected about +15 MB renderer PSS, #802). No bar: Damir weighs it against P11b-S1 |
| P12-S1 | W | 0 → 1 | `chat-tap` · `present ms=`, `spare used`, `frames drop`, `frames max gap` | run 1 not worse than run 0 (#1530). ⚠ The known trade of P-12: with W on the spare page is prepared about 1.2 s after the close tap, so a tap that follows a close faster than about 1.5 s opens cold (`spare used` 0, about 290 ms). If `spare used` falls here, read the time between the close and the next tap in the log before you call it a fail; the judgement is Damir's (row A-4) |
| P12-S2 | W | 0 → 1 | `scroll` · `scroll drops (sum)`, `scroll max gap (max)`, `long tasks` | run 1 not worse than run 0 (#1530); no frame gap above 50 ms (#1517) |
| P12-S3 | W | run 1 | the log, by hand or by a later walk step: every `[CDPERF] chat warm start` line against the touches before it | no `chat warm start` inside 1.2 s after a swipe or a tap of the walk. (The walk has no step "scroll the chat list right after a cold start / after a chat close" — proposal for session `walksteps2`; until then row A-3 is Damir's) |
| P13-S1 | E | 0 → 1 | `mem-home` · the `WebViews:` count in `meminfo-home-app.txt` | one less in run 1. **This is the deciding row for E** |
| P13-S2 | E | 0 → 1 | `mem-home` · `renderer PSS` (n = 1) | run 1 at least 4000 kB lower. ⚠ One sample moves by about 10 MB between two runs of ONE build (98 MB at 18:23 and 88 MB at 19:03 on 2026-11-12), so this row alone decides nothing: take 3 readings per state if the number is wanted |
| P13-S3 | E | 0 → 1 | `coldstart` · `am TotalTime`, `start -> first shell boot`, `start -> boot hold released` | not worse (#1530). Budget of `am TotalTime`: ≤ 1800 ms (#1517; 2199–2237 on 2026-11-12, 3615–3750 on 2026-11-13 / 14 — the cause of that move is open, `claude/device-numbers-2026-11-13.md` § 5). Note: the empty-detail page prints no `[P1] shell boot` line (it has no perf script), so `first shell boot` cannot show this change by itself |
| ALL-S1 | all | 0 → 1 | `chat-intent`, `chatinfo`, `tab-apps`, `tab-wallet`, `tab-account`, `history`, `network`, `mem-end`, `mem-trim` · every metric | not worse (#1530). `tab-account`: rep 1 builds the Account page and reps 2–5 show the parked one (`claude/device-numbers-2026-11-13.md` § 3) — with W on, the parked Account page is prepared later after a touch, so read rep 1 apart |
| IMG-S1 | seed | run 1 | `scroll-image` (`… adb-walk.ps1 -Steps scroll-image`, set-up (4)) | the step gives numbers, not "no data" (the before-number for the image budget of #1517: no frame gap above 50 ms). No pass bar from this batch |

**Which rows judge which switch (the keep rule, #1513 (3)):** W — P12-S1…S3 and A-3, A-4 · R — P11a-S1…S4 and A-1 ·
K — P11b-S1, P11b-S2 and A-2 · E — P13-S1…S3 and A-5. A switch whose rows show no gain is removed (its old path is
there; the removal is the deletion of the switch's hunks and pins — the packets name them).

## 5 · Damir's rows (a look or a feel)

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| **Android** | | | | | |
| A-1 | A | State R = 1. 1) Open Spixi, stay on the chat list. 2) Go HOME; wait 10 minutes. 3) Return to Spixi; wait 3 s. 4) Open a chat. 5) Repeat 2–4 once with a tap at once. | 4 and 5: the chat opens with its messages. **Never a blank chat.** | | P-11 switch 1 |
| A-2 | A | Needs #1569. State K = 1 (`sparekeep=1` in the log). 1) Stay on the chat list. 2) Go HOME; wait 1 minute. 3) Return and tap a chat at once. 4) Repeat with a wait of 5 minutes. | 3 and 4: the chat opens with its messages. **Never a blank chat.** | | P-11 switch 2 |
| A-3 | A | State W = 1. 1) Force-stop Spixi; start it. 2) As soon as the chat list shows, scroll it up and down for 3 s. 3) Open a chat, go back, scroll the list at once. | No freeze and no visible stutter in 2 and in 3. | | P-12 |
| A-4 | A | State W = 1. 1) Open a chat. 2) Go back and open the same chat again inside 1 second. 3) Do it 5 times. | Every open shows the chat correctly. It can be the slower open (about 0.3 s). Judge: is that acceptable for a fast re-open? | | P-12, the known trade (#1561) |
| A-5 | A | **Copy the data folder first (L149).** State E = 1. 1) Account › Appearance: switch dark, then light. 2) Change the language and change it back. 3) Open "Seed 50", chat info › Remove contact. | No crash; home, chats and Account look right after each step; after 3 the app is on the chat list. | | P-13: every path that touched the empty pane |
| A-6 | A | After set-up (3). 1) Scroll the chat list to the end. 2) Open "Seed 52 Gregor Zorman". 3) Open "Seed 53 Alenka Bregar" and scroll to older messages. | 1: Seed 51–53 sit BELOW the fifty text seed chats (real chats older than 2026-01-01 can sit below them); the first rows are text chats. 2: photos show as tiles; six photos show as ONE album. 3: photos appear while you scroll. | | the dev image seed |
| A-7 | A | **Copy the data folder first (L149).** 1) Account › About › Remove the seed. 2) Open Downloads. | 1: Seed 01–53 are gone. 2: no seed photo is listed. | | the unseed |
| **Windows (F5)** | | | | | |
| W-BUILD | W | 1) F5. 2) Account › Developer › open the log. | The log has `[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1`. | | only this build writes it |
| W-1 | W | 1) Start with a wide window. 2) Switch the theme. 3) Change the language and change it back. 4) Make the window narrow, then wide again. | 1: the empty right pane shows as before. 2–4: it follows the theme and the language, and it is there again when the window is wide. | | P-13 changes nothing on Windows |
| W-2 | W | 1) Open a chat; open another one; close it. 2) Click another program, wait 1 minute, click Spixi. 3) Open a chat. 4) Switch the theme, then open a chat. | Every chat opens with its messages; never blank. | | P-12 and P-11 keep the Windows timers; the re-arm after a theme change |
| W-3 | W | **Copy the data folder first (L149).** 1) Account › About › Seed. 2) Open "Seed 52 Gregor Zorman". 3) Remove the seed. | 2: photo tiles and one album of six. 3: Seed 51–53 are gone. | | the dev image seed |

## 6 · Owed to the Apple phase (#1515; C# for Apple is ⚠ UNCOMPILED)

| Platform | Row |
|---|---|
| iPhone | P-13 runs the phone path there too: start, theme, language, remove a contact — no crash, one WebView less |
| iPhone | P-11 switch 1: after 60 s in the background and 3 s after the return a chat opens on a spare page. (Switch 2 is Android only: the iPhone keeps the drop at sleep) |
| iPhone, Mac | P-12 changes nothing (the gate answers 0 outside Android) — one chat open and one Account open as a check |
| Mac | P-13 changes nothing: the empty right pane shows; theme and language follow |
| Mac | P-11 switch 1 (R2-8): `OnSleep` is a window deactivation there and the sleep drop is `#if !WINDOWS`, so with `SpareRearm` ON every window activation boots one hidden chat WebView 1.8 s later (the old path: no spare until the next chat close). Not measured: keep it, or keep the re-arm off on the Mac? |
| iPhone, Mac | the dev image seed: Seed 51–53 show photos and the album (the PNG is decoded by ImageIO there) |

## 7 · ⚠ C# UNCOMPILED (the cloud cannot compile the app)

| File | First compile |
|---|---|
| `Spixi/App.xaml.cs`, `Spixi/Pages/Home/HomePage.xaml.cs`, `Spixi/Utils/SpixiContentPage.cs`, `Spixi/Pages/Dev/DevPage.xaml.cs`, `Spixi/Utils/SDevSeed.cs`, `Spixi/Pages/Settings/SettingsPage.xaml.cs` (two lines: the seed verb's failure line; the one `leaveDevMode()` call in the account wipe) | Windows: `redesign-ci` on the pull request (the Windows job) · Android: Damir's Release dev build at the sitting · iPhone, Mac: the Apple phase |
| `Spixi/Platforms/Android/MainActivity.cs` (the `DispatchTouchEvent` override) | Android only: Damir's build |
| `Spixi/Utils/SpixiFlags.cs`, `PerfB1Rules.cs`, `WarmIdleRules.cs`, `SpareRearmRules.cs`, `SpareKeepRules.cs`, `EmptyDetailRules.cs`, `SDevSeedPlan.cs` | compiled and run by the C# harness in the cloud (`CSH`); in the app with the files above |

The `#if ANDROID` arms (the idle gate, all of switch 2) are compiled by NO machine before Damir's Android build.
