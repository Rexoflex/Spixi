# Review brief — Walk tools (`walktools`, #1875–#1889)

Work order for the #46 adversarial loop (docs/process.md). Written BEFORE round 1. The verdict goes into § 5 when the loop closes.
Prompt: project doc `claude/session-walktools-prompt.md`. Contract: `docs/contract-walktools.md`. Mechanisms (with the measured
numbers): `docs/walktools-mechanisms.md`. Packet: `docs/be-review-pack/P93-walktools-seed-voice-ids-walk-scripts.md`.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 1 flakes | `GATE 54 (a4)` waits for STATES (the exit-transition premise checked; two frames of the gate's own rAF stub after the open) instead of 50 + 30 ms; `pins-fixb1/e-header` boots and waits for the page's own `ixian:onload` instead of a fixed 900 ms (a 20 s hang guard fails with the reason) | `scripts/smoke-test.mjs` (GATE 54 (a4) clause only), `scripts/pins-fixb1/e-header.mjs` | #1875, #1876, #1877 |
| 2 screen probes | `screens.<name>` may hold `sets` (light / dark; only chat and viewer); a screen passes when one set passes; the chat / viewer sets read only chrome colours. The map VALUES stay until the operator block | `scripts/device/adb-walk.ps1`, `scripts/pins-walktools/b-screens.mjs` (+ by hand `b-screens-run.mjs`) | #1878, #1879 |
| 3 parser | "first swipe -> 1st page" of `-HistorySeed` by rule I-3a; 17 optional rows per older page (history pages 1–3, history-seed page 1) from five fixed-word lines; old rows byte-identical | `scripts/device/adb-walk-parse.ps1`, `scripts/pins-walktools/c-parser.mjs` (+ by hand `c-parser-run.mjs`, `fixtures/**`) | #1880, #1881 |
| 4 seed voice ids | `SDevSeedPlan.rowIdFor`: a voice row's id = the first 16 bytes of the old 32-byte id (a real id's length; the play check accepts it); the writer and the top-up test use it | `Spixi/Utils/SDevSeedPlan.cs`, `Spixi/Utils/SDevSeed.cs` (one line), `scripts/csh/WalkToolsSeedTests.cs`, `scripts/csh/FileWalkSeedTests.cs` (5 id lines re-based) | #1882 |
| 5 jsdom rows | the six `#346` / `N19` rows pass on jsdom 29.1.1 and 31.0.1 (the probe loads the real token sheet; `sub()` resolves a literal `var()` through the probe's own custom properties; each version compares its own serialization); row 2 tightened | `scripts/smoke-test.mjs` (`#343` block, about `:8799`–`:8945`) | #1883 |
| re-bases | the hashed walk pins, after a look at the diff (#1596, #1634); fixb3 h4d REWRITTEN to rule I-3a; the seed-table cut of `pins-fixb3/c-walk` fixed (it ran into `$script:MemDefs`) | `scripts/pins-perfb1toggle/b-walk.mjs`, `scripts/pins-photo1a/c-walk.mjs`, `scripts/pins-filewalk/b-walk-steps.mjs`, `scripts/pins-fixb3/c-walk.mjs`, `scripts/pins-filewalk/a-file-seed.mjs` | #1884 |

Not built, and why: the map values of `a52s.json` (the prompt: only by the operator block's calibrate); the `(a5)` timing miss of
GATE 54 is an APP defect in `src/bridge/contacts-page.js:295` (`src/**` belongs to session fixb4) — recorded (#1877); the CI jsdom pin
and the install line (`.github/**` belongs to session leanfollow) — owed.

## 2 · How to run
- Tree: the cloud twin `/home/claude/spixi`, branch `work/walktools` from `338d30f4`, the working-tree diff (`git diff`, `git status`).
- Pipeline: none (no `src/**` change; the two `--check` gates green). Ixian-Core @ `097341a` beside the repo. Smoke before:
  `BASELINE OK 6774 / the 2 KNOWN`. CSH before 806, now `pass=812 fail=0`.
- Tools: jsdom 29.1.1 (`node_modules`); jsdom 31.0.1 can be installed in a scratch folder; pwsh 7.4.6 at `/usr/local/bin/pwsh`
  (Linux — NOT Windows PowerShell 5.1, which runs the walk on Damir's PC); .NET SDK 10.0.115.
- Pins: `node scripts/run-pins.mjs <dir/mod>` (writes and removes `scripts/.run-pins-tmp.mjs`). By hand (need pwsh):
  `node scripts/pins-walktools/b-screens-run.mjs --pwsh /usr/local/bin/pwsh`, `node scripts/pins-walktools/c-parser-run.mjs`.
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint; read-only; findings with `file:line`, graded MAJOR / MINOR / NIT)
| Auditor | Scope (files) | Focus |
|---|---|---|
| A (Opus) | item 1 + item 5: the GATE 54 (a4) hunk and the `#343` hunk of `scripts/smoke-test.mjs`, `scripts/pins-fixb1/e-header.mjs` | does each row now wait for the STATE it needs and never for a time; can a real fail be hidden (a retry, a guard that passes, a premise that lets the row pass vacuously)? is each row still red on its deliberate break (#802) on BOTH jsdom versions (item 5)? does item 5 weaken any assertion? is the row count unchanged? |
| B (Opus) | items 2 + 3 + the re-bases: `scripts/device/adb-walk.ps1`, `scripts/device/adb-walk-parse.ps1`, `scripts/pins-walktools/**`, the four re-based walk pins | correctness on Windows PowerShell 5.1 (syntax and semantics that differ from 7), the map rule "a failed screen check gives no data or a halt, never a wrong number", the old form byte-equal in behaviour, the old parser rows byte-identical, rule I-3a, the optional page rows, no new adb command / verb / typed input / file write, the raw-log-line guard, the pins (each key red on its break; a re-base that hides a real change) |
| C (Opus) | item 4: `Spixi/Utils/SDevSeedPlan.cs`, `Spixi/Utils/SDevSeed.cs`, `scripts/csh/WalkToolsSeedTests.cs`, `scripts/csh/FileWalkSeedTests.cs`, `scripts/pins-filewalk/a-file-seed.mjs`; and the docs `docs/walktools-mechanisms.md`, `docs/be-review-pack/P93-…` | the mechanism (id lengths, `isVoiceIdHex`, Core's 16), every place that derives a seed id, the top-up / remove paths with an OLD seed on the phone, no Release path, the tests' breaks; every claim of the two docs against the tree |
| S (Fable 5.2, ONCE, on the final tree, before the push) | security only: `scripts/device/**`, `Spixi/Utils/SDevSeed*.cs` | #1312 lens: no new verb / push / key / fetch / log line / file path; no path into a Release build; the adb allowlist; no typed input; no raw log line into the summaries |

## 4 · Non-negotiables and accepted dials
- Must hold: no app behaviour change; the PARAMOUNT isolation invariant; the frozen bridge; C# touches no risky parts; #1522 ② (no
  typed input into the app); the adb allowlist does not grow; the map rule (a failed screen check = "no data" or a halt, never a wrong
  number); the old parser rows byte-identical; each deliberate break stays red (#802); a source-text pin states its limits in its first
  version (#1735 — a gap of the stated class is a NIT).
- Accepted (do not re-open): the scope of the prompt (items 1–5 as written there); the new page rows are OPTIONAL (the lead's reading
  of "gives no data for its rows", #1881); the map values move only with the operator block (prompt); the item-1 measurement method
  (load B = a loaded event loop in the process, the stand-in for a full smoke, L153).

## 5 · Verdict
**CLEAN at r3** (0 MAJOR in r3; every MINOR of r1–r2 fixed; the one MINOR of r3 recorded with its reason, below) + the ONE Fable 5.2
security-only pass on the final tree: **0 MAJOR / 0 MINOR** (3 NIT recorded). DECISIONS #1885.

| Round | Readers (fresh, read-only) | MAJOR | MINOR | Fixed in |
|---|---|---|---|---|
| r1 | A, B, C (Opus) | 1 (A M1: e-header all red on jsdom 31 — b2Kit cannot capture there) | 11 (A m1–m4; B M1 stray load in branch 2, M2 page mis-pairing, M3 notes cut, M4 the calibrate cannot take cal-14 / cal-15, M5 the pill alone is a white strip; C 2 test lines) | r1 fixes |
| r2 | X, Y (Opus) | 0 | 5 (X: the token subset's false reds, the onload contract at the load end, (a4) tied to two frames; Y: the rep-note budget, the contract table) | r2 fixes |
| r3 | Z (Opus) + S (Fable 5.2, security only) | 0 | 1 (Z: the viewer / file-chat check note is still cut — diagnostic only) | recorded |

**Recorded, not changed (the last round; code files left exactly as the readers read them):**
- r3 MINOR (Z-1): `Invoke-FileShot` (`scripts/device/adb-walk.ps1` ~:2063) still writes `viewer check failed: no set matches: …`; behind
  `PNG deleted (chat check)` and the re-open note the counts are cut (the parser's summary cuts a status note at 80, run.json at 120).
  Why not changed: no number is wrong (a failed check gives "no data"); rep 1 in run.json and calibrate.json keep both counts; one more
  code change needs one more Opus round and one more Fable pass. Fix direction: the compact form in `Invoke-FileShot` for the sets form
  (as `Get-PreCheckText`), a by-hand case with the real prefix, the re-base of the hashed walk pins.
- Fable NIT-1: `Get-ProbeVerdict` does not fail closed on its own for an empty set list or `minMatch 0` (only `Get-ScreenGap` refuses
  them, and it gates every caller; the class is inherited from the base's `probes: []`). Direction: Ok false for 0 sets / 0 probes / Min < 1.
- Fable NIT-2: the usage text prints a raw map key (console only; the operator's own file). Direction: `Get-SafeNote $scrKey`.
- Fable NIT-3: a set's strength rests on the map values, not on a load rule (either set may pass; a set may hold 1 probe). Direction: refuse
  a set whose `minMatch` is not its probe count (as for `accountScrolled`). **The operator block's map commit sets minMatch = the probe
  count (4) for every chat / viewer set (#1879).**
- Z NITs 3, 4, 7 (comments only: `b-screens.mjs:3` "the notes name the set", `adb-walk.ps1:3598` "more than 4 sets", `smoke-test.mjs`
  ~:8858 / ~:8932 "jsdom drops a var() shorthand" — true on 29 only). Z NITs 2, 5, 6 (docs) are fixed.
- r2 Y NIT 2: equal counts in branch 2 are necessary, not enough (one stray AND one lost load) — not reachable today (mechanisms § 3a).

**Code files as the last readers read them (SHA-256, first 12):** `scripts/smoke-test.mjs` 7d7363d4639a · `scripts/pins-fixb1/e-header.mjs`
9239f2c4423a · `scripts/device/adb-walk.ps1` 074f7f0e65d1 · `scripts/device/adb-walk-parse.ps1` e502ac2b6003 · `Spixi/Utils/SDevSeed.cs`
91acd4eed047 · `Spixi/Utils/SDevSeedPlan.cs` 8d761ea03ffe · `scripts/csh/WalkToolsSeedTests.cs` 3c82ada9127c ·
`scripts/csh/FileWalkSeedTests.cs` 5e0df89726d9 · `scripts/pins-walktools/b-screens.mjs` 11fccd3662fc · `scripts/pins-walktools/c-parser.mjs`
25c33c4e3982. Gates on that tree BEFORE r3 started: smoke `BASELINE OK 6791 / the 2 KNOWN`, CSH 812, both `--check` gates, the walk
pins and both by-hand runners green.
