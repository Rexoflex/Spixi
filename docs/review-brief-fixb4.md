# Review brief — Fix batch 4 (`fixb4`, #1845–#1859)

Work order for the #46 adversarial loop (docs/process.md). Written BEFORE round 1. The VERDICT goes into § 5 when the loop
closes (#660). Readers by #1606 as the session prompt applies it: the diff changes NO `src/shells/chat.html` and no
component that draws untrusted text, so every reader is a fresh read-only **Claude Opus** instance (no Fable reader is
owed); one break-my-verdict reader per round; no fallback below the named model.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 1 `n-20261115-split-ships-slide4` | Welcome slide 4: "Mini apps like Blitz Chess open right in your chats." in en-us + 13 locales; the key is renamed `slide4Copy2` → `slide4Copy3` (the a43dd4c5 precedent: no stale translation can survive) | `src/components/launch-shell.js` (one line), `src/strings/**` (en-us + 13 drafts + the built dictionaries), `docs/i18n-strings.md`; pin `pins-fixb4/a-slide4`; re-based `pins-s20f/l-slides` (the key name) | #1747 (1) |
| 2 `n-20261113-protect-account-keyboard` | On the Android UA (adjustResize) the launch shell brings the focused field box into `.c-launch__body` by writing ONLY that body's `scrollTop`, on the existing triggers + window resize; iOS / Mac / Windows unchanged | `src/shells/launch.html` (`launchKeyboardInset` region); pins `pins-fixb4/c-keyboard` (jsdom) + `c-keyboard-render.mjs` (Chromium, by hand); re-based `pins-on1/ring-geometry.json` (see § 2) | #1748 (3) |
| 3 `n-20261118-default-media-autoload-off` | A NEW or RESTORED account starts with P1 "Load pictures and GIFs" Off: `spixi.media.autoload = 'off'` written by the launch shell on ONE new push `setNewAccountDefaults(media, density)` that C# sends only from the three new-account sites (switch `DefaultMediaTapToLoad`) | `Spixi/Utils/PageDefaultsRules.cs` (new), `Spixi/Utils/SpixiFlags.cs` (own block + `readFixb4`), `Spixi/Pages/Launch/LaunchPage.xaml.cs` (3 call lines + 1 helper), `src/shells/launch.html` (the handler); csh `PageDefaultsTests` (11 after r1); pin `pins-fixb4/b-defaults` | #1750 (P1) |
| 4 `n-20261118-default-list-density-compact` | The same push writes `spixi.chat.listdensity = 'compact'` on the DESKTOP only (WinUI / MacCatalyst; switch `DefaultListCompact`) | as item 3 | #1750 (A9) |
| 5 `n-20261122-win-broken-picture-tile-stays-sending` | Mechanism: a Seed contact never takes a file, so my tile stays "sending"; `PhotoTileLite` changes complete tiles only. The walk rows W-2 / A-2 of `docs/walk-photo1b.md` are corrected; a pin holds the states ON vs OFF | `docs/walk-photo1b.md`, `scripts/pins-fixb4/e-tile-states.mjs` | WALK #1829 |
| 6 `n-20261122-dev-log-window-half-row` | `.c-settings-dev__log.u-scroll` `min-height: 0` → `60vh` (a floor; the body scrolls to it) | `src/styles/components/settings-app.css` (one rule); pins `pins-fixb4/d-devlog` (jsdom) + `d-devlog-render.mjs` (Chromium, by hand) | — |
| 7 `n-20261122-win-drag-drop-files-into-chat` | Mechanism only: never built (no handler at HEAD or at `0e85a4b8`); a question for Damir | `docs/fixb4-mechanisms.md` § 7 | — |

Re-based for items 3 + 4 (each after a look at the diff, #1634): `pins-defaultsb/a-defaults` (d1, d2 hash, d11 tail),
`pins-fixb1/g-sparekeep` (FLAGS_FROZEN hash, tail), `pins-fixb2/d-pay-confirm`, `pins-perfb1/f-flags`,
`pins-v1am/c-csharp` (tails), `pins-s16/b-l8` (L8-c), csh `DefaultsTests`, `FixB2PayTests`, `Photo1bFlagsTests` (the
position of the init lines). Not built, and why: item 7 (never built; not a one-line repair — Damir rules the phase).

## 2 · How to run
- Tree: the cloud twin `/home/claude/spixi` (`work/fixb4`, uncommitted working tree on base `338d30f4`); the range is the
  working-tree diff `git diff 338d30f4` + the untracked files. Pipeline: FULL (strings changed). Ixian-Core @ `097341a`
  present as `../Ixian-Core`. Base: `BASELINE OK 6774 / the 2 KNOWN` · CSH 806.
- On the merged tree before round 1: pins 144 / 144 (21 modules: the 5 new + 16 affected), CSH `pass=816 fail=0`; after
  round 1: pins 220 / 220 (31 modules), CSH `pass=817 fail=0` (PageDefaultsTests 11), `cs-syntax-check` 289
  files ✓, both `--check` gates ✓. The full smoke: § 5.
- Known: the 2 KNOWN (#136 · B3); timing flakes `GATE 54 (a4)` and `pins-fixb1/e-header` (6 rows) — run alone, do not
  change (another session repairs them).
- **A visible change to check:** the re-captured `pins-on1/ring-geometry.json` (Android phone UA) moved `create1-320` /
  `create2-320` boxes up by 14 px after round 1 (10 px: the focused nickname box was cut by the body edge; + 4 px: its
  focus ring), so the new reveal scrolls the body (and it stays after the blur). The welcome slide-4 boxes changed by the shorter text.
- Renders (PNG): `/home/claude/scratch/renders/` (`c-keyboard-<base|new>-…`, `d-devlog-<base|new>-…`).

## 3 · Auditor scopes (disjoint)
| Auditor | Scope (files) | Focus |
|---|---|---|
| S (security + C#) | `PageDefaultsRules.cs`, the `SpixiFlags.cs` block, the `LaunchPage.xaml.cs` diff, the `setNewAccountDefaults` handler in `launch.html`, `src/bridge/native.js` (how the args arrive) | compile-read of the C#; the three sites and ONLY them (never `proceed`, `onLoad`, a start path); the thread / ordering before the navigation; an existing account is untouched; a failed restore writes nothing; the push cannot be driven by WebView input; the gate triggers (+1 push, 2 existing keys written, +2 prefs, +3 log lines); the "frozen bridge" reading (a new C# → JS push, no new verb) — say if you think it is not allowed; the drag-and-drop finding § 7 (is the `file:` navigation claim right?) |
| L (shells, layout, texts, walk docs) | the `launchKeyboardInset` diff of `launch.html`, `settings-app.css`, the slide-4 texts in all 14 locales + the fallback, `docs/walk-photo1b.md` W-2 / A-2, `docs/fixb4-mechanisms.md` | behaviour on Android / iOS / desktop; "nothing else of the step moves"; the 320 × 568 shift; the dev log floor on all three sizes and in a short window; each translation (grammar, no Split, the claims rules); is the item-5 verdict right (could a REAL contact still show the bug)? |
| P (pins and tests) | `scripts/pins-fixb4/*`, the re-based pins and csh tests of § 1, `scripts/csh/PageDefaultsTests.cs`, the smoke registration line | does each new pin fail when its behaviour breaks (derive cases, do not trust the author's list; a mutation budget of ~10 in a scratch copy); were the re-bases weakened (compare each with `git diff 338d30f4`); the stated limits (#1735) |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · C# touches no risky parts · no new `ixian:` verb · no
  WebView value into C# · #1478 (each default its own switch; OFF = the old path, byte-equal: no push) · the default is
  written only at create / restore, never by an update (#1750) · no URL / address / name / text in logs · bundle BEFORE
  shells · the size ceiling of `chat.html` (not touched) · claims rules (never "money", "no servers", "anonymous",
  "post-quantum forward secrecy").
- Accepted (do not re-open): the four default picks and "new and restored accounts only" (#1750) · Blitz Chess only
  (#1747 (1)) · the keyboard fix before the launch (#1748 (3)) · the item-7 phase is Damir's call.

## 5 · Verdict
(the verdict line is written when the loop closes; the rounds are recorded as they run)

### Round 1 (2026-11-22, three fresh read-only Claude Opus readers; the tree of the full smoke `BASELINE OK 6804`)
| Reader | MAJOR | MINOR | NIT |
|---|---|---|---|
| S (security + C#) | 0 | 3 | 5 |
| L (shells, layout, texts, walk docs) | 0 | 3 | 8 |
| P (pins, tests; 11 mutations, 1 survivor) | 0 | 1 | 1 |

**r1 fixes** (each finding verified against the source by the lead before the fix):
| Finding | Verdict | Fix |
|---|---|---|
| S MINOR-1 — the C# mirror `SAutoDownload.loadPictures` (absent = On) is not written: with stale native prefs (a wallet file gone without Delete account) a stale auto-download setting could download while the UI says Load pictures Off | true (`SAutoDownload.cs:18`, synced only by `ixian:photoAutoDl:`, `SettingsPage.xaml.cs:1124-1133`) | the helper also writes the mirror Off when the media argument is "1" (a fixed C# value; rule in `PageDefaultsRules`; csh + pin) |
| S MINOR-2 — the push is best effort; the `[DEFAULTS] new account page` line logs what was sent, not what landed | true (a lost push = the old defaults, never worse) | docs: the walk rows check the SCREENS (Privacy › Load pictures Off; desktop › Chat appearance › Compact); the packet says the line is not proof |
| S MINOR-3 — § 7 understated the reach of a dropped file (the page's verb channel) and did not say it is inherited | true (the `file:` allow and `IsAllowedURL` are the same at `0e85a4b8`) | § 7 reworded; row FILE-NAV in `docs/be-review-pack/legacy-not-ours.md` |
| S NIT-1…5 | NIT-1 (a log line with both switches off) and NIT-5 (a throw after the push) recorded in the packet; NIT-2 (no writer of the two prefs: the defaultsb precedent), NIT-3 (the inline desktop test, the same as `HomePage.isDesktopPlatform`), NIT-4 (packet + gate owed: written in the export) — recorded | — |
| L MINOR-1 — the slide-4 TITLE "Play and plan together." still promises planning (the Split half of #1425) | true; the ruling named the copy only | a question for Damir (status doc, Mission Control); item 1's "done when" (no app that does not ship is named) holds |
| L MINOR-2 — no render reproduces the bug at the A52s size (915 − 323 leaves the fields visible) | true | the render adds the device-measured viewport 412 × 774 → 451 (`docs/android-findings.md:41`); the walk is the device proof |
| L MINOR-3 — W-2 / A-2 test only the reopen leg of PO-4; the decode-error path is never reached on a device | true | rows retitled "A `.jpg` that is not a picture (PO-4 reopen face)", "Download photos automatically" Off on the receiver; § 5 says the pin alone holds the decode-error path |
| L NIT-1 — the reveal cuts the 4 px focus ring at the body edge | true | the box is grown by the ring width |
| L NIT-4 — the selector also matches a checkbox | true (none in a body today) | `input:not([type=checkbox]):not([type=radio]), textarea` |
| L NIT-3 — a re-check timer can pull the body back once within 1.4 s of a hand scroll | true, minor | the layout fixer: a scroll flag if it is 2 lines, else recorded |
| L NIT-2 (the 320 × 568 shift is acceptable), NIT-5…8 (mechanisms wording: path A may be a hide/show pair; the hero is inside the scroller; `requestFileData` :999; § 8 empty) | true | doc fixes in `docs/fixb4-mechanisms.md` |
| P MINOR-1 — `c-keyboard` checks the non-Android side with an iPhone UA only (`/Android\|Windows/i` survived) | true | rows with a Windows WebView2 UA and a Mac Catalyst UA |
| P NIT-1 — the a-defaults d2 text still says "byte for byte at 14ae57f2" after the re-base | true | text reworded |

### Round 2 (2026-11-23, one fresh read-only Claude Opus break-my-verdict reader; the frozen tree of `BASELINE OK 6814`)
| Reader | MAJOR | MINOR | NIT |
|---|---|---|---|
| X2 (the r1 fixes first; 12 mutations, 0 survivors) | 1 (doc) | 2 | 5 |

The r1 code fixes held (the mirror: value, guard, sites, no later overwrite; the ring margin, the selector, the desktop UAs).

**r2 fixes:**
| Finding | Verdict | Fix |
|---|---|---|
| MAJOR-1 — the walk sheet: a new account in a SECOND data folder still shares the app's ONE WebView store (Windows unpackaged, no `UserDataFolder`; Mac the same), so the welcome screen of the empty folder clears the TEST account's `spixi.*` keys (pins, drafts, likes, hidden requests, appearance) and this batch writes its two defaults there; "copy the data folder" does not back it up; W-9 cannot pass | true (`LaunchPage.xaml.cs:130-136`, `launch.html` `wipeLocalState`; `SettingsPage.xaml.cs:1752-1756`) | `docs/walk-fixb4.md` and the page: find, copy and restore the WebView store (`EBWebView`) around W-3 / W-4 / W-9, or a second Windows user; W-1 notes App lock; the Mac rows only under a second user or a spare Mac. The same omission is in `docs/walk-defaultsb.md` (not this batch's file — for the main chat) |
| MINOR-1 — the r1 hand-scroll stop blocks the reveal when the keyboard reopens on the SAME focused field (no new focusin) | true | the stop is REMOVED (reader L NIT-3 accepted instead); a pin row proves the reveal after a touchmove + resize |
| MINOR-2 — "a lost push = the old defaults, never worse" is no longer exact after the mirror write | true: the screen keeps On while the mirror is Off (more private) | accepted; P87, the gate row, § 3 and #1845 reworded |
| NIT-1 (the 320 × 568 shift is 14 px), NIT-2 (stale counts in § 2), NIT-3 (base line numbers), NIT-4 (the iPhone rows need the L149 condition), NIT-5 ("byte-identical" → behaviour-identical) | true | doc fixes |

**Cost note before round 3 (lead, skill rule 10):** MAJOR per round 0 → 1 (a walk-sheet fact, not code). Round 3 = one fresh
Opus reader over the r2 fixes (about 15 minutes) after one full smoke (about 50 minutes). Within the limit of 5 rounds.

### Round 3 (2026-11-23, one fresh read-only Claude Opus break-my-verdict reader; the frozen tree of the full smoke `BASELINE OK 6814` after the r2 fix)
| Reader | MAJOR | MINOR | NIT |
|---|---|---|---|
| X3 (the r2 fixes first; 2 mutations, 0 survivors) | 0 | 3 (walk sheet) | 7 |

The r2 code fix held (no trace of the hand-scroll stop; the round-2 flow reveals through the Android window resize; no loop;
iOS / Mac / Windows behave as before). The r2 doc corrections were right except two wordings (NIT-2).

**After r3 (docs only — no code file changed; every code file is byte-identical to what X3 read):**
| Finding | Verdict | Fix |
|---|---|---|
| MINOR-1 — the store copy and restore were not idempotent (a second walk copied into the first copy; a failed delete let the copy land inside the half-deleted store) | true | a NEW dated copy each time (`$bk`); R = `Remove-Item -Force … -ErrorAction Stop; Copy-Item … -ErrorAction Stop; Test-Path …\Default` (prints True) |
| MINOR-2 — `(Get-Process Spixi).Path` is `$null` when Spixi runs elevated (Visual Studio as administrator) | true | the find no longer reads the process: it searches `%LOCALAPPDATA%` and the clone's `Spixi\bin` |
| MINOR-3 — the store may live under `Spixi\bin` (the WebView2 default for an unpackaged app is next to the exe; MAUI's override is not proven), so the walk's own bin wipe could clear the test account's keys before any copy | plausible (not proven either way) | the sheet's order: S-1 notes the values on the OLD build, S-2 … S-4 copy BEFORE the wipe, S-6 puts the store back after F5 when it was under `bin` |
| NIT-1 — the #615 header in `launch.html` still says "on Android … the layout half is already correct" | true | **recorded, not changed** (a code-file comment after the last reader; for the next batch that touches `launch.html`) |
| NIT-2 … NIT-7 (#1849 / contract "byte-identical"; #1854 / #1855 not written yet; page vs sheet; theme and cosmetic prefs in W-9; the search can take minutes; W-1 noted after the build) | true | doc fixes (the sheet and the page now match command for command, checked by a script) |

**Hint for the walk tooling (not a finding of this batch):** `docs/walk-defaultsb.md` makes its new Windows account the same
way without the store copy — the main chat should add S-1 … S-6 / R there too.

### Verdict
**CLEAN at r3** (#1854). MAJOR per round: 0 → 1 (the walk sheet, a doc) → 0. MINOR fixed or recorded with the reason; NIT-1
of r3 recorded (a comment in a code file). Readers: fresh read-only Claude Opus only (#1606 as the prompt applies it: no
`chat.html`, no component that draws untrusted text). Mutations by readers: 11 (r1) + 12 (r2) + 2 (r3), one survivor
(r1 P MINOR-1, fixed). Final numbers on the tree X3 read: smoke `BASELINE OK — 6814 pass / the 2 KNOWN` (= 6774 + 40) ·
CSH `pass=817 fail=0` · both `--check` gates ✓ · `cs-syntax-check` 289 ✓ · pins 220 / 220 (31 modules).
**Code files byte-identical to the r3 tree:** 77 files, the SHA-256 of their sorted hash list `6760ea924c423a22…`; e.g.
`src/shells/launch.html` `0c8519589bcc…` · `Spixi/Pages/Launch/LaunchPage.xaml.cs` `72d29f744756…` · `Spixi/Utils/PageDefaultsRules.cs`
`e2e8866e0308…` · `Spixi/Utils/SpixiFlags.cs` `e57fc2f9bd3c…`.
