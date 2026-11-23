# Agent contract — leanfollow (Speed lean follow-up)

File name: `docs/contract-leanfollow.md`. The lead wrote it BEFORE any agent started (`docs/orchestration.md` § 4).
Every agent gets this file plus its own row. An agent that needs a file outside its row stops and reports to the lead.
Mechanisms: `docs/leanfollow-mechanisms.md` (read it first). Prompt: the project doc `claude/session-leanfollow-prompt.md`.

## 1 · Base
- Tree: `work/leanfollow` @ `55feaddc` "Merge pull request #15 from Rexoflex/work/fixb2" · baseline (CLAUDE.md):
  `BASELINE OK 6617 / the 2 KNOWN (#136 · B3)` · CSH 643 (observed in this session: `CSH pass=643 fail=0`) · tools:
  jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160) · .NET SDK
  10.0.115 · Node 22.23.5.
- Lead tree: `/home/claude/spixi` (do not touch it). Ixian-Core sibling (pinned `097341a`): `/home/claude/Ixian-Core`.
- Must hold for everyone: no C# file changes · no file under `src/shells`, `src/components`, `src/styles`, `src/bridge` ·
  nothing under `scripts/device/**`, `Spixi/Meta/**`, Ixian-Core · no bridge verb, storage key, log line, WebView
  setting · the lean switches stay OFF by default (no default changes) · `SpixiStripReleaseHtml` (the tokens-only
  target) is not edited by one byte · a packaging fix refuses MORE, never less · no commit, no push, no full smoke, no
  `smoke-packaged` full run (the lead runs the suites, one at a time, L153) · facts only in the licence work: no legal
  judgment, an unproven licence is a question, never a guess; no third-party code removed or replaced.
- **Load rule (L153):** the lead's full smoke may be running. Before you run `node` on a test, `dotnet`, or anything
  heavier than `ls` / `grep` / `cat` / `git` reads, check that the file `/home/claude/logs/LOCK-free` exists; if it
  does not, wait (`sleep 60`, check again). Reading files is always allowed.
- **Isolation (L74):** each agent works ONLY in its own copy: `/home/claude/wt/<agent>/Spixi` (a full copy of the base)
  with the link `/home/claude/wt/<agent>/Ixian-Core` → the pinned Core. Scratch files go to `/home/claude/scratch/<agent>/`.
  Never write into another agent's copy or the lead tree.
