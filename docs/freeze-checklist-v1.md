# Freeze checklist — `freeze-v1` (sign-off list for Damir)

Created S13, 2026-10-09. Source: `docs/freeze-inventory-2026-10-08.md` §5 + `docs/release-readiness.md` S6 (+ the pre-freeze
gates that sit before it). Damir ticks each box; the tag (G-1t) is set only when every box is ticked or a DECISIONS row accepts the gap.

**Measured 2026-10-09** = `grep -rl` over `Spixi/` + `src/`, `Spixi/Resources/Raw`, `obj/`, `bin/` excluded. "demo" = `src/demo/spixi.iife.js`
(the generated demo bundle; it follows its sources). Smoke now **5687** (re-measured before the tag) · CSH **344**.

## A · Code retire set (S6)

| ☐ | ID | Item | Current state | Owner | Closes it |
|---|---|---|---|---|---|
| [ ] | C-1 | `maxLogCount = 1` + RELEASE BLOCKER marker removed | still `5` — `Spixi/Meta/Config.cs:103`, marker `:84` | Damir (at the tag) | gate 23 accepts the legal pair (value 1, no marker) |
| [ ] | C-2a | 0 `[CDPERF]` emitters | **15 files** (10 C# + 4 src + demo) | us | pin flips PRESENT → ABSENT |
| [ ] | C-2b | 0 `[SCROLL]` | **1 file** — `src/shells/chat.html` | us | pin ABSENT |
| [ ] | C-2e | 0 `[EXCERPTDIAG]` | **1 file** — `HomePage.xaml.cs` | us | pin ABSENT |
| [ ] | C-2f | 0 `[KBDIAG]` / 0 `[M5]` | `[KBDIAG]` 2 files (`message-menu.js` + demo) · `[M5]` 4 files (2 C#) | us | pin ABSENT |
| [ ] | C-2g | `[M6]` removed or kept by a row | **2 files** — `SpixiContentPage.cs`, `src/styles/base.css` | us | pin ABSENT, or a DECISIONS keep row |
| [ ] | C-2h | 0 `[CALLSWAP]` | **1 file** — `CallPage.xaml.cs`; F-0b-a has no closing row | us | F-0b-a closed → pin ABSENT |
| [ ] | C-2j | `[LOCKDIAG]` + `SPIXI_DEV_COEXIST` retired or kept | `[LOCKDIAG]` 2 C# files · `SPIXI_DEV_COEXIST` 12 C# files (17 incl. csproj / scripts / demo) | us + Damir | pin, or a DECISIONS keep row (#916) |
| [ ] | C-2k | KEEP list of the other probe tags | **no list.** Files today: NOTIFDIAG 8 · RESTOREDIAG 5 · CRASHDIAG 4 · DEVSEED 3 · L14 3 · WEBVIEW 3 · NICK 3 · KBTRAY 2 · DIVIDER 2 · WALLETDIAG 2 · SCANDIAG 2 · PRESENCE 2 · APNSDIAG 1 · MEMDIAG 1 · WV2 1 · SPEAKER 1 · CALLPAINT 1 | Damir → us | DECISIONS row with the KEEP set → one pin asserts the rest at 0 |
| [ ] | C-2l | `[P1]` probes retired or kept | **27 files** (17 C#); S11 / S12 added hold, savephoto, winground, haptic, push lines | Damir → us | KEEP / retire per probe (row), then pin |
| [ ] | H-10 | The 2 KNOWN smoke failures (#136 · B3) | OPEN — accepted every run, never ruled | Damir + us | fixed, or a DECISIONS row accepts them for release |

## B · Baseline and tag (S6)

| ☐ | ID | Item | Current state | Owner | Closes it |
|---|---|---|---|---|---|
| [ ] | G-1 | Final smoke count locked WITH the Core sibling + freeze row + full-app #46 CLEAN | smoke 5687 · CSH 344 (S13, to be re-measured after the office fix round); never scheduled | Damir + us | DECISIONS freeze row naming the counts + a #46 verdict CLEAN |
| [ ] | G-1t | `freeze-v1` + `pre-strip` free on origin; tag + baseline artifacts | not checked | Damir | `git ls-remote --tags origin` clean; tag set; bundle size + hash, shell hashes, smoke output, HEAD recorded |

## C · Walk and quality gates before the tag

| ☐ | ID | Item | Current state | Owner | Closes it |
|---|---|---|---|---|---|
| [ ] | V-* | Every V row WALKED or OUT | W + A: residual rows on V-0, V-2, V-14b, V-14c, V-15, V-18, V-25, V-26, V-29, V-30, V-31, V-32 · **I + M: 0 of 34 built rows walked** (33 + V-31) | Damir | `docs/office-walk-sheet-v1.md` + the S13 walk → WALK rows; each fail fixed or ruled |
| [ ] | V-26 | 12-FLASH launch blocker closed | fix BUILT S13 (#1271, `SpixiContentPage.cs`); recording owed | Damir | recording, 20 opens light + dark, 0 blank frames (frame scan) |
| [ ] | V-32 | 12-BAND ruled | OPEN — WinUI 3 platform defect (#1272); not a launch blocker | Damir | DECISIONS row: ship with it / wait for the SDK |
| [ ] | V-19 | Quality items: CodeQL · CI · isolation check · bridge contract · property tests | OPEN — no row since #1140 | us | each item runs green, or moved after the tag by a row |
| [ ] | E-M2 | Mac clone re-synced before the office build | OPEN | Damir | `git log --format=%h --grep="Claude-Session" \| wc -l` → 0; no ahead / behind |

## D · Security and decisions before the tag

| ☐ | ID | Item | Current state | Owner | Closes it |
|---|---|---|---|---|---|
| [ ] | G-6 pre-run | Introduced-vs-inherited sweep over the delta from `0e85a4b8` | DONE S13 — `docs/security-sweep-s13.md`: 38 OK · 4 OURS-OPEN · 5 LEGACY · 2 UNPROVEN (#1273); formal re-run = S10 | us | — (this run); S10 re-run after the strip |
| [ ] | OURS-OPEN 1 | About / How-to links use the generic `ixian:openLink` on SettingsPage | OPEN (#1273) | us | `ixian:aboutLink:<id>` C# whitelist built + pinned, or Damir's accept row |
| [ ] | OURS-OPEN 2 | O-01: the chat document can read the balance via feeQuery | OPEN (#1273; H-6 dial) | us + Damir | fix, or Damir's accept row |
| [ ] | OURS-OPEN 3 | O-40: password form in `settings.html` (second host, parked WebView) | OPEN (#1273) | us + Damir | fix, or Damir's accept row |
| [ ] | OURS-OPEN 4 | 21 carried ⛔ O-rows | OPEN — `docs/security-handover-gate.md:1165-1189` | us + Damir | each fixed, accepted, or moved to BE (A-5) — may run after the tag, before handover |
| [ ] | UNPROVEN | §4.4 Windows mini-app storage partition · 79 new `ex.Message` log lines | UNPROVEN (#1273) | us + Damir | Windows dev-tools line (A-4, `0\|null`) · log-line read: no secret / address in a message |
| [ ] | O-35 | Every STORE build passes `-p:SpixiStoreRelease=true` — e.g. `dotnet publish Spixi/Spixi.csproj -f net10.0-android -c Release -p:SpixiStoreRelease=true` (same flag for `-f net10.0-ios` / Windows); never `-p:SpixiDevCoexist=true` | gate BUILT S15 — target `SpixiStoreReleaseGate` in `Spixi/Spixi.csproj` refuses Debug, `SpixiDevCoexist=true` or `SPIXI_DEV_COEXIST` (#1293) | Damir (each store build) | the build log shows `Spixi store-release gate (O-35): passed` |
| [ ] | G-3b | `file:line` proof per SECURITY.md invariant | DONE S13 — `docs/security-sweep-s13.md` Part 2 (#1269 (4)) | us | — |
| [ ] | G-3e | Every T2 "blocks S5 / S6" row decided | CLOSED S13 from the inventory (#1269 (4)); H-5 · H-20 · H-22 (R-01) stay open as T2 rows | Damir | — |
| [ ] | G-3a / G-3c | Architecture map + refactor inventory | MOVED after `freeze-v1` (#1269 (4)) | us → Damir | runs in S7, before the S8 picks |

## E · Skill checklists (`spixi-finalization-checklists`)

| ☐ | ID | Item | Current state | Owner | Closes it |
|---|---|---|---|---|---|
| [ ] | §4 copy | Copy and claims check over S11 / S12 / S13 copy (hints, About, update card, E2E row) | not run; the site's "No servers" / unconditional PQ claims stay out of the app (#1265); E2E second line dropped (#1269 (1)) | us | checklist pass written into a DECISIONS row |
| [ ] | §1 UI | UI audit: both themes, a11y, 13 locales | last full run not found; 9-A11Y (TalkBack) N/A ×4, VoiceOver never run | us + Damir | audit pass + 9-A11Y / VoiceOver walked or ruled optional (E-I7) |

**Not freeze items (for reference):** C-4 version bump = S12 — still `0.9.22` (`Spixi.csproj:45-46`, `Config.cs:46`). T1 BE rows block S10 / S12,
not the tag; send group (a) B-25 … B-34 before the tag if possible (an unapproved verb changes frozen code).

**Sign-off:** Damir ________ date ________ · tag commit ________
