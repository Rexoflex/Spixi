# Review brief — walktools2 (#1935–#1949)

Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE round 1. The verdict goes into § 5 when the loop closes
(#660). Prompt: project doc `claude/session-walktools2-prompt.md` (Ready by ruling #1838). Contract: `docs/contract-walktools2.md`.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 1 seed quote chat | seed index 56 = "Seed 57 Mojca Vrabec": 1000 text rows in both profiles, every id 16 bytes (the first 16 bytes of `messageIdFor(56, j)`), fixed times (newest = `ImageAnchor` − 6 h, 120 s apart), four REPLY rows in the app's own shape (`ReplyQuote.compose("", excerptOf(target), body)`) at depth 0, 1, 170, 230 whose targets sit at depth 320, 415, 485, 640 (≥ 3 older pages above the reply in both states of `FirstOlderPage50`); the file chats' top-up rule; three one-statement hooks (seed, the unseed bound, status) | `Spixi/Utils/SDevSeed.cs`, `Spixi/Utils/SDevSeedPlan.cs` (§ 4), `scripts/csh/WalkTools2SeedTests.cs`, `scripts/pins-walktools2/a-quote-seed.mjs`, re-bases in `scripts/pins-perfb1/e-image-seed.mjs`, `scripts/pins-filewalk/a-file-seed.mjs`; `docs/walk-histcs.md` rows W-5 / A-5 | #1935, #1936 |
| 2 cold-start watch | opt-in walk step `coldstart-watch` (N cold starts; a start is proven when ONE pid = the pid read right after `am start -W` and the app is in front after a fixed 10 s wait; a start that is not proven keeps the events (ONE new whole-string allowlist entry, a phone-side `grep -o -E` that lets no free text through) and the app log of its pid BEFORE the next `logcat -c`); five count rows + one facts line per such start; an event counts only from the rep's own start stamp | `scripts/device/adb-walk.ps1`, `scripts/device/adb-walk-parse.ps1`, `scripts/pins-walktools2/b-coldwatch.mjs`, `b-coldwatch-run.mjs` (by hand, pwsh), `fixtures/b/**` | #1937, #1938 |
| 3 home sets | `screens.home` may take the `sets` form of #1878; the map's home = light (the three old probes, byte-equal) + a PROPOSED dark set (#192853, #1A1C1F, #3050BD; read on the built shell in Chromium; the phone block's calibrate confirms) | `adb-walk.ps1` (Get-ScreenGap, the load-time rule), `scripts/device/a52s.json` (`screens.home` only), `scripts/pins-walktools2/c-home-sets.mjs`, `c-home-render.mjs` (by hand) | #1939 |
| 4 lockfile | `package.json` (five tools, exact) + `package-lock.json` (lockfileVersion 3; seeded from the hidden lockfile of the proven install, so the tree equals it: 122 / 122); `redesign-ci` install step = `npm ci` | `package.json`, `package-lock.json`, `.github/workflows/redesign-ci.yml`, `scripts/pins-walktools2/d-lockfile.mjs` | #1940 |
| 5 pins | `pins-walktools2/<a-quote-seed\|b-coldwatch\|c-home-sets\|d-lockfile>` in the smoke (one line after the histcs line); the re-bases of the hashed walk pins and of `pins-leanfollow/d-ci` (#1596, #1634) | `scripts/smoke-test.mjs` + the re-based pins | #1941 |

Not built, and why: the doc sentences that give the old `npm i --no-save …` line (`CLAUDE.md`, `docs/templates/**`, `docs/process.md`,
`docs/orchestration.md`) — session `docsb2` owns the docs; the old → new sentences are in the status doc. `-HistorySeed` / `-SeedIndex`
still end at index 55 (the walk does not drive the quote chat; not asked).

## 2 · How to run
- Tree: the cloud twin of `work/walktools2` (working tree over `462ba3e4`, "Merge pull request #24 from Rexoflex/work/histcs") ·
  `git diff 462ba3e4` + the new files.
- Pipeline: none (no `src/**` change) · smoke before: `BASELINE OK 7000 / the 2 KNOWN` · CSH 866 · Ixian-Core @ `097341a` present ·
  pwsh 7.4.6 at `/usr/local/bin/pwsh` · Chromium `/usr/bin/google-chrome`.
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint; Opus, fresh, read-only)
| Auditor | Scope (files) | Focus |
|---|---|---|
| A | item 1: `SDevSeed.cs`, `SDevSeedPlan.cs`, `WalkTools2SeedTests.cs`, `a-quote-seed.mjs`, the two seed-pin re-bases, `docs/walk-histcs.md` W-5 / A-5 | the reply shape equals what the app stores and matches on load (`ReplyQuote`, `SingleChatPage` reply / match / `ixian:quotejump`); the depth claim in both switch states; Seed 01–56 unchanged; top-up / unseed; the `#if`; log lines; does the walk row lead to a jump that only works if the code is right |
| B | items 2 + 3: `adb-walk.ps1`, `adb-walk-parse.ps1`, `a52s.json`, `b-coldwatch*.mjs`, `fixtures/b/**`, `c-home-*.mjs` | the evidence is saved before ANY buffer clear; the proof (pid + front) cannot pass a dead or a replaced process; the time window (year-less stamps, a record of an earlier run); the parser rows and exit codes; the old rows byte-identical; Windows PowerShell 5.1 syntax; the home sets in every reader |
| C | items 4 + 5: `package.json`, `package-lock.json`, `redesign-ci.yml`, `d-lockfile.mjs`, the smoke line, every re-based pin | does each new pin fail when the behaviour breaks (a break per key, derived cases); does a re-base admit exactly the batch's change; CI stays green with the same rows; a source-text pin states its limits in its first version (#1735) |
| S | the security-only pass (Fable 5.2, fresh, read-only, ONE pass on the FINAL tree) — all files, first `scripts/device/adb-walk.ps1` | every new adb command shape; every new line that the phone-side filter lets through; what a kept file can hold; the allowlist near misses; `[DEVSEED]` lines; nothing reaches a Release build |

## 4 · Non-negotiables and accepted dials
- Must hold: the walk's safety rules (#1520–#1522: one pinned package, the allowlist, the log filtered on the phone, the masks, no
  `uninstall` / `pm clear` / `input text`, no new entry into the app #1521); "no data" = exit 2; old parser rows keep their names and
  bytes; the seed contract (#1567, #1571); developer builds only (`SPIXI_DEV_COEXIST`); no URL / address / name / text in a log line.
- Accepted (do not re-open): jsdom stays 29.1.1 (ruling #1831); the whole-file hash pins stay (#1634); the map values move with the
  phone block (#1879 model).

## 5 · Verdict
**CLEAN at r2 + the ONE Fable 5.2 security pass on the final tree: 0 MAJOR / 0 MINOR / 5 NIT (recorded).** (#1942)

| Round | Readers (fresh, read-only) | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | Opus A (seed), B (walk scripts), C (pins + lockfile) | 2 | 7 | 15 | A MAJOR-1 (the walk rows named `work/histcs`) and B F-1 (a failed first `pidof` = a false death) fixed; every MINOR fixed except C MINOR-2 (the stderr warning of a type-less `package.json`: recorded, #1940) |
| r2 | Opus X (the fixes; the second re-base pass) | 0 | 0 | 3 | CLEAN; NIT-B1 (three unheld source lines) and NIT-C1 (the by-hand runner could reach a real adb) fixed after it, NIT-B2 recorded (#1937) |
| S | Fable 5.2, security only, the FINAL tree, after the full smoke (`BASELINE OK 7035`) | 0 | 0 | 5 | recorded (the last round, no code change after it) |

Recorded, not changed (S, with the direction of a fix): NIT-1 `adb-walk.ps1` the `finally` catch of the watch rep swallows an `ADBWALK-STOP` of the evidence save (no command of today can be refused there) → rethrow on the prefix · NIT-2 `$script:WatchEventRe` `(,-?[0-9]+)*` after the package has no count limit (integers at the start of a text field pass: digits and commas only) → bound the count per tag · NIT-3 the parser trusts the payload pid, not the logger pid column (a forged event on the TEST phone can change a count; nothing leaks) → accepted · NIT-4 the app-log pull uses the pid NUMBER of the start (pid reuse within ~10 s; the worst line is a connect line, accepted by #1522) → none · NIT-5 `grep` without `-a` (a NUL byte drops lines → "no data") → check on the phone block. Earlier records: r1 B F-5 (the parser classes run only in the by-hand runner, stated in the pin), F-8 = #1938 (numeric `killinfo` of every process kept), C NIT-4 / NIT-5 / NIT-8 (d-ci's anchor throws as at the base; two stale workflow comments; "do not run `npm audit fix`" for the docs), A NIT on the Artifact of the histcs walk (the main chat), r2 NIT-B2.

Gates on the final tree before the last reader: smoke `BASELINE OK — 7035 pass / the 2 KNOWN` · CSH `pass=876 fail=0` · `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ · the walk pins 214 / 214 · `b-coldwatch-run.mjs` 26 / 26 · `b-screens-run.mjs` ALL PASS · `c-parser-run.mjs` 15 / 15.

The code files are committed exactly as the Fable reader read them (SHA-256, first 16 hex; the fixtures are in the same commit):

| File | SHA-256 |
|---|---|
| `.github/workflows/redesign-ci.yml` | `ef3b89ac53a99b14` |
| `Spixi/Utils/SDevSeed.cs` | `0df85fde937c7e2b` |
| `Spixi/Utils/SDevSeedPlan.cs` | `f13b7e6a09db75d3` |
| `scripts/device/a52s.json` | `c1262db563a0ba80` |
| `scripts/device/adb-walk-parse.ps1` | `bff0b1dcff42f16d` |
| `scripts/device/adb-walk.ps1` | `02ef800d4cbf3034` |
| `scripts/pins-filewalk/a-file-seed.mjs` | `0e02fef1d8dc85bd` |
| `scripts/pins-filewalk/b-walk-steps.mjs` | `cdc1f11a512b529f` |
| `scripts/pins-fixb3/c-walk.mjs` | `5029e29a12acf233` |
| `scripts/pins-leanfollow/d-ci.mjs` | `be03dcc858d9bfc4` |
| `scripts/pins-perfb1/e-image-seed.mjs` | `72c97bdec20b6477` |
| `scripts/pins-perfb1toggle/b-walk.mjs` | `6eecf774eec3e96e` |
| `scripts/pins-photo1a/c-walk.mjs` | `c72f9d76761a342e` |
| `scripts/pins-walktools/b-screens-run.mjs` | `3e2ebe5912c1fd36` |
| `scripts/pins-walktools/b-screens.mjs` | `c977e8d7c5190478` |
| `scripts/pins-walktools/c-parser.mjs` | `3c6da64381d6e12c` |
| `scripts/smoke-test.mjs` | `cacd61512eb77f4b` |
| `package-lock.json` | `71c06c921c3d1a1e` |
| `package.json` | `4da6d0a5a63ca48b` |
| `scripts/csh/WalkTools2SeedTests.cs` | `2c3cc5ee2268bcd4` |
| `scripts/pins-walktools2/a-quote-seed.mjs` | `18626188746790e5` |
| `scripts/pins-walktools2/b-coldwatch-run.mjs` | `31fd1d419bf9465a` |
| `scripts/pins-walktools2/b-coldwatch.mjs` | `8d98b533b0876d6c` |
| `scripts/pins-walktools2/c-home-render.mjs` | `55426f7325cb05d0` |
| `scripts/pins-walktools2/c-home-sets.mjs` | `cdb95b942c164cb7` |
| `scripts/pins-walktools2/d-lockfile.mjs` | `01d91a34a619c441` |
