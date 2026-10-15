# Review brief — Session 20G (the S20F walk fix round)

Tree: `/home/claude/m20g` (base `a43dd4c5` + the S20G merge; uncommitted — `git -C /home/claude/m20g diff a43dd4c5 --stat` and `git status` show the delta). Contract: `/home/claude/CONTRACT-S20G.md`. Interview: the Artifact "Spixi Session 20G Dials".

## 1 · What landed
| Item | What | Files |
|---|---|---|
| P0 | Restore never deletes an earlier contact list: the stash is kept as `restore-previous-<yyyyMMdd-HHmmss>`; ask-first native alert when a contact list sits on the device with no wallet; delete-account wipes the kept folders; behind `flagS20G` | `Spixi/Utils/RestoreMoves.cs` (+ `S20GRules`), `Pages/Launch/LaunchPage.xaml.cs`, `Pages/Settings/SettingsPage.xaml.cs`, `Utils/SpixiFlags.cs`, `Resources/Raw/lang/*.txt`, `scripts/csh/S20GRestoreTests.cs`, `docs/be-review-pack/P30-*` |
| F-1 | Opening Account closes the open chat overlay(s) (no auto-read / read receipt under Account; the rail badge rises) | `Pages/Home/HomePage.xaml.cs` (`onSettings`, `closeChatOverlays(anyWidth)`, `onOverlayClosed`) |
| N-1 | Dark themed received bubbles OKLCH L −0.06 (Mist −0.04) + quotes re-derived | `src/styles/tokens.css` |
| F-5 / Q-4 | `--outline-on-hero` 0.45 → 0.30; `.c-fmt-pre` wraps; `.c-fmt-code` break-spaces | `tokens.css`, `format-bar.css` |
| Q-5 | Details hover medallion + call-back disc on `--chat-accent-*` | `typed-bubbles.css` |
| R-6 | No composer focus after a media send | `src/components/composer.js` |
| N-2 | Selected chip: `--text-chip-selected` (white dark / deep ink light), top highlight, color-mix gradient + 60 % outline | `chip.css`, `shared-items.css`, `tokens.css` |
| R-1 | One switch-row geometry (centred on title + description) | `settings-shell.css`, `settings-shell.js`, `settings-screens.js` |
| R-5 | Downloads: cached Intl formatters, phase-2 patch in place, From row kept | `settings-app.js` |
| Q-1 | Chat info › Files rows use the Downloads tile (`createKindTile`, `.c-file-tile`) | `shared-items.js/.css`, `settings-app.js/.css`, `settings.html`, `downloads.html` |
| R-4 | Wallet hero 380 ms token + windows = token + 100 | `wallet-hero.css`, `wallet-shell.js` |
| F-2 F-3 F-4 Q-2 Q-3 R-2 R-3 | Launch: autoplay pause 15 s · "Spixi 0.9.22 · Open source" · file card hover · slide copy 20 px · shorter restore labels de/ru/fr + two-line net · bold nick · strength line reserved + fills animate | `launch-shell.js`, `launch-form.css`, `launch-shell.css`, strings drafts |
| #1406 | `hintWalletTitle` = each locale's slide-3 title (no "money") | `glass-card.js:68`, drafts |
| sizes | CHAT 957 → 959, INDEX 649 → 651 (stated in smoke) | `scripts/smoke-test.mjs` |

New pins: `scripts/pins-s20g/*` (13 modules in smoke + `l-sweep.mjs` tool). Run one: `node scripts/run-pins.mjs --root /home/claude/m20g pins-s20g/<mod>`. CSH: `node scripts/run-csh.mjs` (460). ⚠ ONE full smoke at a time — reviewers NEVER run `smoke-test.mjs`.

