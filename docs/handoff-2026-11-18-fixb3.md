# Handoff 2026-11-18 (Fix batch 3) — the mini-app action before onload, "Delete history" in chat info, two walk steps; #46 CLEAN; delivered by #1546

Read this FIRST, then DECISIONS #1810–#1815. Number block of this session: #1810–#1824 (used: #1810–#1815; #1816–#1824 stay empty) ·
lessons L257–L260 (all used) · packets P84–P86 (all used). Rulings used: Damir's #1744 (3), (4), #1739 (3), #1742 (2) (main-chat rows, not in
`DECISIONS.md` here). Lead Claude Opus (#1612 / #1640). The main chat writes the next prompt.

## 0 · State
- Branch: `work/fixb3` · base `redesign/frontend` @ `14ae57f2` (merged with the newest base before the push if it moved) · delivery by #1546:
  the session pushed the branch; Damir opens the pull request from the compare link in the status doc; merge = Damir (a merge commit, #1505).
- Numbers: see the status-log entry and § 5 of `docs/review-brief-fixb3.md` (smoke, CSH 782 = 766 + 16).
- ⚠ C# UNCOMPILED: `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs`, `Spixi/Pages/Contacts/ContactDetails.xaml.cs`, `Spixi/Pages/Home/HomePage.xaml.cs`,
  `Spixi/Utils/SharedItems.cs` (the pure `FixB3Rules.cs` and `FixB3ChatInfoRules.cs` run in the harness). CI compiles Windows.
- ⚠ The walk scripts were never EXECUTED (no PowerShell in the cloud): a tree-sitter-powershell parse (0 errors) and source pins only. The
  operator block is their first run.
- Definition of done: no `docs/release-readiness.md` row changed.

## 1 · What this session did
| Item | Result | Evidence | MC item |
|---|---|---|---|
| 1 · mini-app action before onload | refused "not ready" (one fixed line, the name only); both catches log the name + the exception type; no switch | #1810, P84, csh `FixB3GuardTests`, pin `a-miniapp-guard` | `n-20261113-miniapp-action-before-onload` |
| 2 · Delete history on Windows | chat info re-scans and pushes the empty list after a delete (both delete paths); one scan gate; the cache written after the gate and emptied at the delete; the viewer token reset; the Sent-copy sweep now runs from chat info; no switch | #1811, P85, csh `FixB3ChatInfoTests`, pin `b-delete-history` | `n-20261113-delete-history-chat-info-media` |
| 3 · walk `downloads` scroll | swipe → check of the scrolled hub → tap; four keys absent until the calibrate | #1812, P86, pin `c-walk` | `n-20261118-walk-downloads-scroll` |
| 4 · walk `-HistorySeed` | one dev-seed chat, a proven restart per rep, one page, `history-seed-kNN` | #1812, P86, pin `c-walk` | `n-20261118-walk-history-seed-option` |

Mechanisms (written before the fixes): `docs/fixb3-mechanisms.md`. Contract: `docs/contract-fixb3.md` (§ 6: the escalations — a builder
stopped by a server restart, the scope of `SharedItems.cs`, no dry run).

## 2 · Walk and the operator block
- Sheet `docs/walk-fixb3.md` = the Artifact "Spixi Fix batch 3 — walk rows" (https://claude.ai/artifact/TccAjSLNWykyGxctK4Yvv9): Windows W-BUILD,
  W-1, W-2, W-3; Android A-BUILD, A-1. The BUILD rows read `MiniAppPage: an action before ixian:onload was refused (getStorage)`, which only
  this build writes (the Safety walk test app never sends onload; it needs an `icon.png`, the set-up lines add one).
- The operator block (the phone; only when the main chat gives Damir the step): its steps are in the status doc. First calibrate → three
  hub keys; a second (proof) calibrate → `screens.downloads`; then two runs `-Steps downloads,history -Repeats 5` and two runs
  `-Steps history -HistorySeed 55 -Repeats 5`. After the map commit, re-base `c-walk` d2 / d5 and `filewalk` b6 (they read the real map).

## 3 · Open
| For | Point | Blocks |
|---|---|---|
| Damir | Q-2 (#1815): received downloads stay after chat info › Delete history (no box there) — (a) as is · (b) the box in the chat-info sheet (Fix batch 4) · (c) always delete | nothing |
| a later batch | the shell half of an open shared-image viewer when its item leaves the list (`src/**`); Settings › Delete all history does not tell an open pane (`SettingsPage.xaml.cs`); Sent copies younger than 600 s get no later sweep pass | nothing |
| BE | CORE-18 (`core-asks.md`): Core's `writeMessages` copies the list before its lock | the handover |

## 4 · Lessons (also in `docs/lessons.md`)
L257 (a view that asks once at open goes stale on a platform where the page stays open) · L258 (hold a new body whole, not by fragments) ·
L259 (a cache written by the worker that finishes last needs the gate too) · L260 (a tree-sitter PowerShell parse is a cheap gate, not a run).

## 5 · Repo commands for Damir (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/fixb3
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
Windows: wipe `Spixi\obj` + `Spixi\bin`, then F5 (never `dotnet build`, #663). Android: the Release dev build.
