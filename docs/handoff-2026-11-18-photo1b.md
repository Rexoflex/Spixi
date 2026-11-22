# Handoff 2026-11-18 photo1b — the Chat shell batch: the older-page insert, the lighter photo tile and voice wave, the chat backgrounds (walk owed on Windows + Android)

Read this FIRST, then DECISIONS #1755–#1767. Number block of this session: DECISIONS #1755–#1774 (used: #1755–#1767;
#1768–#1774 stay empty) · lessons L241–L246 (all used) · packets P71–P76 (all used). Lead:
Claude Opus (#1612 / #1640). The main chat writes the next prompt.

## 0 · State
- Branch: `work/photo1b` · base: `redesign/frontend` @ `55feaddc`, merged with `redesign/frontend` @ `14ae57f` ("Merge pull
  request #16 from Rexoflex/work/photo1a") on 2026-11-18 (no rebase; 7 conflicts of the "both sides appended" kind,
  resolved: photo1a's flag reads and line first, `readPhoto1b();` last) (the base did not move again before the push: `14ae57f` at 2026-11-21 23:50) · delivery by #1546: the session pushed the
  branch; Damir opens the pull request from the compare link in the status doc · merge = Damir (a merge commit, #1505).
- CI (`redesign-ci`): runs when Damir opens the pull request.
- Smoke / CSH on the merged tree: `BASELINE OK — 6727 pass / the 2 KNOWN` on `9a0dea4` (= 6660 + 67; 2026-11-22, `TZ=America/Los_Angeles`, jsdom 29.1.1; 6726 on `e2f0857` before the round-4 pin case) · CSH 775 (= 766 + 9).
- Review: CLEAN at round 5 (MAJOR 3 → 0 → 0 → 0 → 0; six NOTEs recorded with fix directions) — `docs/review-brief-photo1b.md` § 5.
- ⚠ C# UNCOMPILED: `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (one line), `Spixi/Utils/SpixiFlags.cs` (compiles in csh). CI
  compiles Windows; Android / iOS / Mac in Damir's builds.
- Definition of done: no `docs/release-readiness.md` row names these items; no row changed.

## 1 · What this session did
| Item | Result | Evidence | Switch (cap) | MC item |
|---|---|---|---|---|
| HV-1 | an older page inserts only its rows (full render otherwise; render-context audit) | #1755, P71, pin `a-insert` | `HistoryInsertOnly` (`olderInsert`) | `n-20261118-hv1-history-insert-new-rows` |
| HV-3 | the anchor at `addMessages` and again at `messagesDone`, the fix in one task | #1756, P72, pin `b-anchor` | `HistoryAnchorOneTask` (`olderAnchor1`) | `n-20261118-hv3-history-anchor-one-task` |
| HV-4 | the fade pass from the band (binary search) | #1757, P73, pin `c-fade` | `FadeFromBand` (`fadeBand`) | `n-20261118-hv4-fade-pass-from-band` |
| HV-0 / PO-0 (shell) | four developer lines | #1758, pin `d-lines` | — (dev lines) | `n-20261118-hv0-history-log-lines`, `n-20261117-po0-open-log-lines` (note) |
| HV-5 | NOT here: C# (`onLoadMore`), spec in § 4 | #1759 | — | `n-20261118-hv5-history-first-page-50` (note) |
| PO-4 | the lighter photo tile | #1760, P74, pin `e-tile` | `PhotoTileLite` (`photoTileLite`) | `n-20261117-po4-lighter-photo-tile` |
| PO-6 (shell) | fewer wave writes; one element NOT built (reason) | #1761, P75, pin `f-voice` | `VoiceWaveLite` (`voiceWaveLite`) | `n-20261117-po6-voice-waveform-once` (note) |
| #1644 | the chat-background values; dark Mist `#0C0E10` / `#272B2D` / `#151819`; Aurora ring 3.024 | #1762, #1763 🟡, pin `g-tokens`, `docs/photo1b-tokens.md` | — (values) | `n-20261116-win-chat-bg-saturation` |
| flags | five prefs, one line, five cap words | #1764, P76, csh `Photo1bFlagsTests` | — | — |

Harness (headless Chromium, CPU × 4, 412 × 915; the shared 2-core cloud machine — indicative, the phone decides):
| Case | ON (the five switches) | OFF | Note |
|---|---|---|---|
| History, text pages (the three insert frames, ms; two runs) | 189 / 81 / 88 · 176 / 93 / 108 | 220 / 273 / 490 · 220 / 267 / 408 | HV-1 + HV-3 + HV-4 |
| History, the photo page (ms; two runs) | 143 · 268 | 246 · 333 | |
| PO-4 photo tile (nodes; open min / p25 ms) | 434 · 141 / 177 | 674 · 174 / 187 | the median inside the noise (L245) |
| PO-6 voice row (repaint ms) | 3.1 | 6.7 | the open does not move |
Renders (before / after, light and dark, desktop and 412 × 915; the three dark Mist versions; the photo tile and the voice
row): the Artifact "Spixi Chat shell batch — renders" (https://claude.ai/artifact/1zC2QDBhBsNXR37HBrKX5a).

## 2 · Walk
Sheet: `docs/walk-photo1b.md` = the Artifact "Spixi Chat shell batch — walk rows" (https://claude.ai/artifact/PPEvKkNPcw8CiEmhVUeqeY;
Windows W-BUILD, W-1 … W-7; Android A-BUILD, A-1 … A-7). The BUILD rows name `[FLAGS] photo1b tilelite=1 voicelite=1
olderinsert=1 olderanchor=1 fadeband=1`, which only this build writes. W-2 / A-2 send a renamed text file to a Seed contact
(copy the data folder first, L149).

## 3 · The operator block (the phone; only when the main chat gives Damir the step)
Not run by this session: the main chat gives Damir the step (the main chat's note of 14:05; ★ never two device jobs at
once — `fixb3`, `photo1a` and this batch share the phone). `photo1a` is merged into the base AND into this branch, so the
gate of step 2 is met. The steps, ONE at a time (PowerShell, the PC clone `C:\Users\Damir\Claude\Projects\Spixi Rework Of
Frontend\Spixi`; each step's expected result in brackets; a step that fails twice = stop):
1. Ask Mission Control (the main chat) that no other session's operator block runs. Then the two read-only readings of
   #1628 (the line in `claude/session-coldstart-status.md`).
2. Build A (`redesign/frontend`): `git fetch origin` · `git switch --detach origin/redesign/frontend` · wipe `Spixi\obj` and
   `Spixi\bin` · `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true` [Build succeeded] ·
   copy the signed APK to `Claude outputs\adbwalk\_scratch\photo1b\A\com.ixilabs.spixi.dev-Signed.apk`.
3. Build B (`work/photo1b`): `git switch work/photo1b` · `git pull --ff-only` · wipe `obj` / `bin` · the same build [Build
   succeeded] · copy to `…\_scratch\photo1b\B\com.ixilabs.spixi.dev-Signed.apk`.
4. Order A → B → A, each: `adb install -r <APK>` [Success; the APK size on the phone = the file's] · then ONE line:
   `powershell -ExecutionPolicy Bypass -File scripts\device\adb-walk.ps1 -Steps chat-intent,scroll-files,scroll-voice,scroll-photos,open-seed,history,mem-home,mem-end,mem-photos -SeedIndex 0,50,51,52,54,55 -Repeats 5`
   [`RESULT: OK`]. NEVER `adb uninstall`, never `pm clear`. (`mem-photos` runs last by the script's rule; no `-Flags` with
   `open-seed`.)
5. Install B and leave it on the phone (Damir walks the Android rows on it); `git switch work/photo1b` stays for the Windows
   walk.
The numbers doc `claude/device-numbers-<date>-photo1b.md` (per chat `present ms=` and `paint=` A / B / A; per history page
the largest frame and the insert time — the new `[P1] shell older …` lines exist only in build B; memory rows; by #1530 which
rows differ; against 120 ms, 150 ms and 100 ms) is written by whoever reads the run folders (this session's steps, the main
chat's choice).

## 4 · What the later C# batch of "History 1" may rely on and must do (`fixb4`, #1752)
| Part | What C# does | What the page already does (this batch) |
|---|---|---|
| P-28 — the read and the build of an older page off the UI thread | `onLoadMore` (`SingleChatPage.xaml.cs` ~`:1084`) starts the read + build on a background task (as the open does, `Task.Run`), with a C# busy guard (no second request while one runs) and the prepend binding carried to that task (`requestPrepend` binds to the calling thread today); the pushes `addMessages(json,"prepend")` + `messagesDone(show_more)` are marshalled to the main thread inside `lock (messages)` as today | accepts the page at ANY time: the anchor is taken at `addMessages` AND re-taken at `messagesDone` while the page is not painted (HV-3, cap `olderAnchor1`); a 250 ms gap between the two pushes is safe (b-anchor case 3); the insert works for any page size (HV-1) |
| HV-5 — the first page holds 50 rows | drop the step over 100 in `onLoadMore` (`if (messagesToShow == 100) messagesToShow += Config.messagesToLoad;`) only after checking the D-18 rule (Core `Friend.cs:909-913`, #354): the read asks for `want + 1` (`SCP` ~`:5357`), so the exact-100 cache test may no longer bite — prove it on the phone with the `read` line | nothing: the page takes 50 or 100 alike |
| HV-0 C# lines (developer builds) | `[P1] chat loadmore in` at the start of `onLoadMore`; `[P1] chat older read passes= window= ms= flush=` around the read; `[P1] chat older push n= json= build=` before the pushes (the twin of `[CDPERF] chat batch`) — fixed words + integers | the shell lines exist: `[P1] shell older insert rows= mode= build= swap= fix= fade= ms=` and `[P1] shell older frames n= max=` per page (`data-p1` only) |
| The walk step `history` with a seed index | the pattern of `open-seed` (photo1a): `-HistorySeed <k>` so that the step runs on Seed 56 (the photo chat's one older page) | — |
| The parser | rows per page from the two shell lines (largest frame per page = `frames max=`; the insert time = `ms=`; `mode=`) | — |

## 5 · Open points (no question blocks this batch)
| For | Point | Blocks |
|---|---|---|
| main chat | #1763 🟡 the floors that moved by the picks of #1644 (notice card on dark Mist 1.13, the dark pattern visibility 0.77–0.86 × A, Iris ΔL*) — confirm or ask Damir at the walk (W-6 / A-6) | nothing |
| main chat | #1762: the ruling's "today 1.35 : 1" was 1.198 : 1 (WCAG); the bubble was lifted to 1.35 as the ruling's number says | nothing |
| Damir (phone) | PO-4's harness gain is inside the noise of the shared machine (min / p25 show it, the median not) — the A / B / A sitting decides (#1534); PO-6's open does not move (only its repaints) | nothing |
| a later batch | the chat.html size ceiling (995 KB) has 1.8 KB left; about 10–15 KB of this batch are comments that ship (the JS lean strip is parked) | nothing |
| audit phase | a group row's avatar ARGUMENT becomes an `img src` unvetted (`recAvatar` / `resolveAvatar`), in the base `55feaddc` (S r1 note; not checked at `0e85a4b8`) | nothing |

## 6 · Lessons (also appended to docs/lessons.md)
L241 (an insert that must equal the full render needs an audit of every build-time read, each term pinned) · L242 (a clock
fixture inside one local day at every UTC offset) · L243 (sub-agents cannot read project docs: copy the values into a
local file) · L244 (an optional regex group accepts the deletion: one pin must require the line) · L245 (a harness median on
the shared machine can hide a 15–20 % gain) · L246 (a break loop with a relative `cd` ran its mutation in the real tree when
the `cd` failed: `set -e` and absolute paths; `git diff` against the reviewed commit caught it).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/photo1b
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: wipe `Spixi\obj` + `Spixi\bin`, then **F5 in Visual Studio, never `dotnet build`** (#663).
- Android: wipe `Spixi/obj` + `Spixi/bin` (the html changed, #449), then the Release dev build.
After the walk: paste the results in the main chat. Merge on GitHub (base `Rexoflex/Spixi` → `redesign/frontend`).
