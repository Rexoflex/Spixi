# Handoff 2026-11-17 / 18 (Photo open 1a) — PO-0, PO-1, PO-3, PO-5, PO-6 and the walk step are built; the one push-text builder is in; #46 CLEAN; merged with Fix batch 2; WALK-READY by #1546 once the full smoke reads green and the branch is pushed

File name: `docs/handoff-2026-11-17-photo1a.md` (final state, 2026-11-18). Read this FIRST, then DECISIONS #1715–#1732. Number block of this
session: #1715–#1734 (used: #1715–#1732; #1733–#1734 stay empty) · lessons L231–L236 · packets P65–P70 (all six used). The main chat
gives the next block. Rulings used: Damir's #1641–#1643 and #1726; the main chat's #1736, #1737, #1746 (main-chat rows, not rows here).

## 0 · State
- Branch: `work/photo1a` in the session's cloud clone. Base `redesign/frontend` @ `c0a76176`, merged with `redesign/frontend` @ `55feaddc`
  (Fix batch 2; merge commit `8681ad1`). Delivery by #1546: the lead pushes `work/photo1a` after the full smoke; Damir opens the pull request
  (base repository `Rexoflex/Spixi`, base branch `redesign/frontend`; never `ixian-platform/Spixi`) and merges (a merge commit, #1505).
- In the branch: PO-1 (#1715, P65) · PO-5 (#1716, P66) · PO-0 (#1717, P69) · W the walk steps (#1718, P69) · **PO-3 / PO-6, the thumbnail and
  waveform STORE, back and fixed** (#1728, P67 / P68; the parked patch is removed) · **ONE builder `UiCommandText`** for the push text, S15 O-11
  kept (#1729, P70) · the N51 clock moved behind `shellOverlayOpen = false;` (#1729) · the merge with Fix batch 2 and its pin re-bases (#1731).
- Numbers: CSH **766 pass / 0 fail** (= base 643 + 123 of this batch; observed on the merged tree) · pins on the merged tree **700 / 0** (every
  module that reads an edited file + the photo1a, fixb1, fixb2 sets) · `cs-syntax-check` 284 ✓ (before the merge) · the full smoke of the merged
  tree: **BASELINE OK 6660 / the 2 KNOWN** (expected: 6617 + the new rows of `pins-photo1a/a-open`, `b-store`, `c-walk`; the 2 KNOWN stay) · tools as before: jsdom 29.1.1 ·
  eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 · .NET SDK 10.0.x · PowerShell 7.4.6.
- Review (#46): **CLEAN** (#1730; `docs/review-brief-photo1a.md` § 5, "Rounds 6–9"). Store round 7 (Fable 5.2): 0 MAJOR, 900 real-thread stress runs,
  0 previews of a deleted file at rest. The open pin gaps = the recorded limits F1 / F2 of `pins-s15/c-transport` (INHERITED, #1727, #1746 (a)).
- Models: lead Opus; builders Fable 5.2 (the store, fix rounds 1–3), Opus (PO-0 / PO-1 / PO-5, the one builder), Sonnet (the walk step, every pin,
  the docs); readers by #1606: Fable 5.2 (security, the store), Opus (correctness, pins).
- ⚠ C# UNCOMPILED: `SingleChatPage.xaml.cs`, `SharedItems.cs`, `SpixiFlags.cs`, `PhotoOpenRules.cs`, `ChatMediaStore.cs`, `ChatMediaStoreRules.cs`,
  `UiCommandText.cs`, `Utils.cs`, `DownloadsPage.xaml.cs`, `SettingsPage.xaml.cs`, `ContactDetails.xaml.cs`, `LaunchPage.xaml.cs`, `SContacts.cs`,
  `UIHelpers.cs` (the pure files run in the harness; Windows compiles in `redesign-ci`; Android in the operator block; iOS / Mac in the Apple phase).
- Definition of done: no `docs/release-readiness.md` row changed.

## 1 · What this session did
| Item | Result | Evidence | MC item |
|---|---|---|---|
| PO-1 media after the first paint | built, switch `PhotoMediaAfterPaint` | #1715, P65, csh, a4–a6 | `n-20261117-po1-media-after-paint` |
| PO-5 fewer file checks | built, switch `PhotoFewerFileChecks` | #1716, P66, csh, a7–a8 | `n-20261117-po5-fewer-file-checks` |
| PO-0 the C# lines | built (dev lines + `[FLAGS] photo1a`, four tokens) | #1717, P69, a1–a3 | `n-20261117-po0-open-log-lines` |
| W the walk step | built (opt-in) | #1718, P69, c1–c15, fake-adb dry runs | `n-20261117-po0-open-log-lines` |
| PO-3 thumbnail once | built (Android only), switch `PhotoThumbStore`; store round 7 CLEAN | #1728, P67, `b-store` b1–b16, `ChatMediaStoreTests` | `n-20261117-po3-thumbnail-once` |
| PO-6 waveform once (C#) | built (Android only), switch `VoicePeaksStore` | #1728, P68 | `n-20261117-po6-voice-waveform-once` |
| the one builder | built, no switch (byte-identical, 350,232 cases) | #1729, P70, csh, `pins-s15/c-transport` | (the red smoke row of #1724) |
| the merge with Fix batch 2 | done, pins re-based after a look | #1731 | — |

## 2 · Walk
No walk sheet (the batch changes no screen). The **operator block** (the memory rows and the cold-open rows, #1737) A → B → A has not run: it starts
only when the main chat gives Damir the step. Its steps are in the status doc `claude/session-photo1a-status.md`.

## 3 · Next sessions (the main chat decides)
1. The operator block of this batch (the before / after numbers of the open, the memory of the LRU of bytes, the cold open with the store).
2. **Photo open 1b** — the shell half (#1721), now that `fixb2` is merged.
3. **Images by URL** (#1642, #1720) — it CAN read the 320 px JPEG of a message by C#'s own values (`ChatMediaStore.getThumb(chat, idHex, sourceVersion)`;
   the header check makes foreign / stale / broken a miss; Android only; no log line). It STILL NEEDS: the grant table (random revocable tokens per
   pane), a per-platform handler, a fail-closed answer, the store on Windows / iOS / Mac, the full-size viewer image, the shell `<img>` change, and a
   cover for the removal paths that do not call the store (m-A / m-B below).
4. The hardening of `pins-s15/c-transport` (F1 / F2): MC item `n-20261118-s15-transport-pin-harden` (audit phase).

## 4 · Open
| For | Question | Blocks |
|---|---|---|
| lead | the full smoke result `BASELINE OK 6660 / the 2 KNOWN` (= 6617 + 43: a-open 11, b-store 16, c-walk 15, c-transport +1; 2026-11-18, cloud twin, jsdom 29.1.1, TZ=America/Los_Angeles); then the push by #1546 | the pull request |
| Damir | the step for the operator block (the main chat gives it) | the device numbers |
| BE | the compiles: Windows (`redesign-ci`), Android (the operator block), iOS / Mac (the Apple phase) | the walk |

## 5 · Recorded, not changed
- The store's limits (DECISIONS #1728; P67): m-1 no crash recovery of `deleteSourceSoon` / `wipeKind` (a C#-named marker replayed by the sweep would close it, about 100 engine lines) ·
  m-A an N → 0 sweep needs a store call in the same process · m-B a chat that left by an un-hooked path with no folder yet gets no generation bump · m-C / m-D / m-E pin and test gaps ·
  m-F `whole = false` ignored by the deleters · the pendingDeletion heals (`SpixiContentPage.cs:7699`, `ContactNewPage.xaml.cs:226`) · r6 MINOR-1 disk work under the store's lock is reachable from the main thread ·
  r6 MINOR-2 every message delete clears the memory LRUs. All: cache only, never a wrong picture.
- F1 / F2 — INHERITED pin limits of `pins-s15/c-transport` (#1727; Damir #1746 (a)).
- PO-5's accepted losses: a file deleted outside the app during a load; a delete in the gap between its `File.Delete` and its increment (#1716).
- The walk: a transient `pidof` failure followed by a new process, and an app death between the pre-intent `pidof` and the intent, can still record one first open as warm (round-3 NIT-1; a window of one adb round trip).
- The PO-0 counters (`mediaCounts.*`) run in a store build too (cheap locked increments, no line written).
- The round-5 pin findings (the `RowCache` lifetime and others) were fixed in the rounds after #1726; their text stays in the brief § 5 as history.
