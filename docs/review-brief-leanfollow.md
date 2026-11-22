# Review brief — Speed lean follow-up (`leanfollow`, #1775–#1789)

File name: `docs/review-brief-leanfollow.md`. Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE
round 1. The VERDICT is written back into § 5 when the loop closes (#660).

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 1 | The third-party notices against what ships: one inventory table, the missing licence texts in the package (a new folder `Spixi/Resources/Raw/licenses/`, outside the html folder), the stale rows removed, a machine-readable inventory and a pin over the BUILT html folder | `docs/legal/third-party-notices.md`, `docs/legal/third-party-inventory.json`, `Spixi/Resources/Raw/licenses/**`, `scripts/pins-leanfollow/a-notices.mjs` | #1775 |
| 2 | Two packaging refusals: R1 `SpixiLeanJs` inside `SpixiLeanReleaseHtml`; R2 an out folder anywhere under `Spixi/Resources/Raw` (the script, every `--out`; the csproj, a lean build's `IntermediateOutputPath`) | `Spixi/Spixi.csproj` (lean targets only), `scripts/strip-release.mjs`, `scripts/pins-perflean/msbuild-harness/run.mjs`, `scripts/pins-perflean/d-package.mjs` (re-base), `scripts/pins-leanfollow/b-refusals.mjs` | #1776 |
| 3 | The plain packaged smoke: the copy is a git work tree with no history, the Ixian-Core sibling is linked, every link is removed by itself; the lean list loses the S15 D entry | `scripts/smoke-packaged.mjs`, `scripts/pins-perflean/lean-expected-reds.json`, `scripts/pins-leanfollow/c-plain-packaged.mjs` | #1777 |
| 4 | CI: the parser cross-check and the MSBuild harness as steps of `redesign-ci` | `.github/workflows/redesign-ci.yml`, `scripts/pins-leanfollow/d-ci.mjs` | #1778 |

Not built, and why: #1625 (4) — the home-shell parse / navigation lines wait with the cold-start work (#1638); the JS
strip P-07 stays PARKED (#1583, #1637); no default of a lean switch changes (#1637).
Mechanisms: `docs/leanfollow-mechanisms.md`. Contract: `docs/contract-leanfollow.md`.

## 2 · How to run
- Tree: the cloud twin of `work/leanfollow` (base `55feaddc`) · range `55feaddc..<head>` · Ixian-Core @097341a present ·
  .NET SDK 10.0.115 · Node 22 · the pinned npm line (L160).
- Pipeline: none (no `src/` file changes; the built html is not rebuilt) · smoke before: `BASELINE OK 6617 / the 2 KNOWN`.
- The batch's pins: `node scripts/run-pins.mjs pins-leanfollow/a-notices pins-leanfollow/b-refusals pins-leanfollow/c-plain-packaged pins-leanfollow/d-ci pins-perflean/d-package`.
- The harness: `node scripts/pins-perflean/msbuild-harness/run.mjs --fake` and `--real`; the cross-check:
  `node scripts/pins-perflean/x-parser-crosscheck.mjs`.
- Do NOT run the full smoke or a full `smoke-packaged` run (the lead runs them, one at a time, L153).
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Reader scopes (disjoint; #1606: Fable 5.2 for the security-only pass, Opus for the rest)
| Reader | Model | Scope (files) | Focus |
|---|---|---|---|
| S (security-only) | Fable 5.2, ONE per round | `Spixi/Spixi.csproj` lean targets · `scripts/strip-release.mjs` (`--out`, `--in-place`) · `scripts/smoke-packaged.mjs` (links, the temp folder, `git init`) · `.github/workflows/redesign-ci.yml` | what ships and where a build or a script writes: can any input make the package hold more, other or parked files; can a script write or delete outside its folder; does the workflow gain a secret, a permission, a trigger, an action or a fetch |
| B | Opus | items 1 and 3 + their pins | the inventory against the tree (every shipped third-party file and embedded asset has a row and a shipped text, every text is the upstream text of that version, no unproven licence is presented as proven, facts only); the plain packaged run (does it now prove what it claims); does each pin fail for its reason |
| C | Opus | items 2 and 4 pins + the harness scenarios + `d-package` re-bases | does each new scenario and pin row fail when its refusal is removed; is a re-base the smallest change; the CI steps: do they run what they say, fail loud, and get annotated |

## 4 · Non-negotiables and accepted dials
- Must hold: no C# file · no `src/**` file · the lean switches OFF by default · with them off the built html folder is
  byte-equal to the base and the pack list gains only `licenses/**` · `SpixiStripReleaseHtml` unchanged by one byte ·
  a fix refuses more, never less · the workflow: no new secret, permission, `pull_request_target`, third-party action,
  or network fetch · facts only in the notices (no legal judgment; an unproven licence is a question).
- Accepted (do not re-open): P-07 parked (#1583, #1605, #1637) · `SpixiLeanCss` OFF, a tool (#1637) · the
  Android-dev-build rule (#1584, #1637) · the whole-file hash pins (#1634: an edit re-bases after a look) · a
  source-text pin states its limits; a gap of the stated class is a NIT (#1735).

## 5 · The loop

### 5.1 · Round 1 (2026-11-18; readers S = Fable 5.2, B = Opus, C = Opus; the tree after the full smoke `BASELINE OK 6688`)
| Reader | MAJOR | MINOR | NIT |
|---|---|---|---|
| S (security-only) | 0 | 4 | 5 |
| B (items 1, 3) | 2 | 5 | 6 |
| C (items 2, 4: pins, harness, CI) | 2 | 3 | 4 |

| Id | Sev | Finding (short) | Verdict | Fix (round 1) |
|---|---|---|---|---|
| r1B-1 | MAJOR | the RocksDB native binaries hold LZ4 (symbols, `1.9.4`, `lz4*.o` members); no row, no text | TRUE (reader's `nm` / `ar` output) | the LZ4 component, its text, a symbol scan of every native binary in the method |
| r1B-2 | MAJOR | third-party code compiled in through Ixian-Core (BigInteger by Chew Keong TAN, Crc32.NET, Base58Check, the BIP-39 wordlists) is not in the inventory | TRUE | rows + texts where proven; questions where not; a header scan of every compiled Core file |
| r1B-3 | MINOR | the RocksDbSharp text header names the unproven 10.4.2.64152 package | TRUE | header fixed |
| r1B-4 | MINOR | "Spixi-PushService is not in the app package" is wrong: it is the iOS app extension | TRUE | row fixed |
| r1B-5 | MINOR | the native OneSignal SDKs (upstream "Modified MIT") are left out | TRUE | named as a fact + a question |
| r1B-6 | MINOR | `a-notices` row 3: a human `textRequired: false` hides a removed text | TRUE | the allowed ids frozen in the pin |
| r1B-7 … r1B-12 | NIT | CRLF texts not byte-checked · `DATA:` case · no reverse check · two icon folders · three judgment words · two versions not raised as questions | TRUE | fixed |
| r1B-13 | NIT | "three Core rows" undercounts the readers of the sibling | TRUE | wording |
| r1C-1 | MAJOR | no `b-refusals` case is decided by the REAL-PATH test (an inbound link outside `Resources/Raw` survives the mutation "real path off") | TRUE (reader's mutation run) | inbound-link cases, plain and lean |
| r1C-2 | MAJOR | the `--in-place` exception boundary is tested with one folder; widening it survives | TRUE | every refused case again with `--in-place` |
| r1C-3 | MINOR | the harness prints MISS rows mid-table; the CI annotation shows the last lines only | TRUE | a `FAILED:` block after the summary |
| r1C-4 | MINOR | "before `RemoveDir`" of R1 and the R2 belt is held by text pins only | TRUE | planted files that must survive |
| r1C-5 | MINOR | `d-ci` row 10: `secrets['…']`, `toJSON(secrets)`, `github.token` survive | TRUE | wider match + frozen `env:` keys |
| r1C-6 … r1C-9 | NIT | ` #` cut inside quotes · limits text · the break map · the annotation / upload `if:` not frozen | TRUE | fixed |
| r1S-1 | MINOR (as at the base) | `RemoveDir` follows a link planted at `obj/…/spixi-lean`: it empties `Raw/html` | TRUE (reader's run) | a link refusal before `RemoveDir` |
| r1S-2 | MINOR (as at the base) | the plain `--out` writes through a FILE link into `Resources/Raw` | TRUE | the lean pre-flight in the plain path |
| r1S-3 | MINOR | a killed plain run leaves the temp folder with three live links (now incl. Ixian-Core) | TRUE | a start line + signal handlers; the limit stated |
| r1S-4 | MINOR (as at the base) | R2 covers one glob; `Resources/Fonts`, `Images`, the platform globs pack too | TRUE | R2 widened to `Spixi/Resources` and `Spixi/Platforms` |
| r1S-5 … r1S-9 | NIT | the csproj test is lexical (stated) · `--in-place` with another folder · step time limits, "no network", acorn wording · a dangling link · more `GIT_*` names | TRUE | fixed |

### 5.2 · Round 2 (fresh readers: S = Fable 5.2, B = Opus, C = Opus; the tree after fix round 1, pins 204 / 204, harness 124 + 114 held)
| Reader | MAJOR | MINOR | NIT |
|---|---|---|---|
| S (security-only) | 0 | 3 | 8 |
| B (items 1, 3) | 3 | 2 | 6 |
| C (items 2, 4) | 0 | 4 | 5 |

Every round-1 fix was verified for the input it names; four were incomplete for a sibling input (below).

| Id | Sev | Finding (short) | Verdict | Fix (round 2) |
|---|---|---|---|---|
| r2B-1 | MAJOR | PerconaFT's locktree (GPLv2 / AGPLv3 / Apache-2.0 header) and MurmurHash are compiled into the native binaries; the symbol scan named only LZ4 / xxHash | TRUE | rows + texts at the build commit; the scan maps symbol families and archive members to their source files |
| r2B-2 | MAJOR | NBitcoin code (MIT) inside Ixian-Core files with an Ixian header and no marker (Wordlist, KDTable, Mnemonics, BitWriter, the wordlist source) | TRUE | an NBitcoin row + text; a body-overlap check in the method |
| r2B-3 | MAJOR | `a-notices`: the `licenceFiles` lists and the component set are not frozen (drop one text of a multi-text component, or a whole component, passes) | TRUE | ids, lists and the SHA-256 of every licence file frozen in the pin |
| r2B-4 | MINOR | LLVM libc++ is linked statically into the Android `.so` files | TRUE | a row + text |
| r2B-5 | MINOR | AutoNativeImport also ships inside `RocksDbSharp.dll` of the 0.0.42 package | TRUE | row fixed |
| r2B-6 … r2B-11 | NIT | a body edited with its own header hash · three facts not raised as questions · two image / Mac facts · a signal between phases · `from` not asserted · `init.templateDir` | TRUE | fixed |
| r2S-1 | MINOR (as at the base; r1S-2 incomplete) | the plain `--out` writes through a HARD link into the committed sheet | TRUE (reader's run) | temp file + rename in the plain path |
| r2S-2 | MINOR (not proven without MAUI) | the MAUI default `MauiCss **\*.css` glob would embed css written anywhere in the project folder | TRUE as read from the upstream targets | R2: no out folder inside the project folder but `obj` / `bin` |
| r2S-3 | MINOR | SIGQUIT has no handler | TRUE | handled; SIGBREAK too |
| r2S-4 … r2S-11 | NIT | raw `outDir` in `mkdirSync` · the named `--in-place` exception (by contract) · two comment facts · the stamp link · check-then-act · `init.templateDir` / no-inode drives · the gate row (at export) | TRUE | fixed / stated / at export |
| r2C-1 | MINOR | step (b) fails on a red `--fake` only by the job's default shell; `defaults:` and `continue-on-error` not frozen | TRUE | `set -eo pipefail` in the step; frozen |
| r2C-2 | MINOR | `${{ … }}` in a `#` line of a run block is evaluated by GitHub; `d-ci` skipped it; case | TRUE | every `${{ }}` body scanned, case-insensitive |
| r2C-3 | MINOR | no pin holds the harness scenario set or its `FAILED:` block | TRUE | a row freezes them |
| r2C-4 | MINOR (as at the base) | the pre-flight "folder on the way" test is unreachable today | TRUE | pinned with a synthetic list |
| r2C-5 … r2C-9 | NIT | masked "same" tests not stated · two comment facts · a skipped link scenario counted ok · labels · no `FAILED:` block in the cross-check | TRUE | fixed |

**Rule 9 watch (item 1):** rounds 1 and 2 each found a NEW class in the inventory (round 1: the native binaries and the Core file headers; round 2: code reached only by mapping symbols to sources and by body overlap). Fix round 2 therefore also writes the method and its limits into the notices doc and the pin (#1735): a later find of a class outside the stated method is a recorded limit. If round 3 still finds a MAJOR of a new class inside the stated method, item 1 stops with a question for Damir.

### 5.3 · Round 3 (fresh readers: S = Fable 5.2, B = Opus, C = Opus; the tree after fix round 2, pins 228 / 228, harness 127 + 118 held)
| Reader | MAJOR | MINOR | NIT |
|---|---|---|---|
| S (security-only) | 0 | 4 | 6 |
| B (items 1, 3) | 1 | 6 | 6 |
| C (items 2, 4) | 0 | 1 | 4 |

| Id | Sev | Finding (short) | Verdict | Fix (round 3) |
|---|---|---|---|---|
| r3B-1 | MAJOR | a fourth xxHash copy (`util/xxph3.h`, two BSD-2 blocks) is compiled in; the member-to-source scan listed the file and the result was dropped | TRUE. Not a new class (the header-block class of r2B-1), so rule 9 does not stop the item; MAJOR by #1735 (inside the stated method) | the blocks shipped; whole files read |
| r3B-2, r3B-3 | MINOR | no stop point after the lean cross-check; seven stop points not pinned | TRUE | added / pinned |
| r3B-4 … r3B-7 | MINOR | compiler-rt / libunwind not named · the Not-covered bullets not held by the pin · `MauiFilePicker.cs` names MAUI as its base · the MurmurHash3 statement in the vendored RocksDbSharp | TRUE | fixed |
| r3S-1 / r3C-1 | MINOR | the obj / bin exception is granted by ANY view: a link in `obj` into the project folder passes (also an all-off Release build) | TRUE (both readers' runs) | the exception needs the real path AND the written path under `obj` / `bin` |
| r3S-2 | MINOR (new against base) | a closed stdout pipe (`\| head`) ends a run between stop points without the clean-up | TRUE | `error` listeners that note a stop |
| r3S-3 | MINOR | `d-ci` reads only the top-level `permissions:`; a job-level block, a third job, a removed `persist-credentials: false` pass | TRUE | frozen |
| r3S-4 | MINOR (not provable here) | the plain temp + rename on Windows can fail on a file held open | plausible | a short retry on win32, stated unproven |
| r3S-5 … r3S-10, r3B NITs, r3C-2 … r3C-5 | NIT | a foreign temp file unlinked · inode precision · OneDrive reparse points · more signals · a project-folder `IntermediateOutputPath` now fails (by design) · the gate row · stale texts and labels · skip sets not frozen · `ContinueOnError` on a new Error | TRUE | fixed / stated / at export |

**Cost before round 4 (rule 10):** MAJOR per round 4 → 3 → 1; every round so far took about 50 minutes of readers (three in parallel) and 40–60 minutes of fixes. Round 4 reads the fixes of round 3; round 5 is the last permitted round. No ruling of Damir is open on the reader models (#1606 applies).

### 5.4 · Round 4 (fresh readers: S = Fable 5.2, B = Opus, C = Opus; the tree after fix round 3, pins 256 / 256, harness 127 + 120 held)
| Reader | MAJOR | MINOR | NIT |
|---|---|---|---|
| S (security-only) | 1 | 3 | 5 |
| B (items 1, 3) | 0 | 3 | 7 |
| C (items 2, 4) | 0 | 4 | 1 |

| Id | Sev | Finding (short) | Verdict | Fix (round 4) |
|---|---|---|---|---|
| r4S-1 / r4C-2 | MAJOR (new against base, opened by the round-3 fix) | `root` is the real path, MSBuild writes `--out` with the written spelling: in a checkout reached through a linked parent (macOS `/var` → `/private/var`, a linked home, a junction) the strict obj / bin exception of round 3 refused EVERY default Release build | TRUE (reader's harness run under a linked `TMPDIR`) | **Rule 9:** the out-folder rule drew a new class in rounds 2, 3 and 4, so the session stopped iterating on it: the exception is the round-2 form again (any view under `obj` / `bin`; round 3 found no MAJOR in it); the strict cases of round 3 are removed and recorded as a limit (below); NEW regression pins: `b-refusals` row 21 and the harness mode `--linked` (the tree behind a linked parent: a default Release and a lean build pass) |
| r4S-3 / r4C-1 | MINOR | `obj` itself a link into the project folder passes the exception | TRUE | recorded with r3S-1 (same limit) |
| r4S-2 | MINOR (as at the base for the lean path) | linked checkout + a link inside `Raw` that points outside | TRUE | recorded; row 3 case (a) is skipped with a note when the temp folder is reached through a link |
| r4S-4 / r4C-4 | MINOR | `d-ci`: quoted and flow-style YAML keys, `container:` / `services:`, a moved `persist-credentials`, another repository or npm package pass the line rows | TRUE | row 17: the whole file by SHA-256 with the batch's own pieces cut out, against the base file |
| r4C-3 | MINOR | row 19 does not parse single-quoted attributes | TRUE | raw `<Error` count = parsed count; quotes and case |
| r4B-1 | MINOR (strict: MAJOR) | libunwind and compiler-rt were found by the scan but put under "Not covered" | TRUE | their exact `LICENSE.TXT` texts shipped under the libc++ row |
| r4B-2 | MINOR | more origin links in compiled members (smhasher, Guava, folly) not listed; the two lists differed | TRUE | listed; the rule stated; the 127 outside headers read |
| r4B-3 | MINOR | rows S / P of `c-plain-packaged` raced fixed naps; false red under load; the retry hid first-run mismatches | TRUE (reader's load runs) | a handshake (marker → act → `go` file); the retry removed; 9 green runs under a two-core busy load |
| NITs | NIT | row 20 read comments · SIGPROF vs `--cpu-prof` · stderr listener not pinned · wording of three facts · lists out of step · `MurmurHash64A` | TRUE | fixed |
| r4S-5, r4S-6, r4S-7, r4S-8 | NIT | a partial temp after a failed write · every stream error named "EPIPE" · SIGUSR2 and rarer signals · `obj/x → bin` refused | TRUE | recorded |

**Recorded limit of the out-folder rule (from round 4 on):** a link planted inside `obj` or `bin` (or `obj` / `bin` itself a link) that points into the project folder outside `Resources` / `Platforms` is not refused: the obj / bin exception is granted when any view says the folder is under `obj` or `bin`. A stricter test refused every build of a checkout reached through a linked folder (round 4). A link into `Resources/Raw`, `Resources` or `Platforms` is still refused. The harm needs a planted link and rests on the MAUI `MauiCss **\*.css` glob, which was read from the upstream targets and not proven by a MAUI build.

### 5.5 · Round 5 — the LAST permitted round (fresh readers: S = Fable 5.2, B = Opus, C = Opus; the tree after fix round 4, pins 256 / 256, harness 127 + 118 held, also `--linked`)
| Reader | MAJOR | MINOR | NIT |
|---|---|---|---|
| S (security-only) | 0 | 2 | 6 |
| B (items 1, 3) | 0 | 4 | 4 |
| C (items 2, 4) | 1 | 2 | 4 |

| Id | Sev | Finding (short) | Verdict | Disposition (no code change after the last round) |
|---|---|---|---|---|
| r5C-1 | MAJOR (a pin gap; the code is correct) | no pin row and no harness scenario decides the project-folder rule (r2S-2) through a link: the rule reduced to the written view only, or to the real view only, survives `b-refusals` (21 / 21) and the harness (`--real`, `--real --linked`); the round-3 link cases that held it were removed in round 4 | TRUE (reader's mutations S15, S16) | NOT fixed: recorded. Fix direction: rows 3 / 4 (also with `--in-place`) gain an inbound link to `Spixi/Other` (`--out <link>`, `<link>/x`) and a link inside `Spixi/Other` that points outside; row 21 gains `<link>/Spixi/Other/x` → exit 1 |
| r5C-2 | MINOR | the recorded limit names one direction only: a link inside `Spixi/Other` that points into `obj` is also accepted | TRUE | recorded here; the code comments say only the first direction. A per-view rule ("each view that says inside the project must also say under obj / bin") closed both directions in the reader's run without the round-4 regression — a design choice for Damir (rule 9) |
| r5C-3 / r5S-2 | MINOR | `d-ci` row 17 cuts the REGION between two comment anchors: a NEW step inside that region (a fetch; a step that overwrites the harness) passes 64 / 64 | TRUE | recorded. Fix direction: hash the cut region against its own frozen text, or cut only the literal text of the two step blocks; scan every `${{ }}` of the new steps against an allow list |
| r5S-1 | MINOR (as at the base; unproven) | `Spixi-PushService/Resources/**` (the iOS app extension's default BundleResource glob) is outside `Spixi/`, so `--out` there is accepted | plausible, read from the SDK docs | recorded (rule 9 is in force for this rule). Fix direction: refuse every out folder inside the repo root but `Spixi/obj` / `Spixi/bin` |
| r5B-1 | MINOR | the MurmurHash export fact: `MurmurHashNeutral2` is exported by arm64 / armeabi-v7a, `MurmurHash64A` INSTEAD by x86_64 | TRUE | doc corrected (MD, JSON); the text header of `murmurhash.file-statement.txt` keeps "the exported MurmurHashNeutral2 of the Android librocksdb.so" (a shipped, hash-held file) |
| r5B-2 | MINOR | the stated rule of the origin-reference list ("every hit is listed") is not the list that was made; `util/work_queue.h` (a zstd excerpt with its own block, NOT compiled) not named | TRUE | doc corrected (the rule restated; `work_queue.h` named as found, not compiled) |
| r5B-3 | MINOR | `ForceCRC32/SafeProxy.cs:3` names a second upstream (Robert Važan's crc32c, BSD-3-Clause at master); not in the Crc32.NET row | TRUE | doc corrected: a fact + "UNPROVEN — question for Damir" |
| r5B-4 | MINOR | `c-plain-packaged` row S does not prove that Ctrl-C reaches the suite (a `detached` suite survives); a `ms < 25000` timer remains | TRUE | recorded (the real code is not detached; a heavy-load false red is possible) |
| r5S-3 … r5S-8, r5B-5 … r5B-8, r5C-4 … r5C-7 | NIT | `..\` spellings on Linux (the script is the backstop) · `bin` covers the unpackaged Windows app folder · a contrived missing-`obj` case · inode collisions on ReFS · `.MS-PL.` as a resource qualifier · exit-status-only CI steps · pin head lists · JSON lists not pinned · a timeout stand-in · the libc++ heading · a nested `obj` segment · `--linked` not in CI · the skip note · the empty `copy` list not frozen | TRUE | recorded |

Every round-4 fix was verified (the exception, row 21, `--linked`, the handshake, SIGPROF, rows 19 / 20); d-ci row 17 only in part (r5C-3).

### 5.6 · After round 5 — the lead's own final runs on the merged tree (no reader; no code changed)
| Id | Sev | Finding (short) | Verdict | Disposition |
|---|---|---|---|---|
| L-1 | MAJOR (in effect: the outcome of item 3 does not hold on the merged tree) | the plain `node scripts/smoke-packaged.mjs` (2026-11-22, 00:47 UTC) ends `GATE 2 FAILED`: two rows of THIS batch are red in the packaged copy — `b-refusals` row 4 ("plain / lean `--out Raw/html --in-place`: exit 0 but spixi.tokens.css was not stripped (65357 → 65357 bytes)") and row 15 ("`<out>/spixi.tokens.css` holds the committed bytes (not stripped)"). Mechanism: `mkTree` (`b-refusals.mjs:84-86`) copies `spixi.tokens.css` from `root`; in a packaged run `root` is the copy, whose stylesheet is already stripped, so a second strip changes nothing and the "was stripped" checks fail. The four rows that were red in the copy before the batch (S15 D, #1101 F-1b, A10, S14) pass; every other row passes but the 2 KNOWN. No reader ran the packaged smoke on the final tree. CI does not run `smoke-packaged`, so `redesign-ci` would stay green | TRUE (observed; `/home/claude/logs/pkg-plain.log`) | NOT fixed (lead rule 8). Fix direction: `mkTree` takes the source folder from `process.env.SPIXI_PACKAGED_FROM` when it is set (the committed tree, as `smoke-test.mjs:24649` and `:25822` do), else `pjoin(root, HTML)`; then the plain and the lean packaged runs once each. Lesson: run every gate the batch claims (here the packaged smoke) on the tree the LAST reader reads, before that reader starts |

### 5.7 · Round 6 — permitted by Damir's ruling #1753 (2026-11-22): ONE fix round in `b-refusals.mjs` + ONE fresh Opus reader
Scope of the fix (no other file): L-1 — `mkTree` copies its small Raw/html from `SPIXI_PACKAGED_FROM` when it is set and is a
folder (`PKG_FROM`, read at module start; children still get an env without it), else from the tree; row 5 compares with the
same source. r5C-1 — a helper `projectLinks` adds the project-folder rule THROUGH A LINK: an INBOUND link (outside the project
folder → `Spixi/Other`) and an OUTBOUND link (inside `Spixi/Other` → a folder outside it), each as `--out <link>` and
`--out <link>/x`, in row 3 (plain and lean) and row 4 (with `--in-place`; 72 calls); row 21 gains `<link>/Spixi/Other/x`.
Builder: Sonnet (ruling #1753 (2)). Deliberate breaks (scratch copies only):
| Break | Failing rows |
|---|---|
| L-1 revert (`mkTree` reads the tree), in a simulated packaged run (stylesheet stripped, `SPIXI_PACKAGED_FROM` = the committed folder) | 4, 15 |
| M1: the project-folder rule by the path AS WRITTEN only (`strip-release.mjs:545`) | 3, 4, 21 |
| M2: the project-folder rule by the REAL path only | 3, 4 |
| M3: the project-folder rule removed (`at = 'outside'`) | 1, 2, 3, 4, 21 |
Runs before the reader (ruling #1753 (3)), on the merged tree with the fix: pins leanfollow 154 / 154; the full smoke, the plain
and the lean packaged runs — results below. Reader: ONE fresh read-only Opus instance (ruling #1753 (4)).
Observed 2026-11-22 (cloud twin, `TZ=America/Los_Angeles`, one run at a time): full smoke `BASELINE OK — 6814 pass / the 2
KNOWN` · plain `smoke-packaged`: `BASELINE OK — 6814 pass / the 2 KNOWN` + `GATE 2 OK — the packaged tree passes the suite` (L-1
closed) · `smoke-packaged --lean-css`: `GATE 2 OK (lean css) — 6810 pass · 4 red by design (listed) · the 2 KNOWN` · no temp
folder left behind.
The base moved twice during the round (pull requests 19 and 17 merged); `work/leanfollow` merged it each time (no rebase;
`4f0eb11` with `c9d6bf6`, `9691018` with `1ad3a44`), and the three runs were run AGAIN on the final tree `9691018` (2026-11-22,
16:05–18:40 UTC): full smoke `BASELINE OK — 6914 pass / the 2 KNOWN` (= 6760 + 154) · plain `smoke-packaged` `BASELINE OK — 6914
pass` + `GATE 2 OK` · `--lean-css` `GATE 2 OK (lean css) — 6910 pass · 4 red by design · the 2 KNOWN` · CSH `pass=791 fail=0` · the
gates ✓ · pins leanfollow + fixb3 + perflean 246 / 246. The reader reads `9691018` + this brief.

**Round 6 reader (ONE fresh read-only Opus instance, ruling #1753 (4); tree `9691018`): CLEAN (0 MAJOR).** It ran the breaks
itself: M1 → rows 3, 4, 21 · M2 → 3, 4 · M3 → 1, 2, 3, 4, 21 · the L-1 revert in a simulated packaged run → 4, 15; the fixed file
in the same run 21 / 21; a `SPIXI_PACKAGED_FROM` at a stripped folder → 4, 15 red, at an empty folder → a loud crash, at a
missing path → the tree (correct); no `spixi-b-refusals-*` folder left in `/tmp` after any run.
| Id | Sev | Finding (short) | Disposition |
|---|---|---|---|
| R6-1 | MINOR | when `os.tmpdir()` is reached through a link (macOS: `/var` → `/private/var`) `tmpLinked` is true, the two OUTBOUND cases are skipped and M2 passes 21 / 21; the head's LIMITS name only case (a) of r4S-2; CI (Linux, `/tmp` not linked) catches M2 | NOT fixed (lead rule 8; no round left): recorded. Fix direction: `const tmp = realpathSync(mkdtempSync(...))` (the reader's run: the skip goes away and M2 fails rows 3, 4 with a linked `TMPDIR`) |
| R6-2 | NIT | the head still says row 4 makes "(50 calls)"; the row prints 72; the old file printed 64 (not 50: § 5.7's "50 → 72" is wrong too) — +4 cases per flag, none removed | recorded (a comment; the file stays as read) |
| R6-3 | NIT | the WHAT IT PINS lines of rows 3 / 4 do not name the round-6 link cases (only the ROUND 6 paragraph does) | recorded |
| R6-4 | NIT | a `SPIXI_PACKAGED_FROM` that is set but not a folder falls back to the tree with no note | recorded |
After the reader the base moved once more (pull request 18, `338d30f`, the Defaults batch): merged as `cec3f98` (no rebase);
every code file of the batch is byte-identical to the reader's tree (63 files; only `scripts/smoke-test.mjs` differs, by the base's
registration line); on `cec3f98`: full smoke `BASELINE OK — 6928 pass / the 2 KNOWN` · plain `smoke-packaged` `BASELINE OK — 6928 pass` + `GATE 2
OK` (the first plain run on `cec3f98` ended `GATE 2 FAILED` on ONE row of another batch, `#1147 (5)` of `pins-s4/chat` — a timing probe (`rebuiltStillQuiet`, probe at 688 ms, after the ~600 ms reveal) under load; green alone 3 / 3; the second plain run is the one quoted) · `--lean-css` `GATE 2 OK (lean css) — 6924 pass · 4 red by design · the 2 KNOWN` · CSH `pass=806 fail=0` · the gates ✓ · pins
leanfollow + defaultsb 168 / 168.

## 6 · Verdict

**FINAL (2026-11-22): CLEAN at round 6** (ruling #1753: one more fix round + one fresh Opus reader; MAJOR per round 4 → 3 → 1 → 1 → 1 → 0). L-1 and r5C-1 are closed; R6-1 (MINOR) and R6-2 … R6-4 (NIT) are recorded. The round-5 text below is kept as written.

**NOT CLEAN at round 5 — CLEAN not claimed; the batch is not delivered.** The security-only pass is CLEAN at round 5 (0 MAJOR; MAJOR of that pass per round 0 → 0 → 0 → 1 → 0). The one MAJOR of round 5 is a pin gap in item 2 (r5C-1); no round found a defect in the code that ships since round 4's regression was reverted. MAJOR per round, all readers: 4 → 3 → 1 → 1 → 1. **After round 5 the lead's own plain packaged run found L-1 (§5.6): two rows of this batch are red in the packaged copy, so item 3 does not yet hold on the merged tree.**

| Round | S (Fable 5.2) | B (Opus) | C (Opus) |
|---|---|---|---|
| 1 | 0 / 4 / 5 | 2 / 5 / 6 | 2 / 3 / 4 |
| 2 | 0 / 3 / 8 | 3 / 2 / 6 | 0 / 4 / 5 |
| 3 | 0 / 4 / 6 | 1 / 6 / 6 | 0 / 1 / 4 |
| 4 | 1 / 3 / 5 | 0 / 3 / 7 | 0 / 4 / 1 |
| 5 | 0 / 2 / 6 | 0 / 4 / 4 | 1 / 2 / 4 |

(MAJOR / MINOR / NIT.) The code files are committed exactly as the round-5 readers read them (SHA-256 list `scratch/lead/r5-tree.sha256` of the cloud twin; compared before each commit). Damir's choice (in the main chat), the options in the status doc `claude/session-leanfollow-status.md`: (a) one more fix round — the link rows of r5C-1 and the source folder of L-1, both in `b-refusals.mjs` — with one fresh reader and both packaged runs; (b) deliver as is, with r5C-1 accepted as a pin limit (the pattern of #1735) and L-1 recorded as two known red rows of the packaged copy; (c) stop the batch.
