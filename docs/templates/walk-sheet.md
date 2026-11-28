# Walk sheet — template (spec)

**The older form (an HTML sheet; Markdown sheets replaced it from 2026-10, the card page from 2026-11-27; the next section wins):** a walk sheet is ONE self-contained HTML file, `docs/walk-artifact-<batch>[-<platforms>].html`. **Copy the newest
sheet as the model** — today `docs/walk-artifact-1094-win-android.html` (Windows + Android) or
`docs/walk-artifact-1086.html` (Mac + iPhone, the office). Change the header, the `ROWS` array AND every hard-coded
batch value outside them: the `<title>`, the `Walk #…` label in the Copy-results text, the `localStorage` key (a new
key per sheet, or old marks leak in), and the expected smoke count in "Before you start". Then search the file for the
old batch number — 0 hits.
Publish it as an Artifact when Damir walks away from the PC.

## The page and the walk rules up to 2026-11-28 (they win over the older spec of this file where they differ)
Today a walk sheet is a Markdown file `docs/walk-<batch>.md` with the same rows as its page (an Artifact); the HTML spec
below is the older form. The model: `docs/walk-train2.md` and its page "Spixi walk — train 2" (the card format Damir
asked for on 2026-11-27, `claude/talk-rulings-2026-11-27-c.md`; Ctrl+F5 of 2026-11-24, item `n-20261124-walk-ctrlf5-rule` and three walk lessons of 2026-11-28, #1976, #1977).
- **One card per row, no tables.** Each card has numbered steps, a line "You should see: …" under EACH step, a Copy
  button for each command, Pass / Fail / N/A, a note, and the page has "Copy results".
- **Windows rows start Spixi with Ctrl+F5** (Start Without Debugging; Visual Studio still builds, never `dotnet build`,
  #663). F5 only when a row needs the debugger. An F5 end with `0xC000001D` or `ExecutionEngineException` is run again
  with Ctrl+F5 before it is logged as an app fault (#1844 (1), #1904).
- **`adb install` does not start the app.** The card after an install says "Open Spixi on the phone" (#1977 (0), T-4).
- **A log extract that a walk needs goes to a FILE**, never the clipboard: the command writes it under
  `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Claude outputs\_transfer\` and prints its line count, and
  the card asks for that count (#1976: two notes held terminal text in place of the lines).
- **The dev seed button is pressed ONCE.** A seed run is slow and shows no progress; the card says "press it once and
  wait" and what shows when the run is done (#1977 (2): two presses gave three runs at once).
- ⚠ The model sheet predates three of these rules: its T-4 says "Spixi starts" after `adb install`, Q2-0 / Q2-W7 /
  Q2-S3 copy the log extract to the clipboard, and Q2-S1 does not say "press it once". Fix them in your copy.

## Structure (keep it)
- Title `Walk #<batch> — <platforms>`, one-line sub: what this walk checks.
- **Before you start** (ordered list): pull / apply → FULL pipeline (bundle BEFORE shells) → smoke, expect
  `BASELINE OK — <n> / the 2 KNOWN (#136 · B3)` = "your last count + this round's new checks" → wipe `Spixi\obj` +
  `Spixi\bin` if C# changed — and on iPhone / Mac / Android also when the html changed (incremental builds do not repackage
  Raw html, #320/#449) → the build commands per platform (Windows = Visual Studio builds and the walk starts Spixi with **Ctrl+F5** (#1844 (1)), **never `dotnet build`** #663; Android
  `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug` then `-t:Run`; iPhone `devicectl`; Mac
  `-f net10.0-maccatalyst`) → "this is the first compile of this C#; a build error is this batch's bug" →
  "Mark each row, then tap Copy results and paste them in the chat". **The page shows every set-up command of its sheet
  in full** — the commands that make the build, the zip or the seed the rows use, and the commands of a second data
  folder — not only the rows and a file name: a row cannot pass when the page does not say how to make what it needs
  (WALK #1828: A-BUILD of `fixb3` was first N/A because the page did not give the commands that make
  `fixb3-walk-app.zip`; the lesson recorded in WALK #1828).
- **Rows** = a JS array `ROWS` of `{id, t: title, w: where (platform/device), d: Do, p: Pass when, n: NEW 1/0}`.
  - The FIRST row is `BUILD`. Its "Pass when" names something only THIS build shows (a changed screen, a new log line or
    probe tag) — "builds and starts" is not proof, because a stale shell starts too (#663). It is the setup check before
    any row can blame the code. ⚠ The two model sheets predate this rule: `walk-artifact-1086.html` has no BUILD row and
    `walk-artifact-1094-win-android.html` has a weak one ("builds and starts") and no html-wipe step for Android — fix
    both in your copy.
  - One row per item; the id = the finding id or DECISIONS number (`B6w`, `1091f`).
  - "Pass when" is observable on the device (what the eye or a log line shows), never "works".
  - A row that needs a log line names the probe tag (`[CALLSWAP]`, `[CDPERF]`) and what it must read.
  - **A row that needs a NEW account** (a first-run default, a restore, a fresh install) says that the new account is made
    in a SECOND data folder (Windows: `ixian.cfg`, `spixiUserFolder`; the commands are on the page), never by "Delete
    account" + create in the test account. Source: the walk of the Defaults batch (`defaultsb`, `claude/talk-rulings-2026-11-22-walk.md`):
    Damir made the new account by "Delete account" in the MAIN data folder; the create after the delete hit a caught
    `DirectoryNotFoundException` (#584); also not shown by the log: W-3 (10 minutes idle did not fit), W-4 (no restore),
    W-9. On Android a fresh account needs an emulator or a spare phone (`claude/talk-session-status.md`, Sessions,
    `defaultsb`).
    **Windows: where the page store and `ixian.cfg` live** (WALK #1835; item `n-20261123-win-webview-store-in-build-folder`):
    both are in the build folder beside `Spixi.exe` (the configuration folder is, in the clone,
    `Spixi\bin\x64\Debug\net10.0-windows10.0.19041.0\win-x64`: the page store is `…\win-x64\Spixi.exe.WebView2\EBWebView`,
    the file is `…\win-x64\ixian.cfg`; `ixian.cfg` is read from the app's working folder, `Spixi/Meta/Config.cs:112`,
    `:150-152`, `:258`). So a wipe of `Spixi\bin` EMPTIES the page store and DELETES `ixian.cfg`; a search of `%LOCALAPPDATA%`
    finds nothing. A sheet therefore (1) copies the page store AFTER the first start of the new build (after the wipe and the Ctrl+F5 start),
    from that fixed full path — it does not search for it; (2) makes every `ixian.cfg` step a full PowerShell line with the
    full path and no placeholder (no `<…>`, no "open or create the file"): one line each for setting the folder, the restore
    folder and removing the line; the put-back of the store is one line with the same fixed path; (3) does not ask for "the
    old build first" after a wipe (the old build cannot be started; the page-store values of an existing account then show
    the values of an empty store: Load pictures On, List density Comfortable, WALK #1835 W-1) — W-1 says what the page-store values read; a native value noted at the first start of the new build is the
    test account's own value (the wipe does not touch it) and serves the put-back row — when the batch changes no native
    value of an EXISTING account; a batch that changes a native value of an existing account compares with the test
    account's known setting instead; and when an earlier walk changed the test account's value, W-1 is information only (note
    the value, mark P when noted; the put-back row restores what W-1 saw; `docs/walk-defaultsb.md` W-1). A row that may be walked alone
    again names the rows it needs first, and the clean-up of the second data folders comes before it. The model sheets: `docs/walk-fixb4.md` (Windows set-up) and
    `docs/walk-defaultsb.md`.
- **Marks**: Pass / Fail / N/A buttons + a note on EVERY row, PASS included (#843). State in `localStorage` under a
  per-sheet key, wrapped in try/catch.
- **Sticky bar**: live tally `n P · n F · n N/A · n left` · Clear (double-tap) · **Copy results**.
- **Copy format**: `Walk #<batch> (<platforms>): p P · f F · n N/A`, then one line per row `ID P|F|N/A|— — note`.
- Tokens on `:root`, dark via `prefers-color-scheme` + `[data-theme]`, 760 px column, 16 px gutter.

## After the walk
1. Damir pastes the copied results.
2. Write the verdict as a DECISIONS row `WALK #<batch> (<platforms>): n P · n F · n N/A` — PASS list, FAIL list with
   first reads (NOT verified, #294), unmarked rows named, what goes to the next session. A big walk also gets
   `docs/walk-verdict-<place>-<date>.md`.
3. Each fail: mechanism first (log, recording, measurement) before a fix. "Did not reproduce" is not fixed.
4. Update the DoD rows the walk closes (`docs/release-readiness.md`).
