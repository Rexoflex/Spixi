# Handoff 2026-11-17 (Photo open 1a) — PO-0, PO-1, PO-5 and the walk step are built; PO-3 / PO-6 are parked (the Fable 5.2 limit); the #46 loop ended "CLEAN NOT CLAIMED" at round 5 on a pin gap — NOT delivered

File name: `docs/handoff-2026-11-17-photo1a.md`. Read this FIRST, then DECISIONS #1715–#1725. Number block of this
session: #1715–#1734 (used: #1715–#1725; #1726–#1734 stay empty) · lessons L231–L236 (used: L231–L235) · packets
P65–P70 (used: P65, P66, P69; P67 / P68 parked in `docs/parked/`; P70 stays empty). The main chat gives the next block.

## 0 · State
- Branch: `work/photo1a` in the session's cloud clone, committed LOCALLY, **NOT pushed** (#1724: the loop is not
  CLEAN) · base: `redesign/frontend` @ `c0a76176` "Merge pull request #14 from Rexoflex/work/docs-2026-11-17" · the whole
  branch as one patch: `photo1a-branch.patch` (sent to Damir in the session chat; also the project doc pointer in the
  status doc) · merge = Damir.
- Smoke: the final tree — see the status doc `claude/session-photo1a-status.md` (expected `BASELINE OK 6590` = 6564 +
  26: `pins-photo1a/a-open` 11 + `c-walk` 15; the re-based keys add no row) · baseline: `redesign-ci` on `3066e658` and
  `c0a76176` `BASELINE OK — 6564 / the 2 KNOWN`, CSH 633; this session's own run of the untouched tree: 6553 ✓ + 11 red
  rows explained (2 inline rows need `../Ixian-Core` beside the copy — the copy lacked it; 9 rows of `pins-s20/r-apps-run`
  and `pins-s14/a1-backup-back` green alone) · tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter
  0.25.1 · tree-sitter-c-sharp 0.23.5 · .NET SDK 10.0.115 · PowerShell 7.4.6 · CSH `pass=655 fail=0` (= 633 + 22).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` 281 files ✓ · no generator ran (no
  file under `src/` or the built html).
- Review: CLEAN NOT CLAIMED at round 5 · brief `docs/review-brief-photo1a.md` § 5 (every round, every MAJOR) · models:
  lead Opus; builders Opus (PO-0 / PO-1 / PO-5), Fable 5.2 (PO-3 / PO-6 + their round-1 fix), Sonnet (the walk, the
  pins, every re-base); readers Fable 5.2 (security, rounds 1–2), Opus (rounds 1–5 correctness / pins).
- ⚠ C# UNCOMPILED: `Spixi/Pages/Chat/SingleChatPage.xaml.cs`, `Spixi/Utils/SharedItems.cs`, `Spixi/Utils/SpixiFlags.cs`,
  `Spixi/Pages/Downloads/DownloadsPage.xaml.cs`, `Spixi/Pages/Settings/SettingsPage.xaml.cs` (`PhotoOpenRules.cs` runs in
  the harness). Windows compiles in `redesign-ci`; Android in the operator block; iOS / Mac in the Apple phase.
- Definition of done: no `docs/release-readiness.md` row changed.
- Still owed: Damir's choice #1724 · #1719 (PO-3 / PO-6) · the operator block (its steps: the status doc).

## 1 · What this session did
| Item | Result | Evidence | MC item |
|---|---|---|---|
| PO-1 media after the first paint | built, switch `PhotoMediaAfterPaint` | #1715, P65, csh, a4–a6 | `n-20261117-po1-media-after-paint` |
| PO-5 fewer file checks | built, switch `PhotoFewerFileChecks` | #1716, P66, csh, a7–a8 | `n-20261117-po5-fewer-file-checks` |
| PO-0 the C# lines | built (dev lines) | #1717, P69, a1–a3 | `n-20261117-po0-open-log-lines` |
| W the walk step | built (opt-in) | #1718, P69, c1–c15, fake-adb dry runs | `n-20261117-po0-open-log-lines` |
| PO-3 thumbnail once | STOPPED, parked | #1719, `docs/parked/` | `n-20261117-po3-thumbnail-once` |
| PO-6 waveform once (C#) | STOPPED, parked | #1719 | `n-20261117-po6-voice-waveform-once` |

## 2 · Walk
No walk sheet (the batch changes no screen). The operator block did not run (the batch is not delivered). Its steps
are in the status doc.

## 3 · Proposed next steps (the main chat decides)
1. Damir rules #1724 (recommended (a): one more round for the round-5 pin findings, then push and the operator block).
2. Damir rules #1719 (recommended (a): PO-3 / PO-6 after the Fable reset, from the parked patch).
3. The spec for "Photo open 1b" (#1721) waits for `fixb2`'s merge.

## 4 · Open questions
| For | Question | Blocks |
|---|---|---|
| Damir | #1724 — (a) one more round · (b) accept the pin's limits and deliver · (c) stop | the push, the operator block |
| Damir | #1719 — (a) PO-3 / PO-6 after the Fable reset · (b) Opus for that fix + readers · (c) drop, let images by URL carry it | the cold-open gain, the LRU of bytes |

## 5 · Recorded, not changed
- The round-5 findings (brief § 5): the `RowCache` lifetime unpinned (MAJOR, pin), `owner = null!`, `readRows` position,
  two brittle whole-page counts, the new overload body, `MediaHold.release` without `held.Clear()`.
- PO-5's accepted losses: a file deleted outside the app during a load; a delete in the gap between its `File.Delete` and
  its increment (#1716).
- The walk: a transient `pidof` failure followed by a new process, and an app death between the pre-intent `pidof` and
  the intent, can still record one first open as warm (round-3 NIT-1; a window of one adb round trip).
- The PO-0 counters (`mediaCounts.*`) run in a store build too (cheap locked increments, no line written).
