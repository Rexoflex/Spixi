# Handoff 2026-11-16 fixb1 — Fix batch 1: seven small fixes before the launch (walk owed on Windows + Android)

Read this FIRST, then DECISIONS #1645–#1654. Number block of this session: DECISIONS #1645–#1664 (used: #1645–#1654;
#1655–#1664 stay empty) · lessons L210–L215 (used: L210–L214; L215 stays empty) · packets P50–P54 (used: P50–P53;
P54 stays empty). The main chat gives the next block; it writes the next prompt. Lead: Claude Opus (by #1612).

## 0 · State
- Branch: `work/fixb1` · base: `redesign/frontend` @ "Merge pull request #10 from Rexoflex/work/docs-2026-11-16"
  (`cdc4f71`; the session started on `efcde241` and fast-forwarded to the docs merge before any commit) · delivery by
  #1546: the session pushes the branch, Damir opens the pull request from the compare link in the status doc · merge =
  Damir (a merge commit, #1505).
- CI (`redesign-ci`): runs when Damir opens the pull request; the result goes into the status doc / pull request text.
- Smoke: `BASELINE OK — 6516 / the 2 KNOWN (#136 · B3)` (run with `TZ=America/Los_Angeles`, L214) · cloud twin, Node 22.23.4, jsdom 29.1.1 (the pinned line),
  .NET SDK 10.0.115, Ixian-Core @ `097341a` · delta = the new pin rows minus the inline header rows folded by the
  re-base (see #1654) · CSH **607** (= 600 + 8 new − 1 removed).
- Checks: `build-shells --check` · `build-locales --check` · `extract-strings --check` · `build-legal-docs --check` ·
  `generate-icons --check` · `i18n-lint` · `pseudo-locale-smoke` 9/9 · `cs-syntax-check` 279 files · `pin-sweep
  --working` read · `verify-locales` RED on `id-id` (`groundBlueGradient:Spixi`) — the same on the untouched base.
- Review: **CLEAN at r5** (MAJOR 3 → 1 → 1 → 3 → 0; every MAJOR a pin gap, never a code defect; round 5's 7 MINOR recorded
  with the direction of a fix, #1653) · brief `docs/review-brief-fixb1.md`.
- ⚠ C# UNCOMPILED: `Spixi/Utils/SConfirm.cs`, `Spixi/Utils/SpixiFlags.cs`, `Spixi/Utils/PerfB1Rules.cs`,
  `Spixi/Utils/FixB1Rules.cs` (the last three compile and run in csh), `Spixi/Pages/Home/HomePage.xaml(.cs)`. CI compiles
  Windows; the Mac and Android arms compile in Damir's builds. The Android resources compile in Damir's build.
- Definition of done: no `docs/release-readiness.md` row names these items; no row changed.
- Still owed: the walk on Windows + Android (`docs/walk-fixb1.md`); the Mac legs of W-2, W-3, W-4 in the Apple phase;
  the renderer-memory reading of `sparekeep` OFF / ON (#1611 (2)).

## 1 · What this session did
| Item | Result | Evidence | MC item |
|---|---|---|---|
| 1 · Windows Enter | Cancel is the default button of the native confirm; Enter and Esc cancel; switch `ConfirmSafeDefault` | #1645, P50, pin `a-confirm` (the whole `SConfirm.cs` by SHA-256), csh `FixB1Tests` | `n-20261113-confirm-enter-windows` |
| 2 · Android dialog | the dialog accent has a night value (brand-300, 4.95 : 1) | #1645, P53, pin `b-dialog-colors` | `n-20261113-confirm-buttons-dark-android` |
| 3 · Unread strip | the log reserves the gutter on both edges (10 / 10 px in the sweep) | #1646, pins `c-unread`, `c-unread-sweep` (by hand) | `n-20261116-win-unread-strip-cut` |
| 4 · Divider line | a 2 px accent line on hover and for the whole drag; switch `DividerHoverLine` | #1649 🟡, P51, pin `d-divider` | `n-20261116-desktop-divider-hover-line` |
| 5 · Account header | photo and name only; three strings removed | #1647, pin `e-header`, 10 inline rows re-based | `n-20261113-account-header-address-off` |
| 6 · Scroll indicator | the drawn indicator takes the outline family | #1648 🟡, pin `f-scrollbar` | `n-20261116-android-sheet-scrollbar-theme` |
| 7 · sparekeep | ON by default | #1650, P52, pin `g-sparekeep`, csh | `n-20261116-sparekeep-default-on` (new) |

Mechanisms, written before the fixes: `docs/fixb1-mechanisms.md` (item 6's first reading was wrong and is recorded).
Renders (before / after, both themes) of items 3, 5, 6 were made on the built shells by the builder (Chromium; not in
the repo): item 3 — the strip 0 / 10 px → 10 / 10 px; item 5 — the header shows the avatar, the name and the pencil;
item 6 — the indicator light grey on light, dark grey on dark.

## 2 · Walk
Sheet: `docs/walk-fixb1.md` = the Artifact "Spixi Fix batch 1 — walk rows" (https://claude.ai/artifact/9bUUwUg7RsDaGdBBnkNawC; 10 rows: Windows W-BUILD, W-1 … W-4;
Android A-BUILD, A-1 … A-4). Result: owed. Dials judged at the walk: W-3 (the divider line), A-2 (the indicator greys).

## 3 · Proposed next steps (the main chat decides)
1. Damir opens the pull request from the compare link; the main chat reads `redesign-ci`.
2. The walk on Windows + Android (one build per platform from `work/fixb1`).
3. The questions of § 4.

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir | #1652: on Windows the payment send confirm (no auth step on WinUI) and the mini-app confirmations still take Enter on the primary button — (a) a small follow-up with the same safe default and its own switch; (b) accept with a recorded reason per call | nothing in this batch |
| Damir | #1651: the two new switches have no Developer-screen control — (a) add them to the Safety switch list of DevPage + dev.html later; (b) preferences only, said in the BE pack | the BE review convenience |
| Damir | #1653 (🟡 part): the pin net of the security rules is a set of whole-file SHA-256 hashes (seven files); any later edit of those files re-bases the hash after a look at its diff — keep this design? | later batches that edit those files |
| Damir | Dials at the walk: #1649 (2 px, the accent, at once, the whole drag) · #1648 (the indicator greys; in dark the dragged thumb equals the idle thumb) | — |

## 5 · Recorded, not changed
- Round 5's seven MINOR pin gaps of items 4, 5, 6 (R5-1 … R5-7, `docs/review-brief-fixb1.md` § 5, each with the direction
  of a fix) and the perimeter's stated limits (R3-2; the outside lists of rounds 4 and 5) — a later session that edits
  those pins can close them; `stripCode`'s HTML branch on C# input (R5-3) touches every text pin of the repo.
- The account wipe turns `sparekeep` off in that process until the next start (#46 r1 S-S-1; fails to the old path).
- `ixian:disableDevMode` does not remove the two new keys (no in-app writer; the Safety keys behave the same).
- The word "opt-in" stays in comments of `SpareKeepRules.cs:1`, `SpixiContentPage.cs:2086`, `HomePage.xaml.cs:1909-1910`,
  `SettingsPage.xaml.cs:1848`, `c-spare-keep.mjs:1` (outside this batch's change or held by text pins).
- `pins-s20i/e-select.mjs:68` probes a class that no longer exists (green, proves nothing).
- `docs/walk-perfb1.md` still names the delivery state `sparekeep=0` (the main chat's file).
- `src/strings/draft/*.json` keep the three removed keys as orphans (no reader; `build-locales` iterates the en-us keys).

## 6 · Lessons (also appended to docs/lessons.md)
L210 (a `pgrep -f` watcher matches itself) · L211 (a "scroll bar" can be drawn by the app) · L212 (a removal can orphan
strings: plan the full pipeline) · L213 (hold a small security body whole: text, directives, platform projections) · L214 (two old send pins fail in the
first hour after local midnight — not this batch).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/fixb1
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: wipe `Spixi\obj` + `Spixi\bin`, then **F5 in Visual Studio, never `dotnet build`** (#663).
- Android: wipe `Spixi/obj` + `Spixi/bin` (the html changed, #449), then the Release dev build.
- The BUILD rows name the line `[FLAGS] confirmdefault=1 dividerline=1`, which only this build writes.
After the walk: paste the results in the main chat. Merge on GitHub (base `Rexoflex/Spixi` → `redesign/frontend`).
