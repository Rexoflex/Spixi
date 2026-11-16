# Walk sheet — perflean (Session "Speed lean": the lean-build gates P-09 and the CSS strip P-06)

File name: `docs/walk-perflean.md`. Branch: `work/perflean` (the pull request that Damir opens from the compare link).
This batch changes NO screen: with the build properties off, the package is today's package, byte for byte.
The walk is a **device sitting** (#1514): the adb walk measures a build with `SpixiLeanCss` OFF against a build with it
ON, and Damir looks at the ON build once. The main chat runs it with Damir and writes the WALK row, the
keep-or-remove decision for the property (#1513 (3), #1310 (4)) and the default.

Three properties (MSBuild, each OFF unless the build line passes it): **`SpixiLeanCss` (comments out of every
stylesheet) — the one property of this walk** · `SpixiLeanJs` (comments out of the scripts) — **PARKED: the build
stops with `Spixi lean packaging: SpixiLeanJs … is PARKED in this batch`** (Damir's ruling of 2026-11-15: the review
of the JS strip did not close) · `SpixiLeanCssFull` (NOT built: the build stops with a clear error).

## 0 · What is proven in the cloud, and what is not
| Proven (the lead's machine, 2026-11-13 / 15) | NOT proven before Damir's build |
|---|---|
| The scripts: `strip-release.mjs --out` / `--check` with every flag set · GATE 1 on each package · the pixel gate (Chromium, 412 × 915 at DPR 2.625): 50 shots × 0 px and equal CSS rules, committed tree against the lean CSS package · the parser cross-check's own CSS tokenizer on 264 sheets · the suite over the lean CSS package (GATE 2) | The MSBuild targets run in a real MAUI build for the FIRST time in Damir's Release build: the Windows command line of the `node` call, the item swap inside the real asset collection of the Android build, the `obj` path of its target framework, how the real asset pipeline copies files into the package |
| The target text, with real `dotnet msbuild` 10.0.115 on Linux in a small project that holds the same asset include (`scripts/pins-perflean/msbuild-harness/run.mjs`): every property set, stale files, the refusals, the dev-build rule, the stamp | What the device does with the lean files: the numbers below |

**The build rules of the lean switch** (each stops the build with a text that starts `Spixi lean packaging:`):
a lean switch needs the Release packaging strip (`SpixiStripHtml=true`: the default of `-c Release`, off in Debug) ·
**a lean switch needs an Android dev build (`-f net10.0-android -p:SpixiDevCoexist=true`, app id
`com.ixilabs.spixi.dev`) until the ruling of the defaults** — an iOS, Mac or Windows build (there the dev switch
does not move the app id), every build whose app id is not the dev id (pass the two switches ON THE BUILD LINE: a
dev switch in a `.csproj.user` file comes too late for the app id) and a store build (`SpixiStoreRelease`) refuse it ·
**when a lean switch changes in one `obj` folder — also back to OFF — the build stops: delete `Spixi\obj` and
`Spixi\bin`, then build again** (a lean build leaves the file `spixi-lean.stamp` in `obj`; this sheet wipes both
folders before every build, so the rule never fires here) · `SpixiLeanJs` and `SpixiLeanCssFull` are refused.
**The limits of the stamp:** it protects ONE `obj` folder. A `bin` or publish folder that is kept after `obj` is
wiped, or that two `obj` folders feed, can hold the files of an earlier build; and a lean build that fails AFTER the
strip leaves the stamp. Only GATE 1 on the deployed folder (row B6) proves a package.

## 1 · BUILD (Damir's PC, PowerShell, in the repo folder `Spixi Rework Of Frontend\Spixi`)
| # | Do | Pass when |
|---|---|---|
| B1 | Get the branch: `git fetch origin` then `git checkout work/perflean` | `git log -1` shows the newest commit of the pull request |
| B2 | **OFF build.** Wipe `Spixi\obj` and `Spixi\bin` (#449). Then: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -tl:off -p:SpixiDevCoexist=true` (`-tl:off` = the classic build log: the terminal logger hides the two proof lines) | The build log holds `Spixi: Release packaging strip applied` and does NOT hold `LEAN Release packaging applied` |
| B3 | Keep the OFF package: make the folder `Claude outputs\perflean\off` and copy the signed APK (`Spixi\bin\Release\net10.0-android\com.ixilabs.spixi.dev-Signed.apk`) into it. Keep the file name (the adb walk installs only a file whose name starts with `com.ixilabs.spixi.dev`) | The file is there |
| B4 | **ON build.** Wipe `Spixi\obj` and `Spixi\bin` again. Then: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -tl:off -p:SpixiDevCoexist=true -p:SpixiLeanCss=true` | The build log holds `Spixi: LEAN Release packaging applied (SpixiLeanCss=true, SpixiLeanJs=false` and `21 asset(s) swapped`. **This line exists only in a lean build** (the BUILD proof) |
| B5 | Keep the ON package: copy the signed APK into `Claude outputs\perflean\on` (same file name) | The file is there |
| B6 | **GATE 1 on what each build packed.** An APK is a zip. For each of the two: `Copy-Item <apk> x.zip` · `Expand-Archive x.zip <folder> -Force` · then `node scripts\strip-release.mjs --check "<folder>\assets\html"` for the OFF build and `node scripts\strip-release.mjs --check "<folder>\assets\html" --lean-css` for the ON build | OFF: the last line starts `strip-release --check: GATE 1 OK — packaged ≡ strip(committed) for 1 allowlisted file(s)`. ON: `GATE 1 OK — lean css: packaged ≡ lean(committed) for 21 file(s) in scope`. A last line that starts `strip-release --check: GATE 1 FAILED` (exit code 1) = stop; paste it and the lines under it to the main chat |
| B7 | (optional, 45 minutes, the PC needs the npm line of `CLAUDE.md` step 5) **GATE 2:** `node scripts\smoke-packaged.mjs --lean-css` | The last line starts `smoke-packaged: GATE 2 OK (lean css)`. The cloud run of this session (2026-11-15): `GATE 2 OK (lean css) — 6395 pass · 5 red by design (listed) · the 2 KNOWN` |

If B4 stops with `Spixi lean packaging: …` — read the text: it names the cause (a Debug build, `SpixiStripHtml=false`,
no `-p:SpixiDevCoexist=true`, a target framework that is not Android, an app id that is not the dev id, `SpixiLeanJs`,
`SpixiLeanCssFull`, a changed switch in a kept `obj` folder, a missing file). If the `node` call fails on Windows
with a quoting error, that is the unproven part of § 0: paste the whole error to the main chat; the OFF build still
works.

## 2 · Script rows (the adb walk, `scripts/device/adb-walk.ps1`; the main chat and Damir; #1514, #1530)
Rules: one sitting, the same day, the phone cool and in the same state for every run (L182: a number of another day
is no before-number) · the phone as the handoff of `tooling` says (TEST account, app lock off, seed "heavy", light
theme, Do not disturb on) · copy the data folder first is NOT needed (the walk changes no account data; `install -r`
keeps the data) · the order **OFF → ON → OFF** (the second OFF run shows the drift of the phone).

| # | Run (one line each; `<walk>` = `powershell -NoProfile -ExecutionPolicy Bypass -File "…\Spixi\scripts\device\adb-walk.ps1"`) | Rows of `summary.md` that judge the property | Pass bar |
|---|---|---|---|
| S1 | `<walk> -Apk "…\perflean\off\com.ixilabs.spixi.dev-Signed.apk" -Steps coldstart,mem-home,chat-intent,chat-tap,resume,mem-end -Repeats 5` (OFF, run A) | — | `RESULT: OK` |
| S2 | the same line with `…\perflean\on\…` (ON) | coldstart: `first shell boot load=` · `start -> first shell boot` · `start -> boot hold released` · `am TotalTime` | **Gain:** `first shell boot load=` lower than BOTH OFF runs by more than the #1530 band (≥ 20 %, or more than 17 ms when the two OFF runs agree within 17 ms). **No harm:** no other coldstart row higher than both OFF runs by more than the band |
| | | chat-tap / chat-intent / resume: `present ms=` · `frames drop` · `frames max gap` | chat open is not slower: every row agrees with the OFF runs by #1530, or is lower |
| | | mem-home / mem-end: `renderer PSS` · `app + renderer PSS` | not above the OFF runs (a single sample cannot show a small gain: the two runs of 2026-11-12 differ by 10 MB; this row can only show "no harm") |
| S3 | the S1 line again (OFF, run B) | the same rows | S1 and S3 agree by #1530; if they do not, the phone drifted: repeat the sitting on a cool phone |

What the walk cannot show (say it in the WALK row): a change of 5 % in one run pair (#1530) — the harness of this
session measured the first paint and the ready time of the home and chat shells (the handoff holds the table) and a
finer device reading needs more repeats in its own batch (#1517) · iPhone, Mac, Windows numbers.

## 3 · Damir's look rows (Android, the ON build of S2 still installed; 5 minutes)
The pixel gate is the proof that the lean package renders the same. The look checks that the device got that package
and that nothing is broken on a real WebView.
| # | Do | Pass when |
|---|---|---|
| D1 | Start the app. Look at Chats, then Wallet, Apps, Account | Each screen looks as before; no unstyled text, no missing icon, no blank screen |
| D2 | Open a chat with messages. Send one text | The chat opens and looks as before; the message appears |
| D3 | Open Chat info from the chat header; go back | It opens and looks as before |
| D4 | Account → Appearance: switch to the dark theme. Look at Chats, one chat, Account. Switch back to light | Every screen is correct in both themes |
| D5 | Account → Downloads, and Account → Backup (open each, go back) | Each opens and looks as before |
| D6 | Lock: turn the app lock on, send the app to the background, open it, unlock; turn the lock off again | The lock screen looks as before and unlocks |
| D7 | Account → About: read the version line; open Licences | Both open; the text is there |
| D8 | Developer log (dev build): no line `Unknown localization key` that the OFF build does not also show | Same set of lines as the OFF build |

## 4 · Windows, iPhone, Mac
- **No lean package exists for them in this batch.** Until the ruling of the lean defaults the build refuses a lean
  switch for every target framework that is not Android (`Spixi lean packaging: a lean package is allowed only for
  Android …`): on iOS, Mac and Windows `SpixiDevCoexist=true` does not move the app id, so a lean package there
  would carry the production id (review round 3).
- With the switches off these platforms build as today: nothing to walk.
- The files of a lean package are the same on every platform (the strip is platform-neutral); the pixel gate and
  GATE 1 are the proof. The first lean build for iPhone, Mac and Windows is owed after the ruling of the defaults,
  when the main chat removes or changes the Android-dev-build rule (three `<Error>` lines in `SpixiLeanGuard`).
- Do not set the properties as environment variables: they stay set for every later build from that console.

## 5 · Result (the main chat fills it)
`WALK #<n>: <p> P · <f> F · <n/a> N/A` — and for `SpixiLeanCss`: keep (default on / stays off) or remove.
