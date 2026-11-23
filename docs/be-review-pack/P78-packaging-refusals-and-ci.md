# P78 · TWO PACKAGING REFUSALS, THE PLAIN PACKAGED SMOKE AND TWO CI STEPS (batch leanfollow)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (build-time and CI only; a refusal refuses MORE; with the lean switches off the package is byte-equal to the base) | no | none | the existing `SpixiLeanCss` / `SpixiLeanJs` (defaults unchanged, OFF) | 4 min |

**Look here first:** `Spixi/Spixi.csproj` `SpixiLeanGuard` `:557-572` and `SpixiLeanReleaseHtml` `:684-695` (the new `<Error>` tasks) · `scripts/strip-release.mjs` `outFolderRefusal` `:511`, `outPreflight` `:566`, `renameRetry` `:487` · `scripts/smoke-packaged.mjs` `gitFreeEnv` `:194`, `gitInitCopy` `:207`, `removeLinks` `:326`, `stopPoint` `:80` · `.github/workflows/redesign-ci.yml` steps `xparser` `:97`, `msbuildh` `:110` · pins `scripts/pins-leanfollow/b-refusals.mjs` (21 rows), `c-plain-packaged.mjs`, `d-ci.mjs` (17 rows).

**DECISIONS:** #1583 (the park of P-07) · #1585, #1586, #1625 (2)–(3) · this batch #1776–#1781.

## What and why
- **R1.** The FIRST task of `SpixiLeanReleaseHtml` is an `<Error>` when `SpixiLeanJs` is not `false`: a target that sets it after `SpixiLeanGuard` passed can no longer reach the parked JS strip.
- **R2.** One `outFolderRefusal` for every `--out` of `strip-release.mjs` (plain and lean), and the same rule as `<Error>` tasks in the csproj: refused = `Spixi/Resources`, `Spixi/Platforms` and every folder of the project folder that is not under `obj` or `bin` (MAUI's default globs would pack a stripped copy there). Only exception: `Raw/html` itself with `--in-place`. A link (`ReparsePoint`) at `spixi-lean`, `spixi-lean/html` or the stamp is refused before any delete.
- **The write.** A temp file (`wx`) → read back → rename (a Windows retry). No partial file is left.
- **Plain `smoke-packaged`.** The copy is a git work tree with no history (`git init -q --template=`, the caller's `GIT_*` removed but `GIT_EXEC_PATH`); the Ixian-Core sibling is linked beside it; every link is recorded before it is made and removed in `finally`; a signal stops it cleanly. The 4 rows that were red in the copy are green (`lean-expected-reds.json` `copy: []`). L-1 (found after round 5, closed in round 6, #1783): two rows of this batch were red in a packaged copy; their scratch tree now takes the stylesheet from `SPIXI_PACKAGED_FROM`, and the plain and the lean packaged runs pass.
- **CI.** Two steps in the `smoke` job after CSH: the parser cross-check and the MSBuild harness (`--fake`, then `--real`). Each `if: !cancelled()`, `timeout-minutes: 10`, logged and uploaded. No new action, secret, permission, trigger or fetch; repo code only; dotnet telemetry off.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A lean build packs a second, stripped html copy | R2: no out folder inside the project folder but under obj / bin | `b-refusals` rows 1–21 (plain + lean, both paths); harness `--real` scenarios `rawiop*`, `packed*` |
| A planted link makes the build delete or write outside obj | the link `<Error>`s and the script's link check before `RemoveDir` | harness `link*`, `stamplink`; `b-refusals` |
| The parked JS strip runs | R1, the guard, and the second `<Error>` in the lean target | harness `r1late`; `a-gates` |
| A CI step leaks or widens the workflow | the workflow outside the new region is held by SHA-256 of the base | `d-ci` row 17 `baseShaOk` |
| The plain smoke deletes through a link | links are removed by themselves before any recursive delete | `c-plain-packaged` (56 checks, handshake stand-ins) |

## Recorded limits (review rounds 4–5)
- **r4S-1 → the obj / bin exception keeps its round-2 form** (a lexical test, the real path checked only for "outside"): a stricter real-AND-lexical test broke every default Release build in a checkout reached through a linked parent. A link planted INSIDE `obj` or `bin` that points back into the project folder is not refused (csproj comment `:652`).
- **r5C-1 (round 5: a pin gap) is closed in round 6 (#1783):** rows 3, 4 and 21 of `b-refusals` decide the project-folder rule through an inbound and an outbound link; the rule cut to one view turns a row red.
- **R6-1 (round 6, MINOR):** where the temp folder itself is reached through a link (macOS) the two outbound cases are skipped; CI on Linux runs them.
- **r5C-2:** the same limit in the other direction: a link inside a project folder that points into `obj` is also accepted. A per-view rule (each view that says "inside the project" must also say "under obj / bin") closed both in the reader's run — a design choice for Damir.
- **r5C-3 / r5S-2:** `d-ci` row 17 hashes the workflow OUTSIDE the region between two comment anchors; a NEW step inside that region (a fetch, a step that overwrites the harness) passes. The diff review sees it.
- **r5S-1 (as at the base):** `Spixi-PushService/Resources/**` is outside `Spixi/`, so an `--out` there is accepted.

## NOT proven
The harness `--real` runs on Linux .NET SDK 10.0.x; the Windows behaviour of `GetAttributes` on a junction and the rename retry are read from the docs, not run.