## 2 · Must hold
- PARAMOUNT isolation invariant; C# touches no risky parts; #1312 (flag, old path = fallback); no path / address / nickname in a log line; no WebView-supplied path into a filesystem op.
- Restore stays all-or-nothing (S15 #1297); nothing that was there before a restore is deleted by the restore; delete account leaves no `restore-previous-*`.
- Tokens, not literals; component files carry no `[data-theme]` selector; conservative CSS (`@supports` for color-mix); reduced motion = 0.
- Contrast: text ≥ 4.5, non-text ≥ 3 (except the stated decorative F-5 rule and the N-2 fill-vs-ground).
- Claims: never "money", "no servers", "anonymous"; translations keep each locale's glossary term (L146).

## 3 · Accepted dials (do not re-open)
N-1 C (Mist B) · R-1 A · R-2 A · F-5 0.30 + wrap · F-3 "Spixi 0.9.22 · Open source" · Q-2 20 px · R-4 380 ms · F-2 resume after 15 s · P0 copy + ask first · F-1 close the chat · N-2 C · D-1 parked (#1441, #1406 except the string). No dividers on chat info (#968).

## 4 · Auditor scopes
- **A — C# + security:** P0 + F-1 + flags + lang keys, read like a compiler (MAUI, async on the main thread, nullable, `displaySpixiAlert` signature), threat model (restore folder handling, the kept folder's privacy, the read-receipt fix), the gate row, P30.
- **B — shells (chat · settings · home):** N-1, F-5, Q-4, Q-5, R-6, N-2, R-1, R-5, Q-1, R-4 — behaviour on the BUILT shells, regressions in neighbours, contrast every state, size.
- **C — launch + tests:** F-2, F-3, F-4, Q-2, Q-3, R-2, R-3, #1406 strings (14 locales, claims, glossary) + every `pins-s20g` module and every re-based pin: does each fail when its behaviour breaks (mutation budget 12), were re-bases weakened?

## 5 · Verdict — CLEAN at r3
| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | A C# + security | 0 | 4 | 5 |
| r1 | B shells | 2 | 4 | 5 |
| r1 | C launch + tests | 1 | 7 | 5 |
| r1 | smoke run 1 (stale bundle) | — | 3 gates | — |
| r2 | fresh reader (all r1 fixes VERIFIED) | 0 | 2 | 2 |
| r3 | fresh reader | 0 | 0 | 4 |

**MAJORs (r1).** B-1: after copying a fixer's source back, the main session ran build-shells without build-demo-bundle → the shipped bundle had no `createKindTile` and every Downloads tile rendered unstyled (fix: the full pipeline; L151). B-2: R-6 skipped `input.focus()` after ANY media send — on desktop the focus stayed on the action button, which turns into the mic, so Space started a recording (fix: skip only for a touch / pen tap; r2 M-1 also blurs the disc). C-F2: F-2's resume turned slides under a keyboard / screen-reader user (WCAG 2.2.2) (fix: focus inside the carousel holds with no timer; r2 M-2 time-boxes the pointer modality to 1 s).
**Deliberate breaks:** every pin in `scripts/pins-s20g/` and every CSH test was broken on purpose by its builder / fixer and failed for its own reason (logs in the reports); r1 C ran 10 mutations (8 survivors → pins added: R-3 reduce on the rule, F-2 re-arm paths, R-5 signature, Q-1 long name, P0 catch, b2-toggle axis, N-2 pin `c-chip`); r3 re-broke M-1 and M-2 → killed.
**Fix table:** `docs/reviews/session20g-r1-fixes.md`.
**Recorded, not fixed:** #1423 ① – ⑭ (incl. r3 NITs: wall-clock `Date.now` in the two time boxes; a > 1 s mouse press on a dot holds until focus leaves (WCAG-safe side); a touch voice send leaves focus on the mic disc (pre-existing, deliberate); TalkBack's accessibility click may not count as touch for R-6 — device check).
**Final numbers:** smoke BASELINE OK 6207 / the 2 KNOWN (6209 checks = 6148 + 59 new + the 2 KNOWN; the known flake `pins-s15/e-send-enter` failed once under load and passed alone ×2) · CSH 463 · gates green except the pre-existing id-id token.
