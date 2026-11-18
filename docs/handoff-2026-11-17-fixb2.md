# Handoff 2026-11-17 fixb2 — Fix batch 2: the walk findings of Fix batch 1 and the desktop polish that waited (walk owed on Windows + Android; stopped at review round 3 by rule 9, continued by ruling #1735)

Read this FIRST, then DECISIONS #1695–#1706. Number block of this session: DECISIONS #1695–#1714 (used: #1695–#1706;
#1707–#1714 stay empty) · lessons L225–L230 (all used) · packets P59–P64 (used: P59–P62; P63, P64 stay empty). Lead:
Claude Opus (Damir's ruling #1640); item 4 built by a Claude Fable 5.2 sub-agent. The main chat writes the next prompt.

## 0 · State
- Branch: `work/fixb2` · base: `redesign/frontend` @ `06a4845d`, merged with the newest `redesign/frontend` @ `c0a76176`
  ("Merge pull request #14": pull requests 12, 13, 14) on 2026-11-18 before the push (no rebase; no conflict) · delivery
  by #1546: the session pushed the branch; Damir opens the pull request from the compare link in the status doc · merge
  = Damir (a merge commit, #1505).
- CI (`redesign-ci`): runs when Damir opens the pull request.
- Smoke / CSH on the merged tree: `BASELINE OK — 6617 pass / the 2 KNOWN` (= 6564 + 53) · CSH 643 (= 633 + 10).
- Review: stopped at round 3 by rule 9 (#1705; MAJOR 3 → 2 → 3, every one a pin or layout gap); Damir's ruling #1735
  (2026-11-18, option (a)): the pin limits are accepted and recorded; the final readers S4 (Fable 5.2, security-only) and
  O5 (Opus, the rest) found **0 MAJOR in the code** — `docs/review-brief-fixb2.md` § 5.
- ⚠ C# UNCOMPILED: `Spixi/Utils/SConfirm.cs`, `SPayments.cs`, `SpixiFlags.cs` (compiles in csh), `FixB2Rules.cs` (compiles in
  csh), `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs`, `Spixi/Pages/Home/HomePage.xaml(.cs)`. CI compiles Windows; the Mac and
  Android arms compile in Damir's builds.
- Definition of done: no `docs/release-readiness.md` row names these items; no row changed.

## 1 · What this session did
| Item | Result | Evidence | MC item |
|---|---|---|---|
| 1 · Unread pill | "Unread messages" is a centred pill like the date pill on every platform; the both-edges gutter stays | #1701, pins `c-unread-pill`, `c-unread-pill-sweep` (by hand) | `n-20261117-unread-strip-centred-pill` |
| 2 · Divider | the 2 px line covers the measured hairline; reset 400 → 440 (🟡 dial); the reset re-fits chat info | #1700, P62, pins `b-divider`, `b-hairline-sweep` (by hand) | `n-20261117-desktop-divider-line-align` |
| 3 · Confirm focus | Windows: the keyboard focus goes to Cancel at open (only Cancel); the text scrolls | #1695, #1696 🟡, P59, pin `a-confirm-focus`, csh `FixB2ConfirmTests` | `n-20261117-win-confirm-no-default-focus` |
| 4 · Pay + mini-app confirms | Windows: the payment send confirm and the three mini-app confirms use the safe-default dialog; two switches; the entry holds the gate (D-1 🟡) | #1697–#1699, P60, P61, pin `d-pay-confirm`, csh `FixB2PayTests` | `n-20261117-win-confirm-enter-payment-miniapp` |
| 5 · Sheet height | one shared cap for centred desktop sheets (+ the chat app picker) | #1702, pin `e-sheet-height` | `n-20261117-desktop-address-sheet-small-window` |
| 6 · Tx rows | desktop wallet rows take the chat row's inset (🟡 the padding compensation) | #1703, pin `f-txrow` | `n-20261116-desktop-txrow-inset-shape` |
| 7 · Aurora ring | a dedicated token `--outline-select-ring`; light Aurora 3.05 : 1 | #1704, pin `g-aurora-ring` | `m005` |
| 8 · Mac | the divider and the sheets are shared code; Mac / iPhone rows in the walk sheet as "Apple phase" | `docs/walk-fixb2.md` | — |

Mechanisms, written before the fixes: `docs/fixb2-mechanisms.md`. Contract: `docs/contract-fixb2.md`. Renders (before /
after, both themes, desktop and 412 × 915): the Artifact "Spixi Fix batch 2 — renders"
(https://claude.ai/artifact/1ouXb5xsLnw6jeZE1nS7hs).

## 2 · Walk
Sheet: `docs/walk-fixb2.md` = the Artifact "Spixi Fix batch 2 — walk rows" (https://claude.ai/artifact/StetL6PwsguBDfTog2jNUc;
Windows W-BUILD, W-1 … W-8; Android A-BUILD, A-1 … A-3). The BUILD rows name `[FLAGS] payconfirmdefault=1
appconfirmdefault=1`, which only this build writes. The payment row is walked up to the confirm and cancelled: the walk
sends no IXI; the mini-app row approves nothing. Dials at the walk: the reset width 440 (W-6), the tx row padding (W-8).

## 3 · Proposed next steps (the main chat decides)
1. Damir opens the pull request from the compare link; the main chat reads `redesign-ci` (the first Windows compile of
   the C#).
2. The walk on Windows + Android (one build per platform from `work/fixb2`).
3. The open points of § 4.

## 4 · Open points (no question blocks this batch)
| For | Point | Blocks |
|---|---|---|
| Damir (dial) | #1700: reset / default list width 440 (was 400); chat info then opens beside the chat from ~1040 DIP | nothing |
| Damir (dial) | #1703: the desktop tx row keeps its content x (padding 8) — or drop that line | nothing |
| main chat | #1696 🟡 item 3 has no own switch; #1697 🟡 D-1 (the entry holds the gate) | nothing |
| main chat (docs batch) | #1699: copy P61's legacy list into `docs/be-review-pack/legacy-not-ours.md` | nothing |
| a later batch | #1700: WinUI half-to-even rounding would leave one device column at some drag widths at 125 % / 150 % (the walk checks); the 600 ms rule for the mini-app confirms (P61, r2 S2 m-3); an RTL `FlowDirection` for our dialog (r2 NIT); `XYFocusKeyboardNavigation = Disabled` on the dialog's `CommandSpace` (S4 MINOR-1: the Left arrow reaches OK); the focus return after the dialog closes (S4 NIT-1); the `bin` / `obj` walker idiom in older pins (`pins-fixb1/a-confirm`, `g-sparekeep`, `pins-perfb1/f-flags`) | nothing |

## 5 · Recorded, not changed
- The costs of D-1 and the payment / mini-app limits (#1698, #1699; P60, P61).
- The pin limits of the #1627 class (`d-pay-confirm` names them: the `://` trick of `stripCode`, a reflection name built
  from pieces, Ixian-Core files).
- chat.html is 548 chars under `CHAT_KB_CEIL = 964`: the next shell edit re-bases the ceiling with its delta stated.
- `src/demo/chat.html` (demo only) mentions the pill in a comment; the demo bundle carries the same CSS.

## 6 · Lessons (also appended to docs/lessons.md)
L225 (WinUI default-button focus is programmatic: no ring after a click) · L226 (a bare TextBlock in a ContentDialog is
clipped) · L227 (a code-made ContentDialog is outside MAUI's alert queue: hold the gate) · L228 (count bare names over every
region with an exact per-file table; walk nested bin / obj) · L229 (a CSS-rule pin tracks the at-rule depth or computes) ·
L230 (a scoped token change is read as the dark value by the naive token readers: give it its own token).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/fixb2
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: wipe `Spixi\obj` + `Spixi\bin`, then **F5 in Visual Studio, never `dotnet build`** (#663).
- Android: wipe `Spixi/obj` + `Spixi/bin` (the html changed, #449), then the Release dev build.
After the walk: paste the results in the main chat. Merge on GitHub (base `Rexoflex/Spixi` → `redesign/frontend`).
