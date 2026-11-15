# P44 · LEAN CSS · A Release build can pack every stylesheet without its comments (Session Speed lean, P-06)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW–MEDIUM (a packaging transform: a wrong strip would ship a shell that renders or behaves differently from the reviewed tree, on the device only) | no | none: no verb, push, `spixi.*` key, WebView setting, sink, fetch or log line; no C# file changed | built behind the MSBuild property `SpixiLeanCss` (default **OFF** = today's package, byte for byte) · allowed ONLY in an Android dev build (`-f net10.0-android` with `SpixiDevCoexist=true`, app id `com.ixilabs.spixi.dev`) until the ruling of the defaults: an iOS, Mac or Windows build, a production-id build and a store build refuse it · the MSBuild targets run for the first time in Damir's Release build | 7 min |

**Look here first:** `scripts/lib/lean-strip.mjs:85` (the rule, in words), `:189` `scanCss` (which comments go), `:388`
`cssDeletions` (which bytes go with them), `:674` `checkCssStrip` (what every output must pass before a write); then
`Spixi/Spixi.csproj:634` `SpixiLeanReleaseHtml` (the item swap) and `:535` `SpixiLeanGuard`.

**DECISIONS:** #1312 · #1478 · #792 (the strip fork and its two gates) · #1537 (the scope) · **#1582 (this change)** ·
#1581 (the gates it must pass) · #1584 (the MSBuild switches). Gate doc: `docs/security-handover-gate.md`, section
"Session Speed lean". Twin packet: P45 (lean JS) — **PARKED: the build refuses `SpixiLeanJs`** (Damir's ruling after review round 4), so
the only lean package of this batch is the CSS one.

## What changed and why
- **Today** (#792): a Release build strips the comments of ONE file, `spixi.tokens.css`, and proves it with GATE 1
  (`strip-release.mjs --check`: packaged ≡ strip(committed)) and GATE 2 (the suite over the package). The other
  shipped CSS is about a third comments.
- **With `-p:SpixiLeanCss=true`**: `node scripts/strip-release.mjs --out <obj>/spixi-lean/html/. --lean-css` writes
  the three linked `.css` files and every shell with the body of each inline `<style>` stripped; the target swaps
  those 21 files into the package. html 4,450,361 → 3,062,078 bytes; css 318,052 → 150,995 bytes.
- **What the strip removes — the whole rule:** a removable comment, and the white space that belonged to it: the
  blanks before it when it ends its line, and its whole line when nothing but blanks is left on it. **A line without
  a removed comment stays byte for byte.** (Review round 1 replaced the white-space pass inherited from the tokens
  strip, which also touched comment-free lines, by this rule.)
- **A comment STAYS, byte for byte, when** (1) it holds a `*SL{…}` carrier (C# replaces carriers in the raw text;
  the carrier count of every file must not move — gate P-09), (2) it names a licence or a source (`keepReason`,
  `lean-strip.mjs:46`: licence words, a URL, `@author`, `adapted from`, `ported from`, `stackoverflow`, `tabler`),
  (3) it sits inside the VALUE of a custom property (the browser stores that text; script can read it), (4) it is
  not at a statement boundary — the previous significant character is not `{`, `;`, `}` or the start, or it is
  inside parentheses or brackets, or after an escape: there the browser's CSSOM can show the comment, (5) it spans
  lines and has content before it AND after it (removing it would join two lines), (6) its removal would put a `/`
  next to a `*` (a new comment opener), (7) it sits in a `{ }` block that is itself a VALUE — a `{` after a `:` in a
  declaration list (review round 2: the browser keeps that block as text, comments too; round 3: the block of
  `@scope` is a declaration list for this rule as well). 32 comments stay today
  (3 carrier, 6 licence, 14 attribution, 9 by the value rules), 10,785 bytes.
- **It throws instead of guessing:** an unterminated comment / string / `url(`, a line break in a string, a NUL, an
  escaped name before `(` (it could spell `url(`), an escape at the start of a statement, `<!--` / `-->` outside a
  string or a comment, an `@charset` rule that is not the very first bytes of its sheet (a removed comment before it
  would move it there, and the browser would then decode the sheet by it — review round 3), and in the HTML walk a tag it does not model (`<style>` in SVG / MathML and every `<style>` /
  `<script>` after an HTML integration point inside them, `xmp`, `iframe`, `noscript`, a `<style>` inside `<select>`
  …). A throw = exit 1, nothing written, the build stops.
- **The HTML walk** (`walkHtml`, `lean-strip.mjs:1672`) follows the HTML tokenizer for comments, raw-text and RCDATA
  elements; only the body of a `<style>` whose `type` is absent, empty or `text/css` changes (the walk can also strip the body of a
  classic `<script>`: the parked P45; not with this switch). Markup, HTML comments and every other byte are untouched.
- **One switch per change (#1478):** `spixi.tokens.css` follows this rule only with `SpixiLeanCss` (the script's
  `--lean-js` alone leaves it as today's tokens strip, byte for byte; no build passes that flag — P45 is parked).

## Files
- `scripts/lib/lean-strip.mjs:189` `scanCss` · `:342` `cssWouldJoinSlashStar` · `:356` `cssSpansLinesWithContent` ·
  `:388` `cssDeletions` · `:442` `stripCssLean` · `:493` `cssUnits` + `:674` `checkCssStrip` (the post-condition, a
  walk of its own that never calls the scanner: deletions only; every deleted run is whole comments plus blanks that
  touch them; every kept comment is there byte for byte; no removable comment is left; idempotent) · `:1672`
  `walkHtml` · `:1778` `leanHtml` · `:1799` `checkLeanHtml` · `:1840` `leanScope`.
- `scripts/strip-release.mjs:454` `leanCli` (exactly one mode; `--out` plans every file in memory, refuses a target
  that is a directory or a link, refuses the source folder without `--in-place`, writes every temp file and reads
  it back, then renames; a failure before the renames changes nothing) · `:434` `alwaysOnGates` · `:396`
  `packageEntryProblems`.
- `Spixi/Spixi.csproj:531-533` the three properties · `:535-560` `SpixiLeanGuard` · `:561-563` `SpixiLeanStaleGuard`
  · `:634-702` `SpixiLeanReleaseHtml`.
- Pins `scripts/pins-perflean/b-css.mjs` and `d-package.mjs`; the corpus `scripts/pins-perflean/corpus/cases.mjs`;
  lead-machine proofs: `scripts/pixel-gate.mjs`, `scripts/pins-perflean/x-parser-crosscheck.mjs`,
  `scripts/pins-perflean/msbuild-harness/run.mjs`.

## Bridge surface
None. The WebView loads the same files from the same places; only their bytes differ when the property is on.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The strip changes a rule, a string, a `url(…)`, an escape or a custom-property value | Only a removed comment and its own blanks change; `checkCssStrip` checks exactly that before every write | The cross-check's own CSS tokenizer on 264 sheets (tokens equal; changed only at a removed comment) · Chromium: `cssText` of every rule and every custom-property value equal, source against output (the builder's probes: today's 264 sheets, and generated sheets; round 3 added `@scope`, whose block the browser reads as declarations too) · the pixel gate: 50 shots × 0 px · pins `b-css` · the corpus (each CSS case that does not throw is checked against Chromium by the pin builder) |
| A comment that the browser keeps as text is removed (round 2: a `{ }` block in a value) | Block contexts: a comment goes only where the grammar ignores it; every value block keeps its comments | pins `b-css` · the corpus · the round-2 reader's sweep: 0 Chromium differences after the fix (28 before) |
| The post-condition is blind (round 1: it was — to comments and to white space) | It is an exact deletion check now, and rows call it directly with wrong outputs | pins `b-css` (a removed licence comment, `.a .b` → `.a.b`, `1px 2px` → `1px2px`, a deleted declaration … each must throw) |
| A carrier that C# must replace is lost or folded | The raw carrier multiset is equal per file (`alwaysOnGates`); a comment with a carrier is never removed | pins `b-css`, `a-gates` (`chat.html: carrier *SL{SpixiP1} 1 → 0`) |
| The package is half-stripped, stale, or holds a file twice | The lean target empties its own directory, calls the script once, and checks: nothing written / an orphan / a must-write file missing / the removed count / the asset count → `<Error>` | the MSBuild harness (97 scenarios with real `dotnet msbuild`, 106 with a fake `node`) · pin `d-package` rows 1–11 |
| The lean switches change in one `obj` folder and the old files stay in `bin` (found in round 1) | A stamp file in `obj`: a changed switch state stops the build, also for the OFF build ("delete obj and bin") | harness rows `offafterboth`, `cssafterboth`, `bothaftercss` · a model project with a copy-by-timestamp consumer · pin `d-package` |
| A build with the switch OFF changes | The tokens-only target and its PropertyGroup are byte-identical; with no stamp the only new thing that runs is one `Exists` test; the script ignores the env in `--out` | harness rows `off`, `offexplicit`, `offenvlean` · pins `b-css`, `d-package` |
| A production package ships lean without a decision (round 2: the store refusal alone bound only a build that says it is a store build; round 3: `SpixiDevCoexist` moves the app id only on Android) | `SpixiLeanGuard` refuses a lean switch unless `SpixiDevCoexist` is `true`, the target framework is Android (the two halves of the app-id test, `Spixi.csproj:41`) AND the evaluated `ApplicationId` is `com.ixilabs.spixi.dev` (round 4: the id is decided when the project file is read, so a dev switch that a `.csproj.user` file sets later, or an `ApplicationId` on the build line, passed the first two tests with the production id), and refuses a `SpixiStoreRelease` / `SpixiDevCoexist` value that is not a boolean word; a store build refuses `SpixiDevCoexist=true` itself | the harness's store, dev and target-framework rows (iOS, Mac, Windows, unset: refused, no `node` call) · pin `d-package` (a model over 65,664 builds: every lean build is css-only, Android, with the dev app id) |
| The script overwrites the committed files, or writes into the source folder `Raw/html` | A lean `--out` into the source folder needs `--in-place`; an out folder inside the source folder is refused (by its real path, by its path as written — a link inside the source folder that points outside —, and by the folder's identity in the file system) | pin `a-gates` |
| A licence or source notice is removed | `keepReason` keeps it byte for byte | pins `b-css`, `c-js` |
| What ships is not what was checked | GATE 1 on the DEPLOYED html folder with the same flag; GATE 2 | walk sheet B6; `smoke-packaged --lean-css` |

## Recorded / left open
- **The MSBuild targets have not run in a real MAUI build yet** (no MAUI workload in the cloud). Open until Damir's
  first lean Release build: the Windows command line of the `node` call (the walk builds for Android ON a Windows PC), `LogicalName` with `\`, the real asset
  collection of the Android target, `RemoveDir` on a locked file, how the real MAUI asset pipelines copy (the stamp
  is proven with the SDK's copy-by-timestamp step only), design-time builds of Visual Studio, `dotnet publish`.
- **The stamp protects ONE `obj` folder.** A `bin` or publish folder that is kept after `obj` is wiped, or that two
  `obj` folders feed, can hold lean files with no error; a lean build that fails after the strip leaves the stamp.
  The rule stays: delete both; only GATE 1 on the deployed folder proves a package.
- **The Android-dev-build rule is temporary.** When the main chat rules the defaults, the `SpixiDevCoexist`, the
  `TargetFramework` and the `ApplicationId` conditions of `SpixiLeanGuard` are the three lines to change; until then no production-id package
  can be lean, and iOS, Mac and Windows have no lean package at all (their first one is owed after the ruling).
- GATE 1 compares the package with the transform of the committed files, made by the same code: it proves that the
  build packed this transform of these files, not that the transform is right. The other rows above prove the
  transform.
- The pixel gate, the cross-check and the Chromium probes run on the lead's machine, not in CI; the rule dump holds
  only what Chromium's parser keeps.
- MSBuild compares boolean words as booleans: `yes`, `on`, `!false` (any letter case) turn a switch on like `true`;
  a value that is not a boolean word stops the build. An environment variable or a props / `.user` file named for a property sets it. The high-importance build message
  of a lean build names the switches.
- `--in-place` is accepted (and has no effect) when the out folder is not the source folder.
- **The out-folder test protects `Raw/html` only (review round 5, recorded).** A hand command with an out folder
  elsewhere under `Spixi\Resources\Raw` (for example `Raw\lean2`) is not refused, and the asset glob
  `Resources\Raw\**` would pack those files as extra assets; GATE 1 on `assets/html` does not see them. The build
  itself always passes a folder under `obj`. A proposal: refuse every out folder under `Resources\Raw`.
- **The app-id test reads the final `ApplicationId` (review round 5, not proven, recorded).** If a file that is
  imported after the project body sets BOTH `SpixiDevCoexist` and `ApplicationId` to the dev values, the guard
  passes; whether the Android SDK has then already taken the production id cannot be tested without the MAUI
  workload. The APK file name shows the real package id (walk row B3: `com.ixilabs.spixi.dev-Signed.apk`); the
  pin fails when a file in the repo sets either property.
- `SpixiLeanCssFull` (white space + unused custom properties) is NOT built: `-p:SpixiLeanCssFull=true` stops the build.
- The default stays OFF until the device numbers (the walk of this batch); the keep-or-remove ruling is the main chat's.

## How to switch it off
Leave `-p:SpixiLeanCss=true` out of the build line. Off is the default. After a lean build in the same folders,
delete `Spixi\obj` and `Spixi\bin` first (the build stops and says so if `obj` still holds the lean stamp).

## Question for BE
None.
