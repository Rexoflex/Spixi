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
