# Quality plan — checks, timing, and the controls against bloat

Status: PLAN (2026-10-02, cloud session after session 3). DECISIONS row owed (session 4 assigns the number).
Research and sources: Project doc `claude/quality-research-2026-10-02.md`.
Scope rule: Core stays clean. Every item here is Spixi-side (shells, bridge, Spixi C#, CI, docs).

## 1 · The items and when they land
| # | Item | When |
|---|---|---|
| 17 | CodeQL default setup (C# without a build + JS) | BEFORE FREEZE |
| 6 | Basic GitHub Actions on `redesign/frontend`: smoke + csh on every push (full MAUI build later) | BEFORE FREEZE |
| 13 | Isolation check that fails: chat imports no wallet or other-shell module; `ixian:` only in `src/bridge/` | BEFORE FREEZE |
| 14 | Bridge contract file: one schema per verb (name, args, types, direction), checked against `mock.js`, `native.js`, the C# handlers. Start with the new verbs | BEFORE FREEZE |
| 15 | Property-based tests (fast-check JS, FsCheck C#) on the new payload parsers (reply, edit, voice, contact) and the sanitiser | BEFORE FREEZE (with the features) |
| 1 · 2 · 18 | Playwright behaviour suite · visual regression · axe-core accessibility | Characterization (after freeze) |
| 3 · 4 · 5 | csh helpers · Stryker (incremental) · split the smoke suite | Before the refactor picks |
| 16 | SharpFuzz on the NEW C# message parsers only (short CI run + nightly) | After freeze, parsers stable |
| 22 | Speed budget in Playwright: shell long tasks + bundle size ceilings | At the strip ([P1] retires) |
| 19 | Security-gate script: diff verbs / `spixi.*` keys / WebView settings / HTML sinks / fetches / log lines vs `0e85a4b8` | Before the gate re-run + handover |
| 20 | Reviewer calibration: seed 3–5 known bugs in a #46 copy, record how many the auditors find | Once per milestone, from the refactor |
| 7 · 9 · 8 | 2–3 emulator flows + full MAUI CI (4 TFMs) · C# analyzers + nullable as errors · `// @ts-check` + tsc | After the refactor |
| 10 · 11 · 12 · 21 | Dependabot + secret scanning · PR template · release process (versions, changelog, staged rollout, kill switches, store crash reports) · SBOM + OpenSSF Scorecard | Before TestFlight |
| 21b | Reproducible Android build (Signal / F-Droid model) | v1.1 |

Not doing: large Appium suites · Android Macrobenchmark / Baseline Profiles (native-only) · coverage % targets · SLSA L3 now.
No tool replaces the device walk: WebView engines differ per platform (WKWebView, Android WebView, WebView2).

## 2 · Controls against bloat
| # | Control | Rule |
|---|---|---|
| C1 | Overlap | When a Playwright test covers a behaviour, delete the source-text pins for that behaviour in the same batch. After characterization the total check count goes DOWN. Record removed pins in the DECISIONS row. |
| C2 | Keep items light | Fuzz only the new parsers, not Core · analyzers on new and changed files only · reviewer calibration once per milestone, not per batch · emulator flows 2–3, not a suite. |
| C3 | Process docs | After the freeze, the required export is: DECISIONS rows · handoff · status-log entry. Every other doc changes only when the session changed its subject. |
| C4 | Each check earns its place | A new check names the bug type it catches (a real one, seen or plausible). |
| C5 | Periodic prune | Every ~3 months (or at each milestone): list checks that caught nothing and cost maintenance → delete them, one DECISIONS row. |

## 3 · Status of #13–#21 (2026-11-27, session `qtools`, DECISIONS #2070–#2079)
| # | Item | Status | Where |
|---|---|---|---|
| 13 | Isolation fitness check | BUILT — fails CI (rules ISO-1 … ISO-15, C# + shells; WebView settings read against the census table of the gate doc) | `scripts/quality/isolation-check.mjs`, pin `pins-qtools/c-isolation` |
| 14 | Bridge contract file | BUILT — generated, `--check` fails CI on a verb added, removed or moved | `docs/bridge-contract.json`, `scripts/quality/bridge-contract.mjs`, pin `pins-qtools/c-contract` |
| 15 | Property tests (fast-check, JS) | BUILT — in the smoke, fixed seed; 5 defects held as QTOOLS-KNOWN rows. FsCheck (C#) planned with #16 | `scripts/pins-qtools/e-props.mjs`, `scripts/quality/parsers.md` |
| 16 | SharpFuzz on the new C# parsers | PLANNED — "after freeze, parsers stable" (§ 1) | — |
| 17 | CodeQL (C# without a build + JS) | BUILT — workflow; local baseline 0 C# · 134 JS (all read false) | `.github/workflows/codeql.yml`, `docs/codeql-baseline.md` |
| 18 | axe-core | BUILT IN PART — a REPORT step over the built shells (no Playwright suite yet); does not fail CI | `scripts/quality/a11y-scan.mjs`, `docs/a11y-baseline.md` |
| 19 | Security-gate script | BUILT — fails a pull request with a gate-trigger change and no gate row; calibrated on 30 merges | `scripts/quality/gate-diff.mjs`, `scripts/quality/gate-diff.md`, pin `pins-qtools/d-gatediff` |
| 20 | Reviewer calibration | PLANNED — "once per milestone, from the refactor" (§ 1) | — |
| 21 | SBOM + OpenSSF Scorecard | BUILT — SBOM artifacts on every push to `redesign/frontend`; Scorecard runs only on the default branch `master` (the action's rule), so it is inert until the file reaches `master` | `.github/workflows/sbom.yml`, `.github/workflows/scorecard.yml`, `docs/scorecard-baseline.md` |
| 21b | Reproducible Android build | v1.1 (unchanged) | — |
