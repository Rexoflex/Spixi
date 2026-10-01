# Walk sheet — template (spec)

A walk sheet is ONE self-contained HTML file, `docs/walk-artifact-<batch>[-<platforms>].html`. **Copy the newest
sheet as the model** — today `docs/walk-artifact-1094-win-android.html` (Windows + Android) or
`docs/walk-artifact-1086.html` (Mac + iPhone, the office). Change the header, the `ROWS` array AND every hard-coded
batch value outside them: the `<title>`, the `Walk #…` label in the Copy-results text, the `localStorage` key (a new
key per sheet, or old marks leak in), and the expected smoke count in "Before you start". Then search the file for the
old batch number — 0 hits.
Publish it as an Artifact when Damir walks away from the PC.

## Structure (keep it)
- Title `Walk #<batch> — <platforms>`, one-line sub: what this walk checks.
- **Before you start** (ordered list): pull / apply → FULL pipeline (bundle BEFORE shells) → smoke, expect
  `BASELINE OK — <n> / the 2 KNOWN (#136 · B3)` = "your last count + this round's new checks" → wipe `Spixi\obj` +
  `Spixi\bin` if C# changed — and on iPhone / Mac / Android also when the html changed (incremental builds do not repackage
  Raw html, #320/#449) → the build commands per platform (Windows = **F5, never `dotnet build`** #663; Android
  `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug` then `-t:Run`; iPhone `devicectl`; Mac
  `-f net10.0-maccatalyst`) → "this is the first compile of this C#; a build error is this batch's bug" →
  "Mark each row, then tap Copy results and paste them in the chat".
- **Rows** = a JS array `ROWS` of `{id, t: title, w: where (platform/device), d: Do, p: Pass when, n: NEW 1/0}`.
  - The FIRST row is `BUILD`. Its "Pass when" names something only THIS build shows (a changed screen, a new log line or
    probe tag) — "builds and starts" is not proof, because a stale shell starts too (#663). It is the setup check before
    any row can blame the code. ⚠ The two model sheets predate this rule: `walk-artifact-1086.html` has no BUILD row and
    `walk-artifact-1094-win-android.html` has a weak one ("builds and starts") and no html-wipe step for Android — fix
    both in your copy.
  - One row per item; the id = the finding id or DECISIONS number (`B6w`, `1091f`).
  - "Pass when" is observable on the device (what the eye or a log line shows), never "works".
  - A row that needs a log line names the probe tag (`[CALLSWAP]`, `[CDPERF]`) and what it must read.
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