- Pins: behaviour, not source text where a runnable check exists (#771/#798, #1735); every pin row has its deliberate
  break (a one-token mutation in a scratch copy, or a mutated input in memory) that makes THAT row fail for exactly
  its reason (#802). A source-text pin states its limits in its FIRST version (#1735: a gap of the stated class is a
  NIT). Run your pins with `node scripts/run-pins.mjs <dir/mod>` in your copy.
- Text style: comments and docs in plain English; no `#` before a number in anything that could become a commit
  message; no model name, no session link anywhere in the repo files.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes (pins + one deliberate break each) | Scratch |
|---|---|---|---|---|---|---|
| 1a | `inv` (a search helper for the lead, NOT a reviewer) | Haiku | none (read-only) | the whole tree | the inventory list (§ 3.1) | `scratch/inv/` |
| 1 | `notices` | Sonnet | `docs/legal/third-party-notices.md` · NEW `docs/legal/third-party-inventory.json` · NEW `Spixi/Resources/Raw/licenses/**` · NEW `scripts/pins-leanfollow/a-notices.mjs` | the tree, the inventory | `a-notices` (§ 3.2) | `scratch/notices/` |
| 2 | `pack` | Sonnet | `Spixi/Spixi.csproj` (`SpixiLeanGuard`, `SpixiLeanReleaseHtml` and their comment blocks ONLY) · `scripts/strip-release.mjs` (the `--out` rule and `--in-place`) · `scripts/pins-perflean/msbuild-harness/run.mjs` · `scripts/pins-perflean/d-package.mjs` · `scripts/pins-perflean/a-gates.mjs`, `b-css.mjs`, `c-js.mjs` (only a row that asserts the old `--in-place` text or the old out-folder rule; re-base after a look, name it) · NEW `scripts/pins-leanfollow/b-refusals.mjs` | the tree | `b-refusals` + the harness scenarios (§ 3.3) | `scratch/pack/` |
| 3 | `smokepk` | Sonnet | `scripts/smoke-packaged.mjs` · `scripts/pins-perflean/lean-expected-reds.json` · NEW `scripts/pins-leanfollow/c-plain-packaged.mjs` | the tree (`d-package.mjs` READ only: it cuts functions out of smoke-packaged.mjs) | `c-plain-packaged` (§ 3.4) | `scratch/smokepk/` |
| 4 | `ci` | Sonnet | `.github/workflows/redesign-ci.yml` · NEW `scripts/pins-leanfollow/d-ci.mjs` | the tree | `d-ci` + the break proofs of the two CI steps (§ 3.5) | `scratch/ci/` |
| — | the lead | Opus | the ONE registration block in `scripts/smoke-test.mjs`, the merge, every export doc, `docs/leanfollow-mechanisms.md`, this file | — | the byte-equal proof, the full runs | `scratch/lead/` |

## 3 · Interfaces and the done texts

### 3.1 · `inv` → the lead → `notices`: the inventory list
One markdown table per area, each row: path · size · SHA-256 (first 16 hex) · in the fork point `0e85a4b8` (yes / no:
`git cat-file -e 0e85a4b8:<path>`) · what the file says about itself (a version, a licence word, a copyright line:
quote at most one short line) · notes. Areas: (A) every file of `Spixi/Resources/Raw/html/**` · (B) every `data:` URL
embedded in a shipped `.css` / `.html` / `.js` (its file, its MIME type, its byte length, the SHA-256 of the decoded
bytes, the font family / name table string if a font) · (C) third-party code embedded INSIDE our shipped files (search
the shipped `.js` / `.html` for `Copyright`, `@license`, `licen`, `MIT`, `Apache`, `BSD`, `(c) 20`, `©`) · (D) every file
of `Spixi/Resources/**` outside `Raw/html` (fonts, sounds, lang, images, app icon, splash) · (E) every `PackageReference`
of `Spixi/Spixi.csproj` with version and condition, and `local-nuget/**` · (F) every vendored source folder in the
repo that is compiled into the app (e.g. `Spixi/Platforms/MacCatalyst/RocksDbSharp/**`) · (G) the sources under
`src/assets/**` that build-shells copies or embeds (name → built file).

### 3.2 · Item 1 — the notices against what ships
- **The licence texts ship in a NEW folder `Spixi/Resources/Raw/licenses/`** (packed by the existing wholesale
  `MauiAsset Include="Resources\Raw\**"`; outside `Raw/html`, so the built html folder stays byte-equal to the base and
  no WebView file changes). One plain-text file per licence text, UTF-8, LF, named `<component>.LICENSE.txt` (e.g.
  `html5-qrcode.LICENSE.txt`, `sora.OFL.txt`). The text is the EXACT text of the upstream project at the version that
  ships (or the closest proven one; say which), fetched from the upstream source (the npm package of that version via
  `npm pack <name>@<version>` — the npm registry is reachable —, or `raw.githubusercontent.com/<owner>/<repo>/<tag>/<file>`
  — reachable). No text written from memory. Each file starts with a 3-line header of ours: the component, the
  version, the source URL of the text (then one empty line, then the upstream text unchanged).
- **Prove the version** where the file does not say it: e.g. compare the shipped `html5-qrcode.min.js` byte for byte
  with the minified file of each npm version (`npm pack`), and record the match (or "no byte match; nearest …").
- **`docs/legal/third-party-inventory.json`** — the machine-readable inventory the pin reads:
  `{ "version": 1, "files": { "<path under Raw/html>": { "owner": "ours" | "third-party", "component": "<id>" } },
    "embedded": [ { "in": "<path under Raw/html>", "kind": "data-url" | "code", "sha256": "<hex of the decoded bytes>"
    (data-url) | "marker": "<a literal string that is in the file>" (code), "component": "<id>" } ],
    "components": { "<id>": { "name", "version", "licence", "licenceFiles": ["licenses/<file>"], "noticeHeading": "<the
    exact ### heading in the notices doc>", "textRequired": true | false, "why": "<one line: what the licence asks>" } } }`.
  Every file of `Spixi/Resources/Raw/html/**` is in `files` (both directions). A NuGet / app-package component (not in
  `Raw/html`) is a `components` entry too, with `"scope": "app-package"`.
- **The notices doc:** ONE inventory table (the shape of the prompt: name · version (if the file says it) · licence
  as the file or its source states it · where the licence text ships today · what is missing / what this batch
  added), then the `## Notices` section. Remove the rows of files that no longer ship (qrcodejs, jQuery, Bootstrap,
  clipboard.js — prove "no longer ships" by the tree). Keep every string that the existing rows read (`scripts/smoke-test.mjs:25103-25105`,
  `:36191`, `:36535`: `Copyright (c) 2020-2025 Paweł Kuna`, `SIL Open Font License, Version 1.1`, `html5-qrcode`,
  `chat-bg-doodles.svg`, `OPEN — Damir to state the source`, `### Twemoji Country Flags — CC-BY 4.0`,
  `creativecommons.org/licenses/by/4.0`, `RocksDbSharp/LICENSE`,
  `### RocksDbSharp (vendored managed wrapper, Mac Catalyst only) — BSD-2-Clause`). A component whose licence cannot
  be proven from the repo or its upstream = a row that says "UNPROVEN — question for Damir" + a line in your report.
- **Pin `scripts/pins-leanfollow/a-notices.mjs`** (rows, each with its break): (1) the file set of `Raw/html/**` equals
  the `files` keys of the inventory, both directions; (2) every `data:` URL in a shipped `.css` / `.html` / `.js` has
  an `embedded` entry with the SHA-256 of its decoded bytes; every `code` marker is in its file; (3) every third-party
  component used by (1)/(2) has each `licenceFiles` entry present under `Spixi/Resources/Raw/licenses/`, non-empty,
  starting with the 3-line header and holding the licence's own title line; (4) every component has its
  `noticeHeading` in the notices doc, and the notices doc names no `Raw/html` path that does not exist; (5) every file
  under `Raw/licenses/` is named by a component (no orphan text). Its limits, written in the pin's head comment: the
  owner classification of a NEW file is a human entry; third-party code pasted into one of our files without a
  marker is not detected; the pin does not judge whether a text is legally enough.
  Deliberate breaks: remove one licence file (row 3 red, naming it); add an unknown file to a scratch `Raw/html`
  copy (row 1); change one byte of a decoded font (row 2); remove a heading (row 4).

### 3.3 · Item 2 — the two packaging refusals
- **R1** — `SpixiLeanReleaseHtml`: its FIRST task is `<Error Condition="'$(SpixiLeanJs)' != 'false'" Text="Spixi lean
  packaging: SpixiLeanJs='$(SpixiLeanJs)' reached the lean target … PARKED … (DECISIONS 1583) …" />`, before the
  existing IntermediateOutputPath belt and before `RemoveDir`. Keep the js lines of the target byte for byte.
- **R2** — `scripts/strip-release.mjs`: ONE function used by BOTH `--out` paths (plain and lean):
  `outFolderRefusal(outDir, { inPlace }) → string | null` (null = allowed). Refused: the out folder is
  `Spixi/Resources/Raw` (of the tree the script belongs to: `join(root, 'Spixi', 'Resources', 'Raw')`) or inside it,
  by (a) its real path (the nearest existing parent resolved), (b) the path as written (lexical, both against the
  real and the written `Resources/Raw`), (c) the device + inode of the out folder and of each parent — the three tests
  the lean path has today for `Raw/html` (`strip-release.mjs:515-537`), widened to `Resources/Raw`. ONE exception: the
  out folder IS the source folder `Raw/html` (same tests) AND `--in-place` is given. `--in-place` becomes valid with
  any `--out` (plain or lean); with no `--out` it stays a usage error (exit 2). A refusal exits 1, writes nothing, and
  names the folder. The plain path: the existing text of its success lines stays.
- **R2 in the csproj** — `SpixiLeanGuard` gets one `<Error>` after the existing IntermediateOutputPath test: the
  normalized `IntermediateOutputPath` is `Resources\Raw` or under it (compare
  `NormalizeDirectory(MSBuildProjectDirectory, IntermediateOutputPath)` with
  `NormalizeDirectory(MSBuildProjectDirectory, 'Resources', 'Raw')` by `StartsWith`, case-insensitive: MSBuild's
  `StartsWith(…, StringComparison.OrdinalIgnoreCase)` or `ToLowerInvariant()` on both — test which form MSBuild 10
  accepts in a Condition); the same test as a belt in `SpixiLeanReleaseHtml` before `RemoveDir`. The tokens-only target
  is not edited: its `Exec` fails on R2 of the script.
- **The MSBuild harness** gets scenarios (both `--fake` and `--real` where they apply): R1 = a targets piece that sets
  `SpixiLeanJs=true` in a target with `AfterTargets="SpixiLeanGuard"` in an Android dev lean-css build → the build
  fails with R1's text and `node` was NOT called; R2 = `-p:IntermediateOutputPath=Resources\Raw\obj\` (and one more
  spelling: a different letter case, and `..\Spixi\Resources\Raw\x\`) in a lean build → the guard's R2 text, no node
  call; in `--real` mode an OFF build with that IntermediateOutputPath → the build fails (the script's R2). Each
  scenario's deliberate break: the harness run with `--csproj <a copy without that Error>` makes exactly that scenario
  fail. Report the harness numbers (`--fake` and `--real`: scenarios, seconds).
- **Pin `scripts/pins-leanfollow/b-refusals.mjs`** (node only, no dotnet — the suite runs it): runs the real
  `strip-release.mjs` in a scratch tree (a copy of the needed scripts + a small `Spixi/Resources/Raw/html`) with
  `--out` into: `Raw/lang/x`, `Raw/x`, `Raw` itself, `Raw/html/../lean2`, a link inside `Raw` that points outside,
  `Raw/HTML` on a case-insensitive check only where the file system is (skip with a stated reason otherwise), plain
  and lean, each → exit 1 and nothing written; `Raw/html` without `--in-place` → refused; with `--in-place` → allowed
  (plain and lean); a folder outside `Resources/Raw` → allowed. Plus the R1 / R2 Error elements of the csproj read
  as XML elements (a source pin; its limits stated: it reads the text, the harness runs it). Breaks: R2 removed from
  the script in a scratch copy → the refused rows go red; the exception removed → the `--in-place` rows go red.
- `d-package.mjs` rows that hold the exact element lists of the lean targets are re-based to the new lists after a
  look at the diff (name each row and the old → new list in the report, #1634).

### 3.4 · Item 3 — the plain packaged smoke
- `scripts/smoke-packaged.mjs`, the plain path (no lean flag): after the copy, `git init -q` in the copy (fail loud
  when git is missing: exit 1 with the reason); link the Ixian-Core sibling next to the copy when `root/../Ixian-Core`
  exists (the lean path's `link` + `removeLinks`, records every link before it is made, removes each link by itself
  before the temp folder goes, also with `--keep`, also on a failure); the copy's strip is called with `--out <copyRaw>
  --in-place` (interface with `pack`, R2); everything else of the plain path as today; the verdict line is the copy's
  own `BASELINE OK … / smoke test CLEAN` line and the exit status is the suite's. Print ONE line when there is no Core
  sibling ("the three Core rows will be red").
- The lean path: the same `git init -q` step; `lean-expected-reds.json`: the `copy` entry S15 D is removed (keep the
  key `copy` as an empty list, or remove it — whichever the judge and `d-package` accept; report which).
- Keep every function that `d-package.mjs` cuts out of the file (`judgeLean`, `leanVerdict`, `removeLinks`,
  `knownPreexisters`, `leanGate2`, `leanArgsProblem`) by its name and signature; run `pins-perflean/d-package` in your
  copy and report each row that goes red with its reason (the lead or `pack` re-bases it; do NOT edit `d-package.mjs`).
- **Pin `scripts/pins-leanfollow/c-plain-packaged.mjs`** (fast; no suite run inside the suite): runs the plain path of
  the REAL `smoke-packaged.mjs` against a FAKE tree (a scratch tree with a tiny `scripts/smoke-test.mjs` stand-in that
  prints rows and a `BASELINE OK` line, a stand-in `strip-release.mjs` that logs its args, a fake `Ixian-Core`
  sibling and fake `node_modules` / `local-nuget` with marker files) and proves: the copy is a git work tree when the
  stand-in suite runs (it runs `git rev-parse --is-inside-work-tree`); `../Ixian-Core` is readable from the copy; the
  strip got `--out <copyRaw> --in-place`; after the run no link and no temp folder is left, the linked folders keep
  their markers; with `--keep` the kept copy holds no link; without a Core sibling the run prints the one line and
  still runs; the exit status and the verdict line are the stand-in suite's. A break per row (in memory or in a
  scratch copy of `smoke-packaged.mjs`).
- **Done text:** the lead runs `node scripts/smoke-packaged.mjs` on the merged tree → `BASELINE OK <n> / the 2 KNOWN`
  (a stated number; expected = the main suite's number of the same tree) and `smoke-packaged --lean-css` → GATE 2 OK
  with the re-based list.

### 3.5 · Item 4 — the CI pins
- Two new steps in the `smoke` job of `.github/workflows/redesign-ci.yml`, after "CSH (C# harness)", each with
  `id`, `if: ${{ !cancelled() }}`, `set -o pipefail` and a `tee ../<name>.log`, and each added to the annotation
  step (its `O_*` env and a `publish` line) and to the upload list:
  (a) "Parser cross-check (lean strips against acorn and jsdom)": `node scripts/pins-perflean/x-parser-crosscheck.mjs`
  (both flags, the strip in memory over the committed tree; no package written);
  (b) "MSBuild harness (the lean packaging targets)": `node scripts/pins-perflean/msbuild-harness/run.mjs --fake`, and
  `--real` too if its measured time on this machine is under 5 minutes (report both times).
  Nothing else in the file changes: no new action, no `secrets.`, no new `permissions`, no `pull_request_target`, no
  network fetch (prove for the harness: the bare project needs no restore — run it with the network blocked
  (`HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9`) and it still passes).
- **Break proofs (in your copy; the pull request run is Damir's):** (a) a strip that loses one token of a kept code
  line (one-line mutation of `scripts/lib/lean-strip.mjs` in a scratch copy) → the step command exits non-zero and
  names the file; (b) the harness with `--csproj` = a copy of `Spixi.csproj` without one existing lean refusal (e.g.
  the store-build Error) → exit 1 naming that scenario. Record the exact red lines.
- **Pin `scripts/pins-leanfollow/d-ci.mjs`** (a source-text pin on the workflow; its limits in its head: it reads the
  YAML text, it does not run GitHub Actions): the two steps exist with their exact `run:` lines, after the CSH step,
  with `if: ${{ !cancelled() }}` and `set -o pipefail`; the annotation and upload steps name both logs; the set of
  `uses:` values, the `permissions:` block, the `on:` block and the job `if:` lines equal the base's (a frozen list in
  the pin); no `secrets.`, no `pull_request_target`, no `curl` / `wget` / `npm i` in a new step. A break per row.

## 4 · What each agent returns
- The list of files it CHANGED or ADDED in its copy (the lead copies back only these).
- Per pin: the command, the green `RESULT pass=n fail=0` line, the break it made, the red line with the failing key.
- What it could not prove (not run, a limit).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only; the registration line in `scripts/smoke-test.mjs` (one block, after the
   `pins-fixb2` line); `build-shells --check`, `build-locales --check`; all pins of this batch and of `pins-perflean`.
2. The byte-equal proof: `diff -r` of `Spixi/Resources/Raw/html` base vs branch (no difference) and the file list of
   `Spixi/Resources/**` base vs branch (only `Raw/licenses/**` added); the MSBuild harness OFF scenario's item list.
3. The full smoke (one at a time, L153) → `smoke-packaged` plain → `smoke-packaged --lean-css` → CSH → the #46 loop
   (security-only pass: ONE Fable 5.2 reader per round over the packaging targets, the script refusal and the
   workflow; Opus for the other readers) → the affected pins between rounds (#1503) → the full smoke once after the
   last fix → export, the merge of the newest base, the push by #1546.

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
